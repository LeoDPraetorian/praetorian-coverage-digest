# Anti-Patterns in Linear API Usage

**Common mistakes and how to avoid them.**

## Anti-Pattern 1: Web Search for API Capabilities

### ❌ WRONG

```
User: "Does Linear support project templates?"

Agent: *Searches web for "Linear API project templates"*
Agent: "According to this blog post from 2023..."
Agent: "Based on Linear's documentation, yes they support it"
```

**Why wrong:**
- External docs may be outdated (blog from 2023, now it's 2026)
- Can't verify what OUR wrappers support
- No way to test claims against live API
- Blog may reference features we haven't implemented

### ✅ RIGHT

```
User: "Does Linear support project templates?"

Agent: *Checks .claude/tools/linear/create-project.ts INPUT FIELDS*
Agent: "Our wrapper doesn't include templateId."
Agent: *Queries API directly with callMCPTool*
Agent: "API supports templateId but our wrapper needs updating. Here's the exact field structure I tested..."
```

**Why right:**
- Checks our implementation first
- Verifies against live API
- Can provide exact field structure
- Knows what we support vs what API supports

## Anti-Pattern 2: Assuming Field Names

### ❌ WRONG

```typescript
// "I assume templates use 'template' field"
await createProject.execute({
  name: 'Test',
  template: 'template-id'  // ❌ Guessed field name
});
```

**Why wrong:**
- Field might be `templateId` not `template`
- Field might be an object, not a string
- API might not support templates at all
- Wastes time debugging wrong field names

### ✅ RIGHT

```typescript
// 1. Check wrapper docs first
// 2. If not documented, run discovery
npx tsx .claude/tools/linear/internal/create-project-discover.ts

// 3. Query API directly to test
const test = await callMCPTool('linear', 'projectCreate', {
  name: 'Test',
  team: 'TEAM-ID',
  templateId: 'template-id'  // ✅ Verified field name
});
```

**Why right:**
- Verifies exact field name
- Confirms field type
- Tests against live API
- Documents findings for others

## Anti-Pattern 3: Ignoring "Schema Discovery Results"

### ❌ WRONG

```typescript
// "This wrapper is old, I'll trust the Linear docs instead"

// External docs say field is required
await createProject.execute({
  name: 'Test',
  // Missing 'description' because docs said required
});
// Error: description is actually optional
```

**Why wrong:**
- Schema Discovery Results is tested against OUR workspace
- Shows ACTUAL behavior, not theoretical
- Documents edge cases we discovered
- External docs don't know our implementation

### ✅ RIGHT

```typescript
// Read "Schema Discovery Results" comment
// Shows: description: string (optional)

await createProject.execute({
  name: 'Test',
  // description omitted - comment says optional ✅
});
```

**Why right:**
- Comment is source of truth for our wrappers
- Tested against actual API responses
- Updated when wrapper changes
- Version controlled with code

## Anti-Pattern 4: Not Checking errors Array

### ❌ WRONG

```typescript
const response = await fetch(GRAPHQL_ENDPOINT, {...});

if (response.ok) {
  const data = await response.json();
  return data;  // Might have errors!
}
```

**Why wrong:**
- GraphQL returns HTTP 200 even with errors
- Partial success is possible (some fields succeed, others fail)
- Errors array contains critical information
- Silent failures are hard to debug

### ✅ RIGHT

```typescript
const response = await fetch(GRAPHQL_ENDPOINT, {...});
const { data, errors } = await response.json();

if (errors && errors.length > 0) {
  console.error('GraphQL errors:', errors);
  throw new GraphQLError(errors);
}

return data;
```

**Why right:**
- Always checks errors array first
- Fails fast with clear error messages
- Prevents silent failures
- Matches GraphQL best practices

## Anti-Pattern 5: Client-Side Filtering

### ❌ WRONG

```typescript
// Fetch all issues, filter in code
const allIssues = await listIssues.execute({ limit: 1000 });
const myIssues = allIssues.filter(issue =>
  issue.assignee?.id === userId &&
  issue.state?.name === 'In Progress'
);
```

**Why wrong:**
- Fetches 1000 issues when you might need 10
- Wastes API quota (hits rate limits faster)
- Slower (more data transfer)
- More tokens consumed

### ✅ RIGHT

```typescript
// Filter at source (server-side)
const myIssues = await listIssues.execute({
  limit: 50,
  assignee: userId,
  state: 'In Progress'
});
```

**Why right:**
- Only fetches what you need
- Reduces API calls
- Faster response
- Lower token usage

## Anti-Pattern 6: Skipping Field Verification

### ❌ WRONG

```typescript
// "This field probably exists, let me just use it"
await updateIssue.execute({
  id: 'ISSUE-ID',
  customFieldValue: 'foo'  // ❌ Never verified this exists
});

// Error: Field 'customFieldValue' doesn't exist
```

**Why wrong:**
- Wastes time with trial-and-error
- Creates confusing errors
- No documentation for future developers
- May partially succeed (GraphQL partial success)

### ✅ RIGHT

```typescript
// 1. Check wrapper docs
Read('.claude/tools/linear/update-issue.ts')

// 2. If not documented, run discovery
npx tsx .claude/tools/linear/internal/update-issue-discover.ts

// 3. If still unsure, test directly
const test = await callMCPTool('linear', 'update_issue', {
  id: 'ISSUE-ID',
  customFieldValue: 'foo'
});

// 4. Document findings and add to wrapper
```

**Why right:**
- Verifies field exists before using
- Documents for others
- Catches errors early
- Updates wrapper for future use

## Anti-Pattern 7: Hardcoding Token/Auth

### ❌ WRONG

```typescript
const response = await fetch('https://api.linear.app/graphql', {
  headers: {
    'Authorization': 'lin_api_abc123...',  // ❌ Hardcoded
  },
});
```

**Why wrong:**
- Security risk (token in source code)
- No token refresh for OAuth
- Can't switch between API key and OAuth
- Token might expire

### ✅ RIGHT

```typescript
// Use wrapper which handles auth
const client = await createLinearClient();

// Or if using environment variables
const response = await fetch('https://api.linear.app/graphql', {
  headers: {
    'Authorization': process.env.LINEAR_API_KEY,
  },
});
```

**Why right:**
- Secure (no tokens in code)
- OAuth refresh handled automatically
- Easy to switch auth methods
- Environment-based configuration

## Anti-Pattern 8: Ignoring Schema Drift

### ❌ WRONG

```
// Gets error: Field "state" must not have a selection
// Response: "The wrapper must be broken, I'll rewrite it"
```

**Why wrong:**
- Wrapper was working, API changed
- Rewriting wastes time
- Doesn't address root cause (schema drift)
- Same error will recur

### ✅ RIGHT

```
// Gets error: Field "state" must not have a selection
// Response: "API schema changed, state is now a string not object"

// 1. Run discovery to confirm
npx tsx .claude/tools/linear/internal/get-project-discover.ts

// 2. Update wrapper GraphQL query
// Remove: state { id name type }
// Add: state

// 3. Update TypeScript interfaces and Zod schemas
// Change: state: z.object({...})
// To: state: z.string().optional()
```

**Why right:**
- Identifies root cause (API change)
- Minimal fix (update query structure)
- Verifies with discovery script
- Documents the change

## Anti-Pattern 9: No Pagination

### ❌ WRONG

```typescript
// Fetch everything at once
const allIssues = await listIssues.execute({
  limit: 10000  // ❌ Way too many
});
```

**Why wrong:**
- May hit API limits (max 250 per page)
- Slow response time
- Memory issues with large datasets
- Wastes API quota

### ✅ RIGHT

```typescript
let hasMore = true;
let cursor = null;
const allIssues = [];

while (hasMore) {
  const result = await listIssues.execute({
    limit: 50,
    after: cursor
  });

  allIssues.push(...result.nodes);
  hasMore = result.pageInfo.hasNextPage;
  cursor = result.pageInfo.endCursor;

  console.log(`Fetched ${allIssues.length} issues so far...`);
}
```

**Why right:**
- Respects API limits
- Provides progress feedback
- Memory efficient
- Can stop early if needed

## Anti-Pattern 10: Trusting HTTP Status Alone

### ❌ WRONG

```typescript
const response = await fetch(GRAPHQL_ENDPOINT, {...});

if (!response.ok) {
  throw new Error('API request failed');
}

return await response.json();  // Might have GraphQL errors!
```

**Why wrong:**
- GraphQL returns 200 even with errors
- Missing errors array check
- Silent failures
- Confusing debugging

### ✅ RIGHT

```typescript
const response = await fetch(GRAPHQL_ENDPOINT, {...});

// Check HTTP status first
if (!response.ok) {
  throw new Error(`HTTP error: ${response.status}`);
}

// Then check GraphQL errors
const { data, errors } = await response.json();

if (errors && errors.length > 0) {
  throw new GraphQLError(errors);
}

return data;
```

**Why right:**
- Checks both HTTP and GraphQL errors
- Clear error messages
- Catches all failure modes
- Follows GraphQL best practices

## Summary: Do's and Don'ts

### DO

✅ Check codebase sources first (wrapper comments, discovery scripts)
✅ Verify fields with discovery or direct queries
✅ Always check errors array (even with HTTP 200)
✅ Filter at source (server-side filtering)
✅ Use pagination for large datasets
✅ Test against live API when unsure
✅ Document findings in wrapper comments
✅ Use environment variables for auth

### DON'T

❌ Search web for API capabilities
❌ Assume field names without verification
❌ Ignore "Schema Discovery Results" comments
❌ Skip errors array check
❌ Fetch everything and filter in code
❌ Hardcode auth tokens
❌ Ignore schema drift errors
❌ Trust HTTP status alone
❌ Use wrappers blindly without understanding
❌ Skip field verification before using

## Related Files

- `sources-of-truth.md` - Why codebase > external docs
- `field-verification.md` - How to verify fields correctly
- `fixing-graphql-errors.md` - Proper error handling
- `direct-querying.md` - When and how to query API directly
- Wrapper files - "Schema Discovery Results" as source of truth
