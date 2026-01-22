# Advanced Patterns for React Hooks Dependency Management

**Deep-dive into advanced techniques for complex dependency scenarios, including deep comparison, multi-level serialization, and custom hooks.**

---

## Pattern 1: Deep Comparison Hooks

### When to Use

Use deep comparison only when:

- Object has nested structure that can't be flattened
- Object comes from third-party library (can't control structure)
- Restructuring component is infeasible
- Performance profiling shows deep comparison is cheaper than re-render

### Implementation: useDeepCompareEffect

```typescript
import { useEffect, useRef } from 'react';
import fastDeepEqual from 'fast-deep-equal';

function useDeepCompareEffect(
  callback: React.EffectCallback,
  dependencies: React.DependencyList
) {
  const currentDependenciesRef = useRef<React.DependencyList>();

  if (!fastDeepEqual(currentDependenciesRef.current, dependencies)) {
    currentDependenciesRef.current = dependencies;
  }

  useEffect(callback, [currentDependenciesRef.current]);
}

// Usage
function Component({ complexObject }) {
  useDeepCompareEffect(() => {
    console.log('Complex object deeply changed');
    processData(complexObject);
  }, [complexObject]);

  return <div>...</div>;
}
```

### Performance Considerations

**Cost Analysis**:

- Small objects (< 10 properties): 0.1-0.5ms overhead
- Medium objects (10-50 properties): 0.5-2ms overhead
- Large objects (50-100 properties): 2-10ms overhead
- Very large objects (100+ properties): 10-50ms overhead

**When Deep Comparison Hurts Performance**:

```typescript
// ❌ BAD: Object updated frequently, deep comparison expensive
function Component({ largeConfig }) {
  useDeepCompareEffect(() => {
    applyConfig(largeConfig); // Re-render is 5ms, deep compare is 15ms
  }, [largeConfig]);
}

// ✅ BETTER: Restructure to avoid deep comparison
function Component({ configId, configLastModified }) {
  useEffect(() => {
    const config = fetchConfig(configId);
    applyConfig(config);
  }, [configId, configLastModified]); // Primitive dependencies
}
```

---

## Pattern 2: Multi-Level Serialization

### When to Use

Use multi-level serialization for:

- Arrays of objects with stable IDs
- Nested structures with identifiable items
- When order doesn't matter

### Implementation: Hierarchical Serialization

```typescript
// Serialize nested structure with multiple levels
function useSerializedDeps<T extends { id: string; items?: any[] }>(data: T[]): string {
  return useMemo(() => {
    return data
      .map((item) => {
        const baseKey = item.id;
        const itemsKey = item.items
          ? item.items
              .map((i) => i.id)
              .sort()
              .join(",")
          : "";
        return `${baseKey}:${itemsKey}`;
      })
      .sort()
      .join("|");
  }, [data]);
}

// Usage
function Component({ categories }) {
  const categoriesKey = useSerializedDeps(categories);

  useEffect(() => {
    processCategories(categories);
  }, [categoriesKey]);
}
```

### Example: Serializing GraphQL Responses

```typescript
interface GraphQLEdge<T> {
  node: T;
  cursor: string;
}

interface GraphQLConnection<T> {
  edges: GraphQLEdge<T>[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string;
  };
}

function useConnectionKey<T extends { id: string }>(connection: GraphQLConnection<T>): string {
  return useMemo(() => {
    const nodeIds = connection.edges
      .map((edge) => edge.node.id)
      .sort()
      .join(",");
    return `${nodeIds}:${connection.pageInfo.endCursor}`;
  }, [connection]);
}

// Usage with GraphQL data
function Component({ usersConnection }) {
  const usersKey = useConnectionKey(usersConnection);

  useEffect(() => {
    renderUsers(usersConnection.edges.map((e) => e.node));
  }, [usersKey]);
}
```

---

## Pattern 3: Stable Event Handlers with useEvent (RFC Pattern)

### The useEvent Pattern

**Note**: This is a proposed RFC, not yet in React core. Use useRef pattern until official.

```typescript
// useEvent implementation (from React RFC)
function useEvent<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef<T>(callback);

  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback(
    ((...args) => callbackRef.current(...args)) as T,
    []
  );
}

// Usage
function Component({ onUpdate }) {
  const handleUpdate = useEvent(onUpdate);

  useEffect(() => {
    const interval = setInterval(() => {
      handleUpdate(); // Always calls latest onUpdate
    }, 1000);
    return () => clearInterval(interval);
  }, []); // Empty deps, no infinite loop

  return <button onClick={handleUpdate}>Update</button>;
}
```

### Comparison: useCallback vs useEvent

| Aspect                     | useCallback           | useEvent      |
| -------------------------- | --------------------- | ------------- |
| Recreates when deps change | Yes                   | No (never)    |
| Access to latest values    | Via deps              | Always latest |
| Stable reference           | Only when deps stable | Always stable |
| Use in dependency arrays   | Yes                   | Yes           |
| Memory usage               | Medium                | Low           |

---

## Pattern 4: Lazy Dependency Resolution

### When to Use

Use lazy resolution when:

- Dependency computation is expensive
- Dependency doesn't change often
- You can derive stable key from dependency

### Implementation

```typescript
function useLazyDependency<T>(value: T, keyExtractor: (val: T) => string): T {
  const keyRef = useRef<string>();
  const valueRef = useRef<T>(value);

  const currentKey = useMemo(() => keyExtractor(value), [value, keyExtractor]);

  if (keyRef.current !== currentKey) {
    keyRef.current = currentKey;
    valueRef.current = value;
  }

  return valueRef.current;
}

// Usage
function Component({ config }) {
  // Only update stable config when id changes, not when other properties change
  const stableConfig = useLazyDependency(config, (cfg) => cfg.id);

  useEffect(() => {
    applyConfig(stableConfig);
  }, [stableConfig]); // Only changes when id changes
}
```

---

## Pattern 5: Conditional Dependencies

### Problem: Dependencies that only matter sometimes

```typescript
// ❌ BAD: Both dependencies always tracked
function Component({ mode, userConfig, adminConfig }) {
  useEffect(() => {
    if (mode === "user") {
      apply(userConfig);
    } else {
      apply(adminConfig);
    }
  }, [mode, userConfig, adminConfig]); // adminConfig changes trigger effect even in user mode
}
```

### Solution: Split into separate effects

```typescript
// ✅ GOOD: Each effect only tracks relevant dependencies
function Component({ mode, userConfig, adminConfig }) {
  useEffect(() => {
    if (mode === "user") {
      apply(userConfig);
    }
  }, [mode, userConfig]); // Only user dependencies

  useEffect(() => {
    if (mode === "admin") {
      apply(adminConfig);
    }
  }, [mode, adminConfig]); // Only admin dependencies
}
```

---

## Pattern 6: Dependency Batching

### When to Use

Batch updates to reduce effect executions when multiple related dependencies change simultaneously.

### Implementation

```typescript
function useBatchedEffect(callback: () => void, dependencies: any[], delayMs = 100) {
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Batch updates within delay window
    timeoutRef.current = setTimeout(() => {
      callback();
    }, delayMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, dependencies);
}

// Usage: API calls batched when filters change rapidly
function Component({ filters }) {
  useBatchedEffect(
    () => {
      fetchData(filters);
    },
    [filters],
    300
  ); // Wait 300ms after last filter change
}
```

---

## Pattern 7: Memoized Selectors

### Problem: Derived data causing re-renders

```typescript
// ❌ BAD: selectedItems recomputed and new array every render
function Component({ items, selectedIds }) {
  const selectedItems = items.filter((item) => selectedIds.includes(item.id));

  useEffect(() => {
    processSelected(selectedItems);
  }, [selectedItems]); // Infinite loop: selectedItems new array each time
}
```

### Solution: Memoize derived data

```typescript
// ✅ GOOD: Memoized selector
function Component({ items, selectedIds }) {
  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds]
  );

  useEffect(() => {
    processSelected(selectedItems);
  }, [selectedItems]); // Only changes when items or selectedIds change
}
```

---

## Pattern 8: Stable Refs for Frequently Changing Values

### When to Use

Use refs for values that change frequently but shouldn't trigger effects.

### Implementation: Animation with Stable Callback

```typescript
function Component({ velocity, onFrame }) {
  const velocityRef = useRef(velocity);
  const onFrameRef = useRef(onFrame);

  // Keep refs up-to-date without triggering effects
  useLayoutEffect(() => {
    velocityRef.current = velocity;
    onFrameRef.current = onFrame;
  });

  useEffect(() => {
    let rafId: number;

    const animate = () => {
      // Always uses latest velocity and onFrame
      onFrameRef.current(velocityRef.current);
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, []); // Empty deps: effect runs once, refs keep values current

  return <div>Animating...</div>;
}
```

---

## Pattern 9: Dependency Normalization

### Problem: Different structures representing same data

```typescript
// ❌ BAD: Different representations trigger unnecessary effects
function Component({ user }) {
  useEffect(() => {
    // user might be { id, name } or { userId, userName }
    trackUser(user);
  }, [user]); // Triggers even when same user, different structure
}
```

### Solution: Normalize to stable format

```typescript
// ✅ GOOD: Normalize to stable ID
function Component({ user }) {
  const userId = useMemo(() => {
    return user.id || user.userId;
  }, [user]);

  useEffect(() => {
    trackUser(userId);
  }, [userId]); // Only changes when actual user changes
}
```

---

## Pattern 10: Composite Keys for Complex Filters

### Implementation

```typescript
interface Filters {
  search?: string;
  category?: string;
  tags?: string[];
  dateRange?: { start: Date; end: Date };
}

function useFiltersKey(filters: Filters): string {
  return useMemo(() => {
    const parts = [
      filters.search || "",
      filters.category || "",
      filters.tags?.sort().join(",") || "",
      filters.dateRange
        ? `${filters.dateRange.start.toISOString()}:${filters.dateRange.end.toISOString()}`
        : "",
    ];
    return parts.join("|");
  }, [filters]);
}

// Usage
function Component({ filters }) {
  const filtersKey = useFiltersKey(filters);

  useEffect(() => {
    fetchFilteredData(filters);
  }, [filtersKey]);
}
```

---

## Anti-Patterns in Advanced Scenarios

### Anti-Pattern 1: Over-Engineering Simple Dependencies

```typescript
// ❌ OVER-ENGINEERED: Complex serialization for primitive
function Component({ userId }) {
  const userKey = useMemo(() => JSON.stringify({ id: userId }), [userId]);
  useEffect(() => {
    fetchUser(userId);
  }, [userKey]); // userId is already primitive!
}

// ✅ SIMPLE: Use primitive directly
function Component({ userId }) {
  useEffect(() => {
    fetchUser(userId);
  }, [userId]);
}
```

### Anti-Pattern 2: Deep Comparison When Restructuring is Better

```typescript
// ❌ EXPENSIVE: Deep comparison on large object
function Component({ largeConfig }) {
  useDeepCompareEffect(() => {
    applyConfig(largeConfig);
  }, [largeConfig]);
}

// ✅ BETTER: Lift state, pass primitives
function Parent() {
  const [configId, setConfigId] = useState('123');
  return <Child configId={configId} />;
}

function Child({ configId }) {
  useEffect(() => {
    const config = fetchConfig(configId);
    applyConfig(config);
  }, [configId]); // Primitive dependency
}
```

---

## Sources

- React RFC: useEvent Proposal
- Kent C. Dodds: [useDeepCompareEffect](https://github.com/kentcdodds/use-deep-compare-effect)
- fast-deep-equal library
- React Official Docs: Advanced Patterns
- Production codebases: Chariot (useClusterManagement, useViewportCulling)

---

**Last Updated**: 2026-01-14
**Confidence**: 0.90
