# Serena MCP Tool Discovery

**Date**: 2026-01-01
**MCP Package**: `git+https://github.com/oraios/serena` (via uvx)
**Context**: `claude-code` (excludes redundant tools)
**Active Tools**: 23 (filtered from 38 total)

## Connection Configuration

```typescript
{
  command: 'uvx',
  args: [
    '--from', 'git+https://github.com/oraios/serena',
    'serena', 'start-mcp-server',
    '--context', 'claude-code',
    '--project-from-cwd'
  ]
}
```

## Excluded Tools (5)

Tools excluded by `claude-code` context because Claude Code already provides them:
- `create_text_file` → Use Claude Code's Write tool
- `read_file` → Use Claude Code's Read tool
- `execute_shell_command` → Use Claude Code's Bash tool
- `prepare_for_new_conversation` → Not needed in Claude Code context
- `replace_content` → Use Claude Code's Edit tool

---

## Tool Schemas (23 Active Tools)

### 1. Symbol Tools (Semantic Code Operations)

#### find_symbol
**Purpose**: Performs global or local search for symbols (classes, methods, functions, etc.)

```typescript
InputSchema = {
  name_path_pattern: string;        // Required - Pattern to match (e.g., "MyClass/method")
  depth?: number;                   // Default: 0 - Depth to retrieve descendants
  relative_path?: string;           // Default: "" - Restrict search to file/directory
  include_body?: boolean;           // Default: false - Include source code
  include_kinds?: number[];         // Default: [] - LSP symbol kinds to include
  exclude_kinds?: number[];         // Default: [] - LSP symbol kinds to exclude
  substring_matching?: boolean;     // Default: false - Enable substring matching
  max_answer_chars?: number;        // Default: -1 - Max response length
}
```

**Symbol Kinds**: 1=file, 2=module, 3=namespace, 4=package, 5=class, 6=method, 7=property, 8=field, 9=constructor, 10=enum, 11=interface, 12=function, 13=variable, 14=constant, 15=string, 16=number, 17=boolean, 18=array, 19=object, 20=key, 21=null, 22=enum member, 23=struct, 24=event, 25=operator, 26=type parameter

#### find_referencing_symbols
**Purpose**: Finds symbols that reference a given symbol

```typescript
InputSchema = {
  name_path: string;               // Required - Name path to find references for
  relative_path: string;           // Required - File containing the symbol
  include_kinds?: number[];        // Default: [] - LSP symbol kinds to include
  exclude_kinds?: number[];        // Default: [] - LSP symbol kinds to exclude
  max_answer_chars?: number;       // Default: -1 - Max response length
}
```

#### get_symbols_overview
**Purpose**: Gets overview of top-level symbols in a file

```typescript
InputSchema = {
  relative_path: string;           // Required - File path
  depth?: number;                  // Default: 0 - Depth for descendants
  max_answer_chars?: number;       // Default: -1 - Max response length
}
```

#### replace_symbol_body
**Purpose**: Replaces the full definition of a symbol

```typescript
InputSchema = {
  name_path: string;               // Required - Name path of symbol to replace
  relative_path: string;           // Required - File containing the symbol
  body: string;                    // Required - New symbol body (definition)
}
```

#### insert_after_symbol
**Purpose**: Inserts content after the end of a symbol's definition

```typescript
InputSchema = {
  name_path: string;               // Required - Name path of symbol
  relative_path: string;           // Required - File containing the symbol
  body: string;                    // Required - Content to insert
}
```

#### insert_before_symbol
**Purpose**: Inserts content before the beginning of a symbol's definition

```typescript
InputSchema = {
  name_path: string;               // Required - Name path of symbol
  relative_path: string;           // Required - File containing the symbol
  body: string;                    // Required - Content to insert
}
```

#### rename_symbol
**Purpose**: Renames a symbol throughout the codebase

```typescript
InputSchema = {
  name_path: string;               // Required - Name path of symbol
  relative_path: string;           // Required - File containing the symbol
  new_name: string;                // Required - New name for the symbol
}
```

---

### 2. Memory Tools (Project Context Persistence)

#### write_memory
**Purpose**: Writes named memory to project-specific store

```typescript
InputSchema = {
  memory_file_name: string;        // Required - Memory name (meaningful)
  content: string;                 // Required - UTF-8 encoded content
  max_answer_chars?: number;       // Default: -1 - Max content length
}
```

#### read_memory
**Purpose**: Reads memory from project-specific store

```typescript
InputSchema = {
  memory_file_name: string;        // Required - Memory name
  max_answer_chars?: number;       // Default: -1 - Max response length
}
```

#### list_memories
**Purpose**: Lists all memories in project store

```typescript
InputSchema = {}  // No parameters
```

#### delete_memory
**Purpose**: Deletes a memory from project store

```typescript
InputSchema = {
  memory_file_name: string;        // Required - Memory name to delete
}
```

#### edit_memory
**Purpose**: Edits content in a memory using literal or regex replacement

```typescript
InputSchema = {
  memory_file_name: string;        // Required - Memory name
  needle: string;                  // Required - String or regex pattern
  repl: string;                    // Required - Replacement string
  mode: "literal" | "regex";       // Required - Matching mode
}
```

---

### 3. File Tools (Directory & Search Operations)

#### list_dir
**Purpose**: Lists files and directories (optionally recursive)

```typescript
InputSchema = {
  relative_path: string;           // Required - Directory path ("." for root)
  recursive: boolean;              // Required - Scan subdirectories
  skip_ignored_files?: boolean;    // Default: false - Skip gitignored files
  max_answer_chars?: number;       // Default: -1 - Max response length
}
```

#### find_file
**Purpose**: Finds files matching a pattern

```typescript
InputSchema = {
  file_mask: string;               // Required - Filename pattern (*, ?)
  relative_path: string;           // Required - Directory to search
}
```

#### search_for_pattern
**Purpose**: Searches for a pattern in project files

```typescript
InputSchema = {
  pattern: string;                 // Required - Pattern to search for
  relative_path?: string;          // Default: "" - Directory to search
  max_answer_chars?: number;       // Default: -1 - Max response length
}
```

---

### 4. Configuration Tools

#### activate_project
**Purpose**: Activates a project by name or path

```typescript
InputSchema = {
  project: string;                 // Required - Project name or path
}
```

#### get_current_config
**Purpose**: Returns current agent configuration

```typescript
InputSchema = {}  // No parameters
```

---

### 5. Workflow Tools (Thinking & Guidance)

#### check_onboarding_performed
**Purpose**: Checks if project onboarding was completed

```typescript
InputSchema = {}  // No parameters
```

#### onboarding
**Purpose**: Performs project onboarding (structure identification)

```typescript
InputSchema = {}  // No parameters
```

#### initial_instructions
**Purpose**: Returns Serena instructions manual

```typescript
InputSchema = {}  // No parameters
```

#### think_about_collected_information
**Purpose**: Reflection tool for completeness of gathered info

```typescript
InputSchema = {}  // No parameters
```

#### think_about_task_adherence
**Purpose**: Reflection tool for staying on track

```typescript
InputSchema = {}  // No parameters
```

#### think_about_whether_you_are_done
**Purpose**: Reflection tool for task completion

```typescript
InputSchema = {}  // No parameters
```

---

## Response Format

Serena returns **JSON strings** for most tools. Key response patterns:

1. **Symbol queries**: Array of symbol objects with `name_path`, `kind`, `body_location`, `relative_path`
2. **Memory operations**: Success messages or JSON content
3. **File operations**: JSON objects with `dirs`, `files` arrays
4. **Thinking tools**: Prompt text for reflection

## Token Reduction Strategy

| Tool | Raw Response | Filtered Response | Reduction |
|------|--------------|-------------------|-----------|
| find_symbol | ~2000 chars | Essential fields only | 60% |
| get_symbols_overview | ~1500 chars | Top-level symbols | 50% |
| list_dir | Variable | Dirs + files arrays | Minimal |
| list_memories | ~500 chars | Names only | 70% |

## Error Handling

Common errors:
- `FileNotFoundError`: Invalid relative path
- `ValueError`: Invalid parameter type
- Connection timeout (>30s): Project too large for auto-detection
