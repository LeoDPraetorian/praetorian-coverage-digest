---
name: frontend-zustand-state-management
description: Use when implementing Zustand state management - store architecture decisions, TypeScript patterns, persistence, selectors, or Next.js SSR hydration
allowed-tools: Read, Grep, Bash, TodoWrite
---

# Zustand State Management

**Status**: Production Ready ✅
**Last Updated**: 2025-12-08
**Latest Version**: zustand@5.0.8
**Dependencies**: React 18+ (React 19 compatible), TypeScript 4.5+

---

## Store Architecture Decision Tree

**CRITICAL**: Before creating stores, decide on architecture. This is the most important decision.

```
Is your state isolated (never needs to interact with other state)?
├── YES → Use MULTIPLE SEPARATE STORES (simpler, better isolation)
│         Example: useAuthStore, useUIStore, usePreferencesStore
│
└── NO → Does state need cross-store derived values or coordinated updates?
         ├── YES → Use SINGLE STORE (with or without logical grouping)
         │         Consider: Extract action logic to separate files, not slices
         │
         └── MAYBE → Start with MULTIPLE STORES, merge later if needed
                     (Merging stores is easier than splitting them)
```

### When to Use Multiple Stores (Recommended Default)

```typescript
// ✅ PREFERRED: Separate stores for isolated concerns
const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  login: (user) => set({ user }),
  logout: () => set({ user: null }),
}))

const useUIStore = create<UIStore>()((set) => ({
  sidebarOpen: true,
  theme: 'dark',
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}))

const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({ language: 'en', setLanguage: (l) => set({ language: l }) }),
    { name: 'preferences' }
  )
)
```

**Benefits**: Simpler types, better code splitting, clearer ownership, easier testing.

### When to Use Single Store

- State needs **cross-domain derived values** (hard with multiple stores)
- Actions must **update multiple domains atomically**
- You need **single middleware instance** (one persist, one devtools)

```typescript
// Single store when domains are interdependent
const useAppStore = create<AppStore>()((set, get) => ({
  // Auth domain
  user: null,
  login: (user) => set({ user }),

  // Preferences domain (depends on user)
  preferences: {},
  loadUserPreferences: async () => {
    const user = get().user
    if (!user) return
    const prefs = await fetchPrefs(user.id)
    set({ preferences: prefs })
  },
}))
```

### Why NOT Slices Pattern (Usually)

The slices pattern is **complex and error-prone** with TypeScript:

| Issue | Impact |
|-------|--------|
| `StateCreator` requires 4 generic parameters | Complex, hard to understand |
| Each slice must know the combined type | Tight coupling, circular dependencies |
| Middleware can't be per-slice | Must wrap entire store |
| Cross-slice access requires full type | Defeats isolation purpose |
| TypeScript errors are cryptic | Hard to debug |

**Use slices only when**: You have a genuinely massive store AND concerns are interdependent AND you've tried multiple stores first.

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

**First, ask yourself**: Do you actually need slices? See [Store Architecture Decision Tree](#store-architecture-decision-tree).

**Better alternatives**:
1. **Multiple separate stores** - simpler, better isolation
2. **Single store with extracted action files** - keeps store file small without slice complexity
3. **Slices** - only when you've exhausted other options

**If you must use slices** (interdependent state, single middleware requirement):

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

// ⚠️ Each slice must know the COMBINED type - this is the pain point
const createBearSlice: StateCreator<
  BearSlice & FishSlice,  // Combined store type (ALL slices)
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

**Why this is painful**:
- Each slice must import the combined type → circular dependency risk
- Adding a new slice requires updating ALL slice type parameters
- TypeScript errors are cryptic when types don't align
- Middleware must wrap the combined store, not individual slices

**Third-party alternative**: [zustand-slices](https://github.com/zustandjs/zustand-slices) library simplifies typing

---

## Refactoring Large Stores

When a store exceeds ~300-500 lines, consider these approaches **in order of preference**:

### Option 1: Split into Multiple Stores (Best)

If concerns are actually independent, split them:

```typescript
// Before: 1000+ line monolithic store
const useAppStore = create<AppState>()((set) => ({
  // Auth (200 lines)
  // UI (150 lines)
  // Query builder (400 lines)
  // Execution (250 lines)
}))

// After: Multiple focused stores
const useAuthStore = create<AuthState>()(...)      // 200 lines
const useUIStore = create<UIState>()(...)          // 150 lines
const useQueryStore = create<QueryState>()(...)    // 400 lines
const useExecutionStore = create<ExecState>()(..)) // 250 lines
```

**When to use**: Concerns don't need coordinated updates or cross-store derived values.

### Option 2: Extract Action Logic (Keep Single Store)

Keep the store definition small, move action implementations to separate files:

```typescript
// store/queryBuilderStore.ts (~150 lines - state shape + action signatures)
import { blockActions } from './actions/blockActions'
import { filterActions } from './actions/filterActions'
import { executionActions } from './actions/executionActions'

const useQueryBuilderStore = create<State>()(
  immer((set, get) => ({
    // State shape
    blocks: [],
    filters: [],
    execution: { status: 'idle' },

    // Actions delegated to separate files
    ...blockActions(set, get),
    ...filterActions(set, get),
    ...executionActions(set, get),
  }))
)

// store/actions/blockActions.ts (~200 lines)
export const blockActions = (set: SetFn, get: GetFn) => ({
  addBlock: (type: EntityType) => set(state => { /* ... */ }),
  removeBlock: (id: string) => set(state => { /* ... */ }),
  updateBlock: (id: string, updates: Partial<Block>) => set(state => { /* ... */ }),
})
```

**When to use**: State is interdependent but store file is too large to navigate.

### Option 3: Slices Pattern (Last Resort)

Only if you need both:
- Cross-slice state access within actions
- Single middleware instance across all state

See [Issue #5](#issue-5-slices-pattern-typescript-complexity) for implementation.

### Evaluating QueryBuilder-Style Stores

For complex UI state like query builders:

| Question | If Yes | If No |
|----------|--------|-------|
| Does execution state need query state? | Single store | Separate `useExecutionStore` |
| Does persistence need all state? | Single store + `partialize` | Separate stores |
| Do components use state from multiple domains? | Likely single store | Likely multiple stores |

**Key insight**: The QueryBuilder's 1,400+ line store uses Immer because it has deeply nested state (blocks → filterGroups → filters). This is a valid Immer use case. The size issue is about organization, not middleware choice.

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
- **Updating State**: https://zustand.docs.pmnd.rs/guides/updating-state
- **Immer Middleware**: https://zustand.docs.pmnd.rs/integrations/immer-middleware

## Architecture Guidance (Maintainer Discussions)

These GitHub discussions inform the architecture recommendations in this skill:

- **[Multiple Stores vs Single Store #2496](https://github.com/pmndrs/zustand/discussions/2496)** - dai-shi: "If two things are totally isolated, multiple stores would be good"
- **[Why Use Bounded Stores + Slices? #2347](https://github.com/pmndrs/zustand/discussions/2347)** - "it's not meaningfully different in practice" (performance)
- **[Why Split into Slices? #895](https://github.com/pmndrs/zustand/discussions/895)** - Cross-store derived values are hard
- **[Good Practice: One Store or Separate? #2486](https://github.com/pmndrs/zustand/discussions/2486)** - Practical guidance
- **[TypeScript + Slices Issues #2491](https://github.com/pmndrs/zustand/discussions/2491)** - StateCreator typing problems
- **[TypeScript + Immer + Slices #1796](https://github.com/pmndrs/zustand/discussions/1796)** - void return type issues

## Related Libraries

- **[Valtio](https://github.com/pmndrs/valtio)** - Proxy-based state (consider instead of Zustand + Immer)
- **[Jotai](https://github.com/pmndrs/jotai)** - Atomic state management
- **[zustand-slices](https://github.com/zustandjs/zustand-slices)** - TypeScript-friendly slices helper
- **[Mutative](https://github.com/unadlib/mutative)** - 10x faster Immer alternative
