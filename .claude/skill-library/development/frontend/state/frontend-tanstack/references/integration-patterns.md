# TanStack Integration Patterns

This document covers integration patterns between TanStack libraries that provide unique value not available when using them separately.

---

## Pattern 1: Query + Table (Server-Side Pagination with Caching)

**Use Case:** Data tables with server-side pagination, filtering, and sorting that need intelligent caching and optimistic updates.

**The Problem:** Without integration, you duplicate state management between Query's cache and Table's pagination state, leading to sync issues and stale data.

**The Solution:** Coordinate query keys with table state for automatic cache invalidation and prefetching.

### Full Implementation

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useReactTable, getCoreRowModel, PaginationState, SortingState, ColumnFiltersState } from '@tanstack/react-table'
import { useState } from 'react'

interface User {
  id: string
  name: string
  email: string
}

interface UsersResponse {
  data: User[]
  pagination: {
    page: number
    pageSize: number
    total: number
    pageCount: number
  }
}

function ServerPaginatedTable() {
  // Table state
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const queryClient = useQueryClient()

  // Query handles data fetching + caching
  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['users', pagination.pageIndex, pagination.pageSize, sorting, columnFilters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: pagination.pageIndex.toString(),
        pageSize: pagination.pageSize.toString(),
        sortBy: sorting[0]?.id || '',
        sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
        search: columnFilters.find(f => f.id === 'search')?.value as string || '',
      })
      const response = await fetch(`/api/users?${params}`)
      return response.json() as Promise<UsersResponse>
    },
    placeholderData: keepPreviousData, // Keep showing old data while fetching new
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Prefetch next page for instant navigation
  const prefetchNextPage = () => {
    if (!data?.pagination.pageCount) return
    if (pagination.pageIndex + 1 >= data.pagination.pageCount) return

    queryClient.prefetchQuery({
      queryKey: ['users', pagination.pageIndex + 1, pagination.pageSize, sorting, columnFilters],
      queryFn: async () => {
        const params = new URLSearchParams({
          page: (pagination.pageIndex + 1).toString(),
          pageSize: pagination.pageSize.toString(),
          sortBy: sorting[0]?.id || '',
          sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
        })
        const response = await fetch(`/api/users?${params}`)
        return response.json()
      },
    })
  }

  // Table handles display + user interactions
  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: data?.pagination.pageCount ?? 0,
    state: { pagination, sorting, columnFilters },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
  })

  // Prefetch on pagination UI hover
  const handleNextHover = () => prefetchNextPage()

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      <table>{/* render table */}</table>

      <div className="pagination">
        <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          Previous
        </button>
        <button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage() || isPlaceholderData}
          onMouseEnter={handleNextHover}
        >
          Next
        </button>
      </div>
    </div>
  )
}
```

**Key Benefits:**
- Instant back navigation (cached data)
- Prefetched forward navigation (hover prefetch)
- No flicker between pages (placeholderData)
- Automatic cache coordination

---

## Pattern 2: Query + Router (Route Loaders with Prefetching)

**Use Case:** Multi-step flows or dashboards where you want instant navigation without loading spinners.

**The Problem:** Without integration, navigation shows loading states even when data could be prefetched, leading to perceived slowness.

**The Solution:** Use Router loaders to prefetch Query data before navigation, with automatic cache reuse.

### Full Implementation

```typescript
// routes/posts/$postId.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { postsApi } from '~/api/posts'

export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params, context }) => {
    // Prefetch in loader (runs before render)
    await context.queryClient.ensureQueryData({
      queryKey: ['post', params.postId],
      queryFn: () => postsApi.get(params.postId),
    })
  },
  component: PostDetails,
})

function PostDetails() {
  const { postId } = Route.useParams()

  // Data is already cached from loader
  const { data: post } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => postsApi.get(postId),
    // Data guaranteed to be in cache, so no loading state
  })

  return <h1>{post.title}</h1>
}

// routes/posts/index.tsx - List page with prefetch on hover
function PostsList() {
  const queryClient = useQueryClient()
  const { data: posts } = useQuery({
    queryKey: ['posts'],
    queryFn: postsApi.getAll,
  })

  const prefetchPost = (id: string) => {
    queryClient.prefetchQuery({
      queryKey: ['post', id],
      queryFn: () => postsApi.get(id),
    })
  }

  return (
    <ul>
      {posts.map(post => (
        <li key={post.id}>
          <Link
            to="/posts/$postId"
            params={{ postId: post.id }}
            onMouseEnter={() => prefetchPost(post.id)}
          >
            {post.title}
          </Link>
        </li>
      ))}
    </ul>
  )
}
```

**Router Context Setup:**

```typescript
// routes/__root.tsx
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
})

// main.tsx
const queryClient = new QueryClient()

const router = createRouter({
  routeTree,
  context: { queryClient },
})
```

**Key Benefits:**
- No loading spinners on navigation (data prefetched)
- Hover prefetch for instant perceived performance
- Automatic cache reuse (no duplicate requests)
- Invalidation on mutations works across routes

---

## Pattern 3: Table + Router (URL State Synchronization)

**Use Case:** Shareable table states (pagination, filters, sorting) via URL for bookmarking and deep linking.

**The Problem:** Table state lives in React state, so refreshing the page or sharing URLs loses all filters and pagination.

**The Solution:** Synchronize table state with Router search params for persistent, shareable state.

### Full Implementation

```typescript
import { useNavigate } from '@tanstack/react-router'
import { useReactTable, PaginationState, SortingState, ColumnFiltersState } from '@tanstack/react-table'
import { useMemo } from 'react'
import { z } from 'zod'

// Define search params schema
const tableSearchSchema = z.object({
  page: z.number().default(0),
  pageSize: z.number().default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().default(''),
})

export const Route = createFileRoute('/users')({
  validateSearch: tableSearchSchema,
  component: UsersTable,
})

function UsersTable() {
  const navigate = useNavigate()
  const search = Route.useSearch()

  // Derive table state from URL
  const pagination = useMemo<PaginationState>(() => ({
    pageIndex: search.page,
    pageSize: search.pageSize,
  }), [search.page, search.pageSize])

  const sorting = useMemo<SortingState>(() => {
    if (!search.sortBy) return []
    return [{ id: search.sortBy, desc: search.sortOrder === 'desc' }]
  }, [search.sortBy, search.sortOrder])

  const columnFilters = useMemo<ColumnFiltersState>(() => {
    if (!search.search) return []
    return [{ id: 'search', value: search.search }]
  }, [search.search])

  // Update URL when table state changes
  const updateSearch = (updates: Partial<typeof search>) => {
    navigate({
      to: '.',
      search: (prev) => ({ ...prev, ...updates }),
    })
  }

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
    state: { pagination, sorting, columnFilters },
    onPaginationChange: (updater) => {
      const newPagination = typeof updater === 'function' ? updater(pagination) : updater
      updateSearch({
        page: newPagination.pageIndex,
        pageSize: newPagination.pageSize,
      })
    },
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater
      updateSearch({
        sortBy: newSorting[0]?.id,
        sortOrder: newSorting[0]?.desc ? 'desc' : 'asc',
      })
    },
    onColumnFiltersChange: (updater) => {
      const newFilters = typeof updater === 'function' ? updater(columnFilters) : updater
      const searchFilter = newFilters.find(f => f.id === 'search')
      updateSearch({ search: searchFilter?.value as string || '' })
    },
  })

  return <table>{/* render */}</table>
}
```

**URL Example:**
```
/users?page=2&pageSize=20&sortBy=name&sortOrder=asc&search=john
```

**Key Benefits:**
- Shareable URLs with exact table state
- Browser back/forward preserves table state
- Bookmarkable filtered views
- Deep linking to specific table configurations

---

## Pattern 4: Query + Table + Router (Complete Integration)

**Use Case:** Production-ready data tables with URL persistence, server-side operations, and intelligent caching.

**The Solution:** Combine all three patterns for the ultimate data table experience.

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useReactTable, getCoreRowModel } from '@tanstack/react-table'
import { useMemo } from 'react'
import { z } from 'zod'

const tableSearchSchema = z.object({
  page: z.number().default(0),
  pageSize: z.number().default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().default(''),
})

export const Route = createFileRoute('/users')({
  validateSearch: tableSearchSchema,
  loader: async ({ context, search }) => {
    // Prefetch initial page data
    await context.queryClient.ensureQueryData({
      queryKey: ['users', search.page, search.pageSize, search.sortBy, search.sortOrder, search.search],
      queryFn: () => fetchUsers(search),
    })
  },
  component: UsersTable,
})

function UsersTable() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const queryClient = useQueryClient()

  // Derive table state from URL (Pattern 3)
  const pagination = useMemo(() => ({
    pageIndex: search.page,
    pageSize: search.pageSize,
  }), [search.page, search.pageSize])

  // Query coordination (Pattern 1)
  const { data, isLoading } = useQuery({
    queryKey: ['users', search.page, search.pageSize, search.sortBy, search.sortOrder, search.search],
    queryFn: () => fetchUsers(search),
    placeholderData: keepPreviousData,
  })

  // Prefetch next page (Pattern 2)
  const prefetchNextPage = () => {
    if (search.page + 1 < (data?.pagination.pageCount || 0)) {
      queryClient.prefetchQuery({
        queryKey: ['users', search.page + 1, search.pageSize, search.sortBy, search.sortOrder, search.search],
        queryFn: () => fetchUsers({ ...search, page: search.page + 1 }),
      })
    }
  }

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: data?.pagination.pageCount ?? 0,
    state: { pagination },
    onPaginationChange: (updater) => {
      const newPagination = typeof updater === 'function' ? updater(pagination) : updater
      navigate({
        to: '.',
        search: (prev) => ({ ...prev, page: newPagination.pageIndex }),
      })
    },
  })

  return (
    <div>
      <table>{/* render */}</table>
      <button onMouseEnter={prefetchNextPage} onClick={() => table.nextPage()}>
        Next
      </button>
    </div>
  )
}
```

**Key Benefits (All Combined):**
- ✅ Shareable URLs with table state
- ✅ Browser back/forward works
- ✅ Instant cached navigation
- ✅ Prefetched next page
- ✅ No loading flicker
- ✅ Server-side pagination/filtering/sorting
- ✅ Automatic cache invalidation

---

## Common Integration Pitfalls

### Pitfall 1: Query Keys Out of Sync with Table State

**❌ Problem:**
```typescript
const { data } = useQuery({
  queryKey: ['users'], // Missing pagination!
  queryFn: () => fetch(`/api/users?page=${pagination.pageIndex}`)
})
```

**✅ Solution:**
```typescript
const { data } = useQuery({
  queryKey: ['users', pagination.pageIndex, pagination.pageSize],
  queryFn: () => fetch(`/api/users?page=${pagination.pageIndex}`)
})
```

### Pitfall 2: Forgetting Router Context for Query Client

**❌ Problem:**
```typescript
// Loader tries to use queryClient but context not set up
loader: async ({ params }) => {
  await queryClient.prefetchQuery(...) // queryClient not available!
}
```

**✅ Solution:**
```typescript
// Set up context in root route
interface RouterContext { queryClient: QueryClient }
export const Route = createRootRouteWithContext<RouterContext>()()

// Use in router creation
const router = createRouter({ routeTree, context: { queryClient } })
```

### Pitfall 3: URL State Causing Infinite Loops

**❌ Problem:**
```typescript
// Updates URL on every render
useEffect(() => {
  navigate({ search: { page: pagination.pageIndex } })
}, [pagination]) // Triggers infinite loop
```

**✅ Solution:**
```typescript
// Only update URL in table callbacks
onPaginationChange: (updater) => {
  const newPagination = typeof updater === 'function' ? updater(pagination) : updater
  navigate({ search: { page: newPagination.pageIndex } })
}
```

---

## Related Resources

- **Query Advanced Patterns:** [query-api-configuration.md](query-api-configuration.md)
- **Router Loaders:** [router-route-loaders.md](router-route-loaders.md)
- **Table Server Patterns:** [table-server-side-patterns.md](table-server-side-patterns.md)
- **Table Query Integration:** [table-query-integration.md](table-query-integration.md)
