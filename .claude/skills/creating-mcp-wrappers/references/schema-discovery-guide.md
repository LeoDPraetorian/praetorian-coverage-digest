# Schema Discovery Guide

## Why Schema Discovery Matters

MCP tools have dynamic schemas. You must explore them to:
- Identify required vs optional fields
- Understand response structures
- Plan token reduction strategies
- Design appropriate test cases

---

## Automated MCP Setup

### Step 0: Determine MCP Package Name

**Ask user**:
```
What MCP service are you creating a wrapper for?

Examples:
- linear
- context7
- praetorian-cli
- github
```

**Auto-detect package name**:
```bash
# Most MCP servers follow convention:
SERVICE="linear"
MCP_PACKAGE="@modelcontextprotocol/server-${SERVICE}"

# Verify package exists:
npm view ${MCP_PACKAGE} version 2>/dev/null || echo "Package not found"
```

**Common MCP packages**:
| Service | Package Name |
|---------|-------------|
| linear | `@modelcontextprotocol/server-linear` |
| github | `@modelcontextprotocol/server-github` |
| gitlab | `@modelcontextprotocol/server-gitlab` |
| google-drive | `@modelcontextprotocol/server-google-drive` |
| slack | `@modelcontextprotocol/server-slack` |

**For custom MCPs**: Ask user for full package name or GitHub URL.

---

## The Discovery Process

### Step 1: Auto-Install and Start MCP Server

**Installation** (automatic via npx):
```bash
# npx auto-downloads on first run - no manual install needed
npx -y @modelcontextprotocol/server-{service} --version
# Output: @modelcontextprotocol/server-linear@0.1.0
```

**Start server in background**:
```bash
# Start MCP server, redirect logs, capture PID
npx -y @modelcontextprotocol/server-{service} > /tmp/mcp-{service}.log 2>&1 &
MCP_PID=$!

echo "✅ MCP server started (PID: $MCP_PID)"
echo "📋 Logs: /tmp/mcp-{service}.log"

# Give server time to initialize
sleep 2
```

**Verify server is running**:
```bash
# Check process exists
if ps -p $MCP_PID > /dev/null; then
  echo "✅ MCP server running"
else
  echo "❌ MCP server failed to start"
  cat /tmp/mcp-{service}.log
  exit 1
fi
```

**Credential detection**:
```bash
# Check if server logs show credential errors
if grep -i "authentication\|credential\|api.*key" /tmp/mcp-{service}.log; then
  echo "⚠️  MCP requires credentials"
  echo "   Check service documentation for setup:"
  echo "   - Linear: OAuth token or API key"
  echo "   - GitHub: Personal access token"
  echo "   - Context7: API key from context7.ai"

  # Guide user through credential setup
  # (Service-specific instructions)
fi
```

### Step 2: Connect Client

```javascript
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

const transport = new StdioClientTransport({
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-{service}']
});

const client = new Client(
  { name: 'explorer', version: '1.0.0' },
  { capabilities: {} }
);

await client.connect(transport);
```

### Step 3: List Available Tools

**Single tool mode**:
```javascript
const tools = await client.listTools();
console.log(JSON.stringify(tools, null, 2));

// Output:
// {
//   tools: [
//     { name: 'get_issue', description: '...', inputSchema: {...} },
//     { name: 'create_issue', description: '...', inputSchema: {...} },
//     ...
//   ]
// }
```

**Batch mode (ALL tools)**:
```javascript
const tools = await client.listTools();

console.log(`Found ${tools.tools.length} tools in ${service} MCP:`);
tools.tools.forEach((tool, i) => {
  console.log(`${i + 1}. ${tool.name} - ${tool.description}`);
});

// Process each tool
for (const tool of tools.tools) {
  console.log(`\n━━━ Processing: ${tool.name} ━━━`);

  // Explore this tool (Step 4)
  // Document findings (Step 5-6)
  // Generate tests (Phase 2)
  // Run through TDD cycle (Phases 3-6)
}

console.log(`\n✅ Batch complete: ${tools.tools.length} wrappers created`);
```

**Batch mode workflow**:
1. Start MCP server ONCE
2. List ALL tools
3. For EACH tool:
   - Explore with 3+ test cases
   - Document discovery
   - Generate tests
   - Run verify-red
   - Generate wrapper
   - Implement
   - Run verify-green
   - Run audit
4. Stop MCP server ONCE (after all tools)
5. Generate service skill with ALL tools

**Efficiency**: One MCP session for all tools (vs starting/stopping for each)

### Step 4: Call Tool with Test Inputs

**Test Case 1: Happy Path**
```javascript
const result = await client.callTool({
  name: '{tool}',
  arguments: { /* valid input */ }
});

console.log(JSON.stringify(result, null, 2));
console.log('Token count:', JSON.stringify(result).length);
```

**Test Case 2: Edge Case**
```javascript
const result = await client.callTool({
  name: '{tool}',
  arguments: { field: '' } // Empty string
});
// What happens? Error? Empty response?
```

**Test Case 3: Error Case**
```javascript
try {
  const result = await client.callTool({
    name: '{tool}',
    arguments: { field: 'INVALID' }
  });
} catch (error) {
  console.log('Error:', error.message);
}
```

### Step 5: Analyze Responses

For each response, document:

| Aspect | What to Capture |
|--------|----------------|
| **Required fields** | Fields present in ALL responses |
| **Optional fields** | Fields present in SOME responses |
| **Nested structures** | Objects within objects |
| **Array types** | Homogeneous or heterogeneous? |
| **Token counts** | `JSON.stringify(response).length` |

### Step 6: Plan Token Reduction

**Original response**: 2,500 tokens
**Target response**: 500 tokens (80% reduction)

**Strategy**:
- **Include**: `id`, `title`, `status`, `assignee` (essential)
- **Exclude**: `metadata`, `history`, `_internal` (verbose)

**Verification**:
- Calculate: `includedFields.length / totalFields.length`
- Should be < 20% of fields for 80% token reduction

### Step 7: Cleanup (Stop MCP Server)

**After exploration is complete**, stop the MCP server:

```bash
# Kill the MCP server process
kill $MCP_PID

# Verify it stopped
sleep 1
if ps -p $MCP_PID > /dev/null 2>&1; then
  echo "⚠️  MCP still running, forcing stop"
  kill -9 $MCP_PID
else
  echo "✅ MCP server stopped"
fi

# Clean up log file (optional)
rm /tmp/mcp-{service}.log
```

**Why cleanup matters**:
- Frees system resources
- Prevents orphaned processes
- Ensures clean state for next exploration

**Verification**:
```bash
# Confirm process is gone
ps -p $MCP_PID
# Should output: "no such process"
```

---

## Complete Automated Workflow

**Full script example** (linear service):

```bash
#!/bin/bash
set -e

SERVICE="linear"
MCP_PACKAGE="@modelcontextprotocol/server-${SERVICE}"

# 1. Auto-install (npx handles this)
echo "📦 Installing MCP server..."
npx -y ${MCP_PACKAGE} --version

# 2. Start server in background
echo "🚀 Starting MCP server..."
npx -y ${MCP_PACKAGE} > /tmp/mcp-${SERVICE}.log 2>&1 &
MCP_PID=$!
sleep 2

# 3. Verify running
if ! ps -p $MCP_PID > /dev/null; then
  echo "❌ MCP failed to start"
  cat /tmp/mcp-${SERVICE}.log
  exit 1
fi
echo "✅ MCP server running (PID: $MCP_PID)"

# 4. Check for credential errors
if grep -i "authentication\|credential" /tmp/mcp-${SERVICE}.log 2>/dev/null; then
  echo "⚠️  MCP requires credentials - check logs"
fi

# 5. Explore MCP (your exploration script here)
echo "🔍 Exploring MCP tools..."
# ... exploration code ...

# 6. Cleanup
echo "🧹 Stopping MCP server..."
kill $MCP_PID
rm /tmp/mcp-${SERVICE}.log
echo "✅ Cleanup complete"
```

**Usage in creating-mcp-wrappers skill**:
- Claude runs these commands via Bash tool
- Captures MCP_PID for cleanup
- Handles errors automatically
- No manual user intervention needed

---

## Common Patterns

### Pattern 1: Pagination

If MCP tool returns paginated results:
```javascript
// Discover pagination params
const page1 = await client.callTool({
  name: 'list_issues',
  arguments: { limit: 10, offset: 0 }
});

const page2 = await client.callTool({
  name: 'list_issues',
  arguments: { limit: 10, offset: 10 }
});

// Document: How does pagination work? Cursor? Offset?
```

### Pattern 2: Optional Expansion

If MCP tool has "expand" parameters:
```javascript
// Minimal response
const minimal = await client.callTool({
  name: 'get_issue',
  arguments: { issueId: 'ENG-1234' }
});

// Expanded response
const expanded = await client.callTool({
  name: 'get_issue',
  arguments: { issueId: 'ENG-1234', expand: ['comments', 'history'] }
});

// Document: What fields are added by expansion?
```

---

## Documentation Template

Use this template for discovery docs:

```markdown
# {Tool} Schema Discovery

**Date**: 2025-12-11
**MCP Server**: {service}
**Tool**: {tool}
**Discovery Method**: Interactive exploration

## Input Schema

### Required Parameters
| Parameter | Type | Validation | Description | Example |
|-----------|------|------------|-------------|---------|
| issueId | string | min length 1 | Linear issue identifier | ENG-1234 |

### Optional Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| includeComments | boolean | false | Include issue comments |

## Output Schema

### Always Present
| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| title | string | Issue title |
| status | string | Current state |

### Conditionally Present
| Field | Type | Condition | Description |
|-------|------|-----------|-------------|
| assignee | string | If assigned | Assignee name |
| comments | array | If includeComments=true | Issue comments |

## Test Cases

### Case 1: Happy Path
**Input**: `{ issueId: "ENG-1234" }`
**Output**:
```json
{
  "id": "abc-123",
  "title": "Fix login bug",
  "state": { "name": "In Progress" },
  "priority": 1,
  "assignee": { "name": "Alice" }
}
```
**Tokens**: ~2,347 tokens
**Result**: Success

### Case 2: Edge Case (Empty String)
**Input**: `{ issueId: "" }`
**Output**: `{ error: "Invalid input" }`
**Result**: Validation error

### Case 3: Invalid Input
**Input**: `{ issueId: "NONEXISTENT" }`
**Output**: `{ error: "Issue not found" }`
**Result**: Not found error

## Token Reduction Strategy

**Original Response Size**: ~2,500 tokens
**Target Response Size**: ~500 tokens
**Reduction**: 80%

**Fields to Include** (essential for agents):
- `id` - Unique identifier
- `title` - Human-readable name
- `status` - Current state
- `priority` - Importance level
- `assignee` - Owner (if present)

**Fields to Exclude** (verbose, not needed):
- `metadata` - Internal system data (500 tokens)
- `history` - Full change log (1000 tokens)
- `_internal` - Debug information (500 tokens)
- `createdAt`, `updatedAt` - Timestamps (not essential)

**Estimated Token Savings**: ~2,000 tokens (80%)

## Security Considerations

**Input Validation Required**:
- Path traversal: Block `../` sequences
- Command injection: Block shell metacharacters (`;`, `|`, `&`, etc.)
- XSS: Sanitize string outputs

**Response Sanitization Required**:
- Remove internal identifiers
- Redact sensitive fields (if any)
```

---

## Example: Linear get_issue Discovery

```markdown
# get_issue Schema Discovery

**Date**: 2025-12-11
**MCP Server**: linear
**Tool**: get_issue

## Input Schema

### Required Parameters
| Parameter | Type | Validation | Description | Example |
|-----------|------|------------|-------------|---------|
| issueId | string | min 1 char | Linear issue ID | ENG-1234 |

### Optional Parameters
None discovered

## Output Schema

### Always Present
| Field | Type | Description |
|-------|------|-------------|
| id | string | Issue UUID |
| title | string | Issue title |
| state.name | string | Status (In Progress, Done, etc.) |
| priority | number | Priority 0-4 |

### Conditionally Present
| Field | Type | Condition | Description |
|-------|------|-----------|-------------|
| assignee.name | string | If assigned | Assignee display name |

## Test Cases

### Case 1: Valid Issue
**Input**: `{ issueId: "ENG-1234" }`
**Output**: Full response with 15 fields
**Tokens**: 2,347
**Result**: Success

### Case 2: Empty ID
**Input**: `{ issueId: "" }`
**Output**: `{ error: "Invalid issue ID" }`
**Result**: Validation error

### Case 3: Non-existent Issue
**Input**: `{ issueId: "FAKE-999" }`
**Output**: `{ error: "Issue not found" }`
**Result**: Not found

## Token Reduction Strategy

**Original**: 2,347 tokens (15 fields)
**Target**: 450 tokens (5 fields)
**Reduction**: 81%

**Include**: id, title, status, priority, assignee
**Exclude**: metadata (500t), history (1000t), _internal (500t), timestamps
```

---

## Troubleshooting Automated Setup

### MCP Server Won't Start

**Symptoms**: Process starts but immediately exits

**Check logs**:
```bash
cat /tmp/mcp-{service}.log
```

**Common causes**:
1. **Missing credentials**: MCP requires API key/token
   - Solution: Configure credentials per service documentation
   - Linear: OAuth token in `~/.mcp-auth/linear.json`
   - GitHub: PAT in environment or config file

2. **Port conflict**: Another process using MCP's port
   - Solution: Kill conflicting process or use different port

3. **Dependency missing**: MCP has unmet system requirements
   - Solution: Check MCP documentation for prerequisites

### Connection Fails

**Symptoms**: Client can't connect to running server

**Debug**:
```bash
# Verify server is actually running
ps -p $MCP_PID

# Check if server is listening
lsof -i -P | grep node

# Try manual connection test
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  npx -y @modelcontextprotocol/server-{service}
```

**Solution**: Check server initialization time (may need longer sleep)

### Tool Not Found

**Symptoms**: Server starts, but tool doesn't exist

**Check**:
```bash
# List all available tools
npx tsx -e "(async () => {
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');

  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-{service}']
  });

  const client = new Client({ name: 'explorer', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);
  const tools = await client.listTools();
  console.log(JSON.stringify(tools, null, 2));
  await client.close();
})();"
```

**Solution**: Verify tool name matches what's in server's tool list

### Cleanup Fails

**Symptoms**: MCP process won't die

**Force kill**:
```bash
kill -9 $MCP_PID

# Or kill all node processes running MCP
pkill -f "@modelcontextprotocol/server-{service}"
```

### Custom MCP Package Names

**Symptoms**: Standard naming convention doesn't work

**Ask user for exact package name**:
```
What's the exact npm package name for this MCP server?

Examples:
- @modelcontextprotocol/server-custom-name
- @company/mcp-server
- custom-mcp-package
```

Then use provided name instead of auto-detected name.
```
