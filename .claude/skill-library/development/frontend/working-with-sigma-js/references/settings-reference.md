# Settings Reference

Complete Sigma.js settings API reference.

## Core Settings

```typescript
const settings = {
  // Rendering
  renderLabels: true,              // Show node labels
  renderEdgeLabels: false,         // Show edge labels (expensive)
  hideEdgesOnMove: false,          // Hide edges during camera movement
  hideLabelsOnMove: false,         // Hide labels during camera movement
  antialiasing: true,              // WebGL antialiasing

  // Node appearance
  defaultNodeType: 'circle',       // 'circle' | 'image' | custom
  defaultNodeColor: '#999999',     // Fallback color
  labelColor: '#000000',           // Label text color
  labelSize: 12,                   // Label font size
  labelWeight: 'normal',           // Label font weight

  // Edge appearance
  defaultEdgeType: 'line',         // 'line' | 'arrow' | 'curve'
  defaultEdgeColor: '#cccccc',     // Fallback color
  edgeColor: 'default',            // 'default' | 'source' | 'target'

  // Camera
  minCameraRatio: 0.1,             // Max zoom out
  maxCameraRatio: 5.0,             // Max zoom in
  zoomingRatio: 1.5,               // Zoom sensitivity

  // Performance
  batchSize: 1000,                 // WebGL batch size
  enableWebGLExtensions: true,     // Use WebGL extensions
};
```

## Node Program Settings

```typescript
const settings = {
  nodeProgramClasses: {
    circle: NodeCircleProgram,
    image: NodeImageProgram,
    bordered: NodeBorderProgram,
  },
  defaultNodeType: 'circle',
};
```

## Edge Program Settings

```typescript
import { EdgeLineProgram, EdgeArrowProgram } from 'sigma/rendering';

const settings = {
  edgeProgramClasses: {
    line: EdgeLineProgram,
    arrow: EdgeArrowProgram,
  },
  defaultEdgeType: 'line',
};
```

## Label Settings

```typescript
const settings = {
  // Label rendering
  renderLabels: true,
  labelRenderer: customLabelRenderer, // Custom label rendering function

  // Label appearance
  labelColor: { color: '#000000' },
  labelSize: 12,
  labelWeight: 'normal',
  labelFont: 'Arial',

  // Label density
  labelDensity: 1,                 // 0-2, higher = more labels
  labelGridCellSize: 100,          // Grid cell size for density
  labelRenderedSizeThreshold: 6,   // Min size to render label
};
```

## Mouse Interaction Settings

```typescript
const settings = {
  // Zoom
  enableZoom: true,
  zoomingRatio: 1.5,               // Mouse wheel sensitivity
  doubleClickZoomingRatio: 2.0,    // Double-click zoom factor

  // Pan
  enablePan: true,
  panSpeed: 1.0,

  // Selection
  enableSelect: true,
  selectOnClick: true,
};
```

## Performance Settings

```typescript
const settings = {
  // WebGL optimization
  antialiasing: false,             // Disable for performance
  enableWebGLExtensions: true,
  batchSize: 2000,                 // Larger batches = fewer draw calls

  // Render optimization
  hideEdgesOnMove: true,           // Hide edges during camera movement
  hideLabelsOnMove: true,          // Hide labels during camera movement
  renderLabels: false,             // Disable labels entirely

  // Edge rendering
  renderEdgeLabels: false,         // Never render edge labels
  edgeColor: 'default',            // Simpler than 'source'/'target'
};
```

## Runtime Setting Changes

```typescript
// Single setting
sigma.setSetting('renderLabels', false);

// Multiple settings
sigma.setSettings({
  renderLabels: false,
  hideEdgesOnMove: true,
  defaultNodeType: 'circle',
});

// Always refresh after changing settings
sigma.refresh();
```

## Setting Dependencies

Some settings require others:

| Setting                  | Requires                |
| ------------------------ | ----------------------- |
| `renderEdgeLabels`       | `renderLabels: true`    |
| `labelDensity`           | `renderLabels: true`    |
| `edgeColor: 'source'`    | Edge color from nodes   |

## Performance Impact

| Setting                     | FPS Impact | Use When           |
| --------------------------- | ---------- | ------------------ |
| `antialiasing: false`       | +10 FPS    | >5k nodes          |
| `hideEdgesOnMove: true`     | +20 FPS    | During camera move |
| `hideLabelsOnMove: true`    | +5 FPS     | During camera move |
| `renderEdgeLabels: false`   | +15 FPS    | Always (expensive) |
| `renderLabels: false`       | +10 FPS    | <0.3 zoom ratio    |

## Common Setting Patterns

### Minimal Rendering (>10k nodes)

```typescript
const minimalSettings = {
  antialiasing: false,
  renderLabels: false,
  renderEdgeLabels: false,
  hideEdgesOnMove: true,
  defaultNodeType: 'circle',
  batchSize: 2000,
};
```

### High Quality Rendering (<1k nodes)

```typescript
const highQualitySettings = {
  antialiasing: true,
  renderLabels: true,
  renderEdgeLabels: false,  // Still expensive
  hideEdgesOnMove: false,
  defaultNodeType: 'image',
  labelSize: 14,
};
```

### Dynamic Settings (LOD)

```typescript
const useDynamicSettings = () => {
  const sigma = useSigma();
  const { ratio } = useDebouncedCameraState(sigma);

  useEffect(() => {
    if (ratio < 0.3) {
      sigma.setSettings({
        renderLabels: false,
        defaultNodeType: 'circle',
      });
    } else if (ratio < 1.0) {
      sigma.setSettings({
        renderLabels: false,
        defaultNodeType: 'image',
      });
    } else {
      sigma.setSettings({
        renderLabels: true,
        defaultNodeType: 'image',
      });
    }
    sigma.refresh();
  }, [sigma, ratio]);
};
```

## See Also

- [Sigma.js Settings API](https://www.sigmajs.org/docs/latest/api/settings.html)
- [Performance Optimization](performance-optimization.md) - Setting choices for performance
