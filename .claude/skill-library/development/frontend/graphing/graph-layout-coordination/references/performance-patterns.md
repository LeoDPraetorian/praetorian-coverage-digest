# Performance Patterns

**Optimizations for layout algorithms at scale.**

## Node Count Thresholds

| Nodes | Layout Behavior | Recommended Optimizations |
|-------|-----------------|---------------------------|
| < 100 | Instant (< 100ms) | None needed |
| 100-500 | Fast (< 500ms) | None needed |
| 500-1000 | Noticeable (1-2s) | Progress indicator |
| 1000-5000 | Slow (5-10s) | Barnes-Hut, Web Worker |
| 5000-10000 | Very slow (30s+) | All optimizations |
| > 10000 | Impractical | Sub-clustering required |

---

## Barnes-Hut Approximation

Force-directed layouts have O(n^2) complexity by default (every node repels every other node). Barnes-Hut optimization reduces this to O(n log n).

### When to Enable

```typescript
const shouldUseBarnesHut = graph.order > 1000;

const layout = new ForceAtlas2Layout(graph, {
  settings: {
    barnesHutOptimize: shouldUseBarnesHut,
    barnesHutTheta: 0.5, // 0.5 = balanced accuracy/speed
  },
});
```

### Theta Parameter

| Theta | Accuracy | Speed | Use Case |
|-------|----------|-------|----------|
| 0.1 | Very high | Slow | Final positioning |
| 0.5 | Balanced | Medium | Interactive use |
| 1.0 | Lower | Fast | Initial layout |
| 2.0+ | Low | Very fast | Rapid preview |

---

## Web Workers

Move layout computation off the main thread to maintain UI responsiveness.

### Graphology Force Worker

```typescript
import ForceLayout from 'graphology-layout-force/worker';

const layout = new ForceLayout(graph, {
  maxIterations: 100,
  settings: {
    attraction: 0.0005,
    repulsion: 0.1,
    gravity: 0.0001,
  },
});

// Runs in Web Worker
layout.start();

// Still fires events on main thread
layout.on('converged', () => {
  console.log('Layout complete');
});
```

### Custom Web Worker

For more control:

```typescript
// layout.worker.ts
import { ForceAtlas2Layout } from 'graphology-layout-forceatlas2';

self.onmessage = (event) => {
  const { graphData, settings } = event.data;

  // Create graph from serialized data
  const graph = Graph.from(graphData);

  // Run layout synchronously in worker
  const layout = new ForceAtlas2Layout(graph, { settings });

  for (let i = 0; i < settings.iterations; i++) {
    layout.iterate();

    // Report progress
    if (i % 10 === 0) {
      self.postMessage({ type: 'progress', iteration: i });
    }
  }

  // Return positions
  const positions = {};
  graph.forEachNode((id, attrs) => {
    positions[id] = { x: attrs.x, y: attrs.y };
  });

  self.postMessage({ type: 'complete', positions });
};
```

```typescript
// Usage
const worker = new Worker(new URL('./layout.worker.ts', import.meta.url));

worker.postMessage({
  graphData: graph.export(),
  settings: { iterations: 100 },
});

worker.onmessage = (event) => {
  if (event.data.type === 'progress') {
    setProgress(event.data.iteration / 100);
  } else if (event.data.type === 'complete') {
    applyPositions(event.data.positions);
    setPhase('stabilized');
  }
};
```

---

## Adaptive Iteration Count

Scale iterations based on graph size for consistent perceived performance:

```typescript
const getIterations = (nodeCount: number): number => {
  if (nodeCount < 100) return 50;
  if (nodeCount < 500) return 100;
  if (nodeCount < 1000) return 150;
  if (nodeCount < 5000) return 200;
  return 300; // Larger graphs need more to converge
};

const layout = new ForceAtlas2Layout(graph, {
  settings: {
    iterations: getIterations(graph.order),
    barnesHutOptimize: graph.order > 1000,
  },
});
```

---

## Progressive Layout

Show partial results while computation continues:

```typescript
const PREVIEW_ITERATIONS = 20;
const FULL_ITERATIONS = 100;

// Quick preview
layout.run(PREVIEW_ITERATIONS);
sigma.refresh();
setPhase('preview');

// Continue in background
requestIdleCallback(() => {
  layout.run(FULL_ITERATIONS - PREVIEW_ITERATIONS);
  sigma.refresh();
  setPhase('stabilized');
});
```

---

## Incremental Layout

For graphs that change frequently, avoid full recalculation:

```typescript
const addNodesWithLayout = (newNodes: Node[]) => {
  // 1. Add nodes at centroid of neighbors
  newNodes.forEach((node) => {
    const neighborPositions = node.neighbors
      .map((id) => graph.getNodeAttributes(id))
      .filter((attrs) => attrs.x !== undefined);

    const avgX = neighborPositions.reduce((sum, p) => sum + p.x, 0) / neighborPositions.length;
    const avgY = neighborPositions.reduce((sum, p) => sum + p.y, 0) / neighborPositions.length;

    graph.addNode(node.id, { ...node.attrs, x: avgX, y: avgY });
  });

  // 2. Run short layout to settle new nodes
  const layout = graph.getAttribute('layout');
  layout.run(20); // Just 20 iterations to settle
};
```

---

## Performance Monitoring

```typescript
const useLayoutPerformance = (graph: Graph) => {
  const [metrics, setMetrics] = useState({
    lastDuration: 0,
    avgIterationTime: 0,
    estimatedTotal: 0,
  });

  useEffect(() => {
    const layout = graph.getAttribute('layout');
    let startTime: number;
    let iterationTimes: number[] = [];

    layout.on('start', () => {
      startTime = performance.now();
      iterationTimes = [];
    });

    layout.on('progress', (event) => {
      const now = performance.now();
      const iterationTime = iterationTimes.length > 0
        ? now - (startTime + iterationTimes.reduce((a, b) => a + b, 0))
        : now - startTime;

      iterationTimes.push(iterationTime);

      const avgTime = iterationTimes.reduce((a, b) => a + b, 0) / iterationTimes.length;
      const remaining = event.totalIterations - event.iteration;

      setMetrics({
        lastDuration: now - startTime,
        avgIterationTime: avgTime,
        estimatedTotal: avgTime * remaining,
      });
    });

    layout.on('stop', () => {
      setMetrics((prev) => ({
        ...prev,
        lastDuration: performance.now() - startTime,
      }));
    });
  }, [graph]);

  return metrics;
};
```

---

## Memory Optimization

### Clear Layout Instance on Unmount

```typescript
useEffect(() => {
  return () => {
    const layout = graph.getAttribute('layout');
    if (layout) {
      layout.kill(); // Release resources
      graph.removeAttribute('layout');
    }
  };
}, [graph]);
```

### Reuse Layout Instance

```typescript
// Don't create new layout for every operation
const getOrCreateLayout = (graph: Graph) => {
  let layout = graph.getAttribute('layout');

  if (!layout) {
    layout = new ForceAtlas2Layout(graph, defaultSettings);
    graph.setAttribute('layout', layout);
  }

  return layout;
};
```
