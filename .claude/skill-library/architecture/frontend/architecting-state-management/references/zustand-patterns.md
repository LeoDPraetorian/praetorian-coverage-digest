# Zustand + Immer Patterns

**Advanced patterns for complex feature state with Zustand and Immer middleware.**

## When to Use Zustand (Rare!)

Zustand should only be used when Context becomes unwieldy:

- ✅ Deeply nested state benefiting from Immer's mutable syntax
- ✅ Many related actions (20+) needing co-location
- ✅ Complex validation and derived state
- ✅ State that doesn't fit URL parameters

**Industry guidance** (State Management in 2025):

> "Start with Context. Add TanStack Query for server data. Only reach for Zustand when you have a specific problem that Context doesn't solve."

**Chariot Platform**: Only 1 Zustand store (Query Builder). 90% of state uses Context.

## The Query Builder Case Study

**Location**: `modules/chariot/ui/src/sections/insights/queryBuilder/state/queryBuilderStore.ts`

**Lines**: ~800 lines

**Why Zustand here** (and not Context):

1. **Deep nesting**: `blocks[].filterGroups[].filters[]` - Immer simplifies updates
2. **Many actions**: 30+ coordinated actions for query manipulation
3. **Complex validation**: Cross-field validation across nested structures
4. **Change detection**: `lastSavedState` comparison for "unsaved changes" warning
5. **Performance**: Fine-grained selectors prevent unnecessary re-renders

### State Shape

```typescript
interface QueryBuilderState {
  // Core query structure
  blocks: EntityBlock[];                    // Entity blocks with filters
  relationshipDividers: RelationshipDivider[];  // Connections between blocks
  pathOptions: PathOptions;                 // Graph path configuration

  // Context from React (filter options)
  context: QueryBuilderContextData | null;

  // Validation
  validationResult: ValidationResult | null;
  hasAttemptedRun: boolean;

  // Saved query management
  currentLoadedQueryId: string | null;
  loadedQueryData: SavedQuery | null;
  lastSavedState: SavedQueryState | null;   // For change detection

  // UI state
  selectedUsernames: string[];
  activeTab: 'queries' | 'guide';
  isSidebarCollapsed: boolean;
  sidebarWidth: number;
  expandedFolders: QueryFolderType[];

  // Actions
  actions: { /* 30+ action methods */ };
}
```

## Zustand + Immer Setup

```typescript
import { immer } from 'zustand/middleware/immer';
import { createWithEqualityFn } from 'zustand/traditional';

export const useQueryBuilderStore = createWithEqualityFn<QueryBuilderState>()(
  immer((set) => ({
    blocks: [],
    relationshipDividers: [],
    pathOptions: defaultPathOptions,
    context: null,
    validationResult: null,

    actions: {
      addFilter: (blockId: string, groupId: string) =>
        set((state) => {
          // Immer allows "mutable" syntax - actually creates immutable copy
          const block = state.blocks.find((b) => b.id === blockId);
          if (!block) return;

          const group = block.filterGroups.find((g) => g.id === groupId);
          if (!group) return;

          // Direct mutation with Immer
          group.filters.push({
            id: generateId(),
            hasBeenValidated: false,
          });
        }),

      updateFilter: (blockId, groupId, filterId, updates) =>
        set((state) => {
          const block = state.blocks.find((b) => b.id === blockId);
          if (!block) return;
          const group = block.filterGroups.find((g) => g.id === groupId);
          if (!group) return;
          const filter = group.filters.find((f) => f.id === filterId);
          if (!filter) return;

          // Immer handles the immutability
          Object.assign(filter, updates);
        }),

      // ... 28 more actions
    },
  }))
);
```

## Selector Pattern (Critical for Performance)

**Without selectors**, components re-render on ANY state change. **With selectors**, components only re-render when their specific slice changes.

### ✅ Good - Selective Subscription

```typescript
// Component only re-renders when blocks changes
const blocks = useQueryBuilderStore((state) => state.blocks);
const addFilter = useQueryBuilderStore((state) => state.actions.addFilter);
```

### ❌ Bad - Subscribes to Entire Store

```typescript
// Component re-renders on ANY state change
const store = useQueryBuilderStore();
const blocks = store.blocks;
```

**Industry guidance** (Zustand Performance Guide 2025):

> "Each call to useStore(selector) subscribes your component only to the selected slice... Design selectors first. Performance follows state shape and selection strategy."

### Selector with Equality Function

For objects/arrays, use custom equality:

```typescript
import { shallow } from 'zustand/shallow';

// Only re-render if array contents change (not reference)
const selectedUsernames = useQueryBuilderStore(
  (state) => state.selectedUsernames,
  shallow
);
```

## Deep Clone Pattern (Critical for Change Detection)

When comparing state for "unsaved changes", you MUST deep clone to prevent reference leaks.

### ❌ Anti-Pattern: Reference Leak

```typescript
// ❌ BAD - stores reference, not copy
markAsSaved: (savedState) =>
  set((state) => {
    state.lastSavedState = savedState; // Reference to mutable object!
  });
```

**Problem**: If `savedState.blocks` mutates later, `lastSavedState` changes too → change detection breaks.

### ✅ Correct Pattern: Deep Clone

```typescript
// ✅ GOOD - deep clone for comparison
markAsSaved: (savedState: SavedQueryState) =>
  set((state) => {
    // CRITICAL: Deep clone to prevent reference leaks
    const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

    state.lastSavedState = {
      blocks: clone(savedState.blocks),
      relationshipDividers: clone(savedState.relationshipDividers),
      selectedUsernames: [...savedState.selectedUsernames], // Shallow OK for primitives
      interGroupOperators: [...savedState.interGroupOperators],
      pathOptions: { ...savedState.pathOptions },
    };
  });
```

**Industry validation** (Zustand + Immer Guide):

> "A common mistake when working with Immer is reassigning state or nested objects within the draft, which can break Immer's internal mechanism."

## Context Injection Pattern

**Problem**: Zustand store needs access to React Query data (filter options).

**Solution**: Inject Context data into Zustand store.

### In QueryBuilderContext.tsx:

```typescript
const QueryBuilderContext = () => {
  // Get filter options from TanStack Query
  const assetFilterOptions = useQuery({
    queryKey: ['asset-filter-options'],
    queryFn: getAssetFilterOptions,
  });

  const value = useMemo(() => ({
    assetFilterOptions,
    // ... other options
  }), [assetFilterOptions]);

  // Inject into Zustand store
  React.useEffect(() => {
    useQueryBuilderStore.getState().actions.setContext(value);
  }, [value]);

  return <QueryBuilderContext.Provider value={value}>...</QueryBuilderContext.Provider>;
};
```

### In Store Actions:

```typescript
actions: {
  addFilter: (blockId, groupId) =>
    set((state) => {
      // Access injected context
      const { context } = state;
      const filterOptions = context?.assetFilterOptions;

      // Use options for validation...
      const block = state.blocks.find((b) => b.id === blockId);
      // ...
    }),
}
```

**Why this pattern**: Zustand doesn't have React hooks inside actions. Context injection bridges the gap.

## Middleware Stack

```typescript
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { persist } from 'zustand/middleware';

export const useStore = createWithEqualityFn<State>()(
  devtools(              // Redux DevTools integration
    persist(             // LocalStorage persistence
      immer((set) => ({  // Immer for mutable syntax
        // Store definition
      })),
      { name: 'my-store' }
    )
  )
);
```

**Common middleware**:

- `immer` - Mutable syntax for nested updates
- `devtools` - Redux DevTools integration (debugging)
- `persist` - LocalStorage/SessionStorage persistence
- `subscribeWithSelector` - Subscribe to specific slices

## When NOT to Use Zustand

### ❌ Simple State

```typescript
// ❌ BAD - overkill for boolean
const useModalStore = create((set) => ({
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
}));
```

**Fix**: Use Context or useState:

```typescript
// ✅ GOOD - simple Context
const ModalContext = createContext();
```

### ❌ Server State

```typescript
// ❌ BAD - manual cache management
const useAssetStore = create((set) => ({
  assets: [],
  fetchAssets: async () => {
    const data = await api.getAssets();
    set({ assets: data });
  },
}));
```

**Fix**: Use TanStack Query for server state:

```typescript
// ✅ GOOD - automatic caching, refetching
const { data: assets } = useQuery({
  queryKey: ['assets'],
  queryFn: api.getAssets,
});
```

### ❌ Multiple Stores That Communicate

```typescript
// ❌ BAD - stores need to sync
const useUserStore = create(...);
const useSettingsStore = create(...);

// UserStore needs to update SettingsStore → tight coupling
```

**Fix**: Use single Context or combine into one Zustand store.

## Performance Benchmarks (2025)

**From industry research**:

- Context (optimized): ~95ms average update time
- Zustand with selectors: ~85ms average update time
- Context (unoptimized): ~280ms average update time

**Takeaway**: Properly optimized Context performs nearly as well as Zustand. The decision should be based on complexity, not performance alone.

**Multi-selection benchmark** (real-world):

> "A multi-selection group component using local state passed down with React Context became sluggish whenever an item was selected as soon as there were fifty or more items. The team fixed this huge performance problem by moving from useState + context to Zustand."

## Common Anti-Patterns

### ❌ Forgetting Selectors

```typescript
// ❌ BAD - re-renders on all changes
function Component() {
  const store = useStore();
  return <div>{store.user.name}</div>;
}
```

**Fix**: Use selector:

```typescript
// ✅ GOOD - only re-renders when user.name changes
function Component() {
  const userName = useStore((state) => state.user.name);
  return <div>{userName}</div>;
}
```

### ❌ Reference Leak in Comparisons

```typescript
// ❌ BAD - reference, not copy
state.lastSavedState = state.currentState;
```

**Fix**: Deep clone:

```typescript
// ✅ GOOD - deep clone
state.lastSavedState = JSON.parse(JSON.stringify(state.currentState));
```

### ❌ Over-Using Zustand

If you have 5+ Zustand stores, you probably should have used Context for some of them.

**Chariot example**: 1 Zustand store (Query Builder), 12 Context providers.

## Sources

- [State Management in 2025](https://dev.to/hijazi313/state-management-in-2025-when-to-use-context-redux-zustand-or-jotai-2d2k)
- [Zustand Performance Guide 2025](https://www.reactlibraries.com/blog/zustand-vs-jotai-vs-valtio-performance-guide-2025)
- [Zustand + Immer Guide](https://blog.dushyanth.in/mastering-state-management-with-zustand-and-immer-a-guide-to-efficient-state-updates)
- [Zustand and React Context - TkDodo](https://tkdodo.eu/blog/zustand-and-react-context)
