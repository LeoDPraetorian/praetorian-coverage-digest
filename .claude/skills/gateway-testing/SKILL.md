---
name: gateway-testing
description: Use when writing tests - routes to testing skills based on intent/keywords. Provides routing, not methodology.
allowed-tools: Read
---

<EXTREMELY-IMPORTANT>
# STOP. READ THIS FIRST. DO NOT SKIP.

## The 1% Rule (NON-NEGOTIABLE)

If there is even a **1% chance** a skill might apply to your task:

- You MUST invoke that skill
- This is not optional
- This is not negotiable
- You cannot rationalize your way out of this

Uncertainty = Invocation. Period.

## Skill Announcement (MANDATORY)

Before using any skill, you MUST announce it in your response:

"I am invoking `{skill-name}` because {reason}."

This announcement must appear BEFORE you begin work.
No announcement = no invocation = PROTOCOL VIOLATION = FAILURE!
</EXTREMELY-IMPORTANT>

# Testing Gateway

Routes testing tasks to appropriate library skills. Does NOT contain methodology—skills do.

## Progressive Disclosure

This gateway implements 3-tier loading:

- **Level 1 (now):** Routing tables (~200 tokens)
- **Level 2 (on-demand):** Skill SKILL.md loaded when routed
- **Level 3 (as-needed):** Skill resources loaded during execution

## Intent Detection

**Match your task to a routing pattern:**

| Task Intent                                           | Route To                                                             |
| ----------------------------------------------------- | -------------------------------------------------------------------- |
| "write tests for..."                                  | → Mandatory skills + domain-specific                                 |
| "implement tests from plan" / "backend test"          | → `gateway-backend` (has `implementing-golang-tests`)                |
| "fix bug" / "bug fix" / "why is X broken"             | → `orchestrating-bugfix`                                             |
| "fix flaky test"                                      | → `condition-based-waiting` + `testing-anti-patterns`                |
| "test plan" / "coverage gaps"                         | → `verifying-test-metrics-reality` + `test-infrastructure-discovery` |
| "debug test failure"                                  | → `debugging-systematically` (via gateway) + `testing-anti-patterns` |
| "find bug location" / "bug discovery"                 | → `discovering-bugs-for-fixing`                                      |
| "mock" / "stub" / "spy"                               | → `testing-with-vitest-mocks` + `creating-mocks`                     |
| "async" / "waitFor" / "timeout"                       | → `condition-based-waiting`                                          |
| "E2E" / "Playwright"                                  | → `gateway-frontend` (has E2E skills)                                |
| "API test" / "REST"                                   | → `api-testing-patterns`                                             |
| "acceptance test"                                     | → `acceptance-test-suite`                                            |
| "performance" / "load test"                           | → `performance-testing`                                              |
| "test hanging" / "process spawning" / "vitest config" | → `configuring-vitest-test-isolation`                                |
| "MCP wrapper test" / "tool wrapper"                   | → `configuring-vitest-test-isolation` + `gateway-typescript`         |
| "Go integration test" / "httptest" / "mock.Collector" | → `testing-integrations`                                             |

## Skill Registry

### Mandatory (Load First)

| Skill                      | Path                                                                        | Triggers               |
| -------------------------- | --------------------------------------------------------------------------- | ---------------------- |
| Testing Anti-Patterns      | `.claude/skill-library/testing/testing-anti-patterns/SKILL.md`              | any test task          |
| Behavior vs Implementation | `.claude/skill-library/testing/behavior-vs-implementation-testing/SKILL.md` | any test task          |
| Condition-Based Waiting    | `.claude/skill-library/testing/condition-based-waiting/SKILL.md`            | async, flaky, timeout  |
| Avoiding Low-Value Tests   | `.claude/skill-library/testing/avoiding-low-value-tests/SKILL.md`           | coverage, test quality |

### Planning & Analysis

| Skill                         | Path                                                                       | Triggers                                                       |
| ----------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Test Metrics Reality          | `.claude/skill-library/testing/verifying-test-metrics-reality/SKILL.md`    | coverage analysis, metrics                                     |
| Test File Existence           | `.claude/skill-library/testing/verifying-test-file-existence/SKILL.md`     | before writing tests                                           |
| Test Infrastructure Discovery | `.claude/skill-library/testing/test-infrastructure-discovery/SKILL.md`     | what exists, fixtures                                          |
| Vitest Test Isolation         | `.claude/skill-library/testing/configuring-vitest-test-isolation/SKILL.md` | vitest config, test isolation, process spawning, hanging tests |
| Discovering Bugs for Fixing   | `.claude/skill-library/testing/discovering-bugs-for-fixing/SKILL.md`   | bug discovery, find bug location, scope bug investigation      |

### Bug Fixing

| Skill                 | Path                                                              | Triggers                                        |
| --------------------- | ----------------------------------------------------------------- | ----------------------------------------------- |
| Orchestrating Bug Fix | `.claude/skill-library/testing/orchestrating-bugfix/SKILL.md` | fix bug, bug fix, why is X broken, reported bug |

### By Test Type

| Skill                 | Path                                                                   | Triggers                                          |
| --------------------- | ---------------------------------------------------------------------- | ------------------------------------------------- |
| API Testing Patterns  | `.claude/skill-library/testing/api-testing-patterns/SKILL.md`          | REST, API, endpoint                               |
| CLI Testing Patterns  | `.claude/skill-library/testing/cli-testing-patterns/SKILL.md`          | CLI, command-line                                 |
| Performance Testing   | `.claude/skill-library/testing/performance-testing/SKILL.md`           | load, stress, benchmark                           |
| Acceptance Test Suite | `.claude/skill-library/testing/backend/acceptance-test-suite/SKILL.md` | acceptance, e2e backend                           |
| Testing Integrations  | `.claude/skill-library/testing/testing-integrations/SKILL.md`          | Go integration test, httptest, mock.Collector, P0 |

### Mocking

| Skill             | Path                                                                  | Triggers                  |
| ----------------- | --------------------------------------------------------------------- | ------------------------- |
| Vitest Mocks      | `.claude/skill-library/testing/testing-with-vitest-mocks/SKILL.md`    | vi.mock, vi.spyOn, vitest |
| Creating Mocks    | `.claude/skill-library/testing/frontend/creating-mocks/SKILL.md`      | MSW, factory, mock data   |
| Mock Chariot Task | `.claude/skill-library/testing/backend/mocking-chariot-task/SKILL.md` | Chariot task mock         |

### Quality & Verification

| Skill            | Path                                                                              | Triggers                |
| ---------------- | --------------------------------------------------------------------------------- | ----------------------- |
| Test Integrity   | `.claude/skill-library/testing/frontend/verifying-vitest-test-integrity/SKILL.md` | PR review, test quality |
| TypeScript Types | `.claude/skill-library/testing/testing-typescript-types/SKILL.md`                 | type testing, tsd       |

## Routing Algorithm

```
1. Load mandatory skills (any test task)
2. Parse task for trigger keywords from Intent Detection table
3. Match triggers → route to skill(s) from Skill Registry
4. Check Cross-Gateway Routing for domain-specific gateways
5. Load skill via Read(path)
6. Follow skill instructions
```

## Cross-Gateway Routing

| If Task Involves              | Also Invoke                                |
| ----------------------------- | ------------------------------------------ |
| React, components, Playwright | `gateway-frontend`                         |
| Go, Lambda, DynamoDB          | `gateway-backend`                          |
| TypeScript, Zod, types        | `gateway-typescript`                       |
| MCP wrappers, tool testing    | `gateway-mcp-tools` + `gateway-typescript` |
| Security testing              | `gateway-security`                         |

## Loading Skills

```
Read(".claude/skill-library/testing/[skill-name]/SKILL.md")
```

Do NOT use `skill: "skill-name"` for library skills—they require Read tool.
