# Phase 9: Test Validation

Validate test implementation against the test plan using the test-lead agent. Includes feedback loop with MAX 1 RETRY before escalating to user.

## Purpose

Validate test suite quality against the test plan before completion by:

- Verifying all planned tests were implemented
- Checking coverage metrics against test plan targets
- Detecting anti-patterns specified in plan
- Identifying flakiness risks
- Ensuring behavior testing (not implementation testing)
- Confirming plan adherence

## Why Test Validation?

Writing tests is not enough. Tests must:

- **Follow the plan** - All required tests from Phase 7 implemented
- **Meet targets** - Coverage meets plan thresholds (Security: 95%, Business: 80%, Integration: 90%)
- **Avoid anti-patterns** - No patterns flagged in test plan
- **Test behavior** - Testing what users see, not implementation details
- **Be maintainable** - No anti-patterns that cause future issues
- **Be reliable** - No flaky tests that erode confidence

The test-lead validates implementation against the test plan created in Phase 7, ensuring the plan was followed.

## Workflow

### Step 1: Spawn Test Lead for Validation

```
Task(
  subagent_type: "test-lead",
  description: "Validate tests for {feature-name}",
  prompt: "Validate test implementation against test plan:

FEATURE: {feature-name}

TEST PLAN LOCATION: .claude/.output/features/{id}/test-plan.md

TEST IMPLEMENTATION:
Unit: {from test-summary-unit.md}
Integration: {from test-summary-integration.md}
E2E: {from test-summary-e2e.md}

VALIDATION TASKS:
1. PLAN ADHERENCE
   - Were all required tests from plan implemented?
   - Are any planned tests missing?
   - Were extra tests added? (document if yes)

2. COVERAGE TARGETS (from plan)
   - Security functions: 95% achieved?
   - Business logic: 80% achieved?
   - Integration paths: 90% achieved?

3. ANTI-PATTERNS (from plan)
   - Were anti-patterns specified in plan avoided?
   - Are there new anti-patterns not in plan?

4. QUALITY CHECKS
   - Behavior vs implementation - Testing what, not how?
   - Test isolation - Independent tests?
   - Flakiness risks - Time-dependent, race conditions?
   - Assertions quality - Meaningful assertions?

DELIVERABLE:
Save validation to: .claude/.output/features/{id}/test-validation.md

Return JSON:
{
  'status': 'complete',
  'plan_adherence': {
    'tests_required': 28,
    'tests_implemented': 28,
    'missing': [],
    'extra': []
  },
  'coverage': {
    'security_functions': { 'target': '95%', 'achieved': '96%', 'met': true },
    'business_logic': { 'target': '80%', 'achieved': '82%', 'met': true },
    'integration_paths': { 'target': '90%', 'achieved': '91%', 'met': true }
  },
  'anti_patterns': {
    'avoided_from_plan': true,
    'new_patterns': []
  },
  'quality_score': 85,  // 0-100
  'issues': [
    {
      'severity': 'critical|high|medium|low',
      'category': 'plan-deviation|anti-pattern|flakiness|coverage',
      'file': 'path/to/test.ts',
      'description': 'What the issue is',
      'recommendation': 'How to fix it'
    }
  ],
  'verdict': 'PASS|NEEDS_IMPROVEMENT|FAIL'
}
"
)
```

### Step 2: Evaluate Validation

Check test-lead output:

```python
# Pseudocode
if plan_adherence.met and all_coverage_targets_met and verdict == "PASS":
    # SUCCESS - Proceed to Phase 9
    proceed_to_completion()
elif verdict == "FAIL" or critical_issues or not plan_adherence.met:
    # FAIL - Enter feedback loop
    enter_feedback_loop()
else:
    # NEEDS_IMPROVEMENT - User decision
    ask_user_to_proceed_or_fix()
```

### Step 3: Feedback Loop (MAX 1 RETRY)

If `verdict: "FAIL"` or coverage targets not met or plan adherence issues:

#### Retry #1: Tester Fixes

1. **Compile validation feedback:**

   ```markdown
   # Test Validation Feedback

   ## Plan Adherence Issues

   {missing tests from test-validation.md}

   ## Coverage Gaps

   {from test-validation.md - which targets not met}

   ## Quality Issues

   {from test-validation.md - anti-patterns, flakiness}

   ## Priority

   1. Missing tests from plan (CRITICAL)
   2. Coverage targets not met
   3. Anti-patterns from plan
   4. New quality issues
   ```

2. **Spawn tester to fix:**

   ```
   Task(
     subagent_type: "frontend-tester",
     description: "Fix test validation issues for {feature-name}",
     prompt: "Fix the following test validation issues:

   TEST PLAN: .claude/.output/features/{id}/test-plan.md

   VALIDATION FEEDBACK:
   {compiled from test-validation.md}

   Focus on:
   1. Missing tests from plan (CRITICAL)
   2. Coverage targets not met
   3. Anti-patterns flagged
   4. Quality issues

   Return updated tests that satisfy the test plan.
   "
   )
   ```

3. **Re-spawn test-lead for validation (retry #1):**

   ```
   # Increment retry_count in metadata.json
   Task(subagent_type: "test-lead", ...)
   ```

4. **Re-evaluate validation**

#### After Retry #1: Escalate if Still Failing

If coverage targets not met or `verdict: "FAIL"` after retry:

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Test validation still failing after 1 retry. How should we proceed?",
      header: "Validation",
      multiSelect: false,
      options: [
        {
          label: "Show me the issues",
          description: "Display remaining test quality issues",
        },
        {
          label: "Proceed anyway",
          description: "Accept current test quality, document known issues",
        },
        {
          label: "Cancel feature",
          description: "Stop development, revisit implementation",
        },
      ],
    },
  ],
});
```

**Do NOT retry more than once.** Escalate to user.

### Step 4: Update Progress

```json
{
  "phases": {
    "validation": {
      "status": "complete",
      "retry_count": 0,
      "agents_used": ["test-lead"],
      "outputs": {
        "validation": ".claude/.output/features/{id}/test-validation.md"
      },
      "plan_adherence": {
        "tests_required": 28,
        "tests_implemented": 28,
        "all_met": true
      },
      "coverage_achieved": {
        "security_functions": "96%",
        "business_logic": "82%",
        "integration_paths": "91%"
      },
      "quality_score": 85,
      "verdict": "PASS",
      "completed_at": "2025-12-28T13:30:00Z"
    },
    "completion": {
      "status": "in_progress"
    }
  },
  "current_phase": "completion"
}
```

### Step 5: Mark TodoWrite Complete

```
TodoWrite: Mark "Phase 9: Test Validation" as completed
TodoWrite: Mark "Phase 10: Completion" as in_progress
```

## Exit Criteria

✅ Proceed to Phase 10 (Completion) when:

- Test-lead returned `verdict: "PASS"` (or user approved)
- All tests from plan implemented
- All coverage targets met (Security: 95%, Business: 80%, Integration: 90%)
- Anti-patterns from plan avoided
- `quality_score >= 70` (or user approved)
- No critical issues unaddressed
- Validation file saved
- Progress file updated
- TodoWrite marked complete

❌ Do NOT proceed if:

- `verdict: "FAIL"` without user approval
- Missing tests from plan
- Coverage targets not met
- Critical anti-patterns unaddressed
- No test validation performed

## Quality Score Calculation

The test-lead calculates quality_score based on:

| Factor             | Weight | Description                                         |
| ------------------ | ------ | --------------------------------------------------- |
| Coverage           | 40%    | Overall coverage percentage                         |
| Anti-patterns      | 25%    | Penalties for testing mocks, implementation details |
| Flakiness risk     | 20%    | Time-dependency, race conditions                    |
| Assertions quality | 15%    | Meaningful assertions vs trivial                    |

**Score interpretation:**

- 90-100: Excellent test suite
- 70-89: Good, acceptable
- 50-69: Needs improvement
- <50: Significant issues

## Common Anti-Patterns Detected

| Anti-Pattern           | Detection                              | Remedy                         |
| ---------------------- | -------------------------------------- | ------------------------------ |
| Testing mocks          | Mock returns same value being asserted | Test real behavior             |
| Implementation testing | Testing private methods                | Test public API                |
| Snapshot overuse       | >5 snapshots per component             | Reduce to meaningful snapshots |
| Weak assertions        | `expect(x).toBeDefined()` only         | Add specific value assertions  |
| Test duplication       | Same scenario multiple times           | Remove redundant tests         |
| No error testing       | 0 error case tests                     | Add error scenarios            |

## Common Issues

### "Coverage target met but tests missing from plan"

**Solution**: FAIL validation. Coverage alone doesn't mean plan adherence. All required tests from plan must be implemented.

### "Tests deviate from plan but are higher quality"

**Solution**: Document deviation with rationale. Use AskUserQuestion:

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Tests deviate from plan but may be better. Proceed or revise?",
      header: "Plan Deviation",
      options: [
        { label: "Accept deviation", description: "Tests are higher quality" },
        { label: "Follow plan", description: "Implement tests as specified" },
      ],
    },
  ],
});
```

### "Test-lead flags false positive anti-pattern"

**Solution**: Document the finding with rationale for why it's acceptable. User can approve despite the finding.

### "Coverage target barely missed (94% vs 95%)"

**Solution**: Use AskUserQuestion to let user decide:

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Security coverage is 94% (target: 95%). Proceed or improve?",
      header: "Coverage",
      options: [
        { label: "Improve coverage", description: "Add tests to reach 95%" },
        { label: "Proceed anyway", description: "Accept 94%" },
      ],
    },
  ],
});
```

### "Should I skip validation for small features?"

**Answer**: No. Validation ensures the plan was followed, regardless of feature size. Validation runs quickly (single agent).

## Validation vs Planning

| Phase 7 (Planning)            | Phase 9 (Validation)             |
| ----------------------------- | -------------------------------- |
| test-lead CREATES plan        | test-lead VALIDATES against plan |
| Defines what tests are needed | Verifies tests were implemented  |
| Sets coverage targets         | Checks coverage achieved         |
| Lists anti-patterns to avoid  | Confirms anti-patterns avoided   |
| Output: test-plan.md          | Output: test-validation.md       |

## Related References

- [Phase 7: Test Planning](phase-7-test-planning.md) - Test plan creation
- [Phase 8: Testing](phase-8-testing.md) - Previous phase (test implementation)
- [Agent Handoffs](agent-handoffs.md) - JSON handoff format
- [Troubleshooting](troubleshooting.md) - Common issues
