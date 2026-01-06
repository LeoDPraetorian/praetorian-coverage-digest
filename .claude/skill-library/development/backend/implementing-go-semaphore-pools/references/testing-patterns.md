# Testing Patterns for Concurrent Code

## Test 1: Verify Bounded Concurrency

```go
func TestBoundedConcurrency(t *testing.T) {
    const maxConcurrent = 5
    sem := semaphore.NewWeighted(maxConcurrent)

    var current, peak atomic.Int32

    g, ctx := errgroup.WithContext(context.Background())

    for i := 0; i < 100; i++ {
        if err := sem.Acquire(ctx, 1); err != nil {
            t.Fatal(err)
        }

        g.Go(func() error {
            defer sem.Release(1)

            // Track concurrent goroutines
            n := current.Add(1)
            if n > peak.Load() {
                peak.Store(n)
            }

            time.Sleep(10 * time.Millisecond)
            current.Add(-1)

            return nil
        })
    }

    if err := g.Wait(); err != nil {
        t.Fatal(err)
    }

    // Verify we never exceeded limit
    if got := peak.Load(); got != maxConcurrent {
        t.Errorf("peak concurrency = %d, want %d", got, maxConcurrent)
    }
}
```

## Test 2: Verify Context Cancellation

```go
func TestContextCancellation(t *testing.T) {
    sem := semaphore.NewWeighted(1)

    ctx, cancel := context.WithCancel(context.Background())

    // Fill the semaphore
    if err := sem.Acquire(ctx, 1); err != nil {
        t.Fatal(err)
    }

    // Cancel context
    cancel()

    // Verify acquire fails with context error
    err := sem.Acquire(ctx, 1)
    if !errors.Is(err, context.Canceled) {
        t.Errorf("got %v, want context.Canceled", err)
    }
}
```

## Test 3: Verify Error Propagation

```go
func TestErrorPropagation(t *testing.T) {
    expectedErr := errors.New("intentional error")

    err := ProcessItems(context.Background(), []Item{
        {ID: 1},
        {ID: 2, ShouldFail: true},  // Will trigger error
        {ID: 3},
    }, 2)

    if !errors.Is(err, expectedErr) {
        t.Errorf("got %v, want %v", err, expectedErr)
    }
}

func ProcessItems(ctx context.Context, items []Item, maxConcurrent int) error {
    g, ctx := errgroup.WithContext(ctx)
    sem := semaphore.NewWeighted(int64(maxConcurrent))

    for _, item := range items {
        item := item
        if err := sem.Acquire(ctx, 1); err != nil {
            return err
        }

        g.Go(func() error {
            defer sem.Release(1)
            if item.ShouldFail {
                return expectedErr
            }
            return processItem(ctx, item)
        })
    }

    return g.Wait()
}
```

## Test 4: Verify Rate Limiting

```go
func TestRateLimit(t *testing.T) {
    const rps = 10  // 10 requests per second
    limiter := rate.NewLimiter(rps, 1)

    start := time.Now()
    requests := 100

    for i := 0; i < requests; i++ {
        if err := limiter.Wait(context.Background()); err != nil {
            t.Fatal(err)
        }
    }

    duration := time.Since(start)
    expected := time.Duration(requests/rps) * time.Second

    // Allow 10% variance
    tolerance := expected / 10
    if duration < expected-tolerance || duration > expected+tolerance {
        t.Errorf("duration = %v, want ~%v", duration, expected)
    }
}
```

## Test 5: Benchmark Comparison

```go
func BenchmarkSequential(b *testing.B) {
    items := makeTestItems(b.N)

    for _, item := range items {
        processItem(context.Background(), item)
    }
}

func BenchmarkSemaphore(b *testing.B) {
    items := makeTestItems(b.N)
    sem := semaphore.NewWeighted(20)

    g, ctx := errgroup.WithContext(context.Background())

    for _, item := range items {
        item := item
        sem.Acquire(ctx, 1)

        g.Go(func() error {
            defer sem.Release(1)
            return processItem(ctx, item)
        })
    }

    g.Wait()
}

func BenchmarkWorkerPool(b *testing.B) {
    items := makeTestItems(b.N)
    numWorkers := 20

    itemChan := make(chan Item, numWorkers*2)
    g, ctx := errgroup.WithContext(context.Background())

    for i := 0; i < numWorkers; i++ {
        g.Go(func() error {
            for item := range itemChan {
                if err := processItem(ctx, item); err != nil {
                    return err
                }
            }
            return nil
        })
    }

    g.Go(func() error {
        defer close(itemChan)
        for _, item := range items {
            itemChan <- item
        }
        return nil
    })

    g.Wait()
}
```

## Test 6: Verify Resource Cleanup

```go
func TestResourceCleanup(t *testing.T) {
    const maxConcurrent = 5
    sem := semaphore.NewWeighted(maxConcurrent)

    // Process items
    ProcessItems(context.Background(), makeTestItems(100), maxConcurrent)

    // Verify semaphore is fully released
    // Should be able to acquire full capacity
    for i := 0; i < maxConcurrent; i++ {
        if !sem.TryAcquire(1) {
            t.Errorf("failed to acquire slot %d, semaphore not fully released", i)
        }
    }
}
```

## Test 7: Stress Test for Race Conditions

```go
func TestConcurrentAccess(t *testing.T) {
    if testing.Short() {
        t.Skip("Skipping stress test in short mode")
    }

    const (
        goroutines = 100
        iterations = 1000
    )

    sem := semaphore.NewWeighted(10)
    var counter atomic.Int64

    g, ctx := errgroup.WithContext(context.Background())

    for i := 0; i < goroutines; i++ {
        g.Go(func() error {
            for j := 0; j < iterations; j++ {
                if err := sem.Acquire(ctx, 1); err != nil {
                    return err
                }

                counter.Add(1)
                time.Sleep(time.Microsecond)

                sem.Release(1)
            }
            return nil
        })
    }

    if err := g.Wait(); err != nil {
        t.Fatal(err)
    }

    expected := int64(goroutines * iterations)
    if got := counter.Load(); got != expected {
        t.Errorf("counter = %d, want %d", got, expected)
    }
}
```
