# Phase 29: Logical Coherence (Manual Resolution)

**When detected:** Audit identifies logical issues such as:
- Steps in impossible order (Step N needs output from Step M that comes later)
- Contradictions between sections
- Missing critical steps in workflow
- Purpose misalignment (description doesn't match implementation)
- Broken delegation (skill invokes non-existent sub-skills)

**Why no auto-fix:** Logical coherence issues require understanding the skill's intent and making architectural decisions:
- Reordering steps may break other dependencies
- Resolving contradictions requires understanding which section is "correct"
- Adding missing steps requires domain knowledge
- Fixing purpose misalignment may require rewriting description OR workflow

## Manual Resolution Guidance

1. **Review the audit finding** - Understand the specific logical issue detected
2. **Determine intent** - What was the skill trying to accomplish?
3. **Choose resolution strategy:**
   - Workflow logic issues -> Reorder steps or add missing prerequisites
   - Contradictions -> Determine which section reflects intended behavior, update the other
   - Missing steps -> Add the step with appropriate content
   - Purpose misalignment -> Update description to match workflow OR update workflow to match description
   - Broken delegation -> Fix skill reference or remove the delegation
4. **Apply fix manually** - Use Edit tool with careful consideration
5. **Re-run audit** - Verify Phase 29 passes after fix

## Related

- [Phase 29 audit details](.claude/skill-library/claude/skill-management/auditing-skills/references/phase-details.md#phase-29-logical-coherence--internal-consistency)
- [Phase Categorization](.claude/skills/managing-skills/references/patterns/phase-categorization.md)
