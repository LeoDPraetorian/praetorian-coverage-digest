---
name: optimizing-neo4j-queries
description: Use when diagnosing and optimizing slow Neo4j queries in Chariot - systematic methodology for profiling, analyzing execution plans, creating indexes, and measuring performance improvements
allowed-tools: Read, Bash, Grep, Glob, TodoWrite, AskUserQuestion, Skill
---

# Optimizing Neo4j Queries

**Systematic methodology for diagnosing and optimizing Neo4j Cypher query performance in the Chariot platform.**

## When to Use

Use this skill when:

- Neo4j queries are timing out or running slowly
- Lambda functions exceed their execution time limits due to database queries
- Users report slow UI responses for asset/risk searches
- You need to analyze query execution plans and optimize performance
- Creating or modifying indexes for query optimization
- Measuring and validating performance improvements

**You MUST use TodoWrite** before starting to track all optimization phases.

## Quick Reference

| Phase                  | Purpose                                         | Key Actions                  |
| ---------------------- | ----------------------------------------------- | ---------------------------- |
| 1. Baseline            | Establish current performance                   | Profile query, measure time  |
| 2. Analyze             | Understand execution plan                       | Identify bottlenecks         |
| 3. Diagnose            | Root cause analysis                             | Cardinality, indexes, scans  |
| 4. Optimize            | Apply targeted optimizations                    | Rewrite, indexes, hints      |
| 5. Verify              | Measure improvement                             | Compare before/after         |
| 6. Platform Integration| Integrate with Chariot query builder if needed  | Update Go code               |

## Core Principles

1. **Evidence-based optimization** - Always profile before optimizing, measure after
2. **Start simple** - Profile → Identify bottleneck → Fix bottleneck → Re-profile
3. **Platform context matters** - Consider Chariot's multi-tenant isolation, Lambda timeouts, query builder patterns
4. **Index strategy** - Create indexes before rewriting queries
5. **Validate results** - Ensure optimized query returns identical results

## Critical Rules

### 🚨 MANDATORY: Profile First

**NEVER optimize without profiling.** Guessing leads to incorrect optimizations.

```cypher
// Step 1: Always profile the current query
PROFILE
MATCH (a:Asset)-[:HAS_ATTRIBUTE]->(attr:Attribute)
WHERE attr.name = 'critical' AND a.status = 'A'
RETURN a
```

Look for: `NodeByLabelScan`, `Expand(All)`, high `db hits`, large `rows` counts

### 🚨 MANDATORY: Multi-Tenant Isolation

All Chariot queries MUST include username filtering for tenant isolation:

```cypher
WHERE a.username = $username
```

**Reference**: `modules/chariot/backend/pkg/cloud/service/services/neo4j/neo4j.go` line 24

### 🚨 MANDATORY: Verify Field Names

Before using any field in a query filter, verify it exists in:

**Source of truth**: `modules/chariot/backend/pkg/query/allowed_columns.go` (200+ fields)

```bash
# Quick verification
grep -w "fieldname" modules/chariot/backend/pkg/query/allowed_columns.go
```

**Invalid fields cause**: `"invalid filter column: {field}"` errors

### 🚨 MANDATORY: Results Validation

After optimization, verify identical results:

```cypher
// Compare counts
WITH "MATCH ..." AS originalQuery, "MATCH ..." AS optimizedQuery
CALL { WITH originalQuery CYPHER runtime=interpreted originalQuery RETURN count(*) AS origCount }
CALL { WITH optimizedQuery CYPHER runtime=slotted optimizedQuery RETURN count(*) AS optCount }
RETURN origCount = optCount AS resultsMatch
```

## Optimization Workflow

### Phase 1: Establish Baseline

**1.1 Capture Current Performance**

```cypher
PROFILE
[your slow query here]
```

Document:
- Execution time (ms)
- `db hits` (lower is better)
- `rows` processed at each step
- Bottleneck operations (NodeByLabelScan, Expand(All))

**1.2 Understand Query Intent**

- What data is being retrieved?
- What are the cardinality estimates? (How many nodes/relationships match each filter?)
- Which filters are most selective? (Reduce result set the most)

**See**: [references/profiling-queries.md](references/profiling-queries.md) for detailed PROFILE interpretation

### Phase 2: Analyze Execution Plan

**2.1 Identify Expensive Operations**

Common performance killers:
- `NodeByLabelScan` on high-cardinality labels (Assets, Attributes)
- `Expand(All)` without relationship filtering
- Late filtering (filters applied after expensive traversals)
- Cartesian products (multiple MATCH clauses without relationships)

**2.2 Calculate Cardinality**

```cypher
// Asset count
MATCH (a:Asset) RETURN count(a)

// Attribute count
MATCH (attr:Attribute) RETURN count(attr)

// Filter selectivity
MATCH (attr:Attribute) WHERE attr.name = 'critical' RETURN count(attr)
MATCH (a:Asset) WHERE a.status = 'A' RETURN count(a)
```

**See**: [references/execution-plan-analysis.md](references/execution-plan-analysis.md)

### Phase 3: Diagnose Root Cause

**3.1 Check Index Usage**

```cypher
SHOW INDEXES
```

Look for:
- Indexes on filtered properties (attr.name, a.status)
- Multi-tenant indexes (a.username, a.username + a.status)
- Index state (ONLINE vs POPULATING)

**3.2 Verify Index Coverage**

```cypher
// Check if query uses index (should see NodeIndexSeek)
EXPLAIN
MATCH (attr:Attribute) WHERE attr.name = 'critical' RETURN attr
```

**If no index**: Proceed to Phase 4.1 (Create Indexes)
**If index not used**: Proceed to Phase 4.2 (Add Index Hints)

**See**: [references/index-strategies.md](references/index-strategies.md)

### Phase 4: Apply Optimizations

**Priority order**: Indexes → Query rewrite → Index hints → Advanced patterns

**4.1 Create Missing Indexes**

```cypher
// Selective property indexes
CREATE INDEX attribute_name IF NOT EXISTS FOR (attr:Attribute) ON (attr.name);
CREATE INDEX asset_status IF NOT EXISTS FOR (a:Asset) ON (a.status);

// Multi-tenant composite indexes (CRITICAL for Chariot)
CREATE INDEX asset_username_status IF NOT EXISTS FOR (a:Asset) ON (a.username, a.status);
```

**Wait for indexes to populate**:
```cypher
SHOW INDEXES YIELD name, state WHERE state = 'POPULATING'
```

**4.2 Optimize Query Structure**

**Strategy A: Start from Selective Node**

```cypher
// BEFORE: Start from high-cardinality Assets
MATCH (a:Asset)-[:HAS_ATTRIBUTE]->(attr:Attribute)
WHERE attr.name = 'critical' AND a.status = 'A'
RETURN a

// AFTER: Start from low-cardinality Attributes
MATCH (attr:Attribute)-[:HAS_ATTRIBUTE]-(a:Asset)
WHERE attr.name = 'critical' AND a.status = 'A'
RETURN a
```

**Strategy B: Use Index Hints**

```cypher
MATCH (attr:Attribute)
USING INDEX attr:Attribute(name)
WHERE attr.name = 'critical'
MATCH (attr)<-[:HAS_ATTRIBUTE]-(a:Asset)
WHERE a.status = 'A'
RETURN a
```

**Strategy C: Filter Early with EXISTS**

```cypher
MATCH (a:Asset)
WHERE a.status = 'A'
  AND EXISTS {
    MATCH (a)-[:HAS_ATTRIBUTE]->(attr:Attribute)
    WHERE attr.name = 'critical'
  }
RETURN a
```

**See**: [references/optimization-patterns.md](references/optimization-patterns.md) for advanced strategies

### Phase 5: Verify Improvement

**5.1 Profile Optimized Query**

```cypher
PROFILE
[optimized query]
```

**5.2 Compare Metrics**

| Metric         | Before | After | Improvement |
| -------------- | ------ | ----- | ----------- |
| Execution time | ?ms    | ?ms   | ?x faster   |
| db hits        | ?      | ?     | ?x fewer    |
| Index usage    | No     | Yes   | ✅          |

**5.3 Validate Results**

```cypher
// Ensure same results
WITH originalResults, optimizedResults
RETURN size(originalResults) = size(optimizedResults) AS countsMatch
```

**Success criteria**:
- Execution time < 100ms (p95)
- db hits reduced by 10x+
- Query uses indexes (`NodeIndexSeek` in PROFILE)
- Results identical to original query

### Phase 6: Platform Integration (Optional)

**When needed**: Query is generated by Chariot's query builder (`pkg/query/read.go`)

**6.1 Update Query Builder**

If optimization requires query structure changes, update the query builder:

```go
// modules/chariot/backend/pkg/query/read.go
// Add optimization logic to generate efficient query patterns
```

**6.2 Test Integration**

```bash
cd modules/chariot/backend
go test ./pkg/query/... -v -run TestReadQuery
```

**See**: [references/query-builder-integration.md](references/query-builder-integration.md)

## Common Optimization Patterns

### Pattern: Multi-Tenant Query Optimization

```cypher
// Chariot-specific: Always filter by username first
MATCH (a:Asset)
USING INDEX a:Asset(username)
WHERE a.username = $username AND a.status = 'A'
MATCH (a)-[:HAS_ATTRIBUTE]->(attr:Attribute)
WHERE attr.name = 'critical'
RETURN a
```

**Why**: Username provides highest selectivity in multi-tenant systems

### Pattern: Reverse Traversal Direction

```cypher
// If Attribute has lower cardinality than Asset
MATCH (attr:Attribute)<-[:HAS_ATTRIBUTE]-(a:Asset)
WHERE attr.name = 'critical' AND a.status = 'A'
RETURN a
```

**Why**: Start from smaller node set, traverse to larger

### Pattern: Relationship Filtering

```cypher
// Filter relationships during traversal
MATCH (a:Asset)-[r:HAS_ATTRIBUTE WHERE r.validated = true]->(attr:Attribute)
WHERE attr.name = 'critical'
RETURN a
```

**Why**: Reduces relationship expansion before filtering

**See**: [references/optimization-patterns.md](references/optimization-patterns.md) for complete pattern catalog

## Troubleshooting

### Query Still Slow After Indexing

**Check**:
1. Is index being used? (`EXPLAIN` should show `NodeIndexSeek`)
2. Is index populated? (`SHOW INDEXES` state should be `ONLINE`)
3. Are statistics updated? (`CALL db.stats.retrieve('GRAPH COUNTS')`)
4. Is cardinality estimate correct? Check `rows` in `PROFILE`

**Solutions**:
- Force index usage with `USING INDEX` hint
- Rewrite query to match index structure
- Consider composite indexes for multiple filters

### Optimization Made Query Slower

**Likely causes**:
- Index not selective enough (returns too many rows)
- Query planner chose wrong execution plan
- Cardinality estimates incorrect

**Solutions**:
- Remove index hint, let planner choose
- Use `runtime=slotted` or `runtime=pipelined` (Neo4j 5.x)
- Analyze statistics: `CALL db.stats.retrieve('GRAPH COUNTS')`

### Results Don't Match After Optimization

**Causes**:
- Relationship direction changed incorrectly
- Filter logic altered (AND vs OR)
- Implicit vs explicit relationship patterns

**Solution**: Revert optimization, verify query semantics step by step

**See**: [references/troubleshooting.md](references/troubleshooting.md)

## Integration

### Called By

- `backend-developer` agent when implementing slow query fixes
- `backend-reviewer` agent when reviewing query performance
- `/chariot-api` command when diagnosing API slowness

### Requires (invoke before starting)

| Skill                       | When  | Purpose                                 |
| --------------------------- | ----- | --------------------------------------- |
| `querying-neo4j-with-cypher` | Start | Modern syntax patterns for query rewrite |
| `using-skills`              | Start | Skill discovery and invocation patterns |

### Calls (during execution)

| Skill                       | Phase/Step | Purpose                              |
| --------------------------- | ---------- | ------------------------------------ |
| `querying-neo4j-with-cypher` | Phase 4.2  | Query rewrite patterns               |
| `verifying-before-completion`| Phase 5.3  | Validate optimization success        |

### Pairs With (conditional)

| Skill                    | Trigger                       | Purpose                    |
| ------------------------ | ----------------------------- | -------------------------- |
| `debugging-systematically`| Complex performance issues   | Root cause analysis        |
| `orchestrating-research` | Unknown Neo4j optimization   | Research best practices    |

## Related Skills

- `querying-neo4j-with-cypher` - Modern Cypher syntax and query patterns
- `debugging-systematically` - Systematic debugging methodology
- `verifying-before-completion` - Final validation checklist

## References

Detailed guidance organized by topic:

- [profiling-queries.md](references/profiling-queries.md) - PROFILE/EXPLAIN interpretation
- [execution-plan-analysis.md](references/execution-plan-analysis.md) - Understanding query plans
- [index-strategies.md](references/index-strategies.md) - Index creation and usage patterns
- [optimization-patterns.md](references/optimization-patterns.md) - Common optimization techniques
- [query-builder-integration.md](references/query-builder-integration.md) - Integrating with Chariot query builder
- [troubleshooting.md](references/troubleshooting.md) - Common issues and solutions
