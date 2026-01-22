# Skill Fixing Rationalization Table

Extends [shared rationalization prevention](.claude/skills/using-skills/references/rationalization-prevention.md).

## Step-Specific Rationalizations

### Step 2: Run Audit

| Rationalization               | Why It's Wrong                           | Response                        |
| ----------------------------- | ---------------------------------------- | ------------------------------- |
| 'I know what's wrong'         | Audit finds issues you didn't know about | DENIED. Run full audit first.   |
| 'Just fix the reported issue' | Reported issue may have related issues   | DENIED. Audit finds all issues. |

### Step 3: Create Backup

| Rationalization                         | Why It's Wrong                        | Response                        |
| --------------------------------------- | ------------------------------------- | ------------------------------- |
| 'Skip backup, the fix is mechanical'    | Mechanical fixes can still be wrong   | DENIED. Always create backup.   |
| 'Skip backup, I can undo with git'      | Uncommitted fixes aren't in git       | DENIED. Create .local backup.   |
| 'Deterministic fixes don't need backup' | Deterministic doesn't mean infallible | DENIED. Backup takes 2 seconds. |

### Step 4: Categorize Issues

| Rationalization                      | Why It's Wrong                               | Response                                                     |
| ------------------------------------ | -------------------------------------------- | ------------------------------------------------------------ |
| 'All issues look deterministic'      | Misclassification causes wrong fix approach  | NOT ACCEPTED. Check each issue against phase categorization. |
| 'Skip categorization, just fix them' | Different categories need different handlers | DENIED. Categorize before fixing.                            |

### Step 5: Apply Fixes

| Rationalization                         | Why It's Wrong                                     | Response                               |
| --------------------------------------- | -------------------------------------------------- | -------------------------------------- |
| '4/5 issues fixed is good enough'       | Compliance is all-or-nothing                       | DENIED. Fix ALL issues.                |
| 'Validation-only phases can be skipped' | Validation identifies issues even without auto-fix | DENIED. Report validation-only issues. |
| 'Human-required is too much work'       | Human-required phases need guidance, not skipping  | DENIED. Provide interactive guidance.  |
| 'Phase 26 stub is minor'                | Stub content propagates incorrect patterns         | DENIED. Research to populate stubs.    |
| 'I can populate stub from memory'       | Training data may be stale or incorrect            | DENIED. Use orchestrating-research.    |

### Step 4: Phase 26 Specific Rationalizations

| Rationalization                               | Reality                                           | Required Action                               |
| --------------------------------------------- | ------------------------------------------------- | --------------------------------------------- |
| 'I populated the main stub, others are minor' | ALL stubs identified by audit must be fixed       | DENIED. Complete EVERY stub in TodoWrite list |
| 'This stub only needs a few lines'            | Stubs need substantive content (>50 lines)        | DENIED. Research and populate fully           |
| 'I can add placeholder and fix later'         | Placeholders ARE the problem Phase 26 fixes       | DENIED. Never create placeholders             |
| 'Research didn't cover this stub type'        | Re-run research with adjusted query OR ask user   | DENIED. Don't skip - resolve the gap          |
| 'The audit only flagged one stub'             | Check audit output again - may have missed others | DENIED. Re-read audit, enumerate ALL stubs    |

### Step 6: Verify Fixes

| Rationalization                               | Why It's Wrong                                 | Response                           |
| --------------------------------------------- | ---------------------------------------------- | ---------------------------------- |
| 'Skip verification, fixes are obvious'        | Re-audit catches missed issues and regressions | DENIED. Run audit again.           |
| 'Deterministic fixes don't need verification' | Even mechanical transforms can fail            | DENIED. Verify all fix categories. |
| 'Most issues fixed, close enough'             | Partial compliance is non-compliance           | DENIED. All phases must pass.      |

### Step 7: Update Changelog

| Rationalization                   | Why It's Wrong                             | Response                        |
| --------------------------------- | ------------------------------------------ | ------------------------------- |
| 'Skip changelog, fixes are minor' | Changelog tracks all changes for debugging | DENIED. Document fixes applied. |
| 'I'll update changelog later'     | 'Later' has ~5% completion rate            | DENIED. Update changelog now.   |

## Fix Category Rationalizations

### Deterministic Fixes

| Rationalization                    | Why It's Wrong                           | Response                                 |
| ---------------------------------- | ---------------------------------------- | ---------------------------------------- |
| 'Apply without reading phase docs' | Even deterministic fixes have edge cases | NOT ACCEPTED. Read phase categorization. |

### Hybrid Fixes

| Rationalization                       | Why It's Wrong                       | Response                                         |
| ------------------------------------- | ------------------------------------ | ------------------------------------------------ |
| 'Skip confirmation, match is obvious' | Fuzzy matches need user confirmation | DENIED. Use AskUserQuestion for ambiguous cases. |
| 'Auto-apply broken link fix'          | Broken link target might not exist   | NOT ACCEPTED. Confirm if file missing.           |

### Claude-Automated Fixes

| Rationalization                      | Why It's Wrong                              | Response                                              |
| ------------------------------------ | ------------------------------------------- | ----------------------------------------------------- |
| 'Extract anywhere to fix line count' | Extraction location affects discoverability | NOT ACCEPTED. Follow progressive disclosure patterns. |

### Human-Required Fixes

| Rationalization                | Why It's Wrong                                | Response                              |
| ------------------------------ | --------------------------------------------- | ------------------------------------- |
| 'Too complex, skip this phase' | Human-required means guide, not skip          | DENIED. Provide interactive guidance. |
| 'User can figure it out'       | Guidance is the fix for human-required phases | DENIED. Explain the fix approach.     |

## Cross-Step Rationalizations

| Rationalization                       | Why It's Wrong                           | Response                      |
| ------------------------------------- | ---------------------------------------- | ----------------------------- |
| '6/7 steps is close enough'           | Fixing workflow is all-or-nothing        | DENIED. Complete all 7 steps. |
| 'Issues are fixed, skip verification' | Verification catches regressions         | DENIED. Always re-audit.      |
| 'Changelog is just documentation'     | Changelog enables debugging and tracking | DENIED. Update changelog.     |
