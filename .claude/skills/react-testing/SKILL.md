---
name: chariot-react-testing-patterns
description: Use when writing unit tests, integration tests, or component tests for Chariot React UI - provides comprehensive testing strategies using Vitest, React Testing Library, and Testing Library User Event following Chariot's established patterns for hooks, components, and user interactions
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

**Configuration** (`vitest.config.ts`):
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'happy-dom', // Lightweight DOM environment
    setupFiles: ['./src/test/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'build', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/*.{test,spec}.{ts,tsx}',
      ],
    },
  },
});
```

### Test Setup File (`src/test/setup.ts`)

```typescript
import '@testing-library/jest-dom/vitest'; // IMPORTANT: /vitest suffix

import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia (required for responsive components)
Object.defineProperty(window, 'matchMedia', {
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

// Mock IntersectionObserver (required for virtualized lists)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;
```

## Component Testing Patterns

### Pattern 1: Table Cell Component Tests

```typescript
/**
 * CVSSCell Component Tests
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { RiskWithVulnerability } from '@/hooks/useRisks';

import { CVSSCell } from './CVSSCell';

describe('CVSSCell', () => {
  it('should render CVSS score when available', () => {
    const risk: Partial<RiskWithVulnerability> = {
      cvss: 9.8,
      name: 'Test Vulnerability',
    };

    render(<CVSSCell risk={risk as RiskWithVulnerability} />);

    expect(screen.getByText('9.8')).toBeInTheDocument();
  });

  it('should render dash when CVSS is undefined', () => {
    const risk: Partial<RiskWithVulnerability> = {
      name: 'Test Vulnerability',
    };

    const { container } = render(
      <CVSSCell risk={risk as RiskWithVulnerability} />
    );

    expect(container.textContent).toBe('-');
  });

  it('should render dash when CVSS is null', () => {
    const risk: Partial<RiskWithVulnerability> = {
      cvss: null as unknown as number,
      name: 'Test Vulnerability',
    };

    const { container } = render(
      <CVSSCell risk={risk as RiskWithVulnerability} />
    );

    expect(container.textContent).toBe('-');
  });

  it('should render CVSS score of 0', () => {
    const risk: Partial<RiskWithVulnerability> = {
      cvss: 0,
      name: 'Test Vulnerability',
    };

    render(<CVSSCell risk={risk as RiskWithVulnerability} />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should use value prop over risk.cvss when provided', () => {
    const risk: Partial<RiskWithVulnerability> = {
      cvss: 5.0,
      name: 'Test Vulnerability',
    };

    render(<CVSSCell risk={risk as RiskWithVulnerability} value={8.5} />);

    expect(screen.getByText('8.5')).toBeInTheDocument();
    expect(screen.queryByText('5.0')).not.toBeInTheDocument();
  });
});
```

### Pattern 2: Integration Tests with User Interactions

```typescript
/**
 * SeedsHeader Integration Tests
 *
 * These are integration tests that verify actual preseed tab rendering
 * and behavior for all user types, NOT just that components render without crashing.
 *
 * Related: CHARIOT-1566 - Preseed tab visibility for all users
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SeedsHeader } from './SeedsHeader';

// Mock only necessary components to simplify DOM verification
interface MockTabsProps {
  tabs: Array<{ value: string; label: React.ReactNode; loading?: boolean }>;
  selected?: { value: string };
  onSelect: (tab: { value: string }) => void;
}

vi.mock('@/components/Tabs', () => ({
  default: ({ tabs, selected, onSelect }: MockTabsProps) => (
    <div data-testid="tabs-component">
      {tabs.map(tab => (
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

describe('SeedsHeader - Preseed Tab Integration Tests', () => {
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

  describe('Preseed Tab Rendering', () => {
    it('should render preseed tab in actual DOM', () => {
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
      const preseedTab = screen.getByTestId('tab-preseed');
      expect(preseedTab).toBeInTheDocument();
      expect(preseedTab).not.toBeDisabled();
    });

    it('should display preseed count in actual tab label', () => {
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

      const preseedTabLabel = screen.getByTestId('tab-preseed-label');
      expect(preseedTabLabel).toHaveTextContent('123');
    });
  });

  describe('Preseed Tab Interactions', () => {
    it('should allow clicking preseed tab', async () => {
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

      const preseedTab = screen.getByTestId('tab-preseed');
      await user.click(preseedTab);

      expect(mockOnTabChange).toHaveBeenCalledWith('preseed');
      expect(mockOnTabChange).toHaveBeenCalledTimes(1);
    });

    it('should show preseed tab as selected when active', () => {
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

      const preseedTab = screen.getByTestId('tab-preseed');
      expect(preseedTab).toHaveAttribute('data-selected', 'true');
    });
  });

  describe('Preseed Tab Loading States', () => {
    it('should show loading state on preseed tab', () => {
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

      const preseedTab = screen.getByTestId('tab-preseed');
      expect(preseedTab).toBeDisabled();
    });
  });
});
```

## Hook Testing Patterns

### Pattern 1: Custom Hook with Mocked Dependencies

```typescript
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Column } from '@/components/table/types';

import { useSmartColumnPositioning } from './useSmartColumnPositioning';

// Mock dependencies
vi.mock('./useSortableColumn', () => ({
  useSortableColumn: vi.fn(),
}));

import { useSortableColumn } from './useSortableColumn';

describe('useSmartColumnPositioning', () => {
  let mockSetActiveColumns: ReturnType<typeof vi.fn>;
  let mockActiveColumns: string[] | undefined;

  beforeEach(() => {
    mockSetActiveColumns = vi.fn();
    mockActiveColumns = ['identifier', 'name'];

    (useSortableColumn as ReturnType<typeof vi.fn>).mockReturnValue({
      activeColumns: mockActiveColumns,
      setActiveColumns: mockSetActiveColumns,
      columns: mockColumns,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return columns and activeColumns from useSortableColumn', () => {
      const { result } = renderHook(() =>
        useSmartColumnPositioning({
          key: 'test',
          defaultColumns,
          defaultConfig,
          positioningRules: {},
        })
      );

      expect(result.current.columns).toBe(mockColumns);
      expect(result.current.activeColumns).toBe(mockActiveColumns);
      expect(typeof result.current.setActiveColumns).toBe('function');
    });
  });

  describe('drag operations', () => {
    it('should pass through unchanged for drag operations', () => {
      const { result } = renderHook(() =>
        useSmartColumnPositioning({
          key: 'test',
          defaultColumns,
          defaultConfig,
          positioningRules: {
            firstColumns: ['status'],
          },
        })
      );

      const newColumns = ['name', 'identifier'];
      result.current.setActiveColumns(newColumns);

      expect(mockSetActiveColumns).toHaveBeenCalledWith(newColumns);
    });
  });
});
```

### Pattern 2: Hook with React Query Integration

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';

import { useStatisticsBatch } from '@/hooks/useStatisticsBatch';

// Mock dependencies
vi.mock('@/hooks/useAxios');
vi.mock('@/hooks/useQueryKeys');

import { useAxios } from '@/hooks/useAxios';
import { useGetUserKey } from '@/hooks/useQueryKeys';

describe('useStatisticsBatch', () => {
  let queryClient: QueryClient;
  let mockAxiosGet: Mock;

  beforeEach(() => {
    // Create fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchOnWindowFocus: false,
          refetchOnMount: false,
          refetchOnReconnect: false,
        },
      },
    });

    mockAxiosGet = vi.fn();
    (useAxios as Mock).mockReturnValue({
      get: mockAxiosGet,
    });

    (useGetUserKey as Mock).mockImplementation((keys: string[]) => [
      'user123',
      ...keys,
    ]);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should fetch batch statistics successfully', async () => {
    mockAxiosGet.mockResolvedValueOnce({
      data: [
        { statistics: [mockStatistic1] },
        { statistics: [mockStatistic2] },
      ],
    });

    const { result } = renderHook(
      () =>
        useStatisticsBatch({
          statisticKeys: ['asset#origin', 'asset#status'],
          enabled: true,
        }),
      { wrapper }
    );

    // Initially pending
    expect(result.current.status).toBe('pending');
    expect(result.current.isLoading).toBe(true);

    // Wait for success
    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeDefined();
  });

  it('should not fetch when enabled is false', async () => {
    const { result } = renderHook(
      () =>
        useStatisticsBatch({
          statisticKeys: ['asset#origin'],
          enabled: false,
        }),
      { wrapper }
    );

    expect(result.current.status).toBe('pending');
    expect(mockAxiosGet).not.toHaveBeenCalled();
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
import { describe, expect, it } from 'vitest';

import {
  getTagValidationError,
  isValidTag,
  sanitizeTag,
  validateTagInput,
} from './tagValidation';

describe('tagValidation', () => {
  describe('validateTagInput', () => {
    describe('valid tags', () => {
      it('should accept simple alphanumeric tags', () => {
        const result = validateTagInput('production');
        expect(result.isValid).toBe(true);
        expect(result.sanitized).toBe('production');
        expect(result.error).toBeUndefined();
      });

      it('should accept tags with hyphens', () => {
        const result = validateTagInput('api-gateway');
        expect(result.isValid).toBe(true);
        expect(result.sanitized).toBe('api-gateway');
      });

      it('should accept maximum length tags (50 chars)', () => {
        const tag = 'a'.repeat(50);
        const result = validateTagInput(tag);
        expect(result.isValid).toBe(true);
        expect(result.sanitized).toBe(tag);
      });
    });

    describe('whitespace handling', () => {
      it('should trim leading whitespace', () => {
        const result = validateTagInput('  production');
        expect(result.isValid).toBe(true);
        expect(result.sanitized).toBe('production');
      });

      it('should reject tags that are only whitespace', () => {
        const result = validateTagInput('   ');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Tag cannot be empty');
      });
    });

    describe('invalid tags', () => {
      it('should reject empty strings', () => {
        const result = validateTagInput('');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Tag cannot be empty');
      });

      it('should reject tags exceeding 50 characters', () => {
        const tag = 'a'.repeat(51);
        const result = validateTagInput(tag);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Tag cannot exceed 50 characters');
      });

      it('should reject tags with special characters', () => {
        const specialChars = ['@', '#', '$', '%', '^', '&', '*'];
        specialChars.forEach(char => {
          const result = validateTagInput(`tag${char}special`);
          expect(result.isValid).toBe(false);
          expect(result.error).toContain('invalid characters');
        });
      });
    });
  });

  describe('edge cases', () => {
    it('should handle consecutive special allowed characters', () => {
      const result = validateTagInput('tag--name');
      expect(result.isValid).toBe(true);
    });

    it('should handle exact boundary lengths', () => {
      expect(isValidTag('a')).toBe(true);
      expect(isValidTag('a'.repeat(50))).toBe(true);
      expect(isValidTag('a'.repeat(51))).toBe(false);
    });
  });
});
```

## Mocking Patterns

### Pattern 1: Vitest Module Mocking

```typescript
// Mock module BEFORE importing it
vi.mock('@/hooks/useAxios');
vi.mock('@/hooks/useQueryKeys');

// Import mocked modules to access their implementations
import { useAxios } from '@/hooks/useAxios';
import { useGetUserKey } from '@/hooks/useQueryKeys';

// Set mock implementation
(useAxios as Mock).mockReturnValue({
  get: mockAxiosGet,
  post: mockAxiosPost,
});

// Mock specific function calls
mockAxiosGet.mockResolvedValueOnce({ data: mockData });
mockAxiosGet.mockRejectedValueOnce(new Error('API error'));
```

### Pattern 2: Component Mocking for Integration Tests

```typescript
// Mock only the component you need to simplify testing
vi.mock('@/components/Tabs', () => ({
  default: ({ tabs, selected, onSelect }: TabsProps) => (
    <div data-testid="tabs-component">
      {tabs.map(tab => (
        <button
          key={tab.value}
          data-testid={`tab-${tab.value}`}
          onClick={() => onSelect(tab)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  ),
}));
```

## Test Organization

### File Naming Conventions

- Tests live **alongside source files** (not in separate `__tests__` directory)
- Component tests: `ComponentName.test.tsx`
- Hook tests: `useHookName.test.ts`
- Utility tests: `utilityName.test.ts`
- Integration tests: `FeatureName.integration.test.tsx`

### Test Structure

```typescript
describe('FeatureName', () => {
  // Setup and teardown
  beforeEach(() => {
    // Initialize mocks and state
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Feature Group 1', () => {
    it('should do something specific', () => {
      // Arrange
      const input = setupTestData();

      // Act
      const result = performAction(input);

      // Assert
      expect(result).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('should handle boundary conditions', () => {
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
  name: 'Test Vulnerability',
};

render(<CVSSCell risk={mockRisk as RiskWithVulnerability} />);

// ❌ BAD: Creating full objects with all required fields
const mockRisk: RiskWithVulnerability = {
  cvss: 9.8,
  name: 'Test Vulnerability',
  // ... 50 more required fields
};
```

### 2. Use data-testid for E2E Integration

```typescript
// Component
<button data-testid="preseed-tab">Preseed</button>

// Test
const preseedTab = screen.getByTestId('preseed-tab');
expect(preseedTab).toBeInTheDocument();
```

### 3. Test User Interactions with @testing-library/user-event

```typescript
import userEvent from '@testing-library/user-event';

it('should handle user interactions', async () => {
  const user = userEvent.setup();

  render(<Component />);

  await user.click(screen.getByRole('button'));
  await user.type(screen.getByRole('textbox'), 'test input');
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
const preseedTab = screen.getByTestId('tab-preseed');
expect(preseedTab).toBeInTheDocument();
expect(preseedTab).not.toBeDisabled();

// ❌ BAD: Just checking render doesn't throw
render(<SeedsHeader />);
// No assertions - doesn't verify behavior!
```

### 6. Descriptive Test Names

```typescript
// ✅ GOOD: Clear, behavior-focused names
it('should render preseed tab in actual DOM for non-Praetorian users', () => {});
it('should display preseed count with thousands separator', () => {});

// ❌ BAD: Vague test names
it('works', () => {});
it('test preseed', () => {});
```

### 7. Group Related Tests

```typescript
describe('Component', () => {
  describe('rendering', () => {
    // Tests for rendering behavior
  });

  describe('user interactions', () => {
    // Tests for click/type/etc
  });

  describe('loading states', () => {
    // Tests for loading/error states
  });

  describe('edge cases', () => {
    // Tests for boundary conditions
  });
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

## Common Patterns

### Testing Async Operations

```typescript
it('should fetch data successfully', async () => {
  mockAxiosGet.mockResolvedValueOnce({ data: mockData });

  const { result } = renderHook(() => useCustomHook(), { wrapper });

  // Wait for async operation
  await waitFor(() => {
    expect(result.current.status).toBe('success');
  });

  expect(result.current.data).toEqual(mockData);
});
```

### Testing Error States

```typescript
it('should handle API errors gracefully', async () => {
  const mockError = {
    response: {
      status: 500,
      data: 'Internal server error',
    },
    message: 'Network error',
  };

  mockAxiosGet.mockRejectedValueOnce(mockError);

  const { result } = renderHook(() => useCustomHook(), { wrapper });

  await waitFor(() => {
    expect(result.current.status).toBe('error');
  });

  expect(result.current.error).toBeDefined();
});
```

### Testing Loading States

```typescript
it('should show loading state initially', () => {
  const { result } = renderHook(() => useCustomHook());

  expect(result.current.status).toBe('pending');
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

## Resources

- **Vitest Documentation**: https://vitest.dev/
- **React Testing Library**: https://testing-library.com/react
- **Testing Library User Event**: https://testing-library.com/docs/user-event/intro
- **TanStack Query Testing**: https://tanstack.com/query/latest/docs/framework/react/guides/testing

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
<button data-testid="approve-seed-button">
  Approve
</button>
```

### Testing with Global State

```typescript
// Mock global state when needed
vi.mock('@/state/global.state', () => ({
  useGlobalState: () => ({
    drawerState: mockDrawerState,
    setDrawerState: mockSetDrawerState,
  }),
}));
```

### Testing with Authentication

```typescript
// Mock auth context
vi.mock('@/state/auth', () => ({
  useAuth: () => ({
    user: mockUser,
    isPraetorianUser: true,
    logout: vi.fn(),
  }),
}));
```

## Troubleshooting

### Issue: Tests Fail with "IntersectionObserver is not defined"

**Solution**: Ensure `src/test/setup.ts` includes IntersectionObserver mock

### Issue: Tests Fail with "matchMedia is not defined"

**Solution**: Ensure `src/test/setup.ts` includes matchMedia mock

### Issue: Async Tests Timing Out

**Solution**: Increase timeout or use `waitFor` with proper conditions:

```typescript
await waitFor(
  () => {
    expect(result.current.status).toBe('success');
  },
  { timeout: 5000 }
);
```

### Issue: Mock Not Working

**Solution**: Ensure mock is defined BEFORE import:

```typescript
// ✅ GOOD: Mock before import
vi.mock('@/hooks/useAxios');
import { useAxios } from '@/hooks/useAxios';

// ❌ BAD: Import before mock
import { useAxios } from '@/hooks/useAxios';
vi.mock('@/hooks/useAxios'); // Too late!
```
