# Escalation Options

AskUserQuestion templates for when safety limits are exceeded.

## Overview

When any safety guard triggers, the loop must escalate to the user. This file provides templates for each scenario.

## General Structure

All escalations follow this pattern:

```typescript
AskUserQuestion({
  questions: [
    {
      question: "{situation}. How would you like to proceed?",
      header: "{guard type}",
      multiSelect: false,
      options: [
        { label: "Continue", description: "{what continue means}" },
        { label: "Accept current", description: "Stop with current progress" },
        { label: "Review", description: "See iteration details" },
        { label: "Cancel", description: "Abandon task" },
      ],
    },
  ],
});
```

## Per-Guard Templates

### max_iterations Exceeded

```typescript
AskUserQuestion({
  questions: [
    {
      question: `Iteration limit (${max}) reached. Current status: ${summary}. How to proceed?`,
      header: "Iteration Limit",
      multiSelect: false,
      options: [
        {
          label: "Continue +5",
          description: "Add 5 more iterations with same approach",
        },
        {
          label: "Continue +5 (new approach)",
          description: "Reset and try different strategy",
        },
        {
          label: "Accept current",
          description: `Proceed with current state: ${currentState}`,
        },
        {
          label: "Cancel",
          description: "Abandon task entirely",
        },
      ],
    },
  ],
});
```

**Example filled in**:

```typescript
AskUserQuestion({
  questions: [
    {
      question:
        "Iteration limit (10) reached. Current status: 2 of 5 tests still failing. How to proceed?",
      header: "Iteration Limit",
      multiSelect: false,
      options: [
        { label: "Continue +5", description: "Add 5 more iterations with same approach" },
        { label: "Continue +5 (new approach)", description: "Reset and try different strategy" },
        { label: "Accept current", description: "Proceed with 3/5 tests passing" },
        { label: "Cancel", description: "Abandon task entirely" },
      ],
    },
  ],
});
```

### max_runtime Exceeded

```typescript
AskUserQuestion({
  questions: [
    {
      question: `Runtime limit (${max}min) exceeded after ${iterations} iterations. ${summary}. How to proceed?`,
      header: "Runtime Limit",
      multiSelect: false,
      options: [
        {
          label: "Continue +10min",
          description: "Extend time limit by 10 minutes",
        },
        {
          label: "Checkpoint & pause",
          description: "Save progress, can resume later",
        },
        {
          label: "Accept current",
          description: `Proceed with current state: ${currentState}`,
        },
        {
          label: "Cancel",
          description: "Abandon task entirely",
        },
      ],
    },
  ],
});
```

### Loop Detected

```typescript
AskUserQuestion({
  questions: [
    {
      question: `Loop detected - same output pattern repeated ${count} times: "${signature}". How to proceed?`,
      header: "Loop Detected",
      multiSelect: false,
      options: [
        {
          label: "Try different approach",
          description: "Continue with explicit instruction to change strategy",
        },
        {
          label: "Debug first",
          description: "Invoke debugging-systematically to find root cause",
        },
        {
          label: "Accept current",
          description: `Proceed with current state: ${currentState}`,
        },
        {
          label: "Cancel",
          description: "Abandon task entirely",
        },
      ],
    },
  ],
});
```

**Example filled in**:

```typescript
AskUserQuestion({
  questions: [
    {
      question:
        'Loop detected - same output pattern repeated 3 times: "error:TypeError-null-auth.ts". How to proceed?',
      header: "Loop Detected",
      multiSelect: false,
      options: [
        {
          label: "Try different approach",
          description: "Continue with explicit instruction to change strategy",
        },
        { label: "Debug first", description: "Invoke debugging-systematically to find root cause" },
        { label: "Accept current", description: "Proceed with partial implementation" },
        { label: "Cancel", description: "Abandon task entirely" },
      ],
    },
  ],
});
```

### Consecutive Errors

```typescript
AskUserQuestion({
  questions: [
    {
      question: `${count} consecutive errors occurred. Last error: "${lastError}". How to proceed?`,
      header: "Error Threshold",
      multiSelect: false,
      options: [
        {
          label: "Retry with context",
          description: "Continue with error history context added",
        },
        {
          label: "Debug first",
          description: "Invoke debugging-systematically to investigate",
        },
        {
          label: "Skip and continue",
          description: "Mark as known issue, proceed with rest of task",
        },
        {
          label: "Cancel",
          description: "Abandon task entirely",
        },
      ],
    },
  ],
});
```

## Context to Include

Every escalation should include:

| Context               | What to Include                      |
| --------------------- | ------------------------------------ |
| **Current iteration** | N of max                             |
| **Runtime**           | X of max minutes                     |
| **Progress summary**  | What's done vs remaining             |
| **Last output**       | Brief summary of most recent attempt |
| **Error history**     | Last 2-3 errors if applicable        |

## Post-Escalation Actions

Based on user choice:

### "Continue" Variants

```markdown
IF user selects "Continue":

1. Reset relevant counter (iterations, errors, or runtime)
2. Update scratchpad with escalation context
3. Add explicit instruction based on variant:
   - "+5 same approach": No change to strategy
   - "+5 new approach": Add "Try a different approach than previous iterations"
   - "+10min": Just extend time
4. Resume loop
```

### "Accept current"

```markdown
IF user selects "Accept current":

1. Stop loop immediately
2. Return current state as result
3. Document in scratchpad that task ended with partial completion
4. Include warning in output: "Task completed with partial results due to {guard}"
```

### "Debug first"

```markdown
IF user selects "Debug first":

1. Stop loop
2. Invoke: Skill("debugging-systematically")
3. After debugging returns:
   - If root cause found: Resume loop with fix
   - If no fix: Re-escalate with debugging findings
```

### "Review"

```markdown
IF user selects "Review":

1. Display iteration history from scratchpad
2. Show error history
3. Show signatures for loop detection
4. Re-ask the same question after review
```

### "Cancel"

```markdown
IF user selects "Cancel":

1. Stop loop immediately
2. Document cancellation in scratchpad
3. Return with status: "cancelled"
4. Clean up any partial state if needed
```

## Example Full Escalation Flow

```markdown
## Scenario: Test fixing loop hits iteration limit

Iteration 8 of 10 completes:

- Status: 2 tests still failing
- Signature matches iteration 6 and 7 (potential loop)
- No completion promise found

Iteration 9:

- Check max_iterations: 9 < 10 ✓
- Execute iteration
- Status: 2 tests still failing (same as 8)
- Signature matches 7, 8 (loop threshold reached)
- LOOP DETECTED → Escalate

AskUserQuestion:
"Loop detected - same output pattern repeated 3 times:
'test-fail:2-auth,logout'. How to proceed?"

Options:

1. Try different approach
2. Debug first
3. Accept current (3/5 tests passing)
4. Cancel

User selects: "Debug first"

Action:

1. Stop loop
2. Invoke debugging-systematically
3. Debugging finds: missing mock for external service
4. Resume loop with fix applied
5. Iteration 10: ALL_TESTS_PASSING → Success
```
