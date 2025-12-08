# React 19 Patterns

This document covers modern React 19 component patterns, hooks best practices, and React Compiler optimization strategies.

## Table of Contents

- [Component Design Principles](#component-design-principles)
- [Function Components (Not React.FC)](#function-components-not-reactfc)
- [Container vs Presentational Pattern](#container-vs-presentational-pattern)
- [Composition Patterns](#composition-patterns)
- [Custom Hooks](#custom-hooks)
- [Error Boundaries](#error-boundaries)
- [React Compiler Optimization](#react-compiler-optimization)

## Component Design Principles

### Single Responsibility Principle

Each component should have one clear purpose:

```typescript
// ❌ Bad: Component doing too much
function UserDashboard() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [settings, setSettings] = useState({});

  // Mixing concerns: data fetching, rendering, business logic
  useEffect(() => {
    fetch('/api/user').then(r => r.json()).then(setUser);
    fetch('/api/posts').then(r => r.json()).then(setPosts);
    fetch('/api/notifications').then(r => r.json()).then(setNotifications);
  }, []);

  return (
    <div>
      <header>{user?.name}</header>
      <PostList posts={posts} />
      <NotificationBell count={notifications.length} />
      <SettingsPanel settings={settings} />
    </div>
  );
}

// ✅ Good: Separated concerns with TanStack Query
function UserDashboard() {
  return (
    <DashboardLayout>
      <UserHeader />
      <UserPosts />
      <UserNotifications />
      <UserSettings />
    </DashboardLayout>
  );
}

function UserPosts() {
  // TanStack Query handles caching, refetching, error states
  const { data: posts, isLoading } = useQuery({
    queryKey: ['user', 'posts'],
    queryFn: fetchUserPosts,
  });

  if (isLoading) return <PostsLoading />;
  return <PostList posts={posts} />;
}
```

## Function Components (Not React.FC)

React 19 best practices: use plain function declarations, not React.FC.

```typescript
// ✅ Correct: Plain function declaration
function MyComponent({ title }: { title: string }) {
  return <h1>{title}</h1>;
}

// ✅ Also correct: Arrow function with explicit type
const MyComponent = ({ title }: { title: string }) => {
  return <h1>{title}</h1>;
};

// ❌ Wrong: Don't use React.FC (deprecated pattern)
const MyComponent: React.FC<{ title: string }> = ({ title }) => {
  return <h1>{title}</h1>;
};
```

**Why not React.FC?**
- Implicit `children` prop (type-unsafe)
- Doesn't work with generics
- React team recommends plain functions
- React Compiler optimizes better with plain functions

## Container vs Presentational Pattern

Separate data-fetching logic (containers) from UI rendering (presentational components).

### Presentational Component (Pure UI)

```typescript
interface UserCardProps {
  user: User;
  onEdit: () => void;
  onDelete: () => void;
}

function UserCard({ user, onEdit, onDelete }: UserCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <img
          src={user.avatar}
          alt={user.name}
          className="h-16 w-16 rounded-full object-cover"
        />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
          <p className="text-sm text-gray-600">{user.email}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={onEdit}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
```

### Container Component (Logic & Data)

```typescript
function UserCardContainer({ userId }: { userId: string }) {
  const navigate = useNavigate();

  // TanStack Query v5 syntax
  const { data: user, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['users'] });
      navigate('/users');
    },
  });

  const handleEdit = () => navigate(`/users/${userId}/edit`);
  const handleDelete = () => {
    if (confirm('Delete user?')) {
      deleteMutation.mutate(userId);
    }
  };

  if (isLoading) return <Skeleton />;
  if (!user) return <ErrorState />;

  return (
    <UserCard
      user={user}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );
}
```

## Composition Patterns

### Composition Over Inheritance

```typescript
// Base Button component
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  className?: string;
}

function Button({ children, onClick, variant = 'primary', className }: ButtonProps) {
  const baseStyles = 'px-4 py-2 rounded-lg font-medium transition-colors';
  const variantStyles = {
    primary: 'bg-brand text-white hover:bg-brand-dark',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
  };

  return (
    <button
      className={cn(baseStyles, variantStyles[variant], className)}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// Compose complex components
function IconButton({ icon, ...props }: ButtonProps & { icon: React.ReactNode }) {
  return (
    <Button {...props}>
      <span className="flex items-center gap-2">
        {icon}
        {props.children}
      </span>
    </Button>
  );
}

function LoadingButton({ loading, ...props }: ButtonProps & { loading: boolean }) {
  return (
    <Button {...props} disabled={loading} className="flex items-center gap-2">
      {loading && <Spinner className="h-4 w-4 animate-spin" />}
      {props.children}
    </Button>
  );
}
```

### Render Props Pattern

```typescript
interface DataFetcherProps<T> {
  url: string;
  children: (data: T, loading: boolean, error: Error | null) => React.ReactNode;
}

function DataFetcher<T>({ url, children }: DataFetcherProps<T>) {
  const { data, isLoading, error } = useQuery<T>({
    queryKey: ['data', url],
    queryFn: () => fetch(url).then(r => r.json()),
  });

  return <>{children(data, isLoading, error)}</>;
}

// Usage
function UsersList() {
  return (
    <DataFetcher<User[]> url="/api/users">
      {(users, loading, error) => {
        if (loading) return <Skeleton />;
        if (error) return <Error error={error} />;
        return <UserList users={users} />;
      }}
    </DataFetcher>
  );
}
```

### Compound Components Pattern

```typescript
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

function Tabs({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState('tab1');

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="w-full">{children}</div>
    </TabsContext.Provider>
  );
}

function TabList({ children }: { children: React.ReactNode }) {
  return <div className="flex border-b border-gray-200">{children}</div>;
}

function Tab({ id, children }: { id: string; children: React.ReactNode }) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tab must be used within Tabs');

  const { activeTab, setActiveTab } = context;
  const isActive = activeTab === id;

  return (
    <button
      onClick={() => setActiveTab(id)}
      className={cn(
        'px-4 py-2 font-medium transition-colors',
        isActive ? 'border-b-2 border-brand text-brand' : 'text-gray-600 hover:text-gray-900'
      )}
    >
      {children}
    </button>
  );
}

function TabPanel({ id, children }: { id: string; children: React.ReactNode }) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabPanel must be used within Tabs');

  const { activeTab } = context;
  if (activeTab !== id) return null;

  return <div className="p-4">{children}</div>;
}

// Usage
function MyTabs() {
  return (
    <Tabs>
      <TabList>
        <Tab id="tab1">Tab 1</Tab>
        <Tab id="tab2">Tab 2</Tab>
        <Tab id="tab3">Tab 3</Tab>
      </TabList>
      <TabPanel id="tab1">Content 1</TabPanel>
      <TabPanel id="tab2">Content 2</TabPanel>
      <TabPanel id="tab3">Content 3</TabPanel>
    </Tabs>
  );
}
```

## Custom Hooks

### Best Practices

```typescript
// ✅ Good: Focused custom hook
function useUser(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    enabled: !!userId, // Only fetch if userId exists
  });
}

// ✅ Good: Hook with side effects
function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}

// ✅ Good: Hook encapsulating complex logic
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Usage
function SearchInput() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data: results } = useQuery({
    queryKey: ['search', debouncedSearch],
    queryFn: () => searchAPI(debouncedSearch),
    enabled: debouncedSearch.length > 2,
  });

  return (
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

### Hook Naming Conventions

- **Always start with `use`** - React enforces this for hooks
- **Be descriptive** - `useUserProfile` not `useData`
- **Indicate return type** - `useIsAuthenticated` (boolean), `useUsers` (array)

## Error Boundaries

React 19 still requires class components for error boundaries:

```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="rounded-lg border border-red-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-red-900">Something went wrong</h2>
            <p className="mt-2 text-sm text-gray-600">{this.state.error?.message}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
function App() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />} onError={logErrorToService}>
      <UserDashboard />
    </ErrorBoundary>
  );
}
```

## React Compiler Optimization

React 19 includes the React Compiler (formerly React Forget) for automatic optimization.

### What the Compiler Handles

The React Compiler automatically:
- Memoizes components (no need for `React.memo`)
- Stabilizes callback references (no need for `useCallback`)
- Tracks hook dependencies (automatic `useMemo` equivalent)
- Prevents unnecessary re-renders

### When to Still Use Manual Optimization

```typescript
// ✅ Still use useMemo for expensive computations (>100ms)
function DataDashboard({ data }: { data: number[] }) {
  const expensiveCalculation = useMemo(() => {
    // Complex statistical analysis taking 200ms
    return calculateStatistics(data);
  }, [data]);

  return <Chart data={expensiveCalculation} />;
}

// ✅ Still use virtualization for large lists (>1000 items)
import { useVirtualizer } from '@tanstack/react-virtual';

function LargeList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef} className="h-96 overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div key={virtualRow.index} style={{ transform: `translateY(${virtualRow.start}px)` }}>
            <Item item={items[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ✅ Use useMemo for external library integration (stable refs required)
function Chart({ data }: { data: ChartData }) {
  const chartOptions = useMemo(
    () => ({
      series: data.series,
      chart: { type: 'line' },
    }),
    [data]
  );

  return <ApexChart options={chartOptions} />;
}

// ❌ Don't manually memoize simple components
// React Compiler handles this automatically
function SimpleButton({ onClick, label }: ButtonProps) {
  return (
    <button onClick={onClick} className="px-4 py-2 bg-blue-600 text-white">
      {label}
    </button>
  );
}

// ❌ Don't use React.memo for most components
// React Compiler automatically prevents unnecessary renders
function UserCard({ user }: { user: User }) {
  return (
    <div className="rounded-lg border p-4">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  );
}
```

### React Compiler Rules

For the compiler to work effectively:

1. **Components must be pure** - No side effects in render
2. **Follow hooks rules** - Only call hooks at top level
3. **Avoid mutations** - Use immutable updates
4. **Use function declarations** - Compiler optimizes better than arrow functions

```typescript
// ✅ Pure component - Compiler can optimize
function UserGreeting({ user }: { user: User }) {
  return <h1>Hello, {user.name}</h1>;
}

// ❌ Impure component - Compiler cannot optimize
function UserGreeting({ user }: { user: User }) {
  // Side effect in render - violates purity
  document.title = `Welcome, ${user.name}`;
  return <h1>Hello, {user.name}</h1>;
}

// ✅ Move side effect to useEffect
function UserGreeting({ user }: { user: User }) {
  useEffect(() => {
    document.title = `Welcome, ${user.name}`;
  }, [user.name]);

  return <h1>Hello, {user.name}</h1>;
}
```

### Checking Compiler Optimization

Enable React DevTools Profiler to verify optimization:

```typescript
// In development, log render reasons
function MyComponent({ prop1, prop2 }: Props) {
  useEffect(() => {
    console.log('Component rendered', { prop1, prop2 });
  });

  return <div>...</div>;
}
```

If a component renders too often, check:
- Is the component pure?
- Are props stable (not recreated on every render)?
- Are you mutating objects instead of creating new ones?

## Related References

- [State Management](state-management.md) - TanStack Query and Zustand patterns
- [Performance Optimization](performance.md) - Advanced optimization strategies
- [Design Patterns](design-patterns.md) - Architectural patterns for React
