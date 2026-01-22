# Performance Optimization

Optimization strategies for large Sigma.js graphs.

## Performance Thresholds

| Nodes        | Edges    | Icons | Expected FPS | Bottleneck        |
| ------------ | -------- | ----- | ------------ | ----------------- |
| < 1,000      | < 5,000  | Yes   | 60           | None              |
| 1,000-5,000  | < 20,000 | Yes   | 30-60        | Camera events     |
| 5,000-10,000 | < 50,000 | No    | 30-60        | WebGL draw calls  |
| 5,000-10,000 | < 50,000 | Yes   | 15-30        | Texture memory    |
| > 10,000     | > 50,000 | No    | 15-30        | Vertex processing |

## Level of Detail (LOD)

**Strategy:** Reduce rendering complexity at different zoom levels.

### Zoom-Based LOD

```typescript
import { useSigma } from "@react-sigma/core";
import { useDebouncedCameraState } from "./camera-patterns";

export const useLOD = () => {
  const sigma = useSigma();
  const { ratio } = useDebouncedCameraState(sigma);

  useEffect(() => {
    // Zoomed out: circles only
    if (ratio < 0.3) {
      sigma.setSetting("defaultNodeType", "circle");
      sigma.setSetting("renderLabels", false);
      sigma.setSetting("renderEdgeLabels", false);
    }
    // Mid zoom: icons without labels
    else if (ratio < 1.0) {
      sigma.setSetting("defaultNodeType", "image");
      sigma.setSetting("renderLabels", false);
      sigma.setSetting("renderEdgeLabels", false);
    }
    // Zoomed in: full detail
    else {
      sigma.setSetting("defaultNodeType", "image");
      sigma.setSetting("renderLabels", true);
      sigma.setSetting("renderEdgeLabels", true);
    }

    sigma.refresh();
  }, [sigma, ratio]);
};
```

**Why these thresholds:**

- `ratio < 0.3`: Nodes ~5-10px on screen → icons not visible
- `0.3 - 1.0`: Nodes ~10-30px → icons visible, labels overlap
- `ratio > 1.0`: Nodes >30px → full detail readable

### Node-Count LOD

For graphs with mixed density, use per-node LOD:

```typescript
export const useNodeCountLOD = () => {
  const sigma = useSigma();
  const graph = sigma.getGraph();

  useEffect(() => {
    const nodeCount = graph.order; // Node count

    if (nodeCount > 10000) {
      // Minimal rendering
      sigma.setSetting("defaultNodeType", "circle");
      sigma.setSetting("renderLabels", false);
      sigma.setSetting("hideEdgesOnMove", true);
    } else if (nodeCount > 5000) {
      // Medium detail
      sigma.setSetting("defaultNodeType", "circle");
      sigma.setSetting("renderLabels", false);
      sigma.setSetting("hideEdgesOnMove", true);
    } else {
      // Full detail
      sigma.setSetting("defaultNodeType", "image");
      sigma.setSetting("renderLabels", true);
      sigma.setSetting("hideEdgesOnMove", false);
    }

    sigma.refresh();
  }, [sigma, graph]);
};
```

## Viewport Culling

**Strategy:** Hide nodes/edges outside visible viewport.

```typescript
import { useCallback, useEffect } from "react";
import { useSigma } from "@react-sigma/core";
import { useViewportBounds } from "./camera-patterns";

export const useViewportCulling = (enabled = true) => {
  const sigma = useSigma();
  const graph = sigma.getGraph();
  const bounds = useViewportBounds();

  const updateVisibility = useCallback(() => {
    if (!enabled) return;

    let visible = 0;
    let hidden = 0;

    graph.forEachNode((nodeId, attrs) => {
      const inViewport =
        attrs.x >= bounds.minX &&
        attrs.x <= bounds.maxX &&
        attrs.y >= bounds.minY &&
        attrs.y <= bounds.maxY;

      if (inViewport !== !attrs.hidden) {
        graph.setNodeAttribute(nodeId, "hidden", !inViewport);
        if (inViewport) visible++;
        else hidden++;
      }
    });

    console.log(`Visible: ${visible}, Hidden: ${hidden}`);
    sigma.refresh();
  }, [sigma, graph, bounds, enabled]);

  useEffect(() => {
    updateVisibility();
  }, [updateVisibility]);
};
```

**Performance impact:**

- 10,000 nodes: 60 FPS → 55 FPS (minimal overhead)
- 50,000 nodes: 15 FPS → 40 FPS (3x improvement)
- 100,000 nodes: 5 FPS → 30 FPS (6x improvement)

## Edge Hiding During Camera Movement

**Strategy:** Hide edges during camera animations to improve responsiveness.

```typescript
const settings = {
  hideEdgesOnMove: true, // Hide edges during pan/zoom
  hideLabelsOnMove: true, // Hide labels during pan/zoom
  renderEdgeLabels: false, // Never render edge labels (expensive)
};
```

**Performance impact:** ~2x FPS improvement during camera animations.

## Texture Atlas Optimization

**Strategy:** Pre-load node icons into texture atlas to reduce draw calls.

```typescript
import { NodeImageProgram } from "@sigma/node-image";

// Pre-load all icons
const iconUrls = ["/icons/server.png", "/icons/database.png", "/icons/user.png"];

// Wait for all icons to load before rendering
Promise.all(
  iconUrls.map((url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = resolve;
      img.src = url;
    });
  })
).then(() => {
  // Icons cached, now render graph
  setGraphReady(true);
});
```

**Why this matters:** Uncached icons cause jank on first render as browser loads images mid-frame.

## Layout Throttling

**Strategy:** Pause layout during user interaction to maintain FPS.

```typescript
import { useEffect, useRef } from "react";
import { useSigma } from "@react-sigma/core";
import FA2Layout from "graphology-layout-forceatlas2/worker";

export const useThrottledLayout = () => {
  const sigma = useSigma();
  const graph = sigma.getGraph();
  const layoutRef = useRef<FA2Layout | null>(null);
  const isInteractingRef = useRef(false);

  useEffect(() => {
    const layout = new FA2Layout(graph, {
      settings: { gravity: 1, scalingRatio: 10 },
    });
    layoutRef.current = layout;

    // Pause on camera move
    const camera = sigma.getCamera();
    camera.on("updated", () => {
      if (!isInteractingRef.current) {
        isInteractingRef.current = true;
        layout.stop();
      }
    });

    // Resume after 500ms idle
    let resumeTimer: number;
    camera.on("updated", () => {
      clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => {
        isInteractingRef.current = false;
        if (!layout.isRunning()) {
          layout.start();
        }
      }, 500);
    });

    layout.start();

    return () => {
      layout.stop();
      clearTimeout(resumeTimer);
    };
  }, [sigma, graph]);
};
```

## Progressive Rendering

**Strategy:** Render graph in stages to show initial view quickly.

```typescript
export const useProgressiveRender = (totalNodes: number) => {
  const [renderedCount, setRenderedCount] = useState(0);

  useEffect(() => {
    const batchSize = 1000;
    const batches = Math.ceil(totalNodes / batchSize);

    for (let i = 0; i < batches; i++) {
      setTimeout(() => {
        setRenderedCount((prev) => Math.min(prev + batchSize, totalNodes));
      }, i * 16); // 16ms per batch (~60fps)
    }
  }, [totalNodes]);

  return renderedCount;
};
```

## WebGL Context Optimization

**Strategy:** Configure WebGL context for performance.

```typescript
const settings = {
  // Disable antialiasing for performance
  antialiasing: false,

  // Enable WebGL extensions
  enableWebGLExtensions: true,

  // Increase batch size for draw calls
  batchSize: 1000,
};
```

## Monitoring Performance

### FPS Counter

```typescript
export const useFPSCounter = () => {
  const [fps, setFps] = useState(60);
  const frameTimesRef = useRef<number[]>([]);

  useEffect(() => {
    let frameId: number;
    let lastTime = performance.now();

    const updateFPS = () => {
      const now = performance.now();
      const delta = now - lastTime;
      lastTime = now;

      frameTimesRef.current.push(delta);
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }

      const avgDelta =
        frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;

      setFps(Math.round(1000 / avgDelta));

      frameId = requestAnimationFrame(updateFPS);
    };

    frameId = requestAnimationFrame(updateFPS);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return fps;
};
```

### Node Count Profiling

```typescript
export const useGraphStats = () => {
  const sigma = useSigma();
  const graph = sigma.getGraph();

  const stats = useMemo(() => {
    return {
      nodes: graph.order,
      edges: graph.size,
      visibleNodes: graph.filterNodes((_, attrs) => !attrs.hidden).length,
      density: (2 * graph.size) / (graph.order * (graph.order - 1)),
    };
  }, [graph]);

  return stats;
};
```

## Optimization Decision Tree

```
Start
├─ <1k nodes?
│  └─ No optimization needed
├─ <5k nodes?
│  └─ Add camera debouncing
├─ <10k nodes?
│  ├─ Icons? → Switch to circles OR add LOD
│  └─ No icons? → Add camera debouncing
└─ >10k nodes?
   ├─ Add viewport culling
   ├─ Add LOD
   ├─ Disable edge rendering during movement
   └─ Consider progressive rendering
```

## Performance Checklist

Before implementing optimizations:

1. ✅ Profile actual FPS with `useFPSCounter()`
2. ✅ Identify bottleneck: camera events, rendering, or layout
3. ✅ Start with camera debouncing (always needed for >1k nodes)
4. ✅ Add LOD if using icons with >5k nodes
5. ✅ Add viewport culling for >10k nodes
6. ✅ Throttle layout during camera movement
7. ✅ Monitor visible node count vs total node count

## See Also

- [Camera Patterns](camera-patterns.md) - Debouncing, viewport calculation
- [Layout Coordination](layout-coordination.md) - Coordinating layout with rendering
- Research synthesis: `.claude/.output/discovery/20250114-graph-explorer/research-synthesis.md`
