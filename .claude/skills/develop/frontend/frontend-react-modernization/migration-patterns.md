# React Modernization - Migration Patterns

Complete before/after code examples for all React modernization patterns.

## Class to Hooks Migration

### State Management

```javascript
// Before: Class component
class Counter extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      count: 0,
      name: ''
    };
  }

  increment = () => {
    this.setState({ count: this.state.count + 1 });
  }

  render() {
    return (
      <div>
        <p>Count: {this.state.count}</p>
        <button onClick={this.increment}>Increment</button>
      </div>
    );
  }
}

// After: Functional component with hooks
function Counter() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');

  const increment = () => {
    setCount(count + 1);
  };

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>
    </div>
  );
}
```

### Lifecycle Methods to Hooks

```javascript
// Before: Lifecycle methods
class DataFetcher extends React.Component {
  state = { data: null, loading: true };

  componentDidMount() {
    this.fetchData();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.id !== this.props.id) {
      this.fetchData();
    }
  }

  componentWillUnmount() {
    this.cancelRequest();
  }

  fetchData = async () => {
    const data = await fetch(`/api/${this.props.id}`);
    this.setState({ data, loading: false });
  };

  cancelRequest = () => {
    // Cleanup
  };

  render() {
    if (this.state.loading) return <div>Loading...</div>;
    return <div>{this.state.data}</div>;
  }
}

// After: useEffect hook
function DataFetcher({ id }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const response = await fetch(`/api/${id}`);
        const result = await response.json();

        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error);
        }
      }
    };

    fetchData();

    // Cleanup function
    return () => {
      cancelled = true;
    };
  }, [id]); // Re-run when id changes

  if (loading) return <div>Loading...</div>;
  return <div>{data}</div>;
}
```

### Context and HOCs to Hooks

```javascript
// Before: Context consumer and HOC
const ThemeContext = React.createContext();

class ThemedButton extends React.Component {
  static contextType = ThemeContext;

  render() {
    return (
      <button style={{ background: this.context.theme }}>
        {this.props.children}
      </button>
    );
  }
}

// After: useContext hook
function ThemedButton({ children }) {
  const { theme } = useContext(ThemeContext);

  return (
    <button style={{ background: theme }}>
      {children}
    </button>
  );
}

// Before: HOC for data fetching
function withUser(Component) {
  return class extends React.Component {
    state = { user: null };

    componentDidMount() {
      fetchUser().then(user => this.setState({ user }));
    }

    render() {
      return <Component {...this.props} user={this.state.user} />;
    }
  };
}

// After: Custom hook
function useUser() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser().then(setUser);
  }, []);

  return user;
}

function UserProfile() {
  const user = useUser();
  if (!user) return <div>Loading...</div>;
  return <div>{user.name}</div>;
}
```

## React 18 Concurrent Features

### New Root API

```javascript
// Before: React 17
import ReactDOM from 'react-dom';

ReactDOM.render(<App />, document.getElementById('root'));

// After: React 18
import { createRoot } from 'react-dom/client';

const root = createRoot(document.getElementById('root'));
root.render(<App />);
```

### Automatic Batching

```javascript
// React 18: All updates are batched
function handleClick() {
  setCount(c => c + 1);
  setFlag(f => !f);
  // Only one re-render (batched)
}

// Even in async:
setTimeout(() => {
  setCount(c => c + 1);
  setFlag(f => !f);
  // Still batched in React 18!
}, 1000);

// Opt out if needed
import { flushSync } from 'react-dom';

flushSync(() => {
  setCount(c => c + 1);
});
// Re-render happens here
setFlag(f => !f);
// Another re-render
```

### Transitions

```javascript
import { useState, useTransition } from 'react';

function SearchResults() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  const handleChange = (e) => {
    // Urgent: Update input immediately
    setQuery(e.target.value);

    // Non-urgent: Update results (can be interrupted)
    startTransition(() => {
      setResults(searchResults(e.target.value));
    });
  };

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending && <Spinner />}
      <Results data={results} />
    </>
  );
}
```

### Suspense for Data Fetching

```javascript
import { Suspense } from 'react';

// Resource-based data fetching (with React 18)
const resource = fetchProfileData();

function ProfilePage() {
  return (
    <Suspense fallback={<Loading />}>
      <ProfileDetails />
      <Suspense fallback={<Loading />}>
        <ProfileTimeline />
      </Suspense>
    </Suspense>
  );
}

function ProfileDetails() {
  // This will suspend if data not ready
  const user = resource.user.read();
  return <h1>{user.name}</h1>;
}

function ProfileTimeline() {
  const posts = resource.posts.read();
  return <Timeline posts={posts} />;
}
```

## React 19 Features

### React Compiler (Automatic Memoization)

React 19 introduces the React Compiler, a build-time tool that automatically optimizes components:

```javascript
// Before: Manual memoization (React 18)
function ExpensiveComponent({ data, filter }) {
  const filteredData = useMemo(() => {
    return data.filter(item => item.type === filter);
  }, [data, filter]);

  const handleClick = useCallback((id) => {
    console.log(id);
  }, []);

  return <List items={filteredData} onClick={handleClick} />;
}

// After: React Compiler handles it (React 19)
function ExpensiveComponent({ data, filter }) {
  // Compiler automatically memoizes these
  const filteredData = data.filter(item => item.type === filter);

  const handleClick = (id) => {
    console.log(id);
  };

  return <List items={filteredData} onClick={handleClick} />;
}
```

**React Compiler Benefits:**
- 25-40% fewer re-renders without code changes
- Eliminates most useMemo, useCallback, and React.memo usage
- Automatically stabilizes function references
- No runtime overhead (build-time only)

**Enable React Compiler in your build:**
```javascript
// vite.config.js
import react from '@vitejs/plugin-react';

export default {
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', { target: '19' }]]
      }
    })
  ]
};
```

### React 19 New Hooks

#### useActionState

Manages form submissions and async operations with automatic pending state:

```javascript
import { useActionState } from 'react';

function AddToCart({ productId }) {
  async function addToCart(prevState, formData) {
    const response = await fetch('/api/cart', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity: formData.get('quantity') })
    });

    if (!response.ok) {
      return { error: 'Failed to add to cart' };
    }

    return { success: true };
  }

  const [state, formAction, isPending] = useActionState(addToCart, null);

  return (
    <form action={formAction}>
      <input name="quantity" type="number" defaultValue="1" />
      <button disabled={isPending}>
        {isPending ? 'Adding...' : 'Add to Cart'}
      </button>
      {state?.error && <p className="error">{state.error}</p>}
      {state?.success && <p className="success">Added to cart!</p>}
    </form>
  );
}
```

#### useOptimistic

Shows immediate UI updates while waiting for server confirmation:

```javascript
import { useOptimistic } from 'react';

function TodoList({ todos, addTodo }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (state, newTodo) => [...state, { ...newTodo, pending: true }]
  );

  async function handleAdd(formData) {
    const newTodo = { id: Date.now(), text: formData.get('text') };

    // Show immediately
    addOptimisticTodo(newTodo);

    // Send to server (will revert on failure)
    await addTodo(newTodo);
  }

  return (
    <>
      <form action={handleAdd}>
        <input name="text" />
        <button>Add</button>
      </form>
      <ul>
        {optimisticTodos.map(todo => (
          <li key={todo.id} className={todo.pending ? 'pending' : ''}>
            {todo.text}
          </li>
        ))}
      </ul>
    </>
  );
}
```

#### useEffectEvent

Defines callbacks outside Effect's dependency tracking:

```javascript
import { useEffect, useEffectEvent } from 'react';

function ChatRoom({ roomId, theme }) {
  // This function can use reactive values without triggering effect
  const onConnected = useEffectEvent(() => {
    showNotification('Connected!', theme);
  });

  useEffect(() => {
    const connection = createConnection(roomId);
    connection.connect();
    onConnected(); // Uses latest theme without re-connecting

    return () => connection.disconnect();
  }, [roomId]); // Only re-run when roomId changes
}
```

### Actions Feature

React 19 Actions simplify async operations in forms:

```javascript
import { useActionState } from 'react';

function UpdateProfile() {
  async function updateAction(prevState, formData) {
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        body: formData
      });

      if (!response.ok) throw new Error('Update failed');

      return { success: true, message: 'Profile updated!' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  const [state, formAction, isPending] = useActionState(updateAction, null);

  return (
    <form action={formAction}>
      <input name="name" required />
      <input name="email" type="email" required />
      <button disabled={isPending}>
        {isPending ? 'Saving...' : 'Save Profile'}
      </button>
      {state?.error && <p className="error">{state.error}</p>}
      {state?.success && <p className="success">{state.message}</p>}
    </form>
  );
}
```

### Server Components (Stable)

React 19 makes Server Components fully stable:

```javascript
// app/page.tsx - Server Component (default)
async function ProductPage({ params }) {
  // Fetch on server, no client JavaScript needed
  const product = await db.products.findById(params.id);

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <AddToCartButton productId={product.id} />
    </div>
  );
}

// components/AddToCartButton.tsx - Client Component
'use client';

export function AddToCartButton({ productId }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button onClick={() => startTransition(() => addToCart(productId))}>
      {isPending ? 'Adding...' : 'Add to Cart'}
    </button>
  );
}
```

### Ref as Prop (No More forwardRef)

In React 19, ref is a regular prop:

```javascript
// Before: React 18 (forwardRef required)
import { forwardRef } from 'react';

const Input = forwardRef((props, ref) => {
  return <input ref={ref} {...props} />;
});

// After: React 19 (ref is just a prop)
function Input({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}

// Usage is the same
function Form() {
  const inputRef = useRef(null);

  return <Input ref={inputRef} placeholder="Enter text" />;
}
```

## Performance Optimization

### Manual Memoization (React 18 or without Compiler)

If not using React Compiler, optimize manually with useMemo and useCallback:

```javascript
function ExpensiveComponent({ items, filter }) {
  // Memoize expensive calculation
  const filteredItems = useMemo(() => {
    return items.filter(item => item.category === filter);
  }, [items, filter]);

  // Memoize callback to prevent child re-renders
  const handleClick = useCallback((id) => {
    console.log('Clicked:', id);
  }, []); // No dependencies, never changes

  return (
    <List items={filteredItems} onClick={handleClick} />
  );
}

// Child component with memo
const List = React.memo(({ items, onClick }) => {
  return items.map(item => (
    <Item key={item.id} item={item} onClick={onClick} />
  ));
});
```

**Note:** With React Compiler, most useMemo, useCallback, and React.memo become unnecessary.

### Code Splitting

```javascript
import { lazy, Suspense } from 'react';

// Lazy load components
const Dashboard = lazy(() => import('./Dashboard'));
const Settings = lazy(() => import('./Settings'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

## TypeScript Migration

```typescript
// Before: JavaScript
function Button({ onClick, children }) {
  return <button onClick={onClick}>{children}</button>;
}

// After: TypeScript
interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
}

function Button({ onClick, children }: ButtonProps) {
  return <button onClick={onClick}>{children}</button>;
}

// Generic components
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

function List<T>({ items, renderItem }: ListProps<T>) {
  return <>{items.map(renderItem)}</>;
}
```
