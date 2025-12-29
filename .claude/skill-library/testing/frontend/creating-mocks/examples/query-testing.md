# TanStack Query Testing Examples

**Complete patterns for testing queries, mutations, and optimistic updates with Vitest + MSW.**

This example demonstrates how to test React components and hooks that use TanStack Query v5 for server state management. All patterns use MSW (Mock Service Worker) for API mocking and Vitest for test execution.

**Related examples:**

- [MSW Setup](msw-setup.md) - Complete MSW server configuration
- [Factory Pattern](factory-pattern.md) - Test data generation with Fishery

**Related references:**

- [TanStack Query Testing](../references/tanstack-query-testing.md) - Detailed testing strategies
- [MSW Integration](../references/msw-integration.md) - MSW patterns and best practices
- [React Hooks Testing](../references/react-hooks-testing.md) - Hook testing patterns

---

## Table of Contents

1. [Test Utility Setup](#test-utility-setup) - Reusable test helpers
2. [Basic Query Testing](#basic-query-testing) - Testing `useQuery` hooks
3. [MSW Integration](#msw-integration-with-queries) - API mocking with MSW
4. [Mutation Testing](#mutation-testing) - Testing `useMutation` hooks
5. [Component Testing](#component-testing) - Full React component tests
6. [Optimistic Updates](#testing-optimistic-updates) - Advanced mutation patterns
7. [Best Practices](#best-practices) - Testing guidelines

---

## Test Utility Setup

**Create reusable test utilities to avoid repetition and ensure consistent test behavior.**

```typescript
// src/test-utils/query-test-utils.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { RenderOptions } from '@testing-library/react'

/**
 * Creates a QueryClient configured for testing.
 *
 * Key configurations:
 * - retry: false - Prevents retries that cause unpredictable test timing
 * - gcTime: Infinity - Keeps cache alive for entire test duration
 * - logger.error: noop - Silences expected errors to reduce console noise
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // Silence errors in tests
    },
  })
}

/**
 * Renders a component wrapped with QueryClientProvider.
 * Use this instead of @testing-library/react's render() for components using TanStack Query.
 */
export function renderWithClient(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const testQueryClient = createTestQueryClient()

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  )

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    queryClient: testQueryClient,
  }
}

/**
 * Creates a wrapper for renderHook that provides QueryClientProvider.
 * Returns both the wrapper and queryClient for cache inspection.
 */
export function createQueryWrapper() {
  const testQueryClient = createTestQueryClient()

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  )

  return { wrapper, queryClient: testQueryClient }
}
```

**Why these utilities matter:**

- **Consistent configuration**: All tests use the same QueryClient settings
- **No test pollution**: Each test gets a fresh QueryClient
- **Reduced boilerplate**: Import once, use everywhere
- **Cache inspection**: Access to queryClient for advanced assertions

---

## Basic Query Testing

**Test custom hooks that use `useQuery` with `renderHook` and `waitFor`.**

### Example Hook

```typescript
// src/hooks/useAssets.ts
import { useQuery } from "@tanstack/react-query";

interface Asset {
  id: string;
  name: string;
  status: "active" | "inactive";
}

export function useAssets() {
  return useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const response = await fetch("/api/assets");
      if (!response.ok) throw new Error("Failed to fetch assets");
      return response.json() as Promise<Asset[]>;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
```

### Test Suite

```typescript
// src/hooks/useAssets.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAssets } from "./useAssets";
import { createQueryWrapper } from "../test-utils/query-test-utils";

describe("useAssets", () => {
  beforeEach(() => {
    // Reset any mocked fetch between tests
    vi.restoreAllMocks();
  });

  it("fetches assets successfully", async () => {
    // Arrange: Mock successful API response
    const mockAssets = [
      { id: "1", name: "Asset 1", status: "active" },
      { id: "2", name: "Asset 2", status: "inactive" },
    ];

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockAssets),
      } as Response)
    );

    const { wrapper } = createQueryWrapper();

    // Act: Render hook
    const { result } = renderHook(() => useAssets(), { wrapper });

    // Assert: Initially pending
    expect(result.current.isPending).toBe(true);
    expect(result.current.data).toBeUndefined();

    // Assert: Eventually successful
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockAssets);
    expect(result.current.error).toBeNull();
  });

  it("handles API errors", async () => {
    // Arrange: Mock failed API response
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      } as Response)
    );

    const { wrapper } = createQueryWrapper();

    // Act: Render hook
    const { result } = renderHook(() => useAssets(), { wrapper });

    // Assert: Eventually in error state
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe("Failed to fetch assets");
    expect(result.current.data).toBeUndefined();
  });

  it("uses cached data on subsequent renders", async () => {
    // Arrange: Mock API
    const mockAssets = [{ id: "1", name: "Asset 1", status: "active" }];
    const fetchSpy = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockAssets),
      } as Response)
    );
    global.fetch = fetchSpy;

    const { wrapper, queryClient } = createQueryWrapper();

    // Act: First render
    const { result, rerender } = renderHook(() => useAssets(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Clear mock call history
    fetchSpy.mockClear();

    // Act: Rerender within staleTime
    rerender();

    // Assert: No new fetch (data is fresh)
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.data).toEqual(mockAssets);
  });
});
```

**Key patterns:**

- ✅ Test all three states: `isPending`, `isSuccess`, `isError`
- ✅ Use `waitFor` for async state transitions
- ✅ Mock at the network boundary (`fetch`), not the hook
- ✅ Test caching behavior (staleTime)

---

## MSW Integration with Queries

**Use MSW for more realistic API mocking with full request/response lifecycle.**

### MSW Server Setup

```typescript
// src/test-utils/msw-server.ts
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

// Define default handlers for common endpoints
export const handlers = [
  http.get("/api/assets", () => {
    return HttpResponse.json([
      { id: "1", name: "Test Asset 1", status: "active" },
      { id: "2", name: "Test Asset 2", status: "inactive" },
    ]);
  }),

  http.get("/api/assets/:id", ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: `Asset ${params.id}`,
      status: "active",
    });
  }),
];

// Create server instance
export const server = setupServer(...handlers);
```

### Test Suite with MSW

```typescript
// src/hooks/useAssets.test.ts
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../test-utils/msw-server";
import { useAssets } from "./useAssets";
import { createQueryWrapper } from "../test-utils/query-test-utils";

describe("useAssets with MSW", () => {
  // Start server before all tests
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

  // Reset handlers after each test
  afterEach(() => server.resetHandlers());

  // Clean up after all tests
  afterAll(() => server.close());

  it("fetches assets from API", async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useAssets(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].name).toBe("Test Asset 1");
  });

  it("handles server errors", async () => {
    // Override default handler for this test
    server.use(
      http.get("/api/assets", () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useAssets(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Failed to fetch assets");
  });

  it("handles network timeouts", async () => {
    server.use(
      http.get("/api/assets", async () => {
        // Simulate timeout by never resolving
        await new Promise(() => {});
        return new HttpResponse(null);
      })
    );

    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useAssets(), { wrapper });

    // Still pending after reasonable wait
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(result.current.isPending).toBe(true);
  });

  it("handles invalid JSON responses", async () => {
    server.use(
      http.get("/api/assets", () => {
        return new HttpResponse("Invalid JSON", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      })
    );

    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useAssets(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

**Why use MSW over `vi.fn()`:**

- ✅ Intercepts real network requests (catches fetch/axios bugs)
- ✅ Tests full request lifecycle (URL, headers, method)
- ✅ Supports request handlers (dynamic responses based on params)
- ✅ Easy to override per-test with `server.use()`
- ✅ Reusable across unit and integration tests

**See:** [MSW Setup Example](msw-setup.md) for complete server configuration.

---

## Mutation Testing

**Test `useMutation` hooks including lifecycle callbacks and cache invalidation.**

### Example Mutation Hook

```typescript
// src/hooks/useCreateAsset.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface CreateAssetInput {
  name: string;
  status: "active" | "inactive";
}

export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAssetInput) => {
      const response = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error("Failed to create asset");
      return response.json();
    },
    onSuccess: () => {
      // Invalidate assets list to trigger refetch
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}
```

### Test Suite

```typescript
// src/hooks/useCreateAsset.test.ts
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../test-utils/msw-server";
import { useCreateAsset } from "./useCreateAsset";
import { createQueryWrapper } from "../test-utils/query-test-utils";

// Add mutation handler to server
beforeAll(() => {
  server.listen();
  server.use(
    http.post("/api/assets", async ({ request }) => {
      const body = (await request.json()) as { name: string; status: string };
      return HttpResponse.json({
        id: "999",
        ...body,
      });
    })
  );
});

afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("useCreateAsset", () => {
  it("creates asset successfully", async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useCreateAsset(), { wrapper });

    // Initially idle
    expect(result.current.isPending).toBe(false);
    expect(result.current.data).toBeUndefined();

    // Trigger mutation
    act(() => {
      result.current.mutate({ name: "New Asset", status: "active" });
    });

    // Pending during mutation
    expect(result.current.isPending).toBe(true);

    // Wait for success
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      id: "999",
      name: "New Asset",
      status: "active",
    });
  });

  it("handles mutation errors", async () => {
    server.use(
      http.post("/api/assets", () => {
        return new HttpResponse(null, { status: 400 });
      })
    );

    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useCreateAsset(), { wrapper });

    act(() => {
      result.current.mutate({ name: "New Asset", status: "active" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Failed to create asset");
  });

  it("invalidates assets query on success", async () => {
    const { wrapper, queryClient } = createQueryWrapper();

    // Prefill cache with existing assets
    queryClient.setQueryData(["assets"], [{ id: "1", name: "Existing Asset", status: "active" }]);

    const { result } = renderHook(() => useCreateAsset(), { wrapper });

    // Spy on invalidateQueries
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    act(() => {
      result.current.mutate({ name: "New Asset", status: "active" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify invalidation was called
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["assets"] });
  });

  it("resets mutation state", async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useCreateAsset(), { wrapper });

    // Trigger mutation
    act(() => {
      result.current.mutate({ name: "New Asset", status: "active" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Reset mutation
    act(() => {
      result.current.reset();
    });

    // Back to idle state
    expect(result.current.status).toBe("idle");
    expect(result.current.data).toBeUndefined();
  });
});
```

**Key patterns:**

- ✅ Use `act()` when triggering mutations
- ✅ Test all lifecycle states: idle → pending → success/error
- ✅ Verify `onSuccess`/`onError` callbacks execute
- ✅ Test cache invalidation with spy
- ✅ Test mutation reset

---

## Component Testing

**Test React components that use TanStack Query hooks.**

### Example Component

```typescript
// src/components/AssetList.tsx
import { useAssets } from '../hooks/useAssets'
import { useCreateAsset } from '../hooks/useCreateAsset'

export function AssetList() {
  const { data: assets, isPending, isError, error } = useAssets()
  const createAsset = useCreateAsset()
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createAsset.mutate({ name, status: 'active' })
    setName('')
  }

  if (isPending) return <div>Loading assets...</div>
  if (isError) return <div>Error: {error.message}</div>

  return (
    <div>
      <h1>Assets</h1>
      <ul>
        {assets.map(asset => (
          <li key={asset.id}>{asset.name}</li>
        ))}
      </ul>

      <form onSubmit={handleSubmit}>
        <input
          placeholder="New asset name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <button type="submit" disabled={createAsset.isPending}>
          {createAsset.isPending ? 'Creating...' : 'Create Asset'}
        </button>
      </form>
    </div>
  )
}
```

### Test Suite

```typescript
// src/components/AssetList.test.tsx
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../test-utils/msw-server'
import { renderWithClient } from '../test-utils/query-test-utils'
import { AssetList } from './AssetList'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('AssetList', () => {
  it('displays loading state initially', () => {
    renderWithClient(<AssetList />)
    expect(screen.getByText(/loading assets/i)).toBeInTheDocument()
  })

  it('displays assets after loading', async () => {
    renderWithClient(<AssetList />)

    await waitFor(() => {
      expect(screen.queryByText(/loading assets/i)).not.toBeInTheDocument()
    })

    expect(screen.getByText('Test Asset 1')).toBeInTheDocument()
    expect(screen.getByText('Test Asset 2')).toBeInTheDocument()
  })

  it('displays error message on API failure', async () => {
    server.use(
      http.get('/api/assets', () => {
        return new HttpResponse(null, { status: 500 })
      })
    )

    renderWithClient(<AssetList />)

    await waitFor(() => {
      expect(screen.getByText(/error:/i)).toBeInTheDocument()
    })
  })

  it('creates new asset', async () => {
    const user = userEvent.setup()

    renderWithClient(<AssetList />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Test Asset 1')).toBeInTheDocument()
    })

    // Fill form
    const input = screen.getByPlaceholderText(/new asset name/i)
    await user.type(input, 'New Test Asset')

    // Submit
    const button = screen.getByRole('button', { name: /create asset/i })
    await user.click(button)

    // Wait for new asset to appear (after invalidation refetch)
    await waitFor(() => {
      expect(screen.getByText('New Test Asset')).toBeInTheDocument()
    })

    // Input should be cleared
    expect(input).toHaveValue('')
  })

  it('disables button during mutation', async () => {
    const user = userEvent.setup()

    // Slow down mutation to test pending state
    server.use(
      http.post('/api/assets', async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return HttpResponse.json({ id: '999', name: 'New Asset', status: 'active' })
      })
    )

    renderWithClient(<AssetList />)

    await waitFor(() => {
      expect(screen.getByText('Test Asset 1')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText(/new asset name/i)
    const button = screen.getByRole('button', { name: /create asset/i })

    await user.type(input, 'New Asset')
    await user.click(button)

    // Button should show pending state
    expect(screen.getByText(/creating\.\.\./i)).toBeInTheDocument()
    expect(button).toBeDisabled()

    // Wait for completion
    await waitFor(() => {
      expect(screen.getByText(/create asset/i)).toBeInTheDocument()
    })
  })
})
```

**Key patterns:**

- ✅ Test loading → success → interaction workflow
- ✅ Use `userEvent` for realistic user interactions
- ✅ Test form submissions and mutations
- ✅ Verify UI updates after cache invalidation
- ✅ Test error states and edge cases

---

## Testing Optimistic Updates

**Test complex mutation patterns with optimistic updates and rollback.**

### Example Mutation with Optimistic Update

```typescript
// src/hooks/useToggleAssetStatus.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface Asset {
  id: string;
  name: string;
  status: "active" | "inactive";
}

export function useToggleAssetStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assetId: string) => {
      const response = await fetch(`/api/assets/${assetId}/toggle`, {
        method: "PATCH",
      });
      if (!response.ok) throw new Error("Failed to toggle status");
      return response.json();
    },

    // Optimistic update: Apply change immediately
    onMutate: async (assetId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["assets"] });

      // Snapshot previous value for rollback
      const previousAssets = queryClient.getQueryData<Asset[]>(["assets"]);

      // Optimistically update cache
      queryClient.setQueryData<Asset[]>(["assets"], (old = []) =>
        old.map((asset) =>
          asset.id === assetId
            ? { ...asset, status: asset.status === "active" ? "inactive" : "active" }
            : asset
        )
      );

      // Return context for rollback
      return { previousAssets };
    },

    // Rollback on error
    onError: (err, assetId, context) => {
      if (context?.previousAssets) {
        queryClient.setQueryData(["assets"], context.previousAssets);
      }
    },

    // Always refetch to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}
```

### Test Suite

```typescript
// src/hooks/useToggleAssetStatus.test.ts
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../test-utils/msw-server";
import { useToggleAssetStatus } from "./useToggleAssetStatus";
import { createQueryWrapper } from "../test-utils/query-test-utils";

beforeAll(() => {
  server.listen();
  server.use(
    http.patch("/api/assets/:id/toggle", ({ params }) => {
      return HttpResponse.json({
        id: params.id,
        name: "Test Asset",
        status: "inactive", // Toggled
      });
    })
  );
});

afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("useToggleAssetStatus - Optimistic Updates", () => {
  it("applies optimistic update immediately", async () => {
    const { wrapper, queryClient } = createQueryWrapper();

    // Prefill cache
    queryClient.setQueryData(["assets"], [{ id: "1", name: "Asset 1", status: "active" }]);

    const { result } = renderHook(() => useToggleAssetStatus(), { wrapper });

    // Trigger mutation
    act(() => {
      result.current.mutate("1");
    });

    // Check optimistic update applied immediately (before server response)
    const cachedAssets = queryClient.getQueryData<any[]>(["assets"]);
    expect(cachedAssets?.[0].status).toBe("inactive");

    // Wait for mutation to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("rolls back optimistic update on error", async () => {
    const { wrapper, queryClient } = createQueryWrapper();

    // Prefill cache
    const originalAssets = [{ id: "1", name: "Asset 1", status: "active" }];
    queryClient.setQueryData(["assets"], originalAssets);

    // Mock server error
    server.use(
      http.patch("/api/assets/:id/toggle", () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    const { result } = renderHook(() => useToggleAssetStatus(), { wrapper });

    // Trigger mutation
    act(() => {
      result.current.mutate("1");
    });

    // Check optimistic update applied
    let cachedAssets = queryClient.getQueryData<any[]>(["assets"]);
    expect(cachedAssets?.[0].status).toBe("inactive");

    // Wait for error
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Check rollback occurred
    cachedAssets = queryClient.getQueryData<any[]>(["assets"]);
    expect(cachedAssets?.[0].status).toBe("active"); // Rolled back
  });

  it("invalidates cache after successful mutation", async () => {
    const { wrapper, queryClient } = createQueryWrapper();

    queryClient.setQueryData(["assets"], [{ id: "1", name: "Asset 1", status: "active" }]);

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useToggleAssetStatus(), { wrapper });

    act(() => {
      result.current.mutate("1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify invalidation called
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["assets"] });
  });

  it("cancels ongoing queries during optimistic update", async () => {
    const { wrapper, queryClient } = createQueryWrapper();

    queryClient.setQueryData(["assets"], [{ id: "1", name: "Asset 1", status: "active" }]);

    const cancelSpy = vi.spyOn(queryClient, "cancelQueries");

    const { result } = renderHook(() => useToggleAssetStatus(), { wrapper });

    act(() => {
      result.current.mutate("1");
    });

    // Verify cancelQueries called to prevent race conditions
    expect(cancelSpy).toHaveBeenCalledWith({ queryKey: ["assets"] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
```

**Key patterns:**

- ✅ Test optimistic update applies immediately
- ✅ Verify rollback on error
- ✅ Check `cancelQueries` prevents race conditions
- ✅ Verify `onSettled` invalidation occurs
- ✅ Test with prefilled cache (realistic scenario)

**Why optimistic updates matter:**

- Instant UI feedback (no waiting for server)
- Improved perceived performance
- Graceful error handling with rollback
- Complex to implement correctly (testing is critical)

---

## Best Practices

### ✅ DO

**Test Infrastructure:**

- Create reusable test utilities (`createTestQueryClient`, `renderWithClient`)
- Use MSW for consistent, realistic API mocking
- Disable retries in tests (`retry: false`)
- Silence expected errors in test QueryClient

**Test Coverage:**

- Test all query states: `isPending`, `isSuccess`, `isError`
- Test mutation lifecycle: idle → pending → success/error
- Test optimistic updates AND rollback scenarios
- Test cache invalidation and refetch behavior

**Test Patterns:**

- Use `waitFor` for async state transitions
- Use `act()` when triggering mutations
- Mock at network boundary (fetch/MSW), not hooks
- Prefill cache when testing with existing data

**Assertions:**

- Check `result.current` for hook state
- Inspect `queryClient.getQueryData()` for cache state
- Verify callbacks with spies (`vi.spyOn`)

### ❌ DON'T

**Anti-Patterns:**

- Don't mock TanStack Query internals (`useQuery`, `useMutation`)
- Don't test implementation details (internal state)
- Don't use real API calls in unit tests
- Don't forget to clean up between tests (`afterEach`)

**Common Mistakes:**

- Forgetting `retry: false` (causes flaky timing)
- Not using `waitFor` for async (race conditions)
- Mocking hooks instead of network (misses integration bugs)
- Testing synchronously (queries are always async)

### Testing Checklist

For each query/mutation test:

- [ ] Test loading/pending state
- [ ] Test success state with data
- [ ] Test error state with error message
- [ ] Test cache behavior (invalidation, refetch)
- [ ] Mock with MSW (not `vi.fn()`)
- [ ] Use `waitFor` for async assertions
- [ ] Clean up with `afterEach(() => server.resetHandlers())`

For optimistic updates:

- [ ] Test immediate optimistic update
- [ ] Test rollback on error
- [ ] Test final state after success
- [ ] Verify `cancelQueries` called

---

## Related Resources

**Skills:**

- `using-tanstack-query` - Complete TanStack Query v5 patterns
- `frontend-testing-patterns` - General React testing strategies

**Examples:**

- [MSW Setup](msw-setup.md) - Complete MSW server configuration
- [Factory Pattern](factory-pattern.md) - Test data generation

**References:**

- [TanStack Query Testing](../references/tanstack-query-testing.md) - Detailed testing strategies
- [MSW Integration](../references/msw-integration.md) - MSW patterns and best practices
- [React Hooks Testing](../references/react-hooks-testing.md) - Hook testing patterns
- [Test Isolation](../references/test-isolation.md) - Cleanup and lifecycle management

**Official Docs:**

- [TanStack Query Testing Guide](https://tanstack.com/query/latest/docs/react/guides/testing)
- [MSW Documentation](https://mswjs.io/)
- [Vitest API Reference](https://vitest.dev/api/)
