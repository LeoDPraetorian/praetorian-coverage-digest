---
name: hierarchical-graph-navigation
description: Patterns for implementing drill-down/drill-up in clustered graph visualizations with breadcrumb navigation, URL state, and selection preservation
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Hierarchical Graph Navigation

**Patterns for implementing drill-down/drill-up navigation in clustered graph visualizations.**

## When to Use This Pattern

Use this skill when implementing:

- **Multi-level graph clustering** - Louvain, Leiden, or attribute-based hierarchical clustering
- **Progressive disclosure UX** - Start at overview, drill into details
- **Large dataset visualization** - >1K nodes requiring hierarchical organization
- **Browser history support** - "Back" navigation with URL state

**Anti-pattern:** Don't use this for single-level filtering (use filter state instead).

## Core Problem

Without proper navigation patterns, developers will:

1. **State management failures** - Store hierarchy in component state → re-render cascades
2. **Broken browser back** - No URL synchronization → back button doesn't work
3. **Jarring transitions** - Missing camera animation coordination → users get lost
4. **Lost selections** - No preservation across levels → frustrating UX

## Quick Reference

| Pattern | Purpose | Reference |
|---------|---------|-----------|
| Breadcrumb State | Track navigation path | [breadcrumb-state-patterns.md](references/breadcrumb-state-patterns.md) |
| Camera Animation | Smooth transitions | [camera-animation-timing.md](references/camera-animation-timing.md) |
| URL State | Browser history | [url-state-synchronization.md](references/url-state-synchronization.md) |
| Selection Preservation | Maintain selections | [selection-preservation.md](references/selection-preservation.md) |

## 1. Breadcrumb State Management

### State Structure

```typescript
type ClusterNode = {
  id: string;
  label: string;
  size: number;
  centroid?: { x: number; y: number };
};

type NavigationState = {
  path: ClusterNode[];        // Array of clusters from root to current
  currentLevel: number;       // Index in path array
  selections: Map<string, Set<string>>; // Per-level selection state
};
```

**Key Principle:** Use immutable path updates (never mutate array in place).

### Immutable Updates

```typescript
// ✅ Push level (drill down)
setNavigation(prev => ({
  ...prev,
  path: [...prev.path, newCluster],
  currentLevel: prev.currentLevel + 1
}));

// ✅ Pop level (drill up)
setNavigation(prev => ({
  ...prev,
  path: prev.path.slice(0, -1),
  currentLevel: prev.currentLevel - 1
}));

// ❌ WRONG: Mutating array
navigation.path.push(newCluster); // Causes stale closure bugs
```

### Hook Dependency Serialization

**Problem:** Passing `path` array to `useEffect` causes infinite re-renders.

**Solution:** Serialize path to stable key.

```typescript
const pathKey = useMemo(() => path.map(c => c.id).join('/'), [path]);

useEffect(() => {
  fetchSubCluster(pathKey);
}, [pathKey]); // Stable reference
```

**See:** [breadcrumb-state-patterns.md](references/breadcrumb-state-patterns.md) for complete patterns.

## 2. Camera Animation During Navigation

Sigma.js camera fires **60+ events/second** during animation. Naive state updates cause re-render storms.

### Debouncing Pattern

```typescript
import { useDebouncedValue } from '@mantine/hooks';

const debouncedCameraState = useDebouncedValue(camera, 150);
```

### Animation Timing

```typescript
const animateDrillDown = (cluster: ClusterNode) => {
  setIsAnimating(true);
  sigma.getCamera().animate(
    { x: cluster.centroid.x, y: cluster.centroid.y, ratio: 0.5 },
    { duration: 500, easing: 'quadInOut' }
  );
  setTimeout(() => setIsAnimating(false), 500);
};
```

**Timing recommendations:**
- **Drill down**: 500ms (zoom in feels intentional)
- **Drill up**: 300ms (faster exit)
- **Always disable interactions during animation**

**See:** [camera-animation-timing.md](references/camera-animation-timing.md) for easing functions and cancellation.

## 3. Browser History Integration

### URL State Synchronization

**URL Format:** `/graph/{root}/{cluster-a}/{cluster-b}`

```typescript
useEffect(() => {
  const pathString = navigation.path.map(c => encodeURIComponent(c.id)).join('/');
  window.history.pushState({ path: navigation.path }, '', `/graph/${pathString}`);
}, [navigation.path]);
```

### Back Button Support

```typescript
useEffect(() => {
  const handlePopState = (e: PopStateEvent) => {
    if (e.state?.path) {
      setNavigation(prev => ({
        ...prev,
        path: e.state.path,
        currentLevel: e.state.path.length - 1
      }));
    }
  };
  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, []);
```

**See:** [url-state-synchronization.md](references/url-state-synchronization.md) for deep linking and query params.

## 4. Selection Preservation

User selects nodes at Level 2, drills to Level 3, then back. Selection should restore.

### Per-Level Selection Map

```typescript
// On drill down - save current selection
const drillDown = (cluster: ClusterNode) => {
  const currentLevelId = navigation.path[navigation.currentLevel].id;
  setNavigation(prev => ({
    ...prev,
    path: [...prev.path, cluster],
    currentLevel: prev.currentLevel + 1,
    selections: new Map(prev.selections).set(currentLevelId, new Set(selectedNodes))
  }));
};

// On drill up - restore saved selection
const drillUp = () => {
  const parentLevelId = navigation.path[navigation.currentLevel - 1].id;
  const saved = navigation.selections.get(parentLevelId);
  setNavigation(prev => ({
    ...prev,
    path: prev.path.slice(0, -1),
    currentLevel: prev.currentLevel - 1
  }));
  if (saved) setSelectedNodes(saved);
};
```

**See:** [selection-preservation.md](references/selection-preservation.md) for edge cases (deleted nodes).

## 5. Breadcrumb UI Component

```typescript
const Breadcrumbs = ({ navigation, onNavigate }: BreadcrumbsProps) => (
  <nav aria-label="Cluster navigation">
    {navigation.path.map((cluster, idx) => (
      <React.Fragment key={cluster.id}>
        <button
          onClick={() => onNavigate(idx)}
          className={idx === navigation.currentLevel ? 'active' : ''}
          aria-current={idx === navigation.currentLevel ? 'page' : undefined}
        >
          {cluster.label} ({cluster.size})
        </button>
        {idx < navigation.path.length - 1 && <span aria-hidden>/</span>}
      </React.Fragment>
    ))}
  </nav>
);
```

**Keyboard shortcuts:**
- `Escape` or `Alt+Up` → Drill up one level
- `Alt+Down` → Drill into selected cluster

## 6. Performance Thresholds

```typescript
const getNavigationStrategy = (clusterSize: number) => {
  if (clusterSize < 1000) return 'direct';      // Instant rendering
  if (clusterSize < 10000) return 'progressive'; // Skeleton first
  return 'force-table';                          // Too large
};
```

| Nodes | Strategy | UX |
|-------|----------|-----|
| < 1K | Direct | Instant navigation |
| 1K-10K | Progressive | Skeleton → fade in |
| > 10K | Force table | Disable direct expansion |

## 7. Table Fallback

```typescript
const MAX_DEPTH = 5;

if (cluster.size > 1000 && depth >= MAX_DEPTH) {
  return <TableFallback nodes={cluster.nodes} onBack={() => setViewMode('graph')} />;
}
```

**Keep breadcrumb visible in table view** for navigation context.

## Common Anti-Patterns

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Storing path in component state only | No browser back | Use URL state |
| Mutating path array | Stale closures | Immutable updates |
| Camera listener without debounce | Re-render storm | 150ms debounce |
| No loading state | Janky UX | Disable interactions during layout |
| Resetting selection on navigation | Frustrating | Per-level selection map |

## Debugging Navigation Issues

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Browser back doesn't work | No popstate listener | Add event listener |
| Selection lost | Not saving to Map | Save before navigation |
| Infinite re-renders | Path in useEffect deps | Serialize to pathKey |
| Jarring transitions | No animation | Add camera.animate() |

## Integration

### Called By

- Graph Explorer feature implementation
- Any Chariot UI component using hierarchical clustering

### Requires (invoke before starting)

- **`preventing-react-hook-infinite-loops`** (LIBRARY)
  - `Read(".claude/skill-library/development/frontend/preventing-react-hook-infinite-loops/SKILL.md")`
- **`working-with-sigma-js`** (LIBRARY)
  - `Read(".claude/skill-library/development/frontend/graphing/working-with-sigma-js/SKILL.md")`

### Calls (during execution)

None - provides patterns, doesn't invoke other skills

### Pairs With (conditional)

- **`coordinating-competing-systems`** (LIBRARY) - Layout coordination during navigation
  - `Read(".claude/skill-library/development/frontend/graphing/coordinating-competing-systems/SKILL.md")`
- **`prefetching-react-routes`** (LIBRARY) - URL state patterns
  - `Read(".claude/skill-library/development/frontend/prefetching-react-routes/SKILL.md")`
- **`graph-layout-coordination`** (LIBRARY) - Navigation with layout lifecycle
  - `Read(".claude/skill-library/development/frontend/graphing/graph-layout-coordination/SKILL.md")`

## Related Resources

- Cambridge Intelligence: Progressive Disclosure - https://cambridge-intelligence.com/visualize-large-networks/
- Nielsen Norman Group: Progressive Disclosure - https://www.nngroup.com/articles/progressive-disclosure/
- Sigma.js Performance Issue #567 - https://github.com/jacomyal/sigma.js/issues/567
