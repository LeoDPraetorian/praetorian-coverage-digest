# React Context Patterns

**Best practices for global client state management with React Context.**

## When to Use Context

React Context is appropriate for:

- ✅ Shared across many unrelated components
- ✅ Application-wide state (auth, theme)
- ✅ Synced with URL parameters (drawers, tabs)
- ✅ Simple to moderate complexity
- ✅ Low-to-medium update frequency

**NOT for**:

- ❌ Server state (use TanStack Query)
- ❌ Frequently updating values (causes excessive re-renders)
- ❌ Simple prop drilling between 2-3 components (use composition)

## Context Splitting Pattern

**Core Principle**: Split contexts by update frequency.

### Chariot Platform Examples (12 Contexts)

| Context                   | Purpose                        | Update Frequency | Lines |
| ------------------------- | ------------------------------ | ---------------- | ----- |
| **AuthContext**           | JWT, user, impersonation       | Very Low         | ~654  |
| **ThemeContext**          | Light/dark/system toggle       | Very Low         | ~99   |
| **GlobalStateContext**    | Modals, drawer stack           | Medium           | ~1048 |
| **QueryBuilderContext**   | Filter options (from Query)    | Low              | -     |
| **GraphStateProvider**    | Graph UI state (useReducer)    | Medium-High      | ~660  |
| **CellFiltersContext** x2 | Table cell filters (scoped)    | High (localized) | -     |

**Why split**: Prevents components from re-rendering when unrelated state changes.

### Anti-Pattern: Monolithic Context

```typescript
// ❌ BAD - everything in one context
const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerStack, setDrawerStack] = useState([]);
  // ... 20 more state variables

  // Components re-render when ANY value changes!
  return <AppContext.Provider value={{ user, theme, modalOpen, drawerStack, ... }}>
    {children}
  </AppContext.Provider>;
};
```

**Problem**: Component using only `theme` re-renders when `modalOpen` changes.

### Better Pattern: Split by Update Frequency

```typescript
// ✅ GOOD - separate contexts
const ThemeContext = createContext(); // Very low frequency
const AuthContext = createContext();  // Low frequency
const UIStateContext = createContext(); // Medium-high frequency
```

**Industry validation** (DeveloperWay):

> "Split the state part and the API part under your provider. Decompose your 'monolith' state into two 'microstates'."

## Memoization (Critical for Performance)

### Always Memoize Context Value

```typescript
// ❌ BAD - creates new object every render
const MyProvider = ({ children }) => {
  const [value, setValue] = useState('');

  return (
    <MyContext.Provider value={{ value, setValue }}>
      {children}
    </MyContext.Provider>
  );
};
```

**Problem**: `{ value, setValue }` is a new object every render → all consumers re-render.

```typescript
// ✅ GOOD - memoize the value
const MyProvider = ({ children }) => {
  const [value, setValue] = useState('');

  const contextValue = useMemo(() => ({ value, setValue }), [value]);

  return (
    <MyContext.Provider value={contextValue}>
      {children}
    </MyContext.Provider>
  );
};
```

### Memoize Callbacks in Context

```typescript
// ✅ GOOD - memoize callbacks to prevent re-renders
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = useCallback(async (credentials) => {
    const result = await api.login(credentials);
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    // Clear other state...
  }, []);

  const value = useMemo(() => ({
    user,
    login,
    logout,
  }), [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

## URL-Synced State Pattern (Innovative)

**Use Case**: State that should survive page refresh and support deep linking (drawers, tabs, filters).

### Chariot Platform Implementation

```typescript
// Drawer state is read from URL params
const drawerOrder = JSON.parse(searchParams.get('drawerOrder') || '[]');
const assetDrawerKey = searchParams.get('assetDrawerKey') || '';

// Updates modify URL for deep linking
function handleOpenAssetDrawer(asset?: PartialAsset) {
  handleSetSearchParams({
    drawerType: 'asset',
    tabKeys: ['assetDrawerTab', 'assetDrawerSubTab'],
    resource: asset,
  });
}
```

**Benefits**:

- ✅ Drawers navigable via browser back/forward
- ✅ Deep linking works automatically
- ✅ No stale state on page refresh
- ✅ URL is single source of truth

**Industry validation** (React Router docs):

> "URL is the single source of truth... enables deep linking, browser back/forward navigation."

### When to Use URL vs Context

| State Type       | Solution | Why                                  |
| ---------------- | -------- | ------------------------------------ |
| Drawer open/ID   | URL      | Deep linkable, survives refresh      |
| Active tab       | URL      | Sharable, browser history            |
| Modal open/close | Context  | Ephemeral, not sharable              |
| Theme            | Context  | Persisted separately (localStorage)  |
| Table filters    | URL      | Sharable, refreshable                |
| Form input       | useState | Component-local, not shared          |

## React 19 Compiler Impact

**Automatic Memoization**: React 19 Compiler automatically applies `useMemo` and `useCallback` everywhere it's safe.

**Performance Improvement**: 30-60% reduction in unnecessary re-renders for most applications.

**Quote from Meta announcement**:

> "React Compiler typically delivers 30-60% reduction in unnecessary re-renders... mirrors the benefits of libraries like `use-context-selector` without extra code."

**Implication**: Context performance concerns are less critical with React 19 Compiler. The decision to use Context over Zustand becomes even more justified for simple-to-moderate state.

## Context Provider Pattern (Standard Template)

```typescript
interface MyContextType {
  value: string;
  setValue: (value: string) => void;
}

const MyContext = createContext<MyContextType | undefined>(undefined);

export const MyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [value, setValue] = useState('');

  // Memoize the context value
  const contextValue = useMemo(() => ({ value, setValue }), [value]);

  return (
    <MyContext.Provider value={contextValue}>
      {children}
    </MyContext.Provider>
  );
};

// Custom hook with error checking
export const useMyContext = () => {
  const context = useContext(MyContext);
  if (!context) {
    throw new Error('useMyContext must be used within MyProvider');
  }
  return context;
};
```

## Common Anti-Patterns

### ❌ Using Context for Server State

```typescript
// ❌ BAD - manual cache management
const AssetContext = createContext();

export const AssetProvider = ({ children }) => {
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    // Manual fetching, caching, refetching...
    fetchAssets().then(setAssets);
  }, []);

  return <AssetContext.Provider value={{ assets }}>{children}</AssetContext.Provider>;
};
```

**Fix**: Use TanStack Query for server state, Context only for client state.

### ❌ Large Object Without useMemo

```typescript
// ❌ BAD - creates new object every render
<MyContext.Provider value={{ user, theme, settings, ... }}>
```

**Fix**: Wrap in `useMemo`:

```typescript
// ✅ GOOD - memoized value
const value = useMemo(() => ({ user, theme, settings }), [user, theme, settings]);
<MyContext.Provider value={value}>
```

### ❌ Frequent Updates in Context

```typescript
// ❌ BAD - causes re-renders on every keystroke
const [searchTerm, setSearchTerm] = useState('');
<SearchContext.Provider value={{ searchTerm, setSearchTerm }}>
```

**Fix**: Keep high-frequency state local (useState), or use Zustand with selective subscriptions.

## Sources

- [How to Write Performant React Apps with Context](https://www.developerway.com/posts/how-to-write-performant-react-apps-with-context)
- [Advanced React Context Optimization](https://javascript.plainenglish.io/advanced-react-context-optimization-master-selective-re-rendering-patterns-to-eliminate-53a34e2c710b)
- [React Router State Management](https://reactrouter.com/explanation/state-management)
- [Meta's React Compiler Announcement](https://www.infoq.com/news/2025/12/react-compiler-meta/)
