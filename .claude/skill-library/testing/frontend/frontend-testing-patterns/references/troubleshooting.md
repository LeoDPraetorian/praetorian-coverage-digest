# Troubleshooting

## Issue: Tests Fail with "IntersectionObserver is not defined"

**Solution**: Ensure `src/test/setup.ts` includes IntersectionObserver mock (see [Test Setup](test-setup.md))

## Issue: Tests Fail with "matchMedia is not defined"

**Solution**: Ensure `src/test/setup.ts` includes matchMedia mock (see [Test Setup](test-setup.md))

## Issue: Async Tests Timing Out

**Solution**: Increase timeout or use `waitFor` with proper conditions:

```typescript
await waitFor(
  () => {
    expect(result.current.status).toBe("success");
  },
  { timeout: 5000 }
);
```

## Issue: Mock Not Working

**Solution**: Ensure mock is defined BEFORE import:

```typescript
// ✅ GOOD: Mock before import
vi.mock("@/hooks/useAxios");
import { useAxios } from "@/hooks/useAxios";

// ❌ BAD: Import before mock
import { useAxios } from "@/hooks/useAxios";
vi.mock("@/hooks/useAxios"); // Too late!
```

## Issue: Tests Pass Locally But Fail in CI

**Common causes:**

- Timing issues (use `waitFor` instead of fixed delays)
- Environment differences (check NODE_ENV)
- Missing environment variables
- Different dependency versions

**Solution**: Add debugging and ensure deterministic tests

## Issue: Flaky Tests

**Common causes:**

- Race conditions in async code
- Shared state between tests
- Unreliable external dependencies
- Timing-dependent assertions

**Solutions:**

- Use `waitFor` for async assertions
- Reset mocks in `afterEach`
- Mock all external dependencies
- Avoid `setTimeout` in tests

## Issue: Coverage Not Matching Expectations

**Solution**: Check coverage thresholds in `vitest.config.ts`:

```typescript
test: {
  coverage: {
    statements: 80,
    branches: 80,
    functions: 80,
    lines: 80,
  },
}
```

## Related

- [Main Skill](../SKILL.md)
- [Running Tests](running-tests.md)
- [Test Setup](test-setup.md)
