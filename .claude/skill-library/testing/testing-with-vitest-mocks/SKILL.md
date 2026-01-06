---
name: testing-with-vitest-mocks
description: Use when writing unit/integration tests with Vitest - covers mock vs spy strategies, vi.mock patterns, MSW integration, and type-safe mocking
allowed-tools: Read, Glob, Grep
---

# Testing with Vitest Mocks

**Effective mocking strategies for Vitest unit and integration tests.**

## When to Use

Use this skill when:

- Writing unit tests that need to isolate dependencies
- Testing components that make API calls
- Mocking external services or libraries
- Need to control test data and timing
- Testing error scenarios

**Common scenarios:**

- Testing React components with API dependencies
- Mocking fetch/axios calls
- Testing modules with file system access
- Mocking date/time functions
- Testing error handling paths

## Mock vs Spy Decision

### vi.mock() - Replace Entire Module

**Use for unit tests** where you want complete isolation:

```typescript
// Before any imports
vi.mock("../services/api", () => ({
  fetchUser: vi.fn().mockResolvedValue({ id: "1", name: "Test" }),
  deleteUser: vi.fn().mockResolvedValue(true),
}));

// Now all imports of api module use mocked versions
import { fetchUser } from "../services/api"; // This is the mock
```

**When to use:**

- Unit tests with full isolation
- External dependencies (APIs, databases)
- Modules with side effects
- Testing error paths

### vi.spyOn() - Observe Without Replacing

**Use for integration tests** where you want to watch but keep real behavior:

```typescript
import * as api from "../services/api";

test("calls API with correct params", () => {
  const spy = vi.spyOn(api, "fetchUser");

  // Real implementation still runs
  await fetchUser("123");

  expect(spy).toHaveBeenCalledWith("123");
});
```

**When to use:**

- Integration tests
- Verifying function calls
- Testing with real implementations
- Debugging test behavior

## Module Mocking Patterns

### Full Module Mock

```typescript
// Must be at top of file, before imports
vi.mock("../services/api", () => ({
  fetchUser: vi.fn(),
  createUser: vi.fn(),
}));

test("mocked module", async () => {
  const { fetchUser } = await import("../services/api");

  fetchUser.mockResolvedValue({ id: "1" });

  const result = await fetchUser("1");
  expect(result.id).toBe("1");
});
```

### Partial Module Mock

Keep some real implementations:

```typescript
vi.mock("../utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils")>();
  return {
    ...actual, // Keep real implementations
    formatDate: vi.fn(), // Mock only this one
  };
});
```

### Mocking with Factory Function

```typescript
vi.mock("../api", () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
    },
  };
});
```

### Async Module Mocking

For dynamic imports:

```typescript
// Factory MUST be async to use importActual
vi.mock("./module", async () => {
  const actual = await vi.importActual<typeof import("./module")>("./module");
  return {
    ...actual,
    asyncFn: vi.fn().mockResolvedValue("mocked"),
  };
});
```

## Type-Safe Mocking

### Basic Typed Mock

```typescript
import { vi, type MockedFunction } from "vitest";

const mockFetch = vi.fn() as MockedFunction<typeof fetch>;

mockFetch.mockResolvedValue(new Response(JSON.stringify({ data: "test" }), { status: 200 }));
```

### vitest-mock-extended

For advanced type safety:

```typescript
import { mock, mockDeep } from "vitest-mock-extended";

interface UserService {
  getUser(id: string): Promise<User>;
  deleteUser(id: string): Promise<boolean>;
}

const userService = mock<UserService>();

// Type-safe mock setup
userService.getUser.calledWith("1").mockResolvedValue({
  id: "1",
  name: "Test",
});

// Type error if method doesn't exist
userService.nonExistentMethod(); // ❌ Compile error
```

### Mocking Classes

```typescript
class Database {
  async query(sql: string): Promise<any[]> {
    // Real implementation
  }
}

vi.mock("./database");

const MockedDatabase = Database as vi.MockedClass<typeof Database>;

test("mocked class", () => {
  const db = new MockedDatabase();
  db.query.mockResolvedValue([{ id: 1 }]);
});
```

## Mock Lifecycle Management

### Clear vs Restore

```typescript
describe("Test suite", () => {
  beforeEach(() => {
    // Clear call history, keep mock implementations
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original implementations
    vi.restoreAllMocks();
  });

  afterAll(() => {
    // Clear module cache (for vi.mock)
    vi.resetModules();
  });
});
```

**Lifecycle methods:**

| Method                 | Effect                                        | Use Case                    |
| ---------------------- | --------------------------------------------- | --------------------------- |
| `vi.clearAllMocks()`   | Clears call history, keeps implementations    | Between tests in same suite |
| `vi.resetAllMocks()`   | Clears history AND reset to original mock     | Full reset between suites   |
| `vi.restoreAllMocks()` | Restore original implementations (spies only) | After using vi.spyOn()      |
| `vi.resetModules()`    | Clear module cache                            | When module state matters   |

## Common Mocking Scenarios

### Mocking fetch

```typescript
global.fetch = vi.fn();

test("API call", async () => {
  (fetch as MockedFunction<typeof fetch>).mockResolvedValue(
    new Response(JSON.stringify({ data: "test" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );

  const result = await apiClient.get("/users");
  expect(result.data).toBe("test");
});
```

### Mocking Date

```typescript
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2024-01-01"));
});

afterEach(() => {
  vi.useRealTimers();
});

test("time-dependent test", () => {
  const timestamp = Date.now();
  expect(timestamp).toBe(new Date("2024-01-01").getTime());
});
```

### Mocking setTimeout/setInterval

```typescript
vi.useFakeTimers();

test("timeout", () => {
  const callback = vi.fn();
  setTimeout(callback, 1000);

  // Fast-forward time
  vi.advanceTimersByTime(1000);

  expect(callback).toHaveBeenCalled();
});
```

### Mocking localStorage

```typescript
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

global.localStorage = localStorageMock as any;
```

## MSW for API Mocking

**Better than mocking fetch directly** for integration tests:

```typescript
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

const server = setupServer(
  http.get("/api/users/:id", ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: "Test User",
    });
  }),

  http.post("/api/users", async ({ request }) => {
    const user = await request.json();
    return HttpResponse.json({ id: "1", ...user }, { status: 201 });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("API integration", async () => {
  const user = await fetchUser("123");
  expect(user.name).toBe("Test User");
});
```

### MSW Error Handling

```typescript
server.use(
  http.get("/api/users/:id", () => {
    return HttpResponse.json({ error: "Not found" }, { status: 404 });
  })
);

test("handles 404", async () => {
  await expect(fetchUser("999")).rejects.toThrow("Not found");
});
```

## Mock Assertions

### Verify Calls

```typescript
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledTimes(2);
expect(mockFn).toHaveBeenCalledWith("arg1", "arg2");
expect(mockFn).toHaveBeenLastCalledWith("lastArg");
expect(mockFn).toHaveBeenNthCalledWith(2, "secondCallArg");
```

### Verify Call Order

```typescript
expect(mockFn1).toHaveBeenCalledBefore(mockFn2);
```

### Access Call Arguments

```typescript
const calls = mockFn.mock.calls;
const firstCallArgs = mockFn.mock.calls[0];
const results = mockFn.mock.results;
```

## Common Pitfalls

### Mock Not Hoisted

```typescript
// ❌ WRONG: Import before mock
import { fetchUser } from "./api";
vi.mock("./api"); // Too late!

// ✅ CORRECT: Mock before imports
vi.mock("./api");
import { fetchUser } from "./api";
```

### Forgetting Async in Factory

```typescript
// ❌ WRONG: Non-async factory with importActual
vi.mock("./module", () => {
  const actual = vi.importActual("./module"); // Won't work
  return actual;
});

// ✅ CORRECT: Async factory
vi.mock("./module", async () => {
  const actual = await vi.importActual("./module");
  return actual;
});
```

### Not Clearing Mocks

```typescript
// ❌ WRONG: Mock state leaks between tests
test("first", () => {
  mockFn();
  expect(mockFn).toHaveBeenCalledTimes(1);
});

test("second", () => {
  expect(mockFn).toHaveBeenCalledTimes(0); // Fails! Still 1 from first test
});

// ✅ CORRECT: Clear between tests
beforeEach(() => {
  vi.clearAllMocks();
});
```

## External Resources

- [Vitest Mocking Guide](https://vitest.dev/guide/mocking.html)
- [vitest-mock-extended](https://www.npmjs.com/package/vitest-mock-extended)
- [MSW Documentation](https://mswjs.io/)
