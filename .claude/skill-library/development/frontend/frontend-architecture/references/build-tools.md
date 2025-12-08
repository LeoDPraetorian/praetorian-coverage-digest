# Build Tools

Vite 7 configuration, bundle optimization, and build workflows for React 19 applications.

## Vite 7 Configuration

### Basic Setup

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', {}]],
      },
    }),
  ],
  server: {
    port: 3000,
    https: true, // Development HTTPS
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@headlessui/react', '@heroicons/react'],
          'vendor-charts': ['recharts', '@nivo/line'],
          'vendor-utils': ['date-fns', 'axios', 'uuid'],
        },
      },
    },
  },
});
```

## Bundle Optimization

### Code Splitting

```typescript
// Route-based splitting
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

### Tree Shaking

```typescript
// ✅ Named imports (tree-shakeable)
import { Button } from '@/components';

// ❌ Default imports (not tree-shakeable)
import Components from '@/components';
```

## Build Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "analyze": "vite-bundle-visualizer"
  }
}
```

## Related References

- [Performance Optimization](performance.md) - Performance strategies
- [Module Systems](module-systems.md) - Code splitting patterns
