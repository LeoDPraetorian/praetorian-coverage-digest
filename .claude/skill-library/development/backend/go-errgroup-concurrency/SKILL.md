---
name: go-errgroup-concurrency
description: Use when implementing parallel processing in Go with error handling - covers errgroup API, 7 concurrency patterns (mutex, atomics, channels, cancellation, stage-specific workers), production examples (TruffleHog 24K stars, Nuclei 26K stars), benchmarks, anti-patterns, and Chariot concurrency standards from 33 real implementations
allowed-tools: "Read, Grep, Glob, TodoWrite"
---

# Go Errgroup Concurrency Patterns

> **MANDATORY**: You MUST use TodoWrite before starting to track all steps when implementing complex errgroup patterns (3+ stages, production pipelines, or multi-pattern combinations).

Comprehensive reference for parallel processing in Go using `golang.org/x/sync/errgroup`. Based on official documentation, analysis of 33 real implementations in the Chariot codebase, and production patterns from TruffleHog (24K stars) and Nuclei (26K stars).

## When to Use This Skill

- Implementing parallel API calls or data fetching
- Processing batches of items concurrently
- Fan-out/fan-in patterns with error handling
- Bounded concurrency to respect rate limits
- Collecting results from multiple goroutines
- Graceful cancellation of parallel work

## Quick Start

```go
import "golang.org/x/sync/errgroup"

// Basic parallel processing with limit
func processItems(items []Item) error {
    g := errgroup.Group{}
    g.SetLimit(10)  // Max 10 concurrent goroutines

    for _, item := range items {
        item := item  // Capture loop variable (Go < 1.22)
        g.Go(func() error {
            return process(item)
        })
    }

    return g.Wait()  // Returns first error, or nil if all succeed
}
```

## API Reference

| Method                | Purpose                        | Notes                                         |
| --------------------- | ------------------------------ | --------------------------------------------- |
| `Group{}`             | Zero-value constructor         | No limit, no context. Don't reuse after Wait  |
| `WithContext(ctx)`    | Create Group + derived context | Context cancels on first error                |
| `Go(func() error)`    | Spawn goroutine                | Blocks if SetLimit reached                    |
| `Wait() error`        | Block until all complete       | Returns first non-nil error                   |
| `SetLimit(n int)`     | Limit concurrent goroutines    | Call BEFORE any Go(). n>0 limits, n<0 removes |
| `TryGo(func() error)` | Non-blocking Go()              | Returns false if at capacity                  |

---

## Concurrency Patterns

### Pattern 1: Basic Parallel Processing

**Use when:** Simple parallel execution, fail on first error.

```go
func fetchAll(urls []string) error {
    g := errgroup.Group{}
    g.SetLimit(10)

    for _, url := range urls {
        url := url  // Capture loop variable
        g.Go(func() error {
            return fetch(url)
        })
    }

    return g.Wait()
}
```

### Pattern 2: Mutex-Protected Result Collection

**Use when:** Collecting results into a shared map or slice.

```go
func fetchAllResults(ids []string) (map[string]Result, error) {
    g := errgroup.Group{}
    g.SetLimit(10)

    results := make(map[string]Result)
    var mu sync.Mutex

    for _, id := range ids {
        id := id
        g.Go(func() error {
            result, err := fetchResult(id)
            if err != nil {
                return err
            }

            mu.Lock()
            results[id] = result
            mu.Unlock()

            return nil
        })
    }

    if err := g.Wait(); err != nil {
        return nil, err
    }
    return results, nil
}
```

### Pattern 3: Atomic Counters

**Use when:** Tracking counts without mutex overhead.

```go
func processWithStats(items []Item) (processed, failed int64, err error) {
    g := errgroup.Group{}
    g.SetLimit(10)

    var processedCount, failedCount atomic.Int64

    for _, item := range items {
        item := item
        g.Go(func() error {
            if err := process(item); err != nil {
                failedCount.Add(1)
                slog.Warn("item failed", "id", item.ID, "error", err)
                return nil  // Continue processing others
            }
            processedCount.Add(1)
            return nil
        })
    }

    err = g.Wait()
    return processedCount.Load(), failedCount.Load(), err
}
```

### Pattern 4: Channel-Based Collection

**Use when:** Streaming results to a consumer, producer-consumer patterns.

```go
func processStream(items []Item) error {
    g := errgroup.Group{}
    g.SetLimit(10)

    results := make(chan Result, len(items))

    for _, item := range items {
        item := item
        g.Go(func() error {
            result, err := process(item)
            if err != nil {
                return err
            }
            results <- result
            return nil
        })
    }

    // Wait and close channel
    err := g.Wait()
    close(results)

    // Consume results
    for result := range results {
        saveResult(result)
    }

    return err
}
```

### Pattern 5: Continue-on-Error (Log and Continue)

**Use when:** Partial success is acceptable, non-critical items.

```go
func processAllBestEffort(items []Item) error {
    g := errgroup.Group{}
    g.SetLimit(10)

    var failCount atomic.Int64

    for _, item := range items {
        item := item
        g.Go(func() error {
            if err := process(item); err != nil {
                // Log but don't fail the batch
                slog.Error("failed to process item",
                    "id", item.ID,
                    "error", err,
                )
                failCount.Add(1)
                return nil  // Continue with other items
            }
            return nil
        })
    }

    if err := g.Wait(); err != nil {
        return err
    }

    if failCount.Load() > 0 {
        slog.Warn("batch completed with errors",
            "failed", failCount.Load(),
            "total", len(items),
        )
    }
    return nil
}
```

### Pattern 6: With Context Cancellation

**Use when:** Long-running operations that should stop on first error.

```go
func processWithCancellation(ctx context.Context, items []Item) error {
    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(10)

    for _, item := range items {
        item := item
        g.Go(func() error {
            // Check cancellation before expensive work
            select {
            case <-ctx.Done():
                return ctx.Err()
            default:
            }

            return processItem(ctx, item)
        })
    }

    return g.Wait()
}
```

### Pattern 7: Stage-Specific Worker Counts

**Use when:** Multi-stage pipelines with different bottleneck types (CPU-bound vs network-bound vs I/O-bound).

```go
const (
    baseWorkers     = 10
    detectorMulti   = 3   // CPU-bound: 3x workers
    verifyMulti     = 2   // Network-bound: 2x workers
    notifyMulti     = 1   // I/O-bound: 1x workers
)

// Stage 1: Detection (CPU-heavy)
func detectStage(ctx context.Context, items []Item) error {
    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(baseWorkers * detectorMulti)  // 30 workers

    for _, item := range items {
        item := item
        g.Go(func() error {
            return detectSecrets(ctx, item)
        })
    }
    return g.Wait()
}

// Stage 2: Verification (network-heavy)
func verifyStage(ctx context.Context, results []Result) error {
    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(baseWorkers * verifyMulti)  // 20 workers

    for _, result := range results {
        result := result
        g.Go(func() error {
            return verifyWithAPI(ctx, result)
        })
    }
    return g.Wait()
}
```

**Why:** Match worker count to bottleneck characteristics for optimal throughput. CPU-bound stages benefit from more parallelism, while network-bound stages need rate limiting.

**Source:** TruffleHog Engine architecture (see Production Examples below)

---

## Production Examples

Real-world errgroup usage from popular security scanners.

### TruffleHog (Truffle Security, 24K+ stars)

Uses errgroup with **worker pool multipliers** for multi-stage pipeline:

```go
type Engine struct {
    concurrency int  // Default: runtime.NumCPU()

    // Independent worker pools per stage
    detectorWorkerMultiplier            int  // Usually 3x (CPU-bound)
    verificationWorkerMultiplier        int  // Usually 2x (network-bound)
    notificationWorkerMultiplier        int  // Usually 1x (I/O-bound)
}
```

**Performance:** 40K+ items/hour by tuning workers per bottleneck type

**Key insight:** Different pipeline stages have different bottlenecks. CPU-bound detection needs 3x workers, network-bound verification needs 2x, I/O-bound notification needs 1x.

**Source:** [TruffleHog GitHub](https://github.com/trufflesecurity/trufflehog), `.claude/.output/research/2026-01-01-go-scanner-architecture-patterns/github.md`

### Nuclei (ProjectDiscovery, 26K+ stars)

**ThreadSafeNucleiEngine** for concurrent template execution:

- **Default concurrency:** 25 templates in parallel
- **Bulk-size:** 25 hosts per template
- **Rate limiting:** 150 requests/second

**Pattern:** Nested errgroup with outer loop for templates, inner loop for hosts, combined with rate limiting to prevent API exhaustion.

**Source:** [Nuclei GitHub](https://github.com/projectdiscovery/nuclei), research document analysis

---

## Concurrency Limits

### Standard Limits (Chariot Convention)

| Limit     | Use Case                    | Example                           |
| --------- | --------------------------- | --------------------------------- |
| **10**    | Default for most operations | Integrations, API calls, handlers |
| **25-30** | Higher throughput needed    | CSV imports, exports              |
| **100**   | Lightweight operations      | Okta (simple API calls)           |
| **1000**  | Bulk database operations    | DynamoDB batch deletes            |

### Choosing a Limit

| Workload Type            | Recommendation                         |
| ------------------------ | -------------------------------------- |
| **CPU-bound**            | `runtime.NumCPU()`                     |
| **I/O-bound (HTTP, DB)** | 10-100 based on external limits        |
| **Memory-intensive**     | Lower limit to prevent OOM             |
| **Rate-limited APIs**    | Match API rate limit                   |
| **Unknown**              | Start with 10, adjust based on metrics |

```go
// Standard constants (consider defining in shared package)
const (
    ConcurrencyLow    = 10   // Rate-limited APIs, heavy operations
    ConcurrencyMedium = 30   // Moderate operations
    ConcurrencyHigh   = 100  // Lightweight operations
)
```

---

## Anti-Patterns to Avoid

**7 common anti-patterns with fixes:**

1. **Missing loop variable capture** (Go < 1.22)
2. **Swallowed errors** (not checking `Wait()`)
3. **No concurrency limit** (unbounded goroutines)
4. **Modifying limit while active** (undefined behavior)
5. **Reusing group after `Wait()`** (undefined behavior)
6. **Ignoring context cancellation** (wasted work)
7. **Silent batch failures** (no tracking)

**See:** [references/anti-patterns.md](references/anti-patterns.md) for detailed examples and fixes.

---

## Advanced Patterns

**Batch processing**, **multiple error collection**, and **rate-limited processing** patterns.

**See:** [references/advanced-patterns.md](references/advanced-patterns.md) for complete implementations.

---

## Performance Benchmarks

Based on production measurements:

| Pattern                 | Performance (ns/op) | Memory     | Use Case                  |
| ----------------------- | ------------------- | ---------- | ------------------------- |
| Sequential              | ~111,483            | Baseline   | Single-threaded           |
| sync/errgroup           | ~65,826             | Moderate   | Error propagation         |
| errgroup + worker pool  | ~46,867             | Low (40%↓) | High-throughput pipelines |
| Worker pool (optimized) | Best                | Lowest     | Maximum performance       |

**Key insight:** errgroup + worker pool (SetLimit) reduces memory by 40% vs unbounded while improving throughput.

**Source:** Research benchmarks from worker pool comparisons

---

## Decision Guide

### errgroup vs sync.WaitGroup

| Feature              | sync.WaitGroup | errgroup.Group         |
| -------------------- | -------------- | ---------------------- |
| Error handling       | Manual         | Built-in               |
| Context cancellation | Manual         | Built-in (WithContext) |
| Concurrency limits   | Manual         | Built-in (SetLimit)    |
| Panic handling       | Crashes        | Crashes\*              |
| API complexity       | Add/Done/Wait  | Go/Wait                |

\*For panic recovery, consider `sourcegraph/conc` package.

**Use errgroup when:**

- Goroutines can return errors
- Need coordinated cancellation
- Want concurrency limits
- Prefer cleaner API

**Use sync.WaitGroup when:**

- Fire-and-forget goroutines
- No error handling needed
- Maximum performance critical

### errgroup vs Semaphore

For more advanced concurrency control, see:

- **implementing-go-semaphore-pools** - Weighted semaphores, fine-grained control
- Use semaphore when: Variable task costs, need TryAcquire, pre-Go 1.20

**Optimal pattern:** Combine errgroup + semaphore (covered in semaphore skill)

**errgroup provides:** Error propagation, context cancellation, simple API
**Semaphore provides:** Weighted resource control, TryAcquire for non-blocking, fine-grained priority

### When to Use WithContext

**Use `errgroup.WithContext` when:**

- First error should stop all work
- Operations are expensive (don't waste resources)
- Graceful shutdown is needed

**Use bare `errgroup.Group` when:**

- All items should be attempted regardless of errors
- Using "log and continue" pattern
- Operations are cheap/fast

---

## Quality Checklist

- [ ] `SetLimit()` before `Go()` | [ ] Limit chosen (10 default) | [ ] Loop vars captured
- [ ] `Wait()` error checked | [ ] Context cancellation handled | [ ] Failures tracked
- [ ] Results thread-safe (mutex/channel)

---

## References

- [Official errgroup docs](https://pkg.go.dev/golang.org/x/sync/errgroup)
- [TruffleHog GitHub](https://github.com/trufflesecurity/trufflehog) - 24K+ stars, production patterns
- [Nuclei GitHub](https://github.com/projectdiscovery/nuclei) - 26K+ stars, concurrent templates
- [Go Blog: Pipelines](https://go.dev/blog/pipelines)
- [sourcegraph/conc](https://github.com/sourcegraph/conc) - Panic recovery alternative
- Research: `.claude/.output/research/2026-01-01-go-scanner-architecture-patterns/`
