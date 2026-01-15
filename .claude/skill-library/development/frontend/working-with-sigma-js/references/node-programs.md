# Node Programs

Custom node rendering programs for Sigma.js.

## Built-in Node Programs

Sigma.js provides several built-in node programs:

| Program              | Import                                    | Use Case                |
| -------------------- | ----------------------------------------- | ----------------------- |
| `NodeCircleProgram`  | `sigma/rendering`                         | Default, fastest        |
| `NodeImageProgram`   | `@sigma/node-image`                       | Icons, avatars          |
| `NodeBorderProgram`  | `@sigma/node-border`                      | Circles with borders    |
| `NodePointProgram`   | `sigma/rendering/webgl/programs/node`     | Minimal point rendering |

## Configuring Node Programs

```typescript
import { NodeCircleProgram } from 'sigma/rendering';
import { NodeImageProgram } from '@sigma/node-image';

const settings = {
  nodeProgramClasses: {
    circle: NodeCircleProgram,
    image: NodeImageProgram,
  },
  defaultNodeType: 'circle',
};
```

## Per-Node Type Assignment

```typescript
// Add node with image type
graph.addNode('node1', {
  x: 0,
  y: 0,
  size: 10,
  label: 'Server',
  type: 'image',
  image: '/icons/server.png',
});

// Switch node type at runtime
graph.setNodeAttribute('node1', 'type', 'circle');
sigma.refresh();
```

## Performance Comparison

| Node Count | Circle FPS | Image FPS | Performance Ratio |
| ---------- | ---------- | --------- | ----------------- |
| 1,000      | 60         | 60        | 1.0x              |
| 5,000      | 60         | 45        | 1.3x              |
| 10,000     | 55         | 20        | 2.75x             |
| 50,000     | 40         | 5         | 8.0x              |

**Key insight:** Icons scale poorly beyond 5,000 nodes. Use LOD to switch between circle/image based on zoom.

## Custom Node Program Example

```typescript
import { NodeDisplayData } from 'sigma/types';
import { AbstractNodeProgram } from 'sigma/rendering';

export class NodeSquareProgram extends AbstractNodeProgram {
  constructor(gl: WebGLRenderingContext, renderer: Sigma) {
    super(gl, renderer);
    // Initialize WebGL buffers
  }

  process(
    nodeData: NodeDisplayData,
    hidden: boolean,
    offset: number
  ): void {
    // Write node data to buffer
    const array = this.array;
    const i = offset * this.STRIDE;

    // Position
    array[i + 0] = nodeData.x;
    array[i + 1] = nodeData.y;

    // Size
    array[i + 2] = nodeData.size;

    // Color
    array[i + 3] = nodeData.color.r;
    array[i + 4] = nodeData.color.g;
    array[i + 5] = nodeData.color.b;
  }

  render(params: RenderParams): void {
    // Render square instead of circle
    // ... WebGL shader code
  }
}
```

## Icon Loading Strategy

**Problem:** Loading 100+ unique icons causes texture memory bloat.

**Solution:** Use sprite atlas or limit icon set:

```typescript
// Icon atlas with limited set
const iconMap = {
  server: '/atlas.png#server',
  database: '/atlas.png#database',
  user: '/atlas.png#user',
};

// Assign icon by type
graph.forEachNode((nodeId, attrs) => {
  const iconKey = iconMap[attrs.category] || iconMap.default;
  graph.setNodeAttribute(nodeId, 'image', iconKey);
});
```

## Node Border Program

```typescript
import { NodeBorderProgram } from '@sigma/node-border';

const settings = {
  nodeProgramClasses: {
    bordered: NodeBorderProgram,
  },
};

// Add node with border
graph.addNode('node1', {
  x: 0,
  y: 0,
  size: 10,
  color: '#ff0000',
  type: 'bordered',
  borderColor: '#000000',
  borderSize: 2,
});
```

## Switching Node Programs at Runtime

**Use case:** LOD switches between circle and image based on zoom.

```typescript
const useDynamicNodeProgram = () => {
  const sigma = useSigma();
  const { ratio } = useDebouncedCameraState(sigma);

  useEffect(() => {
    if (ratio < 0.5) {
      sigma.setSetting('defaultNodeType', 'circle');
    } else {
      sigma.setSetting('defaultNodeType', 'image');
    }
    sigma.refresh();
  }, [sigma, ratio]);
};
```

## Performance Optimization Tips

1. **Pre-load icons:** Load all icon URLs before rendering to avoid mid-frame jank
2. **Limit icon set:** Use 5-10 icon types max, not 1 per node
3. **Use sprite atlas:** Single texture with multiple icons reduces draw calls
4. **Switch to circles at low zoom:** Icons <10px on screen are not visible
5. **Cache node programs:** Don't recreate programs on every render

## See Also

- [Performance Optimization](performance-optimization.md) - LOD strategies
- [Sigma.js Node Programs Documentation](https://www.sigmajs.org/docs/latest/api/node-programs.html)
