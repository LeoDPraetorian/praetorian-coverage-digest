# HackerOne API Error Handling

**Last Updated:** January 3, 2026

## Overview

Comprehensive error handling strategies for HackerOne API integration, including HTTP status code decision trees, retry logic, logging patterns, and graceful degradation.

## HTTP Status Code Decision Tree

```
API Request
    │
    ├─ 2xx Success
    │   ├─ 200 OK → Process response
    │   ├─ 201 Created → Process response, extract resource ID
    │   ├─ 202 Accepted → Async operation, poll for completion
    │   └─ 204 No Content → Success, no body
    │
    ├─ 4xx Client Errors (DO NOT RETRY)
    │   ├─ 400 Bad Request
    │   │   ├─ Log request payload
    │   │   ├─ Return validation error to caller
    │   │   └─ Alert if frequent (>10/hour)
    │   │
    │   ├─ 401 Unauthorized
    │   │   ├─ Verify API token configuration
    │   │   ├─ Check token expiration
    │   │   ├─ Alert operations team (CRITICAL)
    │   │   └─ DO NOT RETRY (credential issue)
    │   │
    │   ├─ 403 Forbidden
    │   │   ├─ Check token permissions (group memberships)
    │   │   ├─ Verify IP whitelist
    │   │   ├─ Log resource ID attempted
    │   │   └─ DO NOT RETRY
    │   │
    │   ├─ 404 Not Found
    │   │   ├─ Handle gracefully (resource may be deleted)
    │   │   ├─ Log resource ID
    │   │   ├─ Return not_found to caller
    │   │   └─ DO NOT RETRY
    │   │
    │   ├─ 422 Unprocessable Entity
    │   │   ├─ Parse validation errors from response
    │   │   ├─ Log field-level errors
    │   │   ├─ Return validation errors to caller
    │   │   └─ DO NOT RETRY (semantic issue)
    │   │
    │   └─ 429 Too Many Requests
    │       ├─ Check Retry-After header
    │       ├─ If Retry-After present → Sleep exact duration
    │       ├─ If no header → Exponential backoff
    │       ├─ Track rate limit consumption
    │       └─ RETRY with backoff
    │
    └─ 5xx Server Errors (RETRY with caution)
        ├─ 500 Internal Server Error
        │   ├─ Log full request/response
        │   ├─ DO NOT RETRY (likely code bug on server)
        │   └─ Alert if persistent (>5 in 15min)
        │
        ├─ 502 Bad Gateway
        │   ├─ Likely transient (gateway/proxy issue)
        │   ├─ RETRY with exponential backoff
        │   └─ Max 3 retries
        │
        ├─ 503 Service Unavailable
        │   ├─ Server temporarily down (maintenance/overload)
        │   ├─ Check Retry-After header
        │   ├─ RETRY with exponential backoff
        │   └─ Max 5 retries
        │
        └─ 504 Gateway Timeout
            ├─ Gateway/proxy timeout (not API timeout)
            ├─ RETRY with exponential backoff
            └─ Max 3 retries
```

## Error Response Parsing

HackerOne uses JSON:API error format:

```json
{
  "errors": [
    {
      "id": "err_abc123",
      "status": "422",
      "code": "validation_failed",
      "title": "Validation Failed",
      "detail": "Title is too short (minimum is 10 characters)",
      "source": {
        "pointer": "/data/attributes/title"
      }
    }
  ]
}
```

### Go Error Parsing

```go
type APIError struct {
    ID     string                 `json:"id"`
    Status string                 `json:"status"`
    Code   string                 `json:"code"`
    Title  string                 `json:"title"`
    Detail string                 `json:"detail"`
    Source map[string]interface{} `json:"source"`
}

type ErrorResponse struct {
    Errors []APIError `json:"errors"`
}

func parseAPIError(resp *http.Response) error {
    if resp.StatusCode >= 200 && resp.StatusCode < 300 {
        return nil
    }

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return fmt.Errorf("failed to read error response: %w", err)
    }

    var errResp ErrorResponse
    if err := json.Unmarshal(body, &errResp); err != nil {
        // Non-JSON error response
        return fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
    }

    if len(errResp.Errors) == 0 {
        return fmt.Errorf("API error %d: unknown error", resp.StatusCode)
    }

    // Return first error with context
    firstErr := errResp.Errors[0]
    return &HackerOneAPIError{
        StatusCode: resp.StatusCode,
        ErrorCode:  firstErr.Code,
        Title:      firstErr.Title,
        Detail:     firstErr.Detail,
        Errors:     errResp.Errors,
    }
}

type HackerOneAPIError struct {
    StatusCode int
    ErrorCode  string
    Title      string
    Detail     string
    Errors     []APIError
}

func (e *HackerOneAPIError) Error() string {
    return fmt.Sprintf("HackerOne API error %d (%s): %s - %s",
        e.StatusCode, e.ErrorCode, e.Title, e.Detail)
}

func (e *HackerOneAPIError) IsRetryable() bool {
    switch e.StatusCode {
    case 429, 502, 503, 504:
        return true
    default:
        return false
    }
}
```

## Retry Strategy Implementation

```go
type RetryConfig struct {
    MaxAttempts   int
    InitialDelay  time.Duration
    MaxDelay      time.Duration
    Multiplier    float64
}

var DefaultRetryConfig = RetryConfig{
    MaxAttempts:  5,
    InitialDelay: 1 * time.Second,
    MaxDelay:     60 * time.Second,
    Multiplier:   2.0,
}

func (c *Client) ExecuteWithRetry(
    ctx context.Context,
    req *http.Request,
    config RetryConfig,
) (*http.Response, error) {
    var lastErr error

    for attempt := 0; attempt < config.MaxAttempts; attempt++ {
        // Clone request for retry (body can only be read once)
        reqClone := req.Clone(ctx)

        resp, err := c.httpClient.Do(reqClone)

        // Network error
        if err != nil {
            lastErr = err
            if attempt < config.MaxAttempts-1 {
                delay := calculateBackoff(attempt, config)
                log.Warn("Network error, retrying",
                    "attempt", attempt+1,
                    "max_attempts", config.MaxAttempts,
                    "delay", delay,
                    "error", err,
                )
                time.Sleep(delay)
                continue
            }
            return nil, fmt.Errorf("max retries exceeded: %w", err)
        }

        // Success
        if resp.StatusCode >= 200 && resp.StatusCode < 300 {
            return resp, nil
        }

        // Parse error
        apiErr := parseAPIError(resp)

        // Check if retryable
        hackerOneErr, ok := apiErr.(*HackerOneAPIError)
        if !ok || !hackerOneErr.IsRetryable() {
            return resp, apiErr
        }

        lastErr = apiErr

        // Last attempt - don't sleep
        if attempt == config.MaxAttempts-1 {
            break
        }

        // Calculate delay (check Retry-After header first)
        var delay time.Duration
        if resp.StatusCode == 429 {
            if retryAfter := resp.Header.Get("Retry-After"); retryAfter != "" {
                if seconds, err := strconv.Atoi(retryAfter); err == nil {
                    delay = time.Duration(seconds) * time.Second
                }
            }
        }

        // Fallback to exponential backoff
        if delay == 0 {
            delay = calculateBackoff(attempt, config)
        }

        log.Warn("API error, retrying",
            "attempt", attempt+1,
            "max_attempts", config.MaxAttempts,
            "status_code", resp.StatusCode,
            "error_code", hackerOneErr.ErrorCode,
            "delay", delay,
        )

        select {
        case <-time.After(delay):
            // Continue to next retry
        case <-ctx.Done():
            return nil, ctx.Err()
        }
    }

    return nil, fmt.Errorf("max retries exceeded: %w", lastErr)
}

func calculateBackoff(attempt int, config RetryConfig) time.Duration {
    // Exponential backoff with full jitter
    exponential := float64(config.InitialDelay) * math.Pow(config.Multiplier, float64(attempt))
    capped := math.Min(exponential, float64(config.MaxDelay))

    // Full jitter (random 0 to capped)
    jitter := time.Duration(rand.Float64() * capped)
    return jitter
}
```

## Logging Patterns

### Structured Logging with Context

```go
type RequestLogger struct {
    logger *slog.Logger
}

func (l *RequestLogger) LogRequest(req *http.Request, duration time.Duration, resp *http.Response, err error) {
    fields := []slog.Attr{
        slog.String("method", req.Method),
        slog.String("url", req.URL.Path),
        slog.Duration("duration", duration),
    }

    // Mask authorization header
    auth := req.Header.Get("Authorization")
    if auth != "" {
        fields = append(fields, slog.String("auth", "Basic [REDACTED]"))
    }

    if err != nil {
        fields = append(fields, slog.String("error", err.Error()))
        l.logger.Error("API request failed", fields...)
        return
    }

    if resp != nil {
        fields = append(fields,
            slog.Int("status_code", resp.StatusCode),
            slog.Int("content_length", int(resp.ContentLength)),
        )

        // Log rate limit headers
        if remaining := resp.Header.Get("RateLimit-Remaining"); remaining != "" {
            fields = append(fields, slog.String("rate_limit_remaining", remaining))
        }

        if resp.StatusCode >= 400 {
            l.logger.Warn("API request error", fields...)
        } else {
            l.logger.Info("API request success", fields...)
        }
    }
}
```

### Error Context Enrichment

```go
func enrichError(err error, req *http.Request, resp *http.Response) error {
    if err == nil {
        return nil
    }

    context := map[string]interface{}{
        "method": req.Method,
        "url":    req.URL.String(),
    }

    if resp != nil {
        context["status_code"] = resp.StatusCode
        context["rate_limit_remaining"] = resp.Header.Get("RateLimit-Remaining")
    }

    return fmt.Errorf("%w (context: %+v)", err, context)
}
```

## Graceful Degradation

### Circuit Breaker Pattern

```go
type CircuitBreaker struct {
    state            CircuitState
    failureCount     int
    successCount     int
    lastFailureTime  time.Time
    failureThreshold int
    successThreshold int
    timeout          time.Duration
    mu               sync.Mutex
}

type CircuitState int

const (
    StateClosed CircuitState = iota  // Normal operation
    StateOpen                         // Failing, reject requests
    StateHalfOpen                     // Testing if recovered
)

func NewCircuitBreaker() *CircuitBreaker {
    return &CircuitBreaker{
        state:            StateClosed,
        failureThreshold: 5,
        successThreshold: 2,
        timeout:          60 * time.Second,
    }
}

func (cb *CircuitBreaker) Execute(fn func() error) error {
    cb.mu.Lock()

    // Check if should transition from Open to HalfOpen
    if cb.state == StateOpen {
        if time.Since(cb.lastFailureTime) > cb.timeout {
            cb.state = StateHalfOpen
            cb.successCount = 0
        } else {
            cb.mu.Unlock()
            return ErrCircuitOpen
        }
    }

    cb.mu.Unlock()

    // Execute function
    err := fn()

    cb.mu.Lock()
    defer cb.mu.Unlock()

    if err != nil {
        cb.failureCount++
        cb.lastFailureTime = time.Now()

        // Transition to Open if threshold exceeded
        if cb.failureCount >= cb.failureThreshold {
            cb.state = StateOpen
            log.Error("Circuit breaker opened",
                "failure_count", cb.failureCount,
                "threshold", cb.failureThreshold,
            )
        }

        // HalfOpen failure → back to Open
        if cb.state == StateHalfOpen {
            cb.state = StateOpen
            log.Warn("Circuit breaker test failed, back to Open")
        }

        return err
    }

    // Success in HalfOpen state
    if cb.state == StateHalfOpen {
        cb.successCount++
        if cb.successCount >= cb.successThreshold {
            cb.state = StateClosed
            cb.failureCount = 0
            log.Info("Circuit breaker closed",
                "success_count", cb.successCount,
            )
        }
    }

    return nil
}

var ErrCircuitOpen = errors.New("circuit breaker is open")
```

### Fallback Strategies

```go
func (c *Client) GetReportWithFallback(reportID string) (*Report, error) {
    // Try primary API call
    report, err := c.GetReport(reportID)
    if err == nil {
        return report, nil
    }

    // Check if circuit breaker is open
    if errors.Is(err, ErrCircuitOpen) {
        log.Warn("Circuit breaker open, using cache", "report_id", reportID)
        return c.cache.GetReport(reportID)
    }

    // Check if 404 (report deleted)
    var apiErr *HackerOneAPIError
    if errors.As(err, &apiErr) && apiErr.StatusCode == 404 {
        log.Info("Report not found, removing from cache", "report_id", reportID)
        c.cache.DeleteReport(reportID)
        return nil, ErrReportNotFound
    }

    // Other errors - try cache as fallback
    cachedReport, cacheErr := c.cache.GetReport(reportID)
    if cacheErr == nil {
        log.Warn("API error, serving stale cache",
            "report_id", reportID,
            "api_error", err,
        )
        return cachedReport, nil
    }

    // No fallback available
    return nil, fmt.Errorf("API error and cache miss: %w", err)
}
```

## Alerting Thresholds

Configure monitoring alerts for these conditions:

| Condition             | Threshold         | Severity     | Action                                      |
| --------------------- | ----------------- | ------------ | ------------------------------------------- |
| 401 errors            | >1 in 5 minutes   | **Critical** | Token expired/invalid - rotate immediately  |
| 403 errors            | >5 in 15 minutes  | **High**     | Permission issue - check token groups       |
| 429 errors            | >50 in 1 hour     | **Medium**   | Rate limit pressure - scale back requests   |
| 5xx errors            | >10 in 15 minutes | **High**     | HackerOne service issue - check status page |
| Circuit breaker opens | Any occurrence    | **High**     | Service degraded - investigate              |
| Request timeout rate  | >20% of requests  | **Medium**   | Network/latency issue                       |
| Error rate            | >5% of requests   | **Medium**   | General integration health issue            |

## Error Recovery Procedures

### 401 Unauthorized Recovery

```bash
# 1. Check token validity
curl -u "TOKEN_ID:TOKEN_VALUE" https://api.hackerone.com/v1/me

# 2. If invalid, rotate token
# - Generate new token in HackerOne UI
# - Update AWS Secrets Manager
aws secretsmanager update-secret \
  --secret-id hackerone/api-token \
  --secret-string '{"token_id":"new_id","token_value":"new_value"}'

# 3. Restart integration service to pick up new token
kubectl rollout restart deployment/hackerone-sync

# 4. Verify recovery
curl -u "NEW_TOKEN_ID:NEW_TOKEN_VALUE" https://api.hackerone.com/v1/me
```

### Rate Limit Recovery

```bash
# 1. Check current rate limit status
curl -i -u "TOKEN_ID:TOKEN_VALUE" https://api.hackerone.com/v1/reports

# 2. Extract headers
# RateLimit-Limit: 600
# RateLimit-Remaining: 0
# RateLimit-Reset: 1735862400

# 3. Calculate wait time
python3 -c "import time; print(1735862400 - int(time.time()))"

# 4. Temporarily disable sync
kubectl scale deployment/hackerone-sync --replicas=0

# 5. Wait for reset, then re-enable
sleep <wait_seconds>
kubectl scale deployment/hackerone-sync --replicas=1
```

### Circuit Breaker Manual Reset

```go
func (c *Client) ResetCircuitBreaker() {
    c.circuitBreaker.mu.Lock()
    defer c.circuitBreaker.mu.Unlock()

    c.circuitBreaker.state = StateClosed
    c.circuitBreaker.failureCount = 0
    c.circuitBreaker.successCount = 0

    log.Info("Circuit breaker manually reset")
}
```

## Common Error Scenarios

### Scenario 1: Report Not Found (404)

**Cause:** Report deleted or moved to different program

**Handling:**

```go
if apiErr.StatusCode == 404 {
    // Remove from Chariot (report deleted in HackerOne)
    return chariotClient.ArchiveRisk(externalID)
}
```

### Scenario 2: Validation Error (422)

**Cause:** Invalid request payload

**Handling:**

```go
if apiErr.StatusCode == 422 {
    // Parse field-level errors
    for _, err := range apiErr.Errors {
        log.Error("Validation error",
            "field", err.Source["pointer"],
            "detail", err.Detail,
        )
    }
    // Return to caller for correction
    return nil, &ValidationError{Errors: apiErr.Errors}
}
```

### Scenario 3: Server Timeout (504)

**Cause:** Gateway timeout (not API timeout)

**Handling:**

```go
if apiErr.StatusCode == 504 {
    // Retry with exponential backoff (max 3 attempts)
    return c.ExecuteWithRetry(ctx, req, RetryConfig{
        MaxAttempts: 3,
        InitialDelay: 2 * time.Second,
        MaxDelay: 10 * time.Second,
    })
}
```

## Testing Error Handling

### Unit Test: Error Parsing

```go
func TestParseAPIError(t *testing.T) {
    body := `{
        "errors": [{
            "status": "422",
            "code": "validation_failed",
            "title": "Validation Failed",
            "detail": "Title is too short"
        }]
    }`

    resp := &http.Response{
        StatusCode: 422,
        Body:       io.NopCloser(strings.NewReader(body)),
    }

    err := parseAPIError(resp)
    assert.Error(t, err)

    apiErr, ok := err.(*HackerOneAPIError)
    assert.True(t, ok)
    assert.Equal(t, 422, apiErr.StatusCode)
    assert.Equal(t, "validation_failed", apiErr.ErrorCode)
    assert.False(t, apiErr.IsRetryable())
}
```

### Integration Test: Retry Logic

```go
func TestRetryOn429(t *testing.T) {
    attemptCount := 0
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        attemptCount++
        if attemptCount < 3 {
            w.Header().Set("Retry-After", "1")
            w.WriteHeader(429)
            return
        }
        w.WriteHeader(200)
        w.Write([]byte(`{"data":{}}`))
    }))
    defer server.Close()

    client := NewClient(server.URL, "test", "test")
    req, _ := http.NewRequest("GET", server.URL+"/test", nil)

    resp, err := client.ExecuteWithRetry(context.Background(), req, DefaultRetryConfig)

    assert.NoError(t, err)
    assert.Equal(t, 200, resp.StatusCode)
    assert.Equal(t, 3, attemptCount)
}
```

## Additional Resources

- [HackerOne API Reference](api-reference.md)
- [Rate Limiting Strategies](rate-limiting.md)
- [Client Implementation](client-implementation.md)
