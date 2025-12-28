# Integration with Other Skills

**How enforcing-evidence-based-analysis fits into the broader workflow.**

## Complementary Skill: verifying-before-completion

**Together they form complete verification:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPLETE VERIFICATION CHAIN                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INPUTS                    WORK                    OUTPUTS      │
│    │                        │                         │         │
│    ▼                        ▼                         ▼         │
│ ┌──────────────┐     ┌──────────────┐     ┌──────────────────┐ │
│ │ evidence-    │     │              │     │ verifying-       │ │
│ │ based-       │────▶│  Implement   │────▶│ before-          │ │
│ │ planning     │     │              │     │ completion       │ │
│ └──────────────┘     └──────────────┘     └──────────────────┘ │
│                                                                 │
│  "Read source        "Do the work"        "Run tests,          │
│   before planning"                         confirm results"    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### When Each Applies

| Phase | Skill | Verifies | Example |
|-------|-------|----------|---------|
| Research/Planning | enforcing-evidence-based-analysis | Read source files, quote APIs | "useWizard returns nested objects (verified at line 72)" |
| Implementation | (none) | Write code based on verified plan | Implement the plan |
| Completion | verifying-before-completion | Run tests, check output | "Tests pass: 34/34 (verified)" |

### They Don't Overlap

- **enforcing-evidence-based-analysis**: Did you READ the input files?
- **verifying-before-completion**: Did you RUN the output verification?

Both required. Neither substitutes for the other.

## Integration with writing-plans

**Evidence-based planning enhances plan quality:**

```markdown
## Before Writing Plan

1. Use enforcing-evidence-based-analysis to discover APIs
2. Document all APIs with source quotes
3. Create "Verified APIs" section in plan

## During Planning

- Reference verified APIs section
- Show "Actual API" vs "My Usage" for each
- Include assumptions section at end

## Plan Structure

# Implementation Plan: Feature X

## Prerequisites
- [ ] Read all relevant source files
- [ ] Documented verified APIs (see below)

## Verified APIs

### API 1: useWizard
**Source:** useWizard.ts (lines 72-77)
... [quote actual code]

### API 2: WizardStep
**Source:** types.ts (lines 15-22)
... [quote actual code]

## Implementation Tasks

Task 1: Use verified APIs
[Reference the verified APIs section]

## Assumptions

[List anything NOT verified]
```

## Integration with developing-with-tdd

**Evidence-based planning in RED phase:**

```markdown
## TDD Cycle with Evidence

### RED Phase
1. Write test first
2. **Verify test uses actual APIs** (enforcing-evidence-based-analysis)
3. Run test, confirm failure

### GREEN Phase
1. Implement minimal code
2. **Verify code uses actual APIs** (enforcing-evidence-based-analysis)
3. Run test, confirm pass
4. **Verify tests pass** (verifying-before-completion)

### REFACTOR Phase
1. Improve code
2. **Verify refactored code uses actual APIs** (enforcing-evidence-based-analysis)
3. Re-run tests
4. **Verify tests still pass** (verifying-before-completion)
```

## Integration with debugging-systematically

**Evidence-based planning when debugging:**

```markdown
## Debugging Workflow

### Hypothesis Generation
1. "I think the bug is in function X"
2. **READ function X source** (enforcing-evidence-based-analysis)
3. Quote actual implementation
4. Generate hypothesis based on ACTUAL code, not assumptions

### Root Cause Analysis
1. "The code calls API Y"
2. **READ API Y implementation** (enforcing-evidence-based-analysis)
3. Quote actual behavior
4. Verify assumption about API was correct

### Fix Validation
1. Implement fix
2. Run tests (verifying-before-completion)
3. Test reproducer case passes
```

## Integration with researching-skills

**Evidence-based planning IS research:**

When `researching-skills` skill guides content population:
1. Find relevant files
2. **Read them with enforcing-evidence-based-analysis protocol**
3. Quote actual code
4. Document verified APIs
5. Populate skill content with real examples

## When Evidence-Based Planning Applies

| Activity | Applies? | Why |
|----------|---------|-----|
| Creating implementation plan | ✅ Yes | Plans reference code/APIs |
| Writing code | ✅ Yes | Code uses existing APIs |
| Debugging | ✅ Yes | Understanding actual behavior |
| Code review | ✅ Yes | Reviewing actual implementation |
| Architecture analysis | ✅ Yes | Documenting how system works |
| User questions | ❌ No | Not making claims about code |
| Running commands | ❌ No | verifying-before-completion applies instead |

## Workflow Example: Complete Feature

```markdown
## Feature: Add New Wizard Step

### Phase 1: Research (enforcing-evidence-based-analysis)
- Read existing wizard implementation
- Quote WizardStep interface
- Quote useWizard hook API
- Document verified APIs

### Phase 2: Plan (writing-plans + enforcing-evidence-based-analysis)
- Create implementation plan
- Reference verified APIs
- Show "Actual vs Proposed" for changes
- List assumptions

### Phase 3: TDD (developing-with-tdd + enforcing-evidence-based-analysis)
- Write test using verified APIs
- Implement using verified APIs
- Refactor preserving API contracts

### Phase 4: Verify (verifying-before-completion)
- Run tests: confirm pass
- Run linter: confirm clean
- Manual test: confirm works

### Phase 5: Review
- Code review uses verified API knowledge
- Reviewer confirms APIs match implementation
```

## The Bottom Line

**Evidence-based planning is the INPUT verification step.**

It pairs with verifying-before-completion (OUTPUT verification) to create complete confidence:

- Evidence-based inputs (verified)
- + Correct implementation (tested)
- + Verified outputs (confirmed)
- = High confidence in correctness
