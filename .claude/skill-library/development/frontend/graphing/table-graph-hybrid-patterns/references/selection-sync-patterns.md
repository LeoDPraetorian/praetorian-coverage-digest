# Selection Sync Patterns

**Patterns for preserving selection state across graph and table views.**

## Core Pattern: Shared Set

The foundation of selection synchronization is a single `Set<string>` that both views reference:

```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
```

**Why Set instead of Array:**
- O(1) lookup: `selectedIds.has(id)`
- No duplicates: Set enforces uniqueness
- Easy diff: `new Set([...a].filter(x => !b.has(x)))`

## Graph View Integration

### Sigma.js Selection

```typescript
import { useSigma } from '@react-sigma/core';

const GraphView = ({ selectedNodes, onSelect }: {
  selectedNodes: Set<string>;
  onSelect: (ids: string[]) => void;
}) => {
  const sigma = useSigma();
  const graph = sigma.getGraph();

  // Apply visual selection state
  useEffect(() => {
    graph.forEachNode((node) => {
      const isSelected = selectedNodes.has(node);
      graph.setNodeAttribute(node, 'highlighted', isSelected);
      graph.setNodeAttribute(node, 'color', isSelected ? '#3b82f6' : '#94a3b8');
    });
    sigma.refresh();
  }, [selectedNodes, graph, sigma]);

  // Handle click events
  useEffect(() => {
    const handleClick = (event: { node: string }) => {
      const currentSelection = Array.from(selectedNodes);

      if (selectedNodes.has(event.node)) {
        // Deselect
        onSelect(currentSelection.filter(id => id !== event.node));
      } else {
        // Select
        onSelect([...currentSelection, event.node]);
      }
    };

    sigma.on('clickNode', handleClick);
    return () => sigma.off('clickNode', handleClick);
  }, [sigma, selectedNodes, onSelect]);

  return null; // Sigma renders to canvas
};
```

### Multi-Select Support

**Shift+Click for range selection:**

```typescript
const [lastClickedNode, setLastClickedNode] = useState<string | null>(null);

const handleNodeClick = (clickedNode: string, shiftKey: boolean) => {
  const currentSelection = Array.from(selectedIds);

  if (shiftKey && lastClickedNode) {
    // Select all nodes between last and current
    const nodeOrder = graph.nodes();
    const startIdx = nodeOrder.indexOf(lastClickedNode);
    const endIdx = nodeOrder.indexOf(clickedNode);
    const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];

    const rangeNodes = nodeOrder.slice(from, to + 1);
    onSelect([...new Set([...currentSelection, ...rangeNodes])]);
  } else {
    // Toggle single node
    if (selectedIds.has(clickedNode)) {
      onSelect(currentSelection.filter(id => id !== clickedNode));
    } else {
      onSelect([...currentSelection, clickedNode]);
    }
  }

  setLastClickedNode(clickedNode);
};
```

**Cmd/Ctrl+Click for multi-select:**

```typescript
const handleClick = (node: string, metaKey: boolean) => {
  if (metaKey) {
    // Add to selection without clearing
    onSelect([...selectedIds, node]);
  } else {
    // Clear and select only this node
    onSelect([node]);
  }
};
```

## Table View Integration

### AG Grid Selection

```typescript
import { AgGridReact } from 'ag-grid-react';

const TableView = ({ entities, selectedRows, onSelect }: {
  entities: Entity[];
  selectedRows: Set<string>;
  onSelect: (ids: string[]) => void;
}) => {
  const gridRef = useRef<AgGridReact>(null);

  // Sync grid selection when external state changes
  useEffect(() => {
    const api = gridRef.current?.api;
    if (!api) return;

    // Clear current selection
    api.deselectAll();

    // Apply new selection
    api.forEachNode((node) => {
      if (selectedRows.has(node.data.id)) {
        node.setSelected(true, false, 'api');
      }
    });
  }, [selectedRows]);

  const handleSelectionChange = () => {
    const api = gridRef.current?.api;
    if (!api) return;

    const selected = api.getSelectedRows().map(row => row.id);
    onSelect(selected);
  };

  return (
    <AgGridReact
      ref={gridRef}
      rowData={entities}
      rowSelection="multiple"
      onSelectionChanged={handleSelectionChange}
    />
  );
};
```

### TanStack Table Selection

```typescript
import { useReactTable, getCoreRowModel } from '@tanstack/react-table';

const TableView = ({ entities, selectedRows, onSelect }: {
  entities: Entity[];
  selectedRows: Set<string>;
  onSelect: (ids: string[]) => void;
}) => {
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  // Sync rowSelection state with external selectedRows
  useEffect(() => {
    const newSelection: Record<string, boolean> = {};
    entities.forEach((entity, idx) => {
      if (selectedRows.has(entity.id)) {
        newSelection[idx] = true;
      }
    });
    setRowSelection(newSelection);
  }, [selectedRows, entities]);

  const table = useReactTable({
    data: entities,
    columns,
    state: { rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: (updater) => {
      const newSelection = typeof updater === 'function'
        ? updater(rowSelection)
        : updater;

      setRowSelection(newSelection);

      // Convert row indices to entity IDs
      const selectedIds = Object.keys(newSelection)
        .filter(key => newSelection[key])
        .map(idx => entities[parseInt(idx)].id);

      onSelect(selectedIds);
    },
    getCoreRowModel: getCoreRowModel(),
  });

  return <table>...</table>;
};
```

## Visual Consistency

### Color Coordination

Use the same accent color for selection in both views:

```typescript
// theme.ts
export const SELECTION_COLOR = '#3b82f6'; // blue-500

// Graph node style
graph.setNodeAttribute(node, 'color', isSelected ? SELECTION_COLOR : '#94a3b8');

// Table row style
<tr className={isSelected ? 'bg-blue-500/10' : ''}>
```

### Selection Badge

Show selection count consistently across views:

```typescript
const SelectionBadge = ({ count }: { count: number }) => {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
      {count} selected
      <button onClick={() => onSelect([])}>Clear</button>
    </div>
  );
};

// Use in both views
<GraphView ... />
<SelectionBadge count={selectedIds.size} />

<TableView ... />
<SelectionBadge count={selectedIds.size} />
```

## Edge Cases

### Deleted Nodes

When entities are deleted, clean up selection:

```typescript
useEffect(() => {
  const entityIds = new Set(entities.map(e => e.id));
  const validSelection = Array.from(selectedIds).filter(id => entityIds.has(id));

  if (validSelection.length !== selectedIds.size) {
    onSelect(validSelection);
  }
}, [entities, selectedIds, onSelect]);
```

### Empty Selection

Handle the case where no items are selected:

```typescript
const exportSelected = () => {
  if (selectedIds.size === 0) {
    // Prompt user: export all or cancel
    if (confirm('No items selected. Export all?')) {
      exportAll();
    }
  } else {
    exportItems(Array.from(selectedIds));
  }
};
```

### Select All

Implement "Select All" for both views:

```typescript
const selectAll = () => {
  const allIds = entities.map(e => e.id);
  onSelect(allIds);
};

const clearSelection = () => {
  onSelect([]);
};

// In toolbar
<Button onClick={selectAll}>Select All</Button>
<Button onClick={clearSelection}>Clear</Button>
```

## Performance Optimization

### Debounced Selection Updates

For large selections (>1000 items), debounce updates:

```typescript
import { useDebouncedValue } from '@mantine/hooks';

const debouncedSelection = useDebouncedValue(selectedIds, 200);

// Use debounced value for visual updates
useEffect(() => {
  updateVisualState(debouncedSelection);
}, [debouncedSelection]);
```

### Memoized Selection Checks

Avoid recalculating selection state:

```typescript
const selectedRowIds = useMemo(() => {
  return new Set(Array.from(selectedIds));
}, [selectedIds]);

// In row render
const isSelected = selectedRowIds.has(row.id);
```
