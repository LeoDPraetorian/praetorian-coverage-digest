# Required Patterns - Complete Examples

**Comprehensive examples of required React 19 patterns.**

## Function Declarations for Components

### Basic Components

```typescript
// ✅ REQUIRED - Plain function with inline types
function UserCard({ name, email }: { name: string; email: string }) {
  return (
    <div>
      <h3>{name}</h3>
      <p>{email}</p>
    </div>
  )
}

// ✅ REQUIRED - Plain function with separate type
type UserCardProps = {
  name: string
  email: string
}

function UserCard({ name, email }: UserCardProps) {
  return (
    <div>
      <h3>{name}</h3>
      <p>{email}</p>
    </div>
  )
}
```

### Generic Components

```typescript
// ✅ REQUIRED - Generic function component
function List<T>({ items, renderItem }: {
  items: T[]
  renderItem: (item: T) => ReactNode
}) {
  return (
    <ul>
      {items.map((item, i) => (
        <li key={i}>{renderItem(item)}</li>
      ))}
    </ul>
  )
}

// Usage with type inference
<List
  items={users}
  renderItem={(user) => <span>{user.name}</span>}
/>
```

### Components with Children

```typescript
// ✅ REQUIRED - Explicit children prop
function Card({ title, children }: {
  title: string
  children: ReactNode
}) {
  return (
    <div>
      <h2>{title}</h2>
      <div>{children}</div>
    </div>
  )
}

// Type-safe - TypeScript enforces children
<Card title="Profile">
  <UserProfile />
</Card>
```

### Components with Refs (React 19)

```typescript
// ✅ REQUIRED - ref as regular prop
function Input({
  value,
  onChange,
  ref
}: {
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  ref?: RefObject<HTMLInputElement>
}) {
  return (
    <input
      ref={ref}
      value={value}
      onChange={onChange}
    />
  )
}

// Usage
const inputRef = useRef<HTMLInputElement>(null)
<Input ref={inputRef} value={text} onChange={handleChange} />
```

---

## TanStack Query for All API Calls

### Basic Data Fetching

```typescript
// ✅ REQUIRED - Query for GET requests
function UserList() {
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch('/api/users')
      if (!response.ok) throw new Error('Failed to fetch')
      return response.json()
    }
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  )
}
```

### Dependent Queries

```typescript
// ✅ REQUIRED - Query depends on another query's result
function UserPosts({ userId }: { userId: string }) {
  // First query: fetch user
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId)
  })

  // Second query: fetch posts (enabled only when user exists)
  const { data: posts, isLoading } = useQuery({
    queryKey: ['posts', user?.id],
    queryFn: () => fetchUserPosts(user!.id),
    enabled: !!user  // Only run when user is available
  })

  if (isLoading) return <div>Loading posts...</div>

  return (
    <div>
      <h2>{user?.name}'s Posts</h2>
      {posts?.map(post => <PostCard key={post.id} post={post} />)}
    </div>
  )
}
```

### Mutations (POST/PUT/DELETE)

```typescript
// ✅ REQUIRED - Mutation for data modifications
function CreateUser() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (newUser: NewUser) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      })
      if (!response.ok) throw new Error('Failed to create user')
      return response.json()
    },
    onSuccess: () => {
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    mutation.mutate({
      name: formData.get('name') as string,
      email: formData.get('email') as string
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Name" />
      <input name="email" placeholder="Email" />
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating...' : 'Create User'}
      </button>
      {mutation.error && <div>Error: {mutation.error.message}</div>}
    </form>
  )
}
```

### Optimistic Updates

```typescript
// ✅ REQUIRED - Optimistic UI updates
function TodoList() {
  const queryClient = useQueryClient()

  const toggleMutation = useMutation({
    mutationFn: async (todoId: string) => {
      await fetch(`/api/todos/${todoId}/toggle`, { method: 'POST' })
    },
    onMutate: async (todoId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['todos'] })

      // Snapshot previous value
      const previousTodos = queryClient.getQueryData<Todo[]>(['todos'])

      // Optimistically update
      queryClient.setQueryData<Todo[]>(['todos'], (old) =>
        old?.map(todo =>
          todo.id === todoId
            ? { ...todo, completed: !todo.completed }
            : todo
        )
      )

      return { previousTodos }
    },
    onError: (err, todoId, context) => {
      // Rollback on error
      queryClient.setQueryData(['todos'], context?.previousTodos)
    },
    onSettled: () => {
      // Refetch after success or error
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    }
  })

  const { data: todos } = useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos
  })

  return (
    <ul>
      {todos?.map(todo => (
        <li
          key={todo.id}
          onClick={() => toggleMutation.mutate(todo.id)}
          style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}
        >
          {todo.title}
        </li>
      ))}
    </ul>
  )
}
```

### Pagination

```typescript
// ✅ REQUIRED - Paginated queries
function PaginatedUsers() {
  const [page, setPage] = useState(1)

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['users', page],
    queryFn: () => fetchUsers(page),
    placeholderData: (previousData) => previousData  // Keep previous data while loading
  })

  return (
    <div>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <ul>
          {data.users.map(user => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      )}
      <button
        onClick={() => setPage(p => Math.max(1, p - 1))}
        disabled={page === 1}
      >
        Previous
      </button>
      <span>Page {page}</span>
      <button
        onClick={() => setPage(p => p + 1)}
        disabled={isPlaceholderData || !data.hasMore}
      >
        Next
      </button>
    </div>
  )
}
```

---

## Zustand Selectors for All Store Access

### Basic Selectors

```typescript
// ✅ REQUIRED - Always use selectors
import { useStore } from './store'

function Counter() {
  // Select only what you need
  const count = useStore((state) => state.count)
  const increment = useStore((state) => state.increment)

  return (
    <div>
      <p>{count}</p>
      <button onClick={increment}>Increment</button>
    </div>
  )
}
```

### Multiple Selectors

```typescript
// ✅ REQUIRED - Multiple independent selectors
function UserProfile() {
  const user = useStore((state) => state.user)
  const theme = useStore((state) => state.theme)
  const settings = useStore((state) => state.settings)

  return (
    <div className={theme}>
      <h2>{user.name}</h2>
      <p>Notifications: {settings.notifications ? 'On' : 'Off'}</p>
    </div>
  )
}
```

### Computed Selectors

```typescript
// ✅ REQUIRED - Derive computed values with selectors
function ShoppingCart() {
  // Select and compute in one selector
  const totalPrice = useStore((state) =>
    state.cart.items.reduce((sum, item) => sum + item.price, 0)
  )

  const itemCount = useStore((state) => state.cart.items.length)

  return (
    <div>
      <p>Items: {itemCount}</p>
      <p>Total: ${totalPrice.toFixed(2)}</p>
    </div>
  )
}
```

### Shallow Equality for Objects

```typescript
import { shallow } from 'zustand/shallow'

// ✅ REQUIRED - Use shallow equality for object selectors
function Filters() {
  const { minPrice, maxPrice, category } = useStore(
    (state) => ({
      minPrice: state.filters.minPrice,
      maxPrice: state.filters.maxPrice,
      category: state.filters.category
    }),
    shallow  // Prevents re-render if values haven't changed
  )

  return (
    <div>
      <input value={minPrice} onChange={(e) => updateMinPrice(e.target.value)} />
      <input value={maxPrice} onChange={(e) => updateMaxPrice(e.target.value)} />
      <select value={category} onChange={(e) => updateCategory(e.target.value)}>
        {/* options */}
      </select>
    </div>
  )
}
```

### Selector Performance Patterns

```typescript
// ❌ WRONG - Accessing entire store
function BadComponent() {
  const store = useStore()  // Re-renders on ANY state change
  return <div>{store.user.name}</div>
}

// ✅ RIGHT - Specific selector
function GoodComponent() {
  const userName = useStore((state) => state.user.name)  // Only re-renders when name changes
  return <div>{userName}</div>
}

// ❌ WRONG - Creating new object every render
function BadComponent() {
  const data = useStore((state) => ({
    name: state.user.name,
    email: state.user.email
  }))  // New object every time - always triggers re-render
  return <div>{data.name}</div>
}

// ✅ RIGHT - Shallow comparison
function GoodComponent() {
  const data = useStore(
    (state) => ({
      name: state.user.name,
      email: state.user.email
    }),
    shallow  // Only re-renders if values change
  )
  return <div>{data.name}</div>
}
```

---

## Key Prop for State Reset

### Form Reset on Route Change

```typescript
// ✅ REQUIRED - Reset form when route parameter changes
function EditUser() {
  const { userId } = useParams()

  // UserEditForm has internal state (form fields)
  return <UserEditForm key={userId} userId={userId} />
}

function UserEditForm({ userId }: { userId: string }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    // Fetch user data
    fetchUser(userId).then(user => {
      setName(user.name)
      setEmail(user.email)
    })
  }, [userId])

  return (
    <form>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
    </form>
  )
}
```

### Modal/Dialog Reset

```typescript
// ✅ REQUIRED - Reset modal state when it closes/opens
function UserModal({ isOpen, userId }: { isOpen: boolean; userId: string }) {
  if (!isOpen) return null

  // key={userId} resets all internal state when userId changes
  return (
    <Modal>
      <UserForm key={userId} userId={userId} />
    </Modal>
  )
}

function UserForm({ userId }: { userId: string }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: ''
  })

  // Component fully resets when key changes
  return <form>{/* form fields */}</form>
}
```

### Tab Content Reset

```typescript
// ✅ REQUIRED - Reset tab content when switching tabs
function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'settings'>('overview')

  return (
    <div>
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tab value="overview">Overview</Tab>
        <Tab value="analytics">Analytics</Tab>
        <Tab value="settings">Settings</Tab>
      </Tabs>

      {/* key prop resets component when tab changes */}
      <TabContent key={activeTab}>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </TabContent>
    </div>
  )
}
```

### List Item Reset

```typescript
// ✅ REQUIRED - Reset individual items in list
function UserList({ users }: { users: User[] }) {
  return (
    <div>
      {users.map(user => (
        // key={user.id} ensures component resets if user object changes
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  )
}

function UserCard({ user }: { user: User }) {
  const [isExpanded, setIsExpanded] = useState(false)

  // State resets automatically when user changes (via key prop in parent)
  return (
    <div>
      <h3 onClick={() => setIsExpanded(!isExpanded)}>{user.name}</h3>
      {isExpanded && <div>{user.bio}</div>}
    </div>
  )
}
```

---

## Complete Component Example

**Putting it all together:**

```typescript
// ✅ ALL REQUIRED PATTERNS DEMONSTRATED
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStore } from './store'
import { useParams } from 'react-router-dom'
import { useRef } from 'react'

type UserProfileProps = {
  userId: string
  ref?: RefObject<HTMLDivElement>
}

// 1. Function declaration (not React.FC)
// 2. Ref as regular prop (not forwardRef)
function UserProfile({ userId, ref }: UserProfileProps) {
  const queryClient = useQueryClient()

  // 3. TanStack Query for data fetching
  const { data: user, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId)
  })

  // 4. Zustand with selectors
  const currentTheme = useStore((state) => state.theme)
  const updateUser = useStore((state) => state.updateUser)

  // 5. Mutation for updates
  const mutation = useMutation({
    mutationFn: (updates: Partial<User>) => updateUserAPI(userId, updates),
    onSuccess: (updated) => {
      queryClient.setQueryData(['user', userId], updated)
      updateUser(updated)
    }
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <div ref={ref} className={currentTheme}>
      <h2>{user?.name}</h2>
      <p>{user?.email}</p>
      <button onClick={() => mutation.mutate({ name: 'New Name' })}>
        Update Name
      </button>
    </div>
  )
}

// 6. Parent component uses key prop for reset
function UserProfilePage() {
  const { userId } = useParams()
  const profileRef = useRef<HTMLDivElement>(null)

  // key={userId} resets UserProfile when userId changes
  return <UserProfile key={userId!} userId={userId!} ref={profileRef} />
}
```

---

## Verification Checklist for Reviewers

When reviewing React code, verify:

- [ ] All components use function declarations (not `const` with arrow function)
- [ ] No `React.FC` or `React.FunctionComponent` types
- [ ] No `forwardRef` usage (ref is regular prop)
- [ ] All data fetching uses TanStack Query (no `useEffect` + `fetch`)
- [ ] All Zustand calls use selectors (no `const store = useStore()`)
- [ ] Key prop used when component state depends on prop
- [ ] Mutations properly invalidate query cache
- [ ] Loading and error states handled for all queries
- [ ] Optimistic updates for better UX (where appropriate)

---

## Common Migration Paths

### From React.FC to Function Declaration

```typescript
// Before
const Component: React.FC<Props> = ({ prop }) => {
  return <div>{prop}</div>
}

// After
function Component({ prop }: Props) {
  return <div>{prop}</div>
}
```

### From forwardRef to Ref Prop

```typescript
// Before
const Component = forwardRef<HTMLDivElement, Props>(
  ({ prop }, ref) => {
    return <div ref={ref}>{prop}</div>
  }
)

// After
function Component({ prop, ref }: Props & { ref?: RefObject<HTMLDivElement> }) {
  return <div ref={ref}>{prop}</div>
}
```

### From useEffect Fetch to TanStack Query

```typescript
// Before
const [data, setData] = useState(null)
const [loading, setLoading] = useState(true)
useEffect(() => {
  fetch('/api/data').then(res => res.json()).then(setData).finally(() => setLoading(false))
}, [])

// After
const { data, isLoading } = useQuery({
  queryKey: ['data'],
  queryFn: () => fetch('/api/data').then(res => res.json())
})
```

### From Entire Store to Selectors

```typescript
// Before
const store = useStore()
return <div>{store.user.name}</div>

// After
const userName = useStore((state) => state.user.name)
return <div>{userName}</div>
```

---

## Resources

- [React 19 Documentation](https://react.dev)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [TypeScript React Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
