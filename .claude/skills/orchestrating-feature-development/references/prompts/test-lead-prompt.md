# Test Lead Subagent Prompt Template

Use this template when dispatching test-lead in Phase 9 (planning) and Phase 11 (validation).

## Usage

### Phase 9: Test Planning

```typescript
Task({
  subagent_type: "test-lead",
  description: "Create test plan for [feature]",
  prompt: `[Use planning template below]`,
});
```

### Phase 11: Test Validation

```typescript
Task({
  subagent_type: "test-lead",
  description: "Validate tests for [feature]",
  prompt: `[Use validation template below]`,
});
```

---

## Phase 9: Test Planning Template

````markdown
You are creating a test plan for: [FEATURE_NAME]

## Feature Context

[PASTE design.md summary]

## Implementation Summary

[PASTE implementation-log.md]

## Architecture Overview

[PASTE relevant architecture.md sections]

## Output Directory

OUTPUT_DIRECTORY: [FEATURE_DIR]

Write your test plan to: [FEATURE_DIR]/test-plan.md

## MANDATORY SKILLS

1. **persisting-agent-outputs** - Use for output file format

## Your Job

Create a comprehensive test plan that testers will follow EXACTLY.

The plan must specify:

1. What to test (behaviors, not implementation)
2. How to test it (test mode: unit/integration/e2e)
3. Expected outcomes
4. Edge cases to cover

## Test Coverage Pattern (REQUIRED)

Every feature requires systematic test coverage across multiple categories. Use this pattern to ensure comprehensive coverage.

### Coverage Categories

**1. Happy Path Tests (MUST HAVE - Baseline)**

The primary use cases that should always work:
- Main user flow completes successfully
- Expected data displays correctly
- Success states render properly
- Positive actions produce expected results

**2. Edge Case Tests (MUST HAVE - Boundaries)**

Boundary conditions and unusual but valid inputs:
- Empty states (empty arrays, null values, zero counts)
- Single item vs multiple items
- Maximum allowed values
- Minimum allowed values
- Special characters in text inputs
- Very long strings
- Unicode and internationalization

**3. Error Case Tests (MUST HAVE - Resilience)**

Failure scenarios and error handling:
- API failures (500 errors)
- Network timeouts
- Validation errors (400 errors)
- Authentication failures (401)
- Authorization failures (403)
- Not found errors (404)
- Rate limiting (429)

**4. Integration Tests (CONTEXT-DEPENDENT)**

Component and service interactions:
- Parent-child component communication
- State management integration
- API contract verification
- Event propagation
- Side effect handling

**5. Accessibility Tests (SHOULD HAVE)**

WCAG compliance verification:
- Keyboard navigation works
- Screen reader compatibility
- Focus management
- ARIA attributes correct
- Color contrast sufficient

---

### Test Plan Template

For the feature being tested, create this structured plan:

```markdown
# Test Plan: [Feature Name]

## Coverage Summary

| Category | Test Count | Priority |
|----------|------------|----------|
| Happy Path | X | MUST |
| Edge Cases | X | MUST |
| Error Cases | X | MUST |
| Integration | X | SHOULD |
| Accessibility | X | SHOULD |

## Happy Path Tests

### HP-1: [Primary use case]
- **Scenario**: [User does X]
- **Expected**: [Y happens]
- **Components**: [files to test]

### HP-2: [Secondary use case]
- **Scenario**: [User does X]
- **Expected**: [Y happens]
- **Components**: [files to test]

## Edge Case Tests

### EC-1: Empty state handling
- **Scenario**: [Component receives empty array]
- **Expected**: [Shows empty state message]
- **Components**: [files to test]

### EC-2: Boundary values
- **Scenario**: [Maximum items displayed]
- **Expected**: [Pagination or truncation works]
- **Components**: [files to test]

## Error Case Tests

### ER-1: API failure
- **Scenario**: [API returns 500]
- **Expected**: [Error message shown, retry available]
- **Components**: [files to test]

### ER-2: Network timeout
- **Scenario**: [Request times out]
- **Expected**: [Timeout message, graceful degradation]
- **Components**: [files to test]

## Integration Tests

### IN-1: [Component interaction]
- **Scenario**: [Parent passes data to child]
- **Expected**: [Child renders correctly, events bubble]
- **Components**: [files to test]

## Accessibility Tests

### AC-1: Keyboard navigation
- **Scenario**: [User tabs through component]
- **Expected**: [Focus visible, logical order]
- **Components**: [files to test]
```

---

### Coverage Checklist

Before finalizing the test plan, verify:

| Check | Status |
|-------|--------|
| Every component has at least one test | □ |
| All API calls have success AND failure tests | □ |
| Empty states are tested | □ |
| Error messages are verified | □ |
| Loading states are tested | □ |
| User interactions are covered | □ |

---

### Quality Score Calculation

Use this rubric for the quality_score:

| Coverage Area | Points | Criteria |
|---------------|--------|----------|
| Happy Path | 30 | All primary flows covered |
| Edge Cases | 25 | 80%+ boundary conditions covered |
| Error Cases | 25 | All API error codes handled |
| Integration | 10 | Key component interactions tested |
| Accessibility | 10 | Basic a11y verified |

**Total: 100 points**

**Minimum passing score: 70**

Scoring guide:
- 90-100: Excellent coverage, production-ready
- 80-89: Good coverage, minor gaps acceptable
- 70-79: Adequate coverage, meets minimum bar
- 60-69: Insufficient, needs more tests
- <60: Failing, major gaps

---

**CRITICAL**: The test plan must be specific enough that a tester can implement without asking questions. Include file paths, component names, and expected behaviors.

## Test Plan Document Structure

```markdown
# Test Plan: [Feature]

## Summary

[What this feature does and key behaviors to verify]

## Test Strategy

### Unit Tests

Focus: Individual functions and components in isolation

| Test Case | Description             | Expected Outcome  |
| --------- | ----------------------- | ----------------- |
| [name]    | [behavior being tested] | [expected result] |

### Integration Tests

Focus: Component interactions with mocked services

| Test Case | Description                | Expected Outcome  |
| --------- | -------------------------- | ----------------- |
| [name]    | [interaction being tested] | [expected result] |

### E2E Tests

Focus: Full user workflows in browser

| Test Case | User Journey           | Expected Outcome  |
| --------- | ---------------------- | ----------------- |
| [name]    | [step-by-step journey] | [expected result] |

## Coverage Targets

- Unit: 80% line coverage for new code
- Integration: All API interactions covered
- E2E: Happy path + critical error paths

## Edge Cases

- [Edge case 1 and how to test]
- [Edge case 2 and how to test]

## Out of Scope

- [What NOT to test and why]
```
````

## Output Format

```json
{
  "agent": "test-lead",
  "output_type": "test-plan",
  "feature_directory": "[FEATURE_DIR]",
  "skills_invoked": ["persisting-agent-outputs"],
  "status": "complete",
  "unit_tests_planned": 10,
  "integration_tests_planned": 5,
  "e2e_tests_planned": 3,
  "handoff": {
    "next_agent": "frontend-tester",
    "context": "Test plan ready, proceed to Phase 12 testing"
  }
}
```

````

---

## Phase 11: Test Validation Template

```markdown
You are validating tests against the plan for: [FEATURE_NAME]

## Test Plan

[PASTE the full test-plan.md]

## Test Results

### Unit Test Summary
[PASTE test-summary-unit.md]

### Integration Test Summary
[PASTE test-summary-integration.md]

### E2E Test Summary
[PASTE test-summary-e2e.md]

## Output Directory

OUTPUT_DIRECTORY: [FEATURE_DIR]

Write your validation to: [FEATURE_DIR]/test-validation.md

## Your Job

Validate that the implemented tests match the plan:

1. **Completeness** - Are all planned tests implemented?
2. **Correctness** - Do tests verify the right behaviors?
3. **Quality** - Are tests well-written and maintainable?
4. **Coverage** - Are coverage targets met?

## Validation Checklist

### Unit Tests
| Planned Test | Implemented | Correct | Notes |
|--------------|-------------|---------|-------|
| [test name] | ✓/✗ | ✓/✗ | |

### Integration Tests
| Planned Test | Implemented | Correct | Notes |
|--------------|-------------|---------|-------|
| [test name] | ✓/✗ | ✓/✗ | |

### E2E Tests
| Planned Test | Implemented | Correct | Notes |
|--------------|-------------|---------|-------|
| [test name] | ✓/✗ | ✓/✗ | |

## Quality Score

Calculate based on:
- Planned tests implemented: X/Y (weight: 40%)
- Tests correctly verify behavior: X/Y (weight: 30%)
- Coverage targets met: Yes/No (weight: 20%)
- No anti-patterns detected: Yes/No (weight: 10%)

**quality_score = (implemented% × 0.4) + (correct% × 0.3) + (coverage × 0.2) + (no_antipatterns × 0.1)**

## Validation Document Structure

```markdown
# Test Validation: [Feature]

## Summary
- Quality Score: [X]/100
- Plan Adherence: [X]% of planned tests implemented
- Coverage Met: Yes/No

## Validation Results

### Unit Tests
[Checklist results]

### Integration Tests
[Checklist results]

### E2E Tests
[Checklist results]

## Issues Found

### Missing Tests
- [Tests from plan not implemented]

### Incorrect Tests
- [Tests that don't verify planned behavior]

### Anti-Patterns
- [Testing implementation details, flaky tests, etc.]

## Verdict

**PASSED** - quality_score >= 70, all critical tests present
**NEEDS_WORK** - quality_score < 70 or missing critical tests
````

## Integration

### Calls (during execution)

| Skill                 | When              | Purpose                              |
| --------------------- | ----------------- | ------------------------------------ |
| `developing-with-tdd` | Quality validation | Anti-pattern definitions (Cardinal Sin: simulating production logic, mocking anti-patterns, over-engineering) |

**When checking "No anti-patterns detected"**, refer to `developing-with-tdd` skill for specific anti-patterns:
- Testing mocks instead of real code
- Simulating production logic in tests (the Cardinal Sin)
- Over-engineering (YAGNI violations)
- Vague test names
- Tests that pass when production code is deleted

---

## Output Format

```json
{
  "agent": "test-lead",
  "output_type": "test-validation",
  "feature_directory": "[FEATURE_DIR]",
  "skills_invoked": ["persisting-agent-outputs"],
  "status": "complete",
  "quality_score": 85,
  "verdict": "PASSED|NEEDS_WORK",
  "missing_tests": [],
  "incorrect_tests": [],
  "handoff": {
    "next_agent": null,
    "context": "Validation complete, proceed to Phase 12"
  }
}
```

If NEEDS_WORK, orchestrator returns to testers for fixes (max 1 retry).

```

```
