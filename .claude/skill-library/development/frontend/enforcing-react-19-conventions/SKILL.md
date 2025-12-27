---
name: enforcing-react-19-conventions
description: Use when writing or reviewing React code for compliance with React 19 conventions - enforces required patterns (function declarations, TanStack Query, Zustand selectors), flags critical anti-patterns (useEffect setState, React.FC, forwardRef, unnecessary memoization), provides systematic BLOCK/REQUEST CHANGE/VERIFY PRESENT reviewer checklist workflow
allowed-tools: Read, Grep, Glob
---

# React 19 Code Review Conventions

**Consolidated enforcement rules for React 19 patterns and anti-patterns.**

## When to Use

Use this skill when:

- Reviewing React/TypeScript code for compliance
- Conducting PR reviews with React components
- Auditing existing React codebase for anti-patterns
- Training developers on React 19 conventions

**Target audience**: Frontend reviewer agents (`frontend-reviewer`, `code-reviewer`), senior developers conducting code reviews.

## Quick Reference

### Review Categories

| Category           | Action                                   | Examples                                                     |
| ------------------ | ---------------------------------------- | ------------------------------------------------------------ |
| **BLOCK PR**       | Prohibited patterns that must be fixed   | `React.FC`, `forwardRef`, `useEffect` setState, no selectors |
| **REQUEST CHANGE** | Warning patterns requiring justification | `useMemo`/`useCallback` without profiling, `React.memo`      |
| **VERIFY PRESENT** | Required patterns that must exist        | Function declarations, TanStack Query, Zustand selectors     |

### Critical Anti-Patterns

1. **Synchronous setState in useEffect** - Use key prop or derived state instead
2. **React.FC / React.FunctionComponent** - Use plain function declarations
3. **forwardRef** - Use `ref` as regular prop (React 19)
4. **Zustand without selectors** - Always use selectors to prevent unnecessary re-renders
5. **Data fetching in useEffect** - Use TanStack Query
6. **Unnecessary memoization** - React Compiler handles most cases

---

## Prohibited Patterns (BLOCK PR)

### 1. React.FC and React.FunctionComponent

**❌ NEVER use:**

```typescript
// WRONG - Don't use React.FC
const UserProfile: React.FC<Props> = ({ userId }) => {
  return <div>{userId}</div>
}

// WRONG - Don't use React.FunctionComponent
const UserProfile: React.FunctionComponent<Props> = ({ userId }) => {
  return <div>{userId}</div>
}
```

**✅ REQUIRED:**

```typescript
// RIGHT - Use plain function declarations
function UserProfile({ userId }: { userId: string }) {
  return <div>{userId}</div>
}

// Also acceptable with separate type
type UserProfileProps = {
  userId: string
}

function UserProfile({ userId }: UserProfileProps) {
  return <div>{userId}</div>
}
```

**Why:**

- Implicit `children` prop is type-unsafe
- Doesn't work with generics
- React Compiler optimizes plain functions better
- React team discourages `React.FC` usage

### 2. forwardRef (React 19 Removed)

**❌ NEVER use:**

```typescript
// WRONG - forwardRef is removed in React 19
const Input = forwardRef<HTMLInputElement, Props>(
  ({ value, onChange }, ref) => {
    return <input ref={ref} value={value} onChange={onChange} />
  }
)
```

**✅ REQUIRED:**

```typescript
// RIGHT - ref is now a regular prop
function Input({
  value,
  onChange,
  ref
}: {
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  ref?: RefObject<HTMLInputElement>
}) {
  return <input ref={ref} value={value} onChange={onChange} />
}
```

**Why:**

- React 19 removed `forwardRef` API
- `ref` is now a standard prop like any other
- Simplifies component definitions

### 3. Synchronous setState in useEffect for Prop-Derived State

**❌ PROHIBITED:**

```typescript
// WRONG - Setting state synchronously from props in useEffect
function UserProfile({ userId }: { userId: string }) {
  const [id, setId] = useState(userId)

  useEffect(() => {
    setId(userId)  // ❌ BLOCKS PR - anti-pattern
  }, [userId])

  return <div>{id}</div>
}
```

**✅ REQUIRED - Use Key Prop:**

```typescript
// RIGHT - Use key prop to reset state
function UserProfile({ userId }: { userId: string }) {
  const [id] = useState(userId)  // Initialize from prop
  return <div>{id}</div>
}

// Parent component
<UserProfile key={userId} userId={userId} />
```

**✅ REQUIRED - Calculate During Render:**

```typescript
// RIGHT - Calculate directly during render (React Compiler handles memoization)
function UserProfile({ userId }: { userId: string }) {
  const formattedId = formatUserId(userId)  // Direct calculation, no useMemo needed
  return <div>{formattedId}</div>
}
```

**Why:**

- "You Might Not Need an Effect" principle
- Key prop resets component state automatically
- Derived state avoids synchronization bugs
- ESLint rule: `react-hooks/set-state-in-effect`
- React Compiler automatically memoizes calculations - manual useMemo is unnecessary for cheap operations

**See:** [references/anti-patterns.md](references/anti-patterns.md) for comprehensive "You Might Not Need an Effect" patterns.

### 4. Zustand Without Selectors

**❌ PROHIBITED:**

```typescript
// WRONG - Accesses entire store (re-renders on ANY state change)
function Counter() {
  const store = useStore()  // ❌ BLOCKS PR
  return <div>{store.count}</div>
}
```

**✅ REQUIRED:**

```typescript
// RIGHT - Uses selector (only re-renders when count changes)
function Counter() {
  const count = useStore((state) => state.count)
  return <div>{count}</div>
}

// RIGHT - Multiple selectors
function Dashboard() {
  const user = useStore((state) => state.user)
  const settings = useStore((state) => state.settings)
  return <div>{user.name} - {settings.theme}</div>
}
```

**Why:**

- Without selectors, component re-renders on ANY store update
- Causes massive performance degradation
- Selector pattern is fundamental to Zustand

### 5. Data Fetching in useEffect

**❌ PROHIBITED:**

```typescript
// WRONG - Manual data fetching in useEffect
function UserList() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    fetch('/api/users')
      .then(res => res.json())
      .then(setUsers)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])  // ❌ BLOCKS PR

  return <div>{loading ? 'Loading...' : users.map(...)}</div>
}
```

**✅ REQUIRED:**

```typescript
// RIGHT - Use TanStack Query
function UserList() {
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return <div>{users.map(...)}</div>
}
```

**Why:**

- TanStack Query handles caching, refetching, error states
- Prevents race conditions and memory leaks
- Provides optimistic updates and retry logic
- Manual useEffect data fetching is error-prone

---

## Warning Patterns (REQUEST CHANGE)

### 1. useMemo / useCallback Without Profiling

**⚠️ WARNING - Requires justification:**

```typescript
// SUSPICIOUS - Is memoization actually needed?
function UserProfile({ userId }: { userId: string }) {
  const expensiveValue = useMemo(() => {
    return userId.toUpperCase()  // ⚠️ This is cheap, why memoize?
  }, [userId])

  const handleClick = useCallback(() => {
    console.log(userId)  // ⚠️ Why is stable reference needed?
  }, [userId])

  return <div onClick={handleClick}>{expensiveValue}</div>
}
```

**✅ ACCEPTABLE with evidence:**

```typescript
// RIGHT - Memoization justified by profiling
function DataTable({ data }: { data: Item[] }) {
  // Profiled: sorting 10k items takes 150ms
  const sortedData = useMemo(() => {
    return data.sort((a, b) => a.name.localeCompare(b.name))
  }, [data])  // ✅ Justified - proven performance benefit

  return <div>{sortedData.map(...)}</div>
}
```

**When to request change:**

1. **useMemo for cheap operations** - Just calculate directly, React Compiler handles it
2. **useCallback without external library need** - Remove unless third-party lib requires stable reference
3. **If no profiling evidence**: Request removal or profiling results

**When useMemo/useCallback IS acceptable (don't flag):**

1. **Expensive computations** - Profiled at >100ms (e.g., sorting 10k items)
2. **Third-party library integration** - External libs requiring stable object/function references (maps, virtualization)
3. **Precise effect dependency control** - When you need exact control over when effects fire
4. **Cross-component expensive calculations** - React Compiler doesn't share memoization across components

**Why:**

- React Compiler automatically memoizes most cases
- Manual memoization adds complexity without benefit
- Premature optimization is harmful
- Direct calculation is the modern React 19 pattern for derived state

**See:** [references/prohibited-patterns.md#unnecessary-memoization](references/prohibited-patterns.md#unnecessary-memoization)

### 2. React.memo Without Evidence

**⚠️ WARNING:**

```typescript
// SUSPICIOUS - Is memo actually needed?
const UserCard = React.memo(({ user }: { user: User }) => {
  return <div>{user.name}</div>
})  // ⚠️ Request profiling evidence
```

**When to request change:**

- No profiling evidence showing re-render cost
- Parent component re-renders infrequently
- Props change on every render anyway

**When acceptable:**

- Component in large list (e.g., table with 1000s of rows)
- Props rarely change but parent re-renders frequently
- Profiling shows measurable benefit

### 3. Manual Loading/Error State Instead of TanStack Query

**⚠️ WARNING:**

```typescript
// SUSPICIOUS - Why not use TanStack Query states?
const { data } = useQuery({ queryKey: ["users"], queryFn: fetchUsers });
const [isLoading, setIsLoading] = useState(false); // ⚠️ TanStack Query has isLoading
const [error, setError] = useState(null); // ⚠️ TanStack Query has error
```

**Request change to:**

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ["users"],
  queryFn: fetchUsers,
});
```

---

## Required Patterns (VERIFY PRESENT)

### 1. Function Declarations for Components

**✅ Verify all components use:**

```typescript
function ComponentName({ prop }: { prop: Type }) {
  // component logic
}
```

**❌ Flag if found:**

- `const ComponentName: React.FC = ...`
- `const ComponentName = ({ prop }) => ...` with type annotations

### 2. TanStack Query for All API Calls

**✅ Verify present:**

```typescript
// For data fetching
const { data, isLoading } = useQuery({ queryKey, queryFn });

// For mutations
const mutation = useMutation({ mutationFn });
```

**❌ Flag if missing:**

- Direct `fetch()` calls
- `axios.get()` in component body or useEffect
- Manual loading/error state management

### 3. Zustand Selectors for All Store Access

**✅ Verify present:**

```typescript
const specificValue = useStore((state) => state.specificValue);
```

**❌ Flag if missing:**

- `const store = useStore()` (entire store access)
- Destructuring entire store

### 4. Key Prop for State Reset

**✅ Verify present when:**

- Component state depends on prop
- Component needs to "reset" when prop changes

```typescript
<UserProfile key={userId} userId={userId} />
```

**❌ Flag if using useEffect instead:**

```typescript
useEffect(() => {
  setState(prop); // Should use key prop instead
}, [prop]);
```

---

## Reviewer Checklist

Copy this checklist for every React code review:

### Prohibited Patterns (BLOCK PR)

- [ ] No `React.FC` or `React.FunctionComponent`
- [ ] No `forwardRef` usage (React 19 uses ref as prop)
- [ ] No synchronous setState in useEffect for prop-derived state
- [ ] No data fetching in useEffect (use TanStack Query)
- [ ] No Zustand usage without selectors

### Warning Patterns (REQUEST CHANGE)

- [ ] `useMemo`/`useCallback` without profiling justification
- [ ] `React.memo` without performance evidence
- [ ] Manual loading/error state instead of TanStack Query states

### Required Patterns (VERIFY PRESENT)

- [ ] Function declarations for components
- [ ] TanStack Query for all API calls
- [ ] Zustand selectors for all store access
- [ ] Key prop for state reset on prop change

**See:** [references/reviewer-checklist.md](references/reviewer-checklist.md) for copyable markdown checklist.

---

## Progressive Disclosure

**Quick Start (5 min)**: Use Quick Reference table and Prohibited Patterns section for immediate review.

**Comprehensive (15 min)**: Review all patterns + warning patterns + required patterns.

**Deep Dives (references/)**:

- [anti-patterns.md](references/anti-patterns.md) - "You Might Not Need an Effect" comprehensive guide
- [prohibited-patterns.md](references/prohibited-patterns.md) - Detailed rationale for each prohibition
- [required-patterns.md](references/required-patterns.md) - Complete required pattern examples
- [reviewer-checklist.md](references/reviewer-checklist.md) - Copyable checklist template

---

## Integration with Other Skills

**React 19 Trilogy** (these skills work together):

- **`using-modern-react-patterns`** - React 19 migration guide, new features, "You Might Not Need an Effect" patterns. Use when upgrading React or learning modern patterns.
- **`optimizing-react-performance`** - Deep dive into React Compiler, virtualization, concurrent features, profiling. Use when solving performance problems.

**Other Related Skills:**

- **`frontend-reviewer`** - General frontend review workflow
- **`frontend-tanstack`** - TanStack Query patterns and best practices
- **`using-zustand-state-management`** - Complete Zustand usage guide

---

## Key Principles

**You MUST use TodoWrite before starting** to track all workflow steps through the review checklist.

1. **Enforce React 19 conventions** - Block PRs for prohibited patterns
2. **Request justification for warnings** - Profiling evidence required
3. **Verify required patterns present** - TanStack Query, selectors, function declarations
4. **Consolidate scattered rules** - Single source of truth for reviewer agents

---

## Source Attribution

This skill consolidates patterns from:

- `.claude/skill-library/development/frontend/patterns/using-modern-react-patterns/SKILL.md` (lines 143-335)
- React 19 documentation
- React team recommendations
- Chariot platform conventions
