# Chunk Sizing Guidelines

Optimal chunk sizes for Vite vendor splitting and when to split vs consolidate.

## Chunk Size Targets (2025)

| Chunk Type              | Target Size (Uncompressed) | Gzipped        | Notes                  |
| ----------------------- | -------------------------- | -------------- | ---------------------- |
| **Initial bundle**      | < 500 KB                   | < 150 KB       | Critical path code     |
| **Vendor chunks**       | 50 KB - 500 KB             | 15 KB - 150 KB | Sweet spot for caching |
| **Route chunks**        | < 150 KB                   | < 50 KB        | Lazy-loaded pages      |
| **Lazy feature chunks** | 100 KB - 1 MB              | 30 KB - 300 KB | Charts, editors, maps  |

**Warning thresholds**:

- < 30 KB per chunk → Over-splitting (HTTP overhead exceeds savings)
- \> 500 KB vendor chunk → Consider splitting further
- \> 1 MB route chunk → Lazy load heavy dependencies

---

## When to Split a Chunk

### Decision Matrix

```
Current chunk size?
├─ < 300 KB → Keep consolidated ✅
├─ 300-500 KB → Profile usage patterns
│   ├─ Used on every route? → Keep consolidated
│   └─ Route-specific? → Consider splitting
└─ > 500 KB → Split by usage pattern
    ├─ Always needed? → Split by library
    └─ Rarely used? → Separate for lazy load
```

### Example: vendor-ui at 800 KB

```typescript
// Before: Single 800 KB chunk
if (id.includes("radix") || id.includes("lucide") || id.includes("framer-motion")) {
  return "vendor-ui"; // 800 KB
}

// After: Split by usage
if (id.includes("lucide") || id.includes("radix")) {
  return "vendor-ui-core"; // 200 KB - Always needed
}
if (id.includes("framer-motion")) {
  return "vendor-animation"; // 600 KB - Lazy load
}
```

**Result**: Initial bundle -600 KB, animation library loads on-demand.

---

## When to Consolidate Chunks

### Too Many Small Chunks

**Problem**: 50+ chunks < 30 KB each:

```
vendor-debounce.js        5 KB
vendor-throttle.js        5 KB
vendor-cloneDeep.js       3 KB
vendor-format.js          2 KB
vendor-parse.js           2 KB
...45 more files
```

**Impact**: HTTP overhead (50+ requests) > bundle savings (~50 KB total)

**Solution**: Consolidate into single utility chunk:

```typescript
// Consolidate lodash + date-fns
if (id.includes("/lodash-es/") || id.includes("date-fns")) {
  return "vendor-utils"; // 80 KB - 2 requests instead of 50
}
```

### Optimal Chunk Count

| Application Size       | Vendor Chunks | Route Chunks | Total Chunks |
| ---------------------- | ------------- | ------------ | ------------ |
| Small (< 50 routes)    | 3-5           | 10-20        | 15-25        |
| Medium (50-200 routes) | 5-10          | 50-100       | 60-110       |
| Large (200+ routes)    | 10-15         | 100-300      | 120-315      |

**Rule of thumb**: Aim for 5-15 vendor chunks, regardless of app size.

---

## Measuring Chunk Impact

### Before/After Comparison

```bash
# Build and measure
npm run build
ls -lh dist/assets/*.js | sort -k5 -hr > chunks-after.txt

# Compare with baseline
diff chunks-before.txt chunks-after.txt
```

### Key Metrics

| Metric              | Good     | Warning       | Critical |
| ------------------- | -------- | ------------- | -------- |
| Initial bundle      | < 500 KB | 500-800 KB    | > 800 KB |
| Largest vendor      | < 500 KB | 500 KB - 1 MB | > 1 MB   |
| Smallest chunk      | > 30 KB  | 10-30 KB      | < 10 KB  |
| Total vendor chunks | 5-15     | 15-25         | > 25     |

---

## HTTP/2 Considerations

**Modern browsers** (HTTP/2, 2025+): Handle 10-15 parallel chunks efficiently.

**HTTP/2 multiplexing**: Multiple chunks download simultaneously over single connection.

**Optimal strategy**:

- 5-10 vendor chunks (always loaded)
- 10-20 route chunks (lazy loaded)
- Total: 15-30 chunks

**Don't over-optimize**: HTTP/2 makes many chunks acceptable, but 50+ still adds overhead.

---

## Compression Impact

### Typical Compression Ratios

| Content Type  | Uncompressed | Gzipped | Brotli | Ratio  |
| ------------- | ------------ | ------- | ------ | ------ |
| React code    | 500 KB       | 150 KB  | 130 KB | 70%    |
| Utility libs  | 200 KB       | 60 KB   | 50 KB  | 70%    |
| Visualization | 1 MB         | 300 KB  | 250 KB | 70-75% |
| Icons/SVG     | 10 MB        | 2 MB    | 1.5 MB | 80-85% |

**Key insight**: Gzip/brotli compress JavaScript 70-80%. Focus on uncompressed size for chunk decisions.

**Verification**:

```bash
# Check gzipped sizes
npm run build
gzip -k dist/assets/*.js
ls -lh dist/assets/*.js.gz
```

---

## Real-World Examples

### Chariot Platform (200+ routes)

**Before optimization**:

- vendor-react: 10.5 MB (includes 12+ unintended packages)
- vendor: 14.6 MB (catch-all)
- Total initial: ~19 MB

**After category chunking**:

- vendor-react: 575 KB (core only)
- vendor-icons: 9.2 MB (lazy load per route)
- vendor-viz: 1 MB (lazy load)
- vendor-editor: 1 MB (lazy load)
- vendor-forms: 35 KB
- vendor-ui: 127 KB
- vendor-tanstack: 102 KB
- vendor-utils: 128 KB
- vendor-aws: 136 KB
- vendor-graph: 74 KB
- vendor-date: 60 KB
- vendor-layout: 50 KB
- Total initial: ~2 MB (before lazy loads)

**Result**: 95% reduction in initial bundle (19 MB → 2 MB)

---

## Related

- [Category Chunking](category-chunking.md) - Complete configuration examples
- [Anti-Patterns](anti-patterns.md) - Common mistakes to avoid
- [Verification](verification.md) - Testing chunk configurations
