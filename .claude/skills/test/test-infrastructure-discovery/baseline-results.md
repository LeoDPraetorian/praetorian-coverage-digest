# Baseline Test Results - Test Infrastructure Discovery

## Scenario 1 - Baseline Run (WITHOUT skill)

**Agent:** integration-test-engineer
**Scenario:** React integration tests with timeout errors (10/20 failing)

### What Agent DIDN'T Check

❌ **Did NOT check package.json** for installed test infrastructure (MSW, testing libraries)
❌ **Did NOT search for existing** test mocking setup (src/test/mocks/server.ts)
❌ **Did NOT look for existing** test utility patterns (src/test-utils.tsx)
❌ **Did NOT search for** existing test files to understand established patterns
❌ **Did NOT check for** react-testing skill or other testing skills

### What Agent DID (Proposed Solutions)

✅ Proposed multiple solutions (A, B, C, D)
✅ Suggested creating MSW setup from scratch
✅ Recommended creating test-utils.tsx with QueryClient config
✅ Proposed adding timeout configurations
✅ Provided comprehensive solution with code examples

### Critical Gap Observed

**The agent proposed creating infrastructure that ALREADY EXISTS in the project:**

**Reality Check (from our actual codebase):**
- ✅ MSW **IS** installed: `package.json` has `"msw": "^2.12.1"`
- ✅ MSW **IS** configured: `src/test/mocks/server.ts` exists with setupServer
- ✅ react-testing skill **HAS** comprehensive MSW patterns
- ✅ Test fixtures exist in `src/fixtures/` with established patterns

**Agent's Proposal:**
- ❌ "Create MSW setup" (already exists)
- ❌ "Add MSW handlers" (structure exists, just needs specific handlers)
- ❌ "Install MSW" (already installed)

### Behavior Pattern

**Agent operated in "solution mode" instead of "discovery mode":**

1. Made assumptions about missing infrastructure
2. Jumped straight to proposing solutions
3. Didn't verify assumptions before recommending work
4. Proposed creating from scratch instead of using existing tools

### Rationalizations (Implicit)

- "I'll propose comprehensive solutions" (without checking what exists)
- "These are best practices" (without checking if already established)
- "This will fix the problem" (without investigating the environment first)

### What SHOULD Have Happened

**Discovery-first approach:**

1. ✅ Check package.json for test dependencies
2. ✅ Search for existing test setup files
3. ✅ Find src/test/mocks/server.ts
4. ✅ Review existing test patterns in __tests__ directories
5. ✅ Check for relevant testing skills (react-testing)
6. ✅ Propose solution using existing infrastructure

**Result:** Agent would have found MSW is ready to use, just needs specific handlers

---

## Key Insights for Skill Design

### Primary Problem

**Agents jump to solutions without discovering available infrastructure.**

### Required Behavior Change

**Before proposing ANY test implementation:**
1. MUST check package.json for test dependencies
2. MUST search for existing test setup (src/test/, __tests__/)
3. MUST review existing test files for established patterns
4. MUST check for relevant skills (react-testing, etc.)

### Skill Must Counter These Rationalizations

- "I know what best practices are, I'll implement them"
- "This is a standard setup, I'll create it"
- "The solution is obvious, no need to check"
- "Time pressure means I should jump straight to fixing"

### Discovery Protocol Must Be

- ✅ **Mandatory** - Not optional or situational
- ✅ **Specific** - Exact files/locations to check
- ✅ **Fast** - Can be done in < 2 minutes
- ✅ **Checklistable** - Clear steps that can be verified

---

## Next Steps for GREEN Phase

**Skill must include:**

1. **Explicit discovery checklist** - Mandatory steps before any test implementation
2. **File locations to check** - package.json, src/test/, __tests__/, vitest.config.ts
3. **Skill cross-references** - Check for react-testing and other testing skills
4. **Stop signals** - Red flags for when you're skipping discovery
5. **Rationalization table** - Address "I know best practices" mentality

**Test for success:**
- Agent runs same scenario WITH skill
- Agent checks all discovery points BEFORE proposing solution
- Agent finds existing MSW setup
- Agent proposes using existing infrastructure, not creating from scratch
