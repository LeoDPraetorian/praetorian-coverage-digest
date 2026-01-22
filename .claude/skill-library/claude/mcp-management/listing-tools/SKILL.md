---
name: listing-tools
description: Use when viewing all available MCP tool services - lists services from .claude/tools/ with descriptions from package.json
allowed-tools: Bash, Glob, Read, TodoWrite
---

# Listing MCP Tools

**Simple listing of all MCP tool services with descriptions.**

---

## What This Skill Does

Lists all MCP tool services with:

- ✅ Service name
- ✅ Description (from package.json)
- ✅ Total count

**NOT included:**

- Individual wrappers within services (use Read tool on specific service)
- Token savings metrics (use service README)
- Detailed features (use service documentation)

---

## When to Use

- Getting overview of available MCP tool services
- Discovering what tools exist before using them
- Quick reference when user asks "what MCP tools are available?"

**NOT for:**

- Listing individual tool wrappers (read service directory)
- Managing tool wrappers (use `managing-tool-wrappers` skill)
- Creating new tools (use `tool-manager` command)

---

## Quick List Command

**Fast TypeScript utility (~2-3s vs ~90s with bash):**

```bash
npx tsx .claude/skill-library/claude/mcp-management/listing-tools/scripts/src/list-tools.ts
```

**JSON output for programmatic use:**

```bash
npx tsx .claude/skill-library/claude/mcp-management/listing-tools/scripts/src/list-tools.ts --json
```

**Legacy bash approach (slower, for reference):**

```bash
for dir in .claude/tools/*/; do
  name=$(basename "$dir")
  desc=$(jq -r '.description // "No description"' "$dir/package.json" 2>/dev/null || echo "No package.json")
  printf "%-16s - %s\n" "$name" "$desc"
done
```

---

## Step 0: Navigate to Repository Root (MANDATORY)

**Execute BEFORE any list operation:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"
```

**⚠️ If tool directory not found:** You are in the wrong directory. Navigate to repo root first.

**Cannot proceed without navigating to repo root** ✅

---

## Workflow

### Step 1: Discover Tool Service Directories

```bash
# List all directories in .claude/tools/
ls -d .claude/tools/*/
```

**Expected output:**

```
.claude/tools/chariot/
.claude/tools/chrome-devtools/
.claude/tools/config/
.claude/tools/context7/
.claude/tools/currents/
.claude/tools/linear/
.claude/tools/perplexity/
.claude/tools/praetorian-cli/
```

**Note:** `config/` is shared utilities, not a user-facing service.

---

### Step 2: Extract Descriptions from package.json

For each service directory, read `package.json` and extract the `description` field:

```bash
# Single service
jq -r '.description // "No description"' .claude/tools/{service-name}/package.json

# All services (loop)
for dir in .claude/tools/*/; do
  service=$(basename "$dir")
  desc=$(jq -r '.description // "No description"' "$dir/package.json" 2>/dev/null || echo "No package.json")
  echo "$service: $desc"
done
```

**Fallback handling:**

- Missing package.json → "No package.json"
- Missing description field → "No description"

---

### Step 3: Format Output

**Aligned table format (service name padded to 16 characters):**

```bash
for dir in .claude/tools/*/; do
  name=$(basename "$dir")
  desc=$(jq -r '.description // "No description"' "$dir/package.json" 2>/dev/null || echo "No package.json")
  printf "%-16s - %s\n" "$name" "$desc"
done
```

**Example output:**

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

### Step 4: Count Total Services

```bash
# Count directories (excluding config if desired)
ls -d .claude/tools/*/ | wc -l

# Or with filtering
find .claude/tools -mindepth 1 -maxdepth 1 -type d ! -name config | wc -l
```

---

## Filters

### Exclude Shared Utilities

The `config/` directory contains shared utilities, not a user-facing service. Optionally exclude it:

```bash
for dir in .claude/tools/*/; do
  name=$(basename "$dir")
  # Skip config directory
  [[ "$name" == "config" ]] && continue

  desc=$(jq -r '.description // "No description"' "$dir/package.json" 2>/dev/null || echo "No package.json")
  printf "%-16s - %s\n" "$name" "$desc"
done
```

---

## Error Handling

### Missing package.json

Some directories might not have package.json:

```bash
if [[ ! -f "$dir/package.json" ]]; then
  echo "No package.json"
  continue
fi
```

### Invalid JSON

Use `2>/dev/null` to suppress jq errors:

```bash
jq -r '.description // "No description"' "$dir/package.json" 2>/dev/null || echo "Invalid JSON"
```

---

## Integration

### Called By

- `managing-tool-wrappers` skill (for 'list' operation)
- Users asking "what MCP tools are available?"
- Discovery phase when creating new tool wrappers

### Requires (invoke before starting)

None - standalone skill

### Calls (during execution)

None - terminal skill

### Pairs With (conditional)

| Skill                    | Trigger                     | Purpose                  |
| ------------------------ | --------------------------- | ------------------------ |
| `managing-tool-wrappers` | After listing tools         | Manage specific wrappers |
| `searching-skills`       | Finding tool-related skills | Discover related skills  |
| `tool-manager` (command) | Creating new tool wrappers  | Tool development         |

---

## Related Skills

- `managing-tool-wrappers` - Create, update, audit, fix tool wrappers
- `listing-skills` - Similar pattern for listing skills
- `searching-skills` - Find skills by keyword

---

## Examples

See [examples/output-formats.md](examples/output-formats.md) for:

- Formatted table output
- JSON output format
- Filtered output (excluding config)
- Error handling examples

---

## Changelog

See [.history/CHANGELOG](.history/CHANGELOG) for version history.
