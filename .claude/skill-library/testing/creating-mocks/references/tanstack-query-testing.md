# TanStack Query Testing

Complete guide to testing TanStack Query hooks with Vitest and MSW.

## Core Principle

**Mock the network, not the Query hooks.** Let TanStack Query work as it does in production.

## Basic Setup

### Create Test QueryClient

```typescript
// src/test/utils.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        cacheTime: Infinity, // Keep cache between tests
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // Suppress error logs in tests
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

### Test useQuery Hook

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { wrapper } from '@/test/utils';
import { useUserQuery } from './useUserQuery';

test('fetches user data', async () => {
  const { result } = renderHook(() => useUserQuery(123), { wrapper });

  // Initial state
  expect(result.current.isLoading).toBe(true);
  expect(result.current.data).toBeUndefined();

  // Wait for success
  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });

  expect(result.current.data).toEqual({
    id: 123,
    name: 'Test User',
  });
});
```

## Testing Mutations

### useMutation Hook

```typescript
// useCreateUser.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: NewUser) => {
      const res = await fetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(user),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// useCreateUser.test.ts
test('creates user', async () => {
  const { result } = renderHook(() => useCreateUser(), { wrapper });

  act(() => {
    result.current.mutate({ name: 'Alice', email: 'alice@example.com' });
  });

  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });

  expect(result.current.data).toEqual({
    id: expect.any(Number),
    name: 'Alice',
    email: 'alice@example.com',
  });
});
```

## Error Handling

### Test Error State

```typescript
test('handles server error', async () => {
  server.use(
    http.get('/api/users/:id', () => {
      return HttpResponse.json(
        { error: 'Server error' },
        { status: 500 }
      );
    })
  );

  const { result } = renderHook(() => useUserQuery(123), { wrapper });

  await waitFor(() => {
    expect(result.current.isError).toBe(true);
  });

  expect(result.current.error).toBeDefined();
});
```

## Cache Management

### Test Cache Invalidation

```typescript
test('invalidates cache on mutation', async () => {
  const queryClient = createTestQueryClient();

  // Pre-populate cache
  queryClient.setQueryData(['users'], [{ id: 1, name: 'Alice' }]);

  const { result } = renderHook(
    () => ({
      users: useQuery({ queryKey: ['users'], queryFn: fetchUsers }),
      createUser: useCreateUser(),
    }),
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    }
  );

  // Initial data from cache
  expect(result.current.users.data).toEqual([{ id: 1, name: 'Alice' }]);

  // Create user (invalidates cache)
  act(() => {
    result.current.createUser.mutate({ name: 'Bob' });
  });

  // Wait for refetch
  await waitFor(() => {
    expect(result.current.users.data).toHaveLength(2);
  });
});
```

## Testing Components

### Component with useQuery

```typescript
// UserProfile.tsx
export function UserProfile({ userId }: { userId: number }) {
  const { data, isLoading, error } = useUserQuery(userId);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{data.name}</div>;
}

// UserProfile.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { wrapper } from '@/test/utils';

test('displays user name', async () => {
  render(<UserProfile userId={123} />, { wrapper });

  expect(screen.getByText('Loading...')).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });
});
```

## Best Practices

1. **Disable retries** - Set `retry: false` in test QueryClient
2. **Mock network, not hooks** - Use MSW for API mocking
3. **Use wrapper consistently** - Reuse same wrapper across tests
4. **Clear cache between tests** - Reset QueryClient in `afterEach`
5. **Test loading states** - Verify UI during async operations
6. **Test error states** - Override MSW handlers for errors

## Common Patterns

### Pattern: Test with Suspense

```typescript
test('suspends while loading', async () => {
  function UserWithSuspense() {
    return (
      <Suspense fallback={<div>Suspending...</div>}>
        <UserProfile userId={123} />
      </Suspense>
    );
  }

  render(<UserWithSuspense />, { wrapper });

  expect(screen.getByText('Suspending...')).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });
});
```

### Pattern: Test Optimistic Updates

```typescript
test('shows optimistic update', async () => {
  const { result } = renderHook(
    () => ({
      users: useUsers(),
      create: useCreateUser(),
    }),
    { wrapper }
  );

  await waitFor(() => {
    expect(result.current.users.isSuccess).toBe(true);
  });

  const initialCount = result.current.users.data.length;

  // Mutation with optimistic update
  act(() => {
    result.current.create.mutate({ name: 'New User' });
  });

  // UI updated immediately
  expect(result.current.users.data).toHaveLength(initialCount + 1);
});
```

## Related Resources

- [TanStack Query Testing Guide](https://tanstack.com/query/latest/docs/framework/react/guides/testing)
- [Testing React Query - TkDodo](https://tkdodo.eu/blog/testing-react-query)
