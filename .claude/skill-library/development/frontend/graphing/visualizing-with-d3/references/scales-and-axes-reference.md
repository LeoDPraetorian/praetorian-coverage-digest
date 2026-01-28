# D3 Scales and Axes Reference

**Package Version:** d3-scale ^4.0.0, d3-axis ^3.0.0

## Scale Categories

| Category | Scales | Use Case |
|----------|--------|----------|
| **Continuous** | linear, pow, sqrt, log, symlog, identity, radial | Numeric data |
| **Temporal** | time, utc | Date/time data |
| **Sequential** | sequential, sequentialLog, sequentialPow, sequentialSqrt, sequentialSymlog | Color gradients |
| **Diverging** | diverging, divergingLog, divergingPow, divergingSqrt, divergingSymlog | Bipolar data |
| **Quantizing** | quantize, quantile, threshold | Binned data |
| **Ordinal** | ordinal, band, point | Categorical data |

## Continuous Scales

### scaleLinear

Maps continuous domain to continuous range via linear interpolation.

```typescript
import * as d3 from 'd3';

const xScale = d3.scaleLinear()
  .domain([0, 100])        // Input: data values
  .range([0, 800])         // Output: pixel positions
  .clamp(true)             // Clamp output to range
  .nice();                 // Round domain to nice values

// Usage
xScale(50);         // 400
xScale.invert(400); // 50
```

### scalePow / scaleSqrt

Power transformation for wide-range data.

```typescript
const sizeScale = d3.scalePow()
  .exponent(0.5)           // Square root: exponent = 0.5
  .domain([0, 1000])
  .range([0, 50]);

// Equivalent to:
const sqrtScale = d3.scaleSqrt()
  .domain([0, 1000])
  .range([0, 50]);
```

### scaleLog

Logarithmic transformation. Domain must not include zero.

```typescript
const logScale = d3.scaleLog()
  .base(10)                // Default: 10
  .domain([1, 1000])       // Must be > 0
  .range([0, 500]);

logScale(10);   // ~166.67
logScale(100);  // ~333.33
```

### scaleSymlog

Symmetric log - handles negative values and zero.

```typescript
const symlogScale = d3.scaleSymlog()
  .constant(1)             // Transition smoothness
  .domain([-1000, 1000])   // Can include 0 and negatives
  .range([0, 800]);
```

## Time Scales

### scaleTime / scaleUtc

For temporal data with time-aware ticks.

```typescript
const timeScale = d3.scaleTime()
  .domain([new Date(2024, 0, 1), new Date(2024, 11, 31)])
  .range([0, 800])
  .nice(d3.timeMonth);     // Round to month boundaries

// UTC version (timezone-independent)
const utcScale = d3.scaleUtc()
  .domain([new Date('2024-01-01'), new Date('2024-12-31')])
  .range([0, 800]);
```

### Time Ticks

```typescript
// Auto-generate ticks
const ticks = timeScale.ticks(10);

// Specify interval
const monthlyTicks = timeScale.ticks(d3.timeMonth);
const weeklyTicks = timeScale.ticks(d3.timeWeek);
```

## Ordinal Scales

### scaleOrdinal

Maps discrete domain to discrete range.

```typescript
const colorScale = d3.scaleOrdinal<string>()
  .domain(['A', 'B', 'C'])
  .range(['#ff0000', '#00ff00', '#0000ff']);

colorScale('A');  // '#ff0000'
colorScale('D');  // '#ff0000' (cycles back)

// With color scheme
const categoryScale = d3.scaleOrdinal(d3.schemeCategory10);
```

### scaleBand

For bar charts - divides range into bands with optional padding.

```typescript
const xScale = d3.scaleBand<string>()
  .domain(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
  .range([0, 500])
  .padding(0.1)            // Overall padding (0-1)
  .paddingInner(0.1)       // Between bars
  .paddingOuter(0.05)      // Outside edges
  .align(0.5)              // Band alignment (0-1)
  .round(true);            // Pixel-snap

xScale('Mon');             // Start position of band
xScale.bandwidth();        // Width of each band
xScale.step();             // Band + padding width
```

### scalePoint

Like band, but for points without width.

```typescript
const pointScale = d3.scalePoint<string>()
  .domain(['A', 'B', 'C', 'D'])
  .range([0, 300])
  .padding(0.5);           // Outer padding

pointScale('B');           // Position of point B
pointScale.step();         // Distance between points
```

## Quantizing Scales

### scaleQuantize

Divides continuous domain into uniform segments.

```typescript
const quantize = d3.scaleQuantize<string>()
  .domain([0, 100])
  .range(['low', 'medium', 'high']);

quantize(25);   // 'low' (0-33.33)
quantize(50);   // 'medium' (33.33-66.67)
quantize(75);   // 'high' (66.67-100)

quantize.thresholds();  // [33.33, 66.67]
```

### scaleQuantile

Divides domain into equal-probability segments based on data.

```typescript
const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 100];

const quantile = d3.scaleQuantile<string>()
  .domain(data)
  .range(['Q1', 'Q2', 'Q3', 'Q4']);

quantile(2);    // 'Q1'
quantile(50);   // 'Q3' (based on data distribution)

quantile.quantiles();  // Threshold values
```

### scaleThreshold

Custom thresholds for bucketing.

```typescript
const threshold = d3.scaleThreshold<number, string>()
  .domain([0, 50, 90])
  .range(['fail', 'pass', 'good', 'excellent']);

threshold(-10);  // 'fail'
threshold(25);   // 'pass'
threshold(75);   // 'good'
threshold(95);   // 'excellent'
```

## Common Scale Methods

```typescript
// All scales
scale.domain([min, max]);     // Set/get input domain
scale.range([start, end]);    // Set/get output range
scale.copy();                 // Create independent copy

// Continuous scales
scale.clamp(true);            // Clamp output to range
scale.nice();                 // Round domain to nice values
scale.invert(value);          // Reverse mapping (range -> domain)
scale.ticks(count);           // Generate tick values
scale.tickFormat(count, fmt); // Tick formatter

// Band/Point scales
scale.bandwidth();            // Band width
scale.step();                 // Step between bands
```

## Axis Generation

### Creating Axes

```typescript
// Position options
const xAxisBottom = d3.axisBottom(xScale);  // Ticks below
const xAxisTop = d3.axisTop(xScale);        // Ticks above
const yAxisLeft = d3.axisLeft(yScale);      // Ticks left
const yAxisRight = d3.axisRight(yScale);    // Ticks right
```

### Rendering Axes

```typescript
const svg = d3.select('svg');

// Create axis group
const xAxisGroup = svg.append('g')
  .attr('class', 'x-axis')
  .attr('transform', `translate(0, ${height - margin.bottom})`)
  .call(xAxisBottom);
```

### Axis Configuration

```typescript
const axis = d3.axisBottom(xScale)
  // Tick count (hint, not exact)
  .ticks(10)

  // Explicit tick values
  .tickValues([0, 25, 50, 75, 100])

  // Tick format
  .tickFormat(d3.format('.0f'))          // Integer
  .tickFormat(d3.format('$,.2f'))        // Currency
  .tickFormat(d => `${d}%`)              // Custom

  // Tick size
  .tickSize(6)                           // All ticks
  .tickSizeInner(6)                      // Inner ticks
  .tickSizeOuter(0)                      // Outer ticks (at domain ends)

  // Tick padding
  .tickPadding(3);                       // Space between tick and label
```

### Time Axis Formatting

```typescript
const timeAxis = d3.axisBottom(timeScale)
  .ticks(d3.timeMonth.every(1))
  .tickFormat(d3.timeFormat('%b %Y'));   // "Jan 2024"

// Multi-scale format (automatic)
const autoFormat = d3.timeFormat()
  // Uses different formats based on granularity:
  // milliseconds: ".%L"
  // seconds: ":%S"
  // minutes: "%I:%M"
  // hours: "%I %p"
  // days: "%a %d"
  // weeks: "%b %d"
  // months: "%B"
  // years: "%Y"
```

### Styled Axis

```typescript
// After calling axis
svg.select('.x-axis')
  .selectAll('text')
  .attr('transform', 'rotate(-45)')
  .style('text-anchor', 'end')
  .attr('dx', '-0.5em')
  .attr('dy', '0.15em');

// Remove domain line
svg.select('.x-axis .domain').remove();

// Style ticks
svg.selectAll('.tick line')
  .attr('stroke', '#ccc')
  .attr('stroke-dasharray', '2,2');
```

## Complete Example

```typescript
interface DataPoint {
  date: Date;
  value: number;
  category: string;
}

function createChart(data: DataPoint[], container: SVGSVGElement) {
  const width = 800;
  const height = 400;
  const margin = { top: 20, right: 30, bottom: 50, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Scales
  const xScale = d3.scaleTime()
    .domain(d3.extent(data, d => d.date) as [Date, Date])
    .range([0, innerWidth])
    .nice();

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value)!])
    .range([innerHeight, 0])
    .nice();

  const colorScale = d3.scaleOrdinal<string>()
    .domain([...new Set(data.map(d => d.category))])
    .range(d3.schemeCategory10);

  // Axes
  const xAxis = d3.axisBottom(xScale)
    .ticks(d3.timeMonth.every(2))
    .tickFormat(d3.timeFormat('%b %Y') as (d: Date | d3.NumberValue) => string);

  const yAxis = d3.axisLeft(yScale)
    .ticks(5)
    .tickFormat(d3.format(',.0f'));

  // Render
  const svg = d3.select(container);

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // X Axis
  g.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(xAxis)
    .selectAll('text')
    .attr('transform', 'rotate(-45)')
    .style('text-anchor', 'end');

  // Y Axis
  g.append('g')
    .attr('class', 'y-axis')
    .call(yAxis);

  // Y Axis label
  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', -margin.left + 15)
    .attr('x', -innerHeight / 2)
    .attr('text-anchor', 'middle')
    .text('Value');

  // Data points
  g.selectAll('circle')
    .data(data)
    .join('circle')
    .attr('cx', d => xScale(d.date))
    .attr('cy', d => yScale(d.value))
    .attr('r', 5)
    .attr('fill', d => colorScale(d.category));
}
```

## Format Specifiers

### Number Formats (d3.format)

| Specifier | Example | Output |
|-----------|---------|--------|
| `.0f` | `format(42.7)` | "43" |
| `.2f` | `format(42.7)` | "42.70" |
| `,.0f` | `format(1234567)` | "1,234,567" |
| `$,.2f` | `format(1234.5)` | "$1,234.50" |
| `.2%` | `format(0.125)` | "12.50%" |
| `.2s` | `format(12345)` | "12k" |
| `+.2f` | `format(-5.2)` | "-5.20" |

### Time Formats (d3.timeFormat)

| Specifier | Example |
|-----------|---------|
| `%Y` | "2024" |
| `%m` | "01" (month) |
| `%d` | "15" (day) |
| `%H:%M` | "14:30" |
| `%b %d` | "Jan 15" |
| `%B %Y` | "January 2024" |
| `%x` | "01/15/2024" (locale) |

## Sources

- [D3-Scale Documentation](https://d3js.org/d3-scale)
- [D3-Axis Documentation](https://d3js.org/d3-axis)
- [D3 in Depth: Scales](https://www.d3indepth.com/scales/)
- [D3 Linear Scales](https://d3js.org/d3-scale/linear)
- [D3 Band Scales](https://d3js.org/d3-scale/band)
- [D3 Time Scales](https://d3js.org/d3-scale/time)
