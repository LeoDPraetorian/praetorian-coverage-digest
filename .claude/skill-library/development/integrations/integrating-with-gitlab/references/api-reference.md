# GitLab API Quick Reference

## Authentication Header

```http
# Personal Access Token
PRIVATE-TOKEN: glpat-xxxxxxxxxxxxxxxxxxxx

# OAuth 2.0
Authorization: Bearer <oauth-token>

# Job Token
JOB-TOKEN: $CI_JOB_TOKEN
```

## Common Endpoints

### Projects

```http
GET    /api/v4/projects
GET    /api/v4/projects/:id
POST   /api/v4/projects
PUT    /api/v4/projects/:id
DELETE /api/v4/projects/:id
GET    /api/v4/projects/:id/members
```

### Pipelines

```http
GET    /api/v4/projects/:id/pipelines
GET    /api/v4/projects/:id/pipelines/:pipeline_id
POST   /api/v4/projects/:id/trigger/pipeline
POST   /api/v4/projects/:id/pipelines/:pipeline_id/cancel
POST   /api/v4/projects/:id/pipelines/:pipeline_id/retry
```

### Issues & Merge Requests

```http
GET    /api/v4/projects/:id/issues
POST   /api/v4/projects/:id/issues
PATCH  /api/v4/projects/:id/issues/:issue_iid
GET    /api/v4/projects/:id/merge_requests
POST   /api/v4/projects/:id/merge_requests
```

### Groups

```http
GET    /api/v4/groups
GET    /api/v4/groups/:id
POST   /api/v4/groups
PUT    /api/v4/groups/:id
GET    /api/v4/groups/:id/projects
```

### Users

```http
GET    /api/v4/user              # Current user
GET    /api/v4/users
GET    /api/v4/users/:id
```

### Runners

```http
GET    /api/v4/runners
GET    /api/v4/runners/:id
PUT    /api/v4/runners/:id
DELETE /api/v4/runners/:id
POST   /api/v4/runners/verify    # Verify token
```

## Error Codes

| Code    | Meaning           | Action                        |
| ------- | ----------------- | ----------------------------- |
| 401     | Unauthorized      | Check token validity/scopes   |
| 403     | Forbidden         | Insufficient permissions      |
| 404     | Not Found         | Verify resource exists/access |
| 422     | Validation Failed | Check request payload         |
| 429     | Rate Limited      | Wait for Retry-After seconds  |
| 500-504 | Server Error      | Retry with backoff            |

## Pagination

```http
GET /api/v4/projects?page=2&per_page=100

# Response headers
X-Total: 200
X-Total-Pages: 2
X-Per-Page: 100
X-Page: 2
X-Next-Page: 3
X-Prev-Page: 1
Link: <https://gitlab.com/api/v4/projects?page=3&per_page=100>; rel="next"
```

For complete API reference (300+ endpoints), see:
`.claude/.output/research/2026-01-04-205433-gitlab-integration-security/SYNTHESIS.md`

**Official Docs:** https://docs.gitlab.com/ee/api/
