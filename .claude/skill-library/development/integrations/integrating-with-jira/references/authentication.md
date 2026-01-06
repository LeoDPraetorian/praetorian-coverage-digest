# Jira Authentication Reference

**Complete authentication patterns by Jira edition with security best practices.**

## Critical 2026 Updates

### Mandatory API Token Expiration

Effective December 15, 2024, all new API tokens in Jira Cloud have a **mandatory 1-year expiration**:

- **New tokens (after Dec 2024)**: 1-year maximum lifespan
- **Legacy tokens (before Dec 2024)**: Expire between **March 14 - May 12, 2026**
- **New feature**: Scoped API tokens for granular permissions (2024/2025)

**Action Required**: Implement token rotation infrastructure for all Jira Cloud integrations.

## Edition-Specific Authentication

| Feature                | Jira Cloud                 | Jira Server/Data Center            |
| ---------------------- | -------------------------- | ---------------------------------- |
| **Recommended Method** | OAuth 2.0 (3LO)            | Personal Access Tokens (PAT)       |
| **API Token Format**   | Basic Auth (`email:token`) | N/A (not supported)                |
| **PAT Format**         | N/A (not supported)        | Bearer token                       |
| **OAuth Version**      | OAuth 2.0 only             | OAuth 1.0a (DC 8.22+ supports 2.0) |
| **Token Expiration**   | Mandatory 1-year           | Optional up to 365 days            |

**Critical**: Cloud and Server/DC authentication is **fundamentally incompatible**. Cannot share authentication code between editions.

## Authentication Methods

### 1. OAuth 2.0 (3LO) - Jira Cloud (Recommended)

**Best for**: Production applications, third-party integrations, marketplace apps.

**Security Benefits**:

- No credential exposure (tokens only)
- Rotating refresh tokens (new token each refresh)
- Granular scopes (e.g., `read:jira-work`, `write:jira-work`)
- User consent flows with audit trails
- Higher rate limits (65,000+ points/hour)

**Flow**:

```
1. Authorization Request
   GET https://auth.atlassian.com/authorize
   ?client_id={client_id}
   &scope=read:jira-work write:jira-work offline_access
   &redirect_uri={redirect_uri}
   &state={csrf_token}
   &response_type=code
   &code_challenge={pkce_challenge}
   &code_challenge_method=S256

2. User Consent → Redirect with authorization code

3. Token Exchange
   POST https://auth.atlassian.com/oauth/token
   Content-Type: application/x-www-form-urlencoded

   grant_type=authorization_code
   &code={authorization_code}
   &redirect_uri={redirect_uri}
   &code_verifier={pkce_verifier}

   Response:
   {
     "access_token": "eyJ...",
     "refresh_token": "abc123...",
     "expires_in": 3600,
     "token_type": "Bearer"
   }

4. API Access
   GET https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/myself
   Authorization: Bearer {access_token}

5. Token Refresh (before expiry)
   POST https://auth.atlassian.com/oauth/token
   Content-Type: application/x-www-form-urlencoded

   grant_type=refresh_token
   &refresh_token={refresh_token}

   Response: NEW access_token AND NEW refresh_token
   (Previous refresh token invalidated immediately)
```

**Rotating Refresh Tokens**:

- Each refresh issues a **new** refresh token
- Previous token invalidated (10-minute grace period for concurrent requests)
- 90-day inactivity expiry (prompt re-authorization before)

### 2. API Tokens - Jira Cloud (Scripts/Automation)

**Best for**: Internal scripts, personal automation, CI/CD pipelines.

**Generate Token**: https://id.atlassian.com/manage-profile/security/api-tokens

```typescript
const auth = {
  username: process.env.JIRA_EMAIL,
  password: process.env.JIRA_API_TOKEN,
};

const encoded = Buffer.from(`${auth.username}:${auth.password}`).toString("base64");

const response = await fetch(`https://${domain}.atlassian.net/rest/api/3/myself`, {
  headers: {
    Authorization: `Basic ${encoded}`,
    Accept: "application/json",
  },
});
```

**Scoped API Tokens (2024+ feature)**:

Create tokens with limited permissions instead of inheriting full user permissions:

1. Navigate to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token" → "Create scoped token"
3. Select specific permissions (read-only, specific projects, etc.)
4. Use same Basic Auth format as classic tokens

### 3. Personal Access Tokens (PAT) - Server/Data Center

**Best for**: On-premise integrations, service accounts, automation.

**Generate Token**: Jira Profile → Personal Access Tokens

```typescript
const response = await fetch(`https://${host}/rest/api/2/myself`, {
  headers: {
    Authorization: `Bearer ${process.env.JIRA_PAT}`,
    Accept: "application/json",
  },
});
```

**PAT Configuration**:

- Optional expiration (up to 365 days, or no expiry)
- Administrator visibility in Data Center
- Maximum 10 tokens per user (configurable)
- Inherits user permissions (no custom scopes)

### 4. OAuth 1.0a - Server/Data Center (Legacy)

**Best for**: Existing integrations, apps requiring user delegation.

**Note**: Deprecated in Jira Cloud. Use OAuth 2.0 for new Cloud integrations.

**Flow**:

```
1. Request Token
   POST {jira_base_url}/plugins/servlet/oauth/request-token
   OAuth oauth_consumer_key="...", oauth_signature="...", ...

2. User Authorization
   GET {jira_base_url}/plugins/servlet/oauth/authorize?oauth_token={request_token}

3. Access Token
   POST {jira_base_url}/plugins/servlet/oauth/access-token
   OAuth oauth_token={request_token}, oauth_verifier={verifier}, ...

4. API Access
   GET {jira_base_url}/rest/api/2/myself
   OAuth oauth_consumer_key="...", oauth_token={access_token}, oauth_signature="...", ...
```

## Security Hierarchy

From highest to lowest security:

1. **OAuth 2.0 (3LO)** - Production apps, third-party integrations
2. **Personal Access Tokens** - Server/DC on-premise integrations
3. **Scoped API Tokens** - Cloud scripts with granular permissions
4. **Classic API Tokens** - Cloud scripts, simple automations
5. **Basic Auth with passwords** - **BLOCKED** (deprecated since 2019)

## CAPTCHA Prevention

After multiple failed authentication attempts, Jira triggers CAPTCHA which **completely blocks REST API access**:

- No API endpoint to check CAPTCHA status
- No programmatic resolution
- Manual user intervention required

**Prevention**:

```typescript
class AuthCircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private readonly MAX_FAILURES = 3;
  private readonly RESET_TIMEOUT = 60000;

  async authenticate() {
    if (this.failures >= this.MAX_FAILURES) {
      const elapsed = Date.now() - this.lastFailure;
      if (elapsed < this.RESET_TIMEOUT) {
        throw new Error("Circuit breaker open: too many auth failures");
      }
      this.failures = 0;
    }

    try {
      const result = await doAuthenticate();
      this.failures = 0;
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailure = Date.now();
      throw error;
    }
  }
}
```

## Edition Detection Pattern

```typescript
interface JiraConfig {
  edition: "cloud" | "server" | "datacenter";
  apiVersion: "v2" | "v3";
  authMethod: "oauth2" | "oauth1a" | "api-token" | "pat";
}

async function detectJiraConfig(baseUrl: string): Promise<JiraConfig> {
  const isCloud = baseUrl.includes(".atlassian.net");

  if (isCloud) {
    return {
      edition: "cloud",
      apiVersion: "v3",
      authMethod: "oauth2", // or 'api-token' for scripts
    };
  }

  const serverInfo = await fetch(`${baseUrl}/rest/api/2/serverInfo`).then((r) => r.json());

  return {
    edition: serverInfo.deploymentType === "Server" ? "server" : "datacenter",
    apiVersion: "v2",
    authMethod: "pat",
  };
}
```

## Credential Security Best Practices

1. **Never commit credentials** - Use environment variables or secrets managers
2. **Encrypt at rest** - Store tokens encrypted in databases
3. **Rotate regularly** - Recommend 60-day rotation for API tokens
4. **Use scoped tokens** - Minimum permissions for operation
5. **Monitor usage** - Log authentication events, alert on anomalies
6. **Secure client secrets** - Never expose in client-side code

## Common Pitfalls

| Pitfall                         | Cause                         | Solution                              |
| ------------------------------- | ----------------------------- | ------------------------------------- |
| 403 with PAT in Cloud           | PATs don't exist in Cloud     | Use API token + Basic Auth            |
| OAuth token expires immediately | Not using refresh flow        | Implement rotating refresh tokens     |
| CAPTCHA blocking API            | Too many failed auth attempts | Implement circuit breaker             |
| Manual base64 encoding fails    | Encoding errors               | Use `-u user:token` format or library |
| SSO users can't use Basic Auth  | SSO requires tokens           | Use API tokens or OAuth               |
