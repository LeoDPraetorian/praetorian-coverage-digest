# Code Splitting Integration

## Overview

Route prefetching works seamlessly with React.lazy() and Vite code splitting. This guide explains how they coordinate.

## How React.lazy() Works

```typescript
// Route definition with lazy loading
const Dashboard = React.lazy(() => import('./routes/Dashboard'));

// Router configuration
const routes = [
  {
    path: '/dashboard',
    element: <Suspense fallback={<Loading />}><Dashboard /></Suspense>,
  },
];
```

**What happens:**

1. User navigates to `/dashboard`
2. React Router triggers `import('./routes/Dashboard')`
3. Vite serves the bundle chunk `route-dashboard-abc123.js`
4. React suspends until chunk loads
5. Dashboard component renders

## How Prefetching Changes This

```typescript
// With prefetch='intent'
<Link to="/dashboard" prefetch="intent">Dashboard</Link>
```

**What happens:**

1. User hovers over link
2. React Router creates `<link rel='prefetch' href='/assets/route-dashboard-abc123.js'>`
3. Browser downloads chunk in background (lowest priority)
4. Chunk goes into browser cache
5. User clicks link → React Router loads from cache (instant)

## Vite Code Splitting Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor code (React, React Router, etc.)
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],

          // Large libraries
          'vendor-tanstack': ['@tanstack/react-query', '@tanstack/react-table'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
  },
});
```

**Output structure:**

```
dist/assets/
  vendor-react-a1b2c3.js        # React libraries
  vendor-tanstack-d4e5f6.js     # TanStack libraries
  vendor-ui-g7h8i9.js            # UI component libraries
  route-dashboard-j1k2l3.js     # Dashboard route code
  route-assets-m4n5o6.js         # Assets route code
```

## Coordination Between Prefetching and Splitting

### Route Splits

**Purpose:** Separate application code by route.

**Implementation:**

```typescript
const routes = [
  {
    path: '/dashboard',
    lazy: () => import('./routes/Dashboard'), // Creates route-dashboard-*.js
  },
  {
    path: '/vulnerabilities',
    lazy: () => import('./routes/Vulnerabilities'), // Creates route-vulnerabilities-*.js
  },
];
```

**Prefetch integration:**

```tsx
<Link to="/dashboard" prefetch="intent">
  {/* Prefetches route-dashboard-abc123.js */}
</Link>
```

**Result:** Route code prefetches automatically. Vendor chunks are already loaded (shared across routes).

### Vendor Splits

**Purpose:** Extract shared libraries to reduce route chunk sizes.

**manualChunks configuration:**

```typescript
manualChunks(id) {
  // React ecosystem
  if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
    return 'vendor-react';
  }

  // TanStack ecosystem
  if (id.includes('@tanstack')) {
    return 'vendor-tanstack';
  }

  // UI libraries
  if (id.includes('@radix-ui') || id.includes('class-variance-authority')) {
    return 'vendor-ui';
  }

  // Default: route chunks
}
```

**Result:**

- Small route chunks (only route-specific code)
- Large vendor chunks (loaded once, shared across routes)
- Prefetch downloads small route chunks only

### Dynamic Imports in Route Components

**Problem:** Route component imports large library:

```typescript
// Dashboard.tsx
import * as d3 from 'd3'; // 300KB library

export function Dashboard() {
  // Uses d3 for visualization
}
```

**Issue:** `route-dashboard-*.js` now includes d3 (300KB), making prefetch slow.

**Solution:** Dynamic import for large libraries:

```typescript
// Dashboard.tsx
export function Dashboard() {
  const [d3, setD3] = useState(null);

  useEffect(() => {
    import('d3').then(module => setD3(module));
  }, []);

  if (!d3) return <Loading />;

  // Uses d3 for visualization
}
```

**Result:** Route chunk stays small, d3 loads on-demand.

## Measuring Chunk Sizes

```bash
# Build the app
npm run build

# Analyze bundle
npx vite-bundle-visualizer
```

**Check for:**

- Route chunks: Should be <100KB each
- Vendor chunks: Can be larger (200-500KB)
- Shared dependencies: Should be extracted to vendor chunks

## Optimal Chunk Strategy

| Chunk Type | Target Size | Prefetch Strategy |
|------------|-------------|-------------------|
| Route chunks | <100KB | Prefetch with `prefetch='intent'` |
| Vendor chunks | 200-500KB | Loaded on initial page load |
| Large libraries | Split on-demand | Dynamic import when needed |

## Verification

### Check Chunk Sizes

```bash
npm run build

# Output shows chunk sizes:
# dist/assets/route-dashboard-abc123.js   42.5 kB │ gzip: 14.2 kB
# dist/assets/vendor-react-def456.js      145.8 kB │ gzip: 47.3 kB
```

**Target:** Route chunks <100KB uncompressed.

### Verify Prefetch Works

1. Open DevTools Network tab
2. Navigate to route with prefetch
3. Check for route chunk download with "Prefetch" initiator
4. Confirm vendor chunks are not re-downloaded (cached from initial load)

## Chariot Example

Chariot's code splitting strategy:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React ecosystem
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],

          // Data management
          'vendor-tanstack': ['@tanstack/react-query', '@tanstack/react-table'],

          // UI components
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
          ],

          // Graph visualization (large, split separately)
          'vendor-sigma': ['sigma', 'graphology'],

          // Form handling
          'vendor-forms': ['react-hook-form', 'zod'],
        },
      },
    },
  },
});
```

**Result:**

- Assets route: 45KB (just Assets page code)
- Vulnerabilities route: 38KB (just Vulnerabilities page code)
- Vendor chunks: Loaded once on initial page load
- Prefetch downloads only small route chunks

## Related

- [Vite Code Splitting Docs](https://vitejs.dev/guide/build.html#chunking-strategy)
- [React.lazy() Documentation](https://react.dev/reference/react/lazy)
