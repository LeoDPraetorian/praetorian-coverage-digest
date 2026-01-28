# D3-Quadtree Optimization Patterns

**Package Version:** d3-quadtree ^3.0.1

## Overview

A quadtree recursively partitions two-dimensional space into squares, dividing each square into four equally-sized quadrants. Used for spatial operations including:

- Barnes-Hut approximation for many-body forces
- Collision detection
- Nearest-neighbor search
- Region queries

## Complexity Analysis

| Operation | Average | Worst Case |
|-----------|---------|------------|
| Insert | O(log n) | O(n) - degenerate distribution |
| Remove | O(log n) | O(n) |
| Find nearest | O(log n) expected | O(n) |
| Range query | O(k + log n) | O(n) |
| Visit all | O(n) | O(n) |

*Where n = nodes, k = results returned*

## Creating a Quadtree

### Basic Creation

```typescript
import * as d3 from 'd3';

interface Point {
  x: number;
  y: number;
  id: string;
}

// From array of points
const points: Point[] = [
  { x: 10, y: 20, id: 'a' },
  { x: 30, y: 40, id: 'b' },
  { x: 50, y: 60, id: 'c' }
];

const quadtree = d3.quadtree<Point>()
  .x(d => d.x)
  .y(d => d.y)
  .addAll(points);

// One-liner with accessor functions
const qt = d3.quadtree(points, d => d.x, d => d.y);
```

### With Predefined Extent

```typescript
// More efficient when bounds are known
const quadtree = d3.quadtree<Point>()
  .extent([[0, 0], [width, height]])
  .x(d => d.x)
  .y(d => d.y)
  .addAll(points);
```

## Core Methods

### Adding Data

```typescript
// Add single point
quadtree.add(point);

// Add multiple points (more efficient - computes extent first)
quadtree.addAll(points);

// Extend coverage to include point (without adding)
quadtree.cover(x, y);
```

### Removing Data

```typescript
// Remove by reference (strict equality)
quadtree.remove(point);

// Remove multiple
quadtree.removeAll(points);

// Note: Must pass same object reference, not just same values
const p = { x: 10, y: 20 };
quadtree.add(p);
quadtree.remove(p);  // Works
quadtree.remove({ x: 10, y: 20 });  // Does NOT work
```

### Querying Data

```typescript
// Get all data
const allPoints = quadtree.data();

// Get count
const count = quadtree.size();

// Get extent
const [[x0, y0], [x1, y1]] = quadtree.extent();

// Get root node
const rootNode = quadtree.root();
```

## Nearest Neighbor Search

### Find Closest Point

```typescript
// Find nearest to coordinates
const nearest = quadtree.find(mouseX, mouseY);

// Find nearest within radius (more efficient)
const nearestWithinRadius = quadtree.find(mouseX, mouseY, 50);
// Returns undefined if none within 50 units
```

### Usage in Hover Detection

```typescript
function handleMouseMove(event: MouseEvent) {
  const [x, y] = d3.pointer(event);
  const nearest = quadtree.find(x, y, 20); // 20px tolerance

  if (nearest) {
    highlightPoint(nearest);
  } else {
    clearHighlight();
  }
}
```

## Tree Traversal

### visit() - Pre-order Traversal

Visit each node before its children. Return `true` to skip children.

```typescript
interface QuadtreeInternalNode<T> {
  length: 4;           // Always 4 for internal nodes
  0?: QuadtreeNode<T>; // Top-left
  1?: QuadtreeNode<T>; // Top-right
  2?: QuadtreeNode<T>; // Bottom-left
  3?: QuadtreeNode<T>; // Bottom-right
}

interface QuadtreeLeaf<T> {
  data: T;
  next?: QuadtreeLeaf<T>; // For coincident points
}

type QuadtreeNode<T> = QuadtreeInternalNode<T> | QuadtreeLeaf<T>;

quadtree.visit((node, x0, y0, x1, y1) => {
  // node: current node
  // x0, y0: top-left corner of quadrant
  // x1, y1: bottom-right corner of quadrant

  // Check if internal node (has children)
  if (node.length) {
    // Internal node - has 4 quadrants
    console.log('Internal node:', { x0, y0, x1, y1 });
  } else {
    // Leaf node - has data
    let current: QuadtreeLeaf<Point> | undefined = node;
    do {
      console.log('Point:', current.data);
    } while (current = current.next);
  }

  // Return true to skip children
  return false;
});
```

### visitAfter() - Post-order Traversal

Visit children before parent (useful for bottom-up aggregations).

```typescript
quadtree.visitAfter((node, x0, y0, x1, y1) => {
  // Children already visited
  // Good for computing aggregate values
});
```

## Collision Detection

### Circle-Circle Collision (O(n log n))

```typescript
interface Circle extends Point {
  r: number;
}

function detectCollisions(
  circles: Circle[],
  quadtree: d3.Quadtree<Circle>
): Array<[Circle, Circle]> {
  const collisions: Array<[Circle, Circle]> = [];

  for (const circle of circles) {
    const x0 = circle.x - circle.r;
    const y0 = circle.y - circle.r;
    const x1 = circle.x + circle.r;
    const y1 = circle.y + circle.r;

    quadtree.visit((node, qx0, qy0, qx1, qy1) => {
      // Skip if quadrant doesn't intersect bounding box
      if (qx0 > x1 || qx1 < x0 || qy0 > y1 || qy1 < y0) {
        return true; // Skip children
      }

      // Check leaf nodes
      if (!node.length) {
        let current = node as d3.QuadtreeLeaf<Circle>;
        do {
          const other = current.data;
          if (other !== circle) {
            const dx = other.x - circle.x;
            const dy = other.y - circle.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = circle.r + other.r;

            if (dist < minDist) {
              collisions.push([circle, other]);
            }
          }
        } while (current = current.next as d3.QuadtreeLeaf<Circle>);
      }

      return false; // Continue to children
    });
  }

  return collisions;
}
```

### Collision Response

```typescript
function resolveCollisions(circles: Circle[], iterations = 3) {
  const quadtree = d3.quadtree<Circle>()
    .x(d => d.x)
    .y(d => d.y);

  for (let i = 0; i < iterations; i++) {
    quadtree.addAll(circles);

    for (const circle of circles) {
      quadtree.visit((node, x0, y0, x1, y1) => {
        // Bounding box check
        const r = circle.r + 10; // Max radius + padding
        if (x0 > circle.x + r || x1 < circle.x - r ||
            y0 > circle.y + r || y1 < circle.y - r) {
          return true;
        }

        if (!node.length) {
          let q = node as d3.QuadtreeLeaf<Circle>;
          do {
            const other = q.data;
            if (other !== circle) {
              const dx = circle.x - other.x;
              const dy = circle.y - other.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const minDist = circle.r + other.r;

              if (dist < minDist) {
                // Push apart
                const overlap = (minDist - dist) / 2;
                const nx = dx / dist;
                const ny = dy / dist;

                circle.x += nx * overlap;
                circle.y += ny * overlap;
                other.x -= nx * overlap;
                other.y -= ny * overlap;
              }
            }
          } while (q = q.next as d3.QuadtreeLeaf<Circle>);
        }
        return false;
      });
    }

    // Rebuild for next iteration
    quadtree.removeAll(circles);
  }
}
```

## Region Queries

### Points in Rectangle

```typescript
function findPointsInRect(
  quadtree: d3.Quadtree<Point>,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): Point[] {
  const results: Point[] = [];

  quadtree.visit((node, qx0, qy0, qx1, qy1) => {
    // Skip if quadrant doesn't intersect search rect
    if (qx0 > x1 || qx1 < x0 || qy0 > y1 || qy1 < y0) {
      return true;
    }

    // Check leaf nodes
    if (!node.length) {
      let current = node as d3.QuadtreeLeaf<Point>;
      do {
        const p = current.data;
        if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1) {
          results.push(p);
        }
      } while (current = current.next as d3.QuadtreeLeaf<Point>);
    }

    return false;
  });

  return results;
}
```

### Points in Circle

```typescript
function findPointsInCircle(
  quadtree: d3.Quadtree<Point>,
  cx: number,
  cy: number,
  radius: number
): Point[] {
  const results: Point[] = [];
  const r2 = radius * radius;

  quadtree.visit((node, x0, y0, x1, y1) => {
    // Check if circle intersects quadrant
    const closestX = Math.max(x0, Math.min(cx, x1));
    const closestY = Math.max(y0, Math.min(cy, y1));
    const dx = cx - closestX;
    const dy = cy - closestY;

    if (dx * dx + dy * dy > r2) {
      return true; // Skip - no intersection
    }

    if (!node.length) {
      let current = node as d3.QuadtreeLeaf<Point>;
      do {
        const p = current.data;
        const px = p.x - cx;
        const py = p.y - cy;
        if (px * px + py * py <= r2) {
          results.push(p);
        }
      } while (current = current.next as d3.QuadtreeLeaf<Point>);
    }

    return false;
  });

  return results;
}
```

## Barnes-Hut Approximation

Used internally by d3-force for O(n log n) many-body calculations.

```typescript
// Approximate far-away clusters as single point
function barnesHutForce(quadtree: d3.Quadtree<Point>, target: Point, theta = 0.9) {
  let fx = 0, fy = 0;

  quadtree.visit((node, x0, y0, x1, y1) => {
    if (!node.length) {
      // Leaf node - calculate exact force
      let current = node as d3.QuadtreeLeaf<Point>;
      do {
        const p = current.data;
        if (p !== target) {
          const dx = p.x - target.x;
          const dy = p.y - target.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            fx += dx / (dist * dist);
            fy += dy / (dist * dist);
          }
        }
      } while (current = current.next as d3.QuadtreeLeaf<Point>);
      return false;
    }

    // Internal node - check if can approximate
    const width = x1 - x0;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const dx = cx - target.x;
    const dy = cy - target.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // If width/distance < theta, approximate as single body
    if (width / dist < theta) {
      // Approximate force from quadrant center
      fx += dx / (dist * dist);
      fy += dy / (dist * dist);
      return true; // Skip children
    }

    return false; // Recurse into children
  });

  return { fx, fy };
}
```

## Performance Tips

### 1. Use addAll() for Batch Operations

```typescript
// Slower - extent recalculated with each add
points.forEach(p => quadtree.add(p));

// Faster - extent computed once
quadtree.addAll(points);
```

### 2. Predefine Extent When Known

```typescript
// Auto-expand extent (slower)
const qt1 = d3.quadtree<Point>().addAll(points);

// Fixed extent (faster)
const qt2 = d3.quadtree<Point>()
  .extent([[0, 0], [1000, 1000]])
  .addAll(points);
```

### 3. Use Radius Parameter in find()

```typescript
// Searches entire tree
const slow = quadtree.find(x, y);

// Early termination if found within radius
const fast = quadtree.find(x, y, 50);
```

### 4. Early Exit in visit()

```typescript
quadtree.visit((node, x0, y0, x1, y1) => {
  // Skip irrelevant quadrants
  if (isOutsideSearchArea(x0, y0, x1, y1)) {
    return true; // Skip children - major performance gain
  }
  return false;
});
```

### 5. Rebuild vs Update

```typescript
// For major changes - rebuild
const quadtree = d3.quadtree<Point>().addAll(updatedPoints);

// For incremental changes - update
quadtree.remove(oldPoint);
quadtree.add(newPoint);
```

## Integration with D3-Force

The many-body force uses quadtree internally:

```typescript
// theta controls Barnes-Hut approximation
const charge = d3.forceManyBody()
  .theta(0.9)  // Default. Higher = faster but less accurate
  .distanceMax(200);  // Limit force calculation range
```

## Sources

- [D3-Quadtree Documentation](https://d3js.org/d3-quadtree)
- [D3-Quadtree GitHub](https://github.com/d3/d3-quadtree)
- [D3-Quadtree v3.0.1](https://github.com/d3/d3-quadtree/tree/v3.0.1)
