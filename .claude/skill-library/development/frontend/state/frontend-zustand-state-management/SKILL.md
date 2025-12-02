---
name: frontend-zustand-state-management
description: Use when implementing Zustand global state management with TypeScript, migrating from Redux/Context API, implementing state persistence, using slices pattern, or handling Next.js SSR hydration issues
allowed-tools: Read, Grep, Bash, TodoWrite
---

# Zustand State Management

**Status**: Production Ready ✅
**Last Updated**: 2025-11-28
**Latest Version**: zustand@5.0.8
**Dependencies**: React 18+ (React 19 compatible), TypeScript 4.5+

---

## Quick Start (3 Minutes)

### 1. Install Zustand

```bash
npm install zustand
```

**Why Zustand?**
- Minimal API: Only 1 function (`create`)
- No boilerplate: No providers, reducers, or actions
- TypeScript-first: Excellent type inference
- Fast: Fine-grained subscriptions prevent re-renders
- Flexible: Middleware for persistence, devtools

### 2. Create Your First Store (TypeScript)

```typescript
import { create } from 'zustand'

interface BearStore {
  bears: number
  increase: (by: number) => void
  reset: () => void
}

const useBearStore = create<BearStore>()((set) => ({
  bears: 0,
  increase: (by) => set((state) => ({ bears: state.bears + by })),
  reset: () => set({ bears: 0 }),
}))
```

**CRITICAL**: Notice the **double parentheses** `create<T>()()` - required for TypeScript with middleware.

### 3. Use Store in Components

```tsx
import { useBearStore } from './store'

function BearCounter() {
  const bears = useBearStore((state) => state.bears)
  return <h1>{bears} around here...</h1>
}

function Controls() {
  const increase = useBearStore((state) => state.increase)
  return <button onClick={() => increase(1)}>Add bear</button>
}
```

**Why this works:**
- Components only re-render when their selected state changes
- No Context providers needed
- Selector function extracts specific state slice

---

## The 3-Pattern Setup Process

### Pattern 1: Basic Store (JavaScript)

For simple use cases without TypeScript:

```javascript
import { create } from 'zustand'

const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}))
```

**When to use**: Prototyping, small apps, no TypeScript

### Pattern 2: TypeScript Store (Recommended)

For production apps with type safety:

```typescript
import { create } from 'zustand'

interface CounterStore {
  count: number
  increment: () => void
  decrement: () => void
}

const useCounterStore = create<CounterStore>()((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}))
```

**Key Points:**
- Separate interface for state + actions
- Use `create<T>()()` syntax (currying for middleware)
- Full IDE autocomplete and type checking

### Pattern 3: Persistent Store

For state that survives page reloads:

```typescript
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  setTheme: (theme: UserPreferences['theme']) => void
  setLanguage: (language: string) => void
}

const usePreferencesStore = create<UserPreferences>()(
  persist(
    (set) => ({
      theme: 'system',
      language: 'en',
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'user-preferences', // unique name in localStorage
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
```

**Why this matters:**
- State automatically saved to localStorage
- Restored on page reload
- Works with sessionStorage too
- Handles serialization automatically

---

## Critical Rules

### Always Do ✅

1. **ALWAYS** use `create<T>()()` (double parentheses) in TypeScript - NOT optional!
2. **ALWAYS** use `useShallow` hook from `zustand/react/shallow` for multiple values
3. **ALWAYS** add `subscribeWithSelector` middleware BEFORE using selector-based subscribe
4. Define separate interfaces for state and actions
5. Use selector functions to extract state slices
6. Use `set` with updater functions: `set((state) => ({ count: state.count + 1 }))`
7. Use unique names for persist middleware storage keys
8. Handle Next.js hydration with `hasHydrated` flag

### Never Do ❌

1. **NEVER** use `create<T>(...)` (single parentheses) in TypeScript - breaks type inference!
2. **NEVER** use v4 `shallow` as second argument - use `useShallow` hook instead!
3. **NEVER** use `store.subscribe(selector, listener)` without `subscribeWithSelector` middleware!
4. Mutate state directly: `set((state) => { state.count++; return state })`
5. Create new objects in selectors: `useStore((state) => ({ a: state.a }))` - infinite renders
6. Use same storage name for multiple stores - data collisions
7. Access localStorage during SSR without hydration check
8. Use Zustand for server state - use TanStack Query instead

### Common Mistakes (v4 → v5 Migration)

| v4 Pattern (WRONG) | v5 Pattern (CORRECT) |
|-------------------|---------------------|
| `create<T>((set) => ...)` | `create<T>()((set) => ...)` |
| `import { shallow } from 'zustand/shallow'` | `import { useShallow } from 'zustand/react/shallow'` |
| `useStore(selector, shallow)` | `useStore(useShallow(selector))` |
| `store.subscribe(selector, listener)` | Add `subscribeWithSelector` middleware first! |

---

## Known Issues Prevention

This skill prevents **5** documented issues:

### Issue #1: Next.js Hydration Mismatch

**Error**: "Text content does not match server-rendered HTML"

**Prevention**:
```typescript
interface StoreWithHydration {
  count: number
  _hasHydrated: boolean
  setHasHydrated: (hydrated: boolean) => void
}

const useStore = create<StoreWithHydration>()(
  persist(
    (set) => ({
      count: 0,
      _hasHydrated: false,
      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),
    }),
    {
      name: 'my-store',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)

// In component
function MyComponent() {
  const hasHydrated = useStore((state) => state._hasHydrated)
  if (!hasHydrated) return <div>Loading...</div>
  return <ActualContent />
}
```

**Complete hydration guide**: [nextjs-hydration.md](references/nextjs-hydration.md)

### Issue #2: TypeScript Double Parentheses Missing

**Error**: Type inference fails with middleware

**Prevention**:
```typescript
// ❌ WRONG - Single parentheses
const useStore = create<MyStore>((set) => ({ ... }))

// ✅ CORRECT - Double parentheses
const useStore = create<MyStore>()((set) => ({ ... }))
```

**Rule**: Always use `create<T>()()` in TypeScript (future-proof for middleware)

### Issue #3: Persist Middleware Import Error

**Error**: "createJSONStorage is not exported from 'zustand/middleware'"

**Prevention**:
```typescript
// ✅ CORRECT imports for v5
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Verify package.json has zustand@5.0.8+
```

### Issue #4: Infinite Render Loop (v5 Critical)

**Error**: Component re-renders infinitely, browser freezes, "Maximum update depth exceeded"

**Prevention** (v5 requires `useShallow` hook):
```typescript
import { useShallow } from 'zustand/react/shallow'

// ❌ WRONG - Creates new object every time (BREAKS in v5!)
const { bears, fishes } = useStore((state) => ({
  bears: state.bears,
  fishes: state.fishes,
}))

// ✅ CORRECT Option 1 - Select primitives separately
const bears = useStore((state) => state.bears)
const fishes = useStore((state) => state.fishes)

// ✅ CORRECT Option 2 - Use useShallow for multiple values (v5)
const { bears, fishes } = useStore(
  useShallow((state) => ({ bears: state.bears, fishes: state.fishes }))
)

// ✅ CORRECT Option 3 - Array destructuring with useShallow
const [bears, fishes] = useStore(
  useShallow((state) => [state.bears, state.fishes])
)
```

**Complete selectors guide**: [selectors-guide.md](references/selectors-guide.md)

### Issue #5: Slices Pattern TypeScript Complexity

**Error**: `StateCreator` types fail to infer

**Prevention**:
```typescript
import { create, StateCreator } from 'zustand'

interface BearSlice {
  bears: number
  addBear: () => void
}

interface FishSlice {
  fishes: number
  addFish: () => void
}

const createBearSlice: StateCreator<
  BearSlice & FishSlice,  // Combined store type
  [],                      // Middleware mutators
  [],                      // Chained middleware
  BearSlice               // This slice's type
> = (set) => ({
  bears: 0,
  addBear: () => set((state) => ({ bears: state.bears + 1 })),
})

const useStore = create<BearSlice & FishSlice>()((...a) => ({
  ...createBearSlice(...a),
  ...createFishSlice(...a),
}))
```

**Complete slices guide**: [middleware-guide.md](references/middleware-guide.md)

---

## Middleware Configuration

### Persist Middleware

```typescript
import { persist, createJSONStorage } from 'zustand/middleware'

const useStore = create<MyStore>()(
  persist(
    (set) => ({
      data: [],
      addItem: (item) => set((state) => ({ data: [...state.data, item] })),
    }),
    {
      name: 'my-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ data: state.data }), // Only persist 'data'
    },
  ),
)
```

### Devtools Middleware

```typescript
import { devtools } from 'zustand/middleware'

const useStore = create<CounterStore>()(
  devtools(
    (set) => ({
      count: 0,
      increment: () =>
        set(
          (state) => ({ count: state.count + 1 }),
          undefined,
          'counter/increment', // Action name in DevTools
        ),
    }),
    { name: 'CounterStore' },
  ),
)
```

### subscribeWithSelector Middleware

**⚠️ PREREQUISITE**: You MUST add this middleware to use selector-based subscriptions!

Without it, `store.subscribe(selector, listener)` does NOT work - base Zustand only supports `subscribe(listener)`.

```typescript
import { subscribeWithSelector } from 'zustand/middleware'

// ❌ WRONG - Base Zustand does NOT support selectors in subscribe!
const useBrokenStore = create<Store>()((set) => ({ theme: 'light' }))
useBrokenStore.subscribe((state) => state.theme, console.log) // FAILS!

// ✅ CORRECT - Add subscribeWithSelector middleware FIRST
const useStore = create<Store>()(
  subscribeWithSelector((set) => ({
    paw: true,
    snout: true,
  }))
)

// NOW selector-based subscribe works
const unsub = useStore.subscribe(
  (state) => state.paw,
  (paw, prevPaw) => console.log('Paw changed:', prevPaw, '->', paw)
)
```

**Complete guide**: [subscribe-with-selector.md](references/subscribe-with-selector.md)

### Combining Middlewares

```typescript
const useStore = create<MyStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        (set) => ({ /* store */ }),
        { name: 'my-storage' },
      )
    ),
    { name: 'MyStore' },
  ),
)
```

**Order matters**: `devtools(subscribeWithSelector(persist(...)))` for full functionality.

**Complete middleware guide**: [middleware-guide.md](references/middleware-guide.md)

---

## Common Patterns

### Async Actions

```typescript
interface AsyncStore {
  data: string | null
  isLoading: boolean
  error: string | null
  fetchData: () => Promise<void>
}

const useAsyncStore = create<AsyncStore>()((set) => ({
  data: null,
  isLoading: false,
  error: null,
  fetchData: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch('/api/data')
      const data = await response.text()
      set({ data, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },
}))
```

### Resetting Store

```typescript
const initialState = { count: 0, name: '' }

const useStore = create<ResettableStore>()((set) => ({
  ...initialState,
  increment: () => set((state) => ({ count: state.count + 1 })),
  reset: () => set(initialState),
}))
```

### Computed Values

```typescript
// Computed in selector, not stored
function ItemCount() {
  const count = useStore((state) => state.items.length)
  return <div>{count} items</div>
}
```

---

## Templates

Ready-to-use templates in `templates/` directory:
- `basic-store.ts` - Minimal JavaScript store
- `typescript-store.ts` - Properly typed TypeScript store
- `persist-store.ts` - localStorage persistence
- `selectors-store.ts` - useShallow, auto-generated selectors (v5 patterns)
- `slices-pattern.ts` - Modular store organization
- `devtools-store.ts` - Redux DevTools integration
- `nextjs-store.ts` - SSR-safe Next.js store
- `computed-store.ts` - Derived state patterns
- `async-actions-store.ts` - Async operations

**Usage:**
```bash
cp ~/.claude/skills/zustand-state-management/templates/typescript-store.ts src/store/
```

---

## References

Complete documentation in `references/`:
- **[middleware-guide.md](references/middleware-guide.md)** - persist, devtools, immer, custom middleware
- **[subscribe-with-selector.md](references/subscribe-with-selector.md)** - Granular subscriptions outside React
- **[selectors-guide.md](references/selectors-guide.md)** - useShallow, auto-generating selectors, performance patterns
- **[typescript-patterns.md](references/typescript-patterns.md)** - Advanced TypeScript patterns
- **[nextjs-hydration.md](references/nextjs-hydration.md)** - SSR, hydration, Next.js best practices
- **[migration-guide.md](references/migration-guide.md)** - Migrating from Redux, Context API, Zustand v4
- **[testing-patterns.md](references/testing-patterns.md)** - Vitest mocks, store reset patterns, component testing

---

## Official Documentation

- **Zustand**: https://zustand.docs.pmnd.rs/
- **GitHub**: https://github.com/pmndrs/zustand
- **TypeScript Guide**: https://zustand.docs.pmnd.rs/guides/typescript
- **Slices Pattern**: https://github.com/pmndrs/zustand/blob/main/docs/guides/slices-pattern.md
