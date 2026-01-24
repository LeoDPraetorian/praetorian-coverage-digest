# Selection Preservation Patterns

Complete patterns for preserving node selections across hierarchical navigation levels.

## The Problem

**Scenario:** User selects 5 nodes at Level 2, drills down to Level 3 to investigate details, then drills back up to Level 2.

**Without preservation:** Selection is lost. User must re-select 5 nodes.

**With preservation:** Original 5 nodes are automatically re-selected when returning to Level 2.

## Core Pattern: Per-Level Selection Map

```typescript
type NavigationState = {
  path: ClusterNode[];
  currentLevel: number;
  selections: Map<string, Set<string>>; // levelId -> Set<nodeId>
};
```

**Key insight:** Store a separate Set<nodeId> for each level visited.

## Save Selection Before Navigating

### On Drill Down

```typescript
const drillDownWithSelection = (cluster: ClusterNode) => {
  const currentLevelId = navigation.path[navigation.currentLevel].id;

  setNavigation(prev => {
    // Create new Map (immutable update)
    const newSelections = new Map(prev.selections);

    // Save current selection
    newSelections.set(currentLevelId, new Set(selectedNodes));

    return {
      ...prev,
      path: [...prev.path, cluster],
      currentLevel: prev.currentLevel + 1,
      selections: newSelections
    };
  });

  // Clear selection for new level
  setSelectedNodes(new Set());
};
```

### On Drill Up

```typescript
const drillUpWithRestore = () => {
  if (navigation.currentLevel === 0) return; // At root

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
  } else {
    setSelectedNodes(new Set());
  }
};
```

## Edge Cases

### Deleted Nodes

**Problem:** Node was selected at Level 2, but deleted before returning.

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

  // Notify user if selection was partial
  if (validSelection.size < saved.size) {
    const removed = saved.size - validSelection.size;
    showNotification({
      title: 'Selection partially restored',
      message: `${removed} selected ${removed === 1 ? 'node' : 'nodes'} no longer available`,
      color: 'yellow'
    });
  }
};
```

### Modified Nodes

**Problem:** Node properties changed (e.g., label, status) while navigating.

```typescript
const restoreWithRefresh = async (levelId: string) => {
  const saved = navigation.selections.get(levelId);

  if (!saved || saved.size === 0) {
    setSelectedNodes(new Set());
    return;
  }

  // Fetch fresh node data
  const freshNodes = await fetchNodes(Array.from(saved));

  // Create Set of still-valid IDs
  const validIds = new Set(freshNodes.map(n => n.id));

  setSelectedNodes(validIds);
};
```

### Empty Selection

**Problem:** User drills down without selecting anything.

```typescript
const drillDownWithOptionalSelection = (cluster: ClusterNode) => {
  const currentLevelId = navigation.path[navigation.currentLevel].id;

  setNavigation(prev => {
    const newSelections = new Map(prev.selections);

    // Only save if there's something to save
    if (selectedNodes.size > 0) {
      newSelections.set(currentLevelId, new Set(selectedNodes));
    }

    return {
      ...prev,
      path: [...prev.path, cluster],
      currentLevel: prev.currentLevel + 1,
      selections: newSelections
    };
  });

  setSelectedNodes(new Set());
};
```

## Visual Feedback

### Selection Badge

```typescript
const SelectionBadge = ({ count }: { count: number }) => {
  if (count === 0) return null;

  return (
    <div className="selection-badge">
      <CheckIcon />
      <span>{count} selected</span>
    </div>
  );
};

// Usage
<SelectionBadge count={selectedNodes.size} />
```

### Highlight Saved Selections in Breadcrumb

```typescript
const BreadcrumbItem = ({ cluster, level, hasSavedSelection }: Props) => {
  return (
    <button
      className={`breadcrumb-item ${hasSavedSelection ? 'has-selection' : ''}`}
      onClick={() => navigateToLevel(level)}
    >
      {cluster.label}
      {hasSavedSelection && (
        <span className="selection-indicator" title="Has saved selection">
          ●
        </span>
      )}
    </button>
  );
};
```

## Bulk Operations with Selection

### Apply Operation to Selection

```typescript
const applyToSelected = async (operation: (nodeId: string) => Promise<void>) => {
  if (selectedNodes.size === 0) {
    showNotification({
      title: 'No nodes selected',
      message: 'Select one or more nodes first',
      color: 'yellow'
    });
    return;
  }

  const results = await Promise.allSettled(
    Array.from(selectedNodes).map(operation)
  );

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  showNotification({
    title: 'Operation complete',
    message: `Success: ${succeeded}, Failed: ${failed}`,
    color: failed > 0 ? 'yellow' : 'green'
  });
};

// Usage
<Button onClick={() => applyToSelected(deleteNode)}>
  Delete Selected ({selectedNodes.size})
</Button>
```

### Select All at Level

```typescript
const selectAllAtLevel = () => {
  const currentCluster = navigation.path[navigation.currentLevel];
  const allNodeIds = new Set(currentCluster.nodeIds);

  setSelectedNodes(allNodeIds);

  // Also save to selections map
  setNavigation(prev => {
    const newSelections = new Map(prev.selections);
    newSelections.set(currentCluster.id, allNodeIds);

    return { ...prev, selections: newSelections };
  });
};
```

## Persistence

### Save to localStorage

```typescript
const saveSelections = (selections: Map<string, Set<string>>) => {
  const serialized = Array.from(selections.entries()).map(([level, nodes]) => ({
    level,
    nodes: Array.from(nodes)
  }));

  localStorage.setItem('graph-selections', JSON.stringify(serialized));
};

useEffect(() => {
  saveSelections(navigation.selections);
}, [navigation.selections]);
```

### Restore from localStorage

```typescript
const restoreSelections = (): Map<string, Set<string>> => {
  const saved = localStorage.getItem('graph-selections');

  if (!saved) return new Map();

  try {
    const parsed = JSON.parse(saved);
    return new Map(
      parsed.map(({ level, nodes }: any) => [level, new Set(nodes)])
    );
  } catch (error) {
    console.error('Failed to restore selections:', error);
    return new Map();
  }
};

useEffect(() => {
  const restored = restoreSelections();
  setNavigation(prev => ({ ...prev, selections: restored }));
}, []);
```

## Multi-Select Patterns

### Shift+Click Range Select

```typescript
const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

const handleNodeClick = (nodeId: string, index: number, event: MouseEvent) => {
  if (event.shiftKey && lastSelectedIndex !== null) {
    // Range select
    const start = Math.min(lastSelectedIndex, index);
    const end = Math.max(lastSelectedIndex, index);

    const rangeIds = nodeIds.slice(start, end + 1);
    setSelectedNodes(new Set([...selectedNodes, ...rangeIds]));
  } else if (event.ctrlKey || event.metaKey) {
    // Toggle single
    const newSelection = new Set(selectedNodes);
    if (newSelection.has(nodeId)) {
      newSelection.delete(nodeId);
    } else {
      newSelection.add(nodeId);
    }
    setSelectedNodes(newSelection);
    setLastSelectedIndex(index);
  } else {
    // Single select
    setSelectedNodes(new Set([nodeId]));
    setLastSelectedIndex(index);
  }
};
```

### Ctrl+A Select All

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault();
      selectAllAtLevel();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [navigation.currentLevel]);
```

## Testing Selection Preservation

### Test Save and Restore

```typescript
it('should preserve selection when navigating', () => {
  const { result } = renderHook(() => useNavigation());

  // Select nodes at root
  act(() => {
    result.current.setSelectedNodes(new Set(['node-1', 'node-2']));
  });

  // Drill down
  act(() => {
    result.current.drillDown(mockCluster);
  });

  // Selection should be cleared at new level
  expect(result.current.selectedNodes.size).toBe(0);

  // Drill back up
  act(() => {
    result.current.drillUp();
  });

  // Selection should be restored
  expect(result.current.selectedNodes).toEqual(
    new Set(['node-1', 'node-2'])
  );
});
```

### Test Deleted Node Handling

```typescript
it('should filter out deleted nodes when restoring', async () => {
  const { result } = renderHook(() => useNavigation());

