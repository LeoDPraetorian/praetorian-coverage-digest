# Example: Bug Fix with Temptations

**Real-world scenario demonstrating YAGNI discipline.**

## User Request

```
"The search box on the users page doesn't clear when I click the reset button. Can you fix that?"
```

## Analysis

### Explicit Request

- Fix bug where search box doesn't clear on reset click

### Scope Boundaries

| Change                      | In Scope? | Reasoning            |
| --------------------------- | --------- | -------------------- |
| Clear search box on reset   | ✅ Yes    | Explicitly requested |
| Clear filter dropdowns      | ❌ No     | Not mentioned        |
| Reset pagination            | ❌ No     | Not mentioned        |
| Add animation to clear      | ❌ No     | Not mentioned        |
| Refactor reset logic        | ❌ No     | Not mentioned        |
| Add tests for reset         | ❌ No     | Not mentioned        |
| Fix styling of reset button | ❌ No     | Not mentioned        |

## Temptations (Rationalizations)

### Temptation 1: "Clear filters too"

**Thought**: "The reset button should probably clear the filters as well, not just search."

**Rationalization**: "It's called 'reset' so it should reset everything."

**Why it's wrong**: User only mentioned search box. They might want filters to persist.

**What to do**: Fix search only, then ask about filters.

---

### Temptation 2: "Add smooth animation"

**Thought**: "I'll add a fade-out animation when the search clears for better UX."

**Rationalization**: "It's just CSS, adds polish."

**Why it's wrong**: User asked for functionality (clearing), not polish (animation).

**What to do**: Fix functionality first, ask about animation separately.

---

### Temptation 3: "Refactor reset logic"

**Thought**: "The reset handler is messy, I'll refactor it while I'm here."

**Rationalization**: "Code quality matters, and I'm already in this file."

**Why it's wrong**: User asked to fix a bug, not refactor code. Refactoring adds risk.

**What to do**: Fix bug only. Note refactoring opportunity for separate work.

---

### Temptation 4: "Fix button styling"

**Thought**: "The reset button styling is inconsistent with other buttons."

**Rationalization**: "It's a quick fix, and it improves consistency."

**Why it's wrong**: User asked to fix functionality, not styling. Styling is separate concern.

**What to do**: Fix functionality. Note styling issue separately.

---

## Correct Implementation

### Step 1: Locate the Bug

```typescript
// Current code (buggy)
const handleReset = () => {
  setFilters({});
  // BUG: Forgot to clear search
};
```

### Step 2: Fix ONLY the Bug

```typescript
// Fixed code
const handleReset = () => {
  setFilters({});
  setSearchQuery(""); // FIX: Clear search box
};
```

### Step 3: Verify Fix Works

Test that search box clears on reset click.

### Step 4: Report to User

```markdown
## Fixed

✅ Search box now clears when you click the reset button.

## Opportunities Identified (Not Implemented)

While fixing this, I noticed:

1. **Filter dropdowns don't reset**
   - Should reset button also clear the filter dropdowns?

2. **No animation on clear**
   - Would you like a smooth transition when the search clears?

3. **Reset logic could be refactored**
   - The reset handler could be simplified. Worth doing in a separate PR?

4. **Button styling inconsistency**
   - Reset button style differs from other buttons. Should I standardize?

Let me know if any of these should be addressed.
```

## Incorrect Implementation (What NOT to Do)

### ❌ WRONG: Implementing Everything

```typescript
// DON'T DO THIS - scope creep
const handleReset = () => {
  // ✅ Requested: Clear search
  setSearchQuery("");

  // ❌ NOT requested: Clear filters
  setFilters({});

  // ❌ NOT requested: Reset pagination
  setCurrentPage(1);

  // ❌ NOT requested: Add animation
  setClearAnimation(true);
  setTimeout(() => setClearAnimation(false), 300);

  // ❌ NOT requested: Track analytics
  trackEvent("search_reset");
};
```

**Why this is wrong**:

- 1 requested change became 5 changes
- User asked for search fix, got behavior changes they didn't ask for
- More code = more review time, more potential bugs
- User might not want filters/pagination to reset

### ❌ WRONG: Refactoring While Fixing

```typescript
// DON'T DO THIS - mixing concerns
// Before
const handleReset = () => {
  setFilters({});
};

// After (WRONG - refactored everything)
const useResetHandler = () => {
  const resetSearch = useCallback(() => setSearchQuery(""), []);
  const resetFilters = useCallback(() => setFilters({}), []);
  const resetPagination = useCallback(() => setCurrentPage(1), []);

  return useCallback(() => {
    resetSearch();
    resetFilters();
    resetPagination();
  }, [resetSearch, resetFilters, resetPagination]);
};
```

**Why this is wrong**:

- User asked to fix bug (search not clearing)
- You refactored the entire reset system
- Original bug fix is hidden in refactoring
- Harder to review, more risk of introducing new bugs

## Correct Flow

### 1. Parse Request

```
User wants: Search box to clear on reset button click
User did NOT ask for: Anything else
```

### 2. Identify Changes

```
In Scope:
✅ Clear search box on reset click

Out of Scope (require asking):
❌ Clear filters
❌ Reset pagination
❌ Add animation
❌ Refactor code
❌ Fix styling
❌ Add tests
```

### 3. Implement Minimal Fix

```typescript
// One line added
setSearchQuery("");
```

### 4. Report

```
Fixed: Search box clears on reset
Noticed: [List opportunities]
Question: Should any of these be addressed?
```

## Lessons

### ✅ Do This

1. Fix exactly what was requested
2. Note other opportunities
3. Ask before expanding scope
4. Keep fix minimal and focused

### ❌ Don't Do This

1. Assume user wants more than they asked for
2. "Improve" things while you're there
3. Bundle multiple changes together
4. Refactor when fixing bugs

## The Payoff

**With YAGNI discipline:**

- User gets working fix quickly
- One-line change, easy to review
- No unexpected behavior changes
- User can request additional work if desired

**Without YAGNI discipline:**

- User waits longer for complex change
- Large PR, hard to review
- Unexpected behavior (filters clearing, animations, etc.)
- Potential for new bugs in added code

## Summary

**User asked for**: Search box to clear on reset
**You delivered**: Search box clears on reset
**You noted**: Other improvement opportunities
**Result**: User satisfied, scope respected, feedback loop established
