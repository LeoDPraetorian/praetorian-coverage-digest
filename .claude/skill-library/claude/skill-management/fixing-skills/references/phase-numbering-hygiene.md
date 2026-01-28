# Phase Numbering Hygiene Fix (Semantic Criterion 7)

**When detected:** Fractional major phase numbers (Phase 3.5, Phase 5.4) found during semantic review

## Fix Procedure

1. **Identify all major phases** - Scan SKILL.md and references/ for `## Phase X` or `## Step X` headings
2. **Create renumbering map** - Example:
   ```
   Current: Phase 1, 2, 3, 3.5, 4, 5
   Map:     Phase 3.5 -> Phase 4
            Phase 4   -> Phase 5
            Phase 5   -> Phase 6
   Target:  Phase 1, 2, 3, 4, 5, 6
   ```
3. **Update phase headings** - Use Edit tool to renumber ALL major phase headings sequentially in SKILL.md and references/
4. **Update markdown links** - Find and update links to phase files:
   - `[Phase 4](phase-4-file.md)` -> `[Phase 5](phase-5-file.md)`
   - Update in both SKILL.md and all reference files
5. **Update prose references** - For ALL files in skill directory (SKILL.md + references/*):
   - Find prose patterns using renumbering map:
     - `Phase X (` -> `Phase Y (` (e.g., "Phase 4 (implementation)" -> "Phase 5 (implementation)")
     - `Phase X:` -> `Phase Y:`
     - `Phase X output` -> `Phase Y output`
     - `to Phase X` -> `to Phase Y`
     - `from Phase X` -> `from Phase Y`
     - `return to Phase X` -> `return to Phase Y` (case-insensitive)
   - Preserve descriptive text: "Phase 4 (implementation)" -> "Phase 5 (implementation)" keeps "(implementation)"
   - Apply to ALL files: troubleshooting.md, progress-persistence.md, agent-handoffs.md, phase-X.md files, etc.
   - **Exclusions**: Skip .history/CHANGELOG (historical), code blocks (external examples)
6. **Verify name hints match** - After renumbering:
   - Validate prose hints against actual phase names
   - Example: "Phase 5 (Implementation)" - verify Phase 5 IS implementation phase
   - If mismatch detected, flag for manual review
7. **Update external references** (optional):
   - Search for external references: `grep -r "skill-name.*Phase [0-9]" .claude/`
   - Report as INFO: "External reference found in {file}:{line} - manual review recommended"
   - Do NOT auto-modify external files

## Example Transformation

```markdown
# Before

## Phase 3: Validation

## Phase 3.5: Additional Check  <-- Fractional phase

## Phase 4: Implementation

Return to Phase 3.5 for validation details.
See [Phase 4](phase-4-impl.md) for implementation.

# After

## Phase 3: Validation

## Phase 4: Additional Check  <-- Renumbered from 3.5

## Phase 5: Implementation  <-- Renumbered from 4

Return to Phase 4 for validation details.  <-- Prose reference updated
See [Phase 5](phase-5-impl.md) for implementation.  <-- Link updated
```

## Important Distinctions

**Distinguish from sub-steps:** Do NOT renumber sub-steps like `### Step 7.1` under `## Step 7` - these represent decomposition, not insertion.

## Related

- [Phase Categorization](.claude/skills/managing-skills/references/patterns/phase-categorization.md)
