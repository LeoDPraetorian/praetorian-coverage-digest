# Benchmark Analysis: Worker Pool Performance

## Overview

Performance data from production Go scanners and research benchmarks demonstrate that **bounded worker pools with errgroup + semaphore** achieve 2.4x speedup over sequential processing while using 20-40% less memory than unbounded goroutines.

---

## Performance Comparison Table

### Concurrency Pattern Benchmarks

**Source:** Go Scanner Architecture Patterns Research (2026-01-01)

| Pattern                    | Performance (ns/op) | Relative Speed  | Memory Usage  | Goroutines | Use Case                     |
| -------------------------- | ------------------- | --------------- | ------------- | ---------- | ---------------------------- |
| **Sequential**             | ~111,483            | 1.0x (baseline) | Minimal       | 1          | Trivial workloads            |
| **sync/errgroup**          | ~65,826             | 1.7x faster     | Low           | Unbounded  | Small batch sizes            |
| **errgroup + worker pool** | ~46,867             | 2.4x faster     | Medium        | Bounded    | **Production (recommended)** |
| **Optimized worker pool**  | ~45,000 (est)       | 2.5x faster     | Medium        | Bounded    | Tuned for specific workload  |
| **Unlimited goroutines**   | ~50,000 (est)       | 2.2x faster     | **Very High** | Unbounded  | ❌ Anti-pattern              |

### Key Findings

**Throughput:**

- Worker pools achieve **2.4x speedup** over sequential processing
- Diminishing returns beyond optimal worker count (typically 10-50 workers)
- Performance plateaus due to bottlenecks (network latency, API rate limits)

**Memory:**

- Worker pools use **20-40% less memory** than unbounded goroutines
- Memory bounded by `(worker_count × per_item_memory) + buffer_size`
- Unbounded patterns risk OOM with large input sets

**Latency:**

- Worker pool overhead: ~300 nanoseconds per item (negligible)
- Network I/O dominates (milliseconds to seconds per request)
- CPU-bound workloads show greater speedup (up to 5-10x with optimal tuning)

---

## Production Scanner Performance

### TruffleHog (24K stars)

**Workload:** Secret detection in source code
**Pattern:** Multi-stage pipeline with worker multipliers

**Configuration:**

- Base concurrency: 20 workers (default: `runtime.NumCPU()`)
- Detector multiplier: 3x (60 concurrent detectors)
- Verification multiplier: 2x (40 concurrent verifiers)
- Notification multiplier: 1x (20 concurrent notifiers)

**Throughput:**

- **40,000+ items/hour** confirmed in research
- **11 items/second** sustained rate
- Aho-Corasick pre-filtering: 10-100x speedup before regex matching

**Memory:**

- LRU deduplication cache: 50-90% reduction in verification load
- Per-chunk processing: <100 MB memory footprint
- Buffered channels (100-1000 items): Smooth pipeline flow

**Performance Optimizations:**

- Multi-pattern matching (Aho-Corasick): O(n + m) vs O(n × m)
- Worker pool multipliers: Tune per-stage concurrency
- Large channel buffers: Reduce blocking between stages

### Nuclei (26K stars)

**Workload:** Vulnerability scanning with YAML templates
**Pattern:** Multi-tier concurrency with rate limiting

**Configuration:**

- Template concurrency: 25 (default)
- Host bulk size: 25 (default)
- Rate limit: 150 requests/second (default)

**Throughput:**

- **540,000 requests/hour** documented (150 req/sec × 3600 sec)
- **1,000+ hosts/minute** with template clustering
- Request clustering: 2-10x reduction in HTTP requests

**Memory:**

- Stream mode: No input buffering (<50 MB)
- Template execution: Per-target in-memory processing
- Results emitted immediately

**Performance Optimizations:**

- Request clustering: Deduplicate similar HTTP requests
- Host-spray vs template-spray: Choose based on bottleneck
- Thread-safe engine: v3 SDK allows concurrent scans

### Trivy (30K stars)

**Workload:** Container vulnerability scanning
**Pattern:** Generic pipeline with bounded concurrency

**Configuration:**

- Default workers: 5 (conservative)
- Tunable via `--parallel` flag
- Client-server mode: Distributed scanning

**Throughput:**

- **~100 containers/minute** (5 workers)
- **~300 containers/minute** (20 workers, client-server)
- Layer-aware scanning: Caching reduces redundant work

**Memory:**

- <100 MB per scan
- Per-container SBOM: In-memory, immediate GC
- BoltDB constraint: Single-writer limits parallel scans on single machine

**Performance Optimizations:**

- Client-server architecture: Bypass BoltDB single-writer limitation
- Layer caching: Skip unchanged container layers
- Incremental analysis: 10-100x faster on repeat scans

---

## Sources

- Go Scanner Architecture Validation Research (2026-01-01)
- [TruffleHog GitHub Repository](https://github.com/trufflesecurity/trufflehog)
- [Nuclei GitHub Repository](https://github.com/projectdiscovery/nuclei)
- [Trivy GitHub Repository](https://github.com/aquasecurity/trivy)
- [Interface Performance Questions - golang-nuts](https://groups.google.com/g/golang-nuts/c/7tUShPuPfNM)
