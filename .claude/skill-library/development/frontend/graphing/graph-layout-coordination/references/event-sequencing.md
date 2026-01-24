# Event Sequencing

**Patterns for waiting on completion events before dependent operations.**

## Layout Event Types

Force-directed layout algorithms emit events during their lifecycle:

| Event | Timing | Use Case |
|-------|--------|----------|
| `start` | Layout begins computing | Disable interactions, show spinner |
| `stop` | Layout finishes (natural or manual) | Enable culling, interactions |
| `progress` | Each iteration completes | Update progress bar |
| `converged` | Layout naturally stabilizes | Optional - not all layouts emit |

---

## Basic Event Listener Pattern

```typescript
useEffect(() => {
  const layout = graph.getAttribute('layout');
  if (!layout) return;

  const handleStart = () => {
    setPhase('running');
    setProgress(0);
  };

  const handleProgress = (event: LayoutProgressEvent) => {
    setProgress(event.iteration / settings.iterations);
  };

  const handleStop = () => {
    setPhase('stabilized');
    setProgress(1);
  };

  // Subscribe
  layout.on('start', handleStart);
  layout.on('progress', handleProgress);
  layout.on('stop', handleStop);

  // Cleanup - CRITICAL to prevent memory leaks
  return () => {
    layout.off('start', handleStart);
    layout.off('progress', handleProgress);
    layout.off('stop', handleStop);
  };
}, [graph, settings.iterations]);
```

---

## Sequencing Dependent Operations

### After Layout Completion

```typescript
layout.on('stop', () => {
  // 1. Update phase state
  setPhase('stabilized');

  // 2. Enable culling
  enableCulling();

  // 3. Enable interactions
  enableInteractions();

  // 4. Fit camera to graph bounds
  sigma.getCamera().animatedReset();

  // 5. Trigger any pending operations
  flushPendingOperations();
});
```

### After Progress Threshold

```typescript
layout.on('progress', (event) => {
  const progress = event.iteration / settings.iterations;

  // Enable basic interactions at 50%
  if (progress >= 0.5 && !basicInteractionsEnabled) {
    setBasicInteractionsEnabled(true);
  }

  // Show labels at 80%
  if (progress >= 0.8 && !labelsVisible) {
    setLabelsVisible(true);
  }
});
```

---

## Coordinating Multiple Event Sources

### Layout + Camera Events

```typescript
useEffect(() => {
  const layout = graph.getAttribute('layout');
  const camera = sigma.getCamera();

  // Layout events
  const handleLayoutStart = () => setLayoutPhase('running');
  const handleLayoutStop = () => setLayoutPhase('stabilized');

  // Camera events
  const handleCameraStart = () => {
    if (layoutPhase === 'running') {
      layout.stop();
      setLayoutPhase('paused-for-camera');
    }
  };

  const handleCameraEnd = () => {
    if (layoutPhase === 'paused-for-camera') {
      layout.start();
      setLayoutPhase('running');
    }
  };

  // Subscribe to both
  layout.on('start', handleLayoutStart);
  layout.on('stop', handleLayoutStop);
  camera.on('updated', handleCameraStart);  // Debounce this!
  camera.on('idle', handleCameraEnd);

  return () => {
    layout.off('start', handleLayoutStart);
    layout.off('stop', handleLayoutStop);
    camera.off('updated', handleCameraStart);
    camera.off('idle', handleCameraEnd);
  };
}, [sigma, graph, layoutPhase]);
```

---

## Event Debouncing

Camera events fire 60+ times per second during smooth animations. Always debounce:

```typescript
const debouncedCameraHandler = useMemo(
  () => debounce((event: CameraEvent) => {
    // Handle camera update
  }, 100), // 100ms debounce
  []
);

useEffect(() => {
  const camera = sigma.getCamera();
  camera.on('updated', debouncedCameraHandler);

  return () => {
    camera.off('updated', debouncedCameraHandler);
    debouncedCameraHandler.cancel(); // Cancel pending calls
  };
}, [sigma, debouncedCameraHandler]);
```

---

## Cleanup Patterns

### Basic Cleanup

```typescript
return () => {
  layout.off('start', handleStart);
  layout.off('stop', handleStop);
};
```

### Cleanup with Pending Operations

```typescript
return () => {
  // Remove listeners
  layout.off('start', handleStart);
  layout.off('stop', handleStop);

  // Cancel debounced handlers
  debouncedHandler.cancel();

  // Clear timeouts
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
  }

  // Stop layout if still running
  if (layout.isRunning()) {
    layout.stop();
  }
};
```

---

## Common Mistakes

### Wrong: Forgetting Cleanup

```typescript
// BAD: Memory leak - listeners never removed
useEffect(() => {
  layout.on('stop', handleStop);
}, []);
```

### Wrong: Inline Handler Functions

```typescript
// BAD: New function reference on every render
useEffect(() => {
  layout.on('stop', () => setPhase('stabilized'));
  return () => layout.off('stop', () => setPhase('stabilized')); // Different function!
}, []);
```

### Right: Stable Function References

```typescript
// GOOD: Same function reference for on/off
const handleStop = useCallback(() => setPhase('stabilized'), []);

useEffect(() => {
  layout.on('stop', handleStop);
  return () => layout.off('stop', handleStop);
}, [handleStop]);
```

---

## Debugging Event Issues

```typescript
// Log all layout events
['start', 'stop', 'progress', 'converged'].forEach(event => {
  layout.on(event, (e) => {
    console.log(`Layout event: ${event}`, e);
  });
});

// Log camera events (debounced)
const logCamera = debounce((e) => console.log('Camera:', e), 500);
sigma.getCamera().on('updated', logCamera);
```
