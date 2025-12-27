# TanStack Query Best Practices

**Performance, caching strategies, error handling, and production-ready patterns.**

---

## Table of Contents

1. [Query Key Design Principles](#1-query-key-design-principles)
2. [Avoid Request Waterfalls](#2-avoid-request-waterfalls)
3. [Caching Configuration](#3-caching-configuration)
4. [Error Handling Patterns](#4-error-handling-patterns)
5. [State Management Integration](#5-state-management-integration)
6. [Use queryOptions Factory](#6-use-queryoptions-factory)
7. [Data Transformations](#7-data-transformations)
8. [Prefetching](#8-prefetching)
9. [Optimistic Updates](#9-optimistic-updates)
10. [Debug Logging Patterns](#10-debug-logging-patterns)
11. [Production Readiness Checklist](#11-production-readiness-checklist)

---

## 1. Query Key Design Principles

Query keys are the foundation of TanStack Query's caching system. Unstable keys cause infinite refetches; well-designed keys enable perfect cache coordination.

### Stability Patterns

**Problem**: Complex objects create new references every render.

```typescript
// WRONG: New object = new fetch every render
const filters = { status: 'active', search: term };
useQuery({ queryKey: ['todos', filters], ... });  // Refetches constantly
```

**Solution 1: Primitive Values**

```typescript
// CORRECT: Primitives compared by value
useQuery({
  queryKey: ["todos", status, search, page],
  queryFn: () => fetchTodos({ status, search, page }),
});
```

**Solution 2: Stable Serialization**

```typescript
// CORRECT: JSON.stringify for complex objects
const filterKey = JSON.stringify({ status, search, sort });

useQuery({
  queryKey: ["todos", filterKey],
  queryFn: () => fetchTodos({ status, search, sort }),
});
```

**Solution 3: Hash Functions**

```typescript
import { hash } from "ohash"; // or object-hash

const filterHash = hash(complexFilters);

useQuery({
  queryKey: ["todos", filterHash],
  queryFn: () => fetchTodos(complexFilters),
});
```

### Query Key Factory Pattern

Define keys once, use everywhere for consistency:

```typescript
// keys/todoKeys.ts
export const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (filters: TodoFilters) => [...todoKeys.lists(), filters] as const,
  details: () => [...todoKeys.all, 'detail'] as const,
  detail: (id: string) => [...todoKeys.details(), id] as const,
};

// Usage
useQuery({ queryKey: todoKeys.list({ status: 'active' }), ... });
useQuery({ queryKey: todoKeys.detail('123'), ... });

// Invalidation
queryClient.invalidateQueries({ queryKey: todoKeys.lists() });  // All lists
queryClient.invalidateQueries({ queryKey: todoKeys.all });       // Everything
```

### Hierarchical Structure

Keys form a hierarchy for targeted invalidation:

```typescript
// Global
["todos"][("todos", "list")][("todos", "list", { status: "done" })][("todos", "detail", 123)]; // All todos // All lists // Filtered list // Single todo

// Invalidation cascade
queryClient.invalidateQueries({ queryKey: ["todos"] }); // Invalidates ALL
queryClient.invalidateQueries({ queryKey: ["todos", "list"] }); // Only lists
```

---

## 2. Avoid Request Waterfalls

### Bad: Sequential Dependencies

```tsx
function BadUserProfile({ userId }) {
  const { data: user } = useQuery({
    queryKey: ["users", userId],
    queryFn: () => fetchUser(userId),
  });

  // Waits for user
  const { data: posts } = useQuery({
    queryKey: ["posts", user?.id],
    queryFn: () => fetchPosts(user!.id),
    enabled: !!user,
  });

  // Waits for posts
  const { data: comments } = useQuery({
    queryKey: ["comments", posts?.[0]?.id],
    queryFn: () => fetchComments(posts![0].id),
    enabled: !!posts && posts.length > 0,
  });
}
```

### Good: Parallel Queries

```tsx
function GoodUserProfile({ userId }) {
  // All run in parallel
  const { data: user } = useQuery({
    queryKey: ["users", userId],
    queryFn: () => fetchUser(userId),
  });

  const { data: posts } = useQuery({
    queryKey: ["posts", userId], // Use userId directly
    queryFn: () => fetchPosts(userId),
  });

  const { data: comments } = useQuery({
    queryKey: ["comments", userId],
    queryFn: () => fetchUserComments(userId),
  });
}
```

---

## 3. Caching Configuration

### Cache Configuration Decision Matrix

| Data Type       | staleTime  | gcTime     | refetchOnWindowFocus | Example                  |
| --------------- | ---------- | ---------- | -------------------- | ------------------------ |
| Real-time       | 5s         | 1min       | true                 | Stock prices, live feeds |
| User data       | 30s        | 5min       | false                | User profile, settings   |
| Lists           | 1min       | 10min      | false                | Search results, tables   |
| Static          | `Infinity` | `Infinity` | false                | Countries, categories    |
| Infinite scroll | 5min       | 30min      | false                | Paginated lists          |

### staleTime vs gcTime

```typescript
/**
 * staleTime: How long until data is considered stale (won't auto-refetch)
 * gcTime: How long unused data stays in cache before garbage collection
 *
 * Relationship: gcTime should be >= staleTime
 */

// Real-time data
{
  staleTime: 5 * 1000,           // 5 seconds fresh
  gcTime: 60 * 1000,             // 1 minute in cache
  refetchInterval: 30 * 1000,    // Poll every 30s
}

// User settings
{
  staleTime: 30 * 1000,          // 30 seconds fresh
  gcTime: 5 * 60 * 1000,         // 5 minutes in cache
}

// Static reference data
{
  staleTime: Infinity,           // Never stale
  gcTime: Infinity,              // Never garbage collect
}
```

### Infinite Query Cache Settings

```typescript
const infiniteQuery = useInfiniteQuery({
  queryKey: ["items", filters],
  queryFn: fetchItems,
  initialPageParam: 0,
  getNextPageParam: (lastPage) => lastPage.nextCursor,

  // Memory optimization
  maxPages: 10, // Keep only last 10 pages

  // Cache settings
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 30 * 60 * 1000, // 30 minutes
});
```

### Per-Query vs Global Configuration

```typescript
// Global defaults (QueryClient)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute default
      gcTime: 10 * 60 * 1000, // 10 minutes default
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Override per query when needed
useQuery({
  queryKey: ["stock-price"],
  queryFn: fetchStockPrice,
  staleTime: 5 * 1000, // Override: 5 seconds
  refetchInterval: 30 * 1000, // Poll every 30s
});
```

---

## 4. Error Handling Patterns

### Conditional Retry Based on HTTP Status

```typescript
useQuery({
  queryKey: ["data"],
  queryFn: fetchData,
  retry: (failureCount, error) => {
    // Don't retry client errors (4xx)
    if (error instanceof Error) {
      const status = (error as any).status;
      if (status >= 400 && status < 500) {
        return false; // Client error - don't retry
      }
    }
    // Retry server errors up to 3 times
    return failureCount < 3;
  },
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});
```

### Error Boundary Integration

```typescript
// Throw specific errors to error boundary
useQuery({
  queryKey: ['critical-data'],
  queryFn: fetchCriticalData,
  throwOnError: (error) => {
    // Only throw 5xx errors to boundary
    const status = (error as any).status;
    return status >= 500;
  },
});

// In component tree
<QueryErrorResetBoundary>
  {({ reset }) => (
    <ErrorBoundary onReset={reset} fallback={<ErrorUI />}>
      <CriticalDataComponent />
    </ErrorBoundary>
  )}
</QueryErrorResetBoundary>
```

### Wiring Refetch to Retry Buttons

```typescript
function DataWithRetry() {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['data'],
    queryFn: fetchData,
  });

  if (isPending) return <LoadingSkeleton />;

  if (isError) {
    return (
      <ErrorState
        title="Failed to load data"
        message={error.message}
        onRetry={() => refetch()}
      />
    );
  }

  return <DataDisplay data={data} />;
}
```

### Generic vs Specific Error Messages

```typescript
// Error classification helper
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const status = (error as any).status;

    // Network errors
    if (!status) return "Network error. Check your connection and try again.";

    // Client errors (user can fix)
    if (status === 401) return "Please log in to continue.";
    if (status === 403) return "You do not have permission to view this.";
    if (status === 404) return "The requested item was not found.";

    // Server errors (user cannot fix)
    if (status >= 500) return "Server error. Please try again later.";
  }

  return "Something went wrong. Please try again.";
}
```

---

## 5. State Management Integration

### Server State vs Client State

**Server State** (TanStack Query):

- Data that lives on a server
- Fetched asynchronously
- Shared across users
- Can become stale

**Client State** (useState, Zustand, Context):

- UI state (modal open, selected tab)
- Form state (input values)
- User preferences (local only)
- Derived state from server data

### Anti-Pattern: Copying Server Data to Client State

```typescript
// WRONG: Two sources of truth
const { data: todos } = useQuery({ queryKey: ["todos"], queryFn: fetchTodos });
const [localTodos, setLocalTodos] = useState<Todo[]>([]);

useEffect(() => {
  if (todos) setLocalTodos(todos); // Now two copies exist
}, [todos]);
```

### Correct Pattern: Single Source of Truth

```typescript
// CORRECT: TanStack Query is the source of truth
const { data: todos = [] } = useQuery({
  queryKey: ["todos"],
  queryFn: fetchTodos,
});

// Store references, not data
const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
const selectedTodo = todos.find((t) => t.id === selectedTodoId);
```

### Reading Fresh State in Callbacks

When callbacks might capture stale closures:

```typescript
// WRONG: Stale closure
const { filters } = useMyStore();

const handleComplete = useCallback(
  (data) => {
    console.log(filters); // May be STALE
  },
  [filters]
);

// CORRECT: Read fresh state at execution time
const handleComplete = useCallback((data) => {
  const { filters } = useMyStore.getState(); // Always fresh
  console.log(filters);
}, []);
```

---

## 6. Use queryOptions Factory

```typescript
// BEST PRACTICE: Reusable, type-safe options
export const todosQueryOptions = queryOptions({
  queryKey: ["todos"],
  queryFn: fetchTodos,
  staleTime: 60 * 1000,
});

// Use everywhere with full type safety
useQuery(todosQueryOptions);
useSuspenseQuery(todosQueryOptions);
queryClient.prefetchQuery(todosQueryOptions);
queryClient.ensureQueryData(todosQueryOptions);
```

---

## 7. Data Transformations

### Use `select` for Derived Data

```typescript
// Only re-renders when count changes
function TodoCount() {
  const { data: count } = useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
    select: (data) => data.length,
  });

  return <div>Count: {count}</div>;
}

// Component gets filtered data, cache stores full data
function CompletedTodos() {
  const { data } = useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
    select: (data) => data.filter(todo => todo.completed),
  });

  return <TodoList todos={data} />;
}
```

---

## 8. Prefetching

### On Hover Prefetch

```typescript
function TodoList() {
  const queryClient = useQueryClient();
  const { data: todos } = useTodos();

  const prefetch = (id: number) => {
    queryClient.prefetchQuery({
      queryKey: ['todos', id],
      queryFn: () => fetchTodo(id),
      staleTime: 5 * 60 * 1000,  // Don't refetch if recent
    });
  };

  return (
    <ul>
      {todos?.map(todo => (
        <li key={todo.id} onMouseEnter={() => prefetch(todo.id)}>
          <Link to={`/todos/${todo.id}`}>{todo.title}</Link>
        </li>
      ))}
    </ul>
  );
}
```

---

## 9. Optimistic Updates

### When to Use

| Use For                         | Avoid For                      |
| ------------------------------- | ------------------------------ |
| Low-risk actions (toggle, like) | Critical operations (payments) |
| Frequent actions (better UX)    | Complex server validations     |
| Reversible operations           | Data integrity critical        |

### Pattern

```typescript
useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    // 1. Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ["todos"] });

    // 2. Snapshot previous value
    const previous = queryClient.getQueryData(["todos"]);

    // 3. Optimistically update
    queryClient.setQueryData(["todos"], (old: Todo[]) =>
      old.map((t) => (t.id === newTodo.id ? { ...t, ...newTodo } : t))
    );

    // 4. Return rollback context
    return { previous };
  },
  onError: (err, newTodo, context) => {
    // 5. Rollback on error
    queryClient.setQueryData(["todos"], context?.previous);
  },
  onSettled: () => {
    // 6. Always refetch after mutation
    queryClient.invalidateQueries({ queryKey: ["todos"] });
  },
});
```

---

## 10. Debug Logging Patterns

### Development-Only Logging

```typescript
// Controlled debug flag
const DEBUG = import.meta.env.DEV && false; // Toggle when debugging

const { data } = useQuery({
  queryKey: ["todos", filters],
  queryFn: async () => {
    if (DEBUG) {
      console.log("[DEBUG] Fetching todos with filters:", filters);
    }

    const result = await fetchTodos(filters);

    if (DEBUG) {
      console.log("[DEBUG] Received:", result.length, "todos");
    }

    return result;
  },
});
```

### Prefer DevTools Over Console.log

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainApp />
      {/* DevTools only in development */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

**DevTools Benefits:**

- See all query states
- Inspect cache contents
- Trigger refetches manually
- View query timing
- No console clutter

---

## 11. Production Readiness Checklist

Before deploying, verify:

### Query Configuration

- [ ] All query keys are stable (no new object references)
- [ ] Appropriate staleTime/gcTime for each data type
- [ ] Error handling with user-friendly messages
- [ ] Retry logic excludes 4xx errors
- [ ] Loading states for all pending queries

### Error Handling

- [ ] Error boundaries for critical data
- [ ] Retry buttons wired to `refetch()`
- [ ] Generic fallback messages for unexpected errors
- [ ] Logging for debugging (not in production console)

### Performance

- [ ] No request waterfalls (parallel where possible)
- [ ] Prefetching for predictable navigation
- [ ] `select` for derived data
- [ ] `maxPages` for infinite queries
- [ ] Virtualization for large lists (1000+ items)

### State Management

- [ ] Server data NOT duplicated in client state
- [ ] Query keys as single source of truth
- [ ] Fresh state read in async callbacks (not closures)
- [ ] Zustand/Context for client-only state

### Testing

- [ ] Mock query client in tests
- [ ] Test loading states
- [ ] Test error states
- [ ] Test cache invalidation after mutations

---

## Related Documentation

- [Anti-Patterns](query-anti-patterns.md) - What NOT to do
- [Infinite Query Patterns](query-infinite-scroll-patterns.md) - Re-execution patterns
- [Common Patterns](query-common-patterns.md) - Standard usage patterns
- [Performance Optimization](query-performance-optimization.md) - Advanced optimization
- [v4 to v5 Migration](query-v4-to-v5-migration.md) - Upgrade guide

---

**Last Updated:** 2025-12-11
