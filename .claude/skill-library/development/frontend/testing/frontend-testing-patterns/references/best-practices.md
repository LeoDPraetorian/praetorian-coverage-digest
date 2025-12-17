# Best Practices for Chariot Platform

## 1. Use Partial<Type> for Mock Data

```typescript
// ✅ GOOD: Use Partial for mock data
const mockRisk: Partial<RiskWithVulnerability> = {
  cvss: 9.8,
  name: "Test Vulnerability",
};

// ❌ BAD: Creating full objects with all required fields
const mockRisk: RiskWithVulnerability = {
  // ... 50+ required fields
};
```

## 2. Use data-testid for E2E Integration

```typescript
// Component
<button data-testid="preseed-tab">Preseed</button>

// Test
const preseedTab = screen.getByTestId("preseed-tab");
expect(preseedTab).toBeInTheDocument();
```

## 3. Test User Interactions with @testing-library/user-event

```typescript
import userEvent from "@testing-library/user-event";

it("should handle user interactions", async () => {
  const user = userEvent.setup();
  render(<Component />);

  await user.click(screen.getByRole("button"));
  await user.type(screen.getByRole("textbox"), "test input");
});
```

## 4. Include JSDoc Comments

```typescript
/**
 * Component Name - Integration Tests
 *
 * These tests verify actual component rendering and behavior,
 * NOT just that components render without crashing.
 *
 * Related: CHARIOT-1566 - Feature description
 */
```

## 5. Test Actual DOM, Not Component Instantiation

```typescript
// ✅ GOOD: Verify actual DOM content
const preseedTab = screen.getByTestId("tab-preseed");
expect(preseedTab).toBeInTheDocument();
expect(preseedTab).not.toBeDisabled();

// ❌ BAD: Just checking render doesn't throw
render(<SeedsHeader />);
// No assertions - doesn't verify behavior!
```

## 6. Descriptive Test Names

```typescript
// ✅ GOOD: Clear, behavior-focused names
it("should render preseed tab in actual DOM for non-Praetorian users", () => {});
it("should display preseed count with thousands separator", () => {});

// ❌ BAD: Vague test names
it("works", () => {});
it("test preseed", () => {});
```

## 7. Security-Critical Components

When testing security-critical UI components:

- Test all user input validation
- Verify XSS prevention
- Test authentication flows
- Verify authorization checks
- Test error handling and error messages

## Related

- [Main Skill](../SKILL.md)
- [Test Organization](test-organization.md)
