# State-Based Guards

**Advanced patterns for checking system state before acting.**

## Core Principle

Before performing an operation, check if other systems are in a compatible state. Don't let systems blindly execute when another needs control.

## When to Use

Use state-based guards when:

- One system needs exclusive access to resources
- Operation validity depends on another system's state
- Multiple systems share mutable data
- Operations should be skipped (not queued) based on conditions

## Basic Pattern

```typescript
const performOperation = () => {
  // GUARD: Check state of dependent system
  const dependentSystem = getDependentSystem();
  if (!dependentSystem.isReady()) {
    return; // Skip operation
  }

  // Safe to proceed
  doOperation();
};
```

## Advanced Patterns

### Pattern: Multi-System Guards

Check multiple systems before proceeding.

```typescript
const updateVisualization = () => {
  // Check all dependent systems
  const layout = graph.getAttribute('layout');
  const animation = graph.getAttribute('animation');
  const userInteraction = interactionManager.getState();

  // Guard: Layout must be stable
  if (layout?.isRunning()) {
    return; // Layout needs all nodes
  }

  // Guard: No animations running
  if (animation?.isActive()) {
    return; // Animation controls timing
  }

  // Guard: No user interaction
  if (userInteraction?.isDragging) {
    return; // User has control
  }

  // All guards passed - safe to update
  performVisualizationUpdate();
};
```

### Pattern: Guard with Fallback

Provide degraded functionality instead of skipping entirely.

```typescript
const renderGraph = () => {
  const layout = graph.getAttribute('layout');

  if (layout?.isRunning()) {
    // Guard failed - use simpler rendering
    renderStaticGraph();
    return;
  }

  // Full rendering safe
  renderDynamicGraph();
};
```

### Pattern: Guard with Deferral

Queue operation for later instead of skipping.

```typescript
const useGuardedOperation = () => {
  const pendingRef = useRef(false);

  const attemptOperation = useCallback(() => {
    if (!systemReady()) {
      pendingRef.current = true;
      return;
    }

    pendingRef.current = false;
    performOperation();
  }, []);

  // Retry when system becomes ready
  useEffect(() => {
    const interval = setInterval(() => {
      if (pendingRef.current && systemReady()) {
        attemptOperation();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [attemptOperation]);

  return { attemptOperation };
};
```

### Pattern: Graduated Guards

Different operations allowed at different readiness levels.

```typescript
enum SystemReadiness {
  INITIALIZING = 0,
  PARTIAL = 1,
  READY = 2,
}

const performOperation = (level: 'read' | 'write' | 'critical') => {
  const readiness = system.getReadinessLevel();

  // Graduated guards based on operation criticality
  if (level === 'critical' && readiness < SystemReadiness.READY) {
    return; // Critical ops require full readiness
  }

  if (level === 'write' && readiness < SystemReadiness.PARTIAL) {
    return; // Writes need partial readiness
  }

  // Reads allowed at any level
  executeOperation();
};
```

## Common Mistakes

### Mistake 1: Race Condition in Guard

❌ **Wrong**: Guard check separated from operation

```typescript
const updateNode = () => {
  const layout = graph.getAttribute('layout');
  if (layout.isRunning()) return;

  // TIME PASSES - layout could start here!
  performExpensiveUpdate();
};
```

✅ **Right**: Atomic guard and operation

```typescript
const updateNode = () => {
  const layout = graph.getAttribute('layout');

  // Lock or mark as "in update" atomically
  if (!layout.acquireUpdateLock()) return;

  try {
    performExpensiveUpdate();
  } finally {
    layout.releaseUpdateLock();
  }
};
```

### Mistake 2: No Guard Logging

Guards silently skip operations - add logging for debugging.

❌ **Wrong**: Silent guard

```typescript
if (system.isBusy()) return;
```

✅ **Right**: Logged guard

```typescript
if (system.isBusy()) {
  console.debug('[Guard] Skipped update - system busy', {
    operation: 'updateNode',
    systemState: system.getState(),
    timestamp: Date.now(),
  });
  return;
}
```

### Mistake 3: Boolean Hell

Too many nested boolean guards become unreadable.

❌ **Wrong**: Nested boolean checks

```typescript
if (!a) {
  if (!b) {
    if (c && !d) {
      if (e || f) {
        // What are we checking?
        doThing();
      }
    }
  }
}
```

✅ **Right**: Named guard functions

```typescript
const canProceed = () => {
  if (!layoutReady()) return false;
  if (!animationIdle()) return false;
  if (!userAllowsUpdate()) return false;
  return true;
};

if (canProceed()) {
  doThing();
}
```

## Testing Strategies

### Test 1: Guard Prevents Operation

Verify operation is skipped when guard fails.

```typescript
test('skips update when layout is running', () => {
  const layout = mockLayout({ isRunning: true });
  graph.setAttribute('layout', layout);

  const spy = vi.spyOn(graph, 'updateNode');
  updateVisualization();

  expect(spy).not.toHaveBeenCalled();
});
```

### Test 2: Guard Allows Operation

Verify operation proceeds when guard passes.

```typescript
test('performs update when layout is idle', () => {
  const layout = mockLayout({ isRunning: false });
  graph.setAttribute('layout', layout);

  const spy = vi.spyOn(graph, 'updateNode');
  updateVisualization();

  expect(spy).toHaveBeenCalled();
});
```

### Test 3: Multi-System Guards

Verify all guards must pass.

```typescript
test('requires all systems idle', () => {
  const layout = mockLayout({ isRunning: false });
  const animation = mockAnimation({ isActive: true }); // Still animating

  graph.setAttribute('layout', layout);
  graph.setAttribute('animation', animation);

  const spy = vi.spyOn(graph, 'updateNode');
  updateVisualization();

  expect(spy).not.toHaveBeenCalled(); // Blocked by animation
});
```

## Performance Considerations

### Lightweight Guards

Guards run frequently - keep them fast.

❌ **Expensive**: Deep state inspection

```typescript
if (JSON.stringify(state) === JSON.stringify(lastState)) return;
```

✅ **Cheap**: Simple property checks

```typescript
if (state.version === lastState.version) return;
```

### Guard Caching

Cache guard results if state changes infrequently.

```typescript
const useGuardCache = (checkFn: () => boolean, deps: any[]) => {
  const cachedResult = useMemo(() => checkFn(), deps);
  return cachedResult;
};

// Only recompute when layout changes
const layoutReady = useGuardCache(
  () => !layout?.isRunning(),
  [layout]
);
```

## Integration with Other Patterns

### Guards + Events

Combine guards with event sequencing for complete coordination.

```typescript
const useCoordinatedUpdate = () => {
  const [canUpdate, setCanUpdate] = useState(false);

  // Event: Wait for layout complete
  useEffect(() => {
    const layout = graph.getAttribute('layout');
    if (!layout) return;

    const checkComplete = () => {
      if (!layout.isRunning()) {
        setCanUpdate(true);
      }
    };

    const interval = setInterval(checkComplete, 100);
    return () => clearInterval(interval);
  }, []);

  // Guard: Check state before update
  const performUpdate = useCallback(() => {
    if (!canUpdate) return; // Guard based on event state

    updateVisualization();
  }, [canUpdate]);

  return { performUpdate };
};
```

### Guards + Mutex

Use guards to decide if lock acquisition is needed.

```typescript
const updateWithGuard = async () => {
  // Guard: Check if lock needed
  const needsLock = systemRequiresExclusiveAccess();

  if (needsLock) {
    await mutex.acquire();
    try {
      performUpdate();
    } finally {
      mutex.release();
    }
  } else {
    // Safe to update without lock
    performUpdate();
  }
};
```

## Related Patterns

- **Event-Based Sequencing** - Guards check current state; events signal when state changes
- **Mutex/Lock Pattern** - Guards decide if locking needed; mutex provides the lock
- **Priority Queuing** - Guards can trigger queue operations instead of skipping

## References

- [React useEffect Dependencies](https://react.dev/reference/react/useEffect#specifying-reactive-dependencies) - Guard pattern foundation
- [JavaScript Proxy Guards](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) - Advanced guard implementation
