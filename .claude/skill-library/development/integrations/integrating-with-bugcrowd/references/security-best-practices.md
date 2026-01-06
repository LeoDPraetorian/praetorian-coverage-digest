# Security Best Practices for Bugcrowd Integration

**Last Updated:** 2026-01-03
**Source:** Research synthesis (Defense-in-depth patterns from 712 lines)

---

## Defense-in-Depth Architecture

### Nine Security Domains

1. **Authentication & Authorization** - Token-based access with IP allowlisting
2. **Secrets Management** - Encrypted credential storage and rotation
3. **PII Protection** - GDPR-compliant data masking
4. **Audit Logging** - Comprehensive security event tracking
5. **Input Validation** - Schema and business logic validation
6. **Error Handling** - Generic messages preventing information disclosure
7. **Rate Limiting** - Request throttling and DoS protection
8. **Transport Security** - TLS 1.2+ with certificate validation
9. **Webhook Security** - HMAC signature validation

---

## Secrets Management

### Critical Rules

**NEVER:**

- Hardcode credentials in source code or config files
- Store secrets in unencrypted environment variables
- Commit `.env` files to version control
- Log credential values in any form

**DO:**

- Use AWS Secrets Manager or HashiCorp Vault
- Retrieve secrets at runtime only
- Rotate credentials every 90 days
- Audit all secret access

### Secure Storage Pattern

```typescript
// ✅ CORRECT
const secret = await secretsManager.getSecretValue({
  SecretId: "chariot/bugcrowd/api-token",
});
const apiToken = JSON.parse(secret.SecretString!).token;

// ❌ WRONG
const apiToken = process.env.BUGCROWD_TOKEN; // Visible in logs!
```

---

## PII Protection (GDPR Compliance)

### PII Classification

| PII Type          | Risk Level | Handling                        |
| ----------------- | ---------- | ------------------------------- |
| Email addresses   | HIGH       | Mask domain, encrypt storage    |
| Phone numbers     | HIGH       | Mask all but last 4 digits      |
| Names             | MEDIUM     | Use researcher ID instead       |
| Account details   | MEDIUM     | Replace with internal IDs       |
| IP addresses      | LOW-MEDIUM | Log CIDR only                   |
| Proof screenshots | HIGH       | Auto-redaction or manual review |

### Data Minimization

```typescript
interface VulnerabilityReport {
  id: string;
  title: string;

  // ❌ WRONG - Raw PII
  // reporter_email: string;

  // ✅ CORRECT - Redacted
  reporter_id: string;
  report_anonymized: boolean;
  pii_fields_redacted: string[];
}
```

### GDPR Requirements

- **Encryption:** At-rest (AES-256) and in-transit (TLS 1.2+)
- **Retention:** 30-90 days, then delete PII
- **Data Subject Rights:** Access, rectification, erasure, portability
- **Breach Notification:** 72 hours to authorities

---

## Audit Logging

### Events to Log

| Event Type         | Retention | Purpose             |
| ------------------ | --------- | ------------------- |
| Authentication     | 90 days   | Intrusion detection |
| API Requests       | 30 days   | Audit trail         |
| Data Access (PII)  | 90 days   | GDPR compliance     |
| Security Events    | 180 days  | Incident analysis   |
| Credential Changes | 1 year    | Change tracking     |

### Logging Implementation

```typescript
interface SecurityEvent {
  timestamp: string;
  event_type: string;
  token_id_hash: string; // NEVER log actual token!
  source_ip: string;
  endpoint: string;
  http_method: string;
  status_code: number;
  result: "success" | "failure" | "blocked";
}

function logSecurityEvent(event: SecurityEvent): void {
  // Write to CloudWatch Logs (immutable, indexed, queryable)
  cloudwatch.putLogEvents({
    logGroupName: "/bugcrowd/security",
    logStreamName: `audit-${new Date().toISOString().split("T")[0]}`,
    logEvents: [
      {
        message: JSON.stringify(event),
        timestamp: Date.now(),
      },
    ],
  });
}
```

---

## Input Validation (Layered Approach)

### Layer 1: Schema Validation

```typescript
import { z } from "zod";

const SubmissionSchema = z.object({
  id: z.string().uuid(),
  title: z.string().max(1000),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  researcher_id: z.string().uuid(),
  // PII fields intentionally excluded
});

const validated = SubmissionSchema.parse(payload);
```

### Layer 2: Business Logic Validation

```typescript
// Verify resource exists and is accessible
const submissionExists = await db.checkSubmissionExists(validated.id);
if (!submissionExists) {
  throw new Error("Submission not found");
}

// Verify permissions
const hasPermission = await authz.canAccessSubmission(user, validated.id);
if (!hasPermission) {
  throw new Error("Insufficient permissions");
}
```

### Layer 3: Security Validation

```typescript
// Rate limit check
if (!(await rateLimiter.tryConsume(1))) {
  throw new RateLimitError("Too many requests");
}

// IP allowlist check
if (!isIpAllowlisted(clientIp)) {
  throw new ForbiddenError("IP not allowlisted");
}
```

---

## Error Handling

### Generic External Messages

```typescript
// ❌ WRONG - Information leakage
res.status(401).json({
  error: "No user found with email researcher@bugcrowd.com",
  sql_query: "SELECT * FROM users WHERE email = ?",
});

// ✅ CORRECT - Generic
res.status(401).json({
  error: "Authentication failed",
  message: "Please check your credentials",
});
```

### Detailed Internal Logging

```typescript
try {
  const tokenRecord = await db.findToken(tokenHash);

  if (!tokenRecord) {
    // User sees: "Authentication failed"
    // Log sees: detailed diagnostics
    logger.warn("Token not found", {
      token_hash: tokenHash,
      timestamp: new Date(),
      ip_address: req.ip,
    });

    throw new APIError("Invalid credentials", 401);
  }
} catch (error) {
  // User sees: "Authentication failed"
  // Log sees: root cause
  logger.error("Auth error", {
    error: error.message,
    stack: error.stack,
  });

  throw new APIError("Authentication failed", 401);
}
```

---

## Transport Security

### TLS Configuration

```typescript
import https from "https";
import tls from "tls";

const httpsOptions = {
  minVersion: tls.TLS1_2,
  maxVersion: tls.TLS1_3,
  ciphers: "TLS13-AES-256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384",
  honorCipherOrder: true,
  secureOptions:
    tls.constants.SSL_OP_NO_SSLv2 |
    tls.constants.SSL_OP_NO_SSLv3 |
    tls.constants.SSL_OP_NO_TLSv1 |
    tls.constants.SSL_OP_NO_TLSv1_1,
};

// Add HSTS header
app.use((req, res, next) => {
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});
```

---

## Threat Model

| Attack Vector              | Mitigation                                           |
| -------------------------- | ---------------------------------------------------- |
| **Credential Theft**       | Secrets manager, 90-day rotation, IP allowlisting    |
| **PII Leakage**            | Classification, masking, encryption, audit logging   |
| **Replay Attacks**         | HMAC validation, timestamp validation, idempotency   |
| **Rate Limit Abuse**       | Token bucket (60/min), exponential backoff           |
| **Injection Attacks**      | Parameterized queries, schema validation, allowlists |
| **Information Disclosure** | Generic errors, no stack traces                      |
| **MITM Attacks**           | TLS 1.2+, certificate validation, HSTS               |

---

## Compliance Checklist

### GDPR Compliance

- [ ] Data classification completed
- [ ] Encryption at rest (AES-256)
- [ ] Encryption in transit (TLS 1.2+)
- [ ] Data retention policy (30-90 days max)
- [ ] PII access audit logging
- [ ] Automated PII detection
- [ ] Data subject rights procedures

### API Security Best Practices

- [ ] Token-based authentication
- [ ] 90-day token rotation
- [ ] Rate limiting (per-token and per-IP)
- [ ] Input validation (schema + business logic)
- [ ] Generic error messages
- [ ] Security event logging
- [ ] HMAC webhook validation

---

## References

- [Bugcrowd Security Update (MFA Requirement)](https://www.bugcrowd.com/blog/bugcrowd-security-update-password-reset-and-mfa-requirement/)
- [API Security Best Practices 2025](https://securityonline.info/api-security-in-2025-top-best-practices-every-security-team-must-know/)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [GDPR Compliance Guide](https://medium.com/@Egnyte/how-bug-bounty-hunters-can-leverage-gdpr-59390dd2916c)
- Research: context7-security.md
- Research: perplexity-security.md (712 lines)
