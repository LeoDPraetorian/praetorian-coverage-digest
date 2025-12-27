# useInfiniteQuery Re-execution Patterns

**Critical patterns for re-executing infinite queries without race conditions.**

---

## Overview

Re-executing an existing `useInfiniteQuery` with the same parameters requires careful handling. The common patterns that work for `useQuery` can cause race conditions and unexpected behavior with infinite queries.

**Key Insight**: Infinite queries have accumulated state (multiple pages) that must be handled correctly during re-execution.

---

## The Core Problem

When you need to re-run an infinite query with the same parameters (e.g., "Run Query" button clicked again), several intuitive approaches fail:

| Approach                               | Problem                                   |
| -------------------------------------- | ----------------------------------------- |
| Toggle `enabled: false -> true`        | Race conditions, timing issues            |
| `queryClient.invalidateQueries()` only | May not trigger refetch if already stale  |
| `queryClient.resetQueries()`           | Clears data but doesn't guarantee refetch |
| Set new query key                      | Works but loses cache benefits            |

---

## Pattern 1: Use refetch() for Same-Parameter Re-execution

**When to use**: Re-running the same query (e.g., user clicks "Run Query" again with same filters).

```typescript
function QueryBuilder() {
  const [filters, setFilters] = useState<Filters | null>(null);

  const infiniteQuery = useInfiniteQuery({
    queryKey: ['entities', filters],
    queryFn: ({ pageParam }) => fetchEntities({ ...filters, cursor: pageParam }),
    enabled: !!filters,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const handleRunQuery = async (newFilters: Filters) => {
    // Case 1: New filters - set state, query auto-runs
    if (!isEqual(newFilters, filters)) {
      setFilters(newFilters);
      return;
    }

    // Case 2: Same filters - use refetch()
    if (filters && infiniteQuery.data) {
      await infiniteQuery.refetch();
    } else {
      // Case 3: First run - set filters to enable
      setFilters(newFilters);
    }
  };

  return (
    <div>
      <QueryFilters onRun={handleRunQuery} />
      {infiniteQuery.isLoading && <LoadingSkeleton />}
      {infiniteQuery.data && <ResultsTable data={infiniteQuery.data.pages} />}
    </div>
  );
}
```

**Why this works**:

- `refetch()` resets all pages and fetches fresh from page 1
- No timing races from toggling `enabled`
- Query key stays stable (cache coordination works)

---

## Pattern 2: Avoid enabled Flag Toggling

**Anti-pattern**: Toggling `enabled` to force re-execution.

```typescript
// WRONG: Causes race conditions
const [shouldFetch, setShouldFetch] = useState(false);

const handleRun = () => {
  setShouldFetch(false);
  // Wait for state update...
  setTimeout(() => setShouldFetch(true), 0); // Race condition!
};

const query = useInfiniteQuery({
  queryKey: ["data"],
  queryFn: fetchData,
  enabled: shouldFetch, // Toggling this is problematic
});
```

**Problems**:

1. React state batching can skip the `false` state
2. Query may not see the `enabled: false` before `true`
3. TanStack Query's internal state machine gets confused
4. Results in duplicate fetches or no fetch at all

**Correct approach**:

```typescript
// RIGHT: Use enabled for initial gating, refetch() for re-runs
const [filters, setFilters] = useState<Filters | null>(null);

const query = useInfiniteQuery({
  queryKey: ["data", filters],
  queryFn: fetchData,
  enabled: !!filters, // Only gates INITIAL fetch
});

const handleRun = async (newFilters: Filters) => {
  if (isEqual(newFilters, filters) && query.data) {
    // Same parameters - use refetch
    await query.refetch();
  } else {
    // Different parameters - update state
    setFilters(newFilters);
  }
};
```

---

## Pattern 3: Completion Guards for Async Queries

**When to use**: You need to know when a query completes to perform side effects (e.g., update UI state, navigate).

**Problem**: `isLoading` state updates can be missed if query is fast, and closure values can be stale.

```typescript
function useQueryWithCompletion(onComplete: (data: Data) => void) {
  const hasCompletedRef = useRef(false);

  const query = useInfiniteQuery({
    queryKey: ["data"],
    queryFn: fetchData,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  // Reset completion guard when loading starts
  useEffect(() => {
    if (query.isLoading || query.isFetching) {
      hasCompletedRef.current = false;
    }
  }, [query.isLoading, query.isFetching]);

  // Detect completion
  useEffect(() => {
    if (!query.isLoading && !query.isFetching && query.data && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onComplete(query.data);
    }
  }, [query.isLoading, query.isFetching, query.data, onComplete]);

  // Manual reset for re-runs
  const resetCompletionGuard = useCallback(() => {
    hasCompletedRef.current = false;
  }, []);

  return { ...query, resetCompletionGuard };
}
```

**Usage**:

```typescript
function QueryBuilder() {
  const { data, refetch, resetCompletionGuard } = useQueryWithCompletion((data) => {
    toast.success(`Found ${data.pages[0].totalCount} results`);
  });

  const handleRun = async () => {
    resetCompletionGuard(); // CRITICAL: Reset before triggering
    await refetch();
  };
}
```

---

## Pattern 4: Avoiding Stale Closures with Zustand

**Problem**: Callback handlers can capture stale values from React hook closures.

```typescript
// WRONG: Stale closure
const { filters, setResults } = useMyStore(); // Hook captures current value

const handleComplete = useCallback(
  (data) => {
    // `filters` here may be STALE - captured when callback was created
    console.log("Completed with filters:", filters); // Wrong value!
    setResults(data);
  },
  [filters, setResults]
); // Even with dependencies, can be stale
```

**Correct approach**: Read fresh state from Zustand store.

```typescript
// RIGHT: Read fresh state
const handleComplete = useCallback((data) => {
  // Get fresh state directly from store
  const { filters, setResults } = useMyStore.getState();

  console.log("Completed with filters:", filters); // Correct current value
  setResults(data);
}, []); // No dependencies needed - always reads fresh
```

**Complete pattern with useInfiniteQuery**:

```typescript
import { useMyStore } from "@/stores/myStore";

function QueryResults() {
  // Get stable actions from store
  const setQueryResults = useMyStore((state) => state.setQueryResults);

  const query = useInfiniteQuery({
    queryKey: ["search", useMyStore.getState().searchFilters],
    queryFn: async ({ pageParam }) => {
      // Read fresh filters at fetch time
      const filters = useMyStore.getState().searchFilters;
      return fetchResults({ ...filters, cursor: pageParam });
    },
    enabled: false,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  // Handle completion with fresh state
  useEffect(() => {
    if (query.data && !query.isFetching) {
      // Read fresh state at completion time
      const { searchFilters, selectedEntity } = useMyStore.getState();

      // Use fresh values, not closure values
      setQueryResults(query.data.pages, searchFilters);
    }
  }, [query.data, query.isFetching, setQueryResults]);
}
```

---

## Pattern 5: Performance with maxPages and Overscan

**When to use**: Long-running infinite scroll sessions, memory-constrained environments.

```typescript
const query = useInfiniteQuery({
  queryKey: ["items"],
  queryFn: fetchItems,
  initialPageParam: 0,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
  getPreviousPageParam: (firstPage) => firstPage.prevCursor, // Required with maxPages

  // Memory optimization
  maxPages: 10, // Keep only last 10 pages in memory

  // Re-fetching behavior
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 30 * 60 * 1000, // 30 minutes
});
```

**With TanStack Virtual for large lists**:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualizedInfiniteList() {
  const query = useInfiniteQuery({
    queryKey: ['items'],
    queryFn: fetchItems,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    getPreviousPageParam: (firstPage) => firstPage.prevCursor, // Required with maxPages
    maxPages: 20,  // Limit pages
  });

  const allItems = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data]
  );

  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: allItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5,  // Render 5 extra items above/below viewport
  });

  // Fetch more when nearing end
  useEffect(() => {
    const lastVirtualItem = virtualizer.getVirtualItems().at(-1);
    if (!lastVirtualItem) return;

    if (
      lastVirtualItem.index >= allItems.length - 5 &&
      query.hasNextPage &&
      !query.isFetchingNextPage
    ) {
      query.fetchNextPage();
    }
  }, [virtualizer.getVirtualItems(), allItems.length, query]);

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: virtualItem.start,
              height: virtualItem.size,
            }}
          >
            {allItems[virtualItem.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## ⚠️ Critical: maxPages Requires Bi-Directional Fetching

**MANDATORY REQUIREMENT:** When using `maxPages` option (value > 0), you MUST define BOTH `getNextPageParam` AND `getPreviousPageParam`.

### Why This Matters

When `maxPages` is set, TanStack Query automatically purges pages from **either end** of the page array to stay within the limit. Without both page param functions, users cannot fetch back purged pages, breaking navigation.

**Example failure scenario:**

```typescript
// ❌ WRONG: Only defines getNextPageParam
const query = useInfiniteQuery({
  queryKey: ['items'],
  queryFn: fetchItems,
  initialPageParam: 0,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
  maxPages: 10, // Pages get purged from start, but no way to fetch them back!
});

// User scrolls forward → Pages 0-9 loaded
// User continues → Page 10 loads, Page 0 purged
// User scrolls back to top → ❌ CANNOT fetch Page 0 (no getPreviousPageParam)
```

### Correct Implementation

```typescript
// ✅ CORRECT: Both directions defined
const query = useInfiniteQuery({
  queryKey: ['items'],
  queryFn: fetchItems,
  initialPageParam: 0,

  // Both required when using maxPages
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  getPreviousPageParam: (firstPage) => firstPage.prevCursor ?? undefined,

  maxPages: 10, // Now users can fetch in both directions
});

// User scrolls forward → Pages 0-9 loaded
// User continues → Page 10 loads, Page 0 purged
// User scrolls back → ✅ Fetches Page 0 using getPreviousPageParam
```

**Key points:**

- Return `undefined` (not `null`) when no more pages in that direction
- Cursor-based pagination recommended over offset/limit for bi-directional fetching
- Test both forward and backward navigation after purging

**Reference:** [TanStack Query Infinite Queries Guide](https://tanstack.com/query/v5/docs/framework/react/guides/infinite-queries)

---

## Pattern 6: Handling Query Key Changes vs Refetch

**Decision matrix**:

| Scenario             | Solution                     | Why                          |
| -------------------- | ---------------------------- | ---------------------------- |
| Different filters    | Update query key via state   | Auto-fetches with new params |
| Same filters, re-run | `query.refetch()`            | Resets pages, fresh fetch    |
| Clear results        | `queryClient.resetQueries()` | Clears cache and data        |
| Force fresh data     | `query.refetch()`            | Ignores staleTime            |

```typescript
function useSearchQuery(filters: Filters | null) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ["search", filters],
    queryFn: ({ pageParam }) => search({ ...filters!, cursor: pageParam }),
    enabled: !!filters,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const actions = useMemo(
    () => ({
      // Re-run same query
      rerun: () => query.refetch(),

      // Clear results entirely
      clear: () => {
        queryClient.resetQueries({ queryKey: ["search"] });
      },

      // Force background refresh
      refresh: () => {
        queryClient.invalidateQueries({ queryKey: ["search", filters] });
      },
    }),
    [query, queryClient, filters]
  );

  return { ...query, ...actions };
}
```

---

## Common Pitfalls

### Pitfall 1: Using invalidateQueries alone for re-execution

```typescript
// UNRELIABLE: May not trigger refetch
const handleRerun = () => {
  queryClient.invalidateQueries({ queryKey: ["data"] });
  // If query is already stale, this may do nothing!
};

// RELIABLE: Always refetches
const handleRerun = async () => {
  await infiniteQuery.refetch();
};
```

### Pitfall 2: Reading hook values in async callbacks

```typescript
// WRONG: Captures stale value
const { currentPage } = useMyStore();

const handleFetch = async () => {
  await delay(100);
  console.log(currentPage); // Stale!
};

// RIGHT: Read fresh
const handleFetch = async () => {
  await delay(100);
  const { currentPage } = useMyStore.getState();
  console.log(currentPage); // Fresh!
};
```

### Pitfall 3: Forgetting to reset completion guards

```typescript
// WRONG: Completion handler fires only once
const hasCompleted = useRef(false);

const handleRun = async () => {
  await query.refetch(); // Completion guard still true from last run!
};

// RIGHT: Reset before triggering
const handleRun = async () => {
  hasCompleted.current = false; // Reset first
  await query.refetch();
};
```

### Pitfall 4: Not awaiting refetch

```typescript
// WRONG: May have race conditions with subsequent operations
const handleRun = () => {
  query.refetch(); // Fire and forget
  setIsRunning(false); // Sets immediately, before refetch completes
};

// RIGHT: Await for coordination
const handleRun = async () => {
  setIsRunning(true);
  await query.refetch();
  setIsRunning(false); // Sets after refetch completes
};
```

---

## Quick Reference

| Task                | Method                                   |
| ------------------- | ---------------------------------------- |
| First execution     | Set `enabled: true` via state            |
| Re-run same params  | `query.refetch()`                        |
| Change params       | Update state (changes query key)         |
| Clear data          | `queryClient.resetQueries({ queryKey })` |
| Check completion    | Use ref guard + useEffect                |
| Read fresh state    | `useStore.getState().value`              |
| Memory optimization | `maxPages: N` option                     |
| Large lists         | TanStack Virtual + `overscan`            |

---

## Related Patterns

- [Common Patterns](query-common-patterns.md) - Basic useInfiniteQuery setup
- [Performance Optimization](query-performance-optimization.md) - General query performance
- [Zustand Integration](../../using-zustand-state-management/SKILL.md) - Store patterns
- [Integration Patterns](integration-patterns.md) - Query + Table integration

---

**Last Updated:** 2024-12-11
