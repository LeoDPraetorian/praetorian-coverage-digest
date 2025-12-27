# TanStack Query Patterns

**Deep dive on server state management with TanStack Query.**

## Query Key Conventions

### Hierarchical Structure

```typescript
// Entity-based keys (hierarchical)
['assets']                          // All assets
['assets', { status: 'active' }]    // Filtered
['assets', assetId]                 // Single entity
['assets', assetId, 'risks']        // Nested relationship

// User-scoped keys (impersonation safety)
['assets', userId, filters]         // Include user for cache isolation
```

**Why include userId**: For multi-tenant applications with impersonation, including userId in query keys ensures cache isolation between users.

## Configuration Best Practices

### staleTime vs gcTime

**staleTime**: How long data stays "fresh" before background refetch
**gcTime** (formerly cacheTime): How long unused data stays in cache before garbage collection

**Rule**: `gcTime >= staleTime` (ideally `gcTime = 3x staleTime`)

```typescript
// Default configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: mToMs(5),    // 5 min - data stays fresh
      gcTime: mToMs(15),      // 15 min - keep in cache (3x staleTime)
    },
  },
});
```

### Per-Domain Tuning

Different data types need different strategies:

| Data Type | staleTime | gcTime | Reasoning |
|-----------|-----------|--------|-----------|
| User profile | 5 min | 15 min | Changes infrequently, moderate freshness needs |
| Assets list | 30 sec | 5 min | Changes frequently, need fresh data |
| Reference data (capabilities) | 30 min | 60 min | Rarely changes, can cache aggressively |
| Real-time data | 0 sec | 1 min | Always fetch latest, minimal cache |

**Implementation**:

```typescript
// In custom hooks - override defaults per domain
const useAssets = (filters) => useQuery({
  queryKey: ['assets', userId, filters],
  queryFn: () => api.getAssets(filters),
  staleTime: 30_000,  // 30 sec - assets change frequently
});

const useCapabilities = () => useQuery({
  queryKey: ['capabilities'],
  queryFn: api.getCapabilities,
  staleTime: 600_000, // 10 min - reference data
  gcTime: 1_800_000,  // 30 min
});
```

## Mutation Patterns

### Standard Mutation with Invalidation

```typescript
const { mutate } = useMutation({
  mutationFn: api.updateAsset,
  onSuccess: () => {
    // Invalidate marks queries stale, triggers background refetch
    queryClient.invalidateQueries({ queryKey: ['assets'] });
  },
});
```

**When to use**: Most mutations. Simple, reliable, shows cached data while refetching.

### Optimistic Updates

```typescript
const { mutate } = useMutation({
  mutationFn: api.updateAsset,
  onMutate: async (variables) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries({ queryKey: ['assets'] });

    // Snapshot current data for rollback
    const previous = queryClient.getQueryData(['assets']);

    // Optimistically update cache
    queryClient.setQueryData(['assets'], variables);

    // Return rollback snapshot
    return { previous };
  },
  onError: (_err, _vars, context) => {
    // Rollback on error
    queryClient.setQueryData(['assets'], context.previous);
  },
  onSettled: () => {
    // Always refetch to sync with server
    queryClient.invalidateQueries({ queryKey: ['assets'] });
  },
});
```

**When to use**:

- ✅ Toggle buttons (instant feedback critical)
- ✅ Simple boolean/status changes
- ✅ High-confidence mutations (rarely fail)

**When NOT to use**:

- ❌ Complex list transformations (position changes hard to predict)
- ❌ Sorted/filtered lists (invalidation safer)
- ❌ High failure rate operations (rollback UX is poor)
- ❌ Forms with dialogs/redirects (no benefit)

**Quote from TkDodo (React Query maintainer)**:

> "Optimistic updates are a bit over-used. Not every mutation needs to be done optimistically. You should really be sure that it rarely fails, because the UX for a rollback is not great."

### invalidateQueries vs setQueryData

**invalidateQueries**: Marks queries stale, triggers background refetch when active

```typescript
queryClient.invalidateQueries({ queryKey: ['assets'] });
// - Marks ['assets'] as stale
// - If query is active, refetches in background
// - Shows cached data until refetch completes
```

**setQueryData**: Synchronously updates cache

```typescript
queryClient.setQueryData(['assets'], newData);
// - Immediately updates cache
// - No network request
// - You must provide correct data
```

**Recommendation**: Prefer `invalidateQueries` for most cases. Use `setQueryData` only for optimistic updates where you control the data transformation.

**Why invalidateQueries is safer**:

- Server is source of truth (handles edge cases)
- Sorted lists are hard to update correctly on client
- Filters and pagination need recalculation
- Less frontend code to maintain

## Common Anti-Patterns

### ❌ Copying Query Data to useState

```typescript
// ❌ BAD - defeats caching, causes stale data
const { data } = useQuery({ queryKey: ['assets'], queryFn: getAssets });
const [assets, setAssets] = useState(data);
```

**Why bad**: Query cache updates won't reflect in state. Loses background refetching benefit.

**Fix**: Use query data directly:

```typescript
// ✅ GOOD - cache updates automatically
const { data: assets } = useQuery({ queryKey: ['assets'], queryFn: getAssets });
```

### ❌ Manual Fetch with useEffect

```typescript
// ❌ BAD - reinventing TanStack Query
useEffect(() => {
  setLoading(true);
  fetch('/api/assets')
    .then(res => res.json())
    .then(data => {
      setAssets(data);
      setLoading(false);
    })
    .catch(err => setError(err));
}, []);
```

**Why bad**: No caching, no background refetch, no request deduplication, manual loading/error states.

**Fix**: Use useQuery:

```typescript
// ✅ GOOD - automatic caching, refetch, deduplication
const { data: assets, isLoading, error } = useQuery({
  queryKey: ['assets'],
  queryFn: () => fetch('/api/assets').then(res => res.json()),
});
```

### ❌ Storing Server State in Context

```typescript
// ❌ BAD - manual cache management
const AssetContext = createContext();
export const AssetProvider = ({ children }) => {
  const [assets, setAssets] = useState([]);
  // Manual fetch, manual cache, manual refetch...
};
```

**Why bad**: Defeats TanStack Query's caching, refetching, and synchronization.

**Fix**: Use TanStack Query, Context only for client state:

```typescript
// ✅ GOOD - TanStack Query for server state
const { data: assets } = useQuery({
  queryKey: ['assets'],
  queryFn: getAssets,
});

// Context only for UI state like theme, auth
const ThemeContext = createContext();
```

### ❌ Calling invalidateQueries in Render

```typescript
// ❌ BAD - causes infinite loop
function Component() {
  queryClient.invalidateQueries({ queryKey: ['assets'] });
  return <div>...</div>;
}
```

**Why bad**: Invalidation triggers refetch → component re-renders → invalidates again → infinite loop.

**Fix**: Call in event handlers or mutation callbacks:

```typescript
// ✅ GOOD - in mutation callback
const { mutate } = useMutation({
  mutationFn: updateAsset,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assets'] }),
});
```

## Sources

- [TanStack Query Caching Guide](https://tanstack.com/query/latest/docs/framework/react/guides/caching)
- [Understanding staleTime vs gcTime](https://medium.com/@bloodturtle/understanding-staletime-vs-gctime-in-tanstack-query-e9928d3e41d4)
- [Mastering Mutations - TkDodo](https://tkdodo.eu/blog/mastering-mutations-in-react-query)
- [Optimistic Updates Guide](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
