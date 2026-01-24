# Quality Validation for Sub-Clustering

**Metrics and patterns to validate clustering quality and detect degenerate cases.**

## Why Quality Validation Matters

### Common Failure Modes

**Degenerate Case 1: Single Mega-Cluster**
- Algorithm produces 1 cluster with 99,999 nodes + 1000 tiny clusters
- Useless for progressive disclosure (no actual subdivision)

**Degenerate Case 2: Over-Segmentation**
- Algorithm produces 10,000 clusters (one per node)
- Defeats purpose of clustering

**Degenerate Case 3: Imbalanced Distribution**
- 3 clusters: [50,000 nodes, 5 nodes, 3 nodes]
- First cluster not subdivided, last two are trivial

## Modularity Score

### What It Measures

**Modularity** quantifies how well-separated clusters are:

```
Q = (1 / 2m) Σ [A_ij - (k_i * k_j) / 2m] * δ(c_i, c_j)

Where:
- m = total edges
- A_ij = adjacency matrix (1 if edge between i,j)
- k_i = degree of node i
- δ(c_i, c_j) = 1 if nodes i,j in same cluster, 0 otherwise
```

**Interpretation:**
- -0.5 to 1.0 range
- 0 = random clustering (no structure)
- >0.3 = good clustering
- >0.6 = excellent clustering
- <0 = worse than random (bad!)

### Implementation (Graphology)

```typescript
import { modularity } from 'graphology-metrics';
import leiden from 'graphology-communities-leiden';

const clusters = leiden(graph);
const score = modularity(graph, { communities: clusters });

console.log(`Modularity: ${score.toFixed(3)}`);

// Validation
if (score < 0.3) {
  console.warn('Poor clustering quality - consider attribute-based instead');
}

if (score < 0) {
  console.error('Clustering worse than random - algorithm failed');
  // Fallback to attribute-based
}
```

### When Modularity Doesn't Apply

**Attribute-Based Clustering:**
- Not optimizing for modularity
- No meaningful modularity score
- Use size distribution instead

**Disconnected Graphs:**
- Each component has separate modularity
- Overall score may be misleading

**Weighted Graphs:**
- Need weighted modularity formula
- Graphology supports `weight` attribute

## Size Distribution Validation

### Balance Check

```typescript
const validateSizeDistribution = (clusters: Record<string, number>, nodes: Node[]) => {
  // Group nodes by cluster
  const clusterSizes = Object.values(groupBy(nodes, n => clusters[n.id])).map(g => g.length);

  const totalNodes = nodes.length;
  const numClusters = clusterSizes.length;
  const maxClusterSize = Math.max(...clusterSizes);
  const minClusterSize = Math.min(...clusterSizes);

  // Check 1: Not a single mega-cluster
  if (maxClusterSize > 0.9 * totalNodes) {
    return {
      valid: false,
      reason: `Single mega-cluster detected: ${maxClusterSize} / ${totalNodes} nodes`,
      suggestion: 'Try attribute-based clustering or increase resolution parameter'
    };
  }

  // Check 2: Not over-segmented
  if (numClusters > totalNodes * 0.5) {
    return {
      valid: false,
      reason: `Over-segmentation: ${numClusters} clusters for ${totalNodes} nodes`,
      suggestion: 'Decrease resolution parameter'
    };
  }

  // Check 3: Reasonable balance
  const imbalanceRatio = maxClusterSize / minClusterSize;
  if (imbalanceRatio > 100) {
    return {
      valid: false,
      reason: `Severe imbalance: largest cluster ${imbalanceRatio}x bigger than smallest`,
      suggestion: 'Consider attribute-based pre-clustering'
    };
  }

  return { valid: true };
};
```

### Target Distribution

**Good distribution characteristics:**

| Metric              | Target        | Why                                   |
| ------------------- | ------------- | ------------------------------------- |
| Largest cluster     | <50% of total | Ensures meaningful subdivision        |
| Smallest cluster    | >10 nodes     | Avoids trivial clusters               |
| Imbalance ratio     | <10x          | Balanced subdivisions                 |
| Number of clusters  | 5-50          | Manageable for UI, useful for drill-down |

### Gini Coefficient (Inequality Measure)

```typescript
const computeGini = (sizes: number[]): number => {
  const sorted = sizes.sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);

  let giniSum = 0;
  for (let i = 0; i < n; i++) {
    giniSum += (2 * (i + 1) - n - 1) * sorted[i];
  }

  return giniSum / (n * sum);
};

// Interpretation
// 0 = perfect equality (all clusters same size)
// 1 = perfect inequality (one cluster has all nodes)

const gini = computeGini(clusterSizes);
if (gini > 0.7) {
  console.warn(`High inequality detected: Gini = ${gini.toFixed(2)}`);
}
```

## Cluster Cohesion

### Internal Edge Density

```typescript
const computeCohesion = (graph: Graph, cluster: Set<string>): number => {
  let internalEdges = 0;
  let possibleEdges = 0;

  cluster.forEach(nodeA => {
    cluster.forEach(nodeB => {
      if (nodeA !== nodeB) {
        possibleEdges++;
        if (graph.hasEdge(nodeA, nodeB)) {
          internalEdges++;
        }
      }
    });
  });

  // Cohesion = actual edges / possible edges
  return possibleEdges > 0 ? internalEdges / possibleEdges : 0;
};

// Validate all clusters
const validateCohesion = (graph: Graph, clusters: Record<string, number>) => {
  const clusterSets = new Map<number, Set<string>>();

  // Group nodes by cluster
  Object.entries(clusters).forEach(([nodeId, clusterId]) => {
    if (!clusterSets.has(clusterId)) {
      clusterSets.set(clusterId, new Set());
    }
    clusterSets.get(clusterId)!.add(nodeId);
  });

  // Compute cohesion for each cluster
  const cohesions = Array.from(clusterSets.entries()).map(([clusterId, nodes]) => ({
    clusterId,
    cohesion: computeCohesion(graph, nodes),
    size: nodes.size
  }));

  // Check for low cohesion (sparse clusters)
  const lowCohesion = cohesions.filter(c => c.cohesion < 0.1 && c.size > 10);
  if (lowCohesion.length > 0) {
    console.warn(`${lowCohesion.length} clusters have low cohesion (<0.1)`);
  }

  return cohesions;
};
```

## Complete Validation Pipeline

```typescript
type ValidationResult = {
  valid: boolean;
  modularity?: number;
  sizeDistribution: {
    numClusters: number;
    largestCluster: number;
    smallestCluster: number;
    imbalanceRatio: number;
    gini: number;
  };
  cohesion: {
    mean: number;
    min: number;
    max: number;
  };
  warnings: string[];
  errors: string[];
};

const validateClustering = (
  graph: Graph,
  clusters: Record<string, number>,
  algorithm: 'leiden' | 'louvain' | 'attribute'
): ValidationResult => {
  const warnings: string[] = [];
  const errors: string[] = [];

  // 1. Modularity (only for community detection)
  let modularityScore: number | undefined;
  if (algorithm !== 'attribute') {
    modularityScore = modularity(graph, { communities: clusters });

    if (modularityScore < 0) {
      errors.push(`Negative modularity (${modularityScore.toFixed(3)}) - worse than random`);
    } else if (modularityScore < 0.3) {
      warnings.push(`Low modularity (${modularityScore.toFixed(3)}) - consider attribute-based`);
    }
  }

  // 2. Size distribution
  const nodes = graph.nodes();
  const clusterSizes = Object.values(groupBy(nodes, n => clusters[n])).map(g => g.length);

  const sizeDistribution = {
    numClusters: clusterSizes.length,
    largestCluster: Math.max(...clusterSizes),
    smallestCluster: Math.min(...clusterSizes),
    imbalanceRatio: Math.max(...clusterSizes) / Math.min(...clusterSizes),
    gini: computeGini(clusterSizes)
  };

  // Validation checks
  if (sizeDistribution.largestCluster > 0.9 * nodes.length) {
    errors.push(`Mega-cluster: ${sizeDistribution.largestCluster}/${nodes.length} nodes`);
  }

  if (sizeDistribution.numClusters > nodes.length * 0.5) {
    errors.push(`Over-segmentation: ${sizeDistribution.numClusters} clusters`);
  }

  if (sizeDistribution.imbalanceRatio > 100) {
    warnings.push(`Severe imbalance: ${sizeDistribution.imbalanceRatio.toFixed(1)}x ratio`);
  }

  if (sizeDistribution.gini > 0.7) {
    warnings.push(`High inequality: Gini = ${sizeDistribution.gini.toFixed(2)}`);
  }

  // 3. Cohesion
  const cohesions = validateCohesion(graph, clusters);
  const cohesionValues = cohesions.map(c => c.cohesion);

  const cohesionStats = {
    mean: cohesionValues.reduce((a, b) => a + b, 0) / cohesionValues.length,
    min: Math.min(...cohesionValues),
    max: Math.max(...cohesionValues)
  };

  if (cohesionStats.mean < 0.1) {
    warnings.push(`Low average cohesion: ${cohesionStats.mean.toFixed(3)}`);
  }

  return {
    valid: errors.length === 0,
    modularity: modularityScore,
    sizeDistribution,
    cohesion: cohesionStats,
    warnings,
    errors
  };
};
```

## Fallback Triggers

```typescript
const shouldFallbackToTable = (
  cluster: Cluster,
  depth: number,
  validation: ValidationResult
): boolean => {
  const MAX_DEPTH = 5;

  // 1. Exhausted clustering depth
  if (depth >= MAX_DEPTH && cluster.size > 1000) return true;

  // 2. Validation failed
  if (!validation.valid) return true;

  // 3. Single mega-cluster (no subdivision)
  if (validation.sizeDistribution.largestCluster > 0.9 * cluster.size) return true;

  // 4. Too many tiny clusters
  if (validation.sizeDistribution.numClusters > cluster.size * 0.5) return true;

  return false;
};

// Usage
if (shouldFallbackToTable(cluster, currentDepth, validation)) {
  return (
    <div>
      <Alert severity="info">
        This cluster is too large or complex for graph visualization.
      </Alert>
      <TableView nodes={cluster.nodes} />
    </div>
  );
}
```

## Adaptive Algorithm Selection

```typescript
const selectBestAlgorithm = (graph: Graph): 'leiden' | 'attribute' => {
  // Try Leiden first
  const leidenClusters = leiden(graph);
  const leidenValidation = validateClustering(graph, leidenClusters, 'leiden');

  // If validation passes, use Leiden
  if (leidenValidation.valid && leidenValidation.modularity! > 0.3) {
    return 'leiden';
  }

  // Otherwise, fallback to attribute-based
  console.warn('Leiden produced poor clustering, falling back to attribute-based');
  return 'attribute';
};
```
