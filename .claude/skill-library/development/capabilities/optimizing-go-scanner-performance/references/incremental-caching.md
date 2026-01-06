# Incremental Caching

Deep dive into CI/CD optimization through hash-based caching.

## Cache Structure

```go
type IncrementalCache struct {
    // In-memory for speed
    entries map[string]CacheEntry
    mu      sync.RWMutex

    // Persistent storage
    dbPath  string
}

type CacheEntry struct {
    FileHash   string      // SHA256 of file content
    Results    []Finding   // Cached scan results
    ScanTime   time.Time   // When scanned
    ToolVersion string     // Invalidate on upgrade
}
```

## Invalidation Triggers

1. **File content changed** (hash mismatch)
2. **Scanner version upgraded** (new rules)
3. **Cache TTL expired** (freshness guarantee)
4. **Manual invalidation** (config change)

## golangci-lint Implementation

```go
// Check cache before scanning
hash := computeFileHash(path)
if cached, ok := cache.Get(path, hash); ok {
    return cached  // 10-100x faster
}

// Scan and cache
results := runLinters(path)
cache.Set(path, hash, results)
return results
```

## Storage Options

| Storage   | Speed   | Persistence | Use Case    |
| --------- | ------- | ----------- | ----------- |
| In-memory | Fastest | No          | Single run  |
| SQLite    | Fast    | Yes         | CI/CD       |
| Redis     | Fast    | Yes         | Distributed |

**Content to be expanded with golangci-lint cache analysis.**
