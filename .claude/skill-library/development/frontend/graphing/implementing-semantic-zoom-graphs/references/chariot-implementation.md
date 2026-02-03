# Chariot-Specific Implementation Guide

Reference for implementing semantic zoom in the Chariot Graph Explorer.

## File Locations

| Component             | Path                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------- |
| Query construction    | `modules/chariot/ui/src/components/nodeGraph/hooks/data/useGraphData/queries.ts`          |
| Relationship fetching | `modules/chariot/ui/src/components/nodeGraph/hooks/data/useGraphData/useRelationships.ts` |
| Graph state           | `modules/chariot/ui/src/components/nodeGraph/core/GraphStateProvider.tsx`                 |
| Graph loader          | `modules/chariot/ui/src/components/nodeGraph/GraphLoader.tsx`                             |
| LOD hook              | `modules/chariot/ui/src/components/nodeGraph/hooks/useGraphLOD.ts`                        |
| Viewport culling      | `modules/chariot/ui/src/components/nodeGraph/hooks/useViewportCulling.ts`                 |

## Immediate Fix: IN Clause

### queries.ts Changes

**In createAssetToRiskQuery function**

```typescript
// BEFORE
export const createAssetToRiskQuery = (assetKeys: string[]): GraphQuery => ({
  node: {
    labels: ["Risk"],
    filters: [],
    relationships: [
      {
        label: "HAS_VULNERABILITY",
        source: {
          labels: ["Asset"],
          filters: [
            {
              field: "",
              operator: "OR",
              value: assetKeys.map((key: string) => ({
                field: "key",
                operator: "=",
                value: key,
              })) as any,
            },
          ],
        },
      },
    ],
  },
  limit: 101,
  page: 0,
});

// AFTER
export const createAssetToRiskQuery = (assetKeys: string[]): GraphQuery => ({
  node: {
    labels: ["Risk"],
    filters: [],
    relationships: [
      {
        label: "HAS_VULNERABILITY",
        source: {
          labels: ["Asset"],
          filters: [
            {
              field: "key",
              operator: "IN",
              value: [assetKeys], // Double-bracket syntax required
            },
          ],
        },
      },
    ],
  },
  limit: assetKeys.length * 5, // Dynamic limit based on input
  page: 0,
});
```

### Similar changes needed for:

- `createAssetToTechnologyQuery` function
- `createRiskToAssetQuery` function
- Any query using OR explosion pattern

## Zoom Level Integration

### GraphStateProvider.tsx Additions

```typescript
// Add to action types union
| { type: 'SET_ZOOM_LEVEL'; payload: { level: 'overview' | 'cluster-focus' | 'detail' } }

// Add to initial state object
zoomLevel: 'detail' as const,

// Add to reducer switch statement
case 'SET_ZOOM_LEVEL':
  return { ...state, zoomLevel: action.payload.level };

// Add to context value interface
zoom: {
  level: 'overview' | 'cluster-focus' | 'detail';
  setLevel: (level: 'overview' | 'cluster-focus' | 'detail') => void;
};
```

### useRelationships.ts Additions

```typescript
// Add zoom level check to each query
const { data: assetToRiskData } = useGraphQuery({
  query: assetToRiskQuery,
  enabled: assetKeys.length > 0 && zoomLevel === "detail", // Only in detail view
  staleTime: 60000,
});
```

## Cluster Data Structure

Chariot uses `surface[0]` attribute for clustering:

```typescript
interface ClusterMetadata {
  id: string; // surface[0] value (e.g., "GOOGLE", "AKAMAI-ASN1")
  nodeCount: number; // count of assets in cluster
  centroidX: number; // average X position
  centroidY: number; // average Y position
  sampleKeys: string[]; // 5 representative asset keys
}
```

## Aggregation Query for Cluster Overview

Use with `/my` endpoint:

```typescript
const clusterOverviewQuery: GraphQuery = {
  node: {
    labels: ["Asset"],
    filters: [{ field: "status", operator: "STARTS WITH", value: "A" }],
  },
  // Note: Aggregation not directly supported
  // Must use raw Cypher via backend endpoint or compute client-side
};
```

**For true aggregation**, backend needs raw Cypher:

```cypher
MATCH (n:Asset {username: $username})
WHERE n.status STARTS WITH "A"
WITH n.surface[0] AS cluster, collect(n) AS nodes
RETURN cluster,
       size(nodes) AS nodeCount,
       avg([node IN nodes | node.x]) AS centroidX,
       avg([node IN nodes | node.y]) AS centroidY,
       [node IN nodes | node.key][0..5] AS sampleKeys
```

## Testing Approach

```bash
# Test IN clause fix
cd modules/chariot/ui
npm test -- --grep "createAssetToRiskQuery"

# Test with real data
# 1. Start local Chariot: make guard
# 2. Navigate to Graph Explorer
# 3. Load account with 5000+ assets
# 4. Verify graph renders (previously would hang)
```

## Performance Verification

Before/after metrics to capture:

| Metric                  | Before          | After Target |
| ----------------------- | --------------- | ------------ |
| Initial load (5k nodes) | Never completes | < 3s         |
| Relationship query time | Timeout         | < 500ms      |
| Memory usage            | Grows unbounded | < 500MB      |
| FPS during zoom         | < 5             | > 30         |
