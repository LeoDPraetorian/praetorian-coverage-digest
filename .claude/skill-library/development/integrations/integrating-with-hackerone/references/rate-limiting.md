# HackerOne Rate Limiting and Retry Strategies

**Based on research conducted**: January 3, 2026

## Overview

HackerOne API enforces rate limits to prevent abuse and ensure fair resource allocation. Production integrations require exponential backoff with jitter, circuit breakers, and retry budget tracking.

## Rate Limit Quotas

| Operation Type   | Limit        | Window         | Notes                      |
| ---------------- | ------------ | -------------- | -------------------------- |
| Read Operations  | 600 requests | Per minute     | General endpoints          |
| Report Pages     | 300 requests | Per minute     | Stricter (Oct 2023 change) |
| Write Operations | 25 requests  | Per 20 seconds | Creates, updates, deletes  |

**Response Code**: HTTP 429 (Too Many Requests) when exceeded

## Rate Limit Headers

Track these headers from every API response:

| Header                | Purpose                    | Example                       |
| --------------------- | -------------------------- | ----------------------------- |
| `Retry-After`         | Server-specified wait time | `Retry-After: 60` (seconds)   |
| `RateLimit-Limit`     | Total quota in window      | `RateLimit-Limit: 600`        |
| `RateLimit-Remaining` | Requests left              | `RateLimit-Remaining: 425`    |
| `RateLimit-Reset`     | Unix timestamp of reset    | `RateLimit-Reset: 1735862400` |

**Critical**: Always check `Retry-After` header first before implementing custom backoff logic.

## Exponential Backoff Algorithms

### Full Jitter (Recommended)

**Best for HackerOne integration** - prevents thundering herd:

```go
func CalculateFullJitter(attempt int, initial, max time.Duration) time.Duration {
    exponential := initial * time.Duration(math.Pow(2, float64(attempt)))
    capped := min(exponential, max)

    // Full jitter: random between 0 and capped value
    jitter := time.Duration(rand.Float64() * float64(capped))
    return jitter
}

// Usage
delay := CalculateFullJitter(2, 1*time.Second, 60*time.Second)
// Returns: random value between 0 and 4 seconds for attempt 2
```

**Advantages**:

- Spreads retries across time
- Prevents synchronized retry storms
- Best empirical performance

### Equal Jitter (Conservative)

Half fixed, half random - more predictable:

```go
func CalculateEqualJitter(attempt int, initial, max time.Duration) time.Duration {
    exponential := initial * time.Duration(math.Pow(2, float64(attempt)))
    capped := min(exponential, max)

    temp := capped / 2
    jitter := temp + time.Duration(rand.Float64()*float64(temp))
    return jitter
}

// Returns: between 2s and 4s for attempt 2
```

### Decorrelated Jitter (Advanced)

Uses previous delay to calculate next:

```go
func CalculateDecorrelatedJitter(previousDelay, base, max time.Duration) time.Duration {
    nextDelay := time.Duration(rand.Float64() * float64(min(max, previousDelay*3)))
    return max(nextDelay, base)
}
```

## Retry Decision Logic

```
HTTP Status Code Decision Tree:

├─ 429 (Too Many Requests)
│  └─ ✓ RETRY: Check Retry-After header first
│
├─ 503 (Service Unavailable)
│  └─ ✓ RETRY: Server temporarily down
│
├─ 504 (Gateway Timeout)
│  └─ ✓ RETRY: Gateway/proxy timeout
│
├─ 502 (Bad Gateway)
│  └─ ✓ RETRY: Usually retryable
│
├─ 500 (Internal Server Error)
│  └─ ✗ DON'T RETRY: Server error, not transient
│
├─ 400 (Bad Request)
│  └─ ✗ DON'T RETRY: Invalid request syntax
│
├─ 401 (Unauthorized)
│  └─ ✗ DON'T RETRY: Authentication failed
│
├─ 403 (Forbidden)
│  └─ ✗ DON'T RETRY: Permission denied
│
└─ 404 (Not Found)
   └─ ✗ DON'T RETRY: Resource doesn't exist
```

## Implementation Pattern

```go
package hackerone

import (
    "context"
    "errors"
    "math"
    "math/rand"
    "net/http"
    "strconv"
    "time"
)

// RetryConfig holds retry configuration
type RetryConfig struct {
    MaxAttempts     int
    InitialDelay    time.Duration
    MaxDelay        time.Duration
    BackoffFactor   float64
}

// Default configuration for HackerOne
var DefaultRetryConfig = RetryConfig{
    MaxAttempts:   5,
    InitialDelay:  1 * time.Second,
    MaxDelay:      60 * time.Second,
    BackoffFactor: 2.0,
}

// IsRetryable determines if error should be retried
func IsRetryable(statusCode int) bool {
    switch statusCode {
    case 429, 503, 504, 502:
        return true
    default:
        return false
    }
}

// ExecuteWithRetry implements retry logic with exponential backoff
func (c *Client) ExecuteWithRetry(
    ctx context.Context,
    operation func() (*http.Response, error),
) (*http.Response, error) {
    config := DefaultRetryConfig
    var lastErr error

    for attempt := 0; attempt < config.MaxAttempts; attempt++ {
        resp, err := operation()

        // Success
        if err == nil && resp != nil && resp.StatusCode < 400 {
            return resp, nil
        }

        // Check if retryable
        if resp != nil && !IsRetryable(resp.StatusCode) {
            return resp, err
        }

        lastErr = err

        // Last attempt - don't sleep
        if attempt == config.MaxAttempts-1 {
            break
        }

        // Calculate delay
        var delay time.Duration
        if resp != nil {
            // Use Retry-After header if present
            if retryAfter := resp.Header.Get("Retry-After"); retryAfter != "" {
                if seconds, err := strconv.Atoi(retryAfter); err == nil {
                    delay = time.Duration(seconds) * time.Second
                }
            }
        }

        // Fall back to exponential backoff with full jitter
        if delay == 0 {
            delay = calculateFullJitter(attempt, config.InitialDelay, config.MaxDelay)
        }

        select {
        case <-time.After(delay):
            // Continue to next attempt
        case <-ctx.Done():
            return nil, ctx.Err()
        }
    }

    return nil, errors.New("max retries exceeded")
}

func calculateFullJitter(attempt int, initial, max time.Duration) time.Duration {
    exponential := float64(initial) * math.Pow(2, float64(attempt))
    capped := math.Min(exponential, float64(max))
    return time.Duration(rand.Float64() * capped)
}
```

## Circuit Breaker Pattern

### States

```
CLOSED (Normal) ──[5 failures]──> OPEN (Reject) ──[60s timeout]──> HALF_OPEN (Test) ──[2 successes]──> CLOSED
                                       │                                  │
                                       └─────────[1 failure]──────────────┘
```

### Implementation

```go
type CircuitState int

const (
    StateClosed CircuitState = iota
    StateOpen
    StateHalfOpen
)

type CircuitBreaker struct {
    state            CircuitState
    failureCount     int
    successCount     int
    lastFailureTime  time.Time

    // Configuration
    failureThreshold int
    successThreshold int
    timeout          time.Duration
}

func NewCircuitBreaker() *CircuitBreaker {
    return &CircuitBreaker{
        state:            StateClosed,
        failureThreshold: 5,
        successThreshold: 2,
        timeout:          60 * time.Second,
    }
}

func (cb *CircuitBreaker) Execute(operation func() error) error {
    // OPEN: Reject requests
    if cb.state == StateOpen {
        if time.Since(cb.lastFailureTime) > cb.timeout {
            // Transition to HALF_OPEN
            cb.state = StateHalfOpen
            cb.successCount = 0
        } else {
            return errors.New("circuit breaker is OPEN")
        }
    }

    // Execute operation
    err := operation()

    if err != nil {
        // Record failure
        cb.failureCount++
        cb.lastFailureTime = time.Now()

        // Check if should open
        if cb.failureCount >= cb.failureThreshold {
            cb.state = StateOpen
        }

        // HALF_OPEN failure
        if cb.state == StateHalfOpen {
            cb.state = StateOpen
        }

        return err
    }

    // Success in HALF_OPEN
    if cb.state == StateHalfOpen {
        cb.successCount++
        if cb.successCount >= cb.successThreshold {
            cb.state = StateClosed
            cb.failureCount = 0
        }
    }

    return nil
}
```

## Retry Budget

**Purpose**: Prevent system-wide retry storms

```go
type RetryBudget struct {
    total          int
    remaining      int
    windowStart    time.Time
    windowDuration time.Duration
}

func NewRetryBudget(total int, window time.Duration) *RetryBudget {
    return &RetryBudget{
        total:          total,
        remaining:      total,
        windowStart:    time.Now(),
        windowDuration: window,
    }
}

func (rb *RetryBudget) CanRetry() bool {
    // Reset if window expired
    if time.Since(rb.windowStart) > rb.windowDuration {
        rb.remaining = rb.total
        rb.windowStart = time.Now()
    }

    return rb.remaining > 0
}

func (rb *RetryBudget) SpendRetry() {
    rb.remaining--
}
```

**Configuration**: 100 retries per 60 seconds (system-wide)

## Production Configuration

```go
// Recommended settings for HackerOne integration
const (
    // Retry Configuration
    MaxRetries       = 5
    InitialDelay     = 1 * time.Second
    MaxDelay         = 60 * time.Second
    BackoffFactor    = 2.0

    // Circuit Breaker
    FailureThreshold = 5
    SuccessThreshold = 2
    BreakerTimeout   = 60 * time.Second

    // Retry Budget
    RetryBudgetTotal = 100
    BudgetWindow     = 60 * time.Second

    // Rate Limiting
    ReadRateLimit    = 600  // per minute
    WriteRateLimit   = 25   // per 20 seconds
)
```

## Monitoring

Track these metrics for alerting:

```go
type RateLimitMetrics struct {
    TotalRequests       int
    RateLimitedRequests int
    CircuitBreakerTrips int
    RetryBudgetExhausted int
    AverageBackoffDelay time.Duration
}

// Alert thresholds:
// - Rate limit error rate > 5% over 15 minutes
// - Circuit breaker trips > 3 in 5 minutes
// - Retry budget exhausted > 2 times in hour
```

## References

- [AWS Builders' Library: Timeouts, Retries and Backoff with Jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
- [HackerOne Blog: Retrying and Exponential Backoff](https://www.hackerone.com/blog/retrying-and-exponential-backoff-smart-strategies-robust-software)
