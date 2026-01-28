# D3-Hierarchy Layout Patterns

**Package Version:** d3-hierarchy ^3.1.2

## Overview

The d3-hierarchy module provides layouts for visualizing hierarchical data: node-link diagrams (tree, cluster), adjacency diagrams (partition, icicle, sunburst), and enclosure diagrams (treemap, pack).

## Creating Hierarchy from Data

### From Nested Data

```typescript
import * as d3 from 'd3';

interface TreeNode {
  name: string;
  value?: number;
  children?: TreeNode[];
}

const data: TreeNode = {
  name: 'root',
  children: [
    { name: 'child1', value: 100 },
    { name: 'child2', children: [
      { name: 'grandchild1', value: 50 },
      { name: 'grandchild2', value: 75 }
    ]}
  ]
};

const root = d3.hierarchy(data)
  .sum(d => d.value ?? 0)    // Required for treemap/pack
  .sort((a, b) => b.value! - a.value!);
```

### From Flat Data (Stratify)

```typescript
interface FlatNode {
  id: string;
  parentId: string | null;
  name: string;
  value?: number;
}

const flatData: FlatNode[] = [
  { id: '1', parentId: null, name: 'root' },
  { id: '2', parentId: '1', name: 'child1', value: 100 },
  { id: '3', parentId: '1', name: 'child2' },
  { id: '4', parentId: '3', name: 'grandchild', value: 50 }
];

const stratify = d3.stratify<FlatNode>()
  .id(d => d.id)
  .parentId(d => d.parentId);

const root = stratify(flatData)
  .sum(d => d.value ?? 0);
```

## Node Properties

After calling `hierarchy()`, each node has:

```typescript
interface HierarchyNode<T> {
  data: T;              // Original data object
  depth: number;        // 0 for root, +1 per level
  height: number;       // Distance to deepest leaf
  parent: HierarchyNode<T> | null;
  children?: HierarchyNode<T>[];
  value?: number;       // Set by sum()

  // Set by layout algorithms:
  x?: number;
  y?: number;
  // Treemap-specific:
  x0?: number;
  y0?: number;
  x1?: number;
  y1?: number;
  // Pack-specific:
  r?: number;
}
```

## Traversal Methods

### Basic Traversal

```typescript
// All descendants (breadth-first)
const allNodes = root.descendants();

// All leaf nodes
const leaves = root.leaves();

// Ancestors (this node to root)
const path = node.ancestors();
```

### Iteration Methods

```typescript
// Breadth-first (level by level)
root.each((node, index) => {
  console.log(node.data.name, 'depth:', node.depth);
});

// Pre-order (parent before children)
root.eachBefore((node) => {
  // Process parent, then children
});

// Post-order (children before parent)
root.eachAfter((node) => {
  // Process children first, then parent
  // Good for bottom-up aggregations
});

// ES6 Iterator
for (const node of root) {
  console.log(node.data.name);
}
```

### Search and Path

```typescript
// Find first matching node
const found = root.find(node => node.data.name === 'target');

// Path between two nodes
const path = source.path(target);
// Returns: [source, common-ancestor, ..., target]

// All links (parent-child pairs)
const links = root.links();
// Returns: [{ source: parent, target: child }, ...]
```

## Layout Algorithms

### 1. Tree Layout (Tidy Tree)

Creates aesthetically pleasing node-link diagrams using Reingold-Tilford algorithm.

```typescript
const treeLayout = d3.tree<TreeNode>()
  .size([width, height])         // Total [width, height]
  // OR
  .nodeSize([nodeWidth, nodeHeight])  // Per-node size
  .separation((a, b) => a.parent === b.parent ? 1 : 2);

const treeRoot = treeLayout(root);

// Access computed positions
treeRoot.each(node => {
  console.log(node.x, node.y);
});

// Render links
const linkGenerator = d3.linkHorizontal<any, d3.HierarchyPointNode<TreeNode>>()
  .x(d => d.y)  // Swap for horizontal tree
  .y(d => d.x);

svg.selectAll('path')
  .data(treeRoot.links())
  .join('path')
  .attr('d', linkGenerator);
```

### 2. Cluster Layout (Dendrogram)

Similar to tree, but places all leaves at the same depth.

```typescript
const clusterLayout = d3.cluster<TreeNode>()
  .size([360, radius])  // For radial dendrogram
  .separation((a, b) => 1);

const clusterRoot = clusterLayout(root);
```

### 3. Treemap Layout

Recursively subdivides area into rectangles by value.

```typescript
const treemapLayout = d3.treemap<TreeNode>()
  .size([width, height])
  .padding(1)                    // Padding between cells
  .paddingInner(2)               // Inner padding
  .paddingOuter(4)               // Outer padding
  .paddingTop(20)                // Top padding (for labels)
  .round(true)                   // Round to pixels
  .tile(d3.treemapSquarify);     // Tiling algorithm

// REQUIRED: Call sum before layout
root.sum(d => d.value ?? 0);
root.sort((a, b) => b.value! - a.value!);

const treemapRoot = treemapLayout(root);

// Access rectangle bounds
treemapRoot.leaves().forEach(node => {
  const { x0, y0, x1, y1 } = node;
  // Draw rectangle from (x0, y0) to (x1, y1)
});
```

#### Tiling Algorithms

| Algorithm | Description | Best For |
|-----------|-------------|----------|
| `treemapSquarify` | Golden ratio aspect ratio | Default, general use |
| `treemapResquarify` | Stable topology on updates | Animated transitions |
| `treemapBinary` | Balanced binary tree | Binary partitions |
| `treemapDice` | Horizontal subdivision | Wide layouts |
| `treemapSlice` | Vertical subdivision | Tall layouts |
| `treemapSliceDice` | Alternates by depth | Classic treemap |

```typescript
// Animated treemap with stable topology
treemapLayout.tile(d3.treemapResquarify);

// Custom aspect ratio for squarify
treemapLayout.tile(d3.treemapSquarify.ratio(1.5));
```

### 4. Partition Layout

Space-filling adjacency diagram (icicle, sunburst).

```typescript
const partitionLayout = d3.partition<TreeNode>()
  .size([2 * Math.PI, radius])  // For sunburst
  .padding(1)
  .round(true);

root.sum(d => d.value ?? 0);
const partitionRoot = partitionLayout(root);

// Sunburst arc generator
const arc = d3.arc<d3.HierarchyRectangularNode<TreeNode>>()
  .startAngle(d => d.x0)
  .endAngle(d => d.x1)
  .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
  .padRadius(radius / 2)
  .innerRadius(d => d.y0)
  .outerRadius(d => d.y1 - 1);
```

### 5. Pack Layout (Circle Packing)

Enclosure diagram with tightly nested circles.

```typescript
const packLayout = d3.pack<TreeNode>()
  .size([width, height])
  .padding(3);                  // Padding between circles

root.sum(d => d.value ?? 0);
const packRoot = packLayout(root);

// Access circle properties
packRoot.each(node => {
  const { x, y, r } = node;
  // Draw circle at (x, y) with radius r
});

// Render circles
svg.selectAll('circle')
  .data(packRoot.descendants())
  .join('circle')
  .attr('cx', d => d.x)
  .attr('cy', d => d.y)
  .attr('r', d => d.r)
  .attr('fill', d => d.children ? 'none' : 'steelblue');
```

## Value Aggregation

### sum()

Computes values bottom-up (post-order traversal).

```typescript
// Sum leaf values to parents
root.sum(d => d.value ?? 0);

// Count leaves
root.sum(d => d.children ? 0 : 1);

// Size in bytes
root.sum(d => d.size ?? 0);
```

### count()

Sets value to number of leaves.

```typescript
root.count();
// Each node.value = number of leaves below it
```

## Sorting

```typescript
// By descending value (largest first)
root.sort((a, b) => b.value! - a.value!);

// By height then value (recommended for treemap)
root.sort((a, b) => b.height - a.height || b.value! - a.value!);

// Alphabetically
root.sort((a, b) => a.data.name.localeCompare(b.data.name));
```

## Complete Examples

### Radial Tree

```typescript
function RadialTree({ data }: { data: TreeNode }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 800;
    const height = 800;
    const radius = Math.min(width, height) / 2;

    const tree = d3.tree<TreeNode>()
      .size([2 * Math.PI, radius - 100])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);

    const root = tree(d3.hierarchy(data));

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Links
    g.selectAll('.link')
      .data(root.links())
      .join('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', '#999')
      .attr('d', d3.linkRadial<any, d3.HierarchyPointNode<TreeNode>>()
        .angle(d => d.x)
        .radius(d => d.y));

    // Nodes
    const node = g.selectAll('.node')
      .data(root.descendants())
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `
        rotate(${d.x * 180 / Math.PI - 90})
        translate(${d.y},0)
      `);

    node.append('circle').attr('r', 4);
    node.append('text')
      .attr('dy', '0.31em')
      .attr('x', d => d.x < Math.PI === !d.children ? 6 : -6)
      .attr('text-anchor', d => d.x < Math.PI === !d.children ? 'start' : 'end')
      .attr('transform', d => d.x >= Math.PI ? 'rotate(180)' : null)
      .text(d => d.data.name);

  }, [data]);

  return <svg ref={svgRef} width={800} height={800} />;
}
```

### Zoomable Sunburst

```typescript
function Sunburst({ data }: { data: TreeNode }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const width = 600;
    const radius = width / 2;

    const partition = d3.partition<TreeNode>()
      .size([2 * Math.PI, radius]);

    const root = partition(
      d3.hierarchy(data)
        .sum(d => d.value ?? 0)
        .sort((a, b) => b.value! - a.value!)
    );

    const arc = d3.arc<d3.HierarchyRectangularNode<TreeNode>>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(0.005)
      .padRadius(radius / 2)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1 - 1);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2},${width / 2})`);

    g.selectAll('path')
      .data(root.descendants().filter(d => d.depth))
      .join('path')
      .attr('fill', d => color(d.data.name))
      .attr('d', arc as any)
      .on('click', (event, d) => {
        // Zoom animation here
      });

  }, [data]);

  return <svg ref={svgRef} width={600} height={600} />;
}
```

## Performance Tips

1. **Call sum() before layout** - Required for value-based layouts
2. **Sort after sum()** - Affects visual arrangement
3. **Use copy() for multiple layouts** - Avoid recomputing hierarchy
4. **Cache layout objects** - Reuse between updates
5. **Limit depth for large trees** - Filter or collapse nodes

```typescript
// Copy for multiple layouts
const copy = root.copy();

// Filter to max depth
const filtered = root.descendants()
  .filter(d => d.depth <= 3);
```

## Sources

- [D3-Hierarchy Documentation](https://d3js.org/d3-hierarchy)
- [D3-Hierarchy GitHub](https://github.com/d3/d3-hierarchy)
- [D3 in Depth: Hierarchies](https://www.d3indepth.com/hierarchies/)
- [D3 Treemap Documentation](https://d3js.org/d3-hierarchy/treemap)
