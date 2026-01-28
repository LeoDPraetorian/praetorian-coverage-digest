---
name: iterating-to-completion
description: Use when task needs repeated attempts - loop-until-done with completion promises, scratchpad, safety guards, loop detection
allowed-tools: Task, TodoWrite, Read, Write, Edit, Bash, AskUserQuestion
---

# Iterating to Completion

**Execute a task in a loop until completion criteria met or safety limits exceeded.**

Based on the [Ralph Wiggum technique](https://awesomeclaude.ai/ralph-wiggum) by Geoffrey Huntley and [ralph-orchestrator](https://github.com/mikeyobrien/ralph-orchestrator) by Mike O'Brien.

**Core philosophy**: "Iteration trumps perfection" - deterministic failures are predictable and informative.

## When to Use

Use this skill when:

- Implementation task may need multiple attempts
- Test-fix cycles (test → fix → test)
- Research tasks with accumulating results
- Validation with unknown number of iterations
- Any task with clear completion criteria but uncertain path

## When NOT to Use

Do NOT use this skill for:

- Multi-phase orchestration (use full orchestration skills)
- Simple single-action tasks (one-shot is fine)
- Tasks requiring human decision at each step
- Multi-agent handoffs (use `persisting-agent-outputs`)

**Key distinction**: This skill handles **INTRA-task** iteration (same agent loops). For **INTER-agent** coordination, use `persisting-agent-outputs` and `orchestrating-multi-agent-workflows`.

## Quick Reference

| Parameter                 | Config Path                           | Default         | Description                        |
| ------------------------- | ------------------------------------- | --------------- | ---------------------------------- |
| `completion_promise`      | -                                     | `TASK_COMPLETE` | String that signals task is done   |
| `max_iterations`          | `intra_task.max_iterations`           | 10              | Hard stop after N iterations       |
| `max_runtime_minutes`     | `intra_task.max_runtime_minutes`      | 15              | Hard stop after N minutes          |
| `consecutive_error_limit` | `intra_task.consecutive_error_limit`  | 3               | Stop after N consecutive errors    |
| `loop_threshold`          | `intra_task.loop_detection_threshold` | 3               | Consecutive similar outputs = loop |

## Configuration

This skill uses the `intra_task` section of `.claude/config/orchestration-limits.yaml`.

**Scope**: INTRA-task iteration (same agent loops on ONE task)

To override defaults for a specific workflow, pass custom values when initializing the loop. Config file values are defaults, not hard requirements.

## The Loop Protocol

### 1. Initialize

```markdown
## Before starting loop:

1. Define completion_promise (explicit success signal)
2. Set safety guard limits (or use defaults)
3. Create scratchpad file
4. Set iteration = 0
```

### 2. Execute Loop

```
WHILE iteration < max_iterations AND runtime < max_runtime:
    iteration += 1

    1. Read scratchpad for context from previous iterations

    2. Execute task with:
       - Original task description
       - Context from scratchpad
       - Error history (what to avoid)
       - COMPLETION PROMISE instruction

    3. Check completion:
       IF completion_promise IN output → SUCCESS, exit loop

    4. Update scratchpad:
       - What was accomplished
       - Errors encountered
       - What to try next

    5. Check safety guards:
       IF loop_detected → BREAK, escalate
       IF consecutive_errors >= limit → BREAK, escalate

    6. Continue to next iteration
```

### 3. Handle Completion

| Outcome                  | Action                           |
| ------------------------ | -------------------------------- |
| Completion promise found | Return success with final output |
| max_iterations exceeded  | Escalate via AskUserQuestion     |
| max_runtime exceeded     | Escalate via AskUserQuestion     |
| Loop detected            | Escalate via AskUserQuestion     |
| Consecutive errors       | Escalate via AskUserQuestion     |

## Completion Promise

A **completion promise** is an explicit string the agent outputs to signal task completion.

**Default**: `TASK_COMPLETE`

**Custom examples**:

| Task Type      | Completion Promise                                   |
| -------------- | ---------------------------------------------------- |
| Test fixing    | `ALL_TESTS_PASSING`                                  |
| Research       | `RESEARCH_COMPLETE` or `RESEARCH_COMPLETE_3_MARKERS` |
| Validation     | `VALIDATION_PASSED`                                  |
| Build fix      | `BUILD_SUCCEEDED`                                    |
| Implementation | `IMPLEMENTATION_COMPLETE`                            |

**Agent instruction**:

```markdown
When the task is complete, output this exact string: {completion_promise}

This signals to the orchestrator that the loop can end.
```

**Detection**: Simple string matching - if `completion_promise` appears anywhere in the agent output, the task is complete.

## Scratchpad

The scratchpad provides cross-iteration context so the agent doesn't lose progress.

**Location priority**:

1. `{feature_directory}/scratchpad-{task-slug}.md` (if in orchestrated workflow)
2. `.claude/.output/scratchpad-{timestamp}-{slug}.md` (standalone)

**See**: [references/scratchpad-template.md](references/scratchpad-template.md) for copy-paste template.

**Update after each iteration**:

```markdown
## Iteration {N}

- **Status**: in_progress | progressing | blocked
- **Accomplished**: [what was done this iteration]
- **Errors encountered**: [errors to avoid next iteration]
- **Next steps**: [what to try next]
```

**Critical rule**: Agent MUST read scratchpad at start of each iteration. Do NOT start fresh - build on previous progress.

## Safety Guards

Prevent runaway loops with configurable limits.

| Guard                   | Default | Purpose              | Override When                        |
| ----------------------- | ------- | -------------------- | ------------------------------------ |
| max_iterations          | 10      | Hard stop            | Complex tasks needing more attempts  |
| max_runtime_minutes     | 15      | Time limit           | Research tasks, complex validation   |
| consecutive_error_limit | 3       | Error threshold      | Flaky tests, network-dependent tasks |
| loop_threshold          | 3       | Similar output count | N/A - keep at 3                      |

> **Source**: Values from `intra_task` section of `.claude/config/orchestration-limits.yaml`

**See**: [references/safety-guards.md](references/safety-guards.md) for configuration details.

## Loop Detection

Detect when agent is stuck producing similar outputs.

**Algorithm**:

1. After each iteration, extract "primary action" or "main error" from output
2. Compare to previous iteration signatures
3. If same signature appears 3+ times consecutively → LOOP DETECTED

**Signature extraction**:

- Test output: Extract failing test name + error type
- Implementation: Extract file being modified + action taken
- Research: Extract search query + sources checked

**Example loop detection**:

```
Iteration 5: "Fixed auth.ts - TypeError null check"
Iteration 6: "Fixed auth.ts - TypeError null check"  ← Same as 5
Iteration 7: "Fixed auth.ts - TypeError null check"  ← Same as 5,6 → LOOP DETECTED
```

**See**: [references/loop-detection.md](references/loop-detection.md) for detailed algorithm.

## Error History

Track errors across iterations to prevent repetition.

**Inject into agent prompt**:

```markdown
## Recent Errors to Avoid

- Iteration 2: TypeError at line 45 - null check missing
- Iteration 4: Test timeout - async/await issue
- Iteration 5: Build failed - missing import
```

**Maintain**: Last 5 errors (sliding window)

**Purpose**: Helps agent avoid repeating same mistakes. If error history shows "null check missing" 3 times, agent should try different approach.

## Escalation Protocol

When safety limits exceeded, escalate to user with options.

**Template**:

```typescript
AskUserQuestion({
  questions: [
    {
      question: "{what happened}. How to proceed?",
      header: "Loop Limit",
      options: [
        { label: "Continue", description: "Add {N} more iterations" },
        { label: "Accept current", description: "Stop with partial completion" },
        { label: "Review", description: "Show iteration history and errors" },
        { label: "Cancel", description: "Abandon task" },
      ],
    },
  ],
});
```

**See**: [references/escalation-options.md](references/escalation-options.md) for per-scenario templates.

## Integration

### Called By

- Orchestration skills (`orchestrating-capability-development`, `orchestrating-nerva-development`)
- Main conversation when task needs iteration

### Requires (invoke before starting)

| Skill                      | When                        | Purpose                              |
| -------------------------- | --------------------------- | ------------------------------------ |
| `persisting-agent-outputs` | If in orchestrated workflow | Get feature_directory for scratchpad |

### Calls (during execution)

| Skill | Phase | Purpose                       |
| ----- | ----- | ----------------------------- |
| None  | -     | Self-contained loop execution |

### Pairs With (conditional)

| Skill                         | Trigger              | Purpose                               |
| ----------------------------- | -------------------- | ------------------------------------- |
| `debugging-systematically`    | When stuck           | Root cause analysis before continuing |
| `verifying-before-completion` | Before claiming done | Ensure completion promise is valid    |

## Example: Test-Fix Loop

**Setup**:

```markdown
completion_promise: ALL_TESTS_PASSING
max_iterations: 5
scratchpad: .claude/.output/scratchpad-fix-auth-tests.md
```

**Execution**:

```
Iteration 1:
  - Read: scratchpad empty (first iteration)
  - Run: npm test
  - Output: "3 tests failing - auth.test.ts"
  - Update scratchpad: "3 failing: login, logout, refresh"
  - No completion promise → continue

Iteration 2:
  - Read: scratchpad shows 3 failing tests
  - Fix: login test (missing mock)
  - Run: npm test
  - Output: "2 tests failing"
  - Update scratchpad: "Fixed login. 2 remaining: logout, refresh"
  - No completion promise → continue

Iteration 3:
  - Read: scratchpad shows 2 failing
  - Fix: logout and refresh tests
  - Run: npm test
  - Output: "ALL_TESTS_PASSING - 15 tests passed"
  - Completion promise found → SUCCESS
```

**Escalation** (if limit reached):

```
"Test loop reached 5 iterations. 2 tests still failing.
Options: [Continue 3 more] [Accept 13/15 passing] [Review failures] [Cancel]"
```

## Rationalization Prevention

**Watch for these thoughts - they indicate rationalization:**

| Thought                                   | Reality                                        | Counter                                         |
| ----------------------------------------- | ---------------------------------------------- | ----------------------------------------------- |
| "No time for scratchpad"                  | Scratchpad prevents repeated work - saves time | 30 seconds now saves minutes of repeated errors |
| "Just one more quick retry"               | Without guards, "one more" becomes infinite    | Always use this skill for >1 retry              |
| "This is simple, don't need overhead"     | Simple tasks become complex when they fail     | If it needs iteration, use the full pattern     |
| "Already spent N iterations, just finish" | Sunk cost doesn't justify unsafe continuation  | Escalate, don't rationalize                     |
| "Senior says skip the process"            | Authority doesn't override safety guards       | Process exists because shortcuts fail           |
| "I'll track errors mentally"              | Mental tracking fails across iterations        | Scratchpad is mandatory, not optional           |

**Mandatory even when:**

- Under time pressure
- Task seems simple
- You're confident it will work next try
- You've "almost" got it working

## Anti-Patterns

| Anti-Pattern               | Why It's Wrong             | Correct Approach              |
| -------------------------- | -------------------------- | ----------------------------- |
| Using for simple tasks     | Overhead not worth it      | One-shot execution            |
| No completion promise      | Loop never knows when done | Always define explicit signal |
| Ignoring scratchpad        | Agent repeats same work    | Read context every iteration  |
| No max_iterations          | Infinite loop risk         | Always set limit              |
| Skipping error history     | Same errors repeat         | Track and inject errors       |
| Loop without safety guards | Runaway cost/time          | All guards mandatory          |

## Related Skills

| Skill                                 | Relationship                                        |
| ------------------------------------- | --------------------------------------------------- |
| `persisting-agent-outputs`            | INTER-agent handoffs (this skill is INTRA-task)     |
| `persisting-progress-across-sessions` | Cross-session state (this skill is same-session)    |
| `orchestrating-multi-agent-workflows` | Agent routing (this skill handles iteration within) |
| `debugging-systematically`            | Use when loop is stuck to find root cause           |
| `verifying-before-completion`         | Use before claiming completion promise valid        |

## References

- [Scratchpad Template](references/scratchpad-template.md) - Copy-paste template
- [Safety Guards](references/safety-guards.md) - Configuration details
- [Loop Detection](references/loop-detection.md) - Algorithm details
- [Escalation Options](references/escalation-options.md) - Per-scenario templates

## Attribution

Based on:

- [Ralph Wiggum technique](https://awesomeclaude.ai/ralph-wiggum) by Geoffrey Huntley
- [ralph-orchestrator](https://github.com/mikeyobrien/ralph-orchestrator) by Mike O'Brien (920+ tests, production-proven)

Key patterns adapted: completion promise, agent scratchpad, safety guards, loop detection.
