# Phase 12: Test Planning

**Create comprehensive test plan using test-lead before testers write any tests.**

**This file provides:** Complete phase protocol for integration development.

---

## Overview

Test Planning designs test strategy for integration testing by:

1. Analyzing handler implementation to understand what needs testing
2. Defining coverage targets (≥80% per file)
3. Specifying mock server requirements for vendor API
4. Listing required test cases with rationale
5. Establishing acceptance criteria

**Why test planning?** Writing integration tests without a plan leads to coverage gaps, missing mock scenarios, and rework.

**Entry Criteria:** Phase 11 (Code Quality) complete.

**Exit Criteria:** Test plan saved with all required sections including mock server spec.

**Conditional:** Skipped for SMALL work_types.

---

## Step 1: Read Skill Manifest

**REQUIRED:** Load testing skills from Phase 4 skill manifest:

```bash
Read("{OUTPUT_DIR}/skill-manifest.yaml")
```

Extract:

- `testing-integrations` - Mock patterns for integration tests
- Any vendor-specific testing patterns

---

## Step 2: Spawn Test Lead for Planning

```markdown
Task(
subagent_type: "test-lead",
description: "Create test plan for {vendor} integration",
prompt: "
Task: Create comprehensive test plan for {vendor} integration

INPUTS (Read and synthesize):

1. Architecture: {OUTPUT_DIR}/architecture-plan.md
2. Implementation: {OUTPUT_DIR}/implementation.md
3. Security Assessment: {OUTPUT_DIR}/security-review.md
4. Handler files: modules/chariot/backend/pkg/tasks/integrations/{vendor}/

ANALYZE and create test plan specifying:

1. COVERAGE TARGETS
   - Handler file ({vendor}.go): ≥80%
   - Client file ({vendor}\_client.go): ≥80%
   - Transform file ({vendor}\_transform.go): ≥90%

2. REQUIRED TESTS (Priority Order)
   - Match() tests (valid job, invalid job)
   - Invoke() tests (success, auth failure, API error)
   - CheckAffiliation() tests (exists, not found, deleted, error)
   - ValidateCredentials() tests (success, missing secret, invalid)
   - Pagination tests (single page, multi-page, empty)
   - Transform tests (full asset, minimal, with tags)

3. MOCK SERVER SPECIFICATION
   - Endpoints to mock (list from architecture)
   - Response payloads (success, error, edge cases)
   - Auth header validation
   - Rate limit simulation (optional)

4. MOCK INFRASTRUCTURE
   - Mock Job.Secret for credentials
   - Mock Collector for Job.Send verification
   - Test data fixtures

5. ANTI-PATTERNS TO AVOID
   - Testing mocks instead of behavior
   - Skipping error scenarios
   - Hardcoded test data that doesn't match API format

MANDATORY SKILLS:

- integrating-with-{vendor}: Vendor API patterns for mocking
- testing-integrations: Mock server and test patterns
- gateway-integrations: Integration patterns and P0 requirements
- persisting-agent-outputs: Output file format

OUTPUT_DIRECTORY: {from Phase 1}

DELIVERABLE:
Save test plan to: {OUTPUT_DIR}/test-plan.md

Return:
{
'status': 'complete',
'coverage_targets': {
'handler': '80%',
'client': '80%',
'transform': '90%'
},
'tests_required': {
'unit': {count},
'integration': {count},
'total': {count}
},
'mock_endpoints': {count}
}
"
)
```

---

## Step 3: Test Plan Structure

Test plan must include:

```markdown
# Test Plan: {vendor} Integration

## Test Strategy

### Approach

- Unit tests: Test individual methods with mocked dependencies
- Integration tests: Test full handler with mock HTTP server
- Coverage target: ≥80% per file

### Mock Requirements

- Mock vendor API server (httptest.Server)
- Mock Job.Secret for credentials
- Mock Collector for Job.Send verification

## Test Cases

### {vendor}.go (Primary Handler)

#### Match() Tests

| Test Case         | Input                 | Expected | Coverage |
| ----------------- | --------------------- | -------- | -------- |
| match_valid_job   | job.Type = "{vendor}" | true     | Match()  |
| match_invalid_job | job.Type = "other"    | false    | Match()  |

#### Invoke() Tests

| Test Case                  | Setup                    | Expected                 |
| -------------------------- | ------------------------ | ------------------------ |
| invoke_success             | Valid creds, mock assets | No error, assets sent    |
| invoke_invalid_credentials | Invalid API key          | Error: "validating..."   |
| invoke_api_error           | Mock returns 500         | Error: "listing assets"  |
| invoke_empty_response      | Mock returns empty       | No error, no assets sent |

#### CheckAffiliation() Tests

| Test Case             | Setup              | Expected       |
| --------------------- | ------------------ | -------------- |
| affiliation_exists    | Asset in API       | (true, nil)    |
| affiliation_not_found | Asset not in API   | (false, nil)   |
| affiliation_deleted   | Asset deleted      | (false, nil)   |
| affiliation_api_error | Mock returns error | (false, error) |
| affiliation_no_id     | Missing CloudId    | (false, error) |

#### ValidateCredentials() Tests

| Test Case               | Setup                | Expected            |
| ----------------------- | -------------------- | ------------------- |
| validate_success        | Valid API key        | nil                 |
| validate_invalid_key    | Invalid API key      | Error: "auth..."    |
| validate_missing_secret | No api_key in secret | Error: "getting..." |

## Mock Server Specification

### Endpoints to Mock

| Endpoint            | Method | Response             |
| ------------------- | ------ | -------------------- |
| /api/v1/assets      | GET    | Paginated asset list |
| /api/v1/assets/{id} | GET    | Single asset or 404  |
| /api/v1/user        | GET    | Current user (auth)  |

### Mock Response Payloads

[Include success and error payloads]

## Coverage Targets

| File                   | Target | Critical Paths                     |
| ---------------------- | ------ | ---------------------------------- |
| {vendor}.go            | ≥80%   | Invoke, CheckAffiliation, Validate |
| {vendor}\_client.go    | ≥80%   | All API methods, error handling    |
| {vendor}\_transform.go | ≥90%   | All transform functions            |

## Acceptance Criteria

- [ ] All tests pass: `go test ./...`
- [ ] Coverage ≥80%: `go test -cover ./...`
- [ ] No mock-only tests
- [ ] All error scenarios covered
```

---

## Step 4: Validate Test Plan Output

Check that test-lead returned:

- ✅ `status: "complete"`
- ✅ Test plan saved to `{OUTPUT_DIR}/test-plan.md`
- ✅ Coverage targets defined per file
- ✅ All handler methods have test cases
- ✅ Mock server specification complete
- ✅ Anti-patterns documented

**If `status: "blocked"`:**

1. Read blocker details
2. Resolve architectural issues if needed
3. Re-spawn test-lead with resolution

---

## Step 5: Update MANIFEST.yaml

```yaml
phases:
  12_test_planning:
    status: "complete"
    completed_at: "{timestamp}"
    agent: "test-lead"

test_plan:
  location: "{OUTPUT_DIR}/test-plan.md"
  coverage_targets:
    handler: "80%"
    client: "80%"
    transform: "90%"
  tests_required:
    match: 2
    invoke: 4
    checkaffiliation: 5
    validatecredentials: 3
    total: 14
  mock_endpoints: 3
  anti_patterns:
    - "No mock-only tests"
    - "No skipped error scenarios"
    - "No hardcoded test data"
```

---

## Step 6: Update TodoWrite & Report

```
TodoWrite([
  { content: "Phase 12: Test Planning", status: "completed", activeForm: "Planning tests" },
  { content: "Phase 13: Testing", status: "in_progress", activeForm: "Implementing tests" },
  // ... rest
])
```

Output to user:

```markdown
## Test Planning Complete

**Coverage Targets:**
| File | Target |
| --------------------- | ------ |
| {vendor}.go | ≥80% |
| {vendor}\_client.go | ≥80% |
| {vendor}\_transform.go | ≥90% |

**Tests Required:**

- Match: 2
- Invoke: 4
- CheckAffiliation: 5
- ValidateCredentials: 3
- **Total: 14**

**Mock Endpoints:** 3 endpoints specified

**Test Plan:** {OUTPUT_DIR}/test-plan.md

→ Proceeding to Phase 13: Testing
```

---

## Skip Conditions

| Work Type | Test Planning |
| --------- | ------------- |
| SMALL     | Skip          |
| MEDIUM    | Run           |
| LARGE     | Run           |

---

## Integration-Specific Test Categories

| Test Category     | Purpose                      | Priority |
| ----------------- | ---------------------------- | -------- |
| Match tests       | Job type matching            | HIGH     |
| Auth tests        | Credential validation        | CRITICAL |
| Enumeration tests | Asset discovery flow         | HIGH     |
| Affiliation tests | Asset ownership verification | CRITICAL |
| Pagination tests  | Multi-page handling          | HIGH     |
| Transform tests   | Data mapping to Tabularium   | MEDIUM   |
| Error handling    | API failure scenarios        | HIGH     |

---

## Related References

- [Phase 11: Code Quality](phase-11-code-quality.md) - Previous phase
- [Phase 13: Testing](phase-13-testing.md) - Next phase (implements plan)
- [testing-integrations](../../../skill-library/testing/testing-integrations/SKILL.md) - Mock patterns
