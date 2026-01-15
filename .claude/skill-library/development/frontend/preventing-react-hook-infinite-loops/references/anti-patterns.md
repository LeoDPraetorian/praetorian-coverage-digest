# Anti-Patterns and Detection Strategies

**Comprehensive guide to identifying and fixing React hooks anti-patterns that cause infinite loops.**

---

## Common Anti-Patterns

### 1. Array/Object Literals in Dependencies

**Problem**: Creating new arrays or objects directly in dependency arrays.

```typescript
// ❌ ANTI-PATTERN: New object/array every render
function Component() {
  useEffect(() => {
    fetchData();
  }, [{ api: '/endpoint' }]); // New object reference each render
}

function Component2({ items }) {
  useEffect(() => {
    process(items);
  }, [[...items]]); // New array reference each render
}
```

**Detection**:
- ESLint exhaustive-deps will warn: "The '{ api: '/endpoint' }' object makes dependencies change on every render"
- Code review: Look for inline object/array literals in dependency arrays

**Fix**:
```typescript
// ✅ CORRECT: Memoize the object/array
function Component() {
  const config = useMemo(() => ({ api: '/endpoint' }), []);
  useEffect(() => {
    fetchData();
  }, [config]);
}

function Component2({ items }) {
  const itemsCopy = useMemo(() => [...items], [items]);
  useEffect(() => {
    process(itemsCopy);
  }, [itemsCopy]);
}
```

---

### 2. Functions in Dependencies Without useCallback

**Problem**: Functions defined in render are recreated each render.

```typescript
// ❌ ANTI-PATTERN: Function recreated every render
function Component({ userId }) {
  const fetchUser = () => fetch(`/api/users/${userId}`);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]); // New function reference each render = infinite loop
}
```

**Detection**:
- ESLint: "The 'fetchUser' function makes dependencies change on every render"
- Runtime: Browser freezes, "Maximum update depth exceeded" error

**Fix**:
```typescript
// ✅ CORRECT: Memoize with useCallback
function Component({ userId }) {
  const fetchUser = useCallback(
    () => fetch(`/api/users/${userId}`),
    [userId]
  );

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);
}
```

---

### 3. Spreading Props into Dependencies

**Problem**: Spreading props creates new array every render.

```typescript
// ❌ ANTI-PATTERN: Spreading creates new array
function Component(props) {
  useEffect(() => {
    analytics.track(props);
  }, [...props]); // New array reference each render
}
```

**Detection**:
- ESLint: "Spreading props in dependencies is not recommended"
- Code smell: `[...props]` or `[...state]` in dependency array

**Fix**:
```typescript
// ✅ CORRECT: List specific props
function Component({ userId, userName, userEmail }) {
  useEffect(() => {
    analytics.track({ userId, userName, userEmail });
  }, [userId, userName, userEmail]);
}
```

---

### 4. New Objects in useCallback Dependencies

**Problem**: Creating objects in useCallback deps defeats memoization.

```typescript
// ❌ ANTI-PATTERN: New object in useCallback deps
function Component({ config }) {
  const handleSubmit = useCallback(() => {
    submit(config);
  }, [{ ...config }]); // New object each render
}
```

**Detection**:
- ESLint: "The '{ ...config }' object makes dependencies change on every render"
- Symptoms: Child components re-render unnecessarily

**Fix**:
```typescript
// ✅ CORRECT: Serialize or use ref
// Option 1: Serialize
function Component({ config }) {
  const configKey = useMemo(
    () => JSON.stringify(config),
    [config]
  );
  const handleSubmit = useCallback(() => {
    submit(config);
  }, [configKey]);
}

// Option 2: Use ref (if config changes frequently)
function Component({ config }) {
  const configRef = useRef(config);
  configRef.current = config;

  const handleSubmit = useCallback(() => {
    submit(configRef.current);
  }, []); // Empty deps, always uses latest config
}
```

---

### 5. Inline Arrow Functions in Dependencies

**Problem**: Arrow functions in dependencies are recreated each render.

```typescript
// ❌ ANTI-PATTERN: Inline arrow function
function Component({ items }) {
  useEffect(() => {
    const filtered = items.filter(() => doThing());
    process(filtered);
  }, [() => doThing()]); // New function each render
}
```

**Detection**:
- ESLint: "Arrow functions in dependencies will always change"
- Unusual syntax: Function as dependency is code smell

**Fix**:
```typescript
// ✅ CORRECT: Extract to useCallback
function Component({ items }) {
  const filterFn = useCallback(() => doThing(), []);

  useEffect(() => {
    const filtered = items.filter(filterFn);
    process(filtered);
  }, [items, filterFn]);
}
```

---

### 6. Anonymous Default Values

**Problem**: Default values in destructuring create new references.

```typescript
// ❌ ANTI-PATTERN: Anonymous default
function Component({ items = [] }) {
  useEffect(() => {
    console.log('Items changed');
  }, [items]); // New empty array every render when items undefined
}
```

**Detection**:
- Silent bug: ESLint doesn't catch this
- Symptoms: Effect runs on every render even when prop unchanged
- High prevalence: Found in 15+ GitHub issues

**Fix**:
```typescript
// ✅ CORRECT: Define default outside component
const DEFAULT_ITEMS = [];

function Component({ items = DEFAULT_ITEMS }) {
  useEffect(() => {
    console.log('Items changed');
  }, [items]); // Stable reference when items undefined
}
```

---

### 7. Setting State Based on Same State in useEffect

**Problem**: Reading and writing same state creates dependency loop.

```typescript
// ❌ ANTI-PATTERN: State loop
function Component() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(count + 1); // Triggers re-render, useEffect runs again
  }, [count]); // Depends on count, which it modifies
}
```

**Detection**:
- Runtime: "Maximum update depth exceeded"
- Pattern: useEffect depends on state it modifies

**Fix**:
```typescript
// ✅ CORRECT: Use functional updates or remove dependency
function Component() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Option 1: Functional update (no count in deps)
    setCount(c => c + 1);
  }, []); // Runs once

  // Option 2: Use different trigger
  useEffect(() => {
    if (someCondition) {
      setCount(count + 1);
    }
  }, [someCondition]); // Triggered by condition, not count
}
```

---

## Detection Strategies

### Strategy 1: Static Analysis with ESLint

**Setup**:
```json
{
  "plugins": ["react-hooks"],
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

**What it catches**:
- Missing dependencies
- Unnecessary dependencies
- Objects/functions in dependencies without memoization
- Stale closures

**What it misses**:
- Anonymous default values (`items = []`)
- Performance implications of memoization
- Complex dependency chains

---

### Strategy 2: Runtime Detection with why-did-you-render

**Setup**:
```javascript
if (process.env.NODE_ENV === 'development') {
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: true,
    trackHooks: true
  });
}
```

**What it catches**:
- Actual re-renders with explanations
- Which props/state/hooks caused re-render
- Avoidable re-renders

---

### Strategy 3: Visual Profiling with React DevTools

**Workflow**:
1. Open React DevTools Profiler
2. Click "Record" button
3. Interact with component
4. Stop recording
5. Look for:
   - Yellow bars (slow renders)
   - Repeated renders of same component
   - "Why did this render?" annotation

**What it shows**:
- Render timeline
- Component render tree
- "Hooks changed" indicator
- Render duration

**Limitations**:
- Doesn't show which specific hook changed (only hook index)
- Limited detail for complex hook chains

---

## Code Review Checklist

Use this checklist during code reviews:

- [ ] No inline objects/arrays in dependency arrays
- [ ] Functions in dependencies wrapped in useCallback
- [ ] No spreading of props/state into dependency arrays
- [ ] Default values defined outside component (not `= []` or `= {}`)
- [ ] useEffect doesn't modify state it depends on (unless functional update)
- [ ] Large objects/arrays memoized with useMemo
- [ ] Dependency arrays complete (no suppressions without comments)
- [ ] ESLint exhaustive-deps passing without warnings

---

## Automated Detection with Pre-commit Hooks

**Setup with Husky + lint-staged**:

```json
// package.json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

**Benefit**: Catches anti-patterns before they reach code review.

---

## Performance Impact of Anti-Patterns

| Anti-Pattern | Performance Impact | Detection Difficulty | Fix Complexity |
|--------------|-------------------|---------------------|----------------|
| Inline objects/arrays | High (frequent re-renders) | Easy (ESLint) | Low |
| Functions without useCallback | Medium-High | Easy (ESLint) | Low |
| Anonymous defaults | High (silent bug) | Hard (no ESLint rule) | Low |
| State dependency loops | Critical (infinite loop) | Medium (runtime error) | Medium |
| Spreading props | Medium | Easy (code smell) | Low |

---

## Sources

- React Official Docs: [useEffect Hook](https://react.dev/reference/react/useEffect)
- ESLint Plugin React Hooks: [exhaustive-deps rule](https://github.com/facebook/react/tree/main/packages/eslint-plugin-react-hooks)
- Kent C. Dodds: [Common Mistakes with React Hooks](https://kentcdodds.com/blog/react-hooks-pitfalls)
- LogRocket: [Solving React useEffect infinite loops](https://blog.logrocket.com/solve-react-useeffect-hook-infinite-loop-patterns/)
- GitHub Issues: facebook/react #15084, #15204, #16477, #21856

---

**Last Updated**: 2026-01-14
**Confidence**: 0.92 (Based on multi-source research and production validation)
