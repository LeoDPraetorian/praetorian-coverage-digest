# Drawer Integration

**Patterns for side-by-side graph and table views using drawer components.**

## Core Pattern: Opposite View in Drawer

When the main panel shows a graph, the drawer shows a table, and vice versa. This enables users to compare spatial and tabular representations simultaneously.

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

    <Drawer
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      position="right"
      width={600}
    >
      {primaryView === 'graph' ? (
        <TableView compact />
      ) : (
        <GraphView compact />
      )}
    </Drawer>
  </Layout>
);
```

## Chariot Drawer Integration

### Using Existing Drawer Component

Chariot's drawer component (`modules/chariot/ui/src/components/Drawer.tsx`) supports this pattern:

```typescript
import { Drawer } from '@/components/Drawer';

const HybridView = () => {
  const [drawerContent, setDrawerContent] = useState<'table' | 'graph' | null>(null);

  return (
    <>
      <GraphView onShowTable={() => setDrawerContent('table')} />

      <Drawer
        opened={drawerContent !== null}
        onClose={() => setDrawerContent(null)}
        title={drawerContent === 'table' ? 'Table View' : 'Graph View'}
        size="xl"
      >
        {drawerContent === 'table' ? (
          <TableView compact />
        ) : (
          <GraphView compact />
        )}
      </Drawer>
    </>
  );
};
```

### Drawer Width Breakpoints

Choose drawer width based on content:

```typescript
const DRAWER_WIDTHS = {
  table: 800,    // Wide for multi-column tables
  graph: 600,    // Narrower for compact graph
  details: 400,  // Narrow for node details
};

<Drawer width={drawerContent === 'table' ? DRAWER_WIDTHS.table : DRAWER_WIDTHS.graph}>
```

## Compact View Variants

### Compact Table

Reduce columns and row height for drawer display:

```typescript
const TableView = ({ compact = false }: { compact?: boolean }) => {
  const columns = compact
    ? [
        { field: 'label', headerName: 'Name', flex: 1 },
        { field: 'type', headerName: 'Type', width: 100 },
      ]
    : [
        { field: 'label', headerName: 'Name', flex: 1 },
        { field: 'type', headerName: 'Type', width: 120 },
        { field: 'status', headerName: 'Status', width: 120 },
        { field: 'createdAt', headerName: 'Created', width: 150 },
        { field: 'metadata', headerName: 'Details', flex: 1 },
      ];

  return (
    <AgGridReact
      columnDefs={columns}
      rowHeight={compact ? 40 : 56}
      domLayout={compact ? 'autoHeight' : 'normal'}
    />
  );
};
```

### Compact Graph

Reduce graph size and disable expensive features:

```typescript
const GraphView = ({ compact = false }: { compact?: boolean }) => {
  const settings = compact
    ? {
        renderEdgeLabels: false,
        enableHovering: false,
        minCameraRatio: 0.5,
        maxCameraRatio: 2,
      }
    : {
        renderEdgeLabels: true,
        enableHovering: true,
        minCameraRatio: 0.1,
        maxCameraRatio: 10,
      };

  return (
    <SigmaContainer
      style={{ height: compact ? '400px' : '100%' }}
      settings={settings}
    >
      <GraphRenderer />
    </SigmaContainer>
  );
};
```

## Use Case Patterns

### Pattern 1: Graph Primary + Table Details

**When to use:** Spatial relationships are primary concern, table provides detail inspection.

**Example: Network infrastructure visualization**

```typescript
const InfrastructureView = () => {
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Layout>
      <MainPanel>
        <GraphView
          selectedNodes={selectedAssets}
          onSelect={setSelectedAssets}
          onShowDetails={() => setDrawerOpen(true)}
        />
      </MainPanel>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <TableView
          entities={entities.filter(e => selectedAssets.has(e.id))}
          compact
        />
        <ExportButton entities={entities.filter(e => selectedAssets.has(e.id))} />
      </Drawer>
    </Layout>
  );
};
```

**Interaction flow:**
1. User explores graph spatially
2. User selects nodes of interest
3. User opens drawer to see details in table
4. User exports selected nodes from drawer

### Pattern 2: Table Primary + Graph Context

**When to use:** Data analysis is primary concern, graph provides relationship context.

**Example: Asset list with dependency visualization**

```typescript
const AssetListView = () => {
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Layout>
      <MainPanel>
        <TableView
          entities={entities}
          selectedRows={selectedAssets}
          onSelect={setSelectedAssets}
          onShowGraph={() => setDrawerOpen(true)}
        />
      </MainPanel>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <GraphView
          entities={entities.filter(e => selectedAssets.has(e.id))}
          compact
        />
      </Drawer>
    </Layout>
  );
};
```

**Interaction flow:**
1. User filters/sorts table to find assets
2. User selects multiple rows
3. User opens drawer to visualize relationships
4. User sees how selected assets connect

### Pattern 3: Detail Panel (Not Opposite View)

**Alternative:** Show detail panel for selected item instead of opposite view.

```typescript
const HybridViewWithDetails = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const selectedEntity = entities.find(e => e.id === selectedId);

  return (
    <Layout>
      <MainPanel>
        <GraphView onNodeClick={(id) => {
          setSelectedId(id);
          setDrawerOpen(true);
        }} />
      </MainPanel>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} width={400}>
        {selectedEntity && (
          <EntityDetails entity={selectedEntity} />
        )}
      </Drawer>
    </Layout>
  );
};
```

## State Synchronization Across Drawer

### Selection Sync

Selection changes in drawer should reflect in main view:

```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

// Main view
<GraphView
  selectedNodes={selectedIds}
  onSelect={(ids) => setSelectedIds(new Set(ids))}
/>

// Drawer (shares same state)
<Drawer>
  <TableView
    selectedRows={selectedIds}
    onSelect={(ids) => setSelectedIds(new Set(ids))}
  />
</Drawer>
```

### Filter Sync

Filters applied in drawer affect main view:

```typescript
const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

const filteredEntities = applyFilters(entities, filters);

// Both views see filtered data
<GraphView entities={filteredEntities} />

<Drawer>
  <FilterBar filters={filters} onFilterChange={setFilters} />
  <TableView entities={filteredEntities} />
</Drawer>
```

## Drawer Trigger Patterns

### Automatic Open on Selection

Open drawer automatically when user selects items:

```typescript
const handleSelect = (ids: string[]) => {
  setSelectedIds(new Set(ids));

  if (ids.length > 0) {
    setDrawerOpen(true);
  }
};
```

### Explicit Button

Require user action to open drawer:

```typescript
<Button
  onClick={() => setDrawerOpen(true)}
  disabled={selectedIds.size === 0}
>
  View Details ({selectedIds.size})
</Button>
```

### Context Menu

Open drawer via right-click menu:

```typescript
const handleContextMenu = (event: React.MouseEvent, nodeId: string) => {
  event.preventDefault();

  showContextMenu([
    {
      label: 'Show in Table',
      onClick: () => {
        setSelectedIds(new Set([nodeId]));
        setDrawerOpen(true);
      },
    },
  ]);
};
```

## Responsive Patterns

**Mobile (<768px):** Use full-screen `Modal` instead of drawer.

**Tablet/Desktop:** Resizable drawer with `minWidth={400}` and `maxWidth={1200}`.

## Performance & Accessibility

**Lazy loading:** Use `{drawerOpen && <Content />}` to defer rendering until needed.

**Unmount on close:** Set `unmountOnExit` prop to free memory when drawer closes.

**Focus management:** Move focus to drawer on open: `drawerRef.current?.focus()`.

**Keyboard shortcuts:** Support `Escape` to close, `Cmd+D` to toggle, `Tab` for navigation.

**Screen readers:** Use `aria-label` and `aria-live="polite"` to announce drawer state changes.
