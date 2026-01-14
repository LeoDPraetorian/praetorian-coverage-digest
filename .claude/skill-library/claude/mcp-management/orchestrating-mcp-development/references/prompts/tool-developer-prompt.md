# MCP Tool Developer Prompt Template

Use this template when dispatching tool-developer subagents in Phase 5 (Implementation).

## Usage

```typescript
Task({
  subagent_type: "tool-developer",
  description: "Implement MCP wrapper for [service]/[tool]",
  prompt: `[Use template below, filling in placeholders]`,
});
```

## Template

````markdown
You are implementing: MCP Wrapper for {SERVICE}/{TOOL}

## Task Description

Implement a TypeScript wrapper function that calls an MCP tool and returns filtered, optimized results.

Service: {SERVICE}
Tool: {TOOL}
Implementation File: `.claude/tools/{SERVICE}/{TOOL}.ts`

## Architecture Context

{PASTE architecture.md content here - include token optimization strategy, response filtering rules, error handling pattern, Zod schemas}

## Security Requirements

{PASTE security-assessment.md content here - include input validation requirements, output sanitization needs, authentication considerations}

## Output Directory

OUTPUT_DIRECTORY: `.claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{SERVICE}`

Write your implementation log to: `{OUTPUT_DIRECTORY}/{TOOL}/implementation-log.md`

## MANDATORY SKILLS (invoke ALL before completing)

You MUST use these skills during this task:

1. **developing-with-tdd** - Write test first, verify it fails, then implement
2. **verifying-before-completion** - Run tests and verify before claiming done
3. **implementing-result-either-pattern** (.claude/skill-library/development/typescript/implementing-result-either-pattern/SKILL.md) - Use Result<T, E> for error handling
4. **validating-with-zod-schemas** (.claude/skill-library/development/typescript/validating-with-zod-schemas/SKILL.md) - Create input/output schemas
5. **sanitizing-inputs-securely** (.claude/skill-library/development/typescript/sanitizing-inputs-securely/SKILL.md) - Prevent injection attacks
6. **optimizing-llm-api-responses** (.claude/skill-library/development/typescript/optimizing-llm-api-responses/SKILL.md) - Token reduction strategies
7. **adhering-to-yagni** - Only implement what's specified, nothing extra

## STEP 0: Clarification (MANDATORY)

**Before ANY implementation work**, review the architecture and security specifications. Use progressive disclosure to identify gaps:

### Level 1: Scope Verification

"My understanding of scope: [1-2 sentences describing what wrapper will do]"

If unclear: Return questions
If clear: Proceed to Level 2

### Level 2: Dependency Verification

"Dependencies I've identified:
- MCP tool name: `{mcp-tool-name}`
- Response filtering approach: {approach}
- Validation libraries: {zod, sanitize.ts}"

If unclear: Return questions
If clear: Proceed to Level 3

### Level 3: Behavior Verification

"Expected behaviors:
- Happy path: User provides valid input → wrapper calls MCP → returns filtered response
- Error case: Invalid input → Zod validation fails → return Err(error)
- Error case: MCP timeout → return Err('Tool execution timed out')
- Edge cases: Empty responses, missing fields, rate limits"

If unclear: Return questions
If clear: Proceed to Level 4

### Level 4: Acceptance Verification

"This task is complete when:
- [ ] Wrapper function implemented in `.claude/tools/{SERVICE}/{TOOL}.ts`
- [ ] Input schema validates all parameters per architecture.md
- [ ] Response filtering reduces tokens by ≥80% (from discovery)
- [ ] Result<T, E> pattern used for error handling
- [ ] All inputs sanitized per security-assessment.md
- [ ] Tests verify: input validation, MCP integration, response filtering, security, edge cases, error handling"

If unclear: Return questions
If clear: Begin implementation

---

### If You Have Questions

Return immediately with structured JSON:

```json
{
  "status": "needs_clarification",
  "level": "scope|dependency|behavior|acceptance",
  "verified_so_far": ["Items I'm confident about"],
  "questions": [
    {
      "category": "requirement|dependency|scope|assumption",
      "question": "Specific question text",
      "options": ["Option A", "Option B", "Option C"],
      "default_assumption": "What I'll assume if no answer",
      "impact": "What happens if this assumption is wrong"
    }
  ]
}
```

**Example:**

```json
{
  "status": "needs_clarification",
  "level": "behavior",
  "verified_so_far": [
    "Wrapper calls linear.get_issue MCP tool",
    "Input schema requires issue_id field",
    "Response filtering removes history array"
  ],
  "questions": [
    {
      "category": "requirement",
      "question": "Should the wrapper retry on MCP timeout?",
      "options": [
        "Yes, retry up to 3 times with exponential backoff",
        "No, return Err immediately on timeout",
        "Retry once with 1s delay"
      ],
      "default_assumption": "No retry - return Err immediately",
      "impact": "Affects reliability for transient network errors"
    },
    {
      "category": "dependency",
      "question": "Does MCP response include `attachments` field that should be filtered?",
      "options": [
        "Yes, filter it out",
        "No, not in discovery doc",
        "Unknown - need to verify schema-discovery.md"
      ],
      "default_assumption": "Follow discovery doc exactly - only filter fields listed",
      "impact": "May miss token optimization if undocumented fields exist"
    }
  ]
}
```

### If No Questions

State explicitly:

"I have reviewed the architecture and security specifications and have no clarifying questions.

My understanding:
- Implement wrapper at `.claude/tools/{SERVICE}/{TOOL}.ts`
- Target {X}% token reduction (from {original_tokens} to {target_tokens} tokens)
- Use Result<T, E> pattern for all error cases
- Validate inputs with Zod, sanitize for injection attacks
- Filter response to include only: {field1, field2, field3}

Proceeding with implementation."

### DO NOT

- Assume requirements that aren't in architecture.md or security-assessment.md
- Make design decisions without asking (retry logic, caching, rate limiting)
- Proceed if anything is unclear
- Skip this step because "it seems simple"

---

## Your Job

Once requirements are clear and you've completed Step 0:

1. **Write the failing test first** (TDD)
   - Test the behavior, not the implementation
   - Run test to verify it fails for the right reason

2. **Implement minimal code to pass**
   - Only what's needed to make the test pass
   - Follow the architecture document exactly

3. **Verify implementation works**
   - All tests pass
   - Coverage ≥80%
   - No TypeScript errors

4. **Self-review before reporting back**

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
      history: [/* 50KB of history data */],
      _metadata: { /* internal fields */ },
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
export async function getIssue(
  input: GetIssueInput
): Promise<Result<GetIssueOutput, string>> {
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
      history: [/* Array of 50 history entries */],
      comments: [/* Array of 30 comments */],
      attachments: [/* Array of 10 attachments */],
      metadata: { /* Large metadata object */ },
      _internal: { /* Debug fields */ },
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
        settings: {}
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

**CRITICAL**: Apply this EXACT pattern to your task:
1. Write test FIRST (before any implementation code)
2. Run test and confirm it FAILS for the right reason
3. Write MINIMAL code to make test pass
4. Verify test passes

Do NOT skip steps. Do NOT write implementation before test.

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
  "service-name",  // e.g., "linear", "chrome", "currents"
  "tool-name",     // e.g., "get_issue", "screenshot", "get_runs"
  { param: "value" }
);
```

## Self-Review Checklist

Before reporting back, verify:

**Completeness:**

- [ ] Did I implement the wrapper at the correct path (`.claude/tools/{SERVICE}/{TOOL}.ts`)?
- [ ] Did I include all required fields in the input schema per architecture.md?
- [ ] Did I filter the response per architecture.md token optimization strategy?
- [ ] Did I handle all error cases mentioned in architecture.md?

**Quality:**

- [ ] Does the implementation follow the Result<T, E> pattern?
- [ ] Are Zod schemas properly defined for input and output?
- [ ] Is the code clean and well-documented with TSDoc?
- [ ] Are variable/function names clear and accurate?

**Security:**

- [ ] Did I sanitize all user inputs using sanitize.ts?
- [ ] Did I validate inputs with Zod before processing?
- [ ] Did I avoid exposing sensitive data in error messages?
- [ ] Did I check for injection attacks per security-assessment.md?

**Token Optimization:**

- [ ] Did I verify token count meets target (≥80% reduction)?
- [ ] Did I filter out all verbose fields (history, metadata, _internal)?
- [ ] Did I extract scalar values from nested objects (e.g., state.name vs full state object)?
- [ ] Did I document the token reduction in TSDoc comment?

**Testing:**

- [ ] Did I follow TDD (test first)?
- [ ] Do tests cover all 6 categories (input validation, MCP integration, response filtering, security, edge cases, error handling)?
- [ ] Do tests actually verify behavior (not just mock behavior)?
- [ ] Does coverage meet ≥80% requirement?

**Discipline:**

- [ ] Did I avoid overbuilding (YAGNI)?
- [ ] Did I only build what was specified in architecture.md?
- [ ] Did I follow existing patterns in the codebase?

If you find issues during self-review, fix them now before reporting.

## Report Format

When done, include in your response:

1. **What you implemented** - Summary of wrapper functionality
2. **Token optimization achieved** - Original vs final token counts
3. **Test results** - Coverage percentage and test counts
4. **Files changed** - Implementation and test files
5. **Self-review findings** - Issues found and fixed
6. **Any concerns** - Things the reviewer should look at

## Output Format

After completing your work, include this metadata block:

```json
{
  "agent": "tool-developer",
  "output_type": "implementation",
  "feature_directory": ".claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{SERVICE}",
  "skills_invoked": [
    "developing-with-tdd",
    "verifying-before-completion",
    "implementing-result-either-pattern",
    "validating-with-zod-schemas",
    "sanitizing-inputs-securely",
    "optimizing-llm-api-responses",
    "adhering-to-yagni"
  ],
  "status": "complete",
  "files_created": [
    ".claude/tools/{SERVICE}/{TOOL}.ts",
    ".claude/tools/{SERVICE}/{TOOL}.unit.test.ts"
  ],
  "files_modified": [],
  "tests_passing": true,
  "coverage": {
    "line": 85,
    "branch": 82,
    "function": 90
  },
  "token_optimization": {
    "original": 2347,
    "optimized": 412,
    "reduction_pct": 82
  },
  "handoff": {
    "next_agent": "tool-reviewer",
    "context": "Implementation complete with 82% token reduction, ready for code review"
  }
}
```
````

## If Blocked

If you encounter something unexpected or unclear, **ask questions**.
It's always OK to pause and clarify. Don't guess or make assumptions.

If you cannot complete this task, return:

```json
{
  "agent": "tool-developer",
  "status": "blocked",
  "blocked_reason": "missing_requirements|architecture_ambiguity|test_failures|security_concern|out_of_scope",
  "attempted": [
    "Implemented basic wrapper structure",
    "Attempted token optimization but unclear which fields to filter",
    "Wrote 12 tests but 3 security tests failing due to unclear sanitization requirements"
  ],
  "questions": [
    {
      "category": "requirement",
      "question": "Should the wrapper cache MCP responses to reduce repeated calls?",
      "options": ["Yes, cache for 5 minutes", "No, always fetch fresh", "Cache only for specific tools"],
      "impact": "Affects performance and freshness of data"
    }
  ],
  "handoff": {
    "next_agent": null,
    "context": "Blocked on architecture decision about caching strategy. Implementation 70% complete, tests passing for implemented portions."
  }
}
```
