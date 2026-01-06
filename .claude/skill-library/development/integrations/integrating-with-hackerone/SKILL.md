---
name: integrating-with-hackerone
description: Use when integrating Chariot with HackerOne - provides authentication patterns, API coverage (reports, programs, vulnerabilities, bounties), webhook handling, rate limiting, retry logic, and production-ready security practices for bidirectional vulnerability data synchronization
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite
---

# Integrating with HackerOne

**Comprehensive integration patterns for connecting Chariot platform with HackerOne's bug bounty and vulnerability disclosure APIs.**

## When to Use

Use this skill when:

- Implementing HackerOne API integration for vulnerability sync
- Setting up bidirectional data synchronization between Chariot and HackerOne
- Building webhook handlers for real-time HackerOne events
- Troubleshooting HackerOne API authentication or rate limiting issues
- Designing data mapping between Chariot Risk/Asset models and HackerOne Reports

**You MUST use TodoWrite** to track integration implementation phases.

## Quick Reference

| Topic                 | Reference                                                                  | Purpose                                                                                   |
| --------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Authentication        | [references/authentication.md](references/authentication.md)               | HTTP Basic Auth with API tokens, token rotation, AWS Secrets Manager                      |
| API Coverage          | [references/api-reference.md](references/api-reference.md)                 | 50+ endpoints: Reports, Programs, Credentials, Analytics, Email, HAI (AI), Report Intents |
| Webhooks              | [references/webhook-handling.md](references/webhook-handling.md)           | Event types, signature verification, idempotency                                          |
| Rate Limiting         | [references/rate-limiting.md](references/rate-limiting.md)                 | Retry strategies, backoff algorithms, quota management                                    |
| Data Mapping          | [references/data-mapping.md](references/data-mapping.md)                   | Chariot ↔ HackerOne entity translation                                                    |
| Error Handling        | [references/error-handling.md](references/error-handling.md)               | API error codes, retry decision tree, logging patterns                                    |
| Client Implementation | [references/client-implementation.md](references/client-implementation.md) | Go client patterns, rate limiting, circuit breakers, caching                              |
| Sync Patterns         | [references/sync-patterns.md](references/sync-patterns.md)                 | Incremental activities sync, webhooks, bidirectional sync, conflict resolution            |
| Testing Patterns      | [references/testing-patterns.md](references/testing-patterns.md)           | Unit tests, sandbox integration tests, E2E tests, contract testing                        |
| Security Practices    | [references/security-practices.md](references/security-practices.md)       | Security checklist, credential management, PII handling, compliance                       |

## Integration Architecture

### Authentication Strategy

**HackerOne uses HTTP Basic Authentication with API tokens (NOT OAuth 2.0).**

**API Token Authentication:**

- Identifier + Token pair for programmatic access
- Tokens don't expire (manual rotation required)
- Suitable for all integration types
- Permissions based on group memberships
- Rotate every 30-60 days in production

**For complete authentication implementation, see:** [references/authentication.md](references/authentication.md)

### API Client Design Pattern

```go
// Chariot pattern for third-party API clients
type HackerOneClient struct {
    httpClient  *http.Client
    baseURL     string
    rateLimiter *rate.Limiter
    auth        AuthProvider
}

// Authentication abstraction
type AuthProvider interface {
    GetHeaders(ctx context.Context) (map[string]string, error)
    RefreshIfNeeded(ctx context.Context) error
}
```

**Key patterns:**

- Interface-based auth for testability (mock in tests, real in production)
- Rate limiter embedded in client (prevents 429 errors)
- Context propagation for cancellation and deadlines
- Retry logic with exponential backoff

**For complete client implementation, see:** [references/client-implementation.md](references/client-implementation.md)

### Core API Operations

**HackerOne API v1 provides 50+ endpoints across multiple resource types:**

**Reports (Primary Integration Point)**

- List reports with pagination and filtering
- Get report details with structured data (title, severity, state, timeline)
- Transition report states (triaged, resolved, disclosed)
- Add comments and internal notes
- Create/update bounties

**Incremental Activities (Critical for Sync)**

- `GET /incremental/activities` - Fetch only changed reports since timestamp
- 10-100x more efficient than polling all reports
- **Recommended for production integrations**

**Report Intents (AI-Assisted Submission)** ✨ _Added September 2024_

- Draft reports with AI assistance
- AI-powered vulnerability classification
- CWE recommendations and severity suggestions

**Credentials Management**

- Manage test credentials for structured scopes
- Assign credentials to hackers
- Revoke and rotate credentials

**Analytics**

- Fetch time-series metrics
- Program statistics and performance data

**Email & Messaging** ✨ _Added 2025_

- Send emails to organization members (Jan 2025)
- Message hackers (Jul 2025)
- Notify external platforms like Slack (Oct 2025)

**HAI (AI) - Preview**

- AI chat completions with report context
- Vulnerability analysis and triage assistance

**Asset Management** ✨ _Added 2024-2025_

- Asset tagging with categories (Dec 2024 - Dec 2025)
- Update asset scope with instructions (Oct 2025)

**CVSS 4.0 Support** ✨ _Added January 2025_

- CVSS 4.0 scores in severity object
- Backward compatible with CVSS 3.1

**For complete API reference with all 50+ endpoints, see:** [references/api-reference.md](references/api-reference.md)

### Webhook Integration

HackerOne webhooks deliver real-time events for:

- Report state changes (submitted, triaged, resolved)
- New activity (comments, bounty awards)
- Program updates

**Security Requirements:**

1. **Signature Verification**: Validate `X-HackerOne-Signature` header using HMAC-SHA256
2. **Idempotency**: Track event IDs to prevent duplicate processing
3. **Replay Protection**: Reject events with timestamps >5 minutes old

**For complete webhook implementation, see:** [references/webhook-handling.md](references/webhook-handling.md)

## Data Synchronization Patterns

### Chariot → HackerOne Mapping

| Chariot Entity | HackerOne Entity        | Sync Strategy                        |
| -------------- | ----------------------- | ------------------------------------ |
| Risk           | Report                  | Bidirectional (read + update states) |
| Asset          | Report.structured_scope | Read-only (from HackerOne)           |
| Attribute      | Report.custom_fields    | Conditional sync                     |
| Job            | Background sync task    | Internal only                        |

**State Machine Mapping:**

- Chariot Risk.status → HackerOne Report.state
- Chariot Risk.severity → HackerOne Report.severity_rating
- Chariot Risk.risk_score → HackerOne Report.bounty_amount (indirect)

**For complete data mapping, see:** [references/data-mapping.md](references/data-mapping.md)

### Sync Patterns

**1. Polling (Initial Implementation)**

```
Every 5 minutes:
  1. Fetch reports updated since last sync
  2. Transform to Chariot Risk entities
  3. Upsert to Chariot backend
  4. Update sync cursor
```

**2. Webhook-Driven (Production Pattern)**

```
On webhook event:
  1. Verify signature
  2. Check idempotency (event ID cache)
  3. Fetch full report data (webhook payloads are minimal)
  4. Transform and sync to Chariot
```

**For complete sync implementation, see:** [references/sync-patterns.md](references/sync-patterns.md)

## Rate Limiting and Retry

### HackerOne Rate Limits

- **Default**: 1000 requests/hour per API token
- **Burst**: 100 requests/minute
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### Retry Strategy

```go
// Exponential backoff with jitter
func (c *HackerOneClient) retryWithBackoff(ctx context.Context, fn func() error) error {
    backoff := time.Second
    for attempt := 0; attempt < maxRetries; attempt++ {
        err := fn()
        if err == nil {
            return nil
        }

        // Retry on 429, 5xx, network errors
        if !isRetryable(err) {
            return err
        }

        // Exponential backoff with jitter
        jitter := time.Duration(rand.Int63n(int64(backoff / 2)))
        time.Sleep(backoff + jitter)
        backoff *= 2
    }
    return fmt.Errorf("max retries exceeded")
}
```

**For complete rate limiting implementation, see:** [references/rate-limiting.md](references/rate-limiting.md)

## Error Handling Patterns

### Common API Errors

| Status Code | Meaning          | Retry? | Action                                    |
| ----------- | ---------------- | ------ | ----------------------------------------- |
| 401         | Unauthorized     | No     | Refresh token or check credentials        |
| 403         | Forbidden        | No     | Verify program membership/scopes          |
| 404         | Not Found        | No     | Handle gracefully (report may be deleted) |
| 422         | Validation Error | No     | Log error, fix request payload            |
| 429         | Rate Limited     | Yes    | Exponential backoff, respect Retry-After  |
| 500-503     | Server Error     | Yes    | Exponential backoff, alert on persistence |

**For complete error handling decision tree, see:** [references/error-handling.md](references/error-handling.md)

## Testing Patterns

### Integration Testing with HackerOne Sandbox

HackerOne provides sandbox environments for testing:

- **Sandbox URL**: `https://api.sandbox.hackerone.com`
- **Test Programs**: Pre-populated programs with sample reports
- **State Transitions**: Full support for testing workflows

**Test Strategy:**

1. **Unit Tests**: Mock HackerOne client responses
2. **Integration Tests**: Use sandbox environment with real HTTP calls
3. **E2E Tests**: Full sync workflow with Chariot backend + HackerOne sandbox

**For complete testing patterns, see:** [references/testing-patterns.md](references/testing-patterns.md)

## Security Best Practices

1. **Credential Management**
   - Store API tokens in AWS Secrets Manager
   - Rotate tokens every 90 days
   - Never log tokens or include in error messages

2. **Webhook Security**
   - Always verify HMAC signatures
   - Use HTTPS endpoints only
   - Implement replay protection (timestamp + event ID cache)

3. **Data Privacy**
   - HackerOne reports may contain PII (researcher names, emails)
   - Apply data retention policies
   - Respect disclosure timelines (do not expose unreleased vulnerabilities)

4. **Audit Logging**
   - Log all state transitions (Chariot → HackerOne)
   - Track sync errors and retry attempts
   - Monitor rate limit consumption

**For complete security checklist, see:** [references/security-practices.md](references/security-practices.md)

## Common Integration Patterns

### Pattern 1: Bidirectional Sync with Conflict Resolution

**Problem**: Chariot and HackerOne both allow state updates, causing conflicts.

**Solution**: Last-write-wins with user notification.

1. Track `updated_at` timestamps on both sides
2. On conflict (both updated since last sync), choose newer timestamp
3. Log conflict and notify user via Chariot UI

**For complete conflict resolution logic, see:** [references/sync-patterns.md](references/sync-patterns.md)

### Pattern 2: Enrichment Pipeline

**Problem**: HackerOne reports lack context available in Chariot (asset metadata, risk scores).

**Solution**: Enrich on sync.

1. Fetch HackerOne report
2. Map structured_scope to Chariot Asset
3. Lookup asset metadata (cloud provider, tags, ownership)
4. Calculate Chariot risk score
5. Store enriched Risk entity

**For complete enrichment implementation, see:** [references/data-mapping.md](references/data-mapping.md)

### Pattern 3: Webhook-to-SQS-to-Lambda

**Problem**: Webhooks must respond quickly (<5s), but sync is slow.

**Solution**: Async processing via SQS.

1. Webhook endpoint validates signature → 202 Accepted
2. Push event to SQS queue
3. Lambda consumer processes event (fetch full report, sync to Chariot)
4. Handle failures with DLQ + alerting

**For complete async pattern, see:** [references/webhook-handling.md](references/webhook-handling.md)

## Progressive Disclosure

**Quick Start (15 min):**

- Implement API token authentication
- Fetch list of reports with pagination
- Map report to Chariot Risk entity

**Intermediate (60 min):**

- Implement OAuth 2.0 with token refresh
- Add webhook handler with signature verification
- Implement bidirectional sync (read + update states)

**Production-Ready (4-8 hours):**

- Full retry logic with exponential backoff
- Rate limit handling with leaky bucket algorithm
- Conflict resolution for bidirectional sync
- Comprehensive error handling and logging
- Webhook replay protection and idempotency
- Integration tests with sandbox environment

## Related Skills

| Skill                               | Purpose                                              |
| ----------------------------------- | ---------------------------------------------------- |
| **gateway-integrations**            | Entry point for integration skills (routes here)     |
| **jira-integration**                | Similar bidirectional sync patterns                  |
| **ms-defender-integration**         | Similar API client architecture                      |
| **implementing-graphql-clients**    | Alternative client pattern if HackerOne adds GraphQL |
| **implementing-retry-with-backoff** | Generic retry logic (TypeScript/Go)                  |
| **sanitizing-inputs-securely**      | Webhook payload validation                           |

## Changelog

See `.history/CHANGELOG` for version history.
