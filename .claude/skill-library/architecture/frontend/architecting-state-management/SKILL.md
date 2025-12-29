---
name: architecting-state-management
description: Use when designing state management for React features, architect agent needs recommendations, or evaluating state solutions - provides four-tier decision framework (TanStack Query for server state, Context for global client state, Zustand for complex features, useReducer for state machines) with systematic evaluation checklist, trade-off analysis, performance benchmarks, and anti-patterns - includes real Chariot platform examples and industry validation from 2025 research
allowed-tools: Read, AskUserQuestion, TodoWrite
---

# Architecting State Management

**Decision framework for selecting appropriate state management in React applications.**

## When to Use

Use this skill when:

- Designing state management for a new feature
- User asks "which state management should I use?"
- Evaluating whether to use TanStack Query, Context, Zustand, or useReducer
- Architect agent needs to make state management recommendations
- Refactoring existing state management

**You MUST use TodoWrite before starting to track all workflow steps.**

## Overview

React state management follows a **four-tier architecture** based on the **"simplest tool for the job"** principle:

| Tier | Solution        | Use Case                | Token Count |
| ---- | --------------- | ----------------------- | ----------- |
| 1    | TanStack Query  | Server state (API data) | Primary     |
| 2    | React Context   | Global client state     | 12 contexts |
| 3    | Zustand + Immer | Complex feature state   | Rare        |
| 4    | useReducer      | State machines          | Specialized |

**Core Principle**: Start with the simplest solution. Only escalate to more complex tools when simpler ones don't meet requirements.

## Quick Decision Tree

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

## The Four-Tier System

### Tier 1: TanStack Query (Server State)

**When to use** (MANDATORY):

- ✅ All API data fetching (GET requests)
- ✅ All mutations (POST, PUT, DELETE)
- ✅ Data that needs caching
- ✅ Loading/error states for async operations
- ✅ Pagination and infinite scroll
- ✅ Background refetching
- ✅ Optimistic updates

**Key principle**: **Separate server state from client state.** TanStack Query handles caching, synchronization, and background updates automatically.

**Configuration**:

```typescript
// Global defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: mToMs(5), // 5 min - data stays fresh
      gcTime: mToMs(15), // 15 min - keep in cache after unused
    },
  },
});
```

**Per-domain tuning**:

- **Frequently changing** (assets list): `staleTime: 30sec, gcTime: 5min`
- **Moderate** (user profile): `staleTime: 5min, gcTime: 15min`
- **Rarely changing** (reference data): `staleTime: 30min, gcTime: 60min`

**Anti-patterns**:

- ❌ Copying query data to useState (defeats caching)
- ❌ Manual fetch with useEffect for API calls
- ❌ Storing server state in Context or Zustand
- ❌ Calling invalidateQueries in render (infinite loops)

**See**: [references/tanstack-query-patterns.md](references/tanstack-query-patterns.md) for query keys, mutations, optimistic updates

### Tier 2: React Context (Global Client State)

**When to use**:

- ✅ Shared across many unrelated components
- ✅ App-wide state (auth, theme, modals)
- ✅ Synced with URL parameters (drawers, tabs)
- ✅ Simple to moderate complexity
- ✅ Low-to-medium update frequency

**Chariot platform examples** (12 contexts):

- **AuthContext** - JWT, user info, impersonation (low frequency)
- **ThemeContext** - Light/dark mode toggle (very low frequency)
- **GlobalStateContext** - Modals, drawer stack (medium frequency)
- **CellFiltersContext** (scoped) - Table filters (higher frequency, localized)

**Context splitting principle**: Split by update frequency. Don't put high-frequency state in same context as low-frequency state.

**URL-synced pattern** (innovative):

```typescript
// Drawer state read from URL
const drawerOrder = JSON.parse(searchParams.get("drawerOrder") || "[]");

// Updates modify URL for deep linking
function handleOpenDrawer(resource) {
  handleSetSearchParams({
    drawerType: "asset",
    tabKeys: ["drawerTab"],
    resource,
  });
}
```

**Benefits**: Browser back/forward works, deep linking automatic, no stale state on refresh.

**Anti-patterns**:

- ❌ Using Context for server state (use TanStack Query)
- ❌ Creating new context for simple prop drilling (use composition)
- ❌ Large object values without useMemo (causes re-renders)
- ❌ Frequently updating values (consider Zustand or local state)

**React 19 Compiler impact**: Context performance improves automatically with React Compiler's automatic memoization (30-60% fewer re-renders).

**See**: [references/context-patterns.md](references/context-patterns.md) for memoization, splitting, URL-sync

### Tier 3: Zustand + Immer (Complex Feature State)

**When to use** (RARE - only when Context becomes unwieldy):

- ✅ Deeply nested state that benefits from Immer's mutable syntax
- ✅ Many related actions (20+) that need co-location
- ✅ Complex validation and derived state
- ✅ State that doesn't fit URL parameters

**Chariot platform example**: Query Builder feature ONLY

**Why Zustand for Query Builder**:

1. **Deep nesting**: `blocks[].filterGroups[].filters[]`
2. **Many actions**: 30+ coordinated actions
3. **Complex validation**: Cross-field validation across nested structures
4. **Change detection**: `lastSavedState` comparison for "unsaved changes"
5. **Performance**: Fine-grained selectors prevent unnecessary re-renders

**Pattern** (Zustand + Immer):

```typescript
import { immer } from "zustand/middleware/immer";
import { createWithEqualityFn } from "zustand/traditional";

export const useStore = createWithEqualityFn<State>()(
  immer((set) => ({
    blocks: [],
    actions: {
      addFilter: (blockId, groupId) =>
        set((state) => {
          // Immer allows "mutable" syntax
          const block = state.blocks.find((b) => b.id === blockId);
          if (!block) return;
          const group = block.filterGroups.find((g) => g.id === groupId);
          if (!group) return;
          group.filters.push({ id: generateId() });
        }),
    },
  }))
);
```

**Selector usage** (critical for performance):

```typescript
// ✅ Good - selective subscription
const blocks = useStore((state) => state.blocks);
const addFilter = useStore((state) => state.actions.addFilter);

// ❌ Bad - subscribes to entire store
const { blocks, actions } = useStore();
```

**Anti-patterns**:

- ❌ Creating Zustand stores for simple state
- ❌ Using Zustand for server state
- ❌ Multiple stores that need to communicate (use Context)
- ❌ Forgetting deep cloning for saved state comparison
- ❌ Large stores without selector optimization

**See**: [references/zustand-patterns.md](references/zustand-patterns.md) for Immer middleware, selectors, deep cloning

### Tier 4: useReducer (State Machine Pattern)

**When to use**:

- ✅ Complex state with many interrelated transitions
- ✅ State machine-like behavior
- ✅ When you need predictable state transitions
- ✅ Combined with Context for sharing

**Chariot platform example**: GraphStateProvider for graph visualization

**Why useReducer for Graph State**:

1. **State machine semantics**: Clear action types for graph operations
2. **Predictable transitions**: Each action maps to specific state change
3. **Combined with Context**: State shared across graph components
4. **Complex interactions**: Selection, clustering, visibility all interact

**Pattern**:

```typescript
type GraphStateAction =
  | { type: "SELECT_NODES"; payload: { nodes: Set<string> } }
  | { type: "CLEAR_SELECTION" }
  | { type: "SET_ENTITY_TYPE"; payload: { entityType: GraphEntityType } };

const graphStateReducer = (state: GraphState, action: GraphStateAction): GraphState => {
  switch (action.type) {
    case "SELECT_NODES":
      return {
        ...state,
        selection: { ...state.selection, nodes: action.payload.nodes },
      };
    case "CLEAR_SELECTION":
      return {
        ...state,
        selection: { nodes: new Set(), cluster: null, assetKey: null },
      };
    default:
      return state;
  }
};
```

**Anti-patterns**:

- ❌ Using useReducer for simple state (useState is simpler)
- ❌ Forgetting to memoize dispatch-based callbacks
- ❌ Large context values without useMemo
- ❌ Using useReducer when Zustand would be cleaner

**See**: [references/usereducer-patterns.md](references/usereducer-patterns.md) for discriminated unions, memoization

## Decision Matrix

| Data Type            | Solution                   | Why                                      |
| -------------------- | -------------------------- | ---------------------------------------- |
| API responses        | TanStack Query             | Caching, background sync, loading states |
| Authentication       | Context                    | Low-frequency, app-wide, simple          |
| Theme/locale         | Context                    | Very low-frequency, simple               |
| Modal open/close     | Context OR URL             | Depends on deep-link needs               |
| Drawer navigation    | URL params + Context       | Deep-linking, browser history            |
| Form inputs          | useState / react-hook-form | Component-local, high frequency          |
| Complex nested forms | Zustand + Immer            | Only when Context becomes unwieldy       |
| Graph/chart UI state | useReducer + Context       | State machine semantics                  |
| Table sort/filter    | URL params                 | Shareable, refreshable                   |

## The 90% Rule

> "For 90% of SaaS platforms, MVPs, and enterprise dashboards, start with Context. Add TanStack Query for server data. Only reach for Zustand when you have a specific problem that Context doesn't solve."

**Your interpretation**: Context first, Zustand only for exceptional complexity.

## Evaluation Checklist

When user asks for state management recommendation:

1. **Identify the data type**: Server or client?
2. **Assess sharing needs**: Component-local, feature-scoped, or app-wide?
3. **Evaluate complexity**: Simple boolean, moderate object, or deeply nested?
4. **Consider update frequency**: Low (auth), medium (modals), or high (forms)?
5. **Check for special cases**: State machine? URL-syncable? Optimistic updates needed?

Then apply the decision tree to recommend the appropriate tier.

## Anti-Patterns Across All Tiers

### ❌ Over-Engineering

- Using Zustand for simple toggle state
- Creating Context for 2-component prop passing
- TanStack Query for local form state

### ❌ Under-Engineering

- useState for data that should be in URL (filters, tabs)
- Context for server state (should be TanStack Query)
- Manual useEffect + fetch instead of TanStack Query

### ❌ Performance Mistakes

- Context without useMemo for value
- Zustand without selective subscriptions
- TanStack Query with incorrect staleTime/gcTime

## Workflow

1. **User describes feature**: "I need to manage user preferences"
2. **Ask clarifying questions**:
   - Is this API data or client-only?
   - Which components need access?
   - How often does it update?
   - Does it need URL persistence?
3. **Apply decision tree**: Identify tier
4. **Explain trade-offs**: Why this tier over others
5. **Provide pattern**: Show configuration/implementation
6. **Warn about anti-patterns**: What NOT to do

## Related Skills

- `using-tanstack-query` - Deep dive on TanStack Query patterns
- `using-zustand-state-management` - Zustand implementation patterns
- `using-modern-react-patterns` - React 19 optimization
- `frontend-react-component-generator` - Component templates
- `docs/FRONTEND-STATE-MANAGEMENT-ARCHITECTURE.md` - Chariot platform implementation

## References

- [references/tanstack-query-patterns.md](references/tanstack-query-patterns.md) - Query keys, mutations, optimistic updates
- [references/context-patterns.md](references/context-patterns.md) - Memoization, splitting, URL-sync
- [references/zustand-patterns.md](references/zustand-patterns.md) - Immer middleware, selectors, deep cloning
- [references/usereducer-patterns.md](references/usereducer-patterns.md) - Discriminated unions, memoization
- [references/research-sources.md](references/research-sources.md) - Industry best practices (2025)
