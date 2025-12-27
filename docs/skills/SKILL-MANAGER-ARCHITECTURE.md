# Skill Manager Architecture

**Complete architectural documentation for the skill lifecycle management system.**

## Table of Contents

1. [Overview](#overview)
2. [State Machine Model](#state-machine-model)
3. [Four-Layer Architecture](#four-layer-architecture)
4. [Delegation Flow](#delegation-flow)
5. [Circular Workflow Patterns](#circular-workflow-patterns)
6. [CLI Architecture](#cli-architecture)
7. [TDD Enforcement](#tdd-enforcement)
8. [Tool Usage Patterns](#tool-usage-patterns)
9. [Shared Libraries](#shared-libraries)
10. [Data Flow](#data-flow)
11. [Key Design Decisions](#key-design-decisions)

---

## Overview

The Skill Manager is a comprehensive lifecycle management system for Claude Code skills. It enforces quality through TDD (Test-Driven Development), maintains compliance through 21-phase auditing with semantic review, and orchestrates complex workflows through circular delegation patterns.

**System Capabilities:**

- **Lifecycle Management**: Create, update, delete, rename, migrate skills
- **Quality Assurance**: 21-phase structural audit + Claude semantic review
- **Compliance Remediation**: Four-tier fix orchestration (deterministic, Claude-automated, hybrid, human-required)
- **Discovery**: Search and list skills across dual locations (core + library)
- **Research**: Context7, web, and codebase research for comprehensive skill creation/updates
- **Gateway Sync**: Validate gateway-library consistency

**Architecture Philosophy:**

- **Progressive Disclosure**: Keep skills under 500 lines, extract details to references/
- **Deterministic Output**: CLI produces identical results for same inputs
- **TDD Enforcement**: RED-GREEN-REFACTOR mandatory for all changes
- **Router Pattern**: Pure delegation without implementation logic
- **Single Responsibility**: Each component does one thing well

---

## State Machine Model

The Skill Manager operates as a **finite state machine** with circular transitions for iterative quality improvement. Understanding this model is essential for:

- **Debugging**: Knowing which state transitions are valid helps diagnose stuck workflows
- **Extension**: Adding new operations requires defining their state transitions
- **Monitoring**: State tracking enables progress visibility and timeout detection

### State Categories

| Category                | States                                                                                          | Characteristics                     |
| ----------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------- |
| **Entry States**        | CREATING, UPDATING, AUDITING, FIXING, DELETING, RENAMING, MIGRATING, SEARCHING, LISTING, SYNCING_GATEWAYS | User-initiated via `/skill-manager` |
| **Intermediate States** | RESEARCHING, PRESSURE_TESTING, AWAITING_HUMAN                                                   | Delegation or waiting states        |
| **Terminal States**     | COMPLETE, ERROR, CANCELLED                                                                      | Workflow endpoints                  |

### State Transition Matrix

The complete matrix of all valid state transitions in the system:

```
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                         STATE TRANSITION MATRIX - SKILL MANAGER                           ║
╠═══════════════════════════════════════════════════════════════════════════════════════════╣
║ Current State       │ Event/Condition               │ Next State         │ Notes          ║
╠═══════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                           ║
║ ─── CREATION WORKFLOW (9 phases) ─────────────────────────────────────────────────────── ║
║ CREATING            │ phase_6_research_needed       │ RESEARCHING        │ delegation     ║
║ CREATING            │ phase_7_audit_needed          │ AUDITING           │ GREEN phase    ║
║ CREATING            │ phase_8_refactor_needed       │ PRESSURE_TESTING   │ via subagent   ║
║ CREATING            │ phase_9_complete              │ COMPLETE           │ ─              ║
║ RESEARCHING         │ research_complete             │ CREATING           │ return ph6     ║
║ PRESSURE_TESTING    │ all_scenarios_pass            │ CREATING           │ continue ph9   ║
║ PRESSURE_TESTING    │ bypass_detected               │ CREATING           │ add counters   ║
║                                                                                           ║
║ ─── UPDATE WORKFLOW (7 phases) ───────────────────────────────────────────────────────── ║
║ UPDATING            │ research_needed               │ RESEARCHING        │ optional       ║
║ UPDATING            │ phase_6_green_pass            │ AUDITING           │ compliance     ║
║ UPDATING            │ phase_7_refactor_needed       │ PRESSURE_TESTING   │ non-trivial    ║
║ UPDATING            │ phase_7_cosmetic_only         │ COMPLETE           │ <10 lines      ║
║ RESEARCHING         │ research_complete             │ UPDATING           │ continue edit  ║
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
║ ─── STRUCTURAL OPERATIONS ─────────────────────────────────────────────────────────────── ║
║ DELETING            │ refs_found                    │ DELETING           │ update refs    ║
║ DELETING            │ deletion_complete             │ COMPLETE           │ ─              ║
║ DELETING            │ user_cancel                   │ CANCELLED          │ ─              ║
║ RENAMING            │ step_n_complete (n < 7)       │ RENAMING           │ 7-step proto   ║
║ RENAMING            │ all_7_steps_complete          │ AUDITING           │ verify rename  ║
║ MIGRATING           │ move_complete                 │ AUDITING           │ verify paths   ║
║ MIGRATING           │ user_skip_audit               │ COMPLETE           │ trust user     ║
║                                                                                           ║
║ ─── DISCOVERY & SYNC OPERATIONS ───────────────────────────────────────────────────────── ║
║ SEARCHING           │ results_returned              │ COMPLETE           │ stateless      ║
║ LISTING             │ skills_displayed              │ COMPLETE           │ stateless      ║
║ SYNCING_GATEWAYS    │ all_consistent                │ COMPLETE           │ ─              ║
║ SYNCING_GATEWAYS    │ inconsistencies + auto_fix    │ FIXING             │ gateway fixes  ║
║ SYNCING_GATEWAYS    │ inconsistencies + manual      │ AWAITING_HUMAN     │ complex issues ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

Legend:
  ⟲  = Circular transition (returns to earlier state)
  ─  = No special notes
  Tier 1-4 = Fix categorization (Deterministic, Claude-Auto, Hybrid, Human)
```

### Circular Dependency Graph

Visual representation of state flows and circular patterns:

```
                                 ┌─────────────────────┐
                                 │    USER COMMAND     │
                                 │   /skill-manager    │
                                 └──────────┬──────────┘
                                            │
                                 ┌──────────▼──────────┐
                                 │   MANAGING-SKILLS   │
                                 │    (Pure Router)    │
                                 │   No implementation │
                                 └──────────┬──────────┘
                                            │
     ┌───────────┬────────────┬─────────────┼────────────┬────────────┬────────────┐
     │           │            │             │            │            │            │
┌────▼───┐  ┌────▼───┐  ┌─────▼────┐   ┌────▼────┐  ┌────▼───┐  ┌─────▼────┐  ┌────▼────┐
│ CREATE │  │ UPDATE │  │  AUDIT   │   │   FIX   │  │ DELETE │  │  RENAME  │  │ MIGRATE │
└───┬────┘  └───┬────┘  └────┬─────┘   └───┬─────┘  └────────┘  └────┬─────┘  └───┬─────┘
    │           │            │             │                         │            │
    │           │            │             │                         │            │
    │      ┌────┴────────────┴─────────────┴─────────────────────────┴────────────┘
    │      │
    │      │   ┌──────────────────────────────────────────────────────────┐
    │      │   │                                                          │
    │      │   │                    AUDITING                              │
    │      │   │  ┌────────────────────────────────────────────────────┐  │
    │      └──►│  │  1. CLI: 21-phase structural validation            │  │◄───┐
    │          │  │  2. Claude: Semantic review (6 criteria)           │  │    │
    └─────────►│  │  3. Merge: Deterministic combined output           │  │    │
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

### Secondary Delegation Chains

Beyond the primary AUDIT ↔ FIX cycle, several secondary chains exist:

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           SECONDARY DELEGATION CHAINS                               │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  CHAIN 1: Research Delegation (CREATE phase 6, UPDATE optional)                     │
│  ───────────────────────────────────────────────────────────────────────────────    │
│                                                                                     │
│    CREATE ──phase_6──► RESEARCHING ──complete──► CREATE (continue ph7)              │
│    UPDATE ──optional──► RESEARCHING ──complete──► UPDATE (continue edit)            │
│                             │                                                       │
│                             ├─► Codebase: Find similar patterns in existing skills  │
│                             ├─► Context7: Official library/framework documentation  │
│                             └─► Web: Supplemental articles and guides               │
│                                                                                     │
│                                                                                     │
│  CHAIN 2: Pressure Testing (CREATE phase 8, UPDATE phase 7)                         │
│  ───────────────────────────────────────────────────────────────────────────────    │
│                                                                                     │
│    CREATE ──phase_8──► PRESSURE_TESTING ──pass──► CREATE (continue ph9)             │
│    UPDATE ──phase_7──► PRESSURE_TESTING ──pass──► COMPLETE                          │
│                             │                                                       │
│                             ├─► Spawns isolated subagent via Task tool              │
│                             ├─► Scenario: TIME ("ship in 30 min")                   │
│                             ├─► Scenario: AUTHORITY ("senior says skip")            │
│                             ├─► Scenario: SUNK_COST ("already 4 hours in")          │
│                             └─► If bypass detected: add counter-rationalizations    │
│                                                                                     │
│                                                                                     │
│  CHAIN 3: Gateway Synchronization (maintenance)                                     │
│  ───────────────────────────────────────────────────────────────────────────────    │
│                                                                                     │
│    SYNCING_GATEWAYS ──inconsistent──► FIXING ──► AUDITING ──► COMPLETE              │
│           │                                                                         │
│           ├─► Validate: gateway references match skill locations                    │
│           ├─► Validate: no orphaned or phantom references                           │
│           └─► Validate: all library skills have gateway coverage                    │
│                                                                                     │
│                                                                                     │
│  CHAIN 4: Structural Operations (RENAME, MIGRATE)                                   │
│  ───────────────────────────────────────────────────────────────────────────────    │
│                                                                                     │
│    RENAMING ──7_steps──► AUDITING ──► (normal audit flow)                           │
│         │                                                                           │
│         ├─► Step 1: Validate new name available                                     │
│         ├─► Step 2: Update frontmatter name field                                   │
│         ├─► Step 3: Move directory/files                                            │
│         ├─► Step 4: Update gateway references                                       │
│         ├─► Step 5: Update agent skills: fields                                     │
│         ├─► Step 6: Update cross-skill references                                   │
│         └─► Step 7: Update changelog                                                │
│                                                                                     │
│    MIGRATING ──move──► AUDITING ──► (normal audit flow)                             │
│         │                                                                           │
│         ├─► Validate: target location appropriate (core vs library)                 │
│         ├─► Move: directory structure preserved                                     │
│         └─► Update: all path-dependent references                                   │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
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
║  │ RENAMING            │ 7        │ Sequential steps (not circular)           │     ║
║  │ DELETING refs       │ N        │ N = count of references to update         │     ║
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

### State Machine Invariants

The following invariants must hold for correct system operation:

1. **Single Active State**: Only one state can be active at any time per workflow instance
2. **Deterministic Transitions**: Given a state and event, the next state is always the same
3. **Bounded Iterations**: All cycles have explicit iteration limits to prevent infinite loops
4. **User Escape Hatches**: Every interactive state has a skip/cancel option to reach a terminal state
5. **Audit Convergence**: The AUDIT ↔ FIX cycle must converge (fixes reduce failure count each iteration)
6. **TodoWrite Tracking**: State transitions are recorded via TodoWrite for observability

---

## Four-Layer Architecture

The system is organized in four distinct layers, each with clear responsibilities:

```
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 1: COMMAND ENTRY POINT                                    │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ /skill-manager command (.claude/commands/skill-manager.md)  │ │
│ │ • User invokes: /skill-manager <operation> [args]           │ │
│ │ • Validates operation type                                  │ │
│ │ • Delegates to managing-skills router                       │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 2: ROUTER SKILL                                           │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ managing-skills (.claude/skills/managing-skills/SKILL.md)   │ │
│ │ • Pure router - NO implementation logic                     │ │
│ │ • Maintains delegation map (10 operations)                  │ │
│ │ • Routes to appropriate sub-skill                           │ │
│ │ • Enforces TodoWrite tracking for all operations            │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 3: SPECIALIZED SUB-SKILLS (10 operations)                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ INSTRUCTION-BASED (No CLI):                                 │ │
│ │ • creating-skills      - Skill creation with TDD            │ │
│ │ • deleting-skills      - Safe deletion with cleanup         │ │
│ │ • renaming-skills      - 7-step safe rename protocol        │ │
│ │ • listing-skills       - Display all skills                 │ │
│ │ • researching-skills   - Codebase/Context7/web research     │ │
│ │ • migrating-skills     - Move between core ↔ library        │ │
│ │ • syncing-gateways     - Validate gateway consistency       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ CLI-BASED (TypeScript + Claude):                            │ │
│ │ • auditing-skills      - 21-phase structural + semantic     │ │
│ │ • fixing-skills        - Four-tier fix orchestration        │ │
│ │ • updating-skills      - Test-guarded updates               │ │
│ │ • searching-skills     - Keyword search (uses audit CLI)    │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 4: CLI IMPLEMENTATION (TypeScript)                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ auditing-skills/scripts/                                    │ │
│ │ ├── src/audit.ts        - 21-phase audit orchestration      │ │
│ │ ├── src/search.ts       - Dual-location keyword search      │ │
│ │ └── src/lib/            - Shared audit engine + phases      │ │
│ │     ├── audit-engine.ts - Phase validation engine           │ │
│ │     ├── types.ts        - Shared type definitions           │ │
│ │     └── phases/         - Phase implementations             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ fixing-skills/scripts/                                      │ │
│ │ ├── src/fix.ts          - Fix orchestration CLI             │ │
│ │ └── Uses: ../auditing-skills/lib/ (shared engine)           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ updating-skills/scripts/                                    │ │
│ │ ├── src/update.ts       - TDD update workflow               │ │
│ │ └── Uses: ../auditing-skills/lib/ (shared engine)           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ formatting-skill-output/scripts/                            │ │
│ │ ├── src/format.ts       - Deterministic table formatter     │ │
│ │ └── src/index.ts        - Shared formatting library         │ │
│ │ Used by: auditing, fixing                                   │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Layer Responsibilities:**

| Layer             | Responsibility                             | Implementation              | Tools Used                   |
| ----------------- | ------------------------------------------ | --------------------------- | ---------------------------- |
| **1. Command**    | User entry point, operation validation     | Markdown command file       | Skill tool                   |
| **2. Router**     | Pure delegation, TodoWrite enforcement     | Markdown skill file         | Read, Skill, AskUserQuestion |
| **3. Sub-Skills** | Operation-specific workflows and logic     | Markdown skills (10 total)  | All tools (varies by skill)  |
| **4. CLI**        | Deterministic automation, shared libraries | TypeScript (npm workspaces) | N/A (executed by Bash tool)  |

---

## Delegation Flow

### Operation Routing Map

When a user invokes `/skill-manager <operation>`, the system routes through this delegation chain:

```
USER INPUT: /skill-manager create my-new-skill

Step 1: Command validates operation
  → .claude/commands/skill-manager.md
  → Recognizes "create" operation
  → Delegates to managing-skills router

Step 2: Router delegates to sub-skill
  → .claude/skills/managing-skills/SKILL.md
  → Maps "create" → creating-skills
  → Uses Read tool to load sub-skill
  → Read(".claude/skill-library/claude/skill-management/creating-skills/SKILL.md")

Step 3: Sub-skill executes workflow
  → creating-skills/SKILL.md
  → 9-phase creation workflow
  → Phase 1: RED (prove gap exists)
  → Phase 2-5: Validation, location, category, type
  → Phase 6: Research (researching-skills delegation)
  → Phase 7: GREEN (verify skill works)
  → Phase 8: REFACTOR (pressure testing)
  → Phase 9: Complete

Step 4: Audit validation (automatic)
  → creating-skills invokes auditing-skills
  → CLI executes: npm run audit -- my-new-skill
  → Returns compliance status

Step 5: Fix if needed (circular delegation)
  → If audit fails, prompt user
  → User selects "Run full fixing workflow"
  → Delegates to fixing-skills
  → fixing-skills applies fixes
  → Re-audits (back to auditing-skills)
```

**Complete Delegation Table:**

| User Input                      | Command → Router → Sub-Skill                        | CLI Involved?          | Circular?           |
| ------------------------------- | --------------------------------------------------- | ---------------------- | ------------------- |
| `/skill-manager create X`       | skill-manager → managing-skills → creating-skills   | Yes (audit)            | Yes (audit → fix)   |
| `/skill-manager update X`       | skill-manager → managing-skills → updating-skills   | Yes (update CLI)       | Yes (audit → fix)   |
| `/skill-manager audit X`        | skill-manager → managing-skills → auditing-skills   | Yes (audit CLI)        | Yes (→ fix → audit) |
| `/skill-manager fix X`          | skill-manager → managing-skills → fixing-skills     | Yes (fix CLI)          | Yes (→ audit → fix) |
| `/skill-manager delete X`       | skill-manager → managing-skills → deleting-skills   | No (instructions)      | No                  |
| `/skill-manager rename X Y`     | skill-manager → managing-skills → renaming-skills   | No (instructions)      | No                  |
| `/skill-manager search "query"` | skill-manager → managing-skills → searching-skills  | Yes (audit CLI search) | No                  |
| `/skill-manager list`           | skill-manager → managing-skills → listing-skills    | No (instructions)      | No                  |
| `/skill-manager migrate X`      | skill-manager → managing-skills → migrating-skills  | No (instructions)      | No                  |
| `/skill-manager sync-gateways`  | skill-manager → managing-skills → syncing-gateways  | No (instructions)      | No                  |

---

## Circular Workflow Patterns

The system implements circular delegation patterns for iterative quality improvement. These patterns enable Claude to automatically remediate issues until compliance is achieved.

### Pattern 1: Audit → Fix → Audit Loop

```
┌──────────────────────────────────────────────────────────────────┐
│ USER ACTION: /skill-manager audit my-skill                       │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ AUDITING-SKILLS                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Step 1: Run CLI audit                                        │ │
│ │   npm run audit -- my-skill                                  │ │
│ │   → 21-phase structural validation                           │ │
│ │   → Returns: 5 failures (phases 1, 3, 4, 10, 14e)            │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Step 2: Claude semantic review                               │ │
│ │   Evaluate 6 criteria:                                       │ │
│ │   → Description quality, categorization, gateway membership  │ │
│ │   → Tool appropriateness, content density, documentation     │ │
│ │   → Output: JSON findings                                    │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Step 3: Merge and render                                     │ │
│ │   npm run audit -- my-skill --merge-semantic /tmp/file.json  │ │
│ │   → Deterministic combined table                             │ │
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
│ FIXING-SKILLS (Invoked via Read tool)                            │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Step 1: Categorize issues                                    │ │
│ │   Deterministic: Phase 2, 5, 7, 14a-c, 16, 18 (CLI auto-fix) │ │
│ │   Claude-Auto:   Phase 1, 3, 11, 13, 15, 17, 21              │ │
│ │   Hybrid:        Phase 4, 6, 10, 12, 19                      │ │
│ │   Human:         Phase 8, 9, 20                              │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Step 2: Apply deterministic fixes                            │ │
│ │   npm run fix -- my-skill                                    │ │
│ │   → Phases 2, 5, 7, 14a-c, 16, 18 fixed                      │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Step 3: Apply Claude-automated fixes                         │ │
│ │   Phase 1: Rewrite description (Edit tool)                   │ │
│ │   Phase 3: Extract to references/ (Write, Edit tools)        │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Step 4: Apply hybrid fixes                                   │ │
│ │   Phase 4: Broken link → AskUserQuestion                     │ │
│ │     User: "Create placeholder with generated content"        │ │
│ │     → Write reference file with Claude-generated content     │ │
│ │   Phase 10: Phantom ref → Fuzzy match suggestions            │ │
│ │     User: "Correct to suggested skill"                       │ │
│ │     → Edit with corrected reference                          │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Step 5: Update changelog                                     │ │
│ │   Document: Fixed phases 1, 2, 3, 4, 7, 10, 14a-c            │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Step 6: Re-audit to verify fixes                             │ │
│ │   CIRCULAR DELEGATION back to auditing-skills                │ │
│ │   Read(".../auditing-skills/SKILL.md")                       │ │
│ │   → Run audit again                                          │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ BACK TO AUDITING-SKILLS (Re-audit)                               │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ npm run audit -- my-skill                                    │ │
│ │ Result: All 21 phases PASS                                   │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Output: Success message (no prompt needed)                   │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**Key Characteristics:**

1. **Automatic Iteration**: Claude continues fixing until audit passes
2. **Progressive Fix Tiers**: Deterministic → Claude-Auto → Hybrid → Human
3. **User Involvement**: Only for ambiguous cases (hybrid fixes) or critical decisions
4. **State Tracking**: TodoWrite maintains fix progress across iterations
5. **Exit Condition**: Audit passes with zero failures

### Pattern 2: Create → Audit → Fix Loop

```
┌──────────────────────────────────────────────────────────────────┐
│ USER ACTION: /skill-manager create my-new-skill                  │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ CREATING-SKILLS                                                  │
│ Phase 1-6: Creation workflow completes                           │
│ Phase 7: GREEN verification (run audit)                          │
│   → Delegates to auditing-skills                                 │
│   → npm run audit -- my-new-skill                                │
│   → Result: 3 warnings (phases 4, 6, 14e)                        │
│                                                                  │
│ Phase 7 continued: Prompt user                                   │
│   AskUserQuestion:                                               │
│   → Run full fixing workflow (Recommended)                       │
│   → Skip (fix manually later)                                    │
└──────────────────────────────────────────────────────────────────┘
                              ↓
                   User selects "Run full fixing workflow"
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ FIXING-SKILLS (Delegated from creating-skills)                   │
│ Apply fixes → Re-audit → Pass                                    │
│ (Same pattern as Audit → Fix → Audit above)                      │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ BACK TO CREATING-SKILLS                                          │
│ Phase 8: REFACTOR (pressure testing)                             │
│ Phase 9: Complete ✅                                             │
└──────────────────────────────────────────────────────────────────┘
```

### Pattern 3: Update → Research → Audit → Fix Loop

```
UPDATING-SKILLS
  → Step 3.5 (Optional): Research via researching-skills
    → User chooses to research for library/framework updates
    → Delegates to researching-skills
    → Returns with updated documentation
  → Step 4: Edit skill content
  → Step 6 (Compliance): Delegates to auditing-skills
  → If failures: Prompt user → fixing-skills
  → fixing-skills → Re-audit
  → Loop until pass
```

**Why Circular Patterns?**

- **Quality Assurance**: No skill leaves non-compliant
- **Automation**: Claude handles routine fixes without interruption
- **User Control**: Ambiguous cases still require human judgment
- **Iterative Improvement**: Each iteration brings skill closer to compliance

---

## CLI Architecture

The CLI layer provides deterministic automation for operations that require complex file analysis, validation, and formatting. Built with TypeScript and organized as npm workspaces.

### Workspace Structure

```
.claude/skill-library/claude/skill-management/
├── auditing-skills/scripts/          (@chariot/auditing-skills)
│   ├── package.json
│   ├── src/
│   │   ├── audit.ts                  # 21-phase audit CLI
│   │   ├── search.ts                 # Dual-location search CLI
│   │   └── lib/                      # Shared audit engine
│   │       ├── audit-engine.ts       # Phase validation engine
│   │       ├── orchestrator.ts       # Multi-phase orchestration
│   │       ├── types.ts              # Shared types
│   │       ├── phases/               # Phase implementations
│   │       └── reporters/            # Output formatters
│   └── tsconfig.json
│
├── fixing-skills/scripts/            (@chariot/fixing-skills)
│   ├── package.json
│   ├── src/
│   │   └── fix.ts                    # Fix orchestration CLI
│   │       Uses: ../auditing-skills/scripts/src/lib/
│   └── tsconfig.json
│
├── updating-skills/scripts/          (@chariot/updating-skills)
│   ├── package.json
│   ├── src/
│   │   └── update.ts                 # TDD update CLI
│   │       Uses: ../auditing-skills/scripts/src/lib/
│   └── tsconfig.json
│
└── formatting-skill-output/scripts/  (@chariot/formatting-skill-output)
    ├── package.json
    ├── src/
    │   ├── format.ts                 # CLI entry point
    │   ├── index.ts                  # Shared library export
    │   └── lib/
    │       ├── table-formatter.ts    # Deterministic tables
    │       └── schemas.ts            # Zod validation
    └── tsconfig.json
```

### Shared Library Pattern

The audit engine is the foundation for multiple CLIs, enabling code reuse and consistency:

```typescript
// auditing-skills/scripts/src/lib/audit-engine.ts
export class SkillAuditor {
  // Phase validation logic
  validatePhase1(skill: Skill): PhaseResult { /* ... */ }
  validatePhase2(skill: Skill): PhaseResult { /* ... */ }
  // ... all 21 phases

  runAudit(skillPath: string, phase?: number): AuditResult {
    // Orchestrate phase execution
    // Return structured results
  }
}

export const PHASE_COUNT = 21; // Single source of truth
```

**Used by:**

1. **auditing-skills/audit.ts**: Full 21-phase audit
2. **fixing-skills/fix.ts**: Identify which issues to fix
3. **updating-skills/update.ts**: Validate changes don't break compliance

### CLI Invocation Pattern

**From Claude (via Bash tool):**

```bash
# Repo root detection (works from super-repo or submodule)
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"
cd "$REPO_ROOT/.claude"

# Execute via npm workspace shortcuts
npm run audit -- my-skill
npm run fix -- my-skill --dry-run
npm run search -- "keyword"
```

**CLI Output Contract:**

All CLIs produce deterministic output via shared formatter:

```typescript
// formatting-skill-output/lib/table-formatter.ts
export function formatFindingsTable(findings: Finding[]): string {
  // Deterministic Unicode table
  // Same input → identical output (every time)
}
```

**Why this matters:**

- **Reproducibility**: Test results are identical across runs
- **Version Control**: Diffs show actual changes, not formatting variations
- **User Trust**: Consistent output builds confidence

### Four-Tier Fix Architecture

The fixing-skills CLI implements a sophisticated four-tier orchestration:

```
┌─────────────────────────────────────────────────────────────────┐
│ TIER 1: DETERMINISTIC (CLI auto-applies)                        │
│ Phases: 2, 5, 7, 14a-c, 16, 18                                  │
│ Characteristics:                                                │
│ • One correct answer                                            │
│ • No semantic interpretation needed                             │
│ • Fast, safe, predictable                                       │
│ Example: Fix allowed-tools YAML format                          │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│ TIER 2: CLAUDE-AUTOMATED (Claude applies without confirm)       │
│ Phases: 1, 3, 11, 13, 15, 17, 21                                │
│ Characteristics:                                                │
│ • Requires semantic understanding                               │
│ • Clear correct outcome (once understood)                       │
│ • No user confirmation needed                                   │
│ Example: Rewrite description to "Use when..." format            │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│ TIER 3: HYBRID (Claude + user for ambiguous)                    │
│ Phases: 4, 6, 10, 12, 19                                        │
│ Characteristics:                                                │
│ • Multiple valid approaches                                     │
│ • Context-dependent decisions                                   │
│ • User confirmation required for ambiguous cases                │
│ Example: Broken link - create placeholder or remove?            │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│ TIER 4: HUMAN-REQUIRED (Interactive guidance)                   │
│ Phases: 8, 9, 20                                                │
│ Characteristics:                                                │
│ • Genuine human judgment needed                                 │
│ • Cannot be automated safely                                    │
│ • Claude provides guidance, user implements                     │
│ Example: Fix TypeScript compilation errors                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## TDD Enforcement

Test-Driven Development is mandatory across all skill lifecycle operations. The system enforces RED-GREEN-REFACTOR at multiple levels.

### TDD Workflow Integration

```
┌─────────────────────────────────────────────────────────────────┐
│ CREATING SKILLS: Full TDD Cycle                                 │
│                                                                 │
│ Phase 1: RED (Prove Gap Exists)                                 │
│   • Document why skill is needed                                │
│   • Test scenario WITHOUT skill → MUST FAIL                     │
│   • Capture exact failure behavior (verbatim)                   │
│   • Cannot proceed without failing test                         │
│                                                                 │
│ Phases 2-5: Implementation                                      │
│   • Location, category, type selection                          │
│   • Generate SKILL.md structure                                 │
│                                                                 │
│ Phase 6: Research & Populate Content                            │
│   • Invoke researching-skills for content                       │
│   • Codebase, Context7, web research                            │
│                                                                 │
│ Phase 7: GREEN (Verify Skill Works)                             │
│   • Re-test scenario WITH skill → MUST PASS                     │
│   • Run audit (auditing-skills)                                 │
│   • Fix issues if needed (fixing-skills)                        │
│   • Cannot proceed without passing test                         │
│                                                                 │
│ Phase 8: REFACTOR (Close Loopholes)                             │
│   • Run pressure tests (time, authority, sunk cost)             │
│   • Document rationalizations agents use                        │
│   • Add explicit counters ("Not even when...")                  │
│   • Re-test until bulletproof                                   │
│   • Uses testing-skills-with-subagents                          │
│                                                                 │
│ Phase 9: Complete                                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ UPDATING SKILLS: Simplified TDD (RED-GREEN)                     │
│                                                                 │
│ Phase 1: RED (Document Current Failure)                         │
│   • What's wrong with current skill?                            │
│   • Test current skill → Capture failure                        │
│   • Confirm skill update needed (vs agent update)               │
│   • Cannot proceed without failure documented                   │
│                                                                 │
│ Phases 2-3: Locate and Backup                                   │
│   • Find skill file, check size                                 │
│   • Create .local backup                                        │
│                                                                 │
│ Phase 3.5: Research (Optional)                                  │
│   • For significant content updates only                        │
│   • AskUserQuestion: invoke researching-skills?                 │
│   • Recommended for library/framework updates                   │
│                                                                 │
│ Phase 4: Edit                                                   │
│   • Apply minimal edit (inline or extract to references/)       │
│   • Update changelog                                            │
│                                                                 │
│ Phase 5: GREEN (Verify Fix)                                     │
│   • Re-test with updated skill → MUST PASS                      │
│   • Confirm fix resolves issue                                  │
│   • Cannot proceed without GREEN                                │
│                                                                 │
│ Phase 6: Compliance                                             │
│   • Run audit                                                   │
│   • Line count check (HARD LIMIT: <500 lines)                   │
│   • Fix issues if needed                                        │
│                                                                 │
│ Phase 7: REFACTOR (Mandatory for non-trivial)                   │
│   • Pressure test if rule/logic/validation changed              │
│   • Optional if cosmetic-only (<10 lines, no logic changes)     │
│   • Document tests run and results in changelog                 │
└─────────────────────────────────────────────────────────────────┘
```

**TDD Enforcement Mechanisms:**

1. **Skill Instructions**: Explicit "Cannot proceed without..." checkpoints
2. **TodoWrite Tracking**: Each phase tracked as todo item
3. **AskUserQuestion Gates**: Force user confirmation at critical points
4. **Audit Integration**: Automated validation prevents bypassing quality checks

**Pressure Testing (REFACTOR Phase):**

Implemented via `testing-skills-with-subagents` core skill:

```
Pressure Scenario Types:
1. TIME: "Emergency deployment in 30 minutes, just ship it"
2. AUTHORITY: "Senior engineer says skip validation, they'll take responsibility"
3. SUNK COST: "We already spent 4 hours on this, don't waste the work"

Test Execution:
1. Spawn subagent via Task tool
2. Load skill + pressure scenario
3. Subagent attempts task under pressure
4. Evaluate: Did subagent bypass the skill's rules?
5. If bypass detected: Add explicit counter-rationalization
6. Re-test until skill resists all pressures
```

**Why TDD Matters:**

- **Prevents Skill Bloat**: Only create skills for proven gaps
- **Ensures Quality**: Skills must actually solve the problem
- **Catches Loopholes**: Pressure testing reveals bypass attempts
- **Documents Value**: RED phase explicitly states why skill exists

---

## Tool Usage Patterns

The system uses different tools at different layers. Understanding which tools are appropriate for each operation is critical.

### Tool Usage by Layer

```
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 2: ROUTER (managing-skills)                               │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Allowed Tools: Read, Bash, Grep, Glob, TodoWrite, Skill,    │ │
│ │                AskUserQuestion                              │ │
│ │                                                             │ │
│ │ Usage:                                                      │ │
│ │ • Read: Load sub-skill markdown files                       │ │
│ │ • Bash: Execute CLI commands (npm run audit/fix/search)     │ │
│ │ • Grep/Glob: Discover skills for routing                    │ │
│ │ • TodoWrite: Track multi-phase workflows (MANDATORY)        │ │
│ │ • Skill: Invoke core skills (testing-skills-with-subagents) │ │
│ │ • AskUserQuestion: Prompt for operation confirmation        │ │
│ │                                                             │ │
│ │ NOT ALLOWED: Write, Edit, Task                              │ │
│ │ (Router delegates, doesn't implement)                       │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ LAYER 3: INSTRUCTION-BASED SUB-SKILLS                           │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ creating-skills                                             │ │
│ │ Allowed Tools: Read, Write, Edit, Bash, Grep, Glob,         │ │
│ │                TodoWrite, AskUserQuestion, Task, Skill      │ │
│ │                                                             │ │
│ │ Usage:                                                      │ │
│ │ • Write: Create SKILL.md, references/, changelog            │ │
│ │ • Edit: Update frontmatter, modify generated files          │ │
│ │ • Task: Spawn researching-skills, testing-skills agents     │ │
│ │ • Skill: Invoke testing-skills-with-subagents (REFACTOR)    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ deleting-skills                                             │ │
│ │ Allowed Tools: Read, Bash, Grep, Glob, Edit,                │ │
│ │                AskUserQuestion, TodoWrite                   │ │
│ │                                                             │ │
│ │ Usage:                                                      │ │
│ │ • Bash: Remove directories (rm -rf)                         │ │
│ │ • Edit: Update references (gateway, command, skill files)   │ │
│ │ • Grep/Glob: Find all references before deletion            │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ renaming-skills                                             │ │
│ │ Allowed Tools: Read, Edit, Bash, Grep, Glob, TodoWrite,     │ │
│ │                AskUserQuestion                              │ │
│ │                                                             │ │
│ │ Usage:                                                      │ │
│ │ • Bash: Move directories (mv)                               │ │
│ │ • Edit: Update frontmatter name, update all references      │ │
│ │ • Grep: Find all references to old name                     │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ LAYER 3: CLI-BASED SUB-SKILLS                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ auditing-skills                                             │ │
│ │ Allowed Tools: Bash, Read, Grep, TodoWrite, AskUserQuestion │ │
│ │                                                             │ │
│ │ Usage:                                                      │ │
│ │ • Bash: Run CLI (npm run audit -- skill-name)               │ │
│ │ • Read: Load skill for semantic review                      │ │
│ │ • AskUserQuestion: Prompt for fix workflow                  │ │
│ │                                                             │ │
│ │ NOT ALLOWED: Write, Edit (audit doesn't modify)             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ fixing-skills                                               │ │
│ │ Allowed Tools: Read, Edit, Write, Bash, AskUserQuestion,    │ │
│ │                TodoWrite, Skill                             │ │
│ │                                                             │ │
│ │ Usage:                                                      │ │
│ │ • Bash: Run CLI (npm run fix -- skill-name)                 │ │
│ │ • Edit: Apply Claude-automated fixes (Phase 1, 3, 11, etc.) │ │
│ │ • Write: Create new reference files                         │ │
│ │ • AskUserQuestion: Hybrid fixes (Phase 4, 6, 10, etc.)      │ │
│ │ • Skill: Invoke auditing-skills for re-audit                │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ updating-skills                                             │ │
│ │ Allowed Tools: Read, Edit, Write, Bash, AskUserQuestion,    │ │
│ │                TodoWrite                                    │ │
│ │                                                             │ │
│ │ Usage:                                                      │ │
│ │ • Bash: Run CLI (npm run update -- skill-name)              │ │
│ │ • Edit: Apply content changes                               │ │
│ │ • Write: Create new reference files if extracting           │ │
│ │ • AskUserQuestion: Research integration (optional)          │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### When to Use CLI vs Instructions

**Use CLI when:**

- **Deterministic Analysis**: File structure validation, frontmatter parsing
- **Complex Logic**: 21-phase audit with cross-referencing
- **Performance**: Scanning hundreds of skills
- **Shared Code**: Multiple operations need same validation logic
- **Reproducible Output**: Formatting must be identical across runs

**Use Instructions (native tools) when:**

- **Context-Dependent**: Decisions based on semantic understanding
- **One-Time Operations**: Delete, rename (rarely automated)
- **User Interaction**: Multiple confirmation points needed
- **Flexible Workflow**: Different paths based on user choices

**Example: Why auditing-skills uses CLI + Claude:**

```
STRUCTURAL AUDIT (CLI):
✓ Deterministic: Check if frontmatter has 'name' field
✓ Fast: Parse 120 skills in < 2 seconds
✓ Reproducible: Same findings every time

SEMANTIC REVIEW (Claude):
✓ Context-dependent: "Is description optimized for discovery?"
✓ Requires judgment: "Should this be in gateway-frontend?"
✓ Flexible: Different suggestions based on skill purpose
```

---

## Shared Libraries

The system maximizes code reuse through shared TypeScript libraries and patterns.

### Audit Engine (Primary Shared Library)

```
.claude/skill-library/claude/skill-management/auditing-skills/scripts/src/lib/
├── audit-engine.ts         # Core phase validation engine
├── types.ts                # Shared type definitions
├── orchestrator.ts         # Multi-phase orchestration
├── phases/                 # Phase implementations
│   ├── phase1-description.ts
│   ├── phase2-frontmatter.ts
│   └── ...
├── reporters/              # Output formatters
│   └── console-reporter.ts
├── library-discovery.ts    # Dual-location skill discovery
├── skill-finder.ts         # Skill lookup and fuzzy matching
└── skill-searcher.ts       # Search implementation
```

**Consumers:**

1. **auditing-skills/audit.ts**: Uses audit-engine.ts for 21-phase validation
2. **fixing-skills/fix.ts**: Imports audit-engine.ts via relative path
3. **updating-skills/update.ts**: Imports library-discovery.ts, audit-engine.ts

**Import Pattern:**

```typescript
// fixing-skills/scripts/src/fix.ts
import { SkillAuditor, PHASE_COUNT } from '../../auditing-skills/scripts/src/lib/audit-engine.js';
import { findSkill } from '../../auditing-skills/scripts/src/lib/skill-finder.js';
import { type PhaseResult, type AuditResult } from '../../auditing-skills/scripts/src/lib/types.js';

// Now fixing-skills can run audits without duplicating logic
const auditor = new SkillAuditor();
const results = await auditor.runAudit(skillPath);
```

### Formatting Shared Library

```
.claude/skill-library/claude/skill-management/formatting-skill-output/scripts/
├── src/
│   ├── format.ts           # CLI entry point
│   ├── index.ts            # Library export
│   └── lib/
│       ├── table-formatter.ts  # Core formatting logic
│       └── schemas.ts          # Zod schemas for validation
└── package.json            # Published as @chariot/formatting-skill-output
```

**Used By:**

1. **auditing-skills**: Format audit findings
2. **fixing-skills**: Format fix suggestions

**Usage:**

```typescript
// auditing-skills/scripts/src/audit.ts
import { formatFindingsTable, countFindings, formatCompletionMessage, type Finding } from '@chariot/formatting-skill-output/lib/table-formatter';

// Use shared formatter
const output = formatFindingsTable(findings);
console.log(output);
```

**Why Shared Formatting Matters:**

- **Determinism**: Same findings → identical output (every time)
- **Consistency**: All CLIs use same table format
- **Single Source**: Change formatting once, affects all CLIs
- **Testability**: Format logic tested in one place

---

## Data Flow

Understanding how data moves through the system is critical for debugging and extending functionality.

### Audit Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ INPUT: User invokes /skill-manager audit my-skill                │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ STEP 1: Command → Router                                         │
│ .claude/commands/skill-manager.md                                │
│   → Parses: operation="audit", skillName="my-skill"              │
│   → Delegates to managing-skills via Skill tool                  │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ STEP 2: Router → Sub-Skill                                       │
│ managing-skills/SKILL.md                                         │
│   → Maps "audit" → auditing-skills                               │
│   → Loads: Read(".../auditing-skills/SKILL.md")                  │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ STEP 3: Sub-Skill → CLI                                          │
│ auditing-skills/SKILL.md                                         │
│   → Executes: npm run audit -- my-skill                          │
│   → Passes control to TypeScript CLI                             │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ STEP 4: CLI Execution                                            │
│ auditing-skills/scripts/src/audit.ts                             │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │ 4a. Skill Discovery                                        │ │
│   │   • findSkill(name) → searches core + library              │ │
│   │   • Returns: { path, frontmatter, content }                │ │
│   └────────────────────────────────────────────────────────────┘ │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │ 4b. Audit Engine Execution                                 │ │
│   │   • SkillAuditor.runAudit(path)                            │ │
│   │   • Runs phases 1-21 sequentially                          │ │
│   │   • Each phase returns: PhaseResult                        │ │
│   │     { phase, status: 'pass'|'warn'|'fail', message }       │ │
│   └────────────────────────────────────────────────────────────┘ │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │ 4c. Format Output                                          │ │
│   │   • formatFindingsTable(results)                           │ │
│   │   • Returns deterministic Unicode table                    │ │
│   └────────────────────────────────────────────────────────────┘ │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │ 4d. Return to Bash                                         │ │
│   │   • stdout: Formatted table                                │ │
│   │   • exit code: 0 (pass/warn) or 1 (fail)                   │ │
│   └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ STEP 5: Claude Semantic Review                                   │
│ auditing-skills/SKILL.md (continues)                             │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │ 5a. Read Skill Content                                     │ │
│   │   • Read(".../my-skill/SKILL.md")                          │ │
│   │   • Parse frontmatter + content                            │ │
│   └────────────────────────────────────────────────────────────┘ │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │ 5b. Evaluate 6 Criteria                                    │ │
│   │   • Description quality (CSO)                              │ │
│   │   • Skill categorization                                   │ │
│   │   • Gateway membership                                     │ │
│   │   • Tool appropriateness                                   │ │
│   │   • Content density                                        │ │
│   │   • External documentation                                 │ │
│   └────────────────────────────────────────────────────────────┘ │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │ 5c. Output JSON Findings                                   │ │
│   │   • Write to /tmp/semantic-findings-my-skill.json          │ │
│   │   • Structure: { findings: [ { severity, criterion,.. }] } │ │
│   └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ STEP 6: Merge and Render                                         │
│ auditing-skills/SKILL.md (continues)                             │
│   → Execute: npm run audit -- my-skill --merge-semantic /tmp/... │
│   → CLI reads JSON, merges with structural findings              │
│   → formatFindingsTable(structural + semantic)                   │
│   → Output: Combined deterministic table                         │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ STEP 7: Post-Audit Actions                                       │
│ auditing-skills/SKILL.md (continues)                             │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │ 7a. Check for Issues                                       │ │
│   │   • If failures OR warnings found:                         │ │
│   │     → Prompt user via AskUserQuestion                      │ │
│   │   • If all pass:                                           │ │
│   │     → Display success, exit                                │ │
│   └────────────────────────────────────────────────────────────┘ │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │ 7b. User Selects Action                                    │ │
│   │   • "Run full fixing workflow" →                           │ │
│   │     Read(".../fixing-skills/SKILL.md")                     │ │
│   │   • "Apply deterministic fixes only" →                     │ │
│   │     npm run fix -- my-skill                                │ │
│   │   • "Skip" → Exit                                          │ │
│   └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ STEP 8: Circular Delegation (if fixes chosen)                    │
│ fixing-skills/SKILL.md → Apply fixes → Re-audit                  │
│ (See Circular Workflow Patterns section)                         │
└──────────────────────────────────────────────────────────────────┘
```

**Key Data Flow Characteristics:**

1. **Separation of Concerns**: CLI handles structure, Claude handles semantics
2. **Deterministic Boundaries**: CLI output identical for same inputs
3. **JSON Contract**: Clean boundary between structural and semantic analysis
4. **Validation**: Zod schemas ensure data integrity

---

## Key Design Decisions

Understanding the rationale behind architectural choices.

### 1. Progressive Disclosure

**Decision**: Skills must be <500 lines, detailed content in references/

**Rationale:**

- **Cognitive Load**: Humans can only hold ~7 items in working memory
- **Token Efficiency**: Shorter skills reduce context consumption
- **Maintainability**: Easier to update small files than monoliths
- **Discovery**: Quick scanning enables fast skill discovery

**Implementation:**

- Phase 3 audit enforces <500 line HARD LIMIT
- Creating-skills mandates extraction if generation exceeds limit
- Updating-skills requires extraction if edits push over 400 lines
- fixing-skills automatically extracts when Phase 3 fails

### 2. Deterministic Output

**Decision**: CLI produces identical output for same inputs

**Rationale:**

- **Reproducibility**: Tests produce consistent results
- **Version Control**: Git diffs show actual changes, not formatting noise
- **User Trust**: Predictable behavior builds confidence
- **Debugging**: Easier to identify real issues vs formatting artifacts

**Implementation:**

- Shared formatter (@chariot/formatting-skill-output)
- Unicode tables with fixed column widths
- Consistent severity ordering (CRITICAL → WARNING → INFO)
- No timestamps or random elements in output

### 3. Router Pattern

**Decision**: managing-skills is a pure router with NO implementation logic

**Rationale:**

- **Single Responsibility**: Router routes, sub-skills implement
- **Scalability**: Easy to add new operations without changing router
- **Clarity**: Delegation map is clear and explicit
- **Testing**: Router logic is trivial (just mapping)

### 4. Four-Tier Fix Model

**Decision**: Fixes categorized as Deterministic, Claude-Automated, Hybrid, Human-Required

**Rationale:**

- **Efficiency**: Auto-fix what's safe, prompt only when needed
- **Safety**: Hybrid tier catches ambiguous cases before wrong fix applied
- **User Control**: Human-required tier respects genuine judgment needs
- **Progressive Enhancement**: Can move fixes between tiers as confidence grows

**Tier Selection Criteria:**

| Question                        | Deterministic | Claude-Auto | Hybrid          | Human        |
| ------------------------------- | ------------- | ----------- | --------------- | ------------ |
| One correct answer?             | Yes           | No          | No              | No           |
| Semantic interpretation needed? | No            | Yes         | Yes             | Yes          |
| Context-dependent?              | No            | No          | Yes             | Yes          |
| User confirmation needed?       | No            | No          | Yes (ambiguous) | Yes (always) |

### 5. TDD Enforcement

**Decision**: RED-GREEN-REFACTOR mandatory for all creation/update

**Rationale:**

- **Prevents Bloat**: Only create skills for proven gaps
- **Quality Assurance**: Skills must actually solve problems
- **Loophole Detection**: Pressure testing reveals bypass attempts
- **Documentation**: RED phase documents "why skill exists"

### 6. Circular Delegation

**Decision**: Allow skills to delegate back to earlier skills in workflow

**Rationale:**

- **Iterative Improvement**: Continue fixing until compliance achieved
- **Automation**: Claude handles routine iterations without user interruption
- **Quality Gates**: Automatic re-audit after fixes prevents regressions

**Cycle Detection:**

```typescript
// Prevent infinite loops
const MAX_ITERATIONS = 5;
let iteration = 0;

while (auditFails && iteration < MAX_ITERATIONS) {
  applyFixes();
  iteration++;
  reAudit();
}

if (iteration >= MAX_ITERATIONS) {
  throw new Error('Max iterations reached, manual intervention needed');
}
```

### 7. CLI + Claude Hybrid

**Decision**: Use CLI for deterministic tasks, Claude for semantic analysis

**Rationale:**

- **Best of Both**: CLI for speed/consistency, Claude for understanding
- **Clear Boundary**: JSON contract between layers
- **Maintainability**: Each layer does what it's best at
- **Testability**: CLI logic tested separately from Claude reasoning

### 8. Dual-Location Architecture

**Decision**: Skills in two locations (core + library)

**Rationale:**

- **Token Budget**: Core limited to ~25 high-frequency skills
- **Progressive Loading**: Library skills loaded on-demand via gateways
- **Organization**: Category-based library structure aids discovery
- **Scalability**: Can grow library without affecting core

**Location Decision Tree:**

```
Is skill used in EVERY conversation?
  YES → Core (.claude/skills/)
  NO  → Library (.claude/skill-library/)

Is skill domain-specific?
  YES → Library under category (development/testing/etc.)
  NO  → Core if truly universal
```

### 9. Gateway Mapping

**Category-to-Gateway Mapping:**

| Category                     | Gateway                |
| ---------------------------- | ---------------------- |
| `development/frontend/*`     | `gateway-frontend`     |
| `development/backend/*`      | `gateway-backend`      |
| `testing/*`                  | `gateway-testing`      |
| `security/*`                 | `gateway-security`     |
| `claude/mcp-tools/*`         | `gateway-mcp-tools`    |
| `development/integrations/*` | `gateway-integrations` |
| `capabilities/*`             | `gateway-capabilities` |
| `claude/*` (non-mcp)         | `gateway-claude`       |

---

## Summary

The Skill Manager architecture is a sophisticated system that:

1. **Enforces Quality**: 21-phase audit + TDD + pressure testing
2. **Enables Automation**: Deterministic CLI + Claude reasoning hybrid
3. **Maintains Compliance**: Circular workflows iterate until pass
4. **Scales Elegantly**: Router pattern + shared libraries + dual locations
5. **Respects Users**: Interactive prompts for ambiguous decisions

**Architecture Principles:**

- **Progressive Disclosure**: Keep skills lean, extract details
- **Deterministic Output**: Same input → identical output
- **Single Responsibility**: Each component does one thing well
- **TDD Enforcement**: RED-GREEN-REFACTOR mandatory
- **Circular Delegation**: Iterate until quality achieved

**System Performance:**

- **Audit Time**: <2 seconds for single skill, <10 seconds for all skills
- **Fix Time**: Deterministic fixes <1 second, hybrid fixes depend on user
- **Token Usage**: Router + sub-skill ~2K tokens (vs 10K for monolithic)
- **Maintainability**: 10 focused sub-skills vs 1 giant skill

This architecture enables Claude Code to maintain a high-quality skill library with automated compliance checks, iterative improvement loops, and clear separation of concerns.
