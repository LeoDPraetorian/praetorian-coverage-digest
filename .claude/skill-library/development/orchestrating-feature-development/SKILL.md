---
name: orchestrating-feature-development
description: Use when implementing complete features - coordinates brainstorming, planning, architecture, implementation, review, and testing phases with parallel agent execution and feedback loops
allowed-tools: Skill, Task, TodoWrite, Read, Glob, Grep, AskUserQuestion
---

# Feature Development Orchestration

**Systematically guide feature development through sixteen phases with parallel agent execution, explicit feedback loops, and structured feature directories.**

## Overview

This skill orchestrates complete feature development from concept to tested code through a standardized 16-phase workflow with feature-specific customizations.

**Orchestration is NOT implementation.** The orchestrator's responsibilities are:

1. **Analyze** feature scope and complexity
2. **Decompose** into specialized subtasks
3. **Delegate** to appropriate agents (leads, developers, reviewers, testers)
4. **Synthesize** results into coherent output
5. **Track progress** across the workflow

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

## State Tracking (MANDATORY)

**MUST use TodoWrite BEFORE starting any orchestration workflow.**

Multi-phase orchestration involves coordinating multiple agents. Without external state tracking, context drift causes forgotten phases, repeated spawns, and missed verification steps.

**Create TodoWrite items for each phase BEFORE spawning any agents.**

## Standard Phase Template

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
| 10    | Domain Compliance     | Feature-specific mandatory patterns validation      | Always      |      |
| 11    | Code Quality          | Code review for maintainability                     | Always      |      |
| 12    | Test Planning         | Test strategy and plan creation                     | MEDIUM+     |      |
| 13    | Testing               | Test implementation and execution                   | Always      | ⛔ 3 |
| 14    | Coverage Verification | Verify test coverage meets threshold                | Always      |      |
| 15    | Test Quality          | No low-value tests, correct assertions, all pass    | Always      |      |
| 16    | Completion            | Final verification, PR, cleanup                     | Always      |      |

**⛔ = Compaction Gate** - BLOCKING checkpoint requiring [compaction-gates.md](references/compaction-gates.md) protocol before next phase.

**Work Types:** BUGFIX, SMALL, MEDIUM, LARGE (determined in Phase 2: Triage)

**Phase Skip Matrix:**

| Work Type | Skipped Phases       |
| --------- | -------------------- |
| BUGFIX    | 5, 6, 7, 9, 12       |
| SMALL     | 5, 6, 7, 9           |
| MEDIUM    | None                 |
| LARGE     | None (all 16 phases) |

## Quick Reference

| Phase | Agents                                   | Execution          | Checkpoint           |
| ----- | ---------------------------------------- | ------------------ | -------------------- |
| 1     | -                                        | Setup              | -                    |
| 2     | -                                        | Triage             | -                    |
| 3     | Explore (1-10 via discovering-codebases) | **PARALLEL**       | -                    |
| 4     | -                                        | Skill mapping      | -                    |
| 5     | -                                        | Assessment         | -                    |
| 6     | brainstorming skill                      | Sequential         | 🛑 Human             |
| 7     | {domain}-lead + security-lead            | **PARALLEL**       | 🛑 Human             |
| 8     | {domain}-developer                       | Mode-dependent     | Per-task if 4+       |
| 9     | -                                        | Verification       | -                    |
| 10    | -                                        | Compliance check   | Violations → Human   |
| 11    | {domain}-reviewer + {domain}-security    | **PARALLEL**       | 2+1 retry → escalate |
| 12    | test-lead                                | Sequential         | -                    |
| 13    | {domain}-tester ×3                       | **PARALLEL**       | -                    |
| 14    | -                                        | Coverage check     | -                    |
| 15    | test-lead                                | Sequential         | 1 retry → escalate   |
| 16    | -                                        | Final verification | -                    |

## Configuration

This skill uses `.claude/config/orchestration-limits.yaml`:

| Section        | Scope                             | Used For                             |
| -------------- | --------------------------------- | ------------------------------------ |
| `inter_phase`  | Implementation→Review→Test cycles | tight-feedback-loop pattern          |
| `orchestrator` | Re-invoking entire patterns       | Retry limits in Orchestration Guards |

> **No Unilateral Overrides**: Agents MUST NOT override config values. To change limits, update the config file or get user approval via AskUserQuestion.

## Core Orchestration Patterns

This skill includes all necessary orchestration patterns inline:

| Pattern              | Location                                              | Purpose                         |
| -------------------- | ----------------------------------------------------- | ------------------------------- |
| Task Decomposition   | Phase 7 (architecture-plan.md)                        | Break features into agent tasks |
| Delegation Protocol  | Agent Matrix + Prompt Templates                       | Structured agent spawning       |
| Parallel Execution   | [Parallel Execution](#parallel-execution)             | Concurrent agent coordination   |
| Verification         | Phase 9, 11, 14, 15                                   | Multi-stage quality gates       |
| Quality Scoring      | Phase 11, 15                                          | Review and test quality metrics |
| Orchestration Guards | [Checkpoint Configuration](#checkpoint-configuration) | Retry limits and escalation     |
| Error Recovery       | [Emergency Abort](#emergency-abort-protocol)          | Safe workflow termination       |
| Context Management   | [Compaction Gates](#compaction-gates)                 | Token budget management         |
| P0 Compliance        | [p0-compliance.md](references/p0-compliance.md)       | Feature-specific requirements   |

## Phase-Specific References

- [Phase 1: Setup](references/phase-1-setup.md) - Worktree creation, output directory, MANIFEST.yaml
- [Phase 2: Triage](references/phase-2-triage.md) - Work type classification (BUGFIX/SMALL/MEDIUM/LARGE)
- [Phase 3: Codebase Discovery](references/phase-3-codebase-discovery.md) - Explore agent patterns, technology detection
- [Phase 4: Skill Discovery](references/phase-4-skill-discovery.md) - Technology-to-skill mapping, manifest writing
- [Phase 5: Complexity](references/phase-5-complexity.md) - Technical assessment, execution strategy
- [Phase 6: Brainstorming](references/phase-6-brainstorming.md) - Design refinement with human-in-loop (LARGE only)
- [Phase 7: Architecture Plan](references/phase-7-architecture-plan.md) - Technical design AND task decomposition
- [Phase 8: Implementation](references/phase-8-implementation.md) - Code development patterns
- [Phase 9: Design Verification](references/phase-9-design-verification.md) - Plan-to-implementation matching
- [Phase 10: Domain Compliance](references/phase-10-domain-compliance.md) - Feature-specific mandatory patterns
- [Phase 11: Code Quality](references/phase-11-code-quality.md) - Code review for maintainability
- [Phase 12: Test Planning](references/phase-12-test-planning.md) - Test strategy and plan creation
- [Phase 13: Testing](references/phase-13-testing.md) - Test implementation and execution
- [Phase 14: Coverage Verification](references/phase-14-coverage-verification.md) - Coverage threshold validation
- [Phase 15: Test Quality](references/phase-15-test-quality.md) - Assertion quality, no low-value tests
- [Phase 16: Completion](references/phase-16-completion.md) - Final verification, PR, cleanup

## Compaction Gates

**BLOCKING checkpoints at phase transitions where context accumulates:**

| Gate | After Phase | Before Phase | Trigger Threshold |
| ---- | ----------- | ------------ | ----------------- |
| 1    | 3           | 4            | 70% (140k tokens) |
| 2    | 8           | 9            | 70% (140k tokens) |
| 3    | 13          | 14           | 70% (140k tokens) |

**Protocol:** See [compaction-gates.md](references/compaction-gates.md) for:

- 5-step compaction procedure
- "What to Compact / What to Keep" tables
- Feature-specific content lists
- Rationalization counters

## Agent Matrix for Feature Development

See [references/agent-matrix.md](references/agent-matrix.md) for complete agent selection guide with:

- Agent responsibilities by phase
- Mandatory skills per agent
- Selection rules and anti-patterns
- Sequential vs parallel execution patterns

**Quick Reference by Feature Type:**

| Feature Type | Phase 7  | Phase 8  | Phase 11 | Phase 13 |
| ------------ | -------- | -------- | -------- | -------- |
| Frontend     | 2 agents | 1 agent  | 2 agents | 3 agents |
| Backend      | 2 agents | 1 agent  | 2 agents | 3 agents |
| Full-Stack   | 3 agents | 2 agents | 4 agents | 6 agents |

## Feature-Specific Domain Compliance (Phase 10)

Feature development has specific P0 requirements:

| Check              | Description                                              | Severity |
| ------------------ | -------------------------------------------------------- | -------- |
| Type Safety        | All new functions have TypeScript types                  | P0       |
| Component Patterns | React components follow project patterns                 | P0       |
| State Management   | Uses approved state management (TanStack Query, Zustand) | P0       |
| Error Boundaries   | Components have error boundaries where appropriate       | P1       |
| Accessibility      | Interactive elements are keyboard accessible             | P1       |
| Test Coverage      | New code has corresponding tests                         | P0       |

See [Phase 10: Domain Compliance](references/phase-10-domain-compliance.md) for full checklist.

## Tight Feedback Loop (Phases 8-11-13)

**Implementation→Review→Test cycle with automatic iteration when review or tests fail.**

- Max iterations: Read from `orchestration-limits.yaml`
- Tracks iteration history in `{OUTPUT_DIR}/feedback-scratchpad.md`

**Pattern:** See [tight-feedback-loop.md](references/tight-feedback-loop.md)

## Checkpoint Configuration

Human approval required at specific phases based on work type:

| Work Type | Checkpoints (Phases)   |
| --------- | ---------------------- |
| BUGFIX    | 8 (implementation), 16 |
| SMALL     | 8 (implementation), 16 |
| MEDIUM    | 7 (plan), 8, 16        |
| LARGE     | 6 (design), 7, 8, 16   |

For large plans (>5 tasks), add intermediate checkpoints during implementation.

See [checkpoint-configuration.md](references/checkpoint-configuration.md) for feature-specific configuration.

## Parallel Execution

**When tasks are independent, spawn in a SINGLE message:**

```typescript
// Phase 7: Architecture - spawn leads in parallel
Task("frontend-lead", "Design frontend architecture...");
Task("security-lead", "Security assessment...");

// Phase 13: Testing - spawn testers in parallel
Task("frontend-tester", "Unit tests for components...");
Task("frontend-tester", "Integration tests for API hooks...");
Task("frontend-tester", "E2E tests for user flows...");
```

**Do NOT spawn sequentially when tasks are independent.**

## File Scope Boundaries

When spawning parallel agents:

| Agent              | Scope                                    |
| ------------------ | ---------------------------------------- |
| frontend-developer | src/sections/, src/components/ (UI code) |
| backend-developer  | modules/chariot/backend/pkg/ (Go code)   |
| frontend-reviewer  | READ-ONLY on frontend paths              |
| backend-reviewer   | READ-ONLY on backend paths               |
| frontend-tester    | test files only (_.test.tsx, _.spec.ts)  |
| backend-tester     | test files only (\*\_test.go)            |

See [file-scope-boundaries.md](references/file-scope-boundaries.md) for conflict detection protocol.

## Rationalization Prevention

<EXTREMELY-IMPORTANT>
You MUST read BOTH counter files BEFORE proceeding past any compaction gate (after phases 3, 8, or 13).

**MANDATORY at every phase transition:**
```
Read(.claude/skill-library/development/orchestrating-feature-development/references/compaction-gate-counters.md)
```

This file contains counters for:
- "Phase Transition Momentum Bias" - completing phase N and immediately starting N+1 without gate check
- "Outputs Already Persisted" - confusing file creation with compaction protocol
- "Context Seems Fine" - subjective assessment of token usage
- "Resume Workflow" bypass

**MANDATORY at gates:**
```
Read(.claude/skill-library/development/orchestrating-feature-development/references/rationalization-table.md)
```

This file contains anti-rationalization counters for "Momentum Bias", "Context Seems Fine", and other compaction gate bypass patterns.

**Phase Transition Protocol:**
1. STOP after completing any phase
2. CHECK: Is this a compaction gate? (3→4, 8→9, 13→14)
3. READ: compaction-gate-counters.md
4. If at gate: Execute 5-step compaction protocol BEFORE any other action
5. ONLY THEN proceed to next phase
</EXTREMELY-IMPORTANT>

See [rationalization-table.md](references/rationalization-table.md) for feature-specific rationalizations.
See [compaction-gate-counters.md](references/compaction-gate-counters.md) for phase transition counters.

## Emergency Abort Protocol

See [emergency-abort.md](references/emergency-abort.md) for abort triggers, cleanup options, and procedures.

**Quick Triggers:**

- User requests stop
- 3+ escalations in same phase
- Critical security finding
- Unrecoverable error
- Context window exhausted (>85% tokens)
- MAX_RETRIES exceeded on critical path

**Flow:** Stop work → Capture state → Present cleanup options → Execute cleanup → Report final state.

## Feature Directory Structure

```
.worktrees/{feature-name}/
├── .feature-development/
│   ├── MANIFEST.yaml              # Feature metadata, status, metrics
│   ├── progress.md                # Session progress tracking
│   ├── skill-manifest.yaml        # Phase 4 output: technology-to-skill mapping
│   ├── discovery.md               # Phase 3 output: codebase patterns
│   ├── architecture.md            # Phase 7 output: technical design
│   ├── plan.md                    # Phase 7 output: implementation tasks
│   ├── feedback-scratchpad.md     # Iteration history for tight feedback loop
│   └── agents/                    # Agent output files
│       ├── frontend-lead.md
│       ├── frontend-developer.md
│       └── ...
└── [feature code]                 # Actual implementation
```

## Exit Criteria

Feature development is complete when:

- ✅ All applicable phases marked "complete" in MANIFEST.yaml (based on work type)
- ✅ Discovery artifacts generated (discovery.md, skill-manifest.yaml)
- ✅ All reviewers returned verdict: APPROVED
- ✅ Test plan created and all tests implemented (quality_score >= 70)
- ✅ Final verification passed (build, lint, tests)
- ✅ Metrics tracked in MANIFEST.yaml (tokens, cost, iterations)
- ✅ Worktree cleaned up (merged and removed, OR kept per user request)
- ✅ User approves final result
- ✅ No rationalization phrases; all gate checklists passed; overrides documented

## Integration

### Called By

- `/feature` command - Primary entry point for users
- Parent orchestrators (multi-repo, epic) - Via workflow handoff protocol

### Requires (invoke before or at start)

- **`using-git-worktrees`** (LIBRARY) - Phase 1
  - Purpose: Create isolated workspace for feature development
  - `Read(".claude/skill-library/workflow/using-git-worktrees/SKILL.md")`
- **`persisting-agent-outputs`** (CORE) - Phase 1
  - Purpose: Discover output directory, set up workspace
- **`discovering-codebases-for-planning`** (CORE) - Phase 3
  - Purpose: Parallel discovery with dynamic agent count

### Calls (skill-invocation via Skill tool)

- **`brainstorming`** (CORE) - Phase 6
  - Purpose: Design refinement with human-in-loop
- **`writing-plans`** (CORE) - Phase 7
  - Purpose: Create detailed implementation plan
- **`finishing-a-development-branch`** (LIBRARY) - Phase 16
  - Purpose: Verify, PR options, cleanup
  - `Read(".claude/skill-library/workflow/finishing-a-development-branch/SKILL.md")`

### Spawns (agent-dispatch via Task tool)

- **`{domain}-lead`** + **`security-lead`** - Phase 7
  - Key Mandatory Skills: adhering-to-dry, adhering-to-yagni
- **`{domain}-developer`** - Phase 8
  - Key Mandatory Skills: developing-with-tdd, verifying-before-completion
- **`{domain}-reviewer`** + **`{domain}-security`** - Phase 11
  - Key Mandatory Skills: adhering-to-dry
- **`test-lead`** - Phase 12, 15
- **`{domain}-tester`** ×3 - Phase 13
  - Key Mandatory Skills: developing-with-tdd

### Pairs With (conditional)

- **`developing-with-subagents`** (CORE) - Plan has >3 independent tasks
  - Purpose: Fresh subagent per task + two-stage review
- **`dispatching-parallel-agents`** (CORE) - 3+ independent failures
  - Purpose: Parallel investigation of unrelated issues
- **`verifying-before-completion`** (CORE) - Phase 16 completion
  - Purpose: Final verification checklist
- **`debugging-systematically`** (CORE) - Review/test failures
  - Purpose: Systematic debugging when failures repeat

## References

### Phase Files

- [Phase 1-16 references listed above]

### Supporting Documentation

- [Agent Matrix](references/agent-matrix.md) - Agent selection by feature type
- [Checkpoint Configuration](references/checkpoint-configuration.md) - Human approval points
- [Compaction Gates](references/compaction-gates.md) - BLOCKING context management
- [Delegation Templates](references/delegation-templates.md) - Agent prompt templates
- [Directory Structure](references/directory-structure.md) - Feature workspace organization
- [Emergency Abort](references/emergency-abort.md) - Safe workflow termination
- [File Scope Boundaries](references/file-scope-boundaries.md) - Parallel agent conflict prevention
- [Progress Persistence](references/progress-persistence.md) - Cross-session resume
- [Rationalization Table](references/rationalization-table.md) - Feature-specific rationalizations
- [Tight Feedback Loop](references/tight-feedback-loop.md) - Implementation→Review→Test cycles
- [Troubleshooting](references/troubleshooting.md) - Common issues and solutions

### Prompt Templates

- [prompts/architect-prompt.md](references/prompts/architect-prompt.md) - Phase 7 leads
- [prompts/developer-prompt.md](references/prompts/developer-prompt.md) - Phase 8 developers
- [prompts/reviewer-prompt.md](references/prompts/reviewer-prompt.md) - Phase 11 reviewers
- [prompts/tester-prompt.md](references/prompts/tester-prompt.md) - Phase 13 testers

## External Sources

| Pattern                         | Source                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------- |
| Context Compaction              | https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents |
| Effort Scaling                  | https://www.anthropic.com/engineering/multi-agent-research-system                 |
| GitHub Flow (branch completion) | https://docs.github.com/en/get-started/using-github/github-flow                   |
| REQUIRED SUB-SKILL pattern      | https://github.com/obra/superpowers                                               |
| Tight Feedback Loop             | https://awesomeclaude.ai/ralph-wiggum                                             |

## Related Skills

- **orchestrating-capability-development** - Similar pattern for security capabilities
- **orchestrating-integration-development** - Similar pattern for third-party integrations
- **persisting-progress-across-sessions** - Cross-session persistence for long-running features
- **developing-with-subagents** - Same-session subagent execution with code review
