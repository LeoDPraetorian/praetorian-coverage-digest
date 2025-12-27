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

**Test Setup:** [Test Setup Configuration](references/test-setup.md) - Essential mocks for matchMedia, IntersectionObserver, etc.

---

## Contract Verification (MANDATORY)

**Before writing ANY MSW handler, verify the real API contract.**

Under time pressure, you'll guess. Guessing creates mocks that pass tests but don't match production.

**Core principle:** 2 minutes verifying saves 2 hours debugging why production fails despite passing tests.

### The 2-Minute Verification Protocol

**STOP. Do NOT write handler code until you complete this:**

```bash
# Step 1: Find the real API hook implementation
grep -r "useMy\|useEndpoint" src/hooks/

# Step 2: Read the hook to see actual parameters
cat src/hooks/useMy.ts | grep -A 10 "queryKey\|url"

# Step 3: Find existing handlers (don't recreate)
grep -r "http.get.*my" src/test/mocks/
```

### Document What You Found

```typescript
/**
 * Real API Contract (verified YYYY-MM-DD)
 * Source: src/hooks/useMy.ts lines 45-52
 *
 * URL: /my
 * Parameters: resource (NOT label, NOT type)
 * Response: { count: number, [pluralizedResource]: T[] }
 *
 * Example: GET /my?resource=setting
 * Returns: { count: 2, settings: [...] }
 */
```

### Red Flags - STOP Immediately

If you're thinking ANY of these, you're about to create mock drift:

- "Parameter is probably called X"
- "Response structure seems like Y"
- "I'll guess and fix if wrong"
- "Don't have time to check the real API"

**2 minutes verifying > 2 hours debugging mock-production mismatches.**

### After Verification, Then Mock

```typescript
// NOW write handler using VERIFIED contract
http.get("*/my", ({ request }) => {
  const url = new URL(request.url);
  const resource = url.searchParams.get("resource"); // ✅ Verified parameter name

  if (resource === "setting") {
    return HttpResponse.json({
      count: 2,
      settings: [mockSettings], // ✅ Verified pluralized key
    });
  }

  return HttpResponse.json({ count: 0 }); // ✅ Match real API empty response
});
```

---

## When NOT to Mock

Mocking severs the real-world connection between what you're testing and what you're mocking. Every mock trades confidence for practicality.

### Use Real Implementations When:

- Behavior is completely deterministic
- No setup involved
- No performance hit
- **Examples:** utility functions, date formatting, string manipulation, standard collections

### Prefer MSW Over vi.mock() for Network Calls

```typescript
// ❌ AVOID: Mocking the module
vi.mock("@/hooks/useAxios");
(useAxios as Mock).mockReturnValue({ get: mockGet });

// ✅ PREFER: MSW at network level
http.get("/api/users", () => HttpResponse.json({ users: mockUsers }));
```

**Why MSW wins:**

- Tests real request/response serialization
- Catches Content-Type and header issues
- Works regardless of HTTP client used
- No coupling to internal implementation

> "The classical TDD style is to use real objects if possible and a double if it's awkward to use the real thing." — Martin Fowler

---

## Anti-Patterns to Avoid

### 1. The Mockery

**Problem:** So many mocks that you test mocks, not code.

```typescript
// ❌ BAD: What are we even testing?
vi.mock("@/hooks/useAuth");
vi.mock("@/hooks/useData");
vi.mock("@/hooks/usePermissions");
vi.mock("@/components/Header");
vi.mock("@/components/Footer");
```

**Warning:** As mock count grows, probability of testing mock instead of code increases.

### 2. The Inspector

**Problem:** Tests know too much about implementation, breaking on refactor.

```typescript
// ❌ BAD: Implementation details
expect(mockFn).toHaveBeenCalledTimes(3);
expect(wrapper.instance().state.counter).toBe(5);

// ✅ GOOD: Behavior
expect(screen.getByText("5 items")).toBeInTheDocument();
```

> "If your tests resemble the way your software is used, they won't fail when you refactor." — Kent C. Dodds

### 3. Mock Drift

**Problem:** Mocks diverge from production API over time.

**Symptoms:** Tests pass, production fails. Mock returns `{data: [...]}` but API returns `{items: [...]}`

**Prevention:** Always use Contract Verification protocol above.

### 4. False Sense of Security

**Problem:** Mocks increase coverage without increasing confidence.

> "It's worse to have bad mocks than no mocks, because they give you a wrong feeling of confidence in your tests."

**Ask:** Does this mock help catch real bugs, or just make tests pass?

---

## Test Doubles Terminology

Per Martin Fowler, there are 5 types of test doubles:

| Type      | Purpose                                                    | Behavior Verification? |
| --------- | ---------------------------------------------------------- | ---------------------- |
| **Dummy** | Fill parameter lists, never used                           | No                     |
| **Fake**  | Working implementation with shortcuts (e.g., in-memory DB) | No                     |
| **Stub**  | Canned answers to calls                                    | No                     |
| **Spy**   | Stub that records calls                                    | Sometimes              |
| **Mock**  | Pre-programmed expectations                                | Yes (always)           |

### What MSW Handlers Are

MSW handlers are **Stubs** — they provide canned responses to network requests.

### Key Insight

Only true mocks verify behavior (e.g., `expect(mock).toHaveBeenCalledWith(x)`). If you're just returning canned data, you have a stub, not a mock. This distinction matters because:

- Stubs: Test your code's handling of responses
- Mocks: Test your code called dependencies correctly (couples to implementation)

---

## Component Testing

**Quick Example:** [Examples Reference](references/examples.md)

**Comprehensive Patterns:** [Component Testing Patterns](references/component-testing-patterns.md)

**Integration Tests:** [Common Scenarios](references/common-scenarios.md)

---

## Hook Testing

**Custom Hook with Mocked Dependencies:** [Hook Testing Patterns](references/hook-testing-patterns.md)

**React Query Integration:** [Hook Testing Patterns](references/hook-testing-patterns.md)

---

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
      assets: [{ id: "1", name: "Asset 1", status: "A" }],
    });
  }),
];

export const server = setupServer(...handlers);
```

**Complete MSW Guide:** [MSW Mocking Reference](references/msw-mocking.md)

---

## Mocking Patterns

**Module Mocking:** [Mocking Patterns](references/mocking-patterns.md)

**Component Mocking:** [Mocking Patterns](references/mocking-patterns.md)

**Global State/Auth Mocking:** [Mocking Patterns](references/mocking-patterns.md)

---

## Test Organization

**File Naming:** [Test Organization](references/test-organization.md)

**Test Structure:** [Test Organization](references/test-organization.md)

**Grouping Tests:** [Test Organization](references/test-organization.md)

---

## Best Practices

**Quick Reference:**

- Use `Partial<Type>` for mock data
- Use `data-testid` for E2E integration
- Test user interactions with `@testing-library/user-event`
- Include JSDoc comments
- Test actual DOM, not component instantiation
- Use descriptive test names
- Group related tests

**Detailed Best Practices:** [Best Practices Reference](references/best-practices.md)

---

## Running Tests

**Commands:** [Running Tests](references/running-tests.md)

**Coverage Requirements:**

- **Configuration**: 100% coverage for config files
- **Hooks**: 80%+ coverage for custom hooks
- **Components**: Focus on integration tests
- **Utilities**: Comprehensive unit tests with edge cases

---

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

---

## Troubleshooting

**Common Issues:** [Troubleshooting Guide](references/troubleshooting.md)

---

## Resources

- **Vitest Documentation**: https://vitest.dev/
- **React Testing Library**: https://testing-library.com/react
- **Testing Library User Event**: https://testing-library.com/docs/user-event/intro
- **TanStack Query Testing**: https://tanstack.com/query/latest/docs/framework/react/guides/testing
- **Detailed Component Patterns**: [references/component-testing-patterns.md](references/component-testing-patterns.md)
- **Hook Testing Guide**: [references/hook-testing-patterns.md](references/hook-testing-patterns.md)
- **MSW Complete Guide**: [references/msw-mocking.md](references/msw-mocking.md)
- **Vitest Configuration**: [references/vitest-configuration.md](references/vitest-configuration.md)
