# ESLint Configuration Best Practices for React 19 + React Compiler

**Last Updated:** December 22, 2025
**Applies To:** Chariot UI (modules/chariot/ui)
**React Version:** 19.1.2
**React Compiler:** Enabled (babel-plugin-react-compiler v1.0.0)

## Overview

This document captures best practices for configuring ESLint in React 19 projects using the React Compiler. It addresses the transition from traditional manual memoization patterns to compiler-automated optimization.

## Key Changes in React 19 + React Compiler Era

### React Compiler ESLint Plugin Merge (October 2025)

**Major Update:** The standalone `eslint-plugin-react-compiler` has been **merged into `eslint-plugin-react-hooks` v7+**.

From [React Compiler v1.0 Release](https://react.dev/blog/2025/10/07/react-compiler-1):

> "Since v7 of eslint-plugin-react-hooks, the new React Compiler checks are included in the recommended preset. If you have already installed eslint-plugin-react-compiler, you can now remove it and use eslint-plugin-react-hooks@latest."

### What This Means for Your Project

| Component                       | Required | Notes                                 |
| ------------------------------- | -------- | ------------------------------------- |
| `babel-plugin-react-compiler`   | Yes      | Performs actual compilation           |
| `eslint-plugin-react-compiler`  | No       | Merged into react-hooks v7+           |
| `eslint-plugin-react-hooks` v7+ | Yes      | Includes Compiler rules automatically |

## Recommended ESLint Configuration

### Current Chariot UI Configuration

**File:** `modules/chariot/ui/eslint.config.js`

```javascript
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      // React Hooks
      "react-hooks/rules-of-hooks": "error", // Keep - still important
      "react-hooks/exhaustive-deps": "off", // Disable - React Compiler handles this

      // React Compiler rules (included automatically in v7+)
      // No explicit configuration needed - uses recommended preset
    },
  },
];
```

### Why Disable `exhaustive-deps`?

From [React Compiler Working Group Discussion](https://github.com/reactwg/react-compiler/discussions/18):

> "You can disable the exhaustive-deps rule if you're using the compiler's linter, as the React Compiler automatically memoizes functions declared inside components like useCallback."

**Key reasons:**

1. **React Compiler handles memoization automatically** - Manual dependency arrays become less relevant
2. **ESLint disable comments cause deopts** - Using `// eslint-disable-next-line react-hooks/exhaustive-deps` prevents the compiler from optimizing that component
3. **Reduces noise** - Eliminates warnings about patterns the compiler handles
4. **Aligns with modern React 19 patterns** - Dependency arrays are becoming automated

### What to Keep Enabled

**Always keep `rules-of-hooks` enabled:**

```javascript
'react-hooks/rules-of-hooks': 'error',  // Enforces Rules of Hooks
```

This rule catches:

- Calling hooks conditionally
- Calling hooks in loops
- Calling hooks in regular functions
- Other violations of [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)

## New React Compiler ESLint Rules (v7+)

When you upgrade to `eslint-plugin-react-hooks` v7+, these rules are automatically enabled:

### 1. `react-hooks/set-state-in-effect`

**What it catches:**

```javascript
//  Bad - setState in effect can cause infinite loops
useEffect(() => {
  setIsLoading(true); // Triggers re-render  effect runs again
}, [data]);
```

**Fix:**

```javascript
//  Good - Derive state from props/state
const isLoading = data === undefined;

// OR use useTransition for loading states
const [isPending, startTransition] = useTransition();
```

### 2. Ref Access During Render

**What it catches:**

```javascript
//  Bad - Reading ref.current during render
function Component() {
  const ref = useRef();
  const value = ref.current; // Don't read during render
  return <div>{value}</div>;
}
```

**Fix:**

```javascript
//  Good - Read in effect or event handler
function Component() {
  const ref = useRef();
  const handleClick = () => {
    console.log(ref.current); // OK in event handler
  };
  return <button onClick={handleClick}>Click</button>;
}
```

### 3. Compilation Skipped Warnings

**What it catches:**

- Using libraries incompatible with React Compiler
- Patterns that force compiler bailout
- Code that can't be automatically optimized

**Common causes:**

- Direct DOM manipulation
- External state libraries (non-React state)
- Certain third-party libraries

## CI/CD Configuration

### GitHub Actions Workflow

**File:** `.github/workflows/ui.yml` (lines 56-73)

The CI lints **only files modified in the PR**:

```bash
# Get modified TypeScript/JavaScript files
MODIFIED_FILES=$(git diff --name-only --diff-filter=ACMR origin/main...HEAD | grep -E '\.(ts|tsx|js|jsx)$')

# Lint only those files with zero warnings allowed
npx eslint $MODIFIED_FILES --max-warnings 0
```

**Key behavior:**

- Lints all files changed in the entire PR branch (not just latest commit)
- Fails on ANY warning (`--max-warnings 0`)
- Uses the same `eslint.config.js` as local development

## Migration Guide: v5 v7 Upgrade

### Step 1: Upgrade the Package

```bash
cd modules/chariot/ui
npm install eslint-plugin-react-hooks@latest
```

**Version change:** v5.2.0 v7.0.1+

### Step 2: Update ESLint Configuration

```javascript
// eslint.config.js
rules: {
  'react-hooks/exhaustive-deps': 'off',  // Change from 'warn' to 'off'
}
```

### Step 3: Remove Legacy Plugin (If Installed)

```bash
# If you had eslint-plugin-react-compiler installed
npm uninstall eslint-plugin-react-compiler

# Remove from eslint.config.js plugins
```

### Step 4: Address New Compiler Errors

The v7 upgrade will reveal new errors that were previously hidden:

| Error Type               | Files Affected   | Fix Required                                   |
| ------------------------ | ---------------- | ---------------------------------------------- |
| `set-state-in-effect`    | useJobs.ts, etc. | Refactor to derive state or use transitions    |
| Ref access during render | Table.tsx        | Move ref reads to effects/handlers             |
| Compilation skipped      | Table.tsx        | May require library updates or pattern changes |

## Common Patterns with React Compiler

### Pattern 1: Automatic Memoization

**Before (manual memoization):**

```typescript
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

const handler = useCallback(() => {
  doSomething();
}, [dependency]);
```

**After (React Compiler handles it):**

```typescript
// Just write clean code - compiler memoizes automatically
const expensiveValue = computeExpensiveValue(data);

const handler = () => {
  doSomething();
};
```

### Pattern 2: Derived State (No setState in Effects)

**Before (problematic):**

```typescript
useEffect(() => {
  setIsLoading(data === undefined); //  Causes re-render in effect
}, [data]);
```

**After:**

```typescript
//  Derive state - no effect needed
const isLoading = data === undefined;
```

### Pattern 3: Refs in Event Handlers Only

**Before (problematic):**

```typescript
function Component() {
  const ref = useRef();
  const value = ref.current;  //  Reading during render
  return <div>{value}</div>;
}
```

**After:**

```typescript
function Component() {
  const ref = useRef();

  useEffect(() => {
    const value = ref.current;  //  Read in effect
    // Use value
  }, []);

  return <div ref={ref}>Content</div>;
}
```

## Handling Legacy Code

### Intentional Dependency Omissions

**Scenario:** You have intentional dependency omissions (e.g., stable singletons, performance-critical effects).

**Old approach (v5):**

```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  // Intentionally omit dependencies
}, [limitedDeps]);
```

**Problem:** ESLint disable comments **cause React Compiler deopts** - the compiler skips optimizing components with disable comments.

**New approach (v7+ with exhaustive-deps disabled):**

```typescript
// No disable comment needed - exhaustive-deps is off globally
useEffect(() => {
  // Just write the code correctly
}, [correctDeps]);
```

**If you need to omit dependencies intentionally:**

- Document WHY in regular comments
- Consider refactoring to avoid the need
- Only use eslint-disable for OTHER rules, not exhaustive-deps

## Testing Configuration

### Unit Tests (Vitest)

**Test files already benefit from React Compiler** - no special configuration needed.

**ESLint for tests:**

```javascript
// eslint.config.js - Test files use same rules
{
  files: ['**/*.test.{ts,tsx}'],
  rules: {
    'react-hooks/exhaustive-deps': 'off',  // Already disabled globally
    'no-console': 'off',  // Allow console in tests
  }
}
```

### E2E Tests (Playwright)

**ESLint configuration for E2E** (lines 142-181 in `eslint.config.js`):

```javascript
{
  files: ['e2e/**/*.{ts,js}'],
  rules: {
    'react-hooks/exhaustive-deps': 'off',  // Disabled for E2E (Node environment)
    'no-console': 'off',  // Allow console.log for debugging
  }
}
```

## Performance Impact

### Before (Manual Memoization)

- Developer writes `useMemo`, `useCallback` everywhere
- Easy to miss optimizations or over-optimize
- `exhaustive-deps` warns about every dependency issue

### After (React Compiler + v7 ESLint)

- React Compiler automatically memoizes where needed
- 25-40% fewer re-renders without code changes
- ESLint focuses on correctness (rules-of-hooks, compiler-specific issues)
- No noise warnings about dependency arrays

## Troubleshooting

### "Compilation Skipped" Warnings

**Cause:** React Compiler can't optimize certain patterns or library usages.

**Fix:**

1. Review the specific warning message for details
2. Check if a library is incompatible (rare)
3. Refactor pattern to be compiler-friendly
4. If unavoidable, the warning is informational - code still works

### "Cannot access refs during render" Errors

**Cause:** Reading `ref.current` during render phase.

**Fix:** Move ref reads to:

- `useEffect` (for side effects)
- Event handlers (for user interactions)
- `useLayoutEffect` (for DOM measurements)

### "setState in effect" Errors

**Cause:** Calling setState directly in useEffect can cause infinite loops or unnecessary re-renders.

**Fix:**

- Derive state from props/other state (no effect needed)
- Use `useTransition` for loading states
- Use `useDeferredValue` for deferred updates

## Version History

| Date         | Change                         | Impact                                 |
| ------------ | ------------------------------ | -------------------------------------- |
| Dec 22, 2025 | Upgraded to react-hooks v7.0.1 | React Compiler rules active            |
| Dec 22, 2025 | Disabled exhaustive-deps       | Eliminated 8 warnings                  |
| Oct 2025     | React Compiler v1.0 released   | Compiler rules merged into react-hooks |

## References & Sources

### Official Documentation

- [React Compiler v1.0 Release](https://react.dev/blog/2025/10/07/react-compiler-1)
- [React exhaustive-deps Reference](https://react.dev/reference/eslint-plugin-react-hooks/lints/exhaustive-deps)
- [eslint-plugin-react-hooks on npm](https://www.npmjs.com/package/eslint-plugin-react-hooks)

### Community Discussions

- [Using eslint-plugin-react-hooks with React Compiler](https://github.com/reactwg/react-compiler/discussions/18)
- [ReScript, ESLint and the React Compiler](https://blog.nojaf.com/2025/03/23/rescript-eslint-and-the-react-compiler/)

### Issue Trackers

- [React Compiler ESLint Feedback](https://github.com/facebook/react/issues/31475)
- [React Compiler Discussion #18](https://github.com/reactwg/react-compiler/discussions/18)

## Recommendations Summary

### For New Projects

```javascript
// eslint.config.js
{
  plugins: {
    'react-hooks': reactHooks,
  },
  rules: {
    'react-hooks/rules-of-hooks': 'error',      // Keep enabled
    'react-hooks/exhaustive-deps': 'off',       // Disable - Compiler handles it
  }
}
```

### For Existing Projects (Migration Path)

1.  Upgrade `eslint-plugin-react-hooks` to v7+
2.  Disable `exhaustive-deps` rule
3.  Remove `eslint-plugin-react-compiler` if installed
4.  Address new React Compiler-specific errors
5.  Remove `// eslint-disable-next-line react-hooks/exhaustive-deps` comments (they cause deopts)

### For CI/CD

**GitHub Actions** (`.github/workflows/ui.yml`):

- Lint only modified files in PR (not entire codebase)
- Use `--max-warnings 0` for strict enforcement
- Same `eslint.config.js` as local development
- No special configuration needed

## Critical Warnings

### ESLint Disable Comments Cause Compiler Deopts

From research: Using `// eslint-disable-next-line react-hooks/exhaustive-deps` prevents React Compiler from optimizing that component.

**Impact:**

- Component won't be memoized by compiler
- Defeats the purpose of using React Compiler
- Performance regression vs letting compiler handle it

**Solution:**

- Remove all `exhaustive-deps` disable comments
- Disable the rule globally instead
- Let React Compiler handle memoization

### New Errors Are Real Issues

The React Compiler ESLint rules catch patterns that prevent compilation:

- setState in effects Can cause infinite loops
- Ref access during render Breaks React's rendering model
- Incompatible libraries Need alternatives or workarounds

**These should be fixed**, not disabled.

## Smart ESLint Usage

### Local Development: Use smart-eslint Skill

**Problem:** Running `npm run eslint` lints entire codebase (~45 seconds, can hang).

**Solution:** Use the `smart-eslint` skill that lints only modified files.

**Location:** `.claude/skill-library/development/frontend/using-eslint/`

**Usage:**

```bash
# Via skill
skill: "smart-eslint"

# OR via CLI
cd .claude && npm run -w @chariot/skill-search search -- "smart-eslint"
```

**Performance:**
| Modified Files | Full Lint | Smart ESLint | Speedup |
|----------------|-----------|--------------|---------|
| 3 files | ~45s | ~2s | **22x faster** |
| 10 files | ~45s | ~5s | **9x faster** |

### CI/CD: Modified Files Only

CI automatically lints only changed files:

```bash
git diff --name-only origin/main...HEAD | grep -E '\.(ts|tsx)$'
npx eslint $MODIFIED_FILES --max-warnings 0
```

## Common ESLint Errors After Upgrade

### Error: "Avoid calling setState() directly within an effect"

**Rule:** `react-hooks/set-state-in-effect`

**Example:**

```typescript
//  Bad
useEffect(() => {
  setIsFilteredDataFetching(true);
  fetchNextPage();
}, [data.length]);
```

**Fix Options:**

1. **Derive state instead:**

```typescript
const isFilteredDataFetching = hasNextPage && data.length < 50;
```

2. **Use useTransition:**

```typescript
const [isPending, startTransition] = useTransition();
startTransition(() => {
  fetchNextPage();
});
```

### Error: "Cannot access refs during render"

**What it catches:**

```typescript
//  Bad
function Component() {
  const ref = useRef();
  if (ref.current) {  // Reading during render
    return <div>Has value</div>;
  }
}
```

**Fix:**

```typescript
//  Good - Read in effect
function Component() {
  const [hasValue, setHasValue] = useState(false);
  const ref = useRef();

  useEffect(() => {
    setHasValue(!!ref.current);
  }, []);

  return hasValue ? <div>Has value</div> : null;
}
```

### Warning: "Compilation Skipped: Use of incompatible library"

**What it means:**
React Compiler can't optimize this component due to:

- External state management (non-React)
- Direct DOM manipulation
- Certain third-party libraries

**Fix:**

- Check if library has React Compiler-compatible version
- Refactor to use React patterns
- If unavoidable, component will work but won't be optimized

## Comparison: ESLint v5 vs v7

### eslint-plugin-react-hooks v5.2.0 (Legacy)

```javascript
rules: {
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'warn',  // Only hooks rule available
}
```

**Warnings focused on:**

- Missing dependencies in hooks
- Unnecessary dependencies
- Conditional hook calls

### eslint-plugin-react-hooks v7.0.1 (React Compiler Era)

```javascript
rules: {
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'off',  // Now optional
  // React Compiler rules included automatically:
  // - set-state-in-effect
  // - refs-during-render
  // - compilation-bailouts
  // - and more...
}
```

**New focus:**

- Patterns that prevent compilation
- Correctness issues (infinite loops, stale refs)
- Compiler optimization opportunities

## Best Practices Summary

### Do This

1. **Upgrade to eslint-plugin-react-hooks v7+**
2. **Disable exhaustive-deps globally**
3. **Keep rules-of-hooks enabled**
4. **Fix React Compiler-specific errors** (set-state-in-effect, ref access)
5. **Remove exhaustive-deps disable comments** (they cause deopts)
6. **Use smart-eslint for local development** (22x faster)
7. **Let React Compiler handle memoization** (don't add manual useMemo/useCallback)

### Don't Do This

1. **Don't keep exhaustive-deps as 'warn'** with React Compiler
2. **Don't install eslint-plugin-react-compiler** separately (merged into v7+)
3. **Don't use eslint-disable comments for exhaustive-deps** (causes deopts)
4. **Don't run full eslint on codebase** (use smart-eslint instead)
5. **Don't manually add useMemo/useCallback** everywhere (let compiler decide)
6. **Don't ignore React Compiler errors** (they indicate real issues)

## Future Roadmap

From [React Compiler discussions](https://github.com/reactwg/react-compiler/discussions/18):

> "Automatic dependency arrays in the compiler are coming, which will get rid of the array entirely."

**What this means:**

- Future React versions may eliminate dependency arrays completely
- React Compiler will automatically track dependencies
- ESLint rules will evolve to match compiler capabilities

## Additional Resources

### Chariot-Specific Documentation

- **UI Development Patterns:** `modules/chariot/ui/CLAUDE.md`
- **Design Patterns:** `docs/DESIGN-PATTERNS.md`
- **Tech Stack:** `docs/TECH-STACK.md`

### React 19 + Compiler Resources

- [React 19 Documentation](https://react.dev)
- [React Compiler Playground](https://playground.react.dev/)
- [React Compiler Working Group](https://github.com/reactwg/react-compiler)

## Changelog

- **2025-12-22**: Initial documentation created
- **2025-12-22**: Upgraded Chariot UI to eslint-plugin-react-hooks v7.0.1
- **2025-12-22**: Disabled exhaustive-deps rule in Chariot UI eslint.config.js
