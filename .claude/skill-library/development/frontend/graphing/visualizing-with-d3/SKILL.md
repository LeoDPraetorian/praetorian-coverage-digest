---
name: visualizing-with-d3
description: Use when creating D3 data visualizations - comprehensive D3 library documentation including d3-force, d3-hierarchy, d3-quadtree, and all modules with React integration patterns
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Visualizing with D3

**Comprehensive D3.js library documentation for creating interactive data visualizations with React 19 integration patterns.**

## When to Use

Use this skill when:

- Creating force-directed network graphs or physics simulations
- Building hierarchical visualizations (trees, sunbursts, treemaps)
- Implementing spatial data structures with quadtrees
- Working with any D3 module (selections, scales, shapes, transitions)
- Integrating D3 with React 19 lifecycle and hooks
- Optimizing large-scale visualizations (1000+ nodes/elements)

## Current Installation

**Project**: Chariot UI (`modules/chariot/ui/`)

```json
{
  "d3-force": "^3.0.0",
  "d3-hierarchy": "^3.1.2",
  "d3-quadtree": "^3.0.1"
}
```

**Latest D3 Version**: 7.9.0 (modular packages aligned with v7 ecosystem)

## Quick Reference

| Module           | Purpose                                    | Key APIs                                       |
| ---------------- | ------------------------------------------ | ---------------------------------------------- |
| **d3-force**     | Physics simulations, force-directed graphs | forceSimulation, forceLink, forceCollide       |
| **d3-hierarchy** | Hierarchical data layouts                  | hierarchy, tree, pack, partition, treemap      |
| **d3-quadtree**  | Spatial indexing, collision detection      | quadtree, find, visit                          |
| d3-selection     | DOM manipulation, data binding             | select, selectAll, data, join                  |
| d3-scale         | Map data to visual variables               | scaleLinear, scaleOrdinal, scaleBand           |
| d3-shape         | Path generators (lines, arcs, areas)       | line, area, arc, pie, linkHorizontal           |
| d3-zoom          | Pan and zoom behaviors                     | zoom, zoomIdentity, zoomTransform              |
| d3-transition    | Animated changes                           | transition, duration, ease                     |
| d3-drag          | Drag interactions                          | drag, dragstart, dragend                       |
| d3-axis          | Axis generation                            | axisBottom, axisLeft                           |
| d3-time          | Time scales and formatting                 | scaleTime, timeFormat                          |
| d3-array         | Array utilities (statistics, grouping)     | extent, max, mean, group, rollup               |
| d3-color         | Color manipulation                         | rgb, hsl, color                                |
| d3-interpolate   | Interpolation functions                    | interpolate, interpolateRgb, interpolateNumber |
| d3-geo           | Geographic projections                     | geoMercator, geoPath                           |
| d3-delaunay      | Voronoi diagrams, Delaunay triangulation   | Delaunay.from, voronoi                         |

## D3 + React 19 Integration Patterns

**Core Principle**: D3 owns imperative operations (transitions, ticks), React owns declarative rendering (structure, props).

**Key patterns:**

1. **useRef** for D3 selections (avoid re-creating on each render)
2. **useEffect cleanup** to stop simulations and remove listeners
3. **Stable data references** to prevent unnecessary re-initialization

See: [React Integration Patterns](references/react-integration-patterns.md) for complete lifecycle examples

## Force Simulation (d3-force)

Physics-based layouts for network graphs.

### Basic Force Simulation

```tsx
import * as d3 from "d3";

const simulation = d3
  .forceSimulation(nodes)
  .force(
    "link",
    d3
      .forceLink(links)
      .id((d) => d.id)
      .distance(50)
  )
  .force("charge", d3.forceManyBody().strength(-200))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .force("collision", d3.forceCollide().radius(10))
  .on("tick", () => {
    // Update positions
  });
```

### Common Forces

| Force               | Purpose                     | Configuration                    |
| ------------------- | --------------------------- | -------------------------------- |
| `forceLink`         | Connect nodes with springs  | `.distance()`, `.strength()`     |
| `forceManyBody`     | Repulsion/attraction        | `.strength()` (negative = repel) |
| `forceCenter`       | Gravitational pull to point | `.x()`, `.y()`                   |
| `forceCollide`      | Prevent node overlap        | `.radius()`, `.strength()`       |
| `forceX` / `forceY` | Align nodes along axis      | `.x()` / `.y()`, `.strength()`   |
| `forceRadial`       | Circular layout             | `.radius()`, `.x()`, `.y()`      |

See: [Force Simulation Patterns](references/force-simulation-patterns.md) for performance optimization

## Hierarchical Layouts (d3-hierarchy)

Tree, treemap, pack, partition, and sunburst visualizations.

### Creating Hierarchies

```tsx
import { hierarchy, tree, treemap, pack } from "d3-hierarchy";

// Convert data to hierarchy
const root = hierarchy(data)
  .sum((d) => d.value) // Aggregate values
  .sort((a, b) => b.value - a.value); // Sort by value

// Tree layout
const treeLayout = tree<Node>()
  .size([width, height])
  .separation((a, b) => (a.parent === b.parent ? 1 : 2));
treeLayout(root);

// Treemap layout
const treemapLayout = treemap<Node>().size([width, height]).padding(1);
treemapLayout(root);

// Pack layout (circles)
const packLayout = pack<Node>().size([width, height]).padding(3);
packLayout(root);
```

See: [Hierarchical Layout Patterns](references/hierarchical-layout-patterns.md) for traversal and path operations

## Spatial Indexing (d3-quadtree)

Efficient spatial queries for collision detection and nearest-neighbor search.

### Basic Quadtree

```tsx
import { quadtree } from "d3-quadtree";

// Create quadtree from nodes
const tree = quadtree<Node>()
  .x((d) => d.x)
  .y((d) => d.y)
  .addAll(nodes);

// Find nearest node
const nearest = tree.find(mouseX, mouseY, searchRadius);

// Visit nodes in region
tree.visit((node, x0, y0, x1, y1) => {
  if (node.length) return; // Skip internal nodes
  if (isInRegion(node.data, targetX, targetY, radius)) {
    // Process node
  }
});
```

See: [Quadtree Optimization Patterns](references/quadtree-optimization-patterns.md) for collision detection implementations

## D3 Selections & Data Binding

DOM manipulation and data-driven updates.

### Modern Join Pattern

```tsx
import { select } from "d3-selection";

const svg = select(svgRef.current);

svg
  .selectAll("circle")
  .data(nodes, (d) => d.id) // Key function for object constancy
  .join(
    (enter) => enter.append("circle").attr("r", 5).attr("fill", "blue"),
    (update) => update.attr("cx", (d) => d.x).attr("cy", (d) => d.y),
    (exit) => exit.transition().duration(300).attr("r", 0).remove()
  );
```

### Event Handling

```tsx
svg
  .selectAll("circle")
  .on("click", (event, d) => {
    console.log("Clicked node:", d);
  })
  .on("mouseover", (event, d) => {
    select(event.currentTarget).attr("fill", "red");
  });
```

## Scales & Axes

Map data domains to visual ranges.

### Common Scale Types

```tsx
import { scaleLinear, scaleOrdinal, scaleBand, scaleTime } from "d3-scale";

// Continuous scales
const xScale = scaleLinear()
  .domain([0, 100]) // Data range
  .range([0, width]); // Pixel range

// Categorical scales
const colorScale = scaleOrdinal().domain(["A", "B", "C"]).range(["#ff0000", "#00ff00", "#0000ff"]);

// Band scales (bar charts)
const xBand = scaleBand().domain(categories).range([0, width]).padding(0.1);

// Time scales
const timeScale = scaleTime()
  .domain([new Date(2020, 0, 1), new Date(2024, 0, 1)])
  .range([0, width]);
```

See: [Scales and Axes Reference](references/scales-and-axes-reference.md)

## Transitions & Animations

Smooth animated changes.

```tsx
import { transition } from "d3-transition";

svg
  .selectAll("circle")
  .transition()
  .duration(750)
  .ease(d3.easeCubicInOut)
  .attr("cx", (d) => d.x)
  .attr("cy", (d) => d.y);

// Sequential transitions
svg
  .transition()
  .duration(500)
  .attr("r", 10)
  .transition() // Chain next transition
  .duration(500)
  .attr("fill", "red");
```

## Zoom & Pan

Interactive navigation.

```tsx
import { zoom, zoomIdentity } from "d3-zoom";

const zoomBehavior = zoom<SVGSVGElement, unknown>()
  .scaleExtent([0.5, 5]) // Min/max zoom
  .on("zoom", (event) => {
    svg.attr("transform", event.transform);
  });

svg.call(zoomBehavior);

// Programmatic zoom
svg
  .transition()
  .duration(750)
  .call(zoomBehavior.transform, zoomIdentity.translate(100, 100).scale(2));
```

## TypeScript Patterns

### Typed Nodes & Links

```typescript
interface Node {
  id: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface Link {
  source: string | Node;
  target: string | Node;
}

// Force simulation types
const simulation: d3.Simulation<Node, Link> = d3
  .forceSimulation<Node>(nodes)
  .force("link", d3.forceLink<Node, Link>(links));
```

### Selection Types

```typescript
// Type selections
const svg: d3.Selection<SVGSVGElement, unknown, null, undefined> = d3.select(svgRef.current);

// Generic data binding
const circles: d3.Selection<SVGCircleElement, Node, SVGSVGElement, unknown> = svg
  .selectAll<SVGCircleElement, Node>("circle")
  .data(nodes);
```

See: [TypeScript Patterns](references/typescript-patterns.md)

## Performance & Optimization

### Large Dataset Strategies

**1. Canvas Rendering** (>5,000 nodes)

```tsx
const canvas = canvasRef.current;
const ctx = canvas.getContext("2d");

simulation.on("tick", () => {
  ctx.clearRect(0, 0, width, height);
  nodes.forEach((node) => {
    ctx.beginPath();
    ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI);
    ctx.fill();
  });
});
```

**2. Spatial Culling** (render only visible nodes)

```tsx
const visible = nodes.filter(
  (node) =>
    node.x > viewport.x &&
    node.x < viewport.x + viewport.width &&
    node.y > viewport.y &&
    node.y < viewport.y + viewport.height
);
```

**3. Level of Detail** (reduce detail when zoomed out)

```tsx
const shouldRenderLabel = (node: Node, zoom: number) => {
  return zoom > 1.5 || node.importance > 0.8;
};
```

See: [Performance Optimization](references/performance-optimization.md)

## Common Patterns

### Dynamic Data Updates

```tsx
// Update nodes without restarting simulation
const updateNodes = (newNodes: Node[]) => {
  // Preserve positions for existing nodes
  const nodeMap = new Map(simulation.nodes().map((n) => [n.id, n]));
  newNodes.forEach((node) => {
    const existing = nodeMap.get(node.id);
    if (existing) {
      node.x = existing.x;
      node.y = existing.y;
      node.vx = existing.vx;
      node.vy = existing.vy;
    }
  });

  simulation.nodes(newNodes);
  simulation.alpha(0.3).restart();
};
```

### Force Simulation Controls

```tsx
const controls = {
  pause: () => simulation.stop(),
  resume: () => simulation.restart(),
  reset: () => {
    simulation.alpha(1).restart();
  },
  reheat: () => {
    simulation.alpha(0.3).restart();
  },
};
```

## Anti-Patterns to Avoid

| Anti-Pattern                           | Problem                         | Solution                            |
| -------------------------------------- | ------------------------------- | ----------------------------------- |
| Creating simulation in render          | Memory leaks                    | Use useRef + useEffect cleanup      |
| Selecting DOM in every render          | Performance degradation         | Cache selection in ref              |
| Mixing D3 and React DOM updates        | Conflicts and stale data        | Use refs or separate concerns       |
| No simulation cleanup                  | Background simulations continue | Always call `simulation.stop()`     |
| Re-creating forces on data update      | Unnecessary computation         | Update nodes/links, reuse forces    |
| Synchronous transitions in React state | Janky animations                | Use D3 transitions or Framer Motion |
| Hardcoded dimensions                   | Responsiveness issues           | Use ResizeObserver or container ref |

## Integration

### Called By

- `gateway-frontend` (CORE) - Frontend framework and library routing
  - Loaded via: `Read(".claude/skill-library/development/frontend/graphing/visualizing-with-d3/SKILL.md")`

### Requires (invoke before starting)

None - This is a library reference skill providing D3 documentation

### Calls (during execution)

None - Reference material does not invoke other skills

### Pairs With (conditional)

- **optimizing-large-data-visualization** (LIBRARY) - When working with >1000 nodes/elements
  - `Read(".claude/skill-library/development/frontend/graphing/optimizing-large-data-visualization/SKILL.md")`
- **working-with-sigma-js** (LIBRARY) - When combining D3 with Sigma.js for hybrid visualizations
  - `Read(".claude/skill-library/development/frontend/graphing/working-with-sigma-js/SKILL.md")`
- **coordinating-competing-systems** (LIBRARY) - When integrating multiple graphing libraries
  - `Read(".claude/skill-library/development/frontend/graphing/coordinating-competing-systems/SKILL.md")`

## Additional Resources

### Reference Files

- [React Integration Patterns](references/react-integration-patterns.md) - Lifecycle, hooks, cleanup
- [Force Simulation Patterns](references/force-simulation-patterns.md) - Complete force configuration guide
- [Hierarchical Layout Patterns](references/hierarchical-layout-patterns.md) - Trees, treemaps, packs, partitions
- [Quadtree Optimization Patterns](references/quadtree-optimization-patterns.md) - Spatial indexing techniques
- [Scales and Axes Reference](references/scales-and-axes-reference.md) - All scale types and axis generation
- [TypeScript Patterns](references/typescript-patterns.md) - Type definitions for D3 chains
- [Performance Optimization](references/performance-optimization.md) - Canvas rendering, culling, LOD

### Official Documentation

- [D3 API Reference](https://d3js.org/api)
- [Observable D3 Gallery](https://observablehq.com/@d3/gallery)
- [D3 Graph Gallery](https://d3-graph-gallery.com/)
