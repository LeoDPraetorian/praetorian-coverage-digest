# API Preparation for PlexTrac Integration

**How the current field structure maps to future PlexTrac API integration.**

## Current State: Manual Workflow

**Today's process:**

1. Format finding using this skill
2. Copy markdown content
3. Manually paste into PlexTrac UI fields
4. Add tags via Tags field
5. Save finding

**Limitations:**

- Time-consuming for large engagements
- Manual copy/paste introduces errors
- No validation until finding is created
- Difficult to bulk-import findings

---

## Future State: API Integration

**Planned workflow:**

1. Format finding using this skill
2. Skill validates all required fields
3. Skill constructs API payload
4. Skill calls PlexTrac API to create finding
5. Finding appears in report automatically

**Benefits:**

- Automated finding creation
- Pre-validation before API call
- Bulk import capability
- Reduced human error

---

## PlexTrac API Overview

PlexTrac provides a REST API for programmatic finding creation:

**Base URL**: `https://praetorian.plextrac.com/api/v1/`

**Authentication**: API Key (header: `Authorization: Bearer {token}`)

**Key Endpoints:**

- `POST /clients/{clientId}/reports/{reportId}/findings` - Create finding
- `GET /clients/{clientId}/reports/{reportId}/findings` - List findings
- `PUT /clients/{clientId}/reports/{reportId}/findings/{findingId}` - Update finding
- `DELETE /clients/{clientId}/reports/{reportId}/findings/{findingId}` - Delete finding

**Documentation**: https://docs.plextrac.com/api/ (internal access required)

---

## Field Mapping: Skill Format → API Payload

### Core Fields

| Skill Field | API Field     | Type   | Notes                                             |
| ----------- | ------------- | ------ | ------------------------------------------------- |
| Name        | `title`       | string | Finding title                                     |
| Severity    | `severity`    | enum   | `Critical`, `High`, `Medium`, `Low`, `Info`       |
| CVSS Score  | `cvssScore`   | float  | Base score (0.0-10.0)                             |
| CVSS Vector | `cvssVector`  | string | Full vector string                                |
| Tags        | `tags`        | array  | Array of tag strings (`["phase_web", "owasp_3"]`) |
| Description | `description` | string | Markdown content                                  |
| Evidence    | `evidence`    | string | Markdown content (images as attachments)          |
| Remediation | `remediation` | string | Markdown content                                  |
| References  | `references`  | array  | Array of URL objects                              |

### Custom Fields

| Skill Field                         | API Field                      | Type   | Notes                   |
| ----------------------------------- | ------------------------------ | ------ | ----------------------- |
| Verification and Attack Information | `customFields.verification`    | string | Markdown content        |
| Systems Impacted                    | `customFields.systemsImpacted` | string | Markdown content        |
| ASVS                                | `customFields.asvs`            | string | Category name           |
| Effort                              | `customFields.effort`          | enum   | `Low`, `Medium`, `High` |
| Priority                            | `customFields.priority`        | enum   | `P1`, `P2`, `P3`        |

---

## Example API Payload

### Skill-Formatted Finding (Input)

```markdown
## SQL injection in user search endpoint

**Severity:** Critical
**CVSS:** 9.3 (Critical)
**CVSS Vector:** CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N
**Tags:** phase_web, owasp_3

### Description

The user search endpoint is vulnerable to SQL injection due to improper input validation...

### Verification and Attack Information

1. Navigate to https://app.example.com/search
2. Input the payload: ' OR '1'='1
3. Observe all user records are returned

### Systems Impacted

**System/Endpoint:** https://app.example.com/api/search
**Component:** User search API

### Evidence

[Screenshot showing SQL injection success]

### Remediation

1. Implement parameterized queries
2. Validate and sanitize all user input

**Effort:** Low
**Priority:** P1

### References

- https://owasp.org/www-community/attacks/SQL_Injection
```

### API Payload (Output)

```json
{
  "title": "SQL injection in user search endpoint",
  "severity": "Critical",
  "cvssScore": 9.3,
  "cvssVector": "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N",
  "tags": ["phase_web", "owasp_3"],
  "description": "The user search endpoint is vulnerable to SQL injection due to improper input validation...",
  "customFields": {
    "verification": "1. Navigate to https://app.example.com/search\n2. Input the payload: ' OR '1'='1\n3. Observe all user records are returned",
    "systemsImpacted": "**System/Endpoint:** https://app.example.com/api/search\n**Component:** User search API",
    "effort": "Low",
    "priority": "P1"
  },
  "evidence": "[Screenshot showing SQL injection success]",
  "remediation": "1. Implement parameterized queries\n2. Validate and sanitize all user input",
  "references": [
    {
      "url": "https://owasp.org/www-community/attacks/SQL_Injection",
      "title": "OWASP SQL Injection"
    }
  ],
  "attachments": []
}
```

---

## Image/Attachment Handling

**Current workflow**: Images embedded in markdown or uploaded manually

**API workflow**: Images uploaded separately, then referenced in finding

**API process:**

1. Upload image via `POST /clients/{clientId}/reports/{reportId}/attachments`
2. Receive attachment ID
3. Reference attachment in finding: `![Description](<attachment:{attachmentId}>)`

**Skill consideration**: When API integration is added, the skill will need to:

1. Detect embedded images in markdown
2. Upload each image to attachments endpoint
3. Replace image paths with attachment references
4. Include attachment IDs in finding payload

---

## Validation Before API Call

**Current skill validation:**

- Required fields present
- Tags include at least one `phase_` tag
- CVSS score matches severity range
- Field format is correct (markdown, enums, etc.)

**Additional API validation:**

- Client ID and Report ID are valid
- API key has write permissions
- Finding title is unique (optional duplicate check)
- Tags match report configuration

**Error handling:**

- API returns 400 Bad Request → Display validation errors to user
- API returns 401 Unauthorized → API key issue
- API returns 404 Not Found → Invalid client/report ID
- API returns 500 Server Error → Retry or manual fallback

---

## Bulk Import Capability

**Use case**: Import multiple findings from CSV, JSON, or other tools

**Workflow:**

1. Parse source format (CSV, JSON, tool output)
2. Map each finding to skill field structure
3. Validate all findings
4. Batch API calls (rate limit: TBD)
5. Report success/failure for each finding

**Example bulk import sources:**

- Burp Suite scanner output
- OWASP ZAP findings export
- Nessus vulnerability scan
- Custom security tool outputs

---

## Authentication and Authorization

**API Key Management:**

- Store API key in environment variable (never commit to code)
- Use per-user API keys (audit trail)
- Rotate keys regularly

**Permissions required:**

- Read access to clients and reports
- Write access to findings
- Upload access for attachments

**Recommended approach:**

```bash
export PLEXTRAC_API_KEY="your-api-key-here"
export PLEXTRAC_CLIENT_ID="client-uuid"
export PLEXTRAC_REPORT_ID="report-uuid"
```

---

## Rate Limiting Considerations

**PlexTrac API rate limits** (exact limits TBD, check API docs):

- Requests per minute: ~60 (estimated)
- Requests per hour: ~1000 (estimated)
- Bulk operations: Consider batching

**Skill implementation strategy:**

- Single finding: Direct API call
- Multiple findings (<10): Sequential API calls
- Bulk import (>10): Batch with delays, progress reporting

---

## Error Recovery

**Transient errors** (network, timeout):

- Retry with exponential backoff
- Max retries: 3
- Preserve finding data for manual retry

**Permanent errors** (validation, permissions):

- Display error message to user
- Save finding to local file
- Provide manual import option

**Partial success** (bulk import):

- Track which findings succeeded/failed
- Generate report of failures
- Allow selective retry of failed findings

---

## Future Skill Enhancements

When API integration is added:

1. **Interactive Mode**:
   - `format-plextrac-finding --interactive` → Prompts for each field
   - `format-plextrac-finding --from-file finding.json` → Import from file

2. **Validation Mode**:
   - `format-plextrac-finding --validate finding.md` → Check format without API call
   - Returns validation errors without creating finding

3. **Bulk Import Mode**:
   - `format-plextrac-finding --bulk findings-list.csv` → Import multiple findings
   - Progress bar, error reporting

4. **Template Management**:
   - `format-plextrac-finding --template sql-injection` → Use pre-defined template
   - Custom templates for common vulnerability types

---

## Implementation Checklist

When adding API integration to this skill:

- [ ] Add PlexTrac API client library dependency
- [ ] Implement authentication (API key from environment)
- [ ] Map skill fields to API payload structure
- [ ] Handle image uploads (attachments endpoint)
- [ ] Implement validation before API call
- [ ] Add error handling (network, validation, permissions)
- [ ] Implement rate limiting and retry logic
- [ ] Add bulk import capability
- [ ] Update skill documentation with API workflow
- [ ] Create examples with API integration
- [ ] Test with real PlexTrac instance

---

## Related Documentation

- [field-specifications.md](field-specifications.md) - Complete field requirements
- [finding-template.md](finding-template.md) - Current manual template
- PlexTrac API documentation (internal): https://docs.plextrac.com/api/
- PlexTrac Python SDK (if available): https://github.com/PlexTrac/plextrac-py
