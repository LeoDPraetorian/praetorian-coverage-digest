# Phase 5: Testing

Create comprehensive tests by spawning test engineer agents with implementation context.

## Purpose

Verify feature correctness through automated testing by:

- Writing unit tests for business logic
- Creating E2E tests for user workflows
- Achieving target code coverage
- Validating against plan requirements

## Workflow

### Step 1: Determine Test Engineer Type(s)

Based on implementation:

| Implementation Type | Test Engineers                                          | Parallelization |
| ------------------- | ------------------------------------------------------- | --------------- |
| Frontend only       | frontend-unit-test-engineer, frontend-e2e-test-engineer | ✅ Parallel     |
| Backend only        | backend-tester, acceptance-test-engineer                | ✅ Parallel     |
| Full-stack          | All four test engineers                                 | ✅ All parallel |

**All test types can run in parallel** - they don't depend on each other.

### Step 2: Spawn Test Engineer Agent(s)

#### Frontend Unit Tests

```
Task(
  subagent_type: "frontend-unit-test-engineer",
  description: "Unit tests for {feature-name}",
  prompt: "Write unit tests for this feature:

FEATURE: {feature-name}

PLAN REQUIREMENTS:
{extract 'Testing Requirements' from plan.md}

IMPLEMENTATION:
{handoff.context from implementation phase}
Files: {files_modified from implementation}

COVERAGE TARGET: 80%

REQUIREMENTS:
1. Test all business logic
2. Test edge cases
3. Mock external dependencies
4. Use React Testing Library patterns
5. Verify tests pass

Return JSON with:
{
  'status': 'complete',
  'phase': 'testing',
  'summary': 'Test files created and coverage achieved',
  'files_modified': ['test file paths'],
  'verification': {
    'tests_passed': true|false,
    'coverage_percent': 85,
    'command_output': 'npm test output'
  },
  'handoff': {
    'next_phase': 'complete',
    'context': 'Test coverage summary'
  }
}
"
)
```

#### Frontend E2E Tests

```
Task(
  subagent_type: "frontend-e2e-test-engineer",
  description: "E2E tests for {feature-name}",
  prompt: "Write E2E tests for this feature:

FEATURE: {feature-name}

USER WORKFLOWS:
{extract E2E scenarios from plan.md}

IMPLEMENTATION:
{handoff.context from implementation}

REQUIREMENTS:
1. Test complete user workflows
2. Use Playwright fixtures
3. Use page object model
4. Verify tests pass

Return JSON with status and verification.
"
)
```

#### Backend Unit Tests

```
Task(
  subagent_type: "backend-tester",
  description: "Unit tests for {feature-name}",
  prompt: "Write Go unit tests for this feature:

FEATURE: {feature-name}

PLAN REQUIREMENTS:
{extract 'Testing Requirements' from plan.md}

IMPLEMENTATION:
{handoff.context from implementation}
Files: {files_modified from implementation}

COVERAGE TARGET: 80%

REQUIREMENTS:
1. Test all handler logic
2. Test edge cases and errors
3. Use testify for assertions
4. Mock external dependencies
5. Verify tests pass

Return JSON with status and verification.
"
)
```

#### Acceptance Tests (Backend Integration)

```
Task(
  subagent_type: "acceptance-test-engineer",
  description: "Acceptance tests for {feature-name}",
  prompt: "Write acceptance tests for this feature:

FEATURE: {feature-name}

API WORKFLOWS:
{extract integration test scenarios from plan.md}

IMPLEMENTATION:
{handoff.context from implementation}

REQUIREMENTS:
1. Test API endpoints end-to-end
2. Use real AWS services (DynamoDB, SQS, etc.)
3. Test error scenarios
4. Verify tests pass

Return JSON with status and verification.
"
)
```

### Step 3: Spawn All Test Engineers in Parallel

```
# All test types run simultaneously
unit_tests = Task(subagent_type: "frontend-unit-test-engineer", ...)
e2e_tests = Task(subagent_type: "frontend-e2e-test-engineer", ...)
backend_unit = Task(subagent_type: "backend-tester", ...)
acceptance = Task(subagent_type: "acceptance-test-engineer", ...)

# Wait for all to complete
```

### Step 4: Validate Test Output

Check that each test engineer returned:

- ✅ `status: "complete"`
- ✅ `verification.tests_passed: true`
- ✅ Coverage met (if unit tests)
- ✅ Test files created

If any tests failing:

1. Read `verification.command_output` for errors
2. Create issue context with failures
3. Determine if implementation bug or test issue
4. If implementation bug: Return to Phase 4 with fix
5. If test issue: Re-spawn test engineer with clarification

### Step 5: Verify All Tests Pass

Run complete test suite:

```bash
# Frontend
cd modules/chariot/ui
npm test
npm run test:e2e

# Backend
cd modules/chariot/backend
go test ./...
make acceptance-test
```

### Step 6: Update Progress

```json
{
  "phases": {
    "testing": {
      "status": "complete",
      "agents_used": ["frontend-unit-test-engineer", "frontend-e2e-test-engineer"],
      "test_files": ["list", "of", "test", "paths"],
      "verification": {
        "unit_tests_passed": true,
        "unit_coverage": 85,
        "e2e_tests_passed": true,
        "e2e_count": 3,
        "timestamp": "2024-12-13T12:30:00Z"
      },
      "completed_at": "2024-12-13T12:30:00Z"
    }
  },
  "current_phase": "complete",
  "status": "complete"
}
```

### Step 7: Mark TodoWrite Complete

```
TodoWrite: Mark "Phase 5: Testing" as completed
TodoWrite: Remove all todos (feature complete)
```

## Exit Criteria

✅ Feature is complete when:

- All test engineers returned `status: "complete"`
- All tests passing
- Coverage target met (≥80% for unit tests)
- E2E tests cover user workflows
- Progress file marked complete
- TodoWrite cleared

❌ Do NOT mark complete if:

- Any tests failing
- Coverage below target
- Missing test scenarios from plan
- Build broken

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

### "Tests are flaky (pass/fail intermittently)"

**Solution**:

1. Identify flaky tests in output
2. Common causes: timing issues, async problems, test isolation
3. Re-spawn test engineer with:

   ```
   These tests are flaky: {test names}

   Fix by:
   - Adding proper waits
   - Ensuring test isolation
   - Mocking time-dependent code
   ```

### "Coverage is below target"

**Solution**:

1. Run coverage report: `npm test -- --coverage`
2. Identify uncovered lines
3. Re-spawn test engineer with:

   ```
   Current coverage: {percent}%
   Target: 80%

   Uncovered code:
   {files and line numbers}

   Add tests for uncovered branches.
   ```

### "E2E tests too slow"

**Solution**: Review test patterns:

- ✅ Use page object model (reusable selectors)
- ✅ Run tests in parallel
- ❌ Don't test same workflow multiple times
- ❌ Don't repeat setup (use fixtures)

### "Should I write tests for error cases?"

**Answer**: Yes. Error handling is critical:

- Unit tests: Test all error branches
- E2E tests: Test user-facing errors (404, network failures)
- Acceptance tests: Test API error responses

## Related References

- [Phase 4: Implementation](phase-4-implementation.md) - Previous phase
- [Agent Handoffs](agent-handoffs.md) - JSON handoff format
- [Troubleshooting](troubleshooting.md) - Common issues
