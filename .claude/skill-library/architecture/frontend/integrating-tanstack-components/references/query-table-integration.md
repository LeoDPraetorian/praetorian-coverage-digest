# Query + Table Integration

**Deep dive on integrating TanStack Query with TanStack Table for data-driven tables.**

## Overview

TanStack Table is a **headless** table library - it provides logic (sorting, filtering, pagination) but no UI. TanStack Query provides data fetching and caching. Together, they create powerful, performant data tables.

## Core Integration Pattern

### Basic Query + Table Setup

```typescript
import { useQuery } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table'

interface User {
  id: string
  name: string
  email: string
  status: 'active' | 'inactive'
}

const columns: ColumnDef<User>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'status', header: 'Status' },
]

function UsersTable() {
  // Fetch data with Query
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  })

  // Create table instance with fetched data
  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (isLoading) return <TableSkeleton />
  if (error) return <TableError error={error} />

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map(headerGroup => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map(header => (
              <th key={header.id}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map(row => (
          <tr key={row.id}>
            {row.getVisibleCells().map(cell => (
              <td key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

## Client-Side vs Server-Side Operations

### Client-Side (Small Datasets < 10,000 rows)

```typescript
import {
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  SortingState,
  ColumnFiltersState,
  PaginationState,
} from '@tanstack/react-table'

function ClientSideTable() {
  const { data } = useQuery({ queryKey: ['users'], queryFn: fetchAllUsers })

  // Table manages state internally
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const table = useReactTable({
    data: data ?? [],
    columns,
    state: { sorting, columnFilters, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    // Client-side row models handle operations
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })
}
```

### Server-Side (Large Datasets > 10,000 rows)

```typescript
function ServerSideTable() {
  // Table state drives Query params
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  // Query includes table state in key
  const { data, isLoading } = useQuery({
    queryKey: ['users', { sorting, columnFilters, pagination }],
    queryFn: () => fetchUsers({
      sort: sorting[0]?.id,
      order: sorting[0]?.desc ? 'desc' : 'asc',
      filters: columnFilters,
      page: pagination.pageIndex,
      pageSize: pagination.pageSize,
    }),
  })

  const table = useReactTable({
    data: data?.rows ?? [],
    columns,
    // Server-side: only core row model, no sorting/filtering/pagination
    getCoreRowModel: getCoreRowModel(),
    // Manual modes - server handles these
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
    // Provide counts for pagination
    pageCount: data?.pageCount ?? -1,
    rowCount: data?.totalRows,
    // State and handlers
    state: { sorting, columnFilters, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
  })
}
```

## Mutations and Optimistic Updates

### Basic Mutation with Table Refresh

```typescript
function UsersTable() {
  const queryClient = useQueryClient()
  const { data } = useQuery({ queryKey: ['users'], queryFn: fetchUsers })

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      // Refresh table data after mutation
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const columns: ColumnDef<User>[] = [
    // ... other columns
    {
      id: 'actions',
      cell: ({ row }) => (
        <button onClick={() => deleteMutation.mutate(row.original.id)}>
          Delete
        </button>
      ),
    },
  ]
}
```

### Optimistic Update

```typescript
const deleteMutation = useMutation({
  mutationFn: deleteUser,
  onMutate: async (userId) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['users'] })

    // Snapshot current value
    const previousUsers = queryClient.getQueryData<User[]>(['users'])

    // Optimistically remove from cache
    queryClient.setQueryData<User[]>(['users'], (old) =>
      old?.filter(user => user.id !== userId)
    )

    return { previousUsers }
  },
  onError: (err, userId, context) => {
    // Rollback on error
    queryClient.setQueryData(['users'], context?.previousUsers)
  },
  onSettled: () => {
    // Refetch to ensure consistency
    queryClient.invalidateQueries({ queryKey: ['users'] })
  },
})
```

### Inline Editing with Mutation

```typescript
function EditableCell({ row, column, table }) {
  const queryClient = useQueryClient()
  const [value, setValue] = useState(row.getValue(column.id))

  const updateMutation = useMutation({
    mutationFn: (newValue: string) =>
      updateUser(row.original.id, { [column.id]: newValue }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const onBlur = () => {
    if (value !== row.getValue(column.id)) {
      updateMutation.mutate(value)
    }
  }

  return (
    <input
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={onBlur}
      disabled={updateMutation.isPending}
    />
  )
}
```

## Loading and Error States

### Skeleton Loading

```typescript
function TableWithSkeleton() {
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['users', filters],
    queryFn: () => fetchUsers(filters),
  })

  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (error) return <ErrorBanner error={error} />

  return (
    <div className="relative">
      {/* Show loading overlay on refetch */}
      {isFetching && !isLoading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
          <Spinner />
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={10} columns={columns.length} />
      ) : (
        <table>{/* render table */}</table>
      )}
    </div>
  )
}
```

### Empty State

```typescript
function TableWithEmptyState() {
  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: fetchUsers })

  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (isLoading) return <TableSkeleton />

  if (table.getRowModel().rows.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No users found</p>
        <button onClick={() => navigate('/users/new')}>Add User</button>
      </div>
    )
  }

  return <table>{/* render table */}</table>
}
```

## Column Definitions with Query Data

### Dynamic Columns from API

```typescript
function DynamicColumnsTable() {
  // Fetch column configuration
  const { data: columnConfig } = useQuery({
    queryKey: ['table-config'],
    queryFn: fetchTableConfig,
    staleTime: Infinity, // Column config rarely changes
  })

  // Fetch data
  const { data } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    enabled: !!columnConfig, // Wait for column config
  })

  // Generate columns from config
  const columns = useMemo(() => {
    if (!columnConfig) return []
    return columnConfig.map(col => ({
      accessorKey: col.field,
      header: col.label,
      cell: col.format ? ({ getValue }) => formatValue(getValue(), col.format) : undefined,
    }))
  }, [columnConfig])

  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })
}
```

### Columns with Async Cell Data

```typescript
const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'teamId',
    header: 'Team',
    cell: ({ getValue }) => {
      const teamId = getValue<string>()
      // Nested query for related data
      const { data: team } = useQuery({
        queryKey: ['team', teamId],
        queryFn: () => fetchTeam(teamId),
        staleTime: 5 * 60 * 1000,
      })
      return team?.name ?? <Spinner size="sm" />
    },
  },
]
```

## State Synchronization Patterns

### Table State → URL → Query

```typescript
// Route handles URL state
export const Route = createFileRoute('/users')({
  validateSearch: (search): TableFilters => ({
    page: Number(search.page) || 1,
    pageSize: Number(search.pageSize) || 10,
    sort: search.sort as string,
    order: search.order as 'asc' | 'desc',
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient }, deps }) =>
    queryClient.ensureQueryData(usersQueryOptions(deps)),
})

function UsersTable() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  // Query driven by URL state
  const { data } = useSuspenseQuery(usersQueryOptions(search))

  const table = useReactTable({
    data: data.rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    pageCount: data.pageCount,
    state: {
      sorting: search.sort ? [{ id: search.sort, desc: search.order === 'desc' }] : [],
      pagination: { pageIndex: search.page - 1, pageSize: search.pageSize },
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater([]) : updater
      navigate({
        search: {
          ...search,
          sort: next[0]?.id,
          order: next[0]?.desc ? 'desc' : 'asc',
        },
      })
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function'
        ? updater({ pageIndex: search.page - 1, pageSize: search.pageSize })
        : updater
      navigate({
        search: { ...search, page: next.pageIndex + 1, pageSize: next.pageSize },
      })
    },
  })
}
```

## Related

- [Router + Query Integration](router-query-integration.md)
- [Table + Virtual Integration](table-virtual-integration.md)
- [Server-Side Patterns](server-side-patterns.md)
