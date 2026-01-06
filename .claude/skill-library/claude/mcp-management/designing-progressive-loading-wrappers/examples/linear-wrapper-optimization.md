# Linear MCP Wrapper Optimization Case Study

Complete implementation example showing before/after optimization of a Linear MCP wrapper.

## Overview

This case study demonstrates the full optimization journey for a Linear API MCP wrapper, reducing token consumption from 146,000 tokens to 1,000 tokens per typical session (99.3% reduction).

## Before: Unoptimized Implementation

### Original Server Setup

```typescript
// ❌ BEFORE: All tools loaded at startup
import { McpServer } from "@modelcontextprotocol/sdk/server";
import { LinearClient } from "@linear/sdk";

const linear = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });

const server = new McpServer({
  name: "linear-mcp",
  version: "1.0.0",
});

// All 50 tools defined inline - 46,000 tokens at startup
server.tool(
  "get-issue",
  "Get a Linear issue by ID",
  {
    issueId: { type: "string", description: "The issue ID (e.g., ENG-123)" },
    includeComments: { type: "boolean", description: "Include all comments" },
    includeAttachments: { type: "boolean", description: "Include attachments" },
    includeHistory: { type: "boolean", description: "Include activity history" },
  },
  async (args) => {
    const issue = await linear.issue(args.issueId);
    // Returns full issue with all nested data
    return issue;
  }
);

server.tool(
  "list-issues",
  "List all issues",
  {
    projectId: { type: "string", description: "Filter by project" },
    assigneeId: { type: "string", description: "Filter by assignee" },
    state: { type: "string", description: "Filter by state" },
  },
  async (args) => {
    const issues = await linear.issues(args);
    // Returns ALL issues - could be 500+
    return issues;
  }
);

// ... 48 more tools defined inline
```

### Original Response: getIssue

```json
{
  "id": "abc123",
  "title": "Fix authentication bug",
  "description": "When users try to login with SSO, they encounter an error message that says 'Invalid credentials' even though their credentials are correct. This happens because the OAuth token validation is checking against the wrong endpoint. We need to update the validation logic to use the new SSO endpoint that was deployed last week. Additionally, we should add better error handling to provide more specific error messages to users. The current error message is too generic and doesn't help users understand what went wrong. We should also consider adding retry logic for transient failures... [continues for 8,000 more characters]",
  "state": {
    "id": "state123",
    "name": "In Progress",
    "color": "#f59e0b",
    "type": "started",
    "position": 2,
    "team": {
      "id": "team123",
      "name": "Engineering",
      "key": "ENG",
      "description": "Core engineering team...",
      "members": [
        {
          "id": "user1",
          "name": "Alice",
          "email": "alice@company.com",
          "displayName": "Alice Smith",
          "avatarUrl": "...",
          "admin": true
        },
        {
          "id": "user2",
          "name": "Bob",
          "email": "bob@company.com",
          "displayName": "Bob Jones",
          "avatarUrl": "...",
          "admin": false
        }
        // ... 20 more team members
      ]
    }
  },
  "project": {
    "id": "proj123",
    "name": "Q1 Security",
    "description": "Security improvements for Q1...",
    "state": "started",
    "lead": {
      /* full user object */
    },
    "members": [
      /* full user objects */
    ],
    "milestones": [
      /* full milestone objects */
    ]
  },
  "labels": [
    {
      "id": "label1",
      "name": "bug",
      "color": "#ef4444",
      "description": "Bug fix",
      "team": {
        /* full team */
      }
    },
    {
      "id": "label2",
      "name": "security",
      "color": "#8b5cf6",
      "description": "Security related",
      "team": {
        /* full team */
      }
    }
  ],
  "comments": [
    {
      "id": "comment1",
      "body": "Full comment text...",
      "user": {
        /* full user object */
      },
      "reactions": [
        /* all reactions */
      ],
      "createdAt": "2024-01-15T10:30:00Z"
    }
    // ... 15 more comments with full data
  ],
  "attachments": [
    /* all attachments */
  ],
  "history": [
    /* full activity history */
  ],
  "subscribers": [
    /* all subscriber user objects */
  ],
  "children": [
    /* all sub-issues, recursively */
  ],
  "parent": {
    /* full parent issue if exists */
  }
}
```

**Token count: 4,800 tokens** for a single issue.

### Original Response: listIssues

```json
{
  "issues": [
    {
      /* full issue object like above */
    },
    {
      /* full issue object like above */
    }
    // ... 490 more full issue objects
  ]
}
```

**Token count: 98,000 tokens** (490 issues × 200 tokens average).

## After: Optimized Implementation

### Progressive Loading Server

```typescript
// ✅ AFTER: Progressive loading with response filtering
import * as fs from "fs";
import * as path from "path";
import { McpServer } from "@modelcontextprotocol/sdk/server";

const TOOLS_DIR = path.join(__dirname, "tools");
const toolFiles = fs.readdirSync(TOOLS_DIR).filter((f) => f.endsWith(".ts"));
const toolCache = new Map();

const server = new McpServer({
  name: "linear-mcp-optimized",
  version: "2.0.0",
});

// Zero tokens at startup - just file names
server.setRequestHandler("tools/list", async () => ({
  tools: toolFiles.map((f) => ({
    name: f.replace(".ts", ""),
    description: `Linear: ${f.replace(".ts", "").replace(/-/g, " ")}`,
  })),
}));

// Load tool only when called
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  if (!toolCache.has(name)) {
    const toolModule = await import(path.join(TOOLS_DIR, `${name}.ts`));
    toolCache.set(name, toolModule.default);
  }

  return toolCache.get(name).execute(args);
});
```

### Optimized Tool: get-issue

```typescript
// tools/get-issue.ts
import { LinearClient } from "@linear/sdk";
import { truncate, estimateTokens } from "../utils/filters";

const linear = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });

export default {
  name: "get-issue",
  description: "Get a Linear issue by ID",
  inputSchema: {
    type: "object",
    properties: {
      issueId: { type: "string", description: "Issue ID (e.g., ENG-123)" },
    },
    required: ["issueId"],
  },

  async execute(args: { issueId: string }) {
    const issue = await linear.issue(args.issueId);

    const filtered = {
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: truncate(issue.description, 500),
      state: issue.state?.name,
      priority: issue.priority,
      priorityLabel: issue.priorityLabel,
      estimate: issue.estimate,
      dueDate: issue.dueDate,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      // ID references only
      projectId: issue.project?.id,
      assigneeId: issue.assignee?.id,
      creatorId: issue.creator?.id,
      labelIds: issue.labels?.nodes?.map((l) => l.id) || [],
      // Counts instead of full data
      commentCount: issue.comments?.nodes?.length || 0,
      attachmentCount: issue.attachments?.nodes?.length || 0,
      childCount: issue.children?.nodes?.length || 0,
    };

    // Fetch full data for baseline comparison
    const baselineTokens = estimateTokens(issue);
    const filteredTokens = estimateTokens(filtered);

    return {
      ...filtered,
      _hints: {
        fullDescription: "Use get-issue-description for complete text",
        comments: "Use list-issue-comments for comments",
        attachments: "Use list-issue-attachments for files",
      },
      tokenEstimate: {
        withoutCustomTool: baselineTokens,
        thisResponse: filteredTokens,
        reduction: `${((1 - filteredTokens / baselineTokens) * 100).toFixed(1)}%`,
      },
    };
  },
};
```

### Optimized Response: get-issue

```json
{
  "id": "abc123",
  "identifier": "ENG-456",
  "title": "Fix authentication bug",
  "description": "When users try to login with SSO, they encounter an error message that says 'Invalid credentials' even though their credentials are correct. This happens because the OAuth token validation is checking against the wrong endpoint. We need to update the validation logic to use the new SSO endpoint that was deployed last week. Additionally, we should add better error handling to... [truncated]",
  "state": "In Progress",
  "priority": 2,
  "priorityLabel": "High",
  "estimate": 3,
  "dueDate": "2024-01-20",
  "createdAt": "2024-01-10T08:00:00Z",
  "updatedAt": "2024-01-15T14:30:00Z",
  "projectId": "proj123",
  "assigneeId": "user1",
  "creatorId": "user2",
  "labelIds": ["label1", "label2"],
  "commentCount": 16,
  "attachmentCount": 3,
  "childCount": 2,
  "_hints": {
    "fullDescription": "Use get-issue-description for complete text",
    "comments": "Use list-issue-comments for comments",
    "attachments": "Use list-issue-attachments for files"
  },
  "tokenEstimate": {
    "withoutCustomTool": 4800,
    "thisResponse": 380,
    "reduction": "92.1%"
  }
}
```

**Token count: 380 tokens** (92.1% reduction).

### Optimized Tool: list-issues

```typescript
// tools/list-issues.ts
export default {
  name: "list-issues",
  description: "List Linear issues with filtering",
  inputSchema: {
    type: "object",
    properties: {
      projectId: { type: "string", description: "Filter by project ID" },
      assigneeId: { type: "string", description: "Filter by assignee ID" },
      state: { type: "string", description: "Filter by state name" },
      limit: { type: "number", description: "Max items (default: 20)" },
      cursor: { type: "string", description: "Pagination cursor" },
    },
  },

  async execute(args) {
    const limit = args.limit || 20;
    const allIssues = await linear.issues({
      filter: {
        project: args.projectId ? { id: { eq: args.projectId } } : undefined,
        assignee: args.assigneeId ? { id: { eq: args.assigneeId } } : undefined,
        state: args.state ? { name: { eq: args.state } } : undefined,
      },
    });

    const nodes = allIssues.nodes || [];
    const filtered = nodes.slice(0, limit).map((issue) => ({
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      state: issue.state?.name,
      priority: issue.priorityLabel,
      assigneeId: issue.assignee?.id,
      updatedAt: issue.updatedAt,
    }));

    const baselineTokens = estimateTokens(nodes);
    const filteredTokens = estimateTokens({ summary: {}, items: filtered });

    return {
      summary: {
        total_count: nodes.length,
        returned_count: filtered.length,
        has_more: nodes.length > limit,
      },
      items: filtered,
      pagination: {
        cursor: allIssues.pageInfo?.endCursor,
      },
      tokenEstimate: {
        withoutCustomTool: baselineTokens,
        thisResponse: filteredTokens,
        reduction: `${((1 - filteredTokens / baselineTokens) * 100).toFixed(1)}%`,
      },
    };
  },
};
```

### Optimized Response: list-issues

```json
{
  "summary": {
    "total_count": 490,
    "returned_count": 20,
    "has_more": true
  },
  "items": [
    {
      "id": "abc123",
      "identifier": "ENG-456",
      "title": "Fix authentication bug",
      "state": "In Progress",
      "priority": "High",
      "assigneeId": "user1",
      "updatedAt": "2024-01-15T14:30:00Z"
    },
    {
      "id": "abc124",
      "identifier": "ENG-457",
      "title": "Add rate limiting",
      "state": "Todo",
      "priority": "Medium",
      "assigneeId": "user2",
      "updatedAt": "2024-01-14T09:15:00Z"
    }
    // ... 18 more items
  ],
  "pagination": {
    "cursor": "WyIyMDI0LTAxLTE1VDE0OjMwOjAwWiIsImFiYzEyMyJd"
  },
  "tokenEstimate": {
    "withoutCustomTool": 98000,
    "thisResponse": 1200,
    "reduction": "98.8%"
  }
}
```

**Token count: 1,200 tokens** (98.8% reduction).

## Summary: Before vs After

| Metric                 | Before  | After | Reduction |
| ---------------------- | ------- | ----- | --------- |
| Session startup tokens | 46,000  | 0     | 100%      |
| get-issue response     | 4,800   | 380   | 92.1%     |
| list-issues response   | 98,000  | 1,200 | 98.8%     |
| Typical session total  | 148,800 | 1,580 | 98.9%     |

## Patterns Applied

1. **Progressive Loading**: File-based tool discovery, lazy loading
2. **Summary + Limited Items**: 20-item default with total_count
3. **Field Truncation**: 500-char max for descriptions
4. **Nested Resource Suppression**: ID references instead of full objects
5. **Token Estimation**: Included in every response

## Additional Tools Created

To support the optimized architecture, these additional tools were created:

- `get-issue-description` - Full issue description text
- `list-issue-comments` - Paginated issue comments
- `list-issue-attachments` - Issue attachments
- `get-project` - Project details (with same optimization)
- `get-user` - User details
- `get-team` - Team details

This decomposition allows the LLM to fetch only the data it needs.

## Related Patterns

- [Progressive Loading Examples](../references/progressive-loading-examples.md)
- [Response Filtering Patterns](../references/response-filtering-patterns.md)
- [Performance Benchmarks](../references/performance-benchmarks.md)
