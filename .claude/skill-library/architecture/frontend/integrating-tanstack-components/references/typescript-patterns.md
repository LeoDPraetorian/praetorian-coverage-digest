# TypeScript Patterns

**End-to-end type safety across the TanStack stack.**

## Overview

TanStack libraries are designed for TypeScript-first development. This reference covers type patterns for seamless integration across Router, Query, Table, and Virtual.

## Router Type Safety

### Typed Search Params

```typescript
// Define search params type
interface UserSearchParams {
  page: number;
  pageSize: number;
  sort?: string;
  order?: "asc" | "desc";
  filter?: string;
}

export const Route = createFileRoute("/users")({
  validateSearch: (search: Record<string, unknown>): UserSearchParams => ({
    page: Number(search.page) || 1,
    pageSize: Number(search.pageSize) || 25,
    sort: typeof search.sort === "string" ? search.sort : undefined,
    order: search.order === "desc" ? "desc" : "asc",
    filter: typeof search.filter === "string" ? search.filter : undefined,
  }),
});

// Usage - fully typed
function UsersPage() {
  const search = Route.useSearch(); // Type: UserSearchParams
  const navigate = Route.useNavigate();

  // TypeScript enforces correct shape
  navigate({
    search: { page: 2 }, // ✅ Valid
    // search: { page: 'two' } // ❌ Type error
  });
}
```

### Typed Route Params

```typescript
export const Route = createFileRoute("/users/$userId")({
  parseParams: (params) => ({
    userId: params.userId, // Type: string
  }),
});

function UserPage() {
  const { userId } = Route.useParams(); // Type: { userId: string }
}
```

### Typed Loader Data

```typescript
interface UserLoaderData {
  user: User;
  permissions: string[];
}

export const Route = createFileRoute("/users/$userId")({
  loader: async ({ params }): Promise<UserLoaderData> => {
    const [user, permissions] = await Promise.all([
      fetchUser(params.userId),
      fetchPermissions(params.userId),
    ]);
    return { user, permissions };
  },
});

function UserPage() {
  const data = Route.useLoaderData(); // Type: UserLoaderData
}
```

## Query Type Inference

### queryOptions Type Safety

```typescript
import { queryOptions } from "@tanstack/react-query";

// Response type
interface UsersResponse {
  users: User[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
  };
}

// Query options factory with full type inference
export const usersQueryOptions = (params: UserSearchParams) =>
  queryOptions({
    queryKey: ["users", params] as const,
    queryFn: async (): Promise<UsersResponse> => {
      const response = await fetch(`/api/users?${new URLSearchParams(params as any)}`);
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

// Usage - data type is inferred
function UsersPage() {
  const { data } = useQuery(usersQueryOptions({ page: 1, pageSize: 25 }));
  // data type: UsersResponse | undefined

  const { data: users } = useSuspenseQuery(usersQueryOptions({ page: 1, pageSize: 25 }));
  // users type: UsersResponse (never undefined with Suspense)
}
```

### Mutation Types

```typescript
interface CreateUserInput {
  name: string;
  email: string;
  role: "admin" | "user";
}

interface CreateUserResponse {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  createdAt: string;
}

const createUserMutation = useMutation({
  mutationFn: async (input: CreateUserInput): Promise<CreateUserResponse> => {
    const response = await fetch("/api/users", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return response.json();
  },
  onSuccess: (data) => {
    // data type: CreateUserResponse
    console.log(`Created user ${data.id}`);
  },
});

// Usage
createUserMutation.mutate({
  name: "John",
  email: "john@example.com",
  role: "user", // ✅ Type checked
  // role: 'superadmin' // ❌ Type error
});
```

## Table Column Types

### Typed Column Definitions

```typescript
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";

interface User {
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive";
  createdAt: Date;
}

// Option 1: ColumnDef array
const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: (info) => info.getValue(), // getValue() returns string
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: (info) => {
      const status = info.getValue<User["status"]>(); // Explicit type
      return status === "active" ? "Active" : "Inactive";
    },
  },
];

// Option 2: Column helper (better type inference)
const columnHelper = createColumnHelper<User>();

const columns = [
  columnHelper.accessor("name", {
    header: "Name",
    cell: (info) => info.getValue(), // Type inferred as string
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => {
      const status = info.getValue(); // Type inferred as 'active' | 'inactive'
      return status === "active" ? "Active" : "Inactive";
    },
  }),
  columnHelper.accessor("createdAt", {
    header: "Created",
    cell: (info) => info.getValue().toLocaleDateString(), // Type inferred as Date
  }),
];
```

### Typed Cell Renderers

```typescript
// Custom cell component with proper types
interface CellProps<TData, TValue> {
  getValue: () => TValue
  row: Row<TData>
  column: Column<TData, TValue>
  table: Table<TData>
}

function StatusCell({ getValue, row }: CellProps<User, User['status']>) {
  const status = getValue()
  return (
    <span className={status === 'active' ? 'text-green-500' : 'text-red-500'}>
      {status}
    </span>
  )
}

const columns = [
  columnHelper.accessor('status', {
    header: 'Status',
    cell: StatusCell,
  }),
]
```

## Virtual Type Safety

### Typed useVirtualizer

```typescript
import { useVirtualizer, VirtualItem } from '@tanstack/react-virtual'

interface User {
  id: string
  name: string
}

function VirtualList({ users }: { users: User[] }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: users.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
  })

  return (
    <div ref={parentRef}>
      {virtualizer.getVirtualItems().map((virtualItem: VirtualItem) => {
        const user = users[virtualItem.index]
        return (
          <div key={user.id}>
            {user.name}
          </div>
        )
      })}
    </div>
  )
}
```

## Full Integration Types

### Complete Type-Safe Example

```typescript
// types.ts
export interface User {
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive";
}

export interface UserSearchParams {
  page: number;
  pageSize: number;
  sort?: keyof User;
  order?: "asc" | "desc";
}

export interface UsersResponse {
  users: User[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// queries.ts
export const usersQueryOptions = (params: UserSearchParams) =>
  queryOptions({
    queryKey: ["users", params] as const,
    queryFn: (): Promise<UsersResponse> => fetchUsers(params),
  });

// routes/users.tsx
export const Route = createFileRoute("/users")({
  validateSearch: (search): UserSearchParams => ({
    page: Number(search.page) || 1,
    pageSize: Number(search.pageSize) || 25,
    sort: isValidSortKey(search.sort) ? search.sort : undefined,
    order: search.order === "desc" ? "desc" : "asc",
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient }, deps }) =>
    queryClient.ensureQueryData(usersQueryOptions(deps)),
});

// Type guard
function isValidSortKey(value: unknown): value is keyof User {
  return typeof value === "string" && ["id", "name", "email", "status"].includes(value);
}

// Component
function UsersPage() {
  const search = Route.useSearch(); // UserSearchParams
  const { data } = useSuspenseQuery(usersQueryOptions(search)); // UsersResponse

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      { accessorKey: "email", header: "Email" },
      { accessorKey: "status", header: "Status" },
    ],
    []
  );

  const table = useReactTable({
    data: data.users,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Full type safety throughout
}
```

## Related

- [Router + Query Integration](router-query-integration.md)
- [Query + Table Integration](query-table-integration.md)
