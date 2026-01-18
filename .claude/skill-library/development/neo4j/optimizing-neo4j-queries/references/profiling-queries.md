# Profiling Neo4j Queries

**Detailed guidance on using PROFILE and EXPLAIN to analyze query performance.**

## PROFILE vs EXPLAIN

| Command   | Execution      | Returns                      | Use Case                                    |
| --------- | -------------- | ---------------------------- | ------------------------------------------- |
| `EXPLAIN` | Does NOT run   | Theoretical execution plan   | Quick plan inspection, testing structure    |
| `PROFILE` | RUNS the query | Actual row counts + db hits  | Active performance optimization             |

**Important:** PROFILE consumes additional resources and should only be used during active optimization work, not in production.

## Basic Usage

```cypher
-- View execution plan without running query
EXPLAIN MATCH (p:Person {name: 'Tom Hanks'})-[:ACTED_IN]->(m:Movie) RETURN m.title

-- Profile query and see actual metrics
PROFILE MATCH (p:Person {name: 'Tom Hanks'})-[:ACTED_IN]->(m:Movie) RETURN m.title
```

## Reading PROFILE Output

### Key Columns

| Column          | Description                                  | What to Look For                    |
| --------------- | -------------------------------------------- | ----------------------------------- |
| **Operator**    | The execution module type                    | Seek vs Scan operators              |
| **ID**          | Unique identifier (0 = root)                 | Lower IDs are closer to output      |
| **Details**     | Task description and patterns matched        | Properties and labels being matched |
| **Est. Rows**   | Predicted output based on statistics         | Large discrepancy = planning issue  |
| **Rows**        | Actual rows processed (PROFILE only)         | High early rows = need filtering    |
| **DB Hits**     | Storage engine work units (PROFILE only)     | Primary optimization target         |

### Understanding db hits

**Definition:** A database hit is an abstract unit of storage engine work.

**Operations that generate db hits:**

| Category                 | Operations                                        |
| ------------------------ | ------------------------------------------------- |
| **Node Operations**      | Retrieve by ID, check degree, read labels/props   |
| **Relationship Ops**     | Access by ID, read properties/types               |
| **Search Operations**    | Index seeks, scans, path traversals               |
| **Create/Delete**        | Create/remove nodes, relationships, labels        |

**Why db hits matter more than execution time:**
- Execution time depends on infrastructure (bandwidth, memory, traffic)
- db hits are entirely a function of data model and query design
- db hits are comparable across different environments

## Execution Plan Structure

Plans are **binary trees of operators** read **from bottom to top**:

```
+------------------+
|  ProduceResults  |  <-- ROOT (final output)
+------------------+
         |
+------------------+
|      Filter      |  <-- INTERMEDIATE (transform/filter)
+------------------+
         |
+------------------+
|  Expand(All)     |  <-- INTERMEDIATE (traverse relationships)
+------------------+
         |
+------------------+
| NodeIndexSeek    |  <-- LEAF (initial data access)
+------------------+
```

**Key principle:** Leaf operators at the base access data from storage, intermediate operators transform/filter, root operator produces final results.

## Interpreting Common Operators

### Scan Operators (Least Efficient)

| Operator           | Description                           | Performance                           |
| ------------------ | ------------------------------------- | ------------------------------------- |
| `AllNodesScan`     | Reads ALL nodes from storage          | AVOID - performance problems likely   |
| `NodeByLabelScan`  | Reads all nodes with specific label   | Better, but still scans               |
| `NodeIndexScan`    | Examines all indexed values           | For range/prefix queries              |

### Seek Operators (Most Efficient)

| Operator               | Description                           | Performance                    |
| ---------------------- | ------------------------------------- | ------------------------------ |
| `NodeIndexSeek`        | Finds nodes using index lookup        | OPTIMAL for exact matches      |
| `NodeUniqueIndexSeek`  | Seeks within unique constraint index  | OPTIMAL - returns max 1 row    |
| `NodeByIdSeek`         | Retrieves nodes by internal ID        | Fast direct access             |

### Expand Operators

| Operator              | Description                                | Use Case               |
| --------------------- | ------------------------------------------ | ---------------------- |
| `Expand(All)`         | Traverses all relationships from nodes     | Pattern matching       |
| `Expand(Into)`        | Finds relationships between known nodes    | Joining patterns       |
| `OptionalExpand(All)` | Returns null when no match                 | Optional patterns      |
| `VarLengthExpand`     | Variable-length paths                      | Path queries           |

### Eager Operators (Watch for These!)

| Operator            | Description              | Memory Impact              |
| ------------------- | ------------------------ | -------------------------- |
| `Sort`              | Orders rows              | HIGH - buffers all rows    |
| `EagerAggregation`  | Groups and aggregates    | HIGH - buffers all rows    |
| `Distinct`          | Removes duplicates       | HIGH - tracks all seen     |
| `NodeHashJoin`      | Hash join on node IDs    | HIGH - builds hash table   |

## Red Flags in Execution Plans

**Indicators of performance problems:**

1. **High number of db hits** - especially if increasing through query
2. **NodeByLabelScan or AllNodesScan as first step** - indicates missing indexes
3. **Large estimated rows early in plan** - data not being filtered efficiently
4. **Multiple Eager operators** - high memory usage risk
5. **Estimated rows very different from actual** - cardinality estimation issue

## Optimization Opportunities Checklist

When reviewing a PROFILE output:

- [ ] Is the anchor step using NodeIndexSeek? (If not, create index)
- [ ] Are relationship types specified? (Reduces Expand costs)
- [ ] Are filters applied early? (Close to leaf operators)
- [ ] Are there unnecessary Eager operators? (Consider restructuring)
- [ ] Is LIMIT applied early? (Can reduce processing)
- [ ] Do estimated rows match actual rows? (If not, statistics may be stale)

## Example: Before/After Analysis

**Before optimization:**
```cypher
-- AllNodesScan: 292 db hits
PROFILE MATCH (p {name: 'Tom Hanks'}) RETURN p
```

**Step 1 - Add label:**
```cypher
-- NodeByLabelScan: 379 db hits (more work but targeted)
PROFILE MATCH (p:Person {name: 'Tom Hanks'}) RETURN p
```

**Step 2 - Create index:**
```cypher
CREATE INDEX FOR (p:Person) ON (p.name)

-- NodeIndexSeek: 5 db hits (98% reduction!)
PROFILE MATCH (p:Person {name: 'Tom Hanks'}) RETURN p
```

## Related References

- [execution-plan-analysis.md](execution-plan-analysis.md) - Deeper execution plan patterns
- [index-strategies.md](index-strategies.md) - Creating effective indexes
- [optimization-patterns.md](optimization-patterns.md) - Query rewriting techniques
