---
name: testing-mcp-wrappers
description: Use when testing MCP wrappers - provides MCP-specific testing methodology for unit tests, schema validation, and integration tests with response filtering and token optimization patterns
allowed-tools: Bash, Edit, Glob, Grep, MultiEdit, Read, Skill, TodoWrite, WebFetch, WebSearch, Write
---

# Testing MCP Wrappers

**MCP-specific testing methodology for wrapper code.**

## When to Use

Use this skill when:

- Testing MCP wrapper implementations (unit, schema, integration)
- Verifying response filtering logic and token optimization
- Implementing tests for MCP wrapper according to test-lead's plan
- Validating Zod schemas for MCP wrapper inputs/outputs

**You are routed here by gateway-testing for agents with role 'MCP Tester'.**

**You MUST use TodoWrite before starting** to track all test implementation steps.

## Test File Naming and Isolation Requirements

### File Naming Convention

MCP wrapper tests MUST follow naming conventions:

| Test Type         | Naming Pattern          | Characteristics                                   |
| ----------------- | ----------------------- | ------------------------------------------------- |
| Unit tests        | `*.unit.test.ts`        | Mocked MCP SDK, fast (<5s), no real processes     |
| Integration tests | `*.integration.test.ts` | Real MCP server, slow (60s+), may spawn processes |

**NEVER** use plain `*.test.ts` for MCP wrapper tests - this causes 30+ minute hangs when tests accidentally spawn real MCP servers.

### Mandatory SDK Mocking (Unit Tests)

Unit tests MUST mock these modules at the top of the test file:

```typescript
// Mock MCP SDK BEFORE imports
vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    callTool: vi.fn().mockResolvedValue({ content: [{ type: "text", text: "[]" }] }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => ({
  StdioClientTransport: vi.fn().mockImplementation(() => ({
    onclose: undefined,
    onerror: undefined,
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));
```

Or use the high-level mock from `@claude/testing`:

```typescript
import { createMCPMock } from "@claude/testing";
vi.mock("../config/lib/mcp-client");

const mcpMock = createMCPMock();
vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
```

### Defense-in-Depth Pattern

Three layers protect against accidental real process spawning:

1. **Global setupFiles guard** - Throws error if real spawn attempted (see `configuring-vitest-test-isolation` skill)
2. **Per-test vi.mock()** - Explicit mocking of MCP SDK modules
3. **NODE_ENV check** - Production code checks `process.env.NODE_ENV !== 'test'`

### Critical Anti-Pattern: Real MCP in Unit Tests

**What caused 32-minute hang:**

```typescript
// ❌ WRONG: index.test.ts (no .unit. or .integration. suffix)
// This test calls real MCP server without mocking!
import { getProjects } from "./get-projects";
const result = await getProjects.execute({}); // Spawns real Go process!
```

**Correct approach:**

```typescript
// ✅ RIGHT: get-projects.unit.test.ts
vi.mock("@modelcontextprotocol/sdk/client/stdio.js"); // Mock BEFORE any imports
import { getProjects } from "./get-projects";
// Now safe - no real process spawned
```

### Related Skills

- `configuring-vitest-test-isolation` - Vitest config patterns for test isolation

---

## Quick Reference

| Test Type           | Purpose                                | Tools                   | When to Use                   |
| ------------------- | -------------------------------------- | ----------------------- | ----------------------------- |
| Unit Testing        | Wrapper isolation, response filtering  | Vitest (vi.mock, vi.fn) | Test logic without MCP server |
| Schema Validation   | InputSchema, OutputSchema verification | Zod (safeParse, parse)  | Validate data structures      |
| Integration Testing | Real MCP calls, token optimization     | Real MCP server         | End-to-end wrapper behavior   |

---

## Test Mode Selection

### When to Use Each Test Type

**Unit Testing (Vitest)**

- Wrapper isolation - test wrapper logic without calling real MCP server
- Response filtering logic - verify only essential fields are kept
- Error handling paths - test timeout, retry, error responses
- Tools: `vi.mock()`, `vi.fn()`, `expect()`

**Schema Validation Testing (Zod)**

- InputSchema validation - verify valid/invalid inputs handled correctly
- OutputSchema shape verification - ensure response structure matches schema
- Strict mode validation - no extra fields allowed
- Transform testing - verify data transformations work correctly
- Tools: `safeParse()`, `parse()`, `expect(result.success)`

**Integration Testing (Real MCP)**

- Real MCP server calls - test against actual MCP service
- Token optimization verification - measure actual token reduction
- Timeout/retry behavior - verify wrapper handles network issues
- Actual token counts - validate 80%+ reduction target achieved
- Tools: Real MCP client, token counting utilities

---

## MCP-Specific Test Patterns

### Testing Response Filtering

**Purpose**: Verify wrapper removes unnecessary fields and keeps only essential data.

```typescript
describe("filterResponse", () => {
  it("should keep only essential fields", () => {
    const raw = {
      id: "1",
      title: "Test",
      metadata: { created: "..." },
      internal_id: "xxx",
    };
    const filtered = filterResponse(raw);

    expect(filtered).toEqual({ id: "1", title: "Test" });
    expect(filtered).not.toHaveProperty("metadata");
    expect(filtered).not.toHaveProperty("internal_id");
  });

  it("should handle arrays of responses", () => {
    const raw = [
      { id: "1", title: "A", extra: "xxx" },
      { id: "2", title: "B", extra: "yyy" },
    ];
    const filtered = filterResponseArray(raw);

    expect(filtered).toEqual([
      { id: "1", title: "A" },
      { id: "2", title: "B" },
    ]);
  });
});
```

### Testing Token Optimization

**Purpose**: Verify wrapper achieves 80%+ token reduction from raw MCP response.

```typescript
describe("token optimization", () => {
  it("should achieve 80%+ token reduction", async () => {
    const rawResponse = await getRawMCPResponse();
    const filteredResponse = await wrapperFunction(input);

    const rawTokens = countTokens(JSON.stringify(rawResponse));
    const filteredTokens = countTokens(JSON.stringify(filteredResponse));
    const reduction = (rawTokens - filteredTokens) / rawTokens;

    expect(reduction).toBeGreaterThanOrEqual(0.8);
  });

  it("should keep token count under target", async () => {
    const response = await wrapperFunction(input);
    const tokens = countTokens(JSON.stringify(response));

    expect(tokens).toBeLessThan(TARGET_MAX_TOKENS);
  });
});
```

### Testing Zod Schemas

**Purpose**: Verify input/output schemas validate correctly and reject invalid data.

```typescript
describe("InputSchema", () => {
  it("should accept valid input", () => {
    const validInput = { issueId: "ABC-123" };
    const result = InputSchema.safeParse(validInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.issueId).toBe("ABC-123");
    }
  });

  it("should reject invalid input", () => {
    const invalidInput = { issueId: "" };
    const result = InputSchema.safeParse(invalidInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
    }
  });

  it("should reject missing required fields", () => {
    const result = InputSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("OutputSchema", () => {
  it("should validate response structure", () => {
    const response = { id: "123", title: "Test" };
    const result = OutputSchema.safeParse(response);

    expect(result.success).toBe(true);
  });

  it("should reject extra fields in strict mode", () => {
    const response = { id: "123", title: "Test", extra: "xxx" };
    const result = OutputSchema.strict().safeParse(response);

    expect(result.success).toBe(false);
  });
});
```

---

## Test Implementation Process

### 1. Locate Test Plan

**Check for existing test plan:**

```bash
# MCP wrapper test plans
ls .claude/mcp-wrappers/{service}/{tool}/test-plan*.md

# General test plans
ls docs/plans/*-test-plan.md
```

**If no plan exists:**
Request test-lead to create one before implementing tests. Test plans define:

- Required tests
- Coverage targets
- Testing approach
- Anti-patterns to avoid
- Test infrastructure requirements

### 2. Implement Tests Following Plan

Follow the test plan's structure:

1. **Read plan's Required Tests section** - what scenarios must be covered
2. **Review Testing Approach** - unit vs integration split
3. **Check Anti-Patterns** - what NOT to do
4. **Use Infrastructure** - mocks, fixtures, helpers defined in plan

### 3. Verify Against Acceptance Criteria

Before returning to test-lead, verify:

- All required tests from plan implemented
- Coverage targets achieved (typically 80%+)
- Tests follow TDD (RED phase verified first)
- No anti-patterns present

---

## MCP Wrapper Test Checklist

Use this checklist before marking wrapper tests as complete:

- [ ] All required tests from plan implemented
- [ ] Coverage targets achieved (run `npm run coverage`)
- [ ] Response filtering tests verify only essential fields kept
- [ ] Token optimization tests verify 80%+ reduction target
- [ ] Schema tests cover valid input, invalid input, edge cases
- [ ] Tests follow TDD (RED phase verified - tests failed without implementation)
- [ ] Integration tests use real MCP server (not mocked)
- [ ] Error handling tests cover timeout, retry, malformed responses
- [ ] No test anti-patterns (see `testing-anti-patterns` skill)

---

## Common Pitfalls

### Anti-Pattern: Mocking in Integration Tests

❌ **WRONG**: Mock MCP server in integration tests

```typescript
// DON'T DO THIS in integration tests
vi.mock("@claude/mcp-client");
```

✅ **RIGHT**: Use real MCP server

```typescript
// Integration tests should use actual MCP calls
const client = new MCPClient(/* real config */);
const result = await wrapperFunction(input);
```

### Anti-Pattern: Not Testing Token Reduction

❌ **WRONG**: Assume filtering reduces tokens

```typescript
// Missing token count verification
const filtered = filterResponse(raw);
expect(filtered).toBeDefined();
```

✅ **RIGHT**: Measure actual token reduction

```typescript
const rawTokens = countTokens(JSON.stringify(raw));
const filteredTokens = countTokens(JSON.stringify(filtered));
const reduction = (rawTokens - filteredTokens) / rawTokens;
expect(reduction).toBeGreaterThanOrEqual(0.8);
```

### Anti-Pattern: Not Verifying Field Removal

❌ **WRONG**: Only check included fields

```typescript
expect(filtered).toHaveProperty("id");
expect(filtered).toHaveProperty("title");
```

✅ **RIGHT**: Verify excluded fields are removed

```typescript
expect(filtered).toEqual({ id: "1", title: "Test" });
expect(filtered).not.toHaveProperty("metadata");
expect(filtered).not.toHaveProperty("internal_id");
```

---

## Test Infrastructure

### Token Counting Utility

```typescript
import { encode } from "gpt-tokenizer";

function countTokens(text: string): number {
  return encode(text).length;
}
```

### Mock MCP Client (Unit Tests Only)

```typescript
import { vi } from "vitest";

const mockMCPClient = {
  callTool: vi.fn().mockResolvedValue({
    content: [{ type: "text", text: JSON.stringify(mockResponse) }],
  }),
};
```

### Test Fixtures

Store example responses in `__fixtures__/` directory:

```text
wrapper/
  __tests__/
    wrapper.test.ts
  __fixtures__/
    raw-response.json      # Full MCP response
    filtered-response.json # Expected wrapper output
```

---

## Related Skills

- `behavior-vs-implementation-testing` - When to test behavior vs implementation
- `testing-anti-patterns` - Common testing mistakes to avoid
- `validating-with-zod-schemas` - Zod schema patterns and best practices
- `testing-with-vitest-mocks` - Vitest mocking patterns
- `developing-with-tdd` - TDD methodology (RED-GREEN-REFACTOR)

---

## Changelog

See `.history/CHANGELOG` for version history.
