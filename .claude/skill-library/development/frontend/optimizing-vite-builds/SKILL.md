---
name: optimizing-vite-builds
description: Use when optimizing Vite build configurations - dealing with large bundles, slow builds, vendor chunk bloat, or configuring manualChunks for code splitting
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite
---

# Optimizing Vite Builds

**Build optimization patterns for Vite-powered React applications to minimize bundle sizes and improve load performance.**

## When to Use

Use this skill when:

- Vite bundles exceed 500 KB initial load
- vendor chunks are bloated (>1 MB)
- Configuring `manualChunks` for code splitting
- Build times are slow (>30 seconds)
- Tree-shaking isn't working as expected
- Bundle analysis shows unexpected package inclusions

**You MUST use TodoWrite** when implementing multiple optimization techniques.

## Core Principle

**Category-based vendor chunking with exact path matching prevents bundle bloat.**

The most common mistake in Vite configuration is substring matching in `manualChunks` that captures unintended packages.

```typescript
// ❌ WRONG: Substring matching
if (id.includes("react")) return "vendor-react";
// Matches: react, react-dom, react-hook-form, react-simple-maps, etc.

// ✅ RIGHT: Exact path matching
if (id.includes("/react/") || id.includes("/react-dom/")) return "vendor-react";
// Matches: Only core React packages
```

---

## Quick Decision Tree

### Should I Optimize This Bundle?

```
Initial bundle size?
├─ < 500 KB → No optimization needed ✅
├─ 500 KB - 1 MB → Profile first
└─ > 1 MB → Optimize with manualChunks ⚠️
    │
    ├─ vendor-react > 500 KB? → Fix substring matching
    ├─ Multiple heavy libs? → Category-based splitting
    └─ Build time > 30s? → Check dependency pre-bundling
```

### Which Optimization Strategy?

```
What's the problem?
├─ Large vendor chunks → manualChunks with exact matching
├─ Slow initial load → Route-level code splitting
├─ Redundant code → Tree-shaking + barrel file removal
└─ Slow builds → Dependency pre-bundling optimization
```

---

## ManualChunks Configuration

### Pattern: Exact Path Matching

The gold standard for preventing false matches:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // React core ONLY - use path separators for exact matching
            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("/react-router/") ||
              id.includes("/scheduler/") ||
              id.includes("/react-is/")
            ) {
              return "vendor-react";
            }

            // Other vendor code
            return "vendor";
          }
        },
      },
    },
  },
});
```

**Why this works**: `/react/` matches only the core `react` package directory, not `react-hook-form` or `react-simple-maps`.

**For complete category-based chunking strategy, see:** [references/category-chunking.md](references/category-chunking.md)

### Pattern: Category-Based Splitting

Group dependencies by usage pattern for optimal caching:

| Category     | Purpose                         | Examples                  | Typical Size  |
| ------------ | ------------------------------- | ------------------------- | ------------- |
| vendor-react | Core framework (always loaded)  | react, react-dom          | 150-200 KB    |
| vendor-ui    | UI component libraries          | radix, lucide, headlessui | 100-150 KB    |
| vendor-viz   | Data visualization (lazy load)  | recharts, d3, cytoscape   | 500 KB - 1 MB |
| vendor-forms | Form libraries (route-specific) | react-hook-form           | 50-100 KB     |
| vendor-utils | Utility libraries               | lodash-es, date-fns       | 50-100 KB     |

**For complete configuration examples, see:** [references/category-chunking.md](references/category-chunking.md)

---

## Common Anti-Patterns

### Anti-Pattern 1: Substring Matching

```typescript
// ❌ WRONG: Captures 12+ unintended packages
if (id.includes("react")) return "vendor-react";

// vendor-react bloats from 200 KB → 10+ MB
// Captures: react-hook-form, react-day-picker, react-simple-maps,
//           react-dropzone, react-error-boundary, etc.
```

**Fix**: Use exact path matching with `/react/` pattern (shown above).

**For more anti-patterns and fixes, see:** [references/anti-patterns.md](references/anti-patterns.md)

### Anti-Pattern 2: Manual Dependency Lists

```typescript
// ❌ WRONG: Requires maintenance for every new package
manualChunks: {
  'vendor-forms': ['react-hook-form', '@hookform/resolvers'],
  'vendor-ui': ['react-day-picker', 'date-fns']
}
```

**Problems**:

- Brittle (breaks when adding packages)
- Verbose (doesn't scale)
- Error-prone (easy to forget packages)

**Fix**: Use function-based chunking with pattern matching (shown in core example).

### Anti-Pattern 3: Over-Splitting

```typescript
// ❌ WRONG: Too many small chunks
if (id.includes("lodash-es/debounce")) return "vendor-debounce";
if (id.includes("lodash-es/throttle")) return "vendor-throttle";
// Creates dozens of tiny chunks (< 10 KB each)
```

**Problem**: HTTP overhead exceeds bundle savings. Browsers handle 5-10 chunks efficiently, not 50.

**Fix**: Group related utilities into single chunks (vendor-utils).

**For chunk size guidelines, see:** [references/chunk-sizing.md](references/chunk-sizing.md)

---

## Bundle Analysis

### Visualize Bundle Composition

```typescript
// vite.config.ts
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      template: "treemap", // or 'sunburst', 'network'
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: "stats.html",
    }),
  ],
});
```

**After build**: Opens interactive treemap showing package sizes.

### Verify Chunk Sizes

```bash
npm run build
ls -lh dist/assets/*.js | sort -k5 -hr
```

**Target sizes**:

- Initial bundle: < 500 KB
- Route chunks: < 150 KB each
- Vendor chunks: 50 KB - 500 KB (varies by category)

**For complete verification workflow, see:** [references/verification.md](references/verification.md)

---

## Build Performance

### Dependency Pre-Bundling

Vite pre-bundles dependencies for faster dev server startup:

```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    include: [
      // Pre-bundle frequently used deps
      "react",
      "react-dom",
      "react-router-dom",
    ],
    exclude: [
      // Don't pre-bundle large libs (lazy-load instead)
      "react-simple-maps",
      "recharts",
    ],
  },
});
```

**When to use**:

- `include`: Deps causing slow HMR or frequent re-optimizations
- `exclude`: Large deps better lazy-loaded

**For complete build performance guide, see:** [references/build-performance.md](references/build-performance.md)

---

## Integration with Code Splitting

ManualChunks works best with route-level code splitting:

```typescript
// Route-level lazy loading
const AssetsPage = lazy(() => import("./sections/assets"));
const VulnerabilitiesPage = lazy(() => import("./sections/vulnerabilities"));

// Vite automatically splits these into separate chunks
// manualChunks then optimizes vendor code within each chunk
```

**Pattern**: Route splits separate app code, manualChunks optimizes vendor code.

**For complete integration patterns, see:**

- `optimizing-react-performance` (route-level splitting)
- `avoiding-barrel-files` (tree-shaking optimization)

---

## Verification Checklist

Before considering optimization complete:

- [ ] **Bundle analysis**: Run `rollup-plugin-visualizer`, verify no unexpected packages
- [ ] **Chunk sizes**: Initial < 500 KB, routes < 150 KB, vendors appropriate
- [ ] **Substring matching**: Verify no `id.includes('react')` without `/` separators
- [ ] **Tree-shaking**: Check for barrel file imports blocking tree-shaking
- [ ] **Build time**: < 30 seconds for production builds
- [ ] **Compression**: Verify brotli/gzip compression enabled in production

**For complete verification workflow, see:** [references/verification.md](references/verification.md)

---

## Chariot-Specific Guidelines

1. **Target initial bundle**: < 400 KB (Chariot has many lazy-loaded sections)
2. **Vendor-react**: Should be ~170 KB gzipped (575 KB uncompressed)
3. **Vendor-icons**: 9+ MB is acceptable if lazy-loaded per route
4. **Route chunks**: < 150 KB per section (assets, vulnerabilities, settings)
5. **Verify with stats.html**: After every vendor chunk change

---

## Progressive Disclosure

**This file (<500 lines)** provides core patterns and decision trees.

**For detailed implementation:**

- [references/category-chunking.md](references/category-chunking.md) - Complete manualChunks configurations
- [references/anti-patterns.md](references/anti-patterns.md) - Common mistakes and fixes
- [references/chunk-sizing.md](references/chunk-sizing.md) - Chunk size guidelines and strategies
- [references/build-performance.md](references/build-performance.md) - Build time optimization
- [references/verification.md](references/verification.md) - Testing and validation workflow

---

## Integration

### Called By

- `gateway-frontend` - Routes frontend optimization tasks
- `/skill-manager` - During skill creation/updates requiring build optimization

### Requires (invoke before starting)

| Skill | When | Purpose          |
| ----- | ---- | ---------------- |
| None  | -    | Standalone skill |

### Calls (during execution)

| Skill                          | Phase/Step              | Purpose                            |
| ------------------------------ | ----------------------- | ---------------------------------- |
| `avoiding-barrel-files`        | When tree-shaking fails | Fix import patterns                |
| `optimizing-react-performance` | For route splitting     | Coordinate code-splitting strategy |

### Pairs With (conditional)

| Skill                          | Trigger                           | Purpose                          |
| ------------------------------ | --------------------------------- | -------------------------------- |
| `avoiding-barrel-files`        | Bundle contains unused exports    | Remove barrel files first        |
| `optimizing-react-performance` | React-specific performance issues | Coordinate optimization strategy |

---

## Related Skills

| Skill                            | Access Method                                                             | Purpose                                |
| -------------------------------- | ------------------------------------------------------------------------- | -------------------------------------- |
| **optimizing-react-performance** | `Read(".claude/skill-library/.../optimizing-react-performance/SKILL.md")` | Route-level code splitting, React.lazy |
| **avoiding-barrel-files**        | `Read(".claude/skill-library/.../avoiding-barrel-files/SKILL.md")`        | Tree-shaking optimization              |
| **using-tanstack-router**        | `Read(".claude/skill-library/.../using-tanstack-router/SKILL.md")`        | Route-based splitting patterns         |

---

## References

- [Vite Performance Guide](https://vitejs.dev/guide/performance.html)
- [Rollup Code Splitting](https://rollupjs.org/guide/en/#code-splitting)
- [Taming Large Chunks in Vite + React](https://www.mykolaaleksandrov.dev/posts/2025/11/taming-large-chunks-vite-react/)

---

## Changelog

For historical changes, see [`.history/CHANGELOG`](.history/CHANGELOG).
