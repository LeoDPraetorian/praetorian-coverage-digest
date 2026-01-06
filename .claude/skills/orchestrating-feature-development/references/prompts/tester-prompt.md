# Tester Subagent Prompt Template

Use this template when dispatching tester subagents in Phase 8.

## Usage

Spawn all three test modes in parallel in a SINGLE message:

```typescript
// All three in ONE message for parallel execution
Task({
  subagent_type: "frontend-tester",
  description: "Unit tests for [feature]",
  prompt: `[Use template with TEST_MODE=unit]`,
});
Task({
  subagent_type: "frontend-tester",
  description: "Integration tests for [feature]",
  prompt: `[Use template with TEST_MODE=integration]`,
});
Task({
  subagent_type: "frontend-tester",
  description: "E2E tests for [feature]",
  prompt: `[Use template with TEST_MODE=e2e]`,
});
```

## Template

````markdown
You are writing [TEST_MODE] tests for: [FEATURE_NAME]

## Test Mode

**MODE:** [unit | integration | e2e]

- **Unit**: Test individual functions/components in isolation
- **Integration**: Test component interactions with mocked services (MSW)
- **E2E**: Test full user workflows in browser (Playwright)

## Test Plan Requirements

[PASTE the relevant section from test-plan.md for this test mode]

## Implementation Context

[PASTE relevant parts of implementation-log.md]

## Output Directory

OUTPUT_DIRECTORY: [FEATURE_DIR]

Write your test summary to: [FEATURE_DIR]/test-summary-[TEST_MODE].md

## MANDATORY SKILLS (invoke ALL before completing)

You MUST use these skills during this task:

1. **developing-with-tdd** - Write test, verify it tests the right behavior
2. **verifying-before-completion** - Run tests and verify they pass
3. **persisting-agent-outputs** - Use for output file format and metadata

## Test Requirements from Plan

Follow the test plan EXACTLY. Do not add tests not in the plan.
Do not skip tests that are in the plan.

### Required Tests for [TEST_MODE]

[PASTE specific test requirements from test-plan.md]

## Test Writing Guidelines

### Unit Tests

```typescript
// Test behavior, not implementation
describe("AssetFilter", () => {
  it("filters assets by status when status filter applied", () => {
    // Arrange
    const assets = [
      /* test data */
    ];

    // Act
    const result = filterAssets(assets, { status: "active" });

    // Assert
    expect(result).toHaveLength(2);
    expect(result.every((a) => a.status === "active")).toBe(true);
  });
});
```
````

### Integration Tests (MSW)

```typescript
// Test API interactions with mocked responses
describe('AssetList integration', () => {
  it('displays assets from API', async () => {
    // MSW handler returns test data
    server.use(
      http.get('/api/assets', () => HttpResponse.json(testAssets))
    );

    render(<AssetList />);

    await waitFor(() => {
      expect(screen.getByText('Asset 1')).toBeInTheDocument();
    });
  });
});
```

### E2E Tests (Playwright)

```typescript
// Test full user workflows
test("user can filter assets by status", async ({ page }) => {
  await page.goto("/assets");

  // Select filter
  await page.getByRole("combobox", { name: "Status" }).click();
  await page.getByRole("option", { name: "Active" }).click();

  // Verify filtered results
  await expect(page.getByTestId("asset-row")).toHaveCount(5);
});
```

## Anti-Patterns to Avoid

- ❌ Testing implementation details (internal state, private methods)
- ❌ Flaky tests depending on timing
- ❌ Tests that pass when they shouldn't (false positives)
- ❌ Mocking the thing you're testing
- ❌ Tests without assertions
- ❌ Copy-paste tests without understanding

## Test Summary Document Structure

```markdown
# [TEST_MODE] Test Summary: [Feature]

## Overview

- Tests written: X
- Tests passing: X
- Coverage: X% (if applicable)

## Tests Implemented

| Test      | Description      | Status |
| --------- | ---------------- | ------ |
| test name | what it verifies | ✓ Pass |

## Test Files Created

- path/to/test1.test.ts
- path/to/test2.test.ts

## Coverage Report (if applicable)

[Coverage summary or link]

## Notes

[Any issues, edge cases, or considerations]
```

## Output Format

```json
{
  "agent": "frontend-tester",
  "output_type": "test-implementation",
  "test_mode": "[unit|integration|e2e]",
  "feature_directory": "[FEATURE_DIR]",
  "skills_invoked": [
    "developing-with-tdd",
    "verifying-before-completion",
    "persisting-agent-outputs"
  ],
  "status": "complete",
  "tests_written": 8,
  "tests_passing": 8,
  "coverage_percent": 85,
  "files_created": ["path/to/tests"],
  "handoff": {
    "next_agent": "test-lead",
    "context": "[TEST_MODE] tests complete, X/X passing"
  }
}
```

## If Blocked

If you cannot complete the tests as specified:

```json
{
  "agent": "frontend-tester",
  "status": "blocked",
  "blocked_reason": "test_failures|missing_requirements|out_of_scope",
  "attempted": ["What you tried"],
  "handoff": {
    "next_agent": null,
    "context": "Specific blocker for orchestrator"
  }
}
```

```

```
