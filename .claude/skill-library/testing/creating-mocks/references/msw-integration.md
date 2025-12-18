# MSW (Mock Service Worker) Integration

Complete guide to setting up and using MSW for API mocking in Vitest tests.

## Table of Contents

- [Why MSW](#why-msw)
- [Installation](#installation)
- [Basic Setup](#basic-setup)
- [Handler Patterns](#handler-patterns)
- [Runtime Overrides](#runtime-overrides)
- [Request Matching](#request-matching)
- [Response Patterns](#response-patterns)
- [Testing Strategies](#testing-strategies)

## Why MSW

MSW intercepts requests at the network level, providing more realistic mocking than mocking fetch or axios.

### Advantages Over vi.mock()

| Aspect | vi.mock(axios) | MSW |
|--------|----------------|-----|
| **Realism** | Mocks library, not network | Intercepts actual HTTP |
| **Portability** | Tied to HTTP client | Works with any client |
| **Browser/Node** | Different setup | Same handlers |
| **Type safety** | Manual typing | Request/response types |
| **Request inspection** | Via spy assertions | Via handler logic |

### When to Use MSW

✅ **Use MSW for:**
- API endpoint mocking
- Integration tests
- Component tests making HTTP calls
- Testing error handling (404, 500, timeouts)

❌ **Don't use MSW for:**
- Unit tests of pure functions
- Testing UI without network calls
- Performance-critical tests (MSW adds overhead)

## Installation

```bash
npm install -D msw
```

**Note:** MSW 2.x has breaking changes from 1.x. Check version.

## Basic Setup

### Step 1: Create Handlers File

```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  // GET request
  http.get('/api/users/:id', ({ params }) => {
    const { id } = params;

    return HttpResponse.json({
      id,
      name: 'Test User',
      email: 'test@example.com',
    });
  }),

  // POST request
  http.post('/api/users', async ({ request }) => {
    const body = await request.json();

    return HttpResponse.json(
      { id: 1, ...body },
      { status: 201 }
    );
  }),

  // Error response
  http.get('/api/error', () => {
    return HttpResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }),
];
```

### Step 2: Create Server Setup

```typescript
// src/test/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### Step 3: Configure Vitest Setup File

```typescript
// src/test/setup.ts
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

// Start server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
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

### Step 4: Configure vitest.config.ts

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./src/test/setup.ts'],
    environment: 'jsdom', // For React components
  },
});
```

## Handler Patterns

### Basic GET Handler

```typescript
http.get('/api/users', () => {
  return HttpResponse.json([
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ]);
});
```

### Handler with Path Parameters

```typescript
http.get('/api/users/:id', ({ params }) => {
  const { id } = params;

  if (id === '999') {
    return HttpResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  return HttpResponse.json({
    id,
    name: `User ${id}`,
  });
});
```

### Handler with Query Parameters

```typescript
http.get('/api/users', ({ request }) => {
  const url = new URL(request.url);
  const page = url.searchParams.get('page') || '1';
  const limit = url.searchParams.get('limit') || '10';

  return HttpResponse.json({
    data: [], // Mock paginated data
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: 100,
    },
  });
});
```

### Handler with Request Body

```typescript
http.post('/api/users', async ({ request }) => {
  const body = await request.json();

  // Validate request
  if (!body.name) {
    return HttpResponse.json(
      { error: 'Name is required' },
      { status: 400 }
    );
  }

  // Return created resource
  return HttpResponse.json(
    {
      id: Math.random().toString(36).slice(2),
      ...body,
      createdAt: new Date().toISOString(),
    },
    { status: 201 }
  );
});
```

### Handler with Headers

```typescript
http.get('/api/protected', ({ request }) => {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return HttpResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return HttpResponse.json({ data: 'protected' });
});
```

### Handler with Cookies

```typescript
http.get('/api/session', ({ cookies }) => {
  const sessionId = cookies.get('sessionId');

  if (!sessionId) {
    return HttpResponse.json(
      { error: 'No session' },
      { status: 401 }
    );
  }

  return HttpResponse.json({
    sessionId,
    user: { id: 1, name: 'Alice' },
  });
});
```

## Runtime Overrides

Override handlers for specific tests using `server.use()`.

### Override Single Endpoint

```typescript
test('handles server error', async () => {
  // Override default handler for this test only
  server.use(
    http.get('/api/users/:id', () => {
      return HttpResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    })
  );

  const { result } = renderHook(() => useUser(123), { wrapper });

  await waitFor(() => {
    expect(result.current.isError).toBe(true);
  });
});
```

### Multiple Overrides

```typescript
test('handles multiple failures', async () => {
  server.use(
    http.get('/api/users', () => HttpResponse.error()),
    http.get('/api/posts', () => HttpResponse.error()),
  );

  // Test error handling
});
```

### Delayed Response

```typescript
test('shows loading state', async () => {
  server.use(
    http.get('/api/users', async () => {
      await delay(1000);
      return HttpResponse.json([]);
    })
  );

  render(<UserList />);

  expect(screen.getByText('Loading...')).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });
});
```

### Network Error

```typescript
test('handles network error', async () => {
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.error(); // Simulates network failure
    })
  );

  const { result } = renderHook(() => useUsers(), { wrapper });

  await waitFor(() => {
    expect(result.current.isError).toBe(true);
    expect(result.current.error.message).toMatch(/network/i);
  });
});
```

## Request Matching

### Match Exact URL

```typescript
http.get('https://api.example.com/users', () => {
  return HttpResponse.json([]);
});
```

### Match Path Only

```typescript
// Matches any origin
http.get('/api/users', () => {
  return HttpResponse.json([]);
});
```

### Match with Wildcard

```typescript
// Matches /api/v1/users, /api/v2/users, etc.
http.get('/api/*/users', () => {
  return HttpResponse.json([]);
});
```

### Match Multiple Methods

```typescript
// Respond to GET and POST the same way
http.all('/api/users', () => {
  return HttpResponse.json({ message: 'Method not important' });
});
```

## Response Patterns

### JSON Response

```typescript
http.get('/api/data', () => {
  return HttpResponse.json({ key: 'value' });
});
```

### Text Response

```typescript
http.get('/api/text', () => {
  return HttpResponse.text('Plain text response');
});
```

### Custom Headers

```typescript
http.get('/api/data', () => {
  return HttpResponse.json(
    { data: 'value' },
    {
      headers: {
        'X-Custom-Header': 'value',
        'Content-Type': 'application/json',
      },
    }
  );
});
```

### Set Cookies

```typescript
http.post('/api/login', () => {
  return HttpResponse.json(
    { success: true },
    {
      headers: {
        'Set-Cookie': 'sessionId=abc123; HttpOnly; Secure',
      },
    }
  );
});
```

### Streaming Response

```typescript
http.get('/api/stream', () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue('chunk 1\n');
      controller.enqueue('chunk 2\n');
      controller.close();
    },
  });

  return new Response(stream);
});
```

## Testing Strategies

### Strategy: Default Happy Path + Override Errors

```typescript
// handlers.ts - Default to successful responses
export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([{ id: 1, name: 'Alice' }]);
  }),
];

// Test error cases by overriding
test('handles 404', () => {
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    })
  );

  // Test error handling
});
```

### Strategy: Shared Fixtures

```typescript
// src/test/fixtures/users.ts
export const mockUsers = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
];

// handlers.ts
import { mockUsers } from '../fixtures/users';

http.get('/api/users', () => {
  return HttpResponse.json(mockUsers);
});
```

### Strategy: Conditional Responses

```typescript
http.get('/api/users/:id', ({ params }) => {
  const { id } = params;
  const user = mockUsers.find(u => u.id === Number(id));

  if (!user) {
    return HttpResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  return HttpResponse.json(user);
});
```

### Strategy: Stateful Handlers

```typescript
// Track state across requests
let requestCount = 0;

http.get('/api/rate-limited', () => {
  requestCount++;

  if (requestCount > 5) {
    return HttpResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  return HttpResponse.json({ data: 'success' });
});

// Reset in afterEach
afterEach(() => {
  requestCount = 0;
});
```

## Integration with TanStack Query

### Complete Example

```typescript
// src/test/setup.ts
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// src/hooks/useUsers.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { wrapper } from '@/test/utils'; // QueryClientProvider wrapper
import { useUsers } from './useUsers';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

test('fetches users', async () => {
  const { result } = renderHook(() => useUsers(), { wrapper });

  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });

  expect(result.current.data).toEqual([
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ]);
});

test('handles error', async () => {
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.json(
        { error: 'Server error' },
        { status: 500 }
      );
    })
  );

  const { result } = renderHook(() => useUsers(), { wrapper });

  await waitFor(() => {
    expect(result.current.isError).toBe(true);
  });
});
```

## Troubleshooting

### Issue: Requests not intercepted

**Cause:** Server not started or wrong URL

**Solution:**
1. Verify `server.listen()` called in `beforeAll`
2. Check handler URL matches request URL exactly
3. Use `onUnhandledRequest: 'error'` to catch unhandled requests

```typescript
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
```

### Issue: Handlers not reset between tests

**Cause:** Missing `server.resetHandlers()` in `afterEach`

**Solution:**

```typescript
afterEach(() => {
  server.resetHandlers(); // Resets to original handlers
});
```

### Issue: MSW not working in Node

**Cause:** Using browser MSW in Node environment

**Solution:** Use `msw/node` for Vitest:

```typescript
import { setupServer } from 'msw/node'; // Not 'msw/browser'
```

## Related Resources

- [MSW Documentation](https://mswjs.io/)
- [MSW Getting Started](https://mswjs.io/docs/getting-started)
- [MSW Recipes](https://mswjs.io/docs/recipes)
- [React Testing with MSW - DEV](https://dev.to/medaymentn/react-unit-testing-using-vitest-rtl-and-msw-216j)
