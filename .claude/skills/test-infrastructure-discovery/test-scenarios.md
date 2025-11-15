# Test Infrastructure Discovery - Pressure Scenarios

## Scenario 1: React Integration Test with Unknown MSW Setup
**Pressure:** Time pressure + existing test failures + user expects immediate fix

**Context:**
- React component with TanStack Query integration tests failing
- MSW already installed and configured in project
- Agent doesn't know about MSW setup
- 10 tests failing due to timeout issues with real API calls

**User Message:**
"The InfiniteScrollIndicator integration tests are failing with timeout errors. 10 out of 20 tests are timing out when useInfiniteQuery tries to fetch data. Can you fix these tests quickly? They're blocking the PR."

**Expected Baseline Behavior (WITHOUT skill):**
- Agent attempts to increase timeout values
- Agent doesn't check package.json for MSW
- Agent doesn't discover src/test/mocks/server.ts
- Agent may suggest mocking useInfiniteQuery directly
- Agent misses that MSW is already set up and ready to use

**Expected Corrected Behavior (WITH skill):**
- Agent checks package.json for test infrastructure
- Agent discovers MSW is installed
- Agent finds existing MSW setup in src/test/mocks/server.ts
- Agent creates MSW handlers to mock API responses
- Agent references existing patterns from react-testing skill

---

## Scenario 2: Backend Integration Test with Existing Mock Patterns
**Pressure:** Production bug + need comprehensive tests + authority pressure

**Context:**
- Go backend service with integration test failures
- testcontainers library already set up
- Existing test utilities in pkg/testutils/
- Agent needs to write integration tests for new endpoint

**User Message:**
"We have a production bug in the new asset endpoint. Write comprehensive integration tests to catch this class of issues. This is critical - the CTO wants tests today."

**Expected Baseline Behavior (WITHOUT skill):**
- Agent writes tests from scratch
- Agent doesn't check for existing test infrastructure
- Agent may duplicate existing test utilities
- Agent misses testcontainers setup that could provide real database
- Agent creates inferior mocks when better tools exist

**Expected Corrected Behavior (WITH skill):**
- Agent searches for existing test files to understand patterns
- Agent discovers testcontainers setup
- Agent finds and reuses pkg/testutils/ helpers
- Agent follows established test patterns from codebase
- Agent writes tests consistent with existing infrastructure

---

## Scenario 3: E2E Test with Playwright - Missing Fixtures
**Pressure:** Sunk cost (wrote tests already) + exhaustion + time pressure

**Context:**
- Wrote 15 E2E tests without checking existing patterns
- Project has established Playwright fixture patterns in src/fixtures/
- Tests use different authentication patterns than rest of codebase
- User now wants tests to match existing patterns

**User Message:**
"I reviewed your E2E tests - they don't use our established user fixtures from src/fixtures/. Can you refactor these 15 tests to use our standard patterns? We need this PR merged by EOD."

**Expected Baseline Behavior (WITHOUT skill):**
- Agent resists refactoring (sunk cost rationalization)
- "The tests work fine as-is, refactoring isn't necessary"
- "This would be faster if we just merge what works"
- Agent may do minimal changes without understanding full fixture patterns

**Expected Corrected Behavior (WITH skill):**
- Agent acknowledges tests should have used fixtures from start
- Agent examines src/fixtures/ to understand established patterns
- Agent refactors tests to use standard fixtures
- Agent references existing test patterns as authoritative

---

## Scenario 4: Unit Tests with Unknown Vitest Configuration
**Pressure:** Multiple pressures - time + quality expectations + existing failures

**Context:**
- Project uses Vitest with custom configuration
- vitest.config.ts has special setup for coverage and mocking
- Agent writes tests without understanding coverage configuration
- Tests run but coverage reports are incorrect

**User Message:**
"Write unit tests for the new validation functions. Make sure we maintain our 90% coverage threshold. Tests need to be done in the next hour for the PR."

**Expected Baseline Behavior (WITHOUT skill):**
- Agent writes tests without checking vitest.config.ts
- Agent doesn't understand custom coverage configuration
- Tests may pass but coverage metrics are wrong
- Agent may miss required setup files (setupFiles config)

**Expected Corrected Behavior (WITH skill):**
- Agent reads vitest.config.ts to understand test configuration
- Agent discovers setupFiles and global test setup
- Agent understands coverage thresholds and requirements
- Agent writes tests that integrate correctly with existing infrastructure

---

## Scenario 5: Testing Skill Discovery (Meta-Test)
**Pressure:** Confusion + multiple available skills + time pressure

**Context:**
- Multiple testing skills available (react-testing, test-driven-development, testing-anti-patterns)
- Agent needs to write React component tests with MSW
- Not sure which skill to reference
- User expects fast, correct implementation

**User Message:**
"Write integration tests for the new Dashboard component that fetches data from our API. Make sure they follow our testing best practices."

**Expected Baseline Behavior (WITHOUT skill):**
- Agent may not check for testing skills
- Agent may write tests without referencing established patterns
- Agent misses that react-testing skill has comprehensive MSW guidance
- Agent reinvents patterns that already exist in skills

**Expected Corrected Behavior (WITH skill):**
- Agent checks for relevant testing skills
- Agent discovers react-testing skill has MSW patterns
- Agent references react-testing skill for established patterns
- Agent follows skill guidance instead of guessing

---

## Testing Protocol

**For each scenario:**

1. **Baseline Test (RED):**
   - Run with fresh agent (no skill loaded)
   - Apply all pressure types listed
   - Document verbatim rationalizations
   - Note what agent DOESN'T check

2. **With Skill Test (GREEN):**
   - Run same scenario with skill loaded
   - Verify agent follows discovery protocol
   - Confirm agent finds and uses infrastructure

3. **Document Results:**
   - What changed in agent behavior?
   - What rationalizations disappeared?
   - What new loopholes emerged?

4. **Iterate:**
   - Add explicit counters for new rationalizations
   - Re-test until bulletproof
   - Update skill based on findings
