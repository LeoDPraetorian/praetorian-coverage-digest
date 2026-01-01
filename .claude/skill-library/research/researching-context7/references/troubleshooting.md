# Troubleshooting Context7 Research

## Common Errors and Solutions

### Error: Cannot find module

**Symptom**:

```
Error: Cannot find module './.claude/tools/context7/resolve-library-id.ts'
```

**Cause**: MCP tools not installed in `.claude/tools/context7/`.

**Solution**:

```bash
cd .claude/tools/context7
npm install
```

**Verification**:

```bash
ls .claude/tools/context7/*.ts
# Should show: resolve-library-id.ts, get-library-docs.ts
```

---

### Error: Empty libraries array

**Symptom**:

```json
{
  "libraries": []
}
```

**Cause**: Library not indexed in Context7, or search term doesn't match any packages.

**Solutions**:

1. **Try alternate names**:

   ```bash
   # Try scoped version
   libraryName: '@tanstack/react-query'
   # Try unscoped version
   libraryName: 'react-query'
   # Try alternate spelling
   libraryName: 'tanstack-query'
   ```

2. **Check official package name** on npm:

   ```bash
   npm search react-query
   # Use exact package name from npm
   ```

3. **Fallback to web research**:
   - Use WebSearch to find official documentation URL
   - Use WebFetch to retrieve documentation
   - Manually parse API patterns

**Fallback workflow**:

```
Context7 empty results
    ↓
Search npm for package name
    ↓
WebSearch for "{package-name} official documentation"
    ↓
WebFetch official docs URL
    ↓
Manual extraction of APIs and patterns
```

---

### Error: Timeout

**Symptom**:

```
Error: Request timeout after 30000ms
```

**Cause**: Large documentation or slow Context7 response.

**Solutions**:

1. **Add topic parameter** to narrow scope:

   ```bash
   # Instead of fetching all docs
   topic: ''

   # Fetch specific section
   topic: 'mutations'
   topic: 'queries'
   topic: 'caching'
   ```

2. **Increase timeout** (if available in MCP wrapper):

   ```typescript
   const result = await getLibraryDocs.execute(
     {
       context7CompatibleLibraryID: "/npm/@tanstack/react-query",
       topic: "",
     },
     { timeout: 60000 }
   ); // 60 seconds
   ```

3. **Retry with exponential backoff**:

   ```typescript
   const retries = 3;
   for (let i = 0; i < retries; i++) {
     try {
       const result = await getLibraryDocs.execute(input);
       break;
     } catch (err) {
       if (i === retries - 1) throw err;
       await sleep(1000 * Math.pow(2, i)); // 1s, 2s, 4s
     }
   }
   ```

---

### Error: Validation error

**Symptom**:

```
ValidationError: libraryName must be a non-empty string
```

**Cause**: Invalid input format (empty string, null, undefined).

**Solution**:

```typescript
// ❌ WRONG
const result = await resolveLibraryId.execute({ libraryName: "" });
const result = await resolveLibraryId.execute({ libraryName: null });

// ✅ CORRECT
const result = await resolveLibraryId.execute({
  libraryName: "@tanstack/react-query",
});
```

**Validation**:

```typescript
if (!libraryName || typeof libraryName !== "string") {
  throw new Error("libraryName must be a non-empty string");
}
```

---

### Error: Library ID not found

**Symptom**:

```
Error: Library ID '/npm/invalid-package' not found
```

**Cause**: Using invalid or outdated library ID.

**Solution**:

Always use library ID from `resolve-library-id` output, never construct manually:

```typescript
// ❌ WRONG - constructing ID manually
const libraryId = `/npm/${packageName}`;

// ✅ CORRECT - using ID from resolve-library-id
const searchResult = await resolveLibraryId.execute({ libraryName });
const libraryId = searchResult.libraries[0].id;
```

---

### Error: JSON parse error

**Symptom**:

```
SyntaxError: Unexpected token in JSON at position 0
```

**Cause**: Command output contains stderr or non-JSON content.

**Solution**:

Redirect stderr to `/dev/null`:

```bash
npx tsx -e "..." 2>/dev/null
```

**Parsing**:

```typescript
try {
  const result = JSON.parse(output);
} catch (err) {
  console.error("Raw output:", output);
  throw new Error("Failed to parse Context7 response");
}
```

---

## Fallback Strategies

### Strategy 1: Web Research

**When to use**: Context7 unavailable, library not indexed, or timeout.

**Workflow**:

```
1. WebSearch: "{library-name} official documentation"
2. Extract official docs URL
3. WebFetch: Retrieve documentation page
4. Parse markdown/HTML for API signatures
5. Extract patterns manually
```

**Example**:

```typescript
// WebSearch
const searchQuery = "@tanstack/react-query official documentation";
const searchResults = await webSearch(searchQuery);

// WebFetch
const docsUrl = "https://tanstack.com/query/latest/docs/framework/react/overview";
const docsContent = await webFetch(docsUrl);

// Manual parsing
const apiPatterns = extractApiPatterns(docsContent);
```

---

### Strategy 2: Repository README

**When to use**: Small libraries, context7 empty, official docs not available.

**Workflow**:

```
1. Find GitHub repository URL
2. WebFetch: https://raw.githubusercontent.com/{owner}/{repo}/main/README.md
3. Parse README for API examples
4. Extract usage patterns
```

**Example**:

```typescript
const readmeUrl = "https://raw.githubusercontent.com/pmndrs/zustand/main/README.md";
const readmeContent = await webFetch(readmeUrl);
```

---

### Strategy 3: npm Package Page

**When to use**: Need version information, basic description.

**Workflow**:

```
1. WebFetch: https://www.npmjs.com/package/{package-name}
2. Extract: version, description, homepage URL
3. Follow homepage URL for documentation
```

---

## Performance Optimization

### Caching Strategy

**Store fetched documentation** to avoid repeated Context7 calls:

```bash
mkdir -p .local/context7-cache

# Save fetched docs
echo "$DOCS_CONTENT" > .local/context7-cache/@tanstack-react-query-v5.28.0.md
```

**Metadata file**:

```json
{
  "libraryId": "/npm/@tanstack/react-query",
  "version": "5.28.0",
  "fetchedAt": "2025-12-30T12:00:00Z",
  "estimatedTokens": 15420,
  "cacheFile": ".local/context7-cache/@tanstack-react-query-v5.28.0.md"
}
```

**Cache invalidation**: Delete cache if version changes or >30 days old.

---

### Parallel Fetching

**When researching multiple libraries**:

```bash
# Fetch in parallel instead of sequential
npx tsx -e "(async () => {
  const promises = libraryIds.map(id =>
    getLibraryDocs.execute({ context7CompatibleLibraryID: id })
  );
  const results = await Promise.all(promises);
})();"
```

**Caution**: Rate limiting may apply, batch in groups of 3-5.

---

### Topic Parameter Usage

**Reduce fetch time** by requesting specific sections:

```bash
# Full docs (slow, 15k tokens)
topic: ''

# Specific section (fast, 3k tokens)
topic: 'mutations'
```

**Token estimates**:

| Scope       | Estimated Tokens | Fetch Time |
| ----------- | ---------------- | ---------- |
| Full docs   | 10-30k           | 5-15s      |
| Topic       | 2-8k             | 2-5s       |
| Single page | 1-3k             | 1-2s       |

---

## Debugging Checklist

When Context7 research fails:

- [ ] MCP tools installed? (`ls .claude/tools/context7/*.ts`)
- [ ] Valid library name? (non-empty string)
- [ ] Library indexed in Context7? (try alternate names)
- [ ] Network connectivity? (test with curl)
- [ ] Timeout too short? (increase or use topic parameter)
- [ ] Parsing errors? (redirect stderr with 2>/dev/null)
- [ ] Library ID valid? (use ID from resolve-library-id, not manual)

---

## Support and Resources

**MCP wrapper location**: `.claude/tools/context7/`

**Skill dependencies**:

- `researching-skills` - Orchestrates research workflow
- `mcp-tools-context7` - Raw MCP tool catalog

**Related documentation**:

- [Context7 MCP Tools Reference](context7-tools.md)
- [Quality Indicators](quality-indicators.md)
- [Documentation Analysis](documentation-analysis.md)

**Known limitations**:

- Only supports npm packages (no PyPI, RubyGems, etc.)
- Documentation may lag behind latest releases (24-48h)
- Rate limiting on Context7 service (unknown threshold)
- Not all npm packages indexed (focus on popular libraries)
