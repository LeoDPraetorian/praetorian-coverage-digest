# Common Pitfalls

**Production failure patterns from Go scanner research and debugging lessons**

## Overview

**Critical Lesson from etcd** (51K⭐ CNCF project):

> "A 5-member etcd cluster can tolerate two member failures... Although larger clusters provide better fault tolerance, the write performance suffers"

**Takeaway:** More concurrency isn't always better - **bounded optimal exists**.

From `.claude/.output/research/2026-01-01-202322-production-go-streaming-scanners/github.md` (lines 186-190).

---

## 1. Unbounded Goroutines → Out of Memory

**Most common failure in production scanners**

### Problem

```go
// ❌ BAD: Creates unlimited goroutines
func scanAll(repos []string) error {
    var wg sync.WaitGroup

    for _, repo := range repos {
        wg.Add(1)
        go func(r string) {
            defer wg.Done()
            scan(r)  // Each scan allocates 50MB
        }(repo)
    }

    wg.Wait()
    return nil
}

// With 10,000 repos: 10,000 × 50MB = 500GB RAM!
```

**Symptom:** `fatal error: out of memory` after processing thousands of items

### Solution: Bounded Concurrency with Semaphore

From `.claude/.output/research/2026-01-01-202322-production-go-streaming-scanners/SYNTHESIS.md` (lines 378-404):

```go
// ✅ GOOD: Bounded by semaphore
func scanAll(ctx context.Context, repos []string, concurrency int) error {
    g, ctx := errgroup.WithContext(ctx)
    sem := semaphore.NewWeighted(int64(concurrency))

    for _, repo := range repos {
        repo := repo  // Capture

        if err := sem.Acquire(ctx, 1); err != nil {
            return err
        }

        g.Go(func() error {
            defer sem.Release(1)
            return scan(ctx, repo)
        })
    }

    return g.Wait()
}

// With 10,000 repos at concurrency=10: 10 × 50MB = 500MB peak
```

**Memory Formula** (from research lines 419-430):

```
Peak Memory = Workers × Per-Item Memory
```

**Production Evidence:**

- **Trivy**: Default 5 workers (conservative)
- **TruffleHog**: Default 20 workers (tuned for secret scanning)
- **Nuclei**: Default 25 templates (template-level concurrency)

---

## 2. Forgetting to Close Channels → Goroutine Leaks

### Problem

```go
// ❌ BAD: Downstream hangs forever
func transform(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        for n := range in {
            out <- n * 2
        }
        // Forgot close(out)!
    }()
    return out
}

// Consumer blocks forever waiting for close
for result := range transform(input) {
    // Never exits - channel never closes
}
```

**Symptom:** Goroutines hang indefinitely, gradual memory leak

### Solution: Always defer close

```go
// ✅ GOOD: Always defer close
func transform(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)  // ALWAYS defer
        for n := range in {
            out <- n * 2
        }
    }()
    return out
}
```

**Production Pattern** (Trivy Pipeline[T,U], research lines 75-82):

```go
// Close coordination
go func() {
    g.Wait()         // Wait for all workers
    close(results)   // THEN close results channel
}()
```

**Critical Order:**

1. Workers finish processing
2. `g.Wait()` blocks until all workers exit
3. `close(results)` signals no more data
4. Downstream consumer exits cleanly

---

## 3. Goroutine Leak from Blocked Send

### Problem

```go
// ❌ BAD: Goroutine leaks if receiver stops reading
func leak(nums []int) <-chan int {
    out := make(chan int)
    go func() {
        for _, n := range nums {
            out <- n  // Blocks forever if no receiver!
        }
        close(out)
    }()
    return out
}

c := leak([]int{1, 2, 3, 4, 5})
<-c  // Read only first value
// Goroutine still blocked trying to send 2!
```

**Symptom:** `runtime.NumGoroutine()` increases over time

### Solution: Respect context cancellation

```go
// ✅ GOOD: Respect cancellation
func safe(ctx context.Context, nums []int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums {
            select {
            case out <- n:
            case <-ctx.Done():
                return  // Exit on cancel
            }
        }
    }()
    return out
}
```

**From Go Blog canonical pattern** (2014):

> "Goroutines are not garbage collected; they must exit explicitly or leak memory/resources indefinitely."

---

## 4. Not Checking context.Done() in Loops

### Problem

```go
// ❌ BAD: Long-running loop ignores cancellation
func process(ctx context.Context, items []Item) error {
    for _, item := range items {
        // Expensive operation (1 second each)
        result := expensive(item)
        emit(result)
    }
    return nil
}

// With 10,000 items: Takes 3 hours even if ctx canceled after 1 minute!
```

**Symptom:** Function doesn't respond to cancellation

### Solution: Check ctx.Done() periodically

```go
// ✅ GOOD: Check cancellation in loop
func process(ctx context.Context, items []Item) error {
    for _, item := range items {
        select {
        case <-ctx.Done():
            return ctx.Err()  // Exit immediately
        default:
        }

        result := expensive(item)
        emit(result)
    }
    return nil
}
```

**Frequency guideline:**

- **Tight loops** (< 1ms per iteration): Check every 100-1000 iterations
- **Medium loops** (1-100ms): Check every iteration
- **Slow loops** (> 100ms): Check every iteration

---

## 5. Blocking on Full Channels Without Timeout

### Problem

```go
// ❌ BAD: Can deadlock if buffer fills
func producer(results chan<- Result) {
    for i := 0; i < 1000; i++ {
        results <- Result{i}  // Blocks if channel full!
    }
}

// Consumer stopped processing
results := make(chan Result, 100)  // Buffer only 100
go producer(results)

// If consumer hangs, producer blocks forever at 101st result
```

**Symptom:** Deadlock when buffer exhausted

### Solution: Use context or timeout

```go
// ✅ GOOD: Respect context in sends
func producer(ctx context.Context, results chan<- Result) error {
    for i := 0; i < 1000; i++ {
        select {
        case results <- Result{i}:
        case <-ctx.Done():
            return ctx.Err()
        }
    }
    return nil
}
```

**Alternative: Larger buffer**

```go
// If producer/consumer rates well-understood
results := make(chan Result, 1000)  // Buffer = max items
```

---

## 6. etcd Lesson: More Isn't Always Better

**From research** (`.claude/.output/research/2026-01-01-202322-production-go-streaming-scanners/github.md` lines 186-190):

### The Concurrency Paradox

**etcd discovery** (51K⭐, powers Kubernetes):

> "A 5-member etcd cluster can tolerate two member failures... Although larger clusters provide better fault tolerance, the write performance suffers"

**Why:**

1. **Consensus overhead**: More nodes = more network round-trips for Raft
2. **Synchronization cost**: Write must replicate to (N/2)+1 nodes
3. **Diminishing returns**: 5→7 nodes = more latency, minimal gain

**Parallel in pipelines:**

- **Too few workers**: CPU underutilized
- **Too many workers**: Context-switching overhead, memory pressure
- **Sweet spot**: Usually 2-4× CPU cores for CPU-bound, 10-50 for I/O-bound

**Production Defaults:**

- **Trivy**: 5 workers (conservative, memory-constrained)
- **TruffleHog**: 20 workers (tuned for secret scanning)
- **Nuclei**: 25 templates (template-level concurrency)

---

## 7. Pipeline Deadlock

### Problem

```go
// ❌ BAD: Circular dependency
func deadlock() {
    c1 := make(chan int)
    c2 := make(chan int)

    go func() {
        c2 <- <-c1  // Waits for c1
    }()

    go func() {
        c1 <- <-c2  // Waits for c2
    }()
}
```

**Symptom:** All goroutines blocked, no progress

### Solution: Proper ordering and buffering

```go
// ✅ GOOD: Break circular dependency
func safe() {
    c1 := make(chan int, 1)  // Buffered
    c2 := make(chan int, 1)

    go func() {
        c1 <- 1  // Send first (doesn't block due to buffer)
        <-c2     // Then receive
    }()

    go func() {
        <-c1     // Receive first
        c2 <- 2  // Then send
    }()
}
```

**Alternative: Use separate sending/receiving goroutines**

---

## 8. Ignoring First Error (Partial Results)

### Problem

```go
// ❌ BAD: Continues after first error
var wg sync.WaitGroup
var mu sync.Mutex
var errors []error

for _, item := range items {
    wg.Add(1)
    go func(i Item) {
        defer wg.Done()
        if err := process(i); err != nil {
            mu.Lock()
            errors = append(errors, err)
            mu.Unlock()
            // Continues processing other items!
        }
    }(item)
}

wg.Wait()
// May have partial results + errors (data corruption risk)
```

**Symptom:** Partial state, data inconsistency

### Solution: errgroup.WithContext fail-fast

From Trivy pattern (research):

> "It exits when any error occurs" - no partial results

```go
// ✅ GOOD: First error cancels all
func process(ctx context.Context, items []Item) error {
    g, ctx := errgroup.WithContext(ctx)

    for _, item := range items {
        item := item
        g.Go(func() error {
            return processItem(ctx, item)
            // First error cancels ctx, stops all workers
        })
    }

    return g.Wait()  // Returns first error
}
```

**Guarantees:**

1. First error cancels context
2. All workers see `ctx.Done()` and exit
3. No partial results emitted
4. Single error returned

---

## Memory Management Anti-Patterns

From `.claude/.output/research/2026-01-01-202322-production-go-streaming-scanners/SYNTHESIS.md` (lines 419-430):

### Anti-Pattern 1: Accumulating Results

```go
// ❌ BAD: Memory grows unbounded
func scanAll(items []Item) []Result {
    var results []Result
    for _, item := range items {
        results = append(results, scan(item))
    }
    return results  // 1M items × 1KB = 1GB RAM
}
```

**Solution: Streaming with callback**

```go
// ✅ GOOD: Streaming, immediate GC
func scanAll(items []Item, emit func(Result)) error {
    for _, item := range items {
        result := scan(item)
        emit(result)
        // result eligible for GC here
    }
    return nil
}
```

### Anti-Pattern 2: Large Channel Buffers

```go
// ❌ BAD: Massive buffer = memory spike
results := make(chan Result, 1000000)  // 1M × 1KB = 1GB!
```

**Solution: Small buffers + bounded workers**

```go
// ✅ GOOD: Memory bounded by workers
results := make(chan Result, workers*2)  // 10 × 1KB = 10KB
```

**Memory Formula:**

```
Peak = (Workers × Per-Item) + (Buffer × Size)
```

**Example:**

- Workers: 10, Per-item: 50MB, Buffer: 20, Size: 1MB
- Peak = (10 × 50MB) + (20 × 1MB) = 520MB

---

## Debugging Techniques

### Detect Goroutine Leaks

```go
func TestNoLeaks(t *testing.T) {
    before := runtime.NumGoroutine()

    // Run pipeline
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    pipeline(ctx, items)

    // Wait for cleanup
    time.Sleep(100 * time.Millisecond)

    after := runtime.NumGoroutine()
    if after > before+1 {  // +1 for test goroutine
        t.Errorf("goroutine leak: before=%d after=%d", before, after)
    }
}
```

### Profile with pprof

```go
import _ "net/http/pprof"

go func() {
    log.Println(http.ListenAndServe("localhost:6060", nil))
}()

// Then: go tool pprof http://localhost:6060/debug/pprof/goroutine
```

### Race Detector

```bash
go test -race ./...
```

**Always run with `-race` in CI** - catches concurrent access bugs.

---

## Production Lessons Summary

| Pitfall                   | Symptom         | Solution                         |
| ------------------------- | --------------- | -------------------------------- |
| **Unbounded goroutines**  | OOM             | Semaphore (bounded workers)      |
| **Forgot close channel**  | Goroutine leak  | `defer close(out)`               |
| **Blocked send**          | Goroutine leak  | Check `ctx.Done()`               |
| **Ignoring cancellation** | Slow shutdown   | Check `ctx.Done()` in loops      |
| **Full channel blocking** | Deadlock        | Use `select` with context        |
| **Too much concurrency**  | Overhead        | Profile, tune to optimal         |
| **Circular dependency**   | Deadlock        | Proper ordering + buffering      |
| **Partial results**       | Data corruption | `errgroup.WithContext` fail-fast |

---

## References

**Production Codebases:**

- [etcd FAQ](https://github.com/etcd-io/etcd) - Concurrency lessons from CNCF project
- [Trivy pkg/parallel/](https://github.com/aquasecurity/trivy) - Bounded pipeline patterns
- [Prometheus tsdb/](https://github.com/prometheus/prometheus) - Time series concurrency

**Official Go Resources:**

- [Go Blog - Pipelines and Cancellation](https://go.dev/blog/pipelines) - Canonical patterns
- [Go Blog - Share Memory By Communicating](https://go.dev/blog/codelab-share) - Channel anti-patterns

**Research:**

- `.claude/.output/research/2026-01-01-202322-production-go-streaming-scanners/SYNTHESIS.md` (lines 378-430)
- `.claude/.output/research/2026-01-01-202322-production-go-streaming-scanners/github.md` (lines 186-190)
- `.claude/.output/research/2026-01-01-go-scanner-architecture-patterns/SYNTHESIS.md` (memory management)
