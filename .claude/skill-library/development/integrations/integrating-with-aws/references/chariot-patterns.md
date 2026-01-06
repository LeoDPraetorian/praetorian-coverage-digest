# Chariot AWS Integration Patterns

**Production patterns from the Chariot attack surface management platform for multi-tenant serverless architecture.**

---

## Overview

Chariot demonstrates production-ready AWS integration patterns not covered in standard AWS documentation. These patterns address real-world challenges in multi-tenant SaaS platforms with strict security and isolation requirements.

**Key Patterns:**

1. Multi-tenant data isolation (DynamoDB partition keys, S3 hierarchical paths)
2. Account assumption with RBAC
3. Singleton client management with thread safety
4. Structured logging for security observability

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
    Client   *dynamodb.Client

    // Username is the tenant we're operating in
    // (may not be the calling user due to account assumption)
    Username  string

    // Partition key for all DynamoDB operations
    Partition string

    // User is the actual calling user (for audit)
    User            *model.User

    // AuthorizedUsers for cross-tenant access control
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
    avs, err := attributevalue.MarshalMap(item)
    if err != nil {
        return err
    }

    // CRITICAL: Inject tenant partition key into every item
    avs["username"] = &types.AttributeValueMemberS{Value: t.Partition}

    input := &dynamodb.PutItemInput{
        Item:                      avs,
        TableName:                 aws.String(config.Get("CHARIOT_TABLE")),
        ExpressionAttributeNames:  cond.Names(),
        ExpressionAttributeValues: cond.Values(),
        ConditionExpression:       cond.Condition(),
    }

    _, err = t.Client.PutItem(context.TODO(), input)
    return err
}

// Delete scoped to tenant partition
func (t *DynamoDBTable) Delete(key string) error {
    slog.Info("deleting item", "key", key, "tenant", t.Partition)

    input := &dynamodb.DeleteItemInput{
        Key: map[string]types.AttributeValue{
            "username": &types.AttributeValueMemberS{
                Value: t.Partition,  // Partition key scopes delete
            },
            "key": &types.AttributeValueMemberS{
                Value: key,
            },
        },
        TableName: aws.String(config.Get("CHARIOT_TABLE")),
    }

    _, err := t.Client.DeleteItem(context.TODO(), input)
    if err != nil {
        slog.Error("failed to delete item", "error", err, "tenant", t.Partition)
    }
    return err
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

Queries always filter by `username` partition key, ensuring tenant isolation.

---

### Pattern 2: S3 Hierarchical Key Structure

**Implementation:**

```go
package s3

import (
    "fmt"
    "sync"
    "github.com/aws/aws-sdk-go-v2/aws"
    "github.com/aws/aws-sdk-go-v2/service/s3"
)

var s3Client *s3.Client
var s3ClientLock sync.Mutex

type S3Files struct {
    Client   *s3.Client
    Secrets  service.Secrets
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
        Secrets:  ssm.NewSSMSecrets(cfg, username),
        Username: username,
        Bucket:   bucket,
    }
}

// UploadWithExpiration - presigned URL with tenant-scoped key
func (f *S3Files) UploadWithExpiration(name string, expiration time.Duration) (string, error) {
    if err := f.threat(name); err != nil {
        return "", err
    }

    req, err := s3.NewPresignClient(f.Client).PresignPutObject(
        context.TODO(),
        &s3.PutObjectInput{
            Bucket: aws.String(f.Bucket),
            Key:    aws.String(fmt.Sprintf("%s/%s", f.Username, name)),
            // ^^ Hierarchical key: tenant/filename
        },
        s3.WithPresignExpires(expiration),
    )

    return req.URL, err
}

// GetMultipartUploadURL - multipart upload with tenant scope
func (f *S3Files) GetMultipartUploadURL(name string, uploadID string, partNumber int) (string, error) {
    req, err := s3.NewPresignClient(f.Client).PresignUploadPart(
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
        slog.Error("failed to presign upload part",
            "error", err,
            "file", name,
            "part", partNumber,
            "username", f.Username,
        )
    }

    return req.URL, err
}
```

**S3 Key Hierarchy:**

```
Bucket: chariot-scan-results

Keys:
  tenant-a/scan-results/2024-01-04/nuclei-report.json
  tenant-a/scan-results/2024-01-04/nmap-scan.xml
  tenant-b/scan-results/2024-01-04/burp-results.json
```

**Benefits:**

1. **Tenant Isolation:** S3 prefix = tenant identifier
2. **IAM Scoping:** Bucket policies can restrict by prefix
3. **Cost Allocation:** S3 analytics by prefix for tenant billing
4. **Lifecycle Rules:** Per-tenant retention policies

**S3 Bucket Policy Example:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::123456789012:role/LambdaExecutionRole" },
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::chariot-scan-results/${aws:username}/*"
    }
  ]
}
```

---

### Pattern 3: Account Assumption with RBAC

**Problem:** Managed Service Providers (MSPs) need to assume customer accounts while maintaining audit trail.

**Solution:** Separate `Username` (assumed tenant) from `User` (calling user).

```go
type DynamoDBTable struct {
    Client   *dynamodb.Client

    // Username: The tenant we're operating in (may be assumed)
    Username string

    // User: The actual calling user (for audit)
    User *model.User

    // Authorized users map for cross-tenant RBAC
    authorizedUsers map[string]bool
}

// Example: MSP user "msp-admin" assumes "customer-123" account
table := NewDynamoDBTable(cfg, "customer-123")
table.User = &model.User{Username: "msp-admin", Email: "admin@msp.com"}
table.authorizedUsers = map[string]bool{
    "msp-admin":   true,
    "msp-analyst": true,
}
```

**Audit Log Entry:**

```json
{
  "timestamp": "2024-01-04T10:30:00Z",
  "action": "DeleteAsset",
  "callingUser": "msp-admin@msp.com",
  "assumedTenant": "customer-123",
  "assetKey": "asset#456",
  "authorized": true
}
```

**Query Authorization Check:**

```go
func (t *DynamoDBTable) isAuthorized(user *model.User) bool {
    // User operating in their own tenant - always authorized
    if user.Username == t.Username {
        return true
    }

    // Cross-tenant access - check authorized users list
    return t.authorizedUsers[user.Username]
}

func (t *DynamoDBTable) Query(search query.TableSearch) *query.TableSearch {
    if !t.isAuthorized(t.User) {
        slog.Warn("unauthorized cross-tenant access attempt",
            "user", t.User.Username,
            "tenant", t.Username,
        )
        return &query.TableSearch{Error: ErrUnauthorized}
    }

    // Proceed with tenant-scoped query
    // ...
}
```

---

## Structured Logging for Security Observability

### Pattern: slog with Consistent Field Names

**Chariot Standard:**

```go
import "log/slog"

// Success operations (Info level)
slog.Info("deleting item", "key", key, "tenant", t.Partition)

// Business logic (Debug level)
slog.Debug("conditional check failed",
    "code", "ConditionalCheckFailedException",
    "item", item,
)

// Errors (Error level with structured fields)
slog.Error("failed to insert item",
    "error", err,
    "table", tableName,
    "item", item,
    "tenant", t.Username,
)

// Security events (Warn level)
slog.Warn("unauthorized access attempt",
    "user", user.Username,
    "tenant", t.Partition,
    "resource", resourceKey,
)
```

**Consistent Field Names:**

| Field       | Type   | Description                            |
| ----------- | ------ | -------------------------------------- |
| `tenant`    | string | Tenant identifier (Username/Partition) |
| `user`      | string | Calling user (for audit)               |
| `error`     | error  | Go error object                        |
| `key`       | string | DynamoDB sort key                      |
| `table`     | string | DynamoDB table name                    |
| `file`      | string | S3 key                                 |
| `bucket`    | string | S3 bucket                              |
| `requestID` | string | AWS request ID                         |

**CloudWatch Logs Insights Query:**

```
fields @timestamp, tenant, user, @message
| filter tenant = "customer-123"
| filter @message like /failed/
| sort @timestamp desc
| limit 100
```

---

## Conditional Expression Patterns

### Pattern: Complex Business Logic in DynamoDB Conditions

**Problem:** Job insertion with retry/rescan logic requires conditional writes.

**Chariot Solution:**

```go
func (t *DynamoDBTable) InsertJob(job model.Job) error {
    getBackwardsDate := func(duration time.Duration) string {
        return time.Now().Add(duration).Format(time.RFC3339)
    }

    rerunThreshold := getBackwardsDate(-12 * time.Hour)
    backupOverwriteThreshold := getBackwardsDate(-2 * 24 * time.Hour)

    condition, _ := expression.NewBuilder().WithCondition(expression.Or(
        // Condition 1: Job doesn't exist yet
        expression.AttributeNotExists(expression.Name("key")),

        // Condition 2: Previous job failed
        expression.BeginsWith(expression.Name("status"), model.Fail),

        // Condition 3: This is a returning async job
        IsReturningAsyncJob(job.GetStatus()),

        // Condition 4: Previous job > 12 hours old and passed
        expression.And(
            expression.BeginsWith(expression.Name("status"), model.Pass),
            expression.LessThan(expression.Name("created"), expression.Value(rerunThreshold)),
        ),

        // Condition 5: Previous job marked as repeatable
        expression.Equal(expression.Name("allowRepeat"), expression.Value(true)),

        // Condition 6: Safety net - force re-queue if > 2 days old
        expression.LessThan(expression.Name("created"), expression.Value(backupOverwriteThreshold)),
    )).Build()

    return t.InsertWithCondition(&job, condition)
}

func IsReturningAsyncJob(inboundStatus string) expression.ConditionBuilder {
    preexistingStatus := "NOMATCH"
    if inboundStatus == model.AsyncReturning {
        preexistingStatus = model.AsyncRunning
    }
    return expression.BeginsWith(expression.Name("status"), preexistingStatus)
}
```

**Why This Matters:**

1. **Prevents duplicate work:** Condition check ensures job not re-queued unnecessarily
2. **Enables retry logic:** Failed jobs can be retried without manual intervention
3. **Supports rescans:** allowRepeat flag for security monitoring
4. **Safety net:** 2-day threshold prevents stuck jobs

**Conditional Error Handling:**

```go
func (t *DynamoDBTable) InsertWithCondition(item model.TableModel, cond expression.Expression) error {
    err := t.save(item, cond)

    // Conditional check failures are business logic, not errors
    if err != nil && !conditional(err) {
        slog.Error("failed to insert item", "error", err, "item", item)
    }

    return err
}

func conditional(err error) bool {
    if err == nil {
        return false
    }
    var condErr *types.ConditionalCheckFailedException
    return errors.As(err, &condErr)
}
```

---

## Production Architecture Patterns

### Backend Module Structure

```
modules/chariot/backend/
├── pkg/
│   ├── cloud/service/
│   │   └── services/
│   │       ├── dynamodb/
│   │       │   └── dynamodb.go  (Tenant-scoped table)
│   │       ├── s3/
│   │       │   └── files.go     (Hierarchical keys)
│   │       ├── sqs/
│   │       │   └── queue.go     (Message tagging)
│   │       └── ssm/
│   │           └── secrets.go   (Tenant secrets)
│   ├── api/handlers/
│   │   └── {endpoint}/main.go   (Lambda handlers)
│   └── repository/
│       └── {entity}/repo.go      (Domain models)
├── template.yml                   (SAM template)
└── Makefile                       (Deployment)
```

### Common Services Used

| Service         | Chariot Usage        | Multi-Tenant Pattern              |
| --------------- | -------------------- | --------------------------------- |
| **DynamoDB**    | Primary data store   | Partition key = tenant            |
| **S3**          | Scan results, files  | Key prefix = tenant               |
| **SQS**         | Job queue            | Message attribute: tenant         |
| **Neo4j**       | Attack surface graph | Cypher WHERE tenant = ...         |
| **Lambda**      | All backend logic    | IAM role + tenant context         |
| **API Gateway** | HTTP endpoints       | Cognito claims → tenant           |
| **CloudWatch**  | Logging              | Structured logs with tenant field |

---

## Best Practices Summary

1. ✅ **Embed tenant context in service layer** - not in Lambda handler
2. ✅ **Automatic partition key tagging** - prevents cross-tenant leaks
3. ✅ **Hierarchical S3 keys** - {tenant}/{resource-type}/{date}/...
4. ✅ **Separate Username from User** - account assumption audit trail
5. ✅ **Structured logging with slog** - consistent field names for queries
6. ✅ **Conditional expressions for business logic** - DynamoDB conditions
7. ✅ **Singleton clients with mutex** - thread-safe + performance
8. ❌ **Never trust client-provided tenant** - extract from auth claims
9. ❌ **Never skip tenant scoping** - every query must include partition key
10. ❌ **Never log tenant data** - only metadata (tenant ID, not content)

---

## Related Patterns

- [Client Creation](client-creation.md) - Singleton with tenant context
- [Error Handling](error-handling.md) - Conditional error logging
- [Security Patterns](security-patterns.md) - IAM policies for multi-tenancy

---

**Source:** Chariot Production Codebase

- `modules/chariot/backend/pkg/cloud/service/services/dynamodb/dynamodb.go`
- `modules/chariot/backend/pkg/cloud/service/services/s3/files.go`
- Serving enterprise customers since 2020
