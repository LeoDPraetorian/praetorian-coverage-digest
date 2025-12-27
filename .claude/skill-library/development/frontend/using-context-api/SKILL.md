---
name: using-context-api
description: Use when implementing React Context API for shared state management in React applications - includes React 19.2+ best practices with hooks, decision trees for when to use Context vs alternatives (Zustand/TanStack Query), performance optimization strategies to prevent re-renders, modern provider patterns with TypeScript, and complete implementation examples for auth, theme, and feature flags
allowed-tools: Read, Write, Edit, Grep, Glob, TodoWrite
---

# React Context API

**Modern React 19.2+ Context API patterns for shared state management.**

> **Last Updated:** December 2025 (verified against React 19.2.3)

## When to Use This Skill

Use this skill when:

- Implementing global or shared state in React applications
- Deciding between Context API vs Zustand vs TanStack Query
- Migrating from legacy Context patterns to React 19+ patterns
- Optimizing Context performance (preventing unnecessary re-renders)
- Need authoritative, version-specific guidance for React Context API

**Don't use Context API when:**
- State is only needed in 2-3 components (use props drilling or composition)
- State changes frequently and updates many components (use Zustand or state management library)
- Managing server state (use TanStack Query)
- Need time-travel debugging or complex middleware (use Redux)

**🚨 IMPORTANT: You MUST use TodoWrite before starting to track all workflow steps when implementing Context patterns.**

## Quick Reference

### Modern Context Pattern (React 19.2+)

```tsx
// 1. Create context with TypeScript
type ThemeContextType = {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 2. Provider component with state
// ✅ NEW React 19 syntax: Use <Context> directly instead of <Context.Provider>
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  // Memoize value to prevent unnecessary re-renders
  // Note: React Compiler (19+) can auto-memoize, but explicit is still valid
  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return (
    <ThemeContext value={value}>
      {children}
    </ThemeContext>
  );
}

// 3. Custom hook for consuming context
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

// 4. Usage in components
function ThemedButton() {
  const { theme, toggleTheme } = useTheme();
  return <button onClick={toggleTheme}>Current: {theme}</button>;
}
```

**React 19 Provider Syntax Change:**
```tsx
// ❌ LEGACY (React 18 and earlier) - will be deprecated
<ThemeContext.Provider value={value}>
  {children}
</ThemeContext.Provider>

// ✅ NEW (React 19+) - preferred syntax
<ThemeContext value={value}>
  {children}
</ThemeContext>
```

> A codemod will be provided for migrating from `Context.Provider` to the new syntax.

### Decision Tree: Which State Management?

```
Is the state server data (API responses)?
├─ YES → Use TanStack Query
└─ NO → Continue

Is the state only needed in 2-3 nearby components?
├─ YES → Use props or component composition
└─ NO → Continue

Does the state update frequently (>10 times/second)?
├─ YES → Use Zustand (40-70% fewer re-renders than Context)
└─ NO → Continue

Do you need middleware, time-travel, or DevTools?
├─ YES → Use Redux or Zustand
└─ NO → Context API is appropriate
```

**2025 Recommendation:** Start with Context. Add TanStack Query for server data. Only reach for Zustand when you have a specific problem that Context doesn't solve (frequent updates, need for selective subscriptions, or DevTools).

## Core Concepts

### 1. Context Creation

**Modern approach (React 19+):**

```tsx
import { createContext, useContext } from 'react';

type UserContextType = {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);
```

**Key points:**
- Always use TypeScript for type safety
- Set default value to `undefined` and check in custom hook
- Never use default objects/arrays (causes confusion about whether provider is mounted)

**See:** [references/api-reference.md](references/api-reference.md) for complete API documentation

### 2. Provider Pattern

**Split provider logic into separate component:**

```tsx
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback((newUser: User) => {
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, login, logout }),
    [user, login, logout]
  );

  // ✅ React 19+ syntax: Use <Context> directly
  return (
    <UserContext value={value}>
      {children}
    </UserContext>
  );
}
```

**Critical: Always memoize the context value** to prevent unnecessary re-renders.

> **React Compiler Note:** React 19's Compiler can auto-memoize pure components and values. However, explicit `useMemo`/`useCallback` is still valid and recommended for clarity in Context providers.

**See:** [references/patterns.md](references/patterns.md) for advanced provider patterns

### 3. Custom Hooks

**Always create custom hooks for consuming context:**

```tsx
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}
```

**Benefits:**
- Type safety (TypeScript narrows from `T | undefined` to `T`)
- Better error messages (runtime check for provider)
- Encapsulation (consumers don't need to know about Context internals)

### 4. Performance Optimization

**Split contexts by update frequency:**

```tsx
// ❌ BAD: Single context with mixed concerns
type AppContextType = {
  user: User;           // Changes rarely
  notifications: Notification[];  // Changes frequently
  theme: Theme;         // Changes rarely
};

// ✅ GOOD: Separate contexts by update frequency
const UserContext = createContext<User | undefined>(undefined);
const NotificationsContext = createContext<Notification[] | undefined>(undefined);
const ThemeContext = createContext<Theme | undefined>(undefined);
```

**See:** [references/performance.md](references/performance.md) for complete optimization strategies

## Common Patterns

### 1. Authentication Context

```tsx
type AuthContextType = {
  isAuthenticated: boolean;
  user: User | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => Promise<void>;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback(async (credentials: Credentials) => {
    const user = await authAPI.login(credentials);
    setUser(user);
  }, []);

  const logout = useCallback(async () => {
    await authAPI.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: user !== null,
      user,
      login,
      logout,
    }),
    [user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

**See:** [examples/auth-context.tsx](examples/auth-context.tsx) for complete implementation

### 2. Theme Context with Persistence

```tsx
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme');
    return (stored as Theme) || 'light';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
```

**See:** [examples/theme-context.tsx](examples/theme-context.tsx) for complete implementation

### 3. Feature Flags Context

```tsx
type FeatureFlagsContextType = {
  flags: Record<string, boolean>;
  isEnabled: (flag: string) => boolean;
};

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Fetch flags from API
    fetchFeatureFlags().then(setFlags);
  }, []);

  const isEnabled = useCallback(
    (flag: string) => flags[flag] ?? false,
    [flags]
  );

  const value = useMemo(() => ({ flags, isEnabled }), [flags, isEnabled]);

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}
```

**See:** [examples/feature-flags-context.tsx](examples/feature-flags-context.tsx) for complete implementation

## Migration from Legacy Patterns

### Deprecated: Consumer Component (Pre-React 16.8)

```tsx
// ❌ OLD: Consumer component pattern
<ThemeContext.Consumer>
  {value => <Button theme={value.theme} />}
</ThemeContext.Consumer>

// ✅ NEW: useContext hook
function Button() {
  const { theme } = useTheme();
  return <button className={theme}>Click me</button>;
}
```

### Deprecated: Class-Based Context

```tsx
// ❌ OLD: Class component with contextType
class Button extends React.Component {
  static contextType = ThemeContext;
  render() {
    const theme = this.context;
    return <button>{theme}</button>;
  }
}

// ✅ NEW: Functional component with hooks
function Button() {
  const { theme } = useTheme();
  return <button>{theme}</button>;
}
```

**See:** [references/migration.md](references/migration.md) for complete migration guide

## Anti-Patterns

### ❌ Don't Use Context for Everything

Context is not a replacement for all prop drilling:

```tsx
// ❌ BAD: Context for state only used in 2 components
function Parent() {
  return (
    <ModalProvider>
      <ModalTrigger />
      <ModalContent />
    </ModalProvider>
  );
}

// ✅ GOOD: Props for tightly coupled components
function Parent() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <ModalTrigger onClick={() => setIsOpen(true)} />
      <ModalContent isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
```

### ❌ Don't Create God Objects

```tsx
// ❌ BAD: Single massive context
type AppContextType = {
  user: User;
  theme: Theme;
  notifications: Notification[];
  settings: Settings;
  // ... 20 more properties
};

// ✅ GOOD: Multiple focused contexts
const UserContext = createContext<User | undefined>(undefined);
const ThemeContext = createContext<Theme | undefined>(undefined);
const NotificationsContext = createContext<Notification[] | undefined>(undefined);
```

### ❌ Don't Forget to Memoize

```tsx
// ❌ BAD: Creates new object on every render
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

## Testing Context

```tsx
import { render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';

// Test component that uses context
function TestComponent() {
  const { theme } = useTheme();
  return <div>Theme: {theme}</div>;
}

// Test with provider wrapper
test('provides theme value', () => {
  render(
    <ThemeProvider>
      <TestComponent />
    </ThemeProvider>
  );
  expect(screen.getByText(/Theme: light/i)).toBeInTheDocument();
});

// Test hook directly
import { renderHook } from '@testing-library/react';

test('useTheme returns theme value', () => {
  const wrapper = ({ children }) => (
    <ThemeProvider>{children}</ThemeProvider>
  );
  const { result } = renderHook(() => useTheme(), { wrapper });
  expect(result.current.theme).toBe('light');
});
```

**See:** [references/testing.md](references/testing.md) for comprehensive testing patterns

## Progressive Disclosure

**Core concepts covered above. For detailed documentation:**

- **[API Reference](references/api-reference.md)** - Complete Context API documentation
- **[Patterns](references/patterns.md)** - Advanced patterns (reducer context, async context, context composition)
- **[Performance](references/performance.md)** - Optimization strategies and re-render debugging
- **[Migration](references/migration.md)** - Migrating from class components and legacy patterns
- **[Testing](references/testing.md)** - Testing strategies for Context providers and consumers
- **[Examples](examples/)** - Real-world implementation examples

## React 19+ Features

### `use()` Hook (Stable in React 19.2+)

The `use()` hook is a **stable, production-ready** API that provides more flexibility than `useContext`:

```tsx
import { use } from 'react';

function ThemedButton({ show }) {
  // ✅ Can be called conditionally - unlike useContext!
  if (show) {
    const { theme } = use(ThemeContext);
    return <button className={theme}>Click me</button>;
  }
  return null;
}
```

**Key Differences from `useContext`:**

| Feature | `useContext` | `use` |
|---------|-------------|-------|
| Call location | Must be at component top level | Can be in conditionals/loops |
| Suspense integration | No | Yes, works with Suspense boundaries |
| Promise support | No | Yes, can consume Promises directly |

**When to use `use()` over `useContext`:**
- Need conditional context consumption (after early returns)
- Working with Suspense-based data fetching
- Need to read context in loops

```tsx
// ✅ Valid with use() - would error with useContext
function ConditionalTheme({ enabled }) {
  if (!enabled) return <DefaultComponent />;

  const theme = use(ThemeContext);  // Called after early return
  return <ThemedComponent theme={theme} />;
}
```

### `<Activity>` Component (React 19.2+)

For advanced use cases, the new `<Activity>` component allows hiding UI sections without unmounting state:

```tsx
// Content is hidden but state is preserved
<Activity mode="hidden">
  <ExpensiveComponent />
</Activity>
```

## Related Patterns

- **TanStack Query** - For server state management (API data)
- **Zustand** - For complex client state with frequent updates
- **Component Composition** - Alternative to prop drilling without Context

## Chariot Patterns

In the Chariot codebase, Context is used for:

- **Authentication**: `ui/src/contexts/AuthContext.tsx`
- **Theme**: `ui/src/contexts/ThemeContext.tsx`
- **Feature Flags**: `ui/src/contexts/FeatureFlagsContext.tsx`

**Follow existing patterns when adding new contexts.**

## Version Compatibility

This skill documents **React 19.2+** patterns (verified December 2025).

### React 19.x Timeline
- **React 19.0** (December 2024): Initial release with `use()` hook, `<Context>` as provider
- **React 19.1** (June 2025): Stability improvements, useId prefix change
- **React 19.2** (October 2025): `<Activity>` component, Suspense batching for SSR, useEffectEvent
- **React 19.2.3** (December 2025): Security patches - **upgrade immediately if using SSR**

### Compatibility Notes

| Feature | React 18 | React 19.0+ | React 19.2+ |
|---------|----------|-------------|-------------|
| `<Context>` syntax | ❌ Use `.Provider` | ✅ Direct syntax | ✅ Direct syntax |
| `use()` hook | ❌ Not available | ✅ Stable | ✅ Stable |
| React Compiler | ❌ Manual memoization | ✅ Auto-memoization | ✅ Auto-memoization |
| `<Activity>` | ❌ Not available | ❌ Not available | ✅ Available |

**For older React versions:**
- React 18: Use `<Context.Provider>` syntax, manual `useMemo`/`useCallback`
- React 17: Works, but lacks automatic batching benefits
- React 16.8+: Core hooks work, but performance characteristics differ

**Always prefer React 19.2+ patterns for new development.**
