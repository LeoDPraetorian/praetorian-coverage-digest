# Rate Limiting Patterns

**Advanced rate limiting strategies to avoid detection and respect target infrastructure.**

## Why Rate Limiting Matters

1. **Avoid Detection**: Rapid requests trigger WAFs and rate limiters
2. **Respect Infrastructure**: Don't DOS the target
3. **Ethical Scanning**: Professional security testing practices
4. **Legal Compliance**: Stay within engagement scope

## Strategy Comparison

| Strategy         | Pros                         | Cons                     | Use Case                  |
| ---------------- | ---------------------------- | ------------------------ | ------------------------- |
| **Fixed Delay**  | Simple, predictable          | Inefficient, wastes time | Small sites, development  |
| **Token Bucket** | Handles bursts, efficient    | Complex implementation   | API rate limits           |
| **Per-Domain**   | Multi-target support         | Requires domain tracking | Large-scale scanning      |
| **Adaptive**     | Optimizes based on responses | Monitoring overhead      | Production, smart scaling |

---

## Fixed Delay Pattern

### Colly Implementation

```go
c.Limit(&colly.LimitRule{
    DomainGlob:  "*",
    Parallelism: 10,
    Delay:       100 * time.Millisecond,
    RandomDelay: 50 * time.Millisecond, // Add jitter
})
```

**Calculation**:

- Base delay: 100ms
- Random jitter: 0-50ms
- Effective range: 100-150ms per request
- Throughput: ~7-10 req/sec per domain

### Custom Implementation

```go
type FixedDelayLimiter struct {
    delay       time.Duration
    randomDelay time.Duration
    lastRequest time.Time
    mu          sync.Mutex
}

func (l *FixedDelayLimiter) Wait() {
    l.mu.Lock()
    defer l.mu.Unlock()

    elapsed := time.Since(l.lastRequest)
    required := l.delay + time.Duration(rand.Int63n(int64(l.randomDelay)))

    if elapsed < required {
        time.Sleep(required - elapsed)
    }

    l.lastRequest = time.Now()
}
```

---

## Token Bucket Pattern

### Standard Library Implementation

```go
import "golang.org/x/time/rate"

// Create limiter: 10 requests per second, burst of 20
limiter := rate.NewLimiter(rate.Limit(10), 20)

// Before each request
ctx := context.Background()
if err := limiter.Wait(ctx); err != nil {
    return err
}

// Make request
resp, err := http.Get(url)
```

### Per-Domain Token Bucket

```go
type DomainLimiter struct {
    limiters map[string]*rate.Limiter
    mu       sync.RWMutex
    rps      rate.Limit
    burst    int
}

func NewDomainLimiter(rps float64, burst int) *DomainLimiter {
    return &DomainLimiter{
        limiters: make(map[string]*rate.Limiter),
        rps:      rate.Limit(rps),
        burst:    burst,
    }
}

func (d *DomainLimiter) Wait(ctx context.Context, domain string) error {
    limiter := d.getLimiter(domain)
    return limiter.Wait(ctx)
}

func (d *DomainLimiter) getLimiter(domain string) *rate.Limiter {
    d.mu.RLock()
    limiter, exists := d.limiters[domain]
    d.mu.RUnlock()

    if !exists {
        d.mu.Lock()
        limiter = rate.NewLimiter(d.rps, d.burst)
        d.limiters[domain] = limiter
        d.mu.Unlock()
    }

    return limiter
}
```

---

## Adaptive Rate Limiting

### Response Time Based

```go
type AdaptiveLimiter struct {
    currentDelay  time.Duration
    minDelay      time.Duration
    maxDelay      time.Duration
    targetLatency time.Duration
    mu            sync.Mutex
}

func (l *AdaptiveLimiter) RecordResponse(latency time.Duration) {
    l.mu.Lock()
    defer l.mu.Unlock()

    // If responses are slow, back off
    if latency > l.targetLatency {
        l.currentDelay = min(l.currentDelay*2, l.maxDelay)
    } else {
        // If responses are fast, speed up
        l.currentDelay = max(l.currentDelay/2, l.minDelay)
    }
}

func (l *AdaptiveLimiter) Wait() {
    l.mu.Lock()
    delay := l.currentDelay
    l.mu.Unlock()

    time.Sleep(delay)
}
```

### Error Rate Based

```go
type ErrorBasedLimiter struct {
    errorWindow   []time.Time
    windowSize    time.Duration
    errorThreshold float64
    baseDelay     time.Duration
    mu            sync.Mutex
}

func (l *ErrorBasedLimiter) RecordError() {
    l.mu.Lock()
    defer l.mu.Unlock()

    now := time.Now()
    l.errorWindow = append(l.errorWindow, now)

    // Remove errors outside window
    cutoff := now.Add(-l.windowSize)
    for i, t := range l.errorWindow {
        if t.After(cutoff) {
            l.errorWindow = l.errorWindow[i:]
            break
        }
    }
}

func (l *ErrorBasedLimiter) GetDelay() time.Duration {
    l.mu.Lock()
    defer l.mu.Unlock()

    errorRate := float64(len(l.errorWindow)) / l.windowSize.Seconds()

    if errorRate > l.errorThreshold {
        // Exponential backoff
        return l.baseDelay * time.Duration(math.Pow(2, errorRate))
    }

    return l.baseDelay
}
```

---

## Per-Domain Management

### Domain Extraction

```go
func extractDomain(urlStr string) (string, error) {
    u, err := url.Parse(urlStr)
    if err != nil {
        return "", err
    }
    return u.Hostname(), nil
}
```

### Domain-Specific Rules

```go
type DomainRules struct {
    rules map[string]RateLimit
    mu    sync.RWMutex
}

type RateLimit struct {
    RequestsPerSecond float64
    Burst             int
    Delay             time.Duration
}

func (d *DomainRules) GetLimit(domain string) RateLimit {
    d.mu.RLock()
    defer d.mu.RUnlock()

    if limit, exists := d.rules[domain]; exists {
        return limit
    }

    // Default limit
    return RateLimit{
        RequestsPerSecond: 10,
        Burst:             20,
        Delay:             100 * time.Millisecond,
    }
}
```

---

## robots.txt Integration

### Respect Crawl-Delay

```go
import "github.com/temoto/robotstxt"

func getRobotsCrawlDelay(domain string) (time.Duration, error) {
    robotsURL := fmt.Sprintf("https://%s/robots.txt", domain)
    resp, err := http.Get(robotsURL)
    if err != nil {
        return 0, err
    }
    defer resp.Body.Close()

    robots, err := robotstxt.FromResponse(resp)
    if err != nil {
        return 0, err
    }

    // Get Crawl-delay for your user agent
    group := robots.FindGroup("SecurityScanner")
    if group.CrawlDelay > 0 {
        return time.Duration(group.CrawlDelay) * time.Second, nil
    }

    return 0, nil
}
```

### Combine with Rate Limiter

```go
func configureLimiter(domain string) (*rate.Limiter, error) {
    // Get robots.txt delay
    crawlDelay, err := getRobotsCrawlDelay(domain)
    if err != nil {
        crawlDelay = 100 * time.Millisecond // Default
    }

    // Convert to requests per second
    rps := 1.0 / crawlDelay.Seconds()

    return rate.NewLimiter(rate.Limit(rps), 1), nil
}
```

---

## Recommended Defaults

| Target Type           | Requests/Sec | Delay  | Burst   |
| --------------------- | ------------ | ------ | ------- |
| **Development**       | 100          | 10ms   | 200     |
| **Small Sites**       | 10           | 100ms  | 20      |
| **Production Sites**  | 5            | 200ms  | 10      |
| **Shared Hosting**    | 2            | 500ms  | 5       |
| **Rate-Limited APIs** | Per API docs | Varies | Per API |

## Jitter Calculation

```go
func addJitter(base time.Duration, maxJitter time.Duration) time.Duration {
    jitter := time.Duration(rand.Int63n(int64(maxJitter)))
    return base + jitter
}

// Example: 100ms base with ±25% jitter
delay := addJitter(100*time.Millisecond, 25*time.Millisecond)
```
