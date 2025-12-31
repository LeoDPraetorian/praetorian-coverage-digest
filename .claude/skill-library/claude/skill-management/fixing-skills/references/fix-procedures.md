# Detailed Fix Procedures

**Complete process documentation for all Claude-automated, hybrid, human-required, and validation-only fixes.**

This document provides the detailed procedures referenced from SKILL.md. For workflow overview and quick reference, see [SKILL.md](../SKILL.md).

---

## Claude-Automated Fixes (Step 4b)

**Phases: 1, 3, 11, 13, 15, 17, 21**

Claude applies these fixes directly using Edit tool. No human confirmation needed - these require semantic understanding but have clear correct outcomes.

**Additional fix procedures** (section organization, visual readability, example quality) documented below are also Claude-automated but aren't tied to specific audit phases.

### Phase 1: Description Format

**When:** Description doesn't match "Use when..." pattern or >120 chars

**Process:**

1. Read SKILL.md content to understand purpose
2. Identify trigger condition ("Use when {situation}")
3. Identify 2-3 key capabilities
4. Generate: `Use when {trigger} - {capability1}, {capability2}`
5. Verify <120 characters
6. Apply with Edit tool

**Example transformation:**

```yaml
# Before (wrong format, too long)
description: This skill helps developers create new skills from scratch using a complete TDD workflow with validation

# After (Claude-generated)
description: Use when creating skills - TDD workflow (RED-GREEN-REFACTOR) with validation
```

### Phase 3: Line Count >500

**When:** SKILL.md exceeds 500 lines

**Process:**

1. Count lines and identify sections >50 lines
2. Prioritize extraction:
   - Code examples → `examples/{topic}.md`
   - Detailed workflows → `references/workflow.md`
   - Troubleshooting → `references/troubleshooting.md`
   - Edge cases → `references/advanced.md`
3. Create reference files with extracted content
4. Replace inline content with summary + link:

   ```markdown
   ### Detailed Workflow

   See [Detailed Workflow](references/workflow.md) for step-by-step instructions.
   ```

5. Re-count lines to verify <500

### Phase 11: cd Commands

**When:** cd commands use absolute paths or relative paths without REPO_ROOT

**Process:**

1. Find all cd commands in code blocks
2. For repo-relative paths, replace with:
   ```bash
   REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
   test -z "$REPO_ROOT" && REPO_ROOT=$(git rev-parse --show-toplevel)
   cd "$REPO_ROOT/{relative-path}"
   ```
3. Skip cd commands to temp directories or external paths

### Phase 13: TodoWrite Missing

**When:** Multi-step workflow lacks TodoWrite mandate

**Process:**

1. Detect workflow indicators:
   - Numbered lists with >3 items
   - Tables with "Phase" or "Step" columns
   - Headers like "Step 1:", "Phase 2:", etc.
2. Add mandate after workflow introduction:
   ```markdown
   > **You MUST use TodoWrite** to track progress. Steps get skipped without tracking.
   ```

### Fix Procedure: Section Organization (not an audit phase)

**When:** Skill missing required sections or sections out of order

**Process:**

1. Check for required sections:
   - Quick Reference (summary table at top)
   - When to Use / Overview (trigger conditions)
   - Workflow / How to Use (main content)
   - Related Skills (cross-references at bottom)
2. If missing section:
   - Generate section header
   - Add placeholder content based on skill purpose
   - Example: `## Related Skills\n\n- [skill-name](path) - Description`
3. If order is wrong:
   - Restructure to logical flow
   - Keep content intact, just reorganize

### Fix Procedure: Visual Readability (not an audit phase)

**When:** Skill has readability issues (wall-of-text, missing emphasis, etc.)

**Process:**

1. Identify wall-of-text paragraphs (>5-6 lines without breaks)
   - Break into shorter paragraphs at logical points
   - Convert lists of items to bullet points
2. Add emphasis to key terms:
   - **Bold** for important concepts
   - `code` for technical terms, commands, file names
3. Convert comma-separated items to bullet lists:
   - "A, B, and C" → "- A\n- B\n- C"
4. Add callouts for important notes:
   - `> **Note:** Important information here`
5. Ensure adequate whitespace between sections

### Phase 15: Orphan Detection

**When:** Library skill has no discovery path (not in any gateway or agent)

**Process:**

1. Run agent matching algorithm
2. Review suggested HIGH confidence matches
3. Add skill to appropriate gateway routing table
4. Or reference in relevant agent instructions

See [Agent Recommendation Patterns](../../../../skills/managing-skills/references/patterns/agent-recommendation-patterns.md).

### Phase 17: Gateway Structure

**When:** Gateway skill missing "Understanding This Gateway" section

**Process:**

1. Read gateway's routing table to understand coverage
2. Generate section from template:

   ```markdown
   ## Understanding This Gateway

   This gateway covers **{domain}** skills. It routes to {N} specialized skills organized by:

   - {category1}: {description}
   - {category2}: {description}

   > **IMPORTANT**: This gateway is part of the two-tier skill system...
   ```

### Phase 21: Line Number References

**When:** Skill contains static line number references (e.g., `file.go:123-127`)

**Process:**

1. Detect patterns: `file.ext:123` or `file.ext:123-456`
2. Read the referenced file (if exists in codebase)
3. Identify method/function at or near that line
4. Replace with durable pattern using Edit tool:

**Replacement patterns:**

```markdown
# Pattern 1: Method signature (preferred)
✅ `file.go` - `func (t *Type) MethodName(...)`

# Pattern 2: Structural description
✅ `file.go (between Match() and Invoke() methods)`

# Pattern 3: File only (for general references)
✅ `file.go`
```

**Example fix:**

```typescript
// Before
- Nuclei: `capabilities/nuclei/nuclei.go:167-171` (MockCollectors)

// After
- Nuclei: `capabilities/nuclei/nuclei.go` - `func (n *Nuclei) MockCollectors(port *model.Port)`
```

**Why this matters:**

- Line numbers become outdated with every code change
- Method signatures are stable across refactors
- Grep-friendly: developers can find instantly with `rg "func.*MethodName"`

**Reference:** See [code-reference-patterns.md](../../../../skills/managing-skills/references/patterns/code-reference-patterns.md)

### Semantic Criterion 7: Phase Numbering Hygiene

**When:** Fractional major phase numbers (Phase 3.5, Phase 5.4) found during semantic review

**Classification:** Claude-Automated (no user confirmation needed)

**Complete Process:**

**Step 1: Identify All Major Phases**

Scan SKILL.md and references/ for phase headings:
- Pattern: `## Phase X` or `## Step X`
- Build list of all current phase numbers

**Step 2: Create Renumbering Map**

Build mapping from old to new phase numbers:

```typescript
// Example: Phase 2 (Discovery) inserted between Phase 1 and 2
Current: Phase 1, 2, 3, 4, 5, 6, 7, 8, 9
After:   Phase 1, 2(new), 3, 4, 5, 6, 7, 8, 9, 10
Map: {
  2: 3,
  3: 4,
  4: 5,
  5: 6,
  6: 7,
  7: 8,
  8: 9,
  9: 10
}
```

**Step 3: Update Phase Headings**

Use Edit tool to renumber ALL major phase headings sequentially:
- Update `## Phase X` → `## Phase Y` in SKILL.md
- Update `## Phase X` → `## Phase Y` in references/phase-X-*.md files
- Rename phase reference files: `phase-4-impl.md` → `phase-5-impl.md`

**Step 4: Update Markdown Links**

Find and update all links to phase files:
- Pattern: `[Phase X](phase-X-file.md)` → `[Phase Y](phase-Y-file.md)`
- Update in SKILL.md and all reference files
- Example: `[Phase 4](phase-4-impl.md)` → `[Phase 5](phase-5-impl.md)`

**Step 5: Update Prose References (NEW)**

For ALL files in skill directory (SKILL.md + references/*):

1. **Find prose patterns** - Use regex to find phase references:
   - `/Phase\s+(\d+)\s*\(/gi` → "Phase 4 (" becomes "Phase 5 ("
   - `/Phase\s+(\d+)\s*:/gi` → "Phase 4:" becomes "Phase 5:"
   - `/Phase\s+(\d+)\s+output/gi` → "Phase 4 output" becomes "Phase 5 output"
   - `/to\s+Phase\s+(\d+)/gi` → "to Phase 4" becomes "to Phase 5"
   - `/from\s+Phase\s+(\d+)/gi` → "from Phase 4" becomes "from Phase 5"
   - `/return to Phase\s+(\d+)/gi` → "return to Phase 4" becomes "return to Phase 5" (case-insensitive)

2. **Apply renumbering map** - For each match:
   - Extract phase number
   - Look up in renumbering map
   - Replace with new number
   - **Preserve descriptive text**: "Phase 4 (implementation)" → "Phase 5 (implementation)"

3. **Target ALL reference files**:
   - troubleshooting.md
   - progress-persistence.md
   - agent-handoffs.md
   - phase-X-*.md files
   - Any other .md files in references/

4. **Exclusions**:
   - `.history/CHANGELOG` - Historical, don't modify
   - Code blocks - Might be external examples, skip fenced code
   - External files - Don't modify files outside skill directory

**Example prose updates:**

```markdown
# Before (troubleshooting.md)
If test fails, return to Phase 4 (implementation) and verify...
The Phase 3 output should include...
Navigate from Phase 2 to Phase 5 when...

# After (troubleshooting.md)
If test fails, return to Phase 5 (implementation) and verify...
The Phase 4 output should include...
Navigate from Phase 3 to Phase 6 when...
```

**Step 6: Verify Name Hints Match (NEW)**

After renumbering, validate descriptive hints:

1. Extract phase names from SKILL.md phase table or headings
2. For each prose reference with hint (e.g., "Phase 5 (Implementation)"):
   - Verify Phase 5 IS the implementation phase
   - If mismatch detected, flag for manual review

Example validation:

```typescript
// Phase table shows:
// Phase 5: Architecture
// Phase 6: Implementation

// Prose reference says:
"Return to Phase 5 (Implementation)" ← MISMATCH!

// Flag as: "WARNING: Phase hint mismatch at troubleshooting.md:108
// Says 'Implementation' but Phase 5 is 'Architecture'"
```

**Step 7: Report External References (Optional)**

Search for external references to this skill's phases:

```bash
grep -r "orchestrating-feature.*Phase [0-9]" .claude/skill-library .claude/skills
```

Report as INFO (do NOT auto-modify):
- "External reference found in writing-plans/SKILL.md:275 - manual review recommended"
- "External reference found in managing-skills/references/patterns/changelog-format.md:42 - manual review recommended"

**Why This Matters:**

When phases are inserted or renumbered:
- Formal headings and links get updated automatically
- But prose text like "Return to Phase 4 (implementation)" was being missed
- This caused confusing mismatches where prose pointed to wrong phases
- Now ALL references in the skill's ecosystem get updated together

**Example Complete Fix:**

```markdown
# orchestrating-feature-development after Phase 2 (Discovery) inserted

# Files updated by Step 3-4 (existing):
- SKILL.md: Phase headings and table
- phase-3-planning.md: Heading and filename
- All markdown links

# Files updated by Step 5 (NEW):
- troubleshooting.md:108: "Return to Phase 4 (implementation)" → "Return to Phase 5 (implementation)"
- troubleshooting.md:286: "Return to Phase 3 (architecture)" → "Return to Phase 4 (architecture)"
- troubleshooting.md:292: "Return to Phase 2 (planning)" → "Return to Phase 3 (planning)"
- progress-persistence.md:195: "Phase 3 output" → "Phase 4 output"
- phase-8-testing.md:218: "Return to Phase 4 (Implementation)" → "Return to Phase 5 (Implementation)"
```

---

## Hybrid Fixes (Step 4c)

**Phases: 4, 6, 10, 12, 19**

These have deterministic parts that Claude handles automatically, but ambiguous cases require user confirmation.

### Phase 4: Broken Links (Hybrid)

**Deterministic part:** If file exists elsewhere, correct the path automatically.

**Ambiguous part:** If file doesn't exist anywhere:

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Broken link to '{filename}'. How should I fix it?",
      header: "Broken Link",
      multiSelect: false,
      options: [
        {
          label: "Create placeholder with generated content",
          description: "Claude generates relevant content based on link context",
        },
        { label: "Remove the reference", description: "Delete the link from SKILL.md" },
        { label: "Skip for now", description: "Leave broken, fix manually later" },
      ],
    },
  ],
});
```

### Phase 6: Missing Scripts (Hybrid - Opt-in)

**Changed behavior:** Do NOT auto-create boilerplate scripts.

**Process:**

1. Analyze skill content for CLI indicators (`npm run`, command examples)
2. If no CLI indicators: Skip silently (many skills don't need scripts/)
3. If CLI indicators found:
   ```typescript
   AskUserQuestion({
     questions: [
       {
         question: "This skill has CLI commands but no scripts/ directory. Create it?",
         header: "Scripts",
         multiSelect: false,
         options: [
           {
             label: "Yes, create scripts/ with boilerplate",
             description: "Standard TypeScript CLI setup",
           },
           {
             label: "No, CLI commands are for user reference only",
             description: "Skip scripts/ creation",
           },
         ],
       },
     ],
   });
   ```

### Phase 10: Phantom References (Hybrid)

**Deterministic part:** References in deprecation registry → Replace automatically.

**Ambiguous part:** References not in registry:

1. Fuzzy match against existing skills
2. If close match found:
   ```typescript
   AskUserQuestion({
     questions: [
       {
         question: "Reference to '{phantom}' not found. Did you mean '{suggestion}'?",
         header: "Phantom Ref",
         multiSelect: false,
         options: [
           { label: "Yes, correct to '{suggestion}'", description: "Update reference" },
           { label: "No, remove the reference", description: "Delete phantom reference" },
           {
             label: "No, keep as-is (skill will be created)",
             description: "Mark for future creation",
           },
         ],
       },
     ],
   });
   ```

### Phase 12: CLI Error Handling (Hybrid)

**Deterministic part:** Change `process.exit(1)` → `process.exit(2)` in catch blocks.

**Claude-automated part:** Generate contextual error messages:

1. Analyze CLI purpose from code
2. Generate message: `Tool Error - {skill-name}: Failed to {action}`
3. Apply without confirmation (semantic but deterministic outcome)

### Fix Procedure: Example Quality (Hybrid - not an audit phase)

**Deterministic part:** Check examples have code blocks with language tags.

**Ambiguous part:** Assess example completeness:

1. Check for before/after pattern in examples
2. Verify examples are self-contained
3. If incomplete:
   ```typescript
   AskUserQuestion({
     questions: [
       {
         question: "Example at line {N} appears incomplete. How should I improve it?",
         header: "Example",
         multiSelect: false,
         options: [
           { label: "Add 'Before:' and 'After:' sections", description: "Show transformation" },
           { label: "Add missing context", description: "Make example self-contained" },
           { label: "Skip for now", description: "Leave example as-is" },
         ],
       },
     ],
   });
   ```

See [Visual Style Guidelines](../../../../skills/managing-skills/references/patterns/visual-style-guidelines.md).

### Phase 19: Broken Gateway Paths (Hybrid - Claude-Primary)

**No CLI auto-fix.** Removal is often the wrong fix.

**Process:**

1. Fuzzy match against existing skills
2. Present options:
   ```typescript
   AskUserQuestion({
     questions: [
       {
         question: "Gateway path '{path}' doesn't exist. How should I fix it?",
         header: "Gateway Path",
         multiSelect: false,
         options: [
           { label: "Correct to '{suggestion}'", description: "Fuzzy match found similar skill" },
           {
             label: "Remove this routing entry",
             description: "Skill doesn't exist and won't be created",
           },
           {
             label: "Keep entry (skill will be created)",
             description: "Mark as TODO for skill creation",
           },
         ],
       },
     ],
   });
   ```

---

## Human-Required Fixes (Step 4d)

**Phases: 8, 9, 20**

These require genuine human judgment. Provide interactive guidance.

### Phase 8: TypeScript Errors

**Process:**

1. Run `npm run build` in scripts/ to capture errors
2. Display errors to user
3. For each error, explain what's wrong
4. User fixes with guidance; Claude can suggest fixes but human verifies

### Phase 9: Bash Scripts

**Process:**

1. Identify bash scripts in skill
2. Explain TypeScript equivalent patterns
3. User performs migration with Claude guidance
4. Verify behavior preservation

### Phase 20: Coverage Gaps

**Process:**

1. Defer to `syncing-gateways` skill
2. This requires cross-gateway coordination
3. Human makes organizational decisions

---

## Validation-Only Phases (Step 4e)

**Phases: 14b-c**

These phases detect issues but cannot auto-fix due to requiring semantic understanding and manual review.

### Phase 14b: Code Block Quality

**Issues detected:**

- Missing language tags
- Lines exceeding 120 characters
- Mismatched language tags

**Process:**

1. Review audit output for specific code blocks with issues
2. Manually add language tags where missing
3. Break long lines for readability
4. Correct mismatched language tags

**No automated fix available** - requires human judgment on how to break lines and which language tags are appropriate.

### Phase 14c: Header Hierarchy

**Issues detected:**

- Headers with no content before next header
- Incorrect hierarchy levels (e.g., ## followed by ####)

**Process:**

1. Review audit output for headers with issues
2. Add content under empty headers or restructure
3. Correct header hierarchy to proper nesting

**No automated fix available** - requires understanding content flow and document structure.
