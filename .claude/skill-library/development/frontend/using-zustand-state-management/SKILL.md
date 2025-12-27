---
name: using-zustand-state-management
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

**CRITICAL**: Before creating stores, decide on architecture. Choose between:

1. **Multiple Separate Stores** (Recommended Default) - For isolated concerns
2. **Single Store** - For interdependent state with cross-domain derived values
3. **Avoid Slices Pattern** - Complex TypeScript, use only as last resort

**For complete decision tree and architecture guide, see [Store Architecture Guide](references/store-architecture-guide.md)**

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
import { create } from "zustand";

interface BearStore {
  bears: number;
  increase: (by: number) => void;
  reset: () => void;
}

const useBearStore = create<BearStore>()((set) => ({
  bears: 0,
  increase: (by) => set((state) => ({ bears: state.bears + by })),
  reset: () => set({ bears: 0 }),
}));
```

**CRITICAL**: Notice the **double parentheses** `create<T>()()` - required for TypeScript with middleware.

### 3. Use Store in Components

```tsx
import { useBearStore } from "./store";

function BearCounter() {
  const bears = useBearStore((state) => state.bears);
  return <h1>{bears} around here...</h1>;
}

function Controls() {
  const increase = useBearStore((state) => state.increase);
  return <button onClick={() => increase(1)}>Add bear</button>;
}
```

**Why this works:**

- Components only re-render when their selected state changes
- No Context providers needed
- Selector function extracts specific state slice

### ⚠️ CRITICAL: Always Use Selectors

**Performance Rule**: While selectors are optional in Zustand, they should **ALWAYS** be used. Subscribing to the entire store causes re-renders on ANY state change, even if your component doesn't use that state.

```typescript
// ❌ Bad: Component re-renders on ANY state change
function Counter() {
  const store = useCounterStore();
  return <p>{store.count}</p>;
}

// ✅ Good: Component only re-renders when count changes
function Counter() {
  const count = useCounterStore((state) => state.count);
  return <p>{count}</p>;
}
```

### ⚠️ WARNING: React Server Components

**Next.js 13+ app directory**: Using Zustand in React Server Components is **not recommended**. It can lead to unexpected bugs and privacy issues (shared state across requests).

**Solution**: Use Zustand only in client components after hydration. Mark components with `'use client'` directive.

```typescript
'use client'; // Add this directive

import { useCounterStore } from './store';

export default function Counter() {
  const count = useCounterStore((state) => state.count);
  return <p>{count}</p>;
}
```

---

## The 3-Pattern Setup Process

### Pattern 1: Basic Store (JavaScript)

For simple use cases without TypeScript:

```javascript
import { create } from "zustand";

const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}));
```

**When to use**: Prototyping, small apps, no TypeScript

### Pattern 2: TypeScript Store (Recommended)

For production apps with type safety:

```typescript
import { create } from "zustand";

interface CounterStore {
  count: number;
  increment: () => void;
  decrement: () => void;
}

const useCounterStore = create<CounterStore>()((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}));
```

**Key Points:**

- Separate interface for state + actions
- Use `create<T>()()` syntax (currying for middleware)
- Full IDE autocomplete and type checking

### Pattern 3: Persistent Store

For state that survives page reloads:

```typescript
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface UserPreferences {
  theme: "light" | "dark" | "system";
  language: string;
  setTheme: (theme: UserPreferences["theme"]) => void;
  setLanguage: (language: string) => void;
}

const usePreferencesStore = create<UserPreferences>()(
  persist(
    (set) => ({
      theme: "system",
      language: "en",
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: "user-preferences", // unique name in localStorage
      storage: createJSONStorage(() => localStorage),
    }
  )
);
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

| v4 Pattern (WRONG)                          | v5 Pattern (CORRECT)                                 |
| ------------------------------------------- | ---------------------------------------------------- |
| `create<T>((set) => ...)`                   | `create<T>()((set) => ...)`                          |
| `import { shallow } from 'zustand/shallow'` | `import { useShallow } from 'zustand/react/shallow'` |
| `useStore(selector, shallow)`               | `useStore(useShallow(selector))`                     |
| `store.subscribe(selector, listener)`       | Add `subscribeWithSelector` middleware first!        |

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
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Verify package.json has zustand@5.0.8+
```

### Issue #4: Infinite Render Loop (v5 Critical)

**Error**: Component re-renders infinitely, browser freezes, "Maximum update depth exceeded"

**Prevention** (v5 requires `useShallow` hook):

```typescript
import { useShallow } from "zustand/react/shallow";

// ❌ WRONG - Creates new object every time (BREAKS in v5!)
const { bears, fishes } = useStore((state) => ({
  bears: state.bears,
  fishes: state.fishes,
}));

// ✅ CORRECT Option 1 - Select primitives separately
const bears = useStore((state) => state.bears);
const fishes = useStore((state) => state.fishes);

// ✅ CORRECT Option 2 - Use useShallow for multiple values (v5)
const { bears, fishes } = useStore(
  useShallow((state) => ({ bears: state.bears, fishes: state.fishes }))
);

// ✅ CORRECT Option 3 - Array destructuring with useShallow
const [bears, fishes] = useStore(useShallow((state) => [state.bears, state.fishes]));
```

**Complete selectors guide**: [selectors-guide.md](references/selectors-guide.md)

### Issue #5: Slices Pattern TypeScript Complexity

**Error**: `StateCreator` types fail to infer

**First, ask yourself**: Do you actually need slices? See [Store Architecture Guide](references/store-architecture-guide.md).

**Better alternatives**: Multiple separate stores or single store with extracted action files.

**For complete slices implementation with TypeScript patterns, see [Store Architecture Guide](references/store-architecture-guide.md#slices-pattern-implementation)**

---

## Refactoring Large Stores

When a store exceeds ~300-500 lines, use these refactoring strategies (in order of preference):

1. **Split into Multiple Stores** - Best for independent concerns
2. **Extract Action Logic** - Keep single store, move implementations to separate files
3. **Slices Pattern** - Last resort for interdependent state with single middleware

**For detailed refactoring patterns and examples, see [Store Organization Patterns](references/store-organization-patterns.md)**

---

## Middleware Configuration

### Persist Middleware

```typescript
import { persist, createJSONStorage } from "zustand/middleware";

const useStore = create<MyStore>()(
  persist(
    (set) => ({
      data: [],
      addItem: (item) => set((state) => ({ data: [...state.data, item] })),
    }),
    {
      name: "my-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ data: state.data }), // Only persist 'data'
    }
  )
);
```

### Devtools Middleware

```typescript
import { devtools } from "zustand/middleware";

const useStore = create<CounterStore>()(
  devtools(
    (set) => ({
      count: 0,
      increment: () =>
        set(
          (state) => ({ count: state.count + 1 }),
          undefined,
          "counter/increment" // Action name in DevTools
        ),
    }),
    { name: "CounterStore" }
  )
);
```

### subscribeWithSelector Middleware

**⚠️ PREREQUISITE**: You MUST add this middleware to use selector-based subscriptions!

Without it, `store.subscribe(selector, listener)` does NOT work - base Zustand only supports `subscribe(listener)`.

```typescript
import { subscribeWithSelector } from "zustand/middleware";

// ❌ WRONG - Base Zustand does NOT support selectors in subscribe!
const useBrokenStore = create<Store>()((set) => ({ theme: "light" }));
useBrokenStore.subscribe((state) => state.theme, console.log); // FAILS!

// ✅ CORRECT - Add subscribeWithSelector middleware FIRST
const useStore = create<Store>()(
  subscribeWithSelector((set) => ({
    paw: true,
    snout: true,
  }))
);

// NOW selector-based subscribe works
const unsub = useStore.subscribe(
  (state) => state.paw,
  (paw, prevPaw) => console.log("Paw changed:", prevPaw, "->", paw)
);
```

**Complete guide**: [subscribe-with-selector.md](references/subscribe-with-selector.md)

### Combining Middlewares

```typescript
const useStore = create<MyStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        (set) => ({
          /* store */
        }),
        { name: "my-storage" }
      )
    ),
    { name: "MyStore" }
  )
);
```

**Order matters**: `devtools(subscribeWithSelector(persist(...)))` for full functionality.

**Complete middleware guide**: [middleware-guide.md](references/middleware-guide.md)

---

## Common Patterns

For detailed patterns including async actions, separating actions from state, store reset, and computed values, see [Store Organization Patterns](references/store-organization-patterns.md).

---

## Templates

Ready-to-use templates available in `templates/` directory for basic stores, TypeScript stores, persistent stores, selectors, slices, devtools, Next.js SSR, and async actions.

## References

**`references/`** directory contains complete documentation for middleware, selectors, TypeScript patterns, Next.js SSR/hydration, migrations, testing, and store organization.

## Official Documentation

**Zustand**: https://zustand.docs.pmnd.rs/ | **GitHub**: https://github.com/pmndrs/zustand

## Architecture Guidance

Based on Zustand maintainer discussions (GitHub #2496, #2347, #895, #2486, #2491, #1796), architecture recommendations prioritize multiple isolated stores over single stores with slices, except when cross-store derived values are required.

## Related Skills

- **`using-modern-react-patterns`** - React 19 patterns with selector enforcement
- **`designing-frontend-architecture`** - When to choose Zustand vs TanStack Query
- **`using-tanstack-query`** - Server state management with TanStack Query

## Related Libraries

- **[Valtio](https://github.com/pmndrs/valtio)** - Proxy-based state (consider instead of Zustand + Immer)
- **[Jotai](https://github.com/pmndrs/jotai)** - Atomic state management
- **[zustand-slices](https://github.com/zustandjs/zustand-slices)** - TypeScript-friendly slices helper
- **[Mutative](https://github.com/unadlib/mutative)** - 10x faster Immer alternative
