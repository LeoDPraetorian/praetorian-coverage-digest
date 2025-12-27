---
name: using-modern-react-patterns
description: 'Use when designing, implementing, or reviewing ANY React code, especially before using optimization patterns (useMemo, useCallback, React.memo), state management, or component patterns - agents must consult this skill because React 19 has fundamental changes: React Compiler handles automatic memoization (useMemo/useCallback often unnecessary), many manual optimization patterns are now obsolete or harmful - covers React 19 features (Actions, useOptimistic, useActionState), migration from old patterns, and understanding when manual optimization is actually needed versus when React Compiler handles it automatically'
allowed-tools: 'Read, Write, Edit, Bash, Grep'
---

# React Modernization

Master React version upgrades, class to hooks migration, concurrent features adoption, React 19 features, and React Compiler optimization.

## When to Use This Skill

**🚨 MANDATORY: Reference this skill ANY time you are:**

**Important:** You MUST use TodoWrite before starting to track all workflow steps.

1. **Designing, implementing, or reviewing React code** - React 19 has fundamental changes that affect ALL React development
2. **Thinking about optimization patterns** - Before using `useMemo`, `useCallback`, or `React.memo` (often unnecessary in React 19)
3. **Working with state management** - React 19 has new built-in patterns that replace manual solutions
4. **Implementing component patterns** - Many old patterns are now obsolete or harmful

**WHY**: Agents are trained on pre-React 19 patterns and will default to outdated approaches like manual memoization, which React Compiler now handles automatically. You MUST consult this skill to:

- Understand what React Compiler handles automatically (25-40% fewer re-renders without manual optimization)
- Learn when manual optimization is actually needed (rare cases only)
- Use modern React 19 features (Actions, useOptimistic, useActionState) instead of old patterns
- Avoid harmful patterns (unnecessary useMemo/useCallback adds complexity and can prevent Compiler optimizations)

**Specific Use Cases:**

- Upgrading React applications to React 19
- Migrating class components to functional components with hooks
- Adopting concurrent React features (Suspense, transitions)
- Enabling React Compiler for automatic memoization
- Using new React 19 hooks (useActionState, useOptimistic, useEffectEvent)
- Migrating forms to Actions pattern
- Adopting Server Components (Next.js/Remix)
- Removing forwardRef (ref is now a regular prop in React 19)
- Applying codemods for automated refactoring
- Modernizing state management patterns

## Version Upgrade Path

### React 16 → 17 → 18 → 19

**React 17:** Event delegation changes, no event pooling, new JSX transform

**React 18:** Automatic batching, concurrent rendering, new root API (createRoot), Suspense on server

**React 19:** Removed ReactDOM.render/hydrate, removed propTypes/defaultProps for functions, removed forwardRef (ref is regular prop), React Compiler for automatic optimization, Actions and new hooks, Server Components stable

## Migration Workflow

### 1. Pre-Migration Setup

- Update dependencies incrementally (React 17 → 18 → 19)
- Review breaking changes for target version
- Set up comprehensive testing suite
- Create feature branch for migration work

### 2. Apply Codemods

Use automated codemods for mechanical transformations:

```bash
# React 19 all-in-one migration
npx codemod react/19/migration-recipe

# Or individual codemods
npx codemod react/19/replace-reactdom-render
npx codemod react/19/remove-forwardref
npx types-react-codemod preset-19  # TypeScript
```

**See @codemods.md for complete codemod reference and custom codemod examples.**

### 3. Migrate Components

- Start with leaf components (no children)
- Convert class components to hooks (see @migration-patterns.md)
- Update lifecycle methods to useEffect patterns
- Replace HOCs with custom hooks
- Test each component after conversion

### 4. Adopt Modern Patterns

**React 19 Features:**

- **useActionState**: Replace manual form state/error/pending management
- **useOptimistic**: Instant UI feedback for async operations
- **useEffectEvent**: Stable event handlers (solves dependency issues)
- **Ref as prop**: Remove forwardRef usage
- **React Compiler**: Enable for automatic memoization (25-40% fewer re-renders)

**See @migration-patterns.md for detailed before/after code examples.**

### 5. Verify and Test

- Run full test suite with StrictMode enabled
- Check console for deprecation warnings
- Test all critical user flows
- Performance profiling with React DevTools

## Quick Reference

| Pattern        | React 18                     | React 19                   |
| -------------- | ---------------------------- | -------------------------- |
| Root API       | `ReactDOM.render()`          | `createRoot().render()`    |
| Forward Refs   | `forwardRef()`               | ref as regular prop        |
| Form State     | Manual state/error/pending   | `useActionState()`         |
| Optimistic UI  | Manual state management      | `useOptimistic()`          |
| Event Handlers | `useCallback()` with deps    | `useEffectEvent()`         |
| Memoization    | Manual `useMemo/useCallback` | React Compiler (automatic) |

## Best Practices

### Migration Strategy

1. **Incremental**: Don't migrate everything at once
2. **Test Thoroughly**: Comprehensive testing at each step
3. **Automate First**: Use codemods for mechanical changes
4. **Start Simple**: Begin with leaf components

### React 19 Patterns

1. **Upgrade to 18.3 First**: Get helpful warnings before React 19
2. **Run Codemods First**: Automate breaking changes
3. **Use Actions for Forms**: Simplify async form handling
4. **Treat ref as Regular Prop**: No more forwardRef
5. **Enable React Compiler**: Automatic optimization (optional but recommended)
6. **Simplify Memoization**: React 19 handles re-renders better

## Common Pitfalls

**React 19 Specific:**

- Using removed APIs (ReactDOM.render, propTypes, forwardRef)
- Over-memoizing with React Compiler enabled (unnecessary)
- Not running codemods before manual migration
- Skipping React 18.3 upgrade (misses helpful warnings)
- Assuming React Compiler is included (it's separate, opt-in)

## "You Might Not Need an Effect" Patterns

**🚨 CRITICAL: Agents default to `useState + useEffect` for prop-derived state, which is WRONG.**

This section covers patterns from [React's official "You Might Not Need an Effect" guide](https://react.dev/learn/you-might-not-need-an-effect) that prevent common ESLint violations and performance issues.

### The Problem: Synchronous setState in useEffect

**ESLint Rule:** `react-hooks/set-state-in-effect`

From [React Hooks ESLint documentation](https://react.dev/reference/eslint-plugin-react-hooks/lints/set-state-in-effect):

> "Synchronous setState calls trigger re-renders before the browser can paint, causing performance issues and visual jank. React has to render twice: once to apply the state update, then again after effects run."

**What the rule prohibits:**
- ❌ Resetting state to defaults when props change
- ❌ Deriving state from props in effects
- ❌ Transforming data in effects

**Valid exception:** ✅ setState from ref values (DOM measurements)

### Pattern 1: Key Prop for State Reset

**When props change and you need to reset component state**, use the `key` prop instead of `useEffect`.

```typescript
// ❌ WRONG: Synchronous setState in useEffect
function ProfilePage({ userId }) {
  const [comment, setComment] = useState('');

  useEffect(() => {
    setComment(''); // ESLint: set-state-in-effect violation
  }, [userId]);

  return <textarea value={comment} onChange={e => setComment(e.target.value)} />;
}

// Usage
<ProfilePage userId={userId} />
```

**Why this is wrong:**
- Triggers two renders: one for userId change, another for setComment
- Creates cascading renders (performance issue)
- Visual jank (component flickers during state reset)

```typescript
// ✅ CORRECT: Key prop resets state automatically
function ProfilePage({ userId }) {
  const [comment, setComment] = useState('');

  // No useEffect needed! Key prop resets state when userId changes
  return <textarea value={comment} onChange={e => setComment(e.target.value)} />;
}

// Usage - key tells React this is a different component
<ProfilePage userId={userId} key={userId} />
```

**Why this works:**
- React creates a new component instance when key changes
- All state resets automatically (no manual setState)
- Single render (no cascading updates)
- Follows React's component model

### Pattern 2: Derived State via Direct Calculation

**When you need to derive/transform data from props**, calculate directly during render instead of storing in state. React Compiler handles memoization automatically.

```typescript
// ❌ WRONG: Synchronous setState in useEffect
function CapabilityDrawer({ capability }) {
  const [parameterValues, setParameterValues] = useState({});

  useEffect(() => {
    // Even though capability came from async fetch,
    // THIS setState call is synchronous
    const defaults = capability?.parameters
      ?.filter(p => p.default)
      .reduce((acc, p) => ({ ...acc, [p.name]: p.default }), {});

    setParameterValues(defaults); // ESLint: set-state-in-effect violation
  }, [capability]);

  return <ParameterForm values={parameterValues} />;
}
```

**Why this is wrong:**
- Synchronous setState (not in async callback)
- Triggers re-render after effect runs
- Cascading renders when capability changes
- Violates "You Might Not Need an Effect"

```typescript
// ✅ CORRECT: Calculate directly during render
function CapabilityDrawer({ capability }) {
  // Derive defaults during render - no useMemo needed, React Compiler handles it
  const defaultParams = capability?.parameters
    ?.filter(p => p.default)
    .reduce((acc, p) => ({ ...acc, [p.name]: p.default }), {}) ?? {};

  // Track user edits only
  const [userEdits, setUserEdits] = useState<Record<string, string>>({});

  // Combine - no useEffect needed!
  const parameterValues = { ...defaultParams, ...userEdits };

  return <ParameterForm values={parameterValues} onChange={setUserEdits} />;
}
```

**Why this works:**
- No state for derived data (calculated during render)
- Single source of truth (capability prop)
- Only user edits stored in state
- Zero ESLint violations
- Single render per change
- React Compiler automatically memoizes this calculation

**Note:** Only add `useMemo` if profiling shows the calculation takes >100ms. For most derived state operations, direct calculation is sufficient.

### Pattern 3: Valid vs Invalid useEffect setState

**Understanding the distinction between async and synchronous setState:**

```typescript
// ✅ VALID: setState in ASYNC callback
useEffect(() => {
  fetchData().then(data => {
    setState(data); // OK - inside async callback
  });
}, []);

// ❌ INVALID: Synchronous setState even if data was fetched async
const { data } = useQuery(...); // Already fetched

useEffect(() => {
  setState(data.value); // NOT OK - synchronous setState
}, [data]);
```

**The key difference:**
- **Async callback**: setState happens after a promise resolves (valid use case)
- **Synchronous derivation**: setState happens immediately in effect body (invalid)

In the invalid example, even though `data` came from an async operation (`useQuery`), the `setState` call itself is **synchronous** because it runs immediately when the effect executes.

### When useEffect setState IS Valid

**Only these scenarios justify setState in useEffect:**

1. **Async operations** (fetch, timers, subscriptions)
```typescript
useEffect(() => {
  const timer = setTimeout(() => setState(value), 1000);
  return () => clearTimeout(timer);
}, []);
```

2. **DOM measurements from refs**
```typescript
useEffect(() => {
  const height = elementRef.current?.offsetHeight;
  setHeight(height); // OK - reading from DOM
}, []);
```

3. **Event listeners**
```typescript
useEffect(() => {
  const handler = () => setState(newValue);
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []);
```

**NOT valid:**
- ❌ Resetting state when props change (use key prop)
- ❌ Deriving state from props (calculate directly during render)
- ❌ Transforming prop data (calculate during render)

### Quick Reference

| Pattern | ❌ Wrong Approach | ✅ Correct Approach |
|---------|------------------|---------------------|
| **Reset state on prop change** | `useEffect(() => setState(initial), [prop])` | `key={prop}` on component |
| **Derive from props** | `useEffect(() => setState(transform(prop)), [prop])` | `const val = transform(prop)` (direct calculation) |
| **Transform data** | Store in state, update in effect | Calculate during render |
| **User edits + defaults** | Single state with effect | Two states: defaults (calculated) + edits (state) |
| **Expensive calculation (>100ms)** | Recalculate on every render | `useMemo(() => expensive(data), [data])` |

## Reference Files

- **@migration-patterns.md**: Complete before/after code examples for all migration patterns
- **@codemods.md**: All codemod commands and custom codemod examples
- **@checklist.md**: Detailed step-by-step migration checklist

## Related Skills

**React 19 Trilogy** (these skills work together):
- **`optimizing-react-performance`** - Deep dive into React Compiler, virtualization, concurrent features (useTransition, useDeferredValue), profiling. Use when solving performance problems.
- **`enforcing-react-19-conventions`** - PR review checklist with BLOCK/REQUEST CHANGE/VERIFY workflow for React patterns. Use during code reviews to enforce Chariot conventions.

**Other Related Skills:**
- **`frontend-tanstack`** - TanStack Query patterns and best practices
- **`using-zustand-state-management`** - Complete Zustand usage guide
