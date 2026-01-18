---
name: querying-neo4j-with-cypher
description: Use when writing Neo4j Cypher queries - modern syntax, QPP optimization, subquery patterns, null handling
allowed-tools: "Read, Write, Edit, Bash, Grep"
---

# Neo4j Modern Cypher Query Guide

This skill helps generate Neo4j Cypher read queries using modern syntax patterns and avoiding deprecated features. It focuses on efficient query patterns for graph traversal and data retrieval.

> **You MUST use TodoWrite** before starting to track all query transformation steps when migrating or generating multiple queries.

## Quick Compatibility Check

When generating Cypher queries, immediately avoid these REMOVED features:

- ❌ `id()` function → Use `elementId()`
- ❌ Implicit grouping keys → Use explicit WITH clauses
- ❌ Pattern expressions for lists → Use pattern comprehension or COLLECT subqueries
- ❌ Repeated relationship variables → Use unique variable names
- ❌ Automatic list to boolean coercion → Use explicit checks

## Core Principles for Query Generation

1. **Use modern syntax patterns** - QPP for complex traversals, CALL subqueries for complex reads
2. **Optimize during traversal** - Filter early within patterns, not after expansion
3. **Always filter nulls when sorting** - Add IS NOT NULL checks for sorted properties
4. **Explicit is better than implicit** - Always use explicit grouping and type checking

## Critical Sorting Rule

**ALWAYS filter NULL values when sorting:**

```cypher
// WRONG - May include null values
MATCH (n:Node)
RETURN n.name, n.value
ORDER BY n.value

// CORRECT - Filter nulls before sorting
MATCH (n:Node)
WHERE n.value IS NOT NULL
RETURN n.name, n.value
ORDER BY n.value
```

## Query Pattern Selection Guide

Choose the appropriate query pattern based on complexity and performance requirements:

### For Simple Queries

Use standard Cypher patterns with modern syntax:

```cypher
MATCH (n:Label {property: value})
WHERE n.otherProperty IS :: STRING
RETURN n
```

### For Variable-Length Paths

Consider Quantified Path Patterns (QPP) for better performance:

```cypher
// Instead of: MATCH (a)-[*1..5]->(b)
// Use: MATCH (a)-[]-{1,5}(b)

// With filtering:
MATCH (a)((n WHERE n.active)-[]->(m)){1,5}(b)
```

### For Aggregations

Use COUNT{}, EXISTS{}, and COLLECT{} subqueries:

```cypher
MATCH (p:Person)
WHERE count{(p)-[:KNOWS]->()} > 5
RETURN p.name,
       exists{(p)-[:MANAGES]->()} AS isManager
```

### For Complex Read Operations

Use CALL subqueries for sophisticated data retrieval:

```cypher
MATCH (d:Department)
CALL (d) {
  MATCH (d)<-[:WORKS_IN]-(p:Person)
  WHERE p.salary IS NOT NULL  // Filter nulls
  WITH p ORDER BY p.salary DESC
  LIMIT 3
  RETURN collect(p.name) AS topEarners
}
RETURN d.name, topEarners
```

## Common Query Transformations

Update legacy queries to modern Cypher syntax with these transformations:

### Counting Patterns

```cypher
// Old: RETURN size((n)-[]->())
// Modern: RETURN count{(n)-[]->()}
```

### Checking Existence

```cypher
// Old: WHERE exists((n)-[:REL]->())
// Modern: WHERE EXISTS {MATCH (n)-[:REL]->()}
// Also valid: WHERE exists{(n)-[:REL]->()}
```

### Element IDs

```cypher
// Old: WHERE id(n) = 123
// Modern: WHERE elementId(n) = "4:abc123:456"
// Note: elementId returns a string, not integer
```

### Sorting with Null Handling

```cypher
// Always add null check
MATCH (n:Node)
WHERE n.sortProperty IS NOT NULL
RETURN n
ORDER BY n.sortProperty

// Or use NULLS LAST
MATCH (n:Node)
RETURN n
ORDER BY n.sortProperty NULLS LAST
```

## When to Load Reference Documentation

Reference files contain detailed information for specific Cypher topics. Load the appropriate reference file when:

### references/deprecated-syntax.md

- Migrating queries from older Neo4j versions
- Encountering syntax errors with legacy queries
- Need complete list of removed/deprecated features

### references/subqueries.md

- Working with CALL subqueries for reads
- Using COLLECT or COUNT subqueries
- Handling complex aggregations
- Implementing sorting with null filtering

### references/qpp.md

- Optimizing variable-length path queries
- Need early filtering during traversal
- Working with paths longer than 3-4 hops
- Complex pattern matching requirements

## Query Generation Checklist

Before finalizing any generated query:

1. ✅ No deprecated functions (id, btree indexes, etc.)
2. ✅ Explicit grouping for aggregations
3. ✅ NULL filters for all sorted properties
4. ✅ Appropriate subquery patterns for reads
5. ✅ Consider QPP for paths with filtering needs
6. ✅ Use COUNT{} instead of size() for pattern counting
7. ✅ Variable scope clauses in CALL subqueries
8. ✅ Unique variable names for relationships

## Error Resolution Patterns

Common Neo4j error messages and their solutions:

### "Implicit grouping key" errors

```cypher
// Problem: RETURN n.prop, count(*) + n.other
// Solution: WITH n.prop AS prop, n.other AS other, count(*) AS cnt
//          RETURN prop, cnt + other
```

### "id() function not found"

```cypher
// Use elementId() but note it returns a string, not integer
```

### "Repeated variable" errors

```cypher
// Problem: MATCH (a)-[r*]->(), (b)-[r*]->()
// Solution: MATCH (a)-[r1*]->(), (b)-[r2*]->()
```

## Common Pitfalls and Solutions

### Null Handling in Aggregations

When using aggregations without proper null handling, you may get unexpected results:

```cypher
// PROBLEM: Aggregation includes null values
MATCH (p:Person)
RETURN avg(p.age) AS averageAge
// Result may be skewed if some nodes have null age

// SOLUTION: Filter nulls explicitly
MATCH (p:Person)
WHERE p.age IS NOT NULL
RETURN avg(p.age) AS averageAge
```

### Cartesian Products from Unconnected Patterns

Accidentally creating cartesian products can cause performance issues:

```cypher
// PROBLEM: Two unconnected patterns create cartesian product
MATCH (p:Person), (c:Company)
WHERE p.salary > 100000 AND c.revenue > 1000000
RETURN p, c
// This returns every high-earning person paired with every high-revenue company

// SOLUTION: Connect the patterns with a relationship
MATCH (p:Person)-[:WORKS_FOR]->(c:Company)
WHERE p.salary > 100000 AND c.revenue > 1000000
RETURN p, c
```

### Variable Scope in Subqueries

Variables from outer scope need explicit passing to CALL subqueries:

```cypher
// PROBLEM: Variable not in scope
MATCH (d:Department)
CALL {
  MATCH (p:Person)-[:WORKS_IN]->(d)  // ERROR: d not in scope
  RETURN p
}
RETURN d, p

// SOLUTION: Pass variable to subquery
MATCH (d:Department)
CALL (d) {
  MATCH (p:Person)-[:WORKS_IN]->(d)
  RETURN p
}
RETURN d, p
```

### Label and Type Checking Patterns

Use modern type predicates instead of deprecated functions:

```cypher
// OLD: Type checking with functions
WHERE type(r) = 'KNOWS'

// MODERN: Use type predicate
WHERE r IS :: KNOWS

// Property type checking
WHERE n.value IS :: INTEGER
WHERE n.data IS :: LIST<STRING>
```

## Performance Tips

1. **Start with indexed properties** - Always anchor patterns with indexed lookups. Use `CREATE INDEX` on frequently queried properties.
2. **Filter early in QPP** - Apply WHERE clauses within the pattern rather than after expansion to reduce intermediate results.
3. **Filter nulls before sorting** - Prevent unexpected results and improve performance by explicitly checking `IS NOT NULL` before ORDER BY.
4. **Limit expansion depth** - Use reasonable upper bounds in quantifiers (e.g., `{1,5}` instead of `*`) to prevent graph explosion.
5. **Use EXISTS for existence checks** - More efficient than counting when you only need to know if a pattern exists.
6. **Profile queries** - Use PROFILE to identify bottlenecks and see actual db hits. Focus on reducing `Eager` operators and `CartesianProduct` operations.
7. **Batch operations** - When creating or updating multiple nodes, use `UNWIND` to process batches efficiently.
8. **Use parameters** - Parameterize queries to enable query plan caching and prevent Cypher injection.

## Modern Cypher Features

Neo4j 5.x introduces powerful new features for more expressive and efficient queries:

### Label Expressions

```cypher
WHERE n:Label1|Label2  // OR
WHERE n:Label1&Label2  // AND
WHERE n:!Archived      // NOT
```

### Type Predicates

```cypher
WHERE n.prop IS :: STRING
WHERE n.value IS :: INTEGER NOT NULL
WHERE n.data IS :: LIST<STRING>
```

### Subquery Patterns for Reads

- COUNT{} - Count patterns efficiently
- EXISTS{} - Check pattern existence
- COLLECT{} - Collect complex results
- CALL{} - Execute subqueries for complex reads

### Quantified Path Patterns

- Inline filtering during traversal
- Access to nodes and relationships in patterns
- Significant performance improvements (up to 1000x)
- Support for complex, multi-hop patterns

## Integration Patterns

Best practices for integrating Cypher queries with application code and external systems:

### Working with Neo4j Drivers

When integrating Cypher queries with application code, follow these patterns:

**Parameterized Queries:**

```cypher
// Good: Use parameters for values
MATCH (p:Person {name: $personName})
WHERE p.age > $minAge
RETURN p

// Bad: String concatenation (Cypher injection risk)
// MATCH (p:Person {name: "' + userName + '"})
```

**Transaction Patterns:**

```javascript
// Node.js driver example
const session = driver.session();
try {
  const result = await session.executeWrite(async (tx) => {
    return await tx.run("MATCH (p:Person) WHERE p.active = true RETURN p LIMIT $limit", {
      limit: 100,
    });
  });
  // Process results
} finally {
  await session.close();
}
```

**Handling Large Result Sets:**

```cypher
// Use pagination for large datasets
MATCH (n:Node)
WHERE n.created > $lastSeen
ORDER BY n.created
LIMIT $pageSize
RETURN n
```

### Text-to-Cypher Integration

When building LLM-powered text-to-cypher systems:

1. **Schema validation** - Always validate generated queries against the graph schema
2. **Query limits** - Enforce LIMIT clauses to prevent resource exhaustion
3. **Read-only execution** - Use read transactions for generated queries
4. **Parameter injection** - Replace literal values with parameters before execution
5. **Result formatting** - Transform Neo4j types (elementId, dates) to application types

## Advanced Topics

Specialized Neo4j features for advanced use cases:

### Vector Indexes (Neo4j 5.x)

Create vector indexes for semantic search on embeddings:

```cypher
CREATE VECTOR INDEX idx IF NOT EXISTS
FOR (n:Document) ON (n.embedding)
OPTIONS { indexConfig: {
  `vector.dimensions`: 1536,
  `vector.similarity_function`: 'cosine'
}}
```

**Details:** [references/vector-indexes.md](references/vector-indexes.md)

### Query Performance Analysis

Use EXPLAIN (plan preview) and PROFILE (actual metrics) to optimize:

```cypher
PROFILE MATCH (p:Person)-[:KNOWS]->(f) RETURN f.name
```

Key metrics: `db hits`, `rows`, `Eager` operators, `CartesianProduct`.

**Details:** [references/performance-analysis.md](references/performance-analysis.md)

### Temporal Functions

Calculate durations between dates:

```cypher
RETURN duration.between(e.startDate, e.endDate).days AS daysBetween
```

**Details:** [references/temporal-functions.md](references/temporal-functions.md)

### Change Data Capture (CDC)

Track changes in real-time (Neo4j 5.13.0+):

```cypher
CALL db.cdc.query($lastChangeId, [{ select: "n", operation: "c" }])
YIELD change RETURN change
```

**Details:** [references/cdc-patterns.md](references/cdc-patterns.md)

Always prefer modern syntax patterns for better performance and maintainability.
