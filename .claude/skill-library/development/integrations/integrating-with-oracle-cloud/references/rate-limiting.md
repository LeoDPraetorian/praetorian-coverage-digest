# OCI Rate Limiting and Retry Strategies

**Comprehensive guide to handling rate limits and implementing retry logic for Oracle Cloud Infrastructure APIs.**

Source: Official OCI SDK Documentation, Community Best Practices

---

## Overview

OCI enforces API rate limits per tenancy and service to ensure fair resource usage and system stability.

**Key Concepts:**

- **Rate limits**: Maximum requests per time window (varies by service)
- **429 errors**: "Too Many Requests" - rate limit exceeded
- **Exponential backoff**: Retry strategy with increasing delays
- **Jitter**: Random variation in retry delays to prevent thundering herd

---

## OCI Rate Limits

### Service-Specific Limits

Rate limits vary by service and operation type:

| Service        | Typical Limit            | Notes                 |
| -------------- | ------------------------ | --------------------- |
| Compute        | 20 req/sec per region    | List operations       |
| Object Storage | 10 req/sec per namespace | PutObject operations  |
| IAM            | 5-10 req/sec             | User/group management |
| VCN            | 10-20 req/sec            | Network operations    |

**⚠️ Note:** Actual limits depend on tenancy, region, and service tier. Monitor 429 responses to understand your limits.

### 429 Response Format

When rate limit is exceeded, OCI returns:

**HTTP Status**: 429 Too Many Requests

**Headers:**

- `Retry-After`: Seconds to wait before retrying (optional)
- `opc-request-id`: Request ID for debugging

**Body:**

```json
{
  "code": "TooManyRequests",
  "message": "Too many requests"
}
```

---

## SDK Built-in Retry Strategies

### Go SDK (Default Enabled)

The Go SDK includes automatic retry logic:

**Default Configuration:**

- **Max attempts**: 8 (1 initial + 7 retries)
- **Strategy**: Exponential backoff with jitter
- **Base delay**: 1 second
- **Exponent**: 2
- **Max delay**: 30 seconds between attempts
- **Total duration**: ~98 seconds (1.5 minutes)

**Retried Status Codes:**

- `429` (Too Many Requests)
- `500` (Internal Server Error)
- `502` (Bad Gateway)
- `503` (Service Unavailable)
- `504` (Gateway Timeout)

**Configuration:**

```go
import "github.com/oracle/oci-go-sdk/v65/common"

// Default provider uses built-in retry
provider := common.DefaultConfigProvider()
client, err := core.NewComputeClientWithConfigurationProvider(provider)

// Retry is automatic - no additional configuration needed
```

**Disable Retry (not recommended):**

```go
import "github.com/oracle/oci-go-sdk/v65/common"

// Create request without retry
request := core.ListInstancesRequest{
    CompartmentId: common.String(compartmentId),
    // Set retry policy to nil to disable
}
request.RequestMetadata.RetryPolicy = nil
```

### Python SDK (Opt-in)

**⚠️ Important:** Python SDK does NOT retry by default. Must explicitly configure.

**Configure Retry Strategy:**

```python
from oci.retry import RetryStrategyBuilder

# Build retry strategy
retry_strategy = RetryStrategyBuilder(
    # Maximum number of attempts (including initial request)
    max_attempts_check=True,
    max_attempts=8,

    # Backoff configuration
    retry_max_wait_between_calls_seconds=30,  # Cap delay at 30 seconds
    retry_base_sleep_time_seconds=1,          # Start with 1 second
    backoff_type='EXPONENTIAL_BACKOFF_WITH_JITTER',

    # Service errors to retry
    service_error_check=True,
    service_error_retry_config={
        429: [],  # Retry all 429 errors
        500: [],  # Retry all 500 errors
        502: [],
        503: [],
        504: []
    },

    # Connection errors to retry
    service_error_retry_on_any_5xx=True
).get_retry_strategy()

# Use in SDK call
response = client.list_instances(
    compartment_id=compartment_id,
    retry_strategy=retry_strategy
)
```

**Reusable Retry Strategy:**

```python
# Define once, reuse across operations
DEFAULT_RETRY_STRATEGY = RetryStrategyBuilder(
    max_attempts=8,
    retry_max_wait_between_calls_seconds=30,
    retry_base_sleep_time_seconds=1,
    backoff_type='EXPONENTIAL_BACKOFF_WITH_JITTER'
).get_retry_strategy()

# Use in all calls
instances = client.list_instances(
    compartment_id=compartment_id,
    retry_strategy=DEFAULT_RETRY_STRATEGY
)

volumes = block_storage_client.list_volumes(
    compartment_id=compartment_id,
    retry_strategy=DEFAULT_RETRY_STRATEGY
)
```

---

## Custom Retry Implementation

### Exponential Backoff with Jitter (Go)

```go
import (
    "context"
    "math"
    "math/rand"
    "time"
)

type RetryConfig struct {
    MaxAttempts int
    BaseDelay   time.Duration
    MaxDelay    time.Duration
    Multiplier  float64
}

func RetryWithBackoff(ctx context.Context, config RetryConfig, operation func() error) error {
    for attempt := 0; attempt < config.MaxAttempts; attempt++ {
        err := operation()
        if err == nil {
            return nil
        }

        // Check if error is retryable
        if !isRetryable(err) {
            return err
        }

        // Last attempt - don't sleep
        if attempt == config.MaxAttempts-1 {
            return err
        }

        // Calculate delay with exponential backoff
        delay := float64(config.BaseDelay) * math.Pow(config.Multiplier, float64(attempt))

        // Add jitter (±25%)
        jitter := delay * (rand.Float64()*0.5 - 0.25)
        delay = delay + jitter

        // Cap at max delay
        if time.Duration(delay) > config.MaxDelay {
            delay = float64(config.MaxDelay)
        }

        // Respect context cancellation
        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-time.After(time.Duration(delay)):
            // Continue to next attempt
        }
    }

    return fmt.Errorf("max retry attempts exceeded")
}

func isRetryable(err error) bool {
    if serviceErr, ok := err.(common.ServiceError); ok {
        statusCode := serviceErr.GetHTTPStatusCode()
        return statusCode == 429 || statusCode >= 500
    }
    return false
}

// Usage
config := RetryConfig{
    MaxAttempts: 7,
    BaseDelay:   1 * time.Second,
    MaxDelay:    30 * time.Second,
    Multiplier:  2.0,
}

err := RetryWithBackoff(ctx, config, func() error {
    _, err := client.GetInstance(ctx, request)
    return err
})
```

### Exponential Backoff with Jitter (Python)

```python
import time
import random
from oci.exceptions import ServiceError

def retry_with_backoff(operation, max_attempts=7, base_delay=1, max_delay=30):
    """
    Retry operation with exponential backoff and jitter.

    Args:
        operation: Callable to execute
        max_attempts: Maximum retry attempts (default 7)
        base_delay: Initial delay in seconds (default 1)
        max_delay: Maximum delay cap in seconds (default 30)

    Returns:
        Result of operation

    Raises:
        Exception if all retries exhausted or non-retryable error
    """
    for attempt in range(max_attempts):
        try:
            return operation()
        except ServiceError as e:
            # Don't retry client errors (except 429)
            if 400 <= e.status < 500 and e.status != 429:
                raise

            # Last attempt - raise error
            if attempt == max_attempts - 1:
                raise

            # Only retry on 429 and 5xx
            if e.status != 429 and e.status < 500:
                raise

            # Calculate delay
            delay = min(base_delay * (2 ** attempt), max_delay)

            # Add jitter (±25%)
            jitter = delay * (random.uniform(-0.25, 0.25))
            delay = delay + jitter

            print(f"Rate limited. Retry {attempt + 1}/{max_attempts} after {delay:.2f}s")
            time.sleep(delay)

# Usage
def fetch_instances():
    return client.list_instances(compartment_id=compartment_id)

instances = retry_with_backoff(fetch_instances, max_attempts=7)
```

---

## Rate Limit Detection and Monitoring

### Log Rate Limit Events

**Go:**

```go
import "github.com/sirupsen/logrus"

if serviceErr, ok := err.(common.ServiceError); ok {
    if serviceErr.GetHTTPStatusCode() == 429 {
        logrus.WithFields(logrus.Fields{
            "service":    "oci",
            "operation":  "ListInstances",
            "requestId":  serviceErr.GetOpcRequestID(),
            "retryAfter": serviceErr.GetHTTPHeader("Retry-After"),
        }).Warn("Rate limit exceeded")

        // Emit metric for monitoring
        incrementRateLimitCounter("oci.compute.list_instances")
    }
}
```

**Python:**

```python
import logging

logger = logging.getLogger(__name__)

try:
    response = client.list_instances(compartment_id=compartment_id)
except ServiceError as e:
    if e.status == 429:
        logger.warning(
            f"Rate limit exceeded: {e.operation_name}",
            extra={
                'request_id': e.request_id,
                'retry_after': e.headers.get('retry-after'),
                'service': 'oci'
            }
        )

        # Emit metric
        increment_rate_limit_counter('oci.compute.list_instances')
        raise
```

### Metrics and Alerting

**Track rate limit metrics:**

```python
from datadog import statsd

def track_rate_limit(service: str, operation: str):
    """Increment rate limit counter for monitoring."""
    statsd.increment(
        'oci.rate_limit.exceeded',
        tags=[
            f'service:{service}',
            f'operation:{operation}'
        ]
    )

def track_api_latency(service: str, operation: str, duration: float):
    """Track API call latency."""
    statsd.histogram(
        'oci.api.latency',
        duration,
        tags=[
            f'service:{service}',
            f'operation:{operation}'
        ]
    )

# Usage in retry handler
if e.status == 429:
    track_rate_limit('compute', 'list_instances')
```

**Alert on rate limit threshold:**

```yaml
# Example Datadog monitor
name: "OCI Rate Limit Exceeded"
type: "metric alert"
query: "sum(last_5m):sum:oci.rate_limit.exceeded{*} > 10"
message: |
  OCI API rate limit exceeded more than 10 times in 5 minutes.
  Service: {{service.name}}
  Operation: {{operation.name}}
```

---

## Request Throttling Strategies

### Client-Side Rate Limiting

Prevent exceeding rate limits by throttling requests:

**Go with Token Bucket:**

```go
import "golang.org/x/time/rate"

// Create rate limiter: 10 requests per second, burst of 20
limiter := rate.NewLimiter(rate.Limit(10), 20)

func callOCIWithRateLimit(ctx context.Context) error {
    // Wait for permission to proceed
    if err := limiter.Wait(ctx); err != nil {
        return err
    }

    // Make API call
    _, err := client.ListInstances(ctx, request)
    return err
}
```

**Python with Ratelimit Decorator:**

```python
from ratelimit import limits, sleep_and_retry

# Allow 10 calls per second
@sleep_and_retry
@limits(calls=10, period=1)
def list_instances_throttled(client, compartment_id):
    return client.list_instances(compartment_id=compartment_id)

# Usage - automatically throttled
instances = list_instances_throttled(client, compartment_id)
```

### Batch Processing with Delays

```python
import time

def process_compartments_with_rate_limiting(client, compartment_ids):
    results = []

    for compartment_id in compartment_ids:
        # Fetch instances for compartment
        instances = retry_with_backoff(
            lambda: client.list_instances(compartment_id=compartment_id)
        )

        results.extend(instances.data)

        # Rate limit protection: 100ms delay between compartments
        time.sleep(0.1)

    return results
```

---

## Circuit Breaker Pattern

For repeated rate limit failures, implement circuit breaker to prevent overwhelming the API:

**Go Implementation:**

```go
import "github.com/sony/gobreaker"

var cb *gobreaker.CircuitBreaker

func init() {
    var st gobreaker.Settings
    st.Name = "OCI API"
    st.MaxRequests = 5
    st.Interval = time.Minute
    st.Timeout = 30 * time.Second

    // Open circuit if 60% of last 10 requests failed
    st.ReadyToTrip = func(counts gobreaker.Counts) bool {
        failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
        return counts.Requests >= 10 && failureRatio >= 0.6
    }

    // On state change
    st.OnStateChange = func(name string, from gobreaker.State, to gobreaker.State) {
        log.Printf("Circuit breaker %s: %s -> %s", name, from, to)
    }

    cb = gobreaker.NewCircuitBreaker(st)
}

func callOCIWithCircuitBreaker() (interface{}, error) {
    return cb.Execute(func() (interface{}, error) {
        return client.GetObject(context.Background(), request)
    })
}
```

**Circuit Breaker States:**

- **Closed**: Normal operation, requests allowed
- **Open**: Too many failures, requests blocked
- **Half-Open**: Testing if service recovered

---

## Best Practices

### 1. Always Implement Retry Logic

**✅ DO:**

- Use SDK built-in retry (Go default, Python configured)
- Implement exponential backoff with jitter
- Set reasonable max attempts (7-10)

**❌ DON'T:**

- Retry indefinitely
- Use fixed delays (causes thundering herd)
- Retry non-retryable errors (4xx except 429)

### 2. Respect Retry-After Header

```go
if serviceErr.GetHTTPStatusCode() == 429 {
    retryAfter := serviceErr.GetHTTPHeader("Retry-After")
    if retryAfter != "" {
        // Parse and wait specified duration
        seconds, _ := strconv.Atoi(retryAfter)
        time.Sleep(time.Duration(seconds) * time.Second)
    }
}
```

### 3. Monitor Rate Limit Metrics

- Track 429 response frequency
- Alert when threshold exceeded
- Identify operations causing rate limits
- Analyze patterns (time of day, specific operations)

### 4. Optimize API Usage

- **Use filters**: Reduce result set size
- **Batch operations**: Combine multiple operations when possible
- **Cache results**: Avoid redundant API calls
- **Increase pagination limit**: Fewer requests for large datasets

### 5. Implement Client-Side Throttling

Prevent hitting rate limits in the first place:

```python
# Limit to 8 requests per second (below OCI limit)
from ratelimit import limits, sleep_and_retry

@sleep_and_retry
@limits(calls=8, period=1)
def oci_api_call(client, operation, **kwargs):
    return operation(**kwargs)
```

### 6. Use Circuit Breakers for Resilience

Prevent cascade failures when API is degraded:

- Open circuit after repeated failures
- Allow periodic retry attempts (half-open state)
- Close circuit when service recovers

---

## Testing Rate Limit Handling

### Simulate 429 Errors

**Go:**

```go
func TestRateLimitHandling(t *testing.T) {
    // Create mock 429 error
    mockErr := common.ServiceError{
        StatusCode:   429,
        Code:         "TooManyRequests",
        Message:      "Rate limit exceeded",
        OpcRequestID: "test-request-id",
    }

    // Test retry logic
    retried := false
    operation := func() error {
        if !retried {
            retried = true
            return mockErr
        }
        return nil
    }

    err := RetryWithBackoff(context.Background(), config, operation)
    if err != nil {
        t.Errorf("Expected retry to succeed, got error: %v", err)
    }

    if !retried {
        t.Error("Expected operation to retry")
    }
}
```

**Python:**

```python
from unittest.mock import Mock, side_effect
from oci.exceptions import ServiceError

def test_rate_limit_retry():
    # First call raises 429, second succeeds
    mock_client = Mock()
    mock_client.list_instances.side_effect = [
        ServiceError(status=429, code='TooManyRequests', message='Rate limited', headers={}),
        Mock(data=[{'id': '1'}])
    ]

    # Should retry and succeed
    result = retry_with_backoff(
        lambda: mock_client.list_instances(compartment_id='test')
    )

    assert len(result.data) == 1
    assert mock_client.list_instances.call_count == 2
```

---

## References

- **Official Docs**: [Rate Limiting - OCI API](https://docs.oracle.com/en-us/iaas/Content/API/Concepts/ratelimits.htm)
- **Go SDK Retry**: [common.RetryPolicy](https://pkg.go.dev/github.com/oracle/oci-go-sdk/v65/common#RetryPolicy)
- **Python Retry**: [oci.retry module](https://oracle-cloud-infrastructure-python-sdk.readthedocs.io/en/latest/api/retry.html)
- **Community Guide**: [Preventing HTTP 429 Errors](https://ionut-vladu-adrian.medium.com/how-to-prevent-http-429-toomanyrequests-errors-with-oci-python-sdk-mytechretreat-9a0267faa24a)
