# Code Splitting

Advanced code splitting patterns for TanStack Router using `.lazy.tsx` files, including critical vs non-critical option separation, bundle optimization, and lazy loading strategies.

## Overview

TanStack Router enables **route-based code splitting** by separating critical route options (data loading) from non-critical options (UI components). This allows:

- **Faster initial bundle**: Critical options stay small, UI components load on-demand
- **Better performance**: Route data loads immediately while component code lazy loads
- **Optimal caching**: Data loading logic cached separately from UI code

**Key principle:** Split each route into two files:

1. **`route.tsx`** - Critical options (loader, beforeLoad, validateSearch)
2. **`route.lazy.tsx`** - Non-critical options (component, errorComponent, pendingComponent)

---

## Critical vs Non-Critical Options

### Option Classification

| Option              | Classification  | File             | Reason                               |
| ------------------- | --------------- | ---------------- | ------------------------------------ |
| `loader`            | ✅ Critical     | `route.tsx`      | Data must load before navigation     |
| `beforeLoad`        | ✅ Critical     | `route.tsx`      | Auth/redirects block navigation      |
| `validateSearch`    | ✅ Critical     | `route.tsx`      | Search params validated before load  |
| `loaderDeps`        | ✅ Critical     | `route.tsx`      | Dependencies for loader cache key    |
| `component`         | ❌ Non-critical | `route.lazy.tsx` | UI can lazy load after data ready    |
| `errorComponent`    | ❌ Non-critical | `route.lazy.tsx` | Error UI only needed if error occurs |
| `pendingComponent`  | ❌ Non-critical | `route.lazy.tsx` | Loading UI only shown during load    |
| `notFoundComponent` | ❌ Non-critical | `route.lazy.tsx` | 404 UI only needed if not found      |

**Rule of thumb:** If it runs **before** component renders → Critical. If it **is** the render → Non-critical.

---

## Basic Code Splitting Pattern

### Step 1: Create Base Route File

**`assets.tsx`** - Critical data loading:

```typescript
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/assets")({
  // Critical: Data loading
  loader: async ({ context }) => {
    return context.queryClient.ensureQueryData(assetsQueryOptions());
  },

  // Critical: Search param validation
  validateSearch: z.object({
    page: z.number().default(1),
    filter: z.enum(["all", "active"]).default("all"),
  }),

  // No component here - it's in the lazy file
});
```

### Step 2: Create Lazy Route File

**`assets.lazy.tsx`** - Non-critical UI:

```typescript
import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/assets')({
  // Non-critical: UI components
  component: AssetList,
  pendingComponent: LoadingSpinner,
  errorComponent: ErrorFallback,
})

function AssetList() {
  const { data } = Route.useLoaderData()
  const { page, filter } = Route.useSearch()

  return (
    <div>
      <h1>Assets</h1>
      <AssetTable assets={data} page={page} filter={filter} />
    </div>
  )
}

function LoadingSpinner() {
  return <div className="animate-spin">⏳</div>
}

function ErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <h2>Error loading assets</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try Again</button>
    </div>
  )
}
```

### What Happens

1. **User navigates to `/assets`**
2. **Critical file (`assets.tsx`) loads immediately** (small, just data logic)
3. **Loader starts fetching data** while lazy bundle downloads
4. **Lazy file (`assets.lazy.tsx`) downloads in parallel** with data fetch
5. **Component renders** once both data and lazy bundle are ready

**Result:** Data fetching starts immediately, UI code loads on-demand.

---

## Complete Example: Asset Detail Page

### Base Route (`assets.$assetId.tsx`)

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assetQueryOptions, risksQueryOptions } from "@/api/assets";

export const Route = createFileRoute("/assets/$assetId")({
  // Critical: Search param validation
  validateSearch: z.object({
    tab: z.enum(["details", "risks", "attributes"]).default("details"),
  }),

  // Critical: Loader dependencies
  loaderDeps: ({ search }) => ({
    tab: search.tab,
  }),

  // Critical: Data loading
  loader: async ({ params, deps, context }) => {
    // Parallel data loading
    const queries = [context.queryClient.ensureQueryData(assetQueryOptions(params.assetId))];

    // Only load risks if on risks tab
    if (deps.tab === "risks") {
      queries.push(context.queryClient.ensureQueryData(risksQueryOptions(params.assetId)));
    }

    await Promise.all(queries);
  },

  // Critical: Auth guard
  beforeLoad: async ({ context, params }) => {
    if (!context.auth.canViewAsset(params.assetId)) {
      throw redirect({ to: "/unauthorized" });
    }
  },
});
```

### Lazy Route (`assets.$assetId.lazy.tsx`)

```typescript
import { createLazyFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { assetQueryOptions, risksQueryOptions } from '@/api/assets'

export const Route = createLazyFileRoute('/assets/$assetId')({
  component: AssetDetails,
  pendingComponent: AssetLoadingSkeleton,
  errorComponent: AssetError,
  notFoundComponent: AssetNotFound,
})

function AssetDetails() {
  const { assetId } = Route.useParams()
  const { tab } = Route.useSearch()

  // Data already cached by loader
  const { data: asset } = useQuery(assetQueryOptions(assetId))
  const { data: risks } = useQuery({
    ...risksQueryOptions(assetId),
    enabled: tab === 'risks',
  })

  return (
    <div className="container mx-auto p-6">
      <AssetHeader asset={asset} />
      <AssetTabs tab={tab} asset={asset} risks={risks} />
    </div>
  )
}

function AssetLoadingSkeleton() {
  return (
    <div className="container mx-auto p-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="h-64 bg-gray-200 rounded" />
    </div>
  )
}

function AssetError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container mx-auto p-6">
      <div className="bg-red-50 border border-red-200 rounded p-4">
        <h2 className="text-lg font-semibold text-red-900">
          Failed to Load Asset
        </h2>
        <p className="text-red-700 mt-1">{error.message}</p>
        <button
          onClick={reset}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}

function AssetNotFound() {
  return (
    <div className="container mx-auto p-6 text-center">
      <h1 className="text-4xl font-bold">Asset Not Found</h1>
      <Link to="/assets" className="text-blue-600 hover:underline mt-4">
        Back to Assets
      </Link>
    </div>
  )
}
```

---

## Bundle Size Optimization

### Measuring Bundle Impact

```bash
# Build with bundle analyzer
npm run build -- --analyze

# Check route bundle sizes
ls -lh dist/assets/*.js | grep "assets"
```

**Typical sizes:**

- Base route (`assets.tsx`): ~2-5 KB (just data logic)
- Lazy route (`assets.lazy.tsx`): ~50-200 KB (full UI components + deps)

**Savings:** 95-98% of route code is lazy loaded

### Lazy Loading Heavy Dependencies

Move heavy npm packages to lazy files:

```typescript
// ❌ BAD - Heavy chart library in base route
import { createFileRoute } from '@tanstack/react-router'
import { LineChart } from 'recharts'  // ~200 KB!

export const Route = createFileRoute('/analytics')({
  loader: () => fetchAnalytics(),
  component: () => <LineChart data={...} />,
})
```

```typescript
// ✅ GOOD - Chart library only in lazy file
// analytics.tsx
export const Route = createFileRoute('/analytics')({
  loader: () => fetchAnalytics(),
})

// analytics.lazy.tsx
import { LineChart } from 'recharts'  // Lazy loaded with component

export const Route = createLazyFileRoute('/analytics')({
  component: AnalyticsChart,
})

function AnalyticsChart() {
  const data = Route.useLoaderData()
  return <LineChart data={data} />
}
```

---

## Dynamic Imports in Components

For even more granular code splitting, use dynamic imports within lazy components:

```typescript
// analytics.lazy.tsx
import { createLazyFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

// Heavy chart component split further
const HeavyChart = lazy(() => import('@/components/HeavyChart'))

export const Route = createLazyFileRoute('/analytics')({
  component: Analytics,
})

function Analytics() {
  const data = Route.useLoaderData()

  return (
    <div>
      <h1>Analytics</h1>
      <Suspense fallback={<div>Loading chart...</div>}>
        <HeavyChart data={data} />
      </Suspense>
    </div>
  )
}
```

**Result:** Chart library only loads when chart section is actually viewed.

---

## When NOT to Split

### Small Routes

If entire route is <10 KB, splitting isn't worth the complexity:

```typescript
// Simple route - no split needed
export const Route = createFileRoute('/about')({
  component: () => (
    <div className="container mx-auto p-6">
      <h1>About Us</h1>
      <p>We build security tools...</p>
    </div>
  ),
})
```

### Static Content

Routes with no data loading don't benefit:

```typescript
// No loader = no benefit from splitting
export const Route = createFileRoute("/terms")({
  component: TermsOfService,
});
```

### Frequently Visited Routes

For routes users visit often (e.g., dashboard), consider **not** splitting to avoid repeated lazy loads. The bundle is cached, but there's still a tiny delay on first visit per session.

---

## Preloading Strategies

### Preload on Hover

Load route code before user clicks:

```typescript
import { Link, useRouter } from '@tanstack/react-router'

function NavLink({ to }: { to: string }) {
  const router = useRouter()

  return (
    <Link
      to={to}
      onMouseEnter={() => {
        // Preload both data and lazy bundle
        router.preloadRoute({ to })
      }}
    >
      Analytics
    </Link>
  )
}
```

### Preload on Mount

Preload likely next routes when page loads:

```typescript
function Dashboard() {
  const router = useRouter()

  useEffect(() => {
    // Preload routes user likely visits next
    router.preloadRoute({ to: '/assets' })
    router.preloadRoute({ to: '/risks' })
  }, [])

  return <div>Dashboard</div>
}
```

### Prefetch with Intersection Observer

Load route when section scrolls into view:

```typescript
function FeatureSection() {
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          router.preloadRoute({ to: '/features' })
        }
      },
      { threshold: 0.5 }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return <div ref={ref}>Scroll to load features...</div>
}
```

---

## Chariot Patterns

### Asset Table with Lazy Modals

```typescript
// assets/index.tsx - Base route
export const Route = createFileRoute('/assets')({
  validateSearch: z.object({
    page: z.number().default(1),
    selected: z.string().optional(),
  }),
  loader: ({ search, context }) => {
    return context.queryClient.ensureQueryData(assetsQueryOptions(search.page))
  },
})

// assets/index.lazy.tsx - Lazy UI
import { lazy, Suspense } from 'react'

// Modal only loads when asset is selected
const AssetModal = lazy(() => import('@/components/AssetModal'))

export const Route = createLazyFileRoute('/assets')({
  component: AssetTable,
})

function AssetTable() {
  const { data } = Route.useLoaderData()
  const { selected } = Route.useSearch()

  return (
    <>
      <table>
        {data.map(asset => (
          <AssetRow key={asset.id} asset={asset} />
        ))}
      </table>

      {selected && (
        <Suspense fallback={<ModalSkeleton />}>
          <AssetModal assetId={selected} />
        </Suspense>
      )}
    </>
  )
}
```

### Dashboard with Lazy Widgets

```typescript
// dashboard.lazy.tsx
import { lazy, Suspense } from 'react'

const RisksWidget = lazy(() => import('@/widgets/RisksWidget'))
const AssetsWidget = lazy(() => import('@/widgets/AssetsWidget'))
const ChartWidget = lazy(() => import('@/widgets/ChartWidget'))

export const Route = createLazyFileRoute('/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Suspense fallback={<WidgetSkeleton />}>
        <RisksWidget />
      </Suspense>
      <Suspense fallback={<WidgetSkeleton />}>
        <AssetsWidget />
      </Suspense>
      <Suspense fallback={<WidgetSkeleton />}>
        <ChartWidget />
      </Suspense>
    </div>
  )
}
```

---

## Best Practices

### 1. Always Split Large Routes

If route file >50 KB, split into base + lazy:

```bash
# Check route size
wc -c src/routes/large-route.tsx
```

### 2. Keep Base Routes Small

Target <5 KB for base route files. Only data logic, no UI.

### 3. Group Related Lazy Imports

Put all lazy component imports together:

```typescript
// ✅ GOOD - Clear separation
import { createLazyFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const HeavyChart = lazy(() => import("./HeavyChart"));
const HeavyTable = lazy(() => import("./HeavyTable"));

export const Route = createLazyFileRoute("/analytics")({
  component: Analytics,
});
```

### 4. Use Preloading for Common Paths

Preload routes users are likely to visit:

```typescript
// On dashboard mount, preload likely next routes
useEffect(() => {
  router.preloadRoute({ to: "/assets" });
  router.preloadRoute({ to: "/risks" });
}, []);
```

### 5. Measure Before Optimizing

Use bundle analyzer to find actually-large routes:

```bash
npm run build -- --analyze
```

Don't prematurely split small routes.

---

## Related

- [Main Skill](../SKILL.md) - Core TanStack Router patterns
- [loader-patterns.md](loader-patterns.md) - Data loading strategies
- [error-handling.md](error-handling.md) - Lazy loading error components

---

## References

- [Code Splitting Guide](https://tanstack.com/router/latest/docs/framework/react/guide/code-splitting)
- [createLazyFileRoute API](https://tanstack.com/router/latest/docs/api/router/createLazyFileRouteFunction)
- [Route Preloading](https://tanstack.com/router/latest/docs/framework/react/guide/preloading)
