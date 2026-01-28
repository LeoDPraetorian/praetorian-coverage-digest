# Phase 9 / Step 8 Pre-Conditions

**REFACTOR phase requires verified evidence files before proceeding.**

## Mandatory Verification Commands

```bash
# MANDATORY: Run these BEFORE proceeding to pressure tests
ls -lh {OUTPUT_DIR}/red-test.md || echo "BLOCKED: red-test.md missing"
ls -lh {OUTPUT_DIR}/green-test.md || echo "BLOCKED: green-test.md missing"
```

## Enforcement Rules

**If either file is missing:** STOP. Return to RED phase (Step 1/Phase 1) or GREEN phase (Step 6/Phase 8) to complete.

**Rationalizations (ALL REJECTED):**
- ❌ "I know the files exist" → Run the commands anyway
- ❌ "I just created them" → Verify with ls, don't rely on memory
- ❌ "Skipping verification saves time" → Pre-conditions are mandatory

**Required evidence:**
- ✅ Both commands show file exists
- ✅ File size > 0 (not empty)

## Why This Matters

Without explicit verification:
- Agents proceed to pressure testing without evidence that RED/GREEN phases completed
- Missing files discovered late in workflow → wasted pressure test effort
- No audit trail of TDD compliance

## Related

- [TDD Validator Pattern](tdd-validator-pattern.md) - Witness/Validator methodology
- [pressure-testing-skill-content](/.claude/skill-library/claude/skill-management/pressure-testing-skill-content/SKILL.md) - Pressure test methodology
