# Router + Query Integration

**Deep dive on integrating TanStack Router with TanStack Query for optimal data loading.**

## Overview

TanStack Router and TanStack Query are designed to work together seamlessly. The key integration pattern uses **route loaders** to prefetch data with `ensureQueryData`, eliminating waterfalls and ensuring data is available before components render.

## Core Integration Pattern

### 1. Setup Router Context with QueryClient

```typescript
// src/router.tsx
import { createRouter, createRootRouteWithContext } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'

// Define router context type
interface RouterContext {
  queryClient: QueryClient
}

// Create root route with typed context
const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
})

// Create QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes
    },
  },
})

// Create router with context
export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreloadStaleTime: 0, // Required for external cache integration
})
```

### 2. Create Reusable Query Options

```typescript
// src/api/users.ts
import { queryOptions } from '@tanstack/react-query'

export interface User {
  id: string
  name: string
  email: string
}

export interface UserFilters {
  page?: number
  sort?: string
  search?: string
}

// Query options factory - reusable across loaders and components
export const usersQueryOptions = (filters?: UserFilters) =>
  queryOptions({
    queryKey: ['users', filters ?? {}],
    queryFn: () => fetchUsers(filters),
    staleTime: 5 * 60 * 1000,
  })

export const userQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    staleTime: 5 * 60 * 1000,
  })
```

### 3. Use ensureQueryData in Route Loaders

```typescript
// src/routes/users.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { usersQueryOptions } from '@/api/users'

export const Route = createFileRoute('/users')({
  // Validate and parse search params
  validateSearch: (search): UserFilters => ({
    page: Number(search.page) || 1,
    sort: (search.sort as string) || 'name',
    search: (search.search as string) || '',
  }),

  // Declare which search params affect the loader
  loaderDeps: ({ search }) => search,

  // Prefetch data in loader - runs before component renders
  loader: ({ context: { queryClient }, deps }) =>
    queryClient.ensureQueryData(usersQueryOptions(deps)),

  component: UsersPage,
})

function UsersPage() {
  const search = Route.useSearch()

  // Data is guaranteed to be in cache - will not suspend
  const { data: users } = useSuspenseQuery(usersQueryOptions(search))

  return (
    <div>
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  )
}
```

## Prefetching Strategies

### Strategy 1: Await Critical Data, Prefetch Secondary

```typescript
export const Route = createFileRoute('/dashboard')({
  loader: async ({ context: { queryClient } }) => {
    // Start prefetching non-critical data (don't await)
    queryClient.prefetchQuery(recentActivityQueryOptions())
    queryClient.prefetchQuery(notificationsQueryOptions())

    // Await critical data needed for initial render
    await queryClient.ensureQueryData(dashboardStatsQueryOptions())
  },
})
```

### Strategy 2: Parallel Data Loading

```typescript
export const Route = createFileRoute('/user/$userId')({
  loader: async ({ context: { queryClient }, params }) => {
    // Load multiple queries in parallel
    await Promise.all([
      queryClient.ensureQueryData(userQueryOptions(params.userId)),
      queryClient.ensureQueryData(userPostsQueryOptions(params.userId)),
      queryClient.ensureQueryData(userFollowersQueryOptions(params.userId)),
    ])
  },
})
```

### Strategy 3: Prefetch on Link Hover

```typescript
import { Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'

function UserLink({ userId, children }) {
  const queryClient = useQueryClient()

  return (
    <Link
      to="/user/$userId"
      params={{ userId }}
      onMouseEnter={() => {
        // Prefetch when user hovers over link
        queryClient.prefetchQuery(userQueryOptions(userId))
      }}
    >
      {children}
    </Link>
  )
}
```

## Cache Key Patterns

### Sync Cache Keys with Router Params

```typescript
// BAD: Static cache key ignores router state
const { data } = useQuery({
  queryKey: ['users'],  // Won't refetch when params change
  queryFn: fetchUsers,
})

// GOOD: Cache key includes router params
const search = Route.useSearch()
const { data } = useQuery({
  queryKey: ['users', search],  // Refetches when search params change
  queryFn: () => fetchUsers(search),
})
```

### Hierarchical Cache Keys

```typescript
// Enables targeted invalidation
queryKey: ['users']                           // All users
queryKey: ['users', { page: 1 }]              // Users page 1
queryKey: ['users', { page: 1, sort: 'name' }] // Users page 1, sorted by name
queryKey: ['user', userId]                     // Single user
queryKey: ['user', userId, 'posts']            // User's posts
```

## SSR and Streaming

### Automatic Dehydration/Hydration

```typescript
// src/entry-server.tsx
import { dehydrate } from '@tanstack/react-query'

export async function render(url: string) {
  // Router automatically dehydrates query data during SSR
  const html = await renderToString(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )

  // Dehydrated state is automatically streamed to client
  return html
}
```

### Using useSuspenseQuery for SSR

```typescript
// Prefer useSuspenseQuery for SSR + streaming
function UserProfile({ userId }) {
  // Integrates with Router's Suspense boundaries
  // Data is never undefined
  const { data: user } = useSuspenseQuery(userQueryOptions(userId))

  return <div>{user.name}</div>
}
```

## Navigation and Cache Invalidation

### Invalidate on Mutation Success

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

function CreateUserForm() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: (newUser) => {
      // Invalidate users list
      queryClient.invalidateQueries({ queryKey: ['users'] })

      // Navigate to new user page
      navigate({ to: '/user/$userId', params: { userId: newUser.id } })
    },
  })
}
```

### Preserve Scroll Position

```typescript
// Router preserves scroll position automatically
// Query cache preserves data on back navigation

export const Route = createFileRoute('/users')({
  loader: ({ context: { queryClient }, deps }) =>
    queryClient.ensureQueryData(usersQueryOptions(deps)),

  // Data remains in cache when navigating away
  // Instant back navigation without refetch (if within staleTime)
})
```

## Common Patterns

### Pattern: Search Params as Single Source of Truth

```typescript
export const Route = createFileRoute('/users')({
  validateSearch: (search): UserFilters => ({
    page: Math.max(1, Number(search.page) || 1),
    pageSize: [10, 25, 50, 100].includes(Number(search.pageSize))
      ? Number(search.pageSize)
      : 25,
    sort: ['name', 'email', 'created'].includes(search.sort as string)
      ? (search.sort as string)
      : 'name',
    order: search.order === 'desc' ? 'desc' : 'asc',
  }),

  loaderDeps: ({ search }) => search,

  loader: ({ context: { queryClient }, deps }) =>
    queryClient.ensureQueryData(usersQueryOptions(deps)),
})

// Component reads from Router, not local state
function UsersPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const updateFilters = (updates: Partial<UserFilters>) => {
    navigate({ search: { ...search, ...updates } })
  }

  // Query automatically refetches when search changes
  const { data } = useSuspenseQuery(usersQueryOptions(search))
}
```

## Related

- [Query + Table Integration](query-table-integration.md)
- [Server-Side Patterns](server-side-patterns.md)
- [TypeScript Patterns](typescript-patterns.md)
