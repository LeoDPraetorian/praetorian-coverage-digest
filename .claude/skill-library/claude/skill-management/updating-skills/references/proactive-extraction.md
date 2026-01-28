# Proactive Extraction (Step 2.4)

**BLOCKING GATE**: If capacity planning shows projected ≥450 lines, you MUST extract content before adding.

## Extraction Candidates (Priority Order)

1. **Verbose examples** - Move to references/examples.md
2. **Detailed procedures** - Move to references/detailed-procedures.md
3. **Edge cases** - Move to references/edge-cases.md or references/troubleshooting.md
4. **Pattern catalogs** - Move to references/patterns.md
5. **Long tables** (>10 rows) - Move to references/ with summary in SKILL.md

## Extraction Process

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

## Reference File Thresholds

| Lines   | Status      | Action                      |
| ------- | ----------- | --------------------------- |
| < 300   | ✅ Safe     | No action                   |
| 300-350 | ℹ️ Info     | Consider splitting          |
| 351-400 | ⚠️ Warning  | Plan split before adding    |
| > 400   | ❌ CRITICAL | MUST split - blocks proceed |

**Cannot bypass this gate.** If you think "I'll add it anyway and extract later", you're rationalizing - STOP and complete extraction first.
