# Query Performance Analysis

## EXPLAIN vs PROFILE

| Command   | Behavior                          | Use Case             |
| --------- | --------------------------------- | -------------------- |
| `EXPLAIN` | Shows plan WITHOUT executing      | Quick plan review    |
| `PROFILE` | Executes and shows actual metrics | Performance analysis |

## EXPLAIN - Query Plan Preview

```cypher
EXPLAIN MATCH (p:Person)-[:KNOWS]->(friend)
WHERE p.name = 'Alice'
RETURN friend.name
```

Shows logical operators without execution. Fast, no data access.

## PROFILE - Actual Metrics

```cypher
PROFILE MATCH (p:Person)-[:KNOWS]->(friend)
WHERE p.name = 'Alice'
RETURN friend.name
```

Executes query and returns real performance data.

## Key Metrics to Monitor

| Metric                  | What It Means          | Warning Signs                   |
| ----------------------- | ---------------------- | ------------------------------- |
| **db hits**             | Database page accesses | High numbers = inefficient      |
| **rows**                | Rows at each operator  | Large intermediate counts       |
| **Estimated vs Actual** | Planner accuracy       | Large discrepancy = stale stats |
| **Eager**               | Materializes all input | Memory pressure risk            |
| **CartesianProduct**    | Cross-join             | Usually problematic             |

## Identifying Problems

### High db hits

```cypher
-- Problem: Full scan
PROFILE MATCH (n:Node) WHERE n.prop = 'value' RETURN n
-- Solution: Add index
CREATE INDEX FOR (n:Node) ON (n.prop)
```

### Cartesian Product

```cypher
-- Problem: Unconnected patterns
PROFILE MATCH (a:Person), (b:Product) RETURN a, b
-- Solution: Connect via relationship or WITH
PROFILE MATCH (a:Person)-[:PURCHASED]->(b:Product) RETURN a, b
```

### Eager Operator

```cypher
-- Problem: Eager materialization
PROFILE MATCH (n) WITH collect(n) AS all UNWIND all AS node RETURN node
-- Solution: Stream results
PROFILE MATCH (n) RETURN n
```

## Query Options

```cypher
-- Force replan
CYPHER replan=force MATCH (n) RETURN n

-- Use selective label estimation
CYPHER inferSchemaParts=most_selective_label MATCH (n:Label) RETURN n
```

## Optimization Checklist

1. Use indexes on filtered properties
2. Avoid cartesian products
3. Watch for Eager operators
4. Filter early, limit late
5. Update statistics: `CALL db.stats.retrieve('GRAPH COUNTS')`
