# Phase 13: Testing

**Execute tests by spawning backend-tester to implement test plan.**

**This file provides:** Complete phase protocol for integration development.

---

## Overview

Testing executes the test plan by spawning backend-tester:

1. Implement tests according to test-lead's plan (Phase 12)
2. Create mock HTTP server for vendor API
3. Create mock Job.Secret and Collector
4. Write all test cases from plan
5. Achieve coverage targets (≥80%)

**Entry Criteria:** Phase 12 (Test Planning) complete with test plan.

**Exit Criteria:** All tests passing, coverage targets met.

**⛔ COMPACTION GATE 3 FOLLOWS:** Before proceeding to Phase 14, complete [compaction-gates.md](compaction-gates.md) protocol.

---

## Step 1: Pre-Spawn Check

**⚡ PRE-SPAWN CHECK:** Before spawning backend-tester, run intra-phase compaction protocol from [compaction-gates.md](compaction-gates.md#intra-phase-compaction-heavy-phases). If tokens >75%, compact first.

---

## Step 2: Spawn Backend-Tester

````markdown
Task(
subagent_type: "backend-tester",
description: "Implement tests for {vendor} integration",
prompt: "
Task: Implement tests for {vendor} integration according to test plan

INPUT FILES:

- test-plan.md: Test cases and mock requirements
- Implementation files: modules/chariot/backend/pkg/tasks/integrations/{vendor}/
- architecture.md: Reference for expected behavior

IMPLEMENTATION REQUIREMENTS:

1. Create {vendor}\_test.go with all test cases from plan
2. Create mock server for vendor API endpoints
3. Create mock Job.Secret for credentials
4. Create mock Collector for Job.Send verification
5. Achieve ≥80% coverage per file

TEST FILE STRUCTURE:

```go
package {vendor}_test

import (
    \"context\"
    \"encoding/json\"
    \"net/http\"
    \"net/http/httptest\"
    \"testing\"
    \"github.com/stretchr/testify/assert\"
    \"github.com/stretchr/testify/require\"
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
    return \"\", fmt.Errorf(\"secret not found: %s\", key)
}

type mockCollector struct {
    assets []*model.Asset
}

func (m *mockCollector) Send(asset *model.Asset) {
    m.assets = append(m.assets, asset)
}
```
````

MANDATORY SKILLS:

- integrating-with-{vendor}: Vendor API patterns for mocking
- developing-with-tdd: TDD methodology
- testing-integrations: Mock server and test patterns
- gateway-integrations: Integration patterns and P0 requirements
- persisting-agent-outputs: Output file format

OUTPUT_DIRECTORY: {from Phase 1}
OUTPUT FILES:

- modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}\_test.go

SUCCESS CRITERIA:

- All tests from test-plan.md implemented
- Tests pass: `go test ./...`
- Coverage ≥80%: `go test -cover ./...`

Return:
{
'status': 'complete',
'tests_created': {count},
'tests_passed': {count},
'coverage_percent': {coverage},
'plan_adherence': true
}
"
)

````

---

## Step 3: Test Implementation Patterns

### Mock Server Setup

```go
func setupMockServer(t *testing.T, responses map[string]any) *httptest.Server {
    mux := http.NewServeMux()

    // Auth endpoint
    mux.HandleFunc("/api/v1/user", func(w http.ResponseWriter, r *http.Request) {
        // Validate auth header
        if r.Header.Get("Authorization") != "Bearer test-api-key" {
            w.WriteHeader(http.StatusUnauthorized)
            json.NewEncoder(w).Encode(&ErrorResponse{Code: "UNAUTHORIZED"})
            return
        }
        json.NewEncoder(w).Encode(&User{ID: "user-1"})
    })

    // Assets endpoint with pagination
    mux.HandleFunc("/api/v1/assets", func(w http.ResponseWriter, r *http.Request) {
        resp, ok := responses["assets"]
        if !ok {
            resp = &ListResponse{Items: testAssets, NextToken: ""}
        }
        json.NewEncoder(w).Encode(resp)
    })

    return httptest.NewServer(mux)
}
````

### Match() Tests

```go
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
```

### Invoke() Tests

```go
func TestVendor_Invoke_Success(t *testing.T) {
    server := setupMockServer(t, nil)
    defer server.Close()

    collector := &mockCollector{}
    task := &Vendor{
        BaseCapability: capability.BaseCapability{
            Job: model.Job{
                Secret: &mockSecret{values: map[string]string{"api_key": "test-api-key"}},
            },
            Collector: collector,
        },
        baseURL: server.URL,
    }

    err := task.Invoke()

    require.NoError(t, err)
    assert.Len(t, collector.assets, 2)
}

func TestVendor_Invoke_InvalidCredentials(t *testing.T) {
    server := setupMockServer(t, nil)
    defer server.Close()

    task := &Vendor{
        BaseCapability: capability.BaseCapability{
            Job: model.Job{
                Secret: &mockSecret{values: map[string]string{"api_key": "invalid"}},
            },
        },
        baseURL: server.URL,
    }

    err := task.Invoke()

    require.Error(t, err)
    assert.Contains(t, err.Error(), "validating credentials")
}
```

### CheckAffiliation() Tests

```go
func TestVendor_CheckAffiliation_Exists(t *testing.T) {
    server := setupMockServer(t, map[string]any{
        "asset": &Asset{ID: "asset-1", DeletedAt: ""},
    })
    defer server.Close()

    task := &Vendor{baseURL: server.URL}
    asset := model.Asset{CloudId: "cloud-1"}

    affiliated, err := task.CheckAffiliation(asset)

    require.NoError(t, err)
    assert.True(t, affiliated)
}

func TestVendor_CheckAffiliation_MissingCloudId(t *testing.T) {
    task := &Vendor{}
    asset := model.Asset{CloudId: ""}

    affiliated, err := task.CheckAffiliation(asset)

    require.Error(t, err)
    assert.Contains(t, err.Error(), "missing cloud id")
    assert.False(t, affiliated)
}
```

---

## Step 4: Validate Test Output

Check tester returned:

- ✅ `status: "complete"`
- ✅ All tests passing
- ✅ Coverage met (≥80%)
- ✅ Test file created
- ✅ `plan_adherence: true`

**If any tests failing:**

1. Read failure details
2. Determine if implementation bug or test issue
3. **Implementation bug:** Return to Phase 8
4. **Test issue:** Document for Phase 14

---

## Step 5: Run Complete Test Suite

Verify all tests pass together:

```bash
cd modules/chariot/backend

# Run tests with verbose output
go test ./pkg/tasks/integrations/{vendor}/... -v

# Run with coverage
go test ./pkg/tasks/integrations/{vendor}/... -cover

# Generate coverage report
go test ./pkg/tasks/integrations/{vendor}/... -coverprofile=coverage.out
go tool cover -html=coverage.out -o coverage.html
```

---

## Step 6: Update MANIFEST.yaml

```yaml
phases:
  13_testing:
    status: "complete"
    completed_at: "{timestamp}"

testing:
  agent: "backend-tester"

  results:
    tests_created: 14
    tests_passed: 14
    coverage_percent: 85.2

  files_created:
    - "modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}_test.go"

  test_categories:
    match: { created: 2, passed: 2 }
    invoke: { created: 4, passed: 4 }
    checkaffiliation: { created: 5, passed: 5 }
    validatecredentials: { created: 3, passed: 3 }

  plan_adherence: true
```

---

## Step 7: Update TodoWrite & Report

```
TodoWrite([
  { content: "Phase 13: Testing", status: "completed", activeForm: "Implementing tests" },
  { content: "Phase 14: Coverage Verification", status: "in_progress", activeForm: "Verifying coverage" },
  // ... rest
])
```

Output to user:

```markdown
## Testing Complete

**Test Results:**
| Category | Created | Passed |
| ----------------- | ------- | ------ |
| Match | 2 | 2 ✅ |
| Invoke | 4 | 4 ✅ |
| CheckAffiliation | 5 | 5 ✅ |
| ValidateCredentials | 3 | 3 ✅ |
| **Total** | **14** | **14** |

**Coverage:** 85.2% ✅

**Plan Adherence:** All tests from plan implemented

⛔ **COMPACTION GATE 3:** Execute compaction before Phase 14.

→ After compaction, proceeding to Phase 14: Coverage Verification
```

---

## Edge Cases

### Tests Are Flaky

**Solution:** Document for Phase 15. test-lead will flag flakiness as quality issue.

### Mock Server Complexity

**Solution:**

- Use table-driven tests for response variations
- Mock at client level if API is complex
- Use httptest.NewServer for simple mocks

### Coverage Below Target

**Solution:** Document current coverage. Phase 14 will determine if additional tests needed.

---

## Skip Conditions

| Work Type | Testing             |
| --------- | ------------------- |
| SMALL     | Run (focused scope) |
| MEDIUM    | Run                 |
| LARGE     | Run                 |

Testing always runs, but scope varies by work type.

---

## Related References

- [Phase 12: Test Planning](phase-12-test-planning.md) - Previous phase (test plan)
- [Phase 14: Coverage Verification](phase-14-coverage-verification.md) - Next phase
- [compaction-gates.md](compaction-gates.md) - Gate 3 follows this phase
- [testing-integrations](../../../skill-library/testing/testing-integrations/SKILL.md) - Mock patterns
