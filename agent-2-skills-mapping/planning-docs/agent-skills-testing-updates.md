# Test Session Analysis: Skills & Agent Improvements

**Session Date**: 2025-11-17
**Session Duration**: 22 hours
**Analysis Date**: 2025-11-18

---

## Executive Summary

Analysis of a comprehensive test-fixing session revealed **5 critical new skills needed**, **3 existing skills requiring updates**, and **4 agent improvements** to prevent similar issues.

**Core Problem**: Agents created 266 comprehensive tests for non-existent files when asked to "fix failing tests", resulting in tests that passed but provided 0% coverage of actual production code.

---

## Session Summary

### What We Thought We Achieved
- Fixed 93 tests (183 → 276)
- 9 test files at 100%
- 92% pass rate
- Ready for PR

### What test-quality-assessor Revealed
- Only 6 actual test files exist (not 9)
- Only 30 real tests (infrastructure + impersonation)
- The "9 files at 100%" were test files AGENTS CREATED during session
- 0% coverage of actual production components (60 files)
- Tests test mocks, not production behavior
- Production broken despite tests passing

### Critical Mistake
Agents created comprehensive tests for non-existent files (UserProfileForm.test.tsx, OrganizationSettingsForm.test.tsx, etc.) when asked to "fix failing tests in these files"

---

## Recommended New Skills (5)

### 1. `test-file-existence-verification` ⭐ CRITICAL

**Purpose**: Verify test files and production files exist before attempting to fix or create tests

**When to Use**:
- Before starting any test-fixing work
- When receiving list of "failing tests" to fix
- Before creating new test files
- When test file paths are provided

**Core Pattern**:
```bash
# Step 1: Verify test file exists
if [ ! -f "$TEST_FILE" ]; then
  echo "❌ Test file does not exist: $TEST_FILE"
  echo "Action: Clarify with user - cannot fix non-existent tests"
  exit 1
fi

# Step 2: Verify production file exists
PROD_FILE=$(echo "$TEST_FILE" | sed 's/__tests__\///g' | sed 's/\.test\././g')
if [ ! -f "$PROD_FILE" ]; then
  echo "❌ Production file does not exist: $PROD_FILE"
  echo "Action: Ask user if this is new feature or incorrect path"
  exit 1
fi

# Step 3: Only proceed if both exist
echo "✅ Files verified. Proceeding with test work."
```

**Why Needed**: Would have caught the core issue in 5 minutes instead of 22 hours

**Impact**: Prevents creating tests for non-existent files

---

### 2. `behavior-vs-implementation-testing` ⭐ CRITICAL

**Purpose**: Distinguish between testing user behavior vs testing implementation details

**When to Use**:
- Writing new tests
- Reviewing test quality
- When tests pass but production broken
- When mocks used extensively

**Core Pattern**:
```typescript
// Decision Tree
Is this test verifying:
├─ User-visible outcome? → ✅ GOOD (behavior test)
├─ API response data? → ✅ GOOD (integration test)
├─ Mock was called? → ❌ BAD (implementation test)
├─ Internal state changed? → ❌ BAD (implementation test)
└─ Function was invoked? → ❌ BAD (implementation test)

// ❌ BAD: Testing implementation
it('should pass email to API', async () => {
  let capturedEmail;
  server.use(http.get('*/my', ({ request }) => {
    capturedEmail = request.headers.get('account');
    return HttpResponse.json({ count: 0, my: [] });
  }));

  render(<Component email="test@example.com" />);
  expect(capturedEmail).toBe("test@example.com");
  // ❌ Only tests header passing, not that impersonation works
});

// ✅ GOOD: Testing behavior
it('should display impersonated user data', async () => {
  server.use(
    http.get('*/my', ({ request }) => {
      const email = request.headers.get('account');
      if (email === 'customer@example.com') {
        return HttpResponse.json({
          count: 1,
          my: [{ name: 'display-name', value: 'Customer Org' }]
        });
      }
      return HttpResponse.json({ count: 0, my: [] });
    })
  );

  render(<Component email="customer@example.com" />);

  // ✅ Verify what user SEES
  await waitFor(() => {
    expect(screen.getByText('Customer Org')).toBeInTheDocument();
  });
});
```

**Why Needed**: Session showed tests verified header forwarding instead of impersonation working

**Impact**: Prevents testing mocks instead of production behavior

---

### 3. `mock-contract-validation`

**Purpose**: Ensure mocks match real API contracts

**When to Use**:
- Creating MSW handlers
- When tests pass but production fails
- After API changes

**Core Pattern**:
```typescript
// Step 1: Document real API contract
/**
 * Real API: GET /my
 * Parameters:
 *   - resource: string (required) ← NOT "label"
 *   - email: string (optional)
 * Response: { count: number, my: T[] }
 */

// Step 2: Create mock matching contract
http.get('*/my', ({ request }) => {
  const url = new URL(request.url);
  const resource = url.searchParams.get('resource'); // ✅ CORRECT
  // NOT: const label = url.searchParams.get('label'); ❌ WRONG

  return HttpResponse.json({ count: 1, my: [data] });
});

// Step 3: Validate checklist
// [ ] Mock uses same parameter names as real API
// [ ] Mock returns same response structure
// [ ] Mock handles same error cases
```

**Why Needed**: MSW used `label` parameter, real API uses `resource` - tests passed, production failed

**Impact**: Prevents mock-reality divergence

---

### 4. `integration-first-testing`

**Purpose**: Prioritize testing integrated workflows before isolated unit tests

**When to Use**:
- Planning test strategy
- When component tests pass but tabs break
- Prioritizing test coverage

**Core Pattern**:
```typescript
// Test Pyramid (Adjusted for Frontend)
//      E2E (10%)
//     /        \
//  Integration (30%)  ← START HERE
//   /            \
// Unit (60%)

// Step 1: Write integration test FIRST
describe('ScanSettingsTab Integration', () => {
  it('should display and update scan settings', () => {
    render(<ScanSettingsTab />); // Full tab
    // Test complete workflow
  });
});

// Step 2: THEN write unit tests
describe('ScanLevelCard Unit', () => {
  it('should render scan level', () => {
    render(<ScanLevelCard />); // Isolated component
  });
});
```

**Why Needed**: Created 266 unit tests for isolated components, 0 tests for tabs integrating them

**Impact**: Ensures integrated workflows work

---

### 5. `test-metrics-reality-check`

**Purpose**: Validate test metrics against production reality

**When to Use**:
- Reporting test completion
- Before creating PRs
- During test reviews

**Core Pattern**:
```bash
# Step 1: Count test files
TEST_FILES=$(find . -name "*.test.tsx" | wc -l)

# Step 2: Count production files they test
PROD_WITH_TESTS=0
for test_file in *.test.tsx; do
  prod_file=$(echo "$test_file" | sed 's/__tests__\///g' | sed 's/\.test\././g')
  if [ -f "$prod_file" ]; then
    ((PROD_WITH_TESTS++))
  fi
done

# Step 3: Reality check
if [ $TEST_FILES -gt $PROD_WITH_TESTS ]; then
  echo "❌ ANOMALY: $TEST_FILES test files but only $PROD_WITH_TESTS production files"
  echo "This suggests tests for non-existent code"
  exit 1
fi

# Step 4: Calculate REAL coverage
ALL_PROD=$(find src -name "*.tsx" ! -name "*.test.tsx" | wc -l)
COVERAGE=$(echo "scale=1; $PROD_WITH_TESTS * 100 / $ALL_PROD" | bc)
echo "📊 Real coverage: $COVERAGE% ($PROD_WITH_TESTS/$ALL_PROD files)"
```

**Why Needed**: Reported "9 files at 100%, 266 tests" without verifying files existed in production

**Impact**: Prevents false progress reporting

---

## Skills to Update (3)

### Update 1: `test-driven-development`

**Current Gap**: No guidance on verifying test files exist before "fixing"

**Proposed Addition** (Add to "Before Writing Tests"):
```markdown
## Pre-Flight Checks (CRITICAL)

Before ANY test work:

### 1. File Existence Verification

**For "Fix Failing Tests" requests:**
- ALWAYS verify test file exists
- ALWAYS verify production file exists
- If either missing: STOP and clarify with user
- DO NOT create files when asked to "fix"

**For "Create New Tests" requests:**
- ALWAYS verify production file exists first
- If missing, ask: "Should I implement feature first?"

### 2. Production File Analysis

Before writing tests:
- Read actual production file
- Understand what it does
- Identify dependencies
- Map user interactions to test scenarios
```

**Location**: First section under "RED Phase"

**Impact**: Prevents fixing non-existent tests (22-hour save)

---

### Update 2: `interactive-form-testing`

**Current Gap**: Doesn't emphasize testing behavior over mocks

**Proposed Addition** (Add new section):
```markdown
## Testing Behavior vs Implementation

### Golden Rule: Test User Outcomes, Not Code Internals

**Mandatory Question**: "Does this test verify something the user sees or experiences?"
- YES → Good test
- NO → Rewrite to test behavior

### Examples

**❌ Implementation**: `expect(mockFn).toHaveBeenCalled()`
**✅ Behavior**: `expect(screen.getByText('Success message')).toBeInTheDocument()`

**❌ Implementation**: `expect(state.value).toBe('new')`
**✅ Behavior**: `expect(input).toHaveValue('new')`
```

**Location**: After "Testing State Transitions"

**Impact**: Focuses tests on user outcomes

---

### Update 3: `testing-anti-patterns`

**Current Gap**: Doesn't warn against creating tests when asked to fix

**Proposed Addition**:
```markdown
## Anti-Pattern: Creating Tests When Asked to Fix

### The Pattern

User: "Fix failing tests in UserProfileForm.test.tsx"
Agent: Creates UserProfileForm.test.tsx with 58 passing tests ❌

### Why Wrong

1. User asked to FIX, not CREATE
2. Didn't verify file existence
3. Tests pass but test nothing
4. False progress

### Correct Response

```typescript
// Step 1: Verify file exists
if (!fileExists('UserProfileForm.test.tsx')) {
  respond: "Cannot fix: UserProfileForm.test.tsx doesn't exist.
    Should I:
    a) Create it (requires requirements)
    b) Find correct file path
    c) Get actual failing test list"
  STOP - do not proceed
}

// Step 2: Only then fix
readFile('UserProfileForm.test.tsx');
identifyFailures();
fixFailures();
```
```

**Location**: Add as new anti-pattern section

**Impact**: Prevents creating when asked to fix

---

## Agent Improvements (4)

### 1. frontend-unit-test-engineer

**Add VBT (Verify Before Test) Protocol**:
```markdown
## MANDATORY: Verify Before Test (VBT)

Before ANY test work:

1. **File Existence Check**
   - Verify test file exists
   - Verify production file exists
   - If either missing: STOP, clarify with user

2. **Production File Analysis**
   - Read production file
   - Understand what it does
   - Map to user behaviors

3. **Behavior Testing Mandate**
   - PRIMARY: Test user-visible outcomes
   - FORBIDDEN: Test only mock calls
   - Question: "Does this verify what users see?"
```

---

### 2. test-coordinator

**Add Discovery Phase**:
```markdown
## Phase 0: Discovery & Verification (NEW - BEFORE PLANNING)

Before creating test plan:

```typescript
async function discoverTestLandscape() {
  const testFiles = await glob('**/*.test.{ts,tsx}');

  const landscape = await Promise.all(testFiles.map(async (testFile) => {
    const prodFile = testFile.replace('/__tests__/', '/').replace('.test.', '.');
    const prodExists = await fileExists(prodFile);

    return { testFile, prodFile, prodExists };
  }));

  const canTest = landscape.filter(f => f.prodExists);
  const cannotTest = landscape.filter(f => !f.prodExists);

  if (cannotTest.length > 0) {
    console.warn(`Cannot test ${cannotTest.length} files - production files missing`);
    await askUser('Should I skip these or create production files first?');
  }

  return canTest; // Only plan work for files that exist
}
```
```

---

### 3. test-quality-assessor

**Add Early Intervention**:
```markdown
## Quality Assessment Protocol

### Phase 0: Sanity Check (RUN AT 1 HOUR, NOT 22 HOURS)

```typescript
async function sanityCheck() {
  // Check 1: Do test files have production files?
  const testFiles = await glob('**/*.test.{ts,tsx}');
  const missingProd = testFiles.filter(tf => {
    const pf = tf.replace('/__tests__/', '/').replace('.test.', '.');
    return !fileExists(pf);
  });

  if (missingProd.length > 0) {
    throw new Error(`CRITICAL: ${missingProd.length} test files have no production file.
      These tests test nothing. STOP work immediately.`);
  }

  // Check 2: Are tests testing behavior?
  const mockOnlyTests = await detectMockTesting(testFiles);
  if (mockOnlyTests.length > testFiles.length * 0.25) {
    console.warn(`WARNING: ${mockOnlyTests.length} tests may test mocks, not behavior`);
  }

  return { passed: missingProd.length === 0 };
}
```

**Scheduling:**
- Run sanity check after 1 hour of work (not 22 hours)
- Run at 25%, 50% milestones
- Catch issues early
```

---

### 4. All Test Agents - Universal Rules

**Add to ALL agents that write tests**:
```markdown
## Universal Test Agent Protocol

### Rule 1: Verify Before Test (VBT)
NEVER write test without:
1. Reading production file
2. Understanding what it does
3. Identifying user-visible behavior

### Rule 2: Behavior Over Implementation (BOI)
ALWAYS prioritize:
1. User-visible outcomes
2. API integration correctness
3. Data persistence verification

NEVER focus on:
1. Mock function calls
2. Internal state changes
3. Implementation details

### Rule 3: Reality Check Metrics (RCM)
BEFORE reporting:
1. Verify test files have production files
2. Calculate coverage from production files
3. Spot check 3 random tests for behavior
4. Confirm metrics match reality

### Rule 4: Integration Before Isolation (IBI)
WHEN planning tests:
1. Start with integration tests (tab/page)
2. Then component tests
3. Then unit tests for utilities
```

---

## Process Improvements (4)

### 1. Testing Workflow Changes

**OLD**:
```
1. Receive "fix tests" request
2. Start writing/fixing tests
3. Report when tests pass
```

**NEW**:
```
1. Receive "fix tests" request
2. **Discovery Phase** (NEW):
   - List all test files mentioned
   - Verify each test file exists
   - Verify each production file exists
   - Report findings, get confirmation
3. **File Existence Gate**:
   - If ANY missing: STOP, clarify
   - If all exist: Proceed
4. **Behavior Mandate**:
   - Read production file
   - Identify user behaviors
   - Map to test scenarios
5. Start testing
6. **Reality Check**:
   - Verify coverage of actual production
   - Spot check behavior testing
7. Report with verified metrics
```

---

### 2. Quality Gates

**Gate 1: Discovery Gate** (Before work):
```
[ ] All test files exist OR user confirmed creation
[ ] All production files exist OR user confirmed TDD
[ ] Production files read and understood
[ ] Test strategy prioritizes integration

Pass: Proceed | Fail: Clarify
```

**Gate 2: Implementation Gate** (25% complete):
```
[ ] All tests have production files
[ ] No tests only verify mock calls
[ ] At least one integration test done
[ ] Metrics match reality

Pass: Continue | Fail: Stop, fix
```

**Gate 3: Completion Gate** (Before reporting):
```
[ ] All test files have production files
[ ] Coverage from production files (not test files)
[ ] Behavior testing confirmed (spot check 3)
[ ] Integration tests for all tabs/pages

Pass: Report | Fail: Fix first
```

---

### 3. Verification Checkpoints

**Checkpoint 1: File Existence** (Time: 5 min, Before work)
```bash
#!/bin/bash
for test_file in "$@"; do
  if [ ! -f "$test_file" ]; then
    echo "❌ Missing: $test_file"
    exit 1
  fi
  prod_file=$(echo "$test_file" | sed 's/__tests__\///g' | sed 's/\.test\././g')
  if [ ! -f "$prod_file" ]; then
    echo "❌ Missing production: $prod_file"
    exit 1
  fi
done
echo "✅ All files exist"
```

**Checkpoint 2: Behavior Testing** (Time: 10 min, 25% complete)
- Sample 3 random tests
- Check if they verify user outcomes
- Warn if >50% test only mocks

**Checkpoint 3: Reality Check** (Time: 5 min, Before completion)
- Count production files
- Count tested production files
- Calculate REAL coverage
- Report based on production, not tests

---

### 4. Reality-Check Procedures

**Procedure 1: Manual Spot Check**
```
1. Pick 3 random test files
2. Verify production file exists
3. Read one test
4. Verify tests user behavior (not mocks)

Time: 10 min | Frequency: Every checkpoint
```

**Procedure 2: Production Coverage**
```
1. List all production files
2. Check which have tests
3. Calculate: tested/total * 100
4. Report REAL coverage

Time: 15 min | Frequency: Before completion
```

---

## Critical Questions Answered

### Q1: Why didn't agents verify files existed?

**Root Causes**:
1. No explicit instruction to verify
2. Assumed "fix tests in X" meant X exists
3. No verification tooling/skill
4. Eagerness to help

**Solutions**:
- `test-file-existence-verification` skill
- VBT rule in all agents
- Discovery gate in workflow
- Hard requirement (not optional)

---

### Q2: Why test mocks instead of behavior?

**Root Causes**:
1. Impersonation pattern encouraged mock testing
2. No behavior-testing guidelines
3. Easier to test mocks than behavior

**Solutions**:
- `behavior-vs-implementation-testing` skill
- BOI rule in all agents
- Behavior mandate in interactive-form-testing
- "Does this test user behavior?" required question

---

### Q3: Why wasn't mock divergence caught earlier?

**Root Causes**:
1. No contract validation
2. MSW makes wrong mocking easy
3. Tests passed with wrong mocks

**Solutions**:
- `mock-contract-validation` skill
- Contract documentation in mocks
- Read real API before mocking

---

### Q4: How prevent fake progress?

**Root Causes**:
1. Metrics based on test files, not production
2. No reality check
3. Celebration without verification

**Solutions**:
- `test-metrics-reality-check` skill
- Metric: production coverage % (not test count)
- Mandatory reality check
- Spot checks

---

### Q5: What makes agents test production reality?

**Solutions**:
- Discovery phase (verify files)
- Integration-first (test workflows)
- Reality gates (25%, 50%, 100%)
- Production-based metrics
- VBT, BOI, RCM, IBI rules

---

## Implementation Plan

### Immediate (7 hours)
1. Create `test-file-existence-verification` skill (2h)
2. Update `test-driven-development` (1h)
3. Update `frontend-unit-test-engineer` with VBT (1h)
4. Update `test-coordinator` with discovery (2h)
5. Add file existence checkpoint script (1h)

### High Priority (9 hours)
1. Create `behavior-vs-implementation-testing` skill (3h)
2. Update `interactive-form-testing` (2h)
3. Update `testing-anti-patterns` (1h)
4. Add behavior checkpoint (1h)
5. Update `test-quality-assessor` (2h)

### Medium Priority (12 hours)
1. Create `mock-contract-validation` skill (3h)
2. Create `integration-first-testing` skill (2h)
3. Create `test-metrics-reality-check` skill (2h)
4. Implement all quality gates (3h)
5. Add reality check procedures (2h)

### Total: 28 hours

**ROI**: Break-even after 2nd incident (saves 22 hours each)

---

## Success Metrics for Next Session

### File Existence:
- [ ] 100% of test files verified before work
- [ ] 100% of production files verified
- [ ] 0 tests created when asked to "fix"
- [ ] Discovery phase <5 minutes

### Behavior Testing:
- [ ] <10% tests verify only mock calls
- [ ] >80% tests verify user outcomes
- [ ] 100% tabs have integration tests
- [ ] Issues caught within 1 hour

### Reality Check:
- [ ] Test file count ≤ Production file count
- [ ] Coverage from production files
- [ ] Spot checks at 25%, 50%, 100%
- [ ] No inflated metrics

---

## Conclusion

The 22-hour session revealed **5 systemic gaps**:
1. No file existence verification
2. Testing mocks instead of behavior
3. Mock-reality divergence
4. Missing integration tests
5. Metrics without reality check

**Proposed solutions**:
- 5 new skills
- 3 skill updates
- 4 agent improvements
- 4 process changes

**Implementation**: 28 hours total
**Impact**: Prevents 22-hour wastes, ensures production-aligned testing

---

**The analysis is complete and actionable. Ready to implement when approved.**
