# Concurrency Testing with errgroup

**Testing patterns for concurrent operations using `golang.org/x/sync/errgroup`.**

## Basic errgroup Pattern

```go
import "golang.org/x/sync/errgroup"

func (task *Integration) DiscoverConcurrent(items []Item) error {
    g := new(errgroup.Group)
    g.SetLimit(10)  // Max 10 concurrent goroutines

    for _, item := range items {
        item := item  // Capture loop variable

        g.Go(func() error {
            asset, err := task.processItem(item)
            if err != nil {
                return fmt.Errorf("failed to process %s: %w", item.ID, err)
            }

            task.job.Send(asset)
            return nil
        })
    }

    return g.Wait()  // Wait for all goroutines
}
```

## Testing Concurrency

### Test 1: Verify Concurrent Execution

```go
func TestIntegration_ConcurrentDiscovery(t *testing.T) {
    var mu sync.Mutex
    processedItems := make(map[string]bool)
    maxConcurrent := 0
    currentConcurrent := 0

    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        mu.Lock()
        currentConcurrent++
        if currentConcurrent > maxConcurrent {
            maxConcurrent = currentConcurrent
        }
        mu.Unlock()

        // Simulate processing time
        time.Sleep(50 * time.Millisecond)

        mu.Lock()
        itemID := r.URL.Path
        processedItems[itemID] = true
        currentConcurrent--
        mu.Unlock()

        w.WriteHeader(http.StatusOK)
    }))
    defer server.Close()

    integration := model.NewIntegration("test", server.URL)
    job := model.NewJob("test", &integration)

    task := NewIntegration(job, &integration, base.WithMaxConcurrent(5))
    aws := mock.NewMockAWS("test@example.com")

    inv := invoker.NewInvoker(aws, task)
    err := inv.Invoke()

    require.NoError(t, err)
    assert.LessOrEqual(t, maxConcurrent, 5, "Should not exceed concurrency limit")
    assert.Greater(t, maxConcurrent, 1, "Should use concurrency")
}
```

### Test 2: Race Condition Detection

**Run with `-race` flag**:

```bash
go test -race ./integrations/service/
```

```go
func TestIntegration_NoRaceConditions(t *testing.T) {
    integration := model.NewIntegration("test", "example.com")
    job := model.NewJob("test", &integration)

    task := NewIntegration(job, &integration, mock.MockCollectors(&integration, &Integration{})...)
    aws := mock.NewMockAWS("test@example.com")

    inv := invoker.NewInvoker(aws, task)
    err := inv.Invoke()

    require.NoError(t, err)

    // If -race detects issues, test will fail
}
```

### Test 3: Error Propagation

```go
func TestIntegration_ErrorPropagation(t *testing.T) {
    failItem := "item-5"

    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        itemID := r.URL.Query().Get("id")

        if itemID == failItem {
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(map[string]string{"error": "processing_failed"})
            return
        }

        w.WriteHeader(http.StatusOK)
    }))
    defer server.Close()

    integration := model.NewIntegration("test", server.URL)
    job := model.NewJob("test", &integration)

    task := NewIntegration(job, &integration, base.WithHTTPBaseURL(server.URL))
    aws := mock.NewMockAWS("test@example.com")

    inv := invoker.NewInvoker(aws, task)
    err := inv.Invoke()

    // errgroup should propagate the first error
    require.Error(t, err)
    require.Contains(t, err.Error(), "processing_failed")
}
```

## Loop Variable Capture

### ❌ WRONG (Race Condition)

```go
for _, item := range items {
    g.Go(func() error {
        // BUG: 'item' may change before goroutine runs
        return task.processItem(item)
    })
}
```

### ✅ CORRECT (Capture Variable)

```go
for _, item := range items {
    item := item  // Capture loop variable

    g.Go(func() error {
        return task.processItem(item)
    })
}
```

## Testing SetLimit

```go
func TestIntegration_SetLimitRespected(t *testing.T) {
    var mu sync.Mutex
    activeCounts := []int{}
    activeGoroutines := 0

    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        mu.Lock()
        activeGoroutines++
        activeCounts = append(activeCounts, activeGoroutines)
        mu.Unlock()

        time.Sleep(100 * time.Millisecond)

        mu.Lock()
        activeGoroutines--
        mu.Unlock()

        w.WriteHeader(http.StatusOK)
    }))
    defer server.Close()

    integration := model.NewIntegration("test", server.URL)
    job := model.NewJob("test", &integration)

    task := NewIntegration(job, &integration,
        base.WithHTTPBaseURL(server.URL),
        base.WithMaxConcurrent(3),  // Limit to 3 concurrent goroutines
    )
    aws := mock.NewMockAWS("test@example.com")

    inv := invoker.NewInvoker(aws, task)
    err := inv.Invoke()

    require.NoError(t, err)

    // Verify max concurrent never exceeded 3
    maxObserved := 0
    for _, count := range activeCounts {
        if count > maxObserved {
            maxObserved = count
        }
    }
    assert.LessOrEqual(t, maxObserved, 3, "Should not exceed SetLimit")
}
```

## Timeout Testing

```go
func TestIntegration_Timeout(t *testing.T) {
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Simulate slow response
        time.Sleep(2 * time.Second)
        w.WriteHeader(http.StatusOK)
    }))
    defer server.Close()

    ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
    defer cancel()

    integration := model.NewIntegration("test", server.URL)
    job := model.NewJobWithContext(ctx, "test", &integration)

    task := NewIntegration(job, &integration, base.WithHTTPBaseURL(server.URL))
    aws := mock.NewMockAWS("test@example.com")

    inv := invoker.NewInvoker(aws, task)
    err := inv.Invoke()

    require.Error(t, err)
    require.ErrorIs(t, err, context.DeadlineExceeded)
}
```

## Best Practices

1. ✅ Always use `item := item` to capture loop variables
2. ✅ Run tests with `-race` flag to detect data races
3. ✅ Use `SetLimit()` to prevent goroutine explosion
4. ✅ Test error propagation (first error stops all)
5. ✅ Verify concurrency limits are respected
6. ✅ Use mutexes for shared state in tests
7. ✅ Test timeout scenarios with context

## Common Mistakes

### Mistake 1: Not Capturing Loop Variable

```go
// ❌ WRONG
for _, item := range items {
    g.Go(func() error {
        return task.processItem(item)  // Race condition!
    })
}
```

### Mistake 2: Not Using SetLimit

```go
// ❌ WRONG (can spawn thousands of goroutines)
g := new(errgroup.Group)
for _, item := range allItems {  // allItems could be huge
    item := item
    g.Go(func() error {
        return task.processItem(item)
    })
}
```

### Mistake 3: Ignoring Errors

```go
// ❌ WRONG
g.Go(func() error {
    task.processItem(item)  // Ignoring error
    return nil
})
```

## References

- Official errgroup documentation: https://pkg.go.dev/golang.org/x/sync/errgroup
- Chariot errgroup usage: Search for `errgroup.Group` in `modules/chariot/backend/pkg/tasks/integrations/`
- Go race detector: https://go.dev/blog/race-detector
