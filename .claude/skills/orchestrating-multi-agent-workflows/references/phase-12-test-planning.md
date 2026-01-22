# Phase 12: Test Planning

**Create comprehensive test plan using test-lead before testers write any tests.**

---

## Overview

Test Planning designs test strategy and documents requirements by:

1. Analyzing implementation to understand what needs testing
2. Defining coverage targets for each category
3. Specifying required test cases with rationale
4. Identifying anti-patterns to avoid
5. Establishing acceptance criteria

**Why test planning?** Writing tests without a plan leads to coverage gaps, over-testing, anti-patterns, and rework.

**Entry Criteria:** Phase 11 (Code Quality) complete.

**Exit Criteria:** Test plan saved with all required sections.

---

## Step 1: Read Skill Manifest

**REQUIRED:** Load testing skills from Phase 4 skill manifest:

```bash
Read("{OUTPUT_DIR}/skill-manifest.yaml")
```

Extract `skills_by_domain.testing.library_skills[]` for injection into test-lead prompt.

---

## Step 2: Spawn Test Lead for Planning

```markdown
Task(
subagent_type: "test-lead",
description: "Create test plan for {feature}",
prompt: "
Task: Create comprehensive test plan

INPUTS (Read and synthesize):

1. Architecture: {OUTPUT_DIR}/architecture-plan.md
2. Implementation: {OUTPUT_DIR}/implementation-summary.md
3. Security Assessment: {OUTPUT_DIR}/security-review.md (from Phase 11)

ANALYZE and create test plan specifying:

1. COVERAGE TARGETS (see domain orchestration for specific thresholds)
   - Security functions: {security_target}% (CRITICAL)
   - Business logic: {business_target}% (HIGH)
   - Integration paths: {integration_target}% (HIGH)
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

MANDATORY SKILLS TO READ:
{skills_by_domain.testing.library_skills}

DELIVERABLE:
Save test plan to: {OUTPUT_DIR}/test-plan.md

Return:
{
'status': 'complete',
'coverage_analysis': {
'security_functions': { 'target': '{security_target}%', 'priority': 'CRITICAL' },
'business_logic': { 'target': '{business_target}%', 'priority': 'HIGH' },
'integration_paths': { 'target': '{integration_target}%', 'priority': 'HIGH' }
},
'tests_required': {
'unit': {unit_count},
'integration': {integration_count},
'e2e': {e2e_count},
'total': {total_count}
}
}
"
)
```

---

## Step 3: Validate Test Plan Output

Check that test-lead returned:

- ✅ `status: "complete"`
- ✅ Test plan saved to `{OUTPUT_DIR}/test-plan.md`
- ✅ Coverage targets defined for all categories
- ✅ Specific test cases listed with rationale
- ✅ Anti-patterns documented
- ✅ Acceptance criteria clear

**If `status: "blocked"`:**

1. Read blocker details
2. Resolve architectural issues if needed
3. Re-spawn test-lead with resolution

---

## Step 4: Verify Test Plan Structure

Test plan must include:

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

{Validation criteria for Phase 15}
```

---

## Step 5: Update MANIFEST.yaml

```yaml
phases:
  12_test_planning:
    status: "complete"
    completed_at: "{timestamp}"
    agent: "test-lead"

test_plan:
  location: "{OUTPUT_DIR}/test-plan.md"
  coverage_targets:
    security_functions: "{security_target}%"
    business_logic: "{business_target}%"
    integration_paths: "{integration_target}%"
  tests_required:
    unit: { unit_count }
    integration: { integration_count }
    e2e: { e2e_count }
    total: { total_count }
  anti_patterns: # Domain-specific anti-patterns
    - "{anti_pattern_1}"
    - "{anti_pattern_2}"
    - "{anti_pattern_3}"
```

---

## Step 6: Update TodoWrite & Report

```
TodoWrite([
  { content: "Phase 12: Test Planning", status: "completed", activeForm: "Planning tests" },
  { content: "Phase 13: Testing", status: "in_progress", activeForm: "Executing tests" },
  // ... rest
])
```

Output to user:

```markdown
## Test Planning Complete

**Coverage Targets (from domain orchestration):**
| Category | Target | Priority |
|----------|--------|----------|
| Security Functions | {security_target}% | CRITICAL |
| Business Logic | {business_target}% | HIGH |
| Integration Paths | {integration_target}% | HIGH |

**Tests Required:**

- Unit: {unit_count}
- Integration: {integration_count}
- E2E: {e2e_count}
- **Total: {total_count}**

**Anti-patterns to Avoid:**
See domain orchestration for specific anti-patterns.

**Test Plan:** {OUTPUT_DIR}/test-plan.md

→ Proceeding to Phase 13: Testing
```

---

## Edge Cases

### Should Test-Lead Run Coverage Analysis?

**Answer:** Yes. Test-lead should analyze current coverage to identify gaps. This is INPUT to the plan.

```bash
# Run coverage command for your domain (see domain orchestration for specific commands)
{coverage_command}
```

### Test Plan is Too Detailed

**Expected behavior.** Detailed plans prevent rework. Better to over-specify than under-specify.

### Implementation Changed During Code Review

**Solution:** Re-run test-lead with updated implementation summary. The plan should reflect actual implementation.

### Test-Lead Suggests More Tests Than Needed

**Solution:** Use AskUserQuestion to confirm scope:

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Test plan suggests {total_count} tests. Proceed with full plan or reduce scope?",
      header: "Test Planning",
      multiSelect: false,
      options: [
        { label: "Full plan (Recommended)", description: "Implement all {total_count} tests" },
        { label: "Critical only", description: "Only security + critical business logic" },
      ],
    },
  ],
});
```

---

## Skip Conditions

| Work Type | Test Planning                    |
| --------- | -------------------------------- |
| BUGFIX    | Skip (test at bug location only) |
| SMALL     | Skip (minimal test scope)        |
| MEDIUM    | Run                              |
| LARGE     | Run                              |

---

## Test Plan Quality Checklist

| Aspect           | Good                                            | Bad                    |
| ---------------- | ----------------------------------------------- | ---------------------- |
| Coverage targets | "Security: 95%, Business: 80%"                  | "High coverage needed" |
| Test cases       | "Auth token validation in auth.service.test.ts" | "Test auth"            |
| Anti-patterns    | "No mock-only tests, no implementation testing" | "Write good tests"     |
| Acceptance       | "≥95% security coverage, zero mock-only tests"  | "Good coverage"        |

---

## Related References

- [Phase 11: Code Quality](phase-11-code-quality.md) - Previous phase
- [Phase 13: Testing](phase-13-testing.md) - Next phase (testers implement plan)
- [delegation-templates-testing.md](delegation-templates-testing.md) - Tester agent prompts
- [quality-scoring.md](quality-scoring.md) - Test quality factors
