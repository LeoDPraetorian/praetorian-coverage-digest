# TruffleHog Architecture Deep Dive

Complete analysis of TruffleHog's Engine struct and optimization patterns.

## Engine Structure

```go
type Engine struct {
    // Concurrency
    concurrency     int
    detectorWorkers int  // 3x base (CPU-bound)
    verifierWorkers int  // 2x base (network-bound)

    // Caching
    ahoCorasickMatcher *ahocorasick.Matcher
    dedupeCache        *lru.Cache[string, bool]

    // Channels (buffer sizes)
    detectableChunksChan chan Chunk  // 1000
    results              chan Result // 100
}
```

## Optimization Stack

1. **Aho-Corasick**: Pre-filter 800+ detectors
2. **LRU Dedupe**: 50-90% verification reduction
3. **Worker Multipliers**: 3x CPU, 2x network, 1x I/O
4. **Buffered Channels**: 1000 for CPU variance

## Throughput Achievement

- **40K+ items/hour** with all optimizations
- **Scales linearly** with concurrency up to I/O limits

**Source**: TruffleHog `pkg/engine/engine.go`

**Content to be expanded with complete Engine analysis.**
