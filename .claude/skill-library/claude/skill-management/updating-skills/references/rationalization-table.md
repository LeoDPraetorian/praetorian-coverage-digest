# Skill Update Rationalization Table

Extends [shared rationalization prevention](../../using-skills/references/rationalization-prevention.md).

## Step-Specific Rationalizations

### Step 1: Document RED

| Rationalization                  | Why It's Wrong                                                 | Response                             |
| -------------------------------- | -------------------------------------------------------------- | ------------------------------------ |
| 'Skip RED, the issue is obvious' | RED ensures you verify the actual failure, not assumed failure | DENIED. Document what's wrong today. |
| 'User described the problem'     | User description != verified test scenario                     | DENIED. Test scenario shows failure. |
| 'I can see the bug in the code'  | Seeing != proving. RED proves with evidence.                   | DENIED. Capture failure behavior.    |

### Step 2: Locate + Size Check

| Rationalization             | Why It's Wrong                                    | Response                           |
| --------------------------- | ------------------------------------------------- | ---------------------------------- |
| 'I know where the skill is' | Wrong path causes .claude/.claude/ duplication    | NOT ACCEPTED. Run locate commands. |
| 'Size check is unnecessary' | Size determines edit strategy (inline vs extract) | DENIED. Check line count.          |

### Step 3: Backup

| Rationalization                  | Why It's Wrong                                | Response                        |
| -------------------------------- | --------------------------------------------- | ------------------------------- |
| 'Skip backup, I'll be careful'   | Backups are cheap; confidence causes mistakes | DENIED. Always create backup.   |
| 'Skip backup, the edit is small' | Small edits can still corrupt files           | DENIED. Backup takes 2 seconds. |
| 'Git is my backup'               | Uncommitted changes aren't in git             | DENIED. Create .local backup.   |

### Step 4: Research (Optional)

| Rationalization                         | Why It's Wrong                                    | Response                                              |
| --------------------------------------- | ------------------------------------------------- | ----------------------------------------------------- |
| 'Skip research, I know the topic'       | Training data is stale for libraries/frameworks   | For library skills, research is STRONGLY RECOMMENDED. |
| 'Research is overkill for small update' | Small updates can still benefit from current docs | Ask user via AskUserQuestion.                         |

### Step 5: Edit

| Rationalization                                | Why It's Wrong                                                  | Response                                                  |
| ---------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------- |
| 'Close enough to what was asked'               | Edits must address the documented RED failure                   | DENIED. Edit must fix the specific failure.               |
| 'I'll add more content later'                  | 'Later' has ~5% completion rate                                 | DENIED. Complete the edit now.                            |
| 'I updated SKILL.md, research is incorporated' | SKILL.md is often just summary; references/ have the details    | DENIED. Check and update ALL relevant files.              |
| 'The existing references are still accurate'   | Research may reveal updates to 'accurate' content               | DENIED. Compare each file against SYNTHESIS.md.           |
| 'I'll update references in a separate PR'      | Partial updates create inconsistency; skill + refs must be sync | DENIED. Update all files in same workflow.                |
| 'Research didn't have new info for this file'  | Absence of evidence ≠ evidence of absence                       | DENIED. Document explicit 'No updates needed' + reasoning |
| 'Only SKILL.md was mentioned in the request'   | Research integration applies to entire skill directory          | DENIED. Update all files where research applies.          |

### Step 6: Verify GREEN

| Rationalization                 | Why It's Wrong                             | Response                           |
| ------------------------------- | ------------------------------------------ | ---------------------------------- |
| 'Skip GREEN, the edit is small' | Small edits break things; verify with test | DENIED. Re-test the RED scenario.  |
| 'Edit obviously fixed it'       | Obvious fixes often miss edge cases        | DENIED. Verify with original test. |
| 'GREEN is just for big changes' | GREEN applies to ALL changes               | DENIED. Verify every edit.         |

### Step 7: Compliance

| Rationalization                          | Why It's Wrong                                   | Response                              |
| ---------------------------------------- | ------------------------------------------------ | ------------------------------------- |
| 'Skip compliance, only changed one line' | One line can break links, line count, references | DENIED. Run audit.                    |
| 'Audit is overkill for typo fix'         | Typos can change meaning or break patterns       | DENIED. Audit takes 30 seconds.       |
| '490 lines is under 500'                 | Close to limit means future edits will exceed    | WARNING. Consider extracting content. |

### Step 8: REFACTOR

| Rationalization                           | Why It's Wrong                                 | Response                                       |
| ----------------------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| 'Skip REFACTOR, it's just a typo'         | Even typos can change skill behavior           | For non-trivial changes, REFACTOR is required. |
| 'Pressure testing is for new skills only' | Updates can introduce new bypass opportunities | DENIED for non-trivial changes.                |

## Cross-Step Rationalizations

| Rationalization                      | Why It's Wrong                   | Response                      |
| ------------------------------------ | -------------------------------- | ----------------------------- |
| '6/8 steps is close enough'          | Steps are all-or-nothing         | DENIED. Complete all 8 steps. |
| 'Small change, abbreviated workflow' | All changes follow full workflow | DENIED. No shortcuts.         |
| 'I'll verify compliance later'       | 'Later' has ~5% completion rate  | DENIED. Verify now.           |
