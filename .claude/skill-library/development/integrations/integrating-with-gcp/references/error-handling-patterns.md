# GCP Error Handling and Retry Patterns

**Source:** Research synthesis (Confidence: 0.92)

## Exponential Backoff with Jitter (Mandatory)

All GCP services require exponential backoff with jitter to prevent "thundering herd" problems.

### Standard Formula

```
wait_time = min((2^n + random_milliseconds), max_backoff)
```

**Typical parameters:**

- Initial delay: 1 second
- Multiplier: 2
- Maximum backoff: 32-64 seconds
- Jitter: 0-1000 milliseconds random

---

## Go Implementation

### Using cenkalti/backoff (Recommended)

```go
import (
    "context"
    "time"
    "github.com/cenkalti/backoff/v4"
    "cloud.google.com/go/storage"
)

func uploadWithRetry(ctx context.Context, bucket, object string, data []byte) error {
    operation := func() error {
        client, err := storage.NewClient(ctx)
        if err != nil {
            return backoff.Permanent(err) // Don't retry client creation failures
        }
        defer client.Close()

        wc := client.Bucket(bucket).Object(object).NewWriter(ctx)
        if _, err := wc.Write(data); err != nil {
            return err // Retryable
        }
        return wc.Close() // Retryable
    }

    // Configure exponential backoff
    expBackoff := backoff.NewExponentialBackOff()
    expBackoff.InitialInterval = 1 * time.Second
    expBackoff.MaxInterval = 32 * time.Second
    expBackoff.MaxElapsedTime = 5 * time.Minute

    // Retry with backoff
    return backoff.Retry(operation, backoff.WithContext(expBackoff, ctx))
}
```

### Built-in GCP Client Retry

Most GCP client libraries include automatic retry with configurable policies:

```go
import (
    "cloud.google.com/go/storage"
    "google.golang.org/api/option"
    "google.golang.org/api/googleapi"
)

func newClientWithCustomRetry(ctx context.Context) (*storage.Client, error) {
    return storage.NewClient(ctx,
        option.WithRetry(func() *googleapi.RetryConfig {
            return &googleapi.RetryConfig{
                Initial:    1 * time.Second,
                Max:        32 * time.Second,
                Multiplier: 2,
                // Retry on 500, 502, 503, 504, 429
                ShouldRetry: func(err error) bool {
                    if apiErr, ok := err.(*googleapi.Error); ok {
                        return apiErr.Code >= 500 || apiErr.Code == 429
                    }
                    return false
                },
            }
        }()),
    )
}
```

---

## Retryable vs Non-Retryable Errors

### Always Retry (with exponential backoff)

| Status Code | Meaning               | Reason                                 |
| ----------- | --------------------- | -------------------------------------- |
| 500         | Internal Server Error | Transient server issue                 |
| 502         | Bad Gateway           | Proxy/gateway issue                    |
| 503         | Service Unavailable   | Temporary overload                     |
| 504         | Gateway Timeout       | Upstream timeout                       |
| 429         | Too Many Requests     | Rate limit (read `Retry-After` header) |

### Never Retry (fix request)

| Status Code | Meaning      | Action                      |
| ----------- | ------------ | --------------------------- |
| 400         | Bad Request  | Fix request parameters      |
| 401         | Unauthorized | Refresh credentials         |
| 403         | Forbidden    | Check IAM permissions       |
| 404         | Not Found    | Verify resource exists      |
| 409         | Conflict     | Handle precondition failure |

---

## Idempotency Patterns

### Event ID Recording (Pub/Sub, Cloud Functions)

```go
import (
    "context"
    "cloud.google.com/go/firestore"
)

type EventRecord struct {
    EventID    string    `firestore:"event_id"`
    ProcessedAt time.Time `firestore:"processed_at"`
    TTL         time.Time `firestore:"ttl"` // Auto-delete after 24 hours
}

func processEventIdempotent(ctx context.Context, eventID string, handler func() error) error {
    client, err := firestore.NewClient(ctx, "project-id")
    if err != nil {
        return err
    }
    defer client.Close()

    // Check if already processed
    docRef := client.Collection("processed_events").Doc(eventID)
    _, err = docRef.Get(ctx)
    if err == nil {
        // Already processed, skip
        return nil
    }

    // Process event
    if err := handler(); err != nil {
        return err // Retryable - record not created
    }

    // Record as processed (24-hour TTL)
    _, err = docRef.Set(ctx, EventRecord{
        EventID:     eventID,
        ProcessedAt: time.Now(),
        TTL:         time.Now().Add(24 * time.Hour),
    })
    return err
}
```

### Conditional Updates (ETags)

```go
import (
    "cloud.google.com/go/storage"
)

func updateObjectMetadataIdempotent(ctx context.Context, bucket, object string) error {
    client, err := storage.NewClient(ctx)
    if err != nil {
        return err
    }
    defer client.Close()

    obj := client.Bucket(bucket).Object(object)

    // Read current metadata (includes Generation for conditional update)
    attrs, err := obj.Attrs(ctx)
    if err != nil {
        return err
    }

    // Conditional update (only if Generation matches)
    _, err = obj.If(storage.Conditions{GenerationMatch: attrs.Generation}).Update(ctx, storage.ObjectAttrsToUpdate{
        Metadata: map[string]string{
            "processed": "true",
        },
    })

    if err == storage.ErrObjectNotExist || err == storage.ErrPreconditionFailed {
        // Another process updated it first - idempotent success
        return nil
    }

    return err
}
```

---

## Circuit Breaker Pattern

**Use case:** Prevent cascading failures when downstream service is unhealthy

```go
import (
    "github.com/sony/gobreaker"
)

var cb *gobreaker.CircuitBreaker

func init() {
    settings := gobreaker.Settings{
        Name:        "GCP Storage",
        MaxRequests: 3,
        Interval:    10 * time.Second,
        Timeout:     60 * time.Second,
        ReadyToTrip: func(counts gobreaker.Counts) bool {
            failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
            return counts.Requests >= 10 && failureRatio >= 0.6
        },
    }
    cb = gobreaker.NewCircuitBreaker(settings)
}

func uploadWithCircuitBreaker(ctx context.Context, bucket, object string, data []byte) error {
    _, err := cb.Execute(func() (interface{}, error) {
        return nil, uploadWithRetry(ctx, bucket, object, data)
    })
    return err
}
```

---

## Structured Error Handling

### Parse gRPC Error Details

```go
import (
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
    "google.golang.org/genproto/googleapis/rpc/errdetails"
)

func handleGCPError(err error) {
    st, ok := status.FromError(err)
    if !ok {
        // Not a gRPC error
        return
    }

    switch st.Code() {
    case codes.ResourceExhausted:
        // Check for RetryInfo
        for _, detail := range st.Details() {
            if retryInfo, ok := detail.(*errdetails.RetryInfo); ok {
                retryDelay := retryInfo.GetRetryDelay().AsDuration()
                log.Printf("Rate limited, retry after %v", retryDelay)
            }
        }

    case codes.InvalidArgument:
        // Check for BadRequest field violations
        for _, detail := range st.Details() {
            if badReq, ok := detail.(*errdetails.BadRequest); ok {
                for _, violation := range badReq.GetFieldViolations() {
                    log.Printf("Field %s: %s", violation.GetField(), violation.GetDescription())
                }
            }
        }

    case codes.FailedPrecondition:
        // Check for PreconditionFailure
        for _, detail := range st.Details() {
            if precondition, ok := detail.(*errdetails.PreconditionFailure); ok {
                for _, violation := range precondition.GetViolations() {
                    log.Printf("Precondition failed: %s", violation.GetDescription())
                }
            }
        }
    }
}
```

---

## Python Implementation

```python
import time
import random
from google.cloud import storage
from google.api_core import retry, exceptions

# Custom retry predicate
def is_retryable(exc):
    """Retry on 5xx and 429 errors."""
    if isinstance(exc, exceptions.ServerError):
        return True  # 5xx errors
    if isinstance(exc, exceptions.TooManyRequests):
        return True  # 429 error
    return False

# Configure retry with exponential backoff
retry_policy = retry.Retry(
    predicate=is_retryable,
    initial=1.0,  # 1 second
    maximum=32.0,  # 32 seconds
    multiplier=2.0,
    deadline=300.0  # 5 minutes total
)

def upload_with_retry(bucket_name, object_name, data):
    """Upload with automatic retry."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(object_name)

    # Retry decorator
    @retry_policy
    def _upload():
        blob.upload_from_string(data)

    _upload()
```

---

## Cloud Functions Automatic Retries

Cloud Functions automatically retries event-driven functions (Pub/Sub, Cloud Storage) with exponential backoff:

```javascript
// Cloud Function with event-driven trigger
exports.processEvent = async (event, context) => {
  try {
    await processData(event.data);
    return; // Success - no retry
  } catch (error) {
    // Throw error to trigger automatic retry
    // Cloud Functions will retry for up to 7 days
    throw new Error(`Processing failed: ${error.message}`);
  }
};

// HTTP function (no automatic retries)
exports.httpEndpoint = async (req, res) => {
  try {
    await processData(req.body);
    res.status(200).send("Success");
  } catch (error) {
    // Implement custom retry logic or return error
    res.status(500).send("Processing failed");
  }
};
```

**Configure retry policy:**

```bash
# Disable retries (not recommended)
gcloud functions deploy FUNCTION_NAME \
  --no-retry-on-failure

# Enable retries with custom settings (via Cloud Pub/Sub subscription)
gcloud pubsub subscriptions update SUBSCRIPTION_NAME \
  --ack-deadline=600 \  # 10 minutes
  --min-retry-delay=10s \
  --max-retry-delay=600s
```

---

## Anti-Patterns

| Anti-Pattern                   | Why It's Wrong                           | Correct Approach                             |
| ------------------------------ | ---------------------------------------- | -------------------------------------------- |
| **Fixed delay retries**        | Causes thundering herd                   | Exponential backoff with jitter              |
| **Infinite retries**           | Wastes resources, delays error detection | Set max elapsed time (e.g., 5 minutes)       |
| **Retry on 4xx errors**        | Client errors won't resolve with retry   | Only retry 5xx, 429                          |
| **No idempotency**             | Duplicate processing on retry            | Event ID recording or conditional operations |
| **Creating clients per retry** | Wastes connections                       | Reuse client, retry operation only           |

---

## Best Practices Summary

- ✅ Use exponential backoff with jitter (standard: 2^n + random, max 32-64s)
- ✅ Retry on 5xx and 429 errors only (not 4xx)
- ✅ Implement idempotency (event ID recording or conditional updates)
- ✅ Use circuit breakers for downstream service protection
- ✅ Set maximum elapsed time (prevent infinite retries)
- ✅ Reuse clients across retries (connection pooling)
- ✅ Parse structured error details for intelligent retry decisions
- ✅ Log retries for observability (with exponential sampling to reduce log volume)

---

## External Resources

- [Cloud Storage Retry Strategy](https://docs.cloud.google.com/storage/docs/retry-strategy)
- [IAM Retry Strategy](https://cloud.google.com/iam/docs/retry-strategy)
- [Cloud Functions Retries](https://cloud.google.com/functions/docs/bestpractices/retries)
- [cenkalti/backoff Library](https://github.com/cenkalti/backoff)
