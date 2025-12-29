---
name: using-tanstack-table
description: Use when implementing TanStack Table v8 (React Table) for headless table logic - column definitions, pagination, sorting, filtering, row selection, and virtualization for large datasets in React applications
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# TanStack Table v8 (React Table) - Headless Table Logic

**Authoritative patterns for @tanstack/react-table v8 with column definitions, pagination, sorting, filtering, and virtualization.**

## When to Use

Use this skill when:

- Building data tables with `useReactTable` hook
- Implementing pagination (client-side or server-side with `manualPagination`)
- Adding sorting, filtering, or searching to tables
- Implementing row selection, expansion, or grouping
- Virtualizing large datasets with `@tanstack/react-virtual`
- Managing column visibility, ordering, or resizing
- Integrating tables with TanStack Query for server-paginated data
- Migrating from React Table v7 to v8

**NOT for:** TanStack Query (see `frontend-tanstack-query`) or TanStack Router (see `using-tanstack-router`). For simple static tables, use native HTML `<table>` elements.

## Quick Reference

| Task                  | Hook/Pattern                                    | Key Config                                  |
| --------------------- | ----------------------------------------------- | ------------------------------------------- |
| **Basic table**       | `useReactTable({ data, columns })`              | `getCoreRowModel`                           |
| **Pagination**        | `getPaginationRowModel()`                       | `pageSize`, `pageIndex`, `pageCount`        |
| **Server pagination** | `manualPagination: true`                        | Custom `pageCount`, fetch on page change    |
| **Sorting**           | `getSortedRowModel()`                           | `enableSorting`, `onSortingChange`          |
| **Filtering**         | `getFilteredRowModel()`                         | `columnFilters`, `globalFilter`             |
| **Row selection**     | `getRowSelectionModel()`                        | `rowSelection` state, `enableRowSelection`  |
| **Virtualization**    | `useVirtualizer` from `@tanstack/react-virtual` | `count`, `getScrollElement`, `estimateSize` |
| **Column defs**       | `columnHelper.accessor()`                       | `id`, `accessorKey`, `cell`, `header`       |

## Core Concepts

### useReactTable Hook

The main hook for creating table instances:

```typescript
import { useReactTable, getCoreRowModel } from '@tanstack/react-table'

function DataTable({ data }: { data: Asset[] }) {
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
              <th key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
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

### Column Definitions

Use `createColumnHelper` for type-safe columns:

```typescript
import { createColumnHelper } from '@tanstack/react-table'

const columnHelper = createColumnHelper<Asset>()

const columns = [
  columnHelper.accessor('name', {
    header: 'Asset Name',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: info => <StatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor('createdAt', {
    header: 'Created',
    cell: info => formatDate(info.getValue()),
  }),
]
```

**See:** [references/column-definitions.md](references/column-definitions.md) for advanced patterns.

### Client-Side Pagination

Built-in pagination for small to medium datasets:

```typescript
import { getPaginationRowModel } from '@tanstack/react-table'

const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  initialState: {
    pagination: {
      pageSize: 20,
      pageIndex: 0,
    },
  },
})

// Controls
<button
  onClick={() => table.previousPage()}
  disabled={!table.getCanPreviousPage()}
>
  Previous
</button>
<button
  onClick={() => table.nextPage()}
  disabled={!table.getCanNextPage()}
>
  Next
</button>

// Info
<span>
  Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
</span>
```

### Server-Side Pagination

Use `manualPagination: true` and fetch data based on pagination state. Integrate with TanStack Query for data fetching.

**See:** [references/table-server-side-patterns.md](references/table-server-side-patterns.md) for complete patterns.

**See:** [references/table-query-integration.md](references/table-query-integration.md) for Query + Table integration.

### Sorting

Enable column sorting:

```typescript
import { getSortedRowModel } from '@tanstack/react-table'

const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  enableSorting: true,
})

// In header rendering
<th onClick={header.column.getToggleSortingHandler()}>
  {header.column.columnDef.header}
  {{
    asc: ' 🔼',
    desc: ' 🔽',
  }[header.column.getIsSorted() as string] ?? null}
</th>
```

**Server-side sorting:**

```typescript
const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  manualSorting: true, // Disable client-side sorting
  onSortingChange: setSorting,
  state: {
    sorting,
  },
});

// Fetch data when sorting changes
useEffect(() => {
  fetchAssets({ sorting });
}, [sorting]);
```

### Filtering

Column and global filters:

```typescript
import { getFilteredRowModel } from '@tanstack/react-table'

const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  onColumnFiltersChange: setColumnFilters,
  onGlobalFilterChange: setGlobalFilter,
  state: {
    columnFilters,
    globalFilter,
  },
})

// Global search
<input
  value={globalFilter ?? ''}
  onChange={e => setGlobalFilter(e.target.value)}
  placeholder="Search all columns..."
/>

// Column filter
<input
  value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
  onChange={e => table.getColumn('name')?.setFilterValue(e.target.value)}
  placeholder="Filter names..."
/>
```

### Row Selection

Enable checkbox selection:

```typescript
const [rowSelection, setRowSelection] = useState({})

const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  enableRowSelection: true,
  onRowSelectionChange: setRowSelection,
  state: {
    rowSelection,
  },
})

// Select all checkbox (header)
<input
  type="checkbox"
  checked={table.getIsAllRowsSelected()}
  onChange={table.getToggleAllRowsSelectedHandler()}
/>

// Row checkbox (body)
<input
  type="checkbox"
  checked={row.getIsSelected()}
  onChange={row.getToggleSelectedHandler()}
/>

// Get selected rows
const selectedRows = table.getSelectedRowModel().rows
```

### Virtualization

For large datasets (1000+ rows), use `@tanstack/react-virtual` with `useVirtualizer` hook for efficient rendering.

**See:** [references/table-performance-virtualization.md](references/table-performance-virtualization.md) for complete patterns.

## Common Patterns

### Column Visibility Toggle

```typescript
const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  onColumnVisibilityChange: setColumnVisibility,
  state: {
    columnVisibility,
  },
})

// Toggle UI
<div>
  {table.getAllLeafColumns().map(column => (
    <label key={column.id}>
      <input
        type="checkbox"
        checked={column.getIsVisible()}
        onChange={column.getToggleVisibilityHandler()}
      />
      {column.columnDef.header}
    </label>
  ))}
</div>
```

### Row Expansion

```typescript
const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getExpandedRowModel: getExpandedRowModel(),
})

// Expandable row
<tr>
  <td>
    <button onClick={row.getToggleExpandedHandler()}>
      {row.getIsExpanded() ? '👇' : '👉'}
    </button>
  </td>
  ...
</tr>

// Expanded content
{row.getIsExpanded() && (
  <tr>
    <td colSpan={columns.length}>
      <ExpandedRowContent data={row.original} />
    </td>
  </tr>
)}
```

### Custom Cell Renderers

```typescript
const columns = [
  columnHelper.accessor('status', {
    header: 'Status',
    cell: ({ getValue }) => {
      const status = getValue()
      return (
        <span className={`badge badge-${status}`}>
          {status}
        </span>
      )
    },
  }),
  columnHelper.accessor('actions', {
    header: 'Actions',
    cell: ({ row }) => (
      <div>
        <button onClick={() => handleEdit(row.original)}>Edit</button>
        <button onClick={() => handleDelete(row.original)}>Delete</button>
      </div>
    ),
  }),
]
```

## Anti-Patterns

### ❌ Don't Mutate Data Directly

```typescript
// BAD: Mutating data array
const handleDelete = (id: string) => {
  const index = data.findIndex((item) => item.id === id);
  data.splice(index, 1); // ⚠️ Mutation breaks reactivity
};

// GOOD: Create new array
const handleDelete = (id: string) => {
  setData((prev) => prev.filter((item) => item.id !== id));
};
```

### ❌ Don't Use `any` for Column Types

```typescript
// BAD: Lost type safety
const columns: ColumnDef<any>[] = [...] // ⚠️

// GOOD: Specific type
const columns: ColumnDef<Asset>[] = [...]
```

### ❌ Don't Forget `getCoreRowModel`

```typescript
// BAD: Missing core model
const table = useReactTable({
  data,
  columns,
  // ⚠️ Missing getCoreRowModel - table won't work!
});

// GOOD: Always include
const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(), // ✅
});
```

**See:** [references/table-common-errors.md](references/table-common-errors.md) for complete list.

## Integration with TanStack Query

Combine Table with Query for server-paginated data. Use `manualPagination`, `manualSorting`, and `manualFiltering` with Query's `queryKey` for data fetching.

**See:** [references/table-query-integration.md](references/table-query-integration.md) for complete patterns.

## Chariot-Specific Patterns

### Asset Table with Actions

```typescript
const assetColumns = [
  columnHelper.accessor('name', {
    header: 'Asset Name',
    cell: info => <Link to={`/assets/${info.row.original.id}`}>{info.getValue()}</Link>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: info => <StatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor('riskCount', {
    header: 'Risks',
    cell: info => <RiskCountBadge count={info.getValue()} />,
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuItem onClick={() => navigate(`/assets/${row.original.id}/edit`)}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDelete(row.original.id)}>
          Delete
        </DropdownMenuItem>
      </DropdownMenu>
    ),
  }),
]
```

## Related Skills

- `frontend-tanstack-query` - Query + Table server pagination integration
- `using-tanstack-router` - URL state synchronization for table filters/sorting
- `using-zustand-state-management` - Managing table state with Zustand
- `frontend-testing-patterns` - Testing table components

## Progressive Disclosure

**Quick Start (this file):**

- Essential table patterns
- Pagination and sorting
- Common integrations

**Deep Dives (references/):**

- [table-server-side-patterns.md](references/table-server-side-patterns.md) - Server pagination/sorting/filtering
- [table-query-integration.md](references/table-query-integration.md) - TanStack Query integration
- [table-performance-virtualization.md](references/table-performance-virtualization.md) - Virtualization for large datasets
- [table-common-errors.md](references/table-common-errors.md) - Error reference and solutions
- [table-cloudflare-d1-examples.md](references/table-cloudflare-d1-examples.md) - Edge database integration

## Official Documentation

- [TanStack Table v8 Docs](https://tanstack.com/table/latest)
- [React Table Guide](https://tanstack.com/table/latest/docs/guide/introduction)
- [Column Definitions](https://tanstack.com/table/latest/docs/guide/column-defs)
- [TanStack Virtual](https://tanstack.com/virtual/latest)
