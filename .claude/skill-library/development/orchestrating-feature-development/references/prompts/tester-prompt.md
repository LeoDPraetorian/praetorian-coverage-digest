# Tester Prompt Templates

**Phase 13 prompts for frontend-tester and backend-tester.**

---

## Frontend Tester - Unit Tests

```markdown
Task(
subagent_type: "frontend-tester",
description: "Unit tests for {feature}",
prompt: "

## Task: Write Unit Tests

### Test Mode: Unit

### Test Plan Location

.feature-development/test-plan.md

### Files to Test

{From implementation summary - hooks, components, utilities}

### MANDATORY SKILLS TO READ FIRST

- developing-with-tdd
  {skills_by_domain.testing.library_skills from skill-manifest.yaml}

### Framework

- Vitest
- @testing-library/react

### Requirements

1. Follow test plan requirements for unit tests
2. Test component logic, hooks, utilities
3. Achieve 80% coverage on business logic
4. Each test must have meaningful assertions

### Anti-Patterns to AVOID (from test plan)

- NO mock returns asserted value
- NO testing implementation details
- NO snapshot overuse (max 3 per file)
- NO flaky timing tests

### Coverage Target

Business logic: 80%

### Verification

npm run test:unit -- --coverage

### Output Location

.feature-development/test-summary-unit.md

### Output Format

{
'status': 'complete',
'test_mode': 'unit',
'tests_created': {count},
'tests_passed': {count},
'coverage_percent': {coverage},
'plan_adherence': true,
'anti_patterns_avoided': true
}
"
)
```

---

## Frontend Tester - Integration Tests

```markdown
Task(
subagent_type: "frontend-tester",
description: "Integration tests for {feature}",
prompt: "

## Task: Write Integration Tests

### Test Mode: Integration

### Test Plan Location

.feature-development/test-plan.md

### MANDATORY SKILLS TO READ FIRST

- developing-with-tdd
  {skills_by_domain.testing.library_skills from skill-manifest.yaml}

### Framework

- Vitest
- MSW (Mock Service Worker)
- @testing-library/react

### Requirements

1. Follow test plan requirements for integration tests
2. Test TanStack Query hooks with MSW
3. Test loading, error, and success states
4. Test component + API integration

### Test Cases to Cover

- API success response handling
- API error response handling
- Loading state rendering
- Empty state handling
- Pagination (if applicable)

### Anti-Patterns to AVOID

- NO testing MSW mocks directly
- NO testing cache internals

### Verification

npm run test:integration

### Output Location

.feature-development/test-summary-integration.md

### Output Format

{
'status': 'complete',
'test_mode': 'integration',
'tests_created': {count},
'tests_passed': {count},
'plan_adherence': true
}
"
)
```

---

## Frontend Tester - E2E Tests

```markdown
Task(
subagent_type: "frontend-tester",
description: "E2E tests for {feature}",
prompt: "

## Task: Write E2E Tests

### Test Mode: E2E

### Test Plan Location

.feature-development/test-plan.md

### User Workflows

{From architecture acceptance criteria}

### MANDATORY SKILLS TO READ FIRST

- developing-with-tdd
  {skills_by_domain.testing.library_skills from skill-manifest.yaml}

### Framework

- Playwright

### Requirements

1. Follow test plan requirements for E2E tests
2. Test complete user workflows
3. Use page object model pattern
4. Test happy path and error scenarios

### Test Cases to Cover

- User can {workflow 1}
- User can {workflow 2}
- Error scenario: {error case}

### Best Practices

- Use data-testid for selectors
- Avoid timing-based waits (use waitFor)
- Clean up test data after tests

### Verification

npx playwright test

### Output Location

.feature-development/test-summary-e2e.md

### Output Format

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

## Backend Tester - Unit Tests

```markdown
Task(
subagent_type: "backend-tester",
description: "Unit tests for {feature}",
prompt: "

## Task: Write Unit Tests

### Test Mode: Unit

### Test Plan Location

.feature-development/test-plan.md

### Files to Test

{From implementation summary - handlers, services, utilities}

### MANDATORY SKILLS TO READ FIRST

- developing-with-tdd
  {skills_by_domain.testing.library_skills from skill-manifest.yaml}

### Framework

- Go testing package
- testify (assertions, mocks)

### Requirements

1. Follow test plan requirements for unit tests
2. Test handler logic, service functions
3. Achieve 85% coverage on business logic
4. Test error cases

### Anti-Patterns to AVOID (from test plan)

- NO testing private methods
- NO over-mocking (max 5 mocks)
- NO testing generated code
- NO empty assertions

### Coverage Target

Business logic: 85%

### Verification

go test -coverprofile=coverage.out ./...
go tool cover -func=coverage.out

### Output Location

.feature-development/test-summary-unit.md

### Output Format

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
```

---

## Backend Tester - Integration Tests

```markdown
Task(
subagent_type: "backend-tester",
description: "Integration tests for {feature}",
prompt: "

## Task: Write Integration Tests

### Test Mode: Integration

### Test Plan Location

.feature-development/test-plan.md

### MANDATORY SKILLS TO READ FIRST

- developing-with-tdd
  {skills_by_domain.testing.library_skills from skill-manifest.yaml}

### Framework

- Go testing package
- httptest
- testify

### Requirements

1. Follow test plan requirements for integration tests
2. Test API endpoints with httptest
3. Test request validation
4. Test response format

### Test Cases to Cover

- Valid request handling
- Invalid request handling (400)
- Unauthorized access (401)
- Not found (404)
- Server error handling (500)

### Verification

go test -tags=integration ./...

### Output Location

.feature-development/test-summary-integration.md

### Output Format

{
'status': 'complete',
'test_mode': 'integration',
'tests_created': {count},
'tests_passed': {count},
'plan_adherence': true
}
"
)
```

---

## Backend Tester - Acceptance Tests

```markdown
Task(
subagent_type: "backend-tester",
description: "Acceptance tests for {feature}",
prompt: "

## Task: Write Acceptance Tests

### Test Mode: Acceptance

### Test Plan Location

.feature-development/test-plan.md

### MANDATORY SKILLS TO READ FIRST

- developing-with-tdd
  {skills_by_domain.testing.library_skills from skill-manifest.yaml}

### Framework

- Go testing package
- Real AWS services (LocalStack or actual)

### Requirements

1. Follow test plan requirements for acceptance tests
2. Test with real dependencies (DynamoDB, S3, etc.)
3. Test complete workflows end-to-end
4. Verify data persistence

### Test Cases to Cover

- Create resource workflow
- Update resource workflow
- Delete resource workflow
- Error recovery

### Verification

go test -tags=acceptance ./...

### Output Location

.feature-development/test-summary-acceptance.md

### Output Format

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

## Parallel Spawn Pattern

Spawn ALL testers in a SINGLE message:

```markdown
# Frontend (all 3 in parallel)

Task("frontend-tester", "Unit tests...", {unit_prompt})
Task("frontend-tester", "Integration tests...", {integration_prompt})
Task("frontend-tester", "E2E tests...", {e2e_prompt})

# Backend (all 3 in parallel)

Task("backend-tester", "Unit tests...", {unit_prompt})
Task("backend-tester", "Integration tests...", {integration_prompt})
Task("backend-tester", "Acceptance tests...", {acceptance_prompt})
```

---

## Related References

- [Phase 13: Testing](../phase-13-testing.md) - Phase context
- [Agent Matrix](../agent-matrix.md) - Agent selection
