# MSW Setup Example

Complete working example of MSW setup for Vitest + React Testing Library.

## Directory Structure

```
src/
├── test/
│   ├── setup.ts                 # Vitest setup file
│   ├── utils.tsx                # Test utilities (wrapper)
│   └── mocks/
│       ├── server.ts            # MSW server instance
│       ├── handlers.ts          # Request handlers
│       └── fixtures/
│           └── users.ts         # Mock data
├── hooks/
│   ├── useUsers.ts              # Hook to test
│   └── useUsers.test.ts         # Test file
└── components/
    ├── UserList.tsx             # Component to test
    └── UserList.test.tsx        # Test file
```

## Setup Files

### src/test/mocks/fixtures/users.ts

```typescript
export const mockUsers = [
  { id: 1, name: "Alice", email: "alice@example.com", role: "admin" },
  { id: 2, name: "Bob", email: "bob@example.com", role: "user" },
  { id: 3, name: "Charlie", email: "charlie@example.com", role: "user" },
];

export const mockUser = mockUsers[0];
```

### src/test/mocks/handlers.ts

```typescript
import { http, HttpResponse } from "msw";
import { mockUsers, mockUser } from "./fixtures/users";

export const handlers = [
  // GET /api/users - List all users
  http.get("/api/users", () => {
    return HttpResponse.json(mockUsers);
  }),

  // GET /api/users/:id - Get single user
  http.get("/api/users/:id", ({ params }) => {
    const { id } = params;
    const user = mockUsers.find((u) => u.id === Number(id));

    if (!user) {
      return HttpResponse.json({ error: "User not found" }, { status: 404 });
    }

    return HttpResponse.json(user);
  }),

  // POST /api/users - Create user
  http.post("/api/users", async ({ request }) => {
    const body = await request.json();

    return HttpResponse.json(
      {
        id: mockUsers.length + 1,
        ...body,
        createdAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // PUT /api/users/:id - Update user
  http.put("/api/users/:id", async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();
    const user = mockUsers.find((u) => u.id === Number(id));

    if (!user) {
      return HttpResponse.json({ error: "User not found" }, { status: 404 });
    }

    return HttpResponse.json({
      ...user,
      ...body,
      updatedAt: new Date().toISOString(),
    });
  }),

  // DELETE /api/users/:id - Delete user
  http.delete("/api/users/:id", ({ params }) => {
    const { id } = params;

    return HttpResponse.json(null, { status: 204 });
  }),
];
```

### src/test/mocks/server.ts

```typescript
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

### src/test/setup.ts

```typescript
import { beforeAll, afterEach, afterAll } from "vitest";
import { server } from "./mocks/server";

// Start server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
});

// Close server after all tests
afterAll(() => {
  server.close();
});
```

### src/test/utils.tsx

```typescript
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {},
    },
  });
}

export function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

## Hook Implementation

### src/hooks/useUsers.ts

```typescript
import { useQuery } from "@tanstack/react-query";

async function fetchUsers() {
  const response = await fetch("/api/users");
  if (!response.ok) {
    throw new Error("Failed to fetch users");
  }
  return response.json();
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });
}
```

## Test Examples

### src/hooks/useUsers.test.ts

```typescript
import { describe, test, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";
import { wrapper } from "@/test/utils";
import { mockUsers } from "@/test/mocks/fixtures/users";
import { useUsers } from "./useUsers";

describe("useUsers", () => {
  test("fetches users successfully", async () => {
    const { result } = renderHook(() => useUsers(), { wrapper });

    // Initial loading state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    // Wait for success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockUsers);
  });

  test("handles server error", async () => {
    // Override handler for this test
    server.use(
      http.get("/api/users", () => {
        return HttpResponse.json({ error: "Internal Server Error" }, { status: 500 });
      })
    );

    const { result } = renderHook(() => useUsers(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  test("handles network error", async () => {
    server.use(
      http.get("/api/users", () => {
        return HttpResponse.error();
      })
    );

    const { result } = renderHook(() => useUsers(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
```

## Component Test Example

### src/components/UserList.test.tsx

```typescript
import { describe, test, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';
import { wrapper } from '@/test/utils';
import { UserList } from './UserList';

describe('UserList', () => {
  test('displays list of users', async () => {
    render(<UserList />, { wrapper });

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  test('displays error message', async () => {
    server.use(
      http.get('/api/users', () => {
        return HttpResponse.json(
          { error: 'Server error' },
          { status: 500 }
        );
      })
    );

    render(<UserList />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

## Configuration

### vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

## Key Takeaways

1. **Single server instance** shared across all tests
2. **Reset handlers** in `afterEach` to prevent test pollution
3. **Override handlers** per-test for error scenarios
4. **Shared fixtures** for consistent mock data
5. **Test utilities** provide QueryClient wrapper
6. **Real hooks** tested with mocked network

This setup provides a realistic testing environment where React hooks work normally and only the network is mocked.
