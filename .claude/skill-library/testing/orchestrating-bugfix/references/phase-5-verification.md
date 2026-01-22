# Phase 5: Verification

**Purpose:** Verify the fix works, check for regressions, and determine if ready for commit or needs human review.

## Executor

**Orchestrator** (not an agent) - This phase runs in the main conversation.

## Required Skill

MUST invoke before proceeding: `verifying-before-completion`

## Inputs

From Phase 4:

- Code changes (in working branch)
- New/updated test file
- `implementation-report.md`
- `test-results.json` (from Phase 4 test run)

## Verification Checklist

### Step 1: Run New Test (Isolation)

Run ONLY the new bug-reproducing test:

```bash
# Frontend (Vitest/Jest)
npm test -- LoginForm.test.tsx --testNamePattern="email validation"

# Backend (Go)
go test -run TestValidateEmail ./path/to/package

# Python
pytest tests/test_validation.py::test_validate_email_edge_cases -v
```

**Expected:** All new tests pass

**If new test fails:**

- ❌ Fix is incorrect
- STOP workflow
- Return to Phase 4 with error details
- Developer agent must revise fix

### Step 2: Run Full Test Suite

Run ALL tests to check for regressions:

```bash
# Frontend
npm test

# Backend
go test ./...

# Python
pytest
```

**Capture output:**

```bash
npm test 2>&1 | tee $OUTPUT_DIR/full-test-results.txt
```

**Parse results:**

```json
{
  "total_tests": 47,
  "passed": 47,
  "failed": 0,
  "skipped": 0,
  "duration": "3.247s",
  "regressions": []
}
```

### Step 3: Run Build

Verify build succeeds with changes:

```bash
# Frontend
npm run build

# Backend
go build ./...

# Python
python -m build  # if applicable
```

**If build fails:**

- ❌ Fix introduced build error
- STOP workflow
- Return to Phase 4 with build output
- Developer agent must fix build issue

### Step 4: Run Lint (If Configured)

Check code quality standards:

```bash
# Frontend
npm run lint

# Backend
golangci-lint run

# Python
ruff check .
```

**Note:** Lint failures are warnings, not blockers. Document but proceed.

## Decision Logic

After verification steps complete:

### Scenario A: All Pass ✅

**Conditions:**

- New test passes
- Full test suite passes (no regressions)
- Build succeeds
- Lint passes (or no linter configured)

**Action:**

- ✅ Mark workflow COMPLETE
- Write verification-report.md (see format below)
- Inform user: "Bug fix complete and ready for commit"

### Scenario B: New Test Fails ❌

**Conditions:**

- New test fails
- OR full test suite has new failures

**Action:**

- ❌ Return to Phase 4
- Pass error details to developer agent
- Developer agent must revise fix
- Re-verify after revision

### Scenario C: Regressions Detected 🛑

**Conditions:**

- New test passes
- Build succeeds
- BUT existing tests fail that were passing before

**Action:**

- 🛑 STOP for human checkpoint
- Present regression details to user
- Wait for user decision (see "Human Checkpoint" section)

## Human Checkpoint (Regressions)

When regressions detected, ask user via AskUserQuestion:

```
The bug fix is complete, but {N} existing tests now fail.

Regression Summary:
- Test: LoginForm renders with pre-filled email
  Error: Expected validateEmail(null) to return true, got false
  Assessment: Test assumed null email is valid (incorrect)

- Test: Signup form accepts empty email
  Error: Expected onSubmit to be called, was not called
  Assessment: Fix correctly blocks empty emails, test needs update

Options:
1. Show me the failures
   → Display full test output for analysis

2. Fix the regressions
   → Return to Phase 4, update tests to match correct behavior

3. Proceed anyway
   → Accept regression risk, mark complete (NOT RECOMMENDED)

4. Abort this fix
   → Discard changes, keep existing buggy behavior
```

### User Choice Handling

**Choice 1: Show me the failures**

- Display full-test-results.txt
- Re-ask the question with same options

**Choice 2: Fix the regressions**

- Return to Phase 4
- Agent prompt includes:

  ```
  Previous fix introduced regressions. Update tests to match correct behavior:
  [Paste regression details from verification-report.md]

  CRITICAL: Only update tests, do NOT change the fix implementation.
  ```

- After test updates, re-run Phase 5

**Choice 3: Proceed anyway**

- ⚠️ Mark workflow complete WITH WARNINGS
- Document in verification-report.md:

  ```markdown
  ## ⚠️ WARNINGS

  User accepted {N} regressions to ship this fix:

  - [List failing tests]

  Risk: These regressions may indicate incorrect fix or broken tests.
  ```

**Choice 4: Abort this fix**

- Discard all changes
- Optionally: Escalate to orchestrating-feature-development
  ```
  This bug may require more than a minimal fix. Consider using
  orchestrating-feature-development for a complete solution.
  ```

## Output: verification-report.md

Write comprehensive verification report:

```markdown
# Verification Report

**Date:** 2026-01-15 10:45:00
**Bug:** login-form-validation-error
**Status:** ✅ COMPLETE | 🛑 REGRESSIONS | ❌ FAILED

---

## Test Results

### New Tests (3 added, 3 passing)
```

✓ LoginForm › email validation › should return false for undefined email
✓ LoginForm › email validation › should return false for empty string email
✓ LoginForm › email validation › should return false for null email

```

**Duration:** 0.234s

### Full Test Suite

```

Test Suites: 12 passed, 12 total
Tests: 47 passed, 47 total
Duration: 3.247s

````

**Regressions:** 0

---

## Build Verification

```bash
$ npm run build
✓ Build succeeded
Output: dist/ (234 KB)
````

---

## Lint Verification

```bash
$ npm run lint
✓ No issues found
```

---

## Files Changed

- `src/components/LoginForm.tsx` (+1 line)
- `src/components/LoginForm.test.tsx` (+15 lines)

**Total:** 2 files, 16 lines added, 0 lines removed

---

## Verification Checklist

- [x] New test passes in isolation
- [x] Full test suite passes
- [x] Build succeeds
- [x] Lint passes
- [x] No regressions introduced
- [x] Changes ready for commit

---

## Ready for Commit

This fix is verified and ready:

```bash
git add src/components/LoginForm.tsx src/components/LoginForm.test.tsx
git commit -m "fix(LoginForm): handle null/undefined email in validateEmail

Adds null check before regex test to prevent TypeError when
email field is empty. Includes tests for undefined, null, and
empty string edge cases.

Fixes: #[issue-number]"
```

````

## Exit Criteria

Phase 5 is complete when ONE of:
- ✅ All verification steps pass → Mark complete, ready for commit
- 🛑 Regressions detected + user decision made → Mark complete with warnings OR return to Phase 4
- ❌ Fix verification failed → Returned to Phase 4 for revision

## Common Issues

### Issue: Flaky Tests

**Symptom:** Tests pass locally, fail in verification

**Diagnosis:**
```bash
# Run test 10 times
for i in {1..10}; do npm test -- LoginForm.test.tsx || echo "FAIL $i"; done
````

**Solutions:**

- Fix test timing issues (use waitFor, proper async handling)
- Document flaky test in verification-report.md
- Consider test infrastructure improvements (separate from bug fix)

### Issue: Environment-Specific Failures

**Symptom:** Tests pass in dev, fail in CI

**Diagnosis:** Check for:

- Missing environment variables
- Different Node/Go/Python versions
- OS-specific behavior (path separators, etc.)

**Solution:** Document environment requirements in verification-report.md

### Issue: Build Cache Issues

**Symptom:** Build fails but code looks correct

**Solution:**

```bash
# Clear cache and rebuild
npm run clean
npm install
npm run build
```

## Rollback Procedure

If at any point verification reveals major issues:

```bash
# Discard all changes
git reset --hard HEAD
git clean -fd

# Return to Phase 3 or Phase 4 depending on issue
```

## Next Phase

**If verification passed:** Workflow complete, ready for commit

**If returning to Phase 4:** Developer agent revises fix

**If user aborted:** Workflow terminated

## Related Skills

- `verifying-before-completion` - Verification checklist and evidence requirements
- `developing-with-tdd` - TDD cycle (if returning to Phase 4)
- `adhering-to-yagni` - Scope discipline (if test updates needed)
