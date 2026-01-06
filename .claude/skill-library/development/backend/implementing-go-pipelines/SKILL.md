---
name: implementing-go-pipelines
description: Use when implementing multi-stage processing pipelines in Go following the official Go blog canonical pattern - streaming data processing, producer-consumer patterns, graceful cancellation with done channel. Handles "goroutine leak", "pipeline deadlock", "memory exhaustion from unbuffered channels". Complements go-errgroup-concurrency and implementing-go-semaphore-pools
allowed-tools: Read, Grep, Glob, LSP
---

# Implementing Go Pipelines

**Multi-stage processing pipelines following the official Go blog canonical pattern (2014, still authoritative).**

## When to Use

Use this skill when:

- Processing data in multiple stages (read → transform → write)
- Streaming large datasets that don't fit in memory
- Implementing producer-consumer patterns
- Need graceful cancellation across stages
- Overlapping I/O, CPU, and network operations for throughput
- Building ETL (Extract, Transform, Load) systems

**Complements:** `go-errgroup-concurrency` (error aggregation), `implementing-go-semaphore-pools` (bounded concurrency per stage)

**Important:** You MUST use TodoWrite before starting to track all steps

## Official Pattern (Go Blog, 2014)

**Pipeline Definition**: Series of stages connected by channels

- Each stage receives values from upstream via inbound channels
- Each stage performs processing
- Each stage sends values downstream via outbound channels
- **Stages close outbound channels when all sends are done**

**Source**: [Go Blog - Pipelines and Cancellation](https://go.dev/blog/pipelines)

## Critical Principle: Goroutines Are NOT Garbage Collected

**"Goroutines are not garbage collected; they must exit explicitly or leak memory/resources indefinitely."**

**What this means:**

- ❌ Blocked goroutines stay alive forever
- ❌ Unbounded goroutine creation leads to OOM
- ✅ Must provide explicit exit mechanism (done channel)
- ✅ All goroutines must respect cancellation

## Basic Pipeline Pattern

### Three-Stage Example

```go
func Pipeline(ctx context.Context, nums []int) <-chan int {
    // Stage 1: Generator
    gen := func() <-chan int {
        out := make(chan int)
        go func() {
            defer close(out)
            for _, n := range nums {
                select {
                case out <- n:
                case <-ctx.Done():
                    return  // Exit on cancellation
                }
            }
        }()
        return out
    }

    // Stage 2: Square
    sq := func(in <-chan int) <-chan int {
        out := make(chan int)
        go func() {
            defer close(out)
            for n := range in {
                select {
                case out <- n * n:
                case <-ctx.Done():
                    return
                }
            }
        }()
        return out
    }

    // Stage 3: Filter evens
    filter := func(in <-chan int) <-chan int {
        out := make(chan int)
        go func() {
            defer close(out)
            for n := range in {
                if n%2 == 0 {
                    select {
                    case out <- n:
                    case <-ctx.Done():
                        return
                    }
                }
            }
        }()
        return out
    }

    // Connect stages
    return filter(sq(gen()))
}
```

**Key elements:**

- ✅ Each stage closes its outbound channel (`defer close(out)`)
- ✅ Each stage respects context cancellation (`<-ctx.Done()`)
- ✅ Goroutines exit explicitly, no leaks

## Explicit Cancellation Pattern

### Done Channel (Canonical Pattern)

```go
func stage(done <-chan struct{}, in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            select {
            case out <- n:
            case <-done:
                return  // Broadcast received, exit immediately
            }
        }
    }()
    return out
}

// Usage
done := make(chan struct{})
defer close(done)  // Broadcast cancellation to all stages

c := stage(done, gen(done, nums))
```

**Why it works:**

- Closing `done` broadcasts to ALL stages simultaneously
- Stages exit immediately on `<-done`
- No goroutine leaks, even on early exit

### Context-Based Cancellation (Modern)

```go
func Pipeline(ctx context.Context, nums []int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums {
            select {
            case out <- n:
            case <-ctx.Done():
                return  // Context canceled
            }
        }
    }()
    return out
}

// Usage
ctx, cancel := context.WithCancel(context.Background())
defer cancel()  // Broadcast cancellation

c := Pipeline(ctx, nums)
```

**See:** [references/cancellation-patterns.md](references/cancellation-patterns.md)

## Buffered Channels for Throughput

### Sizing Guidelines

| Buffer Size | Use Case                           | Memory Impact | Throughput |
| ----------- | ---------------------------------- | ------------- | ---------- |
| 0 (unbuf)   | Synchronization, low throughput    | Minimal       | Slowest    |
| 10-100      | Memory-constrained                 | Low           | Moderate   |
| 100-1000    | Balanced, smooth flow (TruffleHog) | Medium        | High       |
| 1000+       | High variance, prevent blocking    | High          | Highest    |

### Example: Buffered Pipeline

```go
func generate(ctx context.Context, nums []int) <-chan int {
    out := make(chan int, 100)  // Buffer 100 items
    go func() {
        defer close(out)
        for _, n := range nums {
            select {
            case out <- n:
            case <-ctx.Done():
                return
            }
        }
    }()
    return out
}
```

**Why buffer:**

- Smooths variance in stage processing times
- Prevents blocking when downstream is temporarily slow
- Increases overall pipeline throughput

**Trade-off:** More memory for buffered items

## Production Example: TruffleHog Multi-Stage Pipeline

**Achieves 40K+ items/hour** by overlapping I/O, CPU, and network operations.

### Architecture

```go
// Stage 1: Chunk source (I/O-bound)
chunkChan := make(chan Chunk, 100)
// Workers: 1 (single source)

// Stage 2: Detect patterns (CPU-bound)
detectChan := make(chan Detection, 1000)
// Workers: concurrency × 3
// Buffer: 1000 (high variance in chunk sizes)

// Stage 3: Verify findings (Network-bound)
verifyChan := make(chan Verified, 100)
// Workers: concurrency × 2
// Buffer: 100 (network has natural buffering)

// Stage 4: Notify results (I/O-bound)
resultChan := make(chan Result, 100)
// Workers: concurrency × 1
// Buffer: 100 (downstream is fast)
```

### Stage-Specific Worker Tuning

**Why different multipliers:**

- **Stage 1 (I/O)**: 1 worker, reads from disk sequentially
- **Stage 2 (CPU)**: 3× workers, CPU-bound pattern matching
- **Stage 3 (Network)**: 2× workers, network latency
- **Stage 4 (I/O)**: 1× workers, fast database writes

**Key insight:** Tune each stage independently based on bottleneck type.

**See:** [references/trufflehog-architecture.md](references/trufflehog-architecture.md)

## Fan-Out/Fan-In Pattern

### Fan-Out: Multiple Workers per Stage

```go
func fanOut(ctx context.Context, in <-chan int, workers int) []<-chan int {
    outs := make([]<-chan int, workers)

    for i := 0; i < workers; i++ {
        out := make(chan int)
        outs[i] = out

        go func() {
            defer close(out)
            for n := range in {
                result := expensiveOperation(n)
                select {
                case out <- result:
                case <-ctx.Done():
                    return
                }
            }
        }()
    }

    return outs
}
```

### Fan-In: Merge Multiple Channels

```go
func fanIn(ctx context.Context, channels ...<-chan int) <-chan int {
    out := make(chan int)
    var wg sync.WaitGroup

    for _, c := range channels {
        wg.Add(1)
        go func(ch <-chan int) {
            defer wg.Done()
            for n := range ch {
                select {
                case out <- n:
                case <-ctx.Done():
                    return
                }
            }
        }(c)
    }

    go func() {
        wg.Wait()
        close(out)
    }()

    return out
}
```

### Combined: Parallel Processing

```go
func parallel(ctx context.Context, in <-chan int, workers int) <-chan int {
    outs := fanOut(ctx, in, workers)
    return fanIn(ctx, outs...)
}
```

**See:** [references/fan-out-fan-in-patterns.md](references/fan-out-fan-in-patterns.md)

## Common Pitfalls

### 1. Goroutine Leak from Blocked Send

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

### 2. Forgetting to Close Channels

```go
// ❌ BAD: Downstream goroutines hang waiting for close
func noClose(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        for n := range in {
            out <- n * 2
        }
        // Forgot close(out)!
    }()
    return out
}

// ✅ GOOD: Always defer close
func withClose(in <-chan int) <-chan int {
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

### 3. Not Draining Channels on Exit

```go
// ❌ BAD: Upstream blocked trying to send
ctx, cancel := context.WithCancel(context.Background())
c := pipeline(ctx, nums)

// Read only first value
val := <-c
cancel()  // Upstream still trying to send!

// ✅ GOOD: Drain channel or use buffered channel
ctx, cancel := context.WithCancel(context.Background())
c := pipeline(ctx, nums)

val := <-c
cancel()

// Drain remaining
for range c {
    // Discard
}
```

**See:** [references/common-pitfalls.md](references/common-pitfalls.md)

## Testing Strategies

### Test Pipeline Cancellation

```go
func TestCancellation(t *testing.T) {
    ctx, cancel := context.WithCancel(context.Background())

    // Create pipeline with 1000 items
    c := Pipeline(ctx, makeRange(1000))

    // Read only 10 items
    for i := 0; i < 10; i++ {
        <-c
    }

    // Cancel early
    cancel()

    // Verify goroutines exit (no leaks)
    time.Sleep(100 * time.Millisecond)
    // Check with runtime.NumGoroutine() or leak detector
}
```

### Test Stage Isolation

```go
func TestStageIsolation(t *testing.T) {
    ctx := context.Background()

    // Test each stage independently
    gen := generate(ctx, []int{1, 2, 3})
    sq := square(ctx, gen)

    var results []int
    for n := range sq {
        results = append(results, n)
    }

    expected := []int{1, 4, 9}
    if !reflect.DeepEqual(results, expected) {
        t.Errorf("got %v, want %v", results, expected)
    }
}
```

**See:** [references/testing-patterns.md](references/testing-patterns.md)

## Quick Reference

| Pattern              | Use When                          | Code Snippet                               |
| -------------------- | --------------------------------- | ------------------------------------------ |
| Basic pipeline       | Linear stage processing           | `stage1() → stage2() → stage3()`           |
| Done channel         | Explicit cancellation             | `defer close(done)`                        |
| Context cancellation | Modern cancellation (Go 1.7+)     | `ctx.Done()`                               |
| Buffered channels    | Smooth throughput variance        | `make(chan T, 100)`                        |
| Fan-out              | Parallel processing per stage     | Multiple goroutines read from same channel |
| Fan-in               | Merge results from parallel stage | `sync.WaitGroup` + merge goroutine         |
| Graceful shutdown    | Drain channels on cancel          | `for range c {}` after cancel              |

## Performance Characteristics

| Pattern                  | Throughput | Memory   | Complexity |
| ------------------------ | ---------- | -------- | ---------- |
| Unbuffered pipeline      | Low        | Minimal  | Low        |
| Buffered pipeline        | High       | Moderate | Low        |
| Fan-out (parallel)       | Very high  | High     | Medium     |
| Multi-stage (TruffleHog) | 40K/hour   | Moderate | High       |

## References

**Official Go resources:**

- [Go Blog - Pipelines and Cancellation](https://go.dev/blog/pipelines) - CANONICAL pattern (2014)
- [Go Blog - Advanced Concurrency Patterns](https://go.dev/blog/io2013-talk-concurrency)

**Production examples:**

- Research: `.claude/.output/research/2026-01-01-go-scanner-architecture-patterns/github.md` (TruffleHog Engine)

## Related Skills

- `go-errgroup-concurrency` - Error aggregation across pipeline stages
- `implementing-go-semaphore-pools` - Bounded concurrency per stage
- `designing-go-interfaces` - Interface design for pipeline components
- `debugging-systematically` - Debug goroutine leaks and deadlocks
- `gateway-backend` - Go backend patterns and architectures
