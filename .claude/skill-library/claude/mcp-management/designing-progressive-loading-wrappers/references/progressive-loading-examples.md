# Progressive Loading Examples

Complete implementation examples for progressive loading patterns in MCP wrappers and API SDK wrappers.

## Basic Progressive Loading Structure

### Directory-Based Tool Discovery

```typescript
// src/server.ts
import * as fs from "fs";
import * as path from "path";
import { McpServer } from "@modelcontextprotocol/sdk/server";

const TOOLS_DIR = path.join(__dirname, "tools");

// Zero tokens at startup - only filesystem metadata
const toolFiles = fs.readdirSync(TOOLS_DIR).filter((f) => f.endsWith(".ts"));

const server = new McpServer({
  name: "progressive-wrapper",
  version: "1.0.0",
});

// Tool definitions loaded lazily
const toolCache = new Map<string, any>();

async function loadTool(toolName: string) {
  if (toolCache.has(toolName)) {
    return toolCache.get(toolName);
  }

  const toolPath = path.join(TOOLS_DIR, `${toolName}.ts`);
  if (!fs.existsSync(toolPath)) {
    throw new Error(`Tool not found: ${toolName}`);
  }

  const toolModule = await import(toolPath);
  toolCache.set(toolName, toolModule.default);
  return toolModule.default;
}

// List tools returns names only - no definitions loaded
server.setRequestHandler("tools/list", async () => {
  return {
    tools: toolFiles.map((f) => ({
      name: f.replace(".ts", ""),
      // Minimal description - full schema loaded on invoke
      description: `Tool: ${f.replace(".ts", "")}`,
    })),
  };
});

// Full tool loaded only when invoked
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;
  const tool = await loadTool(name);
  return tool.execute(args);
});
```

### Tool File Structure

```typescript
// tools/get-issue.ts
import { LinearClient } from "@linear/sdk";

interface GetIssueArgs {
  issueId: string;
  includeComments?: boolean;
}

export default {
  name: "get-issue",
  description: "Retrieve a Linear issue by ID",
  inputSchema: {
    type: "object",
    properties: {
      issueId: { type: "string", description: "The issue ID" },
      includeComments: {
        type: "boolean",
        description: "Include comments (default: false)",
      },
    },
    required: ["issueId"],
  },

  async execute(args: GetIssueArgs) {
    const client = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });
    const issue = await client.issue(args.issueId);

    // Apply response filtering
    return {
      id: issue.id,
      title: issue.title,
      description: truncate(issue.description, 500),
      state: issue.state?.name,
      priority: issue.priority,
      // Comments loaded separately if requested
      comments: args.includeComments ? await loadComments(issue.id) : undefined,
    };
  },
};

function truncate(text: string | undefined, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "... [truncated]";
}
```

## Advanced: Manifest-Based Discovery

For larger tool sets (50+ tools), use a manifest file instead of filesystem scanning:

```typescript
// tools/manifest.json
{
  "tools": [
    {
      "name": "get-issue",
      "category": "issues",
      "description": "Retrieve a Linear issue by ID"
    },
    {
      "name": "list-issues",
      "category": "issues",
      "description": "List issues with filtering"
    },
    {
      "name": "create-issue",
      "category": "issues",
      "description": "Create a new issue"
    }
    // 50+ more tools...
  ],
  "categories": ["issues", "projects", "teams", "users", "cycles"]
}
```

```typescript
// src/server.ts
import manifest from "./tools/manifest.json";

// Zero tokens at startup - manifest is tiny
server.setRequestHandler("tools/list", async () => {
  return {
    tools: manifest.tools.map((t) => ({
      name: t.name,
      description: t.description,
      // Schema NOT included - loaded on demand
    })),
  };
});
```

## Lazy Schema Loading

Load full JSON schemas only when needed:

```typescript
// tools/schemas/get-issue.schema.json
{
  "type": "object",
  "properties": {
    "issueId": {
      "type": "string",
      "description": "The Linear issue ID (e.g., 'ENG-123')"
    },
    "includeComments": {
      "type": "boolean",
      "default": false,
      "description": "Whether to include issue comments in the response"
    },
    "includeAttachments": {
      "type": "boolean",
      "default": false,
      "description": "Whether to include file attachments"
    }
  },
  "required": ["issueId"],
  "additionalProperties": false
}
```

```typescript
// Load schema only when tool details requested
server.setRequestHandler("tools/get", async (request) => {
  const { name } = request.params;

  // Load schema file on demand
  const schemaPath = path.join(__dirname, "tools/schemas", `${name}.schema.json`);
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));

  return {
    name,
    description: manifest.tools.find((t) => t.name === name)?.description,
    inputSchema: schema,
  };
});
```

## Token Impact Comparison

| Approach               | Startup Tokens | Per-Tool Invocation | 50 Tools Total  |
| ---------------------- | -------------- | ------------------- | --------------- |
| Eager (all at startup) | 46,000         | 0                   | 46,000          |
| Progressive (manifest) | 500            | 200                 | 500 + (N × 200) |
| Progressive (lazy)     | 0              | 400                 | N × 400         |

**Best practice**: Use manifest-based discovery for 20+ tools, lazy loading for <20 tools.

## Integration with Existing MCP Servers

When wrapping an existing MCP server that loads eagerly:

```typescript
// wrapper.ts - Intercept and filter
import { Client } from "@modelcontextprotocol/sdk/client";

const rawClient = new Client({
  name: "raw-linear-mcp",
  version: "1.0.0",
});

// Cache tool list but NOT definitions
let toolNames: string[] | null = null;

export async function listTools() {
  if (!toolNames) {
    const result = await rawClient.request({ method: "tools/list" }, {});
    // Store only names, discard full definitions
    toolNames = result.tools.map((t: any) => t.name);
  }
  return toolNames.map((name) => ({ name, description: `Tool: ${name}` }));
}

export async function callTool(name: string, args: any) {
  // Full tool loaded only here
  const result = await rawClient.request(
    { method: "tools/call", params: { name, arguments: args } },
    {}
  );
  // Apply response filtering before returning
  return filterResponse(result);
}
```

## Related Patterns

- [Response Filtering Patterns](response-filtering-patterns.md) - Filter tool outputs
- [Token Estimation](token-estimation.md) - Measure optimization impact
- [Anti-Patterns](anti-patterns.md) - What to avoid
