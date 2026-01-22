# Column Definitions

Complete guide to TanStack Table v8 column definitions with type-safe patterns using `createColumnHelper`.

## Column Definition Types

TanStack Table v8 supports three distinct column types:

### 1. Accessor Columns

Contain an underlying data model accessed via `accessorKey` or `accessorFn`, enabling sorting, filtering, and grouping capabilities.

```typescript
columnHelper.accessor("name", {
  header: "Name",
  cell: (info) => info.getValue(),
});
```

### 2. Display Columns

Have no data model and render arbitrary content like action buttons or checkboxes.

```typescript
columnHelper.display({
  id: 'actions',
  header: 'Actions',
  cell: ({ row }) => <button onClick={() => handleEdit(row.original)}>Edit</button>,
})
```

### 3. Grouping Columns

Organize other columns hierarchically without their own data model.

```typescript
columnHelper.group({
  id: "personal-info",
  header: "Personal Information",
  columns: [
    columnHelper.accessor("firstName", { header: "First Name" }),
    columnHelper.accessor("lastName", { header: "Last Name" }),
  ],
});
```

---

## createColumnHelper API

The `createColumnHelper` function provides type-safe utilities for column creation:

```typescript
import { createColumnHelper } from '@tanstack/react-table'

type User = {
  id: string
  firstName: string
  lastName: string
  age: number
  email: string
  status: 'active' | 'inactive'
}

const columnHelper = createColumnHelper<User>()

const columns = [
  columnHelper.accessor('firstName', {
    header: 'First Name',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('lastName', {
    header: 'Last Name',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('age', {
    header: 'Age',
    cell: info => info.getValue(),
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <div>
        <button onClick={() => handleEdit(row.original)}>Edit</button>
        <button onClick={() => handleDelete(row.original.id)}>Delete</button>
      </div>
    ),
  }),
]
```

The helper enforces the relationship between your data type and column definitions, providing autocompletion and compile-time type checking.

---

## Data Accessor Patterns

### accessorKey (String-Based Access)

Use for direct property access:

```typescript
// Direct property
columnHelper.accessor("firstName", { header: "First Name" });

// Deep nesting with dot notation
columnHelper.accessor("user.profile.firstName", { header: "First Name" });

// Array indices
columnHelper.accessor("items.0.name", { header: "First Item" });
```

### accessorFn (Function-Based Access)

Use for computed values and transformations:

```typescript
// Combine multiple fields
columnHelper.accessor((row) => `${row.firstName} ${row.lastName}`, {
  id: "fullName",
  header: "Full Name",
});

// Computed values
columnHelper.accessor((row) => new Date().getFullYear() - row.birthYear, {
  id: "age",
  header: "Age",
});

// Conditional values
columnHelper.accessor((row) => (row.status === "active" ? "Yes" : "No"), {
  id: "isActive",
  header: "Active?",
});
```

**Important:** When using `accessorFn`, you must provide either:

- A manual `id` property, OR
- A string `header` value (used as fallback id)

```typescript
// Has explicit id - GOOD
columnHelper.accessor((row) => row.computed, {
  id: "computed",
  header: "Value",
});

// Uses header as id - GOOD
columnHelper.accessor((row) => row.computed, {
  header: "Value", // 'Value' becomes the column id
});

// Error: no id derivable - BAD
columnHelper.accessor((row) => row.computed, {
  // Missing both id and header!
});
```

---

## Column Identification System

Every column requires a unique identifier, resolved in priority order:

1. **Manual `id` property** (explicit assignment)
2. **`accessorKey` value** (periods replaced by underscores)
3. **String `header` value** (fallback)

```typescript
// id = 'name' (from accessorKey)
{ accessorKey: 'name', header: 'Name' }

// id = 'user_profile_name' (dots → underscores)
{ accessorKey: 'user.profile.name', header: 'Name' }

// id = 'customId' (explicit override)
{ accessorKey: 'name', id: 'customId', header: 'Name' }

// id = 'Full Name' (from header when using accessorFn)
{ accessorFn: row => `${row.first} ${row.last}`, header: 'Full Name' }
```

---

## Core Column Properties

### Rendering Properties

```typescript
{
  // Header rendering (string or function)
  header: 'Column Title',
  header: ({ column, table }) => <span>{column.id}</span>,

  // Cell rendering (function)
  cell: info => info.getValue(),
  cell: ({ getValue, row, column, table }) => (
    <CustomCell value={getValue()} row={row} />
  ),

  // Footer rendering (string or function)
  footer: 'Total',
  footer: ({ column, table }) => calculateTotal(table),

  // Aggregated cell (for grouped rows)
  aggregatedCell: info => info.getValue(),
}
```

### Feature Configuration

```typescript
{
  // Sorting
  enableSorting: true,
  sortingFn: 'alphanumeric',  // Built-in: 'alphanumeric' | 'datetime' | 'basic' | 'text'
  sortDescFirst: false,
  invertSorting: false,

  // Filtering
  enableColumnFilter: true,
  enableGlobalFilter: true,
  filterFn: 'includesString',  // Built-in: 'includesString' | 'equals' | 'arrIncludes' | etc.

  // Grouping
  enableGrouping: true,
  aggregationFn: 'sum',  // Built-in: 'sum' | 'min' | 'max' | 'mean' | 'count' | 'unique'
}
```

### Sizing

```typescript
{
  size: 150,      // Default/initial size in pixels
  minSize: 50,    // Minimum size when resizing
  maxSize: 300,   // Maximum size when resizing
}
```

### Display Control

```typescript
{
  enableHiding: true,       // Allow column visibility toggle
  enablePinning: true,      // Allow pinning left/right
  enableResizing: true,     // Allow column resizing
}
```

### Meta Property

Store custom data accessible throughout the table:

```typescript
{
  meta: {
    align: 'right',
    format: 'currency',
    editable: true,
  },
}

// Access in cell renderer
cell: ({ column }) => {
  const meta = column.columnDef.meta
  return <span style={{ textAlign: meta?.align }}>{...}</span>
}
```

---

## Cell Rendering Context

Cell renderers receive comprehensive context:

```typescript
cell: (context) => {
  const {
    getValue,     // () => TValue - Get cell value
    row,          // Row<TData> - Row instance
    column,       // Column<TData, TValue> - Column instance
    table,        // Table<TData> - Table instance
    cell,         // Cell<TData, TValue> - Cell instance
    renderValue,  // () => TValue - Get rendered value
  } = context

  return <div>{getValue()}</div>
}
```

### getValue() vs row.original

```typescript
// Using getValue() - preferred for accessor columns
cell: (info) => info.getValue(); // Returns typed accessor value

// Using row.original - for display columns or complex access
cell: ({ row }) => row.original.status; // Access raw row data
```

---

## Header Rendering Context

```typescript
header: (context) => {
  const {
    column,       // Column instance
    table,        // Table instance
    header,       // Header instance
  } = context

  return (
    <div onClick={column.getToggleSortingHandler()}>
      {column.columnDef.header}
      {column.getIsSorted() ? (column.getIsSorted() === 'desc' ? '↓' : '↑') : ''}
    </div>
  )
}
```

---

## TypeScript Patterns

### Typing Column Definitions

```typescript
import { ColumnDef } from "@tanstack/react-table";

type TData = {
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive";
};

// Using ColumnDef array type
const columns: ColumnDef<TData>[] = [
  {
    accessorKey: "name",
    header: "Name",
    // TypeScript ensures 'name' exists on TData
  },
];

// Using createColumnHelper (recommended)
const columnHelper = createColumnHelper<TData>();
const columns = [
  columnHelper.accessor("name", { header: "Name" }),
  // TypeScript autocompletes accessor keys
];
```

### Typing Custom Cell Components

```typescript
import { CellContext } from '@tanstack/react-table'

// Typed cell component
const StatusCell = ({
  getValue,
  row,
}: CellContext<User, 'active' | 'inactive'>) => {
  const status = getValue()
  return (
    <span className={status === 'active' ? 'text-green' : 'text-red'}>
      {status}
    </span>
  )
}

// Usage
columnHelper.accessor('status', {
  header: 'Status',
  cell: StatusCell,
})
```

### Generic Column Definitions

```typescript
// Reusable columns for types extending base interface
interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

const createBaseColumns = <T extends BaseEntity>() => {
  const helper = createColumnHelper<T>();

  return [
    helper.accessor("id", { header: "ID" }),
    helper.accessor("createdAt", {
      header: "Created",
      cell: (info) => formatDate(info.getValue()),
    }),
    helper.accessor("updatedAt", {
      header: "Updated",
      cell: (info) => formatDate(info.getValue()),
    }),
  ];
};
```

---

## Best Practices

### 1. Keep Column Definitions Stable

Define columns outside components to prevent re-renders:

```typescript
// ✅ GOOD - stable reference
const columns = [columnHelper.accessor("name", { header: "Name" })];

function MyTable({ data }: { data: User[] }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
}

// ❌ BAD - new array every render
function MyTable({ data }: { data: User[] }) {
  const columns = [
    // Created on every render!
    columnHelper.accessor("name", { header: "Name" }),
  ];
}
```

### 2. Memoize Dynamic Columns

When columns must be dynamic:

```typescript
const columns = useMemo(
  () => [columnHelper.accessor("name", { header: "Name" }), ...dynamicColumns],
  [dynamicColumns]
);
```

### 3. Use defaultColumn for Shared Configuration

```typescript
const table = useReactTable({
  data,
  columns,
  defaultColumn: {
    cell: ({ getValue }) => getValue() ?? "-",
    size: 150,
    minSize: 50,
    maxSize: 400,
  },
  getCoreRowModel: getCoreRowModel(),
});
```

### 4. Accessor Functions for Data Extraction

Keep data transformation in accessors, not cell renderers:

```typescript
// ✅ GOOD - data extraction in accessor
columnHelper.accessor((row) => `${row.firstName} ${row.lastName}`, {
  id: "fullName",
  header: "Full Name",
  cell: (info) => info.getValue(), // Simple rendering
});

// ❌ BAD - complex logic in cell renderer
columnHelper.display({
  id: "fullName",
  header: "Full Name",
  cell: ({ row }) => `${row.original.firstName} ${row.original.lastName}`,
});
```

### 5. Use createColumnHelper for Type Safety

Always prefer `createColumnHelper` over manual `ColumnDef` arrays:

```typescript
// ✅ GOOD - type-safe with autocomplete
const columnHelper = createColumnHelper<User>();
const columns = [
  columnHelper.accessor("name", { header: "Name" }), // 'name' autocompletes
];

// ⚠️ ACCEPTABLE - but no autocomplete
const columns: ColumnDef<User>[] = [
  { accessorKey: "name", header: "Name" }, // 'name' is not autocompleted
];
```

---

## Common Patterns

### Action Column

```typescript
columnHelper.display({
  id: 'actions',
  header: 'Actions',
  cell: ({ row }) => (
    <DropdownMenu>
      <DropdownMenuItem onClick={() => handleView(row.original)}>
        View
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleEdit(row.original)}>
        Edit
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleDelete(row.original.id)}>
        Delete
      </DropdownMenuItem>
    </DropdownMenu>
  ),
})
```

### Selection Column

```typescript
columnHelper.display({
  id: 'select',
  header: ({ table }) => (
    <input
      type="checkbox"
      checked={table.getIsAllRowsSelected()}
      onChange={table.getToggleAllRowsSelectedHandler()}
    />
  ),
  cell: ({ row }) => (
    <input
      type="checkbox"
      checked={row.getIsSelected()}
      disabled={!row.getCanSelect()}
      onChange={row.getToggleSelectedHandler()}
    />
  ),
})
```

### Formatted Currency Column

```typescript
columnHelper.accessor("price", {
  header: "Price",
  cell: (info) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(info.getValue()),
});
```

### Link Column

```typescript
columnHelper.accessor('name', {
  header: 'Name',
  cell: ({ getValue, row }) => (
    <Link to={`/items/${row.original.id}`}>
      {getValue()}
    </Link>
  ),
})
```

### Badge/Status Column

```typescript
columnHelper.accessor('status', {
  header: 'Status',
  cell: info => {
    const status = info.getValue()
    const colorMap = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
    }
    return (
      <span className={`px-2 py-1 rounded ${colorMap[status]}`}>
        {status}
      </span>
    )
  },
})
```

---

## Sources

- [TanStack Table v8 Column Definitions Guide](https://tanstack.com/table/v8/docs/guide/column-defs)
- [TanStack Table v8 ColumnDef API](https://tanstack.com/table/v8/docs/api/core/column-def)
- [DeepWiki TanStack Table Column Definitions](https://deepwiki.com/tanstack/table/3.2-column-definitions)
