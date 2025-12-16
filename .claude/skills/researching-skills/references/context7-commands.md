# Context7 Commands Reference

Commands for searching and fetching library documentation from Context7.

## Prerequisites

Ensure MCP tools are available:
```bash
ls .claude/tools/context7/
```

## Search for Library

Search Context7 for a library by name:

```bash
npx tsx -e "(async () => {
  const { resolveLibraryId } = await import('./.claude/tools/context7/resolve-library-id.ts');
  const result = await resolveLibraryId.execute({ libraryName: 'LIBRARY_NAME' });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Replace** `LIBRARY_NAME` with:
- Package name: `@tanstack/react-query`, `zustand`, `zod`
- Library name: `tanstack query`, `react router`
- Topic: `state management`, `form validation`

## Fetch Documentation

After selecting a package ID from search results:

```bash
npx tsx -e "(async () => {
  const { getLibraryDocs } = await import('./.claude/tools/context7/get-library-docs.ts');
  const result = await getLibraryDocs.execute({
    context7CompatibleLibraryID: 'PACKAGE_ID',
    topic: 'OPTIONAL_TOPIC'
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Parameters**:
- `context7CompatibleLibraryID` (required): Package ID from search results
- `topic` (optional): Focus area like "hooks", "mutations", "configuration"

## Result Quality Indicators

When presenting search results to the user:

| Indicator | Meaning | Action |
|-----------|---------|--------|
| ✅ Recommended | Main package, stable version | Select by default |
| ⚠️ Caution | Internal package (`-core`), pre-release (alpha/beta/rc) | Ask user to confirm |
| ❌ Deprecated | Contains "deprecated" in name/description | Skip unless explicitly requested |

## Example Workflow

```bash
# 1. Search for TanStack Query
npx tsx -e "(async () => {
  const { resolveLibraryId } = await import('./.claude/tools/context7/resolve-library-id.ts');
  const result = await resolveLibraryId.execute({ libraryName: '@tanstack/react-query' });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null

# 2. Fetch docs for selected package (using ID from results)
npx tsx -e "(async () => {
  const { getLibraryDocs } = await import('./.claude/tools/context7/get-library-docs.ts');
  const result = await getLibraryDocs.execute({
    context7CompatibleLibraryID: 'tanstack-react-query',
    topic: 'useQuery'
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `Cannot find module` | Tools not built | Run `npm install` in `.claude/tools/context7/` |
| Empty results | Library not indexed | Try alternate name or use web research |
| Timeout | Large documentation | Add `topic` parameter to narrow scope |

## Related

- [Context7 Integration](context7-integration.md) - Detailed integration patterns
- [Source Quality](source-quality.md) - Quality scoring criteria
