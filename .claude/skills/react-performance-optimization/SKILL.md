---
name: react-performance-optimization
description: Expert performance optimization patterns for React 19 applications in the Chariot security platform. Use when dealing with slow rendering, performance bottlenecks, large datasets, expensive calculations, or when optimizing React components. Covers React 19 Compiler features, automatic memoization, useTransition and useDeferredValue for concurrent rendering, virtualization with @tanstack/react-virtual, code splitting strategies, and modern performance patterns that replace obsolete React 18 techniques. Includes decision trees for when to apply each optimization technique.
license: MIT
allowed-tools: [Read, Write, Edit, Grep, Bash]
metadata:
  version: 1.0.0
  platform: chariot
  domains: frontend, react, performance, optimization
  react-version: 19.1.1
  last-updated: 2025-10-26
  author: Chariot Platform Team
  related-skills: [chariot-component-library, react-security-dashboards]
---

# React Performance Optimization (React 19)

**🚨 CRITICAL: React 19 Paradigm Shift**

React 19 fundamentally changes performance optimization. The **React Compiler** now handles automatic memoization, making most manual `useMemo`, `useCallback`, and `React.memo` usage **obsolete**.

**Old Way (React 18)**: Manual optimization with hooks
**New Way (React 19)**: Write clean code, compiler optimizes automatically

---

## When to Use This Skill

This skill activates when you're:
- Experiencing slow component rendering
- Working with large datasets (>1000 items)
- Implementing search or filtering with expensive operations
- Dealing with performance bottlenecks
- Optimizing existing React components
- Implementing code splitting or lazy loading
- Using virtualization for large lists

---

## React 19 Performance Philosophy

### Core Principle

**Write simple, clean React code. Let the React Compiler handle optimization.**

```typescript
// ❌ OBSOLETE (React 18) - Over-optimized
const Component = React.memo(({ data, onChange }) => {
  const processed = useMemo(() => expensiveOp(data), [data]);
  const handler = useCallback(() => onChange(processed), [onChange, processed]);

  return <div onClick={handler}>{processed}</div>;
});

// ✅ MODERN (React 19) - Clean and automatic
function Component({ data, onChange }) {
  const processed = expensiveOp(data);
  const handler = () => onChange(processed);

  return <div onClick={handler}>{processed}</div>;
}
```

**Why This Works**: The React Compiler analyzes your code at build time and automatically:
- Memoizes components
- Stabilizes callbacks
- Tracks dependencies correctly
- Prevents unnecessary re-renders

---

## Performance Decision Trees

### Decision Tree 1: Should I Optimize This Component?

```
Is the component rendering slowly (>50ms)?
├─ No → No optimization needed ✅
└─ Yes → Profile with React DevTools
    │
    ├─ Is React Compiler enabled?
    │  ├─ Yes → Check if issue is:
    │  │  ├─ Expensive calculation (>100ms)?
    │  │  │  └─ Use useMemo (see "When Manual Memoization IS Needed")
    │  │  ├─ Large list (>1000 items)?
    │  │  │  └─ Use virtualization (see "Virtualization Patterns")
    │  │  ├─ External library integration?
    │  │  │  └─ Use useMemo/useCallback for stable refs
    │  │  └─ Blocking user input?
    │  │     └─ Use useTransition (see "Concurrent Features")
    │  │
    │  └─ No → Enable React Compiler first (see "Enabling React Compiler")
    │         If can't enable, use React 18 patterns with caution
```

### Decision Tree 2: Should I Virtualize This List?

```
How many items in the list?
├─ < 100 items → No virtualization needed ✅
├─ 100-500 items → Consider pagination first
│  └─ Rendering still slow? → Profile before virtualizing
├─ 500-1000 items → Profile to measure impact
│  └─ >50ms render time? → Implement virtualization
└─ > 1000 items → Virtualize by default ✅
```

### Decision Tree 3: Which Concurrent Feature Should I Use?

```
What kind of update is this?
│
├─ Urgent (user input, animations)?
│  └─ Use regular state updates (high priority)
│
└─ Non-urgent (search results, filtering, data display)?
   │
   ├─ Can you modify the state update logic?
   │  └─ Yes → Use useTransition
   │     └─ Wrap expensive state updates in startTransition()
   │
   └─ Cannot modify child component?
      └─ Use useDeferredValue
         └─ Defer the prop value to the child
```

---

## Enabling React Compiler

### Step 1: Install Dependencies

```bash
cd modules/chariot/ui
npm install --save-dev babel-plugin-react-compiler
```

### Step 2: Configure Vite

```typescript
// modules/chariot/ui/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ['babel-plugin-react-compiler', {
            target: '19',
            // Optional: Enable only for specific directories during migration
            // sources: (filename) => filename.includes('src/sections/assets')
          }]
        ]
      }
    })
  ],
  // ... rest of config
});
```

### Step 3: Verify Compilation

```bash
# Build and check for compiler output
npm run build

# Look for compiler messages in build output:
# "✓ React Compiler: optimized 47 components"
```

---

## When Manual Memoization IS Needed

Even with React Compiler enabled, manual optimization is required for:

### 1. Truly Expensive Computations (>100ms)

```typescript
function DataAnalysisComponent({ rawData }: { rawData: number[] }) {
  // Complex statistical analysis taking >100ms
  const statistics = useMemo(() => {
    return {
      mean: calculateMean(rawData),
      median: calculateMedian(rawData),
      stdDev: calculateStandardDeviation(rawData),
      quartiles: calculateQuartiles(rawData),
      outliers: detectOutliers(rawData)
    };
  }, [rawData]);

  return <StatisticsChart data={statistics} />;
}
```

**Why**: Even the compiler can't make a 100ms+ operation faster. Memoization prevents recalculating on every render.

### 2. External Library Integrations

```typescript
import { MapContainer, TileLayer } from 'react-leaflet';

function SecurityMap({ assets }: { assets: Asset[] }) {
  // Leaflet requires stable object reference
  const mapCenter = useMemo(
    () => ({ lat: 37.7749, lng: -122.4194 }),
    [] // Only create once
  );

  // Leaflet needs stable array reference
  const markers = useMemo(
    () => assets.map(asset => ({
      position: [asset.lat, asset.lng],
      popup: asset.name
    })),
    [assets]
  );

  return (
    <MapContainer center={mapCenter}>
      <TileLayer />
      {markers.map((marker, idx) => (
        <Marker key={idx} position={marker.position} />
      ))}
    </MapContainer>
  );
}
```

**Why**: External libraries may use referential equality checks that the compiler can't optimize.

### 3. Preventing Infinite Loops in useEffect

```typescript
function WebSocketConnection({ config }: { config: WSConfig }) {
  // Stabilize config object to prevent useEffect re-running
  const stableConfig = useMemo(
    () => config,
    [config.url, config.apiKey, config.reconnectDelay]
  );

  useEffect(() => {
    const ws = new WebSocket(stableConfig.url, {
      headers: { 'X-API-Key': stableConfig.apiKey }
    });

    ws.onopen = () => console.log('Connected');
    ws.onerror = () => {
      setTimeout(() => {
        // Reconnect logic
      }, stableConfig.reconnectDelay);
    };

    return () => ws.close();
  }, [stableConfig]); // Stable dependency
}
```

**Why**: Prevents infinite loops from recreating objects on every render.

### 4. Compiler Not Enabled

```typescript
// If React Compiler is not enabled in your build,
// use traditional React 18 patterns:
const ExpensiveList = React.memo(function ExpensiveList({ items }) {
  const filtered = useMemo(
    () => items.filter(item => item.active),
    [items]
  );

  return <ul>{filtered.map(item => <li key={item.id}>{item.name}</li>)}</ul>;
});
```

---

## Virtualization Patterns

### When to Virtualize

| List Size | Recommendation |
|-----------|---------------|
| < 100 items | ❌ No virtualization |
| 100-500 items | ⚠️ Consider pagination first |
| 500-1000 items | ⚠️ Profile before virtualizing |
| > 1000 items | ✅ **Virtualize by default** |

### Basic Virtualization Pattern

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

interface Asset {
  key: string;
  name: string;
  status: string;
}

function VirtualizedAssetList({ assets }: { assets: Asset[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: assets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Estimated row height in pixels
    overscan: 10, // Render 10 extra items above/below viewport
  });

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto border border-subtle"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const asset = assets[virtualRow.index];

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="flex items-center px-4 border-b border-subtle"
            >
              <span className="font-medium">{asset.name}</span>
              <span className="ml-auto text-muted">{asset.status}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### Variable Height Virtualization

```typescript
function DynamicHeightAssetList({ assets }: { assets: Asset[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: assets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Initial estimate
    // Measure actual height after render
    measureElement: (element) => {
      return element?.getBoundingClientRect().height ?? 100;
    },
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const asset = assets[virtualRow.index];

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement} // Measure after render
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <AssetCard asset={asset} /> {/* Variable height content */}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## Concurrent Features

### useTransition - Non-Blocking Updates

**When to Use**:
- Search and filtering operations
- Tab switching with heavy content
- Pagination with large datasets
- Any state update that shouldn't block user input

**Pattern**:
```typescript
import { useState, useTransition } from 'react';

function AssetSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Asset[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleSearch(value: string) {
    // High priority: Update input immediately
    setQuery(value);

    // Low priority: Search can be interrupted
    startTransition(() => {
      const filtered = expensiveAssetSearch(value);
      setResults(filtered);
    });
  }

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={e => handleSearch(e.target.value)}
        placeholder="Search assets..."
        className="border border-subtle p-2 rounded"
      />
      {isPending && (
        <span className="text-muted text-sm ml-2">Searching...</span>
      )}
      <AssetResultsList results={results} />
    </div>
  );
}
```

**Key Points**:
- Input updates immediately (high priority)
- Search results update with low priority (can be interrupted)
- `isPending` is true while transition is in progress
- User can continue typing without lag

### useDeferredValue - Defer Expensive Re-renders

**When to Use**:
- Cannot modify child component logic
- Third-party components with expensive renders
- Want to defer prop updates

**Pattern**:
```typescript
import { useState, useDeferredValue } from 'react';

function FilteredRiskTable({ risks }: { risks: Risk[] }) {
  const [filter, setFilter] = useState('');
  const deferredFilter = useDeferredValue(filter);

  // Input updates immediately with high priority
  // Table re-renders with deferred value (low priority)

  return (
    <div>
      <input
        type="text"
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder="Filter risks..."
      />
      <ExpensiveRiskTable risks={risks} filter={deferredFilter} />
    </div>
  );
}

// Expensive component that we can't modify
function ExpensiveRiskTable({ risks, filter }: { risks: Risk[]; filter: string }) {
  const filtered = risks.filter(risk =>
    risk.title.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <table>
      <thead>
        <tr>
          <th>Title</th>
          <th>Severity</th>
        </tr>
      </thead>
      <tbody>
        {filtered.map(risk => (
          <tr key={risk.id}>
            <td>{risk.title}</td>
            <td>{risk.severity}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Combined Pattern: useTransition + useDeferredValue

```typescript
function AdvancedAssetSearch() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [isPending, startTransition] = useTransition();

  // Defer query for expensive filtering
  const deferredQuery = useDeferredValue(query);

  function handleCategoryChange(newCategory: string) {
    // Use transition for non-urgent category switch
    startTransition(() => {
      setCategory(newCategory);
    });
  }

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search..."
      />
      <CategoryTabs
        selected={category}
        onChange={handleCategoryChange}
      />
      {isPending && <LoadingIndicator />}
      <AssetResults
        query={deferredQuery}
        category={category}
      />
    </div>
  );
}
```

---

## Code Splitting & Lazy Loading

### Route-Based Code Splitting

```typescript
import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';

// Lazy load route components
const AssetsPage = lazy(() => import('./sections/assets/AssetsPage'));
const VulnerabilitiesPage = lazy(() => import('./sections/vulnerabilities/VulnerabilitiesPage'));
const SettingsPage = lazy(() => import('./sections/settings/SettingsPage'));

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        path: 'assets',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AssetsPage />
          </Suspense>
        ),
      },
      {
        path: 'vulnerabilities',
        element: (
          <Suspense fallback={<PageLoader />}>
            <VulnerabilitiesPage />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<PageLoader />}>
            <SettingsPage />
          </Suspense>
        ),
      },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
```

### Preloading Routes on Hover

```typescript
const DashboardPage = lazy(() => import('./DashboardPage'));

function NavigationLink({ to, children }: { to: string; children: React.ReactNode }) {
  const handleMouseEnter = () => {
    // Preload the route on hover
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

### Component-Level Lazy Loading

```typescript
import { lazy, Suspense } from 'react';

// Lazy load heavy visualization component
const SecurityGraphVisualization = lazy(() =>
  import('./SecurityGraphVisualization')
);

function AssetDetails({ asset }: { asset: Asset }) {
  const [showGraph, setShowGraph] = useState(false);

  return (
    <div>
      <AssetHeader asset={asset} />
      <AssetMetadata asset={asset} />

      <button onClick={() => setShowGraph(true)}>
        View Relationship Graph
      </button>

      {showGraph && (
        <Suspense fallback={<GraphSkeleton />}>
          <SecurityGraphVisualization assetId={asset.key} />
        </Suspense>
      )}
    </div>
  );
}
```

---

## Obsolete vs Modern Patterns

### ❌ Obsolete Pattern 1: Excessive Memoization

```typescript
// OBSOLETE (React 18) - Manual optimization everywhere
const UserCard = React.memo(({ user, onUpdate }) => {
  const fullName = useMemo(
    () => `${user.firstName} ${user.lastName}`.toUpperCase(),
    [user.firstName, user.lastName]
  );

  const handleSave = useCallback(() => {
    onUpdate(user.id, fullName);
  }, [user.id, fullName, onUpdate]);

  return (
    <div onClick={handleSave}>
      {fullName}
    </div>
  );
});
```

**✅ Modern (React 19)** - Clean and automatic:
```typescript
function UserCard({ user, onUpdate }) {
  const fullName = `${user.firstName} ${user.lastName}`.toUpperCase();

  const handleSave = () => {
    onUpdate(user.id, fullName);
  };

  return (
    <div onClick={handleSave}>
      {fullName}
    </div>
  );
}
```

### ❌ Obsolete Pattern 2: Component Splitting for Memoization

```typescript
// OBSOLETE - Splitting just for React.memo
const Header = React.memo(() => <header>Chariot Platform</header>);
const Sidebar = React.memo(() => <nav>Navigation</nav>);
const Footer = React.memo(() => <footer>© 2025</footer>);

function Layout({ children }) {
  return (
    <>
      <Header />
      <Sidebar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
```

**✅ Modern (React 19)** - Natural structure:
```typescript
function Layout({ children }) {
  return (
    <>
      <header>Chariot Platform</header>
      <nav>Navigation</nav>
      <main>{children}</main>
      <footer>© 2025</footer>
    </>
  );
}
```

### ❌ Obsolete Pattern 3: Manual Batching

```typescript
// OBSOLETE - Manual batching with unstable API
import { unstable_batchedUpdates } from 'react-dom';

function handleUpdate() {
  unstable_batchedUpdates(() => {
    setCount(c => c + 1);
    setName('New Name');
    setActive(true);
  });
}
```

**✅ Modern (React 19)** - Automatic batching:
```typescript
function handleUpdate() {
  setCount(c => c + 1);
  setName('New Name');
  setActive(true);
  // Automatically batched!
}
```

---

## Common Mistakes

### ❌ Mistake 1: Over-Using useMemo with Compiler Enabled

```typescript
// BAD: Compiler already handles this
function Component({ data }) {
  const formatted = useMemo(() => data.toUpperCase(), [data]);
  const doubled = useMemo(() => data.length * 2, [data]);

  return <div>{formatted} ({doubled})</div>;
}
```

**Fix**: Remove unnecessary memoization
```typescript
// GOOD: Let compiler optimize
function Component({ data }) {
  const formatted = data.toUpperCase();
  const doubled = data.length * 2;

  return <div>{formatted} ({doubled})</div>;
}
```

### ❌ Mistake 2: Virtualizing Small Lists

```typescript
// BAD: Virtualizing 50 items adds complexity without benefit
function SmallList({ items }) {
  // Only 50 items - no need to virtualize!
  return (
    <div className="h-[300px] overflow-auto">
      {items.map(item => <Item key={item.id} {...item} />)}
    </div>
  );
}
```

**Fix**: Use regular rendering for small lists
```typescript
// GOOD: Simple rendering for small datasets
function SmallList({ items }) {
  return (
    <div className="max-h-[300px] overflow-auto">
      {items.map(item => <Item key={item.id} {...item} />)}
    </div>
  );
}
```

### ❌ Mistake 3: Not Using Concurrent Features for Expensive Updates

```typescript
// BAD: Blocking search that freezes input
function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  function handleChange(e) {
    const value = e.target.value;
    setQuery(value);
    setResults(expensiveSearch(value)); // Blocks input!
  }

  return <input value={query} onChange={handleChange} />;
}
```

**Fix**: Use useTransition for non-urgent updates
```typescript
// GOOD: Non-blocking search with transitions
function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  function handleChange(e) {
    const value = e.target.value;
    setQuery(value); // Immediate

    startTransition(() => {
      setResults(expensiveSearch(value)); // Non-blocking
    });
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending && <Spinner />}
    </>
  );
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
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
) {
  if (actualDuration > 50) {
    console.warn(`Slow render detected in ${id}: ${actualDuration}ms`);
  }
}
```

### Performance Thresholds (2025 Standards)

| Metric | Target | Maximum |
|--------|--------|---------|
| **Time to Interactive (TTI)** | < 3s | < 5s |
| **First Contentful Paint (FCP)** | < 1s | < 2s |
| **Largest Contentful Paint (LCP)** | < 2.5s | < 4s |
| **Cumulative Layout Shift (CLS)** | < 0.1 | < 0.25 |
| **Total Blocking Time (TBT)** | < 200ms | < 600ms |
| **Component render time** | < 16ms | < 50ms |

### Profiling Commands

```bash
# Production build with profiling
npm run build -- --mode production

# Analyze bundle size
npm run build -- --analyze

# Lighthouse performance audit
npx lighthouse http://localhost:3000 --view
```

---

## Chariot-Specific Guidelines

### 1. Enable React Compiler (High Priority)

Add to `modules/chariot/ui/vite.config.ts`:
```typescript
plugins: [
  react({
    babel: {
      plugins: [['babel-plugin-react-compiler', { target: '19' }]]
    }
  })
]
```

### 2. Virtualize Large Data Tables

Keep virtualization for:
- Asset tables (>1000 assets)
- Risk tables (>1000 risks)
- Vulnerability lists (>1000 CVEs)
- Scan result displays

### 3. Code Split by Section

Implement lazy loading for:
- `/assets` section
- `/vulnerabilities` section
- `/settings` section
- Graph visualization components

### 4. Use Concurrent Features for Search

Apply `useTransition` to:
- Asset search
- Vulnerability filtering
- Risk score calculations
- Graph relationship queries

### 5. Profile Before Optimizing

Always measure with React DevTools Profiler before adding optimizations.

---

## Quick Reference

### ✅ Do This (React 19)

1. **Enable React Compiler** for automatic optimization
2. **Use useTransition** for non-urgent updates
3. **Use useDeferredValue** for expensive child re-renders
4. **Virtualize lists** with >1000 items
5. **Code split** by route and heavy features
6. **Profile before optimizing** - measure, don't guess
7. **Use Suspense** for loading states

### ❌ Don't Do This

1. **Don't use useMemo/useCallback** everywhere (compiler handles it)
2. **Don't wrap everything in React.memo** (compiler handles it)
3. **Don't split components** just for memoization
4. **Don't virtualize small lists** (<500 items)
5. **Don't use unstable_batchedUpdates** (automatic now)
6. **Don't optimize prematurely** - write clean code first

---

## Related Patterns

- **Component Library**: Use optimized chariot-ui-components
- **State Management**: Proper state location prevents re-renders
- **API Integration**: React Query handles caching automatically
- **Testing**: Profile E2E tests for performance regressions

## Related Skills

- **chariot-component-library**: Optimized component usage
- **react-security-dashboards**: Real-time data performance patterns
- **react-testing-patterns**: Performance testing strategies

## References

- **React Compiler**: https://react.dev/learn/react-compiler
- **useTransition**: https://react.dev/reference/react/useTransition
- **useDeferredValue**: https://react.dev/reference/react/useDeferredValue
- **TanStack Virtual**: https://tanstack.com/virtual/latest
- **Research Document**: `.claude/features/react-19-performance-optimization-patterns-and_20251026_100554/research/context7-search-specialist.md`

---

## Changelog

### Version 1.0.0 (2025-10-26)
- Initial release
- React 19 Compiler patterns
- Concurrent features (useTransition, useDeferredValue)
- Virtualization with @tanstack/react-virtual
- Code splitting strategies
- Obsolete vs modern pattern comparisons
- Chariot-specific performance guidelines
