# TanStack Query API Configuration Reference

Complete reference for QueryClient configuration, query options, and mutation options.

## QueryClient Configuration

### Default Options

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60, // 1 hour (formerly cacheTime in v4)
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchInterval: false,
      refetchIntervalInBackground: false,
    },
    mutations: {
      retry: 0,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});
```

### Query Options Reference

| Option                 | Type                            | Default         | Description                                |
| ---------------------- | ------------------------------- | --------------- | ------------------------------------------ |
| `staleTime`            | `number \| false`               | `0`             | Time in ms before data is considered stale |
| `gcTime`               | `number \| Infinity`            | `5 * 60 * 1000` | Garbage collection time (v4: cacheTime)    |
| `retry`                | `boolean \| number \| function` | `3`             | Number of retry attempts                   |
| `retryDelay`           | `number \| function`            | Exponential     | Delay between retries                      |
| `refetchOnWindowFocus` | `boolean`                       | `true`          | Refetch when window regains focus          |
| `refetchOnMount`       | `boolean`                       | `true`          | Refetch when component mounts              |
| `refetchOnReconnect`   | `boolean`                       | `true`          | Refetch when network reconnects            |
| `enabled`              | `boolean`                       | `true`          | Whether query should run                   |
| `placeholderData`      | `T \| function`                 | `undefined`     | Data to show while loading                 |
| `select`               | `function`                      | `undefined`     | Transform/select data                      |

### Cache Time Configuration Best Practices

**Best Practice: Keep gcTime >= staleTime**

This ensures cached data remains available when it goes stale, allowing TanStack Query to serve old data instantly while refetching in the background. If gcTime < staleTime, the cache could be garbage collected while the data is still considered fresh, forcing a loading state.

```typescript
// ✅ GOOD: gcTime >= staleTime
useQuery({
  queryKey: ["user", userId],
  queryFn: fetchUser,
  staleTime: 30 * 1000, // 30 seconds
  gcTime: 5 * 60 * 1000, // 5 minutes (10x staleTime)
});

// ❌ BAD: gcTime < staleTime
useQuery({
  queryKey: ["user", userId],
  queryFn: fetchUser,
  staleTime: 10 * 60 * 1000, // 10 minutes
  gcTime: 5 * 60 * 1000, // 5 minutes - cache evicted before stale!
});
```

**💡 Most of the time, adjust staleTime not gcTime.** staleTime controls refetch frequency (when data needs updating), gcTime controls memory cleanup (when to remove unused cache). You'll rarely need to change gcTime from the default 5 minutes.

### Special staleTime Values (v5)

TanStack Query v5 introduced `'static'` as a more restrictive alternative to `Infinity`.

#### staleTime: Infinity

Data never becomes stale automatically, but **manual operations still work**:

```typescript
const { data } = useQuery({
  queryKey: ["user-preferences"],
  queryFn: fetchPreferences,
  staleTime: Infinity, // Never auto-refetch
});

// These WILL trigger refetch:
queryClient.invalidateQueries({ queryKey: ["user-preferences"] }); // ✅ Works
refetch(); // ✅ Works
```

**Use when:** Data rarely changes but you still need manual refresh capability (user settings, profile data).

#### staleTime: 'static'

Data is **completely static** - prevents ALL refetches including manual operations:

```typescript
const { data } = useQuery({
  queryKey: ["app-constants"],
  queryFn: fetchConstants,
  staleTime: "static" as const, // Truly immutable
});

// These will NOT trigger refetch:
queryClient.invalidateQueries({ queryKey: ["app-constants"] }); // ❌ Ignored
refetch(); // ❌ Returns cached data
```

**Even `refetchOnMount: 'always'` is ignored** when `staleTime: 'static'`.

**Use when:** Data is guaranteed to never change during the app session (app version, feature flags, build-time constants).

#### Comparison Table

| Operation                              | `staleTime: Infinity` | `staleTime: 'static'` |
| -------------------------------------- | --------------------- | --------------------- |
| Auto-refetch (window focus, reconnect) | ❌ Never              | ❌ Never              |
| `invalidateQueries()`                  | ✅ Triggers refetch   | ❌ Ignored            |
| `refetch()`                            | ✅ Refetches          | ❌ Returns cached     |
| `refetchOnMount: 'always'`             | ✅ Refetches          | ❌ Ignored            |
| Manual `queryClient.fetchQuery()`      | ✅ Refetches          | ❌ Returns cached     |

**Source:** [useQuery API Reference](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery)

---

## Type-Safe Query Options Helpers

TanStack Query v5 provides helper functions for creating type-safe, reusable query configurations.

### queryOptions Helper

Co-locates `queryKey` and `queryFn` with full type inference:

```typescript
import { queryOptions } from "@tanstack/react-query";

// Define reusable query configuration
export const todoOptions = (id: number) =>
  queryOptions({
    queryKey: ["todos", id],
    queryFn: () => fetchTodo(id),
    staleTime: 5000,
  });

// Use in components
function TodoDetail({ id }: { id: number }) {
  const { data } = useQuery(todoOptions(id));
  // data is automatically typed as Todo
}

// Use with prefetch
await queryClient.prefetchQuery(todoOptions(123));

// Type-safe cache access
const todo = queryClient.getQueryData(todoOptions(123).queryKey);
// TypeScript infers: Todo | undefined (no manual type parameter!)
```

**Benefits:**

- Type inference works automatically
- Share queries across components, prefetch, and cache operations
- Query keys tagged with return type information
- Eliminates duplicate key/function definitions

**Source:** [Query Options Guide](https://tanstack.com/query/v5/docs/framework/react/guides/query-options)

### infiniteQueryOptions Helper

Separate helper for infinite queries with type safety:

```typescript
import { infiniteQueryOptions } from "@tanstack/react-query";

// Define reusable infinite query configuration
export const projectsOptions = infiniteQueryOptions({
  queryKey: ["projects"],
  queryFn: ({ pageParam }) => fetchProjects(pageParam),
  initialPageParam: 0,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
  getPreviousPageParam: (firstPage) => firstPage.prevCursor,
});

// Use in components
function ProjectsList() {
  const { data, fetchNextPage } = useInfiniteQuery(projectsOptions);
  // data.pages is automatically typed
}

// Use with prefetch
await queryClient.prefetchInfiniteQuery(projectsOptions);
```

**When to use which:**

- `queryOptions` - For `useQuery`, `useSuspenseQuery`
- `infiniteQueryOptions` - For `useInfiniteQuery`, `useSuspenseInfiniteQuery`

**Source:** [Query Options Guide](https://tanstack.com/query/v5/docs/framework/react/guides/query-options)

---

### Mutation Options Reference

| Option       | Type                            | Description                     |
| ------------ | ------------------------------- | ------------------------------- |
| `retry`      | `boolean \| number \| function` | Number of retry attempts        |
| `retryDelay` | `number \| function`            | Delay between retries           |
| `onMutate`   | `function`                      | Called before mutation function |
| `onSuccess`  | `function`                      | Called on successful mutation   |
| `onError`    | `function`                      | Called on error                 |
| `onSettled`  | `function`                      | Called on success or error      |

## useQuery Hook API

### Basic Syntax

```typescript
const {
  data,
  error,
  isLoading,
  isPending,
  isError,
  isSuccess,
  isFetching,
  isRefetching,
  status,
  fetchStatus,
  refetch,
} = useQuery({
  queryKey: ["todos", filters],
  queryFn: () => fetchTodos(filters),
  staleTime: 5000,
  enabled: !!userId,
});
```

### Status vs FetchStatus

**status** (query state machine):

- `pending` - No data yet, initial fetch
- `error` - Query has error
- `success` - Query has data

**fetchStatus** (network activity):

- `fetching` - Query is currently fetching
- `paused` - Query wants to fetch but is paused
- `idle` - Query is not fetching

**Combining statuses:**

```typescript
if (isPending && isFetching) {
  return <div>Loading for first time...</div>
}

if (isPending && !isFetching) {
  return <div>Query disabled or not ready</div>
}

if (isSuccess && isFetching) {
  return <div>Background refresh... {data}</div>
}
```

## useMutation Hook API

### Basic Syntax

```typescript
const { mutate, mutateAsync, data, error, isIdle, isPending, isError, isSuccess, reset } =
  useMutation({
    mutationFn: (newTodo: NewTodo) => createTodo(newTodo),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
    },
  });
```

### mutate vs mutateAsync

**mutate** - Fire and forget:

```typescript
const mutation = useMutation({ mutationFn: createTodo });

function handleSubmit(todo) {
  mutation.mutate(todo, {
    onSuccess: (data) => {
      console.log("Todo created:", data);
    },
    onError: (error) => {
      console.error("Failed:", error);
    },
  });
}
```

**mutateAsync** - Promise-based:

```typescript
const mutation = useMutation({ mutationFn: createTodo });

async function handleSubmit(todo) {
  try {
    const data = await mutation.mutateAsync(todo);
    console.log("Todo created:", data);
  } catch (error) {
    console.error("Failed:", error);
  }
}
```

## useInfiniteQuery Hook API

### Basic Syntax

```typescript
const {
  data,
  fetchNextPage,
  fetchPreviousPage,
  hasNextPage,
  hasPreviousPage,
  isFetchingNextPage,
  isFetchingPreviousPage,
} = useInfiniteQuery({
  queryKey: ["projects"],
  queryFn: ({ pageParam }) => fetchProjects(pageParam),
  initialPageParam: 0, // REQUIRED in v5
  getNextPageParam: (lastPage, allPages) => lastPage.nextCursor,
  getPreviousPageParam: (firstPage, allPages) => firstPage.prevCursor,
});
```

### Data Structure

```typescript
// data.pages - Array of page results
// data.pageParams - Array of page parameters used

data.pages.forEach((page) => {
  page.items.forEach((item) => {
    console.log(item);
  });
});
```

## useSuspenseQuery Hook API

For React 18+ Suspense boundaries:

```typescript
function TodoList() {
  // Suspends component until data loads
  const { data } = useSuspenseQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  })

  // data is ALWAYS defined here (no loading state)
  return (
    <ul>
      {data.map(todo => <li key={todo.id}>{todo.title}</li>)}
    </ul>
  )
}

// Wrap with Suspense boundary:
<Suspense fallback={<Loader />}>
  <TodoList />
</Suspense>
```

## QueryClient Methods

### Invalidation

```typescript
// Invalidate all queries
queryClient.invalidateQueries();

// Invalidate specific queries
queryClient.invalidateQueries({ queryKey: ["todos"] });

// Invalidate with filters
queryClient.invalidateQueries({
  queryKey: ["todos"],
  exact: true,
  refetchType: "active",
});
```

### Prefetching

```typescript
// Prefetch data
await queryClient.prefetchQuery({
  queryKey: ["todos"],
  queryFn: fetchTodos,
  staleTime: 5000,
});

// Prefetch infinite query
await queryClient.prefetchInfiniteQuery({
  queryKey: ["projects"],
  queryFn: ({ pageParam }) => fetchProjects(pageParam),
  initialPageParam: 0,
});
```

### Manual Data Updates

```typescript
// Set query data
queryClient.setQueryData(["todos"], (old) => [...old, newTodo]);

// Get query data
const todos = queryClient.getQueryData(["todos"]);

// Cancel queries (for cleanup)
await queryClient.cancelQueries({ queryKey: ["todos"] });
```

### Cache Management

```typescript
// Remove query from cache
queryClient.removeQueries({ queryKey: ["todos"] });

// Reset query state
queryClient.resetQueries({ queryKey: ["todos"] });

// Clear all cache
queryClient.clear();
```

## Configuration Files

### package.json Dependencies

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.90.1",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@tanstack/react-query-devtools": "^5.90.1",
    "@tanstack/eslint-plugin-query": "^5.90.1",
    "typescript": "^5.0.0"
  }
}
```

### ESLint Configuration

```javascript
// .eslintrc.cjs
module.exports = {
  plugins: ["@tanstack/query"],
  rules: {
    "@tanstack/query/exhaustive-deps": "error",
    "@tanstack/query/no-rest-destructuring": "warn",
    "@tanstack/query/stable-query-client": "error",
  },
};
```

## v5 Breaking Changes

**Must Update:**

1. `cacheTime` → `gcTime`
2. `isLoading` → `isPending` (for initial load)
3. `initialPageParam` now required for infinite queries
4. `keepPreviousData` removed → use `placeholderData: keepPreviousData`
5. Query callbacks (onSuccess/onError/onSettled) must move to mutate calls
6. Object syntax required: `useQuery({ queryKey, queryFn })` not `useQuery(queryKey, queryFn)`

See [v4-to-v5-migration.md](v4-to-v5-migration.md) for complete migration guide.
