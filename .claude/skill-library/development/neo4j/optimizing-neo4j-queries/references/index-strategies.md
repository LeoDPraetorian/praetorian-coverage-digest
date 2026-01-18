# Neo4j Index Strategies

**Comprehensive guide to index types, creation patterns, and when to use each.**

## Index Types in Neo4j

Neo4j provides six distinct index types:

| Index Type   | Use Case                     | Supported Predicates                                    |
| ------------ | ---------------------------- | ------------------------------------------------------- |
| **RANGE**    | General property lookups     | `=`, `IN`, `IS NOT NULL`, `>`, `<`, `>=`, `<=`, `STARTS WITH` |
| **TEXT**     | String property searches     | `=`, `IN`, `>`, `STARTS WITH`, `ENDS WITH`, `CONTAINS`  |
| **POINT**    | Spatial/geographic queries   | `=`, `point.withinBBox()`, `point.distance()`           |
| **LOOKUP**   | Label/type filtering         | Label/relationship type matches                         |
| **FULLTEXT** | Full-text search             | Lucene-based text search                                |
| **VECTOR**   | Similarity/embedding search  | Nearest neighbor queries                                |

## Index Creation Syntax

### Basic Range Index (Default)

```cypher
-- Single property index
CREATE INDEX index_name FOR (p:Person) ON (p.name)

-- With IF NOT EXISTS clause
CREATE INDEX index_name IF NOT EXISTS FOR (p:Person) ON (p.name)

-- Relationship index
CREATE RANGE INDEX rel_index FOR ()-[k:KNOWS]-() ON (k.since)
```

### Composite Indexes

```cypher
-- Composite index on multiple properties
CREATE INDEX person_composite FOR (p:Person) ON (p.name, p.age)

-- Multi-tenant pattern (RECOMMENDED for Chariot)
CREATE INDEX asset_tenant_status FOR (a:Asset) ON (a.username, a.status)
```

### TEXT Index

```cypher
-- For CONTAINS and ENDS WITH queries
CREATE TEXT INDEX text_idx FOR (p:Person) ON (p.name)
```

### POINT Index

```cypher
CREATE POINT INDEX location_idx FOR (p:Person) ON (p.location)
OPTIONS {
  indexConfig: {
    `spatial.cartesian.min`: [-100.0, -100.0],
    `spatial.cartesian.max`: [100.0, 100.0]
  }
}
```

### LOOKUP Index

```cypher
-- Node label lookup
CREATE LOOKUP INDEX label_idx FOR (n) ON EACH labels(n)

-- Relationship type lookup
CREATE LOOKUP INDEX rel_type_idx FOR ()-[r]-() ON EACH type(r)
```

### FULLTEXT Index

```cypher
-- Full-text index with analyzer
CREATE FULLTEXT INDEX product_search
FOR (n:Product) ON EACH [n.name, n.description]
OPTIONS {
  indexConfig: {
    `fulltext.analyzer`: 'english'
  }
}

-- Using full-text search
CALL db.index.fulltext.queryNodes('product_search', 'search term')
YIELD node, score
RETURN node.name, score
ORDER BY score DESC
```

### VECTOR Index

```cypher
CREATE VECTOR INDEX embeddings FOR (m:Movie) ON m.embedding
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 1536,
    `vector.similarity_function`: 'cosine'
  }
}
```

## Composite Index Best Practices

### Property Order Matters

Composite indexes use the **leftmost prefix rule**:
- Index on `(name, age)` helps queries filtering on `name` or `(name AND age)`
- Does NOT help queries filtering only on `age`

**Predicate ordering rules:**
1. Equality checks (`=`) and list membership (`IN`) - FIRST
2. Range/prefix searches - AT MOST ONE
3. Existence checks - LAST

```cypher
-- Optimal index for this query pattern:
CREATE INDEX AssetFilter FOR (a:Asset) ON (a.username, a.status, a.class)

-- Query leveraging the index properly:
MATCH (a:Asset)
WHERE a.username = $userId     -- equality (first)
  AND a.status = 'A'           -- equality (second)
  AND a.class IN ['ipv4', 'domain']  -- list membership
RETURN a
```

### Multi-Tenant Indexes for Chariot

For Chariot's multi-tenant architecture, always lead with tenant identifier:

```cypher
-- Recommended indexes for Chariot
CREATE INDEX Asset_username_status FOR (a:Asset) ON (a.username, a.status)
CREATE INDEX Asset_username_class FOR (a:Asset) ON (a.username, a.class)
CREATE INDEX Risk_username_status FOR (r:Risk) ON (r.username, r.status)
```

## Index Hints

When the query planner doesn't choose the optimal index, use hints:

```cypher
MATCH (a:Asset)
USING INDEX a:Asset(username)
WHERE a.username = $userId AND a.status = 'A'
RETURN a
```

**When to use hints:**
- Multiple applicable indexes exist
- You understand data patterns better than statistics suggest
- Planner consistently chooses slower plans

**Caution:** Avoid overusing hints as they reduce planner flexibility.

## Index Management

### Viewing Indexes

```cypher
-- List all indexes
SHOW INDEXES

-- Detailed index information
SHOW INDEXES YIELD name, type, entityType, labelsOrTypes, properties

-- Filter by type
SHOW RANGE INDEXES
SHOW FULLTEXT INDEXES

-- Get creation statement
SHOW INDEXES
YIELD name, type, options, createStatement
RETURN name, type, options.indexConfig AS config, createStatement
```

### Waiting for Population

Indexes populate asynchronously. Wait before querying:

```cypher
-- Block until all indexes are ready
CALL db.awaitIndexes()

-- Check population status
SHOW INDEXES YIELD name, state WHERE state = 'POPULATING'
```

### Dropping Indexes

```cypher
DROP INDEX index_name
DROP INDEX index_name IF EXISTS
```

## Index Type Selection Guide

| Data Type         | Recommended Index | Reason                                    |
| ----------------- | ----------------- | ----------------------------------------- |
| ID/UUID           | RANGE             | Equality and uniqueness                   |
| Name/String       | TEXT or RANGE     | TEXT for CONTAINS, RANGE for prefix       |
| Email             | TEXT              | Substring searches                        |
| Geographic Point  | POINT             | Spatial queries                           |
| Enum/Status       | LOOKUP (via label)| Better with label than property           |
| Description/Body  | FULLTEXT          | Natural language search                   |
| Embedding/Vector  | VECTOR            | Similarity search                         |

## Cardinality Considerations

**High cardinality properties** (many unique values): Excellent index candidates
**Low cardinality properties** (few unique values): Often need composite indexes

```cypher
-- Good: High cardinality (unique IDs)
CREATE INDEX asset_key FOR (a:Asset) ON (a.key)

-- Less effective alone: Low cardinality (status)
CREATE INDEX asset_status FOR (a:Asset) ON (a.status)

-- Better: Composite with high-cardinality lead
CREATE INDEX asset_username_status FOR (a:Asset) ON (a.username, a.status)
```

## Verifying Index Usage

Always verify indexes are being used:

```cypher
-- Check if index is used (look for NodeIndexSeek)
EXPLAIN MATCH (a:Asset) WHERE a.username = $userId RETURN a

-- Profile to see actual performance
PROFILE MATCH (a:Asset) WHERE a.username = $userId RETURN a
```

**Expected operators:**
- `NodeIndexSeek` - Index is being used effectively
- `NodeByLabelScan` - Index not used or missing
- `AllNodesScan` - No label specified, scans everything

## Related References

- [profiling-queries.md](profiling-queries.md) - Understanding PROFILE output
- [optimization-patterns.md](optimization-patterns.md) - Query rewriting patterns
