# File Existence Verification - Agent Rollout Plan

**Analysis Date**: 2025-11-18
**Based On**: Testing agent ecosystem analysis

---

## Agent Categorization

### Category A: PRIMARY Test Creation Agents (HIGH PRIORITY)

**These agents' PRIMARY job is creating/fixing tests - MUST have file verification**

| Agent | Status | Priority | Reason |
|-------|--------|----------|--------|
| frontend-unit-test-engineer | ✅ UPDATED | DONE | Unit tests (Vitest, React Testing Library) |
| frontend-integration-test-engineer | ❌ NEEDS UPDATE | 🔴 CRITICAL | API integration tests with MSW |
| backend-unit-test-engineer | ❌ NEEDS UPDATE | 🔴 CRITICAL | Go/Python unit tests |
| backend-integration-test-engineer | ❌ NEEDS UPDATE | 🔴 CRITICAL | API contract, service integration |

**Impact**: These 4 agents create the MOST test files. Without verification, they repeat our 22-hour mistake.

---

### Category B: E2E/Browser Test Agents (MEDIUM PRIORITY)

**Create Playwright/E2E test files - should have verification**

| Agent | Status | Priority | Reason |
|-------|--------|----------|--------|
| frontend-browser-test-engineer | ❌ NEEDS UPDATE | 🟡 MEDIUM | E2E tests via Chrome DevTools |
| frontend-e2e-browser-test-engineer | ❌ NEEDS UPDATE | 🟡 MEDIUM | Playwright E2E tests |

**Impact**: E2E tests are higher-level, but still benefit from production file verification

**Difference from Category A**: E2E tests may test workflows across multiple components, so "production file" check is less strict. But test file verification still applies.

---

### Category C: Test Coordination Agents (ALREADY UPDATED)

**Coordinate test work - already have discovery phase**

| Agent | Status | Priority | Reason |
|-------|--------|----------|--------|
| test-coordinator | ✅ UPDATED | DONE | Coordinates comprehensive testing |
| quality-coordinator | ⏭️ CONSIDER | 🟢 LOW | Quality review (might dispatch tests) |

**Impact**: test-coordinator already updated. quality-coordinator might benefit but lower priority.

---

### Category D: Assessment Agents (NO UPDATE NEEDED)

**Assess test quality but don't create tests**

| Agent | Status | Priority | Reason |
|-------|--------|----------|--------|
| test-quality-assessor | ❌ NO UPDATE | N/A | Only assesses, doesn't create |
| test-coverage-auditor | ❌ NO UPDATE | N/A | Only audits, doesn't create |

**Impact**: These agents review tests but don't create them. File verification not applicable.

---

### Category E: Development Agents (OPTIONAL)

**Might create tests as part of TDD, but testing isn't primary job**

| Agent | Status | Priority | Reason |
|-------|--------|----------|--------|
| react-developer | ⏭️ OPTIONAL | 🟢 LOW | Might create component tests in TDD |
| go-developer | ⏭️ OPTIONAL | 🟢 LOW | Might create Go tests in TDD |
| go-api-developer | ⏭️ OPTIONAL | 🟢 LOW | Might create API tests |
| python-developer | ⏭️ OPTIONAL | 🟢 LOW | Might create pytest tests |

**Impact**: Would benefit but not critical since testing is secondary responsibility.

---

## Recommended Rollout

### Phase 1: Critical Test Agents (4 agents, 4 hours) 🔴

**Must update immediately**:
1. frontend-integration-test-engineer
2. backend-unit-test-engineer
3. backend-integration-test-engineer
4. ~~frontend-unit-test-engineer~~ ✅ DONE

**Why first**: These agents' PRIMARY job is testing. Highest risk of repeating our mistake.

**Implementation**: Add same VBT protocol we added to frontend-unit-test-engineer

---

### Phase 2: E2E Test Agents (2 agents, 2 hours) 🟡

**Should update soon**:
1. frontend-browser-test-engineer
2. frontend-e2e-browser-test-engineer

**Why second**: E2E tests less likely to have our specific issue (testing workflows, not isolated files), but still benefit from verification.

**Implementation**: Slightly different protocol - E2E tests may test multiple production files, so verify:
- Test file path clear
- At least one production file in workflow exists
- Not creating E2E test for completely non-existent feature

---

### Phase 3: Development Agents (4 agents, 2 hours) 🟢

**Nice to have**:
1. react-developer
2. go-developer
3. go-api-developer
4. python-developer

**Why last**: Testing is incidental to their main job. Lower risk.

**Implementation**: Lighter-weight protocol - just add reminder to use verify-test-file-existence skill when creating tests as part of TDD.

---

## Implementation Strategy

### Template: High-Priority Test Agents

**For frontend-integration-test-engineer, backend-unit-test-engineer, backend-integration-test-engineer**:

Add this EXACT section (copy from frontend-unit-test-engineer):

```markdown
## MANDATORY: Verify Before Test (VBT Protocol)

**Before ANY test work - ALWAYS run this 5-minute verification:**

### File Existence Verification (CRITICAL)

**For "Fix failing tests" requests:**

```bash
# Step 1: Verify test file exists
if [ ! -f "$TEST_FILE" ]; then
  echo "❌ STOP: Test file does not exist: $TEST_FILE"
  echo "Cannot fix non-existent tests."
  RESPOND: "Test file $TEST_FILE doesn't exist. Should I:
    a) Create it (requires requirements)
    b) Get correct file path
    c) See list of actual failing tests"
  EXIT - do not proceed
fi

# Step 2: Verify production file exists
PROD_FILE=$(echo "$TEST_FILE" | sed 's/__tests__\///g' | sed 's/\.test\././g')
if [ ! -f "$PROD_FILE" ]; then
  echo "❌ STOP: Production file does not exist: $PROD_FILE"
  echo "Cannot test non-existent code."
  RESPOND: "Production file $PROD_FILE doesn't exist. Should I:
    a) Implement the feature first (TDD)
    b) Verify correct location
    c) Get clarification on requirements"
  EXIT - do not proceed
fi

# Step 3: Only proceed if BOTH exist
echo "✅ Verification passed - proceeding with test work"
```

**For "Create tests" requests:**
- ALWAYS verify production file exists first
- If production file missing → ASK before proceeding
- Do NOT assume file location without checking

**No exceptions:**
- Not for "simple" test files
- Not for "probably exists"
- Not when "time pressure"
- Not when "user wouldn't give wrong path"

**Why:** 5 minutes of verification prevents 22 hours creating tests for non-existent files.

**REQUIRED SKILL:** Use verify-test-file-existence skill for complete protocol

---
```

**Location**: Add immediately after agent description (line ~10), before main expertise sections

---

### Template: E2E Test Agents

**For frontend-browser-test-engineer, frontend-e2e-browser-test-engineer**:

Add this MODIFIED section (E2E-appropriate):

```markdown
## MANDATORY: Verify Before E2E Test Creation

**Before creating E2E tests - verify feature exists:**

### E2E Test Verification (CRITICAL)

**For "Fix failing E2E tests" requests:**

```bash
# Step 1: Verify E2E test file exists
if [ ! -f "$E2E_TEST_FILE" ]; then
  echo "❌ STOP: E2E test file does not exist: $E2E_TEST_FILE"
  RESPOND: "E2E test file doesn't exist. Should I:
    a) Create it (requires user workflow requirements)
    b) Get correct file path
    c) See list of actual failing E2E tests"
  EXIT - do not proceed
fi

# Step 2: Verify at least one production file in workflow exists
# E2E tests may test multiple components, verify key ones exist
PRIMARY_COMPONENT="src/sections/feature/MainComponent.tsx" # Derive from test context

if [ ! -f "$PRIMARY_COMPONENT" ]; then
  echo "❌ STOP: Primary component does not exist: $PRIMARY_COMPONENT"
  RESPOND: "Cannot create E2E test - primary feature component doesn't exist.
    Should I wait for implementation first?"
  EXIT - do not proceed
fi

echo "✅ Verification passed - proceeding with E2E test work"
```

**For "Create E2E tests for feature" requests:**
- Verify feature implementation exists (pages, components)
- Don't create E2E tests for unimplemented features
- Ask for clarification if feature files missing

**Why:** E2E tests are expensive. Don't create them for features that don't exist yet.

**REQUIRED SKILL:** Use verify-test-file-existence skill

---
```

**Location**: Add immediately after agent description

---

### Template: Development Agents (Optional)

**For react-developer, go-developer, etc.**:

Add lighter-weight reminder:

```markdown
## Test Creation Reminder

When creating tests as part of development:

**REQUIRED SKILL:** Use verify-test-file-existence skill before creating test files

**Quick check:**
- Test file doesn't exist yet? ✅ Good (creating new)
- Production file exists? ✅ Good (testing real code)
- Production file missing? ❌ Implement feature first, then test

**Why:** Don't create tests for code that doesn't exist (except in TDD where you write test first intentionally).
```

**Location**: Add in "Testing" or "Quality" section if exists, or after main responsibilities

---

## Priority Rollout

### Immediate (4 hours) - Complete Category A

```bash
# 1. frontend-integration-test-engineer (1h)
# 2. backend-unit-test-engineer (1h)
# 3. backend-integration-test-engineer (1h)
# 4. All 3 agents tested with same scenario (1h)
```

**Why**: These are the agents most likely to repeat our mistake

---

### Soon (2 hours) - Complete Category B

```bash
# 1. frontend-browser-test-engineer (1h)
# 2. frontend-e2e-browser-test-engineer (1h)
```

**Why**: E2E tests are expensive, should verify before creating

---

### Optional (2 hours) - Category E

```bash
# 1. react-developer (30min)
# 2. go-developer (30min)
# 3. go-api-developer (30min)
# 4. python-developer (30min)
```

**Why**: Nice to have but lower risk

---

## Testing Strategy

### Verify Each Update Works

**For each agent updated, test with**:

**Scenario 1: Fix Non-Existent Test**
```
Prompt: "Fix failing tests in NonExistent.test.tsx"
Expected: Agent stops, asks for clarification
```

**Scenario 2: Create Test for Non-Existent File**
```
Prompt: "Create tests for NonExistentComponent"
Expected: Agent asks if component should be implemented first
```

**Scenario 3: Legitimate Test Work**
```
Prompt: "Fix failing tests in ActualFile.test.tsx" (file exists)
Expected: Agent verifies, then proceeds normally
```

---

## Special Considerations

### Frontend Integration Tests

**Challenge**: May test hooks that don't have standalone files

**Solution**: Verify the component/page using the hook exists
```bash
# Instead of looking for "useAssets.tsx"
# Look for component that uses it: "src/sections/assets/AssetsPage.tsx"
```

### E2E Tests

**Challenge**: Test workflows across multiple components

**Solution**: Verify PRIMARY component exists, not all components
```bash
# E2E test: "user login workflow"
# Verify: src/pages/Login.tsx exists (main entry point)
# Don't require: every component in workflow exists
```

### Backend Integration Tests

**Challenge**: May test API endpoints, not specific files

**Solution**: Verify handler file exists
```bash
# Integration test: "POST /api/users endpoint"
# Verify: src/handlers/users/create.go exists
```

---

## Recommendation

### Immediate Action (4 hours)

**Update these 3 agents NOW**:
1. ✅ frontend-integration-test-engineer
2. ✅ backend-unit-test-engineer
3. ✅ backend-integration-test-engineer

**Why**: Highest risk, most likely to create tests for non-existent files

**Method**: Copy exact VBT protocol from frontend-unit-test-engineer

---

### Short-term (2 hours)

**Update these 2 agents SOON**:
1. frontend-browser-test-engineer
2. frontend-e2e-browser-test-engineer

**Why**: E2E tests are expensive, should verify before creating

**Method**: Use E2E-adapted template (verify workflow components exist)

---

### Optional (2 hours)

**Consider updating**:
1. react-developer
2. go-developer
3. go-api-developer
4. python-developer

**Why**: Lower risk but would complete coverage

**Method**: Lightweight reminder to use verify-test-file-existence skill

---

## Total Effort

| Priority | Agents | Time | Benefit |
|----------|--------|------|---------|
| ✅ Done | 2 | 3h | Coordinator + unit test |
| 🔴 Immediate | 3 | 4h | Integration + backend |
| 🟡 Soon | 2 | 2h | E2E/browser |
| 🟢 Optional | 4 | 2h | Development agents |
| **Total** | **11** | **11h** | **Complete coverage** |

---

## ROI Analysis

**Investment**: 11 hours to update all test-creating agents

**Return per incident prevented**:
- Category A agents: 22 hours saved (our session)
- Category B agents: 10-15 hours saved (E2E test creation)
- Category E agents: 5-10 hours saved (incidental test creation)

**Break-even**: After 1 incident with any Category A agent

**Long-term**: 10x-20x ROI (prevents multiple 22-hour wastes)

---

## Implementation Checklist

### Immediate Priority (Do Today)

- [ ] Update frontend-integration-test-engineer
- [ ] Update backend-unit-test-engineer
- [ ] Update backend-integration-test-engineer
- [ ] Test all 3 with non-existent file scenario
- [ ] Commit as batch: "feat: add file verification to all primary test agents"

**Time**: 4 hours
**Prevents**: 22-hour wastes across all test types

### Short-term Priority (This Week)

- [ ] Update frontend-browser-test-engineer (E2E variant)
- [ ] Update frontend-e2e-browser-test-engineer (E2E variant)
- [ ] Test both with non-existent workflow scenario
- [ ] Commit: "feat: add file verification to E2E test agents"

**Time**: 2 hours
**Prevents**: E2E test creation for non-existent features

### Optional (Within Month)

- [ ] Add lightweight reminder to react-developer
- [ ] Add lightweight reminder to go-developer
- [ ] Add lightweight reminder to go-api-developer
- [ ] Add lightweight reminder to python-developer
- [ ] Commit: "feat: add test file verification reminder to development agents"

**Time**: 2 hours
**Prevents**: Incidental test creation for non-existent code

---

## Special Case: Test Coverage Auditor

**Question**: Should test-coverage-auditor verify files exist?

**Answer**: **Different verification needed**

test-coverage-auditor ANALYZES coverage, doesn't create tests. But it should:
- Verify files it's analyzing exist
- Report if test files exist without production files (our issue!)
- This is COVERAGE verification, not FILE verification

**Recommendation**: Create separate update for test-coverage-auditor:
- Add check: "Test files without production files detected"
- Report these as anomalies
- Alert when test-to-prod mapping is broken

---

## Conclusion

### Must Update (Category A - 3 agents)

**Immediate**: frontend-integration-test-engineer, backend-unit-test-engineer, backend-integration-test-engineer

**Why**: Prevent 22-hour wastes in all primary testing contexts

**Time**: 4 hours

---

### Should Update (Category B - 2 agents)

**Soon**: frontend-browser-test-engineer, frontend-e2e-browser-test-engineer

**Why**: E2E tests expensive, should verify before creating

**Time**: 2 hours

---

### Could Update (Category E - 4 agents)

**Optional**: Development agents (react, go, api, python)

**Why**: Complete coverage, but lower risk

**Time**: 2 hours

---

### Total: 11 agents, 8 hours for complete ecosystem protection

**Current**: 2 of 11 agents updated (18%)
**After Immediate**: 5 of 11 agents updated (45%)
**After Soon**: 7 of 11 agents updated (64%)
**After Optional**: 11 of 11 agents updated (100%)

**Recommendation**: Focus on Immediate (4 hours) to get 45% coverage of high-risk agents.
