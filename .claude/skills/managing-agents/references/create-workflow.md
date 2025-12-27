# Agent Creation Workflow

**Instruction-based workflow with full 10-phase TDD cycle.**

⚠️ **As of December 2024, agent creation uses instruction-based workflow, not CLI commands.**

---

## Overview

Creating a new agent follows a comprehensive TDD workflow with skill verification and pressure testing. This ensures agents are needed, functional, and resistant to bypass rationalization.

## How to Create an Agent

**Route to the creating-agents skill:**

```
Read: .claude/skill-library/claude/agent-management/creating-agents/SKILL.md
```

The `creating-agents` skill provides the complete workflow.

---

## What the Workflow Provides

### Full 10-Phase TDD Workflow

The creating-agents skill implements RED-GREEN-REFACTOR with additional verification phases:

1. **Phase 1:** Gap Analysis (RED)
2. **Phase 2:** Agent Type Selection
3. **Phase 3:** Description Design
4. **Phase 4:** Agent Generation (GREEN)
5. **Phase 5:** Audit Compliance
6. **Phase 6:** Discovery Testing
7. **Phase 7:** Skill Integration
8. **Phase 8:** Skill Verification (NEW)
9. **Phase 9:** Final Audit
10. **Phase 10:** Pressure Testing (REFACTOR)

### Key Features

- **Phase 8: Skill Verification** - Tests each mandatory skill individually to ensure agent actually invokes them
- **Phase 10: Pressure Testing** - Subagent-based testing with time/authority/sunk cost pressure scenarios
- **Interactive guidance** - Uses AskUserQuestion for decisions (type selection, skill choices)
- **TDD enforcement** - Cannot proceed without RED phase demonstrating gap

---

## Why Instruction-Based?

December 2024 analysis of the previous CLI-based workflow (`npm run create`) showed:

- **97% code duplication** - TypeScript implementation duplicated Claude's native capabilities
- **Inflexibility** - Hard to add interactive workflows like pressure testing
- **Skill verification gaps** - CLI couldn't spawn subagents to test skill invocation
- **Maintenance overhead** - Code changes required for workflow adjustments

**Instruction-based benefits:**

- Uses Claude's native tools (Read, Write, Edit, Task, AskUserQuestion)
- Flexible for interactive workflows
- Enables subagent-based pressure testing (Phase 10)
- Enables per-skill verification (Phase 8)
- Easy to update workflows (change instructions, not code)

---

## Agent Type Options

Selected in Phase 3 of the creating-agents workflow:

| Type           | Purpose                            | Permission Mode |
| -------------- | ---------------------------------- | --------------- |
| `architecture` | System design, patterns, decisions | `plan`          |
| `development`  | Implementation, coding, features   | `default`       |
| `testing`      | Unit, integration, e2e testing     | `default`       |
| `quality`      | Code review, auditing              | `default`       |
| `analysis`     | Security, complexity assessment    | `plan`          |
| `research`     | Web search, documentation          | `plan`          |
| `orchestrator` | Coordination, workflows            | `default`       |
| `mcp-tools`    | Specialized MCP access             | `default`       |

---

## Time Estimate

- **Minimum (happy path):** 60 minutes
  - All phases pass on first try
  - No pressure test failures

- **Typical:** 75-90 minutes
  - 1-2 audit fix cycles
  - 1-2 pressure test iterations

- **Complex (with iterations):** 2-3 hours
  - Multiple pressure test failures
  - Skill verification issues
  - Description refinement needed

---

## Prerequisites

None - the creating-agents skill handles all setup internally.

---

## Documentation

**Full workflow details:**
`.claude/skill-library/claude/agent-management/creating-agents/SKILL.md`

**Related references:**

- [TDD Workflow](tdd-workflow.md) - RED-GREEN-REFACTOR methodology
- [Lean Agent Pattern](lean-agent-pattern.md) - Template and guidelines
- [Directory Structure](directory-structure.md) - Where agents are organized
- [Discovery Testing](discovery-testing.md) - Verification protocol

---

## Historical Note: CLI Workflow (ARCHIVED)

The previous TypeScript CLI workflow (`npm run create --`) was deprecated in December 2024.

**Why deprecated:**

- 97% code duplication with Claude's native capabilities
- Could not support interactive workflows
- Could not spawn subagents for pressure testing
- Required code changes for workflow updates

**Migration:** All agent creation now uses the instruction-based creating-agents skill.

If you encounter references to `npm run create`, they are outdated and should be replaced with instructions to use the creating-agents skill.
