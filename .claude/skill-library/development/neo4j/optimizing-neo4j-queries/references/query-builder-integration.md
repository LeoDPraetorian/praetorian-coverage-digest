# Query Builder Integration

**Integrating optimizations with Chariot's Go query builder.**

## Chariot Query Builder Overview

Chariot uses a custom query builder in `modules/chariot/backend/pkg/query/` to generate Cypher queries. Understanding this system is essential for platform-level optimizations.

### Key Files

| File | Purpose |
|------|---------|
| `read.go` | Main query builder with optimization logic |
| `allowed_columns.go` | Source of truth for valid filter fields (200+ fields) |
| `filters/filter.go` | Filter construction and operators |

## Query Structure

The query builder generates queries from a structured request:

```go
// Chariot query structure (pkg/query/types.go)
query := &Query{
    Node: Node{
        Labels: []string{"Asset"},
        Filters: []filters.Filter{
            {Field: "status", Operator: "=", Value: "A"},
        },
        Relationships: []Relationship{
            {
                Label: []string{"HAS_ATTRIBUTE"},
                Target: &Node{
                    Labels: []string{"Attribute"},
                    Filters: []filters.Filter{
                        {Field: "name", Operator: "=", Value: "critical"},
                    },
                },
            },
        },
    },
    Limit: 100,
}
```

### Generated Cypher

The above generates approximately:

```cypher
MATCH (n0:Asset) WHERE ((n0.status = $p1) AND (n0.username = $user))
MATCH (n0)-[r0:HAS_ATTRIBUTE]->(n1:Attribute) WHERE ((n1.name = $p2))
RETURN DISTINCT n0
LIMIT 100
```

## Field Validation

**Source of truth**: `modules/chariot/backend/pkg/query/allowed_columns.go`

Before using any field in a filter, verify it exists:

```bash
# Quick verification
grep -w "fieldname" modules/chariot/backend/pkg/query/allowed_columns.go
```

**Invalid fields cause**: `"invalid filter column: {field}"` errors

### Common Fields by Entity Type

```go
// Asset fields (verified from allowed_columns.go)
"key", "name", "dns", "status", "class", "source", "updated", "created"

// Risk fields
"key", "name", "severity", "status", "source", "updated", "created"

// Attribute fields
"key", "name", "class", "source"
```

## Existing Optimization Logic

The query builder has built-in optimization patterns:

### Index Hint Generation

From `read.go`:

```go
// push the query planner towards using an index, if we have it
if q.OrderBy != "" {
    WithPartitionBuilder(func(target Filtered) *filters.Filter {
        if node, ok := target.(*Node); ok && node == sortNode {
            f := filters.NewFilter(q.OrderBy, filters.OperatorIsNotNull, nil)
            return &f
        }
        return nil
    })(r)
}
```

### Multi-Tenant Isolation

Username filtering is automatically added for tenant isolation:

```go
// All queries include username filter for multi-tenant isolation
// See neo4j.go line 24: Username string
```

## Implementing Optimizations

### Strategy: Modify Query Order

If optimization requires changing MATCH clause order:

```go
// Current: Asset first, then Attribute
// Optimized: Start from selective Attribute

func (r *Read) buildOptimizedQuery(q *Query) string {
    // Detect selective filters and reorder
    if hasHighSelectivityFilter(q.Relationships) {
        return r.buildRelationshipFirst(q)
    }
    return r.buildNodeFirst(q)
}
```

### Strategy: Add Index Hints

```go
// Add index hint to generated query
func (r *Read) addIndexHint(node *Node, property string) {
    r.hints = append(r.hints, fmt.Sprintf(
        "USING INDEX %s:%s(%s)",
        node.Alias,
        node.Labels[0],
        property,
    ))
}
```

### Strategy: Early LIMIT

```go
// Insert LIMIT earlier in query for performance
func (r *Read) addEarlyLimit(limit int) {
    if limit > 0 && r.hasMultipleMatches() {
        r.withClauses = append(r.withClauses,
            fmt.Sprintf("WITH * LIMIT %d", limit))
    }
}
```

## Testing Query Builder Changes

### Run Unit Tests

```bash
cd modules/chariot/backend
go test ./pkg/query/... -v
```

### Run Specific Tests

```bash
go test ./pkg/query/... -v -run TestReadQuery
go test ./pkg/query/... -v -run TestFilterOptimization
```

### Profile Generated Queries

After modifying the query builder, profile generated queries in Neo4j:

```cypher
-- Take generated query and profile it
PROFILE
MATCH (n0:Asset) WHERE ((n0.status = $p1) AND (n0.username = $user))
MATCH (n0)-[r0:HAS_ATTRIBUTE]->(n1:Attribute) WHERE ((n1.name = $p2))
RETURN DISTINCT n0
LIMIT 100
```

## Integration Checklist

When implementing query builder optimizations:

- [ ] Read current query generation logic in `read.go`
- [ ] Verify fields against `allowed_columns.go`
- [ ] Maintain multi-tenant isolation (username filter)
- [ ] Run unit tests: `go test ./pkg/query/... -v`
- [ ] Generate sample queries and PROFILE them
- [ ] Compare db hits before/after
- [ ] Run acceptance tests from `/modules/chariot/acceptance`
- [ ] E2E validation in UI: `/modules/chariot/ui/e2e`

## Query Builder Libraries

For reference, other Neo4j query builder implementations:

| Library | Language | Repository |
|---------|----------|------------|
| cypher-dsl | Java | github.com/neo4j/cypher-dsl |
| cypher-query-builder | JavaScript | github.com/jamesfer/cypher-query-builder |
| cypher-query-builder | Go | github.com/Medvedevsky/cypher-query-builder |
| cypher-query-builder | PHP | github.com/php-graph-group/cypher-query-builder |

## Related References

- [optimization-patterns.md](optimization-patterns.md) - Query patterns to implement
- [index-strategies.md](index-strategies.md) - Index recommendations
- [troubleshooting.md](troubleshooting.md) - Common issues
