# HackerOne API Reference

**API Version:** v1
**Base URL:** `https://api.hackerone.com`
**Sandbox URL:** `https://api.sandbox.hackerone.com`
**Authentication:** HTTP Basic Auth (API Token Identifier + Token Value)
**Last Updated:** January 3, 2026

## Overview

HackerOne API v1 provides comprehensive programmatic access to bug bounty program management, vulnerability reporting, credential management, analytics, and AI-assisted features. This reference documents all available endpoints organized by resource type.

## Quick Navigation

- [Activities](#activities)
- [Analytics](#analytics)
- [Credentials](#credentials)
- [Credential Inquiries](#credential-inquiries)
- [Email](#email)
- [HAI (AI) - Preview](#hai-ai---preview)
- [Reports (Customer)](#reports-customer)
- [Reports (Hacker)](#reports-hacker)
- [Report Intents (AI-Assisted)](#report-intents-ai-assisted)
- [Programs](#programs)
- [Hacktivity](#hacktivity)
- [Financial (Hacker)](#financial-hacker)
- [Asset Management](#asset-management)
- [Messaging](#messaging)

---

## Activities

Track and retrieve activity events on reports and programs.

### GET /activities/{id}

Retrieve a single activity by ID.

**Parameters:**

- `id` (path, required) - Activity UUID

**Response:** Activity object with type, actor, created_at, and resource relationships

**Example:**

```bash
curl -u "TOKEN_ID:TOKEN_VALUE" \
  https://api.hackerone.com/v1/activities/abc-123
```

### GET /incremental/activities

**Critical for efficient sync** - Query activities incrementally by timestamp.

**Parameters:**

- `handle` (query, required) - Program handle
- `report_id` (query, optional) - Filter by specific report ID
- `updated_at_after` (query, optional) - ISO 8601 timestamp, fetch activities after this time
- `sort` (query, optional) - Sort field (default: `updated_at`)
- `order` (query, optional) - Sort direction (`asc` or `desc`)
- `page[number]` (query, optional) - Page number (1-indexed)
- `page[size]` (query, optional) - Items per page (1-100, default: 25)

**Use Case:** Polling for new activities without fetching all reports. Much more efficient than scanning all reports for changes.

**Example:**

```bash
curl -u "TOKEN_ID:TOKEN_VALUE" \
  "https://api.hackerone.com/v1/incremental/activities?handle=my-program&updated_at_after=2026-01-01T00:00:00Z"
```

---

## Analytics

Fetch analytics data for metrics over time intervals.

### GET /analytics

Retrieve time-series metrics data.

**Parameters:**

- `key` (query, required) - Metric key (e.g., `reports_resolved`, `mean_time_to_resolution`)
- `interval` (query, required) - Time interval (`day`, `week`, `month`)
- `start_at` (query, required) - ISO 8601 start timestamp
- `end_at` (query, required) - ISO 8601 end timestamp
- `team_id` (query, optional) - Filter by team ID
- `organization_id` (query, optional) - Filter by organization ID

**Example:**

```bash
curl -u "TOKEN_ID:TOKEN_VALUE" \
  "https://api.hackerone.com/v1/analytics?key=reports_resolved&interval=week&start_at=2026-01-01T00:00:00Z&end_at=2026-01-31T23:59:59Z"
```

---

## Credentials

Manage test credentials for structured scopes (API endpoints, admin panels, etc.).

### GET /credentials

List credentials for a specific scope.

**Parameters:**

- `program_id` (query, required) - Program ID
- `structured_scope_id` (query, required) - Scope ID
- `state` (query, optional) - Filter by state (`active`, `revoked`)
- `page[number]`, `page[size]` - Pagination

**Example:**

```bash
curl -u "TOKEN_ID:TOKEN_VALUE" \
  "https://api.hackerone.com/v1/credentials?program_id=123&structured_scope_id=456"
```

### POST /credentials

Create a new credential.

**Request Body:**

```json
{
  "data": {
    "type": "credential",
    "attributes": {
      "structured_scope_id": "456",
      "username": "test_user",
      "password": "secure_password",
      "description": "Admin panel test account",
      "assignee": "hacker_username",
      "batch_id": "batch-123"
    }
  }
}
```

**Example:**

```bash
curl -X POST -u "TOKEN_ID:TOKEN_VALUE" \
  -H "Content-Type: application/json" \
  -d '{"data":{"type":"credential","attributes":{...}}}' \
  https://api.hackerone.com/v1/credentials
```

### PUT /credentials/{id}

Update an existing credential.

**Parameters:**

- `id` (path, required) - Credential ID

**Request Body:**

```json
{
  "data": {
    "type": "credential",
    "attributes": {
      "password": "new_password",
      "recycle": false
    }
  }
}
```

### PUT /credentials/{id}/assign

Assign credential to a specific hacker.

**Parameters:**

- `id` (path, required) - Credential ID

**Request Body:**

```json
{
  "data": {
    "type": "credential-assignment",
    "attributes": {
      "username": "hacker_username"
    }
  }
}
```

### PUT /credentials/{id}/revoke

Revoke credential access (temporary suspension).

**Parameters:**

- `id` (path, required) - Credential ID

**Response:** Credential object with `state: "revoked"`

### DELETE /credentials/{id}

Permanently delete a credential.

**Parameters:**

- `id` (path, required) - Credential ID

**Response:** 204 No Content

---

## Credential Inquiries

Hackers can request credentials for testing specific scopes.

### GET /programs/{id}/credential_inquiries

List all credential inquiries for a program.

**Parameters:**

- `id` (path, required) - Program ID
- `page[number]`, `page[size]` - Pagination

### POST /programs/{id}/credential_inquiries

Create a new credential inquiry.

**Parameters:**

- `id` (path, required) - Program ID

**Request Body:**

```json
{
  "data": {
    "type": "credential-inquiry",
    "attributes": {
      "structured_scope_id": "456",
      "description": "Need admin credentials to test authorization bypass"
    }
  }
}
```

### PUT /programs/{program_id}/credential_inquiries/{id}

Update an existing inquiry.

**Parameters:**

- `program_id` (path, required) - Program ID
- `id` (path, required) - Inquiry ID

### DELETE /programs/{program_id}/credential_inquiries/{id}

Delete a credential inquiry.

**Parameters:**

- `program_id` (path, required) - Program ID
- `id` (path, required) - Inquiry ID

### GET /programs/{program_id}/credential_inquiries/{credential_inquiry_id}/credential_inquiry_responses

List responses to a credential inquiry.

**Parameters:**

- `program_id` (path, required) - Program ID
- `credential_inquiry_id` (path, required) - Inquiry ID

### DELETE /programs/{program_id}/credential_inquiries/{credential_inquiry_id}/credential_inquiry_responses/{id}

Delete a specific inquiry response.

---

## Email

Send emails to organization members (Added January 2025).

### POST /email

Send a markdown-formatted email.

**Request Body:**

```json
{
  "data": {
    "type": "email",
    "attributes": {
      "email": "user@example.com",
      "subject": "Report Update Notification",
      "markdown_content": "# Report #123 Updated\n\nNew activity detected..."
    }
  }
}
```

**Use Case:** Automated notifications for report state changes, custom alerting workflows.

---

## HAI (AI) - Preview

AI-powered chat completions with report context (Preview feature).

### POST /hai/chat/completions

Create an AI chat completion with HackerOne knowledge.

**Request Body:**

```json
{
  "data": {
    "type": "hai-completion",
    "attributes": {
      "hai_play_id": "play-123",
      "messages": [{ "role": "user", "content": "Analyze this report for severity" }],
      "program_handles": ["my-program"],
      "report_ids": ["12345"],
      "cve_ids": ["CVE-2024-1234"],
      "cwe_ids": ["CWE-79"]
    }
  }
}
```

**Response:** AI-generated completion with analysis, suggestions, or triage recommendations.

### GET /hai/chat/completions

Retrieve completion history (details not fully documented in preview).

---

## Reports (Customer)

Manage vulnerability reports from organization/program perspective.

**Note:** Specific report endpoints (list, get, update, comment, etc.) were not fully detailed in available documentation. These endpoints exist but require deeper API docs inspection. Common operations include:

- `GET /reports` - List reports with filtering/pagination
- `GET /reports/{id}` - Get report details
- `PUT /reports/{id}` - Update report (state transitions, severity, etc.)
- `POST /reports/{id}/activities` - Add comments/internal notes
- `POST /reports/{id}/bounties` - Award bounties
- `GET /reports/{id}/activities` - Get report activity timeline

**See official docs:** https://api.hackerone.com/customer-resources/

---

## Reports (Hacker)

Submit and manage vulnerability reports as a hacker.

### GET /hackers/me/reports

Retrieve your submitted reports.

**Parameters:**

- `page[number]`, `page[size]` - Pagination
- Filter parameters (state, severity, program)

**Example:**

```bash
curl -u "TOKEN_ID:TOKEN_VALUE" \
  https://api.hackerone.com/v1/hackers/me/reports
```

### POST /hackers/reports

Submit a new vulnerability report.

**Request Body:**

```json
{
  "data": {
    "type": "report",
    "attributes": {
      "team_handle": "target-program",
      "title": "XSS in user profile",
      "vulnerability_information": "Detailed description...",
      "impact": "Impact analysis...",
      "severity_rating": "high",
      "structured_scope_id": "scope-123"
    }
  }
}
```

### GET /hackers/reports/{id}

Fetch specific report details including activities, attachments, and relationships.

**Parameters:**

- `id` (path, required) - Report ID

---

## Report Intents (AI-Assisted)

Draft reports with AI assistance before submission (Added September 2024).

### POST /hackers/report_intents

Create a draft report intent for AI analysis.

**Request Body:**

```json
{
  "data": {
    "type": "report-intent",
    "attributes": {
      "description": "Found potential SQL injection in search parameter"
    }
  }
}
```

**Response:** Intent object with AI analysis status

### GET /hackers/report_intents

List all your report intents.

**Parameters:**

- `page[number]`, `page[size]` - Pagination

### GET /hackers/report_intents/{id}

Retrieve specific intent with AI analysis results.

**Parameters:**

- `id` (path, required) - Intent ID

**Response:** Includes AI suggestions for title, severity, CWE classification

### PATCH /hackers/report_intents/{id}

Update intent description for AI refinement.

**Parameters:**

- `id` (path, required) - Intent ID

**Request Body:**

```json
{
  "data": {
    "type": "report-intent",
    "attributes": {
      "description": "Updated description with more details..."
    }
  }
}
```

### DELETE /hackers/report_intents/{id}

Remove draft intent.

**Parameters:**

- `id` (path, required) - Intent ID

### POST /hackers/report_intents/{id}/submit

Convert finalized intent into submitted report.

**Parameters:**

- `id` (path, required) - Intent ID

**Response:** Created report object

### POST /hackers/report_intents/{id}/attachments

Upload supporting evidence files to intent.

**Parameters:**

- `id` (path, required) - Intent ID

**Request:** Multipart form data with file attachment

### GET /hackers/report_intents/{id}/attachments

Retrieve list of attached files.

**Parameters:**

- `id` (path, required) - Intent ID

### DELETE /hackers/report_intents/{id}/attachments/{attachment_id}

Remove specific attachment.

**Parameters:**

- `id` (path, required) - Intent ID
- `attachment_id` (path, required) - Attachment ID

---

## Programs

Discover and query bug bounty programs.

### GET /hackers/programs

List available programs (hacker perspective).

**Parameters:**

- `page[number]`, `page[size]` - Pagination
- Filter parameters (state, type)

**Example:**

```bash
curl -u "TOKEN_ID:TOKEN_VALUE" \
  https://api.hackerone.com/v1/hackers/programs
```

### GET /hackers/programs/{handle}

Get specific program details.

**Parameters:**

- `handle` (path, required) - Program handle (slug)

**Response:** Program object with policy, scope, bounty ranges, SLAs

### GET /hackers/programs/{handle}/structured_scopes

View program's in-scope assets and attack surfaces.

**Parameters:**

- `handle` (path, required) - Program handle

**Response:** Array of structured scope objects (URLs, IP ranges, mobile apps, etc.)

### GET /hackers/programs/{handle}/weaknesses

Browse vulnerability types (CWEs) accepted by program.

**Parameters:**

- `handle` (path, required) - Program handle

**Response:** Array of accepted weakness types with bounty ranges per severity

---

## Hacktivity

Public feed of disclosed vulnerability reports.

### GET /hackers/hacktivity

Query paginated list of public reports.

**Parameters:**

- `querystring` (query, optional) - Apache Lucene query syntax for filtering by severity, asset type, vulnerability class, disclosure status
- `page[number]`, `page[size]` - Pagination

**Example:**

```bash
curl -u "TOKEN_ID:TOKEN_VALUE" \
  "https://api.hackerone.com/v1/hackers/hacktivity?querystring=severity:critical"
```

**Lucene Query Examples:**

- `severity:critical` - Critical severity only
- `asset_type:url` - URL-based vulnerabilities
- `disclosed:true` - Only disclosed reports

---

## Financial (Hacker)

Track earnings, balance, and payouts.

### GET /hackers/payments/balance

Check current account balance.

**Response:**

```json
{
  "data": {
    "type": "balance",
    "attributes": {
      "balance": 5000.0,
      "currency": "USD"
    }
  }
}
```

### GET /hackers/payments/earnings

View earning history with bounties and rewards.

**Parameters:**

- `page[number]`, `page[size]` - Pagination

**Response:** Array of earning records with amount, report ID, date

### GET /hackers/payments/payouts

Track payment history and payout status.

**Parameters:**

- `page[number]`, `page[size]` - Pagination

**Response:** Array of payout records with status (pending, completed, failed)

---

## Asset Management

Manage program assets and tagging (Added May 2024 - December 2025).

### POST /asset_tags

Create asset tag (Added December 2025).

**Request Body:**

```json
{
  "data": {
    "type": "asset-tag",
    "attributes": {
      "name": "production",
      "category_id": "cat-123"
    }
  }
}
```

### GET /asset_tag_categories

Get all asset tag categories (Added December 2025).

**Response:** Array of tag categories for organization

### PUT /assets/{id}/scope

Update asset scope with instructions (Added October 2025).

**Parameters:**

- `id` (path, required) - Asset ID

**Request Body:**

```json
{
  "data": {
    "type": "asset",
    "attributes": {
      "in_scope": true,
      "instruction": "Test all API endpoints except /admin"
    }
  }
}
```

---

## Messaging

Communicate with hackers and external platforms (Added July-October 2025).

### POST /messages/hackers

Send message to hacker (Added July 2025).

**Request Body:**

```json
{
  "data": {
    "type": "message",
    "attributes": {
      "recipient_username": "hacker_name",
      "subject": "Question about report #123",
      "message": "Can you provide more details..."
    }
  }
}
```

### POST /messages/external_platforms

Notify external platforms like Slack (Added October 2025).

**Request Body:**

```json
{
  "data": {
    "type": "external-notification",
    "attributes": {
      "integration_id": "slack-integration-123",
      "message": "New critical report submitted"
    }
  }
}
```

---

## Pagination

All list endpoints support pagination via query parameters:

- `page[number]` - Page number (1-indexed)
- `page[size]` - Items per page (1-100, default: 25)

**Response includes pagination metadata:**

```json
{
  "data": [...],
  "links": {
    "first": "https://api.hackerone.com/v1/resource?page[number]=1",
    "prev": "https://api.hackerone.com/v1/resource?page[number]=2",
    "next": "https://api.hackerone.com/v1/resource?page[number]=4",
    "last": "https://api.hackerone.com/v1/resource?page[number]=10"
  }
}
```

---

## Rate Limits

| Operation Type   | Limit        | Window         | Notes                      |
| ---------------- | ------------ | -------------- | -------------------------- |
| Read Operations  | 600 requests | Per minute     | General endpoints          |
| Report Pages     | 300 requests | Per minute     | Stricter (Oct 2023 change) |
| Write Operations | 25 requests  | Per 20 seconds | Creates, updates, deletes  |

**Headers:**

- `RateLimit-Limit` - Total quota in window
- `RateLimit-Remaining` - Requests left
- `RateLimit-Reset` - Unix timestamp of reset
- `Retry-After` - Seconds to wait (on 429 errors)

---

## Error Responses

All errors follow JSON:API format:

```json
{
  "errors": [
    {
      "status": "404",
      "title": "Not Found",
      "detail": "Report with ID 'invalid' not found"
    }
  ]
}
```

**Common Status Codes:**

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid credentials)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `422` - Unprocessable Entity (semantic errors)
- `429` - Too Many Requests (rate limited)
- `500-503` - Server errors (retry with backoff)

---

## API Versioning

**Current Version:** v1 (only version available)

HackerOne uses **additive versioning** - new features are added without breaking changes. No API v2 is planned. All endpoints evolve backward-compatibly within v1.

**No GraphQL API:** HackerOne API is REST-only.

---

## Additional Resources

- **Official Documentation:** https://api.hackerone.com/customer-resources/
- **Hacker API Docs:** https://api.hackerone.com/hacker-resources/
- **Getting Started:** https://api.hackerone.com/getting-started/
- **Sandbox Environment:** https://api.sandbox.hackerone.com (for testing)
- **API Tools:** https://github.com/Hacker0x01/awesome-hacker-api-tools
