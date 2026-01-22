# Context7 Documentation Refresh

Skills created from context7 data (library/framework documentation) can become stale as upstream libraries evolve. This document explains staleness detection and refresh workflows.

## Staleness Detection

Before updating a context7-based skill, check if documentation is stale:

### Check for context7 source file

```bash
cat {skill-path}/.local/context7-source.json 2>/dev/null
```

If found, check the `fetchedAt` date. If >30 days old, refresh before updating.

### Example metadata

```json
{
  "libraryName": "tanstack-query",
  "libraryId": "...",
  "fetchedAt": "2024-12-28T10:30:00.000Z",
  "version": "5.0.0",
  "docsHash": "abc123..."
}
```

## Manual Refresh Workflow

To refresh context7 documentation for a skill:

### Step 1: Query context7 MCP

Use the context7 MCP server to fetch updated documentation:

```typescript
// 1. Use context7 resolve-library-id tool to get library ID
// 2. Use context7 get-library-docs tool to fetch documentation
// 3. Save results for comparison
```

### Step 2: Compare with existing docs

Read current reference files and compare with new context7 data:

- `references/api-reference.md` - API function documentation
- `references/patterns.md` - Common usage patterns
- `examples/basic-usage.md` - Code examples

### Step 3: Update files using Edit tool

Update each file with new information:

1. **API reference** - Update function signatures, parameters, return types
2. **Patterns** - Update usage patterns and best practices
3. **Examples** - Update code examples with current syntax
4. **Metadata** - Update `.local/context7-source.json` with new `fetchedAt` timestamp

### Step 4: Review and validate

- Verify updated content is accurate
- Check for breaking changes
- Update SKILL.md if core guidance changed

## What Gets Updated

| File                          | Content                                          | Source                   |
| ----------------------------- | ------------------------------------------------ | ------------------------ |
| `references/api-reference.md` | API functions, signatures, parameters            | Extracted from docs      |
| `references/patterns.md`      | Usage patterns, best practices                   | Extracted from docs      |
| `examples/basic-usage.md`     | Code examples (basic, advanced, edge cases)      | Extracted from docs      |
| `.local/context7-source.json` | Metadata: library name, version, fetchedAt, hash | Generated from docs data |

**Note:** `SKILL.md` is NOT auto-updated. Review generated files and manually update `SKILL.md` if needed.

## Context7-Enabled Skills

Skills with context7 documentation have a `.local/context7-source.json` file.

Examples of context7-enabled skills:

- `using-tanstack-query`
- `using-shadcn-ui`
- `using-zustand-state-management`
