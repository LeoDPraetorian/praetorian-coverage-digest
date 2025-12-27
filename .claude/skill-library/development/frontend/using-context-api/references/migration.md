# Migration Guide

**Migrating from legacy Context patterns to React 19+ best practices.**

## From Class Components to Hooks

### Legacy: Class Component with contextType

```tsx
// ❌ OLD: Class component with static contextType
class UserProfile extends React.Component {
  static contextType = UserContext;

  render() {
    const user = this.context;
    return <div>{user.name}</div>;
  }
}
```

**Migration:**

```tsx
// ✅ NEW: Functional component with useContext
function UserProfile() {
  const { user } = useUser();
  return <div>{user.name}</div>;
}
```

**Steps:**
1. Convert class to function component
2. Replace `this.context` with `useContext(Context)`
3. Create custom hook for better DX
4. Remove `static contextType`

### Legacy: Consumer Component

```tsx
// ❌ OLD: Consumer component pattern
function UserProfile() {
  return (
    <UserContext.Consumer>
      {value => (
        <div>{value.user.name}</div>
      )}
    </UserContext.Consumer>
  );
}
```

**Migration:**

```tsx
// ✅ NEW: useContext hook
function UserProfile() {
  const { user } = useContext(UserContext);
  return <div>{user.name}</div>;
}
```

**Steps:**
1. Remove `<Context.Consumer>` wrapper
2. Replace render prop with `useContext(Context)`
3. Access value directly instead of via callback

## From PropTypes to TypeScript

### Legacy: PropTypes

```tsx
// ❌ OLD: PropTypes for context
import PropTypes from 'prop-types';

ThemeContext.Provider.propTypes = {
  value: PropTypes.shape({
    theme: PropTypes.oneOf(['light', 'dark']).isRequired,
    toggleTheme: PropTypes.func.isRequired,
  }).isRequired,
};
```

**Migration:**

```tsx
// ✅ NEW: TypeScript
type ThemeContextType = {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
```

**Benefits:**
- Compile-time type checking
- Better IDE autocomplete
- Eliminates runtime PropTypes overhead

## From Legacy Context API (React < 16.3)

### Legacy: getChildContext

```tsx
// ❌ OLD: Legacy Context API (React < 16.3)
class ThemeProvider extends React.Component {
  static childContextTypes = {
    theme: PropTypes.string.isRequired,
    toggleTheme: PropTypes.func.isRequired,
  };

  getChildContext() {
    return {
      theme: this.state.theme,
      toggleTheme: this.toggleTheme,
    };
  }

  render() {
    return this.props.children;
  }
}

// Consumer
class Button extends React.Component {
  static contextTypes = {
    theme: PropTypes.string.isRequired,
  };

  render() {
    return <button className={this.context.theme}>Click</button>;
  }
}
```

**Migration:**

```tsx
// ✅ NEW: Modern Context API
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}

// Consumer
function Button() {
  const { theme } = useTheme();
  return <button className={theme}>Click</button>;
}
```

**Steps:**
1. Remove `childContextTypes` and `contextTypes`
2. Replace `getChildContext` with `createContext`
3. Create provider component with `useState`
4. Replace `this.context` with `useContext`
5. Add TypeScript types

## From Unstable Context to Stable Context

### Legacy: Unstable createContext

```tsx
// ❌ OLD: React 16.3 experimental Context
import { unstable_createContext } from 'react';

const ThemeContext = unstable_createContext('light');
```

**Migration:**

```tsx
// ✅ NEW: Stable Context
import { createContext } from 'react';

const ThemeContext = createContext<Theme | undefined>(undefined);
```

**Steps:**
1. Remove `unstable_` prefix
2. Use TypeScript for type safety
3. Use `undefined` as default value

## From Global Variables to Context

### Legacy: Global State

```tsx
// ❌ OLD: Global variable
let currentUser: User | null = null;

export function setUser(user: User) {
  currentUser = user;
  // No way to trigger re-renders!
}

export function getUser() {
  return currentUser;
}

// Components can't react to changes
function UserProfile() {
  return <div>{getUser()?.name}</div>; // Doesn't re-render when user changes
}
```

**Migration:**

```tsx
// ✅ NEW: Context with reactivity
const UserContext = createContext<User | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const value = useMemo(() => ({ user, setUser }), [user]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
}

// Component automatically re-renders
function UserProfile() {
  const { user } = useUser();
  return <div>{user?.name}</div>;
}
```

## From Redux to Context

**⚠️ Only migrate simple Redux stores. Complex stores should stay in Redux.**

### When to Migrate from Redux

✅ **Migrate when:**
- Store has <5 actions
- No middleware needed
- No time-travel debugging needed
- State is mostly static

❌ **Don't migrate when:**
- Complex async logic
- Need Redux DevTools
- Multiple reducers
- Heavily used middleware

### Simple Redux Store

```tsx
// ❌ OLD: Redux for simple theme
const themeReducer = (state = 'light', action) => {
  switch (action.type) {
    case 'TOGGLE_THEME':
      return state === 'light' ? 'dark' : 'light';
    default:
      return state;
  }
};

const store = createStore(themeReducer);

// Usage
import { useSelector, useDispatch } from 'react-redux';

function ThemeToggle() {
  const theme = useSelector(state => state);
  const dispatch = useDispatch();

  return (
    <button onClick={() => dispatch({ type: 'TOGGLE_THEME' })}>
      Theme: {theme}
    </button>
  );
}
```

**Migration:**

```tsx
// ✅ NEW: Context for simple state
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// Usage
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return <button onClick={toggleTheme}>Theme: {theme}</button>;
}
```

## From MobX to Context

### Simple MobX Store

```tsx
// ❌ OLD: MobX for simple state
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';

class ThemeStore {
  theme = 'light';

  constructor() {
    makeAutoObservable(this);
  }

  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
  }
}

const themeStore = new ThemeStore();

const ThemeToggle = observer(() => {
  return (
    <button onClick={() => themeStore.toggleTheme()}>
      Theme: {themeStore.theme}
    </button>
  );
});
```

**Migration:**

```tsx
// ✅ NEW: Context
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return <button onClick={toggleTheme}>Theme: {theme}</button>;
}
```

## Migration Checklist

### Phase 1: Setup

- [ ] Install TypeScript (if not already)
- [ ] Create new Context with `createContext`
- [ ] Define TypeScript types for context value
- [ ] Create provider component
- [ ] Create custom hook with error checking

### Phase 2: Replace Consumers

- [ ] Identify all components using legacy pattern
- [ ] Convert class components to function components
- [ ] Replace `this.context` or `<Consumer>` with `useContext`
- [ ] Update imports
- [ ] Test each component

### Phase 3: Replace Providers

- [ ] Wrap app with new provider
- [ ] Remove legacy provider
- [ ] Remove old context definition
- [ ] Remove PropTypes
- [ ] Test entire app

### Phase 4: Optimization

- [ ] Memoize context value
- [ ] Memoize callbacks
- [ ] Split contexts if needed
- [ ] Run performance profiler
- [ ] Fix any re-render issues

### Phase 5: Cleanup

- [ ] Remove unused imports
- [ ] Remove PropTypes dependency (if unused elsewhere)
- [ ] Update documentation
- [ ] Update tests

## Common Migration Pitfalls

### 1. Forgetting to Memoize

```tsx
// ❌ BAD: Creates new object every render
function Provider({ children }) {
  const [state, setState] = useState(initialState);
  return (
    <Context.Provider value={{ state, setState }}>
      {children}
    </Context.Provider>
  );
}

// ✅ GOOD: Memoized value
function Provider({ children }) {
  const [state, setState] = useState(initialState);
  const value = useMemo(() => ({ state, setState }), [state]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
```

### 2. Not Using Custom Hooks

```tsx
// ❌ BAD: Direct useContext everywhere
function Component() {
  const context = useContext(UserContext);
  if (!context) throw new Error('...');
  return <div>{context.user.name}</div>;
}

// ✅ GOOD: Custom hook
export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
}

function Component() {
  const { user } = useUser(); // Clean, type-safe
  return <div>{user.name}</div>;
}
```

### 3. Using Default Values Incorrectly

```tsx
// ❌ BAD: Default object (confusing)
const Context = createContext({ user: null });

// ✅ GOOD: Undefined default
const Context = createContext<ContextType | undefined>(undefined);
```

### 4. Not Splitting Frequently-Changing State

```tsx
// ❌ BAD: Mixed update frequencies
const Context = createContext({
  user: null,        // Rarely changes
  notifications: [], // Changes frequently
});

// ✅ GOOD: Separate contexts
const UserContext = createContext(null);
const NotificationsContext = createContext([]);
```

## Testing After Migration

```tsx
import { render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';

describe('ThemeContext migration', () => {
  it('provides theme value', () => {
    function TestComponent() {
      const { theme } = useTheme();
      return <div>Theme: {theme}</div>;
    }

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByText(/Theme: light/i)).toBeInTheDocument();
  });

  it('toggles theme', () => {
    function TestComponent() {
      const { theme, toggleTheme } = useTheme();
      return (
        <button onClick={toggleTheme}>
          Theme: {theme}
        </button>
      );
    }

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Theme: light');

    button.click();
    expect(button).toHaveTextContent('Theme: dark');
  });

  it('throws error when used outside provider', () => {
    function TestComponent() {
      const { theme } = useTheme();
      return <div>{theme}</div>;
    }

    // Suppress console.error for this test
    const spy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useTheme must be used within ThemeProvider');

    spy.mockRestore();
  });
});
```

## Performance Comparison

| Metric | Legacy (Class) | Modern (Hooks) |
|--------|----------------|----------------|
| Bundle size | Larger (classes) | Smaller (functions) |
| Initial render | Similar | Similar |
| Re-render | Slower | Faster (with memoization) |
| Memory | Higher | Lower |
| DevTools | Limited | Full support |

## Further Reading

- [React Docs: Legacy Context](https://legacy.reactjs.org/docs/legacy-context.html)
- [React Docs: Hooks at a Glance](https://react.dev/reference/react)
- [API Reference](./api-reference.md) - Complete Context API
- [Performance](./performance.md) - Optimization after migration
