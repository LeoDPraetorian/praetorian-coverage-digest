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

- Simple single-agent task (bug fix, add one component) - see Effort Scaling tiers
- Pure architecture question → architect agent directly
- Pure implementation → developer agent directly
- Pure testing → test engineer directly
- Task complexity is 'Simple' tier (3-10 tool calls expected)

## Effort Scaling

Match agent count to task complexity. Multi-agent systems use ~15x more tokens than single-agent chat—ensure the complexity justifies the cost.

### Scaling Tiers

| Complexity   | Agents           | Tool Calls               | Examples                                            |
| ------------ | ---------------- | ------------------------ | --------------------------------------------------- |
| **Simple**   | 1 agent directly | 3-10 calls               | Bug fix, add prop, typo fix, single component       |
| **Moderate** | 2-4 agents       | 10-15 each               | Compare approaches, implement + test one feature    |
| **Complex**  | 5-10 agents      | Divided responsibilities | Full feature with architecture, impl, review, tests |
| **Major**    | 10+ agents       | Parallel phases          | Cross-cutting refactor, new subsystem               |

### Decision Checklist

Before spawning multiple agents, ask:

1. **Can one agent complete this?** If yes, delegate directly (skip orchestrator)
2. **Are the subtasks truly independent?** If no, sequential/manual is better
3. **Does complexity justify 15x token cost?** Simple tasks don't need orchestration
4. **Would parallel execution save significant time?** If tasks are serial anyway, single agent may be better

### Interdependent Task Warning

Multi-agent systems are LESS effective for tightly interdependent tasks. Signs to watch for:

- Each step requires output from previous step (can't parallelize)
- Shared state that agents would conflict on
- Tight coupling where one change affects multiple areas
- Iterative refinement cycles (review → fix → review)

For interdependent work, prefer:

- Single agent with TodoWrite tracking
- Sequential agent spawning with explicit handoffs
- Manual orchestration with human checkpoints

## Quick Reference

| Phase      | Purpose              | Pattern                                             |
| ---------- | -------------------- | --------------------------------------------------- |
| Analyze    | Understand scope     | Ask: Architecture? Implementation? Testing? Review? |
| Decompose  | Break into tasks     | Sequential vs Parallel vs Hybrid                    |
| Delegate   | Spawn agents         | Clear objective + context + scope + expected output |
| Synthesize | Combine results      | Check conflicts, run tests, integrate               |
| Track      | Progress persistence | TodoWrite + progress files for long tasks           |

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

- Test file at src/sections/assets/components/**tests**/AssetFilter.test.tsx
- Cover: rendering, filter selection, loading states
- Return structured JSON with test results
```

## Parallel Execution

**When tasks are independent, spawn in a SINGLE message:**

```typescript
// All three run concurrently - single message with multiple Task calls
Task("frontend-unit-test-engineer", "Create unit tests for AssetFilter...");
Task("frontend-e2e-test-engineer", "Create E2E tests for asset filtering workflow...");
Task("frontend-integration-test-engineer", "Create MSW integration tests...");
```

**Do NOT spawn sequentially when tasks are independent** - this wastes time.

### When Multiple Tests Fail

If testing phase reveals 3+ independent failures across different files, use the `dispatching-parallel-agents` skill to debug them concurrently rather than sequentially.

## Handling Agent Results

When an agent returns:

1. **Check status**: `complete`, `blocked`, `needs_review`, or `needs_clarification` (see [Extended Agent Status Values](#extended-agent-status-values))
2. **If blocked**: Use the [Agent Routing Table](#agent-routing-table) to determine next agent
3. **If needs_review**: Evaluate and decide next step
4. **If needs_clarification**: Answer questions and re-dispatch (see [Clarification Protocol](#handling-clarification-requests))
5. **If complete**: Mark todo complete, proceed to next phase
6. **Capture handoff context**: Agent may recommend follow-up actions

## Gated Verification Pattern

When verification matters (reviews, validation, quality checks), use two-stage gates:

**Stage 1: REQUIREMENT COMPLIANCE (Blocking Gate)**
- Does output match specification?
- Pass required before Stage 2
- MAX N retries (default: 2)

**Stage 2: QUALITY ASSESSMENT (Parallel)**
- Is output well-constructed?
- Run quality + security checks in parallel
- MAX M retries (default: 1)

This pattern prevents wasted effort reviewing output that doesn't meet requirements.

### When to Use Gated Verification

| Scenario | Use Gated? | Why |
|----------|------------|-----|
| Code review after implementation | Yes | Verify spec compliance before quality review |
| Test validation | Yes | Verify plan adherence before quality scoring |
| Architecture review | No | Single-pass evaluation sufficient |
| Simple task completion | No | Overhead not justified |

### Gated Verification Template

```
Stage 1 Agent Prompt Addition:
'Your ONLY focus: Does output match requirements exactly?
Return verdict: COMPLIANT | NOT_COMPLIANT
Do NOT evaluate quality, style, or optimization.'

Stage 2 Agent Prompt Addition:
'Prerequisite: Stage 1 passed (requirements met).
Focus: Is output well-constructed?
Return verdict: APPROVED | CHANGES_REQUESTED'
```

See [references/gated-verification.md](references/gated-verification.md) for detailed examples.

### Agent Routing Table

When an agent returns `blocked`, use this table to determine the next agent.

**For agent output validation (mandatory skill compliance), see [references/agent-output-validation.md](references/agent-output-validation.md).**

| Agent Type   | Blocked Reason                | Next Agent                        |
| ------------ | ----------------------------- | --------------------------------- |
| \*-developer | Security concern              | \*-security                       |
| \*-developer | Architecture decision needed  | \*-lead                           |
| \*-developer | Test failures persist         | \*-tester                         |
| \*-tester    | Missing test plan             | test-lead                         |
| \*-tester    | Coverage requirements unclear | test-lead                         |
| \*-reviewer  | Implementation unclear        | \*-developer (with clarification) |
| \*-security  | Requires architecture changes | \*-lead                           |
| \*-lead      | Cross-domain coordination     | appropriate orchestrator          |
| Any agent    | Unknown/complex blocker       | Ask user via AskUserQuestion      |

**Pattern matching**: Replace `*` with the domain prefix (e.g., `frontend-developer` → `frontend-security`).

### Extended Agent Status Values

Agents can return these status values:

| Status | Meaning | Orchestrator Action |
|--------|---------|---------------------|
| complete | Task finished successfully | Mark todo complete, proceed |
| blocked | Cannot proceed, need different agent | Use routing table |
| needs_review | Work done but wants human check | Present to user |
| needs_clarification | Need answers before proceeding | Answer questions, re-dispatch |

### Structured Blocked Response Format

Agents should return this structure when blocked:

```json
{
  "status": "blocked",
  "blocked_reason": "security_concern|architecture_decision|test_failures|missing_requirements|unknown",
  "context": "Description of the specific blocker",
  "attempted": ["What the agent tried before giving up"],
  "recommendation": "Optional hint, but orchestrator makes final routing decision"
}
```

The orchestrator uses `blocked_reason` to look up the routing table and spawn the appropriate next agent. Agents should NOT include routing logic in their definitions—that responsibility belongs exclusively to the orchestrator.

### Clarification Response Format

When agent needs input before proceeding:

```json
{
  "status": "needs_clarification",
  "questions": [
    {
      "category": "requirement|dependency|architecture|scope",
      "question": "Specific question text",
      "options": ["Option A", "Option B"],
      "impact": "Why this matters for the task"
    }
  ],
  "partial_work": "What agent completed before needing clarification"
}
```

### Handling Clarification Requests

1. **Technical questions**: Research codebase, read documentation
2. **Requirement questions**: Escalate via AskUserQuestion
3. **Architecture questions**: Spawn appropriate lead agent
4. **Re-dispatch**: Send original agent answers with original context

```typescript
Task(
  subagent_type: "[same-agent]",
  prompt: "
    CLARIFICATION ANSWERS:
    Q1: [question]
    → A1: [researched answer]

    Q2: [question]
    → A2: [user's decision]

    Now proceed with original task using these answers.

    [Original prompt context]
  "
)
```

See [references/clarification-protocol.md](references/clarification-protocol.md) for extended examples.

### Conflict Detection

After parallel agents return:

- Review each summary
- Check for file conflicts (did agents edit same code?)
- Run full test suite
- Integrate all changes

### Post-Completion Verification Protocol (MANDATORY)

When ANY agent returns, you MUST verify before marking complete:

#### Step 1: Read the Output File

Do NOT trust the response summary. Read the actual output file:

```bash
# Agent should have written to OUTPUT_DIRECTORY
cat .claude/.output/[workflow]/[agent]-output.md
```

#### Step 2: Verify Metadata Block Exists

Every agent output MUST end with a JSON metadata block (per persisting-agent-outputs):

```json
{
  "agent": "frontend-developer",
  "skills_invoked": ["skill1", "skill2"],
  "source_files_verified": ["path:lines"],
  "status": "complete"
}
```

**If metadata missing:** Agent violated persisting-agent-outputs. Do NOT mark complete.

#### Step 3: Compare skills_invoked Against Mandatory List

You provided MANDATORY SKILLS in the task prompt. Verify:

```
Your prompt said: MANDATORY SKILLS: persisting-agent-outputs, verifying-before-completion
Agent metadata says: skills_invoked: ["persisting-agent-outputs"]

DISCREPANCY: verifying-before-completion not invoked
```

**If discrepancy:** Note it. Consider re-spawning agent with stronger prompt.

#### Step 4: Verify Exit Criteria (if task had criteria)

If you specified exit criteria in the task prompt:

1. Quote the criteria
2. Check agent's output against criteria
3. Verify the COUNT and UNIT match (see verifying-before-completion skill)

#### Step 5: Only Then Mark Complete

```markdown
✅ Agent: frontend-developer
✅ Output file: .claude/.output/features/2026-01-10/frontend-developer-implementation.md
✅ Metadata: Present with skills_invoked array
✅ Skills verified: 3/3 mandatory skills invoked
✅ Exit criteria: '47 files updated' - VERIFIED (see file list in output)

→ Marking phase complete
```

### Why This Protocol Exists

Real failure: Orchestrator trusted agent's response summary ('118 calls updated') without reading output file. Output file showed only 47 files touched. The agent counted function calls, not files. Verification would have caught this.

**The orchestrator-enforcement hook reminds you of this protocol. This skill documents the full procedure.**

## Retry Limits with Escalation

**NEVER loop indefinitely.** All feedback loops have maximum retry limits.

### Default Retry Limits

| Loop Type | MAX Retries | Then |
|-----------|-------------|------|
| Requirement compliance (Stage 1) | 2 | Escalate to user |
| Quality fixes (Stage 2) | 1 | Escalate to user |
| Test/validation fixes | 1 | Escalate to user |
| Any unspecified loop | 2 | Escalate to user |

### Escalation Protocol

After MAX retries exceeded, use AskUserQuestion:

```typescript
AskUserQuestion({
  questions: [{
    question: "[Phase/Task] still failing after [N] attempts. How to proceed?",
    header: "[Phase]",
    multiSelect: false,
    options: [
      { label: "Show issues", description: "Review failure details" },
      { label: "Proceed anyway", description: "Accept current state, document known issues" },
      { label: "Revise approach", description: "Change strategy or requirements" },
      { label: "Cancel", description: "Stop workflow" }
    ]
  }]
})
```

### Retry Tracking

Track retry counts in progress:

```json
{
  "phase": "review",
  "retry_count": 1,
  "max_retries": 2,
  "last_failure": "Spec compliance: missing error handling"
}
```

## Human Checkpoint Framework

### When to Add Checkpoints

Add mandatory human checkpoints when:

- **Major design decisions**: Architecture, approach selection
- **Resource commitment**: Before significant implementation starts
- **Point of no return**: Before irreversible changes
- **User preferences matter**: UX decisions, trade-offs with no clear winner

### Checkpoint Protocol

1. Use AskUserQuestion with clear options
2. Record approval in progress tracking
3. Do NOT proceed without explicit approval
4. If user selects 'pause', document state for resume

### Checkpoint Metadata

```json
{
  "phase": "architecture",
  "checkpoint": true,
  "approved": true,
  "approved_at": "2025-01-11T10:30:00Z",
  "user_selection": "Option A",
  "notes": "User preferred simpler approach"
}
```

### Checkpoint Question Template

```typescript
AskUserQuestion({
  questions: [{
    question: "[Phase] complete. Review before proceeding to [next phase]?",
    header: "[Phase]",
    multiSelect: false,
    options: [
      { label: "Approve", description: "Proceed to [next phase]" },
      { label: "Request changes", description: "Modify before proceeding" },
      { label: "Review details", description: "Show me [artifacts]" },
      { label: "Pause", description: "Stop here, resume later" }
    ]
  }]
})
```

## Quality Scoring Framework

Quantitative thresholds prevent subjective 'good enough' judgments.

### Quality Score Structure

Validation agents should return:

```json
{
  "quality_score": 85,
  "factors": {
    "completeness": { "weight": 40, "score": 90 },
    "correctness": { "weight": 30, "score": 85 },
    "quality": { "weight": 20, "score": 80 },
    "edge_cases": { "weight": 10, "score": 75 }
  },
  "threshold": 70,
  "verdict": "PASS"
}
```

### Score Interpretation

| Score | Interpretation | Action |
|-------|----------------|--------|
| 90-100 | Excellent | Proceed immediately |
| 70-89 | Good, acceptable | Proceed |
| 50-69 | Needs improvement | Feedback loop |
| <50 | Significant issues | Escalate to user |

### Using Quality Scores

1. Validation agents MUST return quality_score when evaluating work
2. Orchestrator checks: `if quality_score >= threshold then proceed`
3. Scores below threshold trigger feedback loop (respecting retry limits)
4. User can override threshold via AskUserQuestion

### Customizing Factors

Adjust weights based on workflow type:

| Workflow Type | Emphasize |
|---------------|-----------|
| Implementation | Correctness (40%), Completeness (30%) |
| Testing | Coverage (40%), Edge cases (30%) |
| Documentation | Completeness (50%), Clarity (30%) |

See [references/quality-scoring.md](references/quality-scoring.md) for factor customization examples.

## Rationalization Prevention

### Common Rationalizations

| Rationalization | Detection Phrases | Prevention |
|-----------------|-------------------|------------|
| "This is simple" | "just", "quickly", "simple", "trivial" | Check effort scaling tier first |
| "I'll fix it later" | "later", "next time", "TODO", "tech debt" | Enforce completion before proceeding |
| "Close enough" | "basically", "mostly", "approximately", "~" | Require explicit verification |
| "User won't notice" | "minor", "edge case", "unlikely" | Document for user decision |
| "Tests can wait" | "test later", "verify manually", "obvious" | Block on verification phase |
| "Skip this step" | "unnecessary", "overkill", "overhead" | Follow checklist exactly |

### Detection Protocol

If you detect rationalization phrases in your thinking:

1. **STOP** - Do not proceed
2. **Return to checklist** - Review phase requirements
3. **Complete all items** - No exceptions
4. **If genuinely blocked** - Use clarification protocol, not skip

### Override Protocol

If workflow MUST deviate from standard process:

1. Use AskUserQuestion to propose deviation
2. Explain specific risk and trade-off
3. Present alternatives considered
4. Document user's explicit decision
5. Proceed only with approval

```typescript
AskUserQuestion({
  questions: [{
    question: "Proposing to skip [step]. Risk: [specific risk]. Proceed?",
    header: "Override",
    options: [
      { label: "Skip with documented risk", description: "[trade-off explanation]" },
      { label: "Don't skip", description: "Complete step as designed" }
    ]
  }]
})
```

**All overrides must be documented in progress tracking with rationale.**

## Conditional Sub-Skill Triggers

Invoke supporting skills when complexity thresholds are met.

### Complexity-Based Triggers

| Condition | Trigger Skill | Purpose |
|-----------|---------------|---------|
| 3+ independent tasks in plan | `developing-with-subagents` | Same-session parallel execution with review |
| 5+ total tasks | `persisting-progress-across-sessions` | Cross-session resume capability |
| 3+ independent failures | `dispatching-parallel-agents` | Parallel debugging |
| Estimated duration >30 min | `persisting-progress-across-sessions` | Progress checkpoints |

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
    { "phase": "architecture", "agent": "...", "result": "..." },
    { "phase": "implementation", "agent": "...", "result": "..." }
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

> **Note**: This skill is the single source of truth for all escalation routing logic. Individual agents do NOT contain escalation routing logic. Agents return structured status with blocked reasons (see [Structured Blocked Response Format](#structured-blocked-response-format)), and orchestrators use this skill to determine next steps. This maintains separation of concerns and prevents routing logic from being scattered across 29+ agent definitions.

**Stop and escalate to user if:**

- Architecture decision has major trade-offs requiring user input
- Agent is blocked by missing requirements
- Multiple agents return conflicting recommendations
- Task scope significantly larger than initially understood
- Agent returns `blocked_reason: "unknown"` (routing table has no match)

**Escalate to user if:**

- Task requires cross-domain coordination (frontend ↔ backend)
- Task requires full-stack coordination (user should decide approach)
- Task is pure research/exploration (use research skill or specialist directly)

**Spawn next agent (do NOT escalate) if:**

- Agent returns with recognized `blocked_reason` that maps to the [Agent Routing Table](#agent-routing-table)
- The blocker is within the current domain (e.g., frontend-developer blocked → route to frontend-security)
- No user decision is required

## Anti-Patterns

1. **Over-orchestration**: Don't use orchestrator for simple single-agent tasks
2. **Sequential when parallel possible**: Spawn independent agents together
3. **Missing context in delegation**: Always provide prior phase results
4. **Scope creep**: Keep each agent focused on their specialty
5. **Skipping progress tracking**: Always use TodoWrite for multi-phase work
6. **Implementing yourself**: Orchestrators coordinate, they don't code
7. **Ignoring token cost**: Multi-agent uses 15x more tokens—don't orchestrate simple tasks
8. **Parallelizing interdependent work**: Serial tasks should stay serial, don't force parallel

## Related Skills

- **dispatching-parallel-agents** - Tactical debugging of 3+ independent failures
- **persisting-progress-across-sessions** - Progress files for long-running tasks
- **developing-with-subagents** - Same-session subagent execution with code review
- **writing-plans** - Creating implementation plans before orchestration
- **brainstorming** - Design exploration before implementation

## References

- [Agent Output Validation](references/agent-output-validation.md) - Enforce mandatory skill invocation by subagents
- [Execution Patterns](references/execution-patterns.md) - Detailed sequential/parallel/hybrid examples
- [Delegation Templates](references/delegation-templates.md) - Agent prompt templates by type
- [Progress File Format](references/progress-file-format.md) - Structure for persistence
- [Gated Verification](references/gated-verification.md) - Two-stage verification patterns
- [Quality Scoring](references/quality-scoring.md) - Factor customization examples
- [Clarification Protocol](references/clarification-protocol.md) - Extended clarification examples
