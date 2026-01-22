# Output Formats Examples

This document shows example outputs for the listing-tools skill.

---

## Standard Aligned Table Output

```
=== MCP TOOLS ===

chariot          - Intelligent TypeScript wrappers for Chariot Graph Database MCP tools
chrome-devtools  - TypeScript wrappers for chrome-devtools MCP tools with progressive loading
config           - Shared configuration utilities for all MCP wrappers
context7         - POC demonstrating progressive loading pattern with library/API documentation
currents         - TypeScript wrappers for Currents test analytics platform
linear           - Custom tools that wrap Linear MCP server for project management
perplexity       - Custom TypeScript wrappers for Perplexity AI (web search, research, reasoning)
praetorian-cli   - Progressive loading wrappers for the praetorian-cli MCP server

TOTAL: 8 tool services
```

---

## Filtered Output (Excluding Config)

```
=== MCP TOOLS ===

chariot          - Intelligent TypeScript wrappers for Chariot Graph Database MCP tools
chrome-devtools  - TypeScript wrappers for chrome-devtools MCP tools with progressive loading
context7         - POC demonstrating progressive loading pattern with library/API documentation
currents         - TypeScript wrappers for Currents test analytics platform
linear           - Custom tools that wrap Linear MCP server for project management
perplexity       - Custom TypeScript wrappers for Perplexity AI (web search, research, reasoning)
praetorian-cli   - Progressive loading wrappers for the praetorian-cli MCP server

TOTAL: 7 tool services (excluding config)
```

---

## JSON Output Format

```json
{
  "tools": [
    {
      "name": "chariot",
      "description": "Intelligent TypeScript wrappers for Chariot Graph Database MCP tools"
    },
    {
      "name": "chrome-devtools",
      "description": "TypeScript wrappers for chrome-devtools MCP tools with progressive loading"
    },
    {
      "name": "config",
      "description": "Shared configuration utilities for all MCP wrappers"
    },
    {
      "name": "context7",
      "description": "POC demonstrating progressive loading pattern with library/API documentation"
    },
    {
      "name": "currents",
      "description": "TypeScript wrappers for Currents test analytics platform"
    },
    {
      "name": "linear",
      "description": "Custom tools that wrap Linear MCP server for project management"
    },
    {
      "name": "perplexity",
      "description": "Custom TypeScript wrappers for Perplexity AI (web search, research, reasoning)"
    },
    {
      "name": "praetorian-cli",
      "description": "Progressive loading wrappers for the praetorian-cli MCP server"
    }
  ],
  "total": 8
}
```

**Command to generate:**

```bash
echo '{"tools":['
for dir in .claude/tools/*/; do
  name=$(basename "$dir")
  desc=$(jq -r '.description // "No description"' "$dir/package.json" 2>/dev/null || echo "No package.json")
  echo "  {\"name\": \"$name\", \"description\": \"$desc\"},"
done | sed '$ s/,$//'
echo '], "total": '$(ls -d .claude/tools/*/ | wc -l)'}'
```

---

## Error Handling Examples

### Missing package.json

```
=== MCP TOOLS ===

chariot          - Intelligent TypeScript wrappers for Chariot Graph Database MCP tools
chrome-devtools  - TypeScript wrappers for chrome-devtools MCP tools with progressive loading
example-service  - No package.json
context7         - POC demonstrating progressive loading pattern with library/API documentation

TOTAL: 4 tool services (1 missing package.json)
```

### Missing Description Field

```
=== MCP TOOLS ===

chariot          - Intelligent TypeScript wrappers for Chariot Graph Database MCP tools
new-service      - No description
context7         - POC demonstrating progressive loading pattern with library/API documentation

TOTAL: 3 tool services
```

### Invalid JSON in package.json

```
=== MCP TOOLS ===

chariot          - Intelligent TypeScript wrappers for Chariot Graph Database MCP tools
broken-service   - Invalid JSON
context7         - POC demonstrating progressive loading pattern with library/API documentation

TOTAL: 3 tool services (1 with invalid JSON)
```

---

## Compact One-Line Per Service

```
chariot: Intelligent TypeScript wrappers for Chariot Graph Database MCP tools
chrome-devtools: TypeScript wrappers for chrome-devtools MCP tools with progressive loading
config: Shared configuration utilities for all MCP wrappers
context7: POC demonstrating progressive loading pattern with library/API documentation
currents: TypeScript wrappers for Currents test analytics platform
linear: Custom tools that wrap Linear MCP server for project management
perplexity: Custom TypeScript wrappers for Perplexity AI (web search, research, reasoning)
praetorian-cli: Progressive loading wrappers for the praetorian-cli MCP server
```

**Command:**

```bash
for dir in .claude/tools/*/; do
  name=$(basename "$dir")
  desc=$(jq -r '.description // "No description"' "$dir/package.json" 2>/dev/null || echo "No package.json")
  echo "$name: $desc"
done
```

---

## With Service Status Indicators

```
=== MCP TOOLS ===

✅ chariot          - Intelligent TypeScript wrappers for Chariot Graph Database MCP tools
✅ chrome-devtools  - TypeScript wrappers for chrome-devtools MCP tools with progressive loading
⚙️  config           - Shared configuration utilities for all MCP wrappers
🚧 context7         - POC demonstrating progressive loading pattern with library/API documentation
✅ currents         - TypeScript wrappers for Currents test analytics platform
✅ linear           - Custom tools that wrap Linear MCP server for project management
✅ perplexity       - Custom TypeScript wrappers for Perplexity AI (web search, research, reasoning)
⚠️  praetorian-cli   - Progressive loading wrappers for the praetorian-cli MCP server

TOTAL: 8 tool services
✅ Production: 5 | 🚧 POC: 1 | ⚙️  Utilities: 1 | ⚠️  Partial: 1
```

**Status determination logic:**

- Check for README badge or status field in package.json
- Look for "POC" or "WIP" keywords
- Check for "config" or "shared" in name (utilities)
- Check wrapper count vs total tools (partial implementation)
