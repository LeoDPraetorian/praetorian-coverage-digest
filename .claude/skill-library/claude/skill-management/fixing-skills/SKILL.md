---
name: fixing-skills
description: Use when audit failed, fixing compliance errors, broken links, phantom references - orchestrates deterministic/hybrid/Claude-automated fixes
allowed-tools: Read, Edit, Write, Bash, AskUserQuestion, TodoWrite, Skill
---

# Fixing Skills

**Intelligent compliance remediation using three-tier fix orchestration.**

> **You MUST use TodoWrite** to track fix progress when handling multiple issues.

**Three-tier fix model:**
- **Deterministic**: TypeScript CLI auto-fix (phases 2, 5, 7, 14a-c, 16, 18)
- **Hybrid**: CLI + Claude reasoning (phases 4, 6, 10, 12, 19)
- **Claude-Automated**: Claude reasoning only (phases 1, 3, 11, 13, 15, 17, 21)
- **Human-Required**: Interactive guidance (phases 8, 9, 20)

**Note:** Phases 14a-c are the only Phase 14 audit phases with TypeScript implementations. Additional fix procedures documented below (section organization, visual readability, example quality) are Claude-only remediation steps, not audit phases.

See [Phase Categorization](../../../../skills/managing-skills/references/patterns/phase-categorization.md) for complete breakdown.

---

## Quick Reference

| Category | Phases | Handler | User Interaction |
|----------|--------|---------|------------------|
| Deterministic | 2, 5, 7, 14a-c, 16, 18 | CLI `--fix` | None (auto-apply) |
| Hybrid | 4, 6, 10, 12, 19 | CLI + Claude | Confirm ambiguous cases |
| Claude-Automated | 1, 3, 11, 13, 15, 17, 21 | Claude reasoning | None (Claude applies) |
| Human-Required | 8, 9, 20 | Interactive | Full user guidance |

**Compliance Target:**
Fixes restore compliance with the [Skill Compliance Contract](../../../../skills/managing-skills/references/skill-compliance-contract.md).

---

## Workflow Overview

```
1. Run Audit          → Get issues list
2. Create Backup      → Protect against mistakes
3. Categorize Issues  → Route to correct handler
4. Apply Fixes:
   a. Deterministic   → CLI auto-fix (no confirmation)
   b. Claude-Automated→ Claude applies (no confirmation)
   c. Hybrid          → Claude + confirm ambiguous cases
   d. Human-Required  → Full interactive guidance
5. Re-Audit           → Verify all fixes worked
6. Update Changelog   → Document changes
```

---

## Step 0: Navigate to Repository Root (MANDATORY)

**Execute BEFORE any fix operation:**

```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
test -z "$REPO_ROOT" && REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"
```

**See:** [Repository Root Navigation](references/patterns/repo-root-detection.md)

**⚠️ If skill file not found:** You are in the wrong directory. Navigate to repo root first. The file exists, you're just looking in the wrong place.

**Cannot proceed without navigating to repo root** ✅

---

## Step 1: Run Audit

```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
test -z "$REPO_ROOT" && REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT/.claude" && npm run audit -- {skill-name}
```

**Capture output for issue categorization.**

---

## Step 2: Create Backup

**🚨 MANDATORY** - See [Backup Strategy](../../../../skills/managing-skills/references/patterns/backup-strategy.md).

```bash
mkdir -p {skill-path}/.local
TIMESTAMP=$(date +%Y-%m-%d-%H-%M-%S)
cp {skill-path}/SKILL.md {skill-path}/.local/${TIMESTAMP}-pre-fix.bak
```

---

## Step 3: Categorize Issues

Based on audit output, group issues by handler:

```
Issues found:
  Deterministic:      Phase 2 (allowed-tools), Phase 5 (directories)
  Claude-Automated:   Phase 1 (description), Phase 3 (line count)
  Hybrid:             Phase 10 (phantom ref)
  Human-Required:     Phase 8 (TypeScript errors)
```

---

## Step 4a: Apply Deterministic Fixes (fixing-skills CLI)

**Phases: 2, 4, 5, 6, 7, 10, 12, 14a-c, 16, 18**
For table formatting fixes: `prettier --write` - see [Table Formatting](../../../../skills/managing-skills/references/table-formatting.md)

```bash
npm run -w @chariot/fixing-skills fix -- {skill-name}
```

**No confirmation needed.** These are mechanical transformations with one correct answer.

---

## Step 4b: Apply Claude-Automated Fixes

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

---

## Step 4c: Apply Hybrid Fixes

**Phases: 4, 6, 10, 12, 19**

These have deterministic parts that Claude handles automatically, but ambiguous cases require user confirmation.

### Phase 4: Broken Links (Hybrid)

**Deterministic part:** If file exists elsewhere, correct the path automatically.

**Ambiguous part:** If file doesn't exist anywhere:
```typescript
AskUserQuestion({
  questions: [{
    question: "Broken link to '{filename}'. How should I fix it?",
    header: "Broken Link",
    multiSelect: false,
    options: [
      { label: "Create placeholder with generated content", description: "Claude generates relevant content based on link context" },
      { label: "Remove the reference", description: "Delete the link from SKILL.md" },
      { label: "Skip for now", description: "Leave broken, fix manually later" }
    ]
  }]
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
     questions: [{
       question: "This skill has CLI commands but no scripts/ directory. Create it?",
       header: "Scripts",
       multiSelect: false,
       options: [
         { label: "Yes, create scripts/ with boilerplate", description: "Standard TypeScript CLI setup" },
         { label: "No, CLI commands are for user reference only", description: "Skip scripts/ creation" }
       ]
     }]
   });
   ```

### Phase 10: Phantom References (Hybrid)

**Deterministic part:** References in deprecation registry → Replace automatically.

**Ambiguous part:** References not in registry:
1. Fuzzy match against existing skills
2. If close match found:
   ```typescript
   AskUserQuestion({
     questions: [{
       question: "Reference to '{phantom}' not found. Did you mean '{suggestion}'?",
       header: "Phantom Ref",
       multiSelect: false,
       options: [
         { label: "Yes, correct to '{suggestion}'", description: "Update reference" },
         { label: "No, remove the reference", description: "Delete phantom reference" },
         { label: "No, keep as-is (skill will be created)", description: "Mark for future creation" }
       ]
     }]
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
     questions: [{
       question: "Example at line {N} appears incomplete. How should I improve it?",
       header: "Example",
       multiSelect: false,
       options: [
         { label: "Add 'Before:' and 'After:' sections", description: "Show transformation" },
         { label: "Add missing context", description: "Make example self-contained" },
         { label: "Skip for now", description: "Leave example as-is" }
       ]
     }]
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
     questions: [{
       question: "Gateway path '{path}' doesn't exist. How should I fix it?",
       header: "Gateway Path",
       multiSelect: false,
       options: [
         { label: "Correct to '{suggestion}'", description: "Fuzzy match found similar skill" },
         { label: "Remove this routing entry", description: "Skill doesn't exist and won't be created" },
         { label: "Keep entry (skill will be created)", description: "Mark as TODO for skill creation" }
       ]
     }]
   });
   ```

---

## Step 4d: Guide Human-Required Fixes

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

## Step 5: Re-Audit

```bash
npm run audit -- {skill-name}
```

**Expected:** All phases pass. If failures remain, return to Step 3.

---

## Step 6: Update Changelog

See [Changelog Format](../../../../skills/managing-skills/references/patterns/changelog-format.md).

```bash
mkdir -p {skill-path}/.history
```

Document fixes applied with method (CLI, Claude, Hybrid, Manual).

---

## Common Scenarios

### Scenario 1: New Skill Cleanup
**Typical issues:** Phase 1 (description), Phase 5 (directories), Phase 4 (broken links)
**Fix order:** CLI (5) → Claude-Auto (1) → Hybrid (4)

### Scenario 2: Over-Long Skill
**Typical issues:** Phase 3 (>500 lines)
**Fix:** Claude-Auto (3) - Extract sections to references/

### Scenario 3: Legacy Skill Migration
**Typical issues:** Phase 9 (bash), Phase 11 (cd paths), Phase 13 (no TodoWrite)
**Fix order:** Claude-Auto (11, 13) → Human (9)

### Scenario 4: Visual/Style Cleanup
**Typical issues:** Phase 14a (tables), Phase 14b (code blocks), Phase 14c (headers), Phase 14e (readability)
**Fix order:** CLI (14a-c) → Claude-Auto (14e)

### Scenario 5: Orphan Library Skill
**Typical issues:** Phase 15 (no gateway or agent reference)
**Fix:** Claude-Auto (15) - Add to appropriate gateway or agent

---

## Related Skills

- `creating-skills` - Create new skills (uses this for final cleanup)
- `updating-skills` - Update existing skills (uses this for compliance)
- `auditing-skills` - Validate skills (identifies issues to fix)
