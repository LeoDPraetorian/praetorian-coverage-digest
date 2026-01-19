---
name: integrating-with-featurebase
description: Complete FeatureBase API documentation for posts, changelog, articles, comments, votes, users, categories, webhooks, and integrations
allowed-tools: Read, Write, Bash, WebFetch
---

# Integrating with FeatureBase

**Comprehensive API documentation for FeatureBase - the product feedback and roadmap platform.**

## When to Use

Use this skill when:

- Integrating FeatureBase API into your application
- Building MCP wrappers for FeatureBase endpoints
- Implementing feedback boards, changelogs, or help centers
- Setting up webhooks for real-time updates
- Managing users, votes, and comments programmatically

## Quick Reference

| Resource | Operations | Documentation |
|----------|-----------|---------------|
| **Posts** | list, get, create, update, delete | [Posts API](references/posts-api.md) |
| **Changelog** | list, create, update, delete | [Changelog API](references/changelog-api.md) |
| **Articles** | list, get, create, update, delete | [Articles API](references/articles-api.md) |
| **Comments** | list, create, update, delete | [Comments API](references/comments-api.md) |
| **Users** | identify, list, update, delete | [Users API](references/users-api.md) |
| **Votes** | track via webhooks | [Webhooks API](references/webhooks-api.md) |
| **Webhooks** | configure event notifications | [Webhooks API](references/webhooks-api.md) |

---

## Authentication

FeatureBase uses **API Key authentication** via a custom header.

### Header Format

```http
X-API-Key: YOUR_API_KEY
```

**⚠️ Not Bearer**: FeatureBase uses a custom `X-API-Key` header, not Bearer token format.

### Obtaining API Key

1. Log into FeatureBase dashboard
2. Navigate to Settings > API
3. Generate or copy your API key

### Example Request

```bash
curl -X GET \
  'https://do.featurebase.app/v2/posts' \
  -H 'X-API-Key: YOUR_API_KEY' \
  -H 'Content-Type: application/json'
```

**Security**: Never expose API keys in client-side code. Use environment variables or backend proxies.

---

## Comments API Architecture

**The Comments API uses a different authentication and content model than other FeatureBase endpoints.**

### Why comments-client.ts Exists

The FeatureBase Comments API has unique requirements that differ from other endpoints:

| Aspect | Standard API | Comments API |
|--------|--------------|--------------|
| Auth Header | `Authorization: Bearer` | `X-API-Key: {key}` |
| Content-Type | `application/json` | `application/x-www-form-urlencoded` |
| Body Format | JSON | URL-encoded form data |

### Implementation

The `comments-client.ts` file provides a specialized HTTP client:

```typescript
// .claude/tools/featurebase/comments-client.ts
export async function commentsRequest<T>(
  method: 'get' | 'post' | 'put' | 'delete' | 'patch',
  path: string,
  body?: Record<string, string | boolean | undefined>,
  credentials?: { apiKey: string }
): Promise<{ ok: true; data: T } | { ok: false; error: { ... } }>;
```

### Usage

Wrappers that interact with the Comments API should use `commentsRequest()`:

```typescript
import { commentsRequest } from './comments-client.js';

const result = await commentsRequest('post', 'v2/comments', {
  postId: validated.postId,
  content: validated.content,
});
```

### Affected Wrappers

- `create-comment.ts` - Uses commentsRequest
- `update-comment.ts` - Uses commentsRequest
- `delete-comment.ts` - Uses commentsRequest
- `list-comments.ts` - Uses standard client (GET with JSON response)

---

## Base URL

```
https://do.featurebase.app/v2
```

All endpoints use this base URL (e.g., `/v2/posts`, `/v2/changelogs`).

---

## Core Resources

### Resource Overview

For detailed endpoint documentation, request/response formats, and code examples, see:

- **[Posts API](references/posts-api.md)** - Feedback board posts (list, create, update, delete, upvotes)
- **[Changelog API](references/changelog-api.md)** - Product updates and release notes
- **[Articles API](references/articles-api.md)** - Help center documentation
- **[Comments API](references/comments-api.md)** - Discussions and threading
- **[Users API](references/users-api.md)** - Identity management and custom fields
- **[Webhooks API](references/webhooks-api.md)** - Real-time event notifications (votes, comments, changelog)

---

## Additional Resources

### Pagination

FeatureBase uses **page-based pagination**.

```typescript
GET /posts?page=2&limit=20

Response:
{
  "results": [...],
  "page": 2,
  "totalPages": 10,
  "totalResults": 200
}
```

### Custom Fields

Add custom metadata to users and companies.

```typescript
POST /custom-fields
{
  "name": "subscription_plan",
  "type": "string",
  "options": ["free", "pro", "enterprise"]
}
```

**Details**: [references/custom-fields-api.md](references/custom-fields-api.md)

### Boards (Categories)

Organize posts by board.

```typescript
// Filter posts by board
GET /posts?categoryId=board-123
```

### Post Statuses

Track feature progress.

```typescript
// Filter by status
GET /posts?statusId=in-progress
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| `200` | Success | Process response |
| `201` | Created | Resource created successfully |
| `400` | Bad Request | Check request parameters |
| `401` | Unauthorized | Verify API key |
| `403` | Forbidden | Check permissions |
| `404` | Not Found | Resource doesn't exist |
| `429` | Rate Limited | Implement backoff |
| `500` | Server Error | Retry with backoff |

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "categoryId",
      "issue": "Required field missing"
    }
  }
}
```

### Rate Limiting

- **Limit**: Typically 100 requests per minute
- **Header**: `X-RateLimit-Remaining` shows remaining quota
- **Strategy**: Implement exponential backoff

---

## Best Practices

### 1. Token Optimization

When building MCP wrappers, minimize response size:

```typescript
// Return only essential fields
{
  id: post.id,
  title: post.title,
  status: post.status,
  // Truncate long content
  content: post.content.substring(0, 500) + '...'
}
```

### 2. Pagination Strategy

Always paginate large result sets:

```typescript
async function getAllPosts() {
  let page = 1;
  let allPosts = [];

  while (true) {
    const response = await fetch(\`/posts?page=\${page}&limit=100\`);
    const data = await response.json();

    allPosts.push(...data.results);

    if (page >= data.totalPages) break;
    page++;
  }

  return allPosts;
}
```

### 3. Webhook Validation

Verify webhook authenticity (if FeatureBase provides signature):

```typescript
function validateWebhook(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return hash === signature;
}
```

### 4. Error Recovery

Implement retry logic with exponential backoff:

```typescript
async function retryRequest(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000); // 1s, 2s, 4s
    }
  }
}
```

### 5. Security

- **Never expose API keys** in client-side code
- **Use environment variables** for credentials
- **Implement backend proxy** for client apps
- **Validate webhook payloads** before processing

---

## Integration

### Called By

- `/featurebase` command - User-facing integration command
- `tool-developer` agent - When building FeatureBase MCP wrappers
- `integration-developer` agent - When implementing FeatureBase integrations

### Requires (invoke before starting)

None - standalone integration skill

### Calls (during execution)

None - terminal skill (provides documentation)

### Pairs With (conditional)

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `implementing-mcp-wrappers` | Building wrappers | MCP wrapper patterns |
| `integrating-with-aws` | Lambda deployment | Webhook handlers |
| `writing-integration-tests-first` | Testing | Integration test patterns |

---

## Official Documentation

- [FeatureBase API Reference](https://docs.featurebase.app/)
- [Posts API](https://docs.featurebase.app/posts)
- [Comments API](https://docs.featurebase.app/comment)
- [Webhooks API](https://docs.featurebase.app/webhooks)
- [Identify Users API](https://docs.featurebase.app/identify)
- [Quickstart Guide](https://docs.featurebase.app/quickstart)

---

## Related Skills

- `implementing-mcp-wrappers` - MCP wrapper development patterns
- `integrating-with-github` - Similar API integration patterns
- `writing-integration-tests-first` - Test-driven integration development
- `integrating-with-aws` - Lambda-based webhook handlers
