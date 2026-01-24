---
name: table-graph-hybrid-patterns
description: Use when implementing views that switch between graph and table representations - provides patterns for selection preservation, filter synchronization, smooth transitions, and drawer integration
allowed-tools: Read, Grep, Glob
---

# Table-Graph Hybrid Patterns

**Patterns for switching between graph and table views of the same data.**

## When to Use

Use this skill when:

- Users need both spatial (graph) and tabular (list) representations
- Dataset too large for graph (fallback to table)
- Users want detail inspection (table) while maintaining overview (graph)
- Exporting/filtering operations easier in table format

**Common use cases:**
- Network visualization with node detail panels
- Infrastructure mapping with asset tables
- Security findings with graph relationships
- Large datasets requiring progressive disclosure

**Anti-pattern:** Using separate components with separate state (causes selection/filter desync)

## Quick Reference

| Pattern | Purpose | Key Principle |
|---------|---------|---------------|
| Shared Data Model | Single source of truth | Graph and table operate on SAME data |
| Selection Preservation | Cross-view consistency | Single `Set<string>` for both views |
| Filter Synchronization | Unified filtering | Apply filters at data level, not view level |
| Smooth Transitions | Professional UX | 150ms fade prevents jarring swaps |
| Drawer Integration | Side-by-side comparison | Show opposite view in drawer |

---

## Core Patterns

### 1. Shared Data Model

**Single Source of Truth:**

```typescript
type Entity = {
  id: string;
  label: string;
  type: string;
  metadata: Record<string, any>;
};

type ViewState = {
  entities: Entity[];           // Shared data
  selectedIds: Set<string>;     // Shared selection
  filters: FilterState;         // Shared filters
  viewMode: 'graph' | 'table'; // Current view
};
```

**Key Principle:** Graph and table operate on SAME data structure. View mode is just rendering preference.

**Why this works:**
- Selection syncs automatically (same Set reference)
- Filters apply to both (same FilterState)
- Switching views doesn't reload data

**See:** [Selection Sync Patterns](references/selection-sync-patterns.md) for implementation details.

### 2. Selection Preservation

**Pattern: Shared Selection State**

```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

// Graph selection
const onGraphSelect = (nodeIds: string[]) => {
  setSelectedIds(new Set(nodeIds));
};

// Table selection
const onTableSelect = (rowIds: string[]) => {
  setSelectedIds(new Set(rowIds));
};

// Highlight in current view
{viewMode === 'graph' ? (
  <GraphView selectedNodes={selectedIds} onSelect={onGraphSelect} />
) : (
  <TableView selectedRows={selectedIds} onSelect={onTableSelect} />
)}
```

**Visual consistency:**
- Graph: Selected nodes use accent color border
- Table: Selected rows use same accent color background
- Both: Selection badge shows count "5 selected"

### 3. Synchronized Filtering

**Filter State Structure:**

```typescript
type FilterState = {
  textSearch: string;
  typeFilters: Set<string>;
  attributeFilters: Record<string, any>;
};

const applyFilters = (entities: Entity[], filters: FilterState) => {
  return entities.filter(e => {
    if (filters.textSearch && !e.label.includes(filters.textSearch)) {
      return false;
    }
    if (filters.typeFilters.size > 0 && !filters.typeFilters.has(e.type)) {
      return false;
    }
    for (const [key, value] of Object.entries(filters.attributeFilters)) {
      if (e.metadata[key] !== value) return false;
    }
    return true;
  });
};
```

**Key insight:** Filters applied at data level, not view level. Both views see filtered data.

**See:** [Filter Synchronization](references/filter-synchronization.md) for complete patterns.

### 4. View Switching with Animation

**Smooth Transition Pattern:**

```typescript
const [viewMode, setViewMode] = useState<'graph' | 'table'>('graph');
const [isTransitioning, setIsTransitioning] = useState(false);

const switchView = (newMode: 'graph' | 'table') => {
  setIsTransitioning(true);

  setTimeout(() => {
    setViewMode(newMode);
    setTimeout(() => setIsTransitioning(false), 150);
  }, 150);
};
```

**CSS:**
```css
.view-container {
  transition: opacity 150ms ease-in-out;
}
.view-container.transitioning {
  opacity: 0;
}
```

**Alternative:** Slide transitions use `transform: translateX()` for horizontal movement.

---

## Drawer Integration

**Side-by-Side Pattern:**

```typescript
const [drawerOpen, setDrawerOpen] = useState(false);
const [primaryView, setPrimaryView] = useState<'graph' | 'table'>('graph');

return (
  <Layout>
    <MainPanel>
      {primaryView === 'graph' ? (
        <GraphView onShowDetails={() => setDrawerOpen(true)} />
      ) : (
        <TableView onShowDetails={() => setDrawerOpen(true)} />
      )}
    </MainPanel>

    <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} width={600}>
      {primaryView === 'graph' ? (
        <TableView compact />
      ) : (
        <GraphView compact />
      )}
    </Drawer>
  </Layout>
);
```

**Use cases:**
- Graph primary + table drawer: Spatial overview with detail inspection
- Table primary + graph drawer: Data analysis with relationship context

**Chariot integration:** Existing drawer in `modules/chariot/ui/src/components/Drawer.tsx` supports this pattern.

**See:** [Drawer Integration](references/drawer-integration.md) for layout patterns.

---

## Export and Bulk Operations

**Why table view matters:**
- CSV export (users understand tables, not adjacency lists)
- Bulk edit/delete (easier with checkboxes than graph selection)
- Sorting and advanced filtering (AG Grid features)

**Export pattern:**

```typescript
const exportToCSV = (entities: Entity[], selectedIds: Set<string>) => {
  const toExport = selectedIds.size > 0
    ? entities.filter(e => selectedIds.has(e.id))
    : entities;

  const csv = toCSV(toExport);
  downloadFile('export.csv', csv);
};
```

**See:** [Export Patterns](references/export-patterns.md) for bulk operations.

---

## Performance Optimization

### Virtualization for Large Tables

**Use TanStack Virtual for >1000 rows:**

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const TableView = ({ entities }: { entities: Entity[] }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: entities.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 10
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(item => (
          <Row key={item.key} entity={entities[item.index]} />
        ))}
      </div>
    </div>
  );
};
```

### Lazy Loading

**Load table data on demand:**

```typescript
const TableView = ({ entityIds }: { entityIds: string[] }) => {
  const { data: entities, isLoading } = useQuery({
    queryKey: ['entities', entityIds],
    queryFn: () => fetchEntities(entityIds),
    enabled: viewMode === 'table',
  });

  if (isLoading) return <Skeleton />;
  return <Table data={entities} />;
};
```

**Why:** Graph only needs node IDs + positions. Table needs full entity data. Defer expensive fetch.

---

## View Mode Persistence

**Remember user preference:**

```typescript
useEffect(() => {
  localStorage.setItem('preferredViewMode', viewMode);
}, [viewMode]);

useEffect(() => {
  const saved = localStorage.getItem('preferredViewMode');
  if (saved === 'table' || saved === 'graph') {
    setViewMode(saved);
  }
}, []);
```

**URL state for deep linking:**

```typescript
const url = `/assets?view=${viewMode}&selected=${Array.from(selectedIds).join(',')}`;
```

---

## Fallback Trigger Logic

**When to force table view:**

```typescript
const MAX_GRAPH_NODES = 1000;
const MAX_CLUSTER_DEPTH = 5;

const shouldForceTable = (cluster: Cluster, depth: number) => {
  return cluster.size > MAX_GRAPH_NODES && depth >= MAX_CLUSTER_DEPTH;
};

if (shouldForceTable(currentCluster, currentDepth)) {
  return (
    <>
      <FallbackMessage
        title="Too many nodes to visualize"
        description={`This cluster contains ${currentCluster.size} nodes. Showing table view instead.`}
        action={<Button onClick={() => trySubCluster()}>Try Sub-Clustering</Button>}
      />
      <TableView entities={currentCluster.nodes} />
    </>
  );
}
```

---

## Common Anti-Patterns

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Separate state for graph/table | Selection desync | Single shared state |
| Reloading data on view switch | Slow, wasteful | Load once, render twice |
| No loading state | Jarring instant swap | Fade animation |
| Graph-only export | Users can't export | Add CSV export in table view |
| No view persistence | Users lose preference | localStorage + URL state |

---

## Accessibility

**Keyboard navigation:**
- `Tab` to switch between views
- `Space` to toggle view mode
- Arrow keys work in both (graph pan, table scroll)

**Screen readers:**
```typescript
<button
  onClick={() => switchView('table')}
  aria-label={`Switch to table view. Currently viewing ${viewMode}.`}
  aria-pressed={viewMode === 'table'}
>
  Table View
</button>
```

**Focus management:**
```typescript
useEffect(() => {
  if (viewMode === 'table') {
    tableRef.current?.querySelector('tr')?.focus();
  } else {
    canvasRef.current?.focus();
  }
}, [viewMode]);
```

---

## Integration

### Called By

- Graph Explorer feature implementation
- Any component offering both graph and table views
- Asset/Risk/Finding list pages with graph relationships

### Requires (invoke before starting)

None - foundational UI pattern skill

### Calls (during execution)

None - provides patterns, doesn't invoke other skills

### Pairs With (conditional)

- **`hierarchical-graph-navigation`** (LIBRARY) - When implementing navigation between views
  - `Read(".claude/skill-library/development/frontend/graphing/hierarchical-graph-navigation/SKILL.md")`
- **`optimizing-large-data-visualization`** (LIBRARY) - For virtualization patterns
  - `Read(".claude/skill-library/development/frontend/graphing/optimizing-large-data-visualization/SKILL.md")`
- **`prefetching-react-routes`** (LIBRARY) - For URL state patterns
  - `Read(".claude/skill-library/development/frontend/prefetching-react-routes/SKILL.md")`

---

## Sources

- Cambridge Intelligence - Large Networks: https://cambridge-intelligence.com/visualize-large-networks/
- AG Grid Documentation: https://www.ag-grid.com/
- TanStack Virtual: https://tanstack.com/virtual/latest
- Research validation report: `.claude/.output/plans/2026-01-19-081938-graph-explorer-100k-scale/research-validation-report.md`
- Chariot Drawer: `modules/chariot/ui/src/components/Drawer.tsx`
- Chariot Table: `modules/chariot/ui/src/components/Table/`
