# YAGNI Decision Tree

**Use this flowchart for EVERY change you're about to make.**

## The Decision Flow

```
START: About to implement change
    ↓
[1] Is this change explicitly mentioned in user's request?
    ↓
    YES → [2]
    NO  → [3]

[2] Can you point to the exact words that requested it?
    ↓
    YES → ✅ IMPLEMENT (In Scope)
    NO  → [3]

[3] Is this change absolutely required for requested functionality?
    ↓
    Examples of "required":
    - Import statement for requested feature
    - Type definition for new parameter
    - Configuration for new service
    ↓
    YES → ✅ IMPLEMENT + MENTION in output
    NO  → [4]

[4] Is this a critical security/data-loss issue?
    ↓
    Examples:
    - SQL injection vulnerability
    - Missing input sanitization
    - Data deletion without confirmation
    ↓
    YES → ✅ IMPLEMENT + EXPLAIN why (security exception)
    NO  → [5]

[5] ⚠️ OUT OF SCOPE
    ↓
    Use AskUserQuestion:
    "I noticed [OPPORTUNITY]. This wasn't requested.
     Should I:
     1. Stick to what you asked for
     2. Also implement [OPPORTUNITY]
     3. Show what you asked for first, discuss later"
```

## Question Templates by Scenario

### Adding Features

```
"I can implement [REQUESTED FEATURE]. While looking at this, I noticed we could also add [NEW FEATURE]. Should I:
1. Implement only [REQUESTED FEATURE]
2. Implement both features
3. Show [REQUESTED FEATURE] first, discuss [NEW FEATURE] after"
```

### Refactoring Adjacent Code

```
"I can make [REQUESTED CHANGE]. I noticed [ADJACENT CODE] could be refactored for consistency. Should I:
1. Only make [REQUESTED CHANGE]
2. Refactor [ADJACENT CODE] as well
3. Focus on [REQUESTED CHANGE] now, refactor separately later"
```

### Adding Validation/Error Handling

```
"I can implement [FEATURE]. Should I include:
- Input validation?
- Error handling?
- Edge case handling?

Or stick to the basic implementation?"
```

### Creating Abstractions

```
"I can implement [FEATURE] directly. I could also create a reusable utility that might be useful later. Should I:
1. Implement directly (simpler, faster)
2. Create reusable utility (more code, future flexibility)
3. Implement directly now, abstract later if needed"
```

### Adding Documentation

```
"I can implement [FEATURE]. Should I also add:
- Code comments?
- JSDoc documentation?
- README updates?

Or deliver working code first?"
```

### Adding Tests

```
"I can implement [FEATURE]. Should I also add:
- Unit tests?
- Integration tests?
- E2E tests?

Or deliver implementation first?"
```

## Real-World Example

**User Request**: "Fix the bug where the search box doesn't clear after clicking reset"

### Decision Tree Application

```
Change 1: Clear search box on reset click
├─ Explicitly requested? YES
├─ Exact words? YES ("clear after clicking reset")
└─ ✅ IMPLEMENT

Change 2: Also reset the filter dropdowns
├─ Explicitly requested? NO
├─ Required for requested functionality? NO
├─ Critical security/data-loss? NO
└─ ⚠️ ASK: "Should I also reset the filter dropdowns?"

Change 3: Add animation to the clear action
├─ Explicitly requested? NO
├─ Required? NO
├─ Critical? NO
└─ ⚠️ ASK: "Should I add animation to the clear action?"

Change 4: Refactor the reset logic for clarity
├─ Explicitly requested? NO
├─ Required? NO
├─ Critical? NO
└─ ⚠️ ASK: "Should I refactor the reset logic?"
```

**Correct Implementation**: Clear search box on reset click (Change 1 only).

**Report to User**:
```
Fixed the search box clear bug. The search box now clears when you click reset.

While implementing this, I noticed:
- Filter dropdowns don't reset (should they?)
- No animation on clear (would you like that?)
- Reset logic could be refactored (worth doing?)

Let me know if you want any of these addressed.
```

## Common Pitfalls

### Pitfall 1: "It's Obvious"

```
❌ WRONG: "Obviously they want validation too"
✅ RIGHT: Ask if validation should be included
```

**Why**: "Obvious" is subjective. Maybe they're prototyping and validation comes later. Maybe they have validation elsewhere. Don't assume.

### Pitfall 2: "It's Small"

```
❌ WRONG: "It's just 2 lines to add error handling"
✅ RIGHT: Ask if error handling should be included
```

**Why**: Small changes compound. 10 "just 2 lines" changes = 20 unexpected lines of code. Each change has a cost (review time, potential bugs, maintenance burden).

### Pitfall 3: "It'll Save Time Later"

```
❌ WRONG: "I'll make this generic now to save time when we need variants"
✅ RIGHT: Build specific now, generalize when ACTUAL need arises
```

**Why**: You don't know what "later" needs will be. Premature abstraction creates complexity that might never be used.

### Pitfall 4: "Best Practices"

```
❌ WRONG: "Best practices say add tests, so I'll add them"
✅ RIGHT: Ask if tests should be included in this change
```

**Why**: Best practices are guidelines, not laws. The user might have a testing strategy. They might want to see working code first, then add tests. Don't assume.

## When to Bundle Changes

**Very rare exceptions where bundling is acceptable:**

1. **Syntactic requirements**
   - Example: Adding import for new feature
   - Example: Adding type definition for new parameter

2. **Critical security fixes**
   - Example: User asks for form input → You MUST sanitize
   - Note: Explain why you added this

3. **Data integrity**
   - Example: User asks to modify DB schema → You add migration script
   - Note: Explain why you added this

**All other bundling requires asking first.**

## Summary

**Default to asking. Always.**

When in doubt:
1. Implement ONLY what was explicitly requested
2. Note opportunities you're skipping
3. Ask if user wants to address those opportunities

**The goal**: Deliver exactly what was requested, no more, no less.
