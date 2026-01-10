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
