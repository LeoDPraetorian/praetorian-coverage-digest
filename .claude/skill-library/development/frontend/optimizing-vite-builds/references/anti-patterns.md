# Anti-Patterns and Common Mistakes

Common `manualChunks` configuration mistakes and how to fix them.

## Anti-Pattern 1: Substring Matching

### Problem

Using `id.includes('react')` without path separators matches ANY package containing "react" in the name:

```typescript
// ❌ WRONG: Substring matching
manualChunks(id) {
  if (id.includes('node_modules')) {
    if (id.includes('react')) {
      return 'vendor-react'; //  Bloats to 10+ MB!
    }
  }
}
```

**Packages captured**:

- ✅ `react` (intended)
- ✅ `react-dom` (intended)
- ❌ `react-hook-form` (unwanted - 100 KB)
- ❌ `react-day-picker` (unwanted - 200 KB)
- ❌ `react-simple-maps` (unwanted - 500 KB)
- ❌ `react-dropzone` (unwanted - 50 KB)
- ❌ `react-error-boundary` (unwanted - 10 KB)
- ❌ `@react-sigma/core` (unwanted - 100 KB)
- ...and 5+ more packages

**Impact**: vendor-react chunk grows from 200 KB → 10+ MB.

### Solution

Use exact path matching with `/` separators:

```typescript
// ✅ CORRECT: Exact path matching
manualChunks(id) {
  if (id.includes('node_modules')) {
    if (
      id.includes('/react/') ||
      id.includes('/react-dom/') ||
      id.includes('/react-router/') ||
      id.includes('/scheduler/') ||
      id.includes('/react-is/')
    ) {
      return 'vendor-react';
    }
  }
}
```

**Result**: vendor-react contains ONLY core React packages (200 KB).

**Rule**: Always include `/` before and after package name pattern.

---

## Anti-Pattern 2: Manual Dependency Lists

### Problem

Hard-coding package names in `manualChunks` object requires maintenance:

```typescript
// ❌ WRONG: Manual dependency lists
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-forms": ["react-hook-form", "@hookform/resolvers"],
          "vendor-ui": ["react-day-picker", "date-fns", "lucide-react"],
          "vendor-viz": ["recharts", "d3-scale", "d3-geo"],
        },
      },
    },
  },
});
```

**Problems**:

1. **Brittle**: Breaks when adding new packages
2. **Verbose**: Doesn't scale to 100+ dependencies
3. **Error-prone**: Easy to forget packages
4. **Maintenance burden**: Every new dep requires config update

### Solution

Use function-based pattern matching:

```typescript
// ✅ CORRECT: Pattern-based matching
manualChunks(id) {
  if (id.includes('node_modules')) {
    if (id.includes('/react-hook-form/') || id.includes('@hookform')) {
      return 'vendor-forms';
    }
    if (id.includes('lucide') || id.includes('radix')) {
      return 'vendor-ui';
    }
    if (id.includes('recharts') || id.includes('d3-')) {
      return 'vendor-viz';
    }
  }
}
```

**Benefits**:

- Automatically handles new packages matching pattern
- Self-documenting (pattern describes intent)
- Scales to any number of dependencies

---

## Anti-Pattern 3: Over-Splitting

### Problem

Creating too many small chunks increases HTTP overhead:

```typescript
// ❌ WRONG: Too many tiny chunks
manualChunks(id) {
  if (id.includes('/lodash-es/debounce')) return 'vendor-debounce'; // 5 KB
  if (id.includes('/lodash-es/throttle')) return 'vendor-throttle'; // 5 KB
  if (id.includes('/lodash-es/cloneDeep')) return 'vendor-clone'; // 3 KB
  if (id.includes('/date-fns/format')) return 'vendor-format'; // 2 KB
  if (id.includes('/date-fns/parse')) return 'vendor-parse'; // 2 KB
  // Creates 50+ chunks < 10 KB each
}
```

**Impact**:

- 50+ HTTP requests instead of 5-10
- Network overhead > bundle savings
- Browser connection limits slow download
- Increased complexity for negligible benefit

### Solution

Group related utilities into single chunks:

```typescript
// ✅ CORRECT: Grouped utilities
manualChunks(id) {
  if (id.includes('node_modules')) {
    // All lodash utilities together
    if (id.includes('/lodash-es/') || id.includes('/lodash/')) {
      return 'vendor-utils';
    }
    // All date utilities together
    if (id.includes('date-fns')) {
      return 'vendor-date';
    }
  }
}
```

**Result**: 2 chunks of 50-100 KB each instead of 50 chunks of 2-5 KB.

**Rule of thumb**: Aim for 5-15 vendor chunks, not 50+. Target 50-500 KB per chunk.

---

## Anti-Pattern 4: Ignoring Lazy Loading

### Problem

Putting heavy libraries in initial bundle when they could be lazy-loaded:

```typescript
// ❌ WRONG: Heavy libs in initial bundle
manualChunks(id) {
  if (id.includes('node_modules')) {
    // Puts 1+ MB visualization library in initial bundle
    if (id.includes('recharts')) {
      return 'vendor'; // Loaded immediately
    }
  }
}
```

**Impact**: Initial bundle 500 KB → 1.5 MB due to rarely-used chart library.

### Solution

Separate heavy libraries into dedicated chunks for lazy loading:

```typescript
// ✅ CORRECT: Separate heavy libs
manualChunks(id) {
  if (id.includes('node_modules')) {
    // Separate chunk for lazy loading
    if (id.includes('recharts') || id.includes('d3-')) {
      return 'vendor-viz'; // Loaded only when charts route accessed
    }
  }
}
```

**Then lazy load in application**:

```typescript
// Lazy load chart component
const ChartsPage = lazy(() => import("./pages/ChartsPage"));
```

**Result**: 1 MB chart library only downloads when user visits charts page.

**Rule**: If library is > 200 KB and route-specific, separate it for lazy loading.

---

## Anti-Pattern 5: No Bundle Analysis

### Problem

Configuring manualChunks blindly without verifying results:

```typescript
// ❌ WRONG: Configure and hope
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Complex configuration...
        },
      },
    },
  },
  // No bundle analyzer!
});
```

**Impact**: Unknown if configuration is working. Could be making things worse.

### Solution

Always use bundle analyzer to verify:

```typescript
// ✅ CORRECT: Analyze every build
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      template: "treemap",
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: "stats.html",
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Configuration...
        },
      },
    },
  },
});
```

**After every build**: Open `stats.html` and verify:

1. No unexpected packages in vendor-react
2. Chunk sizes are reasonable (50 KB - 500 KB)
3. Total initial bundle < 500 KB

**Rule**: Measure before and after EVERY configuration change.

---

## Anti-Pattern 6: Mixing Object and Function Syntax

### Problem

Combining `manualChunks` object with function causes conflicts:

```typescript
// ❌ WRONG: Mixed syntax
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Object syntax
          "vendor-forms": ["react-hook-form"],
        },
        manualChunks(id) {
          // Function syntax - OVERRIDES object!
          if (id.includes("/react/")) return "vendor-react";
        },
      },
    },
  },
});
```

**Impact**: Function completely overrides object. `vendor-forms` never created.

### Solution

Use ONLY function syntax for flexibility:

```typescript
// ✅ CORRECT: Function syntax only
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("/react-hook-form/")) return "vendor-forms";
            if (id.includes("/react/")) return "vendor-react";
            return "vendor";
          }
        },
      },
    },
  },
});
```

**Rule**: Pick one syntax (prefer function) and stick with it.

---

## Anti-Pattern 7: Not Excluding Development Dependencies

### Problem

Including test/dev dependencies in production bundle:

```typescript
// ❌ WRONG: Includes everything from node_modules
manualChunks(id) {
  if (id.includes('node_modules')) {
    // Includes @testing-library, vitest, etc.
    return 'vendor';
  }
}
```

**Impact**: Production bundle includes unused dev dependencies.

### Solution

Vite automatically excludes devDependencies from production builds. **No action needed** if packages are correctly listed in `package.json`:

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "vitest": "^3.0.0",
    "@testing-library/react": "^16.0.0"
  }
}
```

**Verification**:

```bash
npm run build
grep -r "@testing-library" dist/  # Should return nothing
```

**Rule**: Use `dependencies` for production, `devDependencies` for development-only packages.

---

## Quick Checklist

Before deploying manualChunks configuration:

- [ ] ✅ Using exact path matching (`/react/` not `react`)
- [ ] ✅ Function-based pattern matching (not manual lists)
- [ ] ✅ 5-15 vendor chunks (not 50+)
- [ ] ✅ Heavy libraries (> 200 KB) in separate lazy-loadable chunks
- [ ] ✅ Bundle analyzer configured and verified
- [ ] ✅ Function syntax only (no mixed object/function)
- [ ] ✅ Dev dependencies excluded from production

---

## Related

- [Category Chunking](category-chunking.md) - Complete configuration examples
- [Chunk Sizing](chunk-sizing.md) - Optimal chunk size guidelines
- [Verification](verification.md) - Testing and validation workflow
