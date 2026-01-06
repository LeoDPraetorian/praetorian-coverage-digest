# Testing Patterns for Pipelines

**Production testing strategies from Prometheus, Trivy, and Go best practices**

## Overview

**Testing pipeline code requires verifying:**

1. **Functional correctness** - Each stage produces expected output
2. **Concurrency safety** - No race conditions (`go test -race`)
3. **Cancellation** - Respects context.Done(), no goroutine leaks
4. **Error propagation** - Failures cancel entire pipeline
5. **Resource cleanup** - Channels closed, goroutines exit

**Production Reference:** Prometheus `tsdb/wlog/watcher_test.go` demonstrates comprehensive concurrent testing.

From `.claude/.output/research/2026-01-01-go-scanner-architecture-patterns/github.md` (lines 105-127).

---

## Pattern 1: Test Stage Functionality in Isolation

**Goal:** Verify each stage produces correct output

```go
func TestStageProcessing(t *testing.T) {
    ctx := context.Background()
    input := []int{1, 2, 3, 4, 5}

    // Test stage in isolation
    in := generate(ctx, input)
    out := square(ctx, in)

    var results []int
    for n := range out {
        results = append(results, n)
    }

    expected := []int{1, 4, 9, 16, 25}
    if !reflect.DeepEqual(results, expected) {
        t.Errorf("got %v, want %v", results, expected)
    }
}
```

**Key Benefits:**

- ✅ Simple, fast tests
- ✅ Easy to debug failures
- ✅ Independent of other stages
- ✅ Clear input/output validation

---

## Pattern 2: Test Cancellation Behavior

**Goal:** Verify pipeline exits quickly on context cancellation

**From Prometheus watcher_test.go pattern:**

```go
func TestCancellation(t *testing.T) {
    ctx, cancel := context.WithCancel(context.Background())

    // Pipeline with 1000 items (would take 10 seconds without cancellation)
    nums := make([]int, 1000)
    for i := range nums {
        nums[i] = i
    }

    c := pipeline(ctx, nums)

    // Read only 10 items
    for i := 0; i < 10; i++ {
        <-c
    }

    // Cancel and verify quick exit
    cancel()

    start := time.Now()

    // Drain remaining (should exit quickly)
    for range c {
        // Discard
    }

    elapsed := time.Since(start)

    // Should exit within 100ms (not wait for all 1000)
    if elapsed > 100*time.Millisecond {
        t.Errorf("cancellation took too long: %v", elapsed)
    }
}
```

**What this tests:**

- Pipeline respects context cancellation
- Goroutines exit quickly (not after processing all items)
- No blocking on channel sends

---

## Pattern 3: Test Goroutine Leaks

**Goal:** Ensure no goroutines leak when pipeline completes or cancels

```go
func TestNoLeaks(t *testing.T) {
    before := runtime.NumGoroutine()

    ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
    defer cancel()

    c := pipeline(ctx, makeRange(100))

    // Consume all results
    for range c {
    }

    // Wait for goroutine cleanup
    time.Sleep(100 * time.Millisecond)

    after := runtime.NumGoroutine()

    // Allow +1 for test goroutine itself
    if after > before+1 {
        t.Errorf("goroutine leak: before=%d after=%d", before, after)
    }
}
```

**Enhanced version with leak detector:**

```go
import "go.uber.org/goleak"

func TestMain(m *testing.M) {
    goleak.VerifyTestMain(m)
}

func TestPipeline(t *testing.T) {
    defer goleak.VerifyNone(t)

    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    c := pipeline(ctx, items)
    // ... test logic
}
```

**goleak advantages:**

- Automatic goroutine leak detection
- Better error messages (shows leaked goroutine stack traces)
- No manual counting needed

---

## Pattern 4: Test Error Propagation

**Goal:** Verify first error cancels entire pipeline

**From Trivy fail-fast pattern:**

```go
func TestErrorPropagation(t *testing.T) {
    ctx := context.Background()

    // Inject error at item 5
    items := []int{1, 2, 3, 4, -1, 6, 7, 8}  // -1 triggers error

    processFunc := func(n int) (int, error) {
        if n < 0 {
            return 0, fmt.Errorf("negative number: %d", n)
        }
        return n * 2, nil
    }

    err := pipeline(ctx, items, processFunc)

    // Should fail with error about -1
    if err == nil {
        t.Fatal("expected error, got nil")
    }

    if !strings.Contains(err.Error(), "negative number") {
        t.Errorf("wrong error: %v", err)
    }

    // Verify processing stopped (items 6,7,8 not processed)
    // Check via metrics, logs, or result count
}
```

**What this tests:**

- First error stops pipeline (fail-fast)
- Error message preserved
- Partial results not emitted
- errgroup.WithContext behavior

---

## Pattern 5: Test Race Conditions

**Goal:** Detect concurrent access bugs

```bash
go test -race ./...
```

**Example race-prone code:**

```go
// ❌ BAD: Race condition
func process(items []Item) []Result {
    var results []Result  // Shared slice!

    var wg sync.WaitGroup
    for _, item := range items {
        wg.Add(1)
        go func(i Item) {
            defer wg.Done()
            results = append(results, process(i))  // Race!
        }(item)
    }
    wg.Wait()
    return results
}
```

**Race detector output:**

```
WARNING: DATA RACE
Write at 0x00c0001... by goroutine 7:
  main.process.func1()
      /path/to/file.go:42 +0x6d

Previous write at 0x00c0001... by goroutine 6:
  main.process.func1()
      /path/to/file.go:42 +0x6d
```

**Fix:**

```go
// ✅ GOOD: Use channel for results
func process(ctx context.Context, items []Item) []Result {
    results := make(chan Result, len(items))

    g, ctx := errgroup.WithContext(ctx)
    for _, item := range items {
        item := item
        g.Go(func() error {
            result := processItem(item)
            select {
            case results <- result:
            case <-ctx.Done():
                return ctx.Err()
            }
            return nil
        })
    }

    go func() {
        g.Wait()
        close(results)
    }()

    var out []Result
    for r := range results {
        out = append(out, r)
    }

    return out
}
```

---

## Pattern 6: Test with Mocked Slow Operations

**Goal:** Verify pipeline handles slow stages correctly

```go
func TestSlowStage(t *testing.T) {
    ctx := context.Background()

    // Mock slow operation
    slowProcess := func(ctx context.Context, n int) (int, error) {
        time.Sleep(100 * time.Millisecond)  // Simulate slow operation
        return n * 2, nil
    }

    start := time.Now()

    // Pipeline with 10 workers should parallelize
    results := pipelineWithWorkers(ctx, 10, []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}, slowProcess)

    elapsed := time.Since(start)

    // Sequential: 10 × 100ms = 1000ms
    // Parallel (10 workers): ~100ms
    if elapsed > 200*time.Millisecond {
        t.Errorf("too slow: %v (expected ~100ms)", elapsed)
    }

    expected := []int{2, 4, 6, 8, 10, 12, 14, 16, 18, 20}
    if !equalUnordered(results, expected) {
        t.Errorf("got %v, want %v", results, expected)
    }
}
```

**What this tests:**

- Workers actually run in parallel
- Throughput matches expectations
- Buffering doesn't cause blocking

---

## Pattern 7: Test Timeout Behavior

**Goal:** Verify pipeline respects deadlines

```go
func TestTimeout(t *testing.T) {
    // 100ms timeout
    ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
    defer cancel()

    // Slow pipeline (would take 10 seconds without timeout)
    slowFunc := func(n int) int {
        time.Sleep(1 * time.Second)
        return n
    }

    start := time.Now()
    err := pipeline(ctx, []int{1, 2, 3, 4, 5}, slowFunc)
    elapsed := time.Since(start)

    // Should timeout around 100ms
    if err != context.DeadlineExceeded {
        t.Errorf("expected DeadlineExceeded, got %v", err)
    }

    if elapsed > 200*time.Millisecond {
        t.Errorf("timeout took too long: %v", elapsed)
    }
}
```

---

## Pattern 8: Benchmark Throughput

**Goal:** Measure pipeline performance

```go
func BenchmarkPipeline(b *testing.B) {
    ctx := context.Background()
    items := makeRange(1000)

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        results := pipeline(ctx, items)
        if len(results) != 1000 {
            b.Fatalf("wrong result count: %d", len(results))
        }
    }
}

func BenchmarkPipelineParallel(b *testing.B) {
    ctx := context.Background()
    items := makeRange(1000)

    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            results := pipeline(ctx, items)
            if len(results) != 1000 {
                b.Fatalf("wrong result count: %d", len(results))
            }
        }
    })
}
```

**Benchmark output:**

```
BenchmarkPipeline-8               100     10234567 ns/op     1024 B/op    15 allocs/op
BenchmarkPipelineParallel-8       500      2304589 ns/op      512 B/op     8 allocs/op
```

---

## Pattern 9: Table-Driven Concurrency Tests

**Goal:** Test multiple concurrency levels systematically

```go
func TestConcurrencyLevels(t *testing.T) {
    tests := []struct {
        name        string
        workers     int
        items       int
        expectedMax time.Duration
    }{
        {"Sequential", 1, 100, 1000 * time.Millisecond},
        {"Low Concurrency", 5, 100, 200 * time.Millisecond},
        {"High Concurrency", 50, 100, 50 * time.Millisecond},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            ctx := context.Background()
            items := makeRange(tt.items)

            start := time.Now()
            results := pipelineWithWorkers(ctx, tt.workers, items, slowFunc)
            elapsed := time.Since(start)

            if elapsed > tt.expectedMax {
                t.Errorf("%s: took %v, expected max %v", tt.name, elapsed, tt.expectedMax)
            }

            if len(results) != tt.items {
                t.Errorf("wrong result count: %d", len(results))
            }
        })
    }
}
```

---

## Pattern 10: Test Channel Closing Order

**Goal:** Verify channels close in correct sequence

**From Trivy pattern** (research lines 75-82):

```go
func TestChannelClosing(t *testing.T) {
    ctx := context.Background()

    // Track close order
    var closeOrder []string
    var mu sync.Mutex

    trackClose := func(name string, ch chan struct{}) {
        <-ch
        mu.Lock()
        closeOrder = append(closeOrder, name)
        mu.Unlock()
    }

    itemCh := make(chan int)
    resultCh := make(chan int)

    // Monitor closes
    itemChClosed := make(chan struct{})
    resultChClosed := make(chan struct{})

    go func() { trackClose("itemCh", itemChClosed) }()
    go func() { trackClose("resultCh", resultChClosed) }()

    // Run pipeline
    go func() {
        defer close(itemCh)
        defer close(itemChClosed)
        for i := 0; i < 10; i++ {
            itemCh <- i
        }
    }()

    g, ctx := errgroup.WithContext(ctx)
    g.Go(func() error {
        for item := range itemCh {
            resultCh <- item * 2
        }
        return nil
    })

    go func() {
        g.Wait()
        close(resultCh)
        close(resultChClosed)
    }()

    // Consume results
    var results []int
    for r := range resultCh {
        results = append(results, r)
    }

    // Verify close order
    expected := []string{"itemCh", "resultCh"}
    if !reflect.DeepEqual(closeOrder, expected) {
        t.Errorf("wrong close order: %v, want %v", closeOrder, expected)
    }
}
```

**Critical order verified:**

1. Input channel closes first
2. Workers process remaining items
3. Output channel closes after workers done

---

## Testing Checklist

Before merging pipeline code, verify:

- [ ] **Functional tests**: Each stage produces correct output
- [ ] **Race detector**: `go test -race` passes
- [ ] **Cancellation**: Pipeline exits quickly on ctx cancel
- [ ] **Goroutine leaks**: No leaks detected (goleak or manual)
- [ ] **Error propagation**: First error cancels everything
- [ ] **Timeout**: Respects context deadline
- [ ] **Channel closing**: Correct close order verified
- [ ] **Benchmarks**: Performance meets requirements
- [ ] **Concurrency levels**: Works with 1, 10, 100 workers
- [ ] **Resource cleanup**: All channels closed, files closed

---

## Production Testing Tools

### goleak - Goroutine Leak Detector

```bash
go get -u go.uber.org/goleak
```

```go
import "go.uber.org/goleak"

func TestMain(m *testing.M) {
    goleak.VerifyTestMain(m)
}
```

### Race Detector

```bash
go test -race -count=100 ./...
```

**Run frequently** (every commit in CI)

### Benchstat - Compare Benchmarks

```bash
go install golang.org/x/perf/cmd/benchstat@latest

# Before changes
go test -bench=. -count=10 > old.txt

# After changes
go test -bench=. -count=10 > new.txt

# Compare
benchstat old.txt new.txt
```

---

## References

**Production Codebases:**

- [Prometheus tsdb/wlog/watcher_test.go](https://github.com/prometheus/prometheus) - Concurrent testing patterns
- [Trivy pkg/parallel/](https://github.com/aquasecurity/trivy) - Pipeline testing
- [Go standard library testing/](https://github.com/golang/go/tree/master/src/testing) - Benchmark patterns

**Official Go Resources:**

- [Go Blog - Race Detector](https://go.dev/blog/race-detector)
- [Go Testing Package](https://pkg.go.dev/testing)
- [goleak Documentation](https://pkg.go.dev/go.uber.org/goleak)

**Research:**

- `.claude/.output/research/2026-01-01-go-scanner-architecture-patterns/github.md` (lines 105-127)
- `.claude/.output/research/2026-01-01-202322-production-go-streaming-scanners/SYNTHESIS.md` (testing patterns)
