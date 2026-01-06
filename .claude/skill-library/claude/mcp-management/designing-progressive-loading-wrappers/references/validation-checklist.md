# Validation Checklist

Complete validation criteria for progressive loading wrapper implementations.

## Pre-Deployment Checklist

### 1. Progressive Loading Validation

- [ ] **Zero startup tokens**: Session initialization loads no tool definitions
- [ ] **Lazy discovery implemented**: Tool list returns names/minimal descriptions only
- [ ] **On-demand loading works**: Full tool schema loaded only when invoked
- [ ] **Cache implemented**: Loaded tools cached to avoid re-loading

**Verification command:**

```bash
# Start server and check initial memory/context
# Tool list should be < 1000 tokens
```

**Test scenario:**

```typescript
// 1. Initialize server
const server = await startServer();

// 2. Check tool list response
const tools = await server.listTools();
const listTokens = estimateTokens(tools);
assert(listTokens < 1000, `Tool list too large: ${listTokens} tokens`);

// 3. Invoke a tool
const result = await server.callTool("get-issue", { issueId: "ENG-123" });
// Only now should full tool be loaded
```

### 2. Response Filtering Validation

- [ ] **Collections limited**: All list endpoints return max N items (default: 20)
- [ ] **Summary included**: total_count, returned_count, has_more present
- [ ] **Pagination supported**: cursor or offset/limit parameters work
- [ ] **Default limits reasonable**: Match item size to token budget

**Verification:**

```typescript
// List endpoint should return summary
const issues = await server.callTool("list-issues", {});
assert(issues.summary, "Missing summary");
assert(issues.summary.total_count >= 0, "Missing total_count");
assert(issues.summary.returned_count <= 20, "Exceeded default limit");
assert(issues.items.length === issues.summary.returned_count, "Count mismatch");
```

### 3. Text Field Truncation Validation

- [ ] **Large fields truncated**: Fields > 500 chars truncated with suffix
- [ ] **Truncation indicator**: `_truncated` or similar metadata present
- [ ] **Full content available**: Separate tool/endpoint for complete text
- [ ] **Truncation preserves meaning**: Word boundaries respected

**Verification:**

```typescript
// Get item with large description
const issue = await server.callTool("get-issue", { issueId: "ENG-123" });

if (issue.description && issue.description.length >= 500) {
  assert(issue.description.endsWith("... [truncated]"), "Missing truncation suffix");
  assert(issue._truncated?.includes("description"), "Missing truncation metadata");
}

// Full content should be available via separate tool
const full = await server.callTool("get-issue-description", { issueId: "ENG-123" });
assert(full.description.length > 500, "Full description not returned");
```

### 4. Nested Resource Suppression Validation

- [ ] **Nested objects replaced**: Complex objects replaced with ID references
- [ ] **Relationship tools exist**: Separate tools for accessing relationships
- [ ] **No deep nesting**: Max 1 level of nesting in responses
- [ ] **ID references consistent**: All suppressed relationships have IDs

**Verification:**

```typescript
const issue = await server.callTool("get-issue", { issueId: "ENG-123" });

// Should have ID references, not full objects
assert(typeof issue.projectId === "string", "Project should be ID only");
assert(typeof issue.assigneeId === "string", "Assignee should be ID only");
assert(Array.isArray(issue.labelIds), "Labels should be ID array");

// Full objects should NOT be present
assert(!issue.project?.name, "Project object should not include name");
assert(!issue.assignee?.email, "Assignee object should not include email");
```

### 5. Token Estimation Validation

- [ ] **Estimation included**: tokenEstimate object in responses
- [ ] **Baseline calculated**: withoutCustomTool shows unoptimized size
- [ ] **Reduction accurate**: Percentage reduction correctly calculated
- [ ] **Estimation reasonable**: Actual vs estimated within 20%

**Verification:**

```typescript
const issues = await server.callTool("list-issues", {});

assert(issues.tokenEstimate, "Missing token estimate");
assert(issues.tokenEstimate.withoutCustomTool > 0, "Missing baseline");
assert(issues.tokenEstimate.thisResponse > 0, "Missing current estimate");
assert(issues.tokenEstimate.reduction, "Missing reduction percentage");

// Verify reduction makes sense
const actualTokens = estimateTokens(issues);
const reportedTokens = issues.tokenEstimate.thisResponse;
const variance = Math.abs(actualTokens - reportedTokens) / reportedTokens;
assert(variance < 0.2, `Token estimate variance too high: ${variance}`);
```

## Token Budget Verification

### Startup Budget

| Metric             | Target | Maximum |
| ------------------ | ------ | ------- |
| Tool list response | < 500  | 1,000   |
| Per-tool schema    | < 200  | 500     |
| Total at startup   | 0      | 0       |

### Per-Call Budget

| Endpoint Type   | Target  | Maximum |
| --------------- | ------- | ------- |
| Get single item | < 500   | 1,000   |
| List (default)  | < 2,000 | 5,000   |
| Search results  | < 2,000 | 5,000   |
| Bulk operations | < 5,000 | 10,000  |

## Integration Test Scenarios

### Scenario 1: Fresh Session

```typescript
test("fresh session has zero startup tokens", async () => {
  const server = await startServer();
  // No tools should be loaded yet
  expect(server.loadedToolCount).toBe(0);
});
```

### Scenario 2: Tool Discovery

```typescript
test("tool list is minimal", async () => {
  const tools = await server.listTools();
  const tokens = estimateTokens(tools);
  expect(tokens).toBeLessThan(1000);
});
```

### Scenario 3: Large Collection

```typescript
test("large collection is filtered", async () => {
  // Seed: 500 issues exist
  const result = await server.callTool("list-issues", {});

  expect(result.summary.total_count).toBe(500);
  expect(result.summary.returned_count).toBe(20);
  expect(result.items.length).toBe(20);
  expect(estimateTokens(result)).toBeLessThan(2000);
});
```

### Scenario 4: Large Text Field

```typescript
test("large description is truncated", async () => {
  // Seed: issue with 10,000 char description
  const result = await server.callTool("get-issue", { issueId: "ENG-123" });

  expect(result.description.length).toBeLessThanOrEqual(520); // 500 + suffix
  expect(result.description).toContain("[truncated]");
});
```

### Scenario 5: Nested Resources

```typescript
test("nested resources are suppressed", async () => {
  const result = await server.callTool("get-issue", { issueId: "ENG-123" });

  // Should have IDs only
  expect(typeof result.projectId).toBe("string");
  expect(result.project).toBeUndefined();

  // Should NOT have nested objects
  expect(result.assignee?.email).toBeUndefined();
});
```

## Documentation Checklist

- [ ] **README updated**: Filtering behavior documented
- [ ] **Limits documented**: Default limits for all list endpoints
- [ ] **Truncation documented**: Which fields truncated, how to get full content
- [ ] **Relationships documented**: How to access suppressed relationships
- [ ] **Token estimates documented**: Expected token usage per endpoint

## Performance Benchmarks to Verify

After implementing, verify these benchmarks:

| Metric                  | Before  | After   | Target Reduction |
| ----------------------- | ------- | ------- | ---------------- |
| Session startup tokens  | 46,000  | 0       | 100%             |
| List endpoint (default) | 100,000 | < 2,000 | > 95%            |
| Get single item         | 5,000   | < 500   | > 90%            |
| Search results          | 50,000  | < 2,000 | > 95%            |

## Sign-Off

Before deployment:

- [ ] All checklist items verified
- [ ] Integration tests passing
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Code reviewed

## Related Patterns

- [Architecture Decision Tree](architecture-decision-tree.md) - Pattern selection
- [Token Estimation](token-estimation.md) - Measurement techniques
- [Performance Benchmarks](performance-benchmarks.md) - Real-world data
