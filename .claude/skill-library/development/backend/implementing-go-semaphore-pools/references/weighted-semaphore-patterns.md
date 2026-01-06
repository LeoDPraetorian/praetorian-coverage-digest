# Weighted Semaphore Patterns

Production patterns for bounded concurrency using weighted semaphores, extracted from security scanners with 252K combined GitHub stars.

---

## When to Use Weighted Semaphores

Use weighted semaphores when tasks have different resource costs:

- **Variable memory consumption:** Small items (1KB) vs large items (100MB)
- **Variable processing time:** Quick checks (10ms) vs deep scans (10s)
- **Variable network usage:** Single request vs batch operations
- **Resource pooling:** Database connections, file descriptors, API quotas

**Source:** [golang.org/x/sync/semaphore](https://pkg.go.dev/golang.org/x/sync/semaphore)

---

## Basic Semaphore Pattern

**Pattern:** Limit concurrent operations to prevent resource exhaustion.

```go
import "golang.org/x/sync/semaphore"

func ScanTargets(ctx context.Context, targets []Target, maxConcurrent int64) error {
    sem := semaphore.NewWeighted(maxConcurrent)

    for _, target := range targets {
        // Acquire permit before starting work
        if err := sem.Acquire(ctx, 1); err != nil {
            return fmt.Errorf("failed to acquire semaphore: %w", err)
        }

        go func(t Target) {
            defer sem.Release(1)  // Always release in defer
            scanTarget(t)
        }(target)
    }

    // Wait for all workers to finish
    if err := sem.Acquire(ctx, maxConcurrent); err != nil {
        return err
    }

    return nil
}
```

**Key Points:**

- ✅ Always use `defer sem.Release()` to prevent leaks
- ✅ Check `Acquire()` error (context cancellation)
- ✅ Use final `Acquire(ctx, maxConcurrent)` to wait for completion

---

## Trivy Semaphore Wrapper

**Pattern:** Wrap `golang.org/x/sync/semaphore` for consistent defaults.

**Source:** [Trivy pkg/semaphore/semaphore.go](https://github.com/aquasecurity/trivy) (30K ⭐)

```go
package semaphore

import "golang.org/x/sync/semaphore"

type Weighted = semaphore.Weighted

const defaultSize = 5  // Conservative default for stability

func New(parallel int) *Weighted {
    if parallel == 0 {
        parallel = defaultSize  // Default to 5 workers
    }
    return semaphore.NewWeighted(int64(parallel))
}
```

**Usage:**

```go
import "github.com/aquasecurity/trivy/pkg/semaphore"

// Uses default (5 workers)
sem := semaphore.New(0)

// Uses custom value
sem := semaphore.New(20)
```

**Benefits:**

- ✅ Consistent default across codebase
- ✅ Prevents accidentally unbounded concurrency (parallel=0)
- ✅ Single place to tune default performance

---

## Combining errgroup + Semaphore

**Pattern:** Bounded concurrency with automatic error propagation.

**Source:** [Encore.dev - Advanced Go Concurrency](https://encore.dev/blog/advanced-go-concurrency)

```go
import (
    "golang.org/x/sync/errgroup"
    "golang.org/x/sync/semaphore"
)

func ScanRepositories(ctx context.Context, repos []string, maxConcurrent int) error {
    sem := semaphore.NewWeighted(int64(maxConcurrent))
    g, ctx := errgroup.WithContext(ctx)

    for _, repo := range repos {
        repo := repo  // Capture loop variable

        // Acquire before spawning goroutine
        if err := sem.Acquire(ctx, 1); err != nil {
            return err
        }

        g.Go(func() error {
            defer sem.Release(1)
            return scanRepo(ctx, repo)
        })
    }

    return g.Wait()  // Automatic error collection and context cancellation
}
```

**Benefits:**

- ✅ First error cancels all workers (via context)
- ✅ No manual WaitGroup management
- ✅ Cleaner than manual error collection

---

## Weighted Semaphore for Variable-Cost Tasks

**Pattern:** Different tasks acquire different weights based on resource usage.

**Source:** [golang.org/x/sync/semaphore documentation](https://pkg.go.dev/golang.org/x/sync/semaphore)

```go
func ProcessAssets(ctx context.Context, assets []Asset) error {
    const totalResourceUnits = 1000
    sem := semaphore.NewWeighted(totalResourceUnits)

    for _, asset := range assets {
        weight := calculateWeight(asset)  // Returns 1-100 based on asset size

        if err := sem.Acquire(ctx, weight); err != nil {
            return err
        }

        go func(a Asset, w int64) {
            defer sem.Release(w)
            processAsset(a)
        }(asset, weight)
    }

    // Wait for all to complete
    sem.Acquire(ctx, totalResourceUnits)
    return nil
}

func calculateWeight(asset Asset) int64 {
    // Example: Weight based on asset size
    switch {
    case asset.Size < 1*MB:
        return 1    // Small assets: 1 unit
    case asset.Size < 10*MB:
        return 10   // Medium assets: 10 units
    case asset.Size < 100*MB:
        return 50   // Large assets: 50 units
    default:
        return 100  // Huge assets: 100 units
    }
}
```

**Use Cases:**

- **Memory-bound:** Weight = estimated memory usage in MB
- **CPU-bound:** Weight = estimated CPU seconds
- **Network-bound:** Weight = number of API calls

---

## Rate Limiting with Semaphore + Rate Limiter

**Pattern:** Combine semaphore (concurrency limit) + rate limiter (throughput limit).

**Source:** [Nuclei Rate Limiting](https://github.com/projectdiscovery/nuclei) (26K ⭐)

```go
import (
    "golang.org/x/time/rate"
    "golang.org/x/sync/semaphore"
)

type RateLimiter struct {
    limiter *rate.Limiter      // Token bucket for rate limiting
    sem     *semaphore.Weighted // Bounded concurrency
}

// Rate limit at 150 req/sec with burst of 10, max 25 concurrent
func NewRateLimiter(rps int, maxConcurrent int64) *RateLimiter {
    return &RateLimiter{
        limiter: rate.NewLimiter(rate.Limit(rps), 10),
        sem:     semaphore.NewWeighted(maxConcurrent),
    }
}

func (r *RateLimiter) Execute(ctx context.Context, target string) error {
    // Rate limit first (throughput control)
    if err := r.limiter.Wait(ctx); err != nil {
        return err
    }

    // Then acquire concurrency slot (resource control)
    if err := r.sem.Acquire(ctx, 1); err != nil {
        return err
    }
    defer r.sem.Release(1)

    return executeTemplate(ctx, target)
}
```

**Why Two Layers:**

| Control          | Purpose                    | Prevents                                   |
| ---------------- | -------------------------- | ------------------------------------------ |
| **Rate Limiter** | Throughput (requests/sec)  | API throttling (429 errors)                |
| **Semaphore**    | Concurrency (simultaneous) | Resource exhaustion (OOM, connection pool) |

**Example:** Nuclei default: 150 req/sec rate limit + 25 concurrent templates.

---

## Default Worker Counts

**From Production Scanners:**

| Project        | Default                           | Resource Type | Tuning Strategy                |
| -------------- | --------------------------------- | ------------- | ------------------------------ |
| **Trivy**      | 5 workers                         | Conservative  | Single `--parallel` flag       |
| **Nuclei**     | 25 templates<br>25 hosts/template | Aggressive    | `--concurrency`, `--bulk-size` |
| **TruffleHog** | 20 (runtime.NumCPU())             | Balanced      | Stage-specific multipliers     |

**Recommendations:**

- **CPU-bound work:** Match CPU core count (`runtime.NumCPU()`)
- **I/O-bound work:** 4-10x CPU count
- **Network-bound work:** 10-50x CPU count (depending on latency)
- **Conservative default:** 5-10 workers (good starting point)

**Source:** [Production Go Streaming Scanners Research](https://github.com/aquasecurity/trivy), lines 432-443

---

## Common Mistakes

### Mistake 1: Forgetting to Release

```go
// ❌ BAD: Missing defer - leaks on error
if err := sem.Acquire(ctx, 1); err != nil {
    return err
}
result, err := processItem(item)
if err != nil {
    return err  // LEAK: Never calls Release()
}
sem.Release(1)
```

```go
// ✅ GOOD: defer ensures release even on error
if err := sem.Acquire(ctx, 1); err != nil {
    return err
}
defer sem.Release(1)  // Always releases

result, err := processItem(item)
if err != nil {
    return err  // Release called via defer
}
```

### Mistake 2: Acquiring Inside Goroutine

```go
// ❌ BAD: Acquire inside goroutine = unbounded goroutines
for _, item := range items {
    go func(i Item) {
        sem.Acquire(ctx, 1)  // Spawns ALL goroutines first!
        defer sem.Release(1)
        process(i)
    }(item)
}
```

```go
// ✅ GOOD: Acquire before goroutine = bounded goroutines
for _, item := range items {
    sem.Acquire(ctx, 1)  // Blocks here when limit reached
    go func(i Item) {
        defer sem.Release(1)
        process(i)
    }(item)
}
```

### Mistake 3: Wrong Weight on Release

```go
// ❌ BAD: Acquire 10, release 1 = semaphore leak
sem.Acquire(ctx, 10)
defer sem.Release(1)  // WRONG: Should be Release(10)
```

```go
// ✅ GOOD: Symmetric acquire and release
weight := int64(10)
sem.Acquire(ctx, weight)
defer sem.Release(weight)  // Correct weight
```

---

## Performance Characteristics

**Semaphore vs Channel-Based Pool:**

| Aspect           | Semaphore              | Channel-Based Pool        |
| ---------------- | ---------------------- | ------------------------- |
| **Overhead**     | Very low (~50ns)       | Low (~200ns per send)     |
| **Memory**       | Minimal (single int64) | Higher (buffered channel) |
| **Flexibility**  | Dynamic weights        | Fixed slot size           |
| **Backpressure** | Blocks on Acquire()    | Blocks on send            |

**Benchmark (from research):**

- Semaphore acquire/release: ~50ns
- Buffered channel send/receive: ~200ns
- Interface dispatch: ~200ns (relevant for visitor patterns)

**Source:** Interface Performance Questions - golang-nuts mailing list

**Recommendation:** Use semaphores for fine-grained control; use channels for pipeline patterns.

---

## Sources

- [Trivy pkg/semaphore/semaphore.go](https://github.com/aquasecurity/trivy/blob/main/pkg/semaphore/semaphore.go) - Semaphore Wrapper (30K ⭐)
- [golang.org/x/sync/semaphore](https://pkg.go.dev/golang.org/x/sync/semaphore) - Official Package Documentation
- [Nuclei Rate Limiting Implementation](https://github.com/projectdiscovery/nuclei) - Dual-layer control (26K ⭐)
- [Encore.dev - Advanced Go Concurrency](https://encore.dev/blog/advanced-go-concurrency) - Modern patterns
- [Production Go Streaming Scanners Research](https://github.com/aquasecurity/trivy) - Default worker counts
