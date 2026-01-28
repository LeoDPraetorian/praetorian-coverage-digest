# React 19 + D3.js Integration Patterns

**Version Reference:** React 19.x, D3.js v7.x (d3-force ^3.0.0, d3-hierarchy ^3.1.2, d3-quadtree ^3.0.1)

## Core Integration Pattern

D3 modules that operate on selections (d3-selection, d3-transition, d3-axis) manipulate the DOM directly, competing with React's virtual DOM. Use `useRef` and `useEffect` to provide D3 with controlled DOM access.

### The useD3 Custom Hook Pattern

```typescript
import { useRef, useEffect, DependencyList } from 'react';
import * as d3 from 'd3';

type D3Selection = d3.Selection<SVGSVGElement, unknown, null, undefined>;

export function useD3(
  renderFn: (svg: D3Selection) => void | (() => void),
  deps: DependencyList = []
): React.RefObject<SVGSVGElement> {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const svg = d3.select(ref.current);
    const cleanup = renderFn(svg);

    return () => {
      // Clear previous content to avoid duplicates
      svg.selectAll('*').remove();
      // Call custom cleanup if provided
      if (typeof cleanup === 'function') cleanup();
    };
  }, deps);

  return ref;
}
```

### Usage Example

```typescript
function LineChart({ data }: { data: DataPoint[] }) {
  const svgRef = useD3((svg) => {
    // D3 rendering logic
    const line = d3.line<DataPoint>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.value));

    svg.append('path')
      .datum(data)
      .attr('d', line);
  }, [data]);

  return <svg ref={svgRef} width={800} height={400} />;
}
```

## State Management Approaches

### Approach 1: React Controls Data, D3 Controls Rendering

Let React manage data state; D3 handles visualization only.

```typescript
interface ChartProps {
  data: DataPoint[];
  width: number;
  height: number;
}

function Chart({ data, width, height }: ChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);

    // Clear previous render
    svg.selectAll('*').remove();

    // Setup scales based on React-provided data
    const xScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.x)!])
      .range([0, width]);

    // Render with D3
    svg.selectAll('circle')
      .data(data)
      .join('circle')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => yScale(d.y))
      .attr('r', 5);

  }, [data, width, height]);

  return <svg ref={svgRef} width={width} height={height} />;
}
```

### Approach 2: D3 for Math, React for Rendering

Use D3 only for calculations (scales, layouts, generators), render with React JSX.

```typescript
function ReactRenderedChart({ data }: { data: DataPoint[] }) {
  // D3 for calculations only - no DOM manipulation
  const xScale = useMemo(
    () => d3.scaleLinear()
      .domain([0, d3.max(data, d => d.x)!])
      .range([0, 800]),
    [data]
  );

  const yScale = useMemo(
    () => d3.scaleLinear()
      .domain([0, d3.max(data, d => d.y)!])
      .range([400, 0]),
    [data]
  );

  // React renders SVG elements directly
  return (
    <svg width={800} height={400}>
      {data.map((d, i) => (
        <circle
          key={i}
          cx={xScale(d.x)}
          cy={yScale(d.y)}
          r={5}
          fill="steelblue"
        />
      ))}
    </svg>
  );
}
```

## Lifecycle Integration

### Multiple useEffect Hooks for Separation of Concerns

```typescript
function AdvancedChart({ data, dimensions }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Effect 1: Draw axes (depends on dimensions)
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    // Remove old axes
    svg.selectAll('.axis').remove();

    // Draw new axes
    const xAxis = d3.axisBottom(xScale);
    svg.append('g')
      .attr('class', 'axis x-axis')
      .call(xAxis);

  }, [dimensions]);

  // Effect 2: Draw data (depends on data)
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    // Remove old data elements
    svg.selectAll('.data-point').remove();

    // Draw new data points
    svg.selectAll('.data-point')
      .data(data)
      .join('circle')
      .attr('class', 'data-point');

  }, [data]);

  return <svg ref={svgRef} />;
}
```

### Cleanup Function Requirements

**CRITICAL:** Always return cleanup function to prevent memory leaks.

```typescript
useEffect(() => {
  const svg = d3.select(svgRef.current);

  // Setup
  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .on('zoom', handleZoom);

  svg.call(zoom);

  // Cleanup - remove event handlers
  return () => {
    svg.on('.zoom', null);
  };
}, []);
```

## Simulation Cleanup Pattern

For d3-force simulations, ALWAYS stop on unmount:

```typescript
useEffect(() => {
  const simulation = d3.forceSimulation(nodes)
    .force('charge', d3.forceManyBody())
    .force('link', d3.forceLink(links))
    .on('tick', ticked);

  // CRITICAL: Stop simulation on cleanup
  return () => {
    simulation.stop();
  };
}, [nodes, links]);
```

## Handling React Strict Mode

React 18+ Strict Mode runs effects twice (setup -> cleanup -> setup). Ensure your D3 code handles this:

```typescript
useEffect(() => {
  const svg = d3.select(svgRef.current);

  // Idempotent setup - clear before adding
  svg.selectAll('*').remove();

  // Now add elements
  svg.append('g').attr('class', 'chart-content');

  return () => {
    svg.selectAll('*').remove();
  };
}, []);
```

## Avoiding Common Memory Leaks

### 1. Event Listener Cleanup

```typescript
useEffect(() => {
  const handleResize = () => {
    // Update chart dimensions
  };

  window.addEventListener('resize', handleResize);

  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []);
```

### 2. Transition Cleanup

```typescript
useEffect(() => {
  const svg = d3.select(svgRef.current);

  const transition = svg.transition()
    .duration(1000)
    .attr('opacity', 1);

  return () => {
    // Cancel any in-progress transitions
    transition.on('end', null);
    svg.interrupt();
  };
}, [data]);
```

### 3. Timer Cleanup

```typescript
useEffect(() => {
  const timer = d3.timer((elapsed) => {
    // Animation frame logic
    if (elapsed > 5000) timer.stop();
  });

  return () => {
    timer.stop();
  };
}, []);
```

## Anti-Patterns to Avoid

| Anti-Pattern | Problem | Solution |
|-------------|---------|----------|
| No cleanup function | Memory leaks, zombie listeners | Always return cleanup |
| Duplicate elements on re-render | Visual artifacts, performance | Clear before adding |
| Mixing React state with D3 mutations | State desync, bugs | Choose one source of truth |
| Missing dependency array | Infinite loops or stale closures | List all dependencies |
| Direct DOM queries | Bypasses React reconciliation | Use refs only |

## Performance Optimization with useMemo

```typescript
function OptimizedChart({ data, width, height }: Props) {
  // Memoize expensive D3 calculations
  const scales = useMemo(() => ({
    x: d3.scaleLinear()
      .domain(d3.extent(data, d => d.x) as [number, number])
      .range([0, width]),
    y: d3.scaleLinear()
      .domain(d3.extent(data, d => d.y) as [number, number])
      .range([height, 0])
  }), [data, width, height]);

  const line = useMemo(
    () => d3.line<DataPoint>()
      .x(d => scales.x(d.x))
      .y(d => scales.y(d.y)),
    [scales]
  );

  // Use memoized values in effect
  useEffect(() => {
    // Render using pre-computed line generator
  }, [line, data]);
}
```

## Responsive Charts with ResizeObserver

```typescript
function useResizeObserver(ref: RefObject<Element>) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [ref]);

  return dimensions;
}
```

## Sources

- [Pluralsight: Using D3.js Inside a React App](https://www.pluralsight.com/resources/blog/guides/using-d3js-inside-a-react-app)
- [D3 Getting Started](https://d3js.org/getting-started)
- [Grid Dynamics: D3.js in React - 8-step Manual](https://blog.griddynamics.com/using-d3-js-with-react-js-an-8-step-comprehensive-manual/)
- [LogRocket: Understanding React's useEffect cleanup function](https://blog.logrocket.com/understanding-react-useeffect-cleanup-function/)
- [React useEffect Documentation](https://react.dev/reference/react/useEffect)
