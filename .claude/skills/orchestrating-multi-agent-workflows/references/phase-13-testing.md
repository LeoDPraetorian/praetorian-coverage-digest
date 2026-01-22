# Phase 13: Testing

**Execute tests by spawning test agents in parallel for all test modes.**

---

## Overview

Testing executes the test plan by spawning test agents:

1. Implement tests according to test-lead's plan (Phase 12)
2. Write unit tests for business logic
3. Create integration tests for API interactions
4. Build E2E tests for user workflows
5. Achieve coverage targets from test plan

**Why parallel test modes?** All test types are independent and can run simultaneously.

**Entry Criteria:** Phase 12 (Test Planning) complete with test plan.

**Exit Criteria:** All tests passing, coverage targets met.

**⛔ COMPACTION GATE 3 FOLLOWS:** Before proceeding to Phase 14, complete [compaction-gates.md](compaction-gates.md) protocol.

---

## Step 1: Determine Test Configuration

Based on `technologies_detected` from Phase 3:

| Domain     | Test Agents                         | Total |
| ---------- | ----------------------------------- | ----- |
| Frontend   | 3 (unit + integration + e2e)        | 3     |
| Backend    | 3 (unit + integration + acceptance) | 3     |
| Full-stack | 3 frontend + 3 backend              | 6     |

---

## Step 2: Spawn ALL Test Agents in Parallel

**⚡ PRE-SPAWN CHECK:** Before spawning test agents, run intra-phase compaction protocol from [compaction-gates.md](compaction-gates.md#intra-phase-compaction-heavy-phases). If tokens >75%, compact first. Hook blocks at 85%. Testing spawns 3+ agents that all return verbose output.

**CRITICAL:** Spawn ALL test agents in a SINGLE message.

### Generic Test Agent Pattern

**Spawn ALL test agents in a SINGLE message (3 per domain).**

See domain orchestration for specific agent names, tools, and frameworks:

- Frontend → `orchestrating-feature-development` frontend testing section
- Backend → `orchestrating-feature-development` backend testing section
- Integration → `orchestrating-integration-development` testing section
- Capability → `orchestrating-capability-development` testing section

```markdown
# Unit tests

Task(
subagent_type: "{domain}-tester",
description: "Unit tests for {feature}",
prompt: "
TEST MODE: unit

PLAN LOCATION: {OUTPUT_DIR}/test-plan.md

FILES TO TEST:
{from implementation summary}

REQUIREMENTS:

1. Follow test plan requirements for unit tests
2. Implement all test cases specified in plan
3. Achieve coverage targets from plan ({coverage_target}%)
4. Avoid anti-patterns specified in plan
5. Use {test_framework} (see domain orchestration)
6. Verify tests pass

Save summary to: {OUTPUT_DIR}/test-summary-unit.md

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
subagent_type: "{domain}-tester",
description: "Integration tests for {feature}",
prompt: "
TEST MODE: integration

PLAN LOCATION: {OUTPUT_DIR}/test-plan.md

REQUIREMENTS:

1. Follow test plan requirements for integration tests
2. Test component + service integration
3. Use {mocking_framework} (see domain orchestration)
4. Test loading/error states
5. Avoid anti-patterns specified in plan
6. Verify tests pass

Save summary to: {OUTPUT_DIR}/test-summary-integration.md

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

# E2E/Acceptance tests (PARALLEL)

Task(
subagent_type: "{domain}-tester",
description: "E2E tests for {feature}",
prompt: "
TEST MODE: e2e

PLAN LOCATION: {OUTPUT_DIR}/test-plan.md

USER WORKFLOWS:
{from architecture acceptance criteria}

REQUIREMENTS:

1. Follow test plan requirements for E2E tests
2. Test complete user workflows
3. Use {e2e_framework} (see domain orchestration)
4. Test happy path and error scenarios
5. Avoid anti-patterns specified in plan
6. Verify tests pass

Save summary to: {OUTPUT_DIR}/test-summary-e2e.md

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

### Full-Stack Pattern

Spawn test agents for ALL affected domains in same message (3 per domain).

---

## Step 3: Wait for All Test Agents

All agents run in parallel. Wait for ALL to complete.

---

## Step 4: Validate Test Output

Check each test agent returned:

- ✅ `status: "complete"`
- ✅ All tests passing
- ✅ Coverage met (per test plan targets)
- ✅ Test files created
- ✅ `plan_adherence: true`

**If any tests failing:**

1. Read failure details
2. Determine if implementation bug or test issue
3. **Implementation bug:** Return to Phase 8 (Implementation)
4. **Test issue:** Document for Phase 14 (Coverage Verification)

---

## Step 5: Run Complete Test Suite

Verify all tests pass together:

```bash
# Run test commands for your domain (see domain orchestration for specific commands)
{test_command}
{e2e_command}
```

---

## Step 6: Update MANIFEST.yaml

```yaml
phases:
  13_testing:
    status: "complete"
    completed_at: "{timestamp}"

testing:
  agents_used:
    - {domain}-tester (unit)
    - {domain}-tester (integration)
    - {domain}-tester (e2e)

  results:
    unit:
      tests_created: {unit_count}
      tests_passed: {unit_count}
      coverage_percent: {coverage}
      summary: "{OUTPUT_DIR}/test-summary-unit.md"
    integration:
      tests_created: {integration_count}
      tests_passed: {integration_count}
      summary: "{OUTPUT_DIR}/test-summary-integration.md"
    e2e:
      tests_created: {e2e_count}
      tests_passed: {e2e_count}
      summary: "{OUTPUT_DIR}/test-summary-e2e.md"

  verification:
    all_tests_passed: true
    coverage_targets_met: true
```

---

## Step 7: Update TodoWrite & Report

```
TodoWrite([
  { content: "Phase 13: Testing", status: "completed", activeForm: "Executing tests" },
  { content: "Phase 14: Coverage Verification", status: "in_progress", activeForm: "Verifying coverage" },
  // ... rest
])
```

Output to user:

```markdown
## Testing Complete

**Test Results:**
| Mode | Created | Passed | Coverage |
|------|---------|--------|----------|
| Unit | {unit_count} | {unit_count} ✅ | {coverage}% |
| Integration | {integration_count} | {integration_count} ✅ | - |
| E2E | {e2e_count} | {e2e_count} ✅ | - |

**Plan Adherence:** All testers followed test plan

**Test Summaries:**

- test-summary-unit.md
- test-summary-integration.md
- test-summary-e2e.md

→ Proceeding to Phase 14: Coverage Verification
```

---

## Edge Cases

### Tests Are Flaky

**Solution:** Document for Phase 14/15. The test-lead will flag flakiness as a quality issue.

### Coverage Below Target

**Solution:** Document current coverage. Phase 14 will determine if additional tests needed.

### E2E Tests Too Slow

**Solution:** Use page object model, run tests in parallel, avoid redundant setup.

### Tester Didn't Follow Plan

If `plan_adherence: false`:

1. Document deviation
2. Flag for Phase 14 (Coverage Verification)
3. test-lead will evaluate if deviation acceptable

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

---

## Related References

- [Phase 12: Test Planning](phase-12-test-planning.md) - Previous phase (test plan creation)
- [Phase 14: Coverage Verification](phase-14-coverage-verification.md) - Next phase
- [delegation-templates-testing.md](delegation-templates-testing.md) - Tester agent prompts
