# Test Setup Configuration

## Test Setup File

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
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;
```

## Common Global Mocks

### Mocking Window Properties

```typescript
// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock sessionStorage
global.sessionStorage = localStorageMock as any;
```

### Mocking Navigation APIs

```typescript
// Mock window.location
delete (window as any).location;
window.location = {
  href: "http://localhost:3000",
  pathname: "/",
  search: "",
  hash: "",
} as any;
```

## Related

- [Main Skill](../SKILL.md)
- [Vitest Configuration](vitest-configuration.md)
