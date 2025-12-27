# Linear MCP Wrappers

Custom tools that wrap Linear MCP server for **99% token reduction**.

## Architecture

```
Direct MCP (Old Pattern):
├── Session start: 46,000 tokens loaded
├── When used: Same 46,000 tokens
└── Total: 46,000 tokens always

MCP Wrappers (New Pattern):
├── Session start: 0 tokens (filesystem discovery)
├── When used: 500-1000 tokens per tool
└── Total: ~1000 tokens per tool used
```

## Token Reduction: 46,000 → 0 (99%)

## Installation

```bash
cd .claude/tools/linear
npm install
```

## Configuration

### 1. Add Linear MCP to .mcp.json

Already configured in shared client:

```json
{
  "linear-mcp": {
    "command": "npx",
    "args": ["-y", "mcp-remote", "https://mcp.linear.app/sse"]
  }
}
```

### 2. Authorize Linear OAuth

The Linear MCP uses OAuth via `mcp-remote`. First time setup:

```bash
npx mcp-remote https://mcp.linear.app/sse
```

This will:

1. Open browser for Linear OAuth
2. Store credentials securely via mcp-remote
3. No manual credentials.json configuration needed

## Usage

### Basic Examples

```typescript
import { listIssues, getIssue, createIssue } from "./.claude/tools/linear";

// List my issues
const myIssues = await listIssues.execute({ assignee: "me" });

// Get specific issue
const issue = await getIssue.execute({ id: "CHARIOT-1366" });

// Create new issue
const result = await createIssue.execute({
  title: "Fix authentication bug",
  team: "Engineering",
  assignee: "me",
  priority: 1,
});
```

### Available Tools

#### Issue Operations

- `listIssues` - List issues with filters (assignee, team, state, etc.)
- `getIssue` - Get detailed issue information
- `createIssue` - Create new issue
- `updateIssue` - Update existing issue

#### Project Operations

- `listProjects` - List projects with filters
- `getProject` - Get detailed project information
- `createProject` - Create new project
- `updateProject` - Update existing project

#### Team Operations

- `listTeams` - List all teams
- `getTeam` - Get team details

#### User Operations

- `listUsers` - List workspace users

#### Comment Operations

- `listComments` - List issue comments
- `createComment` - Create comment on issue

## Testing

```bash
npm test
```

This will verify:

1. Linear MCP connection
2. OAuth credentials
3. Basic operations (teams, users, issues, projects)
4. Token reduction metrics

## Migration from GraphQL API

**Old Pattern** (Direct GraphQL):

```typescript
// Located in .claude/tools/linear-graphql-archive/
import { executeLinearQuery } from "./lib/linear-client";

const result = await executeLinearQuery(
  `
  query GetIssue($id: String!) {
    issue(id: $id) { ... }
  }
`,
  { id }
);
```

**New Pattern** (MCP Wrappers):

```typescript
// Located in .claude/tools/linear/
import { getIssue } from "./.claude/tools/linear";

const issue = await getIssue.execute({ id: "CHARIOT-1366" });
```

## Shared MCP Client

All Linear wrappers use the shared MCP client:

```typescript
import { callMCPTool } from "../config/lib/mcp-client";

// Independent MCP connection (no Claude Code runtime dependency)
const rawData = await callMCPTool(
  "linear",
  "mcp__plugin_chariot-development-platform_linear__list_issues",
  { assignee: "me" }
);
```

## Benefits

1. **99% Token Reduction**: 46,000 → 0 tokens at session start
2. **Independent Connections**: No Claude Code runtime dependency
3. **Type Safety**: Zod validation for inputs and outputs
4. **Token Efficiency**: Filtered responses, truncated descriptions
5. **Consistent API**: Same pattern across all MCP wrappers
6. **OAuth Authentication**: Secure via mcp-remote (no manual API keys)

## Troubleshooting

### "MCP server 'linear' not configured"

Update `.claude/tools/config/lib/mcp-client.ts` to include Linear configuration.

### "OAuth not authorized"

Run OAuth flow:

```bash
npx mcp-remote https://mcp.linear.app/sse
```

### "Issue not found"

The Linear MCP accepts both:

- Human-readable identifiers: `CHARIOT-1366`
- UUIDs: `eee0788c-9b67-4b3c-8a08-c9cd4224403e`

## Architecture Details

### Zod Validation

All inputs and outputs are validated:

```typescript
const listIssuesParams = z.object({
  assignee: z.string().optional(),
  team: z.string().optional(),
  limit: z.number().min(1).max(250).default(50),
});
```

### Token Optimization

Responses are filtered to essential fields:

```typescript
// Truncate descriptions for token efficiency
description: issue.description?.substring(0, 200);

// Filter nested objects to minimal fields
assignee: issue.assignee
  ? {
      id: issue.assignee.id,
      name: issue.assignee.name,
      email: issue.assignee.email,
    }
  : undefined;
```

### Error Handling

```typescript
try {
  const issue = await getIssue.execute({ id: "CHARIOT-1366" });
} catch (error) {
  // Detailed error with context
  console.error(error.message);
}
```

## Related

- **Shared MCP Client**: `.claude/tools/config/lib/mcp-client.ts`
- **Credentials**: OAuth via mcp-remote (no manual configuration)
- **Old Implementation**: `.claude/tools/linear-graphql-archive/`
