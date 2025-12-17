---
description: Agent management - create, update, audit, fix, rename, test, search, or list agents
argument-hint: <create|update|audit|fix|rename|test|search|list> [agent-name] [options]
model: sonnet
allowed-tools: Skill, Read, AskUserQuestion
skills: creating-agents, updating-agents, auditing-agents, fixing-agents, renaming-agents, testing-agent-skills, searching-agents, listing-agents
---

# Agent Management

**Routing by subcommand:**

| Subcommand | Skill to Invoke |
|------------|-----------------|
| `create`   | `creating-agents` (instruction-based TDD workflow) |
| `update`   | `updating-agents` (instruction-based TDD workflow) |
| `audit`    | `auditing-agents` (instruction-based validation) |
| `fix`      | `fixing-agents` (instruction-based remediation) |
| `rename`   | `renaming-agents` (instruction-based safe rename) |
| `test`     | `testing-agent-skills` (behavioral validation) |
| `search`   | `searching-agents` (instruction-based keyword search) |
| `list`     | `listing-agents` (instruction-based comprehensive list) |

---

## For `create` Subcommand

**ACTION:** Read and follow the creating-agents skill
**Path:** `.claude/skill-library/claude/agent-management/creating-agents/SKILL.md`

The `creating-agents` skill guides through:
1. 🔴 RED phase (prove gap exists)
2. Agent type selection (architecture/development/testing/etc.)
3. Template generation with lean principles (<300 lines)
4. Tool allowlist configuration
5. Description syntax enforcement
6. 🟢 GREEN phase (verify agent works)
7. 🔵 REFACTOR phase (pressure test)

**Output:** Follow the skill's interactive workflow.

---

## For `update` Subcommand

**ACTION:** Read and follow the updating-agents skill
**Path:** `.claude/skill-library/claude/agent-management/updating-agents/SKILL.md`

The `updating-agents` skill guides through:
1. 🔴 RED phase (document current failure)
2. Locate agent file
3. Create backup
4. Minimal change (edit only what's needed)
5. Update changelog
6. 🟢 GREEN phase (verify fix works)
7. Compliance checks (audit + line count)
8. 🔵 REFACTOR phase (pressure test if major change)

**Output:** Follow the skill's interactive workflow.

---

## For `audit` Subcommand

**ACTION:** Read and follow the auditing-agents skill
**Path:** `.claude/skill-library/claude/agent-management/auditing-agents/SKILL.md`

The `auditing-agents` skill guides through:
1. Locate agent file
2. Run 8-phase validation:
   - Structural phases (frontmatter, line count)
   - Semantic phases (examples, tool references)
3. Interpret results (pass/warning/failure)
4. Fix workflow guidance
5. Re-audit verification

**Output:** Follow the skill's interactive workflow.

---

## For `fix` Subcommand

**ACTION:** Read and follow the fixing-agents skill
**Path:** `.claude/skill-library/claude/agent-management/fixing-agents/SKILL.md`

The `fixing-agents` skill guides through:
1. Run audit to identify issues
2. Read agent file
3. Categorize fixes (auto vs manual)
4. Present options via AskUserQuestion
5. Apply auto-fixes (structural issues)
6. Guide manual fixes (semantic issues)
7. Re-audit to verify success
8. Report final status

**Output:** Follow the skill's interactive workflow.

---

## For `rename` Subcommand

**ACTION:** Read and follow the renaming-agents skill
**Path:** `.claude/skill-library/claude/agent-management/renaming-agents/SKILL.md`

The `renaming-agents` skill guides through:
1. Validate source agent exists
2. Validate target name available
3. Confirm with user (show impact)
4. Update agent YAML name field
5. Move/rename file
6. Find all references (commands, skills, docs)
7. Update each reference with Edit
8. Verify integrity (no old name remains)
9. Report success with summary

**Output:** Follow the skill's interactive workflow.

---

## For `test` Subcommand

**ACTION:** Read and follow the testing-agent-skills skill
**Path:** `.claude/skill-library/claude/agent-management/testing-agent-skills/SKILL.md`

The `testing-agent-skills` skill guides through:
1. Load pressure scenario templates
2. Spawn test agent with scenario
3. Capture behavioral response
4. Analyze for skill bypass attempts
5. Detect rationalization patterns
6. Report compliance results

**Output:** Follow the skill's interactive workflow.

---

## For `search` Subcommand

**ACTION:** Read and follow the searching-agents skill
**Path:** `.claude/skill-library/claude/agent-management/searching-agents/SKILL.md`

The `searching-agents` skill guides through:
1. Get search query
2. Search agent names and descriptions
3. Score and sort results by relevance
4. Format output with categories and paths

**Output:** Follow the skill's interactive workflow.

---

## For `list` Subcommand

**ACTION:** Read and follow the listing-agents skill
**Path:** `.claude/skill-library/claude/agent-management/listing-agents/SKILL.md`

The `listing-agents` skill guides through:
1. List all agents organized by category
2. Show summary statistics
3. Optional filters (category, compliance status)
4. Display with counts and descriptions

**Output:** Follow the skill's interactive workflow.

**Arguments:**

- `$1` - Subcommand (create, update, audit, fix, rename, test, search, list)
- `$2` - Agent name (required for most subcommands)
- `$3` - Options: `--dry-run`, `--suggest`, `--type`, `--all`

**Critical Rules:**

1. **READ SKILLS:** Use Read tool to load skill content from paths above
2. **FOLLOW WORKFLOW:** Skills contain interactive workflows with AskUserQuestion
3. **DISPLAY OUTPUT:** Display the skill output verbatim
4. **DO NOT BYPASS:** Do not attempt operations yourself or call scripts directly

---

## Quick Reference

| Command                                          | Description               |
| ------------------------------------------------ | ------------------------- |
| `/agent-manager create <name> "<desc>" --type X` | Create agent with TDD     |
| `/agent-manager update <name> "<changes>"`       | Update agent              |
| `/agent-manager audit <name>`                    | Validate single agent     |
| `/agent-manager audit --all`                     | Validate all agents       |
| `/agent-manager fix <name> [--dry-run]`          | Fix issues                |
| `/agent-manager fix <name> --suggest`            | Show fix suggestions      |
| `/agent-manager rename <old> <new>`              | Rename agent              |
| `/agent-manager test <agent> [skill]`            | Test agent behavioral validation |
| `/agent-manager search "<keyword>"`              | Search agents             |
| `/agent-manager list [--type <category>]`        | List agents               |
