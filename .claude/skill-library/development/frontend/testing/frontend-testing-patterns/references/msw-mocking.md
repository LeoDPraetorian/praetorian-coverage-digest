# MSW (Mock Service Worker) for HTTP Mocking

Complete guide to using MSW for HTTP mocking in Chariot React tests.

## When to Use MSW vs vi.mock()

**Use MSW when:**
- ✅ Testing components that make real HTTP calls (fetch, axios)
- ✅ Need realistic HTTP semantics (status codes, headers, delays)
- ✅ Want reusable mock handlers across tests
- ✅ Testing TanStack Query caching behavior (stale-while-revalidate)
- ✅ Testing retry logic and error handling
- ✅ Testing multiple components sharing same API

**Use vi.mock() when:**
- ✅ Mocking modules that don't involve HTTP (utilities, hooks, components)
- ✅ Simple unit tests with controlled return values
- ✅ Testing pure logic without network layer
- ✅ Mocking non-HTTP dependencies (localStorage, timers)

## MSW Setup Pattern

**Installation:**
```bash
npm install -D msw@latest
```

**Step 1: Create Request Handlers**
```typescript
// src/__tests__/mocks/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  // Mock GET endpoint
  http.get("/api/assets", () => {
    return HttpResponse.json({
      assets: [
        { id: "1", name: "Asset 1", status: "A" },
        { id: "2", name: "Asset 2", status: "A" },
      ],
    });
  }),

  // Mock POST endpoint
  http.post("/api/assets", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: "3", ...body }, { status: 201 });
  }),

  // Mock error response
  http.get("/api/vulnerabilities", () => {
    return HttpResponse.json({ error: "Not found" }, { status: 404 });
  }),
];
```

**Step 2: Create MSW Server**
```typescript
// src/__tests__/mocks/server.ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

**Step 3: Set Up in Test Configuration**
```typescript
// src/__tests__/setup.ts
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./mocks/server";

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
```

## Testing with MSW

**Basic API Test:**
```typescript
import { render, screen, waitFor } from "@testing-library/react";

it("should load and display assets from API", async () => {
  render(<AssetTable />);

  await waitFor(() => {
    expect(screen.getByText("Asset 1")).toBeInTheDocument();
    expect(screen.getByText("Asset 2")).toBeInTheDocument();
  });
});
```

**Override Handler Per Test:**
```typescript
import { server } from "./mocks/server";
import { http, HttpResponse } from "msw";

it("should handle 500 error gracefully", async () => {
  server.use(
    http.get("/api/assets", () => {
      return HttpResponse.json({ error: "Server error" }, { status: 500 });
    })
  );

  render(<AssetTable />);

  await waitFor(() => {
    expect(screen.getByText("Failed to load assets")).toBeInTheDocument();
  });
});
```

## MSW Best Practices

1. **Use wildcards for flexible matching**
2. **Reset handlers between tests** (`afterEach(() => server.resetHandlers())`)
3. **Handle query parameters** properly
4. **Test realistic error scenarios** (404, 401, 500, timeouts)

See full examples in the main SKILL.md file.
