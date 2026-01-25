---
name: debugging-react-infinite-loops
description: Debugs React infinite loop errors using systematic pattern classification, why-did-you-render tooling, and ranked fix strategies. Use when encountering "Too many re-renders" or "Maximum update depth exceeded" errors in React components.
allowed-tools: Read, Grep, Glob, Bash, Write, Edit, TodoWrite, AskUserQuestion
---

# Debugging React Infinite Loops

**Systematic methodology for diagnosing and fixing React infinite loop errors.**

## When to Use

Use this skill when you encounter:

- **Error**: "Error: Too many re-renders. React limits the number of renders to prevent an infinite loop."
- **Error**: "Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render."
- **Symptom**: Browser freezing or becoming unresponsive during React component rendering
- **Symptom**: React DevTools showing component re-rendering continuously

## Quick Reference

**Most Common Causes (Ranked by Frequency)**

| Cause                           | Quick Check                                | Fix Pattern                     |
| ------------------------------- | ------------------------------------------ | ------------------------------- |
| 1. Objects/Arrays as deps       | Is dependency an object or array?          | Extract primitive or `useMemo`  |
| 2. Self-referential state       | Does effect update its own dependency?     | Functional updater, remove dep  |
| 3. Functions recreated          | Is dependency a function?                  | `useCallback` memoization       |
| 4. Missing dep array            | No second argument to `useEffect`?         | Add `[]` or specific deps       |
| 5. Inline event handlers        | `onClick={fn()}` instead of `onClick={fn}`? | Remove parentheses              |

**Debugging Tools Priority**

1. **why-did-you-render** - Most powerful (catches object reference changes)
2. **React DevTools** - Profiler + "Highlight updates" mode
3. **ESLint exhaustive-deps** - Catches missing dependencies
4. **Binary elimination** - Comment out useEffect hooks one by one

## Core Debugging Workflow

Follow this systematic approach:

### Phase 1: Isolate the Problematic useEffect

**Complete isolation workflow:** [references/phase1-isolation.md](references/phase1-isolation.md)

**Quick steps:**

1. Check browser console for error stack trace (shows exact file:line)
2. If unclear, use binary elimination:
   - Comment out half of useEffect hooks
   - Test if error persists
   - Repeat until isolated

### Phase 2: Identify Which Dependency is Changing

**Complete dependency analysis:** [references/phase2-dependency-analysis.md](references/phase2-dependency-analysis.md)

**Quick steps:**

1. Add logging to the problematic useEffect:

```typescript
useEffect(() => {
  console.log("Effect triggered", {
    dep1,
    dep2,
    timestamp: Date.now(),
  });
  // ... rest of effect
}, [dep1, dep2]);
```

2. Check console - which value changes on every render?
3. If object/array: Check if reference changes despite identical content

### Phase 3: Classify the Root Cause

**Complete classification guide:** [references/phase3-classification.md](references/phase3-classification.md)

Match the changing dependency to one of the 5 patterns:

| Pattern                 | Indicator                                             | See                                             |
| ----------------------- | ----------------------------------------------------- | ----------------------------------------------- |
| Object/Array reference  | Dependency is `{}`, `[]`, or object from query        | [references/fix-object-deps.md](...)            |
| Self-referential update | Effect calls `setState(x)` and depends on `x`         | [references/fix-self-referential.md](...)       |
| Function recreation     | Dependency is function declared in component body     | [references/fix-function-deps.md](...)          |
| Missing array           | `useEffect(() => {...})` with no second argument      | [references/fix-missing-deps.md](...)           |
| Inline handler          | `onClick={handleClick()}` with parentheses            | [references/fix-inline-handlers.md](...)        |

### Phase 4: Apply the Fix Pattern

**Navigate to the appropriate fix guide based on classification:**

- [Object/Array Dependencies](references/fix-object-deps.md)
- [Self-Referential State](references/fix-self-referential.md)
- [Function Dependencies](references/fix-function-deps.md)
- [Missing Dependency Arrays](references/fix-missing-deps.md)
- [Inline Event Handlers](references/fix-inline-handlers.md)

### Phase 5: Verify the Fix

1. Reload the application
2. Verify error no longer appears
3. Check React DevTools Profiler - render count should stabilize
4. Remove debug logging added in Phase 2

## Tool Setup

### Installing why-did-you-render (Recommended)

**Complete setup guide:** [references/why-did-you-render-setup.md](references/why-did-you-render-setup.md)

**Quick install:**

```bash
npm install @welldone-software/why-did-you-render --save-dev
```

Create `wdyr.js`:

```javascript
if (process.env.NODE_ENV === "development") {
  const whyDidYouRender = require("@welldone-software/why-did-you-render");
  whyDidYouRender(React, {
    trackAllPureComponents: true,
  });
}
```

Import first in your app's entry point:

```javascript
import "./wdyr"; // Must be first import
import React from "react";
// ... rest of imports
```

**⚠️ CRITICAL**: Never use in production - significantly slows React.

### React DevTools Configuration

**DevTools guide:** Available in Phase 1 isolation references

**Quick setup:**

1. Install React DevTools browser extension
2. Enable "Highlight updates when components render" (Settings → General)
3. Use Profiler tab to record rendering cycles
4. Look for components that re-render continuously

## Critical Rules

### Rule 1: Always Use Primitive Values in Dependencies

**❌ WRONG:**

```typescript
const config = { threshold: 10 };
useEffect(() => {
  processData(config);
}, [config]); // New object reference every render
```

**✅ RIGHT:**

```typescript
const threshold = 10;
useEffect(() => {
  processData({ threshold });
}, [threshold]); // Primitive value
```

### Rule 2: Use Functional Updates for Self-Referential State

**❌ WRONG:**

```typescript
useEffect(() => {
  setCount(count + 1);
}, [count]); // Infinite loop
```

**✅ RIGHT:**

```typescript
useEffect(() => {
  setCount((prev) => prev + 1);
}, []); // No dependency
```

### Rule 3: Memoize Functions Used as Dependencies

**❌ WRONG:**

```typescript
const handleUpdate = () => {
  setState(data);
};
useEffect(() => {
  handleUpdate();
}, [handleUpdate]); // New function every render
```

**✅ RIGHT:**

```typescript
const handleUpdate = useCallback(() => {
  setState(data);
}, [data]);
useEffect(() => {
  handleUpdate();
}, [handleUpdate]); // Stable reference
```

### Rule 4: Prefer useMemo Over useEffect + setState for Derived Data

**❌ WRONG (causes loops):**

```typescript
useEffect(() => {
  setProcessed(transform(data));
}, [data]);
```

**✅ RIGHT (no state, no loops):**

```typescript
const processed = useMemo(() => transform(data), [data]);
```

## Common Pitfalls

### Pitfall 1: TanStack Query Data Reference Instability

**Problem**: `data` from TanStack Query changes reference even when content is identical.

**Solution**: Configure query with appropriate staleTime and refetch settings.

**See**: fix-object-deps.md Fix Pattern 5 for TanStack Query solutions

### Pitfall 2: Serialized Keys That Still Change

**Problem**: Using `JSON.stringify(obj)` as dependency but object reference still changes.

**Solution**: Serialize the inputs to the object, not the object itself.

**See**: fix-object-deps.md Fix Pattern 3 for serialization examples

### Pitfall 3: Missing Conditional Guards

**Problem**: Effect always runs even when state hasn't actually changed.

**Solution**: Add conditional check before state update.

**Example**:

```typescript
useEffect(() => {
  if (!data) {
    // Only fetch when data is missing
    fetchData().then(setData);
  }
}, [someValue, data]);
```

## Decision Tree

**Decision tree:** See section below

```
Error occurs
  ├─> Find which useEffect triggers it (Phase 1)
  │   └─> Add console.log to all useEffect hooks
  │
  ├─> Identify changing dependency (Phase 2)
  │   ├─> Is it an object/array? → Extract primitive or useMemo
  │   ├─> Is it a function? → useCallback
  │   ├─> Does effect update this state? → Functional updater
  │   └─> Is it undefined? → Add dependency array
  │
  └─> Apply fix (Phase 4) and verify (Phase 5)
```

## Advanced Patterns

For advanced use cases beyond the 5 core patterns, see:

- **useRef for non-reactive state**: fix-self-referential.md Fix Pattern 4
- **Debouncing effects**: Prevent frequent re-runs using setTimeout cleanup
- **React Compiler opt-out**: Use `'use no memo'` directive for complex hooks

## Integration

### Called By

- `gateway-frontend` (CORE) - Routes React debugging tasks
- Direct invocation when developer encounters React infinite loop errors

### Requires (invoke before starting)

None - standalone debugging methodology

### Calls (during execution)

None - terminal skill providing debugging patterns

### Pairs With (conditional)

- **`debugging-systematically`** (CORE) - When root cause is unclear after classification
  - Purpose: Systematic hypothesis-driven debugging
- **`reviewing-frontend-security`** (LIBRARY) - After fixing loop, check if fix introduces security issues
  - `Read('.claude/skill-library/security/reviewing-frontend-security/SKILL.md')`
