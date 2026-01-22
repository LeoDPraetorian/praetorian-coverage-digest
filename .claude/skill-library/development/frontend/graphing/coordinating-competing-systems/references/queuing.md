# Priority Queuing

**Queue operations with priority ordering and dependency management.**

## Core Principle

Queue operations centrally, execute in priority order while respecting dependencies. Don't let operations fight for resources.

## When to Use

Use priority queuing when:

- Multiple operations compete for same resource
- Operations have different priorities
- Dependencies between operations exist
- Need backpressure control (prevent overload)

## Basic Pattern

```typescript
type Operation = {
  id: string;
  priority: number;
  execute: () => void | Promise<void>;
};

const useOperationQueue = () => {
  const queue = useRef<Operation[]>([]);
  const processing = useRef(false);

  const enqueue = useCallback((op: Operation) => {
    queue.current.push(op);
    processQueue();
  }, []);

  const processQueue = useCallback(async () => {
    if (processing.current || queue.current.length === 0) {
      return;
    }

    processing.current = true;

    // Sort by priority (higher first)
    queue.current.sort((a, b) => b.priority - a.priority);

    // Execute highest priority
    const op = queue.current.shift();
    if (op) {
      await op.execute();
    }

    processing.current = false;

    // Process next
    if (queue.current.length > 0) {
      processQueue();
    }
  }, []);

  return { enqueue };
};
```

## Advanced Patterns

### Pattern: Dependency-Aware Queue

Operations can block on other operations.

```typescript
type OperationWithDeps = {
  id: string;
  priority: number;
  execute: () => void | Promise<void>;
  blockedBy?: string[]; // IDs of operations that must complete first
};

const useDependencyQueue = () => {
  const queue = useRef<OperationWithDeps[]>([]);
  const running = useRef<Set<string>>(new Set());
  const completed = useRef<Set<string>>(new Set());

  const canExecute = (op: OperationWithDeps) => {
    // Check if any blocking operations are still running
    if (op.blockedBy) {
      return op.blockedBy.every((id) => !running.current.has(id) && completed.current.has(id));
    }
    return true;
  };

  const processQueue = useCallback(async () => {
    // Sort by priority
    queue.current.sort((a, b) => b.priority - a.priority);

    // Find highest priority operation that can run
    const ready = queue.current.find((op) => canExecute(op));

    if (!ready) return;

    // Remove from queue, add to running
    queue.current = queue.current.filter((op) => op.id !== ready.id);
    running.current.add(ready.id);

    try {
      await ready.execute();
    } finally {
      running.current.delete(ready.id);
      completed.current.add(ready.id);
    }

    // Process next
    if (queue.current.length > 0) {
      processQueue();
    }
  }, []);

  const enqueue = useCallback(
    (op: OperationWithDeps) => {
      queue.current.push(op);
      processQueue();
    },
    [processQueue]
  );

  return { enqueue };
};
```

### Pattern: Priority Levels

Named priority levels instead of arbitrary numbers.

```typescript
enum Priority {
  CRITICAL = 1000, // User-initiated actions
  HIGH = 500, // Important updates
  NORMAL = 100, // Regular operations
  LOW = 10, // Background tasks
  IDLE = 1, // Only when nothing else running
}

type QueuedOperation = {
  id: string;
  priority: Priority;
  execute: () => void | Promise<void>;
};

// Usage
queue.enqueue({
  id: "user-click",
  priority: Priority.CRITICAL,
  execute: handleUserClick,
});

queue.enqueue({
  id: "auto-save",
  priority: Priority.LOW,
  execute: autoSave,
});
```

### Pattern: Debounced Queue

Batch similar operations to reduce churn.

```typescript
const useDebouncedQueue = (debounceMs: number = 300) => {
  const queue = useRef<Map<string, Operation>>(new Map());
  const timeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const enqueue = useCallback(
    (op: Operation) => {
      // Clear existing timeout for this operation type
      const existingTimeout = timeouts.current.get(op.id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Store latest version of operation
      queue.current.set(op.id, op);

      // Schedule execution
      const timeout = setTimeout(() => {
        const latestOp = queue.current.get(op.id);
        if (latestOp) {
          latestOp.execute();
          queue.current.delete(op.id);
        }
        timeouts.current.delete(op.id);
      }, debounceMs);

      timeouts.current.set(op.id, timeout);
    },
    [debounceMs]
  );

  return { enqueue };
};
```

### Pattern: Parallel Queue

Execute multiple operations concurrently up to limit.

```typescript
const useParallelQueue = (concurrency: number = 3) => {
  const queue = useRef<Operation[]>([]);
  const running = useRef<Set<string>>(new Set());

  const processQueue = useCallback(async () => {
    // Execute up to concurrency limit
    while (running.current.size < concurrency && queue.current.length > 0) {
      // Sort by priority
      queue.current.sort((a, b) => b.priority - a.priority);

      const op = queue.current.shift();
      if (!op) break;

      running.current.add(op.id);

      // Execute without awaiting (parallel)
      op.execute()
        .catch((error) => {
          console.error(`Operation ${op.id} failed`, error);
        })
        .finally(() => {
          running.current.delete(op.id);
          processQueue(); // Try to start next
        });
    }
  }, [concurrency]);

  const enqueue = useCallback(
    (op: Operation) => {
      queue.current.push(op);
      processQueue();
    },
    [processQueue]
  );

  return { enqueue, queueSize: queue.current.length };
};
```

## Backpressure Control

Prevent queue from growing unbounded.

### Strategy 1: Size Limit

Drop or reject operations when queue is full.

```typescript
const useBackpressureQueue = (maxSize: number = 100) => {
  const queue = useRef<Operation[]>([]);

  const enqueue = useCallback(
    (op: Operation) => {
      if (queue.current.length >= maxSize) {
        console.warn(`Queue full (${maxSize}), dropping operation ${op.id}`);
        return false;
      }

      queue.current.push(op);
      processQueue();
      return true;
    },
    [maxSize]
  );

  return { enqueue };
};
```

### Strategy 2: Oldest First Drop

Drop lowest priority or oldest operations when full.

```typescript
const enqueueWithEviction = (op: Operation) => {
  if (queue.current.length >= maxSize) {
    // Sort by priority
    queue.current.sort((a, b) => a.priority - b.priority);

    // Drop lowest priority
    const dropped = queue.current.shift();
    console.warn(`Evicted operation ${dropped?.id} for ${op.id}`);
  }

  queue.current.push(op);
  processQueue();
};
```

### Strategy 3: Coalescence

Merge duplicate operations instead of queuing both.

```typescript
const enqueueWithCoalescence = (op: Operation) => {
  // Check if similar operation already queued
  const existing = queue.current.find((qOp) => qOp.type === op.type && qOp.target === op.target);

  if (existing) {
    // Merge operations instead of adding new one
    existing.data = { ...existing.data, ...op.data };
    existing.priority = Math.max(existing.priority, op.priority);
  } else {
    queue.current.push(op);
  }

  processQueue();
};
```

## Testing Strategies

### Test 1: Priority Ordering

Verify highest priority executes first.

```typescript
test("executes operations in priority order", async () => {
  const order: string[] = [];
  const queue = useOperationQueue();

  queue.enqueue({
    id: "low",
    priority: 1,
    execute: () => order.push("low"),
  });
  queue.enqueue({
    id: "high",
    priority: 100,
    execute: () => order.push("high"),
  });
  queue.enqueue({
    id: "medium",
    priority: 50,
    execute: () => order.push("medium"),
  });

  await waitForQueue(queue);

  expect(order).toEqual(["high", "medium", "low"]);
});
```

### Test 2: Dependency Blocking

Verify operations wait for dependencies.

```typescript
test("waits for dependencies", async () => {
  const order: string[] = [];
  const queue = useDependencyQueue();

  queue.enqueue({
    id: "B",
    priority: 100, // Higher priority
    execute: () => order.push("B"),
    blockedBy: ["A"], // But blocked by A
  });

  queue.enqueue({
    id: "A",
    priority: 1, // Lower priority
    execute: () => order.push("A"),
  });

  await waitForQueue(queue);

  expect(order).toEqual(["A", "B"]); // A runs first despite lower priority
});
```

### Test 3: Backpressure

Verify queue rejects when full.

```typescript
test("rejects operations when full", () => {
  const queue = useBackpressureQueue(2);

  expect(queue.enqueue({ id: "1", priority: 1, execute: () => {} })).toBe(true);
  expect(queue.enqueue({ id: "2", priority: 1, execute: () => {} })).toBe(true);
  expect(queue.enqueue({ id: "3", priority: 1, execute: () => {} })).toBe(false); // Rejected
});
```

## Performance Considerations

### Minimize Sort Overhead

Sorting on every operation is expensive.

❌ **Expensive**: Sort entire queue every time

```typescript
const processQueue = () => {
  queue.current.sort((a, b) => b.priority - a.priority); // O(n log n)
  const op = queue.current.shift();
  op.execute();
};
```

✅ **Cheap**: Use priority queue data structure

```typescript
import { MinPriorityQueue } from "@datastructures-js/priority-queue";

const queue = new MinPriorityQueue<Operation>({
  compare: (a, b) => b.priority - a.priority,
});

const processQueue = () => {
  const op = queue.dequeue(); // O(log n)
  op.execute();
};
```

### Batch Processing

Process multiple operations per cycle when possible.

```typescript
const processBatch = async (batchSize: number = 5) => {
  const batch: Operation[] = [];

  // Collect batch
  for (let i = 0; i < batchSize && queue.current.length > 0; i++) {
    batch.push(queue.current.shift()!);
  }

  // Execute batch in parallel
  await Promise.all(batch.map((op) => op.execute()));
};
```

## Common Mistakes

### Mistake 1: Priority Inversion

Low priority operation blocks high priority.

❌ **Wrong**: No consideration for priority of blocked operations

```typescript
// High priority B blocked by low priority A
enqueue({ id: "A", priority: 1, execute: longRunningTask });
enqueue({
  id: "B",
  priority: 100,
  blockedBy: ["A"],
  execute: importantTask,
});
```

✅ **Right**: Boost priority of blocking operations

```typescript
const enqueue = (op: Operation) => {
  // Boost priority of operations that block high-priority ops
  if (op.blockedBy) {
    op.blockedBy.forEach((blockerId) => {
      const blocker = queue.current.find((o) => o.id === blockerId);
      if (blocker) {
        blocker.priority = Math.max(blocker.priority, op.priority);
      }
    });
  }

  queue.current.push(op);
};
```

### Mistake 2: No Timeout

Long-running operations block queue forever.

❌ **Wrong**: No timeout on operation

```typescript
await op.execute(); // Might hang forever
```

✅ **Right**: Timeout wrapper

```typescript
const executeWithTimeout = async (op: Operation, timeout: number = 5000) => {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Operation timeout")), timeout)
  );

  await Promise.race([op.execute(), timeoutPromise]);
};
```

### Mistake 3: Starvation

Low priority operations never execute.

❌ **Wrong**: Always execute highest priority

```typescript
// High priority operations keep arriving
// Low priority never runs
```

✅ **Right**: Age-based priority boost

```typescript
type QueuedOp = Operation & { enqueuedAt: number };

const boostPriority = (op: QueuedOp) => {
  const age = Date.now() - op.enqueuedAt;
  const ageBoost = Math.floor(age / 1000); // +1 priority per second
  return op.priority + ageBoost;
};
```

## Integration with Other Patterns

### Queue + Guards

Guard before queuing to avoid unnecessary work.

```typescript
const enqueueWithGuard = (op: Operation) => {
  // Guard: Check if operation is valid
  if (!systemReady()) {
    console.debug("System not ready, skipping enqueue");
    return;
  }

  queue.enqueue(op);
};
```

### Queue + Sequencing

Queue maintains order, sequencing ensures completion.

```typescript
const useSequencedQueue = () => {
  const [sequenceComplete, setSequenceComplete] = useState(false);

  useEffect(() => {
    // Wait for initial sequence
    runInitialSequence().then(() => setSequenceComplete(true));
  }, []);

  const enqueue = useCallback(
    (op: Operation) => {
      if (!sequenceComplete) {
        // Queue for after sequence
        deferredQueue.current.push(op);
      } else {
        // Execute immediately
        queue.enqueue(op);
      }
    },
    [sequenceComplete]
  );
};
```

## Real-World Examples

### Example: Graph Update Queue

Coordinate graph updates with layout.

```typescript
const useGraphUpdateQueue = (graph: Graph) => {
  const queue = useDependencyQueue();

  const queueUpdate = useCallback(
    (update: GraphUpdate) => {
      const layout = graph.getAttribute("layout");

      queue.enqueue({
        id: `update-${Date.now()}`,
        priority: update.userInitiated ? Priority.HIGH : Priority.NORMAL,
        execute: async () => {
          // Wait for layout if running
          while (layout?.isRunning()) {
            await delay(100);
          }

          applyUpdate(graph, update);
        },
        blockedBy: layout?.isRunning() ? ["layout"] : undefined,
      });
    },
    [graph]
  );

  return { queueUpdate };
};
```

## References

- [Priority Queue Data Structures](https://en.wikipedia.org/wiki/Priority_queue)
- [Backpressure in Node.js](https://nodejs.org/en/docs/guides/backpressuring-in-streams/)
- [React Scheduler](https://github.com/facebook/react/tree/main/packages/scheduler) - React's internal priority queue
