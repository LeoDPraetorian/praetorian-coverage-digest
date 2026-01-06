# Production Case Studies

## TruffleHog (24K stars) - Multi-Stage Worker Pools

**Project**: Secret scanning engine
**Pattern**: Stage-specific worker multipliers

### Architecture

```go
// Stage 1: Source enumeration (I/O-bound)
sourceWorkers := runtime.NumCPU() * 4  // 32 on 8-core

// Stage 2: Secret detection (CPU-bound)
detectorWorkers := runtime.NumCPU()    // 8 on 8-core

// Stage 3: Verification (network-bound)
verifyWorkers := runtime.NumCPU() * 10  // 80 on 8-core
```

### Why It Works

**Stage 1** (Source enumeration):

- I/O-bound: Reading files from disk
- High multiplier (4x) because tasks wait on disk
- Minimal CPU usage per worker

**Stage 2** (Secret detection):

- CPU-bound: Regex matching, entropy calculation
- Match CPU cores (1x) for maximum throughput
- Each worker saturates one core

**Stage 3** (Verification):

- Network-bound: HTTP requests to verify secrets
- Very high multiplier (10x) because tasks wait on network
- Network latency dominates execution time

### Key Takeaway

**Tune each pipeline stage independently based on bottleneck:**

- Disk I/O → 4x CPUs
- CPU computation → 1x CPUs
- Network I/O → 10x CPUs

## Nuclei (26K stars) - Rate Limiting at Scale

**Project**: Vulnerability scanner
**Pattern**: Rate limiter + semaphore for external API calls

### Implementation

```go
import (
    "golang.org/x/time/rate"
    "golang.org/x/sync/semaphore"
)

type RateLimiter struct {
    limiter *rate.Limiter
    sem     *semaphore.Weighted
}

// Rate limit at 150 req/sec with burst of 10
func NewRateLimiter(rps int, maxConcurrent int) *RateLimiter {
    return &RateLimiter{
        limiter: rate.NewLimiter(rate.Limit(rps), 10),
        sem:     semaphore.NewWeighted(int64(maxConcurrent)),
    }
}

func (r *RateLimiter) Execute(ctx context.Context, target string) error {
    // Rate limit first
    if err := r.limiter.Wait(ctx); err != nil {
        return err
    }

    // Then acquire concurrency slot
    if err := r.sem.Acquire(ctx, 1); err != nil {
        return err
    }
    defer r.sem.Release(1)

    return executeTemplate(ctx, target)
}
```

### Why It Works

**Two-layer control:**

1. **Rate limiter**: Prevents API throttling (429 responses)
2. **Semaphore**: Prevents resource exhaustion (memory, connections)

**Real-world constraints:**

- External API limit: 150 req/sec
- Memory limit: 2GB
- Connection pool: 100 connections

**Result:**

- 150 req/sec sustained throughput
- No 429 rate limit errors
- Stable memory usage

### Key Takeaway

**Combine rate limiter + semaphore when calling external APIs:**

- Rate limiter enforces API provider limits
- Semaphore enforces local resource limits

## Trivy (30K stars) - Reusable Parallel Utility

**Project**: Container vulnerability scanner
**Pattern**: Abstract bounded concurrency into utility function

### Implementation

```go
// pkg/parallel/parallel.go
package parallel

import (
    "context"
    "golang.org/x/sync/errgroup"
)

// Run executes fn concurrently with bounded workers
func Run(ctx context.Context, workers int, tasks int, fn func(ctx context.Context, idx int) error) error {
    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(workers)  // Go 1.20+ built-in

    for i := 0; i < tasks; i++ {
        i := i
        g.Go(func() error {
            return fn(ctx, i)
        })
    }

    return g.Wait()
}
```

### Usage

```go
// Scan 1000 images with 20 workers
err := parallel.Run(ctx, 20, 1000, func(ctx context.Context, idx int) error {
    return scanImage(ctx, images[idx])
})
```

### Why It Works

**Abstraction benefits:**

- ✅ Hide errgroup.SetLimit complexity
- ✅ Consistent concurrency control across codebase
- ✅ Easy to test (mock the function)
- ✅ Clear API (workers, tasks, function)

**Used throughout Trivy:**

- Image layer scanning
- Package vulnerability matching
- SBOM generation
- Report formatting

### Key Takeaway

**Abstract bounded concurrency into reusable utilities:**

- DRY principle for concurrency control
- Consistent behavior across features
- Easier to tune performance globally

## Performance Summary

| Project    | Pattern                  | Workload | Workers   | Throughput   |
| ---------- | ------------------------ | -------- | --------- | ------------ |
| TruffleHog | Multi-stage pools        | Mixed    | 4x/1x/10x | 10K+ items/s |
| Nuclei     | Rate limiter + semaphore | Network  | 150 req/s | 150 req/s    |
| Trivy      | Utility abstraction      | CPU+I/O  | 20        | 5K+ scans/s  |
