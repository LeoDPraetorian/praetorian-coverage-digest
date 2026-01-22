---
name: working-with-sigma-js
description: Use when building or maintaining Sigma.js graph visualizations in React - covers camera events, node programs, settings management, and graphology integration
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite
---

# Working with Sigma.js

**WebGL graph rendering patterns for React with performance optimization.**

## When to Use

Use this skill when:

- Building graph visualizations with Sigma.js in React
- Debugging performance issues with large graphs (>1,000 nodes)
- Implementing camera-based interactions (zoom, pan)
- Managing node rendering programs (circles, images, custom)
- Integrating ForceAtlas2 or other layout algorithms
- Optimizing render performance with LOD or culling

## Overview

Sigma.js is a WebGL-accelerated graph rendering library. In React, use the `@react-sigma/core` wrapper. This skill covers **Sigma.js-specific patterns** not found in generic React documentation.

**Key insight:** Sigma.js camera fires 60+ events/second during smooth interactions. Always debounce camera handlers.

## Quick Reference

| Challenge                  | Solution                     | Reference                                        |
| -------------------------- | ---------------------------- | ------------------------------------------------ |
| Camera infinite loops      | Debounce (100-150ms)         | [Pattern 1](#pattern-1-debounced-camera-handler) |
| Slow rendering (5k+ nodes) | Switch icons → circles       | [Node Programs](#node-programs)                  |
| Performance cliff          | Zoom-based LOD               | [Pattern 2](#pattern-2-zoom-based-lod)           |
| Layout coordination        | Store layout on graph        | [Pattern 3](#pattern-3-layout-integration)       |
| Node visibility            | `hidden` attribute + refresh | [Visibility Control](#visibility-control)        |
| Runtime appearance changes | `setSetting()` + refresh     | [Settings Management](#settings-management)      |

## Core Concepts

### Graph Data Structure (graphology)

Sigma.js uses [graphology](https://graphology.github.io/) for graph data:

```typescript
import Graph from "graphology";

const graph = new Graph();

// Add nodes
graph.addNode("node1", {
  x: 0,
  y: 0,
  size: 10,
  label: "Node 1",
  color: "#ff0000",
  type: "circle", // or 'image'
  hidden: false,
});

// Add edges
graph.addEdge("node1", "node2", {
  weight: 1,
  color: "#cccccc",
});

// Access attributes
const x = graph.getNodeAttribute("node1", "x");
graph.setNodeAttribute("node1", "hidden", true);

// Store arbitrary data on graph itself
graph.setAttribute("layout", layoutInstance);
```

**Key patterns:**

- Store layout instances on graph via `setAttribute()` for cross-hook access
- Use `hidden` attribute for visibility without removing nodes
- Batch updates for performance: `graph.updateNode()` instead of multiple `setNodeAttribute()` calls

**See:** [references/graphology-patterns.md](references/graphology-patterns.md) for advanced node/edge operations.

### Camera Events

Camera events fire on zoom, pan, and any camera state change:

```typescript
import { useSigma } from "@react-sigma/core";

const MyComponent = () => {
  const sigma = useSigma();

  useEffect(() => {
    const camera = sigma.getCamera();

    const handleCameraUpdate = () => {
      const state = camera.getState();
      // state.x, state.y: camera center position
      // state.ratio: zoom level (0.1 = zoomed out, 5 = zoomed in)
      // state.angle: rotation
      console.log("Zoom ratio:", state.ratio);
    };

    camera.on("updated", handleCameraUpdate);
    return () => camera.off("updated", handleCameraUpdate);
  }, [sigma]);
};
```

**🚨 CRITICAL:** Always debounce camera handlers (100-150ms). Camera fires **60+ events/second** during smooth zoom.

**See:** [Pattern 1: Debounced Camera Handler](#pattern-1-debounced-camera-handler)

### Node Programs

Node programs define how nodes render:

```typescript
import { NodeCircleProgram } from "sigma/rendering";
import { NodeImageProgram } from "@sigma/node-image";

// In Sigma settings
const settings = {
  nodeProgramClasses: {
    circle: NodeCircleProgram,
    image: NodeImageProgram,
  },
  defaultNodeType: "circle", // or 'image'
};

// Per-node type via attribute
graph.setNodeAttribute("node1", "type", "image");
graph.setNodeAttribute("node1", "image", "/path/to/icon.png");
```

**Performance Note:** Icons are expensive. **5,000 nodes with icons** is harder than **100,000 edges** with default circles.

**See:** [references/node-programs.md](references/node-programs.md) for custom node programs.

### Settings Management

Change Sigma rendering settings at runtime:

```typescript
// Toggle labels
sigma.setSetting("renderLabels", false);

// Change node appearance
sigma.setSetting("defaultNodeType", "circle");
sigma.setSetting("defaultNodeColor", "#666666");

// Force re-render after changes
sigma.refresh();
```

**Pattern:** Call `sigma.refresh()` after batch setting updates.

**See:** [references/settings-reference.md](references/settings-reference.md) for complete settings API.

### Visibility Control

Hide/show nodes without removing from graph:

```typescript
// Hide a node
graph.setNodeAttribute("node1", "hidden", true);

// Hide all nodes matching condition
graph.forEachNode((nodeId, attributes) => {
  if (attributes.type === "temporary") {
    graph.setNodeAttribute(nodeId, "hidden", true);
  }
});

// Refresh to apply
sigma.refresh();
```

**Why `hidden` instead of `removeNode()`:** Preserves graph structure, faster to toggle, no edge cleanup needed.

### Event Handlers

```typescript
// Node events
sigma.on("enterNode", ({ node }) => {
  console.log("Hovering:", node);
});

sigma.on("clickNode", ({ node }) => {
  console.log("Clicked:", node);
});

sigma.on("leaveNode", ({ node }) => {
  console.log("Left:", node);
});

// Stage events (background)
sigma.on("clickStage", () => {
  console.log("Clicked background");
});
```

**See:** [references/event-patterns.md](references/event-patterns.md) for hover state management, click handling.

## Common Patterns

### Pattern 1: Debounced Camera Handler

```typescript
const useDebouncedCameraState = (sigma: Sigma, delay = 150) => {
  const [state, setState] = useState(() => sigma.getCamera().getState());
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setState(sigma.getCamera().getState());
        timerRef.current = null;
      }, delay);
    };

    sigma.getCamera().on("updated", handleUpdate);
    return () => {
      sigma.getCamera().off("updated", handleUpdate);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sigma, delay]);

  return state;
};
```

**Why:** Prevents 60+ React re-renders per second during camera animation.

**See:** [references/camera-patterns.md](references/camera-patterns.md) for camera animation, viewport calculation.

### Pattern 2: Zoom-Based LOD

```typescript
const useLOD = (sigma: Sigma) => {
  const { ratio } = useDebouncedCameraState(sigma);

  useEffect(() => {
    if (ratio < 0.3) {
      sigma.setSetting("defaultNodeType", "circle");
      sigma.setSetting("renderLabels", false);
    } else if (ratio < 1.0) {
      sigma.setSetting("defaultNodeType", "image");
      sigma.setSetting("renderLabels", false);
    } else {
      sigma.setSetting("defaultNodeType", "image");
      sigma.setSetting("renderLabels", true);
    }
    sigma.refresh();
  }, [sigma, ratio]);
};
```

**Thresholds:**

- `ratio < 0.3`: Zoomed out → circles only
- `0.3 - 1.0`: Mid zoom → icons without labels
- `ratio > 1.0`: Zoomed in → icons with labels

**See:** [references/performance-optimization.md](references/performance-optimization.md) for LOD strategies, viewport culling.

### Pattern 3: Layout Integration

```typescript
import FA2Layout from "graphology-layout-forceatlas2/worker";

const useGraphLayout = (graph: Graph) => {
  const layoutRef = useRef<FA2Layout | null>(null);

  const startLayout = useCallback(() => {
    const layout = new FA2Layout(graph, {
      settings: { gravity: 1, scalingRatio: 10 },
    });
    layout.start();

    // Store on graph for other hooks to check
    graph.setAttribute("layout", layout);
    layoutRef.current = layout;

    // Auto-stop after settling
    setTimeout(() => {
      if (layout.isRunning()) layout.stop();
    }, 10000);
  }, [graph]);

  const stopLayout = useCallback(() => {
    layoutRef.current?.stop();
  }, []);

  return { startLayout, stopLayout };
};
```

**Why store on graph:** Other hooks can check `graph.getAttribute('layout')?.isRunning()` to coordinate behaviors.

**See:** [references/layout-coordination.md](references/layout-coordination.md) for coordinating layout, culling, and camera.

## Performance Guidelines

| Nodes        | Edges    | Icons | Expected FPS | Recommendations        |
| ------------ | -------- | ----- | ------------ | ---------------------- |
| < 1,000      | < 5,000  | Yes   | 60           | No optimization needed |
| 1,000-5,000  | < 20,000 | Yes   | 30-60        | Add debouncing         |
| 5,000-10,000 | < 50,000 | No    | 30-60        | Use circles, add LOD   |
| 5,000-10,000 | < 50,000 | Yes   | 15-30        | Add viewport culling   |
| > 10,000     | > 50,000 | No    | 15-30        | Add all optimizations  |

**Critical thresholds:**

- **5,000 nodes with icons:** Performance cliff. Switch to circles or implement LOD.
- **60+ camera events/second:** Infinite loop risk. Always debounce.
- **10,000+ nodes:** Viewport culling required for acceptable FPS.

**See:** [references/performance-optimization.md](references/performance-optimization.md) for profiling, optimization strategies.

## Research Reference

Detailed performance research and patterns:

- `.claude/.output/discovery/20250114-graph-explorer/research-synthesis.md`

This research synthesis documents:

- Camera event frequency analysis (60+ events/second)
- Icon rendering performance cliff at 5,000 nodes
- LOD threshold recommendations by node count
- Viewport culling implementation patterns

## Integration

### Called By

- `frontend-developer` agent - When implementing graph visualizations
- `frontend-lead` agent - When architecting graph features

### Requires (invoke before starting)

- **`preventing-react-hook-infinite-loops`** (LIBRARY) - Camera handler setup
  - Purpose: Ensure stable dependencies, debouncing
  - `Read(".claude/skill-library/development/frontend/preventing-react-hook-infinite-loops/SKILL.md")`

### Calls (during execution)

- **`coordinating-competing-systems`** (LIBRARY) - Layout + culling coordination
  - Purpose: Prevent layout/culling conflicts
  - `Read(".claude/skill-library/development/frontend/graphing/coordinating-competing-systems/SKILL.md")`

### Pairs With (conditional)

- **`optimizing-large-data-visualization`** (LIBRARY) - Large graph performance issues (5000+ nodes)
  - Purpose: General LOD, culling strategies beyond Sigma.js-specific patterns
  - `Read(".claude/skill-library/development/frontend/graphing/optimizing-large-data-visualization/SKILL.md")`

## Examples

See [examples/](examples/) for complete implementations:

- `examples/graph-explorer.tsx` - Full graph explorer with LOD, culling, layout
- `examples/camera-controls.tsx` - Custom zoom/pan controls with debouncing
- `examples/node-tooltip.tsx` - Hover state management without infinite loops
