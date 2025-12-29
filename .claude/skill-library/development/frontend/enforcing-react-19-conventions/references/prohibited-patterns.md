# Prohibited Patterns - Detailed Rationale

**Complete justification for React 19 prohibited patterns.**

## React.FC and React.FunctionComponent

### History

`React.FC` was introduced in React 16.8 with TypeScript support. It was intended to provide a standard type for function components.

### Why It's Prohibited

**1. Implicit Children Prop (Type Unsafe)**

```typescript
type Props = {
  title: string
}

// React.FC automatically adds children?: ReactNode
const Component: React.FC<Props> = ({ title }) => {
  // TypeScript won't catch this error!
  return <div>{title}</div>
}

// This compiles but shouldn't - we didn't define children
<Component title="Hello">
  <p>This child will be ignored silently!</p>
</Component>
```

With plain function, you get proper type checking:

```typescript
function Component({ title }: Props) {
  return <div>{title}</div>
}

// TypeScript error: Component doesn't accept children
<Component title="Hello">
  <p>Error!</p>
</Component>
```

**2. Doesn't Work with Generics**

```typescript
// WRONG - Can't use generics with React.FC
const GenericList: React.FC<{ items: T[] }> = ({ items }) => {
  // T is not recognized
  return <div>{items.map(...)}</div>
}

// RIGHT - Plain function supports generics
function GenericList<T>({ items }: { items: T[] }) {
  return <div>{items.map(...)}</div>
}
```

**3. React Compiler Optimization**

The React Compiler (React 19+) optimizes plain function declarations better:

```typescript
// Less optimal for React Compiler
const Component: React.FC<Props> = ({ prop }) => { ... }

// Better optimization with plain function
function Component({ prop }: Props) { ... }
```

**4. React Team Discourages It**

From React TypeScript Cheatsheet:

> "We used to recommend React.FC for typing function components but... we now discourage using React.FC."

### Official Replacement

```typescript
// Old (deprecated)
const Component: React.FC<Props> = (props) => { ... }

// New (recommended)
function Component(props: Props) { ... }

// Or with destructuring
function Component({ prop1, prop2 }: Props) { ... }
```

---

## forwardRef (React 19)

### History

`forwardRef` was introduced in React 16.3 to pass refs through components to their children.

### Why It's Removed in React 19

**1. Refs Are Now Regular Props**

React 19 treats `ref` like any other prop:

```typescript
// Old (React 18)
const Input = forwardRef<HTMLInputElement, Props>(
  ({ value, onChange }, ref) => {
    return <input ref={ref} value={value} onChange={onChange} />
  }
)

// New (React 19)
function Input({
  value,
  onChange,
  ref
}: Props & { ref?: RefObject<HTMLInputElement> }) {
  return <input ref={ref} value={value} onChange={onChange} />
}
```

**2. Simpler Component Definitions**

No need for extra wrapper function:

```typescript
// Old - Requires forwardRef wrapper
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, onClick }, ref) => {
    return <button ref={ref} onClick={onClick}>{children}</button>
  }
)

// New - Just a regular function
function Button({
  children,
  onClick,
  ref
}: ButtonProps & { ref?: RefObject<HTMLButtonElement> }) {
  return <button ref={ref} onClick={onClick}>{children}</button>
}
```

**3. Better TypeScript Inference**

Generic forwarded refs were complex:

```typescript
// Old - Complex generic typing
const GenericComponent = forwardRef(<T extends HTMLElement>(props: Props, ref: Ref<T>) => {
  // ...
});

// New - Straightforward
function GenericComponent<T extends HTMLElement>({
  ref,
  ...props
}: Props & { ref?: RefObject<T> }) {
  // ...
}
```

### Migration Guide

**1. Remove forwardRef wrapper**

```diff
- const Component = forwardRef<RefType, PropsType>(
-   ({ prop1, prop2 }, ref) => {
+ function Component({ prop1, prop2, ref }: PropsType & { ref?: RefObject<RefType> }) {
      return <div ref={ref}>...</div>
-   }
- )
+ }
```

**2. Update prop types**

```typescript
// Before
type ButtonProps = {
  children: ReactNode
  onClick: () => void
}
const Button = forwardRef<HTMLButtonElement, ButtonProps>(...)

// After
type ButtonProps = {
  children: ReactNode
  onClick: () => void
  ref?: RefObject<HTMLButtonElement>  // Add ref to props
}
function Button({ children, onClick, ref }: ButtonProps) { ... }
```

---

## Unnecessary Memoization

### React Compiler Context

React 19 includes an **automatic memoization compiler** that optimizes components without manual `useMemo`/`useCallback`/`React.memo`.

### When Memoization IS Necessary

**1. Computations Taking >100ms**

```typescript
function DataTable({ data }: { data: Item[] }) {
  // Profiling shows: sorting 50k items takes 250ms
  const sortedData = useMemo(() => {
    return data.sort((a, b) => a.score - b.score)
  }, [data])  // ✅ Justified

  return <Table data={sortedData} />
}
```

**Justification process:**

1. Profile the computation: `console.time('sort')` / `console.timeEnd('sort')`
2. If >100ms, add `useMemo`
3. Document profiling results in comment
4. Re-profile after adding memo to confirm benefit

**2. Third-Party Library Requirements**

```typescript
function MapComponent() {
  // react-map-gl requires stable onMove callback
  const handleMove = useCallback((e: ViewStateChangeEvent) => {
    updateViewport(e.viewState)
  }, [])  // ✅ Justified - library requirement

  return <Map onMove={handleMove} />
}
```

**When third-party lib requires:**

- Stable callback reference (useCallback)
- Deep equality check (useMemo for objects/arrays)
- Document library requirement in comment

### When Memoization Is Harmful

**1. Cheap Computations**

```typescript
// ❌ UNNECESSARY - String operations are microseconds
const userName = useMemo(() => {
  return user.firstName + " " + user.lastName;
}, [user]);

// ✅ BETTER - Just compute it
const userName = `${user.firstName} ${user.lastName}`;
```

**Memoization overhead > computation cost for:**

- String operations
- Simple math
- Array/object access
- Boolean logic

**2. Dependencies Change Frequently**

```typescript
// ❌ POINTLESS - timestamp changes every render
const message = useMemo(() => {
  return `Updated at ${Date.now()}`;
}, [Date.now()]); // Memo never hits

// ✅ BETTER - No memo
const message = `Updated at ${Date.now()}`;
```

**3. React.memo Without Props Comparison**

```typescript
// ❌ SUSPICIOUS - Memoizing everything
const UserCard = React.memo(({ user }: { user: User }) => {
  return <div>{user.name}</div>
})

// When is this beneficial?
// - Parent re-renders frequently
// - user prop rarely changes
// - Component is in a large list
```

**Request profiling evidence:**

1. How often does parent re-render?
2. How often do props change?
3. What's the render cost of this component?

### Profiling Checklist

Before adding memoization, answer:

- [ ] Have you profiled without memo? (Baseline time)
- [ ] Have you profiled with memo? (Improved time)
- [ ] Is the improvement >50ms? (Noticeable to users)
- [ ] Do deps change infrequently? (Memo hits cache)
- [ ] Is this measurable in production? (Not just local dev)

If any answer is "no", don't memoize.

### React Compiler Behavior

The React Compiler automatically memoizes:

- Component output (like React.memo)
- Expensive computations (like useMemo)
- Callback functions (like useCallback)

**When compiler is enabled**, manual memoization is redundant except for:

- Third-party library requirements
- Profiled bottlenecks >100ms

---

## Common Misconceptions

### "But My Senior Said to Always Use React.FC"

**Response**: React team deprecated this pattern in 2021. Senior's knowledge may be outdated. Link to [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/function_components/).

### "Memoization Never Hurts"

**False**: Memoization has costs:

- Memory overhead (cache storage)
- CPU overhead (equality checks)
- Code complexity (harder to maintain)
- False sense of optimization (premature optimization)

**Response**: Profile first. Optimize second. Document always.

### "forwardRef Still Works in React 19"

**Partially true**: React 19 maintains backwards compatibility during transition, but:

- New code should use ref as prop
- forwardRef will be fully removed in future version
- Start migration now to avoid breaking changes

---

## Enforcement Strategy

### During Code Review

**For React.FC:**

- Automatic BLOCK - no exceptions
- Suggest function declaration replacement
- Link to this document

**For forwardRef:**

- Automatic BLOCK - no exceptions
- Suggest ref as prop pattern
- Link to React 19 migration guide

**For useMemo/useCallback:**

- REQUEST CHANGE - ask for profiling
- If profiling provided and justified → APPROVE
- If no profiling → REQUEST removal
- Document profiling results in comment

**For React.memo:**

- REQUEST CHANGE - ask for evidence
- Acceptable for large lists (table rows, grids)
- Require justification for other cases

### Automated Tools

**ESLint Rules:**

```json
{
  "rules": {
    "@typescript-eslint/ban-types": [
      "error",
      {
        "types": {
          "React.FC": "Use plain function declarations instead",
          "React.FunctionComponent": "Use plain function declarations instead"
        }
      }
    ]
  }
}
```

**Codemod (for migration):**

```bash
# Remove React.FC from codebase
npx codemod react/19/replace-react-fc
```

---

## Resources

- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19)
- [You Might Not Need useMemo](https://react.dev/reference/react/useMemo#should-you-add-usememo-everywhere)
- [React Compiler Documentation](https://react.dev/learn/react-compiler)
- [TypeScript React Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
