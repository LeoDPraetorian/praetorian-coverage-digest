# Phase 6: Testing

**Purpose**: Create and validate tests for the integration implementation.

## Overview

Phase 6 is a three-step process that creates comprehensive test coverage through test planning, implementation, and validation. The goal is ≥80% code coverage with meaningful tests.

**Three steps:**
1. **Test Planning** (`test-lead`) - Create test strategy and test cases
2. **Test Implementation** (`backend-tester`) - Write test files with mocks
3. **Test Validation** (`test-lead`) - Verify tests meet the plan

## Step 1: Test Planning

**Agent**: `test-lead`

**Focus**: Create test-plan.md with test strategy, cases, and coverage targets.

### Agent Prompt

```markdown
Task: Create test plan for {vendor} integration

INPUT FILES:
- architecture.md: Implementation design
- Implementation files: {list}
- p0-compliance-review.md: P0 requirements verified
- code-quality-review.md: Quality baseline

TEST PLAN REQUIREMENTS:
1. Unit tests for each public method
2. Integration tests with mock server
3. Coverage targets per file (≥80%)
4. Mock requirements for external API
5. Error scenario coverage

OUTPUT: test-plan.md with:
- Test strategy overview
- Test cases per file/method
- Mock server requirements
- Coverage targets
- Test data requirements

MANDATORY SKILLS:
- persisting-agent-outputs

OUTPUT_DIRECTORY: {from Phase 0}
```

### test-plan.md Structure

```markdown
# Test Plan: {vendor} Integration

## Test Strategy

### Approach
- Unit tests: Test individual methods with mocked dependencies
- Integration tests: Test full handler with mock HTTP server
- Coverage target: ≥80% per file

### Mock Requirements
- Mock vendor API server
- Mock Job.Secret for credentials
- Mock Collector for Job.Send verification

## Test Cases

### {vendor}.go (Primary Handler)

#### Match() Tests
| Test Case | Input | Expected | Coverage |
|-----------|-------|----------|----------|
| match_valid_job | job.Type = "{vendor}" | true | Match() |
| match_invalid_job | job.Type = "other" | false | Match() |

#### Invoke() Tests
| Test Case | Setup | Expected | Coverage |
|-----------|-------|----------|----------|
| invoke_success | Valid credentials, mock server returns assets | No error, assets sent | Invoke(), enumerate() |
| invoke_invalid_credentials | Invalid API key | Error: "validating credentials" | Invoke(), ValidateCredentials() |
| invoke_api_error | Mock server returns 500 | Error: "listing assets" | Invoke(), enumerate() |
| invoke_empty_response | Mock server returns empty | No error, no assets sent | Invoke(), enumerate() |

#### CheckAffiliation() Tests
| Test Case | Setup | Expected | Coverage |
|-----------|-------|----------|----------|
| affiliation_exists | Asset exists in API | (true, nil) | CheckAffiliation() |
| affiliation_not_found | Asset not in API | (false, nil) | CheckAffiliation() |
| affiliation_deleted | Asset marked deleted | (false, nil) | CheckAffiliation() |
| affiliation_api_error | Mock server returns error | (false, error) | CheckAffiliation() |
| affiliation_no_cloud_id | Asset missing CloudId | (false, error) | CheckAffiliation() |

#### ValidateCredentials() Tests
| Test Case | Setup | Expected | Coverage |
|-----------|-------|----------|----------|
| validate_success | Valid API key, mock returns user | nil | ValidateCredentials() |
| validate_invalid_key | Invalid API key | Error: "authentication failed" | ValidateCredentials() |
| validate_missing_secret | Job.Secret missing api_key | Error: "getting api key" | ValidateCredentials() |

### {vendor}_client.go (if exists)

| Test Case | Method | Expected | Coverage |
|-----------|--------|----------|----------|
| list_assets_success | ListAssets() | Assets returned | ListAssets() |
| list_assets_pagination | ListAssets() | All pages fetched | ListAssets() pagination |
| get_asset_success | GetAsset() | Asset returned | GetAsset() |
| get_asset_not_found | GetAsset() | NotFound error | GetAsset() error path |

### {vendor}_transform.go (if exists)

| Test Case | Function | Expected | Coverage |
|-----------|----------|----------|----------|
| transform_full_asset | transformAsset() | All fields mapped | transformAsset() |
| transform_minimal_asset | transformAsset() | Required fields only | transformAsset() nil handling |
| transform_with_tags | transformAsset() | Tags become attributes | transformAsset() attributes |

## Mock Server Specification

### Endpoints to Mock

| Endpoint | Method | Response |
|----------|--------|----------|
| /api/v1/assets | GET | Paginated asset list |
| /api/v1/assets/{id} | GET | Single asset or 404 |
| /api/v1/user | GET | Current user (auth check) |

### Mock Response Payloads

```go
// Success response for /api/v1/assets
mockListResponse := &ListAssetsResponse{
    Items: []*VendorAsset{
        {ID: "asset-1", Name: "host-1", CloudID: "cloud-1"},
        {ID: "asset-2", Name: "host-2", CloudID: "cloud-2"},
    },
    NextToken: "",
}

// 404 response for /api/v1/assets/{id}
mockNotFoundResponse := &ErrorResponse{
    Code:    "NOT_FOUND",
    Message: "Asset not found",
}
```

## Coverage Targets

| File | Target | Critical Paths |
|------|--------|----------------|
| {vendor}.go | ≥80% | Invoke(), CheckAffiliation(), ValidateCredentials() |
| {vendor}_client.go | ≥80% | All API methods, error handling |
| {vendor}_transform.go | ≥90% | All transform functions |

## Test Data

### Valid Credentials
```go
testAPIKey := "test-api-key-12345"
```

### Test Assets
```go
testAssets := []*VendorAsset{
    {ID: "test-1", Name: "test-host-1", CloudID: "cloud-1"},
    {ID: "test-2", Name: "test-host-2", CloudID: "cloud-2"},
}
```
```

## Step 2: Test Implementation

**Agent**: `backend-tester`

**Focus**: Implement tests according to test-plan.md.

### Agent Prompt

```markdown
Task: Implement tests for {vendor} integration

INPUT FILES:
- test-plan.md: Test cases and mock requirements
- Implementation files: {list}
- architecture.md: Reference for expected behavior

IMPLEMENTATION REQUIREMENTS:
1. Create {vendor}_test.go with all test cases from plan
2. Create mock server for vendor API
3. Create mock Job.Secret
4. Achieve ≥80% coverage per file

MANDATORY SKILLS:
- developing-with-tdd
- testing-integrations (library skill for mock patterns)
- persisting-agent-outputs

OUTPUT_DIRECTORY: {from Phase 0}
OUTPUT FILES:
- Test files in modules/chariot/backend/pkg/tasks/integrations/{vendor}/

TEST PATTERNS TO USE:
```go
// Mock server setup
func setupMockServer(t *testing.T) *httptest.Server {
    mux := http.NewServeMux()
    mux.HandleFunc("/api/v1/assets", func(w http.ResponseWriter, r *http.Request) {
        json.NewEncoder(w).Encode(mockListResponse)
    })
    return httptest.NewServer(mux)
}

// Mock Job.Secret
type mockSecret struct {
    values map[string]string
}

func (m *mockSecret) Get(key string) (string, error) {
    if v, ok := m.values[key]; ok {
        return v, nil
    }
    return "", fmt.Errorf("secret not found: %s", key)
}

// Test structure
func TestVendor_Invoke_Success(t *testing.T) {
    // Setup
    server := setupMockServer(t)
    defer server.Close()

    task := &Vendor{
        // ... setup with mock server URL
    }

    // Execute
    err := task.Invoke()

    // Assert
    require.NoError(t, err)
    // ... additional assertions
}
```

SUCCESS CRITERIA:
- All tests from test-plan.md implemented
- Tests pass: `go test ./...`
- Coverage ≥80%: `go test -cover ./...`
```

### Test File Structure

```go
package {vendor}_test

import (
    "context"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

// Mock infrastructure
func setupMockServer(t *testing.T, handlers map[string]http.HandlerFunc) *httptest.Server {
    mux := http.NewServeMux()
    for path, handler := range handlers {
        mux.HandleFunc(path, handler)
    }
    return httptest.NewServer(mux)
}

type mockSecret struct {
    values map[string]string
}

func (m *mockSecret) Get(key string) (string, error) {
    if v, ok := m.values[key]; ok {
        return v, nil
    }
    return "", fmt.Errorf("secret not found: %s", key)
}

type mockCollector struct {
    assets []*model.Asset
}

func (m *mockCollector) Send(asset *model.Asset) {
    m.assets = append(m.assets, asset)
}

// Match() tests
func TestVendor_Match_ValidJob(t *testing.T) {
    task := &Vendor{}
    job := model.Job{Type: "{vendor}"}

    result := task.Match(job)

    assert.True(t, result)
}

func TestVendor_Match_InvalidJob(t *testing.T) {
    task := &Vendor{}
    job := model.Job{Type: "other"}

    result := task.Match(job)

    assert.False(t, result)
}

// Invoke() tests
func TestVendor_Invoke_Success(t *testing.T) {
    // Setup mock server
    server := setupMockServer(t, map[string]http.HandlerFunc{
        "/api/v1/user": func(w http.ResponseWriter, r *http.Request) {
            json.NewEncoder(w).Encode(&User{ID: "user-1"})
        },
        "/api/v1/assets": func(w http.ResponseWriter, r *http.Request) {
            json.NewEncoder(w).Encode(&ListResponse{
                Items:     testAssets,
                NextToken: "",
            })
        },
    })
    defer server.Close()

    collector := &mockCollector{}
    task := &Vendor{
        BaseCapability: capability.BaseCapability{
            Job: model.Job{
                Secret: &mockSecret{values: map[string]string{"api_key": "test-key"}},
            },
        },
        // Override base URL to mock server
    }

    err := task.Invoke()

    require.NoError(t, err)
    assert.Len(t, collector.assets, 2)
}

func TestVendor_Invoke_InvalidCredentials(t *testing.T) {
    server := setupMockServer(t, map[string]http.HandlerFunc{
        "/api/v1/user": func(w http.ResponseWriter, r *http.Request) {
            w.WriteHeader(http.StatusUnauthorized)
            json.NewEncoder(w).Encode(&ErrorResponse{Code: "UNAUTHORIZED"})
        },
    })
    defer server.Close()

    task := &Vendor{
        // ... setup
    }

    err := task.Invoke()

    require.Error(t, err)
    assert.Contains(t, err.Error(), "validating credentials")
}

// CheckAffiliation() tests
func TestVendor_CheckAffiliation_Exists(t *testing.T) {
    server := setupMockServer(t, map[string]http.HandlerFunc{
        "/api/v1/assets/cloud-1": func(w http.ResponseWriter, r *http.Request) {
            json.NewEncoder(w).Encode(&Asset{ID: "asset-1", DeletedAt: ""})
        },
    })
    defer server.Close()

    task := &Vendor{/* setup */}
    asset := model.Asset{CloudId: "cloud-1"}

    affiliated, err := task.CheckAffiliation(asset)

    require.NoError(t, err)
    assert.True(t, affiliated)
}

func TestVendor_CheckAffiliation_NotFound(t *testing.T) {
    server := setupMockServer(t, map[string]http.HandlerFunc{
        "/api/v1/assets/cloud-1": func(w http.ResponseWriter, r *http.Request) {
            w.WriteHeader(http.StatusNotFound)
        },
    })
    defer server.Close()

    task := &Vendor{/* setup */}
    asset := model.Asset{CloudId: "cloud-1"}

    affiliated, err := task.CheckAffiliation(asset)

    require.NoError(t, err)
    assert.False(t, affiliated)
}

func TestVendor_CheckAffiliation_MissingCloudId(t *testing.T) {
    task := &Vendor{/* setup */}
    asset := model.Asset{CloudId: ""}  // Missing

    affiliated, err := task.CheckAffiliation(asset)

    require.Error(t, err)
    assert.Contains(t, err.Error(), "missing cloud id")
    assert.False(t, affiliated)
}

// ValidateCredentials() tests
func TestVendor_ValidateCredentials_Success(t *testing.T) {
    server := setupMockServer(t, map[string]http.HandlerFunc{
        "/api/v1/user": func(w http.ResponseWriter, r *http.Request) {
            json.NewEncoder(w).Encode(&User{ID: "user-1"})
        },
    })
    defer server.Close()

    task := &Vendor{
        BaseCapability: capability.BaseCapability{
            Job: model.Job{
                Secret: &mockSecret{values: map[string]string{"api_key": "test-key"}},
            },
        },
    }

    err := task.ValidateCredentials()

    require.NoError(t, err)
}

func TestVendor_ValidateCredentials_MissingSecret(t *testing.T) {
    task := &Vendor{
        BaseCapability: capability.BaseCapability{
            Job: model.Job{
                Secret: &mockSecret{values: map[string]string{}},  // Empty
            },
        },
    }

    err := task.ValidateCredentials()

    require.Error(t, err)
    assert.Contains(t, err.Error(), "getting api key")
}
```

## Step 3: Test Validation

**Agent**: `test-lead`

**Focus**: Verify tests meet the plan and achieve coverage targets.

### Agent Prompt

```markdown
Task: Validate tests for {vendor} integration

INPUT FILES:
- test-plan.md: Expected test cases
- Test files: {list}
- Implementation files: Reference

VALIDATION REQUIREMENTS:
1. All test cases from plan are implemented
2. Tests pass: `go test ./...`
3. Coverage ≥80%: `go test -cover ./...`
4. Mock server covers all API endpoints

OUTPUT: test-validation.md with:
- Validation verdict: VALIDATED | NEEDS_WORK
- Test case mapping (plan → implementation)
- Coverage report
- Missing tests (if any)

RUN COMMANDS:
```bash
cd modules/chariot/backend
go test ./pkg/tasks/integrations/{vendor}/... -v
go test ./pkg/tasks/integrations/{vendor}/... -cover
```

MANDATORY SKILLS:
- persisting-agent-outputs

OUTPUT_DIRECTORY: {from Phase 0}
```

### test-validation.md Structure

```markdown
# Test Validation: {vendor}

## Verdict: {VALIDATED | NEEDS_WORK}

## Test Execution Results

```bash
$ go test ./pkg/tasks/integrations/{vendor}/... -v
=== RUN   TestVendor_Match_ValidJob
--- PASS: TestVendor_Match_ValidJob (0.00s)
=== RUN   TestVendor_Match_InvalidJob
--- PASS: TestVendor_Match_InvalidJob (0.00s)
... (all tests)
PASS
```

## Coverage Report

```bash
$ go test ./pkg/tasks/integrations/{vendor}/... -cover
ok  	.../integrations/{vendor}	0.5s	coverage: 85.2% of statements
```

| File | Coverage | Target | Status |
|------|----------|--------|--------|
| {vendor}.go | 85.2% | ≥80% | ✅ |
| {vendor}_client.go | 82.1% | ≥80% | ✅ |
| {vendor}_transform.go | 91.0% | ≥90% | ✅ |

## Test Case Mapping

| Plan Test Case | Implementation | Status |
|----------------|----------------|--------|
| match_valid_job | TestVendor_Match_ValidJob | ✅ |
| match_invalid_job | TestVendor_Match_InvalidJob | ✅ |
| invoke_success | TestVendor_Invoke_Success | ✅ |
| invoke_invalid_credentials | TestVendor_Invoke_InvalidCredentials | ✅ |
| ... | ... | ... |

## Missing Tests
{None if VALIDATED}
{List if NEEDS_WORK}

## Mock Coverage

| Endpoint | Mocked | Tests Using |
|----------|--------|-------------|
| /api/v1/assets | ✅ | Invoke tests |
| /api/v1/assets/{id} | ✅ | CheckAffiliation tests |
| /api/v1/user | ✅ | ValidateCredentials tests |
```

## Retry Logic

**MAX 1 RETRY** before human escalation

If validation fails:
1. Identify missing tests or coverage gaps
2. Spawn fresh `backend-tester` with specific additions needed
3. Re-validate
4. If still failing → Human checkpoint

## Gate Checklist

Phase 6 is complete when:

- [ ] `test-lead` spawned for test planning
- [ ] `test-plan.md` created with all test cases
- [ ] `backend-tester` spawned with `testing-integrations` skill
- [ ] Test files created with mock servers
- [ ] `test-lead` spawned for validation
- [ ] `test-validation.md` created
- [ ] All tests pass: `go test ./...`
- [ ] Coverage ≥80%: Verified in test-validation.md
- [ ] MANIFEST.yaml updated with test files and validation
- [ ] metadata.json phase-6 status updated to 'complete'

## Common Issues

### Issue: Mock Server Complexity

**Symptom**: Hard to mock all API behaviors

**Solution**:
- Use httptest.Server for simple mocks
- Consider table-driven tests for response variations
- Mock at client level if API is complex

### Issue: Coverage Below Target

**Symptom**: Coverage <80% despite all tests

**Solution**:
- Check for unreachable code paths
- Add error scenario tests
- Add edge case tests for transforms

### Issue: Flaky Tests

**Symptom**: Tests pass sometimes, fail others

**Solution**:
- Remove time-dependent assertions
- Use proper test isolation
- Check for race conditions in concurrent code

## Related Phases

- **Phase 4 (Implementation)**: Provides code to test
- **Phase 5 (Review)**: Provides quality baseline
- **Phase 8 (Completion)**: Runs final test verification

## Related Skills

- `developing-with-tdd` - TDD methodology
- `testing-integrations` - Mock patterns for integrations
- `test-lead` agent - Test strategy planning
- `backend-tester` agent - Test implementation
