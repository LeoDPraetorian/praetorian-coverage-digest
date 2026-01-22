# Machine-Readable Audit Output Format

## Purpose

Provides structured JSON summary for downstream skill consumption (e.g., fixing-skills).

## Required After Prose Findings

After reporting prose findings, output a structured JSON summary:

```markdown
## Machine-Readable Summary

\`\`\`json
{
"skill_name": "example-skill",
"skill_path": ".claude/skill-library/category/example-skill",
"audit_timestamp": "2026-01-12T15:30:00Z",
"summary": {
"critical": 2,
"warning": 3,
"info": 1
},
"phase_26_stubs": [
{
"file": "references/workflow.md",
"reason": "12 lines, mostly headers",
"severity": "CRITICAL"
},
{
"file": "references/api-reference.md",
"reason": "Empty file (0 bytes)",
"severity": "CRITICAL"
}
],
"phases_failed": [3, 14, 26],
"phases_passed": [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 24, 25, 28]
}
\`\`\`
```

## Required Fields

- `skill_name`: Skill being audited
- `skill_path`: Full path for fixing-skills to locate files
- `phase_26_stubs`: Array of stub files with paths and reasons (CRITICAL for fixing-skills)
- `phases_failed`: List of failed phase numbers
- `summary`: Count by severity

## Why Structured Output Matters

- fixing-skills can programmatically extract stub file list
- No text parsing required for TodoWrite enumeration
- Enables future automation and reporting tools

## Downstream Consumer Contract

auditing-skills output is consumed by fixing-skills. This contract defines the expected format:

**Phase 26 Contract:**

| Field           | Format                                           | Example                                           | Consumer                         |
| --------------- | ------------------------------------------------ | ------------------------------------------------- | -------------------------------- |
| Finding header  | `[CRITICAL] Phase 26: Genuine stub - {filename}` | `[CRITICAL] Phase 26: Genuine stub - workflow.md` | fixing-skills parses filename    |
| Location        | `Location: references/{filename}`                | `Location: references/workflow.md`                | fixing-skills uses for file ops  |
| JSON stub array | `phase_26_stubs[].file`                          | `"references/workflow.md"`                        | fixing-skills iterates TodoWrite |

**fixing-skills expectations:**

1. Each stub file appears as separate finding (not aggregated)
2. Location field contains relative path from skill root
3. JSON summary includes `phase_26_stubs` array with all stub files
4. Stub file paths are consistent between prose and JSON

**Breaking changes:**
If auditing-skills output format changes, fixing-skills Phase 26 procedure must be updated to match.
