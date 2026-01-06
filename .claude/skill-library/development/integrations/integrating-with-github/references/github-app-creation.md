# GitHub App Lifecycle and Creation Guide

**Source**: GitHub Official Documentation (via Context7)
**Research Date**: 2026-01-03
**Context7 Library IDs**: `/websites/github_en`, `/websites/github_en_rest`

---

## Executive Summary

GitHub Apps provide a powerful integration framework with granular permissions, webhook-driven events, and OAuth-based authentication using JWT tokens. This document covers the complete lifecycle of GitHub Apps from creation through installation, based on official GitHub documentation.

---

## Key Findings

### 1. GitHub App Registration and Creation

GitHub Apps can be registered through three primary methods:

- **Manual Registration via UI**: Navigate to Settings → Developer settings → GitHub Apps
- **URL Parameters**: Pre-configure permissions using query parameters during registration
- **App Manifest**: Programmatic registration using JSON manifest (POST to `/settings/apps/new` or `/organizations/{ORG}/settings/apps/new`)

**Key Insight:** The manifest approach enables automated app provisioning with predefined permissions, webhooks, and OAuth callbacks.

### 2. Dual Authentication Model

GitHub Apps use a two-tier authentication system:

- **App-level Authentication (JWT)**: Used to manage app resources, list installations, and generate installation tokens
- **Installation-level Authentication (Installation Access Token)**: Used to interact with specific user/org resources on behalf of the app

**Token Lifecycle:**

- JWTs are self-generated using the app's private key
- Installation access tokens expire after 1 hour and must be regenerated
- Tokens can be scoped to specific repositories and permissions

### 3. Granular Permission System

GitHub Apps support 30+ permission scopes across repository, organization, and user levels:

**Repository Permissions:**

- `contents` (read/write) - Repository files and commits
- `issues` (read/write) - Issue management
- `pull_requests` (read/write) - PR management
- `checks` (read/write) - Status checks
- `actions` (read/write) - GitHub Actions workflows
- `security_events` (read/write) - Code scanning and secret scanning alerts

**Organization Permissions:**

- `organization_administration` (read/write) - Org settings
- `organization_hooks` (read/write) - Webhook configuration
- `members` (read/write) - Team and member management

**Permission Model:** Read/Write/None (some permissions support Admin level)

### 4. Webhook Delivery Management

GitHub Apps provide robust webhook infrastructure with:

- **Delivery Tracking**: Each webhook delivery has a unique ID and GUID
- **Retry Mechanism**: Failed deliveries can be manually redelivered via API
- **Delivery Inspection**: Full request/response logging with headers and payloads
- **Performance Metrics**: Duration, status codes, throttling timestamps

**API Endpoints:**

- `GET /app/hook/deliveries` - List all webhook deliveries
- `GET /app/hook/deliveries/{delivery_id}` - Get specific delivery details
- `POST /app/hook/deliveries/{delivery_id}/attempts` - Redeliver webhook
- `GET /app/hook/config` - Get webhook configuration
- `PATCH /app/hook/config` - Update webhook configuration

---

## Patterns Observed

### Installation Flow Pattern

```
1. User discovers app (Marketplace or direct link)
   ↓
2. User clicks "Install" and selects repositories (all or selected)
   ↓
3. GitHub redirects to app's redirect_url with temporary code
   ↓
4. App exchanges code for installation_id
   ↓
5. App generates JWT using private key
   ↓
6. App calls POST /app/installations/{installation_id}/access_tokens with JWT
   ↓
7. App receives installation access token (valid 1 hour)
   ↓
8. App uses installation token for API calls on behalf of user
```

### Permission Verification Pattern

```javascript
// Example: Requesting scoped installation token
POST /app/installations/{installation_id}/access_tokens
Authorization: Bearer {JWT}

{
  "repositories": ["my-repo"],
  "permissions": {
    "issues": "write",
    "contents": "read"
  }
}

Response:
{
  "token": "gho_v1.example...",
  "expires_at": "2023-01-01T12:00:00Z",
  "permissions": { "issues": "write", "contents": "read" },
  "repositories": [...]
}
```

---

## Conflicts and Trade-offs

### 1. Token Expiration vs Security

**Conflict:** Installation access tokens expire after 1 hour for security, but this requires frequent token regeneration in long-running processes.

**Trade-off:**

- **Security**: Short-lived tokens minimize exposure from token leaks
- **Complexity**: Apps must implement token refresh logic and handle expiration gracefully

**Recommendation:** Implement token caching with automatic refresh 5 minutes before expiration.

### 2. Permission Granularity vs User Friction

**Conflict:** Granular permissions provide security but increase complexity during installation.

**Trade-off:**

- **Fine-grained permissions**: Users see exactly what app can access
- **Installation friction**: Long permission lists may discourage installation

**Recommendation:** Request minimum required permissions initially, request additional permissions via `POST /installations/{id}/access_tokens` as needed.

### 3. Public vs Private App Distribution

**Conflict:** Public apps can reach wider audience but must meet marketplace requirements.

**Trade-off:**

- **Public (Marketplace)**: Broader reach, monetization, but strict review process
- **Private**: Faster deployment, org-specific, but limited distribution

**Recommendation:** Start private for MVP, publish to marketplace once mature and compliant.

### 4. Webhook Reliability vs App Complexity

**Conflict:** Webhooks enable real-time updates but require robust delivery handling.

**Trade-off:**

- **Push model (webhooks)**: Real-time, efficient, but requires delivery retry logic
- **Poll model (REST API)**: Simpler but inefficient and may hit rate limits

**Recommendation:** Use webhooks with idempotent handlers and delivery tracking via `/app/hook/deliveries` API.

---

## API Reference Summary

### App Management Endpoints

| Endpoint                                | Method | Purpose                       | Auth |
| --------------------------------------- | ------ | ----------------------------- | ---- |
| `/app`                                  | GET    | Get authenticated app details | JWT  |
| `/app/installations`                    | GET    | List all installations        | JWT  |
| `/app/installations/{id}`               | GET    | Get specific installation     | JWT  |
| `/app/installations/{id}/access_tokens` | POST   | Generate installation token   | JWT  |

### Webhook Management Endpoints

| Endpoint                             | Method | Purpose                 | Auth |
| ------------------------------------ | ------ | ----------------------- | ---- |
| `/app/hook/config`                   | GET    | Get webhook config      | JWT  |
| `/app/hook/config`                   | PATCH  | Update webhook config   | JWT  |
| `/app/hook/deliveries`               | GET    | List webhook deliveries | JWT  |
| `/app/hook/deliveries/{id}`          | GET    | Get delivery details    | JWT  |
| `/app/hook/deliveries/{id}/attempts` | POST   | Redeliver webhook       | JWT  |

### Registration Endpoints

| Endpoint                                 | Method | Purpose                 | Auth    |
| ---------------------------------------- | ------ | ----------------------- | ------- |
| `/settings/apps/new`                     | POST   | Register app (personal) | Session |
| `/organizations/{org}/settings/apps/new` | POST   | Register app (org)      | Session |

---

## App Manifest Schema

```json
{
  "name": "My GitHub App",
  "url": "https://www.example.com",
  "hook_attributes": {
    "url": "https://example.com/webhook"
  },
  "redirect_url": "https://example.com/oauth/callback",
  "callback_urls": ["https://example.com/oauth/callback"],
  "public": true,
  "default_permissions": {
    "issues": "write",
    "contents": "read",
    "checks": "write"
  },
  "default_events": ["issues", "issue_comment", "pull_request", "check_suite", "check_run"]
}
```

**Key Fields:**

- `name`: Display name (must be unique)
- `url`: App homepage URL
- `hook_attributes.url`: Webhook receiver endpoint
- `redirect_url`: OAuth callback after installation
- `public`: Whether app appears in marketplace search
- `default_permissions`: Initial permission requests
- `default_events`: Webhook event subscriptions

---

## Permission Configuration via URL Parameters

Apps can be pre-configured during registration using query parameters:

```
https://github.com/settings/apps/new?contents=write&pull_requests=read&checks=none
```

**Available Parameters:**

- Repository: `contents`, `issues`, `pull_requests`, `checks`, `actions`, `deployments`, etc.
- Organization: `organization_administration`, `organization_hooks`, `members`, etc.
- Values: `read`, `write`, `none` (omit parameter for no access)

**Use Case:** Deep-linking users to app registration with pre-selected permissions.

---

## Authentication Headers

### Using JWT (App-level)

```bash
curl -H "Accept: application/vnd.github+json" \
     -H "Authorization: Bearer {JWT}" \
     -H "X-GitHub-Api-Version: 2022-11-28" \
     https://api.github.com/app
```

### Using Installation Token (Installation-level)

```bash
curl -H "Accept: application/vnd.github+json" \
     -H "Authorization: Bearer {INSTALLATION_TOKEN}" \
     -H "X-GitHub-Api-Version: 2022-11-28" \
     https://api.github.com/repos/{owner}/{repo}
```

**Important:** Must use `Bearer` scheme for JWTs (not `token` scheme).

---

## Webhook Event Examples

### Installation Event

```json
{
  "action": "created",
  "installation": {
    "id": 12345,
    "account": {
      "login": "octocat",
      "type": "User"
    },
    "repository_selection": "selected",
    "permissions": {
      "issues": "write",
      "contents": "read"
    }
  },
  "repositories": [{ "id": 1296269, "name": "Hello-World", "full_name": "octocat/Hello-World" }]
}
```

---

## Best Practices

### 1. Token Management

- Store private key securely (environment variable, secrets manager)
- Generate JWTs on-demand (don't cache them long-term)
- Refresh installation tokens before expiration
- Use minimum required permissions per request

### 2. Webhook Handling

- Verify webhook signatures using `X-Hub-Signature-256` header
- Implement idempotent handlers (same webhook may be delivered multiple times)
- Respond quickly (< 10 seconds) and process asynchronously if needed
- Use `/app/hook/deliveries` API to investigate failures

### 3. Installation Flow

- Request minimum permissions during installation
- Request additional permissions via installation token scoping when needed
- Support both "all repositories" and "selected repositories" modes
- Handle repository addition/removal events (`installation_repositories` webhook)

### 4. Error Handling

- Handle rate limits (check `X-RateLimit-*` headers)
- Retry failed API calls with exponential backoff
- Log all authentication failures for security monitoring
- Provide clear error messages to users during installation

---

## Security Considerations

### 1. Private Key Protection

- Never commit private keys to version control
- Use environment variables or secrets management services
- Rotate private keys periodically (requires app reconfiguration)
- Monitor for unauthorized JWT generation

### 2. Webhook Security

- Always verify `X-Hub-Signature-256` header
- Use constant-time comparison for signature verification
- Reject webhooks with invalid signatures immediately
- Log rejected webhooks for security analysis

### 3. Token Security

- Never log tokens (JWTs or installation tokens)
- Transmit tokens only over HTTPS
- Revoke compromised installation access via GitHub UI
- Monitor for unusual API usage patterns

### 4. Permission Principle of Least Privilege

- Request only permissions actually needed
- Scope installation tokens to specific repositories when possible
- Document why each permission is required in app description
- Review and remove unused permissions periodically

---

## Complete Permission List

### Repository Permissions

| Permission               | Description                     | Levels             |
| ------------------------ | ------------------------------- | ------------------ |
| `actions`                | Manage GitHub Actions workflows | read, write        |
| `administration`         | Manage repository settings      | read, write        |
| `checks`                 | Manage checks on code           | read, write        |
| `codespaces`             | Manage Codespaces               | read, write        |
| `contents`               | Manage repository contents      | read, write        |
| `dependabot_secrets`     | Manage Dependabot secrets       | read, write        |
| `deployments`            | Manage deployments              | read, write        |
| `environments`           | Manage repository environments  | read, write        |
| `issues`                 | Manage issues                   | read, write        |
| `metadata`               | Access repository metadata      | read               |
| `packages`               | Manage packages                 | read, write        |
| `pages`                  | Manage GitHub Pages             | read, write        |
| `pull_requests`          | Manage pull requests            | read, write        |
| `repository_hooks`       | Manage webhooks                 | read, write        |
| `repository_projects`    | Manage repository projects      | read, write, admin |
| `secret_scanning_alerts` | Manage secret scanning alerts   | read, write        |
| `secrets`                | Manage repository secrets       | read, write        |
| `security_events`        | Manage security events          | read, write        |
| `single_file`            | Access single file              | read, write        |
| `statuses`               | Manage commit statuses          | read, write        |
| `vulnerability_alerts`   | Manage Dependabot alerts        | read, write        |
| `workflows`              | Update workflow files           | write              |

### Organization Permissions

| Permission                         | Description                  | Levels             |
| ---------------------------------- | ---------------------------- | ------------------ |
| `members`                          | Manage organization members  | read, write        |
| `organization_administration`      | Manage organization settings | read, write        |
| `organization_hooks`               | Manage organization webhooks | read, write        |
| `organization_packages`            | Manage organization packages | read, write        |
| `organization_plan`                | View organization plan       | read               |
| `organization_projects`            | Manage organization projects | read, write, admin |
| `organization_secrets`             | Manage organization secrets  | read, write        |
| `organization_self_hosted_runners` | Manage self-hosted runners   | read, write        |
| `organization_user_blocking`       | Block/unblock users          | read, write        |

---

## Sources

All documentation sourced from official GitHub documentation via Context7:

- [GitHub Apps Documentation](https://docs.github.com/en/apps)
- [GitHub REST API - Apps](https://docs.github.com/en/rest/apps)
- [Registering a GitHub App using URL parameters](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app-using-url-parameters)
- [Creating a GitHub App from a manifest](https://docs.github.com/en/apps/creating-github-apps/setting-up-a-github-app/creating-a-github-app-from-a-manifest)
- [Generating an installation access token](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app)
