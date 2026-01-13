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
# Search both core and library (from repo root)
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
cd "$ROOT/.claude" && npm run search -- "keyword"
```

> **⚠️ PATH WARNING**: All `{skill-path}` placeholders in this file are **relative to $ROOT** (repo root).
> Example: `{skill-path}` = `$ROOT/.claude/skill-library/claude/mcp-management/testing-mcp-wrappers`
> **NEVER** run path commands from inside `.claude/` directory - this causes `.claude/.claude/` duplication.

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
# {skill-path} is relative to $ROOT (e.g., $ROOT/.claude/skill-library/category/name)
wc -l $ROOT/{skill-path}/SKILL.md
```

### 3.2 Determine Strategy

| Current Lines | Adding Lines | Strategy                         |
| ------------- | ------------ | -------------------------------- |
| <350          | <30          | Inline edit (Phase 4b)           |
| <400          | <50          | Inline with caution              |
| >400          | Any          | Extract to references (Phase 4a) |
| Any           | >50          | Extract to references            |

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
   # Ensure you're at repo root first (Step 0)
   mkdir -p $ROOT/{skill-path}/references
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

2. **Phase Numbering Rule (MANDATORY for phase insertions)**:

   When adding a new MAJOR phase between existing phases:

   **NEVER use fractional phase numbers** (e.g., Phase 3.5, Phase 5.4)

   **ALWAYS renumber subsequent phases** to maintain sequential integers:

   ```
   Example: To add a phase between Phase 3 and Phase 4:

   Step 1: Renumber ALL subsequent phases
   - Phase 4 → Phase 5
   - Phase 5 → Phase 6
   - Phase 6 → Phase 7
   (and so on...)

   Step 2: Insert new content as Phase 4

   Step 3: Update ALL references to renumbered phases
   - Search for "Phase 4", "Phase 5", etc. in SKILL.md
   - Search in all files under references/ directory
   - Update cross-references like "see Phase 4" → "see Phase 5"
   ```

   **Sub-steps WITHIN a phase are acceptable** (Step 7.1, 7.2, 7.3) as they represent decomposition, not insertion.

   **Why this matters**:
   - Prevents maintenance debt from fractional numbering
   - Keeps phase sequences clean and predictable
   - Avoids confusion about phase ordering

3. **Apply minimal edit**:

   ```
   Edit {
     file_path: "{skill-path}/SKILL.md",
     old_string: "{Exact text to replace}",
     new_string: "{Updated text}"
   }
   ```

4. **Format tables**:
   ```bash
   npx prettier --write --parser markdown {skill-path}/SKILL.md
   ```

---

## Phase 4c: Research Integration (When Research Was Performed)

### When to Use

After `orchestrating-research` returns with SYNTHESIS.md, Step 5 must expand into granular sub-steps.

### Research-to-Update-Target Mapping

**Understanding the mapping**: SYNTHESIS.md sections contain different types of information that feed different update targets.

#### SYNTHESIS.md Sections → Update Targets

| SYNTHESIS.md Section          | Update Target                                  | What to Extract                          |
| ----------------------------- | ---------------------------------------------- | ---------------------------------------- |
| Executive Summary             | SKILL.md overview/description                  | High-level changes, new capabilities     |
| Findings by Interpretation    | SKILL.md workflow sections                     | Step-by-step procedures, decision points |
| Cross-Interpretation Patterns | references/patterns.md                         | Common patterns across sources           |
| Conflicts & Discrepancies     | references/troubleshooting.md or edge-cases.md | Trade-offs, when to use which approach   |
| Recommendations               | SKILL.md Quick Reference table                 | Priority actions, best practices         |
| Full Citations                | References section at bottom                   | Updated links, version numbers           |

#### Research Agent Output Files → Update Targets

| Research Agent Output | Update Target                       | What to Extract                   |
| --------------------- | ----------------------------------- | --------------------------------- |
| context7-\*.md        | references/api-reference.md         | Official API docs, current syntax |
| github-\*.md          | references/patterns.md or examples/ | Real-world implementations        |
| codebase-\*.md        | SKILL.md examples                   | Project-specific patterns         |
| perplexity-\*.md      | SKILL.md best practices             | Community consensus               |

### Step 4c.1: Identify Update Targets

After reading SYNTHESIS.md, expand TodoWrite with per-target items:

```
TodoWrite([
  { content: 'Step 5.1: Identify update targets', status: 'in_progress', activeForm: 'Identifying targets' },
  { content: 'Step 5.2: Update SKILL.md Quick Reference', status: 'pending', activeForm: 'Updating Quick Reference' },
  { content: 'Step 5.3: Update SKILL.md workflow sections', status: 'pending', activeForm: 'Updating workflow' },
  { content: 'Step 5.4: Update references/workflow.md', status: 'pending', activeForm: 'Updating workflow.md' },
  { content: 'Step 5.5: Update references/patterns.md', status: 'pending', activeForm: 'Updating patterns.md' },
  { content: 'Step 5.6: Verify research incorporation', status: 'pending', activeForm: 'Verifying incorporation' },
  { content: 'Step 6: Verify GREEN', status: 'pending', activeForm: 'Verifying fix' },
  { content: 'Step 7: Compliance audit', status: 'pending', activeForm: 'Running compliance' },
  { content: 'Step 8: REFACTOR', status: 'pending', activeForm: 'Pressure testing' }
])
```

**Process**:

1. Read current SKILL.md to identify sections
2. List existing references/ files (`ls -la references/`)
3. Read SYNTHESIS.md completely
4. Map SYNTHESIS.md sections to update targets using table above
5. Determine which existing reference files need updates
6. Identify if new reference files are needed

### Step 4c.2: Update SKILL.md Core Sections

Apply changes to:

- Quick Reference table (from Recommendations section)
- Overview/description (from Executive Summary)
- Workflow/procedure sections (from Findings by Interpretation)
- Examples and patterns (from research agent outputs)
- References/citations (from Full Citations)

**Use current syntax from research, not training data.**

### Step 4c.3: Update Existing Reference Files

For each file in `references/`, check if SYNTHESIS.md has relevant findings.

#### Procedure per Reference File

1. **Check relevance**: Does this file's topic appear in SYNTHESIS.md?

2. **If yes - Compare and update**:
   - Read current reference file completely
   - Identify sections in SYNTHESIS.md that apply to this file
   - Update outdated syntax/APIs (use context7-\*.md outputs)
   - Add new patterns discovered (use Cross-Interpretation Patterns section)
   - Remove deprecated approaches (documented in Conflicts & Discrepancies)
   - Update citations/links (from Full Citations section)
   - Document changes made (brief comment or commit message)

3. **If no - Document decision**:
   - File may be orthogonal to research scope
   - Add comment in TodoWrite: "references/X.md - No updates needed (topic not in research scope)"
   - This prevents "I forgot to check" vs "I checked and it's current"

4. **Track in TodoWrite**: Create one item per file that needs updating

#### Common Reference File Updates

| File Pattern       | Likely Updates from Research                  |
| ------------------ | --------------------------------------------- |
| api-reference.md   | New methods, changed signatures, deprecations |
| patterns.md        | New patterns, evolved best practices          |
| workflow.md        | New steps, reordered procedures               |
| troubleshooting.md | New edge cases, resolved issues               |
| examples.md        | Updated syntax, new use cases                 |

### Step 4c.4: Create New Reference Files

If research reveals patterns not covered by existing reference files:

1. **Determine need**: Is there a SYNTHESIS.md section with substantial content that doesn't fit existing files?

2. **Create file**: Follow progressive disclosure patterns

   ```bash
   # Example: Research revealed CI/CD integration patterns not documented
   Write({
     file_path: "{skill-path}/references/ci-cd-integration.md",
     content: "# CI/CD Integration\n\n[Content from SYNTHESIS.md]"
   })
   ```

3. **Link from SKILL.md**: Add to Related Skills or References section

   ```markdown
   **References**:

   - [ci-cd-integration.md](references/ci-cd-integration.md) - CI/CD integration patterns
   ```

### Step 4c.5: Research Incorporation Verification Gate

**MANDATORY checkpoint before proceeding to Phase 6 (GREEN)**

#### Verification Checklist

All must pass:

- [ ] SYNTHESIS.md has been read completely
- [ ] SKILL.md updated with patterns from research (not just original request)
- [ ] All existing reference files reviewed for staleness
- [ ] Reference files updated where research provided new information
- [ ] New reference files created if research revealed uncovered patterns
- [ ] Examples use current syntax from research (not training data)
- [ ] Citations updated with research sources

#### Verification Prompt

**Research Incorporation Verification:**

Before proceeding to GREEN, confirm:

1. Which SYNTHESIS.md sections did you incorporate? [List them]
2. Which files did you update? [List with line counts changed]
3. Did any reference files need updates? [Yes/No, which ones]
4. Are there new patterns from research not in existing files? [Yes/No, action taken]

**If any answer is 'None' or 'No action', STOP and review SYNTHESIS.md again.**

#### Cannot Proceed Until Verification Passes ✅

This gate prevents superficial "I updated SKILL.md" completions that ignore research depth.

---

## Phase 5: Changelog

### 5.1 Create .history directory

**YOU MUST be at repo root ($ROOT) before running this command.**

```bash
# CRITICAL: Run from repo root to avoid .claude/.claude/ path duplication
mkdir -p $ROOT/{skill-path}/.history
```

**WRONG:** `mkdir -p .claude/skill-library/...` (if already inside `.claude/` directory)
**RIGHT:** `mkdir -p $ROOT/.claude/skill-library/...` (always uses absolute path from repo root)

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
# Navigate to repo root first, then .claude for npm commands
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
cd "$ROOT/.claude" && npm run audit -- {skill-name}
```

### 7.2 Line Count Check

```bash
wc -l $ROOT/{skill-path}/SKILL.md
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

Use `Read(".claude/skill-library/claude/skill-management/pressure-testing-skill-content/SKILL.md")` for pressure testing:

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
