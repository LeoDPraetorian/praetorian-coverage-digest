---
name: go-errgroup-concurrency
description: Use when implementing parallel processing in Go with error handling - covers errgroup API (Group, WithContext, SetLimit, TryGo), 6 concurrency patterns (basic parallel, mutex-protected results, atomic counters, channels, continue-on-error, fire-and-forget), anti-patterns to avoid, and Chariot concurrency limit standards. Based on 33 real implementations.
allowed-tools: 'Read, Bash, Grep, Glob'
---

# Go Errgroup Concurrency Patterns

Comprehensive reference for parallel processing in Go using `golang.org/x/sync/errgroup`. Based on official documentation and analysis of 33 real implementations in the Chariot codebase.

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

### Type: Group

```go
type Group struct {
    // contains filtered or unexported fields
}
```

A collection of goroutines working on subtasks of a common task.

**Key characteristics:**
- Zero value is valid (no limit, no context cancellation)
- Thread-safe for concurrent `Go()` calls
- **Must NOT be reused after `Wait()` returns**

### Function: WithContext

```go
func WithContext(ctx context.Context) (*Group, context.Context)
```

Creates a Group with a derived context that cancels on first error.

```go
g, ctx := errgroup.WithContext(context.Background())
// ctx is canceled when:
// 1. First goroutine returns non-nil error, OR
// 2. Wait() returns
```

### Method: Go

```go
func (g *Group) Go(f func() error)
```

Spawns a goroutine. **Blocks if SetLimit reached** until a slot opens.

### Method: Wait

```go
func (g *Group) Wait() error
```

Blocks until all goroutines complete. Returns first non-nil error.

### Method: SetLimit

```go
func (g *Group) SetLimit(n int)
```

Limits concurrent goroutines. **Must be called before any `Go()` calls.**

- `n > 0`: Max n concurrent goroutines
- `n < 0`: No limit (removes existing limit)
- `n == 0`: Prevents any new goroutines

### Method: TryGo

```go
func (g *Group) TryGo(f func() error) bool
```

Non-blocking variant of `Go()`. Returns false if limit reached.

```go
if g.TryGo(task) {
    fmt.Println("Task started")
} else {
    fmt.Println("At capacity, task queued for later")
}
```

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

---

## Concurrency Limits

### Standard Limits (Chariot Convention)

| Limit | Use Case | Example |
|-------|----------|---------|
| **10** | Default for most operations | Integrations, API calls, handlers |
| **25-30** | Higher throughput needed | CSV imports, exports |
| **100** | Lightweight operations | Okta (simple API calls) |
| **1000** | Bulk database operations | DynamoDB batch deletes |

### Choosing a Limit

| Workload Type | Recommendation |
|---------------|----------------|
| **CPU-bound** | `runtime.NumCPU()` |
| **I/O-bound (HTTP, DB)** | 10-100 based on external limits |
| **Memory-intensive** | Lower limit to prevent OOM |
| **Rate-limited APIs** | Match API rate limit |
| **Unknown** | Start with 10, adjust based on metrics |

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

### Anti-Pattern 1: Missing Loop Variable Capture (Go < 1.22)

```go
// WRONG - All goroutines see final value
for _, item := range items {
    g.Go(func() error {
        return process(item)  // BUG!
    })
}

// CORRECT - Capture the variable
for _, item := range items {
    item := item  // Shadow the variable
    g.Go(func() error {
        return process(item)
    })
}
```

**Note:** Go 1.22+ fixes this, but shadowing is still safe and explicit.

### Anti-Pattern 2: Swallowed Errors

```go
// WRONG - Error ignored
g.Wait()

// CORRECT - Always check the error
if err := g.Wait(); err != nil {
    return fmt.Errorf("parallel processing failed: %w", err)
}
```

### Anti-Pattern 3: No Concurrency Limit

```go
// WRONG - Unbounded goroutines
g := errgroup.Group{}
for _, item := range thousandsOfItems {
    g.Go(func() error { ... })  // Creates thousands of goroutines!
}

// CORRECT - Always set a limit
g := errgroup.Group{}
g.SetLimit(10)
```

### Anti-Pattern 4: Modifying Limit While Active

```go
// WRONG - Undefined behavior
g.SetLimit(5)
g.Go(func() error { ... })
g.SetLimit(10)  // PANIC or race condition

// CORRECT - Set limit once before any Go() calls
g.SetLimit(10)
// ... all Go() calls ...
g.Wait()
```

### Anti-Pattern 5: Reusing Group After Wait

```go
// WRONG - Undefined behavior
g.Wait()
g.Go(func() error { ... })  // Don't do this!

// CORRECT - Create new group for new work
var g2 errgroup.Group
g2.SetLimit(10)
g2.Go(func() error { ... })
```

### Anti-Pattern 6: Ignoring Context Cancellation

```go
// WRONG - Goroutine runs to completion even after error
g.Go(func() error {
    for _, item := range bigSlice {
        processItem(item)  // Keeps running!
    }
    return nil
})

// CORRECT - Check context periodically
g.Go(func() error {
    for _, item := range bigSlice {
        select {
        case <-ctx.Done():
            return ctx.Err()  // Exit early
        default:
            processItem(item)
        }
    }
    return nil
})
```

### Anti-Pattern 7: Silent Batch Failures

```go
// WRONG - No visibility into partial failures
for _, item := range items {
    if err := process(item); err != nil {
        slog.Error("failed", "error", err)
        continue  // No tracking!
    }
}

// CORRECT - Track and report failures
var failCount int
for _, item := range items {
    if err := process(item); err != nil {
        slog.Error("failed", "id", item.ID, "error", err)
        failCount++
        continue
    }
}
if failCount > 0 {
    slog.Warn("completed with errors", "failed", failCount, "total", len(items))
}
```

---

## Advanced Patterns

### Batch Processing with Errgroup

```go
func processBatches[T any](items []T, batchSize, concurrency int, fn func([]T) error) error {
    g := errgroup.Group{}
    g.SetLimit(concurrency)

    for i := 0; i < len(items); i += batchSize {
        end := min(i+batchSize, len(items))
        batch := items[i:end]

        g.Go(func() error {
            return fn(batch)
        })
    }

    return g.Wait()
}
```

### Multiple Error Collection

```go
func processAllCollectErrors(items []Item) error {
    g := errgroup.Group{}
    g.SetLimit(10)

    var errs []error
    var errMu sync.Mutex

    for _, item := range items {
        item := item
        g.Go(func() error {
            if err := process(item); err != nil {
                errMu.Lock()
                errs = append(errs, fmt.Errorf("item %s: %w", item.ID, err))
                errMu.Unlock()
            }
            return nil  // Don't fail group, collect all errors
        })
    }

    g.Wait()

    if len(errs) > 0 {
        return errors.Join(errs...)  // Go 1.20+
    }
    return nil
}
```

### Rate-Limited Processing

```go
import "golang.org/x/time/rate"

func processWithRateLimit(ctx context.Context, items []Item) error {
    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(10)

    limiter := rate.NewLimiter(rate.Limit(10), 1)  // 10 req/sec

    for _, item := range items {
        item := item
        g.Go(func() error {
            if err := limiter.Wait(ctx); err != nil {
                return err
            }
            return process(item)
        })
    }

    return g.Wait()
}
```

---

## Decision Guide

### errgroup vs sync.WaitGroup

| Feature | sync.WaitGroup | errgroup.Group |
|---------|----------------|----------------|
| Error handling | Manual | Built-in |
| Context cancellation | Manual | Built-in (WithContext) |
| Concurrency limits | Manual | Built-in (SetLimit) |
| Panic handling | Crashes | Crashes* |
| API complexity | Add/Done/Wait | Go/Wait |

*For panic recovery, consider `sourcegraph/conc` package.

**Use errgroup when:**
- Goroutines can return errors
- Need coordinated cancellation
- Want concurrency limits
- Prefer cleaner API

**Use sync.WaitGroup when:**
- Fire-and-forget goroutines
- No error handling needed
- Maximum performance critical

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

Before submitting code with errgroup:

- [ ] `SetLimit()` called before any `Go()` calls
- [ ] Appropriate limit chosen (10 for most, adjust based on workload)
- [ ] Loop variables captured (Go < 1.22)
- [ ] `Wait()` error is checked and handled
- [ ] Context cancellation checked in long-running goroutines
- [ ] Failure counts tracked if using continue-on-error pattern
- [ ] Results collected thread-safely (mutex or channel)

---

## References

- [Official errgroup Documentation](https://pkg.go.dev/golang.org/x/sync/errgroup)
- [Go Blog: Pipelines and Cancellation](https://go.dev/blog/pipelines)
- [Go Wiki: Common Mistakes](https://go.dev/wiki/CommonMistakes)
- [Loop Variable Fix in Go 1.22](https://go.dev/blog/loopvar-preview)
- [sourcegraph/conc](https://github.com/sourcegraph/conc) - Alternative with panic recovery
