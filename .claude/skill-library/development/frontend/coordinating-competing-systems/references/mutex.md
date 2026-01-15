# Mutex/Lock Pattern

**Prevent concurrent access to shared resources through mutual exclusion.**

## Core Principle

Only one operation can hold the lock at a time. Others wait their turn. Prevents race conditions in critical sections.

## When to Use

Use mutex/lock pattern when:

- Critical sections must not overlap
- Shared mutable state needs protection
- Operations would corrupt data if concurrent
- Need atomic read-modify-write operations

## Basic Pattern

```typescript
const useMutex = () => {
  const locked = useRef(false);
  const waiters = useRef<(() => void)[]>([]);

  const acquire = useCallback((): Promise<void> => {
    if (!locked.current) {
      locked.current = true;
      return Promise.resolve();
    }

    // Queue this waiter
    return new Promise((resolve) => {
      waiters.current.push(resolve);
    });
  }, []);

  const release = useCallback(() => {
    // Wake next waiter
    const next = waiters.current.shift();
    if (next) {
      next(); // Lock stays held
    } else {
      locked.current = false;
    }
  }, []);

  return { acquire, release };
};

// Usage
const mutex = useMutex();

const updateGraph = async () => {
  await mutex.acquire();
  try {
    // Only one update at a time
    await performUpdate();
  } finally {
    mutex.release(); // ALWAYS release in finally
  }
};
```

## Advanced Patterns

### Pattern: Try-Lock (Non-Blocking)

Attempt to acquire without waiting.

```typescript
const useTryLock = () => {
  const locked = useRef(false);

  const tryAcquire = useCallback((): boolean => {
    if (locked.current) {
      return false; // Lock held, don't wait
    }

    locked.current = true;
    return true; // Got the lock
  }, []);

  const release = useCallback(() => {
    locked.current = false;
  }, []);

  return { tryAcquire, release };
};

// Usage: Skip operation if can't get lock immediately
const tryUpdate = () => {
  if (!lock.tryAcquire()) {
    console.debug('Update skipped - lock held');
    return;
  }

  try {
    performUpdate();
  } finally {
    lock.release();
  }
};
```

### Pattern: Timed Lock

Wait for lock with timeout.

```typescript
const useTimedLock = () => {
  const locked = useRef(false);
  const waiters = useRef<Array<{ resolve: () => void; reject: () => void }>>(
    []
  );

  const acquire = useCallback((timeoutMs: number = 5000): Promise<void> => {
    if (!locked.current) {
      locked.current = true;
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        // Remove from waiters
        const index = waiters.current.findIndex((w) => w.reject === reject);
        if (index >= 0) {
          waiters.current.splice(index, 1);
        }
        reject(new Error('Lock timeout'));
      }, timeoutMs);

      waiters.current.push({
        resolve: () => {
          clearTimeout(timeoutId);
          resolve();
        },
        reject,
      });
    });
  }, []);

  const release = useCallback(() => {
    const next = waiters.current.shift();
    if (next) {
      next.resolve();
    } else {
      locked.current = false;
    }
  }, []);

  return { acquire, release };
};
```

### Pattern: Read-Write Lock

Multiple readers, single writer.

```typescript
const useReadWriteLock = () => {
  const readers = useRef(0);
  const writer = useRef(false);
  const waitingWriters = useRef<(() => void)[]>([]);
  const waitingReaders = useRef<(() => void)[]>([]);

  const acquireRead = useCallback((): Promise<void> => {
    // Can read if no writer
    if (!writer.current && waitingWriters.current.length === 0) {
      readers.current++;
      return Promise.resolve();
    }

    // Wait for writer to finish
    return new Promise((resolve) => {
      waitingReaders.current.push(resolve);
    });
  }, []);

  const releaseRead = useCallback(() => {
    readers.current--;

    // Last reader? Wake waiting writers
    if (readers.current === 0 && waitingWriters.current.length > 0) {
      const next = waitingWriters.current.shift()!;
      writer.current = true;
      next();
    }
  }, []);

  const acquireWrite = useCallback((): Promise<void> => {
    // Can write if no readers or writers
    if (readers.current === 0 && !writer.current) {
      writer.current = true;
      return Promise.resolve();
    }

    // Wait for all readers and writers to finish
    return new Promise((resolve) => {
      waitingWriters.current.push(resolve);
    });
  }, []);

  const releaseWrite = useCallback(() => {
    writer.current = false;

    // Wake all waiting readers first
    if (waitingReaders.current.length > 0) {
      const allReaders = waitingReaders.current.splice(0);
      readers.current = allReaders.length;
      allReaders.forEach((resolve) => resolve());
    }
    // Or wake next writer
    else if (waitingWriters.current.length > 0) {
      const next = waitingWriters.current.shift()!;
      writer.current = true;
      next();
    }
  }, []);

  return { acquireRead, releaseRead, acquireWrite, releaseWrite };
};

// Usage
const rwLock = useReadWriteLock();

const readGraph = async () => {
  await rwLock.acquireRead();
  try {
    return graph.getData(); // Multiple readers OK
  } finally {
    rwLock.releaseRead();
  }
};

const updateGraph = async () => {
  await rwLock.acquireWrite();
  try {
    graph.setData(newData); // Exclusive write
  } finally {
    rwLock.releaseWrite();
  }
};
```

### Pattern: Reentrant Lock

Same owner can acquire multiple times.

```typescript
const useReentrantLock = () => {
  const owner = useRef<string | null>(null);
  const count = useRef(0);
  const waiters = useRef<
    Array<{ id: string; resolve: () => void }>
  >([]);

  const acquire = useCallback((ownerId: string): Promise<void> => {
    // Already own the lock
    if (owner.current === ownerId) {
      count.current++;
      return Promise.resolve();
    }

    // Lock is free
    if (owner.current === null) {
      owner.current = ownerId;
      count.current = 1;
      return Promise.resolve();
    }

    // Wait for lock
    return new Promise((resolve) => {
      waiters.current.push({ id: ownerId, resolve });
    });
  }, []);

  const release = useCallback((ownerId: string) => {
    if (owner.current !== ownerId) {
      throw new Error('Not lock owner');
    }

    count.current--;

    // Still holding lock (nested acquire)
    if (count.current > 0) {
      return;
    }

    // Release lock
    owner.current = null;

    // Wake next waiter
    const next = waiters.current.shift();
    if (next) {
      owner.current = next.id;
      count.current = 1;
      next.resolve();
    }
  }, []);

  return { acquire, release };
};

// Usage: Nested locks work
const reentrantLock = useReentrantLock();
const taskId = 'task-123';

const outerOperation = async () => {
  await reentrantLock.acquire(taskId);
  try {
    await innerOperation(); // Can acquire again
  } finally {
    reentrantLock.release(taskId);
  }
};

const innerOperation = async () => {
  await reentrantLock.acquire(taskId); // Same owner, no wait
  try {
    performUpdate();
  } finally {
    reentrantLock.release(taskId);
  }
};
```

## Deadlock Prevention

Deadlocks occur when two operations wait for each other's locks.

### Strategy 1: Lock Ordering

Always acquire locks in the same order.

```typescript
// ❌ DEADLOCK RISK
// Task A: locks [1] then [2]
// Task B: locks [2] then [1]

// ✅ SAFE: Always lock in order
const acquireMultiple = async (locks: Mutex[]) => {
  // Sort locks by ID to ensure consistent order
  const sorted = [...locks].sort((a, b) => a.id.localeCompare(b.id));

  for (const lock of sorted) {
    await lock.acquire();
  }
};
```

### Strategy 2: Try-Lock with Backoff

Try to acquire, back off if fail.

```typescript
const acquireWithBackoff = async (locks: Mutex[]) => {
  while (true) {
    const acquired: Mutex[] = [];

    try {
      // Try to acquire all
      for (const lock of locks) {
        if (!lock.tryAcquire()) {
          throw new Error('Could not acquire all locks');
        }
        acquired.push(lock);
      }

      // Got all locks
      return;
    } catch {
      // Release what we got
      acquired.forEach((lock) => lock.release());

      // Random backoff before retry
      await delay(Math.random() * 100);
    }
  }
};
```

### Strategy 3: Timeout

Release all locks if can't acquire within timeout.

```typescript
const acquireWithTimeout = async (
  locks: Mutex[],
  timeoutMs: number = 5000
) => {
  const acquired: Mutex[] = [];
  const startTime = Date.now();

  try {
    for (const lock of locks) {
      const remaining = timeoutMs - (Date.now() - startTime);
      if (remaining <= 0) {
        throw new Error('Timeout acquiring locks');
      }

      await lock.acquire(remaining);
      acquired.push(lock);
    }
  } catch (error) {
    // Release acquired locks
    acquired.forEach((lock) => lock.release());
    throw error;
  }
};
```

## Testing Strategies

### Test 1: Mutual Exclusion

Verify only one operation in critical section.

```typescript
test('prevents concurrent access', async () => {
  const mutex = useMutex();
  const inCriticalSection = { count: 0 };

  const task = async () => {
    await mutex.acquire();
    try {
      inCriticalSection.count++;
      expect(inCriticalSection.count).toBe(1); // Only one!

      await delay(10);

      inCriticalSection.count--;
    } finally {
      mutex.release();
    }
  };

  // Run 10 tasks concurrently
  await Promise.all(Array.from({ length: 10 }, () => task()));
});
```

### Test 2: FIFO Ordering

Verify waiters wake in order.

```typescript
test('wakes waiters in FIFO order', async () => {
  const mutex = useMutex();
  const order: number[] = [];

  await mutex.acquire(); // Hold lock

  // Queue 3 waiters
  const tasks = [1, 2, 3].map(async (id) => {
    await mutex.acquire();
    order.push(id);
    mutex.release();
  });

  // Release after waiters queue
  await delay(10);
  mutex.release();

  await Promise.all(tasks);

  expect(order).toEqual([1, 2, 3]); // FIFO
});
```

### Test 3: Deadlock Detection

Verify deadlock prevention strategies work.

```typescript
test('prevents deadlock with lock ordering', async () => {
  const lock1 = useMutex();
  const lock2 = useMutex();

  const taskA = async () => {
    await acquireMultiple([lock1, lock2]); // Ordered
    try {
      await delay(10);
    } finally {
      lock2.release();
      lock1.release();
    }
  };

  const taskB = async () => {
    await acquireMultiple([lock1, lock2]); // Same order
    try {
      await delay(10);
    } finally {
      lock2.release();
      lock1.release();
    }
  };

  // Should complete without deadlock
  await Promise.race([
    Promise.all([taskA(), taskB()]),
    delay(5000).then(() => {
      throw new Error('Deadlock detected');
    }),
  ]);
});
```

## Performance Considerations

### Minimize Lock Duration

Hold locks for shortest time possible.

❌ **Wrong**: Long critical section

```typescript
await mutex.acquire();
try {
  const data = await fetchData(); // Slow I/O!
  processData(data);
  await saveData(data); // More slow I/O!
} finally {
  mutex.release();
}
```

✅ **Right**: Short critical section

```typescript
const data = await fetchData(); // Before lock

await mutex.acquire();
try {
  processData(data); // Only fast work in critical section
} finally {
  mutex.release();
}

await saveData(data); // After lock
```

### Lock Granularity

Use multiple locks for independent resources.

❌ **Coarse**: One lock for everything

```typescript
const globalLock = useMutex();

// Updating graph nodes blocks updating edges!
await globalLock.acquire();
updateNodes();
globalLock.release();
```

✅ **Fine**: Separate locks for independent resources

```typescript
const nodeLock = useMutex();
const edgeLock = useMutex();

// Can update nodes and edges concurrently
await nodeLock.acquire();
updateNodes();
nodeLock.release();

await edgeLock.acquire();
updateEdges();
edgeLock.release();
```

## Common Mistakes

### Mistake 1: Missing Finally

Lock not released on exception.

❌ **Wrong**: No finally

```typescript
await mutex.acquire();
performUpdate(); // Throws error - lock never released!
mutex.release();
```

✅ **Right**: Always use finally

```typescript
await mutex.acquire();
try {
  performUpdate();
} finally {
  mutex.release(); // Always releases
}
```

### Mistake 2: Releasing Wrong Lock

Releasing lock you don't own.

❌ **Wrong**: Mismatch

```typescript
await lock1.acquire();
try {
  performUpdate();
} finally {
  lock2.release(); // Wrong lock!
}
```

✅ **Right**: Release what you acquired

```typescript
await lock1.acquire();
try {
  performUpdate();
} finally {
  lock1.release(); // Correct lock
}
```

### Mistake 3: Recursive Lock Without Reentrant

Nested acquire without reentrant support deadlocks.

❌ **Wrong**: Non-reentrant lock, nested acquire

```typescript
const mutex = useMutex(); // Not reentrant

const outer = async () => {
  await mutex.acquire();
  try {
    await inner(); // Deadlock! Waiting for self
  } finally {
    mutex.release();
  }
};

const inner = async () => {
  await mutex.acquire(); // Blocks forever
  performUpdate();
  mutex.release();
};
```

✅ **Right**: Use reentrant lock

```typescript
const reentrantLock = useReentrantLock();

const outer = async () => {
  await reentrantLock.acquire('task-id');
  try {
    await inner(); // OK, same owner
  } finally {
    reentrantLock.release('task-id');
  }
};
```

## Integration with Other Patterns

### Mutex + Guards

Guard checks before attempting lock.

```typescript
const updateWithGuard = async () => {
  // Guard: Check if update needed
  if (!needsUpdate()) {
    return; // Skip lock entirely
  }

  await mutex.acquire();
  try {
    performUpdate();
  } finally {
    mutex.release();
  }
};
```

### Mutex + Queuing

Queue holds operations, mutex protects execution.

```typescript
const useQueuedMutex = () => {
  const mutex = useMutex();
  const queue = useRef<Operation[]>([]);

  const enqueue = useCallback(async (op: Operation) => {
    queue.current.push(op);

    await mutex.acquire();
    try {
      const current = queue.current.shift();
      if (current) {
        await current.execute();
      }
    } finally {
      mutex.release();
    }
  }, []);

  return { enqueue };
};
```

## Real-World Examples

### Example: Graph State Protection

Protect graph state during updates.

```typescript
const useGraphMutex = (graph: Graph) => {
  const mutex = useMutex();

  const updateNodes = useCallback(
    async (updates: NodeUpdate[]) => {
      await mutex.acquire();
      try {
        updates.forEach((update) => {
          graph.updateNodeAttribute(update.id, update.attr, update.value);
        });
      } finally {
        mutex.release();
      }
    },
    [graph]
  );

  const updateEdges = useCallback(
    async (updates: EdgeUpdate[]) => {
      await mutex.acquire();
      try {
        updates.forEach((update) => {
          graph.updateEdgeAttribute(update.id, update.attr, update.value);
        });
      } finally {
        mutex.release();
      }
    },
    [graph]
  );

  return { updateNodes, updateEdges };
};
```

### Example: Async Counter

Protect shared counter from races.

```typescript
const useAtomicCounter = () => {
  const mutex = useMutex();
  const count = useRef(0);

  const increment = useCallback(async () => {
    await mutex.acquire();
    try {
      // Read-modify-write is atomic
      const current = count.current;
      await delay(10); // Simulate async work
      count.current = current + 1;
    } finally {
      mutex.release();
    }
  }, []);

  return { increment, getCount: () => count.current };
};
```

## References

- [Mutex (Wikipedia)](https://en.wikipedia.org/wiki/Mutual_exclusion)
- [Deadlock Prevention](https://en.wikipedia.org/wiki/Deadlock_prevention_algorithms)
- [Lock-Free Programming](https://preshing.com/20120612/an-introduction-to-lock-free-programming/) - Alternative to locks
