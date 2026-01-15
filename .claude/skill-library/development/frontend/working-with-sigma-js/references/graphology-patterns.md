# Graphology Patterns

Advanced graph data structure operations for Sigma.js.

## Batch Updates

**Problem:** Multiple `setNodeAttribute()` calls trigger multiple renders.

**Solution:** Use `updateNode()` or `updateNodeAttributes()` for batch updates:

```typescript
// ❌ Slow: Multiple renders
graph.setNodeAttribute('node1', 'color', '#ff0000');
graph.setNodeAttribute('node1', 'size', 20);
graph.setNodeAttribute('node1', 'label', 'Updated');

// ✅ Fast: Single render
graph.updateNodeAttributes('node1', (attrs) => ({
  ...attrs,
  color: '#ff0000',
  size: 20,
  label: 'Updated',
}));
```

## Iterating Efficiently

**Problem:** `forEachNode()` creates array copies for large graphs.

**Solution:** Use iterators for read-only operations:

```typescript
// ❌ Creates array copy (expensive for 10k+ nodes)
graph.forEachNode((node, attrs) => {
  console.log(node, attrs.label);
});

// ✅ Direct iteration (no copy)
for (const [node, attrs] of graph.nodeEntries()) {
  console.log(node, attrs.label);
}
```

## Conditional Filtering

**Problem:** Need to filter nodes without copying entire graph.

**Solution:** Use `hidden` attribute instead of removing nodes:

```typescript
// ❌ Expensive: Remove and re-add nodes
const filteredNodes = graph.filterNodes((node, attrs) => attrs.type === 'active');
graph.clear();
filteredNodes.forEach((node) => graph.addNode(node));

// ✅ Fast: Toggle visibility
graph.forEachNode((node, attrs) => {
  const shouldShow = attrs.type === 'active';
  graph.setNodeAttribute(node, 'hidden', !shouldShow);
});
sigma.refresh();
```

## Storing Metadata

**Problem:** Need to share state between hooks without prop drilling.

**Solution:** Store on graph via `setAttribute()`:

```typescript
// Store layout instance
graph.setAttribute('layout', layoutInstance);

// Store camera state
graph.setAttribute('initialCameraState', sigma.getCamera().getState());

// Store UI state
graph.setAttribute('selectedNodes', new Set(['node1', 'node2']));

// Access from any hook
const layout = graph.getAttribute('layout');
if (layout?.isRunning()) {
  layout.stop();
}
```

**Why this works:** Graph instance is stable across renders, acts as shared store.

## Edge Attributes

Edges support the same attribute patterns as nodes:

```typescript
// Add edge with attributes
graph.addEdge('node1', 'node2', {
  weight: 5,
  color: '#cccccc',
  size: 2,
  hidden: false,
  type: 'arrow', // or 'line', 'curve'
});

// Update edge attributes
graph.updateEdgeAttributes('edge-id', (attrs) => ({
  ...attrs,
  color: '#ff0000',
  size: 3,
}));

// Bulk edge updates
graph.forEachEdge((edge, attrs, source, target) => {
  if (attrs.weight > 10) {
    graph.setEdgeAttribute(edge, 'size', 5);
  }
});
```

## Multi-Graph Support

Sigma.js supports multiple graphs in same component:

```typescript
import MultiDirectedGraph from 'graphology';

const graph = new MultiDirectedGraph();

// Multiple edges between same nodes
graph.addEdge('node1', 'node2', { type: 'follows' });
graph.addEdge('node1', 'node2', { type: 'blocks' });

// Query specific edge
const followsEdge = graph.edges('node1', 'node2').find((edge) =>
  graph.getEdgeAttribute(edge, 'type') === 'follows'
);
```

## Node Neighbors

Efficient neighbor queries:

```typescript
// Get all neighbors (inbound + outbound)
const neighbors = graph.neighbors('node1');

// Get only inbound neighbors
const inNeighbors = graph.inNeighbors('node1');

// Get only outbound neighbors
const outNeighbors = graph.outNeighbors('node1');

// Iterate neighbor edges
graph.forEachEdge('node1', (edge, attrs, source, target) => {
  console.log(`Edge to ${target}:`, attrs);
});
```

## Graph Export/Import

Serialize graph for persistence:

```typescript
// Export to JSON
const serialized = graph.export();
localStorage.setItem('graph-state', JSON.stringify(serialized));

// Import from JSON
const data = JSON.parse(localStorage.getItem('graph-state'));
const graph = Graph.from(data);
```

## Performance Tips

1. **Use `updateNodeAttributes()` instead of multiple `setNodeAttribute()` calls** - batches updates
2. **Use iterators instead of `forEach()` for read-only operations** - avoids array copies
3. **Store shared state on graph via `setAttribute()`** - eliminates prop drilling
4. **Use `hidden` instead of `removeNode()`** - preserves graph structure
5. **Batch edge updates** - use `forEachEdge()` with conditionals instead of multiple `setEdgeAttribute()` calls

## See Also

- [Graphology Documentation](https://graphology.github.io/)
- [Sigma.js Graph Attributes](https://www.sigmajs.org/docs/latest/api/attributes.html)
