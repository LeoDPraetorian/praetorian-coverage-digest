---
name: test-metrics-reality-check
description: Use when reporting test completion or before standup, especially when tempted to report impressive test counts under time pressure - requires verifying test files have corresponding production files and calculating coverage from production files tested (not test files created), preventing reports like "266 tests, 6 files" that hide the fact 3 files don't exist
allowed-tools: 'Read, Bash, Grep, Glob'
---

# Test Metrics Reality Check

## Overview

**Report production coverage, not test count.**

Under time pressure, you'll report vanity metrics (test count) instead of real metrics (production coverage).

**Core principle:** Test count is meaningless without knowing what's being tested.

## When to Use

Use when:
- Reporting test completion
- Before standup/status updates
- Creating PR descriptions
- Tempted to report "X tests passing"
- Want to show impressive progress

**Red flags you need this**:
- Reporting test count without production file count
- "266 tests across 6 files" (which 6? do they exist?)
- "100% pass rate" (of what?)
- Celebrating numbers without verification

## The Iron Law

```
BEFORE REPORTING: Verify files exist, calculate real coverage
```

**5 minutes verification prevents embarrassment when asked "coverage of what?"**

## The Reality Check Protocol

### BEFORE Reporting Metrics

**STOP. Do NOT report yet.**

**MANDATORY 5-minute check**:

```bash
# Step 1: List your test files
TEST_FILES=$(find . -name "*.test.tsx")
echo "Test files created: $(echo "$TEST_FILES" | wc -l)"

# Step 2: Verify production files exist
VERIFIED=0
MISSING=0

for test_file in $TEST_FILES; do
  prod_file=$(echo "$test_file" | sed 's/__tests__\///g' | sed 's/\.test\././g')

  if [ -f "$prod_file" ]; then
    ((VERIFIED++))
  else
    echo "❌ No production file for: $test_file"
    ((MISSING++))
  fi
done

echo "Production files with tests: $VERIFIED"
echo "Test files without production: $MISSING"

# Step 3: Calculate REAL coverage
TOTAL_PROD=$(find src -name "*.tsx" ! -name "*.test.tsx" | wc -l)
REAL_COVERAGE=$(echo "scale=1; $VERIFIED * 100 / $TOTAL_PROD" | bc)

echo "REAL coverage: $REAL_COVERAGE% ($VERIFIED of $TOTAL_PROD production files)"
```

**Now you can report with confidence.**

## Correct Reporting Format

**✅ CORRECT** (production-based):
```
"Tested 6 of 45 Settings production files (13% coverage)
Created 6 test files, all have corresponding production code
All 266 tests passing"
```

**❌ WRONG** (test-count-based):
```
"Created 266 tests across 6 files, 100% passing"
(Doesn't say if files exist, what coverage is, what's tested)
```

## Baseline Failure (From RED Phase)

**What agents do without this skill** (time pressure before standup):

**Report**:
- "266 tests across 6 files"
- "100% pass rate"
- Emphasize impressive numbers

**Don't verify**:
- Do production files exist?
- What's real coverage?
- Are metrics accurate?

**Rationalize**:
- "266 sounds impressive"
- "Vanity metrics look good for standup"
- "Don't have time to verify"

**Result**: Report fake progress, get questioned, look unprepared

## The Skill Prevents

**Vanity metrics**:
- Test count without coverage context
- Pass rate without knowing what's tested
- File count without verifying they exist

**Rationalizations**:
- "Impressive numbers are enough"
- "Don't have time to calculate coverage"
- "Manager just wants to hear progress"

## Red Flags - STOP and Verify

Before reporting metrics, if you're thinking:
- "266 tests sounds impressive"
- "100% pass rate is all they need to know"
- "Don't have time to calculate real coverage"
- "Just need to show progress"

**ALL of these mean**: STOP. Run 5-minute reality check.

## The Bottom Line

```
5 MINUTES VERIFYING > EMBARRASSMENT WHEN QUESTIONED
```

**Question**: Do you KNOW what you tested or are you reporting NUMBERS?
- KNOW (verified coverage) → Report with confidence
- NUMBERS (test count) → Stop, verify reality first

**Standup response**: "I tested X of Y production files (Z% coverage)" beats "I wrote 266 tests"
