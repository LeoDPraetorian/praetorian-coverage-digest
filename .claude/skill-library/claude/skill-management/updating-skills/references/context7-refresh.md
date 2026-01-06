# Context7 Documentation Refresh

Skills created from context7 data (library/framework documentation) can become stale as upstream libraries evolve. This document explains automatic staleness detection and refresh workflows.

## Automatic Staleness Detection

The update CLI automatically detects when context7 documentation is more than 30 days old:

1. When running `npm run update -- <skill> "changes"`, the CLI checks for `.local/context7-source.json`
2. If found and `fetchedAt` date is >30 days old, shows yellow warning: `⚠️ Context7 docs are {N} days old`
3. Prompts: `Check for documentation updates first?`
4. If you select "Yes", displays refresh instructions and exits (preventing outdated skill updates)
5. If you select "No", proceeds with regular update workflow

This prevents accidentally updating skills with stale library documentation.

## Manual Refresh Workflow

To refresh context7 documentation for a skill:

### Step 1: Query context7 MCP

Use the context7 MCP server to fetch updated documentation:

```bash
# Use context7 resolve-library-id and get-library-docs tools
# Save results to a JSON file
```

### Step 2: Run refresh command

```bash
npm run update -- <skill-name> --refresh-context7 --context7-data /path/to/new-docs.json
```

### Step 3: Review changes

The CLI will:

- Compare old and new documentation (hash-based diff)
- Display summary: new APIs, deprecated APIs, changed signatures
- Update these files automatically:
  - `references/api-reference.md` - API function documentation
  - `references/patterns.md` - Common usage patterns
  - `examples/basic-usage.md` - Code examples
  - `.local/context7-source.json` - Metadata (fetchedAt, version, hash)

## What Gets Updated

| File                          | Content                                          | Source                   |
| ----------------------------- | ------------------------------------------------ | ------------------------ |
| `references/api-reference.md` | API functions, signatures, parameters            | Extracted from docs      |
| `references/patterns.md`      | Usage patterns, best practices                   | Extracted from docs      |
| `examples/basic-usage.md`     | Code examples (basic, advanced, edge cases)      | Extracted from docs      |
| `.local/context7-source.json` | Metadata: library name, version, fetchedAt, hash | Generated from docs data |

**Note:** `SKILL.md` is NOT auto-updated. Review generated files and manually update `SKILL.md` if needed.

## Context7-Enabled Skills

Skills with context7 documentation have a `.local/context7-source.json` file containing:

```json
{
  "libraryName": "tanstack-query",
  "libraryId": "...",
  "fetchedAt": "2024-12-28T10:30:00.000Z",
  "version": "5.0.0",
  "docsHash": "abc123..."
}
```

Examples of context7-enabled skills:

- `using-tanstack-query`
- `using-shadcn-ui`
- `using-zustand-state-management`
