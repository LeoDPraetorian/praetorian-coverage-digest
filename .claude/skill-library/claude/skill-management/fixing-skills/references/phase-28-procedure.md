# Phase 28 Fix Procedure

**When detected:** Missing or incomplete Integration section

## Fix Procedure

### 1. Analyze skill content

Find all skill references:

- `skill: "X"` invocations
- `Read(".../X/SKILL.md")` invocations
- Prose references to skills

### 2. Determine Called By

Search for what invokes this skill:

```bash
# Search for skills that reference this skill
grep -r "skill-name" .claude/skills/ .claude/skill-library/ .claude/commands/ --include="*.md"
```

### 3. Determine Requires

Find prerequisites:

- Look for "MUST invoke X first" patterns
- Look for "REQUIRED SUB-SKILL" directives
- Identify skills invoked at start (Phase 0, Step 0)

### 4. Determine Calls

Find invoked skills:

- `skill: "X"` → Calls section
- `Read(".../X/SKILL.md")` → Calls section
- Note which phase/step invokes each

### 5. Determine Pairs With

Find conditional relationships:

- "If X then invoke Y" patterns
- Optional complementary skills

### 6. Generate Integration section

```markdown
## Integration

### Called By

[Results from step 2]

### Requires (invoke before starting)

| Skill                 | When | Purpose |
| --------------------- | ---- | ------- |
| [Results from step 3] |

### Calls (during execution)

| Skill                 | Phase/Step | Purpose |
| --------------------- | ---------- | ------- |
| [Results from step 4] |

### Pairs With (conditional)

| Skill                 | Trigger | Purpose |
| --------------------- | ------- | ------- |
| [Results from step 5] |
```

### 7. Insert Integration section

- If "Related Skills" exists: Insert Integration BEFORE it
- If no "Related Skills": Insert before "References" or at end
- Optionally consolidate/remove "Related Skills" if redundant

## Migration from Related Skills

If skill has "## Related Skills" but no "## Integration":

1. Generate Integration section from analysis
2. Insert Integration section
3. If Related Skills is now redundant (all info in Integration), remove it
4. If Related Skills has additional info, keep it below Integration

## See Also

- [Phase 28 details](.claude/skill-library/claude/skill-management/auditing-skills/references/phase-details.md#phase-28-integration-section)
