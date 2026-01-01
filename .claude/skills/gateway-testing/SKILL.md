---
name: gateway-testing
description: Use when writing tests - access API, E2E, Mocking, Performance, unit tests, integration tests, acceptance tests, test infrastructure, fixtures, flaky tests, and code quality metrics patterns.
allowed-tools: Read
---

# Testing Gateway

## Understanding This Gateway

This is a **gateway skill** that routes you from the core skill layer to specialized library skills. Chariot uses a two-tier skill architecture:

1. **Core Skills** (~25): Discoverable via Skill tool, live in `.claude/skills/`
2. **Library Skills** (~120): On-demand loading via Read tool, live in `.claude/skill-library/`

**Why the split?** Loading all 120+ skills at startup would consume excessive tokens. Gateways provide discoverability without the overhead—you invoke the gateway, then Read the specific library skill you need.

### Invoking This Gateway

```
skill: "gateway-testing"
```

### Loading Library Skills

After identifying the skill you need, use the Read tool with the **exact path** shown:

```
Read(".claude/skill-library/testing/api-testing-patterns/SKILL.md")
```

<EXTREMELY_IMPORTANT>

You MUST use TodoWrite before starting any multi-step testing workflow to track all steps.

Library skills CANNOT be invoked with the Skill tool. You MUST use the Read tool with the full path shown in the routing table.

### Common Anti-Patterns

```typescript
// ❌ WRONG: Trying to use Skill tool for library skills
skill: "api-testing-patterns"; // FAILS - library skills are NOT in Skill tool

// ❌ WRONG: Only invoking gateway-testing for frontend tests
skill: "gateway-testing"; // INCOMPLETE - frontend tests ALSO need gateway-frontend

// ❌ WRONG: Skipping mandatory skills
// Jump straight to writing tests without reading testing-anti-patterns first

// ❌ WRONG: Mentioning a skill without actually reading it
("I know the testing-anti-patterns skill..."); // FAILS - you must actually Read() it
```

### Correct Patterns

```typescript
// ✅ CORRECT: Read library skills with full path
Read(".claude/skill-library/testing/api-testing-patterns/SKILL.md");

// ✅ CORRECT: For frontend tests, invoke BOTH gateways
skill: "gateway-testing"; // General testing patterns
skill: "gateway-frontend"; // React-specific testing patterns

// ✅ CORRECT: Read mandatory skills FIRST
Read(".claude/skill-library/testing/testing-anti-patterns/SKILL.md");
Read(".claude/skill-library/testing/behavior-vs-implementation-testing/SKILL.md");
// THEN write tests
```

</EXTREMELY_IMPORTANT>

## Mandatory Skills by Role

**Load mandatory skills based on your role before starting work.**

### Role Filter

| Your Role           | Mandatory Sections                                                    |
| ------------------- | --------------------------------------------------------------------- |
| **Test Lead**       | ALL ROLES + PLANNING SKILLS                                           |
| **Frontend Tester** | ALL ROLES + also invoke `gateway-frontend` for React-specific testing |
| **Backend Tester**  | ALL ROLES + also invoke `gateway-backend` for Go-specific testing     |

**Note:** All skills remain available to any role via the routing tables below. The table shows what you MUST load upfront—not what you're limited to.

---

### ALL ROLES (Everyone Must Read)

**1. Testing Anti-Patterns (BLOCKING)**

`.claude/skill-library/testing/testing-anti-patterns/SKILL.md`

BLOCKS PRs for anti-patterns: mock behavior testing, incomplete mocks, test-only methods, over-mocking. **Essential for understanding what patterns are invalid.**

**2. Behavior vs Implementation Testing**

`.claude/skill-library/testing/behavior-vs-implementation-testing/SKILL.md`

Test behaviors (what users see), not implementation details. Prevents brittle tests that break on refactors. **Required to understand HOW to test correctly.**

**3. Condition-Based Waiting**

`.claude/skill-library/testing/condition-based-waiting/SKILL.md`

Proper async handling - waitFor() with conditions, NOT setTimeout(). Prevents flaky tests in CI. **Required to avoid timing-based failures.**

**4. Test Infrastructure Discovery**

`.claude/skill-library/testing/test-infrastructure-discovery/SKILL.md`

Discover existing fixtures, utilities, and patterns before writing tests. Prevents recreating existing tools. **Required before implementing any tests.**

---

### PLANNING SKILLS (Mandatory: Test Lead)

**5. Test Metrics Reality Check**

`.claude/skill-library/testing/verifying-test-metrics-reality/SKILL.md`

Verify coverage numbers reflect reality - production files exist, assertions are meaningful. **Required for test-lead when analyzing coverage gaps as input to planning.**

**6. Verifying Test File Existence**

`.claude/skill-library/testing/verifying-test-file-existence/SKILL.md`

Verify both test files AND corresponding production files exist before planning. **Required for test-lead to avoid planning tests for non-existent code.**

---

### Workflow by Role

#### Test Lead Workflow

1. Invoke `gateway-testing`
2. Read ALL ROLES skills (4 skills)
3. Read PLANNING SKILLS (2 skills)
4. Analyze coverage gaps (coverage is INPUT to planning)
5. Create test plan using `writing-plans` skill
6. Hand off to testers with plan location

#### Frontend Tester Workflow

1. Invoke `gateway-testing` (general patterns)
2. Invoke `gateway-frontend` (React-specific patterns)
3. Read ALL ROLES skills from BOTH gateways
4. **Locate the test plan**: `ls docs/plans/*-test-plan.md`
5. Implement tests according to plan
6. Return to test-lead for validation

#### Backend Tester Workflow

1. Invoke `gateway-testing` (general patterns)
2. Invoke `gateway-backend` (Go-specific patterns)
3. Read ALL ROLES skills from BOTH gateways
4. **Locate the test plan**: `ls docs/plans/*-test-plan.md`
5. Implement tests according to plan
6. Return to test-lead for validation

---

## Frontend Test Engineers (READ THIS FIRST)

**CRITICAL: If testing React/TypeScript code, you MUST ALSO invoke `gateway-frontend`.**

This gateway provides general testing patterns. gateway-frontend provides React-specific patterns:

| Skill                             | Located In       | Why You Need It                              |
| --------------------------------- | ---------------- | -------------------------------------------- |
| Frontend E2E Testing (Playwright) | gateway-frontend | Playwright patterns, page objects, selectors |
| Frontend Testing Patterns (RTL)   | gateway-frontend | React Testing Library, component testing     |
| Testing Security with E2E         | gateway-frontend | XSS, CSRF, auth testing patterns             |
| Using TanStack Query              | gateway-frontend | Query/mutation testing, MSW integration      |
| Creating Mocks                    | This gateway     | MSW handlers, factory patterns               |
| Behavior vs Implementation        | This gateway     | Test behaviors, not internals                |

**Required invocations for frontend testing:**

```
skill: "gateway-testing"    # General patterns (this gateway)
skill: "gateway-frontend"   # React-specific patterns
```

**After invoking both gateways:**

1. Read mandatory skills from BOTH gateways
2. Locate the test plan from test-lead
3. Implement tests according to plan
4. Return to test-lead for validation

## How to Use

This skill serves as a master directory for all testing skills in the Chariot platform. When you need testing guidance:

1. **Identify the skill you need** from the categorized list below
2. **Use the Read tool** with the provided path to load the skill
3. **Do not guess paths** - always use the exact paths shown

Each skill is organized by domain for easy discovery.

## API & Backend Testing

**API Testing Patterns**: `.claude/skill-library/testing/api-testing-patterns/SKILL.md`

- REST API testing, request/response validation, status code assertions

**CLI Testing Patterns**: `.claude/skill-library/testing/cli-testing-patterns/SKILL.md`

- Command-line interface testing, output validation, exit code handling

## Acceptance Testing

**Acceptance Test Assertors**: `.claude/skill-library/testing/backend/acceptance-test-assertors/SKILL.md`

- Custom assertions for domain-specific validation

**Acceptance Test Operations**: `.claude/skill-library/testing/backend/acceptance-test-operations/SKILL.md`

- Test operations and workflow patterns

**Acceptance Test Suite**: `.claude/skill-library/testing/backend/acceptance-test-suite/SKILL.md`

- Complete acceptance test suite structure and organization

## Testing Principles

**Behavior vs Implementation Testing**: `.claude/skill-library/testing/behavior-vs-implementation-testing/SKILL.md`

- Testing behaviors over implementation details, avoiding brittle tests

**Compatibility Testing**: `.claude/skill-library/testing/frontend/compatibility-testing/SKILL.md`

- Cross-browser, cross-platform, and version compatibility testing

**Condition-Based Waiting**: `.claude/skill-library/testing/condition-based-waiting/SKILL.md`

- Proper wait strategies, polling patterns, and async handling

## Code Quality Metrics

**Analyzing Cyclomatic Complexity**: `.claude/skill-library/development/analyzing-cyclomatic-complexity/SKILL.md`

- Measures decision logic complexity, identifies refactoring candidates, sets quality gates for CI/CD

## AI & LLM Testing

**LLM Evaluation**: `.claude/skill-library/ai/llm-evaluation/SKILL.md`

- LLM output evaluation, prompt testing, model comparison

## Mocking & Doubles

**Creating Mocks**: `.claude/skill-library/testing/frontend/creating-mocks/SKILL.md`

- Mocking strategies, factory patterns, MSW integration

**Mock Chariot Task**: `.claude/skill-library/testing/backend/mocking-chariot-task/SKILL.md`

- Mocking Chariot-specific tasks and operations

**Testing Anti-Patterns**: `.claude/skill-library/testing/testing-anti-patterns/SKILL.md`

- Testing anti-patterns including mock behavior testing, test-only methods, incomplete mocks, and API contract validation (see Anti-Pattern 6)

## Testing Strategy

**Integration First Testing**: `.claude/skill-library/testing/writing-integration-tests-first/SKILL.md`

- Integration-first approach, contract testing, testing pyramids

## Performance & Load Testing

**Performance Testing**: `.claude/skill-library/testing/performance-testing/SKILL.md`

- Load testing, stress testing, and performance benchmarking

## Quick Reference

**⭐ = Mandatory for ALL ROLES | 📋 = Mandatory for TEST LEAD (Planning)**

| Need                       | Read This Skill                                                                   |
| -------------------------- | --------------------------------------------------------------------------------- |
| ⭐ Avoid anti-patterns     | `.claude/skill-library/testing/testing-anti-patterns/SKILL.md`                    |
| ⭐ Behavior-focused tests  | `.claude/skill-library/testing/behavior-vs-implementation-testing/SKILL.md`       |
| ⭐ Async/wait patterns     | `.claude/skill-library/testing/condition-based-waiting/SKILL.md`                  |
| ⭐ Discover infrastructure | `.claude/skill-library/testing/test-infrastructure-discovery/SKILL.md`            |
| 📋 Coverage reality check  | `.claude/skill-library/testing/verifying-test-metrics-reality/SKILL.md`           |
| 📋 File existence check    | `.claude/skill-library/testing/verifying-test-file-existence/SKILL.md`            |
| REST API tests             | `.claude/skill-library/testing/api-testing-patterns/SKILL.md`                     |
| CLI tool tests             | `.claude/skill-library/testing/cli-testing-patterns/SKILL.md`                     |
| Domain assertions          | `.claude/skill-library/testing/backend/acceptance-test-assertors/SKILL.md`        |
| Test organization          | `.claude/skill-library/testing/backend/acceptance-test-suite/SKILL.md`            |
| Performance tests          | `.claude/skill-library/testing/performance-testing/SKILL.md`                      |
| Code complexity metrics    | `.claude/skill-library/development/analyzing-cyclomatic-complexity/SKILL.md`      |
| Pre-push hook testing      | `.claude/skill-library/testing/frontend/vitest-prepush-testing/SKILL.md`          |
| Test integrity review      | `.claude/skill-library/testing/frontend/verifying-vitest-test-integrity/SKILL.md` |

## When to Use This Gateway

Use this gateway skill when:

- Starting testing work (unit, integration, E2E, performance)
- Planning test strategy (test-lead)
- Unsure which testing skill to use
- Need overview of available testing resources
- Want to discover relevant patterns for your test task

For specific implementations, always load the individual skill rather than working from this gateway alone.

## Common Testing Workflows

### Scenario: Test Lead Creating Test Plan

1. Read ALL ROLES mandatory skills (4 skills)
2. Read PLANNING mandatory skills (2 skills)
3. Run coverage analysis to identify gaps
4. Read `test-infrastructure-discovery` to document available utilities
5. Create test plan with `writing-plans` skill
6. Hand off to appropriate tester

### Scenario: Frontend Tester Implementing Tests

1. Also invoke `gateway-frontend` for React patterns
2. Read mandatory skills from BOTH gateways
3. Locate test plan: `ls docs/plans/*-test-plan.md`
4. Read plan and understand requirements
5. Implement tests following plan's approach
6. Return to test-lead for validation

### Scenario: Debugging Flaky Tests

1. Read `condition-based-waiting` for proper async handling
2. Read `behavior-vs-implementation-testing` to check if tests are too implementation-coupled
3. Read `testing-anti-patterns` for common flakiness causes

### Scenario: Setting Up Acceptance Tests

1. Read `test-infrastructure-discovery` first
2. Read `acceptance-test-suite` for organization patterns
3. Read `acceptance-test-operations` for workflow patterns
4. Read `acceptance-test-assertors` for custom assertions

### Scenario: Performance Testing

1. Read `performance-testing` for load/stress patterns
2. Read `analyzing-cyclomatic-complexity` if investigating slow code paths

## Troubleshooting

### "I don't know which skill to use"

Start with `test-infrastructure-discovery` to understand what's available in your codebase. Then return to this gateway's Quick Reference table to find patterns matching your need.

### "My tests are brittle and break on refactors"

Read `behavior-vs-implementation-testing`. You're likely testing implementation details instead of behaviors.

### "Tests pass locally but fail in CI"

Read `condition-based-waiting` for async handling issues. Also check `compatibility-testing` for environment differences.

### "I'm mocking too much"

Read `testing-anti-patterns` which covers incomplete mocks, mock behavior testing, and when mocking goes wrong.

### "Test metrics look good but coverage feels low"

Read `verifying-test-metrics-reality` to verify you're measuring actual coverage, not just test file counts.

### "Where's the test plan?"

Test plans from test-lead are saved to `docs/plans/YYYY-MM-DD-<feature>-test-plan.md`. Run:

```bash
ls docs/plans/*-test-plan.md
```

## Quick Decision Guide

**What are you doing?**

```
Planning tests? (test-lead role)
├── Read ALL ROLES mandatory (4 skills)
├── Read PLANNING mandatory (2 skills)
├── Analyze coverage gaps
├── Use writing-plans to create test plan
└── Hand off to testers

Implementing tests?
├── Locate test plan first: ls docs/plans/*-test-plan.md
├── Read ALL ROLES mandatory (4 skills)
├── Follow plan's testing approach
├── Use infrastructure documented in plan
└── Return to test-lead for validation

Frontend (React/TypeScript)?
├── FIRST: Also invoke gateway-frontend (has React-specific testing skills)
├── Component tests → frontend-testing-patterns (via gateway-frontend)
├── E2E/Playwright → frontend-e2e-testing-patterns (via gateway-frontend)
├── API integration → using-tanstack-query (via gateway-frontend)
├── Security testing → testing-security-with-e2e-tests (via gateway-frontend)
└── Form testing → frontend-interactive-form-testing (via gateway-frontend)

Backend (Go/Python)?
├── Also invoke gateway-backend for Go patterns
├── API tests → api-testing-patterns
├── CLI tests → cli-testing-patterns
├── Acceptance tests → acceptance-test-suite
└── Mock Chariot tasks → mocking-chariot-task

General patterns (any domain)?
├── Behavior testing → behavior-vs-implementation-testing
├── Async handling → condition-based-waiting
├── Avoiding mistakes → testing-anti-patterns
├── Performance → performance-testing
└── Test organization → acceptance-test-suite

Debugging issues?
├── Flaky tests → condition-based-waiting + behavior-vs-implementation-testing
├── Brittle tests → behavior-vs-implementation-testing
├── Mock problems → testing-anti-patterns
└── Metrics reality → verifying-test-metrics-reality
```

## Test Infrastructure & Verification

**Test Infrastructure Discovery**: `.claude/skill-library/testing/test-infrastructure-discovery/SKILL.md`

- Use when writing any tests (unit, integration, E2E) before implementing test code - systematically discovers available test infrastructure (MSW, fixtures, test utilities, established patterns) to avoid recreating existing tools and ensure consistency with project patterns

**Test Metrics Reality Check**: `.claude/skill-library/testing/verifying-test-metrics-reality/SKILL.md`

- Use when reporting test completion or before standup, especially when tempted to report impressive test counts under time pressure - requires verifying test files have corresponding production files and calculating coverage from production files tested (not test files created), preventing reports like "266 tests, 6 files" that hide the fact 3 files don't exist

**Verifying Test File Existence**: `.claude/skill-library/testing/verifying-test-file-existence/SKILL.md`

- Use when asked to fix, create, or work with test files, before starting any test work - prevents creating tests for non-existent files and wasting hours on fake progress by verifying both test files and corresponding production files exist.

**Verifying Vitest Test Integrity**: `.claude/skill-library/testing/frontend/verifying-vitest-test-integrity/SKILL.md`

- Use when reviewing test files added or modified in the current branch, conducting PR reviews of test changes, or verifying new unit tests follow best practices - detects test-production logic duplication anti-pattern where tests contain copies of production logic instead of importing and testing the actual code.

## Related Gateways

| Gateway      | Invoke With                | Use For                                     |
| ------------ | -------------------------- | ------------------------------------------- |
| Frontend     | `skill: "gateway-frontend"`| React-specific testing (Playwright, RTL)    |
| Backend      | `skill: "gateway-backend"` | Go-specific testing, AWS mocking            |
| Security     | `skill: "gateway-security"`| Security testing patterns                   |

## Testing

**Debugging Chrome Console**: `.claude/skill-library/testing/frontend/debugging-chrome-console/SKILL.md`
- Autonomous browser debugging workflow. Use when fixing frontend runtime errors - launches Chrome, analyzes console logs, iteratively fixes issues until console is clean.


**Frontend E2e Testing Patterns**: `.claude/skill-library/testing/frontend/frontend-e2e-testing-patterns/SKILL.md`
- Master end-to-end testing with Playwright and Cypress to build reliable test suites that catch bugs, improve confidence, and enable fast deployment. Use when implementing E2E tests, debugging flaky tests, or establishing testing standards.

**Frontend Interactive Form Testing**: `.claude/skill-library/testing/frontend/frontend-interactive-form-testing/SKILL.md`
- Use when testing React forms with file uploads, button states, and multi-step workflows - provides state transition patterns, prop verification, and interactive workflow testing to catch bugs that simple callback tests miss

**Frontend Testing Patterns**: `.claude/skill-library/testing/frontend/frontend-testing-patterns/SKILL.md`
- Use when writing unit tests, integration tests, or component tests for Chariot React UI - provides comprehensive testing strategies using Vitest, React Testing Library, and Testing Library User Event following Chariot's established patterns for hooks, components, and user interactions

**Frontend Visual Testing Advanced**: `.claude/skill-library/testing/frontend/frontend-visual-testing-advanced/SKILL.md`
- Use when testing visual regressions - pixel-perfect screenshots, AI-powered diffs, responsive and cross-browser validation

**React Query Cache Debugging**: `.claude/skill-library/testing/frontend/react-query-cache-debugging/SKILL.md`
- Use when React Query cache isn't updating after mutations, data doesn't appear after creation, or refresh shows data but component doesn't update - systematic investigation of query keys, invalidation patterns, and cache state before proposing fixes

**Testing Security With E2e Tests**: `.claude/skill-library/testing/frontend/testing-security-with-e2e-tests/SKILL.md`
- Use when writing E2E security tests for React frontends - XSS, auth flows, authorization, CSRF, input validation

**Vitest Prepush Testing**: `.claude/skill-library/testing/frontend/vitest-prepush-testing/SKILL.md`
- Use when configuring pre-push hooks with Vitest to test commits being pushed. Fixes the common pitfall where 'vitest --changed' without a git reference finds zero files after commit, making hooks ineffective. Documents stdin parsing, base ref detection, and proper --changed flag usage.
