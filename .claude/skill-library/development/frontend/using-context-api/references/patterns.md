# Advanced Context Patterns

**Common patterns for React Context API beyond basic usage.**

## 1. Reducer Context Pattern

Combine Context with `useReducer` for complex state logic:

```tsx
type State = {
  count: number;
  user: User | null;
  loading: boolean;
};

type Action =
  | { type: "increment" }
  | { type: "setUser"; payload: User }
  | { type: "setLoading"; payload: boolean };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "increment":
      return { ...state, count: state.count + 1 };
    case "setUser":
      return { ...state, user: action.payload };
    case "setLoading":
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

type AppContextType = {
  state: State;
  dispatch: Dispatch<Action>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    count: 0,
    user: null,
    loading: false,
  });

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}

// Usage
function Counter() {
  const { state, dispatch } = useApp();
  return <button onClick={() => dispatch({ type: "increment" })}>Count: {state.count}</button>;
}
```

**When to use:**

- Complex state logic with multiple sub-values
- State updates depend on previous state
- Want to separate state logic from component logic

## 2. Split Context Pattern

Split state and dispatch into separate contexts to minimize re-renders:

```tsx
const StateContext = createContext<State | undefined>(undefined);
const DispatchContext = createContext<Dispatch<Action> | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StateContext.Provider>
  );
}

export function useState() {
  const context = useContext(StateContext);
  if (!context) throw new Error("useState must be used within AppProvider");
  return context;
}

export function useDispatch() {
  const context = useContext(DispatchContext);
  if (!context) throw new Error("useDispatch must be used within AppProvider");
  return context;
}

// Components that only dispatch don't re-render when state changes
function AddButton() {
  const dispatch = useDispatch(); // No re-render when state changes!
  return <button onClick={() => dispatch({ type: "add" })}>Add</button>;
}
```

**Benefits:**

- Components that only dispatch don't re-render
- Similar to Redux's `connect` separation

## 3. Async Context Pattern

Handle async operations in context:

```tsx
type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

type UserContextType = {
  user: AsyncState<User>;
  fetchUser: (id: string) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AsyncState<User>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchUser = useCallback(async (id: string) => {
    setUser((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await userAPI.fetch(id);
      setUser({ data, loading: false, error: null });
    } catch (error) {
      setUser((prev) => ({
        ...prev,
        loading: false,
        error: error as Error,
      }));
    }
  }, []);

  const updateUser = useCallback(async (updatedUser: User) => {
    setUser((prev) => ({ ...prev, loading: true }));
    try {
      await userAPI.update(updatedUser);
      setUser({ data: updatedUser, loading: false, error: null });
    } catch (error) {
      setUser((prev) => ({
        ...prev,
        loading: false,
        error: error as Error,
      }));
    }
  }, []);

  const value = useMemo(() => ({ user, fetchUser, updateUser }), [user, fetchUser, updateUser]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
```

**⚠️ Consider TanStack Query instead** for server state management.

## 4. Factory Context Pattern

Create reusable context factories:

```tsx
function createGenericContext<T>() {
  const Context = createContext<T | undefined>(undefined);

  function Provider({ value, children }: { value: T; children: ReactNode }) {
    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  function useValue() {
    const context = useContext(Context);
    if (context === undefined) {
      throw new Error("useValue must be used within Provider");
    }
    return context;
  }

  return [Provider, useValue] as const;
}

// Usage
type Theme = { mode: "light" | "dark" };
const [ThemeProvider, useTheme] = createGenericContext<Theme>();

type User = { id: string; name: string };
const [UserProvider, useUser] = createGenericContext<User>();
```

## 5. Composition Pattern

Compose multiple providers cleanly:

```tsx
// Instead of this:
<AuthProvider>
  <ThemeProvider>
    <FeatureFlagsProvider>
      <NotificationsProvider>
        <App />
      </NotificationsProvider>
    </FeatureFlagsProvider>
  </ThemeProvider>
</AuthProvider>;

// Create a composed provider:
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <FeatureFlagsProvider>
          <NotificationsProvider>{children}</NotificationsProvider>
        </FeatureFlagsProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

// Usage
<AppProviders>
  <App />
</AppProviders>;
```

## 6. Lazy Context Pattern

Initialize context value lazily:

```tsx
export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Config | null>(null);

  useEffect(() => {
    // Load config asynchronously
    fetchConfig().then(setConfig);
  }, []);

  // Show loading state until config is ready
  if (!config) {
    return <LoadingSpinner />;
  }

  const value = useMemo(() => ({ config, setConfig }), [config]);

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}
```

## 7. Selective Context Pattern

Only re-render on specific state changes:

```tsx
type AppState = {
  user: User;
  theme: Theme;
  notifications: Notification[];
};

// Create separate contexts for each slice
const UserContext = createContext<User | undefined>(undefined);
const ThemeContext = createContext<Theme | undefined>(undefined);
const NotificationsContext = createContext<Notification[] | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);

  return (
    <UserContext.Provider value={state.user}>
      <ThemeContext.Provider value={state.theme}>
        <NotificationsContext.Provider value={state.notifications}>
          {children}
        </NotificationsContext.Provider>
      </ThemeContext.Provider>
    </UserContext.Provider>
  );
}

// Components only re-render when their specific context changes
function UserProfile() {
  const user = useContext(UserContext); // Only re-renders on user change
  return <div>{user?.name}</div>;
}

function ThemeToggle() {
  const theme = useContext(ThemeContext); // Only re-renders on theme change
  return <button>{theme}</button>;
}
```

## 8. Context with Local Storage

Persist context to localStorage:

```tsx
type Settings = {
  language: string;
  notifications: boolean;
};

const SettingsContext = createContext<
  | {
      settings: Settings;
      updateSettings: (settings: Partial<Settings>) => void;
    }
  | undefined
>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    const stored = localStorage.getItem("settings");
    return stored ? JSON.parse(stored) : defaultSettings;
  });

  const updateSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem("settings", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value = useMemo(() => ({ settings, updateSettings }), [settings, updateSettings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
```

## 9. Context with URL Sync

Sync context state with URL parameters:

```tsx
export function FiltersProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(
    () => ({
      search: searchParams.get("search") || "",
      category: searchParams.get("category") || "all",
      sort: searchParams.get("sort") || "recent",
    }),
    [searchParams]
  );

  const updateFilters = useCallback(
    (newFilters: Partial<typeof filters>) => {
      const params = new URLSearchParams(searchParams);
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });
      setSearchParams(params);
    },
    [searchParams, setSearchParams]
  );

  const value = useMemo(() => ({ filters, updateFilters }), [filters, updateFilters]);

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}
```

## 10. Context with Undo/Redo

Implement undo/redo functionality:

```tsx
type History<T> = {
  past: T[];
  present: T;
  future: T[];
};

type HistoryActions<T> = {
  set: (newPresent: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

export function EditorProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<History<EditorState>>({
    past: [],
    present: initialState,
    future: [],
  });

  const set = useCallback((newPresent: EditorState) => {
    setHistory((prev) => ({
      past: [...prev.past, prev.present],
      present: newPresent,
      future: [],
    }));
  }, []);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, prev.past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      const newFuture = prev.future.slice(1);
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const value = useMemo(
    () => ({
      state: history.present,
      set,
      undo,
      redo,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
    }),
    [history, set, undo, redo]
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}
```

## Pattern Selection Guide

| Pattern       | Use Case                                     |
| ------------- | -------------------------------------------- |
| Reducer       | Complex state logic, multiple actions        |
| Split Context | Minimize re-renders, separate state/dispatch |
| Async         | Async operations, loading/error states       |
| Factory       | Reusable context logic                       |
| Composition   | Multiple providers                           |
| Lazy          | Async initialization                         |
| Selective     | Large state, minimize re-renders             |
| Local Storage | Persist user preferences                     |
| URL Sync      | Share state via URL                          |
| Undo/Redo     | Editor or canvas applications                |

## Anti-Patterns

### ❌ Nested Context Providers

```tsx
// ❌ BAD: Deeply nested providers
function Component() {
  return (
    <Provider1>
      <Provider2>
        <Provider3>{/* 10 more levels */}</Provider3>
      </Provider2>
    </Provider1>
  );
}

// ✅ GOOD: Composed provider
function AppProviders({ children }) {
  return (
    <Provider1>
      <Provider2>
        <Provider3>{children}</Provider3>
      </Provider2>
    </Provider1>
  );
}
```

### ❌ Context for Everything

```tsx
// ❌ BAD: Context for tightly coupled components
<ModalContext.Provider>
  <ModalTrigger />
  <ModalContent />
</ModalContext.Provider>

// ✅ GOOD: Props for tight coupling
<Modal isOpen={isOpen} onClose={onClose}>
  <ModalContent />
</Modal>
```

## Further Reading

- [API Reference](./api-reference.md) - Complete Context API
- [Performance](./performance.md) - Optimization techniques
- [Testing](./testing.md) - Testing patterns
