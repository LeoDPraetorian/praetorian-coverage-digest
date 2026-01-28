# Step 5.5: Verification Checkpoint

**Research Incorporation Verification (MANDATORY before Step 6)**

Before proceeding to GREEN, confirm:

1. Which SYNTHESIS.md sections did you incorporate? [List them]
2. Which files did you update? [List with line counts changed]
3. Did any reference files need updates? [Yes/No, which ones]
4. Are there new patterns from research not in existing files? [Yes/No, action taken]

**If any answer is 'None' or 'No action', STOP and review SYNTHESIS.md again.**

## Verification Checklist (All Must Pass)

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

## Reference File Line Count Gate

```bash
for file in {skill-path}/references/*.md; do
  lines=$(wc -l < "$file")
  [ "$lines" -gt 400 ] && echo "❌ BLOCKED: $(basename $file) is $lines lines (limit: 400)" && exit 1
done
echo '✅ All reference files within 400-line limit'
```

**Cannot proceed to Step 6 until verification passes** ✅
