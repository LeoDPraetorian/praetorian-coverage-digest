---
name: integrating-with-github
description: Use when integrating with GitHub APIs (REST/GraphQL), authentication (PAT/OAuth/Apps), webhooks, Actions, and self-hosted runners - comprehensive patterns for secure GitHub integration
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, WebSearch
---

# Integrating with GitHub

**Comprehensive guide for integrating with GitHub's APIs, authentication methods, webhooks, GitHub Actions, and self-hosted runners with security best practices.**

## Prerequisites

- GitHub account with appropriate permissions
- Understanding of OAuth 2.0 flow (for GitHub Apps)
- API rate limit awareness (5000 req/hour for authenticated, 60 for anonymous)
- Security: Never commit tokens/secrets to repositories

## When to Use

Use this skill when:

- Building GitHub integrations (repository management, issue tracking, PR automation)
- Choosing authentication method (Personal Access Token vs OAuth vs GitHub App)
- Implementing rate limiting and retry strategies
- Setting up GitHub Actions workflows or self-hosted runners
- Creating GitHub Apps for marketplace distribution
- Handling GitHub webhooks securely

## Quick Reference

| Operation                   | Method        | Best Practice                                        |
| --------------------------- | ------------- | ---------------------------------------------------- |
| Authentication              | GitHub App    | Use for production, granular permissions             |
| Rate Limiting               | Check headers | Read `X-RateLimit-Remaining`, implement backoff      |
| API Selection               | GraphQL       | Prefer for complex queries, fewer requests           |
| Webhook Validation          | HMAC SHA256   | Always verify `X-Hub-Signature-256`                  |
| Self-hosted Runner Security | Isolated env  | Use dedicated networks, rotate secrets frequently    |
| Token Storage               | Secrets mgmt  | Use AWS Secrets Manager, Azure Key Vault, or similar |

## Authentication Methods

### Overview

| Method                | Use Case                            | Security Level | Granular Permissions |
| --------------------- | ----------------------------------- | -------------- | -------------------- |
| Personal Access Token | Quick scripts, development          | Low            | No                   |
| OAuth Apps            | Third-party user authorization      | Medium         | Limited              |
| GitHub Apps           | Production integrations, automation | High           | Yes                  |

**Recommendation**: Use GitHub Apps for production. See [references/authentication-patterns.md](references/authentication-patterns.md).

### GitHub Apps (Recommended)

**Why GitHub Apps:**

- Fine-grained permissions (read/write on specific resources)
- Organization-level installation
- Higher rate limits (15,000 req/hour per installation)
- Audit trail with App identity
- Can act on behalf of users or as the app itself

**See:** [references/github-app-creation.md](references/github-app-creation.md) for complete setup including marketplace registration.

## API Selection: REST vs GraphQL

### When to Use REST

- Simple CRUD operations (get repo, create issue)
- Single resource operations
- Webhook payloads (webhooks use REST format)

### When to Use GraphQL

- Complex queries spanning multiple resources
- Fetching nested data (repo → issues → comments)
- Reducing API calls (1 GraphQL query vs 10+ REST calls)
- Custom field selection (only fetch what you need)

**Example**: Fetching a repository with 20 open issues and their comments:

- REST: 22+ requests (1 repo + 1 issues list + 20 comment lists)
- GraphQL: 1 request

**See:** [references/graphql-patterns.md](references/graphql-patterns.md) for query examples and optimization.

## Rate Limiting Strategy

### Rate Limit Headers

Check these headers in every response:

```
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4999
X-RateLimit-Reset: 1719936000
X-RateLimit-Used: 1
X-RateLimit-Resource: core
```

### Implementation Pattern

```typescript
interface RateLimitInfo {
  remaining: number;
  reset: number; // Unix timestamp
}

function checkRateLimit(response: Response): RateLimitInfo {
  const remaining = parseInt(response.headers.get("X-RateLimit-Remaining") || "0");
  const reset = parseInt(response.headers.get("X-RateLimit-Reset") || "0");

  return { remaining, reset };
}

// Retry with exponential backoff
async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url);
    const rateLimit = checkRateLimit(response);

    if (response.status === 429 || rateLimit.remaining === 0) {
      const waitTime = Math.min(2 ** attempt * 1000, 60000); // Max 60s
      await sleep(waitTime);
      continue;
    }

    return response;
  }
  throw new Error("Rate limit exceeded after retries");
}
```

**See:** [references/rate-limiting-strategies.md](references/rate-limiting-strategies.md) for complete patterns including secondary rate limits.

## Webhook Security

### Validation Pattern

**CRITICAL**: Always validate webhook signatures to prevent spoofing attacks.

```typescript
import crypto from "crypto";

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(payload).digest("hex");

  // Use timing-safe comparison
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

// Express middleware example
app.post("/webhook", (req, res) => {
  const signature = req.headers["x-hub-signature-256"];
  const payload = JSON.stringify(req.body);

  if (!verifyWebhookSignature(payload, signature, WEBHOOK_SECRET)) {
    return res.status(401).send("Invalid signature");
  }

  // Process webhook
  handleWebhook(req.body);
  res.sendStatus(200);
});
```

**See:** [references/webhook-handling.md](references/webhook-handling.md) for event types, payload structures, and retry logic.

## GitHub Actions & Self-Hosted Runners

### Self-Hosted Runner Security

**Critical Security Considerations:**

1. **Network Isolation**: Run on isolated networks with strict egress rules
2. **Secrets Rotation**: Rotate runner tokens every 90 days minimum
3. **Ephemeral Runners**: Use ephemeral runners (auto-deregister after each job)
4. **No Public Repos**: Never use self-hosted runners for public repositories (security risk)
5. **Minimal Permissions**: Grant only necessary IAM/role permissions

**See:** [references/self-hosted-runners.md](references/self-hosted-runners.md) for setup, scaling, and security hardening.

### Actions Workflow Best Practices

- Use specific action versions (not `@main` or `@latest`)
- Pin actions by SHA for supply chain security
- Use GITHUB_TOKEN for API calls (automatic, scoped permissions)
- Store secrets in GitHub Secrets, never in code
- Use environments for deployment protection rules

**See:** [references/actions-workflows.md](references/actions-workflows.md) for workflow patterns and OIDC integration.

## GitHub App Marketplace

### Registration Requirements

1. **App Manifest**: Complete app.yml with description, permissions, webhook events
2. **Installation Flow**: Redirect users to GitHub authorization URL
3. **Webhook Endpoint**: Public HTTPS endpoint for receiving events
4. **Pricing Model**: Free, flat fee, or per-unit pricing
5. **Verification**: Email verification and publisher domain verification
6. **Terms**: Accept GitHub Marketplace Developer Agreement

**See:** [references/marketplace-registration.md](references/marketplace-registration.md) for step-by-step guide.

## Common Functions

### Repository Operations

| Function                   | API Endpoint                | GraphQL Alternative             |
| -------------------------- | --------------------------- | ------------------------------- |
| List repositories          | `GET /orgs/:org/repos`      | `query { organization }`        |
| Get repository             | `GET /repos/:owner/:repo`   | `query { repository }`          |
| Create repository          | `POST /orgs/:org/repos`     | `mutation { createRepository }` |
| Update repository settings | `PATCH /repos/:owner/:repo` | `mutation { updateRepository }` |

### Issue/PR Operations

| Function     | API Endpoint                            | GraphQL Alternative                     |
| ------------ | --------------------------------------- | --------------------------------------- |
| List issues  | `GET /repos/:owner/:repo/issues`        | `query { repository { issues } }`       |
| Create issue | `POST /repos/:owner/:repo/issues`       | `mutation { createIssue }`              |
| Update issue | `PATCH /repos/:owner/:repo/issues/:num` | `mutation { updateIssue }`              |
| List PRs     | `GET /repos/:owner/:repo/pulls`         | `query { repository { pullRequests } }` |

**See:** [references/api-reference.md](references/api-reference.md) for complete function catalog with 200+ endpoints.

## Error Handling

| Status Code | Meaning              | Action                                     |
| ----------- | -------------------- | ------------------------------------------ |
| 401         | Unauthorized         | Refresh token or check app installation    |
| 403         | Forbidden            | Check permissions, may be rate limited     |
| 404         | Not Found            | Verify resource exists and app has access  |
| 422         | Unprocessable Entity | Validation failed, check request body      |
| 429         | Rate Limit Exceeded  | Wait until `X-RateLimit-Reset` timestamp   |
| 502/503/504 | Server Error         | Retry with exponential backoff (3-5 times) |

## Security Best Practices

1. **Token Storage**: Use secrets management (AWS Secrets Manager, HashiCorp Vault)
2. **Least Privilege**: Request minimum required permissions for GitHub Apps
3. **Webhook Validation**: Always verify `X-Hub-Signature-256` header
4. **HTTPS Only**: All webhook endpoints must use HTTPS
5. **Token Rotation**: Rotate Personal Access Tokens every 90 days
6. **Audit Logging**: Log all API calls for security monitoring
7. **IP Allowlisting**: Restrict webhook sources to GitHub's IP ranges
8. **Dependency Scanning**: Use Dependabot for dependency vulnerability scanning

**See:** [references/security-best-practices.md](references/security-best-practices.md) for threat modeling and defense-in-depth patterns.

## References

- [references/authentication-patterns.md](references/authentication-patterns.md) - PAT, OAuth, GitHub Apps comparison and implementation
- [references/github-app-creation.md](references/github-app-creation.md) - Step-by-step GitHub App setup and marketplace registration
- [references/graphql-patterns.md](references/graphql-patterns.md) - GraphQL query optimization and schema exploration
- [references/rate-limiting-strategies.md](references/rate-limiting-strategies.md) - Primary, secondary rate limits, and retry patterns
- [references/webhook-handling.md](references/webhook-handling.md) - Event types, payload validation, and processing patterns
- [references/self-hosted-runners.md](references/self-hosted-runners.md) - Security hardening, scaling, and ephemeral runners
- [references/actions-workflows.md](references/actions-workflows.md) - Workflow syntax, OIDC, and CI/CD patterns
- [references/marketplace-registration.md](references/marketplace-registration.md) - Publishing GitHub Apps to marketplace
- [references/api-reference.md](references/api-reference.md) - Complete REST and GraphQL API catalog
- [references/security-best-practices.md](references/security-best-practices.md) - Threat modeling, secrets management, audit logging

## Related Skills

- `integration-chariot-patterns` - Chariot-specific integration patterns
- `burp-integration` - Burp Suite API integration for security scanning
- `hackerone-integration` - HackerOne API integration for vulnerability disclosure

## External Documentation

- **GitHub REST API**: https://docs.github.com/en/rest
- **GitHub GraphQL API**: https://docs.github.com/en/graphql
- **GitHub Apps**: https://docs.github.com/en/apps
- **Webhooks**: https://docs.github.com/en/webhooks
- **Actions**: https://docs.github.com/en/actions
- **Self-hosted Runners**: https://docs.github.com/en/actions/hosting-your-own-runners
