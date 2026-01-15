---
name: mcp-tools-ghydra
description: Use when accessing ghydra services - provides 36 tools for Ghidra reverse engineering (instances, functions, memory, data, structs, analysis, UI). References mcp-tools-registry for Bash + tsx execution patterns. Enables granular agent access control.
allowed-tools: Read, Bash
skills: [mcp-tools-registry]
---

# Ghydra MCP Tools

**GRANULAR ACCESS CONTROL:** Include this skill to give agent ghydra access ONLY.

> **Execution patterns:** See mcp-tools-registry for Bash + npx tsx usage
> This skill provides ghydra-specific tool catalog.

## Purpose

Enable granular agent access control for Ghidra reverse engineering operations via ghydra MCP server.

**Include this skill when:** Agent needs ghydra/Ghidra access for binary analysis, reverse engineering, or malware analysis
**Exclude this skill when:** Agent should NOT access ghydra

## Test Coverage

**730 tests, 97.2% coverage** - All 36 wrappers comprehensively tested and production-ready.

**Test Distribution:**
- Min tests per wrapper: 18
- Max tests per wrapper: 25
- Avg tests per wrapper: 20.3
- All wrappers meet 18+ test standard ✅

## Available Tools (36 wrappers)

### Instances Management (7 tools)

Manage Ghidra instance connections and sessions.

- **instances-list** - List all registered Ghidra instances with status
- **instances-current** - Get currently active Ghidra instance details
- **instances-discover** - Auto-discover Ghidra instances on network
- **instances-register** - Register a new Ghidra instance (port/URL)
- **instances-unregister** - Unregister a Ghidra instance
- **instances-use** - Set the active working Ghidra instance

### Functions Analysis (9 tools)

Analyze and manipulate function definitions in binaries.

- **functions-list** - List functions with filtering and pagination
- **functions-get** - Get detailed function information (name, address, signature, params)
- **functions-decompile** - Get decompiled C code for a function
- **functions-disassemble** - Get disassembly for a function
- **functions-create** - Create a new function at an address
- **functions-rename** - Rename a function
- **functions-set-signature** - Set function signature/prototype
- **functions-get-variables** - Get function local variables
- **functions-set-comment** - Set decompiler-friendly function comment

### Memory Operations (2 tools)

Read and write binary memory with security controls.

- **memory-read** - Read memory with format options (hex/base64/string), secrets redaction
- **memory-write** - Write memory with security validation

### Data Management (6 tools)

Define and manage data items in binaries.

- **data-list** - List defined data items with filtering
- **data-create** - Define new data item at address
- **data-list-strings** - List all defined strings in binary
- **data-rename** - Rename a data item
- **data-delete** - Delete data at address
- **data-set-type** - Set data type (dword, string, etc.)

### Structs Management (6 tools)

Create and manage struct data types.

- **structs-list** - List all struct data types
- **structs-get** - Get detailed struct information with fields
- **structs-create** - Create a new struct data type
- **structs-add-field** - Add field to existing struct
- **structs-update-field** - Update struct field (name/type/comment)
- **structs-delete** - Delete a struct data type

### Analysis Operations (3 tools)

Advanced program analysis capabilities.

- **analysis-run** - Run Ghidra analysis on current program
- **analysis-get-callgraph** - Get function call graph visualization data
- **analysis-get-dataflow** - Perform data flow analysis from an address

### UI Integration (2 tools)

Interact with Ghidra UI state.

- **ui-get-current-address** - Get address currently selected in Ghidra UI
- **ui-get-current-function** - Get function currently selected in Ghidra UI

### Comments (1 tool)

- **comments-set** - Set comment at address (plate/pre/post/eol/repeatable)

### Cross-References (1 tool)

- **xrefs-list** - List cross-references with filtering (to/from/type)


## Architecture Highlights

**DRY Design:**
- Shared utilities (`utils.ts`): Address validation, sanitization, error handling, token estimation
- Shared schemas (`shared-schemas.ts`): Common Zod validators (ports, addresses, names)
- Centralized error handling: Single `handleMCPError()` function for all wrappers
- Token reduction: 80%+ reduction through response filtering

**Security:**
- Input validation with Zod schemas
- XSS protection (sanitize names, comments)
- Path traversal protection
- Secrets redaction in memory operations
- Control character filtering

## Quick Examples

See mcp-tools-registry for complete Bash + tsx execution patterns.

**List Ghidra instances:**
```bash
npx tsx -e "(async () => {
  const { instancesList } = await import('./.claude/tools/ghydra/instances-list.ts');
  const result = await instancesList.execute({});
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Decompile a function:**
```bash
npx tsx -e "(async () => {
  const { functionsDecompile } = await import('./.claude/tools/ghydra/functions-decompile.ts');
  const result = await functionsDecompile.execute({ name: 'main' });
  console.log(result.code);
})();" 2>/dev/null
```

**Get call graph:**
```bash
npx tsx -e "(async () => {
  const { analysisGetCallgraph } = await import('./.claude/tools/ghydra/analysis-get-callgraph.ts');
  const result = await analysisGetCallgraph.execute({ name: 'main', max_depth: 5 });
  console.log(JSON.stringify(result.nodes, null, 2));
})();" 2>/dev/null
```

## Common Use Cases

**Malware Analysis Workflow:**
1. `instances-list` - Find available Ghidra instances
2. `instances-use` - Set active instance
3. `functions-list` - Find suspicious functions
4. `functions-decompile` - Analyze function behavior
5. `xrefs-list` - Find function references
6. `analysis-get-callgraph` - Map execution flow

**Binary Reverse Engineering:**
1. `data-list-strings` - Find interesting strings
2. `functions-get` - Analyze entry points
3. `structs-list` - Examine data structures
4. `memory-read` - Inspect memory regions
5. `comments-set` - Document findings

## Related Skills

- **mcp-tools-registry** - Execution patterns (REQUIRED - see for Bash + tsx usage)
- **mcp-code-create** - Create new wrappers
- **mcp-code-test** - Test wrappers

## Import Paths

All wrappers follow the pattern:
```typescript
import { toolName } from './.claude/tools/ghydra/tool-name.ts';
```

Example imports:
- `instancesList` from `instances-list.ts`
- `functionsDecompile` from `functions-decompile.ts`
- `memoryRead` from `memory-read.ts`
- `structsGet` from `structs-get.ts`
