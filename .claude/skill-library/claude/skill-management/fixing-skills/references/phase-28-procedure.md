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

### 5.5 Resolve Library Skill Paths (MANDATORY)

For EACH library skill being added to Integration tables:

1. **Find the skill path:**

```bash
SKILL_NAME="skill-to-reference"
SKILL_PATH=$(find .claude/skill-library -type f -path "*/$SKILL_NAME/SKILL.md" | head -1)
echo "$SKILL_PATH"
```

2. **Include in Purpose column:**
   - Format: `Purpose description - \`Read("$SKILL_PATH")\``

3. **If skill not found:** Flag as broken reference, do not add

### 5.6 Validate Skill References (Part of Phase 28)

For each skill reference being added to Integration section:

```bash
SKILL_NAME="skill-to-check"
if [ -f ".claude/skills/$SKILL_NAME/SKILL.md" ]; then
  echo "CORE: $SKILL_NAME - no annotation needed"
elif find .claude/skill-library -type f -path "*/$SKILL_NAME/SKILL.md" 2>/dev/null | grep -q .; then
  SKILL_PATH=$(find .claude/skill-library -type f -path "*/$SKILL_NAME/SKILL.md" | head -1)
  echo "LIBRARY: $SKILL_NAME - MUST add (LIBRARY) annotation AND path: $SKILL_PATH"
else
  echo "NOT FOUND: $SKILL_NAME - do not add, flag as broken"
fi
```

**In Integration bullet lists:**

- CORE: `skill-name` (CORE) - Purpose
- LIBRARY: `skill-name` (LIBRARY) - Purpose
  - `Read(".claude/skill-library/.../skill-name/SKILL.md")`

### 6. Generate Integration section

```markdown
## Integration

### Called By

- `skill-name` (CORE) - Purpose description
- `skill-name` (LIBRARY) - Purpose
  - `Read('.claude/skill-library/.../skill-name/SKILL.md')`

[Results from step 2]

### Requires (invoke before starting)

- **`skill-name`** (LIBRARY) - When condition
  - Purpose: What this skill provides
  - `Read('.claude/skill-library/.../skill-name/SKILL.md')`

Or: 'None - entry point skill'

[Results from step 3]

### Calls (during execution)

- **`skill-name`** (LIBRARY) - Phase/Step N
  - Purpose: What this skill does
  - `Read('.claude/skill-library/.../skill-name/SKILL.md')`

Or: 'None - terminal skill'

[Results from step 4]

### Pairs With (conditional)

- **`skill-name`** (LIBRARY) - Trigger condition
  - Purpose: Why paired
  - `Read('.claude/skill-library/.../skill-name/SKILL.md')`

Or: 'None'

[Results from step 5]
```

### 7. Insert Integration section

- If "Related Skills" exists: Insert Integration BEFORE it
- If no "Related Skills": Insert before "References" or at end
- **MUST remove "## Related Skills" section.** All skill relationships are documented in Integration. This is NOT optional.

## Migration from Related Skills

If skill has "## Related Skills" but no "## Integration":

1. Generate Integration section from analysis
2. Insert Integration section
3. **Related Skills section MUST be removed after generating Integration.** Extract skill references from Related Skills into appropriate Integration subsections, then delete Related Skills entirely.

## See Also

- [Phase 28 details](.claude/skill-library/claude/skill-management/auditing-skills/references/phase-details.md#phase-28-integration-section)
