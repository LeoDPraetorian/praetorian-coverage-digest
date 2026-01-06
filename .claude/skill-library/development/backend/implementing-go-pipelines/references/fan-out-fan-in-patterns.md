# Fan-Out/Fan-In Patterns

**Multi-worker pipeline patterns from production Go scanners (Trivy, TruffleHog, Nuclei)**

## Overview

Fan-out/fan-in is the **industry-standard pattern** for parallel processing in Go pipelines:

- **Fan-out**: Distribute work from one channel to multiple worker goroutines
- **Fan-in**: Merge results from multiple workers back into a single channel

**Production Validation:**

- [Trivy](https://github.com/aquasecurity/trivy) (30K⭐) - Generic `Pipeline[T, U]` implementation
- [TruffleHog](https://github.com/trufflesecurity/trufflehog) (24K⭐) - Multi-stage with worker multipliers
- [Nuclei](https://github.com/projectdiscovery/nuclei) (26K⭐) - Multi-level concurrency

---

## Pattern 1: Trivy Generic Pipeline[T, U]

**Source:** [aquasecurity/trivy/pkg/parallel/pipeline.go](https://github.com/aquasecurity/trivy)

From `.claude/.output/research/2026-01-01-202322-production-go-streaming-scanners/SYNTHESIS.md` (lines 47-92):

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

    // FAN-OUT: Start fixed number of workers
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

    // FAN-IN: Process results
    go func() {
        g.Wait()         // Wait for all workers
        close(results)   // Then close results channel
    }()

    // Feed work
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

    // Result consumer
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

**ASCII Flow:**

```
items []T
    │
    ├─▶ itemCh (buffered: len(items))
    │       │
    │       ├──▶ Worker 1 ──▶ results ─┐
    │       ├──▶ Worker 2 ──▶ results ─┤
    │       ├──▶ Worker 3 ──▶ results ─┼──▶ Result consumer
    │       ├──▶ Worker 4 ──▶ results ─┤
    │       └──▶ Worker 5 ──▶ results ─┘
    │
    └──▶ Wait for all workers ──▶ close(results)
```

**Key Features:**

- ✅ **Type-safe generics**: `Pipeline[T, U]` handles any input/output types
- ✅ **Bounded concurrency**: Fixed worker pool (default 5, tunable)
- ✅ **errgroup**: Automatic error propagation and context cancellation
- ✅ **Buffered channels**: Smooths throughput variance
- ✅ **Memory bounded**: No accumulation (results processed via callback)

**Usage Example:**

```go
// Scan container images in parallel
pipeline := Pipeline[string, ScanResult]{
    numWorkers: 10,
    onItem: func(ctx context.Context, image string) (ScanResult, error) {
        // Scan image, return result
        return scanImage(ctx, image)
    },
    onResult: func(ctx context.Context, result ScanResult) error {
        // Emit vulnerability findings
        return emitVulnerabilities(ctx, result)
    },
}

images := []string{"nginx:latest", "redis:7", "postgres:15"}
if err := pipeline.Do(ctx, images); err != nil {
    log.Fatal(err)
}
```

---

## Pattern 2: TruffleHog Multi-Stage with Worker Multipliers

**Source:** [trufflesecurity/trufflehog/pkg/engine/engine.go](https://github.com/trufflesecurity/trufflehog)

From `.claude/.output/research/2026-01-01-go-scanner-architecture-patterns/github.md` (lines 56-82):

```go
type Engine struct {
    concurrency       int                  // Default: 20 workers

    // Worker multipliers for different stages
    detectorWorkerMultiplier            int  // Usually 3x
    notificationWorkerMultiplier        int  // Usually 1x
    verificationOverlapWorkerMultiplier int  // Usually 2x

    // Channels for pipeline stages
    detectableChunksChan          chan detectableChunk
    verificationOverlapChunksChan chan verificationOverlapChunk
    results                       chan detectors.ResultWithMetadata

    // Worker synchronization
    workersWg                     sync.WaitGroup
    verificationOverlapWg         sync.WaitGroup
    wgDetectorWorkers             sync.WaitGroup
    WgNotifier                    sync.WaitGroup

    // Performance optimization
    dedupeCache      *lru.Cache[string, detectorspb.DecoderType]
    AhoCorasickCore  *ahocorasick.Core
}
```

**Worker Calculation:**

| Stage        | Bottleneck     | Multiplier | Effective Workers (base=20) |
| ------------ | -------------- | ---------- | --------------------------- |
| Chunking     | I/O (disk)     | 1×         | 20 workers                  |
| Detection    | CPU (regex)    | 3×         | 60 workers                  |
| Verification | Network (HTTP) | 2×         | 40 workers                  |
| Notification | I/O (database) | 1×         | 20 workers                  |

**Formula:**

```
effective_workers = base_concurrency × stage_multiplier
```

**Why Different Multipliers:**

- **1× (I/O)**: Disk/database operations - sequential optimal
- **3× (CPU)**: Pattern matching - saturate all CPU cores
- **2× (Network)**: HTTP requests - handle latency variance

From `.claude/.output/research/2026-01-01-go-scanner-architecture-patterns/SYNTHESIS.md` (lines 151-163):

**Multi-Stage Pipeline Flow:**

```
Source
  │
  ├─▶ chunkChan (buffer: 100)
  │     │
  │     └──▶ 20 workers (1×) ──▶ detectChan (buffer: 1000)
  │               │
  │               └──▶ 60 workers (3×) ──▶ verifyChan (buffer: 100)
  │                       │
  │                       └──▶ 40 workers (2×) ──▶ resultChan (buffer: 100)
  │                               │
  │                               └──▶ 20 workers (1×) ──▶ Output
```

**Performance Optimization:**

- **Aho-Corasick pre-filtering**: 10-100× speedup before expensive regex
- **LRU deduplication cache**: Avoid reprocessing identical secrets
- **Buffer tuning**: Large buffers (1000) for high-variance stages

**Achieves 40K+ items/hour throughput** by overlapping I/O, CPU, and network operations.

---

## Pattern 3: Simple Fan-Out (Manual Worker Pool)

**Universal bounded worker pool pattern** from `.claude/.output/research/2026-01-01-202322-production-go-streaming-scanners/SYNTHESIS.md` (lines 378-404):

```go
// Universal pattern across all 6 production projects
func Process(ctx context.Context, items []Item, concurrency int) error {
    g, ctx := errgroup.WithContext(ctx)
    sem := semaphore.NewWeighted(int64(concurrency))

    for _, item := range items {
        item := item  // Capture for closure

        // Acquire semaphore slot (blocks if all workers busy)
        if err := sem.Acquire(ctx, 1); err != nil {
            return err
        }

        g.Go(func() error {
            defer sem.Release(1)

            // Process item in-memory
            result := processItem(ctx, item)

            // Emit result
            send(result)

            // Item eligible for GC here
            return nil
        })
    }

    return g.Wait()
}
```

**Concurrency Control:**

- **errgroup**: Error propagation + automatic context cancellation
- **semaphore**: Bounds concurrent goroutines (prevents OOM)
- **Capture loop variable**: `item := item` prevents closure bug

**Memory Model:**

- **Bounded by worker count**, not total workload
- Each item processed and discarded immediately
- Peak memory = `workers × per_item_size`

---

## Pattern 4: Fan-In (Merge Multiple Channels)

**Classic merge pattern** (Go Blog canonical):

```go
func fanIn(ctx context.Context, channels ...<-chan Result) <-chan Result {
    out := make(chan Result)
    var wg sync.WaitGroup

    // Start goroutine for each input channel
    for _, c := range channels {
        wg.Add(1)
        go func(ch <-chan Result) {
            defer wg.Done()
            for result := range ch {
                select {
                case out <- result:
                case <-ctx.Done():
                    return
                }
            }
        }(c)
    }

    // Close output channel when all inputs exhausted
    go func() {
        wg.Wait()
        close(out)
    }()

    return out
}
```

**Critical Pattern:**

1. `wg.Add(1)` for each input channel
2. Forward results with cancellation check
3. Separate goroutine waits for `wg.Wait()` then closes output
4. **Close coordination**: Output closes only after ALL inputs drain

---

## Pattern 5: Combined Fan-Out + Fan-In

**Parallel processing with result aggregation:**

```go
func parallel(ctx context.Context, in <-chan Task, workers int) <-chan Result {
    // FAN-OUT: Create N worker output channels
    outs := make([]<-chan Result, workers)
    for i := 0; i < workers; i++ {
        outs[i] = worker(ctx, in)
    }

    // FAN-IN: Merge all worker outputs
    return fanIn(ctx, outs...)
}

func worker(ctx context.Context, in <-chan Task) <-chan Result {
    out := make(chan Result)
    go func() {
        defer close(out)
        for task := range in {
            result := expensiveOperation(task)
            select {
            case out <- result:
            case <-ctx.Done():
                return
            }
        }
    }()
    return out
}
```

**Usage:**

```go
taskChan := generate(ctx, tasks)
resultChan := parallel(ctx, taskChan, runtime.NumCPU())

for result := range resultChan {
    // Process results as they arrive
}
```

---

## Production Tuning Guidelines

From `.claude/.output/research/2026-01-01-202322-production-go-streaming-scanners/SYNTHESIS.md` (lines 419-430):

### Memory Formula

```
Peak Memory = (Workers × Per-Item Memory) + (Buffer × Item Size)
```

**Example** (Trivy defaults):

- Workers: 5
- Per-item memory: 50 MB (container SBOM)
- Buffer size: 5
- Item size: 10 MB (compressed image layer)

**Peak = (5 × 50MB) + (5 × 10MB) = 300 MB**

### Buffer Sizing Strategy

| Buffer Size    | Use Case              | Memory Impact | Throughput |
| -------------- | --------------------- | ------------- | ---------- |
| 0 (unbuffered) | Synchronization       | Minimal       | Slowest    |
| 10-100         | Memory-constrained    | Low           | Moderate   |
| 100-1000       | Balanced (TruffleHog) | Medium        | High       |
| 1000+          | High variance stages  | High          | Highest    |

**TruffleHog Pattern:**

- Small buffers (100): Low-variance stages (I/O)
- Large buffers (1000): High-variance stages (CPU)

### Worker Tuning by Bottleneck

From `.claude/.output/research/2026-01-01-go-scanner-architecture-patterns/SYNTHESIS.md` (lines 151-163):

| Bottleneck Type | Optimal Workers | Example                         |
| --------------- | --------------- | ------------------------------- |
| **I/O (disk)**  | 1-5             | File reading, log writing       |
| **CPU**         | 2-4× cores      | Regex, crypto, compression      |
| **Network**     | 10-50           | HTTP requests, database queries |
| **Memory**      | Limited by RAM  | Image processing, ML models     |

**etcd Lesson** (from research):

> "A 5-member etcd cluster can tolerate two member failures... Although larger clusters provide better fault tolerance, the write performance suffers"

**Takeaway:** More isn't always better - bounded optimal exists.

---

## Comparison: Concurrency Primitives

From `.claude/.output/research/2026-01-01-202322-production-go-streaming-scanners/SYNTHESIS.md` (lines 406-417):

| Project        | errgroup                      | semaphore                       | Channels       | Pattern            |
| -------------- | ----------------------------- | ------------------------------- | -------------- | ------------------ |
| **Trivy**      | ✅ `pkg/parallel/pipeline.go` | ✅ `pkg/semaphore/semaphore.go` | ✅ Buffered    | Generic Pipeline   |
| **TruffleHog** | ✅ (inferred)                 | ✅ Multi-level                  | ✅ Stream mode | Multi-tier workers |
| **Nuclei**     | ✅ (inferred)                 | ✅ Multi-level                  | ✅ Stream mode | Multi-tier workers |
| **Prometheus** | ✅ `tsdb/db.go`               | ✅ (scrape pool)                | ✅ Buffered    | Autonomous workers |
| **Jaeger**     | ✅ (inferred)                 | ✅ Queue bounds                 | ✅ Buffered    | Batch processor    |

**Consensus:** `errgroup + semaphore` is the **industry-standard pattern** for bounded Go concurrency.

---

## References

**Official Go Resources:**

- [Go Blog - Pipelines and Cancellation](https://go.dev/blog/pipelines) - Canonical pattern (2014)
- [Go Blog - Advanced Concurrency Patterns](https://go.dev/blog/io2013-talk-concurrency)

**Production Codebases:**

- [Trivy pkg/parallel/](https://github.com/aquasecurity/trivy/tree/main/pkg/parallel) - Generic Pipeline[T,U]
- [TruffleHog pkg/engine/](https://github.com/trufflesecurity/trufflehog/tree/main/pkg/engine) - Multi-stage with multipliers
- [Nuclei concurrency docs](https://github.com/projectdiscovery/nuclei) - Multi-level concurrency

**Research:**

- `.claude/.output/research/2026-01-01-202322-production-go-streaming-scanners/SYNTHESIS.md`
- `.claude/.output/research/2026-01-01-go-scanner-architecture-patterns/SYNTHESIS.md`
- `.claude/.output/research/2026-01-01-go-scanner-architecture-patterns/github.md`
