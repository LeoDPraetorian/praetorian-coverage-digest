# Phase 15: Test Quality

**Validate test suite quality using test-lead with MAX 1 RETRY.**

---

## Overview

Test Quality validates that tests are well-written, not just that they exist:

1. Verifying all planned tests were implemented
2. Checking anti-patterns specified in plan avoided
3. Identifying flakiness risks
4. Ensuring behavior testing (not implementation testing)
5. Confirming meaningful assertions

**Why test quality?** Coverage doesn't guarantee good tests. Tests must be maintainable and reliable.

**Entry Criteria:** Phase 14 (Coverage Verification) complete.

**Exit Criteria:** Test quality validation passes (or user approves).

---

## Step 1: Spawn Test Lead for Quality Validation

```markdown
Task(
subagent_type: "test-lead",
description: "Validate test quality for {feature}",
prompt: "
Task: Validate test quality against test plan

TEST PLAN LOCATION: {OUTPUT_DIR}/test-plan.md

TEST IMPLEMENTATION:

- Unit: {OUTPUT_DIR}/test-summary-unit.md
- Integration: {OUTPUT_DIR}/test-summary-integration.md
- E2E: {OUTPUT_DIR}/test-summary-e2e.md

VALIDATION TASKS:

1. PLAN ADHERENCE
   - Were all required tests from plan implemented?
   - Are any planned tests missing?
   - Were extra tests added? (document if yes)

2. ANTI-PATTERNS (from plan)
   - Were anti-patterns specified in plan avoided?
   - Are there new anti-patterns not in plan?

3. QUALITY CHECKS
   - Behavior vs implementation - Testing what, not how?
   - Test isolation - Independent tests?
   - Flakiness risks - Time-dependent, race conditions?
   - Assertions quality - Meaningful assertions?

DELIVERABLE:
Save validation to: {OUTPUT_DIR}/test-validation.md

Return:
{
'status': 'complete',
'plan_adherence': {
'tests_required': {total_count},
'tests_implemented': {total_count},
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
2. **Spawn tester to fix:**

```markdown
Task(
subagent_type: "{domain}-tester",
description: "Fix test quality issues",
prompt: "
Fix the following test quality issues:

TEST PLAN: {OUTPUT_DIR}/test-plan.md

VALIDATION FEEDBACK:
{from test-validation.md}

Focus on:

1. Missing tests from plan (CRITICAL)
2. Anti-patterns flagged
3. Quality issues (flakiness, weak assertions)

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

## Step 4: Quality Score Calculation

Test-lead calculates quality_score (0-100):

| Factor             | Weight | Description                                     |
| ------------------ | ------ | ----------------------------------------------- |
| Coverage           | 40%    | Overall coverage percentage                     |
| Anti-patterns      | 25%    | Penalties for mock-only, implementation testing |
| Flakiness risk     | 20%    | Time-dependency, race conditions                |
| Assertions quality | 15%    | Meaningful assertions vs trivial                |

**Score interpretation:**

| Score  | Interpretation     | Action               |
| ------ | ------------------ | -------------------- |
| 90-100 | Excellent          | Proceed              |
| 70-89  | Good, acceptable   | Proceed              |
| 50-69  | Needs improvement  | Fix or user approval |
| <50    | Significant issues | MUST fix             |

---

## Step 5: Anti-Pattern Detection

| Anti-Pattern           | Detection                              | Remedy                         |
| ---------------------- | -------------------------------------- | ------------------------------ |
| Testing mocks          | Mock returns same value being asserted | Test real behavior             |
| Implementation testing | Testing private methods                | Test public API                |
| Snapshot overuse       | >5 snapshots per component             | Reduce to meaningful snapshots |
| Weak assertions        | `expect(x).toBeDefined()` only         | Add specific value assertions  |
| Test duplication       | Same scenario multiple times           | Remove redundant tests         |
| No error testing       | 0 error case tests                     | Add error scenarios            |
| Time-dependent         | `setTimeout`, `Date.now()` in tests    | Use fake timers                |

---

## Step 6: Update MANIFEST.yaml

```yaml
phases:
  15_test_quality:
    status: "complete"
    completed_at: "{timestamp}"
    retry_count: 0

test_validation:
  agent: "test-lead"

  plan_adherence:
    tests_required: { total_count }
    tests_implemented: { total_count }
    all_met: true

  anti_patterns:
    avoided_from_plan: true
    detected: []

  quality_score: { score }
  verdict: "PASS"

  validation_report: "{OUTPUT_DIR}/test-validation.md"

  # If user approved despite issues
  quality_override:
    approved_by: "user"
    issues_accepted:
      - "3 snapshot tests exceed recommended limit"
    timestamp: "{timestamp}"
```

---

## Step 7: Update TodoWrite & Report

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

- Tests Required: {total_count}
- Tests Implemented: {total_count} ✅
- Missing: None

**Anti-Patterns:** None detected ✅

**Quality Score:** {score}/100 ✅

**Verdict:** PASS

**Validation Report:** {OUTPUT_DIR}/test-validation.md

→ Proceeding to Phase 16: Completion
```

---

## Edge Cases

### Coverage Met But Tests Missing From Plan

**Solution:** FAIL validation. Coverage alone doesn't mean plan adherence.

### Tests Deviate From Plan But Are Higher Quality

**Solution:** Document deviation. Use AskUserQuestion:

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Tests deviate from plan but may be better. Accept?",
      header: "Plan Deviation",
      multiSelect: false,
      options: [
        { label: "Accept deviation", description: "Tests are higher quality" },
        { label: "Follow plan", description: "Implement tests as specified" },
      ],
    },
  ],
});
```

### Test-Lead Flags False Positive Anti-Pattern

**Solution:** Document the finding with rationale. User can approve despite the finding.

### Coverage Target Barely Missed

**Solution:** Already handled in Phase 14. Phase 15 focuses on quality, not coverage.

---

## Skip Conditions

| Work Type | Test Quality                |
| --------- | --------------------------- |
| BUGFIX    | Skip (focused scope)        |
| SMALL     | Skip (minimal test changes) |
| MEDIUM    | Run                         |
| LARGE     | Run                         |

---

## Validation vs Planning

| Phase 12 (Planning)          | Phase 15 (Quality)               |
| ---------------------------- | -------------------------------- |
| test-lead CREATES plan       | test-lead VALIDATES against plan |
| Defines what tests needed    | Verifies tests were implemented  |
| Sets coverage targets        | Coverage checked in Phase 14     |
| Lists anti-patterns to avoid | Confirms anti-patterns avoided   |
| Output: test-plan.md         | Output: test-validation.md       |

---

## Related References

- [Phase 14: Coverage Verification](phase-14-coverage-verification.md) - Previous phase
- [Phase 16: Completion](phase-16-completion.md) - Next phase
- [quality-scoring.md](quality-scoring.md) - Quality score factors
