# Multi-Agent Orchestration Architecture

**Complete architectural documentation for multi-agent AI systems based on research from Anthropic, industry practitioners, and analysis of the Chariot Development Platform's implementation.**

---

## Table of Contents

1. [The Problem](#the-problem)
2. [The Solution: Orchestrator-Worker Pattern](#the-solution-orchestrator-worker-pattern)
3. [Architecture Overview](#architecture-overview)
4. [Core Principles](#core-principles)
5. [Pattern Catalog](#pattern-catalog)
6. [Skill Composition Patterns](#skill-composition-patterns)
7. [Quality Gates](#quality-gates)
8. [Token Economics & Effort Scaling](#token-economics--effort-scaling)
9. [FAQ](#faq)
10. [References](#references)
11. [Pattern Source Index](#pattern-source-index) - Quick lookup for missing pattern references
12. [Appendix](#appendix) - Implementation Scorecard, Gap Analysis, Action Plan

---

## The Problem

Complex software engineering tasks exceed the capabilities of single-agent AI systems. From Anthropic's multi-agent research:

> "Research tasks involve unpredictable paths that can't be hardcoded. The process is inherently dynamic and path-dependent."

### 1. Context Window Limitations

Single agents have finite context windows. Complex tasks—like implementing a feature with architecture, implementation, testing, and review—exceed what one agent can track. Information gets lost, decisions get forgotten, and quality degrades as context fills.

### 2. Expertise Fragmentation

No single agent can excel at everything. Architecture requires different reasoning than implementation. Testing requires different patterns than code review. Security analysis requires specialized knowledge. Forcing one agent to do all roles produces mediocre results across all phases.

### 3. Path Dependency and Parallelization

Sequential single-agent execution creates bottlenecks. Independent tasks (unit tests, E2E tests, integration tests) that could run in parallel instead wait for each other. Research tasks requiring breadth-first exploration get stuck in depth-first tunnels.

### 4. Token Economics Trap

Multi-agent systems use **~15x more tokens** than single-agent chat. Without careful orchestration, this cost explodes on simple tasks that don't need coordination. The challenge: know WHEN to orchestrate and WHEN to delegate directly.

### 5. Coordination Overhead

When you DO need multiple agents, coordinating them is hard:

- How do agents hand off context to each other?
- How do you prevent agents from editing the same files?
- How do you know when the workflow is done?
- How do you recover when an agent fails?

---

## The Solution: Orchestrator-Worker Pattern

From Anthropic's multi-agent research system, which **outperformed single-agent Claude Opus 4 by 90.2%**:

> "A lead agent analyzes queries, develops strategy, and spawns specialized subagents to explore different aspects simultaneously."

### Critical Constraint: No Nested Spawning

**Subagents cannot spawn other subagents.** This is a fundamental Claude Code constraint to prevent infinite nesting.

In Claude Code, the "lead" from Anthropic's research is implemented as a **Skill running in the main conversation**, not as an agent:

- **Skills** run in main conversation → CAN spawn subagents via Task tool
- **Subagents** run in isolated context → CANNOT spawn other subagents
- **Chaining** happens by returning to main conversation between agents

### Core Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│              ORCHESTRATOR (Skill in Main Conversation)              │
│  • Analyzes task scope and complexity                               │
│  • Decomposes into specialized subtasks                             │
│  • Spawns workers with clear objectives                             │
│  • Synthesizes results into coherent output                         │
│  • Tracks progress and handles failures                             │
│                                                                     │
│  Tools: Task, TodoWrite, Read, AskUserQuestion                      │
│  Note: NO Write, Edit - orchestrators coordinate, never implement   │
└────────────────────────────────────┬────────────────────────────────┘
                                     │ spawns (via Task tool)
          ┌──────────────────────────┼──────────────────────────┐
          ▼                          ▼                          ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   ARCHITECT     │      │   DEVELOPER     │      │    TESTER       │
│   (Subagent)    │      │   (Subagent)    │      │   (Subagent)    │
│                 │      │                 │      │                 │
│ Fresh context   │      │ Fresh context   │      │ Fresh context   │
│ CANNOT spawn    │      │ CANNOT spawn    │      │ CANNOT spawn    │
│ Returns JSON    │      │ Returns JSON    │      │ Returns JSON    │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

### Key Principles

| Principle                          | Problem Solved          | Implementation                             |
| ---------------------------------- | ----------------------- | ------------------------------------------ |
| **Orchestrator-Worker Separation** | Expertise fragmentation | Skill coordinates, subagents implement     |
| **Fresh Context Per Task**         | Context window limits   | Each worker gets isolated, focused context |
| **Parallel Execution**             | Path dependency         | Independent tasks in single message        |
| **Structured Handoffs**            | Coordination overhead   | JSON schemas for predictable communication |
| **Progress Persistence**           | Context exhaustion      | External state files survive resets        |
| **Validation Gates**               | Quality assurance       | Checks between phases catch errors early   |
| **Effort Scaling**                 | Token economics trap    | Match agent count to task complexity       |

### When to Orchestrate vs Delegate Directly

| Task Type                               | Approach                             | Why                                        |
| --------------------------------------- | ------------------------------------ | ------------------------------------------ |
| Bug fix, typo, add prop                 | **Delegate directly** (1 agent)      | Simple tasks don't justify 15x token cost  |
| Implement + test one feature            | **Light orchestration** (2-4 agents) | Moderate complexity, some parallelization  |
| Full feature with arch/impl/review/test | **Full orchestration** (5-10 agents) | Complexity justifies coordination overhead |
| Cross-cutting refactor, new subsystem   | **Major orchestration** (10+ agents) | Parallel phases essential for efficiency   |

---

## Architecture Overview

### Three-Tier Agent System

```
┌────────────────────────────────────────────────────────────-───────────────┐
│                         TIER 1: ORCHESTRATION SKILLS                       │
│      Analyze → Decompose → Delegate → Synthesize → Track Progress          │
│                                                                            │
│   Skill("orchestrating-feature-development")  ← Runs IN main conversation  │
│   Skill("orchestrating-capability-development")                            │
│   Skill("orchestrating-integration-development")                           │
│                                                                            │
│   Tools: Task, TodoWrite, Read, AskUserQuestion, Glob, Grep                │
│   Note: NO Write, Edit - orchestrators coordinate, never implement         │
└────────────────────────────────────┬───────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────-─────┐
│                         TIER 2: SPECIALIST AGENTS                          │
│   Focused expertise with implementation tools                              │
│                                                                            │
│    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│    │  Architects  │ │  Developers  │ │   Reviewers  │ │  Testers     │     │
│    │ (Design)     │ │ (Implement)  │ │ (Quality)    │ │ (Validate)   │     │
│    └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘     │
│                                                                            │
│   Tools: Bash, Edit, Write, Read, Glob, Grep, MultiEdit, TodoWrite         │
└────────────────────────────────────┬─────────────────────────────────────-─┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────-──┐
│                         TIER 3: SKILLS                                     │
│  Reusable behavioral modules loaded on-demand                              │
│                                                                            │
│  Core Skills (~42)            │  Library Skills (~130)                     │
│  .claude/skills/              │  .claude/skill-library/                    │
│  ├── developing-with-tdd      │  ├── frontend/                             │
│  ├── debugging-systematically │  ├── backend/                              │
│  ├── brainstorming            │  ├── testing/                              │
│  └── ...                      │  └── security/                             │
└─────────────────────────────────────────────────────────────────-──────────┘
```

### Execution Flow

```
User Request
     │
     ▼
┌───────────────────────────────────────────────────────────────────────-──┐
│  PHASE 1: ANALYSIS                                                       │
│  Orchestrator determines: Architecture? Implementation? Testing?         │
│  Creates TodoWrite items for all phases                                  │
└────────────────────────────────────────────────────────────────────────-─┘
     │
     ▼
┌───────────────────────────────────────────────────────────────────────-──┐
│  PHASE 2: DECOMPOSITION                                                  │
│  Map dependencies: Sequential vs Parallel vs Hybrid                      │
│  Architecture → Implementation (sequential)                              │
│  Unit ↔ E2E ↔ Integration tests (parallel)                               │
└────────────────────────────────────────────────────────────────────-─────┘
     │
     ▼
┌────────────────────────────────────────────────────────────────────-─────┐
│  PHASE 3: DELEGATION                                                     │
│  Spawn agents with: Objective + Context + Scope + Expected Output        │
│  Parallel agents in SINGLE message for concurrency                       │
└────────────────────────────────────────────────────────────────────-─────┘
     │
     ▼
┌────────────────────────────────────────────────────────────────-─────────┐
│  PHASE 4: SYNTHESIS                                                      │
│  Collect agent outputs (structured JSON)                                 │
│  Check for conflicts, run validators, integrate changes                  │
└─────────────────────────────────────────────────────────────────-────────┘
     │
     ▼
┌────────────────────────────────────────────────────────────────-─────────┐
│  PHASE 5: VERIFICATION                                                   │
│  All tests passing? Build successful? User approves?                     │
│  Update progress file, mark TodoWrite complete                           │
└────────────────────────────────────────────────────────────────--────────┘
```

### Tight Feedback Loop (Category 11)

```
┌─────────────────────────────────────────────────────────────────┐
│  Phases 1-3: Brainstorm → Plan → Architecture (sequential)      │
│                                                                 │
│  Phases 4-6: TIGHT FEEDBACK LOOP                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  ┌──────────────┐                                         │  │
│  │  │ Implement    │ ←─────────────────────────────────────┐ │  │
│  │  └──────────────┘                                       │ │  │
│  │         ↓                                               │ │  │
│  │  ┌──────────────┐    fails                              │ │  │
│  │  │ Review       │ ───────────────────────────────────→──┘ │  │
│  │  └──────────────┘                                         │  │
│  │         ↓ passes                                          │  │
│  │  ┌──────────────┐    fails                                │  │
│  │  │ Test         │ ───────────────────────────────────→────┘  │
│  │  └──────────────┘                                            │
│  │         ↓ passes                                             │
│  │  FEATURE_COMPLETE                                            │
│  └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Why this matters:** Current orchestrations treat phases as sequential with manual intervention on failure. The Ralph pattern treats Implementation→Review→Test as a tight loop that automatically retries until `FEATURE_COMPLETE` or safety limit.

### Ideal State: Complete Orchestration Flow

This diagram shows all patterns working together in a properly orchestrated system:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER REQUEST                                      │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│   EFFORT SCALING DECISION (Pattern 3.4)                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ Simple (bug fix)?     → Delegate directly to 1 agent (skip below)   │   │
│   │ Moderate (feature)?   → Light orchestration (2-4 agents)            │   │
│   │ Complex (full feat)?  → Full orchestration (continue below)         │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: SETUP                                                             │
│  • Initialize progress.json (Pattern 6.1)                                   │
│  • Create output directory (persisting-agent-outputs)                       │
│  • TodoWrite for all phases (Pattern 2.1)                                   │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: BRAINSTORMING                                                     │
│  • Invoke brainstorming skill                                               │
│  • Write to context/ directory                                              │
│  ⏸ CHECKPOINT: User approves design direction (Pattern 2.3)                 │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: PLANNING                                                          │
│  • Invoke writing-plans skill                                               │
│  • Write plan.md with tasks                                                 │
│  ⏸ CHECKPOINT: User approves plan (Pattern 2.3)                             │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 4: ARCHITECTURE                                                      │
│  • Spawn *-lead agent (Pattern 3.1: mandatory skills in prompt)             │
│  • Agent returns structured JSON (Pattern 1.3)                              │
│  • Validation loop: max 3 retries (Pattern 4.3)                             │
│  ⏸ CCHECKPOINT: User approves architecture (Pattern 2.3)                    │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASES 5-7: TIGHT FEEDBACK LOOP (Pattern 11.5)                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  max_feedback_iterations: 5                                           │  │
│  │  scratchpad: .claude/.output/{feature}/feedback-scratchpad.md         │  │
│  │                                                                       │  │
│  │  ┌─────────────┐                                                      │  │
│  │  │ IMPLEMENT   │ ← Spawn *-developer with context from prior iter     │  │
│  │  │ (Phase 5)   │   File scope boundaries (Pattern 3.5)                │  │
│  │  └──────┬──────┘   Parallel if independent (Pattern 1.4)              │  │
│  │         ▼                                                             │  │
│  │  ┌─────────────┐                                                      │  │
│  │  │ REVIEW      │ ← Two-stage: spec compliance → quality (Pattern 4.1) │  │
│  │  │ (Phase 6)   │   Requirements verification (Pattern 4.4)            │  │
│  │  └──────┬──────┘                                                      │  │
│  │         │ fails → record in scratchpad → back to IMPLEMENT            │  │
│  │         ▼ passes                                                      │  │
│  │  ┌─────────────┐                                                      │  │
│  │  │ TEST        │ ← Spawn *-tester agents (parallel if independent)    │  │
│  │  │ (Phase 7)   │   Validation loop: max 3 retries (Pattern 4.3)       │  │
│  │  └──────┬──────┘                                                      │  │
│  │         │ fails → record in scratchpad → back to IMPLEMENT            │  │
│  │         ▼ passes                                                      │  │
│  │  ┌─────────────┐                                                      │  │
│  │  │ SECURITY?   │ ← Conditional: auth/input/secrets (Pattern 8.2)      │  │
│  │  │ (Optional)  │   Spawn *-security agent if triggered                │  │
│  │  └──────┬──────┘                                                      │  │
│  │         ▼                                                             │  │
│  │  IMPLEMENTATION_VERIFIED (completion promise, Pattern 11.1)           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  If max iterations exceeded → ESCALATE to user (Pattern 7.2)                │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 8: COMPLETION                                                        │
│  • Context compaction (Pattern 5.2)                                         │
│  • Invoke finishing-a-development-branch skill                              │
│  • Update progress.json: status = "complete"                                │
│  • Final verification (verifying-before-completion)                         │
│  ⏸ CHECKPOINT: User approves final result (Pattern 2.3)                     │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FEATURE_COMPLETE                                    │
│  Output: .claude/.output/features/{id}/                                     │
│  ├── progress.json (final state)                                            │
│  ├── context/ (brainstorming artifacts)                                     │
│  ├── plan.md (implementation plan)                                          │
│  ├── architecture/ (design decisions)                                       │
│  ├── implementation/ (agent outputs)                                        │
│  ├── testing/ (test results)                                                │
│  └── feedback-scratchpad.md (iteration history)                             │
└─────────────────────────────────────────────────────────────────────────────┘

LEGEND:
  ⏸️ = Human checkpoint (requires user approval)
  → = Automatic flow
  ← = Loop back on failure
```

---

## Core Principles

### Principle 1: Orchestrator-Worker Separation

**Orchestrators coordinate; they never implement.**

```markdown
# Orchestrator (Skill running in main conversation)

tools: Task, TodoWrite, Read, Glob, Grep, AskUserQuestion

# Note: NO Write, Edit, Bash - cannot modify code

# Worker Agent (Spawned subagent)

tools: Bash, Edit, Write, Read, Glob, Grep, MultiEdit, TodoWrite

# Has implementation tools
```

**Why this matters:** Prevents orchestrators from "doing it themselves" and bypassing specialists. Enforces clear responsibility boundaries.

### Principle 2: Fresh Context Per Task

Each agent spawn uses a NEW instance with isolated context. No context pollution from prior tasks.

**Anti-pattern:** Sharing full conversation history with subagents defeats their primary benefit—focused work with minimal tokens.

### Principle 3: Parallel vs Sequential Protocol

| Use Parallel When                          | Use Sequential When                           |
| ------------------------------------------ | --------------------------------------------- |
| Tasks have no data dependencies            | Later task needs earlier task's output        |
| Agents modify different files              | Agents would modify same files                |
| 3+ independent failures need investigation | Order matters (architecture → implementation) |

**Syntax:** All parallel agents in SINGLE message with multiple Task calls.

### Principle 4: Structured Handoffs

All agents return structured JSON for predictable orchestration:

```json
{
  "agent": "frontend-developer",
  "output_type": "implementation",
  "timestamp": "2026-01-16T15:45:00Z",
  "feature_directory": ".claude/.output/features/...",
  "skills_invoked": ["developing-with-tdd", "verifying-before-completion"],
  "status": "complete|blocked|needs_review",
  "blocked_reason": "security_concern|architecture_decision|missing_requirements|test_failures|out_of_scope|unknown",
  "attempted": ["What agent tried before blocking"],
  "handoff": {
    "next_agent": null,
    "context": "Key information for next phase"
  }
}
```

**Key rule:** When `status: "blocked"`, set `handoff.next_agent` to `null`. Orchestrator uses routing table to decide next steps.

### Principle 5: Progress Persistence

External state files survive context exhaustion and session interruptions:

```
.claude/.output/features/{feature-id}/
├── progress.json                   # Machine-readable state
├── context/                        # Requirements
├── architecture/                   # Design decisions
├── implementation/                 # Agent outputs
└── testing/                        # Test results
```

### Principle 6: Human Checkpoints

Get explicit approval before irreversible phases:

```
Phase 1: Brainstorming  → CHECKPOINT (User approves design)
Phase 2: Planning       → CHECKPOINT (User approves plan)
Phase 3: Architecture   → Automated (dual-agent validation)
Phase 4: Implementation → Automated
Phase 5: Testing        → CHECKPOINT (User approves final result)
```

---

## Pattern Catalog

### Category 1: Core Architecture (6 patterns)

| #   | Pattern                         |
| --- | ------------------------------- |
| 1.1 | Orchestrator-Worker Separation  |
| 1.2 | Fresh Context Per Task          |
| 1.3 | Structured Handoffs             |
| 1.4 | Parallel vs Sequential Protocol |
| 1.5 | Prompt Templates in Skill       |
| 1.6 | Commands as Thin Wrappers       |

- **1.1**: Orchestrators coordinate (no Write/Edit), workers implement — [Anthropic Multi-Agent Research](https://www.anthropic.com/engineering/multi-agent-research-system)
- **1.2**: Each agent spawn uses NEW instance, no context pollution — [Anthropic Multi-Agent Research](https://www.anthropic.com/engineering/multi-agent-research-system)
- **1.3**: JSON schemas with status/blocked_reason/handoff fields — _persisting-agent-outputs skill_
- **1.4**: Parallel when independent, sequential when dependent — [Anthropic Multi-Agent Research](https://www.anthropic.com/engineering/multi-agent-research-system)
- **1.5**: references/prompts/ with MANDATORY SKILLS embedded — [obra/superpowers](https://github.com/obra/superpowers)
- **1.6**: Commands only invoke skills, no logic duplication — [obra/superpowers](https://github.com/obra/superpowers)

### Category 2: Phase Management (5 patterns)

| #   | Pattern                                 |
| --- | --------------------------------------- |
| 2.1 | TodoWrite Tracking Mandatory            |
| 2.2 | Phase Numbering Consistency             |
| 2.3 | Human Checkpoints                       |
| 2.4 | Checkpoint Configuration Documented     |
| 2.5 | Context Compaction at Phase Transitions |

- **2.1**: Create todos at workflow start, update real-time — [TodoWrite Tracking](https://platform.claude.com/docs/en/agent-sdk/todo-tracking)
- **2.2**: Sequential numbers, referenced in prompts/docs — _internal convention_
- **2.3**: Strategic user approval (design, architecture, completion) — [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
- **2.4**: When/why/how for each checkpoint — _internal convention_
- **2.5**: Summarize every 3 phases, archive to files — [Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

### Category 3: Agent Coordination (7 patterns)

| #   | Pattern                       |
| --- | ----------------------------- |
| 3.1 | Mandatory Skills in Prompts   |
| 3.2 | Agent Matrix Documentation    |
| 3.3 | Blocked Status Routing        |
| 3.4 | Effort Scaling Decision       |
| 3.5 | File Scope Boundaries         |
| 3.6 | Proactive Conflict Prevention |
| 3.7 | File Locking Mechanism        |

- **3.1**: OUTPUT_DIRECTORY + MANDATORY SKILLS section — [obra/superpowers](https://github.com/obra/superpowers)
- **3.2**: Which agents, when, with what mandatory skills — _internal convention_
- **3.3**: orchestrating-multi-agent-workflows routing table — _internal skill_
- **3.4**: Simple=1 agent, Moderate=2-4, Complex=5-10, Major=10+ — [Anthropic Multi-Agent Research](https://www.anthropic.com/engineering/multi-agent-research-system)
- **3.5**: "Only modify src/components/filters/", check overlap before parallel — [Context Parallelism](https://www.agalanov.com/notes/efficient-claude-code-context-parallelism-sub-agents/)
- **3.6**: Identify file boundaries before spawning, prevent simultaneous modifications — [Context Parallelism](https://www.agalanov.com/notes/efficient-claude-code-context-parallelism-sub-agents/)
- **3.7**: .claude/locks/{agent-name}.lock with file list — _internal convention (P4)_

### Category 4: Quality Gates (8 patterns)

| #   | Pattern                            |
| --- | ---------------------------------- |
| 4.1 | Two-Stage Review                   |
| 4.2 | Validation Loops with Retry Limits |
| 4.3 | Explicit Validation Loop Protocol  |
| 4.4 | Requirements Verification Phase    |
| 4.5 | Blocking Gates                     |
| 4.6 | Gate Override Protocol             |
| 4.7 | P0/Compliance Validation           |
| 4.8 | Complexity Analysis in Review      |

- **4.1**: Spec compliance (BLOCKING) → Code quality (parallel) — [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
- **4.2**: MAX 2-3 retries per stage, then escalate — [ralph-orchestrator](https://github.com/mikeyobrien/ralph-orchestrator)
- **4.3**: Max 3 iterations per phase, phase-specific validators, pass criteria — [ralph-orchestrator](https://github.com/mikeyobrien/ralph-orchestrator)
- **4.4**: Pre-review checklist: all requirements implemented? — _internal convention_
- **4.5**: Cannot proceed until conditions met — _internal convention_
- **4.6**: Explicit user approval via AskUserQuestion, documented — [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
- **4.7**: Domain-specific compliance checks — _internal convention_
- **4.8**: analyzing-cyclomatic-complexity skill invocation — _internal skill (P4)_

### Category 5: Context Management (4 patterns)

| #   | Pattern                          |
| --- | -------------------------------- |
| 5.1 | Git Worktrees for Isolation      |
| 5.2 | Context Compaction Protocol      |
| 5.3 | Context Management Documentation |
| 5.4 | Progress Persistence             |

- **5.1**: Separate worktree per feature for conflict prevention — [Anthropic Multi-Agent Research](https://www.anthropic.com/engineering/multi-agent-research-system)
- **5.2**: 4-step: summarize completed, keep active, file references, trigger every 3 phases — [Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- **5.3**: references/context-management.md with DO/DON'T — _internal convention_
- **5.4**: progress.json with resume protocol — [persisting-progress-across-sessions skill](https://github.com/anthropics/claude-code)

### Category 6: Progress Tracking (3 patterns)

| #   | Pattern                     |
| --- | --------------------------- |
| 6.1 | Progress File with Metadata |
| 6.2 | MANIFEST.yaml               |
| 6.3 | Metrics Tracking            |

- **6.1**: progress.json with phase_status, agents_spawned — _persisting-agent-outputs skill_
- **6.2**: File inventory with agent contributions — _persisting-agent-outputs skill_
- **6.3**: tokens, cost, validation_iterations, conflicts, escalations, phase_durations — [ralph-orchestrator](https://github.com/mikeyobrien/ralph-orchestrator)

### Category 7: Error Handling (3 patterns)

| #   | Pattern                      |
| --- | ---------------------------- |
| 7.1 | Error Recovery Documentation |
| 7.2 | Escalation to User           |
| 7.3 | Emergency Abort Protocol     |

- **7.1**: references/error-recovery.md or troubleshooting.md — _internal convention_
- **7.2**: AskUserQuestion when retry limits exceeded — [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
- **7.3**: When to abort (3+ failures, user request, critical issue), rollback procedure — **Chariot Implementation:** [emergency-abort.md](.claude/skills/orchestrating-feature-development/references/emergency-abort.md)

### Category 8: Security & Compliance (4 patterns)

| #   | Pattern                       |
| --- | ----------------------------- |
| 8.1 | Secret Scanner Integration    |
| 8.2 | Mandatory Security Gate       |
| 8.3 | Threat Modeling Integration   |
| 8.4 | Security Review Documentation |

- **8.1**: Grep for credentials/API keys/.env files before commit — [AI Agent Vulnerabilities](https://www.xenonstack.com/blog/vulnerabilities-in-ai-agents)
- **8.2**: Trigger detection (auth/input/secrets/APIs), spawn security reviewer before testing — [Agentic AI Security](https://securityboulevard.com/2025/07/emerging-agentic-ai-security-vulnerabilities-expose-enterprise-systems-to-widespread-identity-based-attacks/)
- **8.3**: Conditional Phase for auth/data/API features — [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
- **8.4**: Security findings, resolutions, reviewer agent, date in progress file — _internal convention_

### Category 9: Documentation (4 patterns)

| #   | Pattern                          |
| --- | -------------------------------- |
| 9.1 | Integration Section              |
| 9.2 | Rationalization Prevention Table |
| 9.3 | Exit Criteria Documentation      |
| 9.4 | Prompt Template Documentation    |

- **9.1**: Called-by, Requires, Calls, Spawns, Conditional, Pairs-with — [obra/superpowers](https://github.com/obra/superpowers)
- **9.2**: Common bypass attempts with mandatory responses — [Claude Skills Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)
- **9.3**: Clear, verifiable conditions for completion — [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
- **9.4**: references/prompts/README.md explaining usage — [obra/superpowers](https://github.com/obra/superpowers)

### Category 10: Integration Patterns (5 patterns)

| #    | Pattern                          |
| ---- | -------------------------------- |
| 10.1 | REQUIRED SUB-SKILL Declarations  |
| 10.2 | Conditional Sub-Skills Table     |
| 10.3 | Agent Skills in Prompts          |
| 10.4 | Workflow Handoff Protocol        |
| 10.5 | Full Workflow Skills Integration |

- **10.1**: Inline directives in skill content — [obra/superpowers](https://github.com/obra/superpowers)
- **10.2**: When/why to invoke optional skills — [Agent Skills Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- **10.3**: Embedded skill requirements in prompt templates — [obra/superpowers](https://github.com/obra/superpowers)
- **10.4**: Check TodoWrite for parent workflow, continue if pending — [TodoWrite Tracking](https://platform.claude.com/docs/en/agent-sdk/todo-tracking)
- **10.5**: finishing-a-development-branch at completion — [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow) + internal convention

### Category 11: Iteration Patterns (6 patterns)

**Source:** Ralph Wiggum technique by Geoffrey Huntley, implemented in [ralph-orchestrator](https://github.com/mikeyobrien/ralph-orchestrator) by Mike O'Brien (920+ tests, $50K contract for $297 API costs).

**Philosophy:** "Iteration trumps perfection" - deterministic failures are predictable and informative.

| #    | Pattern                 |
| ---- | ----------------------- |
| 11.1 | Completion Promise      |
| 11.2 | Agent Scratchpad        |
| 11.3 | Iteration Safety Guards |
| 11.4 | Loop Detection          |
| 11.5 | Tight Feedback Loop     |
| 11.6 | Error History Injection |

- **11.1**: Explicit string signal (e.g., `TASK_COMPLETE`, `ALL_TESTS_PASSING`) that task is done — [ralph-orchestrator](https://github.com/mikeyobrien/ralph-orchestrator)
- **11.2**: Cross-iteration context file (`.agent/scratchpad.md`) tracking: accomplished, remaining, decisions, blockers — [ralph-orchestrator](https://github.com/mikeyobrien/ralph-orchestrator)
- **11.3**: Prevent runaway: `max_iterations` (10), `max_runtime` (15min), `consecutive_error_limit` (3), `max_cost` ($50) — [ralph-orchestrator](https://github.com/mikeyobrien/ralph-orchestrator)
- **11.4**: Fuzzy string matching (90% similarity threshold, 5-output sliding window) detects stuck agents — [ralph-orchestrator](https://github.com/mikeyobrien/ralph-orchestrator)
- **11.5**: Implementation→Review→Test cycle with automatic retry on failure — [Ralph Wiggum Technique](https://awesomeclaude.ai/ralph-wiggum)
- **11.6**: Inject "Recent Errors to Avoid" (last 2-5 errors) into prompts to prevent repeat mistakes — [ralph-orchestrator](https://github.com/mikeyobrien/ralph-orchestrator)

**Existing Skill:** `iterating-to-completion` (Phase 1 complete) implements 11.1-11.4 for **intra-task** iteration.

**Chariot Implementation (Phase 2 COMPLETE):** Tight Feedback Loop (11.5) for **inter-phase** iteration implemented in:
- [tight-feedback-loop.md](.claude/skills/orchestrating-feature-development/references/tight-feedback-loop.md) - Canonical implementation
- [feedback-scratchpad-template.md](.claude/skills/orchestrating-feature-development/references/feedback-scratchpad-template.md) - Scratchpad template

**Key distinction:** `iterating-to-completion` = INTRA-task (same agent); Tight Feedback Loop = INTER-phase (Implementation→Review→Test cycle across agents).

---

## Skill Composition Patterns

Based on analysis of [obra/superpowers](https://github.com/obra/superpowers), these patterns enable skills to reliably invoke other skills.

### Pattern 1: REQUIRED SUB-SKILL Declaration

Skills explicitly declare when they hand off to another skill using inline directives:

```markdown
## Phase 3: Architecture

**REQUIRED SUB-SKILL:** Use orchestrating-multi-agent-workflows for agent selection
**REQUIRED SUB-SKILL:** Use persisting-agent-outputs for output directory setup

## After All Tasks Complete

**REQUIRED SUB-SKILL:** Use finishing-a-development-branch to complete this work
```

**Why this works:**

- Explicit instruction in skill content (not just metadata)
- Claude sees the directive when skill is loaded
- Creates traceable workflow chain

### Pattern 2: Integration Section

Every skill should document its dependencies and callers:

```markdown
## Integration

**Called by:**

- orchestrating-feature-development (Phase 4)
- /feature command

**Requires (invoke before starting):**

- persisting-agent-outputs (for output directory)
- orchestrating-multi-agent-workflows (for effort scaling decision)

**Calls (during execution):**

- developing-with-tdd (for each implementation task)
- verifying-before-completion (before reporting done)

**Pairs with (conditional):**

- dispatching-parallel-agents (when 3+ independent failures)
```

### Pattern 3: Prompt Templates in Skills

Include prompt templates directly in orchestration skills:

```
.claude/skills/orchestrating-feature-development/
├── SKILL.md
└── references/
    └── prompts/
        ├── architect-prompt.md
        ├── developer-prompt.md
        ├── reviewer-prompt.md
        └── tester-prompt.md
```

**Template structure:**

```markdown
# Developer Subagent Prompt Template

## Task

[What to implement - paste from plan.md]

## MANDATORY SKILLS (invoke ALL before completing)

- developing-with-tdd: Write test first
- verifying-before-completion: Verify before claiming done
- persisting-agent-outputs: Use for output format

## Output Format

[Structured JSON metadata]
```

### Pattern 4: Commands as Thin Wrappers

Commands should only invoke skills, not contain logic:

```markdown
# /feature command

---

## description: Complete feature development workflow

Invoke the `orchestrating-feature-development` skill and follow it exactly.
```

**Anti-pattern:** Commands with 400+ lines of workflow logic (creates dual source of truth).

### Pattern 5: Workflow Chains

Skills form explicit chains with clear handoff points:

```
/feature (command)
    └── orchestrating-feature-development (skill)
            │
            ├── Phase 1: brainstorming
            │       writes: .claude/.output/features/{id}/context/
            │
            ├── Phase 2: writing-plans
            │       writes: .claude/.output/features/{id}/plan.md
            │
            ├── Phase 3: Architecture (via Task tool)
            │       REQUIRED: persisting-agent-outputs
            │       dispatches: frontend-lead OR backend-lead
            │
            ├── Phase 4: Implementation (via Task tool)
            │       REQUIRED: developing-with-subagents
            │       CONDITIONAL: dispatching-parallel-agents (if 3+ tasks)
            │
            ├── Phase 5: Testing (via Task tool)
            │       dispatches: test-lead, then testers (sequential)
            │
            ├── Phase 6: Review (via Task tool)
            │       dispatches: *-reviewer agents
            │
            └── Phase 7: Completion
                    REQUIRED: finishing-a-development-branch
```

---

## Quality Gates

### Validation Loop Protocol

Each phase MUST use validation loop (max 3 iterations):

1. **Agent executes task**
2. **Run phase validators**
3. **If validators fail:**
   - Return failure details to agent
   - Agent fixes issues
   - Re-run validators
   - Increment iteration count
4. **If 3 iterations exhausted:**
   - Escalate to user with full context
5. **Only proceed when validators pass**

### Phase-Specific Validators

| Phase          | Validators                        | Pass Criteria        |
| -------------- | --------------------------------- | -------------------- |
| Architecture   | Peer review (reviewer agent)      | status: "approved"   |
| Implementation | `npm run build`, `npm run lint`   | Exit code 0          |
| Unit Tests     | `vitest run --reporter=json`      | All tests pass       |
| E2E Tests      | `playwright test --reporter=json` | All tests pass       |
| Security       | Security reviewer agent           | No critical findings |

### Blocking Gates with Override

For critical checkpoints that cannot be bypassed without explicit approval:

```markdown
## Gate: Protocol Research Complete

**BLOCKING**: Cannot proceed to implementation until:

- [ ] Protocol specification documented
- [ ] Version markers identified
- [ ] Test vectors available

**Override Protocol:**
If gate cannot be satisfied, use AskUserQuestion:
"Protocol research incomplete. Missing: [specific items]. Options:

1. Proceed with partial implementation (document limitations)
2. Block until research complete
3. Abort feature"

Document override decision in progress.json.
```

### P0/Compliance Validation

Domain-specific compliance checks that MUST pass:

| Orchestration    | P0 Requirements                                                       |
| ---------------- | --------------------------------------------------------------------- |
| integration-dev  | VMFilter, CheckAffiliation, ValidateCredentials, errgroup, pagination |
| fingerprintx-dev | Shodan validation, protocol markers, test coverage                    |
| capability-dev   | Capability type matrix compliance                                     |

---

## Token Economics & Effort Scaling

### Effort Scaling (From Anthropic Research)

Multi-agent systems use **15x more tokens** than single-agent chat. Match agent count to task complexity:

| Complexity   | Agents           | Tool Calls               | Examples                                            |
| ------------ | ---------------- | ------------------------ | --------------------------------------------------- |
| **Simple**   | 1 agent directly | 3-10 calls               | Bug fix, add prop, typo fix, single component       |
| **Moderate** | 2-4 agents       | 10-15 each               | Compare approaches, implement + test one feature    |
| **Complex**  | 5-10 agents      | Divided responsibilities | Full feature with architecture, impl, review, tests |
| **Major**    | 10+ agents       | Parallel phases          | Cross-cutting refactor, new subsystem               |

### Decision Checklist Before Spawning Multiple Agents

1. Can one agent complete this? If yes, delegate directly
2. Are subtasks truly independent? If no, sequential is better
3. Does complexity justify 15x token cost?
4. Would parallel execution save significant time?

**Warning:** Multi-agent systems are LESS effective for tightly interdependent tasks where each step requires output from the previous step.

### Context Compaction Protocol

When approaching token limits (conversation > 50 messages):

1. **Summarize completed phase outputs**
   - Replace full JSON with 2-3 line summary
   - Archive full output to progress file

2. **Keep only active context**
   - Current phase details
   - Immediate prior phase decisions
   - Key file paths

3. **Use file references**
   - "See .claude/.output/features/{id}/arch-decisions.md"
   - NOT inline content

4. **Compaction triggers**
   - After every 3 completed phases
   - When agent output exceeds 1000 tokens
   - Before spawning new agents

---

## FAQ

### When should I use orchestration vs single agent?

Use orchestration when:

- Task requires 3+ distinct phases (design, implement, test)
- Multiple specialists needed (architect + developer + tester)
- Progress persistence is important (multi-day work)
- Validation gates are required (code review, security review)

Use single agent when:

- Task is focused (bug fix, add feature, refactor)
- One domain expertise suffices
- Quick turnaround needed
- Low token budget

### How do I handle blocked status?

1. Agent returns `status: "blocked"` with `blocked_reason` category
2. Agent sets `handoff.next_agent` to `null`
3. Orchestrator uses routing table to determine next steps
4. Options: escalate to user, spawn different agent, abort

### When should I escalate to user?

- After 3 validation loop iterations exhausted
- When blocked_reason is "architecture_decision" or "missing_requirements"
- When security reviewer finds critical issues
- When agent encounters out-of-scope work

### How do I prevent parallel agent conflicts?

1. **Before spawning**: Identify file boundaries for each agent
2. **In prompts**: Specify scope boundaries ("Only modify src/components/filters/")
3. **Check overlap**: If agents may edit same files, make sequential
4. **Optional**: Use file locking (.claude/locks/{agent-name}.lock)

### What's the difference between validation loops and tight feedback loops?

- **Validation loops** (Pattern 4.3): Within a single phase, retry until validators pass (max 3 iterations)
- **Tight feedback loops** (Pattern 11.5): Across phases, Implementation→Review→Test cycle repeats until FEATURE_COMPLETE

---

## References

### Internal

- **Agent Architecture**: `.claude/docs/agents/AGENT-ARCHITECTURE.md`
- **Skill Architecture**: `.claude/docs/skills/SKILL-ARCHITECTURE.md`
- **Foundational Skill**: `.claude/skills/orchestrating-multi-agent-workflows/SKILL.md`
- **Feature Development**: `.claude/skills/orchestrating-feature-development/SKILL.md`
- **Progress Persistence**: `.claude/skills/persisting-progress-across-sessions/SKILL.md`
- **Agent Outputs**: `.claude/skills/persisting-agent-outputs/SKILL.md`

### Anthropic Official Guidance

Multi-Agent Research System
https://www.anthropic.com/engineering/multi-agent-research-system

Building Effective Agents
https://www.anthropic.com/research/building-effective-agents

Effective Context Engineering
https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents

Claude Code Sub-agents
https://code.claude.com/docs/en/sub-agents

### Community Resources

Ralph Wiggum Technique
https://awesomeclaude.ai/ralph-wiggum

ralph-orchestrator (920+ tests, $297 API costs)
https://github.com/mikeyobrien/ralph-orchestrator

obra/superpowers (REQUIRED SUB-SKILL pattern)
https://github.com/obra/superpowers

Multi-Agent Orchestration: 10 Claude Instances in Parallel
https://dev.to/bredmond1019/multi-agent-orchestration-running-10-claude-instances-in-parallel-part-3-29da

Context Engineering Part 2
https://www.philschmid.de/context-engineering-part-2

---

## Pattern Source Index

Quick lookup for orchestrators to include when reporting missing patterns.

### External Sources

**[Anthropic Multi-Agent Research](https://www.anthropic.com/engineering/multi-agent-research-system)**
Patterns: 1.1, 1.2, 1.4, 3.4, 5.1

**[Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)**
Patterns: 2.3, 4.1, 4.6, 7.2, 8.3, 9.3

**[Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)**
Patterns: 2.5, 5.2

**[TodoWrite Tracking](https://platform.claude.com/docs/en/agent-sdk/todo-tracking)**
Patterns: 2.1, 10.4

**[obra/superpowers](https://github.com/obra/superpowers)**
Patterns: 1.5, 1.6, 3.1, 9.1, 9.4, 10.1, 10.3

**[ralph-orchestrator](https://github.com/mikeyobrien/ralph-orchestrator)**
Patterns: 4.2, 4.3, 6.3, 7.3, 11.1-11.4, 11.6

**[Ralph Wiggum Technique](https://awesomeclaude.ai/ralph-wiggum)**
Patterns: 11.5

**[Context Parallelism](https://www.agalanov.com/notes/efficient-claude-code-context-parallelism-sub-agents/)**
Patterns: 3.5, 3.6

**[Agent Skills Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)**
Patterns: 10.2

**[Claude Skills Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)**
Patterns: 9.2

**[AI Agent Vulnerabilities](https://www.xenonstack.com/blog/vulnerabilities-in-ai-agents)**
Patterns: 8.1

**[Agentic AI Security](https://securityboulevard.com/2025/07/emerging-agentic-ai-security-vulnerabilities-expose-enterprise-systems-to-widespread-identity-based-attacks/)**
Patterns: 8.2

### Internal Sources

**persisting-agent-outputs skill**
Patterns: 1.3, 5.4, 6.1, 6.2

**Internal convention**
Patterns: 2.2, 2.4, 3.2, 3.7, 4.4, 4.5, 4.7, 5.3, 7.1, 8.4, 10.5

### Chariot Implementations (Canonical)

**Use these as the source of truth for implementing patterns in other orchestration skills.**

**[orchestrating-feature-development/references/tight-feedback-loop.md](.claude/skills/orchestrating-feature-development/references/tight-feedback-loop.md)**
Patterns: 11.1 (Completion Promise), 11.2 (Agent Scratchpad), 11.3 (Safety Guards), 11.5 (Tight Feedback Loop), 11.6 (Error History Injection)
- INTER-phase iteration (Implementation→Review→Test cycle)
- Completion promise: `IMPLEMENTATION_VERIFIED`
- Scratchpad: `{feature-dir}/feedback-scratchpad.md`
- Guards: max_feedback_iterations (5), max_consecutive_*_failures (3)

**[orchestrating-feature-development/references/emergency-abort.md](.claude/skills/orchestrating-feature-development/references/emergency-abort.md)**
Pattern: 7.3 (Emergency Abort Protocol)
- 5 abort triggers (user request, repeated escalations, critical security, unrecoverable error, cost/time exceeded)
- 4 cleanup options via AskUserQuestion (keep everything, keep artifacts, rollback, full cleanup)
- Progress.json abort_info schema
- Resume after abort via `/feature resume {id}`

**[iterating-to-completion/SKILL.md](.claude/skills/iterating-to-completion/SKILL.md)**
Patterns: 11.1-11.4 (INTRA-task iteration)
- Same-agent loops with completion promise
- Guards: max_iterations (10), max_runtime (15min), consecutive_error_limit (3)
- Different from Tight Feedback Loop (INTER-phase)

### Usage Example

When an orchestrator detects a missing pattern, it can output:

```markdown
## Missing Pattern: 11.5 - Tight Feedback Loop

**Description:** Implementation→Review→Test cycle with automatic retry on failure

**Reference:** [Ralph Wiggum Technique](https://awesomeclaude.ai/ralph-wiggum)

**Category:** Iteration Patterns

**Implementation guidance:** See Category 11 in Pattern Catalog
```

---

## Appendix

### Pattern-Based Quality

We define **34 foundational patterns** across **11 categories** that distinguish high-quality orchestrations from ad-hoc multi-agent workflows. Implementation scores:

| Orchestration                          | Score | Rank | Notes |
| -------------------------------------- | ----- | ---- | ----- |
| orchestrating-integration-development  | 93%   | 1    |       |
| **orchestrating-feature-development**  | 90    | 2    |       |
| orchestrating-fingerprintx-development | 89%   | 3    |       |
| orchestrating-capability-development   | 86%   | 4    |       |
| orchestrating-research                 | 71%   | 5    |       |
| threat-modeling-orchestrator           | 62%   | 6    | Write/Edit in allowed-tools (VIOLATION) |

**Score calculation:** `(Implemented + 0.5×Partial) / Total applicable patterns`

## Implementation Scorecard

### Foundational Skill: orchestrating-multi-agent-workflows

**Current Score: 38% (13/34 patterns)**

| Category               | Defined | Partial | Missing | Score        |
| ---------------------- | ------- | ------- | ------- | ------------ |
| Core Architecture      | 3       | 2       | 1       | 4/6 (67%)    |
| Phase Management       | 2       | 1       | 2       | 2.5/5 (50%)  |
| Agent Coordination     | 3       | 1       | 3       | 3.5/7 (50%)  |
| Quality Gates          | 3       | 2       | 3       | 4/8 (50%)    |
| Context Management     | 1       | 0       | 3       | 1/4 (25%)    |
| Progress Tracking      | 1       | 0       | 2       | 1/3 (33%)    |
| Error Handling         | 1       | 1       | 1       | 1.5/3 (50%)  |
| Security & Compliance  | 0       | 0       | 4       | 0/4 (0%)     |
| Documentation          | 1       | 2       | 1       | 2/4 (50%)    |
| Integration Patterns   | 2       | 0       | 3       | 2/5 (40%)    |
| **Iteration Patterns** | **0**   | **0**   | **6**   | **0/6 (0%)** |

### Implementation Rankings

| Orchestration                              | Score | Strengths                                                         | Critical Gaps                               |
| ------------------------------------------ | ----- | ----------------------------------------------------------------- | ------------------------------------------- |
| **orchestrating-integration-development**  | 93%   | P0 compliance, skill check+creation, conditional frontend phase   | File locking (P4)                           |
| **orchestrating-feature-development**      | ~90%  | Most phases (12), tight feedback loop, emergency abort, complete documentation | File scope boundaries, secret scanner |
| **orchestrating-fingerprintx-development** | 89%   | Strongest blocking gates, prerequisite checks, live validation    | foundational ref missing                    |
| **orchestrating-capability-development**   | 86%   | Capability type matrix, work type decision point                  | Context compaction                          |
| **orchestrating-research**                 | 71%   | Sequential agent spawning, intent expansion, three-pass synthesis | Two-stage review                            |
| **threat-modeling-orchestrator**           | 62%   | Dynamic parallelization, session resume, multi-format output      | **Write/Edit in allowed-tools (VIOLATION)** |

### Utility Skills (Not Full Orchestrations)

These skills provide **coordination patterns** used BY orchestrations, but are not standalone orchestrations:

| Skill                           | Score | Purpose                                       | Used By                                |
| ------------------------------- | ----- | --------------------------------------------- | -------------------------------------- |
| **dispatching-parallel-agents** | 18%   | Parallel dispatch for 3+ independent failures | feature-dev, debugging, testing phases |
| **iterating-to-completion**     | N/A   | Loop-until-done pattern (Category 11)         | All orchestrations                     |

**Why not full orchestrations:**

- No phases, no progress files, no human checkpoints
- Narrow scope (single coordination pattern)
- Designed to be invoked by other skills, not standalone

### Debugging Skills Gap

**No `orchestrating-debugging` skill exists.** Current debugging support:

| Skill                         | Type                 | Gap                                               |
| ----------------------------- | -------------------- | ------------------------------------------------- |
| `debugging-systematically`    | Process methodology  | Not an orchestration - single-agent guidance      |
| `debugging-strategies`        | Reference catalog    | Not an orchestration - knowledge base             |
| `dispatching-parallel-agents` | Coordination utility | Used for parallel debugging, but no full workflow |

**Potential Need:** A full `orchestrating-debugging` skill would:

1. Invoke `debugging-systematically` for root cause analysis
2. Use `dispatching-parallel-agents` for 3+ independent failures
3. Provide human checkpoints (hypothesis approval, fix approval)
4. Track progress across debugging sessions
5. Integrate with `developing-with-tdd` for test creation

### Cascade Effect

```
                    ┌─────────────────────────────────────┐
                    │ orchestrating-multi-agent-workflows │
                    │            (38% complete)           │
                    └─────────────────┬───────────────────┘
                                      │
                    Missing from foundational skill:
                    • Iteration Patterns (0%)
                    • Security Patterns (0%)
                    • Context Compaction (25%)
                                      │
          ┌───────────────┬───────────┼───────────┬───────────────┐
          ▼               ▼           ▼           ▼               ▼
    ┌───────────┐  ┌──-─────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
    │integration│  │fingerprintx│ │capability │ │  feature  │ │  research │
    │   93%     │  │    89%     │ │    86%    │ │   ~90%    │ │    71%    │
    └───────────┘  └─-──────────┘ └───────────┘ └───────────┘ └───────────┘
         │               │             │             │              │
         └───────────────┴─────────────┴─────────────┴──────────────┘
                                      │
                    Each implementation independently:
                    • Discovered iteration patterns (partial)
                    • Missed security patterns (most)
                    • Invented context management (inconsistent)
```

**Fix foundational skill FIRST, then cascade updates to implementations.**

---

## Gap Analysis

### P0 - Critical (Missing from all implementations)

| Gap                           | Pattern   | Impact                                           | Fix                       | Status |
| ----------------------------- | --------- | ------------------------------------------------ | ------------------------- | ------ |
| **Iteration Patterns**        | 11.1-11.6 | No loop-until-done pattern - key to one-shotting | Add to foundational skill | ✅ DONE (feature-dev) |
| **Context Compaction**        | 2.5, 5.2  | Context overflow crashes long workflows          | Add compaction protocol   | ✅ DONE (feature-dev, 2026-01-16) |
| **Security Patterns**         | 8.1-8.4   | Zero security guidance in toolkit                | Add security gate section | ❌ Still missing |
| **Requirements Verification** | 4.4       | Code review without requirements check           | Add pre-review phase      | ✅ DONE (feature-dev Phase 7) |

### P1 - High Impact

| Gap                           | Pattern | Impact                           | Fix                        | Status |
| ----------------------------- | ------- | -------------------------------- | -------------------------- | ------ |
| File Scope Boundaries         | 3.5     | Parallel agents may conflict     | Add scope in prompts       | ❌ Still missing |
| Proactive Conflict Prevention | 3.6     | Only reactive detection exists   | Check overlap before spawn | ❌ Still missing |
| Git Worktrees                 | 5.1     | No isolation pattern             | Document worktree usage    | ✅ DONE (feature-dev Phase 1) |
| Metrics Tracking              | 6.3     | No cost/token visibility         | Add to progress.json       | ✅ DONE (feature-dev) |
| Emergency Abort               | 7.3     | No rollback guidance             | Document abort protocol    | ✅ DONE (feature-dev) |
| Workflow Handoff              | 10.4    | Research orphans parent workflow | Check TodoWrite for parent | ❌ Still missing |

### P2 - Should Have

| Gap                          | Pattern | Impact                        | Fix                     |
| ---------------------------- | ------- | ----------------------------- | ----------------------- |
| Commands as Thin Wrappers    | 1.6     | Implementation inconsistency  | Refactor commands       |
| Phase Numbering Convention   | 2.2     | Inconsistent across skills    | Standardize             |
| Agent Matrix Standard        | 3.2     | Each skill reinvents format   | Create template         |
| Integration Section Standard | 9.1     | Inconsistent documentation    | Add Phase 28 compliance |
| Exit Criteria Standard       | 9.3     | Unclear completion conditions | Document per skill      |

---

## Skill Connectivity Analysis

### The Fundamental Problem

```
┌───────────────────────────────────────────────────────────────────┐
│  /feature orchestration (12 phases as of 2026-01-16)              │
│                                                                   │
│  Phase 1  ─→ Setup (worktree + output dir)      ✓ ENFORCED        │
│  Phase 2  ─→ skill: "brainstorming"             ✓ ENFORCED        │
│  Phase 3  ─→ skill: "discovering-codebases..."  ✓ ENFORCED        │
│  Phase 4  ─→ skill: "writing-plans"             ✓ ENFORCED        │
│  Phase 5  ─→ Task(lead + security-lead)         ✓ Skills in prompt│
│  Phase 6  ─→ Task(frontend-developer)           ✓ Skills in prompt│
│  Phase 7  ─→ Plan Completion Review             ✓ BUILT-IN        │
│  Phase 8  ─→ Code Review (two-stage)            ✓ BUILT-IN        │
│  Phase 9  ─→ Task(test-lead)                    ✓ Skills in prompt│
│  Phase 10 ─→ Task(testers, parallel)            ✓ Skills in prompt│
│  Phase 11 ─→ Test Validation                    ✓ BUILT-IN        │
│  Phase 12 ─→ skill: "finishing-a-dev-branch"    ✓ ENFORCED        │
│                                                                   │
│  ✓ Code Review: Phase 8 (two-stage gated)                         │
│  ✓ Security Review: Phase 5 (security-lead in parallel)           │
│  ✓ PR/Branch Completion: Phase 12 (finishing-a-development-branch)│
└───────────────────────────────────────────────────────────────────┘
```

### Skills Inventory

| Category         | Total Skills | Connected to /feature        | Gap               |
| ---------------- | ------------ | ---------------------------- | ----------------- |
| Core Skills      | 42           | 2 explicitly, ~15 via agents | 25 orphaned       |
| Testing Library  | 18           | 0 directly                   | 18 orphaned       |
| Security Library | 13           | 0 directly                   | 13 orphaned       |
| Workflow Library | 7            | 0 directly                   | 7 orphaned        |
| Frontend Library | ~25          | ~10 via gateway              | 15 orphaned       |
| Backend Library  | ~15          | ~8 via gateway               | 7 orphaned        |
| **Total**        | **~155**     | **~27 connected**            | **~60% orphaned** |

### Orphaned Skills by Category

#### Workflow Skills (Status as of 2026-01-16)

| Skill                            | Purpose                        | Status                                         |
| -------------------------------- | ------------------------------ | ---------------------------------------------- |
| `finishing-a-development-branch` | Branch cleanup, PR prep        | ✅ CONNECTED - Phase 12 of feature-dev         |
| `code-review-checklist`          | Comprehensive review checklist | ❌ Orphaned - could enhance Phase 8            |
| `requesting-code-review`         | PR creation best practices     | ❌ Orphaned - could enhance Phase 12           |
| `github-workflow-automation`     | PR/issue automation            | ❌ Orphaned - could enhance Phase 12           |

#### Security Skills (Never Mandated)

| Skill                   | Purpose                | Should Be Used In             |
| ----------------------- | ---------------------- | ----------------------------- |
| `authorization-testing` | Test access controls   | Phase 5 for auth features     |
| `secret-scanner`        | Find hardcoded secrets | Before any commit             |
| `defense-in-depth`      | Security architecture  | Phase 3 Architecture          |
| `threat-modeling`       | STRIDE analysis        | Phase 3 for security features |

#### Testing Skills (Exist but Not Mandated)

| Skill                           | Purpose                           | Should Be Used In                |
| ------------------------------- | --------------------------------- | -------------------------------- |
| `test-infrastructure-discovery` | Find existing test utilities      | BEFORE spawning test engineers   |
| `verifying-test-file-existence` | Verify files exist before testing | BEFORE test engineers            |
| `testing-anti-patterns`         | Avoid common test mistakes        | Mandatory for all test engineers |

### Recommended Fixes

1. **Add missing phases to /feature** (Code Review, Security Review, Completion)
2. **Enforce pre-conditions before spawning agents** (test-infrastructure-discovery)
3. **Add skill verification to agent handoffs** (skills_invoked array)
4. **Create skill enforcement layer** (mandatory skills by agent type)
5. **Add conditional security gate** (trigger on auth/input/secrets/APIs)

---

## Action Plan

### Phase 1: Fix Foundational Skill (P0)

**Target:** Bring `orchestrating-multi-agent-workflows` from 38% to 80%+

| Action                                | Patterns Addressed | Effort    | Status                    |
| ------------------------------------- | ------------------ | --------- | ------------------------- |
| Add Iteration Patterns section        | 11.1-11.6          | 2-3 hours | ✅ DONE (feature-dev)     |
| Add Context Compaction section        | 2.5, 5.2           | 1-2 hours | ✅ DONE (feature-dev 2026-01-16) |
| Add Security Patterns section         | 8.1-8.4            | 2 hours   | ❌ Pending                |
| Add Requirements Verification pattern | 4.4                | 1 hour    | ✅ DONE (feature-dev Phase 7) |
| Add File Scope Boundaries pattern     | 3.5, 3.6           | 1 hour    | ❌ Pending                |
| Add Git Worktrees pattern             | 5.1                | 30 min    | ✅ DONE (feature-dev Phase 1) |
| Add Metrics Tracking pattern          | 6.3                | 1 hour    | ✅ DONE (feature-dev)     |
| Add Emergency Abort pattern           | 7.3                | 1 hour    | ✅ DONE (feature-dev)     |
| Add standard documentation formats    | 2.2, 3.2, 9.1, 9.3 | 2 hours   | ✅ DONE (feature-dev Integration) |

### Phase 2: Update Implementations (P1)

After foundational skill is updated:

1. **threat-modeling-orchestrator**: Remove Write/Edit from allowed-tools (CRITICAL)
2. ~~**orchestrating-feature-development**: Add tight feedback loop~~ ✅ **DONE** (2026-01-16)
3. ~~**orchestrating-feature-development**: Add emergency abort protocol~~ ✅ **DONE** (2026-01-16)
4. ~~**orchestrating-feature-development**: Fix allowed-tools violation~~ ✅ **DONE** (2026-01-16)
5. ~~**orchestrating-feature-development**: Add compaction enforcement~~ ✅ **DONE** (2026-01-16)
6. **All skills**: Add orchestrating-multi-agent-workflows reference if missing
7. **Apply context compaction enforcement to other orchestrations** (capability, fingerprintx, integration, research)
8. **Apply tight feedback loop to other orchestrations** (capability, fingerprintx, integration)

### Phase 3: Maintain Compliance (P2)

- Add foundational skill compliance check to skill creation workflow
- Update auditing-skills to verify pattern compliance
- Create automated score calculation

### Detailed Todo List

#### Priority 0: Skill Composition Patterns

- [ ] Add REQUIRED SUB-SKILL directives to orchestrating-feature-development
- [ ] Add Integration sections to all orchestration skills
- [ ] Create prompt templates for orchestrating-feature-development
- [ ] Refactor /feature command to thin wrapper
- [ ] Add developing-with-subagents integration to Phase 4
- [ ] Add dispatching-parallel-agents as conditional skill
- [ ] Add persisting-progress-across-sessions for long workflows

#### Priority 1: Skill Connectivity Quick Wins

- [ ] Add `test-infrastructure-discovery` to Phase 5 preconditions
- [ ] Add `code-review-checklist` as Phase 6
- [ ] Add `secret-scanner` to completion workflow
- [ ] Add `finishing-a-development-branch` at workflow end
- [x] Add `skills_invoked` to agent handoff schema ✓ DONE
- [x] Add Tight Feedback Loop to orchestrating-feature-development ✓ DONE (2026-01-16)
- [x] Add Emergency Abort Protocol to orchestrating-feature-development ✓ DONE (2026-01-16)
- [x] Fix allowed-tools violation in orchestrating-feature-development ✓ DONE (2026-01-16)

#### Priority 2: High Impact

- [ ] Add context compaction protocol to persisting-progress-across-sessions
- [ ] Add file scope boundaries to agent delegation prompts
- [ ] Document validation loop protocol in orchestration skills
- [ ] Create skill enforcement layer for agents

#### Priority 3: Medium Impact

- [ ] Create mandatory security gate for sensitive features
- [ ] Add metrics tracking to progress files
- [ ] Connect workflow skills to /feature completion
