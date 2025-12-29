# Server-Side Patterns

**Patterns for server-side pagination, sorting, and filtering with the TanStack stack.**

## Overview

For large datasets (>10,000 rows), server-side operations are essential. This reference covers integrating Router search params with Query for server-driven table operations.

## Server-Side Pagination

### Basic Pattern

```typescript
// API response shape
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalRows: number;
  };
}

// Query options with pagination
export const usersQueryOptions = (params: { page: number; pageSize: number }) =>
  queryOptions({
    queryKey: ["users", "list", params],
    queryFn: async () => {
      const response = await fetch(`/api/users?page=${params.page}&pageSize=${params.pageSize}`);
      return response.json() as Promise<PaginatedResponse<User>>;
    },
  });
```

### With Router Integration

```typescript
export const Route = createFileRoute("/users")({
  validateSearch: (search) => ({
    page: Math.max(1, Number(search.page) || 1),
    pageSize: [10, 25, 50, 100].includes(Number(search.pageSize)) ? Number(search.pageSize) : 25,
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient }, deps }) =>
    queryClient.ensureQueryData(usersQueryOptions(deps)),
});

function UsersTable() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data } = useSuspenseQuery(usersQueryOptions(search));

  const table = useReactTable({
    data: data.data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: data.pagination.totalPages,
    rowCount: data.pagination.totalRows,
    state: {
      pagination: {
        pageIndex: search.page - 1,
        pageSize: search.pageSize,
      },
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({ pageIndex: search.page - 1, pageSize: search.pageSize })
          : updater;
      navigate({
        search: { ...search, page: next.pageIndex + 1, pageSize: next.pageSize },
      });
    },
  });
}
```

## Server-Side Sorting

```typescript
export const Route = createFileRoute("/users")({
  validateSearch: (search) => ({
    page: Number(search.page) || 1,
    pageSize: Number(search.pageSize) || 25,
    sortBy: search.sortBy as string | undefined,
    sortOrder: search.sortOrder === "desc" ? "desc" : "asc",
  }),
});

function UsersTable() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const table = useReactTable({
    data: data.data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    state: {
      sorting: search.sortBy ? [{ id: search.sortBy, desc: search.sortOrder === "desc" }] : [],
    },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater([]) : updater;
      const newSort = next[0];
      navigate({
        search: {
          ...search,
          page: 1, // Reset to page 1 when sorting changes
          sortBy: newSort?.id,
          sortOrder: newSort?.desc ? "desc" : "asc",
        },
      });
    },
  });
}
```

## Server-Side Filtering

```typescript
interface FilterParams {
  status?: string
  search?: string
  dateFrom?: string
  dateTo?: string
}

export const Route = createFileRoute('/users')({
  validateSearch: (search): FilterParams & PaginationParams => ({
    page: Number(search.page) || 1,
    pageSize: Number(search.pageSize) || 25,
    status: search.status as string | undefined,
    search: search.search as string | undefined,
    dateFrom: search.dateFrom as string | undefined,
    dateTo: search.dateTo as string | undefined,
  }),
})

function UsersTable() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const [debouncedSearch] = useDebounce(search.search, 300)

  // Query with debounced search
  const { data } = useSuspenseQuery(
    usersQueryOptions({ ...search, search: debouncedSearch })
  )

  const updateFilter = (key: string, value: string | undefined) => {
    navigate({
      search: { ...search, page: 1, [key]: value || undefined },
    })
  }

  return (
    <>
      <input
        placeholder="Search..."
        value={search.search ?? ''}
        onChange={(e) => updateFilter('search', e.target.value)}
      />
      <select
        value={search.status ?? ''}
        onChange={(e) => updateFilter('status', e.target.value)}
      >
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      <Table table={table} />
    </>
  )
}
```

## Combining All Operations

```typescript
interface TableParams {
  // Pagination
  page: number
  pageSize: number
  // Sorting
  sortBy?: string
  sortOrder: 'asc' | 'desc'
  // Filtering
  status?: string
  search?: string
}

export const usersQueryOptions = (params: TableParams) =>
  queryOptions({
    queryKey: ['users', 'list', params],
    queryFn: () => fetchUsers(params),
    staleTime: 30 * 1000, // 30 seconds
  })

export const Route = createFileRoute('/users')({
  validateSearch: (search): TableParams => ({
    page: Math.max(1, Number(search.page) || 1),
    pageSize: Number(search.pageSize) || 25,
    sortBy: search.sortBy as string | undefined,
    sortOrder: search.sortOrder === 'desc' ? 'desc' : 'asc',
    status: search.status as string | undefined,
    search: search.search as string | undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient }, deps }) =>
    queryClient.ensureQueryData(usersQueryOptions(deps)),
})

function UsersPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(usersQueryOptions(search))

  const table = useReactTable({
    data: data.data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: data.pagination.totalPages,
    rowCount: data.pagination.totalRows,
    state: {
      pagination: { pageIndex: search.page - 1, pageSize: search.pageSize },
      sorting: search.sortBy ? [{ id: search.sortBy, desc: search.sortOrder === 'desc' }] : [],
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function'
        ? updater({ pageIndex: search.page - 1, pageSize: search.pageSize })
        : updater
      navigate({ search: { ...search, page: next.pageIndex + 1, pageSize: next.pageSize } })
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater([]) : updater
      navigate({
        search: {
          ...search,
          page: 1,
          sortBy: next[0]?.id,
          sortOrder: next[0]?.desc ? 'desc' : 'asc',
        },
      })
    },
  })

  return <Table table={table} />
}
```

## Prefetching Adjacent Pages

```typescript
function UsersTable() {
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const { data } = useSuspenseQuery(usersQueryOptions(search));

  // Prefetch next page
  useEffect(() => {
    if (search.page < data.pagination.totalPages) {
      queryClient.prefetchQuery(usersQueryOptions({ ...search, page: search.page + 1 }));
    }
  }, [search, data.pagination.totalPages, queryClient]);

  // Prefetch previous page
  useEffect(() => {
    if (search.page > 1) {
      queryClient.prefetchQuery(usersQueryOptions({ ...search, page: search.page - 1 }));
    }
  }, [search, queryClient]);
}
```

## Related

- [Router + Query Integration](router-query-integration.md)
- [Query + Table Integration](query-table-integration.md)
- [Infinite Scroll](infinite-scroll.md)
