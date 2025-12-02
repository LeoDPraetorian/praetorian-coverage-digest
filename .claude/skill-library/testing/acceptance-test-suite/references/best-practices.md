# Best Practices for Acceptance Testing

This document provides comprehensive guidance on writing effective, maintainable acceptance tests for the Chariot platform.

## ✅ Do's - Follow These Practices

### 1. Always Use `t.Parallel()` for API Tests

**Good**:
```go
func Test_AddAsset(t *testing.T) {
    t.Parallel()  // Test level
    helper, err := ops.NewTestHelper(t)
    require.NoError(t, err)

    for _, tc := range testCases {
        t.Run(tc.name, func(t *testing.T) {
            t.Parallel()  // Subtest level
            // Test implementation
        })
    }
}
```

**Bad**:
```go
func Test_AddAsset(t *testing.T) {
    // Missing t.Parallel() - tests run sequentially
    helper, err := ops.NewTestHelper(t)
    // ...
}
```

**Rationale**: API tests are isolated and can run concurrently, dramatically reducing test suite execution time.

---

### 2. Use Table-Driven Tests

**Good**:
```go
testCases := []struct {
    name        string
    dataGen     func() model.Assetlike
    shouldError bool
    expectJobs  optionals.Bool
}{
    {
        name:       "add domain asset",
        dataGen:    helper.GenerateDomainAssetData,
        expectJobs: optionals.True,
    },
    {
        name:        "add integration should error",
        dataGen:     helper.GenerateGithubIntegrationData,
        shouldError: true,
    },
}

for _, tc := range testCases {
    t.Run(tc.name, func(t *testing.T) {
        t.Parallel()
        // Test implementation
    })
}
```

**Bad**:
```go
func Test_AddDomainAsset(t *testing.T) { /* ... */ }
func Test_AddRepository(t *testing.T) { /* ... */ }
func Test_AddIntegration(t *testing.T) { /* ... */ }
// Duplicate code across multiple functions
```

**Rationale**: Table-driven tests reduce duplication, make patterns explicit, and make adding new test cases trivial.

---

### 3. Generate Unique Test Data

**Good**:
```go
// Each test gets unique data via factory
asset := helper.GenerateDomainAssetData()
created, err := helper.AddAsset(asset)
```

**Bad**:
```go
// Hard-coded data causes conflicts
asset := &model.Asset{
    Group:      "example.com",
    Identifier: "example.com",
}
```

**Rationale**: Unique data prevents test interference and enables parallel execution.

---

### 4. Use Descriptive Test Names

**Good**:
```go
{
    name: "add domain asset successfully",
    name: "add integration should error",
    name: "add web application without jobs",
}
```

**Bad**:
```go
{
    name: "test1",
    name: "test2",
    name: "error case",
}
```

**Rationale**: Descriptive names make test output immediately understandable when failures occur.

---

### 5. Test Both Success and Failure Paths

**Good**:
```go
testCases := []struct {
    name        string
    dataGen     func() model.Assetlike
    shouldError bool
}{
    {
        name:    "valid input succeeds",
        dataGen: helper.GenerateDomainAssetData,
    },
    {
        name:        "invalid input fails",
        dataGen:     helper.GenerateInvalidData,
        shouldError: true,
    },
}

// In test
if tc.shouldError {
    require.Error(t, err)
    return
}
require.NoError(t, err)
```

**Bad**:
```go
// Only testing success path
asset := helper.GenerateDomainAssetData()
created, err := helper.AddAsset(asset)
require.NoError(t, err)
```

**Rationale**: Error handling is critical - test it explicitly.

---

### 6. Validate Job Queuing When Expected

**Good**:
```go
{
    name:       "add asset queues jobs",
    dataGen:    helper.GenerateDomainAssetData,
    expectJobs: optionals.True,
}

// In test
if tc.expectJobs.True() {
    helper.AssertJobsQueuedForTarget(t, created)
    helper.AssertTablePrefixInserted(t, job.EmptyJob(created).Key,
        table.JobIsStatus(model.Queued))
}
```

**Bad**:
```go
// Creates asset but doesn't validate jobs
created, err := helper.AddAsset(asset)
require.NoError(t, err)
// Missing job assertions
```

**Rationale**: Job queuing is a critical side effect that must be validated.

---

### 7. Query Back After Create/Update

**Good**:
```go
// Create
created, err := helper.AddAsset(asset)
require.NoError(t, err)

// Query back to verify persistence
asset.GetBase().Key = created.GetKey()
queried, err := helper.GetAsset(asset)
require.NoError(t, err)
assert.Equal(t, created, queried)
```

**Bad**:
```go
// Create only - doesn't verify persistence
created, err := helper.AddAsset(asset)
require.NoError(t, err)
```

**Rationale**: Validates both creation AND persistence in database.

---

### 8. Use `optionals.Bool` for Three-State Assertions

**Good**:
```go
expectJobs: optionals.True   // Expect jobs
expectJobs: optionals.False  // Expect NO jobs
expectJobs: optionals.Unset  // Skip job checks

// In test
if tc.expectJobs.Unset() {
    return  // Skip assertions
}
if tc.expectJobs.True() {
    helper.AssertJobsQueuedForTarget(t, asset)
}
```

**Bad**:
```go
// Boolean can't represent "don't check"
expectJobs: true   // Expect jobs
expectJobs: false  // Expect NO jobs
// No way to skip checking
```

**Rationale**: Some operations don't trigger jobs - three states handle this elegantly.

---

### 9. Clean Up Resources Automatically

**Good**:
```go
helper, err := ops.NewTestHelper(t)
require.NoError(t, err)
// Cleanup automatic via t.Cleanup()
```

**Bad**:
```go
helper, err := ops.NewTestHelper(t)
defer helper.Cleanup()  // Manual cleanup
```

**Rationale**: `t.Cleanup()` ensures cleanup runs even if test panics.

---

### 10. Wait for Async Operations

**Good**:
```go
created, err := helper.AddAsset(asset)
require.NoError(t, err)

// Give SQS time to process
time.Sleep(2 * time.Second)

helper.AssertJobsQueuedForTarget(t, created)
```

**Bad**:
```go
created, err := helper.AddAsset(asset)
require.NoError(t, err)

// Immediate assertion - may be too fast
helper.AssertJobsQueuedForTarget(t, created)
```

**Rationale**: SQS and DynamoDB have propagation delays.

---

## ❌ Don'ts - Avoid These Anti-Patterns

### 1. Don't Use `t.Parallel()` in Compute Tests

**Bad**:
```go
func TestCompute(t *testing.T) {
    for _, tc := range tests {
        t.Run(tc.name, func(t *testing.T) {
            t.Parallel()  // ❌ Compute tests share worker pool
            assertions.CapabilityResults(t, helper, tc.capability)
        })
    }
}
```

**Good**:
```go
func TestCompute(t *testing.T) {
    for _, tc := range tests {
        t.Run(tc.name, func(t *testing.T) {
            // NO t.Parallel() - sequential execution
            assertions.CapabilityResults(t, helper, tc.capability)
        })
    }
}
```

**Rationale**: Compute tests share SQS queues and workers - parallelization causes race conditions.

---

### 2. Don't Create Users Manually

**Bad**:
```go
// Manual user creation
user, err := users.CreateUser()
client, err := api.NewClient(user.Email, user.Password)
```

**Good**:
```go
// Use TestHelper
helper, err := ops.NewTestHelper(t)
require.NoError(t, err)
```

**Rationale**: TestHelper handles user creation, cleanup, and provides all operations.

---

### 3. Don't Hard-Code Test Data

**Bad**:
```go
asset := &model.Asset{
    Group:      "example.com",
    Identifier: "example.com",
    Status:     model.Active,
}
```

**Good**:
```go
asset := helper.GenerateDomainAssetData()
```

**Rationale**: Hard-coded data causes conflicts when tests run in parallel.

---

### 4. Don't Skip Job Assertions

**Bad**:
```go
created, err := helper.AddAsset(asset)
require.NoError(t, err)
// Missing job validation
```

**Good**:
```go
created, err := helper.AddAsset(asset)
require.NoError(t, err)

helper.AssertJobsQueuedForTarget(t, created)
```

**Rationale**: Jobs are critical side effects that must be validated.

---

### 5. Don't Share State Between Tests

**Bad**:
```go
var sharedAsset model.Assetlike  // Package-level variable

func Test_Create(t *testing.T) {
    sharedAsset = helper.GenerateDomainAssetData()
    created, err := helper.AddAsset(sharedAsset)
}

func Test_Update(t *testing.T) {
    // Uses sharedAsset - race condition
    updated, err := helper.UpdateAsset(sharedAsset)
}
```

**Good**:
```go
func Test_Create(t *testing.T) {
    asset := helper.GenerateDomainAssetData()
    created, err := helper.AddAsset(asset)
}

func Test_Update(t *testing.T) {
    // Creates own data
    asset := helper.GenerateDomainAssetData()
    created, err := helper.AddAsset(asset)
    updated, err := helper.UpdateAsset(created)
}
```

**Rationale**: Shared state prevents parallel execution and causes flaky tests.

---

### 6. Don't Assume Immediate Consistency

**Bad**:
```go
created, err := helper.AddAsset(asset)
require.NoError(t, err)

// Immediate query - may fail
helper.AssertAPIGraphItemExists(t, created)
```

**Good**:
```go
created, err := helper.AddAsset(asset)
require.NoError(t, err)

// APIAssertor has built-in retries
helper.AssertAPIGraphItemExists(t, created)

// Or explicit wait
time.Sleep(2 * time.Second)
```

**Rationale**: SQS, DynamoDB, and Neo4j have eventual consistency.

---

### 7. Don't Forget `t.Helper()` in Assertion Functions

**Bad**:
```go
func ValidateSomething(t *testing.T, data Data) {
    // Missing t.Helper()
    assert.NotEmpty(t, data.Field)
}
```

**Good**:
```go
func ValidateSomething(t *testing.T, data Data) {
    t.Helper()  // Failures point to caller, not this line
    assert.NotEmpty(t, data.Field)
}
```

**Rationale**: `t.Helper()` makes test failures point to actual test code.

---

### 8. Don't Mix Test Types

**Bad**:
```go
// tests/api/assets/compute_test.go
func Test_SubdomainCapability(t *testing.T) {
    // Compute test in API directory
}
```

**Good**:
```go
// tests/api/assets/add_test.go
func Test_AddAsset(t *testing.T) {
    // API test in API directory
}

// tests/compute/compute_test.go
func TestCompute(t *testing.T) {
    // Compute test in compute directory
}
```

**Rationale**: Clear separation aids navigation and CI/CD filtering.

---

## Common Patterns

### Pattern: Data Key Management

```go
// Generate data (no key yet)
asset := helper.GenerateDomainAssetData()

// Create via API (backend generates key)
created, err := helper.AddAsset(asset)
require.NoError(t, err)

// Get the backend-generated key
key := created.GetKey()

// Update original data with key for queries
asset.GetBase().Key = key

// Now can query by key
queried, err := helper.GetAsset(asset)
```

### Pattern: Error Testing

```go
if tc.shouldError {
    require.Error(t, err)
    assert.Contains(t, err.Error(), "expected error message")
    return  // Early exit
}

// Continue with success validation
require.NoError(t, err)
```

### Pattern: Conditional Job Assertions

```go
if tc.expectJobs.Unset() {
    return  // Skip job checking
}

if tc.expectJobs.True() {
    helper.AssertJobsQueuedForTarget(t, created)
    helper.AssertTablePrefixInserted(t, jobKeyPrefix,
        table.JobIsStatus(model.Queued))
} else {
    helper.AssertNoJobsQueuedForTarget(t, created)
}
```

---

## Test Quality Checklist

### Before Committing

- [ ] Tests use `t.Parallel()` (API tests only)
- [ ] Tests are table-driven with descriptive names
- [ ] Test data generated via factories (not hard-coded)
- [ ] Both success and failure paths tested
- [ ] Job queuing validated when expected
- [ ] Resources queried back to verify persistence
- [ ] `optionals.Bool` used for three-state assertions
- [ ] No shared state between tests
- [ ] Appropriate waits for async operations
- [ ] Tests pass locally before pushing

### Code Review Checklist

- [ ] Test file naming follows convention (`{operation}_test.go`)
- [ ] Tests in correct directory (`api/`, `compute/`, `lambda/`)
- [ ] No manual user creation (uses TestHelper)
- [ ] No hard-coded test data
- [ ] Error cases explicitly tested
- [ ] Job assertions present when applicable
- [ ] `t.Helper()` in assertion functions
- [ ] No shared package-level variables
- [ ] Compute tests don't use `t.Parallel()`

---

## Performance Considerations

### Test Execution Speed

**Fast tests** (< 1s):
- API CRUD operations
- Data validation
- Unit tests

**Medium tests** (1-5s):
- Multi-user scenarios
- Job queue validation
- File upload/download

**Slow tests** (> 5s):
- Compute capability tests
- Full workflow integration tests

### Optimization Strategies

1. **Use `t.Parallel()`** for independent tests
2. **Group related assertions** to reduce API calls
3. **Use table-driven tests** to share setup cost
4. **Cache expensive setups** where safe
5. **Run fast tests first** for quick feedback

---

## Summary

**Core Principles:**
1. **Isolation** - Each test independent with own data
2. **Parallelization** - API tests concurrent, compute sequential
3. **Validation** - Verify operations AND side effects
4. **Clarity** - Descriptive names, explicit error testing
5. **Maintainability** - Table-driven, factory-generated data

**Most Important Rules:**
- ✅ Use `t.Parallel()` for API tests
- ✅ Use table-driven patterns
- ✅ Generate unique test data
- ✅ Validate job queuing
- ❌ Don't use `t.Parallel()` in compute tests
- ❌ Don't hard-code test data
- ❌ Don't skip job assertions
- ❌ Don't share state between tests
