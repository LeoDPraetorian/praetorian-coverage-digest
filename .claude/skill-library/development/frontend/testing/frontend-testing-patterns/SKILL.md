---
name: frontend-testing-patterns
description: Use when writing unit tests, integration tests, or component tests for Chariot React UI - provides comprehensive testing strategies using Vitest, React Testing Library, and Testing Library User Event following Chariot's established patterns for hooks, components, and user interactions
allowed-tools: Read, Grep, Bash, TodoWrite
---

# Chariot React Testing Patterns

Testing guide for the Chariot security platform's React/TypeScript codebase using modern testing frameworks and best practices specific to our architecture.

## When to Use This Skill

- Writing unit tests for React components in Chariot UI
- Creating integration tests for features like Seeds, Vulnerabilities, Assets
- Testing custom hooks with complex state management
- Setting up test infrastructure for new features
- Testing user interactions with @testing-library/user-event
- Implementing test-driven development (TDD) workflows
- Testing security-critical UI components

## Testing Stack

### Core Testing Framework: Vitest

**Quick Setup:**
```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["**/*.{test,spec}.{ts,tsx}"],
  },
});
```

**Detailed Configuration:** [Vitest Configuration Reference](references/vitest-configuration.md)

### Test Setup File

Essential mocks for Chariot UI testing (`src/test/setup.ts`):

```typescript
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => cleanup());

// Mock window.matchMedia (responsive components)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver (virtualized lists)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() { return []; }
  unobserve() {}
} as any;
```

## Component Testing Patterns

### Quick Example: Table Cell Component Test

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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

    const { container } = render(<CVSSCell risk={risk as RiskWithVulnerability} />);

    expect(container.textContent).toBe("-");
  });
});
```

**Comprehensive Patterns:** [Component Testing Patterns](references/component-testing-patterns.md)

### Integration Tests with User Interactions

```typescript
import userEvent from "@testing-library/user-event";

it("should allow clicking preseed tab", async () => {
  const user = userEvent.setup();
  const mockOnTabChange = vi.fn();

  render(<SeedsHeader activeTab="domain" onTabChange={mockOnTabChange} />);

  const preseedTab = screen.getByTestId("tab-preseed");
  await user.click(preseedTab);

  expect(mockOnTabChange).toHaveBeenCalledWith("preseed");
});
```

## Hook Testing Patterns

### Custom Hook with Mocked Dependencies

```typescript
import { renderHook } from "@testing-library/react";
import { beforeEach, vi } from "vitest";

vi.mock("./useSortableColumn");

import { useSortableColumn } from "./useSortableColumn";

describe("useSmartColumnPositioning", () => {
  beforeEach(() => {
    (useSortableColumn as ReturnType<typeof vi.fn>).mockReturnValue({
      activeColumns: ["identifier", "name"],
      setActiveColumns: vi.fn(),
      columns: mockColumns,
    });
  });

  it("should return columns and activeColumns", () => {
    const { result } = renderHook(() =>
      useSmartColumnPositioning({ key: "test", defaultColumns, defaultConfig })
    );

    expect(result.current.columns).toBeDefined();
    expect(result.current.activeColumns).toEqual(["identifier", "name"]);
  });
});
```

**React Query Integration:** [Hook Testing Patterns](references/hook-testing-patterns.md)

## MSW (Mock Service Worker) for HTTP Mocking

### When to Use MSW

**Use MSW when:**
- Testing components that make real HTTP calls
- Testing TanStack Query caching behavior
- Testing retry logic and error handling

**Use vi.mock() when:**
- Mocking modules without HTTP (utilities, hooks, components)
- Simple unit tests with controlled return values

### Quick MSW Setup

```bash
npm install -D msw@latest
```

```typescript
// src/__tests__/mocks/server.ts
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/assets", () => {
    return HttpResponse.json({
      assets: [
        { id: "1", name: "Asset 1", status: "A" },
      ],
    });
  }),
];

export const server = setupServer(...handlers);
```

**Complete MSW Guide:** [MSW Mocking Reference](references/msw-mocking.md)

## Mocking Patterns

### Pattern 1: Vitest Module Mocking

```typescript
// Mock module BEFORE importing
vi.mock("@/hooks/useAxios");

// Import mocked modules
import { useAxios } from "@/hooks/useAxios";

// Set mock implementation
(useAxios as Mock).mockReturnValue({
  get: mockAxiosGet,
  post: mockAxiosPost,
});

// Mock specific function calls
mockAxiosGet.mockResolvedValueOnce({ data: mockData });
mockAxiosGet.mockRejectedValueOnce(new Error("API error"));
```

### Pattern 2: Component Mocking for Integration Tests

```typescript
vi.mock("@/components/Tabs", () => ({
  default: ({ tabs, onSelect }: TabsProps) => (
    <div data-testid="tabs-component">
      {tabs.map((tab) => (
        <button key={tab.value} onClick={() => onSelect(tab)}>
          {tab.label}
        </button>
      ))}
    </div>
  ),
}));
```

## Test Organization

### File Naming Conventions

Tests live **alongside source files**:

- Component tests: `ComponentName.test.tsx`
- Hook tests: `useHookName.test.ts`
- Utility tests: `utilityName.test.ts`
- Integration tests: `FeatureName.integration.test.tsx`

### Test Structure

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

## Best Practices for Chariot Platform

### 1. Use Partial<Type> for Mock Data

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

### 2. Use data-testid for E2E Integration

```typescript
// Component
<button data-testid="preseed-tab">Preseed</button>

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
  describe("rendering", () => { /* rendering tests */ });
  describe("user interactions", () => { /* interaction tests */ });
  describe("loading states", () => { /* loading tests */ });
  describe("edge cases", () => { /* edge case tests */ });
});
```

## Running Tests

### Commands

```bash
# Run all tests in watch mode
npm test

# Run tests once
npm run test:run

# Run with coverage
npm run test:coverage

# Run with UI dashboard
npm run test:ui

# Run specific test file
npm test -- path/to/file.test.tsx

# Run tests matching pattern
npm test -- --grep "preseed"
```

### Coverage Requirements

- **Configuration**: 100% coverage for config files
- **Hooks**: 80%+ coverage for custom hooks
- **Components**: Focus on integration tests
- **Utilities**: Comprehensive unit tests with edge cases

## Common Testing Scenarios

### Testing Async Operations

```typescript
it("should fetch data successfully", async () => {
  mockAxiosGet.mockResolvedValueOnce({ data: mockData });

  const { result } = renderHook(() => useCustomHook(), { wrapper });

  await waitFor(() => {
    expect(result.current.status).toBe("success");
  });

  expect(result.current.data).toEqual(mockData);
});
```

### Testing Error States

```typescript
it("should handle API errors gracefully", async () => {
  mockAxiosGet.mockRejectedValueOnce({
    response: { status: 500 },
    message: "Network error",
  });

  const { result } = renderHook(() => useCustomHook(), { wrapper });

  await waitFor(() => {
    expect(result.current.status).toBe("error");
  });
});
```

### Testing Loading States

```typescript
it("should show loading state initially", () => {
  const { result } = renderHook(() => useCustomHook());

  expect(result.current.status).toBe("pending");
  expect(result.current.isLoading).toBe(true);
});
```

## Key Dependencies

```json
{
  "vitest": "^3.2.4",
  "@testing-library/react": "latest",
  "@testing-library/user-event": "latest",
  "@testing-library/jest-dom": "latest",
  "@tanstack/react-query": "^5.90.1",
  "happy-dom": "latest"
}
```

## Troubleshooting

### Issue: Tests Fail with "IntersectionObserver is not defined"

**Solution**: Ensure `src/test/setup.ts` includes IntersectionObserver mock (see Test Setup section)

### Issue: Tests Fail with "matchMedia is not defined"

**Solution**: Ensure `src/test/setup.ts` includes matchMedia mock (see Test Setup section)

### Issue: Async Tests Timing Out

**Solution**: Increase timeout or use `waitFor` with proper conditions:

```typescript
await waitFor(
  () => {
    expect(result.current.status).toBe("success");
  },
  { timeout: 5000 }
);
```

### Issue: Mock Not Working

**Solution**: Ensure mock is defined BEFORE import:

```typescript
// ✅ GOOD: Mock before import
vi.mock("@/hooks/useAxios");
import { useAxios } from "@/hooks/useAxios";

// ❌ BAD: Import before mock
import { useAxios } from "@/hooks/useAxios";
vi.mock("@/hooks/useAxios"); // Too late!
```

## Chariot-Specific Considerations

### Security-Critical Components

When testing security-critical UI components:

- Test all user input validation
- Verify XSS prevention
- Test authentication flows
- Verify authorization checks
- Test error handling and error messages

### Data Attributes for E2E Tests

Always add `data-testid` attributes for E2E test integration:

```typescript
<button data-testid="approve-seed-button">Approve</button>
```

### Testing with Global State

```typescript
// Mock global state when needed
vi.mock("@/state/global.state", () => ({
  useGlobalState: () => ({
    drawerState: mockDrawerState,
    setDrawerState: mockSetDrawerState,
  }),
}));
```

### Testing with Authentication

```typescript
// Mock auth context
vi.mock("@/state/auth", () => ({
  useAuth: () => ({
    user: mockUser,
    isPraetorianUser: true,
    logout: vi.fn(),
  }),
}));
```

## Resources

- **Vitest Documentation**: https://vitest.dev/
- **React Testing Library**: https://testing-library.com/react
- **Testing Library User Event**: https://testing-library.com/docs/user-event/intro
- **TanStack Query Testing**: https://tanstack.com/query/latest/docs/framework/react/guides/testing
- **Detailed Component Patterns**: [references/component-testing-patterns.md](references/component-testing-patterns.md)
- **Hook Testing Guide**: [references/hook-testing-patterns.md](references/hook-testing-patterns.md)
- **MSW Complete Guide**: [references/msw-mocking.md](references/msw-mocking.md)
- **Vitest Configuration**: [references/vitest-configuration.md](references/vitest-configuration.md)
