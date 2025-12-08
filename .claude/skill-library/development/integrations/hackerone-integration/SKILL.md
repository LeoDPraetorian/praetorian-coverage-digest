---
name: hackerone-integration
description: Integrates HackerOne bug bounty platform with Chariot - vulnerability report ingestion, researcher collaboration, bounty management
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite
---

# HackerOne Integration

**Integration patterns for connecting HackerOne bug bounty platform with Chariot security platform - ingesting vulnerability reports, managing researcher collaboration, tracking bounty programs, and automating security workflows.**

## When to Use

Use this skill when:
- Integrating HackerOne as a vulnerability source for Chariot
- Syncing HackerOne reports to Chariot Risk entities
- Implementing bidirectional updates between HackerOne and Chariot
- Configuring HackerOne webhooks for real-time report notifications
- Mapping HackerOne severity ratings to Chariot risk priorities
- Building automated bounty workflows
- Managing HackerOne program configurations via Chariot

## Prerequisites

- HackerOne program with API access (Professional/Enterprise plan)
- HackerOne API credentials (API identifier + API token)
- Chariot platform with integration capabilities
- Understanding of HackerOne REST API v1
- Webhook endpoint configuration (for real-time updates)
- AWS infrastructure for Chariot backend (Lambda, DynamoDB, S3)

## Configuration

### Environment Variables

```bash
# HackerOne credentials
HACKERONE_API_IDENTIFIER=your-api-identifier
HACKERONE_API_TOKEN=your-api-token

# HackerOne program configuration
HACKERONE_PROGRAM_HANDLE=your-program-handle
HACKERONE_DEFAULT_STATE=triaged

# Webhook configuration (optional)
HACKERONE_WEBHOOK_SECRET=your-webhook-secret
CHARIOT_WEBHOOK_URL=https://api.chariot.example.com/webhooks/hackerone
```

### Authentication Methods

| Method | Use Case | Security | Setup Complexity |
|--------|----------|----------|------------------|
| API Token | Automated scripts, CI/CD | High | Low |
| OAuth 2.0 | User-facing integrations | Very High | High |
| Session Cookies | Manual testing only | Low | Very Low |

**Recommendation**: Use API tokens for automation (required for programmatic access). OAuth 2.0 is available but more complex.

### Chariot Integration Architecture

HackerOne integration follows Chariot's standard third-party integration pattern:

```
modules/chariot/backend/pkg/integration/
├── hackerone/
│   ├── client.go           # HackerOne API client
│   ├── mapper.go           # Report → Risk mapping
│   ├── webhook.go          # Webhook event handling
│   ├── types.go            # HackerOne data models
│   └── client_test.go      # Unit tests
```

**Key Chariot patterns to follow:**
- Use `modules/chariot/backend/pkg/integration/` directory structure
- Implement `Integration` interface from Chariot integration framework
- Store credentials in AWS Secrets Manager (not hardcoded)
- Use Chariot's standard error handling and retry logic
- Follow Chariot's audit logging patterns
- Map HackerOne reports to Chariot `Risk` entity

## Quick Reference

| Operation | Endpoint | Method | Notes |
|-----------|----------|--------|-------|
| List Reports | `/reports` | GET | Paginated, filter by state |
| Get Report | `/reports/{id}` | GET | Includes activities, attachments |
| Create Report Activity | `/reports/{id}/activities` | POST | Add comments, state changes |
| Update Report State | `/reports/{id}/state` | POST | Triage, resolve, close |
| List Programs | `/programs` | GET | Your accessible programs |
| Get Program | `/programs/{handle}` | GET | Program details, policy |

**Rate Limits**: 1,000 requests per hour (default), 10 requests per second burst

## Implementation

### Step 1: HackerOne API Client Setup

See [references/client-setup.md](references/client-setup.md) for complete implementation.

**Quick summary:**
- Create reusable client with API token authentication
- Implement rate limiting (1000/hour, 10/sec burst)
- Add exponential backoff retry logic
- Handle HackerOne pagination patterns
- Follow Chariot integration patterns

### Step 2: Map HackerOne Reports to Chariot Risks

See [references/data-mapping.md](references/data-mapping.md) for field mapping guide.

**Key mappings:**
- HackerOne `severity.rating` → Chariot `Risk.Priority`
- HackerOne `state` → Chariot `Risk.Status`
- HackerOne `weakness.name` → Chariot `Risk.Category`
- HackerOne `reporter` → Chariot `Risk.Source`
- HackerOne `structured_scope.asset_identifier` → Chariot `Asset.Identifier`

### Step 3: Implement Webhook Handlers

See [references/webhook-handling.md](references/webhook-handling.md) for webhook patterns.

**Webhook events to handle:**
- `report_created` - New vulnerability submitted
- `report_state_change` - Triage, resolved, closed
- `report_severity_change` - Severity updated by team
- `report_activity` - New comment or action

### Step 4: Testing Strategy

See [references/testing-patterns.md](references/testing-patterns.md) for complete testing guide.

**Test coverage:**
- Unit tests: API client methods, data mapping logic
- Integration tests: Real HackerOne sandbox API calls
- Webhook tests: Mock webhook payloads
- E2E tests: Full report ingestion workflow

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid API credentials | Regenerate API token, check identifier |
| 404 Not Found | Invalid report ID or program handle | Verify report exists and is accessible |
| 403 Forbidden | Insufficient permissions | Check API token has program access |
| 429 Rate Limit | Exceeded rate limits | Implement backoff, batch operations |
| 422 Unprocessable Entity | Invalid field values | Check HackerOne field requirements |

### Rate Limiting Strategy

```go
// Implement token bucket rate limiter
type RateLimiter struct {
    tokens      int
    maxTokens   int
    refillRate  time.Duration
    lastRefill  time.Time
    mu          sync.Mutex
}

func (rl *RateLimiter) Wait(ctx context.Context) error {
    rl.mu.Lock()
    defer rl.mu.Unlock()

    // Refill tokens based on time elapsed
    now := time.Now()
    elapsed := now.Sub(rl.lastRefill)
    tokensToAdd := int(elapsed / rl.refillRate)

    if tokensToAdd > 0 {
        rl.tokens = min(rl.tokens + tokensToAdd, rl.maxTokens)
        rl.lastRefill = now
    }

    // Wait if no tokens available
    if rl.tokens == 0 {
        waitDuration := rl.refillRate
        time.Sleep(waitDuration)
        rl.tokens = 1
    }

    rl.tokens--
    return nil
}
```

## Security Considerations

### Credential Storage

- **Never hardcode credentials** in source code
- Store API tokens in AWS Secrets Manager
- Use IAM roles for Lambda execution
- Rotate credentials quarterly
- Audit credential access logs

### Data Privacy

- **Sanitize researcher PII** before storing in Chariot
- Implement field-level encryption for sensitive data
- Configure report visibility (public vs private)
- Comply with GDPR/CCPA for researcher data
- Redact sensitive information in logs

### Webhook Security

- **Verify webhook signatures** using HMAC-SHA256
- Validate webhook payload against expected schema
- Implement IP allowlisting for HackerOne webhook IPs
- Use HTTPS for all webhook URLs
- Log all webhook events for audit

### Report Access Control

- **Restrict report access** to authorized users
- Implement role-based access control (RBAC)
- Audit all report accesses
- Handle report disclosure timelines
- Protect sensitive vulnerability details

## HackerOne-Specific Patterns

### Severity Rating System

HackerOne uses CVSS-based severity:

| HackerOne Severity | CVSS Score | Chariot Priority |
|-------------------|------------|------------------|
| Critical | 9.0 - 10.0 | P0 (Critical) |
| High | 7.0 - 8.9 | P1 (High) |
| Medium | 4.0 - 6.9 | P2 (Medium) |
| Low | 0.1 - 3.9 | P3 (Low) |
| None | 0.0 | P4 (Info) |

### Report States

| State | Meaning | Chariot Status |
|-------|---------|----------------|
| new | Just submitted | Open |
| triaged | Team validated | Confirmed |
| needs-more-info | Waiting for researcher | Pending |
| resolved | Fixed and verified | Resolved |
| not-applicable | Out of scope | Rejected |
| informative | FYI only | Info |
| duplicate | Already reported | Duplicate |
| spam | Invalid report | Rejected |

### Weakness Categories

HackerOne uses CWE (Common Weakness Enumeration):

- SQL Injection (CWE-89)
- Cross-Site Scripting (CWE-79)
- Authentication Bypass (CWE-287)
- See [CWE Top 25](https://cwe.mitre.org/top25/) for complete list

Map CWE IDs to Chariot risk categories.

## Progressive Disclosure

### Detailed References

Load these as needed for implementation:

| Reference | Purpose | When to Read |
|-----------|---------|--------------|
| [API Reference](references/api-reference.md) | Full HackerOne REST API v1 docs | When implementing API calls |
| [Client Setup](references/client-setup.md) | Go client implementation | When creating integration |
| [Data Mapping](references/data-mapping.md) | Report → Risk field mapping | When syncing data |
| [Webhook Handling](references/webhook-handling.md) | Event handling patterns | When building real-time sync |
| [Testing Patterns](references/testing-patterns.md) | Unit/integration test guide | When writing tests |

### Examples

| Example | Scenario | Use Case |
|---------|----------|----------|
| [Basic Sync](examples/basic-sync.md) | One-way report ingestion | Initial integration |
| [Bidirectional Sync](examples/bidirectional-sync.md) | Two-way state updates | Advanced integration |
| [Bounty Automation](examples/bounty-automation.md) | Automated bounty workflows | Program management |

## Related Skills

- `integration-chariot-patterns` - General Chariot integration patterns
- `gateway-backend` - Go backend development patterns
- `gateway-testing` - Testing strategies for integrations
- `gateway-security` - Security best practices for API integrations

## External Resources

- [HackerOne API Documentation](https://api.hackerone.com/customer-resources/)
- [HackerOne Platform Documentation](https://docs.hackerone.com/)
- [CVSS Calculator](https://www.first.org/cvss/calculator/3.1)
- [CWE List](https://cwe.mitre.org/)
