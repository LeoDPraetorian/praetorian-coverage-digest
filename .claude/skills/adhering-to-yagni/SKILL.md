---
name: adhering-to-yagni
description: Use when implementing changes - enforces strict scope discipline, prevents feature creep and unsolicited improvements
allowed-tools: AskUserQuestion, Read
---

# Adhering to YAGNI (You Aren't Gonna Need It)

## When to Use This Skill

Use this skill **for every development task** to ensure changes stay strictly within the requested scope.

**Symptoms that trigger this skill:**

- User requests a specific change or fix
- You're about to implement a feature
- You notice opportunities for "helpful" improvements
- You see code that "could be better"

**CRITICAL**: This skill is **mandatory for all development work**. It prevents scope creep by requiring explicit user approval before making any change not directly requested.

## Quick Start

### Core Principle

```
If the user didn't explicitly ask for it → ASK before doing it
```

**The Test**: Can you point to the exact words in the user's request that ask for this change?

- ✅ YES → Proceed
- ❌ NO → Use AskUserQuestion tool before proceeding

### Common Violations (What NOT to Do)

| Violation                     | Example                                                        | What to Do Instead                             |
| ----------------------------- | -------------------------------------------------------------- | ---------------------------------------------- |
| **Adding features**           | User asks to fix a bug → You also add error logging            | Ask: "Should I also add error logging?"        |
| **Refactoring adjacent code** | User asks to update one function → You refactor the whole file | Ask: "Should I refactor the surrounding code?" |
| **Adding validation**         | User asks for form field → You add comprehensive validation    | Ask: "What validation rules do you want?"      |
| **Creating abstractions**     | User asks for one implementation → You create reusable utility | Ask: "Should I make this reusable?"            |
| **Documentation**             | User asks for code → You add extensive comments                | Ask: "Should I add documentation?"             |
| **Testing**                   | User asks for feature → You write comprehensive tests          | Ask: "Should I write tests for this?"          |
| **Error handling**            | User asks for happy path → You add try-catch everywhere        | Ask: "What error handling do you want?"        |
| **Optimization**              | User asks for implementation → You optimize for performance    | Ask: "Should I optimize this?"                 |

## Table of Contents

This skill is organized into detailed reference documents:

### Core Methodology

- **[The YAGNI Decision Tree](references/decision-tree.md)** - Step-by-step workflow for every change
- **[Scope Boundaries](references/scope-boundaries.md)** - What's in scope vs out of scope
- **[Asking Questions Pattern](references/asking-questions.md)** - How to ask effective scope questions

### Common Scenarios

- **[Bug Fix Scenarios](references/bug-fix-scenarios.md)** - Staying focused when fixing bugs
- **[Feature Implementation](references/feature-implementation.md)** - Building exactly what's requested
- **[Code Review Changes](references/code-review.md)** - Handling review feedback in scope

### Anti-Patterns

- **[Rationalization Traps](references/rationalization-traps.md)** - Common justifications to avoid
- **[The "While I'm Here" Fallacy](references/while-im-here.md)** - Why adjacent changes are dangerous

## Core Workflow

For every development task, follow this sequence:

### 1. Parse the Request

**Extract ONLY what was explicitly requested:**

- Read the user's message word-by-word
- List the specific changes requested
- Note what was NOT mentioned

### 2. Identify Scope Boundaries

**Before implementing, classify potential work:**

| Category         | Definition                   | Action                              |
| ---------------- | ---------------------------- | ----------------------------------- |
| **In Scope**     | Explicitly requested by user | ✅ Implement without asking         |
| **Unclear**      | Implied but not explicit     | ⚠️ Ask for clarification            |
| **Out of Scope** | Not mentioned at all         | ❌ Do NOT implement unless approved |

### 3. Question Out-of-Scope Changes

**If you're considering ANY change not explicitly requested:**

```
Use AskUserQuestion tool with this pattern:

"I can implement what you requested. While doing this, I noticed [OPPORTUNITY].
This wasn't explicitly requested. Should I:
1. Stick to just what you asked for
2. Also make [OPPORTUNITY] change
3. Show me what you asked for first, we'll discuss [OPPORTUNITY] later"
```

See [Asking Questions Pattern](references/asking-questions.md) for detailed examples.

### 4. Implement In-Scope Changes Only

**Strict implementation rules:**

- Write ONLY the code needed for requested changes
- Use existing patterns (don't "improve" them)
- Don't add "defensive" code unless requested
- Don't optimize unless requested
- Don't refactor unless requested

### 5. Report What Was Done

**When complete, report EXACTLY what was implemented:**

- List changes made (should match request 1:1)
- Note anything deliberately NOT done (opportunities you skipped)
- Ask if user wants to address skipped opportunities

See [Detailed Workflow](references/workflow.md) for step-by-step implementation guide.

## Critical Rules (Non-Negotiable)

### Rule 1: User Words Are the Contract

**The user's exact words define the scope. Nothing else.**

```
❌ WRONG: "The user probably wants error handling too"
❌ WRONG: "I'll make this more robust while I'm here"
❌ WRONG: "This will help them later"

✅ RIGHT: "The user asked for X. I will implement X only."
```

### Rule 2: No Mind Reading

**Do not assume user intent beyond their words.**

```
❌ WRONG: "They'll need validation, so I'll add it"
❌ WRONG: "This is obviously better, so I'll do it"
❌ WRONG: "Any developer would want this improvement"

✅ RIGHT: "Is this what you want, or should I ask?"
```

### Rule 3: Ask Before Improving

**Every "improvement" requires explicit approval.**

```
Types of improvements that require asking:
- Better variable names
- More efficient algorithms
- Additional error handling
- More comprehensive validation
- Better code organization
- Added comments or documentation
- Additional tests
- Performance optimizations
```

### Rule 4: One Feature at a Time

**Implement exactly one feature per request, no bundling.**

```
❌ WRONG: "I'll fix the bug AND refactor AND add tests"
✅ RIGHT: "I'll fix the bug. After you verify it works, we can discuss refactoring."
```

### Rule 5: Resist Rationalization

**Common rationalizations that violate YAGNI:**

See [Rationalization Traps](references/rationalization-traps.md) for complete list.

**Quick examples:**

- "It's just a small change" → NO, ask first
- "It'll save time later" → NO, ask first
- "It's a best practice" → NO, ask first
- "The user will want this" → NO, ask first

## Mandatory Checklist

Before submitting ANY code, verify:

- [ ] Every change traces back to explicit user request
- [ ] No features added beyond what was requested
- [ ] No refactoring of adjacent code
- [ ] No "defensive" improvements made
- [ ] Asked questions for anything unclear
- [ ] Implementation matches user's words exactly

## When YAGNI Doesn't Apply

**Rare exceptions where you CAN act without asking:**

1. **Critical bugs** that would break the requested change
   - Example: Fixing syntax error in file you're modifying

2. **Security vulnerabilities** being introduced
   - Example: User asks for user input handling → You must sanitize

3. **Data loss prevention**
   - Example: User asks to delete records → You warn about irreversibility

**Even in exceptions: Mention what you did and why.**

## Output Format

When reporting completed work:

```markdown
## Changes Made

[List only what was explicitly requested]

## Opportunities Identified (Not Implemented)

[List potential improvements you noticed but didn't implement]

Would you like me to address any of these opportunities?
```

## Anti-Patterns to Avoid

### ❌ The "While I'm Here" Fallacy

**Pattern**: Since I'm editing this file, I'll also fix/improve nearby code.

**Why it's wrong**: Mixing concerns makes changes harder to review and introduces risk.

**What to do**: Finish requested change, THEN ask: "I noticed X nearby. Should I address that separately?"

See [The "While I'm Here" Fallacy](references/while-im-here.md) for detailed analysis.

### ❌ The "Future-Proofing" Trap

**Pattern**: I'll build it more generic/reusable/flexible for future needs.

**Why it's wrong**: You don't know future needs. Premature abstraction adds complexity.

**What to do**: Build exactly what's needed now. Refactor when future needs are ACTUAL.

### ❌ The "Best Practice" Excuse

**Pattern**: Best practices say I should add tests/docs/validation, so I will.

**Why it's wrong**: Best practices are context-dependent. User defines requirements.

**What to do**: Ask: "Best practices suggest X. Should I include that in this change?"

### ❌ The "Obvious Improvement" Mirage

**Pattern**: This is obviously better, the user will thank me.

**Why it's wrong**: "Obvious" is subjective. Changes have costs (time, bugs, maintenance).

**What to do**: State the improvement, ask if it should be included.

## Related Skills

- `debugging-systematically` - Root cause analysis without scope creep
- `developing-with-tdd` - Test-first approach that prevents over-engineering
- `verifying-before-completion` - Ensure implementation matches request

## Examples

See [examples/](examples/) for real scenarios:

- [Bug Fix with Adjacent Issues](examples/bug-fix-with-temptations.md)
- [Feature Request with Implied Requirements](examples/feature-implied-requirements.md)
- [Refactoring Request Boundaries](examples/refactoring-boundaries.md)
