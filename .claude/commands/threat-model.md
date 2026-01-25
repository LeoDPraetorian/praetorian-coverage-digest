---
description: Use when threat modeling a codebase or system - multi-phase with parallel agents and structured outputs
argument-hint: [scope]
allowed-tools: Skill, AskUserQuestion
---

# Threat Model

**Scope:** $1 (optional - orchestrator will prompt for scope if not provided)

## Action

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
```

Then read the skill file:

```bash
Read: $ROOT/.claude/skill-library/security/threat-modeling-orchestrator/SKILL.md
```

**Arguments:**

- `scope`: $1 (Optional - can be path, "full", or "incremental:ref")

**Output:** Display the tool output verbatim.

## Error Handling

If skill returns error:
Display the error message verbatim.
Do not attempt workarounds.
