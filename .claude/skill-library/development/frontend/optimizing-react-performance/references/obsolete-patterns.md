# Obsolete vs Modern React Patterns

## Overview

This guide compares React 18 manual optimization patterns with modern React Compiler approaches. Understanding these differences helps when migrating codebases and avoiding unnecessary complexity in new code.

## Obsolete Pattern 1: Excessive Memoization

### ❌ OBSOLETE (React 18)

```typescript
const UserCard = React.memo(({ user, onUpdate }) => {
  const fullName = useMemo(
    () => `${user.firstName} ${user.lastName}`.toUpperCase(),
    [user.firstName, user.lastName]
  );
  const handleSave = useCallback(() => onUpdate(user.id, fullName), [user.id, fullName]);
  return <div onClick={handleSave}>{fullName}</div>;
});
```

**Problems:**

- Verbose boilerplate
- Easy to get dependency arrays wrong
- Maintenance burden
- Premature optimization

### ✅ MODERN (with React Compiler)

```typescript
function UserCard({ user, onUpdate }) {
  const fullName = `${user.firstName} ${user.lastName}`.toUpperCase();
  const handleSave = () => onUpdate(user.id, fullName);
  return <div onClick={handleSave}>{fullName}</div>;
}
```

**Benefits:**

- Clean, readable code
- React Compiler handles optimization
- No dependency arrays to maintain
- Compiler knows when to memoize

## Obsolete Pattern 2: Component Splitting for Memoization

### ❌ OBSOLETE

```typescript
// Splitting components just to wrap in React.memo
const Header = React.memo(() => <header>Chariot</header>);
const Sidebar = React.memo(() => <nav>Nav</nav>);

function App() {
  return (
    <>
      <Header />
      <Sidebar />
      <Content />
    </>
  );
}
```

### ✅ MODERN

```typescript
// Natural component structure
function Layout({ children }) {
  return (
    <>
      <header>Chariot</header>
      <nav>Nav</nav>
      <main>{children}</main>
    </>
  );
}
```

**Why:** React Compiler automatically memoizes components when beneficial. No need to split artificially.

## Common Mistakes When Adopting Compiler

### Mistake 1: Over-Using useMemo with Compiler Enabled

```typescript
// ❌ BAD: Unnecessary with compiler
function Component({ data }) {
  const formatted = useMemo(() => data.toUpperCase(), [data]);
  return <div>{formatted}</div>;
}

// ✅ GOOD: Let compiler decide
function Component({ data }) {
  const formatted = data.toUpperCase();
  return <div>{formatted}</div>;
}
```

**When useMemo IS still needed:**

- Truly expensive operations (>100ms)
- External library integrations requiring stable references
- Preventing infinite useEffect loops

### Mistake 2: Virtualizing Small Lists

```typescript
// ❌ BAD: Overhead not worth it
function SmallList({ items }) {
  // 50 items with virtualization = unnecessary complexity
  return <VirtualizedList items={items} />;
}

// ✅ GOOD: Simple rendering sufficient
function SmallList({ items }) {
  return (
    <div className="overflow-auto">
      {items.map(item => <Item key={item.id} {...item} />)}
    </div>
  );
}
```

**Virtualization threshold:** >1000 items

### Mistake 3: Not Using Concurrent Features

```typescript
// ❌ BAD: Blocking the UI
function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  function handleChange(e) {
    setQuery(e.target.value);
    setResults(expensiveSearch(e.target.value)); // Blocks UI!
  }

  return (
    <div>
      <input value={query} onChange={handleChange} />
      <Results data={results} />
    </div>
  );
}

// ✅ GOOD: Non-blocking with useTransition
function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  function handleChange(e) {
    setQuery(e.target.value); // Immediate
    startTransition(() => {
      setResults(expensiveSearch(e.target.value)); // Low priority
    });
  }

  return (
    <div>
      <input value={query} onChange={handleChange} />
      {isPending && <span>Searching...</span>}
      <Results data={results} />
    </div>
  );
}
```

**Key benefit:** User can continue typing without lag, even during expensive operations.

## Migration Strategy

### Phase 1: Enable React Compiler

```bash
npm install --save-dev babel-plugin-react-compiler
```

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler", { target: "19" }]],
      },
    }),
  ],
});
```

### Phase 2: Remove Unnecessary Memoization

**Don't rush:** Existing `useMemo`/`useCallback`/`React.memo` won't break anything. Remove gradually during refactoring.

**Remove when:**

- Component is simple presentational UI
- Calculation is cheap (<10ms)
- No external library dependencies

**Keep when:**

- Calculation >100ms
- External libraries require stable references
- Preventing useEffect infinite loops

### Phase 3: Add Concurrent Features

**Add `useTransition` for:**

- Search and filter operations
- Tab switching
- Data-heavy updates

**Add `useDeferredValue` for:**

- Third-party components you can't modify
- Props from parent you can't wrap in transition

## Performance Validation

After migration:

1. **Profile before/after** with React DevTools
2. **Measure actual improvement** in real scenarios
3. **Monitor bundle size** (compiler adds minimal overhead)
4. **Check Core Web Vitals** (FCP, LCP, CLS, FID)

## Related Resources

- [React Compiler Documentation](https://react.dev/learn/react-compiler)
- [Migration Guide](./migration-guide.md) (if available)
- [Performance Optimization](./performance.md)
