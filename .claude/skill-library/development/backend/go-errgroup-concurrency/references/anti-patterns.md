# Anti-Patterns to Avoid

## Anti-Pattern 1: Missing Loop Variable Capture (Go < 1.22)

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

## Anti-Pattern 2: Swallowed Errors

```go
// WRONG - Error ignored
g.Wait()

// CORRECT - Always check the error
if err := g.Wait(); err != nil {
    return fmt.Errorf("parallel processing failed: %w", err)
}
```

## Anti-Pattern 3: No Concurrency Limit

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

## Anti-Pattern 4: Modifying Limit While Active

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

## Anti-Pattern 5: Reusing Group After Wait

```go
// WRONG - Undefined behavior
g.Wait()
g.Go(func() error { ... })  // Don't do this!

// CORRECT - Create new group for new work
var g2 errgroup.Group
g2.SetLimit(10)
g2.Go(func() error { ... })
```

## Anti-Pattern 6: Ignoring Context Cancellation

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

## Anti-Pattern 7: Silent Batch Failures

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
