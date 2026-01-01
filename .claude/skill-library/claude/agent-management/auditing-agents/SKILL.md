---
name: auditing-agents
description: Use when auditing agents for compliance - validates critical issues (Phase 0 CLI) plus 18 manual quality checks. Target <120 lines.
allowed-tools: Bash, Read, TodoWrite, AskUserQuestion
---

# Auditing Agents

**Critical validation + quality checks before committing or deploying agents.**

> **MANDATORY**: You MUST use TodoWrite to track audit progress for comprehensive audits.

---

## Quick Reference

| Phase    | Check                    | Handler | Time     |
| -------- | ------------------------ | ------- | -------- |
| **0**    | Critical (block scalars) | CLI     | 30 sec   |
| **1-18** | Quality (manual checks)  | Claude  | 5-10 min |

**Phase 0 checks (CLI)**:

- Block scalars (`|` or `>`)
- Name mismatches
- Missing/empty descriptions

**Phases 1-18 details**: See [workflow-manual-checks.md](references/workflow-manual-checks.md)

---

## When to Use

- After editing agent file
- Before committing changes
- Debugging discovery issues
- As part of create/update workflows

---

## How to Use

**Step 0: Navigate to repo root** (mandatory)

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"
```

**Step 1: Run Phase 0 CLI**

```bash
cd .claude && npm run agent:audit -- {agent-name}
```

**Expected**: Exit code 0 (no critical issues)

**Step 2: Run Manual Checks**

See [workflow-manual-checks.md](references/workflow-manual-checks.md) for Phases 1-18:

- Phase 1: PermissionMode alignment
- Phase 2: Frontmatter organization
- Phase 3: Tool validation
- Phase 4: Gateway enforcement
- Phase 9: Skill Loading Protocol (Step 1/2/3 structure, two-tier system, Core Responsibilities, output format)
- Phase 10-18: Additional quality checks

**Step 3: Consolidate Results**

- Phase 0: Pass/Fail (exit code)
- Phases 1-18: PASS/WARNING/ERROR/INFO for each

---

## Post-Audit Actions

**If issues found**, use AskUserQuestion:

```
Question: Audit found fixable issues. How to proceed?
Header: Next steps
Options:
  - Run full fixing workflow (Recommended)
  - Apply deterministic fixes only
  - Show fix categorization
  - Skip - I'll fix manually
```

**Routing**:

- Full workflow → `Read(".claude/skill-library/claude/agent-management/fixing-agents/SKILL.md")`
- Deterministic only → See fixing-agents for Edit patterns
- Show categorization → `Read("fixing-agents/references/phase-categorization.md")`

---

## Common Issues

**Agent not found**: Navigate to repo root first (Step 0)

**Phase 0 fails**: See [common-issues.md](references/common-issues.md) for fixes:

- Issue 1: Block scalar pipe
- Issue 2: Block scalar folded
- Issue 3: Name mismatch
- Issue 4-5: Missing/empty description

**Manual phases unclear**: See [workflow-manual-checks.md](references/workflow-manual-checks.md)

---

## Related Skills

- `fixing-agents` - Fix issues found
- `creating-agents` - Creation workflow (includes audit)
- `updating-agents` - Update workflow (includes audit)
- `managing-agents` - Router

**References**:

- [workflow-manual-checks.md](references/workflow-manual-checks.md) - Phases 1-18 procedures
- [common-issues.md](references/common-issues.md) - Phase 0 issues + fixes
- [extended-issues.md](references/extended-issues.md) - Quality warnings
- [phase-categorization.md](../fixing-agents/references/phase-categorization.md) - Fix routing
