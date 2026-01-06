# Common Pitfalls

## 1. Forgetting defer Release

### Problem

```go
// ❌ BAD: Resource leak on error
sem.Acquire(ctx, 1)
if err := process(); err != nil {
    return err  // sem.Release(1) never called!
}
sem.Release(1)
```

**Impact**: Semaphore slot permanently leaked, reduces available concurrency

### Solution

```go
// ✅ GOOD: Always defer
sem.Acquire(ctx, 1)
defer sem.Release(1)
return process()
```

## 2. Acquiring Inside Goroutine

### Problem

```go
// ❌ BAD: Creates 1000 goroutines before any acquire
for _, item := range items {
    g.Go(func() error {
        sem.Acquire(ctx, 1)  // All goroutines spawn first!
        defer sem.Release(1)
        return process(item)
    })
}
```

**Impact**: Memory spike from unbounded goroutine creation

### Solution

```go
// ✅ GOOD: Acquire before spawning
for _, item := range items {
    sem.Acquire(ctx, 1)  // Blocks when at capacity
    g.Go(func() error {
        defer sem.Release(1)
        return process(item)
    })
}
```

## 3. Ignoring Context Cancellation

### Problem

```go
// ❌ BAD: Acquire blocks forever if context canceled
sem.Acquire(context.Background(), 1)
defer sem.Release(1)
```

**Impact**: Goroutine hangs, never completes

### Solution

```go
// ✅ GOOD: Respect context
if err := sem.Acquire(ctx, 1); err != nil {
    return err  // Context canceled or deadline exceeded
}
defer sem.Release(1)
```

## 4. Wrong Semaphore Size

### Problem

```go
// ❌ BAD: Semaphore size too large for CPU-bound
sem := semaphore.NewWeighted(1000)  // 1000 goroutines for 8 cores!
```

**Impact**: Context switching overhead, cache thrashing, worse performance than sequential

### Solution

```go
// ✅ GOOD: Match workload type
// CPU-bound
sem := semaphore.NewWeighted(int64(runtime.NumCPU()))

// I/O-bound
sem := semaphore.NewWeighted(50)
```

## 5. Blocking in Worker

### Problem

```go
// ❌ BAD: Worker holds semaphore while waiting
g.Go(func() error {
    defer sem.Release(1)
    time.Sleep(10 * time.Second)  // Wastes slot!
    return process()
})
```

**Impact**: Reduces effective concurrency, wastes resources

### Solution

```go
// ✅ GOOD: Release before blocking, reacquire after
g.Go(func() error {
    defer sem.Release(1)

    // Release slot before long wait
    sem.Release(1)
    time.Sleep(10 * time.Second)
    sem.Acquire(ctx, 1)

    return process()
})
```

## 6. Not Handling Errors from Acquire

### Problem

```go
// ❌ BAD: Ignores acquire error
sem.Acquire(ctx, 1)
defer sem.Release(1)  // Release called even if acquire failed!
```

**Impact**: Over-release (release more than acquired), corrupts semaphore state

### Solution

```go
// ✅ GOOD: Check acquire error
if err := sem.Acquire(ctx, 1); err != nil {
    return err  // Don't defer Release if Acquire failed
}
defer sem.Release(1)
```

## 7. Mismatched Acquire/Release Weights

### Problem

```go
// ❌ BAD: Acquire 10, release 1
sem.Acquire(ctx, 10)
defer sem.Release(1)  // Oops, leaks 9 units!
```

**Impact**: Semaphore capacity permanently reduced

### Solution

```go
// ✅ GOOD: Match weights exactly
weight := int64(10)
sem.Acquire(ctx, weight)
defer sem.Release(weight)
```

## 8. Using Semaphore for Mutual Exclusion

### Problem

```go
// ❌ BAD: Semaphore as mutex (overkill)
sem := semaphore.NewWeighted(1)

func update() {
    sem.Acquire(ctx, 1)
    defer sem.Release(1)
    counter++  // Critical section
}
```

**Impact**: Slower and more complex than sync.Mutex

### Solution

```go
// ✅ GOOD: Use sync.Mutex for mutual exclusion
var mu sync.Mutex

func update() {
    mu.Lock()
    defer mu.Unlock()
    counter++
}
```

## 9. Deadlock with Multiple Semaphores

### Problem

```go
// ❌ BAD: Acquire order mismatch causes deadlock
// Goroutine A:
semA.Acquire(ctx, 1)
semB.Acquire(ctx, 1)

// Goroutine B:
semB.Acquire(ctx, 1)  // Acquires in reverse order!
semA.Acquire(ctx, 1)
```

**Impact**: Deadlock when both goroutines wait for each other

### Solution

```go
// ✅ GOOD: Consistent acquire order
// Both goroutines:
semA.Acquire(ctx, 1)
semB.Acquire(ctx, 1)
```

## 10. Not Using TryAcquire for Non-Blocking

### Problem

```go
// ❌ BAD: Acquire blocks even when you want to skip
if !available() {
    sem.Acquire(ctx, 1)  // Blocks waiting!
    defer sem.Release(1)
    process()
}
```

### Solution

```go
// ✅ GOOD: TryAcquire for non-blocking attempt
if sem.TryAcquire(1) {
    defer sem.Release(1)
    process()
} else {
    // Skip if not available
    log.Println("Skipped: semaphore full")
}
```
