# Reviewer Subagent Prompt Template

Use this template when dispatching reviewer subagents in Phase 6.

## Two-Stage Review Process

Following the obra/superpowers pattern, code review has TWO stages:

1. **Spec Compliance Review** - Does the code match the plan?
2. **Code Quality Review** - Is the code well-built?

**IMPORTANT:** Do NOT start code quality review until spec compliance is confirmed.

## Usage

### Stage 1: Spec Compliance Reviewer

```typescript
Task({
  subagent_type: "frontend-reviewer", // or "backend-reviewer"
  description: "Spec compliance review for [feature]",
  prompt: `[Use spec compliance template below]`,
});
```

### Stage 2: Code Quality Reviewer

```typescript
Task({
  subagent_type: "frontend-reviewer", // or "backend-reviewer"
  description: "Code quality review for [feature]",
  prompt: `[Use code quality template below]`,
});
```

---

## Stage 1: Spec Compliance Review Template

````markdown
You are reviewing code for SPEC COMPLIANCE: [FEATURE_NAME]

## Your Single Focus

Does the implementation match the specification in plan.md?

- Nothing missing (all requirements implemented)
- Nothing extra (no unrequested features)
- Correct behavior (matches spec, not "close enough")

## Plan Requirements

[PASTE the full task specifications from plan.md]

## Implementation Summary

[PASTE the implementation-log.md summary from developer]

## Files to Review

[LIST of files created/modified by developer]

## Output Directory

OUTPUT_DIRECTORY: [FEATURE_DIR]

## MANDATORY CHECK

For EACH requirement in the plan:

1. Is it implemented? (Yes/No)
2. Does it match the spec exactly? (Yes/No/Deviation noted)
3. Is there anything extra not in the spec? (List extras)

## Spec Compliance Checklist

| Requirement | Implemented | Matches Spec | Notes |
| ----------- | ----------- | ------------ | ----- |
| [req 1]     | ✓/✗         | ✓/✗          |       |
| [req 2]     | ✓/✗         | ✓/✗          |       |
| ...         |             |              |       |

## Verdict

**SPEC_COMPLIANT** - All requirements met, nothing extra
**NOT_COMPLIANT** - Issues found (list below)

### Issues (if NOT_COMPLIANT)

**Missing:**

- [Requirements not implemented]

**Extra (unrequested):**

- [Features added that weren't in spec]

**Deviations:**

- [Behaviors that don't match spec]

## Output Format

```json
{
  "agent": "frontend-reviewer",
  "output_type": "spec-compliance-review",
  "feature_directory": "[FEATURE_DIR]",
  "skills_invoked": ["persisting-agent-outputs"],
  "status": "complete",
  "verdict": "SPEC_COMPLIANT|NOT_COMPLIANT",
  "issues_found": [],
  "handoff": {
    "next_agent": "frontend-reviewer (code quality)",
    "context": "Spec compliance confirmed, proceed to code quality review"
  }
}
```
````

If NOT_COMPLIANT, orchestrator returns to developer for fixes before code quality review.

````

---

## Stage 2: Code Quality Review Template

```markdown
You are reviewing code for QUALITY: [FEATURE_NAME]

**PREREQUISITE:** Spec compliance review must be PASSED before this review.

## Your Focus

Is the code well-built?

- Clean and maintainable
- Follows project patterns
- Proper error handling
- Good test coverage
- No security issues

## Code Quality Checklist

### Architecture & Design
- [ ] Follows project patterns and conventions
- [ ] Proper separation of concerns
- [ ] No unnecessary coupling
- [ ] DRY principle followed

### Code Quality
- [ ] Clear, descriptive names
- [ ] Functions are small and focused
- [ ] No magic numbers/strings
- [ ] Proper error handling
- [ ] No commented-out code

### Testing
- [ ] Tests verify behavior (not implementation)
- [ ] Edge cases covered
- [ ] Tests are readable and maintainable
- [ ] No flaky tests

### Security (if applicable)
- [ ] Input validation present
- [ ] No hardcoded secrets
- [ ] Proper authentication/authorization
- [ ] XSS/injection prevention

## Files to Review

[LIST of files from implementation]

## Output Directory

OUTPUT_DIRECTORY: [FEATURE_DIR]

Write your review to: [FEATURE_DIR]/review.md

## Issue Categories

When reporting issues, categorize as:

- **Critical (must fix)** - Bugs, security issues, broken functionality
- **Important (should fix)** - Code quality, maintainability concerns
- **Suggestion (nice to have)** - Style, minor improvements

## Verdict

**APPROVED** - No critical or important issues
**APPROVED_WITH_NOTES** - Minor suggestions only
**CHANGES_REQUESTED** - Critical or important issues found

## Review Document Structure

```markdown
# Code Quality Review: [Feature]

## Summary
[2-3 sentences on overall quality]

## Strengths
- [What was done well]

## Issues

### Critical
- [File:line] [Description]

### Important
- [File:line] [Description]

### Suggestions
- [File:line] [Description]

## Verdict: [APPROVED|APPROVED_WITH_NOTES|CHANGES_REQUESTED]
````

## Output Format

```json
{
  "agent": "frontend-reviewer",
  "output_type": "code-quality-review",
  "feature_directory": "[FEATURE_DIR]",
  "skills_invoked": ["persisting-agent-outputs"],
  "status": "complete",
  "verdict": "APPROVED|APPROVED_WITH_NOTES|CHANGES_REQUESTED",
  "critical_issues": 0,
  "important_issues": 0,
  "suggestions": 2,
  "handoff": {
    "next_agent": "test-lead",
    "context": "Code review approved, ready for test planning"
  }
}
```

If CHANGES_REQUESTED, orchestrator returns to developer for fixes (max 1 retry).

```

```
