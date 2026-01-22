# Tight Feedback Loop

**Implementation→Review→Test cycle with automatic iteration when review or tests fail.**

## Pattern Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  TIGHT FEEDBACK LOOP (Phases 8-11-13)                                       │
│  Completion Promise: IMPLEMENTATION_VERIFIED                                │
│  Scratchpad: .feature-development/feedback-scratchpad.md                    │
│                                                                             │
│  LOOP until VERIFIED or max_feedback_iterations:                            │
│                                                                             │
│    ┌──────────────┐                                                         │
│    │ Phase 8      │ ← Spawn developer with scratchpad context               │
│    │ Implement    │   Include: review issues, test failures from prior iter │
│    └──────┬───────┘                                                         │
│           ▼                                                                 │
│    ┌──────────────┐                                                         │
│    │ Phase 11     │ ← Spec compliance check (BLOCKING)                      │
│    │ Review       │   If NOT_COMPLIANT → update scratchpad → next iteration │
│    └──────┬───────┘                                                         │
│           ▼ COMPLIANT                                                       │
│    ┌──────────────┐                                                         │
│    │ Phase 13     │ ← Run tests                                             │
│    │ Test         │   If FAIL → update scratchpad → next iteration          │
│    └──────┬───────┘                                                         │
│           ▼ PASS                                                            │
│                                                                             │
│    IMPLEMENTATION_VERIFIED ← Exit loop successfully                         │
│                                                                             │
│  IF max reached without VERIFIED: Escalate to user                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Configuration

Read limits from `.claude/config/orchestration-limits.yaml`:

| Guard                             | Config Path                                   | Default | Purpose                                    |
| --------------------------------- | --------------------------------------------- | ------- | ------------------------------------------ |
| `max_feedback_iterations`         | `inter_phase.max_feedback_iterations`         | 5       | Max full Implementation→Review→Test cycles |
| `max_consecutive_review_failures` | `inter_phase.max_consecutive_review_failures` | 3       | Escalate if same review issue persists     |
| `max_consecutive_test_failures`   | `inter_phase.max_consecutive_test_failures`   | 3       | Escalate if same test failure persists     |

## Feature-Specific Agent Selection

| Feature Type | Phase 8 Developer    | Phase 11 Reviewers                        | Phase 13 Testers     |
| ------------ | -------------------- | ----------------------------------------- | -------------------- |
| Frontend     | `frontend-developer` | `frontend-reviewer` + `frontend-security` | `frontend-tester` ×3 |
| Backend      | `backend-developer`  | `backend-reviewer` + `backend-security`   | `backend-tester` ×3  |
| Full-Stack   | Both developers      | All 4 reviewers                           | All 6 testers        |

## Key Elements

### 1. Completion Promise

- Signal: `IMPLEMENTATION_VERIFIED`
- Loop exits ONLY when achieved OR max iterations exceeded
- Verified when: review APPROVED AND all tests PASS

### 2. Scratchpad

Location: `.feature-development/feedback-scratchpad.md`

Updated after each iteration with:

- What was implemented
- Review result (COMPLIANT/NOT_COMPLIANT with issues)
- Test result (PASS/FAIL with failures)

### 3. Error Context Injection

When re-spawning developer after failure:

```markdown
## Prior Iteration Context

READ FIRST: .feature-development/feedback-scratchpad.md

### From Iteration {N-1}:

**Review Issues to Address:**

- Missing null check in UserProfile component
- Incorrect TypeScript type for API response

**Test Failures to Fix:**

- UserProfile.test.tsx:45 - Expected "Loading" but received "Error"

You MUST address these specific issues before proceeding.
```

### 4. Consecutive Failure Detection

Track if SAME issue appears multiple iterations:

- Same review issue 3x → Escalate
- Same test failure 3x → Escalate
- Prevents infinite loops on unfixable issues

### 5. Escalation Options

When max iterations reached, present via AskUserQuestion:

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Feedback loop reached max iterations without verification. How to proceed?",
      header: "Feedback Loop",
      multiSelect: false,
      options: [
        { label: "Continue", description: "Add 3 more iterations" },
        { label: "Accept current state", description: "Proceed with known issues documented" },
        { label: "Review history", description: "Show full feedback scratchpad" },
        { label: "Cancel", description: "Abort feature development" },
      ],
    },
  ],
});
```

## Scratchpad Format

```markdown
# Feedback Scratchpad: {Feature Name}

## Iteration 1

- **Completed**: Initial UserProfile component implementation
- **Review**: NOT_COMPLIANT
  - Missing error boundary
  - No loading state handling
- **Next**: Address review issues

## Iteration 2

- **Completed**: Added error boundary and loading states
- **Review**: COMPLIANT
- **Test**: FAIL
  - UserProfile.test.tsx:45 - Loading state not rendering
- **Next**: Fix test failure

## Iteration 3

- **Completed**: Fixed loading state rendering
- **Review**: COMPLIANT
- **Test**: PASS (15/15 tests)
- **Result**: IMPLEMENTATION_VERIFIED ✅
```

## When to Use

| Scenario                                       | Use Tight Feedback Loop? |
| ---------------------------------------------- | ------------------------ |
| Feature with review AND test requirements      | ✅ Yes                   |
| Single-pass validation (just review OR test)   | ❌ No                    |
| Exploratory prototyping                        | ❌ No                    |
| Critical path that must pass before proceeding | ✅ Yes                   |

## Related References

- [Phase 8: Implementation](phase-8-implementation.md) - Developer agent patterns
- [Phase 11: Code Quality](phase-11-code-quality.md) - Review patterns
- [Phase 13: Testing](phase-13-testing.md) - Test agent patterns
- [Checkpoint Configuration](checkpoint-configuration.md) - Human approval points
