# Tester Subagent Prompt Template

Use this template when dispatching tester subagents in Phase 10.

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

You MUST invoke these skills during this task. These come from your agent definition Step 1 + Step 2:

### Step 1: Always Invoke First (Non-Negotiable)

1. **using-skills** - Compliance rules, 1% threshold, skill discovery protocol
2. **semantic-code-operations** - Core code tool (Serena MCP) for semantic search and editing
3. **calibrating-time-estimates** - Prevents "no time to read skills" rationalization
4. **enforcing-evidence-based-analysis** - **CRITICAL: Prevents hallucinations** - read source code before writing tests
5. **gateway-testing** - Routes to testing patterns (behavior testing, anti-patterns, mocking)
6. **gateway-frontend** or **gateway-backend** - Routes to domain-specific testing patterns (React/Playwright vs Go/testify)
7. **persisting-agent-outputs** - Defines output directory, file naming, MANIFEST.yaml format
8. **developing-with-tdd** - Write test first, verify it tests the right behavior
9. **verifying-before-completion** - Ensures tests pass before claiming work is done

### Step 2: Task-Specific Skills (Conditional - Invoke Based on Context)

10. **adhering-to-dry** - When there are test duplication concerns or checking existing test patterns
11. **adhering-to-yagni** - When tempted to add "nice to have" test cases beyond the plan
12. **debugging-systematically** - When investigating test failures or flaky tests
13. **tracing-root-causes** - When test failure is deep in call stack and need to trace backward
14. **debugging-strategies** - When dealing with performance issues, intermittent failures, memory leaks in tests
15. **using-todowrite** - When test implementation requires multiple steps (≥2 steps) to complete

**COMPLIANCE**: Document all invoked skills in the output metadata `skills_invoked` array. The orchestrator will verify this list matches the mandatory skills above.

### Step 3: Load Library Skills from Gateways

After invoking the gateways in Step 1, follow their instructions:

**NOTE:** Testers use TWO gateways:
- `gateway-testing` - General testing patterns (behavior testing, anti-patterns, mocking, async handling)
- `gateway-frontend` or `gateway-backend` - Domain-specific testing patterns (React/Playwright vs Go/testify)

**Each gateway provides:**
1. **Mandatory library skills for your role** - Read ALL skills each gateway lists as mandatory for Testers
2. **Task-specific routing** - Use routing tables to find relevant library skills for this test type
3. **Testing patterns and anti-patterns** - Quality guidance for test implementation

**How to load library skills:**
```
Read(".claude/skill-library/path/from/gateway/SKILL.md")
```

**CRITICAL:**
- Library skill paths come FROM the gateways—do NOT hardcode them
- You MUST read the mandatory library skills BOTH gateways specify for your role
- After invoking persisting-agent-outputs, follow its discovery protocol to find/create the feature directory
- YOU MUST WRITE YOUR OUTPUT TO A FILE (not just respond with text)

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

## Test Implementation Pattern (REQUIRED)

Follow this structure for every test file you create.

### Test File Organization

```typescript
// [Component].test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. SETUP SECTION
// Mock dependencies, create test utilities

// 2. HAPPY PATH TESTS
describe('[Component] - Happy Path', () => {
  // Primary use cases
});

// 3. EDGE CASE TESTS
describe('[Component] - Edge Cases', () => {
  // Boundary conditions
});

// 4. ERROR CASE TESTS
describe('[Component] - Error Handling', () => {
  // Failure scenarios
});

// 5. INTEGRATION TESTS (if applicable)
describe('[Component] - Integration', () => {
  // Component interactions
});
```

---

### Test Case Structure

Every test should follow this pattern:

```typescript
it('should [expected behavior] when [condition]', async () => {
  // ARRANGE - Set up test conditions
  const mockData = { ... };
  const onAction = vi.fn();

  // ACT - Perform the action
  render(<Component data={mockData} onAction={onAction} />);
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));

  // ASSERT - Verify the outcome
  expect(onAction).toHaveBeenCalledWith(expectedValue);
  expect(screen.getByText('Success')).toBeInTheDocument();
});
```

---

### Example: Complete Test File

```typescript
// UserProfile.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { UserProfile } from './UserProfile';

// SETUP
const mockUser = {
  id: '123',
  name: 'Test User',
  email: 'test@example.com',
};

// HAPPY PATH
describe('UserProfile - Happy Path', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/users/:id', () => {
        return HttpResponse.json(mockUser);
      })
    );
  });

  it('displays user information when loaded', async () => {
    render(<UserProfile userId="123" />);

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('shows edit button for own profile', async () => {
    render(<UserProfile userId="123" isOwnProfile />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    });
  });
});

// EDGE CASES
describe('UserProfile - Edge Cases', () => {
  it('handles missing email gracefully', async () => {
    server.use(
      http.get('/api/users/:id', () => {
        return HttpResponse.json({ ...mockUser, email: null });
      })
    );

    render(<UserProfile userId="123" />);

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
    expect(screen.getByText('No email provided')).toBeInTheDocument();
  });

  it('handles very long names with truncation', async () => {
    const longName = 'A'.repeat(100);
    server.use(
      http.get('/api/users/:id', () => {
        return HttpResponse.json({ ...mockUser, name: longName });
      })
    );

    render(<UserProfile userId="123" />);

    await waitFor(() => {
      const nameElement = screen.getByTestId('user-name');
      expect(nameElement).toHaveClass('truncate');
    });
  });
});

// ERROR CASES
describe('UserProfile - Error Handling', () => {
  it('shows error message when user not found', async () => {
    server.use(
      http.get('/api/users/:id', () => {
        return new HttpResponse(null, { status: 404 });
      })
    );

    render(<UserProfile userId="999" />);

    await waitFor(() => {
      expect(screen.getByText(/user not found/i)).toBeInTheDocument();
    });
  });

  it('shows retry button on server error', async () => {
    server.use(
      http.get('/api/users/:id', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    render(<UserProfile userId="123" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  it('retries successfully after error', async () => {
    let callCount = 0;
    server.use(
      http.get('/api/users/:id', () => {
        callCount++;
        if (callCount === 1) {
          return new HttpResponse(null, { status: 500 });
        }
        return HttpResponse.json(mockUser);
      })
    );

    render(<UserProfile userId="123" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });
});
```

---

### Common Testing Patterns

**Async Data Loading**:
```typescript
it('shows loading state then data', async () => {
  render(<Component />);

  // Loading state
  expect(screen.getByTestId('loading')).toBeInTheDocument();

  // Data loaded
  await waitFor(() => {
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
  });
  expect(screen.getByText('Data')).toBeInTheDocument();
});
```

**Form Submission**:
```typescript
it('submits form with valid data', async () => {
  const onSubmit = vi.fn();
  render(<Form onSubmit={onSubmit} />);

  await userEvent.type(screen.getByLabelText(/name/i), 'Test');
  await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));

  expect(onSubmit).toHaveBeenCalledWith({
    name: 'Test',
    email: 'test@example.com',
  });
});
```

**Conditional Rendering**:
```typescript
it('shows admin controls for admin users', () => {
  render(<Dashboard user={{ role: 'admin' }} />);
  expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
});

it('hides admin controls for regular users', () => {
  render(<Dashboard user={{ role: 'user' }} />);
  expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
});
```

---

**CRITICAL**: Every test must have clear Arrange/Act/Assert sections. Every test must test ONE behavior. Test names must describe the expected behavior.

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
    "using-skills",
    "semantic-code-operations",
    "calibrating-time-estimates",
    "enforcing-evidence-based-analysis",
    "gateway-testing",
    "gateway-frontend",
    "persisting-agent-outputs",
    "developing-with-tdd",
    "verifying-before-completion",
    "adhering-to-dry",
    "adhering-to-yagni",
    "debugging-systematically",
    "tracing-root-causes",
    "debugging-strategies",
    "using-todowrite"
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
