# Test Organization

## File Naming Conventions

Tests live **alongside source files**:

- Component tests: `ComponentName.test.tsx`
- Hook tests: `useHookName.test.ts`
- Utility tests: `utilityName.test.ts`
- Integration tests: `FeatureName.integration.test.tsx`

## Test Structure

```typescript
describe("FeatureName", () => {
  beforeEach(() => {
    // Initialize mocks and state
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Feature Group 1", () => {
    it("should do something specific", () => {
      // Arrange
      const input = setupTestData();

      // Act
      const result = performAction(input);

      // Assert
      expect(result).toBe(expected);
    });
  });

  describe("edge cases", () => {
    it("should handle boundary conditions", () => {
      // Test edge cases
    });
  });
});
```

## Grouping Tests

```typescript
describe("Component", () => {
  describe("rendering", () => {
    /* rendering tests */
  });
  describe("user interactions", () => {
    /* interaction tests */
  });
  describe("loading states", () => {
    /* loading tests */
  });
  describe("edge cases", () => {
    /* edge case tests */
  });
});
```

## Test Isolation

- Each test should be independent
- Use `beforeEach` to reset state
- Use `afterEach` to cleanup mocks
- Avoid shared test data that can mutate

## Related

- [Main Skill](../SKILL.md)
- [Best Practices](best-practices.md)
