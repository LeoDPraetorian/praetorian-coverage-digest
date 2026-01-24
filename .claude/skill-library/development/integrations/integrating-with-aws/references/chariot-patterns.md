# Chariot AWS Integration Patterns

**Production patterns from the Chariot attack surface management platform for multi-tenant serverless architecture.**

---

## Overview

Chariot demonstrates production-ready AWS integration patterns not covered in standard AWS documentation. These patterns address real-world challenges in multi-tenant SaaS platforms with strict security and isolation requirements.

**Key Patterns:**

1. Multi-tenant data isolation (DynamoDB partition keys, S3 hierarchical paths)
2. Account assumption with RBAC → [account-assumption.md](account-assumption.md)
3. Singleton client management with thread safety
4. Structured logging for security observability → [logging-patterns.md](logging-patterns.md)
5. Pre-signed URLs for secure file operations

**Source:** `modules/chariot/backend/` - Production code serving enterprise customers

---

## Multi-Tenant Data Isolation

### Problem Statement

**Challenge:** Single-table DynamoDB design with multiple tenants (security platform customers) requires:

- Complete data isolation between tenants
- Fast tenant-scoped queries
- Cross-tenant access control (for managed service providers)
- Audit trail of cross-tenant access

**Solution:** Embed tenant context in service layer with automatic partition key tagging.

---

### Pattern 1: DynamoDB Partition Key Strategy

**Implementation:**

```go
package dynamodb

import (
    "sync"
    "github.com/aws/aws-sdk-go-v2/aws"
    "github.com/aws/aws-sdk-go-v2/service/dynamodb"
    "github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
    "github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
)

var dynamoDBClient *dynamodb.Client
var dynamoLock sync.Mutex

type DynamoDBTable struct {
    Client    *dynamodb.Client
    Username  string   // Tenant we're operating in
    Partition string   // Partition key for all operations
    User      *model.User
    authorizedUsers map[string]bool
}

func NewDynamoDBTable(cfg aws.Config, username string) service.Table {
    dynamoLock.Lock()
    defer dynamoLock.Unlock()

    if dynamoDBClient == nil {
        dynamoDBClient = dynamodb.NewFromConfig(cfg)
    }

    return &DynamoDBTable{
        Client:    dynamoDBClient,
        Username:  username,
        Partition: username,  // Partition key = tenant identifier
    }
}

// save automatically tags all items with tenant partition key
func (t *DynamoDBTable) save(item model.TableModel, cond expression.Expression) error {
    avs, _ := attributevalue.MarshalMap(item)
    // CRITICAL: Inject tenant partition key into every item
    avs["username"] = &types.AttributeValueMemberS{Value: t.Partition}
    // ... PutItem operation
}
```

**Why This Works:**

1. **Automatic Isolation:** Every DynamoDB operation includes tenant partition key
2. **Query Efficiency:** Partition key enables fast tenant-scoped queries
3. **No Cross-Tenant Leaks:** Impossible to access data from wrong tenant
4. **Audit Trail:** Username vs User distinction tracks account assumption

**Single-Table Design:**

```
PK (username)    | SK (key)           | Data
-----------------|-------------------|------------------
tenant-a         | asset#123         | { ... }
tenant-a         | risk#456          | { ... }
tenant-b         | asset#789         | { ... }
```

---

### Pattern 2: S3 Hierarchical Key Structure with Pre-Signed URLs

**Implementation:**

```go
package s3

import (
    "context"
    "fmt"
    "net/url"
    "sync"
    "time"
    "github.com/aws/aws-sdk-go-v2/aws"
    "github.com/aws/aws-sdk-go-v2/service/s3"
)

var s3Client *s3.Client
var s3ClientLock sync.Mutex

type S3Files struct {
    Client   *s3.Client
    Username string  // Tenant identifier
    Bucket   string
}

func NewS3Files(cfg aws.Config, username string, bucket string) service.Files {
    s3ClientLock.Lock()
    defer s3ClientLock.Unlock()

    if s3Client == nil {
        s3Client = s3.NewFromConfig(cfg)
    }

    return &S3Files{
        Client:   s3Client,
        Username: username,
        Bucket:   bucket,
    }
}
```

#### Pre-Signed URL for Uploads (PresignPutObject)

```go
// UploadWithExpiration - presigned URL for uploads with tenant-scoped key
func (f *S3Files) UploadWithExpiration(name string, expiration time.Duration) (string, error) {
    presigner := s3.NewPresignClient(f.Client)
    req, err := presigner.PresignPutObject(
        context.TODO(),
        &s3.PutObjectInput{
            Bucket: aws.String(f.Bucket),
            Key:    aws.String(fmt.Sprintf("%s/%s", f.Username, name)),
        },
        s3.WithPresignExpires(expiration),
    )
    if err != nil {
        return "", fmt.Errorf("presigning put: %w", err)
    }
    return req.URL, nil
}
```

#### Pre-Signed URL for Downloads (PresignGetObject)

```go
// DownloadWithExpiration - presigned URL for downloads with tenant-scoped key
func (f *S3Files) DownloadWithExpiration(name string, expiration time.Duration) (string, error) {
    presigner := s3.NewPresignClient(f.Client)
    req, err := presigner.PresignGetObject(
        context.TODO(),
        &s3.GetObjectInput{
            Bucket: aws.String(f.Bucket),
            Key:    aws.String(fmt.Sprintf("%s/%s", f.Username, name)),
        },
        s3.WithPresignExpires(expiration),
    )
    if err != nil {
        return "", fmt.Errorf("presigning get: %w", err)
    }
    return req.URL, nil
}
```

#### CloudFormation Quick Create Integration

Use pre-signed GET URLs with CloudFormation Quick Create deep links:

```go
// GetCloudFormationQuickCreateURL generates a Quick Create deep link
// for deploying customer-specific CloudFormation templates
func (f *S3Files) GetCloudFormationQuickCreateURL(
    templateKey string,
    stackName string,
    region string,
    expiration time.Duration,
) (string, error) {
    // 1. Generate pre-signed URL for template download
    presignedURL, err := f.DownloadWithExpiration(templateKey, expiration)
    if err != nil {
        return "", fmt.Errorf("generating presigned URL: %w", err)
    }

    // 2. URL-encode the presigned URL (REQUIRED by AWS)
    encodedTemplateURL := url.QueryEscape(presignedURL)

    // 3. Construct Quick Create URL
    quickCreateURL := fmt.Sprintf(
        "https://%s.console.aws.amazon.com/cloudformation/home?region=%s#/stacks/quickcreate?templateURL=%s&stackName=%s",
        region,
        region,
        encodedTemplateURL,
        stackName,
    )

    return quickCreateURL, nil
}
```

**Usage Example:**

```go
// Generate template-specific pre-signed URL for CloudFormation
quickCreateURL, err := s3Files.GetCloudFormationQuickCreateURL(
    "cf-templates/customer-123/chariot-role.yaml",  // Template key in S3
    "Chariot-Integration",                           // Stack name
    "us-east-1",                                     // Region
    30*time.Minute,                                  // URL expiration
)
// Returns: https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/quickcreate?templateURL=...&stackName=Chariot-Integration
```

**Security Notes:**

- Use pre-signed URLs (not public S3) for customer-specific templates
- 15-30 minute TTL prevents URL sharing/bookmarking
- URL-encode the presigned URL before embedding in Quick Create link
- See [Security Lead Assessment](../../../.output/agents/2026-01-24-aws-cloudformation-quickcreate-security/) for full threat model

#### Pre-Signed URL for Multipart Uploads

```go
// GetMultipartUploadURL - multipart upload with tenant scope
func (f *S3Files) GetMultipartUploadURL(name string, uploadID string, partNumber int) (string, error) {
    presigner := s3.NewPresignClient(f.Client)
    req, err := presigner.PresignUploadPart(
        context.TODO(),
        &s3.UploadPartInput{
            Bucket:     aws.String(f.Bucket),
            Key:        aws.String(fmt.Sprintf("%s/%s", f.Username, name)),
            UploadId:   aws.String(uploadID),
            PartNumber: aws.Int32(int32(partNumber)),
        },
        s3.WithPresignExpires(30*time.Minute),
    )
    if err != nil {
        return "", fmt.Errorf("presigning upload part: %w", err)
    }
    return req.URL, nil
}
```

**S3 Key Hierarchy:**

```
Bucket: chariot-scan-results

Keys:
  tenant-a/scan-results/2024-01-04/nuclei-report.json
  tenant-a/cf-templates/chariot-role.yaml
  tenant-b/scan-results/2024-01-04/burp-results.json
```

**Benefits:**

1. **Tenant Isolation:** S3 prefix = tenant identifier
2. **IAM Scoping:** Bucket policies can restrict by prefix
3. **Cost Allocation:** S3 analytics by prefix for tenant billing
4. **Lifecycle Rules:** Per-tenant retention policies

---

## Additional Patterns

For detailed implementations, see:

- **[Account Assumption with RBAC](account-assumption.md)** - MSP cross-tenant access with audit trail
- **[Structured Logging](logging-patterns.md)** - slog patterns with consistent field names
- **[Conditional Expressions](conditional-expressions.md)** - Complex DynamoDB business logic
- **[Production Architecture](production-architecture.md)** - Backend module structure

---

## Best Practices Summary

1. ✅ **Embed tenant context in service layer** - not in Lambda handler
2. ✅ **Automatic partition key tagging** - prevents cross-tenant leaks
3. ✅ **Hierarchical S3 keys** - {tenant}/{resource-type}/{date}/...
4. ✅ **Pre-signed URLs with short TTLs** - secure file access without public S3
5. ✅ **URL-encode presigned URLs** - required for CloudFormation Quick Create
6. ✅ **Separate Username from User** - account assumption audit trail
7. ✅ **Singleton clients with mutex** - thread-safe + performance
8. ❌ **Never use public S3 for customer-specific templates** - use pre-signed URLs
9. ❌ **Never trust client-provided tenant** - extract from auth claims
10. ❌ **Never skip tenant scoping** - every query must include partition key

---

## Related Patterns

- [Client Creation](client-creation.md) - Singleton with tenant context
- [Error Handling](error-handling.md) - Conditional error logging
- [Security Patterns](security-patterns.md) - IAM policies for multi-tenancy
- [StackSets Organization Deployment](stacksets-organization-deployment.md) - Multi-account deployments

---

**Source:** Chariot Production Codebase

- `modules/chariot/backend/pkg/cloud/service/services/dynamodb/dynamodb.go`
- `modules/chariot/backend/pkg/cloud/service/services/s3/files.go`
- Serving enterprise customers since 2020
