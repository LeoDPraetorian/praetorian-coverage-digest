---
name: updating-skills
description: Use when modifying existing skills - TDD update workflow (RED-GREEN) with compliance validation.
allowed-tools: Read, Write, Edit, Bash, Grep, TodoWrite, Skill, AskUserQuestion
---

# Updating Skills

**TDD-driven skill updates with compliance validation.**

> **MANDATORY**: You MUST use TodoWrite to track phases.

---

## Quick Reference

| Step                 | Purpose              | Time     | Reference                 |
| -------------------- | -------------------- | -------- | ------------------------- |
| **1. 🔴 RED**        | Document failure     | 5 min    | tdd-methodology.md        |
| **2. Locate + Size** | Find skill, strategy | 2 min    | line-count-limits.md      |
| **3. Backup**        | Protect file         | 1 min    | backup-strategy.md        |
| **4. Research**      | Optional - content   | 5-10 min | orchestrating-research    |
| **5. Edit**          | Apply changes        | 5-15 min | progressive-disclosure.md |
| **6. 🟢 GREEN**      | Verify fix           | 5 min    | tdd-methodology.md        |
| **7. Compliance**    | Audit + line count   | 5 min    | auditing-skills           |
| **8. 🔵 REFACTOR**   | Pressure test        | 5-10 min | testing-skills            |

**Total**: 30-60 minutes

**Details**: See [references/update-workflow.md](references/update-workflow.md)

---

## When to Use

- Modifying existing skill
- User says "update X skill"
- Fixing issues found in skill

**NOT for**: Creating new skills (use `creating-skills`)

---

**Compliance Target:**
Updates must maintain compliance with the [Skill Compliance Contract](.claude/skills/managing-skills/references/skill-compliance-contract.md). Even small edits can break compliance (links, line count, references).

---

## How to Use

**Step 0: Navigate to repo root**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"
```

---

## Rationalization Prevention

Skill updates have many shortcuts that seem harmless but degrade quality. Watch for warning phrases and complete all steps.

**Reference**: See [shared rationalization prevention](../using-skills/references/rationalization-prevention.md) for:

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

**Step 1: Document RED** - What's wrong today? Test scenario shows failure.

**Statistical evidence**: Updates without RED documentation have ~35% regression rate (fix one thing, break another). The 2 minutes to document failure prevents hours of debugging side effects.

**Step 2: Locate + Size Check** - Find skill, check line count, decide strategy:

- <400 lines → Inline edit
- \>400 lines → Extract to references

**Step 3: Backup** - Always create .local backup before changes

**Statistical evidence**: ~15% of skill edits require rollback. Backups take 2 seconds and save hours of reconstruction.

**Step 4: Research (Optional)** - For significant content updates, consider using orchestrating-research. See [Research Integration](#research-integration-optional) section below.

**Step 5: Edit** ← POST-RESEARCH RESUME POINT

Apply changes using Edit or Write tool. Use information from the original request and any research (read ${OUTPUT_DIR}/SYNTHESIS.md if research was performed) to write real content. If the request references files, read and incorporate that content.

> **Phase Numbering Rule (when adding phases to skills):**
>
> - NEVER use fractional phase numbers (e.g., Phase 3.5, Phase 5.4)
> - ALWAYS renumber subsequent phases to maintain sequential integers
> - Sub-steps WITHIN a phase (Step 5.1, 5.2, 5.3) are acceptable for decomposition

**Step 6: Verify GREEN** - Re-test scenario, must pass

**Statistical evidence**: Updates that skip GREEN verification have ~25% failure rate (don't actually fix the problem). The 2 minutes to verify prevents re-doing the entire update.

**Step 7: Compliance** - Run audit, check line count (<500 hard limit)

**Step 8: REFACTOR** - For non-trivial changes, pressure test (optional for typos)

---

## Research Integration (Optional)

For significant content updates, consider using `orchestrating-research` before editing.

### When to Suggest Research

Ask user via AskUserQuestion if the update involves:

**Suggest Research:**

- Library/framework skill updates (TanStack Query, Zustand, React Hook Form, etc.)
- New API patterns or features
- Major version refreshes (React 18→19, etc.)
- Content expansions with new examples

**Skip Research:**

- Typo fixes and small clarifications
- Structural reorganization (moving to references/)
- Adding TodoWrite mandates
- Fixing broken links

### How to Integrate

**Between Step 3 (Backup) and Step 5 (Edit):**

If user selects 'Yes, invoke orchestrating-research':

1. **Write remaining steps to TodoWrite** (these persist across the research context switch):

   ```
   TodoWrite([
     { content: 'Step 4: Research', status: 'in_progress', activeForm: 'Researching' },
     { content: 'Step 5: Edit skill with research findings', status: 'pending', activeForm: 'Editing skill' },
     { content: 'Step 6: Verify GREEN', status: 'pending', activeForm: 'Verifying fix' },
     { content: 'Step 7: Compliance audit', status: 'pending', activeForm: 'Running compliance' },
     { content: 'Step 8: REFACTOR (if non-trivial)', status: 'pending', activeForm: 'Pressure testing' }
   ])
   ```

2. **Invoke orchestrating-research:**

   ```
   skill: 'orchestrating-research'
   ```

3. **When orchestrating-research returns with 'WORKFLOW_CONTINUATION_REQUIRED':**
   - Mark Step 4 as complete in TodoWrite
   - Read ${OUTPUT_DIR}/SYNTHESIS.md
   - Extract patterns, code examples, and citations
   - Continue immediately to Step 5 (next pending todo)

**Do NOT:**

- Report 'Research complete!' as if the update is done
- Summarize findings and wait for user to say 'continue'
- Mark all steps complete when only Step 4 is done
- Stop the workflow after research returns

**If user selects 'No, I have the information I need':**

- Use information from the original request to populate content
- If request references files (research output, examples), read and use them
- Write real content with actual code examples, not placeholder text
- Proceed directly to Step 5

---

## Context7 Documentation Refresh

Skills with context7 documentation can become stale (>30 days). Before updating, check staleness:

1. Read `.local/context7-source.json` if it exists
2. Check `fetchedAt` date - if >30 days old, refresh first
3. See [references/context7-refresh.md](references/context7-refresh.md) for refresh workflow

---

## Success Criteria

**Automatic Completion**: All success criteria should be achieved in a single continuous workflow without stopping for user continuation prompts between steps.

Update complete when:

1. ✅ RED documented
2. ✅ Backup created
3. ✅ Skill edited
4. ✅ Changelog updated
5. ✅ GREEN passed
6. ✅ Compliance passed (<500 lines)
7. ✅ REFACTOR (if non-trivial)
8. ✅ TodoWrite complete

---

## Related Skills

- `creating-skills` - Create new skills
- `orchestrating-research` - Research workflow for content updates (optional)
- `auditing-skills` - Compliance validation
- `fixing-skills` - Automated fixes
- `managing-skills` - Router

**References**:

- [update-workflow.md](references/update-workflow.md) - Detailed procedures
- [tdd-methodology.md](.claude/skills/managing-skills/references/tdd-methodology.md) - RED-GREEN-REFACTOR
- [line-count-limits.md](.claude/skills/managing-skills/references/patterns/line-count-limits.md) - Size strategy
- [progressive-disclosure.md](.claude/skills/managing-skills/references/progressive-disclosure.md) - Extraction patterns
