# Debugging Guide: React Hooks Infinite Loops

**Step-by-step guide to identifying and fixing infinite loop bugs using React DevTools, console logging, and debugging techniques.**

---

## Quick Diagnosis Workflow

When you suspect an infinite loop:

1. **Confirm the loop** - Add console.log at effect start
2. **Identify the culprit dependency** - Log each dependency
3. **Check reference stability** - Compare logged references
4. **Apply appropriate pattern** - useRef, useMemo, or restructure
5. **Verify the fix** - Remove logs, test thoroughly

---

## Step 1: Confirm the Loop

### Symptoms of Infinite Loops

**Browser Symptoms**:
- Browser tab freezes or becomes unresponsive
- CPU usage spikes to 100%
- Browser shows "Page Unresponsive" warning
- DevTools console flooded with identical logs

**React Error Messages**:
```
Warning: Maximum update depth exceeded. This can happen when a component
calls setState inside useEffect, but useEffect either doesn't have a
dependency array, or one of the dependencies changes on every render.
```

### Add Diagnostic Logging

```typescript
function Component({ items }) {
  console.log('Component render'); // Tracks render count

  useEffect(() => {
    console.log('Effect running'); // Should only run when intended
    processItems(items);
  }, [items]);

  return <div>...</div>;
}
```

**What to look for**:
- "Component render" appearing rapidly (>10 times/second)
- "Effect running" appearing after each render
- Logs continuing indefinitely

---

## Step 2: Identify the Culprit Dependency

### Log Each Dependency with Reference Identity

```typescript
function Component({ user, items, config }) {
  useEffect(() => {
    console.log('Effect running with:', {
      user,
      items,
      config,
      // Log reference identity to see if objects are new
      userRef: user,
      itemsRef: items,
      configRef: config
    });

    // Your effect logic
  }, [user, items, config]);
}
```

### Advanced: Track Reference Changes

```typescript
function Component({ user, items }) {
  const prevUserRef = useRef();
  const prevItemsRef = useRef();

  useEffect(() => {
    console.log('User changed:', prevUserRef.current !== user);
    console.log('Items changed:', prevItemsRef.current !== items);
    console.log('User same content?',
      JSON.stringify(prevUserRef.current) === JSON.stringify(user)
    );

    prevUserRef.current = user;
    prevItemsRef.current = items;
  }, [user, items]);
}
```

**Output example**:
```
User changed: true
Items changed: true
User same content? true  ← Same values, different reference!
```

---

## Step 3: React DevTools Profiling

### Setting Up React DevTools

1. Install [React Developer Tools](https://chrome.google.com/webstore/detail/react-developer-tools/) browser extension
2. Open DevTools (F12 or Cmd+Option+I)
3. Navigate to "Profiler" tab

### Recording a Profiling Session

**Workflow**:
1. Click "Record" button (red circle)
2. Interact with the component (trigger the suspected loop)
3. Click "Stop" button after 2-3 seconds
4. Analyze the flame chart

**What to look for**:

**Flame Chart Analysis**:
- **Wide bars**: Components that rendered for a long time
- **Yellow bars**: Slow renders (>12ms)
- **Repeated renders**: Same component stacked vertically

**Ranked Chart**:
- Components sorted by total render time
- Identify components rendering most frequently

**Component Details**:
- Click on a component in the flame chart
- Right sidebar shows:
  - Why component rendered ("Hooks changed", "Props changed", "State changed")
  - Render duration
  - Number of times rendered in session

### Example: Identifying Hook Changes

```
Component: UserProfile
Rendered: 847 times (!!!)
Why: Hooks changed
  • Hook 3 changed
  • Hook 5 changed
```

**Interpretation**: Hooks at index 3 and 5 (likely useState or useEffect) are changing on every render.

**Limitation**: React DevTools shows hook *index*, not semantic name. You must count hooks in your component to identify which one.

---

## Step 4: Using why-did-you-render for Deep Debugging

### Installation

```bash
npm install --save-dev @welldone-software/why-did-you-render
```

### Setup (Development Only)

```javascript
// src/wdyr.js
import React from 'react';

if (process.env.NODE_ENV === 'development') {
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: true,
    trackHooks: true,
    trackExtraHooks: [[require('react-redux/lib'), 'useSelector']]
  });
}
```

```javascript
// src/index.js (import at very top)
import './wdyr'; // Must be first import
import React from 'react';
import ReactDOM from 'react-dom';
// ... rest of imports
```

### Annotating Components for Tracking

```typescript
function UserProfile({ user }) {
  useEffect(() => {
    fetchUserData(user.id);
  }, [user]);

  return <div>...</div>;
}

// Enable tracking for this component
UserProfile.whyDidYouRender = true;
```

### Reading why-did-you-render Output

**Example Output**:
```
UserProfile:
  Re-rendered because of hook changes:
    different objects that are equal by value.

  prevHook:
    {id: 123, name: "Alice"}

  nextHook:
    {id: 123, name: "Alice"}  ← Same values!

  Suggestion: Use useMemo or serialize the object
```

**Interpretation**: The `user` object has the same content but different reference, causing unnecessary re-render.

---

## Step 5: Common Patterns and Fixes

### Pattern 1: Object Reference Instability

**Diagnosis**:
```typescript
// why-did-you-render output:
// "different objects that are equal by value"
```

**Fix**:
```typescript
// Before (unstable)
function Parent() {
  const config = { api: '/endpoint' }; // New object each render
  return <Child config={config} />;
}

// After (stable)
function Parent() {
  const config = useMemo(() => ({ api: '/endpoint' }), []);
  return <Child config={config} />;
}
```

---

### Pattern 2: Array Reference Instability

**Diagnosis**:
```typescript
// Console log shows:
// Items changed: true
// Items same content? true
```

**Fix**:
```typescript
// Before (unstable)
function Component({ items }) {
  useEffect(() => {
    process(items);
  }, [items]); // items might be new array each time
}

// After (stable with serialization)
function Component({ items }) {
  const itemsKey = useMemo(
    () => items.map(i => i.id).sort().join(','),
    [items]
  );

  useEffect(() => {
    process(items);
  }, [itemsKey]); // String comparison, stable
}
```

---

### Pattern 3: Callback Instability

**Diagnosis**:
```typescript
// React DevTools: "Hook 2 changed" every render
// Hook 2 is your useCallback
```

**Fix**:
```typescript
// Before (unstable callback in deps)
function Component({ onUpdate }) {
  useEffect(() => {
    const interval = setInterval(() => {
      onUpdate();
    }, 1000);
    return () => clearInterval(interval);
  }, [onUpdate]); // onUpdate might be new function each time
}

// After (stable with ref)
function Component({ onUpdate }) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate; // Always latest

  useEffect(() => {
    const interval = setInterval(() => {
      onUpdateRef.current();
    }, 1000);
    return () => clearInterval(interval);
  }, []); // Empty deps, stable
}
```

---

## Step 6: Verification

### Checklist Before Removing Debug Code

- [ ] Console logs no longer show rapid re-renders
- [ ] React DevTools shows reasonable render count (<10 for typical interaction)
- [ ] Browser CPU usage returns to normal
- [ ] No "Maximum update depth" errors
- [ ] why-did-you-render shows no avoidable re-renders
- [ ] Effect runs only when logically expected (test different scenarios)

### Regression Testing

```typescript
// Add a render counter in development
function Component({ items }) {
  const renderCount = useRef(0);
  renderCount.current++;

  if (process.env.NODE_ENV === 'development') {
    console.log(`Component rendered ${renderCount.current} times`);

    // Alert if renders exceed threshold
    if (renderCount.current > 50) {
      console.error('WARNING: Excessive renders detected!');
    }
  }

  // Component logic...
}
```

---

## Advanced Debugging Techniques

### Technique 1: Dependency Array Comparison

Create a custom hook to compare dependency changes:

```typescript
function useTraceUpdate(props) {
  const prev = useRef(props);

  useEffect(() => {
    const changedProps = Object.entries(props).reduce((acc, [key, val]) => {
      if (prev.current[key] !== val) {
        acc[key] = {
          from: prev.current[key],
          to: val
        };
      }
      return acc;
    }, {});

    if (Object.keys(changedProps).length > 0) {
      console.log('Changed props:', changedProps);
    }

    prev.current = props;
  });
}

// Usage
function Component(props) {
  useTraceUpdate(props); // Logs which props changed
  // Component logic...
}
```

---

### Technique 2: Render Counter with Threshold Alerts

```typescript
function useRenderAlert(componentName, threshold = 50) {
  const renderCount = useRef(0);
  renderCount.current++;

  useEffect(() => {
    if (renderCount.current > threshold) {
      console.error(
        `${componentName} rendered ${renderCount.current} times! Possible infinite loop.`
      );
      // In production, you might send to error tracking service
    }
  });
}

// Usage
function Component() {
  useRenderAlert('Component', 50);
  // Component logic...
}
```

---

### Technique 3: Dependency Deep Comparison

```typescript
import fastDeepEqual from 'fast-deep-equal';

function useDeepCompareEffect(callback, dependencies) {
  const currentDependenciesRef = useRef();

  if (!fastDeepEqual(currentDependenciesRef.current, dependencies)) {
    currentDependenciesRef.current = dependencies;
  }

  useEffect(callback, [currentDependenciesRef.current]);
}

// Usage: Deep compare objects instead of reference compare
function Component({ complexObject }) {
  useDeepCompareEffect(() => {
    console.log('Complex object actually changed');
  }, [complexObject]);
}
```

---

## Tooling Comparison

| Tool | Best For | Limitations | Setup Time |
|------|----------|-------------|------------|
| **Console.log** | Quick diagnosis, initial investigation | Manual, clutters console | 1 minute |
| **React DevTools** | Visual profiling, render tree analysis | Doesn't show semantic hook names | 5 minutes |
| **why-did-you-render** | Deep hook analysis, exact change identification | Development-only, adds overhead | 15 minutes |
| **Custom hooks** | Automated monitoring, CI integration | Requires maintenance | 30 minutes |

---

## Case Study: Real-World Bug

**Scenario**: UserProfile component re-rendering infinitely

**Initial Symptoms**:
- Browser freezes when navigating to profile page
- Console flooded with "Effect running" logs

**Debugging Steps**:

1. **Console logging confirmed loop**:
   ```typescript
   useEffect(() => {
     console.log('Effect running'); // Appeared 1000+ times
   }, [user]);
   ```

2. **Reference check revealed problem**:
   ```typescript
   console.log('User changed:', prevUser !== user); // Always true
   console.log('User values same?',
     JSON.stringify(prevUser) === JSON.stringify(user)
   ); // Always true
   ```

3. **Traced to parent component**:
   ```typescript
   function App() {
     const user = { id: 123, name: 'Alice' }; // New object each render!
     return <UserProfile user={user} />;
   }
   ```

4. **Applied fix**:
   ```typescript
   function App() {
     const user = useMemo(() => ({ id: 123, name: 'Alice' }), []);
     return <UserProfile user={user} />;
   }
   ```

5. **Verified fix**:
   - Console logs stopped
   - React DevTools showed 1 render instead of 1000+
   - Browser performance normal

---

## Prevention Strategies

To avoid debugging infinite loops:

1. **Enable ESLint exhaustive-deps rule** - Catches most issues before runtime
2. **Use why-did-you-render in development** - Proactive detection
3. **Code review checklist** - Verify dependency arrays
4. **Profiling as habit** - Regular React DevTools profiling sessions
5. **Render counters in development** - Alert on excessive renders

---

## Sources

- [React DevTools Documentation](https://react.dev/learn/react-developer-tools)
- [why-did-you-render GitHub](https://github.com/welldone-software/why-did-you-render)
- [Debugging React Performance - Kent C. Dodds](https://kentcdodds.com/blog/profile-a-react-app-for-performance)
- [LogRocket: React DevTools Profiler](https://blog.logrocket.com/debug-react-apps-react-devtools-profiler/)

---

**Last Updated**: 2026-01-14
**Confidence**: 0.92
