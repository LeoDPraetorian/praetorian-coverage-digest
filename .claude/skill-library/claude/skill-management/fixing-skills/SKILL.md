---
name: fixing-skills
description: Use when remediating skill compliance issues - applies deterministic and semantic fixes from audit results
allowed-tools: Read, Edit, Write, Bash, AskUserQuestion, TodoWrite, Skill
---

# Fixing Skills

**Interactive compliance remediation for skill audit issues.**

> **IMPORTANT**: Use TodoWrite to track fix progress when handling multiple issues.

---

## What This Skill Does

Fixes skill issues discovered by `auditing-skills` across 16 audit phases:
- **Auto-fixes:** Deterministic issues (Phases 2, 4, 5, 6, 7, 10, 12)
- **Manual guidance:** Issues requiring user decisions (Phases 1, 3, 8, 9, 11, 13)
- **Interactive:** User chooses which fixes to apply via AskUserQuestion
- **Verified:** Re-audits after fixes to confirm success

---

## When to Use

- After `auditing-skills` reports failures
- When skill has compliance issues
- Before committing skill changes
- As part of create/update workflows

**NOT for:**
- Creating new skills (use `creating-skills`)
- Updating skill logic (use `updating-skills`)
- Running audits (use `auditing-skills`)

---

## Quick Reference

| Phase | Issue Type | Auto | Manual | Example |
|-------|-----------|------|--------|---------|
| 1 | Description format | - | ✅ | Rewrite to "Use when..." pattern |
| 2 | allowed-tools field | ✅ | - | Fix comma-separation |
| 3 | Line count >500 | - | ✅ | Extract to references/ |
| 4 | Broken links | ✅ | - | Create missing reference files |
| 5 | Missing structure | ✅ | - | Create references/, examples/ |
| 6 | Missing scripts | ✅ | - | Add src/, package.json |
| 7 | Missing .output | ✅ | - | Create .output/, .local/ |
| 8 | TypeScript errors | - | ✅ | Fix compilation issues |
| 9 | Bash scripts | - | ✅ | Migrate to TypeScript |
| 10 | Phantom references | ✅ | - | Remove broken skill refs |
| 11 | cd commands | - | ✅ | Update to REPO_ROOT pattern |
| 12 | CLI errors | ✅ | - | Add proper exit codes |
| 13 | TodoWrite missing | - | ✅ | Add state tracking |

---

## Workflow

### Complete Fix Workflow

Copy this checklist and track progress with TodoWrite:

```
Fix Progress:
- [ ] Step 1: Run audit to identify issues
- [ ] Step 2: Read skill file
- [ ] Step 3: Categorize fixes (auto vs manual)
- [ ] Step 4: Present options via AskUserQuestion
- [ ] Step 5: Apply auto-fixes with Edit tool
- [ ] Step 6: Guide manual fixes with user input
- [ ] Step 7: Re-audit to verify all fixes worked
- [ ] Step 8: Report final status
```

### Step 1: Run Audit

Always audit first to get current issues:

```
skill: "auditing-skills"
```

**Why:** Ensures you're fixing actual problems, not guessing.

**Audit output examples:**

**Success (no fixes needed):**
```
✅ Audit passed
  Skill: creating-skills
  16/16 phases passed
  No issues found
```
→ **Action:** No fixes needed, skill is compliant

**Failure (fixes needed):**
```
✗ Audit failed
  Skill: my-skill
  12/16 phases passed

  Phase 3 (Word Count): FAILURE
    SKILL.md has 687 lines (limit: 500)

  Phase 4 (Broken Links): FAILURE
    2 broken references found

  Phase 10 (Reference Audit): FAILURE
    1 phantom skill reference found
```
→ **Action:** Proceed to Step 2

### Step 2: Read Skill File

Read the skill to understand context and prepare fixes:

```bash
# Check both core and library locations
# Core:
Read `.claude/skills/{skill-name}/SKILL.md`

# Library:
Read `.claude/skill-library/{category}/{skill-name}/SKILL.md`
```

**What to note:**
- Current frontmatter structure
- Description format and length
- SKILL.md line count
- Reference file organization
- Script directory structure (if exists)

### Step 3: Categorize Fixes

Based on audit output, categorize each issue:

**AUTO-FIXABLE (Apply with Edit/Write/Bash):**
- Phase 2: Malformed allowed-tools → Fix comma-separation
- Phase 4: Broken links → Create placeholder reference files
- Phase 5: Missing structure → Create directories
- Phase 6: Missing scripts → Add boilerplate files
- Phase 7: Missing .output → Create directories
- Phase 10: Phantom references → Remove or update refs
- Phase 12: CLI errors → Add exit codes and error handling

**MANUAL (Require user input/decisions):**
- Phase 1: Description format → Need "Use when" rewrite
- Phase 3: Line count >500 → Need progressive disclosure design
- Phase 8: TypeScript errors → Need code fixes
- Phase 9: Bash scripts → Need TypeScript migration
- Phase 11: cd commands → Need REPO_ROOT updates
- Phase 13: TodoWrite missing → Need workflow analysis

**Example categorization:**
```
Issues found:
  1. Broken links (Phase 4) [AUTO]
  2. Line count >500 (Phase 3) [MANUAL]
  3. Phantom skill ref (Phase 10) [AUTO]
  4. Description too long (Phase 1) [MANUAL]

Auto-fixes: 2
Manual fixes: 2
```

### Step 4: Present Options

Use AskUserQuestion to let user choose fixes:

```typescript
AskUserQuestion({
  questions: [{
    question: "Which issues should I fix in {skill-name}?",
    header: "Fix Selection",
    multiSelect: true,
    options: [
      {
        label: "Auto-fix all deterministic issues (Phases 2,4,5,6,7,10,12)",
        description: "Apply all auto-fixes without further prompts"
      },
      {
        label: "Guide me through manual fixes (Phases 1,3,8,9,11,13)",
        description: "Interactive guidance for semantic issues"
      },
      {
        label: "Fix specific issue: {issue-description}",
        description: "Apply single fix and re-audit"
      },
      {
        label: "Show me what would change (dry-run)",
        description: "Preview fixes without applying"
      }
    ]
  }]
})
```

### Step 5: Apply Auto-Fixes

For each auto-fixable issue, apply deterministic fixes. See [Phase-Specific Fix Details](references/phase-fixes.md) for complete examples.

**Quick reference:**
- **Phase 2:** Fix comma-separation in allowed-tools
- **Phase 4:** Create missing reference files
- **Phase 5:** Create references/ and examples/ directories
- **Phase 6:** Add scripts/src/, package.json, tsconfig.json
- **Phase 7:** Create .output/ and .local/ directories
- **Phase 10:** Remove phantom skill references
- **Phase 12:** Add CLI error handling and exit codes

### Step 6: Guide Manual Fixes

For manual issues, provide interactive guidance. See [Phase-Specific Fix Details](references/phase-fixes.md) for complete workflows.

**Quick reference:**
- **Phase 1:** Rewrite description to "Use when..." pattern, <120 chars
- **Phase 3:** Extract detailed content to references/ (progressive disclosure)
- **Phase 8:** Fix TypeScript compilation errors
- **Phase 9:** Migrate bash scripts to TypeScript
- **Phase 11:** Update cd commands to REPO_ROOT pattern
- **Phase 13:** Add TodoWrite mandates for multi-step workflows

### Step 7: Re-Audit

After applying fixes, verify success:

```bash
cd .claude/skill-library/claude/skill-management/auditing-skills/scripts
npm run audit -- {skill-name}
```

**Expected:**
```
✅ Audit passed
  Skill: {skill-name}
  16/16 phases passed
```

**If failures remain:** Repeat Steps 3-7 for remaining issues

### Step 8: Report Status

Summarize what was fixed:

```
Fix Summary for {skill-name}:

Auto-fixes applied:
✅ Phase 4: Created 2 missing reference files
✅ Phase 10: Removed 1 phantom skill reference

Manual fixes completed:
✅ Phase 1: Rewrote description (now 98 chars)
✅ Phase 3: Extracted workflow to references/ (now 347 lines)

Final audit: ✅ 16/16 phases passed

The skill is now compliant and ready to commit.
```

---

## Common Fix Scenarios

### Scenario 1: New Skill Needs Cleanup

**Symptoms:**
- Missing references/ directory
- Broken links
- Description too verbose

**Fix sequence:**
1. Auto-fix Phase 5 (create structure)
2. Auto-fix Phase 4 (create placeholders)
3. Manual fix Phase 1 (rewrite description)

### Scenario 2: Skill Exceeds Line Limit

**Symptoms:**
- Phase 3 failure (>500 lines)
- Dense SKILL.md with detailed content

**Fix sequence:**
1. Identify 3-5 detailed sections
2. Extract each to references/
3. Update SKILL.md with summaries + links
4. Re-audit to verify <500 lines

### Scenario 3: Legacy Skill Migration

**Symptoms:**
- Bash scripts (Phase 9)
- Absolute paths (Phase 11)
- No TodoWrite (Phase 13)

**Fix sequence:**
1. Migrate bash to TypeScript (Phase 9)
2. Update cd commands (Phase 11)
3. Add TodoWrite mandates (Phase 13)
4. Re-audit to verify compliance

---

## Dry-Run Mode

To preview fixes without applying:

1. Run audit, capture issues
2. Categorize fixes as normal
3. For each fix, document **what would change**
4. Present summary to user
5. Ask: "Apply these fixes?" via AskUserQuestion

**Example dry-run output:**
```
Dry-run for {skill-name}:

Would fix:
1. Phase 4: Create references/workflow.md (empty placeholder)
2. Phase 10: Remove line 87 "See non-existent-skill"
3. Phase 1: Change description to:
   Before: "This skill helps you when you need to create new skills..." (72 chars)
   After: "Use when creating skills - TDD workflow, templates" (54 chars)

Apply these 3 fixes? [Yes/No/Preview each]
```

---

## Related Skills

- `creating-skills` - Create new skills (uses this for final cleanup)
- `updating-skills` - Update existing skills (uses this for compliance)
- `auditing-skills` - Validate skills (identifies issues to fix)
- `skill-manager` - Router to this skill
