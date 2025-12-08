---
name: orchestrating-multi-agent-workflows
description: Use when coordinating multi-phase tasks that span architecture, implementation, and testing - provides execution patterns, delegation protocols, and progress tracking for orchestrator agents
allowed-tools: Task, TodoWrite, Read, Glob, Grep, AskUserQuestion
---

# Orchestrating Multi-Agent Workflows

**Coordinate complex tasks by decomposing into phases and delegating to specialized agents.**

## Overview

From Anthropic's multi-agent research: "A lead agent analyzes queries, develops strategy, and spawns specialized subagents to explore different aspects simultaneously."

Orchestration is NOT implementation. The orchestrator's responsibilities are:
1. **Analyze** task scope and complexity
2. **Decompose** into specialized subtasks
3. **Delegate** to appropriate agents
4. **Synthesize** results into coherent output
5. **Track progress** across the workflow

## State Tracking (MANDATORY)

**MUST use TodoWrite BEFORE starting any orchestration workflow.**

Multi-phase orchestration involves coordinating multiple agents across sequential and parallel phases. Without external state tracking, context drift causes:
- Forgotten completed phases
- Repeated agent spawns for same task
- Lost handoff context between agents
- Missed verification steps

**Create TodoWrite items for each phase BEFORE spawning any agents.**

## When to Orchestrate vs Delegate Directly

**Use orchestration when:**
- Task spans 2+ concerns (architecture + implementation + testing)
- Feature requires coordination between multiple agents
- Complex refactoring affecting multiple files/packages
- User requests "implement AND test" or "design AND build"

**Delegate directly when:**
- Simple single-agent task (bug fix, add one component)
- Pure architecture question → architect agent directly
- Pure implementation → developer agent directly
- Pure testing → test engineer directly

## Quick Reference

| Phase | Purpose | Pattern |
|-------|---------|---------|
| Analyze | Understand scope | Ask: Architecture? Implementation? Testing? Review? |
| Decompose | Break into tasks | Sequential vs Parallel vs Hybrid |
| Delegate | Spawn agents | Clear objective + context + scope + expected output |
| Synthesize | Combine results | Check conflicts, run tests, integrate |
| Track | Progress persistence | TodoWrite + progress files for long tasks |

## Task Decomposition

### Step 1: Analyze Complexity

Determine which concerns apply:
- Does the task need architecture decisions? (new patterns, service boundaries, schemas)
- Does the task need implementation? (handlers, services, components)
- Does the task need testing? (unit, integration, E2E, acceptance)
- Does the task need infrastructure? (CloudFormation, Lambda config)
- Does the task need review? (quality, security)

### Step 2: Identify Dependencies

Map which phases depend on others:
- Architecture → Implementation (sequential - design informs code)
- Implementation → Testing (sequential - need code to test)
- Unit tests ↔ E2E tests (parallel - independent of each other)

### Step 3: Determine Execution Pattern

**Sequential Pattern** - Use when later steps depend on earlier decisions:
```
Architecture → Implementation → Unit Tests → Integration → E2E
```

**Parallel Pattern** - Use when tasks are independent:
```
                    ┌─ Unit Tests ────────┐
Implementation ─────┼─ Integration Tests ──┼─ Synthesize
                    └─ E2E Tests ─────────┘
```

**Hybrid Pattern** - Use when partial dependencies exist:
```
Architecture → Implementation → ┌─ Unit Tests ────────┐
                               ├─ Integration Tests ──├─ Synthesize
                               └─ E2E Tests ──────────┘
```

See [references/execution-patterns.md](references/execution-patterns.md) for detailed examples.

## Delegation Protocol

When delegating to a specialist agent, provide:

1. **Clear objective**: What specifically to accomplish
2. **Context from prior phases**: Architecture decisions, implementation details
3. **Scope boundaries**: What NOT to do (prevent scope creep)
4. **Expected output**: What format/artifacts to return

### Example Delegation Prompt

```markdown
Task: Create unit tests for the AssetFilter component

Context from implementation:
- Component location: src/sections/assets/components/AssetFilter.tsx
- Uses TanStack Query for data fetching
- Has 3 filter types: status, severity, date range

Scope: Unit tests only. Do NOT create integration or E2E tests.

Expected output:
- Test file at src/sections/assets/components/__tests__/AssetFilter.test.tsx
- Cover: rendering, filter selection, loading states
- Return structured JSON with test results
```

## Parallel Execution

**When tasks are independent, spawn in a SINGLE message:**

```typescript
// All three run concurrently - single message with multiple Task calls
Task("frontend-unit-test-engineer", "Create unit tests for AssetFilter...")
Task("frontend-e2e-test-engineer", "Create E2E tests for asset filtering workflow...")
Task("frontend-integration-test-engineer", "Create MSW integration tests...")
```

**Do NOT spawn sequentially when tasks are independent** - this wastes time.

### When Multiple Tests Fail

If testing phase reveals 3+ independent failures across different files, use the `dispatching-parallel-agents` skill to debug them concurrently rather than sequentially.

## Handling Agent Results

When an agent returns:

1. **Check status**: `complete`, `blocked`, or `needs_review`
2. **If blocked**: Address blocker or escalate to user
3. **If needs_review**: Evaluate and decide next step
4. **If complete**: Mark todo complete, proceed to next phase
5. **Capture handoff context**: Agent may recommend follow-up actions

### Conflict Detection

After parallel agents return:
- Review each summary
- Check for file conflicts (did agents edit same code?)
- Run full test suite
- Integrate all changes

## Progress Tracking

**Always use TodoWrite** to track multi-phase work:

```markdown
## Orchestration: [Feature Name]

### Phase 1: Architecture (if needed)
- [ ] Spawn architect for design decisions
- [ ] Review architecture output
- [ ] Validate approach with user (if major decisions)

### Phase 2: Implementation
- [ ] Spawn developer with architecture context
- [ ] Verify implementation complete

### Phase 3: Testing (parallel when possible)
- [ ] Spawn unit test engineer
- [ ] Spawn integration test engineer (if API involved)
- [ ] Spawn E2E test engineer (if user workflow)

### Phase 4: Quality Gates
- [ ] Spawn code reviewer
- [ ] Spawn security reviewer (if auth/input handling)
- [ ] Synthesize all results
```

For long-running tasks that may exceed context, see the `persisting-progress-across-sessions` skill.

## Standardized Output Format

Return orchestration results as:

```json
{
  "status": "complete|in_progress|blocked",
  "summary": "1-2 sentence description of what was accomplished",
  "phases_completed": [
    {"phase": "architecture", "agent": "...", "result": "..."},
    {"phase": "implementation", "agent": "...", "result": "..."}
  ],
  "files_created": ["path/to/file1", "path/to/file2"],
  "verification": {
    "all_tests_passed": true,
    "build_success": true,
    "agents_spawned": 4,
    "parallel_executions": 2
  },
  "next_steps": ["Recommended follow-up actions"]
}
```

## Escalation Protocol

**Stop and escalate to user if:**
- Architecture decision has major trade-offs requiring user input
- Agent is blocked by missing requirements
- Multiple agents return conflicting recommendations
- Task scope significantly larger than initially understood

**Escalate to different orchestrator if:**
- Task requires different domain (frontend ↔ backend)
- Task requires full-stack coordination (use both orchestrators)
- Task is pure research/exploration (use specialist directly)

## Anti-Patterns

1. **Over-orchestration**: Don't use orchestrator for simple single-agent tasks
2. **Sequential when parallel possible**: Spawn independent agents together
3. **Missing context in delegation**: Always provide prior phase results
4. **Scope creep**: Keep each agent focused on their specialty
5. **Skipping progress tracking**: Always use TodoWrite for multi-phase work
6. **Implementing yourself**: Orchestrators coordinate, they don't code

## Related Skills

- **dispatching-parallel-agents** - Tactical debugging of 3+ independent failures
- **persisting-progress-across-sessions** - Progress files for long-running tasks
- **developing-with-subagents** - Same-session subagent execution with code review
- **writing-plans** - Creating implementation plans before orchestration
- **brainstorming** - Design exploration before implementation

## References

- [Execution Patterns](references/execution-patterns.md) - Detailed sequential/parallel/hybrid examples
- [Delegation Templates](references/delegation-templates.md) - Agent prompt templates by type
- [Progress File Format](references/progress-file-format.md) - Structure for persistence
