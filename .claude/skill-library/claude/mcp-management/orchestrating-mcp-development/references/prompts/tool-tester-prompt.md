# MCP Tool Tester Prompt Template

Use this template when dispatching tool-tester subagents in Phase 6 (Test Planning & Implementation).

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

Return immediately with structured JSON - see [tool-tester-examples.md](tool-tester-examples.md) for format

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
   - See [tool-tester-examples.md](tool-tester-examples.md) for all 6 test category patterns
   - Use @claude/testing infrastructure where available
   - Mock MCP client, not the wrapper itself
   - Test behavior, not implementation details

3. **Verify coverage**
   - Run tests: `npm test -- tools/{SERVICE}/{TOOL}`
   - Check coverage: Must be ≥80% line/branch/function
   - Fix gaps before reporting

4. **Self-review before reporting back**
   - See [tool-tester-requirements.md](tool-tester-requirements.md) for complete checklist

## Test Categories (6 required)

Brief overview - see [tool-tester-examples.md](tool-tester-examples.md) for complete code examples:

1. **Input Validation** (≥3 tests) - Test Zod schema rejects invalid inputs
2. **MCP Integration** (≥2 tests) - Test wrapper calls MCP correctly
3. **Response Filtering** (≥2 tests) - Test token reduction meets targets
4. **Security** (≥4 tests) - Test protection against attacks
5. **Edge Cases** (≥4 tests) - Test boundary conditions
6. **Error Handling** (≥3 tests) - Test graceful failures

## References

- [Test Category Examples](tool-tester-examples.md) - All 6 categories with code patterns, mock setup
- [Test Requirements](tool-tester-requirements.md) - Self-review checklist, output format, blocked format

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

## If Blocked

If you cannot complete this task, return blocked status with questions.

See [tool-tester-requirements.md](tool-tester-requirements.md) for blocked format template.
````
