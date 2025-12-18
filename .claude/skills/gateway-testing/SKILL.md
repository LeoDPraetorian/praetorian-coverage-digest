---
name: gateway-testing
description: Use when writing tests - access API, E2E, Mocking, and Performance testing patterns.
allowed-tools: Read
---

# Testing Gateway

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

**Acceptance Test Assertors**: `.claude/skill-library/testing/acceptance-test-assertors/SKILL.md`
- Custom assertions for domain-specific validation

**Acceptance Test Operations**: `.claude/skill-library/testing/acceptance-test-operations/SKILL.md`
- Test operations and workflow patterns

**Acceptance Test Suite**: `.claude/skill-library/testing/acceptance-test-suite/SKILL.md`
- Complete acceptance test suite structure and organization

## Testing Principles

**Behavior vs Implementation Testing**: `.claude/skill-library/testing/behavior-vs-implementation-testing/SKILL.md`
- Testing behaviors over implementation details, avoiding brittle tests

**Compatibility Testing**: `.claude/skill-library/testing/compatibility-testing/SKILL.md`
- Cross-browser, cross-platform, and version compatibility testing

**Condition-Based Waiting**: `.claude/skill-library/testing/condition-based-waiting/SKILL.md`
- Proper wait strategies, polling patterns, and async handling

## Code Quality Metrics

**Analyzing Cyclomatic Complexity**: `.claude/skill-library/quality/analyzing-cyclomatic-complexity/SKILL.md`
- Measures decision logic complexity, identifies refactoring candidates, sets quality gates for CI/CD

## Mocking & Doubles

**Mock Chariot Task**: `.claude/skill-library/testing/mock-chariot-task/SKILL.md`
- Mocking Chariot-specific tasks and operations

**Testing Anti-Patterns**: `.claude/skill-library/testing/testing-anti-patterns/SKILL.md`
- Testing anti-patterns including mock behavior testing, test-only methods, incomplete mocks, and API contract validation (see Anti-Pattern 6)

## Performance & Load Testing

**Performance Testing**: `.claude/skill-library/testing/performance-testing/SKILL.md`
- Load testing, stress testing, and performance benchmarking

## Quick Reference

| Need | Read This Skill |
|------|----------------|
| REST API tests | api-testing-patterns |
| CLI tool tests | cli-testing-patterns |
| Domain assertions | acceptance-test-assertors |
| Test organization | acceptance-test-suite |
| Behavior-focused tests | behavior-vs-implementation-testing |
| Async/wait patterns | condition-based-waiting |
| Mocking strategies | testing-anti-patterns |
| Performance tests | performance-testing |
| Code complexity metrics | analyzing-cyclomatic-complexity |

## When to Use This Gateway

Use this gateway skill when:
- Starting testing work (unit, integration, E2E, performance)
- Unsure which testing skill to use
- Need overview of available testing resources
- Want to discover relevant patterns for your test task

For specific implementations, always load the individual skill rather than working from this gateway alone.

## Frontend Testing

**Note**: Frontend-specific testing skills (React, Playwright, form testing) are in `gateway-frontend`:
- Frontend E2E Testing Patterns
- Frontend Testing Patterns
- Frontend Interactive Form Testing

Use both gateways if you're a frontend test engineer.

## Testing



**Test Infrastructure Discovery**: `.claude/skill-library/testing/test-infrastructure-discovery/SKILL.md`
- Use when writing any tests (unit, integration, E2E) before implementing test code - systematically discovers available test infrastructure (MSW, fixtures, test utilities, established patterns) to avoid recreating existing tools and ensure consistency with project patterns

**Test Metrics Reality Check**: `.claude/skill-library/testing/test-metrics-reality-check/SKILL.md`
- Use when reporting test completion or before standup, especially when tempted to report impressive test counts under time pressure - requires verifying test files have corresponding production files and calculating coverage from production files tested (not test files created), preventing reports like "266 tests, 6 files" that hide the fact 3 files don't exist

**Verifying Test File Existence**: `.claude/skill-library/testing/verifying-test-file-existence/SKILL.md`
- Use when asked to fix, create, or work with test files, before starting any test work - prevents creating tests for non-existent files and wasting hours on fake progress by verifying both test files and corresponding production files exist.
