# Bugcrowd API Reference

**Last Updated:** 2026-01-03
**API Version:** v1 (2025-02-25+)
**Base URL:** `https://api.bugcrowd.com`
**Specification:** JSON:API (https://jsonapi.org)

---

## Authentication

```http
Authorization: Token {your-api-token}
Accept: application/vnd.bugcrowd+json
```

**Token Management:**

- Access tokens are provisioned on a per-user basis
- Users can create multiple tokens via API Credentials page (Profile > API Credentials)
- Optional IP allowlisting for enhanced security
- Token scope based on user role (Org Owner, Program Owner, etc.)

---

## Rate Limiting

- **Limit:** 60 requests per minute per IP address
- **Error Code:** 429 (Too Many Requests)
- **Scope:** Per-IP (shared across all tokens from same IP)
- **Retry Strategy:** Include `Retry-After` header in responses

---

## Core Endpoints

### Submissions API

#### List & Retrieve

| Operation         | Endpoint            | Method | Description                                                   |
| ----------------- | ------------------- | ------ | ------------------------------------------------------------- |
| List submissions  | `/submissions`      | GET    | Fetch vulnerability submissions with filtering and pagination |
| Get submission    | `/submissions/{id}` | GET    | Fetch specific submission details with relationships          |
| Create submission | `/submissions`      | POST   | Create new submission (with engagement relationship)          |
| Update submission | `/submissions/{id}` | PATCH  | Update submission state, priority, assignees                  |

#### Submission Sub-Resources

| Operation       | Endpoint                       | Method | Description                                     |
| --------------- | ------------------------------ | ------ | ----------------------------------------------- |
| Add comment     | `/submissions/{id}/comments`   | POST   | Add comment to submission with visibility scope |
| List comments   | `/submission_comments`         | GET    | List all comments with filtering                |
| List activities | `/submission_activities`       | GET    | List submission activity timeline               |
| Get activities  | `/submissions/{id}/activities` | GET    | Get activity timeline for specific submission   |

**Query Parameters (List /submissions):**

- `filter[assignee]`: Filter by assignee (array, 'me', or 'none')
- `filter[duplicate]`: Filter duplicates (boolean: true/false)
- `filter[updated_since]`: ISO8601 timestamp for incremental sync
- `filter[engagement_id]`: Filter by engagement/program
- `page[limit]`: Results per page (default: 25, max: 100)
- `page[offset]`: Offset for pagination (max: 9,900 in v1, unlimited in v1.1+)
- `sort`: Sort criteria (severity, timestamp, created_at, updated_at)

**Submission Include Parameters:**

- `activities` - Activity timeline
- `assignee` - Current assignee identity
- `assignees` - All assignees (supports multiple)
- `claim_ticket` - Claim ticket data
- `comments` - All comments
- `comments.author` - Comment author details
- `cvss_vector` - CVSS scoring vector
- `duplicates` - Duplicate submissions
- `duplicate_of` - Referenced duplicate
- `file_attachments` - Attached files
- `monetary_rewards` - Reward information
- `monetary_rewards.payments` - Reward payment history
- `program` - Related program
- `program.current_brief` - Program brief details
- `program.current_brief.target_groups` - Target groups
- `program.organization` - Organization details
- `researcher` - Researcher profile
- `target` - Target information

**Submission Attributes:**

- `title` - Vulnerability title
- `description` - Detailed description
- `priority` - P1-P5 severity rating
- `state` - Submission status (Open, Triaged, Unresolved, etc.)
- `vrt_id` - Vulnerability Rating Taxonomy ID
- `severity` - Technical severity level
- `cvss_score` - CVSS v3.1 score (if calculated)
- `created_at` - ISO8601 timestamp
- `updated_at` - ISO8601 timestamp

### Programs API

#### List & Retrieve

| Operation      | Endpoint           | Method | Description                                        |
| -------------- | ------------------ | ------ | -------------------------------------------------- |
| List programs  | `/programs`        | GET    | Fetch accessible programs filtered by organization |
| Get program    | `/programs/{code}` | GET    | Fetch program details with scope and rewards       |
| Update program | `/programs/{code}` | PATCH  | Update program settings                            |

**Query Parameters (List /programs):**

- `filter[organization_id]`: Filter by organization UUID (supports comma-separated list)
- `page[limit]`: Results per page (default: 25, max: 100)
- `page[offset]`: Offset for pagination
- `sort`: Sort criteria (name, created_at, updated_at)

**Program Include Parameters:**

- `current_brief` - Current program brief
- `current_brief.target_groups` - All target groups
- `current_brief.target_groups.targets` - All targets within groups
- `current_brief.target_groups.reward_range` - Reward information per severity
- `organization` - Organization details
- `engagements` - All program engagements

**Program Attributes:**

- `code` - Program identifier
- `name` - Program name
- `public_description` - Program description
- `platform` - Platform type (bug_bounty, vdp, etc.)
- `submission_count` - Total submissions received

### Target Groups & Targets API

#### List & Retrieve

| Operation    | Endpoint        | Method | Description                                                  |
| ------------ | --------------- | ------ | ------------------------------------------------------------ |
| List targets | `/targets`      | GET    | Fetch targets with filtering (max 100 per group recommended) |
| Get target   | `/targets/{id}` | GET    | Fetch specific target details                                |

**Query Parameters (List /targets):**

- `filter[target_group_id]`: Filter by target group UUID (required for large groups)
- `filter[program_id]`: Filter by program
- `filter[organization_id]`: Filter by organization
- `page[limit]`: Results per page (default: 25, max: 100)
- `page[offset]`: Offset for pagination

**Target Attributes:**

- `name` - Target name/identifier
- `description` - Target description
- `priority` - Logical priority level
- `target_type` - Type (domain, ip_range, service, etc.)
- `status` - Active/Inactive status

#### Target Groups API

| Operation          | Endpoint              | Method | Description                        |
| ------------------ | --------------------- | ------ | ---------------------------------- |
| List target groups | `/target_groups`      | GET    | Fetch target groups with filtering |
| Get target group   | `/target_groups/{id}` | GET    | Fetch specific target group        |

**Target Group Attributes:**

- `name` - Group name
- `description` - Scope description
- `reward_range` - Associated reward levels
- `targets_count` - Number of targets in group

#### Reward Range API

| Operation        | Endpoint              | Method | Description                                |
| ---------------- | --------------------- | ------ | ------------------------------------------ |
| Get reward range | `/reward_ranges/{id}` | GET    | Fetch reward information by severity level |

**Reward Range Attributes:**

- `p1_reward` - P1 (Critical) reward amount
- `p2_reward` - P2 (High) reward amount
- `p3_reward` - P3 (Medium) reward amount
- `p4_reward` - P4 (Low) reward amount
- `p5_reward` - P5 (Info) reward amount

### Organizations API

#### List & Retrieve

| Operation        | Endpoint              | Method | Description                |
| ---------------- | --------------------- | ------ | -------------------------- |
| Get organization | `/organizations/{id}` | GET    | Fetch organization details |

**Organization Attributes:**

- `name` - Organization name
- `slug` - Organization URL slug
- `subscription_type` - Enterprise/Standard/etc.

#### Organization Members API

| Operation                  | Endpoint                     | Method | Description                     |
| -------------------------- | ---------------------------- | ------ | ------------------------------- |
| List organization members  | `/organization_members`      | GET    | List all organization members   |
| Get organization member    | `/organization_members/{id}` | GET    | Fetch specific member           |
| Delete organization member | `/organization_members/{id}` | DELETE | Remove member from organization |

**Query Parameters:**

- `filter[organization_id]`: Filter by organization UUID
- `page[limit]`: Results per page
- `page[offset]`: Pagination offset

#### Organization Member Roles API

| Operation          | Endpoint             | Method | Description                    |
| ------------------ | -------------------- | ------ | ------------------------------ |
| Update member role | `/member_roles/{id}` | PATCH  | Change member role/permissions |

**Member Roles:**

- `Org Owner` - Full organization access
- `Org Admin` - Admin without billing
- `Researcher` - Researcher-only access
- `Custom Roles` - Organization-defined roles

### Researcher & User Management API

#### Researchers API

| Operation        | Endpoint            | Method | Description                            |
| ---------------- | ------------------- | ------ | -------------------------------------- |
| Get researcher   | `/researchers/{id}` | GET    | Fetch researcher profile by ID         |
| List researchers | `/researchers`      | GET    | List researchers (filtered by program) |

**Researcher Attributes:**

- `username` - Researcher handle
- `email` - Email address
- `reputation` - Community reputation score
- `submission_count` - Total submissions by researcher

#### Access Invitations API

| Operation                | Endpoint                   | Method | Description                         |
| ------------------------ | -------------------------- | ------ | ----------------------------------- |
| List access invitations  | `/access_invitations`      | GET    | List pending invitations            |
| Create access invitation | `/access_invitations`      | POST   | Invite user to organization/program |
| Delete access invitation | `/access_invitations/{id}` | DELETE | Revoke pending invitation           |

### Team Management API

#### Teams

| Operation   | Endpoint      | Method | Description                    |
| ----------- | ------------- | ------ | ------------------------------ |
| List teams  | `/teams`      | GET    | List all teams in organization |
| Get team    | `/teams/{id}` | GET    | Fetch specific team            |
| Create team | `/teams`      | POST   | Create new team                |
| Update team | `/teams/{id}` | PATCH  | Update team details            |
| Delete team | `/teams/{id}` | DELETE | Remove team                    |

#### Team Members

| Operation         | Endpoint             | Method | Description                   |
| ----------------- | -------------------- | ------ | ----------------------------- |
| List team members | `/team_members`      | GET    | List members of specific team |
| Get team member   | `/team_members/{id}` | GET    | Fetch team member details     |

#### Team Roles

| Operation        | Endpoint           | Method | Description                |
| ---------------- | ------------------ | ------ | -------------------------- |
| Create team role | `/team_roles`      | POST   | Assign role to team member |
| Delete team role | `/team_roles/{id}` | DELETE | Remove role from member    |

### Engagement & Program Structure API

#### Engagements (Relationships with Organizations)

| Operation        | Endpoint            | Method | Description                    |
| ---------------- | ------------------- | ------ | ------------------------------ |
| List engagements | `/engagements`      | GET    | Fetch organization engagements |
| Get engagement   | `/engagements/{id}` | GET    | Fetch engagement details       |

**Engagement Types:**

- `bug_bounty` - Bug bounty program
- `vdp` - Vulnerability Disclosure Program
- `penetration_test` - Penetration testing engagement

#### Program Briefs

| Operation         | Endpoint               | Method | Description               |
| ----------------- | ---------------------- | ------ | ------------------------- |
| Get program brief | `/program_briefs/{id}` | GET    | Fetch program brief/scope |

**Program Brief Attributes:**

- `title` - Brief title
- `description` - Scope description
- `in_scope` - In-scope details
- `out_of_scope` - Excluded from scope
- `vrt_enabled` - VRT usage enabled

#### Program Roles

| Operation           | Endpoint              | Method | Description                    |
| ------------------- | --------------------- | ------ | ------------------------------ |
| List program roles  | `/program_roles`      | GET    | List roles for program members |
| Create program role | `/program_roles`      | POST   | Assign role to program member  |
| Delete program role | `/program_roles/{id}` | DELETE | Remove member from program     |

**Program Roles:**

- `Owner` - Full program access
- `Triage` - Triaging permissions
- `Admin` - Program administration
- `Viewer` - Read-only access

### Submission Management API

#### Claim Tickets

| Operation        | Endpoint              | Method | Description                |
| ---------------- | --------------------- | ------ | -------------------------- |
| Get claim ticket | `/claim_tickets/{id}` | GET    | Fetch claim ticket details |

**Claim Ticket Data:**

- `token` - Claim token (only available on creation)
- `claim_url` - URL for researcher to claim
- `status` - Claimed/Unclaimed status

#### Duplicates

The `/submissions` endpoint supports duplicate filtering:

- `filter[duplicate]=true` - Return only duplicates
- `filter[duplicate]=false` - Return only non-duplicates

#### File Attachments

| Operation               | Endpoint                          | Method | Description                       |
| ----------------------- | --------------------------------- | ------ | --------------------------------- |
| Get attachment metadata | `/file_attachments/{id}`          | GET    | Fetch attachment details          |
| Download attachment     | `/file_attachments/{id}/download` | GET    | Download file with authentication |

**Attachment Attributes:**

- `filename` - Original filename
- `file_size` - Size in bytes
- `content_type` - MIME type
- `download_url` - Authenticated download URL (requires Authorization header)

**Note:** Legacy `s3_signed_url` attribute is deprecated; use `download_url` instead.

### Disclosure & Compliance API

#### Disclosure Requests

| Operation                | Endpoint                    | Method | Description               |
| ------------------------ | --------------------------- | ------ | ------------------------- |
| List disclosure requests | `/disclosure_requests`      | GET    | Fetch disclosure requests |
| Get disclosure request   | `/disclosure_requests/{id}` | GET    | Fetch specific request    |

**Disclosure Request Attributes:**

- `status` - Requested/Approved/Denied
- `requested_at` - ISO8601 timestamp
- `disclosure_date` - Proposed disclosure date

#### Authentication & Authorization Logs

| Operation                | Endpoint               | Method | Description             |
| ------------------------ | ---------------------- | ------ | ----------------------- |
| List authentication logs | `/authentication_logs` | GET    | API access audit log    |
| List authorization logs  | `/authorization_logs`  | GET    | Authorization event log |

**Log Attributes:**

- `ip_address` - Request IP address
- `timestamp` - Access timestamp
- `user_agent` - Client user agent
- `action` - Action performed

### Webhooks API

#### Outgoing Webhooks

| Operation      | Endpoint                             | Method | Description                   |
| -------------- | ------------------------------------ | ------ | ----------------------------- |
| List webhooks  | `/outgoing_webhooks`                 | GET    | List configured webhooks      |
| Get webhook    | `/outgoing_webhooks/{id}`            | GET    | Fetch webhook details         |
| Create webhook | `/outgoing_webhooks`                 | POST   | Create new webhook            |
| Update webhook | `/outgoing_webhooks/{id}`            | PATCH  | Update webhook configuration  |
| Delete webhook | `/outgoing_webhooks/{id}`            | DELETE | Remove webhook                |
| Get deliveries | `/outgoing_webhooks/{id}/deliveries` | GET    | View webhook delivery history |

**Webhook Configuration:**

- `name` - Webhook name
- `consumer_url` - Destination URL
- `events` - Triggering events array
- `secret` - HMAC verification secret

**Webhook Events:**

- `submission.created` - New submission
- `submission.updated` - Submission updated
- `submission.commented` - New comment added
- `submission.closed` - Submission closed
- `program.updated` - Program updated
- `researcher.joined` - Researcher joined

**Verification:**

- Header: `X-Bugcrowd-Digest`
- Method: HMAC-SHA256(secret, payload)

### Custom Fields API

| Operation                 | Endpoint                    | Method | Description                   |
| ------------------------- | --------------------------- | ------ | ----------------------------- |
| Get custom field label    | `/custom_field_labels/{id}` | GET    | Fetch custom field definition |
| Delete custom field label | `/custom_field_labels/{id}` | DELETE | Remove custom field           |

**Custom Field Usage:**

- Custom fields are serialized with submission resources
- Defined at organization or program level
- Appear as `custom_field_name` in submission attributes

### Vulnerabilities & VRT API

#### CVSS Vectors

| Operation       | Endpoint             | Method | Description            |
| --------------- | -------------------- | ------ | ---------------------- |
| Get CVSS vector | `/cvss_vectors/{id}` | GET    | Fetch CVSS v3.1 vector |

**CVSS Vector Attributes:**

- `vector_string` - CVSS:3.1/... format
- `base_score` - Numeric score (0-10)
- `base_severity` - Severity rating

#### VRT (Vulnerability Rating Taxonomy)

The VRT defines severity levels:

- `P1` - Critical (Highest priority, highest reward)
- `P2` - High
- `P3` - Medium
- `P4` - Low
- `P5` - Informational (No reward)

---

## Response Format

### Success Response (200 OK - List)

```json
{
  "data": [
    {
      "type": "submission",
      "id": "abc-123-def",
      "attributes": {
        "title": "SQL Injection in Login Form",
        "description": "Detailed vulnerability description...",
        "priority": "P1",
        "state": "Open",
        "severity": "critical",
        "vrt_id": "auth_injection",
        "cvss_score": 9.1,
        "created_at": "2026-01-03T15:00:00Z",
        "updated_at": "2026-01-03T16:30:00Z"
      },
      "relationships": {
        "program": {
          "data": { "type": "program", "id": "pgm_456" }
        },
        "researcher": {
          "data": { "type": "researcher", "id": "res_789" }
        },
        "assignee": {
          "data": { "type": "identity", "id": "id_001" }
        },
        "target": {
          "data": { "type": "target", "id": "tgt_222" }
        }
      }
    }
  ],
  "included": [
    {
      "type": "program",
      "id": "pgm_456",
      "attributes": {
        "code": "ACME-001",
        "name": "ACME Inc Bug Bounty",
        "submission_count": 42
      }
    },
    {
      "type": "researcher",
      "id": "res_789",
      "attributes": {
        "username": "security_researcher",
        "email": "researcher@example.com",
        "reputation": 1250
      }
    }
  ],
  "meta": {
    "total_count": 42,
    "page": {
      "limit": 25,
      "offset": 0
    }
  },
  "links": {
    "first": "/submissions?page[limit]=25&page[offset]=0",
    "next": "/submissions?page[limit]=25&page[offset]=25",
    "last": "/submissions?page[limit]=25&page[offset]=25"
  }
}
```

### Success Response (200 OK - Single Resource)

```json
{
  "data": {
    "type": "submission",
    "id": "abc-123-def",
    "attributes": {
      "title": "SQL Injection in Login Form",
      "description": "Detailed vulnerability description...",
      "priority": "P1",
      "state": "Open",
      "severity": "critical",
      "created_at": "2026-01-03T15:00:00Z",
      "updated_at": "2026-01-03T16:30:00Z"
    },
    "relationships": {
      "program": {
        "data": { "type": "program", "id": "pgm_456" }
      }
    }
  }
}
```

### Error Response (4xx/5xx)

```json
{
  "errors": [
    {
      "status": "429",
      "title": "Too Many Requests",
      "detail": "Rate limit exceeded. Retry after 60 seconds."
    }
  ]
}
```

**Common Error Codes:**

- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource does not exist)
- `422` - Unprocessable Entity (validation error)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error (server issue)

---

## Query Patterns

### JSON:API Standard Patterns

All endpoints follow JSON:API (https://jsonapi.org) specification:

#### Filter Pattern

```
GET /submissions?filter[assignee]=user_id&filter[duplicate]=false
```

#### Include Pattern (Nested Relationships)

```
GET /programs?include=current_brief.target_groups.targets,current_brief.target_groups.reward_range
```

#### Field Selection Pattern

```
GET /submissions?fields[submission]=title,priority,state&fields[program]=name,code
```

#### Sorting Pattern

```
GET /submissions?sort=-created_at,priority
# Prefix with - for descending order
```

#### Pagination Pattern

```
GET /submissions?page[limit]=50&page[offset]=100
```

#### Combined Query Example

```
GET /submissions?filter[updated_since]=2026-01-01T00:00:00Z&filter[duplicate]=false&include=researcher,program,target&sort=-updated_at&page[limit]=25&page[offset]=0
```

---

## Pagination

### Default Behavior

- Default limit: 25 results
- Maximum limit: 100 results
- Maximum offset: 9,900 (v1), unlimited (v1.1+)

### Pagination Example

```typescript
async function fetchAllSubmissions(): Promise<Submission[]> {
  const results: Submission[] = [];
  let offset = 0;
  const limit = 100;
  const MAX_OFFSET = 9900; // Bugcrowd v1 hard limit (v1.1+ is unlimited)

  while (offset <= MAX_OFFSET) {
    const response = await fetch(
      `https://api.bugcrowd.com/submissions?page[limit]=${limit}&page[offset]=${offset}`,
      {
        headers: {
          Authorization: `Token ${API_TOKEN}`,
          Accept: "application/vnd.bugcrowd+json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited - wait before retrying
        const retryAfter = response.headers.get("Retry-After");
        await delay(parseInt(retryAfter || "60") * 1000);
        continue;
      }
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    results.push(...data.data);

    // Check if more results exist
    if (data.data.length < limit) {
      break; // No more results
    }

    offset += limit;
  }

  return results;
}
```

---

## Common Use Cases

### Fetch Submissions with All Related Data

```bash
curl -X GET \
  'https://api.bugcrowd.com/submissions?include=researcher,program,target,assignee,comments,file_attachments,monetary_rewards&page[limit]=25' \
  -H 'Authorization: Token YOUR_API_TOKEN' \
  -H 'Accept: application/vnd.bugcrowd+json'
```

### Fetch Program Scope with Targets and Rewards

```bash
curl -X GET \
  'https://api.bugcrowd.com/programs?include=current_brief.target_groups.targets,current_brief.target_groups.reward_range&filter[organization_id]=org-uuid-here' \
  -H 'Authorization: Token YOUR_API_TOKEN' \
  -H 'Accept: application/vnd.bugcrowd+json'
```

### Filter Submissions by Status and Researcher

```bash
curl -X GET \
  'https://api.bugcrowd.com/submissions?filter[duplicate]=false&filter[updated_since]=2026-01-01T00:00:00Z&sort=-updated_at' \
  -H 'Authorization: Token YOUR_API_TOKEN' \
  -H 'Accept: application/vnd.bugcrowd+json'
```

### Create Webhook for Submission Events

```bash
curl -X POST \
  'https://api.bugcrowd.com/outgoing_webhooks' \
  -H 'Authorization: Token YOUR_API_TOKEN' \
  -H 'Accept: application/vnd.bugcrowd+json' \
  -H 'Content-Type: application/vnd.api+json' \
  -d '{
    "data": {
      "type": "outgoing_webhook",
      "attributes": {
        "name": "Submission webhook",
        "consumer_url": "https://your-domain.com/webhook",
        "events": ["submission.created", "submission.updated"]
      }
    }
  }'
```

---

## API Versioning

Bugcrowd uses semantic versioning for the API:

- **Major Version (v1):** Breaking changes - tokens pinned to major version
- **Minor Versions (v1.1, v1.2):** Backward-compatible additions
- **Patch Versions:** Bug fixes

API tokens automatically receive minor and patch updates but require manual action for major version upgrades.

### Version History

- **v1 (2024-03-27+):** Current stable version with consolidated endpoints
- **Previous (Legacy):** Date-based versions (2021-01-25, 2021-10-28, 2024-02-09, etc.)

---

## References

- [Bugcrowd API Getting Started](https://docs.bugcrowd.com/api/getting-started/)
- [Bugcrowd API Usage Guide](https://docs.bugcrowd.com/api/usage/)
- [Bugcrowd API Changelog](https://docs.bugcrowd.com/api/changelog/)
- [Bugcrowd Webhooks Documentation](https://docs.bugcrowd.com/api/webhooks/)
- [JSON:API Specification](https://jsonapi.org)
- [Bugcrowd Vulnerability Rating Taxonomy](https://bugcrowd.com/vulnerability-rating-taxonomy)
