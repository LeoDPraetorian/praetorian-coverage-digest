# Scope Boundaries

**How to identify what's in scope vs out of scope.**

## The Three Categories

Every potential change falls into one of three categories:

| Category | Definition | Action |
|----------|------------|--------|
| **In Scope** | Explicitly requested by user's words | ✅ Implement without asking |
| **Unclear** | Implied but not explicit | ⚠️ Ask for clarification |
| **Out of Scope** | Not mentioned at all | ❌ Do NOT implement unless approved |

## How to Categorize

### Step 1: Read the User's Request Word-by-Word

**Extract only the explicit requests:**

```
Example Request: "Fix the bug where users can't login"

Explicit requests:
- Fix a bug
- Bug is: users can't login

That's it. Nothing else was requested.
```

### Step 2: List Potential Changes

**List everything you're considering implementing:**

```
Potential changes:
1. Fix the login bug (the actual issue)
2. Add error logging for failed logins
3. Improve error messages shown to users
4. Add rate limiting to prevent brute force
5. Refactor authentication code
6. Add unit tests for login flow
7. Update documentation
```

### Step 3: Classify Each Change

**Apply the three categories:**

| Change | Category | Reasoning |
|--------|----------|-----------|
| 1. Fix login bug | ✅ In Scope | Explicitly requested |
| 2. Error logging | ⚠️ Unclear | Might be needed for debugging, but not mentioned |
| 3. Better errors | ❌ Out of Scope | Not mentioned at all |
| 4. Rate limiting | ❌ Out of Scope | Not mentioned (also, different concern) |
| 5. Refactor auth | ❌ Out of Scope | Not mentioned |
| 6. Add tests | ❌ Out of Scope | Not mentioned |
| 7. Update docs | ❌ Out of Scope | Not mentioned |

**Result**: Only #1 is in scope. Everything else requires asking.

## In Scope: Explicit Requests

**Characteristics:**
- User used specific words requesting this
- You can point to exact phrase
- No interpretation needed

**Examples:**

```
Request: "Add a delete button to each row"
In Scope: Add delete button to rows

Request: "Fix the typo in the header"
In Scope: Fix header typo

Request: "Update the API to return user emails"
In Scope: Modify API response to include emails
```

**Test**: Can you quote the user's exact words that request this change?
- YES → In Scope
- NO → Not In Scope

## Unclear: Implied but Not Explicit

**Characteristics:**
- You're inferring from context
- User didn't say it directly
- Could go either way

**Examples:**

```
Request: "Add a form to create users"
Unclear: Should form include validation?
→ ASK: "What validation should I include?"

Request: "Fix the slow query"
Unclear: Should I add caching too?
→ ASK: "Should I add caching or just optimize the query?"

Request: "Add dark mode"
Unclear: Should preference be persisted?
→ ASK: "Should dark mode preference be saved?"
```

**Test**: Is this directly stated, or are you interpreting?
- Stated → In Scope
- Interpreting → Unclear, ask for clarification

## Out of Scope: Not Mentioned

**Characteristics:**
- User didn't mention it
- Not implied by context
- You're adding it proactively

**Examples:**

```
Request: "Add user profile page"
Out of Scope: Also add settings page
→ User asked for profile, not settings

Request: "Fix the search bug"
Out of Scope: Refactor search implementation
→ User asked for bug fix, not refactor

Request: "Add CSV export"
Out of Scope: Also add JSON and XML export
→ User asked for CSV only
```

**Test**: Did user mention this at all?
- NO → Out of Scope, do NOT implement without asking

## Edge Cases

### Edge Case 1: Syntactic Requirements

**Scenario**: Change requires additional code that wasn't explicitly requested.

**Examples:**
- Adding import statement for new library
- Adding type definition for new parameter
- Adding configuration for new service

**Classification**: **In Scope** (required for requested change to work)

**But**: Mention it in output
```
"I added the search feature. This required:
- Importing the search library
- Adding SearchConfig type
- Configuring the search index

Let me know if you'd like details on the setup."
```

---

### Edge Case 2: Security/Data-Loss Prevention

**Scenario**: User's request would introduce security vulnerability or data loss.

**Examples:**
- User input without sanitization → XSS risk
- Delete operation without confirmation → Data loss
- Sensitive data without encryption → Exposure

**Classification**: **In Scope** (critical exception)

**But**: Explain why you added it
```
"I implemented the delete feature. For safety, I added:
- Confirmation dialog (prevents accidental deletion)
- Input sanitization (prevents XSS)

These are security/data-loss mitigations. Let me know if you want different safety mechanisms."
```

---

### Edge Case 3: Adjacent Bugs

**Scenario**: While implementing, you discover other bugs in the same file.

**Examples:**
- User asks to fix Bug A
- You notice Bug B in the same function
- Temptation: "While I'm here, I'll fix Bug B too"

**Classification**: **Out of Scope** (separate concern)

**Action**: Fix Bug A only, report Bug B separately
```
"Fixed Bug A (search not working). While investigating, I found Bug B (filter not resetting). Should I:
1. Leave Bug B for separate PR
2. Fix Bug B in this PR
3. Create an issue for Bug B"
```

---

### Edge Case 4: Incomplete Specifications

**Scenario**: User request lacks details needed for implementation.

**Examples:**
- "Add validation" → What validation rules?
- "Make it faster" → How fast? What's acceptable?
- "Add error handling" → For which errors? How to handle?

**Classification**: **Unclear** (requires clarification)

**Action**: Ask specific questions
```
"You asked me to add validation. Questions:
1. Which fields need validation?
2. What rules should I apply (required, format, length, etc.)?
3. What error messages should I show?
4. Should validation be client-side, server-side, or both?"
```

---

## The Litmus Test

**Before implementing ANY change, ask:**

### Question 1: Is it explicitly requested?
- Can you quote exact words? → ✅ In Scope
- Interpreting/inferring? → ⚠️ Unclear, ask
- Not mentioned? → ❌ Out of Scope, ask

### Question 2: Is it required for requested change to work?
- Syntactic requirement (import, type, config)? → ✅ In Scope
- Optional improvement? → ❌ Out of Scope, ask

### Question 3: Is it a critical security/data-loss issue?
- Would cause security vulnerability? → ✅ In Scope (explain why)
- Would cause data loss? → ✅ In Scope (explain why)
- "Nice to have" safety? → ❌ Out of Scope, ask

## Real-World Example

**User Request**: "Add a comment section to blog posts"

### Classification Analysis

| Potential Change | Category | Reasoning |
|-----------------|----------|-----------|
| Add comment input field | ✅ In Scope | Explicitly requested ("add comment section") |
| Add submit button | ✅ In Scope | Required for functionality |
| Save comments to database | ✅ In Scope | Implied by "comment section" |
| Display existing comments | ✅ In Scope | Implied by "comment section" |
| Add author name display | ⚠️ Unclear | Part of comment? Ask what fields to show |
| Add timestamps | ⚠️ Unclear | Common pattern, but not mentioned |
| Add edit/delete buttons | ❌ Out of Scope | Not mentioned |
| Add upvote/downvote | ❌ Out of Scope | Not mentioned |
| Add nested replies | ❌ Out of Scope | Not mentioned |
| Add comment moderation | ❌ Out of Scope | Not mentioned |
| Add email notifications | ❌ Out of Scope | Not mentioned |
| Add spam filtering | ⚠️ Unclear | Security consideration, ask |

### Recommended Approach

```
"I can add a comment section to blog posts. The basic implementation will include:
- Comment input field
- Submit button
- Display of existing comments

Questions about scope:
1. What fields should comments show? (author name, timestamp, etc.)
2. Should users be able to edit/delete their comments?
3. Do you want spam filtering or moderation features?
4. Any other features for the initial version?

My recommendation: Start with basic commenting (input + display), then add features based on your priorities."
```

## Summary

**Scope Classification Flowchart:**

```
Is it explicitly requested?
├─ YES → ✅ In Scope
└─ NO → Is it required for requested change?
    ├─ YES → ✅ In Scope (mention it)
    └─ NO → Is it critical security/data-loss?
        ├─ YES → ✅ In Scope (explain why)
        └─ NO → Is it implied by request?
            ├─ YES → ⚠️ Unclear (ask for clarification)
            └─ NO → ❌ Out of Scope (ask before implementing)
```

**Default action**: When uncertain, ask. It's faster to ask than to redo work.
