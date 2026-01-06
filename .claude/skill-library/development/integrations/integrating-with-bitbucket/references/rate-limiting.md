# Rate Limiting for Bitbucket API

**Complete guide to Bitbucket Cloud API rate limits, monitoring, and optimization strategies.**

---

## Rate Limit Overview

Bitbucket Cloud enforces rate limits to prevent service abuse and ensure fair resource allocation. Limits vary based on authentication method and workspace characteristics.

**Key Principle:** Authenticated requests receive significantly higher limits than anonymous requests.

---

## Rate Limit Tables

### Anonymous (Unauthenticated) Requests

| Category          | Limit                           |
| ----------------- | ------------------------------- |
| All API Resources | 60 requests/hour per IP address |

**Measurement:** By source IP address
**Recommendation:** Always use authentication for production integrations

### Authenticated Requests (Base Limits)

| Endpoint Category              | Limit             | Measurement Window             |
| ------------------------------ | ----------------- | ------------------------------ |
| **Repository Data Access**     | 1,000/hour (base) | 1-hour rolling window per user |
| **Git Operations** (HTTPS/SSH) | 60,000/hour       | 1-hour rolling window per user |
| **Raw File Downloads**         | 5,000/hour        | 1-hour rolling window per user |
| **Archive Files** (.zip, .gz)  | 5,000 files/hour  | 1-hour rolling window per user |
| **Webhook Management**         | 1,000/hour        | 1-hour rolling window per user |
| **Application Properties**     | 2,000/hour        | 1-hour rolling window per user |
| **Sending Invitations**        | 100/minute        | 1-minute window                |

**Measurement:** Against user ID (not IP address)
**Source:** [API request limits | Bitbucket Cloud](https://support.atlassian.com/bitbucket-cloud/docs/api-request-limits/)

### Scaled Rate Limits (Enterprise)

Workspaces meeting ALL criteria below receive enhanced limits:

**Eligibility:**

- ✅ Standard or Premium plan subscription
- ✅ 100+ paid users in workspace
- ✅ Authentication via workspace/project/repository access tokens OR Forge apps using `asApp`

**Formula:**

```
Scaled Limit = 1,000 + (10 × (paid_users - 100))
Maximum: 10,000 requests/hour
```

**Examples:**

| Paid Users | Calculation                          | Limit                 |
| ---------- | ------------------------------------ | --------------------- |
| 50         | Not eligible                         | 1,000/hour (base)     |
| 100        | 1,000 + (0 × 10)                     | 1,000/hour (base)     |
| 200        | 1,000 + (100 × 10)                   | 2,000/hour            |
| 500        | 1,000 + (400 × 10)                   | 5,000/hour            |
| 1,000      | 1,000 + (900 × 10) = 10,000 (capped) | **10,000/hour** (max) |

**Impact:** 10x increase in request capacity for large enterprises

---

## Rate Limit Headers

For endpoints with scaled rate limits, Bitbucket returns these response headers:

| Header                  | Purpose                       | Example Value      |
| ----------------------- | ----------------------------- | ------------------ |
| `X-RateLimit-Limit`     | Total permitted requests/hour | `5000`             |
| `X-RateLimit-Resource`  | API resource group identifier | `api-repositories` |
| `X-RateLimit-NearLimit` | Boolean flag when <20% remain | `true`             |

**Note:** Not all endpoints return these headers. Availability depends on endpoint category.

**Example Response:**

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 5000
X-RateLimit-Resource: api-repositories
X-RateLimit-NearLimit: false
...
```

---

## Monitoring Rate Limits

### Go Implementation

```go
package main

import (
    "fmt"
    "net/http"
    "strconv"
)

type RateLimitInfo struct {
    Limit        int
    Resource     string
    NearLimit    bool
    RemainingPct float64
}

func ParseRateLimitHeaders(resp *http.Response) *RateLimitInfo {
    info := &RateLimitInfo{}

    if limit := resp.Header.Get("X-RateLimit-Limit"); limit != "" {
        info.Limit, _ = strconv.Atoi(limit)
    }

    info.Resource = resp.Header.Get("X-RateLimit-Resource")

    if nearLimit := resp.Header.Get("X-RateLimit-NearLimit"); nearLimit == "true" {
        info.NearLimit = true
        info.RemainingPct = 0.15 // <20% remaining
    } else {
        info.RemainingPct = 0.50 // Estimate if not near limit
    }

    return info
}

func (c *BitbucketClient) MonitorRateLimit(resp *http.Response) {
    info := ParseRateLimitHeaders(resp)

    if info.NearLimit {
        // Alert: less than 20% of requests remain
        fmt.Printf("⚠️  Rate limit warning: %s near limit (<%d remaining)\n",
            info.Resource, int(float64(info.Limit)*0.2))

        // Implement backoff strategy
        c.enableBackoff()
    }

    // Log for monitoring
    c.logger.Info("rate_limit",
        "resource", info.Resource,
        "limit", info.Limit,
        "near_limit", info.NearLimit)
}
```

### Python Implementation

```python
import logging

class RateLimitMonitor:
    def __init__(self, logger=None):
        self.logger = logger or logging.getLogger(__name__)

    def parse_headers(self, response):
        """Parse rate limit headers from response."""
        return {
            'limit': int(response.headers.get('X-RateLimit-Limit', 0)),
            'resource': response.headers.get('X-RateLimit-Resource', 'unknown'),
            'near_limit': response.headers.get('X-RateLimit-NearLimit') == 'true'
        }

    def check_rate_limit(self, response):
        """Check rate limit status and log warnings."""
        info = self.parse_headers(response)

        if info['near_limit']:
            remaining = int(info['limit'] * 0.2)
            self.logger.warning(
                f"Rate limit warning: {info['resource']} near limit "
                f"(<{remaining} requests remaining)"
            )
            return True  # Signal backoff needed

        return False  # No action needed
```

---

## Handling 429 (Too Many Requests)

When rate limits are exceeded, Bitbucket returns:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 3600

{
  "type": "error",
  "error": {
    "message": "Rate limit exceeded"
  }
}
```

### Exponential Backoff Strategy

**Algorithm:**

```
wait_time = min(base_delay * (2 ^ attempt), max_delay)

Where:
- base_delay = 1 second
- attempt = retry attempt number (0-indexed)
- max_delay = 60 seconds (cap)
```

**Backoff Sequence:**

- Attempt 1: 1s
- Attempt 2: 2s
- Attempt 3: 4s
- Attempt 4: 8s
- Attempt 5: 16s
- Attempt 6+: 60s (capped)

### Go Implementation

```go
package main

import (
    "math"
    "time"
)

type RetryConfig struct {
    MaxRetries  int
    BaseDelay   time.Duration
    MaxDelay    time.Duration
}

func DefaultRetryConfig() *RetryConfig {
    return &RetryConfig{
        MaxRetries: 6,
        BaseDelay:  1 * time.Second,
        MaxDelay:   60 * time.Second,
    }
}

func (c *BitbucketClient) MakeRequestWithRetry(method, path string) (*http.Response, error) {
    config := DefaultRetryConfig()

    for attempt := 0; attempt <= config.MaxRetries; attempt++ {
        resp, err := c.makeRequest(method, path)

        // Success
        if err == nil && resp.StatusCode != 429 {
            return resp, nil
        }

        // Rate limited
        if resp != nil && resp.StatusCode == 429 {
            if attempt == config.MaxRetries {
                return nil, fmt.Errorf("max retries exceeded after rate limit")
            }

            // Calculate backoff
            backoff := calculateBackoff(attempt, config)
            c.logger.Warn("rate_limited", "attempt", attempt, "backoff", backoff)

            time.Sleep(backoff)
            continue
        }

        // Other error
        return resp, err
    }

    return nil, fmt.Errorf("max retries exceeded")
}

func calculateBackoff(attempt int, config *RetryConfig) time.Duration {
    // Exponential: base * 2^attempt
    backoff := config.BaseDelay * time.Duration(math.Pow(2, float64(attempt)))

    // Cap at max delay
    if backoff > config.MaxDelay {
        backoff = config.MaxDelay
    }

    return backoff
}
```

### Python Implementation

```python
import time
import requests

class BitbucketClientWithRetry:
    MAX_RETRIES = 6
    BASE_DELAY = 1  # seconds
    MAX_DELAY = 60  # seconds

    def make_request_with_retry(self, method, path):
        for attempt in range(self.MAX_RETRIES + 1):
            response = self.make_request(method, path)

            # Success
            if response.status_code != 429:
                return response

            # Rate limited
            if attempt == self.MAX_RETRIES:
                raise Exception("Max retries exceeded after rate limit")

            # Calculate backoff
            backoff = self._calculate_backoff(attempt)
            self.logger.warning(f"Rate limited, retrying in {backoff}s (attempt {attempt + 1})")

            time.sleep(backoff)

        raise Exception("Max retries exceeded")

    def _calculate_backoff(self, attempt):
        """Exponential backoff with cap."""
        backoff = self.BASE_DELAY * (2 ** attempt)
        return min(backoff, self.MAX_DELAY)
```

---

## Optimization Strategies

### 1. Implement Response Caching

Cache frequently accessed data to reduce API calls:

```go
type CachedResponse struct {
    Data      interface{}
    ExpiresAt time.Time
}

type ResponseCache struct {
    cache map[string]*CachedResponse
    mu    sync.RWMutex
    ttl   time.Duration
}

func NewResponseCache(ttl time.Duration) *ResponseCache {
    return &ResponseCache{
        cache: make(map[string]*CachedResponse),
        ttl:   ttl,
    }
}

func (c *ResponseCache) Get(key string) (interface{}, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()

    entry, exists := c.cache[key]
    if !exists || time.Now().After(entry.ExpiresAt) {
        return nil, false
    }

    return entry.Data, true
}

func (c *ResponseCache) Set(key string, data interface{}) {
    c.mu.Lock()
    defer c.mu.Unlock()

    c.cache[key] = &CachedResponse{
        Data:      data,
        ExpiresAt: time.Now().Add(c.ttl),
    }
}
```

**Recommended TTL:**

- Repository metadata: 5 minutes
- Pull request data: 1 minute
- User data: 10 minutes

### 2. Use Webhooks Instead of Polling

**Anti-Pattern (Polling):**

```go
// Bad: Poll every minute (60 requests/hour)
for {
    prs, _ := client.GetPullRequests(workspace, repo)
    checkForChanges(prs)
    time.Sleep(1 * time.Minute)
}
```

**Best Practice (Webhooks):**

```go
// Good: 1 webhook setup request, then event-driven
client.CreateWebhook(workspace, repo, WebhookConfig{
    URL:    "https://yourapp.com/webhooks/bitbucket",
    Events: []string{"pullrequest:created", "pullrequest:updated"},
})

// Handle webhook events instead of polling
func HandleWebhook(w http.ResponseWriter, r *http.Request) {
    event := r.Header.Get("X-Event-Key")
    if event == "pullrequest:created" {
        // Process new PR
    }
}
```

### 3. Batch Operations

**Anti-Pattern:**

```python
# Bad: 100 API calls
for repo in repositories:
    pr_count = client.get_pull_request_count(workspace, repo)
```

**Best Practice:**

```python
# Good: 1 API call with pagination
repos = client.list_repositories(workspace, pagelen=100)
for repo in repos:
    pr_count = repo['open_pr_count']  # Included in response
```

### 4. Efficient Pagination

**Use cursor-based pagination:**

```go
func (c *BitbucketClient) FetchAllRepositories(workspace string) ([]Repository, error) {
    var repos []Repository
    nextURL := fmt.Sprintf("/repositories/%s?pagelen=100", workspace)

    for nextURL != "" {
        resp, err := c.makeRequest("GET", nextURL)
        if err != nil {
            return nil, err
        }

        var page struct {
            Values []Repository `json:"values"`
            Next   string       `json:"next"`
        }
        json.NewDecoder(resp.Body).Decode(&page)

        repos = append(repos, page.Values...)
        nextURL = page.Next // Empty when no more pages
    }

    return repos, nil
}
```

### 5. Circuit Breaker Pattern

Prevent cascading failures when rate limits are consistently hit:

```go
type CircuitBreaker struct {
    threshold    int
    timeout      time.Duration
    failures     int
    lastAttempt  time.Time
    state        string // "closed", "open", "half-open"
}

func (cb *CircuitBreaker) Call(fn func() error) error {
    if cb.state == "open" {
        if time.Since(cb.lastAttempt) > cb.timeout {
            cb.state = "half-open"
        } else {
            return fmt.Errorf("circuit breaker open")
        }
    }

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

## Monitoring & Alerting

### Metrics to Track

1. **Request Volume**
   - Requests per minute/hour
   - Breakdown by endpoint category
   - Peak usage times

2. **Rate Limit Proximity**
   - Percentage of limit consumed
   - Time until limit reset
   - `X-RateLimit-NearLimit` frequency

3. **429 Error Rate**
   - Frequency of rate limit errors
   - Duration of rate limit periods
   - Correlation with deployment/traffic spikes

4. **Cache Hit Rate**
   - Percentage of requests served from cache
   - Cache miss reasons
   - TTL effectiveness

### Alert Thresholds

| Metric            | Warning         | Critical        |
| ----------------- | --------------- | --------------- |
| Limit consumption | >70%            | >85%            |
| 429 error rate    | >1% of requests | >5% of requests |
| Cache hit rate    | <60%            | <40%            |
| Request latency   | >2s (p95)       | >5s (p95)       |

---

## Best Practices Summary

1. ✅ **Always authenticate** - 1,000-10,000 req/hr vs 60 req/hr anonymous
2. ✅ **Monitor `X-RateLimit-NearLimit`** - Proactive backoff at 80% capacity
3. ✅ **Implement exponential backoff** - Handle 429 errors gracefully
4. ✅ **Cache aggressively** - 5-minute TTL for metadata
5. ✅ **Use webhooks, not polling** - Event-driven > 60 req/hr polling
6. ✅ **Batch operations** - Combine related API calls
7. ✅ **Circuit breaker** - Prevent cascading failures
8. ✅ **Log all rate limit events** - Track consumption patterns

---

## Related Documentation

- [API request limits | Bitbucket Cloud](https://support.atlassian.com/bitbucket-cloud/docs/api-request-limits/)
- [Bitbucket Cloud Rate Limit Troubleshooting](https://support.atlassian.com/bitbucket-cloud/kb/bitbucket-cloud-rate-limit-troubleshooting/)
