# Component Testing Patterns

Comprehensive patterns for testing React components in the Chariot security platform.

## Pattern 1: Table Cell Component Tests

Simple component tests focusing on rendering logic and edge cases.

```typescript
/**
 * CVSSCell Component Tests
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { RiskWithVulnerability } from "@/hooks/useRisks";

import { CVSSCell } from "./CVSSCell";

describe("CVSSCell", () => {
  it("should render CVSS score when available", () => {
    const risk: Partial<RiskWithVulnerability> = {
      cvss: 9.8,
      name: "Test Vulnerability",
    };

    render(<CVSSCell risk={risk as RiskWithVulnerability} />);

    expect(screen.getByText("9.8")).toBeInTheDocument();
  });

  it("should render dash when CVSS is undefined", () => {
    const risk: Partial<RiskWithVulnerability> = {
      name: "Test Vulnerability",
    };

    const { container } = render(
      <CVSSCell risk={risk as RiskWithVulnerability} />
    );

    expect(container.textContent).toBe("-");
  });

  it("should render dash when CVSS is null", () => {
    const risk: Partial<RiskWithVulnerability> = {
      cvss: null as unknown as number,
      name: "Test Vulnerability",
    };

    const { container } = render(
      <CVSSCell risk={risk as RiskWithVulnerability} />
    );

    expect(container.textContent).toBe("-");
  });

  it("should render CVSS score of 0", () => {
    const risk: Partial<RiskWithVulnerability> = {
      cvss: 0,
      name: "Test Vulnerability",
    };

    render(<CVSSCell risk={risk as RiskWithVulnerability} />);

    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("should use value prop over risk.cvss when provided", () => {
    const risk: Partial<RiskWithVulnerability> = {
      cvss: 5.0,
      name: "Test Vulnerability",
    };

    render(<CVSSCell risk={risk as RiskWithVulnerability} value={8.5} />);

    expect(screen.getByText("8.5")).toBeInTheDocument();
    expect(screen.queryByText("5.0")).not.toBeInTheDocument();
  });
});
```

## Pattern 2: Integration Tests with User Interactions

Integration tests that verify actual component behavior with user interactions.

```typescript
/**
 * SeedsHeader Integration Tests
 *
 * These are integration tests that verify actual preseed tab rendering
 * and behavior for all user types, NOT just that components render without crashing.
 *
 * Related: CHARIOT-1566 - Preseed tab visibility for all users
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SeedsHeader } from "./SeedsHeader";

// Mock only necessary components to simplify DOM verification
interface MockTabsProps {
  tabs: Array<{ value: string; label: React.ReactNode; loading?: boolean }>;
  selected?: { value: string };
  onSelect: (tab: { value: string }) => void;
}

vi.mock("@/components/Tabs", () => ({
  default: ({ tabs, selected, onSelect }: MockTabsProps) => (
    <div data-testid="tabs-component">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          data-testid={`tab-${tab.value}`}
          data-selected={selected?.value === tab.value}
          onClick={() => onSelect(tab)}
          disabled={tab.loading}
        >
          <div data-testid={`tab-${tab.value}-label`}>{tab.label}</div>
        </button>
      ))}
    </div>
  ),
}));

describe("SeedsHeader - Preseed Tab Integration Tests", () => {
  const mockOnTabChange = vi.fn();

  const mockCounts = {
    tld: 5,
    domain: 10,
    cidr: 3,
    ipv4: 20,
    ipv6: 7,
    webapplication: 15,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Preseed Tab Rendering", () => {
    it("should render preseed tab in actual DOM", () => {
      render(
        <SeedsHeader
          activeTab="domain"
          onTabChange={mockOnTabChange}
          counts={mockCounts}
          preseedCount={42}
          countsLoading={false}
          preseedCountLoading={false}
        />
      );

      // ✅ Verify actual preseed tab button exists in DOM
      const preseedTab = screen.getByTestId("tab-preseed");
      expect(preseedTab).toBeInTheDocument();
      expect(preseedTab).not.toBeDisabled();
    });

    it("should display preseed count in actual tab label", () => {
      const preseedCount = 123;

      render(
        <SeedsHeader
          activeTab="domain"
          onTabChange={mockOnTabChange}
          counts={mockCounts}
          preseedCount={preseedCount}
          countsLoading={false}
          preseedCountLoading={false}
        />
      );

      const preseedTabLabel = screen.getByTestId("tab-preseed-label");
      expect(preseedTabLabel).toHaveTextContent("123");
    });
  });

  describe("Preseed Tab Interactions", () => {
    it("should allow clicking preseed tab", async () => {
      const user = userEvent.setup();

      render(
        <SeedsHeader
          activeTab="domain"
          onTabChange={mockOnTabChange}
          counts={mockCounts}
          preseedCount={42}
          countsLoading={false}
          preseedCountLoading={false}
        />
      );

      const preseedTab = screen.getByTestId("tab-preseed");
      await user.click(preseedTab);

      expect(mockOnTabChange).toHaveBeenCalledWith("preseed");
      expect(mockOnTabChange).toHaveBeenCalledTimes(1);
    });

    it("should show preseed tab as selected when active", () => {
      render(
        <SeedsHeader
          activeTab="preseed"
          onTabChange={mockOnTabChange}
          counts={mockCounts}
          preseedCount={42}
          countsLoading={false}
          preseedCountLoading={false}
        />
      );

      const preseedTab = screen.getByTestId("tab-preseed");
      expect(preseedTab).toHaveAttribute("data-selected", "true");
    });
  });

  describe("Preseed Tab Loading States", () => {
    it("should show loading state on preseed tab", () => {
      render(
        <SeedsHeader
          activeTab="domain"
          onTabChange={mockOnTabChange}
          counts={mockCounts}
          preseedCount={0}
          countsLoading={false}
          preseedCountLoading={true}
        />
      );

      const preseedTab = screen.getByTestId("tab-preseed");
      expect(preseedTab).toBeDisabled();
    });
  });
});
```

## Utility Function Testing

### Pattern: Comprehensive Utility Tests

```typescript
/**
 * Tests for tag validation utilities
 *
 * These tests verify validation rules are correctly implemented
 * and error messages are user-friendly and actionable.
 */
import { describe, expect, it } from "vitest";

import {
  getTagValidationError,
  isValidTag,
  sanitizeTag,
  validateTagInput,
} from "./tagValidation";

describe("tagValidation", () => {
  describe("validateTagInput", () => {
    describe("valid tags", () => {
      it("should accept simple alphanumeric tags", () => {
        const result = validateTagInput("production");
        expect(result.isValid).toBe(true);
        expect(result.sanitized).toBe("production");
        expect(result.error).toBeUndefined();
      });

      it("should accept tags with hyphens", () => {
        const result = validateTagInput("api-gateway");
        expect(result.isValid).toBe(true);
        expect(result.sanitized).toBe("api-gateway");
      });

      it("should accept maximum length tags (50 chars)", () => {
        const tag = "a".repeat(50);
        const result = validateTagInput(tag);
        expect(result.isValid).toBe(true);
        expect(result.sanitized).toBe(tag);
      });
    });

    describe("whitespace handling", () => {
      it("should trim leading whitespace", () => {
        const result = validateTagInput("  production");
        expect(result.isValid).toBe(true);
        expect(result.sanitized).toBe("production");
      });

      it("should reject tags that are only whitespace", () => {
        const result = validateTagInput("   ");
        expect(result.isValid).toBe(false);
        expect(result.error).toBe("Tag cannot be empty");
      });
    });

    describe("invalid tags", () => {
      it("should reject empty strings", () => {
        const result = validateTagInput("");
        expect(result.isValid).toBe(false);
        expect(result.error).toBe("Tag cannot be empty");
      });

      it("should reject tags exceeding 50 characters", () => {
        const tag = "a".repeat(51);
        const result = validateTagInput(tag);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe("Tag cannot exceed 50 characters");
      });

      it("should reject tags with special characters", () => {
        const specialChars = ["@", "#", "$", "%", "^", "&", "*"];
        specialChars.forEach((char) => {
          const result = validateTagInput(`tag${char}special`);
          expect(result.isValid).toBe(false);
          expect(result.error).toContain("invalid characters");
        });
      });
    });
  });

  describe("edge cases", () => {
    it("should handle consecutive special allowed characters", () => {
      const result = validateTagInput("tag--name");
      expect(result.isValid).toBe(true);
    });

    it("should handle exact boundary lengths", () => {
      expect(isValidTag("a")).toBe(true);
      expect(isValidTag("a".repeat(50))).toBe(true);
      expect(isValidTag("a".repeat(51))).toBe(false);
    });
  });
});
```

## Best Practices

### 1. Use Partial<Type> for Mock Data

```typescript
// ✅ GOOD: Use Partial for mock data
const mockRisk: Partial<RiskWithVulnerability> = {
  cvss: 9.8,
  name: "Test Vulnerability",
};

render(<CVSSCell risk={mockRisk as RiskWithVulnerability} />);

// ❌ BAD: Creating full objects with all required fields
const mockRisk: RiskWithVulnerability = {
  cvss: 9.8,
  name: "Test Vulnerability",
  // ... 50 more required fields
};
```

### 2. Use data-testid for E2E Integration

```typescript
// Component
<button data-testid="preseed-tab">Preseed</button>;

// Test
const preseedTab = screen.getByTestId("preseed-tab");
expect(preseedTab).toBeInTheDocument();
```

### 3. Test User Interactions with @testing-library/user-event

```typescript
import userEvent from "@testing-library/user-event";

it("should handle user interactions", async () => {
  const user = userEvent.setup();

  render(<Component />);

  await user.click(screen.getByRole("button"));
  await user.type(screen.getByRole("textbox"), "test input");
});
```

### 4. Include JSDoc Comments

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

### 5. Test Actual DOM, Not Component Instantiation

```typescript
// ✅ GOOD: Verify actual DOM content
const preseedTab = screen.getByTestId("tab-preseed");
expect(preseedTab).toBeInTheDocument();
expect(preseedTab).not.toBeDisabled();

// ❌ BAD: Just checking render doesn't throw
render(<SeedsHeader />);
// No assertions - doesn't verify behavior!
```

### 6. Descriptive Test Names

```typescript
// ✅ GOOD: Clear, behavior-focused names
it("should render preseed tab in actual DOM for non-Praetorian users", () => {});
it("should display preseed count with thousands separator", () => {});

// ❌ BAD: Vague test names
it("works", () => {});
it("test preseed", () => {});
```

### 7. Group Related Tests

```typescript
describe("Component", () => {
  describe("rendering", () => {
    // Tests for rendering behavior
  });

  describe("user interactions", () => {
    // Tests for click/type/etc
  });

  describe("loading states", () => {
    // Tests for loading/error states
  });

  describe("edge cases", () => {
    // Tests for boundary conditions
  });
});
```
