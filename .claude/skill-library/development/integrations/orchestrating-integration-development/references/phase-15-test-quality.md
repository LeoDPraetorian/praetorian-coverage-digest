# Phase 15: Test Quality

**Validate test suite quality using test-lead with MAX 1 RETRY.**

**This file provides:** Complete phase protocol for integration development.

---

## Overview

Test Quality validates that tests are well-written, not just that they exist:

1. Verifying all planned tests were implemented
2. Checking anti-patterns specified in plan avoided
3. Identifying flakiness risks
4. Ensuring behavior testing (not mock testing)
5. Confirming meaningful assertions

**Why test quality?** Coverage doesn't guarantee good tests. Integration tests must test real behavior through mocks, not just mock responses.

**Entry Criteria:** Phase 14 (Coverage Verification) complete.

**Exit Criteria:** Test quality validation passes (or user approves).

---

## Step 1: Spawn Test Lead for Quality Validation

```markdown
Task(
subagent_type: "test-lead",
description: "Validate test quality for {vendor} integration",
prompt: "
Task: Validate test quality against test plan

TEST PLAN LOCATION: {OUTPUT_DIR}/test-plan.md

TEST IMPLEMENTATION:

- {vendor}\_test.go

VALIDATION TASKS:

1. PLAN ADHERENCE
   - Were all required tests from plan implemented?
   - Are any planned tests missing?
   - Were extra tests added? (document if yes)

2. ANTI-PATTERNS (from plan)
   - Testing mocks instead of behavior?
   - Skipping error scenarios?
   - Hardcoded test data that doesn't match API format?

3. INTEGRATION-SPECIFIC QUALITY
   - Mock server covers all API endpoints?
   - Error responses properly simulated?
   - Auth header validation in mock?
   - Pagination scenarios tested?

4. ASSERTION QUALITY
   - Testing behavior, not implementation?
   - Meaningful assertions (not just 'no error')?
   - Error message content verified?

5. FLAKINESS RISKS
   - Time-dependent tests?
   - Race conditions in concurrent code?
   - Network-dependent assertions?

MANDATORY SKILLS:

- persisting-agent-outputs

OUTPUT_DIRECTORY: {from Phase 1}

DELIVERABLE:
Save validation to: {OUTPUT_DIR}/test-quality.md

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
'quality_score': {score},
'issues': [],
'verdict': 'PASS | NEEDS_IMPROVEMENT | FAIL'
}
"
)
```

---

## Step 2: Evaluate Validation

```python
if plan_adherence.met and verdict == "PASS":
    proceed_to_phase_16()
elif verdict == "FAIL" or critical_issues:
    enter_feedback_loop()
else:  # NEEDS_IMPROVEMENT
    ask_user_to_proceed_or_fix()
```

---

## Step 3: Feedback Loop (MAX 1 RETRY)

If `verdict: "FAIL"` or critical quality issues:

### Retry #1: Tester Fixes

1. **Compile validation feedback**
2. **Spawn backend-tester to fix:**

```markdown
Task(
subagent_type: "backend-tester",
description: "Fix test quality issues for {vendor}",
prompt: "
Fix the following test quality issues:

TEST PLAN: {OUTPUT_DIR}/test-plan.md

VALIDATION FEEDBACK:
{from test-quality.md}

Focus on:

1. Missing tests from plan (CRITICAL)
2. Anti-patterns flagged
3. Quality issues (mock-only tests, weak assertions)

MANDATORY SKILLS:

- developing-with-tdd
- testing-integrations

Return updated tests that satisfy the test plan.
"
)
```

3. **Re-spawn test-lead for validation**
4. **If still failing → Escalate**

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Test validation still failing after 1 retry. How to proceed?",
      header: "Validation",
      multiSelect: false,
      options: [
        { label: "Show me the issues", description: "Display remaining quality issues" },
        { label: "Proceed anyway", description: "Accept current test quality" },
        { label: "Cancel", description: "Stop development" },
      ],
    },
  ],
});
```

---

## Step 4: Integration-Specific Anti-Patterns

| Anti-Pattern               | Detection                       | Remedy                           |
| -------------------------- | ------------------------------- | -------------------------------- |
| Testing mock responses     | Assert equals mock return value | Test behavior through mock       |
| Skipping auth tests        | No ValidateCredentials test     | Add auth failure scenarios       |
| Skipping affiliation tests | No CheckAffiliation tests       | Add all 5 affiliation scenarios  |
| Missing error tests        | 0 tests with expected error     | Add API error, auth error tests  |
| Hardcoded mock data        | Mock doesn't match API schema   | Use realistic API response shape |
| No pagination test         | Only single-page scenario       | Add multi-page test              |
| Weak assertions            | Only `require.NoError(t, err)`  | Assert on behavior, results      |

---

## Step 5: Quality Score Calculation

Test-lead calculates quality_score (0-100):

| Factor                | Weight | Description                        |
| --------------------- | ------ | ---------------------------------- |
| Plan adherence        | 30%    | All planned tests implemented      |
| Coverage              | 25%    | Overall coverage percentage        |
| Anti-patterns avoided | 20%    | No mock-only, behavior testing     |
| Assertion quality     | 15%    | Meaningful, specific assertions    |
| Flakiness risk        | 10%    | No time-dependent, race conditions |

**Score interpretation:**

| Score  | Interpretation     | Action               |
| ------ | ------------------ | -------------------- |
| 90-100 | Excellent          | Proceed              |
| 70-89  | Good, acceptable   | Proceed              |
| 50-69  | Needs improvement  | Fix or user approval |
| <50    | Significant issues | MUST fix             |

---

## Step 6: Create Validation Report

Write `{OUTPUT_DIR}/test-quality.md`:

```markdown
# Test Quality Validation: {vendor}

**Validated:** {timestamp}
**Verdict:** PASS

## Plan Adherence

| Metric            | Value |
| ----------------- | ----- |
| Tests Required    | 14    |
| Tests Implemented | 14    |
| Missing           | 0     |
| Extra             | 2     |

**Extra tests:** Pagination edge cases (acceptable)

## Anti-Pattern Check

| Anti-Pattern           | Status |
| ---------------------- | ------ |
| Testing mock responses | ✅     |
| Skipping auth tests    | ✅     |
| Missing error tests    | ✅     |
| Hardcoded mock data    | ✅     |
| No pagination test     | ✅     |
| Weak assertions        | ✅     |

## Assertion Quality

| Test                     | Assertions                         | Quality |
| ------------------------ | ---------------------------------- | ------- |
| Invoke_Success           | NoError, Len(assets), asset fields | ✅      |
| Invoke_InvalidCreds      | Error, Contains("validating")      | ✅      |
| CheckAffiliation_Exists  | NoError, True                      | ✅      |
| CheckAffiliation_Missing | Error, Contains("cloud id")        | ✅      |

## Quality Score: 85/100

| Factor            | Score | Weight | Weighted |
| ----------------- | ----- | ------ | -------- |
| Plan adherence    | 100   | 30%    | 30       |
| Coverage          | 85    | 25%    | 21.25    |
| Anti-patterns     | 80    | 20%    | 16       |
| Assertion quality | 75    | 15%    | 11.25    |
| Flakiness risk    | 70    | 10%    | 7        |
| **Total**         |       |        | **85.5** |
```

---

## Step 7: Update MANIFEST.yaml

```yaml
phases:
  15_test_quality:
    status: "complete"
    completed_at: "{timestamp}"
    retry_count: 0

test_validation:
  agent: "test-lead"

  plan_adherence:
    tests_required: 14
    tests_implemented: 14
    missing: []
    extra: ["pagination_edge_cases"]
    all_met: true

  anti_patterns:
    avoided_from_plan: true
    detected: []

  quality_score: 85
  verdict: "PASS"

  validation_report: "{OUTPUT_DIR}/test-quality.md"
```

---

## Step 8: Update TodoWrite & Report

```
TodoWrite([
  { content: "Phase 15: Test Quality", status: "completed", activeForm: "Validating test quality" },
  { content: "Phase 16: Completion", status: "in_progress", activeForm: "Completing workflow" },
  // ... rest
])
```

Output to user:

```markdown
## Test Quality Validation Complete

**Plan Adherence:**

- Tests Required: 14
- Tests Implemented: 14 ✅
- Missing: None

**Anti-Patterns:** None detected ✅

**Quality Score:** 85/100 ✅

**Verdict:** PASS

**Validation Report:** {OUTPUT_DIR}/test-quality.md

→ Proceeding to Phase 16: Completion
```

---

## Skip Conditions

| Work Type | Test Quality |
| --------- | ------------ |
| SMALL     | Skip         |
| MEDIUM    | Run          |
| LARGE     | Run          |

---

## Integration Test Quality Checklist

| Aspect          | Good                                | Bad                       |
| --------------- | ----------------------------------- | ------------------------- |
| Mock server     | Validates auth, returns real shapes | Always returns success    |
| Error scenarios | All error paths tested              | Only happy path           |
| Assertions      | Tests behavior, checks fields       | Only `require.NoError`    |
| Plan coverage   | All planned tests exist             | Missing affiliation tests |
| Pagination      | Multi-page scenario tested          | Only single page          |

---

## Related References

- [Phase 14: Coverage Verification](phase-14-coverage-verification.md) - Previous phase
- [Phase 16: Completion](phase-16-completion.md) - Next phase
- [testing-integrations](../../../skill-library/testing/testing-integrations/SKILL.md) - Test patterns
