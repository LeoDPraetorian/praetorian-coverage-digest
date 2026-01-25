# Fix Pattern: Missing Dependency Array

**Problem**: `useEffect` without second argument runs on every render.

## Root Cause

```typescript
useEffect(() => {
  setCount(count + 1); // Runs on every render
}); // No dependency array!
// Cycle: render → effect → setCount → render → repeat
```

---

## Fix Pattern 1: Add Empty Array for Mount-Only

**When to use**: Effect should run only once on component mount.

### Before (Broken)

```typescript
useEffect(() => {
  fetchInitialData();
}); // Runs on every render
```

### After (Fixed)

```typescript
useEffect(() => {
  fetchInitialData();
}, []); // Runs only on mount
```

**Why it works**: Empty array `[]` means "no dependencies" → effect runs once.

---

## Fix Pattern 2: Add Specific Dependencies

**When to use**: Effect should run when certain values change.

### Before (Broken)

```typescript
useEffect(() => {
  fetchUser(userId);
}); // Runs on every render, even when userId hasn't changed
```

### After (Fixed)

```typescript
useEffect(() => {
  fetchUser(userId);
}, [userId]); // Runs only when userId changes
```

**Why it works**: Effect only re-runs when `userId` actually changes.

---

## Fix Pattern 3: Respect ESLint exhaustive-deps

**When to use**: ESLint warns about missing dependencies.

### Before (Broken)

```typescript
useEffect(() => {
  processData(items, config);
}, []); // ESLint: React Hook useEffect has missing dependencies
```

### After (Fixed)

```typescript
useEffect(() => {
  processData(items, config);
}, [items, config]); // All dependencies listed
```

**Important**: If adding deps causes loops, you have a different problem (likely Category 1 or 3). Fix those first.

---

## Verification

After fix, confirm:

- [ ] Effect no longer runs on every render
- [ ] No ESLint warnings about missing dependencies
- [ ] Effect runs at intended times (mount, or when deps change)
- [ ] No "Too many re-renders" error
