---
name: frontend-tanstack
description: Use when using TanStack Query (data fetching), Router (navigation), Table (data display) - includes v5 patterns, integration examples
allowed-tools: Read, Write, Edit, Bash, Grep, TodoWrite
---

# TanStack Ecosystem

**Unified guide for TanStack Query v5, Router, and Table v8 with integration patterns.**

---

## When to Use This Skill

- **Data fetching and caching** → TanStack Query
- **File-based routing** → TanStack Router
- **Data tables with pagination/filtering/sorting** → TanStack Table
- **Integration patterns** → Query + Table, Query + Router, Table + Router

**You MUST use TodoWrite before starting** to track all implementation steps.

---

## Overview

The TanStack ecosystem provides three powerful, headless libraries that work exceptionally well together:

**TanStack Query (v5):** Server state management with intelligent caching, automatic background refetching, and optimistic updates. Replaces useEffect-based data fetching with declarative queries and mutations.

**TanStack Router:** Type-safe, file-based routing with route loaders for data prefetching, search param validation, and automatic code splitting. Built for modern React applications.

**TanStack Table (v8):** Headless table logic for building data tables without opinionated UI. Handles pagination, sorting, filtering with full control over rendering.

**Why integrate?** Using these libraries together unlocks patterns impossible with separate tools:
- Server-paginated tables with instant cached navigation (Query + Table)
- Route loaders that prefetch query data before rendering (Query + Router)
- URL-persistent table state for shareable filtered views (Table + Router)

---

## Integration Patterns ⭐

These patterns provide the unique value of this consolidated skill.

### Query + Table: Server-Side Pagination with Caching

**Pattern:** TanStack Query handles data fetching/caching, TanStack Table handles display and user interactions.

**When to Use:** Tables with 100+ rows, server-side filtering/sorting, or frequently changing data that benefits from caching.

**Example:**

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useReactTable, getCoreRowModel, PaginationState } from '@tanstack/react-table'
import { useState } from 'react'

function ServerPaginatedTable() {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })

  // Query handles data + caching
  const { data, isLoading } = useQuery({
    queryKey: ['users', pagination.pageIndex, pagination.pageSize],
    queryFn: () => fetchUsers(pagination),
    placeholderData: keepPreviousData, // No flicker between pages
  })

  // Table handles display + interactions
  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true, // Server handles pagination
    pageCount: data?.pagination.pageCount ?? 0,
    state: { pagination },
    onPaginationChange: setPagination,
  })

  if (isLoading) return <div>Loading...</div>
  return <table>{/* render rows */}</table>
}
```

**Key Benefits:**
- Instant back navigation (cached data)
- No page flicker (placeholderData)
- Automatic cache coordination

**Deep Dive:** [integration-patterns.md#query-table](references/integration-patterns.md#query-table)

---

### Query + Router: Route Loaders & Prefetching

**Pattern:** Router loaders prefetch Query data before navigation, cached for instant rendering.

**When to Use:** Multi-step flows, dashboard navigation, or data-heavy routes where you want to eliminate loading spinners.

**Example:**

```typescript
// routes/posts/$postId.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params, context }) => {
    // Prefetch before rendering
    await context.queryClient.ensureQueryData({
      queryKey: ['post', params.postId],
      queryFn: () => postsApi.get(params.postId),
    })
  },
  component: PostDetails,
})

function PostDetails() {
  const { postId } = Route.useParams()
  const { data: post } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => postsApi.get(postId),
    // Data already in cache from loader - no loading state!
  })

  return <h1>{post.title}</h1>
}
```

**Key Benefits:**
- No loading spinners on navigation
- Hover prefetch for instant perceived performance
- Automatic cache reuse

**Deep Dive:** [integration-patterns.md#query-router](references/integration-patterns.md#query-router)

---

### Table + Router: URL State Synchronization

**Pattern:** Synchronize table state (pagination, filters, sorting) with URL search params for persistent, shareable state.

**When to Use:** When you need bookmarkable table configurations or want browser back/forward to preserve table state.

**Example:**

```typescript
import { useNavigate } from '@tanstack/react-router'
import { z } from 'zod'

const tableSearchSchema = z.object({
  page: z.number().default(0),
  pageSize: z.number().default(20),
  search: z.string().default(''),
})

export const Route = createFileRoute('/users')({
  validateSearch: tableSearchSchema,
  component: UsersTable,
})

function UsersTable() {
  const navigate = useNavigate()
  const search = Route.useSearch()

  const pagination = useMemo(() => ({
    pageIndex: search.page,
    pageSize: search.pageSize,
  }), [search.page, search.pageSize])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { pagination },
    onPaginationChange: (updater) => {
      const newPagination = typeof updater === 'function' ? updater(pagination) : updater
      navigate({ to: '.', search: { page: newPagination.pageIndex } })
    },
  })

  return <table>{/* URL: /users?page=2&pageSize=20 */}</table>
}
```

**Key Benefits:**
- Shareable URLs with exact table state
- Browser back/forward preserves state
- Bookmarkable filtered views

**Deep Dive:** [integration-patterns.md#table-router](references/integration-patterns.md#table-router)

---

## TanStack Query - Server State Management

### Quick Start

**Installation:**
```bash
npm install @tanstack/react-query@latest
npm install -D @tanstack/react-query-devtools@latest
```

**Setup:**
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60, // 1 hour (formerly cacheTime in v4)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

### Essential Patterns

**Basic Query:**
```tsx
import { useQuery } from '@tanstack/react-query'

export function useTodos() {
  return useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  })
}

// Usage:
const { data, isPending, isError, error } = useTodos()
if (isPending) return <div>Loading...</div>
if (isError) return <div>Error: {error.message}</div>
return <ul>{data.map(todo => <li key={todo.id}>{todo.title}</li>)}</ul>
```

**Basic Mutation:**
```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useCreateTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })
}

// Usage:
const createTodo = useCreateTodo()
createTodo.mutate({ title: 'New todo', completed: false })
```

### Critical v5 Changes

1. **Object syntax required** (no more v4 array syntax)
   ```tsx
   // ✅ v5: Object syntax
   useQuery({ queryKey: ['todos'], queryFn: fetchTodos })

   // ❌ v4: Array syntax (removed)
   useQuery(['todos'], fetchTodos)
   ```

2. **`gcTime` not `cacheTime`** (renamed in v5)
3. **`isPending` for initial loading** (not `isLoading`)
4. **`initialPageParam` required** for infinite queries
5. **Callbacks moved to mutate calls** (not in hook config)

### Query Key Design Principles

Query keys are the foundation of TanStack Query's caching. **Unstable keys = infinite refetches**.

**Problem: Complex objects create new references every render:**
```tsx
// ❌ WRONG: New object = new fetch every render
const filters = { status: 'active', search: term };
useQuery({ queryKey: ['todos', filters], queryFn: ... });  // Refetches constantly!
```

**Solutions for stable keys:**
```tsx
// ✅ Option 1: Primitives only
useQuery({ queryKey: ['todos', status, search, page], queryFn: ... });

// ✅ Option 2: JSON.stringify for complex objects
const filterKey = JSON.stringify({ status, search, sort });
useQuery({ queryKey: ['todos', filterKey], queryFn: ... });

// ✅ Option 3: Query key factory pattern
export const todoKeys = {
  all: ['todos'] as const,
  list: (filters: Filters) => [...todoKeys.all, 'list', filters] as const,
  detail: (id: string) => [...todoKeys.all, 'detail', id] as const,
};
useQuery({ queryKey: todoKeys.list({ status: 'active' }), queryFn: ... });
```

**Deep Dive:** [references/query-best-practices.md#query-key-design-principles](references/query-best-practices.md)

### Common Patterns

**Query with filters:**
```tsx
useQuery({
  queryKey: ['todos', filters], // Include filters in key
  queryFn: () => fetchTodos(filters),
})
```

**Dependent queries:**
```tsx
useQuery({
  queryKey: ['todos', userId],
  queryFn: () => fetchUserTodos(userId!),
  enabled: !!userId, // Only run when userId exists
})
```

**Optimistic updates:**
```tsx
useMutation({
  mutationFn: updateTodo,
  onMutate: async (updatedTodo) => {
    await queryClient.cancelQueries({ queryKey: ['todos'] })
    const previousTodos = queryClient.getQueryData(['todos'])
    queryClient.setQueryData(['todos'], (old) => /* update */)
    return { previousTodos }
  },
  onError: (err, updatedTodo, context) => {
    queryClient.setQueryData(['todos'], context?.previousTodos)
  },
})
```

### useInfiniteQuery Re-execution Patterns

When re-running an infinite query with the **same parameters** (e.g., user clicks "Run Query" again):

**Use `refetch()`, not `enabled` toggling:**
```tsx
const infiniteQuery = useInfiniteQuery({
  queryKey: ['items', filters],
  queryFn: fetchItems,
  enabled: !!filters,
  initialPageParam: 0,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});

const handleRunQuery = async (newFilters: Filters) => {
  if (isEqual(newFilters, filters) && infiniteQuery.data) {
    // CORRECT: Same params - use refetch()
    await infiniteQuery.refetch();
  } else {
    // Different params - update state (changes query key)
    setFilters(newFilters);
  }
};
```

**Avoid stale closures with Zustand:**
```tsx
// WRONG: Captures stale value
const { filters } = useMyStore();
const handleComplete = (data) => {
  console.log(filters);  // May be stale!
};

// CORRECT: Read fresh state
const handleComplete = (data) => {
  const { filters } = useMyStore.getState();  // Always fresh
  console.log(filters);
};
```

**Critical Rules:**
1. **Never toggle `enabled` for re-execution** - causes race conditions
2. **Use `refetch()` for same-parameter re-runs** - resets all pages
3. **Read fresh state from Zustand** - avoid closure staleness
4. **Reset completion guards before triggering** - ensures handlers fire

**Deep Dive:** [references/query-infinite-scroll-patterns.md](references/query-infinite-scroll-patterns.md)

### Error Handling Patterns

**Conditional retry based on HTTP status:**
```tsx
useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  retry: (failureCount, error) => {
    // Don't retry client errors (4xx)
    const status = (error as any).status;
    if (status >= 400 && status < 500) return false;
    return failureCount < 3;  // Retry server errors up to 3 times
  },
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});
```

**Wiring refetch to retry buttons:**
```tsx
const { data, isPending, isError, error, refetch } = useQuery({ ... });

if (isError) {
  return (
    <ErrorState
      message={error.message}
      onRetry={() => refetch()}  // Wire refetch directly
    />
  );
}
```

**Error boundary integration:**
```tsx
useQuery({
  queryKey: ['critical-data'],
  queryFn: fetchCriticalData,
  throwOnError: (error) => error.status >= 500,  // Only 5xx to boundary
});
```

**Deep Dive:** [references/query-best-practices.md#error-handling-patterns](references/query-best-practices.md)

### Advanced Topics

- **Optimistic updates:** [references/query-best-practices.md#optimistic-updates](references/query-best-practices.md)
- **Infinite scroll:** [references/query-common-patterns.md#infinite-scroll](references/query-common-patterns.md)
- **Infinite query re-execution:** [references/query-infinite-scroll-patterns.md](references/query-infinite-scroll-patterns.md) (refetch patterns, stale closures)
- **SSR/Hydration:** [references/query-ssr-hydration.md](references/query-ssr-hydration.md)
- **Performance optimization:** [references/query-performance-optimization.md](references/query-performance-optimization.md)
- **v4 to v5 migration:** [references/query-v4-to-v5-migration.md](references/query-v4-to-v5-migration.md)

---

## TanStack Router - Type-Safe Routing

### File-Based Routing

**Directory Structure:**
```
routes/
├── __root.tsx          # Root route
├── index.tsx           # /
├── posts/
│   ├── index.tsx       # /posts
│   └── $postId.tsx     # /posts/:postId
```

**File → URL Mapping:**
- `routes/index.tsx` → `/`
- `routes/posts/index.tsx` → `/posts`
- `routes/posts/$postId.tsx` → `/posts/:postId`

### Basic Route

```typescript
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posts')({
  loader: async () => {
    const posts = await postsApi.getAll()
    return { posts }
  },
  component: PostsPage,
})

function PostsPage() {
  const { posts } = Route.useLoaderData()
  return <div>{posts.map(post => <PostCard key={post.id} post={post} />)}</div>
}
```

### Route Parameters

```typescript
// routes/posts/$postId.tsx
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => {
    const post = await postsApi.get(params.postId)
    return { post }
  },
  component: PostDetails,
})

function PostDetails() {
  const { post } = Route.useLoaderData()
  const { postId } = Route.useParams()
  return <h1>{post.title}</h1>
}
```

### Navigation

```typescript
import { Link, useNavigate } from '@tanstack/react-router'

// Link component (type-safe)
<Link to="/posts/$postId" params={{ postId: '123' }}>View Post</Link>

// Programmatic navigation
const navigate = useNavigate()
navigate({ to: '/posts', search: { filter: 'published' } })
```

### Lazy Loading

```typescript
import { lazy } from 'react'

const PostsPage = lazy(() => import('~/features/posts/PostsPage'))

export const Route = createFileRoute('/posts')({
  component: PostsPage,
})
```

### Advanced Topics

- **Advanced routing:** [references/router-routing-guide.md](references/router-routing-guide.md)
- **Route loaders:** [references/router-route-loaders.md](references/router-route-loaders.md)
- **Navigation patterns:** [references/router-navigation-patterns.md](references/router-navigation-patterns.md)

---

## TanStack Table - Headless Data Tables

### Installation

```bash
npm install @tanstack/react-table@latest
npm install @tanstack/react-virtual@latest  # For virtualization
```

### Basic Client-Side Table

```typescript
import { useReactTable, getCoreRowModel, ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'

interface User {
  id: string
  name: string
  email: string
}

const columns: ColumnDef<User>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
]

function UsersTable() {
  // CRITICAL: Memoize to prevent infinite re-renders
  const data = useMemo<User[]>(() => [
    { id: '1', name: 'Alice', email: 'alice@example.com' },
  ], [])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map(headerGroup => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map(header => (
              <th key={header.id}>{header.column.columnDef.header}</th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map(row => (
          <tr key={row.id}>
            {row.getVisibleCells().map(cell => (
              <td key={cell.id}>{cell.renderValue()}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

### Server-Side Pagination

```typescript
function ServerPaginatedTable() {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })

  const { data } = useQuery({
    queryKey: ['users', pagination.pageIndex, pagination.pageSize],
    queryFn: () => fetchUsers(pagination),
  })

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true, // CRITICAL: Server handles pagination
    pageCount: data?.pagination.pageCount ?? 0,
    state: { pagination },
    onPaginationChange: setPagination,
  })

  return <table>{/* render */}</table>
}
```

### Critical Rules

1. **Always memoize data and columns** - Prevents infinite re-renders
2. **Use `manualPagination: true`** for server-side pagination
3. **Include table state in query keys** - `['users', pagination, filters, sorting]`
4. **Use virtualization for 1000+ rows** - TanStack Virtual

### Common Errors

**Infinite re-renders:**
```typescript
// ❌ BAD: New reference every render
const data = [{ id: 1 }]

// ✅ GOOD: Stable reference
const data = useMemo(() => [{ id: 1 }], [])
```

**Server-side not working:**
```typescript
// ❌ BAD: Missing manual flag
manualPagination: false

// ✅ GOOD
manualPagination: true,
pageCount: serverPageCount
```

### Advanced Topics

- **Server patterns:** [references/table-server-side-patterns.md](references/table-server-side-patterns.md)
- **Virtualization:** [references/table-performance-virtualization.md](references/table-performance-virtualization.md)
- **Query integration:** [references/table-query-integration.md](references/table-query-integration.md)
- **Common errors:** [references/table-common-errors.md](references/table-common-errors.md)

---

## Common Patterns Across All Libraries

### TypeScript Configuration

All three libraries provide excellent TypeScript support:

```typescript
// Type-safe Query
const { data } = useQuery({
  queryKey: ['user', id],
  queryFn: (): Promise<User> => fetchUser(id),
})
// data is typed as User | undefined

// Type-safe Router
const { userId } = Route.useParams() // Inferred from route path

// Type-safe Table
const columnHelper = createColumnHelper<User>()
const columns = [
  columnHelper.accessor('name', {
    cell: info => info.getValue(), // Fully typed!
  }),
]
```

### Error Boundaries

Coordinate error handling across libraries:

```typescript
// Query error boundaries
<QueryErrorResetBoundary>
  {({ reset }) => (
    <ErrorBoundary onReset={reset}>
      <PostsPage />
    </ErrorBoundary>
  )}
</QueryErrorResetBoundary>

// Router error routes
export const Route = createFileRoute('/posts/$postId')({
  errorComponent: ({ error }) => <ErrorPage error={error} />,
})
```

### Testing Approaches

**Query testing:**
```typescript
const wrapper = ({ children }) => (
  <QueryClientProvider client={testQueryClient}>
    {children}
  </QueryClientProvider>
)

renderHook(() => useTodos(), { wrapper })
```

**Router testing:**
```typescript
const router = createMemoryRouter(routeTree, {
  initialEntries: ['/posts/123'],
})

render(<RouterProvider router={router} />)
```

**Table testing:**
```typescript
const table = useReactTable({
  data: mockData,
  columns: mockColumns,
  getCoreRowModel: getCoreRowModel(),
})

expect(table.getRowModel().rows).toHaveLength(3)
```

### Performance Optimization

**Query:** Use `select` for derived data
```typescript
const { data: count } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  select: (data) => data.length, // Only re-render when count changes
})
```

**Router:** Lazy load heavy routes
```typescript
const AdminPanel = lazy(() => import('~/features/admin/AdminPanel'))
```

**Table:** Virtualize large datasets
```typescript
const rowVirtualizer = useVirtualizer({
  count: rows.length,
  estimateSize: () => 50,
})
```

---

## Production Readiness

### Debug Logging Pattern

```typescript
// Controlled debug flag - disabled by default in production
const DEBUG = import.meta.env.DEV && false;  // Toggle when debugging

const { data } = useQuery({
  queryKey: ['todos', filters],
  queryFn: async () => {
    if (DEBUG) console.log('[DEBUG] Fetching:', filters);
    const result = await fetchTodos(filters);
    if (DEBUG) console.log('[DEBUG] Received:', result.length, 'items');
    return result;
  },
});
```

**Better: Use React Query DevTools instead of console.log**

### Cache Configuration Decision Matrix

| Data Type | staleTime | gcTime | Example |
|-----------|-----------|--------|---------|
| Real-time | 5s | 1min | Stock prices, live feeds |
| User settings | 30s | 5min | Preferences, configs |
| Lists/Tables | 1min | 10min | Search results |
| Static data | `Infinity` | `Infinity` | Countries, categories |
| Infinite scroll | 5min | 30min | Paginated lists |

### Production Checklist

Before deploying, verify:

- [ ] Query keys are stable (no new object references per render)
- [ ] Appropriate staleTime/gcTime for each data type
- [ ] Error handling with user-friendly messages
- [ ] Retry logic excludes 4xx errors
- [ ] Loading states for all pending queries
- [ ] Error boundaries for critical data paths
- [ ] Retry buttons wired to `refetch()`
- [ ] Debug logging disabled or conditional
- [ ] Server data NOT duplicated in client state

**Deep Dive:** [references/query-best-practices.md#production-readiness-checklist](references/query-best-practices.md)

---

## Troubleshooting

### Top 5 Errors Across All Libraries

1. **Query: "Object syntax required"**
   - **Fix:** Use v5 object syntax: `useQuery({ queryKey: [...], queryFn: ... })`

2. **Router: "Loader context not available"**
   - **Fix:** Set up router context: `createRootRouteWithContext<{ queryClient }>()`

3. **Table: "Infinite re-renders"**
   - **Fix:** Memoize data and columns: `const data = useMemo(() => [...], [])`

4. **Integration: "Query keys out of sync"**
   - **Fix:** Include all table state in query key: `['users', pagination, filters, sorting]`

5. **Integration: "URL state causing loops"**
   - **Fix:** Only update URL in table callbacks, not in useEffect

**Complete error reference:** [references/query-top-errors.md](references/query-top-errors.md), [references/table-common-errors.md](references/table-common-errors.md)

**Anti-patterns to avoid:** [references/query-anti-patterns.md](references/query-anti-patterns.md)

---

## Resources

### Official Documentation
- **TanStack Query v5:** https://tanstack.com/query/v5
- **TanStack Router:** https://tanstack.com/router/latest
- **TanStack Table v8:** https://tanstack.com/table/v8

### Skill References

**Query:**
- [API Configuration](references/query-api-configuration.md)
- [Best Practices](references/query-best-practices.md) - Query keys, caching, error handling, production checklist
- [Anti-Patterns](references/query-anti-patterns.md) - What NOT to do, common mistakes
- [Common Patterns](references/query-common-patterns.md)
- [Infinite Scroll Patterns](references/query-infinite-scroll-patterns.md) - Re-execution, stale closures, completion guards
- [Performance Optimization](references/query-performance-optimization.md)
- [SSR/Hydration](references/query-ssr-hydration.md)
- [Testing](references/query-testing.md)
- [TypeScript Patterns](references/query-typescript-patterns.md)
- [v4 to v5 Migration](references/query-v4-to-v5-migration.md)

**Router:**
- [Routing Guide](references/router-routing-guide.md)
- [Navigation Patterns](references/router-navigation-patterns.md)
- [Route Loaders](references/router-route-loaders.md)

**Table:**
- [Server-Side Patterns](references/table-server-side-patterns.md)
- [Query Integration](references/table-query-integration.md)
- [Performance & Virtualization](references/table-performance-virtualization.md)
- [Common Errors](references/table-common-errors.md)
- [Cloudflare D1 Examples](references/table-cloudflare-d1-examples.md)

**Integration:**
- [Integration Patterns](references/integration-patterns.md) ⭐

### Related Skills
- `frontend-react-state-management` - Context API, Zustand
- `frontend-react-hook-form-zod` - Form integration with Query mutations
- `frontend-performance-optimization` - React 19 patterns

### Templates
- Complete working examples in [templates/](templates/)

---

**Last Updated:** 2025-12-11
**Skill Version:** 1.1.0
**Libraries:** @tanstack/react-query v5.9+, @tanstack/react-router latest, @tanstack/react-table v8.21.3+
