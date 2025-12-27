# HackerOne REST API v1 - Complete Reference

**Comprehensive API documentation for HackerOne integration.**

## Table of Contents

- [Authentication](#authentication)
- [Reports API](#reports-api)
- [Programs API](#programs-api)
- [Activities API](#activities-api)
- [Pagination](#pagination)
- [Rate Limiting](#rate-limiting)

---

## Authentication

HackerOne API uses HTTP Basic Authentication with API credentials.

**Credentials format:**

- Username: API Identifier (found in HackerOne settings)
- Password: API Token (generated in HackerOne settings)

**Example:**

```bash
curl -X GET "https://api.hackerone.com/v1/reports" \
  -u "YOUR_API_IDENTIFIER:YOUR_API_TOKEN" \
  -H "Accept: application/json"
```

**Go implementation:**

```go
req.SetBasicAuth(apiIdentifier, apiToken)
req.Header.Set("Accept", "application/json")
```

---

## Reports API

### List Reports

**Endpoint:** `GET /v1/reports`

**Parameters:**

- `filter[state][]`: Filter by state (new, triaged, resolved, etc.)
- `filter[program][]`: Filter by program handle
- `page[size]`: Results per page (max 100)
- `page[number]`: Page number (1-indexed)
- `sort`: Sort order (created_at, -created_at for descending)

**Example request:**

```bash
curl "https://api.hackerone.com/v1/reports?filter[state][]=triaged&page[size]=25" \
  -u "API_ID:API_TOKEN"
```

**Response structure:**

```json
{
  "data": [
    {
      "id": "123456",
      "type": "report",
      "attributes": {
        "title": "SQL Injection in login endpoint",
        "state": "triaged",
        "created_at": "2025-01-15T10:00:00.000Z",
        "triaged_at": "2025-01-16T14:30:00.000Z",
        "severity": {
          "rating": "high",
          "score": 8.5,
          "author_type": "User"
        },
        "weakness": {
          "id": "67",
          "name": "SQL Injection",
          "description": "The software constructs SQL statements..."
        }
      },
      "relationships": {
        "reporter": {
          "data": {
            "id": "789",
            "type": "user"
          }
        },
        "assignee": {
          "data": {
            "id": "101",
            "type": "user"
          }
        }
      }
    }
  ],
  "links": {
    "self": "https://api.hackerone.com/v1/reports?page[number]=1",
    "next": "https://api.hackerone.com/v1/reports?page[number]=2",
    "last": "https://api.hackerone.com/v1/reports?page[number]=10"
  }
}
```

### Get Report

**Endpoint:** `GET /v1/reports/{id}`

**Example:**

```bash
curl "https://api.hackerone.com/v1/reports/123456" \
  -u "API_ID:API_TOKEN"
```

**Response includes:**

- Full report details
- All activities (comments, state changes)
- Attachments
- Related vulnerabilities
- Custom fields

### Update Report State

**Endpoint:** `POST /v1/reports/{id}/state_change`

**Request body:**

```json
{
  "data": {
    "type": "state-change",
    "attributes": {
      "state": "triaged",
      "message": "Thank you for this report. We have validated the issue."
    }
  }
}
```

**Valid states:**

- `new` → `triaged`, `needs-more-info`, `not-applicable`, `spam`
- `triaged` → `resolved`, `needs-more-info`, `informative`
- `needs-more-info` → `triaged`
- `resolved` → `triaged` (reopen)

---

## Programs API

### List Programs

**Endpoint:** `GET /v1/programs`

**Response:**

```json
{
  "data": [
    {
      "id": "program-123",
      "type": "program",
      "attributes": {
        "handle": "my-program",
        "name": "My Bug Bounty Program",
        "policy": "Please test responsibly...",
        "offers_bounties": true,
        "submission_state": "open"
      }
    }
  ]
}
```

### Get Program

**Endpoint:** `GET /v1/programs/{handle}`

Returns detailed program configuration, scope, bounty table.

---

## Activities API

### Create Activity

**Endpoint:** `POST /v1/reports/{report_id}/activities`

**Activity types:**

- `activity-comment`: Add comment to report
- `activity-bounty-awarded`: Award bounty
- `activity-swag-awarded`: Award swag

**Example (add comment):**

```json
{
  "data": {
    "type": "activity-comment",
    "attributes": {
      "message": "We have deployed a fix for this issue.",
      "internal": false
    }
  }
}
```

---

## Pagination

HackerOne uses cursor-based pagination with JSON:API format.

**Pattern:**

```
GET /v1/reports?page[size]=25&page[number]=1
```

**Response links:**

```json
{
  "links": {
    "self": "Current page URL",
    "first": "First page URL",
    "prev": "Previous page URL (if exists)",
    "next": "Next page URL (if exists)",
    "last": "Last page URL"
  }
}
```

**Go implementation:**

```go
func (c *Client) ListAllReports(ctx context.Context) ([]*Report, error) {
    var allReports []*Report
    page := 1

    for {
        reports, hasNext, err := c.ListReportsPage(ctx, page, 100)
        if err != nil {
            return nil, err
        }

        allReports = append(allReports, reports...)

        if !hasNext {
            break
        }

        page++
    }

    return allReports, nil
}
```

---

## Rate Limiting

**Limits:**

- 1,000 requests per hour (per API token)
- 10 requests per second burst

**Headers in response:**

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1642080000
```

**429 Response:**

```json
{
  "errors": [
    {
      "status": "429",
      "title": "Rate limit exceeded",
      "detail": "You have exceeded the rate limit. Retry after 60 seconds."
    }
  ]
}
```

**Handling strategy:**

```go
func (c *Client) handleRateLimit(resp *http.Response) error {
    if resp.StatusCode != 429 {
        return nil
    }

    // Parse Retry-After header
    retryAfter := resp.Header.Get("Retry-After")
    if retryAfter == "" {
        retryAfter = "60" // Default 60 seconds
    }

    waitSeconds, _ := strconv.Atoi(retryAfter)
    log.Printf("Rate limited, waiting %d seconds", waitSeconds)
    time.Sleep(time.Duration(waitSeconds) * time.Second)

    return fmt.Errorf("rate limit exceeded, retry after wait")
}
```

---

## Error Responses

All errors follow JSON:API format:

```json
{
  "errors": [
    {
      "id": "error-uuid",
      "status": "404",
      "title": "Not Found",
      "detail": "Report with ID 123456 not found",
      "source": {
        "pointer": "/data"
      }
    }
  ]
}
```

**Common error codes:**

- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (invalid credentials)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (resource doesn't exist)
- `422`: Unprocessable Entity (validation error)
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error (HackerOne issue)

---

## Related References

- [Client Setup](client-setup.md) - Go client implementation
- [Data Mapping](data-mapping.md) - Field mapping guide
- [HackerOne Official API Docs](https://api.hackerone.com/customer-resources/)
