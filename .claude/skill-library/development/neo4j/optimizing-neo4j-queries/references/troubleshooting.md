# Troubleshooting Neo4j Query Performance

**Common issues and solutions for Neo4j query optimization.**

## Query Still Slow After Indexing

### Symptoms
- Created index but PROFILE still shows high db hits
- Query performance unchanged after index creation

### Diagnostic Steps

**1. Verify index is being used:**
```cypher
EXPLAIN MATCH (a:Asset) WHERE a.username = $userId RETURN a
-- Look for NodeIndexSeek (good) vs NodeByLabelScan (bad)
```

**2. Check index is populated:**
```cypher
SHOW INDEXES YIELD name, state WHERE state <> 'ONLINE'
-- All indexes should be ONLINE
```

**3. Check if index covers the filter:**
```cypher
-- Index on (username) won't help filter on (status)
-- Need index on the actual filtered property
```

### Solutions

| Cause | Fix |
|-------|-----|
| Index not populated | `CALL db.awaitIndexes()` |
| Index not selective | Use composite index with more properties |
| Wrong index for query | Create index on filtered property |
| Statistics outdated | `CALL db.stats.refresh('GRAPH COUNTS')` |

**Force index usage:**
```cypher
MATCH (a:Asset)
USING INDEX a:Asset(username)
WHERE a.username = $userId
RETURN a
```

## Optimization Made Query Slower

### Symptoms
- Query was faster before optimization attempt
- db hits increased after changes

### Likely Causes

**1. Index not selective enough:**
```cypher
-- Index on status='A' might return 90% of nodes
-- Less efficient than full scan in some cases
```

**2. Query planner chose wrong execution plan:**
```cypher
-- Remove index hint, let planner decide
MATCH (a:Asset)
-- USING INDEX a:Asset(status)  ← Remove this
WHERE a.status = 'A'
RETURN a
```

**3. Cardinality estimates incorrect:**
```cypher
-- Check statistics
CALL db.stats.retrieve('GRAPH COUNTS')
-- Refresh if needed
CALL db.stats.refresh('GRAPH COUNTS')
```

### Solutions

1. **Remove index hint** - Let query planner choose
2. **Use different runtime** (Neo4j 5.x):
   ```cypher
   CYPHER runtime=slotted MATCH ...
   CYPHER runtime=pipelined MATCH ...
   ```
3. **Analyze statistics** - Ensure planner has accurate data
4. **Revert and profile** - Compare before/after systematically

## Results Don't Match After Optimization

### Symptoms
- Optimized query returns different row count
- Missing or extra rows compared to original

### Diagnostic Steps

**1. Compare row counts:**
```cypher
-- Original query
MATCH (a:Asset)-[:HAS_ATTRIBUTE]->(attr:Attribute)
WHERE attr.name = 'critical' AND a.status = 'A'
RETURN count(a)

-- Optimized query
MATCH (attr:Attribute {name: 'critical'})<-[:HAS_ATTRIBUTE]-(a:Asset)
WHERE a.status = 'A'
RETURN count(a)
-- Counts should match
```

**2. Check for relationship direction change:**
```cypher
-- These are NOT equivalent if relationship has direction
(a)-[:REL]->(b)    -- a to b
(a)<-[:REL]-(b)    -- b to a
(a)-[:REL]-(b)     -- either direction
```

### Common Causes

| Cause | What Happened | Fix |
|-------|--------------|-----|
| Relationship direction | Changed `->` to `<-` incorrectly | Verify original direction |
| AND vs OR | Logic accidentally changed | Review WHERE clause |
| Implicit relationship | Added explicit type that doesn't exist | Check relationship types |
| Label change | Added label that some nodes don't have | Verify all nodes have label |

### Recovery Steps

1. **Revert to original query**
2. **Make one change at a time**
3. **Verify row count after each change**
4. **Document verified transformation**

## Lambda Timeout Due to Query

### Symptoms
- AWS Lambda times out (30 second limit)
- Query works in Neo4j Browser but not in API

### Diagnostic Steps

**1. Profile the query:**
```cypher
PROFILE [your query]
-- Check total db hits and execution time
```

**2. Check for cartesian products:**
```cypher
-- Look for CartesianProduct operator in plan
EXPLAIN [your query]
```

**3. Check result set size:**
```cypher
-- Large result sets take time to transfer
MATCH (a:Asset) WHERE a.status = 'A'
RETURN count(a)  -- How many rows?
```

### Solutions

| Cause | Fix |
|-------|-----|
| Missing index | Create index on filtered property |
| Cartesian product | Connect patterns with relationships |
| Large result set | Add LIMIT, paginate results |
| Complex traversal | Split into multiple simpler queries |
| Network transfer | Return only needed properties |

**Add timeout hint:**
```cypher
-- Not all Neo4j deployments support this
CALL db.setQueryTimeout(25000)  -- 25 seconds
```

## Memory Errors / GC Pauses

### Symptoms
- `OutOfMemoryError` in logs
- Long GC pauses during query
- Query slows down then fails

### Diagnostic Steps

**1. Check for eager operators:**
```cypher
PROFILE [your query]
-- Look for: Sort, EagerAggregation, Distinct, NodeHashJoin
```

**2. Estimate result set size:**
```cypher
-- Count intermediate results
MATCH (a:Asset)-[:HAS_ATTRIBUTE]->(attr)
RETURN count(*)  -- How many rows?
```

### Solutions

**1. Use CALL subqueries for scoping:**
```cypher
-- Instead of large aggregation
MATCH (m:Movie)
CALL {
  WITH m
  MATCH (m)<-[:ACTED_IN]-(a:Actor)
  RETURN collect(a.name) AS actors
}
RETURN m.title, actors
```

**2. Apply early LIMIT:**
```cypher
MATCH (a:Asset)-[:HAS_ATTRIBUTE]->(attr)
WITH a, attr LIMIT 10000
-- Continue query...
```

**3. Paginate results:**
```cypher
MATCH (a:Asset)
ORDER BY a.key
SKIP $offset LIMIT $pageSize
RETURN a
```

## Index Not Found Error

### Symptoms
- `No such index` error
- Query worked before but fails now

### Diagnostic Steps

```cypher
-- List all indexes
SHOW INDEXES

-- Check specific index
SHOW INDEXES WHERE name = 'index_name'
```

### Solutions

| Cause | Fix |
|-------|-----|
| Index was dropped | Recreate: `CREATE INDEX...` |
| Index name changed | Use correct name or remove hint |
| Database was recreated | Run index creation scripts |

## Field Not Allowed Error

### Symptoms
- `"invalid filter column: {field}"` error
- Query worked in Neo4j Browser but not via API

### Diagnostic Steps

```bash
# Check allowed columns
grep -w "fieldname" modules/chariot/backend/pkg/query/allowed_columns.go
```

### Solutions

1. **Use correct field name** - Check `allowed_columns.go`
2. **Add field to allowed list** - If field should be allowed
3. **Use different filter approach** - If field shouldn't be exposed

## Performance Regression Checklist

When performance suddenly degrades:

- [ ] Check if indexes still exist: `SHOW INDEXES`
- [ ] Check index states: `SHOW INDEXES YIELD state`
- [ ] Check statistics: `CALL db.stats.retrieve('GRAPH COUNTS')`
- [ ] Check data volume changes: `MATCH (n) RETURN labels(n), count(n)`
- [ ] Profile the slow query: `PROFILE [query]`
- [ ] Compare to known baseline: Check saved execution plans
- [ ] Check memory settings: JVM heap, page cache
- [ ] Check concurrent load: Other queries competing

## Related References

- [profiling-queries.md](profiling-queries.md) - Diagnostic profiling
- [index-strategies.md](index-strategies.md) - Index management
- [optimization-patterns.md](optimization-patterns.md) - Query patterns
