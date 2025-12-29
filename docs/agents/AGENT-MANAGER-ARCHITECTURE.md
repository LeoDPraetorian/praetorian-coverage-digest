# Agent Manager Architecture

**Complete architectural documentation for the agent lifecycle management system.**

## Table of Contents

1. [Overview](#overview)
2. [State Machine Model](#state-machine-model)
3. [Four-Layer Architecture](#four-layer-architecture)
4. [Delegation Flow](#delegation-flow)
5. [Circular Workflow Patterns](#circular-workflow-patterns)
6. [CLI Architecture](#cli-architecture)
7. [TDD Enforcement](#tdd-enforcement)
8. [Tool Usage Patterns](#tool-usage-patterns)
9. [Data Flow](#data-flow)
10. [Key Design Decisions](#key-design-decisions)
11. [Comparison with Skill Manager](#comparison-with-skill-manager)

---

## Overview

The Agent Manager is a comprehensive lifecycle management system for Claude Code agents. It enforces quality through TDD (Test-Driven Development), maintains compliance through 19-phase auditing (Phase 0 CLI + Phases 1-18 manual), and orchestrates complex workflows through circular delegation patterns.

**System Capabilities:**

- **Lifecycle Management**: Create, update, audit, fix, rename, test, search, list agents
- **Quality Assurance**: 19-phase audit (Phase 0 automated + 18 manual LLM checks)
- **Compliance Remediation**: Three-tier fix orchestration (deterministic, semantic, manual)
- **Discovery**: Search and list agents across 8 categories
- **Behavioral Testing**: Pressure testing agents under time/authority/sunk cost scenarios
- **Lean Agent Enforcement**: <300 line limit (or <400 for complex types)

**Architecture Philosophy:**

- **Lean Agents**: Keep agents under 300 lines, extract patterns to skills
- **Progressive Disclosure**: Agents delegate to skills via Tiered Skill Loading Protocol
- **TDD Enforcement**: RED-GREEN-REFACTOR mandatory for creation/update
- **Router Pattern**: Pure delegation without implementation logic
- **Single File Design**: Each agent is a single .md file (simpler than skill directories)

---

## State Machine Model

The Agent Manager operates as a **finite state machine** with circular transitions for iterative quality improvement. Understanding this model is essential for:

- **Debugging**: Knowing which state transitions are valid helps diagnose stuck workflows
- **Extension**: Adding new operations requires defining their state transitions
- **Monitoring**: State tracking enables progress visibility and timeout detection

### State Categories

| Category                | States                                                                      | Characteristics                     |
| ----------------------- | --------------------------------------------------------------------------- | ----------------------------------- |
| **Entry States**        | CREATING, UPDATING, AUDITING, FIXING, RENAMING, TESTING, SEARCHING, LISTING | User-initiated via `/agent-manager` |
| **Intermediate States** | RESEARCHING, PRESSURE_TESTING, AWAITING_HUMAN                               | Delegation or waiting states        |
| **Terminal States**     | COMPLETE, ERROR, CANCELLED                                                  | Workflow endpoints                  |

### State Transition Matrix

The complete matrix of all valid state transitions in the system:

```
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                         STATE TRANSITION MATRIX - AGENT MANAGER                           ║
╠═══════════════════════════════════════════════════════════════════════════════════════════╣
║ Current State       │ Event/Condition               │ Next State         │ Notes          ║
╠═══════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                           ║
║ ─── CREATION WORKFLOW (10 phases) ─────────────────────────────────────────────────────── ║
║ CREATING            │ phase_1_red_documented        │ CREATING           │ continue       ║
║ CREATING            │ phase_7_green_pass            │ AUDITING           │ GREEN phase    ║
║ CREATING            │ phase_8_audit_failures        │ FIXING             │ fix issues     ║
║ CREATING            │ phase_10_refactor_needed      │ PRESSURE_TESTING   │ via subagent   ║
║ CREATING            │ phase_10_complete             │ COMPLETE           │ ─              ║
║ PRESSURE_TESTING    │ all_scenarios_pass            │ CREATING           │ continue       ║
║ PRESSURE_TESTING    │ bypass_detected               │ CREATING           │ add counters   ║
║                                                                                           ║
║ ─── UPDATE WORKFLOW (7 phases) ────────────────────────────────────────────────────────── ║
║ UPDATING            │ phase_4_green_pass            │ UPDATING           │ continue       ║
║ UPDATING            │ phase_6_compliance_pass       │ COMPLETE           │ minor change   ║
║ UPDATING            │ phase_6_compliance_fail       │ FIXING             │ fix issues     ║
║ UPDATING            │ phase_7_refactor_needed       │ PRESSURE_TESTING   │ major change   ║
║ UPDATING            │ phase_7_refactor_skip         │ COMPLETE           │ minor change   ║
║                                                                                           ║
║ ─── AUDIT ↔ FIX CYCLE (primary circular pattern) ──────────────────────────────────────── ║
║ AUDITING            │ all_pass                      │ COMPLETE           │ ─              ║
║ AUDITING            │ failures + user_full_fix      │ FIXING             │ recommended    ║
║ AUDITING            │ failures + user_determ_only   │ FIXING             │ Tier 1 only    ║
║ AUDITING            │ failures + user_skip          │ COMPLETE           │ with warnings  ║
║ FIXING              │ fixes_applied                 │ AUDITING           │ re-audit ⟲     ║
║ FIXING              │ iteration_count > 5           │ ERROR              │ max reached    ║
║ FIXING              │ human_required_remaining      │ AWAITING_HUMAN     │ Tier 4         ║
║ AWAITING_HUMAN      │ human_fixes_applied           │ AUDITING           │ re-verify      ║
║ AWAITING_HUMAN      │ user_skip                     │ COMPLETE           │ with warnings  ║
║                                                                                           ║
║ ─── TESTING WORKFLOW (behavioral validation) ───────────────────────────────────────────- ║
║ TESTING             │ frontmatter_coverage_fail     │ ERROR              │ dead skills    ║
║ TESTING             │ skill_verified                │ TESTING            │ next skill     ║
║ TESTING             │ all_skills_tested             │ COMPLETE           │ ─              ║
║ TESTING             │ pressure_scenario             │ PRESSURE_TESTING   │ spawn agent    ║
║ PRESSURE_TESTING    │ scenario_pass                 │ TESTING            │ next scenario  ║
║ PRESSURE_TESTING    │ scenario_fail                 │ TESTING            │ report failure ║
║                                                                                           ║
║ ─── STRUCTURAL OPERATIONS ─────────────────────────────────────────────────────────────── ║
║ RENAMING            │ step_n_complete (n < 8)       │ RENAMING           │ 8-step proto   ║
║ RENAMING            │ all_8_steps_complete          │ COMPLETE           │ ─              ║
║ RENAMING            │ conflict_detected             │ ERROR              │ abort          ║
║                                                                                           ║
║ ─── DISCOVERY OPERATIONS ──────────────────────────────────────────────────────────────── ║
║ SEARCHING           │ results_returned              │ COMPLETE           │ stateless      ║
║ LISTING             │ agents_displayed              │ COMPLETE           │ stateless      ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

Legend:
  ⟲  = Circular transition (returns to earlier state)
  ─  = No special notes
  Tier 1-3 = Fix categorization (Deterministic, Semantic, Manual)
```

### Circular Dependency Graph

Visual representation of state flows and circular patterns:

```
                                 ┌─────────────────────┐
                                 │    USER COMMAND     │
                                 │   /agent-manager    │
                                 └──────────┬──────────┘
                                            │
                                 ┌──────────▼──────────┐
                                 │   MANAGING-AGENTS   │
                                 │    (Pure Router)    │
                                 │   No implementation │
                                 └──────────┬──────────┘
                                            │
     ┌───────────┬────────────┬─────────────┼────────────┬────────────┬────────────┐
     │           │            │             │            │            │            │
┌────▼───┐  ┌────▼───┐  ┌─────▼────┐   ┌────▼────┐  ┌────▼───┐  ┌─────▼────┐  ┌────▼────┐
│ CREATE │  │ UPDATE │  │  AUDIT   │   │   FIX   │  │ RENAME │  │  TEST    │  │ SEARCH  │
└───┬────┘  └───┬────┘  └────┬─────┘   └───┬─────┘  └────────┘  └────┬─────┘  └─────────┘
    │           │            │             │                         │
    │           │            │             │                         │
    │      ┌────┴────────────┴─────────────┴─────────────────────────┘
    │      │
    │      │   ┌──────────────────────────────────────────────────────────┐
    │      │   │                                                          │
    │      │   │                    AUDITING                              │
    │      │   │  ┌────────────────────────────────────────────────────┐  │
    │      └──►│  │  Phase 0: CLI critical validation                  │  │◄───┐
    │          │  │  Phases 1-18: Claude manual checks                 │  │    │
    └─────────►│  │  Output: Deterministic combined table              │  │    │
               │  └────────────────────────────────────────────────────┘  │    │
               └─────────────────────────┬────────────────────────────────┘    │
                                         │                                     │
                            ┌────────────▼────────────┐                        │
                            │     DECISION POINT      │                        │
                            │  ┌────────────────────┐ │                        │
                            │  │ all_pass? COMPLETE │ │                        │
                            │  │ failures? prompt   │ │                        │
                            │  └────────────────────┘ │                        │
                            └────────────┬────────────┘                        │
                                         │                                     │
                    ┌────────────────────┼────────────────────┐                │
                    │                    │                    │                │
               ┌────▼────┐         ┌─────▼─────┐        ┌────▼────┐            │
               │  SKIP   │         │  DETERM   │        │FULL FIX │            │
               │         │         │   ONLY    │        │         │            │
               └────┬────┘         └─────┬─────┘        └────┬────┘            │
                    │                    │                   │                 │
                    │                    └─────────┬─────────┘                 │
                    │                              │                           │
                    │                   ┌──────────▼──────────┐                │
                    │                   │       FIXING        │                │
                    │                   │ ┌─────────────────┐ │                │
                    │                   │ │ T1: Deterministic│ │               │
                    │                   │ │ T2: Claude-Auto │ │                │
                    │                   │ │ T3: Hybrid      │ │                │
                    │                   │ │ T4: Human       │ │                │
                    │                   │ └─────────────────┘ │                │
                    │                   └──────────┬──────────┘                │
                    │                              │                           │
                    │                   ┌──────────▼──────────┐                │
                    │                   │    LOOP CONTROL     │                │
                    │                   │ ┌─────────────────┐ │   iteration++  │
                    │                   │ │ iter > 5? ERROR │ │────────────────┘
                    │                   │ │ else: re-audit  │ │   if iter ≤ 5
                    │                   │ └─────────────────┘ │
                    │                   └─────────────────────┘
                    │
                    ▼
               ┌─────────┐
               │COMPLETE │
               └─────────┘
```

### Cycle Characteristics

```
╔═════════════════════════════════════════════════════════════════════════════════════╗
║                              CYCLE CHARACTERISTICS                                  ║
╠═════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                     ║
║  PRIMARY CYCLE: AUDIT ↔ FIX                                                         ║
║  ─────────────────────────────────────────────────────────────────────────────────  ║
║  │ Property        │ Value                                                     │    ║
║  ├─────────────────┼───────────────────────────────────────────────────────────┤    ║
║  │ Max iterations  │ 5                                                         │    ║
║  │ Exit success    │ audit.status === 'all_pass'                               │    ║
║  │ Exit failure    │ iteration > 5 → ERROR state                               │    ║
║  │ User escape     │ user_skip → COMPLETE (warnings preserved)                 │    ║
║  │ State tracking  │ TodoWrite maintains iteration count                       │    ║
║                                                                                     ║
║  SECONDARY CYCLES                                                                   ║
║  ─────────────────────────────────────────────────────────────────────────────────  ║
║  │ Cycle               │ Max Iter │ Exit Condition                            │     ║
║  ├─────────────────────┼──────────┼───────────────────────────────────────────┤     ║
║  │ PRESSURE_TESTING    │ 3        │ All scenarios pass OR counters added      │     ║
║  │ RENAMING            │ 8        │ Sequential steps (not circular)           │     ║
║  │ TESTING             │ N        │ N = count of skills to verify             │     ║
║                                                                                     ║
║  TERMINAL STATES                                                                    ║
║  ─────────────────────────────────────────────────────────────────────────────────  ║
║  │ State     │ Meaning                              │ Recovery                │     ║
║  ├───────────┼──────────────────────────────────────┼─────────────────────────┤     ║
║  │ COMPLETE  │ Success (may include warnings)       │ N/A                     │     ║
║  │ ERROR     │ Unrecoverable (max iter, validation) │ Manual intervention     │     ║
║  │ CANCELLED │ User-initiated abort                 │ Re-run operation        │     ║
║                                                                                     ║
╚═════════════════════════════════════════════════════════════════════════════════════╝
```

---

## Four-Layer Architecture

The system is organized in four distinct layers, each with clear responsibilities:

```
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 1: COMMAND ENTRY POINT                                    │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ /agent-manager command (.claude/commands/agent-manager.md)  │ │
│ │ • User invokes: /agent-manager <operation> [args]           │ │
│ │ • Validates operation type                                  │ │
│ │ • Delegates to managing-agents router                       │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 2: ROUTER SKILL                                           │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ managing-agents (.claude/skills/managing-agents/SKILL.md)   │ │
│ │ • Pure router - NO implementation logic                     │ │
│ │ • Maintains delegation map (8 operations)                   │ │
│ │ • Routes to appropriate sub-skill                           │ │
│ │ • Enforces TodoWrite tracking for all operations            │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 3: SPECIALIZED SUB-SKILLS (8 operations)                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ INSTRUCTION-BASED:                                          │ │
│ │ • creating-agents      - Agent creation with TDD            │ │
│ │ • updating-agents      - Minimal changes with TDD           │ │
│ │ • auditing-agents      - Phase 0 CLI + Phases 1-18 manual   │ │
│ │ • fixing-agents        - Three-tier fix orchestration       │ │
│ │ • renaming-agents      - 8-step safe rename protocol        │ │
│ │ • testing-agent-skills - Behavioral + pressure testing      │ │
│ │ • searching-agents     - Keyword search with scoring        │ │
│ │ • listing-agents       - Display by category                │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 4: CLI IMPLEMENTATION (TypeScript)                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ auditing-agents/scripts/                                    │ │
│ │ ├── src/audit-critical.ts  - Phase 0 critical validation    │ │
│ │ └── src/lib/               - Shared utilities               │ │
│ │     ├── skill-recommender.ts - Agent skill matching         │ │
│ │     └── ...                                                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ searching-agents/scripts/                                   │ │
│ │ ├── src/search.ts          - Agent search CLI               │ │
│ │ └── src/lib/               - Agent parsing/finding          │ │
│ │     ├── agent-finder.ts    - Discovery logic                │ │
│ │     ├── agent-parser.ts    - Frontmatter parsing            │ │
│ │     └── types.ts           - Shared types                   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ fixing-agents/scripts/                                      │ │
│ │ └── src/fix.ts             - Deterministic fix application  │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Layer Responsibilities:**

| Layer             | Responsibility                         | Implementation              | Tools Used                   |
| ----------------- | -------------------------------------- | --------------------------- | ---------------------------- |
| **1. Command**    | User entry point, operation validation | Markdown command file       | Skill tool                   |
| **2. Router**     | Pure delegation, TodoWrite enforcement | Markdown skill file         | Read, Skill, AskUserQuestion |
| **3. Sub-Skills** | Operation-specific workflows and logic | Markdown skills (8 total)   | All tools (varies by skill)  |
| **Layer 4**       | Critical automation, shared libraries  | TypeScript (npm workspaces) | N/A (executed by Bash tool)  |

---

## Delegation Flow

### Operation Routing Map

When a user invokes `/agent-manager <operation>`, the system routes through this delegation chain:

```
USER INPUT: /agent-manager create my-new-agent "Use when..." --type development

Step 1: Command validates operation
  → .claude/commands/agent-manager.md
  → Recognizes "create" operation
  → Delegates to managing-agents router

Step 2: Router delegates to sub-skill
  → .claude/skills/managing-agents/SKILL.md
  → Maps "create" → creating-agents
  → Uses Read tool to load sub-skill
  → Read(".claude/skill-library/claude/agent-management/creating-agents/SKILL.md")

Step 3: Sub-skill executes workflow
  → creating-agents/SKILL.md
  → 10-phase creation workflow
  → Phase 0: Navigate to repo root
  → Phase 1: RED (prove gap exists)
  → Phase 2-6: Define, template, content, skills, examples
  → Phase 7: GREEN (verify agent works)
  → Phase 8: Audit (run auditing-agents)
  → Phase 9: Fix (if issues found)
  → Phase 10: REFACTOR (pressure testing)

Step 4: Audit validation (automatic)
  → creating-agents invokes auditing-agents
  → CLI executes: npm run agent:audit -- my-new-agent
  → Returns compliance status

Step 5: Fix if needed (circular delegation)
  → If audit fails, prompt user
  → User selects "Run full fixing workflow"
  → Delegates to fixing-agents
  → fixing-agents applies fixes
  → Re-audits (back to auditing-agents)
```

**Complete Delegation Table:**

| User Input                                | Command → Router → Sub-Skill                           | CLI Involved?        | Circular?           |
| ----------------------------------------- | ------------------------------------------------------ | -------------------- | ------------------- |
| `/agent-manager create X "desc" --type Y` | agent-manager → managing-agents → creating-agents      | Yes (audit)          | Yes (audit → fix)   |
| `/agent-manager update X "changes"`       | agent-manager → managing-agents → updating-agents      | Yes (audit)          | Yes (audit → fix)   |
| `/agent-manager audit X`                  | agent-manager → managing-agents → auditing-agents      | Yes (audit-critical) | Yes (→ fix → audit) |
| `/agent-manager fix X`                    | agent-manager → managing-agents → fixing-agents        | Yes (fix CLI)        | Yes (→ audit → fix) |
| `/agent-manager rename X Y`               | agent-manager → managing-agents → renaming-agents      | No (instructions)    | No                  |
| `/agent-manager test X [skill]`           | agent-manager → managing-agents → testing-agent-skills | No (Task tool)       | No                  |
| `/agent-manager search "query"`           | agent-manager → managing-agents → searching-agents     | Yes (search CLI)     | No                  |
| `/agent-manager list [--type X]`          | agent-manager → managing-agents → listing-agents       | No (Glob + Read)     | No                  |

---

## Circular Workflow Patterns

The system implements circular delegation patterns for iterative quality improvement. These patterns enable Claude to automatically remediate issues until compliance is achieved.

### Pattern 1: Audit → Fix → Audit Loop

```
┌──────────────────────────────────────────────────────────────────┐
│ USER ACTION: /agent-manager audit my-agent                       │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ AUDITING-AGENTS                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Step 1: Run Phase 0 CLI audit                                │ │
│ │   npm run agent:audit -- my-agent                            │ │
│ │   → Block scalar detection, name mismatch, description       │ │
│ │   → Returns: exit code 0 or 1                                │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Step 2: Claude manual checks (Phases 1-18)                   │ │
│ │   Evaluate 18 criteria:                                      │ │
│ │   → PermissionMode, frontmatter order, tools, gateways       │ │
│ │   → Skill Loading Protocol, deprecated patterns, etc.        │ │
│ │   → Output: Findings per phase                               │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Step 3: Consolidate results                                  │ │
│ │   → Phase 0: PASS/FAIL                                       │ │
│ │   → Phases 1-18: PASS/WARNING/ERROR/INFO per phase           │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Step 4: Prompt user for action                               │ │
│ │   AskUserQuestion:                                           │ │
│ │   → Run full fixing workflow (Recommended)                   │ │
│ │   → Apply deterministic fixes only                           │ │
│ │   → Show fix categorization                                  │ │
│ │   → Skip                                                     │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              ↓
                   User selects "Run full fixing workflow"
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ FIXING-AGENTS (Invoked via Read tool)                            │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Step 1: Categorize issues                                    │ │
│ │   Deterministic: Phase 0, 2, 16 (CLI auto-fix)               │ │
│ │   Claude-Auto:   Phase 1, 3, 6, 9, 14, 15                    │ │
│ │   Hybrid:        Phase 4-5, 10-11, 17                        │ │
│ │   Human:         Phase 7-8, 12-13, 18                        │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Step 2: Create backup                                        │ │
│ │   cp agent.md .local/agent.md.bak.{timestamp}                │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Step 3: Apply deterministic fixes (CLI)                      │ │
│ │   npm run agent:fix -- my-agent                              │ │
│ │   → Block scalar conversion                                  │ │
│ │   → Frontmatter reordering                                   │ │
│ │   → Table separator formatting                               │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Step 4: Apply Claude-automated fixes                         │ │
│ │   Phase 1: Fix permissionMode alignment (Edit tool)          │ │
│ │   Phase 3: Add/remove tools per type (Edit tool)             │ │
│ │   Phase 9: Generate Skill Loading Protocol (Edit tool)       │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Step 5: Apply hybrid fixes (interactive)                     │ │
│ │   Phase 4-5: Gateway choice → AskUserQuestion                │ │
│ │   Phase 10-11: Library skill replacement → AskUserQuestion   │ │
│ │   Phase 17: Duplication cleanup → AskUserQuestion            │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Step 6: Update changelog                                     │ │
│ │   Append to .history/{agent-name}-CHANGELOG                  │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Step 7: Re-audit to verify fixes                             │ │
│ │   CIRCULAR DELEGATION back to auditing-agents                │ │
│ │   Read(".../auditing-agents/SKILL.md")                       │ │
│ │   → Run audit again                                          │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ BACK TO AUDITING-AGENTS (Re-audit)                               │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ npm run agent:audit -- my-agent                              │ │
│ │ Result: All 19 phases PASS                                   │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Output: Success message (no prompt needed)                   │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Pattern 2: Create → Audit → Fix Loop

```
┌──────────────────────────────────────────────────────────────────┐
│ USER ACTION: /agent-manager create my-agent "desc" --type dev    │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ CREATING-AGENTS                                                  │
│ Phases 0-6: Creation workflow completes                          │
│ Phase 7: GREEN verification (spawn agent, test scenario)         │
│ Phase 8: Audit compliance                                        │
│   → Delegates to auditing-agents                                 │
│   → npm run agent:audit -- my-agent                              │
│   → Result: 3 issues (phases 3, 9, 12)                           │
│                                                                  │
│ Phase 8 continued: Prompt user                                   │
│   AskUserQuestion:                                               │
│   → Run full fixing workflow (Recommended)                       │
│   → Skip (fix manually later)                                    │
└──────────────────────────────────────────────────────────────────┘
                              ↓
                   User selects "Run full fixing workflow"
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ FIXING-AGENTS (Delegated from creating-agents)                   │
│ Apply fixes → Re-audit → Pass                                    │
│ (Same pattern as Audit → Fix → Audit above)                      │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ BACK TO CREATING-AGENTS                                          │
│ Phase 9: Fix issues (if any remaining)                           │
│ Phase 10: REFACTOR (pressure testing)                            │
│   → Spawn agent via Task tool                                    │
│   → Apply time/authority/sunk cost pressures                     │
│   → Verify agent resists bypass attempts                         │
│ → Complete ✅                                                    │
└──────────────────────────────────────────────────────────────────┘
```

### Pattern 3: Testing → Pressure Testing Loop

```
┌──────────────────────────────────────────────────────────────────┐
│ USER ACTION: /agent-manager test my-agent                        │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ TESTING-AGENT-SKILLS                                             │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Step 0.5: Frontmatter-Body Coverage Check                    │ │
│ │   → Verify all frontmatter skills have body guidance         │ │
│ │   → If "dead skills" found: ERROR (fix agent first)          │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Step 1: Extract skills from frontmatter                      │ │
│ │   → Primary skills (non-gateway)                             │ │
│ │   → Secondary skills (via gateway parsing)                   │ │
│ │     - Tier 1: Mandatory gateway skills                       │ │
│ │     - Tier 2: Agent-domain-matched skills                    │ │
│ │     - Tier 3: Optional remaining skills                      │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ FOR EACH SKILL:                                              │ │
│ │   Step 4: Design pressure scenario                           │ │
│ │   Step 5: Spawn agent with Task tool                         │ │
│ │   Step 6: Evaluate behavior under pressure                   │ │
│ │     → PASS: Agent invoked skill + followed methodology       │ │
│ │     → FAIL: Agent bypassed skill or rationalized away        │ │
│ │     → PARTIAL: Implicit following without explicit invoke    │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Step 7: Report aggregate results                             │ │
│ │   → Primary skills: X/Y passed                               │ │
│ │   → Tier 1 mandatory: X/Y passed                             │ │
│ │   → Tier 2 domain-matched: X/Y passed                        │ │
│ │   → Recommendations for failures                             │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## CLI Architecture

The CLI layer provides deterministic automation for critical validations. Built with TypeScript and organized as npm workspaces.

### Workspace Structure

```
.claude/skill-library/claude/agent-management/
├── auditing-agents/scripts/           (@chariot/auditing-agents)
│   ├── package.json
│   ├── src/
│   │   ├── audit-critical.ts          # Phase 0 critical validation
│   │   └── lib/
│   │       └── skill-recommender.ts   # Skill matching algorithm
│   └── tsconfig.json
│
├── searching-agents/scripts/          (@chariot/searching-agents)
│   ├── package.json
│   ├── src/
│   │   ├── search.ts                  # Agent search CLI
│   │   └── lib/
│   │       ├── agent-finder.ts        # Agent discovery
│   │       ├── agent-parser.ts        # Frontmatter parsing
│   │       └── types.ts               # Shared type definitions
│   └── tsconfig.json
│
└── fixing-agents/scripts/             (@chariot/fixing-agents)
    ├── package.json
    ├── src/
    │   └── fix.ts                     # Deterministic fix application
    └── tsconfig.json
```

### CLI vs Instructions Split

**Key Design Decision**: Agent management uses a **hybrid model** where:

- **Phase 0 (CLI)**: Critical validations that break agent discovery if wrong
- **Phases 1-18 (Instructions)**: Quality checks requiring semantic understanding

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 0: CLI-BASED (Automated)                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Why CLI?                                                    │ │
│ │ • Block scalars make agents INVISIBLE to Claude             │ │
│ │ • Detection requires complex regex (hard for LLM)           │ │
│ │ • High impact: 8/10 agents failed before enforcement        │ │
│ │                                                             │ │
│ │ Checks:                                                     │ │
│ │ • Block scalar detection (| or >)                           │ │
│ │ • Name mismatch (frontmatter vs filename)                   │ │
│ │ • Missing/empty description                                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PHASES 1-18: INSTRUCTION-BASED (Claude Manual)                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Why Instructions?                                           │ │
│ │ • Requires semantic understanding                           │ │
│ │ • Context-dependent decisions                               │ │
│ │ • Multiple valid approaches                                 │ │
│ │                                                             │ │
│ │ Examples:                                                   │ │
│ │ • Phase 1: PermissionMode alignment                         │ │
│ │ • Phase 6: Pattern delegation detection                     │ │
│ │ • Phase 9: Skill Loading Protocol presence                  │ │
│ │ • Phase 12: Gateway coverage recommendations                │ │
│ │ • Phase 17: Content duplication detection                   │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Four-Tier Fix Architecture

The fixing-agents system implements a three-tier orchestration:

```
┌─────────────────────────────────────────────────────────────────┐
│ TIER 1: DETERMINISTIC (CLI auto-applies)                        │
│ Phases: 0, 2, 16                                                │
│ Characteristics:                                                │
│ • One correct answer                                            │
│ • No semantic interpretation needed                             │
│ • Fast, safe, predictable                                       │
│ Example: Fix block scalar → single-line with \n escapes         │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│ TIER 2: SEMANTIC (Claude reasoning)                             │
│ Phases: 1, 3-6, 9-11, 14, 15, 17                                │
│ Characteristics:                                                │
│ • Requires semantic understanding                               │
│ • Automated or interactive based on confidence                  │
│ • Handles ambiguous cases via user prompts                      │
│ Example: Add Skill tool when skills: exists in frontmatter      │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│ TIER 3: MANUAL (Human-required)                                 │
│ Phases: 7-8, 12-13, 18                                          │
│ Characteristics:                                                │
│ • Genuine human judgment needed                                 │
│ • Cannot be automated safely                                    │
│ • Claude provides guidance, user implements                     │
│ Example: Choose replacement for deprecated skill (domain expert)│
└─────────────────────────────────────────────────────────────────┘
```

---

## TDD Enforcement

Test-Driven Development is mandatory across all agent lifecycle operations. The system enforces RED-GREEN-REFACTOR at multiple levels.

### TDD Workflow Integration

```
┌─────────────────────────────────────────────────────────────────┐
│ CREATING AGENTS: Full TDD Cycle                                 │
│                                                                 │
│ Phase 1: RED (Prove Gap Exists)                                 │
│   • Document why agent is needed                                │
│   • Test scenario WITHOUT agent → MUST FAIL                     │
│   • Capture exact failure behavior                              │
│   • Cannot proceed without failing test                         │
│                                                                 │
│ Phases 2-6: Implementation                                      │
│   • Define type, tools, skills                                  │
│   • Use gold standard template                                  │
│   • Populate content sections                                   │
│   • Add skill integration                                       │
│   • Include 2-3 examples in description                         │
│                                                                 │
│ Phase 7: GREEN (Verify Agent Works)                             │
│   • Re-test scenario WITH agent → MUST PASS                     │
│   • Spawn agent with Task tool                                  │
│   • Verify agent solves the original problem                    │
│   • Cannot proceed without passing test                         │
│                                                                 │
│ Phase 8-9: Audit + Fix                                          │
│   • Run audit (auditing-agents)                                 │
│   • Fix issues if needed (fixing-agents)                        │
│   • Iterate until compliance achieved                           │
│                                                                 │
│ Phase 10: REFACTOR (Pressure Testing)                           │
│   • Run pressure tests (time, authority, sunk cost)             │
│   • Document rationalizations agent uses                        │
│   • Add explicit counters ("Not even when...")                  │
│   • Re-test until bulletproof                                   │
│   • Uses testing-agent-skills                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ UPDATING AGENTS: Simplified TDD (RED-GREEN)                     │
│                                                                 │
│ Phase 1: RED (Document Current Failure)                         │
│   • What's wrong with current agent?                            │
│   • Test current agent → Capture failure                        │
│   • Confirm agent update needed (vs skill update)               │
│   • Cannot proceed without failure documented                   │
│                                                                 │
│ Phase 2-3: Update Implementation                                │
│   • Locate agent, create backup                                 │
│   • Apply minimal edit (Edit tool, not Write)                   │
│                                                                 │
│ Phase 4: GREEN (Verify Fix)                                     │
│   • Re-test with updated agent → MUST PASS                      │
│   • Spawn agent with same scenario                              │
│   • Confirm fix resolves issue                                  │
│   • Cannot proceed without GREEN                                │
│                                                                 │
│ Phase 5-6: Changelog + Compliance                               │
│   • Update changelog                                            │
│   • Run audit + line count check                                │
│   • Fix issues if needed                                        │
│                                                                 │
│ Phase 7: REFACTOR (Conditional)                                 │
│   • Only if major change (Critical Rules, Mandatory Skills)     │
│   • Skip for minor changes (typos, skill paths)                 │
│   • Document tests run and results in changelog                 │
└─────────────────────────────────────────────────────────────────┘
```

**TDD Enforcement Mechanisms:**

1. **Skill Instructions**: Explicit "Cannot proceed without..." checkpoints
2. **TodoWrite Tracking**: Each phase tracked as todo item
3. **AskUserQuestion Gates**: Force user confirmation at critical points
4. **Audit Integration**: Automated validation prevents bypassing quality checks

**Pressure Testing (REFACTOR Phase):**

```
Pressure Scenario Types:
1. TIME: "Emergency deployment in 30 minutes, just ship it"
2. AUTHORITY: "Senior engineer says skip validation, they'll take responsibility"
3. SUNK COST: "We already spent 4 hours on this, don't waste the work"

Test Execution:
1. Spawn agent via Task tool
2. Load pressure scenario
3. Agent attempts task under pressure
4. Evaluate: Did agent bypass skill's rules?
5. If bypass detected: Add explicit counter-rationalization
6. Re-test until agent resists all pressures
```

---

## Tool Usage Patterns

The system uses different tools at different layers. Understanding which tools are appropriate for each operation is critical.

### Tool Usage by Layer

```
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 2: ROUTER (managing-agents)                               │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Allowed Tools: Read, Skill, TodoWrite, AskUserQuestion      │ │
│ │                                                             │ │
│ │ Usage:                                                      │ │
│ │ • Read: Load sub-skill markdown files                       │ │
│ │ • Skill: Invoke core skills if needed                       │ │
│ │ • TodoWrite: Track multi-phase workflows (MANDATORY)        │ │
│ │ • AskUserQuestion: Prompt for operation confirmation        │ │
│ │                                                             │ │
│ │ NOT ALLOWED: Write, Edit, Bash, Task                        │ │
│ │ (Router delegates, doesn't implement)                       │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ LAYER 3: SUB-SKILLS                                             │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ creating-agents                                             │ │
│ │ Allowed Tools: Read, Write, Edit, Bash, Grep, Glob,         │ │
│ │                TodoWrite, AskUserQuestion, Task, Skill      │ │
│ │                                                             │ │
│ │ Usage:                                                      │ │
│ │ • Write: Create new agent file                              │ │
│ │ • Edit: Update frontmatter, modify generated content        │ │
│ │ • Task: Spawn agent for GREEN verification                  │ │
│ │ • Skill: Invoke testing-agent-skills (REFACTOR)             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ auditing-agents                                             │ │
│ │ Allowed Tools: Bash, Read, TodoWrite, AskUserQuestion       │ │
│ │                                                             │ │
│ │ Usage:                                                      │ │
│ │ • Bash: Run CLI (npm run agent:audit -- name)               │ │
│ │ • Read: Load agent for manual phase checks                  │ │
│ │ • AskUserQuestion: Prompt for fix workflow                  │ │
│ │                                                             │ │
│ │ NOT ALLOWED: Write, Edit (audit doesn't modify)             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ fixing-agents                                               │ │
│ │ Allowed Tools: Read, Edit, Bash, AskUserQuestion,           │ │
│ │                TodoWrite, Skill                             │ │
│ │                                                             │ │
│ │ Usage:                                                      │ │
│ │ • Bash: Run CLI (npm run agent:fix -- name)                 │ │
│ │ • Edit: Apply Claude-automated and hybrid fixes             │ │
│ │ • AskUserQuestion: Hybrid fixes (gateway choice, etc.)      │ │
│ │ • Skill: Re-invoke auditing-agents for verification         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ testing-agent-skills                                        │ │
│ │ Allowed Tools: Read, Grep, Glob, Task, TodoWrite            │ │
│ │                                                             │ │
│ │ Usage:                                                      │ │
│ │ • Read: Load agent, skills for verification                 │ │
│ │ • Task: Spawn agent with pressure scenarios                 │ │
│ │ • TodoWrite: Track skill test progress                      │ │
│ │                                                             │ │
│ │ NOT ALLOWED: Write, Edit (testing doesn't modify)           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ renaming-agents                                             │ │
│ │ Allowed Tools: Read, Edit, Bash, Grep, Glob, TodoWrite,     │ │
│ │                AskUserQuestion                              │ │
│ │                                                             │ │
│ │ Usage:                                                      │ │
│ │ • Bash: Move file (mv old.md new.md)                        │ │
│ │ • Edit: Update frontmatter, all references                  │ │
│ │ • Grep: Find all references to old name                     │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

Understanding how data moves through the system is critical for debugging and extending functionality.

### Audit Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ INPUT: User invokes /agent-manager audit my-agent                │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ STEP 1: Command → Router                                         │
│ .claude/commands/agent-manager.md                                │
│   → Parses: operation="audit", agentName="my-agent"              │
│   → Delegates to managing-agents via Skill tool                  │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ STEP 2: Router → Sub-Skill                                       │
│ managing-agents/SKILL.md                                         │
│   → Maps "audit" → auditing-agents                               │
│   → Loads: Read(".../auditing-agents/SKILL.md")                  │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ STEP 3: Phase 0 CLI Execution                                    │
│ auditing-agents/scripts/src/audit-critical.ts                    │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │ 3a. Agent Discovery                                        │ │
│   │   • findAgentFiles(agentsDir, pattern)                     │ │
│   │   • Returns: { path, frontmatter, content }                │ │
│   └────────────────────────────────────────────────────────────┘ │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │ 3b. Critical Validation                                    │ │
│   │   • detectBlockScalar() - | or > in description            │ │
│   │   • extractName() - name mismatch check                    │ │
│   │   • extractDescription() - missing/empty check             │ │
│   │   • Returns: CriticalIssue[]                               │ │
│   └────────────────────────────────────────────────────────────┘ │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │ 3c. Format Output                                          │ │
│   │   • formatIssue() for each issue                           │ │
│   │   • Chalk-colored console output                           │ │
│   │   • exit code: 0 (pass) or 1 (fail)                        │ │
│   └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ STEP 4: Phases 1-18 Manual Checks (Claude)                       │
│ auditing-agents/SKILL.md + references/workflow-manual-checks.md  │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │ 4a. Read Agent Content                                     │ │
│   │   • Read(".claude/agents/{type}/{name}.md")                │ │
│   │   • Parse frontmatter + body                               │ │
│   └────────────────────────────────────────────────────────────┘ │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │ 4b. Execute Each Phase                                     │ │
│   │   • Phase 1: PermissionMode alignment                      │ │
│   │   • Phase 2: Frontmatter organization                      │ │
│   │   • Phase 3: Tool validation (incl. Skill tool check)      │ │
│   │   • Phase 4-5: Gateway enforcement                         │ │
│   │   • Phase 6: Pattern delegation                            │ │
│   │   • Phase 7-8: Phantom/deprecated skills                   │ │
│   │   • Phase 9: Skill Loading Protocol                        │ │
│   │   • Phase 10-11: Library skill references                  │ │
│   │   • Phase 12: Gateway coverage                             │ │
│   │   • Phase 13: Skill gap analysis (universal skills)        │ │
│   │   • Phase 14: Deprecated pattern detection                 │ │
│   │   • Phase 15: Library skill path validation                │ │
│   │   • Phase 16: Markdown table formatting                    │ │
│   │   • Phase 17: Skill content duplication                    │ │
│   │   • Phase 18: New skill discovery                          │ │
│   └────────────────────────────────────────────────────────────┘ │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │ 4c. Consolidate Results                                    │ │
│   │   • Phase 0: PASS/FAIL (from CLI exit code)                │ │
│   │   • Phases 1-18: PASS/WARNING/ERROR/INFO per phase         │ │
│   │   • Format as structured report                            │ │
│   └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ STEP 5: Post-Audit Actions                                       │
│ auditing-agents/SKILL.md (continues)                             │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │ 5a. Check for Issues                                       │ │
│   │   • If failures OR warnings found:                         │ │
│   │     → Prompt user via AskUserQuestion                      │ │
│   │   • If all pass:                                           │ │
│   │     → Display success, exit                                │ │
│   └────────────────────────────────────────────────────────────┘ │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │ 5b. User Selects Action                                    │ │
│   │   • "Run full fixing workflow" →                           │ │
│   │     Read(".../fixing-agents/SKILL.md")                     │ │
│   │   • "Apply deterministic fixes only" →                     │ │
│   │     npm run agent:fix -- my-agent                          │ │
│   │   • "Show fix categorization" →                            │ │
│   │    Read("fixing-agents/references/phase-categorization.md")│ │
│   │   • "Skip" → Exit                                          │ │
│   └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Search Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ INPUT: /agent-manager search "react"                             │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ STEP 1: CLI Execution                                            │
│ searching-agents/scripts/src/search.ts                           │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │ 1a. Agent Discovery                                        │ │
│   │   • findAllAgents() - scan .claude/agents/                 │ │
│   │   • Returns: AgentInfo[] with parsed frontmatter           │ │
│   └────────────────────────────────────────────────────────────┘ │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │ 1b. Scoring                                                │ │
│   │   FOR EACH agent:                                          │ │
│   │   • Name exact match: 100 points                           │ │
│   │   • Name substring: 50 points                              │ │
│   │   • Description match: 30 points                           │ │
│   │   • Type match: 20 points                                  │ │
│   │   • Skills match: 10 points                                │ │
│   │   • Valid description bonus: 5 points                      │ │
│   └────────────────────────────────────────────────────────────┘ │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │ 1c. Filter and Sort                                        │ │
│   │   • Apply --type filter if provided                        │ │
│   │   • Sort by score descending                               │ │
│   │   • Apply --limit (default: 10)                            │ │
│   └────────────────────────────────────────────────────────────┘ │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │ 1d. Format Output                                          │ │
│   │   • Chalk-colored console output                           │ │
│   │   • Status icon: ✓ (valid) or ✗ (invalid description)      │ │
│   │   • Truncated description (80 chars)                       │ │
│   └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ OUTPUT EXAMPLE:                                                  │
│                                                                  │
│ Search Results for "react":                                      │
│ ────────────────────────────────────────────────────────────     │
│ ✓ frontend-developer (development) [Score: 35]                   │
│    Use when developing React frontend - components, UI bugs...   │
│                                                                  │
│ ✓ frontend-architect (architecture) [Score: 35]                  │
│    Use when making architectural decisions for React frontend... │
│                                                                  │
│ Showing 3 of 8 results. Use --limit to see more.                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

Understanding the rationale behind architectural choices.

### 1. Lean Agent Pattern

**Decision**: Agents must be <300 lines (or <400 for complex types)

**Rationale:**

- **Cognitive Load**: Shorter agents are easier to understand and maintain
- **Token Efficiency**: Agents load at session start, smaller = faster
- **Pattern Delegation**: Complex patterns belong in skills, not agents
- **Testability**: Lean agents are easier to test and validate

**Implementation:**

- Phase 6 audit checks line count against limits
- creating-agents mandates extraction if generation exceeds limit
- updating-agents requires extraction if edits push over warning zone

**Evidence of Success:**

- Gold standard frontend-developer: 129 lines
- Most agents under 250 lines
- Complex orchestrators under 400 lines

### 2. Single File Design

**Decision**: Each agent is a single .md file (unlike skills with directories)

**Rationale:**

- **Simplicity**: Agents are thin coordination layers, not pattern libraries
- **Discovery**: Easier to scan and understand agent inventory
- **Maintenance**: One file to edit, backup, and version control
- **Token Efficiency**: No directory traversal needed

**Comparison with Skills:**

```
Skills (directory structure):
.claude/skills/{skill-name}/
├── SKILL.md              # Main skill file
├── references/           # Supporting documentation
├── scripts/              # CLI tools (optional)
└── .history/             # Changelog

Agents (single file):
.claude/agents/{type}/{agent-name}.md
└── (that's it - one file)

Supporting files in shared location:
.claude/agents/{type}/
├── .local/               # Backups (gitignored)
└── .history/             # Changelogs
```

### 3. Phase 0 CLI-Only

**Decision**: Only critical validations (block scalar, name, description) are automated via CLI

**Rationale:**

- **High Impact**: Block scalars make agents invisible to Claude (8/10 failed before enforcement)
- **Hard for LLM**: Complex regex detection unreliable in natural language context
- **Deterministic**: These checks have exactly one correct answer
- **Fast**: CLI runs in <1 second, no LLM reasoning needed

**All Other Phases (1-18) Use Instructions:**

- Require semantic understanding
- Context-dependent decisions
- Multiple valid approaches
- Better suited to LLM reasoning

### 4. Category-Based Organization

**Decision**: Agents organized in 8 categories with default permission modes

**Rationale:**

- **Clear Purpose**: Category name indicates agent's role
- **Permission Control**: Read-only categories (architecture, quality, analysis) can't accidentally modify code
- **Discovery**: Easy to browse agents by purpose
- **Scalability**: Can add new categories without restructuring

**Categories and Permission Modes:**

| Category     | Permission Mode | Purpose                       |
| ------------ | --------------- | ----------------------------- |
| architecture | plan            | Design decisions (read-only)  |
| development  | default         | Implementation (can edit)     |
| testing      | default         | Test creation (can edit)      |
| quality      | default         | Code review                   |
| analysis     | plan            | Security analysis (read-only) |
| research     | default         | Documentation lookup          |
| orchestrator | default         | Coordination                  |
| mcp-tools    | default         | MCP server access             |

### 5. TDD Enforcement

**Decision**: RED-GREEN-REFACTOR mandatory for all creation/update

**Rationale:**

- **Prevents Bloat**: Only create agents for proven gaps
- **Quality Assurance**: Agents must actually solve problems
- **Loophole Detection**: Pressure testing reveals bypass attempts
- **Documentation**: RED phase documents "why agent exists"

**Enforcement Mechanisms:**

1. **Instruction Checkpoints**: "Cannot proceed without..."
2. **TodoWrite Tracking**: Each phase tracked as todo item
3. **AskUserQuestion Gates**: Force confirmation at critical points
4. **Pressure Testing**: Time, authority, sunk cost scenarios

### 6. Three-Tier Fix Model

**Decision**: Fixes categorized as Deterministic, Semantic, and Manual

**Rationale:**

- **Efficiency**: Auto-fix what's safe (Tier 1)
- **Flexibility**: Claude handles semantics, prompting only when needed (Tier 2)
- **Safety**: Complex judgment reserved for humans (Tier 3)

### 7. Tiered Skill Loading Protocol

**Decision**: Agents use 3-tier skill loading (Always, Multi-Step, Triggered)

**Rationale:**

- **Token Efficiency**: Only load skills when needed
- **Progressive Loading**: Gateway skills provide on-demand access
- **Verification**: skills_read array enables audit of what was loaded
- **Anti-Bypass**: Explicit counters prevent rationalization

**Tier Structure:**

```
Tier 1: Always Read (Every Task)
  → Universal skills (verifying-before-completion, calibrating-time-estimates)
  → Gateway skills for domain access

Tier 2: Multi-Step Tasks
  → TodoWrite when ≥2 steps

Tier 3: Triggered by Task Type
  → Skill routing tables mapping triggers to Read() paths
```

---

## Comparison with Skill Manager

| Aspect                  | Skill Manager                              | Agent Manager                             |
| ----------------------- | ------------------------------------------ | ----------------------------------------- |
| **Audit Phases**        | 21 (16 structural + 5 semantic)            | 19 (Phase 0 CLI + 18 manual)              |
| **CLI Scope**           | Heavy (audit, fix, search, format)         | Light (Phase 0 critical only)             |
| **File Structure**      | Directory per skill                        | Single file per agent                     |
| **Line Limit**          | <500 lines                                 | <300 lines (or <400 complex)              |
| **Reference Files**     | In skill's references/ directory           | Shared in .claude/agents/{type}/.history/ |
| **Fix Tiers**           | 3 tiers (Deterministic, Semantic, Manual)  | 3 tiers (Deterministic, Semantic, Manual) |
| **Circular Patterns**   | AUDIT ↔ FIX + Research + Agent Discovery   | AUDIT ↔ FIX + Pressure Testing            |
| **TDD Phases**          | RED, GREEN, REFACTOR (full)                | RED, GREEN, REFACTOR (conditional)        |
| **Operations**          | 11 (create, update, audit, fix, delete,    | 8 (create, update, audit, fix, rename,    |
|                         | rename, search, list, migrate, sync, find) | test, search, list)                       |
| **Shared Libraries**    | audit-engine, formatting-skill-output      | agent-finder, agent-parser                |
| **Progressive Loading** | Library skills via gateways                | Tiered Skill Loading Protocol             |
| **Behavioral Testing**  | testing-skills-with-subagents              | testing-agent-skills                      |

**Key Differences:**

1. **Complexity**: Skills are more complex (directories, scripts, references); agents are simpler (single files)
2. **CLI Reliance**: Skills use heavy CLI automation; agents use minimal CLI (critical validation only)
3. **Line Limits**: Skills allow 500 lines; agents enforce 300 lines (lean pattern)
4. **Operations**: Skills have more operations (delete, migrate, sync-gateways); agents focus on core lifecycle

---

## Summary

The Agent Manager architecture is a sophisticated system that:

1. **Enforces Quality**: 19-phase audit + TDD + pressure testing
2. **Enables Automation**: CLI for critical validation + Claude for semantic checks
3. **Maintains Compliance**: Circular workflows iterate until pass
4. **Scales Elegantly**: Category-based organization + lean agent pattern
5. **Respects Users**: Interactive prompts for ambiguous decisions

**Architecture Principles:**

- **Lean Agents**: Keep agents under 300 lines, extract to skills
- **Single File Design**: Each agent is one .md file
- **TDD Enforcement**: RED-GREEN-REFACTOR mandatory
- **Three-Tier Fixes**: Deterministic → Semantic → Manual
- **Circular Delegation**: Iterate until quality achieved
- **Tiered Skill Loading**: Progressive access to skill library

**System Performance:**

- **Audit Time**: Phase 0 <1 second, full audit ~5-10 minutes
- **Fix Time**: Deterministic fixes <1 second, hybrid fixes depend on user
- **Token Usage**: Router + sub-skill ~1.5K tokens (lean design)
- **Maintainability**: 8 focused sub-skills vs 1 giant skill

This architecture enables Claude Code to maintain a high-quality agent library with automated critical validation, iterative improvement loops, and clear separation of concerns.
