---
name: acceptance-test-assertors
description: Use when writing assertions in Chariot acceptance tests, validating SQS queues (QueueAssertor), DynamoDB persistence (TableAssertor), Neo4j via API (APIAssertor), or S3 files (FilesAssertor).
allowed-tools: Read, Bash, Grep, Glob
---

# Acceptance Test Assertors

## When to Use This Skill

Use this skill when:
- Writing assertions in acceptance tests for Chariot platform
- Adding new assertor types for AWS services
- Understanding assertor architecture and embedded composition
- Debugging assertion failures
- Implementing custom conditions for filtering
- Integrating assertors into TestHelper

## Overview

Chariot's acceptance test assertors are **specialized validation helpers** embedded into TestHelper that validate different aspects of platform infrastructure. Each assertor targets a specific AWS service, providing consistent interfaces for test assertions.

**Architecture**: Assertors use **embedded composition** in TestHelper:

```go
// Ergonomic access - methods promoted to TestHelper
helper.AssertJobsQueuedForTarget(t, asset)

// Instead of: helper.QueueAssertor.AssertJobsQueuedForTarget(t, asset)
```

---

## Available Assertors

### 1. QueueAssertor - Real-Time SQS Monitoring

**Purpose**: Continuous background monitoring of SQS queues with job capture

**Quick Usage**:
```go
// Assert jobs were queued for target
helper.AssertJobsQueuedForTarget(t, asset)

// With time filter - only recent jobs
helper.AssertJobsQueuedForTarget(t, asset,
    queue.CreatedSince(time.Now().Add(-10*time.Second)),
)

// Assert NO jobs queued
helper.AssertNoJobsQueuedForTarget(t, asset)
```

**Lifecycle**:
1. Auto-starts on TestHelper creation
2. Background goroutines poll 6 SQS queues
3. Captures and stores jobs
4. Tests query stored jobs
5. Auto-cleanup via `t.Cleanup()`

**When to use**: Validating async job creation after API operations

### 2. TableAssertor - Direct DynamoDB Validation

**Purpose**: Direct table queries bypassing API layer

**Quick Usage**:
```go
// Verify specific item exists
helper.AssertTableItemInserted(t, account)

// Verify items with prefix exist (with conditions)
helper.AssertTablePrefixInserted(t, job.EmptyJob(asset).Key,
    table.JobIsStatus(model.Queued),
    table.CreatedSince(time.Now().Add(-10*time.Second)),
)

// Verify item does NOT exist
helper.AssertTableItemNotInserted(t, account)
```

**When to use**: Validating data persistence, job status, deletion

### 3. APIAssertor - Eventual Consistency Validation

**Purpose**: API endpoint validation with automatic retries (90s timeout)

**Quick Usage**:
```go
// Graph model validation (Neo4j via /my)
helper.AssertAPIGraphItemExists(t, graphModel)

// Table model validation (DynamoDB via API)
helper.AssertAPITableItemExists(t, tableModel)

// Custom queries
helper.AssertAPIGraphQuery(t, query.Query{...})
```

**When to use**: Compute tests, eventual consistency, user perspective validation

### 4. DataAssertor - Model Structure Validation

**Purpose**: Validates model fields and structure

**Quick Usage**:
```go
created, err := helper.AddAsset(data)
require.NoError(t, err)
helper.ValidateAsset(t, created, data)

helper.ValidateSeed(t, seed, data)
helper.ValidateRisk(t, risk, data)
```

**Validates**:
- Core validity (`asset.Valid()`)
- Required fields (Created, Visited, Group, Identifier)
- Correct labels (AssetLabel, TTLLabel)
- Valid source and origin

### 5. FilesAssertor - S3 File Validation

**Quick Usage**:
```go
helper.AssertFileExists(t, fileData)
helper.AssertFileContent(t, fileData)
helper.DumpFile(t, "report.json")
```

### 6. SecretsAssertor & UsersAssertor

**SecretsAssertor**: AWS Secrets Manager validation
**UsersAssertor**: Cognito user operations validation

**See [references/assertors-guide.md](references/assertors-guide.md) for complete assertor implementations.**

---

## Condition System

All assertors support **reusable condition filters**:

```go
type TestCondition[T any] interface {
    Condition(T) bool  // Returns true if item matches
    String() string    // Human-readable description
}
```

**Available Conditions**:
```go
// Queue conditions
queue.CreatedSince(time.Now().Add(-10*time.Second))

// Table conditions
table.JobIsStatus(model.Queued)
table.CreatedSince(timeThreshold)

// Multiple conditions are AND'd together
helper.AssertTablePrefixInserted(t, jobKeyPrefix,
    table.JobIsStatus(model.Queued),          // AND
    table.CreatedSince(testStartTime),        // AND
)
```

**Creating custom conditions**:
```go
func MyCustomCondition(value string) TableCondition {
    condition := func(item model.TableModel) bool {
        return item.Field == value
    }

    stringValue := fmt.Sprintf("Field == %s", value)

    return TableCondition{
        TestCondition: conditions.NewTestCondition(condition, stringValue),
    }
}
```

---

## TestHelper Integration

### Embedded Composition Pattern

```go
type TestHelper struct {
    User   *lib.User
    Client *api.Client

    // Embedded assertors - methods promoted to TestHelper
    *queue.QueueAssertor
    *data2.DataAssertor
    *table.TableAssertor
    *files.FilesAssertor
    *api2.APIAssertor
    *secrets.SecretsAssertor
    *users2.UsersAssertor
}
```

**Benefits**:
- **Ergonomic access**: `helper.AssertX()` vs `helper.XAssertor.AssertX()`
- **Clean test code**: No explicit assertor references
- **Single cleanup**: `helper.Cleanup()` handles all

**Initialization**:
```go
func Test_Example(t *testing.T) {
    t.Parallel()

    // All assertors initialized automatically
    helper, err := ops.NewTestHelper(t)
    require.NoError(t, err)

    // All assertor methods available directly
    helper.AssertJobsQueuedForTarget(t, asset)
    helper.AssertTableItemInserted(t, item)
    helper.ValidateAsset(t, created, data)
}
```

---

## Common Usage Patterns

### Pattern 1: API Operation with Full Validation

```go
// 1. Generate and create
asset := helper.GenerateDomainAssetData()
created, err := helper.AddAsset(asset)
require.NoError(t, err)

// 2. Validate structure
helper.ValidateAsset(t, created, asset)

// 3. Verify jobs queued
helper.AssertJobsQueuedForTarget(t, created)

// 4. Verify table persistence
helper.AssertTableItemInserted(t, created)
```

### Pattern 2: Compute Test Validation

```go
// Collect expected outputs
collected, err := c.Collect(capability)
require.NoError(t, err)

// Validate with retries (eventual consistency)
for _, m := range collected.GraphModels {
    helper.AssertAPIGraphItemExists(t, m)
}

for _, m := range collected.TableModels {
    helper.AssertAPITableItemExists(t, m)
}

for _, f := range collected.Files {
    helper.AssertFileExists(t, &f)
}
```

### Pattern 3: Conditional Assertions

```go
// Multiple conditions (AND)
helper.AssertTablePrefixInserted(t, jobKeyPrefix,
    table.JobIsStatus(model.Queued),
    table.CreatedSince(testStartTime),
)

// No jobs matching conditions
helper.AssertNoJobsQueuedForTarget(t, asset,
    queue.CreatedSince(testStartTime),
)
```

**See [references/usage-patterns.md](references/usage-patterns.md) for complete pattern examples.**

---

## Debugging Assertions

All assertors provide **automatic debugging dumps** on assertion failure.

**Automatic dumps**:
```go
// On failure, automatically logs all queue state
helper.AssertJobsQueuedForTarget(t, asset)

// On failure, logs all matching table items
helper.AssertTableItemInserted(t, account)
```

**Manual dumps**:
```go
helper.DumpQueues(t)              // All captured jobs
helper.DumpTable(t, "#job#...")   // Table items by prefix
helper.DumpFile(t, "report.json") // File contents
```

---

## Quick Reference

### Most Common Assertions

| Assertor | Method | Use Case |
|----------|--------|----------|
| Queue | `AssertJobsQueuedForTarget(t, asset)` | Verify jobs queued after API operation |
| Queue | `AssertNoJobsQueuedForTarget(t, asset)` | Verify no jobs queued |
| Table | `AssertTableItemInserted(t, item)` | Verify item in DynamoDB |
| Table | `AssertTablePrefixInserted(t, prefix, conditions...)` | Verify items with prefix (filtered) |
| API | `AssertAPIGraphItemExists(t, item)` | Verify item in Neo4j via API |
| Data | `ValidateAsset(t, created, expected)` | Validate asset structure |
| Files | `AssertFileExists(t, fileData)` | Verify S3 file exists |

### Most Common Conditions

| Condition | Usage | Purpose |
|-----------|-------|---------|
| `queue.CreatedSince(time)` | Filter by creation time | Only recent jobs |
| `table.JobIsStatus(status)` | Filter by job status | Specific status only |
| `table.CreatedSince(time)` | Filter by creation time | Only recent items |

---

## Best Practices

### ✅ Do's

1. **Use `t.Helper()`** in assertion functions
2. **Provide debug dumps** when assertions fail
3. **Use conditions** for flexible filtering
4. **Handle eventual consistency** with APIAssertor retries
5. **Clean up resources** - TestHelper handles automatically

### ❌ Don'ts

1. **Don't skip `t.Helper()`** - makes debugging harder
2. **Don't hard-code timeouts** - use configurable grace periods
3. **Don't silently fail** - always log state on failure
4. **Don't create assertors in tests** - use TestHelper
5. **Don't assume immediate consistency** - use retries for async ops

---

## Summary

**Assertor Types**:
- **QueueAssertor**: Real-time SQS monitoring
- **TableAssertor**: Direct DynamoDB queries
- **APIAssertor**: Eventual consistency with retries
- **DataAssertor**: Model structure validation
- **FilesAssertor**: S3 file operations

**Core Patterns**:
- Embedded composition for ergonomic access
- Generic condition system via `TestCondition[T]`
- Automatic cleanup via `t.Cleanup()`
- Debug dumps on failures
- Retry logic for eventual consistency

---

## Reference Documentation

**Detailed guides**:
- [assertors-guide.md](references/assertors-guide.md) - Complete implementation details for all six assertors
- [usage-patterns.md](references/usage-patterns.md) - Common usage patterns with examples

**Related skills**:
- **acceptance-test-operations** - API operations (AddAsset, CreateJobs)
- **acceptance-test-suite** - Test structure and patterns
