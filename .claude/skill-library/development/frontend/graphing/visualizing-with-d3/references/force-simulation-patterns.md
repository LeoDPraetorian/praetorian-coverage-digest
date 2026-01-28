# D3-Force Simulation Patterns

**Package Version:** d3-force ^3.0.0

## Overview

The d3-force module implements a velocity Verlet numerical integrator for simulating physical forces on particles. Used for force-directed graph layouts, collision detection, and physics-based visualizations.

## Simulation Lifecycle

```typescript
import * as d3 from 'd3';

interface NodeDatum extends d3.SimulationNodeDatum {
  id: string;
  group?: number;
}

interface LinkDatum extends d3.SimulationLinkDatum<NodeDatum> {
  value?: number;
}

// Create simulation
const simulation = d3.forceSimulation<NodeDatum>(nodes)
  .force('charge', d3.forceManyBody<NodeDatum>())
  .force('link', d3.forceLink<NodeDatum, LinkDatum>(links))
  .force('center', d3.forceCenter(width / 2, height / 2));

// Listen for updates
simulation.on('tick', () => {
  // Update visual positions
});

// Cleanup
simulation.stop();
```

## All Force Types

### 1. forceCenter

Translates nodes uniformly so that the center of mass is at the given position.

```typescript
const center = d3.forceCenter<NodeDatum>(width / 2, height / 2);

// Methods
center.x(width / 2);     // Set x-coordinate
center.y(height / 2);    // Set y-coordinate
center.strength(0.5);    // Centering strength (0-1), default 1
```

### 2. forceCollide

Treats nodes as circles with given radius, preventing overlap.

```typescript
const collide = d3.forceCollide<NodeDatum>()
  .radius(d => d.radius ?? 10)  // Per-node radius
  .strength(0.7)                 // Force strength (0-1), default 1
  .iterations(1);                // Iterations per tick, default 1

// Dynamic radius based on data
collide.radius(d => Math.sqrt(d.value) * 5);
```

### 3. forceLink

Creates spring forces between linked nodes.

```typescript
const link = d3.forceLink<NodeDatum, LinkDatum>(links)
  .id(d => d.id)                    // Node ID accessor
  .distance(30)                      // Target distance, default 30
  .strength(0.5)                     // Force strength (0-1)
  .iterations(1);                    // Iterations per tick

// Dynamic strength/distance
link.strength(link => 1 / Math.min(
  count(link.source),
  count(link.target)
));
link.distance(link => link.value * 10);
```

### 4. forceManyBody

Simulates electrostatic charge (repulsion) or gravity (attraction).

```typescript
const charge = d3.forceManyBody<NodeDatum>()
  .strength(-30)                     // Negative = repel, positive = attract
  .distanceMin(1)                    // Min distance, default 1
  .distanceMax(Infinity)             // Max distance, default Infinity
  .theta(0.9);                       // Barnes-Hut approximation, default 0.9

// Per-node strength
charge.strength(d => d.important ? -100 : -30);
```

### 5. forceX

Pushes nodes toward a target x-coordinate.

```typescript
const forceX = d3.forceX<NodeDatum>()
  .x(d => d.targetX ?? width / 2)   // Target x-coordinate
  .strength(0.1);                    // Force strength (0-1), default 0.1

// Group nodes by category
forceX.x(d => {
  switch (d.category) {
    case 'A': return 100;
    case 'B': return 300;
    default: return 200;
  }
});
```

### 6. forceY

Pushes nodes toward a target y-coordinate.

```typescript
const forceY = d3.forceY<NodeDatum>()
  .y(d => d.targetY ?? height / 2)
  .strength(0.1);
```

### 7. forceRadial

Pushes nodes toward a circle of specified radius around a center point.

```typescript
const radial = d3.forceRadial<NodeDatum>(
  100,          // radius
  width / 2,    // center x
  height / 2    // center y
)
  .strength(0.5);

// Dynamic radius per node
const radial2 = d3.forceRadial<NodeDatum>(
  d => d.depth * 50,  // Radius based on depth
  width / 2,
  height / 2
);
```

## Simulation Parameters

### Alpha (Temperature)

Controls simulation activity. Decays over time toward alphaTarget.

```typescript
const simulation = d3.forceSimulation(nodes);

// Alpha control
simulation.alpha(1);           // Current alpha (0-1), default 1
simulation.alphaMin(0.001);    // Stop threshold, default 0.001
simulation.alphaDecay(0.0228); // Decay rate, default ~0.0228
simulation.alphaTarget(0);     // Target alpha, default 0

// Calculate iterations to reach alphaMin
// Default: ceil(log(alphaMin) / log(1 - alphaDecay)) ≈ 300 ticks
```

### Alpha Decay Tuning

| alphaDecay | Iterations | Use Case |
|------------|------------|----------|
| 0.05 | ~90 | Fast preview |
| 0.0228 (default) | ~300 | Balanced |
| 0.01 | ~700 | Better convergence |
| 0 | Infinite | Run forever |

```typescript
// For smoother animations with more iterations
simulation.alphaDecay(0.01);

// For real-time interaction (never stops)
simulation.alphaDecay(0).alphaTarget(0.3);
```

### Velocity Decay

Controls node momentum (friction).

```typescript
simulation.velocityDecay(0.4); // Default 0.4

// Lower = more momentum, risk of oscillation
// Higher = stops faster, may not converge
```

## Performance Optimization

### 1. Throttle Tick Events

```typescript
let lastTick = 0;
const THROTTLE_MS = 16; // ~60fps

simulation.on('tick', () => {
  const now = Date.now();
  if (now - lastTick < THROTTLE_MS) return;
  lastTick = now;

  // Update visuals
  render();
});
```

### 2. Limit Distance Calculations

```typescript
// Limit many-body force range
const charge = d3.forceManyBody()
  .distanceMax(200)  // Ignore nodes beyond 200px
  .theta(0.9);       // Use Barnes-Hut approximation
```

### 3. Web Worker for Static Layouts

```typescript
// worker.ts
self.onmessage = function(event) {
  const { nodes, links } = event.data;

  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links))
    .force('charge', d3.forceManyBody())
    .stop();

  // Run to completion
  for (let i = 0; i < 300; i++) {
    simulation.tick();
  }

  self.postMessage({ nodes, links });
};

// main.ts
const worker = new Worker('worker.ts');
worker.postMessage({ nodes, links });
worker.onmessage = (e) => {
  renderStaticGraph(e.data.nodes);
};
```

### 4. Warm Start / Reheat

```typescript
// When data changes, reheat smoothly
function updateData(newNodes: NodeDatum[], newLinks: LinkDatum[]) {
  // Preserve existing positions for nodes that remain
  newNodes.forEach(node => {
    const existing = nodeById.get(node.id);
    if (existing) {
      node.x = existing.x;
      node.y = existing.y;
      node.vx = existing.vx;
      node.vy = existing.vy;
    }
  });

  simulation
    .nodes(newNodes)
    .force('link', d3.forceLink(newLinks).id(d => d.id))
    .alpha(0.3)      // Partial reheat (not full 1.0)
    .restart();
}
```

### 5. Smooth Layout Transitions

```typescript
// Use alphaTarget for gradual warmup
function smoothTransition() {
  simulation
    .alphaTarget(0.3)  // Warm to 0.3, not jump to 1.0
    .restart();

  // After transition completes, cool back down
  setTimeout(() => {
    simulation.alphaTarget(0);
  }, 3000);
}
```

## Interaction Patterns

### Drag Behavior

```typescript
function drag(simulation: d3.Simulation<NodeDatum, LinkDatum>) {
  function dragstarted(event: d3.D3DragEvent<SVGElement, NodeDatum, NodeDatum>) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragged(event: d3.D3DragEvent<SVGElement, NodeDatum, NodeDatum>) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragended(event: d3.D3DragEvent<SVGElement, NodeDatum, NodeDatum>) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }

  return d3.drag<SVGElement, NodeDatum>()
    .on('start', dragstarted)
    .on('drag', dragged)
    .on('end', dragended);
}
```

### Fixed Node Positions

```typescript
// Pin node to fixed position
node.fx = 100;
node.fy = 200;

// Unpin node
node.fx = null;
node.fy = null;

// Pin all nodes at current positions
nodes.forEach(d => {
  d.fx = d.x;
  d.fy = d.y;
});
```

### Find Nearest Node

```typescript
// Built-in find method
const nearest = simulation.find(mouseX, mouseY);

// With radius limit
const nearestWithin50 = simulation.find(mouseX, mouseY, 50);
```

## Simulation Control Methods

```typescript
// Start/restart with internal timer
simulation.restart();

// Stop internal timer
simulation.stop();

// Manual stepping (when stopped)
for (let i = 0; i < 100; i++) {
  simulation.tick();
}

// Events
simulation.on('tick', () => { /* each step */ });
simulation.on('end', () => { /* alpha < alphaMin */ });

// Remove force by name
simulation.force('charge', null);

// Get force by name
const linkForce = simulation.force('link') as d3.ForceLink<NodeDatum, LinkDatum>;
```

## Custom Force Implementation

```typescript
function forceCluster(strength: number = 0.5) {
  let nodes: NodeDatum[];

  function force(alpha: number) {
    for (const node of nodes) {
      const cluster = clusters.get(node.group);
      if (!cluster) continue;

      const dx = cluster.x - node.x!;
      const dy = cluster.y - node.y!;
      const k = alpha * strength;

      node.vx! += dx * k;
      node.vy! += dy * k;
    }
  }

  force.initialize = function(_nodes: NodeDatum[]) {
    nodes = _nodes;
  };

  force.strength = function(s?: number) {
    return arguments.length ? (strength = s!, force) : strength;
  };

  return force;
}

// Use custom force
simulation.force('cluster', forceCluster(0.3));
```

## Common Configurations

### Network Graph

```typescript
d3.forceSimulation(nodes)
  .force('link', d3.forceLink(links).id(d => d.id).distance(50))
  .force('charge', d3.forceManyBody().strength(-100))
  .force('center', d3.forceCenter(width / 2, height / 2));
```

### Collision-Only (Beeswarm)

```typescript
d3.forceSimulation(nodes)
  .force('x', d3.forceX(d => xScale(d.category)).strength(1))
  .force('y', d3.forceY(height / 2).strength(0.1))
  .force('collide', d3.forceCollide(d => radiusScale(d.value) + 1));
```

### Clustered Layout

```typescript
d3.forceSimulation(nodes)
  .force('cluster', forceCluster(0.5))
  .force('collide', d3.forceCollide(15).strength(0.7))
  .force('center', d3.forceCenter(width / 2, height / 2));
```

## Sources

- [D3 Force Simulations](https://d3js.org/d3-force/simulation)
- [D3-Force GitHub](https://github.com/d3/d3-force)
- [D3 in Depth: Force Layout](https://www.d3indepth.com/force-layout/)
- [Stamen: Forcing Functions - Inside D3.v4](https://stamen.com/forcing-functions-inside-d3-v4-forces-and-layout-transitions-f3e89ee02d12/)
