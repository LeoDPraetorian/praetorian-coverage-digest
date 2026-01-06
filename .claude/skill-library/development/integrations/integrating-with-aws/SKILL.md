---
name: integrating-with-aws
description: Use when integrating with Amazon AWS services - authentication patterns, SDK usage, error handling, retry strategies, CloudFormation templates, and multi-service orchestration for Chariot's serverless architecture
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Integrating with AWS

**Comprehensive guidance for integrating AWS services into the Chariot platform's serverless architecture.**

## When to Use

Use this skill when:

- Integrating new AWS services (Lambda, DynamoDB, S3, API Gateway, etc.)
- Implementing authentication and credential management for AWS SDK
- Building CloudFormation or SAM templates
- Handling AWS-specific errors and retry strategies
- Orchestrating multiple AWS services in a workflow
- Following security best practices for serverless applications
- Optimizing AWS service costs and performance

## Prerequisites

- AWS CLI installed and configured
- AWS SDK for Go (aws-sdk-go-v2) or Python (boto3) depending on module
- IAM permissions for target AWS services
- Understanding of Chariot's serverless architecture (Lambda + API Gateway + DynamoDB + Neo4j)

## Configuration

### Credential Management

**Environment Variables:**

```bash
# Local development
AWS_PROFILE=chariot-dev
AWS_REGION=us-east-1

# Lambda runtime (uses IAM roles)
AWS_REGION=us-east-1  # Only region needed
```

**IAM Role Best Practices:**

- Use least privilege principle
- Separate roles for different Lambda functions
- Use resource-level permissions when possible
- Enable CloudTrail logging for audit

### SDK Configuration

**Go (AWS SDK v2):**

```go
// Load default config with region
cfg, err := config.LoadDefaultConfig(context.TODO(),
    config.WithRegion("us-east-1"),
)
```

**Python (boto3):**

```python
# Credentials loaded automatically from environment
import boto3
client = boto3.client('dynamodb', region_name='us-east-1')
```

## Quick Reference

| Service        | Common Operations                     | Chariot Usage                          |
| -------------- | ------------------------------------- | -------------------------------------- |
| Lambda         | Function deployment, invocation, logs | Backend API handlers, async processing |
| DynamoDB       | Query, Scan, PutItem, UpdateItem      | Primary data store                     |
| S3             | PutObject, GetObject, ListObjects     | File storage, scan results             |
| API Gateway    | REST API, WebSocket, authorization    | HTTP API entry points                  |
| CloudFormation | Stack creation, updates, outputs      | Infrastructure as Code                 |
| IAM            | Role management, policy attachment    | Service permissions                    |
| CloudWatch     | Logs, metrics, alarms                 | Monitoring and debugging               |
| Neo4j (AWS)    | Graph queries, relationship traversal | Attack surface graph database          |

## Implementation

### Step 1: Service Client Creation

Create AWS service clients with proper configuration and thread-safe initialization for Lambda.

**For complete client creation patterns, see:** [references/client-creation.md](references/client-creation.md)

**Recommended Pattern (Chariot Production):**

```go
// Singleton pattern with mutex for thread safety
var dynamoDBClient *dynamodb.Client
var dynamoLock sync.Mutex

func NewDynamoDBTable(cfg aws.Config, username string) service.Table {
    dynamoLock.Lock()
    defer dynamoLock.Unlock()
    if dynamoDBClient == nil {
        dynamoDBClient = dynamodb.NewFromConfig(cfg)
    }
    return &DynamoDBTable{
        Client:   dynamoDBClient,
        Username: username,  // Multi-tenant context
        Partition: username, // DynamoDB partition key
    }
}
```

**Alternative Pattern (init function):**

```go
var (
    dynamoClient *dynamodb.Client
    s3Client     *s3.Client
)

func init() {
    cfg, err := config.LoadDefaultConfig(context.TODO())
    if err != nil {
        log.Fatal(err)
    }
    dynamoClient = dynamodb.NewFromConfig(cfg)
    s3Client = s3.NewFromConfig(cfg)
}
```

**Why This Matters:**

- Clients initialized once per Lambda container lifecycle
- HTTP connections reused across invocations (warm starts)
- Thread-safe for concurrent execution scenarios
- Reduces cold start impact and execution time

### Step 2: Error Handling and Retries

Implement robust error handling for AWS service calls with appropriate error classification.

**For complete error handling patterns, see:** [references/error-handling.md](references/error-handling.md)

**Basic Pattern (Production Standard):**

```go
if err != nil {
    slog.Error("failed to insert item", "error", err, "item", item)
    return err
}
```

**Advanced Pattern (Rich Error Handling):**

```go
import (
    "github.com/aws/smithy-go"
    awshttp "github.com/aws/aws-sdk-go-v2/aws/transport/http"
)

if err != nil {
    // Extract error code and fault type
    var ae smithy.APIError
    if errors.As(err, &ae) {
        log.Printf("code: %s, fault: %s", ae.ErrorCode(), ae.ErrorFault())

        switch ae.ErrorCode() {
        case "ThrottlingException", "ProvisionedThroughputExceededException":
            // Server fault - retry with backoff
            return retryWithBackoff(operation)
        case "ResourceNotFoundException":
            // Client fault - don't retry
            return fmt.Errorf("resource not found: %w", err)
        case "ValidationException":
            // Client fault - return 400 error
            return errors.New("invalid request parameters")
        }
    }

    // Retrieve request ID for AWS Support
    var re *awshttp.ResponseError
    if errors.As(err, &re) {
        log.Printf("requestID: %s, statusCode: %d",
            re.ServiceRequestID(), re.HTTPStatusCode())
    }

    return err
}
```

**Retry Strategy (SDK Default):**

The AWS SDK provides automatic retry with:

- **Max attempts:** 3 (configurable)
- **Max backoff:** 20 seconds
- **Strategy:** Exponential backoff with jitter
- **Retryable errors:** 5xx, throttling, timeouts

**Most applications don't need custom retry logic** - SDK defaults are production-ready.

### Step 3: Infrastructure as Code

Define AWS resources using CloudFormation/SAM templates.

**For complete IaC patterns, see:** [references/infrastructure-as-code.md](references/infrastructure-as-code.md)

**Quick pattern:**

```yaml
# SAM template for Lambda function
Resources:
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ./build
      Handler: bootstrap
      Runtime: provided.al2
      MemorySize: 512
      Timeout: 30
      Environment:
        Variables:
          TABLE_NAME: !Ref MyTable
```

## Common Patterns

### Pattern 1: Lambda Handler with DynamoDB

**Complete example:** [examples/lambda-dynamodb-handler.md](examples/lambda-dynamodb-handler.md)

### Pattern 2: Multi-Service Orchestration

**Complete example:** [examples/multi-service-orchestration.md](examples/multi-service-orchestration.md)

### Pattern 3: Secure Credential Management

**Complete example:** [examples/secure-credentials.md](examples/secure-credentials.md)

## Security Best Practices

### Authentication

- Use IAM roles for Lambda functions (not access keys)
- Enable MFA for IAM users
- Rotate credentials regularly
- Use AWS Secrets Manager for sensitive data

### Authorization

- Implement least privilege IAM policies
- Use resource-based policies where appropriate
- Enable API Gateway authorization (Cognito, IAM, or custom)
- Validate all inputs before AWS service calls

### Encryption

- Enable DynamoDB encryption at rest
- Use S3 bucket encryption (SSE-S3 or SSE-KMS)
- Encrypt data in transit (HTTPS/TLS)
- Use AWS KMS for key management

**For complete security patterns, see:** [references/security-patterns.md](references/security-patterns.md)

## Error Handling

| Error Type            | Cause                      | Solution                             |
| --------------------- | -------------------------- | ------------------------------------ |
| ThrottlingException   | API rate limit exceeded    | Implement exponential backoff        |
| ResourceNotFound      | Resource doesn't exist     | Create resource or handle gracefully |
| AccessDeniedException | Insufficient permissions   | Check IAM policies                   |
| ValidationException   | Invalid request parameters | Validate inputs before API call      |
| ServiceUnavailable    | AWS service issue          | Retry with backoff                   |

**For complete error handling guide, see:** [references/error-handling.md](references/error-handling.md)

## Performance Optimization

### Lambda Optimization

- Use appropriate memory allocation (test to find optimal)
- Minimize cold start impact (keep deployment packages small)
- Reuse connections and SDK clients across invocations
- Use Lambda layers for shared dependencies

### DynamoDB Optimization

- Design partition keys to avoid hot partitions
- Use sparse indexes for conditional queries
- Batch operations where possible (BatchGetItem, BatchWriteItem)
- Enable DynamoDB Streams for change data capture

**For complete performance patterns, see:** [references/performance-optimization.md](references/performance-optimization.md)

## Cost Optimization

### Lambda Cost Reduction

- Right-size memory allocation
- Reduce execution time through optimization
- Use provisioned concurrency only when needed
- Clean up unused functions and versions

### DynamoDB Cost Reduction

- Use on-demand pricing for unpredictable workloads
- Use provisioned capacity with auto-scaling for predictable workloads
- Archive old data to S3
- Use DynamoDB Standard-IA for infrequently accessed data

**For complete cost optimization guide, see:** [references/cost-optimization.md](references/cost-optimization.md)

## Chariot-Specific Patterns

### Multi-Tenant Isolation (Production Pattern)

**DynamoDB Partition Key Strategy:**

```go
type DynamoDBTable struct {
    Client    *dynamodb.Client
    Username  string  // Tenant identifier
    Partition string  // Partition key for all operations
}

func (t *DynamoDBTable) save(item model.TableModel) error {
    avs, err := attributevalue.MarshalMap(item)
    avs["username"] = &types.AttributeValueMemberS{Value: t.Partition}
    // All items automatically tagged with tenant context
}
```

**S3 Hierarchical Key Structure:**

```go
// Tenant isolation via S3 key prefixes
Key: aws.String(fmt.Sprintf("%s/%s", f.Username, name))
// Example: user123/scan-results/2024-01-04/report.json
```

**Account Assumption Support:**

```go
// Distinguish between calling user and assumed tenant
type DynamoDBTable struct {
    Username string      // Tenant (may be assumed)
    User     *model.User // Calling user
    authorizedUsers map[string]bool  // Cross-tenant RBAC
}
```

### Backend Module Structure

The Chariot backend (`modules/chariot/backend/`) uses:

- **Lambda handlers**: `pkg/api/handlers/`
- **DynamoDB repositories**: `pkg/repository/`
- **SAM templates**: `template.yaml`
- **Deployment**: `make deploy`

### Common Services Used

- **API Gateway**: HTTP API for REST endpoints
- **Lambda**: All backend logic (Go runtime with `provided.al2`)
- **DynamoDB**: Primary data store (Assets, Risks, Jobs) with single-table design
- **Neo4j**: Graph relationships (Attack surface mapping)
- **S3**: Scan results, file uploads (with tenant isolation)
- **CloudWatch**: Logging and monitoring
- **IAM**: Service permissions with least privilege

**For Chariot-specific integration patterns, see:** [references/chariot-patterns.md](references/chariot-patterns.md)

## Related Resources

### Official AWS Documentation

- **AWS SDK for Go v2**: https://aws.github.io/aws-sdk-go-v2/docs/
- **AWS SDK for Python (boto3)**: https://boto3.amazonaws.com/v1/documentation/api/latest/index.html
- **AWS Lambda**: https://docs.aws.amazon.com/lambda/
- **Amazon DynamoDB**: https://docs.aws.amazon.com/dynamodb/
- **AWS SAM**: https://docs.aws.amazon.com/serverless-application-model/
- **AWS CloudFormation**: https://docs.aws.amazon.com/cloudformation/
- **IAM Best Practices**: https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html

## References

- [references/client-creation.md](references/client-creation.md) - Service client initialization patterns
- [references/error-handling.md](references/error-handling.md) - Comprehensive error handling guide
- [references/infrastructure-as-code.md](references/infrastructure-as-code.md) - CloudFormation/SAM patterns
- [references/security-patterns.md](references/security-patterns.md) - AWS security best practices
- [references/performance-optimization.md](references/performance-optimization.md) - Performance tuning guide
- [references/cost-optimization.md](references/cost-optimization.md) - Cost reduction strategies
- [references/chariot-patterns.md](references/chariot-patterns.md) - Chariot-specific integration patterns
