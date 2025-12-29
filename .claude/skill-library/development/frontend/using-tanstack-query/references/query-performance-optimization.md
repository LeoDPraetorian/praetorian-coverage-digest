# Performance Optimization

## Structural Sharing

React Query automatically maintains object references when data hasn't changed, only replacing modified portions. This optimization works exclusively with JSON-compatible data.

**How it works:**

```tsx
// First fetch returns: { id: 1, name: "Asset", status: "active" }
const firstData = queryClient.getQueryData(["asset", 1]);

// Refetch returns same data
// React Query detects no changes and REUSES the same object reference
const secondData = queryClient.getQueryData(["asset", 1]);

firstData === secondData; // true - same reference!
```

**When structural sharing applies:**

```tsx
// ✅ Modified field gets new reference, unchanged fields reuse old
const oldData = { id: 1, name: "Asset", metadata: { tags: ["a", "b"] } };
const newData = { id: 1, name: "Updated", metadata: { tags: ["a", "b"] } };

// After refetch:
// - newData.name !== oldData.name (changed)
// - newData.metadata === oldData.metadata (unchanged, same reference)
```

**Disable if needed (rare):**

```tsx
useQuery({
  queryKey: ["data"],
  queryFn: fetchData,
  structuralSharing: false, // Disable optimization
});
```

**Source:** [React Query Render Optimizations](https://tanstack.com/query/v5/docs/framework/react/guides/render-optimizations)

---

## Object Rest Destructuring Warning

**⚠️ CRITICAL:** Using object rest destructuring breaks tracked queries optimization.

```tsx
// ❌ WRONG - Disables proxy-based tracking
const { data, ...rest } = useQuery({
  queryKey: ["todos"],
  queryFn: fetchTodos,
});
// Component re-renders on ANY property change (isFetching, isStale, etc.)

// ✅ CORRECT - Only destructure what you need
const { data, isPending, error } = useQuery({
  queryKey: ["todos"],
  queryFn: fetchTodos,
});
// Component only re-renders when data, isPending, or error change
```

**Why this happens:**

React Query uses JavaScript Proxy objects to track which properties you access. Object rest destructuring (`...rest`) accesses ALL properties, defeating the optimization.

**Lint rule:** `@tanstack/eslint-plugin-query` includes `no-rest-destructuring` to catch this.

```bash
npm install -D @tanstack/eslint-plugin-query
```

**Source:** [React Query Render Optimizations](https://tanstack.com/query/v5/docs/framework/react/guides/render-optimizations)

---

## select - Derived Data

Subscribe to a subset of query data. Component only re-renders when derived value changes:

```tsx
// Base hook
export const useTodos = <T = Todo[],>(select?: (data: Todo[]) => T) => {
  return useQuery({
    queryKey: ["todos"],
    queryFn: fetchTodos,
    select,
  });
};

// Derived hook - only re-renders when COUNT changes
export const useTodoCount = () => useTodos((data) => data.length);

// Derived hook - only re-renders when filtered array changes
export const useActiveTodos = () => useTodos((data) => data.filter((t) => !t.completed));
```

### Why This Matters

```tsx
// ❌ Without select - re-renders on ANY cache update
function Bad() {
  const { data } = useQuery({ queryKey: ["todos"], queryFn: fetchTodos });
  const count = data?.length; // Recalculated every render
  return <span>{count}</span>;
}

// ✅ With select - only re-renders when count changes
function Good() {
  const { data: count } = useQuery({
    queryKey: ["todos"],
    queryFn: fetchTodos,
    select: (data) => data.length, // Memoized by TanStack Query
  });
  return <span>{count}</span>;
}
```

## notifyOnChangeProps

Control which property changes trigger re-renders:

```tsx
const { data } = useQuery({
  queryKey: ["user"],
  queryFn: fetchUser,
  notifyOnChangeProps: ["data", "error"], // Ignore status, isFetching, etc.
});
```

### Prefetch Without Re-renders

```tsx
function Article({ id }) {
  const { data } = useQuery({ queryKey: ["article", id], queryFn: getArticle });

  // Prefetch comments - no re-renders when this updates
  useQuery({
    queryKey: ["comments", id],
    queryFn: getComments,
    notifyOnChangeProps: [], // Empty = never notify
  });

  return <ArticleContent data={data} />;
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
