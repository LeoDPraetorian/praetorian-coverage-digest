# Error Handling Patterns

**Comprehensive error handling strategies for Bitbucket API integration.**

---

## Common Error Codes

| Code | Error                 | Cause                    | Solution                           |
| ---- | --------------------- | ------------------------ | ---------------------------------- |
| 401  | Unauthorized          | Invalid/expired token    | Refresh token, verify credentials  |
| 403  | Forbidden             | Insufficient permissions | Check token scopes, request access |
| 404  | Not Found             | Resource doesn't exist   | Verify workspace/repo names        |
| 429  | Too Many Requests     | Rate limit exceeded      | Implement exponential backoff      |
| 500  | Internal Server Error | Bitbucket service issue  | Retry with backoff                 |
| 502  | Bad Gateway           | Temporary outage         | Retry after delay                  |
| 503  | Service Unavailable   | Maintenance/overload     | Retry with exponential backoff     |

---

## Retry Strategy

### Exponential Backoff (Go)

```go
func (c *Client) RequestWithRetry(method, path string, body interface{}) (*http.Response, error) {
    maxRetries := 5
    baseDelay := 1 * time.Second
    maxDelay := 60 * time.Second

    var lastErr error
    for attempt := 0; attempt <= maxRetries; attempt++ {
        resp, err := c.Request(method, path, body)

        // Success
        if err == nil && resp.StatusCode < 500 && resp.StatusCode != 429 {
            return resp, nil
        }

        // Determine if retryable
        if !isRetryable(resp, err) {
            return resp, err
        }

        // Last attempt
        if attempt == maxRetries {
            return nil, fmt.Errorf("max retries exceeded: %w", lastErr)
        }

        // Calculate backoff
        backoff := time.Duration(math.Pow(2, float64(attempt))) * baseDelay
        if backoff > maxDelay {
            backoff = maxDelay
        }

        log.Printf("Retry attempt %d/%d after %v", attempt+1, maxRetries, backoff)
        time.Sleep(backoff)
        lastErr = err
    }

    return nil, lastErr
}

func isRetryable(resp *http.Response, err error) bool {
    if err != nil {
        return true  // Network errors are retryable
    }

    // Retry on rate limit and server errors
    return resp.StatusCode == 429 || resp.StatusCode >= 500
}
```

### Circuit Breaker Pattern

```go
type CircuitBreaker struct {
    threshold    int
    timeout      time.Duration
    failures     int
    lastAttempt  time.Time
    state        string  // "closed", "open", "half-open"
    mu           sync.Mutex
}

func (cb *CircuitBreaker) Call(fn func() error) error {
    cb.mu.Lock()
    defer cb.mu.Unlock()

    // Check if circuit is open
    if cb.state == "open" {
        if time.Since(cb.lastAttempt) > cb.timeout {
            cb.state = "half-open"
        } else {
            return fmt.Errorf("circuit breaker open")
        }
    }

    // Execute function
    err := fn()
    cb.lastAttempt = time.Now()

    if err != nil {
        cb.failures++
        if cb.failures >= cb.threshold {
            cb.state = "open"
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

## Error Types (Go)

```go
type BitbucketError struct {
    StatusCode int
    Message    string
    Type       string
    RetryAfter time.Duration
}

func (e *BitbucketError) Error() string {
    return fmt.Sprintf("bitbucket error %d: %s", e.StatusCode, e.Message)
}

func parseError(resp *http.Response) error {
    var errResp struct {
        Type  string `json:"type"`
        Error struct {
            Message string `json:"message"`
        } `json:"error"`
    }

    json.NewDecoder(resp.Body).Decode(&errResp)

    err := &BitbucketError{
        StatusCode: resp.StatusCode,
        Message:    errResp.Error.Message,
        Type:       errResp.Type,
    }

    // Extract Retry-After header
    if retryAfter := resp.Header.Get("Retry-After"); retryAfter != "" {
        if seconds, parseErr := strconv.Atoi(retryAfter); parseErr == nil {
            err.RetryAfter = time.Duration(seconds) * time.Second
        }
    }

    return err
}
```

---

## Related Documentation

- [rate-limiting.md](rate-limiting.md) - Rate limit handling
- [client-implementation.md](client-implementation.md) - Client with error handling
