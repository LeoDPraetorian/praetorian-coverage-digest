# Zustand Middleware Complete Guide

Complete reference for all Zustand middleware. Load when user asks about persistence, devtools, immer, or custom middleware.

---

## Persist Middleware

### Basic Usage

```typescript
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const useStore = create<Store>()(
  persist(
    (set) => ({
      /* store */
    }),
    { name: "storage-name" }
  )
);
```

### Storage Options

```typescript
// localStorage (default)
storage: createJSONStorage(() => localStorage);

// sessionStorage
storage: createJSONStorage(() => sessionStorage);

// Custom storage
storage: createJSONStorage(() => customStorage);
```

### Partial Persistence

```typescript
persist(
  (set) => ({
    /* store */
  }),
  {
    name: "storage",
    partialize: (state) => ({
      theme: state.theme,
      // Don't persist sensitive data
    }),
  }
);
```

### Schema Migration

```typescript
persist(
  (set) => ({
    /* store */
  }),
  {
    name: "storage",
    version: 2,
    migrate: (persistedState: any, version) => {
      if (version === 0) {
        // v0 → v1
        persistedState.newField = "default";
      }
      if (version === 1) {
        // v1 → v2
        delete persistedState.oldField;
      }
      return persistedState;
    },
  }
);
```

---

## Devtools Middleware

### Basic Usage

```typescript
import { devtools } from "zustand/middleware";

const useStore = create<Store>()(
  devtools(
    (set) => ({
      /* store */
    }),
    { name: "StoreName" }
  )
);
```

### Named Actions

```typescript
increment: () =>
  set(
    (state) => ({ count: state.count + 1 }),
    undefined,
    "counter/increment" // Shows in DevTools
  );
```

### Production Toggle

```typescript
devtools(
  (set) => ({
    /* store */
  }),
  {
    name: "Store",
    enabled: process.env.NODE_ENV === "development",
  }
);
```

---

## Immer Middleware

### Do You Actually Need Immer?

**IMPORTANT**: Zustand's `set()` already does shallow merging. You often don't need Immer.

```typescript
// ✅ Zustand's set() handles this WITHOUT Immer
set({ count: state.count + 1 }); // Shallow merge built-in
set({ user: { ...state.user, name } }); // One level deep is easy

// ⚠️ Immer ONLY helps with deeply nested updates (3+ levels)
set((state) => ({
  ...state,
  level1: {
    ...state.level1,
    level2: {
      ...state.level2,
      level3: {
        ...state.level3,
        value: newValue, // This is painful without Immer
      },
    },
  },
}));
```

### When to Use Immer

| Scenario                                 | Use Immer?                                 |
| ---------------------------------------- | ------------------------------------------ |
| Flat state (primitives, shallow objects) | ❌ No - overhead not worth it              |
| 1-2 levels of nesting                    | ❌ No - spread operator is fine            |
| 3+ levels of nesting                     | ✅ Yes - reduces boilerplate significantly |
| Frequent array mutations (push, splice)  | ✅ Yes - cleaner syntax                    |
| Performance-critical hot paths           | ❌ No - Immer is 2-3x slower               |

### Performance Considerations

From [Immer docs](https://immerjs.github.io/immer/performance/):

> "Immer with proxies is roughly speaking **2-3x slower** than a handwritten reducer"

However, Immer can detect "no-op" changes and skip unnecessary updates, which can sometimes make it faster in practice.

**Alternative**: [Mutative](https://github.com/unadlib/mutative) is 10x faster than Immer with similar API.

### Basic Usage (When You Actually Need It)

```typescript
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

// ⚠️ REQUIRES: npm install immer (peer dependency, not bundled!)

const useStore = create<Store>()(
  immer((set) => ({
    deeply: { nested: { todos: [] } },
    addTodo: (text) =>
      set((state) => {
        // Mutate directly - Immer handles immutability
        state.deeply.nested.todos.push({ id: Date.now(), text });
      }),
  }))
);
```

### TypeScript + Immer Gotchas

```typescript
// ❌ WRONG - void return not properly typed in some versions
set((state) => {
  state.count++;
  // TypeScript may complain about void return
});

// ✅ CORRECT - explicit no return or return nothing
set((state) => {
  state.count++;
  return; // Explicit return
});

// ✅ ALSO CORRECT - return the draft (though unnecessary)
set((state) => {
  state.count++;
  return state;
});
```

### Consider Valtio Instead

If you want mutation-style updates throughout your app, **consider [Valtio](https://github.com/pmndrs/valtio)** instead of Zustand + Immer:

- Same maintainers (Poimandres)
- Built-in proxy-based mutations
- Automatic render optimization
- No middleware needed

```typescript
// Valtio - mutation is the default
import { proxy, useSnapshot } from 'valtio'

const state = proxy({ count: 0, nested: { value: 1 } })

// Mutate anywhere, anytime
state.count++
state.nested.value = 2

// React component
function Counter() {
  const snap = useSnapshot(state)
  return <div>{snap.count}</div>
}
```

---

## Combining Middlewares

### Order Matters

```typescript
// ✅ CORRECT: devtools wraps persist
const useStore = create<Store>()(
  devtools(
    persist(
      (set) => ({
        /* store */
      }),
      { name: "storage" }
    ),
    { name: "Store" }
  )
);

// Shows persist actions in DevTools
```

### Common Combinations

```typescript
// Persist + Devtools
devtools(persist(...), { name: 'Store' })

// Persist + Immer
persist(immer(...), { name: 'storage' })

// All three
devtools(
  persist(
    immer(...),
    { name: 'storage' }
  ),
  { name: 'Store' }
)
```

---

## Custom Middleware

### Logger Example

```typescript
const logger = (config) => (set, get, api) => {
  return config(
    (...args) => {
      console.log("Before:", get());
      set(...args);
      console.log("After:", get());
    },
    get,
    api
  );
};

const useStore = create(
  logger((set) => ({
    /* store */
  }))
);
```

### TypeScript Logger

```typescript
import { StateCreator } from "zustand";

type Logger = <T>(f: StateCreator<T, [], []>, name?: string) => StateCreator<T, [], []>;

const logger: Logger = (f, name) => (set, get, store) => {
  const loggedSet: typeof set = (...a) => {
    set(...(a as Parameters<typeof set>));
    console.log(`[${name}]:`, get());
  };
  return f(loggedSet, get, store);
};
```

---

## Middleware API Reference

### persist()

```typescript
persist<T>(
  stateCreator: StateCreator<T>,
  options: {
    name: string                    // Storage key (required)
    storage?: PersistStorage<T>     // Storage engine
    partialize?: (state: T) => Partial<T>  // Select what to persist
    version?: number                // Schema version
    migrate?: (state: any, version: number) => T  // Migration function
    merge?: (persisted: any, current: T) => T     // Custom merge
    onRehydrateStorage?: (state: T) => void       // Hydration callback
  }
)
```

### devtools()

```typescript
devtools<T>(
  stateCreator: StateCreator<T>,
  options?: {
    name?: string      // Store name in DevTools
    enabled?: boolean  // Enable/disable
  }
)
```

### immer()

```typescript
immer<T>(
  stateCreator: StateCreator<T>
)
```

---

## Common Patterns

### Reset Store

```typescript
const initialState = { count: 0 };

const useStore = create<Store>()(
  persist(
    (set) => ({
      ...initialState,
      reset: () => set(initialState),
    }),
    { name: "storage" }
  )
);
```

### Clear Persisted Data

```typescript
// Clear localStorage
localStorage.removeItem("storage-name");

// Or programmatically
const useStore = create<Store>()(
  persist(
    (set) => ({
      clearStorage: () => {
        localStorage.removeItem("storage-name");
        set(initialState);
      },
    }),
    { name: "storage-name" }
  )
);
```

---

## Official Documentation

- **Persist**: https://github.com/pmndrs/zustand/blob/main/docs/integrations/persisting-store-data.md
- **Devtools**: https://github.com/pmndrs/zustand/blob/main/docs/middlewares/devtools.md
- **Immer**: https://github.com/pmndrs/zustand/blob/main/docs/middlewares/immer.md
