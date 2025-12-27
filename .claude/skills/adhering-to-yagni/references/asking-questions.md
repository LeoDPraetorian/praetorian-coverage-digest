# Asking Questions Pattern

**How to ask effective scope questions using AskUserQuestion tool.**

## The Formula

```
AskUserQuestion:
"I can implement [REQUESTED]. I'm considering [ADDITIONAL] because [REASON].
Should I:
1. [MINIMAL SCOPE - requested only]
2. [EXPANDED SCOPE - requested + additional]
3. [STAGED APPROACH - deliver requested first, discuss additional after]"
```

## Key Components

### 1. Acknowledge the Request

Start by confirming what WAS requested:

```
"I can implement [EXACTLY WHAT USER ASKED FOR]."
```

This shows you understood the core request.

### 2. State the Additional Work

Be specific about what you're considering adding:

```
"I'm considering also [SPECIFIC ADDITIONAL WORK]"
```

Not vague like "making improvements" - name the exact change.

### 3. Explain Your Reasoning

Be transparent about why you're tempted:

```
"because [YOUR REASONING]"
```

Examples:

- "because it's a common pattern in similar features"
- "because it would prevent a potential edge case"
- "because best practices suggest including it"

### 4. Offer Clear Options

Give 3 options (minimal, expanded, staged):

```
1. Implement only [REQUESTED]
2. Implement [REQUESTED] + [ADDITIONAL]
3. Deliver [REQUESTED] first, discuss [ADDITIONAL] after
```

Option 3 is often the best default - deliver working code first, expand later.

## Real-World Templates

### Template 1: Adding Features

**Scenario**: User asks for one feature, you see opportunity for related feature.

```
"I can implement [FEATURE A] as requested. I'm considering also adding [FEATURE B] because they're commonly used together. Should I:
1. Implement only [FEATURE A]
2. Implement both [FEATURE A] and [FEATURE B]
3. Deliver [FEATURE A] first, we can add [FEATURE B] later if needed"
```

**Example**:

```
User Request: "Add a search box to the header"

Question:
"I can add the search box to the header. I'm considering also adding autocomplete suggestions because most modern search boxes include them. Should I:
1. Add just the search box
2. Add search box with autocomplete
3. Add search box first, we can discuss autocomplete after you test it"
```

---

### Template 2: Refactoring Adjacent Code

**Scenario**: User asks to change one thing, you notice opportunity to refactor surrounding code.

```
"I can make [REQUESTED CHANGE]. While looking at this, I noticed [ADJACENT CODE] could be refactored for [REASON]. Should I:
1. Only make [REQUESTED CHANGE]
2. Make [REQUESTED CHANGE] + refactor [ADJACENT CODE]
3. Make [REQUESTED CHANGE] now, we can refactor [ADJACENT CODE] separately later"
```

**Example**:

```
User Request: "Update the user profile form to include phone number"

Question:
"I can add the phone number field to the profile form. While looking at this, I noticed the form uses an old validation pattern that could be updated to match our newer forms. Should I:
1. Only add the phone number field
2. Add phone number + update validation pattern
3. Add phone number now, we can update validation separately"
```

---

### Template 3: Adding Validation/Error Handling

**Scenario**: User asks for functionality, you're considering adding validation or error handling.

```
"I can implement [FUNCTIONALITY]. I'm considering adding [VALIDATION/ERROR HANDLING] because [REASON]. Should I:
1. Implement basic [FUNCTIONALITY] without [VALIDATION/ERROR HANDLING]
2. Implement [FUNCTIONALITY] with [VALIDATION/ERROR HANDLING]
3. Implement [FUNCTIONALITY] first, we can add [VALIDATION/ERROR HANDLING] after testing"
```

**Example**:

```
User Request: "Add endpoint to upload user avatar"

Question:
"I can add the avatar upload endpoint. I'm considering adding validation for file type, size, and dimensions because we'll want to prevent inappropriate or oversized uploads. Should I:
1. Implement basic upload without validation
2. Implement upload with full validation (file type, size, dimensions)
3. Implement basic upload first, we can add validation after you test the core functionality

What validation rules do you want?"
```

---

### Template 4: Creating Abstractions

**Scenario**: User asks for specific implementation, you see opportunity for reusable abstraction.

```
"I can implement [SPECIFIC IMPLEMENTATION]. I'm considering creating a reusable [ABSTRACTION] because [REASON]. Should I:
1. Implement directly (simpler, faster)
2. Create reusable [ABSTRACTION] (more code, future flexibility)
3. Implement directly now, we can abstract later if we need it elsewhere"
```

**Example**:

```
User Request: "Add a success notification when user saves settings"

Question:
"I can add a success notification for settings save. I'm considering creating a reusable notification system because we might want notifications in other parts of the app. Should I:
1. Add a simple success message for settings (faster, specific)
2. Build a reusable notification system (more code, works everywhere)
3. Add simple notification now, build reusable system later when we know what other notifications we need"
```

---

### Template 5: Adding Documentation

**Scenario**: User asks for code, you're considering adding documentation.

```
"I can implement [FEATURE]. I'm considering adding [TYPE OF DOCUMENTATION] because [REASON]. Should I:
1. Deliver working code without documentation
2. Include [TYPE OF DOCUMENTATION] in this PR
3. Deliver code first, add documentation separately"
```

**Example**:

```
User Request: "Create helper function to format currency"

Question:
"I can create the currency formatting function. I'm considering adding JSDoc documentation with usage examples because this will be used across the codebase. Should I:
1. Write the function without documentation
2. Include JSDoc documentation and examples
3. Write function first, we can document it after you verify it works correctly"
```

---

### Template 6: Adding Tests

**Scenario**: User asks for implementation, you're considering adding tests.

```
"I can implement [FEATURE]. I'm considering adding [TYPE OF TESTS] because [REASON]. Should I:
1. Deliver implementation without tests
2. Include [TYPE OF TESTS] in this PR
3. Deliver implementation first, add tests separately"
```

**Example**:

```
User Request: "Add password reset functionality"

Question:
"I can implement password reset functionality. I'm considering adding unit tests and integration tests because this is security-sensitive code. Should I:
1. Implement password reset without tests
2. Include unit and integration tests in this PR
3. Implement password reset first so you can test manually, then we can add automated tests

What's your preference for test coverage on this?"
```

---

## When to Ask Multiple Questions

**If you're considering MULTIPLE additions**, break them into separate questions:

```
"I can implement [REQUESTED]. A few questions about scope:

1. Should I add [ADDITION 1]?
   - Reason: [WHY]
   - Options: Yes / No / Maybe later

2. Should I add [ADDITION 2]?
   - Reason: [WHY]
   - Options: Yes / No / Maybe later

3. Should I add [ADDITION 3]?
   - Reason: [WHY]
   - Options: Yes / No / Maybe later

Or should I stick to just [REQUESTED] and we can discuss these additions after?"
```

**Example**:

```
User Request: "Add login page"

Question:
"I can add the login page. A few questions about scope:

1. Should I include 'Forgot Password' link?
   - Reason: Common pattern on login pages
   - Options: Yes / No / Add later

2. Should I include 'Remember Me' checkbox?
   - Reason: Convenience feature
   - Options: Yes / No / Add later

3. Should I add field validation (email format, password length)?
   - Reason: Prevent invalid submissions
   - Options: Yes / No / Add later

Or should I create a basic login form and we can add these features incrementally?"
```

## Anti-Patterns to Avoid

### ❌ Asking After Implementing

```
❌ WRONG: Implement everything, then ask: "I added X, Y, Z. Is that okay?"

✅ RIGHT: Ask BEFORE implementing: "Should I add X, Y, Z?"
```

**Why**: Asking after = you've already made the decision. User now has to review/reject your work. Wasteful.

---

### ❌ Vague Questions

```
❌ WRONG: "Should I add some improvements?"

✅ RIGHT: "Should I add input validation with these rules: [SPECIFIC RULES]?"
```

**Why**: Vague questions get vague answers. Be specific about what you're proposing.

---

### ❌ Leading Questions

```
❌ WRONG: "I should probably add error handling, right?"

✅ RIGHT: "Should I add error handling, or implement basic functionality first?"
```

**Why**: Leading questions bias the response. Present neutral options.

---

### ❌ Too Many Options

```
❌ WRONG: "Should I do A, B, C, D, E, F, or G?"

✅ RIGHT: "Should I do [MINIMAL], [EXPANDED], or [STAGED]?"
```

**Why**: Too many options create decision paralysis. Keep it to 3 options max.

---

## The Default: Option 3 (Staged)

**When in doubt, recommend staged approach:**

```
"I can implement [REQUESTED]. I'm considering [ADDITIONS]. My recommendation:
- Deliver [REQUESTED] first (you can test core functionality)
- After you verify it works, we can discuss adding [ADDITIONS]

Does that work?"
```

**Benefits of staged approach:**

- User sees progress quickly
- Feedback loop is faster
- Easier to course-correct
- Reduces risk of wasted work

## Summary

**Good scope questions are:**

1. **Specific** - Name exact additions, not vague "improvements"
2. **Transparent** - Explain your reasoning
3. **Actionable** - Give clear options
4. **Asked early** - Before implementing, not after

**Template to memorize:**

```
"I can implement [REQUESTED]. I'm considering [ADDITIONAL] because [REASON].
Should I:
1. [MINIMAL]
2. [EXPANDED]
3. [STAGED]"
```
