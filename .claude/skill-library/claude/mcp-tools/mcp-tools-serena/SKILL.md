---
name: mcp-tools-serena
description: Use when accessing Serena services - provides 23 tools for semantic code analysis and editing via Language Server Protocol. Symbol operations, memory persistence, file search, and workflow guidance.
allowed-tools: Read, Bash
skills: [mcp-tools-registry]
---

# Serena MCP Tools

**GRANULAR ACCESS CONTROL:** Include this skill to give agent Serena access ONLY.

> **Execution patterns:** See mcp-tools-registry for Bash + npx tsx usage
> This skill provides Serena-specific tool catalog.

## Purpose

Enable granular agent access control for semantic code analysis and editing.

**Include this skill when:** Agent needs semantic code search, symbol manipulation, or project memory
**Exclude this skill when:** Agent should NOT access language server features

## Overview

Serena provides semantic code operations via Language Server Protocol:

- **Symbol Operations** (7 tools): Search, navigate, and edit code by symbol name
- **Memory** (5 tools): Persist and retrieve project-specific context
- **File/Search** (3 tools): Directory listing and pattern search
- **Config** (2 tools): Project activation and configuration
- **Workflow** (6 tools): Guided reflection and onboarding

## Available Tools (23 wrappers)

### Symbol Operations

#### find-symbol

- **Purpose:** Semantic symbol search (classes, methods, functions)
- **Import:** `import { findSymbol } from '$ROOT/.claude/tools/serena/find-symbol.ts'`
- **Token cost:** ~50-500 tokens

```typescript
interface FindSymbolInput {
  name_path_pattern: string; // "MyClass/method" or "method"
  depth?: number; // 0 = match only, 1+ = include children
  relative_path?: string; // Restrict search to file/directory
  include_body?: boolean; // Include source code
  include_kinds?: number[]; // LSP symbol kinds (5=Class, 12=Function)
  exclude_kinds?: number[]; // Symbol kinds to exclude
  substring_matching?: boolean;
}
```

#### get-symbols-overview

- **Purpose:** Overview of top-level symbols in a file
- **Import:** `import { getSymbolsOverview } from '$ROOT/.claude/tools/serena/get-symbols-overview.ts'`

```typescript
interface GetSymbolsOverviewInput {
  relative_path: string;
  depth?: number;
}
```

#### find-referencing-symbols

- **Purpose:** Find all references to a symbol
- **Import:** `import { findReferencingSymbols } from '$ROOT/.claude/tools/serena/find-referencing-symbols.ts'`

```typescript
interface FindReferencingSymbolsInput {
  name_path: string;
  relative_path: string;
  include_kinds?: number[];
  exclude_kinds?: number[];
}
```

#### replace-symbol-body

- **Purpose:** Replace entire symbol definition
- **Import:** `import { replaceSymbolBody } from '$ROOT/.claude/tools/serena/replace-symbol-body.ts'`

```typescript
interface ReplaceSymbolBodyInput {
  name_path: string;
  relative_path: string;
  body: string; // Complete new definition
}
```

#### insert-after-symbol / insert-before-symbol

- **Purpose:** Insert code relative to a symbol
- **Import:** `import { insertAfterSymbol } from '$ROOT/.claude/tools/serena/insert-after-symbol.ts'`

```typescript
interface InsertSymbolInput {
  name_path: string;
  relative_path: string;
  body: string;
}
```

#### rename-symbol

- **Purpose:** Rename symbol throughout codebase
- **Import:** `import { renameSymbol } from '$ROOT/.claude/tools/serena/rename-symbol.ts'`

```typescript
interface RenameSymbolInput {
  name_path: string;
  relative_path: string;
  new_name: string;
}
```

### Memory Tools

#### write-memory / read-memory

- **Purpose:** Persist and retrieve project context
- **Import:** `import { writeMemory, readMemory } from '$ROOT/.claude/tools/serena/index.ts'`

```typescript
interface WriteMemoryInput {
  memory_file_name: string;
  content: string;
}
interface ReadMemoryInput {
  memory_file_name: string;
}
```

#### list-memories / delete-memory / edit-memory

- **Purpose:** Manage project memories
- **Import:** `import { listMemories, deleteMemory, editMemory } from '$ROOT/.claude/tools/serena/index.ts'`

### File/Search Tools

#### list-dir

- **Purpose:** List directory contents
- **Import:** `import { listDir } from '$ROOT/.claude/tools/serena/list-dir.ts'`

```typescript
interface ListDirInput {
  relative_path: string; // "." for root
  recursive: boolean;
  skip_ignored_files?: boolean;
}
```

#### find-file

- **Purpose:** Find files by pattern
- **Import:** `import { findFile } from '$ROOT/.claude/tools/serena/find-file.ts'`

```typescript
interface FindFileInput {
  file_mask: string; // "*.ts", "config.?"
  relative_path: string;
}
```

#### search-for-pattern

- **Purpose:** Search for text pattern in files
- **Import:** `import { searchForPattern } from '$ROOT/.claude/tools/serena/search-for-pattern.ts'`

```typescript
interface SearchForPatternInput {
  pattern: string;
  relative_path?: string;
}
```

### Config & Workflow Tools

#### activate-project / get-current-config

- **Purpose:** Project management and configuration

#### check-onboarding-performed / onboarding / initial-instructions

- **Purpose:** Project onboarding workflow

#### think-about-\* (3 tools)

- **Purpose:** Guided reflection prompts for information gathering, task adherence, and completion

## Quick Examples

**Find all classes:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { findSymbol } = await import('$ROOT/.claude/tools/serena/find-symbol.ts');
  const result = await findSymbol.execute({ name_path_pattern: '*', include_kinds: [5] });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Get file overview:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { getSymbolsOverview } = await import('$ROOT/.claude/tools/serena/get-symbols-overview.ts');
  const result = await getSymbolsOverview.execute({ relative_path: 'src/index.ts', depth: 1 });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

## LSP Symbol Kinds Reference

| Kind | Name         | Kind | Name          |
| ---- | ------------ | ---- | ------------- |
| 1    | File         | 14   | Constant      |
| 2    | Module       | 15   | String        |
| 3    | Namespace    | 16   | Number        |
| 4    | Package      | 17   | Boolean       |
| 5    | **Class**    | 18   | Array         |
| 6    | **Method**   | 19   | Object        |
| 7    | Property     | 20   | Key           |
| 8    | Field        | 21   | Null          |
| 9    | Constructor  | 22   | EnumMember    |
| 10   | Enum         | 23   | Struct        |
| 11   | Interface    | 24   | Event         |
| 12   | **Function** | 25   | Operator      |
| 13   | Variable     | 26   | TypeParameter |

## Related Skills

- **mcp-tools-registry** - Execution patterns (REQUIRED - see for Bash + tsx usage)
- **mcp-code-create** - Create new wrappers
- **mcp-code-test** - Test wrappers
