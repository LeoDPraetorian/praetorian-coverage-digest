# Direct API Querying

**How to bypass wrappers and query Linear's GraphQL API directly.**

## When to Query Directly

Use direct queries when:
- Testing if API supports a field before adding to wrapper
- Debugging wrapper behavior (is it the wrapper or the API?)
- Prototyping new operations not yet wrapped
- Verifying schema changes after errors

## Method 1: Using callMCPTool (Recommended)

**Best for:** Quick tests, prototyping, verification

```typescript
import { callMCPTool } from './.claude/tools/config/lib/mcp-client';

// Query the API
const result = await callMCPTool(
  'linear',              // MCP server name
  'projectCreate',       // Operation name (snake_case)
  {                      // Parameters
    name: 'Test Project',
    team: 'TEAM-ID',
    templateId: 'TEMPLATE-ID'
  }
);

console.log('Result:', result);
```

**Finding operation names:**

```bash
# List all Linear MCP operations
npx mcp-remote https://mcp.linear.app/sse list

# Common operations:
# - get_issue, list_issues, create_issue, update_issue
# - get_project, list_projects, create_project, update_project
# - list_teams, get_team
# - list_users, find_user
```

## Method 2: Raw HTTP POST

**Best for:** Complete control, debugging auth

```bash
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query GetIssue($id: String!) { issue(id: $id) { id title } }",
    "variables": {"id": "CHARIOT-123"}
  }'
```

**TypeScript version:**

```typescript
const response = await fetch('https://api.linear.app/graphql', {
  method: 'POST',
  headers: {
    'Authorization': process.env.LINEAR_API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: `
      query GetIssue($id: String!) {
        issue(id: $id) {
          id
          title
          description
        }
      }
    `,
    variables: { id: 'CHARIOT-123' },
  }),
});

const { data, errors } = await response.json();

if (errors) {
  console.error('GraphQL errors:', errors);
} else {
  console.log('Result:', data);
}
```

## Authentication Methods

### Personal API Keys (Simpler, Higher Limits)

```bash
# No "Bearer" prefix
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: lin_api_..." \
  -H "Content-Type: application/json" \
  -d '{"query": "..."}'
```

**Rate limit:** 1,500 requests/hour

### OAuth 2.0 Bearer Tokens (Production)

```bash
# Requires "Bearer" prefix
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{"query": "..."}'
```

**Rate limit:** 500 requests/hour

## Pagination Pattern (Cursor-Based)

Linear uses Relay-style cursor pagination:

```typescript
// Initial query
let hasNextPage = true;
let cursor = null;
const allIssues = [];

while (hasNextPage) {
  const result = await callMCPTool('linear', 'list_issues', {
    first: 50,  // Page size
    after: cursor,  // Cursor from previous page
  });

  allIssues.push(...result.issues.nodes);

  hasNextPage = result.issues.pageInfo.hasNextPage;
  cursor = result.issues.pageInfo.endCursor;
}

console.log(`Fetched ${allIssues.length} issues`);
```

**GraphQL query structure:**

```graphql
query ListIssues($first: Int!, $after: String) {
  issues(first: $first, after: $after) {
    nodes {
      id
      title
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

## Testing New Fields

**Scenario:** "Does Linear support project templates?"

```typescript
import { callMCPTool } from './.claude/tools/config/lib/mcp-client';

// Test 1: Try with templateId
try {
  const result = await callMCPTool('linear', 'projectCreate', {
    name: 'Test Project',
    team: 'TEAM-ID',
    templateId: 'TEMPLATE-ID'  // Testing this field
  });
  console.log('✅ API supports templateId:', result);
} catch (error) {
  console.log('❌ API error:', error.message);
  // "Cannot query field templateId" → API doesn't support it
}
```

## Server-Side Filtering

**Always filter at source** (server-side) not in code (client-side):

```typescript
// ❌ WRONG: Fetch all, filter in code
const allIssues = await callMCPTool('linear', 'list_issues', {
  first: 1000
});
const myIssues = allIssues.filter(issue => issue.assignee?.id === 'USER-ID');

// ✅ RIGHT: Filter at source
const myIssues = await callMCPTool('linear', 'list_issues', {
  first: 50,
  filter: {
    assignee: { id: { eq: 'USER-ID' } }
  }
});
```

**Benefits:**
- Reduces API calls
- Prevents rate limiting
- Faster response
- Less data transfer

## Common Query Patterns

### Get Single Entity by ID

```typescript
const issue = await callMCPTool('linear', 'get_issue', {
  id: 'CHARIOT-123'
});
```

### List with Filters

```typescript
const issues = await callMCPTool('linear', 'list_issues', {
  first: 50,
  filter: {
    state: { name: { eq: 'In Progress' } },
    team: { key: { eq: 'ENG' } }
  }
});
```

### Create Entity

```typescript
const newIssue = await callMCPTool('linear', 'create_issue', {
  title: 'New Issue',
  teamId: 'TEAM-ID',
  priority: 1,
  description: 'Issue description'
});
```

### Update Entity

```typescript
const updated = await callMCPTool('linear', 'update_issue', {
  id: 'ISSUE-ID',
  title: 'Updated Title',
  stateId: 'STATE-ID'
});
```

## Debugging with Direct Queries

### Scenario: Wrapper returns unexpected data

```typescript
// 1. Query with wrapper
const wrapperResult = await getIssue.execute({ id: 'CHARIOT-123' });
console.log('Wrapper:', wrapperResult);

// 2. Query directly (same operation)
const directResult = await callMCPTool('linear', 'get_issue', { id: 'CHARIOT-123' });
console.log('Direct:', directResult);

// 3. Compare
// - If different → wrapper is filtering/transforming
// - If same → issue is in API response itself
```

### Scenario: Schema drift suspected

```typescript
// Check what API currently returns
const raw = await callMCPTool('linear', 'get_project', { id: 'PROJECT-ID' });

console.log('state field type:', typeof raw.state);
console.log('state value:', raw.state);

// If typeof is 'string' but wrapper expects object → schema drift
```

## Rate Limit Management

```typescript
async function queryWithRateLimit(operation: () => Promise<any>) {
  try {
    return await operation();
  } catch (error) {
    if (error.statusCode === 429) {
      const retryAfter = error.headers?.['retry-after'] || 60;
      console.log(`Rate limited. Retrying in ${retryAfter}s...`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return await operation();  // Retry once
    }
    throw error;
  }
}

// Use it:
const result = await queryWithRateLimit(() =>
  callMCPTool('linear', 'list_issues', { first: 100 })
);
```

## Best Practices

1. **Use callMCPTool for testing** - Simpler than raw HTTP
2. **Filter at source** - Server-side filtering reduces API calls
3. **Implement pagination** - Don't fetch more than you need
4. **Handle rate limits** - Implement exponential backoff
5. **Always check errors array** - Even with HTTP 200
6. **Use appropriate auth method** - Personal keys for higher limits, OAuth for production
7. **Cache when possible** - Reduce redundant API calls

## Related Files

- `.claude/tools/config/lib/mcp-client.ts` - callMCPTool implementation
- `.claude/tools/linear/graphql-helpers.ts` - executeGraphQL helper
- `.claude/tools/linear/client.ts` - OAuth/API key auth
- `field-verification.md` - Using direct queries for verification
- `fixing-graphql-errors.md` - Debugging errors from direct queries
