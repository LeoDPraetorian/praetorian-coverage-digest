# Context Management

**How agent context is handled throughout the orchestration workflow.**

## Fresh Subagent Per Task

Each task dispatch uses a NEW agent instance. This is intentional:

- **No context pollution** from previous tasks
- **Clean slate** for each implementation
- **Parallel-safe** execution
- **Consistent behavior** regardless of task order

## DO NOT

- Manually fix code then continue with same agent context
- Ask agent to "continue from where you left off"
- Reuse agent instance across multiple tasks
- Assume agent remembers previous work
- Pass partial context expecting agent to infer the rest

## If Agent Fails

Dispatch a NEW agent with:
- The original task specification
- Error context from failed attempt
- Explicit instruction to start fresh

```typescript
Task({
  subagent_type: "integration-developer",
  description: "Implement {task} (fresh attempt)",
  prompt: `
    Previous attempt failed with: {error}

    Start fresh. Do not assume any prior work exists.
    Implement {task} from scratch following architecture.md.

    INPUT FILES:
    - architecture.md: Implementation plan
    - discovery.md: Codebase patterns

    OUTPUT_DIRECTORY: {path}

    MANDATORY SKILLS:
    - developing-with-tdd
    - verifying-before-completion
    - gateway-integrations

    [rest of prompt]
  `
});
```

## Context Handoff Between Phases

When transitioning between phases, pass context through OUTPUT files, not agent memory:

| From Phase | To Phase | Context Files                           |
| ---------- | -------- | --------------------------------------- |
| 1 → 2      | 2        | design.md                               |
| 2 → 3      | 3        | design.md, skill-summary.md, discovery.md |
| 3 → 4      | 4        | architecture.md                         |
| 4 → 4.5    | 4.5      | architecture.md, Go files               |
| 4.5 → 5    | 5        | architecture.md, p0-compliance-review.md |
| 5 → 6      | 6        | architecture.md, review files           |
| 6 → 7      | 7        | All prior files                         |
| 7 → 8      | 8        | All prior files                         |

Each agent reads context from files, not from previous agent's memory.

## Why This Matters

**Context pollution example:**

```
Phase 4 agent implements auth with bug
Phase 5 agent spawned with context "remember that auth bug from earlier"
Phase 5 agent inherits misconceptions about the bug
Phase 5 tests fail mysteriously because agent "remembers" wrong things
```

**Clean context example:**

```
Phase 4 agent implements auth with bug
Phase 5 agent spawned fresh, reads architecture.md
Phase 5 agent sees only the spec, not implementation details
Phase 5 tests correctly against specification
```

## Memory vs. Files

| Context Type | Transfer Via | Why |
| ------------ | ------------ | --- |
| Requirements | Files (design.md, architecture.md) | Single source of truth |
| Implementation | Files (Go code, tests) | Verifiable artifacts |
| Decisions | Files (architecture.md, design.md) | Documented rationale |
| Errors | Prompt (when retrying) | Explicit failure context |
| Agent "memory" | ❌ NEVER | Leads to context pollution |

## Parallel Execution Safety

Fresh agents enable safe parallel execution:

```typescript
// SAFE: Each agent gets clean context
Task({ subagent_type: "integration-developer", prompt: "Implement auth handler" });
Task({ subagent_type: "backend-tester", prompt: "Write auth tests" });
Task({ subagent_type: "integration-developer", prompt: "Implement webhook handler" });
```

If agents shared context, parallel execution would create race conditions where agents interfere with each other's work.

## Anti-Pattern Detection

Watch for these phrases that indicate context reuse:

- "Continue with the previous agent"
- "Resume from where you left off"
- "You remember the bug from earlier"
- "Keep the current context"
- "Don't spawn a new agent, just fix it"

**Correct response:** Spawn fresh agent with explicit context in prompt.
