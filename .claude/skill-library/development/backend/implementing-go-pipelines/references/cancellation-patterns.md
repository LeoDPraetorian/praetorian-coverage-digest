# Cancellation Patterns

**Graceful shutdown patterns for Go pipelines with errgroup automatic cancellation**

## Overview

**Critical principle from Trivy research:**

> "It exits when any error occurs" - errgroup.WithContext pattern

**Production validation:**

- [Trivy](https://github.com/aquasecurity/trivy) - Generic Pipeline[T,U] with errgroup
- [Prometheus](https://github.com/prometheus/prometheus) - tsdb operations with errgroup
- All 6 production projects use `errgroup.WithContext` for first-error cancellation

From `.claude/.output/research/2026-01-01-go-scanner-architecture-patterns/SYNTHESIS.md` (lines 352-374).

---

## Pattern 1: errgroup.WithContext (Modern Standard)

**Source:** Universal pattern across Trivy, Prometheus, TruffleHog, Nuclei, Jaeger

From `.claude/.output/research/2026-01-01-202322-production-go-streaming-scanners/SYNTHESIS.md` (lines 55-82):

```go
func Pipeline(ctx context.Context, items []Item) error {
    g, ctx := errgroup.WithContext(ctx)

    itemCh := make(chan Item, len(items))
    results := make(chan Result, 10)

    // Start workers
    for i := 0; i < 5; i++ {
        g.Go(func() error {
            for item := range itemCh {
                result, err := processItem(ctx, item)
                if err != nil {
                    return err  // ← Cancels ALL workers via ctx
                }

                select {
                case results <- result:
                case <-ctx.Done():
                    return ctx.Err()  // ← Propagates cancellation
                }
            }
            return nil
        })
    }

    // Feed work
    go func() {
        defer close(itemCh)
        for _, item := range items {
            select {
            case itemCh <- item:
            case <-ctx.Done():
                return  // ← Stop feeding on cancel
            }
        }
    }()

    // Process results
    go func() {
        g.Wait()
        close(results)  // ← Close after all workers exit
    }()

    return g.Wait()  // ← Blocks until all goroutines exit or first error
}
```

**Why errgroup.WithContext is the standard:**

1. **First-error cancellation**: Any worker error cancels context
2. **Automatic propagation**: Context shared across all goroutines
3. **No explicit cleanup**: Context cancellation handled by errgroup
4. **Error aggregation**: Returns first error encountered

**Trivy's pattern** (from research):

> "errgroup exits when any error occurs" - no partial results, fail-fast

---

## Pattern 2: Done Channel (Go Blog Canonical, Pre-1.7)

**Source:** [Go Blog - Pipelines and Cancellation](https://go.dev/blog/pipelines) (2014)

```go
func pipeline(done <-chan struct{}, nums []int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums {
            select {
            case out <- n:
            case <-done:
                return  // Exit immediately on broadcast
            }
        }
    }()
    return out
}

// Usage
done := make(chan struct{})
defer close(done)  // Broadcast cancellation to ALL stages

c := pipeline(done, nums)
```

**Benefits:**

- ✅ Simple, explicit broadcast mechanism
- ✅ Zero allocation (`struct{}` is zero-sized)
- ✅ Works pre-Go 1.7 (before context)
- ✅ No dependencies

**When to use:**

- Simple pipelines without external API calls
- No need for deadline/timeout
- No request-scoped values needed

---

## Pattern 3: Context with Timeout

**Production pattern for network-bound stages:**

```go
func scanWithTimeout(ctx context.Context, targets []string) error {
    // 30-second timeout per scan batch
    ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
    defer cancel()

    g, ctx := errgroup.WithContext(ctx)

    for _, target := range targets {
        target := target
        g.Go(func() error {
            // HTTP request with timeout
            req, err := http.NewRequestWithContext(ctx, "GET", target, nil)
            if err != nil {
                return err
            }

            resp, err := http.DefaultClient.Do(req)
            if err != nil {
                // Could be timeout or cancellation
                if ctx.Err() == context.DeadlineExceeded {
                    return fmt.Errorf("scan timeout: %s", target)
                }
                return err
            }
            defer resp.Body.Close()

            return processResponse(ctx, resp)
        })
    }

    return g.Wait()
}
```

**Timeout behavior:**

- `context.DeadlineExceeded` when timeout expires
- Cancels ALL workers (errgroup cancels ctx)
- HTTP client respects context deadline
- No goroutine leaks (all workers exit)

---

## Pattern 4: Coordinated Channel Closing

**From Trivy Pipeline[T,U] pattern** (research lines 75-82):

```go
// CRITICAL: Close channels in correct order

// 1. Workers process items
for i := 0; i < workers; i++ {
    g.Go(func() error {
        for item := range itemCh {
            results <- processItem(item)
        }
        return nil
    })
}

// 2. Separate goroutine waits for workers, then closes results
go func() {
    g.Wait()         // ← Wait for ALL workers to exit
    close(results)   // ← THEN close results channel
}()

// 3. Result consumer drains results channel
g.Go(func() error {
    for result := range results {
        emit(result)
    }
    return nil
})

return g.Wait()
```

**Order matters:**

1. Workers finish processing `itemCh`
2. `g.Wait()` blocks until all workers exit
3. `close(results)` signals no more results coming
4. Result consumer drains `results` until closed

**Anti-pattern** (WRONG):

```go
// ❌ BAD: Close results before workers finish
close(results)  // ← Workers still trying to send!
g.Wait()        // ← Panic: send on closed channel
```

---

## Pattern 5: Context Cancellation with Cleanup

**Production pattern from scanner research:**

```go
func scanRepositories(ctx context.Context, repos []string) error {
    g, ctx := errgroup.WithContext(ctx)

    // Resource cleanup on cancellation
    var mu sync.Mutex
    openFiles := make(map[string]*os.File)

    defer func() {
        // Cleanup any open resources
        mu.Lock()
        for _, f := range openFiles {
            f.Close()
        }
        mu.Unlock()
    }()

    for _, repo := range repos {
        repo := repo
        g.Go(func() error {
            f, err := os.Open(repo)
            if err != nil {
                return err
            }

            // Track open file
            mu.Lock()
            openFiles[repo] = f
            mu.Unlock()

            defer func() {
                mu.Lock()
                delete(openFiles, repo)
                mu.Unlock()
                f.Close()
            }()

            // Long-running operation that checks ctx
            return processRepo(ctx, f)
        })
    }

    return g.Wait()
}

func processRepo(ctx context.Context, f *os.File) error {
    scanner := bufio.NewScanner(f)
    for scanner.Scan() {
        // Check cancellation periodically
        select {
        case <-ctx.Done():
            return ctx.Err()
        default:
        }

        // Process line
        if err := processLine(scanner.Text()); err != nil {
            return err
        }
    }
    return scanner.Err()
}
```

**Key patterns:**

- ✅ `defer` cleanup function for resources
- ✅ Track open resources with mutex
- ✅ Check `ctx.Done()` in long loops
- ✅ Clean up on both success and cancellation

---

## Pattern 6: Trivy's "Fail-Fast" Pipeline

**From research** (`.claude/.output/research/2026-01-01-202322-production-go-streaming-scanners/SYNTHESIS.md`):

> "It exits when any error occurs" - errgroup error handling

```go
// Trivy's generic pipeline with fail-fast
func (p Pipeline[T, U]) Do(ctx context.Context, items []T) error {
    g, ctx := errgroup.WithContext(ctx)

    itemCh := make(chan T, len(items))
    results := make(chan U, p.numWorkers)

    // Workers: ANY error cancels all via ctx
    for i := 0; i < p.numWorkers; i++ {
        g.Go(func() error {
            for item := range itemCh {
                result, err := p.onItem(ctx, item)
                if err != nil {
                    return err  // ← First error cancels everything
                }
                results <- result
            }
            return nil
        })
    }

    // Result processing: Can also fail and cancel
    g.Go(func() error {
        for result := range results {
            if err := p.onResult(ctx, result); err != nil {
                return err  // ← Result processing error also cancels
            }
        }
        return nil
    })

    return g.Wait()  // ← Returns first error
}
```

**Fail-fast guarantees:**

1. First error in ANY stage cancels context
2. All workers see `ctx.Done()` and exit
3. No partial results emitted
4. Single error returned (first encountered)

**Memory safety:**

- Bounded by worker count
- No goroutine leaks (all respect context)
- Channels closed in correct order

---

## When to Use Which Pattern

| Pattern                   | Use Case                         | Go Version | Dependencies                 |
| ------------------------- | -------------------------------- | ---------- | ---------------------------- |
| **errgroup.WithContext**  | Production code, error handling  | Go 1.7+    | `golang.org/x/sync/errgroup` |
| **Done channel**          | Simple pipelines, pre-1.7        | Any        | None                         |
| **Context with timeout**  | Network operations, bounded time | Go 1.7+    | `context`                    |
| **Context with deadline** | Absolute cutoff time             | Go 1.7+    | `context`                    |

**Recommendation:** Use `errgroup.WithContext` for ALL new production code.

**Why:**

- Industry standard (6/6 production projects)
- Automatic cancellation on first error
- Integrates with HTTP requests, database operations
- Carries request-scoped values

---

## Parent-Child Context Patterns

**Hierarchical cancellation:**

```go
func processOrganization(ctx context.Context, org string) error {
    // Organization-level timeout
    ctx, cancel := context.WithTimeout(ctx, 5*time.Minute)
    defer cancel()

    repos, err := fetchRepos(ctx, org)
    if err != nil {
        return err
    }

    g, ctx := errgroup.WithContext(ctx)

    for _, repo := range repos {
        repo := repo
        g.Go(func() error {
            // Per-repo timeout (child context)
            repoCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
            defer cancel()

            return scanRepo(repoCtx, repo)
        })
    }

    return g.Wait()
}
```

**Cancellation propagation:**

1. Parent context canceled → ALL children cancel
2. Child timeout → Only that child fails (others continue)
3. Any child error → errgroup cancels parent ctx → ALL children cancel

---

## Draining Channels on Cancellation

**From Go Blog pattern:**

```go
ctx, cancel := context.WithCancel(context.Background())
c := pipeline(ctx, nums)

// Read only first value
val := <-c
cancel()

// MUST drain channel to unblock senders
for range c {
    // Discard remaining values
}
```

**Why drain:**

- Sender goroutines blocked on `c <- value`
- `cancel()` signals intent, but doesn't unblock sends
- Draining allows senders to complete and exit
- Prevents goroutine leaks

**Alternative: Buffered channels**

```go
// Large enough buffer that senders never block
out := make(chan int, len(items))
```

---

## Testing Cancellation

**From Prometheus wlog tests** (research reference):

```go
func TestCancellation(t *testing.T) {
    ctx, cancel := context.WithCancel(context.Background())

    // Start long-running pipeline
    g, ctx := errgroup.WithContext(ctx)
    results := make(chan int)

    g.Go(func() error {
        defer close(results)
        for i := 0; i < 1000; i++ {
            select {
            case results <- i:
            case <-ctx.Done():
                return ctx.Err()
            }
            time.Sleep(10 * time.Millisecond)
        }
        return nil
    })

    // Read only first few results
    for i := 0; i < 10; i++ {
        <-results
    }

    // Cancel and verify quick exit
    cancel()

    start := time.Now()
    err := g.Wait()
    elapsed := time.Since(start)

    // Should exit quickly (not wait for all 1000)
    if elapsed > 100*time.Millisecond {
        t.Errorf("cancellation took too long: %v", elapsed)
    }

    if err != context.Canceled {
        t.Errorf("expected Canceled, got %v", err)
    }
}
```

---

## References

**Official Go Resources:**

- [Go Blog - Pipelines and Cancellation](https://go.dev/blog/pipelines) - Canonical done channel pattern (2014)
- [Go Blog - Context](https://go.dev/blog/context) - Context patterns and best practices

**Production Codebases:**

- [Trivy pkg/parallel/pipeline.go](https://github.com/aquasecurity/trivy) - errgroup.WithContext pattern
- [Prometheus tsdb/db.go](https://github.com/prometheus/prometheus) - Production errgroup usage
- [Prometheus tsdb/wlog/watcher_test.go](https://github.com/prometheus/prometheus) - Cancellation testing

**Research:**

- `.claude/.output/research/2026-01-01-202322-production-go-streaming-scanners/SYNTHESIS.md` (lines 47-92, 378-404)
- `.claude/.output/research/2026-01-01-go-scanner-architecture-patterns/SYNTHESIS.md` (lines 352-374)
- `.claude/.output/research/2026-01-01-go-scanner-architecture-patterns/github.md` (lines 105-127)
