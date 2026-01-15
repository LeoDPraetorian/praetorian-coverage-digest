---
name: preventing-react-hook-infinite-loops
description: Use when writing React hooks with object/array dependencies, debugging infinite re-renders, or reviewing code with useEffect/useCallback/useMemo - provides patterns to prevent reference instability causing infinite loops
allowed-tools: Read, Grep, Edit, Write
---

# Preventing React Hook Infinite Loops

**Systematic patterns for preventing reference instability in React hook dependencies.**

## Problem Statement

React hooks compare dependencies by **reference**, not value. Objects and arrays are recreated on every render, causing:

- `useEffect` running infinitely
- `useCallback`/`useMemo` invalidating every render
- Component re-render cascades
- Browser freezing/crashing with "Maximum update depth exceeded" errors

## When to Use This Skill

Invoke this skill when:

- Writing `useEffect` with object/array dependencies
- Debugging "Maximum update depth exceeded" errors
- Reviewing hooks for performance issues
- Creating custom hooks that accept complex parameters
- Code review: Detecting unstable dependencies in PRs

## Core Patterns

### Pattern 1: Serialized Dependency Keys

**Use when**: Array/object content should trigger effect, not reference change.

**Problem**:

```typescript
// ❌ WRONG - assets array recreated every render = infinite loop
const [result, setResult] = useState(null);
useEffect(() => {
  processAssets(assets).then(setResult);
}, [assets]); // Reference changes every render!
```

**Solution**:

```typescript
// ✅ RIGHT - stable string key only changes when content changes
const assetsKey = useMemo(
  () =>
    assets
      .map((a) => a.id)
      .sort()
      .join(","),
  [assets]
);

useEffect(() => {
  processAssets(assets).then(setResult);
}, [assetsKey]); // String comparison, stable reference
```

**When to use**: Entity arrays with stable IDs (assets, users, products).

### Pattern 2: Ref for Mutable Values

**Use when**: Need latest callback value without triggering re-render.

**Problem**:

```typescript
// ❌ WRONG - callback in dependency causes loop
const handleUpdate = useCallback(() => {
  onUpdate(data);
}, [onUpdate, data]); // onUpdate might be unstable
```

**Solution**:

```typescript
// ✅ RIGHT - ref holds latest without triggering re-render
const onUpdateRef = useRef(onUpdate);
onUpdateRef.current = onUpdate;

const handleUpdate = useCallback(() => {
  onUpdateRef.current(data);
}, [data]); // Only data in deps
```

**When to use**: Callbacks from props, event handlers passed from parent.

### Pattern 3: Object Comparison with JSON

**Use when**: Config object should trigger effect on value change.

```typescript
// For config objects that should trigger on value change
const configKey = useMemo(() => JSON.stringify(config), [config]);

useEffect(() => {
  applyConfig(config);
}, [configKey]);
```

**⚠️ Limitations**: Only works for JSON-serializable objects (no functions, undefined, circular refs).

### Pattern 4: Stable Callbacks from Props

**Use when**: Parent passes callbacks that may not be memoized.

```typescript
// When parent passes unstable callbacks
const stableOnChange = useCallback(
  (value: T) => onChange?.(value),
  [] // Empty deps - uses closure
);

// Access latest onChange via ref if needed
const onChangeRef = useRef(onChange);
useLayoutEffect(() => {
  onChangeRef.current = onChange;
});
```

**When to use**: Creating reusable components that accept callback props.

## Anti-Patterns Detection

| Anti-Pattern                         | Detection                        | Fix                          |
| ------------------------------------ | -------------------------------- | ---------------------------- |
| Array/object literal in deps         | `}, [{ foo }])` or `}, [[a,b]])` | Extract to useMemo/serialize |
| Function in deps without useCallback | `}, [someFunction])`             | Wrap in useCallback or ref   |
| Spreading props into deps            | `}, [...props])`                 | List specific props          |
| New object in useCallback deps       | `}, [{ config }])`               | Serialize or use ref         |
| Inline arrow functions in deps       | `}, [() => doThing()])`          | Extract to useCallback       |

**See**: [Anti-Patterns Reference](references/anti-patterns.md) for detection strategies and automated linting rules.

## Debugging Workflow

When infinite loop occurs:

1. **Confirm loop**: Add `console.log` at start of `useEffect`
2. **Identify culprit**: Log each dependency with reference identity

   ```typescript
   useEffect(() => {
     console.log("Effect running", { dep1, dep2, dep3 });
   }, [dep1, dep2, dep3]);
   ```

3. **Check reference stability**: Which dep has different reference each log?
4. **Apply pattern**: Use appropriate pattern from Core Patterns above
5. **Verify fix**: Remove logs, confirm loop stopped

**See**: [Debugging Guide](references/debugging-guide.md) for React DevTools profiling and advanced techniques.

## Chariot Codebase Examples

### Example 1: Cluster Detection

**Location**: `modules/chariot/ui/src/components/nodeGraph/hooks/useClusterManagement.ts`

**Pattern Used**: Serialized dependency key

```typescript
const serializedAssets = useMemo(
  () =>
    assets
      .map((a) => a.id)
      .sort()
      .join(","),
  [assets]
);

useEffect(() => {
  detectClusters(assets);
}, [serializedAssets]); // Prevents re-clustering on every render
```

### Example 2: Camera Event Handlers

**Location**: `modules/chariot/ui/src/components/nodeGraph/hooks/useViewportCulling.ts`

**Pattern Used**: Ref for callback stability

```typescript
const debounceTimerRef = useRef<NodeJS.Timeout>();

const handleCameraMove = useCallback(() => {
  // Uses ref to avoid callback dependencies
}, []); // Empty deps, stable across renders
```

**See**: [Chariot Examples](examples/chariot-patterns.md) for complete implementations with context.

## Integration

### Called By

- `frontend-developer` agent - When implementing React hooks
- `frontend-reviewer` agent - During code review for performance
- `frontend-security` agent - When reviewing client-side rendering logic

### Requires (invoke before starting)

| Skill                          | When                     | Purpose                            |
| ------------------------------ | ------------------------ | ---------------------------------- |
| `debugging-systematically`     | When loop already exists | Root cause analysis                |
| `optimizing-react-performance` | For broader perf issues  | Context for optimization decisions |

### Calls (during execution)

None - terminal skill (provides patterns, doesn't orchestrate other skills)

### Pairs With (conditional)

| Skill                          | Trigger                                | Purpose                    |
| ------------------------------ | -------------------------------------- | -------------------------- |
| `optimizing-react-performance` | Performance issues beyond hook loops   | Broader React optimization |
| `adhering-to-dry`              | Multiple components have same patterns | Extract reusable utilities |
| `testing-react-hooks`          | Need tests for custom hooks            | Hook testing patterns      |

## Library Integration

### React Query / TanStack Query

Query keys follow same serialization pattern:

```typescript
const queryKey = useMemo(
  () => ["assets", filters.status, filters.class],
  [filters.status, filters.class] // Only stable values
);
```

### Zustand / Redux

Selector stability:

```typescript
const stableSelector = useCallback(
  (state) => state.assets.filter((a) => a.status === status),
  [status] // Only status, not filter function
);
```

### React Hook Form

Watch dependencies:

```typescript
const watchedFields = useWatch({ control, name: ["field1", "field2"] });
const fieldKey = useMemo(() => JSON.stringify(watchedFields), [watchedFields]);
```

## Related Skills

- `optimizing-react-performance` - Broader performance patterns (memoization, virtualization)
- `debugging-systematically` - When tracking down the loop source (root cause analysis)
- `adhering-to-dry` - Extract reusable serialization utilities
- `testing-react-hooks` - Testing patterns for custom hooks with complex dependencies

## Advanced Topics

For advanced patterns and edge cases, see:

- [Advanced Patterns](references/advanced-patterns.md) - Deep comparison hooks, multi-level serialization
- [Performance Tradeoffs](references/performance-tradeoffs.md) - When serialization costs more than re-render
- [ESLint Configuration](references/eslint-configuration.md) - Automated detection with exhaustive-deps rule
- [TypeScript Patterns](references/typescript-patterns.md) - Type-safe dependency serialization

## Key Principles

1. **Reference vs Value**: React compares by reference; objects/arrays need serialization
2. **Serialization over Deep Compare**: JSON.stringify or key-based > deep equality checks
3. **Refs for Latest Values**: Use refs when you need current value without re-render trigger
4. **Empty Deps + Refs**: Prefer empty dependency array with refs over unstable dependencies
5. **Test in Development**: Infinite loops are easier to catch with React StrictMode enabled

## Success Criteria

✅ No "Maximum update depth exceeded" errors
✅ useEffect runs only when logical dependencies change
✅ Browser profiler shows no excessive re-renders
✅ ESLint exhaustive-deps rule passes with no suppressions
✅ Custom hooks work correctly when parent re-renders
