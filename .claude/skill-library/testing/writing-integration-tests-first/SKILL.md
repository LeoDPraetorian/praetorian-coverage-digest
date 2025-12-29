---
name: writing-integration-tests-first
description: Use when planning tests - prevents unit-test-first trap by enforcing integration tests before unit tests
allowed-tools: "Read, Bash, Grep, Glob"
---

# Integration-First Testing

## Overview

**Test workflows BEFORE testing components in isolation.**

You'll be tempted to start with unit tests (familiar, fast, good metrics). Day 2 you'll realize they don't catch real bugs.

**Core principle:** Skip Day 1 waste. Start with integration.

## When to Use

Use when:

- Planning tests for multi-component features
- Tempted to test 60 files individually
- Manager wants "files with tests" metrics
- Playing to your unit test expertise
- Optimizing for visible progress

**Red flags you need this**:

- "60 files = 60 unit tests = 100% coverage"
- "Unit tests are faster and I'm good at them"
- "File coverage looks better with unit tests"
- "I'll realize issues later and pivot"

## The Iron Law

```
DAY 1: INTEGRATION TESTS (workflows)
DAY 2: UNIT TESTS (if still needed)

NOT: Day 1 unit → Day 2 realize wrong → pivot
```

**Prevents wasting Day 1 on tests you'll delete Day 2.**

## The Integration-First Protocol

> **CRITICAL: Use TodoWrite to track this protocol.** Mental tracking = you'll write unit tests first anyway.

**Create these todos at start** (4 steps):

```
1. Review integration-first protocol and identify main workflow
2. Write integration tests for complete workflow (Day 1 - NO unit tests)
3. Verify integration tests pass and catch real bugs
4. Assess complex components needing unit tests (Day 2 - if needed)
```

**Why mandatory:** Without TodoWrite, you'll rationalize starting with unit tests ("just this one file") and waste Day 1.

---

### Day 1: Workflow Tests ONLY

**STOP. Do NOT write unit tests yet.**

Test complete workflows at integration/E2E level:

- Render full components (not isolated units)
- Execute user workflows end-to-end
- Verify state propagation and cache invalidation

**See:** [Day 1 Integration Test Pattern](examples/day1-integration-test.tsx)

**Why this first**: Catches that components don't integrate, state doesn't propagate, cache doesn't invalidate

### Day 2: Unit Tests (Only If Needed)

**After integration tests pass**, THEN isolate complex component logic.

**See:** [Day 2 Unit Test Pattern](examples/day2-unit-test.tsx)

**Why second**: Integration already proved it works. Unit just tests details.

---

## Understanding the Trap

**Before using this skill:** Agents waste Day 1 writing unit tests, then pivot on Day 2 when they realize integration bugs aren't caught.

**See full TDD baseline:** [Baseline Failure Story](references/baseline-failure.md)

**Common rationalizations:** [Bias Patterns to Watch For](references/rationalizations.md)

**Warning signs:** [Red Flags Checklist](references/red-flags.md)

## The Bottom Line

```
DAY 1 INTEGRATION > DAY 1 UNIT → DAY 2 PIVOT
```

**Question**: Will you realize on Day 2 these unit tests don't catch bugs?

- YES → Start with integration NOW, save Day 1
- NO → You'll waste Day 1, pivot Day 2 anyway

**Evidence**: Agent's own plan showed Day 1 unit → Day 2 crisis → pivot
