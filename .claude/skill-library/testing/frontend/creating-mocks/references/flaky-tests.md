# Debugging Flaky Tests

Strategies for identifying and fixing non-deterministic test failures.

## What is a Flaky Test?

A test that sometimes passes and sometimes fails without code changes.

## Common Causes

### 1. Race Conditions

**Problem:** Async operations complete in unpredictable order

```typescript
// ❌ FLAKY: No waiting
test('displays data', () => {
  render(<DataDisplay />);
  expect(screen.getByText('Data loaded')).toBeInTheDocument();
  // May fail if data hasn't loaded yet
});

// ✅ FIXED: Wait for condition
test('displays data', async () => {
  render(<DataDisplay />);
  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument();
  });
});
```

### 2. Parallel Test Interference

**Problem:** Tests running in parallel share state

```typescript
// ❌ FLAKY: Shared state
let globalUser = null;

test.concurrent("test 1", () => {
  globalUser = { name: "Alice" };
});

test.concurrent("test 2", () => {
  expect(globalUser.name).toBe("Bob"); // Flaky!
});

// ✅ FIXED: Isolated state
test.concurrent("test 1", () => {
  const user = { name: "Alice" };
  expect(user.name).toBe("Alice");
});
```

### 3. Animation Timing

**Problem:** CSS animations cause timing issues

```typescript
// ❌ FLAKY: Animation in progress
test('button appears', () => {
  render(<AnimatedButton />);
  expect(screen.getByRole('button')).toBeVisible();
  // May fail during animation
});

// ✅ FIXED: Disable animations
beforeEach(() => {
  // Inject CSS to disable animations
  const style = document.createElement('style');
  style.innerHTML = `
    *, *::before, *::after {
      animation-duration: 0s !important;
      transition-duration: 0s !important;
    }
  `;
  document.head.appendChild(style);
});
```

### 4. Fixed Timeouts

**Problem:** Arbitrary wait times

```typescript
// ❌ FLAKY: Fixed delay
test('loads data', async () => {
  render(<DataLoader />);
  await new Promise(resolve => setTimeout(resolve, 1000));
  expect(screen.getByText('Loaded')).toBeInTheDocument();
  // May be too short or too long
});

// ✅ FIXED: Wait for condition
test('loads data', async () => {
  render(<DataLoader />);
  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });
});
```

### 5. Date/Time Dependencies

**Problem:** Tests rely on current time

```typescript
// ❌ FLAKY: Real dates
test('displays greeting', () => {
  render(<Greeting />);
  const hour = new Date().getHours();
  const expected = hour < 12 ? 'Good morning' : 'Good afternoon';
  expect(screen.getByText(expected)).toBeInTheDocument();
  // Fails at midnight!
});

// ✅ FIXED: Mock date
test('displays greeting', () => {
  vi.setSystemTime(new Date('2024-01-01 10:00:00'));

  render(<Greeting />);
  expect(screen.getByText('Good morning')).toBeInTheDocument();

  vi.useRealTimers();
});
```

## Debugging Strategies

### Strategy: Run Tests Repeatedly

```bash
# Run tests 100 times to catch flakiness
for i in {1..100}; do vitest run || break; done
```

### Strategy: Isolate Test

```bash
# Run single test file
vitest run src/components/Button.test.tsx

# Run single test
vitest run -t "specific test name"
```

### Strategy: Add Debug Logging

```typescript
test('flaky test', async () => {
  console.log('1. Rendering');
  render(<Component />);

  console.log('2. Waiting for element');
  await waitFor(() => {
    console.log('3. Checking for element');
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  console.log('4. Test passed');
});
```

### Strategy: Check Test Order

```typescript
// Run tests in random order
vitest run --sequence.shuffle

// Run tests sequentially (disable parallel)
vitest run --no-threads
```

## Prevention Strategies

### 1. Always Use waitFor for Async

```typescript
// ✅ GOOD
await waitFor(() => {
  expect(result.current.data).toBeDefined();
});
```

### 2. Mock Non-Deterministic Values

```typescript
// Mock Math.random
vi.spyOn(Math, "random").mockReturnValue(0.5);

// Mock Date
vi.setSystemTime(new Date("2024-01-01"));

// Mock timers
vi.useFakeTimers();
```

### 3. Disable Retries

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    retry: 0, // Don't retry flaky tests
  },
});
```

### 4. Clean Up Between Tests

```typescript
afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  server.resetHandlers();
  cleanup();
});
```

## Related Resources

- [How to Avoid Flaky Tests in Vitest](https://trunk.io/blog/how-to-avoid-and-detect-flaky-tests-in-vitest)
- [Catching Flaky Tests - kettanaito.com](https://kettanaito.com/blog/catching-flaky-tests-before-its-too-late)
- [Controlled Randomness with Vitest](https://fast-check.dev/blog/2025/03/28/beyond-flaky-tests-bringing-controlled-randomness-to-vitest/)
