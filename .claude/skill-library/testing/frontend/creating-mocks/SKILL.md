---
name: creating-mocks
description: Use when writing Vitest tests with mocks - vi.mock, MSW, factories, TanStack Query, test isolation
allowed-tools: "Read, Write, Edit, Bash, Grep, Glob"
---

# Creating Mocks in Vitest

## Overview

**Core principle:** Mock to isolate, not to avoid testing. Mocks should make tests faster and more deterministic while preserving behavior verification.

This skill covers comprehensive mocking patterns for Vitest, including module mocking, API mocking with MSW, fixture factories, and React Testing Library integration.

## When to Use This Skill

Use this skill when:

- Setting up new Vitest test files with mocks
- Mocking external dependencies (APIs, modules, hooks)
- Creating test fixtures and factory patterns
- Testing React components with TanStack Query
- Debugging flaky or unreliable tests
- Implementing test isolation and cleanup

## Quick Reference

| Pattern           | Use Case                              | Key Function                  |
| ----------------- | ------------------------------------- | ----------------------------- |
| **Module Mock**   | Mock entire module/file               | `vi.mock()`                   |
| **Function Mock** | Mock single function                  | `vi.fn()`                     |
| **Spy**           | Track calls without changing behavior | `vi.spyOn()`                  |
| **API Mock**      | Mock network requests                 | MSW `rest.get()`              |
| **Factory**       | Generate test data                    | Fishery factories             |
| **Hook Testing**  | Test custom React hooks               | `renderHook()`                |
| **Query Mock**    | Test TanStack Query                   | `QueryClientProvider` wrapper |

## Table of Contents

This skill is organized into detailed reference documents:

### Core Mocking Patterns

- **[Module Mocking](references/module-mocking.md)** - vi.mock, vi.hoisted, factory functions
- **[MSW Integration](references/msw-integration.md)** - Mock Service Worker setup and patterns
- **[Test Fixtures](references/test-fixtures.md)** - Factory pattern, test data builders, Fishery

### React Testing

- **[React Hooks Testing](references/react-hooks-testing.md)** - renderHook, waitFor, async patterns
- **[TanStack Query Testing](references/tanstack-query-testing.md)** - QueryClient setup, testing queries/mutations

### Test Infrastructure

- **[Test Isolation](references/test-isolation.md)** - Cleanup, lifecycle hooks, state management
- **[Coverage Setup](references/coverage-setup.md)** - v8 vs Istanbul, configuration
- **[Flaky Tests](references/flaky-tests.md)** - Debugging and prevention strategies

### Examples

- **[MSW Setup Example](examples/msw-setup.md)** - Complete MSW configuration
- **[Factory Pattern Example](examples/factory-pattern.md)** - Fishery factory implementation
- **[Query Testing Example](examples/query-testing.md)** - TanStack Query test patterns

> **IMPORTANT**: Use TodoWrite to track the 6 workflow steps below. Multi-step workflows make it easy to skip steps - externalize your progress tracking.

## Core Workflow

### 1. Decide What to Mock

**Mock at the right level:**

```typescript
// ✅ GOOD: Mock at network boundary
import { rest } from "msw";
import { setupServer } from "msw/node";

// ❌ BAD: Mock React Query hooks
vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(),
}));
```

**Guidelines:**

- **Network calls** → Use MSW
- **Slow operations** → Mock (file I/O, external APIs)
- **Non-deterministic** → Mock (dates, random, timers)
- **React hooks** → Don't mock (test with real hooks + MSW)

### 2. Set Up Module Mocks

**Basic pattern:**

```typescript
// src/utils/api.test.ts
import { vi } from "vitest";

// Mocks are hoisted to top of file
vi.mock("./database", () => ({
  query: vi.fn(),
}));

// Import after mock
import { query } from "./database";
import { getUserData } from "./api";

test("fetches user data", async () => {
  query.mockResolvedValue({ name: "Alice" });

  const result = await getUserData(123);

  expect(query).toHaveBeenCalledWith("SELECT * FROM users WHERE id = ?", [123]);
  expect(result).toEqual({ name: "Alice" });
});
```

**See [Module Mocking](references/module-mocking.md) for hoisting rules and factory functions.**

### 3. Set Up MSW for API Mocking

**Setup file pattern (`src/test/setup.ts`):**

```typescript
import { afterAll, afterEach, beforeAll } from "vitest";
import { setupServer } from "msw/node";
import { handlers } from "./mocks/handlers";

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**Handlers pattern (`src/test/mocks/handlers.ts`):**

```typescript
import { rest } from "msw";

export const handlers = [
  rest.get("/api/users/:id", (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ id: req.params.id, name: "Test User" }));
  }),
];
```

**See [MSW Integration](references/msw-integration.md) for complete setup.**

### 4. Create Test Fixtures with Factories

**Using Fishery pattern:**

```typescript
// src/test/factories/user.factory.ts
import { Factory } from 'fishery';
import type { User } from '@/types';

export const userFactory = Factory.define<User>(({ sequence }) => ({
  id: sequence,
  name: `User ${sequence}`,
  email: `user${sequence}@example.com`,
  role: 'user',
  createdAt: new Date(),
}));

// In tests
import { userFactory } from '@/test/factories/user.factory';

test('displays user info', () => {
  const user = userFactory.build({ name: 'Alice' });

  render(<UserProfile user={user} />);

  expect(screen.getByText('Alice')).toBeInTheDocument();
});
```

**See [Test Fixtures](references/test-fixtures.md) for factory patterns and builder pattern.**

### 5. Test React Hooks

**Pattern with renderHook:**

```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { useUserData } from "./useUserData";

test("fetches user data", async () => {
  const { result } = renderHook(() => useUserData(123));

  // Initial state
  expect(result.current.isLoading).toBe(true);

  // Wait for async resolution
  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(result.current.data).toEqual({ name: "Test User" });
});
```

**See [React Hooks Testing](references/react-hooks-testing.md) for async patterns.**

### 6. Test TanStack Query

**Setup QueryClient wrapper:**

```typescript
// src/test/utils.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false }, // Disable retries in tests
      mutations: { retry: false },
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

**Test with wrapper:**

```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { wrapper } from "@/test/utils";
import { useUserQuery } from "./useUserQuery";

test("fetches user data", async () => {
  const { result } = renderHook(() => useUserQuery(123), { wrapper });

  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });

  expect(result.current.data).toEqual({ name: "Test User" });
});
```

**See [TanStack Query Testing](references/tanstack-query-testing.md) for complete patterns.**

## Critical Rules

### ❌ Don't Mock What You're Testing

```typescript
// ❌ BAD: Testing mock behavior
test('renders sidebar', () => {
  render(<Page />);
  expect(screen.getByTestId('sidebar-mock')).toBeInTheDocument();
});

// ✅ GOOD: Test real behavior
test('renders sidebar', () => {
  render(<Page />); // Don't mock sidebar
  expect(screen.getByRole('navigation')).toBeInTheDocument();
});
```

### ✅ Mock at Network Boundary

**Prefer MSW over mocking hooks:**

```typescript
// ❌ BAD: Mock the hook
vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn().mockReturnValue({ data: mockData }),
}));

// ✅ GOOD: Mock the network
server.use(
  rest.get("/api/users", (req, res, ctx) => {
    return res(ctx.json(mockData));
  })
);
```

### 🔒 Ensure Test Isolation

**Clean up after each test:**

```typescript
import { afterEach } from "vitest";

afterEach(() => {
  vi.clearAllMocks();
  server.resetHandlers();
});
```

**See [Test Isolation](references/test-isolation.md) for lifecycle hooks.**

## Common Patterns

### Pattern: Override MSW Handler for Specific Test

```typescript
test("handles error state", async () => {
  server.use(
    rest.get("/api/users/:id", (req, res, ctx) => {
      return res(ctx.status(500));
    })
  );

  const { result } = renderHook(() => useUserQuery(123), { wrapper });

  await waitFor(() => {
    expect(result.current.isError).toBe(true);
  });
});
```

### Pattern: Test with Fake Timers

```typescript
import { vi } from "vitest";

test("debounces search", async () => {
  vi.useFakeTimers();

  const { result } = renderHook(() => useSearch());

  act(() => {
    result.current.setQuery("test");
  });

  // Fast-forward time
  vi.advanceTimersByTime(500);

  await waitFor(() => {
    expect(result.current.results).toHaveLength(5);
  });

  vi.useRealTimers();
});
```

### Pattern: Factory with Associations

```typescript
import { Factory } from "fishery";

const userFactory = Factory.define<User>(({ sequence, associations }) => ({
  id: sequence,
  name: `User ${sequence}`,
  posts: associations.posts || [],
}));

const postFactory = Factory.define<Post>(({ sequence, associations }) => ({
  id: sequence,
  title: `Post ${sequence}`,
  author: associations.author || userFactory.build(),
}));

// Create user with posts
const user = userFactory.build({
  posts: postFactory.buildList(3),
});
```

**See [Factory Pattern Example](examples/factory-pattern.md) for complete implementation.**

## Troubleshooting

### Mock Not Working

**Issue:** `vi.mock()` not affecting imports

**Solution:** Ensure mock is before import

```typescript
// ✅ CORRECT ORDER
vi.mock("./utils");
import { myFunction } from "./utils";

// ❌ WRONG ORDER
import { myFunction } from "./utils";
vi.mock("./utils"); // Too late!
```

### Flaky Test

**Issue:** Test passes/fails randomly

**Common causes:**

- Parallel execution with shared state
- Animation timing
- Race conditions
- Missing `waitFor`

**See [Flaky Tests](references/flaky-tests.md) for debugging strategies.**

### Coverage Not Accurate

**Issue:** Coverage reports don't match expectations

**Solution:** Use v8 provider (Vitest 3.2.0+)

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
    },
  },
});
```

**See [Coverage Setup](references/coverage-setup.md) for configuration.**

## Best Practices Summary

1. **Mock at network boundary** - Use MSW for API calls
2. **Don't mock hooks** - Test with real hooks + mocked APIs
3. **Use factories for test data** - Fishery or builder pattern
4. **Clean up after each test** - `afterEach` hooks
5. **Disable retries in tests** - QueryClient `retry: false`
6. **Use `waitFor` for async** - Don't use fixed timeouts
7. **Mock dates and timers** - For deterministic tests
8. **Keep mocks minimal** - Only mock what's necessary

## Related Skills

- **[testing-anti-patterns](../testing-anti-patterns/SKILL.md)** - What NOT to do when mocking
- **[developing-with-tdd](../../../skills/developing-with-tdd/SKILL.md)** - Write tests first
- **[verifying-before-completion](../../../skills/verifying-before-completion/SKILL.md)** - Run tests before claiming done

## Resources

All patterns in this skill are based on:

- [Official Vitest Documentation](https://vitest.dev/)
- [MSW Documentation](https://mswjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [TanStack Query Testing Guide](https://tanstack.com/query/latest/docs/framework/react/guides/testing)
- [Fishery Factory Library](https://github.com/thoughtbot/fishery)
