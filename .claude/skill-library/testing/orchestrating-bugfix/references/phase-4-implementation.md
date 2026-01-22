# Phase 4: Fix Implementation

**Purpose:** Implement minimal bug fix with TDD - test first, then fix, verify it works.

## Agent Selection

Select developer agent based on bug location:

| File Pattern             | Agent                | Example                      |
| ------------------------ | -------------------- | ---------------------------- |
| `*.tsx`, `*.ts` (ui/)    | frontend-developer   | React components, UI logic   |
| `*.go`                   | backend-developer    | Lambda handlers, Go services |
| `*.vql`, `nuclei/*.yaml` | capability-developer | Security capabilities        |
| `*.py`                   | backend-developer    | Python services, CLI tools   |

**See agent definitions:** `.claude/agents/development/`

## Required Skills

The developer agent MUST invoke these skills before completing:

1. **developing-with-tdd** - Write failing test FIRST
2. **verifying-before-completion** - Prove fix works
3. **adhering-to-yagni** - Minimal fix only, no extras

## Inputs

From Phase 3:

- `root-cause-report.md` with:
  - Root cause description
  - Evidence (file:line)
  - Minimal fix recommendation
  - Affected tests

## Agent Prompt Pattern

```
You are implementing a bug fix for the orchestrating-bugfix workflow.

**Root Cause:**
[Paste root-cause-report.md content]

**Your Task:**
Fix the bug using TDD:
1. Write test that reproduces the bug (must fail first)
2. Implement minimal fix from root-cause-report.md
3. Verify test passes
4. Run existing test suite

**MANDATORY SKILLS (invoke ALL before completing):**
- developing-with-tdd: Write failing test FIRST
- verifying-before-completion: Prove fix works
- adhering-to-yagni: Minimal fix only, no extras

**CRITICAL CONSTRAINTS:**
- Fix ONLY what's broken
- NO refactoring of surrounding code
- NO "while we're here" improvements
- NO changes to unrelated tests

**OUTPUT_DIR:** [from Phase 0]

Compliance: Document invoked skills in output metadata.
```

## TDD Workflow

### Step 1: Write Failing Test

**MUST FAIL BEFORE IMPLEMENTING FIX**

Example (LoginForm validation bug):

```typescript
// src/components/LoginForm.test.tsx
describe("LoginForm", () => {
  describe("email validation with empty input", () => {
    it("should return false for undefined email", () => {
      // This test reproduces the bug
      const result = validateEmail(undefined);
      expect(result).toBe(false); // Currently throws error
    });

    it("should return false for empty string email", () => {
      const result = validateEmail("");
      expect(result).toBe(false);
    });

    it("should return false for null email", () => {
      const result = validateEmail(null);
      expect(result).toBe(false);
    });
  });
});
```

**Verify test fails:**

```bash
npm test -- LoginForm.test.tsx
# Expected: Test fails with "Cannot read property 'test' of undefined"
```

**If test passes before fix:** TEST IS WRONG. The test doesn't reproduce the bug. Re-write the test.

### Step 2: Implement Minimal Fix

Apply ONLY the fix recommended in root-cause-report.md:

```typescript
// src/components/LoginForm.tsx
function validateEmail(email) {
  if (!email) return false; // ✅ ONLY THIS LINE ADDED
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
```

**DO NOT:**

- Refactor validateEmail() to use a validation library ❌
- Add email format validation ❌
- Extract regex to a constant ❌
- Add JSDoc comments ❌
- Update other validation functions ❌

**These are "while we're here" improvements - forbidden by adhering-to-yagni**

### Step 3: Verify Test Passes

```bash
npm test -- LoginForm.test.tsx
# Expected: All tests pass
```

**If test still fails:** Fix is incorrect. Return to Step 2.

### Step 4: Run Existing Tests

```bash
npm test
# Expected: All existing tests still pass (no regressions)
```

**If existing tests fail:** Fix introduced regression. See "Regression Handling" section.

## Output Artifacts

After Phase 4 completes:

```
.claude/.output/bugs/YYYYMMDD-HHMMSS-{bug-name}/
├── implementation-report.md    # NEW - Summary of changes
├── test-results.json           # NEW - Test execution results
└── [previous phase files]
```

**implementation-report.md format:**

```markdown
# Implementation Report

## Changes Made

### Files Modified

1. **src/components/LoginForm.tsx** (1 line added)
   - Added null check in validateEmail() function
   - Line 120: `if (!email) return false;`

2. **src/components/LoginForm.test.tsx** (15 lines added)
   - Added test suite for email validation edge cases
   - Tests undefined, null, and empty string inputs

## Test Results

### New Tests (3 added, 3 passing)
```

✓ should return false for undefined email
✓ should return false for empty string email
✓ should return false for null email

```

### Existing Tests (47 passing, 0 failing)

```

Test Suites: 12 passed, 12 total
Tests: 47 passed, 47 total
Time: 3.247s

```

## Verification

- [x] Test reproduced bug (failed before fix)
- [x] Test passes after fix
- [x] No existing tests failed
- [x] No regressions introduced

## Minimal Fix Compliance

Changes limited to:
- [x] Bug location only (LoginForm.tsx:120)
- [x] Exact fix from root-cause-report.md
- [x] No refactoring
- [x] No "while we're here" improvements
```

## Regression Handling

**IF existing tests fail after fix:**

1. **Analyze failure:**

   ```bash
   npm test -- --verbose
   # Capture full output
   ```

2. **Document in implementation-report.md:**

   ```markdown
   ## Regressions Detected

   ### Test: LoginForm renders with pre-filled email

   - **Status:** FAILING
   - **Error:** Expected validateEmail(null) to return true, got false
   - **Root cause:** Test assumed null email is valid (incorrect assumption)
   - **Assessment:** Test bug, not fix regression

   ### Recommendation

   Fix the test to match correct behavior (null email should be invalid)
   ```

3. **DO NOT auto-fix regressions** - This goes to Phase 5 human checkpoint

## Common Anti-Patterns

### Anti-Pattern: Refactoring While Fixing

**Example (WRONG):**

```typescript
// ❌ WRONG: Extracted regex, added comments, reformatted
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates email format using RFC 5322 compliant regex
 * @param email - Email string to validate
 * @returns true if valid, false otherwise
 */
function validateEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return EMAIL_REGEX.test(email);
}
```

**Why wrong:** Changed more than necessary. Harder to review. Risk of introducing new bugs.

**Correct (MINIMAL):**

```typescript
// ✅ RIGHT: One line added, nothing else changed
function validateEmail(email) {
  if (!email) return false; // Only this line added
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
```

### Anti-Pattern: Fixing Multiple Issues

**Example (WRONG):**

```typescript
// ❌ WRONG: Fixed null bug AND weak password validation in same commit
function validateEmail(email) {
  if (!email) return false; // Bug fix
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function validatePassword(password) {
  if (!password) return false; // "While we're here" fix
  return password.length >= 8;
}
```

**Why wrong:** Mixed concerns. If this commit causes issues, harder to revert just the bug fix.

**Correct (ATOMIC):**

```typescript
// ✅ RIGHT: Only validateEmail() changed
function validateEmail(email) {
  if (!email) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// validatePassword() unchanged
```

### Anti-Pattern: Test That Doesn't Fail First

**Example (WRONG):**

```typescript
// ❌ WRONG: Test passes even without fix
it("should validate email correctly", () => {
  expect(validateEmail("test@example.com")).toBe(true); // Already worked
});
```

**Why wrong:** Test doesn't reproduce the bug. Doesn't verify fix.

**Correct (REPRODUCES BUG):**

```typescript
// ✅ RIGHT: Test fails without fix, passes with fix
it("should return false for undefined email", () => {
  expect(validateEmail(undefined)).toBe(false); // Throws without fix
});
```

## Exit Criteria

Phase 4 is complete when:

- [ ] Test written that reproduces bug
- [ ] Test failed before implementing fix (verified RED)
- [ ] Minimal fix implemented (matches root-cause-report.md)
- [ ] New test passes (verified GREEN)
- [ ] Existing tests checked (may pass or fail - handled in Phase 5)
- [ ] implementation-report.md written with verification checklist

## Next Phase

Proceed to [Phase 5: Verification](phase-5-verification.md) with:

- Code changes (committed to working branch)
- New/updated test file
- implementation-report.md
- test-results.json

## Related Skills

- `developing-with-tdd` - Test-first development workflow
- `verifying-before-completion` - Completion verification checklist
- `adhering-to-yagni` - Minimal change discipline (YAGNI = You Aren't Gonna Need It)
