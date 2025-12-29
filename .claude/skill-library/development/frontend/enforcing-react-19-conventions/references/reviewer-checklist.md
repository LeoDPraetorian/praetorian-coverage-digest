# React 19 Code Review Checklist

**Copyable checklist for every React code review.**

## Usage

Copy this checklist into your PR review or code review notes. Check off each item as you review.

---

## Prohibited Patterns (BLOCK PR)

These patterns **MUST be fixed** before merging. Block the PR if found.

### Component Definitions

- [ ] No `React.FC` or `React.FunctionComponent` types
- [ ] No `forwardRef` usage (React 19: ref is a regular prop)
- [ ] All components use plain function declarations

### State Management

- [ ] No synchronous setState in `useEffect` for prop-derived state
  - Check for: `useEffect(() => setState(prop), [prop])`
  - Should use: key prop or derived state
- [ ] No Zustand usage without selectors
  - Check for: `const store = useStore()`
  - Should use: `const value = useStore((state) => state.value)`

### Data Fetching

- [ ] No data fetching in `useEffect` (must use TanStack Query)
  - Check for: `useEffect(() => fetch(...).then(setState), [])`
  - Should use: `useQuery({ queryKey, queryFn })`

---

## Warning Patterns (REQUEST CHANGE)

These patterns require **justification or profiling evidence**. Request changes if not justified.

### Performance Optimization

- [ ] Any `useMemo` has profiling justification
  - Ask: "Have you profiled this? What's the computation cost?"
  - Accept if: >100ms computation time with evidence
- [ ] Any `useCallback` has clear requirement
  - Ask: "Why is a stable reference needed?"
  - Accept if: Third-party library requirement or profiled benefit
- [ ] Any `React.memo` has performance evidence
  - Ask: "What's the re-render cost? How often do props change?"
  - Accept if: Large lists, profiled re-render cost, or props rarely change

### Data Fetching

- [ ] No manual loading/error state when using TanStack Query
  - Check for: `const [isLoading, setIsLoading] = useState(false)` alongside `useQuery`
  - Should use: `const { isLoading, error } = useQuery(...)`

---

## Required Patterns (VERIFY PRESENT)

These patterns **MUST be present** for the feature to work correctly. Verify they exist.

### Component Structure

- [ ] All components use function declarations
  - Example: `function Component({ prop }: Props) { ... }`
- [ ] Components with refs use ref as regular prop
  - Example: `function Input({ ref }: { ref?: RefObject<HTMLInputElement> })`

### Data Fetching

- [ ] All API calls use TanStack Query
  - For fetching: `useQuery({ queryKey, queryFn })`
  - For mutations: `useMutation({ mutationFn })`
- [ ] Queries include proper error handling
  - Check: `if (error) return <div>Error: {error.message}</div>`
- [ ] Queries include loading states
  - Check: `if (isLoading) return <div>Loading...</div>`
- [ ] Mutations properly invalidate cache
  - Check: `onSuccess: () => queryClient.invalidateQueries({ queryKey })`

### State Management

- [ ] All Zustand store access uses selectors
  - Example: `const value = useStore((state) => state.value)`
- [ ] Multiple Zustand selectors use shallow equality (if selecting objects)
  - Example: `useStore((state) => ({ a: state.a, b: state.b }), shallow)`

### State Reset Patterns

- [ ] Key prop used when component state depends on prop
  - Example: `<UserForm key={userId} userId={userId} />`
- [ ] Key prop present for modal/dialog content that needs reset
- [ ] Key prop present for tab content that needs reset

---

## Code Review Comments

Use these template comments when requesting changes:

### React.FC Found

```
❌ BLOCK: Please remove `React.FC` and use a plain function declaration:

// Before
const Component: React.FC<Props> = ({ prop }) => { ... }

// After
function Component({ prop }: Props) { ... }

See: [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/function_components/)
```

### forwardRef Found

```
❌ BLOCK: Please remove `forwardRef` and use ref as a regular prop (React 19):

// Before
const Component = forwardRef<HTMLDivElement, Props>(({ prop }, ref) => { ... })

// After
function Component({ prop, ref }: Props & { ref?: RefObject<HTMLDivElement> }) { ... }
```

### useEffect setState Found

```
❌ BLOCK: Please remove synchronous setState from useEffect. Use key prop or derived state:

// Option 1: Key prop (for component reset)
<Component key={prop} prop={prop} />

// Option 2: Derived state (for computed values)
const derived = useMemo(() => compute(prop), [prop])

See: [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
```

### Zustand Without Selector Found

```
❌ BLOCK: Please use Zustand selectors to prevent unnecessary re-renders:

// Before
const store = useStore()
return <div>{store.count}</div>

// After
const count = useStore((state) => state.count)
return <div>{count}</div>
```

### Data Fetching in useEffect Found

```
❌ BLOCK: Please use TanStack Query instead of manual data fetching:

// Before
useEffect(() => {
  fetch('/api/users').then(res => res.json()).then(setUsers)
}, [])

// After
const { data: users, isLoading } = useQuery({
  queryKey: ['users'],
  queryFn: () => fetch('/api/users').then(res => res.json())
})
```

### useMemo Without Justification

```
⚠️ REQUEST CHANGE: Please provide profiling evidence for this `useMemo`, or remove it:

Have you profiled this computation?
- What's the computation time without memo?
- What's the computation time with memo?
- How often do dependencies change?

React Compiler handles most memoization automatically. Only use `useMemo` for:
1. Computations taking >100ms (with profiling evidence)
2. Dependencies that change infrequently

If no profiling evidence, please remove the memo.
```

### React.memo Without Evidence

```
⚠️ REQUEST CHANGE: Please provide evidence for this `React.memo`, or remove it:

When is `React.memo` beneficial?
- Parent component re-renders frequently
- Props rarely change
- Component has measurable render cost

Please provide:
1. How often does the parent re-render?
2. How often do props change?
3. Profiling results showing render cost

If this isn't in a large list (table rows, grid items), it likely doesn't need memo.
```

---

## Quick Reference for Reviewers

### Fast Fail Checks (5 minutes)

Run these searches to quickly find blocking issues:

```bash
# Search for React.FC usage
rg "React\.FC|React\.FunctionComponent" --type ts --type tsx

# Search for forwardRef
rg "forwardRef" --type ts --type tsx

# Search for useEffect + setState patterns
rg "useEffect.*setState" --type ts --type tsx -A 3

# Search for Zustand without selectors
rg "useStore\(\)" --type ts --type tsx

# Search for fetch in useEffect
rg "useEffect.*fetch" --type ts --type tsx -A 3
```

### Deep Review (15 minutes)

1. **Component definitions**: All use function declarations?
2. **Data fetching**: All use TanStack Query?
3. **State management**: All Zustand calls use selectors?
4. **State reset**: Key prop used where needed?
5. **Error handling**: All queries handle loading/error states?
6. **Memoization**: All memo usage justified with profiling?

---

## Approval Criteria

PR can be approved when:

- ✅ All BLOCK items resolved
- ✅ All REQUEST CHANGE items have justification or are removed
- ✅ All VERIFY PRESENT items confirmed
- ✅ Code follows React 19 conventions
- ✅ No regressions in existing patterns

---

## Resources for Reviewers

- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19)
- [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- [TanStack Query Best Practices](https://tanstack.com/query/latest/docs/react/guides/important-defaults)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

---

## Checklist Template (Copy-Paste)

```markdown
## React 19 Code Review

### Prohibited Patterns (BLOCK PR)

- [ ] No `React.FC` or `React.FunctionComponent`
- [ ] No `forwardRef` usage
- [ ] No synchronous setState in useEffect
- [ ] No data fetching in useEffect
- [ ] No Zustand without selectors

### Warning Patterns (REQUEST CHANGE)

- [ ] `useMemo`/`useCallback` justified with profiling
- [ ] `React.memo` has performance evidence
- [ ] No manual loading/error state with TanStack Query

### Required Patterns (VERIFY PRESENT)

- [ ] Function declarations for components
- [ ] TanStack Query for all API calls
- [ ] Zustand selectors for all store access
- [ ] Key prop for state reset where needed
- [ ] Error handling for all queries
- [ ] Cache invalidation for all mutations
```

---

## Notes

- **Be firm on BLOCK items** - These patterns cause bugs or violate React 19 conventions
- **Be reasonable on WARNING items** - Accept if properly justified with evidence
- **Be thorough on REQUIRED items** - Missing patterns lead to incomplete features
- **Link to documentation** - Help developers learn, don't just reject

**This checklist should be used for EVERY React code review.** Make it part of your team's review process.
