# LRU Cache Strategies

Deep dive into deduplication caching for scanner optimization.

## Cache Key Design

```go
// Effective key components
key := fmt.Sprintf("%s:%s:%s",
    detectorType,  // Which detector found it
    rawValue,      // The actual secret/finding
    sourceMeta,    // File path, line number, commit
)
```

## Sizing Strategy

| Repo Size     | Recommended Size | Memory (~) |
| ------------- | ---------------- | ---------- |
| Small (<1K)   | 1,000 entries    | ~1 MB      |
| Medium        | 10,000 entries   | ~10 MB     |
| Large (100K+) | 100,000 entries  | ~100 MB    |

## Eviction Policies

- **LRU** (default): Best for general use
- **LFU**: Better if some findings appear repeatedly
- **TTL**: Add expiration for long-running scans

## Thread Safety

HashiCorp's `golang-lru/v2` is thread-safe by default. No additional locking needed.

**Content to be expanded with TruffleHog cache analysis.**
