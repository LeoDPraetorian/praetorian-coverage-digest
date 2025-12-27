# TanStack Table Integration with shadcn/ui

Complete guide for building enterprise-grade data tables using shadcn/ui components with TanStack Table for powerful, type-safe table functionality.

## Overview

TanStack Table is a headless UI library for building powerful tables and datagrids. Combined with shadcn/ui, it provides a complete solution for displaying and manipulating tabular data with sorting, filtering, pagination, and more.

**Official Documentation:**
- [shadcn/ui Data Table Component](https://ui.shadcn.com/docs/components/data-table)
- [TanStack Table Documentation](https://tanstack.com/table/latest)
- [TanStack Table React Guide](https://tanstack.com/table/latest/docs/framework/react/react-table)

## Installation

```bash
# Install TanStack Table
npm install @tanstack/react-table

# Add shadcn/ui Table components
npx shadcn@latest add table

# Optional: Add related components
npx shadcn@latest add button dropdown-menu input
```

## Basic Data Table Setup

### 1. Define Your Data Type

```typescript
// types/data.ts
export type Payment = {
  id: string
  amount: number
  status: 'pending' | 'processing' | 'success' | 'failed'
  email: string
  createdAt: Date
}
```

### 2. Define Column Definitions

```typescript
// columns.tsx
import { ColumnDef } from '@tanstack/react-table'
import { Payment } from '@/types/data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowUpDown } from 'lucide-react'

export const columns: ColumnDef<Payment>[] = [
  {
    accessorKey: 'email',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Email
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: 'amount',
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'))
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount)
      return <div className="text-right font-medium">{formatted}</div>
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      return (
        <Badge variant={status === 'success' ? 'default' : 'secondary'}>
          {status}
        </Badge>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const payment = row.original
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(payment.id)}>
              Copy payment ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View details</DropdownMenuItem>
            <DropdownMenuItem>Refund</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
```

### 3. Create DataTable Component

```typescript
// components/data-table.tsx
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
  getPaginationRowModel,
} from '@tanstack/react-table'
import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Filter emails..."
          value={(table.getColumn('email')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('email')?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### 4. Use DataTable in Your Page

```typescript
// app/payments/page.tsx
import { DataTable } from '@/components/data-table'
import { columns } from './columns'
import { Payment } from '@/types/data'

async function getData(): Promise<Payment[]> {
  // Fetch data from API
  return [
    {
      id: '728ed52f',
      amount: 100,
      status: 'pending',
      email: 'm@example.com',
      createdAt: new Date(),
    },
    // ...
  ]
}

export default async function PaymentsPage() {
  const data = await getData()

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Payments</h1>
      <DataTable columns={columns} data={data} />
    </div>
  )
}
```

## Advanced Features

### Server-Side Pagination & Filtering

```typescript
// components/server-data-table.tsx
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { DataTable } from './data-table'

interface ServerDataTableProps {
  endpoint: string
}

export function ServerDataTable({ endpoint }: ServerDataTableProps) {
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [sorting, setSorting] = useState([])
  const [filters, setFilters] = useState({})

  const { data, isLoading } = useQuery({
    queryKey: ['table-data', page, pageSize, sorting, filters],
    queryFn: () =>
      fetch(`${endpoint}?page=${page}&pageSize=${pageSize}&sort=${JSON.stringify(sorting)}&filters=${JSON.stringify(filters)}`)
        .then((res) => res.json()),
  })

  if (isLoading) {
    return <TableSkeleton />
  }

  return (
    <DataTable
      columns={columns}
      data={data.rows}
      pageCount={data.pageCount}
      onPaginationChange={({ pageIndex, pageSize }) => {
        setPage(pageIndex)
        setPageSize(pageSize)
      }}
      onSortingChange={setSorting}
      onFilterChange={setFilters}
    />
  )
}
```

### Row Selection

```typescript
// Add row selection to columns
import { Checkbox } from '@/components/ui/checkbox'

export const columns: ColumnDef<Payment>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  // ... other columns
]

// Update DataTable component
const [rowSelection, setRowSelection] = useState({})

const table = useReactTable({
  // ... other config
  enableRowSelection: true,
  onRowSelectionChange: setRowSelection,
  state: {
    sorting,
    columnFilters,
    rowSelection,
  },
})
```

### Column Visibility Toggle

```typescript
// components/column-toggle.tsx
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

export function ColumnToggle({ table }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {table
          .getAllColumns()
          .filter((column) => column.getCanHide())
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
            >
              {column.id}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Faceted Filters

```typescript
// components/faceted-filter.tsx
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Command, CommandGroup, CommandItem } from '@/components/ui/command'

export function FacetedFilter({ column, title, options }) {
  const selectedValues = new Set(column?.getFilterValue() as string[])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          <PlusCircle className="mr-2 h-4 w-4" />
          {title}
          {selectedValues?.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge variant="secondary" className="rounded-sm px-1">
                {selectedValues.size}
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandGroup>
            {options.map((option) => {
              const isSelected = selectedValues.has(option.value)
              return (
                <CommandItem
                  key={option.value}
                  onSelect={() => {
                    if (isSelected) {
                      selectedValues.delete(option.value)
                    } else {
                      selectedValues.add(option.value)
                    }
                    const filterValues = Array.from(selectedValues)
                    column?.setFilterValue(
                      filterValues.length ? filterValues : undefined
                    )
                  }}
                >
                  <div className={cn(
                    'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border',
                    isSelected ? 'bg-primary text-primary-foreground' : 'opacity-50'
                  )}>
                    {isSelected && <Check className="h-4 w-4" />}
                  </div>
                  {option.label}
                </CommandItem>
              )
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

## Enterprise Patterns

### Virtualization for Large Datasets

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

export function VirtualizedTable({ data, columns }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const { rows } = table.getRowModel()

  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 10,
  })

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index]
          return (
            <div
              key={row.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <TableRow>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

### Export to CSV/Excel

```typescript
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export function ExportButton({ table }) {
  const exportToCSV = () => {
    const rows = table.getFilteredRowModel().rows
    const headers = table.getAllColumns().map((col) => col.id)

    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        headers.map((header) => row.getValue(header)).join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'export.csv'
    link.click()
  }

  return (
    <Button variant="outline" size="sm" onClick={exportToCSV}>
      <Download className="mr-2 h-4 w-4" />
      Export
    </Button>
  )
}
```

## Best Practices

### 1. Stable References for Data and Columns

```typescript
// ✅ Good - memoized columns
const columns = useMemo<ColumnDef<Payment>[]>(
  () => [
    {
      accessorKey: 'email',
      header: 'Email',
    },
    // ...
  ],
  []
)

// ❌ Bad - redefined on every render
const columns = [
  {
    accessorKey: 'email',
    header: 'Email',
  },
]
```

### 2. Type-Safe Column Definitions

```typescript
// Use ColumnDef<T> for type safety
import { ColumnDef } from '@tanstack/react-table'

type User = {
  id: string
  name: string
  email: string
}

const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'name', // Type-safe - knows 'name' exists on User
    header: 'Name',
  },
]
```

### 3. Controlled vs Uncontrolled State

```typescript
// ✅ Good - controlled state for external manipulation
const [sorting, setSorting] = useState<SortingState>([])

const table = useReactTable({
  // ...
  state: { sorting },
  onSortingChange: setSorting,
})

// Reset sorting externally
<Button onClick={() => setSorting([])}>Reset Sort</Button>
```

### 4. Loading and Empty States

```typescript
if (isLoading) {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

if (!data?.length) {
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <p className="text-muted-foreground">No data available</p>
      <Button className="mt-4">Add Data</Button>
    </div>
  )
}
```

## Common Patterns

### Search Across Multiple Columns

```typescript
const [globalFilter, setGlobalFilter] = useState('')

const table = useReactTable({
  // ...
  enableGlobalFilter: true,
  onGlobalFilterChange: setGlobalFilter,
  state: { globalFilter },
})

<Input
  placeholder="Search all columns..."
  value={globalFilter}
  onChange={(e) => setGlobalFilter(e.target.value)}
/>
```

### Persistent State (localStorage)

```typescript
const [sorting, setSorting] = useState<SortingState>(() => {
  const saved = localStorage.getItem('table-sorting')
  return saved ? JSON.parse(saved) : []
})

useEffect(() => {
  localStorage.setItem('table-sorting', JSON.stringify(sorting))
}, [sorting])
```

## Related Resources

- [TanStack Table Documentation](https://tanstack.com/table/latest)
- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/data-table)
- [TanStack Virtual](https://tanstack.com/virtual/latest) - For virtualization
- [TanStack Query Integration](https://tanstack.com/query/latest) - Server-state management
