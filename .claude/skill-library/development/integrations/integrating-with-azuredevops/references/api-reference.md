# Azure DevOps REST API Reference

Complete API reference for Azure DevOps Services REST API v7.1.

---

## API Version

**Current Stable:** 7.1 (as of January 2025)

**Base URL Pattern:**
```
https://dev.azure.com/{organization}/_apis/{area}/{resource}?api-version=7.1
```

**Version Specification:**
- Query parameter (recommended): `?api-version=7.1`
- Accept header (alternative): `Accept: application/json;api-version=7.1`

---

## Core Service Areas

### 1. Git API

**Base Path:** `/{organization}/{project}/_apis/git`

| Operation | Method | Endpoint | Description |
|-----------|--------|----------|-------------|
| List Repositories | GET | `/repositories` | Get all Git repositories in a project |
| Get Repository | GET | `/repositories/{repositoryId}` | Get a single repository |
| Create Repository | POST | `/repositories` | Create a new Git repository |
| Get Pull Request | GET | `/repositories/{repositoryId}/pullrequests/{pullRequestId}` | Get PR details |
| List Pull Requests | GET | `/repositories/{repositoryId}/pullrequests` | List PRs with filters |
| Get Commits | GET | `/repositories/{repositoryId}/commits` | Get commit history |
| Get Changes | GET | `/repositories/{repositoryId}/commits/{commitId}/changes` | Get files changed in commit |

**Example:**
```bash
GET https://dev.azure.com/myorg/myproject/_apis/git/repositories?api-version=7.1
```

### 2. Pipelines API

**Base Path:** `/{organization}/{project}/_apis/pipelines`

| Operation | Method | Endpoint | Description |
|-----------|--------|----------|-------------|
| List Pipelines | GET | `/` | Get all pipelines in a project |
| Get Pipeline | GET | `/{pipelineId}` | Get pipeline definition |
| List Runs | GET | `/{pipelineId}/runs` | Get pipeline run history |
| Get Run | GET | `/{pipelineId}/runs/{runId}` | Get specific run details |
| Get Logs | GET | `/{pipelineId}/runs/{runId}/logs/{logId}` | Download run logs |

**Example:**
```bash
GET https://dev.azure.com/myorg/myproject/_apis/pipelines/123/runs?api-version=7.1
```

### 3. Build API

**Base Path:** `/{organization}/{project}/_apis/build`

| Operation | Method | Endpoint | Description |
|-----------|--------|----------|-------------|
| List Definitions | GET | `/definitions` | Get build definitions |
| Get Definition | GET | `/definitions/{definitionId}` | Get specific definition |
| List Builds | GET | `/builds` | Get build history with filters |
| Get Build | GET | `/builds/{buildId}` | Get specific build |
| Get Build Logs | GET | `/builds/{buildId}/logs` | Get all logs for a build |
| Get Build Log | GET | `/builds/{buildId}/logs/{logId}` | Get specific log file |

**Example:**
```bash
GET https://dev.azure.com/myorg/myproject/_apis/build/builds?api-version=7.1
```

### 4. Work Items API

**Base Path:** `/{organization}/{project}/_apis/wit`

| Operation | Method | Endpoint | Description |
|-----------|--------|----------|-------------|
| Get Work Item | GET | `/workitems/{id}` | Get single work item |
| Get Work Items (Batch) | GET | `/workitems?ids={ids}` | Get up to 200 work items |
| Create Work Item | POST | `/{project}/_apis/wit/workitems/${type}` | Create work item (JSON Patch) |
| Update Work Item | PATCH | `/workitems/{id}` | Update work item (JSON Patch) |
| Delete Work Item | DELETE | `/workitems/{id}` | Move to recycle bin |
| Query By WIQL | POST | `/wiql` | Execute WIQL query |
| Query By ID | GET | `/queries/{queryId}` | Get saved query results |

**Example - Get Work Items:**
```bash
GET https://dev.azure.com/myorg/_apis/wit/workitems?ids=1,2,3&api-version=7.1
```

**Example - Create Work Item (JSON Patch):**
```bash
POST https://dev.azure.com/myorg/myproject/_apis/wit/workitems/$Bug?api-version=7.1
Content-Type: application/json-patch+json

[
  {
    "op": "add",
    "path": "/fields/System.Title",
    "value": "Security Vulnerability - XSS in login form"
  },
  {
    "op": "add",
    "path": "/fields/System.Tags",
    "value": "security; xss; critical"
  }
]
```

### 5. Service Hooks API

**Base Path:** `/{organization}/_apis/hooks`

| Operation | Method | Endpoint | Description |
|-----------|--------|----------|-------------|
| List Subscriptions | GET | `/subscriptions` | Get all webhook subscriptions |
| Get Subscription | GET | `/subscriptions/{subscriptionId}` | Get specific subscription |
| Create Subscription | POST | `/subscriptions` | Create new webhook |
| Delete Subscription | DELETE | `/subscriptions/{subscriptionId}` | Remove webhook |
| Test Subscription | POST | `/subscriptions/{subscriptionId}/test` | Send test event |
| List Publishers | GET | `/publishers` | Get available event publishers |
| List Consumers | GET | `/consumers` | Get available consumers (webhook targets) |

**Example:**
```bash
POST https://dev.azure.com/myorg/_apis/hooks/subscriptions?api-version=7.1
```

### 6. Core API

**Base Path:** `/{organization}/_apis`

| Operation | Method | Endpoint | Description |
|-----------|--------|----------|-------------|
| List Projects | GET | `/projects` | Get all projects in organization |
| Get Project | GET | `/projects/{projectId}` | Get specific project |
| List Teams | GET | `/projects/{projectId}/teams` | Get teams in project |
| Get Team | GET | `/projects/{projectId}/teams/{teamId}` | Get team details |

**Example:**
```bash
GET https://dev.azure.com/myorg/_apis/projects?api-version=7.1
```

---

## Common Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `api-version` | string | **Required.** API version | `7.1` |
| `$top` | int | Max items to return | `50` |
| `$skip` | int | Number of items to skip | `100` |
| `continuationToken` | string | Pagination token | `{opaque-token}` |
| `$expand` | string | Expand related resources | `fields` |
| `$select` | string | Select specific fields | `id,title` |

---

## Request Headers

### Required Headers

```http
Authorization: Basic {base64-encoded-pat}
Content-Type: application/json
```

**PAT Authentication:**
```bash
# Encode empty username + PAT
echo -n ":{PAT}" | base64

# Example request
curl -H "Authorization: Basic {base64-string}" \
     https://dev.azure.com/myorg/_apis/projects?api-version=7.1
```

### Optional Headers

| Header | Purpose | Example |
|--------|---------|---------|
| `Accept` | Response format | `application/json` |
| `User-Agent` | Client identification | `Chariot/1.0` |
| `If-Match` | Concurrency control (ETags) | `"{etag-value}"` |

---

## Response Formats

### Standard Response Structure

```json
{
  "count": 100,
  "value": [
    { /* resource 1 */ },
    { /* resource 2 */ }
  ]
}
```

### Paginated Response

**Headers:**
```http
X-MS-ContinuationToken: {opaque-token}
```

**Next Request:**
```bash
GET /api/resource?continuationToken={opaque-token}&api-version=7.1
```

### Error Response

```json
{
  "message": "VS402392: The organization does not exist or you do not have permission to access it.",
  "typeKey": "OrganizationNotFoundException",
  "errorCode": 0
}
```

---

## JSON Patch Operations

Azure DevOps work item APIs use JSON Patch (RFC 6902).

### Supported Operations

| Operation | Description | Example |
|-----------|-------------|---------|
| `add` | Add or replace field | Add title |
| `replace` | Replace existing field | Update state |
| `remove` | Remove field value | Clear assignee |
| `test` | Validate field value | Check current state |
| `copy` | Copy value | Duplicate field |
| `move` | Move value | Reorder |

### Path Patterns

```
/fields/System.Title
/fields/System.State
/fields/System.AssignedTo
/fields/Custom.MyField
/relations/-
```

### Examples

**Add Title:**
```json
{
  "op": "add",
  "path": "/fields/System.Title",
  "value": "New work item"
}
```

**Add Relation (Parent):**
```json
{
  "op": "add",
  "path": "/relations/-",
  "value": {
    "rel": "System.LinkTypes.Hierarchy-Reverse",
    "url": "https://dev.azure.com/org/project/_apis/wit/workitems/123"
  }
}
```

**Test Before Update:**
```json
[
  {
    "op": "test",
    "path": "/fields/System.State",
    "value": "Active"
  },
  {
    "op": "replace",
    "path": "/fields/System.State",
    "value": "Resolved"
  }
]
```

---

## WIQL (Work Item Query Language)

SQL-like query language for work items.

### Basic Syntax

```sql
SELECT [field-list]
FROM workitems
WHERE [conditions]
ORDER BY [field] [ASC|DESC]
```

### Example Queries

**Security Work Items:**
```sql
SELECT [System.Id], [System.Title], [System.State]
FROM workitems
WHERE
    [System.TeamProject] = @project
    AND [System.Tags] CONTAINS 'security'
    AND [System.State] <> 'Closed'
ORDER BY [System.Priority] ASC
```

**Recent Changes:**
```sql
SELECT [System.Id], [System.Title]
FROM workitems
WHERE
    [System.ChangedDate] >= @Today - 7
    AND [System.AssignedTo] = @Me
```

**Historical Query (ASOF):**
```sql
SELECT [System.Id], [System.Title], [System.State]
FROM workitems
WHERE [System.TeamProject] = @project
ASOF '2025-01-01'
```

### Macros

| Macro | Description | Example |
|-------|-------------|---------|
| `@Me` | Current user | `[System.AssignedTo] = @Me` |
| `@Today` | Current date | `[System.CreatedDate] = @Today` |
| `@Today±n` | Relative date | `@Today - 30` |
| `@Project` | Current project | `[System.TeamProject] = @Project` |
| `@CurrentIteration` | Current iteration | `[System.IterationPath] = @CurrentIteration` |

---

## Rate Limiting

**Model:** TSTU (Time-Shared Throughput Units)
**Limit:** 200 TSTUs per 5-minute sliding window per user/pipeline

### Headers

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Total quota (200) |
| `X-RateLimit-Remaining` | TSTUs remaining |
| `X-RateLimit-Reset` | Unix timestamp when resets |
| `Retry-After` | Seconds to wait (429 only) |

**See:** [rate-limiting.md](rate-limiting.md) for complete guide.

---

## Related Resources

- [Azure DevOps REST API Documentation](https://learn.microsoft.com/en-us/rest/api/azure/devops/)
- [Git API Reference](https://learn.microsoft.com/en-us/rest/api/azure/devops/git/)
- [Work Items API Reference](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/)
- [Pipelines API Reference](https://learn.microsoft.com/en-us/rest/api/azure/devops/pipelines/)
- [WIQL Syntax](https://learn.microsoft.com/en-us/azure/devops/boards/queries/wiql-syntax)
