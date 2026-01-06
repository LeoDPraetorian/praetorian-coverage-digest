---
name: integrating-with-gitlab
description: Use when integrating with GitLab APIs (REST/GraphQL), authentication (PAT/OAuth/Group Tokens), webhooks, CI/CD pipelines, and GitLab runners - comprehensive patterns for secure GitLab integration including GATO/GLATO security assessment
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, WebSearch
---

# Integrating with GitLab

**Comprehensive guide for integrating with GitLab's APIs, authentication methods, webhooks, CI/CD pipelines, and security assessment patterns including GATO/GLATO tooling.**

## Prerequisites

- GitLab account with appropriate permissions (self-hosted or GitLab.com)
- Understanding of OAuth 2.0 flow (for OAuth apps)
- API rate limit awareness (varies by plan: 10-2000 req/min for authenticated)
- Security: Never commit tokens/secrets to repositories
- Knowledge of GitLab CI/CD security attack surfaces (for security assessments)

## When to Use

Use this skill when:

- Building GitLab integrations (repository management, issue tracking, pipeline automation)
- Choosing authentication method (Personal Access Token vs Group Token vs OAuth)
- Implementing rate limiting and retry strategies for GitLab-specific endpoints
- Setting up GitLab CI/CD workflows or self-hosted/shared runners
- Performing security assessments with GATO (GitHub Attacks Toolkit) / GLATO (GitLab Attacks Toolkit)
- Handling GitLab webhooks and system hooks securely
- Enumerating GitLab attack surfaces for red team assessments

## Quick Reference

| Operation                   | Method                | Best Practice                                      |
| --------------------------- | --------------------- | -------------------------------------------------- |
| Authentication              | Personal Access Token | Use with `api` scope, rotate every 90 days         |
| Rate Limiting               | Respect 429 responses | Implement exponential backoff, check retry headers |
| API Selection               | REST (primary)        | GraphQL available but less mature than GitHub      |
| Webhook Validation          | Token header          | Verify `X-Gitlab-Token` header                     |
| Self-hosted Runner Security | Isolated env          | Use dedicated networks, rotate registration tokens |
| Token Storage               | Secrets mgmt          | Use AWS Secrets Manager, Vault, or similar         |
| Security Assessment         | GATO/GLATO            | Use for CI/CD attack surface enumeration           |

## Authentication Methods

### Overview

| Method                 | Use Case                          | Security Level | Granular Permissions |
| ---------------------- | --------------------------------- | -------------- | -------------------- |
| Personal Access Token  | Scripts, integrations, API access | Medium         | Scope-based          |
| OAuth 2.0 Applications | Third-party app authorization     | High           | User-delegated       |
| Group Access Tokens    | Group-level automation            | Medium         | Group-scoped         |
| Project Access Tokens  | Project-specific CI/CD            | Medium         | Project-scoped       |
| Deploy Tokens          | Read-only repository access       | Low            | Limited (read-only)  |
| CI/CD Job Tokens       | Automatic pipeline authentication | High           | Job-scoped           |

**Recommendation**: Use Personal Access Tokens with minimum scopes for integrations, OAuth for user-facing apps, and Project/Group tokens for automation. See [references/authentication-patterns.md](references/authentication-patterns.md).

### Personal Access Tokens (Common)

**Scopes Available:**

- `api` - Full API access (read/write)
- `read_api` - Read-only API access
- `read_repository` - Read repository code
- `write_repository` - Write to repository
- `read_user` - Read user profile info
- `read_registry` - Read container registry
- `write_registry` - Write to container registry
- `sudo` - Perform API actions as any user (admin only)

**Best Practices:**

- Use minimum required scopes
- Set expiration dates (max 365 days)
- Rotate tokens every 90 days
- Store in secrets management system
- Revoke immediately if compromised

**See:** [references/token-management.md](references/token-management.md) for lifecycle management.

### OAuth 2.0 Applications

**Authorization Code Flow:**

1. Redirect user to: `https://gitlab.example.com/oauth/authorize`
2. User authorizes application
3. GitLab redirects back with authorization code
4. Exchange code for access token at `/oauth/token`
5. Use access token for API calls

**See:** [references/oauth-flow.md](references/oauth-flow.md) for complete implementation.

## API Selection: REST vs GraphQL

### REST API (Primary)

**Advantages:**

- Mature and stable
- Comprehensive documentation
- All GitLab features supported
- Consistent versioning (`/api/v4/`)

**Common Endpoints:**

- Projects: `/api/v4/projects`
- Groups: `/api/v4/groups`
- Users: `/api/v4/users`
- Pipelines: `/api/v4/projects/:id/pipelines`
- Issues: `/api/v4/projects/:id/issues`
- Merge Requests: `/api/v4/projects/:id/merge_requests`

### GraphQL API (Emerging)

**Advantages:**

- Reduce over-fetching (fetch only needed fields)
- Single request for nested data
- Type-safe schema

**Limitations:**

- Not all features available (check [GitLab GraphQL API Reference](https://docs.gitlab.com/ee/api/graphql/))
- Less mature than REST API
- Some endpoints still REST-only

**See:** [references/rest-vs-graphql.md](references/rest-vs-graphql.md) for decision matrix.

## Rate Limiting Strategy

### Rate Limit Tiers (GitLab.com)

| Tier        | Authenticated | Unauthenticated |
| ----------- | ------------- | --------------- |
| Free        | 300 req/min   | 10 req/min      |
| Premium     | 600 req/min   | 10 req/min      |
| Ultimate    | 2000 req/min  | 10 req/min      |
| Self-hosted | Configurable  | Configurable    |

### Response Headers

```
RateLimit-Limit: 600
RateLimit-Observed: 1
RateLimit-Remaining: 599
RateLimit-Reset: 1719936000
RateLimit-ResetTime: Mon, 02 Jul 2024 12:00:00 GMT
Retry-After: 60
```

### Implementation Pattern

```typescript
interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
}

async function fetchWithRateLimit(url: string, token: string): Promise<Response> {
  const headers = {
    "PRIVATE-TOKEN": token,
    "Content-Type": "application/json",
  };

  const response = await fetch(url, { headers });

  // Check rate limit headers
  const rateLimit: RateLimitInfo = {
    limit: parseInt(response.headers.get("RateLimit-Limit") || "0"),
    remaining: parseInt(response.headers.get("RateLimit-Remaining") || "0"),
    reset: parseInt(response.headers.get("RateLimit-Reset") || "0"),
  };

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get("Retry-After") || "60");
    console.warn(`Rate limited. Retrying after ${retryAfter}s`);
    await sleep(retryAfter * 1000);
    return fetchWithRateLimit(url, token); // Retry
  }

  if (rateLimit.remaining < 10) {
    console.warn(`Approaching rate limit: ${rateLimit.remaining}/${rateLimit.limit}`);
  }

  return response;
}
```

**See:** [references/rate-limiting.md](references/rate-limiting.md) for complete patterns including burst limits and GraphQL rate limiting.

## Webhook Security

### Webhook Types

1. **Project Webhooks** - Project-level events (push, merge request, pipeline)
2. **Group Webhooks** - Group-level events (project creation, member changes)
3. **System Hooks** - Instance-level events (admin only, self-hosted)

### Validation Pattern

**CRITICAL**: Always validate webhook secret tokens to prevent spoofing.

```typescript
function verifyGitLabWebhook(req: Request, expectedToken: string): boolean {
  const receivedToken = req.headers["x-gitlab-token"];

  // Use timing-safe comparison
  return crypto.timingSafeEqual(Buffer.from(receivedToken || ""), Buffer.from(expectedToken));
}

// Express middleware
app.post("/webhook", (req, res) => {
  if (!verifyGitLabWebhook(req, WEBHOOK_SECRET)) {
    return res.status(401).send("Invalid token");
  }

  const eventType = req.headers["x-gitlab-event"];
  handleWebhookEvent(eventType, req.body);

  res.sendStatus(200);
});
```

**Event Types:**

- Push Hook
- Tag Push Hook
- Issue Hook
- Merge Request Hook
- Pipeline Hook
- Job Hook
- Deployment Hook
- Release Hook

**See:** [references/webhook-events.md](references/webhook-events.md) for payload structures and event handling patterns.

## GitLab CI/CD & Runners

### Runner Types

| Type             | Use Case                     | Security Level |
| ---------------- | ---------------------------- | -------------- |
| Shared Runners   | GitLab.com default runners   | Medium         |
| Group Runners    | Shared across group projects | Medium-High    |
| Specific Runners | Dedicated to single project  | High           |
| Instance Runners | Self-hosted, all projects    | Varies         |

### Self-Hosted Runner Security

**Critical Considerations:**

1. **Network Isolation**: Deploy in isolated VPCs with strict egress rules
2. **Runner Registration**: Rotate registration tokens every 90 days
3. **Executor Choice**: Use Docker executor with image allow-lists
4. **Secrets Management**: Use CI/CD variables with "protected" and "masked" flags
5. **Pipeline Security**: Disable Auto DevOps for public projects
6. **Artifact Security**: Scan artifacts for secrets before storage

**Dangerous Runner Attack Vectors:**

- Shared runners processing public project pipelines (supply chain attacks)
- Overly permissive GitLab Runner tokens with `sudo` scope
- Lack of Docker image scanning for runner executors
- Exposed runner registration tokens in public repositories

**See:** [references/runner-security.md](references/runner-security.md) for hardening guide and GATO/GLATO attack scenarios.

### .gitlab-ci.yml Best Practices

- Use specific Docker image tags (not `latest`)
- Enable "protected branches" for production deployments
- Use CI/CD variables for secrets (never hardcode)
- Implement SAST/DAST security scans
- Set appropriate runner tags to control execution environment
- Use `rules` instead of deprecated `only/except`

**See:** [references/cicd-pipeline-patterns.md](references/cicd-pipeline-patterns.md) for workflow examples.

## Security Assessment with GATO/GLATO

### Overview

**GATO (GitHub Attacks Toolkit)** and **GLATO (GitLab Attacks Toolkit)** are offensive security tools for enumerating and exploiting CI/CD attack surfaces.

**Use Cases:**

- Red team assessments of GitLab infrastructure
- Identifying overly permissive runner configurations
- Enumerating accessible secrets in CI/CD pipelines
- Testing for pipeline injection vulnerabilities
- Discovering exposed GitLab tokens in repositories

### GLATO Modules

Available in: `modules/go-gato/glato/`

**Key Capabilities:**

- Token enumeration and privilege escalation
- Runner enumeration and exploitation
- Pipeline secret extraction
- Repository enumeration (public/private access testing)
- Group and project hierarchy traversal
- Self-hosted GitLab instance fingerprinting

**Example Commands:**

```bash
# Enumerate accessible projects with token
python glato.py enumerate --token <gitlab-token> --url https://gitlab.example.com

# Check runner permissions
python glato.py runners --token <gitlab-token>

# Extract pipeline secrets
python glato.py secrets --project-id <id> --token <gitlab-token>
```

**See:** [references/gato-glato-usage.md](references/gato-glato-usage.md) for complete attack scenarios and detection patterns.

## Common API Operations

### Project Operations

| Function                | API Endpoint                       | Authentication      |
| ----------------------- | ---------------------------------- | ------------------- |
| List projects           | `GET /api/v4/projects`             | PAT with `read_api` |
| Get project             | `GET /api/v4/projects/:id`         | PAT with `read_api` |
| Create project          | `POST /api/v4/projects`            | PAT with `api`      |
| Update project settings | `PUT /api/v4/projects/:id`         | PAT with `api`      |
| List project members    | `GET /api/v4/projects/:id/members` | PAT with `read_api` |

### Pipeline Operations

| Function         | API Endpoint                                              | Authentication      |
| ---------------- | --------------------------------------------------------- | ------------------- |
| List pipelines   | `GET /api/v4/projects/:id/pipelines`                      | PAT with `read_api` |
| Get pipeline     | `GET /api/v4/projects/:id/pipelines/:pipeline_id`         | PAT with `read_api` |
| Trigger pipeline | `POST /api/v4/projects/:id/trigger/pipeline`              | Trigger token       |
| Cancel pipeline  | `POST /api/v4/projects/:id/pipelines/:pipeline_id/cancel` | PAT with `api`      |
| Retry pipeline   | `POST /api/v4/projects/:id/pipelines/:pipeline_id/retry`  | PAT with `api`      |

**See:** [references/api-reference.md](references/api-reference.md) for complete endpoint catalog with 300+ operations.

## Error Handling

| Status Code | Meaning              | Action                                        |
| ----------- | -------------------- | --------------------------------------------- |
| 401         | Unauthorized         | Check token validity and scopes               |
| 403         | Forbidden            | Insufficient permissions for resource         |
| 404         | Not Found            | Verify resource exists and token has access   |
| 422         | Unprocessable Entity | Validation failed, check request payload      |
| 429         | Rate Limit Exceeded  | Wait for `Retry-After` seconds                |
| 500/502/503 | Server Error         | Retry with exponential backoff (3-5 attempts) |

## Security Best Practices

1. **Token Management**: Store tokens in AWS Secrets Manager, Vault, or equivalent
2. **Least Privilege**: Use minimum token scopes required for operation
3. **Webhook Validation**: Always verify `X-Gitlab-Token` header
4. **HTTPS Only**: All webhook endpoints must use HTTPS
5. **Token Rotation**: Rotate Personal Access Tokens every 90 days
6. **Audit Logging**: Enable audit events for all API operations (self-hosted)
7. **IP Allowlisting**: Restrict webhook sources to known GitLab instance IPs
8. **Dependency Scanning**: Use GitLab SAST/Dependency Scanning in pipelines
9. **Runner Isolation**: Never use shared runners for sensitive workloads
10. **Secret Detection**: Enable GitLab Secret Detection in all repositories

**See:** [references/security-best-practices.md](references/security-best-practices.md) for threat modeling and defense-in-depth patterns.

## Chariot Platform Integration

### Existing Implementations

**Backend Integration**: `modules/chariot/backend/pkg/tasks/integrations/gitlab/gitlab.go`

- Asset discovery from GitLab repositories
- CI/CD pipeline enumeration
- Webhook integration for real-time updates

**Security Capabilities**: `modules/chariot-aegis-capabilities/.../gitlab-pat-scanner/`

- Personal Access Token validation and enumeration
- Credential scanning in GitLab repositories

**See:** [references/chariot-gitlab-patterns.md](references/chariot-gitlab-patterns.md) for Chariot-specific implementation patterns.

## References

- [references/authentication-patterns.md](references/authentication-patterns.md) - PAT, OAuth, Group/Project token comparison
- [references/token-management.md](references/token-management.md) - Token lifecycle, rotation, and revocation
- [references/oauth-flow.md](references/oauth-flow.md) - Complete OAuth 2.0 implementation for GitLab
- [references/rest-vs-graphql.md](references/rest-vs-graphql.md) - API selection decision matrix
- [references/rate-limiting.md](references/rate-limiting.md) - Rate limit handling and retry strategies
- [references/webhook-events.md](references/webhook-events.md) - Event types, payloads, and handling patterns
- [references/runner-security.md](references/runner-security.md) - Security hardening for self-hosted runners
- [references/cicd-pipeline-patterns.md](references/cicd-pipeline-patterns.md) - `.gitlab-ci.yml` best practices
- [references/gato-glato-usage.md](references/gato-glato-usage.md) - Offensive security assessment with GATO/GLATO
- [references/api-reference.md](references/api-reference.md) - Complete REST and GraphQL API catalog
- [references/security-best-practices.md](references/security-best-practices.md) - Threat modeling and secure integration
- [references/chariot-gitlab-patterns.md](references/chariot-gitlab-patterns.md) - Chariot-specific integration patterns

## Related Skills

- `integrating-with-github` - GitHub API integration patterns
- `developing-integrations` - General integration development patterns for Chariot
- `burp-integration` - Burp Suite API integration for security scanning

## External Documentation

- **GitLab REST API**: https://docs.gitlab.com/ee/api/
- **GitLab GraphQL API**: https://docs.gitlab.com/ee/api/graphql/
- **OAuth 2.0**: https://docs.gitlab.com/ee/api/oauth2.html
- **Webhooks**: https://docs.gitlab.com/ee/user/project/integrations/webhooks.html
- **CI/CD**: https://docs.gitlab.com/ee/ci/
- **Runners**: https://docs.gitlab.com/runner/
- **GLATO Repository**: `modules/go-gato/glato/` (internal)
