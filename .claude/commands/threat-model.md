---
description: Multi-phase threat modeling with parallel agents, human checkpoints, and structured outputs (MD + JSON + SARIF)
argument-hint: [scope]
allowed-tools: Skill, AskUserQuestion
skills: threat-modeling-orchestrator
---

# Threat Model

**Scope:** $1 (optional - orchestrator will prompt for scope if not provided)

## Action

**ACTION:** Invoke the `threat-modeling-orchestrator` skill.

**Arguments:**
- `scope`: $1 (Optional - can be path, "full", or "incremental:ref")

**Output:** Display the tool output verbatim.

## Error Handling

If skill returns error:
  Display the error message verbatim.
  Do not attempt workarounds.
