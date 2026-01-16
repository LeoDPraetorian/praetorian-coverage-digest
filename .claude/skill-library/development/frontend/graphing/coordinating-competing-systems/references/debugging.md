# Debugging System Interference

**Systematic workflow for diagnosing and resolving competing system conflicts.**

## Overview

System interference bugs are notoriously difficult because:

- They don't reproduce consistently
- Symptoms appear far from the root cause
- Timing-dependent behavior
- Work in isolation but fail when combined

This guide provides a systematic 4-step process for debugging interference.

## Quick Diagnostic

| Symptom                          | Likely Interference Type        | Quick Test                           |
| -------------------------------- | ------------------------------- | ------------------------------------ |
| Feature A works, B works, A+B fails | State or timing conflict        | Disable one, verify other works      |
| "Works sometimes"                | Race condition                  | Add delays, check if behavior changes |
| Performance degradation          | Resource contention             | Profile during peak operations       |
| Stale/incorrect data             | Cache or state synchronization  | Force refresh, check if fixes issue  |
| UI freezes intermittently        | Event loop blocking             | Check call stack during freeze       |

## 4-Step Debugging Process

### Step 1: Isolate the Conflict

**Goal**: Identify which systems are interfering.

**Process**:

1. List all active systems in the component/feature
2. Disable systems one at a time
3. Record which combination works/fails

**Example**:

```typescript
const GraphComponent = () => {
  // Systems to test
  const ENABLE_LAYOUT = true; // ← Toggle these
  const ENABLE_CULLING = true;
  const ENABLE_ANIMATION = true;
  const ENABLE_INTERACTION = true;

  if (ENABLE_LAYOUT) useForceLayout(graph);
  if (ENABLE_CULLING) useViewportCulling(graph);
  if (ENABLE_ANIMATION) useNodeAnimation(graph);
  if (ENABLE_INTERACTION) useGraphInteraction(graph);
};
```

**Test matrix**:

```
Layout ON,  Culling OFF → Works ✓
Layout ON,  Culling ON  → Fails ✗
Layout OFF, Culling ON  → Works ✓

Conclusion: Layout and Culling interfere
```

**Tools**:

```typescript
// Feature flag system for quick testing
const DEBUG_FLAGS = {
  enableLayout: true,
  enableCulling: false, // Temporarily disable
  enableAnimation: true,
};

if (DEBUG_FLAGS.enableLayout) {
  useForceLayout(graph);
}
```

### Step 2: Log State Transitions

**Goal**: Understand timing and state changes.

**Process**:

1. Add logging at system boundaries (start/stop/state change)
2. Include timestamps, stack traces
3. Reproduce bug while logging

**Logging pattern**:

```typescript
const useSystemLogger = (systemName: string) => {
  const log = useCallback(
    (event: string, data?: any) => {
      console.debug(
        `[${systemName}][${Date.now()}] ${event}`,
        data,
        new Error().stack
      );
    },
    [systemName]
  );

  return log;
};

// Usage in systems
const useForceLayout = (graph: Graph) => {
  const log = useSystemLogger('ForceLayout');

  useEffect(() => {
    log('START', { nodeCount: graph.order });

    const layout = new FA2Layout(graph, options);
    layout.start();

    return () => {
      log('STOP');
      layout.stop();
    };
  }, [graph]);

  const tick = () => {
    log('TICK', {
      running: layout.isRunning(),
      iteration: layout.getIteration(),
    });
  };
};

const useViewportCulling = (graph: Graph) => {
  const log = useSystemLogger('ViewportCulling');

  const updateVisibility = useCallback(() => {
    const layout = graph.getAttribute('layout');

    log('CHECK_GUARD', {
      layoutRunning: layout?.isRunning(),
      nodeCount: graph.order,
    });

    if (layout?.isRunning()) {
      log('SKIP', { reason: 'layout running' });
      return;
    }

    log('CULL_START');
    cullNodes(graph);
    log('CULL_END', { culledCount: getCulledCount() });
  }, [graph, log]);
};
```

**Example log output showing interference**:

```
[ForceLayout][1234567890] START {nodeCount: 1000}
[ViewportCulling][1234567891] CHECK_GUARD {layoutRunning: true, nodeCount: 1000}
[ViewportCulling][1234567891] SKIP {reason: 'layout running'} ✓ Guard working
[ForceLayout][1234567900] TICK {running: true, iteration: 10}
[ForceLayout][1234567950] STOP
[ViewportCulling][1234567960] CHECK_GUARD {layoutRunning: false, nodeCount: 1000}
[ViewportCulling][1234567960] CULL_START
[ViewportCulling][1234567970] CULL_END {culledCount: 800}
```

### Step 3: Check Timing

**Goal**: Measure execution order and duration.

**Process**:

1. Use `performance.mark()` and `performance.measure()`
2. Create timeline of operations
3. Identify overlaps or timing gaps

**Performance marking**:

```typescript
const usePerformanceTracking = (operationName: string) => {
  const start = useCallback(() => {
    performance.mark(`${operationName}-start`);
  }, [operationName]);

  const end = useCallback(() => {
    performance.mark(`${operationName}-end`);
    performance.measure(
      operationName,
      `${operationName}-start`,
      `${operationName}-end`
    );

    const measure = performance.getEntriesByName(operationName)[0];
    console.debug(`[Perf] ${operationName}: ${measure.duration.toFixed(2)}ms`);
  }, [operationName]);

  return { start, end };
};

// Usage
const useForceLayout = (graph: Graph) => {
  const perf = usePerformanceTracking('ForceLayout');

  useEffect(() => {
    perf.start();

    const layout = new FA2Layout(graph);
    layout.start();

    return () => {
      layout.stop();
      perf.end();
    };
  }, [graph]);
};
```

**Visualizing timeline**:

```typescript
// Get all performance entries and sort by startTime
const getTimeline = () => {
  const entries = performance.getEntriesByType('measure');
  entries.sort((a, b) => a.startTime - b.startTime);

  console.table(
    entries.map((e) => ({
      name: e.name,
      startTime: e.startTime.toFixed(0),
      duration: e.duration.toFixed(2),
      endTime: (e.startTime + e.duration).toFixed(0),
    }))
  );
};

// Call after operations complete
getTimeline();
```

**Example timeline showing overlap**:

```
┌─────────────────────┬───────────┬──────────┬─────────┐
│ name                │ startTime │ duration │ endTime │
├─────────────────────┼───────────┼──────────┼─────────┤
│ ForceLayout         │ 0         │ 5000.00  │ 5000    │ ← Long running
│ ViewportCulling     │ 100       │ 50.00    │ 150     │ ← Overlaps!
│ ViewportCulling     │ 200       │ 50.00    │ 250     │ ← Repeated
└─────────────────────┴───────────┴──────────┴─────────┘

Problem: Culling runs during layout (0-5000ms)
```

### Step 4: Look for "Temporarily Disabled"

**Goal**: Find existing evidence of known interference.

**Process**:

1. Search codebase for commenting patterns
2. Check git history for disabled features
3. Review TODOs and FIXMEs

**Search patterns**:

```bash
# Find disabled features
git grep -i "temporarily disabled"
git grep -i "commented out because"
git grep -i "TODO.*interfere"
git grep -i "FIXME.*conflict"

# Find commented-out hooks/functions
git grep "// use" -- "*.tsx" "*.ts"

# Check git history for recently disabled code
git log -p --all -S "useViewportCulling" -- "*.tsx"
```

**Example findings**:

```typescript
// ❌ Found in useViewportCulling.ts:
// TEMPORARILY DISABLED: Interferes with force layout
// const useViewportCulling = (graph: Graph) => { ... }

// Git history shows:
// Commit abc123: "Disable viewport culling - causes layout issues"
```

## Common Interference Patterns

### Pattern 1: Layout vs Culling

**Symptom**: Layout never settles, nodes jump around.

**Root cause**: Culling hides nodes before layout calculates forces.

**Solution**:

```typescript
const updateVisibility = useCallback(() => {
  const layout = graph.getAttribute('layout');
  if (layout?.isRunning()) {
    return; // Guard: Wait for layout
  }
  cullNodes();
}, [graph]);
```

### Pattern 2: Animation vs Interaction

**Symptom**: User drags are janky or delayed.

**Root cause**: Animation updates conflict with drag position updates.

**Solution**:

```typescript
const usePausableAnimation = (graph: Graph) => {
  const [paused, setPaused] = useState(false);

  // Listen for user interaction
  useEffect(() => {
    const handleDragStart = () => setPaused(true);
    const handleDragEnd = () => setPaused(false);

    graph.on('drag', handleDragStart);
    graph.on('dragend', handleDragEnd);

    return () => {
      graph.off('drag', handleDragStart);
      graph.off('dragend', handleDragEnd);
    };
  }, [graph]);

  // Animation only runs when not paused
  useEffect(() => {
    if (paused) return;

    const animation = startAnimation();
    return () => animation.stop();
  }, [paused]);
};
```

### Pattern 3: Fetch vs Render

**Symptom**: Flash of incomplete/stale data.

**Root cause**: Render starts before data fetch completes.

**Solution**:

```typescript
const useSequencedDataRender = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);

    fetchData().then((result) => {
      setData(result);
      setIsLoading(false); // Signal ready
    });
  }, []);

  // Only render after data loaded
  if (isLoading || !data) {
    return <Skeleton />;
  }

  return <Visualization data={data} />;
};
```

### Pattern 4: Zoom vs Click

**Symptom**: Clicks trigger during zoom gestures.

**Root cause**: Click event fires before zoom completes.

**Solution**:

```typescript
const useZoomAwareClick = (graph: Graph) => {
  const zoomingRef = useRef(false);
  const lastZoomRef = useRef(Date.now());

  useEffect(() => {
    const handleZoomStart = () => {
      zoomingRef.current = true;
    };

    const handleZoomEnd = () => {
      zoomingRef.current = false;
      lastZoomRef.current = Date.now();
    };

    const handleClick = (event) => {
      // Guard: Ignore clicks during or right after zoom
      if (zoomingRef.current) {
        event.stopPropagation();
        return;
      }

      if (Date.now() - lastZoomRef.current < 200) {
        event.stopPropagation();
        return;
      }

      handleNodeClick(event);
    };

    graph.on('zoomstart', handleZoomStart);
    graph.on('zoomend', handleZoomEnd);
    graph.on('click', handleClick);
  }, [graph]);
};
```

## Advanced Debugging Tools

### Tool 1: State Visualizer

Visualize system states in dev tools.

```typescript
const useStateVisualizer = () => {
  const states = useRef<Record<string, any>>({});

  const setState = useCallback((system: string, state: any) => {
    states.current[system] = state;

    // Update dev tools overlay
    if (window.__DEV_STATE_VISUALIZER__) {
      window.__DEV_STATE_VISUALIZER__.update(states.current);
    }
  }, []);

  return { setState };
};
```

### Tool 2: Event Recorder

Record all events for playback.

```typescript
const useEventRecorder = (graph: Graph) => {
  const events = useRef<Array<{ timestamp: number; type: string; data: any }>>(
    []
  );

  useEffect(() => {
    const handler = (type: string) => (data: any) => {
      events.current.push({
        timestamp: Date.now(),
        type,
        data,
      });
    };

    graph.on('layout:start', handler('layout:start'));
    graph.on('layout:stop', handler('layout:stop'));
    graph.on('cull:start', handler('cull:start'));
    graph.on('cull:end', handler('cull:end'));
  }, [graph]);

  const dump = useCallback(() => {
    console.log(
      'Event timeline:',
      events.current.map((e) => `${e.timestamp}: ${e.type}`)
    );
  }, []);

  return { dump };
};
```

### Tool 3: Assertion Guards

Add runtime assertions to catch violations.

```typescript
const assertNoLayoutRunning = (graph: Graph, operation: string) => {
  const layout = graph.getAttribute('layout');
  if (layout?.isRunning()) {
    throw new Error(
      `Assertion failed: ${operation} called while layout running`
    );
  }
};

// Usage
const cullNodes = (graph: Graph) => {
  assertNoLayoutRunning(graph, 'cullNodes');
  // ... culling logic
};
```

## Debugging Checklist

Before declaring "fixed", verify:

- [ ] Both systems work independently
- [ ] Systems work when combined
- [ ] Timing-sensitive tests pass consistently (run 100x)
- [ ] Performance hasn't regressed
- [ ] No new "temporarily disabled" comments
- [ ] Logging shows expected order of operations
- [ ] Guards prevent interference scenarios
- [ ] Tests cover the interference case

## Case Study: Graph Explorer

**Problem**: Viewport culling disabled in Graph Explorer with comment "interfering with layout".

**Step 1: Isolate**

```
Layout ON,  Culling OFF → Layout settles ✓
Layout ON,  Culling ON  → Layout never settles ✗
Layout OFF, Culling ON  → Works ✓
```

Conclusion: Layout and culling interfere.

**Step 2: Log States**

```
[ForceLayout][123] START
[ViewportCulling][125] CULL_START (layout.isRunning() = true) ← Problem!
[ForceLayout][130] TICK (800 nodes visible)
[ViewportCulling][140] CULL_END (200 nodes culled)
[ForceLayout][145] TICK (200 nodes visible) ← Forces recalculated wrong!
```

**Step 3: Check Timing**

```
ForceLayout: 0-5000ms
ViewportCulling: runs every 100ms during layout
```

Culling runs 50 times during layout, constantly changing node visibility.

**Step 4: Look for Comments**

Found: `// useViewportCulling() - TEMPORARILY DISABLED`

**Solution**:

```typescript
const updateVisibility = useCallback(() => {
  const layout = graph?.getAttribute('layout');
  if (layout?.isRunning()) {
    return; // Guard: Don't cull during layout
  }

  cullNodesOutsideViewport(graph);
}, [graph]);
```

**Verification**:

- Layout settles: ✓
- Culling works after layout: ✓
- Performance improved (only culls when needed): ✓
- No regression in other features: ✓

## Related Patterns

- **State-Based Guards** - Implement guards based on debugging findings
- **Event-Based Sequencing** - Sequence systems identified as interfering
- **Priority Queuing** - Queue operations that compete for resources

## References

- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/) - Timeline profiling
- [React DevTools Profiler](https://react.dev/learn/react-developer-tools#profiler) - Component timing
- [Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance) - Marks and measures
