# GitLab Rate Limiting Strategy

## Rate Limit Tiers (GitLab.com)

| Tier        | REST (Authenticated) | GraphQL AI   | Unauthenticated |
| ----------- | -------------------- | ------------ | --------------- |
| Free        | 300 req/min          | 160 req/8hrs | 10 req/min      |
| Premium     | 600 req/min          | 160 req/8hrs | 10 req/min      |
| Ultimate    | 2000 req/min         | 160 req/8hrs | 10 req/min      |
| Self-hosted | Configurable         | Configurable | Configurable    |

## Response Headers

```http
RateLimit-Limit: 600
RateLimit-Remaining: 599
RateLimit-Reset: 1719936000
RateLimit-ResetTime: Mon, 02 Jul 2024 12:00:00 GMT
Retry-After: 60
```

## Implementation Pattern

```go
type RateLimitInfo struct {
    Limit     int
    Remaining int
    Reset     int64
}

func CheckRateLimit(resp *http.Response) *RateLimitInfo {
    return &RateLimitInfo{
        Limit:     parseInt(resp.Header.Get("RateLimit-Limit")),
        Remaining: parseInt(resp.Header.Get("RateLimit-Remaining")),
        Reset:     parseInt64(resp.Header.Get("RateLimit-Reset")),
    }
}

func FetchWithRateLimit(url, token string) (*http.Response, error) {
    resp, err := http.Get(url)
    if err != nil {
        return nil, err
    }

    rateLimit := CheckRateLimit(resp)

    // Handle 429 Too Many Requests
    if resp.StatusCode == 429 {
        retryAfter := parseInt(resp.Header.Get("Retry-After"))
        log.Printf("Rate limited. Retrying after %ds", retryAfter)
        time.Sleep(time.Duration(retryAfter) * time.Second)
        return FetchWithRateLimit(url, token) // Retry
    }

    // Proactive throttling at 5% remaining
    if float64(rateLimit.Remaining)/float64(rateLimit.Limit) < 0.05 {
        resetTime := time.Unix(rateLimit.Reset, 0)
        waitDuration := time.Until(resetTime)
        log.Printf("Approaching limit. Waiting %v", waitDuration)
        time.Sleep(waitDuration)
    }

    return resp, nil
}
```

## Best Practices

1. **Monitor before each request** - Check `RateLimit-Remaining`
2. **Proactive throttling** - Sleep when < 5% remaining
3. **Exponential backoff** - On 429 responses
4. **Circuit breaker** - Stop requests on sustained failures
5. **Request batching** - Combine operations where possible

## python-gitlab Auto-Retry

```python
import gitlab

gl = gitlab.Gitlab(
    'https://gitlab.com',
    private_token='glpat-xxx',
    retry_transient_errors=True,  # Auto-retry on 429
    max_retries=10                # Default may be insufficient
)
```

⚠️ **Warning:** Default `max_retries=10` may fail for long operations. Increase as needed.

For comprehensive rate limiting patterns, see:
`.claude/.output/research/2026-01-04-205433-gitlab-integration-security/SYNTHESIS.md` (Section 1.3)
