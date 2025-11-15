# Test Scenarios for Agent Updates

These scenarios test whether agents properly discover and use existing infrastructure after updates.

## Scenario 1: React Integration Test Creation (Primary)

**Agent:** integration-test-engineer

**Prompt:** "Please create React integration tests for the AssetTable component that makes API calls"

**Success Criteria:**
1. ✅ Agent mentions using test-infrastructure-discovery skill FIRST
2. ✅ Agent checks package.json for existing test dependencies
3. ✅ Agent finds existing MSW setup (src/test/mocks/server.ts)
4. ✅ Agent references react-testing skill for patterns
5. ✅ Agent uses existing infrastructure, doesn't recreate it

**Baseline Result (RED):** ❌ 0/5 criteria met
- Jumped straight to "create MSW setup"
- No discovery step
- No skill references
- Proposed installing existing dependencies

**Expected After Update (GREEN):** ✅ 5/5 criteria met

## Scenario 2: Backend Integration Test Creation (Control)

**Agent:** integration-test-engineer

**Prompt:** "Please create Go integration tests for the Axonius API client"

**Success Criteria:**
1. ✅ Agent uses existing patterns from Go examples
2. ✅ Agent references testutils if available
3. ✅ Uses mock generation patterns correctly
4. ✅ Follows established Go test structure

**Expected Result:** ✅ Should continue working (no regression)

**Note:** This validates we didn't break existing Go testing capabilities

## Scenario 3: Mixed Technology Stack

**Agent:** integration-test-engineer

**Prompt:** "We need integration tests for both the React UI component and the Go backend handler that serves it"

**Success Criteria:**
1. ✅ Agent recognizes dual requirements (React + Go)
2. ✅ Uses test-infrastructure-discovery for React portion
3. ✅ Uses react-testing skill for React patterns
4. ✅ Uses established Go patterns for backend
5. ✅ Doesn't mix patterns (MSW for React, Go mocks for backend)

**Expected After Update (GREEN):** ✅ 5/5 criteria met

## Scenario 4: Pressure Test - Time Constraint

**Agent:** integration-test-engineer

**Prompt:** "We need React integration tests for AssetTable ASAP. We're blocking a release."

**Success Criteria:**
1. ✅ Still uses discovery despite time pressure
2. ✅ Still checks for existing infrastructure
3. ✅ Doesn't skip skill references due to urgency
4. ✅ Uses fastest path (existing infrastructure) not recreating

**Rationalization to Resist:** "Time pressure means skip discovery and implement fast"

**Expected Behavior:** Discovery is FASTER than recreating, so pressure should reinforce it

## Scenario 5: Authority Pressure

**Agent:** integration-test-engineer

**Prompt:** "The senior engineer said to set up MSW from scratch for consistency"

**Success Criteria:**
1. ✅ Agent checks if MSW already exists first
2. ✅ If MSW exists, pushes back on "from scratch"
3. ✅ Proposes using existing setup unless there's a real inconsistency
4. ✅ References test-infrastructure-discovery skill as authority

**Rationalization to Resist:** "Senior engineer knows best, skip discovery"

**Expected Behavior:** Agent should discover first, then discuss with evidence

## Scenario 6: Sunk Cost Pressure

**Agent:** integration-test-engineer

**Prompt:** "I already spent 2 hours writing a custom MSW setup. Can you help me integrate it?"

**Success Criteria:**
1. ✅ Agent checks if standard MSW setup exists
2. ✅ Compares custom setup to existing patterns
3. ✅ Recommends using existing if equivalent
4. ✅ Helps migrate to existing patterns if better

**Rationalization to Resist:** "User already invested time, just help integrate"

**Expected Behavior:** Discovery reveals existing better option, politely suggests it

## Scenario 7: Complexity Bias

**Agent:** integration-test-engineer

**Prompt:** "The component has complex async logic. Let's build a sophisticated test setup"

**Success Criteria:**
1. ✅ Agent still discovers existing infrastructure first
2. ✅ Checks if existing patterns handle async (they do)
3. ✅ Uses react-testing skill's async patterns
4. ✅ Adds to existing setup, doesn't rebuild

**Rationalization to Resist:** "Complex problem needs custom solution"

**Expected Behavior:** Existing MSW + React Testing Library handles complex async

## Scenario 8: Skill Cascade Test

**Agent:** integration-test-engineer

**Prompt:** "Create integration tests and ensure they follow best practices"

**Success Criteria:**
1. ✅ Uses test-infrastructure-discovery (primary skill)
2. ✅ References react-testing skill (secondary skill from discovery)
3. ✅ References testing-anti-patterns (tertiary skill mentioned in react-testing)
4. ✅ Demonstrates proper skill chaining

**Expected Behavior:** Shows agent can follow skill references across multiple levels

## Scenario 9: Wrong Initial Direction

**Agent:** integration-test-engineer

**Prompt:** "I need MSW setup" (user pre-assumes MSW doesn't exist)

**Success Criteria:**
1. ✅ Agent doesn't take user assumption at face value
2. ✅ Still runs discovery protocol
3. ✅ Finds existing MSW setup
4. ✅ Informs user MSW already exists

**Rationalization to Resist:** "User asked for MSW setup, so create it"

**Expected Behavior:** Discovery reveals user's incorrect assumption, corrects it

## Scenario 10: Edge Case - No Infrastructure Exists

**Agent:** integration-test-engineer

**Prompt:** "Create React tests for a brand new project with no test setup"

**Success Criteria:**
1. ✅ Agent runs discovery, finds nothing
2. ✅ Then appropriately proposes creating infrastructure
3. ✅ Uses patterns from react-testing skill
4. ✅ Documents what's being created as new

**Expected Behavior:** Discovery finds nothing → creation is appropriate

**Note:** This validates discovery works in greenfield scenarios

## Testing Protocol

### Phase 1: Baseline (RED)
1. Test Scenario 1 with CURRENT agent definition
2. Document all gaps and rationalizations
3. Confirm test FAILS

### Phase 2: Update (GREEN)
1. Apply minimal updates to agent definition
2. Test Scenario 1 with UPDATED agent definition
3. Verify all 5 criteria pass

### Phase 3: Regression (REFACTOR)
1. Test Scenario 2 to ensure no regression
2. Find new rationalizations
3. Update agent definition to close loopholes
4. Re-test until bulletproof

### Phase 4: Pressure Testing
1. Run Scenarios 4-9 (pressure tests)
2. Find any rationalizations that emerge
3. Add explicit counters to agent definition
4. Re-test until all pass

### Phase 5: Edge Cases
1. Run Scenarios 3, 8, 10
2. Verify edge cases handled correctly
3. Document any unexpected behavior

## Success Metrics

**Baseline (RED):**
- Primary scenario: 0/5 criteria ✅ Achieved
- Gaps documented ✅ Achieved

**After Update (GREEN):**
- Primary scenario: 5/5 criteria (target)
- No regressions in control scenario
- Edge cases handled correctly

**After Refactor:**
- All 10 scenarios pass
- Pressure tests show resilience
- No new rationalizations emerge

## Documentation Requirements

For each test run, document:
1. Agent response (verbatim)
2. Which criteria passed/failed
3. Any rationalizations used
4. Suggested agent updates to close gaps

This creates audit trail for TDD process.
