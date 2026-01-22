# Phase 3: Tool Discovery

Discover ALL tools in the MCP and perform schema discovery for each.

**Step 1: List all available tools**

Call the MCP to get its tool list. Most MCPs provide this via `list_tools` or similar.

```typescript
// Example: Get all tools from MCP
const tools = await callMCPTool("{service}", "list_tools", {});
// Returns: ['get-issue', 'list-issues', 'create-issue', 'update-issue', ...]
```

**Step 2: Confirm tool selection**

```typescript
AskUserQuestion({
  questions: [
    {
      header: "Tool Selection",
      question: "Found {N} tools in {service} MCP. Which tools should be wrapped?",
      multiSelect: false,
      options: [
        { label: "All tools (Recommended)", description: "100% coverage - wrap all {N} tools" },
        { label: "Select specific tools", description: "Choose which tools to wrap" },
      ],
    },
  ],
});
```

**Default:** ALL tools (100% coverage)

**Step 3: Schema discovery for EACH tool**

For each selected tool, perform comprehensive schema discovery to understand behavior before wrapper design.

For complete schema discovery methodology, see [schema-discovery.md](../schema-discovery.md).

**Quick process:**

```
For each tool in selected_tools:
  1. Call the tool with sample inputs
  2. Document input schema (required fields, types, constraints)
  3. Document output schema (response structure, field types)
  4. Measure token count (raw vs filtered)
  5. Document error scenarios
  6. Save to: .claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{service}/tools/{tool}/schema-discovery.md
```

**Step 4: Create tools manifest**

Save `tools-manifest.json`:

```json
{
  "service": "{service}",
  "discovered_at": "2025-01-02T...",
  "total_tools": 15,
  "selected_tools": 15,
  "tools": [
    { "name": "get-issue", "description": "Get issue by ID", "schema_complete": true },
    { "name": "list-issues", "description": "List issues", "schema_complete": true }
  ]
}
```

Update `MANIFEST.yaml`:

```json
{
  "tools_discovered": 15,
  "tools_selected": 15,
  "tools": ["get-issue", "list-issues", "create-issue"],
  "phases": {
    "tool_discovery": { "status": "complete", "tools_found": 15 },
    "per_tool": {
      "get-issue": { "schema_discovery": "complete" },
      "list-issues": { "schema_discovery": "complete" }
    }
  }
}
```

**Output:**

- `tools-manifest.json`
- `tools/{tool}/schema-discovery.md` for each tool
