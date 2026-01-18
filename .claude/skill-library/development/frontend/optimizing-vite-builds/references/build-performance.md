# Build Performance Optimization

Strategies for reducing Vite build times and improving development server performance.

## Build Time Targets (2025)

| Metric               | Target  | Warning   | Critical |
| -------------------- | ------- | --------- | -------- |
| **Production build** | < 30s   | 30-60s    | > 60s    |
| **Dev server start** | < 5s    | 5-10s     | > 10s    |
| **HMR update**       | < 200ms | 200-500ms | > 500ms  |

---

## Dependency Pre-Bundling

Vite pre-bundles dependencies for faster dev server:

```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    // Pre-bundle frequently used deps
    include: ["react", "react-dom", "react-router-dom", "@tanstack/react-query"],
    // Don't pre-bundle large libs (lazy-load instead)
    exclude: ["react-simple-maps", "recharts", "d3"],
    // Force re-optimization on these changes
    esbuildOptions: {
      target: "es2020",
      supported: {
        "top-level-await": true,
      },
    },
  },
});
```

**When to include**:

- Deps causing slow HMR
- Deps with many imports
- CommonJS deps needing conversion

**When to exclude**:

- Large visualization libraries
- Rarely-used features
- Deps with native ESM

---

## Parallel Processing

Leverage multi-core CPUs:

```bash
# Use all CPU cores for build
NODE_OPTIONS='--max-old-space-size=8192' npm run build
```

**Note**: Vite parallelizes by default. Manual worker configuration usually not needed.

---

## Related

- [Category Chunking](category-chunking.md) - Optimize vendor splits
- [Verification](verification.md) - Measure build performance
