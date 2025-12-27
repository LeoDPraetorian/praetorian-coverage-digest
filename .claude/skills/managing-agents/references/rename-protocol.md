# Agent Rename Protocol

**Safe agent renaming with comprehensive reference updates.**

⚠️ **As of December 2024, agent renaming uses instruction-based workflow with integrity verification.**

---

## Overview

Renaming safely updates an agent's name AND all references across the codebase. It validates source/target, tracks references, and verifies integrity.

## How to Rename an Agent

**Route to the renaming-agents skill:**

```
Read: .claude/skill-library/claude/agent-management/renaming-agents/SKILL.md
```

The `renaming-agents` skill provides the complete workflow.

---

## What the Workflow Provides

### 7-Step Safe Rename

1. **Validate old name** - Ensure agent exists
2. **Validate new name** - Ensure target is available
3. **Find references** - Search commands, skills, agents
4. **User confirmation** - Review impact before proceeding
5. **Update frontmatter** - Change name field
6. **Rename file** - Update agent filename
7. **Update references** - Fix all cross-references

### What It Updates

| Location     | What Changes                       |
| ------------ | ---------------------------------- |
| Agent file   | Frontmatter `name:` field          |
| Filesystem   | Agent filename                     |
| Commands     | Examples, usage instructions       |
| Skills       | Workflow integrations, delegations |
| Other agents | Recommendations, escalations       |

---

## Safety Features

- **Validation** - Checks source exists and target available
- **Reference tracking** - Finds ALL references (Grep across codebase)
- **User confirmation** - Shows impact before changes
- **Atomic operation** - All updates succeed or all rollback
- **Integrity verification** - Confirms no broken references remain

---

## Why Instruction-Based?

Renaming requires comprehensive operations:

- **Cross-codebase search** - Grep for all references
- **Multiple file updates** - Edit tool for each file
- **Validation** - Before and after checks
- **User confirmation** - AskUserQuestion for safety
- **Verification** - Post-rename integrity checks

---

## Time Estimate

- **Typical:** 2-5 minutes (depends on number of references)

---

## Prerequisites

None - the renaming-agents skill handles all setup internally.

---

## Documentation

**Full workflow details:**
`.claude/skill-library/claude/agent-management/renaming-agents/SKILL.md`

**Related references:**

- [Audit Workflow](audit-workflow.md) - Verify after rename
- [Discovery Testing](discovery-testing.md) - Test renamed agent

---

## Historical Note: CLI Workflow (ARCHIVED)

The previous CLI-based renaming was deprecated in December 2024 - it couldn't support comprehensive reference tracking or interactive user confirmation.
