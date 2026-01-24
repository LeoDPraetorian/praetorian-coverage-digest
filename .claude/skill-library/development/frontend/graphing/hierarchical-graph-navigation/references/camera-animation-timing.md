# Camera Animation Timing

Patterns for smooth camera transitions during hierarchical graph navigation.

## The Core Problem

Sigma.js camera fires **60+ events per second** during animation. Without proper handling:

- Re-render storms (60 React updates/sec)
- Janky animations (state updates block rendering)
- Memory leaks (event listeners not cleaned)

## Debouncing Strategies

### Pattern 1: Library-Based Debouncing

```typescript
import { useDebouncedValue } from '@mantine/hooks';

const [camera, setCamera] = useState(sigma.getCamera().getState());
const debouncedCamera = useDebouncedValue(camera, 150);

useEffect(() => {
  const handleCameraUpdate = (event: CameraUpdateEvent) => {
    setCamera(event.state);
  };

  sigma.on('cameraUpdate', handleCameraUpdate);
  return () => sigma.off('cameraUpdate', handleCameraUpdate);
}, [sigma]);

// Use debouncedCamera in expensive operations
useEffect(() => {
  updateVisibleNodes(debouncedCamera);
}, [debouncedCamera]);
```

**Why 150ms:** Research shows 100-150ms is the sweet spot. Below 100ms = too many updates, above 200ms = feels laggy.

### Pattern 2: Ref-Based Callbacks

```typescript
const onCameraChangeRef = useRef(onCameraChange);

// Keep ref up to date
useEffect(() => {
  onCameraChangeRef.current = onCameraChange;
}, [onCameraChange]);

// Use ref in event handler (doesn't trigger re-render)
useEffect(() => {
  const handleCameraUpdate = (event: CameraUpdateEvent) => {
    onCameraChangeRef.current(event.state);
  };

  sigma.on('cameraUpdate', handleCameraUpdate);
  return () => sigma.off('cameraUpdate', handleCameraUpdate);
}, [sigma]);
```

**Benefit:** Avoids re-render cycles while maintaining access to latest callback.

## Animation Timing Recommendations

### Drill Down (Zoom In)

```typescript
const animateDrillDown = (cluster: ClusterNode) => {
  const camera = sigma.getCamera();

  camera.animate(
    {
      x: cluster.centroid.x,
      y: cluster.centroid.y,
      ratio: 0.5  // Zoom in (smaller ratio = closer)
    },
    {
      duration: 500,
      easing: 'quadInOut'
    }
  );
};
```

**Duration: 500ms** - Feels intentional and smooth. Too fast (<300ms) feels jarring, too slow (>700ms) feels sluggish.

**Easing: quadInOut** - Accelerates at start, decelerates at end. Natural motion.

### Drill Up (Zoom Out)

```typescript
const animateDrillUp = () => {
  const camera = sigma.getCamera();

  camera.animate(
    {
      ratio: 2.0  // Zoom out (larger ratio = farther away)
    },
    {
      duration: 300,
      easing: 'quadOut'
    }
  );
};
```

**Duration: 300ms** - Faster than drill-down. Exit actions feel less important than entry.

**Easing: quadOut** - Decelerates smoothly. No acceleration needed for zoom-out.

### Pan Only (No Zoom)

```typescript
const animatePan = (target: { x: number; y: number }) => {
  const camera = sigma.getCamera();

  camera.animate(
    { x: target.x, y: target.y },
    {
      duration: 400,
      easing: 'linear'
    }
  );
};
```

**Duration: 400ms** - Medium speed. Pure pan is less complex than zoom+pan.

**Easing: linear** - Constant velocity feels good for pan-only.

## Interaction Disabling

### Why Disable Interactions

```typescript
// ❌ PROBLEM: User clicks during animation
// - Click target moves mid-click → wrong node selected
// - Multiple navigation requests overlap → state corruption
// - Camera animation interrupted → jarring stop
```

### Pattern: isAnimating Flag

```typescript
const [isAnimating, setIsAnimating] = useState(false);

const drillDownSafe = (cluster: ClusterNode) => {
  if (isAnimating) return; // Ignore clicks during animation

  setIsAnimating(true);

  animateDrillDown(cluster);

  setTimeout(() => {
    setIsAnimating(false);
  }, 500); // Match animation duration
};
```

### Disable Graph Interactions

```typescript
<SigmaContainer
  style={{
    pointerEvents: isAnimating ? 'none' : 'auto',
    cursor: isAnimating ? 'wait' : 'default'
  }}
>
  {/* Graph content */}
</SigmaContainer>
```

**Visual feedback:** Cursor changes to 'wait' during animation.

## Progress Indicators

### Loading Spinner During Navigation

```typescript
const [navigationState, setNavigationState] = useState<
  'idle' | 'animating' | 'loading'
>('idle');

const drillDownWithProgress = async (cluster: ClusterNode) => {
  // Phase 1: Camera animation
  setNavigationState('animating');
  await animateDrillDown(cluster);

  // Phase 2: Data loading
  setNavigationState('loading');
  const subClusterData = await fetchSubCluster(cluster.id);

  // Phase 3: Render new level
  loadClusterData(subClusterData);
  setNavigationState('idle');
};
```

### Visual Progress Component

```typescript
const NavigationProgress = ({ state }: { state: NavigationState }) => {
  if (state === 'idle') return null;

  return (
    <div className="navigation-overlay">
      {state === 'animating' && (
        <div className="spinner">
          <CameraIcon />
          <span>Navigating...</span>
        </div>
      )}
      {state === 'loading' && (
        <div className="spinner">
          <LoaderIcon />
          <span>Loading cluster...</span>
        </div>
      )}
    </div>
  );
};
```

## Cancellation Patterns

### Cancel In-Progress Animation

```typescript
const cancelAnimation = () => {
  const camera = sigma.getCamera();

  // Stop current animation
  camera.animate(
    camera.getState(), // Animate to current position (immediate stop)
    { duration: 0 }
  );

  setIsAnimating(false);
};
```

### Cancel on User Interaction

```typescript
useEffect(() => {
  const handleWheel = () => {
    if (isAnimating) {
      cancelAnimation();
    }
  };

  const handleMouseDown = () => {
    if (isAnimating) {
      cancelAnimation();
    }
  };

  window.addEventListener('wheel', handleWheel);
  window.addEventListener('mousedown', handleMouseDown);

  return () => {
    window.removeEventListener('wheel', handleWheel);
    window.removeEventListener('mousedown', handleMouseDown);
  };
}, [isAnimating]);
```

**Why:** User manual interaction should override automatic animation.

## Easing Functions

### Available Easing Options

| Easing | Use Case | Motion |
|--------|----------|--------|
| `linear` | Pan-only | Constant velocity |
| `quadIn` | Accelerating zoom | Slow start, fast end |
| `quadOut` | Decelerating zoom | Fast start, slow end |
| `quadInOut` | Smooth zoom + pan | Accelerate then decelerate |
| `cubicInOut` | Dramatic zoom | More pronounced curve |

### Custom Easing

```typescript
const customEasing = (t: number): number => {
  // Custom cubic bezier curve
  return t * t * (3 - 2 * t);
};

camera.animate(
  { x: targetX, y: targetY },
  {
    duration: 500,
    easing: customEasing
  }
);
```

## Layout Coordination

### Wait for Layout Before Animating

```typescript
const drillDownWithLayout = async (cluster: ClusterNode) => {
  // Load data
  const subClusterData = await fetchSubCluster(cluster.id);
  loadClusterData(subClusterData);

  // Start layout
  const layout = graph.getAttribute('layout');
  layout.start();

  // Wait for layout to stabilize
  await new Promise<void>((resolve) => {
    layout.on('stop', () => resolve());
  });

  // NOW animate camera (layout positions are final)
  await animateDrillDown(cluster);
};
```

**Why:** Animating to nodes with unstable positions causes drift.

### Pause Layout During Animation

```typescript
const animateWithLayoutPause = async (cluster: ClusterNode) => {
  const layout = graph.getAttribute('layout');

  // Pause layout if running
  const wasRunning = layout.isRunning();
  if (wasRunning) layout.stop();

  // Animate
  await animateDrillDown(cluster);

  // Resume layout if it was running
  if (wasRunning) layout.start();
};
```

## Testing Animation Timing

### Mock Timer for Tests

```typescript
import { act } from '@testing-library/react';

jest.useFakeTimers();

it('should complete animation after 500ms', async () => {
  const { result } = renderHook(() => useNavigation());

  act(() => {
    result.current.drillDown(mockCluster);
  });

  expect(result.current.isAnimating).toBe(true);

  act(() => {
    jest.advanceTimersByTime(500);
  });

  expect(result.current.isAnimating).toBe(false);
});
```

### Test Debouncing

```typescript
it('should debounce camera updates', async () => {
  const callback = jest.fn();

  const { result } = renderHook(() =>
    useDebouncedCamera(sigma, callback, 150)
  );

  // Fire 10 camera events rapidly
  for (let i = 0; i < 10; i++) {
    act(() => {
      sigma.getCamera().setState({ x: i, y: i, ratio: 1 });
    });
  }

  // Should not call callback yet
  expect(callback).not.toHaveBeenCalled();

  // Wait 150ms
  act(() => {
    jest.advanceTimersByTime(150);
  });

  // Should call once with final value
  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenCalledWith({ x: 9, y: 9, ratio: 1 });
});
```
