# Category-Based Vendor Chunking

Complete `manualChunks` configurations for category-based vendor splitting in Vite applications.

## Core Strategy

Group dependencies by **usage pattern** and **update frequency** for optimal caching:

1. **Framework core** (react, react-dom) - Rarely changes, always needed
2. **UI libraries** (radix, lucide) - Stable, frequently used
3. **Data visualization** (recharts, d3) - Large, lazy-loadable
4. **Form libraries** (react-hook-form) - Route-specific
5. **Utilities** (lodash-es, date-fns) - Small, stable

**Key principle**: Separate stable code (cached long-term) from volatile code (updated frequently).

---

## Complete Configuration Example

### Chariot-Validated Pattern

This pattern reduced vendor-react from 10.5 MB → 575 KB (95% reduction) in production:

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler", {}]],
      },
    }),
    visualizer({
      template: "treemap",
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: "stats.html",
    }),
  ],
  build: {
    outDir: "build",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // React core ONLY - use path separators for exact matching
            // This prevents matching react-hook-form, react-day-picker, etc.
            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("/react-router/") ||
              id.includes("/react-router-dom/") ||
              id.includes("/scheduler/") ||
              id.includes("/react-is/")
            ) {
              return "vendor-react";
            }

            // Visualization libraries (lazy load with routes that use them)
            if (
              id.includes("cytoscape") ||
              id.includes("sigma") ||
              id.includes("d3-") ||
              id.includes("recharts") ||
              id.includes("react-simple-maps") ||
              id.includes("@xyflow") ||
              id.includes("@react-sigma")
            ) {
              return "vendor-viz";
            }

            // TanStack ecosystem (heavily used across app)
            if (id.includes("@tanstack")) {
              return "vendor-tanstack";
            }

            // Form libraries (used in multiple sections)
            if (id.includes("/react-hook-form/") || id.includes("/react-day-picker/")) {
              return "vendor-forms";
            }

            // Layout/resize libraries (used in specific features)
            if (id.includes("/react-grid-layout/") || id.includes("/react-resizable/")) {
              return "vendor-layout";
            }

            // UI component libraries
            if (
              id.includes("radix") ||
              id.includes("lucide") ||
              id.includes("@headlessui") ||
              id.includes("@heroicons") ||
              id.includes("framer-motion") ||
              id.includes("/react-dropzone/") ||
              id.includes("/react-error-boundary/")
            ) {
              return "vendor-ui";
            }

            // Date/time utilities
            if (id.includes("date-fns")) {
              return "vendor-date";
            }

            // AWS ecosystem (authentication, SDK) - lazy load after auth
            if (
              id.includes("aws-amplify") ||
              id.includes("@aws-amplify") ||
              id.includes("@aws-sdk") ||
              id.includes("@smithy")
            ) {
              return "vendor-aws";
            }

            // Editor/markdown libraries - only needed for POE/notes
            if (id.includes("@uiw") || id.includes("highlight.js") || id.includes("/marked/")) {
              return "vendor-editor";
            }

            // Excel/file processing - only needed for export features
            if (id.includes("/xlsx/") || id.includes("/jszip/") || id.includes("/papaparse/")) {
              return "vendor-files";
            }

            // Icon libraries (beyond lucide which is in vendor-ui)
            if (
              id.includes("/devicons-react/") ||
              id.includes("/aws-react-icons/") ||
              id.includes("@gitlab/svgs") ||
              id.includes("@primer/octicons") ||
              id.includes("@iconify")
            ) {
              return "vendor-icons";
            }

            // Graph layout algorithms - only needed for attack paths
            if (id.includes("graphology") || id.includes("forceatlas")) {
              return "vendor-graph";
            }

            // Utilities that should be separate
            if (id.includes("/lodash/") || id.includes("/immer/") || id.includes("/rxjs/")) {
              return "vendor-utils";
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

---

## Category Sizing Guide

| Category        | Typical Size (Uncompressed) | Gzipped | When to Load     |
| --------------- | --------------------------- | ------- | ---------------- |
| vendor-react    | 150-200 KB                  | 50 KB   | Always (bundle)  |
| vendor-ui       | 100-150 KB                  | 30 KB   | Always (bundle)  |
| vendor-tanstack | 100-150 KB                  | 30 KB   | Always (bundle)  |
| vendor-forms    | 50-100 KB                   | 15 KB   | Route-specific   |
| vendor-layout   | 50-100 KB                   | 15 KB   | Feature-specific |
| vendor-date     | 50-100 KB                   | 15 KB   | As needed        |
| vendor-utils    | 50-150 KB                   | 20 KB   | Always (bundle)  |
| vendor-viz      | 500 KB - 1 MB               | 150 KB  | Lazy load        |
| vendor-editor   | 500 KB - 1 MB               | 150 KB  | Lazy load        |
| vendor-files    | 300-500 KB                  | 100 KB  | Feature-specific |
| vendor-aws      | 100-200 KB                  | 40 KB   | After auth       |
| vendor-icons    | 5-10 MB                     | 2 MB    | Lazy load        |
| vendor-graph    | 50-100 KB                   | 20 KB   | Feature-specific |

**Total initial bundle target**: < 500 KB (uncompressed) / < 150 KB (gzipped)

---

## Pattern Details

### Exact Path Matching

**Critical rule**: Always include `/` separators to match package directory, not substring:

```typescript
// ✅ CORRECT
id.includes("/react/"); // Matches node_modules/react/index.js
id.includes("/react-dom/"); // Matches node_modules/react-dom/index.js

// ❌ WRONG
id.includes("react"); // Matches react, react-hook-form, react-simple-maps, etc.
```

**Why this matters**: Without `/`, substring matching captures unintended packages.

### Progressive Enhancement Strategy

Start minimal, add categories as needed:

**Phase 1: Separate React Core**

```typescript
if (id.includes("/react/") || id.includes("/react-dom/")) {
  return "vendor-react";
}
```

**Phase 2: Add Heavy Libraries**

```typescript
// Add visualization libraries (1+ MB each)
if (id.includes("recharts") || id.includes("d3-")) {
  return "vendor-viz";
}
```

**Phase 3: Refine by Usage Pattern**

```typescript
// Separate forms, UI, utils based on actual usage
```

---

## Optimization by Application Type

### Small Application (< 50 routes)

```typescript
// Minimal chunking - 3 categories
if (id.includes("/react/") || id.includes("/react-dom/")) return "vendor-react";
if (id.includes("recharts") || id.includes("d3-")) return "vendor-viz";
return "vendor";
```

### Medium Application (50-200 routes)

```typescript
// Moderate chunking - 5-7 categories
// React, UI, Forms, Viz, Utils, Other
```

### Large Application (200+ routes) - Chariot Pattern

```typescript
// Comprehensive chunking - 10-14 categories
// React, TanStack, UI, Forms, Layout, Date, AWS, Editor, Files, Icons, Graph, Utils, Viz, Other
```

**Rule of thumb**: Add categories when chunk exceeds 500 KB.

---

## Verification

After configuration changes, verify chunk sizes:

```bash
npm run build
ls -lh dist/assets/*.js | grep vendor
```

**Expected output**:

```
-rw-r--r--  1 user  staff   575K  vendor-react-ABC123.js
-rw-r--r--  1 user  staff   127K  vendor-ui-DEF456.js
-rw-r--r--  1 user  staff   102K  vendor-tanstack-GHI789.js
-rw-r--r--  1 user  staff   1.0M  vendor-viz-JKL012.js
```

**Red flags**:

- vendor-react > 1 MB → Check for substring matching
- vendor-viz > 2 MB → Consider lazy loading
- Total initial bundle > 2 MB → More aggressive splitting needed

---

## Related

- [Anti-Patterns](anti-patterns.md) - Common configuration mistakes
- [Chunk Sizing](chunk-sizing.md) - Optimal chunk size guidelines
- [Verification](verification.md) - Testing chunk configurations
