# Test Lead Subagent Prompt Template

Use this template when dispatching test-lead in Phase 7 (planning) and Phase 9 (validation).

## Usage

### Phase 7: Test Planning

```typescript
Task({
  subagent_type: "test-lead",
  description: "Create test plan for [feature]",
  prompt: `[Use planning template below]`,
});
```

### Phase 9: Test Validation

```typescript
Task({
  subagent_type: "test-lead",
  description: "Validate tests for [feature]",
  prompt: `[Use validation template below]`,
});
```

---

## Phase 7: Test Planning Template

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
    "context": "Test plan ready, proceed to Phase 8 testing"
  }
}
```

````

---

## Phase 9: Test Validation Template

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
    "context": "Validation complete, proceed to Phase 10"
  }
}
```

If NEEDS_WORK, orchestrator returns to testers for fixes (max 1 retry).

```

```
