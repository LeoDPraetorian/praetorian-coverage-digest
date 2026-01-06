# REST vs GraphQL API Selection

## Quick Decision Matrix

| Use Case                | Recommended API | Rationale                       |
| ----------------------- | --------------- | ------------------------------- |
| Simple CRUD operations  | REST            | Mature, well-documented         |
| Webhook payloads        | REST            | Webhooks use REST format        |
| Complex nested data     | GraphQL         | Single query vs 10+ REST calls  |
| Production integrations | REST            | Stable, predictable rate limits |
| High-frequency polling  | REST            | Consistent rate limit headers   |

## REST API v4 (Primary, Recommended)

**Advantages:**

- Comprehensive coverage: 300+ endpoints
- Consistent versioning, well-documented
- Predictable rate limiting with clear headers
- All GitLab features supported

**Common Endpoints:**

```
Projects:    /api/v4/projects
Pipelines:   /api/v4/projects/:id/pipelines
Groups:      /api/v4/groups
Issues:      /api/v4/projects/:id/issues
MRs:         /api/v4/projects/:id/merge_requests
```

## GraphQL API (Emerging)

**Advantages:**

- Reduce over-fetching (selective fields)
- Single request for nested data

**Known Limitations:**

- Not all features available (check docs)
- Rate limit headers inconsistent (Issue #352409)
- No HTTP 429 for rate limiting (Issue #520403)
- Complexity scoring instead of request counts

**When GraphQL Makes Sense:**

- Fetching repo + 20 issues + comments: 1 GraphQL query vs 22+ REST calls
- Custom field selection (only fetch what you need)
- Complex relationship traversal

## Rate Limiting Comparison

**REST API:**

```http
RateLimit-Limit: 600
RateLimit-Remaining: 599
RateLimit-Reset: 1719936000
Retry-After: 60
```

**GraphQL API:**

- Uses complexity scoring
- Headers may be missing (known issue)
- Must implement client-side throttling

## Recommendation for Chariot

**Use REST API** for production integrations:

- Stable, mature, predictable
- Complete rate limit visibility
- All features supported
- Better error handling

**Consider GraphQL only** when:

- REST requires >10 sequential calls
- Need specific nested data structure
- Willing to handle inconsistent rate limits

For comprehensive API comparison, see:
`.claude/.output/research/2026-01-04-205433-gitlab-integration-security/SYNTHESIS.md` (Section 1.2)
