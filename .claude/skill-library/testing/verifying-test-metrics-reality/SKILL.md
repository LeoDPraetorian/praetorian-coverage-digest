---
name: verifying-test-metrics-reality
description: Use when reporting test completion or before standup, especially when tempted to report impressive test counts under time pressure - requires verifying test files have corresponding production files and calculating coverage from production files tested (not test files created), preventing reports like "266 tests, 6 files" that hide the fact 3 files don't exist
allowed-tools: "Read, Bash, Grep, Glob"
---

# Test Metrics Reality Check

## Overview

**Report production coverage, not test count.**

Under time pressure, you'll report vanity metrics (test count) instead of real metrics (production coverage).

**Core principle:** Test count is meaningless without knowing what's being tested.

> **MANDATORY: You MUST use TodoWrite before starting to track all verification steps.** This skill requires systematic verification through 3 phases: (1) List test files, (2) Verify production files exist, (3) Calculate real coverage. Mental tracking leads to skipped verification steps.

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

```text
BEFORE REPORTING: Verify files exist, calculate real coverage
```

**5 minutes verification prevents embarrassment when asked "coverage of what?"**

## The Reality Check Protocol

This systematic 3-step protocol takes 5 minutes and transforms vanity metrics into verified reality. Run this before every standup, PR, or status update where you're reporting test progress.

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
  # Remove __tests__/ directory and .test extension to get production file path
  # Note: [.] is character class matching a literal dot in regex
  prod_file=$(echo "$test_file" | sed 's/__tests__///g' | sed 's/[.]test//g')

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

```text
"Tested 6 of 45 Settings production files (13% coverage)
Created 6 test files, all have corresponding production code
All 266 tests passing"
```

**❌ WRONG** (test-count-based):

```text
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

```text
5 MINUTES VERIFYING > EMBARRASSMENT WHEN QUESTIONED
```

**Question**: Do you KNOW what you tested or are you reporting NUMBERS?

- KNOW (verified coverage) → Report with confidence
- NUMBERS (test count) → Stop, verify reality first

**Standup response**: "I tested X of Y production files (Z% coverage)" beats "I wrote 266 tests"

## Common Pitfalls & Solutions

These are the most frequent mistakes agents make when reporting test metrics, along with practical solutions to avoid them.

### Pitfall 1: Reporting Test Count Instead of Coverage

**Scenario**: Agent completes test implementation and reports "Created 15 test files with 150 tests, all passing."

**Problem**: Doesn't mention:
- How many production files exist
- What percentage is covered
- Whether test files match real production files

**Solution**: Always run the Reality Check Protocol before reporting. Calculate coverage from production files, not test files.

**Correct report**: "Tested 15 of 42 production files (36% coverage). Created 15 test files, all have corresponding production code. All 150 tests passing."

### Pitfall 2: Phantom Test Files

**Scenario**: Agent creates test files for components that don't exist or have been moved/renamed.

**Problem**: Test suite shows 100% pass rate but tests nothing real. When someone asks "Can I see the component you tested?", files don't exist.

**Solution**: Use the verification loop in the Reality Check Protocol. For each test file, explicitly check that the production file exists at the expected path.

**Red flag**: Test file at `src/components/__tests__/UserProfile.test.tsx` but production file `src/components/UserProfile.tsx` doesn't exist.

### Pitfall 3: Confusing "Files Tested" with "Tests Created"

**Scenario**: Agent reports "6 files tested" when they mean "6 test files created."

**Problem**: Ambiguous language makes stakeholders think 6 production files have coverage when really only 6 test files exist (which might not even have corresponding production files).

**Solution**: Always be explicit:
- "Production files with test coverage: X"
- "Test files created: Y"
- "Total production files: Z"
- "Coverage: X/Z = %"

### Pitfall 4: Time Pressure Shortcuts

**Scenario**: Standup in 5 minutes, agent thinks "Don't have time to calculate real coverage, I'll just report test count."

**Problem**: This is exactly when you need the Reality Check Protocol most. Vanity metrics under time pressure lead to embarrassment when questioned.

**Solution**: The Reality Check Protocol takes 5 minutes. Set a timer. Run it. The alternative is looking unprepared in standup and losing credibility.

**Reality**: 5 minutes verification now > 30 minutes explaining why your metrics were wrong later.

### Pitfall 5: Celebrating Pass Rate Without Context

**Scenario**: Agent reports "100% test pass rate!" without mentioning what's tested.

**Problem**: 100% pass rate of 3% coverage is meaningless. Pass rate without coverage context is vanity metric.

**Solution**: Always pair pass rate with coverage: "100% pass rate across 15 of 42 production files (36% coverage)."

## Detailed Walkthrough Example

This complete walkthrough demonstrates the Reality Check Protocol in action, showing exactly what commands to run and what results to expect.

### Scenario: Testing React Settings Section

You've been working on test coverage for the Settings section. Standup is in 10 minutes. You're tempted to report impressive numbers.

**Step 1: Create TodoWrite checklist**

```text
1. List all test files created
2. Verify production files exist for each test
3. Count total production files in scope
4. Calculate real coverage percentage
5. Format correct report
```

**Step 2: List test files**

```bash
cd modules/chariot/ui
find src/sections/settings -name "*.test.tsx"
```

Output:
```text
src/sections/settings/__tests__/Settings.test.tsx
src/sections/settings/__tests__/SettingsGeneral.test.tsx
src/sections/settings/__tests__/SettingsSecurity.test.tsx
src/sections/settings/__tests__/SettingsIntegrations.test.tsx
src/sections/settings/__tests__/SettingsNotifications.test.tsx
src/sections/settings/__tests__/SettingsApiKeys.test.tsx
```

**Count**: 6 test files

**Step 3: Verify production files exist**

```bash
# Check each test file's corresponding production file
ls src/sections/settings/Settings.tsx         # ✅ Exists
ls src/sections/settings/SettingsGeneral.tsx  # ✅ Exists
ls src/sections/settings/SettingsSecurity.tsx # ✅ Exists
ls src/sections/settings/SettingsIntegrations.tsx # ✅ Exists
ls src/sections/settings/SettingsNotifications.tsx # ✅ Exists
ls src/sections/settings/SettingsApiKeys.tsx  # ✅ Exists
```

**Result**: All 6 test files have corresponding production files. No phantom tests.

**Step 4: Count total production files in scope**

```bash
find src/sections/settings -name "*.tsx" ! -name "*.test.tsx" | wc -l
```

Output: 45

**Reality check**: There are 45 production files in the Settings section, but you've only tested 6.

**Step 5: Calculate real coverage**

```bash
echo "scale=1; 6 * 100 / 45" | bc
```

Output: 13.3%

**Step 6: Format correct report**

**❌ WRONG (vanity metric)**:
"Created 266 tests across 6 files, 100% passing! 🎉"

**✅ CORRECT (reality-based)**:
"Tested 6 of 45 Settings production files (13% coverage). Created 6 test files, all have corresponding production code. All 266 tests passing. Next: focus on SettingsProfile, SettingsTeam, SettingsBilling (high-priority components)."

**Key difference**: The correct report shows:
1. What was tested (6 specific production files)
2. What's left (39 production files untested)
3. Real coverage (13%, not 100%)
4. Verification (all tests match real code)
5. Next steps (prioritized components)

**Standup impact**: Manager asks "What's our Settings coverage?" You have a real answer, not a scramble to explain.

## Integration with Development Workflows

Build the Reality Check Protocol into your daily workflows with these automation patterns, CI/CD integrations, and PR templates.

### Pre-Standup Checklist

Before any standup or status update:

1. ✅ Run Reality Check Protocol (5 minutes)
2. ✅ Verify all test files have production counterparts
3. ✅ Calculate coverage from production files
4. ✅ Prepare coverage-based report
5. ✅ Identify next priority files to test

**Automation**: Add this to your `.bashrc` or `.zshrc`:

```bash
alias test-reality='
  echo "Test files:";
  find . -name "*.test.tsx" | wc -l;
  echo "Production files:";
  find . -name "*.tsx" ! -name "*.test.tsx" | wc -l;
  echo "Run full verification? (y/n)"
'
```

### CI/CD Integration

Add coverage reality check to CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Verify Test Reality
  run: |
    TEST_COUNT=$(find src -name "*.test.tsx" | wc -l)
    PROD_COUNT=$(find src -name "*.tsx" ! -name "*.test.tsx" | wc -l)
    COVERAGE=$((TEST_COUNT * 100 / PROD_COUNT))
    echo "Test Coverage Reality: $TEST_COUNT of $PROD_COUNT files ($COVERAGE%)"
    if [ $COVERAGE -lt 20 ]; then
      echo "⚠️  Warning: Coverage below 20%"
    fi
```

### PR Description Template

When creating PRs, use this template:

```markdown
## Testing

**Production files tested**: X of Y (Z% coverage)
**Test files created**: N
**Verification**: All test files have corresponding production files
**Tests passing**: M tests, 100% pass rate

### Coverage details
- Component A: ✅ Tested (unit + integration)
- Component B: ✅ Tested (unit only)
- Component C: ⏳ Not yet tested
```

## Troubleshooting

Common issues you may encounter when implementing the Reality Check Protocol and their solutions.

### "My test count is high but coverage is low"

**Cause**: You're testing the same files repeatedly or creating many tests per file without increasing file coverage.

**Solution**: Focus on breadth (more files tested) before depth (more tests per file). 10 files with 5 tests each > 1 file with 50 tests.

### "Production file path doesn't match test file path"

**Cause**: Test file structure doesn't mirror production structure.

**Solution**: Use this pattern:
```text
src/components/UserProfile.tsx
src/components/__tests__/UserProfile.test.tsx
```

Or:
```text
src/components/UserProfile.tsx
src/components/UserProfile.test.tsx
```

**Adjust verification script** to match your project's pattern.

### "Coverage calculation returns 0"

**Cause**: `bc` not installed or syntax error.

**Solution**: Alternative calculation methods:

```bash
# Method 1: Use awk
echo "$VERIFIED $TOTAL_PROD" | awk '{printf "%.1f", ($1 * 100) / $2}'

# Method 2: Use Python
python3 -c "print(round($VERIFIED * 100 / $TOTAL_PROD, 1))"

# Method 3: Use Node.js
node -e "console.log(Math.round($VERIFIED * 100 / $TOTAL_PROD * 10) / 10)"
```

### "Test file exists but production file path is different"

**Cause**: Refactoring moved files but tests weren't updated.

**Solution**: Audit test file imports:

```bash
# Check what each test file imports (looking for relative imports like '../')
for test in $(find . -name "*.test.tsx"); do
  echo "=== $test ==="
  grep "from '[.][.]/" $test | head -3
done
```

If imports don't match expected production paths, update test files or verification script.

## Case Studies from Production

Real-world examples demonstrating the consequences of skipping the Reality Check Protocol and how it could have prevented production issues.

### Case Study 1: The 266 Tests That Tested Nothing

**Context**: Agent implementing Settings section tests under time pressure.

**Report (initial)**: "Created 266 tests across 6 files, 100% passing!"

**Question from manager**: "What's our Settings coverage?"

**Reality**: Agent didn't know. Had to scramble. Found that 3 of 6 test files had no corresponding production files (files were in wrong directory).

**Real coverage**: 3 of 45 files = 6.7%, not the implied 100%

**Impact**: Lost manager trust, had to redo work, missed sprint goal.

**Prevention**: 5-minute Reality Check Protocol would have caught phantom files before reporting.

### Case Study 2: The Impressive Numbers That Weren't

**Context**: Agent testing dashboard components.

**Report (initial)**: "Achieved 85% test coverage!"

**Question from tech lead**: "Coverage of what?"

**Reality**: 85% coverage of test files (lines in test files divided by total test lines), not production files. Actual production coverage was 12%.

**Impact**: Team thought feature was ready for release. QA found major bugs in untested components.

**Prevention**: Reality Check Protocol forces calculation from production files, not test files.

### Case Study 3: The Vanity Metric That Backfired

**Context**: Agent reporting progress in standup.

**Report (initial)**: "Created 50 new tests, all passing!"

**Question from PM**: "How much of the new feature is tested?"

**Reality**: Agent tested same 3 components with different variations. New feature had 15 components, only 3 tested = 20% coverage.

**Impact**: PM allocated resources elsewhere thinking feature was well-tested. Feature had critical bugs in production.

**Prevention**: Reality Check Protocol emphasizes breadth (files tested) over depth (tests per file).

## Related Skills

- `verifying-before-completion` - Use before claiming work is complete
- `test-quality-assessor` - Analyze test coverage quality beyond metrics
- `frontend-unit-test-engineer` - Create the actual tests this skill helps verify
- `backend-tester` - Backend equivalent for Go/Python tests

## Summary

**Core truth**: Test count means nothing without knowing what's tested.

**Protocol**: Before reporting metrics, spend 5 minutes verifying:
1. Test files have corresponding production files
2. Calculate coverage from production files (not test files)
3. Report coverage percentage, not just test count

**Red flag phrases that trigger this skill**:
- "X tests passing"
- "100% pass rate"
- "Created Y test files"
- Any metric without coverage context

**Correct reporting pattern**:
"Tested X of Y production files (Z% coverage). Created N test files, all have corresponding production code. All M tests passing."

**Time investment**: 5 minutes verification prevents 30 minutes explaining wrong metrics.
