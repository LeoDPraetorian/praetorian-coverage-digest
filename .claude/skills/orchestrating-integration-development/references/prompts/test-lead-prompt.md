# Test Lead Agent Prompt Template (Phase 6)

**Agent**: test-lead
**Phase**: 6 (Testing - Steps 1 and 3)
**Purpose**: Create test plan (Step 1) and validate test implementation (Step 3)

## Step 1: Test Planning

**Focus**: Create comprehensive test strategy with coverage targets

### Prompt Template

```markdown
Task: Create test plan for {vendor} integration

You are in Phase 6 Step 1 of integration development. Your goal is to create a comprehensive test plan that the backend-tester will implement.

## Input Files

1. **architecture.md**: Implementation design and expected behavior
2. **Implementation files**: {list from Phase 4}
3. **p0-compliance-review.md**: P0 requirements verified
4. **code-quality-review.md**: Quality baseline from Phase 5

## Test Plan Requirements

Your test-plan.md must include:

### 1. Test Strategy Overview
- Unit test approach (method-level testing)
- Integration test approach (mock server for external API)
- Coverage targets per file (≥80%)

### 2. Test Cases by File/Method

For EACH public method, specify test cases:

**Format**:
| Test Case ID | Method | Setup | Input | Expected Output | Coverage Goal |
|--------------|--------|-------|-------|-----------------|---------------|

**Required test case types**:
- Happy path (valid input, successful response)
- Error scenarios (invalid input, API errors)
- Edge cases (empty responses, nil values, boundary conditions)
- P0 verification (VMFilter blocks assets, CheckAffiliation detects non-existent)

### 3. Mock Server Requirements

Specify what endpoints need mocking:

| Endpoint | Method | Response Scenarios |
|----------|--------|--------------------|
| /api/v1/assets | GET | Success with assets, empty response, paginated |
| /api/v1/assets/{id} | GET | Asset found, 404 not found, deleted asset |
| /api/v1/user | GET | Valid user, 401 unauthorized |

### 4. Test Data Requirements

Provide sample test data:
- Valid credentials
- Test assets
- Test API responses
- Error responses

### 5. Coverage Targets

| File | Target | Critical Paths |
|------|--------|----------------|
| {vendor}.go | ≥80% | Invoke(), CheckAffiliation(), ValidateCredentials() |
| {vendor}_types.go | ≥70% | Struct unmarshaling |
| {vendor}_client.go | ≥80% | All API methods |
| {vendor}_transform.go | ≥90% | Transform functions |

## Test Case Checklist (Minimum Required)

### For Match() method:
- [ ] Valid job type returns true
- [ ] Invalid job type returns false

### For Invoke() method:
- [ ] Valid credentials and API success
- [ ] Invalid credentials error
- [ ] API error handled
- [ ] Empty response handled

### For CheckAffiliation() method:
- [ ] Asset exists in vendor returns true
- [ ] Asset not found returns false
- [ ] Asset deleted returns false
- [ ] Missing asset identifier returns error
- [ ] API error handled

### For ValidateCredentials() method:
- [ ] Valid credentials return nil
- [ ] Invalid credentials return error
- [ ] Missing secret returns error

### For enumerate() method (integration test):
- [ ] Successful enumeration sends assets
- [ ] Pagination works across multiple pages
- [ ] Empty response handled
- [ ] VMFilter filters out rejected assets

## MANDATORY SKILLS

- using-skills: Skill discovery workflow
- persisting-agent-outputs: Output file format
- verifying-before-completion: Exit criteria verification

OUTPUT_DIRECTORY: {provided by orchestrator}

OUTPUT FILE: test-plan.md

COMPLIANCE: Document invoked skills in output metadata.

## Success Criteria

Test plan is complete when:
- [ ] Test strategy documented
- [ ] Test cases specified for all public methods
- [ ] Mock server requirements defined
- [ ] Test data provided
- [ ] Coverage targets set
- [ ] Minimum test case checklist satisfied
```

## Step 3: Test Validation

**Focus**: Verify tests meet plan and achieve coverage

### Prompt Template

```markdown
Task: Validate tests for {vendor} integration

You are in Phase 6 Step 3 of integration development. Your goal is to verify the implemented tests meet the test plan and achieve coverage targets.

## Input Files

1. **test-plan.md** (Step 1): Expected test cases and coverage targets
2. **Test files**: {list from Step 2}
3. **Implementation files**: Code being tested

## Validation Steps

### 1. Execute Tests

Run tests and capture output:
```bash
cd modules/chariot/backend
go test ./pkg/tasks/integrations/{vendor}/... -v
```

### 2. Measure Coverage

```bash
go test ./pkg/tasks/integrations/{vendor}/... -cover
```

### 3. Map Test Cases

For each test case in test-plan.md, verify:
- Corresponding test function exists
- Test covers the scenario
- Test assertions are appropriate

### 4. Check Coverage Targets

Compare coverage report to test-plan.md targets:
- Each file meets its target (≥80%, ≥90%, etc.)
- Critical paths covered

### 5. Validate Mock Coverage

Verify mock server covers all endpoints from test-plan.md.

## MANDATORY SKILLS

- persisting-agent-outputs: Output file format
- verifying-before-completion: Exit criteria verification

OUTPUT_DIRECTORY: {provided by orchestrator}

OUTPUT FILE: test-validation.md

## Output Format

```markdown
# Test Validation: {vendor}

## Verdict: {VALIDATED | NEEDS_WORK}

## Test Execution

```bash
{output from go test -v}
```

## Coverage Report

```bash
{output from go test -cover}
```

| File | Coverage | Target | Status |
|------|----------|--------|--------|
| {vendor}.go | {%} | ≥80% | {✅|❌} |
| {vendor}_client.go | {%} | ≥80% | {✅|❌} |

## Test Case Mapping

| Plan Test Case | Implementation | Status |
|----------------|----------------|--------|
| match_valid_job | TestVendor_Match_ValidJob | ✅ |
| invoke_success | TestVendor_Invoke_Success | ✅ |
{... all test cases from plan}

## Missing Tests

{None if VALIDATED}
{List with descriptions if NEEDS_WORK}

## Required Additions

{If NEEDS_WORK, specify what tests to add}
```

## Success Criteria

Validation is complete when:
- [ ] All tests executed
- [ ] Coverage measured
- [ ] Test cases mapped to plan
- [ ] Coverage targets met
- [ ] Clear verdict with evidence
```
