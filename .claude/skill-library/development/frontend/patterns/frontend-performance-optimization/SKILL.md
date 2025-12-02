---
name: frontend-performance-optimization
description: Use when optimizing React 19 applications - dealing with slow rendering, performance bottlenecks, large datasets, expensive calculations, or when implementing virtualization, code splitting, or concurrent features
allowed-tools: Read, Grep, Bash, TodoWrite
---

# React 19 Performance Optimization

**🚨 CRITICAL: React 19 Paradigm Shift**

React 19 fundamentally changes performance optimization. The **React Compiler** handles automatic memoization, making most manual `useMemo`, `useCallback`, and `React.memo` usage **obsolete**.

**Old Way (React 18)**: Manual optimization with hooks
**New Way (React 19)**: Write clean code, compiler optimizes automatically

---

## Core Principle

**Write simple, clean React code. Let the React Compiler handle optimization.**

```typescript
// ❌ OBSOLETE (React 18)
const Component = React.memo(({ data, onChange }) => {
  const processed = useMemo(() => expensiveOp(data), [data]);
  const handler = useCallback(() => onChange(processed), [onChange, processed]);
  return <div onClick={handler}>{processed}</div>;
});

// ✅ MODERN (React 19)
function Component({ data, onChange }) {
  const processed = expensiveOp(data);
  const handler = () => onChange(processed);
  return <div onClick={handler}>{processed}</div>;
}
```

**Why This Works**: React Compiler analyzes code at build time and automatically memoizes components, stabilizes callbacks, and prevents unnecessary re-renders.

---

## Performance Decision Trees

### Should I Optimize This Component?

```
Is rendering slow (>50ms)?
├─ No → No optimization needed ✅
└─ Yes → Profile with React DevTools
    │
    ├─ Is React Compiler enabled?
    │  ├─ Yes → Check if issue is:
    │  │  ├─ Expensive calculation (>100ms)? → Use useMemo
    │  │  ├─ Large list (>1000 items)? → Use virtualization
    │  │  ├─ External library? → Use useMemo for stable refs
    │  │  └─ Blocking user input? → Use useTransition
    │  └─ No → Enable React Compiler first
```

### Should I Virtualize This List?

```
How many items?
├─ < 100 → No virtualization ✅
├─ 100-500 → Consider pagination first
├─ 500-1000 → Profile before virtualizing
└─ > 1000 → Virtualize by default ✅
```

### Which Concurrent Feature?

```
What kind of update?
├─ Urgent (user input) → Regular state updates (high priority)
└─ Non-urgent (search, filtering) →
   ├─ Can modify state logic? → Use useTransition
   └─ Cannot modify child? → Use useDeferredValue
```

---

## Enabling React Compiler

### Install and Configure

```bash
cd modules/chariot/ui
npm install --save-dev babel-plugin-react-compiler
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ['babel-plugin-react-compiler', {
            target: '19'
          }]
        ]
      }
    })
  ]
});
```

### Verify Compilation

```bash
npm run build
# Look for: "✓ React Compiler: optimized 47 components"
```

---

## When Manual Memoization IS Needed

### 1. Truly Expensive Computations (>100ms)

```typescript
function DataAnalysisComponent({ rawData }: { rawData: number[] }) {
  const statistics = useMemo(() => {
    return {
      mean: calculateMean(rawData),
      median: calculateMedian(rawData),
      stdDev: calculateStandardDeviation(rawData),
      quartiles: calculateQuartiles(rawData)
    };
  }, [rawData]);

  return <StatisticsChart data={statistics} />;
}
```

**Why**: Compiler can't make 100ms+ operations faster. Memoization prevents recalculation.

### 2. External Library Integrations

```typescript
function SecurityMap({ assets }: { assets: Asset[] }) {
  // Leaflet requires stable object reference
  const mapCenter = useMemo(
    () => ({ lat: 37.7749, lng: -122.4194 }),
    []
  );

  const markers = useMemo(
    () => assets.map(asset => ({
      position: [asset.lat, asset.lng],
      popup: asset.name
    })),
    [assets]
  );

  return <MapContainer center={mapCenter}>{/* ... */}</MapContainer>;
}
```

**Why**: External libraries may use referential equality checks compiler can't optimize.

### 3. Preventing Infinite useEffect Loops

```typescript
function WebSocketConnection({ config }: { config: WSConfig }) {
  const stableConfig = useMemo(
    () => config,
    [config.url, config.apiKey, config.reconnectDelay]
  );

  useEffect(() => {
    const ws = new WebSocket(stableConfig.url);
    return () => ws.close();
  }, [stableConfig]);
}
```

---

## Virtualization Patterns

### When to Virtualize

| List Size | Recommendation |
|-----------|---------------|
| < 100 | ❌ No virtualization |
| 100-500 | ⚠️ Consider pagination |
| 500-1000 | ⚠️ Profile first |
| > 1000 | ✅ **Virtualize** |

### Basic Pattern

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

function VirtualizedAssetList({ assets }: { assets: Asset[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: assets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Row height in pixels
    overscan: 10, // Extra items above/below viewport
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{
        height: `${virtualizer.getTotalSize()}px`,
        position: 'relative'
      }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            {assets[virtualRow.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Concurrent Features

### useTransition - Non-Blocking Updates

**When**: Search, filtering, tab switching, pagination

```typescript
import { useState, useTransition } from 'react';

function AssetSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Asset[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleSearch(value: string) {
    setQuery(value); // High priority: immediate

    startTransition(() => {
      const filtered = expensiveAssetSearch(value);
      setResults(filtered); // Low priority: interruptible
    });
  }

  return (
    <div>
      <input
        value={query}
        onChange={e => handleSearch(e.target.value)}
        placeholder="Search assets..."
      />
      {isPending && <span>Searching...</span>}
      <AssetResultsList results={results} />
    </div>
  );
}
```

**Key Points**:
- Input updates immediately (high priority)
- Search results update with low priority
- User can continue typing without lag

### useDeferredValue - Defer Expensive Re-renders

**When**: Cannot modify child component, third-party components

```typescript
import { useState, useDeferredValue } from 'react';

function FilteredRiskTable({ risks }: { risks: Risk[] }) {
  const [filter, setFilter] = useState('');
  const deferredFilter = useDeferredValue(filter);

  return (
    <div>
      <input
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder="Filter risks..."
      />
      <ExpensiveRiskTable risks={risks} filter={deferredFilter} />
    </div>
  );
}
```

---

## Code Splitting & Lazy Loading

### Route-Based Splitting

```typescript
import { lazy, Suspense } from 'react';

const AssetsPage = lazy(() => import('./sections/assets/AssetsPage'));
const VulnerabilitiesPage = lazy(() => import('./sections/vulnerabilities/VulnerabilitiesPage'));

const router = createBrowserRouter([
  {
    path: 'assets',
    element: (
      <Suspense fallback={<PageLoader />}>
        <AssetsPage />
      </Suspense>
    )
  }
]);
```

### Preload on Hover

```typescript
const DashboardPage = lazy(() => import('./DashboardPage'));

function NavigationLink({ to, children }) {
  const handleMouseEnter = () => {
    if (to === '/dashboard') {
      import('./DashboardPage');
    }
  };

  return (
    <Link to={to} onMouseEnter={handleMouseEnter}>
      {children}
    </Link>
  );
}
```

---

## Obsolete vs Modern Patterns

### ❌ Obsolete: Excessive Memoization

```typescript
// OBSOLETE (React 18)
const UserCard = React.memo(({ user, onUpdate }) => {
  const fullName = useMemo(
    () => `${user.firstName} ${user.lastName}`.toUpperCase(),
    [user.firstName, user.lastName]
  );
  const handleSave = useCallback(() => onUpdate(user.id, fullName), [user.id, fullName]);
  return <div onClick={handleSave}>{fullName}</div>;
});
```

```typescript
// ✅ MODERN (React 19)
function UserCard({ user, onUpdate }) {
  const fullName = `${user.firstName} ${user.lastName}`.toUpperCase();
  const handleSave = () => onUpdate(user.id, fullName);
  return <div onClick={handleSave}>{fullName}</div>;
}
```

### ❌ Obsolete: Component Splitting for Memoization

```typescript
// OBSOLETE - Splitting for React.memo
const Header = React.memo(() => <header>Chariot</header>);
const Sidebar = React.memo(() => <nav>Nav</nav>);
```

```typescript
// ✅ MODERN - Natural structure
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

---

## Common Mistakes

### ❌ Mistake 1: Over-Using useMemo with Compiler

```typescript
// BAD: Compiler handles this
function Component({ data }) {
  const formatted = useMemo(() => data.toUpperCase(), [data]);
  return <div>{formatted}</div>;
}

// GOOD: Let compiler optimize
function Component({ data }) {
  const formatted = data.toUpperCase();
  return <div>{formatted}</div>;
}
```

### ❌ Mistake 2: Virtualizing Small Lists

```typescript
// BAD: 50 items don't need virtualization
<div>{items.map(item => <Item {...item} />)}</div>

// GOOD: Simple rendering for small lists
<div className="overflow-auto">{items.map(item => <Item {...item} />)}</div>
```

### ❌ Mistake 3: Not Using Concurrent Features

```typescript
// BAD: Blocking search
function Search() {
  const [query, setQuery] = useState('');
  function handleChange(e) {
    setQuery(e.target.value);
    setResults(expensiveSearch(e.target.value)); // Blocks!
  }
}

// GOOD: Non-blocking with useTransition
function Search() {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleChange(e) {
    setQuery(e.target.value);
    startTransition(() => setResults(expensiveSearch(e.target.value)));
  }
}
```

---

## Performance Measurement

### React DevTools Profiler

```typescript
import { Profiler } from 'react';

function App() {
  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <MainContent />
    </Profiler>
  );
}

function onRenderCallback(
  id: string,
  phase: "mount" | "update",
  actualDuration: number
) {
  if (actualDuration > 50) {
    console.warn(`Slow render in ${id}: ${actualDuration}ms`);
  }
}
```

### Performance Thresholds (2025)

| Metric | Target | Maximum |
|--------|--------|---------|
| **Time to Interactive** | < 3s | < 5s |
| **First Contentful Paint** | < 1s | < 2s |
| **Largest Contentful Paint** | < 2.5s | < 4s |
| **Component render** | < 16ms | < 50ms |

---

## Chariot-Specific Guidelines

### 1. Enable React Compiler

Add to `modules/chariot/ui/vite.config.ts` (HIGH PRIORITY)

### 2. Virtualize Large Tables

- Asset tables (>1000 assets)
- Risk tables (>1000 risks)
- Vulnerability lists (>1000 CVEs)

### 3. Code Split by Section

Lazy load:
- `/assets` section
- `/vulnerabilities` section
- `/settings` section
- Graph visualization components

### 4. Use Concurrent Features for Search

Apply `useTransition` to:
- Asset search
- Vulnerability filtering
- Risk score calculations

### 5. Profile Before Optimizing

Always measure with React DevTools Profiler.

---

## Quick Reference

### ✅ Do This (React 19)

1. **Enable React Compiler** for automatic optimization
2. **Use useTransition** for non-urgent updates
3. **Use useDeferredValue** for expensive child re-renders
4. **Virtualize lists** with >1000 items
5. **Code split** by route and heavy features
6. **Profile before optimizing**
7. **Use Suspense** for loading states

### ❌ Don't Do This

1. **Don't use useMemo/useCallback** everywhere (compiler handles it)
2. **Don't wrap everything in React.memo**
3. **Don't split components** just for memoization
4. **Don't virtualize small lists** (<500 items)
5. **Don't use unstable_batchedUpdates** (automatic now)
6. **Don't optimize prematurely**

---

## Related Resources

### Official Documentation

- **React Compiler**: https://react.dev/learn/react-compiler
- **useTransition**: https://react.dev/reference/react/useTransition
- **useDeferredValue**: https://react.dev/reference/react/useDeferredValue
- **TanStack Virtual**: https://tanstack.com/virtual/latest

### Related Skills

- **chariot-component-library**: Optimized component usage
- **react-security-dashboards**: Real-time data performance
- **react-testing-patterns**: Performance testing
