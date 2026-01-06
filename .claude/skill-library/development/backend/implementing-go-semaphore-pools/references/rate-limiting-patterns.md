# Rate Limiting Patterns with Semaphores and Token Buckets

## Overview

Rate limiting prevents overwhelming downstream services (APIs, databases, network endpoints) by controlling request frequency. Production Go scanners combine **semaphore-based concurrency limiting** with **token bucket rate limiting** for comprehensive traffic control.

---

## Pattern 1: Nuclei Rate Limiting Architecture

### Source

**Repository:** [projectdiscovery/nuclei](https://github.com/projectdiscovery/nuclei) (26K+ stars)
**Implementation:** Multi-level rate limiting with golang.org/x/time/rate

### Default Configuration

```bash
nuclei -rl 150    # Rate limit: 150 requests/second (default)
```

**Key Parameters:**

- **Rate limit (-rl)**: Maximum requests per second (default: 150)
- **Bulk size**: 25 hosts per template (default)
- **Template concurrency**: 25 templates in parallel (default)
- **HTTP probes**: 50 concurrent probes

### Multi-Level Concurrency Bounds

| Level                | Default Limit | Purpose                         |
| -------------------- | ------------- | ------------------------------- |
| Template concurrency | 25            | Templates executing in parallel |
| Bulk size            | 25            | Hosts per template batch        |
| Rate limit           | 150/sec       | Outbound HTTP request rate      |
| Headless             | 10            | Parallel browser instances      |
| JavaScript           | 120           | Concurrent JS runtimes          |
| Payload concurrency  | 25            | Payloads per template           |
| HTTP probes          | 50            | Concurrent connection probes    |
| Template loading     | 50            | Concurrent template operations  |

### Stream Processing Mode

```bash
nuclei -stream   # Start processing without buffering all input
```

**Benefits:**

- No upfront target buffering
- Immediate scan start
- Memory-efficient for large target lists

---

## Pattern 2: Token Bucket Rate Limiter

### Implementation with golang.org/x/time/rate

```go
import "golang.org/x/time/rate"

// RateLimiter wraps rate.Limiter for request throttling
type RateLimiter struct {
    limiter *rate.Limiter
}

// NewRateLimiter creates limiter with requests/sec and burst capacity
func NewRateLimiter(rps int, burst int) *RateLimiter {
    return &RateLimiter{
        limiter: rate.NewLimiter(rate.Limit(rps), burst),
    }
}

// Wait blocks until a token is available
func (rl *RateLimiter) Wait(ctx context.Context) error {
    return rl.limiter.Wait(ctx)
}

// Example: Scanner with rate limiting
func ScanWithRateLimit(ctx context.Context, targets []string, rps int) error {
    limiter := NewRateLimiter(rps, rps*2)  // Burst = 2x rate

    for _, target := range targets {
        // Block until token available
        if err := limiter.Wait(ctx); err != nil {
            return err
        }

        // Perform rate-limited operation
        if err := scanTarget(ctx, target); err != nil {
            return err
        }
    }
    return nil
}
```

### Token Bucket Concepts

**Parameters:**

- **Rate (r)**: Tokens added per second (e.g., 150/sec)
- **Burst (b)**: Maximum token capacity (allows brief bursts above rate)

**Behavior:**

```
Tokens = min(current_tokens + (elapsed_time * rate), burst)
```

**Example:**

- Rate: 150/sec
- Burst: 300 tokens
- Initially: 300 tokens available (full bucket)
- After 100 requests: 200 tokens remain
- After 1 second idle: 200 + 150 = 350 → clamped to 300 (burst limit)

**Use cases:**

- ✅ Smooth traffic to APIs (prevent 429 rate limit errors)
- ✅ Respect service quotas (GitHub: 5,000/hour, AWS: varies)
- ✅ Prevent network congestion

---

## Pattern 3: Combining Rate Limiter + Semaphore

### Why Both Are Needed

**Semaphore:** Limits **concurrent in-flight requests**
**Rate Limiter:** Limits **request frequency over time**

**Example scenario:**

- Semaphore: 10 concurrent requests maximum
- Rate limiter: 150 requests/second maximum
- Result: Bursts of 10 concurrent requests, but sustained rate capped at 150/sec

### Implementation

```go
import (
    "context"
    "golang.org/x/sync/errgroup"
    "golang.org/x/sync/semaphore"
    "golang.org/x/time/rate"
)

type Scanner struct {
    concurrency int64
    rateLimit   int
    sem         *semaphore.Weighted
    limiter     *rate.Limiter
}

func NewScanner(concurrency int, rateLimit int) *Scanner {
    return &Scanner{
        concurrency: int64(concurrency),
        rateLimit:   rateLimit,
        sem:         semaphore.NewWeighted(int64(concurrency)),
        limiter:     rate.NewLimiter(rate.Limit(rateLimit), rateLimit*2),
    }
}

func (s *Scanner) Scan(ctx context.Context, targets []string) error {
    g, ctx := errgroup.WithContext(ctx)

    for _, target := range targets {
        target := target  // Capture for closure

        // Acquire semaphore slot (blocks if at concurrency limit)
        if err := s.sem.Acquire(ctx, 1); err != nil {
            return err
        }

        g.Go(func() error {
            defer s.sem.Release(1)

            // Wait for rate limiter token (blocks if exceeding rate)
            if err := s.limiter.Wait(ctx); err != nil {
                return err
            }

            // Perform scan
            return scanTarget(ctx, target)
        })
    }

    return g.Wait()
}
```

### Execution Flow

```
1. Semaphore.Acquire() → Wait if 10 requests in-flight
2. Rate.Wait() → Wait if exceeding 150/sec
3. Execute request
4. Semaphore.Release() → Free slot for next request
```

**Benefits:**

- Prevents overwhelming target (concurrency limit)
- Respects API quotas (rate limit)
- Graceful degradation under load

---

## Pattern 4: Per-API-Token Rate Limiting

### Multi-PAT Rate Limiting (GitHub Example)

```go
type MultiTokenRateLimiter struct {
    limiters []*rate.Limiter
    idx      uint64  // Atomic counter for round-robin
}

func NewMultiTokenRateLimiter(tokens []string, rpsPerToken int) *MultiTokenRateLimiter {
    limiters := make([]*rate.Limiter, len(tokens))
    for i := range tokens {
        limiters[i] = rate.NewLimiter(rate.Limit(rpsPerToken), rpsPerToken*2)
    }
    return &MultiTokenRateLimiter{limiters: limiters}
}

func (m *MultiTokenRateLimiter) Wait(ctx context.Context) error {
    // Round-robin across tokens
    idx := atomic.AddUint64(&m.idx, 1) % uint64(len(m.limiters))
    return m.limiters[idx].Wait(ctx)
}
```

**GitHub API limits:**

- REST API: 5,000 requests/hour per token
- GraphQL: 5,000 points/hour per token
- With 6 tokens: Effective 30,000 requests/hour

**Application:**

```go
scanner := NewScanner(10, 100)  // 10 workers, 100 rps
limiter := NewMultiTokenRateLimiter(tokens, 100/len(tokens))  // Distribute rate
```

---

## Pattern 5: Adaptive Rate Limiting

### Dynamic Rate Adjustment Based on 429 Responses

```go
type AdaptiveRateLimiter struct {
    limiter *rate.Limiter
    mu      sync.Mutex
}

func (a *AdaptiveRateLimiter) AdjustRate(statusCode int) {
    a.mu.Lock()
    defer a.mu.Unlock()

    if statusCode == 429 {  // Too Many Requests
        // Reduce rate by 50%
        currentRate := a.limiter.Limit()
        a.limiter.SetLimit(currentRate / 2)
    } else if statusCode == 200 {
        // Gradually increase rate (additive increase)
        currentRate := a.limiter.Limit()
        a.limiter.SetLimit(currentRate + 1)
    }
}
```

**TCP-like congestion control:**

- **Multiplicative decrease:** Halve rate on error (429, timeout)
- **Additive increase:** Slowly ramp up on success
- **Prevents oscillation:** Conservative recovery

---

## Pattern 6: API Client with Built-in Rate Limiting

### Google go-github Pattern

**Source:** [google/go-github](https://github.com/google/go-github) (11K+ stars)

```go
import "github.com/google/go-github/v57/github"

// Client handles rate limiting automatically
client := github.NewClient(nil)

// Rate limits exposed in response
resp, err := client.Users.Get(ctx, "username")
if resp.Rate.Remaining < 100 {
    // Approaching limit, back off
    time.Sleep(time.Until(resp.Rate.Reset.Time))
}
```

**Features:**

- Automatic detection of rate limit headers
- Built-in retry with exponential backoff
- Secondary rate limit handling

---

## Anti-Patterns to Avoid

### 1. No Rate Limiting (Unbounded Requests)

**Problem:**

```go
// ❌ BAD: No rate control
for _, target := range targets {
    go scanTarget(target)  // Fires as fast as possible
}
```

**Impact:**

- API returns 429 errors
- IP banned/throttled
- Service degradation for other users

### 2. Rate Limiting Without Semaphore

**Problem:**

```go
// ❌ BAD: Rate limited but unbounded concurrency
limiter := rate.NewLimiter(150, 300)
for _, target := range targets {
    limiter.Wait(ctx)
    go scanTarget(target)  // Spawns unlimited goroutines
}
```

**Impact:**

- Memory exhaustion (millions of goroutines)
- Context switching overhead
- Resource leaks

### 3. Semaphore Without Rate Limiting

**Problem:**

```go
// ❌ BAD: Bounded concurrency but no rate control
sem := semaphore.NewWeighted(10)
for _, target := range targets {
    sem.Acquire(ctx, 1)
    go func() {
        defer sem.Release(1)
        scanTarget(target)  // No rate limiting
    }()
}
```

**Impact:**

- Hits API rate limits (429 errors)
- Wastes time retrying
- Suboptimal throughput

---

## Performance Characteristics

### Overhead Measurements

| Pattern           | Overhead per Request | Memory Overhead  | Latency Impact |
| ----------------- | -------------------- | ---------------- | -------------- |
| No limiting       | 0 ns                 | 0 bytes          | None           |
| Semaphore only    | ~200 ns              | 24 bytes/sem     | Blocking waits |
| Rate limiter only | ~100 ns              | 64 bytes/limiter | Token waits    |
| Combined          | ~300 ns              | 88 bytes         | Both waits     |

**Conclusion:** <1 microsecond overhead is negligible for network I/O (typically milliseconds).

---

## Sources

- [Nuclei GitHub Repository](https://github.com/projectdiscovery/nuclei)
- [golang.org/x/time/rate Documentation](https://pkg.go.dev/golang.org/x/time/rate)
- [google/go-github API Patterns](https://github.com/google/go-github)
- Production Go Streaming Scanner Architectures Research (2026-01-01)
