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

## Testing

```bash
# Run unit tests
npm test -- pyghidra

# Test specific wrapper
npx vitest run search-symbols-by-name.unit.test.ts
```

## Related Documentation

- **Server Management**: `SERVER-MANAGEMENT.md`
- **Persistent Connections**: `PERSISTENT-CONNECTION-SETUP.md`
- **Shared MCP Client**: `../config/lib/mcp-client.ts`
