---
name: optimizing-react-performance
description: Use when optimizing React 19 applications - dealing with slow rendering, performance bottlenecks, large datasets, expensive calculations, or when implementing virtualization, code splitting, or concurrent features
allowed-tools: Read, Grep, Bash, TodoWrite
---

# React 19 Performance Optimization

> **You MUST use TodoWrite** to track optimization phases when applying multiple techniques from this skill.

**🚨 CRITICAL: React Compiler Paradigm Shift**

The **React Compiler** (released October 2025 as a separate tool) handles automatic memoization, making most manual `useMemo`, `useCallback`, and `React.memo` usage **obsolete**.

**Important**: React Compiler is NOT part of React 19 - it's a separate tool you must explicitly install (`babel-plugin-react-compiler`).

**Old Way (React 18)**: Manual optimization with hooks
**New Way (with React Compiler)**: Write clean code, compiler optimizes automatically

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
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          [
            "babel-plugin-react-compiler",
            {
              target: "19",
            },
          ],
        ],
      },
    }),
  ],
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
  const stableConfig = useMemo(() => config, [config.url, config.apiKey, config.reconnectDelay]);

  useEffect(() => {
    const ws = new WebSocket(stableConfig.url);
    return () => ws.close();
  }, [stableConfig]);
}
```

---

## Virtualization Patterns

Virtualization renders only visible list items, dramatically improving performance for large datasets (>1000 items). Use TanStack Virtual (`@tanstack/react-virtual`) for headless virtualization that gives you full control over markup and styling.

**When to virtualize:**
- Lists with >1000 items: Always virtualize
- 500-1000 items: Profile first
- <500 items: Usually not needed

**For complete virtualization guide, see [Virtualization Patterns](references/virtualization-patterns.md)**:
- Basic pattern with `useVirtualizer`
- Variable height items
- Horizontal and grid virtualization
- Scroll to item functionality
- Sticky headers
- Performance tips and common pitfalls

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

**React 19 enhancement**: `startTransition` now supports async functions, automatically handling pending states, errors, and optimistic updates:

```typescript
startTransition(async () => {
  const data = await fetchData();
  setResults(data);
});
// isPending is true during async operation
```

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

**Important caveats**:

1. If you want to prevent a child component from re-rendering during an urgent update, you must also memoize that component with `React.memo` or `useMemo`. `useDeferredValue` alone only defers the value, not the component re-render.

2. **React 19 enhancement**: `useDeferredValue` now accepts an `initialValue` option. When provided, it returns `initialValue` for the initial render, then schedules a re-render with the deferred value:

```typescript
const deferredValue = useDeferredValue(value, { initialValue: '' });
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

**For Error Boundaries and Loading Skeleton design, see [Advanced Techniques](references/advanced-techniques.md)**

---

## React Server Components (RSC)

React Server Components render on the server without sending JavaScript to the client, achieving 40-60% bundle size reduction in large apps. This is one of the most significant performance features in modern React.

**Key concepts:**
- **Server components** (default): Data fetching, non-interactive UI, zero client JS
- **Client components** (`"use client"`): Interactivity, hooks, event handlers
- **Hybrid strategy**: Keep heavy UI server-side, mark only interactive parts as client

**Streaming with Suspense**: Load page shell immediately, stream slow data progressively to avoid blocking.

**Critical warning**: Improper Suspense boundaries (too granular) can make performance worse by causing layout shifts.

**For complete RSC guide, see [React Server Components](references/react-server-components.md)**:
- Server vs Client component decision matrix
- `"use client"` and `"use server"` directives
- Streaming patterns with multiple Suspense boundaries
- Hybrid component strategies
- Common pitfalls and migration guide

---

## Context Optimization

React Context can cause performance issues when overused. Key optimizations:

- **Limit scope**: Wrap only components that need context, not entire app
- **Split by update frequency**: Separate rarely-changing from frequently-changing values
- **Avoid rapid updates**: Don't put high-frequency data (mouse position, scroll) in context
- **Memoize values**: Prevent new object references causing re-renders

**For complete patterns and examples, see [Advanced Techniques](references/advanced-techniques.md)**

---

## Obsolete vs Modern Patterns

With React Compiler, many manual optimization patterns are now obsolete. Write clean code and let the compiler handle memoization.

**Key changes:**
- Remove excessive `useMemo`/`useCallback` (compiler handles it)
- Stop wrapping everything in `React.memo`
- Don't split components just for memoization

**Common mistakes to avoid:**
- Over-using memoization hooks with compiler enabled
- Virtualizing small lists (<500 items)
- Not using `useTransition` for non-urgent updates

**For detailed before/after examples and migration strategy, see [Obsolete Patterns Guide](references/obsolete-patterns.md)**

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

| Metric                       | Target  | Notes                            |
| ---------------------------- | ------- | -------------------------------- |
| **First Contentful Paint**   | < 1.8s  | Updated 2025 standard            |
| **Largest Contentful Paint** | < 2.5s  | Core Web Vital                   |
| **Cumulative Layout Shift**  | < 0.1   | Core Web Vital (lower is better) |
| **First Input Delay**        | < 100ms | Interaction responsiveness       |
| **Component render**         | < 16ms  | 60 FPS target                    |

### Bundle Analysis

Use bundle analyzers to identify optimization opportunities:
- **Vite**: `rollup-plugin-visualizer` - Visual treemap of bundle
- **Webpack**: `webpack-bundle-analyzer` - Interactive bundle visualization

Look for large dependencies, duplicates, and unused code.

**For setup and tree-shaking verification, see [Advanced Techniques](references/advanced-techniques.md)**

### Advanced Profiling

Production-ready performance analysis requires advanced techniques beyond basic DevTools. Key topics:

- **actualDuration vs baseDuration**: Verify memoization effectiveness (actualDuration should be <20% of baseDuration)
- **React Performance Tracks**: DevTools Scheduler track shows Blocking, Transition, Suspense, Idle priorities
- **Production profiling**: Use react-dom/profiling build (dev builds are 2-5× slower)
- **Real User Monitoring**: Sentry/LogRocket catch regressions before users complain
- **Lighthouse targets**: 90+ Performance, 100 Accessibility, 90+ Best Practices

**For complete guide, see [Advanced Profiling](references/advanced-profiling.md)** - Profiler API, React Performance Tracks, production builds, monitoring strategies, Lighthouse CI integration

---

## Chariot-Specific Guidelines

1. **Enable React Compiler** in `modules/chariot/ui/vite.config.ts` (HIGH PRIORITY)
2. **Virtualize large tables**: Assets, Risks, Vulnerabilities (>1000 items)
3. **Code split by section**: Lazy load `/assets`, `/vulnerabilities`, `/settings`, graph components
4. **Use useTransition**: Asset search, vulnerability filtering, risk calculations
5. **Profile before optimizing**: Measure with React DevTools Profiler

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

**React 19 Trilogy** (these skills work together):
- **using-modern-react-patterns**: React 19 migration guide, new features (Actions, useOptimistic), "You Might Not Need an Effect" patterns. Use when upgrading React or learning modern patterns.
- **enforcing-react-19-conventions**: PR review checklist with BLOCK/REQUEST CHANGE/VERIFY workflow. Use during code reviews to enforce Chariot conventions.

**Other Related Skills:**
- **chariot-component-library**: Optimized component usage
- **react-security-dashboards**: Real-time data performance
- **react-testing-patterns**: Performance testing
