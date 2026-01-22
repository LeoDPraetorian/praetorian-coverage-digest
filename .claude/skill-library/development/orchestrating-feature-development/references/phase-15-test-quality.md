# Phase 15: Test Quality

**Validate test suite quality with feature-specific anti-pattern detection.**

---

## Overview

Test Quality validates that tests are well-written with feature-specific anti-patterns and quality checks.

**Entry Criteria:** Phase 14 (Coverage Verification) complete.

**Exit Criteria:** Test quality validation passes (or user approves).

---

## Feature-Specific Anti-Patterns

### Frontend Anti-Patterns

| Anti-Pattern                   | Detection                                     | Example                                                        | Remedy                      |
| ------------------------------ | --------------------------------------------- | -------------------------------------------------------------- | --------------------------- |
| Mock returns asserted value    | Mock setup returns exact value being asserted | `mockFn.mockReturnValue([1,2]); expect(result).toEqual([1,2])` | Test real behavior          |
| Testing implementation details | Spying on internal hooks/state                | `expect(useState).toHaveBeenCalled()`                          | Test outcomes not internals |
| Snapshot overuse               | >3 snapshots per component                    | Multiple `toMatchSnapshot()` calls                             | Reduce to critical UI       |
| Testing library internals      | Testing React Query cache directly            | `expect(queryClient.cache).toContain()`                        | Test observable behavior    |
| No error testing               | 0 error scenarios in test file                | Missing `rejects`, error states                                | Add error cases             |
| Flaky timing                   | Raw setTimeout/Date.now                       | `setTimeout(() => expect())`                                   | Use fake timers             |
| Testing styles                 | Asserting CSS classes                         | `expect(el).toHaveClass('bg-red')`                             | Test behavior not styling   |

### Backend Anti-Patterns

| Anti-Pattern            | Detection                      | Example                            | Remedy                  |
| ----------------------- | ------------------------------ | ---------------------------------- | ----------------------- |
| Testing private methods | Accessing unexported functions | `pkg.internalFunc()`               | Test via public API     |
| Over-mocking            | >5 mocks per test              | Mock everything                    | Use real dependencies   |
| Testing generated code  | Tests for code-gen files       | `_generated_test.go`               | Skip generated          |
| Testing getters/setters | Trivial accessor tests         | `expect(obj.GetName()).toBe(name)` | Test business logic     |
| Flaky concurrent tests  | Uncontrolled goroutines        | Random test failures               | Use sync primitives     |
| Testing log output      | Asserting log messages         | `expect(log).toContain()`          | Test behavior           |
| Empty assertions        | No meaningful checks           | `assert.NotNil(err)` only          | Add specific assertions |

---

## Spawn Test Lead for Quality Validation

```markdown
Task(
subagent_type: "test-lead",
description: "Validate test quality for {feature}",
prompt: "
Task: Validate test quality against test plan

FEATURE TYPE: {Frontend | Backend}

TEST PLAN LOCATION: .feature-development/test-plan.md

TEST IMPLEMENTATION:

- Unit: .feature-development/test-summary-unit.md
- Integration: .feature-development/test-summary-integration.md
- E2E: .feature-development/test-summary-e2e.md

VALIDATION TASKS:

1. PLAN ADHERENCE
   - Were all required tests from plan implemented?
   - Are any planned tests missing?
   - Were extra tests added? (document if yes)

2. ANTI-PATTERNS (Feature-Specific)

   For Frontend, check for:
   - Mock returns asserted value (CRITICAL)
   - Testing implementation details (HIGH)
   - Snapshot overuse (>3 per component) (MEDIUM)
   - No error testing (HIGH)
   - Flaky timing (no fake timers) (HIGH)

   For Backend, check for:
   - Testing private methods (HIGH)
   - Over-mocking (>5 mocks) (MEDIUM)
   - Testing generated code (MEDIUM)
   - Empty assertions (HIGH)

3. QUALITY CHECKS
   - Behavior vs implementation - Testing what, not how?
   - Test isolation - Independent tests?
   - Flakiness risks - Time-dependent, race conditions?
   - Assertions quality - Meaningful assertions?

DELIVERABLE:
Save validation to: .feature-development/test-validation.md

Return:
{
'status': 'complete',
'plan_adherence': {
'tests_required': {count},
'tests_implemented': {count},
'missing': [],
'extra': []
},
'anti_patterns': {
'avoided_from_plan': true,
'detected': []
},
'quality_score': {0-100},
'issues': [],
'verdict': 'PASS | NEEDS_IMPROVEMENT | FAIL'
}
"
)
```

---

## Quality Score Calculation for Features

| Factor             | Weight | Frontend Focus                    | Backend Focus                 |
| ------------------ | ------ | --------------------------------- | ----------------------------- |
| Coverage           | 40%    | Component + hook coverage         | Handler + service coverage    |
| Anti-patterns      | 25%    | Snapshot, mock-only, impl testing | Private methods, over-mocking |
| Flakiness risk     | 20%    | Timing, async handling            | Concurrency, race conditions  |
| Assertions quality | 15%    | Meaningful UI assertions          | Specific error assertions     |

### Score Interpretation

| Score  | Frontend Meaning                               | Backend Meaning                         |
| ------ | ---------------------------------------------- | --------------------------------------- |
| 90-100 | Excellent - behavior-focused, no anti-patterns | Excellent - idiomatic, proper isolation |
| 70-89  | Good - minor issues                            | Good - acceptable patterns              |
| 50-69  | Needs work - anti-patterns present             | Needs work - isolation issues           |
| <50    | Significant issues                             | Significant issues                      |

**Minimum passing score:** 70

---

## Feedback Loop (MAX 1 RETRY)

If `verdict: "FAIL"` or critical quality issues:

### Frontend Fix

```markdown
Task(
subagent_type: "frontend-tester",
description: "Fix test quality issues",
prompt: "
Fix the following test quality issues:

TEST PLAN: .feature-development/test-plan.md

VALIDATION FEEDBACK:
{from test-validation.md}

ANTI-PATTERNS DETECTED:

- useAssets.test.ts: Mock returns asserted value (line 45)
- AssetTable.test.tsx: 5 snapshots (max 3 allowed)

Fix by:

1. Replace mock-only tests with behavior tests
2. Remove 2 non-critical snapshots
3. Add meaningful assertions

Return updated tests that satisfy the test plan.
"
)
```

### Backend Fix

```markdown
Task(
subagent_type: "backend-tester",
description: "Fix test quality issues",
prompt: "
Fix the following test quality issues:

TEST PLAN: .feature-development/test-plan.md

VALIDATION FEEDBACK:
{from test-validation.md}

ANTI-PATTERNS DETECTED:

- handler_test.go: Testing unexported function (line 78)
- service_test.go: 7 mocks (max 5 recommended)

Fix by:

1. Test via public API instead of internal function
2. Reduce mock count by using real dependencies where safe
3. Add specific error message assertions

Return updated tests that satisfy the test plan.
"
)
```

---

## Update MANIFEST.yaml

```yaml
phases:
  15_test_quality:
    status: "complete"
    completed_at: "{timestamp}"
    retry_count: 0

test_validation:
  feature_type: "frontend"
  agent: "test-lead"

  plan_adherence:
    tests_required: 20
    tests_implemented: 20
    all_met: true

  anti_patterns:
    frontend:
      mock_only: 0
      implementation_testing: 0
      snapshot_overuse: 0
      no_error_testing: 0
    avoided_from_plan: true
    detected: []

  quality_score: 85
  verdict: "PASS"

  validation_report: ".feature-development/test-validation.md"
```

---

## User Report

```markdown
## Test Quality Validation Complete

**Feature Type:** Frontend

**Plan Adherence:**

- Tests Required: 20
- Tests Implemented: 20
- Missing: None

**Anti-Patterns:**
| Pattern | Count |
|---------|-------|
| Mock returns asserted value | 0 |
| Implementation testing | 0 |
| Snapshot overuse | 0 |
| No error testing | 0 |

**Quality Score:** 85/100

**Verdict:** PASS

**Validation Report:** .feature-development/test-validation.md

Proceeding to Phase 16: Completion
```

---

## Skip Conditions

| Work Type | Test Quality                |
| --------- | --------------------------- |
| BUGFIX    | Skip (focused scope)        |
| SMALL     | Skip (minimal test changes) |
| MEDIUM    | Run                         |
| LARGE     | Run                         |

---

## Related References

- [Phase 14: Coverage Verification](phase-14-coverage-verification.md) - Previous phase
- [Phase 16: Completion](phase-16-completion.md) - Next phase
