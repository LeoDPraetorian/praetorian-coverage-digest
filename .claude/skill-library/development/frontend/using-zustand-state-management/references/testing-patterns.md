# Zustand Testing Patterns

Complete guide for testing Zustand stores with Vitest and React Testing Library.

---

## Recommended Tools

- **Vitest**: Fast unit testing (compatible with Jest API)
- **React Testing Library**: Component testing
- **MSW (Mock Service Worker)**: Network mocking

---

## Key Challenge: Store Persistence

**Problem:** Zustand stores persist state between tests, causing flaky tests.

**Solution:** Reset stores to initial state after each test.

---

## Vitest Mock Pattern (Recommended)

Create a mock that auto-resets stores between tests:

### **mocks**/zustand.ts

```typescript
import { act } from "@testing-library/react";
import type * as ZustandExportedTypes from "zustand";

// Re-export all Zustand types
export * from "zustand";

// Import actual implementations
const { create: actualCreate, createStore: actualCreateStore } =
  await vi.importActual<typeof ZustandExportedTypes>("zustand");

// Track stores for reset
export const storeResetFns = new Set<() => void>();

// Wrapped create that registers reset function
const createUncurried = <T>(stateCreator: ZustandExportedTypes.StateCreator<T>) => {
  const store = actualCreate(stateCreator);
  const initialState = store.getInitialState();
  storeResetFns.add(() => {
    store.setState(initialState, true);
  });
  return store;
};

// Export wrapped create (handles both curried and uncurried)
export const create = (<T>(stateCreator: ZustandExportedTypes.StateCreator<T>) => {
  return typeof stateCreator === "function" ? createUncurried(stateCreator) : createUncurried;
}) as typeof ZustandExportedTypes.create;

// Wrapped createStore for vanilla stores
const createStoreUncurried = <T>(stateCreator: ZustandExportedTypes.StateCreator<T>) => {
  const store = actualCreateStore(stateCreator);
  const initialState = store.getInitialState();
  storeResetFns.add(() => {
    store.setState(initialState, true);
  });
  return store;
};

export const createStore = (<T>(stateCreator: ZustandExportedTypes.StateCreator<T>) => {
  return typeof stateCreator === "function"
    ? createStoreUncurried(stateCreator)
    : createStoreUncurried;
}) as typeof ZustandExportedTypes.createStore;

// Reset all stores after each test
afterEach(() => {
  act(() => {
    storeResetFns.forEach((resetFn) => {
      resetFn();
    });
  });
});
```

### Vitest Config

```typescript
// vitest.config.ts or vite.config.ts
export default defineConfig({
  test: {
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

### Setup File

```typescript
// src/test/setup.ts
import "@testing-library/jest-dom";

// Mock zustand
vi.mock("zustand");
```

---

## Manual Reset Pattern

If you prefer explicit control over resets:

### Store with getInitialState

```typescript
import { create } from "zustand";

const initialState = {
  bears: 0,
  fishes: 0,
};

interface Store {
  bears: number;
  fishes: number;
  addBear: () => void;
  reset: () => void;
}

const useBearStore = create<Store>()((set, get, store) => ({
  ...initialState,
  addBear: () => set((s) => ({ bears: s.bears + 1 })),
  reset: () => set(store.getInitialState()),
}));

export { useBearStore };
```

### Test with Manual Reset

```typescript
import { beforeEach } from "vitest";
import { useBearStore } from "./store";

beforeEach(() => {
  useBearStore.getState().reset();
});

test("adds a bear", () => {
  expect(useBearStore.getState().bears).toBe(0);
  useBearStore.getState().addBear();
  expect(useBearStore.getState().bears).toBe(1);
});
```

---

## Component Testing

### Basic Component Test

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BearCounter } from './BearCounter'

test('displays bear count and increments', async () => {
  const user = userEvent.setup()
  render(<BearCounter />)

  expect(screen.getByText(/0 bears/i)).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /add/i }))

  expect(screen.getByText(/1 bear/i)).toBeInTheDocument()
})
```

### Testing with Store State

```typescript
import { act } from '@testing-library/react'
import { useBearStore } from './store'

test('component reflects store changes', async () => {
  render(<BearCounter />)

  // Modify store directly
  act(() => {
    useBearStore.setState({ bears: 5 })
  })

  expect(screen.getByText(/5 bears/i)).toBeInTheDocument()
})
```

---

## Testing Async Actions

```typescript
import { vi } from "vitest";
import { useBearStore } from "./store";

test("fetches bears from API", async () => {
  // Mock fetch
  vi.spyOn(global, "fetch").mockResolvedValue({
    json: () => Promise.resolve({ bears: 10 }),
  } as Response);

  await useBearStore.getState().fetchBears();

  expect(useBearStore.getState().bears).toBe(10);
  expect(fetch).toHaveBeenCalledWith("/api/bears");
});
```

---

## Testing Persist Middleware

### Mock localStorage

```typescript
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});
```

### Test Persistence

```typescript
test("persists state to localStorage", () => {
  useBearStore.getState().addBear();

  expect(localStorage.setItem).toHaveBeenCalledWith(
    "bear-storage",
    expect.stringContaining('"bears":1')
  );
});
```

### Test Hydration

```typescript
test("hydrates from localStorage", () => {
  localStorage.getItem.mockReturnValue(JSON.stringify({ state: { bears: 5 }, version: 0 }));

  // Re-create store or trigger rehydration
  // ...

  expect(useBearStore.getState().bears).toBe(5);
});
```

---

## Testing Slices

```typescript
import { useBoundStore } from "./store";

describe("BearSlice", () => {
  test("addBear increments bear count", () => {
    expect(useBoundStore.getState().bears).toBe(0);
    useBoundStore.getState().addBear();
    expect(useBoundStore.getState().bears).toBe(1);
  });
});

describe("FishSlice", () => {
  test("addFish increments fish count", () => {
    expect(useBoundStore.getState().fishes).toBe(0);
    useBoundStore.getState().addFish();
    expect(useBoundStore.getState().fishes).toBe(1);
  });
});

describe("Cross-slice interactions", () => {
  test("eatFish decrements fish when bear eats", () => {
    useBoundStore.setState({ fishes: 5 });
    useBoundStore.getState().eatFish();
    expect(useBoundStore.getState().fishes).toBe(4);
  });
});
```

---

## Testing subscribeWithSelector

```typescript
import { vi } from "vitest";
import { useDogStore } from "./store";

test("subscription fires on selected state change", () => {
  const callback = vi.fn();

  const unsub = useDogStore.subscribe((state) => state.paw, callback);

  // Change paw - should fire
  useDogStore.setState({ paw: false });
  expect(callback).toHaveBeenCalledWith(false, true);

  // Change snout - should NOT fire
  callback.mockClear();
  useDogStore.setState({ snout: false });
  expect(callback).not.toHaveBeenCalled();

  unsub();
});
```

---

## Best Practices

### 1. Reset Between Tests

Always reset store state between tests to prevent flaky tests.

### 2. Test Store Logic Separately

```typescript
// Test store actions independently of components
test("addBear increments count", () => {
  useBearStore.getState().addBear();
  expect(useBearStore.getState().bears).toBe(1);
});
```

### 3. Use act() for State Updates

```typescript
import { act } from "@testing-library/react";

act(() => {
  useBearStore.setState({ bears: 5 });
});
```

### 4. Mock Network Requests

Use MSW or vi.spyOn for async actions.

### 5. Test Selectors

```typescript
test("selectById returns correct item", () => {
  useBearStore.setState({
    items: [
      { id: "1", name: "Bear 1" },
      { id: "2", name: "Bear 2" },
    ],
  });

  const result = selectById("2")(useBearStore.getState());
  expect(result).toEqual({ id: "2", name: "Bear 2" });
});
```

---

## Official Documentation

- **Testing Guide**: https://zustand.docs.pmnd.rs/guides/testing
- **Vitest**: https://vitest.dev/
- **React Testing Library**: https://testing-library.com/docs/react-testing-library/intro/
