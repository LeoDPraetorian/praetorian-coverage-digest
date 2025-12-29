# Frontend State Management Architecture

**Purpose**: This document provides authoritative guidance for the frontend-architect agent on when and how to use each state management solution in the Chariot UI codebase.

**Last Updated**: 2025-12-25
**Applies To**: `modules/chariot/ui/src/`

---

## Executive Summary

The Chariot UI uses a **four-tier state management architecture** optimized for different state characteristics:

| Tier                    | Solution                    | Use Case                     | Token Count |
| ----------------------- | --------------------------- | ---------------------------- | ----------- |
| **Server State**        | TanStack Query 5.90.8       | API data, caching, mutations | 516+ usages |
| **Global Client State** | React Context (13 contexts) | Auth, theme, drawers, modals | Primary     |
| **Complex Local State** | Zustand + Immer             | Query Builder feature only   | 1 store     |
| **Reducer Pattern**     | useReducer                  | GraphStateProvider only      | 1 usage     |

**Key Principle**: Use the simplest solution that meets requirements. TanStack Query handles server state; Context handles cross-cutting concerns; Zustand reserved for exceptional complexity.

---

## Tier 1: TanStack Query (Server State)

### When to Use

TanStack Query is the **primary and mandatory** choice for:

- ✅ All API data fetching (GET requests)
- ✅ All mutations (POST, PUT, DELETE)
- ✅ Data that needs caching
- ✅ Loading/error states for async operations
- ✅ Pagination and infinite scroll
- ✅ Background refetching
- ✅ Optimistic updates

### Current Implementation

**Global Configuration** (`queryclient.ts:4-6`):

```typescript
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: mToMs(5) } }, // 5 minute staleTime
});
```

**Usage Statistics**:

- 516+ total hook usages across codebase
- 48 occurrences in `/src/hooks/` alone
- Custom hooks: `useAssets`, `useRisks`, `useSeeds`, `useJobs`, etc.

### Query Key Conventions

```typescript
// Entity-based keys (hierarchical)
["assets"][("assets", { status: "active" })][("assets", assetId)][("assets", assetId, "risks")][ // All assets // Filtered // Single entity // Nested relationship
  // User-scoped keys (impersonation safety)
  ("assets", userId, filters)
]; // Include user for cache isolation
```

### Standard Patterns

**Query Pattern**:

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ["resource", userId, filters],
  queryFn: () => api.getResource(userId, filters),
  staleTime: 30000, // Override default when needed
});
```

**Mutation with Invalidation**:

```typescript
const { mutate } = useMutation({
  mutationFn: api.updateResource,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["resource"] });
  },
});
```

**Optimistic Update**:

```typescript
const { mutate } = useMutation({
  mutationFn: api.updateResource,
  onMutate: async (variables) => {
    await queryClient.cancelQueries({ queryKey: ["resource"] });
    const previous = queryClient.getQueryData(["resource"]);
    queryClient.setQueryData(["resource"], variables);
    return { previous };
  },
  onError: (_err, _vars, context) => {
    queryClient.setQueryData(["resource"], context.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ["resource"] });
  },
});
```

### Anti-Patterns (Never Do)

- ❌ Copying query data to useState (defeats caching)
- ❌ Manual fetch with useEffect for API calls
- ❌ Storing server state in Context or Zustand
- ❌ Calling invalidateQueries in render (infinite loops)

---

## Tier 2: React Context (Global Client State)

### When to Use

React Context is the **primary choice** for client-side state that needs to be:

- ✅ Shared across many unrelated components
- ✅ Accessed application-wide (auth, theme)
- ✅ Synced with URL parameters (drawers, tabs)
- ✅ Simple to moderate complexity

### The 12 Contexts in Chariot UI

| Context                   | Location                      | Purpose                                  | Lines    |
| ------------------------- | ----------------------------- | ---------------------------------------- | -------- |
| **GlobalStateContext**    | `state/global.state.tsx`      | Modals, drawer stack, keyboard listeners | ~1048    |
| **AuthContext**           | `state/auth.tsx`              | Authentication, impersonation, JWT       | ~654     |
| **ThemeContext**          | `app/ThemeContext.tsx`        | Light/dark/system toggle                 | ~99      |
| **QueryBuilderContext**   | `queryBuilder/state/`         | Filter options for Query Builder         | Provider |
| **GraphStateProvider**    | `nodeGraph/core/`             | Graph visualization UI state             | ~660     |
| **GraphDataProvider**     | `nodeGraph/core/`             | Graph data management                    | Provider |
| **GraphInstanceProvider** | `nodeGraph/core/`             | Graph instance references                | Provider |
| **PathGraphProvider**     | `queryBuilder/pathGraph/`     | Path graph visualization                 | Provider |
| **CellFiltersContext**    | `asset/components/cells/`     | Asset table cell filters                 | Scoped   |
| **CellFiltersContext**    | `vulnerabilities/components/` | Vulnerability table cell filters         | Scoped   |
| **AttackContext**         | `attacks/attackPaths/`        | Attack path visualization                | Scoped   |
| **JobProgressContext**    | `hooks/useJobProgress.tsx`    | Job progress tracking                    | Scoped   |

### GlobalStateContext Deep Dive

**Location**: `state/global.state.tsx`

**Manages**:

- Modal states (12 different modals)
- Drawer stack with navigation (agent, asset, vulnerability, seed, etc.)
- Keyboard listeners with priority stack
- AWS marketplace configuration
- Risk notifications
- Query results drawer state

**Key Pattern - URL-Synced Drawers**:

```typescript
// Drawer state is read from URL params
const drawerOrder = JSON.parse(searchParams.get("drawerOrder") || "[]");
const assetDrawerKey = searchParams.get("assetDrawerKey") || "";

// Updates modify URL for deep linking
function handleOpenAssetDrawer(asset?: PartialAsset) {
  handleSetSearchParams({
    drawerType: "asset",
    tabKeys: ["assetDrawerTab", "assetDrawerSubTab"],
    resource: asset,
  });
}
```

**Why This Pattern**:

- Drawers are navigable via browser back/forward
- Deep linking works out of the box
- No stale state on page refresh
- URL is single source of truth

### AuthContext Deep Dive

**Location**: `state/auth.tsx`

**Manages**:

- Cognito authentication state
- JWT token management
- Impersonation (Praetorian users switching accounts)
- MFA setup flow
- SSO integration

**Key Pattern - Tenant Isolation**:

```typescript
function startImpersonation(memberId: string) {
  setCurrentTenant(memberId); // Sync to storage
  dispatchTenantChange(); // Notify hooks
  queryClient.clear(); // Clear cache
  navigate(generatePath(`:userId/${route}`, { userId: encode(memberId) }));
}
```

### Context Provider Hierarchy

```tsx
// In App.tsx (conceptual)
<QueryClientProvider client={queryClient}>
  <ThemeProvider>
    <AuthProvider>
      <GlobalStateProvider>
        <RouterProvider />
      </GlobalStateProvider>
    </AuthProvider>
  </ThemeProvider>
</QueryClientProvider>
```

### Context Pattern Template

```typescript
interface MyContextType {
  value: string;
  setValue: (value: string) => void;
}

const MyContext = createContext<MyContextType | undefined>(undefined);

export const MyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [value, setValue] = useState('');

  const contextValue = useMemo(() => ({ value, setValue }), [value]);

  return (
    <MyContext.Provider value={contextValue}>
      {children}
    </MyContext.Provider>
  );
};

export const useMyContext = () => {
  const context = useContext(MyContext);
  if (!context) {
    throw new Error('useMyContext must be used within MyProvider');
  }
  return context;
};
```

### Anti-Patterns (Never Do)

- ❌ Using Context for server state (use TanStack Query)
- ❌ Creating new context for simple prop drilling (use composition)
- ❌ Large object values without useMemo (causes re-renders)
- ❌ Frequently updating values (consider Zustand or local state)

---

## Tier 3: Zustand (Complex Feature State)

### When to Use

Zustand is **only appropriate** when you have:

- ✅ Deeply nested state that benefits from Immer's mutable syntax
- ✅ Many related actions that need co-location
- ✅ Complex validation and derived state
- ✅ State that doesn't fit URL parameters

**Current Usage**: Query Builder feature ONLY

### The Query Builder Store

**Location**: `sections/insights/queryBuilder/state/queryBuilderStore.ts`

**Lines**: ~800 lines

**State Shape**:

```typescript
interface QueryBuilderState {
  // Core query structure
  blocks: EntityBlock[]; // Entity blocks with filters
  relationshipDividers: RelationshipDivider[]; // Connections between blocks
  pathOptions: PathOptions; // Graph path configuration

  // Context from React (filter options)
  context: QueryBuilderContextData | null;

  // Validation
  validationResult: ValidationResult | null;
  hasAttemptedRun: boolean;

  // Saved query management
  currentLoadedQueryId: string | null;
  loadedQueryData: SavedQuery | null;
  lastSavedState: SavedQueryState | null; // For change detection

  // UI state
  selectedUsernames: string[];
  activeTab: "queries" | "guide";
  isSidebarCollapsed: boolean;
  sidebarWidth: number;
  expandedFolders: QueryFolderType[];

  // Actions
  actions: {
    /* 30+ action methods */
  };
}
```

**Why Zustand Here** (and not Context):

1. **Deep nesting**: `blocks[].filterGroups[].filters[]` - Immer simplifies updates
2. **Many actions**: 30+ coordinated actions for query manipulation
3. **Complex validation**: Cross-field validation across nested structures
4. **Change detection**: `lastSavedState` comparison for "unsaved changes" warning
5. **Performance**: Fine-grained selectors prevent unnecessary re-renders

### Zustand + Immer Pattern

```typescript
import { immer } from "zustand/middleware/immer";
import { createWithEqualityFn } from "zustand/traditional";

export const useQueryBuilderStore = createWithEqualityFn<QueryBuilderState>()(
  immer((set) => ({
    blocks: [],

    actions: {
      addFilter: (blockId: string, groupId: string) =>
        set((state) => {
          // Immer allows "mutable" syntax
          const block = state.blocks.find((b) => b.id === blockId);
          if (!block) return;

          const group = block.filterGroups.find((g) => g.id === groupId);
          if (!group) return;

          group.filters.push({
            id: generateId(),
            hasBeenValidated: false,
          });
        }),
    },
  }))
);
```

### Critical Pattern: Deep Cloning for Saved State

```typescript
markAsSaved: (savedState: SavedQueryState) =>
  set((state) => {
    // CRITICAL: Deep clone to prevent reference leaks
    const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

    state.lastSavedState = {
      blocks: clone(savedState.blocks), // Must clone!
      relationshipDividers: clone(savedState.relationshipDividers),
      selectedUsernames: [...savedState.selectedUsernames],
      interGroupOperators: [...savedState.interGroupOperators],
      pathOptions: { ...savedState.pathOptions },
    };
  });
```

### Context Injection Pattern

```typescript
// QueryBuilderContext provides filter options via React Query
// These are injected into Zustand store for action access

// In QueryBuilderContext.tsx:
React.useEffect(() => {
  useQueryBuilderStore.getState().actions.setContext(value);
}, [value]);

// In store actions:
const { context } = state;
const filterOptions = context?.assetFilterOptions;
```

### Zustand Anti-Patterns (Never Do)

- ❌ Creating Zustand stores for simple state
- ❌ Using Zustand for server state
- ❌ Multiple stores that need to communicate (use Context)
- ❌ Forgetting deep cloning for saved state comparison
- ❌ Large stores without selector optimization

---

## Tier 4: useReducer (State Machine Pattern)

### When to Use

useReducer is appropriate for:

- ✅ Complex state with many interrelated transitions
- ✅ State machine-like behavior
- ✅ When you need predictable state transitions
- ✅ Combined with Context for sharing

**Current Usage**: GraphStateProvider ONLY

### The GraphStateProvider

**Location**: `components/nodeGraph/core/GraphStateProvider.tsx`

**Lines**: ~660 lines

**Why useReducer Here**:

1. **State machine semantics**: Clear action types for graph operations
2. **Predictable transitions**: Each action type maps to specific state change
3. **Combined with Context**: State shared across graph components
4. **Complex interactions**: Selection, clustering, visibility all interact

**State Structure**:

```typescript
interface GraphState {
  selection: {
    nodes: Set<string>;
    cluster: string | null;
    assetKey: string | null;
  };
  entity: {
    type: GraphEntityType;
    selectedTypes: GraphEntityType[];
  };
  visibility: {
    state: VisibilityState;
  };
  clustering: {
    weights: AttributeWeight[];
    clusters: Cluster[];
  };
  config: {
    maxNodes: number;
    showOutdatedWarning: boolean;
  };
  instance: {
    graphRef: Graph | null;
    isInitialLoad: boolean;
    existingPositions: Map<string, { x: number; y: number }>;
  };
}
```

**Action Types**:

```typescript
type GraphStateAction =
  | { type: "SELECT_NODES"; payload: { nodes: Set<string> } }
  | { type: "SELECT_CLUSTER"; payload: { cluster: string; nodes: Set<string> } }
  | { type: "CLEAR_SELECTION" }
  | { type: "SET_ASSET_KEY"; payload: { assetKey: string | null } }
  | { type: "SET_ENTITY_TYPE"; payload: { entityType: GraphEntityType } }
  | { type: "SET_SELECTED_TYPES"; payload: { selectedTypes: GraphEntityType[] } }
  | { type: "SET_VISIBILITY"; payload: { state: VisibilityState } }
  | { type: "SET_WEIGHT"; payload: { name: string; weight: number } }
  | { type: "SET_CLUSTERS"; payload: { clusters: Cluster[] } }
  | { type: "SET_GRAPH_REF"; payload: { graphRef: Graph | null } }
  | { type: "SET_INITIAL_LOAD"; payload: { isInitialLoad: boolean } }
  | { type: "SET_SHOW_OUTDATED_WARNING"; payload: { show: boolean } };
```

**Reducer Pattern**:

```typescript
const graphStateReducer = (state: GraphState, action: GraphStateAction): GraphState => {
  switch (action.type) {
    case "SELECT_NODES":
      return {
        ...state,
        selection: {
          ...state.selection,
          nodes: action.payload.nodes,
        },
      };

    case "CLEAR_SELECTION":
      return {
        ...state,
        selection: {
          nodes: new Set(),
          cluster: null,
          assetKey: null,
        },
      };

    // ... other cases

    default:
      return state;
  }
};
```

### useReducer + Context Pattern

```typescript
export const GraphStateProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(graphStateReducer, initialState);

  // Memoized action creators
  const setNodes = useCallback((nodes: Set<string>) => {
    dispatch({ type: 'SELECT_NODES', payload: { nodes } });
  }, []);

  // Memoized context value
  const value = useMemo(() => ({
    selection: {
      nodes: state.selection.nodes,
      setNodes,
      // ...
    },
    // ...
  }), [state, setNodes]);

  return (
    <GraphStateContext.Provider value={value}>
      {children}
    </GraphStateContext.Provider>
  );
};
```

### useReducer Anti-Patterns (Never Do)

- ❌ Using useReducer for simple state (useState is simpler)
- ❌ Forgetting to memoize dispatch-based callbacks
- ❌ Large context values without useMemo
- ❌ Using useReducer when Zustand would be cleaner

---

## Decision Matrix: When to Use What

### Quick Decision Tree

```
Is it server data (API response)?
├─ YES → TanStack Query (always)
└─ NO → Is it shared across many unrelated components?
         ├─ YES → Does it have complex nested updates?
         │         ├─ YES → Consider Zustand (rare)
         │         └─ NO → React Context
         └─ NO → Is it feature-scoped?
                  ├─ YES → Is it a state machine?
                  │         ├─ YES → useReducer + Context
                  │         └─ NO → useState or Context
                  └─ NO → useState (component-local)
```

### State Type Classification

| State Type         | Example                       | Solution                    |
| ------------------ | ----------------------------- | --------------------------- |
| **Server State**   | Assets, Risks, Jobs           | TanStack Query              |
| **Auth State**     | JWT, user info, impersonation | AuthContext                 |
| **Theme State**    | Light/dark mode               | ThemeContext                |
| **Modal State**    | Open/close, form data         | GlobalStateContext          |
| **Drawer State**   | Which drawer, active tab      | GlobalStateContext + URL    |
| **Form State**     | Input values, validation      | useState or react-hook-form |
| **Complex Form**   | Query Builder blocks/filters  | Zustand + Immer             |
| **Graph UI State** | Selection, visibility         | useReducer + Context        |
| **Table Filters**  | Column filters, sorting       | URL params + derived state  |

### Why NOT More Zustand?

The codebase deliberately limits Zustand to one feature because:

1. **Context is simpler**: No extra dependency for most use cases
2. **URL state**: Most UI state is better in URL for deep linking
3. **TanStack Query**: Handles the hard parts of server state
4. **React Compiler**: Makes Context performance concerns less relevant
5. **Debugging**: Browser DevTools work directly with Context
6. **Team familiarity**: Context is standard React

---

## Best Practices

### TanStack Query

1. **Always use custom hooks**: Wrap useQuery/useMutation in domain hooks
2. **Consistent query keys**: Follow hierarchical pattern
3. **Include user in keys**: For impersonation cache isolation
4. **Configure staleTime**: Override 5min default when appropriate
5. **Use enabled for dependent queries**: Not useEffect chains

### React Context

1. **Memoize context values**: Always wrap in useMemo
2. **Small, focused contexts**: Not one mega-context
3. **Use URL for navigable state**: Drawers, tabs, filters
4. **Provide error boundaries**: For missing provider detection
5. **Co-locate with feature**: Scoped contexts in feature directories

### Zustand (When Needed)

1. **Use Immer middleware**: For nested state updates
2. **Deep clone saved state**: JSON.parse(JSON.stringify()) for comparison
3. **Inject Context data**: Don't duplicate React Query data
4. **Use selectors**: Subscribe only to needed slices
5. **Keep actions in store**: Co-locate related logic

### useReducer

1. **Clear action types**: Discriminated union for TypeScript
2. **Combine with Context**: For shared access
3. **Memoize callbacks**: useCallback for dispatch wrappers
4. **Immutable updates**: Spread syntax in reducer

---

## Migration Paths

### From useState to Context

When local state needs to be shared:

1. Extract state and setters to context
2. Wrap with useMemo for value
3. Add provider at appropriate level
4. Replace useState with useContext

### From Context to Zustand

When context becomes too complex:

1. Create Zustand store with Immer
2. Move state shape to store interface
3. Convert setState calls to actions
4. Replace useContext with useStore(selector)
5. Keep Context for filter options injection

### From useEffect + fetch to TanStack Query

1. Create custom hook with useQuery
2. Define stable queryKey
3. Move fetch logic to queryFn
4. Remove useEffect and useState
5. Use isLoading, error from query result

---

## Related Skills

- **using-tanstack-query**: Deep dive on Query patterns
- **using-zustand-state-management**: Zustand patterns
- **using-modern-react-patterns**: React 19 optimization
- **frontend-react-component-generator**: Component templates

---

## Appendix: File Locations

| Pattern              | Location                                                        |
| -------------------- | --------------------------------------------------------------- |
| QueryClient config   | `src/queryclient.ts`                                            |
| Global state context | `src/state/global.state.tsx`                                    |
| Auth context         | `src/state/auth.tsx`                                            |
| Theme context        | `src/app/ThemeContext.tsx`                                      |
| Zustand store        | `src/sections/insights/queryBuilder/state/queryBuilderStore.ts` |
| GraphStateProvider   | `src/components/nodeGraph/core/GraphStateProvider.tsx`          |
| Custom hooks         | `src/hooks/use*.ts`                                             |
