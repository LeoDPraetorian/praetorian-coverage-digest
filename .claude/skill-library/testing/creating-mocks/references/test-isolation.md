# Test Isolation and Cleanup

Ensuring tests run independently without shared state or side effects.

## Core Principle

**Each test must run independently.** No test should affect another test's outcome.

## Lifecycle Hooks

### beforeEach and afterEach

```typescript
import { beforeEach, afterEach } from 'vitest';

beforeEach(() => {
  // Setup before each test
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
  vi.restoreAllMocks();
  server.resetHandlers();
});
```

### beforeAll and afterAll

```typescript
import { beforeAll, afterAll } from 'vitest';

beforeAll(() => {
  // One-time setup for entire test file
  server.listen({ onUnhandledRequest: 'error' });
});

afterAll(() => {
  // One-time cleanup
  server.close();
});
```

## Cleanup Patterns

### Pattern: Clear Mocks

```typescript
afterEach(() => {
  vi.clearAllMocks(); // Clear call history
  vi.resetAllMocks(); // Clear implementation
  vi.restoreAllMocks(); // Restore original implementation
});
```

### Pattern: Reset MSW Handlers

```typescript
afterEach(() => {
  server.resetHandlers(); // Reset to original handlers
});
```

### Pattern: Clear Local Storage

```typescript
afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
```

### Pattern: Restore Timers

```typescript
afterEach(() => {
  vi.useRealTimers(); // Restore real timers
});
```

### Pattern: Clean DOM

```typescript
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup(); // Remove rendered components
});
```

**Note:** With `globals: true` in Vitest config, cleanup is automatic.

## Testing Library Integration

### Automatic Cleanup

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true, // Enables automatic cleanup
    environment: 'jsdom',
  },
});
```

### Manual Cleanup

```typescript
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
```

## Concurrent Tests

### onTestFinished Hook

For concurrent tests, use `onTestFinished` instead of `afterEach`:

```typescript
import { onTestFinished } from 'vitest';

test.concurrent('test 1', () => {
  onTestFinished(() => {
    // Cleanup specific to this test
  });
});

test.concurrent('test 2', () => {
  onTestFinished(() => {
    // Different cleanup
  });
});
```

### Why: Global hooks don't track concurrent tests

```typescript
// ❌ BAD: afterEach runs at wrong time with concurrent tests
test.concurrent('test 1', () => { /* ... */ });
test.concurrent('test 2', () => { /* ... */ });
afterEach(() => {
  // Runs after ALL concurrent tests finish
});

// ✅ GOOD: onTestFinished tracks individual test
test.concurrent('test 1', () => {
  onTestFinished(() => {
    // Runs when test 1 finishes
  });
});
```

## Common Isolation Issues

### Issue: Shared State Between Tests

**Problem:**

```typescript
// ❌ BAD: Shared state
let userData = null;

test('fetches user', async () => {
  userData = await fetchUser(1);
  expect(userData.name).toBe('Alice');
});

test('uses cached user', () => {
  expect(userData.name).toBe('Alice'); // Depends on previous test!
});
```

**Solution:**

```typescript
// ✅ GOOD: Independent tests
test('fetches user', async () => {
  const userData = await fetchUser(1);
  expect(userData.name).toBe('Alice');
});

test('fetches user independently', async () => {
  const userData = await fetchUser(1);
  expect(userData.name).toBe('Alice');
});
```

### Issue: Mock Pollution

**Problem:**

```typescript
test('test 1', () => {
  vi.mock('./api', () => ({ getData: vi.fn() }));
  // Mock affects subsequent tests
});

test('test 2', () => {
  // Still mocked from test 1!
});
```

**Solution:**

```typescript
afterEach(() => {
  vi.restoreAllMocks();
});
```

### Issue: DOM Pollution

**Problem:**

```typescript
test('test 1', () => {
  document.body.innerHTML = '<div>Test 1</div>';
  // DOM not cleaned up
});

test('test 2', () => {
  // Previous HTML still in DOM!
});
```

**Solution:**

```typescript
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup(); // Or enable globals: true
});
```

## Best Practices

1. **Always clean up mocks** - Use `afterEach` to restore
2. **Clear storage** - Reset localStorage/sessionStorage
3. **Reset MSW handlers** - Use `server.resetHandlers()`
4. **Use fresh instances** - Create new objects per test
5. **Enable automatic cleanup** - Set `globals: true` for RTL
6. **Use `onTestFinished` for concurrent tests**

## Related Resources

- [Test Isolation Principles](https://app.studyraid.com/en/read/11292/352303/test-isolation-principles)
- [Vitest Lifecycle API](https://vitest.dev/api/)
- [Testing Library Cleanup](https://testing-library.com/docs/react-testing-library/api#cleanup)
