# React Hooks Testing with Vitest

Complete guide to testing React hooks using `renderHook`, `waitFor`, and async patterns.

## Table of Contents

- [Basic Hook Testing](#basic-hook-testing)
- [Async Hooks](#async-hooks)
- [Hook State Updates](#hook-state-updates)
- [Testing with Context](#testing-with-context)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

## Basic Hook Testing

### Simple Hook

```typescript
// useCounter.ts
import { useState } from "react";

export function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);

  const increment = () => setCount((c) => c + 1);
  const decrement = () => setCount((c) => c - 1);

  return { count, increment, decrement };
}

// useCounter.test.ts
import { renderHook, act } from "@testing-library/react";
import { useCounter } from "./useCounter";

test("increments counter", () => {
  const { result } = renderHook(() => useCounter());

  // Initial state
  expect(result.current.count).toBe(0);

  // Update state
  act(() => {
    result.current.increment();
  });

  // Verify update
  expect(result.current.count).toBe(1);
});
```

### Key Points

- **`renderHook`**: Renders hook in test environment
- **`result.current`**: Access current hook return value
- **`act()`**: Wrap state updates
- **Don't destructure**: `result.current` is reactive

## Async Hooks

### Hook with Fetch

```typescript
// useUserData.ts
import { useState, useEffect } from "react";

export function useUserData(userId: number) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err);
        setIsLoading(false);
      });
  }, [userId]);

  return { data, isLoading, error };
}

// useUserData.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { useUserData } from "./useUserData";
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";

test("fetches user data", async () => {
  const { result } = renderHook(() => useUserData(123));

  // Initial loading state
  expect(result.current.isLoading).toBe(true);
  expect(result.current.data).toBeNull();

  // Wait for async operation
  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  // Verify final state
  expect(result.current.data).toEqual({
    id: 123,
    name: "Test User",
  });
  expect(result.current.error).toBeNull();
});
```

### waitFor Usage

**`waitFor`** repeatedly checks a condition until it passes or times out.

```typescript
// Wait for loading to finish
await waitFor(() => {
  expect(result.current.isLoading).toBe(false);
});

// Wait for data
await waitFor(() => {
  expect(result.current.data).toBeDefined();
});

// With custom timeout
await waitFor(
  () => {
    expect(result.current.isLoading).toBe(false);
  },
  { timeout: 5000 }
);
```

**Anti-pattern:** Don't use fixed delays

```typescript
// ❌ BAD: Fixed delay
await new Promise((resolve) => setTimeout(resolve, 1000));
expect(result.current.data).toBeDefined();

// ✅ GOOD: Wait for condition
await waitFor(() => {
  expect(result.current.data).toBeDefined();
});
```

## Hook State Updates

### Updating Props

```typescript
test("refetches on prop change", async () => {
  const { result, rerender } = renderHook(({ userId }) => useUserData(userId), {
    initialProps: { userId: 1 },
  });

  await waitFor(() => {
    expect(result.current.data.id).toBe(1);
  });

  // Change props
  rerender({ userId: 2 });

  await waitFor(() => {
    expect(result.current.data.id).toBe(2);
  });
});
```

### Testing Callbacks

```typescript
// useDebounce.ts
import { useState, useEffect } from "react";

export function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// useDebounce.test.ts
import { renderHook, act } from "@testing-library/react";
import { vi } from "vitest";
import { useDebounce } from "./useDebounce";

test("debounces value", () => {
  vi.useFakeTimers();

  const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
    initialProps: { value: "initial" },
  });

  expect(result.current).toBe("initial");

  // Update value
  rerender({ value: "updated" });

  // Value not updated yet
  expect(result.current).toBe("initial");

  // Fast-forward time
  act(() => {
    vi.advanceTimersByTime(500);
  });

  // Value updated after delay
  expect(result.current).toBe("updated");

  vi.useRealTimers();
});
```

## Testing with Context

### Hook Using Context

```typescript
// AuthContext.tsx
import React, { createContext, useContext } from 'react';

type User = { id: number; name: string };

const AuthContext = createContext<{ user: User | null }>({ user: null });

export function AuthProvider({ children, user }) {
  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// useAuth.test.ts
import { renderHook } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

test('provides user from context', () => {
  const user = { id: 1, name: 'Alice' };

  const wrapper = ({ children }) => (
    <AuthProvider user={user}>{children}</AuthProvider>
  );

  const { result } = renderHook(() => useAuth(), { wrapper });

  expect(result.current.user).toEqual(user);
});
```

### Multiple Context Providers

```typescript
function AllTheProviders({ children }) {
  return (
    <AuthProvider user={mockUser}>
      <ThemeProvider theme="dark">
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

const { result } = renderHook(() => useMyHook(), {
  wrapper: AllTheProviders,
});
```

## Common Patterns

### Pattern: Test Error Handling

```typescript
test("handles fetch error", async () => {
  server.use(
    http.get("/api/users/:id", () => {
      return HttpResponse.json({ error: "Server error" }, { status: 500 });
    })
  );

  const { result } = renderHook(() => useUserData(123));

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(result.current.error).toBeDefined();
  expect(result.current.data).toBeNull();
});
```

### Pattern: Test Cleanup

```typescript
test("cleans up on unmount", () => {
  const cleanup = vi.fn();

  function useWithCleanup() {
    useEffect(() => {
      return cleanup;
    }, []);
  }

  const { unmount } = renderHook(() => useWithCleanup());

  expect(cleanup).not.toHaveBeenCalled();

  unmount();

  expect(cleanup).toHaveBeenCalledOnce();
});
```

### Pattern: Test with Timers

```typescript
test("polls data periodically", () => {
  vi.useFakeTimers();

  const fetchData = vi.fn().mockResolvedValue({ data: "test" });

  function usePolling() {
    useEffect(() => {
      const interval = setInterval(fetchData, 1000);
      return () => clearInterval(interval);
    }, []);
  }

  renderHook(() => usePolling());

  expect(fetchData).not.toHaveBeenCalled();

  // Fast-forward 1 second
  act(() => {
    vi.advanceTimersByTime(1000);
  });

  expect(fetchData).toHaveBeenCalledTimes(1);

  // Fast-forward 2 more seconds
  act(() => {
    vi.advanceTimersByTime(2000);
  });

  expect(fetchData).toHaveBeenCalledTimes(3);

  vi.useRealTimers();
});
```

### Pattern: Test Multiple Renders

```typescript
test("accumulates values", () => {
  const { result, rerender } = renderHook(
    ({ value }) => {
      const [values, setValues] = useState([]);

      useEffect(() => {
        setValues((prev) => [...prev, value]);
      }, [value]);

      return values;
    },
    { initialProps: { value: 1 } }
  );

  expect(result.current).toEqual([1]);

  rerender({ value: 2 });
  expect(result.current).toEqual([1, 2]);

  rerender({ value: 3 });
  expect(result.current).toEqual([1, 2, 3]);
});
```

## Troubleshooting

### Issue: "Cannot read property of undefined"

**Cause:** Accessing `result.current` before hook renders

**Solution:** Check `result.current` exists

```typescript
// ❌ BAD
const value = result.current.value;

// ✅ GOOD
await waitFor(() => {
  expect(result.current).toBeDefined();
});
const value = result.current.value;
```

### Issue: Test hangs with waitFor

**Cause:** Condition never becomes true

**Solution:** Add debug and timeout

```typescript
await waitFor(
  () => {
    console.log("Current state:", result.current);
    expect(result.current.isLoading).toBe(false);
  },
  { timeout: 3000 }
);
```

### Issue: "act() warning"

**Cause:** State update not wrapped in `act()`

**Solution:** Wrap state updates

```typescript
// ❌ BAD
result.current.setValue("new");

// ✅ GOOD
act(() => {
  result.current.setValue("new");
});
```

### Issue: Hook depends on external data

**Cause:** Hook makes real API call

**Solution:** Mock with MSW (see [MSW Integration](./msw-integration.md))

### Issue: Destructuring breaks reactivity

**Cause:** Destructuring `result.current` loses reactivity

**Solution:** Don't destructure

```typescript
// ❌ BAD: Loses reactivity
const { data, isLoading } = result.current;
await waitFor(() => expect(isLoading).toBe(false)); // Still true!

// ✅ GOOD: Keep reference
await waitFor(() => {
  expect(result.current.isLoading).toBe(false);
});
```

## Best Practices

1. **Use MSW for data fetching** - Mock network, not hooks
2. **Use `waitFor` for async** - Not fixed timeouts
3. **Wrap updates in `act()`** - Prevents warnings
4. **Don't destructure `result.current`** - Loses reactivity
5. **Clean up timers** - Use fake timers and restore
6. **Test error states** - Override MSW handlers
7. **Test cleanup** - Verify `useEffect` cleanup

## Related References

- [React Hooks Testing Guide - Maya Shavin](https://mayashavin.com/articles/test-react-hooks-with-vitest)
- [Testing Async Hooks - Poly4](https://poly4.hashnode.dev/efficiently-testing-asynchronous-react-hooks-with-vitest)
- [Testing Library: renderHook](https://testing-library.com/docs/react-testing-library/api#renderhook)
- [Complete Guide to React Hooks Testing - Toptal](https://www.toptal.com/react/testing-react-hooks-tutorial)
