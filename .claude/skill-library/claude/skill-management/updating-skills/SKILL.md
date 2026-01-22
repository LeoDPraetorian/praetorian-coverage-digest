---
name: updating-skills
description: Use when modifying existing skills - TDD update workflow (RED-GREEN) with research integration (orchestrating-research), Context7 staleness detection, progressive disclosure extraction, capacity planning (<500 lines), and compliance validation.
allowed-tools: Read, Write, Edit, Bash, Grep, TodoWrite, Skill, AskUserQuestion
---

# Updating Skills

**TDD-driven skill updates with compliance validation.**

> **MANDATORY**: You MUST use TodoWrite to track phases.

---

## Quick Reference

| Step                 | Purpose                        | Time     | Reference                 |
| -------------------- | ------------------------------ | -------- | ------------------------- |
| **1. 🔴 RED**        | Document failure               | 5 min    | tdd-methodology.md        |
| **2. Locate + Size** | Find skill, capacity plan      | 3-5 min  | line-count-limits.md      |
| **2.1** Count        | Check current lines            | 1 min    | -                         |
| **2.2** Estimate     | Estimate addition size         | 1 min    | -                         |
| **2.3** Plan         | Calculate projected total      | 1 min    | -                         |
| **2.4** Extract      | Proactive extraction (if ≥450) | 5-10 min | progressive-disclosure.md |
| **3. Backup**        | Protect file                   | 1 min    | backup-strategy.md        |
| **4. Research**      | Optional - content             | 5-10 min | orchestrating-research    |
| **5. Edit**          | Apply changes (with subs)      | 5-15 min | update-workflow.md        |
| **5.1** Targets      | Identify files to update       | 2 min    | update-workflow.md        |
| **5.2** SKILL.md     | Update core sections           | 3-5 min  | progressive-disclosure.md |
| **5.3** References   | Update existing refs           | 3-5 min  | update-workflow.md        |
| **5.4** New Refs     | Create if needed               | 2-3 min  | update-workflow.md        |
| **5.5** Verify       | Research incorporation gate    | 2 min    | update-workflow.md        |
| **6. 🟢 GREEN**      | Verify fix                     | 5 min    | tdd-methodology.md        |
| **7. Compliance**    | Audit + line count             | 5 min    | auditing-skills           |
| **8. 🔵 REFACTOR**   | Pressure test                  | 5-10 min | (LIBRARY)                 |

**Total**: 30-60 minutes

**Details**: See [references/update-workflow.md](references/update-workflow.md)

**TDD Compliance:**

Updates without proper TDD (agent spawning for RED and GREEN) have:

- 35% regression rate (fix one thing, break another)
- 25% failure to actually solve the problem
- 40% risk of building the wrong solution

The 10 minutes for proper RED/GREEN verification prevents hours of rework.

---

## When to Use

- Modifying existing skill
- User says "update X skill"
- Fixing issues found in skill

**NOT for**: Creating new skills (use `creating-skills`)

---

**Compliance Target:**
Updates must maintain compliance with the [Skill Compliance Contract](../../../../skills/managing-skills/references/skill-compliance-contract.md). Even small edits can break compliance (links, line count, references).

---

## How to Use

**Step 0: Navigate to repo root**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"
```

---

## Rationalization Prevention

Skill updates have many shortcuts that seem harmless but degrade quality. Watch for warning phrases and complete all steps.

**Reference**: See [shared rationalization prevention](../../../../skills/using-skills/references/rationalization-prevention.md) for:

- Statistical evidence (technical debt ~10% fix rate, 'later' ~5% completion)
- Phrase detection patterns ('close enough', 'just this once', 'I'll fix it later')
- Override protocol (requires AskUserQuestion with explicit risk disclosure)

### Skill Update Rationalizations

See [references/rationalization-table.md](references/rationalization-table.md) for domain-specific rationalizations.

**Key principle**: If you detect rationalization phrases in your thinking, STOP. Return to the current step. Complete it fully before proceeding.

---

## Workflow Continuation Rules

**8 steps run automatically Step 1 → 8. ONLY stop for:** AskUserQuestion (research decision), Step 6 GREEN verification approval, Step 8 REFACTOR pressure tests.

**How continuation works across research:**

1. Step 4 writes remaining steps to TodoWrite before invoking research
2. orchestrating-research completes and signals WORKFLOW_CONTINUATION_REQUIRED
3. Agent checks TodoWrite, sees pending Step 5
4. Agent continues with Step 5 → 6 → 7 → 8

**WRONG:** Step 4 → Research completes → 'Research complete! Key findings...' → STOPS ❌
**RIGHT:** Step 4 → Research completes → Check TodoWrite → Step 5 → ... → Step 8 → 'Update complete' ✅

---

**Step 1: Document RED - Prove Current Behavior Fails**

**You CANNOT skip this phase. TDD is mandatory.**

### 1.1 Document the Problem

What's wrong with the skill today? What gap exists?

### 1.2 Define Test Scenario

Describe a specific scenario where the skill currently fails or produces wrong behavior.

### 1.3 Capture Failure Behavior (AGENT SPAWNING MANDATORY)

**CRITICAL**: You MUST spawn an agent to observe actual failure. Document review is NOT sufficient.

```
Task(subagent_type: "general-purpose", prompt: "Load {skill-name} skill. Scenario: {from 1.2}. Perform this task following current skill guidance. Document your approach step by step.")
```

**Capture verbatim:** (1) Approach taken, (2) Incorrect behavior, (3) What the skill told agent to do, (4) What agent actually did.

**❌ NOT ACCEPTABLE:** "The skill currently says..." / "This would fail because..." (hypothetical)
**✅ REQUIRED:** Actual Task invocation + verbatim output + specific failure quotes

**See:** [references/tdd-verification.md](../../../../skills/managing-skills/references/tdd-methodology.md) for detailed capture format.

**Statistical evidence**: Updates without proper TDD (agent spawning for RED) have ~35% regression rate (fix one thing, break another). The 10 minutes for proper RED capture prevents hours of debugging side effects.

**Step 2: Locate + Size Check** - Find skill, check line count, decide strategy

### 2.1 Check Current Line Count

```bash
wc -l {skill-path}/SKILL.md
```

### 2.2 Estimate Addition Size

How many lines will your update add? Consider:

- New sections: ~20-40 lines each
- Examples: ~10-15 lines each
- New workflow steps: ~15-25 lines each
- Tables: ~5-10 lines each

Be conservative - round up.

### 2.3 Capacity Planning (MANDATORY)

**Calculate projected total: `current_lines + estimated_addition`**

| Projected Total | Status     | Action REQUIRED                                     |
| --------------- | ---------- | --------------------------------------------------- |
| <450            | ✅ Safe    | Proceed to Step 5 (inline edit)                     |
| 450-480         | ⚠️ Caution | Extract verbose sections FIRST (Step 2.4), THEN add |
| 480-500         | ⚠️ Warning | Extract verbose sections FIRST (Step 2.4), THEN add |
| >500            | ❌ BLOCKED | MUST extract before adding (Step 2.4 mandatory)     |

**You CANNOT proceed to Step 5 (Edit) if projected total ≥450 without completing Step 2.4 first.**

### 2.4 Proactive Extraction (When Required)

**BLOCKING GATE**: If capacity planning shows projected ≥450 lines, you MUST extract content before adding.

#### Extraction Candidates (Priority Order)

1. **Verbose examples** - Move to references/examples.md
2. **Detailed procedures** - Move to references/detailed-procedures.md
3. **Edge cases** - Move to references/edge-cases.md or references/troubleshooting.md
4. **Pattern catalogs** - Move to references/patterns.md
5. **Long tables** (>10 rows) - Move to references/ with summary in SKILL.md

#### Extraction Process

1. **Identify sections to extract** (target: create 80-100 line buffer)
2. **Create reference file** with extracted content
3. **Replace in SKILL.md** with 2-3 sentence summary + link
4. **Verify new line count** - Must be <400 to proceed

```bash
# After extraction
wc -l {skill-path}/SKILL.md
# Should show significant reduction (80-100 lines freed)
```

5. **Recalculate capacity**: `new_current + estimated_addition`
6. **If now <450**: Proceed to Step 3 (Backup) then Step 5 (Edit)
7. **If still ≥450**: Extract more content, repeat
8. **Verify extracted reference files are <400 lines:**

```bash
for file in {skill-path}/references/*.md; do
  lines=$(wc -l < "$file")
  if [ "$lines" -gt 400 ]; then
    echo "❌ CRITICAL: $(basename $file) is $lines lines - must split before proceeding"
    exit 1
  fi
done
```

**Reference file thresholds (from line-count-limits.md):**

| Lines   | Status      | Action                      |
| ------- | ----------- | --------------------------- |
| < 300   | ✅ Safe     | No action                   |
| 300-350 | ℹ️ Info     | Consider splitting          |
| 351-400 | ⚠️ Warning  | Plan split before adding    |
| > 400   | ❌ CRITICAL | MUST split - blocks proceed |

**Cannot bypass this gate.** If you think "I'll add it anyway and extract later", you're rationalizing - STOP and complete extraction first.

**Step 3: Backup** - Always create .local backup before changes

**Statistical evidence**: ~15% of skill edits require rollback. Backups take 2 seconds and save hours of reconstruction.

**Step 4: Research (Optional)** - For significant content updates, consider using orchestrating-research. See [Research Integration](#research-integration-optional) section below.

**Step 5: Edit** ← POST-RESEARCH RESUME POINT

Apply changes using Edit or Write tool. When research was performed, Step 5 MUST expand into granular sub-steps tracked in TodoWrite.

> **Phase Numbering Rule (when adding phases to skills):**
>
> - NEVER use fractional phase numbers (e.g., Phase 3.5, Phase 5.4)
> - ALWAYS renumber subsequent phases to maintain sequential integers
> - Sub-steps WITHIN a phase (Step 5.1, 5.2, 5.3) are acceptable for decomposition

**Step 5.1: Identify Update Targets**

If research was performed, read SYNTHESIS.md and determine which files need updates:

```
TodoWrite([
  { content: 'Step 5.1: Identify update targets', status: 'in_progress', activeForm: 'Identifying targets' },
  { content: 'Step 5.2: Update SKILL.md Quick Reference', status: 'pending', activeForm: 'Updating Quick Reference' },
  { content: 'Step 5.3: Update SKILL.md workflow sections', status: 'pending', activeForm: 'Updating workflow' },
  { content: 'Step 5.4: Update references/[file1].md', status: 'pending', activeForm: 'Updating file1' },
  { content: 'Step 5.5: Update references/[file2].md', status: 'pending', activeForm: 'Updating file2' },
  { content: 'Step 5.6: Verify research incorporation', status: 'pending', activeForm: 'Verifying incorporation' },
  ...remaining steps
])
```

1. Read current SKILL.md to identify sections
2. List existing references/ files (ls -la references/)
3. Determine which need updates based on SYNTHESIS.md topics

**Step 5.2: Update SKILL.md Core Sections**

Apply changes to:

- Quick Reference table
- Workflow/procedure sections
- Examples and patterns
- Use research findings for current syntax, not training data

**Step 5.3: Update Existing References/ Files**

For each file in references/, check if SYNTHESIS.md has relevant findings:

1. **Check relevance**: Does this file's topic appear in research?
2. **If yes**: Compare current content with research findings
   - Update outdated syntax/APIs
   - Add new patterns discovered
   - Remove deprecated approaches
   - Update citations/links
3. **If no**: File may be orthogonal to research - document "No updates needed"
4. **Track in TodoWrite**: One item per file that needs updating

See [update-workflow.md](references/update-workflow.md#updating-existing-reference-files) for detailed guidance.

**Step 5.4: Create New Reference Files (If Needed)**

If research reveals patterns not covered by existing files:

- Create new reference file in references/
- Follow progressive disclosure patterns
- Link from SKILL.md Related Skills or References section

**Line count constraint:** New reference files must be <400 lines. If content exceeds this, split into multiple files by H2 section.

**Skill Reference Validation & Semantic Verification:**

If update adds skill references to Integration, you MUST:

1. Validate the skill exists (CORE vs LIBRARY)
2. **READ the skill's SKILL.md** to understand its content
3. Determine correct relationship type (Requires vs Calls vs Pairs With)

**See:** [update-workflow.md § Skill Reference Validation](references/update-workflow.md#skill-reference-validation) for complete decision tree, semantic verification procedure, and format requirements.

**Step 5.5: Verification Checkpoint**

**Research Incorporation Verification (MANDATORY before Step 6):**

Before proceeding to GREEN, confirm:

1. Which SYNTHESIS.md sections did you incorporate? [List them]
2. Which files did you update? [List with line counts changed]
3. Did any reference files need updates? [Yes/No, which ones]
4. Are there new patterns from research not in existing files? [Yes/No, action taken]

**If any answer is 'None' or 'No action', STOP and review SYNTHESIS.md again.**

Verification checklist (all must pass):

- [ ] SYNTHESIS.md has been read completely
- [ ] SKILL.md updated with patterns from research (not just original request)
- [ ] All existing reference files reviewed for staleness
- [ ] Reference files updated where research provided new information
- [ ] New reference files created if research revealed uncovered patterns
- [ ] Examples use current syntax from research (not training data)
- [ ] Citations updated with research sources
- [ ] All reference files <400 lines (verify with: `wc -l references/*.md`)
- [ ] All NEW skill references validated per Step 5 (CORE/LIBRARY format with Read() paths)
- [ ] For each Integration skill reference: READ the referenced skill's SKILL.md
- [ ] For each Integration skill reference: Verified relationship type (Requires/Calls/Pairs With) based on actual content using decision tree
- [ ] Library skill references have (LIBRARY) annotation with Read() path on sub-bullet
- [ ] Related Skills section removed if present (obsolete)
- [ ] Cross-skill links use `.claude/` paths, NOT relative `../../` paths (Phase 27)

**Reference file line count gate:**

```bash
for file in {skill-path}/references/*.md; do
  lines=$(wc -l < "$file")
  [ "$lines" -gt 400 ] && echo "❌ BLOCKED: $(basename $file) is $lines lines (limit: 400)" && exit 1
done
echo '✅ All reference files within 400-line limit'
```

**Cannot proceed to Step 6 until verification passes** ✅

**Step 6: Verify GREEN - Prove Fix Works**

**The update is only done when it passes the original test.**

### 6.1 Re-Test the Original Scenario (AGENT SPAWNING MANDATORY)

**CRITICAL**: You MUST spawn an agent WITH the updated skill to verify behavioral change. Document review is NOT sufficient.

```
Task(subagent_type: "general-purpose", prompt: "MANDATORY SKILL: Read('{skill-path}/SKILL.md') to get updated version. Scenario: {from Step 1.2}. 1) Load the updated skill, 2) Perform task following new guidance, 3) Document approach step by step.")
```

**Compare RED vs GREEN:** Approach taken, commands used, behavior differences.

**❌ NOT ACCEPTABLE:** "The updated skill now provides..." / "This should fix because..." (hypothetical)
**✅ REQUIRED:** Actual Task invocation + verbatim output + side-by-side comparison with RED output

**See:** [references/tdd-verification.md](../../../../skills/managing-skills/references/tdd-methodology.md) for comparison template.

### 6.2 Verify the Gap is Closed

Ask via AskUserQuestion with **verbatim quotes** from both RED (Step 1.3) and GREEN (Step 6.1) agent outputs, plus observed behavioral differences.

Options:

- Yes, gap closed (proceed to Step 7)
- Partially closed (return to Step 5, improve)
- No, still fails (return to Step 5, rethink)

**If "Partially" or "No"**: Go back to Step 5 and improve the changes.

**Statistical evidence**: Updates that skip proper GREEN verification (agent spawning) have ~25% failure to actually solve the problem and ~40% risk of building the wrong solution. The 10 minutes for proper RED/GREEN verification prevents hours of rework.

**Step 7: Compliance** - Run audit, verify line counts:

- SKILL.md <500 lines (hard limit)
- Each reference file <400 lines (hard limit)

```bash
wc -l {skill-path}/SKILL.md
wc -l {skill-path}/references/*.md
```

**Step 5 skill reference check:** Integration section must use bullet list format. Library skills require (LIBRARY) annotation with Read() path on sub-bullet. Related Skills sections are obsolete and should be removed.

**Step 8: REFACTOR** - For non-trivial changes, pressure test:

```
Read(".claude/skill-library/claude/skill-management/pressure-testing-skill-content/SKILL.md")
```

If loopholes found, fix with TDD verification:

```
Read(".claude/skill-library/claude/skill-management/closing-rationalization-loopholes/SKILL.md")
```

Optional for typos/trivial changes.

---

## Research Integration (Optional)

For significant content updates involving library/framework skills, new API patterns, or Context7 documentation >30 days old, consider using `orchestrating-research` before Step 5 (Edit). Research integrates between Step 3 (Backup) and Step 5 (Edit), with workflow continuation resuming automatically at Step 5 after research completes.

**See:** [references/research-integration.md](references/research-integration.md) for when to suggest research, staleness checks, integration workflow, and continuation protocol.

---

## Success Criteria

**Automatic Completion**: All success criteria should be achieved in a single continuous workflow without stopping for user continuation prompts between steps.

Update complete when:

1. ✅ RED documented
2. ✅ Backup created
3. ✅ Skill edited
4. ✅ Changelog updated (see update-workflow.md Phase 5)
5. ✅ GREEN passed
6. ✅ Compliance passed (<500 lines)
7. ✅ REFACTOR (if non-trivial)
8. ✅ TodoWrite complete

---

## Integration

### Called By

- `managing-skills` (CORE) router - `/skill-manager update` command
- User direct invocation when modifying existing skills

### Requires (invoke before starting)

None - standalone workflow initiator

### Calls (during execution)

- **`orchestrating-research`** (LIBRARY) - Step 4 (optional)
  - Purpose: Research workflow for content updates
  - `Read(".claude/skill-library/research/orchestrating-research/SKILL.md")`
- **`auditing-skills`** (LIBRARY) - Step 7
  - Purpose: Compliance validation
  - `Read(".claude/skill-library/claude/skill-management/auditing-skills/SKILL.md")`
- **`pressure-testing-skill-content`** (LIBRARY) - Step 8
  - Purpose: Systematic pressure test scenarios for REFACTOR phase
  - `Read(".claude/skill-library/claude/skill-management/pressure-testing-skill-content/SKILL.md")`
- **`closing-rationalization-loopholes`** (LIBRARY) - Step 8 (if loopholes found)
  - Purpose: TDD methodology for fixing loopholes
  - `Read(".claude/skill-library/claude/skill-management/closing-rationalization-loopholes/SKILL.md")`

### Pairs With (conditional)

- **`creating-skills`** (LIBRARY) - Update reveals need for new skill
  - Purpose: Create new skills instead of updating
  - `Read(".claude/skill-library/claude/skill-management/creating-skills/SKILL.md")`
- **`fixing-skills`** (LIBRARY) - When audit fails
  - Purpose: Automated compliance fixes
  - `Read(".claude/skill-library/claude/skill-management/fixing-skills/SKILL.md")`

---

## References

- [update-workflow.md](references/update-workflow.md) - Detailed procedures
- [tdd-methodology.md](../../../../skills/managing-skills/references/tdd-methodology.md) - RED-GREEN-REFACTOR
- [tdd-verification.md](../../../../skills/managing-skills/references/tdd-methodology.md) - Agent spawning requirements
- [line-count-limits.md](../../../../skills/managing-skills/references/patterns/line-count-limits.md) - Size strategy
- [progressive-disclosure.md](../../../../skills/managing-skills/references/progressive-disclosure.md) - Extraction patterns
