---
name: implementing-backend-tests
description: Use when implementing backend tests from a test-lead plan - provides 3-step process (locate plan, implement following plan, verify criteria), test mode selection (unit/integration/acceptance), and mandatory protocols (behavior testing, TDD cycle, plan adherence)
allowed-tools: Read, Bash, Grep, Glob
---

# Implementing Backend Tests

**3-step process for implementing Go/Python backend tests according to test-lead's plan.**

## When to Use

Use this skill when:

- Implementing tests for Go or Python backend code
- A test-lead has created a test plan for you to follow
- You need guidance on unit, integration, or acceptance test implementation
- You need to verify your tests meet the plan's acceptance criteria

**Context**: This skill is invoked by the `backend-tester` agent as part of its test implementation workflow.

## Quick Reference

| Step                                         | Purpose                              |
| -------------------------------------------- | ------------------------------------ |
| 1. Locate the Test Plan                      | Find and read test-lead's plan       |
| 2. Implement Tests Following Plan            | Follow approach, avoid anti-patterns |
| 3. Verify Against Plan's Acceptance Criteria | Ensure all requirements met          |

---

## Step 1: Locate the Test Plan

### Check Feature Directory First

```bash
# Check feature directory (from persisting-agent-outputs discovery)
ls .claude/features/*/test-plan*.md
```

### Check Standard Location

```bash
# Check standard plans directory
ls docs/plans/*-test-plan.md
```

### Decision Matrix

| Scenario           | Action                                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| **Plan exists**    | Read it thoroughly. It defines required tests, approach, anti-patterns, and infrastructure.                       |
| **No plan exists** | Request `test-lead` to create one first, OR implement against general standards (note this limitation in output). |

**IMPORTANT**: The test plan is your source of truth. It defines "what good looks like" for this specific test implementation.

---

## Step 2: Implement Tests Following Plan

### What to Follow from the Plan

| Plan Section             | What to Follow                           |
| ------------------------ | ---------------------------------------- |
| Required Tests           | Implement in priority order              |
| Testing Approach         | Use behavior testing, not implementation |
| Anti-Patterns to Avoid   | Do NOT violate these patterns            |
| Available Infrastructure | Use specified fixtures/utilities         |
| Acceptance Criteria      | Tests must satisfy all criteria          |

### Test Mode Selection

Choose the appropriate test mode based on what you're testing:

| Task Context                                        | Mode        | Primary Tools                             |
| --------------------------------------------------- | ----------- | ----------------------------------------- |
| Handler isolation, function testing, mocking        | Unit        | Go testing + testify, pytest              |
| Third-party APIs, service communication, data flows | Integration | API clients, mock servers, contract tests |
| Real AWS services, end-to-end backend flows         | Acceptance  | Real SQS/DynamoDB/Cognito, test fixtures  |

**Unit Testing (Go testing + testify, pytest)**

- Test handler and service behavior in isolation
- Use testify for assertions and mocking
- Table-driven tests for scenario coverage
- Follow AAA pattern: Arrange → Act → Assert

**Integration Testing (API validation, service communication)**

- Verify real API contracts before creating mocks
- Test authentication flows (OAuth, API keys)
- Test error handling, rate limiting, retry logic
- Test data transformation accuracy

**Acceptance Testing (Real AWS services)**

- Use real AWS services in test environment
- Create/cleanup test data properly
- Test job processing pipelines
- Verify data persistence and retrieval

---

## Step 3: Verify Against Plan's Acceptance Criteria

Before returning for validation, check:

- [ ] All required tests from plan implemented
- [ ] Coverage targets achieved (run coverage command)
- [ ] Anti-patterns avoided (none of the plan's anti-patterns present)
- [ ] Infrastructure properly utilized (using fixtures/utilities from plan)
- [ ] Tests follow TDD (RED phase first - test fails before implementation)

**Coverage Check Example**:

```bash
# Go coverage
go test -coverprofile=coverage.out ./...
go tool cover -func=coverage.out

# Python coverage
pytest --cov=. --cov-report=term-missing
```

---

## Mandatory Protocols

### Behavior Over Implementation

**Before writing ANY assertion, ask**: "Does this verify something the user sees?"

- **If NO** → Rewrite to test behavior, not implementation details
- **If YES** → Proceed with the assertion

**Example**:

```go
// ❌ BAD: Tests implementation detail
assert.Equal(t, 1, handler.callCount)

// ✅ GOOD: Tests behavior
assert.Equal(t, http.StatusOK, response.StatusCode)
assert.Equal(t, expectedAsset, response.Body.Asset)
```

### Verify Before Test

**Verify production file exists before creating tests.** No exceptions.

```bash
# Verify handler file exists
ls pkg/handlers/asset_handler.go

# Verify function exists in file
grep "func HandleGetAsset" pkg/handlers/asset_handler.go
```

**CRITICAL**: Do NOT write tests for code you haven't verified exists. This prevents hallucination.

### TDD Cycle

**Write test FIRST, watch it FAIL, then implement.**

1. Write the test
2. Run the test → **MUST FAIL**
3. Implement the fix
4. Run the test → **MUST PASS**

**If test passes on first run** → Test is too shallow or testing the wrong thing.

### Follow the Plan

**The test plan defines what good looks like.** Deviations require justification.

- Plan says "use testify mocks" → Use testify mocks
- Plan says "avoid testing private methods" → Don't test private methods
- Plan says "80% coverage target" → Achieve 80% coverage

**If you need to deviate**: Document why in your output and explain the trade-off.

---

## Related Skills

- `gateway-testing` - Routes to testing patterns (behavior testing, anti-patterns, mocking)
- `gateway-backend` - Routes to Go/Python patterns (AWS, Lambda, error handling)
- `developing-with-tdd` - Complete TDD methodology with RED-GREEN-REFACTOR cycles
- `enforcing-evidence-based-analysis` - Prevents hallucination by requiring source verification
- `verifying-before-completion` - Final validation checklist before claiming work complete

---

## Output

After implementing tests, you should return to `test-lead` for validation against the plan's acceptance criteria.

Follow the `persisting-agent-outputs` skill for proper output file structure, JSON metadata, and MANIFEST.yaml updates.
