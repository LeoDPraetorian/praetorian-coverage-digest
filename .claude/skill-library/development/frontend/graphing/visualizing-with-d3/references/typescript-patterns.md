# D3.js TypeScript Patterns

**Package Versions:** @types/d3 ^7.4.3, d3-force ^3.0.0, d3-hierarchy ^3.1.2

## Installation

```bash
npm install d3 @types/d3

# Or individual modules
npm install d3-selection d3-scale d3-force d3-hierarchy
npm install @types/d3-selection @types/d3-scale @types/d3-force @types/d3-hierarchy
```

## Selection Types

### Basic Selection Generics

The Selection type has four generic parameters:

```typescript
Selection<GElement, Datum, PElement, PDatum>
```

| Parameter | Description |
|-----------|-------------|
| `GElement` | Type of selected elements |
| `Datum` | Data bound to selected elements |
| `PElement` | Type of parent elements |
| `PDatum` | Data bound to parent elements |

### Typing Selections

```typescript
import * as d3 from 'd3';

interface DataPoint {
  x: number;
  y: number;
  label: string;
}

// Select SVG element
const svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any> =
  d3.select<SVGSVGElement, unknown>('svg');

// Select with known parent
const circles: d3.Selection<SVGCircleElement, DataPoint, SVGGElement, unknown> =
  svg.selectAll<SVGCircleElement, DataPoint>('circle')
    .data(data);

// After join - entering elements
const enter: d3.Selection<SVGCircleElement, DataPoint, SVGGElement, unknown> =
  circles.enter()
    .append('circle');
```

### Using Generics in select/selectAll

```typescript
// Explicitly type the selection
d3.select<SVGSVGElement, unknown>('#chart');

// Chain maintains types
const g = d3.select<SVGSVGElement, unknown>('#chart')
  .append<SVGGElement>('g');

// selectAll with data type
d3.selectAll<SVGRectElement, DataPoint>('.bar');
```

## Force Simulation Types

### SimulationNodeDatum Interface

All force simulation nodes must extend `SimulationNodeDatum`:

```typescript
import { SimulationNodeDatum, SimulationLinkDatum } from 'd3-force';

// Node type extending SimulationNodeDatum
interface NodeDatum extends SimulationNodeDatum {
  id: string;
  name: string;
  group: number;
  // SimulationNodeDatum provides these optional properties:
  // index?: number;      // Set by simulation
  // x?: number;          // Position
  // y?: number;
  // vx?: number;         // Velocity
  // vy?: number;
  // fx?: number | null;  // Fixed position
  // fy?: number | null;
}

// Link type extending SimulationLinkDatum
interface LinkDatum extends SimulationLinkDatum<NodeDatum> {
  // source and target are provided by SimulationLinkDatum
  // Can be string ID or NodeDatum reference
  value: number;
}
```

### Typed Force Simulation

```typescript
import * as d3 from 'd3';

// Create typed simulation
const simulation: d3.Simulation<NodeDatum, LinkDatum> =
  d3.forceSimulation<NodeDatum>(nodes);

// Add typed forces
simulation
  .force('link',
    d3.forceLink<NodeDatum, LinkDatum>(links)
      .id((d: NodeDatum) => d.id)
      .distance(50)
  )
  .force('charge',
    d3.forceManyBody<NodeDatum>()
      .strength((d: NodeDatum) => d.group === 1 ? -100 : -50)
  )
  .force('center',
    d3.forceCenter<NodeDatum>(width / 2, height / 2)
  );

// Typed tick handler
simulation.on('tick', () => {
  // d.x and d.y are now typed
  nodeSelection
    .attr('cx', (d: NodeDatum) => d.x!)
    .attr('cy', (d: NodeDatum) => d.y!);
});
```

### Getting Force by Name

```typescript
// Type assertion required when getting forces
const linkForce = simulation.force('link') as
  d3.ForceLink<NodeDatum, LinkDatum>;

// Now can access force-specific methods
linkForce.strength(0.5);

// Or use null check
const maybeForce = simulation.force('link');
if (maybeForce) {
  (maybeForce as d3.ForceLink<NodeDatum, LinkDatum>).distance(100);
}
```

## Hierarchy Types

### HierarchyNode Interface

```typescript
import { HierarchyNode, HierarchyPointNode, HierarchyRectangularNode } from 'd3-hierarchy';

interface TreeData {
  name: string;
  value?: number;
  children?: TreeData[];
}

// Basic hierarchy node
const root: HierarchyNode<TreeData> = d3.hierarchy(data);

// After tree layout - has x, y
const treeRoot: HierarchyPointNode<TreeData> = d3.tree<TreeData>()(root);
// treeRoot.x, treeRoot.y are now typed as number

// After treemap/partition layout - has x0, y0, x1, y1
const treemapRoot: HierarchyRectangularNode<TreeData> = d3.treemap<TreeData>()(root);
// treemapRoot.x0, treemapRoot.y0, treemapRoot.x1, treemapRoot.y1 are typed
```

### Typed Hierarchy Methods

```typescript
// sum() with typed accessor
root.sum((d: TreeData) => d.value ?? 0);

// sort() with typed comparator
root.sort((a: HierarchyNode<TreeData>, b: HierarchyNode<TreeData>) =>
  (b.value ?? 0) - (a.value ?? 0)
);

// find() with typed predicate
const found: HierarchyNode<TreeData> | undefined =
  root.find((d: HierarchyNode<TreeData>) => d.data.name === 'target');

// links() returns typed links
const links: d3.HierarchyLink<TreeData>[] = root.links();
// Each link has: { source: HierarchyNode<TreeData>, target: HierarchyNode<TreeData> }
```

## Scale Types

### Generic Scale Types

```typescript
import { ScaleLinear, ScaleBand, ScaleOrdinal, ScaleTime } from 'd3-scale';

// Linear scale
const xScale: ScaleLinear<number, number> = d3.scaleLinear()
  .domain([0, 100])
  .range([0, 800]);

// Band scale with string domain
const bandScale: ScaleBand<string> = d3.scaleBand<string>()
  .domain(['A', 'B', 'C'])
  .range([0, 500]);

// Ordinal color scale
const colorScale: ScaleOrdinal<string, string> = d3.scaleOrdinal<string, string>()
  .domain(['cat1', 'cat2', 'cat3'])
  .range(['#ff0000', '#00ff00', '#0000ff']);

// Time scale
const timeScale: ScaleTime<number, number> = d3.scaleTime()
  .domain([new Date(2024, 0, 1), new Date(2024, 11, 31)])
  .range([0, 800]);
```

## Event Types

### D3 Event Typing

```typescript
import { D3DragEvent, D3ZoomEvent, D3BrushEvent } from 'd3';

// Drag event
function dragHandler(
  event: D3DragEvent<SVGCircleElement, NodeDatum, NodeDatum>,
  d: NodeDatum
) {
  d.fx = event.x;
  d.fy = event.y;
}

// Zoom event
function zoomHandler(
  event: D3ZoomEvent<SVGSVGElement, unknown>
) {
  const { x, y, k } = event.transform;
  g.attr('transform', `translate(${x},${y}) scale(${k})`);
}

// Brush event
function brushHandler(
  event: D3BrushEvent<DataPoint>
) {
  if (!event.selection) return;
  const [[x0, y0], [x1, y1]] = event.selection as [[number, number], [number, number]];
}

// Mouse event
selection.on('click', (event: MouseEvent, d: DataPoint) => {
  const [x, y] = d3.pointer(event);
  console.log(d.label, x, y);
});
```

## Path Generator Types

```typescript
import { Line, Area, Arc } from 'd3-shape';

// Line generator
const line: Line<DataPoint> = d3.line<DataPoint>()
  .x(d => xScale(d.x))
  .y(d => yScale(d.y))
  .curve(d3.curveMonotoneX);

// Area generator
const area: Area<DataPoint> = d3.area<DataPoint>()
  .x(d => xScale(d.x))
  .y0(height)
  .y1(d => yScale(d.y));

// Arc generator for pie/donut
interface ArcDatum {
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
}

const arc: Arc<any, ArcDatum> = d3.arc<ArcDatum>()
  .innerRadius(d => d.innerRadius)
  .outerRadius(d => d.outerRadius)
  .startAngle(d => d.startAngle)
  .endAngle(d => d.endAngle);
```

## Complete Typed Example

```typescript
import * as d3 from 'd3';
import { useRef, useEffect } from 'react';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  radius: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  strength: number;
}

interface Props {
  nodes: Node[];
  links: Link[];
  width: number;
  height: number;
}

export function ForceGraph({ nodes, links, width, height }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);
    svg.selectAll('*').remove();

    // Create simulation with types
    const simulation = d3.forceSimulation<Node>(nodes)
      .force('link',
        d3.forceLink<Node, Link>(links)
          .id((d: Node) => d.id)
          .strength((l: Link) => l.strength)
      )
      .force('charge', d3.forceManyBody<Node>().strength(-100))
      .force('center', d3.forceCenter<Node>(width / 2, height / 2))
      .force('collision', d3.forceCollide<Node>().radius((d: Node) => d.radius + 2));

    // Typed selections
    const linkSelection = svg.append('g')
      .selectAll<SVGLineElement, Link>('line')
      .data(links)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6);

    const nodeSelection = svg.append('g')
      .selectAll<SVGCircleElement, Node>('circle')
      .data(nodes)
      .join('circle')
      .attr('r', (d: Node) => d.radius)
      .attr('fill', '#69b3a2')
      .call(drag(simulation));

    // Typed tick handler
    simulation.on('tick', () => {
      linkSelection
        .attr('x1', (d: Link) => (d.source as Node).x!)
        .attr('y1', (d: Link) => (d.source as Node).y!)
        .attr('x2', (d: Link) => (d.target as Node).x!)
        .attr('y2', (d: Link) => (d.target as Node).y!);

      nodeSelection
        .attr('cx', (d: Node) => d.x!)
        .attr('cy', (d: Node) => d.y!);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links, width, height]);

  return <svg ref={svgRef} width={width} height={height} />;
}

// Typed drag behavior
function drag(simulation: d3.Simulation<Node, Link>) {
  function dragstarted(event: d3.D3DragEvent<SVGCircleElement, Node, Node>) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragged(event: d3.D3DragEvent<SVGCircleElement, Node, Node>) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragended(event: d3.D3DragEvent<SVGCircleElement, Node, Node>) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }

  return d3.drag<SVGCircleElement, Node>()
    .on('start', dragstarted)
    .on('drag', dragged)
    .on('end', dragended);
}
```

## Common Type Errors and Solutions

### Error: Property 'x' does not exist

```typescript
// Problem: SimulationNodeDatum properties are optional
node.attr('cx', d => d.x);  // Error: d.x may be undefined

// Solution: Non-null assertion (after simulation runs)
node.attr('cx', d => d.x!);

// Or explicit check
node.attr('cx', d => d.x ?? 0);
```

### Error: Argument not assignable

```typescript
// Problem: Generic type mismatch
const scale = d3.scaleLinear();  // ScaleLinear<number, number>
scale.domain(['a', 'b']);        // Error: string[] not assignable

// Solution: Use correct scale type
const scale = d3.scaleOrdinal<string, number>();
```

### Error: source/target not Node type

```typescript
// Problem: link.source can be string or Node
const x = (d: Link) => d.source.x;  // Error

// Solution: Type assertion after simulation runs
const x = (d: Link) => (d.source as Node).x!;
```

## Sources

- [DefinitelyTyped d3-selection](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/d3-selection/index.d.ts)
- [DefinitelyTyped d3-force](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/d3-force/index.d.ts)
- [@types/d3 on npm](https://www.npmjs.com/package/@types/d3)
- [@types/d3-selection on npm](https://www.npmjs.com/package/@types/d3-selection)
