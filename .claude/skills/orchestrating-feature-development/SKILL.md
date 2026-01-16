---
name: orchestrating-feature-development
description: Use when implementing complete features - coordinates brainstorming, planning, architecture, implementation, review, and testing phases with parallel agent execution and feedback loops
allowed-tools: Skill, Task, TodoWrite, Read, Write, Bash, AskUserQuestion
---

# Feature Development Orchestration

Systematically guides feature development through twelve phases with parallel agent execution, explicit feedback loops, and structured feature directories.

## When to Use This Skill

Use this skill when you need to:

- Implement a complete feature from concept to tested code
- Coordinate multiple specialized agents (leads, developers, reviewers, testers)
- Ensure quality through parallel review (code + security)
- Maintain progress with structured handoffs and feedback loops

**Symptoms this skill addresses:**

- Manual orchestration of skills and agents
- Sequential execution when parallel is possible
- Missing security review in architecture
- No feedback loops before escalation
- Lost context between sessions

## Quick Reference

| Phase               | Agents                                     | Execution                | Checkpoint         |
| ------------------- | ------------------------------------------ | ------------------------ | ------------------ |
| 1: Setup            | -                                          | Create feature directory | -                  |
| 2: Brainstorming    | brainstorming skill                        | Sequential               | 🛑 Human           |
| 3: Discovery        | discovering-codebases-for-planning         | **PARALLEL** (dynamic)   | -                  |
| 4: Planning         | writing-plans skill                        | Sequential               | 🛑 Human           |
| 5: Architecture     | frontend-lead + security-lead              | **PARALLEL**             | 🛑 Human           |
| 6: Implementation   | frontend-developer (batch or per-task)     | Mode-dependent           | Per-task if 4+     |
| 7: Plan Review      | -                                          | Verification             | All reqs complete  |
| 8: Code Review      | Stage 1 (spec) → Stage 2 (quality+sec)     | Sequential → Parallel    | 2+1 retry → escalate |
| 9: Test Planning    | test-lead                                  | Sequential               | -                  |
| 10: Testing         | frontend-tester (unit + integration + e2e) | **PARALLEL**             | -                  |
| 11: Test Validation | test-lead                                  | Sequential               | 1 retry → escalate |
| 12: Completion      | -                                          | Final verification       | -                  |

## Table of Contents

### Core Phases

Each phase has detailed documentation in the references/ directory:

- **[Phase 1: Setup](references/phase-1-setup.md)** - Create feature workspace with semantic naming
- **[Phase 2: Brainstorming](references/phase-2-brainstorming.md)** - Design refinement with human-in-loop
- **[Phase 3: Discovery](references/phase-3-discovery.md)** - Parallel pattern analysis (frontend + backend)
- **[Phase 4: Planning](references/phase-4-planning.md)** - Detailed implementation plan creation
- **[Phase 5: Architecture](references/phase-5-architecture.md)** - Parallel leads + security assessment + tech debt analysis
- **[Phase 6: Implementation](references/phase-6-implementation.md)** - Batch mode (1-3 tasks) code development
- **[Phase 6: Per-Task Mode](references/phase-6-per-task-mode.md)** - Per-task review cycle (4+ tasks)
- **[Phase 7: Plan Completion](references/phase-7-plan-completion-review.md)** - Verify all requirements implemented
- **[Phase 8: Code Review](references/phase-8-code-review.md)** - Two-stage gated review (spec → quality)
- **[Phase 9: Test Planning](references/phase-9-test-planning.md)** - test-lead creates test plan
- **[Phase 10: Testing](references/phase-10-testing.md)** - Parallel test modes following plan
- **[Phase 11: Test Validation](references/phase-11-test-validation.md)** - test-lead validates against plan

### Supporting Documentation

Cross-cutting concerns and troubleshooting guides:

- **[Progress Persistence](references/progress-persistence.md)** - Resume workflow, progress file format
- **[Agent Handoffs](references/agent-handoffs.md)** - Structured JSON handoff format
- **[Troubleshooting](references/troubleshooting.md)** - Common issues and solutions

## Workflow Overview

**CRITICAL: Use TodoWrite to track all phases.** Do NOT track mentally.

**REQUIRED SUB-SKILLS for this workflow:**

| Phase  | Required Sub-Skills                                     | Conditional Sub-Skills                         |
| ------ | ------------------------------------------------------- | ---------------------------------------------- |
| 1      | `persisting-agent-outputs`, `using-git-worktrees`       | -                                              |
| All    | `persisting-agent-outputs` (output format)              | -                                              |
| All    | `orchestrating-multi-agent-workflows` (blocked routing) | -                                              |
| All    | `persisting-progress-across-sessions` (context compaction) | -                                           |
| 2      | `brainstorming`                                         | -                                              |
| 3      | `discovering-codebases-for-planning`                    | `dispatching-parallel-agents` (if 3+ failures) |
| 4      | `writing-plans`                                         | -                                              |
| 5-10   | -                                                       | `developing-with-subagents` (if >3 tasks)      |
| 12     | `finishing-a-development-branch`                        | -                                              |

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 1: Setup                                                         │
│  1. Create worktree: .worktrees/{feature-name}/                         │
│  2. Create output dir: .claude/.output/features/{feature-id}/           │
│                                                                         │
│  **REQUIRED SUB-SKILL:** using-git-worktrees (isolated workspace)       │
│  **REQUIRED SUB-SKILL:** persisting-agent-outputs (discover output dir) │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 2: Brainstorming                                                 │
│  **REQUIRED SUB-SKILL:** brainstorming                                  │
│  Output: design.md                                                      │
│  X Human Checkpoint                                                     │
│                                                                         │
│  Gate Checklist:                                                        │
│  - [ ] design.md exists with complete content                           │
│  - [ ] User requirements captured (not assumed)                         │
│  - [ ] Edge cases identified                                            │
│  - [ ] Human approved via AskUserQuestion                               │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 3: Discovery (THREE-STAGE)                                       │
│  **REQUIRED SUB-SKILL:** discovering-codebases-for-planning             │
│  Stage 1: Scoping (identify relevant components)                        │
│  Stage 2: Parallel Explore (1-10 agents based on scoping)               │
│  Stage 3: Synthesis + Verification                                      │
│  Output: discovery.md, file-placement.md, discovery-summary.json        │
│  No Human Checkpoint (feeds into Planning)                              │
│                                                                         │
│  **CONDITIONAL SUB-SKILL:** dispatching-parallel-agents                 │
│    (when investigating 3+ independent failures)                         │
│  ** COMPACTION CHECKPOINT: Summarize discovery, archive to files **     │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 4: Planning                                                      │
│  **REQUIRED SUB-SKILL:** writing-plans                                  │
│  Output: plan.md                                                        │
│  X Human Checkpoint                                                     │
│                                                                         │
│  Gate Checklist:                                                        │
│  - [ ] plan.md exists with implementation steps                         │
│  - [ ] Each step has file paths and code examples                       │
│  - [ ] Dependencies between steps identified                            │
│  - [ ] Human approved via AskUserQuestion                               │
│                                                                         │
│  **CONDITIONAL SUB-SKILL:** developing-with-subagents                   │
│    (when plan has >3 independent tasks - offer execution choice)        │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 5: Architecture (PARALLEL)                                       │
│  Agents: frontend-lead + security-lead                                  │
│  **PROMPT TEMPLATE:** references/prompts/architect-prompt.md            │
│  Input: discovery.md + file-placement.md + discovery-summary.json + plan.md │
│  Output: architecture.md, security-assessment.md, tech-debt.md          │
│  Tech Debt Registry: Update .claude/tech-debt-registry.md               │
│  X Human Checkpoint (enhanced with tech debt decisions)                 │
│                                                                         │
│  Gate Checklist:                                                        │
│  - [ ] architecture.md created by frontend-lead (or backend-lead)       │
│  - [ ] security-assessment.md created by security-lead                  │
│  - [ ] tech-debt.md created with findings                               │
│  - [ ] Tech debt registry updated                                       │
│  - [ ] Human approved via AskUserQuestion                               │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 6: Implementation                                                │
│  Review Mode: 1-3 tasks (Batch) | 4+ tasks (Per-Task)                  │
│  Agent: frontend-developer (+ backend-developer if full-stack)          │
│  **PROMPT TEMPLATE:** references/prompts/developer-prompt.md            │
│  Input: architecture.md + security-assessment.md + tech-debt.md         │
│  Output: Code files + implementation-log.md                             │
│                                                                         │
│  **REQUIRED (in prompt):** developing-with-tdd                          │
│  **REQUIRED (in prompt):** verifying-before-completion                  │
│  **NEW:** STEP 0 Clarification gate (mandatory)                         │
│  ** COMPACTION CHECKPOINT: Summarize implementation, archive to files ** │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 7: Plan Completion Review                                        │
│  Verify all plan requirements implemented before code review            │
│  Output: plan-completion-review.md + requirements checklist             │
│  Gate: All requirements have implementation OR user-approved deferral   │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 8: Code Review (TWO-STAGE GATED)                                 │
│  Stage 1: Spec Compliance (BLOCKING) - Does code match plan?            │
│    Agent: frontend-reviewer (single) - MAX 2 RETRIES                    │
│    Gate: MUST be SPEC_COMPLIANT before Stage 2                          │
│  Stage 2: Quality + Security (PARALLEL) - Is code well-built?           │
│    Agents: frontend-reviewer + frontend-security - MAX 1 RETRY          │
│  **PROMPT TEMPLATE:** references/prompts/reviewer-prompt.md             │
│  Output: spec-compliance-review.md, code-quality-review.md, security-review.md │
│  Escalate: After max retries → AskUserQuestion                          │
│                                                                         │
│  Gate Checklist:                                                        │
│  - [ ] Spec compliance confirmed (code matches plan.md)                 │
│  - [ ] Code quality approved (clean, maintainable)                      │
│  - [ ] All reviewers returned APPROVED                                  │
│  - [ ] OR max 1 retry completed                                         │
│  - [ ] If still failing after retry, escalated via AskUserQuestion      │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 9: Test Planning                                                 │
│  Agent: test-lead (creates test plan)                                   │
│  **PROMPT TEMPLATE:** references/prompts/test-lead-prompt.md            │
│  Output: test-plan.md                                                   │
│  ** COMPACTION CHECKPOINT: Summarize test plan, archive to file **      │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 10: Testing (PARALLEL - all 3 modes)                             │
│  Agents: frontend-tester × 3 (unit, integration, e2e)                   │
│  **PROMPT TEMPLATE:** references/prompts/tester-prompt.md               │
│  Input: test-plan.md (follow plan requirements)                         │
│  Output: test files + test-summary-*.md                                 │
│                                                                         │
│  **REQUIRED (in prompt):** developing-with-tdd                          │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 11: Test Validation (MAX 1 RETRY)                                │
│  Agent: test-lead (validates against plan)                              │
│  Output: test-validation.md                                             │
│  Loop: If plan not met → tester fixes → re-validate ONCE                │
│  Escalate: If still failing → AskUserQuestion                           │
│                                                                         │
│  Gate Checklist:                                                        │
│  - [ ] test-lead validation confirms plan adherence                     │
│  - [ ] quality_score >= 70                                              │
│  - [ ] OR max 1 retry completed                                         │
│  - [ ] If still failing after retry, escalated via AskUserQuestion      │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 12: Completion                                                   │
│  **REQUIRED SUB-SKILL:** finishing-a-development-branch                 │
│  Final verification: npm run build, npx tsc --noEmit, npm test          │
│  Update metadata.json status: "complete"                                │
│  Present options: merge, PR, keep branch, discard                       │
└─────────────────────────────────────────────────────────────────────────┘
```

## Checkpoint Configuration

Human approval required at phases 2, 4, and 5. For large plans (>5 tasks), add intermediate checkpoints during implementation. See [Checkpoint Configuration](references/checkpoint-configuration.md) for complete details.

## Context Management

Each Task dispatch creates a fresh agent instance. Do not manually fix agent work or reuse agents across tasks. See [Context Management](references/context-management.md) for details.

## Phase 1: Setup

Create feature workspace with semantic naming and initialize metadata. See [Phase 1: Setup](references/phase-1-setup.md) for complete details.

## Critical Rules

### Worktree Isolation is MANDATORY

Feature development happens in isolated git worktree (.worktrees/{feature-name}/):
- Phase 1 creates via `using-git-worktrees` skill
- All phases work within worktree
- Phase 12 cleans up after merge/PR/discard

**Why:** Prevents parallel agent conflicts, keeps main workspace clean, easy rollback.

**User opt-out:** Document in progress file, note increased conflict risk.

### Parallel Execution is MANDATORY

**Spawn independent agents in a SINGLE message:**

```typescript
// Good - all in one message
Task("frontend-lead", ...)
Task("security-lead", ...)
```

**Do NOT spawn sequentially when parallel is possible:**

```typescript
// Bad - wastes time
await Task("frontend-lead", ...)
await Task("security-lead", ...)
```

### Human Checkpoints are MANDATORY

After phases 2, 4, and 5, you MUST:

1. Use AskUserQuestion to confirm approval
2. Do NOT proceed without approval
3. Record approval in metadata.json

**Note**: Phase 3 (Discovery) has NO checkpoint - it feeds directly into Planning and Architecture.

### Feedback Loops: MAX 1 Retry

After ONE retry cycle, escalate to user via AskUserQuestion. Do NOT loop indefinitely.

### Context Compaction at Phase Transitions

After phases 3, 6, and 9: invoke `persisting-progress-across-sessions` to compact context. Summarize completed phases, archive to files, keep only current phase details.

See [Context Management](references/context-management.md#context-compaction) for protocol and examples.

### Agent Handoffs Must Be Structured

All Task agents must follow `persisting-agent-outputs` skill for output format.

Key handoff fields:

- `status`: complete, blocked, or needs_review
- `blocked_reason`: Required when blocked (for routing table lookup)
- `attempted`: Required when blocked (what agent tried)
- `handoff.next_agent`: null when blocked (orchestrator decides), suggested agent when complete
- `handoff.context`: Key info for next phase

When agents return `status: blocked`, use `orchestrating-multi-agent-workflows` skill's agent routing table to determine next agent based on `blocked_reason`.

See [Agent Handoffs](references/agent-handoffs.md) for examples.

### Metrics Tracking is MANDATORY

Update progress.json metrics after:
- Each agent spawn (increment agents_spawned, parallel/sequential counts)
- Each validation retry (increment validation_loops)
- Each escalation to user (increment escalations.to_user, add reason)
- Each phase completion (update tokens.by_phase estimate)

At Phase 12, include metrics summary in completion report.

## Rationalization Prevention

Agents rationalize skipping steps. Watch for warning phrases and use evidence-based gates.

**Reference**: See [shared rationalization prevention](../using-skills/references/rationalization-prevention.md) for:

- Statistical evidence (technical debt ~10% fix rate, 'later' ~5% completion)
- Phrase detection patterns ('close enough', 'just this once', 'I'll fix it later')
- Override protocol (requires AskUserQuestion with explicit risk disclosure)

### Feature Development Rationalizations

See [references/rationalization-table.md](references/rationalization-table.md) for domain-specific rationalizations.

**Key principle**: If you detect rationalization phrases in your thinking, STOP. Return to the phase checklist. Complete all items before proceeding.

## Agent Matrix by Feature Type

See [Agent Matrix](references/agent-matrix.md) for complete agent selection by feature domain (frontend/backend/full-stack).

## Feature Directory Structure

See [Feature Directory Structure](references/directory-structure.md) for complete file organization.

## Troubleshooting

See [Troubleshooting](references/troubleshooting.md) for complete guidance on:
- Lost context recovery (read metadata.json)
- Review retry escalation (1 retry → user decision)
- Full-stack feature coordination (spawn all domain agents)

## Integration

### Called By

- `/feature` command - Primary entry point for users
- `/capability` command - Via orchestrating-capability-development (similar pattern)

### Requires (invoke before or at start)

| Skill                                 | When               | Purpose                                                         |
| ------------------------------------- | ------------------ | --------------------------------------------------------------- |
| `using-git-worktrees`                 | Phase 1            | Create isolated workspace for feature development               |
| `persisting-agent-outputs`            | Phase 1            | Discover output directory, set up feature workspace             |
| `orchestrating-multi-agent-workflows` | When agent blocked | Routing table for blocked_reason handling                       |
| `discovering-codebases-for-planning`  | Phase 3            | Feature-context-aware parallel discovery with dynamic agent count |

### Calls (skill-invocation via Skill tool)

| Skill                            | Phase    | Purpose                                |
| -------------------------------- | -------- | -------------------------------------- |
| `brainstorming`                  | Phase 2  | Design refinement with human-in-loop   |
| `writing-plans`                  | Phase 4  | Create detailed implementation plan    |
| `finishing-a-development-branch` | Phase 12 | Verify tests, present options, cleanup |

### Spawns (agent-dispatch via Task tool)

| Agent                                     | Phase       | Key Mandatory Skills                             |
| ----------------------------------------- | ----------- | ------------------------------------------------ |
| `frontend-lead` + `security-lead`         | Phase 5     | adhering-to-dry, adhering-to-yagni               |
| `frontend-developer`                      | Phase 6     | developing-with-tdd, verifying-before-completion |
| `frontend-reviewer` + `frontend-security` | Phase 8     | adhering-to-dry                                  |
| `test-lead`                               | Phase 9, 11 | -                                                |
| `frontend-tester` ×3                      | Phase 10    | developing-with-tdd                              |

**Note**: Phase 3 agent spawning (1-10 Explore agents) is handled internally by the `discovering-codebases-for-planning` skill. All spawned agents receive `persisting-agent-outputs` in prompt. See prompt templates for complete skill list.

### Conditional (based on complexity)

| Skill                         | Trigger                       | Purpose                                    |
| ----------------------------- | ----------------------------- | ------------------------------------------ |
| `developing-with-subagents`   | Plan has >3 independent tasks | Fresh subagent per task + two-stage review |
| `dispatching-parallel-agents` | 3+ independent failures       | Parallel investigation of unrelated issues |

### Agent Skills (embedded in prompts)

These skills are included in prompt templates for subagents:

| Skill                         | Agents                    | Purpose                                     |
| ----------------------------- | ------------------------- | ------------------------------------------- |
| `developing-with-tdd`         | Developers, Testers       | Write test first, verify failure, implement |
| `verifying-before-completion` | All implementation agents | Verify before claiming done                 |
| `adhering-to-dry`             | Developers                | Prevent duplication                         |
| `adhering-to-yagni`           | Developers                | Prevent over-engineering                    |

### Prompt Templates

Located in `references/prompts/`:

| Template              | Used In     | Agents                                     |
| --------------------- | ----------- | ------------------------------------------ |
| `explore-prompt.md`   | Phase 3     | Explore agents (via discovering-codebases-for-planning) |
| `architect-prompt.md` | Phase 5     | frontend-lead, backend-lead, security-lead |
| `developer-prompt.md` | Phase 6     | frontend-developer, backend-developer      |
| `reviewer-prompt.md`  | Phase 8     | _-reviewer, _-security                     |
| `test-lead-prompt.md` | Phase 9, 11 | test-lead                                  |
| `tester-prompt.md`    | Phase 10    | frontend-tester, backend-tester            |

### Library Skills (Reference for Prompt Quality)

| Skill | Path | Purpose |
|-------|------|---------|
| orchestration-prompt-patterns | .claude/skill-library/prompting/orchestration-prompt-patterns/SKILL.md | Prompt engineering patterns for agents |

The prompt templates in references/prompts/ implement patterns from this library skill:
- **developer-prompt.md**: Few-shot TDD examples
- **reviewer-prompt.md**: Chain-of-thought verification, self-consistency review
- **architect-prompt.md**: Decision chain-of-thought with self-consistency
- **test-lead-prompt.md**: Coverage pattern with quality scoring
- **tester-prompt.md**: Test implementation patterns with examples

When updating prompt templates, reference the library skill for:
- Few-shot example construction
- Chain-of-thought pattern structure
- Self-consistency verification methods
- Confidence calibration guidelines

### Alternative Workflows

| Skill                       | When to Use Instead                                              |
| --------------------------- | ---------------------------------------------------------------- |
| `executing-plans`           | Batch execution in separate session (not same-session subagents) |
| `developing-with-subagents` | When you have a plan and want same-session execution with review |

## Exit Criteria

Feature development is complete when:

- ✅ All 12 phases marked "complete" in metadata.json
- ✅ Discovery artifacts generated (discovery.md, file-placement.md, discovery-summary.json)
- ✅ Tech debt registry updated with findings from architecture phase
- ✅ All reviewers returned verdict: APPROVED
- ✅ Test plan created and all tests implemented (quality_score >= 70)
- ✅ Final verification passed (build, lint, tests)
- ✅ Metrics tracked in progress.json (tokens, cost, iterations)
- ✅ Worktree cleaned up (merged and removed, OR kept per user request)
- ✅ User approves final result
- ✅ No rationalization phrases; all gate checklists passed; overrides documented
