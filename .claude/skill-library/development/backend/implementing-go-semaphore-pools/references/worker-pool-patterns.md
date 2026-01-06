# Worker Pool Patterns

Production patterns for bounded concurrency with worker pools, extracted from tools with 252K combined GitHub stars.

---

## Basic Worker Pool with errgroup

**Pattern:** Fixed number of workers processing items from a channel.

```go
func ProcessItems(ctx context.Context, items []Item, numWorkers int) error {
    itemChan := make(chan Item, numWorkers*2)  // Buffered for efficiency
    g, ctx := errgroup.WithContext(ctx)

    // Start worker goroutines
    for i := 0; i < numWorkers; i++ {
        workerID := i
        g.Go(func() error {
            for item := range itemChan {
                if err := processItem(ctx, workerID, item); err != nil {
                    return fmt.Errorf("worker %d: %w", workerID, err)
                }
            }
            return nil
        })
    }

    // Feed work to workers
    g.Go(func() error {
        defer close(itemChan)  // Signal workers to stop
        for _, item := range items {
            select {
            case itemChan <- item:
            case <-ctx.Done():
                return ctx.Err()
            }
        }
        return nil
    })

    return g.Wait()
}
```

**Source:** [Trivy pkg/parallel/walk.go](https://github.com/aquasecurity/trivy)

**When to use:**

- ✅ Processing independent items (no dependencies between items)
- ✅ Bounded resource consumption (CPU, memory, connections)
- ✅ Simple error handling (first error cancels all workers)

**Avoid when:**

- ❌ Items have dependencies (use pipeline pattern instead)
- ❌ Need fine-grained per-item resource control (use weighted semaphore)

---

## Trivy Generic Pipeline Pattern

**Pattern:** Reusable generic pipeline with bounded workers.

**Source:** [Trivy pkg/parallel/pipeline.go](https://github.com/aquasecurity/trivy) (30K ⭐)

```go
// Generic pipeline with bounded concurrency
type Pipeline[T, U any] struct {
    numWorkers int  // Default: 5
    onItem     func(context.Context, T) (U, error)
    onResult   func(context.Context, U) error
}

func (p Pipeline[T, U]) Do(ctx context.Context, items []T) error {
    g, ctx := errgroup.WithContext(ctx)

    itemCh := make(chan T, len(items))
    results := make(chan U, p.numWorkers)

    // Start fixed number of workers
    for i := 0; i < p.numWorkers; i++ {
        g.Go(func() error {
            for item := range itemCh {
                result, err := p.onItem(ctx, item)
                if err != nil {
                    return err  // errgroup exits on any error
                }
                results <- result
            }
            return nil
        })
    }

    // Process results
    go func() {
        g.Wait()         // Wait for all workers
        close(results)   // Then close results channel
    }()

    // Feed items
    go func() {
        defer close(itemCh)
        for _, item := range items {
            select {
            case itemCh <- item:
            case <-ctx.Done():
                return
            }
        }
    }()

    // Consume results
    g.Go(func() error {
        for result := range results {
            if err := p.onResult(ctx, result); err != nil {
                return err
            }
        }
        return nil
    })

    return g.Wait()
}
```

**Usage Example:**

```go
// Scan multiple artifacts concurrently
pipeline := parallel.Pipeline[Artifact, ScanResult]{
    numWorkers: 5,
    onItem: func(ctx context.Context, artifact Artifact) (ScanResult, error) {
        // In-memory scanning (like go-cicd graph)
        return scanner.Scan(artifact)
    },
    onResult: func(ctx context.Context, result ScanResult) error {
        // Emit vulnerabilities
        return reporter.Report(result)
    },
}

pipeline.Do(ctx, artifacts)
```

**Memory Lifecycle:**

1. Artifact enters pipeline
2. In-memory scan creates SBOM
3. SBOM analyzed for vulnerabilities
4. ScanResult emitted via onResult
5. **Artifact + SBOM garbage collected**

**Bounded Memory:** Only `numWorkers` artifacts in memory concurrently.

---

## TruffleHog Multi-Stage Worker Pools

**Pattern:** Independent worker pools per pipeline stage with multipliers.

**Source:** [TruffleHog pkg/engine/engine.go](https://github.com/trufflesecurity/trufflehog) (24K ⭐)

```go
type Engine struct {
    concurrency int                  // Default: 20 workers

    // Channels for pipeline stages
    detectableChunksChan          chan detectableChunk
    verificationOverlapChunksChan chan verificationOverlapChunk
    results                       chan detectors.ResultWithMetadata

    // Worker synchronization
    workersWg                     sync.WaitGroup
    verificationOverlapWg         sync.WaitGroup
    wgDetectorWorkers             sync.WaitGroup
    WgNotifier                    sync.WaitGroup

    // Worker multipliers for different stages
    detectorWorkerMultiplier            int  // Usually 3x
    notificationWorkerMultiplier        int  // Usually 1x
    verificationOverlapWorkerMultiplier int  // Usually 2x
}
```

**Stage-Specific Worker Counts:**

```go
// Stage 1: Source enumeration (I/O-bound)
sourceWorkers := runtime.NumCPU() * 4  // 32 on 8-core (high multiplier for I/O wait)

// Stage 2: Secret detection (CPU-bound)
detectorWorkers := runtime.NumCPU()    // 8 on 8-core (match cores for CPU work)

// Stage 3: Verification (network-bound)
verifyWorkers := runtime.NumCPU() * 10  // 80 on 8-core (very high for network latency)
```

**Why Different Multipliers:**

| Stage              | Bottleneck      | Multiplier | Reason                            |
| ------------------ | --------------- | ---------- | --------------------------------- |
| Source enumeration | Disk I/O        | 4x CPUs    | Workers wait on disk, minimal CPU |
| Secret detection   | CPU computation | 1x CPUs    | Each worker saturates one core    |
| Verification       | Network I/O     | 10x CPUs   | Network latency dominates time    |

**Key Principle:** Match worker count to bottleneck type, not hardware cores.

---

## Work Stealing Pool (Advanced)

**Pattern:** Workers steal from each other's queues for load balancing.

```go
// Advanced: Workers steal from each other's queues
type WorkStealingPool struct {
    workers []*Worker
}

type Worker struct {
    id    int
    queue chan Task
    pool  *WorkStealingPool
}

func (w *Worker) Run(ctx context.Context) error {
    for {
        select {
        case task := <-w.queue:
            task.Execute()
        case <-ctx.Done():
            return ctx.Err()
        default:
            // Try to steal work from other workers
            if task := w.stealWork(); task != nil {
                task.Execute()
            } else {
                time.Sleep(time.Millisecond)
            }
        }
    }
}

func (w *Worker) stealWork() Task {
    // Round-robin stealing
    for i := 1; i < len(w.pool.workers); i++ {
        victim := w.pool.workers[(w.id+i)%len(w.pool.workers)]
        select {
        case task := <-victim.queue:
            return task
        default:
        }
    }
    return nil
}
```

**When to use:**

- ✅ Workload imbalance (some items take much longer than others)
- ✅ Dynamic work generation (tasks spawn new tasks)
- ✅ Need maximum CPU utilization

**Avoid when:**

- ❌ Simple, uniform work items (overhead not worth it)
- ❌ Strict ordering required (stealing breaks order)

---

## Default Worker Counts from Production

| Project        | Default Workers             | Rationale                         |
| -------------- | --------------------------- | --------------------------------- |
| **Trivy**      | 5                           | Conservative for stability        |
| **Nuclei**     | 25 (templates) + 25 (hosts) | Aggressive for speed              |
| **Prometheus** | Per-target (autonomous)     | Isolation and independence        |
| **TruffleHog** | 20 (runtime.NumCPU())       | Balanced for multi-stage pipeline |

**go-cicd recommendation:** 10 workers (middle ground between conservative and aggressive).

**Source:** [Production Go Streaming Scanner Architectures Research](https://github.com/aquasecurity/trivy), lines 432-443

---

## Comparison: Worker Pool vs errgroup.SetLimit

**Go 1.20+ Alternative:** Use `errgroup.SetLimit()` instead of manual semaphore.

```go
// Modern approach (Go 1.20+)
g, ctx := errgroup.WithContext(ctx)
g.SetLimit(maxConcurrent)  // Built-in concurrency limiting

for _, item := range items {
    item := item
    g.Go(func() error {
        return processItem(ctx, item)
    })
}

return g.Wait()
```

**Comparison:**

| Feature          | Worker Pool + Channels        | errgroup.SetLimit            |
| ---------------- | ----------------------------- | ---------------------------- |
| **Complexity**   | Higher (manual channels)      | Lower (built-in)             |
| **Backpressure** | Explicit (buffered channel)   | Automatic (blocks on submit) |
| **Overhead**     | Lower (pre-allocated workers) | Higher (goroutine per item)  |
| **Use Case**     | Long-running workers          | Short tasks, simpler code    |

**Recommendation:**

- **Short tasks (<100ms):** Use `errgroup.SetLimit()` for simplicity
- **Long-running workers:** Use explicit worker pool for lower overhead

---

## Sources

- [Trivy pkg/parallel/pipeline.go](https://github.com/aquasecurity/trivy/blob/main/pkg/parallel/pipeline.go) - Generic Pipeline Implementation (30K ⭐)
- [Trivy pkg/parallel/walk.go](https://github.com/aquasecurity/trivy/blob/main/pkg/parallel/walk.go) - Worker Pool Pattern
- [TruffleHog Engine Architecture](https://github.com/trufflesecurity/trufflehog) - Multi-stage pools (24K ⭐)
- [Production Go Streaming Scanner Architectures Research](https://github.com/aquasecurity/trivy) - Worker count defaults
