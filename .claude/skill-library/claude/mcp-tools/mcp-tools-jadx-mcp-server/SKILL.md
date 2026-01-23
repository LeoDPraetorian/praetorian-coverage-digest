---
name: mcp-tools-jadx-mcp-server
description: Use when accessing jadx-mcp-server services - provides 19 tools for Android APK reverse engineering including class analysis, method/field inspection, code retrieval, and rename operations. References mcp-tools-registry for Bash + tsx execution patterns. Enables granular agent access control.
allowed-tools: Read, Bash
skills: [mcp-tools-registry]
---

# Jadx mcp server MCP Tools

**GRANULAR ACCESS CONTROL:** Include this skill to give agent jadx-mcp-server access ONLY.

> **Execution patterns:** See mcp-tools-registry for Bash + npx tsx usage
> This skill provides jadx-mcp-server-specific tool catalog.

## Purpose

Enable granular agent access control for jadx-mcp-server operations.

**Include this skill when:** Agent needs jadx-mcp-server access
**Exclude this skill when:** Agent should NOT access jadx-mcp-server

## Available Tools (19 wrappers - 100% coverage)

### fetch-current-class
- **Purpose:** MCP wrapper for fetch-current-class
- **Import:** `import { fetchCurrentClass } from './.claude/tools/jadx-mcp-server/fetch-current-class.ts'`
- **Token cost:** ~unknown tokens

### get-all-resource-file-names
- **Purpose:** MCP wrapper for get-all-resource-file-names
- **Import:** `import { getAllResourceFileNames } from './.claude/tools/jadx-mcp-server/get-all-resource-file-names.ts'`
- **Token cost:** ~unknown tokens

### get-android-manifest
- **Purpose:** MCP wrapper for get-android-manifest
- **Import:** `import { getAndroidManifest } from './.claude/tools/jadx-mcp-server/get-android-manifest.ts'`
- **Token cost:** ~unknown tokens

### get-class-sources
- **Purpose:** MCP wrapper for get-class-sources
- **Import:** `import { getClassSources } from './.claude/tools/jadx-mcp-server/get-class-sources.ts'`
- **Token cost:** ~unknown tokens

### get-main-activity-class
- **Purpose:** MCP wrapper for get-main-activity-class
- **Import:** `import { getMainActivityClass } from './.claude/tools/jadx-mcp-server/get-main-activity-class.ts'`
- **Token cost:** ~unknown tokens

### get-resource-file
- **Purpose:** MCP wrapper for get-resource-file
- **Import:** `import { getResourceFile } from './.claude/tools/jadx-mcp-server/get-resource-file.ts'`
- **Token cost:** ~unknown tokens

### get-selected-text
- **Purpose:** MCP wrapper for get-selected-text
- **Import:** `import { getSelectedText } from './.claude/tools/jadx-mcp-server/get-selected-text.ts'`
- **Token cost:** ~unknown tokens

### get-smali-of-class
- **Purpose:** MCP wrapper for get-smali-of-class
- **Import:** `import { getSmaliOfClass } from './.claude/tools/jadx-mcp-server/get-smali-of-class.ts'`
- **Token cost:** ~unknown tokens

### get-strings
- **Purpose:** MCP wrapper for get-strings
- **Import:** `import { getStrings } from './.claude/tools/jadx-mcp-server/get-strings.ts'`
- **Token cost:** ~unknown tokens

### get-method-by-name
- **Purpose:** Fetch Java source code of a specific method from a class (truncated to 500 chars)
- **Import:** `import { getMethodByName } from './.claude/tools/jadx-mcp-server/get-method-by-name.ts'`
- **Token cost:** ~50 tokens (70-98% reduction)

### search-method-by-name
- **Purpose:** Search for methods by name across all classes with pagination
- **Import:** `import { searchMethodByName } from './.claude/tools/jadx-mcp-server/search-method-by-name.ts'`
- **Token cost:** ~500-1000 tokens (80-90% reduction)

### get-all-classes
- **Purpose:** Lists all classes in the loaded APK with pagination
- **Import:** `import { getAllClasses } from './.claude/tools/jadx-mcp-server/get-all-classes.ts'`
- **Token cost:** ~400 tokens (100 classes)

### get-methods-of-class
- **Purpose:** List all methods in a specific class with pagination
- **Import:** `import { getMethodsOfClass } from './.claude/tools/jadx-mcp-server/get-methods-of-class.ts'`
- **Token cost:** ~500 tokens

### get-fields-of-class
- **Purpose:** List all fields in a specific class with pagination
- **Import:** `import { getFieldsOfClass } from './.claude/tools/jadx-mcp-server/get-fields-of-class.ts'`
- **Token cost:** ~200 tokens

### get-main-application-classes-names
- **Purpose:** Lists main application class names (filtered by AndroidManifest package)
- **Import:** `import { getMainApplicationClassesNames } from './.claude/tools/jadx-mcp-server/get-main-application-classes-names.ts'`
- **Token cost:** ~400 tokens

### get-main-application-classes-code
- **Purpose:** Lists main application classes with truncated source code (300 chars per class, default count=5 for token efficiency)
- **Import:** `import { getMainApplicationClassesCode } from './.claude/tools/jadx-mcp-server/get-main-application-classes-code.ts'`
- **Token cost:** ~400 tokens (95-99% reduction)

### rename-class (WRITE OPERATION)
- **Purpose:** Rename a class to a more meaningful name - CRITICAL SECURITY with 6-layer defense, audit logging
- **Import:** `import { renameClass } from './.claude/tools/jadx-mcp-server/rename-class.ts'`
- **Token cost:** ~60 tokens

### rename-method (WRITE OPERATION)
- **Purpose:** Rename a method to a more meaningful name - CRITICAL SECURITY with audit logging
- **Import:** `import { renameMethod } from './.claude/tools/jadx-mcp-server/rename-method.ts'`
- **Token cost:** ~60 tokens

### rename-field (WRITE OPERATION)
- **Purpose:** Rename a field with confirmation flow - CRITICAL SECURITY with audit trail
- **Import:** `import { renameField } from './.claude/tools/jadx-mcp-server/rename-field.ts'`
- **Token cost:** ~60 tokens


## Quick Examples

See mcp-tools-registry for complete Bash + tsx execution patterns.

**Inline execution:**
```bash
# Note: 2>/dev/null suppresses MCP debug logs
npx tsx -e "(async () => {
  const { fetchCurrentClass } = await import('./.claude/tools/jadx-mcp-server/fetch-current-class.ts');
  const result = await fetchCurrentClass.execute({ /* params */ });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

## Related Skills

- **mcp-tools-registry** - Execution patterns (REQUIRED - see for Bash + tsx usage)
- **mcp-code-create** - Create new wrappers
- **mcp-code-test** - Test wrappers
