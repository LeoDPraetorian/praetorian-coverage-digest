---
name: integrating-tanstack-components
description: Use when integrating TanStack Router, Query, Table, and Virtual together - provides architecture patterns, data flow, and type-safe integration
allowed-tools: Read, Glob, Grep
---

# Integrating TanStack Components

**Architectural patterns for properly integrating TanStack Router, Query, Table, and Virtual in React applications.**

## When to Use This Skill

Use this skill when:

- Building data-heavy React applications with routing, data fetching, tables, and virtualization
- Integrating multiple TanStack libraries that need to work together
- Designing the data flow between Router → Query → Table → Virtual
- Ensuring proper cache invalidation and state synchronization
- Need type-safe integration patterns across the TanStack stack

## Library Versions (2025)

| Library          | Version | Key Feature                    |
| ---------------- | ------- | ------------------------------ |
| TanStack Router  | v1.x    | Type-safe routing, file-based  |
| TanStack Query   | v5.x    | Server state management        |
| TanStack Table   | v8.x    | Headless table logic           |
| TanStack Virtual | v3.x    | Virtualized scrolling          |

## Architecture Overview

### Data Flow Principle

```
Router (URL/Params) → Query (Fetch/Cache) → Table (State) → Virtual (Render)
         ↓                    ↓                  ↓               ↓
    Search Params         Cache Keys        Pagination     Row Heights
    Route Loaders         Prefetching       Sorting        Scroll Position
    Navigation            Invalidation      Filtering      Dynamic Sizing
```

### Key Integration Points

| From → To          | Integration Pattern                              |
| ------------------ | ------------------------------------------------ |
| Router → Query     | Route loaders with `ensureQueryData`, cache keys |
| Query → Table      | `useQuery` data feeds `useReactTable`            |
| Table → Virtual    | Row model feeds virtualizer                      |
| Virtual → Router   | Scroll position preserved in route state         |

## Quick Reference

### Router + Query Integration

```typescript
// Route loader prefetches query data
export const Route = createFileRoute('/users')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(usersQueryOptions()),
  component: UsersPage,
})

// Query options factory (reusable)
export const usersQueryOptions = (filters?: UserFilters) =>
  queryOptions({
    queryKey: ['users', filters],
    queryFn: () => fetchUsers(filters),
    staleTime: 5 * 60 * 1000,
  })
```

### Query + Table Integration

```typescript
// Table uses Query data directly
function UsersTable() {
  const { data, isLoading } = useQuery(usersQueryOptions())

  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortingRowModel: getSortingRowModel(),
  })

  if (isLoading) return <TableSkeleton />
  return <Table table={table} />
}
```

### Table + Virtual Integration

```typescript
// Virtual renders Table rows efficiently
function VirtualizedTable({ table }: { table: Table<User> }) {
  const { rows } = table.getRowModel()

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // Row height estimate
    overscan: 5,
  })

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index]
          return <TableRow key={row.id} row={row} virtualRow={virtualRow} />
        })}
      </div>
    </div>
  )
}
```

## Integration Decision Matrix

| Scenario                     | Pattern                   | Reference                                                     |
| ---------------------------- | ------------------------- | ------------------------------------------------------------- |
| Simple data table            | Query → Table             | [query-table-integration.md](references/query-table-integration.md) |
| Routed data table            | Router → Query → Table    | [router-query-integration.md](references/router-query-integration.md) |
| Large dataset (1000+ rows)   | + Virtual                 | [table-virtual-integration.md](references/table-virtual-integration.md) |
| Server-side pagination       | Router params → Query     | [server-side-patterns.md](references/server-side-patterns.md) |
| Infinite scroll              | Query infinite + Virtual  | [infinite-scroll.md](references/infinite-scroll.md) |
| Type-safe end-to-end         | All with strict types     | [typescript-patterns.md](references/typescript-patterns.md) |

## Core Integration Patterns

### 1. Route-Driven Query Keys

**Sync URL params with Query cache keys:**

```typescript
// Route search params type
interface UserSearchParams {
  page?: number
  sort?: string
  filter?: string
}

// Query key includes route params
const usersQueryOptions = (search: UserSearchParams) =>
  queryOptions({
    queryKey: ['users', search], // Cache per unique params
    queryFn: () => fetchUsers(search),
  })

// Route uses search params
export const Route = createFileRoute('/users')({
  validateSearch: (search): UserSearchParams => ({
    page: Number(search.page) || 1,
    sort: (search.sort as string) || 'name',
    filter: (search.filter as string) || '',
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient }, deps }) =>
    queryClient.ensureQueryData(usersQueryOptions(deps)),
})
```

### 2. Table State Sync with Router

**Keep Table pagination/sorting in URL:**

```typescript
function UsersTable() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const table = useReactTable({
    state: {
      pagination: { pageIndex: search.page - 1, pageSize: 20 },
      sorting: [{ id: search.sort, desc: search.desc ?? false }],
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function'
        ? updater(table.getState().pagination)
        : updater
      navigate({ search: { ...search, page: next.pageIndex + 1 } })
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function'
        ? updater(table.getState().sorting)
        : updater
      navigate({ search: { ...search, sort: next[0]?.id, desc: next[0]?.desc } })
    },
    manualPagination: true,
    manualSorting: true,
  })
}
```

### 3. Virtual + Dynamic Row Heights

**Handle variable content height:**

```typescript
const virtualizer = useVirtualizer({
  count: rows.length,
  getScrollElement: () => parentRef.current,
  estimateSize: (index) => {
    // Estimate based on content
    const row = rows[index]
    return row.original.hasExpandedContent ? 120 : 48
  },
  measureElement: (element) => element.getBoundingClientRect().height,
  overscan: 10, // Render extra rows for smooth scrolling
})
```

## Anti-Patterns (What NOT to Do)

See [references/anti-patterns.md](references/anti-patterns.md) for detailed explanations.

| Anti-Pattern                        | Problem                            | Correct Approach                    |
| ----------------------------------- | ---------------------------------- | ----------------------------------- |
| Fetching in Table component         | Waterfalls, no prefetch            | Use Route loader                    |
| Static query keys                   | Stale data on param change         | Include params in queryKey          |
| Table state in useState             | Lost on navigation                 | Sync with Router search params      |
| Fixed virtualizer estimateSize      | Scroll jumps with variable heights | Use measureElement                  |
| Separate Query + Table pagination   | State desync                       | Single source of truth (Router)     |

## Progressive Disclosure

### Quick Start (This File)
- Architecture overview
- Quick reference examples
- Integration decision matrix

### Detailed References
- [Router + Query Integration](references/router-query-integration.md) - Route loaders, prefetching, cache strategies
- [Query + Table Integration](references/query-table-integration.md) - Data binding, mutations, optimistic updates
- [Table + Virtual Integration](references/table-virtual-integration.md) - Virtualization patterns, performance
- [Server-Side Patterns](references/server-side-patterns.md) - Pagination, sorting, filtering on server
- [Infinite Scroll](references/infinite-scroll.md) - useInfiniteQuery + Virtual
- [TypeScript Patterns](references/typescript-patterns.md) - End-to-end type safety
- [Anti-Patterns](references/anti-patterns.md) - Common mistakes and fixes

### Complete Examples
- [Full Integration Example](examples/complete-integration.md) - Production-ready implementation

## Related Skills

| Skill                    | Purpose                              |
| ------------------------ | ------------------------------------ |
| using-tanstack-query     | Deep dive on Query patterns          |
| using-tanstack-router    | Deep dive on Router patterns         |
| using-tanstack-table     | Deep dive on Table patterns          |
| frontend-performance     | Performance optimization techniques  |
