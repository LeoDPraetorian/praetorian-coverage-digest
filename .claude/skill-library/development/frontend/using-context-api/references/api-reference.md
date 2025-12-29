# React Context API Reference

**Complete API documentation for React 19.2+ Context API.**

> **Last Updated:** December 2025 (verified against React 19.2.3)

## createContext

```tsx
function createContext<T>(defaultValue: T): Context<T>;
```

Creates a Context object. Components can read the current context value by rendering Context.Provider above them.

**Parameters:**

- `defaultValue`: The value you want context to have when there is no matching Provider above the component reading context in the tree.

**Returns:** A Context object with Provider and Consumer properties.

**Modern usage:**

```tsx
type ThemeContextType = {
  theme: "light" | "dark";
  toggleTheme: () => void;
};

// Use undefined as default and handle in custom hook
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
```

**Why use undefined as default?**

- Forces you to create a custom hook with runtime check
- Makes it explicit when Provider is missing
- Prevents subtle bugs from using default values that aren't real

## Context as Provider (React 19+)

**React 19 introduces a simpler provider syntax:**

```tsx
// ✅ NEW (React 19+) - Preferred syntax
<MyContext value={contextValue}>
  {children}
</MyContext>

// ❌ LEGACY (React 18 and earlier) - Will be deprecated
<MyContext.Provider value={contextValue}>
  {children}
</MyContext.Provider>
```

Wraps your components to provide context value to all components inside.

**Props:**

- `value`: The context value to be provided. Can be any type.
- `children`: React nodes to render

**Key Points:**

- All consumers re-render when `value` changes (reference equality check)
- Always memoize `value` to prevent unnecessary re-renders
- Can nest providers to override values in subtrees
- `Context.Provider` will be deprecated in future versions (codemod will be provided)

**Example with memoization (React 19+ syntax):**

```tsx
function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Memoize value to prevent re-renders when ThemeProvider re-renders
  // Note: React Compiler can auto-memoize, but explicit is still valid
  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
```

## useContext

```tsx
function useContext<T>(context: Context<T>): T;
```

React Hook that reads and subscribes to a context.

**Parameters:**

- `context`: The context object created with `createContext`

**Returns:** The context value for the calling component

**Rules:**

- Must be called at the top level of component or custom hook
- Cannot be called conditionally
- Component re-renders when context value changes

**Example:**

```tsx
function ThemedButton() {
  const { theme, toggleTheme } = useContext(ThemeContext);

  return (
    <button onClick={toggleTheme} className={theme}>
      Toggle
    </button>
  );
}
```

## Custom Hook Pattern (Recommended)

Always wrap `useContext` in a custom hook for better DX:

```tsx
export function useTheme() {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
```

**Benefits:**

- Type narrowing (from `T | undefined` to `T`)
- Runtime check for missing provider
- Better error messages
- Encapsulation

## Context.Consumer (Deprecated)

```tsx
<MyContext.Consumer>
  {value => /* render based on context value */}
</MyContext.Consumer>
```

**Legacy pattern from pre-hooks era. Do not use in new code.**

Use `useContext` hook instead:

```tsx
// ❌ OLD
<ThemeContext.Consumer>
  {({ theme }) => <div className={theme}>Content</div>}
</ThemeContext.Consumer>;

// ✅ NEW
function Content() {
  const { theme } = useTheme();
  return <div className={theme}>Content</div>;
}
```

## React 19+ Features

### use() Hook (Stable in React 19.2+)

```tsx
import { use } from "react";

function ThemedButton() {
  const { theme } = use(ThemeContext);
  return <button className={theme}>Click me</button>;
}
```

**Key Differences from useContext:**

| Feature              | `useContext`                   | `use`                               |
| -------------------- | ------------------------------ | ----------------------------------- |
| Call location        | Must be at component top level | Can be in conditionals/loops        |
| Suspense integration | No                             | Yes, works with Suspense boundaries |
| Promise support      | No                             | Yes, can consume Promises directly  |

**Conditional Usage (unique to `use`):**

```tsx
function ConditionalTheme({ enabled }) {
  // ✅ Valid with use() - would error with useContext
  if (!enabled) return <DefaultComponent />;

  const theme = use(ThemeContext); // Called after early return!
  return <ThemedComponent theme={theme} />;
}
```

**When to use `use()` over `useContext`:**

- Need conditional context consumption (after early returns)
- Working with Suspense-based data fetching
- Need to read context in loops
- Prefer more flexible API

**Status:** ✅ **Stable and production-ready** in React 19.2+. Preferred over `useContext` for flexibility.

**Caveats:**

- Cannot be called in try-catch blocks (use Error Boundaries instead)
- Must be called in component body or custom hook (not in event handlers)

## TypeScript Patterns

### Context with TypeScript

```tsx
type UserContextType = {
  user: User | null;
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context; // Type is UserContextType, not UserContextType | undefined
}
```

### Generic Context

```tsx
type ListContextType<T> = {
  items: T[];
  addItem: (item: T) => void;
  removeItem: (id: string) => void;
};

function createListContext<T>() {
  return createContext<ListContextType<T> | undefined>(undefined);
}

const TodoContext = createListContext<Todo>();
const UserContext = createListContext<User>();
```

## API Comparison: Context vs Alternatives

| Feature        | Context API | Zustand   | TanStack Query | Redux  |
| -------------- | ----------- | --------- | -------------- | ------ |
| Learning curve | Low         | Low       | Medium         | High   |
| Boilerplate    | Medium      | Low       | Low            | High   |
| DevTools       | No          | Yes       | Yes            | Yes    |
| TypeScript     | Good        | Excellent | Excellent      | Good   |
| Async support  | Manual      | Good      | Excellent      | Medium |
| Middleware     | No          | Yes       | No             | Yes    |
| Time travel    | No          | Possible  | No             | Yes    |
| Server state   | No          | No        | Yes            | No     |

**Use Context when:**

- State is relatively static (theme, auth, feature flags)
- Small to medium applications
- Want to avoid external dependencies
- Don't need DevTools or middleware

**Use alternatives when:**

- Need DevTools (Zustand, Redux)
- Managing server state (TanStack Query)
- Complex state with middleware (Redux, Zustand)
- Frequent updates affecting many components (Zustand)

## Performance Characteristics

### Re-render Behavior

**Context triggers re-renders on all consumers when value changes:**

```tsx
// If any property changes, ALL consumers re-render
const value = { user, theme, notifications }; // 3 properties

<UserContext.Provider value={value}>
  <UserProfile /> {/* Re-renders when user, theme, OR notifications change */}
  <ThemeToggle /> {/* Re-renders when user, theme, OR notifications change */}
  <Notifications /> {/* Re-renders when user, theme, OR notifications change */}
</UserContext.Provider>;
```

**Solution: Split contexts by update frequency.**

### Comparison with Other Solutions

| Solution       | Re-render Granularity | Complexity |
| -------------- | --------------------- | ---------- |
| Context        | All consumers         | Low        |
| Zustand        | Selected properties   | Low        |
| Redux          | Connected components  | High       |
| TanStack Query | Query-specific        | Medium     |

## Common Gotchas

### 1. Forgetting to Memoize Value

```tsx
// ❌ Creates new object every render
function Provider({ children }) {
  const [state, setState] = useState(0);
  return <Context.Provider value={{ state, setState }}>{children}</Context.Provider>;
}

// ✅ Memoized value
function Provider({ children }) {
  const [state, setState] = useState(0);
  const value = useMemo(() => ({ state, setState }), [state]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
```

### 2. Using Default Value Incorrectly

```tsx
// ❌ Default value is never used if Provider exists
const ThemeContext = createContext({ theme: "light" });

// ✅ Use undefined and validate in hook
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("Missing ThemeProvider");
  return context;
}
```

### 3. Context Not Updating

```tsx
// ❌ Mutating state doesn't trigger re-render
const [state, setState] = useState({ count: 0 });
state.count++; // Mutation!

// ✅ Create new object
setState((prev) => ({ count: prev.count + 1 }));
```

## Further Reading

- [React Docs: useContext](https://react.dev/reference/react/useContext)
- [React Docs: createContext](https://react.dev/reference/react/createContext)
- [React Docs: use (experimental)](https://react.dev/reference/react/use)
- [Patterns](./patterns.md) - Advanced Context patterns
- [Performance](./performance.md) - Optimization strategies
