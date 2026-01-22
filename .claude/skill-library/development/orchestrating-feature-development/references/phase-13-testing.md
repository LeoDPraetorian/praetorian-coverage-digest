# Phase 13: Testing

**Execute tests by spawning feature-specific test agents in parallel.**

---

## Overview

Testing executes the test plan by spawning test agents based on feature type (frontend/backend/full-stack).

**Entry Criteria:** Phase 12 (Test Planning) complete with test plan.

**Exit Criteria:** All tests passing, coverage targets met.

**COMPACTION GATE 3 FOLLOWS:** Before proceeding to Phase 14, complete [compaction-gates.md](compaction-gates.md) protocol.

---

## Feature Test Configuration

| Feature Type | Test Agents             | Frameworks                    |
| ------------ | ----------------------- | ----------------------------- |
| Frontend     | `frontend-tester` x3    | Vitest, MSW, Playwright       |
| Backend      | `backend-tester` x3     | Go testing, testify, httptest |
| Full-stack   | 6 agents (3 per domain) | All frameworks                |

---

## Frontend Testing Pattern

**Spawn ALL 3 testers in a SINGLE message:**

```markdown
# Unit tests

Task(
subagent_type: "frontend-tester",
description: "Unit tests for {feature}",
prompt: "
TEST MODE: unit

PLAN LOCATION: .feature-development/test-plan.md

FILES TO TEST:
{from implementation summary - hooks, components, utilities}

REQUIREMENTS:

1. Follow test plan requirements for unit tests
2. Use Vitest + @testing-library/react
3. Test component logic, hooks, utilities
4. Achieve 80% coverage on business logic
5. Avoid anti-patterns from test plan:
   - NO mock-only tests
   - NO implementation testing
   - NO snapshot overuse (max 3)
6. Verify tests pass with: npm run test:unit

Save summary to: .feature-development/test-summary-unit.md

Return:
{
'status': 'complete',
'test_mode': 'unit',
'tests_created': {count},
'tests_passed': {count},
'coverage_percent': {coverage},
'plan_adherence': true
}
"
)

# Integration tests (PARALLEL)

Task(
subagent_type: "frontend-tester",
description: "Integration tests for {feature}",
prompt: "
TEST MODE: integration

PLAN LOCATION: .feature-development/test-plan.md

REQUIREMENTS:

1. Follow test plan requirements for integration tests
2. Use MSW for API mocking
3. Test TanStack Query hooks with real network layer
4. Test loading, error, and success states
5. Avoid anti-patterns from test plan
6. Verify tests pass with: npm run test:integration

Save summary to: .feature-development/test-summary-integration.md

Return:
{
'status': 'complete',
'test_mode': 'integration',
'tests_created': {count},
'tests_passed': {count},
'plan_adherence': true
}
"
)

# E2E tests (PARALLEL)

Task(
subagent_type: "frontend-tester",
description: "E2E tests for {feature}",
prompt: "
TEST MODE: e2e

PLAN LOCATION: .feature-development/test-plan.md

USER WORKFLOWS:
{from architecture acceptance criteria}

REQUIREMENTS:

1. Follow test plan requirements for E2E tests
2. Use Playwright
3. Test complete user workflows
4. Use page object model pattern
5. Test happy path and error scenarios
6. Verify tests pass with: npx playwright test

Save summary to: .feature-development/test-summary-e2e.md

Return:
{
'status': 'complete',
'test_mode': 'e2e',
'tests_created': {count},
'tests_passed': {count},
'plan_adherence': true
}
"
)
```

---

## Backend Testing Pattern

**Spawn ALL 3 testers in a SINGLE message:**

```markdown
# Unit tests

Task(
subagent_type: "backend-tester",
description: "Unit tests for {feature}",
prompt: "
TEST MODE: unit

PLAN LOCATION: .feature-development/test-plan.md

FILES TO TEST:
{from implementation summary - handlers, services, utilities}

REQUIREMENTS:

1. Follow test plan requirements for unit tests
2. Use Go testing package + testify
3. Test handler logic, service functions
4. Achieve 85% coverage on business logic
5. Avoid anti-patterns from test plan:
   - NO testing private methods
   - NO over-mocking
   - NO testing generated code
6. Verify tests pass with: go test ./...

Save summary to: .feature-development/test-summary-unit.md

Return:
{
'status': 'complete',
'test_mode': 'unit',
'tests_created': {count},
'tests_passed': {count},
'coverage_percent': {coverage},
'plan_adherence': true
}
"
)

# Integration tests (PARALLEL)

Task(
subagent_type: "backend-tester",
description: "Integration tests for {feature}",
prompt: "
TEST MODE: integration

PLAN LOCATION: .feature-development/test-plan.md

REQUIREMENTS:

1. Follow test plan requirements for integration tests
2. Use httptest for HTTP testing
3. Test API endpoints with mock dependencies
4. Test request validation, response format
5. Avoid anti-patterns from test plan
6. Verify tests pass with: go test -tags=integration ./...

Save summary to: .feature-development/test-summary-integration.md

Return:
{
'status': 'complete',
'test_mode': 'integration',
'tests_created': {count},
'tests_passed': {count},
'plan_adherence': true
}
"
)

# Acceptance tests (PARALLEL)

Task(
subagent_type: "backend-tester",
description: "Acceptance tests for {feature}",
prompt: "
TEST MODE: acceptance

PLAN LOCATION: .feature-development/test-plan.md

REQUIREMENTS:

1. Follow test plan requirements for acceptance tests
2. Test with real AWS services (LocalStack or actual)
3. Test complete workflows end-to-end
4. Verify data persistence and retrieval
5. Verify tests pass with: go test -tags=acceptance ./...

Save summary to: .feature-development/test-summary-acceptance.md

Return:
{
'status': 'complete',
'test_mode': 'acceptance',
'tests_created': {count},
'tests_passed': {count},
'plan_adherence': true
}
"
)
```

---

## Full-Stack Testing Pattern

Spawn ALL 6 testers in a SINGLE message:

- 3 x `frontend-tester` (unit, integration, e2e)
- 3 x `backend-tester` (unit, integration, acceptance)

---

## Verification Commands

### Frontend

```bash
# Unit tests with coverage
npm run test:unit -- --coverage

# Integration tests
npm run test:integration

# E2E tests
npx playwright test

# All tests
npm test
```

### Backend

```bash
# Unit tests with coverage
go test -coverprofile=coverage.out ./...

# Integration tests
go test -tags=integration ./...

# Acceptance tests
go test -tags=acceptance ./...

# View coverage report
go tool cover -html=coverage.out
```

---

## Update MANIFEST.yaml

```yaml
phases:
  13_testing:
    status: "complete"
    completed_at: "{timestamp}"

testing:
  feature_type: "frontend"

  agents_used:
    - frontend-tester (unit)
    - frontend-tester (integration)
    - frontend-tester (e2e)

  results:
    unit:
      tests_created: 12
      tests_passed: 12
      coverage_percent: 82
      summary: ".feature-development/test-summary-unit.md"
    integration:
      tests_created: 5
      tests_passed: 5
      summary: ".feature-development/test-summary-integration.md"
    e2e:
      tests_created: 3
      tests_passed: 3
      summary: ".feature-development/test-summary-e2e.md"

  verification:
    all_tests_passed: true
    coverage_targets_met: true
```

---

## User Report

```markdown
## Testing Complete

**Feature Type:** Frontend

**Test Results:**
| Mode | Created | Passed | Coverage |
|------|---------|--------|----------|
| Unit | 12 | 12 | 82% |
| Integration | 5 | 5 | - |
| E2E | 3 | 3 | - |

**Plan Adherence:** All testers followed test plan

**Test Summaries:**

- test-summary-unit.md
- test-summary-integration.md
- test-summary-e2e.md

Proceeding to Compaction Gate 3, then Phase 14: Coverage Verification
```

---

## Test Type Decision Matrix for Features

| Feature Characteristic     | Unit | Integration | E2E | Acceptance |
| -------------------------- | ---- | ----------- | --- | ---------- |
| React hooks                |      |             |     |            |
| State management (Zustand) |      |             |     |            |
| TanStack Query hooks       |      |             |     |            |
| Form validation            |      |             |     |            |
| Go handlers                |      |             |     |            |
| Service functions          |      |             |     |            |
| External API calls         |      |             |     |            |
| User workflows             |      |             |     |            |

---

## Skip Conditions

| Work Type | Testing                   |
| --------- | ------------------------- |
| BUGFIX    | Run (focused on bug area) |
| SMALL     | Run (minimal scope)       |
| MEDIUM    | Run                       |
| LARGE     | Run                       |

Testing always runs, but scope varies by work type.

---

## Related References

- [Phase 12: Test Planning](phase-12-test-planning.md) - Previous phase (test plan creation)
- [Phase 14: Coverage Verification](phase-14-coverage-verification.md) - Next phase
- [Compaction Gates](compaction-gates.md) - Gate 3 follows this phase
