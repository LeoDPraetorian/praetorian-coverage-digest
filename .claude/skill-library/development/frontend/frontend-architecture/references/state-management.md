# State Management

This document covers state management patterns in React 19 applications using TanStack Query v5 for server state and Zustand 4.x for client state.

## Table of Contents

- [State Management Strategy](#state-management-strategy)
- [TanStack Query v5 (Server State)](#tanstack-query-v5-server-state)
- [Zustand 4.x (Client State)](#zustand-4x-client-state)
- [useState (Local Component State)](#usestate-local-component-state)
- [URL State (React Router)](#url-state-react-router)
- [When to Use Which](#when-to-use-which)

## State Management Strategy

**Choose the right tool for the job:**

| State Type | Tool | Example | Why |
|------------|------|---------|-----|
| **Server state** | TanStack Query | User data, API responses | Handles caching, revalidation, optimistic updates |
| **Global client state** | Zustand | Theme, auth status, UI preferences | Simple, performant, minimal boilerplate |
| **Local component state** | useState | Form inputs, modal visibility | Built-in, no external deps needed |
| **URL state** | React Router | Filters, pagination, tabs | Shareable URLs, browser back/forward support |

## TanStack Query v5 (Server State)

TanStack Query is the standard for managing server state in React applications.

### Basic Query

```typescript
import { useQuery } from '@tanstack/react-query';

function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    gcTime: 5 * 60 * 1000, // 5 minutes (replaces cacheTime in v5)
    staleTime: 30 * 1000,  // 30 seconds
  });

  if (isLoading) return <Skeleton />;
  if (error) return <Error error={error} />;
  if (!user) return <NotFound />;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

### Cache Configuration

**Important v5 API change**: `cacheTime` → `gcTime` (garbage collection time)

```typescript
const { data } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  gcTime: 5 * 60 * 1000,    // Keep in cache for 5 minutes after last use
  staleTime: 30 * 1000,      // Consider fresh for 30 seconds
  refetchOnWindowFocus: true, // Refetch when window regains focus
  refetchOnReconnect: true,   // Refetch when reconnecting
});
```

**Cache time recommendations:**

| Data Type | staleTime | gcTime | Rationale |
|-----------|-----------|--------|-----------|
| User profile | 30s | 5min | Rarely changes, 30s acceptable |
| Real-time data | 0s | 1min | Needs freshness |
| Static config | 5min | 30min | Rarely changes |
| Search results | 1min | 5min | Balance freshness and performance |

### Mutations

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

function UserProfile({ userId }: { userId: string }) {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data: Partial<User>) => updateUser(userId, data),
    onSuccess: (updatedUser) => {
      // Option 1: Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['user', userId] });

      // Option 2: Update cache directly (faster)
      queryClient.setQueryData(['user', userId], updatedUser);

      toast.success('Profile updated');
    },
    onError: (error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      updateMutation.mutate({ name: 'New Name' });
    }}>
      {/* form fields */}
    </form>
  );
}
```

### Optimistic Updates

```typescript
function TodoList() {
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: (todoId: string) => toggleTodo(todoId),

    // Optimistic update
    onMutate: async (todoId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      // Snapshot previous value
      const previousTodos = queryClient.getQueryData(['todos']);

      // Optimistically update
      queryClient.setQueryData(['todos'], (old: Todo[]) =>
        old.map(todo =>
          todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
        )
      );

      // Return context with previous value
      return { previousTodos };
    },

    // Rollback on error
    onError: (err, todoId, context) => {
      queryClient.setQueryData(['todos'], context.previousTodos);
      toast.error('Update failed');
    },

    // Refetch after success or error
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => toggleMutation.mutate(todo.id)}
          />
          {todo.title}
        </li>
      ))}
    </ul>
  );
}
```

### Query Invalidation Patterns

```typescript
const queryClient = useQueryClient();

// Invalidate exact query
queryClient.invalidateQueries({ queryKey: ['user', '123'] });

// Invalidate all user queries
queryClient.invalidateQueries({ queryKey: ['user'] });

// Invalidate with predicate
queryClient.invalidateQueries({
  predicate: (query) =>
    query.queryKey[0] === 'user' && query.state.data?.status === 'inactive'
});

// Refetch immediately
queryClient.refetchQueries({ queryKey: ['users'] });

// Remove from cache
queryClient.removeQueries({ queryKey: ['user', '123'] });
```

### Dependent Queries

```typescript
function UserPosts({ userId }: { userId: string }) {
  // First query: Get user
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  // Second query: Get user's posts (depends on user data)
  const { data: posts } = useQuery({
    queryKey: ['posts', user?.id],
    queryFn: () => fetchPosts(user!.id),
    enabled: !!user, // Only run if user exists
  });

  return (
    <div>
      <h1>{user?.name}</h1>
      <PostList posts={posts} />
    </div>
  );
}
```

### Infinite Queries (Pagination)

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

function InfiniteUserList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['users', 'infinite'],
    queryFn: ({ pageParam = 0 }) => fetchUsers(pageParam),
    getNextPageParam: (lastPage, pages) => lastPage.nextCursor,
    initialPageParam: 0,
  });

  return (
    <div>
      {data?.pages.map((page) => (
        <div key={page.cursor}>
          {page.users.map((user) => (
            <UserCard key={user.id} user={user} />
          ))}
        </div>
      ))}

      <button
        onClick={() => fetchNextPage()}
        disabled={!hasNextPage || isFetchingNextPage}
      >
        {isFetchingNextPage ? 'Loading...' : 'Load More'}
      </button>
    </div>
  );
}
```

## Zustand 4.x (Client State)

Zustand is a lightweight state management library for global client state.

### Basic Store

**Important v4 API change**: Use named `create` import (not default)

```typescript
import { create } from 'zustand'; // Named import (v4+)

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));

// Usage
function Counter() {
  const { count, increment, decrement, reset } = useCounterStore();

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

### Slicing State (Performance Optimization)

```typescript
// ❌ Bad: Component re-renders on ANY state change
function Counter() {
  const store = useCounterStore();
  return <p>{store.count}</p>;
}

// ✅ Good: Component only re-renders when count changes
function Counter() {
  const count = useCounterStore((state) => state.count);
  return <p>{count}</p>;
}
```

### Async Actions

```typescript
interface UserStore {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  fetchUser: (id: string) => Promise<void>;
  logout: () => void;
}

const useUserStore = create<UserStore>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  fetchUser: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await fetchUser(id);
      set({ user, isLoading: false });
    } catch (error) {
      set({ error: error as Error, isLoading: false });
    }
  },

  logout: () => set({ user: null }),
}));
```

### Persist Middleware

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  theme: 'light' | 'dark';
  language: string;
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (language: string) => void;
}

const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'light',
      language: 'en',
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'settings-storage', // localStorage key
    }
  )
);
```

### Immer Middleware (Immutable Updates)

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface TodoStore {
  todos: Todo[];
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
}

const useTodoStore = create<TodoStore>()(
  immer((set) => ({
    todos: [],

    addTodo: (text) =>
      set((state) => {
        state.todos.push({ id: Date.now().toString(), text, completed: false });
      }),

    toggleTodo: (id) =>
      set((state) => {
        const todo = state.todos.find((t) => t.id === id);
        if (todo) todo.completed = !todo.completed;
      }),

    deleteTodo: (id) =>
      set((state) => {
        state.todos = state.todos.filter((t) => t.id !== id);
      }),
  }))
);
```

### Combining Multiple Stores

```typescript
// Separate stores for different domains
const useAuthStore = create<AuthState>((set) => ({...}));
const useSettingsStore = create<SettingsState>((set) => ({...}));
const useUIStore = create<UIState>((set) => ({...}));

// Use in components
function App() {
  const user = useAuthStore((state) => state.user);
  const theme = useSettingsStore((state) => state.theme);
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);

  // ...
}
```

## useState (Local Component State)

Use `useState` for component-local state that doesn't need to be shared.

```typescript
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="button" onClick={() => setShowPassword(!showPassword)}>
        {showPassword ? 'Hide' : 'Show'}
      </button>
    </form>
  );
}
```

### Complex State with useReducer

```typescript
interface State {
  step: number;
  formData: FormData;
  errors: Record<string, string>;
}

type Action =
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'UPDATE_FIELD'; field: string; value: any }
  | { type: 'SET_ERRORS'; errors: Record<string, string> };

function formReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'NEXT_STEP':
      return { ...state, step: state.step + 1 };
    case 'PREV_STEP':
      return { ...state, step: state.step - 1 };
    case 'UPDATE_FIELD':
      return {
        ...state,
        formData: { ...state.formData, [action.field]: action.value },
      };
    case 'SET_ERRORS':
      return { ...state, errors: action.errors };
    default:
      return state;
  }
}

function MultiStepForm() {
  const [state, dispatch] = useReducer(formReducer, {
    step: 1,
    formData: {},
    errors: {},
  });

  // ...
}
```

## URL State (React Router)

Use URL state for shareable, bookmarkable state like filters and pagination.

```typescript
import { useSearchParams } from 'react-router-dom';

function UserList() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || 'all';

  const { data: users } = useQuery({
    queryKey: ['users', page, search, status],
    queryFn: () => fetchUsers({ page, search, status }),
  });

  return (
    <div>
      <input
        value={search}
        onChange={(e) =>
          setSearchParams({ page: '1', search: e.target.value, status })
        }
      />

      <select
        value={status}
        onChange={(e) =>
          setSearchParams({ page: '1', search, status: e.target.value })
        }
      >
        <option value="all">All</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>

      <UserTable users={users} />

      <Pagination
        page={page}
        onPageChange={(newPage) =>
          setSearchParams({ page: newPage.toString(), search, status })
        }
      />
    </div>
  );
}
```

## When to Use Which

### Decision Tree

```
Is the data from an API?
├─ Yes → Use TanStack Query
└─ No → Is it global state?
    ├─ Yes → Does it need persistence?
    │   ├─ Yes → Zustand with persist middleware
    │   └─ No → Zustand
    └─ No → Is it shareable via URL?
        ├─ Yes → URL state (useSearchParams)
        └─ No → useState/useReducer
```

### Common Patterns

| Use Case | Tool | Example |
|----------|------|---------|
| Fetching user data | TanStack Query | `useQuery({ queryKey: ['user', id] })` |
| Current theme | Zustand + persist | `useSettingsStore((s) => s.theme)` |
| Auth state | Zustand | `useAuthStore((s) => s.user)` |
| Form inputs | useState | `const [email, setEmail] = useState('')` |
| Filters/pagination | URL state | `const [params] = useSearchParams()` |
| Modal visibility | useState | `const [open, setOpen] = useState(false)` |
| Shopping cart | Zustand + persist | `useCartStore((s) => s.items)` |

### Anti-Patterns to Avoid

❌ **Don't fetch data in useEffect**
```typescript
// Wrong
useEffect(() => {
  fetch('/api/users').then(r => r.json()).then(setUsers);
}, []);

// Right
const { data: users } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
});
```

❌ **Don't use Zustand for server state**
```typescript
// Wrong
const useUserStore = create((set) => ({
  users: [],
  fetchUsers: async () => {
    const data = await fetchUsers();
    set({ users: data });
  },
}));

// Right
const { data: users } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
});
```

❌ **Don't put local state in global store**
```typescript
// Wrong
const useUIStore = create((set) => ({
  modalOpen: false,
  setModalOpen: (open) => set({ modalOpen: open }),
}));

// Right
function MyComponent() {
  const [modalOpen, setModalOpen] = useState(false);
  // ...
}
```

## Related References

- [React 19 Patterns](react-19-patterns.md) - Component design and hooks
- [Performance Optimization](performance.md) - Optimizing state updates
- [Design Patterns](design-patterns.md) - Flux and Observer patterns
