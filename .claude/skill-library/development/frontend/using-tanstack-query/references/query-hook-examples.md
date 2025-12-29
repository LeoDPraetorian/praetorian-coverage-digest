# TanStack Query Hook Examples

**Complete code examples for useQuery, useMutation, and common patterns.**

---

## useQuery Hook

**Basic usage:**

```typescript
import { useQuery } from '@tanstack/react-query'

function AssetList() {
  const { data, error, isPending, isError } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const response = await fetch('/api/assets')
      if (!response.ok) throw new Error('Failed to fetch assets')
      return response.json()
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  if (isPending) return <div>Loading...</div>
  if (isError) return <div>Error: {error.message}</div>

  return <div>{data.map(asset => ...)}</div>
}
```

**v5 breaking changes:**

- `isLoading` → `isPending` (for initial load)
- `cacheTime` → `gcTime` (garbage collection time)
- Required object syntax for hooks (no more tuple syntax)

**See:** [query-v4-to-v5-migration.md](query-v4-to-v5-migration.md) for complete migration guide.

---

## useMutation Hook

**Basic usage:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'

function CreateAsset() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (newAsset: Asset) => {
      const response = await fetch('/api/assets', {
        method: 'POST',
        body: JSON.stringify(newAsset),
      })
      if (!response.ok) throw new Error('Failed to create asset')
      return response.json()
    },
    onSuccess: () => {
      // Invalidate and refetch assets list
      queryClient.invalidateQueries({ queryKey: ['assets'] })
    },
  })

  return (
    <button
      onClick={() => mutation.mutate({ name: 'New Asset' })}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? 'Creating...' : 'Create Asset'}
    </button>
  )
}
```

**Lifecycle callbacks:**

- `onMutate`: Optimistic updates (runs before mutation)
- `onSuccess`: Cache invalidation (runs on success)
- `onError`: Rollback optimistic updates (runs on error)
- `onSettled`: Cleanup (runs after success or error)

**See:** [query-common-patterns.md](query-common-patterns.md#mutations-and-invalidation) for mutation patterns.

---

## Optimistic Updates

**Pattern for instant UI feedback:**

```typescript
const mutation = useMutation({
  mutationFn: updateAsset,
  onMutate: async (updatedAsset) => {
    // Cancel outgoing refetches (so they don't overwrite optimistic update)
    await queryClient.cancelQueries({ queryKey: ["assets", updatedAsset.id] });

    // Snapshot previous value for rollback
    const previousAsset = queryClient.getQueryData(["assets", updatedAsset.id]);

    // Optimistically update cache
    queryClient.setQueryData(["assets", updatedAsset.id], updatedAsset);

    // Return context with rollback data
    return { previousAsset };
  },
  onError: (err, updatedAsset, context) => {
    // Rollback on error
    queryClient.setQueryData(["assets", updatedAsset.id], context.previousAsset);
  },
  onSettled: (updatedAsset) => {
    // Always refetch to ensure consistency
    queryClient.invalidateQueries({ queryKey: ["assets", updatedAsset.id] });
  },
});
```

**See:** [query-best-practices.md](query-best-practices.md#optimistic-updates) for advanced patterns.

---

## Dependent Queries

**Run queries only when dependencies are ready:**

```typescript
function AssetDetails({ assetId }: { assetId?: string }) {
  // Only fetch when assetId is defined
  const assetQuery = useQuery({
    queryKey: ['assets', assetId],
    queryFn: () => fetchAsset(assetId!),
    enabled: !!assetId, // Query disabled until assetId exists
  })

  // Only fetch risks when asset is loaded
  const risksQuery = useQuery({
    queryKey: ['assets', assetId, 'risks'],
    queryFn: () => fetchAssetRisks(assetId!),
    enabled: !!assetQuery.data, // Wait for asset data
  })

  return <div>...</div>
}
```

**See:** [query-best-practices.md](query-best-practices.md#dependent-queries) for dependency patterns.

---

## Infinite Scroll

**useInfiniteQuery for paginated data:**

```typescript
import { useInfiniteQuery } from '@tanstack/react-query'

function InfiniteAssetList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['assets', 'infinite'],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetch(`/api/assets?page=${pageParam}`)
      return response.json()
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length : undefined
    },
  })

  return (
    <div>
      {data?.pages.map((page, i) => (
        <div key={i}>
          {page.items.map(asset => (
            <div key={asset.id}>{asset.name}</div>
          ))}
        </div>
      ))}
      <button
        onClick={() => fetchNextPage()}
        disabled={!hasNextPage || isFetchingNextPage}
      >
        {isFetchingNextPage ? 'Loading...' : 'Load More'}
      </button>
    </div>
  )
}
```

**See:** [query-infinite-scroll-patterns.md](query-infinite-scroll-patterns.md) for infinite scroll patterns.

---

## QueryClient Setup

```typescript
// src/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,      // 5 minutes
      gcTime: 1000 * 60 * 10,         // 10 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error.status >= 400 && error.status < 500) return false
        return failureCount < 2
      },
    },
  },
})

// src/main.tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

---

## Error Handling

```typescript
// Global error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      onError: (error) => {
        console.error("Query error:", error);
        toast.error("Failed to load data");
      },
    },
    mutations: {
      onError: (error) => {
        console.error("Mutation error:", error);
        toast.error("Failed to save data");
      },
    },
  },
});

// Per-query error handling
const { data, error } = useQuery({
  queryKey: ["assets"],
  queryFn: fetchAssets,
  onError: (error) => {
    // Handle specific error
    if (error.status === 404) {
      navigate("/not-found");
    }
  },
});
```

---

## Polling / Refetch Intervals

```typescript
// Auto-refetch every 30 seconds
const { data } = useQuery({
  queryKey: ["assets", "live"],
  queryFn: fetchAssets,
  refetchInterval: 30000, // 30 seconds
  refetchIntervalInBackground: false, // Stop polling when tab is inactive
});
```

---

## Suspense Integration (React 19)

```typescript
import { useSuspenseQuery } from '@tanstack/react-query'

function AssetList() {
  // No need for isPending checks - Suspense handles loading
  const { data } = useSuspenseQuery({
    queryKey: ['assets'],
    queryFn: fetchAssets,
  })

  return <div>{data.map(asset => ...)}</div>
}

// Parent component
function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AssetList />
    </Suspense>
  )
}
```

**See:** [query-suspense-integration.md](query-suspense-integration.md) for Suspense patterns.

---

## Anti-Pattern Examples

### ❌ Don't Use Unstable Query Keys

```typescript
// BAD: Object identity changes every render
useQuery({
  queryKey: ["assets", { status, filters }], // ⚠️ New object every time
  queryFn: fetchAssets,
});

// GOOD: Stable primitive values
useQuery({
  queryKey: ["assets", status, filters.search, filters.sortBy],
  queryFn: fetchAssets,
});
```

### ❌ Don't Violate gcTime >= staleTime Rule

```typescript
// BAD: Data can be garbage collected while still stale
staleTime: 1000 * 60 * 10,  // 10 minutes
gcTime: 1000 * 60 * 5,      // 5 minutes ⚠️

// GOOD: Cache outlives staleness
staleTime: 1000 * 60 * 5,   // 5 minutes
gcTime: 1000 * 60 * 10,     // 10 minutes ✅
```

### ❌ Don't Call queryClient.invalidateQueries in Render

```typescript
// BAD: Causes infinite loops
function Component() {
  const queryClient = useQueryClient()
  queryClient.invalidateQueries({ queryKey: ['assets'] }) // ⚠️ Every render!

  return <div>...</div>
}

// GOOD: Call in event handlers or useEffect
function Component() {
  const queryClient = useQueryClient()

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['assets'] }) // ✅ In callback
  }

  return <button onClick={handleRefresh}>Refresh</button>
}
```

---

## Related

- [Main Skill](../SKILL.md)
- [Query Best Practices](query-best-practices.md)
- [Query Common Patterns](query-common-patterns.md)
- [Anti-Patterns](query-anti-patterns.md)
