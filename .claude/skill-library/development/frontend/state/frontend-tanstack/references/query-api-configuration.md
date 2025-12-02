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
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
})
```

### Query Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `staleTime` | `number \| false` | `0` | Time in ms before data is considered stale |
| `gcTime` | `number \| Infinity` | `5 * 60 * 1000` | Garbage collection time (v4: cacheTime) |
| `retry` | `boolean \| number \| function` | `3` | Number of retry attempts |
| `retryDelay` | `number \| function` | Exponential | Delay between retries |
| `refetchOnWindowFocus` | `boolean` | `true` | Refetch when window regains focus |
| `refetchOnMount` | `boolean` | `true` | Refetch when component mounts |
| `refetchOnReconnect` | `boolean` | `true` | Refetch when network reconnects |
| `enabled` | `boolean` | `true` | Whether query should run |
| `placeholderData` | `T \| function` | `undefined` | Data to show while loading |
| `select` | `function` | `undefined` | Transform/select data |

### Mutation Options Reference

| Option | Type | Description |
|--------|------|-------------|
| `retry` | `boolean \| number \| function` | Number of retry attempts |
| `retryDelay` | `number \| function` | Delay between retries |
| `onMutate` | `function` | Called before mutation function |
| `onSuccess` | `function` | Called on successful mutation |
| `onError` | `function` | Called on error |
| `onSettled` | `function` | Called on success or error |

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
  queryKey: ['todos', filters],
  queryFn: () => fetchTodos(filters),
  staleTime: 5000,
  enabled: !!userId,
})
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
const {
  mutate,
  mutateAsync,
  data,
  error,
  isIdle,
  isPending,
  isError,
  isSuccess,
  reset,
} = useMutation({
  mutationFn: (newTodo: NewTodo) => createTodo(newTodo),
  onSuccess: (data, variables, context) => {
    queryClient.invalidateQueries({ queryKey: ['todos'] })
  },
  onError: (error, variables, context) => {
    // Rollback optimistic update
  },
})
```

### mutate vs mutateAsync

**mutate** - Fire and forget:
```typescript
const mutation = useMutation({ mutationFn: createTodo })

function handleSubmit(todo) {
  mutation.mutate(todo, {
    onSuccess: (data) => {
      console.log('Todo created:', data)
    },
    onError: (error) => {
      console.error('Failed:', error)
    },
  })
}
```

**mutateAsync** - Promise-based:
```typescript
const mutation = useMutation({ mutationFn: createTodo })

async function handleSubmit(todo) {
  try {
    const data = await mutation.mutateAsync(todo)
    console.log('Todo created:', data)
  } catch (error) {
    console.error('Failed:', error)
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
  queryKey: ['projects'],
  queryFn: ({ pageParam }) => fetchProjects(pageParam),
  initialPageParam: 0, // REQUIRED in v5
  getNextPageParam: (lastPage, allPages) => lastPage.nextCursor,
  getPreviousPageParam: (firstPage, allPages) => firstPage.prevCursor,
})
```

### Data Structure

```typescript
// data.pages - Array of page results
// data.pageParams - Array of page parameters used

data.pages.forEach((page) => {
  page.items.forEach((item) => {
    console.log(item)
  })
})
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
queryClient.invalidateQueries()

// Invalidate specific queries
queryClient.invalidateQueries({ queryKey: ['todos'] })

// Invalidate with filters
queryClient.invalidateQueries({
  queryKey: ['todos'],
  exact: true,
  refetchType: 'active'
})
```

### Prefetching

```typescript
// Prefetch data
await queryClient.prefetchQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  staleTime: 5000,
})

// Prefetch infinite query
await queryClient.prefetchInfiniteQuery({
  queryKey: ['projects'],
  queryFn: ({ pageParam }) => fetchProjects(pageParam),
  initialPageParam: 0,
})
```

### Manual Data Updates

```typescript
// Set query data
queryClient.setQueryData(['todos'], (old) => [...old, newTodo])

// Get query data
const todos = queryClient.getQueryData(['todos'])

// Cancel queries (for cleanup)
await queryClient.cancelQueries({ queryKey: ['todos'] })
```

### Cache Management

```typescript
// Remove query from cache
queryClient.removeQueries({ queryKey: ['todos'] })

// Reset query state
queryClient.resetQueries({ queryKey: ['todos'] })

// Clear all cache
queryClient.clear()
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
  plugins: ['@tanstack/query'],
  rules: {
    '@tanstack/query/exhaustive-deps': 'error',
    '@tanstack/query/no-rest-destructuring': 'warn',
    '@tanstack/query/stable-query-client': 'error',
  },
}
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
