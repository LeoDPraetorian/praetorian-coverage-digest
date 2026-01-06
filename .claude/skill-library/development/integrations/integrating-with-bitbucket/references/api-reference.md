# Bitbucket API 2.0 Reference

**Quick reference for commonly used Bitbucket Cloud REST API endpoints.**

---

## Base URL

```
https://api.bitbucket.org/2.0
```

---

## Authentication

**Header:**

```http
Authorization: Basic <base64(email:api_token)>
```

**See:** [authentication.md](authentication.md) for complete guide.

---

## Repositories

### List Repositories

```http
GET /repositories/{workspace}?pagelen=100
```

**Response:**

```json
{
  "values": [
    {
      "full_name": "workspace/repo",
      "name": "repo",
      "is_private": true,
      "language": "Go",
      "updated_on": "2026-01-04T10:30:00Z"
    }
  ],
  "next": "..."
}
```

### Get Repository

```http
GET /repositories/{workspace}/{repo_slug}
```

---

## Pull Requests

### List Pull Requests

```http
GET /repositories/{workspace}/{repo_slug}/pullrequests?state=OPEN&pagelen=100
```

**States:** OPEN, MERGED, DECLINED, SUPERSEDED

### Get Pull Request

```http
GET /repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}
```

### Create PR Comment

```http
POST /repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}/comments

{
  "content": {
    "raw": "Comment text (markdown supported)"
  }
}
```

### Approve PR

```http
POST /repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}/approve
```

### Merge PR

```http
POST /repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}/merge

{
  "message": "Merge commit message",
  "close_source_branch": true,
  "merge_strategy": "merge_commit"
}
```

---

## Webhooks

### Create Webhook

```http
POST /repositories/{workspace}/{repo_slug}/hooks

{
  "description": "My webhook",
  "url": "https://example.com/webhooks",
  "active": true,
  "events": ["repo:push", "pullrequest:created"]
}
```

### List Webhooks

```http
GET /repositories/{workspace}/{repo_slug}/hooks
```

---

## Commits

### Get Commit

```http
GET /repositories/{workspace}/{repo_slug}/commit/{commit_hash}
```

### Update Commit Build Status

```http
POST /repositories/{workspace}/{repo_slug}/commit/{commit_hash}/statuses/build

{
  "state": "SUCCESSFUL",
  "key": "my-build",
  "name": "Build Name",
  "url": "https://example.com/builds/123",
  "description": "Build passed"
}
```

---

## Rate Limiting

**Limits:** 1,000-10,000 requests/hour (authenticated)

**Headers:**

```http
X-RateLimit-Limit: 5000
X-RateLimit-Resource: api-repositories
X-RateLimit-NearLimit: false
```

**See:** [rate-limiting.md](rate-limiting.md) for complete guide.

---

## Official Documentation

- **API Reference**: https://developer.atlassian.com/cloud/bitbucket/rest/intro/
- **Authentication**: https://support.atlassian.com/bitbucket-cloud/docs/api-tokens-and-oauth/
- **Webhooks**: https://support.atlassian.com/bitbucket-cloud/docs/manage-webhooks/
- **Rate Limits**: https://support.atlassian.com/bitbucket-cloud/docs/api-request-limits/
