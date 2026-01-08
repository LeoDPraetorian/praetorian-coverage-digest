# Phase 4: TanStack Tables + Virtualization

> **Phase Status:** Not Started
> **Estimated PRs:** 5
> **Duration:** 4-6 weeks
> **Risk Level:** MEDIUM - Can run parallel with Phase 3

---

## Post-Review Notes

> These clarifications were added based on the 2025-12-31 three-agent review.

| Note | Context |
|------|---------|
| **Task 4.4 Blocks on Phase 3** | URL state sync requires TanStack Router. Start Phase 4, but pause Task 4.4 until Phase 3 completes. |
| **Type Constraint for TData** | Add explicit type constraint to TanStackTable generic for better type inference. |
| **Performance Baseline First** | Capture table render metrics before migration (covered in Phase 0). |

---

## Security Fixes (Post-Security Review)

> These issues were identified in the 2025-12-31 security review and MUST be addressed.

| Issue | Severity | Fix Location |
|-------|----------|--------------|
| **MED-4: Column Path Injection** | MEDIUM | Task 4.1 - Whitelist allowed column paths |

---

## Entry Criteria

**Prerequisites from previous phases:**

- ✅ Phase 0: Performance baseline captured
- ✅ Phase 1: Impersonation context implemented
- ✅ Tests passing before starting this phase

**Note:** This phase can run **in parallel** with Phase 3. Table migrations are router-agnostic until URL state sync is needed (Task 4.4).

**If entry criteria not met:** Complete Phase 0 and Phase 1 first.

---

## Exit Criteria (Definition of Done)

This phase is complete when:

- [ ] All 5 tasks implemented with passing tests
- [ ] No TypeScript compilation errors
- [ ] All major tables migrated to TanStack Table
- [ ] Virtualization working for large datasets
- [ ] URL state sync working (if Phase 3 complete)
- [ ] Performance within acceptable thresholds
- [ ] Feature flags per table functional
- [ ] **SECURITY:** Column accessor paths validated against whitelist
- [ ] All E2E tests updated and passing
- [ ] Committed to version control

---

## Phase Goal

**What this phase accomplishes:**

Migrate table files to consistent TanStack Table patterns with virtualization for large datasets. Leverages existing `TanStackTable.tsx` and `columnAdapter.ts` infrastructure.

**What this phase does NOT include:**

- TanStack Router migration (Phase 3)
- Drawer state simplification (Phase 5)
- Any backend changes

---

## Existing Infrastructure

**IMPORTANT:** The codebase already has TanStack Table infrastructure:

| File | Lines | Purpose |
|------|-------|---------|
| `src/components/table/TanStackTable.tsx` | 253 | Pilot wrapper component |
| `src/components/table/columnAdapter.ts` | 101 | Column conversion utility |

**Pilot tables using TanStack Table:**
- PraetorianUsersTable
- CustomerUsersTable
- Access Logs

This existing infrastructure should be **leveraged and extended**, not replaced.

---

## Migration Scope

| Category | Count |
|----------|-------|
| TanStack Table (partial) | **10 files** already |
| Table-related files | **129 files** total |
| Virtualization files | **13 files** |

---

## Tasks

### Task 4.1: Enhance Column Adapter

**Files:**
- Modify: `src/components/table/columnAdapter.ts`

**Step 1: Write test for edge cases**

```typescript
// src/components/table/__tests__/columnAdapter.test.ts
import { adaptColumns } from '../columnAdapter'

describe('columnAdapter', () => {
  it('handles columns with custom cell renderers', () => {
    const legacyColumns = [{
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    }]

    const adapted = adaptColumns(legacyColumns)

    expect(adapted[0].cell).toBeDefined()
  })

  it('handles sortable columns', () => {
    const legacyColumns = [{
      key: 'name',
      header: 'Name',
      sortable: true,
    }]

    const adapted = adaptColumns(legacyColumns)

    expect(adapted[0].enableSorting).toBe(true)
  })

  it('handles nested accessor paths', () => {
    const legacyColumns = [{
      key: 'user.email',
      header: 'Email',
    }]

    const adapted = adaptColumns(legacyColumns)

    expect(adapted[0].accessorFn({ user: { email: 'test@example.com' } }))
      .toBe('test@example.com')
  })
})
```

**Step 2: Enhance column adapter with path whitelist**

```typescript
// src/components/table/columnAdapter.ts
import { ColumnDef, AccessorFn } from '@tanstack/react-table'

interface LegacyColumn<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  width?: number | string
}

/**
 * SECURITY FIX (MED-4): Whitelist allowed column accessor paths
 *
 * Without validation, a malicious column key like "__proto__.polluted"
 * could potentially be used for prototype pollution attacks.
 *
 * This whitelist ensures only known-safe paths are accessed.
 */
const ALLOWED_COLUMN_PATHS = new Set([
  // Asset columns
  'key', 'name', 'status', 'class', 'dns', 'source', 'created', 'updated',
  // Risk columns
  'severity', 'cvss', 'cwe', 'title', 'description', 'affected', 'remediation',
  // Job columns
  'jobId', 'type', 'state', 'progress', 'startedAt', 'completedAt',
  // User columns
  'email', 'role', 'lastLogin',
  // Nested paths (explicitly allowed)
  'user.email', 'user.name', 'asset.name', 'risk.severity',
] as const)

function isValidColumnPath(path: string): boolean {
  // Reject dangerous paths
  if (path.includes('__proto__') || path.includes('constructor') || path.includes('prototype')) {
    console.warn('[Security] Rejected dangerous column path:', path)
    return false
  }

  // Check against whitelist for strict validation
  if (ALLOWED_COLUMN_PATHS.has(path)) {
    return true
  }

  // Allow paths that are subsets of whitelisted patterns
  // (e.g., "name" is allowed if it doesn't contain dangerous characters)
  if (/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(path) && path.split('.').length <= 3) {
    return true
  }

  console.warn('[Security] Column path not in whitelist:', path)
  return false
}

export function adaptColumns<T>(legacyColumns: LegacyColumn<T>[]): ColumnDef<T>[] {
  return legacyColumns
    .filter(col => isValidColumnPath(col.key)) // SECURITY FIX (MED-4): Filter invalid paths
    .map((col) => {
      // Handle nested paths like 'user.email' using Object.hasOwn for safety
      const accessorFn: AccessorFn<T> = col.key.includes('.')
        ? (row) => {
            const keys = col.key.split('.')
            let current: any = row
            for (const key of keys) {
              // SECURITY FIX (MED-4): Use hasOwn to prevent prototype chain access
              if (current === null || current === undefined || !Object.hasOwn(current, key)) {
                return undefined
              }
              current = current[key]
            }
            return current
          }
        : (row) => {
            // SECURITY FIX (MED-4): Use hasOwn to prevent prototype chain access
            if (!Object.hasOwn(row as object, col.key)) {
              return undefined
            }
            return (row as any)[col.key]
          }

      return {
        id: col.key,
        accessorFn,
        header: col.header,
        cell: col.render
          ? ({ row }) => col.render!(row.original)
          : ({ getValue }) => getValue(),
        enableSorting: col.sortable ?? false,
        size: typeof col.width === 'number' ? col.width : undefined,
      }
    })
}
```

**Step 3: Commit**

```bash
git add src/components/table/columnAdapter.ts src/components/table/__tests__/columnAdapter.test.ts
git commit -m "feat(phase-2): enhance column adapter for edge cases"
```

---

### Task 4.2: Enhance TanStackTable Wrapper

**Files:**
- Modify: `src/components/table/TanStackTable.tsx`

**Step 1: Add virtualization support**

```typescript
// src/components/table/TanStackTable.tsx
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  SortingState,
  ColumnDef,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef, useState } from 'react'

interface TanStackTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  enableVirtualization?: boolean
  estimateRowHeight?: number
  onRowClick?: (row: T) => void
  isLoading?: boolean
  emptyMessage?: string
}

export function TanStackTable<T>({
  data,
  columns,
  enableVirtualization = false,
  estimateRowHeight = 48,
  onRowClick,
  isLoading,
  emptyMessage = 'No data available',
}: TanStackTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const tableContainerRef = useRef<HTMLDivElement>(null)

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: enableVirtualization ? undefined : getPaginationRowModel(),
  })

  const { rows } = table.getRowModel()

  // Virtualizer for large datasets
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => estimateRowHeight,
    overscan: 10,
    enabled: enableVirtualization,
  })

  const virtualRows = enableVirtualization ? virtualizer.getVirtualItems() : null
  const totalSize = enableVirtualization ? virtualizer.getTotalSize() : 0

  if (isLoading) {
    return <TableSkeleton columns={columns.length} />
  }

  if (data.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  return (
    <div
      ref={tableContainerRef}
      className={enableVirtualization ? 'h-[600px] overflow-auto' : ''}
    >
      <table className="w-full">
        <thead className="sticky top-0 bg-white z-10">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                  className={header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getIsSorted() && (
                    <span>{header.column.getIsSorted() === 'asc' ? ' ▲' : ' ▼'}</span>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {enableVirtualization ? (
            <>
              {virtualRows!.length > 0 && (
                <tr style={{ height: virtualRows![0].start }} />
              )}
              {virtualRows!.map((virtualRow) => {
                const row = rows[virtualRow.index]
                return (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick?.(row.original)}
                    className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                )
              })}
              {virtualRows!.length > 0 && (
                <tr style={{ height: totalSize - virtualRows![virtualRows!.length - 1].end }} />
              )}
            </>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row.original)}
                className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/table/TanStackTable.tsx
git commit -m "feat(phase-2): add virtualization support to TanStackTable"
```

---

### Task 4.3: Migrate Tables Incrementally

**Files:**
- Modify table files one by one

**Migration Order (by traffic/complexity):**

1. AssetsTable (highest traffic)
2. VulnerabilitiesTable (complex filters)
3. SeedsTable
4. JobsTable
5. Settings tables (lower traffic)

**Migration Pattern:**

```typescript
// BEFORE: Legacy Table
import { Table } from '@/components/table/Table'

function AssetsTable({ data }: { data: Asset[] }) {
  const columns = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ]

  return <Table data={data} columns={columns} />
}

// AFTER: TanStack Table
import { TanStackTable } from '@/components/table/TanStackTable'
import { adaptColumns } from '@/components/table/columnAdapter'

function AssetsTable({ data }: { data: Asset[] }) {
  const legacyColumns = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'status', header: 'Status', render: (row: Asset) => <StatusBadge status={row.status} /> },
  ]

  const columns = useMemo(() => adaptColumns(legacyColumns), [])

  return (
    <TanStackTable
      data={data}
      columns={columns}
      enableVirtualization={data.length > 100}
    />
  )
}
```

**Feature Flag Per Table:**

```typescript
const TANSTACK_TABLE_ASSETS = useFeatureFlag('TANSTACK_TABLE_ASSETS')

if (TANSTACK_TABLE_ASSETS) {
  return <TanStackAssetsTable data={data} />
} else {
  return <LegacyAssetsTable data={data} />
}
```

**Commit after each table:**

```bash
git add src/components/assets/AssetsTable.tsx
git commit -m "feat(phase-2): migrate AssetsTable to TanStack Table"
```

---

### Task 4.4: URL State Sync for Tables

**Files:**
- Modify: `src/components/table/TanStackTable.tsx`

**Depends on:** Phase 3 completion (TanStack Router available)

**Step 1: Add URL state synchronization**

```typescript
// With TanStack Router search params
import { useSearch, useNavigate } from '@tanstack/react-router'

interface TanStackTableWithUrlProps<T> extends TanStackTableProps<T> {
  syncToUrl?: boolean
}

export function TanStackTableWithUrl<T>({
  syncToUrl = false,
  ...props
}: TanStackTableWithUrlProps<T>) {
  const search = useSearch({ strict: false })
  const navigate = useNavigate()

  // Initialize sorting from URL
  const initialSorting: SortingState = search.sort
    ? [{ id: search.sort, desc: search.order === 'desc' }]
    : []

  const [sorting, setSorting] = useState<SortingState>(initialSorting)

  // Sync sorting to URL
  useEffect(() => {
    if (!syncToUrl || sorting.length === 0) return

    navigate({
      search: (prev) => ({
        ...prev,
        sort: sorting[0]?.id,
        order: sorting[0]?.desc ? 'desc' : 'asc',
      }),
      replace: true,
    })
  }, [sorting, syncToUrl, navigate])

  // ... rest of table implementation
}
```

**Step 2: Commit**

```bash
git add src/components/table/TanStackTable.tsx
git commit -m "feat(phase-2): add URL state sync for table sorting"
```

---

### Task 4.5: Audit and Virtualize Large Lists

**Files:**
- Audit all list components

**Step 1: Find non-virtualized lists**

```bash
grep -r "\.map(" src --include="*.tsx" | grep -v "node_modules" | grep -v "TanStackTable" | head -50
```

**Step 2: Identify candidates for virtualization**

Lists that should be virtualized (>100 items possible):
- Asset lists
- Vulnerability lists
- Log viewers
- Dropdown options (large lists)

**Step 3: Add virtualization to identified lists**

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

function VirtualizedList<T>({ items, renderItem, estimateHeight = 40 }: Props<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateHeight,
    overscan: 5,
  })

  return (
    <div ref={parentRef} className="h-[400px] overflow-auto">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: virtualRow.start,
              height: virtualRow.size,
              width: '100%',
            }}
          >
            {renderItem(items[virtualRow.index])}
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add src/components/
git commit -m "feat(phase-2): virtualize large list components"
```

---

## Performance Targets

| Metric | Target | Alert |
|--------|--------|-------|
| Table render (1000 rows) | <100ms | <200ms |
| Virtual scroll FPS | >50 | >30 |
| Initial table load | <200ms | <300ms |

---

## Rollback Strategy

**Feature Flags Per Table:**

```typescript
TANSTACK_TABLE_ASSETS=false
TANSTACK_TABLE_VULNERABILITIES=false
// ... etc
```

Roll back individual tables if issues arise.

---

## E2E Test Deliverables

| Test | Description |
|------|-------------|
| `table-sorting.spec.ts` | Verify sorting works correctly |
| `table-virtualization.spec.ts` | Verify virtualization with large datasets |
| `table-filtering.spec.ts` | Verify filtering works |
| `table-selection.spec.ts` | Verify row selection |

---

## Handoff to Next Phase

**When this phase is complete:**

- Phase 4 provides: Consistent TanStack Table implementation with virtualization
- This phase completes independently

**To resume work:**

1. Verify all exit criteria checked
2. Phase 2 is complete

---

## Phase-Specific Notes

**Technical decisions made in this phase:**

- Virtualization threshold: >100 rows
- Overscan: 10 rows for smooth scrolling
- Feature flags per table for granular rollback

**Dependencies introduced:**

- Already using `@tanstack/react-table`
- Already using `@tanstack/react-virtual`

**Refactoring opportunities (future work):**

- Column resizing
- Row reordering
- Export to CSV/Excel
