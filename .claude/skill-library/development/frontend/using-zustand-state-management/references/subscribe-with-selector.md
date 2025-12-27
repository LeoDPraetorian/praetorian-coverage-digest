# subscribeWithSelector Middleware

Subscribe to specific state changes with granular control over when callbacks fire.

---

## When to Use

- Subscribe to **specific state slices** outside React
- Need **previous value** in callback
- Implement **custom equality functions** for complex comparisons
- Need **immediate firing** on subscription

---

## Basic Setup

```typescript
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

interface DogStore {
  paw: boolean;
  snout: boolean;
  fur: boolean;
  setPaw: (value: boolean) => void;
}

const useDogStore = create<DogStore>()(
  subscribeWithSelector((set) => ({
    paw: true,
    snout: true,
    fur: true,
    setPaw: (value) => set({ paw: value }),
  }))
);
```

---

## Subscription Patterns

### Select Single Value

```typescript
// Subscribe to just the 'paw' state
const unsub = useDogStore.subscribe(
  (state) => state.paw,
  (paw) => console.log("Paw changed:", paw)
);
```

### Access Previous Value

```typescript
const unsub = useDogStore.subscribe(
  (state) => state.paw,
  (paw, previousPaw) => {
    console.log(`Paw changed from ${previousPaw} to ${paw}`);
  }
);
```

### Multiple Values with Shallow

```typescript
import { shallow } from "zustand/shallow";

const unsub = useDogStore.subscribe(
  (state) => [state.paw, state.fur],
  ([paw, fur]) => console.log("Paw or fur changed:", paw, fur),
  { equalityFn: shallow }
);
```

### Custom Equality Function

```typescript
const unsub = useDogStore.subscribe(
  (state) => state.paw,
  (paw) => console.log("Paw changed:", paw),
  { equalityFn: (a, b) => a === b }
);
```

### Fire Immediately

```typescript
// Callback fires immediately with current value, then on changes
const unsub = useDogStore.subscribe(
  (state) => state.paw,
  (paw) => console.log("Current paw:", paw),
  { fireImmediately: true }
);
```

---

## TypeScript Signature

```typescript
subscribeWithSelector<T>(
  stateCreator: StateCreator<T>
): StateCreator<T, [], [['zustand/subscribeWithSelector', never]]>
```

**Subscribe method signature:**

```typescript
subscribe<U>(
  selector: (state: T) => U,
  listener: (selectedState: U, previousSelectedState: U) => void,
  options?: {
    equalityFn?: (a: U, b: U) => boolean
    fireImmediately?: boolean
  }
): () => void
```

---

## Combining with Other Middleware

```typescript
import { create } from "zustand";
import { devtools, persist, subscribeWithSelector } from "zustand/middleware";

const useStore = create<Store>()(
  devtools(
    subscribeWithSelector(
      persist(
        (set) => ({
          /* store */
        }),
        { name: "storage" }
      )
    ),
    { name: "Store" }
  )
);
```

**Order:** devtools → subscribeWithSelector → persist

---

## Common Use Cases

### Sync to External System

```typescript
// Sync theme to CSS variable
useDogStore.subscribe(
  (state) => state.theme,
  (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
  },
  { fireImmediately: true }
);
```

### Analytics Tracking

```typescript
useDogStore.subscribe(
  (state) => state.paw,
  (paw, previousPaw) => {
    analytics.track("state_change", {
      field: "paw",
      from: previousPaw,
      to: paw,
    });
  }
);
```

### Derived Computations

```typescript
useDogStore.subscribe(
  (state) => [state.paw, state.fur] as const,
  ([paw, fur]) => {
    // Run expensive computation only when these change
    computeDogAppearance(paw, fur);
  },
  { equalityFn: shallow }
);
```

---

## Cleanup

**Always unsubscribe** when no longer needed:

```typescript
// In useEffect
useEffect(() => {
  const unsub = useDogStore.subscribe(
    (state) => state.paw,
    (paw) => console.log(paw)
  );
  return unsub; // Cleanup on unmount
}, []);
```

---

## Official Documentation

- **subscribeWithSelector**: https://github.com/pmndrs/zustand/blob/main/docs/middlewares/subscribe-with-selector.md
