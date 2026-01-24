# Filter Synchronization

**Patterns for synchronized filtering across graph and table views.**

## Core Principle

**Filters apply at the data level, not the view level.** Both graph and table render the same filtered dataset.

```typescript
const filteredEntities = applyFilters(entities, filters);

// Both views use the same filtered data
<GraphView entities={filteredEntities} />
<TableView entities={filteredEntities} />
```

## Filter State Structure

### Complete Filter Definition

```typescript
type FilterState = {
  textSearch: string;
  typeFilters: Set<string>;
  attributeFilters: Record<string, any>;
  dateRange?: { start: Date; end: Date };
  numericRanges?: Record<string, { min: number; max: number }>;
};

const DEFAULT_FILTERS: FilterState = {
  textSearch: '',
  typeFilters: new Set(),
  attributeFilters: {},
};
```

### Filter Application Function

```typescript
const applyFilters = (entities: Entity[], filters: FilterState): Entity[] => {
  return entities.filter(entity => {
    // Text search (case-insensitive, searches label and metadata)
    if (filters.textSearch) {
      const searchLower = filters.textSearch.toLowerCase();
      const matchesLabel = entity.label.toLowerCase().includes(searchLower);
      const matchesMetadata = Object.values(entity.metadata).some(
        value => String(value).toLowerCase().includes(searchLower)
      );

      if (!matchesLabel && !matchesMetadata) {
        return false;
      }
    }

    // Type filters (OR logic - match any selected type)
    if (filters.typeFilters.size > 0) {
      if (!filters.typeFilters.has(entity.type)) {
        return false;
      }
    }

    // Attribute filters (AND logic - must match all)
    for (const [key, value] of Object.entries(filters.attributeFilters)) {
      if (entity.metadata[key] !== value) {
        return false;
      }
    }

    // Date range filter
    if (filters.dateRange) {
      const entityDate = new Date(entity.metadata.createdAt);
      if (entityDate < filters.dateRange.start || entityDate > filters.dateRange.end) {
        return false;
      }
    }

    // Numeric range filters
    if (filters.numericRanges) {
      for (const [key, range] of Object.entries(filters.numericRanges)) {
        const value = Number(entity.metadata[key]);
        if (value < range.min || value > range.max) {
          return false;
        }
      }
    }

    return true;
  });
};
```

## Filter UI Components

### Unified Filter Bar

Single filter bar component used by both views:

```typescript
const FilterBar = ({ filters, onFilterChange, entities }: {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  entities: Entity[];
}) => {
  // Extract unique types from entities
  const availableTypes = useMemo(() => {
    return Array.from(new Set(entities.map(e => e.type)));
  }, [entities]);

  return (
    <div className="flex gap-4 p-4 border-b">
      {/* Text search */}
      <TextInput
        placeholder="Search..."
        value={filters.textSearch}
        onChange={(e) => onFilterChange({
          ...filters,
          textSearch: e.target.value
        })}
      />

      {/* Type filter */}
      <MultiSelect
        data={availableTypes}
        value={Array.from(filters.typeFilters)}
        onChange={(values) => onFilterChange({
          ...filters,
          typeFilters: new Set(values)
        })}
        placeholder="Filter by type"
      />

      {/* Clear filters */}
      <Button
        variant="subtle"
        onClick={() => onFilterChange(DEFAULT_FILTERS)}
      >
        Clear Filters
      </Button>
    </div>
  );
};
```

### Filter Chips (Active Filters Display)

Show active filters as removable chips:

```typescript
const ActiveFilters = ({ filters, onRemoveFilter }: {
  filters: FilterState;
  onRemoveFilter: (filterType: string, value?: any) => void;
}) => {
  const hasActiveFilters = filters.textSearch || filters.typeFilters.size > 0 ||
    Object.keys(filters.attributeFilters).length > 0;

  if (!hasActiveFilters) return null;

  return (
    <div className="flex gap-2 p-2">
      {filters.textSearch && (
        <Chip onRemove={() => onRemoveFilter('textSearch')}>
          Search: {filters.textSearch}
        </Chip>
      )}

      {Array.from(filters.typeFilters).map(type => (
        <Chip key={type} onRemove={() => onRemoveFilter('typeFilter', type)}>
          Type: {type}
        </Chip>
      ))}

      {Object.entries(filters.attributeFilters).map(([key, value]) => (
        <Chip key={key} onRemove={() => onRemoveFilter('attributeFilter', key)}>
          {key}: {value}
        </Chip>
      ))}
    </div>
  );
};
```

## Graph-Specific Filtering

### Visual Dimming (Don't Remove)

Instead of removing filtered nodes from the graph, dim them:

```typescript
const GraphView = ({ entities, filters }: {
  entities: Entity[];
  filters: FilterState;
}) => {
  const filteredIds = useMemo(() => {
    return new Set(applyFilters(entities, filters).map(e => e.id));
  }, [entities, filters]);

  useEffect(() => {
    graph.forEachNode((node) => {
      const isFiltered = filteredIds.has(node);

      // Dim filtered-out nodes instead of hiding them
      graph.setNodeAttribute(node, 'color', isFiltered ? '#3b82f6' : '#e2e8f0');
      graph.setNodeAttribute(node, 'size', isFiltered ? 10 : 5);
      graph.setNodeAttribute(node, 'hidden', !isFiltered); // Or use hidden if preferred
    });

    sigma.refresh();
  }, [filteredIds, graph, sigma]);

  return null;
};
```

**Why dim instead of hide:** Preserves spatial context. Users can still see graph structure.

### Edge Filtering

Filter edges based on node visibility:

```typescript
useEffect(() => {
  graph.forEachEdge((edge, attributes, source, target) => {
    const sourceVisible = filteredIds.has(source);
    const targetVisible = filteredIds.has(target);

    // Only show edge if both ends are visible
    graph.setEdgeAttribute(edge, 'hidden', !(sourceVisible && targetVisible));
  });

  sigma.refresh();
}, [filteredIds, graph, sigma]);
```

## Table-Specific Filtering

**Column filters:** AG Grid supports `agTextColumnFilter` and `agSetColumnFilter`. Sync with global state via `getFilterModel()`.

**Quick filters:** Preset buttons for common scenarios (e.g., "High Priority", "Active Only", "Last 7 Days").

## URL State Synchronization

Persist filters in URL for shareable links:

```typescript
const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

// Encode filters to URL
useEffect(() => {
  const params = new URLSearchParams();

  if (filters.textSearch) {
    params.set('search', filters.textSearch);
  }

  if (filters.typeFilters.size > 0) {
    params.set('types', Array.from(filters.typeFilters).join(','));
  }

  Object.entries(filters.attributeFilters).forEach(([key, value]) => {
    params.set(`filter_${key}`, String(value));
  });

  window.history.replaceState({}, '', `?${params.toString()}`);
}, [filters]);

// Decode filters from URL on mount
useEffect(() => {
  const params = new URLSearchParams(window.location.search);

  const restoredFilters: FilterState = {
    textSearch: params.get('search') || '',
    typeFilters: new Set(params.get('types')?.split(',').filter(Boolean) || []),
    attributeFilters: {},
  };

  // Restore attribute filters (keys starting with 'filter_')
  for (const [key, value] of params.entries()) {
    if (key.startsWith('filter_')) {
      const attrKey = key.replace('filter_', '');
      restoredFilters.attributeFilters[attrKey] = value;
    }
  }

  setFilters(restoredFilters);
}, []);
```

## Performance Optimization

### Memoized Filter Results

Cache filter results to avoid recalculation:

```typescript
const filteredEntities = useMemo(() => {
  return applyFilters(entities, filters);
}, [entities, filters]);
```

### Debounced Text Search

Prevent filtering on every keystroke:

```typescript
const [searchInput, setSearchInput] = useState('');
const debouncedSearch = useDebouncedValue(searchInput, 300);

useEffect(() => {
  onFilterChange({ ...filters, textSearch: debouncedSearch });
}, [debouncedSearch]);

<TextInput
  value={searchInput}
  onChange={(e) => setSearchInput(e.target.value)}
/>
```

### Indexed Lookups

For large datasets, use indexed structures:

```typescript
const entityIndex = useMemo(() => {
  const index = new Map<string, Entity>();
  entities.forEach(e => index.set(e.id, e));
  return index;
}, [entities]);

const typeIndex = useMemo(() => {
  const index = new Map<string, Entity[]>();
  entities.forEach(e => {
    if (!index.has(e.type)) {
      index.set(e.type, []);
    }
    index.get(e.type)!.push(e);
  });
  return index;
}, [entities]);
```

## Filter Count Badge

Show how many items match current filters:

```typescript
const FilterCount = ({ total, filtered }: {
  total: number;
  filtered: number;
}) => {
  if (total === filtered) {
    return <span>{total} items</span>;
  }

  return (
    <span>
      {filtered} of {total} items
      <span className="text-gray-500"> (filtered)</span>
    </span>
  );
};
```
