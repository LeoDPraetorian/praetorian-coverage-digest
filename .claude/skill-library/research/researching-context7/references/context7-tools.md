# Context7 MCP Tools Reference

## Tool Catalog

Context7 provides 2 MCP tools for library documentation research:

### Tool 1: resolve-library-id

**Purpose**: Search for libraries by name or topic, returns library IDs for documentation fetch.

**Input Schema**:

```typescript
interface ResolveLibraryIdInput {
  libraryName: string; // Package name or search term (required)
}
```

**Output Schema**:

```typescript
interface ResolveLibraryIdOutput {
  libraries: Array<{
    id: string; // Context7-compatible library ID (e.g., "/npm/@tanstack/react-query")
    name: string; // Package name
    version: string; // Semantic version
    description: string; // Package description
  }>;
}
```

**Execution Pattern**:

```bash
npx tsx -e "(async () => {
  const { resolveLibraryId } = await import('./.claude/tools/context7/resolve-library-id.ts');
  const result = await resolveLibraryId.execute({ libraryName: 'LIBRARY_NAME' });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Example**:

```bash
# Search for React Query
npx tsx -e "(async () => {
  const { resolveLibraryId } = await import('./.claude/tools/context7/resolve-library-id.ts');
  const result = await resolveLibraryId.execute({ libraryName: '@tanstack/react-query' });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Output**:

```json
{
  "libraries": [
    {
      "id": "/npm/@tanstack/react-query",
      "name": "@tanstack/react-query",
      "version": "5.28.0",
      "description": "Powerful asynchronous state management for TS/JS, React, Vue, and more"
    },
    {
      "id": "/npm/@tanstack/react-query-devtools",
      "name": "@tanstack/react-query-devtools",
      "version": "5.28.0",
      "description": "Developer tools for React Query"
    }
  ]
}
```

---

### Tool 2: get-library-docs

**Purpose**: Fetch official documentation for a specific library ID.

**Input Schema**:

```typescript
interface GetLibraryDocsInput {
  context7CompatibleLibraryID: string; // Library ID from resolve-library-id (required)
  topic?: string; // Optional topic to focus documentation (e.g., "mutations", "queries")
}
```

**Output Schema**:

```typescript
interface GetLibraryDocsOutput {
  libraryName: string; // Package name
  version: string; // Semantic version
  content: string; // Markdown documentation
  estimatedTokens: number; // Token count estimate
}
```

**Execution Pattern**:

```bash
npx tsx -e "(async () => {
  const { getLibraryDocs } = await import('./.claude/tools/context7/get-library-docs.ts');
  const result = await getLibraryDocs.execute({
    context7CompatibleLibraryID: 'LIBRARY_ID',
    topic: 'OPTIONAL_TOPIC'
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Example (Full Documentation)**:

```bash
# Fetch all React Query docs
npx tsx -e "(async () => {
  const { getLibraryDocs } = await import('./.claude/tools/context7/get-library-docs.ts');
  const result = await getLibraryDocs.execute({
    context7CompatibleLibraryID: '/npm/@tanstack/react-query',
    topic: ''
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Example (Focused Topic)**:

```bash
# Fetch only mutation-related docs
npx tsx -e "(async () => {
  const { getLibraryDocs } = await import('./.claude/tools/context7/get-library-docs.ts');
  const result = await getLibraryDocs.execute({
    context7CompatibleLibraryID: '/npm/@tanstack/react-query',
    topic: 'mutations'
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Output**:

```json
{
  "libraryName": "@tanstack/react-query",
  "version": "5.28.0",
  "content": "# TanStack Query Documentation\n\n## Quick Reference\n...",
  "estimatedTokens": 15420
}
```

---

## Tool Invocation Workflow

```
User Request
     ↓
1. resolve-library-id (search)
     ↓
   Parse results
     ↓
   Apply quality indicators
     ↓
2. User confirmation (if multiple)
     ↓
3. get-library-docs (fetch)
     ↓
   Parse markdown
     ↓
   Extract APIs
     ↓
4. Synthesis output
```

---

## Import Paths

**Absolute paths** (from repo root):

```typescript
// resolve-library-id
import { resolveLibraryId } from "./.claude/tools/context7/resolve-library-id.ts";

// get-library-docs
import { getLibraryDocs } from "./.claude/tools/context7/get-library-docs.ts";
```

**Relative paths** (from skill directory):

```typescript
// From .claude/skill-library/claude/skill-management/researching-context7/
import { resolveLibraryId } from "../../../../tools/context7/resolve-library-id.ts";
import { getLibraryDocs } from "../../../../tools/context7/get-library-docs.ts";
```

---

## Error Handling

### Common Errors

| Error                   | Cause                             | Solution                                     |
| ----------------------- | --------------------------------- | -------------------------------------------- |
| `Cannot find module`    | MCP tools not installed           | Run `npm install` in .claude/tools/context7/ |
| `Empty libraries array` | Library not indexed in Context7   | Try alternate name or fallback to web        |
| `Timeout`               | Large documentation or slow fetch | Add `topic` parameter to narrow scope        |
| `Validation error`      | Invalid input format              | Check libraryName is non-empty string        |
| `Library ID not found`  | Invalid ID format                 | Use ID from resolve-library-id output        |

### Retry Strategy

```typescript
// Retry with alternate names
const alternateNames = ["@tanstack/react-query", "react-query", "tanstack-query"];

for (const name of alternateNames) {
  const result = await resolveLibraryId.execute({ libraryName: name });
  if (result.libraries.length > 0) {
    break;
  }
}
```

---

## Topic Parameter Usage

**When to use topic parameter**:

- Documentation is very large (>20k tokens)
- You only need specific section (mutations, queries, caching)
- Faster fetch times required

**Common topics**:

| Library               | Common Topics                         |
| --------------------- | ------------------------------------- |
| @tanstack/react-query | queries, mutations, caching, devtools |
| zustand               | store, middleware, persistence        |
| zod                   | schemas, validation, errors           |
| react-hook-form       | validation, errors, performance       |

**Default**: Empty string (`topic: ''`) fetches all documentation.

---

## Token Estimates

**Use `estimatedTokens` for planning**:

- <5k tokens: Quick reference, can include in skill
- 5-15k tokens: Moderate, extract key sections
- 15-30k tokens: Large, focus on specific APIs
- > 30k tokens: Very large, use topic parameter

---

## Integration with Skill Creation

**When creating library/framework skills**:

1. Use resolve-library-id to find package
2. Use get-library-docs to fetch official documentation
3. Extract API signatures and patterns
4. Populate skill references/ with analyzed content
5. Store Context7 metadata in `.local/context7-source.json`:

```json
{
  "libraryId": "/npm/@tanstack/react-query",
  "version": "5.28.0",
  "fetchedAt": "2025-12-30T12:00:00Z",
  "estimatedTokens": 15420
}
```

This enables staleness detection (>30 days old = warning).
