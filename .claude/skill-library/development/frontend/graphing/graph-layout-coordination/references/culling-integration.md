# Culling Integration

**Complete patterns for coordinating viewport culling with layout algorithms.**

## Why Culling Causes Problems

Without coordination, viewport culling creates an infinite loop:

```
1. Layout running (calculating positions for all nodes)
2. Culling activates (hides nodes outside viewport)
3. Layout detects node count change
4. Layout recalculates (now with fewer nodes)
5. Positions drift toward visible area
6. More nodes enter viewport
7. Culling shows them
8. Layout detects change again
9. Loop continues indefinitely
```

**Result:** Layout never stabilizes, positions drift, browser may freeze.

---

## Complete useCoordinatedCulling Implementation

```typescript
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';

type LayoutPhase = 'idle' | 'running' | 'stabilized';

interface ViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export const useCoordinatedCulling = ({
  sigma,
  graph,
  enabled = true,
  bufferFactor = 1.5,
}: {
  sigma: Sigma | null;
  graph: Graph | null;
  enabled?: boolean;
  bufferFactor?: number;
}) => {
  const [layoutPhase, setLayoutPhase] = useState<LayoutPhase>('idle');
  const [visibleNodeIds, setVisibleNodeIds] = useState<Set<string>>(new Set());
  const debounceTimerRef = useRef<number | null>(null);

  // Subscribe to layout events
  useEffect(() => {
    if (!graph) return;

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

  // Calculate viewport bounds in graph coordinate space
  const calculateViewportBounds = useCallback((): ViewportBounds | null => {
    if (!sigma) return null;

    const container = sigma.getContainer();
    const { x: minX, y: minY } = sigma.viewportToGraph({ x: 0, y: 0 });
    const { x: maxX, y: maxY } = sigma.viewportToGraph({
      x: container.offsetWidth,
      y: container.offsetHeight,
    });

    // Apply buffer for smooth transitions
    const width = Math.abs(maxX - minX) * bufferFactor;
    const height = Math.abs(maxY - minY) * bufferFactor;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    return {
      minX: centerX - width / 2,
      maxX: centerX + width / 2,
      minY: centerY - height / 2,
      maxY: centerY + height / 2,
    };
  }, [sigma, bufferFactor]);

  // Compute visible nodes from viewport
  const computeVisibleNodes = useCallback((): Set<string> => {
    if (!graph || !enabled) {
      return graph ? new Set(graph.nodes()) : new Set();
    }

    const bounds = calculateViewportBounds();
    if (!bounds) return new Set();

    const visible = new Set<string>();

    graph.forEachNode((nodeId, attrs) => {
      const { x, y } = attrs;
      if (
        x >= bounds.minX &&
        x <= bounds.maxX &&
        y >= bounds.minY &&
        y <= bounds.maxY
      ) {
        visible.add(nodeId);
      }
    });

    // Include neighbors for smooth edge transitions
    const visibleWithNeighbors = new Set(visible);
    visible.forEach((nodeId) => {
      graph.forEachNeighbor(nodeId, (neighborId) => {
        visibleWithNeighbors.add(neighborId);
      });
    });

    return visibleWithNeighbors;
  }, [graph, enabled, calculateViewportBounds]);

  // Update visibility - GUARDED by layout phase
  const updateVisibility = useCallback(() => {
    if (!graph) return;

    // CRITICAL GUARD: Only cull when layout is stabilized
    if (layoutPhase !== 'stabilized') {
      return;
    }

    const visible = computeVisibleNodes();
    setVisibleNodeIds(visible);

    graph.forEachNode((nodeId) => {
      const shouldBeHidden = !visible.has(nodeId);
      const isCurrentlyHidden = graph.getNodeAttribute(nodeId, 'viewportCulled');

      if (shouldBeHidden !== isCurrentlyHidden) {
        graph.setNodeAttribute(nodeId, 'viewportCulled', shouldBeHidden);
      }
    });
  }, [graph, layoutPhase, computeVisibleNodes]);

  // Debounced update for camera events
  const debouncedUpdate = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      updateVisibility();
      debounceTimerRef.current = null;
    }, 100); // 100ms debounce
  }, [updateVisibility]);

  // Camera event listener
  useEffect(() => {
    if (!sigma || !graph || !enabled) {
      // Clear culling flags when disabled
      if (graph) {
        graph.forEachNode((nodeId) => {
          graph.setNodeAttribute(nodeId, 'viewportCulled', false);
        });
      }
      return;
    }

    // Initial calculation
    updateVisibility();

    // Listen to camera
    const camera = sigma.getCamera();
    camera.on('updated', debouncedUpdate);

    return () => {
      camera.removeListener('updated', debouncedUpdate);
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [sigma, graph, enabled, updateVisibility, debouncedUpdate]);

  // Stats for monitoring
  const stats = useMemo(() => {
    if (!graph) return { total: 0, visible: 0, culled: 0 };

    const total = graph.order;
    const visible = visibleNodeIds.size;
    const culled = total - visible;

    return { total, visible, culled };
  }, [graph, visibleNodeIds]);

  return {
    visibleNodeIds,
    stats,
    layoutPhase,
    updateVisibility,
  };
};
```

---

## Re-enabling Culling in Existing Code

If you have culling that was disabled due to layout interference:

### Step 1: Add Layout Phase State

```typescript
const [layoutPhase, setLayoutPhase] = useState<LayoutPhase>('idle');
```

### Step 2: Subscribe to Layout Events

```typescript
useEffect(() => {
  const layout = graph.getAttribute('layout');
  layout.on('start', () => setLayoutPhase('running'));
  layout.on('stop', () => setLayoutPhase('stabilized'));
  return () => {
    layout.off('start', handleStart);
    layout.off('stop', handleStop);
  };
}, [graph]);
```

### Step 3: Guard Culling Logic

```typescript
// BEFORE (no guard)
useEffect(() => {
  performCulling();
}, [viewport]);

// AFTER (with guard)
useEffect(() => {
  if (layoutPhase !== 'stabilized') return;
  performCulling();
}, [viewport, layoutPhase]);
```

---

## Chariot Codebase Example

The existing `useViewportCulling.ts` has partial guards:

```typescript
// modules/chariot/ui/src/components/nodeGraph/hooks/useViewportCulling.ts

// Line 140-145: Phase guard exists
if (phase && phase !== 'interactive') {
  return;
}
```

**What's missing:**
- No layout event subscription (receives phase as prop)
- No layout instance management guidance
- No camera coordination

**To complete the coordination:** Ensure parent component:
1. Stores layout via `graph.setAttribute('layout', layout)`
2. Subscribes to layout events
3. Passes correct `phase` prop that reflects layout state
