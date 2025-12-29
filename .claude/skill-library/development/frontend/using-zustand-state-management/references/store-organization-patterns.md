# Store Organization Patterns

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
import { blockActions } from "./actions/blockActions";
import { filterActions } from "./actions/filterActions";
import { executionActions } from "./actions/executionActions";

const useQueryBuilderStore = create<State>()(
  immer((set, get) => ({
    // State shape
    blocks: [],
    filters: [],
    execution: { status: "idle" },

    // Actions delegated to separate files
    ...blockActions(set, get),
    ...filterActions(set, get),
    ...executionActions(set, get),
  }))
);

// store/actions/blockActions.ts (~200 lines)
export const blockActions = (set: SetFn, get: GetFn) => ({
  addBlock: (type: EntityType) =>
    set((state) => {
      /* ... */
    }),
  removeBlock: (id: string) =>
    set((state) => {
      /* ... */
    }),
  updateBlock: (id: string, updates: Partial<Block>) =>
    set((state) => {
      /* ... */
    }),
});
```

**When to use**: State is interdependent but store file is too large to navigate.

### Option 3: Slices Pattern (Last Resort)

Only if you need both:

- Cross-slice state access within actions
- Single middleware instance across all state

See main skill for implementation details.

### Evaluating QueryBuilder-Style Stores

For complex UI state like query builders:

| Question                                       | If Yes                      | If No                        |
| ---------------------------------------------- | --------------------------- | ---------------------------- |
| Does execution state need query state?         | Single store                | Separate `useExecutionStore` |
| Does persistence need all state?               | Single store + `partialize` | Separate stores              |
| Do components use state from multiple domains? | Likely single store         | Likely multiple stores       |

**Key insight**: The QueryBuilder's 1,400+ line store uses Immer because it has deeply nested state (blocks → filterGroups → filters). This is a valid Immer use case. The size issue is about organization, not middleware choice.

## Common Patterns

### Async Actions

```typescript
interface AsyncStore {
  data: string | null;
  isLoading: boolean;
  error: string | null;
  fetchData: () => Promise<void>;
}

const useAsyncStore = create<AsyncStore>()((set) => ({
  data: null,
  isLoading: false,
  error: null,
  fetchData: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("/api/data");
      const data = await response.text();
      set({ data, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
}));
```

### Separating Actions from State (Recommended Pattern)

**Best Practice:** Organize actions into a separate object for cleaner consumption and easier testing. Keep business logic in the store, not in components.

```typescript
import { create } from 'zustand';

interface CounterState {
  count: number;
  user: User | null;
  actions: {
    increment: () => void;
    decrement: () => void;
    reset: () => void;
    setUser: (user: User | null) => void;
  };
}

const useCounterStore = create<CounterState>((set) => ({
  // State
  count: 0,
  user: null,

  // Actions (grouped)
  actions: {
    increment: () => set((state) => ({ count: state.count + 1 })),
    decrement: () => set((state) => ({ count: state.count - 1 })),
    reset: () => set({ count: 0 }),
    setUser: (user) => set({ user }),
  },
}));

// Usage: Clean separation between state and actions
function Counter() {
  const count = useCounterStore((state) => state.count);
  const { increment, decrement, reset } = useCounterStore((state) => state.actions);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

**Why this pattern?**

- **Cleaner API**: `useStore((s) => s.actions)` is more explicit than mixing state and actions
- **Easier testing**: Actions are grouped and can be tested independently
- **Better organization**: Clear separation of concerns between state and behavior
- **Redux-style**: Follows Redux style guide principle of keeping business logic in the store

### Resetting Store

```typescript
const initialState = { count: 0, name: "" };

const useStore = create<ResettableStore>()((set) => ({
  ...initialState,
  increment: () => set((state) => ({ count: state.count + 1 })),
  reset: () => set(initialState),
}));
```

### Computed Values

```typescript
// Computed in selector, not stored
function ItemCount() {
  const count = useStore((state) => state.items.length)
  return <div>{count} items</div>
}
```

## Related

- [Main Skill](../SKILL.md) - Store architecture decisions and setup
- [Middleware Guide](middleware-guide.md) - persist, devtools, immer middleware
- [Selectors Guide](selectors-guide.md) - Performance optimization with selectors
