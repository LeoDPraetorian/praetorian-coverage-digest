# "You Might Not Need an Effect" Comprehensive Guide

**Extracted from `using-modern-react-patterns` skill - complete reference for state synchronization anti-patterns.**

## ESLint Rule

**Rule**: `react-hooks/set-state-in-effect`

Detects when you're setting state synchronously in `useEffect` based on props or other state. This is almost always a sign you should use a different pattern.

## Pattern 1: Key Prop for State Reset

### ❌ Anti-Pattern

```typescript
function UserProfile({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)

  // ❌ WRONG - Resetting state in useEffect
  useEffect(() => {
    setProfile(null)
    setLoading(true)
    // fetch new profile...
  }, [userId])

  return <div>{profile?.name}</div>
}
```

### ✅ Correct Pattern

```typescript
function UserProfile({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchProfile(userId).then(setProfile).finally(() => setLoading(false))
  }, [userId])

  return <div>{profile?.name}</div>
}

// Parent component - key prop resets entire component state
function App() {
  const [userId, setUserId] = useState('user-1')
  return <UserProfile key={userId} userId={userId} />
}
```

**Why key prop:**
- React unmounts and remounts component when key changes
- All state resets automatically
- No manual synchronization needed
- Prevents stale state bugs

## Pattern 2: Derived State with useMemo

### ❌ Anti-Pattern

```typescript
function SearchResults({ query }: { query: string }) {
  const [results, setResults] = useState<Item[]>([])
  const [filteredResults, setFilteredResults] = useState<Item[]>([])

  useEffect(() => {
    // ❌ WRONG - Setting derived state in useEffect
    setFilteredResults(
      results.filter(item => item.name.includes(query))
    )
  }, [results, query])

  return <div>{filteredResults.map(...)}</div>
}
```

### ✅ Correct Pattern

```typescript
function SearchResults({ query }: { query: string }) {
  const [results, setResults] = useState<Item[]>([])

  // ✅ RIGHT - Derive state directly
  const filteredResults = useMemo(
    () => results.filter(item => item.name.includes(query)),
    [results, query]
  )

  return <div>{filteredResults.map(...)}</div>
}
```

**Why derived state:**
- Single source of truth (results)
- No synchronization bugs
- Computed on-demand during render
- `useMemo` for expensive computations only

## Pattern 3: Valid vs Invalid useEffect setState

### ❌ Invalid: Synchronous State from Props

```typescript
// WRONG - Setting state synchronously from props
function Counter({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    setCount(initialCount)  // ❌ BLOCKS PR
  }, [initialCount])

  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

### ✅ Valid: Asynchronous Data from Props

```typescript
// RIGHT - Async operation based on prop
function UserProfile({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    // ✅ VALID - Async data fetch, not synchronous setState
    fetchProfile(userId).then(setProfile)
  }, [userId])

  return <div>{profile?.name}</div>
}

// BETTER - Use TanStack Query
function UserProfile({ userId }: { userId: string }) {
  const { data: profile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId)
  })

  return <div>{profile?.name}</div>
}
```

**The difference:**
- **Invalid**: Synchronously copying prop → state (use derived state or key prop instead)
- **Valid**: Asynchronously fetching data based on prop (but TanStack Query is better)

## Quick Reference Table

| Scenario | Wrong Approach | Right Approach |
|----------|----------------|----------------|
| **Reset component state when prop changes** | `useEffect(() => setState(initialValue), [prop])` | Use key prop: `<Component key={prop} />` |
| **Compute value from state/props** | `useEffect(() => setDerived(compute(state)), [state])` | Derive directly: `const derived = useMemo(() => compute(state), [state])` |
| **Fetch data based on prop** | `useEffect(() => fetch().then(setState), [prop])` | Use TanStack Query with `queryKey: [prop]` |
| **Update state when multiple props change** | `useEffect(() => setState(combine(propA, propB)), [propA, propB])` | Derive: `const value = useMemo(() => combine(propA, propB), [propA, propB])` |
| **Clear state when prop changes** | `useEffect(() => setState(null), [prop])` | Use key prop or initialize from prop |

## Edge Cases and Gotchas

### When useEffect + setState IS valid

**1. Timer/Interval Management**

```typescript
function Timer() {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(s => s + 1)  // ✅ VALID - async state update
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return <div>{seconds}</div>
}
```

**2. Event Listeners**

```typescript
function WindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const handleResize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight })  // ✅ VALID
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return <div>{size.width} x {size.height}</div>
}
```

**3. Web API Subscriptions**

```typescript
function UserLocation() {
  const [location, setLocation] = useState<GeolocationPosition | null>(null)

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(position => {
      setLocation(position)  // ✅ VALID - async callback
    })
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  return <div>{location?.coords.latitude}</div>
}
```

**Key distinction**: These are **asynchronous** updates from external sources, not synchronous updates from props/state.

## Migration Checklist

When refactoring existing code:

- [ ] Search codebase for `useEffect` + `setState` combinations
- [ ] For each occurrence, determine pattern:
  - [ ] Synchronous prop → state? → Use key prop
  - [ ] Derived computation? → Use `useMemo`
  - [ ] Data fetching? → Use TanStack Query
  - [ ] Async event/timer? → Keep useEffect (valid pattern)
- [ ] Run ESLint with `react-hooks/set-state-in-effect` rule
- [ ] Test that state resets correctly with new pattern
- [ ] Verify no stale state bugs introduced

## Why This Matters

**Performance:**
- Eliminates unnecessary re-renders from synchronization
- Reduces component complexity

**Correctness:**
- Prevents stale state bugs
- Single source of truth pattern
- Clearer data flow

**Maintainability:**
- Less code to maintain
- Easier to reason about
- Follows React team recommendations

## React Team Resources

- [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- [Removing Effect Dependencies](https://react.dev/learn/removing-effect-dependencies)
- [Separating Events from Effects](https://react.dev/learn/separating-events-from-effects)
