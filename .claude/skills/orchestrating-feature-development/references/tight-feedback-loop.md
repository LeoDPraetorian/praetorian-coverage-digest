# Tight Feedback Loop (Phases 6-8-10)

**Based on:** Ralph Wiggum technique - see [.claude/.output/research/LOOPING-TO-COMPLETION.md](../../../../.output/research/LOOPING-TO-COMPLETION.md)

**Key distinction from `iterating-to-completion`:**
- `iterating-to-completion` = INTRA-task (same agent loops on one task)
- This loop = INTER-phase (Implementation→Review→Test cycle across different agents)

The tight feedback loop wraps **Phases 6, 8, 10** in an automatic retry cycle when review or tests fail, injecting error context into subsequent iterations.

## Configuration

| Guard | Default | Purpose |
|-------|---------|---------|
| `max_feedback_iterations` | 5 | Max full Implementation→Review→Test cycles |
| `max_consecutive_review_failures` | 3 | Escalate if same review issue persists |
| `max_consecutive_test_failures` | 3 | Escalate if same test failure persists |

## Completion Promise

`IMPLEMENTATION_VERIFIED` - Signals the feedback loop completed successfully.

## Flow Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  TIGHT FEEDBACK LOOP                                                        │
│  Completion Promise: IMPLEMENTATION_VERIFIED                                │
│  Scratchpad: {OUTPUT_DIR}/feedback-scratchpad.md                            │
│                                                                             │
│  LOOP until IMPLEMENTATION_VERIFIED or max_feedback_iterations (5):         │
│                                                                             │
│    iteration += 1                                                           │
│                                                                             │
│    ┌──────────────┐                                                         │
│    │ Phase 6:     │ ← Spawn developer with scratchpad context               │
│    │ Implement    │   Include: review issues, test failures from prior iter │
│    └──────┬───────┘                                                         │
│           ▼                                                                 │
│    ┌──────────────┐                                                         │
│    │ Phase 8-S1:  │ ← Spec compliance check (BLOCKING)                      │
│    │ Review       │   If NOT_COMPLIANT → update scratchpad → next iteration │
│    └──────┬───────┘                                                         │
│           ▼ SPEC_COMPLIANT                                                  │
│    ┌──────────────┐                                                         │
│    │ Phase 10:    │ ← Run tests                                             │
│    │ Testing      │   If FAIL → update scratchpad → next iteration          │
│    └──────┬───────┘                                                         │
│           ▼ ALL_TESTS_PASSING                                               │
│                                                                             │
│    IMPLEMENTATION_VERIFIED ← Exit loop successfully                         │
│                                                                             │
│  END LOOP                                                                   │
│                                                                             │
│  IF max_feedback_iterations reached without IMPLEMENTATION_VERIFIED:        │
│    Escalate to user via AskUserQuestion                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Scratchpad Updates

After each failed iteration, update {OUTPUT_DIR}/feedback-scratchpad.md:

```markdown
## Iteration {N}
- **Implementation**: {what developer implemented}
- **Review Result**: PASS | FAIL - {issues if failed}
- **Test Result**: PASS | FAIL - {failures if failed}
- **Status**: continuing | IMPLEMENTATION_VERIFIED
```

## Error Context Injection

When re-spawning developer after review/test failure, include in prompt:

```markdown
## Prior Iteration Context

READ FIRST: {OUTPUT_DIRECTORY}/feedback-scratchpad.md

### From Iteration {N-1}:

**Review Issues to Address:**
- {issue 1 from reviewer}
- {issue 2 from reviewer}

**Test Failures to Fix:**
- {test failure 1}
- {test failure 2}

You MUST address these specific issues before proceeding.
```

## Escalation

Escalate to user via AskUserQuestion when:
- max_feedback_iterations (5) reached without IMPLEMENTATION_VERIFIED
- Same review issue appears 3+ times (max_consecutive_review_failures)
- Same test failure appears 3+ times (max_consecutive_test_failures)

Options to present:
1. 'Continue' - Add N more iterations
2. 'Accept current state' - Proceed with known issues (document in tech debt)
3. 'Review iteration history' - Show full scratchpad
4. 'Cancel feature' - Abort development

## Implementation Details

### Initialization

At start of Phase 6 (first iteration):
1. Create {OUTPUT_DIR}/feedback-scratchpad.md using [feedback-scratchpad-template.md](feedback-scratchpad-template.md)
2. Initialize iteration counter: `current_iteration = 1`
3. Initialize consecutive failure counters: `consecutive_review_failures = 0`, `consecutive_test_failures = 0`

### Loop Execution

For each iteration (1 through max_feedback_iterations):

1. **Phase 6: Implementation**
   - Spawn developer agent with scratchpad context if iteration > 1
   - Developer implements/fixes based on prior iteration feedback
   - Output code changes

2. **Phase 8-S1: Review Gate**
   - Spawn reviewer agent (spec compliance check)
   - If NOT_COMPLIANT:
     - Extract review issues
     - Update scratchpad with review failures
     - Increment consecutive_review_failures counter
     - Check if consecutive_review_failures >= 3 → Escalate
     - Continue to next iteration (skip Phase 10)
   - If SPEC_COMPLIANT:
     - Reset consecutive_review_failures = 0
     - Continue to Phase 10

3. **Phase 10: Testing**
   - Spawn tester agent
   - If tests FAIL:
     - Extract test failures
     - Update scratchpad with test failures
     - Increment consecutive_test_failures counter
     - Check if consecutive_test_failures >= 3 → Escalate
     - Continue to next iteration
   - If tests PASS:
     - Reset consecutive_test_failures = 0
     - Set IMPLEMENTATION_VERIFIED
     - Exit loop successfully

4. **Scratchpad Update**
   - After each iteration, append results to feedback-scratchpad.md
   - Track: implementation summary, review result, test result, status

5. **Iteration Limit Check**
   - If iteration == max_feedback_iterations and NOT IMPLEMENTATION_VERIFIED:
     - Escalate to user

### Progress Persistence

Update {OUTPUT_DIR}/progress.json after each iteration:

```json
{
  "feedback_loop": {
    "enabled": true,
    "current_iteration": 2,
    "max_iterations": 5,
    "status": "in_progress | IMPLEMENTATION_VERIFIED | escalated",
    "consecutive_review_failures": 0,
    "consecutive_test_failures": 1,
    "iterations": [
      {
        "number": 1,
        "implementation": "Created FilterDropdown component",
        "review_result": "PASS",
        "test_result": "FAIL",
        "test_failures": ["FilterDropdown.test.tsx:45 - missing mock"]
      },
      {
        "number": 2,
        "implementation": "Fixed test mock issue",
        "review_result": "PASS",
        "test_result": "PASS",
        "status": "IMPLEMENTATION_VERIFIED"
      }
    ]
  }
}
```

## Related Skills

| Skill | Relationship |
|-------|--------------|
| `iterating-to-completion` | INTRA-task loops (this uses INTER-phase loops) |
| `persisting-progress-across-sessions` | Progress persistence pattern |

## Research References

- [.claude/.output/research/LOOPING-TO-COMPLETION.md](../../../../.output/research/LOOPING-TO-COMPLETION.md) - Project overview
- [.claude/.output/research/ralph-wiggum-analysis.md](../../../../.output/research/ralph-wiggum-analysis.md) - Pattern analysis
- [.claude/.output/research/ralph-integration-guide.md](../../../../.output/research/ralph-integration-guide.md) - Integration guide

## Pattern Compliance

This implements patterns from [MULTI-AGENT-ORCHESTRATION-ARCHITECTURE.md](../../../../docs/MULTI-AGENT-ORCHESTRATION-ARCHITECTURE.md):
- 11.1 Completion Promise (IMPLEMENTATION_VERIFIED)
- 11.2 Agent Scratchpad (feedback-scratchpad.md)
- 11.3 Iteration Safety Guards (max_feedback_iterations, consecutive failure limits)
- 11.5 Tight Feedback Loop (Implementation→Review→Test cycle)
- 11.6 Error History Injection (review issues, test failures in prompts)
