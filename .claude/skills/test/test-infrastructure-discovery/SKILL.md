---
name: test-infrastructure-discovery
description: Use when writing any tests (unit, integration, E2E) before implementing test code - systematically discovers available test infrastructure (MSW, fixtures, test utilities, established patterns) to avoid recreating existing tools and ensure consistency with project patterns
---

# Test Infrastructure Discovery

## Overview

**Before writing ANY test code, discover what infrastructure already exists.**

Agents naturally jump to solutions without checking available tools, causing:
- Recreating test infrastructure that already exists
- Inconsistent patterns across test suites
- Missing established test utilities and fixtures
- Wasted time building from scratch

**Core principle:** Discovery before implementation. Always.

## When to Use

**ALWAYS use this when:**
- Writing any new tests (unit, integration, E2E)
- Fixing failing tests
- Refactoring test suites
- Setting up test mocking or fixtures

**Signs you skipped discovery:**
- Proposing "create MSW setup" without checking if it exists
- Writing custom test utilities when helpers already exist
- Using different patterns than existing test files
- Installing dependencies that are already in package.json

## Discovery Protocol (Mandatory)

**Run these checks BEFORE writing any test code:**

### 1. Check Installed Test Dependencies

```bash
# Check what's installed
grep -E "(vitest|jest|playwright|msw|@testing-library)" package.json

# Common findings:
# - msw: Mock Service Worker for API mocking
# - @testing-library/react: React component testing
# - @testing-library/user-event: User interaction simulation
# - vitest: Test runner and framework
# - playwright: E2E testing framework
```

**What this tells you:**
- What test frameworks are configured
- What mocking libraries are available
- What testing utilities you can use

### 2. Find Existing Test Setup Files

```bash
# Search for test configuration and setup
find . -name "*.test.ts" -o -name "*.test.tsx" -o -name "setup*.ts" -o -name "vitest.config.ts" | grep -v node_modules | head -20

# Common locations:
# - src/test/mocks/server.ts: MSW server configuration
# - src/test/mocks/handlers.ts: MSW API handlers
# - src/setupTests.ts: Global test setup
# - src/test-utils.tsx: Custom test utilities
# - src/fixtures/: Test fixtures and data
# - vitest.config.ts: Vitest configuration
```

**What this tells you:**
- Where test infrastructure lives
- What patterns are established
- What utilities are available
- How tests are configured

### 3. Review Existing Test Patterns

```bash
# Find similar test files to understand patterns
find . -path "*/__tests__/*" -name "*.test.ts*" | head -10

# Read a few to understand:
# - How components are rendered (custom render functions?)
# - How API calls are mocked (MSW handlers? vi.mock?)
# - How fixtures are used
# - What assertions are common
```

**What this tells you:**
- Established test patterns in the codebase
- Custom render functions (e.g., renderWithProviders)
- Fixture usage patterns
- Assertion styles

### 4. Check for Relevant Testing Skills

**For React/frontend tests:**
- react-testing skill: Comprehensive MSW and React Testing Library patterns
- react-performance-optimization skill: Performance testing patterns
- testing-anti-patterns skill: What to avoid

**For backend tests:**
- test-driven-development skill: TDD workflow
- testing-anti-patterns skill: What to avoid

**For all tests:**
- systematic-debugging skill: When tests fail unexpectedly
- verification-before-completion skill: Before claiming tests pass

### 5. Document Findings

Create a quick inventory:

```markdown
## Test Infrastructure Inventory

**Installed:**
- ✅ MSW 2.12.1
- ✅ Vitest 2.1.8
- ✅ React Testing Library 16.1.0

**Existing Setup:**
- ✅ src/test/mocks/server.ts (MSW configured)
- ✅ src/test-utils.tsx (custom render functions)
- ✅ src/fixtures/ (user and data fixtures)

**Patterns Observed:**
- Tests import from '@/test/mocks/server'
- Custom renderWithProviders() wraps React Testing Library
- Fixtures use user_tests.TEST_USER_1 pattern

**Relevant Skills:**
- react-testing (has MSW patterns)
- testing-anti-patterns
```

## Quick Reference

| Situation | Check First | Then Do |
|-----------|-------------|---------|
| React component test failing | package.json for MSW → src/test/mocks/ → react-testing skill | Use existing MSW handlers or add new ones |
| Need to mock API | src/test/mocks/handlers.ts | Add handler to existing file, don't create new setup |
| Writing integration test | Find similar **/\__tests__/*.integration.test.ts | Follow established patterns |
| E2E test setup | src/fixtures/ → existing E2E tests | Use existing fixtures, match patterns |
| Backend unit test | pkg/testutils/ → existing *_test.go files | Use testutils helpers, match patterns |

## Common Mistakes

### ❌ Jumping to Solutions

```markdown
Agent: "Let's create MSW setup and configure handlers..."
```

**Why wrong:** Didn't check if MSW already exists

**Fix:** Run discovery protocol first, find src/test/mocks/server.ts already exists

### ❌ Proposing Installation

```markdown
Agent: "First, install MSW: npm install -D msw@latest"
```

**Why wrong:** Didn't check package.json

**Fix:** grep package.json first, find MSW already installed

### ❌ Creating Custom Utilities

```markdown
Agent: "Let me create a custom render function with QueryClientProvider..."
```

**Why wrong:** Didn't check for existing test utilities

**Fix:** Find src/test-utils.tsx already has renderWithQueryClient()

### ❌ Inconsistent Patterns

```markdown
Agent: "I'll use vi.mock() for this API call..."
```

**Why wrong:** Didn't review existing tests using MSW

**Fix:** Existing tests use MSW handlers, maintain consistency

## Stop Signals

**You're skipping discovery if you:**
- Propose "creating" or "setting up" test infrastructure
- Suggest "installing" test dependencies
- Write test utilities without checking for existing ones
- Use different patterns than existing test files
- Don't mention checking package.json or existing setup

**When you catch yourself doing these, STOP and run discovery protocol.**

## Rationalizations to Avoid

| Excuse | Reality |
|--------|---------|
| "I know best practices, I'll implement them" | Best practices vary by project. Discover what's established. |
| "This is standard setup, I'll create it" | "Standard" doesn't mean "not already there." Check first. |
| "Time pressure means jump straight to fixing" | 2 minutes of discovery saves 30 minutes of wrong implementation. |
| "The solution is obvious" | The solution depends on available tools. Discover first. |
| "I'll propose comprehensive solutions" | Comprehensive ≠ correct. Discover what exists, then propose. |

## Integration with Other Skills

**BEFORE writing tests, use this skill to discover infrastructure.**

**THEN use:**
- **react-testing** - If React tests and MSW is available
- **test-driven-development** - For TDD workflow
- **testing-anti-patterns** - To avoid common mistakes
- **systematic-debugging** - When tests fail unexpectedly

**Discovery is the prerequisite for all test implementation.**

## Real-World Impact

**Without discovery:**
- Proposed creating MSW setup that already existed (src/test/mocks/server.ts)
- Suggested installing MSW already in package.json
- Created test utilities that duplicated existing src/test-utils.tsx
- Used different patterns than established codebase conventions

**With discovery:**
- Found MSW configured and ready to use
- Discovered react-testing skill has comprehensive MSW patterns
- Identified existing test fixtures in src/fixtures/
- Wrote tests consistent with existing patterns
- Saved 30+ minutes by using existing infrastructure

**Discovery-first mindset prevents reinventing the wheel and ensures consistency.**
