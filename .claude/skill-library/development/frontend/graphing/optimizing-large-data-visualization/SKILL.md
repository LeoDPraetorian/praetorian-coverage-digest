---
name: optimizing-large-data-visualization
description: Use when rendering 1000+ data points - provides LOD, viewport culling, progressive loading, spatial indexing patterns
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, AskUserQuestion
---

# Optimizing Large Data Visualization

**Performance patterns for rendering 1000+ data points in React applications.**

## Problem Statement

Rendering large datasets (1000+ items) causes:

- Initial render blocking (5-30 seconds)
- Scroll/zoom/pan lag (< 15 FPS)
- Memory pressure and crashes
- Poor user experience

## When to Use This Skill

Invoke when:

- Building data tables with 1000+ rows
- Creating graph visualizations with 1000+ nodes
- Rendering maps with many markers
- Building timelines/charts with dense data
- Users report 'freezing' on data-heavy pages

## Core Optimization Strategies

### Strategy 1: Level of Detail (LOD)

Reduce rendering detail based on zoom level or viewport size.

```typescript
// Zoom-based LOD for graph visualization
const LOD_THRESHOLDS = {
  far: 0.3, // ratio < 0.3: simplified rendering
  medium: 1.0, // ratio < 1.0: partial detail
  near: 2.0, // ratio >= 1.0: full detail
};

const useLOD = (zoomRatio: number) => {
  return useMemo(() => {
    if (zoomRatio < LOD_THRESHOLDS.far) {
      return { showLabels: false, showIcons: false, nodeSize: 3 };
    }
    if (zoomRatio < LOD_THRESHOLDS.medium) {
      return { showLabels: false, showIcons: true, nodeSize: 8 };
    }
    return { showLabels: true, showIcons: true, nodeSize: 12 };
  }, [zoomRatio]);
};
```

**Key Principle**: Only render what the user can perceive at current zoom level.

**See**: [references/lod-patterns.md](references/lod-patterns.md) for advanced LOD techniques and dynamic threshold calculation.

### Strategy 2: Viewport Culling with Spatial Indexing

Only render items visible in the current viewport using efficient spatial queries.

```typescript
// Using d3-quadtree for O(log N) spatial queries
import { quadtree } from "d3-quadtree";

const useViewportCulling = (items: Item[], viewport: Bounds) => {
  // Build quadtree once when items change
  const tree = useMemo(() => {
    return quadtree<Item>()
      .x((d) => d.x)
      .y((d) => d.y)
      .addAll(items);
  }, [items]);

  // Query visible items on viewport change
  const visibleItems = useMemo(() => {
    const visible: Item[] = [];
    tree.visit((node, x0, y0, x1, y1) => {
      // Skip nodes outside viewport
      if (x1 < viewport.minX || x0 > viewport.maxX || y1 < viewport.minY || y0 > viewport.maxY) {
        return true; // Skip this subtree
      }
      if (node.data) visible.push(node.data);
      return false; // Continue traversal
    });
    return visible;
  }, [tree, viewport]);

  return visibleItems;
};
```

**Key Principle**: O(log N) spatial queries beat O(N) filtering by 10-100x.

**See**: [references/spatial-indexing.md](references/spatial-indexing.md) for quadtree alternatives (R-tree, KD-tree) and when to use each.

### Strategy 3: Progressive Loading

Load data in chunks for better perceived performance.

```typescript
const useProgressiveLoad = <T>(
  fetchFn: (offset: number, limit: number) => Promise<T[]>,
  chunkSize = 500,
  maxItems = 10000
) => {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadChunk = async (offset: number) => {
      const chunk = await fetchFn(offset, chunkSize);
      if (cancelled) return;

      setItems((prev) => [...prev, ...chunk]);

      // Continue if more data and under limit
      if (chunk.length === chunkSize && offset + chunkSize < maxItems) {
        // Small delay for UI responsiveness
        setTimeout(() => loadChunk(offset + chunkSize), 50);
      } else {
        setIsLoading(false);
      }
    };

    loadChunk(0);
    return () => {
      cancelled = true;
    };
  }, [fetchFn, chunkSize, maxItems]);

  return { items, isLoading, progress: items.length / maxItems };
};
```

**Key Principle**: Show something fast, load rest in background.

**See**: [references/progressive-loading.md](references/progressive-loading.md) for priority loading, skeleton states, and cancellation patterns.

### Strategy 4: Virtualization

Render only visible rows/items in scrollable containers.

```typescript
// Using TanStack Virtual
import { useVirtualizer } from '@tanstack/react-virtual';

const VirtualizedList = ({ items }: { items: Item[] }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // row height
    overscan: 5, // render 5 extra items above/below
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: virtualRow.start,
              height: virtualRow.size,
            }}
          >
            {items[virtualRow.index].name}
          </div>
        ))}
      </div>
    </div>
  );
};
```

**Key Principle**: Only render what's in the scroll viewport + overscan buffer.

**See**: [references/virtualization.md](references/virtualization.md) for variable-height rows, grid virtualization, and windowing patterns.

## Strategy Selection Matrix

| Data Size  | Interaction | Recommended Strategy         |
| ---------- | ----------- | ---------------------------- |
| 100-1000   | Static      | None needed                  |
| 100-1000   | Scroll      | Virtualization               |
| 1000-5000  | Zoom/Pan    | LOD + Debouncing             |
| 5000-10000 | Zoom/Pan    | LOD + Viewport Culling       |
| 10000+     | Any         | All strategies + Progressive |

**See**: [references/strategy-selection.md](references/strategy-selection.md) for detailed decision trees and combination patterns.

## Performance Targets

| Metric              | Target           | Measurement            |
| ------------------- | ---------------- | ---------------------- |
| Initial render      | < 1s first paint | Performance.mark()     |
| Interaction FPS     | > 30 FPS         | requestAnimationFrame  |
| Memory              | < 500MB heap     | Chrome DevTools Memory |
| Time to interactive | < 3s             | Lighthouse             |

**See**: [references/performance-measurement.md](references/performance-measurement.md) for profiling tools, bottleneck identification, and regression testing.

## Debouncing Continuous Events

```typescript
// Debounce camera/scroll events
const useDebouncedViewport = (sigma: Sigma, delay = 150) => {
  const [viewport, setViewport] = useState<Bounds>(getViewport(sigma));
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setViewport(getViewport(sigma));
      }, delay);
    };

    sigma.getCamera().on("updated", handleUpdate);
    return () => {
      sigma.getCamera().off("updated", handleUpdate);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sigma, delay]);

  return viewport;
};
```

**Key Principle**: Batch rapid events to reduce re-render frequency.

**See**: [references/debouncing-patterns.md](references/debouncing-patterns.md) for throttling vs debouncing, adaptive delays, and React 19 useTransition integration.

## Research Reference

For detailed research on graph visualization specifically, see:
`.claude/.output/discovery/20250114-graph-explorer/research-synthesis.md`

This includes:

- Sigma.js performance characteristics (100k edges easy, 5k nodes with icons hard)
- WebGL vs Canvas tradeoffs
- Specific library comparisons (Sigma.js, Graph.gl, Reagraph, ReGraph)

## Common Anti-Patterns

### Anti-Pattern 1: Premature Optimization

**Problem**: Applying all strategies to 200-item datasets.

**Solution**: Start simple. Profile first. Add complexity only when measurements show need.

### Anti-Pattern 2: Over-Aggressive Culling

**Problem**: Setting viewport bounds too tight, causing pop-in artifacts.

**Solution**: Add padding to viewport bounds (10-20% of viewport size).

### Anti-Pattern 3: Forgetting Memoization

**Problem**: Rebuilding quadtrees or running spatial queries on every render.

**Solution**: Wrap in `useMemo` with proper dependencies (see preventing-react-hook-infinite-loops).

**See**: [references/anti-patterns.md](references/anti-patterns.md) for complete list with diagnosis and remediation.

## Integration with Existing Code

### Step 1: Identify Bottleneck

Use React DevTools Profiler and Chrome Performance tab to identify:

- Which component renders slowly?
- How many DOM nodes are created?
- What's the actual data size?

### Step 2: Select Strategy

Use the Strategy Selection Matrix above to choose appropriate techniques.

### Step 3: Implement Incrementally

1. Add one strategy at a time
2. Measure impact
3. Verify no visual regressions
4. Move to next strategy if needed

**See**: [references/integration-workflow.md](references/integration-workflow.md) for migration from unoptimized to optimized with minimal risk.

## Library Selection

| Library                 | Use Case                  | Performance Characteristics     |
| ----------------------- | ------------------------- | ------------------------------- |
| d3-quadtree             | Spatial indexing          | O(log N) queries, 2D only       |
| @tanstack/react-virtual | List/table virtualization | Variable heights, smooth scroll |
| react-window            | Simple virtualization     | Fixed heights, lightweight      |
| sigma.js                | Graph visualization       | WebGL, 100k+ edges              |

**See**: [references/library-comparison.md](references/library-comparison.md) for detailed feature matrices, bundle sizes, and migration guides.

## Related Skills

- `preventing-react-hook-infinite-loops` - Stable dependencies for spatial indexing hooks
- `coordinating-competing-systems` - LOD vs layout engine coordination
- `designing-react-components` - Component structure for performance
- `testing-frontend-performance` - Automated performance regression testing

## Integration

### Called By

- `frontend-developer` agent when implementing data-heavy features
- `frontend-lead` agent during architecture planning
- `/feature` command for features with large datasets

### Requires (invoke before starting)

| Skill                                  | When  | Purpose                              |
| -------------------------------------- | ----- | ------------------------------------ |
| `preventing-react-hook-infinite-loops` | Start | Ensure stable dependencies in hooks  |
| `profiling-react-performance`          | Start | Measure baseline before optimization |

### Calls (during execution)

None - terminal skill with concrete implementation patterns.

### Pairs With (conditional)

| Skill                            | Trigger                  | Purpose                              |
| -------------------------------- | ------------------------ | ------------------------------------ |
| `coordinating-competing-systems` | Using LOD with layouts   | Prevent LOD/layout thrashing         |
| `debugging-react-performance`    | Optimization not working | Systematic bottleneck identification |

## Changelog

See [.history/CHANGELOG](.history/CHANGELOG) for version history.
