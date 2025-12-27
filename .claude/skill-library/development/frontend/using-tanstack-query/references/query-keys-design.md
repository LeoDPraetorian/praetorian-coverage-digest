# Query Key Design Patterns

**Advanced patterns for structuring, organizing, and managing TanStack Query keys.**

---

## Table of Contents

1. [Core Principles](#1-core-principles)
2. [The queryOptions Pattern (v5 Recommended)](#2-the-queryoptions-pattern-v5-recommended)
3. [Query Key Factory Pattern](#3-query-key-factory-pattern)
4. [Hierarchical Key Structure](#4-hierarchical-key-structure)
5. [Object Keys vs Array Keys](#5-object-keys-vs-array-keys)
6. [Invalidation Strategies](#6-invalidation-strategies)
7. [TypeScript Patterns](#7-typescript-patterns)
8. [Feature-Based Organization](#8-feature-based-organization)
9. [Anti-Patterns](#9-anti-patterns)

---

## 1. Core Principles

Query keys serve three critical functions:

1. **Caching**: Unique identifiers for cached data (hashed deterministically)
2. **Automatic Refetching**: When keys change, queries refetch (declarative)
3. **Manual Cache Interaction**: Targeted updates via `invalidateQueries` and `setQueryData`

### Fundamental Rules

```typescript
// Rule 1: Keys MUST be arrays at the top level
['todos']                           // ✅ Correct
'todos'                             // ❌ Wrong (converted internally, avoid)

// Rule 2: Keys must be serializable (JSON.stringify)
['todos', { status: 'active' }]     // ✅ Object is serializable
['todos', new Date()]               // ❌ Date creates new reference each render
['todos', classInstance]            // ❌ Class instances may have circular refs

// Rule 3: Keys are dependency arrays
// Everything used in queryFn MUST be in queryKey
useQuery({
  queryKey: ['todos', status, sorting],  // ✅ All deps included
  queryFn: () => fetchTodos(status, sorting),
})
```

### Deterministic Hashing

Object key order **doesn't matter** for cache identity:

```typescript
['todos', { status, page }]  // Same cache entry as:
['todos', { page, status }]  // Same cache entry as:
['todos', { page, status, other: undefined }]  // undefined values ignored
```

Array order **matters strictly**:

```typescript
['todos', status, page]  // Different from:
['todos', page, status]  // Different cache entry
```

---

## 2. The queryOptions Pattern (v5 Recommended)

**The recommended approach in v5** - co-locates keys with query functions for type safety and reusability.

### Why queryOptions?

TkDodo (maintainer): "Separating QueryKey from QueryFunction was a mistake. The queryKey defines the dependencies to the queryFn - everything used inside it must go into the key."

### Basic Usage

```typescript
import { queryOptions, useQuery, useSuspenseQuery } from '@tanstack/react-query'

// Define once
const todosQuery = queryOptions({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  staleTime: 5000,
})

// Use everywhere - type-safe and consistent
useQuery(todosQuery)
useSuspenseQuery(todosQuery)
queryClient.prefetchQuery(todosQuery)
queryClient.ensureQueryData(todosQuery)
```

### Type-Safe Cache Access (DataTag)

`queryOptions` tags keys with return type information:

```typescript
const todosQuery = queryOptions({
  queryKey: ['todos'],
  queryFn: fetchTodos,  // Returns Todo[]
})

// Type automatically inferred as: Todo[] | undefined
const todos = queryClient.getQueryData(todosQuery.queryKey)

// Without queryOptions, this would be: unknown
```

### Query Factory with queryOptions

Combine factory pattern with `queryOptions` for full type safety:

```typescript
// features/todos/queries.ts
import { queryOptions } from '@tanstack/react-query'

export const todoQueries = {
  // Key-only entries for hierarchy/invalidation
  all: () => ['todos'] as const,
  lists: () => [...todoQueries.all(), 'list'] as const,
  details: () => [...todoQueries.all(), 'detail'] as const,

  // Full query definitions with queryOptions
  list: (filters: TodoFilters) => queryOptions({
    queryKey: [...todoQueries.lists(), filters],
    queryFn: () => fetchTodos(filters),
    staleTime: 1000 * 60 * 5,
  }),

  detail: (id: number) => queryOptions({
    queryKey: [...todoQueries.details(), id],
    queryFn: () => fetchTodo(id),
    staleTime: 1000 * 60 * 10,
  }),
}

// Usage
useQuery(todoQueries.list({ status: 'active' }))
useQuery(todoQueries.detail(5))

// Invalidation using key-only entries
queryClient.invalidateQueries({ queryKey: todoQueries.all() })
queryClient.invalidateQueries({ queryKey: todoQueries.lists() })
```

---

## 3. Query Key Factory Pattern

For simpler cases or when you need standalone key definitions:

### Basic Factory

```typescript
export const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (filters: string) => [...todoKeys.lists(), { filters }] as const,
  details: () => [...todoKeys.all, 'detail'] as const,
  detail: (id: number) => [...todoKeys.details(), id] as const,
}
```

### Usage Patterns

```typescript
// Queries
useQuery({
  queryKey: todoKeys.list({ status: 'active' }),
  queryFn: () => fetchTodos({ status: 'active' }),
})

// Invalidation - hierarchical
queryClient.invalidateQueries({ queryKey: todoKeys.all })        // Everything
queryClient.invalidateQueries({ queryKey: todoKeys.lists() })    // All lists
queryClient.invalidateQueries({ queryKey: todoKeys.details() })  // All details

// Prefetching
queryClient.prefetchQuery({
  queryKey: todoKeys.detail(id),
  queryFn: () => fetchTodo(id),
})

// Direct cache updates
queryClient.setQueryData(todoKeys.detail(id), updatedTodo)
```

### @lukemorales/query-key-factory Library

For larger applications, this library provides additional structure:

```typescript
import { createQueryKeys, mergeQueryKeys } from '@lukemorales/query-key-factory'

export const todos = createQueryKeys('todos', {
  all: null,
  detail: (id: number) => ({
    queryKey: [id],
    queryFn: () => fetchTodo(id),
  }),
  list: (filters: Filters) => ({
    queryKey: [{ filters }],
    queryFn: () => fetchTodos(filters),
  }),
})

// Merge multiple feature factories
export const queries = mergeQueryKeys(todos, users, posts)

// Invalidate all lists (uses _def for scope)
queryClient.invalidateQueries({ queryKey: todos.list._def })
```

---

## 4. Hierarchical Key Structure

**Principle**: Structure keys from most generic to most specific.

### Example Hierarchy

```typescript
['todos']                                    // Level 0: All todos
['todos', 'list']                           // Level 1: All lists
['todos', 'list', { status: 'active' }]     // Level 2: Specific list
['todos', 'detail']                         // Level 1: All details
['todos', 'detail', 5]                      // Level 2: Specific detail
['todos', 'detail', 5, 'comments']          // Level 3: Nested resource
```

### Invalidation by Level

```typescript
// Invalidate everything related to todos
queryClient.invalidateQueries({ queryKey: ['todos'] })

// Invalidate all list queries (preserves details cache)
queryClient.invalidateQueries({ queryKey: ['todos', 'list'] })

// Invalidate only active todos list
queryClient.invalidateQueries({
  queryKey: ['todos', 'list', { status: 'active' }]
})

// Invalidate specific detail and its nested resources
queryClient.invalidateQueries({ queryKey: ['todos', 'detail', 5] })
```

---

## 5. Object Keys vs Array Keys

### When to Use Objects in Keys

Objects in query keys provide named access and flexible matching:

```typescript
const todoKeys = {
  all: [{ scope: 'todos' }] as const,
  list: (state: State, sorting: Sorting) =>
    [{ scope: 'todos', entity: 'list', state, sorting }] as const,
  detail: (id: number) =>
    [{ scope: 'todos', entity: 'detail', id }] as const,
}
```

### Advantages of Object Keys

**Named destructuring** (prevents index errors):

```typescript
// ✅ Object key - named access
const fetchTodos = async ({
  queryKey: [{ state, sorting }],
}: QueryFunctionContext<ReturnType<typeof todoKeys['list']>>) => {
  return api.getTodos({ state, sorting })
}

// ❌ Array key - fragile index access
const fetchTodos = async ({ queryKey }) => {
  const [, state, sorting] = queryKey  // Easy to miscount
}
```

**Cross-scope invalidation**:

```typescript
// Invalidate ALL list entities across all scopes
queryClient.invalidateQueries({
  queryKey: [{ entity: 'list' }]
})
```

### Trade-offs

| Aspect | Array Keys | Object Keys |
|--------|-----------|-------------|
| Simplicity | ✅ Simpler to write | ❌ More verbose |
| Matching | Prefix-based | Named property-based |
| Type Safety | Index-based (fragile) | Named (robust) |
| Best For | Small apps, simple keys | Large apps, complex keys |

---

## 6. Invalidation Strategies

### Prefix Matching (Default)

```typescript
// Invalidates all queries starting with ['todos']
queryClient.invalidateQueries({ queryKey: ['todos'] })
```

### Exact Matching

```typescript
// Only invalidates exact key match
queryClient.invalidateQueries({
  queryKey: ['todos', 'detail', 5],
  exact: true
})
```

### Predicate Functions

```typescript
// Custom matching logic
queryClient.invalidateQueries({
  predicate: (query) =>
    query.queryKey[0] === 'todos' &&
    (query.state.data as Todo[])?.length > 10
})
```

### Mutation Integration

```typescript
const mutation = useMutation({
  mutationFn: createTodo,
  onSuccess: () => {
    // Invalidate lists, keep details cache
    queryClient.invalidateQueries({ queryKey: todoQueries.lists() })
  },
})
```

### Global Automatic Invalidation

```typescript
import { MutationCache, QueryClient, matchQuery } from '@tanstack/react-query'

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: (_data, _variables, _context, mutation) => {
      // Use mutation meta to specify what to invalidate
      const invalidates = mutation.meta?.invalidates as string[][] | undefined

      if (invalidates) {
        invalidates.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey })
        })
      }
    },
  }),
})

// Usage with meta
useMutation({
  mutationFn: createTodo,
  meta: {
    invalidates: [todoQueries.lists()],
  },
})
```

---

## 7. TypeScript Patterns

### Type-Safe Factory with as const

```typescript
export const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (filters: TodoFilters) =>
    [...todoKeys.lists(), filters] as const,
} as const

// Inferred type: readonly ["todos", "list", TodoFilters]
type TodoListKey = ReturnType<typeof todoKeys.list>
```

### Inferring Types from Factory

```typescript
import { inferQueryKeyStore } from '@lukemorales/query-key-factory'

const todoQueries = createQueryKeys('todos', { ... })

// Infer all query key types
type TodoQueryKeys = inferQueryKeyStore<typeof todoQueries>
```

### QueryFunctionContext Typing

```typescript
import { QueryFunctionContext } from '@tanstack/react-query'

type TodoListKey = ReturnType<typeof todoKeys.list>

const fetchTodos = async ({
  queryKey,
  signal,
}: QueryFunctionContext<TodoListKey>) => {
  const [, , filters] = queryKey  // Type: TodoFilters
  return api.getTodos(filters, { signal })
}
```

---

## 8. Feature-Based Organization

**Recommended**: Co-locate queries with features, not in a global location.

### Directory Structure

```
src/features/
├── todos/
│   ├── queries.ts      # todoQueries factory + queryOptions
│   ├── hooks.ts        # useTodos, useCreateTodo (exports only)
│   ├── api.ts          # fetchTodos, createTodo
│   └── components/
│       └── TodoList.tsx
└── users/
    ├── queries.ts
    ├── hooks.ts
    ├── api.ts
    └── components/
```

### queries.ts Pattern

```typescript
// features/todos/queries.ts
import { queryOptions } from '@tanstack/react-query'
import { fetchTodos, fetchTodo } from './api'
import type { TodoFilters } from './types'

export const todoQueries = {
  all: () => ['todos'] as const,
  lists: () => [...todoQueries.all(), 'list'] as const,
  list: (filters: TodoFilters) => queryOptions({
    queryKey: [...todoQueries.lists(), filters],
    queryFn: () => fetchTodos(filters),
  }),
  details: () => [...todoQueries.all(), 'detail'] as const,
  detail: (id: number) => queryOptions({
    queryKey: [...todoQueries.details(), id],
    queryFn: () => fetchTodo(id),
  }),
}
```

### hooks.ts Pattern

```typescript
// features/todos/hooks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { todoQueries } from './queries'
import { createTodo, updateTodo } from './api'

export function useTodos(filters: TodoFilters) {
  return useQuery(todoQueries.list(filters))
}

export function useTodo(id: number) {
  return useQuery(todoQueries.detail(id))
}

export function useCreateTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: todoQueries.lists() })
    },
  })
}
```

---

## 9. Anti-Patterns

### Unstable Keys

```typescript
// ❌ WRONG: Creates new reference every render
useQuery({
  queryKey: ['todos', { filters: { status, page } }],
  queryFn: fetchTodos,
})

// ❌ WRONG: Date changes constantly
useQuery({
  queryKey: ['todos', new Date()],
  queryFn: fetchTodos,
})

// ✅ CORRECT: Stable primitives
useQuery({
  queryKey: ['todos', status, page],
  queryFn: () => fetchTodos({ status, page }),
})
```

### Separated Key/Function Definitions

```typescript
// ❌ WRONG: Key and function can drift out of sync
const todoKeys = { list: ['todos', 'list'] }

// Elsewhere...
useQuery({
  queryKey: todoKeys.list,
  queryFn: () => fetchTodos(filters),  // filters not in key!
})

// ✅ CORRECT: Use queryOptions to co-locate
const todoQueries = {
  list: (filters) => queryOptions({
    queryKey: ['todos', 'list', filters],
    queryFn: () => fetchTodos(filters),
  }),
}
```

### Overly Flat Keys

```typescript
// ❌ WRONG: No hierarchy, can't do targeted invalidation
['todos-list-active']
['todos-list-done']
['todos-detail-5']

// ✅ CORRECT: Hierarchical structure
['todos', 'list', 'active']
['todos', 'list', 'done']
['todos', 'detail', 5]
```

### Global Key Files

```typescript
// ❌ WRONG: Central keys.ts file far from usage
// src/constants/queryKeys.ts
export const QUERY_KEYS = {
  TODOS: 'todos',
  USERS: 'users',
}

// ✅ CORRECT: Co-located with feature
// src/features/todos/queries.ts
export const todoQueries = { ... }
```

---

## Related Documentation

- [Best Practices](query-best-practices.md) - Production patterns including key stability
- [Anti-Patterns](query-anti-patterns.md) - Common mistakes to avoid
- [TypeScript Patterns](query-typescript-patterns.md) - Type inference and generics
- [Performance Optimization](query-performance-optimization.md) - Render optimization with select
- [Hook Examples](query-hook-examples.md) - Complete useQuery/useMutation examples

---

## Official Documentation

- [Query Keys | TanStack Query Docs](https://tanstack.com/query/v5/docs/framework/react/guides/query-keys)
- [Query Invalidation | TanStack Query Docs](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation)
- [Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys) - TkDodo (maintainer)
- [The Query Options API](https://tkdodo.eu/blog/the-query-options-api) - TkDodo
- [Leveraging the Query Function Context](https://tkdodo.eu/blog/leveraging-the-query-function-context) - TkDodo
- [@lukemorales/query-key-factory](https://github.com/lukemorales/query-key-factory) - Community library

---

**Last Updated:** 2025-12-25
