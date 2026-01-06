---
name: optimizing-go-scanner-performance
description: Use when optimizing Go scanner throughput to achieve 40K-540K items/hour - provides 6 proven techniques (Aho-Corasick pre-filtering, LRU deduplication, request clustering, buffered channels, worker multipliers, incremental caching) from TruffleHog (24K stars), Nuclei (26K stars), and golangci-lint (18K stars)
allowed-tools: "Read, Write, Edit, Bash, Grep, Glob"
---

# Go Scanner Performance Optimization

## Overview

Six proven optimization techniques to achieve 40K-540K items/hour throughput in Go scanners. Based on production patterns from TruffleHog, Nuclei, and golangci-lint.

**Core Principle**: Profile first, identify bottleneck (CPU/network/duplicates), apply targeted optimization.

## Quick Reference

| Optimization           | Speedup       | Bottleneck         | Apply When     | Production Example |
| ---------------------- | ------------- | ------------------ | -------------- | ------------------ |
| Aho-Corasick filtering | 10-100x       | Multi-pattern CPU  | 100K+ target   | TruffleHog 800+    |
| LRU deduplication      | 50-90% less   | Duplicate findings | 40K+ target    | TruffleHog secrets |
| Request clustering     | 2-10x fewer   | Network redundancy | Network-heavy  | Nuclei templates   |
| Buffered channels      | 2-5x          | Pipeline blocking  | Always         | TruffleHog (1000)  |
| Worker multipliers     | 2-3x          | Stage imbalance    | Always         | TruffleHog 3x/2x   |
| Incremental caching    | 10-100x CI/CD | Unchanged files    | CI/CD use case | golangci-lint      |

## When to Use

**Use when:**

- Scanner throughput below target (need 40K+ items/hour)
- Profiling shows specific bottleneck (CPU/network/duplicates)
- Scaling beyond basic errgroup + semaphore patterns
- CI/CD re-scanning unchanged files
- Network-heavy scanning with redundant requests
- Multi-pattern matching (secrets, vulnerabilities)

**Symptoms this addresses:**

- "Scanner plateaus at 5-10K items/hour"
- "CPU maxed but throughput low" (need Aho-Corasick)
- "Same findings verified repeatedly" (need LRU cache)
- "Network is bottleneck" (need request clustering)

**MANDATORY: You MUST use TodoWrite before starting** to track all optimization steps.

## Decision Tree

```text
Throughput below target?
├─ Profile with pprof first
├─ CPU-bound (detection)?
│   ├─ Multi-pattern matching? → Aho-Corasick (10-100x)
│   └─ Stage imbalance? → Worker multipliers (2-3x)
├─ Network-bound?
│   ├─ Duplicate requests? → Request clustering (2-10x)
│   └─ Duplicate findings? → LRU deduplication (50-90%)
├─ Pipeline blocking?
│   └─ Stage variance? → Buffered channels (2-5x)
└─ CI/CD slowness?
    └─ Unchanged files? → Incremental caching (10-100x)
```

## Optimization 1: Aho-Corasick Pre-filtering

**Problem:** Running 800+ regex detectors is O(n × m) complexity.

**Solution:** Build Aho-Corasick trie, pre-filter in O(n + m).

```go
import "github.com/cloudflare/ahocorasick"

// Build once at startup
keywords := []string{"api_key", "password", "secret", "token"}
ac := ahocorasick.New(keywords)

func detectSecrets(chunk []byte, detectors []Detector) []Finding {
    if !ac.Match(chunk) {
        return nil  // Skip all 800+ detectors
    }
    // Only run detectors on matching chunks
    for _, d := range detectors {
        // ...expensive regex matching
    }
}
```

**Impact:** 10-100x speedup (10% match rate = 10x speedup)

**Details:** [references/aho-corasick-implementation.md](references/aho-corasick-implementation.md)

## Optimization 2: LRU Deduplication Cache

**Problem:** Same secret in multiple files wastes verification API calls.

**Solution:** Cache by (detector_type, raw_result, source_metadata).

```go
import lru "github.com/hashicorp/golang-lru/v2"

type SecretCache struct {
    cache *lru.Cache[string, bool]
}

func (c *SecretCache) IsDuplicate(detectorType, rawValue, sourceMeta string) bool {
    key := fmt.Sprintf("%s:%s:%s", detectorType, rawValue, sourceMeta)
    if c.cache.Contains(key) {
        return true
    }
    c.cache.Add(key, true)
    return false
}
```

**Impact:** 50-90% reduction in verification load

**Cache Size:** 10,000 entries typical (balance memory vs hit rate)

**Details:** [references/lru-cache-strategies.md](references/lru-cache-strategies.md)

## Optimization 3: Request Clustering

**Problem:** Multiple templates make identical HTTP requests.

**Solution:** Group by signature, execute once, broadcast results.

```go
type RequestCluster struct {
    signature  string
    requesters []Requester
}

func clusterRequests(requests []Request) []RequestCluster {
    clusters := make(map[string]*RequestCluster)
    for _, req := range requests {
        sig := computeSignature(req)  // Hash(method, url, headers)
        if c, ok := clusters[sig]; ok {
            c.requesters = append(c.requesters, req.Requester)
        } else {
            clusters[sig] = &RequestCluster{sig, []Requester{req.Requester}}
        }
    }
    return values(clusters)
}

// Execute once, replay to all requesters
for _, cluster := range clusters {
    result := executeOnce(cluster.signature)
    for _, r := range cluster.requesters {
        r.ReceiveResult(result)
    }
}
```

**Impact:** 2-10x fewer HTTP requests

**Details:** [references/request-clustering.md](references/request-clustering.md)

## Optimization 4: Buffered Channel Sizing

**Problem:** Producer/consumer rate mismatch causes blocking.

**Solution:** Size buffers based on throughput variance.

```go
// Stage characteristics determine buffer size
chunkChan   := make(chan Chunk, 100)     // Stable (file reading)
detectChan  := make(chan Finding, 1000)  // High variance (CPU)
verifyChan  := make(chan Verified, 100)  // Rate-limited (network)
resultChan  := make(chan Result, 100)    // Stable (database)
```

**Sizing Guidelines:**

| Buffer Size | When to Use                           | Example              |
| ----------- | ------------------------------------- | -------------------- |
| 10-100      | Stable throughput, memory-constrained | File I/O, DB writes  |
| 100-1000    | Variable throughput, balanced         | TruffleHog detection |
| 1000+       | High variance, prevent blocking       | CPU burst stages     |

**TruffleHog:** detectableChunksChan=1000, verification=100, results=100

## Optimization 5: Worker Pool Multipliers

**Problem:** All stages use same worker count, but bottlenecks differ.

**Solution:** Multiply base concurrency by stage-specific factor.

```go
type Scanner struct {
    baseConcurrency   int  // e.g., 10
    cpuMultiplier     int  // 3x for detection
    networkMultiplier int  // 2x for verification
    ioMultiplier      int  // 1x for I/O
}

// Detection stage (CPU-heavy): 30 workers
for i := 0; i < s.baseConcurrency * s.cpuMultiplier; i++ {
    g.Go(func() error { return detectStage(ctx) })
}

// Verification stage (network-heavy): 20 workers
for i := 0; i < s.baseConcurrency * s.networkMultiplier; i++ {
    g.Go(func() error { return verifyStage(ctx) })
}
```

**TruffleHog Multipliers:**

| Stage        | Multiplier | Reason              |
| ------------ | ---------- | ------------------- |
| Detection    | 3x         | CPU-bound, parallel |
| Verification | 2x         | Network-bound       |
| Notification | 1x         | I/O-bound           |

**Tuning:** Profile with pprof, increase bottleneck stage multiplier.

**Cross-reference:** `go-errgroup-concurrency` skill (Pattern 7 - stage multipliers)

## Optimization 6: Incremental Analysis Caching

**Problem:** CI/CD re-scans unchanged files every commit.

**Solution:** Hash-based cache invalidation, skip unchanged.

```go
type FileCache struct {
    cache map[string]CacheEntry
    mu    sync.RWMutex
}

type CacheEntry struct {
    Hash     string
    Results  []Finding
    ScanTime time.Time
}

func (c *FileCache) Get(path, currentHash string) ([]Finding, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    entry, ok := c.cache[path]
    if !ok || entry.Hash != currentHash {
        return nil, false  // Miss or stale
    }
    return entry.Results, true
}
```

**Impact:** 10-100x speedup on CI/CD (only scan changed files)

**Production Examples:**

- golangci-lint: File-level caching with hash validation
- Trivy: Layer-level caching for container images

**Details:** [references/incremental-caching.md](references/incremental-caching.md)

## Production Benchmarks

| Tool          | Throughput         | Key Optimizations                             |
| ------------- | ------------------ | --------------------------------------------- |
| TruffleHog    | 40K+ items/hour    | Aho-Corasick + LRU + multipliers + pipeline   |
| Nuclei        | 540K requests/hour | Clustering + bounded concurrency + rate limit |
| golangci-lint | 10-100x CI/CD      | File-level caching + incremental analysis     |

**Details:** [references/production-benchmarks.md](references/production-benchmarks.md)

## Profiling Workflow

```text
1. Baseline measurement
   $ go tool pprof -http=:8080 cpu.prof

2. Identify bottleneck
   - CPU flame graph → detection stage?
   - Block profile → channel contention?
   - Mutex profile → lock contention?

3. Apply targeted optimization
   - CPU-bound → Aho-Corasick, worker multipliers
   - Network-bound → clustering, deduplication
   - Blocking → buffered channels

4. Re-profile to validate improvement

5. Iterate until target throughput achieved
```

**Details:** [references/profiling-methodology.md](references/profiling-methodology.md)

## Libraries Referenced

| Library                              | Purpose                    |
| ------------------------------------ | -------------------------- |
| `github.com/cloudflare/ahocorasick`  | Aho-Corasick (Cloudflare)  |
| `github.com/anknown/ahocorasick`     | Aho-Corasick (alternative) |
| `github.com/hashicorp/golang-lru/v2` | LRU cache (HashiCorp)      |
| `runtime/pprof`                      | CPU/memory profiling       |

## Related Skills

| Skill                               | Purpose                             |
| ----------------------------------- | ----------------------------------- |
| `go-errgroup-concurrency`           | Concurrent operations, errgroup     |
| `implementing-go-semaphore-pools`   | Bounded concurrency, rate limiting  |
| `implementing-go-pipelines`         | Multi-stage processing pipelines    |
| `implementing-go-plugin-registries` | Plugin systems with 30-100+ plugins |

## Additional References

- [Aho-Corasick Implementation](references/aho-corasick-implementation.md)
- [LRU Cache Strategies](references/lru-cache-strategies.md)
- [Request Clustering](references/request-clustering.md)
- [TruffleHog Architecture](references/trufflehog-architecture.md)
- [Profiling Methodology](references/profiling-methodology.md)
- [Production Benchmarks](references/production-benchmarks.md)
- [Incremental Caching](references/incremental-caching.md)

## Key Sources

- TruffleHog: https://github.com/trufflesecurity/trufflehog (24K stars)
- Nuclei: https://github.com/projectdiscovery/nuclei (26K stars)
- golangci-lint: https://github.com/golangci/golangci-lint (18K stars)
- Research: `.claude/.output/research/2026-01-01-go-scanner-architecture-patterns/`
