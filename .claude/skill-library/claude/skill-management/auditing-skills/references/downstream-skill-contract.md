# Downstream Skill Contract

auditing-skills output is consumed by fixing-skills. This contract defines the expected format.

## Phase 26 Contract

| Field | Format | Example | Consumer |
|-------|--------|---------|----------|
| Finding header | `[CRITICAL] Phase 26: Genuine stub - {filename}` | `[CRITICAL] Phase 26: Genuine stub - workflow.md` | fixing-skills parses filename |
| Location | `Location: references/{filename}` | `Location: references/workflow.md` | fixing-skills uses for file operations |
| JSON stub array | `phase_26_stubs[].file` | `"references/workflow.md"` | fixing-skills iterates for TodoWrite |

## fixing-skills Expectations

1. Each stub file appears as separate finding (not aggregated)
2. Location field contains relative path from skill root
3. JSON summary includes `phase_26_stubs` array with all stub files
4. Stub file paths are consistent between prose and JSON

## Breaking Changes

If auditing-skills output format changes, fixing-skills Phase 26 procedure must be updated to match.

## Example Output Format

### Prose Format (Required)

```markdown
[CRITICAL] Phase 26: Genuine stub - workflow.md
Location: references/workflow.md
Content: 12 lines, mostly headers, no substantive content
Recommendation: Populate via orchestrating-research
```

### JSON Format (Required)

```json
{
  "phase_26_stubs": [
    {
      "file": "references/workflow.md",
      "reason": "12 lines, mostly headers",
      "severity": "CRITICAL"
    }
  ]
}
```

Both formats must be present and consistent for downstream consumption.
