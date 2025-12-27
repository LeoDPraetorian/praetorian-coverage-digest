# Agent Fix Workflow

**Interactive remediation with auto-fixes and manual guidance.**

⚠️ **As of December 2024, agent fixing uses instruction-based workflow with interactive user selection.**

---

## Overview

Fixing remediates issues found by audit. It categorizes issues as auto-fixable (deterministic) or manual (needs user input), then applies fixes with verification.

## How to Fix an Agent

**Route to the fixing-agents skill:**

```
Read: .claude/skill-library/claude/agent-management/fixing-agents/SKILL.md
```

The `fixing-agents` skill provides the complete workflow.

---

## What the Workflow Provides

### Interactive Remediation

1. **Audit** - Run auditing-agents to get issues
2. **Categorize** - Auto-fixable vs needs user input
3. **Present options** - Via AskUserQuestion
4. **Apply fixes** - With Edit tool
5. **Re-audit** - Verify fixes worked
6. **Report** - Show results

### Fix Categories

| Issue                      | Type   | Example                                   |
| -------------------------- | ------ | ----------------------------------------- |
| Block scalar (`\|` or `>`) | AUTO   | Convert to single-line with `\n` escapes  |
| Name mismatch              | AUTO   | Update frontmatter name to match filename |
| Missing description        | MANUAL | Ask user for description content          |
| Empty description          | MANUAL | Ask user for description content          |

---

## Why Instruction-Based?

Fixing requires interactive capabilities:

- **Reading agent files** - To understand context
- **Dynamic categorization** - Auto vs manual based on issue type
- **Interactive selection** - AskUserQuestion for user choices
- **Edit tool precision** - Surgical fixes with verification
- **Feedback loop** - Audit → fix → re-audit cycle

---

## Time Estimate

- **Auto-fixes only:** 2-3 minutes
- **Manual fixes included:** 5-10 minutes (depends on description complexity)

---

## Workflow Integration

Fixing is typically triggered after audit:

```
Audit → Reports issues
  ↓
Fix → Use skill: "fixing-agents"
  ↓
Re-audit → Verify fixes worked
```

---

## Prerequisites

None - the fixing-agents skill handles all setup internally.

---

## Documentation

**Full workflow details:**
`.claude/skill-library/claude/agent-management/fixing-agents/SKILL.md`

**Related references:**

- [Audit Workflow](audit-workflow.md) - Issue detection
- [Discovery Testing](discovery-testing.md) - Manual verification after fixes

---

## Historical Note: CLI Workflow (ARCHIVED)

The previous CLI-based fixing was deprecated in December 2024 - it couldn't support interactive user selection or dynamic categorization of fix types.
