# Panorama Rate Limiting

**Last Updated:** January 2026
**Source:** Research from `.claude/.output/research/2026-01-03-165242-panorama-api-complete/`

## Overview

Panorama API rate limits vary by deployment size, license tier, and device model. Unlike cloud APIs with published limits, PAN-OS rate limits are determined by device capacity. This guide provides strategies for handling rate limiting gracefully.

## Quick Reference

### Typical Rate Limits (Approximate)

| Operation         | Estimated Limit | Burst |
| ----------------- | --------------- | ----- |
| GET requests      | 100/minute      | 200   |
| POST/PUT/DELETE   | 50/minute       | 100   |
| Commit operations | 10/minute       | 20    |
| Log queries       | 20/minute       | 40    |

**Note:** Actual limits depend on device model and load. Monitor `429 Too Many Requests` responses.

### Rate Limit Headers

PAN-OS may include these headers (version-dependent):

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1704326400
Retry-After: 30
```

## Client-Side Rate Limiting

### Token Bucket Implementation

```go
package panorama

import (
    "context"
    "sync"
    "time"
)

// RateLimiter implements token bucket algorithm
type RateLimiter struct {
    mu           sync.Mutex
    tokens       float64
    maxTokens    float64
    refillRate   float64 // tokens per second
    lastRefill   time.Time
}

// NewRateLimiter creates a rate limiter
func NewRateLimiter(requestsPerMinute int) *RateLimiter {
    maxTokens := float64(requestsPerMinute)
    return &RateLimiter{
        tokens:     maxTokens,
        maxTokens:  maxTokens,
        refillRate: maxTokens / 60.0, // convert to per-second
        lastRefill: time.Now(),
    }
}

// Wait blocks until a token is available or context is cancelled
func (r *RateLimiter) Wait(ctx context.Context) error {
    for {
        r.mu.Lock()
        r.refill()

        if r.tokens >= 1 {
            r.tokens--
            r.mu.Unlock()
            return nil
        }

        // Calculate wait time for next token
        waitTime := time.Duration((1 - r.tokens) / r.refillRate * float64(time.Second))
        r.mu.Unlock()

        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-time.After(waitTime):
            // Continue to try again
        }
    }
}

func (r *RateLimiter) refill() {
    now := time.Now()
    elapsed := now.Sub(r.lastRefill).Seconds()
    r.tokens += elapsed * r.refillRate

    if r.tokens > r.maxTokens {
        r.tokens = r.maxTokens
    }

    r.lastRefill = now
}

// TryAcquire attempts to acquire a token without blocking
func (r *RateLimiter) TryAcquire() bool {
    r.mu.Lock()
    defer r.mu.Unlock()

    r.refill()
    if r.tokens >= 1 {
        r.tokens--
        return true
    }
    return false
}
```

### Using Rate Limiter in Client

```go
type Client struct {
    baseURL     string
    credentials Credentials
    httpClient  *http.Client
    rateLimiter *RateLimiter
}

func NewClient(config ClientConfig) *Client {
    return &Client{
        baseURL:     config.BaseURL,
        credentials: config.Credentials,
        httpClient:  &http.Client{Timeout: 30 * time.Second},
        rateLimiter: NewRateLimiter(100), // 100 requests/minute default
    }
}

func (c *Client) makeRequest(ctx context.Context, params url.Values) ([]byte, error) {
    // Wait for rate limit token
    if err := c.rateLimiter.Wait(ctx); err != nil {
        return nil, fmt.Errorf("rate limiter: %w", err)
    }

    req, err := http.NewRequestWithContext(ctx, "GET",
        c.baseURL+"/api/?"+params.Encode(), nil)
    if err != nil {
        return nil, err
    }

    c.applyAuth(req)

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    // Handle server-side rate limiting
    if resp.StatusCode == 429 {
        return nil, c.handleRateLimited(resp)
    }

    return io.ReadAll(resp.Body)
}
```

## Server-Side Rate Limit Handling

### Exponential Backoff

```go
package panorama

import (
    "context"
    "math"
    "math/rand"
    "net/http"
    "strconv"
    "time"
)

// BackoffConfig configures exponential backoff
type BackoffConfig struct {
    InitialInterval time.Duration
    MaxInterval     time.Duration
    Multiplier      float64
    MaxRetries      int
    Jitter          float64
}

var DefaultBackoffConfig = BackoffConfig{
    InitialInterval: 1 * time.Second,
    MaxInterval:     60 * time.Second,
    Multiplier:      2.0,
    MaxRetries:      5,
    Jitter:          0.2,
}

func (c *Client) handleRateLimited(resp *http.Response) error {
    // Check for Retry-After header
    if retryAfter := resp.Header.Get("Retry-After"); retryAfter != "" {
        if seconds, err := strconv.Atoi(retryAfter); err == nil {
            return &RateLimitError{
                RetryAfter: time.Duration(seconds) * time.Second,
            }
        }
    }

    return &RateLimitError{
        RetryAfter: 30 * time.Second, // Default fallback
    }
}

type RateLimitError struct {
    RetryAfter time.Duration
}

func (e *RateLimitError) Error() string {
    return fmt.Sprintf("rate limited, retry after %v", e.RetryAfter)
}

// RetryWithBackoff executes a function with exponential backoff
func RetryWithBackoff(ctx context.Context, config BackoffConfig, fn func() error) error {
    interval := config.InitialInterval

    for attempt := 0; attempt <= config.MaxRetries; attempt++ {
        err := fn()
        if err == nil {
            return nil
        }

        // Check if error is retryable
        var rateLimitErr *RateLimitError
        if errors.As(err, &rateLimitErr) {
            interval = rateLimitErr.RetryAfter
        } else if !isRetryable(err) {
            return err
        }

        // Don't sleep on last attempt
        if attempt == config.MaxRetries {
            return fmt.Errorf("max retries exceeded: %w", err)
        }

        // Add jitter
        jitter := time.Duration(float64(interval) * config.Jitter * (rand.Float64()*2 - 1))
        sleepDuration := interval + jitter

        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-time.After(sleepDuration):
        }

        // Exponential increase for next attempt
        interval = time.Duration(float64(interval) * config.Multiplier)
        if interval > config.MaxInterval {
            interval = config.MaxInterval
        }
    }

    return errors.New("unexpected: exited retry loop")
}
```

## Adaptive Rate Limiting

### Dynamic Rate Adjustment

```go
package panorama

import (
    "sync"
    "time"
)

// AdaptiveRateLimiter adjusts rate based on server responses
type AdaptiveRateLimiter struct {
    mu              sync.RWMutex
    currentRate     float64
    minRate         float64
    maxRate         float64
    increaseRatio   float64
    decreaseRatio   float64
    successCount    int
    successThreshold int
    limiter         *RateLimiter
}

func NewAdaptiveRateLimiter(initialRate, minRate, maxRate float64) *AdaptiveRateLimiter {
    return &AdaptiveRateLimiter{
        currentRate:      initialRate,
        minRate:          minRate,
        maxRate:          maxRate,
        increaseRatio:    1.1,  // 10% increase on success
        decreaseRatio:    0.5,  // 50% decrease on rate limit
        successThreshold: 10,   // Increase after 10 successes
        limiter:          NewRateLimiter(int(initialRate)),
    }
}

// RecordSuccess notes a successful request
func (a *AdaptiveRateLimiter) RecordSuccess() {
    a.mu.Lock()
    defer a.mu.Unlock()

    a.successCount++
    if a.successCount >= a.successThreshold {
        a.increaseRate()
        a.successCount = 0
    }
}

// RecordRateLimited notes a 429 response
func (a *AdaptiveRateLimiter) RecordRateLimited() {
    a.mu.Lock()
    defer a.mu.Unlock()

    a.decreaseRate()
    a.successCount = 0
}

func (a *AdaptiveRateLimiter) increaseRate() {
    newRate := a.currentRate * a.increaseRatio
    if newRate > a.maxRate {
        newRate = a.maxRate
    }
    a.currentRate = newRate
    a.limiter = NewRateLimiter(int(newRate))
}

func (a *AdaptiveRateLimiter) decreaseRate() {
    newRate := a.currentRate * a.decreaseRatio
    if newRate < a.minRate {
        newRate = a.minRate
    }
    a.currentRate = newRate
    a.limiter = NewRateLimiter(int(newRate))
}

func (a *AdaptiveRateLimiter) Wait(ctx context.Context) error {
    a.mu.RLock()
    limiter := a.limiter
    a.mu.RUnlock()

    return limiter.Wait(ctx)
}
```

## Request Batching

### Batch Multiple Operations

```go
package panorama

// BatchRequest groups multiple operations
type BatchRequest struct {
    Operations []Operation
}

type Operation struct {
    Action  string
    XPath   string
    Element string
}

// ExecuteBatch sends multiple operations in a single request
func (c *Client) ExecuteBatch(ctx context.Context, batch BatchRequest) ([]BatchResult, error) {
    if err := c.rateLimiter.Wait(ctx); err != nil {
        return nil, err
    }

    // Build multi-config XML
    var multiConfig strings.Builder
    multiConfig.WriteString("<multi-config>")

    for i, op := range batch.Operations {
        multiConfig.WriteString(fmt.Sprintf(
            `<set-%d><action>%s</action><xpath>%s</xpath><element>%s</element></set-%d>`,
            i, op.Action, op.XPath, op.Element, i,
        ))
    }

    multiConfig.WriteString("</multi-config>")

    params := url.Values{
        "type":    {"config"},
        "action":  {"multi-config"},
        "element": {multiConfig.String()},
        "key":     {c.credentials.APIKey},
    }

    resp, err := c.makeRawRequest(ctx, params)
    if err != nil {
        return nil, err
    }

    return parseBatchResponse(resp)
}
```

## Rate Limit Monitoring

### Metrics Collection

```go
package panorama

import (
    "sync/atomic"
    "time"
)

// RateLimitMetrics tracks rate limiting stats
type RateLimitMetrics struct {
    totalRequests     int64
    rateLimitedCount  int64
    totalRetries      int64
    avgResponseTimeNs int64
    windowStart       time.Time
    windowDuration    time.Duration
}

func NewRateLimitMetrics(windowDuration time.Duration) *RateLimitMetrics {
    return &RateLimitMetrics{
        windowStart:    time.Now(),
        windowDuration: windowDuration,
    }
}

func (m *RateLimitMetrics) RecordRequest(responseTime time.Duration, rateLimited bool) {
    atomic.AddInt64(&m.totalRequests, 1)
    if rateLimited {
        atomic.AddInt64(&m.rateLimitedCount, 1)
    }

    // Simple moving average for response time
    current := atomic.LoadInt64(&m.avgResponseTimeNs)
    newAvg := (current + int64(responseTime)) / 2
    atomic.StoreInt64(&m.avgResponseTimeNs, newAvg)
}

func (m *RateLimitMetrics) RecordRetry() {
    atomic.AddInt64(&m.totalRetries, 1)
}

func (m *RateLimitMetrics) GetStats() map[string]interface{} {
    total := atomic.LoadInt64(&m.totalRequests)
    rateLimited := atomic.LoadInt64(&m.rateLimitedCount)

    rateLimitedPct := float64(0)
    if total > 0 {
        rateLimitedPct = float64(rateLimited) / float64(total) * 100
    }

    return map[string]interface{}{
        "total_requests":      total,
        "rate_limited_count":  rateLimited,
        "rate_limited_pct":    rateLimitedPct,
        "total_retries":       atomic.LoadInt64(&m.totalRetries),
        "avg_response_time_ms": atomic.LoadInt64(&m.avgResponseTimeNs) / 1e6,
    }
}
```

### Alerting Thresholds

```go
// AlertConfig defines when to trigger alerts
type AlertConfig struct {
    RateLimitThresholdPct float64       // Alert if > X% requests rate limited
    ResponseTimeThreshold time.Duration // Alert if avg response > X
    CheckInterval         time.Duration
}

var DefaultAlertConfig = AlertConfig{
    RateLimitThresholdPct: 10.0,        // Alert if >10% rate limited
    ResponseTimeThreshold: 5 * time.Second,
    CheckInterval:         1 * time.Minute,
}

func (c *Client) StartMetricsMonitor(ctx context.Context, config AlertConfig, alertFn func(string)) {
    ticker := time.NewTicker(config.CheckInterval)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            stats := c.metrics.GetStats()

            if pct, ok := stats["rate_limited_pct"].(float64); ok {
                if pct > config.RateLimitThresholdPct {
                    alertFn(fmt.Sprintf("High rate limiting: %.1f%% of requests", pct))
                }
            }

            if avgMs, ok := stats["avg_response_time_ms"].(int64); ok {
                if time.Duration(avgMs)*time.Millisecond > config.ResponseTimeThreshold {
                    alertFn(fmt.Sprintf("Slow API responses: %dms average", avgMs))
                }
            }
        }
    }
}
```

## Best Practices

### 1. Client-Side Throttling First

Always implement client-side rate limiting to avoid hitting server limits:

```go
// Good: Proactive client-side limiting
client := NewClient(ClientConfig{
    RateLimit: 50, // Stay well under server limit
})

// Bad: Rely on server-side limits
client := NewClient(ClientConfig{
    // No rate limiting - will hammer server
})
```

### 2. Separate Limits by Operation Type

```go
type ClientLimits struct {
    ReadLimiter   *RateLimiter // Higher limit for GET
    WriteLimiter  *RateLimiter // Lower limit for POST/PUT/DELETE
    CommitLimiter *RateLimiter // Very low limit for commits
}

func NewClientLimits() *ClientLimits {
    return &ClientLimits{
        ReadLimiter:   NewRateLimiter(100),
        WriteLimiter:  NewRateLimiter(50),
        CommitLimiter: NewRateLimiter(10),
    }
}
```

### 3. Queue and Batch

```go
// Use a request queue for non-urgent operations
type RequestQueue struct {
    queue chan Request
    client *Client
}

func (q *RequestQueue) Enqueue(req Request) {
    q.queue <- req
}

func (q *RequestQueue) ProcessLoop(ctx context.Context) {
    batch := make([]Request, 0, 10)
    ticker := time.NewTicker(1 * time.Second)

    for {
        select {
        case req := <-q.queue:
            batch = append(batch, req)
            if len(batch) >= 10 {
                q.processBatch(ctx, batch)
                batch = batch[:0]
            }
        case <-ticker.C:
            if len(batch) > 0 {
                q.processBatch(ctx, batch)
                batch = batch[:0]
            }
        case <-ctx.Done():
            return
        }
    }
}
```

## Common Issues

| Issue             | Cause                    | Solution                   |
| ----------------- | ------------------------ | -------------------------- |
| Constant 429s     | Rate too aggressive      | Reduce client rate limit   |
| Intermittent 429s | Burst traffic            | Add jitter, use queue      |
| Slow recovery     | Backoff too conservative | Tune backoff parameters    |
| Rate varies       | Multiple API consumers   | Coordinate across services |

## Related References

- [Error Handling](error-handling.md) - 429 error handling
- [Performance](performance.md) - Request optimization
- [Authentication](authentication.md) - Separate API keys per service
