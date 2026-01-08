# Error Handling

Comprehensive error handling strategies for Azure DevOps API integration.

---

## Error Hierarchy

```
1. Transient Errors (429, 500, 502, 503, 504) → Retry with backoff
2. Authentication Errors (401) → Refresh token/regenerate PAT
3. Authorization Errors (403) → Check permissions, log security event
4. Client Errors (400, 404) → Do NOT retry, log error
5. Network Errors (timeout, DNS failure) → Circuit breaker
```

---

## Go Error Handling

```go
type APIError struct {
    StatusCode int
    Message    string
    TypeKey    string
    IsRetryable bool
}

func (e *APIError) Error() string {
    return fmt.Sprintf("API error %d: %s", e.StatusCode, e.Message)
}

func (c *Client) handleError(resp *http.Response) error {
    body, _ := io.ReadAll(resp.Body)

    var errResp struct {
        Message string `json:"message"`
        TypeKey string `json:"typeKey"`
    }

    json.Unmarshal(body, &errResp)

    apiErr := &APIError{
        StatusCode: resp.StatusCode,
        Message:    errResp.Message,
        TypeKey:    errResp.TypeKey,
    }

    // Determine if retryable
    switch resp.StatusCode {
    case 429, 500, 502, 503, 504:
        apiErr.IsRetryable = true
    default:
        apiErr.IsRetryable = false
    }

    return apiErr
}
```

---

## Retry with Exponential Backoff

```go
func (c *Client) RequestWithRetry(ctx context.Context, method, url string, body io.Reader) (*http.Response, error) {
    maxRetries := 5
    baseDelay := 1 * time.Second
    maxDelay := 60 * time.Second

    for attempt := 0; attempt <= maxRetries; attempt++ {
        resp, err := c.httpClient.Do(req)

        if err != nil {
            // Network error - retry
            delay := calculateDelay(attempt, baseDelay, maxDelay)
            time.Sleep(delay)
            continue
        }

        // Check status code
        if resp.StatusCode >= 200 && resp.StatusCode < 300 {
            return resp, nil // Success
        }

        apiErr := c.handleError(resp)

        if !apiErr.(*APIError).IsRetryable {
            return nil, apiErr // Don't retry client errors
        }

        // Handle rate limiting
        if resp.StatusCode == 429 {
            if retryAfter := resp.Header.Get("Retry-After"); retryAfter != "" {
                seconds, _ := strconv.Atoi(retryAfter)
                time.Sleep(time.Duration(seconds) * time.Second)
                continue
            }
        }

        // Exponential backoff
        delay := calculateDelay(attempt, baseDelay, maxDelay)
        time.Sleep(delay)
    }

    return nil, fmt.Errorf("max retries exceeded")
}

func calculateDelay(attempt int, base, max time.Duration) time.Duration {
    delay := time.Duration(math.Pow(2, float64(attempt))) * base
    jitter := time.Duration(rand.Float64()*0.3+0.2) * time.Second
    delay += jitter

    if delay > max {
        delay = max
    }

    return delay
}
```

---

## Context Timeouts

```go
func (c *Client) GetWithTimeout(ctx context.Context, url string) (*http.Response, error) {
    // Request-level timeout
    ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
    defer cancel()

    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    if err != nil {
        return nil, err
    }

    return c.httpClient.Do(req)
}
```

---

## Python Error Handling

```python
from azure.devops.exceptions import AzureDevOpsServiceError
import time

def request_with_retry(self, func, *args, **kwargs):
    """Execute function with retry logic"""
    max_retries = 5
    base_delay = 1

    for attempt in range(max_retries + 1):
        try:
            return func(*args, **kwargs)
        except AzureDevOpsServiceError as e:
            if e.status_code in [429, 500, 502, 503, 504]:
                # Retryable error
                if attempt < max_retries:
                    delay = min((2 ** attempt) * base_delay, 60)
                    time.sleep(delay)
                    continue
            raise
        except Exception as e:
            # Network errors
            if attempt < max_retries:
                delay = min((2 ** attempt) * base_delay, 60)
                time.sleep(delay)
                continue
            raise

    raise Exception("Max retries exceeded")
```

---

## Common Error Patterns

### 401 Unauthorized

**Cause:** Invalid/expired PAT or OAuth token

**Solution:**
```go
if resp.StatusCode == 401 {
    log.Printf("Authentication failed - PAT may be expired")
    // Regenerate PAT or refresh OAuth token
    return errors.New("authentication failed")
}
```

### 403 Forbidden

**Cause:** Insufficient permissions

**Solution:**
```go
if resp.StatusCode == 403 {
    log.Printf("Access denied - check Azure DevOps permissions")
    // Log security event
    c.auditLogger.LogSecurityEvent("permission_denied", user, resource)
    return errors.New("access denied")
}
```

### 429 Rate Limited

**Cause:** Exceeded TSTU limit

**Solution:**
```go
if resp.StatusCode == 429 {
    retryAfter := resp.Header.Get("Retry-After")
    seconds, _ := strconv.Atoi(retryAfter)
    log.Printf("Rate limited - waiting %d seconds", seconds)
    time.Sleep(time.Duration(seconds) * time.Second)
    // Retry request
}
```

---

## Circuit Breaker Pattern

```go
type CircuitBreaker struct {
    failures    int
    lastFailure time.Time
    state       string // "closed", "open", "half-open"
    threshold   int
    timeout     time.Duration
}

func (cb *CircuitBreaker) Call(fn func() error) error {
    if cb.state == "open" {
        if time.Since(cb.lastFailure) > cb.timeout {
            cb.state = "half-open"
        } else {
            return fmt.Errorf("circuit breaker open")
        }
    }

    err := fn()

    if err != nil {
        cb.failures++
        cb.lastFailure = time.Now()

        if cb.failures >= cb.threshold {
            cb.state = "open"
            log.Printf("Circuit breaker opened after %d failures", cb.failures)
        }

        return err
    }

    // Success - reset
    cb.failures = 0
    cb.state = "closed"
    return nil
}
```

---

## Related Resources

- [Rate Limiting](rate-limiting.md)
- [Client Implementation](client-implementation.md)
