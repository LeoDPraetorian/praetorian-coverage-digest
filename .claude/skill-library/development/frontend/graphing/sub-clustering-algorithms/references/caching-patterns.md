# Caching Patterns for Sub-Clustering

**Multi-level caching strategies to avoid expensive re-computation.**

## Why Caching is Critical

### Computation Costs

**Leiden Algorithm Performance (Single-Threaded JS):**

| Nodes   | Edges   | Time      | Cost (AWS Lambda @ $0.20/GB-hour) |
| ------- | ------- | --------- | ---------------------------------- |
| 1,000   | 5,000   | 50 ms     | $0.0001                            |
| 5,000   | 25,000  | 500 ms    | $0.001                             |
| 10,000  | 50,000  | 2 sec     | $0.004                             |
| 50,000  | 250,000 | 30 sec    | $0.06                              |
| 100,000 | 500,000 | 2 min     | $0.40                              |

### User Experience Impact

**Without Cache:**
- User drills into cluster: 5s wait
- User navigates back, drills again: 5s wait (re-compute)
- 10 drill-downs = 50 seconds wasted

**With Cache:**
- First drill: 5s compute + cache
- Subsequent drills: <100ms (cache hit)
- 10 drill-downs = 5 seconds + 9×100ms = ~6 seconds

## Cache Key Design

### Good Cache Key Structure

```typescript
type CacheKey = {
  clusterId: string;       // Which cluster
  algorithm: string;       // 'louvain' | 'leiden' | 'attribute'
  algorithmVersion: string; // '1.2.0' - track library version
  dataVersion: string;      // Graph data version/hash
};

const buildKey = (key: CacheKey) =>
  `cluster:${key.clusterId}:algo:${key.algorithm}:v${key.algorithmVersion}:data:${key.dataVersion}`;

// Example: "cluster:abc123:algo:leiden:v1.2.0:data:7f9a2b"
```

### Invalidation Triggers

| Event                        | Action                      | Why                                 |
| ---------------------------- | --------------------------- | ----------------------------------- |
| Node added to cluster        | Invalidate cluster cache    | Result would be different           |
| Node removed from cluster    | Invalidate cluster cache    | Result would be different           |
| Edge added/removed           | Invalidate cluster cache    | Graph structure changed             |
| Algorithm library updated    | Increment algorithmVersion  | Bug fixes may change results        |
| User changes algorithm       | Use different cache key     | Louvain ≠ Leiden                    |

### Version Hashing Strategy

```typescript
// Hash graph data for version detection
const computeGraphHash = (graph: Graph) => {
  const nodeIds = graph.nodes().sort().join(',');
  const edgeIds = graph.edges().sort().join(',');
  return hash(`${nodeIds}:${edgeIds}`).slice(0, 8);
};

// Include in cache key
const dataVersion = computeGraphHash(subgraph);
const cacheKey = buildKey({ clusterId, algorithm: 'leiden', algorithmVersion: '1.2.0', dataVersion });
```

## TTL Strategy

### Time-To-Live by Use Case

```typescript
const getTTL = (clusterType: string) => {
  switch (clusterType) {
    case 'infrastructure':
      return 7 * 24 * 60 * 60; // 7 days - rarely changes

    case 'social':
      return 24 * 60 * 60; // 1 day - evolves slowly

    case 'monitoring':
      return 60 * 60; // 1 hour - real-time updates

    case 'static':
      return Infinity; // Never expire - immutable dataset

    default:
      return 24 * 60 * 60; // 1 day default
  }
};
```

### Adaptive TTL

```typescript
// Shorter TTL for frequently-changing clusters
const getTTL = (cluster: Cluster) => {
  const changeRate = cluster.recentChanges / cluster.age;

  if (changeRate > 0.1) return 1 * 60 * 60;      // High change: 1 hour
  if (changeRate > 0.01) return 24 * 60 * 60;    // Medium change: 1 day
  return 7 * 24 * 60 * 60;                       // Low change: 7 days
};
```

## Multi-Level Cache Implementation

### Cache Hierarchy

```
Request
  ↓
L1: Memory (React Query) - 100ms
  ↓ (miss)
L2: IndexedDB (client) - 10ms
  ↓ (miss)
L3: DynamoDB (server) - 100ms + network
  ↓ (miss)
L4: Compute (fallback) - 5 seconds
```

### Frontend Implementation

```typescript
const getClusters = async (clusterId: string, algorithm: string): Promise<Clusters> => {
  const cacheKey = buildCacheKey(clusterId, algorithm);

  // L1: React Query handles memory cache automatically
  // (configured via staleTime in useQuery)

  // L2: IndexedDB
  const cachedData = await idb.get('clusters', cacheKey);
  if (cachedData && !isStale(cachedData)) {
    return cachedData.clusters;
  }

  // L3: Server cache (DynamoDB via API)
  try {
    const serverCached = await api.getClusters(cacheKey);
    if (serverCached) {
      // Populate L2 for next time
      await idb.put('clusters', cacheKey, {
        clusters: serverCached,
        timestamp: Date.now()
      });
      return serverCached;
    }
  } catch (error) {
    console.warn('Server cache miss:', error);
  }

  // L4: Compute (most expensive)
  const computed = await api.computeClusters(clusterId, algorithm);

  // Backfill all levels
  await idb.put('clusters', cacheKey, {
    clusters: computed,
    timestamp: Date.now()
  });

  return computed;
};

// React Query usage
const { data: clusters } = useQuery({
  queryKey: ['clusters', clusterId, algorithm],
  queryFn: () => getClusters(clusterId, algorithm),
  staleTime: 5 * 60 * 1000 // L1: 5 minute memory cache
});
```

### Backend Implementation (Go + DynamoDB)

```go
func GetOrComputeClusters(ctx context.Context, clusterID string, algorithm string) (Clusters, error) {
  cacheKey := fmt.Sprintf("cluster:%s:algo:%s:v1", clusterID, algorithm)

  // L3: Try DynamoDB cache
  cached, err := dynamoCache.Get(ctx, cacheKey)
  if err == nil {
    return cached.Clusters, nil
  }

  // L4: Compute
  subgraph, err := neo4j.FetchSubgraph(ctx, clusterID)
  if err != nil {
    return nil, err
  }

  clusters := runClustering(subgraph, algorithm)

  // Store in DynamoDB
  ttl := 24 * time.Hour
  dynamoCache.Put(ctx, cacheKey, CacheEntry{
    Clusters: clusters,
    ComputedAt: time.Now(),
  }, ttl)

  return clusters, nil
}
```

## Cache Warming

### Predictive Pre-Computation

```typescript
// When user views cluster, pre-compute likely drill-downs
const warmCache = async (currentCluster: Cluster) => {
  // Get top 3 sub-clusters by size
  const topSubClusters = currentCluster.children
    .sort((a, b) => b.size - a.size)
    .slice(0, 3);

  // Pre-compute in background
  for (const subCluster of topSubClusters) {
    // Use lower priority API queue
    api.computeClusters(subCluster.id, 'leiden', { priority: 'low' });
  }
};
```

### Batch Pre-Computation

```bash
# Cron job: Pre-compute common drill-downs nightly
#!/bin/bash

# Get all clusters > 1000 nodes
clusters=$(psql -t -c "SELECT id FROM clusters WHERE size > 1000")

for cluster_id in $clusters; do
  # Compute and cache
  curl -X POST "https://api.example.com/clusters/$cluster_id/compute?algorithm=leiden"
  sleep 1 # Rate limit
done
```

## Cache Monitoring

### Metrics to Track

```typescript
type CacheMetrics = {
  l1Hits: number;      // React Query memory hits
  l2Hits: number;      // IndexedDB hits
  l3Hits: number;      // DynamoDB hits
  l4Computes: number;  // Full computation fallback
  avgLatency: {
    l1: number;  // ~100ms
    l2: number;  // ~10ms
    l3: number;  // ~100-200ms
    l4: number;  // ~5000ms
  };
};

// Track cache performance
const recordCacheHit = (level: 'l1' | 'l2' | 'l3' | 'l4', latency: number) => {
  metrics[`${level}Hits`]++;
  metrics.avgLatency[level] =
    (metrics.avgLatency[level] * (metrics[`${level}Hits`] - 1) + latency) / metrics[`${level}Hits`];
};
```

### Cache Hit Rate Alert

```typescript
// Alert if cache hit rate drops below threshold
const checkCacheHealth = () => {
  const totalRequests = metrics.l1Hits + metrics.l2Hits + metrics.l3Hits + metrics.l4Computes;
  const cacheHits = metrics.l1Hits + metrics.l2Hits + metrics.l3Hits;
  const hitRate = cacheHits / totalRequests;

  if (hitRate < 0.8) {
    console.error(`Cache hit rate critically low: ${(hitRate * 100).toFixed(1)}%`);
    // Send alert to monitoring system
  }
};
```

## Cache Eviction Strategies

### LRU (Least Recently Used)

```typescript
class LRUCache<K, V> {
  private cache = new Map<K, { value: V; lastAccess: number }>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      entry.lastAccess = Date.now();
      return entry.value;
    }
  }

  put(key: K, value: V) {
    if (this.cache.size >= this.maxSize) {
      // Evict least recently used
      let oldestKey: K | undefined;
      let oldestTime = Infinity;

      for (const [k, v] of this.cache.entries()) {
        if (v.lastAccess < oldestTime) {
          oldestTime = v.lastAccess;
          oldestKey = k;
        }
      }

      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, { value, lastAccess: Date.now() });
  }
}
```

### Size-Based Eviction (IndexedDB)

```typescript
// Evict when IndexedDB quota exceeded
const evictOldEntries = async () => {
  const estimate = await navigator.storage.estimate();
  const usagePercent = (estimate.usage! / estimate.quota!) * 100;

  if (usagePercent > 80) {
    // Get all entries sorted by age
    const entries = await idb.getAll('clusters');
    entries.sort((a, b) => a.timestamp - b.timestamp);

    // Delete oldest 25%
    const toDelete = entries.slice(0, Math.floor(entries.length * 0.25));
    for (const entry of toDelete) {
      await idb.delete('clusters', entry.key);
    }
  }
};
```
