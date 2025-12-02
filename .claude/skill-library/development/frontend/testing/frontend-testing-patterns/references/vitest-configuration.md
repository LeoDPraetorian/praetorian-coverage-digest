# Vitest Configuration Reference

Complete Vitest setup and configuration for Chariot React UI testing.

## Core Configuration File

**File:** `vitest.config.ts`

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: "happy-dom", // Lightweight DOM environment
    setupFiles: ["./src/test/setup.ts"],
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "build", "dist"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData",
        "**/*.{test,spec}.{ts,tsx}",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
```

## Test Setup File

**File:** `src/test/setup.ts`

```typescript
import "@testing-library/jest-dom/vitest"; // IMPORTANT: /vitest suffix

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia (required for responsive components)
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

## Coverage Configuration

### Coverage Thresholds

```typescript
thresholds: {
  lines: 80,
  functions: 80,
  branches: 80,
  statements: 80,
}
```

### What to Exclude from Coverage

```typescript
exclude: [
  'node_modules/',           // Third-party code
  'src/test/',               // Test utilities
  '**/*.d.ts',               // Type definitions
  '**/*.config.*',           // Configuration files
  '**/mockData',             // Mock data
  '**/*.{test,spec}.{ts,tsx}', // Test files themselves
  'src/types.ts',            // Pure type definitions
  'src/constants.ts',        // Static constants
],
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

### Coverage Analysis

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html

# Check specific file coverage
npm test -- --coverage Button.test.tsx
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
