# Query Optimization Patterns

**Common techniques for rewriting Cypher queries for better performance.**

## Early Filtering Patterns

### Filter by Selective Properties First

Start queries with the most selective filter to reduce intermediate results:

```cypher
-- BEFORE: High cardinality explosion
MATCH (a:Asset)-[:HAS_ATTRIBUTE]->(attr:Attribute)
WHERE attr.name = 'critical'
RETURN a

-- AFTER: Start from lower-cardinality Attributes
MATCH (attr:Attribute {name: 'critical'})<-[:HAS_ATTRIBUTE]-(a:Asset)
RETURN a
```

### Apply LIMIT Early

Moving LIMIT earlier dramatically reduces work (331 db hits → 11 in documented cases):

```cypher
-- BEFORE: Process all rows then limit
MATCH (p:Person)-[:KNOWS]->(friend)
MATCH (friend)-[:LIVES_IN]->(city)
RETURN p.name, friend.name, city.name
LIMIT 10

-- AFTER: Limit intermediate results
MATCH (p:Person)-[:KNOWS]->(friend)
WITH p, friend LIMIT 10
MATCH (friend)-[:LIVES_IN]->(city)
RETURN p.name, friend.name, city.name
```

### Multi-Tenant Filter First

For Chariot, always filter by tenant (username) first:

```cypher
-- Start with tenant filter
MATCH (a:Asset)
WHERE a.username = $userId
  AND a.status = 'A'
MATCH (a)-[:HAS_ATTRIBUTE]->(attr:Attribute)
WHERE attr.name = 'critical'
RETURN a
```

## Avoiding Cartesian Products

Cartesian products are the most common cause of slow queries.

### Connect Patterns with Relationships

```cypher
-- BAD: Disconnected patterns = cartesian product
MATCH (p:Person), (c:City)
RETURN p, c

-- GOOD: Connected through relationship
MATCH (p:Person)-[:LIVES_IN]->(c:City)
RETURN p, c
```

### Use Pattern Comprehensions

```cypher
-- BAD: Multiple MATCHes can multiply rows
MATCH (m:Movie)
MATCH (m)<-[:DIRECTED]-(d:Director)
MATCH (m)<-[:ACTED_IN]-(a:Actor)
RETURN m.title, d.name, a.name

-- GOOD: Pattern comprehensions avoid cartesian product
MATCH (m:Movie)
RETURN m.title,
  [(m)<-[:DIRECTED]-(d:Director) | d.name] AS directors,
  [(m)<-[:ACTED_IN]-(a:Actor) | a.name] AS actors
```

### Use CALL Subqueries for Isolation

```cypher
-- Scoped subquery prevents cardinality explosion
MATCH (m:Movie)
CALL {
  WITH m
  MATCH (m)<-[:ACTED_IN]-(a:Actor)
  RETURN collect(a.name) AS actors
}
RETURN m.title, actors
```

## EXISTS Subquery Patterns

Use EXISTS for boolean pattern checks (more efficient than full pattern match):

```cypher
-- Check existence without materializing results
MATCH (person:Person)
WHERE EXISTS { (person)-[:HAS_DOG]->(:Dog) }
RETURN person.name

-- EXISTS with additional filtering
MATCH (a:Asset)
WHERE a.status = 'A'
  AND EXISTS {
    MATCH (a)-[:HAS_RISK]->(r:Risk)
    WHERE r.severity = 'critical'
  }
RETURN a
```

**EXISTS advantages:**
- Returns boolean without materializing full result set
- Can use outer scope variables without explicit import
- More powerful than `exists()` function alone

## Traversal Direction Optimization

### Start from Lower-Cardinality Side

```cypher
-- If Attributes have lower cardinality than Assets
-- Start from Attribute, traverse to Asset
MATCH (attr:Attribute {name: 'critical'})
MATCH (attr)<-[:HAS_ATTRIBUTE]-(a:Asset)
WHERE a.status = 'A'
RETURN a
```

### Handle Supernodes with JOIN Hints

Supernodes (nodes with millions of relationships) cause exponential path explosion:

```cypher
-- Use JOIN hint to control expansion around supernode
MATCH (me:Person {name:'Alice'})-[:FOLLOWS]->(celeb:Celebrity)
USING JOIN ON celeb
MATCH (celeb)<-[:FOLLOWS]-(follower:Person)
RETURN follower.name
```

## Index Hint Patterns

Force specific index usage when planner chooses suboptimally:

```cypher
-- Single index hint
MATCH (a:Asset)
USING INDEX a:Asset(username)
WHERE a.username = $userId
RETURN a

-- Multiple index hints
MATCH (a:Asset)-[:HAS_RISK]->(r:Risk)
USING INDEX a:Asset(username)
USING INDEX r:Risk(severity)
WHERE a.username = $userId AND r.severity = 'critical'
RETURN a, r
```

## Parameterized Queries

Use parameters for query plan caching (Neo4j caches last 1000 plans):

```cypher
-- BAD: Literals prevent cache reuse
MATCH (a:Asset {username: 'user123', status: 'A'})
RETURN a

-- GOOD: Parameters enable caching
MATCH (a:Asset {username: $userId, status: $status})
RETURN a
```

## Property Selection

Return only needed properties:

```cypher
-- BAD: Returns entire node
MATCH (a:Asset) RETURN a

-- GOOD: Select specific properties
MATCH (a:Asset)
RETURN a.key, a.name, a.dns, a.status
```

## Relationship Type Specification

Always specify relationship types even when only one exists:

```cypher
-- BAD: Scans all relationship types
MATCH (a:Asset)-->(attr)
RETURN a, attr

-- GOOD: Explicit type enables faster termination
MATCH (a:Asset)-[:HAS_ATTRIBUTE]->(attr:Attribute)
RETURN a, attr
```

## Anti-Patterns to Avoid

| Anti-Pattern                                    | Why It's Bad                              | Fix                                    |
| ----------------------------------------------- | ----------------------------------------- | -------------------------------------- |
| WHERE in wrong MATCH scope                      | Affects results and performance           | Place WHERE after correct MATCH        |
| Disconnected MATCH patterns                     | Creates cartesian product                 | Connect with relationships             |
| Literals instead of parameters                  | Prevents query plan caching               | Use `$param` syntax                    |
| Unnecessary labels on non-anchor nodes          | Forces label checks, increases db hits    | Remove labels from intermediate nodes  |
| LIMIT at end of query                           | Processes all rows before limiting        | Apply LIMIT early with WITH            |
| Traversing through supernodes                   | Exponential path explosion                | Use JOIN hints                         |
| Full pattern match when EXISTS suffices         | Materializes unnecessary results          | Use EXISTS subquery                    |
| Returning whole nodes                           | Returns unnecessary data                  | Select specific properties             |
| Eager aggregations over large sets              | Memory pressure, GC pauses                | Use CALL subqueries for scoping        |

## Performance Checklist

When optimizing a query:

- [ ] Profile the current query to establish baseline
- [ ] Identify most selective filter and apply first
- [ ] Check for missing indexes on filtered properties
- [ ] Verify no cartesian products (disconnected patterns)
- [ ] Apply LIMIT early if only subset needed
- [ ] Use parameters instead of literals
- [ ] Return only needed properties
- [ ] Specify relationship types explicitly
- [ ] Consider EXISTS for boolean pattern checks
- [ ] Profile optimized query and compare

## Related References

- [profiling-queries.md](profiling-queries.md) - Measuring query performance
- [index-strategies.md](index-strategies.md) - Creating effective indexes
- [troubleshooting.md](troubleshooting.md) - Common issues and solutions
