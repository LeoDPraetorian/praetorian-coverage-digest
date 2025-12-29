# Anti-Patterns

**Common mistakes when integrating TanStack components and how to fix them.**

## Data Fetching Anti-Patterns

### ❌ Fetching in Table Component

```typescript
// BAD: Creates waterfall, no prefetching
function UsersTable() {
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  })

  if (isLoading) return <Skeleton />
  return <Table data={data} />
}

// GOOD: Fetch in route loader
export const Route = createFileRoute('/users')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(usersQueryOptions()),
})

function UsersTable() {
  const { data } = useSuspenseQuery(usersQueryOptions())
  return <Table data={data} />
}
```

### ❌ Static Query Keys

```typescript
// BAD: Same key for different data
const { data } = useQuery({
  queryKey: ["users"],
  queryFn: () => fetchUsers(filters), // filters not in key!
});

// GOOD: Include all dependencies in key
const { data } = useQuery({
  queryKey: ["users", filters],
  queryFn: () => fetchUsers(filters),
});
```

### ❌ Fetching in useEffect

```typescript
// BAD: Manual fetching loses Query benefits
function UsersPage() {
  const [users, setUsers] = useState([])

  useEffect(() => {
    fetchUsers().then(setUsers)
  }, [])

  return <Table data={users} />
}

// GOOD: Use Query for caching, deduplication, background updates
function UsersPage() {
  const { data } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  })

  return <Table data={data ?? []} />
}
```

## State Management Anti-Patterns

### ❌ Duplicating Router State

```typescript
// BAD: Table state separate from URL
function UsersTable() {
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 })
  // URL might show ?page=3 but table shows page 1

  return <Table pagination={pagination} />
}

// GOOD: Router is single source of truth
function UsersTable() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const pagination = {
    pageIndex: search.page - 1,
    pageSize: search.pageSize,
  }

  const onPaginationChange = (next) => {
    navigate({ search: { ...search, page: next.pageIndex + 1 } })
  }

  return <Table pagination={pagination} onPaginationChange={onPaginationChange} />
}
```

### ❌ Local State for Server State

```typescript
// BAD: useState for server data
const [users, setUsers] = useState([]);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState(null);

// GOOD: Query handles all server state
const {
  data: users,
  isLoading,
  error,
} = useQuery({
  queryKey: ["users"],
  queryFn: fetchUsers,
});
```

### ❌ Separate Query and Table Pagination

```typescript
// BAD: Two sources of pagination truth
const [queryPage, setQueryPage] = useState(1);
const [tablePage, setTablePage] = useState(0);

// They can get out of sync!

// GOOD: Single source (Router search params)
const search = Route.useSearch();
// Both Query and Table read from search.page
```

## Performance Anti-Patterns

### ❌ Fixed estimateSize with Variable Heights

```typescript
// BAD: Causes scroll jumping
const virtualizer = useVirtualizer({
  count: rows.length,
  estimateSize: () => 48, // Fixed, but rows have different heights
});

// GOOD: Use measureElement for dynamic heights
const virtualizer = useVirtualizer({
  count: rows.length,
  estimateSize: (index) => estimateRowHeight(rows[index]),
  measureElement: (element) => element?.getBoundingClientRect().height,
});
```

### ❌ Creating Functions in Render

```typescript
// BAD: New function reference every render
const table = useReactTable({
  onSortingChange: (updater) => handleSort(updater), // New function
});

// GOOD: Stable function reference
const handleSortingChange = useCallback((updater) => {
  // handle sort
}, []);

const table = useReactTable({
  onSortingChange: handleSortingChange,
});
```

### ❌ Not Memoizing Columns

```typescript
// BAD: Columns recreated every render
function Table() {
  const columns = [{ accessorKey: "name", header: "Name" }]; // New array every render!

  const table = useReactTable({ columns, data });
}

// GOOD: Memoize columns
function Table() {
  const columns = useMemo(() => [{ accessorKey: "name", header: "Name" }], []);

  const table = useReactTable({ columns, data });
}
```

### ❌ Missing CSS Containment

```typescript
// BAD: No containment, browser recalculates everything
<div style={{ overflow: 'auto' }}>
  {virtualRows}
</div>

// GOOD: CSS containment improves performance
<div style={{ overflow: 'auto', contain: 'strict' }}>
  {virtualRows}
</div>
```

## Type Safety Anti-Patterns

### ❌ Ignoring TypeScript Errors

```typescript
// BAD: Type assertion to escape errors
const data = queryResult.data as any
const value = row.getValue() as string

// GOOD: Proper typing from the start
const { data } = useQuery<UsersResponse>({...})
const value = row.getValue<string>()
```

### ❌ Loose Search Param Validation

```typescript
// BAD: No validation, runtime errors possible
validateSearch: (search) => ({
  page: search.page, // Could be anything!
});

// GOOD: Strict validation with defaults
validateSearch: (search) => ({
  page: Math.max(1, Number(search.page) || 1),
  pageSize: [10, 25, 50].includes(Number(search.pageSize)) ? Number(search.pageSize) : 25,
});
```

## Cache Management Anti-Patterns

### ❌ Manual Cache Manipulation After Mutation

```typescript
// BAD: Manually updating cache is error-prone
mutation.onSuccess((newUser) => {
  queryClient.setQueryData(["users"], (old) => [...old, newUser]);
});

// GOOD: Invalidate and refetch for consistency
mutation.onSuccess(() => {
  queryClient.invalidateQueries({ queryKey: ["users"] });
});
```

### ❌ Not Including Dependencies in Query Keys

```typescript
// BAD: Stale data when dependencies change
const { data } = useQuery({
  queryKey: ["users"],
  queryFn: () => fetchUsers({ status, search }), // status, search not in key
});

// GOOD: All dependencies in key
const { data } = useQuery({
  queryKey: ["users", { status, search }],
  queryFn: () => fetchUsers({ status, search }),
});
```

## Summary

| Anti-Pattern         | Problem        | Solution               |
| -------------------- | -------------- | ---------------------- |
| Fetch in component   | Waterfalls     | Route loaders          |
| Static query keys    | Stale data     | Include all deps       |
| Duplicate state      | Desync         | Single source (Router) |
| Fixed estimateSize   | Scroll jumps   | measureElement         |
| Functions in render  | Re-renders     | useCallback/useMemo    |
| Manual cache updates | Inconsistency  | Invalidate queries     |
| Type assertions      | Runtime errors | Proper types           |
