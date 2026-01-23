---
name: mcp-tools-pyghidra
description: Use when performing binary analysis with Ghidra - reverse engineering, vulnerability detection, decompilation. REQUIRES persistent PyGhidra MCP server. HTTP client only (no direct wrapper imports).
allowed-tools: Bash
skills: []
---

# PyGhidra MCP Tools

Binary reverse engineering and analysis using Ghidra via persistent HTTP server.

**CRITICAL:** PyGhidra requires a persistent server. Do NOT import TypeScript wrappers directly.

---

## Prerequisites

### Step 1: Verify PyGhidra Server is Running

```bash
# Check if server is running
ps aux | grep pyghidra-mcp | grep -v grep

# Verify server status
cat .claude/tools/pyghidra/.server-pid
# Should show: {"url": "http://localhost:8765", "pid": ..., "port": 8765}
```

### Step 2: Start Server if Not Running

```bash
# Navigate to pyghidra directory
cd .claude/tools/pyghidra

# Start persistent PyGhidra MCP server
uvx pyghidra-mcp -t streamable-http -p 8765 --project-path pyghidra_mcp_projects/pyghidra_mcp

# Keep this terminal open - server must stay running
```

**Server startup takes ~30 seconds** (Ghidra JVM initialization)

### Step 3: Verify Server Health

```bash
curl http://localhost:8765/health
# Should return 200 OK
```

---

## Usage (HTTP Client Only)

**All PyGhidra operations use the persistent HTTP client:**

```typescript
import { createPyghidraHTTPClient } from './.claude/tools/config/lib/pyghidra-http-client.js';

const client = createPyghidraHTTPClient({ port: 8765 });

// Check server health
const health = await client.healthCheck();
console.log(`Server healthy: ${health.healthy}, latency: ${health.responseTimeMs}ms`);

// Call any PyGhidra tool
const result = await client.callTool({
  name: 'tool_name',
  arguments: { /* tool-specific params */ }
});
```

**Do NOT import wrappers directly** (`.claude/tools/pyghidra/*.ts` are internal implementation)

---

## Available Tools

Access all tools via `client.callTool({ name: '...', arguments: {...} })`:

### Binary Management

**import_binary** - Import binary into Ghidra project
```typescript
await client.callTool({
  name: 'import_binary',
  arguments: {
    binary_path: '/path/to/binary'  // Absolute path required
  }
});
```

**list_project_binaries** - List all imported binaries
```typescript
await client.callTool({
  name: 'list_project_binaries',
  arguments: {}  // No parameters
});
```

**list_project_binary_metadata** - Get binary metadata
```typescript
await client.callTool({
  name: 'list_project_binary_metadata',
  arguments: {
    binary_name: 'firmware.bin'
  }
});
```

**delete_project_binary** - Remove binary from project
```typescript
await client.callTool({
  name: 'delete_project_binary',
  arguments: {
    binary_name: 'firmware.bin'
  }
});
```

### Function Analysis

**list_exports** - List exported functions
```typescript
await client.callTool({
  name: 'list_exports',
  arguments: {
    binary_name: 'firmware.bin',
    query: '',        // Optional: filter by name
    offset: 0,        // Pagination offset
    limit: 100        // Max results (default: 25)
  }
});
```

**list_imports** - List imported functions
```typescript
await client.callTool({
  name: 'list_imports',
  arguments: {
    binary_name: 'firmware.bin',
    query: '',        // Optional: filter by name
    offset: 0,
    limit: 100
  }
});
```

**list_cross_references** - Find cross-references to function
```typescript
await client.callTool({
  name: 'list_cross_references',
  arguments: {
    binary_name: 'firmware.bin',
    name_or_address: 'strcpy'  // Function name or hex address
  }
});
```

**decompile_function** - Decompile function to C code
```typescript
await client.callTool({
  name: 'decompile_function',
  arguments: {
    binary_name: 'firmware.bin',
    name: 'main'  // Function name or address
  }
});
```

**gen_callgraph** - Generate call graph
```typescript
await client.callTool({
  name: 'gen_callgraph',
  arguments: {
    binary_name: 'firmware.bin',
    function_name: 'main',
    max_depth: 3  // Optional: limit recursion depth
  }
});
```

### Search Operations

**search_strings** - Search for string literals
```typescript
await client.callTool({
  name: 'search_strings',
  arguments: {
    binary_name: 'firmware.bin',
    query: 'password',  // Search term
    limit: 50,
    offset: 0
  }
});
```

**search_code** - Search decompiled code
```typescript
await client.callTool({
  name: 'search_code',
  arguments: {
    binary_name: 'firmware.bin',
    query: 'strcpy',  // Code pattern
    limit: 50
  }
});
```

**search_symbols_by_name** - Search for symbols
```typescript
await client.callTool({
  name: 'search_symbols_by_name',
  arguments: {
    binary_name: 'firmware.bin',
    query: 'strcpy',  // Symbol name pattern
    limit: 20,
    offset: 0
  }
});
```

### Memory Operations

**read_bytes** - Read raw bytes at address
```typescript
await client.callTool({
  name: 'read_bytes',
  arguments: {
    binary_name: 'firmware.bin',
    address: '0x00401000',  // Hex address
    size: 256               // Number of bytes
  }
});
```

---

## Common Workflows

### Workflow 1: Vulnerability Analysis

```typescript
const client = createPyghidraHTTPClient({ port: 8765 });

// 1. Import binary once (persists in server)
await client.callTool({
  name: 'import_binary',
  arguments: { binary_path: '/path/to/firmware.bin' }
});

// 2. Search for dangerous functions
const dangerousFuncs = ['strcpy', 'sprintf', 'gets', 'strcat'];
for (const func of dangerousFuncs) {
  const result = await client.callTool({
    name: 'search_symbols_by_name',
    arguments: { binary_name: 'firmware.bin', query: func }
  });

  if (result.symbols?.length > 0) {
    console.log(`⚠️  Found ${func}: ${result.symbols.length} occurrences`);
  }
}

// 3. Analyze imports for security risks
const imports = await client.callTool({
  name: 'list_imports',
  arguments: { binary_name: 'firmware.bin', limit: 200 }
});

// 4. Search for sensitive strings
const strings = await client.callTool({
  name: 'search_strings',
  arguments: { binary_name: 'firmware.bin', query: 'password', limit: 50 }
});
```

### Workflow 2: Function Analysis

```typescript
// 1. Find function exports
const exports = await client.callTool({
  name: 'list_exports',
  arguments: { binary_name: 'firmware.bin', limit: 100 }
});

// 2. Decompile interesting function
const decompiled = await client.callTool({
  name: 'decompile_function',
  arguments: { binary_name: 'firmware.bin', name: 'authenticate' }
});

// 3. Find all callers
const xrefs = await client.callTool({
  name: 'list_cross_references',
  arguments: { binary_name: 'firmware.bin', name_or_address: 'authenticate' }
});

// 4. Generate call graph
const callgraph = await client.callTool({
  name: 'gen_callgraph',
  arguments: { binary_name: 'firmware.bin', function_name: 'authenticate' }
});
```

---

## Performance Benefits

**Persistent server architecture:**
- ✅ First call: ~3-5 seconds (Ghidra warmup)
- ✅ Subsequent calls: ~50-200ms (100x faster!)
- ✅ Binary stays loaded in memory
- ✅ Analysis results cached

**Why persistent server required:**
- Ghidra JVM takes 3-5 seconds to initialize
- Project data must persist between operations
- Cross-reference analysis requires loaded binary

---

## Troubleshooting

### Server Not Running

**Symptom:** `ECONNREFUSED localhost:8765`

**Fix:**
```bash
cd .claude/tools/pyghidra
uvx pyghidra-mcp -t streamable-http -p 8765 --project-path pyghidra_mcp_projects/pyghidra_mcp
```

### Binary Not Found

**Symptom:** `Binary not found in project`

**Cause:** Binary not imported or server restarted (lost state)

**Fix:** Re-import binary:
```typescript
await client.callTool({
  name: 'import_binary',
  arguments: { binary_path: '/absolute/path/to/binary' }
});
```

### Slow First Call

**Expected:** First call after import takes 3-5 seconds (Ghidra analysis)

**Optional speedup:** Start server with `--wait-for-analysis` flag

### Health Check Fails

**Check server logs:**
```bash
tail -50 .claude/tools/pyghidra/.server.log
```

**Restart server:**
```bash
# Kill old process
kill $(cat .claude/tools/pyghidra/.server-pid | grep -o '"pid":[0-9]*' | cut -d: -f2)

# Start fresh
uvx pyghidra-mcp -t streamable-http -p 8765 --project-path pyghidra_mcp_projects/pyghidra_mcp
```

---

## Architecture Notes

**TypeScript wrappers** (`.claude/tools/pyghidra/*.ts`) are **internal implementation** - they handle MCP protocol communication but should NOT be imported directly.

**Why HTTP-only:**
- Direct wrapper imports spawn new MCP process each call
- Each process initializes new Ghidra JVM (3-5 seconds)
- Binary import doesn't persist between calls
- 100x slower than persistent server

**Correct architecture:**
```
Agent/Script → HTTP Client → Persistent Server → Ghidra JVM (stays loaded)
```

**Incorrect (deprecated):**
```
Agent → Direct wrapper import → New MCP process → New Ghidra JVM (❌ slow, no persistence)
```

---

## Related Documentation

- **Setup Guide:** `.claude/tools/pyghidra/PERSISTENT-CONNECTION-SETUP.md`
- **HTTP Client:** `.claude/tools/config/lib/pyghidra-http-client.ts`
- **Fix History:** `.claude/tools/pyghidra/FIXES.md`
