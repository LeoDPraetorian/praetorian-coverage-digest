# Table + Virtual Integration

**Deep dive on integrating TanStack Table with TanStack Virtual for high-performance virtualized tables.**

## Overview

TanStack Virtual provides **virtualization** - rendering only visible rows to the DOM while maintaining smooth scrolling. Combined with TanStack Table's headless logic, you can render tables with 100,000+ rows at 60fps.

## When to Use Virtualization

| Dataset Size       | Recommendation                          |
| ------------------ | --------------------------------------- |
| < 500 rows         | No virtualization needed                |
| 500-5,000 rows     | Consider virtualization                 |
| 5,000-100,000 rows | **Virtualization required**             |
| 100,000+ rows      | Virtualization + server-side pagination |

## Core Integration Pattern

### Basic Virtualized Table

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table'

function VirtualizedTable({ data, columns }) {
  const tableContainerRef = useRef<HTMLDivElement>(null)

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const { rows } = table.getRowModel()

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 48, // Estimated row height in pixels
    overscan: 5, // Render 5 extra rows above/below viewport
  })

  return (
    <div
      ref={tableContainerRef}
      style={{ height: '600px', overflow: 'auto' }}
    >
      {/* Header */}
      <table style={{ width: '100%' }}>
        <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
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
      </table>

      {/* Virtualized Body */}
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map(virtualRow => {
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
              <table style={{ width: '100%' }}>
                <tbody>
                  <tr>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

## Dynamic Row Heights

### Using measureElement for Variable Heights

```typescript
function DynamicHeightTable({ data, columns }) {
  const tableContainerRef = useRef<HTMLDivElement>(null)

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const { rows } = table.getRowModel()

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: (index) => {
      // Estimate based on content - can vary per row
      const row = rows[index]
      return row.original.hasExpandedContent ? 120 : 48
    },
    // CRITICAL: measureElement for accurate heights
    measureElement:
      typeof window !== 'undefined' &&
      navigator.userAgent.indexOf('Firefox') === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
    overscan: 10, // More overscan for variable heights
  })

  return (
    <div ref={tableContainerRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map(virtualRow => {
          const row = rows[virtualRow.index]
          return (
            <div
              key={row.id}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement} // CRITICAL: Add ref for measurement
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {/* Row content */}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

### Expandable Rows with Variable Heights

```typescript
function ExpandableVirtualTable({ data, columns }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    onExpandedChange: setExpanded,
    state: { expanded },
  })

  const { rows } = table.getRowModel()

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => {
      const row = rows[index]
      // Expanded rows are taller
      return row.getIsExpanded() ? 200 : 48
    },
    measureElement: (element) => element?.getBoundingClientRect().height,
    overscan: 5,
  })

  // Re-measure when expanded state changes
  useEffect(() => {
    rowVirtualizer.measure()
  }, [expanded, rowVirtualizer])

  return (/* Render virtualized table */)
}
```

## Scroll Position Preservation

### Preserve Scroll on Data Refresh

```typescript
function VirtualTableWithScrollRestore({ data, columns }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollOffsetRef = useRef(0)

  const { rows } = table.getRowModel()

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 48,
    overscan: 5,
    // Initial scroll offset (for restoration)
    initialOffset: scrollOffsetRef.current,
  })

  // Save scroll position before data changes
  useEffect(() => {
    return () => {
      scrollOffsetRef.current = containerRef.current?.scrollTop ?? 0
    }
  }, [data])

  return (/* Render table */)
}
```

### Scroll to Specific Row

```typescript
function TableWithScrollTo({ data, columns }) {
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 48,
  })

  const scrollToRow = (index: number) => {
    rowVirtualizer.scrollToIndex(index, {
      align: 'center', // 'start' | 'center' | 'end'
      behavior: 'smooth', // 'auto' | 'smooth'
    })
  }

  return (
    <>
      <button onClick={() => scrollToRow(0)}>Scroll to Top</button>
      <button onClick={() => scrollToRow(rows.length - 1)}>Scroll to Bottom</button>
      <button onClick={() => scrollToRow(Math.floor(rows.length / 2))}>
        Scroll to Middle
      </button>
      {/* Table */}
    </>
  )
}
```

## Grid Virtualization (Rows + Columns)

### Virtualized Grid for Wide Tables

```typescript
function VirtualizedGrid({ data, columns }) {
  const containerRef = useRef<HTMLDivElement>(null)

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const { rows } = table.getRowModel()
  const visibleColumns = table.getVisibleFlatColumns()

  // Row virtualizer (vertical)
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 48,
    overscan: 5,
  })

  // Column virtualizer (horizontal)
  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: visibleColumns.length,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => visibleColumns[index].getSize(),
    overscan: 3,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()
  const virtualColumns = columnVirtualizer.getVirtualItems()

  // Calculate padding for non-virtualized area
  const [paddingLeft, paddingRight] = virtualColumns.length > 0
    ? [
        virtualColumns[0].start,
        columnVirtualizer.getTotalSize() - virtualColumns[virtualColumns.length - 1].end,
      ]
    : [0, 0]

  return (
    <div
      ref={containerRef}
      style={{ height: '600px', width: '100%', overflow: 'auto' }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: `${columnVirtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualRows.map(virtualRow => {
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
                display: 'flex',
              }}
            >
              {/* Left padding */}
              <div style={{ width: paddingLeft, flexShrink: 0 }} />

              {/* Virtualized cells */}
              {virtualColumns.map(virtualColumn => {
                const cell = row.getVisibleCells()[virtualColumn.index]
                return (
                  <div
                    key={cell.id}
                    style={{
                      width: virtualColumn.size,
                      flexShrink: 0,
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                )
              })}

              {/* Right padding */}
              <div style={{ width: paddingRight, flexShrink: 0 }} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

## Performance Optimization

### Memoization

```typescript
function OptimizedVirtualTable({ data, columns }) {
  // Memoize columns
  const memoizedColumns = useMemo(() => columns, [columns])

  // Memoize table options
  const tableOptions = useMemo(() => ({
    data,
    columns: memoizedColumns,
    getCoreRowModel: getCoreRowModel(),
  }), [data, memoizedColumns])

  const table = useReactTable(tableOptions)

  // Memoize row component
  const Row = memo(({ row, virtualRow }) => (
    <div
      style={{
        position: 'absolute',
        transform: `translateY(${virtualRow.start}px)`,
        height: virtualRow.size,
      }}
    >
      {row.getVisibleCells().map(cell => (
        <Cell key={cell.id} cell={cell} />
      ))}
    </div>
  ))

  return (/* Render with memoized Row */)
}
```

### CSS Containment

```typescript
// Add CSS containment for better performance
<div
  ref={containerRef}
  style={{
    height: '600px',
    overflow: 'auto',
    contain: 'strict', // CRITICAL: CSS containment
  }}
>
  <div
    style={{
      height: `${rowVirtualizer.getTotalSize()}px`,
      position: 'relative',
      contain: 'strict', // Also on inner container
    }}
  >
    {/* Virtual rows */}
  </div>
</div>
```

### Avoiding Re-renders

```typescript
// BAD: Creates new reference every render
const rowVirtualizer = useVirtualizer({
  estimateSize: () => 48, // ✅ OK - primitive
  getScrollElement: () => containerRef.current, // ✅ OK - ref
  rangeExtractor: (range) => customExtract(range), // ❌ New function every render
});

// GOOD: Stable function references
const rangeExtractor = useCallback((range) => customExtract(range), []);
const rowVirtualizer = useVirtualizer({
  estimateSize: () => 48,
  getScrollElement: () => containerRef.current,
  rangeExtractor, // ✅ Stable reference
});
```

## Integration with Sorting/Filtering

### Virtual Table with Client-Side Operations

```typescript
function VirtualSortableFilterableTable({ data, columns }) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const { rows } = table.getRowModel()

  // CRITICAL: Use filtered/sorted rows for virtualization
  const rowVirtualizer = useVirtualizer({
    count: rows.length, // This uses the processed rows
    getScrollElement: () => containerRef.current,
    estimateSize: () => 48,
  })

  // Reset scroll when filter changes
  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0 })
  }, [globalFilter])

  return (/* Render table */)
}
```

## Complete Example

### Full Router + Query + Table + Virtual Integration

```typescript
// routes/users.tsx
export const Route = createFileRoute('/users')({
  validateSearch: (search) => ({
    page: Number(search.page) || 1,
    sort: (search.sort as string) || 'name',
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient }, deps }) =>
    queryClient.ensureQueryData(usersQueryOptions(deps)),
})

function UsersPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const search = Route.useSearch()

  const { data } = useSuspenseQuery(usersQueryOptions(search))

  const columns = useMemo<ColumnDef<User>[]>(() => [
    { accessorKey: 'name', header: 'Name', size: 200 },
    { accessorKey: 'email', header: 'Email', size: 300 },
    { accessorKey: 'status', header: 'Status', size: 100 },
  ], [])

  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const { rows } = table.getRowModel()

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 48,
    overscan: 10,
  })

  return (
    <div ref={containerRef} className="h-[600px] overflow-auto">
      <table className="w-full">
        <thead className="sticky top-0 bg-white z-10">
          {/* Headers */}
        </thead>
      </table>
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map(virtualRow => {
          const row = rows[virtualRow.index]
          return (
            <div
              key={row.id}
              style={{
                position: 'absolute',
                top: 0,
                transform: `translateY(${virtualRow.start}px)`,
                height: `${virtualRow.size}px`,
                width: '100%',
              }}
            >
              <table className="w-full">
                <tbody>
                  <tr>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} style={{ width: cell.column.getSize() }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

## Related

- [Query + Table Integration](query-table-integration.md)
- [Infinite Scroll](infinite-scroll.md)
- [Server-Side Patterns](server-side-patterns.md)
