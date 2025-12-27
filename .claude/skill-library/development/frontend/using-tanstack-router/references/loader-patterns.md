# Loader Patterns

Advanced data loading patterns for TanStack Router including `beforeLoad` vs `loader`, execution order, `loaderDeps`, context flow, and parallel loading strategies.

## Overview

TanStack Router provides two hooks for loading data:
- **`beforeLoad`**: Sequential execution, blocks downstream routes, ideal for auth/redirects/context injection
- **`loader`**: Parallel execution, independent per route, ideal for data fetching

Understanding when to use each is critical for performance and correctness.

---

## beforeLoad vs loader

### Execution Model Comparison

| Aspect | `beforeLoad` | `loader` |
|--------|--------------|----------|
| **Execution** | Sequential, blocks all downstream routes | Parallel across all routes |
| **Purpose** | Auth checks, redirects, context injection | Data fetching for specific route |
| **Blocking Behavior** | Blocks ALL child loaders until complete | Independent, doesn't block others |
| **Performance Impact** | Slow beforeLoad delays entire route tree | Isolated to single route |
| **Best for** | Lightweight, critical preconditions | Heavy data loading operations |
| **Return Value** | Merged into context for child routes | Available via `useLoaderData()` |
| **Error Handling** | Can redirect on auth failure | Can throw to error boundary |

### When to Use beforeLoad

Use `beforeLoad` for:

1. **Authentication Checks** - Redirect unauthenticated users before any data loads
2. **Permission Validation** - Block access to unauthorized sections
3. **Context Injection** - Add services, user data, or configuration to route context
4. **Critical Preconditions** - Validate requirements needed by all child routes
5. **Lightweight Operations** - Fast checks that don't involve heavy computation

**Example - Auth Guard:**

```typescript
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context }) => {
    // Fast auth check
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }

    // Inject user into context for child routes
    const user = await context.auth.getUser()
    return { user }
  },
})
```

### When to Use loader

Use `loader` for:

1. **Route-Specific Data** - Fetching data needed only for this route
2. **API Calls** - Making HTTP requests to load page content
3. **Query Prefetching** - Priming TanStack Query cache before render
4. **Independent Operations** - Data loading that doesn't affect other routes
5. **Heavy Computation** - Operations that might be slow

**Example - Data Loading:**

```typescript
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/assets/$assetId')({
  loader: async ({ params, context }) => {
    // Parallel data fetching (won't block sibling routes)
    const [asset, risks, attributes] = await Promise.all([
      context.queryClient.ensureQueryData(assetQueryOptions(params.assetId)),
      context.queryClient.ensureQueryData(risksQueryOptions(params.assetId)),
      context.queryClient.ensureQueryData(attributesQueryOptions(params.assetId)),
    ])

    return { asset, risks, attributes }
  },
  component: AssetDetails,
})

function AssetDetails() {
  const { asset, risks, attributes } = Route.useLoaderData()
  return <div>{asset.name}</div>
}
```

---

## Context Flow

Data returned from `beforeLoad` is **merged into context** and available to child routes and their loaders.

### Parent-to-Child Context Injection

```typescript
// Parent route: /dashboard
export const Route = createFileRoute('/dashboard')({
  beforeLoad: () => {
    return { dashboardSettings: { theme: 'dark', layout: 'grid' } }
  },
})

// Child route: /dashboard/assets
export const Route = createFileRoute('/dashboard/assets')({
  beforeLoad: ({ context }) => {
    // Access parent's injected context
    console.log(context.dashboardSettings.theme) // 'dark'

    // Add more context for deeper children
    return { assetFilters: { status: 'active' } }
  },
  loader: ({ context }) => {
    // Both parent and current beforeLoad context available
    const { dashboardSettings, assetFilters } = context
    return fetchAssets(assetFilters)
  },
})

// Grandchild route: /dashboard/assets/$assetId
export const Route = createFileRoute('/dashboard/assets/$assetId')({
  loader: ({ context, params }) => {
    // All ancestor context available
    console.log(context.dashboardSettings) // Available
    console.log(context.assetFilters) // Available
    return fetchAsset(params.assetId)
  },
})
```

### Root Context with createRootRouteWithContext

Share services and configuration across all routes:

```typescript
// In __root.tsx
import { createRootRouteWithContext } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'

interface RouterContext {
  auth: AuthService
  queryClient: QueryClient
  analytics: AnalyticsService
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Root,
})

// In router.tsx
const router = createRouter({
  routeTree,
  context: {
    auth: authService,
    queryClient,
    analytics: analyticsService,
  },
})

// In any child route
export const Route = createFileRoute('/assets')({
  loader: ({ context }) => {
    // Root context always available
    context.analytics.track('page_view')
    return context.queryClient.ensureQueryData(assetsOptions)
  },
})
```

---

## loaderDeps for Search Param Dependencies

When your loader depends on search params, use `loaderDeps` to properly cache data by those dependencies.

### Why loaderDeps?

Without `loaderDeps`, the router doesn't know your loader depends on search params, leading to:
- Incorrect cache keys (data not refetched when search changes)
- Stale data shown when navigating with different search params
- Broken preloading (can't preload with specific search values)

### Basic Pattern

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const searchSchema = z.object({
  page: z.number().default(1),
  filter: z.enum(['all', 'active', 'inactive']).default('all'),
  search: z.string().default(''),
})

export const Route = createFileRoute('/assets')({
  validateSearch: searchSchema,

  // Extract search params as loader dependencies
  loaderDeps: ({ search }) => ({
    page: search.page,
    filter: search.filter,
    search: search.search,
  }),

  // Access via deps, NOT via search directly
  loader: async ({ deps }) => {
    return fetchAssets({
      page: deps.page,
      filter: deps.filter,
      search: deps.search,
    })
  },
})
```

### Subset of Search Params

Only include search params your loader actually uses:

```typescript
const searchSchema = z.object({
  page: z.number().default(1),
  pageSize: z.number().default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  uiMode: z.enum(['grid', 'list']).default('grid'),  // UI-only
})

export const Route = createFileRoute('/assets')({
  validateSearch: searchSchema,

  // Only include params that affect data fetching
  loaderDeps: ({ search }) => ({
    page: search.page,
    pageSize: search.pageSize,
    sortBy: search.sortBy,
    sortOrder: search.sortOrder,
    // NOT uiMode - doesn't affect API call
  }),

  loader: async ({ deps }) => {
    return fetchAssets(deps)
  },
})
```

### Computed Dependencies

Transform search params before using as loader deps:

```typescript
loaderDeps: ({ search }) => ({
  // Normalize date range
  dateRange: search.startDate && search.endDate
    ? { start: search.startDate, end: search.endDate }
    : null,

  // Combine filter fields
  filters: {
    status: search.status,
    severity: search.severity,
    assignee: search.assignee,
  },
})
```

---

## Parallel Loading Strategies

### Parallel Loaders Across Routes

When navigating to nested routes, all loaders run in parallel automatically:

```typescript
// Parent: /dashboard
loader: () => fetchDashboardStats()  // Runs in parallel

// Child: /dashboard/assets
loader: () => fetchAssets()          // Runs in parallel

// Grandchild: /dashboard/assets/$assetId
loader: ({ params }) => fetchAsset(params.assetId)  // Runs in parallel
```

All three loaders start simultaneously, greatly reducing load time compared to waterfalls.

### Promise.all for Multiple Queries

Fetch multiple data sources in a single loader:

```typescript
export const Route = createFileRoute('/assets/$assetId')({
  loader: async ({ params, context }) => {
    // All queries start simultaneously
    await Promise.all([
      context.queryClient.ensureQueryData(assetQueryOptions(params.assetId)),
      context.queryClient.ensureQueryData(risksQueryOptions(params.assetId)),
      context.queryClient.ensureQueryData(attributesQueryOptions(params.assetId)),
      context.queryClient.prefetchQuery(relatedAssetsOptions(params.assetId)),
    ])
  },
})
```

### Promise.allSettled for Optional Data

Use `allSettled` when some data is optional (don't fail if one query fails):

```typescript
loader: async ({ params, context }) => {
  const results = await Promise.allSettled([
    context.queryClient.ensureQueryData(assetOptions(params.assetId)),        // Critical
    context.queryClient.prefetchQuery(analyticsOptions(params.assetId)),     // Optional
    context.queryClient.prefetchQuery(recommendationsOptions(params.assetId)), // Optional
  ])

  // Critical data must succeed
  if (results[0].status === 'rejected') {
    throw new Error('Failed to load asset')
  }

  // Optional data failures are ok (components will show loading state)
}
```

### Avoid Waterfalls with Dependent Data

**❌ BAD - Sequential waterfall:**

```typescript
loader: async ({ params }) => {
  const asset = await fetchAsset(params.assetId)  // Wait...
  const owner = await fetchUser(asset.ownerId)    // Then wait again...
  const team = await fetchTeam(owner.teamId)      // More waiting...
  return { asset, owner, team }
}
```

**✅ GOOD - Parallel with query options:**

```typescript
// Define query options that encode dependencies
const assetOptions = (id: string) => queryOptions({
  queryKey: ['assets', id],
  queryFn: () => fetchAsset(id),
})

const ownerOptions = (assetId: string) => queryOptions({
  queryKey: ['owner', assetId],
  queryFn: async () => {
    const asset = await queryClient.getQueryData(assetOptions(assetId).queryKey)
    return fetchUser(asset.ownerId)
  },
})

loader: async ({ params, context }) => {
  // Asset loads first, owner uses cached asset data
  await Promise.all([
    context.queryClient.ensureQueryData(assetOptions(params.assetId)),
    context.queryClient.ensureQueryData(ownerOptions(params.assetId)),
  ])
}
```

---

## ensureQueryData vs prefetchQuery

Both prime the TanStack Query cache, but with different semantics:

### ensureQueryData

**Use for critical data that must be loaded before render:**

```typescript
loader: async ({ params, context }) => {
  // Blocks navigation until data is loaded
  await context.queryClient.ensureQueryData(assetQueryOptions(params.assetId))
}
```

**Characteristics:**
- Returns the data (can be awaited)
- Only fetches if cache is empty or stale (respects `staleTime`)
- Blocks route transition until complete
- Use for data the component absolutely needs

### prefetchQuery

**Use for background data that's nice-to-have:**

```typescript
loader: async ({ params, context }) => {
  // Critical data
  await context.queryClient.ensureQueryData(assetQueryOptions(params.assetId))

  // Background data (doesn't block)
  context.queryClient.prefetchQuery(analyticsQueryOptions(params.assetId))
  context.queryClient.prefetchQuery(relatedAssetsOptions(params.assetId))
}
```

**Characteristics:**
- Returns `void` (fire-and-forget)
- Always fetches (ignores `staleTime`)
- Doesn't block route transition
- Use for prefetching related/optional data

### Combined Pattern

```typescript
loader: async ({ params, context }) => {
  // Block for critical data
  await Promise.all([
    context.queryClient.ensureQueryData(assetOptions(params.assetId)),
    context.queryClient.ensureQueryData(risksOptions(params.assetId)),
  ])

  // Fire-and-forget for nice-to-have
  context.queryClient.prefetchQuery(analyticsOptions(params.assetId))
  context.queryClient.prefetchQuery(relatedOptions(params.assetId))
}
```

Component sees critical data immediately, optional data loads in background.

---

## Preloading on Intent

Prime cache before user actually navigates (hover, focus):

```typescript
import { Link, useRouter } from '@tanstack/react-router'

function AssetCard({ asset }: { asset: Asset }) {
  const router = useRouter()

  const handleMouseEnter = () => {
    // Preload route when user hovers
    router.preloadRoute({
      to: '/assets/$assetId',
      params: { assetId: asset.id },
    })
  }

  return (
    <Link
      to="/assets/$assetId"
      params={{ assetId: asset.id }}
      onMouseEnter={handleMouseEnter}
      onFocus={handleMouseEnter}  // Also on keyboard focus
    >
      {asset.name}
    </Link>
  )
}
```

When user hovers/focuses, loader runs immediately. By the time they click, data is cached.

---

## Related

- [Main Skill](../SKILL.md) - Core TanStack Router patterns
- [router-route-loaders.md](router-route-loaders.md) - Legacy loader documentation
- [integration-patterns.md](integration-patterns.md) - TanStack Query + Router integration
- [search-validation.md](search-validation.md) - Search param validation with Zod

---

## References

- [beforeLoad() vs loader() Discussion](https://github.com/TanStack/router/discussions/1949)
- [TanStack Router Data Loading Guide](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading)
- [TkDodo - Context Inheritance](https://tkdodo.eu/blog/context-inheritance-in-tan-stack-router)
- [TkDodo - React Query meets React Router](https://tkdodo.eu/blog/react-query-meets-react-router)
