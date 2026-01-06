# GitHub Integration Security Best Practices

**Sources**: GitHub REST API Documentation, Authentication, Webhooks, Error Handling (via Context7)
**Research Date**: 2026-01-03
**Context7 Library ID**: `/websites/github_en_rest`

---

## Executive Summary

This document consolidates security best practices for GitHub API integrations based on official GitHub documentation. Security considerations span authentication, webhook handling, error management, and operational security.

---

## Token Security

### General Principles

1. **Treat tokens like passwords** - They provide access to your GitHub resources
2. **Never commit tokens to version control** - Use `.gitignore` and secret scanning
3. **Use environment variables** or secure secret managers (AWS Secrets Manager, HashiCorp Vault)
4. **Rotate tokens regularly** - Especially for long-lived integrations
5. **Apply principle of least privilege** - Request minimal permissions/scopes
6. **Monitor token usage** via audit logs

### Token Storage

**Never:**

- Commit to version control
- Log in plain text
- Store in environment files tracked by git
- Share across teams without rotation
- Hardcode in application code

**Always:**

- Use secrets management services
- Rotate regularly (90 days for PAT, 24 hours for app tokens)
- Use different tokens per environment (dev, staging, prod)
- Implement token revocation on security events

### Token Prefixes (For Leak Detection)

| Prefix        | Token Type                           |
| ------------- | ------------------------------------ |
| `github_pat_` | Fine-grained Personal Access Token   |
| `gho_`        | OAuth App token                      |
| `ghu_`        | GitHub App user access token         |
| `ghs_`        | GitHub App installation access token |
| `ghr_`        | GitHub App refresh token             |

---

## Authentication Security

### Method Selection

| Use Case                      | Recommended Method                   |
| ----------------------------- | ------------------------------------ |
| Personal scripts/automation   | Fine-grained PAT                     |
| Third-party OAuth integration | OAuth Apps                           |
| GitHub integration/bot        | GitHub Apps                          |
| CI/CD workflows               | GITHUB_TOKEN                         |
| Organization-wide tools       | GitHub Apps with installation tokens |

### Permission Hygiene

1. **Start with read-only** permissions and expand as needed
2. **Scope to specific repositories** when possible
3. **Review permissions periodically** to remove unnecessary access
4. **Use installation tokens** over long-lived PATs for GitHub Apps
5. **Document why each permission is required** in app description

### JWT Security (GitHub Apps)

```typescript
// Generate JWT for GitHub App
const payload = {
  iat: Math.floor(Date.now() / 1000) - 60, // 60 seconds ago (clock drift)
  exp: Math.floor(Date.now() / 1000) + 10 * 60, // 10 minutes max
  iss: YOUR_APP_ID,
};

const token = jwt.sign(payload, privateKey, { algorithm: "RS256" });
```

**Key Security Points:**

- JWTs expire after 10 minutes maximum
- Generate JWTs on-demand (don't cache long-term)
- Use RS256 algorithm only
- Protect private key with same rigor as passwords

---

## Webhook Security

### HMAC Signature Verification

**Always verify webhooks using `X-Hub-Signature-256` header:**

```javascript
import crypto from "crypto";

function verifyWebhookSignature(secret, body, signature) {
  const expectedSignature =
    "sha256=" + crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");

  // CRITICAL: Use constant-time comparison to prevent timing attacks
  const expectedBuffer = Buffer.from(expectedSignature);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}
```

### Webhook Configuration Security

```typescript
interface SecureWebhookConfig {
  url: string; // MUST be HTTPS
  content_type: "json"; // Recommended
  secret: string; // REQUIRED: Strong random secret
  insecure_ssl: "0"; // NEVER set to '1' - enables MITM attacks
}
```

**GitHub's explicit warning:**

> "We strongly recommend not setting insecure_ssl to `1` as you are subject to man-in-the-middle and other attacks."

### Secret Rotation for Webhooks

Support multiple secrets during rotation:

```javascript
const WEBHOOK_SECRETS = [
  process.env.WEBHOOK_SECRET_CURRENT,
  process.env.WEBHOOK_SECRET_PREVIOUS, // Support old secret during rotation
];

function verifyWithMultipleSecrets(body, signature) {
  for (const secret of WEBHOOK_SECRETS) {
    if (verifyWebhookSignature(secret, body, signature)) {
      return true;
    }
  }
  return false;
}
```

### Idempotency for Replay Prevention

```typescript
class IdempotencyTracker {
  private processedDeliveries = new Map<string, Date>();
  private readonly TTL_DAYS = 7;

  async processWebhook(deliveryId: string, payload: object): Promise<void> {
    // Check for replay
    if (this.processedDeliveries.has(deliveryId)) {
      console.log(`Duplicate delivery rejected: ${deliveryId}`);
      return; // Return 200 OK but don't process
    }

    await this.handleEvent(payload);

    // Mark as processed with TTL
    this.processedDeliveries.set(deliveryId, new Date());
    this.cleanupOldDeliveries();
  }

  private cleanupOldDeliveries(): void {
    const cutoff = Date.now() - this.TTL_DAYS * 24 * 60 * 60 * 1000;
    for (const [id, date] of this.processedDeliveries) {
      if (date.getTime() < cutoff) {
        this.processedDeliveries.delete(id);
      }
    }
  }
}
```

---

## Private Key Protection (GitHub Apps)

### Storage Requirements

1. **Never commit to version control** - Use `.gitignore`
2. **Use secrets management services** (AWS Secrets Manager, HashiCorp Vault, Azure Key Vault)
3. **Rotate annually** - Requires app reconfiguration
4. **Monitor for unauthorized JWT generation** via audit logs
5. **Different keys per environment** - Separate dev/staging/prod

### AWS Secrets Manager Example

```typescript
import { SecretsManager } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManager({ region: "us-east-1" });

async function getPrivateKey(): Promise<string> {
  const response = await client.getSecretValue({
    SecretId: "github-app-private-key",
  });

  return response.SecretString!;
}
```

---

## Error Handling Security

### 404 Security Pattern

**GitHub returns `404 Not Found` instead of `403 Forbidden` for private resources** to prevent confirming the existence of private repositories.

**Security implication**: Don't assume 404 means "doesn't exist" - verify authentication first.

```typescript
try {
  return await githubRequest("/repos/private/repo");
} catch (error) {
  if (error.status === 404) {
    // Could be "not found" OR "no access to private resource"
    // Check authentication before assuming non-existence
    const authValid = await verifyAuthentication();
    if (!authValid) {
      throw new Error("Authentication issue - check token permissions");
    }
    // Only now assume resource doesn't exist
    return null;
  }
}
```

### Logging Security

**Never log tokens or sensitive data:**

```typescript
// WRONG: Logs token
logger.error("GitHub API failed", {
  token: authToken,
  message: error.message,
});

// CORRECT: Log safely
logger.error("GitHub API failed", {
  requestId: error.headers["x-github-request-id"],
  status: error.status,
  message: error.message,
  ratelimitRemaining: error.headers["x-ratelimit-remaining"],
});
```

---

## Rate Limit Security

### Abuse Prevention

1. **Implement exponential backoff** for rate limit errors
2. **Monitor rate limit headers** on every request
3. **Never continue requests while rate-limited** - risks integration banning
4. **Use circuit breakers** for cascading failure prevention

```typescript
class CircuitBreaker {
  private failureCount = 0;
  private lastFailure = 0;
  private readonly threshold = 5;
  private readonly resetTimeout = 60000;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error("Circuit breaker OPEN - too many failures");
    }

    try {
      const result = await fn();
      this.reset();
      return result;
    } catch (error) {
      if (this.isRateLimitError(error)) {
        this.recordFailure();
      }
      throw error;
    }
  }

  private isRateLimitError(error: any): boolean {
    return error.status === 403 || error.status === 429;
  }
}
```

---

## Anti-Patterns to Avoid

### ❌ Skipping Signature Verification

```javascript
// NEVER DO THIS
app.post("/webhook", (req, res) => {
  processEvent(req.body); // Allows forged webhooks
  res.sendStatus(200);
});
```

### ❌ Using String Comparison for Signatures

```javascript
// WRONG: Vulnerable to timing attacks
if (computedSignature === headerSignature) { ... }

// CORRECT: Constant-time comparison
if (crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(header))) { ... }
```

### ❌ Over-Permissioned Tokens

```typescript
// WRONG: Requesting all scopes
const token = createPAT({ scopes: ["repo", "admin:org", "user", "delete_repo"] });

// CORRECT: Minimal permissions
const token = createFinegrainedPAT({
  permissions: { issues: "read", contents: "read" },
  repositories: ["specific-repo"],
});
```

### ❌ Long-Lived Tokens Without Rotation

```typescript
// WRONG: Static token forever
const GITHUB_TOKEN = "ghp_xxxxx"; // Never rotated

// CORRECT: Token rotation
class TokenManager {
  private token: string;
  private readonly rotationInterval = 90 * 24 * 60 * 60 * 1000; // 90 days

  async getToken(): Promise<string> {
    if (this.shouldRotate()) {
      this.token = await this.rotateToken();
    }
    return this.token;
  }
}
```

### ❌ Disabling SSL Verification

```json
{
  "insecure_ssl": "1"
}
```

**Impact**: Vulnerable to man-in-the-middle attacks. Never disable in production.

### ❌ Ignoring Rate Limit Headers

```typescript
// WRONG: Retry without checking headers
catch (error) {
  await sleep(1000);
  return retry();
}

// CORRECT: Check retry-after and rate limit headers
catch (error) {
  const retryAfter = error.headers['retry-after'];
  const resetTime = error.headers['x-ratelimit-reset'];
  // Use header values to determine wait time
}
```

---

## Security Checklist

### Authentication

- [ ] Using fine-grained PATs or GitHub Apps (not classic PATs)
- [ ] Tokens stored in secrets manager, not code
- [ ] Minimal permissions requested
- [ ] Token rotation policy in place
- [ ] Different tokens per environment

### Webhooks

- [ ] HMAC SHA-256 signature verification implemented
- [ ] Constant-time comparison for signature matching
- [ ] SSL/TLS enabled (`insecure_ssl: '0'`)
- [ ] Idempotency tracking with delivery IDs
- [ ] Secret rotation procedure documented

### Error Handling

- [ ] 404 treated as potential auth issue, not just "not found"
- [ ] Sensitive data excluded from logs
- [ ] Rate limit headers monitored
- [ ] Circuit breaker pattern implemented
- [ ] Exponential backoff for retries

### Operational

- [ ] Private keys secured in secrets manager
- [ ] Audit logging enabled
- [ ] Security alerts configured
- [ ] Incident response plan documented
- [ ] Regular security reviews scheduled

---

## Sources

All documentation sourced from official GitHub documentation via Context7:

- [Keeping your API credentials secure](https://docs.github.com/en/rest/authentication/keeping-your-api-credentials-secure)
- [Validating webhook deliveries](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
- [Best practices for creating a GitHub App](https://docs.github.com/en/apps/creating-github-apps/setting-up-a-github-app/best-practices-for-creating-a-github-app)
- [GitHub security advisories](https://docs.github.com/en/code-security)
- [Rate limits for the REST API](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)
- [Troubleshooting the REST API](https://docs.github.com/rest/overview/troubleshooting)
