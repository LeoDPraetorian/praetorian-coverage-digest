# Baseline Test Results (RED Phase)

**Date:** 2025-11-15
**Agent Under Test:** integration-test-engineer
**Test Scenario:** Creating React integration tests

## The Gap We Discovered

### Context
User requested React integration tests be created. The integration-test-engineer agent was dispatched to handle this task.

### Expected Behavior
Agent should:
1. Use test-infrastructure-discovery skill BEFORE proposing solutions
2. Check for existing MSW setup
3. Reference react-testing skill for patterns
4. Use established infrastructure instead of recreating it

### Actual Behavior (BASELINE - WITHOUT SKILL)

Agent immediately proposed creating new test infrastructure from scratch:

```markdown
Agent Response:
"Let's set up MSW (Mock Service Worker) for API mocking..."

Proposed Steps:
1. Install MSW: npm install -D msw@latest
2. Create src/__tests__/mocks/handlers.ts
3. Create src/__tests__/mocks/server.ts
4. Set up MSW configuration from scratch
```

### Gap Identified

**Agent didn't know:**
- test-infrastructure-discovery skill exists
- react-testing skill has comprehensive MSW patterns
- MSW was already installed and configured
- Existing test setup files (src/test/mocks/server.ts) were available

**Root Cause:**
Agent instructions in `.claude/agents/testing/integration-test-engineer.md` have:
- ❌ No reference to test-infrastructure-discovery skill
- ❌ No reference to react-testing skill
- ❌ Go-focused patterns (98% of examples are Go)
- ❌ No awareness of frontend test infrastructure
- ❌ No "check before creating" protocol

### Evidence from Agent Definition

**Line 39:** "Write automated integration tests using appropriate frameworks (Vitest, Playwright, Postman/Newman, etc.)"
- Lists frameworks but no discovery protocol

**Lines 79-429:** All examples are Go-based integration tests
- No React testing patterns
- No MSW awareness
- No frontend integration testing guidance

**Missing sections:**
- No "Before creating tests" checklist
- No skill cross-references
- No test infrastructure discovery step
- No "check package.json first" instruction

## Pattern Analysis

### What Agent Proposed (Incorrect)
1. Proposed installing dependencies without checking package.json
2. Proposed creating MSW setup without checking existing files
3. Proposed building from scratch without discovering existing patterns
4. No mention of checking for relevant skills

### What Agent Should Have Done (Correct)
1. Use test-infrastructure-discovery skill
2. Check package.json for MSW installation
3. Find existing src/test/mocks/server.ts
4. Reference react-testing skill for patterns
5. Use existing infrastructure, add only what's needed

## Gap Classification

**Type:** Missing Skill References + Wrong Domain Focus

**Severity:** High
- Causes wasted effort (recreating existing infrastructure)
- Creates inconsistent patterns (new setup vs existing)
- Breaks established conventions
- Wastes time (30+ minutes to discover mistake)

**Scope:** Affects all React/frontend integration testing tasks

## Test Scenario for Validation

**Scenario:** "Please create React integration tests for the AssetTable component"

**Success Criteria:**
- Agent MUST mention test-infrastructure-discovery skill
- Agent MUST check package.json before proposing installations
- Agent MUST find existing MSW setup before creating new one
- Agent MUST reference react-testing skill for patterns

**Current Result:** ❌ FAIL (0/4 criteria met)

**After Fix Expected:** ✅ PASS (4/4 criteria met)

## Rationalizations Agent Used

| Rationalization | Why It Happened |
|-----------------|------------------|
| "Let's set up MSW..." | No instruction to check first |
| "Install msw@latest" | No instruction to check package.json |
| "Create handlers.ts" | No instruction to find existing files |
| "Here's how to configure MSW..." | No reference to react-testing skill |

## Documentation Evidence

**Agent file checked:** `.claude/agents/testing/integration-test-engineer.md`

**Key findings:**
- Total lines: 520
- Go examples: ~350 lines (67%)
- React examples: 0 lines (0%)
- Skill references: 0
- MSW mentions: 0
- test-infrastructure-discovery mentions: 0
- react-testing mentions: 0

## Baseline Test Verdict

**Status:** ❌ RED - Test Failed

**Agent successfully reproduced gap without skill updates:**
- Proposed creating existing infrastructure
- Suggested installing existing dependencies
- No discovery protocol followed
- No skill references used

**This baseline confirms the gap exists and needs addressing.**

## Next Steps (GREEN Phase)

Create minimal updates to integration-test-engineer.md:
1. Add "Before creating tests" section
2. Reference test-infrastructure-discovery skill
3. Reference react-testing skill for React tests
4. Add discovery protocol to test implementation strategy
5. Balance Go/React examples (currently 100% Go)

**Then re-run scenario and verify all 4 success criteria pass.**
