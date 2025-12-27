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
2. Read task-specific skills using paths from the gateways
3. Begin implementation

## Mandatory for All Testing Work

**Regardless of task type, you MUST Read these skills before implementing any tests.**

| Skill                         | Path                                                                        | Why Mandatory                                                                         |
| ----------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Testing Anti-Patterns         | `.claude/skill-library/testing/testing-anti-patterns/SKILL.md`              | Avoid mock behavior testing, incomplete mocks, API contract guessing (Anti-Pattern 6) |
| Behavior vs Implementation    | `.claude/skill-library/testing/behavior-vs-implementation-testing/SKILL.md` | Test behaviors, not internals - prevents brittle tests that break on refactors        |
| Condition-Based Waiting       | `.claude/skill-library/testing/condition-based-waiting/SKILL.md`            | Proper async handling - prevents flaky tests in CI                                    |
| Test Infrastructure Discovery | `.claude/skill-library/testing/test-infrastructure-discovery/SKILL.md`      | Discover existing fixtures and patterns - prevents recreating existing tools          |

**Workflow:**

1. Read ALL mandatory skills above (in any order)
2. Then load task-specific skills from the routing tables below
3. Begin implementation following discovered patterns

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

## Git Hooks & CI Integration

**Vitest Pre-Push Testing**: `.claude/skill-library/testing/vitest-prepush-testing/SKILL.md`

- Integrating Vitest with git pre-push hooks to test commits being pushed
- Fixes the common pitfall where `vitest --changed` without a git reference finds zero files after commit
- Documents stdin parsing, base ref detection, and proper `--changed` flag usage

## Quick Reference

| Need                    | Read This Skill                                                                   |
| ----------------------- | --------------------------------------------------------------------------------- |
| REST API tests          | `.claude/skill-library/testing/api-testing-patterns/SKILL.md`                     |
| CLI tool tests          | `.claude/skill-library/testing/cli-testing-patterns/SKILL.md`                     |
| Domain assertions       | `.claude/skill-library/testing/backend/acceptance-test-assertors/SKILL.md`        |
| Test organization       | `.claude/skill-library/testing/backend/acceptance-test-suite/SKILL.md`            |
| Behavior-focused tests  | `.claude/skill-library/testing/behavior-vs-implementation-testing/SKILL.md`       |
| Async/wait patterns     | `.claude/skill-library/testing/condition-based-waiting/SKILL.md`                  |
| Mocking strategies      | `.claude/skill-library/testing/testing-anti-patterns/SKILL.md`                    |
| Performance tests       | `.claude/skill-library/testing/performance-testing/SKILL.md`                      |
| Code complexity metrics | `.claude/skill-library/development/analyzing-cyclomatic-complexity/SKILL.md`      |
| Pre-push hook testing   | `.claude/skill-library/testing/frontend/vitest-prepush-testing/SKILL.md`          |
| Test integrity review   | `.claude/skill-library/testing/frontend/verifying-vitest-test-integrity/SKILL.md` |

## When to Use This Gateway

Use this gateway skill when:

- Starting testing work (unit, integration, E2E, performance)
- Unsure which testing skill to use
- Need overview of available testing resources
- Want to discover relevant patterns for your test task

For specific implementations, always load the individual skill rather than working from this gateway alone.

## Common Testing Workflows

### Scenario: Writing API Tests for a New Endpoint

1. Read `test-infrastructure-discovery` to find existing test utilities
2. Read `api-testing-patterns` for request/response patterns
3. Read `testing-anti-patterns` to avoid common mistakes
4. Implement tests following discovered patterns

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

## Quick Decision Guide

**What are you testing?**

```
Frontend (React/TypeScript)?
├── FIRST: Also invoke gateway-frontend (has React-specific testing skills)
├── Component tests → frontend-testing-patterns (via gateway-frontend)
├── E2E/Playwright → frontend-e2e-testing-patterns (via gateway-frontend)
├── API integration → using-tanstack-query (via gateway-frontend)
├── Security testing → testing-security-with-e2e-tests (via gateway-frontend)
└── Form testing → frontend-interactive-form-testing (via gateway-frontend)

Backend (Go/Python)?
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
