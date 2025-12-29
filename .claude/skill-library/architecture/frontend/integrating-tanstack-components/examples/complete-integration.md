# Complete Integration Example

**Production-ready example integrating Router, Query, Table, and Virtual.**

## Overview

This example demonstrates a fully integrated TanStack stack for a paginated, sortable, filterable, virtualized data table with type-safe routing.

## Project Setup

### Dependencies (package.json)

```json
{
  "dependencies": {
    "@tanstack/react-router": "^1.58.0",
    "@tanstack/react-query": "^5.56.0",
    "@tanstack/react-table": "^8.20.0",
    "@tanstack/react-virtual": "^3.10.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

## File Structure

```
src/
├── api/
│   └── users.ts           # Query options and API types
├── routes/
│   ├── __root.tsx         # Root route with QueryClient context
│   └── users.tsx          # Users route with loader
├── components/
│   └── UsersTable.tsx     # Virtualized table component
├── router.tsx             # Router configuration
└── main.tsx               # App entry point
```

## Implementation

### 1. API Layer (api/users.ts)

```typescript
import { queryOptions } from "@tanstack/react-query";

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive";
  createdAt: string;
}

export interface UserSearchParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  status?: string;
  search?: string;
}

export interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalRows: number;
  };
}

// API function
async function fetchUsers(params: UserSearchParams): Promise<UsersResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set("page", String(params.page));
  searchParams.set("pageSize", String(params.pageSize));
  if (params.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);
  if (params.status) searchParams.set("status", params.status);
  if (params.search) searchParams.set("search", params.search);

  const response = await fetch(`/api/users?${searchParams}`);
  if (!response.ok) throw new Error("Failed to fetch users");
  return response.json();
}

// Query options factory - reusable across loaders and components
export const usersQueryOptions = (params: UserSearchParams) =>
  queryOptions({
    queryKey: ["users", params] as const,
    queryFn: () => fetchUsers(params),
    staleTime: 30 * 1000, // 30 seconds
  });
```

### 2. Router Configuration (router.tsx)

```typescript
import { createRouter, createRootRouteWithContext } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'

// Router context type
interface RouterContext {
  queryClient: QueryClient
}

// Root route with context
const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})

function RootLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm p-4">
        <Link to="/users">Users</Link>
      </nav>
      <main className="container mx-auto p-4">
        <Outlet />
      </main>
    </div>
  )
}

// Import route tree (generated or manual)
import { routeTree } from './routeTree.gen'

// Create router
export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreloadStaleTime: 0,
  })
}

// Type declaration for router
declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
```

### 3. Users Route (routes/users.tsx)

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { usersQueryOptions, UserSearchParams } from '@/api/users'
import { UsersTable } from '@/components/UsersTable'

export const Route = createFileRoute('/users')({
  // Validate and parse search params with defaults
  validateSearch: (search: Record<string, unknown>): UserSearchParams => ({
    page: Math.max(1, Number(search.page) || 1),
    pageSize: [10, 25, 50, 100].includes(Number(search.pageSize))
      ? Number(search.pageSize)
      : 25,
    sortBy: typeof search.sortBy === 'string' ? search.sortBy : undefined,
    sortOrder: search.sortOrder === 'desc' ? 'desc' : 'asc',
    status: typeof search.status === 'string' ? search.status : undefined,
    search: typeof search.search === 'string' ? search.search : undefined,
  }),

  // Declare search params that affect the loader
  loaderDeps: ({ search }) => search,

  // Prefetch data in loader
  loader: ({ context: { queryClient }, deps }) =>
    queryClient.ensureQueryData(usersQueryOptions(deps)),

  component: UsersPage,
})

function UsersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Users</h1>
      <UsersTable />
    </div>
  )
}
```

### 4. Virtualized Table Component (components/UsersTable.tsx)

```typescript
import { useRef, useMemo, useCallback } from 'react'
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  PaginationState,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Route } from '@/routes/users'
import { usersQueryOptions, User } from '@/api/users'

export function UsersTable() {
  const containerRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  // Get search params from Router
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  // Fetch data with Query (already prefetched in loader)
  const { data } = useSuspenseQuery(usersQueryOptions(search))

  // Memoize columns
  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        size: 200,
      },
      {
        accessorKey: 'email',
        header: 'Email',
        size: 250,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        size: 100,
        cell: ({ getValue }) => {
          const status = getValue<User['status']>()
          return (
            <span
              className={`px-2 py-1 rounded text-xs ${
                status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {status}
            </span>
          )
        },
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        size: 150,
        cell: ({ getValue }) =>
          new Date(getValue<string>()).toLocaleDateString(),
      },
    ],
    []
  )

  // Sorting change handler
  const handleSortingChange = useCallback(
    (updater: SortingState | ((old: SortingState) => SortingState)) => {
      const currentSorting = search.sortBy
        ? [{ id: search.sortBy, desc: search.sortOrder === 'desc' }]
        : []
      const next = typeof updater === 'function' ? updater(currentSorting) : updater
      navigate({
        search: {
          ...search,
          page: 1, // Reset to page 1 on sort change
          sortBy: next[0]?.id,
          sortOrder: next[0]?.desc ? 'desc' : 'asc',
        },
      })
    },
    [search, navigate]
  )

  // Pagination change handler
  const handlePaginationChange = useCallback(
    (updater: PaginationState | ((old: PaginationState) => PaginationState)) => {
      const current = { pageIndex: search.page - 1, pageSize: search.pageSize }
      const next = typeof updater === 'function' ? updater(current) : updater
      navigate({
        search: {
          ...search,
          page: next.pageIndex + 1,
          pageSize: next.pageSize,
        },
      })
    },
    [search, navigate]
  )

  // Create table instance
  const table = useReactTable({
    data: data.users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    // Server-side operations
    manualSorting: true,
    manualPagination: true,
    // Pagination counts
    pageCount: data.pagination.totalPages,
    rowCount: data.pagination.totalRows,
    // State from Router
    state: {
      sorting: search.sortBy
        ? [{ id: search.sortBy, desc: search.sortOrder === 'desc' }]
        : [],
      pagination: {
        pageIndex: search.page - 1,
        pageSize: search.pageSize,
      },
    },
    // Handlers update Router
    onSortingChange: handleSortingChange,
    onPaginationChange: handlePaginationChange,
  })

  const { rows } = table.getRowModel()

  // Create virtualizer for rows
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 48,
    overscan: 10,
  })

  // Prefetch adjacent pages
  const prefetchPage = useCallback(
    (page: number) => {
      if (page > 0 && page <= data.pagination.totalPages) {
        queryClient.prefetchQuery(usersQueryOptions({ ...search, page }))
      }
    },
    [queryClient, search, data.pagination.totalPages]
  )

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Filters */}
      <div className="p-4 border-b flex gap-4">
        <input
          type="text"
          placeholder="Search..."
          className="px-3 py-2 border rounded"
          value={search.search ?? ''}
          onChange={(e) =>
            navigate({ search: { ...search, page: 1, search: e.target.value || undefined } })
          }
        />
        <select
          className="px-3 py-2 border rounded"
          value={search.status ?? ''}
          onChange={(e) =>
            navigate({ search: { ...search, page: 1, status: e.target.value || undefined } })
          }
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Virtualized Table */}
      <div
        ref={containerRef}
        className="overflow-auto"
        style={{ height: '500px', contain: 'strict' }}
      >
        <table className="w-full">
          <thead className="sticky top-0 bg-gray-50 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100"
                    style={{ width: header.getSize() }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{
                      asc: ' ↑',
                      desc: ' ↓',
                    }[header.column.getIsSorted() as string] ?? ''}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
        </table>

        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index]
            return (
              <div
                key={row.id}
                className="absolute top-0 left-0 w-full flex border-b hover:bg-gray-50"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <div
                    key={cell.id}
                    className="px-4 py-3 flex items-center"
                    style={{ width: cell.column.getSize() }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* Pagination */}
      <div className="p-4 border-t flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Showing {(search.page - 1) * search.pageSize + 1} to{' '}
          {Math.min(search.page * search.pageSize, data.pagination.totalRows)} of{' '}
          {data.pagination.totalRows} results
        </div>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            disabled={search.page <= 1}
            onClick={() => navigate({ search: { ...search, page: search.page - 1 } })}
            onMouseEnter={() => prefetchPage(search.page - 1)}
          >
            Previous
          </button>
          <span className="px-3 py-1">
            Page {search.page} of {data.pagination.totalPages}
          </span>
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            disabled={search.page >= data.pagination.totalPages}
            onClick={() => navigate({ search: { ...search, page: search.page + 1 } })}
            onMouseEnter={() => prefetchPage(search.page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
```

### 5. App Entry Point (main.tsx)

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { createAppRouter } from './router'

// Create QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
    },
  },
})

// Create Router with QueryClient context
const router = createAppRouter(queryClient)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
)
```

## Key Integration Points

| Integration      | Pattern                                                                |
| ---------------- | ---------------------------------------------------------------------- |
| Router → Query   | `ensureQueryData` in route loader with `loaderDeps`                    |
| Router → Table   | Table state from `Route.useSearch()`, handlers call `navigate()`       |
| Query → Table    | `useSuspenseQuery` feeds data to `useReactTable`                       |
| Table → Virtual  | `table.getRowModel().rows` provides count and data to `useVirtualizer` |
| Virtual → Router | Scroll position preserved by Router automatically                      |

## Benefits

1. **No Waterfalls**: Data prefetched in route loader
2. **URL as State**: Pagination, sorting, filtering in URL (shareable, bookmarkable)
3. **Type Safety**: End-to-end TypeScript inference
4. **Performance**: Virtualization for large datasets
5. **Caching**: Query cache with stale-while-revalidate
6. **Prefetching**: Adjacent pages prefetched on hover

## Related

- [Router + Query Integration](../references/router-query-integration.md)
- [Query + Table Integration](../references/query-table-integration.md)
- [Table + Virtual Integration](../references/table-virtual-integration.md)
