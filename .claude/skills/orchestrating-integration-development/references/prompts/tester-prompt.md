# Tester Agent Prompt Template (Phase 6 Step 2)

**Agent**: backend-tester
**Phase**: 6 Step 2 (Test Implementation)
**Purpose**: Implement tests according to test plan with mock servers

## Prompt Template

```markdown
Task: Implement tests for {vendor} integration

You are in Phase 6 Step 2 of integration development. Your goal is to implement all test cases from test-plan.md with mock servers for external API calls.

## Input Files (READ ALL)

1. **test-plan.md** (Step 1): Test cases, mock requirements, coverage targets
2. **Implementation files**: {list from Phase 4}
3. **architecture.md**: Reference for expected behavior

## Implementation Requirements

### 1. Create Test File

File: `modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}_test.go`

### 2. Implement Mock Infrastructure

```go
package {vendor}_test

import (
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

// Mock server with configurable handlers
func setupMockServer(t *testing.T, handlers map[string]http.HandlerFunc) *httptest.Server {
    mux := http.NewServeMux()
    for path, handler := range handlers {
        mux.HandleFunc(path, handler)
    }
    return httptest.NewServer(mux)
}

// Mock secret store
type mockSecret struct {
    values map[string]string
}

func (m *mockSecret) Get(key string) (string, error) {
    if v, ok := m.values[key]; ok {
        return v, nil
    }
    return "", fmt.Errorf("secret not found: %s", key)
}

// Mock collector to verify Job.Send() calls
type mockCollector struct {
    assets []*model.Asset
    mu     sync.Mutex
}

func (m *mockCollector) Send(asset *model.Asset) {
    m.mu.Lock()
    defer m.mu.Unlock()
    m.assets = append(m.assets, asset)
}
```

### 3. Implement Test Cases

For EACH test case in test-plan.md, create corresponding test function.

**Test naming convention**:
```go
func TestVendor_{Method}_{Scenario}(t *testing.T)
```

**Examples**:
- `TestVendor_Match_ValidJob`
- `TestVendor_Invoke_Success`
- `TestVendor_Invoke_InvalidCredentials`
- `TestVendor_CheckAffiliation_Exists`
- `TestVendor_CheckAffiliation_NotFound`

**Test structure (AAA pattern)**:
```go
func TestVendor_Invoke_Success(t *testing.T) {
    // ARRANGE: Setup
    server := setupMockServer(t, map[string]http.HandlerFunc{
        "/api/v1/user": func(w http.ResponseWriter, r *http.Request) {
            json.NewEncoder(w).Encode(&User{ID: "test-user"})
        },
        "/api/v1/assets": func(w http.ResponseWriter, r *http.Request) {
            json.NewEncoder(w).Encode(&ListResponse{
                Items: []*VendorAsset{{ID: "asset-1"}},
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
                Collector: collector,
            },
        },
    }
    // Override baseURL to mock server
    task.baseURL = server.URL

    // ACT: Execute
    err := task.Invoke()

    // ASSERT: Verify
    require.NoError(t, err)
    assert.Len(t, collector.assets, 1)
    assert.Equal(t, "asset-1", collector.assets[0].Key)
}
```

### 4. Achieve Coverage Targets

Ensure all coverage targets from test-plan.md are met:
- Run `go test -cover` after implementing
- Add tests for uncovered lines
- Focus on critical paths first (Invoke, CheckAffiliation, ValidateCredentials)

## Integration Testing Patterns

Use `testing-integrations` library skill for mock patterns:

```markdown
Read(".claude/skill-library/testing/testing-integrations/SKILL.md")
```

**Key patterns**:
- Mock HTTP servers for external APIs
- Mock Job.Secret for credential injection
- Mock Collector to verify Job.Send() calls
- Table-driven tests for multiple scenarios

## MANDATORY SKILLS (invoke ALL before completing)

- using-skills: Skill discovery workflow
- developing-with-tdd: Test-driven development
- testing-integrations: Mock patterns for integrations (LIBRARY SKILL)
- persisting-agent-outputs: Output file format
- verifying-before-completion: Exit criteria verification

OUTPUT_DIRECTORY: {provided by orchestrator}

OUTPUT FILES:
- Test files: modules/chariot/backend/pkg/tasks/integrations/{vendor}/*_test.go

COMPLIANCE: Document invoked skills in output metadata.

## Build and Run Verification

After implementing tests, verify:

```bash
# Tests compile
go test -c ./pkg/tasks/integrations/{vendor}/...

# Tests pass
go test ./pkg/tasks/integrations/{vendor}/... -v

# Coverage measured
go test ./pkg/tasks/integrations/{vendor}/... -cover
```

Include results in your output.

## Success Criteria

Test implementation is complete when:
- [ ] All test cases from test-plan.md implemented
- [ ] Mock infrastructure created
- [ ] Tests compile without errors
- [ ] All tests pass: `go test -v`
- [ ] Coverage targets met: `go test -cover`
- [ ] AAA pattern followed (Arrange-Act-Assert)
- [ ] Test names follow convention
```
