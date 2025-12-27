# Update Workflow - Detailed Procedures

**Purpose**: Complete step-by-step procedures for updating skills

**When to read**: When applying updates beyond simple one-liners

---

## Phase 1: 🔴 RED - Document Current Failure

### 1.1 Identify the Gap

What behavior is wrong with the current skill?

- Skill gives incorrect guidance
- Skill missing important information
- References broken or outdated
- Content needs updating for new patterns

### 1.2 Capture Failure Evidence

Test the current skill and capture exact failure:

```
Before update:
- Scenario: [What you're trying to do]
- Current behavior: [What skill says/does]
- Expected: [What it should say/do]
- Failure: [Specific gap or error]
```

### 1.3 Confirm Skill Update Needed

Ensure this requires updating the skill (not an agent or other component).

---

## Phase 2: Locate Skill

### 2.1 Find Skill File

```bash
# Search both core and library
cd .claude && npm run search -- "keyword"
```

### 2.2 Read Current Skill

Understand structure before changing:

```
Read('.claude/skills/{name}/SKILL.md')
# or
Read('.claude/skill-library/{category}/{name}/SKILL.md')
```

---

## Phase 3: Size Check and Strategy

### 3.1 Check Current Line Count

```bash
wc -l {skill-path}/SKILL.md
```

### 3.2 Determine Strategy

| Current Lines | Adding Lines | Strategy |
|---------------|--------------|----------|
| <350 | <30 | Inline edit (Phase 4b) |
| <400 | <50 | Inline with caution |
| >400 | Any | Extract to references (Phase 4a) |
| Any | >50 | Extract to references |

---

## Phase 4a: Extract to References

### When to Use

- Skill currently >400 lines
- Adding >50 lines of content
- Approaching 500 line hard limit

### Steps

1. **Determine what to extract**:
   - New content → Create new reference file
   - Existing verbose sections → Move to references

2. **Create reference file**:
   ```bash
   mkdir -p {skill-path}/references
   ```

3. **Write content**:
   ```
   Write {
     file_path: "{skill-path}/references/{topic}.md",
     content: "# {Topic}\n\n{Detailed content}"
   }
   ```

4. **Update SKILL.md with link**:
   ```markdown
   ## {Section}

   Brief summary (2-3 sentences).

   **For details**: See [references/{topic}.md](references/{topic}.md)
   ```

---

## Phase 4b: Inline Edit

### When to Use

- Skill currently <400 lines
- Adding <50 lines
- Simple content change

### Steps

1. **Identify section to change**

2. **Apply minimal edit**:
   ```
   Edit {
     file_path: "{skill-path}/SKILL.md",
     old_string: "{Exact text to replace}",
     new_string: "{Updated text}"
   }
   ```

3. **Format tables**:
   ```bash
   npx prettier --write --parser markdown {skill-path}/SKILL.md
   ```

---

## Phase 5: Changelog

### 5.1 Create .history directory

```bash
mkdir -p {skill-path}/.history
```

### 5.2 Append entry

Add to `.history/CHANGELOG` with format:

```markdown
## [YYYY-MM-DD] - Brief description

### Changed
- What changed
- Why it changed

### Reason
- RED failure that prompted update
- Gap being filled

### Impact
- What this enables
- Who benefits
```

---

## Phase 6: 🟢 GREEN - Verify Fix

### 6.1 Re-Test Scenario

Use updated skill with same RED scenario:

```
After update:
- Scenario: [Same as RED]
- New behavior: [What skill now says/does]
- Result: [Pass/Fail]
```

### 6.2 Evaluate

- **PASS**: Issue resolved, skill works ✅
- **PARTIAL**: Better but incomplete ⚠️
- **FAIL**: Issue persists, need different approach ❌

If not PASS, return to Phase 4 and iterate.

---

## Phase 7: Compliance

### 7.1 Run Audit

```bash
cd .claude && npm run audit -- {skill-name}
```

### 7.2 Line Count Check

```bash
wc -l {skill-path}/SKILL.md
```

**Hard limit**: <500 lines

If >500, STOP and extract content to references.

### 7.3 Fix Issues

If audit fails, fix deterministically:
- Block scalars → Single-line
- Broken links → Fix paths
- Table formatting → `npx prettier --write`

---

## Phase 8: 🔵 REFACTOR (Non-Trivial Changes)

### When Required

- Logic/rule changes
- Workflow modifications
- New validation steps

### When Optional

- Typos, formatting
- <10 line changes
- No behavior impact

### Procedure

Use `skill: "testing-skills-with-subagents"` for pressure testing:

1. Time pressure scenarios
2. Authority bypass attempts
3. Sunk cost rationalizations

Document results in changelog.

---

## Common Patterns

### Fixing Broken Links

```bash
# Verify path exists
ls {referenced-file}

# If missing, create it or update path
```

### Extracting Verbose Sections

Good candidates:
- Examples (>10 examples)
- Troubleshooting (>5 issues)
- Detailed procedures
- Edge cases

### Reference Naming

- `{topic}-guide.md` - How-to content
- `{topic}-patterns.md` - Pattern catalog
- `troubleshooting.md` - Common issues
- `examples.md` - Use cases

---

## Related

- [tdd-methodology.md](../../../../../skills/managing-skills/references/tdd-methodology.md) - RED-GREEN-REFACTOR
- [progressive-disclosure.md](../../../../../skills/managing-skills/references/progressive-disclosure.md) - Extraction strategy
