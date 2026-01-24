---
name: graph-layout-coordination
description: Use when coordinating layout algorithms with viewport culling, camera animations, filtering, or user interactions - provides state-based guards, event sequencing, and phase management patterns to prevent race conditions
allowed-tools: Read, Grep, Glob
---

# Graph Layout Coordination

**Patterns for coordinating force-directed layout algorithms with other graph operations.**

## When to Use

Use this skill when combining:

- Force-directed layout (Force Atlas, D3-Force) + viewport culling
- Layout + node filtering/hiding
- Layout + camera animations
- Layout + user interactions (drag, click)

**The Core Problem:** Layout algorithms and culling/rendering systems compete for control of node visibility. Without coordination, they create race conditions.

**Evidence from Chariot codebase:** `useViewportCulling.ts` has phase guards (lines 140-145) showing awareness of this problem, but lacks complete coordination patterns for complex features like hierarchical navigation.

## Quick Reference

| Phase | Culling | Interactions | Camera | Filtering |
|-------|---------|--------------|--------|-----------|
| idle | Yes | Yes | Yes | Yes |
| starting | No | No | Read-only | No |
| running | No | No | Read-only | No |
| stopping | No | No | Read-only | No |
| stabilized | Yes | Yes | Yes | Yes |

**Key Principle:** Culling is SUBORDINATE to layout. Layout has priority.

---

## Core Coordination Patterns

### 1. State-Based Guards

Check system compatibility before acting:

```typescript
// Guard culling until layout stabilizes
const shouldCull = !layoutIsRunning && layoutHasRun;

useEffect(() => {
  if (!shouldCull) return;

  const visibleNodes = computeVisibleNodes(viewport);
  graph.forEachNode((node) => {
    graph.setNodeAttribute(node, 'hidden', !visibleNodes.has(node));
  });
}, [shouldCull, viewport]);
```

**See:** [State-Based Guards](references/state-based-guards.md) for complete patterns by system type.

### 2. Event-Based Sequencing

Wait for completion events before dependent operations:

```typescript
layout.on('stop', () => {
  setLayoutIsRunning(false);
  setLayoutHasRun(true);

  // NOW safe to enable culling and interactions
  enableCulling();
  enableInteractions();
});
```

**Event Types:**
- `start` - Layout begins
- `stop` - Layout completes (natural or manual)
- `progress` - Iteration complete (for progress bars)

**See:** [Event Sequencing](references/event-sequencing.md) for listener patterns and cleanup.

### 3. Phase State Machine

Explicit phase management for complex coordination:

```typescript
type LayoutPhase =
  | 'idle'           // No layout running
  | 'starting'       // Layout.start() called, not yet running
  | 'running'        // Layout actively computing
  | 'stopping'       // Layout.stop() called, cleanup pending
  | 'stabilized';    // Layout complete, ready for operations

const [phase, setPhase] = useState<LayoutPhase>('idle');

// Phase transitions
layout.on('start', () => setPhase('running'));
layout.on('stop', () => setPhase('stabilized'));
```

---

## Layout Lifecycle Management

### Layout Instance Storage

**Anti-Pattern:** Creating layout in useEffect (creates new instance every render)

**Pattern:** Store on graph via setAttribute for cross-hook access:

```typescript
useEffect(() => {
  if (!graph.getAttribute('layout')) {
    const layout = new ForceAtlas2Layout(graph, {
      settings: { iterations: 50 }
    });
    graph.setAttribute('layout', layout);
  }

  const layout = graph.getAttribute('layout');
  layout.start();

  return () => layout.stop();
}, [graph]);
```

**Why:** Multiple hooks need access (culling, camera, interactions). Single source of truth prevents race conditions.

### Progress Indicators

```typescript
const [progress, setProgress] = useState(0);

layout.on('progress', (event) => {
  setProgress(event.iteration / settings.iterations);
});

return (
  <LoadingOverlay visible={phase === 'running'}>
    <Progress value={progress * 100} />
  </LoadingOverlay>
);
```

**Always disable interactions during layout:**
```typescript
<Graph disabled={phase === 'running'} />
```

### Layout Cancellation

```typescript
const cancelLayout = () => {
  const layout = graph.getAttribute('layout');
  if (layout && phase === 'running') {
    layout.stop();
    setPhase('idle'); // Not 'stabilized' - layout incomplete
  }
};
```

---

## Coordination with Specific Systems

### Viewport Culling

**See:** [Culling Integration](references/culling-integration.md) for complete `useCoordinatedCulling` implementation.

**Why culling causes problems without coordination:**
1. Culling hides nodes during layout
2. Layout recalculates without hidden nodes
3. Positions drift, never stabilize
4. Infinite loop

**Solution:** Only cull when `layoutPhase === 'stabilized'`.

### Camera Animation

**Problem:** Camera zoom changes node positions in screen space, can trigger layout recalculation.

**Pattern:** Pause layout during camera movement:

```typescript
sigma.on('cameraStart', () => {
  if (phase === 'running') {
    layout.stop();
    setPhase('paused-for-camera');
  }
});

sigma.on('cameraEnd', () => {
  if (phase === 'paused-for-camera') {
    layout.start();
    setPhase('running');
  }
});
```

### Node Filtering

**Pattern:** Restart layout after filter change:

```typescript
const applyFilter = (filterFn: (node: string) => boolean) => {
  const layout = graph.getAttribute('layout');

  if (phase === 'running') layout.stop();

  graph.forEachNode((node) => {
    graph.setNodeAttribute(node, 'hidden', !filterFn(node));
  });

  layout.start();
  setPhase('running');
};
```

**Why restart:** Node positions for old set are invalid for new set.

---

## Performance Optimizations

### Barnes-Hut Approximation

Enable for large graphs (>1000 nodes):

```typescript
const layout = new ForceAtlas2Layout(graph, {
  settings: {
    barnesHutOptimize: graph.order > 1000,
    barnesHutTheta: 0.5
  }
});
```

**Trade-off:** Accuracy for speed. O(n^2) to O(n log n).

### Web Workers

```typescript
import ForceLayout from 'graphology-layout-force/worker';

const layout = new ForceLayout(graph, { iterations: 50 });
layout.start(); // Runs in Web Worker, doesn't block main thread
```

**Note:** Worker-based layouts still fire events, need same coordination guards.

**See:** [Performance Patterns](references/performance-patterns.md) for adaptive iteration counts and benchmarks.

---

## Common Anti-Patterns

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Culling without layout guard | Nodes disappear mid-layout | Check `layoutIsRunning` before culling |
| Layout in useEffect | Multiple instances, memory leak | Store on graph via `setAttribute` |
| No progress indicator | User thinks app froze | Show progress, disable interactions |
| Camera animation during layout | Forces recalculation | Pause layout during camera movement |
| No event listener cleanup | Memory leak | `layout.off()` in cleanup function |

---

## Debugging Coordination Issues

| Symptom | Likely Cause |
|---------|--------------|
| Layout never stabilizes | Culling changing node count mid-layout |
| Nodes jump around | Camera animation retriggering layout |
| Browser freezes | Layout + culling competing for CPU |
| Console errors about undefined nodes | Culling removed nodes layout still references |

**Debug pattern:**
```typescript
useEffect(() => {
  console.log('Layout phase:', phase);
}, [phase]);
```

---

## Integration

### Called By

- Graph Explorer feature implementation
- Any component using Force Atlas + viewport culling
- Developers implementing hierarchical graph navigation

### Requires (invoke before starting)

- **`working-with-sigma-js`** (LIBRARY)
  - `Read(".claude/skill-library/development/frontend/graphing/working-with-sigma-js/SKILL.md")`

### Calls (during execution)

None - provides patterns, doesn't invoke other skills

### Pairs With (conditional)

- **`coordinating-competing-systems`** (LIBRARY) - General coordination patterns
  - `Read(".claude/skill-library/development/frontend/graphing/coordinating-competing-systems/SKILL.md")`
- **`optimizing-large-data-visualization`** (LIBRARY) - Performance context
  - `Read(".claude/skill-library/development/frontend/graphing/optimizing-large-data-visualization/SKILL.md")`

---

## Sources

- ForceAtlas2 Paper: https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0098679
- Sigma.js Issue #567: https://github.com/jacomyal/sigma.js/issues/567
- D3-Force Optimization: https://www.nebula-graph.io/posts/d3-force-layout-optimization
- Cambridge Intelligence - Large Networks: https://cambridge-intelligence.com/visualize-large-networks/
- Chariot codebase: `modules/chariot/ui/src/components/nodeGraph/hooks/useViewportCulling.ts`
