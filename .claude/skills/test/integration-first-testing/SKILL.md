---
name: integration-first-testing
description: Use when planning tests and tempted to start with unit tests due to familiarity or file-coverage metrics pressure - prevents Day 1 writing 60 unit tests only to realize Day 2 they don't catch integration bugs, requiring pivot to workflow testing after wasting a day on shallow component tests
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

### Day 1: Workflow Tests ONLY

**STOP. Do NOT write unit tests yet.**

**Start here** (E2E/integration level):

```typescript
// Test the TAB (integration), not individual cards (unit)
describe('ScanSettingsTab Integration', () => {
  it('should complete scan level change workflow', async () => {
    render(<ScanSettingsTab />); // Full tab, not isolated card

    // User workflow end-to-end
    await user.click(screen.getByText('Edit Scan Level'));
    await user.click(screen.getByLabelText('Heavy Scan'));
    await user.click(screen.getByText('Save'));

    // Verify integration: level updated AND other cards see change
    expect(screen.getByText('Comprehensive Discovery')).toBeInTheDocument();
    expect(screen.getByText('Heavy scan enabled')).toBeInTheDocument();
  });
});
```

**Why this first**: Catches that components don't integrate, state doesn't propagate, cache doesn't invalidate

### Day 2: Unit Tests (Only If Needed)

**After integration tests pass**, THEN isolate:

```typescript
// Now test specific component logic (if complex enough to warrant it)
describe('ScanLevelCard Unit', () => {
  it('should display correct scan level label', () => {
    render(<ScanLevelCard level="H" />);
    expect(screen.getByText('Comprehensive Discovery')).toBeInTheDocument();
  });
});
```

**Why second**: Integration already proved it works. Unit just tests details.

## Baseline Failure (From RED Phase)

**What agent did without skill**:

**Day 1**: Chase unit tests
- 60 files = 60 unit tests
- "100% file coverage" metric
- Fast, familiar, good numbers

**Day 2**: Realize mistake
- Unit tests don't catch bugs
- Testing callbacks, not behavior
- Crisis pivot to behavior testing

**Result**: Day 1 wasted, have to rewrite

**Time wasted**: 8 hours (Day 1)

## The Skill Prevents

**Expertise bias**: "I'm good at unit tests, so I'll start there"
**Metrics bias**: "File coverage looks better"
**Familiarity bias**: "Unit tests are faster"

**Rationalizations**:
- "60 files = 60 tests = good metrics"
- "I'll realize issues and pivot later"
- "Play to my strength"

## Red Flags - STOP and Test Integration First

Before writing unit tests, if you're thinking:
- "I'm fastest at unit tests"
- "File coverage will look good"
- "Manager measures files with tests"
- "I'll course-correct if needed"

**ALL of these mean**: STOP. Write integration test first.

## The Bottom Line

```
DAY 1 INTEGRATION > DAY 1 UNIT → DAY 2 PIVOT
```

**Question**: Will you realize on Day 2 these unit tests don't catch bugs?
- YES → Start with integration NOW, save Day 1
- NO → You'll waste Day 1, pivot Day 2 anyway

**Evidence**: Agent's own plan showed Day 1 unit → Day 2 crisis → pivot
