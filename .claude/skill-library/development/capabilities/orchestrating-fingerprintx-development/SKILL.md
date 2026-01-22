---
name: orchestrating-fingerprintx-development
description: Use when creating new fingerprintx modules - coordinates brainstorming, planning, architecture, implementation, review, and testing phases with parallel agent execution and feedback loops
allowed-tools: Skill, Task, TodoWrite, Read, Glob, Grep, AskUserQuestion, Bash
---

# Fingerprintx Development Orchestration

**Systematically guide fingerprintx plugin development through sixteen phases with parallel agent execution, explicit feedback loops, and structured output directories.**

## Overview

This skill orchestrates complete fingerprintx plugin development from concept to tested code using a 16-phase workflow with fingerprintx-specific customizations.

**Orchestration is NOT implementation.** The orchestrator's responsibilities are:

1. **Analyze** plugin scope and complexity
2. **Decompose** into specialized subtasks
3. **Delegate** to appropriate agents (leads, developers, reviewers, testers)
4. **Synthesize** results into coherent output
5. **Track progress** across the workflow

## When to Use This Skill

Use this skill when you need to:

- Create a new fingerprintx plugin for service fingerprinting
- User says "Create a {protocol} fingerprintx module"
- Coordinate multiple specialized agents (leads, developers, reviewers, testers)
- Ensure quality through parallel review (code + security)
- Maintain progress with structured handoffs and feedback loops

**Symptoms this skill addresses:**

- Manual orchestration of skills and agents
- Sequential execution when parallel is possible
- Missing protocol research before implementation
- No feedback loops before escalation
- Lost context between sessions

## State Tracking (MANDATORY)

**MUST use TodoWrite BEFORE starting any orchestration workflow.**

Multi-phase orchestration involves coordinating multiple agents. Without external state tracking, context drift causes forgotten phases, repeated spawns, and missed verification steps.

**Create TodoWrite items for each phase BEFORE spawning any agents.**

## Standard Phase Template

| Phase | Name                  | Purpose                                             | Conditional | Gate         |
| ----- | --------------------- | --------------------------------------------------- | ----------- | ------------ |
| 1     | Setup                 | Worktree creation, output directory, MANIFEST.yaml  | Always      |              |
| 2     | Triage                | Classify work type, select phases to execute        | Always      |              |
| 3     | Codebase Discovery    | Explore codebase patterns, detect technologies      | Always      | :no_entry: 1 |
| 4     | Skill Discovery       | Map technologies to skills, write manifest          | Always      |              |
| 5     | Complexity            | Technical complexity assessment, execution strategy | Always      |              |
| 6     | Brainstorming         | Design refinement with human-in-loop                | LARGE only  |              |
| 7     | Architecture Plan     | Technical design AND task decomposition             | MEDIUM+     |              |
| 8     | Implementation        | Code development                                    | Always      | :no_entry: 2 |
| 9     | Design Verification   | Verify implementation matches plan                  | MEDIUM+     |              |
| 10    | Domain Compliance     | Fingerprintx-specific mandatory patterns validation | Always      |              |
| 11    | Code Quality          | Code review for maintainability                     | Always      |              |
| 12    | Test Planning         | Test strategy and plan creation                     | MEDIUM+     |              |
| 13    | Testing               | Test implementation and execution                   | Always      | :no_entry: 3 |
| 14    | Coverage Verification | Verify test coverage meets threshold                | Always      |              |
| 15    | Test Quality          | No low-value tests, correct assertions, all pass    | Always      |              |
| 16    | Completion            | Final verification, PR, cleanup                     | Always      |              |

**:no_entry: = Compaction Gate** - BLOCKING checkpoint requiring [compaction-gates.md](references/compaction-gates.md) protocol before next phase.

**Work Types:** BUGFIX, SMALL, MEDIUM, LARGE (determined in Phase 2: Triage)

**Phase Skip Matrix:**

| Work Type | Skipped Phases       |
| --------- | -------------------- |
| BUGFIX    | 6, 7, 9, 12          |
| SMALL     | 6, 7, 9              |
| MEDIUM    | 6                    |
| LARGE     | None (all 16 phases) |

## Quick Reference

| Phase | Agents                                   | Execution          | Checkpoint            |
| ----- | ---------------------------------------- | ------------------ | --------------------- |
| 1     | -                                        | Setup              | -                     |
| 2     | -                                        | Triage             | -                     |
| 3     | Explore (1-10 via discovering-codebases) | **PARALLEL**       | -                     |
| 4     | -                                        | Skill mapping      | -                     |
| 5     | -                                        | Assessment         | -                     |
| 6     | brainstorming skill                      | Sequential         | :stop_sign: Human     |
| 7     | capability-lead + security-lead          | **PARALLEL**       | :stop_sign: Human     |
| 8     | capability-developer                     | Mode-dependent     | Per-task if 4+        |
| 9     | -                                        | Verification       | -                     |
| 10    | -                                        | Compliance check   | Violations -> Human   |
| 11    | capability-reviewer + backend-security   | **PARALLEL**       | 2+1 retry -> escalate |
| 12    | test-lead                                | Sequential         | -                     |
| 13    | capability-tester x3                     | **PARALLEL**       | -                     |
| 14    | -                                        | Coverage check     | -                     |
| 15    | test-lead                                | Sequential         | 1 retry -> escalate   |
| 16    | -                                        | Final verification | -                     |

## Configuration

This skill uses `.claude/config/orchestration-limits.yaml`:

| Section        | Scope                               | Used For                             |
| -------------- | ----------------------------------- | ------------------------------------ |
| `inter_phase`  | Implementation->Review->Test cycles | tight-feedback-loop pattern          |
| `orchestrator` | Re-invoking entire patterns         | Retry limits in Orchestration Guards |

> **No Unilateral Overrides**: Agents MUST NOT override config values. To change limits, update the config file or get user approval via AskUserQuestion.

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
- [Phase 10: Domain Compliance](references/phase-10-domain-compliance.md) - Fingerprintx-specific mandatory patterns
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
- Fingerprintx-specific content lists
- Rationalization counters

**Token Monitoring:** See [context-monitoring.md](references/context-monitoring.md) for programmatic token tracking via JSONL.

## Agent Matrix for Fingerprintx Development

| Plugin Type   | Phase 7 Agents                 | Phase 8 Agents       | Phase 11 Agents                       | Phase 13 Agents      |
| ------------- | ------------------------------ | -------------------- | ------------------------------------- | -------------------- |
| Open-Source   | capability-lead, security-lead | capability-developer | capability-reviewer, backend-security | capability-tester x3 |
| Closed-Source | capability-lead, security-lead | capability-developer | capability-reviewer, backend-security | capability-tester x3 |

**Note:** Plugin type affects Phase 3 (version marker research required for open-source, optional for closed-source) but not the agent matrix.

## Fingerprintx-Specific Domain Compliance (Phase 10)

Fingerprintx development has specific P0 requirements:

| Check               | Description                                              | Severity |
| ------------------- | -------------------------------------------------------- | -------- |
| Protocol Detection  | Service/protocol identification logic implemented        | P0       |
| Banner Parsing      | Banner response parsing handles malformed input          | P0       |
| Default Ports       | Default port(s) documented and used                      | P0       |
| Type Constants      | Type constant added to pkg/plugins/types.go              | P0       |
| Plugin Import       | Plugin imported in pkg/plugins/plugins.go (alphabetical) | P0       |
| Version Extraction  | Version extraction implemented (if open-source)          | P1       |
| Shodan Test Vectors | At least 3 Shodan query test vectors documented          | P1       |
| Error Handling      | Connection errors handled gracefully                     | P0       |

See [Phase 10: Domain Compliance](references/phase-10-domain-compliance.md) for full checklist and [p0-compliance.md](references/p0-compliance.md) for validation protocol.

## Tight Feedback Loop (Phases 8-11-13)

**Implementation->Review->Test cycle with automatic iteration when review or tests fail.**

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

See [checkpoint-configuration.md](references/checkpoint-configuration.md) for fingerprintx-specific configuration.

## Parallel Execution

**When tasks are independent, spawn in a SINGLE message:**

```typescript
// Phase 7: Architecture - spawn leads in parallel
Task("capability-lead", "Design plugin architecture...");
Task("security-lead", "Security assessment...");

// Phase 13: Testing - spawn testers in parallel
Task("capability-tester", "Unit tests for protocol detection...");
Task("capability-tester", "Docker container tests for multi-version...");
Task("capability-tester", "Live Shodan validation tests...");
```

**Do NOT spawn sequentially when tasks are independent.**

## File Scope Boundaries

When spawning parallel agents:

| Agent                | Scope                                 |
| -------------------- | ------------------------------------- |
| capability-developer | pkg/plugins/{protocol}/ (plugin code) |
| capability-reviewer  | READ-ONLY on plugin paths             |
| capability-tester    | test files only (\*\_test.go)         |

See [file-scope-boundaries.md](references/file-scope-boundaries.md) for conflict detection protocol.

## Rationalization Prevention

<EXTREMELY-IMPORTANT>
You MUST read rationalization-table.md BEFORE proceeding past any compaction gate (after phases 3, 8, or 13).

```
Read(.claude/skill-library/development/capabilities/orchestrating-fingerprintx-development/references/rationalization-table.md)
```

This file contains anti-rationalization counters for "Protocol is simple", "Version markers aren't needed", and other compaction gate bypass patterns.
</EXTREMELY-IMPORTANT>

See [rationalization-table.md](references/rationalization-table.md) for fingerprintx-specific rationalizations.

## Emergency Abort Protocol

**Triggers:** User request, 3+ escalations in same phase, critical security finding, unrecoverable error, cost/time exceeded.

**Flow:** Stop work -> Capture state -> Present cleanup options -> Execute cleanup -> Report final state.

See [emergency-abort.md](references/emergency-abort.md) for configuration.

## Fingerprintx Directory Structure

```
.worktrees/{protocol}-fingerprintx/
+-- .fingerprintx-development/
|   +-- MANIFEST.yaml              # Plugin metadata, status, metrics
|   +-- progress.md                # Session progress tracking
|   +-- skill-manifest.yaml        # Phase 4 output: technology-to-skill mapping
|   +-- discovery.md               # Phase 3 output: codebase patterns
|   +-- protocol-research.md       # Phase 3 output: protocol detection strategy
|   +-- version-matrix.md          # Phase 3 output: version fingerprint matrix (if open-source)
|   +-- architecture.md            # Phase 7 output: technical design
|   +-- plan.md                    # Phase 7 output: implementation tasks
|   +-- feedback-scratchpad.md     # Iteration history for tight feedback loop
|   +-- agents/                    # Agent output files
|       +-- capability-lead.md
|       +-- capability-developer.md
|       +-- ...
+-- [plugin code]                  # Actual implementation
```

## Exit Criteria

Fingerprintx development is complete when:

- All applicable phases marked "complete" in MANIFEST.yaml (based on work type)
- Discovery artifacts generated (discovery.md, skill-manifest.yaml, protocol-research.md)
- All reviewers returned verdict: APPROVED
- Test plan created and all tests implemented (quality_score >= 70)
- Final verification passed (go build, go vet, go test)
- Protocol detection validated against real services (Shodan or Docker)
- Metrics tracked in MANIFEST.yaml (tokens, cost, iterations)
- Worktree cleaned up (merged and removed, OR kept per user request)
- User approves final result
- No rationalization phrases; all gate checklists passed; overrides documented

## Integration

### Called By

- `/fingerprintx` command - Primary entry point for users
- Parent orchestrators (capability, multi-repo) - Via workflow handoff protocol

### Requires (invoke before or at start)

- **`using-git-worktrees`** (CORE) - Phase 1
  - Purpose: Create isolated workspace
  - `skill: "using-git-worktrees"`

- **`persisting-agent-outputs`** (LIBRARY) - Phase 1
  - Purpose: Discover output directory, set up workspace
  - `Read(".claude/skill-library/claude/persisting-agent-outputs/SKILL.md")`

- **`discovering-codebases-for-planning`** (CORE) - Phase 3
  - Purpose: Parallel discovery with dynamic agent count
  - `skill: "discovering-codebases-for-planning"`

### Calls (skill-invocation via Skill tool)

- **`brainstorming`** (CORE) - Phase 6
  - Purpose: Design refinement with human-in-loop
  - `skill: "brainstorming"`

- **`writing-plans`** (CORE) - Phase 7
  - Purpose: Create detailed implementation plan
  - `skill: "writing-plans"`

- **`finishing-a-development-branch`** (CORE) - Phase 16
  - Purpose: Verify, PR options, cleanup
  - `skill: "finishing-a-development-branch"`

### Spawns (agent-dispatch via Task tool)

- **`capability-lead` + `security-lead`** - Phase 7
  - Key Mandatory Skills: adhering-to-dry, adhering-to-yagni
  - Spawned via `Task("capability-lead", ...)` and `Task("security-lead", ...)`

- **`capability-developer`** - Phase 8
  - Key Mandatory Skills: developing-with-tdd, verifying-before-completion
  - Spawned via `Task("capability-developer", ...)`

- **`capability-reviewer` + `backend-security`** - Phase 11
  - Key Mandatory Skills: adhering-to-dry
  - Spawned via `Task("capability-reviewer", ...)` and `Task("backend-security", ...)`

- **`test-lead`** - Phases 12, 15
  - Spawned via `Task("test-lead", ...)`

- **`capability-tester` x3** - Phase 13
  - Key Mandatory Skills: developing-with-tdd
  - Spawned via `Task("capability-tester", ...)` (3 parallel instances)

### Pairs With (conditional)

| Skill                         | Trigger                       | Purpose                                    |
| ----------------------------- | ----------------------------- | ------------------------------------------ |
| `developing-with-subagents`   | Plan has >3 independent tasks | Fresh subagent per task + two-stage review |
| `dispatching-parallel-agents` | 3+ independent failures       | Parallel investigation of unrelated issues |
| `verifying-before-completion` | Phase 16 completion           | Final verification checklist               |
| `debugging-systematically`    | Review/test failures          | Systematic debugging when failures repeat  |

## Fingerprintx-Specific Skills

| Skill (Library)                | Phase    | Purpose                                       |
| ------------------------------ | -------- | --------------------------------------------- |
| `researching-protocols`        | Phase 3  | Protocol banner patterns, detection strategy  |
| `researching-version-markers`  | Phase 3  | Version fingerprint matrix (open-source only) |
| `writing-fingerprintx-modules` | Phase 8  | Go plugin implementation patterns             |
| `writing-fingerprintx-tests`   | Phase 13 | Unit, Docker, Shodan test patterns            |
| `validating-live-with-shodan`  | Phase 14 | Real-world validation protocol                |

## References

### Phase Files

- [Phase 1-16 references listed above]

### Supporting Documentation

- [Agent Matrix](references/agent-matrix.md) - Agent selection by plugin type
- [Checkpoint Configuration](references/checkpoint-configuration.md) - Human approval points
- [Compaction Gates](references/compaction-gates.md) - BLOCKING context management
- [Delegation Templates](references/delegation-templates.md) - Agent prompt templates
- [Directory Structure](references/directory-structure.md) - Plugin workspace organization
- [Emergency Abort](references/emergency-abort.md) - Safe workflow termination
- [File Scope Boundaries](references/file-scope-boundaries.md) - Parallel agent conflict prevention
- [Progress Persistence](references/progress-persistence.md) - Cross-session resume
- [Rationalization Table](references/rationalization-table.md) - Fingerprintx-specific rationalizations
- [Tight Feedback Loop](references/tight-feedback-loop.md) - Implementation->Review->Test cycles
- [Troubleshooting](references/troubleshooting.md) - Common issues and solutions

### Orchestration Infrastructure

- [Context Monitoring](references/context-monitoring.md) - Token tracking via JSONL
- [Error Recovery](references/error-recovery.md) - Recovery framework for failed phases
- [Escalation Protocol](references/escalation-protocol.md) - Decision tree for escalations
- [File Conflict Protocol](references/file-conflict-protocol.md) - Proactive conflict detection
- [File Locking](references/file-locking.md) - Distributed locks for parallel agents
- [Orchestration Guards](references/orchestration-guards.md) - Retry limits and checkpoints
- [P0 Compliance](references/p0-compliance.md) - Domain-specific P0 requirements
- [Quality Scoring](references/quality-scoring.md) - Review and test quality metrics
- [Workflow Handoff](references/workflow-handoff.md) - Parent-child workflow integration

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

- **orchestrating-capability-development** - Similar pattern for other security capabilities
- **orchestrating-feature-development** - Similar pattern for product features
- **persisting-progress-across-sessions** - Cross-session persistence for long-running plugins
- **developing-with-subagents** - Same-session subagent execution with code review
