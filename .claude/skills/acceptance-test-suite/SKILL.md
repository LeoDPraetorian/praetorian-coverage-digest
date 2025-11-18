---
name: acceptance-test-suite
description: This skill provides guidance for working with the Chariot acceptance test suite, which validates the platform's API and compute infrastructure against real AWS services.
---

# Acceptance Test Suite Skill

## When to Use This Skill

Use this skill when:
- Writing new acceptance tests for API endpoints
- Adding compute capability tests
- Understanding existing test patterns
- Debugging test failures
- Reviewing test coverage

## Test Suite Architecture

### Directory Structure

```
modules/chariot/acceptance/tests/
├── api/              # API endpoint integration tests
│   ├── accounts/     # User/member/integration management
│   ├── assets/       # Asset CRUD operations
│   ├── seeds/        # Seed CRUD operations
│   ├── risks/        # Risk management
│   ├── files/        # File upload/download
│   ├── jobs/         # Job creation/queuing
│   └── export/       # Data export endpoints
├── compute/          # Security capability execution tests
│   ├── compute_test.go      # Main capability test suite
│   ├── setup.go             # Worker setup and seed initialization
│   └── assertions/          # Capability validation helpers
└── lambda/           # Lambda function-specific tests
```

### Running Tests

Via the CI/CD script `scripts/run-acceptance-tests.sh`:

```bash
# Full suite with all test types
./scripts/run-acceptance-tests.sh

# With verbose output
./scripts/run-acceptance-tests.sh -v

# Skip specific test categories
./scripts/run-acceptance-tests.sh --skip-unit
./scripts/run-acceptance-tests.sh --skip-api
./scripts/run-acceptance-tests.sh --skip-compute

# Direct Go test execution
go test ./tests/api/... -v           # API tests (parallel)
go test ./tests/compute/... -v       # Compute tests (sequential)
go test ./tests/api/assets -run Test_AddAsset -v  # Specific test
```

**Test execution order:**
1. Unit tests: `go test ./pkg/...`
2. API tests: `go test ./tests/api/...` (parallel)
3. Compute tests: `go test ./tests/compute/...` (sequential)

## Core Test Patterns

### Pattern 1: Table-Driven Parallel API Tests

**When to use:** Testing API endpoints (CRUD operations, data validation)

**Structure:**

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

**Key characteristics:**
- `t.Parallel()` at both test and subtest level
- Table-driven with descriptive test case names
- `TestHelper` encapsulates API client, user management, assertions
- Job validation checks SQS queues and DynamoDB
- Automatic cleanup via `t.Cleanup()`

**API Test Lifecycle:**
1. **Setup** - `NewTestHelper(t)` creates isolated test user + API client
2. **Generate data** - Use factory: `helper.GenerateDomainAssetData()`
3. **Execute** - Call API: `helper.AddAsset(data)`
4. **Validate** - Check response matches input
5. **Query back** - Verify persistence: `helper.GetAsset(data)`
6. **Assert jobs** - Check SQS queues for async jobs
7. **Cleanup** - Automatic via `t.Cleanup()`

### Pattern 2: Multi-User Tests

**When to use:** Testing multi-tenant functionality, permissions, account management

**Structure:**

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

**Use cases:**
- Account member management
- Permission validation
- Multi-tenant data isolation
- Collaboration features

### Pattern 3: Compute Capability Tests (Sequential)

**When to use:** Testing security capability execution and output validation

**Structure:**

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

**How compute tests work:**

1. **Setup workers** - `SetupWorker()` starts 3 background goroutines that poll SQS
2. **Add seeds** - Create assets that trigger capability execution
3. **Workers process** - Goroutines pull jobs from SQS, execute mocked capabilities
4. **Collect results** - `CapabilityCollector` gathers expected outputs
5. **Validate existence** - Query API to verify outputs exist:
   - Graph models in Neo4j
   - Table models in DynamoDB
   - Files in S3
6. **Cleanup** - Stop workers, clear queue

**Mocking:** Capabilities run in mock mode (`CHARIOT_MOCK_MODE=on`) with predefined outputs.

**Why sequential:** Compute tests share a queue and worker pool. Parallelization would cause race conditions.

**Capability validation:**

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

## Writing a New Test

### Step 1: Choose the Right Directory

- **API endpoint test** → `tests/api/{domain}/`
  - CRUD operations → `tests/api/assets/`, `tests/api/seeds/`, etc.
  - Account management → `tests/api/accounts/`
  - Export functionality → `tests/api/export/`
- **Compute capability test** → Add to `tests/compute/compute_test.go`
- **Lambda-specific test** → `tests/lambda/{function}/`

### Step 2: Create Test File (API Tests)

**File naming:** `{operation}_test.go` (e.g., `add_test.go`, `update_test.go`, `delete_test.go`)

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

### Step 3: Use Available Data Generators

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

### Step 4: Add Assertions

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

## Best Practices

### Do's ✅

1. **Always use `t.Parallel()`** for API tests (both test and subtest level)
2. **Use table-driven tests** for testing multiple scenarios
3. **Generate unique test data** using `helper.Generate*Data()` methods
4. **Use descriptive test names** in `t.Run()` for clear output
5. **Test both success and failure paths** using `shouldError` flag
6. **Validate job queuing** when operations trigger async processing
7. **Query back after create/update** to verify persistence
8. **Use `optionals.Bool`** for three-state job assertions (True/False/Unset)
9. **Clean up resources** - TestHelper handles this automatically
10. **Wait for async operations** - Add appropriate timeouts for queue processing

### Don'ts ❌

1. **Don't use `t.Parallel()` in compute tests** - they share worker pool
2. **Don't create users manually** - use `NewTestHelper(t)`
3. **Don't hard-code test data** - use generators for uniqueness
4. **Don't skip job assertions** when jobs are expected
5. **Don't share state between tests** - each test must be isolated
6. **Don't assume immediate consistency** - wait for SQS/DynamoDB propagation
7. **Don't forget `t.Helper()`** in assertion functions
8. **Don't mix test types** - keep API, compute, and lambda tests separate

## Common Patterns

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

## Environment Setup

### Required Environment Variables

Create `.env-acceptance` file in `pkg/lib/env/`:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret

# Chariot API
API_URL=https://your-api-gateway-url
COGNITO_CLIENT_ID=your-cognito-client-id
COGNITO_USER_POOL_ID=your-user-pool-id

# Compute Mode (for compute tests)
CHARIOT_MOCK_MODE=on
```

### CI/CD Setup

The `scripts/run-acceptance-tests.sh` script handles:
1. Copying `.env` files from backend to acceptance test locations
2. Enabling `CHARIOT_MOCK_MODE=on` for compute tests
3. Verifying `.env-acceptance` exists
4. Running tests in correct order (unit → api → compute)

## Test Execution Examples

```bash
# Full suite
go test ./... -v -parallel 10

# Specific package
go test ./tests/api/assets -v
go test ./tests/api/seeds -v
go test ./tests/compute -v

# Single test function
go test ./tests/api/assets -run Test_AddAsset -v

# With custom timeout (default may be too short)
go test ./... -v -timeout 30m

# With debug proxy (e.g., Burp Suite)
HTTP_PROXY=http://localhost:8080 go test ./... -v

# Using the CI/CD script
./scripts/run-acceptance-tests.sh -v
./scripts/run-acceptance-tests.sh --skip-unit --skip-api  # Only compute
```

## Available Assertors

The acceptance test framework provides specialized assertors for validating different aspects of the system. All assertors are embedded in TestHelper for ergonomic access.

**Available Assertors:**
- **QueueAssertor** - Real-time SQS queue monitoring and job validation
- **TableAssertor** - Direct DynamoDB table queries with condition filtering
- **APIAssertor** - API endpoint validation with retry logic (for compute tests)
- **DataAssertor** - Model structure and field validation
- **FilesAssertor** - S3 file existence and content validation
- **SecretsAssertor** - AWS Secrets Manager validation
- **UsersAssertor** - Cognito user and authentication validation

**Usage in tests:**
```go
// Assertors are embedded in TestHelper
helper, err := ops.NewTestHelper(t)

// Access assertor methods directly on helper
helper.AssertJobsQueuedForTarget(t, asset)       // QueueAssertor
helper.AssertTableItemInserted(t, item)          // TableAssertor
helper.ValidateAsset(t, asset, data)             // DataAssertor
helper.AssertAPIGraphItemExists(t, graphModel)   // APIAssertor
helper.AssertFileExists(t, file)                 // FilesAssertor
```

**For detailed assertor documentation**, see the `acceptance-test-assertors` skill which covers:
- How each assertor works internally
- Condition system for filtering
- Adding new assertors
- Debugging assertion failures

## Key Components Reference

- **TestHelper** (`pkg/ops/`) - Main test orchestration, API client, user management
- **Assertors** (`pkg/assertors/`) - Validation helpers (see `acceptance-test-assertors` skill)
- **Data Factories** (`pkg/data/`) - Test data generators
- **Job Helpers** (`pkg/lib/job/`) - Job key generation and validation
- **Compute Mocking** (`pkg/lib/compute/`) - Mock capability execution

## Related Documentation

- `modules/chariot/acceptance/CLAUDE.md` - Acceptance testing module overview
- `modules/chariot/acceptance/tests/CLAUDE.md` - Detailed test patterns
- `modules/chariot/acceptance/pkg/ops/CLAUDE.md` - TestHelper documentation
- `modules/chariot/acceptance/pkg/assertors/CLAUDE.md` - Assertor patterns
- `scripts/run-acceptance-tests.sh` - CI/CD test execution script

## Summary

**Test Types:**
1. **API tests** - Parallel, table-driven CRUD validation
2. **Compute tests** - Sequential capability execution validation
3. **Multi-user tests** - Permission and multi-tenancy validation
4. **Lambda tests** - Function-specific integration tests

**Core Pattern:** Setup → Generate → Execute → Validate → Assert Jobs → Cleanup

**Execution:** Via `scripts/run-acceptance-tests.sh` (used in CI/CD)

**Key Principle:** Each test is isolated with its own user, data, and cleanup - tests can run in parallel without interference.
