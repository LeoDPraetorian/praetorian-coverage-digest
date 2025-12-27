# Module Mocking in Vitest

Comprehensive guide to mocking modules with `vi.mock()`, hoisting, factory functions, and auto-mocking.

## Table of Contents

- [vi.mock() Basics](#vimock-basics)
- [Hoisting Behavior](#hoisting-behavior)
- [Factory Functions](#factory-functions)
- [vi.hoisted()](#vihoisted)
- [Auto-Mocking](#auto-mocking)
- [vi.spyOn vs vi.mock](#vispyon-vs-vimock)
- [Common Patterns](#common-patterns)

## vi.mock() Basics

`vi.mock()` mocks an entire module, replacing all exports with mock implementations.

### Basic Usage

```typescript
import { vi } from "vitest";

// Mock the module
vi.mock("./utils", () => ({
  formatDate: vi.fn(),
  calculateTotal: vi.fn(),
}));

// Import after mocking
import { formatDate } from "./utils";

test("uses mocked function", () => {
  formatDate.mockReturnValue("2024-01-01");

  const result = formatDate(new Date());

  expect(result).toBe("2024-01-01");
  expect(formatDate).toHaveBeenCalled();
});
```

### Key Points

- **Location:** Must appear before imports (hoisted automatically)
- **Scope:** Mocks entire module for all tests in file
- **Returns:** Factory return value becomes module exports

## Hoisting Behavior

**Critical:** `vi.mock()` is hoisted to the top of the file during static analysis.

### Execution Order

```typescript
// What you write:
import { getData } from "./api";
vi.mock("./api");
console.log("test");

// What actually executes:
vi.mock("./api"); // Hoisted first
import { getData } from "./api";
console.log("test");
```

### Why This Matters

```typescript
// ❌ WRONG: Variables not available in factory
const mockData = { name: "Alice" };

vi.mock("./api", () => ({
  getData: vi.fn().mockResolvedValue(mockData), // Error: mockData undefined
}));

// ✅ CORRECT: Use vi.hoisted()
const mockData = vi.hoisted(() => ({ name: "Alice" }));

vi.mock("./api", () => ({
  getData: vi.fn().mockResolvedValue(mockData),
}));
```

## Factory Functions

Factory functions customize mock behavior. Without a factory, Vitest auto-mocks the module.

### Partial Mock with importActual

Preserve some original functionality:

```typescript
vi.mock("./utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./utils")>();

  return {
    ...actual,
    // Override only what you need
    formatDate: vi.fn(),
    // Keep calculateTotal from actual implementation
  };
});
```

### Factory with Custom Implementation

```typescript
vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn((options) => ({
    data: undefined,
    isLoading: true,
    error: null,
  })),
  useMutation: vi.fn(),
}));
```

### Async Factory

When using `importOriginal`, factory must be async:

```typescript
vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    fetchData: vi.fn().mockResolvedValue({ data: "mock" }),
  };
});
```

## vi.hoisted()

Execute code before hoisting to define values used in mock factories.

### Problem Without vi.hoisted()

```typescript
// ❌ ERROR: Can't access top-level variables in factory
const mockUser = { name: "Alice" };

vi.mock("./api", () => ({
  getUser: vi.fn().mockResolvedValue(mockUser), // ReferenceError!
}));
```

### Solution With vi.hoisted()

```typescript
// ✅ CORRECT: Define mock data in hoisted scope
const mockUser = vi.hoisted(() => ({ name: "Alice" }));

vi.mock("./api", () => ({
  getUser: vi.fn().mockResolvedValue(mockUser),
}));

test("uses hoisted value", async () => {
  const user = await getUser();
  expect(user).toEqual({ name: "Alice" });
});
```

### Sharing Mock Functions

```typescript
const mockFetchData = vi.hoisted(() => vi.fn());

vi.mock("./api", () => ({
  fetchData: mockFetchData,
}));

test("tracks calls to mocked function", () => {
  mockFetchData.mockResolvedValue({ data: "test" });

  // ... test code

  expect(mockFetchData).toHaveBeenCalledTimes(1);
});
```

## Auto-Mocking

Without a factory, Vitest automatically mocks all exports.

### Automatic Behavior

```typescript
// Module: ./utils.ts
export function add(a: number, b: number) {
  return a + b;
}

// Test file
vi.mock("./utils"); // No factory

import { add } from "./utils";

test("auto-mocked function", () => {
  // add is now a vi.fn() that returns undefined
  expect(add(1, 2)).toBeUndefined();
  expect(vi.isMockFunction(add)).toBe(true);
});
```

### When to Use

- **Quick isolation:** When you don't care about implementation
- **External dependencies:** Third-party modules you want to ignore
- **Slow operations:** File I/O, network calls

### When NOT to Use

- **Testing your own code:** Use real implementations when possible
- **Behavior verification:** Need specific return values

## vi.spyOn vs vi.mock

Community debate on when to use each approach.

### vi.spyOn() - Partial Mocks

**Pros:**

- Preserves real implementation by default
- Can restore original behavior
- Less verbose for single function

**Cons:**

- Creates partial mocks (harder to reason about)
- Can lead to unintended side effects
- Mixes real and fake behavior

```typescript
import * as utils from "./utils";

test("with spy", () => {
  const spy = vi.spyOn(utils, "formatDate");
  spy.mockReturnValue("2024-01-01");

  // formatDate is mocked, but other utils functions are real
  const result = formatDate(new Date());

  expect(result).toBe("2024-01-01");
  spy.mockRestore();
});
```

### vi.mock() - Full Mocks

**Pros:**

- Complete control over module behavior
- Clear separation: all fake or all real
- Explicit about what's mocked

**Cons:**

- More verbose
- Must mock entire module
- Harder to preserve original behavior

```typescript
vi.mock("./utils", () => ({
  formatDate: vi.fn(),
  calculateTotal: vi.fn(),
}));

test("with mock", () => {
  formatDate.mockReturnValue("2024-01-01");

  // All utils functions are mocked
  const result = formatDate(new Date());

  expect(result).toBe("2024-01-01");
});
```

### Recommendation

**Default to `vi.mock()` for:**

- External modules (axios, lodash, etc.)
- Your own modules that need isolation
- Consistent test environment

**Use `vi.spyOn()` for:**

- Tracking calls without changing behavior
- Testing error handling of specific method
- Temporary override in single test

**Reference:** [GitHub Discussion #4224](https://github.com/vitest-dev/vitest/discussions/4224)

## vi.doMock() - Non-Hoisted Alternative

For cases where you need control over when mocking happens.

### Basic Usage

```typescript
// Not hoisted - executes in order
vi.doMock("./utils", () => ({
  getValue: vi.fn().mockReturnValue("mocked"),
}));

// Must import AFTER doMock
const { getValue } = await import("./utils");

test("uses doMock", () => {
  expect(getValue()).toBe("mocked");
});
```

### When to Use

- Dynamic mocking based on test conditions
- Importing module multiple times with different mocks
- Need to reference variables before mock definition

## Common Patterns

### Pattern: Mock External Library

```typescript
vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import axios from "axios";

test("makes API call", async () => {
  axios.get.mockResolvedValue({ data: { name: "Alice" } });

  const result = await getUserData(123);

  expect(axios.get).toHaveBeenCalledWith("/api/users/123");
  expect(result).toEqual({ name: "Alice" });
});
```

### Pattern: Mock Only Named Exports

```typescript
vi.mock("./utils", () => ({
  formatDate: vi.fn(),
  // Don't mock calculateTotal - use real implementation
}));
```

### Pattern: Reset Mocks Between Tests

```typescript
import { afterEach } from "vitest";

afterEach(() => {
  vi.clearAllMocks(); // Clear call history
  vi.resetAllMocks(); // Clear implementation
});
```

### Pattern: Mock Different Values Per Test

```typescript
const mockGetData = vi.hoisted(() => vi.fn());

vi.mock("./api", () => ({
  getData: mockGetData,
}));

test("success case", async () => {
  mockGetData.mockResolvedValue({ success: true });
  // ... test
});

test("error case", async () => {
  mockGetData.mockRejectedValue(new Error("Failed"));
  // ... test
});
```

### Pattern: Conditional Mocking

```typescript
// Mock only in specific environment
if (process.env.MOCK_API === "true") {
  vi.mock("./api", () => ({
    fetchData: vi.fn().mockResolvedValue({ data: "mock" }),
  }));
}
```

## Troubleshooting

### Issue: "Cannot access before initialization"

**Cause:** Trying to use variable in factory before it's hoisted

**Solution:** Use `vi.hoisted()`

```typescript
// ❌ BAD
const mockValue = "test";
vi.mock("./utils", () => ({ getValue: () => mockValue }));

// ✅ GOOD
const mockValue = vi.hoisted(() => "test");
vi.mock("./utils", () => ({ getValue: () => mockValue }));
```

### Issue: Mock not applied to imports

**Cause:** Import happens before mock

**Solution:** Ensure mock before import

```typescript
// ✅ CORRECT ORDER
vi.mock("./utils");
import { myFunction } from "./utils";

// ❌ WRONG ORDER
import { myFunction } from "./utils";
vi.mock("./utils");
```

### Issue: Real implementation still runs

**Cause:** Module already imported elsewhere

**Solution:** Mock in setup file or use `vi.doMock` with dynamic import

## Related References

- [Official Vitest Mocking Guide](https://vitest.dev/guide/mocking)
- [Vi API Reference](https://vitest.dev/api/vi)
- [Module Mocking Documentation](https://vitest.dev/guide/mocking/modules.html)
- [GitHub Discussion: vi.spyOn vs vi.mock](https://github.com/vitest-dev/vitest/discussions/4224)
