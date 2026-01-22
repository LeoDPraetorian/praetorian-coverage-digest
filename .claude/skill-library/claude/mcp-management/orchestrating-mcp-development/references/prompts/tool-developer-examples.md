# Tool Developer TDD Examples

Detailed TDD pattern examples for MCP wrapper implementation.

**Parent document**: [tool-developer-prompt.md](tool-developer-prompt.md)

---

## TDD Pattern (Follow These Examples)

Before implementing, study these examples. Your implementation MUST follow this exact pattern.

### Example 1: Simple Wrapper with Result Type

**Task**: Implement Linear get-issue wrapper

**Step 1 - Write failing test first**:

```typescript
// .claude/tools/linear/get-issue.unit.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getIssue } from "./get-issue.js";
import * as mcpClient from "../config/lib/mcp-client.js";

describe("getIssue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns issue data for valid ID", async () => {
    vi.spyOn(mcpClient, "callMCPTool").mockResolvedValue({
      id: "ISS-123",
      title: "Bug fix",
      state: { name: "In Progress" },
      assignee: { name: "John Doe", email: "john@example.com" },
      history: [
        /* 50KB of history data */
      ],
      _metadata: {
        /* internal fields */
      },
    });

    const result = await getIssue({ issue_id: "ISS-123" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        id: "ISS-123",
        title: "Bug fix",
        state: "In Progress",
        assignee: "John Doe",
      });
      // Verify filtering
      expect(result.value).not.toHaveProperty("history");
      expect(result.value).not.toHaveProperty("_metadata");
    }
  });
});
```

**Step 2 - Run test, verify it fails for the RIGHT reason**:

```
FAIL  .claude/tools/linear/get-issue.unit.test.ts
  ● getIssue › returns issue data for valid ID
    TypeError: getIssue is not a function
```

✓ Correct failure - function doesn't exist yet

**Step 3 - Write minimal code to pass**:

```typescript
// .claude/tools/linear/get-issue.ts
import { z } from "zod";
import { Result, Ok, Err } from "../config/lib/result.js";
import { callMCPTool } from "../config/lib/mcp-client.js";
import { sanitizeInput } from "../config/lib/sanitize.js";

// Input schema
const GetIssueInputSchema = z.object({
  issue_id: z.string().min(1, "Issue ID required"),
});

type GetIssueInput = z.infer<typeof GetIssueInputSchema>;

// Output schema (filtered)
const GetIssueOutputSchema = z.object({
  id: z.string(),
  title: z.string(),
  state: z.string(),
  assignee: z.string().optional(),
});

type GetIssueOutput = z.infer<typeof GetIssueOutputSchema>;

/**
 * Get a Linear issue by ID.
 *
 * Token optimization: Reduces response from ~2300 tokens to ~150 tokens (93% reduction)
 * by filtering out history, comments, metadata, and nested objects.
 *
 * @param input - Issue ID to fetch
 * @returns Result containing filtered issue data or error
 */
export async function getIssue(input: GetIssueInput): Promise<Result<GetIssueOutput, string>> {
  // Validate input
  const parseResult = GetIssueInputSchema.safeParse(input);
  if (!parseResult.success) {
    return Err(`Invalid input: ${parseResult.error.message}`);
  }

  // Sanitize input
  const sanitized = sanitizeInput(parseResult.data.issue_id);
  if (!sanitized.ok) {
    return Err(`Invalid issue ID: ${sanitized.error}`);
  }

  try {
    // Call MCP tool
    const response = await callMCPTool("linear", "get_issue", {
      issue_id: sanitized.value,
    });

    // Filter response (token optimization)
    const filtered = {
      id: response.id,
      title: response.title,
      state: response.state?.name || "Unknown",
      assignee: response.assignee?.name,
    };

    // Validate output
    const outputResult = GetIssueOutputSchema.safeParse(filtered);
    if (!outputResult.success) {
      return Err(`Invalid MCP response: ${outputResult.error.message}`);
    }

    return Ok(outputResult.data);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        return Err("Tool execution timed out");
      }
      if (error.message.includes("not found")) {
        return Err("Issue not found");
      }
      return Err(`MCP error: ${error.message}`);
    }
    return Err("Unknown error occurred");
  }
}
```

**Step 4 - Run test, verify it passes**:

```
PASS  .claude/tools/linear/get-issue.unit.test.ts
  ✓ getIssue › returns issue data for valid ID (12ms)
```

---

### Example 2: Wrapper with Zod Schema Validation

**Task**: Implement wrapper with complex input validation

**Step 1 - Write failing test first**:

```typescript
describe("Input Validation", () => {
  it("requires required fields", async () => {
    const result = await searchIssues({});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("query");
    }
  });

  it("validates field types", async () => {
    const result = await searchIssues({
      query: "test",
      limit: "invalid" as any, // Should be number
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Expected number");
    }
  });

  it("validates constraints", async () => {
    const result = await searchIssues({
      query: "", // min length 1
      limit: 1000, // max 100
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("String must contain at least 1 character");
    }
  });
});
```

**Step 2 - Verify failure**: searchIssues is not defined ✓

**Step 3 - Implement with comprehensive validation**:

```typescript
const SearchIssuesInputSchema = z.object({
  query: z.string().min(1).max(200),
  limit: z.number().int().min(1).max(100).default(25),
  state: z.enum(["open", "closed", "all"]).optional(),
});

export async function searchIssues(
  input: z.infer<typeof SearchIssuesInputSchema>
): Promise<Result<Array<Issue>, string>> {
  const parseResult = SearchIssuesInputSchema.safeParse(input);
  if (!parseResult.success) {
    return Err(`Invalid input: ${parseResult.error.message}`);
  }
  // ... rest of implementation
}
```

**Step 4 - Verify pass**: All validation tests green ✓

---

### Example 3: Wrapper with Response Filtering for Token Optimization

**Task**: Optimize large response from 2500 tokens to <500 tokens

**Step 1 - Write test with token count verification**:

```typescript
describe("Response Filtering", () => {
  it("reduces tokens by ≥80%", async () => {
    // Mock response from discovery doc (2347 tokens)
    vi.spyOn(mcpClient, "callMCPTool").mockResolvedValue({
      id: "123",
      title: "Test Issue",
      description: "Long description...".repeat(100), // ~2KB
      history: [
        /* Array of 50 history entries */
      ],
      comments: [
        /* Array of 30 comments */
      ],
      attachments: [
        /* Array of 10 attachments */
      ],
      metadata: {
        /* Large metadata object */
      },
      _internal: {
        /* Debug fields */
      },
    });

    const result = await getIssue({ issue_id: "123" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const tokenCount = JSON.stringify(result.value).length;
      // Target from architecture.md: 450 tokens (81% reduction)
      expect(tokenCount).toBeLessThan(450);
    }
  });

  it("includes essential fields only", async () => {
    vi.spyOn(mcpClient, "callMCPTool").mockResolvedValue({
      id: "123",
      title: "Test",
      state: { name: "Open", color: "#fff", id: "abc" },
      assignee: {
        name: "John",
        email: "john@example.com",
        avatar: "https://...",
        settings: {},
      },
      history: [],
      _internal: {},
    });

    const result = await getIssue({ issue_id: "123" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Essential fields only
      expect(result.value).toEqual({
        id: "123",
        title: "Test",
        state: "Open",
        assignee: "John",
      });
      // Verbose fields excluded
      expect(result.value).not.toHaveProperty("history");
      expect(result.value).not.toHaveProperty("_internal");
    }
  });
});
```

**Step 2 - Verify failure**: Response not filtered ✓

**Step 3 - Implement aggressive filtering**:

```typescript
// Filter response (token optimization)
// Original: 2347 tokens → Target: 450 tokens (81% reduction)
const filtered = {
  id: response.id,
  title: response.title,
  state: response.state?.name || "Unknown", // Extract name only, drop color/id
  assignee: response.assignee?.name, // Name only, drop email/avatar/settings
  // Explicitly exclude: history, comments, attachments, metadata, _internal
};
```

**Step 4 - Verify token count**: Target met ✓

---

## Critical TDD Rules

**CRITICAL**: Apply this EXACT pattern to your task:

1. Write test FIRST (before any implementation code)
2. Run test and confirm it FAILS for the right reason
3. Write MINIMAL code to make test pass
4. Verify test passes

Do NOT skip steps. Do NOT write implementation before test.

---

## MCP-Specific Context

### Using response-utils.ts

```typescript
import { filterFields } from "../config/lib/response-utils.js";

// Filter response to include only specified fields
const filtered = filterFields(response, ["id", "title", "state"]);
```

### Using sanitize.ts

```typescript
import { sanitizeInput, sanitizeFilePath } from "../config/lib/sanitize.js";

// Sanitize string input (blocks injection, XSS, control chars)
const sanitized = sanitizeInput(userInput);
if (!sanitized.ok) {
  return Err(`Invalid input: ${sanitized.error}`);
}

// Sanitize file paths (blocks path traversal)
const safePath = sanitizeFilePath(userPath);
```

### Using mcp-client.ts

```typescript
import { callMCPTool } from "../config/lib/mcp-client.js";

// Call MCP tool
const response = await callMCPTool(
  "service-name", // e.g., "linear", "chrome", "currents"
  "tool-name", // e.g., "get_issue", "screenshot", "get_runs"
  { param: "value" }
);
```
