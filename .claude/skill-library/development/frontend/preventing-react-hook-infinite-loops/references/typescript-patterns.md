# TypeScript Patterns for Type-Safe Hook Dependencies

**Type-safe patterns for React hooks dependency management with TypeScript.**

---

## Pattern 1: Const Assertions for Dependency Arrays

```typescript
// ✅ Creates readonly tuple
const STABLE_DEPS = ["value1", "value2"] as const;

useEffect(() => {
  // Effect logic
}, STABLE_DEPS); // Type: readonly ["value1", "value2"]

// ❌ Prevents accidental mutations
STABLE_DEPS.push("value3"); // Error: Property 'push' does not exist
```

---

## Pattern 2: Generic Custom Hooks

```typescript
function useMemoizedValue<T>(compute: () => T, dependencies: React.DependencyList): T {
  return useMemo(compute, dependencies);
}

// Usage with type inference
const result = useMemoizedValue(() => {
  return expensiveComputation(data);
}, [data]); // result: ReturnType<typeof expensiveComputation>
```

---

## Pattern 3: Type-Safe Serialization

```typescript
type SerializableValue = string | number | boolean | null;
type SerializableObject = { [key: string]: SerializableValue };

function serializeForDeps<T extends SerializableObject>(obj: T): string {
  return JSON.stringify(
    Object.keys(obj)
      .sort()
      .reduce((acc, key) => {
        acc[key] = obj[key];
        return acc;
      }, {} as T)
  );
}

// Usage
interface Filters {
  search: string;
  category: string;
  minPrice: number;
}

const filtersKey = useMemo(() => serializeForDeps(filters), [filters]);
```

---

## Pattern 4: Discriminated Unions for Reducer Actions

```typescript
type Action =
  | { type: "SET_USER"; payload: User }
  | { type: "CLEAR_USER" }
  | { type: "UPDATE_NAME"; payload: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: action.payload };
    case "CLEAR_USER":
      return { ...state, user: null };
    case "UPDATE_NAME":
      return { ...state, user: { ...state.user!, name: action.payload } };
  }
}

// Type-safe dispatch
const [state, dispatch] = useReducer(reducer, initialState);
dispatch({ type: "SET_USER", payload: newUser }); // ✅ Type-safe
dispatch({ type: "SET_USER", payload: "string" }); // ❌ Type error
```

---

## Pattern 5: Typed useRef for Callbacks

```typescript
function Component({ onUpdate }: { onUpdate: (data: Data) => void }) {
  const onUpdateRef = useRef<(data: Data) => void>(onUpdate);

  useLayoutEffect(() => {
    onUpdateRef.current = onUpdate;
  });

  const handleUpdate = useCallback((data: Data) => {
    onUpdateRef.current(data); // Type-safe call
  }, []);

  return <button onClick={() => handleUpdate(data)}>Update</button>;
}
```

---

## Pattern 6: Utility Types for Hook Return Values

```typescript
type UseAsyncResult<T, E = Error> =
  | { status: "idle"; data: null; error: null }
  | { status: "loading"; data: null; error: null }
  | { status: "success"; data: T; error: null }
  | { status: "error"; data: null; error: E };

function useAsync<T>(asyncFn: () => Promise<T>): UseAsyncResult<T> {
  const [state, setState] = useState<UseAsyncResult<T>>({
    status: "idle",
    data: null,
    error: null,
  });

  // Hook logic...

  return state;
}

// Usage with type narrowing
const result = useAsync(fetchUser);

if (result.status === "success") {
  console.log(result.data.name); // ✅ data is T, not null
}
```

---

## Pattern 7: Explicit Return Types

```typescript
// ✅ GOOD: Explicit return type
const memoizedValue = useMemo<ComputedType>(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);

// ❌ BAD: Inferred (can change unintentionally)
const memoizedValue = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);
```

---

## Anti-Patterns

### Anti-Pattern 1: Using `any`

```typescript
// ❌ BAD: Loses type safety
const callback = useCallback((data: any) => {
  process(data);
}, []);

// ✅ GOOD: Explicit types
const callback = useCallback((data: UserData) => {
  process(data);
}, []);
```

### Anti-Pattern 2: Ignoring Dependency Arrays

```typescript
// ❌ BAD: Ignoring exhaustive-deps
useEffect(() => {
  fetchUser(userId);
  // @ts-ignore
}, []); // userId not in deps

// ✅ GOOD: Follow exhaustive-deps
useEffect(() => {
  fetchUser(userId);
}, [userId]);
```

---

## Sources

- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [TypeScript Handbook: Discriminated Unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)
- React Official Docs: TypeScript

---

**Last Updated**: 2026-01-14
**Confidence**: 0.90
