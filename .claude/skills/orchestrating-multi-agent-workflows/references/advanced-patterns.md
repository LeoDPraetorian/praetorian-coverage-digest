# Advanced Orchestration Patterns

Specialized patterns for complex scenarios: context management, isolation, handoffs, conditional triggers, and security gates.

## Context Compaction

Long orchestrations accumulate context that degrades model performance. From Anthropic research: 'Token usage alone explains 80% of performance variance.'

### When to Compact

| Trigger                      | Action                 |
| ---------------------------- | ---------------------- |
| After 40+ messages           | Mandatory compaction   |
| After each major phase       | Recommended compaction |
| Before synthesis/final phase | Mandatory compaction   |
| Context feels 'sluggish'     | Check message count    |

### Compaction Protocol

1. **Invoke skill**: Read `persisting-progress-across-sessions` compaction protocol
2. **Write to files**: Full phase details → progress/output files
3. **Replace inline**: Content → file references
4. **Verify**: Context contains only summaries (< 200 tokens per phase)

### Compaction Gate Pattern

At major phase transitions, orchestrations should add blocking gates:

```markdown
### Phase X → Phase Y Transition: Compaction Gate

**BLOCKING GATE: Context Compaction Required**

Before proceeding, verify:

- [ ] Phase X details written to progress file
- [ ] Context contains only summary
- [ ] File references used, not inline content

Skip requires explicit user approval via AskUserQuestion with risk disclosure.
```

Source: [Anthropic Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

## Git Worktrees for Isolation

Isolated git worktrees prevent file conflicts between parallel orchestrations and provide clean rollback points.

### When to Use Worktrees

| Scenario                                     | Use Worktree? | Why                                 |
| -------------------------------------------- | ------------- | ----------------------------------- |
| Full feature orchestration (5+ phases)       | ✅ Yes        | Long-running, needs rollback option |
| Parallel agent execution touching many files | ✅ Yes        | Prevents cross-agent conflicts      |
| Quick bug fix (1-2 agents)                   | ❌ No         | Overhead not justified              |
| Research/exploration only                    | ❌ No         | No file modifications               |

### Benefits

1. **Isolation**: Each feature gets independent workspace
2. **Rollback**: Pre-feature commit recorded for emergency abort
3. **Parallel safety**: Multiple orchestrations can run simultaneously
4. **Clean baseline**: Tests verified passing before work begins

### Integration

**Library skill**: Read and follow `.claude/skill-library/workflow/using-git-worktrees/SKILL.md`

The library skill handles:

- Directory selection (.worktrees/ vs worktrees/ vs global)
- .gitignore verification (prevents accidental commits)
- Project setup (npm install, go mod download, etc.)
- Baseline test verification

**Progress tracking**: Record worktree info in MANIFEST.yaml:

```yaml
worktree:
  path: ".worktrees/{feature-name}"
  pre_feature_commit: "{commit-sha}"
  created_at: "{timestamp}"
```

### Cleanup

Worktree cleanup handled by `finishing-a-development-branch` skill after merge/abort.

Source: Anthropic context parallelism research, obra/superpowers

## Workflow Handoff Protocol

Prevent orphaned workflows when skills invoke sub-workflows.

### Problem

When orchestration skill A invokes sub-skill B, skill B may complete without returning control to A. The parent workflow is orphaned with pending todos.

### Detection

Before completing ANY orchestration, check for parent workflow:

```
1. Read current TodoWrite items
2. Look for 'Orchestration:' prefix indicating parent workflow
3. If found AND has pending items → This is a sub-workflow
```

### Protocol

**If sub-workflow detected:**

1. Do NOT mark yourself complete independently
2. Return structured handoff to parent:
   ```json
   {
     "status": "sub_workflow_complete",
     "parent_phase": "Phase 3: Research",
     "artifacts": ["research-output.md"],
     "next_action": "Parent should mark Phase 3 complete"
   }
   ```
3. Parent workflow continues from its phase

**If standalone workflow:**

1. Mark complete normally
2. No handoff needed

### Example

```
Parent: orchestrating-feature-development
  TodoWrite: 'Orchestration: User Dashboard - Phase 3: Discovery [in_progress]'

  Invokes: orchestrating-research for 'dashboard API patterns'

  Child completes research, detects parent workflow exists
  Child returns: { status: 'sub_workflow_complete', parent_phase: 'Phase 3' }

  Parent receives result, marks Phase 3 complete, continues to Phase 4
```

### Why This Matters

Without handoff protocol, the research skill might complete and the conversation ends, leaving the feature development workflow abandoned at Phase 3.

## Conditional Sub-Skill Triggers

Invoke supporting skills when complexity thresholds are met.

### Complexity-Based Triggers

| Condition                    | Trigger Skill                         | Purpose                                     |
| ---------------------------- | ------------------------------------- | ------------------------------------------- |
| 3+ independent tasks in plan | `developing-with-subagents`           | Same-session parallel execution with review |
| 5+ total tasks               | `persisting-progress-across-sessions` | Cross-session resume capability             |
| 3+ independent failures      | `dispatching-parallel-agents`         | Parallel debugging                          |
| Estimated duration >30 min   | `persisting-progress-across-sessions` | Progress checkpoints                        |

### Measuring Conditions

- **Task count**: Count items in decomposition/plan phase
- **Independence**: Can tasks run without shared state?
- **Failure count**: Track in feedback loop iterations
- **Duration estimate**: agent_count × 8 minutes average

### Integration Protocol

When condition met:

1. Note trigger reason in TodoWrite
2. Invoke conditional skill via Skill tool
3. Follow that skill's protocol completely
4. Return to main workflow when skill completes

### Example

```
Plan has 6 tasks, 4 are independent.

Triggers:
- 5+ tasks → invoke persisting-progress-across-sessions
- 3+ independent → invoke developing-with-subagents

TodoWrite: 'Invoking developing-with-subagents (4 independent tasks detected)'
Skill('developing-with-subagents')
```

## Security Patterns

Conditional security gates based on feature type.

### When to Add Security Gate

| Feature Type                 | Security Gate Required |
| ---------------------------- | ---------------------- |
| Authentication/Authorization | ✅ Mandatory           |
| User input handling          | ✅ Mandatory           |
| API endpoints (external)     | ✅ Mandatory           |
| File uploads                 | ✅ Mandatory           |
| Secrets/credentials handling | ✅ Mandatory           |
| Internal refactoring only    | ❌ Optional            |
| UI-only changes (no data)    | ❌ Optional            |

### Security Gate Protocol

When security gate required:

1. **After implementation**: Spawn security reviewer (domain-appropriate: frontend-security, backend-security)
2. **Before merge**: Run secret scanner
3. **Blocking**: Do not proceed to completion without security approval

### Security Review Prompt Addition

```markdown
SECURITY FOCUS:

- Check for: injection, XSS, auth bypass, secrets exposure, OWASP Top 10
- Verify: input validation, output encoding, access controls
- Return: SECURE | ISSUES_FOUND with specific findings
```

## Metrics Tracking

Track orchestration metrics for visibility into cost, performance, and patterns.

### Metrics Schema

Include in MANIFEST.yaml:

```yaml
metrics:
  orchestration:
    total_agents_spawned: 7
    parallel_executions: 3
    sequential_executions: 4
  validation_loops:
    spec_compliance_iterations: 2
    code_quality_iterations: 1
    test_validation_iterations: 1
  escalations:
    to_user: 1
    reasons:
      - "code_review_failed_after_retry"
  conflicts:
    detected: 0
    resolved: 0
    unresolved: 0
  phase_durations:
      "architecture": "PT5M",
      "implementation": "PT12M"
    },
    "tokens": {
      "estimated_total": 170000,
      "by_phase": {
        "architecture": 35000,
        "implementation": 50000
      }
    },
    "cost": {
      "estimated_usd": 2.85,
      "note": "Based on Sonnet pricing"
    }
  }
}
```

### When to Update

- After each phase completion: Update phase_durations, increment agents_spawned
- After validation retry: Increment validation_loops counters
- After user escalation: Add to escalations.reasons
- After parallel execution: Update orchestration.parallel_executions
- After conflict detected: Increment conflicts counters

### Token Estimation

Since exact counts unavailable, use estimates:

| Content Type                | Estimated Tokens |
| --------------------------- | ---------------- |
| Agent prompt (with context) | 2,000-4,000      |
| Agent response (typical)    | 1,500-3,000      |
| File read (per 100 lines)   | ~400             |

Source: ralph-orchestrator metrics patterns

## Iteration Patterns

Loop-until-done patterns that enable one-shotting complex tasks. Two types:

- **INTRA-task** (same agent loops): Use `iterating-to-completion` skill
- **INTER-phase** (agents cycle): Use Tight Feedback Loop (see Verification Patterns in main skill)

### Completion Promise (10.1)

An explicit string signal that a task is done. Without it, orchestrators guess at completion.

**Pattern:**

```
Loop until agent output contains: TASK_COMPLETE | ALL_TESTS_PASSING | IMPLEMENTATION_VERIFIED

Agent prompt must include:
'When task is fully complete, output the exact string: TASK_COMPLETE
Do NOT output this string until ALL requirements are met.'
```

**Common promises:**
| Context | Promise String |
|---------|----------------|
| Implementation phase | `IMPLEMENTATION_VERIFIED` |
| Test phase | `ALL_TESTS_PASSING` |
| Review phase | `REVIEW_APPROVED` |
| Generic task | `TASK_COMPLETE` |

**Why explicit strings:** Prevents false completion detection from phrases like 'I've completed the task' appearing in explanatory text.

### Agent Scratchpad (10.2)

Cross-iteration context file tracking state between iterations.

**Location:** `{output_directory}/scratchpad.md` or `.agent/scratchpad.md`

**Structure:**

```markdown
# Scratchpad: {Task Name}

## Accomplished

- [x] Created component shell
- [x] Added props interface

## Remaining

- [ ] Implement onClick handler
- [ ] Add loading state

## Decisions Made

- Using Zustand over Context (performance)
- Component will be controlled, not uncontrolled

## Current Blockers

- None

## Errors to Avoid (from prior iterations)

- Don't import from @/utils - use relative paths
- Mock useQuery, not the entire module
```

**Update protocol:**

1. Agent reads scratchpad at iteration start
2. Agent updates scratchpad before returning
3. Orchestrator verifies scratchpad was updated
4. Next iteration receives updated scratchpad

### Iteration Safety Guards (10.3)

Prevent runaway iterations that waste tokens and time.

**Default guards:**
| Guard | Default | Purpose |
|-------|---------|---------|
| `max_iterations` | 10 | Hard stop after N iterations |
| `max_runtime` | 15 min | Time-based cutoff |
| `consecutive_error_limit` | 3 | Escalate if same error repeats |
| `max_cost` | $50 | Budget protection |

**Implementation:**

```json
{
  "iteration": {
    "current": 3,
    "max": 10,
    "consecutive_errors": 1,
    "error_limit": 3,
    "started_at": "2026-01-17T10:00:00Z",
    "max_runtime_minutes": 15
  }
}
```

**When guard triggered:**

1. Stop iteration loop immediately
2. Preserve current state (scratchpad, progress)
3. Escalate via AskUserQuestion with options:
   - 'Extend limit' - Add N more iterations
   - 'Accept current state' - Proceed with known issues
   - 'Abort' - Stop workflow

### Loop Detection (10.4)

Detect when agent is stuck producing similar outputs.

**Algorithm:**

1. Keep sliding window of last 5 agent outputs
2. Compare each new output against window using fuzzy matching
3. If similarity > 90% to any window entry → Agent is stuck

**Detection prompt addition:**

```markdown
LOOP DETECTION ACTIVE

If you find yourself:

- Producing output very similar to a prior iteration
- Making the same fix repeatedly
- Unable to progress past a specific error

STOP and return:
{
"status": "stuck",
"stuck_reason": "Description of what's blocking progress",
"attempted": ["List of approaches tried"],
"recommendation": "What might help"
}
```

**When stuck detected:**

1. Do NOT continue iterations
2. Log stuck state to progress file
3. Escalate to user or route to different agent

### Error History Injection (10.6)

Inject recent errors into prompts to prevent repeat mistakes.

**Pattern:**

```markdown
## Recent Errors to Avoid

The following errors occurred in prior iterations. Do NOT repeat them:

1. **Iteration 2:** TypeError: Cannot read property 'map' of undefined
   - Cause: Forgot to handle loading state where data is undefined
   - Fix: Add `if (!data) return null` guard

2. **Iteration 3:** Test failed: expected 'Submit' but got 'Loading...'
   - Cause: Didn't wait for loading to complete in test
   - Fix: Use `await waitFor(() => ...)` instead of immediate assertion

You MUST check your code against these specific errors before returning.
```

**Injection rules:**

- Include last 2-5 errors (not entire history)
- Include cause AND fix, not just error message
- Remove errors once confirmed fixed
- Track which errors persist across iterations (signals deeper issue)

### Integration with Existing Patterns

| Pattern                  | Where Documented                                          | When to Use                                    |
| ------------------------ | --------------------------------------------------------- | ---------------------------------------------- |
| 10.1-10.4                | This section                                              | INTRA-task loops (same agent)                  |
| 10.5 Tight Feedback Loop | Verification Patterns + references/tight-feedback-loop.md | INTER-phase loops (Implementation→Review→Test) |
| 10.6                     | This section                                              | Both INTRA and INTER loops                     |

**Skill reference:** For INTRA-task iteration implementation, invoke `iterating-to-completion` skill which implements 10.1-10.4.

Source: [ralph-orchestrator](https://github.com/mikeyobrien/ralph-orchestrator), [Ralph Wiggum Technique](https://awesomeclaude.ai/ralph-wiggum)
