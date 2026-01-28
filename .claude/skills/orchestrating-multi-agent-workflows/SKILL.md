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

Multi-phase orchestration involves coordinating multiple agents. Without external state tracking, context drift causes forgotten phases, repeated spawns, and missed verification steps.

**Create TodoWrite items for each phase BEFORE spawning any agents.**

## When to Orchestrate vs Delegate Directly

**Use orchestration when:**

- Task spans 2+ concerns (architecture + implementation + testing)
- Feature requires coordination between multiple agents
- User requests "implement AND test" or "design AND build"

**Delegate directly when:**

- Simple single-agent task (bug fix, add one component)
- Pure architecture/implementation/testing question
- Task complexity is 'Simple' tier (3-10 tool calls)

See [references/effort-scaling.md](references/effort-scaling.md) for tier definitions and decision checklist.

## Quick Reference

| Phase      | Purpose              | Pattern                                             |
| ---------- | -------------------- | --------------------------------------------------- |
| Analyze    | Understand scope     | Ask: Architecture? Implementation? Testing? Review? |
| Decompose  | Break into tasks     | Sequential vs Parallel vs Hybrid                    |
| Delegate   | Spawn agents         | Clear objective + context + scope + expected output |
| Synthesize | Combine results      | Check conflicts, run tests, integrate               |
| Track      | Progress persistence | TodoWrite + progress files for long tasks           |

## Configuration

This skill uses multiple sections of `.claude/config/orchestration-limits.yaml`:

| Section        | Scope                             | Used For                             |
| -------------- | --------------------------------- | ------------------------------------ |
| `inter_phase`  | Implementation→Review→Test cycles | tight-feedback-loop pattern          |
| `orchestrator` | Re-invoking entire patterns       | Retry limits in Orchestration Guards |

**Precedence**: Skill-specific override > config file > hardcoded fallback

> **No Unilateral Overrides**: Agents MUST NOT override config values (even with "safer" lower limits) or add limits together across scopes. To change limits, update the config file or get user approval via AskUserQuestion.

See the config file for the relationship diagram showing how intra_task, inter_phase, and orchestrator limits nest.

## Phase Numbering Convention

**Pattern 2.2: Phase Numbering Consistency**

When defining multi-phase workflows:

- Use explicit 'Phase N:' prefix (e.g., 'Phase 1: Setup', 'Phase 2: Brainstorming')
- Start at Phase 1 (not Phase 0) - Setup is always Phase 1
- Sequential numbers, no gaps (1, 2, 3... not 0, 1, 2 or 1, 2, 4)
- NEVER use fractional phase numbers (e.g., Phase 3.5 is invalid)
- Reference phase numbers consistently in prompts, documentation, and progress tracking
- Sub-steps WITHIN a phase use decimals (Step 5.1, 5.2, 5.3) for decomposition

## Standard Phase Template

All orchestration skills should include these standard phases in this order:

| Phase | Name                  | Purpose                                             | Conditional | Gate |
| ----- | --------------------- | --------------------------------------------------- | ----------- | ---- |
| 1     | Setup                 | Worktree creation, output directory, MANIFEST.yaml  | Always      |      |
| 2     | Triage                | Classify work type, select phases to execute        | Always      |      |
| 3     | Codebase Discovery    | Explore codebase patterns, detect technologies      | Always      | ⛔ 1 |
| 4     | Skill Discovery       | Map technologies to skills, write manifest          | Always      |      |
| 5     | Complexity            | Technical complexity assessment, execution strategy | Always      |      |
| 6     | Brainstorming         | Design refinement with human-in-loop                | LARGE only  |      |
| 7     | Architecture Plan     | Technical design AND task decomposition             | MEDIUM+     |      |
| 8     | Implementation        | Code development                                    | Always      | ⛔ 2 |
| 9     | Design Verification   | Verify implementation matches plan                  | MEDIUM+     |      |
| 10    | Domain Compliance     | Domain-specific mandatory patterns validation       | Always      |      |
| 11    | Code Quality          | Code review for maintainability                     | Always      |      |
| 12    | Test Planning         | Test strategy and plan creation                     | MEDIUM+     |      |
| 13    | Testing               | Test implementation and execution                   | Always      | ⛔ 3 |
| 14    | Coverage Verification | Verify test coverage meets threshold                | Always      |      |
| 15    | Test Quality          | No low-value tests, correct assertions, all pass    | Always      |      |
| 16    | Completion            | Final verification, PR, cleanup                     | Always      |      |

**⛔ = Compaction Gate** - BLOCKING checkpoint requiring [compaction-gates.md](references/compaction-gates.md) protocol before next phase.

**Work Types:** BUGFIX, SMALL, MEDIUM, LARGE (determined in Phase 2: Triage)

**Phase Skip Matrix:**

| Work Type | Skipped Phases               |
| --------- | ---------------------------- |
| BUGFIX    | 5, 6, 7, 9, 12               |
| SMALL     | 5, 6, 7, 9                   |
| MEDIUM    | None                         |
| LARGE     | None (all 16 phases execute) |

Domain-specific orchestrations may add sub-phases within standard phases but should not skip or reorder standard phases. Domain-specific concerns (e.g., MCP Audit, Protocol Research) should be sub-phases within the appropriate standard phase.

This is NOT optional. Update existing orchestration skills to match.

**Phase-specific reference files:**

- [Phase 1: Setup](references/phase-1-setup.md) - Worktree creation, output directory, MANIFEST.yaml
- [Phase 2: Triage](references/phase-2-triage.md) - Work type classification (BUGFIX/SMALL/MEDIUM/LARGE)
- [Phase 3: Codebase Discovery](references/phase-3-codebase-discovery.md) - Explore agent patterns, technology detection
- [Phase 4: Skill Discovery](references/phase-4-skill-discovery.md) - Technology-to-skill mapping, manifest writing
- [Phase 5: Complexity](references/phase-5-complexity.md) - Technical assessment, execution strategy
- [Phase 6: Brainstorming](references/phase-6-brainstorming.md) - Design refinement with human-in-loop (LARGE only)
- [Phase 7: Architecture Plan](references/phase-7-architecture-plan.md) - Technical design AND task decomposition
- [Phase 8: Implementation](references/phase-8-implementation.md) - Code development patterns
- [Phase 9: Design Verification](references/phase-9-design-verification.md) - Plan-to-implementation matching
- [Phase 10: Domain Compliance](references/phase-10-domain-compliance.md) - Domain-specific mandatory patterns
- [Phase 11: Code Quality](references/phase-11-code-quality.md) - Code review for maintainability
- [Phase 12: Test Planning](references/phase-12-test-planning.md) - Test strategy and plan creation
- [Phase 13: Testing](references/phase-13-testing.md) - Test implementation and execution
- [Phase 14: Coverage Verification](references/phase-14-coverage-verification.md) - Coverage threshold validation
- [Phase 15: Test Quality](references/phase-15-test-quality.md) - Assertion quality, no low-value tests
- [Phase 16: Completion](references/phase-16-completion.md) - Final verification, PR, cleanup

## Task Decomposition

### Step 1: Analyze Complexity

Determine which concerns apply:

- Architecture decisions? (patterns, boundaries, schemas)
- Implementation? (handlers, services, components)
- Testing? (unit, integration, E2E, acceptance)
- Review? (quality, security)

### Step 2: Identify Dependencies

- Architecture → Implementation (sequential)
- Implementation → Testing (sequential)
- Unit ↔ E2E tests (parallel - independent)

### Step 3: Determine Execution Pattern

| Pattern    | When to Use                   | Example                                  |
| ---------- | ----------------------------- | ---------------------------------------- |
| Sequential | Later steps depend on earlier | Architecture → Impl → Tests              |
| Parallel   | Tasks are independent         | Unit + Integration + E2E (parallel)      |
| Hybrid     | Partial dependencies          | Sequential phases, then parallel testing |

See [references/execution-patterns.md](references/execution-patterns.md) for detailed examples.

## Delegation Protocol

When delegating to a specialist agent, provide:

1. **Clear objective**: What specifically to accomplish
2. **Context from prior phases**: Architecture decisions, implementation details
3. **Scope boundaries**: What NOT to do (prevent scope creep)
4. **Expected output**: What format/artifacts to return

See [references/delegation-templates.md](references/delegation-templates.md) for agent-specific templates and [references/prompt-templates.md](references/prompt-templates.md) for template structure requirements.

## Parallel Execution

**When tasks are independent, spawn in a SINGLE message:**

```typescript
// All three run concurrently - single message with multiple Task calls
Task("frontend-unit-test-engineer", "Create unit tests...");
Task("frontend-e2e-test-engineer", "Create E2E tests...");
Task("frontend-integration-test-engineer", "Create MSW tests...");
```

**Do NOT spawn sequentially when tasks are independent** - this wastes time.

### File Scope Boundaries

Prevent parallel agents from conflicting on the same files by checking for overlap BEFORE spawning.

**Protocol**: List files each agent will modify, check for overlap, resolve conflicts with sequential execution or split ownership.

See [references/file-conflict-protocol.md](references/file-conflict-protocol.md) for detailed conflict detection and resolution strategies.

### File Locking Mechanism

**Pattern 3.7: File Locking Mechanism**

For complex parallel orchestrations with 3+ agents, use explicit file locks to prevent conflicts. Locks are stored in `{OUTPUT_DIRECTORY}/locks/{agent-name}.lock` with file lists and expiration times.

**Use when:** 3+ parallel agents, overlapping directory trees, long-running tasks (>30 min)
**Skip when:** Sequential execution, disjoint scopes, single agent tasks

See [references/file-locking.md](references/file-locking.md) for complete protocol, conflict resolution, and debugging guidance.

### When Multiple Tests Fail

If testing reveals 3+ independent failures, use `dispatching-parallel-agents` skill for concurrent debugging.

## Handling Agent Results

When an agent returns:

1. **Check status**: `complete`, `blocked`, `needs_review`, or `needs_clarification`
2. **If blocked**: Use Agent Routing Table to determine next agent
3. **If needs_clarification**: Answer questions and re-dispatch
4. **If complete**: Verify output, mark todo complete, proceed

### Agent Routing Table

When agents are blocked, route to appropriate specialist based on blocker type (security → \*-security, architecture → \*-lead, test failures → \*-tester, unknown → user). The complete blocked agent routing table is maintained in `persisting-agent-outputs` skill at `references/blocked-agent-routing.md`. For initial agent **selection** (not routing), see [references/agent-matrix.md](references/agent-matrix.md). For handling clarification requests, see [references/clarification-protocol.md](references/clarification-protocol.md).

**Orchestrator Override Authority**: When an agent returns `blocked` status with a suggested `next_agent` (from the routing table), the orchestrator may override this suggestion based on workflow context. Examples include consolidating multiple blocked agents to a single specialist or escalating major architectural decisions directly to the user rather than routing through intermediate agents.

**Error Recovery**: When phases fail repeatedly or agents encounter unrecoverable errors, see [references/error-recovery.md](references/error-recovery.md) for recovery decision framework, abort triggers, and state preservation.

## Verification Patterns

### Gated Verification

Two-stage verification separates requirement compliance from quality assessment:

**Stage 1 (Blocking)**: Does output match spec? → COMPLIANT | NOT_COMPLIANT
**Stage 2 (Parallel)**: Is output well-built? → Quality + Security review

This prevents wasted effort reviewing work that doesn't meet requirements.

See [references/gated-verification.md](references/gated-verification.md) for detailed examples and [references/phase-validators.md](references/phase-validators.md) for the generic validator table per phase.

### Requirements Verification Phase

**Pattern 4.4: Requirements Verification**

Before spawning code review agents, verify all plan requirements have been implemented:

**Gate**: All requirements have implementation OR user-approved deferral

**Protocol**:

1. List all requirements from architecture/plan phase
2. Check each requirement against completed work
3. Create pre-review checklist comparing plan tasks to implementation
4. Document verification in `requirements-verification.md`

Only proceed to code review after requirements gate passes.

### Gate Override Protocol

**Pattern 4.6: Gate Override Protocol**

When a blocking gate cannot be satisfied:

1. **Use AskUserQuestion** with explicit risk disclosure
2. **Present options**: proceed with limitations, block until resolved, abort
3. **Document override** in MANIFEST.yaml:

```yaml
gate_override:
  gate_name: requirements_verification
  override_reason: "User-approved deferral of analytics requirement"
  risk_accepted: "Analytics feature delayed to v2"
  timestamp: "2026-01-17T15:30:00Z"
```

Example prompt: "Skipping requirements_verification gate. Risk: Proceeding without complete implementation may require rework. Proceed anyway?"

### P0/Compliance Validation

**Pattern 4.7: P0/Compliance Validation**

Domain-specific compliance checks that MUST pass before proceeding to code review. Each orchestration type (integration, capability, nerva, feature development) has specific P0 requirements based on common failure patterns.

**When**: After implementation phase, before review phase
**Blocking**: ❌ Violations found → 🛑 Human Checkpoint → Must fix or document
**Success**: ✅ All checks pass → Automatic progression to review

See [references/p0-compliance.md](references/p0-compliance.md) for per-domain compliance tables, validation protocol, and integration with gated verification.

### Tight Feedback Loop

For implementation requiring iterative refinement (Implementation→Review→Test cycles):

- Loop until `[PHASE]_VERIFIED` or max iterations reached
- Use scratchpad file to track iteration history
- Include prior iteration context when re-spawning agents

> **Configuration**: Tight feedback loop uses `inter_phase` section limits. See `.claude/config/orchestration-limits.yaml` for defaults and `references/tight-feedback-loop.md` for implementation details.

See [references/tight-feedback-loop.md](references/tight-feedback-loop.md) for implementation details.

### Post-Completion Verification (MANDATORY)

When ANY agent returns, you MUST verify before marking complete:

1. **Read output file** - Not just the response summary
2. **Check metadata block** - Verify `skills_invoked` array exists
3. **Compare against mandatory list** - Check for discrepancies
4. **Verify exit criteria** - Match COUNT and UNIT

See [references/agent-output-validation.md](references/agent-output-validation.md) for complete protocol.

## Quality Scoring

Validation agents return quantitative scores (0-100) with weighted factors. Scores ≥70 proceed, 50-69 trigger feedback loops, <50 escalate to user.

See [references/quality-scoring.md](references/quality-scoring.md) for complete scoring format and factor customization.

## Orchestration Guards

### Retry Limits

**NEVER loop indefinitely.** All feedback loops have maximum retry limits:

| Loop Type              | Config Path                                 | Default | Then     |
| ---------------------- | ------------------------------------------- | ------- | -------- |
| Requirement compliance | orchestrator.requirement_compliance_retries | 2       | Escalate |
| Quality fixes          | orchestrator.quality_fix_retries            | 2       | Escalate |
| Test fixes             | orchestrator.test_fix_retries               | 2       | Escalate |

> **Scope**: These are PATTERN-LEVEL retries (re-invoke entire feedback loop). For WITHIN-LOOP limits, see `inter_phase` section.

### Failure Definition

A failure is ANY non-passing result from Review or Test phases. Flaky tests, partial passes, and infrastructure failures ALL count toward limits. Do NOT retry hoping for "lucky pass" - fix the underlying issue or escalate.

### Iteration Persistence

Iteration counts persist in **progress files**, not agent memory. Renaming the task, changing approach, or spawning new agents does NOT reset counters. Only user-approved "Revise approach" (via escalation menu) resets iteration counts.

### Human Checkpoints

Add mandatory checkpoints for:

- Major design decisions
- Resource commitment (before significant implementation)
- Point of no return (irreversible changes)

See [references/orchestration-guards.md](references/orchestration-guards.md) for escalation protocols, checkpoint templates, and rationalization prevention.

## Progress Tracking

**Always use TodoWrite** for multi-phase work. Create one item per phase from the Standard Phase Template (Phase 1: Setup through Phase 16: Completion).

For long-running tasks that may exceed context, see `persisting-progress-across-sessions` skill.

See [references/progress-file-format.md](references/progress-file-format.md) for persistence structure.

### MANIFEST.yaml Maintenance

**Pattern 6.2: MANIFEST.yaml**

Orchestrated workflows maintain MANIFEST.yaml with feature metadata, status tracking, and agent contributions. Uses two-layer state: per-agent JSON metadata in output files, and per-directory MANIFEST.yaml for orchestration coordination.

See `persisting-agent-outputs` skill for complete structure and maintenance protocol.

### Context Window Monitoring

**Pattern 5.3: Context Window Monitoring**

Orchestrations can programmatically monitor token usage by reading Claude Code's session JSONL files. Token checks at phase transitions help prevent context degradation.

**Key thresholds**: 75% (150k) = SHOULD compact, 80% (160k) = MUST compact, 85% (170k) = hook BLOCKS agent spawning.

See [references/context-monitoring.md](references/context-monitoring.md) for token measurement scripts and [references/compaction-gates.md](references/compaction-gates.md) for the BLOCKING compaction protocol at phase transitions.

## Advanced Patterns

For complex orchestrations:

- **Context Compaction**: Mandatory after 40+ messages or before synthesis
- **Git Worktrees**: Isolation for 5+ phase orchestrations
- **Workflow Handoffs**: Prevent orphaned sub-workflows
- **Conditional Triggers**: Auto-invoke supporting skills based on complexity
- **Security Gates**: Required for auth, user input, external APIs
- **Metrics Tracking**: Token estimates, phase durations, escalations

See [references/advanced-patterns.md](references/advanced-patterns.md) for implementation details.

## Standardized Output Format

Orchestrations should return results as structured JSON with status, summary, phases_completed, files_created, verification metrics, and next_steps.

See [references/output-format.md](references/output-format.md) for complete schema and examples.

## Exit Criteria

**Pattern 8.3: Exit Criteria Documentation**

Orchestration is complete when all phases are done, agents returned successfully, gates passed, and verification commands executed with passing results. Exit criteria must use COUNT + UNIT format (e.g., "5 tests passing", not "tests work").

After completing all phases, invoke `finishing-a-development-branch` (LIBRARY) for branch cleanup, PR creation, and worktree cleanup.

See [references/exit-criteria.md](references/exit-criteria.md) for complete checklist and examples.

## REQUIRED SUB-SKILL Declarations

**Pattern 9.1: REQUIRED SUB-SKILL Declarations**

Use declaration markers (`**REQUIRED SUB-SKILL:**`, `**REQUIRED BACKGROUND:**`, `**CONDITIONAL SUB-SKILL:**`) in orchestration prompts to signal mandatory skill invocations. Foundational skills include `persisting-agent-outputs` and `persisting-progress-across-sessions`.

See [references/required-sub-skills.md](references/required-sub-skills.md) for declaration syntax, examples, and validation protocol.

## Workflow Handoff Protocol

**Pattern 9.4: Workflow Handoff Protocol**

When invoked as part of a larger workflow, check TodoWrite for parent workflow items. If parent exists, update parent's todo status and return structured output with `WORKFLOW_CONTINUATION_REQUIRED` signal. If no parent, create own TodoWrite tracking.

See [references/workflow-handoff.md](references/workflow-handoff.md) for detection protocol, structured output format, and continuation examples.

## Escalation Protocol

Escalate to user when architecture decisions have major trade-offs, agents are blocked by missing requirements, or multiple agents return conflicting recommendations. Spawn next agent (do not escalate) when blockers map to routing table entries and no user decision is required.

See [references/escalation-protocol.md](references/escalation-protocol.md) for decision tree, routing table integration, and orchestrator override authority.

## Anti-Patterns

Common mistakes that degrade orchestration effectiveness include over-orchestration, sequential execution when parallel is possible, missing context handoff, scope creep, skipped progress tracking, implementing in orchestrator instead of delegating, and ignoring token cost (~15x for multi-agent).

See [references/anti-patterns.md](references/anti-patterns.md) for detection triggers and detailed examples.

## Integration

### Called By

- Feature/capability orchestrators (`orchestrating-feature-development`, `orchestrating-capability-development`, `orchestrating-integration-development`, `orchestrating-nerva-development`)
- Research orchestrators (`orchestrating-research`)

### Requires (invoke before starting)

- `persisting-agent-outputs` - Set up output directory structure and MANIFEST.yaml schema
- `persisting-progress-across-sessions` - Enable resume protocol for long-running orchestrations

### Calls (during execution)

| Skill                                      | Trigger                 | Purpose                                                                                                                          |
| ------------------------------------------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `developing-with-subagents` (CORE)         | 3+ independent tasks    | Same-session parallel execution with code review gates                                                                           |
| `dispatching-parallel-agents` (CORE)       | 3+ independent failures | Parallel debugging of independent test failures                                                                                  |
| `finishing-a-development-branch` (LIBRARY) | Workflow complete       | Branch cleanup, PR creation, worktree cleanup - `Read(".claude/skill-library/workflow/finishing-a-development-branch/SKILL.md")` |

### Pairs With (conditional)

| Skill                                | Relationship                                                       |
| ------------------------------------ | ------------------------------------------------------------------ |
| `writing-plans` (CORE)               | Create detailed implementation plan before orchestrating execution |
| `brainstorming` (CORE)               | Design exploration and refinement before implementation            |
| `verifying-before-completion` (CORE) | Embedded in all agent prompts for exit criteria verification       |
| `iterating-to-completion` (CORE)     | INTRA-task loops (vs this skill's INTER-phase feedback loops)      |

**Blocked Agent Routing**: This skill USES the blocked agent routing table maintained in `persisting-agent-outputs/references/blocked-agent-routing.md` as the single source of truth. The routing table is owned by the `persisting-agent-outputs` skill. This skill may add orchestration-specific override logic based on workflow context.

See [references/integration-skills.md](references/integration-skills.md) for complete integration matrix, invocation hierarchy, and coordination patterns.

## References

- [Advanced Patterns](references/advanced-patterns.md) - Context compaction, worktrees, security gates
- [Agent Matrix](references/agent-matrix.md) - Initial agent selection guide (not blocked agent routing)
- [Agent Output Validation](references/agent-output-validation.md) - Enforce mandatory skill invocation
  - [Algorithm](references/agent-output-validation-algorithm.md) - 7-step validation procedure
  - [Examples](references/agent-output-validation-examples.md) - Success/failure scenarios
  - [Templates](references/agent-output-validation-templates.md) - Re-spawn prompts, retry policy
- [Anti-Patterns](references/anti-patterns.md) - Common orchestration mistakes and detection triggers
- [Blocked Agent Routing](../persisting-agent-outputs/references/blocked-agent-routing.md) - Complete routing table for blocked agents (source of truth in persisting-agent-outputs skill)
- [Checkpoint Configuration](references/checkpoint-configuration.md) - Strategic human approval points
- [Clarification Protocol](references/clarification-protocol.md) - Handling clarification requests
  - [Advanced](references/clarification-protocol-advanced.md) - Mixed questions, blocked vs clarification
  - [Examples](references/clarification-protocol-examples.md) - Requirement, dependency, architecture, scope workflows
- [Compaction Gates](references/compaction-gates.md) - BLOCKING checkpoints for context compaction at phase transitions
- [Context Monitoring](references/context-monitoring.md) - Programmatic token tracking via JSONL
- [Delegation Templates](references/delegation-templates.md) - Agent prompt templates
  - [Review Skills](references/delegation-templates-review-skills.md) - Reviewer prompts, skill requirements
  - [Testing](references/delegation-templates-testing.md) - Unit, integration, E2E test engineer templates
- [Effort Scaling](references/effort-scaling.md) - Tier definitions and decision checklist
- [Emergency Abort](references/emergency-abort.md) - Safe workflow termination with state preservation
- [Error Recovery](references/error-recovery.md) - Recovery framework, abort triggers, state preservation
- [Escalation Protocol](references/escalation-protocol.md) - Decision tree and orchestrator override authority
- [Execution Patterns](references/execution-patterns.md) - Sequential/parallel/hybrid examples
- [Exit Criteria](references/exit-criteria.md) - Completion checklist and COUNT+UNIT format examples
- [File Conflict Protocol](references/file-conflict-protocol.md) - Proactive conflict detection
- [File Locking](references/file-locking.md) - Distributed lock mechanism for parallel agents
- [Gated Verification](references/gated-verification.md) - Two-stage verification patterns
- [Integration Skills](references/integration-skills.md) - Integration matrix, invocation hierarchy, coordination patterns
- [Orchestration Guards](references/orchestration-guards.md) - Retry limits, checkpoints, escalation
- [Output Format](references/output-format.md) - Standardized JSON output schema
- [Phase Validators](references/phase-validators.md) - Generic validators per phase, pass criteria
- [Progress File Format](references/progress-file-format.md) - Persistence structure
- [Prompt Templates](references/prompt-templates.md) - Agent prompt structure and requirements
- [Quality Scoring](references/quality-scoring.md) - Factor customization examples
- [Required Sub-Skills](references/required-sub-skills.md) - Declaration syntax and validation protocol
- [Tight Feedback Loop](references/tight-feedback-loop.md) - Implementation→Review→Test cycles
- [Workflow Handoff](references/workflow-handoff.md) - Parent-child workflow integration protocol

## External Sources

| Pattern                      | Source                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| Context Monitoring via JSONL | ccusage (https://github.com/ryoppippi/ccusage),                                                     |
| Context Monitoring           | claude-code-statusline (https://github.com/levz0r/claude-code-statusline)                           |
| Emergency Abort              | Chariot: [references/emergency-abort.md](references/emergency-abort.md)                             |
| Exit Criteria                | Anthropic: Building Effective Agents (https://www.anthropic.com/research/building-effective-agents) |
| Multi-agent orchestration    | Anthropic: Building Effective Agents (https://www.anthropic.com/research/building-effective-agents) |
| REQUIRED SUB-SKILL pattern   | Obra's Superpowers (https://github.com/obra/superpowers)                                            |

## Related Skills

- **dispatching-parallel-agents** - Tactical debugging of 3+ independent failures
- **persisting-progress-across-sessions** - Progress files for long-running tasks
- **developing-with-subagents** - Same-session subagent execution with code review
- **writing-plans** - Creating implementation plans before orchestration
- **brainstorming** - Design exploration before implementation
- **verifying-before-completion** - Exit criteria verification (embedded in all agent prompts)
- **iterating-to-completion** - INTRA-task iteration (complements INTER-phase feedback loops)
- **finishing-a-development-branch** (LIBRARY) - Workflow completion, branch cleanup, PR creation
