# Tool Tester Examples

Complete test category patterns and examples for MCP wrapper testing.

**Parent document**: [tool-tester-prompt.md](tool-tester-prompt.md)

---

## Test Categories and Patterns

### Category 1: Input Validation (≥3 tests)

Test that Zod schema rejects invalid inputs. Use chain-of-thought to identify edge cases:

**Chain of Thought:**

1. What are the required fields? → Test missing each one
2. What are the field types? → Test wrong types
3. What are the constraints? → Test boundary violations

**Example Structure:**

```typescript
describe("Input Validation", () => {
  it("requires required fields", async () => {
    const result = await tool.execute({
      /* missing required field */
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("required_field_name");
    }
  });

  it("validates field types", async () => {
    const result = await tool.execute({
      field: 123, // expect string
    } as any);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Expected string");
    }
  });

  it("validates constraints", async () => {
    const result = await tool.execute({
      field: "", // min length 1
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("at least 1 character");
    }
  });
});
```

---

### Category 2: MCP Integration (≥2 tests)

```typescript
describe("MCP Integration", () => {
  it("calls MCP with correct tool name", async () => {
    const spy = vi.spyOn(mcpClient, "callMCPTool");
    await tool.execute({ validInput: "test" });
    expect(spy).toHaveBeenCalledWith("{SERVICE}", "{TOOL}", expect.any(Object));
  });

  it("maps input parameters correctly", async () => {
    const spy = vi.spyOn(mcpClient, "callMCPTool");
    await tool.execute({ wrapperParam: "value1", anotherParam: "value2" });
    expect(spy).toHaveBeenCalledWith("{SERVICE}", "{TOOL}", {
      mcpParam: "value1",
      anotherMcpParam: "value2",
    });
  });
});
```

---

### Category 3: Response Filtering (≥2 tests)

```typescript
describe("Response Filtering", () => {
  it("includes essential fields only", async () => {
    vi.spyOn(mcpClient, "callMCPTool").mockResolvedValue({
      id: "123",
      title: "Test",
      essential: "data",
      history: [
        /*verbose*/
      ],
      metadata: {
        /*verbose*/
      },
      _internal: {
        /*debug*/
      },
    });

    const result = await tool.execute({ validInput: "test" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveProperty("id");
      expect(result.value).not.toHaveProperty("history");
      expect(result.value).not.toHaveProperty("_internal");
    }
  });

  it("reduces tokens by ≥{TARGET}%", async () => {
    const mockResponse = generateLargeResponse(); // {ORIGINAL_TOKENS} tokens
    vi.spyOn(mcpClient, "callMCPTool").mockResolvedValue(mockResponse);

    const result = await tool.execute({ validInput: "test" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const tokenCount = JSON.stringify(result.value).length;
      expect(tokenCount).toBeLessThan({ TARGET_TOKENS });
    }
  });
});
```

---

### Category 4: Security (≥4 tests)

Test protection against attacks (command injection, path traversal, XSS, control characters):

```typescript
describe("Security", () => {
  it("blocks command injection", async () => {
    const result = await tool.execute({ field: "; rm -rf /" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/invalid|injection/i);
  });

  it("blocks path traversal", async () => {
    const result = await tool.execute({ path: "../../../etc/passwd" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/path traversal|invalid path/i);
  });

  it("blocks XSS attempts", async () => {
    const result = await tool.execute({ field: '<script>alert("xss")</script>' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/invalid|not allowed/i);
  });

  it("blocks control characters", async () => {
    const result = await tool.execute({ field: "test\x00null" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/control character/i);
  });
});
```

---

### Category 5: Edge Cases (≥4 tests)

```typescript
describe("Edge Cases", () => {
  it("handles empty string input", async () => {
    expect(await tool.execute({ field: "" })).toBeDefined();
  });

  it("handles very long input", async () => {
    expect(await tool.execute({ field: "a".repeat(10000) })).toBeDefined();
  });

  it("handles special characters", async () => {
    expect(await tool.execute({ field: "!@#$%^&*()" })).toBeDefined();
  });

  it("handles unicode", async () => {
    expect(await tool.execute({ field: "你好世界 🌍" })).toBeDefined();
  });
});
```

---

### Category 6: Error Handling (≥3 tests)

```typescript
describe("Error Handling", () => {
  it("handles MCP timeout", async () => {
    vi.spyOn(mcpClient, "callMCPTool").mockRejectedValue(new Error("Timeout after 30s"));
    const result = await tool.execute({ validInput: "test" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/timeout|timed out/i);
  });

  it("handles MCP connection error", async () => {
    vi.spyOn(mcpClient, "callMCPTool").mockRejectedValue(new Error("Connection failed"));
    const result = await tool.execute({ validInput: "test" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/connection/i);
  });

  it("handles malformed MCP response", async () => {
    vi.spyOn(mcpClient, "callMCPTool").mockResolvedValue({ unexpected: "structure" });
    const result = await tool.execute({ validInput: "test" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/invalid response/i);
  });
});
```

---

## Test File Structure Template

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { toolName } from "./tool-name.js";
import * as mcpClient from "../config/lib/mcp-client.js";

describe("toolName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Category 1: Input Validation (≥3 tests)
  describe("Input Validation", () => {
    // ... tests
  });

  // Category 2: MCP Integration (≥2 tests)
  describe("MCP Integration", () => {
    // ... tests
  });

  // Category 3: Response Filtering (≥2 tests)
  describe("Response Filtering", () => {
    // ... tests
  });

  // Category 4: Security (≥4 tests)
  describe("Security", () => {
    // ... tests
  });

  // Category 5: Edge Cases (≥4 tests)
  describe("Edge Cases", () => {
    // ... tests
  });

  // Category 6: Error Handling (≥3 tests)
  describe("Error Handling", () => {
    // ... tests
  });
});
```

---

## Mock Setup Patterns

### Mock MCP Client

```typescript
vi.mock("../config/lib/mcp-client.js", () => ({
  callMCPTool: vi.fn(),
}));

// In tests
import { callMCPTool } from "../config/lib/mcp-client.js";

it("test", async () => {
  vi.mocked(callMCPTool).mockResolvedValue({ data: "mocked" });
  // ... test code
});
```

### Create Test Data Helpers

```typescript
// helpers/test-data.ts
export function generateValidInput() {
  return {
    requiredField: "test",
    optionalField: "value",
  };
}

export function generateLargeResponse() {
  // Return mock response matching discovery doc structure
  return {
    id: "123",
    title: "Test",
    history: new Array(50).fill({
      /* history entry */
    }),
    metadata: {
      /* large object */
    },
  };
}
```

---

## Clarification Question Example

When the agent has questions:

```json
{
  "status": "needs_clarification",
  "level": "scenario",
  "verified_so_far": [
    "Need ≥18 tests across 6 categories",
    "Must achieve ≥80% coverage",
    "Security tests should use testSecurityScenarios() helper"
  ],
  "questions": [
    {
      "category": "requirement",
      "question": "Should I test behavior when MCP returns partial data (e.g., missing optional fields)?",
      "options": [
        "Yes, test all optional field combinations",
        "Yes, test 2-3 common scenarios",
        "No, assume MCP always returns complete data"
      ],
      "default_assumption": "Test 2-3 common scenarios for optional fields",
      "impact": "May miss edge cases where optional fields affect filtering logic"
    },
    {
      "category": "dependency",
      "question": "Does the @claude/testing infrastructure include testSecurityScenarios() helper?",
      "options": [
        "Yes, it's available",
        "No, implement security tests manually",
        "Unknown - need to check codebase"
      ],
      "default_assumption": "Implement security tests manually using standard Vitest",
      "impact": "May duplicate work if helper exists, or miss patterns if not"
    }
  ]
}
```
