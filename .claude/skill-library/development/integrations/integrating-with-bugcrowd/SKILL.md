---
name: integrating-with-bugcrowd
description: Use when integrating with Bugcrowd APIs for vulnerability management, program coordination, researcher engagement - comprehensive patterns for authentication, rate limiting, webhooks, and bidirectional sync
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, WebSearch
---

# Integrating with Bugcrowd

**Comprehensive guide for integrating the Chariot platform with Bugcrowd's bug bounty platform, covering authentication, API operations, webhook handling, rate limiting, retry strategies, and security best practices.**

## Prerequisites

- Bugcrowd account with API access (Enterprise or Advanced tier)
- Understanding of Bearer token authentication
- API rate limit awareness: **60 requests per minute per IP address**
- Security: Never commit tokens to repositories, use secrets manager
- Knowledge of Chariot's vulnerability data model for mapping
- Static outbound IP for IP allowlisting (NAT Gateway for Lambda, egress IP for Kubernetes)

## When to Use

Use this skill when:

- Building Bugcrowd integrations for vulnerability synchronization with Chariot
- Implementing Bearer token authentication with IP allowlisting
- Implementing rate limiting for 60 req/min per IP constraint
- Setting up webhook handlers with HMAC-SHA256 validation
- Mapping Bugcrowd submissions (VRT P1-P5) to Chariot vulnerabilities
- Managing bug bounty programs via Bugcrowd API
- Implementing bidirectional sync with conflict resolution
- Ensuring GDPR compliance for researcher PII handling

## Quick Reference

| Operation          | Method              | Best Practice                                           |
| ------------------ | ------------------- | ------------------------------------------------------- |
| Authentication     | Bearer Token        | Store in secrets manager, rotate every 90 days          |
| Rate Limiting      | Token bucket        | 60 req/min per IP, use Redis for distributed limiting   |
| Webhook Validation | HMAC-SHA256         | Constant-time comparison, ±5 min timestamp validation   |
| Submission Sync    | Webhooks + Poll     | Webhooks for real-time, hourly polling for backfill     |
| Token Storage      | Secrets mgmt        | AWS Secrets Manager or HashiCorp Vault (NEVER env vars) |
| Error Handling     | Exponential backoff | 1s→2s→4s→8s→16s with ±20% jitter, circuit breaker       |

## Authentication Methods

### Overview

| Method          | Use Case                     | Security Level | Granular Permissions |
| --------------- | ---------------------------- | -------------- | -------------------- |
| Bearer Token    | Server-to-server, automation | High           | Role-based (user)    |
| IP Allowlisting | Enhanced token security      | Very High      | Network-level        |

**Recommendation**: Use Bearer Tokens with IP Allowlisting for Chariot integration. See [references/authentication-patterns.md](references/authentication-patterns.md).

### Bearer Token Authentication

**How Bugcrowd Tokens Work:**

- Per-user token provisioning with role-based authorization
- Multiple tokens per user supported (service isolation)
- Version pinned to major release (v1), automatic minor updates
- One-time display after generation (not retrievable)
- Immediate revocation via console

**Authentication Header:**

```http
Authorization: Token {your-api-token}
Accept: application/vnd.bugcrowd+json
```

**Security Requirements:**

- Store in AWS Secrets Manager or HashiCorp Vault (NEVER in code/env vars)
- Rotate every 90 days (manual process - no API for rotation)
- Enable IP allowlisting for all production tokens
- Monitor token usage via Bugcrowd audit trail

**See:** [references/authentication-patterns.md](references/authentication-patterns.md) for complete patterns including multi-token strategy and secrets manager integration.

### IP Allowlisting (Defense-in-Depth)

**Critical Security Layer:**

- Restrict tokens to specific IP addresses or CIDR ranges
- Only IPv4 supported (IPv6 not supported)
- Requests from non-allowlisted IPs rejected with 403 Forbidden
- Essential for Lambda/serverless (use NAT Gateway with static Elastic IP)

**See:** [references/authentication-patterns.md](references/authentication-patterns.md) for serverless and Kubernetes IP allowlisting patterns.

## API Overview

### Core Resources

| Resource      | Purpose                                | Key Operations             |
| ------------- | -------------------------------------- | -------------------------- |
| Submissions   | Vulnerability reports from researchers | List, Get, Update, Comment |
| Programs      | Bug bounty programs                    | List, Get, Update Settings |
| Bounties      | Payment and reward management          | Create, Update, Process    |
| Researchers   | Researcher profiles and reputation     | List, Get, Invite          |
| Custom Fields | Program-specific metadata              | Define, Update, Query      |

**See:** [references/api-reference.md](references/api-reference.md) for complete endpoint catalog with request/response schemas.

## Rate Limiting Strategy

### Rate Limit Specification

**Hard Limit:** 60 requests per minute per IP address

**Critical:** Rate limit is per-IP (NOT per-token), requiring distributed rate limiting for multi-instance deployments.

### Token Bucket Implementation

```typescript
class TokenBucket {
  private tokens: number;
  private readonly maxTokens = 60; // Bugcrowd limit
  private readonly refillRate = 1; // 1 token/second
  private lastRefillTime: number;

  constructor() {
    this.tokens = this.maxTokens;
    this.lastRefillTime = Date.now();
  }

  tryConsume(): boolean {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens--;
      return true;
    }

    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTime) / 1000;
    const tokensToAdd = elapsedSeconds * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }
}
```

### Exponential Backoff for 429 Responses

```typescript
async function fetchWithBackoff(url: string, maxRetries = 5): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url);

    if (response.status === 429) {
      // Exponential backoff: 1s → 2s → 4s → 8s → 16s (capped at 30s)
      const baseDelay = 1000;
      const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), 30000);

      // Add ±20% jitter to prevent thundering herd
      const jitter = exponentialDelay * 0.2 * (Math.random() - 0.5);
      const delay = exponentialDelay + jitter;

      await sleep(delay);
      continue;
    }

    return response;
  }
  throw new Error("Rate limit persisted after retries");
}
```

**See:** [references/rate-limiting-strategies.md](references/rate-limiting-strategies.md) for Redis-based distributed limiting, burst protection, and token bucket algorithms.

## Webhook Integration

### Webhook Events

Bugcrowd webhooks support real-time notifications for three resource categories:

| Event Type                 | Trigger                      | Use Case                     |
| -------------------------- | ---------------------------- | ---------------------------- |
| `submission.submitted`     | New submission received      | Create Chariot vulnerability |
| `submission.accepted`      | Submission accepted          | Update status to accepted    |
| `submission.rejected`      | Submission rejected          | Update status to rejected    |
| `submission.commented`     | New comment added            | Sync communication thread    |
| `submission.state_changed` | State transition             | Track workflow changes       |
| `reward.offered`           | Reward offered to researcher | Update bounty tracking       |
| `reward.paid`              | Bounty payment processed     | Update financial tracking    |
| `reward.adjusted`          | Reward amount adjusted       | Update bounty records        |
| `program.created`          | New program launched         | Track new programs           |
| `program.updated`          | Program settings changed     | Sync program configuration   |

**Delivery Guarantees:**

- **At-least-once delivery:** Webhooks may be delivered multiple times (idempotency required)
- **Ordered within sequence:** Events use `sequence_number` for ordering
- **Automatic retries:** 5 attempts over 24 hours with exponential backoff
- **Timeout:** 30 second response timeout per delivery

### Validation Pattern

**CRITICAL**: Always validate webhook signatures to prevent spoofing.

```typescript
import crypto from "crypto";

function verifyBugcrowdWebhook(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  const expectedSignature = hmac.update(payload).digest("hex");

  // Timing-safe comparison
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

// Lambda handler example
export const handler = async (event: any) => {
  const signature = event.headers["X-Bugcrowd-Signature"];
  const payload = event.body;

  if (!verifyBugcrowdWebhook(payload, signature, WEBHOOK_SECRET)) {
    return { statusCode: 401, body: "Invalid signature" };
  }

  // Process webhook
  await handleBugcrowdWebhook(JSON.parse(payload));
  return { statusCode: 200, body: "OK" };
};
```

**See:** [references/webhook-handling.md](references/webhook-handling.md) for event schemas, retry logic, and idempotency patterns.

## Data Mapping: Bugcrowd ↔ Chariot

### Submission to Vulnerability Mapping

| Bugcrowd Field     | Chariot Risk Field   | Transformation                          |
| ------------------ | -------------------- | --------------------------------------- |
| `submission_id`    | Key (partial)        | Format: `#risk#{dns}#{submission_id}`   |
| `priority` (P1-P5) | Status[1] (Severity) | P1→C, P2→H, P3→M, P4→L, P5→I            |
| `state`            | Status[0] (State)    | New→T, Triaged→O, Resolved→R            |
| `title`            | Name                 | Normalize to lowercase-with-hyphens     |
| `details`          | Attribute            | Store as `description` custom attribute |
| `cvss_base`        | Attribute            | Store as `cvss_score` custom attribute  |
| `target`           | Asset Link           | Create/link Asset based on target       |
| `created_at`       | Created              | Convert to RFC3339                      |
| `vrt_category`     | Tags                 | Lookup CWE from VRT mapping             |

**VRT to Chariot Status:** P1 Critical → TC (Triage/Critical), P2 Severe → TH (Triage/High), P3 Moderate → TM, P4 Low → TL, P5 Info → TI

**See:** [references/data-mapping.md](references/data-mapping.md) for complete field mappings, CWE lookup strategy, and transformation functions.

## Submission Synchronization

### Bidirectional Sync Strategy

**Bugcrowd → Chariot (Inbound):**

1. Webhook receives `submission.created` or `submission.updated`
2. Fetch full submission details via API
3. Map to Chariot vulnerability model
4. Create or update Chariot risk record
5. Acknowledge webhook (200 OK)

**Chariot → Bugcrowd (Outbound):**

1. Chariot user updates vulnerability status
2. Map Chariot status to Bugcrowd state
3. POST comment to submission with status change
4. Update submission state if applicable
5. Log sync operation for audit

**See:** [references/sync-patterns.md](references/sync-patterns.md) for conflict resolution, deduplication, and eventual consistency patterns.

## Error Handling

| Status Code | Meaning               | Action                                     |
| ----------- | --------------------- | ------------------------------------------ |
| 401         | Unauthorized          | Refresh API key or check authentication    |
| 403         | Forbidden             | Check API key permissions for program      |
| 404         | Not Found             | Verify resource exists and access granted  |
| 422         | Unprocessable Entity  | Validation failed, check request schema    |
| 429         | Rate Limit Exceeded   | Wait until `X-RateLimit-Reset` timestamp   |
| 500         | Internal Server Error | Retry with exponential backoff (3-5 times) |
| 502/503/504 | Service Unavailable   | Retry with exponential backoff             |

**See:** [references/error-handling.md](references/error-handling.md) for complete error taxonomy, retry strategies, and circuit breaker patterns.

## Common Operations

### Submissions

| Operation              | API Endpoint                 | Method | Notes                                             |
| ---------------------- | ---------------------------- | ------ | ------------------------------------------------- |
| List submissions       | `/submissions`               | GET    | Supports filtering, pagination (max offset 9,900) |
| Get submission details | `/submissions/{id}`          | GET    | Includes full submission data                     |
| Update submission      | `/submissions/{id}`          | PATCH  | State transitions, triaging                       |
| Add comment            | `/submissions/{id}/comments` | POST   | Internal and researcher comments                  |

### Programs

| Operation               | API Endpoint       | Method | Notes                                 |
| ----------------------- | ------------------ | ------ | ------------------------------------- |
| List programs           | `/programs`        | GET    | Returns programs accessible via token |
| Get program details     | `/programs/{code}` | GET    | Includes scope, rewards, settings     |
| Update program settings | `/programs/{code}` | PATCH  | Scope, rewards, custom fields         |

**See:** [references/api-reference.md](references/api-reference.md) for complete catalog with 17 API sections including Researchers, Bounties, Custom Fields, Targets, Teams, Webhooks, and more.

## Security Best Practices

1. **Bearer Token Management**: Store in AWS Secrets Manager/Vault, rotate every 90 days, enable IP allowlisting
2. **Webhook Validation**: Always verify HMAC-SHA256 signatures with constant-time comparison (`crypto.timingSafeEqual()`)
3. **HTTPS Only**: All API calls and webhook endpoints must use TLS 1.2+ with certificate validation
4. **Input Validation**: 3-layer validation (schema → business logic → security)
5. **Rate Limit Compliance**: Token bucket (60 req/min per IP), exponential backoff with jitter
6. **Audit Logging**: CloudWatch Logs with retention (auth: 90d, data access: 90d, security events: 180d)
7. **Idempotency**: Track webhook event IDs in DynamoDB with 24-48h TTL, use Idempotency-Key on POST requests
8. **Least Privilege**: Use role-based tokens, separate tokens per integration service
9. **PII Protection**: Auto-detect PII (email, phone, SSN), mask before storage, encrypt at rest (AES-256)
10. **GDPR Compliance**: Data minimization (30-90 day retention), breach notification (72 hours), data subject rights

**See:** [references/security-best-practices.md](references/security-best-practices.md) for 9-domain defense-in-depth architecture, threat model, and compliance checklists.

## Performance Optimization

### Caching Strategy

- Cache program metadata (24 hours TTL)
- Cache researcher profiles (1 hour TTL)
- Never cache submission data (real-time critical)
- Use ETags for conditional requests

### Batch Operations

- Use pagination for bulk submission fetches (page size: 100)
- Batch comment posts when possible
- Queue outbound updates for rate limit management

**See:** [references/performance-optimization.md](references/performance-optimization.md) for caching strategies, connection pooling, and batch processing patterns.

## References

- [references/authentication-patterns.md](references/authentication-patterns.md) - Bearer tokens, IP allowlisting, multi-token strategy, secrets manager integration
- [references/api-reference.md](references/api-reference.md) - Complete API endpoint catalog (17 sections, all operations)
- [references/rate-limiting-strategies.md](references/rate-limiting-strategies.md) - Token bucket, Redis implementation, exponential backoff with jitter
- [references/webhook-handling.md](references/webhook-handling.md) - HMAC validation, idempotency, async processing, event types
- [references/data-mapping.md](references/data-mapping.md) - VRT↔Chariot mappings, CWE lookup, transformation functions
- [references/sync-patterns.md](references/sync-patterns.md) - Bidirectional sync, conflict resolution, deduplication
- [references/error-handling.md](references/error-handling.md) - Circuit breakers, retry logic, timeout configuration, graceful degradation
- [references/security-best-practices.md](references/security-best-practices.md) - Defense-in-depth (9 domains), GDPR compliance, PII protection, audit logging
- [references/performance-optimization.md](references/performance-optimization.md) - Caching strategies, request coalescing, connection pooling

## Related Skills

- `integration-chariot-patterns` - Chariot-specific integration patterns and data models
- `integrating-with-github` - GitHub API integration for repository management
- `burp-integration` - Burp Suite API integration for security scanning

## External Documentation

- **Bugcrowd API Documentation**: https://docs.bugcrowd.com/api/
- **Bugcrowd Platform Guide**: https://docs.bugcrowd.com/
- **Bugcrowd Webhooks**: https://docs.bugcrowd.com/webhooks/
- **Bugcrowd Authentication**: https://docs.bugcrowd.com/api/authentication/
