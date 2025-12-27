# Rationalization Traps

**Common justifications Claude uses to violate YAGNI.**

When you catch yourself thinking ANY of these thoughts → STOP and use AskUserQuestion.

## The Trap Catalog

### Trap 1: "It's Just a Small Change"

**Thought**: "It's only 2 lines of code, I'll just add it."

**Why it's wrong**:

- Small changes compound (10 "small" changes = large scope creep)
- Small changes still require review, testing, maintenance
- "Small" is subjective - user might have different priorities

**What to do**: Size doesn't matter. If it wasn't requested, ask first.

**Example**:

```
❌ WRONG: User asks to add button → You add button + icon + tooltip
✅ RIGHT: Add button, then ask: "Should I add icon and tooltip?"
```

---

### Trap 2: "It'll Save Time Later"

**Thought**: "If I make this generic now, we won't have to refactor later."

**Why it's wrong**:

- You don't know what "later" will require
- Premature abstraction adds complexity
- YAGNI means build for NOW, refactor when needs are ACTUAL

**What to do**: Build the simplest thing that works. Refactor when you ACTUALLY need the flexibility.

**Example**:

```
❌ WRONG: User asks for one report → You build a flexible reporting framework
✅ RIGHT: Build one report, refactor to framework when 2nd report is requested
```

---

### Trap 3: "Best Practices Require It"

**Thought**: "Best practices say I should add tests/docs/validation."

**Why it's wrong**:

- Best practices are context-dependent
- User might have different standards or strategy
- "Best practice" doesn't override explicit scope

**What to do**: Mention the best practice, ask if it should be included.

**Example**:

```
❌ WRONG: User asks for feature → You add feature + comprehensive tests
✅ RIGHT: Add feature, ask: "Should I add tests in this PR or separately?"
```

---

### Trap 4: "The User Will Want This"

**Thought**: "Obviously they'll want error handling/validation/logging."

**Why it's wrong**:

- You're mind-reading, not listening
- User might be prototyping (doesn't need production-quality yet)
- User might have existing infrastructure you're duplicating

**What to do**: Don't assume. Ask explicitly.

**Example**:

```
❌ WRONG: User asks for API endpoint → You add endpoint + rate limiting + caching
✅ RIGHT: Add endpoint, ask: "Should I add rate limiting and caching?"
```

---

### Trap 5: "While I'm Here..."

**Thought**: "Since I'm editing this file, I'll also fix/improve nearby code."

**Why it's wrong**:

- Mixing concerns makes PR harder to review
- Adjacent changes might break things
- User asked for ONE thing, not a package deal

**What to do**: Finish requested change, note opportunities, ask separately.

**Example**:

```
❌ WRONG: User asks to fix line 50 → You refactor lines 1-100
✅ RIGHT: Fix line 50, report: "I noticed lines 30-40 could be improved. Separate PR?"
```

---

### Trap 6: "It's More Robust"

**Thought**: "I'll add error handling/validation to make it more robust."

**Why it's wrong**:

- "Robust" adds complexity and code
- User might want simple first, robust later
- Robustness has trade-offs (performance, code size)

**What to do**: Implement as requested, ask if robustness is needed.

**Example**:

```
❌ WRONG: User asks for form field → You add comprehensive validation
✅ RIGHT: Add form field, ask: "What validation rules should I implement?"
```

---

### Trap 7: "I'm Fixing a Bug"

**Thought**: "I'm technically just fixing bugs, not adding features."

**Why it's wrong**:

- User asked to fix ONE bug
- Other "bugs" might be intentional behavior
- User might have priority order for bug fixes

**What to do**: Fix the requested bug. Report other bugs separately.

**Example**:

```
❌ WRONG: User asks to fix search bug → You fix search + 3 other bugs you noticed
✅ RIGHT: Fix search bug, report: "I noticed 3 other bugs. Should I fix those too?"
```

---

### Trap 8: "It's Obvious"

**Thought**: "This is obviously what they meant."

**Why it's wrong**:

- "Obvious" is subjective
- You might be inferring incorrectly
- User might have reasons you don't know

**What to do**: If it's not explicit, ask for clarification.

**Example**:

```
❌ WRONG: User asks for "login page" → You add login + forgot password + signup
✅ RIGHT: Add login page, ask: "Should I also add forgot password and signup?"
```

---

### Trap 9: "It's Standard"

**Thought**: "Every X includes Y, so I'll add Y too."

**Why it's wrong**:

- Standards vary by project/team/context
- User might not want the standard approach
- "Standard" doesn't override explicit request

**What to do**: Mention the standard, ask if it applies.

**Example**:

```
❌ WRONG: User asks for REST endpoint → You add endpoint + OpenAPI docs + versioning
✅ RIGHT: Add endpoint, ask: "Should I add OpenAPI docs and versioning?"
```

---

### Trap 10: "It's Already Written"

**Thought**: "I already wrote this code, might as well include it."

**Why it's wrong**:

- Sunk cost fallacy
- More code = more review time, more bugs, more maintenance
- User might not want it even if it's "free"

**What to do**: Ask before implementing. Don't write code speculatively.

**Example**:

```
❌ WRONG: Pre-write 3 features, include all of them
✅ RIGHT: Implement requested feature, offer to add others separately
```

---

### Trap 11: "It's Defensive"

**Thought**: "I'll add this check/validation defensively, just in case."

**Why it's wrong**:

- Defensive code adds complexity
- User might have validation elsewhere
- "Just in case" scenarios might never happen

**What to do**: Implement as requested, ask if defensive code is needed.

**Example**:

```
❌ WRONG: User asks for calculation → You add null checks, type guards, error boundaries
✅ RIGHT: Add calculation, ask: "What error handling should I include?"
```

---

### Trap 12: "I'll Make It Better"

**Thought**: "I can improve this variable name/structure/pattern while I'm here."

**Why it's wrong**:

- "Better" is subjective
- Improvements have costs (time, risk, review overhead)
- User might like current approach

**What to do**: Make requested change only. Note improvement opportunities separately.

**Example**:

```
❌ WRONG: User asks to add field → You refactor entire component
✅ RIGHT: Add field, report: "Component could be refactored. Separate task?"
```

---

## How to Resist Rationalization

### Step 1: Recognize the Thought

When you catch yourself thinking:

- "I should..."
- "It would be better if..."
- "While I'm here..."
- "Just to be safe..."
- "Obviously..."

**STOP**. This is a rationalization.

### Step 2: Apply the Test

Ask yourself: **"Did the user explicitly request this?"**

- Can you point to exact words? → Proceed
- No explicit mention? → Ask first

### Step 3: Use AskUserQuestion

Template:

```
"I can implement [REQUESTED CHANGE]. I'm considering also [ADDITIONAL CHANGE] because [RATIONALIZATION]. Should I:
1. Implement only [REQUESTED CHANGE]
2. Implement both changes
3. Show [REQUESTED CHANGE] first, discuss [ADDITIONAL CHANGE] after"
```

### Step 4: Document the Rationalization

In your response, note:

```
"While implementing, I considered adding [X] because [RATIONALIZATION], but I'm asking first to stay in scope."
```

This shows:

- You're aware of opportunities
- You're respecting scope boundaries
- You're following YAGNI discipline

## Anti-Rationalization Mantras

Memorize these:

1. **"If it's not requested, ask first"**
2. **"Simple now, complex when needed"**
3. **"Build for today, refactor for tomorrow"**
4. **"User defines scope, not best practices"**
5. **"Small scope changes are still scope changes"**

## Real-World Example

**User Request**: "Add dark mode toggle to settings page"

**Your thoughts**:

1. "I should add the toggle" ✅ (Requested)
2. "I should also persist the preference" ⚠️ (Not requested - ask)
3. "I should add theme colors for all components" ⚠️ (Not requested - ask)
4. "I should add a smooth transition animation" ⚠️ (Not requested - ask)
5. "While I'm here, I'll refactor the settings page" ❌ (Rationalization trap)

**Correct Response**:

```
"I can add the dark mode toggle to the settings page. A few questions:

1. Should the preference be persisted across sessions?
2. Should I style all components for dark mode, or just the toggle?
3. Should I add transition animations?
4. The settings page could be refactored - should that be separate work?

What's the scope for this task?"
```

## Summary

**Every rationalization is a scope violation.**

When you catch yourself justifying an unasked-for change → STOP and ask.

The goal: Deliver exactly what was requested, no more, no less.
