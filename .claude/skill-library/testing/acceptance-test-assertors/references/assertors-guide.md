# Assertors Guide - Complete Reference

This document provides comprehensive details for all Chariot acceptance test assertors.

## QueueAssertor - Real-Time SQS Monitoring

**Purpose**: Continuous background monitoring of SQS queues with job capture

**Implementation**: `pkg/assertors/queue/`

### How It Works

1. **Auto-starts** when TestHelper created (via `NewTestHelper(t)`)
2. **Background goroutines** continuously poll 6 SQS queues
3. **Captures jobs** as they arrive and stores in memory
4. **Assertions query** stored jobs (not live SQS)
5. **Auto-cleanup** via `t.Cleanup()` stops goroutines

### Available Methods

```go
// Primary assertions
helper.AssertJobsQueuedForTarget(t, target, conditions...)
helper.AssertNoJobsQueuedForTarget(t, target, conditions...)

// Debug utilities
helper.DumpQueues(t)  // Logs all captured jobs
```

### Condition System

```go
// Filter jobs by creation time
queue.CreatedSince(time.Now().Add(-10*time.Second))

// Usage with conditions
helper.AssertJobsQueuedForTarget(t, asset,
    queue.CreatedSince(testStartTime),
)
```

---

## TableAssertor - Direct DynamoDB Validation

**Purpose**: Direct table queries bypassing API layer

**Implementation**: `pkg/assertors/table/`

### Methods

```go
// Exact key matching
helper.AssertTableItemInserted(t, item)
helper.AssertTableItemNotInserted(t, item)

// Prefix matching with conditions
helper.AssertTablePrefixInserted(t, keyPrefix, conditions...)
helper.AssertTablePrefixNotInserted(t, keyPrefix)

// Debug
helper.DumpTable(t, keyPrefix)
```

### Conditions

```go
// Job status filtering
table.JobIsStatus(model.Queued)

// Time filtering
table.CreatedSince(time.Now().Add(-10*time.Second))

// Multiple conditions (AND)
helper.AssertTablePrefixInserted(t, jobKeyPrefix,
    table.JobIsStatus(model.Queued),
    table.CreatedSince(testStartTime),
)
```

---

## APIAssertor - Eventual Consistency Validation

**Purpose**: API endpoint validation with automatic retries

**Implementation**: `pkg/assertors/api/`

### Why Use This

- **Eventual consistency** - Neo4j propagation delays
- **Compute tests** - Validating capability outputs
- **User perspective** - Tests what users actually see

### Methods

```go
// Graph model validation (Neo4j via /my endpoint)
helper.AssertAPIGraphItemExists(t, graphModel)

// Table model validation (DynamoDB via API)
helper.AssertAPITableItemExists(t, tableModel)

// Custom queries
helper.AssertAPIGraphQuery(t, query.Query{...})
```

### Retry Logic

- **90-second timeout** with exponential backoff
- **Automatic retries** until item exists or timeout
- **Used in compute tests** for eventual consistency

---

## DataAssertor - Model Structure Validation

**Purpose**: Validates model fields and structure

**Implementation**: `pkg/assertors/data/`

### Methods

```go
helper.ValidateAsset(t, created, expected)
helper.ValidateSeed(t, seed, expected)
helper.ValidateRisk(t, risk, expected)
```

### What Gets Validated

**For Assets:**
- Core validity check (`asset.Valid()`)
- Required fields (Created, Visited, Group, Identifier)
- Correct labels (AssetLabel, TTLLabel, SeedLabel)
- Valid source (Seed, Provided, Self, Account)
- Valid origin (capability name or username)

**For Seeds:**
- Same as assets plus SeedLabel verification

**For Risks:**
- History record structure
- Status transitions
- Risk-specific fields

---

## FilesAssertor - S3 File Validation

**Purpose**: S3 file operations validation

**Implementation**: `pkg/assertors/files/`

### Methods

```go
helper.AssertFileExists(t, fileData)
helper.AssertFileContent(t, fileData)
helper.DumpFile(t, fileName)
```

---

## SecretsAssertor & UsersAssertor

**SecretsAssertor**: AWS Secrets Manager validation
**UsersAssertor**: Cognito user operations validation

**Implementation**: `pkg/assertors/secrets/`, `pkg/assertors/users/`

---

## Generic Condition System

All assertors support reusable conditions via generic interface:

```go
type TestCondition[T any] interface {
    Condition(T) bool  // Returns true if item matches
    String() string    // Human-readable description
}
```

### Creating Custom Conditions

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

## TestHelper Embedded Composition

Assertors are embedded in TestHelper for ergonomic access:

```go
type TestHelper struct {
    User     *lib.User
    Client   *api.Client

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

**Benefit**: Call `helper.AssertX()` instead of `helper.XAssertor.AssertX()`

---

## Debugging Assertions

All assertors provide **automatic dumps** on failure:

### Queue Debugging
```go
// On failure, automatically logs captured jobs
helper.AssertJobsQueuedForTarget(t, asset)
// Output: All jobs per queue with keys and timestamps
```

### Table Debugging
```go
// On failure, logs matching items
helper.AssertTableItemInserted(t, account)
```

### Manual Dumps
```go
helper.DumpQueues(t)        // All captured jobs
helper.DumpTable(t, prefix) // Table items by prefix
helper.DumpFile(t, filename) // File contents
```

---

## Best Practices

### ✅ Do's

1. **Use `t.Helper()`** in assertion functions
2. **Provide debug dumps** when assertions fail
3. **Use conditions** for flexible filtering
4. **Handle eventual consistency** with retries
5. **Clean up resources** automatically
6. **Embed into TestHelper** for ergonomic access

### ❌ Don'ts

1. **Don't skip `t.Helper()`** - makes debugging harder
2. **Don't hard-code timeouts** - use grace periods
3. **Don't silently fail** - always log state
4. **Don't create assertors in tests** - use TestHelper
5. **Don't forget cleanup** - causes flaky tests
6. **Don't assume immediate consistency** - use retries

---

## Adding New Assertors

### Step-by-Step

1. **Create package** `pkg/assertors/mynew/`
2. **Implement assertion methods** with `t.Helper()`
3. **Add debug dumps** on failure
4. **Add optional conditions** using `TestCondition[T]`
5. **Embed into TestHelper**
6. **Initialize in NewTestHelper**
7. **Add cleanup** if needed

### Template

```go
package mynew

type MyAssertor struct {
    username string
    // dependencies
}

func NewMyAssertor(username string) (*MyAssertor, error) {
    return &MyAssertor{username: username}, nil
}

func (a *MyAssertor) AssertSomething(t *testing.T, data Data, conditions ...Condition) {
    t.Helper()

    // Query for data
    results := a.query(data)

    // Filter by conditions
    filtered := applyConditions(results, conditions)

    // Validate
    if len(filtered) == 0 {
        a.dumpState(t)  // Debug dump
        t.Errorf("expected data not found")
    }
}

func (a *MyAssertor) dumpState(t *testing.T) {
    t.Helper()
    t.Logf("Debug state: ...")
}
```

---

## Summary

**Six Assertor Types:**
1. **QueueAssertor** - Real-time SQS monitoring
2. **TableAssertor** - Direct DynamoDB queries
3. **APIAssertor** - Eventual consistency with retries
4. **DataAssertor** - Model structure validation
5. **FilesAssertor** - S3 file operations
6. **SecretsAssertor / UsersAssertor** - Additional services

**Core Patterns:**
- Embedded composition in TestHelper
- Generic condition system
- Automatic debug dumps
- Retry logic for consistency
- Cleanup via `t.Cleanup()`
