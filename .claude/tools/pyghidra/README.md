# PyGhidra MCP Wrappers

Custom tools that wrap PyGhidra MCP server for binary analysis with **token-optimized responses**.

## Architecture

```
PyGhidra MCP Wrappers:
├── HTTP persistent connection (100x faster than stdio)
├── Token-optimized responses (filter redundant fields)
├── Zod validation for all inputs
└── Server-side pagination
```

## Server Management

```bash
cd .claude/tools/pyghidra

# Start server
./start-server.sh

# Check status
./server-status.sh

# Stop server
./stop-server.sh

# Restart server
./restart-server.sh
```

## Available Tools

### Binary Management

| Tool | Description |
|------|-------------|
| `import_binary` | Import and analyze a binary file |
| `list_project_binaries` | List all binaries in project |
| `delete_project_binary` | Remove a binary from project |
| `list_project_binary_metadata` | Get binary metadata |

### Symbol Analysis

| Tool | Description |
|------|-------------|
| `list_exports` | List exported symbols |
| `list_imports` | List imported functions |
| `search_symbols_by_name` | Search symbols by name |

### Code Analysis

| Tool | Description |
|------|-------------|
| `decompile_function` | Decompile a function to C code |
| `search_code` | Search decompiled code |
| `search_strings` | Search string literals |
| `list_cross_references` | Find cross-references to symbol |
| `gen_callgraph` | Generate call graph from function |
| `read_bytes` | Read raw bytes at address |

## Parameter Reference

### Search Tools: Use `query`, NOT `pattern`

**Critical**: All search tools use `query` as the search parameter name.

```typescript
// ✅ CORRECT
await callMCPTool('pyghidra', 'search_symbols_by_name', {
  binary_name: '/binary-hash',
  query: 'malloc',        // ✓ Use 'query'
  limit: 25,
  offset: 0
});

await callMCPTool('pyghidra', 'search_strings', {
  binary_name: '/binary-hash',
  query: 'password',      // ✓ Use 'query'
  limit: 100,
  offset: 0
});

await callMCPTool('pyghidra', 'search_code', {
  binary_name: '/binary-hash',
  query: 'system',        // ✓ Use 'query'
});

// ❌ WRONG - 'pattern' is NOT a valid parameter
await callMCPTool('pyghidra', 'search_symbols_by_name', {
  binary_name: '/binary-hash',
  pattern: 'malloc',      // ✗ Will fail: "query: Field required"
});
```

### Common Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `binary_name` | string | Binary identifier (from `list_project_binaries`) |
| `query` | string | Search term for search tools |
| `limit` | number | Max results to return |
| `offset` | number | Pagination offset |
| `name_or_address` | string | Function name or hex address |

### gen_callgraph Parameters

**Important**: Use `function_name` (NOT `function_name_or_address`) and lowercase direction values.

```typescript
// ✅ CORRECT
await callMCPTool('pyghidra', 'gen_callgraph', {
  binary_name: '/firmware-abc123',
  function_name: 'main',           // ✓ Use 'function_name'
  direction: 'calling',            // ✓ Lowercase: 'calling' or 'called'
  max_depth: 3
});

// ❌ WRONG
await callMCPTool('pyghidra', 'gen_callgraph', {
  binary_name: '/firmware-abc123',
  function_name_or_address: 'main', // ✗ Wrong parameter name
  direction: 'CALLING'              // ✗ Wrong case (uppercase)
});
```

**Direction values**:
- `calling` - Show functions that call the target (callers)
- `called` - Show functions called by the target (callees)

### list_imports Response Schema

**Note**: `list_imports` returns `library` field (not `address`) for each import, identifying the source module.

```typescript
const imports = await callMCPTool('pyghidra', 'list_imports', {
  binary_name: '/firmware-abc123',
  limit: 10
});

// Response structure:
{
  "items": [
    { "name": "snprintf", "library": "<EXTERNAL>" },  // ← library, not address
    { "name": "malloc", "library": "<EXTERNAL>" },
    { "name": "json_object_get_int", "library": "<EXTERNAL>" }
  ],
  "summary": { "total": 150, "returned": 10, "hasMore": true }
}
```

**Key differences from `list_exports`**:
| Tool | Returns | Use Case |
|------|---------|----------|
| `list_exports` | `address` (hex) | Find function entry points |
| `list_imports` | `library` (module name) | Identify external dependencies |

The `library` value is typically `<EXTERNAL>` for dynamically linked symbols. To get addresses for imported functions, use `search_symbols_by_name` instead.

### Cross-References to Imported Functions

**Important**: Imported functions (like `snprintf`, `malloc`, `system`) have multiple symbol entries in Ghidra (PLT stubs, external references). Using the function name directly will fail with "Ambiguous match" error.

**Workflow for imported functions:**

```typescript
// Step 1: Search for the symbol to find all entries
const symbols = await callMCPTool('pyghidra', 'search_symbols_by_name', {
  binary_name: '/firmware-abc123',
  query: 'snprintf',
  limit: 20
});

// Returns multiple entries with different addresses and refcounts:
// { name: 'snprintf', address: '0006b01c', refcount: 2 }     // PLT thunk
// { name: 'snprintf', address: '00016c08', refcount: 1139 }  // ← Use this one!
// { name: 'snprintf', address: 'EXTERNAL:...', refcount: 0 } // External ref

// Step 2: Use the address with highest refcount for cross-references
const xrefs = await callMCPTool('pyghidra', 'list_cross_references', {
  binary_name: '/firmware-abc123',
  name_or_address: '0x00016c08'  // Use hex address, not function name
});
```

**Why this happens**: Ghidra creates separate symbols for:
- The external library reference (`EXTERNAL:00000005`)
- The PLT stub thunk entry (`0006b01c`)
- The PLT entry point that code actually calls (`00016c08`)

The entry with the highest `refcount` is typically the one called by application code.

### Binary Name Format

Binary names include a hash suffix. Get the exact name from `list_project_binaries`:

```typescript
const binaries = await callMCPTool('pyghidra', 'list_project_binaries', {});
// Returns: { programs: [{ name: '/updatemgr-d47d46', ... }] }

// Use the exact name including hash
await callMCPTool('pyghidra', 'list_exports', {
  binary_name: '/updatemgr-d47d46'  // Include leading slash and hash
});
```

## Usage Examples

### Import and Analyze Binary

```typescript
import { callMCPTool } from '../config/lib/mcp-client.js';

// Import binary (runs in background)
await callMCPTool('pyghidra', 'import_binary', {
  binary_path: '/path/to/firmware.bin',
  analyze: true
});

// Check if analysis complete
const binaries = await callMCPTool('pyghidra', 'list_project_binaries', {});
const target = binaries.programs.find(p => p.name.includes('firmware'));
console.log('Analysis complete:', target.analysis_complete);
```

### Search for Dangerous Functions

```typescript
// Find calls to system()
const symbols = await callMCPTool('pyghidra', 'search_symbols_by_name', {
  binary_name: '/firmware-abc123',
  query: 'system',
  limit: 50
});

// Get cross-references
for (const sym of symbols.items) {
  const xrefs = await callMCPTool('pyghidra', 'list_cross_references', {
    binary_name: '/firmware-abc123',
    name_or_address: sym.name
  });
  console.log(`${sym.name} called from:`, xrefs.cross_references);
}
```

### Decompile Function

```typescript
const code = await callMCPTool('pyghidra', 'decompile_function', {
  binary_name: '/firmware-abc123',
  name_or_address: 'main'
});

console.log(code.code);
```

### Search Strings for Credentials

```typescript
const strings = await callMCPTool('pyghidra', 'search_strings', {
  binary_name: '/firmware-abc123',
  query: 'password',
  limit: 100
});

// Full string values returned (no redaction for reverse engineering)
for (const s of strings.strings) {
  console.log(`${s.address}: ${s.value}`);
}
```

## Token Optimization

Wrappers filter responses to reduce token usage:

- Remove `internal_id` fields
- Omit redundant metadata (`binary_name`, `search_query`)
- Server-side pagination (no fetch-all-then-filter)
- Include `estimatedTokens` in responses

## Metrics API

The HTTP client tracks performance and reliability metrics:

```typescript
import { createPyghidraHTTPClient } from '../config/lib/pyghidra-http-client.js';

const client = createPyghidraHTTPClient({ port: 8765 });

// After some operations...
const metrics = client.getMetrics();
console.log(metrics);
// {
//   totalRequests: 150,
//   successfulRequests: 148,
//   failedRequests: 2,
//   successRate: 0.987,
//   sessionResets: 1,
//   responseTimes: {
//     min: 45,
//     max: 2340,
//     average: 234,
//     count: 148
//   }
// }

// Reset metrics (e.g., at start of new analysis session)
client.resetMetrics();
```

### Available Metrics

| Metric | Description |
|--------|-------------|
| `totalRequests` | Total number of requests made |
| `successfulRequests` | Number of successful requests |
| `failedRequests` | Number of failed requests |
| `successRate` | Success rate (0-1) |
| `sessionResets` | Number of times session was reset |
| `responseTimes.min` | Minimum response time (ms) |
| `responseTimes.max` | Maximum response time (ms) |
| `responseTimes.average` | Average response time (ms) |
| `responseTimes.count` | Number of recorded response times |

## Testing

```bash
# Run unit tests
npm test -- pyghidra

# Test specific wrapper
npx vitest run search-symbols-by-name.unit.test.ts
```

## Complete Workflow Examples

### Workflow 1: Import → Wait → Analyze Dangerous Functions

```typescript
import { callMCPTool } from '../config/lib/mcp-client.js';

// Step 1: Import binary and wait for analysis to complete
const importResult = await callMCPTool('pyghidra', 'import_binary', {
  binary_path: '/path/to/firmware.bin',
  wait_for_analysis: true,
  timeout_ms: 120000 // 2 minutes
});

console.log(`Imported: ${importResult.binary_name}`);
console.log(`Analysis complete: ${importResult.analysis_complete}`);

// Step 2: Search for dangerous functions (system, exec, popen)
const dangerousFunctions = ['system', 'exec', 'popen', 'execve'];
const results = [];

for (const funcName of dangerousFunctions) {
  const symbols = await callMCPTool('pyghidra', 'search_symbols_by_name', {
    binary_name: importResult.binary_name,
    query: funcName,
    limit: 50
  });

  if (symbols.items.length > 0) {
    results.push({
      function: funcName,
      found: symbols.items.length,
      addresses: symbols.items.map(s => s.address)
    });
  }
}

// Step 3: Analyze cross-references for each dangerous function
for (const result of results) {
  console.log(`\nAnalyzing ${result.function}:`);

  for (const address of result.addresses) {
    const xrefs = await callMCPTool('pyghidra', 'list_cross_references', {
      binary_name: importResult.binary_name,
      name_or_address: `0x${address}`
    });

    if (xrefs.cross_references.length > 0) {
      console.log(`  ${address} called from ${xrefs.cross_references.length} locations`);

      // Step 4: Decompile calling functions to understand context
      for (const xref of xrefs.cross_references.slice(0, 3)) {
        const code = await callMCPTool('pyghidra', 'decompile_function', {
          binary_name: importResult.binary_name,
          name_or_address: `0x${xref.from_address}`
        });
        console.log(`\nDecompiled ${xref.from_address}:\n${code.code.substring(0, 500)}`);
      }
    }
  }
}
```

### Workflow 2: Finding Hardcoded Credentials

```typescript
// Step 1: Search for credential-related strings
const keywords = ['password', 'passwd', 'secret', 'token', 'api_key', 'private_key'];
const credentials = [];

for (const keyword of keywords) {
  const strings = await callMCPTool('pyghidra', 'search_strings', {
    binary_name: '/firmware-abc123',
    query: keyword,
    limit: 100
  });

  credentials.push(...strings.strings);
}

// Step 2: Analyze context - where are these strings used?
for (const cred of credentials) {
  const xrefs = await callMCPTool('pyghidra', 'list_cross_references', {
    binary_name: '/firmware-abc123',
    name_or_address: `0x${cred.address}`
  });

  if (xrefs.cross_references.length > 0) {
    console.log(`"${cred.value}" at ${cred.address} used in:`);

    for (const xref of xrefs.cross_references) {
      // Decompile the function that references this string
      const code = await callMCPTool('pyghidra', 'decompile_function', {
        binary_name: '/firmware-abc123',
        name_or_address: `0x${xref.from_address}`
      });

      // Look for assignment patterns (e.g., strcpy, memcpy)
      if (code.code.includes('strcpy') || code.code.includes('memcpy')) {
        console.log(`  ⚠️ Potential hardcoded credential in function at ${xref.from_address}`);
      }
    }
  }
}
```

### Workflow 3: Call Graph Analysis

```typescript
// Step 1: Generate call graph from main function
const callgraph = await callMCPTool('pyghidra', 'gen_callgraph', {
  binary_name: '/firmware-abc123',
  function_name: 'main',
  direction: 'called', // Functions called BY main
  max_depth: 3
});

console.log(`Call graph from main (depth 3):`);
console.log(JSON.stringify(callgraph, null, 2));

// Step 2: Find paths to sensitive functions
const sensitiveFunctions = ['system', 'exec', 'popen'];

for (const sensitive of sensitiveFunctions) {
  // Find who calls the sensitive function
  const callers = await callMCPTool('pyghidra', 'gen_callgraph', {
    binary_name: '/firmware-abc123',
    function_name: sensitive,
    direction: 'calling', // Functions that CALL system/exec/popen
    max_depth: 3
  });

  console.log(`\nFunctions leading to ${sensitive}:`);
  console.log(JSON.stringify(callers, null, 2));
}
```

## Troubleshooting

### Server Not Running

**Error:** `PyGhidra server is not available on port 8001`

**Cause:** PyGhidra server is not running

**Solution:**
```bash
cd .claude/tools/pyghidra
./start-server.sh
```

**Verify:**
```bash
./server-status.sh
# Should show "✓ Server running"
```

### Session Expired/Invalid

**Error:** `JSON-RPC error: Invalid session` or `HTTP 401: Unauthorized`

**Cause:** Session has expired (idle >30 minutes) or server restarted

**Solution:** The HTTP client automatically handles this with retry logic. If errors persist:
```bash
# Restart your script/tool - client will re-initialize session
# Or restart the server if corrupted:
cd .claude/tools/pyghidra
./restart-server.sh
```

### Binary Not Found

**Error:** `Binary not found: "/firmware-abc123"`

**Cause:** Binary name is incorrect or binary hasn't been imported

**Solution:**
```typescript
// List available binaries
const binaries = await callMCPTool('pyghidra', 'list_project_binaries', {});
console.log('Available binaries:', binaries.programs.map(p => p.name));

// Use exact name including hash suffix
await callMCPTool('pyghidra', 'list_exports', {
  binary_name: binaries.programs[0].name // Use exact name
});
```

### Analysis Not Complete

**Error:** Operations return incomplete results or errors

**Cause:** Binary was imported but analysis hasn't finished

**Solution:**
```typescript
// Option 1: Wait for analysis during import
await callMCPTool('pyghidra', 'import_binary', {
  binary_path: '/path/to/binary.bin',
  wait_for_analysis: true,
  timeout_ms: 120000 // 2 minutes
});

// Option 2: Check analysis status
const binaries = await callMCPTool('pyghidra', 'list_project_binaries', {});
const target = binaries.programs.find(p => p.name.includes('binary'));
console.log('Analysis complete:', target.analysis_complete);

// If false, wait a few minutes and check again
```

### Timeout Errors

**Error:** `Request timeout after 300000ms`

**Cause:** Operation took longer than timeout (common for large binaries)

**Solution:**
```typescript
// Increase timeout for specific operations
await callMCPTool('pyghidra', 'decompile_function', {
  binary_name: '/large-firmware',
  name_or_address: 'complex_function'
}, {
  timeoutMs: 600000 // 10 minutes instead of default 5
});

// For imports, use wait_for_analysis with appropriate timeout
await callMCPTool('pyghidra', 'import_binary', {
  binary_path: '/path/to/large.bin',
  wait_for_analysis: true,
  timeout_ms: 600000 // 10 minutes for large binaries
});
```

### Ambiguous Symbol Match

**Error:** `Ambiguous match for symbol "snprintf" - found 3 entries`

**Cause:** Imported functions have multiple entries (PLT stub, PLT entry, external ref)

**Solution:**
```typescript
// Step 1: Search to see all entries
const symbols = await callMCPTool('pyghidra', 'search_symbols_by_name', {
  binary_name: '/firmware',
  query: 'snprintf',
  limit: 20
});

// Returns multiple entries with refcount:
// { name: 'snprintf', address: '0006b01c', refcount: 2 }     // PLT thunk
// { name: 'snprintf', address: '00016c08', refcount: 1139 }  // ← Use this one!
// { name: 'snprintf', address: 'EXTERNAL:...', refcount: 0 } // External

// Step 2: Use address with highest refcount
const highestRef = symbols.items.reduce((max, item) =>
  item.refcount > max.refcount ? item : max
);

// Step 3: Use hex address instead of name
const xrefs = await callMCPTool('pyghidra', 'list_cross_references', {
  binary_name: '/firmware',
  name_or_address: `0x${highestRef.address}` // Use address, not name
});
```

### Server Performance Issues

**Symptoms:** Slow responses, timeouts, high memory usage

**Check server status:**
```bash
./server-status.sh
# Look at Memory (RSS) and Uptime
```

**Solution:**
```bash
# Restart server to clear memory
./restart-server.sh

# For very large binaries, increase Java heap:
# Edit start-server.sh and add: -Xmx4g (for 4GB heap)
```

### Multiple Failures Detected

**Error:** `Multiple failures detected - consider restarting the server`

**Cause:** 3+ consecutive failures indicate potential server issues

**Solution:**
```bash
# Check server logs for errors
tail -50 .server.log

# Restart server
./restart-server.sh

# If issues persist, check:
# - Disk space (Ghidra project files)
# - Memory availability
# - Port conflicts (8001 in use by another process)
```

## Related Documentation

- **Server Management**: `SERVER-MANAGEMENT.md`
- **Persistent Connections**: `PERSISTENT-CONNECTION-SETUP.md`
- **Shared MCP Client**: `../config/lib/mcp-client.ts`
