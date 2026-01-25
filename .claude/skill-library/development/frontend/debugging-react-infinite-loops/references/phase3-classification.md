# Phase 3: Classify the Root Cause

**Goal**: Match the changing dependency to one of the 5 common infinite loop patterns.

React infinite loops fall into predictable categories ranked by frequency. Use this classification to apply the correct fix pattern.

## The 5 Root Cause Categories (Ranked by Frequency)

### 1. Objects/Arrays as Dependencies (Most Common - ~40%)

**Indicator**: Dependency is an object or array whose reference changes every render despite identical content.

**Recognition patterns**:

- `console.log` shows object with same values but `prevDep !== currentDep` is `true`
- Dependency is from TanStack Query: `const { data } = useQuery(...)`
- Dependency is computed object: `const config = { threshold: 10 };`
- Dependency is array literal: `[item1, item2]`

**Examples**:

```typescript
// Inline object
useEffect(() => {
  doSomething();
}, [{ foo: 'bar' }]); // New object every render

// Array from map
const ids = items.map(i => i.id);
useEffect(() => {
  fetchByIds(ids);
}, [ids]); // New array every render

// Query data
const { data: user } = useQuery({ queryKey: ['user'] });
useEffect(() => {
  logUser(user);
}, [user]); // Reference changes on refetch
```

**Fix guide**: [fix-object-deps.md](fix-object-deps.md)

---

### 2. Self-Referential State Updates (~25%)

**Indicator**: Effect updates a state variable that is also in its dependency array.

**Recognition patterns**:

- Effect calls `setState(stateVar + 1)` and depends on `[stateVar]`
- Console logs show state value incrementing: 0, 1, 2, 3...
- Effect modifies the same data it listens to

**Examples**:

```typescript
// Counter loop
useEffect(() => {
  setCount(count + 1);
}, [count]); // Infinite: count changes → effect runs → count changes → repeat

// Data fetching loop
useEffect(() => {
  if (!data) {
    fetchData().then(setData);
  }
}, [data]); // If data changes → effect runs → data changes → repeat
```

**Fix guide**: [fix-self-referential.md](fix-self-referential.md)

---

### 3. Functions Recreated Each Render (~20%)

**Indicator**: Dependency is a function declared in the component body without memoization.

**Recognition patterns**:

- Dependency is a function: `const handleUpdate = () => {...}`
- Function is declared inside component (not in global scope or imported)
- Function is not wrapped with `useCallback`

**Examples**:

```typescript
// Function declared in component
function MyComponent() {
  const handleUpdate = () => {
    setState(data);
  };

  useEffect(() => {
    handleUpdate();
  }, [handleUpdate]); // New function reference every render
}

// Arrow function
const processData = () => transform(items);
useEffect(() => {
  processData();
}, [processData]); // Recreated every render
```

**Fix guide**: [fix-function-deps.md](fix-function-deps.md)

---

### 4. Missing Dependency Array (~10%)

**Indicator**: No second argument to `useEffect`, causing it to run on every render.

**Recognition patterns**:

- `useEffect(() => {...})` with no second argument
- Effect runs continuously even when nothing changed
- ESLint warning: "React Hook useEffect is missing a dependency array"

**Examples**:

```typescript
// No dependency array
useEffect(() => {
  setCount(count + 1); // Runs every render → triggers re-render → repeats
});

// Intentional omission (usually wrong)
useEffect(() => {
  fetchData();
}); // Fetches on every render
```

**Fix guide**: [fix-missing-deps.md](fix-missing-deps.md)

---

### 5. Inline Event Handlers (~5%)

**Indicator**: Event handler is called immediately during render instead of on user interaction.

**Recognition patterns**:

- `onClick={handleClick()}` with parentheses
- State update happens during render, not on event
- Console shows logs before any user interaction

**Examples**:

```typescript
// Called immediately
<button onClick={setCount(1)}>Click</button>
// Executes setCount(1) during render → triggers re-render → repeats

// Should be
<button onClick={() => setCount(1)}>Click</button>
```

**Fix guide**: [fix-inline-handlers.md](fix-inline-handlers.md)

---

## Classification Decision Tree

```
Which dependency is changing?
  │
  ├─ Is it an object or array?
  │  ├─ Yes → Category 1: Objects/Arrays as deps
  │  └─ No → Continue
  │
  ├─ Does the effect call setState on this dependency?
  │  ├─ Yes → Category 2: Self-referential state
  │  └─ No → Continue
  │
  ├─ Is it a function declared in component body?
  │  ├─ Yes → Category 3: Functions recreated
  │  └─ No → Continue
  │
  ├─ Is there no dependency array at all?
  │  ├─ Yes → Category 4: Missing dep array
  │  └─ No → Continue
  │
  └─ Is the error in render, not useEffect?
     ├─ Yes → Category 5: Inline handlers
     └─ No → Edge case - see advanced patterns
```

## Edge Cases and Combinations

### Combination: Multiple Unstable Dependencies

**Rare (~1%)**: Effect has both unstable object AND recreated function.

**Approach**: Fix each dependency separately:

1. First, fix object references (Category 1)
2. Then, fix function references (Category 3)
3. Verify loop is resolved

### Edge Case: Derived State Anti-Pattern

**Pattern**: Using `useEffect` to compute derived state.

```typescript
// Anti-pattern
useEffect(() => {
  setProcessed(transform(data));
}, [data]);
```

**Classification**: This is actually Category 2 (self-referential) but the FIX is different - use `useMemo` instead of `useEffect`.

**Fix guide**: [fix-object-deps.md](fix-object-deps.md) - Pattern 4: Replace useEffect with useMemo

### Edge Case: React Compiler Over-Optimization

**Pattern**: React Compiler (React 19+) aggressively memoizes, causing stale closures.

**Indicator**:

- Loop occurs ONLY in production build
- Works fine in development
- `'use memo'` directive is active

**Fix**: Opt out of React Compiler for this hook:

```typescript
'use no memo'; // At top of file

useEffect(() => {
  // ... your effect
}, [deps]);
```

---

## Verification Checklist

After classification, confirm:

- [ ] You've matched the pattern to one of the 5 categories
- [ ] The indicator patterns align with your observations
- [ ] You understand WHY this pattern causes infinite loops
- [ ] You know which fix guide to apply next

**Next**: Navigate to the appropriate fix guide and apply the solution.
