# Tight Feedback Loop

**Implementation → Review → Test cycle for fingerprintx plugin development.**

---

## Key Distinction

- `iterating-to-completion` = INTRA-task (same agent loops on one task)
- **Tight feedback loop** = INTER-phase (Implementation→Review→Test cycle across different agents)

---

## Pattern Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  TIGHT FEEDBACK LOOP                                                        │
│  Completion Promise: PLUGIN_VERIFIED                                        │
│  Scratchpad: .fingerprintx-development/feedback-scratchpad.md               │
│                                                                             │
│  LOOP until VERIFIED or max_feedback_iterations:                            │
│                                                                             │
│    ┌──────────────┐                                                         │
│    │ Phase 8      │ ← Spawn capability-developer with scratchpad context    │
│    │ Implement    │   Include: review issues, test failures from prior iter │
│    └──────┬───────┘                                                         │
│           ▼                                                                 │
│    ┌──────────────┐                                                         │
│    │ Phase 10     │ ← Domain compliance check (BLOCKING)                    │
│    │ Compliance   │   If NOT_COMPLIANT → update scratchpad → next iteration │
│    └──────┬───────┘                                                         │
│           ▼ COMPLIANT                                                       │
│    ┌──────────────┐                                                         │
│    │ Phase 11     │ ← Code quality review (BLOCKING)                        │
│    │ Review       │   If REJECTED → update scratchpad → next iteration      │
│    └──────┬───────┘                                                         │
│           ▼ APPROVED                                                        │
│    ┌──────────────┐                                                         │
│    │ Phase 13     │ ← Run tests                                             │
│    │ Test         │   If FAIL → update scratchpad → next iteration          │
│    └──────┬───────┘                                                         │
│           ▼ PASS                                                            │
│                                                                             │
│    PLUGIN_VERIFIED ← Exit loop successfully                                 │
│                                                                             │
│  IF max reached without VERIFIED: Escalate to user                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Configuration

| Guard                             | Default | Purpose                                               |
| --------------------------------- | ------- | ----------------------------------------------------- |
| `max_feedback_iterations`         | 5       | Max full Implementation→Compliance→Review→Test cycles |
| `max_consecutive_review_failures` | 3       | Escalate if same review issue persists                |
| `max_consecutive_test_failures`   | 3       | Escalate if same test failure persists                |

---

## Fingerprintx Feedback Loop Phases

| Phase                 | Agent                | Check Type  | Pass Condition                 |
| --------------------- | -------------------- | ----------- | ------------------------------ |
| 8: Implementation     | capability-developer | Build       | `go build` passes              |
| 10: Domain Compliance | orchestrator         | P0 patterns | All mandatory patterns present |
| 11: Code Quality      | capability-reviewer  | Review      | APPROVED                       |
| 13: Testing           | capability-tester    | Tests       | All tests pass                 |

---

## Scratchpad Format

```markdown
# Feedback Scratchpad: {Protocol} Plugin

## Iteration 1

- **Phase 8 (Implementation)**: Initial implementation
- **Phase 10 (Compliance)**: NOT_COMPLIANT
  - Missing: Plugin not registered in plugins.go
  - Missing: Type constant not added
- **Next**: Address compliance issues

## Iteration 2

- **Phase 8 (Implementation)**: Added registration and type constant
- **Phase 10 (Compliance)**: COMPLIANT
- **Phase 11 (Review)**: REJECTED
  - Issue: Error handling doesn't match similar plugins
  - Issue: Missing timeout on connection
- **Next**: Fix review issues

## Iteration 3

- **Phase 8 (Implementation)**: Fixed error handling, added timeout
- **Phase 10 (Compliance)**: COMPLIANT
- **Phase 11 (Review)**: APPROVED
- **Phase 13 (Testing)**: FAIL
  - test_version_8_detection: Expected "8.0", got "5.7"
- **Next**: Fix version detection logic

## Iteration 4

- **Phase 8 (Implementation)**: Fixed version detection logic
- **Phase 10 (Compliance)**: COMPLIANT
- **Phase 11 (Review)**: APPROVED
- **Phase 13 (Testing)**: PASS (15/15 tests)
- **Result**: PLUGIN_VERIFIED ✅
```

---

## Error Context Injection

When re-spawning capability-developer after failure:

```markdown
## Prior Iteration Context

READ FIRST: .fingerprintx-development/feedback-scratchpad.md

### From Iteration {N-1}:

**Compliance Issues to Address:**

- Missing: Plugin registration in plugins.go
- Missing: Type constant in types.go

**Review Issues to Address:**

- Error handling doesn't match postgres plugin pattern
- Missing timeout on banner read

**Test Failures to Fix:**

- test_version_8_detection: Expected "8.0", got "5.7"

You MUST address these specific issues before proceeding.
```

---

## Consecutive Failure Detection

Track if SAME issue appears across iterations:

| Scenario                   | Action                          |
| -------------------------- | ------------------------------- |
| Same review issue 3x       | Escalate - may be architectural |
| Same test failure 3x       | Escalate - may need research    |
| Different issues each time | Continue - making progress      |

---

## Escalation Options

When max iterations reached, present via AskUserQuestion:

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Plugin development hit max feedback iterations. How should we proceed?",
      header: "Escalation",
      options: [
        { label: "Continue", description: "Add 3 more iterations" },
        {
          label: "Accept current state",
          description: "Proceed with known issues (document limitations)",
        },
        { label: "Review iteration history", description: "Show full scratchpad for analysis" },
        { label: "Abort", description: "Stop development, preserve artifacts" },
      ],
      multiSelect: false,
    },
  ],
});
```

---

## When to Use

| Scenario                   | Use Tight Feedback Loop? |
| -------------------------- | ------------------------ |
| New plugin implementation  | ✅ Yes                   |
| Bug fix to existing plugin | ❌ No - simpler flow     |
| Version detection addition | ✅ Yes                   |
| Port addition only         | ❌ No - too simple       |

---

## Related References

- [Phase 8: Implementation](phase-8-implementation.md) - Developer phase
- [Phase 10: Domain Compliance](phase-10-domain-compliance.md) - Compliance check
- [Phase 11: Code Quality](phase-11-code-quality.md) - Review phase
- [Phase 13: Testing](phase-13-testing.md) - Test phase
- [Delegation Templates](delegation-templates.md) - Agent prompts with scratchpad
