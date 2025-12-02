# Performance Optimization

## select - Derived Data

Subscribe to a subset of query data. Component only re-renders when derived value changes:

```tsx
// Base hook
export const useTodos = <T = Todo[]>(select?: (data: Todo[]) => T) => {
  return useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
    select,
  })
}

// Derived hook - only re-renders when COUNT changes
export const useTodoCount = () => useTodos((data) => data.length)

// Derived hook - only re-renders when filtered array changes
export const useActiveTodos = () => useTodos((data) => data.filter(t => !t.completed))
```

### Why This Matters

```tsx
// ❌ Without select - re-renders on ANY cache update
function Bad() {
  const { data } = useQuery({ queryKey: ['todos'], queryFn: fetchTodos })
  const count = data?.length // Recalculated every render
  return <span>{count}</span>
}

// ✅ With select - only re-renders when count changes
function Good() {
  const { data: count } = useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
    select: (data) => data.length, // Memoized by TanStack Query
  })
  return <span>{count}</span>
}
```

## notifyOnChangeProps

Control which property changes trigger re-renders:

```tsx
const { data } = useQuery({
  queryKey: ['user'],
  queryFn: fetchUser,
  notifyOnChangeProps: ['data', 'error'], // Ignore status, isFetching, etc.
})
```

### Prefetch Without Re-renders

```tsx
function Article({ id }) {
  const { data } = useQuery({ queryKey: ['article', id], queryFn: getArticle })

  // Prefetch comments - no re-renders when this updates
  useQuery({
    queryKey: ['comments', id],
    queryFn: getComments,
    notifyOnChangeProps: [], // Empty = never notify
  })

  return <ArticleContent data={data} />
}
```

## Avoid Request Waterfalls

### Hoist Queries

```tsx
// ❌ Waterfall - Comments waits for Article
function Bad({ id }) {
  const { data: article } = useQuery({ queryKey: ['article', id], ... })
  return <Comments articleId={id} /> // Fetches after article completes
}

// ✅ Parallel - Both fetch simultaneously
function Good({ id }) {
  const { data: article } = useQuery({ queryKey: ['article', id], ... })
  const { data: comments } = useQuery({ queryKey: ['comments', id], ... })
  // Both start immediately
}
```

## Optimization Checklist

1. Use `select` for derived data
2. Use `notifyOnChangeProps` to limit re-renders
3. Hoist queries to prevent waterfalls
4. Use `useSuspenseQueries` for parallel Suspense
5. Set appropriate `staleTime` to reduce refetches
