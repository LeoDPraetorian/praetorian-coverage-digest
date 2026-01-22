# Multi-Agent Orchestration Architecture

**Complete architectural documentation for multi-agent AI systems based on research from Anthropic, industry practitioners, and analysis of the Praetorian Development Platform's implementation.**

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
9. [Configuration](#configuration) - Centralized limits and retry behavior
10. [FAQ](#faq)
11. [References](#references)
12. [Pattern Source Index](#pattern-source-index) - Quick lookup for missing pattern references
13. [Appendix](#appendix) - Implementation Scorecard, Gap Analysis, Action Plan

> **Note:** Security patterns (secret scanning, security gates, threat modeling) were removed from this architecture as they are handled separately by domain-specific security skills rather than orchestration patterns.

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
        ┌-------───────────────┼───────────------─────|──----------------──┐
        ▼                      ▼                      ▼                    ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   ARCHITECT     │   │   DEVELOPER     │   │    Reviewer     │   |      TESTER     │
│   (Subagent)    │   │   (Subagent)    │   │   (Subagent)    │   |     (Subagent)  |
│                 │   │                 │   │                 │   |                 |
│  Fresh context  │   │  Fresh context  │   │  Fresh context  │   |  Fresh context  |
│  per task       │   │  per task       │   │  per task       │   |  per task       |
│  CANNOT spawn   │   │  CANNOT spawn   │   │  CANNOT spawn   │   |  CANNOT spawn   |
│  other subagents│   │  other subagents│   │  other subagents│   |  other subagents|
│  Returns JSON   │   │  Returns JSON   │   │  Returns JSON   │   |  Returns JSON   |
└─────────────────┘   └─────────────────┘   └─────────────────┘   └─────────────────┘
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

### Two Execution Models: Coordinator vs Executor

The table above describes WHEN to use multiple agents, but there's a more fundamental choice: **who implements the work?**

| Model                       | Skill                                 | Who Implements            | Tools Available                           | Best For                                    |
| --------------------------- | ------------------------------------- | ------------------------- | ----------------------------------------- | ------------------------------------------- |
| **Single Executor**         | `executing-plans`                     | The agent itself          | Edit, Write, Bash                         | Interdependent tasks, tight human oversight |
| **Multi-Agent Coordinator** | `orchestrating-multi-agent-workflows` | Spawned specialist agents | Task, TodoWrite, Read (**NO** Edit/Write) | Multi-concern tasks, parallelization        |

**These models are mutually exclusive by design.** The tool restrictions aren't arbitrary—they enforce architectural boundaries:

- **Orchestrators cannot use Edit/Write** → Forces delegation to specialists, prevents "doing it yourself"
- **Executors must use Edit/Write** → They ARE the implementer, no one else to delegate to

### The Fork After Planning

Both models typically follow `writing-plans`, but they diverge based on task characteristics:

```
writing-plans (creates implementation plan)
     │
     ├─── Token budget <50K? ──────────────────────┐
     │    Tasks tightly interdependent? ───────────┤
     │    Human review needed every few tasks? ────┤
     │                                             ▼
     │                                    executing-plans
     │                                    • Single agent implements
     │                                    • Human checkpoint every 3 tasks
     │                                    • Uses: Edit, Write, Bash
     │
     └─── Multiple expertise areas needed? ────────┐
          Parallelization would save time? ────────┤
          Complex with 5+ phases? ─────────────────┤
                                                   ▼
                                          orchestrating-multi-agent-workflows
                                          • Orchestrator spawns specialists
                                          • Agents implement in parallel
                                          • Uses: Task (NO Edit/Write)
```

**Key insight:** You cannot combine these models. An agent running `executing-plans` implements directly. An agent running orchestration patterns delegates to others. Attempting to mix them violates the core architectural principle that orchestrators never implement.

---

## Architecture Overview

### Three-Tier Agent System

```
┌────────────────────────────────────────────────────────────-───────────────┐
│                         TIER 1: ORCHESTRATION SKILLS                       │
│      Analyze → Decompose → Delegate → Synthesize → Track Progress          │
│                                                                            │
│   orchestrating-feature-development (LIBRARY)     ← Runs IN main convo     │
│   orchestrating-capability-development (LIBRARY)                           │
│   orchestrating-integration-development (LIBRARY)                          │
│   orchestrating-fingerprintx-development (LIBRARY)                         │
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
│    │  Architects  │ │  Developers  │ │  Reviewers   │ │   Testers    │     │
│    │ (Design)     │ │ (Implement)  │ │  (Quality)   │ │  (Validate)  │     │
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

### Standard 16-Phase Template

All orchestration skills follow this standard phase template:

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

**⛔ = Compaction Gate** - BLOCKING checkpoint requiring context compaction before next phase.

**Work Types:** BUGFIX, SMALL, MEDIUM, LARGE (determined in Phase 2: Triage)

**Phase Skip Matrix:**

| Work Type | Skipped Phases               |
| --------- | ---------------------------- |
| BUGFIX    | 5, 6, 7, 9, 12               |
| SMALL     | 5, 6, 7, 9                   |
| MEDIUM    | None                         |
| LARGE     | None (all 16 phases execute) |

### Conceptual Flow

```
User Request
     │
     ▼
┌───────────────────────────────────────────────────────────────────────-──┐
│  PHASES 1-2: SETUP & TRIAGE                                              │
│  Initialize workspace, classify work type (BUGFIX/SMALL/MEDIUM/LARGE)    │
│  Creates TodoWrite items for all applicable phases                       │
└────────────────────────────────────────────────────────────────────────-─┘
     │
     ▼
┌───────────────────────────────────────────────────────────────────────-──┐
│  PHASES 3-5: DISCOVERY & ANALYSIS                                        │
│  Explore codebase, map skills, assess complexity                         │
│  X COMPACTION GATE after Phase 3                                         │
└────────────────────────────────────────────────────────────────────-─────┘
     │
     ▼
┌────────────────────────────────────────────────────────────────────-─────┐
│  PHASES 6-7: DESIGN (MEDIUM+ only)                                       │
│  Brainstorming (LARGE), Architecture planning                            │
│  Spawn *-lead agents with clear objectives                               │
└────────────────────────────────────────────────────────────────────-─────┘
     │
     ▼
┌────────────────────────────────────────────────────────────────-─────────┐
│  PHASES 8-11: IMPLEMENTATION & REVIEW                                    │
│  Code development, design verification, domain compliance, quality       │
│  X COMPACTION GATE after Phase 8                                         │
└─────────────────────────────────────────────────────────────────-────────┘
     │
     ▼
┌────────────────────────────────────────────────────────────────-─────────┐
│  PHASES 12-15: TESTING                                                   │
│  Plan tests, execute tests, verify coverage, assess quality              │
│  X COMPACTION GATE after Phase 13                                        │
└────────────────────────────────────────────────────────────────--────────┘
     │
     ▼
┌────────────────────────────────────────────────────────────────-─────────┐
│  PHASE 16: COMPLETION                                                    │
│  Final verification, PR creation, worktree cleanup                       │
│  Invoke finishing-a-development-branch skill                             │
└────────────────────────────────────────────────────────────────--────────┘
```

### Tight Feedback Loop (Category 10)

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

### Ideal State: Complete Orchestration Flow (16-Phase)

This diagram shows all patterns working together in a properly orchestrated system using the standard 16-phase template:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER REQUEST                                      │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: SETUP                                                             │
│  • Initialize MANIFEST.yaml (Pattern 6.1)                                   │
│  • Create output directory, worktree if needed                              │
│  • TodoWrite for all phases (Pattern 2.1)                                   │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: TRIAGE (Effort Scaling Decision - Pattern 3.4)                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ BUGFIX?  → Skip phases 5, 6, 7, 9, 12                               │    │
│  │ SMALL?   → Skip phases 5, 6, 7, 9                                   │    │
│  │ MEDIUM?  → Execute all phases                                       │    │
│  │ LARGE?   → Execute all 16 phases                                    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: CODEBASE DISCOVERY                                                │
│  • Spawn Explore agent to understand codebase patterns                      │
│  • Detect technologies, frameworks, patterns                                │
│  X COMPACTION GATE 1 (Pattern 2.6): Must compact before Phase 4             │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 4: SKILL DISCOVERY                                                   │
│  • Map detected technologies to skills                                      │
│  • Write skill manifest for downstream agents                               │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 5: COMPLEXITY ASSESSMENT                                             │
│  • Technical complexity analysis                                            │
│  • Determine execution strategy (parallel vs sequential)                    │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 6: BRAINSTORMING (LARGE only)                                        │
│  • Invoke brainstorming skill                                               │
│  • Design refinement with human-in-loop                                     │
│  ⏸ CHECKPOINT: User approves design direction (Pattern 2.3)                 │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 7: ARCHITECTURE PLAN (MEDIUM+ only)                                  │
│  • Spawn *-lead agent (Pattern 3.1: mandatory skills in prompt)             │
│  • Technical design AND task decomposition                                  │
│  • Agent returns structured JSON (Pattern 1.3)                              │
│  ⏸ CHECKPOINT: User approves architecture (Pattern 2.3)                     │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 8: IMPLEMENTATION                                                    │
│  • Spawn *-developer with context from architecture                         │
│  • File scope boundaries (Pattern 3.5)                                      │
│  • Parallel if independent tasks (Pattern 1.4)                              │
│  X COMPACTION GATE 2 (Pattern 2.6): Must compact before Phase 9             │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 9: DESIGN VERIFICATION (MEDIUM+ only)                                │
│  • Verify implementation matches architecture plan                          │
│  • Requirements verification (Pattern 4.4)                                  │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 10: DOMAIN COMPLIANCE                                                │
│  • P0/Compliance validation (Pattern 4.7)                                   │
│  • Domain-specific mandatory patterns (VMFilter, errgroup, etc.)            │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 11: CODE QUALITY                                                     │
│  • Spawn *-reviewer agents                                                  │
│  • Two-stage: spec compliance → quality (Pattern 4.1)                       │
│  • Validation loop: max 2 retries (Pattern 4.3)                             │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 12: TEST PLANNING (MEDIUM+ only)                                     │
│  • Spawn test-lead agent                                                    │
│  • Create test strategy and plan                                            │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 13: TESTING                                                          │
│  • Spawn *-tester agents (parallel if independent)                          │
│  • Unit, integration, E2E as applicable                                     │
│  X COMPACTION GATE 3 (Pattern 2.6): Must compact before Phase 14            │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 14: COVERAGE VERIFICATION                                            │
│  • Verify test coverage meets threshold                                     │
│  • Document coverage gaps if any                                            │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 15: TEST QUALITY                                                     │
│  • No low-value tests, correct assertions                                   │
│  • All tests passing                                                        │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 16: COMPLETION                                                       │
│  • Final verification (verifying-before-completion)                         │
│  • Invoke finishing-a-development-branch skill                              │
│  • Update MANIFEST.yaml: status = "complete"                                │
│  • PR creation, worktree cleanup                                            │
│  ⏸ CHECKPOINT: User approves final result (Pattern 2.3)                     │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FEATURE_COMPLETE                                    │
│  Output: .claude/.output/features/{id}/                                     │
│  ├── MANIFEST.yaml (unified state: agents, phases, verification)            │
│  ├── context/ (brainstorming artifacts)                                     │
│  ├── plan.md (implementation plan)                                          │
│  ├── architecture/ (design decisions)                                       │
│  ├── implementation/ (agent outputs)                                        │
│  ├── testing/ (test results)                                                │
│  └── feedback-scratchpad.md (iteration history)                             │
└─────────────────────────────────────────────────────────────────────────────┘

LEGEND:
  ⏸ = Human checkpoint (requires user approval)
  X = Compaction Gate (BLOCKING - must compact context before proceeding)
  → = Automatic flow
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

**Architectural implication:** This tool restriction is what makes `orchestrating-multi-agent-workflows` and `executing-plans` mutually exclusive execution models:

| Execution Model   | Requires Edit/Write? | Why                                   |
| ----------------- | -------------------- | ------------------------------------- |
| `executing-plans` | **YES**              | The agent itself implements the tasks |
| `orchestrating-*` | **NO** (forbidden)   | Spawned specialists implement         |

An agent cannot run both models simultaneously—if it has Edit/Write access, it's an executor; if it doesn't, it's a coordinator. This isn't a limitation but a design feature that enforces clean separation of concerns.

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

All agents return structured JSON metadata (embedded at end of output `.md` files) for predictable orchestration:

```json
{
  "agent": "frontend-developer",
  "output_type": "implementation",
  "timestamp": "2026-01-16T15:45:00Z",
  "feature_directory": ".claude/.output/features/...",
  "skills_invoked": ["developing-with-tdd", "verifying-before-completion"],
  "library_skills_read": [
    ".claude/skill-library/development/frontend/enforcing-react-19-conventions/SKILL.md"
  ],
  "source_files_verified": ["src/components/UserProfile.tsx:45-120"],
  "status": "complete",
  "handoff": {
    "next_agent": "frontend-reviewer",
    "context": "Review implementation against architecture plan"
  }
}
```

| Field                   | Required     | Description                                                                                                     |
| ----------------------- | ------------ | --------------------------------------------------------------------------------------------------------------- |
| `agent`                 | Yes          | Agent name from agent definition                                                                                |
| `output_type`           | Yes          | Descriptive type (architecture-review, implementation, test-plan)                                               |
| `timestamp`             | Yes          | ISO 8601 timestamp                                                                                              |
| `feature_directory`     | Yes          | Path to output directory                                                                                        |
| `skills_invoked`        | Yes          | Core skills invoked via Skill tool (min 1)                                                                      |
| `library_skills_read`   | Yes          | Library skills loaded via Read tool                                                                             |
| `source_files_verified` | Yes          | Files/functions read for evidence (min 1)                                                                       |
| `status`                | Yes          | `complete`, `in-progress`, `blocked`, `needs-review`                                                            |
| `blocked_reason`        | When blocked | `security_concern`, `architecture_decision`, `missing_requirements`, `test_failures`, `out_of_scope`, `unknown` |
| `attempted`             | When blocked | What agent tried before blocking (min 1)                                                                        |
| `handoff`               | Optional     | Next agent and context                                                                                          |

**Key rule:** When `status: "blocked"`, set `handoff.next_agent` to `null`. Orchestrator uses routing table to decide next steps. See `persisting-agent-outputs/references/metadata-format.md` for complete schema.

### Principle 5: Progress Persistence

External state files survive context exhaustion and session interruptions:

```
.claude/.output/features/{feature-id}/
├── MANIFEST.yaml                   # Unified state: agents, phases, verification
├── context/                        # Requirements
├── architecture/                   # Design decisions
├── implementation/                 # Agent outputs
└── testing/                        # Test results
```

**Two-Layer State System:**

| Layer             | Location                                  | Purpose                                               | Used By                                         |
| ----------------- | ----------------------------------------- | ----------------------------------------------------- | ----------------------------------------------- |
| **Per-Agent**     | Embedded JSON at end of each `.md` output | What THIS agent did, skills invoked, handoff context  | Hooks (capture-agent-result.sh), verification   |
| **Per-Directory** | `MANIFEST.yaml`                           | ALL agents contributed, workflow phases, verification | Orchestration, cross-session resume, PreCompact |

The `phases` and `verification` sections in MANIFEST.yaml are OPTIONAL—only populated by orchestration skills. Ad-hoc agent calls only update `agents_contributed`.

### Principle 6: Human Checkpoints

Get explicit approval before irreversible phases:

```
Phase 1-5: Setup/Discovery    → Automated
Phase 6: Brainstorming        → ⏸ CHECKPOINT (User approves design direction) [LARGE only]
Phase 7: Architecture Plan    → ⏸ CHECKPOINT (User approves architecture) [MEDIUM+]
Phase 8-15: Impl/Review/Test  → Automated with compaction gates
Phase 16: Completion          → ⏸ CHECKPOINT (User approves final result)
```

**Compaction Gates (⛔)**: Phases 3, 8, and 13 require context compaction before proceeding.

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

- **1.1**: Orchestrators coordinate (no Write/Edit), workers implement
  [Anthropic Multi-Agent Research](https://www.anthropic.com/engineering/multi-agent-research-system)

- **1.2**: Each agent spawn uses NEW instance, no context pollution
  [Anthropic Multi-Agent Research](https://www.anthropic.com/engineering/multi-agent-research-system)

- **1.3**: JSON schemas with status/blocked*reason/handoff fields
  \_persisting-agent-outputs skill*

- **1.4**: Parallel when independent, sequential when dependent
  [Anthropic Multi-Agent Research](https://www.anthropic.com/engineering/multi-agent-research-system)

- **1.5**: references/prompts/ with MANDATORY SKILLS embedded
  [obra/superpowers](https://github.com/obra/superpowers)

- **1.6**: Commands only invoke skills, no logic duplication
  [obra/superpowers](https://github.com/obra/superpowers)

### Category 2: Phase Management (6 patterns)

| #   | Pattern                                 |
| --- | --------------------------------------- |
| 2.1 | TodoWrite Tracking Mandatory            |
| 2.2 | Phase Numbering Consistency             |
| 2.3 | Human Checkpoints                       |
| 2.4 | Checkpoint Configuration Documented     |
| 2.5 | Context Compaction at Phase Transitions |
| 2.6 | Compaction Gates (BLOCKING)             |

- **2.1**: Create todos at workflow start, update real-time
  [TodoWrite Tracking](https://platform.claude.com/docs/en/agent-sdk/todo-tracking)

- **2.2**: Sequential numbers starting at 1 (not 0), referenced in prompts/docs. Sub-steps use decimals (5.1, 5.2).
  _internal convention_

- **2.3**: Strategic user approval (design, architecture, completion)
  [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)

- **2.4**: When/why/how for each checkpoint
  _internal convention_

- **2.5**: Summarize every 3 phases, archive to files
  [Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

- **2.6**: BLOCKING checkpoints at phase transitions (Phases 3, 8, 13) requiring context compaction before proceeding. Token thresholds: 75% (SHOULD compact), 80% (MUST compact), 85% (hook BLOCKS agent spawning).
  _[compaction-gates.md](.claude/skills/orchestrating-multi-agent-workflows/references/compaction-gates.md)_

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
- **3.7**: {OUTPUT*DIRECTORY}/locks/{agent-name}.lock distributed locking — \_implemented 2026-01-17*

### Category 4: Quality Gates (7 patterns)

| #   | Pattern                            |
| --- | ---------------------------------- |
| 4.1 | Two-Stage Review                   |
| 4.2 | Validation Loops with Retry Limits |
| 4.3 | Explicit Validation Loop Protocol  |
| 4.4 | Requirements Verification Phase    |
| 4.5 | Blocking Gates                     |
| 4.6 | Gate Override Protocol             |
| 4.7 | P0/Compliance Validation           |

- **4.1**: Spec compliance (BLOCKING) → Code quality (parallel) — [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
- **4.2**: MAX 2-3 retries per stage, then escalate — [ralph-orchestrator](https://github.com/mikeyobrien/ralph-orchestrator)
- **4.3**: Max 3 iterations per phase, phase-specific validators, pass criteria — [ralph-orchestrator](https://github.com/mikeyobrien/ralph-orchestrator)
- **4.4**: Pre-review checklist: all requirements implemented? — _internal convention_
- **4.5**: Cannot proceed until conditions met — _internal convention_
- **4.6**: Explicit user approval via AskUserQuestion, documented — [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
- **4.7**: Domain-specific compliance checks — _internal convention_

> **Note:** Complexity analysis (cyclomatic complexity) is handled at the reviewer agent level via linters (golangci-lint, ESLint), not at the orchestration level.

### Category 5: Context Management (4 patterns)

| #   | Pattern                     |
| --- | --------------------------- |
| 5.1 | Git Worktrees for Isolation |
| 5.2 | Context Compaction Protocol |
| 5.3 | Context Window Monitoring   |
| 5.4 | Progress Persistence        |

- **5.1**: Separate worktree per feature for conflict prevention — [Anthropic Multi-Agent Research](https://www.anthropic.com/engineering/multi-agent-research-system)
- **5.2**: 4-step: summarize completed, keep active, file references, trigger every 3 phases — [Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- **5.3**: Programmatic token tracking via JSONL files, threshold-based compaction triggers — _[context-monitoring.md](.claude/skills/orchestrating-multi-agent-workflows/references/context-monitoring.md), implemented 2026-01-17_
- **5.4**: MANIFEST.yaml with resume protocol — _persisting-agent-outputs skill (schema) + persisting-progress-across-sessions skill (protocol)_

### Category 6: Progress Tracking (3 patterns)

| #   | Pattern                     |
| --- | --------------------------- |
| 6.1 | Unified State File          |
| 6.2 | Agent Contribution Tracking |
| 6.3 | Metrics Tracking            |

- **6.1**: MANIFEST.yaml with phases, verification, status — _persisting-agent-outputs skill_
- **6.2**: agents*contributed array with artifacts, timestamps, files_modified — \_persisting-agent-outputs skill*
- **6.3**: tokens, cost, validation_iterations, conflicts, escalations, phase_durations — [ralph-orchestrator](https://github.com/mikeyobrien/ralph-orchestrator)

### Category 7: Error Handling (3 patterns)

| #   | Pattern                      |
| --- | ---------------------------- |
| 7.1 | Error Recovery Documentation |
| 7.2 | Escalation to User           |
| 7.3 | Emergency Abort Protocol     |

- **7.1**: references/error-recovery.md or troubleshooting.md
  _internal convention_

- **7.2**: AskUserQuestion when retry limits exceeded
  [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)

- **7.3**: When to abort (3+ failures, user request, critical issue), rollback procedure
  **Praetorian Implementation:** [emergency-abort.md](.claude/skills/orchestrating-multi-agent-workflows/references/emergency-abort.md)

### Category 8: Documentation (4 patterns)

| #   | Pattern                          |
| --- | -------------------------------- |
| 8.1 | Integration Section              |
| 8.2 | Rationalization Prevention Table |
| 8.3 | Exit Criteria Documentation      |
| 8.4 | Prompt Template Documentation    |

- **8.1**: Called-by, Requires, Calls, Spawns, Conditional, Pairs-with
  [obra/superpowers](https://github.com/obra/superpowers)

- **8.2**: Common bypass attempts with mandatory responses
  [Claude Skills Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)

- **8.3**: Clear, verifiable conditions for completion
  [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)

- **8.4**: references/prompts/README.md explaining usage
  [obra/superpowers](https://github.com/obra/superpowers)

### Category 9: Integration Patterns (5 patterns)

| #   | Pattern                          |
| --- | -------------------------------- |
| 9.1 | REQUIRED SUB-SKILL Declarations  |
| 9.2 | Conditional Sub-Skills Table     |
| 9.3 | Agent Skills in Prompts          |
| 9.4 | Workflow Handoff Protocol        |
| 9.5 | Full Workflow Skills Integration |

- **9.1**: Inline directives in skill content
  [obra/superpowers](https://github.com/obra/superpowers)

- **9.2**: When/why to invoke optional skills
  [Agent Skills Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

- **9.3**: Embedded skill requirements in prompt templates
  [obra/superpowers](https://github.com/obra/superpowers)

- **9.4**: Check TodoWrite for parent workflow, continue if pending
  [TodoWrite Tracking](https://platform.claude.com/docs/en/agent-sdk/todo-tracking)

- **9.5**: finishing-a-development-branch at completion
  [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow) + internal convention

### Category 10: Iteration Patterns (6 patterns)

**Source:** Ralph Wiggum technique by Geoffrey Huntley, implemented in [ralph-orchestrator](https://github.com/mikeyobrien/ralph-orchestrator) by Mike O'Brien (920+ tests, $50K contract for $297 API costs).

**Philosophy:** "Iteration trumps perfection" - deterministic failures are predictable and informative.

| #    | Pattern                 |
| ---- | ----------------------- |
| 10.1 | Completion Promise      |
| 10.2 | Agent Scratchpad        |
| 10.3 | Iteration Safety Guards |
| 10.4 | Loop Detection          |
| 10.5 | Tight Feedback Loop     |
| 10.6 | Error History Injection |

- **10.1**: Explicit string signal (e.g., `TASK_COMPLETE`, `ALL_TESTS_PASSING`) that task is done
  [ralph-orchestrator](https://github.com/mikeyobrien/ralph-orchestrator)

- **10.2**: Cross-iteration context file (`.agent/scratchpad.md`) tracking: accomplished, remaining, decisions, blockers
  [ralph-orchestrator](https://github.com/mikeyobrien/ralph-orchestrator)

- **10.3**: Prevent runaway: `max_iterations` (10), `max_runtime` (15min), `consecutive_error_limit` (3), `max_cost` ($50)[ralph-orchestrator](https://github.com/mikeyobrien/ralph-orchestrator)

- **10.4**: Fuzzy string matching (90% similarity threshold, 5-output sliding window) detects stuck agents
  [ralph-orchestrator](https://github.com/mikeyobrien/ralph-orchestrator)

- **10.5**: Implementation→Review→Test cycle with automatic retry on failure
  [Ralph Wiggum Technique](https://awesomeclaude.ai/ralph-wiggum)

- **10.6**: Inject "Recent Errors to Avoid" (last 2-5 errors) into prompts to prevent repeat mistakes
  [ralph-orchestrator](https://github.com/mikeyobrien/ralph-orchestrator)

**Existing Skill:** `iterating-to-completion` (Phase 1 complete) implements 10.1-10.4 for **intra-task** iteration.

**Praetorian Implementation (Phase 2 COMPLETE):** Tight Feedback Loop (10.5) for **inter-phase** iteration implemented in:

- [tight-feedback-loop.md](.claude/skills/orchestrating-multi-agent-workflows/references/tight-feedback-loop.md) - Canonical implementation

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

Skills form explicit chains with clear handoff points. The most important fork occurs after planning:

```
                              ┌─────────────────────────────────────────────────┐
                              │                writing-plans                    │
                              │    Creates implementation plan with tasks       │
                              └──────────────────────┬──────────────────────────┘
                                                     │
                    ┌────────────────────────────────┼────────────────────────────────┐
                    │                                │                                │
                    ▼                                ▼                                ▼
    ┌───────────────────────────┐   ┌───────────────────────────┐   ┌──────────────────────────--─┐
    │     Manual Execution      │   │     executing-plans       │   │ orchestrating-*-development │
    │                           │   │                           │   │                             │
    │ Human follows plan        │   │ Single agent implements   │   │ Spawns specialist agents    │
    │ No AI assistance          │   │ Human checkpoint/3 tasks  │   │ Parallel where possible     │
    │                           │   │ Tools: Edit, Write, Bash  │   │ Tools: Task (NO Edit)       │
    └───────────────────────────┘   └───────────────────────────┘   └───────────────────────────--┘
           │                                │                                │
           │                                │                                │
    For: External teams,             For: Simple/interdependent,       For: Complex multi-concern,
         handoff scenarios                 budget-conscious                 expertise diversity
```

**The `/feature` command follows the orchestration path using the Standard 16-Phase Template:**

```
/feature (command)
    └── orchestrating-feature-development (skill)
            │
            ├── Phase 1: Setup
            │       Creates worktree, output directory, MANIFEST.yaml
            │
            ├── Phase 2: Triage
            │       Classifies work type (BUGFIX/SMALL/MEDIUM/LARGE)
            │
            ├── Phase 3: Codebase Discovery ⛔ COMPACTION GATE
            │       Explores codebase patterns, detects technologies
            │
            ├── Phase 4: Skill Discovery
            │       Maps technologies to skills, writes manifest
            │
            ├── Phase 5: Complexity (MEDIUM+ only)
            │       Technical assessment, execution strategy
            │
            ├── Phase 6: Brainstorming (LARGE only)
            │       Design refinement with human-in-loop
            │
            ├── Phase 7: Architecture Plan (MEDIUM+ only)
            │       Technical design AND task decomposition
            │
            ├── Phase 8: Implementation ⛔ COMPACTION GATE
            │       Code development via *-developer agents
            │
            ├── Phase 9: Design Verification (MEDIUM+ only)
            │       Verifies implementation matches plan
            │
            ├── Phase 10: Domain Compliance
            │       Domain-specific mandatory patterns validation
            │
            ├── Phase 11: Code Quality
            │       Code review via *-reviewer agents
            │
            ├── Phase 12: Test Planning (MEDIUM+ only)
            │       Test strategy and plan creation
            │
            ├── Phase 13: Testing ⛔ COMPACTION GATE
            │       Test implementation via *-tester agents
            │
            ├── Phase 14: Coverage Verification
            │       Verifies test coverage meets threshold
            │
            ├── Phase 15: Test Quality
            │       No low-value tests, correct assertions
            │
            └── Phase 16: Completion
                    Final verification, PR, cleanup
                    REQUIRED: finishing-a-development-branch
```

See [Standard 16-Phase Template](#standard-16-phase-template) for detailed phase descriptions and skip logic.

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

Document override decision in MANIFEST.yaml.
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

| Complexity   | Agents            | Skill to Use                          | Examples                                             |
| ------------ | ----------------- | ------------------------------------- | ---------------------------------------------------- |
| **Simple**   | 1 agent directly  | None (direct action)                  | Bug fix, add prop, typo fix                          |
| **Simple+**  | 1 agent with plan | `executing-plans`                     | Multi-step fix, small feature with human checkpoints |
| **Moderate** | 2-4 agents        | `orchestrating-multi-agent-workflows` | Compare approaches, implement + test one feature     |
| **Complex**  | 5-10 agents       | `orchestrating-*-development`         | Full feature with architecture, impl, review, tests  |
| **Major**    | 10+ agents        | `orchestrating-*-development`         | Cross-cutting refactor, new subsystem                |

### Decision Checklist Before Spawning Multiple Agents

1. Can one agent complete this? If yes, delegate directly (or use `executing-plans` for multi-step work)
2. Are subtasks truly independent? If no, sequential is better—consider `executing-plans`
3. Does complexity justify 15x token cost?
4. Would parallel execution save significant time?

**Warning:** Multi-agent systems are LESS effective for tightly interdependent tasks where each step requires output from the previous step. For interdependent work, use `executing-plans` instead—it provides human checkpoints and single-agent execution without the coordination overhead.

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

## Configuration

All orchestration retry and iteration limits are centralized in `.claude/config/orchestration-limits.yaml`.

### Configuration Sections

| Section       | Scope                                      | Used By                                   |
| ------------- | ------------------------------------------ | ----------------------------------------- |
| `intra_task`  | Same agent looping on ONE task             | `iterating-to-completion`                 |
| `inter_phase` | Implementation→Review→Test cycles          | `orchestrating-multi-agent-workflows`     |
| `orchestrator`| Re-invoking entire patterns/phases         | All orchestration skills                  |
| `escalation`  | What happens when limits are exceeded      | All orchestration and iteration skills    |

### Key Limits

```yaml
intra_task:
  max_iterations: 10
  max_runtime_minutes: 15
  consecutive_error_limit: 3

inter_phase:
  max_feedback_iterations: 5
  max_consecutive_review_failures: 3
  max_consecutive_test_failures: 3

orchestrator:
  requirement_compliance_retries: 2
  quality_fix_retries: 2
  test_fix_retries: 2
```

### Precedence Rules

1. Skill-specific override (if skill declares custom limit)
2. Config file (central defaults)
3. Hardcoded fallback (only if config unavailable)

**No Unilateral Overrides:** Agents MUST NOT override config values (even with "safer" lower limits) or add limits together across scopes. To change limits, update the config file or get user approval via `AskUserQuestion`.

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

### When should I use `executing-plans` vs `orchestrating-multi-agent-workflows`?

These are **mutually exclusive execution models**, not composable skills:

| Question                                                         | If Yes →        | If No →         |
| ---------------------------------------------------------------- | --------------- | --------------- |
| Do tasks require different expertise (arch, impl, test, review)? | Orchestration   | executing-plans |
| Would parallel execution significantly reduce time?              | Orchestration   | executing-plans |
| Are tasks tightly interdependent (each needs prior output)?      | executing-plans | Orchestration   |
| Is human review needed every few tasks?                          | executing-plans | Orchestration   |
| Token budget under 50K?                                          | executing-plans | Orchestration   |

**Why can't I use both?**

- `executing-plans` requires Edit/Write tools (the agent implements)
- `orchestrating-*` forbids Edit/Write tools (spawned agents implement)

An agent can't have and not-have implementation tools simultaneously. Choose one model based on task characteristics.

**Common mistake:** Trying to "orchestrate" an `executing-plans` run by spawning an agent to run it. This wastes tokens—just use `executing-plans` directly in the main conversation.

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
- **Tight feedback loops** (Pattern 10.5): Across phases, Implementation→Review→Test cycle repeats until FEATURE_COMPLETE

---

## References

### Internal - Core Skills

- **Agent Architecture**: `.claude/docs/agents/AGENT-ARCHITECTURE.md`
- **Skill Architecture**: `.claude/docs/skills/SKILL-ARCHITECTURE.md`
- **Foundational Skill (CORE)**: `.claude/skills/orchestrating-multi-agent-workflows/SKILL.md`
- **Progress Persistence (CORE)**: `.claude/skills/persisting-progress-across-sessions/SKILL.md`
- **Agent Outputs (CORE)**: `.claude/skills/persisting-agent-outputs/SKILL.md`

### Internal - Library Skills (Orchestration)

- **Feature Development**: `.claude/skill-library/development/orchestrating-feature-development/SKILL.md`
- **Capability Development**: `.claude/skill-library/development/capabilities/orchestrating-capability-development/SKILL.md`
- **Integration Development**: `.claude/skill-library/development/integrations/orchestrating-integration-development/SKILL.md`
- **Fingerprintx Development**: `.claude/skill-library/development/capabilities/orchestrating-fingerprintx-development/SKILL.md`
- **MCP Development**: `.claude/skill-library/claude/mcp-management/orchestrating-mcp-development/SKILL.md`
- **API Tool Development**: `.claude/skill-library/claude/mcp-management/orchestrating-api-tool-development/SKILL.md`
- **Research**: `.claude/skill-library/research/orchestrating-research/SKILL.md`
- **CVE Research Jobs**: `.claude/skill-library/research/orchestrating-cve-research-jobs/SKILL.md`
- **Bugfix**: `.claude/skill-library/testing/orchestrating-bugfix/SKILL.md`

### Internal - OMAW Reference Files (Current State)

| Reference File                                    | Pattern(s)             | Purpose                                      |
| ------------------------------------------------- | ---------------------- | -------------------------------------------- |
| `references/phase-1-setup.md`                     | 2.2                    | Worktree creation, output directory, MANIFEST.yaml |
| `references/phase-2-triage.md`                    | 2.2                    | Work type classification (BUGFIX/SMALL/MEDIUM/LARGE) |
| `references/phase-3-codebase-discovery.md`        | 2.2                    | Explore agent patterns, technology detection |
| `references/phase-4-skill-discovery.md`           | 2.2                    | Technology-to-skill mapping, manifest writing |
| `references/phase-5-complexity.md`                | 2.2                    | Technical assessment, execution strategy     |
| `references/phase-6-brainstorming.md`             | 2.2                    | Design refinement with human-in-loop (LARGE only) |
| `references/phase-7-architecture-plan.md`         | 2.2                    | Technical design AND task decomposition      |
| `references/phase-8-implementation.md`            | 2.2                    | Code development patterns                    |
| `references/phase-9-design-verification.md`       | 2.2                    | Plan-to-implementation matching              |
| `references/phase-10-domain-compliance.md`        | 2.2                    | Domain-specific mandatory patterns           |
| `references/phase-11-code-quality.md`             | 2.2                    | Code review for maintainability              |
| `references/phase-12-test-planning.md`            | 2.2                    | Test strategy and plan creation              |
| `references/phase-13-testing.md`                  | 2.2                    | Test implementation and execution            |
| `references/phase-14-coverage-verification.md`    | 2.2                    | Coverage threshold validation                |
| `references/phase-15-test-quality.md`             | 2.2                    | Assertion quality, no low-value tests        |
| `references/phase-16-completion.md`               | 2.2                    | Final verification, PR, cleanup              |
| `references/compaction-gates.md`                  | 2.6                    | BLOCKING checkpoints for context management  |
| `references/context-monitoring.md`                                        | 5.3                    | Programmatic token tracking via JSONL        |
| `references/agent-matrix.md`                                              | 3.2                    | Initial agent selection guide                |
| `references/agent-output-validation.md`                                   | 1.3                    | Structured handoff validation                |
| `references/delegation-templates.md`                                      | 1.5, 3.1               | Agent prompt templates with mandatory skills |
| `references/effort-scaling.md`                                            | 3.4                    | Tier definitions and decision checklist      |
| `references/file-conflict-protocol.md`                                    | 3.5, 3.6               | Proactive conflict prevention                |
| `references/file-locking.md`                                              | 3.7                    | Distributed locks for parallel agents        |
| `references/gated-verification.md`                                        | 4.1, 4.5               | Two-stage review, blocking gates             |
| `references/orchestration-guards.md`                                      | 4.2, 4.3               | Retry limits, validation loops               |
| `references/p0-compliance.md`                                             | 4.7                    | Domain-specific compliance validation        |
| `references/tight-feedback-loop.md`                                       | 10.1, 10.2, 10.5, 10.6 | Implementation→Review→Test cycles            |
| `references/emergency-abort.md`                                           | 7.3                    | Safe workflow termination                    |
| `references/escalation-protocol.md`                                       | 7.2                    | When/how to escalate to user                 |
| `references/checkpoint-configuration.md`                                  | 2.3, 2.4               | Human approval points                        |
| `references/progress-file-format.md`                                      | 5.4, 6.1               | Persistence structure                        |
| `references/workflow-handoff.md`                                          | 9.4                    | Parent-child workflow integration            |
| `references/required-sub-skills.md`                                       | 9.1                    | REQUIRED SUB-SKILL declarations              |
| `references/anti-patterns.md`                                             | -                      | Common orchestration mistakes                |
| `references/exit-criteria.md`                                             | 8.3                    | Completion checklist, COUNT+UNIT format      |
| `references/clarification-protocol.md`                                    | -                      | Handling agent clarification requests        |
| `references/clarification-protocol-advanced.md`                           | -                      | Mixed questions, blocked vs clarification    |
| `references/clarification-protocol-examples.md`                           | -                      | Requirement, dependency, arch workflows      |
| `references/delegation-templates-testing.md`                              | 1.5, 3.1               | Unit, integration, E2E test templates        |
| `references/delegation-templates-review-skills.md`                        | 1.5, 3.1               | Reviewer prompts, skill requirements         |
| `references/error-recovery.md`                                            | 7.1                    | Recovery framework, abort triggers, state    |
| `references/integration-skills.md`                                        | 9.x                    | Integration matrix, invocation hierarchy     |
| `references/advanced-patterns.md`                                         | Various                | Context compaction, worktrees, security      |
| `references/prompt-templates.md`                                          | 1.5, 8.4               | Agent prompt structure and requirements      |
| `references/phase-validators.md`                                          | 4.3                    | Generic validators per phase, pass criteria  |
| `references/execution-patterns.md`                                        | 3.x                    | Sequential/parallel/hybrid examples          |
| `references/output-format.md`                                             | 1.3                    | Standardized JSON output schema              |
| `references/quality-scoring.md`                                           | 4.x                    | Quantitative scoring (0-100) for validation  |
| `references/agent-output-validation-algorithm.md`                         | 1.3                    | 7-step validation procedure                  |
| `references/agent-output-validation-examples.md`                          | 1.3                    | Success/failure scenarios                    |
| `references/agent-output-validation-templates.md`                         | 1.3                    | Re-spawn prompts, retry policy               |

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
Patterns: 2.3, 4.1, 4.6, 7.2, 8.3

**[Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)**
Patterns: 2.5, 5.2

**[TodoWrite Tracking](https://platform.claude.com/docs/en/agent-sdk/todo-tracking)**
Patterns: 2.1, 9.4

**[obra/superpowers](https://github.com/obra/superpowers)**
Patterns: 1.5, 1.6, 3.1, 8.1, 8.4, 9.1, 9.3

**[ralph-orchestrator](https://github.com/mikeyobrien/ralph-orchestrator)**
Patterns: 4.2, 4.3, 6.3, 7.3, 10.1-10.4, 10.6

**[Ralph Wiggum Technique](https://awesomeclaude.ai/ralph-wiggum)**
Patterns: 10.5

**[Context Parallelism](https://www.agalanov.com/notes/efficient-claude-code-context-parallelism-sub-agents/)**
Patterns: 3.5, 3.6

**[Agent Skills Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)**
Patterns: 9.2

**[Claude Skills Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)**
Patterns: 8.2

### Internal Sources

**persisting-agent-outputs skill**
Patterns: 1.3, 5.4, 6.1, 6.2

**Internal convention**
Patterns: 2.2, 2.4, 3.2, 4.4, 4.5, 4.7, 7.1, 9.5

**orchestrating-multi-agent-workflows references**
Patterns: 3.7 (file-locking.md), 5.3 (context-monitoring.md)

### Praetorian Guard Implementations (Canonical)

**Use these as the source of truth for implementing patterns in other orchestration skills.**

> **Note:** These implementations are in `orchestrating-multi-agent-workflows` skill. The 16-phase template and compaction gates are the current standard.

**[references/compaction-gates.md](.claude/skills/orchestrating-multi-agent-workflows/references/compaction-gates.md)**
Pattern: 2.6 (Compaction Gates - BLOCKING)

- BLOCKING checkpoints at Phases 3, 8, 13
- Token thresholds: 75% (SHOULD), 80% (MUST), 85% (hook BLOCKS)
- Integration with context-monitoring.md for programmatic checks
- Enforced via hooks (compaction-gate-enforcement.sh)

**[references/tight-feedback-loop.md](.claude/skills/orchestrating-multi-agent-workflows/references/tight-feedback-loop.md)**
Patterns: 10.1 (Completion Promise), 10.2 (Agent Scratchpad), 10.3 (Safety Guards), 10.5 (Tight Feedback Loop), 10.6 (Error History Injection)

- INTER-phase iteration (Implementation→Review→Test cycle)
- Completion promise: `IMPLEMENTATION_VERIFIED`
- Scratchpad: `{feature-dir}/feedback-scratchpad.md`
- Guards: max_feedback_iterations (5), max_consecutive_failures (3)

**[references/emergency-abort.md](.claude/skills/orchestrating-multi-agent-workflows/references/emergency-abort.md)**
Pattern: 7.3 (Emergency Abort Protocol)

- 5 abort triggers (user request, repeated escalations, unrecoverable error, cost/time exceeded)
- 4 cleanup options via AskUserQuestion (keep everything, keep artifacts, rollback, full cleanup)
- Progress.json abort_info schema
- Resume after abort via `/feature resume {id}`

**[iterating-to-completion/SKILL.md](.claude/skills/iterating-to-completion/SKILL.md)**
Patterns: 10.1-10.4 (INTRA-task iteration)

- Same-agent loops with completion promise
- Guards: max_iterations (10), max_runtime (15min), consecutive_error_limit (3)
- Different from Tight Feedback Loop (INTER-phase)

**[references/context-monitoring.md](.claude/skills/orchestrating-multi-agent-workflows/references/context-monitoring.md)**
Pattern: 5.3 (Context Window Monitoring)

- Programmatic token tracking via Claude Code JSONL files (`~/.claude/projects/<project>/<session>.jsonl`)
- Scripts to get current context size: `cache_read + cache_create + input` from latest entry
- Threshold triggers: 75% (150k) = SHOULD compact, 80% (160k) = MUST compact, 85% (170k) = hook BLOCKS
- Integration with compaction gates at phase transitions
- External tools using same mechanism: [ccusage](https://github.com/ryoppippi/ccusage), [claude-code-statusline](https://github.com/levz0r/claude-code-statusline)

**[references/file-locking.md](.claude/skills/orchestrating-multi-agent-workflows/references/file-locking.md)**
Pattern: 3.7 (File Locking Mechanism)

- Distributed locks in `{OUTPUT_DIRECTORY}/locks/{agent-name}.lock`
- Lock schema: agent, locked_at, files[], directories[], expires_at (1 hour default)
- Conflict detection before parallel spawn, resolution strategies (sequential, reassignment, split, merge)
- Automatic cleanup when workflow completes or aborts

**[references/phase-validators.md](.claude/skills/orchestrating-multi-agent-workflows/references/phase-validators.md)**
Pattern: 4.3 (Explicit Validation Loop Protocol)

- Generic validators per phase with pass criteria
- Integration with orchestration-guards.md for retry limits

## Skill Connectivity Analysis

### Foundational Skill Dependency Matrix

The `orchestrating-multi-agent-workflows` skill is the foundation for all orchestration patterns. Understanding its dependencies clarifies how the orchestration ecosystem fits together.

> **Cross-References for Agent Skill Requirements**
>
> - **What agents must invoke**: See [AGENT-ARCHITECTURE.md](../agents/AGENT-ARCHITECTURE.md) for the complete Step 1/2/3 skill template (8 universal skills + role-specific additions + gateway routing)
> - **How orchestrators validate agents**: See `orchestrating-multi-agent-workflows/references/agent-output-validation.md` for the 4-tier skill hierarchy and validation algorithm
> - **Gateway matrix by agent type**: See `agent-output-validation.md` Section 2 for which gateways each agent type requires

#### Required Skills (invoke at orchestration start)

| Skill                                 | Purpose                                                                | Why Required                            |
| ------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------- |
| `persisting-agent-outputs`            | Output dir structure, MANIFEST.yaml, blocked agent routing table | Provides shared workspace / routing decisions |
| `persisting-progress-across-sessions` | Resume protocol, progress files                                        | For tasks >30 min or >5 phases          |

#### Called During Execution

| Skill                                      | Trigger                      | Purpose                                                                                                                          |
| ------------------------------------------ | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `developing-with-subagents` (CORE)         | 3+ independent tasks in plan | Same-session parallel execution with code review gates                                                                           |
| `dispatching-parallel-agents` (CORE)       | 3+ independent failures      | Parallel debugging of independent test failures                                                                                  |
| `finishing-a-development-branch` (LIBRARY) | Workflow complete            | Branch cleanup, PR creation, worktree cleanup - `Read(".claude/skill-library/workflow/finishing-a-development-branch/SKILL.md")` |
| `using-git-worktrees` (CORE)               | 5+ phase orchestrations      | Isolated workspaces, rollback points                                                                                             |

#### Paired Skills (check before/during execution)

| Skill                                | Relationship                                                          |
| ------------------------------------ | --------------------------------------------------------------------- |
| `writing-plans` (CORE)               | Create detailed plan BEFORE orchestrating                             |
| `brainstorming` (CORE)               | Design exploration BEFORE implementation                              |
| `verifying-before-completion` (CORE) | Embedded in ALL agent prompts for exit criteria                       |
| `iterating-to-completion` (CORE)     | INTRA-task loops (complementary to orchestration's INTER-phase loops) |

#### Alternative Execution Model (NOT a dependency)

| Skill             | Relationship                                                             |
| ----------------- | ------------------------------------------------------------------------ |
| `executing-plans` | Alternative single-executor model; mutually exclusive with orchestration |

**Key insight:** `executing-plans` does NOT appear in the dependency list because it represents a different execution model, not a sub-skill. See [Two Execution Models](#two-execution-models-coordinator-vs-executor) for the distinction.

**Blocked Agent Routing**: The `orchestrating-multi-agent-workflows` skill USES the blocked agent routing table maintained in `persisting-agent-outputs/references/blocked-agent-routing.md` as the single source of truth. The routing table is owned by the `persisting-agent-outputs` skill. Orchestration skills may add orchestration-specific override logic based on workflow context.
