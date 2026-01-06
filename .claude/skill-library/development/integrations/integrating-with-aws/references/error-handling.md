# AWS SDK Error Handling Patterns

**Comprehensive guide for handling AWS SDK errors with proper classification, retry logic, and debugging support.**

---

## Overview

AWS SDK Go v2 provides rich error types for classifying failures and determining appropriate responses. Proper error handling distinguishes between client errors (don't retry) and server errors (retry with backoff).

**Error Handling Spectrum:**

| Level        | Pattern                    | When to Use                               |
| ------------ | -------------------------- | ----------------------------------------- |
| **Basic**    | `if err != nil`            | Simple applications, SDK retry sufficient |
| **Standard** | Structured logging         | Production apps needing observability     |
| **Advanced** | smithy.APIError unwrapping | Custom retry logic, granular responses    |
| **Expert**   | Request ID tracking        | AWS Support troubleshooting               |

---

## Basic Error Handling (Production Minimum)

**Pattern:** Check for errors and log with context.

```go
import "log/slog"

if err != nil {
    slog.Error("failed to insert item", "error", err, "item", item)
    return err
}
```

**When Sufficient:**

- SDK default retry handles transient errors automatically
- Generic error responses acceptable (500 Internal Server Error)
- No custom retry logic needed

**Source:** Chariot codebase (`modules/chariot/backend/pkg/cloud/service/`)

---

## Standard Error Handling (Chariot Production)

**Pattern:** Structured logging with key-value pairs for observability.

```go
import "log/slog"

resp, err := t.Client.PutItem(context.TODO(), input)
if err != nil {
    slog.Error("failed to insert item",
        "error", err,
        "table", tableName,
        "item", item,
        "username", t.Username,
    )
    return fmt.Errorf("DynamoDB PutItem failed: %w", err)
}
```

**Advantages:**

- ✅ Structured logs for filtering and analysis
- ✅ Context preserved (username, table, item)
- ✅ Error wrapping with `%w` for stack traces
- ✅ CloudWatch Logs Insights compatible

**Chariot Pattern - Conditional Error Logging:**

```go
err := t.InsertWithCondition(item, condition)
if err != nil && !conditional(err) {
    // Only log non-conditional errors
    slog.Error("failed to insert item", "error", err, "item", item)
}
return err

func conditional(err error) bool {
    if err == nil {
        return false
    }
    var condErr *types.ConditionalCheckFailedException
    return errors.As(err, &condErr)
}
```

**Why:** Conditional check failures are expected business logic, not errors requiring logs.

---

## Advanced Error Handling (Custom Retry Logic)

### smithy.APIError - Error Code Classification

**Pattern:** Unwrap errors to access AWS error codes and fault types.

```go
import (
    "errors"
    "github.com/aws/smithy-go"
)

if err != nil {
    var ae smithy.APIError
    if errors.As(err, &ae) {
        log.Printf("ErrorCode: %s", ae.ErrorCode())
        log.Printf("Message: %s", ae.ErrorMessage())
        log.Printf("Fault: %s", ae.ErrorFault().String())

        switch ae.ErrorCode() {
        case "ThrottlingException", "ProvisionedThroughputExceededException":
            // Server fault - retry with exponential backoff
            return retryWithBackoff(operation, 3, time.Second)

        case "ResourceNotFoundException":
            // Client fault - don't retry, return 404
            return nil, ErrNotFound

        case "ValidationException":
            // Client fault - return 400
            return nil, ErrInvalidInput

        case "ConditionalCheckFailedException":
            // Expected business logic - handle gracefully
            return nil, ErrConflict

        default:
            // Unknown error - log and return generic 500
            log.Printf("Unhandled AWS error: %s", ae.ErrorCode())
            return nil, ErrInternal
        }
    }

    // Not an AWS API error - unexpected
    log.Printf("Non-API error: %v", err)
    return nil, err
}
```

### Fault Types

**smithy.FaultClient:**

- Invalid parameters
- Authentication failures
- Authorization denied
- Malformed requests
- **Action:** Don't retry - fix request

**smithy.FaultServer:**

- Internal server error
- Service unavailable
- Throttling
- Timeout
- **Action:** Retry with exponential backoff

```go
if errors.As(err, &ae) {
    switch ae.ErrorFault() {
    case smithy.FaultClient:
        // Client error - log and return without retry
        return fmt.Errorf("client error: %s", ae.ErrorCode())

    case smithy.FaultServer:
        // Server error - safe to retry
        return retryOperation()

    default:
        return fmt.Errorf("unknown fault: %v", err)
    }
}
```

---

## Common AWS Error Codes

### DynamoDB Errors

| Error Code                                 | Fault  | Description                 | Action                          |
| ------------------------------------------ | ------ | --------------------------- | ------------------------------- |
| `ResourceNotFoundException`                | Client | Table/item not found        | Return 404, create resource     |
| `ConditionalCheckFailedException`          | Client | Condition expression failed | Handle as business logic        |
| `ProvisionedThroughputExceededException`   | Server | Throttling                  | Retry with backoff              |
| `ValidationException`                      | Client | Invalid parameters          | Return 400, validate input      |
| `ItemCollectionSizeLimitExceededException` | Client | Item collection too large   | Redesign partition key strategy |
| `TransactionConflictException`             | Server | Transaction conflict        | Retry transaction               |

### S3 Errors

| Error Code            | Fault  | Description              | Action                    |
| --------------------- | ------ | ------------------------ | ------------------------- |
| `NoSuchBucket`        | Client | Bucket doesn't exist     | Create bucket or fix name |
| `NoSuchKey`           | Client | Object not found         | Return 404                |
| `BucketAlreadyExists` | Client | Bucket name taken        | Use different name        |
| `AccessDenied`        | Client | Insufficient permissions | Check IAM policy          |
| `SlowDown`            | Server | Throttling               | Reduce request rate       |

### Lambda Errors

| Error Code                       | Fault  | Description        | Action              |
| -------------------------------- | ------ | ------------------ | ------------------- |
| `InvalidParameterValueException` | Client | Invalid parameter  | Validate parameters |
| `ResourceNotFoundException`      | Client | Function not found | Check function name |
| `TooManyRequestsException`       | Server | Throttling         | Retry with backoff  |
| `ServiceException`               | Server | Internal error     | Retry               |

---

## Retrieving Request IDs for AWS Support

### Generic HTTP Response Error

```go
import awshttp "github.com/aws/aws-sdk-go-v2/aws/transport/http"

if err != nil {
    var re *awshttp.ResponseError
    if errors.As(err, &re) {
        log.Printf("RequestID: %s", re.ServiceRequestID())
        log.Printf("StatusCode: %d", re.HTTPStatusCode())
        log.Printf("Error: %v", re.Unwrap())
    }
    return err
}
```

### S3-Specific Request Identifiers

```go
import "github.com/aws/aws-sdk-go-v2/service/s3"

if err != nil {
    var re *s3.ResponseError
    if errors.As(err, &re) {
        log.Printf("RequestID: %s", re.ServiceRequestID())
        log.Printf("HostID: %s", re.ServiceHostID())
        log.Printf("StatusCode: %d", re.HTTPStatusCode())
    }
    return err
}
```

**When to Use:**

- Contacting AWS Support (provide Request ID)
- Debugging intermittent failures
- Tracking specific requests across services

---

## Retry Strategies

### SDK Default Retry Behavior

**AWS SDK v2 automatically retries:**

| Property          | Default Value                   |
| ----------------- | ------------------------------- |
| Max Attempts      | 3                               |
| Max Backoff Delay | 20 seconds                      |
| Strategy          | Exponential backoff with jitter |
| Retryable Errors  | 5xx, throttling, timeouts       |
| Non-Retryable     | 4xx (except throttling)         |

**For 99% of applications, SDK defaults are production-ready.**

### Custom Retry Configuration

**Limiting max attempts (Lambda timeout concerns):**

```go
import "github.com/aws/aws-sdk-go-v2/aws/retry"

cfg, err := config.LoadDefaultConfig(context.TODO(),
    config.WithRetryer(func() aws.Retryer {
        return retry.AddWithMaxAttempts(retry.NewStandard(), 5)
    }),
)
```

**Adjusting backoff delay:**

```go
cfg, err := config.LoadDefaultConfig(context.TODO(),
    config.WithRetryer(func() aws.Retryer {
        return retry.AddWithMaxBackoffDelay(
            retry.NewStandard(),
            5*time.Second,
        )
    }),
)
```

**Adding custom retryable errors:**

```go
cfg, err := config.LoadDefaultConfig(context.TODO(),
    config.WithRetryer(func() aws.Retryer {
        return retry.AddWithErrorCodes(
            retry.NewStandard(),
            "CustomTransientError",
        )
    }),
)
```

**Disabling all retries (idempotent operations):**

```go
cfg, err := config.LoadDefaultConfig(context.TODO(),
    config.WithRetryer(func() aws.Retryer {
        return aws.NopRetryer{}
    }),
)
```

### Client-Side Rate Limiting

**SDK includes token bucket rate limiter:**

- Capacity: 500 tokens
- Timeout retry cost: 10 tokens
- Other error cost: 5 tokens
- Success: +1 token

**Custom rate limiter:**

```go
import "github.com/aws/aws-sdk-go-v2/aws/ratelimit"

cfg, err := config.LoadDefaultConfig(context.Background(),
    config.WithRetryer(func() aws.Retryer {
        return retry.NewStandard(func(o *retry.StandardOptions) {
            o.RateLimiter = ratelimit.NewTokenRateLimit(1000)
            o.RetryCost = 1
            o.RetryTimeoutCost = 3
            o.NoRetryIncrement = 10
        })
    }),
)
```

**Disable rate limiting:**

```go
o.RateLimiter = ratelimit.None
```

---

## Context-Based Timeout Management

### Lambda Context Timeout

```go
func handler(ctx context.Context, event events.APIGatewayProxyRequest)
    (events.APIGatewayProxyResponse, error) {
    // Lambda context includes deadline - pass to SDK
    resp, err := dynamoClient.GetItem(ctx, &dynamodb.GetItemInput{...})
    if err != nil {
        return events.APIGatewayProxyResponse{StatusCode: 500}, err
    }
    ...
}
```

### Explicit Timeout

```go
import "time"

ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

resp, err := client.GetObject(ctx, &s3.GetObjectInput{...})
if err != nil {
    // Could be timeout or other error
    if errors.Is(err, context.DeadlineExceeded) {
        return nil, ErrTimeout
    }
    return nil, err
}
```

**Timeout Hierarchy:**

1. Lambda function timeout (30s default)
2. Operation timeout (custom via context)
3. SDK retry backoff (20s max)

---

## Production Error Handling Pattern

**Complete example combining all techniques:**

```go
import (
    "context"
    "errors"
    "fmt"
    "log/slog"
    "time"

    "github.com/aws/smithy-go"
    awshttp "github.com/aws/aws-sdk-go-v2/aws/transport/http"
    "github.com/aws/aws-sdk-go-v2/service/dynamodb"
    "github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

type DynamoError struct {
    Code      string
    Message   string
    RequestID string
    Retriable bool
}

func (e *DynamoError) Error() string {
    return fmt.Sprintf("DynamoDB error [%s]: %s (RequestID: %s)",
        e.Code, e.Message, e.RequestID)
}

func executeDynamoDBOperation(ctx context.Context, input *dynamodb.PutItemInput)
    (*dynamodb.PutItemOutput, error) {

    resp, err := dynamoClient.PutItem(ctx, input)
    if err != nil {
        return nil, classifyAndHandleError(err)
    }

    return resp, nil
}

func classifyAndHandleError(err error) error {
    // Extract API error details
    var ae smithy.APIError
    if errors.As(err, &ae) {
        dynErr := &DynamoError{
            Code:    ae.ErrorCode(),
            Message: ae.ErrorMessage(),
        }

        // Extract request ID
        var re *awshttp.ResponseError
        if errors.As(err, &re) {
            dynErr.RequestID = re.ServiceRequestID()
        }

        // Classify error and determine retriability
        switch ae.ErrorCode() {
        case "ProvisionedThroughputExceededException", "ThrottlingException":
            dynErr.Retriable = true
            slog.Warn("DynamoDB throttling",
                "code", dynErr.Code,
                "requestID", dynErr.RequestID,
            )

        case "ResourceNotFoundException":
            dynErr.Retriable = false
            slog.Error("DynamoDB resource not found",
                "code", dynErr.Code,
                "requestID", dynErr.RequestID,
            )

        case "ValidationException":
            dynErr.Retriable = false
            slog.Error("DynamoDB validation error",
                "code", dynErr.Code,
                "message", dynErr.Message,
                "requestID", dynErr.RequestID,
            )

        case "ConditionalCheckFailedException":
            dynErr.Retriable = false
            // Business logic - don't log as error
            slog.Debug("DynamoDB conditional check failed",
                "code", dynErr.Code,
                "requestID", dynErr.RequestID,
            )

        default:
            // Unknown error - check fault type
            dynErr.Retriable = ae.ErrorFault() == smithy.FaultServer

            slog.Error("DynamoDB operation failed",
                "code", dynErr.Code,
                "message", dynErr.Message,
                "fault", ae.ErrorFault().String(),
                "retriable", dynErr.Retriable,
                "requestID", dynErr.RequestID,
            )
        }

        return dynErr
    }

    // Not an AWS API error - log and return
    slog.Error("Non-AWS error in DynamoDB operation", "error", err)
    return fmt.Errorf("unexpected error: %w", err)
}
```

---

## Best Practices Summary

1. ✅ **Use structured logging** (slog) with consistent field names
2. ✅ **Wrap errors with context** using `fmt.Errorf("context: %w", err)`
3. ✅ **Distinguish client vs server faults** for retry decisions
4. ✅ **Log request IDs** for AWS Support troubleshooting
5. ✅ **Trust SDK default retry** for 99% of cases
6. ✅ **Pass Lambda context** to SDK for deadline propagation
7. ✅ **Handle conditional errors specially** (business logic, not failures)
8. ❌ **Don't retry client errors** (4xx except throttling)
9. ❌ **Don't swallow errors** - always propagate or log
10. ❌ **Don't use custom retry** unless profiling shows need

---

## Related Patterns

- [Client Creation](client-creation.md) - Initializing AWS clients
- [Chariot Patterns](chariot-patterns.md) - Production error handling
- [Performance Optimization](performance-optimization.md) - Timeout tuning

---

**Research Sources:**

- AWS Official Documentation: [Error Handling Guide](https://docs.aws.amazon.com/sdk-for-go/v2/developer-guide/handle-errors.html)
- AWS Official Documentation: [Retry Configuration](https://docs.aws.amazon.com/sdk-for-go/v2/developer-guide/configure-retries-timeouts.html)
- Chariot codebase: `modules/chariot/backend/pkg/cloud/service/services/dynamodb/`
