# Phase 1: Isolate the Problematic useEffect

**Goal**: Identify which specific `useEffect` hook is causing the infinite loop.

## Method 1: Stack Trace Analysis

**Fastest approach when error provides line number:**

1. Check browser console error message:
   ```
   Error: Too many re-renders. React limits the number of renders to prevent an infinite loop.
   ```

2. Look for stack trace showing file and line number:
   ```
   at useClusterManagement.ts:894
   ```

3. Navigate to that line in your code
4. Identify which `useEffect` contains or is near that line

**Success criteria**: You've identified the specific `useEffect` hook.

## Method 2: Binary Elimination

**Use when stack trace is unclear or points to framework code:**

### Step-by-Step Binary Search

1. **Count your useEffect hooks**:
   ```bash
   grep -n "useEffect" YourComponent.tsx
   ```

2. **Comment out half**:
   ```typescript
   // useEffect(() => { ... }, [dep1]);
   // useEffect(() => { ... }, [dep2]);
   useEffect(() => { ... }, [dep3]); // Keep this half active
   useEffect(() => { ... }, [dep4]);
   ```

3. **Test**:
   - If error persists → Problem is in active half
   - If error gone → Problem is in commented half

4. **Repeat** on the problematic half until you isolate one `useEffect`

5. **Verification**:
   ```typescript
   // Comment out the suspected useEffect
   // useEffect(() => { ... }, [suspectedDeps]);
   ```
   - Error should disappear
   - Uncomment it → Error returns

### Example

```typescript
// You have 4 useEffect hooks causing freeze
useEffect(() => fetchData(), [query]);        // Hook A
useEffect(() => updateUI(), [data]);          // Hook B
useEffect(() => syncState(), [filters]);      // Hook C
useEffect(() => detectClusters(), [clusters]); // Hook D

// Test 1: Comment A, B (keep C, D active)
// Result: Error persists → Problem in C or D

// Test 2: Comment C (keep D active)
// Result: Error persists → Problem is in D

// Isolated: Hook D causes the infinite loop
```

## Method 3: Add Render Counter

**Use to confirm which component is re-rendering infinitely:**

```typescript
import { useRef } from 'react';

function YourComponent() {
  const renderCount = useRef(0);
  renderCount.current++;
  console.log('Component rendered:', renderCount.current);

  // Your useEffect hooks here
}
```

**Interpretation:**

- Render count increases rapidly (10, 20, 50, 100...) → Infinite loop
- Check console to see which `useEffect` is logging right before count increases
- This narrows down the problematic hook

## Method 4: React DevTools Profiler

**Visual approach for complex components:**

1. Open React DevTools
2. Go to Profiler tab
3. Click "Record" (blue circle)
4. Trigger the error (refresh page or interact with component)
5. Click "Stop" after ~2 seconds
6. Look for:
   - Component with extremely high render count (50+)
   - Timeline showing continuous rendering cycles
   - Flamegraph showing which component is hottest

7. Click on the problematic component
8. Check "Why did this render?" panel
9. Look at which props/state are changing

**Advantage**: Visual representation of render cascade

## Verification Checklist

After isolation, confirm:

- [ ] You've identified the exact `useEffect` hook (not just the component)
- [ ] Commenting it out eliminates the error
- [ ] Uncommenting it brings the error back
- [ ] You know which line number it's on

**Next**: Proceed to [Phase 2: Dependency Analysis](phase2-dependency-analysis.md) to identify which dependency is changing.
