---
name: deleting-skills
description: Use when removing skills from the codebase - guides through reference discovery, impact analysis, user confirmation, directory removal, and cleanup verification to ensure no orphaned references remain
allowed-tools: Read, Bash, Grep, Glob, Edit, AskUserQuestion, TodoWrite
---

# Deleting Skills

**Instruction-driven skill deletion workflow with impact analysis and verification.**

**You MUST use TodoWrite** to track phases. Deletion is irreversible and requires careful validation.

---

## When to Use

Use this skill when:
- Removing a deprecated skill
- Cleaning up unused skills
- User says "delete the X skill"
- Consolidating duplicate skills

**NOT for:**
- Renaming skills (use `renaming-skills` skill)
- Temporarily disabling skills (comment out gateway reference)
- Migrating skills (use `migrating-skills` skill)

---

## Quick Reference

| Phase | Purpose | Time | Checkpoint |
|-------|---------|------|------------|
| **1. Validate** | Verify skill exists | 1 min | Skill found |
| **2. Discover** | Find all references | 3 min | References documented |
| **3. Analyze** | Show impact to user | 2 min | Impact clear |
| **4. Confirm** | User approval before deletion | 1 min | Confirmed |
| **5. Remove** | Delete skill directory | 1 min | Directory removed |
| **6. Cleanup** | Remove references | 5 min | References cleaned |
| **7. Verify** | Ensure no orphaned references | 2 min | Clean verified |

**Total**: 15 minutes

---

## Phase 1: Validate Skill Existence

### 1.1 Find the Skill

```bash
# Check core skills
find .claude/skills -name "{skill-name}" -type d

# Check library skills
find .claude/skill-library -name "{skill-name}" -type d
```

**If not found**: Error - skill doesn't exist. Confirm spelling with user.

**If found**: Record the full path for deletion.

### 1.2 Verify It's a Skill

Check that the directory contains `SKILL.md`:

```bash
ls {skill-path}/SKILL.md
```

**If SKILL.md missing**: This isn't a valid skill directory. Investigate before deletion.

---

## Phase 2: Reference Discovery

**Find ALL references across the codebase**. Missing references = broken system.

### 2.1 Search Gateway References

```bash
# Search all gateway skills
grep -r "{skill-name}" .claude/skills/gateway-*/SKILL.md
```

**Gateways to check:**
- `gateway-frontend`
- `gateway-backend`
- `gateway-testing`
- `gateway-security`
- `gateway-integrations`
- `gateway-mcp-tools`
- `gateway-capabilities`
- `gateway-claude`

### 2.2 Search Command References

```bash
# Search all command files
grep -r "{skill-name}" .claude/commands/
```

**Commands often reference skills in routing tables.**

### 2.3 Search Skill References

```bash
# Search other skills (core)
grep -r "{skill-name}" .claude/skills/*/SKILL.md

# Search other skills (library)
grep -r "{skill-name}" .claude/skill-library/*/SKILL.md
```

**Skills reference related skills in:**
- "Integration with Other Skills" sections
- "Related Skills" sections
- Workflow instructions ("use skill X before Y")

### 2.4 Search Skill Descriptions

```bash
# Search for skill name in descriptions (case-insensitive)
grep -ri "{skill-name}" .claude/skills/*/SKILL.md | grep -i "description"
grep -ri "{skill-name}" .claude/skill-library/*/*/SKILL.md | grep -i "description"
```

**Descriptions sometimes mention related skills.**

### 2.5 Document All Findings

Create a structured list:

```markdown
## References Found

### Gateways
- `.claude/skills/gateway-testing/SKILL.md:45` - Routes to skill
- `.claude/skills/gateway-frontend/SKILL.md:78` - Mentions in description

### Commands
- `.claude/commands/skill-manager.md:23` - Routing table

### Skills
- `.claude/skill-library/testing/test-infrastructure-discovery/SKILL.md:219` - Integration section
- `.claude/skills/developing-with-tdd/SKILL.md:156` - Related skills

### Total References: 4
```

---

## Phase 3: Impact Analysis

### 3.1 Present Findings to User

Use AskUserQuestion to show impact:

```markdown
Question: I found {X} references to {skill-name}. Deleting this skill will break:

**Gateways:**
- gateway-testing (routing table)

**Commands:**
- skill-manager (routing)

**Skills:**
- test-infrastructure-discovery (integration section)
- developing-with-tdd (related skills)

**Impact:**
- Gateway routes will fail
- skill-manager command will have broken reference
- 2 skills will have outdated recommendations

Do you want to proceed with deletion?

Options:
- Yes - Delete skill and clean up all references
- No - Cancel deletion
- Show me the references first
```

### 3.2 If "Show me references"

Read and display each reference context:

```bash
# For each reference, show 5 lines of context
grep -A 5 -B 5 "{skill-name}" {file-path}
```

Then re-ask the confirmation question.

---

## Phase 4: Confirmation

**Cannot proceed without explicit user confirmation** ✅

If user confirms deletion:
- Proceed to Phase 5
- Document confirmation in output

If user cancels:
- Stop immediately
- Report "Deletion cancelled, no changes made"
- Exit skill

---

## Phase 5: Remove Skill Directory

### 5.1 Final Safety Check

**Before deletion, verify path contains `.claude/skill`:**

```bash
echo "{skill-path}" | grep -q ".claude/skill"
if [ $? -ne 0 ]; then
  echo "❌ SAFETY CHECK FAILED: Path doesn't contain .claude/skill"
  exit 1
fi
```

### 5.2 Delete Directory

```bash
rm -rf {skill-path}
```

### 5.3 Verify Deletion

```bash
ls {skill-path} 2>&1
# Should return "No such file or directory"
```

**If directory still exists**: Error - deletion failed. Report to user.

---

## Phase 6: Cleanup References

**For each reference found in Phase 2, remove or update it.**

### 6.1 Gateway References

**If skill is in routing table**: Remove the entire routing entry using Edit tool.

**If skill is mentioned in description**: Update description to remove mention using Edit tool.

**Example:**
```markdown
# Before
- **test-infrastructure-discovery** - Discover test infrastructure
- **deleted-skill-name** - Old functionality
- **debugging-systematically** - Debug issues

# After (remove line)
- **test-infrastructure-discovery** - Discover test infrastructure
- **debugging-systematically** - Debug issues
```

### 6.2 Command References

**If skill is in routing table**: Remove routing section using Edit tool.

**Example:**
```markdown
# Before
| create | creating-skills |
| delete | deleting-skills |
| update | updating-skills |

# After
| create | creating-skills |
| update | updating-skills |
```

### 6.3 Skill References

**For "Related Skills" sections**: Remove the skill from the list.

**For "Integration" sections**: Remove or update the integration note.

**Example:**
```markdown
# Before
**Related Skills:**
- creating-skills
- deleted-skill-name
- updating-skills

# After
**Related Skills:**
- creating-skills
- updating-skills
```

### 6.4 Track Cleanup Progress

Use TodoWrite to track each reference cleanup:

```
- Clean gateway-testing reference
- Clean skill-manager command reference
- Clean test-infrastructure-discovery reference
- Clean developing-with-tdd reference
```

Mark each complete as you clean it up.

---

## Phase 7: Verification

### 7.1 Re-Search for References

**Run the same searches from Phase 2** to verify no references remain:

```bash
# Should return no results
grep -r "{skill-name}" .claude/skills/gateway-*/SKILL.md
grep -r "{skill-name}" .claude/commands/
grep -r "{skill-name}" .claude/skills/*/SKILL.md
grep -r "{skill-name}" .claude/skill-library/*/*/SKILL.md
```

### 7.2 Check for Partial Matches

Search for partial skill name matches (in case of hyphenation issues):

```bash
# Example: if deleting "mock-contract-validation", search for "contract-validation"
grep -r "{partial-skill-name}" .claude/
```

### 7.3 Verify Directory Removed

```bash
find .claude -name "{skill-name}" -type d
# Should return no results
```

### 7.4 Final Report

Present verification results:

```markdown
## Deletion Complete ✅

**Skill Removed:**
- Path: {skill-path}
- Status: Directory deleted

**References Cleaned:**
- ✅ gateway-testing:45 - Removed routing entry
- ✅ skill-manager.md:23 - Removed from command table
- ✅ test-infrastructure-discovery:219 - Removed from integration section
- ✅ developing-with-tdd:156 - Removed from related skills

**Verification:**
- ✅ No references found in grep search
- ✅ No partial matches found
- ✅ Directory no longer exists

**Summary:**
Skill "{skill-name}" successfully deleted. 4 references cleaned. No orphaned references remain.
```

---

## Success Criteria

Deletion complete when:

1. ✅ Skill exists and validated (Phase 1)
2. ✅ All references discovered and documented (Phase 2)
3. ✅ Impact shown to user (Phase 3)
4. ✅ User confirmed deletion (Phase 4)
5. ✅ Directory removed (Phase 5)
6. ✅ All references cleaned (Phase 6)
7. ✅ No orphaned references remain (Phase 7)
8. ✅ TodoWrite todos complete

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Deleting without user confirmation | MUST get explicit confirmation (Phase 4) |
| Incomplete reference search | Search gateways, commands, AND skills |
| Forgetting partial name matches | Search for skill name fragments in verification |
| Not verifying cleanup | Re-run searches to ensure no orphans |
| Deleting wrong directory | Verify path contains `.claude/skill` |
| Missing TodoWrite tracking | Use TodoWrite for all phases |

---

## Rationalization to Avoid

| Excuse | Reality |
|--------|---------|
| "No references, safe to delete" | Must verify with grep searches, not assumptions |
| "Just delete the directory" | Must clean up references or they'll break |
| "User knows the impact" | Must show references explicitly, not assume |
| "Quick cleanup, skip verification" | Verification is mandatory - orphaned references break system |
| "Skill is deprecated, references don't matter" | Deprecated skills still referenced until cleanup |

---

## Integration with Other Skills

**Before deleting:**
- Check if skill should be **renamed** instead (`renaming-skills`)
- Check if skill should be **migrated** instead (`migrating-skills`)

**After deleting:**
- Run `skill-manager audit` on updated gateway/command files
- Verify no broken links with `skill-manager audit --all`

**Related:**
- `renaming-skills` - Rename instead of delete
- `migrating-skills` - Move location instead of delete
- `auditing-skills` - Verify cleanup success

---

## Safety Features

**Cannot proceed without:**
- ✅ User confirmation (Phase 4)
- ✅ Path safety check (Phase 5.1)
- ✅ Reference discovery (Phase 2)
- ✅ Verification (Phase 7)

**Irreversible operations:**
- Directory deletion (Phase 5)
- Reference cleanup (Phase 6)

**No undo** - deletion is permanent.
