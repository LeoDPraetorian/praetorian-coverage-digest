---
name: managing-skills
description: Use when managing skills (create, update, audit, fix, delete, rename, migrate, search, list, compare, sync) - routes to specialized library skills
allowed-tools: Read, Bash, Grep, Glob, TodoWrite, Skill, AskUserQuestion
---

# Skill Lifecycle Manager

**Complete skill lifecycle with TDD enforcement, compliance validation against the [Skill Compliance Contract](references/skill-compliance-contract.md), and dual-location search.**

## Quick Reference

| Operation         | Delegated To              | Implementation    | Complexity |
| ----------------- | ------------------------- | ----------------- | ---------- |
| **Create**        | `creating-skills`         | Instruction-based | Medium     |
| **Update**        | `updating-skills`         | Instruction-based | Low-Medium |
| **Delete**        | `deleting-skills`         | Instruction-based | Medium     |
| **Audit**         | `auditing-skills`         | Instruction-based | Low        |
| **Fix**           | `fixing-skills`           | Instruction-based | Low-Medium |
| **Search**        | `searching-skills`        | Instruction-based | Low        |
| **List**          | `listing-skills`          | Instruction-based | Low        |
| **Compare**       | `processing-large-skills` | Instruction-based | Low        |
| **Research**      | `orchestrating-research`  | Instruction-based | Low-Medium |
| **Rename**        | `renaming-skills`         | Instruction-based | Medium     |
| **Migrate**       | `migrating-skills`        | Instruction-based | Medium     |
| **Sync Gateways** | `syncing-gateways`        | Instruction-based | Medium     |

**For detailed operation workflows, see:** [references/operations.md](references/operations.md)

## Understanding This Skill (Two-Tier System)

**How you got here**: You invoked this skill via Skill tool:

```
skill: "managing-skills"
```

**What this skill provides**: A routing table to specialized skill management operations, some core (accessible via Skill tool) and others library (accessible via Read tool).

**Critical: Two-Tier Skill Access**

| Skill                       | Location                                             | How to Invoke                                                                                      |
| --------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **creating-skills**         | `.claude/skill-library/.../creating-skills/`         | `Read(".claude/skill-library/claude/skill-management/creating-skills/SKILL.md")` (LIBRARY)         |
| **updating-skills**         | `.claude/skill-library/.../updating-skills/`         | `Read(".claude/skill-library/claude/skill-management/updating-skills/SKILL.md")` (LIBRARY)         |
| **auditing-skills**         | `.claude/skill-library/.../auditing-skills/`         | `Read(".claude/skill-library/claude/skill-management/auditing-skills/SKILL.md")` (LIBRARY)         |
| **fixing-skills**           | `.claude/skill-library/.../fixing-skills/`           | `Read(".claude/skill-library/claude/skill-management/fixing-skills/SKILL.md")` (LIBRARY)           |
| **deleting-skills**         | `.claude/skill-library/.../deleting-skills/`         | `Read(".claude/skill-library/claude/skill-management/deleting-skills/SKILL.md")` (LIBRARY)         |
| **renaming-skills**         | `.claude/skill-library/.../renaming-skills/`         | `Read(".claude/skill-library/claude/skill-management/renaming-skills/SKILL.md")` (LIBRARY)         |
| **migrating-skills**        | `.claude/skill-library/.../migrating-skills/`        | `Read(".claude/skill-library/claude/skill-management/migrating-skills/SKILL.md")` (LIBRARY)        |
| **searching-skills**        | `.claude/skill-library/.../searching-skills/`        | `Read(".claude/skill-library/claude/skill-management/searching-skills/SKILL.md")` (LIBRARY)        |
| **listing-skills**          | `.claude/skill-library/.../listing-skills/`          | `Read(".claude/skill-library/claude/skill-management/listing-skills/SKILL.md")` (LIBRARY)          |
| **processing-large-skills** | `.claude/skill-library/.../processing-large-skills/` | `Read(".claude/skill-library/claude/skill-management/processing-large-skills/SKILL.md")` (LIBRARY) |
| **syncing-gateways**        | `.claude/skill-library/.../syncing-gateways/`        | `Read(".claude/skill-library/claude/skill-management/syncing-gateways/SKILL.md")` (LIBRARY)        |

<IMPORTANT>
Library skills listed above are NOT available via Skill tool.
You MUST use Read tool to load them.

❌ WRONG: `skill: "updating-skills"` ← Will fail, not a core skill
✅ RIGHT: `Read(".claude/skill-library/claude/skill-management/updating-skills/SKILL.md")`
</IMPORTANT>

## Router Architecture

**managing-skills is a pure router.** It has NO scripts of its own and delegates all operations to specialized library skills.

### Delegation Map

| When user says...                 | Delegate to...            | Implementation                          |
| --------------------------------- | ------------------------- | --------------------------------------- |
| "create a skill"                  | `creating-skills`         | Instruction-based workflow              |
| "create gateway-X --type gateway" | `creating-skills`         | Uses gateway template                   |
| "update X skill"                  | `updating-skills`         | Instruction-based TDD workflow          |
| "delete X skill"                  | `deleting-skills`         | Instruction-based workflow              |
| "audit X skill"                   | `auditing-skills`         | Instruction-based                       |
| "audit gateway-X"                 | `auditing-skills`         | Validates against compliance contract   |
| "fix X skill"                     | `fixing-skills`           | Instruction-based                       |
| "fix gateway-X --phase N"         | `fixing-skills`           | Gateway-specific fixes                  |
| "search for skills"               | `searching-skills`        | Instruction-based (manual grep/find)    |
| "list all skills"                 | `listing-skills`          | Instruction-based                       |
| "compare X to Y"                  | `processing-large-skills` | Uses compare mode for symmetry analysis |
| "research X"                      | `orchestrating-research`  | Parallel research with intent expansion |
| "rename X to Y"                   | `renaming-skills`         | Instruction-based                       |
| "migrate X to library"            | `migrating-skills`        | Instruction-based                       |
| "sync gateways"                   | `syncing-gateways`        | Instruction-based                       |

**Note on Research**: Use `orchestrating-research` for complex, multi-source research. It provides:

- Intent expansion via `translating-intent` (handles vague queries like "research auth patterns")
- Parallel agent execution across 6 sources
- Cross-interpretation synthesis with conflict detection
- Comprehensive OUTPUT_DIR with SYNTHESIS.md

## Tool Usage

**Router tools** (used by managing-skills directly):

- **Read** - Load delegated library skills
- **Bash** - Execute system commands for file operations
- **Grep/Glob** - Discover and validate skills
- **TodoWrite** - Track multi-phase workflows (MANDATORY)
- **Skill** - Invoke core skills (e.g., `skill: "using-skills"`)
- **AskUserQuestion** - Interactive confirmations

**Delegated tools** (used by library skills, not the router):

- Write, Edit - Content modifications (used by creating-skills, updating-skills, fixing-skills)
- Task - Agent orchestration (used by orchestrating-research for parallel research)

## TDD Workflow (MANDATORY)

### 🔴 RED Phase (Prove Gap Exists)

1. Document why skill is needed or what gap exists
2. Test scenario without skill → **MUST FAIL**
3. Capture exact failure behavior (verbatim)

### 🟢 GREEN Phase (Minimal Implementation)

4. Create/update skill to address specific gap
5. Re-test scenario → **MUST PASS**
6. Verify no regression in existing behavior

### 🔵 REFACTOR Phase (Close Loopholes)

7. Run pressure tests (time, authority, sunk cost)
8. Document rationalizations (how agents bypass rules)
9. Add explicit counters ("Not even when...")
10. Re-test until bulletproof

**Cannot proceed without failing test first.**

## Operations

This skill routes to 12 specialized operations. Each operation has comprehensive workflows, CLI commands, and safety protocols.

**For complete operation details, see:** [references/operations.md](references/operations.md)

**Operation summary:**

- **Create** - Instruction-driven skill creation via `creating-skills`
- **Update** - Instruction-driven TDD update workflow
- **Delete** - Safe deletion with reference cleanup (8-phase protocol)
- **Audit** - Validates skills against the [Skill Compliance Contract](references/skill-compliance-contract.md)
- **Fix** - Three modes (auto-apply, suggest, apply) for compliance
- **Rename** - Safe renaming with reference updates (10-step protocol)
- **Migrate** - Move between core and library locations
- **Search** - Dual-location discovery with scoring algorithm
- **List** - Display all skills (both core and library)
- **Research** - Codebase, Context7, and web research for skill creation
- **Sync Gateways** - Validate gateway-library consistency

## Gateway Management

Gateway skills route agents from core to library in the two-tier system. Specialized operations support gateway creation, auditing, fixing, and synchronization.

**For complete gateway management commands and workflows, see:** [references/gateway-management.md](references/gateway-management.md)

## Progressive Disclosure

**Quick Start (15 min):**

- Create with TDD (RED-GREEN-REFACTOR)
- Audit for compliance
- Fix deterministic issues

**Comprehensive (60 min):**

- Full TDD cycle with pressure testing
- Progressive disclosure organization
- Compliance validation against the [Skill Compliance Contract](references/skill-compliance-contract.md)
- Reference updates and migration

**Deep Dives (references/):**

- [Operations](references/operations.md) - Complete workflow for skill operations
- [TDD methodology](references/tdd-methodology.md)
- [Progressive disclosure](references/progressive-disclosure.md)
- [Skill compliance contract](references/skill-compliance-contract.md)
- [Rename protocol](references/rename-protocol.md)
- [Migration workflow](references/migrate-workflow.md)
- [Gateway management](references/gateway-management.md)
- [Table formatting](references/table-formatting.md) - Prettier-based table validation (cross-cutting)

## Migration from Old Skills

This skill consolidates:

- `claude-skill-write` → use `creating-skills` or `updating-skills` skill
- `claude-skill-compliance` → use `auditing-skills` or `fixing-skills` skill
- `claude-skill-search` → use `searching-skills` skill (NOW includes library)

**Command integration:** `/skill-manager` command updated to delegate to this skill

## Key Principles

1. **TDD Always** - Cannot create/update without failing test first
2. **Compliance Audit** - Validates against the [Skill Compliance Contract](references/skill-compliance-contract.md)
3. **Progressive Disclosure** - Lean SKILL.md + detailed references/
4. **Router Pattern** - `/skill-manager` command delegates here
5. **Instruction-Driven Creation** - Create via `creating-skills` skill (no TypeScript CLI)
6. **Dual-Location Search** - Searches both core and library
7. **TodoWrite Tracking** - You MUST use TodoWrite before starting to track all workflow steps
8. **Research Delegation** - Use `orchestrating-research` for content population

## Integration

### Called By

- `/skill-manager` command - All skill management operations (create, update, audit, fix, delete, rename, migrate, search, list, sync)
- User direct invocation via `skill: "managing-skills"`

### Requires (invoke before starting)

None - This is an entry point router skill

### Calls (during execution)

| Skill                               | Phase/Step           | Purpose                                                                                                               |
| ----------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `creating-skills` (LIBRARY)         | When user creates    | Delegates skill creation - `Read(".claude/skill-library/claude/skill-management/creating-skills/SKILL.md")`           |
| `updating-skills` (LIBRARY)         | When user updates    | Delegates skill updates - `Read(".claude/skill-library/claude/skill-management/updating-skills/SKILL.md")`            |
| `auditing-skills` (LIBRARY)         | When user audits     | Delegates compliance audit - `Read(".claude/skill-library/claude/skill-management/auditing-skills/SKILL.md")`         |
| `fixing-skills` (LIBRARY)           | When user fixes      | Delegates compliance fixes - `Read(".claude/skill-library/claude/skill-management/fixing-skills/SKILL.md")`           |
| `deleting-skills` (LIBRARY)         | When user deletes    | Delegates safe deletion - `Read(".claude/skill-library/claude/skill-management/deleting-skills/SKILL.md")`            |
| `renaming-skills` (LIBRARY)         | When user renames    | Delegates safe renaming - `Read(".claude/skill-library/claude/skill-management/renaming-skills/SKILL.md")`            |
| `migrating-skills` (LIBRARY)        | When user migrates   | Delegates location migration - `Read(".claude/skill-library/claude/skill-management/migrating-skills/SKILL.md")`      |
| `searching-skills` (LIBRARY)        | When user searches   | Delegates skill discovery - `Read(".claude/skill-library/claude/skill-management/searching-skills/SKILL.md")`         |
| `listing-skills` (LIBRARY)          | When user lists      | Delegates skill enumeration - `Read(".claude/skill-library/claude/skill-management/listing-skills/SKILL.md")`         |
| `processing-large-skills` (LIBRARY) | When user compares   | Delegates skill comparison - `Read(".claude/skill-library/claude/skill-management/processing-large-skills/SKILL.md")` |
| `syncing-gateways` (LIBRARY)        | When user syncs      | Delegates gateway validation - `Read(".claude/skill-library/claude/skill-management/syncing-gateways/SKILL.md")`      |
| `orchestrating-research` (LIBRARY)  | When user researches | Delegates research orchestration - `Read(".claude/skill-library/research/orchestrating-research/SKILL.md")`           |

### Pairs With (conditional)

| Skill                                         | Trigger               | Purpose                                     |
| --------------------------------------------- | --------------------- | ------------------------------------------- |
| `pressure-testing-skill-content` (LIBRARY)    | Testing operations    | Meta-testing skills with pressure scenarios |
| `closing-rationalization-loopholes` (LIBRARY) | TDD operations        | TDD methodology for fixing loopholes        |
| `using-skills` (CORE)                         | Discovery operations  | Navigator/librarian for skill discovery     |
| `developing-with-tdd` (CORE)                  | Creation operations   | TDD methodology and best practices          |
| `debugging-systematically` (CORE)             | Fix operations        | When skills fail in production              |
| `verifying-before-completion` (CORE)          | Completion validation | Final validation checklist                  |

## Related Skills

| Skill                                 | Access Method                                                                                                | Purpose                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| **creating-skills**                   | `Read(".claude/skill-library/claude/skill-management/creating-skills/SKILL.md")` (LIBRARY)                   | Instruction-driven skill creation workflow                         |
| **updating-skills**                   | `Read(".claude/skill-library/claude/skill-management/updating-skills/SKILL.md")` (LIBRARY)                   | Test-guarded skill updates with TDD                                |
| **auditing-skills**                   | `Read(".claude/skill-library/claude/skill-management/auditing-skills/SKILL.md")` (LIBRARY)                   | Compliance contract validation                                     |
| **fixing-skills**                     | `Read(".claude/skill-library/claude/skill-management/fixing-skills/SKILL.md")` (LIBRARY)                     | Automated compliance remediation                                   |
| **deleting-skills**                   | `Read(".claude/skill-library/claude/skill-management/deleting-skills/SKILL.md")` (LIBRARY)                   | Safe skill deletion with reference cleanup                         |
| **renaming-skills**                   | `Read(".claude/skill-library/claude/skill-management/renaming-skills/SKILL.md")` (LIBRARY)                   | Safe skill renaming with reference updates                         |
| **migrating-skills**                  | `Read(".claude/skill-library/claude/skill-management/migrating-skills/SKILL.md")` (LIBRARY)                  | Move skills between core and library                               |
| **searching-skills**                  | `Read(".claude/skill-library/claude/skill-management/searching-skills/SKILL.md")` (LIBRARY)                  | Dual-location skill discovery                                      |
| **listing-skills**                    | `Read(".claude/skill-library/claude/skill-management/listing-skills/SKILL.md")` (LIBRARY)                    | Display all skills with locations                                  |
| **processing-large-skills**           | `Read(".claude/skill-library/claude/skill-management/processing-large-skills/SKILL.md")` (LIBRARY)           | Side-by-side skill comparison with symmetry analysis               |
| **syncing-gateways**                  | `Read(".claude/skill-library/claude/skill-management/syncing-gateways/SKILL.md")` (LIBRARY)                  | Validate gateway consistency                                       |
| `orchestrating-research` (LIBRARY)    | `Read(".claude/skill-library/research/orchestrating-research/SKILL.md")`                                     | Parallel research orchestration with intent expansion              |
| **pressure-testing-skill-content**    | `Read(".claude/skill-library/claude/skill-management/pressure-testing-skill-content/SKILL.md")` (LIBRARY)    | Meta-testing skills with pressure scenarios                        |
| **closing-rationalization-loopholes** | `Read(".claude/skill-library/claude/skill-management/closing-rationalization-loopholes/SKILL.md")` (LIBRARY) | TDD methodology for fixing loopholes found during pressure testing |
| **using-skills**                      | `skill: "using-skills"` (CORE)                                                                               | Navigator/librarian for skill discovery                            |
| **developing-with-tdd**               | `skill: "developing-with-tdd"` (CORE)                                                                        | TDD methodology and best practices                                 |
| **debugging-systematically**          | `skill: "debugging-systematically"` (CORE)                                                                   | When skills fail in production                                     |
| **verifying-before-completion**       | `skill: "verifying-before-completion"` (CORE)                                                                | Final validation checklist                                         |

## Changelog

Changelogs are now stored in `.history/CHANGELOG` to enable version control (previous location `.local/changelog` was gitignored).

For historical changes, see `.history/CHANGELOG` in each skill directory.
