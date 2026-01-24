---
name: sub-clustering-algorithms
description: Use when implementing hierarchical clustering for large graphs - provides algorithm selection (Louvain vs Leiden vs attribute-based), server/client trade-offs, caching strategies, and quality validation patterns
allowed-tools: Read, Grep, Glob
---

# Sub-Clustering Algorithms

**Patterns for hierarchical clustering and sub-cluster computation in graph visualizations.**

## When to Use

Use this skill when:

- Cluster size > 1,000 nodes (direct rendering threshold)
- Need progressive disclosure (drill-down navigation)
- Graph has natural communities (social networks, infrastructure)

**Don't use when:**

- Cluster already < 1,000 nodes (render directly)
- Data is truly uniform (attribute-based subdivision better)
- Real-time updates required (clustering too expensive)

## Quick Reference

### Algorithm Selection Matrix

| Criterion     | Louvain    | Leiden     | Attribute-Based |
| ------------- | ---------- | ---------- | --------------- |
| Speed         | Faster     | Slower     | Fastest         |
| Quality       | Good       | Better     | N/A             |
| Stability     | ⚠️ Unstable | ✅ Stable   | ✅ Stable        |
| Graph Size    | < 100K     | Any size   | Any size        |
| Use Case      | Prototype  | Production | Known structure |
| Deterministic | No         | Yes        | Yes             |

**Recommendation:** Use Leiden for production. Louvain only for prototyping.

### Server vs Client Decision

| Factor           | Server-Side      | Client-Side   |
| ---------------- | ---------------- | ------------- |
| Graph Size       | > 10K nodes      | < 10K nodes   |
| Computation Time | > 2 seconds      | < 2 seconds   |
| Memory Usage     | > 500 MB         | < 500 MB      |
| Result Caching   | Required         | Optional      |
| Offline Support  | Not needed       | Required      |

---

## Algorithm Selection

### Community Detection vs Attribute-Based

**Community Detection (Louvain/Leiden):**
- Uses graph structure (edges, connections)
- Finds "natural" communities
- Good when: Network topology meaningful (social graphs, infrastructure)

**Attribute-Based (Group by field):**
- Uses node properties (country, ASN, class)
- Deterministic (same input → same output)
- Good when: Clear categorical attributes, uniform structure

**See:** [Algorithm Comparison](references/algorithm-comparison.md) for detailed comparison matrices, hybrid patterns, and when to use each approach.

### Louvain vs Leiden

**Stability is the critical difference:**

```typescript
// ❌ Louvain: Run twice, get different results
const clusters1 = louvain(graph); // Node A in cluster 5
const clusters2 = louvain(graph); // Node A in cluster 12 (different!)

// ✅ Leiden: Deterministic
const clusters1 = leiden(graph); // Node A in cluster 5
const clusters2 = leiden(graph); // Node A in cluster 5 (same!)
```

**For production**: Use Leiden. Non-deterministic results confuse users.

### Graphology Integration

```typescript
import louvain from 'graphology-communities-louvain';
import leiden from 'graphology-communities-leiden';

// Returns object: { [nodeId]: clusterNumber }
const clusters = leiden(graph);

// Convert to sub-graphs
const subgraphs = partitionGraph(graph, clusters);
```

---

## Server-Side vs Client-Side Computation

### Decision Criteria

**Rule of Thumb:** If community detection takes >2s, move to server.

**See:** [Server-Client Trade-offs](references/server-client-trade-offs.md) for complete decision tree, backend API patterns, and Web Worker implementations.

### Server-Side Pattern

```go
// Go handler in modules/chariot/backend
func ComputeSubClusters(ctx context.Context, clusterID string, algorithm string) ([]SubCluster, error) {
  // 1. Fetch subgraph from Neo4j
  subgraph := neo4j.FetchSubgraph(ctx, clusterID)

  // 2. Run clustering algorithm
  clusters := runClustering(subgraph, algorithm)

  // 3. Cache result in DynamoDB
  cacheKey := fmt.Sprintf("cluster:%s:algo:%s", clusterID, algorithm)
  dynamodb.Put(ctx, cacheKey, clusters, 24*time.Hour)

  return clusters, nil
}
```

**Frontend Usage:**

```typescript
const { data: subClusters } = useQuery({
  queryKey: ['subClusters', clusterId, 'leiden'],
  queryFn: () => api.computeSubClusters(clusterId, 'leiden'),
  staleTime: Infinity // Never refetch (deterministic result)
});
```

**Why Server-Side:**
- Access to full Neo4j graph (client only has visible subset)
- More CPU/memory available
- Can cache expensive computation
- Can use native graph libraries (faster than JS)

### Client-Side Pattern

**When to Use:** Small clusters (<10K nodes), offline support, low latency

```typescript
import leiden from 'graphology-communities-leiden';

const computeSubClustersClient = (graph: Graph) => {
  // Option 1: Main thread (blocks UI)
  const clusters = leiden(graph);

  // Option 2: Web Worker (non-blocking)
  const worker = new Worker('clustering-worker.js');
  worker.postMessage({ graph: graph.export() });
  worker.onmessage = (e) => setClusters(e.data);
};
```

---

## Caching Strategies

### Why Caching Matters

**Cost of Clustering:**
- 10K nodes: ~500ms (Leiden)
- 50K nodes: ~5 seconds
- 100K nodes: ~30 seconds

**User Experience:**
- Without cache: 5s wait every drill-down
- With cache: Instant (cached result)

**See:** [Caching Patterns](references/caching-patterns.md) for cache key design, invalidation strategies, and multi-level cache implementation.

### Cache Key Design

```typescript
const cacheKey = `cluster:${clusterId}:algo:${algorithm}:version:2`;
```

**Invalidation Triggers:**
- Graph data changes (nodes added/removed)
- Algorithm changes (Louvain → Leiden)
- Algorithm version changes (bug fix in clustering lib)

### TTL Strategy

| Cluster Type              | TTL    | Why                |
| ------------------------- | ------ | ------------------ |
| Static (infrastructure)   | 7 days | Graph rarely changes |
| Dynamic (social)          | 1 day  | Graph evolves      |
| Real-time (monitoring)    | 1 hour | Frequent updates   |

### Multi-Level Cache

**Cache Hierarchy:**
1. **Memory** (React Query cache) - 100ms lookup
2. **IndexedDB** (client-side persistence) - 10ms lookup
3. **DynamoDB** (server-side) - 100ms network + lookup
4. **Compute** (fallback) - 5 seconds

---

## Handling Cluster Instability

### The Problem

**Non-Deterministic Algorithms:**
- Louvain produces different results on each run (random initialization)
- User drills down → sees cluster A
- Navigates back, drills down again → cluster A is different (confusing!)

**Deterministic But Misleading:**
- Leiden is deterministic (same graph → same result)
- But: Adding 1 node can completely change all clusters

### Stabilization Strategies

**Strategy 1: Pin Clusters with Cache**
```typescript
// First drill-down: compute and cache
const clusters = await computeClusters(clusterData);
cache.set(clusterKey, clusters, { ttl: '7d' });

// Subsequent drill-downs: use cached result
// User sees same clusters until cache expires
```

**Strategy 2: Hybrid Algorithm**
```typescript
// Use attribute-based for first level (stable)
const level1 = groupBy(nodes, n => n.asn);

// Then community detection within each group
const level2 = level1.map(group => leiden(graph.subgraph(group)));
```

**Strategy 3: Cluster Fingerprinting**
```typescript
// Assign stable IDs to clusters based on top nodes
const clusterFingerprint = (nodes: Node[]) => {
  const top5 = nodes.slice(0, 5).map(n => n.id).sort().join('-');
  return hash(top5);
};

// Compare fingerprints to detect cluster drift
if (newFingerprint !== cachedFingerprint) {
  console.warn('Cluster changed!');
}
```

---

## Quality Validation

### Cluster Quality Metrics

**Modularity Score:**
- Measures how well-separated clusters are
- Range: -0.5 to 1.0
- Good: > 0.3
- Excellent: > 0.6

```typescript
import { modularity } from 'graphology-metrics';

const clusters = leiden(graph);
const score = modularity(graph, { communities: clusters });

if (score < 0.3) {
  console.warn('Poor clustering quality - consider attribute-based');
}
```

**See:** [Quality Validation](references/quality-validation.md) for complete validation patterns, size distribution checks, and fallback triggers.

### Size Distribution

```typescript
const sizes = Object.values(groupBy(nodes, n => clusters[n])).map(g => g.length);

// Check for degenerate cases
if (Math.max(...sizes) > 0.9 * nodes.length) {
  // 90% of nodes in one cluster - useless!
  throw new Error('Clustering produced single mega-cluster');
}
```

### Fallback to Table

```typescript
const MAX_DEPTH = 5;

if (currentDepth >= MAX_DEPTH && cluster.size > 1000) {
  // Exhausted clustering - show table
  return <TableFallback nodes={cluster.nodes} />;
}
```

---

## Performance Benchmarks

### Leiden Algorithm (Single-Threaded JS)

| Nodes   | Edges   | Time   |
| ------- | ------- | ------ |
| 1,000   | 5,000   | 50 ms  |
| 5,000   | 25,000  | 500 ms |
| 10,000  | 50,000  | 2 sec  |
| 50,000  | 250,000 | 30 sec |
| 100,000 | 500,000 | 2 min  |

**Server-Side (Go with igraph):**
- ~10x faster than JS
- Can handle 1M+ nodes

---

## Common Anti-Patterns

| Anti-Pattern                        | Problem                  | Solution                       |
| ----------------------------------- | ------------------------ | ------------------------------ |
| Client-side clustering on 50K nodes | Browser freeze           | Server-side API                |
| No caching                          | 5s wait every time       | DynamoDB + IndexedDB cache     |
| Using Louvain in production         | Unstable results         | Use Leiden                     |
| No quality validation               | Single 99K node cluster  | Check modularity score         |
| No fallback                         | Stuck when clustering fails | Table view fallback         |

---

## Integration

### Called By

- Graph Explorer feature implementation
- Any component implementing progressive disclosure
- Developers building sub-cluster navigation

### Requires (invoke before starting)

None - foundational clustering skill

### Calls (during execution)

None - provides patterns, doesn't invoke other skills

### Pairs With (conditional)

- **`hierarchical-graph-navigation`** (LIBRARY) - Navigation through clusters
  - `Read(".claude/skill-library/development/frontend/graphing/hierarchical-graph-navigation/SKILL.md")`
- **`optimizing-neo4j-queries`** (LIBRARY) - Server-side subgraph fetch
  - `Read(".claude/skill-library/development/neo4j/optimizing-neo4j-queries/SKILL.md")`

---

## Sources

- Hierarchical Clustering (arXiv): https://arxiv.org/abs/1210.5693
- ForceAtlas2 Paper: https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0098679
- yFiles Clustering: https://www.yworks.com/pages/clustering-graphs-and-networks
- Cambridge Intelligence: https://cambridge-intelligence.com/visualize-large-networks/
- Graphology Communities: https://github.com/graphology/graphology
- Sigma.js Issue #239: https://github.com/jacomyal/sigma.js/issues/239
