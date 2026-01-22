# Camera Patterns

Camera event handling and animation patterns for Sigma.js.

## Camera State Structure

```typescript
interface CameraState {
  x: number; // Center X coordinate
  y: number; // Center Y coordinate
  ratio: number; // Zoom level (0.1 = zoomed out, 5 = zoomed in)
  angle: number; // Rotation in radians
}
```

## Debounced Camera State Hook

**Problem:** Camera fires 60+ events per second during smooth animations, causing excessive React re-renders.

**Solution:** Debounce camera updates to 100-150ms intervals:

```typescript
import { useState, useEffect, useRef } from "react";
import { useSigma } from "@react-sigma/core";
import type { Sigma } from "sigma";

export const useDebouncedCameraState = (sigma: Sigma, delay = 150) => {
  const [state, setState] = useState(() => sigma.getCamera().getState());
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const camera = sigma.getCamera();

    const handleUpdate = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = window.setTimeout(() => {
        setState(camera.getState());
        timerRef.current = null;
      }, delay);
    };

    camera.on("updated", handleUpdate);

    return () => {
      camera.off("updated", handleUpdate);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [sigma, delay]);

  return state;
};
```

**Why 150ms?** Balances responsiveness (feels instant to user) with performance (reduces re-renders by 400x).

## Programmatic Camera Control

### Animate to Position

```typescript
import { useCallback } from "react";
import { useSigma } from "@react-sigma/core";

export const useCameraAnimation = () => {
  const sigma = useSigma();

  const animateToNode = useCallback(
    (nodeId: string) => {
      const camera = sigma.getCamera();
      const graph = sigma.getGraph();

      const nodePosition = {
        x: graph.getNodeAttribute(nodeId, "x"),
        y: graph.getNodeAttribute(nodeId, "y"),
      };

      camera.animate(
        { x: nodePosition.x, y: nodePosition.y, ratio: 0.5 },
        { duration: 500, easing: "quadraticInOut" }
      );
    },
    [sigma]
  );

  const resetCamera = useCallback(() => {
    const camera = sigma.getCamera();
    camera.animate({ x: 0.5, y: 0.5, ratio: 1, angle: 0 }, { duration: 300 });
  }, [sigma]);

  return { animateToNode, resetCamera };
};
```

### Zoom to Fit

```typescript
export const useZoomToFit = () => {
  const sigma = useSigma();

  const zoomToFit = useCallback(() => {
    const camera = sigma.getCamera();
    const graph = sigma.getGraph();

    // Calculate graph bounds
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

    graph.forEachNode((_, attrs) => {
      minX = Math.min(minX, attrs.x);
      maxX = Math.max(maxX, attrs.x);
      minY = Math.min(minY, attrs.y);
      maxY = Math.max(maxY, attrs.y);
    });

    // Calculate center and zoom
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const width = maxX - minX;
    const height = maxY - minY;
    const ratio = Math.min(1 / width, 1 / height) * 0.8; // 0.8 for padding

    camera.animate({ x: centerX, y: centerY, ratio }, { duration: 500 });
  }, [sigma]);

  return zoomToFit;
};
```

## Viewport Calculation

**Problem:** Need to determine which nodes are visible in viewport for culling.

**Solution:** Calculate viewport bounds from camera state:

```typescript
export const useViewportBounds = () => {
  const sigma = useSigma();
  const cameraState = useDebouncedCameraState(sigma);

  const bounds = useMemo(() => {
    const { x, y, ratio } = cameraState;
    const dimensions = sigma.getDimensions();

    // Viewport size in graph coordinates
    const width = dimensions.width * ratio;
    const height = dimensions.height * ratio;

    return {
      minX: x - width / 2,
      maxX: x + width / 2,
      minY: y - height / 2,
      maxY: y + height / 2,
    };
  }, [sigma, cameraState]);

  return bounds;
};
```

## Camera State Persistence

Save/restore camera position:

```typescript
export const useCameraPersistence = (key: string) => {
  const sigma = useSigma();

  const saveCamera = useCallback(() => {
    const state = sigma.getCamera().getState();
    localStorage.setItem(key, JSON.stringify(state));
  }, [sigma, key]);

  const restoreCamera = useCallback(() => {
    const saved = localStorage.getItem(key);
    if (saved) {
      const state = JSON.parse(saved);
      sigma.getCamera().setState(state);
    }
  }, [sigma, key]);

  useEffect(() => {
    restoreCamera();
  }, [restoreCamera]);

  return { saveCamera, restoreCamera };
};
```

## Mouse Wheel Zoom Control

**Problem:** Default zoom is too sensitive or not sensitive enough.

**Solution:** Override mouse wheel settings:

```typescript
const settings = {
  // Zoom sensitivity
  zoomingRatio: 1.5, // Default: 1.5, Lower = slower zoom

  // Min/max zoom limits
  minCameraRatio: 0.1, // How far out
  maxCameraRatio: 5.0, // How far in
};
```

## Camera Event Types

Complete list of camera events:

```typescript
// All camera events
camera.on("updated", handler); // Any camera change (most common)

// Specific events
camera.on("zoom", handler); // Zoom only
camera.on("pan", handler); // Pan only
camera.on("rotate", handler); // Rotation only
```

**Best practice:** Use `'updated'` event for most use cases - it fires for all changes.

## Performance Considerations

1. **Always debounce camera handlers** - 60+ events/second without debouncing
2. **Use `useMemo` for viewport calculations** - expensive coordinate math
3. **Batch camera updates** - use `camera.setState()` instead of multiple `animate()` calls
4. **Clean up timers** - clear debounce timers in cleanup function

## Anti-Patterns

❌ **Don't:** Listen to raw camera events without debouncing

```typescript
// Causes 60+ re-renders per second
camera.on("updated", () => {
  setZoomLevel(camera.getState().ratio);
});
```

✅ **Do:** Use debounced hook

```typescript
const { ratio } = useDebouncedCameraState(sigma);
useEffect(() => {
  setZoomLevel(ratio);
}, [ratio]);
```

❌ **Don't:** Calculate viewport on every frame

```typescript
camera.on("updated", () => {
  const bounds = calculateViewport(); // Expensive
  setCulledNodes(getNodesInViewport(bounds));
});
```

✅ **Do:** Debounce and memoize

```typescript
const bounds = useViewportBounds(); // Debounced + memoized
const culledNodes = useMemo(() => getNodesInViewport(bounds), [bounds]);
```

## See Also

- [Sigma.js Camera API](https://www.sigmajs.org/docs/latest/api/camera.html)
- [preventing-react-hook-infinite-loops](../../development/preventing-react-hook-infinite-loops/) - Stable dependencies
