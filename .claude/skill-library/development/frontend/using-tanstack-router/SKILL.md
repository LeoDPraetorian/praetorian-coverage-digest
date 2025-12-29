---
name: using-tanstack-router
description: Use when implementing TanStack Router for type-safe file-based routing in React - route loaders, search params validation, type-safe navigation, authentication guards, and TanStack Query integration
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# TanStack Router - Type-Safe File-Based Routing

**Authoritative patterns for @tanstack/react-router with type-safe routing, loaders, and Query integration.**

## When to Use

Use this skill when:

- Setting up file-based routing with type safety
- Implementing route loaders for data prefetching
- Validating search params with Zod schemas
- Building type-safe navigation with `useNavigate` and `Link`
- Adding authentication guards and route context
- Implementing code splitting and lazy loading
- Integrating router with TanStack Query via `ensureQueryData`
- Syncing URL state with table filters/sorting

**NOT for:** React Router v6 (different API), TanStack Query alone (see `using-tanstack-query`), or Next.js routing.

## Quick Reference

| Pattern                  | What It Does                                              | Reference                                                                 |
| ------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------- |
| **File-based routing**   | `$param.tsx`, `_layout.tsx`, `(groups)`, `index.tsx`      | [file-conventions.md](references/file-conventions.md)                     |
| **Route loaders**        | Prefetch data before render with `loader()`               | [loader-patterns.md](references/loader-patterns.md)                       |
| **beforeLoad vs loader** | Sequential auth checks vs parallel data loading           | [loader-patterns.md](references/loader-patterns.md)                       |
| **Search params**        | Type-safe query strings with Zod                          | [search-validation.md](references/search-validation.md)                   |
| **Navigation**           | Type-safe `useNavigate()` and `<Link>`                    | [router-navigation-patterns.md](references/router-navigation-patterns.md) |
| **Auth guards**          | Redirect unauthenticated users with `beforeLoad()`        | [router-routing-guide.md](references/router-routing-guide.md)             |
| **Code splitting**       | Lazy load routes with `.lazy.tsx` files                   | [code-splitting.md](references/code-splitting.md)                         |
| **Error handling**       | `notFoundComponent`, `errorComponent`, `pendingComponent` | [error-handling.md](references/error-handling.md)                         |
| **Query integration**    | Prime TanStack Query cache in loaders                     | [integration-patterns.md](references/integration-patterns.md)             |
| **Route context**        | Share services across routes                              | [router-routing-guide.md](references/router-routing-guide.md)             |

## Core Patterns

### File-Based Routing

```
src/routes/
├── __root.tsx           # Root layout (required)
├── index.tsx            # / route
├── assets/
│   ├── index.tsx        # /assets
│   └── $assetId.tsx     # /assets/:assetId (dynamic param)
└── settings/
    ├── _layout.tsx      # Pathless layout
    ├── index.tsx        # /settings
    └── profile.tsx      # /settings/profile
```

**For complete file naming conventions**, see [file-conventions.md](references/file-conventions.md).

### Route Definition

```typescript
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/assets')({
  component: AssetList,
})

function AssetList() {
  return <div>Asset List</div>
}
```

### Route Loaders

```typescript
export const Route = createFileRoute('/assets/$assetId')({
  loader: async ({ params }) => {
    const asset = await fetchAsset(params.assetId)
    return { asset }
  },
  component: AssetDetails,
})

function AssetDetails() {
  const { asset } = Route.useLoaderData()
  return <div>{asset.name}</div>
}
```

**For loader patterns (beforeLoad vs loader, loaderDeps, parallel loading)**, see [loader-patterns.md](references/loader-patterns.md).

### Search Params with Zod

```typescript
import { zodValidator, fallback } from '@tanstack/zod-adapter'
import { z } from 'zod'

const searchSchema = z.object({
  status: z.enum(['active', 'inactive']).optional(),
  page: fallback(z.number().int().positive(), 1),
  search: z.string().default(''),
})

export const Route = createFileRoute('/assets')({
  validateSearch: zodValidator(searchSchema),
})

function AssetList() {
  const { status, page, search } = Route.useSearch()
  return <div>Page {page}</div>
}
```

**For detailed validation patterns**, see [search-validation.md](references/search-validation.md).

### Type-Safe Navigation

```typescript
import { useNavigate, Link } from '@tanstack/react-router'

function AssetCard({ asset }: { asset: Asset }) {
  const navigate = useNavigate()

  return (
    <Link
      to="/assets/$assetId"
      params={{ assetId: asset.id }}
      search={{ tab: 'risks' }}
    >
      {asset.name}
    </Link>
  )
}
```

**For navigation patterns**, see [router-navigation-patterns.md](references/router-navigation-patterns.md).

### Authentication Guards

```typescript
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/settings")({
  beforeLoad: async ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: "/login", search: { redirect: "/settings" } });
    }
  },
});
```

### Code Splitting

```typescript
// assets.tsx - Critical options
export const Route = createFileRoute("/assets")({
  loader: async () => fetchAssets(),
});

// assets.lazy.tsx - Non-critical options
import { createLazyFileRoute } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/assets")({
  component: AssetList,
  pendingComponent: LoadingSpinner,
});
```

**For code splitting patterns**, see [code-splitting.md](references/code-splitting.md).

### TanStack Query Integration

```typescript
import { queryOptions } from "@tanstack/react-query";

const assetQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["assets", id],
    queryFn: () => fetchAsset(id),
  });

export const Route = createFileRoute("/assets/$assetId")({
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData(assetQueryOptions(params.assetId));
  },
});
```

**For Query integration patterns**, see [integration-patterns.md](references/integration-patterns.md).

## Reference Navigation

### Data Loading

- [loader-patterns.md](references/loader-patterns.md) - beforeLoad vs loader, loaderDeps, context flow, parallel loading
- [router-route-loaders.md](references/router-route-loaders.md) - Legacy loader documentation

### Error Handling

- [error-handling.md](references/error-handling.md) - notFoundComponent, errorComponent, pendingComponent, notFound()

### Routing & Navigation

- [file-conventions.md](references/file-conventions.md) - Complete file naming reference ($param, \_layout, (groups))
- [router-routing-guide.md](references/router-routing-guide.md) - Comprehensive routing guide
- [router-navigation-patterns.md](references/router-navigation-patterns.md) - Navigation strategies

### Advanced Patterns

- [code-splitting.md](references/code-splitting.md) - Lazy loading with .lazy.tsx, bundle optimization
- [search-validation.md](references/search-validation.md) - Search param validation with Zod adapter
- [integration-patterns.md](references/integration-patterns.md) - TanStack Query + Router integration

## Anti-Patterns

**❌ Don't use string routes:**

```typescript
navigate("/assets/" + assetId); // No type safety
```

**✅ Use type-safe params:**

```typescript
navigate({ to: "/assets/$assetId", params: { assetId } });
```

**❌ Don't fetch in components:**

```typescript
const { data } = useQuery(["assets", assetId], fetchAsset); // Loading flicker
```

**✅ Fetch in loaders:**

```typescript
loader: ({ params, context }) =>
  context.queryClient.ensureQueryData(assetQueryOptions(params.assetId));
```

**❌ Don't skip search validation:**

```typescript
const search = Route.useSearch() as { page?: number }; // No validation
```

**✅ Validate with Zod:**

```typescript
validateSearch: zodValidator(z.object({ page: z.number().default(1) }));
```

## Chariot Patterns

### Asset Detail with Tabs

```typescript
export const Route = createFileRoute("/assets/$assetId")({
  validateSearch: z.object({
    tab: z.enum(["details", "risks", "attributes"]).default("details"),
  }),
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData(assetQueryOptions(params.assetId));
  },
});
```

### Table Filters Synced to URL

```typescript
const searchSchema = z.object({
  status: z.enum(["active", "inactive"]).optional(),
  page: z.number().default(1),
  pageSize: z.number().default(20),
});

export const Route = createFileRoute("/assets")({
  validateSearch: zodValidator(searchSchema),
});
```

## Related Skills

- `using-tanstack-query` - Query + Router state management
- `frontend-testing-patterns` - Testing router navigation

## Official Documentation

- [TanStack Router Docs](https://tanstack.com/router/latest)
- [File-Based Routing](https://tanstack.com/router/latest/docs/framework/react/guide/file-based-routing)
- [Route Loaders](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading)
