# Execution Plan Analysis

**Deep dive into reading and interpreting Neo4j execution plans.**

## Execution Plan Structure

Neo4j execution plans are **binary trees of operators** that describe how a query will be (EXPLAIN) or was (PROFILE) executed.

### Tree Reading Order

**Always read from BOTTOM to TOP:**

```
+----------------------+
|    ProduceResults    |  ← 4. Final output (ROOT)
+----------------------+
          |
+----------------------+
|       Projection     |  ← 3. Select return columns
+----------------------+
          |
+----------------------+
|        Filter        |  ← 2. Apply WHERE conditions
+----------------------+
          |
+----------------------+
|     NodeIndexSeek    |  ← 1. Data access (LEAF)
+----------------------+
```

### Operator Categories

**Leaf Operators** (Bottom - Data Access)
- `NodeIndexSeek`, `NodeByLabelScan`, `AllNodesScan`
- Access data from storage
- These are your starting point

**Intermediate Operators** (Middle - Transform/Filter)
- `Filter`, `Expand`, `Projection`
- Transform or filter rows from child operators

**Root Operator** (Top - Output)
- `ProduceResults`
- Produces final query output

## Key Metrics to Analyze

### Estimated Rows vs Actual Rows

```
+----------------+------+---------+-------------+
|    Operator    | Rows | Est.    | DB Hits     |
+----------------+------+---------+-------------+
|ProduceResults  | 10   | 100     | 0           |
|Filter          | 10   | 100     | 200         |
|NodeByLabelScan | 200  | 1000    | 201         |
+----------------+------+---------+-------------+
```

**Analysis:**
- **Est. vs Actual discrepancy**: Est. 1000 rows but only 200 actual → Statistics may be stale
- **High rows early**: 200 rows at scan before filter → Consider adding index
- **db hits accumulation**: 401 total db hits → Watch for growth patterns

### db hits Analysis

Track db hits at each operator level:

| db hits Pattern | Indicates | Action |
|-----------------|-----------|--------|
| High at leaf (scan) | Missing index | Create index on filtered property |
| High at Expand | Many relationships | Specify relationship types, filter early |
| High at Filter | Late filtering | Move filters closer to data access |
| Increasing through plan | Cardinality explosion | Restructure query |

## Operator Deep Dive

### Data Access Operators

**AllNodesScan** - AVOID
```
+------------------+------+------+---------+
| Operator         | Rows | Hits | Notes   |
+------------------+------+------+---------+
| AllNodesScan     | ALL  | HIGH | BAD!    |
+------------------+------+------+---------+
```
- Scans every node in the database
- No label specified in query
- **Fix**: Add label to MATCH pattern

**NodeByLabelScan** - ACCEPTABLE
```
+------------------+------+------+---------+
| Operator         | Rows | Hits | Notes   |
+------------------+------+------+---------+
| NodeByLabelScan  | N    | N+1  | OK      |
+------------------+------+------+---------+
```
- Scans all nodes with specific label
- Better than AllNodesScan
- **Fix**: Add index for NodeIndexSeek

**NodeIndexSeek** - OPTIMAL
```
+------------------+------+------+---------+
| Operator         | Rows | Hits | Notes   |
+------------------+------+------+---------+
| NodeIndexSeek    | M    | M    | BEST!   |
+------------------+------+------+---------+
```
- Direct index lookup
- Minimal db hits
- **Goal**: All filtered properties should use this

### Relationship Operators

**Expand(All)**
```
+------------------+------+------+------------------------+
| Operator         | Rows | Hits | Details                |
+------------------+------+------+------------------------+
| Expand(All)      | N*R  | N+R  | (n)-[r]->() or (n)<-[r]-() |
+------------------+------+------+------------------------+
```
- Traverses all relationships from matching nodes
- Rows multiply by relationship count
- **Optimize**: Specify relationship type to reduce expansion

**DirectedRelationshipTypeScan**
```
+------------------------------+------+------+
| Operator                     | Rows | Hits |
+------------------------------+------+------+
| DirectedRelTypeScan          | R    | R    |
+------------------------------+------+------+
```
- Scans relationships of specific type
- More efficient than Expand(All)
- Used when relationship type is indexed

### Filter Operators

**Filter**
```
+------------------+------+------+------------------------+
| Operator         | Rows | Hits | Details                |
+------------------+------+------+------------------------+
| Filter           | M<N  | N*P  | WHERE conditions       |
+------------------+------+------+------------------------+
```
- Applies WHERE conditions
- P = number of properties checked
- **Watch**: Position in plan - earlier is better

### Eager Operators (Memory Warning)

**Sort**
```
+------------------+------+------+------------------------+
| Operator         | Rows | Hits | Memory Impact          |
+------------------+------+------+------------------------+
| Sort             | N    | 0    | BUFFERS ALL ROWS       |
+------------------+------+------+------------------------+
```
- Must buffer all rows before producing output
- Memory proportional to row count
- **Watch**: Large result sets before Sort

**EagerAggregation**
```
+------------------+------+------+------------------------+
| Operator         | Rows | Hits | Memory Impact          |
+------------------+------+------+------------------------+
| EagerAggregation | G    | 0    | BUFFERS ALL ROWS       |
+------------------+------+------+------------------------+
```
- Groups and aggregates (COUNT, COLLECT, etc.)
- Must see all rows before output
- **Optimize**: Use CALL subqueries to scope

## Plan Comparison Technique

When optimizing, compare plans side by side:

### Before Optimization
```
+----------------------+--------+-----------+
| Operator             | Rows   | DB Hits   |
+----------------------+--------+-----------+
| ProduceResults       | 15     | 0         |
| Filter               | 15     | 3750      |
| Expand(All)          | 3750   | 3875      |
| NodeByLabelScan      | 125    | 126       |
+----------------------+--------+-----------+
Total DB Hits: 7751
```

### After Optimization (with index)
```
+----------------------+--------+-----------+
| Operator             | Rows   | DB Hits   |
+----------------------+--------+-----------+
| ProduceResults       | 15     | 0         |
| Expand(Into)         | 15     | 45        |
| NodeIndexSeek        | 15     | 16        |
+----------------------+--------+-----------+
Total DB Hits: 61
```

**Improvement**: 7751 → 61 db hits (99.2% reduction)

## Warning Signs Checklist

| Warning Sign | Plan Indicator | Likely Cause | Fix |
|-------------|---------------|--------------|-----|
| AllNodesScan as leaf | No label in MATCH | Missing label | Add `:Label` |
| NodeByLabelScan | No index on property | Missing index | CREATE INDEX |
| Expand(All) high rows | Unfiltered traversal | No relationship type | Add `[:TYPE]` |
| Filter late in plan | High rows at filter | Late filtering | Restructure query |
| Large Sort/Eager | Buffer before output | Large result set | Add early LIMIT |
| Est. >> Actual rows | Statistics outdated | Stale statistics | Run db.stats.refresh |

## Analyzing Complex Plans

For multi-MATCH queries, look for:

1. **Multiple scan operators**: Each MATCH may start a new scan
2. **Hash joins**: Used to combine results from different starting points
3. **Cartesian products**: Watch for `CartesianProduct` operator
4. **Argument operators**: Pass context between plan parts

```
+----------------------+--------+-----------+
| Operator             | Rows   | DB Hits   |
+----------------------+--------+-----------+
| ProduceResults       | 100    | 0         |
| CartesianProduct     | 100    | 0         |  ← WARNING!
| NodeByLabelScan      | 10     | 11        |
| NodeByLabelScan      | 10     | 11        |
+----------------------+--------+-----------+
```

**CartesianProduct** = disconnected patterns = 10 × 10 = 100 rows

## Related References

- [profiling-queries.md](profiling-queries.md) - Using PROFILE and EXPLAIN
- [optimization-patterns.md](optimization-patterns.md) - Query rewriting techniques
- [index-strategies.md](index-strategies.md) - Creating effective indexes
