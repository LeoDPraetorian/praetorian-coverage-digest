# Breadcrumb State Management Patterns

Complete patterns for managing hierarchical navigation state in graph visualizations.

## State Structure

```typescript
type ClusterNode = {
  id: string;
  label: string;
  size: number;
  centroid?: { x: number; y: number };
  metadata?: Record<string, any>;
};

type NavigationState = {
  path: ClusterNode[];                    // Array from root to current
  currentLevel: number;                   // Index in path array
  selections: Map<string, Set<string>>;  // Per-level selections
  history: string[];                      // For undo/redo
};
```

## Immutable Update Patterns

### Drill Down (Push Level)

```typescript
const drillDown = (cluster: ClusterNode) => {
  setNavigation(prev => ({
    ...prev,
    path: [...prev.path, cluster],
    currentLevel: prev.currentLevel + 1,
    history: [...prev.history, 'down']
  }));
};
```

### Drill Up (Pop Level)

```typescript
const drillUp = () => {
  if (navigation.currentLevel === 0) return; // At root

  setNavigation(prev => ({
    ...prev,
    path: prev.path.slice(0, -1),
    currentLevel: prev.currentLevel - 1,
    history: [...prev.history, 'up']
  }));
};
```

### Navigate to Specific Level

```typescript
const navigateToLevel = (targetLevel: number) => {
  if (targetLevel < 0 || targetLevel >= navigation.path.length) return;

  setNavigation(prev => ({
    ...prev,
    currentLevel: targetLevel,
    history: [...prev.history, `goto:${targetLevel}`]
  }));
};
```

## Hook Dependency Serialization

### The Problem

```typescript
// ❌ WRONG: Causes infinite re-renders
useEffect(() => {
  fetchData(navigation.path);
}, [navigation.path]); // Reference changes every render
```

### The Solution

```typescript
// ✅ RIGHT: Serialize to stable key
const pathKey = useMemo(
  () => navigation.path.map(c => c.id).join('/'),
  [navigation.path]
);

useEffect(() => {
  fetchData(pathKey);
}, [pathKey]); // Stable reference
```

### Alternative: Deep Equality

```typescript
import { isEqual } from 'lodash';

const prevPathRef = useRef(navigation.path);

useEffect(() => {
  if (!isEqual(prevPathRef.current, navigation.path)) {
    fetchData(navigation.path);
    prevPathRef.current = navigation.path;
  }
}, [navigation.path]);
```

**Trade-off:** Deep equality is expensive. Serialization is faster.

## Selection Preservation

### Save Selection Before Navigation

```typescript
const drillDownWithSelection = (cluster: ClusterNode) => {
  const currentLevelId = navigation.path[navigation.currentLevel].id;

  setNavigation(prev => {
    const newSelections = new Map(prev.selections);
    newSelections.set(currentLevelId, new Set(selectedNodes));

    return {
      ...prev,
      path: [...prev.path, cluster],
      currentLevel: prev.currentLevel + 1,
      selections: newSelections
    };
  });

  // Clear current selection (new level has no selection yet)
  setSelectedNodes(new Set());
};
```

### Restore Selection After Navigation

```typescript
const drillUpWithRestore = () => {
  if (navigation.currentLevel === 0) return;

  const parentLevelId = navigation.path[navigation.currentLevel - 1].id;
  const savedSelection = navigation.selections.get(parentLevelId);

  setNavigation(prev => ({
    ...prev,
    path: prev.path.slice(0, -1),
    currentLevel: prev.currentLevel - 1
  }));

  // Restore parent level selection
  if (savedSelection && savedSelection.size > 0) {
    setSelectedNodes(savedSelection);
  }
};
```

## Edge Cases

### Deleted Nodes

```typescript
const restoreSelectionSafely = (
  levelId: string,
  availableNodeIds: Set<string>
) => {
  const saved = navigation.selections.get(levelId);

  if (!saved || saved.size === 0) {
    setSelectedNodes(new Set());
    return;
  }

  // Filter out nodes that no longer exist
  const validSelection = new Set(
    Array.from(saved).filter(id => availableNodeIds.has(id))
  );

  setSelectedNodes(validSelection);

  // Log if nodes were removed
  if (validSelection.size < saved.size) {
    console.warn(
      `Selection reduced: ${saved.size} → ${validSelection.size} nodes`
    );
  }
};
```

### Empty Clusters

```typescript
const drillDownSafe = (cluster: ClusterNode) => {
  if (cluster.size === 0) {
    showNotification({
      title: 'Empty cluster',
      message: 'This cluster contains no nodes.',
      color: 'yellow'
    });
    return;
  }

  drillDown(cluster);
};
```

## State Persistence

### Save to localStorage

```typescript
const saveNavigationState = (state: NavigationState) => {
  localStorage.setItem(
    'graph-navigation',
    JSON.stringify({
      path: state.path.map(c => c.id), // Only IDs
      currentLevel: state.currentLevel,
      timestamp: Date.now()
    })
  );
};

useEffect(() => {
  saveNavigationState(navigation);
}, [navigation]);
```

### Restore from localStorage

```typescript
const restoreNavigationState = async () => {
  const saved = localStorage.getItem('graph-navigation');

  if (!saved) return;

  const { path: pathIds, currentLevel, timestamp } = JSON.parse(saved);

  // Expire after 24 hours
  if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
    localStorage.removeItem('graph-navigation');
    return;
  }

  // Fetch full cluster data from IDs
  const clusters: ClusterNode[] = [];
  for (const id of pathIds) {
    const cluster = await fetchCluster(id);
    if (cluster) clusters.push(cluster);
  }

  setNavigation({
    path: clusters,
    currentLevel: Math.min(currentLevel, clusters.length - 1),
    selections: new Map(),
    history: []
  });
};

useEffect(() => {
  restoreNavigationState();
}, []);
```

## Performance Optimization

### Memoize Path Rendering

```typescript
const PathDisplay = React.memo(({ path }: { path: ClusterNode[] }) => {
  return (
    <div>
      {path.map((cluster, idx) => (
        <span key={cluster.id}>
          {cluster.label} ({cluster.size})
          {idx < path.length - 1 && ' → '}
        </span>
      ))}
    </div>
  );
});
```

### Batch State Updates

```typescript
const navigateMultipleLevels = (targetLevel: number) => {
  // ❌ WRONG: Multiple setState calls
  setNavigation(prev => ({ ...prev, currentLevel: targetLevel }));
  setLoading(true);
  setSelectedNodes(new Set());

  // ✅ RIGHT: Single setState with all changes
  setNavigation(prev => ({
    ...prev,
    currentLevel: targetLevel,
    selections: new Map(prev.selections).set(
      prev.path[targetLevel].id,
      new Set()
    )
  }));

  setLoading(true);
};
```

## Testing Patterns

### Mock Navigation State

```typescript
const mockNavigation: NavigationState = {
  path: [
    { id: 'root', label: 'Root', size: 10000 },
    { id: 'cluster-a', label: 'Cluster A', size: 5000 },
    { id: 'cluster-b', label: 'Cluster B', size: 2000 }
  ],
  currentLevel: 2,
  selections: new Map([
    ['cluster-a', new Set(['node-1', 'node-2'])],
    ['cluster-b', new Set(['node-3'])]
  ]),
  history: ['down', 'down']
};
```

### Test Immutable Updates

```typescript
it('should not mutate original state on drill down', () => {
  const original = { ...mockNavigation };
  const newCluster = { id: 'cluster-c', label: 'Cluster C', size: 1000 };

  const updated = {
    ...original,
    path: [...original.path, newCluster],
    currentLevel: original.currentLevel + 1
  };

  expect(original.path.length).toBe(3); // Unchanged
  expect(updated.path.length).toBe(4);
  expect(original.path).not.toBe(updated.path); // Different reference
});
```
