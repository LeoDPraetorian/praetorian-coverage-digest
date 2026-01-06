# Authentication Patterns for Bugcrowd API

**Last Updated:** 2026-01-03
**Source:** Research synthesis from official Bugcrowd documentation

---

## Token-Based Authentication (Primary Method)

Bugcrowd API uses **Bearer token-based authentication** (not OAuth for direct API access).

### Authentication Header Format

```http
Authorization: Token {your-api-token}
Accept: application/vnd.bugcrowd+json
```

### Token Generation Flow

1. Navigate to **Profile > API Credentials** in Bugcrowd console
2. Provide descriptive **application name** (important for audit trail)
3. Click **Create credentials**
4. **Copy token immediately** (one-time display only)
5. Configure **IP allowlist** for enhanced security (optional but recommended)
6. Store in secrets manager immediately

###Token Characteristics

- **Per-user provisioning:** Each user can create multiple tokens
- **Role-based authorization:** Token permissions derived from user's platform role
- **Version pinning:** Tokens pinned to major version (v1), automatic minor updates
- **Immediate revocation:** Tokens can be revoked instantly via UI
- **Audit trail:** Platform tracks last used timestamp, last used IP, active/inactive status

---

## IP Allowlisting (Defense-in-Depth)

### Configuration

API tokens can be restricted to specific IP addresses or CIDR ranges:

- **IPv4 Only:** IPv6 not supported
- **Automatic Rejection:** Requests from non-allowlisted IPs receive 403 Forbidden
- **Per-Token Configuration:** Each token can have different IP allowlist

### Implementation for Serverless (AWS Lambda)

```typescript
// Lambda with NAT Gateway for static outbound IP
// 1. Deploy Lambda in private subnet
// 2. Configure NAT Gateway with Elastic IP
// 3. Allowlist the Elastic IP in Bugcrowd token configuration

const BUGCROWD_TOKEN_IP_ALLOWLIST = "52.1.2.3/32"; // NAT Gateway Elastic IP
```

### Implementation for Kubernetes

```yaml
# Use egress gateway for consistent outbound IP
apiVersion: v1
kind: Service
metadata:
  name: bugcrowd-api-client
spec:
  egressIP: 10.0.100.50 # Static egress IP for allowlisting
```

---

## Multi-Token Strategy (Best Practice)

Use separate tokens per integration for granular control:

```
Integration A (Read-only): Token 1 (IP allowlist: 10.0.1.0/24)
Integration B (Write operations): Token 2 (IP allowlist: 10.0.2.0/24)
Automation Service: Token 3 (IP allowlist: 10.0.3.0/24)
```

**Benefits:**

- Revoke one token without impacting other services
- Granular IP allowlisting per service
- Improved audit trail (identify which service made request)
- Reduced attack surface (compromised token affects only one integration)

---

## Token Lifecycle Management

### Generation (One-Time Display)

```
⚠️ CRITICAL: Token displayed only once after creation!

Copy token immediately upon generation.
No retrieval mechanism after page refresh.
Losing token requires regeneration.
```

### Storage in Secrets Manager

**AWS Secrets Manager:**

```typescript
import { SecretsManager } from "@aws-sdk/client-secrets-manager";

const secretsManager = new SecretsManager();

// Store token
await secretsManager.createSecret({
  Name: "chariot/bugcrowd/api-token",
  SecretString: JSON.stringify({
    token: "your-bugcrowd-token",
    created_at: new Date().toISOString(),
    rotation_due: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  }),
  Description: "Bugcrowd API token for Chariot integration",
});

// Retrieve token at runtime
const secret = await secretsManager.getSecretValue({
  SecretId: "chariot/bugcrowd/api-token",
});
const { token } = JSON.parse(secret.SecretString!);
```

**HashiCorp Vault:**

```bash
# Store token
vault kv put secret/bugcrowd/api-token \
  token="your-bugcrowd-token" \
  created_at="2026-01-03T00:00:00Z" \
  rotation_due="2026-04-03T00:00:00Z"

# Retrieve token
vault kv get -field=token secret/bugcrowd/api-token
```

### Rotation Strategy

**Recommended Frequency:**

- **High-privilege tokens** (write operations): Weekly rotation
- **Low-privilege tokens** (read-only): Monthly rotation
- **Production tokens:** 90-day maximum

**Automated Rotation Process:**

```typescript
// Lambda function triggered by EventBridge (weekly schedule)
export const rotateToken = async () => {
  // 1. Get current token from secrets manager
  const currentSecret = await secretsManager.getSecretValue({
    SecretId: "chariot/bugcrowd/api-token",
  });

  // 2. Manual step: Generate new token in Bugcrowd console
  //    (Bugcrowd doesn't provide programmatic token generation)
  //    Store new token temporarily in 'chariot/bugcrowd/api-token-new'

  // 3. Update secrets manager
  await secretsManager.putSecretValue({
    SecretId: "chariot/bugcrowd/api-token",
    SecretString: JSON.stringify({
      token: newToken,
      previous_token: currentToken, // Keep for rollback
      rotated_at: new Date().toISOString(),
      rotation_due: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  });

  // 4. Monitor for 7 days
  // 5. Delete old token from Bugcrowd console after validation
  // 6. Clean up previous_token from secrets manager
};
```

### Monitoring Token Usage

Check Bugcrowd console for token audit trail:

- Last used timestamp
- Last used IP address
- Activity status (active/inactive)
- Request count (if available)

---

## Rate Limiting (Per-IP Constraint)

**Critical:** Bugcrowd rate limit is **per-IP address**, not per-token.

```
Scenario:
  Service A: 30 req/min from IP 10.0.1.5
  Service B: 30 req/min from IP 10.0.1.5
  Total from 10.0.1.5: 60 req/min ✅ (at limit)

  Service C: 10 req/min from IP 10.0.1.5
  Total from 10.0.1.5: 70 req/min ❌ (exceeds limit!)
```

**Implication:** Multiple services sharing the same outbound IP must coordinate request rates via distributed rate limiter (Redis).

---

## Example: Complete Authentication Setup

```typescript
import { SecretsManager } from "@aws-sdk/client-secrets-manager";

interface BugcrowdAuthConfig {
  tokenSecretId: string;
  ipAllowlist?: string;
}

class BugcrowdAuth {
  private secretsManager: SecretsManager;
  private config: BugcrowdAuthConfig;
  private cachedToken?: { token: string; expiresAt: number };

  constructor(config: BugcrowdAuthConfig) {
    this.secretsManager = new SecretsManager();
    this.config = config;
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken();

    return {
      Authorization: `Token ${token}`,
      Accept: "application/vnd.bugcrowd+json",
      "User-Agent": "Chariot-Integration/1.0",
    };
  }

  private async getToken(): Promise<string> {
    // Check cache (5-minute TTL)
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.token;
    }

    // Fetch from secrets manager
    const secret = await this.secretsManager.getSecretValue({
      SecretId: this.config.tokenSecretId,
    });

    const { token } = JSON.parse(secret.SecretString!);

    // Cache for 5 minutes
    this.cachedToken = {
      token,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };

    return token;
  }

  async validateIpAllowlist(clientIp: string): boolean {
    if (!this.config.ipAllowlist) {
      return true; // No allowlist configured
    }

    // Simple CIDR check (use ipaddr.js for production)
    return clientIp.startsWith(this.config.ipAllowlist.split("/")[0]);
  }
}

// Usage
const auth = new BugcrowdAuth({
  tokenSecretId: "chariot/bugcrowd/api-token",
  ipAllowlist: "52.1.2.3/32",
});

const headers = await auth.getAuthHeaders();

const response = await fetch("https://api.bugcrowd.com/submissions", {
  headers,
});
```

---

## Security Checklist

- [ ] API token stored in secrets manager (AWS Secrets Manager, Vault)
- [ ] Token never logged in plaintext
- [ ] Token never committed to source control
- [ ] IP allowlisting enabled for production tokens
- [ ] NAT Gateway configured for consistent outbound IP (Lambda/serverless)
- [ ] Rotation schedule implemented (90-day maximum)
- [ ] Audit trail monitoring enabled (check Bugcrowd console monthly)
- [ ] Multiple tokens configured for service isolation
- [ ] Secrets manager access restricted via IAM policies
- [ ] Token usage monitored for anomalous patterns

---

## References

- [Bugcrowd API Getting Started](https://docs.bugcrowd.com/api/getting-started/)
- [AWS Secrets Manager Best Practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
