# Server-Side vs Client-Side Trade-Offs

**Complete decision criteria and implementation patterns for clustering computation location.**

## Decision Matrix

### When to Use Server-Side

**Graph Size:**
- >10,000 nodes → MUST use server
- 5,000-10,000 nodes → Consider server if computation >2s
- <5,000 nodes → Client is fine

**Computation Time:**
- >2 seconds → Server (blocks UI too long)
- <2 seconds → Client acceptable

**Memory Usage:**
- >500 MB → Server (mobile browsers crash)
- <500 MB → Client acceptable

**Data Access:**
- Need full graph → Server (client only has visible subset)
- Visible subset sufficient → Client

**Caching:**
- Results must be shared across users → Server + DynamoDB
- Per-user caching sufficient → Client + IndexedDB

### When to Use Client-Side

**Offline Support:**
- App must work offline → Client (Web Workers for non-blocking)

**Low Latency:**
- Sub-second response required → Client (no network round-trip)

**Privacy:**
- Sensitive data can't leave device → Client

**Cost:**
- High computation volume → Client (offload to user's CPU)

## Server-Side Implementation

### Backend API (Go + Lambda)

```go
package handlers

import (
  "context"
  "encoding/json"
  "fmt"
  "time"

  "github.com/aws/aws-lambda-go/events"
  "github.com/praetorian-inc/chariot/backend/pkg/neo4j"
  "github.com/praetorian-inc/chariot/backend/pkg/clustering"
)

type ComputeClustersRequest struct {
  ClusterID string `json:"clusterId"`
  Algorithm string `json:"algorithm"` // 'louvain' | 'leiden' | 'attribute'
  Attribute string `json:"attribute,omitempty"` // For attribute-based
}

type ComputeClustersResponse struct {
  Clusters map[string]int `json:"clusters"` // nodeId -> clusterNumber
  Metadata ClusterMetadata `json:"metadata"`
}

type ClusterMetadata struct {
  NumClusters   int     `json:"numClusters"`
  Modularity    float64 `json:"modularity"`
  ComputeTime   int64   `json:"computeTimeMs"`
  NodeCount     int     `json:"nodeCount"`
  EdgeCount     int     `json:"edgeCount"`
}

func ComputeClusters(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
  var req ComputeClustersRequest
  if err := json.Unmarshal([]byte(request.Body), &req); err != nil {
    return errorResponse(400, "Invalid request body")
  }

  startTime := time.Now()

  // 1. Fetch subgraph from Neo4j
  subgraph, err := neo4j.FetchSubgraph(ctx, req.ClusterID)
  if err != nil {
    return errorResponse(500, fmt.Sprintf("Failed to fetch subgraph: %v", err))
  }

  // 2. Validate size (prevent DoS)
  if subgraph.NodeCount > 1_000_000 {
    return errorResponse(400, "Cluster too large for synchronous computation")
  }

  // 3. Run clustering algorithm
  var clusters map[string]int
  var modularity float64

  switch req.Algorithm {
  case "leiden":
    clusters = clustering.Leiden(subgraph)
    modularity = clustering.ComputeModularity(subgraph, clusters)

  case "louvain":
    clusters = clustering.Louvain(subgraph)
    modularity = clustering.ComputeModularity(subgraph, clusters)

  case "attribute":
    if req.Attribute == "" {
      return errorResponse(400, "Attribute required for attribute-based clustering")
    }
    clusters = clustering.GroupByAttribute(subgraph, req.Attribute)
    modularity = 0 // Not applicable

  default:
    return errorResponse(400, fmt.Sprintf("Unknown algorithm: %s", req.Algorithm))
  }

  computeTime := time.Since(startTime).Milliseconds()

  // 4. Cache result in DynamoDB
  cacheKey := fmt.Sprintf("cluster:%s:algo:%s", req.ClusterID, req.Algorithm)
  ttl := 24 * time.Hour
  if err := cacheResult(ctx, cacheKey, clusters, ttl); err != nil {
    // Log but don't fail - caching is best-effort
    fmt.Printf("Failed to cache result: %v\n", err)
  }

  // 5. Build response
  numClusters := len(uniqueValues(clusters))
  response := ComputeClustersResponse{
    Clusters: clusters,
    Metadata: ClusterMetadata{
      NumClusters: numClusters,
      Modularity:  modularity,
      ComputeTime: computeTime,
      NodeCount:   subgraph.NodeCount,
      EdgeCount:   subgraph.EdgeCount,
    },
  }

  return jsonResponse(200, response)
}
```

### Frontend Integration (React + TanStack Query)

```typescript
import { useQuery } from '@tanstack/react-query';

type ComputeClustersParams = {
  clusterId: string;
  algorithm: 'leiden' | 'louvain' | 'attribute';
  attribute?: string;
};

type ComputeClustersResponse = {
  clusters: Record<string, number>;
  metadata: {
    numClusters: number;
    modularity: number;
    computeTimeMs: number;
    nodeCount: number;
    edgeCount: number;
  };
};

const computeClusters = async (params: ComputeClustersParams): Promise<ComputeClustersResponse> => {
  const response = await fetch('/api/clusters/compute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    throw new Error(`Clustering failed: ${response.statusText}`);
  }

  return response.json();
};

// React component
const useSubClusters = (clusterId: string, algorithm: 'leiden' | 'louvain') => {
  return useQuery({
    queryKey: ['subClusters', clusterId, algorithm],
    queryFn: () => computeClusters({ clusterId, algorithm }),
    staleTime: Infinity, // Leiden is deterministic, never refetch
    cacheTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
    retry: 2
  });
};

// Usage
const GraphView = ({ clusterId }: { clusterId: string }) => {
  const { data, isLoading, error } = useSubClusters(clusterId, 'leiden');

  if (isLoading) return <Spinner>Computing sub-clusters...</Spinner>;
  if (error) return <Error>Failed to compute clusters</Error>;

  return <ClusteredGraph clusters={data.clusters} />;
};
```

## Client-Side Implementation

### Main Thread (Blocking)

```typescript
import leiden from 'graphology-communities-leiden';

const computeSubClustersSync = (graph: Graph): Record<string, number> => {
  // Blocks UI during computation
  const clusters = leiden(graph);
  return clusters;
};

// Usage - simple but blocks
const clusters = computeSubClustersSync(graph); // UI frozen for 2-5 seconds
```

**Use when:**
- Graph <1000 nodes (computation <200ms)
- Simplicity matters more than UX

### Web Worker (Non-Blocking)

**worker.ts:**
```typescript
import leiden from 'graphology-communities-leiden';
import { Graph } from 'graphology';

self.onmessage = (e: MessageEvent) => {
  const { graphData } = e.data;

  // Reconstruct graph from serialized data
  const graph = new Graph();
  graphData.nodes.forEach((node: any) => graph.addNode(node.id, node.attributes));
  graphData.edges.forEach((edge: any) => graph.addEdge(edge.source, edge.target, edge.attributes));

  // Compute clusters
  const clusters = leiden(graph);

  // Send result back
  self.postMessage({ clusters });
};
```

**Main thread:**
```typescript
const computeSubClustersAsync = (graph: Graph): Promise<Record<string, number>> => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./clustering-worker.ts', import.meta.url));

    worker.onmessage = (e: MessageEvent) => {
      resolve(e.data.clusters);
      worker.terminate();
    };

    worker.onerror = (error) => {
      reject(error);
      worker.terminate();
    };

    // Serialize graph for transfer
    const graphData = {
      nodes: graph.nodes().map(n => ({ id: n, attributes: graph.getNodeAttributes(n) })),
      edges: graph.edges().map(e => ({
        source: graph.source(e),
        target: graph.target(e),
        attributes: graph.getEdgeAttributes(e)
      }))
    };

    worker.postMessage({ graphData });
  });
};

// Usage - non-blocking
const clusters = await computeSubClustersAsync(graph); // UI remains responsive
```

**Use when:**
- Graph 1,000-10,000 nodes (computation 200ms-2s)
- Must remain responsive during computation

## Hybrid Approach

### Progressive Enhancement

```typescript
const computeClusters = async (clusterId: string, graph: Graph): Promise<Record<string, number>> => {
  const nodeCount = graph.order;

  // Small: Client-side sync
  if (nodeCount < 1000) {
    return leiden(graph);
  }

  // Medium: Client-side async (Web Worker)
  if (nodeCount < 10000) {
    return computeSubClustersAsync(graph);
  }

  // Large: Server-side
  const response = await api.computeClusters({ clusterId, algorithm: 'leiden' });
  return response.clusters;
};
```

### Fallback Strategy

```typescript
const computeClustersWithFallback = async (clusterId: string, graph: Graph) => {
  try {
    // Try server first (best for large graphs)
    return await api.computeClusters({ clusterId, algorithm: 'leiden' });
  } catch (error) {
    console.warn('Server computation failed, falling back to client:', error);

    // Fallback to client
    if (graph.order < 10000) {
      return computeSubClustersAsync(graph);
    } else {
      throw new Error('Graph too large for client-side computation');
    }
  }
};
```

## Cost Analysis

### Server-Side Costs

**AWS Lambda (1.5GB memory):**
- 10,000 nodes: 2 sec × $0.0000166667/sec = $0.000033
- 50,000 nodes: 30 sec × $0.0000166667/sec = $0.0005
- 100,000 nodes: 120 sec × $0.0000166667/sec = $0.002

**DynamoDB (caching):**
- Average entry size: 50 KB
- 1M cached results: 50 GB × $0.25/GB = $12.50/month
- Read cost: 1M reads/month × $0.25/1M = $0.25/month

**Total monthly cost (1M computations with 90% cache hit rate):**
- Compute: 100K × $0.0005 = $50
- Cache storage: $12.50
- Cache reads: 900K × $0.25/1M = $0.22
- **Total: ~$63/month**

### Client-Side Costs

- Infrastructure: $0 (runs on user's device)
- Development: Higher (Web Worker complexity)
- User Experience: Variable (fast on desktop, slow on mobile)

## Performance Benchmarks

**Test Setup:** 10,000 nodes, 50,000 edges

| Location        | Environment           | Time  | Blocking? |
| --------------- | --------------------- | ----- | --------- |
| Server          | AWS Lambda (1.5GB)    | 850ms | No        |
| Client (sync)   | Desktop (M1 Mac)      | 900ms | Yes       |
| Client (worker) | Desktop (M1 Mac)      | 950ms | No        |
| Client (sync)   | Mobile (iPhone 12)    | 3.2s  | Yes       |
| Client (worker) | Mobile (iPhone 12)    | 3.5s  | No        |

**Conclusion:** Server is fastest and most consistent. Client-side acceptable for desktop but slow on mobile.
