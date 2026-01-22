# Tight Feedback Loop

**Key distinction from `iterating-to-completion`:**

- `iterating-to-completion` = INTRA-task (same agent loops on one task)
- Tight feedback loop = INTER-phase (Implementation→Review→Test cycle across different agents)

## Pattern Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  TIGHT FEEDBACK LOOP                                                        │
│  Completion Promise: [PHASE]_VERIFIED (e.g., IMPLEMENTATION_VERIFIED)       │
│  Scratchpad: {OUTPUT_DIR}/feedback-scratchpad.md                            │
│                                                                             │
│  LOOP until VERIFIED or max_feedback_iterations:                            │
│                                                                             │
│    ┌──────────────┐                                                         │
│    │ Implement    │ ← Spawn developer with scratchpad context               │
│    │              │   Include: review issues, test failures from prior iter │
│    └──────┬───────┘                                                         │
│           ▼                                                                 │
│    ┌──────────────┐                                                         │
│    │ Review       │ ← Spec compliance check (BLOCKING)                      │
│    │              │   If NOT_COMPLIANT → update scratchpad → next iteration │
│    └──────┬───────┘                                                         │
│           ▼ COMPLIANT                                                       │
│    ┌──────────────┐                                                         │
│    │ Test         │ ← Run tests                                             │
│    │              │   If FAIL → update scratchpad → next iteration          │
│    └──────┬───────┘                                                         │
│           ▼ PASS                                                            │
│                                                                             │
│    [PHASE]_VERIFIED ← Exit loop successfully                                │
│                                                                             │
│  IF max reached without VERIFIED: Escalate to user                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Configuration (Defaults)

| Guard                             | Config Path                                   | Default | Purpose                                    |
| --------------------------------- | --------------------------------------------- | ------- | ------------------------------------------ |
| `max_feedback_iterations`         | `inter_phase.max_feedback_iterations`         | 5       | Max full Implementation→Review→Test cycles |
| `max_consecutive_review_failures` | `inter_phase.max_consecutive_review_failures` | 3       | Escalate if same review issue persists     |
| `max_consecutive_test_failures`   | `inter_phase.max_consecutive_test_failures`   | 3       | Escalate if same test failure persists     |

> **Source**: Values from `inter_phase` section of `.claude/config/orchestration-limits.yaml`
>
> **Scope**: INTER-phase feedback loops (multiple agents cycling). For INTRA-task iteration (same agent loops), see `iterating-to-completion` skill which uses `intra_task` section.

## Key Elements

### 1. Completion Promise

- A clear signal that the loop completed successfully
- Examples: `IMPLEMENTATION_VERIFIED`, `TESTS_PASSING`, `REVIEW_APPROVED`
- Loop exits ONLY when promise is achieved OR max iterations exceeded

### 2. Scratchpad

- Persistent file tracking iteration history
- Updated after each iteration with: what was done, review result, test result
- Passed to subsequent iterations as context

### 3. Error Context Injection

When re-spawning agent after failure, include prior iteration context:

```markdown
## Prior Iteration Context

READ FIRST: {OUTPUT_DIRECTORY}/feedback-scratchpad.md

### From Iteration {N-1}:

**Review Issues to Address:** [list]
**Test Failures to Fix:** [list]

You MUST address these specific issues before proceeding.
```

### 4. Consecutive Failure Detection

- Track if SAME issue appears multiple iterations
- Escalate after N consecutive failures (default: 3)
- Prevents infinite loops on unfixable issues

### 5. Escalation Options

When max iterations reached, present via AskUserQuestion:

- 'Continue' - Add N more iterations
- 'Accept current state' - Proceed with known issues
- 'Review iteration history' - Show full scratchpad
- 'Cancel' - Abort

## When to Use

| Scenario                                       | Use Tight Feedback Loop?       |
| ---------------------------------------------- | ------------------------------ |
| Implementation that must pass review AND tests | ✅ Yes                         |
| Single-pass validation                         | ❌ No - use Gated Verification |
| Exploratory work without clear pass/fail       | ❌ No                          |
| Critical path that can't proceed with issues   | ✅ Yes                         |

## Customization Points

Orchestration skills customize:

- Which phases are in the loop (e.g., Phase 6→8→10)
- Specific completion promise name
- Guard values (stricter or looser)
- Scratchpad location and format

## Implementation Example

```typescript
let iteration = 0;
let verified = false;
const maxIterations = 5;
const scratchpad = `${OUTPUT_DIR}/feedback-scratchpad.md`;

while (!verified && iteration < maxIterations) {
  iteration++;

  // 1. Implementation
  const implResult = await Task(
    "developer",
    `
    Implement feature X.
    ${iteration > 1 ? `READ FIRST: ${scratchpad}` : ""}
  `
  );

  // 2. Review (BLOCKING)
  const reviewResult = await Task(
    "reviewer",
    `
    Verify spec compliance for implementation.
    Return: COMPLIANT | NOT_COMPLIANT
  `
  );

  if (reviewResult.verdict === "NOT_COMPLIANT") {
    await updateScratchpad(scratchpad, {
      iteration,
      reviewIssues: reviewResult.issues,
    });
    continue; // Next iteration
  }

  // 3. Test
  const testResult = await runTests();

  if (testResult.status === "FAIL") {
    await updateScratchpad(scratchpad, {
      iteration,
      testFailures: testResult.failures,
    });
    continue; // Next iteration
  }

  verified = true; // Exit loop
}

if (!verified) {
  await escalateToUser();
}
```

## Scratchpad Format

```markdown
# Feedback Scratchpad: {Feature Name}

## Iteration 1

- **Completed**: Initial implementation
- **Review**: NOT_COMPLIANT
  - Missing error handling for null input
  - Incorrect return type
- **Next**: Address review issues

## Iteration 2

- **Completed**: Added error handling, fixed return type
- **Review**: COMPLIANT
- **Test**: FAIL
  - test_null_input: AssertionError at line 45
- **Next**: Fix test failure

## Iteration 3

- **Completed**: Fixed null input handling
- **Review**: COMPLIANT
- **Test**: PASS
- **Result**: IMPLEMENTATION_VERIFIED ✅
```

## Based On

[Ralph Wiggum Technique](https://awesomeclaude.ai/ralph-wiggum) - Iterative refinement with explicit completion criteria.
