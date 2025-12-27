# useReducer Patterns

**State machine pattern for complex, predictable state transitions.**

## When to Use useReducer

useReducer is appropriate for:

- ✅ Complex state with many interrelated transitions
- ✅ State machine-like behavior (clear action → state mapping)
- ✅ Predictable state transitions
- ✅ Combined with Context for sharing across components

**NOT for**:

- ❌ Simple state (useState is clearer)
- ❌ Frequent re-definition of reducer (loses memoization benefits)
- ❌ State that doesn't need predictable transitions

## Chariot Platform Example: GraphStateProvider

**Location**: `modules/chariot/ui/src/components/nodeGraph/core/GraphStateProvider.tsx`

**Lines**: ~660 lines

**Why useReducer here**:

1. **State machine semantics**: Clear action types for graph operations
2. **Predictable transitions**: Each action type maps to specific state change
3. **Combined with Context**: State shared across graph components
4. **Complex interactions**: Selection, clustering, visibility all interact

### State Structure

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

### Discriminated Union Action Types

```typescript
type GraphStateAction =
  | { type: 'SELECT_NODES'; payload: { nodes: Set<string> } }
  | { type: 'SELECT_CLUSTER'; payload: { cluster: string; nodes: Set<string> } }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_ASSET_KEY'; payload: { assetKey: string | null } }
  | { type: 'SET_ENTITY_TYPE'; payload: { entityType: GraphEntityType } }
  | { type: 'SET_SELECTED_TYPES'; payload: { selectedTypes: GraphEntityType[] } }
  | { type: 'SET_VISIBILITY'; payload: { state: VisibilityState } }
  | { type: 'SET_WEIGHT'; payload: { name: string; weight: number } }
  | { type: 'SET_CLUSTERS'; payload: { clusters: Cluster[] } }
  | { type: 'SET_GRAPH_REF'; payload: { graphRef: Graph | null } }
  | { type: 'SET_INITIAL_LOAD'; payload: { isInitialLoad: boolean } }
  | { type: 'SET_SHOW_OUTDATED_WARNING'; payload: { show: boolean } };
```

**Why discriminated union**: TypeScript enforces that payload matches action type. Compile-time safety.

### Reducer Function

```typescript
const graphStateReducer = (
  state: GraphState,
  action: GraphStateAction
): GraphState => {
  switch (action.type) {
    case 'SELECT_NODES':
      return {
        ...state,
        selection: {
          ...state.selection,
          nodes: action.payload.nodes,
        },
      };

    case 'CLEAR_SELECTION':
      return {
        ...state,
        selection: {
          nodes: new Set(),
          cluster: null,
          assetKey: null,
        },
      };

    case 'SELECT_CLUSTER':
      return {
        ...state,
        selection: {
          nodes: action.payload.nodes,
          cluster: action.payload.cluster,
          assetKey: null,
        },
      };

    case 'SET_ENTITY_TYPE':
      return {
        ...state,
        entity: {
          ...state.entity,
          type: action.payload.entityType,
        },
      };

    // ... other cases

    default:
      return state;
  }
};
```

**Pattern**: Each case returns a new state object (immutability). Use spread syntax for nested updates.

## useReducer + Context Pattern

Combine useReducer with Context to share state across components:

```typescript
export const GraphStateProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(graphStateReducer, initialState);

  // Memoize action creators
  const setNodes = useCallback((nodes: Set<string>) => {
    dispatch({ type: 'SELECT_NODES', payload: { nodes } });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);

  const setEntityType = useCallback((entityType: GraphEntityType) => {
    dispatch({ type: 'SET_ENTITY_TYPE', payload: { entityType } });
  }, []);

  // ... more action creators

  // Memoize context value
  const value = useMemo(() => ({
    selection: {
      nodes: state.selection.nodes,
      cluster: state.selection.cluster,
      assetKey: state.selection.assetKey,
      setNodes,
      clearSelection,
      // ...
    },
    entity: {
      type: state.entity.type,
      selectedTypes: state.entity.selectedTypes,
      setEntityType,
      // ...
    },
    // ... other slices
  }), [state, setNodes, clearSelection, setEntityType]);

  return (
    <GraphStateContext.Provider value={value}>
      {children}
    </GraphStateContext.Provider>
  );
};
```

**Critical**: Memoize both action creators (`useCallback`) and context value (`useMemo`) to prevent unnecessary re-renders.

## When useReducer Makes Sense

### State Machine Example

```typescript
type LoadingState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: Data }
  | { status: 'error'; error: Error };

type LoadingAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Data }
  | { type: 'FETCH_ERROR'; payload: Error }
  | { type: 'RESET' };

const loadingReducer = (state: LoadingState, action: LoadingAction): LoadingState => {
  switch (action.type) {
    case 'FETCH_START':
      return { status: 'loading' };
    case 'FETCH_SUCCESS':
      return { status: 'success', data: action.payload };
    case 'FETCH_ERROR':
      return { status: 'error', error: action.payload };
    case 'RESET':
      return { status: 'idle' };
    default:
      return state;
  }
};
```

**Why useReducer**: Clear state transitions. `idle → loading → success/error → idle`. Prevents invalid states like `{ loading: true, error: 'foo' }`.

### Complex Form State

```typescript
interface FormState {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
}

type FormAction =
  | { type: 'SET_FIELD'; payload: { field: string; value: any } }
  | { type: 'SET_ERROR'; payload: { field: string; error: string } }
  | { type: 'TOUCH_FIELD'; payload: { field: string } }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; payload: Record<string, string> }
  | { type: 'RESET' };
```

**When appropriate**: Multi-step forms with validation, conditional fields, cross-field dependencies.

**When NOT appropriate**: Simple forms (use react-hook-form or Formik instead).

## Memoization Patterns

### Memoize Dispatch Wrappers

```typescript
// ✅ GOOD - memoized
const setNodes = useCallback((nodes: Set<string>) => {
  dispatch({ type: 'SELECT_NODES', payload: { nodes } });
}, []);
```

### Memoize Context Value

```typescript
// ✅ GOOD - prevents re-renders
const value = useMemo(() => ({
  selection: state.selection,
  setNodes,
  clearSelection,
}), [state.selection, setNodes, clearSelection]);

// ❌ BAD - creates new object every render
const value = {
  selection: state.selection,
  setNodes,
  clearSelection,
};
```

## Immutability Best Practices

### ✅ Spread Syntax for Nested Updates

```typescript
return {
  ...state,
  selection: {
    ...state.selection,
    nodes: action.payload.nodes,
  },
};
```

### ❌ Direct Mutation (Anti-Pattern)

```typescript
// ❌ BAD - mutates state directly
state.selection.nodes = action.payload.nodes;
return state;
```

**Why bad**: React may not detect the change (same object reference). UI won't update.

### Using Immer with useReducer

For deeply nested state, Immer can simplify reducers:

```typescript
import { produce } from 'immer';

const reducer = produce((draft, action) => {
  switch (action.type) {
    case 'UPDATE_NESTED':
      // Direct mutation with Immer
      draft.deeply.nested.value = action.payload;
      break;
  }
});
```

**When to use**: Very deep nesting (3+ levels). Otherwise, spread syntax is clearer.

## When NOT to Use useReducer

### ❌ Simple State

```typescript
// ❌ BAD - overkill for boolean
const [state, dispatch] = useReducer(
  (state, action) => {
    switch (action.type) {
      case 'TOGGLE': return { isOpen: !state.isOpen };
      default: return state;
    }
  },
  { isOpen: false }
);
```

**Fix**: Use useState:

```typescript
// ✅ GOOD - simpler
const [isOpen, setIsOpen] = useState(false);
```

### ❌ Zustand Would Be Cleaner

If you need:

- Global state without Provider
- Multiple reducers
- Middleware (persist, devtools)
- Actions defined with state

Consider Zustand instead.

## Industry Validation

**Quote from React Redux docs**:

> "Use useReducer when state transitions follow a predictable pattern and you want to enforce that pattern."

**Quote from Immutability in React guide**:

> "useReducer with discriminated union action types shows proper state machine thinking... predictable state transitions."

## Comparison: useReducer vs Zustand

| Feature          | useReducer + Context | Zustand           |
| ---------------- | -------------------- | ----------------- |
| **Boilerplate**  | More (Provider, etc) | Less              |
| **State machine**| Natural fit          | Possible          |
| **Global state** | Needs Context        | Built-in          |
| **Middleware**   | Manual               | Built-in          |
| **DevTools**     | Manual               | Built-in          |
| **TypeScript**   | Excellent            | Excellent         |
| **Learning curve**| Standard React      | Small library API |

**Recommendation**: Use useReducer + Context for state machines. Use Zustand for complex global state that isn't a state machine.

## Sources

- [Immutability in React and Redux](https://daveceddia.com/react-redux-immutability-guide/)
- [Updating Objects in State](https://react.dev/learn/updating-objects-in-state)
- [useReducer Hook](https://react.dev/reference/react/useReducer)
