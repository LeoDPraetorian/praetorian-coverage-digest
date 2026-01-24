# State-Based Guards

**Patterns for checking system compatibility before acting.**

## Core Principle

Layout algorithms must see all nodes to calculate accurate force simulations. Other systems (culling, filtering, interactions) must wait until layout stabilizes.

**Hierarchy:**
1. Layout (highest priority)
2. Camera (can interrupt layout)
3. Filtering (restarts layout)
4. Culling (lowest priority, waits for others)

---

## Guard Implementation Patterns

### Basic Boolean Guard

```typescript
const [layoutIsRunning, setLayoutIsRunning] = useState(false);
const [layoutHasRun, setLayoutHasRun] = useState(false);

// Derived guard state
const shouldCull = !layoutIsRunning && layoutHasRun;
const shouldEnableInteractions = !layoutIsRunning;
```

### Phase-Based Guard

More explicit, better for complex coordination:

```typescript
type LayoutPhase =
  | 'idle'           // No layout running
  | 'starting'       // Layout.start() called, not yet running
  | 'running'        // Layout actively computing
  | 'stopping'       // Layout.stop() called, cleanup pending
  | 'stabilized'     // Layout complete, ready for operations
  | 'paused-for-camera'; // Temporarily stopped for camera animation

const [phase, setPhase] = useState<LayoutPhase>('idle');

// Guard checks by operation
const canCull = phase === 'stabilized' || phase === 'idle';
const canInteract = phase !== 'running' && phase !== 'starting';
const canFilter = phase !== 'running'; // Will restart layout
```

---

## Guards by System

### Culling Guard

```typescript
const useCoordinatedCulling = (graph: Graph, viewport: Viewport) => {
  const [layoutPhase, setLayoutPhase] = useState<LayoutPhase>('idle');

  // Subscribe to layout events
  useEffect(() => {
    const layout = graph.getAttribute('layout');
    if (!layout) return;

    const handleStart = () => setLayoutPhase('running');
    const handleStop = () => setLayoutPhase('stabilized');

    layout.on('start', handleStart);
    layout.on('stop', handleStop);

    return () => {
      layout.off('start', handleStart);
      layout.off('stop', handleStop);
    };
  }, [graph]);

  // GUARDED: Only cull when safe
  useEffect(() => {
    if (layoutPhase !== 'stabilized') {
      return; // Guard prevents culling during layout
    }

    const visible = computeVisibleNodes(graph, viewport);
    graph.forEachNode((node) => {
      graph.setNodeAttribute(node, 'hidden', !visible.has(node));
    });
  }, [layoutPhase, viewport, graph]);
};
```

### Interaction Guard

```typescript
const GraphCanvas = ({ graph, phase }: Props) => {
  const interactionsEnabled = phase === 'stabilized' || phase === 'idle';

  return (
    <SigmaContainer
      settings={{
        enableEdgeEvents: interactionsEnabled,
        enableNodeEvents: interactionsEnabled,
      }}
    >
      {/* Disable pointer events during layout */}
      <div
        style={{ pointerEvents: interactionsEnabled ? 'auto' : 'none' }}
      >
        <ControlsContainer />
      </div>
    </SigmaContainer>
  );
};
```

### Filter Guard

```typescript
const useFilteredGraph = (graph: Graph, filters: FilterState) => {
  const [phase, setPhase] = useState<LayoutPhase>('idle');

  const applyFilters = useCallback((newFilters: FilterState) => {
    const layout = graph.getAttribute('layout');

    // Stop current layout if running
    if (phase === 'running' && layout) {
      layout.stop();
    }

    // Apply filter visibility
    graph.forEachNode((nodeId) => {
      const visible = matchesFilters(graph.getNodeAttributes(nodeId), newFilters);
      graph.setNodeAttribute(nodeId, 'hidden', !visible);
    });

    // Restart layout with new visible set
    if (layout) {
      layout.start();
      setPhase('running');
    }
  }, [graph, phase]);

  return { applyFilters, phase };
};
```

---

## Phase Transition Matrix

| Current Phase | Event | New Phase |
|---------------|-------|-----------|
| idle | layout.start() | starting |
| starting | layout 'start' event | running |
| running | layout 'stop' event | stabilized |
| running | user cancel | idle |
| running | camera start | paused-for-camera |
| paused-for-camera | camera end | running |
| stabilized | filter change | running |
| stabilized | new data | starting |

---

## Common Mistakes

### Wrong: Checking Layout Directly

```typescript
// BAD: Race condition - layout.isRunning() may change mid-check
if (!layout.isRunning()) {
  performCulling();
}
```

### Right: Using State Guard

```typescript
// GOOD: React state provides consistent snapshot
if (phase === 'stabilized') {
  performCulling();
}
```

### Wrong: Multiple Boolean Flags

```typescript
// BAD: Hard to track all combinations
const [isLayoutRunning, setIsLayoutRunning] = useState(false);
const [isLayoutComplete, setIsLayoutComplete] = useState(false);
const [isPausedForCamera, setIsPausedForCamera] = useState(false);
const [isCullingEnabled, setIsCullingEnabled] = useState(false);
```

### Right: Single Phase State

```typescript
// GOOD: Single source of truth
const [phase, setPhase] = useState<LayoutPhase>('idle');
```

---

## Testing Guards

```typescript
describe('layout coordination guards', () => {
  it('blocks culling during layout', () => {
    const { result } = renderHook(() => useCoordinatedCulling(graph, viewport));

    // Simulate layout start
    act(() => {
      graph.getAttribute('layout').emit('start');
    });

    // Verify culling blocked
    expect(graph.getNodeAttribute('node1', 'hidden')).toBe(false);
  });

  it('enables culling after layout stabilizes', () => {
    const { result } = renderHook(() => useCoordinatedCulling(graph, viewport));

    // Simulate layout complete
    act(() => {
      graph.getAttribute('layout').emit('stop');
    });

    // Verify culling active
    expect(graph.getNodeAttribute('offscreenNode', 'hidden')).toBe(true);
  });
});
```
