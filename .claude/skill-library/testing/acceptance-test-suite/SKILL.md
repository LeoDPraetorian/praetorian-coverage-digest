---
name: acceptance-test-suite
description: Use when writing Chariot acceptance tests, understanding test suite architecture (API/compute/lambda patterns), setting up test environment, or running tests via CI/CD scripts.
allowed-tools: Read, Bash, Grep, Glob
---

# Acceptance Test Suite Skill

## When to Use This Skill

Use this skill when:
- Writing new acceptance tests for API endpoints
- Adding compute capability tests
- Understanding test suite architecture
- Setting up test environment
- Running tests via CI/CD
- Debugging test failures

## Test Suite Architecture

### Directory Structure

```
modules/chariot/acceptance/tests/
├── api/              # API endpoint integration tests (parallel)
│   ├── accounts/     # User/member/integration management
│   ├── assets/       # Asset CRUD operations
│   ├── seeds/        # Seed CRUD operations
│   ├── risks/        # Risk management
│   ├── files/        # File upload/download
│   ├── jobs/         # Job creation/queuing
│   └── export/       # Data export endpoints
├── compute/          # Security capability execution tests (sequential)
│   ├── compute_test.go      # Main capability test suite
│   ├── setup.go             # Worker setup and seed initialization
│   └── assertions/          # Capability validation helpers
└── lambda/           # Lambda function-specific tests
```

### Test Types

| Type | Pattern | Parallelization | Use Case |
|------|---------|-----------------|----------|
| **API Tests** | Table-driven | ✅ Yes (`t.Parallel()`) | CRUD operations, data validation |
| **Multi-User Tests** | Multiple helpers | ✅ Yes (`t.Parallel()`) | Permissions, collaboration |
| **Compute Tests** | Sequential workers | ❌ No (shared pool) | Capability execution |

---

## Core Test Patterns

### Pattern 1: Table-Driven Parallel API Tests

**Most common** - applies to all CRUD operations.

```go
func Test_AddAsset(t *testing.T) {
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

            // 1. Generate test data
            asset Data := tc.dataGen()

            // 2. Call API
            created, err := helper.AddAsset(assetData)

            // 3. Handle expected errors
            if tc.shouldError {
                require.Error(t, err)
                return
            }

            // 4. Validate response
            require.NoError(t, err)
            helper.ValidateAsset(t, created, assetData)

            // 5. Query back to verify persistence
            assetData.GetBase().Key = created.GetKey()
            queried, err := helper.GetAsset(assetData)
            require.NoError(t, err)

            // 6. Assert async jobs
            if tc.expectJobs.True() {
                helper.AssertJobsQueuedForTarget(t, queried)
            }
        })
    }
}
```

**Key characteristics:**
- `t.Parallel()` at test and subtest level
- Table-driven with descriptive names
- TestHelper provides API client + user + assertions
- Validates both operation AND side effects (jobs)

**See [references/patterns.md](references/patterns.md) for complete pattern implementations.**

### Pattern 2: Multi-User Tests

**For permissions and collaboration:**

```go
func Test_AddAccount_User(t *testing.T) {
    t.Parallel()

    // Two independent test users
    ownerHelper, err := ops.NewTestHelper(t)
    require.NoError(t, err)

    memberHelper, err := ops.NewTestHelper(t)
    require.NoError(t, err)

    // Owner adds member to account
    account := &model.Account{
        Name:   ownerHelper.User.Email,
        Member: memberHelper.Username,
    }

    created, err := ownerHelper.AddAccount(account)
    require.NoError(t, err)

    // Verify both users can see it
    ownerHelper.AssertTableItemInserted(t, created)
    memberHelper.AssertTableItemInserted(t, created)
}
```

### Pattern 3: Sequential Compute Tests

**For capability execution:**

```go
func TestCompute(t *testing.T) {
    helper, err := ops.NewPassiveTestHelper()
    require.NoError(t, err)

    // Start mock workers
    worker, err := SetupWorker(helper)
    require.NoError(t, err)
    t.Cleanup(func() { worker.StopWorker() })

    // Add seeds to trigger capabilities
    err = AddInitialSeeds(helper)
    require.NoError(t, err)

    // Test capabilities sequentially
    tests := []struct {
        name       string
        capability model.Capability
    }{
        {name: "Subdomain", capability: &subdomain.Subdomain{}},
        {name: "GitHub", capability: &github.Github{}},
    }

    for _, tc := range tests {
        t.Run(tc.name, func(t *testing.T) {
            // NO t.Parallel() - sequential execution
            assertions.CapabilityResults(t, helper, tc.capability)
        })
    }
}
```

**Why sequential**: Compute tests share SQS queues and worker pool.

**See [references/patterns.md](references/patterns.md) for complete implementations with explanations.**

---

## Running Tests

### Method 1: CI/CD Script (Recommended)

```bash
# Full suite (unit → API → compute)
./scripts/run-acceptance-tests.sh

# With verbose output
./scripts/run-acceptance-tests.sh -v

# Skip categories
./scripts/run-acceptance-tests.sh --skip-unit
./scripts/run-acceptance-tests.sh --skip-api
./scripts/run-acceptance-tests.sh --skip-compute
```

### Method 2: Direct Go Test

```bash
# All tests
go test ./... -v -parallel 10

# Specific package
go test ./tests/api/assets -v
go test ./tests/compute -v

# Single test
go test ./tests/api/assets -run Test_AddAsset -v

# With timeout
go test ./... -v -timeout 30m
```

### Method 3: Debugging with Proxy

```bash
# Capture HTTP traffic
HTTP_PROXY=http://localhost:8080 go test ./tests/api/assets -v
```

**See [references/environment.md](references/environment.md) for complete execution guide and environment setup.**

---

## Test Lifecycle

### API Test Flow

```
1. Setup → NewTestHelper(t) creates user + client
2. Generate → helper.GenerateDomainAssetData()
3. Execute → helper.AddAsset(data)
4. Validate → helper.ValidateAsset(t, created, data)
5. Query Back → helper.GetAsset(data)
6. Assert Jobs → helper.AssertJobsQueuedForTarget(t, created)
7. Cleanup → Automatic via t.Cleanup()
```

### Compute Test Flow

```
1. Setup → SetupWorker() starts background goroutines
2. Seed → AddInitialSeeds() creates assets
3. Process → Workers pull jobs from SQS
4. Execute → Mock capabilities run
5. Collect → CapabilityCollector gathers expected outputs
6. Validate → Query API to verify existence
7. Cleanup → Stop workers
```

---

## Writing New Tests

### Step 1: Choose Test Type

**API Test** → `tests/api/{domain}/{operation}_test.go`
- Pattern: Table-driven parallel
- Example: `tests/api/assets/add_test.go`

**Multi-User Test** → `tests/api/accounts/{operation}_test.go`
- Pattern: Multiple TestHelpers
- Example: `tests/api/accounts/add_account_test.go`

**Compute Test** → `tests/compute/compute_test.go`
- Pattern: Sequential with workers
- Add to existing test suite

### Step 2: Create Test File

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

func Test_YourOperation(t *testing.T) {
    t.Parallel()
    helper, err := ops.NewTestHelper(t)
    require.NoError(t, err)

    // Define test cases
    testCases := []struct {
        name        string
        dataGen     func() model.Assetlike
        shouldError bool
        expectJobs  optionals.Bool
    }{
        {
            name:       "successful case",
            dataGen:    helper.GenerateDomainAssetData,
            expectJobs: optionals.True,
        },
    }

    for _, tc := range testCases {
        t.Run(tc.name, func(t *testing.T) {
            t.Parallel()

            // Test implementation
            data := tc.dataGen()
            result, err := helper.YourOperation(data)

            if tc.shouldError {
                require.Error(t, err)
                return
            }

            require.NoError(t, err)
            helper.ValidateSomething(t, result, data)

            if tc.expectJobs.True() {
                helper.AssertJobsQueuedForTarget(t, result)
            }
        })
    }
}
```

### Step 3: Add Assertions

```go
// Basic assertions
require.NoError(t, err)
assert.Equal(t, expected, actual)

// Helper validators (embedded in TestHelper)
helper.ValidateAsset(t, asset, data)

// Queue/job assertions
helper.AssertJobsQueuedForTarget(t, target)

// Table assertions
helper.AssertTableItemInserted(t, item)

// API existence (compute tests)
helper.AssertAPIGraphItemExists(t, model)
```

**Available assertors**: QueueAssertor, TableAssertor, APIAssertor, DataAssertor, FilesAssertor
**See `acceptance-test-assertors` skill for complete assertor documentation.**

---

## Best Practices Summary

### ✅ Do's (Top 5)

1. **Use `t.Parallel()`** for API tests (both test and subtest level)
2. **Table-driven tests** with descriptive case names
3. **Generate unique data** via factories (not hard-coded)
4. **Validate job queuing** when operations trigger async processing
5. **Query back** after create/update to verify persistence

### ❌ Don'ts (Top 5)

1. **Don't use `t.Parallel()`** in compute tests (shared worker pool)
2. **Don't create users manually** - use `NewTestHelper(t)`
3. **Don't hard-code test data** - causes conflicts in parallel tests
4. **Don't skip job assertions** when jobs are expected
5. **Don't share state** between tests - each test must be isolated

**See [references/best-practices.md](references/best-practices.md) for comprehensive guide with examples.**

---

## Environment Setup

### Required: `.env-acceptance` File

Location: `modules/chariot/acceptance/pkg/lib/env/.env-acceptance`

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret

# Chariot API
API_URL=https://your-api-gateway-url
COGNITO_CLIENT_ID=your-client-id
COGNITO_USER_POOL_ID=your-pool-id

# Compute Mode
CHARIOT_MOCK_MODE=on
```

**See [references/environment.md](references/environment.md) for complete setup guide and CI/CD integration.**

---

## Quick Reference

### Common Assertions

| Assertor | Method | Use Case |
|----------|--------|----------|
| Queue | `AssertJobsQueuedForTarget(t, asset)` | Verify jobs queued |
| Queue | `AssertNoJobsQueuedForTarget(t, asset)` | Verify no jobs |
| Table | `AssertTableItemInserted(t, item)` | Verify DynamoDB persistence |
| API | `AssertAPIGraphItemExists(t, item)` | Verify Neo4j via API |
| Data | `ValidateAsset(t, created, expected)` | Validate structure |

### Data Generators

```go
// Asset types
helper.GenerateDomainAssetData()         // Domain assets
helper.GenerateRepositoryAssetData()      // Repositories
helper.GenerateWebApplicationAssetData() // Web apps

// Risks
helper.GenerateRiskData(asset)  // Risk for target

// Seeds
helper.GenerateAssetWithOpts(
    helper.GenerateDomainAssetData,
    data.AssetWithSource(model.SeedSource),
)
```

### optionals.Bool

```go
expectJobs: optionals.True   // Expect jobs queued
expectJobs: optionals.False  // Expect NO jobs queued
expectJobs: optionals.Unset  // Skip job checks
```

---

## Integration with Other Skills

This skill works with:
- **acceptance-test-operations** - Business-level API operations (`helper.AddAsset()`, `helper.CreateJobs()`)
- **acceptance-test-assertors** - Validation helpers (`AssertJobsQueuedForTarget()`, `ValidateAsset()`)

**Typical flow:**
1. Use **this skill** for test structure and patterns
2. Use **acceptance-test-operations** for API calls
3. Use **acceptance-test-assertors** for validation

---

## Summary

**Test Types:**
1. **API tests** - Parallel, table-driven CRUD validation
2. **Multi-user tests** - Permissions and collaboration
3. **Compute tests** - Sequential capability execution

**Core Pattern**: Setup → Generate → Execute → Validate → Assert Jobs → Cleanup

**Execution**: Via `scripts/run-acceptance-tests.sh` (CI/CD) or `go test`

**Key Principle**: Each test is isolated with own user, data, and cleanup - enabling parallel execution.

---

## Reference Documentation

**Detailed guides:**
- [patterns.md](references/patterns.md) - Three core test patterns with complete implementations
- [environment.md](references/environment.md) - Environment setup, execution methods, CI/CD integration
- [best-practices.md](references/best-practices.md) - Comprehensive do's and don'ts with examples

**Quick links:**
- [Test patterns](references/patterns.md) - Table-driven API, multi-user, compute
- [Environment setup](references/environment.md) - `.env-acceptance`, running tests, debugging
- [Best practices](references/best-practices.md) - What to do and avoid

**Related skills:**
- **acceptance-test-operations** - API operations (AddAsset, CreateJobs, etc.)
- **acceptance-test-assertors** - Validation helpers (AssertJobsQueued, ValidateAsset, etc.)
