# Rate Limiting Patterns

Proactive rate limiting strategies and backoff algorithms for GraphQL APIs.

## GitHub GraphQL Rate Limits

### Point-Based System

Each query assigned cost based on:

- Query depth (nested fields)
- Number of nodes requested
- Field count per node
- Maximum 500,000 total nodes per query

### Limits

| Type           | Limit               | Notes                                |
| -------------- | ------------------- | ------------------------------------ |
| **Primary**    | 5,000 points/hour   | 10,000 for Enterprise Cloud          |
| **Secondary**  | 2,000 points/minute | GraphQL specific                     |
| **REST**       | 900 points/minute   | Shared concurrency budget            |
| **Concurrent** | 100 requests max    | Shared between GraphQL and REST APIs |

## Proactive Throttling Pattern

### Basic Implementation

```go
type RateLimiter struct {
    mu           sync.Mutex
    remaining    int
    resetAt      time.Time
    minRemaining int // Throttle threshold (e.g., 250 = 5%)
}

func (r *RateLimiter) CheckAndWait(ctx context.Context, queryCost int) error {
    r.mu.Lock()
    defer r.mu.Unlock()

    // Update from response headers
    r.remaining -= queryCost

    // Proactive throttle at 5% remaining (250/5000)
    if r.remaining < r.minRemaining {
        waitDuration := time.Until(r.resetAt)
        log.Printf("Rate limit low (%d/%d), waiting %v",
            r.remaining, 5000, waitDuration)

        select {
        case <-time.After(waitDuration):
            r.remaining = 5000 // Reset after wait
        case <-ctx.Done():
            return ctx.Err()
        }
    }

    return nil
}

func (r *RateLimiter) UpdateFromHeaders(headers http.Header) {
    r.mu.Lock()
    defer r.mu.Unlock()

    if remaining := headers.Get("X-RateLimit-Remaining"); remaining != "" {
        r.remaining, _ = strconv.Atoi(remaining)
    }

    if reset := headers.Get("X-RateLimit-Reset"); reset != "" {
        timestamp, _ := strconv.ParseInt(reset, 10, 64)
        r.resetAt = time.Unix(timestamp, 0)
    }
}
```

### Monitoring via GraphQL Query

**Always include `rateLimit` field in production queries:**

```graphql
query {
  repository(owner: "owner", name: "repo") {
    issues(first: 100) {
      nodes {
        id
        title
      }
    }
  }
  rateLimit {
    cost # This query's cost
    remaining # Points left
    resetAt # Limit reset time
  }
}
```

```go
type Query struct {
    Repository struct {
        Issues struct {
            Nodes []Issue
        } `graphql:"issues(first: 100)"`
    } `graphql:"repository(owner: $owner, name: $name)"`

    RateLimit struct {
        Cost      githubv4.Int
        Remaining githubv4.Int
        ResetAt   githubv4.DateTime
    }
}

// Update rate limiter from query response
if query.RateLimit.Remaining < 250 {
    waitUntil := query.RateLimit.ResetAt.Time
    time.Sleep(time.Until(waitUntil))
}
```

## Exponential Backoff

### Retry Logic with Jitter

```go
func retryWithBackoff(ctx context.Context, operation func() error) error {
    maxRetries := 5
    baseDelay := time.Second

    for attempt := 0; attempt < maxRetries; attempt++ {
        err := operation()
        if err == nil {
            return nil
        }

        // Check if retryable error
        if !isRetryable(err) {
            return err
        }

        // Calculate backoff with jitter
        backoff := time.Duration(math.Pow(2, float64(attempt))) * baseDelay
        jitter := time.Duration(rand.Int63n(int64(backoff / 4)))
        delay := backoff + jitter

        log.Printf("Attempt %d failed, retrying in %v: %v",
            attempt+1, delay, err)

        select {
        case <-time.After(delay):
            // Retry
        case <-ctx.Done():
            return ctx.Err()
        }
    }

    return fmt.Errorf("max retries exceeded")
}

func isRetryable(err error) bool {
    // Check for rate limit or transient errors
    if strings.Contains(err.Error(), "rate limit") ||
       strings.Contains(err.Error(), "429") ||
       strings.Contains(err.Error(), "502") ||
       strings.Contains(err.Error(), "503") {
        return true
    }
    return false
}
```

## Multi-Tenant Rate Limiting

### Token-Based Separation

```go
type MultiTenantLimiter struct {
    limiters map[string]*RateLimiter
    mu       sync.RWMutex
}

func (m *MultiTenantLimiter) GetLimiter(token string) *RateLimiter {
    m.mu.RLock()
    limiter, exists := m.limiters[token]
    m.mu.RUnlock()

    if exists {
        return limiter
    }

    m.mu.Lock()
    defer m.mu.Unlock()

    // Double-check after acquiring write lock
    if limiter, exists := m.limiters[token]; exists {
        return limiter
    }

    // Create new limiter for token
    limiter = &RateLimiter{
        remaining:    5000,
        minRemaining: 250,
    }
    m.limiters[token] = limiter
    return limiter
}

func (m *MultiTenantLimiter) CheckAndWait(ctx context.Context, token string, cost int) error {
    limiter := m.GetLimiter(token)
    return limiter.CheckAndWait(ctx, cost)
}
```

## Query Cost Estimation

### Formula

```
Cost = NodeDepth × PaginationSize × Multipliers
```

### Examples

```go
// Cost = 1 (single node, no pagination)
query { viewer { login } }

// Cost = 100 (100 repos, 1 level deep)
query { repositories(first: 100) { nodes { name } } }

// Cost = 10,000 (100 repos × 100 issues = 10,000 nodes)
query {
  repositories(first: 100) {
    nodes {
      issues(first: 100) { nodes { title } }
    }
  }
}
```

**Note:** GitHub's exact formula is not documented. Use `rateLimit { cost }` field to observe actual costs.

## Best Practices

1. **Proactive Throttling**: Wait when approaching limit (5% remaining = 250 points)
2. **Include rateLimit Field**: Monitor costs in real-time
3. **Exponential Backoff**: Retry transient errors with increasing delays
4. **Add Jitter**: Randomize backoff to avoid thundering herd
5. **Context Propagation**: Support cancellation via `context.Context`
6. **Structured Logging**: Log rate limit events with metadata
7. **Per-Token Limiting**: Track limits separately for multi-tenant systems

## Threshold Recommendations

| Threshold | Action             | Use Case                        |
| --------- | ------------------ | ------------------------------- |
| 10% (500) | Warning log        | Monitor approaching limit       |
| 5% (250)  | Proactive throttle | Production safety (recommended) |
| 1% (50)   | Emergency brake    | Critical operations only        |

## References

- [GitHub GraphQL Rate Limits](https://docs.github.com/en/graphql/overview/rate-limits-and-node-limits-for-the-graphql-api)
- [Exponential Backoff And Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
