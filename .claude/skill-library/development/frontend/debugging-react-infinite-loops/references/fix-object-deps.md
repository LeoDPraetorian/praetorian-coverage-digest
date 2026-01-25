# Fix Pattern: Objects/Arrays as Dependencies

**Problem**: Objects and arrays are compared by reference in React. Even if content is identical, creating a new instance triggers the effect.

## Root Cause

React uses `Object.is()` (shallow comparison) for dependency checking:

```typescript
// These are different references even though content is identical
const obj1 = { foo: 'bar' };
const obj2 = { foo: 'bar' };
Object.is(obj1, obj2); // false

// But primitives with same value are equal
Object.is('bar', 'bar'); // true
Object.is(5, 5); // true
```

**Result**: Every render creates new object → dependency changes → effect runs → render → repeat.

---

## Fix Pattern 1: Extract Primitive Values

**When to use**: Object has stable primitive fields you actually need.

### Before (Broken)

```typescript
const user = { name: 'Alice', id: 123 };

useEffect(() => {
  fetchUserData(user);
}, [user]); // New object every render
```

### After (Fixed)

```typescript
const user = { name: 'Alice', id: 123 };
const userId = user.id; // Extract primitive

useEffect(() => {
  fetchUserData(user); // Can still use full object
}, [userId]); // Primitive is stable
```

**Why it works**: `123 === 123` is always true. No reference comparison needed.

---

## Fix Pattern 2: useMemo for Computed Objects

**When to use**: Object is computed from other values.

### Before (Broken)

```typescript
function MyComponent({ threshold }) {
  const config = { threshold, enabled: true }; // New object every render

  useEffect(() => {
    processData(config);
  }, [config]); // Infinite loop
}
```

### After (Fixed)

```typescript
function MyComponent({ threshold }) {
  const config = useMemo(
    () => ({ threshold, enabled: true }),
    [threshold] // Only recreate if threshold changes
  );

  useEffect(() => {
    processData(config);
  }, [config]); // Stable reference
}
```

**Why it works**: `useMemo` returns the same object reference until dependencies change.

---

## Fix Pattern 3: Serialize Object to String

**When to use**: Object is complex but you need to detect content changes.

### Before (Broken)

```typescript
const filters = { status: 'active', category: 'tech' };

useEffect(() => {
  fetchItems(filters);
}, [filters]); // New object every render
```

### After (Fixed - Option A: Serialize)

```typescript
const filters = { status: 'active', category: 'tech' };
const filtersKey = JSON.stringify(filters);

useEffect(() => {
  fetchItems(filters);
}, [filtersKey]); // String comparison
```

**After (Fixed - Option B: Extract primitives)**

```typescript
const filters = { status: 'active', category: 'tech' };

useEffect(() => {
  fetchItems(filters);
}, [filters.status, filters.category]); // Primitive values
```

**Option A vs B**: Option B is more efficient (no serialization cost), use when practical.

---

## Fix Pattern 4: Replace useEffect + setState with useMemo

**When to use**: You're using `useEffect` to compute derived data.

### Before (Broken - Derived State Anti-Pattern)

```typescript
const [processed, setProcessed] = useState([]);

useEffect(() => {
  const result = transform(data);
  setProcessed(result);
}, [data]); // Can cause loops if transform uses state
```

### After (Fixed)

```typescript
const processed = useMemo(() => transform(data), [data]);
// No state, no useEffect, no loop
```

**Why it works**: Derived data doesn't need state. Computing it during render is more efficient and eliminates the loop risk.

---

## Fix Pattern 5: TanStack Query Reference Stability

**When to use**: Data from TanStack Query changes reference on refetch.

### Before (Broken)

```typescript
const { data: items } = useQuery({
  queryKey: ['items'],
});

useEffect(() => {
  processItems(items);
}, [items]); // Reference changes on refetch, even if data identical
```

### After (Fixed - Option A: Configure Query)

```typescript
const { data: items } = useQuery({
  queryKey: ['items'],
  staleTime: 60000, // 60 seconds before marking stale
  refetchOnWindowFocus: false, // Don't refetch on window focus
  refetchOnMount: false, // Don't refetch if data exists
});

useEffect(() => {
  processItems(items);
}, [items]); // Less frequent reference changes
```

### After (Fixed - Option B: Extract Stable Identifier)

```typescript
const { data: items } = useQuery({
  queryKey: ['items'],
});

const itemsKey = items?.map(i => i.id).join(',') || '';

useEffect(() => {
  if (items) processItems(items);
}, [itemsKey]); // String is stable
```

### After (Fixed - Option C: Structural Sharing)

```typescript
const { data: items } = useQuery({
  queryKey: ['items'],
  structuralSharing: true, // Deep compare, reuse if identical
});

useEffect(() => {
  processItems(items);
}, [items]); // TanStack returns same reference if data unchanged
```

**Recommendation**: Option C is best for most cases. Option B for fine-grained control.

---

## Fix Pattern 6: Array Dependencies

**When to use**: Array is recreated on every render.

### Before (Broken)

```typescript
const selectedIds = items.filter(i => i.selected).map(i => i.id);

useEffect(() => {
  fetchDetails(selectedIds);
}, [selectedIds]); // New array every render
```

### After (Fixed - Option A: useMemo)

```typescript
const selectedIds = useMemo(
  () => items.filter(i => i.selected).map(i => i.id),
  [items]
);

useEffect(() => {
  fetchDetails(selectedIds);
}, [selectedIds]); // Stable reference
```

### After (Fixed - Option B: Serialize to String)

```typescript
const selectedIds = items.filter(i => i.selected).map(i => i.id);
const selectedIdsKey = selectedIds.join(',');

useEffect(() => {
  fetchDetails(selectedIds);
}, [selectedIdsKey]); // String comparison
```

**Option A vs B**: Use A when array is expensive to compute. Use B for simple arrays.

---

## Common Mistakes

### Mistake 1: Memoizing Inside useEffect

❌ **Wrong**:

```typescript
useEffect(() => {
  const config = useMemo(() => ({ foo: 'bar' }), []);
  // ...
}, [config]); // config is undefined in dependency array
```

✅ **Right**:

```typescript
const config = useMemo(() => ({ foo: 'bar' }), []);
useEffect(() => {
  // ...
}, [config]);
```

### Mistake 2: useMemo with Unstable Dependencies

❌ **Wrong**:

```typescript
const config = useMemo(
  () => ({ threshold }),
  [{ threshold }] // Still passing object to useMemo deps!
);
```

✅ **Right**:

```typescript
const config = useMemo(
  () => ({ threshold }),
  [threshold] // Primitive dependency
);
```

### Mistake 3: Over-Memoization

❌ **Wrong** (unnecessary):

```typescript
const userId = useMemo(() => user.id, [user]);
// Extracting primitive from object doesn't need useMemo
```

✅ **Right**:

```typescript
const userId = user.id;
// Simple property access is cheap, no memo needed
```

---

## Verification

After applying fix, confirm:

- [ ] Console no longer floods with effect logs
- [ ] React DevTools Profiler shows stable render count
- [ ] Error "Too many re-renders" is gone
- [ ] Component behavior is still correct

**If loop persists**: Dependency might fall under a different category - return to [Phase 2](phase2-dependency-analysis.md) to re-analyze.
