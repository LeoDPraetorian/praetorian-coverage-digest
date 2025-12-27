# Context Performance Optimization

**Strategies to prevent unnecessary re-renders and optimize Context API performance.**

> **Last Updated:** December 2025 (verified against React 19.2.3)

## React 19 Compiler: The Game Changer

**In React 19+, the React Compiler automatically memoizes components and values, making manual `useMemo`/`useCallback` largely unnecessary.**

```tsx
// React 18 and earlier - manual memoization required
function Provider({ children }) {
  const [state, setState] = useState(initialState);
  const value = useMemo(() => ({ state, setState }), [state]); // Manual!
  return <Context value={value}>{children}</Context>;
}

// React 19+ with Compiler - auto-memoization
function Provider({ children }) {
  const [state, setState] = useState(initialState);
  // Compiler automatically optimizes this!
  return <Context value={{ state, setState }}>{children}</Context>;
}
```

**When to still use manual memoization:**
- Interop with libraries that compare callback/object identity (virtualization libs, map layers)
- Performance-critical paths confirmed through profiling
- When explicit clarity is preferred

**2025 Best Practice:** Write simple, pure components. Let the compiler do the heavy lifting. Use manual memo surgically—after profiling proves it helps.

## Understanding Context Re-renders

**Key principle: Context triggers re-renders on ALL consumers when the value changes (reference equality).**

```tsx
// Every time Provider re-renders, this creates a new object
function Provider({ children }) {
  const [count, setCount] = useState(0);

  // New object on every render! ⚠️
  return (
    <Context.Provider value={{ count, setCount }}>
      {children}
    </Context.Provider>
  );
}
```

**Result:** All consumers re-render on EVERY Provider render, even if `count` didn't change.

## Optimization Strategy 1: Memoize Context Value

**Always use `useMemo` for context values:**

```tsx
function Provider({ children }) {
  const [count, setCount] = useState(0);

  // Only creates new object when count changes
  const value = useMemo(() => ({ count, setCount }), [count]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}
```

**When to memoize:**
- Always, unless value is a primitive (string, number, boolean)
- Objects, arrays, functions in context value

## Optimization Strategy 2: Split Contexts

**Separate frequently-changing state from static state:**

```tsx
// ❌ BAD: Single context with mixed update frequencies
type AppContext = {
  user: User;              // Changes rarely
  theme: Theme;            // Changes rarely
  notifications: number;   // Changes frequently!
};

// All components re-render when notifications change

// ✅ GOOD: Separate contexts
const UserContext = createContext<User | undefined>(undefined);
const ThemeContext = createContext<Theme | undefined>(undefined);
const NotificationsContext = createContext<number>(0);

// Components only subscribe to what they need
```

**Rule:** If state updates at different frequencies, use separate contexts.

## Optimization Strategy 3: Split State and Dispatch

**Separate state from actions to prevent unnecessary re-renders:**

```tsx
const StateContext = createContext<State | undefined>(undefined);
const ActionsContext = createContext<Actions | undefined>(undefined);

function Provider({ children }) {
  const [state, setState] = useState(initialState);

  // Actions don't depend on state, so they never change
  const actions = useMemo(
    () => ({
      increment: () => setState(s => s + 1),
      decrement: () => setState(s => s - 1),
    }),
    []
  );

  return (
    <StateContext.Provider value={state}>
      <ActionsContext.Provider value={actions}>
        {children}
      </ActionsContext.Provider>
    </StateContext.Provider>
  );
}

// Component that only dispatches doesn't re-render when state changes!
function IncrementButton() {
  const { increment } = useContext(ActionsContext);
  return <button onClick={increment}>+</button>;
}
```

## Optimization Strategy 4: Context Selectors

**Use selector pattern to subscribe to specific properties:**

```tsx
type AppState = {
  user: User;
  settings: Settings;
  notifications: Notification[];
};

// Create separate hooks for each slice
function useUser() {
  const state = useContext(AppContext);
  return state?.user;
}

function useSettings() {
  const state = useContext(AppContext);
  return state?.settings;
}

// Component only re-renders when user changes
function UserProfile() {
  const user = useUser();
  return <div>{user?.name}</div>;
}
```

**⚠️ Limitation:** This doesn't prevent re-renders, just makes code cleaner. For true selector optimization, use Zustand.

## Optimization Strategy 5: React.memo for Consumers

**Wrap consumers in `memo` to prevent parent re-renders:**

```tsx
const UserProfile = memo(function UserProfile() {
  const { user } = useUser();
  return <div>{user.name}</div>;
});

// Parent can re-render, but UserProfile only re-renders when user changes
function App() {
  const [unrelatedState, setUnrelatedState] = useState(0);

  return (
    <div>
      <button onClick={() => setUnrelatedState(x => x + 1)}>
        Trigger Parent Re-render
      </button>
      <UserProfile /> {/* Doesn't re-render */}
    </div>
  );
}
```

## Optimization Strategy 6: Lazy Initialization

**Initialize expensive state lazily:**

```tsx
function Provider({ children }) {
  // ❌ BAD: Runs on every render
  const [data, setData] = useState(expensiveComputation());

  // ✅ GOOD: Only runs once
  const [data, setData] = useState(() => expensiveComputation());

  const value = useMemo(() => ({ data, setData }), [data]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}
```

## Debugging Re-renders

### 1. React DevTools Profiler

```tsx
// Wrap your app with Profiler
import { Profiler } from 'react';

function onRenderCallback(
  id, // "App"
  phase, // "mount" | "update"
  actualDuration, // Time spent rendering
  baseDuration, // Estimated time without memoization
  startTime,
  commitTime
) {
  console.log(`${id} ${phase} took ${actualDuration}ms`);
}

<Profiler id="App" onRender={onRenderCallback}>
  <App />
</Profiler>
```

**Use DevTools:**
- Click "Profiler" tab
- Click record button
- Interact with your app
- See which components re-rendered and why

### 2. Custom Hook to Track Re-renders

```tsx
function useWhyDidYouUpdate(name: string, props: Record<string, any>) {
  const previousProps = useRef<Record<string, any>>();

  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: Record<string, any> = {};

      allKeys.forEach(key => {
        if (previousProps.current?.[key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current?.[key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changedProps).length > 0) {
        console.log('[why-did-you-update]', name, changedProps);
      }
    }

    previousProps.current = props;
  });
}

// Usage
function MyComponent() {
  const context = useMyContext();
  useWhyDidYouUpdate('MyComponent', context);
  // ...
}
```

### 3. Check Context Value Reference

```tsx
function Provider({ children }) {
  const [state, setState] = useState(initialState);

  const value = { state, setState }; // New object every render!

  // Debug: Log when value reference changes
  useEffect(() => {
    console.log('Context value changed');
  }, [value]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}
```

## Performance Patterns by Use Case

### 1. Auth Context (Rarely Changes)

```tsx
// Simple memoization is sufficient
function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback(async (credentials) => {
    const user = await authAPI.login(credentials);
    setUser(user);
  }, []);

  const logout = useCallback(async () => {
    await authAPI.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, login, logout }),
    [user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

### 2. Notifications Context (Frequent Updates)

```tsx
// Split state and actions
const NotificationsStateContext = createContext<Notification[]>([]);
const NotificationsActionsContext = createContext<NotificationsActions | undefined>(undefined);

function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Actions memoized once
  const actions = useMemo(
    () => ({
      add: (notification: Notification) =>
        setNotifications(prev => [...prev, notification]),
      remove: (id: string) =>
        setNotifications(prev => prev.filter(n => n.id !== id)),
      clear: () => setNotifications([]),
    }),
    []
  );

  return (
    <NotificationsStateContext.Provider value={notifications}>
      <NotificationsActionsContext.Provider value={actions}>
        {children}
      </NotificationsActionsContext.Provider>
    </NotificationsStateContext.Provider>
  );
}

// Component that only adds notifications doesn't re-render
function AddNotificationButton() {
  const { add } = useContext(NotificationsActionsContext);
  return <button onClick={() => add(newNotification)}>Add</button>;
}
```

### 3. Form Context (Multiple Fields)

```tsx
// Use reducer to batch updates
type FormState = {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
};

type FormAction =
  | { type: 'setValue'; field: string; value: any }
  | { type: 'setError'; field: string; error: string }
  | { type: 'setTouched'; field: string }
  | { type: 'reset' };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'setValue':
      return {
        ...state,
        values: { ...state.values, [action.field]: action.value },
      };
    case 'setError':
      return {
        ...state,
        errors: { ...state.errors, [action.field]: action.error },
      };
    // ... other cases
  }
}

function FormProvider({ children }) {
  const [state, dispatch] = useReducer(formReducer, initialState);

  // dispatch never changes
  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <FormContext.Provider value={value}>{children}</FormContext.Provider>;
}
```

## When Context is Not Enough

**Consider alternatives when:**

| Scenario | Alternative | Reason |
|----------|-------------|--------|
| State updates >10 times/second | Zustand | Fine-grained subscriptions |
| Need DevTools | Zustand/Redux | Built-in debugging |
| Managing server state | TanStack Query | Caching, invalidation, refetching |
| Complex middleware | Redux | Extensive middleware ecosystem |
| Large app, many contexts | Zustand | Simpler API, less boilerplate |

### Context vs Zustand Performance (2025 Benchmarks)

**Zustand's selective subscriptions prevent 40-70% more re-renders compared to Context API.**

```tsx
// Context: ALL consumers re-render when any value changes
const AppContext = createContext({ user, theme, notifications });
// If notifications updates, user-only components STILL re-render

// Zustand: Only subscribed slices trigger re-renders
const useStore = create((set) => ({
  user: null,
  theme: 'light',
  notifications: [],
}));

// Only re-renders when user changes
const user = useStore((state) => state.user);
```

**Recommendation:** Start with Context. Add TanStack Query for server data. Only reach for Zustand when you have a specific problem that Context doesn't solve (frequent updates, need for selective subscriptions, or DevTools).

## Performance Checklist

Before shipping Context:

**React 19+ with Compiler:**
- [ ] Using React 19+ with Compiler enabled (auto-memoization)
- [ ] Frequently-changing state is in separate context
- [ ] Actions are split from state (if applicable)
- [ ] Tested with React DevTools Profiler
- [ ] No unnecessary re-renders in production
- [ ] Considered alternatives (Zustand for complex cases)

**React 18 or without Compiler:**
- [ ] Context value is memoized with `useMemo`
- [ ] Callbacks in context are memoized with `useCallback`
- [ ] Frequently-changing state is in separate context
- [ ] Actions are split from state (if applicable)
- [ ] Tested with React DevTools Profiler
- [ ] No unnecessary re-renders in production
- [ ] Considered alternatives (Zustand for complex cases)

## Benchmarking Context Performance

```tsx
import { Profiler, ProfilerOnRenderCallback } from 'react';

const onRender: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) => {
  console.table({
    id,
    phase,
    'actualDuration (ms)': actualDuration.toFixed(2),
    'baseDuration (ms)': baseDuration.toFixed(2),
    'optimization %': (((baseDuration - actualDuration) / baseDuration) * 100).toFixed(2),
  });
};

<Profiler id="AppContext" onRender={onRender}>
  <YourProvider>
    <YourApp />
  </YourProvider>
</Profiler>
```

**Acceptable performance:**
- Mount: <50ms for simple context, <200ms for complex
- Update: <16ms (60fps), <8ms (120fps)

## Further Reading

- [React Docs: useMemo](https://react.dev/reference/react/useMemo)
- [React Docs: useCallback](https://react.dev/reference/react/useCallback)
- [React Docs: memo](https://react.dev/reference/react/memo)
- [Patterns](./patterns.md) - Advanced patterns
- [API Reference](./api-reference.md) - Complete API
