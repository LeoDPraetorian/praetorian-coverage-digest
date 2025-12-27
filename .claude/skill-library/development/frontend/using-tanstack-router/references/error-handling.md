# Error Handling

Comprehensive error handling patterns for TanStack Router including `notFoundComponent`, `errorComponent`, `pendingComponent`, and the `notFound()` function.

## Overview

TanStack Router provides multiple mechanisms for handling error states:
- **`notFoundComponent`**: Renders when route doesn't match or `notFound()` is thrown
- **`errorComponent`**: Renders when loader/component throws an error
- **`pendingComponent`**: Renders while loader is fetching data
- **`notFound()` function**: Programmatically trigger 404 from loaders
- **`notFoundMode`**: Controls 404 bubbling behavior

---

## Not Found Handling

### notFoundComponent Setup

Configure 404 handling at the root or route level:

**On Root Route:**

```typescript
// __root.tsx
import { createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: Root,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-gray-600">Page not found</p>
        <Link to="/" className="text-blue-600 hover:underline">
          Go home
        </Link>
      </div>
    </div>
  ),
})

function Root() {
  return (
    <div>
      <Nav />
      <Outlet />
    </div>
  )
}
```

**On Router (Global Default):**

```typescript
// router.tsx
import { createRouter } from '@tanstack/react-router'

const router = createRouter({
  routeTree,
  defaultNotFoundComponent: () => <NotFoundPage />,
  notFoundMode: 'fuzzy', // or 'root'
})
```

### notFoundMode Options

Controls how 404 errors bubble up to find a handler:

**`fuzzy` mode (default):**

```typescript
const router = createRouter({
  routeTree,
  notFoundMode: 'fuzzy',
})
```

- Searches for nearest parent route with `notFoundComponent`
- Bubbles up route tree until it finds a handler
- Allows different 404 pages in different sections

**Example with nested 404s:**

```typescript
// __root.tsx
export const Route = createRootRoute({
  notFoundComponent: () => <RootNotFound />,  // Fallback
})

// settings/_layout.tsx
export const Route = createFileRoute('/settings/_layout')({
  notFoundComponent: () => <SettingsNotFound />,  // Settings-specific
})

// Navigation:
// /unknown-page      → shows RootNotFound
// /settings/unknown  → shows SettingsNotFound
```

**`root` mode:**

```typescript
const router = createRouter({
  routeTree,
  notFoundMode: 'root',
})
```

- Always uses root route's `notFoundComponent`
- Consistent 404 experience across entire app
- Simpler error handling (no per-section customization)

---

## Throwing notFound() from Loaders

Use `notFound()` to programmatically trigger 404 when resource doesn't exist:

### Basic Pattern

```typescript
import { createFileRoute, notFound } from '@tanstack/react-router'

export const Route = createFileRoute('/assets/$assetId')({
  loader: async ({ params }) => {
    const asset = await fetchAsset(params.assetId)

    if (!asset) {
      throw notFound()  // Triggers notFoundComponent
    }

    return { asset }
  },
  component: AssetDetails,
})

function AssetDetails() {
  const { asset } = Route.useLoaderData()
  return <div>{asset.name}</div>
}
```

### With Custom Message

```typescript
loader: async ({ params }) => {
  const asset = await fetchAsset(params.assetId)

  if (!asset) {
    throw notFound({
      data: {
        message: `Asset ${params.assetId} not found`,
        timestamp: new Date().toISOString(),
      },
    })
  }

  return { asset }
}
```

Access message in `notFoundComponent`:

```typescript
notFoundComponent: ({ data }) => (
  <div>
    <h1>Asset Not Found</h1>
    <p>{data?.message}</p>
    <p className="text-sm text-gray-500">{data?.timestamp}</p>
  </div>
)
```

### notFound in beforeLoad

**⚠️ Warning:** Throwing `notFound()` in `beforeLoad` **always triggers root `notFoundComponent`** because route data hasn't loaded yet.

```typescript
// This will use root notFoundComponent, not route-specific
export const Route = createFileRoute('/assets/$assetId')({
  beforeLoad: async ({ params }) => {
    const asset = await checkAssetExists(params.assetId)
    if (!asset) {
      throw notFound()  // ⚠️ Uses root notFoundComponent
    }
  },
  notFoundComponent: () => <CustomNotFound />,  // Won't be used!
})
```

**Solution:** Throw `notFound()` in `loader` instead:

```typescript
export const Route = createFileRoute('/assets/$assetId')({
  beforeLoad: async ({ params }) => {
    // Fast auth check only
    return { canAccess: await checkPermission(params.assetId) }
  },
  loader: async ({ params, context }) => {
    if (!context.canAccess) {
      throw redirect({ to: '/unauthorized' })
    }

    const asset = await fetchAsset(params.assetId)
    if (!asset) {
      throw notFound()  // ✅ Uses route notFoundComponent
    }

    return { asset }
  },
  notFoundComponent: () => <CustomNotFound />,  // Will be used!
})
```

---

## Error Boundaries

### errorComponent Basics

Handle loader and component errors:

```typescript
export const Route = createFileRoute('/assets/$assetId')({
  loader: async ({ params }) => {
    const asset = await fetchAsset(params.assetId)  // May throw
    return { asset }
  },
  errorComponent: ({ error, reset }) => (
    <div className="p-4 bg-red-50 border border-red-200 rounded">
      <h2 className="text-lg font-semibold text-red-900">
        Error Loading Asset
      </h2>
      <p className="text-red-700">{error.message}</p>
      <button
        onClick={() => reset()}
        className="mt-2 px-4 py-2 bg-red-600 text-white rounded"
      >
        Try Again
      </button>
    </div>
  ),
  component: AssetDetails,
})
```

### Typed Error Handling

```typescript
class AssetNotFoundError extends Error {
  constructor(public assetId: string) {
    super(`Asset ${assetId} not found`)
    this.name = 'AssetNotFoundError'
  }
}

class AssetPermissionError extends Error {
  constructor() {
    super('You do not have permission to view this asset')
    this.name = 'AssetPermissionError'
  }
}

export const Route = createFileRoute('/assets/$assetId')({
  loader: async ({ params, context }) => {
    if (!context.auth.canViewAsset(params.assetId)) {
      throw new AssetPermissionError()
    }

    const asset = await fetchAsset(params.assetId)
    if (!asset) {
      throw new AssetNotFoundError(params.assetId)
    }

    return { asset }
  },
  errorComponent: ({ error, reset }) => {
    if (error instanceof AssetPermissionError) {
      return <PermissionDenied />
    }

    if (error instanceof AssetNotFoundError) {
      return <AssetNotFound assetId={error.assetId} />
    }

    // Generic error fallback
    return (
      <div>
        <h1>Something went wrong</h1>
        <p>{error.message}</p>
        <button onClick={reset}>Try Again</button>
      </div>
    )
  },
})
```

### Global Error Boundary

Set default error component on router:

```typescript
const router = createRouter({
  routeTree,
  defaultErrorComponent: ({ error, reset }) => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md p-6 bg-red-50 rounded-lg">
        <h1 className="text-2xl font-bold text-red-900 mb-2">
          Oops! Something went wrong
        </h1>
        <p className="text-red-700 mb-4">{error.message}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    </div>
  ),
})
```

### Error Component Props

```typescript
interface ErrorComponentProps {
  error: Error          // The thrown error
  reset: () => void     // Reset error boundary (re-runs loader)
  info?: {
    componentStack: string  // React component stack trace
  }
}

errorComponent: ({ error, reset, info }: ErrorComponentProps) => {
  // Log to error tracking service
  useEffect(() => {
    logError(error, { componentStack: info?.componentStack })
  }, [error])

  return <ErrorView error={error} onReset={reset} />
}
```

---

## Pending States

### pendingComponent Basics

Show loading UI while loader fetches data:

```typescript
export const Route = createFileRoute('/assets/$assetId')({
  loader: async ({ params }) => {
    const asset = await fetchAsset(params.assetId)  // Takes time
    return { asset }
  },
  pendingComponent: () => (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      <p className="ml-3 text-gray-600">Loading asset...</p>
    </div>
  ),
  component: AssetDetails,
})
```

### Skeleton Loaders

```typescript
pendingComponent: () => (
  <div className="p-6 space-y-4 animate-pulse">
    <div className="h-8 bg-gray-200 rounded w-1/3" />
    <div className="h-4 bg-gray-200 rounded w-2/3" />
    <div className="h-4 bg-gray-200 rounded w-1/2" />
    <div className="space-y-2">
      <div className="h-20 bg-gray-200 rounded" />
      <div className="h-20 bg-gray-200 rounded" />
      <div className="h-20 bg-gray-200 rounded" />
    </div>
  </div>
)
```

### Global Pending Component

```typescript
const router = createRouter({
  routeTree,
  defaultPendingComponent: () => <GlobalLoadingSpinner />,
})
```

### Minimal Pending Delay

Avoid flashing loading state for fast requests:

```typescript
export const Route = createFileRoute('/assets')({
  loader: async () => {
    // Most requests are fast (<200ms)
    return fetchAssets()
  },
  pendingMinMs: 500,  // Only show pending if >500ms
  pendingComponent: () => <LoadingSpinner />,
})
```

Pending component only shows if loader takes longer than `pendingMinMs`.

---

## Combined Error Handling Strategy

### Route-Level Comprehensive Handling

```typescript
export const Route = createFileRoute('/assets/$assetId')({
  loader: async ({ params, context }) => {
    // Validate permissions
    if (!context.auth.canViewAsset(params.assetId)) {
      throw redirect({ to: '/unauthorized' })
    }

    // Fetch data
    const asset = await fetchAsset(params.assetId)

    // Handle not found
    if (!asset) {
      throw notFound({
        data: { assetId: params.assetId, message: 'Asset not found' },
      })
    }

    return { asset }
  },

  // Loading state
  pendingComponent: () => <AssetLoadingSkeleton />,
  pendingMinMs: 300,

  // Error handling
  errorComponent: ({ error, reset }) => {
    if (error instanceof NetworkError) {
      return <NetworkErrorView onRetry={reset} />
    }
    return <GenericErrorView error={error} onRetry={reset} />
  },

  // Not found handling
  notFoundComponent: ({ data }) => (
    <AssetNotFoundView assetId={data?.assetId} message={data?.message} />
  ),

  // Success state
  component: AssetDetails,
})
```

### Chariot Pattern - Asset Detail Page

```typescript
// routes/assets/$assetId.tsx
export const Route = createFileRoute('/assets/$assetId')({
  validateSearch: z.object({
    tab: z.enum(['details', 'risks', 'attributes']).default('details'),
  }),

  loader: async ({ params, context }) => {
    const [asset, risks] = await Promise.allSettled([
      context.queryClient.ensureQueryData(assetQueryOptions(params.assetId)),
      context.queryClient.ensureQueryData(risksQueryOptions(params.assetId)),
    ])

    if (asset.status === 'rejected') {
      if (asset.reason?.response?.status === 404) {
        throw notFound({ data: { assetId: params.assetId } })
      }
      throw asset.reason
    }

    return { asset: asset.value, risks: risks.status === 'fulfilled' ? risks.value : null }
  },

  pendingComponent: () => (
    <div className="container mx-auto p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-48 bg-gray-200 rounded" />
      </div>
    </div>
  ),

  errorComponent: ({ error, reset }) => (
    <div className="container mx-auto p-6">
      <div className="bg-red-50 border border-red-200 rounded p-4">
        <h2 className="text-lg font-semibold text-red-900">Failed to Load Asset</h2>
        <p className="text-red-700 mt-1">{error.message}</p>
        <button
          onClick={reset}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    </div>
  ),

  notFoundComponent: ({ data }) => (
    <div className="container mx-auto p-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">Asset Not Found</h1>
        <p className="text-gray-600 mt-2">
          Asset {data?.assetId} does not exist or you don't have access to it.
        </p>
        <Link
          to="/assets"
          className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Back to Assets
        </Link>
      </div>
    </div>
  ),

  component: AssetDetails,
})
```

---

## Best Practices

### 1. Always Handle Loading States

Don't leave users with a blank screen:

```typescript
pendingComponent: () => <YourSkeletonLoader />
```

### 2. Use Typed Errors

Create custom error classes for different failure modes:

```typescript
class ValidationError extends Error { ... }
class NetworkError extends Error { ... }
class PermissionError extends Error { ... }

errorComponent: ({ error }) => {
  if (error instanceof ValidationError) { ... }
  if (error instanceof NetworkError) { ... }
  // etc.
}
```

### 3. Provide Recovery Actions

Always give users a way to recover:

```typescript
errorComponent: ({ error, reset }) => (
  <div>
    <p>{error.message}</p>
    <button onClick={reset}>Try Again</button>
    <Link to="/">Go Home</Link>
  </div>
)
```

### 4. Use notFound() for Missing Resources

Throw `notFound()` instead of generic errors for 404s:

```typescript
// ✅ GOOD
if (!asset) throw notFound()

// ❌ BAD
if (!asset) throw new Error('Not found')
```

### 5. Set pendingMinMs for Fast Routes

Avoid loading flicker on fast routes:

```typescript
pendingMinMs: 300  // Only show if >300ms
```

---

## Related

- [Main Skill](../SKILL.md) - Core TanStack Router patterns
- [loader-patterns.md](loader-patterns.md) - Data loading and beforeLoad
- [router-route-loaders.md](router-route-loaders.md) - Legacy loader patterns

---

## References

- [Not Found Errors Guide](https://tanstack.com/router/latest/docs/framework/react/guide/not-found-errors)
- [Error Handling Guide](https://tanstack.com/router/latest/docs/framework/react/guide/error-handling)
- [notFound() Function API](https://tanstack.com/router/v1/docs/framework/react/api/router/notFoundFunction)
- [Error Component API](https://tanstack.com/router/latest/docs/api/router/RouteOptionsType#errorcomponent)
