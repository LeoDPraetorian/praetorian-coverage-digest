# Rate Limit Testing

**Testing patterns for HTTP 429 rate limiting with Retry-After headers.**

## Basic Rate Limiting Test

```go
func TestAPI_RateLimitHandling(t *testing.T) {
    attemptCount := 0

    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        attemptCount++

        if attemptCount < 3 {
            // Simulate rate limit on first 2 attempts
            w.Header().Set("Retry-After", "1")  // Retry after 1 second
            w.WriteHeader(http.StatusTooManyRequests)
            json.NewEncoder(w).Encode(map[string]string{
                "error": "rate_limit_exceeded",
            })
            return
        }

        // Succeed on 3rd attempt
        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(map[string]string{
            "status": "success",
        })
    }))
    defer server.Close()

    client := NewRetryableClient(server.URL)
    resp, err := client.FetchData()

    require.NoError(t, err)
    assert.Equal(t, "success", resp.Status)
    assert.GreaterOrEqual(t, attemptCount, 3)  // Verify retries happened
}
```

## Retry-After Header Formats

### Format 1: Delay in Seconds

```go
w.Header().Set("Retry-After", "60")  // Retry after 60 seconds
w.WriteHeader(http.StatusTooManyRequests)
```

### Format 2: RFC1123 Date

```go
retryTime := time.Now().Add(60 * time.Second)
w.Header().Set("Retry-After", retryTime.Format(http.TimeFormat))
w.WriteHeader(http.StatusTooManyRequests)
```

## Parsing Retry-After

```go
func parseRetryAfter(header string) (time.Duration, error) {
    // Try parsing as seconds
    if seconds, err := strconv.Atoi(header); err == nil {
        return time.Duration(seconds) * time.Second, nil
    }

    // Try parsing as RFC1123 date
    if retryTime, err := http.ParseTime(header); err == nil {
        return time.Until(retryTime), nil
    }

    return 0, fmt.Errorf("invalid Retry-After header: %s", header)
}
```

## Testing Exponential Backoff

```go
func TestAPI_ExponentialBackoff(t *testing.T) {
    var attempts []time.Time
    var mu sync.Mutex

    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        mu.Lock()
        attempts = append(attempts, time.Now())
        attemptCount := len(attempts)
        mu.Unlock()

        if attemptCount < 4 {
            w.Header().Set("Retry-After", "1")
            w.WriteHeader(http.StatusTooManyRequests)
            return
        }

        w.WriteHeader(http.StatusOK)
    }))
    defer server.Close()

    client := NewRetryableClientWithBackoff(server.URL, 
        InitialBackoff: 1*time.Second,
        MaxBackoff: 30*time.Second,
        Multiplier: 2.0,
    )

    err := client.FetchData()
    require.NoError(t, err)

    // Verify backoff intervals: 1s, 2s, 4s
    require.Len(t, attempts, 4)
    
    interval1 := attempts[1].Sub(attempts[0])
    interval2 := attempts[2].Sub(attempts[1])
    interval3 := attempts[3].Sub(attempts[2])

    assert.InDelta(t, 1.0, interval1.Seconds(), 0.5)  // ~1s
    assert.InDelta(t, 2.0, interval2.Seconds(), 0.5)  // ~2s
    assert.InDelta(t, 4.0, interval3.Seconds(), 0.5)  // ~4s
}
```

## Rate Limit Headers

Many APIs return rate limit metadata:

```go
func TestAPI_RateLimitHeaders(t *testing.T) {
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("X-RateLimit-Limit", "1000")       // Total limit
        w.Header().Set("X-RateLimit-Remaining", "999")    // Remaining requests
        w.Header().Set("X-RateLimit-Reset", "1609459200") // Unix timestamp

        w.WriteHeader(http.StatusOK)
    }))
    defer server.Close()

    client := NewAPIClient(server.URL)
    rateLimitInfo, err := client.GetRateLimitInfo()

    require.NoError(t, err)
    assert.Equal(t, 1000, rateLimitInfo.Limit)
    assert.Equal(t, 999, rateLimitInfo.Remaining)
}
```

## Progressive Rate Limit Test

```go
func TestAPI_ProgressiveRateLimiting(t *testing.T) {
    requestTimes := []int{
        429, // First request - rate limited
        429, // Second request - rate limited
        429, // Third request - rate limited
        200, // Fourth request - success
    }
    attemptCount := 0

    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if attemptCount >= len(requestTimes) {
            w.WriteHeader(http.StatusOK)
            return
        }

        status := requestTimes[attemptCount]
        attemptCount++

        if status == 429 {
            w.Header().Set("Retry-After", "1")
            w.WriteHeader(http.StatusTooManyRequests)
            json.NewEncoder(w).Encode(map[string]string{
                "error": "rate_limit_exceeded",
                "message": fmt.Sprintf("Attempt %d", attemptCount),
            })
            return
        }

        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(map[string]string{"status": "success"})
    }))
    defer server.Close()

    client := NewRetryableClient(server.URL, MaxRetries: 5)
    resp, err := client.FetchData()

    require.NoError(t, err)
    assert.Equal(t, "success", resp.Status)
    assert.Equal(t, 4, attemptCount)  // 3 failures + 1 success
}
```

## Testing Max Retries

```go
func TestAPI_MaxRetriesExceeded(t *testing.T) {
    attemptCount := 0

    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        attemptCount++
        
        // Always return 429
        w.Header().Set("Retry-After", "1")
        w.WriteHeader(http.StatusTooManyRequests)
    }))
    defer server.Close()

    client := NewRetryableClient(server.URL, MaxRetries: 3)
    _, err := client.FetchData()

    // Should fail after max retries
    require.Error(t, err)
    assert.Contains(t, err.Error(), "max retries exceeded")
    assert.Equal(t, 4, attemptCount)  // Initial + 3 retries
}
```

## Jitter Testing

```go
func TestAPI_JitterInBackoff(t *testing.T) {
    var intervals []time.Duration
    var mu sync.Mutex
    var lastAttempt time.Time

    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        mu.Lock()
        if !lastAttempt.IsZero() {
            intervals = append(intervals, time.Since(lastAttempt))
        }
        lastAttempt = time.Now()
        attemptCount := len(intervals) + 1
        mu.Unlock()

        if attemptCount < 5 {
            w.Header().Set("Retry-After", "2")
            w.WriteHeader(http.StatusTooManyRequests)
            return
        }

        w.WriteHeader(http.StatusOK)
    }))
    defer server.Close()

    client := NewRetryableClientWithJitter(server.URL)
    err := client.FetchData()

    require.NoError(t, err)
    require.Len(t, intervals, 4)

    // Verify jitter: intervals should vary (not all exactly 2s)
    allSame := true
    firstInterval := intervals[0].Seconds()
    for _, interval := range intervals[1:] {
        if math.Abs(interval.Seconds()-firstInterval) > 0.1 {
            allSame = false
            break
        }
    }
    assert.False(t, allSame, "Jitter should cause varying intervals")
}
```

## Best Practices

1. ✅ Parse Retry-After header (both formats)
2. ✅ Implement exponential backoff with jitter
3. ✅ Respect max retries limit
4. ✅ Log rate limit occurrences
5. ✅ Track rate limit headers (X-RateLimit-*)
6. ✅ Test progressive scenarios (fail, fail, fail, success)
7. ✅ Verify retry intervals with timing assertions

## Critical Gap in Chariot

**Identified**: Chariot production code handles 429 responses (`modules/chariot/backend/pkg/tasks/integrations/pingone/pingone.go:457`), but tests don't comprehensively mock rate limiting scenarios.

**Recommendation**: Add rate limiting tests to all integrations that call rate-limited APIs.

## References

- hashicorp/go-retryablehttp - Production rate limiting implementation
- GoogleCloudPlatform/esp-v2 - Advanced 429 retry testing
- go-chi/httprate - Rate limiting middleware
- Chariot rate limiting code: `modules/chariot/backend/pkg/tasks/integrations/pingone/pingone.go:457`
