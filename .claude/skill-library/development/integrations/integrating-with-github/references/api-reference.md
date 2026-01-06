# GitHub API Reference

**Sources**: GitHub REST API Documentation, Pagination, Error Handling (via Context7)
**Research Date**: 2026-01-03
**Context7 Library ID**: `/websites/github_en_rest`

---

## API Endpoints

### Base URLs

| API               | Base URL                         |
| ----------------- | -------------------------------- |
| REST API          | `https://api.github.com`         |
| GraphQL API       | `https://api.github.com/graphql` |
| GitHub Enterprise | `https://HOSTNAME/api/v3`        |

### Versioning

- **Date-based versioning**: `YYYY-MM-DD` format (e.g., `2022-11-28`)
- **Version header**: `X-GitHub-Api-Version: 2022-11-28`
- **Default version**: `2022-11-28` (if header omitted)
- **Support window**: 24+ months for previous versions

---

## HTTP Status Codes

### Success Codes

| Code | Meaning    | Description                              |
| ---- | ---------- | ---------------------------------------- |
| 200  | OK         | Successful request with response body    |
| 201  | Created    | Resource created successfully            |
| 204  | No Content | Successful request with no response body |

### Client Error Codes

| Code | Meaning              | Common Causes                                                       | Retry Strategy                              |
| ---- | -------------------- | ------------------------------------------------------------------- | ------------------------------------------- |
| 400  | Bad Request          | Malformed request syntax                                            | Fix request, do not retry                   |
| 401  | Unauthorized         | Missing or invalid authentication                                   | Fix authentication, do not retry            |
| 403  | Forbidden            | Insufficient permissions OR rate limit exceeded                     | Check permissions or wait for reset         |
| 404  | Not Found            | Resource doesn't exist OR authentication issue for private resource | Verify authentication first, then check URL |
| 422  | Unprocessable Entity | Validation failed (invalid parameters)                              | Fix validation errors, do not retry         |
| 429  | Too Many Requests    | Rate limit exceeded                                                 | Wait for retry window                       |

### Server Error Codes

| Code | Meaning               | Description                | Retry Strategy      |
| ---- | --------------------- | -------------------------- | ------------------- |
| 500  | Internal Server Error | Server-side error          | Exponential backoff |
| 502  | Bad Gateway           | Server communication issue | Exponential backoff |
| 503  | Service Unavailable   | Server overloaded          | Exponential backoff |

---

## Error Response Formats

### Standard Error Response

```json
{
  "message": "Human-readable error description",
  "documentation_url": "https://docs.github.com/rest/..."
}
```

### Validation Failed Error (422)

```json
{
  "message": "Validation Failed",
  "errors": [
    {
      "code": "missing_field",
      "field": "title",
      "resource": "Issue"
    },
    {
      "code": "invalid",
      "field": "assignee",
      "resource": "Issue"
    }
  ],
  "documentation_url": "https://docs.github.com/rest/..."
}
```

### Validation Error Codes

| Code             | Description                                                 |
| ---------------- | ----------------------------------------------------------- |
| `missing`        | A required resource does not exist                          |
| `missing_field`  | A required parameter was not specified                      |
| `invalid`        | Parameter formatting is invalid                             |
| `already_exists` | Another resource has the same value (e.g., duplicate label) |
| `unprocessable`  | The provided parameters were invalid                        |
| `custom`         | Refer to the `message` property for specifics               |

---

## Pagination

### REST API Link Header Pagination

**Standard Link Header Example**:

```
Link: <https://api.github.com/user/repos?page=3&per_page=100>; rel="next",
      <https://api.github.com/user/repos?page=50&per_page=100>; rel="last"
```

**Parsing Pattern**:

```typescript
const linkHeader = response.headers.get("Link");
const nextMatch = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
const nextUrl = nextMatch?.[1];
```

**Relation Types**:

- `rel="next"` - Next page URL
- `rel="prev"` - Previous page URL
- `rel="first"` - First page URL
- `rel="last"` - Last page URL

### GraphQL Cursor Pagination

**PageInfo Object**:

```graphql
pageInfo {
  startCursor    # Cursor for first item on current page
  endCursor      # Cursor for last item (use as `after` for next page)
  hasNextPage    # Boolean indicating if more pages exist forward
  hasPreviousPage # Boolean indicating if more pages exist backward
}
```

**Query Pattern**:

```graphql
query ($cursor: String) {
  repository(owner: "octocat", name: "Hello-World") {
    issues(first: 100, after: $cursor) {
      edges {
        cursor
        node {
          id
          title
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
}
```

**Traversal Pattern**:

```typescript
let cursor: string | null = null;
let hasNextPage = true;

while (hasNextPage) {
  const result = await graphqlQuery({ first: 100, after: cursor });
  const { edges, pageInfo } = result.data.repository.issues;

  processResults(edges);

  cursor = pageInfo.endCursor;
  hasNextPage = pageInfo.hasNextPage;
}
```

### Page Size Recommendations

| Use Case                      | Recommended Size |
| ----------------------------- | ---------------- |
| Bulk data collection          | 100 items        |
| User-facing pagination        | 30-50 items      |
| API under rate limit pressure | 30 items         |

**GitHub Recommendations**:

- Start with 30-100 items per page
- Monitor response times: >80ms may benefit from smaller pages
- Maximum: 100 items per page

---

## Conditional Requests (ETags)

### Request-Response Flow

**Initial Request**:

```http
GET /repos/octocat/Hello-World/issues
```

**Initial Response**:

```http
HTTP/1.1 200 OK
ETag: "686897696a7c876b7e"
Last-Modified: Fri, 01 Jan 2026 12:00:00 GMT
```

**Subsequent Conditional Request**:

```http
GET /repos/octocat/Hello-World/issues
If-None-Match: "686897696a7c876b7e"
If-Modified-Since: Fri, 01 Jan 2026 12:00:00 GMT
```

**Cached Response (Resource Unchanged)**:

```http
HTTP/1.1 304 Not Modified
```

**Rate Limit Benefit**: 304 responses **do not consume rate limit quota**.

### ETag Implementation

```typescript
const cache = new Map<string, { etag: string; data: any }>();

async function fetchWithETag(url: string) {
  const cached = cache.get(url);
  const headers: HeadersInit = {};

  if (cached?.etag) {
    headers["If-None-Match"] = cached.etag;
  }

  const response = await fetch(url, { headers });

  if (response.status === 304) {
    return cached.data; // Use cached data, no rate limit consumed
  }

  if (response.status === 200) {
    const etag = response.headers.get("ETag");
    const data = await response.json();

    if (etag) {
      cache.set(url, { etag, data });
    }

    return data;
  }
}
```

---

## Response Headers

### Rate Limit Headers

| Header                  | Purpose                                     |
| ----------------------- | ------------------------------------------- |
| `x-ratelimit-limit`     | Maximum requests allowed per hour           |
| `x-ratelimit-remaining` | Requests remaining in current window        |
| `x-ratelimit-used`      | Requests made in current window             |
| `x-ratelimit-reset`     | UTC epoch seconds when limit resets         |
| `x-ratelimit-resource`  | Rate limit resource (core, search, graphql) |

### Observability Headers

| Header                          | Purpose                                 |
| ------------------------------- | --------------------------------------- |
| `x-github-request-id`           | Unique request ID for debugging/support |
| `x-github-api-version-selected` | API version used for request            |
| `ETag`                          | Entity tag for conditional requests     |
| `Last-Modified`                 | Last modification timestamp             |

---

## 404 Not Found Troubleshooting

### Security-First Design

**GitHub returns `404 Not Found` instead of `403 Forbidden` for private resources** to avoid confirming the existence of private repositories.

### Authentication Debugging Checklist

If you receive a `404` for a resource you know exists:

#### Personal Access Token (Classic)

- ✅ Token has required **scopes** for the endpoint
- ✅ Token owner has necessary **permissions** (e.g., org owner)
- ✅ Token has not **expired or been revoked**

#### Fine-Grained Personal Access Token

- ✅ Token has required **permissions** for the endpoint
- ✅ Resource owner matches token's specified resource owner
- ✅ Token has **access to private repositories** being accessed
- ✅ Token has not expired or been revoked

#### GitHub App Installation Access Token

- ✅ GitHub App has required **permissions**
- ✅ Endpoint only affects resources owned by the **installation account**
- ✅ GitHub App has **access to affected repositories**
- ✅ Token has not expired or been revoked

#### GITHUB_TOKEN (GitHub Actions)

- ✅ Endpoint only affects resources **within the repository running the workflow**
- ⚠️ For external resources, use a personal access token or GitHub App token

---

## Retry Logic

### Status-Specific Error Handling

```typescript
function handleGitHubError(error: GitHubError): RetryStrategy {
  // Rate limit errors
  if (error.status === 403 || error.status === 429) {
    if (error.headers["x-ratelimit-remaining"] === "0") {
      return {
        type: "PRIMARY_RATE_LIMIT",
        waitUntil: error.headers["x-ratelimit-reset"],
      };
    }
    if (error.headers["retry-after"]) {
      return {
        type: "SECONDARY_RATE_LIMIT",
        waitSeconds: error.headers["retry-after"],
      };
    }
    return {
      type: "SECONDARY_RATE_LIMIT",
      waitSeconds: 60,
      useExponentialBackoff: true,
    };
  }

  // Not found - could be auth issue
  if (error.status === 404) {
    return {
      type: "NO_RETRY",
      reason: "not_found_or_auth",
      suggestion: "Verify authentication and URL",
    };
  }

  // Validation errors
  if (error.status === 422) {
    return {
      type: "NO_RETRY",
      reason: "validation_failed",
      errors: error.response.data.errors,
    };
  }

  // Server errors
  if (error.status >= 500) {
    return {
      type: "EXPONENTIAL_BACKOFF",
      maxRetries: 5,
      initialDelayMs: 1000,
    };
  }

  return { type: "NO_RETRY", reason: "unknown" };
}
```

### Exponential Backoff

```typescript
async function fetchWithRetry(url: string, maxRetries = 3, initialDelay = 1000): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url);

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const delay = retryAfter
          ? parseInt(retryAfter) * 1000
          : initialDelay * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }

      return response;
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await sleep(initialDelay * Math.pow(2, attempt));
    }
  }

  throw new Error("Max retries exceeded");
}
```

---

## REST vs GraphQL Comparison

| Aspect         | REST API                            | GraphQL API                   |
| -------------- | ----------------------------------- | ----------------------------- |
| Endpoint       | Multiple resource endpoints         | Single `/graphql` endpoint    |
| Data fetching  | Fixed response structure            | Request exactly what you need |
| Versioning     | Date-based (`X-GitHub-Api-Version`) | Schema evolution              |
| Rate limiting  | 5,000 req/hour (core)               | 5,000 points/hour             |
| Caching        | HTTP caching (ETags)                | Client-side caching           |
| Nested data    | Multiple requests                   | Single request                |
| Learning curve | Lower (familiar HTTP)               | Higher (query language)       |

### When to Use Each

**Use REST when:**

- Simple CRUD operations
- HTTP caching is important
- Developer familiarity matters
- Integration with third-party tools

**Use GraphQL when:**

- Need nested/related data
- Bandwidth constraints (mobile)
- Precise data control required
- Reducing API call count matters

---

## Sources

### Official GitHub Documentation

- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [Using pagination in the REST API](https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api)
- [Using pagination in the GraphQL API](https://docs.github.com/en/graphql/guides/using-pagination-in-the-graphql-api)
- [Best practices for using the REST API](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api)
- [Rate limits for the REST API](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)
- [Troubleshooting the REST API](https://docs.github.com/rest/overview/troubleshooting)

### Related Specifications

- [GraphQL Cursor Connections Specification](https://graphql.org/learn/pagination/)
- [RFC 5988: Web Linking](https://tools.ietf.org/html/rfc5988)
- [HTTP Conditional Requests - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Conditional_requests)
