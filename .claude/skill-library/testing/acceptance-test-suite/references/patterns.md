# Test Patterns - Detailed Implementation Guide

This document provides complete implementation details for the three core test patterns used in Chariot acceptance tests.

## Pattern 1: Table-Driven Parallel API Tests

**When to use**: Testing API endpoints (CRUD operations, data validation)

### Complete Implementation

```go
package assets

import (
    "testing"
    "github.com/praetorian-inc/chariot/acceptance/pkg/ops"
    "github.com/praetorian-inc/chariot/acceptance/pkg/lib/optionals"
    "github.com/praetorian-inc/tabularium/pkg/model/model"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func Test_AddAsset(t *testing.T) {
    t.Parallel()  // Enable parallel execution

    // Setup: Creates isolated test user + API client
    helper, err := ops.NewTestHelper(t)
    require.NoError(t, err)

    // Define test cases
    testCases := []struct {
        name        string
        dataGen     func() model.Assetlike
        shouldError bool
        expectJobs  optionals.Bool  // Three-state: True/False/Unset
    }{
        {
            name:       "add domain asset",
            dataGen:    helper.GenerateDomainAssetData,
            expectJobs: optionals.True,
        },
        {
            name:       "add repository",
            dataGen:    helper.GenerateRepositoryAssetData,
            expectJobs: optionals.True,
        },
        {
            name:        "add integration should error",
            dataGen:     helper.GenerateGithubIntegrationData,
            shouldError: true,
        },
        {
            name:    "add web application",
            dataGen: helper.GenerateWebApplicationAssetData,
            // expectJobs unset - no job assertions
        },
    }

    // Execute test cases
    for _, tc := range testCases {
        t.Run(tc.name, func(t *testing.T) {
            t.Parallel()  // Subtests also run in parallel

            // 1. Generate test data
            assetData := tc.dataGen()

            // 2. Call API endpoint
            created, err := helper.AddAsset(assetData)

            // 3. Handle expected errors
            if tc.shouldError {
                require.Error(t, err)
                return
            }

            // 4. Validate response
            require.NoError(t, err)
            assert.Equal(t, created.GetSource(), model.ProvidedSource)
            helper.ValidateAsset(t, created, assetData)

            // 5. Query back to verify persistence
            assetData.GetBase().Key = created.GetKey()
            queried, err := helper.GetAsset(assetData)
            require.NoError(t, err)
            assert.Equal(t, created, queried)

            // 6. Assert async job queuing behavior
            if tc.expectJobs.Unset() {
                return  // No job assertions needed
            }

            if tc.expectJobs.True() {
                helper.AssertJobsQueuedForTarget(t, queried)
                helper.AssertTablePrefixInserted(t, job.EmptyJob(queried).Key,
                    table.JobIsStatus(model.Queued))
            } else {
                helper.AssertNoJobsQueuedForTarget(t, queried)
                helper.AssertTablePrefixNotInserted(t, job.EmptyJob(queried).Key)
            }
        })
    }
}
```

### Key Characteristics

- **`t.Parallel()`** at both test and subtest level
- **Table-driven** with descriptive test case names
- **TestHelper** encapsulates API client, user management, assertions
- **Job validation** checks SQS queues and DynamoDB
- **Automatic cleanup** via `t.Cleanup()`

### API Test Lifecycle

1. **Setup** - `NewTestHelper(t)` creates isolated test user + API client
2. **Generate data** - Use factory: `helper.GenerateDomainAssetData()`
3. **Execute** - Call API: `helper.AddAsset(data)`
4. **Validate** - Check response matches input
5. **Query back** - Verify persistence: `helper.GetAsset(data)`
6. **Assert jobs** - Check SQS queues for async jobs
7. **Cleanup** - Automatic via `t.Cleanup()`

### Data Generators Available

```go
// Asset generators (return model.Assetlike)
asset := helper.GenerateDomainAssetData()         // *model.Asset
repo := helper.GenerateRepositoryAssetData()      // *model.Repository
webApp := helper.GenerateWebApplicationAssetData() // *model.WebApplication
adDomain := helper.GenerateADDomainAssetData()    // *model.ADObject
integration := helper.GenerateGithubIntegrationData() // *model.Integration

// Risk generator (returns concrete type)
risk := helper.GenerateRiskData(asset)  // *model.Risk (not Assetlike)

// Seed generators (use AssetWithSource modifier)
seedData := helper.GenerateAssetWithOpts(
    helper.GenerateDomainAssetData,
    data.AssetWithSource(model.SeedSource),
)
```

### optionals.Bool Usage

```go
// Three states for job expectations
expectJobs: optionals.True   // Explicitly expect jobs queued
expectJobs: optionals.False  // Explicitly expect NO jobs queued
expectJobs: optionals.Unset  // Skip job assertions (unset/omitted)

// Usage in test
if tc.expectJobs.True() {
    helper.AssertJobsQueuedForTarget(t, asset)
} else if tc.expectJobs.False() {
    helper.AssertNoJobsQueuedForTarget(t, asset)
} else if tc.expectJobs.Unset() {
    return  // Skip job checks
}
```

---

## Pattern 2: Multi-User Tests

**When to use**: Testing multi-tenant functionality, permissions, account management

### Complete Implementation

```go
package accounts

func Test_AddAccount_User(t *testing.T) {
    t.Parallel()

    // Create two independent test users
    ownerHelper, err := ops.NewTestHelper(t)
    require.NoError(t, err)

    memberHelper, err := ops.NewTestHelper(t)
    require.NoError(t, err)

    memberEmail := memberHelper.Username

    // Prepare account data
    settings := map[string]string{"notification": "enabled"}
    settingsJSON, err := json.Marshal(settings)
    require.NoError(t, err)

    account := &model.Account{
        Name:     ownerHelper.User.Email,
        Member:   memberEmail,
        Settings: settingsJSON,
        Secret:   map[string]string{},
    }

    // Owner adds member to account
    created, err := ownerHelper.AddAccount(account)
    require.NoError(t, err)
    assert.NotEmpty(t, created.Key)
    assert.Equal(t, memberEmail, created.Member)

    // Verify both users can see the account
    ownerHelper.AssertTableItemInserted(t, created)
    memberHelper.AssertTableItemInserted(t, created)
}
```

### Use Cases

- Account member management
- Permission validation
- Multi-tenant data isolation
- Collaboration features

### Key Points

- **Two TestHelpers** - Each user gets isolated helper
- **Independent credentials** - Each user has unique Cognito account
- **Cross-user validation** - Verify data visibility from both perspectives
- **Automatic cleanup** - Both helpers clean up via `t.Cleanup()`

---

## Pattern 3: Compute Capability Tests (Sequential)

**When to use**: Testing security capability execution and output validation

### Complete Implementation

```go
package compute

func TestCompute(t *testing.T) {
    // Setup: Increase timeout for SQS operations
    invoker.SetInvokerTimeout(t, 5*time.Second)

    // Create passive helper (no active user needed)
    helper, err := ops.NewPassiveTestHelper()
    require.NoError(t, err)

    // Start mock worker threads (3 workers)
    worker, err := SetupWorker(helper)
    require.NoError(t, err)

    t.Cleanup(func() {
        worker.StopWorker()
    })

    // Add initial seeds to trigger capabilities
    err = AddInitialSeeds(helper)
    require.NoError(t, err)

    // Test each security capability
    tests := []struct {
        name       string
        capability model.Capability
    }{
        {name: "Subdomain", capability: &subdomain.Subdomain{}},
        {name: "GitHub", capability: &github.Github{}},
        {name: "Amazon", capability: &amazon.Amazon{}},
        {name: "WHOIS", capability: &whois.Whois{}},
        {name: "Resolver", capability: &resolver.Resolver{}},
        {name: "GithubRepository", capability: &repository.GithubRepository{}},
        {name: "Portscan", capability: &portscan.Portscan{}},
        {name: "Nuclei", capability: &nuclei.Nuclei{}},
    }

    for _, tc := range tests {
        t.Run(tc.name, func(t *testing.T) {
            // NO t.Parallel() - compute tests run sequentially
            assertions.CapabilityResults(t, helper, tc.capability)
        })
    }
}
```

### How Compute Tests Work

1. **Setup workers** - `SetupWorker()` starts 3 background goroutines that poll SQS
2. **Add seeds** - Create assets that trigger capability execution
3. **Workers process** - Goroutines pull jobs from SQS, execute mocked capabilities
4. **Collect results** - `CapabilityCollector` gathers expected outputs
5. **Validate existence** - Query API to verify outputs exist:
   - Graph models in Neo4j
   - Table models in DynamoDB
   - Files in S3
6. **Cleanup** - Stop workers, clear queue

### Capability Validation

```go
package assertions

func CapabilityResults(t *testing.T, helper *ops.TestHelper, capability model.Capability) {
    t.Helper()

    // Initialize expected results collection
    once.Do(func() {
        err := expected2.InitializeCollection()
        require.NoError(t, err)
    })

    // Collect expected outputs for this capability
    c := expected2.NewCapabilityCollector(helper.User.Email)
    collected, err := c.Collect(capability, expected2.WithFull())
    require.NoError(t, err)
    require.True(t, len(collected.GraphModels) > 0)

    // Validate graph models exist (Neo4j via API)
    for _, m := range collected.GraphModels {
        helper.AssertAPIGraphItemExists(t, m)
        if t.Failed() {
            t.Errorf("expected graph model %q to exist for %s",
                m.GetKey(), capability.Name())
            t.FailNow()
        }
    }

    // Validate table models exist (DynamoDB via API)
    for _, m := range collected.TableModels {
        helper.AssertAPITableItemExists(t, m)
        if t.Failed() {
            t.Errorf("expected table model %q to exist for %s",
                m.GetKey(), capability.Name())
            t.FailNow()
        }
    }

    // Validate files exist (S3 via API)
    for _, f := range collected.Files {
        helper.AssertFileExists(t, &f)
        if t.Failed() {
            t.Errorf("expected file %q to exist for %s",
                f.GetKey(), capability.Name())
            t.FailNow()
        }
    }
}
```

### Why Sequential

- Compute tests **share a queue and worker pool**
- Parallelization would cause **race conditions**
- Workers process jobs in order from shared SQS queues
- **Each test must complete** before next begins

### Mocking

- Capabilities run in **mock mode** (`CHARIOT_MOCK_MODE=on`)
- **Predefined outputs** for each capability
- No actual network calls or external services
- Fast, deterministic results

---

## Pattern Comparison

| Aspect | API Tests | Multi-User Tests | Compute Tests |
|--------|-----------|------------------|---------------|
| **Parallelization** | ✅ Yes (`t.Parallel()`) | ✅ Yes (`t.Parallel()`) | ❌ No (sequential) |
| **TestHelper** | `NewTestHelper(t)` | Multiple `NewTestHelper(t)` | `NewPassiveTestHelper()` |
| **Data Generation** | Factory methods | Factory methods | Seed creation |
| **Validation** | Direct assertions | Cross-user assertions | Eventual consistency |
| **Cleanup** | Automatic | Automatic (per helper) | Worker stop + cleanup |
| **Execution Time** | Fast (parallel) | Fast (parallel) | Slower (sequential) |

---

## Writing New Tests - Step by Step

### Step 1: Choose Test Type

**API Test** - CRUD operations, data validation
- Location: `tests/api/{domain}/`
- Pattern: Table-driven parallel
- Example: Asset/Seed/Risk CRUD

**Multi-User Test** - Permissions, collaboration
- Location: `tests/api/accounts/`
- Pattern: Multiple TestHelpers
- Example: Account member management

**Compute Test** - Capability execution
- Location: `tests/compute/compute_test.go`
- Pattern: Sequential with workers
- Example: Subdomain, GitHub, Nuclei

### Step 2: Create Test File (API Tests)

**File naming**: `{operation}_test.go`

```go
package assets  // or seeds, risks, etc.

import (
    "testing"
    "github.com/praetorian-inc/chariot/acceptance/pkg/ops"
    "github.com/praetorian-inc/chariot/acceptance/pkg/lib/optionals"
    "github.com/praetorian-inc/tabularium/pkg/model/model"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func Test_YourOperation(t *testing.T) {
    t.Parallel()
    helper, err := ops.NewTestHelper(t)
    require.NoError(t, err)

    testCases := []struct {
        name        string
        dataGen     func() model.Assetlike
        shouldError bool
        expectJobs  optionals.Bool
    }{
        {
            name:       "successful operation",
            dataGen:    helper.GenerateDomainAssetData,
            expectJobs: optionals.True,
        },
        {
            name:        "expected error case",
            dataGen:     helper.GenerateSomeInvalidData,
            shouldError: true,
        },
    }

    for _, tc := range testCases {
        t.Run(tc.name, func(t *testing.T) {
            t.Parallel()

            // 1. Generate data
            data := tc.dataGen()

            // 2. Call API
            result, err := helper.YourAPIMethod(data)

            // 3. Handle expected errors
            if tc.shouldError {
                require.Error(t, err)
                return
            }

            // 4. Validate
            require.NoError(t, err)
            helper.ValidateSomething(t, result, data)

            // 5. Query back (optional)
            queried, err := helper.GetSomething(data)
            require.NoError(t, err)

            // 6. Assert jobs (if applicable)
            if tc.expectJobs.True() {
                helper.AssertJobsQueuedForTarget(t, queried)
            }
        })
    }
}
```

### Step 3: Add Assertions

```go
// Basic testify assertions
require.NoError(t, err)           // Fail test immediately if error
assert.Equal(t, expected, actual) // Check equality (continue on failure)
assert.Contains(t, slice, item)   // Check slice membership
assert.NotEmpty(t, value)         // Check non-empty

// Helper validators
helper.ValidateAsset(t, asset, data)
helper.ValidateSeed(t, seed, data)

// Queue/job assertions
helper.AssertJobsQueuedForTarget(t, target)
helper.AssertNoJobsQueuedForTarget(t, target)

// Table assertions
helper.AssertTableItemInserted(t, item)
helper.AssertTablePrefixInserted(t, prefix, filters...)
helper.AssertTablePrefixNotInserted(t, prefix)

// API existence assertions (for compute tests)
helper.AssertAPIGraphItemExists(t, model)
helper.AssertAPITableItemExists(t, model)
helper.AssertFileExists(t, file)
```

---

## Common Patterns and Utilities

### Data Key Management

```go
// Keys are generated by backend after creation
asset := helper.GenerateDomainAssetData()
created, err := helper.AddAsset(asset)
require.NoError(t, err)

// Backend sets the key - use it for subsequent operations
key := created.GetKey()

// Update the data object with the key for querying
asset.GetBase().Key = key
queried, err := helper.GetAssetByKey(key)
```

### Error Testing

```go
testCases := []struct {
    name        string
    dataGen     func() model.Assetlike
    shouldError bool
}{
    {
        name:        "invalid input",
        dataGen:     helper.GenerateInvalidData,
        shouldError: true,
    },
}

// In test execution
if tc.shouldError {
    require.Error(t, err)
    return  // Exit early on expected error
}
require.NoError(t, err)
// Continue with validation...
```

---

## Summary

**Three Core Patterns:**
1. **Table-Driven Parallel API Tests** - Fast, isolated, concurrent
2. **Multi-User Tests** - Permissions, collaboration, multi-tenancy
3. **Sequential Compute Tests** - Capability execution, workers, eventual consistency

**Key Principles:**
- **API tests**: Parallel execution with `t.Parallel()`
- **Multi-user tests**: Multiple helpers, cross-user validation
- **Compute tests**: Sequential with shared worker pool
- **All tests**: Automatic cleanup via `t.Cleanup()`
