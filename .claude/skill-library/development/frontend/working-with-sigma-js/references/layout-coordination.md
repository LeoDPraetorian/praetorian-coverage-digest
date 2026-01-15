# Layout Coordination

Coordinating ForceAtlas2 layout with camera, culling, and rendering.

## The Coordination Problem

**Competing systems:**

1. **ForceAtlas2 layout** - Updates node positions continuously
2. **Camera system** - User panning/zooming changes viewport
3. **Viewport culling** - Hides nodes outside viewport based on positions
4. **Rendering** - Draws visible nodes at current camera state

**Conflicts:**

- Layout updates during camera movement → jittery animation
- Culling during layout → nodes disappear mid-animation
- Camera zoom during layout → viewport calculation incorrect

## Solution: Coordination State

Store layout state on graph for cross-hook access:

```typescript
// In layout hook
graph.setAttribute('layout', layoutInstance);
graph.setAttribute('layoutRunning', true);

// In culling hook
const isLayoutRunning = graph.getAttribute('layoutRunning');
if (isLayoutRunning) {
  return; // Skip culling during layout
}

// In camera hook
const layout = graph.getAttribute('layout');
if (layout?.isRunning()) {
  layout.stop(); // Pause layout during camera movement
}
```

## Layout Hook with Coordination

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { useSigma } from '@react-sigma/core';
import FA2Layout from 'graphology-layout-forceatlas2/worker';

export const useCoordinatedLayout = (
  settings = { gravity: 1, scalingRatio: 10 }
) => {
  const sigma = useSigma();
  const graph = sigma.getGraph();
  const layoutRef = useRef<FA2Layout | null>(null);

  const startLayout = useCallback(() => {
    if (layoutRef.current?.isRunning()) {
      return;
    }

    const layout = new FA2Layout(graph, { settings });
    layoutRef.current = layout;

    // Store on graph for other hooks
    graph.setAttribute('layout', layout);
    graph.setAttribute('layoutRunning', true);

    layout.start();

    // Auto-stop after settling
    setTimeout(() => {
      if (layout.isRunning()) {
        layout.stop();
        graph.setAttribute('layoutRunning', false);
      }
    }, 10000);
  }, [graph, settings]);

  const stopLayout = useCallback(() => {
    if (layoutRef.current?.isRunning()) {
      layoutRef.current.stop();
      graph.setAttribute('layoutRunning', false);
    }
  }, [graph]);

  useEffect(() => {
    return () => {
      stopLayout();
      graph.removeAttribute('layout');
      graph.removeAttribute('layoutRunning');
    };
  }, [graph, stopLayout]);

  return { startLayout, stopLayout, isRunning: layoutRef.current?.isRunning() };
};
```

## Culling Hook with Layout Awareness

```typescript
import { useEffect, useCallback } from 'react';
import { useSigma } from '@react-sigma/core';
import { useViewportBounds } from './camera-patterns';

export const useLayoutAwareCulling = () => {
  const sigma = useSigma();
  const graph = sigma.getGraph();
  const bounds = useViewportBounds();

  const updateVisibility = useCallback(() => {
    // Skip culling during layout
    const isLayoutRunning = graph.getAttribute('layoutRunning');
    if (isLayoutRunning) {
      return;
    }

    graph.forEachNode((nodeId, attrs) => {
      const inViewport =
        attrs.x >= bounds.minX &&
        attrs.x <= bounds.maxX &&
        attrs.y >= bounds.minY &&
        attrs.y <= bounds.maxY;

      graph.setNodeAttribute(nodeId, 'hidden', !inViewport);
    });

    sigma.refresh();
  }, [sigma, graph, bounds]);

  useEffect(() => {
    updateVisibility();
  }, [updateVisibility]);
};
```

## Camera Hook with Layout Pausing

```typescript
import { useEffect, useRef } from 'react';
import { useSigma } from '@react-sigma/core';

export const useCameraLayoutCoordination = () => {
  const sigma = useSigma();
  const graph = sigma.getGraph();
  const isInteractingRef = useRef(false);
  const resumeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const camera = sigma.getCamera();

    const handleCameraStart = () => {
      isInteractingRef.current = true;

      // Pause layout during camera movement
      const layout = graph.getAttribute('layout');
      if (layout?.isRunning()) {
        layout.stop();
        graph.setAttribute('layoutPausedByCamera', true);
      }
    };

    const handleCameraEnd = () => {
      // Resume layout after 500ms idle
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
      }

      resumeTimerRef.current = window.setTimeout(() => {
        isInteractingRef.current = false;

        // Resume layout if it was paused
        const layout = graph.getAttribute('layout');
        const wasPaused = graph.getAttribute('layoutPausedByCamera');
        if (layout && wasPaused && !layout.isRunning()) {
          layout.start();
          graph.removeAttribute('layoutPausedByCamera');
        }
      }, 500);
    };

    camera.on('updated', handleCameraStart);
    camera.on('updated', handleCameraEnd);

    return () => {
      camera.off('updated', handleCameraStart);
      camera.off('updated', handleCameraEnd);
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
      }
    };
  }, [sigma, graph]);
};
```

## Complete Integration Example

```typescript
import { useEffect } from 'react';
import { SigmaContainer } from '@react-sigma/core';
import { useCoordinatedLayout } from './hooks/useCoordinatedLayout';
import { useLayoutAwareCulling } from './hooks/useLayoutAwareCulling';
import { useCameraLayoutCoordination } from './hooks/useCameraLayoutCoordination';
import { useLOD } from './hooks/useLOD';

const GraphComponent = () => {
  // Order matters: layout → camera coordination → culling → LOD
  const { startLayout, stopLayout } = useCoordinatedLayout();
  useCameraLayoutCoordination();
  useLayoutAwareCulling();
  useLOD();

  useEffect(() => {
    startLayout();
    return () => stopLayout();
  }, [startLayout, stopLayout]);

  return <div>Graph controls...</div>;
};

export const App = () => (
  <SigmaContainer graph={graph} settings={settings}>
    <GraphComponent />
  </SigmaContainer>
);
```

## Coordination State API

**Graph attributes for coordination:**

| Attribute                 | Type             | Purpose                          |
| ------------------------- | ---------------- | -------------------------------- |
| `layout`                  | `FA2Layout`      | Layout instance for cross-hook   |
| `layoutRunning`           | `boolean`        | Is layout currently running      |
| `layoutPausedByCamera`    | `boolean`        | Layout paused by camera movement |
| `initialCameraState`      | `CameraState`    | Original camera position         |

## Lifecycle Sequence

1. **Mount:**
   - Create layout, store on graph
   - Set `layoutRunning = true`
   - Start layout worker

2. **Camera movement:**
   - Detect camera 'updated' event
   - Stop layout, set `layoutPausedByCamera = true`
   - Wait 500ms idle

3. **Camera idle:**
   - Resume layout if `layoutPausedByCamera`
   - Clear pause flag

4. **Layout settling:**
   - Auto-stop after 10s
   - Set `layoutRunning = false`
   - Enable culling

5. **Unmount:**
   - Stop layout
   - Remove graph attributes
   - Cleanup timers

## Common Issues

### Issue: Layout Jitter During Zoom

**Symptom:** Nodes jump around during zoom animation.

**Cause:** Layout continues running while camera animates.

**Fix:** Pause layout during camera movement (see Camera Hook above).

### Issue: Nodes Disappear During Layout

**Symptom:** Culling hides nodes before layout settles.

**Cause:** Culling runs while `layoutRunning = true`.

**Fix:** Skip culling when `layoutRunning` (see Culling Hook above).

### Issue: Camera Animation Stutter

**Symptom:** Zoom/pan stutters when layout is running.

**Cause:** Layout worker updates interfere with render loop.

**Fix:** Stop layout before camera animation:

```typescript
const animateToNode = (nodeId: string) => {
  const layout = graph.getAttribute('layout');
  layout?.stop();

  camera.animate({ ... }, { duration: 500 }).then(() => {
    layout?.start();
  });
};
```

## Performance Impact

| Coordination Strategy | FPS Impact | Smoothness |
| --------------------- | ---------- | ---------- |
| No coordination       | -20 FPS    | Jittery    |
| Layout pause only     | -5 FPS     | Smooth     |
| Full coordination     | -2 FPS     | Very smooth|

## See Also

- [Camera Patterns](camera-patterns.md) - Camera event handling
- [Performance Optimization](performance-optimization.md) - LOD, culling
- [coordinating-competing-systems](../../development/coordinating-competing-systems/) - General coordination patterns
