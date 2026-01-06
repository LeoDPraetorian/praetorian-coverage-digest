# MCP Wrapper Implementation Guide

## Overview

After RED gate passes (tests exist and fail), implement the wrapper to make tests pass.

## Implementation Checklist

- [ ] Read schema discovery docs
- [ ] Implement InputSchema with Zod
- [ ] Implement FilteredResult interface
- [ ] Implement execute() function
- [ ] Call MCP with callMCPTool()
- [ ] Filter response for token reduction
- [ ] Handle errors gracefully
- [ ] Verify GREEN gate passes

---

## Step 1: Read Discovery Docs

```bash
cat .claude/tools/{service}/docs/{tool}-discovery.md
```

Extract:

- Required vs optional input fields
- Output fields to include vs exclude
- Token reduction target (e.g., 80%)
- Error patterns

---

## Step 2: Implement InputSchema

Based on discovery docs, define Zod schema:

```typescript
import { z } from "zod";

const InputSchema = z.object({
  // Required fields (from discovery)
  issueId: z.string().min(1).describe("Linear issue ID (e.g., ENG-1234)"),

  // Optional fields (from discovery)
  includeComments: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether to include comments in response"),
});

type Input = z.infer<typeof InputSchema>;
```

**Validation rules**:

- `.min(1)` for non-empty strings
- `.optional()` for fields not always provided
- `.default(value)` for optional fields with defaults
- `.describe()` for documentation

---

## Step 3: Implement FilteredResult Interface

Based on discovery token reduction strategy:

```typescript
interface FilteredResult {
  // Only essential fields from discovery
  id: string;
  title: string;
  status: string;
  priority: number;
  assignee?: string; // Optional (may be undefined)
}
```

**Include only**:

- Fields agents need (id, title, status)
- As defined in discovery doc's "Fields to Include" section

**Exclude**:

- Verbose fields (metadata, history, \_internal)
- As defined in discovery doc's "Fields to Exclude" section

---

## Step 4: Implement execute() Function

```typescript
import { callMCPTool } from "../config/lib/mcp-client.js";

async function execute(input: unknown): Promise<FilteredResult> {
  // 1. Validate input
  const validated = InputSchema.parse(input);

  // 2. Call MCP (map input to MCP parameters)
  const raw = await callMCPTool("{service}", "{tool}", {
    // Map wrapper params to MCP params (from discovery)
    issue_id: validated.issueId,
    expand: validated.includeComments ? ["comments"] : [],
  });

  // 3. Filter response (token reduction)
  return {
    id: raw.id,
    title: raw.title,
    status: raw.state?.name ?? "Unknown",
    priority: raw.priority ?? 4,
    assignee: raw.assignee?.name, // Optional chaining
  };
}
```

**Key patterns**:

- Validate with `InputSchema.parse()`
- Map wrapper params to MCP params (may differ)
- Use optional chaining (`?.`) for nested optional fields
- Provide defaults (`??`) for missing fields

---

## Step 5: Implement Error Handling

```typescript
async function execute(input: unknown): Promise<FilteredResult> {
  try {
    const validated = InputSchema.parse(input);
    const raw = await callMCPTool("{service}", "{tool}", {
      issue_id: validated.issueId,
    });
    return filterResult(raw);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid input: ${error.message}`);
    }
    if (error instanceof TimeoutError) {
      throw new Error("MCP request timed out after 30s");
    }
    if (error instanceof ConnectionError) {
      throw new Error("Failed to connect to MCP server");
    }
    // Re-throw unknown errors
    throw error;
  }
}
```

**Handle**:

- Zod validation errors (invalid input)
- Timeout errors (slow MCP)
- Connection errors (MCP unavailable)
- Unknown errors (re-throw with context)

---

## Step 6: Export Tool Definition

```typescript
export const { toolCamel } = {
  name: "{service}.{tool}",
  description: "Brief description from discovery",
  inputSchema: InputSchema,
  execute,
};
```

---

## Complete Example

```typescript
// .claude/tools/linear/get-issue.ts

import { z } from "zod";
import { callMCPTool } from "../config/lib/mcp-client.js";

// 1. Input validation (from discovery)
const InputSchema = z.object({
  issueId: z.string().min(1).describe("Linear issue ID"),
  includeComments: z.boolean().optional().default(false),
});

type Input = z.infer<typeof InputSchema>;

// 2. Output filtering (from discovery: essential fields only)
interface FilteredResult {
  id: string;
  title: string;
  status: string;
  priority: number;
  assignee?: string;
}

// 3. Execute function
async function execute(input: unknown): Promise<FilteredResult> {
  // Validate
  const validated = InputSchema.parse(input);

  // Call MCP
  const raw = await callMCPTool("linear", "get_issue", {
    issue_id: validated.issueId,
    expand: validated.includeComments ? ["comments"] : [],
  });

  // Filter (token reduction: 2347 → 450 tokens from discovery)
  return {
    id: raw.id,
    title: raw.title,
    status: raw.state?.name ?? "Unknown",
    priority: raw.priority ?? 4,
    assignee: raw.assignee?.name,
  };
}

// 4. Export
export const getIssue = {
  name: "linear.get_issue",
  description: "Get a single Linear issue by ID",
  inputSchema: InputSchema,
  execute,
};
```

---

## Verification

After implementation:

```bash
# Run tests (should pass)
npm run verify-green -- {service}/{tool}

# Expected output:
# ✅ All tests passing
# ✅ Coverage: 87% (≥80%)
```

If tests fail:

1. Review error messages
2. Fix implementation
3. Re-run verify-green
4. Iterate until passing

---

## Common Patterns

### Pattern 1: Optional Field Access

Use optional chaining for nested optional fields:

```typescript
// Discovery shows 'assignee' may be undefined
assignee: raw.assignee?.name, // ✅ Safe

// Don't do this:
assignee: raw.assignee.name,  // ❌ May throw if undefined
```

### Pattern 2: Default Values

Provide defaults for fields that might be missing:

```typescript
// Discovery shows 'priority' sometimes missing
priority: (raw.priority ?? 4, // ✅ Defaults to 4
  // Tests should verify default behavior:
  it("uses default priority when missing", async () => {
    vi.spyOn(mcpClient, "callMCPTool").mockResolvedValue({
      id: "123",
      title: "Test",
      // priority missing
    });

    const result = await tool.execute({ issueId: "ENG-1" });
    expect(result.priority).toBe(4); // Default
  }));
```

### Pattern 3: Array Handling

When MCP returns arrays, consider token impact:

```typescript
// Discovery shows 'comments' can be 100+ items (high token cost)

// Option 1: Limit array size
comments: raw.comments?.slice(0, 5), // First 5 only

// Option 2: Exclude array entirely
// (Don't include 'comments' in FilteredResult)

// Option 3: Make it optional based on param
comments: validated.includeComments ? raw.comments : undefined,
```

### Pattern 4: Type Coercion

Convert MCP types to wrapper types:

```typescript
// MCP returns ISO date strings, convert to Date
createdAt: new Date(raw.created_at),

// MCP returns numeric status codes, map to strings
status: STATUS_MAP[raw.status_code] ?? 'Unknown',

const STATUS_MAP: Record<number, string> = {
  0: 'Backlog',
  1: 'Todo',
  2: 'In Progress',
  3: 'Done',
};
```

### Pattern 5: Conditional Fields

Include fields based on conditions:

```typescript
interface FilteredResult {
  id: string;
  title: string;
  // Conditional: only if assignee exists
  assignee?: string;
}

return {
  id: raw.id,
  title: raw.title,
  // Only include if present
  ...(raw.assignee && { assignee: raw.assignee.name }),
};
```

---

## Anti-Patterns

### ❌ Don't Return Raw MCP Response

```typescript
// Bad: No token reduction
export const tool = {
  async execute(input: unknown) {
    const validated = InputSchema.parse(input);
    return await callMCPTool("service", "tool", validated);
    // Returns full response (2500 tokens)
  },
};

// Good: Filter to essential fields
export const tool = {
  async execute(input: unknown) {
    const validated = InputSchema.parse(input);
    const raw = await callMCPTool("service", "tool", validated);
    return {
      id: raw.id,
      title: raw.title,
      // Only essential fields (500 tokens)
    };
  },
};
```

### ❌ Don't Hardcode Service Names

```typescript
// Bad: Hardcoded, breaks if service renamed
await callMCPTool('linear', 'get_issue', ...);

// Good: Use constant or import
const SERVICE = 'linear';
const TOOL = 'get_issue';
await callMCPTool(SERVICE, TOOL, ...);
```

### ❌ Don't Swallow Errors

```typescript
// Bad: Silent failure
try {
  return await callMCPTool(...);
} catch {
  return null; // Error hidden, hard to debug
}

// Good: Propagate with context
try {
  return await callMCPTool(...);
} catch (error) {
  throw new Error(`MCP call failed for {tool}: ${error.message}`);
}
```

### ❌ Don't Ignore Discovery Docs

```typescript
// Bad: Arbitrary field selection
return {
  id: raw.id,
  randomField: raw.something, // Not in discovery doc
};

// Good: Follow discovery doc exactly
// Discovery says include: id, title, status
return {
  id: raw.id,
  title: raw.title,
  status: raw.state?.name ?? "Unknown",
};
```

### ❌ Don't Skip Optional Chaining

```typescript
// Bad: Assumes nested fields exist
status: raw.state.name, // Crashes if state is undefined

// Good: Safe navigation
status: raw.state?.name ?? 'Unknown',
```

---

## Parameter Mapping

MCP parameter names may differ from wrapper parameter names:

```typescript
// Wrapper uses camelCase
const InputSchema = z.object({
  issueId: z.string(),
  includeHistory: z.boolean().optional(),
});

// MCP expects snake_case
const raw = await callMCPTool("linear", "get_issue", {
  issue_id: validated.issueId, // Map camelCase → snake_case
  expand: validated.includeHistory ? ["history"] : [],
});
```

**Document mapping** in discovery:
| Wrapper Param | MCP Param | Transformation |
|---------------|-----------|----------------|
| issueId | issue_id | Direct mapping |
| includeHistory | expand | boolean → array |

---

## Response Filtering Best Practices

### Principle 1: Essential Fields Only

```typescript
// Discovery identified 15 fields in response
// Only 5 are essential for agents

interface FilteredResult {
  // Essential (agents need these)
  id: string;
  title: string;
  status: string;
  priority: number;
  assignee?: string;

  // NOT included (agents don't need):
  // - metadata (internal system data)
  // - history (verbose changelog)
  // - _internal (debug info)
  // - timestamps (not actionable)
}
```

### Principle 2: Flatten Nested Structures

```typescript
// MCP returns nested objects
const raw = {
  state: { name: "In Progress", type: "started", color: "#fff" },
  assignee: { id: "123", name: "Alice", email: "...", avatar: "..." },
};

// Flatten to essential fields only
return {
  status: raw.state?.name ?? "Unknown", // Flatten state.name
  assignee: raw.assignee?.name, // Flatten assignee.name
  // Exclude: state.type, state.color, assignee.id, assignee.email, etc.
};
```

### Principle 3: Limit Arrays

```typescript
// MCP returns large arrays
const raw = {
  comments: [
    /* 100 items */
  ],
  history: [
    /* 200 items */
  ],
};

// Option 1: Limit size
return {
  recentComments: raw.comments?.slice(0, 5), // First 5 only
};

// Option 2: Exclude entirely (preferred)
// Don't include comments/history in FilteredResult
```

### Principle 4: Measure Token Reduction

Add test to verify token reduction:

```typescript
it("achieves 80% token reduction", async () => {
  const mockResponse = {
    /* full response from discovery */
  };
  vi.spyOn(mcpClient, "callMCPTool").mockResolvedValue(mockResponse);

  const result = await tool.execute({ issueId: "TEST" });

  const originalTokens = JSON.stringify(mockResponse).length; // 2347
  const filteredTokens = JSON.stringify(result).length; // 450
  const reduction = ((originalTokens - filteredTokens) / originalTokens) * 100;

  expect(reduction).toBeGreaterThanOrEqual(80); // ≥80% reduction
});
```

---

## Error Handling Patterns

### Pattern 1: Zod Validation Errors

```typescript
try {
  const validated = InputSchema.parse(input);
} catch (error) {
  if (error instanceof z.ZodError) {
    // Extract first error for user-friendly message
    const firstError = error.errors[0];
    throw new Error(`Invalid ${firstError.path.join(".")}: ${firstError.message}`);
  }
}
```

### Pattern 2: MCP Errors

```typescript
try {
  const raw = await callMCPTool(service, tool, params);
} catch (error) {
  // Check error type and provide context
  if (error.message.includes("timeout")) {
    throw new Error(`MCP request timed out for ${tool}`);
  }
  if (error.message.includes("connection")) {
    throw new Error(`Failed to connect to ${service} MCP server`);
  }
  throw error; // Re-throw unknown errors
}
```

### Pattern 3: Response Validation

```typescript
const raw = await callMCPTool(service, tool, params);

// Validate required fields exist
if (!raw.id || !raw.title) {
  throw new Error("MCP response missing required fields");
}

return {
  id: raw.id,
  title: raw.title,
  // ...
};
```

---

## Complete Example

```typescript
// .claude/tools/linear/get-issue.ts

import { z } from "zod";
import { callMCPTool } from "../config/lib/mcp-client.js";

// 1. Input validation (from discovery)
const InputSchema = z.object({
  issueId: z.string().min(1).describe("Linear issue ID"),
  includeComments: z.boolean().optional().default(false),
});

type Input = z.infer<typeof InputSchema>;

// 2. Output filtering (from discovery: 5 essential fields of 15 total)
interface FilteredResult {
  id: string;
  title: string;
  status: string;
  priority: number;
  assignee?: string;
}

// 3. Execute function
async function execute(input: unknown): Promise<FilteredResult> {
  try {
    // Validate
    const validated = InputSchema.parse(input);

    // Call MCP
    const raw = await callMCPTool("linear", "get_issue", {
      issue_id: validated.issueId, // Map camelCase → snake_case
      expand: validated.includeComments ? ["comments"] : [],
    });

    // Validate response
    if (!raw.id || !raw.title) {
      throw new Error("MCP response missing required fields");
    }

    // Filter (token reduction: 2347 → 450 tokens = 81%)
    return {
      id: raw.id,
      title: raw.title,
      status: raw.state?.name ?? "Unknown",
      priority: raw.priority ?? 4,
      assignee: raw.assignee?.name,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid input: ${error.errors[0].message}`);
    }
    throw error;
  }
}

// 4. Export
export const getIssue = {
  name: "linear.get_issue",
  description: "Get a single Linear issue by ID",
  inputSchema: InputSchema,
  execute,
};
```

---

## Common Scenarios

### Scenario 1: Paginated Results

```typescript
// Discovery shows tool supports pagination
const InputSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

// MCP call with pagination
const raw = await callMCPTool("service", "list_items", {
  limit: validated.limit,
  offset: validated.offset,
});

// Return paginated result
return {
  items: raw.items.map((item) => ({
    id: item.id,
    name: item.name,
  })),
  total: raw.total,
  hasMore: raw.offset + raw.limit < raw.total,
};
```

### Scenario 2: Search/Filter Operations

```typescript
// Discovery shows tool accepts search query
const InputSchema = z.object({
  query: z.string().min(1),
  filters: z.record(z.string()).optional(),
});

// MCP call with search
const raw = await callMCPTool("service", "search", {
  q: validated.query,
  filters: validated.filters,
});

// Return search results (limited to reduce tokens)
return {
  results: raw.results.slice(0, 10).map((item) => ({
    id: item.id,
    title: item.title,
  })),
  total: raw.total,
};
```

### Scenario 3: Batch Operations

```typescript
// Discovery shows tool accepts multiple IDs
const InputSchema = z.object({
  ids: z.array(z.string()).min(1).max(50), // Limit batch size
});

// MCP call with batch
const raw = await callMCPTool("service", "get_multiple", {
  ids: validated.ids,
});

// Return batch results
return {
  items: raw.items.map((item) => ({
    id: item.id,
    status: item.status,
  })),
};
```

---

## Troubleshooting

### Tests fail: "Cannot find module"

**Cause**: Import path incorrect or module not built.

**Fix**:

```bash
cd .claude/tools/{service}
npx tsc
```

### Tests fail: "ZodError: Required"

**Cause**: Missing required field in test input.

**Fix**: Add required field from discovery doc.

### Tests fail: "Cannot read property of undefined"

**Cause**: Missing optional chaining.

**Fix**: Use `?.` for nested optional fields:

```typescript
raw.nested.field → raw.nested?.field
```

### Coverage <80%

**Cause**: Untested branches or error paths.

**Fix**:

1. Run coverage report to see uncovered lines
2. Add tests for missing branches
3. Add tests for error paths

---

## Anti-Patterns Summary

| Anti-Pattern           | Why It's Bad         | Fix                        |
| ---------------------- | -------------------- | -------------------------- |
| Return raw response    | No token reduction   | Filter to essential fields |
| Hardcode service name  | Breaks on rename     | Use constant               |
| Swallow errors         | Hard to debug        | Re-throw with context      |
| Ignore discovery       | Wrong implementation | Follow discovery exactly   |
| Skip optional chaining | Runtime errors       | Use `?.` for optional      |
| Arbitrary test values  | Tests don't validate | Use values from discovery  |
