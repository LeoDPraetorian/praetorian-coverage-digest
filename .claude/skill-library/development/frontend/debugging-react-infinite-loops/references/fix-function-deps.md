# Fix Pattern: Functions Recreated Each Render

**Problem**: Functions declared in component body are recreated on every render, causing dependency changes.

## Root Cause

```typescript
function MyComponent() {
  const handleUpdate = () => { setState(data); };
  // New function instance created every render

  useEffect(() => {
    handleUpdate();
  }, [handleUpdate]); // Dependency changes every render → loop
}
```

---

## Fix Pattern 1: useCallback Memoization

**When to use**: Function needs to be passed to useEffect or child components.

### Before (Broken)

```typescript
function MyComponent({ userId }) {
  const fetchUser = () => {
    api.getUser(userId).then(setUser);
  };

  useEffect(() => {
    fetchUser();
  }, [fetchUser]); // New function every render
}
```

### After (Fixed)

```typescript
function MyComponent({ userId }) {
  const fetchUser = useCallback(() => {
    api.getUser(userId).then(setUser);
  }, [userId]); // Only recreate when userId changes

  useEffect(() => {
    fetchUser();
  }, [fetchUser]); // Stable reference
}
```

**Why it works**: `useCallback` returns same function reference until dependencies change.

---

## Fix Pattern 2: Move Function Inside Effect

**When to use**: Function is only used in one useEffect.

### Before (Broken)

```typescript
const processData = () => {
  return transform(items);
};

useEffect(() => {
  const result = processData();
  setResult(result);
}, [processData]); // Recreated every render
```

### After (Fixed)

```typescript
useEffect(() => {
  const processData = () => {
    return transform(items);
  };

  const result = processData();
  setResult(result);
}, [items]); // Function is inside, not a dependency
```

**Why it works**: Function isn't in dependency array. Only `items` matters.

---

## Fix Pattern 3: Hoist Function Outside Component

**When to use**: Function doesn't use component state/props.

### Before (Broken)

```typescript
function MyComponent() {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
  };

  useEffect(() => {
    const formatted = formatDate(timestamp);
    setFormatted(formatted);
  }, [formatDate, timestamp]); // formatDate recreated
}
```

### After (Fixed)

```typescript
// Outside component
const formatDate = (date) => {
  return new Date(date).toLocaleDateString();
};

function MyComponent() {
  useEffect(() => {
    const formatted = formatDate(timestamp);
    setFormatted(formatted);
  }, [timestamp]); // formatDate is stable
}
```

**Why it works**: Function outside component has stable reference across renders.

---

## Fix Pattern 4: Remove Function from Dependencies

**When to use**: Function doesn't actually need to be a dependency (ESLint might be wrong).

### Before (Broken)

```typescript
useEffect(() => {
  const handler = () => console.log('event');
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, [handler]); // handler is created inside effect, shouldn't be dep
```

### After (Fixed)

```typescript
useEffect(() => {
  const handler = () => console.log('event');
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []); // No dependencies needed
```

**Why it works**: Function created inside effect doesn't need to be in deps array.

---

## Verification

After fix, confirm:

- [ ] Effect no longer triggers on every render
- [ ] Function has stable reference (use React DevTools to check)
- [ ] `useCallback` dependencies are correct (no infinite loop from callback deps)
- [ ] No "Too many re-renders" error
