---
name: integrating-with-jira
description: Use when integrating with Jira APIs (Cloud/Server/Data Center), authentication (Basic/OAuth/PAT), JQL queries, issue workflows, custom fields, webhooks, and Jira-specific patterns
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, WebSearch
---

# Integrating with Jira

**Comprehensive guide for integrating with Jira's REST APIs, authentication methods, JQL queries, issue management, custom fields, webhooks, and Jira-specific design patterns.**

## Prerequisites

- Jira instance access (Cloud, Server, or Data Center)
- Understanding of Jira concepts (projects, issue types, workflows, transitions)
- API authentication credentials (API token for Cloud, credentials for Server)
- Security: Never commit API tokens to repositories
- Rate limit awareness (varies by Jira edition and hosting type)

## Chariot Integration Requirements

This skill documents Jira API patterns. For implementing Jira integrations in Chariot, you MUST also follow:

- **P0 Requirements**: See `developing-integrations` skill for mandatory patterns
- **VMFilter**: Required for multi-tenancy - filter all assets/risks by job owner
- **CheckAffiliation**: Required for ownership verification before processing
- **ValidateCredentials**: Required fail-fast pattern at integration start
- **errgroup**: Required for safe concurrent pagination with SetLimit()

Cross-reference: `.claude/skill-library/development/integrations/developing-integrations/SKILL.md`

**See:** [references/chariot-integration.md](references/chariot-integration.md) for complete implementation patterns.

## Critical 2026 Breaking Changes

**Action required for existing integrations:**

| Change                         | Timeline                          | Impact                            |
| ------------------------------ | --------------------------------- | --------------------------------- |
| **API Token Expiration**       | Legacy tokens expire Mar-May 2026 | Implement token rotation          |
| **Points-Based Rate Limiting** | February 2, 2026                  | Update rate limit handling        |
| **Pagination Migration**       | Already enforced (Aug 2025)       | Migrate to token-based pagination |

### Token Expiration (Mandatory)

- **New tokens (after Dec 2024)**: 1-year maximum lifespan
- **Legacy tokens**: Expire between **March 14 - May 12, 2026**
- **Action**: Implement token rotation or migrate to OAuth 2.0

### Points-Based Rate Limiting (Feb 2026)

- **Old model**: Simple request/minute limits
- **New model**: 65,000 points/hour quota, costs vary by operation
- **Action**: Monitor point consumption, optimize with field limiting

### Pagination Architecture

- **Deprecated**: Offset-based (`startAt`/`maxResults`) - parallel-friendly but removed
- **Required**: Token-based (`nextPageToken`) - sequential only, 3-5x slower
- **Action**: Use hybrid strategy, optimize with field limiting

**See:** [references/authentication.md](references/authentication.md), [references/rate-limiting.md](references/rate-limiting.md), [references/pagination.md](references/pagination.md)

## When to Use

Use this skill when:

- Building Jira integrations (issue management, automation, reporting)
- Choosing authentication method for different Jira editions (Cloud vs Server vs Data Center)
- Writing JQL (Jira Query Language) queries for issue search
- Managing issue workflows and transitions programmatically
- Handling Jira custom fields (discovery and updates)
- Implementing pagination for large result sets
- Setting up Jira webhooks for event-driven integrations
- Implementing rate limiting and retry strategies

## Quick Reference

| Operation      | Method                       | Best Practice                                        |
| -------------- | ---------------------------- | ---------------------------------------------------- |
| Authentication | API Token (Cloud)            | Use email + API token, store in secrets manager      |
| Issue Search   | JQL via `/rest/api/3/search` | Use JQL for filtering, paginate with `startAt`       |
| Rate Limiting  | Exponential backoff          | Monitor `X-RateLimit-*` headers, implement retry     |
| Custom Fields  | Discovery API                | Use `/rest/api/3/field` to discover custom field IDs |
| Transitions    | GET before POST              | Fetch available transitions before applying          |
| Pagination     | `startAt` + `maxResults`     | Default max is 50-100, iterate with `startAt`        |
| Webhooks       | HMAC verification            | Validate webhook signatures if configured            |

## Authentication Methods

### Jira Cloud Authentication

**Recommended: API Tokens**

```typescript
// Basic Auth with email + API token
const auth = {
  username: process.env.JIRA_EMAIL,
  password: process.env.JIRA_API_TOKEN, // Generate at https://id.atlassian.com/manage-profile/security/api-tokens
};

const response = await fetch(`https://${domain}.atlassian.net/rest/api/3/myself`, {
  headers: {
    Authorization: `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString("base64")}`,
    Accept: "application/json",
  },
});
```

**OAuth 2.0 (3LO)** - For marketplace apps requiring user authorization

See [references/oauth-flow.md](references/oauth-flow.md) for complete OAuth implementation.

### Jira Server/Data Center Authentication

- **Basic Auth**: Username + password (deprecating)
- **Personal Access Tokens (PAT)**: Recommended for Server 8.14+
- **OAuth 1.0a**: For production integrations

**See:** [references/authentication.md](references/authentication.md) for detailed patterns by edition.

## API Versions

| Jira Edition | API Version | Base Path      | Notes                                  |
| ------------ | ----------- | -------------- | -------------------------------------- |
| Cloud        | v3 (latest) | `/rest/api/3/` | Use v3 for new integrations            |
| Cloud        | v2 (legacy) | `/rest/api/2/` | Deprecated, use only if v3 unavailable |
| Server/DC    | v2          | `/rest/api/2/` | Primary version for on-premise         |

**Always use the latest API version supported by your target Jira edition.**

## JQL (Jira Query Language)

### Basic Query Structure

```jql
project = "PROJ" AND status = "In Progress" AND assignee = currentUser() ORDER BY created DESC
```

### Common JQL Patterns

| Use Case          | JQL Example                                           |
| ----------------- | ----------------------------------------------------- |
| Issues in project | `project = "PROJ"`                                    |
| By status         | `status IN ("In Progress", "Review")`                 |
| By assignee       | `assignee = "user@example.com"`                       |
| Date range        | `created >= "2024-01-01" AND created <= "2024-12-31"` |
| Custom field      | `cf[10001] = "value"` (use custom field ID)           |
| Text search       | `text ~ "search term"`                                |
| Issue links       | `issueFunction in linkedIssuesOf("PROJ-123")`         |

**See:** [references/jql-reference.md](references/jql-reference.md) for complete JQL syntax and advanced queries.

## Issue Search with Pagination

**Critical: Jira limits results to 50-100 issues per request.**

```typescript
async function searchAllIssues(jql: string): Promise<Issue[]> {
  const allIssues: Issue[] = [];
  let startAt = 0;
  const maxResults = 100;

  while (true) {
    const response = await fetch(
      `https://${domain}.atlassian.net/rest/api/3/search?` +
        `jql=${encodeURIComponent(jql)}&` +
        `startAt=${startAt}&` +
        `maxResults=${maxResults}&` +
        `fields=summary,status,assignee,created`,
      { headers: { Authorization: basicAuth, Accept: "application/json" } }
    );

    const data = await response.json();
    allIssues.push(...data.issues);

    if (data.startAt + data.issues.length >= data.total) {
      break; // No more results
    }

    startAt += maxResults;
  }

  return allIssues;
}
```

**Key Parameters:**

- `startAt`: Zero-based index for pagination
- `maxResults`: Number of issues per page (max 100)
- `fields`: Comma-separated list of fields to return (reduces payload size)
- `expand`: Optional expansions (changelog, renderedFields, etc.)

## Custom Fields

### Discovery

Custom fields have IDs like `customfield_10001` that vary by Jira instance:

```typescript
// Fetch all fields
const fieldsResponse = await fetch(`https://${domain}.atlassian.net/rest/api/3/field`, {
  headers: { Authorization: basicAuth, Accept: "application/json" },
});

const fields = await fieldsResponse.json();

// Find custom field by name
const storyPointsField = fields.find((f) => f.name === "Story Points");
console.log(storyPointsField.id); // e.g., "customfield_10016"
```

### Updating Custom Fields

```typescript
await fetch(`https://${domain}.atlassian.net/rest/api/3/issue/${issueKey}`, {
  method: "PUT",
  headers: {
    Authorization: basicAuth,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    fields: {
      customfield_10016: 5, // Story points
      customfield_10017: { value: "Option 1" }, // Select field
    },
  }),
});
```

**See:** [references/custom-fields.md](references/custom-fields.md) for complete field type reference (select, multi-select, date, user picker, etc.).

## Issue Workflows and Transitions

### Fetching Available Transitions

**Critical: Always fetch available transitions before applying - transitions vary by workflow configuration.**

```typescript
// Get transitions for an issue
const transitionsResponse = await fetch(
  `https://${domain}.atlassian.net/rest/api/3/issue/${issueKey}/transitions`,
  { headers: { Authorization: basicAuth, Accept: "application/json" } }
);

const { transitions } = await transitionsResponse.json();
console.log(transitions);
// [{ id: "11", name: "In Progress" }, { id: "21", name: "Done" }]
```

### Applying Transitions

```typescript
// Transition issue to "In Progress"
const transitionId = transitions.find((t) => t.name === "In Progress").id;

await fetch(`https://${domain}.atlassian.net/rest/api/3/issue/${issueKey}/transitions`, {
  method: "POST",
  headers: {
    Authorization: basicAuth,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    transition: { id: transitionId },
    fields: {
      // Optional: Set fields during transition (e.g., resolution)
      resolution: { name: "Done" },
    },
  }),
});
```

**See:** [references/workflows.md](references/workflows.md) for workflow state machines and transition validation.

## Rate Limiting

### Jira Cloud Rate Limits

- **Standard plans**: Varies by endpoint (100-300 req/minute)
- **Premium plans**: Higher limits
- **Headers**: Check `X-RateLimit-*` headers in responses

```typescript
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1719936000
```

### Exponential Backoff Pattern

```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get("Retry-After") || "60", 10);
      const backoff = Math.min(retryAfter * 1000, 2 ** attempt * 1000);

      console.log(`Rate limited, retrying after ${backoff}ms`);
      await new Promise((resolve) => setTimeout(resolve, backoff));
      continue;
    }

    return response;
  }

  throw new Error("Max retries exceeded");
}
```

**See:** [references/rate-limiting.md](references/rate-limiting.md) for detailed rate limit patterns by Jira edition.

## Error Handling

### Common Error Codes

| Status Code | Meaning      | Action                                   |
| ----------- | ------------ | ---------------------------------------- |
| 400         | Bad Request  | Validate JQL syntax, field names, values |
| 401         | Unauthorized | Check authentication credentials         |
| 403         | Forbidden    | Verify user permissions in Jira          |
| 404         | Not Found    | Verify issue key, project key exists     |
| 429         | Rate Limited | Implement exponential backoff            |
| 500         | Server Error | Retry with backoff, check Jira status    |

### Error Response Structure

```json
{
  "errorMessages": ["The issue key 'INVALID-123' does not exist."],
  "errors": {
    "customfield_10001": "Field 'customfield_10001' cannot be set. It is not on the appropriate screen, or unknown."
  }
}
```

**See:** [references/error-handling.md](references/error-handling.md) for comprehensive error scenarios and recovery strategies.

## Webhooks

### Event Types

| Event                | Trigger           | Use Case                      |
| -------------------- | ----------------- | ----------------------------- |
| `jira:issue_created` | New issue created | Notifications, integrations   |
| `jira:issue_updated` | Issue changed     | Status updates, field changes |
| `jira:issue_deleted` | Issue deleted     | Cleanup, sync                 |
| `comment_created`    | Comment added     | Notifications, analysis       |
| `worklog_created`    | Work logged       | Time tracking integrations    |

### Webhook Payload Example

```json
{
  "timestamp": 1719936000000,
  "webhookEvent": "jira:issue_updated",
  "issue": {
    "key": "PROJ-123",
    "fields": {
      "summary": "Issue summary",
      "status": { "name": "In Progress" }
    }
  },
  "user": { "emailAddress": "user@example.com" },
  "changelog": {
    "items": [{ "field": "status", "fromString": "To Do", "toString": "In Progress" }]
  }
}
```

**See:** [references/webhooks.md](references/webhooks.md) for webhook configuration, security, and payload reference.

## Best Practices

### 1. Use JQL for Filtering

❌ **Don't**: Fetch all issues and filter in code

```typescript
const allIssues = await searchIssues('project = "PROJ"');
const inProgress = allIssues.filter((i) => i.fields.status.name === "In Progress");
```

✅ **Do**: Use JQL to filter server-side

```typescript
const inProgress = await searchIssues('project = "PROJ" AND status = "In Progress"');
```

### 2. Paginate Large Result Sets

❌ **Don't**: Assume results fit in one page

```typescript
const response = await search(jql); // Only returns 50 issues by default
```

✅ **Do**: Implement pagination

```typescript
const allIssues = await searchAllIssues(jql); // Uses startAt pagination
```

### 3. Discover Custom Fields

❌ **Don't**: Hardcode custom field IDs

```typescript
const storyPoints = issue.fields.customfield_10016; // Fragile
```

✅ **Do**: Discover field IDs by name

```typescript
const storyPointsField = await findFieldByName("Story Points");
const storyPoints = issue.fields[storyPointsField.id];
```

### 4. Handle Errors Gracefully

❌ **Don't**: Assume all requests succeed

```typescript
const issue = await fetchIssue(key); // May throw
```

✅ **Do**: Handle Jira-specific errors

```typescript
try {
  const issue = await fetchIssue(key);
} catch (error) {
  if (error.status === 404) {
    console.error(`Issue ${key} not found`);
  } else if (error.status === 429) {
    await retryWithBackoff();
  }
}
```

## Complementary Skills

This skill focuses on **Jira-specific patterns**. For general integration patterns, use:

- **`developing-integrations`** - Generic integration architecture, error handling, testing patterns
- **`integrating-with-github`** - Similar API integration patterns (rate limiting, webhooks, pagination)

## Related Skills

- `developing-integrations` - Generic integration patterns and architecture
- `integrating-with-github` - Similar REST API integration patterns
- `integrating-with-bugcrowd` - Security platform integration patterns
- `integrating-with-hackerone` - Vulnerability platform integration patterns

## Integration

### Called By

- `orchestrating-integration-development` - Phase 5 implementation
- `integration-developer` agent

### Requires

- `developing-integrations` (LIBRARY) - P0 compliance requirements (VMFilter, CheckAffiliation, ValidateCredentials, errgroup) - `Read(".claude/skill-library/development/integrations/developing-integrations/SKILL.md")`

### Pairs With

- `validating-integrations` (LIBRARY) - P0 compliance verification - `Read(".claude/skill-library/development/integrations/validating-integrations/SKILL.md")`
- `testing-integrations` (LIBRARY) - Mock patterns and test coverage - `Read(".claude/skill-library/development/integrations/testing-integrations/SKILL.md")`

## References

- [references/authentication.md](references/authentication.md) - Complete authentication patterns by edition (OAuth 2.0, API tokens, PAT)
- [references/chariot-integration.md](references/chariot-integration.md) - Chariot P0 integration patterns (VMFilter, CheckAffiliation, ValidateCredentials, errgroup, Asset Mapping)
- [references/pagination.md](references/pagination.md) - Pagination strategies (offset vs token-based, migration guide)
- [references/rate-limiting.md](references/rate-limiting.md) - Rate limit patterns (Feb 2026 points-based system)
- [references/jql-reference.md](references/jql-reference.md) - JQL syntax and advanced queries
- [references/custom-fields.md](references/custom-fields.md) - Custom field types and operations
- [references/workflows.md](references/workflows.md) - Workflow state machines and transitions
- [references/error-handling.md](references/error-handling.md) - Error codes and recovery strategies
- [references/webhooks.md](references/webhooks.md) - Webhook configuration and payloads
- [references/api-reference.md](references/api-reference.md) - Complete REST API endpoint reference
