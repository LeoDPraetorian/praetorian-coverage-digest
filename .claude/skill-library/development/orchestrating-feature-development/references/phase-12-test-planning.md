# Phase 12: Test Planning

**Create comprehensive test plan using test-lead before testers write any tests.**

---

## Overview

Test Planning designs test strategy by:

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

## Step 2: Feature Coverage Targets

| Category           | Frontend Target | Backend Target | Rationale                   |
| ------------------ | --------------- | -------------- | --------------------------- |
| Security Functions | 95%             | 95%            | Auth, validation - CRITICAL |
| Business Logic     | 80%             | 85%            | Core functionality          |
| Integration Paths  | 85%             | 90%            | API/service communication   |
| UI Components      | 75%             | N/A            | Rendering, interactions     |
| Utilities          | 65%             | 70%            | Helper functions            |

---

## Step 3: Spawn Test Lead for Planning

```markdown
Task(
subagent_type: "test-lead",
description: "Create test plan for {feature}",
prompt: "
Task: Create comprehensive test plan for feature

INPUTS (Read and synthesize):

1. Architecture: .feature-development/architecture-plan.md
2. Implementation: .feature-development/implementation-summary.md
3. Security Assessment: .feature-development/security-review.md (from Phase 11)

FEATURE TYPE: {Frontend | Backend | Full-stack}

ANALYZE and create test plan specifying:

1. COVERAGE TARGETS
   For Frontend:
   - Security functions: 95% (CRITICAL - auth hooks, validation)
   - Business logic: 80% (HIGH - state management, data transforms)
   - Integration paths: 85% (HIGH - API hooks, service calls)
   - UI components: 75% (MEDIUM - rendering, interactions)

   For Backend:
   - Security functions: 95% (CRITICAL - auth handlers, validation)
   - Business logic: 85% (HIGH - service logic, transformations)
   - Integration paths: 90% (HIGH - external API calls)
   - Handlers: 80% (HIGH - request/response handling)

2. REQUIRED TESTS (Priority Order)

   Frontend:
   - Unit: Component logic, hooks, utilities
   - Integration: TanStack Query hooks with MSW
   - E2E: User workflows with Playwright

   Backend:
   - Unit: Handler logic, service functions
   - Integration: API endpoint validation
   - Acceptance: Full workflow with real dependencies

3. TESTING APPROACH

   Frontend Anti-Patterns to AVOID:
   - Testing implementation details (internal state)
   - Snapshot overuse (>3 per component)
   - Mock-only tests (mock returns what you assert)
   - Testing library internals (React hooks)
   - Flaky timing tests (no fake timers)

   Backend Anti-Patterns to AVOID:
   - Testing private methods directly
   - Over-mocking (mock everything)
   - Testing generated code
   - Testing getters/setters
   - Flaky concurrent tests

4. ACCEPTANCE CRITERIA
   - All coverage targets met
   - Zero anti-patterns detected
   - All tests pass consistently (3 runs)
   - No flaky tests

DELIVERABLE:
Save test plan to: .feature-development/test-plan.md

Return:
{
'status': 'complete',
'coverage_analysis': {
'security_functions': { 'target': '95%', 'priority': 'CRITICAL' },
'business_logic': { 'target': '80%', 'priority': 'HIGH' },
'integration_paths': { 'target': '85%', 'priority': 'HIGH' }
},
'tests_required': {
'unit': {count},
'integration': {count},
'e2e': {count},
'total': {count}
}
}
"
)
```

---

## Feature-Specific Test Frameworks

| Feature Type | Unit Framework       | Integration           | E2E                      |
| ------------ | -------------------- | --------------------- | ------------------------ |
| Frontend     | Vitest               | MSW + Testing Library | Playwright               |
| Backend      | Go testing + testify | httptest              | Acceptance with real AWS |
| Full-stack   | Both                 | Both                  | Playwright               |

---

## Test Plan Structure for Features

```markdown
## Test Plan: {Feature Name}

### Feature Type: {Frontend | Backend | Full-stack}

### Coverage Analysis (Current State)

| Category           | Current | Target | Gap  |
| ------------------ | ------- | ------ | ---- |
| Security Functions | 45%     | 95%    | -50% |
| Business Logic     | 60%     | 80%    | -20% |
| Integration Paths  | 30%     | 85%    | -55% |

### Required Tests (Priority Order)

#### Security Functions (CRITICAL - 95%)

1. `useAuth.test.ts` - Auth hook validation
   - Token refresh flow
   - Logout cleanup
   - Session expiry handling

2. `validateInput.test.ts` - Input validation
   - XSS prevention
   - SQL injection prevention
   - Type coercion attacks

#### Business Logic (HIGH - 80%)

1. `useAssetFilters.test.ts` - Filter state management
   - Initial state
   - Filter updates
   - Filter reset

#### Integration Paths (HIGH - 85%)

1. `useAssets.integration.test.ts` - API integration
   - Success response handling
   - Error response handling
   - Loading states

### Anti-Patterns to AVOID

| Anti-Pattern                | Detection                                           | Remedy                     |
| --------------------------- | --------------------------------------------------- | -------------------------- |
| Mock returns asserted value | `mockFn.mockReturnValue(x); expect(result).toBe(x)` | Test real behavior         |
| Testing implementation      | `expect(useState).toHaveBeenCalled()`               | Test outcomes              |
| Snapshot overuse            | >3 snapshots per file                               | Reduce to critical UI only |
| No error testing            | 0 error scenarios                                   | Add error cases            |

### Acceptance Criteria

- [ ] Security functions: 95% coverage
- [ ] Business logic: 80% coverage
- [ ] Integration paths: 85% coverage
- [ ] Zero anti-patterns detected
- [ ] All tests pass 3 consecutive runs
```

---

## Update MANIFEST.yaml

```yaml
phases:
  12_test_planning:
    status: "complete"
    completed_at: "{timestamp}"
    agent: "test-lead"

test_plan:
  location: ".feature-development/test-plan.md"
  feature_type: "frontend"

  coverage_targets:
    security_functions: "95%"
    business_logic: "80%"
    integration_paths: "85%"

  tests_required:
    unit: 12
    integration: 5
    e2e: 3
    total: 20

  anti_patterns:
    - "No mock-only tests"
    - "No implementation testing"
    - "No snapshot overuse"
    - "No flaky timing"
```

---

## User Report

```markdown
## Test Planning Complete

**Feature Type:** Frontend

**Coverage Targets:**
| Category | Target | Priority |
|----------|--------|----------|
| Security Functions | 95% | CRITICAL |
| Business Logic | 80% | HIGH |
| Integration Paths | 85% | HIGH |

**Tests Required:**

- Unit: 12
- Integration: 5
- E2E: 3
- **Total: 20**

**Anti-Patterns to Avoid:**

- No mock-only tests
- No implementation testing
- No snapshot overuse (max 3 per component)
- No flaky timing tests

**Test Plan:** .feature-development/test-plan.md

Proceeding to Phase 13: Testing
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

## Related References

- [Phase 11: Code Quality](phase-11-code-quality.md) - Previous phase
- [Phase 13: Testing](phase-13-testing.md) - Next phase (testers implement plan)
