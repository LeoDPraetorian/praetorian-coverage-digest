# GitHub Authentication and Authorization Patterns

**Source**: GitHub REST API Official Documentation (via Context7)
**Research Date**: 2026-01-03
**Context7 Library ID**: `/websites/github_en_rest`

---

## Executive Summary

GitHub provides three primary authentication methods for REST API access: **Personal Access Tokens** (classic and fine-grained), **OAuth Apps**, and **GitHub Apps**. Each method serves different use cases with distinct authentication flows, token lifecycles, and permission models. Fine-grained Personal Access Tokens and GitHub Apps represent the modern approach with granular permission control, while classic PATs and OAuth Apps maintain broader scope-based permissions for backward compatibility.

**Key Recommendation**: GitHub officially recommends using **fine-grained Personal Access Tokens** for personal use and **GitHub Apps** for integrations requiring installation-based access with granular permissions.

---

## Key Findings

### 1. Personal Access Tokens (PATs)

**Classic PATs:**

- Scope-based authorization model
- Requires specific scopes for REST API endpoint access
- Acts as user identity with selected scopes
- Token format: `gho_` prefix for OAuth-generated tokens
- Less granular control compared to fine-grained PATs

**Fine-grained PATs (Recommended):**

- Permission-based authorization model (more granular than scopes)
- Specific permissions required per REST API endpoint
- Can target specific repositories
- Provides better security through principle of least privilege
- REST API documentation specifies required permissions per endpoint

**Security Practices:**

- Treat tokens like passwords
- Keep credentials secure (see: "Keeping your API credentials secure")
- Tokens act as limited user identity

**Token Lifecycle:**

- Create via GitHub Settings → Developer Settings → Personal Access Tokens
- Include in `Authorization` header: `Authorization: Bearer YOUR-TOKEN` or `Authorization: token YOUR-TOKEN`
- No explicit refresh mechanism (regenerate manually if needed)

### 2. OAuth Apps

**Authentication Flow:**

- Uses **Basic Authentication** with client ID (username) and client secret (password)
- Client ID format: `Iv1.8a61f9b3a7aba766`
- Generates OAuth access tokens with scopes
- Token prefix: `gho_` for OAuth app tokens, `ghu_` for GitHub App user tokens

**Key Endpoints:**

- `POST /applications/{client_id}/token` - Check token validity without rate limit penalties
- `PATCH /applications/{client_id}/token` - Reset valid OAuth token (changes take effect immediately)
- Returns `404 NOT FOUND` for invalid tokens

**Token Management:**

```javascript
// Check token validity
async function checkTokenValidity(clientId, clientSecret, accessTokenToCheck) {
  const url = `https://api.github.com/applications/${clientId}/token`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${clientId}:${clientSecret}`),
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ access_token: accessTokenToCheck }),
  });

  // 200 = valid, 404 = invalid
  return response.status === 200;
}
```

**Token Structure:**

- OAuth tokens include: `token`, `token_last_eight`, `hashed_token`, `scopes`, `expires_at`
- Scopes array: `["public_repo", "user"]`
- Associated with GitHub App or OAuth App metadata

### 3. GitHub Apps

**Authentication Methods:**

**A. JWT (JSON Web Token) for App-Level Access**

- Used for app-wide operations (listing installations, getting app info)
- Must use `Authorization: Bearer <JWT>` format
- Does NOT work with user access tokens or installation access tokens
- Required for endpoints like `GET /app` and `GET /app/installations`

**B. Installation Access Tokens**

- Generated per installation via `POST /app/installations/{installation_id}/access_tokens`
- Scoped to specific organization, user, or repositories
- Time-limited (expire after set duration)
- Token prefix: `ghs_` for scoped access tokens

**C. Scoped Access Tokens**

- Allows fine-grained repository and permission scoping
- Can specify `repositories` (by name) or `repository_ids`
- Granular permissions object with 40+ permission types

**GitHub Apps Authentication Flow:**

```javascript
const { Octokit } = require("@octokit/core");

// Step 1: Authenticate with JWT
const octokit = new Octokit({
  authStrategy: require("@octokit/auth-app"),
  auth: {
    id: appId,
    privateKey: privateKey, // RSA private key
    installationId: YOUR_INSTALLATION_ID,
  },
});

// Step 2: List installations (requires JWT)
const installations = await octokit.request("GET /app/installations", {
  headers: { "X-GitHub-Api-Version": "2022-11-28" },
});

// Step 3: Create installation access token
// (Octokit handles this automatically with authStrategy)
```

### 4. GITHUB_TOKEN (GitHub Actions)

- Built-in token available in GitHub Actions workflows
- Automatically authenticated
- Use `gh auth login` for GitHub CLI
- No manual token creation required

---

## Permissions and Scopes Deep Dive

### Fine-Grained PAT Permissions

REST API endpoints require specific permissions. Examples:

- **Contents**: `read` (view files), `write` (modify files, commits, branches)
- **Issues**: `read` (view issues), `write` (create/edit issues, comments, labels)
- **Pull Requests**: `read` (view PRs), `write` (create/edit PRs, merge)
- **Actions**: `read` (view workflows), `write` (trigger workflows)
- **Metadata**: `read` (search repos, access metadata) - Often required implicitly

### GitHub Apps Permissions

**Repository Permissions** (40+ types):

- `actions` - Workflows, runs, artifacts
- `administration` - Repository settings, teams, collaborators
- `checks` - Checks on code
- `contents` - Repository contents, commits, branches
- `deployments` - Deployment statuses
- `issues` - Issues, comments, assignees, labels
- `pull_requests` - PRs, comments, merges
- `secrets` - Repository secrets management
- `security_events` - Code scanning alerts
- `single_file` - Access to a single file

**Organization Permissions**:

- `members` - Teams and members
- `organization_administration` - Organization access management
- `organization_hooks` - Organization webhooks
- `organization_secrets` - Organization-level secrets
- `organization_projects` - Organization projects

**User Permissions**:

- `email_addresses` - User email management
- `followers` - Follower management
- `git_ssh_keys` - SSH keys
- `gpg_keys` - GPG keys
- `profile` - Profile settings

Each permission supports:

- `read` - View access
- `write` - Modify access
- `admin` - Administrative access (some permissions only)

### OAuth Scopes (Classic Model)

Used by classic PATs and OAuth Apps. Examples:

- `public_repo` - Public repositories
- `repo` - Full control of private repositories
- `user` - User profile data
- `admin:org` - Organization administration

---

## Authentication Flows Comparison

| Method                 | Use Case                | Token Prefix   | Auth Header         | Granularity                         |
| ---------------------- | ----------------------- | -------------- | ------------------- | ----------------------------------- |
| **Fine-grained PAT**   | Personal use, scripts   | `github_pat_*` | `Bearer` or `token` | Per-permission + repository-scoped  |
| **Classic PAT**        | Legacy personal use     | -              | `Bearer` or `token` | Scope-based                         |
| **OAuth App**          | Third-party apps        | `gho_`         | `Bearer` or `token` | Scope-based                         |
| **GitHub App (JWT)**   | App-level operations    | -              | `Bearer` (required) | App-level only                      |
| **Installation Token** | GitHub App integrations | -              | `Bearer` or `token` | Per-installation + permission-based |
| **Scoped Token**       | Fine-grained app access | `ghs_`         | `Bearer` or `token` | Repository + permission-scoped      |
| **GITHUB_TOKEN**       | GitHub Actions          | -              | Automatic           | Workflow-scoped                     |

---

## Token Lifecycle Management

### Personal Access Tokens

- **Creation**: Manual via GitHub UI
- **Expiration**: Optional (classic) or required (fine-grained)
- **Revocation**: Manual via GitHub UI
- **Rotation**: Manual regeneration required

### OAuth App Tokens

- **Creation**: OAuth flow or direct grant
- **Validation**: `POST /applications/{client_id}/token` (doesn't count against rate limits)
- **Reset**: `PATCH /applications/{client_id}/token` (immediate effect)
- **Revocation**: Manual or via API

### GitHub App Installation Tokens

- **Creation**: `POST /app/installations/{installation_id}/access_tokens`
- **Expiration**: Time-limited (typically 1 hour)
- **Refresh**: Generate new token before expiration
- **Revocation**: Automatic on expiration or manual deletion

---

## Best Practices & Security Recommendations

### Token Security

1. **Never commit tokens** to version control
2. **Use environment variables** or secure secret managers
3. **Rotate tokens regularly** (especially for long-lived integrations)
4. **Apply principle of least privilege** (minimal permissions/scopes)
5. **Monitor token usage** via audit logs

### Authentication Method Selection

- **Personal scripts/automation**: Fine-grained PAT
- **Third-party OAuth integration**: OAuth Apps
- **GitHub integration/bot**: GitHub Apps
- **CI/CD workflows**: GITHUB_TOKEN
- **Organization-wide tools**: GitHub Apps with installation tokens

### Permission Hygiene

- **Start with read-only** permissions and expand as needed
- **Scope to specific repositories** when possible (fine-grained PATs, scoped tokens)
- **Review permissions periodically** to remove unnecessary access
- **Use installation tokens** over long-lived PATs for GitHub Apps

---

## Common Patterns

### Pattern 1: Octokit.js Authentication with PAT

```javascript
import { Octokit } from "octokit";

const octokit = new Octokit({
  auth: "YOUR-TOKEN", // Fine-grained or classic PAT
});

// Make authenticated requests
const { data } = await octokit.request("GET /user");
```

### Pattern 2: GitHub App JWT Generation

```javascript
const jwt = require("jsonwebtoken");

// Generate JWT for GitHub App
const payload = {
  iat: Math.floor(Date.now() / 1000), // Issued at time
  exp: Math.floor(Date.now() / 1000) + 10 * 60, // Expires in 10 minutes
  iss: YOUR_APP_ID, // GitHub App ID
};

const token = jwt.sign(payload, privateKey, { algorithm: "RS256" });

// Use JWT to authenticate as the app
const response = await fetch("https://api.github.com/app", {
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
  },
});
```

### Pattern 3: Installation Token Creation

```bash
# Using GitHub CLI (handles JWT automatically)
gh api /app/installations --jq '.[] | .account.login'

# Create installation token
gh api POST /app/installations/{installation_id}/access_tokens \
  -f permissions[contents]=read \
  -f permissions[issues]=write
```

### Pattern 4: Token Validation (OAuth Apps)

```bash
curl -L \
  -X POST \
  -H "Accept: application/vnd.github+json" \
  -u "<YOUR_CLIENT_ID>:<YOUR_CLIENT_SECRET>" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/applications/Iv1.8a61f9b3a7aba766/token \
  -d '{"access_token":"e72e16c7e42f292c6912e7710c838347ae178b4a"}'
```

---

## Conflicts and Trade-offs

### Fine-Grained PAT vs Classic PAT

- **Trade-off**: Fine-grained provides better security but requires more configuration
- **Migration Cost**: Classic PATs still supported but not recommended for new implementations
- **Conflict**: Some legacy integrations may not support fine-grained permissions yet

### OAuth Apps vs GitHub Apps

- **Trade-off**: OAuth Apps simpler to implement, GitHub Apps more powerful
- **User Experience**: GitHub Apps provide better installation flow and permissions UI
- **Conflict**: OAuth Apps act as user, GitHub Apps act as bot (different identity model)

### JWT vs Installation Tokens

- **Trade-off**: JWT for app-level operations only, installation tokens for repository access
- **Expiration**: JWT short-lived (10 min max), installation tokens configurable (1 hour typical)
- **Use Case**: Cannot use JWT for repository operations, must create installation token

### Scopes vs Permissions

- **Granularity**: Permissions (fine-grained PATs, GitHub Apps) more granular than scopes (classic PATs, OAuth Apps)
- **Compatibility**: Some endpoints only support specific authentication methods
- **Documentation**: Permissions per-endpoint documentation more comprehensive than scope documentation

---

## Anti-Patterns to Avoid

❌ **Using JWT for repository operations**

- JWTs only work for app-level endpoints (`/app/*`)
- Solution: Generate installation access token first

❌ **Storing tokens in code or version control**

- High security risk
- Solution: Use environment variables, GitHub Secrets, or secure vaults

❌ **Over-permissioned tokens**

- Violates least privilege principle
- Solution: Start minimal, expand only as needed

❌ **Long-lived tokens without rotation**

- Increases attack surface
- Solution: Implement token rotation or use installation tokens with automatic expiration

❌ **Mixing Authorization header formats**

- JWT requires `Authorization: Bearer`, PAT allows `Bearer` or `token`
- Solution: Use `Bearer` consistently for modern implementations

---

## Sources

All documentation sourced from official GitHub REST API documentation via Context7:

- **Authentication Overview**: https://docs.github.com/en/rest/authentication/authenticating-to-the-rest-api
- **Personal Access Tokens**: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- **OAuth Apps**: https://docs.github.com/en/apps/oauth-apps
- **GitHub Apps**: https://docs.github.com/en/apps/creating-github-apps
- **Permissions for Fine-Grained PATs**: https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens
- **GitHub REST API Reference**: https://docs.github.com/en/rest

Context7 Library ID: `/websites/github_en_rest`
