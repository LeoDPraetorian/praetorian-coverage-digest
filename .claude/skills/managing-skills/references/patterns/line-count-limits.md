# Line Count Limits

**Single source of truth for SKILL.md line count thresholds.**

This pattern is referenced by:

- `auditing-skills` - Validates against these thresholds
- `creating-skills` - Ensures new skills comply
- `updating-skills` - Maintains compliance during edits
- `fixing-skills` - Restores compliance when exceeded

---

## Why Line Count Matters

**Attention degradation beyond 500 lines.** Skills are read by Claude agents in their entirety. Long skills:

1. **Dilute critical instructions** - Important rules get lost in verbose content
2. **Increase skip likelihood** - Agents more likely to skip/skim sections
3. **Waste tokens** - Every line consumes context window
4. **Signal poor organization** - Indicates content should be in references/

**Progressive disclosure** is the solution: Keep SKILL.md as a high-level guide, extract detailed content to `references/` directory.

---

## Unified Thresholds

| Lines   | Status       | Action                                      |
| ------- | ------------ | ------------------------------------------- |
| < 350   | ✅ Safe zone | No action needed                            |
| 350-450 | ⚠️ Caution   | Consider extraction for next change         |
| 450-500 | ⚠️ Warning   | Plan extraction before adding content       |
| > 500   | ❌ FAIL      | MUST extract to references/ - blocks commit |

---

## Validation Script

```bash
#!/bin/bash
# Validate SKILL.md line count

SKILL_PATH="${1:-.}"
SKILL_FILE="$SKILL_PATH/SKILL.md"

if [ ! -f "$SKILL_FILE" ]; then
  echo "❌ ERROR: $SKILL_FILE not found"
  exit 1
fi

LINE_COUNT=$(wc -l < "$SKILL_FILE" | tr -d ' ')

if [ "$LINE_COUNT" -gt 500 ]; then
  echo "❌ FAIL: SKILL.md is $LINE_COUNT lines (limit: 500)"
  echo "   Action: Extract content to references/ directory"
  exit 1
elif [ "$LINE_COUNT" -gt 450 ]; then
  echo "⚠️ WARNING: Approaching limit ($LINE_COUNT/500)"
  echo "   Action: Plan extraction before adding more content"
elif [ "$LINE_COUNT" -gt 350 ]; then
  echo "ℹ️ CAUTION: In caution zone ($LINE_COUNT/500)"
  echo "   Action: Consider extraction for next update"
else
  echo "✅ PASS: Safe zone ($LINE_COUNT/500)"
fi
```

---

## Extraction Strategy

When line count exceeds 350 or approaches 500, extract content using progressive disclosure:

### What to Extract

1. **Detailed workflows** - Keep summary in SKILL.md, full steps in references/
2. **Code examples** - Large code blocks go to references/examples/
3. **Edge cases** - Common patterns in SKILL.md, edge cases in references/
4. **Historical context** - Why decisions were made goes to references/
5. **Troubleshooting guides** - Quick fixes in SKILL.md, detailed debug in references/

### Extraction Pattern

**Before (bloated SKILL.md):**

```markdown
## Phase 1: Setup

### Step 1.1: Create Directory

[20 lines of detailed instructions]

### Step 1.2: Initialize Files

[30 lines of detailed instructions]

### Step 1.3: Configure Settings

[40 lines of detailed instructions]
```

**After (lean SKILL.md + reference):**

```markdown
## Phase 1: Setup

1. Create directory structure
2. Initialize required files
3. Configure settings

See [Setup Reference](references/setup-workflow.md) for detailed instructions.
```

### Reference File Template

```markdown
# {Phase/Topic} Reference

**Parent skill:** [SKILL.md](../SKILL.md)

---

## Detailed Instructions

### Step 1.1: Create Directory

[Full instructions here]

### Step 1.2: Initialize Files

[Full instructions here]

### Step 1.3: Configure Settings

[Full instructions here]

---

## Examples

[Concrete examples with code]

---

## Troubleshooting

[Common issues and solutions]
```

---

## Related

- [Progressive Disclosure](../progressive-disclosure.md) - Complete guide to content organization
- [Skill Compliance Contract](../skill-compliance-contract.md) - Complete validation rules
- [File Organization](../file-organization.md) - Directory structure requirements
