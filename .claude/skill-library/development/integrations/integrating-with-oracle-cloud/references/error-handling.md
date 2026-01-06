# OCI Error Handling Strategies

**Comprehensive guide to handling errors in Oracle Cloud Infrastructure SDK operations.**

Source: Official OCI SDK Documentation, Research Synthesis

---

## ServiceError Structure

OCI SDKs return `ServiceError` types for API failures. These provide structured error information.

### Go SDK

```go
import "github.com/oracle/oci-go-sdk/v65/common"

if err != nil {
    if serviceErr, ok := err.(common.ServiceError); ok {
        // Extract error details
        statusCode := serviceErr.GetHTTPStatusCode()
        errorCode := serviceErr.GetCode()
        message := serviceErr.GetMessage()
        opcRequestId := serviceErr.GetOpcRequestID()

        log.Printf("OCI Error: Code=%s, Message=%s, Status=%d, RequestID=%s",
            errorCode, message, statusCode, opcRequestId)
    }
    return err
}
```

**ServiceError Methods:**

- `GetHTTPStatusCode() int` - HTTP status code (404, 429, 500, etc.)
- `GetCode() string` - OCI error code ("NotAuthenticated", "TooManyRequests")
- `GetMessage() string` - Human-readable error message
- `GetOpcRequestID() string` - Request ID for Oracle support
- `GetOriginalError() error` - Underlying error if available

### Python SDK

```python
from oci.exceptions import ServiceError

try:
    response = client.get_object(...)
except ServiceError as e:
    # Extract error details
    status_code = e.status
    error_code = e.code
    message = e.message
    request_id = e.request_id

    print(f"OCI Error: {error_code} - {message}")
    print(f"Status: {status_code}, RequestID: {request_id}")
```

**ServiceError Attributes:**

- `status` - HTTP status code
- `code` - OCI error code
- `message` - Error message
- `request_id` - OCI request ID
- `operation_name` - SDK operation that failed

### TypeScript SDK

```typescript
import { ServiceError } from "oci-common";

try {
    const response = await client.getObject(...);
} catch (error) {
    if (error instanceof ServiceError) {
        console.error(`OCI Error: ${error.statusCode} - ${error.serviceCode}`);
        console.error(`Message: ${error.message}`);
        console.error(`RequestID: ${error.opcRequestId}`);
    }
}
```

---

## Common Error Codes

### Authentication Errors (401)

**Code:** `NotAuthenticated`

**Causes:**

- Invalid or expired API key
- Incorrect fingerprint
- Session token expired
- Wrong tenancy OCID
- Instance principal not configured

**Solutions:**

```go
switch serviceErr.GetCode() {
case "NotAuthenticated":
    // Check authentication configuration
    log.Println("Authentication failed - verify config file and API keys")

    // For instance principals, verify dynamic group membership
    if usingInstancePrincipal {
        log.Println("Verify instance is in dynamic group with required policies")
    }

    // For session tokens, refresh token
    if usingSessionToken {
        exec.Command("oci", "session", "refresh").Run()
    }
}
```

**Python:**

```python
if e.code == "NotAuthenticated":
    if using_session_token:
        # Refresh session token
        subprocess.run(['oci', 'session', 'refresh'])
        # Retry operation
        return retry_operation()
    else:
        # Check API key configuration
        logger.error("Verify ~/.oci/config file and key fingerprint")
```

### Authorization Errors (404)

**Code:** `NotAuthorizedOrNotFound`

**Note:** OCI returns 404 for both "resource not found" AND "no permission to access resource" for security reasons.

**Causes:**

- Resource doesn't exist
- Missing IAM permissions
- Wrong compartment OCID
- Wrong region

**Solutions:**

```go
if serviceErr.GetCode() == "NotAuthorizedOrNotFound" {
    // Could be either missing resource or missing permission
    log.Println("Resource not found OR insufficient permissions")
    log.Println("1. Verify resource OCID is correct")
    log.Println("2. Check IAM policies for required permissions")
    log.Println("3. Confirm correct compartment and region")
}
```

### Rate Limiting Errors (429)

**Code:** `TooManyRequests`

**Causes:**

- Exceeded API rate limits
- Too many concurrent requests
- Burst traffic

**Solutions:**

Implement exponential backoff with jitter (see Rate Limiting section).

### Server Errors (500)

**Code:** `InternalServerError`

**Causes:**

- OCI service temporarily unavailable
- Transient infrastructure issues

**Solutions:**

```go
if serviceErr.GetHTTPStatusCode() >= 500 {
    // Retry with exponential backoff
    for attempt := 0; attempt < maxRetries; attempt++ {
        time.Sleep(time.Duration(math.Pow(2, float64(attempt))) * time.Second)

        result, err := retryOperation()
        if err == nil {
            return result, nil
        }
    }
    return nil, fmt.Errorf("max retries exceeded")
}
```

### Bad Request Errors (400)

**Code:** `InvalidParameter`, `LimitExceeded`, `CannotParseRequest`

**Causes:**

- Invalid request parameters
- Malformed JSON
- Exceeding service limits

**Solutions:**

```python
if e.status == 400:
    if e.code == 'InvalidParameter':
        # Log parameter details for debugging
        logger.error(f"Invalid parameter: {e.message}")
    elif e.code == 'LimitExceeded':
        # Service limit reached (e.g., max VCNs per compartment)
        logger.error(f"Service limit exceeded: {e.message}")
    elif e.code == 'CannotParseRequest':
        # Malformed request body
        logger.error(f"Request parsing failed: {e.message}")
```

---

## Error Code Reference Table

| HTTP Status | OCI Code                             | Meaning                    | Action                 |
| ----------- | ------------------------------------ | -------------------------- | ---------------------- |
| 400         | InvalidParameter                     | Bad request parameter      | Validate input         |
| 400         | LimitExceeded                        | Service limit reached      | Request limit increase |
| 400         | CannotParseRequest                   | Malformed request          | Fix request format     |
| 401         | NotAuthenticated                     | Auth failed                | Check credentials      |
| 404         | NotAuthorizedOrNotFound              | No resource or permission  | Check OCID and IAM     |
| 409         | IncorrectState                       | Resource in wrong state    | Wait for correct state |
| 409         | NotAuthorizedOrResourceAlreadyExists | Duplicate or no permission | Check uniqueness       |
| 429         | TooManyRequests                      | Rate limit exceeded        | Implement backoff      |
| 500         | InternalServerError                  | OCI service error          | Retry with backoff     |
| 503         | ServiceUnavailable                   | Service temporarily down   | Retry with backoff     |

---

## Retry Strategies

### Exponential Backoff with Jitter

**Go Implementation:**

```go
import (
    "math"
    "math/rand"
    "time"
)

func retryWithBackoff(operation func() error, maxRetries int) error {
    for attempt := 0; attempt < maxRetries; attempt++ {
        err := operation()
        if err == nil {
            return nil
        }

        if serviceErr, ok := err.(common.ServiceError); ok {
            statusCode := serviceErr.GetHTTPStatusCode()

            // Don't retry on client errors (except 429)
            if statusCode >= 400 && statusCode < 500 && statusCode != 429 {
                return err
            }

            // Retry on 429 and 5xx errors
            if statusCode == 429 || statusCode >= 500 {
                if attempt == maxRetries-1 {
                    return fmt.Errorf("max retries exceeded: %w", err)
                }

                // Exponential backoff: 2^attempt seconds
                baseDelay := time.Duration(math.Pow(2, float64(attempt))) * time.Second

                // Add jitter (±25%)
                jitter := time.Duration(rand.Float64()*0.5-0.25) * baseDelay
                delay := baseDelay + jitter

                // Cap at 30 seconds
                if delay > 30*time.Second {
                    delay = 30 * time.Second
                }

                log.Printf("Retry attempt %d after %v", attempt+1, delay)
                time.Sleep(delay)
                continue
            }
        }

        return err
    }
    return fmt.Errorf("max retries exceeded")
}
```

**Python Implementation:**

```python
import time
import random
from oci.exceptions import ServiceError

def retry_with_backoff(operation, max_retries=7):
    for attempt in range(max_retries):
        try:
            return operation()
        except ServiceError as e:
            # Don't retry on client errors (except 429)
            if 400 <= e.status < 500 and e.status != 429:
                raise

            # Retry on 429 and 5xx
            if e.status == 429 or e.status >= 500:
                if attempt == max_retries - 1:
                    raise Exception(f"Max retries exceeded") from e

                # Exponential backoff with jitter
                base_delay = 2 ** attempt
                jitter = random.uniform(-0.25, 0.25) * base_delay
                delay = min(base_delay + jitter, 30)  # Cap at 30 seconds

                print(f"Retry attempt {attempt + 1} after {delay:.2f}s")
                time.sleep(delay)
                continue

            raise
```

### SDK Built-in Retry

**Go SDK:**

The Go SDK includes retry logic by default:

- **Max retries**: 7 attempts
- **Total duration**: ~98 seconds (1.5 minutes)
- **Strategy**: Exponential backoff with jitter
- **Base delay**: 1 second
- **Max delay**: 30 seconds between attempts

**Python SDK:**

Python SDK does NOT retry by default. Explicitly configure retry strategy:

```python
from oci.retry import RetryStrategyBuilder

retry_strategy = RetryStrategyBuilder(
    max_attempts_check=True,
    max_attempts=7,
    retry_max_wait_between_calls_seconds=30,
    retry_base_sleep_time_seconds=1,
    backoff_type='EXPONENTIAL_BACKOFF_WITH_JITTER'
).get_retry_strategy()

# Use in SDK calls
response = client.get_object(
    namespace_name=namespace,
    bucket_name=bucket,
    object_name=object_name,
    retry_strategy=retry_strategy
)
```

---

## Circuit Breaker Pattern

For distributed systems, implement circuit breakers to prevent cascade failures:

**Go with Circuit Breaker:**

```go
import "github.com/sony/gobreaker"

var cb *gobreaker.CircuitBreaker

func init() {
    var st gobreaker.Settings
    st.Name = "OCI API"
    st.MaxRequests = 3
    st.Interval = time.Minute
    st.Timeout = 30 * time.Second
    st.ReadyToTrip = func(counts gobreaker.Counts) bool {
        failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
        return counts.Requests >= 3 && failureRatio >= 0.6
    }

    cb = gobreaker.NewCircuitBreaker(st)
}

func callOCIWithCircuitBreaker() (interface{}, error) {
    return cb.Execute(func() (interface{}, error) {
        return client.GetObject(context.Background(), request)
    })
}
```

**Enable in Go SDK:**

```bash
export OCI_SDK_DEFAULT_CIRCUITBREAKER_ENABLED=TRUE
export OCI_SDK_CIRCUITBREAKER_NUM_HISTORY_RESPONSE=5
```

---

## Logging and Monitoring

### Enable SDK Debug Logging

**Go:**

```go
import "github.com/oracle/oci-go-sdk/v65/common"

// Enable debug logging
common.EnableDebugLog()

// Custom logger
import "log"
common.SetLogger(log.New(os.Stdout, "OCI-SDK: ", log.LstdFlags))
```

**Python:**

```python
import logging

# Enable SDK debug logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger('oci')
logger.setLevel(logging.DEBUG)
```

### Structured Error Logging

```go
import "github.com/sirupsen/logrus"

if serviceErr, ok := err.(common.ServiceError); ok {
    logrus.WithFields(logrus.Fields{
        "service":    "oci",
        "operation":  "GetObject",
        "statusCode": serviceErr.GetHTTPStatusCode(),
        "errorCode":  serviceErr.GetCode(),
        "requestId":  serviceErr.GetOpcRequestID(),
    }).Error(serviceErr.GetMessage())
}
```

### Alerting on Critical Errors

```python
def handle_oci_error(e: ServiceError):
    # Log error
    logger.error(f"OCI Error: {e.code} - {e.message}", extra={
        'status': e.status,
        'request_id': e.request_id,
        'operation': e.operation_name
    })

    # Alert on authentication failures
    if e.code == 'NotAuthenticated':
        send_alert("OCI Authentication Failed", e)

    # Alert on rate limiting
    elif e.code == 'TooManyRequests':
        send_alert("OCI Rate Limit Exceeded", e)

    # Alert on server errors
    elif e.status >= 500:
        send_alert("OCI Service Error", e)
```

---

## Testing Error Scenarios

### Mock ServiceError for Testing

**Go:**

```go
import "testing"

func TestErrorHandling(t *testing.T) {
    // Create mock ServiceError
    mockErr := common.ServiceError{
        StatusCode: 404,
        Code:       "NotAuthorizedOrNotFound",
        Message:    "Resource not found",
        OpcRequestID: "test-request-id",
    }

    // Test error handling logic
    err := handleOCIError(mockErr)
    if err == nil {
        t.Error("Expected error handling")
    }
}
```

**Python:**

```python
from oci.exceptions import ServiceError

def test_error_handling():
    # Create mock ServiceError
    mock_error = ServiceError(
        status=404,
        code='NotAuthorizedOrNotFound',
        message='Resource not found',
        headers={'opc-request-id': 'test-request-id'}
    )

    # Test error handling logic
    with pytest.raises(ResourceNotFoundError):
        handle_oci_error(mock_error)
```

---

## Best Practices

1. **Always check ServiceError type**: Don't assume all errors are ServiceError
2. **Log request IDs**: Include OPC request ID for Oracle support tickets
3. **Implement retry logic**: Use exponential backoff for transient failures
4. **Don't retry client errors**: 4xx errors (except 429) won't succeed on retry
5. **Set appropriate timeouts**: Prevent indefinite blocking
6. **Use circuit breakers**: Prevent cascade failures in distributed systems
7. **Monitor error rates**: Track 429 and 5xx errors for capacity planning
8. **Structure logging**: Use structured logs for easier debugging
9. **Test error paths**: Mock ServiceError in unit tests
10. **Handle 404 ambiguity**: Remember 404 can mean either "not found" or "no permission"

---

## References

- **Official Docs**: [Error Handling - OCI SDK](https://docs.oracle.com/en-us/iaas/Content/API/Concepts/sdk_troubleshooting.htm)
- **Go SDK Errors**: [common.ServiceError](https://pkg.go.dev/github.com/oracle/oci-go-sdk/v65/common#ServiceError)
- **Python SDK Errors**: [oci.exceptions.ServiceError](https://oracle-cloud-infrastructure-python-sdk.readthedocs.io/en/latest/api/exceptions.html)
- **Rate Limiting**: [How to prevent HTTP 429 errors](https://ionut-vladu-adrian.medium.com/how-to-prevent-http-429-toomanyrequests-errors-with-oci-python-sdk-mytechretreat-9a0267faa24a)
