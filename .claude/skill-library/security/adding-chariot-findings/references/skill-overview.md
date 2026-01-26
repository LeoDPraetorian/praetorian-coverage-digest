# Skill Overview

**What the adding-chariot-findings skill does and how it works.**

---

## Input

User: _"Create Chariot risk for the OTM developer Lambda privilege escalation finding"_

## Workflow

1. **Collects risk details** via AskUserQuestion (ID, status, asset ARN)
2. **Identifies evidence files** from current analysis
3. **Generates CSV file** with proper bulk mode format
4. **Executes:** `praetorian chariot script add-finding --bulk findings.csv`
5. **Non-interactive** - All data in CSV, no terminal prompts

## Output

- Risk created in Chariot with status TC (discovered)
- AWS/IAM asset created and linked
- Definition associated (from msp-definitions repo)
- Evidence files attached
- Summary of created resources

---

## Why Bulk Mode?

**Advantages over interactive mode:**

- ✅ **Non-interactive** - No terminal prompts, single command execution
- ✅ **Supports AWS assets** - Uses SDK internally (CLI doesn't support AWS assets)
- ✅ **Claude-friendly** - Skill collects data via AskUserQuestion, generates CSV, runs command
- ✅ **Repeatable** - CSV can be version controlled, re-run, audited
- ✅ **Multi-finding support** - Can create multiple findings in one execution

**CSV format:**

```csv
risk_id,asset_value,asset_type,asset_surface,risk_status,definition_name,evidence_file
```
