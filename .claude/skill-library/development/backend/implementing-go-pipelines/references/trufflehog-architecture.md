# TruffleHog Multi-Stage Pipeline Architecture

**Complete architectural analysis of TruffleHog's 40K+ items/hour secret scanning pipeline**

**Source:** [trufflesecurity/trufflehog](https://github.com/trufflesecurity/trufflehog) (24K⭐)

## Overview

TruffleHog achieves **40,000+ items/hour throughput** by overlapping I/O, CPU, and network operations in a carefully tuned multi-stage pipeline with independent worker multipliers per stage.

**Key Innovation:** Worker multipliers based on bottleneck type (I/O vs CPU vs Network)

From `.claude/.output/research/2026-01-01-go-scanner-architecture-patterns/github.md` (lines 43-92).

---

## Engine Architecture

**From `pkg/engine/engine.go`** (research lines 56-82):

```go
type Engine struct {
    concurrency       int                  // Default: 20 workers (base)

    // Worker multipliers for different stages
    detectorWorkerMultiplier            int  // Usually 3x (CPU-bound)
    notificationWorkerMultiplier        int  // Usually 1x (I/O-bound)
    verificationOverlapWorkerMultiplier int  // Usually 2x (Network-bound)

    // Pipeline stage channels
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

**Effective Workers Calculation:**

| Stage        | Base Concurrency | Multiplier | Effective Workers | Bottleneck Type      |
| ------------ | ---------------- | ---------- | ----------------- | -------------------- |
| Chunking     | 20               | 1×         | 20 workers        | I/O (disk reads)     |
| Detection    | 20               | 3×         | **60 workers**    | CPU (regex matching) |
| Verification | 20               | 2×         | **40 workers**    | Network (HTTP)       |
| Notification | 20               | 1×         | 20 workers        | I/O (database)       |

**Formula:**

```
effective_workers = base_concurrency × stage_multiplier
```

---

## Multi-Stage Pipeline Flow

From `.claude/.output/research/2026-01-01-go-scanner-architecture-patterns/SYNTHESIS.md` (lines 151-163):

### Stage 1: Source Chunking (I/O-Bound)

```go
chunkChan := make(chan *sources.Chunk, 100)
// Workers: 1× multiplier (20 workers)
// Buffer: 100 (smooth burst traffic)
```

**Characteristics:**

- Sequential file/git history reading
- Burst traffic pattern (many chunks, then pause)
- Single worker optimal (disk seeks serialized anyway)
- Buffer handles bursts without blocking

**Why 1× multiplier:**

- Disk I/O is inherently sequential
- Multiple workers don't improve throughput
- More workers waste CPU context-switching

### Stage 2: Secret Detection (CPU-Bound)

```go
detectChan := make(chan *detectors.Result, 1000)
// Workers: 3× multiplier (60 workers)
// Buffer: 1000 (high variance in chunk processing time)
```

**Characteristics:**

- Regex matching, entropy calculation
- CPU-intensive per chunk
- High variance (small vs large chunks)
- **Aho-Corasick pre-filtering**: 10-100× speedup

**Why 3× multiplier:**

- Saturates all CPU cores
- Regex/entropy computationally expensive
- High variance needs parallelism

**Aho-Corasick Optimization:**

- Pre-filter with fast string matching (keywords)
- Only run expensive regex on candidates
- **10-100× speedup** documented in research

### Stage 3: Verification (Network-Bound)

```go
verifyChan := make(chan *detectors.VerifiedResult, 100)
// Workers: 2× multiplier (40 workers)
// Buffer: 100 (network has natural buffering)
```

**Characteristics:**

- HTTP requests to verify secrets are valid
- Network latency dominates
- Wait time > processing time
- **2× multiplier** handles variance

**Why 2× multiplier:**

- Network latency needs more workers
- Less than CPU because HTTP client handles concurrency
- Balance between throughput and connection limits

### Stage 4: Result Notification (I/O-Bound)

```go
resultChan := make(chan *output.Result, 100)
// Workers: 1× multiplier (20 workers)
// Buffer: 100 (downstream is fast)
```

**Characteristics:**

- Database writes, webhook notifications
- Fast compared to detection
- **1× multiplier** sufficient

**Why 1× multiplier:**

- Database writes relatively fast
- Downstream rarely bottleneck
- Over-parallelism wastes resources

---

## Buffer Sizing Strategy

From research analysis:

| Stage        | Buffer Size | Reasoning                                |
| ------------ | ----------- | ---------------------------------------- |
| Chunking     | 100         | Low variance, smooth bursts              |
| Detection    | **1000**    | **High variance** (chunk sizes 1KB-10MB) |
| Verification | 100         | Network has natural buffering            |
| Notification | 100         | Downstream fast, no backpressure         |

**Large buffers (1000) for high-variance stages** prevent blocking when:

- Small chunks finish quickly
- Large chunks take 100× longer
- Downstream temporarily slow

**Small buffers (100) for predictable stages** minimize memory:

- I/O stages have consistent timing
- No need for large buffer
- Memory savings matter at scale

---

## Performance Optimizations

### 1. Aho-Corasick Pre-Filtering

**From research** (lines 80-81):

```go
AhoCorasickCore  *ahocorasick.Core
```

**How it works:**

1. Build trie of all secret keywords ("api_key", "password", "token")
2. Fast O(n) string matching finds candidates
3. Run expensive regex ONLY on candidates
4. **10-100× speedup** before regex

**Example:**

- Scan 1MB file with 1000 regexes: ~10 seconds
- Aho-Corasick pre-filter: 100ms to find 5 candidates
- Run regex on 5 candidates: 50ms
- **Total: 150ms vs 10s = 67× faster**

### 2. LRU Deduplication Cache

**From research** (lines 79):

```go
dedupeCache *lru.Cache[string, detectorspb.DecoderType]
```

**Purpose:**

- Avoid reprocessing identical secrets
- Hash-based lookup before verification
- Network request savings (most expensive stage)

**Example:**

- Same AWS key appears 100 times across repos
- First occurrence: Verify via HTTP (100ms)
- Subsequent 99: Cache hit (1ms)
- **Savings: 9.9 seconds**

### 3. Worker Multipliers

**Innovation:** Tune each stage independently

**Traditional approach** (WRONG):

```
All stages: 20 workers (regardless of bottleneck)
```

**TruffleHog approach** (RIGHT):

```go
Chunking:     20 workers (1× multiplier, I/O-bound)
Detection:    60 workers (3× multiplier, CPU-bound)
Verification: 40 workers (2× multiplier, Network-bound)
Notification: 20 workers (1× multiplier, I/O-bound)
```

**Why this works:**

- CPU stage gets 3× resources (needs it)
- Network stage gets 2× resources (latency)
- I/O stages get 1× (can't improve anyway)
- **Balanced pipeline** - no single bottleneck

---

## Memory Management

**Bounded by concurrency, not total workload**

From `.claude/.output/research/2026-01-01-202322-production-go-streaming-scanners/SYNTHESIS.md` (lines 419-430):

### Memory Formula

```
Peak Memory = (Workers × Per-Item Memory) + (Buffer × Item Size)
```

**TruffleHog Example:**

- Detection workers: 60
- Per-chunk memory: 1 MB (text + metadata)
- Detection buffer: 1000 chunks
- Chunk size: 0.5 MB (average)

**Peak = (60 × 1MB) + (1000 × 0.5MB) = 560 MB**

**Scalability:**

- Memory independent of total repository size
- Scan 1GB repo or 1TB dataset: Same 560 MB peak
- **Streaming architecture** - process and discard

---

## Comparison with Other Scanners

From `.claude/.output/research/2026-01-01-202322-production-go-streaming-scanners/SYNTHESIS.md` (lines 406-417):

| Feature                | TruffleHog                | Trivy                     | Nuclei             |
| ---------------------- | ------------------------- | ------------------------- | ------------------ |
| **Base Workers**       | 20 (default)              | 5 (default)               | 25 templates       |
| **Multi-Stage**        | ✅ 4 stages               | ✅ Generic Pipeline[T,U]  | ✅ Multi-level     |
| **Worker Multipliers** | ✅ 1×/3×/2×/1×            | ❌ Fixed per stage        | ✅ Multi-level     |
| **Pre-Filtering**      | ✅ Aho-Corasick (10-100×) | ❌                        | ❌                 |
| **LRU Cache**          | ✅ Deduplication          | ✅ File-level             | ❌                 |
| **Throughput**         | 40K+ items/hour           | 7.2K items/hour (default) | 540K requests/hour |
| **Memory Model**       | Streaming                 | Per-item GC               | Streaming          |

**TruffleHog's Innovation:**

- Worker multipliers per bottleneck type
- Aho-Corasick pre-filtering
- Highest throughput for secret scanning

---

## Worker Tuning Guidelines

From `.claude/.output/research/2026-01-01-go-scanner-architecture-patterns/SYNTHESIS.md` (lines 151-163):

### Tuning by Bottleneck Type

| Bottleneck     | Multiplier     | Example Operations         |
| -------------- | -------------- | -------------------------- |
| **I/O (disk)** | 1×             | File reads, log writes     |
| **CPU**        | 2-4×           | Regex, crypto, compression |
| **Network**    | 2-3×           | HTTP, database, API calls  |
| **Memory**     | Limited by RAM | Image processing, ML       |

**How to determine bottleneck:**

1. Profile with `pprof`
2. Check CPU utilization (CPU-bound if >80%)
3. Check network I/O (Network-bound if high latency)
4. Check disk I/O (I/O-bound if waiting on reads)

**Multiplier rules:**

- CPU-bound: Use 2-4× `runtime.NumCPU()`
- Network-bound: Use 2-3× (balance latency vs connections)
- I/O-bound: Use 1× (can't parallelize disk seeks)

---

## Production Configuration

**Default TruffleHog settings:**

```go
concurrency: 20                          // Base workers
detectorWorkerMultiplier: 3              // 60 detection workers
verificationOverlapWorkerMultiplier: 2   // 40 verification workers
notificationWorkerMultiplier: 1          // 20 notification workers

// Channel buffers
chunkBuffer: 100
detectBuffer: 1000  // High variance stage
verifyBuffer: 100
resultBuffer: 100
```

**When to adjust:**

- **High CPU (32+ cores):** Increase base to 32-64
- **Memory constrained (<4GB):** Decrease detectBuffer to 500
- **Slow network:** Increase verificationOverlapWorkerMultiplier to 3×
- **Fast SSD:** Can increase chunk workers slightly

---

## Implementation Pattern

**Simplified TruffleHog pipeline pattern:**

```go
type Scanner struct {
    concurrency int
    detectorMultiplier int
    verifyMultiplier int
}

func (s *Scanner) Scan(ctx context.Context, source Source) error {
    g, ctx := errgroup.WithContext(ctx)

    // Stage 1: Chunking (I/O)
    chunkCh := make(chan Chunk, 100)
    g.Go(func() error {
        defer close(chunkCh)
        return source.Chunks(ctx, chunkCh)
    })

    // Stage 2: Detection (CPU) - 3× workers
    detectCh := make(chan Detection, 1000)
    for i := 0; i < s.concurrency * s.detectorMultiplier; i++ {
        g.Go(func() error {
            for chunk := range chunkCh {
                // Aho-Corasick pre-filter
                if !s.preFilter(chunk) {
                    continue
                }
                // Expensive regex
                detection := s.detect(ctx, chunk)
                if detection != nil {
                    detectCh <- detection
                }
            }
            return nil
        })
    }

    // Stage 3: Verification (Network) - 2× workers
    verifyCh := make(chan Verified, 100)
    for i := 0; i < s.concurrency * s.verifyMultiplier; i++ {
        g.Go(func() error {
            for d := range detectCh {
                // Check cache
                if s.cache.Has(d.Hash) {
                    continue
                }
                // HTTP verification
                verified, err := s.verify(ctx, d)
                if err != nil {
                    return err
                }
                if verified {
                    verifyCh <- Verified{d}
                    s.cache.Add(d.Hash, d)
                }
            }
            return nil
        })
    }

    // Stage 4: Notification (I/O) - 1× workers
    for i := 0; i < s.concurrency; i++ {
        g.Go(func() error {
            for v := range verifyCh {
                if err := s.notify(ctx, v); err != nil {
                    return err
                }
            }
            return nil
        })
    }

    return g.Wait()
}
```

---

## References

**Production Codebase:**

- [TruffleHog pkg/engine/engine.go](https://github.com/trufflesecurity/trufflehog/tree/main/pkg/engine)
- [TruffleHog Concurrency Issue #3783](https://github.com/trufflesecurity/trufflehog/issues/3783)

**Research:**

- `.claude/.output/research/2026-01-01-go-scanner-architecture-patterns/github.md` (lines 43-92)
- `.claude/.output/research/2026-01-01-go-scanner-architecture-patterns/SYNTHESIS.md` (lines 151-163)
- `.claude/.output/research/2026-01-01-202322-production-go-streaming-scanners/SYNTHESIS.md` (lines 378-430)

**Official Documentation:**

- [DevSecOps Guide to TruffleHog](https://devsecopsschool.com/blog/a-comprehensive-guide-to-trufflehog-in-devsecops/)
- [Aho-Corasick Algorithm](https://en.wikipedia.org/wiki/Aho%E2%80%93Corasick_algorithm) - Multi-pattern string matching
