# Baseline Failure - TDD RED Phase

**What happened when agent didn't have this skill.**

## The Mistake

### Day 1: Chase Unit Tests

Agent optimized for familiarity and metrics:

- ✅ 60 files = 60 unit tests written
- ✅ "100% file coverage" metric achieved
- ✅ Fast, familiar, good-looking numbers
- ✅ Playing to strength (good at unit tests)

**Rationale:** "I'm fastest at unit tests, file coverage looks good, manager measures this"

### Day 2: Reality Check

Integration bugs surface during manual testing:

- ❌ Unit tests don't catch real bugs
- ❌ Testing callbacks, not actual behavior
- ❌ State doesn't propagate between components
- ❌ Cache invalidation issues missed
- ❌ Component integration failures

**Crisis:** Must pivot to workflow testing, rewrite everything

### The Cost

- **Time wasted:** 8 hours (Day 1)
- **Work discarded:** 60 unit tests deleted/rewritten
- **Opportunity cost:** Could have had working integration tests by end of Day 1

## The Pattern

This isn't a one-time mistake. Without the skill, agents consistently:

1. Default to unit tests (familiar, fast, good metrics)
2. Realize too late they don't catch integration bugs
3. Pivot to workflow tests on Day 2
4. Waste Day 1's effort

**The skill prevents this by enforcing integration-first from Day 1.**
