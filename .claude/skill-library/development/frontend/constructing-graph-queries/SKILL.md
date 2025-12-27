---
name: constructing-graph-queries
description: Use when constructing Neo4j graph queries for useMy/useGraphQuery hooks - covers Query/Node/Relationship/Filter structure, filter operators, dynamic field validation against allowed_columns.go, and common query patterns
allowed-tools: Read, Bash, Grep, Glob
---

# Constructing Graph Queries

Reference for building graph queries in the Chariot frontend using `useMy()` and `useGraphQuery()` hooks. Queries are sent to the `/my` endpoint which validates against Neo4j.

## When to Use This Skill

- Constructing graph queries with `useMy()` or `useGraphQuery()` hooks
- Validating filter fields before query execution
- Building relationship traversals between entities
- Debugging "invalid filter column" errors
- Understanding Query/Node/Relationship/Filter structure

**You MUST use TodoWrite** to track progress when constructing complex queries with multiple filters or relationships.

## Source of Truth - CRITICAL

**NEVER hardcode or memorize field lists.** The allowed fields change frequently (currently 200+).

**Always validate against the source file:**

```
modules/chariot/backend/pkg/query/allowed_columns.go
```

### Field Validation Commands

```bash
# Check if a specific field is allowed
grep -w "fieldname" modules/chariot/backend/pkg/query/allowed_columns.go

# Search for fields by pattern
grep -i "cloud" modules/chariot/backend/pkg/query/allowed_columns.go

# Count total allowed fields
grep "true" modules/chariot/backend/pkg/query/allowed_columns.go | wc -l
```

**If field not found**: Query will fail with `"invalid filter column: {field}"`.

---

## Quick Reference

### Query Structure

```typescript
interface GraphQuery {
  node: Node;                    // Root node to match (required)
  limit?: number;                // Max results (default varies, max 10000)
  orderBy?: string;              // Sort field (must be in allowedColumns)
  descending?: boolean;          // Sort direction
  page?: number;                 // Pagination offset
}

interface Node {
  labels?: string[];             // Entity types: ["Asset"], ["Risk"]
  filters?: Filter[];            // Conditions on this node
  relationships?: Relationship[];// Connected entities
  alias?: string;                // Reference name for complex filters
}

interface Relationship {
  label: string | string[];      // Relationship type(s)
  source?: Node;                 // Incoming (use ONE of source/target)
  target?: Node;                 // Outgoing (use ONE of source/target)
  filters?: Filter[];            // Conditions on relationship
  optional?: boolean;            // LEFT JOIN behavior
  length?: number;               // Variable-length path (max hops)
  not_exists?: boolean;          // Negative pattern matching
}

interface Filter {
  field: string;                 // Column (MUST be in allowedColumns)
  operator: string;              // Comparison operator
  value: any;                    // Value(s) to compare
  not?: boolean;                 // Negate condition
  alias?: string;                // Target specific node
}
```

### Filter Operators

| Operator       | Description              | Example Value        |
| -------------- | ------------------------ | -------------------- |
| `=`            | Exact match              | `"A"`                |
| `CONTAINS`     | Case-insensitive substr  | `"prod"`             |
| `<` `<=`       | Less than (or equal)     | `7`                  |
| `>` `>=`       | Greater than (or equal)  | `0.5`                |
| `STARTS WITH`  | Prefix match             | `"api."`             |
| `ENDS WITH`    | Suffix match             | `".com"`             |
| `IN`           | Value in array           | `["ipv4", "domain"]` |
| `IS NOT NULL`  | Field exists             | `null`               |
| `IS NULL`      | Field missing            | `null`               |
| `OR`           | Logical OR (nested)      | `[Filter, Filter]`   |
| `AND`          | Logical AND (nested)     | `[Filter, Filter]`   |

**See:** [references/filter-operators.md](references/filter-operators.md) for detailed examples.

### Common Labels (Entity Types)

| Label            | Description                        |
| ---------------- | ---------------------------------- |
| `Asset`          | Domains, IPs, external resources   |
| `Risk`           | Security vulnerabilities/findings  |
| `Seed`           | Discovery starting points          |
| `Attribute`      | Asset properties/metadata          |
| `Technology`     | Software/technology stack          |
| `Vulnerability`  | CVE definitions                    |
| `Port`           | Network ports                      |
| `Webpage`        | Web pages                          |
| `WebApplication` | Web applications                   |

---

## Frontend Hook Usage

### useMy Hook

```typescript
import { useMy } from '@/hooks/useMy';

// Simple key-based query
const { data } = useMy({
  resource: 'asset',
  query: '#asset#example.com'
});

// Graph query with filters
const { data } = useMy({
  resource: 'asset',
  query: {
    node: {
      labels: ['Asset'],
      filters: [
        { field: 'status', operator: '=', value: 'A' },
        { field: 'class', operator: '=', value: 'domain' }
      ]
    }
  }
});

// Paginated results
const { data, fetchNextPage, hasNextPage } = useMy({
  resource: 'risk',
  query: {
    node: {
      labels: ['Risk'],
      filters: [{ field: 'cvss', operator: '>=', value: 7 }]
    },
    limit: 50,
    orderBy: 'cvss',
    descending: true
  }
});
```

### useGraphQuery Hook

```typescript
import { useGraphQuery } from '@/hooks/useGraphQuery';

const { data } = useGraphQuery({
  query: {
    node: {
      labels: ['Asset'],
      relationships: [{
        label: 'HAS',
        target: {
          labels: ['Risk'],
          filters: [{ field: 'cvss', operator: '>=', value: 9 }]
        }
      }]
    },
    limit: 100
  }
});
```

---

## Common Query Patterns

### Pattern 1: Filter by Status and Class

```typescript
const query = {
  node: {
    labels: ['Asset'],
    filters: [
      { field: 'status', operator: '=', value: 'A' },
      { field: 'class', operator: '=', value: 'domain' }
    ]
  },
  limit: 100
};
```

### Pattern 2: High-Severity Risks (Sorted)

```typescript
const query = {
  node: {
    labels: ['Risk'],
    filters: [
      { field: 'status', operator: '=', value: 'T' },
      { field: 'cvss', operator: '>=', value: 7 }
    ]
  },
  orderBy: 'cvss',
  descending: true,
  limit: 50
};
```

### Pattern 3: Assets with Relationships

```typescript
const query = {
  node: {
    labels: ['Asset'],
    filters: [{ field: 'class', operator: '=', value: 'domain' }],
    relationships: [{
      label: 'HAS',
      target: {
        labels: ['Risk'],
        filters: [{ field: 'cvss', operator: '>=', value: 7 }]
      }
    }]
  }
};
```

### Pattern 4: OR Compound Filter

```typescript
const query = {
  node: {
    labels: ['Asset'],
    filters: [{
      operator: 'OR',
      value: [
        { field: 'class', operator: '=', value: 'domain' },
        { field: 'class', operator: '=', value: 'ipv4' }
      ]
    }]
  }
};
```

### Pattern 5: Optional Relationship (LEFT JOIN)

```typescript
const query = {
  node: {
    labels: ['Asset'],
    relationships: [{
      label: 'HAS',
      target: { labels: ['Attribute'] },
      optional: true  // Returns assets even without attributes
    }]
  }
};
```

**See:** [references/query-patterns.md](references/query-patterns.md) for 10+ additional patterns.

---

## Error Handling

### Common Errors

| Error                                 | Cause                             | Solution                                     |
| ------------------------------------- | --------------------------------- | -------------------------------------------- |
| `invalid filter column: X`            | Field not in allowedColumns       | `grep -w "X" .../allowed_columns.go`         |
| `invalid sort column: X`              | orderBy field not in allowedColumns | Same as above                              |
| `invalid label: X`                    | Label not alphanumeric            | Use valid entity type                        |
| `exactly one of source or target...`  | Relationship misconfigured        | Use either `source` OR `target`, not both    |
| `response too large`                  | Results exceed 6MB                | Reduce `limit` or add more filters           |

### Debugging Query Issues

```typescript
// 1. Log the query being sent
console.log('Query:', JSON.stringify(query, null, 2));

// 2. Verify fields exist
// Run in terminal: grep -w "fieldname" modules/chariot/backend/pkg/query/allowed_columns.go

// 3. Test with minimal query first
const minimalQuery = {
  node: { labels: ['Asset'] },
  limit: 10
};
```

---

## Validation Checklist

Before executing a graph query:

- [ ] All `field` values exist in `allowed_columns.go`
- [ ] `orderBy` field (if used) exists in `allowed_columns.go`
- [ ] Labels are valid entity types
- [ ] Each relationship has exactly ONE of `source` or `target`
- [ ] `limit` is reasonable (recommend < 1000 for UI)

---

## Source Files

| File                                              | Purpose                    |
| ------------------------------------------------- | -------------------------- |
| `modules/chariot/backend/pkg/query/allowed_columns.go` | Field whitelist (200+) |
| `modules/chariot/backend/pkg/query/query.go`      | Query structs              |
| `modules/tabularium/pkg/model/filters/filter.go`  | Filter operators           |
| `modules/chariot/ui/src/hooks/useMy.ts`           | useMy hook                 |
| `modules/chariot/ui/src/hooks/useGraphQuery.ts`   | useGraphQuery hook         |

---

## References

- [Filter Operators](references/filter-operators.md) - All operators with examples
- [Query Patterns](references/query-patterns.md) - 10+ additional query patterns
- [Dynamic Field Validation](references/dynamic-field-validation.md) - Field lookup strategies
