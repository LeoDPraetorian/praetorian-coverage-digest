# Common Update Patterns

**Code examples for the three most common wrapper update scenarios.**

## Pattern 1: Adding a New Input Field

**Scenario:** Add optional `priority` filter to get-issue wrapper

### RED Phase

```typescript
it("should accept priority parameter", () => {
  expect(() => getIssue.parameters.parse({ id: "TEST-1", priority: 2 })).not.toThrow();
});

it("should validate priority range", () => {
  expect(() => getIssue.parameters.parse({ id: "TEST-1", priority: -1 })).toThrow();
  expect(() => getIssue.parameters.parse({ id: "TEST-1", priority: 5 })).toThrow();
});

it("should filter by priority", async () => {
  mockRequest.mockResolvedValueOnce({
    ok: true,
    data: { data: { issue: { id: "issue-1", priority: { value: 2 } } } },
  });

  const result = await getIssue.execute({ id: "TEST-1", priority: 2 });
  expect(result.priority).toBe(2);
});
```

### GREEN Phase

```typescript
// 1. Update InputSchema
export const getIssueParams = z.object({
  id: z.string().min(1).describe("Issue ID"),
  priority: z.number().min(0).max(4).optional().describe("Priority filter"),
});

// 2. Add validation logic
if (validated.priority !== undefined) {
  const issuePriority = response.issue.priority?.value ?? 0;
  if (issuePriority !== validated.priority) {
    throw new Error(`Priority mismatch: expected ${validated.priority}, got ${issuePriority}`);
  }
}

// 3. Update documentation
/**
 * @param priority - Optional priority filter (0-4)
 */
```

---

## Pattern 2: Changing Response Filtering

**Scenario:** Add `branchName` to output for improved developer workflow

### RED Phase

```typescript
it("should include branchName in output", async () => {
  mockRequest.mockResolvedValueOnce({
    ok: true,
    data: {
      data: {
        issue: {
          id: "issue-1",
          branchName: "feature/test-branch",
        },
      },
    },
  });

  const result = await getIssue.execute({ id: "TEST-1" });
  expect(result).toHaveProperty("branchName");
  expect(result.branchName).toBe("feature/test-branch");
});

it("should handle null branchName", async () => {
  mockRequest.mockResolvedValueOnce({
    ok: true,
    data: { data: { issue: { id: "issue-1", branchName: null } } },
  });

  const result = await getIssue.execute({ id: "TEST-1" });
  expect(result.branchName).toBeUndefined();
});
```

### GREEN Phase

```typescript
// 1. Update GraphQL query (if needed)
const query = `
  query GetIssue($id: String!) {
    issue(id: $id) {
      id
      branchName  // NEW
    }
  }
`;

// 2. Update OutputSchema
export const getIssueOutput = z.object({
  id: z.string(),
  branchName: z.string().optional().describe("Git branch name"),
});

// 3. Update response mapping
function filterResponse(response: ApiResponse): GetIssueOutput {
  return {
    id: response.issue.id,
    branchName: response.issue.branchName ?? undefined, // NEW
  };
}

// 4. Check token count still meets target
// If adding field increases tokens too much, remove lower-priority field
```

---

## Pattern 3: Fixing a Bug

**Scenario:** Wrapper returns priority object instead of value

### RED Phase

```typescript
it("should return priority as number, not object", async () => {
  mockRequest.mockResolvedValueOnce({
    ok: true,
    data: {
      data: {
        issue: {
          id: "issue-1",
          priority: { name: "High", value: 2 }, // API returns object
        },
      },
    },
  });

  const result = await getIssue.execute({ id: "TEST-1" });

  // Bug: Currently returns object, should return number
  expect(typeof result.priority).toBe("number");
  expect(result.priority).toBe(2);
});
```

### GREEN Phase

```typescript
// Before (buggy)
return {
  priority: response.issue.priority, // Returns entire object
};

// After (fixed)
return {
  priority: response.issue.priority?.value ?? undefined, // Extracts value
};
```

---

## Pattern 4: Adding Enum/Literal Types

**Scenario:** Add `state` field with specific allowed values

### RED Phase

```typescript
it("should accept valid state values", () => {
  const validStates = ["open", "in_progress", "closed"];
  validStates.forEach((state) => {
    expect(() => listIssues.parameters.parse({ state })).not.toThrow();
  });
});

it("should reject invalid state values", () => {
  expect(() => listIssues.parameters.parse({ state: "invalid" })).toThrow();
});
```

### GREEN Phase

```typescript
// Use z.enum() for literal types
export const listIssuesParams = z.object({
  state: z.enum(["open", "in_progress", "closed"]).optional().describe("Filter by state"),
});

// Or z.union() for mixed types
status: z.union([z.literal("active"), z.literal("archived"), z.number()]).optional();
```

---

## Pattern 5: Nested Object Extraction

**Scenario:** Extract nested properties safely

### RED Phase

```typescript
it("should safely extract nested assignee name", async () => {
  mockRequest.mockResolvedValueOnce({
    ok: true,
    data: {
      data: {
        issue: {
          id: "issue-1",
          assignee: { name: "John Doe", email: "john@example.com" },
        },
      },
    },
  });

  const result = await getIssue.execute({ id: "TEST-1" });
  expect(result.assigneeName).toBe("John Doe");
});

it("should handle null assignee", async () => {
  mockRequest.mockResolvedValueOnce({
    ok: true,
    data: { data: { issue: { id: "issue-1", assignee: null } } },
  });

  const result = await getIssue.execute({ id: "TEST-1" });
  expect(result.assigneeName).toBeUndefined();
});
```

### GREEN Phase

```typescript
// Use optional chaining
return {
  assigneeName: response.issue.assignee?.name ?? undefined,
  assigneeEmail: response.issue.assignee?.email ?? undefined,
};

// For deeply nested
teamLeadEmail: response.issue.team?.lead?.email ?? undefined;
```

---

## Pattern 6: Array Filtering and Mapping

**Scenario:** Filter and transform array results

### RED Phase

```typescript
it("should filter issues by state", async () => {
  mockRequest.mockResolvedValueOnce({
    ok: true,
    data: {
      data: {
        issues: {
          nodes: [
            { id: "1", state: { name: "In Progress" } },
            { id: "2", state: { name: "Closed" } },
            { id: "3", state: { name: "In Progress" } },
          ],
        },
      },
    },
  });

  const result = await listIssues.execute({ state: "In Progress" });
  expect(result.issues).toHaveLength(2);
  expect(result.issues.every((i) => i.state === "In Progress")).toBe(true);
});
```

### GREEN Phase

```typescript
// Filter and map in one pass
const issues = response.issues.nodes
  .filter((issue) => !validated.state || issue.state.name === validated.state)
  .map((issue) => ({
    id: issue.id,
    state: issue.state.name,
    title: issue.title,
  }));

return { issues };
```

---

## Pattern 7: Backward Compatibility

**Scenario:** Add new field without breaking existing callers

### Strategy

```typescript
// Make new field optional
newField: z.string().optional();

// Provide default behavior when field not specified
if (validated.newField === undefined) {
  // Use existing behavior
} else {
  // Use new behavior with field
}

// Test both code paths
it("should work without new field (backward compat)", async () => {
  const result = await wrapper.execute({ id: "TEST-1" }); // Old API
  expect(result).toBeDefined();
});

it("should work with new field", async () => {
  const result = await wrapper.execute({ id: "TEST-1", newField: "value" });
  expect(result.newField).toBe("value");
});
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Modifying Existing Field Behavior

❌ **Don't:** Change what an existing field does

```typescript
// Before: priority returns full object
priority: response.issue.priority;

// BAD: Change to return only value (breaks callers)
priority: response.issue.priority?.value;
```

✅ **Do:** Add new field, deprecate old one

```typescript
// Keep old field for backward compatibility
priority: response.issue.priority; // @deprecated Use priorityValue
priorityValue: response.issue.priority?.value ?? undefined;
```

### Anti-Pattern 2: Assuming API Structure

❌ **Don't:** Implement without discovery

```typescript
// Assumed API returns string
priority: response.issue.priority; // Actually returns object!
```

✅ **Do:** Run discovery script first

```typescript
// Discovered API returns object with .value property
priority: response.issue.priority?.value ?? undefined;
```

### Anti-Pattern 3: Skipping Edge Case Tests

❌ **Don't:** Test only happy path

```typescript
it("should work", async () => {
  const result = await wrapper.execute({ id: "TEST-1", priority: 2 });
  expect(result.priority).toBe(2);
});
```

✅ **Do:** Test null, undefined, boundaries

```typescript
it("should handle null priority", async () => {
  /* ... */
});
it("should handle missing priority", async () => {
  /* ... */
});
it("should reject invalid priority", () => {
  /* ... */
});
```

---

## Quick Reference

| Update Type           | Files Changed                        | Key Actions                            |
| --------------------- | ------------------------------------ | -------------------------------------- |
| **Add input field**   | wrapper.ts (InputSchema, validation) | Schema + validation + tests            |
| **Change output**     | wrapper.ts (OutputSchema, mapping)   | Schema + mapping + tests + token check |
| **Fix bug**           | wrapper.ts (logic)                   | Test reproducing bug + fix + verify    |
| **Add enum**          | wrapper.ts (InputSchema)             | z.enum() or z.union() + tests          |
| **Nested extraction** | wrapper.ts (mapping)                 | Optional chaining + null coalescing    |
| **Array filtering**   | wrapper.ts (logic)                   | Filter + map + tests                   |

---

## Related References

- [TDD Workflow](tdd-workflow.md) - RED-GREEN-REFACTOR for updates
- [Schema Discovery](schema-discovery.md) - Test API behavior before implementing
- [Regression Prevention](regression-prevention.md) - Maintain backward compatibility
