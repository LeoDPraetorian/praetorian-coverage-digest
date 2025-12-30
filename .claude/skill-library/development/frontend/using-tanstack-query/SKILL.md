---
name: using-tanstack-query
description: Use when implementing, REVIEWING, or ARCHITECTING TanStack Query v5 (React Query) - server state management, data fetching patterns, caching strategies, mutations, optimistic updates, query key design
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# TanStack Query v5 (React Query) - Server State Management

**Authoritative patterns for @tanstack/react-query v5 data fetching, caching, mutations, and optimistic updates.**

## When to Use

Use this skill when:

- Implementing data fetching with `useQuery`, `useMutation`, or `useInfiniteQuery`
- **Reviewing code** that uses TanStack Query (patterns, anti-patterns, cache strategies)
- **Architecting data fetching strategy** for a feature or application
- Configuring cache behavior (gcTime, staleTime, refetch strategies)
- Designing query keys for stability and invalidation
- Implementing optimistic updates for instant UI feedback
- Debugging cache issues, stale data, or refetch behavior
- Migrating from v4 to v5 (breaking changes)
- Setting up dependent queries with `enabled` option
- Integrating with React 19 (Suspense, transitions)

**NOT for:** TanStack Router (see `using-tanstack-router`) or TanStack Table (see `using-tanstack-table`). For client-side state, see `using-zustand-state-management`.

## Quick Reference

| Task                  | Hook/Pattern                                                | Key Config                                           |
| --------------------- | ----------------------------------------------------------- | ---------------------------------------------------- |
| **Fetch data**        | `useQuery({ queryKey, queryFn })`                           | `staleTime`, `gcTime`, `refetchOnWindowFocus`        |
| **Mutate data**       | `useMutation({ mutationFn })`                               | `onSuccess`, `onError`, `onSettled`                  |
| **Infinite scroll**   | `useInfiniteQuery({ queryKey, queryFn, getNextPageParam })` | `hasNextPage`, `fetchNextPage`, `isFetchingNextPage` |
| **Invalidate cache**  | `queryClient.invalidateQueries({ queryKey })`               | Exact match or prefix match                          |
| **Optimistic update** | `mutate(..., { onMutate, onError })`                        | Manual cache updates with rollback                   |
| **Dependent query**   | `useQuery({ enabled: !!userId })`                           | Query runs only when condition true                  |
| **Prefetch**          | `queryClient.prefetchQuery({ queryKey, queryFn })`          | Prime cache before component mounts                  |
| **Set query data**    | `queryClient.setQueryData(queryKey, data)`                  | Manually update cache                                |
| **Type-safe config**  | `queryOptions(...)` / `infiniteQueryOptions(...)`           | Reusable query definitions with type inference       |

### Recommended Tooling

**@tanstack/eslint-plugin-query** - Essential ESLint plugin that catches common mistakes:

- `exhaustive-deps` - Validates query key dependencies match queryFn dependencies
- `no-rest-destructuring` - Prevents `const { data, ...rest }` pattern that breaks render optimizations
- `stable-query-client` - Ensures QueryClient is stable across renders

```bash
npm install -D @tanstack/eslint-plugin-query
```

**See:** [query-performance-optimization.md](references/query-performance-optimization.md) for optimization patterns and [query-anti-patterns.md](references/query-anti-patterns.md) for mistakes to avoid.

## Core Concepts

### Query Keys

Query keys uniquely identify cached data and determine invalidation scope.

**Key design principles:**

```typescript
// ✅ GOOD: Stable, hierarchical keys
["assets"][("assets", { status: "active" })][("assets", assetId)][("assets", assetId, "risks")][ // All assets // Filtered assets // Single asset // Nested resource
  // ❌ BAD: Unstable keys (cause unnecessary refetches)
  ("assets", new Date())
][("assets", Math.random())][("assets", { status, ...filters })]; // Changes every render // Non-deterministic // Object identity changes
```

**Invalidation patterns:**

```typescript
// Invalidate all asset queries (including filtered/nested)
queryClient.invalidateQueries({ queryKey: ["assets"] });

// Invalidate only exact match
queryClient.invalidateQueries({
  queryKey: ["assets", assetId],
  exact: true,
});
```

**See:** [references/query-keys-design.md](references/query-keys-design.md) for advanced patterns.

### Cache Configuration

**Critical rule:** `gcTime >= staleTime` always.

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes (when data becomes stale)
      gcTime: 1000 * 60 * 10, // 10 minutes (when unused data is garbage collected)
      refetchOnWindowFocus: false, // Disable aggressive refetching
      retry: 1, // Retry once on failure
    },
  },
});
```

**Key terms:**

- **staleTime**: How long data is considered fresh (default: 0ms - immediately stale)
- **gcTime** (v5): How long unused data stays in cache (replaces `cacheTime` from v4)
- **refetchOnWindowFocus**: Whether to refetch when user returns to tab (default: true)

**Why gcTime >= staleTime?** If data is stale (needs refetch) but already garbage collected, you lose instant background refetch and get loading states instead.

**See:** [references/query-api-configuration.md](references/query-api-configuration.md) for complete config reference.

### useQuery Hook

Primary hook for data fetching. Returns `{ data, error, isPending, isError, refetch }`.

**Key v5 changes:** `isLoading` → `isPending`, `cacheTime` → `gcTime`, object syntax required.

**See [Hook Examples](references/query-hook-examples.md#usequery-hook)** for complete usage patterns.

### useMutation Hook

Hook for data mutations (POST, PUT, DELETE). Provides lifecycle callbacks for optimistic updates and cache invalidation.

**Callbacks:** `onMutate`, `onSuccess`, `onError`, `onSettled`

**See [Hook Examples](references/query-hook-examples.md#usemutation-hook)** for complete mutation patterns.

### Optimistic Updates

Instantly update UI before server confirmation. Pattern: cancel queries → snapshot → update → rollback on error.

**See [Hook Examples](references/query-hook-examples.md#optimistic-updates)** for complete pattern with rollback.

### Dependent Queries

Use `enabled` option to run queries only when dependencies are ready.

**See [Hook Examples](references/query-hook-examples.md#dependent-queries)** for dependency patterns.

### Infinite Scroll

Use `useInfiniteQuery` with `initialPageParam` and `getNextPageParam` for paginated data.

**See [Hook Examples](references/query-hook-examples.md#infinite-scroll)** and [Infinite Scroll Patterns](references/query-infinite-scroll-patterns.md) for complete patterns.

## Common Patterns

**Complete code examples available in [Hook Examples](references/query-hook-examples.md):**

- **QueryClient Setup** - Provider configuration with default options
- **Error Handling** - Global and per-query error callbacks
- **Polling** - Auto-refetch with `refetchInterval`
- **Suspense** - React 19 integration with `useSuspenseQuery`

**See also:**

- [Suspense Integration](references/query-suspense-integration.md) for React 19 patterns
- [Common Patterns](references/query-common-patterns.md) for additional patterns

## Anti-Patterns

**Common mistakes to avoid:**

- ❌ Unstable query keys (objects that change identity each render)
- ❌ Violating `gcTime >= staleTime` rule
- ❌ Calling `invalidateQueries` in render (causes infinite loops)
- ❌ Copying server data into local state

**See [Anti-Patterns](references/query-anti-patterns.md)** and [Hook Examples](references/query-hook-examples.md#anti-pattern-examples) for complete list with code examples.

## Testing

### Mocking Queries in Tests

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'

test('useAssets returns asset data', async () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false }, // Disable retries in tests
    },
  })

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )

  const { result } = renderHook(() => useAssets(), { wrapper })

  await waitFor(() => expect(result.current.isSuccess).toBe(true))

  expect(result.current.data).toEqual([...])
})
```

**See:** [references/query-testing.md](references/query-testing.md) for complete testing patterns.

## Troubleshooting

### Query Not Refetching

**Check:**

1. Is data marked as stale? (exceeded `staleTime`)
2. Is `refetchOnWindowFocus` disabled?
3. Is query disabled with `enabled: false`?
4. Is component still mounted?

**Debug:**

```typescript
useQuery({
  queryKey: ["assets"],
  queryFn: fetchAssets,
  onSuccess: (data) => console.log("Refetch successful:", data),
  onError: (error) => console.log("Refetch failed:", error),
});
```

### Cache Not Invalidating

**Check:**

1. Does `invalidateQueries` key match query key?
2. Are you using prefix match (default) or exact match?
3. Is query currently active (mounted)?

**Debug:**

```typescript
// Log all cached queries
console.log(queryClient.getQueryCache().getAll());

// Check specific query state
console.log(queryClient.getQueryState(["assets"]));
```

### Memory Leaks

**Check:**

1. Is `gcTime` set too high? (unused data stays cached)
2. Are you clearing cache on unmount? (usually not needed)
3. Are infinite queries accumulating pages?

**Fix:**

```typescript
// Clear cache on logout
queryClient.clear();

// Reset specific query
queryClient.resetQueries({ queryKey: ["assets"] });
```

**See:** [references/query-top-errors.md](references/query-top-errors.md) for error reference.

## Performance Optimization

### Reduce Unnecessary Renders

```typescript
// Select specific fields to avoid re-renders on unrelated changes
const { data: assetName } = useQuery({
  queryKey: ["assets", assetId],
  queryFn: fetchAsset,
  select: (data) => data.name, // Component only re-renders when name changes
});
```

### Prefetch on Hover

```typescript
function AssetCard({ assetId }) {
  const queryClient = useQueryClient()

  const handleMouseEnter = () => {
    queryClient.prefetchQuery({
      queryKey: ['assets', assetId],
      queryFn: () => fetchAsset(assetId),
    })
  }

  return <div onMouseEnter={handleMouseEnter}>...</div>
}
```

**See:** [references/query-performance-optimization.md](references/query-performance-optimization.md) for advanced patterns.

## Related Skills

- `using-tanstack-router` - Query + Router integration patterns
- `using-tanstack-table` - Query + Table integration patterns
- `using-zustand-state-management` - Client state with Zustand
- `frontend-testing-patterns` - Testing Query components with MSW

## Progressive Disclosure

**Quick Start (this file):**

- Essential hooks and patterns
- Common configurations
- Anti-patterns

**Deep Dives (references/):**

- [query-api-configuration.md](references/query-api-configuration.md) - Complete QueryClient config
- [query-best-practices.md](references/query-best-practices.md) - Production patterns
- [query-common-patterns.md](references/query-common-patterns.md) - Recipe collection
- [query-keys-design.md](references/query-keys-design.md) - Query key patterns and factories
- [query-infinite-scroll-patterns.md](references/query-infinite-scroll-patterns.md) - Pagination
- [query-network-mode.md](references/query-network-mode.md) - Offline behavior
- [query-performance-optimization.md](references/query-performance-optimization.md) - Performance
- [query-ssr-hydration.md](references/query-ssr-hydration.md) - SSR patterns
- [query-suspense-integration.md](references/query-suspense-integration.md) - React 19 Suspense
- [query-testing.md](references/query-testing.md) - Testing strategies
- [query-top-errors.md](references/query-top-errors.md) - Error reference
- [query-typescript-patterns.md](references/query-typescript-patterns.md) - TypeScript patterns
- [query-v4-to-v5-migration.md](references/query-v4-to-v5-migration.md) - Migration guide
- [query-anti-patterns.md](references/query-anti-patterns.md) - What to avoid

## Official Documentation

- [TanStack Query v5 Docs](https://tanstack.com/query/latest)
- [React Query DevTools](https://tanstack.com/query/latest/docs/react/devtools)
- [Migration Guide v4 → v5](https://tanstack.com/query/latest/docs/react/guides/migrating-to-v5)
