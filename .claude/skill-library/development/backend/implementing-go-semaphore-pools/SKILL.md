---
name: implementing-go-semaphore-pools
description: Use when implementing bounded concurrency in Go with semaphores and worker pools - rate limiting external APIs, high-throughput parallel processing (40K+ items/hour), variable-cost task scheduling. Complements go-errgroup-concurrency. Handles "too many goroutines", "rate limit exceeded", "out of memory", semaphore.NewWeighted, errgroup.SetLimit, runtime.NumCPU patterns
allowed-tools: Read, Grep, Glob, LSP
---

# Implementing Go Semaphore Pools

**Bounded concurrency patterns using semaphores and worker pools for production Go applications.**

## When to Use

Use this skill when:

- Rate limiting API calls to external services
- Processing high-throughput workloads (40K+ items/hour)
- Preventing resource exhaustion (memory, goroutines, connections)
- Implementing variable-cost task scheduling (weighted semaphores)
- Pre-Go 1.20 projects needing concurrency limits
- Fine-grained control over concurrent execution

**Complements:** `go-errgroup-concurrency` skill (error aggregation + concurrency control)

**Important:** You MUST use TodoWrite before starting to track all steps

## Quick Decision Matrix

| Scenario                        | Use                           | Concurrency Limit       |
| ------------------------------- | ----------------------------- | ----------------------- |
| Simple rate limiting (Go 1.20+) | `errgroup.SetLimit()`         | Fixed worker count      |
| API rate limits + backpressure  | `semaphore.NewWeighted`       | Dynamic, context-aware  |
| Variable-cost tasks             | `semaphore.NewWeighted`       | Weighted (acquire N)    |
| Maximum performance             | Worker pool pattern           | Explicit resource bound |
| CPU-bound processing            | Any, limit=`runtime.NumCPU()` | Matches CPU cores       |
| I/O-bound processing            | Any, limit=10-100             | High concurrency OK     |

## Core API: golang.org/x/sync/semaphore

### Basic Usage

```go
import "golang.org/x/sync/semaphore"

// Create weighted semaphore with max 10 concurrent operations
sem := semaphore.NewWeighted(10)

// Acquire 1 unit (blocks if at capacity)
if err := sem.Acquire(ctx, 1); err != nil {
    return err  // Context canceled
}
defer sem.Release(1)

// Do work with bounded concurrency
processItem(item)
```

### Weighted Semaphores

**Use for variable-cost tasks:**

```go
sem := semaphore.NewWeighted(100)  // 100 "cost units" available

// Small task: acquire 1 unit
sem.Acquire(ctx, 1)
defer sem.Release(1)
processSmallItem()

// Large task: acquire 10 units
sem.Acquire(ctx, 10)
defer sem.Release(10)
processLargeItem()
```

**See:** [references/weighted-semaphore-patterns.md](references/weighted-semaphore-patterns.md)

## Pattern 1: errgroup + Semaphore (Recommended)

**Best of both worlds:** Error aggregation + bounded concurrency

```go
import (
    "context"
    "golang.org/x/sync/errgroup"
    "golang.org/x/sync/semaphore"
)

func ProcessItems(ctx context.Context, items []Item, maxConcurrent int) error {
    g, ctx := errgroup.WithContext(ctx)
    sem := semaphore.NewWeighted(int64(maxConcurrent))

    for _, item := range items {
        item := item  // Capture loop variable

        // Acquire before spawning goroutine
        if err := sem.Acquire(ctx, 1); err != nil {
            return err
        }

        g.Go(func() error {
            defer sem.Release(1)
            return scanItem(ctx, item)
        })
    }

    return g.Wait()  // Wait for all goroutines, aggregate errors
}
```

**Why this pattern:**

- ✅ Bounded concurrency (max N goroutines)
- ✅ Error aggregation (first error stops all)
- ✅ Context cancellation (propagates to all workers)
- ✅ Clean resource management (defer release)

## Pattern 2: errgroup.SetLimit (Go 1.20+)

**Simpler for basic cases:**

```go
func ProcessItems(ctx context.Context, items []Item, maxConcurrent int) error {
    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(maxConcurrent)  // Built-in rate limiting

    for _, item := range items {
        item := item

        g.Go(func() error {
            return scanItem(ctx, item)
        })
    }

    return g.Wait()
}
```

**When to use:**

- ✅ Go 1.20+ projects
- ✅ Fixed worker count
- ✅ Uniform task costs
- ❌ NOT for weighted semaphores
- ❌ NOT for fine-grained control

## Pattern 3: Worker Pool (Maximum Performance)

**Explicit worker management for high-throughput:**

```go
func ProcessItems(ctx context.Context, items []Item, numWorkers int) error {
    itemChan := make(chan Item, numWorkers*2)  // Buffered queue
    g, ctx := errgroup.WithContext(ctx)

    // Start workers
    for i := 0; i < numWorkers; i++ {
        g.Go(func() error {
            for item := range itemChan {
                if err := scanItem(ctx, item); err != nil {
                    return err
                }
            }
            return nil
        })
    }

    // Feed work
    g.Go(func() error {
        defer close(itemChan)
        for _, item := range items {
            select {
            case itemChan <- item:
            case <-ctx.Done():
                return ctx.Err()
            }
        }
        return nil
    })

    return g.Wait()
}
```

**Performance:** 2.4x faster than sequential, 20-40% less memory than unbounded concurrency

**See:** [references/worker-pool-patterns.md](references/worker-pool-patterns.md)

## Tuning Concurrency Limits

### CPU-Bound Workloads

```go
import "runtime"

maxWorkers := runtime.NumCPU()  // Match CPU cores
// Example: 8-core machine → 8 workers
```

**Rationale:** CPU-bound tasks can't exceed physical core count without contention.

### I/O-Bound Workloads

```go
maxWorkers := 50  // 10-100 typical range
// Tasks spend most time waiting on network/disk
```

**Rationale:** High concurrency OK - workers block on I/O, not CPU.

### Network with Rate Limits

```go
// External API allows 150 req/sec
maxWorkers := 100
rateLimit := rate.NewLimiter(150, 10)  // 150/sec, burst 10

sem := semaphore.NewWeighted(int64(maxWorkers))
for _, item := range items {
    rateLimit.Wait(ctx)  // Rate limiter
    sem.Acquire(ctx, 1)   // Concurrency limiter
    g.Go(func() error {
        defer sem.Release(1)
        return callAPI(item)
    })
}
```

**See:** [references/rate-limiting-patterns.md](references/rate-limiting-patterns.md)

## Performance Benchmarks

**Test scenario:** Process 1000 items with variable processing time

| Pattern                     | ns/op   | Speedup | Memory |
| --------------------------- | ------- | ------- | ------ |
| Sequential (baseline)       | 111,483 | 1.0x    | 100%   |
| `sync/errgroup` (unbounded) | 65,826  | 1.7x    | 300%   |
| errgroup + semaphore (20)   | 52,104  | 2.1x    | 120%   |
| Worker pool (20)            | 46,867  | 2.4x    | 80%    |

**Key findings:**

- Worker pools: Best performance + lowest memory
- Semaphores: Good balance of control + performance
- Unbounded: Fastest but 3x memory usage (risk OOM)

**See:** [references/benchmark-analysis.md](references/benchmark-analysis.md)

## Production Examples

### TruffleHog (24K stars)

**Multi-stage worker pools with stage-specific multipliers:**

```go
// Stage 1: Source enumeration (I/O-bound)
sourceWorkers := runtime.NumCPU() * 4

// Stage 2: Secret detection (CPU-bound)
detectorWorkers := runtime.NumCPU()

// Stage 3: Verification (network-bound)
verifyWorkers := runtime.NumCPU() * 10
```

**Pattern:** Tune each pipeline stage independently based on workload type.

### Nuclei (26K stars)

**Rate limiting at 150 req/sec using semaphore patterns:**

```go
rateLimiter := rate.NewLimiter(rate.Limit(rateLimit), burst)
sem := semaphore.NewWeighted(int64(maxConcurrent))

for target := range targets {
    rateLimiter.Wait(ctx)
    sem.Acquire(ctx, 1)
    go func(t string) {
        defer sem.Release(1)
        executeTemplate(t)
    }(target)
}
```

**Pattern:** Combine rate limiter + semaphore for external API safety.

### Trivy (30K stars)

**pkg/parallel/parallel.go - bounded concurrency:**

```go
func Run(workers int, fn func(context.Context, int) error) error {
    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(workers)  // Go 1.20+ built-in

    for i := 0; i < totalTasks; i++ {
        i := i
        g.Go(func() error {
            return fn(ctx, i)
        })
    }
    return g.Wait()
}
```

**Pattern:** Abstract worker pool into reusable utility function.

**See:** [references/production-case-studies.md](references/production-case-studies.md)

## Common Pitfalls

### 1. Forgetting defer Release

```go
// ❌ BAD: Leaks semaphore slot on error
sem.Acquire(ctx, 1)
if err := process(); err != nil {
    return err  // Release never called!
}
sem.Release(1)

// ✅ GOOD: Always defer
sem.Acquire(ctx, 1)
defer sem.Release(1)
return process()
```

### 2. Acquiring Inside Goroutine

```go
// ❌ BAD: Unbounded goroutine creation
for _, item := range items {
    g.Go(func() error {
        sem.Acquire(ctx, 1)  // All goroutines created before acquire!
        defer sem.Release(1)
        return process(item)
    })
}

// ✅ GOOD: Acquire before spawning
for _, item := range items {
    sem.Acquire(ctx, 1)  // Blocks when at capacity
    g.Go(func() error {
        defer sem.Release(1)
        return process(item)
    })
}
```

### 3. Ignoring Context Cancellation

```go
// ❌ BAD: Acquire blocks forever on cancel
sem.Acquire(context.Background(), 1)

// ✅ GOOD: Respect context
if err := sem.Acquire(ctx, 1); err != nil {
    return err  // Context canceled
}
```

**See:** [references/common-pitfalls.md](references/common-pitfalls.md)

## Testing Strategies

### Test Concurrent Behavior

```go
func TestBoundedConcurrency(t *testing.T) {
    const maxConcurrent = 5
    sem := semaphore.NewWeighted(maxConcurrent)

    var current, peak atomic.Int32

    g, ctx := errgroup.WithContext(context.Background())
    for i := 0; i < 100; i++ {
        sem.Acquire(ctx, 1)
        g.Go(func() error {
            defer sem.Release(1)

            n := current.Add(1)
            if n > peak.Load() {
                peak.Store(n)
            }
            time.Sleep(10 * time.Millisecond)
            current.Add(-1)

            return nil
        })
    }

    g.Wait()
    assert.Equal(t, maxConcurrent, int(peak.Load()))
}
```

**See:** [references/testing-patterns.md](references/testing-patterns.md)

## Quick Reference

| Need                            | Pattern                  | Code Snippet                         |
| ------------------------------- | ------------------------ | ------------------------------------ |
| Basic bounded concurrency       | errgroup + semaphore     | `sem.Acquire(ctx, 1); defer Release` |
| Simple rate limiting (Go 1.20+) | `errgroup.SetLimit`      | `g.SetLimit(N)`                      |
| Variable-cost tasks             | Weighted semaphore       | `sem.Acquire(ctx, weight)`           |
| Maximum performance             | Worker pool              | Channel + N goroutines               |
| Rate limit external API         | Rate limiter + semaphore | `limiter.Wait() + sem.Acquire()`     |
| CPU-bound tuning                | `runtime.NumCPU()`       | `maxWorkers := runtime.NumCPU()`     |
| I/O-bound tuning                | 10-100 workers           | `maxWorkers := 50`                   |

## References

**Go packages:**

- [golang.org/x/sync/semaphore](https://pkg.go.dev/golang.org/x/sync/semaphore) - Official semaphore API
- [golang.org/x/sync/errgroup](https://pkg.go.dev/golang.org/x/sync/errgroup) - Error group with SetLimit

**Articles:**

- [Encore.dev - Advanced Go Concurrency](https://encore.dev/blog/advanced-go-concurrency)
- Research: `.claude/.output/research/2026-01-01-go-scanner-architecture-patterns/github.md`

**Related Skills:**

- `go-errgroup-concurrency` - Error aggregation and concurrent error handling
- `designing-go-interfaces` - Interface design for concurrent systems

## Related Skills

- `go-errgroup-concurrency` - Error aggregation with concurrent operations
- `designing-go-interfaces` - Design patterns for concurrent APIs
- `adhering-to-dry` - DRY principles for reusable concurrency abstractions
- `debugging-systematically` - Debug concurrent race conditions and deadlocks
- `gateway-backend` - Go backend patterns and architectures
