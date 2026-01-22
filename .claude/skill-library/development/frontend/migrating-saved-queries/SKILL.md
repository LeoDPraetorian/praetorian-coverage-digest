---
name: migrating-saved-queries
description: Use when migrating saved Query Builder queries from the old format (EntityBlock/LogicalOperator/RelationshipDivider) to the new format (GraphQuery) - provides systematic transformation workflow with validation
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Migrating Saved Queries

**Systematic workflow for migrating saved Query Builder queries from old format to new format.**

## When to Use

Use this skill when:

- Migrating saved queries from chariot1 (old Query Builder) to current version
- Converting `EntityBlock` structures to `GraphQuery` format
- Transforming filter operators and relationship structures
- User provides old saved query JSON that needs migration

## Quick Reference

| Phase                   | Purpose                    | Key Actions                             |
| ----------------------- | -------------------------- | --------------------------------------- |
| 1. Load Documentation   | Understand old/new formats | Read 8 analysis docs + SavedQuery.ts    |
| 2. Parse Old Query      | Extract structure          | Identify blocks, relationships, filters |
| 3. Transform Structure  | Convert to new format      | EntityBlock → GraphQuery.node           |
| 4. Map Operators        | Update operator names      | Old operators → new operators           |
| 5. Handle Special Cases | AD entities, nested groups | Apply entity-specific transformations   |
| 6. Validate Output      | Ensure correctness         | Check required fields, test query       |

**For detailed transformation rules, see:** [references/transformation-rules.md](references/transformation-rules.md)

---

## Prerequisites

### Required Documentation Files

The following 8 files MUST exist in the repository root:

1. `INDEX_SAVED_QUERIES_ANALYSIS.txt` - Master index
2. `README_ANALYSIS_DOCUMENTS.md` - Usage guide
3. `ANALYSIS_SUMMARY.md` - Executive overview
4. `SAVED_QUERIES_FORMAT_ANALYSIS.md` - Complete technical reference
5. `SAVED_QUERIES_TYPES_REFERENCE.ts` - TypeScript definitions
6. `SAVED_QUERIES_MIGRATION_CHECKLIST.md` - Validation guide
7. `SAVED_QUERIES_STRUCTURE_DIAGRAM.md` - Visual hierarchies
8. `SAVED_QUERIES_JSON_STRUCTURES.md` - EntityBlock/LogicalOperator/RelationshipDivider details

### Required Type Definitions

- **New format**: `modules/chariot/ui/src/sections/insights/queryBuilder/types/SavedQuery.ts`
- **Graph queries**: `modules/chariot/ui/src/types.ts` (GraphQuery, NodeDetails, Relationship)
- **Field validation**: `modules/chariot/backend/pkg/query/allowed_columns.go`

---

## Phase 1: Load Documentation

### 1.1 Verify Documentation Exists

```bash
# Check all 8 files exist
for file in INDEX_SAVED_QUERIES_ANALYSIS.txt \
            README_ANALYSIS_DOCUMENTS.md \
            ANALYSIS_SUMMARY.md \
            SAVED_QUERIES_FORMAT_ANALYSIS.md \
            SAVED_QUERIES_TYPES_REFERENCE.ts \
            SAVED_QUERIES_MIGRATION_CHECKLIST.md \
            SAVED_QUERIES_STRUCTURE_DIAGRAM.md \
            SAVED_QUERIES_JSON_STRUCTURES.md; do
  if [[ ! -f "$file" ]]; then
    echo "ERROR: Missing required file: $file"
    exit 1
  fi
done
```

**If files missing**: Cannot proceed. User must provide documentation first.

### 1.2 Read Old Format Documentation

Read in this order for progressive understanding:

1. **Quick start**: `ANALYSIS_SUMMARY.md` (5 min read)
2. **Detailed structure**: `SAVED_QUERIES_JSON_STRUCTURES.md` (complete EntityBlock/LogicalOperator/RelationshipDivider details)
3. **Type reference**: `SAVED_QUERIES_TYPES_REFERENCE.ts` (for copy-paste validation)

**Do NOT skip reading these files.** They contain critical operator mappings, special case handling, and constraint validations.

### 1.3 Read New Format Definitions

```typescript
// Read these files to understand new format
Read("modules/chariot/ui/src/sections/insights/queryBuilder/types/SavedQuery.ts");
Read("modules/chariot/ui/src/types.ts"); // GraphQuery interface
```

### 1.4 Understand Key Differences

**Old Format Structure:**

```
SavedQuery
  └─ blocks[] (EntityBlock)
      └─ filterGroups[]
          └─ filters[] (with old operator names)
  └─ relationshipDividers[] (separate array)
  └─ interGroupOperators[] (AND/OR between blocks)
```

**New Format Structure:**

```
SavedQuery
  └─ query: GraphQuery
      └─ node: NodeDetails
          └─ filters[] (with new operator names)
          └─ relationships[] (nested, not separate)
```

**For complete structural comparison, see:** [references/format-comparison.md](references/format-comparison.md)

---

## Phase 2: Parse Old Query

### 2.1 Extract Top-Level Metadata

From old query JSON, extract:

```typescript
{
  name: string;           // Required
  description?: string;   // Optional
  createdBy: string;      // Required
  createdAt: string;      // ISO 8601
  updatedBy?: string;     // Optional
  updatedAt?: string;     // ISO 8601
}
```

**These fields transfer directly** - no transformation needed.

### 2.2 Identify EntityBlocks

Count and categorize:

```typescript
blocks.forEach((block, index) => {
  console.log(`Block ${index}: ${block.entityType}`);
  console.log(`  Filter groups: ${block.filterGroups.length}`);
  console.log(`  Filters: ${block.filterGroups[0]?.filters.length}`);
});
```

### 2.3 Map RelationshipDividers to Blocks

**Critical constraint**: `relationshipDividers.length === blocks.length - 1`

```typescript
// RelationshipDivider[0] connects Block[0] → Block[1]
// RelationshipDivider[1] connects Block[1] → Block[2]
// etc.
```

### 2.4 Handle Special Entity Types

**ActiveDirectory entities** have exclusive fields:

- `adObjectTypes?: string[]`
- `adObjectTypesNegated?: boolean`

**Port entities** are usually accessed through Asset's HAS_PORT relationship, not as root nodes.

**For entity-specific handling rules, see:** [references/entity-transformations.md](references/entity-transformations.md)

---

## Phase 3: Transform Structure

### 3.1 Create New SavedQuery Skeleton

```typescript
// Generate UUID for the query
const queryId = generateUUID();

// Create the SavedQuery object
const newQuery: SavedQuery = {
  id: queryId,
  type: "graph",
  name: oldQuery.name,
  description: oldQuery.description || "",
  folderId: "custom-queries",
  query: {
    /* Built in next steps */
  },
};

// Wrap in Setting structure
const setting: Setting = {
  name: `saved_query#${queryId}`,
  value: newQuery,
};
```

**CRITICAL**: The final output must be wrapped in a `Setting` structure where:

- `Setting.name` = `"saved_query#" + query.id`
- `Setting.value` = the entire SavedQuery object

### 3.2 Transform Components

**EntityBlock → NodeDetails:**

- First block becomes root node
- Labels from entity type mapping
- Filters from filter groups

**FilterGroups → Filters:**

- Single group: flatten to filter array
- Multiple groups: nest with AND/OR operators
- Transform: `attribute` → `field`, operator names

**RelationshipDividers → Relationships:**

- Each divider connects adjacent blocks
- Add target node structure
- Include optional properties (length, select_one)

**For complete transformation algorithms, see:** [references/transformation-rules.md](references/transformation-rules.md)

---

## Phase 4: Map Operators

**CRITICAL**: Operator names changed between formats.

**Common mappings:**

- `equals` → `=`
- `is any of` → `IN`
- `contains` → `CONTAINS`
- `greater than or equals` → `>=`

**For complete operator mapping table (19 operators), see:** [references/operator-mappings.md](references/operator-mappings.md)

---

## Phase 5: Handle Special Cases

### 5.1 ActiveDirectory Entities

Transform `adObjectTypes` to `class` filter:

```json
// Old: "adObjectTypes": ["user", "computer"]
// New: {"field": "class", "operator": "IN", "value": ["user", "computer"]}
```

### 5.2 Nested Filter Groups

Multiple filter groups with different logical operators require nested structure.

### 5.3 Dropped Fields

Old fields that do NOT transfer:

- `pathOptions` (UI state)
- `source`, `usernames` (metadata)
- `createdBy`, `updatedBy`, `createdAt`, `updatedAt` (audit trail)

**For special case handling, see:** [references/transformation-rules.md#special-transformations](references/transformation-rules.md#special-transformations)

---

## Phase 6: Validate Output

### 6.1 Check Required Fields

**Final Setting structure must have:**

```typescript
interface Setting {
  name: string; // ✅ Format: "saved_query#<uuid>"
  value: SavedQuery; // ✅ Complete SavedQuery object below
}

interface SavedQuery {
  id: string; // ✅ Generated UUID (must match ID in Setting.name)
  type: "graph" | "table"; // ✅ Set to 'graph' or 'table'
  name: string; // ✅ From old query
  description: string; // ✅ From old query or empty string
  folderId: string; // ✅ Default "custom-queries" or user-specified
  query: GraphQuery; // ✅ Transformed structure
}
```

**CRITICAL**: Ensure `Setting.name` ID matches `SavedQuery.id`:

- ✅ Correct: `name: "saved_query#550e8400-..."` and `value.id: "550e8400-..."`
- ❌ Wrong: Mismatched IDs between Setting.name and value.id

### 6.2 Validate Field Names Against allowed_columns.go

**CRITICAL**: Query will fail if fields don't exist.

```bash
# For each filter field, verify it exists
grep -w "fieldname" modules/chariot/backend/pkg/query/allowed_columns.go
```

**Common fields that changed names:**

- Old: `attackSurface` → New: (check if still exists)
- Old: `surface` → New: (verify name)

**For field name changes, see:** [references/field-mappings.md](references/field-mappings.md)

### 6.3 Test Query Structure

**Verify the transformed query is valid JSON:**

```bash
echo "$NEW_QUERY_JSON" | jq . > /dev/null && echo "Valid JSON" || echo "Invalid JSON"
```

### 6.4 Run Against GraphQuery Schema

**Compare against TypeScript interface:**

```typescript
// Read the GraphQuery type
Read("modules/chariot/ui/src/types.ts");

// Manually verify structure matches:
// - node.labels is string[]
// - node.filters is Filter[]
// - relationships is Relationship[]
```

---

## Example Transformation

### Input (Old Format)

```json
{
  "blocks": [
    {
      "entityType": "Vulnerability",
      "filterGroups": [
        {
          "filters": [
            { "attribute": "kev", "operator": "equals", "value": "true" },
            { "attribute": "status", "operator": "equals", "value": "O" }
          ],
          "logicalOperator": "AND"
        }
      ]
    }
  ],
  "name": "PANW KEV",
  "description": "",
  "interGroupOperators": [],
  "relationshipDividers": [],
  "createdAt": "2025-12-31T17:29:27.149Z",
  "createdBy": "user@example.com"
}
```

### Output (New Format)

```json
{
  "name": "saved_query#550e8400-e29b-41d4-a716-446655440000",
  "value": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "graph",
    "name": "PANW KEV",
    "description": "",
    "folderId": "custom-queries",
    "query": {
      "node": {
        "labels": ["Risk"],
        "filters": [
          { "field": "kev", "operator": "=", "value": "true" },
          { "field": "status", "operator": "=", "value": "O" }
        ]
      },
      "limit": 100
    }
  }
}
```

**Key transformations:**

1. Wrapped entire query in `Setting` structure with `name: "saved_query#<id>"`
2. `entityType: "Vulnerability"` → `labels: ["Risk"]`
3. `attribute` → `field`
4. `operator: "equals"` → `operator: "="`
5. Added `id`, `type`, `folderId`, `query.limit`
6. Flattened `filterGroups` (only one group with AND)

**For more examples, see:** [examples/](examples/)

---

## Rationalization Prevention

### "I can infer the structure without reading docs"

❌ **Reality**: 8 documentation files exist because the old format has many special cases. Skipping them causes:

- Missed operator mappings (15+ operator name changes)
- Incorrect ActiveDirectory transformations
- Lost relationship configurations

✅ **Counter**: Phase 1.2 requires reading ANALYSIS_SUMMARY.md and SAVED_QUERIES_JSON_STRUCTURES.md BEFORE any transformation.

### "This is a simple query, I'll skip validation"

❌ **Reality**: Even simple queries can have field name mismatches that cause runtime failures.

✅ **Counter**: Phase 6.2 mandates field validation against `allowed_columns.go` for ALL queries, no exceptions.

### "I'll manually test the query later"

❌ **Reality**: Manual testing is forgotten, queries fail in production.

✅ **Counter**: Phase 6.3 requires JSON validation BEFORE returning output to user. Not optional.

---

## Common Pitfalls

### 1. Forgetting to Transform Operator Names

**Symptom**: Query returns empty results or errors.

**Fix**: Always use `transformOperator()` function from Phase 4.2.

### 2. Incorrect EntityType → Label Mapping

**Symptom**: Query fails with "invalid label" error.

**Fix**: Use mapping table:

- `Asset` → `Asset`
- `Risk` / `Vulnerability` → `Risk`
- `ActiveDirectory` → `ADObject`
- `Port` → `Port`
- `Seed` → `Seed`
- `Technology` → `Technology`

### 3. Missing Nested Relationship Transformations

**Symptom**: Multi-block queries lose relationships.

**Fix**: Phase 3.4 - Convert each RelationshipDivider[i] to `relationships[i]` with target node.

### 4. Not Handling Multiple FilterGroups

**Symptom**: Only first filter group migrates.

**Fix**: Phase 5.2 - Flatten or nest filter groups based on logicalOperator.

**For complete troubleshooting guide, see:** [references/troubleshooting.md](references/troubleshooting.md)

---

## Integration

### Called By

- User requests via: "Migrate this saved query"
- Migration scripts for bulk query updates
- Query Builder import functionality

### Requires (invoke before starting)

| Skill | When | Purpose                       |
| ----- | ---- | ----------------------------- |
| None  | -    | Standalone migration workflow |

### Calls (during execution)

| Skill | Phase/Step | Purpose                   |
| ----- | ---------- | ------------------------- |
| None  | -          | Pure transformation logic |

### Pairs With (conditional)

| Skill                           | Trigger         | Purpose                      |
| ------------------------------- | --------------- | ---------------------------- |
| `constructing-graph-queries`    | After migration | Validate new query structure |
| `validating-graph-query-fields` | Phase 6.2       | Field name validation        |

---

## Related Skills

- `constructing-graph-queries` - Building new GraphQuery structures
- `validating-graph-query-fields` - Field validation against allowed_columns.go
- `frontend-developer` - For implementing migration UI

---

## Changelog

See [.history/CHANGELOG](.history/CHANGELOG) for version history.
