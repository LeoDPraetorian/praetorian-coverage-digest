# Phase 7: Test Planning

Create a comprehensive test plan using the test-lead agent before testers write any tests.

## Purpose

Design test strategy and document test requirements by:

- Analyzing implementation to understand what needs testing
- Defining coverage targets for each category (security, business logic, integration)
- Specifying required test cases with rationale
- Identifying anti-patterns to avoid
- Establishing acceptance criteria
- Creating structured plan for testers to follow

## Why Test Planning?

Writing tests without a plan leads to:

- **Coverage gaps** - Critical paths untested
- **Over-testing** - Redundant tests that waste effort
- **Anti-patterns** - Mock-only tests, implementation testing
- **Inconsistent quality** - No unified test approach
- **Rework** - Tests that don't meet acceptance criteria

The test-lead creates a **test plan** that testers implement in Phase 7, ensuring comprehensive, high-quality test coverage.

## Workflow

### Step 1: Spawn Test Lead for Planning

```
Task(
  subagent_type: "test-lead",
  description: "Create test plan for {feature-name}",
  prompt: "Create a comprehensive test plan for this feature:

FEATURE: {feature-name}

INPUTS (Read and synthesize):
1. Design: .claude/.output/features/{id}/design.md
2. Plan: .claude/.output/features/{id}/plan.md
3. Architecture: .claude/.output/features/{id}/architecture.md
4. Security Assessment: .claude/.output/features/{id}/security-assessment.md
5. Implementation: .claude/.output/features/{id}/implementation-log.md

TASK:
Analyze the implementation and create a test plan that specifies:

1. COVERAGE TARGETS
   - Security functions: 95% (CRITICAL)
   - Business logic: 80% (HIGH)
   - Integration paths: 90% (HIGH)
   - Current coverage vs targets

2. REQUIRED TESTS (Priority Order)
   - List specific test cases needed
   - File locations for each test
   - Rationale (why this test is required)
   - Priority (CRITICAL/HIGH/MEDIUM)

3. TESTING APPROACH
   - Behavior testing principles
   - Anti-patterns to avoid
   - Async handling patterns
   - Available test infrastructure

4. ACCEPTANCE CRITERIA
   - Coverage thresholds
   - Quality gates
   - Anti-pattern checks

DELIVERABLE:
Save test plan to: .claude/.output/features/{id}/test-plan.md

Follow test-lead's Test Plan Template format.

Return JSON:
{
  'status': 'complete',
  'summary': 'Test plan for {feature-name}',
  'coverage_analysis': {
    'security_functions': { 'target': '95%', 'priority': 'CRITICAL' },
    'business_logic': { 'target': '80%', 'priority': 'HIGH' },
    'integration_paths': { 'target': '90%', 'priority': 'HIGH' }
  },
  'tests_required': {
    'unit': 15,
    'integration': 8,
    'e2e': 5
  },
  'handoff': {
    'recommended_agents': ['frontend-tester', 'frontend-tester', 'frontend-tester'],
    'plan_location': '.claude/.output/features/{id}/test-plan.md',
    'context': 'Implement tests according to plan in Phase 7'
  }
}
"
)
```

### Step 2: Validate Test Plan Output

Check that test-lead returned:

- ✅ `status: "complete"`
- ✅ Test plan saved to `.claude/.output/features/{id}/test-plan.md`
- ✅ Coverage targets defined for all categories
- ✅ Specific test cases listed with rationale
- ✅ Anti-patterns documented
- ✅ Acceptance criteria clear
- ✅ Handoff includes plan location

If `status: "blocked"`:

1. Read blocker details from handoff
2. Resolve architectural issues if needed
3. Re-spawn test-lead with resolution

### Step 3: Review Test Plan Structure

Verify the test plan includes all required sections:

```markdown
## Test Plan: {Feature Name}

### Coverage Analysis (Current State)

{Current vs target coverage with gaps}

### Required Tests (Priority Order)

1. Security Functions (CRITICAL)
2. Business Logic (HIGH)
3. Integration Paths (HIGH)

### Testing Approach

- Behavior testing principles
- Anti-patterns to AVOID
- Async handling guidelines
- Available infrastructure

### Acceptance Criteria

{Coverage thresholds and quality gates}

### Review Checklist

{Validation criteria for Phase 8}
```

### Step 4: Update Progress

```json
{
  "phases": {
    "review": { "status": "complete", "retry_count": 0 },
    "test_planning": {
      "status": "complete",
      "agent_used": "test-lead",
      "outputs": {
        "test_plan": ".claude/.output/features/{id}/test-plan.md"
      },
      "coverage_targets": {
        "security_functions": "95%",
        "business_logic": "80%",
        "integration_paths": "90%"
      },
      "tests_required": {
        "unit": 15,
        "integration": 8,
        "e2e": 5,
        "total": 28
      },
      "completed_at": "2025-12-28T13:00:00Z"
    },
    "testing": {
      "status": "in_progress"
    }
  },
  "current_phase": "testing"
}
```

### Step 5: Mark TodoWrite Complete

```
TodoWrite: Mark "Phase 7: Test Planning" as completed
TodoWrite: Mark "Phase 8: Testing" as in_progress
```

## Exit Criteria

✅ Proceed to Phase 8 (Testing) when:

- Test-lead returned `status: "complete"`
- Test plan saved with all required sections
- Coverage targets defined for all categories
- Specific test cases documented with rationale
- Anti-patterns clearly identified
- Acceptance criteria established
- Handoff includes plan location for testers
- Progress file updated
- TodoWrite marked complete

❌ Do NOT proceed if:

- Test plan missing required sections
- Coverage targets not defined
- Test cases lack rationale
- Anti-patterns not specified
- No acceptance criteria

## Test Plan Quality Checklist

| Aspect           | Good                                                                               | Bad                    |
| ---------------- | ---------------------------------------------------------------------------------- | ---------------------- |
| Coverage targets | "Security: 95%, Business: 80%, Integration: 90%"                                   | "High coverage needed" |
| Test cases       | "Auth token validation in auth.service.test.ts - currently untested attack vector" | "Test auth"            |
| Anti-patterns    | "No mock-only tests, no implementation testing"                                    | "Write good tests"     |
| Acceptance       | "≥95% security coverage, zero mock-only tests"                                     | "Good coverage"        |

## Common Issues

### "Should test-lead run coverage analysis?"

**Answer**: Yes. Test-lead should analyze current coverage to identify gaps. This is INPUT to the plan.

```bash
# Frontend
npm test -- --coverage

# Backend
go test -coverprofile=coverage.out && go tool cover -func=coverage.out
```

### "Test plan is too detailed"

**Expected behavior**. Detailed plans prevent rework. Better to over-specify than under-specify.

### "Implementation changed during code review"

**Solution**: Re-run test-lead with updated implementation-log.md. The plan should reflect actual implementation.

### "Should security tests be in the plan?"

**Answer**: ALWAYS. Security test cases should be explicitly listed with 95% coverage target.

### "Test-lead suggests more tests than needed"

**Solution**: Use AskUserQuestion to confirm scope:

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Test plan suggests 28 tests. Proceed with full plan or reduce scope?",
      header: "Test Planning",
      options: [
        { label: "Full plan", description: "Implement all 28 tests" },
        { label: "Critical only", description: "Only security + critical business logic" },
      ],
    },
  ],
});
```

## Test Plan Benefits

| Without Plan                  | With Plan                            |
| ----------------------------- | ------------------------------------ |
| Testers guess what to test    | Testers follow explicit requirements |
| Inconsistent coverage         | Unified coverage targets             |
| Anti-patterns discovered late | Anti-patterns prevented upfront      |
| Tests fail validation         | Tests meet acceptance criteria       |
| Rework required               | Right the first time                 |

## Related References

- [Phase 7: Code Review](phase-7-code-review.md) - Previous phase
- [Phase 9: Testing](phase-9-testing.md) - Next phase (testers implement plan)
- [Phase 10: Test Validation](phase-10-test-validation.md) - test-lead validates against plan
- [Agent Handoffs](agent-handoffs.md) - JSON handoff format
- [Troubleshooting](troubleshooting.md) - Common issues
