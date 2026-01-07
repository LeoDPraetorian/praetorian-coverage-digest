# Transformation Rules

Complete transformation rules for migrating old saved queries to new format.

## Entity Type to Label Mapping

| Old Entity Type   | New Label    | Notes                           |
| ----------------- | ------------ | ------------------------------- |
| `Asset`           | `Asset`      | Direct mapping                  |
| `Risk`            | `Risk`       | Direct mapping                  |
| `Vulnerability`   | `Risk`       | Maps to Risk label              |
| `ActiveDirectory` | `ADObject`   | Special handling required       |
| `Port`            | `Port`       | Usually nested in relationships |
| `Attribute`       | `Attribute`  | Usually nested in relationships |
| `Seed`            | `Seed`       | Direct mapping                  |
| `Technology`      | `Technology` | Direct mapping                  |
| `Job`             | `Job`        | Direct mapping                  |

## Filter Group Flattening Algorithm

### Single Filter Group (Simple Case)

**Old:**

```json
{
  "filterGroups": [
    {
      "filters": [
        { "attribute": "status", "operator": "equals", "value": "A" },
        { "attribute": "private", "operator": "not equals", "value": true }
      ],
      "logicalOperator": "AND"
    }
  ]
}
```

**New:**

```json
{
  "filters": [
    { "field": "status", "operator": "=", "value": "A" },
    { "field": "private", "operator": "!=", "value": true }
  ]
}
```

**Algorithm:**

1. Extract all filters from the single group
2. Transform each filter (attribute→field, operator name)
3. Place in flat `filters` array
4. LogicalOperator is implicit (AND by default in new format)

### Multiple Filter Groups (Complex Case)

**Old:**

```json
{
  "filterGroups": [
    {
      "filters": [{ "attribute": "status", "operator": "equals", "value": "A" }],
      "logicalOperator": "AND"
    },
    {
      "filters": [{ "attribute": "severity", "operator": "is any of", "value": ["C", "H"] }],
      "logicalOperator": "OR"
    }
  ]
}
```

**New (nested structure):**

```json
{
  "filters": [
    {
      "field": "",
      "operator": "AND",
      "value": [
        { "field": "status", "operator": "=", "value": "A" },
        {
          "field": "",
          "operator": "OR",
          "value": [{ "field": "severity", "operator": "IN", "value": ["C", "H"] }]
        }
      ]
    }
  ]
}
```

**Algorithm:**

1. First group becomes root-level filters with AND wrapper
2. Subsequent groups nest inside based on their logicalOperator
3. Each nested level creates a filter with empty field and operator as logicalOperator
4. Actual filters go in the `value` array

**Important**: Multiple filter groups within same EntityBlock are ALWAYS combined with implicit AND at top level.

## Nested Filters

When old format has multiple filterGroups with different logicalOperators, create nested structure:

```typescript
function flattenFilterGroups(groups: FilterGroup[]): Filter[] {
  if (groups.length === 1) {
    // Simple case: just transform filters
    return groups[0].filters.map(transformFilter);
  }

  // Complex case: nest groups
  return [
    {
      field: "",
      operator: "AND", // Top-level is always AND
      value: groups.map((group) => {
        if (group.filters.length === 1) {
          return transformFilter(group.filters[0]);
        }
        return {
          field: "",
          operator: group.logicalOperator,
          value: group.filters.map(transformFilter),
        };
      }),
    },
  ];
}
```

## Relationship Transformations

### Simple Relationship (No Configuration)

**Old:**

```json
{
  "id": "uuid-1",
  "config": {
    "logicalOperator": "AND",
    "relationshipType": "HAS_VULNERABILITY"
  }
}
```

**New:**

```json
{
  "label": "HAS_VULNERABILITY",
  "target": {
    "labels": ["Risk"],
    "filters": [...]
  }
}
```

### Relationship with Path Length

**Old:**

```json
{
  "id": "uuid-2",
  "config": {
    "logicalOperator": "AND",
    "relationshipType": "AdminTo",
    "length": 3
  }
}
```

**New:**

```json
{
  "label": "AdminTo",
  "length": 3,
  "target": {
    "labels": ["ADObject"],
    "filters": [...]
  }
}
```

### Multiple Relationship Types (OR)

**Old:**

```json
{
  "id": "uuid-3",
  "config": {
    "logicalOperator": "OR",
    "relationshipTypes": ["HAS_VULNERABILITY", "HAS_ATTRIBUTE"]
  }
}
```

**New:**

```json
{
  "label": ["HAS_VULNERABILITY", "HAS_ATTRIBUTE"],
  "target": {
    "labels": ["Risk"],
    "filters": [...]
  }
}
```

**Note**: When `logicalOperator: "OR"`, the `relationshipTypes` array becomes the `label` array.

### Optional Relationship Properties

| Old Config Property | New Property | Type      | Description                                |
| ------------------- | ------------ | --------- | ------------------------------------------ |
| `length`            | `length`     | `number`  | Path length in hops                        |
| `selectOne`         | `select_one` | `boolean` | Select only one matching path              |
| N/A                 | `optional`   | `boolean` | Relationship is optional (new format only) |
| N/A                 | `not_exists` | `boolean` | Negate relationship (new format only)      |

## ActiveDirectory Special Transformations

### adObjectTypes → Class Filter

**Old:**

```json
{
  "entityType": "ActiveDirectory",
  "adObjectTypes": ["user", "computer"],
  "adObjectTypesNegated": false,
  "filterGroups": [...]
}
```

**New:**

```json
{
  "labels": ["ADObject"],
  "filters": [
    {"field": "class", "operator": "IN", "value": ["user", "computer"]},
    ... // other filters from filterGroups
  ]
}
```

### adObjectTypesNegated Handling

If `adObjectTypesNegated: true`:

**New:**

```json
{
  "filters": [{ "field": "class", "operator": "NOT IN", "value": ["user", "computer"] }]
}
```

**Algorithm:**

1. Change label: `ActiveDirectory` → `ADObject`
2. Create filter: `field: "class"`
3. Operator: `IN` if not negated, `NOT IN` if negated
4. Value: `adObjectTypes` array
5. Prepend to existing filters from filterGroups

## Value Type Conversions

### String Values

**Old:** `"value": "A"`
**New:** `"value": "A"` (no change)

### Boolean Values

**Old:** `"value": true`
**New:** `"value": true` (no change)

### Array Values

**Old:** `"value": ["C", "H", "M"]`
**New:** `"value": ["C", "H", "M"]` (no change)

### Numeric Values

**Old:** `"value": 443`
**New:** `"value": 443` (no change)

### ISO 8601 Timestamps

**Old:** `"value": "2025-12-31T17:29:27.149Z"`
**New:** `"value": "2025-12-31T17:29:27.149Z"` (no change)

## Metadata Field Mapping

### Fields That Transfer Directly

| Old Field     | New Field     | Transformation                     |
| ------------- | ------------- | ---------------------------------- |
| `name`        | `name`        | None                               |
| `description` | `description` | Default to empty string if missing |
| `createdBy`   | N/A           | Not in new format                  |
| `createdAt`   | N/A           | Not in new format                  |
| `updatedBy`   | N/A           | Not in new format                  |
| `updatedAt`   | N/A           | Not in new format                  |

**Note**: New format drops audit fields (createdBy, createdAt, updatedBy, updatedAt). These may be stored separately in a settings metadata layer.

### Fields That Are Generated

| New Field  | Source                | Generation Rule                  |
| ---------- | --------------------- | -------------------------------- |
| `id`       | Generated             | New UUID (do NOT reuse old IDs)  |
| `type`     | Default or inferred   | `'graph'` (default) or `'table'` |
| `folderId` | Default or user input | `'user-queries'` (default)       |

### Fields That Are Dropped

| Old Field             | Reason                             |
| --------------------- | ---------------------------------- |
| `interGroupOperators` | Encoded in nested filter structure |
| `pathOptions`         | UI state, not query definition     |
| `source`              | Metadata, not query definition     |
| `usernames`           | ACL, stored separately             |
| `createdBy`           | Audit trail, stored separately     |
| `createdAt`           | Audit trail, stored separately     |
| `updatedBy`           | Audit trail, stored separately     |
| `updatedAt`           | Audit trail, stored separately     |

## Format Comparison Summary

| Aspect        | Old Format                  | New Format                    |
| ------------- | --------------------------- | ----------------------------- |
| Structure     | Flat blocks array           | Nested node/relationships     |
| Operators     | Verbose names               | Symbols/UPPERCASE             |
| Relationships | Separate dividers array     | Nested in node.relationships  |
| Filter Groups | Array with logicalOperator  | Flattened or nested structure |
| AD Entities   | Special adObjectTypes field | Class filter                  |
| Metadata      | Embedded in query           | Separate (id, type, folderId) |
