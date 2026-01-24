# Export Patterns

**Patterns for exporting data from table-graph hybrid views.**

## Why Export Matters in Hybrid Views

Users understand tables better than graph data structures. Even when working primarily in graph view, they expect CSV export for:

- Sharing with non-technical stakeholders
- Analysis in Excel/Google Sheets
- Importing into other systems
- Creating reports

**Key insight:** Table view isn't just a fallback—it's the export interface.

## Basic Export Pattern

### Export Selected or All

```typescript
const exportToCSV = (entities: Entity[], selectedIds: Set<string>) => {
  // Export selection if exists, otherwise all
  const toExport = selectedIds.size > 0
    ? entities.filter(e => selectedIds.has(e.id))
    : entities;

  const csv = toCSV(toExport);
  downloadFile(`export-${Date.now()}.csv`, csv, 'text/csv');
};

// Button available in both views
<Button
  onClick={() => exportToCSV(filteredEntities, selectedIds)}
  leftIcon={<IconDownload />}
>
  Export {selectedIds.size > 0 ? `${selectedIds.size} Selected` : 'All'}
</Button>
```

### CSV Conversion

```typescript
const toCSV = (entities: Entity[]): string => {
  if (entities.length === 0) {
    return '';
  }

  // Headers from first entity
  const headers = ['id', 'label', 'type', ...Object.keys(entities[0].metadata)];

  // Data rows
  const rows = entities.map(entity => {
    return [
      entity.id,
      escapeCSV(entity.label),
      entity.type,
      ...Object.values(entity.metadata).map(v => escapeCSV(String(v)))
    ];
  });

  // Combine
  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
};

const escapeCSV = (value: string): string => {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};
```

### File Download

```typescript
const downloadFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
```

## Export Options

### Format Selection

Allow users to choose export format:

```typescript
type ExportFormat = 'csv' | 'json' | 'xlsx';

const ExportButton = ({ entities, selectedIds }: {
  entities: Entity[];
  selectedIds: Set<string>;
}) => {
  const [format, setFormat] = useState<ExportFormat>('csv');

  const handleExport = () => {
    const toExport = selectedIds.size > 0
      ? entities.filter(e => selectedIds.has(e.id))
      : entities;

    switch (format) {
      case 'csv':
        downloadFile('export.csv', toCSV(toExport), 'text/csv');
        break;
      case 'json':
        downloadFile('export.json', JSON.stringify(toExport, null, 2), 'application/json');
        break;
      case 'xlsx':
        exportToExcel(toExport);
        break;
    }
  };

  return (
    <div className="flex gap-2">
      <Select
        value={format}
        onChange={setFormat}
        data={[
          { value: 'csv', label: 'CSV' },
          { value: 'json', label: 'JSON' },
          { value: 'xlsx', label: 'Excel' },
        ]}
      />
      <Button onClick={handleExport}>
        Export
      </Button>
    </div>
  );
};
```

### Column Selection

Allow users to choose which columns to export:

```typescript
const ExportWithColumns = ({ entities }: { entities: Entity[] }) => {
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(['id', 'label', 'type'])
  );

  const availableColumns = useMemo(() => {
    const columns = new Set<string>(['id', 'label', 'type']);
    entities.forEach(e => {
      Object.keys(e.metadata).forEach(key => columns.add(key));
    });
    return Array.from(columns);
  }, [entities]);

  const handleExport = () => {
    const csv = toCSVWithColumns(entities, selectedColumns);
    downloadFile('export.csv', csv, 'text/csv');
  };

  return (
    <div>
      <MultiSelect
        data={availableColumns}
        value={Array.from(selectedColumns)}
        onChange={(values) => setSelectedColumns(new Set(values))}
        label="Select columns to export"
      />
      <Button onClick={handleExport}>Export</Button>
    </div>
  );
};

const toCSVWithColumns = (entities: Entity[], columns: Set<string>): string => {
  const headers = Array.from(columns);

  const rows = entities.map(entity => {
    return headers.map(col => {
      if (col === 'id') return entity.id;
      if (col === 'label') return escapeCSV(entity.label);
      if (col === 'type') return entity.type;
      return escapeCSV(String(entity.metadata[col] || ''));
    });
  });

  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
};
```

## Graph-Specific Exports

**Adjacency list:** Export as JSON with `{ nodeId: [neighborIds] }` structure.

**Edge list:** Export as CSV with `source,target,type` columns.

**GraphML format:** For Gephi/Cytoscape import. Build XML with `<node>` and `<edge>` elements.

## Bulk Operations

### Bulk Delete

```typescript
const BulkActions = ({ selectedIds, onDelete }: {
  selectedIds: Set<string>;
  onDelete: (ids: string[]) => void;
}) => {
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      alert('No items selected');
      return;
    }

    const confirmed = confirm(
      `Delete ${selectedIds.size} items? This action cannot be undone.`
    );

    if (confirmed) {
      await onDelete(Array.from(selectedIds));
    }
  };

  return (
    <Button
      onClick={handleBulkDelete}
      disabled={selectedIds.size === 0}
      color="red"
    >
      Delete {selectedIds.size > 0 && `(${selectedIds.size})`}
    </Button>
  );
};
```

### Bulk Tag

```typescript
const BulkTag = ({ selectedIds, onTag }: {
  selectedIds: Set<string>;
  onTag: (ids: string[], tag: string) => void;
}) => {
  const [tag, setTag] = useState('');

  const handleBulkTag = () => {
    if (!tag.trim()) {
      alert('Please enter a tag');
      return;
    }

    onTag(Array.from(selectedIds), tag);
    setTag('');
  };

  return (
    <div className="flex gap-2">
      <TextInput
        value={tag}
        onChange={(e) => setTag(e.target.value)}
        placeholder="Enter tag"
        disabled={selectedIds.size === 0}
      />
      <Button
        onClick={handleBulkTag}
        disabled={selectedIds.size === 0 || !tag.trim()}
      >
        Tag {selectedIds.size > 0 && `(${selectedIds.size})`}
      </Button>
    </div>
  );
};
```

### Bulk Edit

```typescript
const BulkEdit = ({ selectedIds, entities, onUpdate }: {
  selectedIds: Set<string>;
  entities: Entity[];
  onUpdate: (ids: string[], updates: Partial<Entity>) => void;
}) => {
  const [field, setField] = useState<string>('');
  const [value, setValue] = useState<string>('');

  const availableFields = useMemo(() => {
    const fields = new Set<string>(['type', 'status']);
    entities.forEach(e => {
      Object.keys(e.metadata).forEach(key => fields.add(key));
    });
    return Array.from(fields);
  }, [entities]);

  const handleBulkEdit = () => {
    if (!field || !value) {
      alert('Please select a field and enter a value');
      return;
    }

    const updates = field === 'type' || field === 'status'
      ? { [field]: value }
      : { metadata: { [field]: value } };

    onUpdate(Array.from(selectedIds), updates);
  };

  return (
    <div className="flex gap-2">
      <Select
        value={field}
        onChange={setField}
        data={availableFields.map(f => ({ value: f, label: f }))}
        placeholder="Select field"
        disabled={selectedIds.size === 0}
      />
      <TextInput
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Enter value"
        disabled={selectedIds.size === 0}
      />
      <Button
        onClick={handleBulkEdit}
        disabled={selectedIds.size === 0 || !field || !value}
      >
        Update {selectedIds.size > 0 && `(${selectedIds.size})`}
      </Button>
    </div>
  );
};
```

## Action Toolbar

Combine export and bulk operations in a toolbar:

```typescript
const ActionToolbar = ({ entities, selectedIds, onAction }: {
  entities: Entity[];
  selectedIds: Set<string>;
  onAction: (action: string, payload: any) => void;
}) => {
  return (
    <div className="flex gap-4 p-4 border-b">
      <ExportButton entities={entities} selectedIds={selectedIds} />

      <Divider orientation="vertical" />

      <BulkTag
        selectedIds={selectedIds}
        onTag={(ids, tag) => onAction('tag', { ids, tag })}
      />

      <Divider orientation="vertical" />

      <BulkActions
        selectedIds={selectedIds}
        onDelete={(ids) => onAction('delete', { ids })}
      />
    </div>
  );
};
```

## Advanced Patterns

**Excel export:** Use `xlsx` library with `XLSX.utils.json_to_sheet()` for richer formatting.

**Progress indicators:** For large exports (>10K rows), show progress bar and chunk processing to prevent UI freezes.
