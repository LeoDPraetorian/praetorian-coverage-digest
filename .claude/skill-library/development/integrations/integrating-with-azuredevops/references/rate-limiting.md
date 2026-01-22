# Azure DevOps Rate Limiting

Complete guide to rate limiting in Azure DevOps REST API and strategies for staying within limits.

---

## Overview

Azure DevOps uses a **TSTU (Time-Shared Throughput Units)** model for rate limiting.

**Global Limit:** 200 TSTUs per 5-minute sliding window per user/pipeline

---

## Rate Limit Headers

Azure DevOps returns rate limit information in response headers:

| Header                  | Description                             | Example      |
| ----------------------- | --------------------------------------- | ------------ |
| `X-RateLimit-Limit`     | Total TSTU quota                        | `200`        |
| `X-RateLimit-Remaining` | TSTUs remaining in current window       | `150`        |
| `X-RateLimit-Reset`     | Unix timestamp when quota resets        | `1704585600` |
| `Retry-After`           | Seconds to wait before retry (429 only) | `60`         |

---

## Monitoring Strategy

### Proactive Throttling

**Recommended:** Throttle before hitting 429 errors.

```go
func (c *Client) monitorRateLimit(resp *http.Response) {
    remaining := resp.Header.Get("X-RateLimit-Remaining")
    limit := resp.Header.Get("X-RateLimit-Limit")

    if remaining == "" {
        return // No rate limit headers
    }

    remainingInt, _ := strconv.Atoi(remaining)
    limitInt, _ := strconv.Atoi(limit)

    // Throttle when < 10% remaining
    if float64(remainingInt) < float64(limitInt)*0.1 {
        resetTime := resp.Header.Get("X-RateLimit-Reset")
        resetUnix, _ := strconv.ParseInt(resetTime, 10, 64)
        waitTime := time.Unix(resetUnix, 0).Sub(time.Now())

        log.Printf("Rate limit low (%d/%d), waiting %v", remainingInt, limitInt, waitTime)
        time.Sleep(waitTime)
    }
}
```

---

## Retry Logic with Exponential Backoff

### Algorithm

```
delay = min(base^attempt * (1 + jitter), maxDelay)

base = 2
jitter = random(0.2, 0.3)  # 200-300ms
maxDelay = 30-60 seconds
maxRetries = 5
```

### Go Implementation

```go
func (c *Client) RequestWithRetry(ctx context.Context, method, url string, body io.Reader) (*http.Response, error) {
    maxRetries := 5
    baseDelay := 1 * time.Second
    maxDelay := 60 * time.Second

    for attempt := 0; attempt <= maxRetries; attempt++ {
        resp, err := c.Do(ctx, method, url, body)

        if err != nil {
            return nil, err
        }

        // Success
        if resp.StatusCode >= 200 && resp.StatusCode < 300 {
            c.monitorRateLimit(resp)
            return resp, nil
        }

        // Rate limited
        if resp.StatusCode == 429 {
            retryAfter := resp.Header.Get("Retry-After")
            if retryAfter != "" {
                // Honor Retry-After header
                seconds, _ := strconv.Atoi(retryAfter)
                time.Sleep(time.Duration(seconds) * time.Second)
            } else {
                // Exponential backoff with jitter
                delay := time.Duration(math.Pow(2, float64(attempt))) * baseDelay
                jitter := time.Duration(rand.Float64()*0.3+0.2) * time.Second
                delay = delay + jitter

                if delay > maxDelay {
                    delay = maxDelay
                }

                log.Printf("Rate limited (429), retrying in %v (attempt %d/%d)", delay, attempt+1, maxRetries)
                time.Sleep(delay)
            }
            continue
        }

        // Other server errors (500, 502, 503, 504)
        if resp.StatusCode >= 500 {
            delay := time.Duration(math.Pow(2, float64(attempt))) * baseDelay
            if delay > maxDelay {
                delay = maxDelay
            }
            log.Printf("Server error (%d), retrying in %v", resp.StatusCode, delay)
            time.Sleep(delay)
            continue
        }

        // Client errors (400, 401, 403, 404) - do NOT retry
        return resp, fmt.Errorf("client error: %d", resp.StatusCode)
    }

    return nil, fmt.Errorf("max retries exceeded")
}
```

---

## Optimization Strategies

### 1. Batch Operations

**Problem:** Fetching 100 work items individually = 100 API calls

**Solution:** Batch endpoint supports up to 200 work items per request

```go
// ❌ BAD: 100 API calls
for _, id := range workItemIDs {
    workItem, err := client.GetWorkItem(ctx, id)
    // Process work item
}

// ✅ GOOD: 1 API call
workItems, err := client.GetWorkItems(ctx, workItemIDs, nil)
```

### 2. Pagination with Continuation Tokens

**Problem:** Fetching all repositories in large organization

**Solution:** Use continuation tokens to paginate efficiently

```go
continuationToken := ""
allRepos := []git.GitRepository{}

for {
    args := git.GetRepositoriesArgs{
        ContinuationToken: &continuationToken,
    }

    repos, err := gitClient.GetRepositories(ctx, args)
    if err != nil {
        return nil, err
    }

    allRepos = append(allRepos, repos...)

    // Check response headers for continuation token
    if repos.ContinuationToken == "" {
        break
    }

    continuationToken = repos.ContinuationToken
}
```

### 3. Caching

**Problem:** Repeated requests for static/slowly-changing data

**Solution:** Cache repository metadata, project info

```go
type CachedClient struct {
    client *azuredevops.Connection
    cache  *cache.Cache
}

func (c *CachedClient) GetProject(ctx context.Context, projectID string) (*core.TeamProject, error) {
    // Check cache first
    if cached, found := c.cache.Get(projectID); found {
        return cached.(*core.TeamProject), nil
    }

    // Fetch from API
    project, err := c.client.GetProject(ctx, projectID)
    if err != nil {
        return nil, err
    }

    // Cache for 5 minutes
    c.cache.Set(projectID, project, 5*time.Minute)

    return project, nil
}
```

### 4. Avoid Single Operations in Loops

**Problem:** Anti-pattern that causes rate limiting

```go
// ❌ BAD: N API calls in loop
for _, commit := range commits {
    changes, err := gitClient.GetChanges(ctx, commit.ID)
    // Process changes
}
```

**Solution:** Use batch endpoints or aggregate operations

```go
// ✅ GOOD: Single API call for commit range
changes, err := gitClient.GetChanges(ctx, git.GetChangesArgs{
    From: startCommit,
    To:   endCommit,
})
```

---

## TSTU Consumption Patterns

Different API operations consume different amounts of TSTUs. While Microsoft doesn't publish exact costs, community observations suggest:

| Operation Type               | Estimated TSTU Cost | Example                    |
| ---------------------------- | ------------------- | -------------------------- |
| Simple GET (single resource) | 1                   | Get single work item       |
| List GET (paginated)         | 2-3                 | List repositories          |
| Batch GET                    | 3-5                 | Get 200 work items         |
| POST/PATCH (create/update)   | 3-5                 | Create work item           |
| Complex queries (WIQL)       | 5-10                | Work item query with joins |
| Build logs                   | 10-20               | Download large build logs  |

**Formula (approximate):**

- Simple operations: ~1-2 TSTUs
- Complex operations: ~5-10 TSTUs
- Data-heavy operations: ~10-20 TSTUs

**200 TSTU limit supports:**

- ~100-200 simple operations per 5 minutes
- ~20-40 complex operations per 5 minutes
- ~10-20 data-heavy operations per 5 minutes

---

## Circuit Breaker Pattern

For high-throughput scenarios, implement circuit breaker to prevent cascading failures:

```go
type CircuitBreaker struct {
    failures    int
    lastFailure time.Time
    state       string // "closed", "open", "half-open"
}

func (cb *CircuitBreaker) Call(fn func() error) error {
    if cb.state == "open" {
        if time.Since(cb.lastFailure) > 60*time.Second {
            cb.state = "half-open"
        } else {
            return fmt.Errorf("circuit breaker open")
        }
    }

    err := fn()

    if err != nil {
        cb.failures++
        cb.lastFailure = time.Now()

        if cb.failures >= 5 {
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

## Related Resources

- [Rate and Usage Limits](https://learn.microsoft.com/en-us/azure/devops/integrate/concepts/rate-limits)
- [Integration Best Practices](https://learn.microsoft.com/en-us/azure/devops/integrate/concepts/integration-bestpractices)
