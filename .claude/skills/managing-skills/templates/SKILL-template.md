---
name: skill-name-here
description: Use when [specific triggers] - [what skill does]
allowed-tools: Read, Write, Bash
---

# Skill Name Here

## Overview

[Skill purpose and core principle]

## Quick Reference

| Pattern     | Solution     | Example     |
| ----------- | ------------ | ----------- |
| [Pattern 1] | [Solution 1] | [Example 1] |

## When to Use

Use this skill when:

- [Scenario 1]
- [Scenario 2]
- [Scenario 3]

## Implementation

### Step 1: [Action]

[Instructions]

### Step 2: [Action]

[Instructions]

## Examples

See [examples/example-1.md](examples/example-1.md) for complete workflow.

## Integration

### Called By

- [What invokes this skill - commands, agents, or other skills]
- Example: `/command-name` - Command entry point
- Example: `parent-skill-name` (Phase N)
- Example: `agent-name` agent (Step N)

### Requires (invoke before starting)

| Skill        | When  | Purpose                          |
| ------------ | ----- | -------------------------------- |
| [skill-name] | Start | [Why this skill is needed first] |

_Use "None - standalone skill" if no prerequisites_

### Calls (during execution)

| Skill        | Phase/Step | Purpose                |
| ------------ | ---------- | ---------------------- |
| [skill-name] | Phase N    | [What this skill does] |

_Use "None - terminal skill" if skill doesn't invoke others_

### Pairs With (conditional)

| Skill        | Trigger          | Purpose      |
| ------------ | ---------------- | ------------ |
| [skill-name] | [When condition] | [Why paired] |

_Use "None" if no conditional pairings_

## References

- [references/detailed-guide.md](references/detailed-guide.md) - Deep dive into patterns
