# Phase 7: Test Assessment

Assess test quality using the test-assessor agent. Includes feedback loop with MAX 1 RETRY before escalating to user.

## Purpose

Validate test suite quality before completion by:
- Checking coverage metrics against targets
- Detecting anti-patterns in tests
- Identifying flakiness risks
- Ensuring behavior testing (not implementation testing)

## Why Test Assessment?

Writing tests is not enough. Tests must be:
- **High quality** - Testing behavior, not implementation
- **Maintainable** - No anti-patterns that cause future issues
- **Reliable** - No flaky tests that erode confidence
- **Complete** - Coverage meets targets

The test-assessor provides a quality gate to catch test issues before feature completion.

## Workflow

### Step 1: Spawn Test Assessor

```
Task(
  subagent_type: "test-assessor",
  description: "Assess tests for {feature-name}",
  prompt: "Assess test quality for this feature:

FEATURE: {feature-name}

TEST FILES:
Unit: {from test-summary-unit.md}
Integration: {from test-summary-integration.md}
E2E: {from test-summary-e2e.md}

COVERAGE THRESHOLD: 70%

QUALITY CHECKS:
1. Coverage metrics - Does coverage meet threshold?
2. Anti-patterns - Testing mocks instead of behavior?
3. Flakiness risks - Time-dependent, race conditions?
4. Behavior vs implementation - Testing what, not how?
5. Test isolation - Independent tests?
6. Assertions quality - Meaningful assertions?

DELIVERABLE:
Save assessment to: .claude/features/{id}/test-assessment.md

Return JSON:
{
  'status': 'complete',
  'quality_score': 75,  // 0-100
  'coverage': {
    'overall': 82,
    'unit': 85,
    'integration': 78,
    'e2e': 80
  },
  'issues': [
    {
      'severity': 'critical|high|medium|low',
      'category': 'anti-pattern|flakiness|coverage|isolation',
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

### Step 2: Evaluate Assessment

Check test-assessor output:

```python
# Pseudocode
if quality_score >= 70 and verdict == "PASS":
    # SUCCESS - Proceed to Phase 8
    proceed_to_completion()
elif verdict == "FAIL" or critical_issues:
    # FAIL - Enter feedback loop
    enter_feedback_loop()
else:
    # NEEDS_IMPROVEMENT - User decision
    ask_user_to_proceed_or_fix()
```

### Step 3: Feedback Loop (MAX 1 RETRY)

If `verdict: "FAIL"` or `quality_score < 70`:

#### Retry #1: Tester Fixes

1. **Compile assessment feedback:**
   ```markdown
   # Test Assessment Feedback

   ## Issues to Fix
   {from test-assessment.md}

   ## Priority
   1. Critical issues (must fix)
   2. High severity issues
   3. Anti-patterns
   ```

2. **Spawn tester to fix:**
   ```
   Task(
     subagent_type: "frontend-tester",
     description: "Fix test issues for {feature-name}",
     prompt: "Fix the following test quality issues:

   ISSUES:
   {compiled from test-assessment.md}

   Focus on:
   1. Critical issues first
   2. Anti-patterns
   3. Coverage gaps

   Return updated tests.
   "
   )
   ```

3. **Re-spawn test-assessor (retry #1):**
   ```
   # Increment retry_count in metadata.json
   Task(subagent_type: "test-assessor", ...)
   ```

4. **Re-evaluate assessment**

#### After Retry #1: Escalate if Still Failing

If `quality_score < 70` or `verdict: "FAIL"` after retry:

```typescript
AskUserQuestion({
  questions: [{
    question: "Test assessment still failing after 1 retry. How should we proceed?",
    header: "Assessment",
    multiSelect: false,
    options: [
      {
        label: "Show me the issues",
        description: "Display remaining test quality issues"
      },
      {
        label: "Proceed anyway",
        description: "Accept current test quality, document known issues"
      },
      {
        label: "Cancel feature",
        description: "Stop development, revisit implementation"
      }
    ]
  }]
})
```

**Do NOT retry more than once.** Escalate to user.

### Step 4: Update Progress

```json
{
  "phases": {
    "assessment": {
      "status": "complete",
      "retry_count": 0,
      "agents_used": ["test-assessor"],
      "outputs": {
        "assessment": ".claude/features/{id}/test-assessment.md"
      },
      "quality_score": 78,
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
TodoWrite: Mark "Phase 7: Test Assessment" as completed
TodoWrite: Mark "Phase 8: Completion" as in_progress
```

## Exit Criteria

✅ Proceed to Phase 8 (Completion) when:
- Test-assessor returned `verdict: "PASS"` (or user approved)
- `quality_score >= 70` (or user approved)
- No critical issues unaddressed
- Assessment file saved
- Progress file updated
- TodoWrite marked complete

❌ Do NOT proceed if:
- `verdict: "FAIL"` without user approval
- Critical anti-patterns unaddressed
- No test assessment performed

## Quality Score Calculation

The test-assessor calculates quality_score based on:

| Factor | Weight | Description |
|--------|--------|-------------|
| Coverage | 40% | Overall coverage percentage |
| Anti-patterns | 25% | Penalties for testing mocks, implementation details |
| Flakiness risk | 20% | Time-dependency, race conditions |
| Assertions quality | 15% | Meaningful assertions vs trivial |

**Score interpretation:**
- 90-100: Excellent test suite
- 70-89: Good, acceptable
- 50-69: Needs improvement
- <50: Significant issues

## Common Anti-Patterns Detected

| Anti-Pattern | Detection | Remedy |
|--------------|-----------|--------|
| Testing mocks | Mock returns same value being asserted | Test real behavior |
| Implementation testing | Testing private methods | Test public API |
| Snapshot overuse | >5 snapshots per component | Reduce to meaningful snapshots |
| Weak assertions | `expect(x).toBeDefined()` only | Add specific value assertions |
| Test duplication | Same scenario multiple times | Remove redundant tests |
| No error testing | 0 error case tests | Add error scenarios |

## Common Issues

### "Quality score is borderline (65-69)"

**Solution**: Use AskUserQuestion to let user decide:
```typescript
AskUserQuestion({
  questions: [{
    question: "Test quality score is 67 (threshold: 70). Proceed or improve?",
    header: "Quality",
    options: [
      { label: "Improve tests", description: "Spawn tester to fix issues" },
      { label: "Proceed anyway", description: "Accept current quality" }
    ]
  }]
})
```

### "Test-assessor flags false positive anti-pattern"

**Solution**: Document the finding with rationale for why it's acceptable. User can approve despite the finding.

### "Coverage is high but quality score is low"

**Expected behavior**. Coverage alone doesn't mean quality. Tests may be:
- Testing implementation details
- Using too many mocks
- Missing meaningful assertions

Address the anti-patterns, not just coverage.

### "Should I skip assessment for small features?"

**Answer**: No. Small features can still have anti-patterns that cause maintenance burden. Assessment runs quickly (single agent).

## Related References

- [Phase 6: Testing](phase-6-testing.md) - Previous phase
- [Agent Handoffs](agent-handoffs.md) - JSON handoff format
- [Troubleshooting](troubleshooting.md) - Common issues
