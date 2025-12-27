# Agent Output Format

**Single source of truth for standardized agent output structure.**

Referenced by: `creating-agents`, `updating-agents`, `auditing-agents`

---

## Quick Reference

All agents should have standardized output format including `skills_read` array.

---

## Required JSON Structure

```json
{
  "status": "complete|partial|blocked|failed",
  "skills_read": [
    ".claude/skills/verifying-before-completion/SKILL.md",
    ".claude/skills/gateway-frontend/SKILL.md"
  ],
  "summary": "Brief description of what was accomplished",
  "artifacts": ["path/to/created/file.ts", "path/to/modified/file.ts"],
  "next_steps": ["Run tests", "Review changes"]
}
```

---

## Field Definitions

| Field         | Type   | Required | Description                      |
| ------------- | ------ | -------- | -------------------------------- |
| `status`      | string | Yes      | Completion status                |
| `skills_read` | array  | Yes      | Paths to skills that were Read() |
| `summary`     | string | Yes      | Brief description of work done   |
| `artifacts`   | array  | No       | Files created/modified           |
| `next_steps`  | array  | No       | Recommended follow-up actions    |

---

## Status Values

| Status     | Meaning             | When to Use                  |
| ---------- | ------------------- | ---------------------------- |
| `complete` | Task fully finished | All requirements met         |
| `partial`  | Some work done      | Blocked or interrupted       |
| `blocked`  | Cannot proceed      | Missing info or dependencies |
| `failed`   | Task unsuccessful   | Error or impossible          |

---

## skills_read Array

**Purpose**: Verify agent loaded required skills via Read() tool.

**What to include**:

- All Tier 1 skills (universal + gateway)
- Any Tier 2 skills used (todowrite)
- Any Tier 3 skills triggered by task type

**Example**:

```json
"skills_read": [
  ".claude/skills/verifying-before-completion/SKILL.md",
  ".claude/skills/calibrating-time-estimates/SKILL.md",
  ".claude/skills/gateway-frontend/SKILL.md",
  ".claude/skill-library/development/frontend/using-tanstack-query/SKILL.md"
]
```

---

## Template for Agent Body

Add this section to agent body:

```markdown
## Output Format

When task complete, output JSON:

\`\`\`json
{
"status": "complete",
"skills_read": ["list paths to skills you Read()"],
"summary": "What you accomplished",
"artifacts": ["files created/modified"],
"next_steps": ["recommendations"]
}
\`\`\`
```

---

## Verification

Check agent output includes:

1. Valid `status` value
2. `skills_read` array with at least Tier 1 skills
3. Meaningful `summary`

---

## Related

- [Skill Loading Protocol](skill-loading-protocol.md)
- [Agent Compliance Contract](../agent-compliance-contract.md)
