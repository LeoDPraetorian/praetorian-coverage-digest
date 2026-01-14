# TDD Workflow for MCP Wrappers

Complete TDD (Test-Driven Development) workflow for creating MCP wrappers.

## Overview

The MCP Manager enforces TDD through a structured workflow:

1. **RED**: Write failing tests first
2. **GREEN**: Implement minimum code to pass
3. **REFACTOR**: Improve code while keeping tests green

## Quick Reference: CLI Commands

```bash
cd .claude/skills/managing-tool-wrappers/scripts

# STEP 1: Create test file only (RED phase setup)
npm run create -- <service> <tool>

# STEP 2: Verify tests fail (proves tests work)
npm run verify-red -- <service>/<tool>

# STEP 3: Generate wrapper (blocked until RED passes)
npm run generate-wrapper -- <service>/<tool>

# STEP 4: Implement and verify (GREEN phase)
npm run verify-green -- <service>/<tool>
```

**Key Enforcement:**

- `create` generates test file + `tsconfig.json` (if new service), NOT the wrapper
- `generate-wrapper` is BLOCKED until `verify-red` passes
- `verify-green` requires ≥80% test coverage

---

## Complete Workflow

### STEP 1: Schema Discovery

**Purpose:** Understand the real API response format before writing any code.

```bash
npx tsx .claude/skills/managing-tool-wrappers/templates/discover-schema.ts \
  --mcp <service> \
  --tool <tool> \
  --cases 3
```

**Output:** Documents REQUIRED vs OPTIONAL fields with percentages.

### STEP 2: Generate Failing Tests (RED)

Based on discovery, generate comprehensive test file:

```typescript
// {tool}.unit.test.ts
describe("Service/Tool Wrapper", () => {
  describe("Schema Validation", () => {
    it("should validate required fields", async () => {
      const response = {
        /* discovered required fields */
      };
      // Test will FAIL because wrapper doesn't exist yet
    });
  });

  describe("Filtering", () => {
    it("should filter to essential fields", async () => {
      // Test expected filtering behavior
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid input", async () => {
      // Test error paths
    });
  });
});
```

**Verify RED Phase:**

```bash
# Use the verify-red CLI command
npm run verify-red -- <service>/<tool>
# Expected: Tests fail (no wrapper exists yet)
```

### STEP 3: Implement Wrapper (GREEN)

Generate wrapper from template with discovered schema:

```typescript
// {tool}.ts
import { z } from "zod";

/**
 * Schema Discovery Results (3 test cases):
 * REQUIRED: id (100%), name (100%)
 * OPTIONAL: email (67%)
 */

export const InputSchema = z.object({
  // Input parameters
});

export const OutputSchema = z.object({
  // Discovered schema
});

export async function wrapper(input: Input): Promise<Output> {
  // Minimum implementation to pass tests
}
```

**Verify GREEN Phase:**

```bash
# Use the verify-green CLI command (requires ≥80% coverage)
npm run verify-green -- <service>/<tool>
# Expected: All tests pass with ≥80% coverage
```

### STEP 4: Add Edge Cases

Add tests for edge cases discovered during implementation:

```typescript
describe('Edge Cases', () => {
  it('should handle null nested objects', async () => { ... });
  it('should handle empty arrays', async () => { ... });
  it('should handle missing optional fields', async () => { ... });
});
```

### STEP 5: Verify Coverage

Ensure ≥80% test coverage:

```bash
cd .claude && npm run test:coverage -- tools/{service}/{tool}.unit.test.ts
```

### STEP 6: Integration Testing

Test with real MCP server:

```bash
RUN_INTEGRATION_TESTS=true npm run test:integration -- {service}/{tool}
```

### STEP 7: Audit Compliance

Run 10-phase compliance audit:

```bash
npm run audit -- {service}/{tool}
```

## TDD Enforcement via CLI

The tool-manager CLI **enforces** TDD through blocked operations:

| Command                    | Behavior                 | Enforcement                         |
| -------------------------- | ------------------------ | ----------------------------------- |
| `npm run create`           | Generates test file ONLY | No wrapper generated                |
| `npm run verify-red`       | Verifies tests fail      | Required before wrapper             |
| `npm run generate-wrapper` | Creates wrapper          | **BLOCKED** until verify-red passes |
| `npm run verify-green`     | Verifies tests pass      | Requires ≥80% coverage              |

**This is not documentation theater - the CLI actually blocks operations.**

```bash
# Attempting to generate wrapper without verify-red:
$ npm run generate-wrapper -- <service>/<tool>
❌ ERROR: RED phase not verified. Run: npm run verify-red -- <service>/<tool>
```

### Additional Enforcement

1. **UPDATE operation**: Requires existing tests to pass before changes
2. **AUDIT operation**: Validates test coverage (phases 6-10)

## Common Patterns

### Factory Mock Pattern

```typescript
function createMockMCPClient(response: any) {
  return {
    callTool: vi.fn().mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(response) }],
    }),
  };
}
```

### Response Format Tests

```typescript
it("should return expected format", async () => {
  const result = await wrapper({ id: "123" });

  expect(result).toMatchObject({
    id: expect.any(String),
    name: expect.any(String),
  });
});
```

### Error Handling Tests

```typescript
it("should throw on invalid input", async () => {
  await expect(wrapper({ invalid: true })).rejects.toThrow();
});

it("should handle MCP errors gracefully", async () => {
  mockClient.callTool.mockRejectedValue(new Error("MCP Error"));

  await expect(wrapper({ id: "123" })).rejects.toThrow("MCP Error");
});
```

## Anti-Patterns to Avoid

### ❌ Implementation-First

```typescript
// DON'T: Write wrapper first, tests later
const wrapper = async (input) => { ... };

// Later: "I'll add tests when I have time"
// Result: Untested code with hidden bugs
```

### ❌ Guessing Schemas

```typescript
// DON'T: Guess the API response format
export const OutputSchema = z.object({
  id: z.string(),
  data: z.any(), // "I'll figure it out later"
});
```

### ❌ Skipping Edge Cases

```typescript
// DON'T: Only test happy path
it("should work", async () => {
  const result = await wrapper({ id: "123" });
  expect(result).toBeDefined();
});
// Missing: null handling, errors, optional fields
```

### ❌ Monolithic Test Files

```typescript
// DON'T: Combine multiple wrappers in one test file
// .claude/tools/linear/linear.unit.test.ts (1500+ lines)
describe("Linear Wrappers", () => {
  describe("get-issue", () => {
    /* 100 lines */
  });
  describe("create-issue", () => {
    /* 100 lines */
  });
  describe("update-issue", () => {
    /* 100 lines */
  });
  // ... 12 more wrappers
});

// Problems:
// 1. verify-red/verify-green can't target individual wrappers
// 2. Coverage reports are aggregated, not per-wrapper
// 3. Debugging failures requires searching 1500+ lines
// 4. Merge conflicts when multiple devs work on different wrappers
// 5. Shared fixtures create coupling between unrelated wrappers

// DO: One test file per wrapper
// .claude/tools/linear/get-issue.unit.test.ts (150 lines)
describe("get-issue", () => {
  // All tests for this wrapper only
});

// .claude/tools/linear/create-issue.unit.test.ts (150 lines)
describe("create-issue", () => {
  // All tests for this wrapper only
});

// Benefits:
// - TDD tooling works (verify-red/green targets specific wrapper)
// - Per-wrapper coverage metrics
// - Faster test execution (run only what changed)
// - No merge conflicts between wrapper development
// - Clear ownership and debugging
```

## Checklist

- [ ] Schema discovery completed (3+ test cases)
- [ ] Test file generated with all categories
- [ ] Tests fail initially (RED verified)
- [ ] Wrapper implements discovered schema
- [ ] Tests pass (GREEN verified)
- [ ] Edge cases covered
- [ ] Coverage ≥80%
- [ ] Audit passes (10 phases)
