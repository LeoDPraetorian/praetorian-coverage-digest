# Advanced Performance Techniques

## Error Boundaries for Lazy Loading

Wrap `Suspense` with `ErrorBoundary` to handle network failures gracefully:

```typescript
import { lazy, Suspense, Component } from 'react';

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error">
          <p>Failed to load component. <button onClick={() => window.location.reload()}>Retry</button></p>
        </div>
      );
    }
    return this.props.children;
  }
}

// Usage with lazy loading
const LazyPage = lazy(() => import('./HeavyPage'));

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <LazyPage />
      </Suspense>
    </ErrorBoundary>
  );
}
```

**Why this matters**: Network failures during chunk loading would otherwise crash the app. Error boundaries provide graceful fallback.

**React 19 enhancement**: Can now use error boundaries with async components in Suspense.

## Loading Skeleton Design

Design skeletons that match content structure to prevent Cumulative Layout Shift (CLS):

### Principle: Match Final Layout

```typescript
// ❌ BAD: Generic loader causes layout shift
<Suspense fallback={<div>Loading...</div>}>
  <UserProfile />
</Suspense>

// ✅ GOOD: Skeleton matches final layout exactly
<Suspense fallback={<UserProfileSkeleton />}>
  <UserProfile />
</Suspense>

function UserProfileSkeleton() {
  return (
    <div className="h-[200px] w-full space-y-4">
      {/* Avatar placeholder */}
      <div className="h-12 w-12 rounded-full bg-gray-200 animate-pulse" />

      {/* Name placeholder */}
      <div className="h-6 w-32 bg-gray-200 animate-pulse" />

      {/* Email placeholder */}
      <div className="h-4 w-48 bg-gray-200 animate-pulse" />

      {/* Bio placeholder */}
      <div className="space-y-2">
        <div className="h-4 w-full bg-gray-200 animate-pulse" />
        <div className="h-4 w-5/6 bg-gray-200 animate-pulse" />
      </div>
    </div>
  );
}
```

### Design Rules

1. **Exact dimensions**: Skeleton should have same height/width as loaded content
2. **Preserve spacing**: Use same margins, padding, gaps
3. **Match structure**: Same number of elements in same positions
4. **Use subtle animation**: `animate-pulse` provides visual feedback

### Complex Layouts

For complex layouts, create skeleton components for each section:

```typescript
function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
      <ChartSkeleton className="col-span-2" />
      <TableSkeleton className="col-span-1" />
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="h-32 rounded-lg border p-4">
      <div className="h-4 w-20 bg-gray-200 animate-pulse" />
      <div className="mt-2 h-8 w-16 bg-gray-200 animate-pulse" />
    </div>
  );
}
```

## Context Optimization

React Context can cause performance issues when overused. Optimize with these patterns:

### 1. Limit Context Scope

Don't wrap entire app when only subset needs context:

```typescript
// ❌ BAD: Context wraps entire app
function App() {
  const [user, setUser] = useState(null);
  return (
    <UserContext.Provider value={user}>
      <Header />  {/* Doesn't need user */}
      <MainContent />  {/* Doesn't need user */}
      <UserDashboard />  {/* Needs user */}
    </UserContext.Provider>
  );
}

// ✅ GOOD: Context wraps only components that need it
function App() {
  const [user, setUser] = useState(null);
  return (
    <>
      <Header />
      <MainContent />
      <UserContext.Provider value={user}>
        <UserDashboard />  {/* Only this subtree re-renders */}
      </UserContext.Provider>
    </>
  );
}
```

### 2. Split Contexts by Update Frequency

Combine rarely-changing and frequently-changing values in same context causes unnecessary re-renders:

```typescript
// ❌ BAD: Everything updates when liveData changes
const AppContext = createContext({
  user, // Changes on login/logout
  theme, // Changes rarely
  notifications, // Changes every few minutes
  liveData, // Changes every second!
});

// ✅ GOOD: Split by update frequency
const UserContext = createContext(user); // Rarely
const ThemeContext = createContext(theme); // Rarely
const NotificationsContext = createContext(notifications); // Occasionally
const LiveDataContext = createContext(liveData); // Frequently
```

**Result**: Components only re-render when relevant context changes.

### 3. Avoid Rapidly Changing Values in Context

For high-frequency updates, use alternatives:

```typescript
// ❌ BAD: Mouse position causes re-render storm
const MouseContext = createContext({ x: 0, y: 0 });

function App() {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  return (
    <MouseContext.Provider value={pos}>
      <Child1 />  {/* Re-renders 60fps */}
      <Child2 />  {/* Re-renders 60fps */}
    </MouseContext.Provider>
  );
}

// ✅ GOOD: Use ref for high-frequency data
function App() {
  const mousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  // Components read mousePos.current when needed, no re-renders
}
```

### 4. Memoize Context Value

Prevent unnecessary re-renders from new object references:

```typescript
// ❌ BAD: New object every render
function Provider({ children }) {
  const [user, setUser] = useState(null);
  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

// ✅ GOOD: Memoized value
function Provider({ children }) {
  const [user, setUser] = useState(null);
  const value = useMemo(() => ({ user, setUser }), [user]);
  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}
```

**Note**: With React Compiler, this may be handled automatically. Profile first.

### 5. Use Context Selectors (Advanced)

For large context objects, use selectors to prevent unnecessary re-renders:

```typescript
// Using zustand or custom selector hook
function useUserName() {
  const user = useContext(UserContext);
  return user.name; // Component only re-renders when name changes
}

// Alternative: Split into smaller contexts (preferred)
```

## Bundle Analysis

### Vite Bundle Analyzer

Analyze Vite bundle with `rollup-plugin-visualizer`:

```bash
npm install --save-dev rollup-plugin-visualizer
```

```typescript
// vite.config.ts
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: "./dist/stats.html",
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
});
```

Run build to generate visualization:

```bash
npm run build
# Opens stats.html showing treemap of bundle
```

### Webpack Bundle Analyzer

For webpack-based projects:

```bash
npm install --save-dev webpack-bundle-analyzer
```

```javascript
// webpack.config.js
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: "static",
      openAnalyzer: true,
    }),
  ],
};
```

### What to Look For

**1. Large dependencies:**

Identify heavy libraries that could be:

- Code-split (loaded on-demand)
- Replaced with lighter alternatives
- Tree-shaken more aggressively

**2. Duplicate dependencies:**

Multiple versions of same library indicate tree-shaking failure:

```
lodash@4.17.21 (200KB)
lodash@4.17.20 (200KB)  ← Duplicate!
```

Fix by ensuring consistent versions in package.json.

**3. Unused code:**

Dead code still in bundle indicates:

- Missing sideEffects: false in package.json
- Barrel exports preventing tree-shaking
- Incorrect imports (import \* instead of named imports)

### Tree-Shaking Verification

Verify tree-shaking works correctly:

```typescript
// ❌ BAD: Imports entire library
import _ from "lodash";
const result = _.uniq(array);

// ✅ GOOD: Named import (tree-shakable)
import { uniq } from "lodash-es";
const result = uniq(array);

// ✅ BETTER: Direct path import
import uniq from "lodash-es/uniq";
const result = uniq(array);
```

**Check package.json:**

```json
{
  "sideEffects": false // Tells bundler all modules are pure
}
```

### Target Bundle Sizes (2025)

| App Type                | Initial Bundle | Route Chunks |
| ----------------------- | -------------- | ------------ |
| **Small app**           | < 100KB        | < 50KB       |
| **Medium app**          | < 250KB        | < 100KB      |
| **Large app (Chariot)** | < 500KB        | < 150KB      |

**Chariot-specific**: Aim for <400KB initial bundle with lazy-loaded sections.

## Related Resources

- [Vite Performance Guide](https://vitejs.dev/guide/performance.html)
- [Webpack Bundle Analysis](https://webpack.js.org/guides/bundle-analysis/)
- [Performance Optimization Main Guide](./performance.md)
