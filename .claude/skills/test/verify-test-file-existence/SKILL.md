---
name: verify-test-file-existence
description: Use when asked to fix, create, or work with test files, before starting any test work - prevents creating tests for non-existent files and wasting hours on fake progress by verifying both test files and corresponding production files exist
---

# Verify Test File Existence

## Overview

**Before ANY test work, verify files exist.** This 5-minute check prevents 22-hour wastes.

**Core principle:** You cannot fix tests that don't exist. You cannot test code that doesn't exist.

## When to Use

Use BEFORE:
- "Fix failing tests in X.test.tsx"
- "Create tests for Y component"
- "Update tests in Z"
- Starting any test-related work
- Dispatching test work to agents

**Especially when:**
- Receiving list of test files to fix
- User provides file paths
- Asked to "complete" or "finish" tests
- Test file paths from analysis/reports

## The 5-Minute Protocol

### Step 1: Verify Test File Exists

```bash
TEST_FILE="path/to/Component.test.tsx"

if [ ! -f "$TEST_FILE" ]; then
  echo "❌ STOP: Test file does not exist: $TEST_FILE"
  echo ""
  echo "Cannot fix non-existent tests."
  echo ""
  echo "Ask user:"
  echo "  a) Is this the correct file path?"
  echo "  b) Should I create this test file (requires requirements)?"
  echo "  c) Is this test-driven development (write test, then implement)?"
  echo ""
  exit 1
fi

echo "✅ Test file exists: $TEST_FILE"
```

### Step 2: Verify Production File Exists

```bash
# Derive production file path from test file
PROD_FILE=$(echo "$TEST_FILE" | sed 's/__tests__\///g' | sed 's/\.test\././g')

if [ ! -f "$PROD_FILE" ]; then
  echo "❌ STOP: Production file does not exist: $PROD_FILE"
  echo ""
  echo "Cannot test non-existent code."
  echo ""
  echo "Ask user:"
  echo "  a) Should I implement this feature first?"
  echo "  b) Is the production file in a different location?"
  echo "  c) Is this test-driven development (test first, then implement)?"
  echo ""
  exit 1
fi

echo "✅ Production file exists: $PROD_FILE"
```

### Step 3: Only Proceed if Both Exist

```bash
echo ""
echo "✅ VERIFICATION PASSED"
echo "   Test file: $TEST_FILE"
echo "   Production file: $PROD_FILE"
echo ""
echo "Proceeding with test work..."
```

## Request Patterns

### Pattern 1: "Fix Failing Tests in X"

```
User: "Fix the failing tests in UserProfileForm.test.tsx"

You:
1. Check if UserProfileForm.test.tsx exists
2. Check if UserProfileForm.tsx exists
3. If EITHER missing → STOP and clarify
4. If BOTH exist → Proceed to fix tests
```

**DO NOT**: Create UserProfileForm.test.tsx if it doesn't exist

**Correct Response if Missing**:
```
"UserProfileForm.test.tsx does not exist. I cannot fix non-existent tests.

Should I:
a) Create this test file from scratch (requires requirements for what to test)
b) Verify the correct file path
c) See a list of actual existing test files with failures"
```

### Pattern 2: "Fix Tests in These Files" (Multiple)

```
User: "Fix failing tests in: UserProfile.test.tsx, Settings.test.tsx, ApiKeys.test.tsx"

You:
1. Check each test file exists
2. Check each production file exists
3. Report findings:
   ✅ UserProfile.test.tsx → UserProfile.tsx (both exist)
   ❌ Settings.test.tsx → NOT FOUND
   ✅ ApiKeys.test.tsx → ApiKeys.tsx (both exist)
4. Clarify: "Settings.test.tsx doesn't exist. Should I fix the 2 that exist and skip this one?"
5. Only proceed with confirmed files
```

### Pattern 3: "Create Tests for Component"

```
User: "Create tests for UserProfile component"

You:
1. Check if UserProfile.tsx exists (or .ts, .jsx, etc.)
2. If YES → Proceed to create UserProfile.test.tsx
3. If NO → STOP and clarify:
   "UserProfile component doesn't exist. Should I implement it first?"
```

## Verification Checklist

Before proceeding with ANY test work:

- [ ] Test file path provided or derived
- [ ] Checked: Test file exists (ls, Read, Glob)
- [ ] Derived production file path from test path
- [ ] Checked: Production file exists
- [ ] If creating test: Verified this is intentional (not "fix" request)
- [ ] If fixing test: Verified both files exist
- [ ] Reported findings to user if ANY files missing
- [ ] Got clarification before proceeding

## Common Mistakes

### Mistake 1: Assuming Files Exist

```
❌ Wrong:
User: "Fix tests in UserProfile.test.tsx"
Agent: [Starts writing comprehensive UserProfile.test.tsx]

✅ Correct:
User: "Fix tests in UserProfile.test.tsx"
Agent: [Checks if file exists first]
Agent: "UserProfile.test.tsx doesn't exist. Cannot fix. Clarify?"
```

### Mistake 2: Creating When Asked to Fix

```
❌ Wrong:
User: "Fix the failing tests"
Agent: [Creates new test files with all passing tests]

✅ Correct:
User: "Fix the failing tests"
Agent: [Verifies test files exist, reads actual failures, fixes them]
```

### Mistake 3: Testing Without Production File

```
❌ Wrong:
Test file exists, production file doesn't
Agent: [Writes comprehensive tests anyway]
Result: Tests pass but test nothing

✅ Correct:
Agent: "Test file exists but production file missing.
  Is this TDD (write test first)? Or wrong path?"
```

## Integration with Other Skills

**This skill is REQUIRED before**:
- test-driven-development (RED phase)
- interactive-form-testing
- Any test creation/fixing work

**Use with**:
- test-infrastructure-discovery (after verifying files exist)
- systematic-debugging (when tests fail unexpectedly)

## Real-World Impact

**From 22-hour test session**:
- **Without this skill**: Agents created 266 tests for 9 files, 3 didn't exist (22 hours wasted)
- **With this skill**: 5-minute check would have caught 3 missing files immediately

**Time savings**: 5 minutes to verify vs 22 hours creating fake tests

**ROI**: 264:1 (22 hours / 5 minutes)

## Red Flags - STOP and Verify

If you catch yourself:
- Writing test file when asked to "fix" tests
- Assuming file path is correct without checking
- Creating comprehensive tests without reading production file
- Reporting "tests complete" without verifying files existed
- Skipping verification because "it's probably fine"

**ALL of these mean: STOP. Run verification protocol.**

## The Iron Law

```
NO TEST WORK WITHOUT FILE VERIFICATION FIRST
```

5 minutes of verification prevents 22 hours of waste.

**No exceptions:**
- Not for "simple" test fixes
- Not when "pretty sure" file exists
- Not when "user wouldn't give wrong path"
- Not when "under time pressure"

Verify. Always. Every time.
