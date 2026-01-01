---
name: fixing-agents
description: Use when fixing agent compliance issues - Claude applies all fixes using Edit tool with explicit patterns for each issue type (block scalar, name mismatch, field order, tables). No CLI dependency.
allowed-tools: Read, Edit, Bash, AskUserQuestion, TodoWrite, Skill
---

# Fixing Agents

**Claude-driven compliance remediation using Edit tool and explicit fix patterns.**

> **MANDATORY**: You MUST use TodoWrite to track fix progress when handling multiple issues.

---

## Quick Reference

| Step               | Purpose                   | Time     |
| ------------------ | ------------------------- | -------- |
| **1. Audit**       | Get issues list           | 1 min    |
| **2. Backup**      | Protect against mistakes  | 1 min    |
| **3. Categorize**  | Route fixes by complexity | 2 min    |
| **4. Apply Fixes** | Edit tool with patterns   | 5-15 min |
| **5. Re-Audit**    | Verify all fixed          | 1 min    |
| **6. Changelog**   | Document changes          | 2 min    |

**Total**: 12-22 minutes

**For detailed procedures:** See [references/fix-procedures.md](references/fix-procedures.md)

---

## When to Use

- After `auditing-agents` reports failures
- Before committing agent changes
- As part of create/update workflows

**NOT for:** Creating agents, updating logic, testing behavior

---

## Fix Categories

| Category          | Phases                 | Handler                  | Examples                                            |
| ----------------- | ---------------------- | ------------------------ | --------------------------------------------------- |
| **Deterministic** | 0, 2, 16               | Claude + Edit            | Block scalar, name mismatch, field order            |
| **Semantic**      | 1, 3, 6, 9, 14, 15     | Claude reasoning         | PermissionMode, tools, Skill Loading Protocol       |
| **Interactive**   | 4-5, 7-8, 10-13, 17-18 | Claude + AskUserQuestion | Gateway choice, phantom skills, content duplication |

**See:** [Phase Categorization](references/phase-categorization.md) for complete mapping

---

## Workflow

**Step 0: Navigate to repo root** (mandatory)

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"
```

**Step 1: Run audit** → `skill: "auditing-agents"`

**Step 2: Create backup** → See [Backup Strategy](../../../../skills/managing-agents/references/patterns/backup-strategy.md)

**Step 3: Apply fixes** → Use Edit tool with patterns below

**Step 4: Re-audit** → Verify all issues resolved

**Step 5: Changelog** → Document fixes

---

## Edit Patterns

| Issue                   | Edit Pattern                                                                  |
| ----------------------- | ----------------------------------------------------------------------------- |
| Block scalar            | `description: \|...` → `description: Use when...`                             |
| Name mismatch           | `name: wrong` → `name: {filename}`                                            |
| Field order             | Reorder: name, description, type, permissionMode, tools, skills, model, color |
| Table format            | `npx prettier --write --parser markdown {file}`                               |
| Core Responsibilities   | Add 2-4 subsections defining agent duties (see references)                    |
| Skill Loading Protocol  | Add Step 1/2/3 structure with two-tier intro (see references)                 |
| Output Format           | Add `skills_invoked` + `library_skills_read` fields (see references)         |

**Complete patterns:** [references/fix-procedures.md](references/fix-procedures.md)

---

## Common Issues

**Edit fails (old_string not found):**

- Re-read file (content may have changed)
- Verify exact string match

**Re-audit still failing:**

- Check remaining issues by phase
- Categorize and re-apply fixes
- May need interactive fixes (use AskUserQuestion)

---

## Related Skills

- `auditing-agents` - Identify issues
- `creating-agents` - Creation workflow
- `updating-agents` - Update workflow
- `managing-agents` - Router

**References:**

- [fix-procedures.md](references/fix-procedures.md) - Detailed procedures
- [phase-categorization.md](references/phase-categorization.md) - Phase mapping
- [claude-automated-fixes.md](references/claude-automated-fixes.md) - Semantic fixes
- [hybrid-human-fixes.md](references/hybrid-human-fixes.md) - Interactive fixes
