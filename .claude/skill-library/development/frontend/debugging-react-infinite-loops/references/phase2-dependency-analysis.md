# Phase 2: Identify Which Dependency is Changing

**Goal**: Determine which value in the dependency array is causing the effect to re-run.

## Method 1: Console Logging Dependencies

**Most direct approach:**

### Basic Logging

```typescript
useEffect(() => {
  console.log('Effect triggered', {
    dep1,
    dep2,
    dep3,
    timestamp: Date.now()
  });

  // Your effect logic here
}, [dep1, dep2, dep3]);
```

**What to look for:**

- Console floods with identical-looking logs → One dependency is changing reference
- Values appear the same but logs keep firing → Object/array reference instability
- One value increments → Self-referential state update

### Enhanced Logging with Previous Values

```typescript
import { useRef } from 'react';

function YourComponent() {
  const prevDepsRef = useRef({ dep1: null, dep2: null });

  useEffect(() => {
    console.log('Dependencies changed:', {
      current: { dep1, dep2 },
      previous: prevDepsRef.current,
      dep1Changed: prevDepsRef.current.dep1 !== dep1,
      dep2Changed: prevDepsRef.current.dep2 !== dep2,
    });

    prevDepsRef.current = { dep1, dep2 };

    // Your effect logic
  }, [dep1, dep2]);
}
```

**Interpretation:**

```
// Output showing object reference change despite identical content:
Dependencies changed: {
  current: { dep1: { foo: 'bar' }, dep2: 5 },
  previous: { dep1: { foo: 'bar' }, dep2: 5 },
  dep1Changed: true,   // ← Object reference changed
  dep2Changed: false   // ← Primitive stable
}
```

## Method 2: Object Deep Comparison

**Use when objects/arrays are suspected:**

```typescript
import { useRef } from 'react';

function YourComponent() {
  const prevObjectRef = useRef(myObject);

  useEffect(() => {
    const referenceChanged = prevObjectRef.current !== myObject;
    const contentChanged = JSON.stringify(prevObjectRef.current) !== JSON.stringify(myObject);

    console.log('Object analysis:', {
      referenceChanged,  // true = new object instance
      contentChanged,    // true = actual data changed
    });

    if (referenceChanged && !contentChanged) {
      console.warn('⚠️ Object reference changed but content identical - use useMemo or extract primitive');
    }

    prevObjectRef.current = myObject;
  }, [myObject]);
}
```

**Diagnosis:**

| referenceChanged | contentChanged | Cause                          | Fix                       |
| ---------------- | -------------- | ------------------------------ | ------------------------- |
| true             | true           | Object actually changed        | Expected behavior         |
| true             | false          | New object, same content       | `useMemo` or extract      |
| false            | false          | No change                      | Should not trigger effect |
| false            | true           | Impossible (reference is hash) | N/A                       |

## Method 3: Isolate Dependencies One by One

**Use when multiple dependencies are suspected:**

### Systematic Elimination

```typescript
// Original (multiple deps)
useEffect(() => {
  doSomething();
}, [dep1, dep2, dep3]);

// Test 1: Only dep1
useEffect(() => {
  doSomething();
}, [dep1]); // Does loop persist?

// Test 2: Only dep2
useEffect(() => {
  doSomething();
}, [dep2]); // Does loop persist?

// Test 3: Only dep3
useEffect(() => {
  doSomething();
}, [dep3]); // Does loop persist?
```

**Interpretation:**

- Loop persists with `[dep1]` but not `[dep2]` or `[dep3]` → `dep1` is the culprit
- Loop persists with multiple deps → Multiple unstable dependencies (rare)

## Method 4: React DevTools Component Inspector

**Visual dependency tracking:**

1. Open React DevTools
2. Select the component with the problematic `useEffect`
3. Click "Hooks" in the right panel
4. Watch which hook values change with each render:
   - State values incrementing → Self-referential update
   - Object references changing → Reference instability
   - Values identical but hook re-runs → Dependency array issue

## Common Patterns to Recognize

### Pattern 1: TanStack Query Data Instability

```typescript
const { data: items } = useQuery({ queryKey: ['items'] });

useEffect(() => {
  processItems(items);
}, [items]); // 'items' reference changes on every query refetch
```

**Recognition**: `items` appears in logs with same content but different reference.

**Fix**: Configure query with `staleTime` or extract specific fields:

```typescript
const itemIds = items?.map(i => i.id).join(',');
useEffect(() => {
  processItems(items);
}, [itemIds]); // String is stable
```

### Pattern 2: Inline Object Creation

```typescript
useEffect(() => {
  fetchData({ filter: 'active' });
}, [{ filter: 'active' }]); // New object every render
```

**Recognition**: Dependency is an object literal in the array itself.

**Fix**: Extract to variable or use primitive:

```typescript
const filter = 'active';
useEffect(() => {
  fetchData({ filter });
}, [filter]);
```

### Pattern 3: Function Dependency

```typescript
const handleUpdate = () => { setState(data); };
useEffect(() => {
  handleUpdate();
}, [handleUpdate]); // New function every render
```

**Recognition**: Dependency is a function declared in component body.

**Fix**: Wrap with `useCallback`:

```typescript
const handleUpdate = useCallback(() => {
  setState(data);
}, [data]);
```

## Verification Checklist

After dependency analysis, confirm:

- [ ] You've identified which specific dependency changes
- [ ] You understand whether it's a reference change or value change
- [ ] You've logged both current and previous values
- [ ] You can reproduce the pattern consistently

**Next**: Proceed to [Phase 3: Classification](phase3-classification.md) to match the pattern to a root cause category.
