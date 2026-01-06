# Production Benchmarks

Throughput achievements from production Go scanners.

## TruffleHog (Secret Scanner)

| Metric             | Value           | Optimizations Used         |
| ------------------ | --------------- | -------------------------- |
| Throughput         | 40K+ items/hour | All 6 techniques           |
| Detectors          | 800+            | Aho-Corasick pre-filtering |
| Verification cache | 50-90% hit rate | LRU deduplication          |
| Worker ratio       | 3x/2x/1x        | Stage-specific multipliers |

## Nuclei (Vulnerability Scanner)

| Metric            | Value              | Optimizations Used         |
| ----------------- | ------------------ | -------------------------- |
| Throughput        | 540K requests/hour | Clustering + rate limiting |
| Request reduction | 2-10x              | Signature-based clustering |
| Templates         | 6000+              | Template parallelization   |

## golangci-lint (Linter)

| Metric        | Value      | Optimizations Used      |
| ------------- | ---------- | ----------------------- |
| CI/CD speedup | 10-100x    | Incremental caching     |
| Cache type    | File-level | Hash-based invalidation |
| Linters       | 100+       | Parallel execution      |

## Scaling Patterns

- **Linear scaling** up to I/O limits
- **Diminishing returns** past 32-64 workers
- **Memory trade-offs** for cache sizes

**Content to be expanded with benchmark methodology.**
