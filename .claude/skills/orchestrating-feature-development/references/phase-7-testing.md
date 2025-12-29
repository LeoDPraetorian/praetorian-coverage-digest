# Phase 7: Parallel Testing

Create comprehensive tests by spawning test agents in parallel for all test modes (unit, integration, E2E). Testers follow the test plan created in Phase 6.

## Purpose

Verify feature correctness through automated testing by:

- Implementing tests according to test-lead's plan
- Writing unit tests for business logic
- Creating integration tests for API interactions
- Building E2E tests for user workflows
- Achieving coverage targets from test plan

## Why Parallel Test Modes?

All test types are independent and can run simultaneously:

| Test Mode   | Agent                                | Focus                      |
| ----------- | ------------------------------------ | -------------------------- |
| Unit        | `frontend-tester` (unit mode)        | Business logic, components |
| Integration | `frontend-tester` (integration mode) | API interactions with MSW  |
| E2E         | `frontend-tester` (e2e mode)         | Complete user workflows    |

**Together**: Comprehensive test coverage with minimal execution time.

## Test Plan Reference

**CRITICAL:** All testers must follow the test plan created by test-lead in Phase 6.

**PLAN LOCATION:** `.claude/features/{id}/test-plan.md`

The test plan specifies:
- Coverage targets (Security: 95%, Business Logic: 80%, Integration: 90%)
- Required test cases with rationale
- Anti-patterns to avoid
- Testing approach and guidelines
- Acceptance criteria

## Workflow

### Step 1: Determine Test Configuration

Based on implementation:

| Implementation Type | Frontend Testers             | Backend Testers                     | Total Agents |
| ------------------- | ---------------------------- | ----------------------------------- | ------------ |
| Frontend only       | 3 (unit + integration + e2e) | -                                   | 3            |
| Backend only        | -                            | 3 (unit + integration + acceptance) | 3            |
| Full-stack          | 3 frontend                   | 3 backend                           | 6            |

### Step 2: Spawn ALL Test Agents in Parallel

**CRITICAL:** Spawn ALL test agents in a SINGLE message.

#### Frontend Feature Pattern

```
# Spawn ALL THREE in same message
Task(
  subagent_type: "frontend-tester",
  description: "Unit tests for {feature-name}",
  prompt: "Write unit tests for this feature:

FEATURE: {feature-name}
TEST MODE: unit

PLAN LOCATION: .claude/features/{id}/test-plan.md

FILES TO TEST:
{from implementation-log.md}

REQUIREMENTS:
1. Follow test plan requirements for unit tests
2. Implement all test cases specified in plan
3. Achieve coverage targets from plan (80%)
4. Avoid anti-patterns specified in plan
5. Use Vitest + React Testing Library
6. Verify tests pass

Save summary to: .claude/features/{id}/test-summary-unit.md

Return JSON:
{
  'status': 'complete',
  'test_mode': 'unit',
  'tests_created': 12,
  'tests_passed': 12,
  'coverage_percent': 85,
  'plan_adherence': true
}
"
)

Task(
  subagent_type: "frontend-tester",
  description: "Integration tests for {feature-name}",
  prompt: "Write integration tests for this feature:

FEATURE: {feature-name}
TEST MODE: integration

PLAN LOCATION: .claude/features/{id}/test-plan.md

FILES TO TEST:
{from implementation-log.md}

REQUIREMENTS:
1. Follow test plan requirements for integration tests
2. Implement all test cases specified in plan
3. Test component + API integration
4. Use MSW for API mocking
5. Test loading/error states
6. Avoid anti-patterns specified in plan
7. Verify tests pass

Save summary to: .claude/features/{id}/test-summary-integration.md

Return JSON:
{
  'status': 'complete',
  'test_mode': 'integration',
  'tests_created': 8,
  'tests_passed': 8,
  'plan_adherence': true
}
"
)

Task(
  subagent_type: "frontend-tester",
  description: "E2E tests for {feature-name}",
  prompt: "Write E2E tests for this feature:

FEATURE: {feature-name}
TEST MODE: e2e

PLAN LOCATION: .claude/features/{id}/test-plan.md

USER WORKFLOWS:
{extract from architecture.md acceptance criteria}

REQUIREMENTS:
1. Follow test plan requirements for E2E tests
2. Implement all test cases specified in plan
3. Test complete user workflows
4. Use Playwright with page objects
5. Test happy path and error scenarios
6. Avoid anti-patterns specified in plan
7. Verify tests pass

Save summary to: .claude/features/{id}/test-summary-e2e.md

Return JSON:
{
  'status': 'complete',
  'test_mode': 'e2e',
  'tests_created': 5,
  'tests_passed': 5,
  'plan_adherence': true
}
"
)
```

#### Backend Feature Pattern

```
# Spawn ALL THREE in same message
Task(
  subagent_type: "backend-tester",
  description: "Unit tests for {feature-name}",
  prompt: "Write Go unit tests... TEST MODE: unit ..."
)

Task(
  subagent_type: "backend-tester",
  description: "Integration tests for {feature-name}",
  prompt: "Write Go integration tests... TEST MODE: integration ..."
)

Task(
  subagent_type: "backend-tester",
  description: "Acceptance tests for {feature-name}",
  prompt: "Write acceptance tests... TEST MODE: acceptance ..."
)
```

#### Full-Stack Feature Pattern

```
# Spawn ALL SIX in same message
Task(subagent_type: "frontend-tester", description: "Unit tests...", ...)
Task(subagent_type: "frontend-tester", description: "Integration tests...", ...)
Task(subagent_type: "frontend-tester", description: "E2E tests...", ...)
Task(subagent_type: "backend-tester", description: "Unit tests...", ...)
Task(subagent_type: "backend-tester", description: "Integration tests...", ...)
Task(subagent_type: "backend-tester", description: "Acceptance tests...", ...)
```

### Step 3: Wait for All Test Agents

All agents run in parallel. Wait for ALL to complete.

### Step 4: Validate Test Output

Check that each test agent returned:

- ✅ `status: "complete"`
- ✅ All tests passing
- ✅ Coverage met (≥80% for unit tests)
- ✅ Test files created

If any tests failing:

1. Read failure details
2. Determine if implementation bug or test issue
3. If implementation bug: Return to Phase 4 (Implementation)
4. If test issue: Document for Phase 8 (Test Validation)

### Step 5: Verify Complete Test Suite

Run all tests:

```bash
# Frontend
cd modules/chariot/ui
npm test
npx playwright test

# Backend
cd modules/chariot/backend
go test ./...
```

### Step 6: Update Progress

```json
{
  "phases": {
    "testing": {
      "status": "complete",
      "agents_used": ["frontend-tester", "frontend-tester", "frontend-tester"],
      "outputs": {
        "unit": ".claude/features/{id}/test-summary-unit.md",
        "integration": ".claude/features/{id}/test-summary-integration.md",
        "e2e": ".claude/features/{id}/test-summary-e2e.md"
      },
      "verification": {
        "unit_tests_passed": true,
        "unit_coverage": 85,
        "integration_tests_passed": true,
        "e2e_tests_passed": true
      },
      "completed_at": "2025-12-28T13:00:00Z"
    },
    "validation": {
      "status": "in_progress",
      "retry_count": 0
    }
  },
  "current_phase": "validation"
}
```

### Step 7: Mark TodoWrite Complete

```
TodoWrite: Mark "Phase 7: Testing" as completed
TodoWrite: Mark "Phase 8: Test Validation" as in_progress
```

## Exit Criteria

✅ Proceed to Phase 8 (Test Validation) when:

- All test agents returned `status: "complete"`
- All tests passing
- Coverage target met (≥80% for unit tests)
- Test summary files saved
- Progress file updated
- TodoWrite marked complete

❌ Do NOT proceed if:

- Any tests failing
- Coverage below target
- Missing test scenarios from plan

## Test Type Decision Matrix

| Feature Characteristic | Unit | Integration | E2E | Acceptance |
| ---------------------- | ---- | ----------- | --- | ---------- |
| Business logic         | ✅   |             |     |            |
| User workflows         |      |             | ✅  |            |
| API endpoints          |      |             |     | ✅         |
| Component rendering    | ✅   |             |     |            |
| State management       | ✅   |             |     |            |
| Form validation        | ✅   |             | ✅  |            |
| Data fetching          |      | ✅          |     |            |
| Error handling         | ✅   |             | ✅  | ✅         |

## Common Issues

### "Tests are flaky"

**Solution**: Document for Phase 8 (Test Validation). The test-lead will flag flakiness as a quality issue.

### "Coverage is below target"

**Solution**: Document current coverage. Test-lead in Phase 8 will determine if additional tests are needed.

### "E2E tests too slow"

**Solution**: Use page object model, run tests in parallel, avoid redundant setup.

### "Should I test error cases?"

**Answer**: Yes. Error handling is critical for all test types.

## Related References

- [Phase 6: Test Planning](phase-6-test-planning.md) - Previous phase (test plan creation)
- [Phase 8: Test Validation](phase-8-test-validation.md) - Next phase (validation against plan)
- [Agent Handoffs](agent-handoffs.md) - JSON handoff format
- [Troubleshooting](troubleshooting.md) - Common issues
