# MCP Tools Registry - Troubleshooting

Common issues when using MCP tool wrappers.

## Response Format Issues

### Issue: "forEach is not a function"

**Symptom:**

```
TypeError: result.items.forEach is not a function
```

**Cause:** You're calling an MCP server directly instead of using a wrapper, and the response format wasn't what you expected.

**Background:** MCP servers return data in **variable formats**:

- **Direct array**: `[item1, item2, ...]`
- **Tuple format**: `[[item1, item2, ...], offset]` (paginated)
- **Object format**: `{ data: [...], pagination: {...} }`

**Fix:** Use the wrapper - it handles format normalization:

```bash
# ✅ CORRECT: Use wrapper with stderr suppression
npx tsx -e "(async () => {
  const { assetsList } = await import('./.claude/tools/praetorian-cli/assets-list.ts');
  const result = await assetsList.execute({ pages: 1 });
  result.assets.forEach(a => console.log(a.name));  // Always works!
})();" 2>/dev/null
```

**If extending a wrapper:** Use the defensive pattern:

```typescript
// Inside filtering function:
const items = Array.isArray(rawResult[0])
  ? rawResult[0] // Tuple format: [[data], offset]
  : rawResult; // Direct array format

const nextOffset = Array.isArray(rawResult[0])
  ? rawResult[1] // Extract pagination offset from tuple
  : null; // No offset in other formats
```

---

### Issue: Missing `next_offset` for pagination

**Symptom:** Pagination doesn't work - `next_offset` is always `null`.

**Cause:** MCP server returns direct array format (no pagination), or tuple format not detected.

**Diagnosis:**

```bash
npx tsx -e "(async () => {
  const { assetsList } = await import('./.claude/tools/praetorian-cli/assets-list.ts');
  const result = await assetsList.execute({ pages: 1 });
  console.log('next_offset:', result.next_offset);
  console.log('total_count:', result.summary.total_count);
})();" 2>/dev/null
```

**Note:** Some MCP endpoints don't support pagination. Check if `total_count > returned_count` to know if more data exists.

---

## Data Issues

### Issue: Wrapper returns empty results

**Possible causes:**

1. **Filter too restrictive** - Try removing `key_prefix` or `prefix_filter`
2. **No data exists** - Check `summary.total_count`
3. **Authentication issue** - Check MCP server credentials

**Debug:**

```bash
npx tsx -e "(async () => {
  const { assetsList } = await import('./.claude/tools/praetorian-cli/assets-list.ts');
  const result = await assetsList.execute({ pages: 1 });
  console.log('Summary:', JSON.stringify(result.summary, null, 2));
})();" 2>/dev/null
```

---

## Import Issues

### Issue: Import not found

**Symptom:**

```
Error: Cannot find module './.claude/tools/praetorian-cli/assets-list.ts'
```

**Fixes:**

1. **Check file exists:** `ls .claude/tools/praetorian-cli/`
2. **Use correct extension:** Import `.js` even though source is `.ts`
3. **Check path:** Must start with `./` for relative imports

### Issue: Export name mismatch

**Symptom:**

```
SyntaxError: The requested module does not provide an export named 'assetList'
```

**Cause:** Export name doesn't match filename convention.

**Convention:** kebab-case filename → camelCase export

- `assets-list.ts` → `assetsList`
- `get-issue.ts` → `getIssue`
- `search-by-query.ts` → `searchByQuery`

**Verify:**

```bash
grep "^export const" .claude/tools/praetorian-cli/assets-list.ts
# Should output: export const assetsList = {
```

---

## Execution Issues

### Issue: npx tsx command fails

**Symptom:**

```
sh: npx: command not found
```

**Fix:** Ensure Node.js and npm are installed and in PATH.

### Issue: Timeout on MCP call

**Symptom:** Command hangs or times out after 30+ seconds.

**Possible causes:**

1. **MCP server not responding** - Check server health
2. **Network issue** - Check connectivity
3. **Large dataset** - Reduce `pages` parameter

**Debug with timeout:**

```bash
timeout 10s npx tsx -e "(async () => {
  const { assetsList } = await import('./.claude/tools/praetorian-cli/assets-list.ts');
  const result = await assetsList.execute({ pages: 1 });
  console.log('Success:', result.summary.total_count);
})();" 2>/dev/null || echo "Command timed out after 10s"
```

---

## Related

- **mcp-code-create** - How wrappers handle response formats
- **mcp-code-test** - Testing wrapper response handling
