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

| Phase             | Purpose            | Time     | Reference                 |
| ----------------- | ------------------ | -------- | ------------------------- |
| **1. 🔴 RED**     | Document failure   | 5 min    | tdd-methodology.md        |
| **2. Locate**     | Find skill file    | 1 min    | -                         |
| **3. Size Check** | Determine strategy | 2 min    | line-count-limits.md      |
| **4. Backup**     | Protect file       | 1 min    | backup-strategy.md        |
| **5. Edit**       | Apply changes      | 5-15 min | progressive-disclosure.md |
| **6. 🟢 GREEN**   | Verify fix         | 5 min    | tdd-methodology.md        |
| **7. Compliance** | Audit + line count | 5 min    | auditing-skills           |

**Total**: 25-45 minutes

**Details**: See [references/update-workflow.md](references/update-workflow.md)

---

## When to Use

- Modifying existing skill
- User says "update X skill"
- Fixing issues found in skill

**NOT for**: Creating new skills (use `creating-skills`)

---

## How to Use

**Step 0: Navigate to repo root**

```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
test -z "$REPO_ROOT" && REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"
```

**Step 1: Document RED** - What's wrong today? Test scenario shows failure.

**Step 2: Locate + Size Check** - Find skill, check line count, decide strategy:

- <400 lines → Inline edit
- > 400 lines → Extract to references

**Step 3: Backup** - Always create .local backup before changes

**Step 3.5: Research (Optional)** - For significant content updates, consider using researching-skills

**Step 4: Edit** - Apply minimal fix using Edit or Write tool

**Step 5: Verify GREEN** - Re-test scenario, must pass

**Step 6: Compliance** - Run audit, check line count (<500 hard limit)

**Step 7: REFACTOR** - For non-trivial changes, pressure test (optional for typos)

---

## Research Integration (Optional)

For significant content updates, consider using `researching-skills` before editing.

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

Between **Step 3 (Backup)** and **Step 4 (Edit)**, if update involves significant content:

```typescript
AskUserQuestion({
  questions: [
    {
      question:
        "This update involves significant content changes. Would you like to research first?",
      header: "Research",
      multiSelect: false,
      options: [
        {
          label: "Yes, invoke researching-skills",
          description: "Recommended for library/framework updates",
        },
        { label: "No, I have the information I need", description: "Skip research phase" },
      ],
    },
  ],
});
```

**If user selects "Yes":**

```typescript
Read(".claude/skill-library/claude/skill-management/researching-skills/SKILL.md");
```

The researching-skills skill provides:

1. **Codebase research** - Find similar patterns in existing skills
2. **Context7 research** - Fetch official documentation from external sources
3. **Web research** - Supplemental articles and guides

**After research completes**, return to Step 4 (Edit) with gathered information.

---

## Context7 Documentation Refresh

Skills with context7 documentation can become stale (>30 days). The CLI automatically:

- Detects staleness before updates
- Prompts to refresh documentation first
- Provides refresh instructions if needed

**For complete workflow**, see [references/context7-refresh.md](references/context7-refresh.md)

---

## Success Criteria

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
- `researching-skills` - Research workflow for content updates (optional)
- `auditing-skills` - Compliance validation
- `fixing-skills` - Automated fixes
- `managing-skills` - Router

**References**:

- [update-workflow.md](references/update-workflow.md) - Detailed procedures
- [tdd-methodology.md](../../../../../skills/managing-skills/references/tdd-methodology.md) - RED-GREEN-REFACTOR
- [line-count-limits.md](../../../../../skills/managing-skills/references/patterns/line-count-limits.md) - Size strategy
- [progressive-disclosure.md](../../../../../skills/managing-skills/references/progressive-disclosure.md) - Extraction patterns
