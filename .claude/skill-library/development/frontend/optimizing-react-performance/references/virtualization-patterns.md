# Virtualization Patterns with TanStack Virtual

## Overview

Virtualization renders only the visible portion of a large list, dramatically improving performance for lists with thousands of items. TanStack Virtual (`@tanstack/react-virtual`) provides a headless virtualization utility that handles scroll math and positioning while you control markup and styling.

## When to Virtualize

| List Size | Recommendation         | Reasoning                                                  |
| --------- | ---------------------- | ---------------------------------------------------------- |
| < 100     | ❌ No virtualization   | Browser handles efficiently, added complexity not worth it |
| 100-500   | ⚠️ Consider pagination | Profile first, pagination may be simpler                   |
| 500-1000  | ⚠️ Profile first       | Depends on row complexity and device                       |
| > 1000    | ✅ **Virtualize**      | Clear performance benefit at this scale                    |

**Profiling tip**: Use React DevTools Profiler. If list rendering >50ms, consider virtualization even below 1000 items.

## Basic Pattern

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

function VirtualizedAssetList({ assets }: { assets: Asset[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: assets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Row height in pixels
    overscan: 10, // Extra items above/below viewport
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{
        height: `${virtualizer.getTotalSize()}px`,
        position: 'relative'
      }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            {assets[virtualRow.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Key Concepts

### estimateSize

Returns the **estimated** size of each item. For fixed-size items, return exact value:

```typescript
estimateSize: () => 60; // All rows are 60px
```

For variable-size items, return best estimate. Virtualizer will measure actual sizes after render.

### overscan

Number of items to render outside viewport. Higher values = smoother scrolling but more DOM nodes.

**Recommendations**:

- Desktop: 5-10
- Mobile: 3-5 (fewer resources)
- Very fast scrolling: 15-20

### getScrollElement

Returns the scrollable container. Use `() => parentRef.current` for most cases.

For window scrolling:

```typescript
getScrollElement: () => window;
```

## Variable Height Items

When row heights vary, TanStack Virtual automatically measures and caches them:

```typescript
const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 100, // Starting estimate
  // Virtualizer measures actual heights after first render
});
```

**Performance tip**: Provide close estimates to reduce measurement overhead.

## Horizontal Virtualization

Switch orientation for horizontal scrolling:

```typescript
const virtualizer = useVirtualizer({
  horizontal: true, // Enable horizontal mode
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 200, // Column width
});

// Apply horizontal layout
<div
  style={{
    width: `${virtualizer.getTotalSize()}px`, // Width, not height
    position: 'relative',
    height: '100%'
  }}
>
  {virtualizer.getVirtualItems().map((virtualCol) => (
    <div
      key={virtualCol.key}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        height: '100%',
        width: `${virtualCol.size}px`,
        transform: `translateX(${virtualCol.start}px)` // X, not Y
      }}
    >
      {items[virtualCol.index].content}
    </div>
  ))}
</div>
```

## Grid Virtualization

For 2D grids, combine two virtualizers:

```typescript
function VirtualizedGrid({ items, columns }: { items: Item[], columns: number }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(items.length / columns),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
  });

  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: columns,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{
        height: `${rowVirtualizer.getTotalSize()}px`,
        width: `${columnVirtualizer.getTotalSize()}px`,
        position: 'relative'
      }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          columnVirtualizer.getVirtualItems().map((virtualCol) => {
            const index = virtualRow.index * columns + virtualCol.index;
            if (index >= items.length) return null;

            return (
              <div
                key={`${virtualRow.key}-${virtualCol.key}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: `${virtualCol.size}px`,
                  height: `${virtualRow.size}px`,
                  transform: `translateX(${virtualCol.start}px) translateY(${virtualRow.start}px)`
                }}
              >
                {items[index].content}
              </div>
            );
          })
        ))}
      </div>
    </div>
  );
}
```

## Scroll to Item

Programmatically scroll to specific items:

```typescript
// Scroll to index 100
virtualizer.scrollToIndex(100, {
  align: "start", // 'start' | 'center' | 'end' | 'auto'
  behavior: "smooth", // 'auto' | 'smooth'
});

// Scroll to offset
virtualizer.scrollToOffset(5000, {
  behavior: "smooth",
});
```

## Sticky Items

Pin header rows or columns:

```typescript
const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 60,
  scrollMargin: 40, // Reserve space for sticky header
});

// Render sticky header above virtualized list
<div>
  <div className="sticky top-0 z-10 bg-white h-10">
    Header
  </div>
  <div ref={parentRef} className="h-[600px] overflow-auto">
    {/* Virtualized content */}
  </div>
</div>
```

## Scroll Handling Best Practices

### Debounce/Throttle Scroll Events

One common pitfall is improper handling of scroll events. The virtualizer handles most scroll logic, but if you add custom scroll listeners, debounce or throttle them:

```typescript
import { useDebouncedCallback } from 'use-debounce';

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
  });

  // Debounce custom scroll handler
  const handleScroll = useDebouncedCallback(() => {
    console.log('User stopped scrolling');
  }, 150);

  return (
    <div ref={parentRef} onScroll={handleScroll} className="h-[600px] overflow-auto">
      {/* Virtualized content */}
    </div>
  );
}
```

**Why**: Reduces re-render frequency and keeps scrolling smooth.

### Preventing Scroll Flickering

Scroll flickering occurs when item sizes are miscalculated or data changes during scroll. Prevent it by:

**1. Accurate size estimates:**

```typescript
// ❌ BAD: Wildly inaccurate estimate
estimateSize: () => 50, // Actual size is 200px

// ✅ GOOD: Close estimate
estimateSize: () => 180, // Actual size varies 170-210px
```

**2. Stable data during scroll:**

```typescript
// ❌ BAD: Mutating data while scrolling
const [items, setItems] = useState(data);
useEffect(() => {
  setInterval(() => setItems(fetchNewData()), 1000); // Causes flickering
}, []);

// ✅ GOOD: Update data only when not scrolling
const [isScrolling, setIsScrolling] = useState(false);
const debouncedScrollEnd = useDebouncedCallback(() => setIsScrolling(false), 150);

function handleScroll() {
  setIsScrolling(true);
  debouncedScrollEnd();
}

// Only update when not scrolling
if (!isScrolling) {
  setItems(newData);
}
```

**3. Measure actual sizes:**

TanStack Virtual automatically measures item sizes after first render. For variable heights, ensure good initial estimates to minimize layout shifts.

### Handling Variable Heights

For lists with highly variable item heights:

```typescript
const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: (index) => {
    // Dynamic estimates based on content
    const item = items[index];
    if (item.hasImage) return 300;
    if (item.hasLongText) return 150;
    return 80;
  },
});
```

**Performance tip**: More accurate dynamic estimates = fewer re-measurements = less flickering.

### State Management Pitfalls

Common state management mistakes that cause unnecessary virtualizer re-renders:

**1. Inline object creation:**

```typescript
// ❌ BAD: New object every render causes virtualizer reset
const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 60,
  rangeExtractor: (range) => [...range.startIndex, ...range.endIndex], // NEW object every render!
});

// ✅ GOOD: Stable callback reference
const rangeExtractor = useCallback((range) => {
  return [...range.startIndex, ...range.endIndex];
}, []);

const virtualizer = useVirtualizer({
  rangeExtractor, // Stable reference
  // ...
});
```

**2. Unstable getScrollElement:**

```typescript
// ❌ BAD: Inline arrow function = new reference every render
getScrollElement: () => parentRef.current,

// ✅ GOOD: Extract to stable callback
const getScrollElement = useCallback(() => parentRef.current, []);
```

**However**, with React Compiler enabled, these are often handled automatically. Only add manual stabilization if profiling shows virtualizer is resetting unnecessarily.

## Common Pitfalls

### 1. Forgetting position: relative

Parent container MUST have `position: relative` for absolute positioning to work:

```typescript
// ❌ WRONG
<div style={{ height: `${virtualizer.getTotalSize()}px` }}>

// ✅ CORRECT
<div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
```

### 2. Dynamic Data Without Keys

Always use stable keys from your data, not array index:

```typescript
// ❌ WRONG
key={virtualRow.index}

// ✅ CORRECT
key={items[virtualRow.index].id}
```

### 3. Excessive Overscan

High overscan values hurt performance by rendering unnecessary items:

```typescript
// ❌ BAD: Renders 100 extra items
overscan: 100;

// ✅ GOOD: Renders 10 extra items
overscan: 10;
```

### 4. Not Handling Empty State

Check for empty lists:

```typescript
if (items.length === 0) {
  return <EmptyState />;
}

// Then render virtualizer
```

## Performance Tips

1. **Memoize row components** - Prevent re-renders of unchanged rows:

```typescript
const Row = React.memo(({ item }: { item: Item }) => (
  <div>{item.name}</div>
));
```

2. **Use CSS transforms** - Virtualizer uses `transform: translateY()` which is GPU-accelerated

3. **Estimate accurately** - Close estimates reduce measurement overhead

4. **Profile before/after** - Use React DevTools to measure actual improvement

## Chariot-Specific Use Cases

Apply virtualization to these Chariot features:

- **Asset tables** - Lists with >1000 assets per account
- **Vulnerability lists** - CVE lists can exceed 10,000 items
- **Risk tables** - Large-scale risk assessments
- **Audit logs** - Event history with thousands of entries

## Related Resources

- [TanStack Virtual Docs](https://tanstack.com/virtual/latest)
- [TanStack Virtual Examples](https://tanstack.com/virtual/latest/docs/examples/react/table)
- [Performance Optimization Guide](./performance.md)
