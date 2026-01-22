# Backend Tester Prompt Template

**Phase 13 prompt for backend-tester implementing integration tests.**

---

## Backend Tester - Integration Tests

````markdown
Task(
subagent_type: "backend-tester",
description: "Tests for {vendor} integration",
prompt: "

## Task: Write Tests for {vendor} Integration

### Test Plan Location

.claude/.output/integrations/{workflow-id}/test-plan.md

### Files to Test

- modules/chariot/backend/pkg/integrations/{vendor}/client.go
- modules/chariot/backend/pkg/integrations/{vendor}/collector.go
- modules/chariot/backend/pkg/integrations/{vendor}/{vendor}.go

### MANDATORY SKILLS TO READ FIRST

- developing-with-tdd
- gateway-testing (routes to testing skills)
- testing-integrations (LIBRARY): Read('.claude/skill-library/testing/testing-integrations/SKILL.md')
- integrating-with-{vendor} (LIBRARY): Read('.claude/skill-library/development/integrations/integrating-with-{vendor}/SKILL.md')

### Framework

- Go testing package
- testify (assertions, mocks)
- httptest (mock server)

### P0 Requirements MUST Be Tested

| P0 Requirement      | Test Cases Required                                       |
| ------------------- | --------------------------------------------------------- |
| VMFilter            | Test filtering works, empty filter, partial match         |
| CheckAffiliation    | Test real query (mock API), test false for unknown assets |
| ValidateCredentials | Test fails on invalid creds, passes on valid              |
| errgroup            | Test SetLimit honored, test error propagation             |
| Pagination          | Test maxPages limit, test LastPage termination            |
| Error Handling      | Test error wrapping, test all error paths                 |

### Mock Server Pattern

```go
func TestClient_GetAssets(t *testing.T) {
    // Setup mock server
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Verify request
        assert.Equal(t, "GET", r.Method)
        assert.Equal(t, "/api/v1/assets", r.URL.Path)

        // Return mock response
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(mockAssetsResponse)
    }))
    defer server.Close()

    // Create client with mock server URL
    client := NewClient(server.URL, "test-api-key")

    // Test
    assets, err := client.GetAssets(context.Background())
    assert.NoError(t, err)
    assert.Len(t, assets, 3)
}
```
````

### Test Cases to Cover

**Client Tests:**

- API success response handling
- API error response handling (400, 401, 403, 404, 429, 500)
- Rate limiting behavior
- Pagination (multiple pages)
- Timeout handling

**Collector Tests:**

- Asset mapping correctness
- VMFilter integration
- errgroup parallelism
- Error aggregation

**Integration Tests:**

- ValidateCredentials first
- CheckAffiliation real query behavior
- Full Invoke() workflow

### Anti-Patterns to AVOID

- NO mocking VMFilter (test with real VMFilter)
- NO testing mock returns asserted value
- NO over-mocking (max 5 mocks per test)
- NO empty assertions

### Coverage Target

- Business logic: 80%+
- P0 requirement paths: 100%
- Error paths: 80%+

### Verification

```bash
go test -coverprofile=coverage.out ./modules/chariot/backend/pkg/integrations/{vendor}/...
go tool cover -func=coverage.out | grep total
```

### Output Location

.claude/.output/integrations/{workflow-id}/testing.md

### Output Format

{
'status': 'complete',
'test_mode': 'integration',
'tests_created': {count},
'tests_passed': {count},
'coverage_percent': {coverage},
'p0_tests': {
'VMFilter': ['TestCollector_VMFilter_Filters', 'TestCollector_VMFilter_Empty'],
'CheckAffiliation': ['TestIntegration_CheckAffiliation_RealQuery', 'TestIntegration_CheckAffiliation_Unknown'],
'ValidateCredentials': ['TestIntegration_ValidateCredentials_Invalid', 'TestIntegration_ValidateCredentials_Valid'],
'errgroup': ['TestCollector_Errgroup_Limit', 'TestCollector_Errgroup_ErrorPropagation'],
'pagination': ['TestClient_Pagination_MaxPages', 'TestClient_Pagination_LastPage'],
'error_handling': ['TestClient_ErrorWrapping', 'TestCollector_ErrorAggregation']
},
'plan_adherence': true,
'skills_invoked': ['developing-with-tdd', 'testing-integrations', ...]
}
"
)

````

---

## Test Lead - Phase 12 (Test Planning)

```markdown
Task(
subagent_type: "test-lead",
description: "Test strategy for {vendor} integration",
prompt: "

## Task: Create Test Plan for {vendor} Integration

### Implementation Summary

{From .claude/.output/integrations/{workflow-id}/implementation.md}

### MANDATORY SKILLS TO READ FIRST

- gateway-testing
- testing-integrations (LIBRARY): Read('.claude/skill-library/testing/testing-integrations/SKILL.md')
- integrating-with-{vendor} (LIBRARY): Read('.claude/skill-library/development/integrations/integrating-with-{vendor}/SKILL.md')

### P0 Requirements to Test

ALL 7 P0 requirements MUST have explicit test cases:

1. VMFilter - filtering behavior
2. CheckAffiliation - real API query (with mock server)
3. ValidateCredentials - fail fast behavior
4. errgroup - SetLimit, error propagation
5. Pagination - maxPages/LastPage termination
6. Error handling - wrapping, context
7. File size - N/A for testing

### Test Categories

| Category | Focus | Mock Strategy |
|----------|-------|---------------|
| Unit | Individual functions | Minimal mocking |
| Integration | Client + Mock Server | httptest mock server |
| Acceptance | Full workflow | Real or mocked external API |

### Deliverables

1. **Test Plan** (.claude/.output/integrations/{workflow-id}/test-plan.md)
   - Test categories and priorities
   - P0 requirement test mapping
   - Mock server specifications
   - Coverage targets

### Output Format

{
'status': 'complete',
'test_plan_file': '.claude/.output/integrations/{workflow-id}/test-plan.md',
'test_categories': {
  'unit': { 'count': 15, 'coverage_target': '80%' },
  'integration': { 'count': 10, 'coverage_target': '85%' },
  'acceptance': { 'count': 5, 'coverage_target': 'critical paths' }
},
'p0_coverage': {
  'VMFilter': ['unit', 'integration'],
  'CheckAffiliation': ['unit', 'integration', 'acceptance'],
  'ValidateCredentials': ['unit', 'integration'],
  'errgroup': ['unit'],
  'pagination': ['integration'],
  'error_handling': ['unit', 'integration']
}
}
"
)
````

---

## Related References

- [Phase 12: Test Planning](../phase-12-test-planning.md) - Test strategy phase
- [Phase 13: Testing](../phase-13-testing.md) - Test execution phase
- [Agent Matrix](../agent-matrix.md) - Agent selection
- [P0 Compliance](../p0-compliance.md) - P0 requirements to test
