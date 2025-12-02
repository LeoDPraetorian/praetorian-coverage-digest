# Change Data Capture (CDC)

**Requires:** Neo4j 5.13.0+, CDC enabled (`dbms.cdc.state=FULL`)

## Overview

CDC enables real-time change tracking for nodes and relationships.

## Get Current Change ID

```cypher
CALL db.cdc.current() YIELD id AS currentChangeId
RETURN currentChangeId
```

Save this ID to query changes since that point.

## Query Changes

### All Changes Since ID

```cypher
CALL db.cdc.query($previousChangeId)
YIELD change
RETURN change
```

### Filter by Operation Type

```cypher
-- 'c' = create, 'u' = update, 'd' = delete
CALL db.cdc.query($previousChangeId, [{
    select: "n",      -- 'n' for nodes, 'r' for relationships
    operation: "c"    -- Only creations
}])
YIELD change
RETURN change.elementId, change.after AS newNode
```

### Filter by Labels

```cypher
-- Only Person node changes
CALL db.cdc.query($previousChangeId, [{
    select: "n",
    labels: ["Person"]
}])
YIELD change
RETURN change
```

### Filter by Changed Properties

```cypher
-- Only changes to specific properties
CALL db.cdc.query($previousChangeId, [{
    select: "n",
    changedProperties: ["name", "email", "status"]
}])
YIELD change
RETURN change.elementId, change.before, change.after
```

### Relationship Changes

```cypher
-- Relationships between specific node types
CALL db.cdc.query($previousChangeId, [{
    select: "r",
    start: { labels: ["Person"] },
    end: { labels: ["Company"] }
}])
YIELD change
RETURN change
```

## Change Object Structure

```json
{
  "id": "change-id-string",
  "txId": 12345,
  "seq": 1,
  "metadata": { "txStartTime": "..." },
  "eventType": "n",
  "operation": "c",
  "elementId": "4:xxx:123",
  "labels": ["Person"],
  "before": null,
  "after": { "name": "Alice", "age": 30 }
}
```

## Practical Pattern: Sync to External System

```cypher
// Get changes and process them
CALL db.cdc.query($lastProcessedId, [{
    select: "n",
    labels: ["Asset"],
    operation: "u"
}])
YIELD change
WITH change
WHERE change.after.status <> change.before.status
RETURN
    change.elementId AS assetId,
    change.before.status AS oldStatus,
    change.after.status AS newStatus,
    change.txId AS transactionId
```

## Important Notes

1. CDC must be enabled in database config
2. Store `changeId` to resume from last position
3. CDC has performance overhead - use selectively
4. Changes are transactional (atomic per transaction)
