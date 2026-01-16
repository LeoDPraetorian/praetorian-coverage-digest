# Event-Based Sequencing

**Coordinating system execution order through events and state transitions.**

## Core Principle

Wait for explicit completion signals before starting dependent operations. Don't rely on timing assumptions.

## When to Use

Use event-based sequencing when:

- System B depends on System A completing fully
- Operations must execute in strict order
- Implicit timing creates race conditions
- State transitions signal readiness

## Basic Pattern

```typescript
const useSequencedOperations = () => {
  const [stepComplete, setStepComplete] = useState(false);

  // Step 1: Wait for first operation
  useEffect(() => {
    const checkComplete = () => {
      if (firstOperation.isDone()) {
        setStepComplete(true);
      }
    };

    const interval = setInterval(checkComplete, 100);
    return () => clearInterval(interval);
  }, []);

  // Step 2: Run only after step 1
  useEffect(() => {
    if (!stepComplete) return;

    performSecondOperation();
  }, [stepComplete]);
};
```

## Advanced Patterns

### Pattern: Event Listener Sequencing

Use native events when available instead of polling.

```typescript
const useEventSequencing = (graph: Graph) => {
  const [layoutComplete, setLayoutComplete] = useState(false);

  useEffect(() => {
    const layout = graph.getAttribute('layout');
    if (!layout) return;

    // Listen for completion event
    const handleComplete = () => {
      setLayoutComplete(true);
    };

    layout.on('complete', handleComplete);

    return () => {
      layout.off('complete', handleComplete);
    };
  }, [graph]);

  // Only enable dependent feature after event
  useViewportCulling({
    graph,
    enabled: layoutComplete,
  });
};
```

### Pattern: Promise Chain Sequencing

Chain async operations with explicit dependencies.

```typescript
const sequenceOperations = async () => {
  try {
    // Step 1: Initialize
    await initializeSystem();

    // Step 2: Load data (depends on init)
    await loadData();

    // Step 3: Render (depends on data)
    await renderVisualization();

    // Step 4: Enable interactions (depends on render)
    enableUserInteractions();
  } catch (error) {
    handleSequenceError(error);
  }
};
```

### Pattern: State Machine Sequencing

Explicit state machine for complex sequences.

```typescript
enum SystemState {
  IDLE = 'idle',
  LOADING = 'loading',
  LAYOUTING = 'layouting',
  RENDERING = 'rendering',
  READY = 'ready',
}

type StateTransition = {
  from: SystemState;
  to: SystemState;
  action: () => Promise<void>;
};

const useStateMachine = () => {
  const [state, setState] = useState<SystemState>(SystemState.IDLE);

  const transitions: StateTransition[] = [
    {
      from: SystemState.IDLE,
      to: SystemState.LOADING,
      action: async () => {
        await loadData();
      },
    },
    {
      from: SystemState.LOADING,
      to: SystemState.LAYOUTING,
      action: async () => {
        await runLayout();
      },
    },
    {
      from: SystemState.LAYOUTING,
      to: SystemState.RENDERING,
      action: async () => {
        await renderGraph();
      },
    },
    {
      from: SystemState.RENDERING,
      to: SystemState.READY,
      action: async () => {
        enableInteractions();
      },
    },
  ];

  const transition = useCallback(
    async (to: SystemState) => {
      const validTransition = transitions.find(
        (t) => t.from === state && t.to === to
      );

      if (!validTransition) {
        console.error(`Invalid transition from ${state} to ${to}`);
        return;
      }

      await validTransition.action();
      setState(to);
    },
    [state]
  );

  return { state, transition };
};
```

### Pattern: Dependency Graph Sequencing

Topological sort for complex dependencies.

```typescript
type Operation = {
  id: string;
  execute: () => Promise<void>;
  dependencies: string[];
};

const executeInOrder = async (operations: Operation[]) => {
  const completed = new Set<string>();
  const inProgress = new Set<string>();

  const canExecute = (op: Operation) => {
    return op.dependencies.every((dep) => completed.has(dep));
  };

  const executeOp = async (op: Operation) => {
    if (completed.has(op.id) || inProgress.has(op.id)) {
      return;
    }

    if (!canExecute(op)) {
      throw new Error(`Dependencies not met for ${op.id}`);
    }

    inProgress.add(op.id);
    await op.execute();
    inProgress.delete(op.id);
    completed.add(op.id);
  };

  // Execute all operations respecting dependencies
  while (completed.size < operations.length) {
    const ready = operations.filter(
      (op) => !completed.has(op.id) && canExecute(op)
    );

    if (ready.length === 0) {
      throw new Error('Circular dependency detected');
    }

    // Execute all ready operations in parallel
    await Promise.all(ready.map(executeOp));
  }
};
```

## Polling Strategies

When events aren't available, polling is necessary. Do it right.

### Strategy 1: Exponential Backoff

Start fast, slow down over time.

```typescript
const pollWithBackoff = async (
  checkFn: () => boolean,
  maxWait: number = 5000
) => {
  let interval = 50; // Start at 50ms
  let elapsed = 0;

  while (elapsed < maxWait) {
    if (checkFn()) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
    elapsed += interval;

    // Double interval each time, max 1000ms
    interval = Math.min(interval * 2, 1000);
  }

  return false; // Timeout
};
```

### Strategy 2: Adaptive Polling

Adjust rate based on how close we are to completion.

```typescript
const pollAdaptive = async (getProgress: () => number) => {
  while (true) {
    const progress = getProgress();

    if (progress >= 1.0) {
      return true; // Complete
    }

    // Poll faster when close to completion
    const interval = progress > 0.9 ? 50 : progress > 0.5 ? 200 : 500;

    await new Promise((resolve) => setTimeout(resolve, interval));
  }
};
```

### Strategy 3: Polling with Timeout

Prevent infinite polling loops.

```typescript
const usePollWithTimeout = (
  checkFn: () => boolean,
  interval: number = 100,
  timeout: number = 5000
) => {
  const [complete, setComplete] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const startTime = Date.now();

    const intervalId = setInterval(() => {
      if (checkFn()) {
        setComplete(true);
        clearInterval(intervalId);
        return;
      }

      if (Date.now() - startTime > timeout) {
        setTimedOut(true);
        clearInterval(intervalId);
      }
    }, interval);

    return () => clearInterval(intervalId);
  }, [checkFn, interval, timeout]);

  return { complete, timedOut };
};
```

## Error Handling

Sequences can fail at any step. Handle it gracefully.

### Pattern: Rollback on Failure

Undo completed steps if later step fails.

```typescript
const sequenceWithRollback = async () => {
  const completedSteps: Array<() => Promise<void>> = [];

  try {
    // Step 1
    await performStep1();
    completedSteps.push(undoStep1);

    // Step 2
    await performStep2();
    completedSteps.push(undoStep2);

    // Step 3
    await performStep3();
    completedSteps.push(undoStep3);
  } catch (error) {
    // Rollback in reverse order
    for (const undo of completedSteps.reverse()) {
      try {
        await undo();
      } catch (rollbackError) {
        console.error('Rollback failed', rollbackError);
      }
    }
    throw error;
  }
};
```

### Pattern: Retry Failed Steps

Retry with exponential backoff before failing.

```typescript
const retryStep = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> => {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};

const sequenceWithRetry = async () => {
  await retryStep(() => performStep1());
  await retryStep(() => performStep2());
  await retryStep(() => performStep3());
};
```

## Testing Strategies

### Test 1: Sequence Order

Verify operations execute in correct order.

```typescript
test('executes operations in sequence', async () => {
  const order: string[] = [];

  const ops = [
    { id: 'A', execute: async () => order.push('A'), dependencies: [] },
    { id: 'B', execute: async () => order.push('B'), dependencies: ['A'] },
    { id: 'C', execute: async () => order.push('C'), dependencies: ['B'] },
  ];

  await executeInOrder(ops);

  expect(order).toEqual(['A', 'B', 'C']);
});
```

### Test 2: Parallel Execution

Independent operations can run in parallel.

```typescript
test('executes independent operations in parallel', async () => {
  const order: string[] = [];
  const timestamps: Record<string, number> = {};

  const ops = [
    {
      id: 'A',
      execute: async () => {
        timestamps['A'] = Date.now();
        await delay(100);
      },
      dependencies: [],
    },
    {
      id: 'B',
      execute: async () => {
        timestamps['B'] = Date.now();
        await delay(100);
      },
      dependencies: [],
    },
  ];

  await executeInOrder(ops);

  // Both should start at roughly the same time
  expect(Math.abs(timestamps['A'] - timestamps['B'])).toBeLessThan(50);
});
```

### Test 3: Event Sequencing

Verify event-based transitions work.

```typescript
test('waits for completion event', async () => {
  const { result } = renderHook(() => useEventSequencing(mockGraph));

  expect(result.current.layoutComplete).toBe(false);

  // Simulate layout completion event
  act(() => {
    mockLayout.emit('complete');
  });

  await waitFor(() => {
    expect(result.current.layoutComplete).toBe(true);
  });
});
```

## Performance Considerations

### Minimize Polling Overhead

Polling adds CPU cost - optimize it.

```typescript
// ❌ Expensive: Check complex condition frequently
setInterval(() => {
  if (JSON.stringify(state) === JSON.stringify(targetState)) {
    complete();
  }
}, 16); // Every frame!

// ✅ Cheap: Check simple flag less frequently
setInterval(() => {
  if (state.isDone) {
    complete();
  }
}, 100); // Every 100ms
```

### Debounce State Changes

Avoid triggering sequences too frequently.

```typescript
const useDebounceSequence = (trigger: boolean, delay: number = 300) => {
  const [debouncedTrigger, setDebouncedTrigger] = useState(trigger);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedTrigger(trigger);
    }, delay);

    return () => clearTimeout(timeout);
  }, [trigger, delay]);

  return debouncedTrigger;
};
```

## Common Mistakes

### Mistake 1: Implicit Timing

❌ **Wrong**: Assume operation takes fixed time

```typescript
await startOperation();
await delay(1000); // Hope it's done!
nextOperation();
```

✅ **Right**: Wait for explicit completion

```typescript
await startOperation();
await waitForCompletion(); // Poll or listen for event
nextOperation();
```

### Mistake 2: No Timeout

Polling without timeout can hang forever.

❌ **Wrong**: Poll indefinitely

```typescript
while (!isDone()) {
  await delay(100);
}
```

✅ **Right**: Add timeout

```typescript
const startTime = Date.now();
while (!isDone()) {
  if (Date.now() - startTime > 5000) {
    throw new Error('Operation timeout');
  }
  await delay(100);
}
```

### Mistake 3: Race in Event Listener

Event might fire before listener is attached.

❌ **Wrong**: Add listener after operation starts

```typescript
startOperation();
operation.on('complete', handleComplete); // Might miss event!
```

✅ **Right**: Add listener before starting

```typescript
operation.on('complete', handleComplete);
startOperation();
```

## Integration with Other Patterns

### Sequencing + Guards

Combine for complete coordination.

```typescript
const useCoordinatedSequence = () => {
  const [step, setStep] = useState(1);

  useEffect(() => {
    // Sequence: Wait for layout
    if (step === 1 && layoutComplete()) {
      setStep(2);
    }
  }, [step]);

  const performUpdate = useCallback(() => {
    // Guard: Only at step 2
    if (step !== 2) return;

    updateVisualization();
  }, [step]);
};
```

### Sequencing + Queuing

Queue operations that depend on sequence completion.

```typescript
const useSequencedQueue = () => {
  const [sequenceReady, setSequenceReady] = useState(false);
  const queue = useRef<Operation[]>([]);

  // Wait for sequence
  useEffect(() => {
    const complete = async () => {
      await runSequence();
      setSequenceReady(true);
    };
    complete();
  }, []);

  // Process queue after sequence
  useEffect(() => {
    if (!sequenceReady) return;

    queue.current.forEach((op) => op.execute());
    queue.current = [];
  }, [sequenceReady]);
};
```

## References

- [React useEffect Timing](https://react.dev/reference/react/useEffect#timing-of-effects) - Foundation for sequencing
- [Async/Await Best Practices](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Promises) - Promise sequencing
- [State Machine Pattern](https://en.wikipedia.org/wiki/Finite-state_machine) - Formal state transitions
