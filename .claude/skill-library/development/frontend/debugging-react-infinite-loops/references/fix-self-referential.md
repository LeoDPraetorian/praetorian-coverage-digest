# Fix Pattern: Self-Referential State Updates

**Problem**: Effect updates a state variable that's also in its dependency array, creating a feedback loop.

## Root Cause

```typescript
useEffect(() => {
  setCount(count + 1); // Updates count
}, [count]); // Depends on count

// Cycle: count changes → effect runs → setCount → count changes → repeat
```

---

## Fix Pattern 1: Functional State Updater

**When to use**: Effect needs to update state based on previous value.

### Before (Broken)

```typescript
useEffect(() => {
  setCount(count + 1);
}, [count]); // Infinite loop
```

### After (Fixed)

```typescript
useEffect(() => {
  setCount(prev => prev + 1); // Use functional updater
}, []); // Remove count from dependencies
```

**Why it works**: Functional updater (`prev => prev + 1`) doesn't need current state in closure.

---

## Fix Pattern 2: Add Conditional Guard

**When to use**: Effect should only update state when certain conditions are met.

### Before (Broken)

```typescript
useEffect(() => {
  if (!data) {
    fetchData().then(setData);
  }
}, [data]); // data changes → effect runs → data changes → repeat
```

### After (Fixed)

```typescript
useEffect(() => {
  if (!data) {
    fetchData().then(setData);
  }
}, []); // Only run on mount

// OR if you need to react to other deps:
useEffect(() => {
  if (!data && shouldFetch) {
    fetchData().then(setData);
  }
}, [shouldFetch]); // Controlled trigger
```

**Why it works**: Guard prevents unnecessary state updates. Empty array limits to mount only.

---

## Fix Pattern 3: Move State Outside Effect

**When to use**: State update doesn't actually need to be in useEffect.

### Before (Broken)

```typescript
useEffect(() => {
  setIsValid(value.length > 0);
}, [value, isValid]); // isValid in deps causes loop
```

### After (Fixed - Option A: Derived State)

```typescript
// No useEffect needed - compute during render
const isValid = value.length > 0;
```

### After (Fixed - Option B: useMemo)

```typescript
const isValid = useMemo(() => value.length > 0, [value]);
```

**Why it works**: Derived state doesn't need `useState` + `useEffect`. Compute it directly.

---

## Fix Pattern 4: Use useRef for Non-Reactive Updates

**When to use**: You need to track a value but don't want it to trigger re-renders.

### Before (Broken)

```typescript
const [renderCount, setRenderCount] = useState(0);

useEffect(() => {
  setRenderCount(prev => prev + 1);
}, [renderCount]); // Loop
```

### After (Fixed)

```typescript
const renderCount = useRef(0);

useEffect(() => {
  renderCount.current++;
  console.log('Render:', renderCount.current);
}, []); // Runs on every render but doesn't cause re-renders
```

**Why it works**: `useRef` updates don't trigger re-renders, breaking the cycle.

---

## Fix Pattern 5: Separate Concerns

**When to use**: Effect is trying to do too much.

### Before (Broken)

```typescript
useEffect(() => {
  const newData = transform(input);
  setData(newData);
  setProcessed(process(newData));
}, [input, data, processed]); // Multiple state updates
```

### After (Fixed)

```typescript
// Split into separate effects
useEffect(() => {
  setData(transform(input));
}, [input]); // Only depends on input

// Derived state instead of effect
const processed = useMemo(() => process(data), [data]);
```

**Why it works**: Each effect has single responsibility. Derived state eliminates second effect.

---

## Verification

After fix, confirm:

- [ ] State value no longer increments uncontrollably
- [ ] Effect runs only when intended (mount, or when specific deps change)
- [ ] Console logs show effect runs appropriate number of times
- [ ] No "Too many re-renders" error
