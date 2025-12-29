# TanStack Query Anti-Patterns

**What NOT to do - common mistakes that cause bugs, performance issues, and debugging nightmares.**

---

## Overview

These anti-patterns were discovered through production debugging sessions. Each represents real bugs that consumed significant debugging time. Avoiding these patterns prevents the same mistakes.

**Key Principle**: Most TanStack Query bugs come from fighting the library rather than working with it.

---

## Anti-Pattern 1: Unstable Query Keys

### The Problem

Complex objects in query keys create new references on every render, causing unnecessary refetches.

```typescript
// WRONG: New object reference every render
const filters = { status: "active", search: term };

const { data } = useQuery({
  queryKey: ["todos", filters], // New reference = new fetch
  queryFn: () => fetchTodos(filters),
});
```

### Why It's Bad

- TanStack Query uses referential equality for query key comparison
- New object = different key = new fetch
- Creates "infinite refetch" loops
- Wastes bandwidth and server resources
- Causes UI flickering

### The Fix

**Option A: Primitive values only**

```typescript
// CORRECT: Primitives are stable
const { data } = useQuery({
  queryKey: ["todos", status, search], // Primitives compared by value
  queryFn: () => fetchTodos({ status, search }),
});
```

**Option B: Stable serialization**

```typescript
// CORRECT: JSON.stringify creates stable string
const filterKey = JSON.stringify({ status, search });

const { data } = useQuery({
  queryKey: ["todos", filterKey],
  queryFn: () => fetchTodos({ status, search }),
});
```

**Option C: Hash function for complex objects**

```typescript
import { hash } from "ohash";

const filterHash = hash(complexFilters);

const { data } = useQuery({
  queryKey: ["todos", filterHash],
  queryFn: () => fetchTodos(complexFilters),
});
```

**Option D: Query key factory pattern**

```typescript
// Define once, use everywhere
export const todoKeys = {
  all: ["todos"] as const,
  lists: () => [...todoKeys.all, "list"] as const,
  list: (filters: TodoFilters) => [...todoKeys.lists(), filters] as const,
  detail: (id: string) => [...todoKeys.all, "detail", id] as const,
};

// Usage - consistent key structure
const { data } = useQuery({
  queryKey: todoKeys.list({ status: "active" }),
  queryFn: fetchTodos,
});
```

---

## Anti-Pattern 2: Toggling `enabled` for Re-execution

### The Problem

Using `enabled` flag to force query re-execution creates race conditions.

```typescript
// WRONG: Toggling enabled creates races
const [shouldFetch, setShouldFetch] = useState(true);

const handleRerun = () => {
  setShouldFetch(false);
  setTimeout(() => setShouldFetch(true), 0); // Race condition!
};

const { data } = useQuery({
  queryKey: ["data"],
  queryFn: fetchData,
  enabled: shouldFetch,
});
```

### Why It's Bad

- React may batch state updates, skipping the `false` state
- TanStack Query's internal state machine gets confused
- Can cause duplicate fetches or no fetch at all
- Infinite queries especially vulnerable (multiple pages of state)

### The Fix

```typescript
// CORRECT: Use enabled for gating, refetch() for re-runs
const [filters, setFilters] = useState<Filters | null>(null);

const query = useQuery({
  queryKey: ["data", filters],
  queryFn: () => fetchData(filters!),
  enabled: !!filters, // Only gates INITIAL fetch
});

const handleRerun = async () => {
  if (filters && query.data) {
    // Same parameters: use refetch
    await query.refetch();
  } else {
    // First run or different params: set state
    setFilters(newFilters);
  }
};
```

**When `enabled` IS appropriate:**

- Conditional fetching based on auth state
- Feature flag gating
- Dependent queries (wait for parent data)
- User preference to disable auto-fetch

---

## Anti-Pattern 3: Storing Server Data in Client State

### The Problem

Copying server state into client state (useState, Zustand, Context).

```typescript
// WRONG: Duplicating server state
const { data: todos } = useQuery({
  queryKey: ["todos"],
  queryFn: fetchTodos,
});

const [localTodos, setLocalTodos] = useState<Todo[]>([]);

useEffect(() => {
  if (todos) {
    setLocalTodos(todos); // Now you have two sources of truth
  }
}, [todos]);

// Later: Which is correct? localTodos or query.data?
```

### Why It's Bad

- Two sources of truth = inconsistency bugs
- Manual synchronization is error-prone
- Lose TanStack Query's automatic cache invalidation
- Double the memory usage
- Stale data when server updates

### The Fix

**Use query data directly:**

```typescript
// CORRECT: Single source of truth
const { data: todos = [] } = useQuery({
  queryKey: ["todos"],
  queryFn: fetchTodos,
});

// Derived state via select
const completedCount = useQuery({
  queryKey: ["todos"],
  queryFn: fetchTodos,
  select: (data) => data.filter((t) => t.completed).length,
});
```

**If you need local modifications before server sync:**

```typescript
// CORRECT: Optimistic updates
const mutation = useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    await queryClient.cancelQueries({ queryKey: ['todos'] });
    const previous = queryClient.getQueryData(['todos']);
    queryClient.setQueryData(['todos'], (old) => /* update */);
    return { previous };
  },
  onError: (_, __, context) => {
    queryClient.setQueryData(['todos'], context?.previous);
  },
});
```

**If you need client-only UI state:**

```typescript
// CORRECT: Store query key or selection, not data
const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);

// Derive from server data
const selectedTodo = todos.find((t) => t.id === selectedTodoId);
```

---

## Anti-Pattern 4: Aggressive Cache Disabling

### The Problem

Setting cache to zero "to ensure fresh data."

```typescript
// WRONG: Cache disabled
const { data } = useQuery({
  queryKey: ["data"],
  queryFn: fetchData,
  staleTime: 0,
  gcTime: 0,
  refetchOnMount: "always",
  refetchOnWindowFocus: "always",
});
```

### Why It's Bad

- Defeats the entire purpose of TanStack Query
- Excessive API calls (every mount, every focus)
- Poor user experience (loading spinners everywhere)
- Server load increases dramatically
- Costs money (API calls, bandwidth)

### The Fix

**Choose appropriate cache times:**

| Data Type                | staleTime  | gcTime     | Rationale            |
| ------------------------ | ---------- | ---------- | -------------------- |
| Real-time (stock prices) | 5s         | 1min       | Needs freshness      |
| User data                | 30s        | 5min       | Changes occasionally |
| Settings/config          | 5min       | 30min      | Rarely changes       |
| Static content           | `Infinity` | `Infinity` | Never changes        |

```typescript
// CORRECT: Appropriate caching
const { data } = useQuery({
  queryKey: ["userSettings"],
  queryFn: fetchSettings,
  staleTime: 30 * 1000, // 30 seconds
  gcTime: 5 * 60 * 1000, // 5 minutes
});

// If you need fresh data at a specific moment:
const handleRefresh = () => query.refetch();
```

---

## Anti-Pattern 5: Missing Error Handling

### The Problem

Ignoring error states or using generic handlers.

```typescript
// WRONG: No error handling
const { data } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
});

return <div>{data?.map(t => <Todo key={t.id} {...t} />)}</div>;

// WRONG: Generic handler loses information
if (error) return <div>Something went wrong</div>;
```

### Why It's Bad

- Users stuck on loading spinner when errors occur
- No way to recover from transient failures
- Missing context for debugging
- Poor user experience

### The Fix

```typescript
// CORRECT: Comprehensive error handling
const { data, isPending, isError, error, refetch } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  retry: (failureCount, error) => {
    // Don't retry client errors (4xx)
    if (error instanceof Error && error.message.includes('4')) {
      return false;
    }
    return failureCount < 3;
  },
});

if (isPending) return <LoadingSkeleton />;

if (isError) {
  return (
    <ErrorState
      message={error.message}
      onRetry={() => refetch()}
    />
  );
}

return <TodoList todos={data} />;
```

**For global error handling:**

```typescript
// CORRECT: Error boundary integration
const { data } = useQuery({
  queryKey: ["criticalData"],
  queryFn: fetchCriticalData,
  throwOnError: (error) => error.status >= 500, // Only 5xx to boundary
});
```

---

## Anti-Pattern 6: Callbacks in Hook Configuration (v4 pattern)

### The Problem

Using v4-style callbacks in useQuery configuration.

```typescript
// WRONG: v4 pattern doesn't work in v5
const { data } = useQuery({
  queryKey: ["todos"],
  queryFn: fetchTodos,
  onSuccess: (data) => {
    // REMOVED IN v5
    toast.success("Loaded!");
  },
  onError: (error) => {
    // REMOVED IN v5
    toast.error(error.message);
  },
});
```

### Why It's Bad

- `onSuccess`, `onError`, `onSettled` removed from queries in v5
- Code silently does nothing
- Confusing debugging (callbacks never fire)

### The Fix

**For side effects, use useEffect:**

```typescript
// CORRECT: useEffect for query side effects
const { data, error, isSuccess, isError } = useQuery({
  queryKey: ["todos"],
  queryFn: fetchTodos,
});

useEffect(() => {
  if (isSuccess && data) {
    toast.success("Loaded!");
  }
}, [isSuccess, data]);

useEffect(() => {
  if (isError && error) {
    toast.error(error.message);
  }
}, [isError, error]);
```

**For mutations, callbacks still work:**

```typescript
// CORRECT: Mutation callbacks still supported
const mutation = useMutation({
  mutationFn: createTodo,
  onSuccess: (data) => toast.success("Created!"),
  onError: (error) => toast.error(error.message),
});
```

---

## Anti-Pattern 7: Stale Closures in Callbacks

### The Problem

Capturing state values in callbacks that become stale.

```typescript
// WRONG: Stale closure
const { filters } = useMyStore();

const handleComplete = useCallback(
  (data) => {
    console.log("Completed with:", filters); // STALE!
    processResults(data, filters);
  },
  [filters]
); // Even with deps, can be stale
```

### Why It's Bad

- Callbacks capture values at creation time
- Async operations complete with old values
- Intermittent, hard-to-reproduce bugs
- Especially problematic with Zustand/Redux stores

### The Fix

```typescript
// CORRECT: Read fresh state in callback
const handleComplete = useCallback((data) => {
  // Read fresh from store at execution time
  const { filters } = useMyStore.getState();
  console.log("Completed with:", filters); // Always current
  processResults(data, filters);
}, []); // No deps - always reads fresh
```

---

## Anti-Pattern 8: Debug Logging Left in Production

### The Problem

Console.log statements scattered throughout query code.

```typescript
// WRONG: Debug logging in production
const { data } = useQuery({
  queryKey: ["todos", filters],
  queryFn: async () => {
    console.log("Fetching with filters:", filters); // In production!
    const result = await fetchTodos(filters);
    console.log("Got result:", result); // Exposes data!
    return result;
  },
});
```

### Why It's Bad

- Clutters browser console
- Exposes potentially sensitive data
- Performance overhead
- Unprofessional in production

### The Fix

```typescript
// CORRECT: Conditional debug logging
const DEBUG = import.meta.env.DEV && false; // Toggle when needed

const { data } = useQuery({
  queryKey: ["todos", filters],
  queryFn: async () => {
    if (DEBUG) console.log("[DEBUG] Fetching:", filters);
    const result = await fetchTodos(filters);
    if (DEBUG) console.log("[DEBUG] Result:", result);
    return result;
  },
});
```

**Better: Use DevTools instead of console.log**

```typescript
// Use TanStack Query DevTools for debugging
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

---

## Anti-Pattern 9: Using Queries for Client State

### The Problem

Using TanStack Query to store client-only state.

```typescript
// WRONG: Query for client state
const { data: isModalOpen } = useQuery({
  queryKey: ["modalState"],
  queryFn: () => false,
  staleTime: Infinity,
});

const setModalOpen = (open: boolean) => {
  queryClient.setQueryData(["modalState"], open);
};
```

### Why It's Bad

- Abuses the library's intended purpose
- Loses React's optimized state updates
- Confusing semantics (is it server or client data?)
- Unnecessary complexity

### The Fix

```typescript
// CORRECT: useState for component state
const [isModalOpen, setIsModalOpen] = useState(false);

// CORRECT: Zustand for global client state
const useUIStore = create((set) => ({
  isModalOpen: false,
  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),
}));

// CORRECT: TanStack Query for server state ONLY
const { data: todos } = useQuery({
  queryKey: ["todos"],
  queryFn: fetchTodos,
});
```

---

## Anti-Pattern 10: Incorrect Infinite Query Re-execution

### The Problem

Using `invalidateQueries` alone for re-running infinite queries.

```typescript
// WRONG: May not trigger refetch
const handleRerun = () => {
  queryClient.invalidateQueries({ queryKey: ["items"] });
  // If query is already stale, this may do nothing!
};
```

### Why It's Bad

- `invalidateQueries` marks queries stale but doesn't guarantee refetch
- Infinite queries have accumulated page state
- May result in stale data or no refetch

### The Fix

```typescript
// CORRECT: Use refetch for reliable re-execution
const infiniteQuery = useInfiniteQuery({
  queryKey: ["items", filters],
  queryFn: fetchItems,
  initialPageParam: 0,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});

const handleRerun = async () => {
  await infiniteQuery.refetch(); // Resets all pages, fetches fresh
};
```

---

## Quick Reference: Anti-Pattern Checklist

Before committing query code, verify:

- [ ] Query keys use stable references (primitives, serialized, or factory)
- [ ] `enabled` is NOT being toggled for re-execution
- [ ] Server data is NOT duplicated in client state
- [ ] Cache times are appropriate (not all zeros)
- [ ] Error states are handled with user feedback
- [ ] No v4 callbacks in query configuration
- [ ] Callbacks read fresh state (not closures)
- [ ] Debug logging is conditional or uses DevTools
- [ ] TanStack Query is used for server state ONLY
- [ ] Infinite queries use `refetch()` for re-execution
- [ ] No object rest destructuring in useQuery calls

---

## Anti-Pattern 11: Object Rest Destructuring Breaks Tracked Queries

### The Problem

Using object rest/spread destructuring (`...rest`) when destructuring useQuery results disables the proxy-based property tracking optimization, causing unnecessary re-renders.

```typescript
// WRONG: Breaks tracked queries optimization
const { data, ...rest } = useQuery({
  queryKey: ["todos"],
  queryFn: fetchTodos,
});
// Component re-renders on ANY property change (isFetching, isStale, etc.)
```

### Why It's Bad

- React Query uses JavaScript Proxy objects to track which properties you access
- Object rest destructuring (`...rest`) accesses ALL properties at once
- This defeats the proxy tracking optimization
- Component re-renders even when only unused properties change
- Performance degrades in apps with many queries

### How It Happens

```typescript
// Developer wants to pass query metadata down
function TodoList() {
  const { data, ...queryMeta } = useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  })

  // Pass metadata to child component
  return <TodosDisplay data={data} queryMeta={queryMeta} />
}
```

**Problem**: The `...queryMeta` spread accesses all properties, breaking tracking.

### The Fix

**Option A: Only destructure what you need**

```typescript
// CORRECT: Explicitly list needed properties
const { data, isPending, error, isFetching } = useQuery({
  queryKey: ["todos"],
  queryFn: fetchTodos,
});
// Component only re-renders when these 4 properties change
```

**Option B: Use notifyOnChangeProps**

```typescript
// CORRECT: Explicitly define which properties trigger re-renders
const { data, ...rest } = useQuery({
  queryKey: ["todos"],
  queryFn: fetchTodos,
  notifyOnChangeProps: ["data"], // Only re-render on data changes
});
// rest can be used safely now
```

**Option C: Get entire result object (no destructuring)**

```typescript
// CORRECT: No destructuring = tracking still works
const todoQuery = useQuery({
  queryKey: ["todos"],
  queryFn: fetchTodos,
});
// Access via todoQuery.data, todoQuery.isPending, etc.
```

### Detection

**ESLint Rule**: `@tanstack/eslint-plugin-query` includes `no-rest-destructuring`

```bash
npm install -D @tanstack/eslint-plugin-query
```

```js
// .eslintrc.js
module.exports = {
  plugins: ["@tanstack/query"],
  rules: {
    "@tanstack/query/no-rest-destructuring": "error",
  },
};
```

### Real-World Impact

```typescript
// ❌ Component re-renders 50+ times during a single mutation
const { data, ...rest } = useQuery({ queryKey: ["todos"], queryFn: fetchTodos });
// Re-renders on: isPending, isFetching, isStale, isLoading, etc.

// ✅ Component re-renders 2 times during a single mutation
const { data, isPending } = useQuery({ queryKey: ["todos"], queryFn: fetchTodos });
// Re-renders only on: isPending and data changes
```

### Source

[React Query Render Optimizations - Tracked Queries](https://tanstack.com/query/v5/docs/framework/react/guides/render-optimizations)

---

## Related Documentation

- [Best Practices](query-best-practices.md) - What TO do
- [Infinite Query Patterns](query-infinite-scroll-patterns.md) - Correct re-execution patterns
- [Common Patterns](query-common-patterns.md) - Standard usage patterns
- [Performance Optimization](query-performance-optimization.md) - Caching strategies

---

**Last Updated:** 2025-12-11
