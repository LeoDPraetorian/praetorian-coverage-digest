# Zustand Selectors Complete Guide

Selectors are functions that extract specific state from a store. Proper selector usage is critical for performance in Zustand v5.

---

## Why Selectors Matter

**Components re-render when their selector output changes.**

```typescript
// Re-renders on ANY state change
const state = useStore()

// Re-renders ONLY when bears changes
const bears = useStore((state) => state.bears)
```

---

## Basic Selectors

### Single Value

```typescript
const bears = useStore((state) => state.bears)
const honey = useStore((state) => state.honey)
```

### Derived Values

```typescript
// Computed in selector - not stored in state
const totalFood = useStore((state) => state.bears * state.foodPerBear)
```

### Parameterized Selectors

```typescript
const selectById = (id: string) => (state: Store) =>
  state.items.find((item) => item.id === id)

// Usage
const item = useStore(selectById('123'))
```

---

## useShallow Hook (v5)

**CRITICAL for selecting multiple values.**

### The Problem

```typescript
// BAD - Creates new object every render, causes infinite loops in v5
const { bears, fishes } = useStore((state) => ({
  bears: state.bears,
  fishes: state.fishes,
}))
```

### The Solution

```typescript
import { useShallow } from 'zustand/react/shallow'

// Object pick
const { bears, fishes } = useStore(
  useShallow((state) => ({ bears: state.bears, fishes: state.fishes }))
)

// Array pick
const [bears, fishes] = useStore(
  useShallow((state) => [state.bears, state.fishes])
)

// Mapped picks
const itemKeys = useStore(useShallow((state) => Object.keys(state.items)))
```

### useShallow Signature

```typescript
useShallow<T, U = T>(selectorFn: (state: T) => U): (state: T) => U
```

---

## Custom Equality Functions

For complex comparison logic:

```typescript
const data = useStore(
  (state) => state.data,
  (oldData, newData) => {
    // Custom comparison - return true if equal (no re-render)
    return oldData.id === newData.id && oldData.version === newData.version
  }
)
```

---

## Auto-Generating Selectors

### Pattern: createSelectors

Automatically create `.use.fieldName()` accessors:

```typescript
import { StoreApi, UseBoundStore } from 'zustand'

type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: { [K in keyof T]: () => T[K] } }
  : never

const createSelectors = <S extends UseBoundStore<StoreApi<object>>>(
  _store: S
) => {
  const store = _store as WithSelectors<typeof _store>
  store.use = {}
  for (const k of Object.keys(store.getState())) {
    ;(store.use as any)[k] = () => store((s) => s[k as keyof typeof s])
  }
  return store
}
```

### Usage

```typescript
// Wrap your store
const useBearStore = createSelectors(useBearStoreBase)

// Use auto-generated selectors
const bears = useBearStore.use.bears()
const increment = useBearStore.use.increment()
```

### For Vanilla Stores

```typescript
import { StoreApi, useStore } from 'zustand'

const createSelectors = <S extends StoreApi<object>>(_store: S) => {
  const store = _store as WithSelectors<typeof _store>
  store.use = {}
  for (const k of Object.keys(store.getState())) {
    ;(store.use as any)[k] = () =>
      useStore(_store, (s) => s[k as keyof typeof s])
  }
  return store
}
```

---

## Stable Selectors (v5 Requirement)

**Zustand v5 requires stable selector outputs to match React's default behavior.**

### Unstable Selectors (BAD)

```typescript
// Creates new reference each render - may cause infinite loops
const badSelector = (state) => ({ ...state.data })
const badSelector2 = (state) => state.items.filter(x => x.active)
```

### Stable Selectors (GOOD)

```typescript
// Returns stable reference
const goodSelector = (state) => state.data

// For multiple values, use useShallow
const { a, b } = useStore(
  useShallow((state) => ({ a: state.a, b: state.b }))
)

// For filtered arrays, memoize outside
const selectActiveItems = (state: Store) => state.items.filter(x => x.active)
// Then use with useShallow if needed
```

---

## Selector Performance Patterns

### Memoized Selectors

```typescript
import { useMemo } from 'react'

function ExpensiveComponent({ id }: { id: string }) {
  const selector = useMemo(
    () => (state: Store) => state.items.find(item => item.id === id),
    [id]
  )
  const item = useStore(selector)
  return <div>{item?.name}</div>
}
```

### Multiple Primitive Selections

```typescript
// Preferred: Select primitives separately
const bears = useStore((state) => state.bears)
const fishes = useStore((state) => state.fishes)

// Alternative: useShallow for objects
const { bears, fishes } = useStore(
  useShallow((state) => ({ bears: state.bears, fishes: state.fishes }))
)
```

---

## Common Mistakes

### Infinite Render Loop

```typescript
// WRONG - Creates new object every render
const { bears, fishes } = useStore((state) => ({
  bears: state.bears,
  fishes: state.fishes,
}))

// FIX - Use useShallow
const { bears, fishes } = useStore(
  useShallow((state) => ({ bears: state.bears, fishes: state.fishes }))
)
```

### Selecting Entire Store

```typescript
// WRONG - Re-renders on ANY state change
const state = useStore()

// FIX - Select only what you need
const bears = useStore((state) => state.bears)
```

### Creating Objects in Selector

```typescript
// WRONG - New array created every call
const items = useStore((state) => state.items.slice())

// FIX - Return direct reference or use useShallow
const items = useStore((state) => state.items)
```

---

## Official Documentation

- **Selectors Guide**: https://zustand.docs.pmnd.rs/guides/selectors
- **useShallow**: https://zustand.docs.pmnd.rs/hooks/use-shallow
- **Auto-generating Selectors**: https://zustand.docs.pmnd.rs/guides/auto-generating-selectors
