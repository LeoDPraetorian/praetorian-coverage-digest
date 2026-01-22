---
name: implementing-semantic-zoom-graphs
description: Use when implementing zoom-based data loading for large graph visualizations - covers cluster-first architecture, IN clause queries, zoom-triggered fetching, and progressive graph expansion
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite
---

# Implementing Semantic Zoom for Graph Visualizations

**Progressive data loading patterns for 10,000-100,000+ node graphs in React/Sigma.js.**

## When to Use

Use this skill when:

- Building graph visualizations that need to support 10,000+ nodes
- Current implementation shows empty canvas or infinite loading at scale
- Relationship queries timing out (N OR conditions problem)
- Need to implement zoom-based data loading (different data at different zoom levels)
- Implementing cluster-first rendering architecture

**Symptoms this skill addresses:**

- Graph shows "Loading..." forever with 5000+ nodes
- Browser freezes during graph construction
- Neo4j query timeouts with large asset sets
- Users can't see overview of large attack surfaces

## Problem Statement

Standard graph loading approaches fail at scale:

```
Traditional Flow (Breaks at 5000+ nodes):
  Fetch ALL nodes → Fetch ALL relationships → Build graph → Render

Semantic Zoom Flow (Scales to 100k+):
  Fetch cluster summaries → Expand focused cluster → Load visible relationships
```

## Quick Reference

| Zoom Level    | Camera Ratio | Data Loaded           | Max Items | Query Pattern        |
| ------------- | ------------ | --------------------- | --------- | -------------------- |
| Overview      | < 0.3        | Cluster metadata      | ~50       | Aggregation query    |
| Cluster Focus | 0.3-1.0      | Focused cluster nodes | ~1000     | Filtered asset query |
| Detail View   | > 1.0        | Visible relationships | ~200      | Bounded IN query     |

## Core Patterns

### Pattern 1: IN Clause Instead of OR Explosion (CRITICAL)

**The #1 cause of graph failure is query explosion with OR conditions.**

**Wrong (creates N OR conditions):**

```typescript
// queries.ts - THIS BREAKS at 5000 nodes
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
];
// Generates: WHERE (key='A' OR key='B' OR key='C' ...)
```

**Correct (single IN clause):**

```typescript
// Uses double-bracket syntax for IN operator
filters: [
  {
    field: "key",
    operator: "IN",
    value: [assetKeys], // [[key1, key2, key3]]
  },
];
// Generates: WHERE key IN $p1 (parameterized array)
```

**Critical syntax detail:** IN operator requires double-bracketed array `[assetKeys]` not single `assetKeys`.

### Pattern 2: Zoom-Triggered Data Fetching

Different data hooks at different zoom levels:

```typescript
const useSemanticZoomData = (sigma: Sigma, cameraState: CameraState) => {
  const zoomLevel = useMemo(() => {
    if (cameraState.ratio < 0.3) return "overview";
    if (cameraState.ratio < 1.0) return "cluster-focus";
    return "detail";
  }, [cameraState.ratio]);

  // Level 1: Overview - only cluster metadata
  const { data: clusters } = useClusterOverview({
    enabled: zoomLevel === "overview",
  });

  // Level 2: Cluster focus - assets in focused cluster
  const focusedCluster = useFocusedCluster(cameraState, clusters);
  const { data: clusterAssets } = useClusterExpansion({
    clusterId: focusedCluster?.id,
    enabled: zoomLevel === "cluster-focus" && !!focusedCluster,
  });

  // Level 3: Detail - relationships for visible nodes
  const visibleKeys = useVisibleNodeKeys(sigma, 200);
  const { data: relationships } = useVisibleRelationships({
    nodeKeys: visibleKeys,
    enabled: zoomLevel === "detail" && visibleKeys.length > 0,
  });

  return { zoomLevel, clusters, clusterAssets, relationships };
};
```

### Pattern 3: Focus Detection Algorithm

Determine which cluster the camera is focused on:

```typescript
const useFocusedCluster = (
  cameraState: CameraState,
  clusters: ClusterMetadata[]
): ClusterMetadata | null => {
  return useMemo(() => {
    if (!clusters?.length) return null;

    // Find cluster whose centroid is nearest to camera center
    let nearest: ClusterMetadata | null = null;
    let minDistance = Infinity;

    for (const cluster of clusters) {
      const dx = cluster.centroidX - cameraState.x;
      const dy = cluster.centroidY - cameraState.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Adjust for viewport size - cluster must be "in view"
      const viewportRadius = 1 / cameraState.ratio;
      if (distance < viewportRadius && distance < minDistance) {
        minDistance = distance;
        nearest = cluster;
      }
    }

    return nearest;
  }, [cameraState.x, cameraState.y, cameraState.ratio, clusters]);
};
```

### Pattern 4: Incremental Graph Building

Add nodes to existing graph without full rebuild:

```typescript
const useIncrementalGraph = (
  graph: Graph,
  clusterAssets: Asset[] | undefined,
  expandedClusterId: string | null
) => {
  const expandedClustersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!clusterAssets?.length || !expandedClusterId) return;
    if (expandedClustersRef.current.has(expandedClusterId)) return;

    // Add new nodes without clearing existing
    graph.import(
      {
        nodes: clusterAssets.map((asset) => ({
          key: asset.key,
          attributes: {
            x: asset.x ?? Math.random(),
            y: asset.y ?? Math.random(),
            size: 10,
            label: asset.name,
            clusterId: expandedClusterId,
            hidden: false,
          },
        })),
      },
      false
    ); // false = merge, don't replace

    // Mark cluster as expanded
    expandedClustersRef.current.add(expandedClusterId);

    // Hide cluster hull node, show individual nodes
    if (graph.hasNode(`cluster:${expandedClusterId}`)) {
      graph.setNodeAttribute(`cluster:${expandedClusterId}`, "hidden", true);
    }
  }, [graph, clusterAssets, expandedClusterId]);
};
```

### Pattern 5: Conditional Relationship Loading

Only load relationships when zoomed in enough:

```typescript
const useVisibleRelationships = ({
  nodeKeys,
  enabled,
}: {
  nodeKeys: string[];
  enabled: boolean;
}) => {
  const query = useMemo(() => {
    if (!enabled || nodeKeys.length === 0) return null;

    return {
      node: {
        labels: ["Risk"],
        relationships: [
          {
            label: "HAS_VULNERABILITY",
            source: {
              labels: ["Asset"],
              filters: [
                {
                  field: "key",
                  operator: "IN",
                  value: [nodeKeys], // Double-bracket syntax
                },
              ],
            },
          },
        ],
      },
      limit: nodeKeys.length * 5, // Estimate 5 relationships per node
    };
  }, [nodeKeys, enabled]);

  return useGraphQuery({
    query,
    enabled: enabled && !!query,
    staleTime: 60000, // Cache for 1 minute
  });
};
```

## State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                       ZOOM STATE MACHINE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ratio < 0.3   ┌───────────────┐                 │
│  │ OVERVIEW │ ◄───────────── │ CLUSTER_FOCUS │                 │
│  │          │ ──────────────►│               │                 │
│  │ ~50      │  ratio > 0.3   │ ~1000 nodes   │                 │
│  │ clusters │                │ (focused)     │                 │
│  └──────────┘                └───────┬───────┘                 │
│       ▲                              │                         │
│       │ ratio < 0.3                  │ ratio > 1.0             │
│       │                              ▼                         │
│       │                      ┌───────────────┐                 │
│       └───────────────────── │ DETAIL_VIEW   │                 │
│           ratio < 1.0        │               │                 │
│                              │ + relationships│                 │
│                              │ (~200 visible) │                 │
│                              └───────────────┘                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Backend Requirements

For full semantic zoom, the backend should provide:

| Endpoint                       | Purpose               | Example Response                                      |
| ------------------------------ | --------------------- | ----------------------------------------------------- |
| `POST /my` with aggregation    | Cluster overview      | `[{cluster: "GOOGLE", count: 929, centroid: {x, y}}]` |
| `POST /my` with cluster filter | Cluster expansion     | `[{key: "asset1", name: "...", ...}]`                 |
| `POST /my` with IN clause      | Bounded relationships | `[{risk: "...", asset: "..."}]`                       |

**Existing Chariot capability:** The `/my` endpoint already supports:

- IN clause filtering (use `operator: 'IN'` with double-bracket value)
- Pagination (`page`, `limit` parameters)
- Conditional relationships (`optional: true`)

**Missing:** Dedicated aggregation parameter or cluster endpoint (can be added or use raw Cypher).

## Performance Targets

| Metric            | Target  | Current Problem               |
| ----------------- | ------- | ----------------------------- |
| Initial render    | < 2s    | Never completes at 5000+      |
| Cluster expansion | < 1s    | N/A                           |
| Relationship load | < 500ms | Timeout at 5000 OR conditions |
| Interaction FPS   | > 30    | Freezes during load           |

## Implementation Checklist

### Phase 1: IN Clause Fix (Immediate)

- [ ] Update `createAssetToRiskQuery` to use IN operator
- [ ] Update `createAssetToTechnologyQuery` to use IN operator
- [ ] Update `createRiskToAssetQuery` to use IN operator
- [ ] Verify double-bracket syntax: `value: [assetKeys]`
- [ ] Test with 1000+ assets

### Phase 2: Zoom-Triggered Loading

- [ ] Add zoom level state to GraphStateProvider
- [ ] Create `useZoomLevel` hook based on camera ratio
- [ ] Add `enabled` conditions to relationship queries
- [ ] Implement `useVisibleNodeKeys` for viewport bounds

### Phase 3: Cluster-First Architecture

- [ ] Create `useClusterOverview` hook
- [ ] Create `useFocusedCluster` hook
- [ ] Create `useClusterExpansion` hook
- [ ] Implement cluster hull rendering
- [ ] Add expand/collapse animations

## Integration

### Called By

- `frontend-developer` agent - When implementing graph features at scale
- `frontend-lead` agent - When architecting large graph solutions

### Requires (invoke before starting)

| Skill                                  | When              | Purpose                           |
| -------------------------------------- | ----------------- | --------------------------------- |
| `preventing-react-hook-infinite-loops` | Camera handlers   | Ensure debouncing and stable deps |
| `working-with-sigma-js`                | Sigma integration | Camera events, node programs      |

### Calls (during execution)

None - this skill provides implementation patterns and doesn't invoke other skills during execution.

### Pairs With

| Skill                                 | Trigger            | Purpose                                  |
| ------------------------------------- | ------------------ | ---------------------------------------- |
| `optimizing-large-data-visualization` | Render performance | LOD, culling after data loads            |
| `coordinating-competing-systems`      | Layout conflicts   | Prevent layout vs zoom conflicts         |
| `constructing-graph-queries`          | Query construction | Graph query patterns and allowed columns |

## Research Reference

For detailed research on the patterns in this skill, see:
`.claude/.output/research/2026-01-15-161918-semantic-zoom-graph-api/SYNTHESIS.md`

This research documents:

- IN clause discovery (backend supports, frontend doesn't use)
- Aggregation query patterns (40+ examples in codebase)
- Zoom-triggered loading best practices
- Backend API gap analysis
