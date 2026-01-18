# Fixing GraphQL Errors from Linear API

**Common GraphQL errors and how to debug them.**

## Critical Principle: Always Check errors Array

**Even with HTTP 200, GraphQL can have errors.**

GraphQL allows partial success - some fields succeed, others fail, HTTP returns 200 with an `errors` array.

```typescript
// ❌ WRONG: Only check HTTP status
const response = await fetch(GRAPHQL_ENDPOINT, {...});
if (response.ok) {
  return await response.json(); // Might have errors!
}

// ✅ RIGHT: Always check errors array
const response = await fetch(GRAPHQL_ENDPOINT, {...});
const { data, errors } = await response.json();

if (errors && errors.length > 0) {
  console.error('GraphQL errors:', errors);
  throw new GraphQLError(errors);
}

return data;
```

## Common Error Types

### 1. Field Validation Errors

**Error message:**
```
Cannot query field "templateId" on type "ProjectCreateInput"
```

**Meaning:** The field doesn't exist in Linear's schema (or you have a typo).

**Debug steps:**

1. **Check field name spelling**
```bash
# Is it templateId or template_id?
grep -i "template" .claude/tools/linear/create-project.ts
```

2. **Run introspection to verify field exists**
```bash
npx tsx .claude/tools/linear/internal/create-project-discover.ts
```

3. **Check Apollo Studio**
Visit `studio.apollographql.com/public/Linear-API/schema/reference` and search for the type.

**Fix:** Either correct the field name or remove it if API doesn't support it.

### 2. Schema Drift Errors

**Error message:**
```
Field "state" must not have a selection since type "String!" has no subfields
```

**Meaning:** API schema changed - `state` used to be an object, now it's a string scalar.

**How this happens:**
- Linear updates their API
- Our wrapper still queries `state { id name type }`
- API now returns `state` as plain string

**Debug steps:**

1. **Identify the query in error message**
```bash
# Error shows which file
grep -n "state {" .claude/tools/linear/get-project.ts
```

2. **Check what API currently returns**
```bash
npx tsx -e "
import { callMCPTool } from './.claude/tools/config/lib/mcp-client.js';
const result = await callMCPTool('linear', 'get_project', { id: 'PROJECT-ID' });
console.log('state field:', typeof result.state, result.state);
"
```

**Fix:**

```typescript
// Before (queries nested object):
const GET_PROJECT_QUERY = `
  query Project($id: String!) {
    project(id: $id) {
      state {
        id
        name
        type
      }
    }
  }
`;

// After (queries scalar):
const GET_PROJECT_QUERY = `
  query Project($id: String!) {
    project(id: $id) {
      state
    }
  }
`;

// Update TypeScript interface:
interface ProjectResponse {
  project: {
    state?: string | null;  // Changed from object to string
  };
}

// Update Zod schema:
export const getProjectOutput = z.object({
  state: z.string().optional(),  // Changed from object to string
});
```

### 3. Rate Limiting (HTTP 429)

**Error message:**
```
Rate limit exceeded. Please retry after N seconds.
```

**Rates:**
- Personal API Keys: 1,500 requests/hour
- OAuth 2.0: 500 requests/hour

**Debug steps:**

1. **Check which auth method you're using**
```typescript
// Check Authorization header format
// "Authorization: YOUR_KEY" → Personal API key (1,500/hr limit)
// "Authorization: Bearer YOUR_TOKEN" → OAuth (500/hr limit)
```

2. **Implement exponential backoff**
```typescript
async function executeWithRetry(operation: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (error.statusCode === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        console.log(`Rate limited. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

**Fix:**
- Switch to Personal API Keys if using OAuth (higher limit)
- Implement request batching/caching
- Add exponential backoff

### 4. Authentication Failures

**Error message:**
```
Authentication required, not authenticated
```

**Common causes:**
- Missing Authorization header
- Expired OAuth token
- Invalid API key

**Debug steps:**

1. **Verify token format**
```bash
# OAuth requires "Bearer " prefix
echo "Authorization: Bearer $TOKEN"

# Personal API keys have no prefix
echo "Authorization: $API_KEY"
```

2. **Test token validity**
```bash
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ viewer { id name } }"}'

# Should return user info if valid
```

3. **Check token expiration (OAuth only)**
```bash
# OAuth tokens expire - check token manager
ls ~/.claude-oauth/linear.json
cat ~/.claude-oauth/linear.json | jq '.expiresAt'
```

**Fix:**

```typescript
// Wrapper handles this automatically via createLinearClient()
const client = await createLinearClient();
// → Refreshes OAuth token if expired
// → Adds correct Authorization header format
```

### 5. Malformed Requests

**Error message:**
```
Syntax Error: Expected Name, found }
```

**Meaning:** Invalid GraphQL syntax.

**Common mistakes:**

```graphql
# ❌ WRONG: Extra comma
query GetIssue {
  issue {
    id,   ← No commas in GraphQL
    title
  }
}

# ❌ WRONG: Missing $ on variable
query GetIssue(id: String!) {  ← Should be $id
  issue(id: id) {
    title
  }
}

# ❌ WRONG: Mismatched braces
query GetIssue {
  issue {
    id
    title
  }  ← Missing closing brace
}

# ✅ RIGHT:
query GetIssue($id: String!) {
  issue(id: $id) {
    id
    title
  }
}
```

**Debug steps:**

1. **Test query in Apollo Studio**
   - Visit `studio.apollographql.com/public/Linear-API/schema/reference`
   - Paste your query
   - Studio highlights syntax errors

2. **Use GraphQL validator**
```bash
npm install -g graphql
echo 'your query' | graphql validate
```

**Fix:** Correct the syntax based on error message.

## Multi-Layer Error Handling Strategy

Based on research, implement three layers of error handling:

### Layer 1: Validation (Before API Call)

```typescript
try {
  const validated = createProjectParams.parse(input);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Validation error:', error.issues);
    // Example: [{ path: ['name'], message: 'Required' }]
  }
  throw error;
}
```

### Layer 2: GraphQL Execution (Parse errors Array)

```typescript
const response = await executeGraphQL(client, QUERY, variables);

// executeGraphQL in graphql-helpers.ts handles this:
if (result.errors && result.errors.length > 0) {
  throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
}
```

### Layer 3: Runtime (Network/Auth Issues)

```typescript
try {
  const result = await operation.execute(input);
} catch (error) {
  if (error.message.includes('401')) {
    console.error('Authentication failed. Check API key/OAuth token.');
  } else if (error.message.includes('429')) {
    console.error('Rate limit exceeded. Implement backoff.');
  } else if (error.message.includes('Cannot query field')) {
    console.error('Field does not exist. Check schema.');
  } else {
    console.error('Unknown error:', error.message);
  }
  throw error;
}
```

## Error Recovery Workflow

```
┌──────────────────┐
│ GraphQL Error    │
│ Occurs           │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│ 1. Read error    │
│    message       │
└────────┬─────────┘
         │
         ↓
┌──────────────────────────────────┐
│ Error Type?                      │
├──────────┬───────────────────────┤
│ "Cannot  │ "Rate"  │ "Auth" │ Syntax
│ query    │ limit"  │        │
│ field"   │         │        │
└────┬─────┴────┬────┴───┬────┴────┘
     │          │        │       │
     ↓          ↓        ↓       ↓
┌─────────┐ ┌──────┐ ┌──────┐ ┌────────┐
│ Run     │ │Retry │ │Check │ │Test in │
│discovery│ │with  │ │token │ │Apollo  │
│ script  │ │back  │ │      │ │Studio  │
│         │ │off   │ │      │ │        │
└────┬────┘ └──┬───┘ └──┬───┘ └───┬────┘
     │         │        │         │
     ↓         ↓        ↓         ↓
┌─────────────────────────────────┐
│ Fix and retry                   │
└─────────────────────────────────┘
```

## Debugging Checklist

When you encounter a GraphQL error:

- [ ] Read full error message (don't skip context)
- [ ] Check if it's a field validation error (field name issue)
- [ ] Check if it's schema drift (object → scalar change)
- [ ] Check if it's rate limiting (429 status)
- [ ] Check if it's auth failure (401/403 status)
- [ ] Check if it's syntax error (malformed query)
- [ ] Test query in Apollo Studio (isolate query issue)
- [ ] Run discovery script (verify current schema)
- [ ] Check wrapper "Schema Discovery Results" comment (expected structure)
- [ ] Query API directly with callMCPTool (bypass wrapper)

## Tools for Debugging

| Tool | Purpose | When to Use |
|------|---------|-------------|
| Apollo Studio | Test queries interactively | Syntax errors, field verification |
| Discovery scripts | Analyze current API structure | Schema drift, field changes |
| callMCPTool | Direct API testing | Bypass wrapper, test raw responses |
| graphql-helpers.ts logs | See exact GraphQL request/response | Debug query construction |
| ~/.claude-oauth/linear.json | Check OAuth token expiration | Auth failures |

## Related Files

- `graphql-helpers.ts` - executeGraphQL with error parsing
- `client.ts` - OAuth token refresh logic
- `internal/*-discover.ts` - Schema discovery for debugging
- `field-verification.md` - How to verify fields exist
- `sources-of-truth.md` - Where to find correct field info
