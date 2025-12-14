---
name: updating-skills
description: Use when modifying existing skills - guides through TDD update workflow (RED-GREEN) with compliance validation
allowed-tools: Read, Write, Edit, Bash, Grep, TodoWrite, Task, Skill, AskUserQuestion
---

# Updating Skills

**Instruction-driven skill updates with TDD enforcement (simplified RED-GREEN for updates).**

**IMPORTANT**: Use TodoWrite to track phases. Updates still require validation.

---

## When to Use

- Modifying existing skill (add/change/remove content)
- User says "update the X skill"
- Fixing issues found in skill

**NOT for**: Creating new skills (use `creating-skills` skill)

---

## Quick Reference

| Phase | Purpose | Time | Checkpoint |
|-------|---------|------|------------|
| **1. 🔴 RED** | Document current failure | 5 min | Failure captured |
| **2. Locate** | Find skill file | 1 min | File found |
| **2.3 Size Check** | Check line count, determine strategy | 2 min | Strategy decided |
| **3. Backup** | Create backup before edits | 1 min | Backup created |
| **4a. Extract** | Create reference file (if >400 lines) | 10-15 min | Reference created + linked |
| **4b. Inline** | Minimal edit (if <400 lines) | 5-10 min | Change applied |
| **5. Changelog** | Document change | 2 min | Entry added |
| **6. 🟢 GREEN** | Verify fix works | 5 min | Skill solves problem |
| **7. Compliance** | Quality checks + HARD line limit | 5 min | Audit passed, <500 lines |
| **8. 🔵 REFACTOR** | Pressure test (if major change) | 10-15 min | Optional for minor changes |

**Total**: 20-45 minutes (inline ~20 min, extraction ~35 min, major changes ~45 min with REFACTOR)

**Note**: Phase 4a (Extract) OR Phase 4b (Inline) - not both. Strategy determined in Phase 2.3.

---

## Phase 1: 🔴 RED (Document Current Failure)

### 1.1 What's Wrong Today?

Use AskUserQuestion:

```
Question: What behavior is wrong with the current skill?
Header: Current Issue
Options:
  - Skill gives wrong guidance
  - Skill missing important information
  - Skill references broken/outdated
  - Skill needs additional content
```

### 1.2: Capture Failure

Ask user to test current skill and show failure:

```
Question: Can you demonstrate the failure with the current skill?
Header: Failure Demo
Options:
  - I'll describe what goes wrong
  - Let me test the skill and show you
```

**If "test skill"**: Use Skill tool or read skill, capture wrong behavior.

**If "describe"**: Record their description.

### 1.3 Confirm This Needs Skill Update

```
Question: Does this require updating the skill (vs updating an agent)?
Header: Update Scope
Options:
  - Yes - skill itself needs changes
  - No - should update an agent instead
  - Unclear - help me determine
```

**If "agent"**: Recommend using `agent-manager` instead.

**Cannot proceed without confirming skill update needed** ✅

---

## Phase 2: Locate Skill

### 2.1 Find Skill File

**If user provided name**:
```bash
# Check core
find .claude/skills -name "{name}" -type d

# Check library
find .claude/skill-library -name "{name}" -type d
```

**If searching**:
```bash
cd .claude/skill-library/claude/skill-management/auditing-skills/scripts && npm run --silent search -- "{keywords}"
```

### 2.2 Read Current Skill

```
Read `.claude/skills/{name}/SKILL.md`
# or
Read `.claude/skill-library/{category}/{name}/SKILL.md`
```

Understand current structure before changing.

### 2.3 Check Size and Determine Strategy

**MANDATORY CHECK** - Cannot proceed without this:

```bash
wc -l {skill-path}/SKILL.md
```

**Decision Matrix**:

| Current Lines | Strategy | Action |
|--------------|----------|--------|
| < 350 | Inline edit OK | Proceed to Phase 4b (inline) |
| 350-400 | Caution zone | Evaluate content size, may need extraction |
| > 400 | MUST extract | Proceed to Phase 4a (extraction workflow) |

**If > 400 lines OR adding >50 lines of content**:

Use AskUserQuestion:
```
Question: This skill is at {current_lines} lines. Adding significant content will approach 500 line limit. How should we proceed?
Header: Size Strategy
Options:
  - Extract to references/ - Create reference file for new content (Recommended)
  - Extract existing content - Move current detailed sections to references/
  - Inline with caution - Only if staying well under 500 lines
```

**Cannot proceed to editing without size strategy decision** ✅

---

## Phase 3: Backup

### 3.1 Create Backup

**Create `.local/` directory if doesn't exist**:
```bash
mkdir -p {skill-path}/.local
```

**Backup SKILL.md with timestamp**:
```bash
TIMESTAMP=$(date +%Y-%m-%d-%H-%M-%S)
cp {skill-path}/SKILL.md {skill-path}/.local/${TIMESTAMP}-{skill-name}.bak
```

### 3.2 Verify Backup

```bash
ls -la {skill-path}/.local/
```

**Cannot proceed without backup** ✅

---

## Phase 4a: Extract to References (If >400 lines or adding >50 lines)

**Use this workflow if Phase 2.3 determined extraction needed.**

### 4a.1 Determine What to Extract

**Options**:
- **New content** → Create new reference file for the content you're adding
- **Existing content** → Extract current detailed sections to free up space

**Good candidates for extraction**:
- Detailed examples and walkthroughs
- Complex troubleshooting guides
- Edge case documentation
- Step-by-step tutorials
- Reference tables and lists

### 4a.2 Create Reference File

**Create references directory if needed**:
```bash
mkdir -p {skill-path}/references
```

**File naming conventions**:
- `advanced-patterns.md` - Complex patterns and techniques
- `troubleshooting-guide.md` - Debugging and problem solving
- `detailed-workflow.md` - Step-by-step processes
- `examples.md` - Code examples and use cases
- `edge-cases.md` - Unusual scenarios and special handling

### 4a.3 Write Reference File Content

**Use Write tool** to create the reference file:

```
Write {
  file_path: "{skill-path}/references/{reference-name}.md",
  content: "{Extracted or new detailed content}"
}
```

**Structure reference files like this**:
```markdown
# [Topic Name]

## Overview
Brief description of what this reference covers.

## [Section 1]
Detailed content...

## [Section 2]
More detailed content...

## Related
- Link to main skill
- Other relevant references
```

### 4a.4 Update SKILL.md with Link

**Use Edit tool** to add concise summary + link to SKILL.md:

```markdown
## [Section Title]

Brief summary (2-3 sentences explaining key concept).

**For detailed information, see [Reference Name](references/reference-name.md)**:
- Bullet point 1
- Bullet point 2
- Bullet point 3
```

**Keep summary in SKILL.md < 50 lines per section.**

### 4a.5 Verify Link Works

```bash
# Check that reference file exists
ls -la {skill-path}/references/{reference-name}.md
```

**Cannot proceed without working reference link** ✅

---

## Phase 4b: Inline Edit (If <400 lines and adding <50 lines)

**Use this workflow if Phase 2.3 determined inline edit is safe.**

### 4b.1 Identify Specific Section to Change

**Based on RED failure**, determine which section needs update:

| If failure is... | Update section... |
|------------------|-------------------|
| Wrong guidance | Core Workflow or Best Practices |
| Missing information | Add to appropriate section |
| Broken references | Update file paths |
| Outdated content | Update specific subsection |

### 4b.2 Apply Minimal Edit

**Use Edit tool** (not Write - preserve rest of file):

```
Edit {
  file_path: "{skill-path}/SKILL.md",
  old_string: "{Section to change}",
  new_string: "{Updated section}"
}
```

**Minimal diff**: Change only what's needed to fix RED failure.

**Keep additions concise**: If explanation exceeds 30 lines, reconsider extraction strategy.

---

## Phase 5: Changelog

### 5.1 Update CHANGELOG

**If `.history/CHANGELOG` exists**:
```bash
# Read existing changelog
Read {skill-path}/.history/CHANGELOG
```

**Create/append entry**:
```
## [Date: YYYY-MM-DD]

### Changed
- {Description of what changed}

### Reason
- {Why this change was needed (RED failure)}
```

**If `.history/` doesn't exist**:
```bash
mkdir -p {skill-path}/.history
# Create new CHANGELOG
```

---

## Phase 6: 🟢 GREEN (Verify Fix)

### 6.1 Re-Test Scenario

**Test skill with RED scenario**:

```
# If skill is instruction-based
Skill "{skill-name}"

# If skill contains patterns/documentation
Read skill and apply to test scenario
```

### 6.2 Evaluate

- **PASS**: Fix resolved the issue
- **FAIL**: Issue persists, need different fix
- **PARTIAL**: Better but not fully fixed

### 6.3 Confirm GREEN

```
Question: Does the updated skill solve the problem?
Header: GREEN Status
Options:
  - Yes - fix works (GREEN)
  - Partially - needs more iteration
  - No - different approach needed
```

**If not PASS**: Edit again (Phase 4), re-test.

**Cannot proceed without GREEN** ✅

---

## Phase 7: Compliance

### 7.1 Run Audit

```bash
cd .claude/skill-library/claude/skill-management/auditing-skills/scripts && npm run --silent audit -- {skill-name}
```

**If fails**: Review issues, fix with Phase 4 minimal edits, re-run.

### 7.2 Line Count Check (HARD LIMIT)

```bash
LINE_COUNT=$(wc -l < {skill-path}/SKILL.md)
echo "Current line count: $LINE_COUNT"

if [ $LINE_COUNT -gt 500 ]; then
  echo "❌ FAIL: SKILL.md is $LINE_COUNT lines (limit: 500)"
  echo "MUST extract content to references/ before proceeding"
  exit 1
elif [ $LINE_COUNT -gt 450 ]; then
  echo "⚠️  WARNING: SKILL.md is $LINE_COUNT lines (approaching 500 limit)"
  echo "Consider extraction for maintainability"
fi
```

**Target: <500 lines (HARD LIMIT)**

**If >500 lines**: ❌ STOP. Return to Phase 4a and extract content. Cannot proceed with update.

**If 450-500 lines**: ⚠️ Warning zone. Update allowed but plan extraction for next change.

**Cannot proceed past this checkpoint if >500 lines** ✅

### 7.3 Manual Checks

- [ ] Description still valid (if changed)
- [ ] All internal links work
- [ ] References resolve to actual files
- [ ] No broken skill/agent references
- [ ] Progressive disclosure maintained (SKILL.md < 500 lines)
- [ ] Backup created in `.local/`
- [ ] Changelog updated in `.history/`

---

## Phase 8: 🔵 REFACTOR (Conditional)

### When to Run Pressure Tests

**Run REFACTOR if**:
- Changed Critical Rules (rules might not resist pressure)
- Changed workflow instructions (process might be weaker)
- Added new mandatory steps (new ways to skip)

**Skip REFACTOR if**:
- Minor wording changes
- Fixed typos
- Updated file paths
- Added examples

### If Running REFACTOR

**Use same process as creating-skills Phase 9**:

```
skill: "testing-skills-with-subagents"
```

Run 1-3 pressure tests (depending on change scope):
- Major rule change: All 3 tests
- Minor rule change: 1-2 relevant tests
- New mandatory step: 1 test specific to that step

---

## Success Criteria

Update complete when:

1. ✅ RED documented (current failure)
2. ✅ Backup created (.local/)
3. ✅ Skill edited (minimal change)
4. ✅ Changelog updated (.history/)
5. ✅ GREEN passed (fix verified)
6. ✅ Compliance passed (audit + line count)
7. ✅ REFACTOR passed if needed (pressure tests)
8. ✅ TodoWrite complete

**For minor changes**: 1-6 sufficient
**For major changes**: All 8 required

---

## Related Skills

- `creating-skills` - Create new skills
- `testing-skills-with-subagents` - Pressure testing (if REFACTOR needed)
- `skill-manager` - Router to this skill
- `developing-with-tdd` - TDD philosophy
- `verifying-before-completion` - Final validation
