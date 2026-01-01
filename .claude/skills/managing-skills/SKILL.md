---
name: managing-skills
description: Use when managing skills (create, update, audit, fix, delete, rename, migrate, search, list, sync) - routes to specialized library skills
allowed-tools: Read, Bash, Grep, Glob, TodoWrite, Skill, AskUserQuestion
---

# Skill Lifecycle Manager

**Complete skill lifecycle with TDD enforcement, 22-phase structural audit + semantic review, and dual-location search.**

## Quick Reference

| Operation         | Delegated To         | CLI Location              | Time      |
| ----------------- | -------------------- | ------------------------- | --------- |
| **Create**        | `creating-skills`    | Instruction-based         | 15-30 min |
| **Update**        | `updating-skills`    | Instruction-based         | 10-20 min |
| **Delete**        | `deleting-skills`    | Instruction-based         | 10-15 min |
| **Audit**         | `auditing-skills`    | `auditing-skills/scripts` | 2-5 min   |
| **Fix**           | `fixing-skills`      | `fixing-skills/scripts`   | 5-15 min  |
| **Search**        | `searching-skills`   | Instruction-based         | 1-2 min   |
| **List**          | `listing-skills`     | Instruction-based         | 1 min     |
| **Research**      | `researching-skills` | Instruction-based         | 5-10 min  |
| **Rename**        | `renaming-skills`    | Instruction-based         | 5-10 min  |
| **Migrate**       | `migrating-skills`   | Instruction-based         | 5-10 min  |
| **Sync Gateways** | `syncing-gateways`   | Instruction-based         | 10-20 min |

**For detailed operation workflows, see:** [references/operations.md](references/operations.md)

**For CLI usage instructions, see:** [references/cli-usage.md](references/cli-usage.md)

## Understanding This Skill (Two-Tier System)

**How you got here**: You invoked this skill via Skill tool:

```
skill: "managing-skills"
```

**What this skill provides**: A routing table to specialized skill management operations, some core (accessible via Skill tool) and others library (accessible via Read tool).

**Critical: Two-Tier Skill Access**

| Skill                | Location                                      | How to Invoke                                                                               |
| -------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **creating-skills**  | `.claude/skill-library/.../creating-skills/`  | `Read(".claude/skill-library/claude/skill-management/creating-skills/SKILL.md")` (LIBRARY)  |
| **updating-skills**  | `.claude/skill-library/.../updating-skills/`  | `Read(".claude/skill-library/claude/skill-management/updating-skills/SKILL.md")` (LIBRARY)  |
| **auditing-skills**  | `.claude/skill-library/.../auditing-skills/`  | `Read(".claude/skill-library/claude/skill-management/auditing-skills/SKILL.md")` (LIBRARY)  |
| **fixing-skills**    | `.claude/skill-library/.../fixing-skills/`    | `Read(".claude/skill-library/claude/skill-management/fixing-skills/SKILL.md")` (LIBRARY)    |
| **deleting-skills**  | `.claude/skill-library/.../deleting-skills/`  | `Read(".claude/skill-library/claude/skill-management/deleting-skills/SKILL.md")` (LIBRARY)  |
| **renaming-skills**  | `.claude/skill-library/.../renaming-skills/`  | `Read(".claude/skill-library/claude/skill-management/renaming-skills/SKILL.md")` (LIBRARY)  |
| **migrating-skills** | `.claude/skill-library/.../migrating-skills/` | `Read(".claude/skill-library/claude/skill-management/migrating-skills/SKILL.md")` (LIBRARY) |
| **searching-skills** | `.claude/skill-library/.../searching-skills/` | `Read(".claude/skill-library/claude/skill-management/searching-skills/SKILL.md")` (LIBRARY) |
| **listing-skills**   | `.claude/skill-library/.../listing-skills/`   | `Read(".claude/skill-library/claude/skill-management/listing-skills/SKILL.md")` (LIBRARY)   |
| **syncing-gateways** | `.claude/skill-library/.../syncing-gateways/` | `Read(".claude/skill-library/claude/skill-management/syncing-gateways/SKILL.md")` (LIBRARY) |

<IMPORTANT>
Library skills listed above are NOT available via Skill tool.
You MUST use Read tool to load them.

❌ WRONG: `skill: "updating-skills"` ← Will fail, not a core skill
✅ RIGHT: `Read(".claude/skill-library/claude/skill-management/updating-skills/SKILL.md")`
</IMPORTANT>

## Router Architecture

**managing-skills is a pure router.** It has NO scripts of its own and delegates all operations to specialized library skills.

### Delegation Map

| When user says...                 | Delegate to...       | Implementation                                |
| --------------------------------- | -------------------- | --------------------------------------------- |
| "create a skill"                  | `creating-skills`    | Instruction-based workflow                    |
| "create gateway-X --type gateway" | `creating-skills`    | Uses gateway template                         |
| "update X skill"                  | `updating-skills`    | Instruction-based TDD workflow                |
| "delete X skill"                  | `deleting-skills`    | Instruction-based workflow                    |
| "audit X skill"                   | `auditing-skills`    | CLI in `auditing-skills/scripts`              |
| "audit gateway-X"                 | `auditing-skills`    | All 22 phases (includes gateway phases 17-20) |
| "fix X skill"                     | `fixing-skills`      | CLI in `fixing-skills/scripts`                |
| "fix gateway-X --phase N"         | `fixing-skills`      | Gateway-specific fixes                        |
| "search for skills"               | `searching-skills`   | Instruction-based (manual grep/find)          |
| "list all skills"                 | `listing-skills`     | Instruction-based                             |
| "research X"                      | `researching-skills` | Instruction-based workflow                    |
| "rename X to Y"                   | `renaming-skills`    | Instruction-based                             |
| "migrate X to library"            | `migrating-skills`   | Instruction-based                             |
| "sync gateways"                   | `syncing-gateways`   | Instruction-based                             |

### CLI Ownership

Scripts live in the library skill that owns the functionality:

| Package                    | Location                                                        | Commands          |
| -------------------------- | --------------------------------------------------------------- | ----------------- |
| `@chariot/auditing-skills` | `skill-library/claude/skill-management/auditing-skills/scripts` | `audit`, `search` |
| `@chariot/fixing-skills`   | `skill-library/claude/skill-management/fixing-skills/scripts`   | `fix`             |

**Shared library** (audit-engine, phases, utilities):

- Located in `auditing-skills/scripts/src/lib/`
- Used by fixing-skills and updating-skills via relative imports

## Tool Usage

**Router tools** (used by managing-skills directly):

- **Read** - Load delegated library skills
- **Bash** - Execute CLI commands
- **Grep/Glob** - Discover and validate skills
- **TodoWrite** - Track multi-phase workflows (MANDATORY)
- **Skill** - Invoke core skills (e.g., `skill: "using-skills"`)
- **AskUserQuestion** - Interactive confirmations

**Delegated tools** (used by library skills, not the router):

- Write, Edit - Content modifications (used by creating-skills, updating-skills, fixing-skills)
- Task - Agent orchestration (used by researching-skills for parallel research)

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

This skill routes to 10 specialized operations. Each operation has comprehensive workflows, CLI commands, and safety protocols.

**For complete operation details, see:** [references/operations.md](references/operations.md)

**Operation summary:**

- **Create** - Instruction-driven skill creation via `creating-skills`
- **Update** - Instruction-driven TDD update workflow
- **Delete** - Safe deletion with reference cleanup (7-phase protocol)
- **Audit** - 22 structural phases + semantic review by Claude
- **Fix** - Three modes (auto-apply, suggest, apply) for compliance
- **Rename** - Safe renaming with reference updates (7-step protocol)
- **Migrate** - Move between core and library locations
- **Search** - Dual-location discovery with scoring algorithm
- **List** - Display all skills (both core and library)
- **Research** - Codebase, Context7, and web research for skill creation
- **Sync Gateways** - Validate gateway-library consistency

## Gateway Management

Gateway skills route agents from core to library in the two-tier system. Specialized operations support gateway creation, auditing (phases 17-20), fixing, and synchronization.

**For complete gateway management commands and workflows, see:** [references/gateway-management.md](references/gateway-management.md)

## Progressive Disclosure

**Quick Start (15 min):**

- Create with TDD (RED-GREEN-REFACTOR)
- Audit for compliance
- Fix deterministic issues

**Comprehensive (60 min):**

- Full TDD cycle with pressure testing
- Progressive disclosure organization
- Compliance validation (all 22 structural phases + semantic review)
- Reference updates and migration

**Deep Dives (references/):**

- [Operations](references/operations.md) - Complete workflow for skill operations
- [CLI usage](references/cli-usage.md) - Command examples and troubleshooting
- [TDD methodology](references/tdd-methodology.md)
- [Progressive disclosure](references/progressive-disclosure.md)
- [Audit phases + semantic review](references/audit-phases.md)
- [Rename protocol](references/rename-protocol.md)
- [Migration workflow](references/migrate-workflow.md)
- [Gateway management](references/gateway-management.md)
- [Table formatting](references/table-formatting.md) - Prettier-based table validation (cross-cutting)

## Migration from Old Skills

This skill consolidates:

- `claude-skill-write` → use `creating-skills` skill or `npm run update`
- `claude-skill-compliance` → use `npm run audit` or `npm run fix`
- `claude-skill-search` → use `npm run search` (NOW includes library)

**Command integration:** `/skill-manager` command updated to delegate to this skill

## Key Principles

1. **TDD Always** - Cannot create/update without failing test first
2. **Hybrid Audit** - 22-phase structural audit + Claude semantic review
3. **Progressive Disclosure** - Lean SKILL.md + detailed references/
4. **Router Pattern** - `/skill-manager` command delegates here
5. **Instruction-Driven Creation** - Create via `creating-skills` skill (no TypeScript CLI)
6. **Dual-Location Search** - Searches both core and library
7. **TodoWrite Tracking** - You MUST use TodoWrite before starting to track all workflow steps
8. **Research Delegation** - Use `researching-skills` for content population

## Related Skills

| Skill                             | Access Method                                                                                 | Purpose                                              |
| --------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **creating-skills**               | `Read(".claude/skill-library/claude/skill-management/creating-skills/SKILL.md")` (LIBRARY)    | Instruction-driven skill creation workflow           |
| **updating-skills**               | `Read(".claude/skill-library/claude/skill-management/updating-skills/SKILL.md")` (LIBRARY)    | Test-guarded skill updates with TDD                  |
| **auditing-skills**               | `Read(".claude/skill-library/claude/skill-management/auditing-skills/SKILL.md")` (LIBRARY)    | 22-phase structural validation                       |
| **fixing-skills**                 | `Read(".claude/skill-library/claude/skill-management/fixing-skills/SKILL.md")` (LIBRARY)      | Automated compliance remediation                     |
| **deleting-skills**               | `Read(".claude/skill-library/claude/skill-management/deleting-skills/SKILL.md")` (LIBRARY)    | Safe skill deletion with reference cleanup           |
| **renaming-skills**               | `Read(".claude/skill-library/claude/skill-management/renaming-skills/SKILL.md")` (LIBRARY)    | Safe skill renaming with reference updates           |
| **migrating-skills**              | `Read(".claude/skill-library/claude/skill-management/migrating-skills/SKILL.md")` (LIBRARY)   | Move skills between core and library                 |
| **searching-skills**              | `Read(".claude/skill-library/claude/skill-management/searching-skills/SKILL.md")` (LIBRARY)   | Dual-location skill discovery                        |
| **listing-skills**                | `Read(".claude/skill-library/claude/skill-management/listing-skills/SKILL.md")` (LIBRARY)     | Display all skills with locations                    |
| **syncing-gateways**              | `Read(".claude/skill-library/claude/skill-management/syncing-gateways/SKILL.md")` (LIBRARY)   | Validate gateway consistency                         |
| **researching-skills**            | `skill: "researching-skills"` (CORE)                                                          | Interactive research orchestrator for skill creation |
| **testing-skills-with-subagents** | `skill: "testing-skills-with-subagents"` (CORE)                                               | Meta-testing skills with pressure scenarios          |
| **using-skills**                  | `skill: "using-skills"` (CORE)                                                                | Navigator/librarian for skill discovery              |
| **developing-with-tdd**           | `skill: "developing-with-tdd"` (CORE)                                                         | TDD methodology and best practices                   |
| **debugging-systematically**      | `skill: "debugging-systematically"` (CORE)                                                    | When skills fail in production                       |
| **verifying-before-completion**   | `skill: "verifying-before-completion"` (CORE)                                                 | Final validation checklist                           |

## Changelog

Changelogs are now stored in `.history/CHANGELOG` to enable version control (previous location `.local/changelog` was gitignored).

For historical changes, see `.history/CHANGELOG` in each skill directory.
