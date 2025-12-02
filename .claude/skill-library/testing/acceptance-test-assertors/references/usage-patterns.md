# Assertor Usage Patterns

This document provides complete examples of how to use assertors in acceptance tests.

## Pattern 1: API Operation with Validation

**Most common pattern** for API tests:

```go
func Test_AddAsset(t *testing.T) {
    t.Parallel()
    helper, err := ops.NewTestHelper(t)
    require.NoError(t, err)

    // 1. Generate test data
    asset := helper.GenerateDomainAssetData()

    // 2. Perform API operation
    created, err := helper.AddAsset(asset)
    require.NoError(t, err)

    // 3. Validate structure (DataAssertor)
    helper.ValidateAsset(t, created, asset)

    // 4. Verify jobs queued (QueueAssertor)
    helper.AssertJobsQueuedForTarget(t, created)

    // 5. Verify table persistence (TableAssertor)
    helper.AssertTableItemInserted(t, created)
}
```

**Assertors used:**
- DataAssertor: `ValidateAsset()`
- QueueAssertor: `AssertJobsQueuedForTarget()`
- TableAssertor: `AssertTableItemInserted()`

---

## Pattern 2: Compute Test Validation

**For capability execution tests**:

```go
func TestCapability(t *testing.T) {
    helper, err := ops.NewPassiveTestHelper()
    require.NoError(t, err)

    // Collect expected capability outputs
    collected, err := c.Collect(capability)
    require.NoError(t, err)

    // Validate graph models (APIAssertor with retries)
    for _, m := range collected.GraphModels {
        helper.AssertAPIGraphItemExists(t, m)
    }

    // Validate table models (APIAssertor)
    for _, m := range collected.TableModels {
        helper.AssertAPITableItemExists(t, m)
    }

    // Validate files (FilesAssertor)
    for _, f := range collected.Files {
        helper.AssertFileExists(t, &f)
    }
}
```

**Assertors used:**
- APIAssertor: `AssertAPIGraphItemExists()`, `AssertAPITableItemExists()`
- FilesAssertor: `AssertFileExists()`

**Why APIAssertor**: Handles eventual consistency with retries

---

## Pattern 3: Conditional Assertions

**Using conditions for flexible filtering**:

```go
// Assert jobs with multiple conditions
helper.AssertTablePrefixInserted(t, jobKeyPrefix,
    table.JobIsStatus(model.Queued),          // Only queued jobs
    table.CreatedSince(testStartTime),        // Only recent jobs
)

// Assert NO jobs matching conditions
helper.AssertNoJobsQueuedForTarget(t, asset,
    queue.CreatedSince(testStartTime),        // Only check recent
)
```

---

## Debugging Failed Assertions

### Automatic Debug Dumps

All assertors log state on failure:

```go
// This assertion fails
helper.AssertJobsQueuedForTarget(t, asset)

// Automatically logs:
// - All captured jobs in all queues
// - Active filter conditions
// - Job keys and timestamps
```

### Manual Debug Dumps

```go
// Dump all queue state
helper.DumpQueues(t)

// Dump table items by prefix
helper.DumpTable(t, "#job#example.com")

// Dump file contents
helper.DumpFile(t, "report.json")
```

---

## Quick Reference

| Assertor | Primary Use | Key Methods |
|----------|-------------|-------------|
| QueueAssertor | Job queue validation | `AssertJobsQueuedForTarget()` |
| TableAssertor | DynamoDB persistence | `AssertTableItemInserted()` |
| APIAssertor | Eventual consistency | `AssertAPIGraphItemExists()` |
| DataAssertor | Model validation | `ValidateAsset()` |
| FilesAssertor | S3 operations | `AssertFileExists()` |
