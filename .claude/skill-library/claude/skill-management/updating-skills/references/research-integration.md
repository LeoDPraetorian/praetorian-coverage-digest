# Research Integration (Optional)

For significant content updates, consider using `orchestrating-research` before editing.

## When to Suggest Research

**Before asking user**, check Context7 staleness if applicable:

```bash
if [ -f "$ROOT/{skill-path}/.local/context7-source.json" ]; then
  FETCHED=$(jq -r '.fetchedAt' "$ROOT/{skill-path}/.local/context7-source.json")
  DAYS_OLD=$(( ($(date +%s) - $(date -d "$FETCHED" +%s)) / 86400 ))
  if [ "$DAYS_OLD" -gt 30 ]; then
    echo "Context7 docs are >30 days stale - research recommended"
  fi
fi
```

Then ask user via AskUserQuestion if the update involves:

**Suggest Research:**

- Library/framework skill updates (TanStack Query, Zustand, React Hook Form, etc.)
- New API patterns or features
- Major version refreshes (React 18→19, etc.)
- Content expansions with new examples
- Context7 documentation >30 days old (include in question: "Context7 documentation is >30 days old. Research recommended to refresh.")

**Skip Research:**

- Typo fixes and small clarifications
- Structural reorganization (moving to references/)
- Adding TodoWrite mandates
- Fixing broken links

## How to Integrate

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
   Read(".claude/skill-library/research/orchestrating-research/SKILL.md")
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
