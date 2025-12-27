# Agent Update Workflow

**Instruction-based workflow with simplified 6-phase TDD cycle.**

⚠️ **As of December 2024, agent updates use instruction-based workflow, not CLI commands.**

---

## Overview

Updating an existing agent follows a simplified TDD workflow (RED-GREEN with conditional REFACTOR). This balances speed for minor updates with rigor for major changes.

## How to Update an Agent

**Route to the updating-agents skill:**

```
Read: .claude/skill-library/claude/agent-management/updating-agents/SKILL.md
```

The `updating-agents` skill provides the complete workflow.

---

## What the Workflow Provides

### Simplified 6-Phase TDD Workflow

The updating-agents skill implements a streamlined RED-GREEN-REFACTOR:

1. **Phase 1:** Gap Analysis (RED)
2. **Phase 2:** Minimal Changes (GREEN)
3. **Phase 3:** Audit Compliance
4. **Phase 4:** Discovery Testing
5. **Phase 5:** Verify No Regressions
6. **Phase 6:** Pressure Testing (CONDITIONAL)

### Key Features

- **Minimal diff approach** - Uses Edit tool for surgical changes
- **Conditional pressure testing** - Only required for major changes (Phase 6)
- **Fast iteration** - Minor updates complete in ~20 minutes
- **TDD enforcement** - RED phase still required, but simpler than creation

---

## When to Pressure Test (Phase 6)

Pressure testing is **conditional** based on change scope:

### ✅ Pressure Test Required

- **Changed Critical Rules** - Rules might not resist rationalization
- **Added/removed capabilities** - Agent behavior changes significantly
- **Modified mandatory skills** - Workflow requirements changed
- **Major refactoring** - >50 lines changed or significant restructure

### ⏭️ Pressure Test Optional

- **Description refinements** - Wording improvements, example updates
- **Tool additions** - Added new tools to frontmatter
- **Minor fixes** - Typos, formatting, documentation
- **Small optimizations** - <20 lines changed

---

## Time Estimates

| Update Type                        | Time      | Phases                                    |
| ---------------------------------- | --------- | ----------------------------------------- |
| **Minor** (description, tools)     | 20 min    | Phases 1-5 only                           |
| **Moderate** (add capability)      | 40 min    | Phases 1-6 (pressure test)                |
| **Major** (refactor, rules change) | 60-90 min | Phases 1-6 (multiple pressure iterations) |

---

## Comparison: Update vs Create

| Aspect                 | Create                             | Update                       |
| ---------------------- | ---------------------------------- | ---------------------------- |
| **Phases**             | 10 phases                          | 6 phases                     |
| **RED Phase**          | Comprehensive gap analysis         | Focused gap documentation    |
| **Skill Verification** | Phase 8 (individual skill testing) | Skipped (assume working)     |
| **Pressure Testing**   | Phase 10 (always)                  | Phase 6 (conditional)        |
| **Time**               | 60-90 min minimum                  | 20-90 min (depends on scope) |

**Rationale:** Updates assume agent is already functional and just needs refinement, so some verification phases can be skipped or made conditional.

---

## Why Instruction-Based?

Same rationale as agent creation:

- **97% code duplication** with Claude's native capabilities (CLI version)
- **Flexibility** for conditional workflows (pressure testing based on change scope)
- **Edit tool precision** - Minimal diffs for targeted changes
- **AskUserQuestion** - Interactive decision on whether pressure testing is needed

---

## Prerequisites

None - the updating-agents skill handles all setup internally.

---

## Documentation

**Full workflow details:**
`.claude/skill-library/claude/agent-management/updating-agents/SKILL.md`

**Related references:**

- [TDD Workflow](tdd-workflow.md) - RED-GREEN-REFACTOR methodology
- [Lean Agent Pattern](lean-agent-pattern.md) - Target structure
- [Discovery Testing](discovery-testing.md) - Verification protocol
- [Create Workflow](create-workflow.md) - Full creation process for comparison

---

## Historical Note: CLI Workflow (ARCHIVED)

The previous TypeScript CLI workflow (`npm run update --`) was deprecated in December 2024 for the same reasons as the create workflow: code duplication, inflexibility, and inability to support conditional logic.
