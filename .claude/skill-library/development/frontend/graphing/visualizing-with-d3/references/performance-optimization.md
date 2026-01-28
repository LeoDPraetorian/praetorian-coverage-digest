# D3.js Performance Optimization

## Rendering Technology Thresholds

| Elements | Recommended Renderer | Notes |
|----------|---------------------|-------|
| < 1,000 | SVG | Best interactivity, easy styling |
| 1,000 - 10,000 | Canvas | 5x faster than SVG at 10k points |
| 10,000 - 100,000 | Canvas + optimizations | Requires spatial culling |
| 100,000 - 1,000,000 | WebGL (d3fc) | GPU acceleration required |
| > 1,000,000 | WebGL + data aggregation | Consider server-side preprocessing |

## SVG Optimization

### Keep Node Count Low

```typescript
// Target: < 1,000 DOM nodes for smooth 60fps

function optimizedSVG(data: DataPoint[]) {
  // Use data-join to minimize DOM operations
  const circles = svg.selectAll('circle')
    .data(data, d => d.id)
    .join(
      enter => enter.append('circle')
        .attr('r', 5)
        .attr('opacity', 0)
        .call(enter => enter.transition()
          .duration(300)
          .attr('opacity', 1)),
      update => update,
      exit => exit.transition()
        .duration(200)
        .attr('opacity', 0)
        .remove()
    );
}
```

### Batch DOM Updates

```typescript
// SLOW: Individual updates
data.forEach(d => {
  d3.select(`#circle-${d.id}`)
    .attr('cx', d.x)
    .attr('cy', d.y);
});

// FAST: Batch with selectAll + data join
svg.selectAll('circle')
  .data(data)
  .attr('cx', d => d.x)
  .attr('cy', d => d.y);
```

### Avoid Layout Thrashing

```typescript
// SLOW: Read-write-read-write
const bbox = element.getBBox();  // Read
element.setAttribute('x', bbox.x + 10);  // Write
const newBbox = element.getBBox();  // Read (forces layout)
element.setAttribute('y', newBbox.y + 10);  // Write

// FAST: Batch reads, then batch writes
const allBboxes = elements.map(el => el.getBBox());  // Batch reads
elements.forEach((el, i) => {
  el.setAttribute('x', allBboxes[i].x + 10);
  el.setAttribute('y', allBboxes[i].y + 10);
});  // Batch writes
```

### Simplify Paths

```typescript
import { line, curveMonotoneX } from 'd3-shape';

// Reduce point density for complex paths
function downsample(data: DataPoint[], factor: number): DataPoint[] {
  return data.filter((_, i) => i % factor === 0);
}

// Use simpler curves
const fastLine = line<DataPoint>()
  .x(d => xScale(d.x))
  .y(d => yScale(d.y))
  .curve(curveMonotoneX);  // Faster than curveBasis
```

## Canvas Rendering

### Basic Canvas Setup

```typescript
function canvasChart(data: DataPoint[], container: HTMLElement) {
  const width = 800;
  const height = 600;
  const dpr = window.devicePixelRatio || 1;

  const canvas = document.createElement('canvas');
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  container.appendChild(canvas);

  return { canvas, ctx, width, height };
}
```

### Efficient Canvas Drawing

```typescript
function drawPoints(ctx: CanvasRenderingContext2D, data: DataPoint[]) {
  // Batch by style to minimize state changes
  ctx.beginPath();
  ctx.fillStyle = 'steelblue';

  for (const d of data) {
    ctx.moveTo(d.x + 5, d.y);
    ctx.arc(d.x, d.y, 5, 0, Math.PI * 2);
  }

  ctx.fill();  // Single fill call for all points
}

// AVOID: Individual fill calls
for (const d of data) {
  ctx.beginPath();
  ctx.arc(d.x, d.y, 5, 0, Math.PI * 2);
  ctx.fill();  // Expensive per-point
}
```

### Canvas State Management

```typescript
// Minimize context state changes
function drawGroupedPoints(ctx: CanvasRenderingContext2D, groups: Map<string, DataPoint[]>) {
  for (const [color, points] of groups) {
    ctx.beginPath();
    ctx.fillStyle = color;  // One state change per group

    for (const p of points) {
      ctx.moveTo(p.x + 5, p.y);
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    }

    ctx.fill();
  }
}
```

### requestAnimationFrame for Animation

```typescript
function animate(ctx: CanvasRenderingContext2D, data: DataPoint[]) {
  let animationId: number;

  function frame() {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Update positions
    for (const d of data) {
      d.x += d.vx;
      d.y += d.vy;
    }

    // Draw
    drawPoints(ctx, data);

    animationId = requestAnimationFrame(frame);
  }

  animationId = requestAnimationFrame(frame);

  // Cleanup
  return () => cancelAnimationFrame(animationId);
}
```

## Spatial Culling (Viewport Optimization)

### Quadtree-Based Culling

```typescript
import * as d3 from 'd3';

interface ViewPort {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function getVisiblePoints(
  quadtree: d3.Quadtree<DataPoint>,
  viewport: ViewPort
): DataPoint[] {
  const visible: DataPoint[] = [];
  const { x0, y0, x1, y1 } = viewport;

  quadtree.visit((node, qx0, qy0, qx1, qy1) => {
    // Skip if quadrant outside viewport
    if (qx0 > x1 || qx1 < x0 || qy0 > y1 || qy1 < y0) {
      return true;
    }

    // Check leaf nodes
    if (!node.length) {
      let current = node as d3.QuadtreeLeaf<DataPoint>;
      do {
        const p = current.data;
        if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1) {
          visible.push(p);
        }
      } while (current = current.next as d3.QuadtreeLeaf<DataPoint>);
    }

    return false;
  });

  return visible;
}
```

### Level of Detail (LOD)

```typescript
interface LODConfig {
  zoomLevel: number;
  showLabels: boolean;
  showDetails: boolean;
  pointRadius: number;
  sampleRate: number;  // 1 = all, 2 = half, etc.
}

function getLODConfig(zoom: number): LODConfig {
  if (zoom < 0.5) {
    return {
      zoomLevel: zoom,
      showLabels: false,
      showDetails: false,
      pointRadius: 1,
      sampleRate: 10  // Show only 10% of points
    };
  } else if (zoom < 1) {
    return {
      zoomLevel: zoom,
      showLabels: false,
      showDetails: false,
      pointRadius: 3,
      sampleRate: 2
    };
  } else {
    return {
      zoomLevel: zoom,
      showLabels: true,
      showDetails: true,
      pointRadius: 5,
      sampleRate: 1
    };
  }
}
```

## WebGL with D3FC

### Installation

```bash
npm install @d3fc/d3fc-webgl
```

### Basic WebGL Series

```typescript
import { seriesWebglPoint, webglPlotArea } from '@d3fc/d3fc-webgl';
import * as fc from 'd3fc';

const pointSeries = seriesWebglPoint()
  .crossValue(d => d.x)
  .mainValue(d => d.y)
  .size(4)
  .type(d3.symbolCircle);

const chart = fc.chartCartesian(
  d3.scaleLinear(),
  d3.scaleLinear()
)
  .webglPlotArea(
    webglPlotArea()
      .context('webgl')
      .pixelRatio(window.devicePixelRatio)
  )
  .series(pointSeries);

d3.select('#chart')
  .datum(data)
  .call(chart);
```

### WebGL Performance Benefits

```typescript
// Canvas: ~10,000 points at 60fps
// WebGL: ~1,000,000 points at 60fps

// D3FC abstracts WebGL complexity
const lineSeries = fc.seriesWebglLine()
  .crossValue(d => d.x)
  .mainValue(d => d.y)
  .decorate((context) => {
    // Access WebGL program for custom shaders
    const gl = context;
    // Custom rendering if needed
  });
```

## Memoization and Caching

### Memoize Scale Calculations

```typescript
import { useMemo } from 'react';

function Chart({ data, width, height }: Props) {
  // Memoize scales - only recalculate when dependencies change
  const scales = useMemo(() => ({
    x: d3.scaleLinear()
      .domain(d3.extent(data, d => d.x) as [number, number])
      .range([0, width]),
    y: d3.scaleLinear()
      .domain(d3.extent(data, d => d.y) as [number, number])
      .range([height, 0])
  }), [data, width, height]);

  // Memoize path generator
  const linePath = useMemo(() => {
    const generator = d3.line<DataPoint>()
      .x(d => scales.x(d.x))
      .y(d => scales.y(d.y));
    return generator(data);
  }, [data, scales]);

  return <path d={linePath || ''} />;
}
```

### Cache Complex Calculations

```typescript
// Cache force simulation layout
const layoutCache = new Map<string, NodeDatum[]>();

function getCachedLayout(graphId: string, nodes: NodeDatum[], links: LinkDatum[]) {
  if (layoutCache.has(graphId)) {
    return layoutCache.get(graphId)!;
  }

  // Compute static layout
  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id))
    .force('charge', d3.forceManyBody())
    .stop();

  // Run to completion
  for (let i = 0; i < 300; i++) {
    simulation.tick();
  }

  layoutCache.set(graphId, nodes);
  return nodes;
}
```

## Web Workers for Heavy Computation

### Worker for Static Layout

```typescript
// layout-worker.ts
import * as d3 from 'd3';

self.onmessage = (event: MessageEvent) => {
  const { nodes, links, iterations = 300 } = event.data;

  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id))
    .force('charge', d3.forceManyBody().strength(-100))
    .force('center', d3.forceCenter(400, 300))
    .stop();

  for (let i = 0; i < iterations; i++) {
    simulation.tick();

    // Progress updates
    if (i % 50 === 0) {
      self.postMessage({ type: 'progress', progress: i / iterations });
    }
  }

  self.postMessage({ type: 'complete', nodes, links });
};

// Main thread
const worker = new Worker(new URL('./layout-worker.ts', import.meta.url));

worker.postMessage({ nodes, links, iterations: 300 });

worker.onmessage = (event) => {
  if (event.data.type === 'complete') {
    renderGraph(event.data.nodes, event.data.links);
  }
};
```

## Throttling and Debouncing

### Throttle High-Frequency Events

```typescript
function throttle<T extends (...args: any[]) => void>(
  fn: T,
  limit: number
): T {
  let lastCall = 0;
  return ((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      fn(...args);
    }
  }) as T;
}

// Throttle mousemove to 60fps
const handleMouseMove = throttle((event: MouseEvent) => {
  const [x, y] = d3.pointer(event);
  highlightNearest(x, y);
}, 16);

svg.on('mousemove', handleMouseMove);
```

### Debounce Resize Events

```typescript
function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

// Debounce resize to avoid excessive redraws
const handleResize = debounce(() => {
  const { width, height } = container.getBoundingClientRect();
  updateChart(width, height);
}, 250);

window.addEventListener('resize', handleResize);
```

### Use requestAnimationFrame for Render

```typescript
let renderScheduled = false;
let pendingUpdate: (() => void) | null = null;

function scheduleRender(updateFn: () => void) {
  pendingUpdate = updateFn;

  if (!renderScheduled) {
    renderScheduled = true;
    requestAnimationFrame(() => {
      if (pendingUpdate) {
        pendingUpdate();
        pendingUpdate = null;
      }
      renderScheduled = false;
    });
  }
}

// Usage
simulation.on('tick', () => {
  scheduleRender(() => {
    updateNodePositions();
  });
});
```

## Summary: Performance Checklist

1. **Choose right renderer** for element count
2. **Batch DOM operations** - use data joins
3. **Minimize state changes** in Canvas/WebGL
4. **Implement spatial culling** for large datasets
5. **Use LOD** - reduce detail at zoom out
6. **Memoize calculations** - scales, paths, layouts
7. **Offload to Web Workers** for heavy computation
8. **Throttle/debounce** high-frequency events
9. **Use requestAnimationFrame** for animations
10. **Profile with DevTools** - measure, don't guess

## Sources

- [Scott Logic: Rendering One Million Datapoints with D3 and WebGL](https://blog.scottlogic.com/2020/05/01/rendering-one-million-points-with-d3.html)
- [Infervour: How to Optimize D3.js Code For Performance in 2025](https://infervour.com/blog/how-to-optimize-d3-js-code-for-performance)
- [MoldStud: Optimizing D3.js Rendering](https://moldstud.com/articles/p-optimizing-d3js-rendering-best-practices-for-faster-graphics-performance)
- [D3FC WebGL Documentation](https://github.com/d3fc/d3fc/tree/master/packages/d3fc-series)
- [DataMake: D3 and Canvas in 3 Steps](https://www.datamake.io/blog/d3-canvas-full/)
