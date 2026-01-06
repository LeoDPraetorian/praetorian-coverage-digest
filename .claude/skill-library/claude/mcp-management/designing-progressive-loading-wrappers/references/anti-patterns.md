# Anti-Patterns

Common mistakes when building MCP wrappers and API SDK wrappers that lead to excessive token consumption.

## Anti-Pattern 1: Eager Tool Loading

### The Problem

Loading all tool definitions at session startup consumes 40,000-70,000 tokens before any tool is used.

### Why It Happens

- Default MCP SDK patterns load tools eagerly
- "Simpler" to define everything upfront
- Copied from examples that don't consider token optimization

### Bad Example

```typescript
// ❌ All 50 tools loaded at startup = 46,000 tokens
const server = new McpServer({
  name: "linear-mcp",
  tools: {
    getIssue: {
      description: "Get an issue by ID",
      inputSchema: {
        type: "object",
        properties: {
          issueId: { type: "string", description: "..." },
          includeComments: { type: "boolean" },
          includeAttachments: { type: "boolean" },
          // Full schema for every tool
        },
      },
      handler: async (args) => {
        /* ... */
      },
    },
    listIssues: {
      /* another full definition */
    },
    createIssue: {
      /* another full definition */
    },
    // ... 47 more tools
  },
});
```

### Good Example

```typescript
// ✅ Zero tokens at startup
const toolFiles = fs.readdirSync(TOOLS_DIR);

server.setRequestHandler("tools/list", async () => ({
  tools: toolFiles.map((f) => ({
    name: f.replace(".ts", ""),
    description: `Tool: ${f.replace(".ts", "")}`,
  })),
}));

server.setRequestHandler("tools/call", async (request) => {
  const tool = await import(`${TOOLS_DIR}/${request.params.name}.ts`);
  return tool.default.execute(request.params.arguments);
});
```

---

## Anti-Pattern 2: Unfiltered Collection Returns

### The Problem

Returning entire collections (500+ items) when user typically needs 10-20.

### Why It Happens

- "Let Claude decide what's relevant"
- "Easier to return everything"
- "User might need all of them"

### Bad Example

```typescript
// ❌ Returns 500 issues × 200 tokens = 100,000 tokens
async function listIssues() {
  const issues = await linearClient.issues();
  return issues; // All 500+ issues, full data
}
```

### Good Example

```typescript
// ✅ Returns summary + 20 items = 1,000 tokens
async function listIssues(args: { limit?: number } = {}) {
  const limit = args.limit || 20;
  const allIssues = await linearClient.issues();

  return {
    summary: {
      total_count: allIssues.length,
      returned_count: Math.min(limit, allIssues.length),
      has_more: allIssues.length > limit,
    },
    items: allIssues.slice(0, limit),
  };
}
```

---

## Anti-Pattern 3: Full Text Fields

### The Problem

Returning 10,000+ character descriptions/bodies when summaries suffice.

### Why It Happens

- "What if Claude needs the full text?"
- "Don't want to lose information"
- Truncation logic seems complex

### Bad Example

```typescript
// ❌ 10,000 char description = 2,500 tokens per issue
async function getIssue(id: string) {
  const issue = await linearClient.issue(id);
  return {
    id: issue.id,
    title: issue.title,
    description: issue.description, // Full 10K chars
    body: issue.body, // Another 5K chars
  };
}
```

### Good Example

```typescript
// ✅ 500 char description = 125 tokens per issue
async function getIssue(id: string) {
  const issue = await linearClient.issue(id);
  return {
    id: issue.id,
    title: issue.title,
    description: truncate(issue.description, 500),
    description_truncated: issue.description?.length > 500,
    // Provide explicit tool for full content
    _hint: "Use getIssueFullDescription for complete text",
  };
}

// Separate tool for full content when actually needed
async function getIssueFullDescription(id: string) {
  const issue = await linearClient.issue(id);
  return { description: issue.description };
}
```

---

## Anti-Pattern 4: Deep Nested Resources

### The Problem

Graph APIs returning 10 levels of nested relationships consume 5,000+ tokens per item.

### Why It Happens

- "Convenience - everything in one response"
- GraphQL makes it easy to request everything
- "Avoid multiple round trips"

### Bad Example

```typescript
// ❌ Issue + all relationships = 5,000 tokens
async function getIssue(id: string) {
  return await linearClient.issue(id, {
    include: {
      project: {
        include: {
          team: true,
          lead: true,
          members: true,
        },
      },
      labels: true,
      comments: {
        include: {
          user: true,
          reactions: true,
        },
      },
      attachments: true,
      parent: true,
      children: true,
      subscribers: true,
    },
  });
}
```

### Good Example

```typescript
// ✅ Issue only = 200 tokens
async function getIssue(id: string) {
  const issue = await linearClient.issue(id);
  return {
    id: issue.id,
    title: issue.title,
    description: truncate(issue.description, 500),
    state: issue.state?.name,
    priority: issue.priority,
    // IDs only for relationships
    projectId: issue.project?.id,
    assigneeId: issue.assignee?.id,
    labelIds: issue.labels?.map((l) => l.id),
  };
}

// Separate tools for relationships
async function getIssueComments(issueId: string) { ... }
async function getIssueLabels(issueId: string) { ... }
async function getIssueProject(issueId: string) { ... }
```

---

## Anti-Pattern 5: No Token Visibility

### The Problem

No way to measure if optimization is working or identify hot spots.

### Why It Happens

- "Token estimation is too complex"
- "Not worth the effort"
- "We'll optimize later"

### Bad Example

```typescript
// ❌ No visibility into token usage
async function listIssues() {
  const issues = await linearClient.issues();
  return issues.slice(0, 20);
}
```

### Good Example

```typescript
// ✅ Token estimation included
async function listIssues(args: { limit?: number } = {}) {
  const limit = args.limit || 20;
  const allIssues = await linearClient.issues();
  const filtered = allIssues.slice(0, limit);

  const response = {
    summary: { total_count: allIssues.length, returned_count: filtered.length },
    items: filtered,
  };

  return {
    ...response,
    tokenEstimate: {
      withoutFiltering: estimateTokens(allIssues),
      thisResponse: estimateTokens(response),
      reduction: `${((1 - estimateTokens(response) / estimateTokens(allIssues)) * 100).toFixed(1)}%`,
    },
  };
}
```

---

## Anti-Pattern 6: Monolithic Response Objects

### The Problem

Single tool returns everything instead of composable smaller tools.

### Why It Happens

- "One tool is simpler than many"
- "Reduce number of tool calls"
- Over-optimization for round trips

### Bad Example

```typescript
// ❌ One massive tool that returns everything
async function getProjectDashboard(projectId: string) {
  return {
    project: await getProject(projectId),
    issues: await listAllIssues(projectId), // 500 issues
    members: await listAllMembers(projectId), // 50 members
    cycles: await listAllCycles(projectId), // 20 cycles
    labels: await listAllLabels(projectId), // 30 labels
    // 50,000+ tokens
  };
}
```

### Good Example

```typescript
// ✅ Composable tools, load what's needed
async function getProject(projectId: string) { ... }
async function listProjectIssues(projectId: string, { limit = 20 }) { ... }
async function listProjectMembers(projectId: string, { limit = 20 }) { ... }
async function listProjectCycles(projectId: string, { limit = 10 }) { ... }

// User composes what they need:
// "Get project ENG overview" → getProject
// "Show recent issues" → listProjectIssues
// "Who's on the team?" → listProjectMembers
```

---

## Quick Reference: Anti-Pattern Detection

| Symptom                           | Likely Anti-Pattern    | Fix                      |
| --------------------------------- | ---------------------- | ------------------------ |
| Slow session startup              | Eager tool loading     | Progressive loading      |
| 50,000+ tokens for list calls     | Unfiltered collections | Summary + Limited Items  |
| 2,000+ tokens per individual item | Full text fields       | Truncation + full tool   |
| 5,000+ tokens for single item     | Deep nested resources  | ID-only + separate tools |
| No idea where tokens are going    | No visibility          | Token estimation         |
| One tool does everything          | Monolithic responses   | Composable tools         |

## Related Patterns

- [Progressive Loading Examples](progressive-loading-examples.md) - Fix eager loading
- [Response Filtering Patterns](response-filtering-patterns.md) - Fix collection returns
- [Token Estimation](token-estimation.md) - Add visibility
