---
description: Use when querying Context7 for documentation or API references - just describe what you want
argument-hint: <describe your operation naturally>
allowed-tools: Bash, Read, Skill
---

# Context7 Library Documentation

**Speak naturally!** Just describe what you want after `/context7` - I'll figure it out.

## What You Can Do

- **Search libraries** - Find libraries by name and get their Context7 IDs
- **Get documentation** - Fetch library docs with code examples or conceptual guides
- **Focus on topics** - Get docs filtered to specific topics (hooks, routing, etc.)
- **Browse pages** - Paginate through large documentation sets

I'll automatically parse your natural language and execute the right tool.

---

## Natural Language Examples

### Searching for Libraries

```bash
# All of these work:
/context7 search for react
/context7 find libraries matching tanstack query
/context7 what libraries are available for zod
/context7 look up lodash
```

### Getting Documentation

```bash
# Any of these:
/context7 get docs for react
/context7 show me documentation for /vercel/next.js
/context7 get react hooks documentation
/context7 fetch tanstack query docs about mutations
```

### Getting Code Examples

```bash
# Code-focused queries:
/context7 get code examples for react
/context7 show me react hooks code
/context7 get API reference for zod
```

### Getting Conceptual Guides

```bash
# Info mode queries:
/context7 get conceptual guide for react
/context7 explain how tanstack query works
/context7 show me tutorials for next.js
```

### Topic-Specific Documentation

```bash
# Topic filtering:
/context7 get react docs about hooks
/context7 get next.js docs about routing
/context7 get tanstack query docs about mutations
/context7 show me zod docs about schema validation
```

---

## How It Works

1. **You describe** your intent naturally (no rigid syntax required)
2. **I read** the mcp-tools-context7 skill for available operations
3. **I parse** your input to extract operation, library name, and options
4. **I execute** the appropriate Context7 wrapper with your parameters
5. **I display** clean documentation back to you

**No memorization needed!** Just tell me what you need in plain language.

---

## Implementation

When you invoke this command, I will:

### Step 1: Detect Repository Root and Read the Context7 Skill

**CRITICAL:** This command works from any directory (including submodules like `modules/chariot/`).

First, detect the super-repo root:

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
```

Then read the skill file:

```bash
Read: $ROOT/.claude/skill-library/claude/mcp-tools/mcp-tools-context7/SKILL.md
```

This gives me context about available tools and execution patterns.

### Step 2: Parse Your Natural Language

I'll analyze your input for:

- **Operation type**: search (resolve-library-id) or get docs (get-library-docs)
- **Library name/ID**: The library you want information about
- **Mode**: code (API references, examples) or info (conceptual guides)
- **Topic**: Specific topic to focus documentation on
- **Page**: Pagination for large docs

### Step 3: Execute the Appropriate Tool

**All commands use dynamic repository root detection** to work from any directory:

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "..." 2>/dev/null
```

Based on your request, I'll execute one of:

**resolve-library-id** - Search for libraries by name

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { resolveLibraryId } = await import('$ROOT/.claude/tools/context7/resolve-library-id.ts');
  const result = await resolveLibraryId.execute({
    libraryName: 'react'
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**get-library-docs** - Get documentation for a library

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { getLibraryDocs } = await import('$ROOT/.claude/tools/context7/get-library-docs.ts');
  const result = await getLibraryDocs.execute({
    context7CompatibleLibraryID: '/facebook/react',
    mode: 'code',
    topic: 'hooks',
    page: 1
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

### Step 4: Format and Display Results

I'll parse the JSON response and display it in a clean, readable format with:

- For library search: List of matching libraries with IDs and descriptions
- For documentation: Formatted markdown content with code examples
- Token count estimates for context awareness
- Links to further pages if available

---

## Two-Step Workflow

For most queries, you'll use a two-step workflow:

### Step 1: Find the Library ID

If you don't know the exact Context7 library ID:

```bash
/context7 search for react
```

This returns libraries like:
- `/facebook/react` - The React library
- `/remix-run/react-router` - React Router
- `/tanstack/react-query` - TanStack Query

### Step 2: Get Documentation

Use the library ID from step 1:

```bash
/context7 get docs for /facebook/react about hooks
```

**Shortcut:** If you say "get docs for react", I'll automatically search first, then fetch docs for the best match.

---

## Documentation Modes

### Code Mode (Default)

Best for: API references, function signatures, code examples

```bash
/context7 get code examples for react
/context7 get API reference for zod
```

### Info Mode

Best for: Conceptual guides, tutorials, overviews

```bash
/context7 get conceptual guide for react
/context7 explain how tanstack query works
```

---

## Authentication

Context7 tools connect to the Context7 MCP server configured in your MCP settings.

**Configuration location:** `.claude/mcp/mcp.json` or Claude Desktop settings

The Context7 MCP server is typically configured as:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

---

## Token Awareness

Context7 documentation responses vary in size:

- **Typical response**: 1,300-1,500 tokens
- **Large libraries**: Up to 6,000 tokens per page
- **Use pagination**: Request specific pages to manage context

The wrapper automatically reports `estimatedTokens` so you can track context usage.

---

## Tips for Best Results

- **Be specific**: "react hooks" > "react" for focused docs
- **Use library IDs**: `/facebook/react` is more precise than "react"
- **Specify mode**: Use "code examples" or "conceptual guide" for targeted results
- **Topic filtering**: "about hooks" or "about routing" focuses the docs
- **Check tokens**: Large docs can consume significant context

---

## When Something Fails

If you encounter an error with this interface:

1. **State the error**: "The /context7 command returned: [exact error message]"
2. **Show what you tried**: Include the natural language command you used
3. **Ask the user**: "Should I debug the interface or try a different approach?"
4. **Wait for response**: Do not silently fall back to low-level execution or create workarounds

---

## Technical Reference

For developers or debugging, here are the underlying wrapper patterns:

### Search Libraries (Direct Execution)

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
npx tsx -e "(async () => {
  const { resolveLibraryId } = await import('$ROOT/.claude/tools/context7/resolve-library-id.ts');
  const result = await resolveLibraryId.execute({ libraryName: 'react' });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

### Get Documentation (Direct Execution)

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
npx tsx -e "(async () => {
  const { getLibraryDocs } = await import('$ROOT/.claude/tools/context7/get-library-docs.ts');
  const result = await getLibraryDocs.execute({
    context7CompatibleLibraryID: '/facebook/react',
    mode: 'code',
    topic: 'hooks'
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

### Error Handling Notes

- Filter debug output with `2>/dev/null`
- Validate library IDs don't contain path traversal or injection
- Handle MCP connection errors with retry guidance
- Display clean JSON results

---

## Related Skills

For more complex workflows, these library skills are available:

- `mcp-tools-context7` - Low-level wrapper implementations
- `mcp-tools-registry` - Execution patterns for all MCP tools
