# MCP Tool Tester Prompt Template

Use this template when dispatching tool-tester subagents in Phase 4 (Test Planning & Implementation).

## Usage

```typescript
Task({
  subagent_type: "tool-tester",
  description: "Create test plan and implement tests for [service]/[tool]",
  prompt: `[Use template below, filling in placeholders]`,
});
```

## Template

````markdown
You are implementing: Test Suite for MCP Wrapper {SERVICE}/{TOOL}

## Task Description

Create a comprehensive test plan and implement tests for an MCP wrapper function.

Service: {SERVICE}
Tool: {TOOL}
Test File: `.claude/tools/{SERVICE}/{TOOL}.unit.test.ts`
Test Plan File: `{OUTPUT_DIRECTORY}/{TOOL}/test-plan.md`

## Architecture Context

{PASTE architecture.md content here - include token optimization targets, response filtering rules, error handling pattern, expected behaviors}

## Security Requirements

{PASTE security-assessment.md content here - include security validation requirements, attack vectors to test, input sanitization rules}

## Output Directory

OUTPUT_DIRECTORY: `.claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{SERVICE}`

Write your test plan to: `{OUTPUT_DIRECTORY}/{TOOL}/test-plan.md`
Write tests to: `.claude/tools/{SERVICE}/{TOOL}.unit.test.ts`

## MANDATORY SKILLS (invoke ALL before completing)

You MUST use these skills during this task:

1. **developing-with-tdd** - Understand TDD principles for test design
2. **verifying-before-completion** - Run tests and verify coverage before claiming done
3. **testing-with-vitest-mocks** (.claude/skill-library/testing/testing-with-vitest-mocks/SKILL.md) - Use Vitest mocking patterns
4. **adhering-to-yagni** - Only test what's specified, nothing extra

## STEP 0: Clarification (MANDATORY)

**Before ANY test writing**, review the architecture specification and identify gaps using progressive disclosure:

### Level 1: Scope Verification

"My understanding of scope: Create test plan with ≥18 tests across 6 categories and implement all tests for {SERVICE}/{TOOL} wrapper"

If unclear: Return questions
If clear: Proceed to Level 2

### Level 2: Coverage Requirements Verification

"Coverage requirements I've identified:
- Minimum tests per category:
  - Input Validation: ≥3 tests
  - MCP Integration: ≥2 tests
  - Response Filtering: ≥2 tests
  - Security: ≥4 tests
  - Edge Cases: ≥4 tests
  - Error Handling: ≥3 tests
- Total minimum: 18 tests
- Coverage target: ≥80% line/branch/function"

If unclear: Return questions
If clear: Proceed to Level 3

### Level 3: Test Scenario Verification

"Test scenarios I've identified from architecture.md:
- Happy path: Valid input → MCP call → filtered response
- Input validation failures: {list specific validation rules to test}
- Token optimization: Verify {X}% reduction from {original} to {target} tokens
- Security attacks: {list specific attack vectors from security-assessment.md}
- Error cases: {list MCP errors to simulate - timeout, not found, connection failure}"

If unclear: Return questions
If clear: Proceed to Level 4

### Level 4: Mock Strategy Verification

"Mocking strategy:
- Mock MCP client at module level using vi.mock()
- Use vi.spyOn() to verify MCP calls
- Create test data helpers for large responses
- Use @claude/testing infrastructure: createMCPMock(), testSecurityScenarios(), MCPErrors"

If unclear: Return questions
If clear: Begin test implementation

---

### If You Have Questions

Return immediately with structured JSON:

```json
{
  "status": "needs_clarification",
  "level": "scope|coverage|scenario|mock_strategy",
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

### If No Questions

State explicitly:

"I have reviewed the architecture and security specifications and have no clarifying questions.

My understanding:
- Create test-plan.md with ≥18 tests across 6 categories
- Implement all tests in `.claude/tools/{SERVICE}/{TOOL}.unit.test.ts`
- Achieve ≥80% coverage
- Verify token reduction from {X} to {Y} tokens ({Z}% reduction)
- Test security scenarios: {list specific attacks}

Proceeding with test implementation."

### DO NOT

- Assume test scenarios that aren't in architecture.md or security-assessment.md
- Skip test categories without asking
- Proceed if coverage requirements are unclear
- Make up token count targets - use values from architecture.md

---

## Your Job

Once requirements are clear and you've completed Step 0:

1. **Create test-plan.md**
   - Document all test categories and specific scenarios
   - Map each test to architecture requirements
   - Include token count targets from discovery

2. **Implement tests following categories**
   - Use @claude/testing infrastructure where available
   - Mock MCP client, not the wrapper itself
   - Test behavior, not implementation details

3. **Verify coverage**
   - Run tests: `npm test -- tools/{SERVICE}/{TOOL}`
   - Check coverage: Must be ≥80% line/branch/function
   - Fix gaps before reporting

4. **Self-review before reporting back**

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
      field: 123 // expect string
    } as any);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Expected string");
    }
  });

  it("validates constraints", async () => {
    const result = await tool.execute({
      field: "" // min length 1
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("at least 1 character");
    }
  });
});
```

### Category 2: MCP Integration (≥2 tests)

Test that wrapper calls MCP correctly:

```typescript
describe("MCP Integration", () => {
  it("calls MCP with correct tool name", async () => {
    const spy = vi.spyOn(mcpClient, "callMCPTool");

    await tool.execute({ validInput: "test" });

    expect(spy).toHaveBeenCalledWith(
      "{SERVICE}",
      "{TOOL}",
      expect.any(Object)
    );
  });

  it("maps input parameters correctly", async () => {
    const spy = vi.spyOn(mcpClient, "callMCPTool");

    await tool.execute({
      wrapperParam: "value1",
      anotherParam: "value2"
    });

    expect(spy).toHaveBeenCalledWith(
      "{SERVICE}",
      "{TOOL}",
      {
        mcpParam: "value1", // Verify parameter mapping
        anotherMcpParam: "value2"
      }
    );
  });
});
```

### Category 3: Response Filtering (≥2 tests)

Test that token reduction works per architecture.md targets:

```typescript
describe("Response Filtering", () => {
  it("includes essential fields only", async () => {
    const mockResponse = {
      id: "123",
      title: "Test",
      essential: "data",
      history: [/* verbose array */],
      metadata: {/* verbose object */},
      _internal: {/* debug fields */}
    };

    vi.spyOn(mcpClient, "callMCPTool").mockResolvedValue(mockResponse);

    const result = await tool.execute({ validInput: "test" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Essential fields present
      expect(result.value).toHaveProperty("id");
      expect(result.value).toHaveProperty("title");
      expect(result.value).toHaveProperty("essential");

      // Verbose fields excluded
      expect(result.value).not.toHaveProperty("history");
      expect(result.value).not.toHaveProperty("metadata");
      expect(result.value).not.toHaveProperty("_internal");
    }
  });

  it("reduces tokens by ≥{TARGET}%", async () => {
    // Use actual token counts from discovery doc
    const mockResponse = generateLargeResponse(); // {ORIGINAL_TOKENS} tokens

    vi.spyOn(mcpClient, "callMCPTool").mockResolvedValue(mockResponse);

    const result = await tool.execute({ validInput: "test" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const tokenCount = JSON.stringify(result.value).length;

      // Target from architecture.md: {TARGET_TOKENS} tokens ({REDUCTION}% reduction)
      expect(tokenCount).toBeLessThan({TARGET_TOKENS});
    }
  });
});
```

### Category 4: Security (≥4 tests)

Test protection against attacks from security-assessment.md:

**Chain of Thought for Security Tests:**
1. What user inputs exist? → Identify attack surfaces
2. What injection attacks apply? → Command injection, XSS, SQL injection
3. What path attacks apply? → Path traversal
4. What encoding attacks apply? → Null bytes, control characters

**Example Structure:**

```typescript
describe("Security", () => {
  it("blocks command injection", async () => {
    const result = await tool.execute({
      field: "; rm -rf /"
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/invalid|injection|not allowed/i);
    }
  });

  it("blocks path traversal", async () => {
    const result = await tool.execute({
      path: "../../../etc/passwd"
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/path traversal|invalid path/i);
    }
  });

  it("blocks XSS attempts", async () => {
    const result = await tool.execute({
      field: '<script>alert("xss")</script>'
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/invalid|not allowed/i);
    }
  });

  it("blocks control characters", async () => {
    const result = await tool.execute({
      field: "test\x00null"
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/control character|invalid/i);
    }
  });
});
```

### Category 5: Edge Cases (≥4 tests)

Test boundary conditions:

```typescript
describe("Edge Cases", () => {
  it("handles empty string input", async () => {
    const result = await tool.execute({ field: "" });
    // Should either succeed with empty or fail validation gracefully
    expect(result).toBeDefined();
  });

  it("handles very long input", async () => {
    const longString = "a".repeat(10000);
    const result = await tool.execute({ field: longString });
    expect(result).toBeDefined();
  });

  it("handles special characters", async () => {
    const result = await tool.execute({
      field: "!@#$%^&*()"
    });
    expect(result).toBeDefined();
  });

  it("handles unicode", async () => {
    const result = await tool.execute({
      field: "你好世界 🌍"
    });
    expect(result).toBeDefined();
  });
});
```

### Category 6: Error Handling (≥3 tests)

Test graceful failures:

```typescript
describe("Error Handling", () => {
  it("handles MCP timeout", async () => {
    vi.spyOn(mcpClient, "callMCPTool").mockRejectedValue(
      new Error("Timeout after 30s")
    );

    const result = await tool.execute({ validInput: "test" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/timeout|timed out/i);
    }
  });

  it("handles MCP connection error", async () => {
    vi.spyOn(mcpClient, "callMCPTool").mockRejectedValue(
      new Error("Connection failed")
    );

    const result = await tool.execute({ validInput: "test" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/connection|connect/i);
    }
  });

  it("handles malformed MCP response", async () => {
    vi.spyOn(mcpClient, "callMCPTool").mockResolvedValue({
      unexpected: "structure"
    });

    const result = await tool.execute({ validInput: "test" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/invalid response|unexpected/i);
    }
  });
});
```

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
    history: new Array(50).fill({ /* history entry */ }),
    metadata: { /* large object */ },
  };
}
```

## Self-Review Checklist

Before reporting back, verify:

**Coverage Requirements:**

- [ ] Did I implement ≥3 input validation tests?
- [ ] Did I implement ≥2 MCP integration tests?
- [ ] Did I implement ≥2 response filtering tests?
- [ ] Did I implement ≥4 security tests?
- [ ] Did I implement ≥4 edge case tests?
- [ ] Did I implement ≥3 error handling tests?
- [ ] Total: Did I implement ≥18 tests?

**Quality:**

- [ ] Do tests verify behavior, not implementation details?
- [ ] Are mocks used correctly (mock dependencies, not the wrapper itself)?
- [ ] Do security tests cover all attack vectors from security-assessment.md?
- [ ] Do token reduction tests use actual values from architecture.md?

**Technical:**

- [ ] Did I run tests and verify they all pass?
- [ ] Did I check coverage (≥80% line/branch/function)?
- [ ] Are there any gaps in coverage? If so, add tests.
- [ ] Do all assertions use proper Result<T, E> pattern checks?

**Documentation:**

- [ ] Did I create test-plan.md with all test scenarios?
- [ ] Does test-plan.md map tests to architecture requirements?
- [ ] Are test descriptions clear and specific?

If you find issues during self-review, fix them now before reporting.

## Report Format

When done, include in your response:

1. **Test plan summary** - Categories and test counts
2. **Coverage results** - Line/branch/function percentages
3. **Test execution results** - All tests passing
4. **Files created** - test-plan.md and test file
5. **Self-review findings** - Issues found and fixed
6. **Any concerns** - Edge cases that may need attention

## Output Format

After completing your work, include this metadata block:

```json
{
  "agent": "tool-tester",
  "output_type": "test_implementation",
  "feature_directory": ".claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{SERVICE}",
  "skills_invoked": [
    "developing-with-tdd",
    "verifying-before-completion",
    "testing-with-vitest-mocks",
    "adhering-to-yagni"
  ],
  "status": "complete",
  "files_created": [
    ".claude/tools/{SERVICE}/{TOOL}.unit.test.ts",
    "{OUTPUT_DIRECTORY}/{TOOL}/test-plan.md"
  ],
  "files_modified": [],
  "tests_passing": true,
  "test_counts": {
    "input_validation": 3,
    "mcp_integration": 2,
    "response_filtering": 2,
    "security": 4,
    "edge_cases": 4,
    "error_handling": 3,
    "total": 18
  },
  "coverage": {
    "line": 85,
    "branch": 82,
    "function": 90
  },
  "handoff": {
    "next_agent": "tool-developer",
    "context": "Test suite complete with ≥80% coverage, ready for implementation (TDD RED phase)"
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
  "agent": "tool-tester",
  "status": "blocked",
  "blocked_reason": "missing_requirements|architecture_ambiguity|coverage_gaps|unclear_security_requirements",
  "attempted": [
    "Created test-plan.md with 18 test scenarios",
    "Implemented input validation tests (3/3)",
    "Implemented MCP integration tests (2/2)",
    "Stuck on response filtering tests - unclear which fields should be filtered"
  ],
  "questions": [
    {
      "category": "requirement",
      "question": "Architecture.md mentions filtering 'verbose fields' but doesn't specify which fields. Should I filter: history, metadata, _internal?",
      "options": [
        "Filter all three: history, metadata, _internal",
        "Filter only what's in discovery doc",
        "Filter based on token impact (fields >100 tokens)"
      ],
      "impact": "Cannot write accurate token reduction test without knowing expected output structure"
    }
  ],
  "handoff": {
    "next_agent": null,
    "context": "Test implementation 40% complete. Need clarification on response filtering fields before proceeding."
  }
}
```
