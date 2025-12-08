# Performance Optimization

React Compiler usage, lazy loading, memoization strategies, and performance best practices.

## React Compiler Optimization

React 19 includes automatic optimization via React Compiler. Most manual optimization is unnecessary.

### When React Compiler Handles It

```typescript
// ❌ Don't manually memoize - React Compiler does this
const MemoizedComponent = React.memo(MyComponent);

// ✅ Just write pure components
function MyComponent({ data }: Props) {
  return <div>{data.title}</div>;
}
```

### When You Still Need Manual Optimization

```typescript
// ✅ useMemo for expensive computations (>100ms)
function Dashboard({ data }: { data: number[] }) {
  const stats = useMemo(() => {
    return calculateExpensiveStatistics(data); // 200ms operation
  }, [data]);
  
  return <StatsDisplay stats={stats} />;
}

// ✅ Virtualization for large lists (>1000 items)
import { useVirtualizer } from '@tanstack/react-virtual';

function LargeList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });
  
  return (
    <div ref={parentRef} className="h-96 overflow-auto">
      {virtualizer.getVirtualItems().map((virtualRow) => (
        <div key={virtualRow.index}>
          <Item item={items[virtualRow.index]} />
        </div>
      ))}
    </div>
  );
}
```

## Code Splitting

### Route-based Splitting

```typescript
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

### Component-based Splitting

```typescript
const HeavyChart = lazy(() => import('./components/HeavyChart'));

function Dashboard() {
  const [showChart, setShowChart] = useState(false);
  
  return (
    <div>
      <button onClick={() => setShowChart(true)}>Show Chart</button>
      {showChart && (
        <Suspense fallback={<Skeleton />}>
          <HeavyChart data={data} />
        </Suspense>
      )}
    </div>
  );
}
```

## Image Optimization

```typescript
// Lazy load images
function LazyImage({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="object-cover"
    />
  );
}

// Responsive images
function ResponsiveImage({ src, alt }: { src: string; alt: string }) {
  return (
    <picture>
      <source srcSet={`${src}-320w.webp`} media="(max-width: 640px)" type="image/webp" />
      <source srcSet={`${src}-768w.webp`} media="(max-width: 768px)" type="image/webp" />
      <img src={`${src}.jpg`} alt={alt} />
    </picture>
  );
}
```

## Caching Strategies

### TanStack Query Caching

```typescript
// Aggressive caching for static data
const { data } = useQuery({
  queryKey: ['config'],
  queryFn: fetchConfig,
  gcTime: 30 * 60 * 1000,   // 30 minutes
  staleTime: 10 * 60 * 1000, // 10 minutes
});

// Fresh data for real-time updates
const { data } = useQuery({
  queryKey: ['notifications'],
  queryFn: fetchNotifications,
  gcTime: 1 * 60 * 1000,    // 1 minute
  staleTime: 0,              // Always stale
  refetchInterval: 30000,    // Refetch every 30s
});
```

## Bundle Optimization

### Tree Shaking

```typescript
// ✅ Named imports (tree-shakeable)
import { Button, Input } from '@/components';

// ❌ Namespace import (not tree-shakeable)
import * as Components from '@/components';
```

### Dynamic Imports

```typescript
// Load library only when needed
async function handleExport() {
  const XLSX = await import('xlsx');
  XLSX.utils.book_new();
}
```

## Related References

- [React 19 Patterns](react-19-patterns.md) - React Compiler details
- [Build Tools](build-tools.md) - Bundle optimization
- [Module Systems](module-systems.md) - Code splitting
