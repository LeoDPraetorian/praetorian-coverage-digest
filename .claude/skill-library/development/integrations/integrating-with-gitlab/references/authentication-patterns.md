# GitLab Authentication Patterns

**Complete guide to GitLab authentication methods, use cases, and implementation patterns.**

## Overview

GitLab supports multiple authentication methods, each designed for specific use cases with different security characteristics and permission models.

## Authentication Method Comparison

| Method                          | Use Case                          | Security Level | Granular Permissions | Expiration                 | Rotation Support   |
| ------------------------------- | --------------------------------- | -------------- | -------------------- | -------------------------- | ------------------ |
| **Personal Access Token (PAT)** | Scripts, integrations, API access | Medium         | Scope-based          | Max 365 days               | Yes (GitLab 17.7+) |
| **OAuth 2.0 Applications**      | Third-party app authorization     | High           | User-delegated       | 2 hours (refresh required) | Automatic          |
| **Group Access Tokens**         | Group-level automation            | Medium         | Group-scoped         | Configurable               | Yes                |
| **Project Access Tokens**       | Project-specific CI/CD            | Medium         | Project-scoped       | Configurable               | Yes                |
| **Deploy Tokens**               | Read-only repository access       | Low            | Limited (read-only)  | Configurable               | No                 |
| **CI/CD Job Tokens**            | Automatic pipeline authentication | High           | Job-scoped           | Automatic (per-job)        | Automatic          |

## Personal Access Tokens (PATs)

### Overview

PATs are the most common authentication method for GitLab API integrations. They provide programmatic access with configurable scopes.

### Available Scopes

```yaml
api: # Full API access (read/write)
read_api: # Read-only API access
read_repository: # Read repository code
write_repository: # Write to repository
read_user: # Read user profile info
read_registry: # Read container registry
write_registry: # Write to container registry
sudo: # Perform API actions as any user (admin only)
```

### Implementation Pattern

**Header Format:**

```http
# Option 1: PRIVATE-TOKEN header (GitLab-specific)
PRIVATE-TOKEN: glpat-xxxxxxxxxxxxxxxxxxxx

# Option 2: Authorization Bearer token (OAuth-compliant)
Authorization: Bearer glpat-xxxxxxxxxxxxxxxxxxxx
```

**Go Example:**

```go
package main

import (
    "github.com/xanzy/go-gitlab"
)

func NewGitLabClient(token string, baseURL string) (*gitlab.Client, error) {
    client, err := gitlab.NewClient(token, gitlab.WithBaseURL(baseURL))
    if err != nil {
        return nil, fmt.Errorf("failed to create GitLab client: %w", err)
    }
    return client, nil
}

// Usage
client, err := NewGitLabClient("glpat-xxxxxxxxxxxxxxxxxxxx", "https://gitlab.example.com")
if err != nil {
    log.Fatal(err)
}

// Verify token health
user, _, err := client.Users.CurrentUser()
if err != nil {
    log.Fatal("Token invalid or expired:", err)
}
fmt.Printf("Authenticated as: %s\n", user.Username)
```

**Python Example:**

```python
import gitlab

# Initialize client with PAT
gl = gitlab.Gitlab('https://gitlab.example.com', private_token='glpat-xxxxxxxxxxxxxxxxxxxx')

# Verify authentication
try:
    user = gl.user
    print(f"Authenticated as: {user.username}")
except gitlab.exceptions.GitlabAuthenticationError as e:
    print(f"Authentication failed: {e}")
```

### Best Practices

1. **Minimum Scopes**: Use the least privileged scope required for the task
   - Read-only operations: `read_api`, `read_repository`
   - Write operations: `api` (full access)
   - Admin operations: `sudo` (use sparingly)

2. **Expiration Policy**:
   - Set explicit expiration dates (max 365 days)
   - Rotate tokens every 90 days minimum
   - **New in GitLab 17.7+**: UI-based rotation without service interruption

3. **Storage Security**:
   - Store in secrets management system (AWS Secrets Manager, HashiCorp Vault)
   - Never commit to source control
   - Use environment variables for local development

4. **Token Health Monitoring**:
   ```go
   func VerifyTokenHealth(client *gitlab.Client) error {
       _, resp, err := client.Users.CurrentUser()
       if err != nil {
           return fmt.Errorf("token invalid: %w", err)
       }
       if resp.StatusCode == 401 {
           return fmt.Errorf("token expired or revoked")
       }
       return nil
   }
   ```

### Rotation Protocol

**GitLab 17.7+ UI Rotation:**

1. Navigate to User Settings → Access Tokens
2. Click "Rotate" next to existing token
3. Copy new token value immediately (shown once)
4. Update secrets management system
5. Old token remains valid for 24-hour grace period
6. Verify new token works before grace period ends

**Programmatic Rotation (API):**

```bash
# Create new token via API
curl --request POST --header "PRIVATE-TOKEN: <old-token>" \
  "https://gitlab.example.com/api/v4/users/self/personal_access_tokens" \
  --data "name=rotated-token-$(date +%Y%m%d)" \
  --data "scopes[]=api" \
  --data "expires_at=2027-01-01"

# Revoke old token after verification
curl --request DELETE --header "PRIVATE-TOKEN: <new-token>" \
  "https://gitlab.example.com/api/v4/users/self/personal_access_tokens/<old-token-id>"
```

## OAuth 2.0 Applications

### Overview

OAuth 2.0 provides user-delegated authorization for third-party applications. Best for user-facing applications requiring access to user resources.

### Authorization Code Flow

**Step 1: Redirect user to GitLab authorization URL**

```
https://gitlab.example.com/oauth/authorize?
  client_id=YOUR_APP_ID&
  redirect_uri=https://yourapp.com/callback&
  response_type=code&
  state=RANDOM_STATE_STRING&
  scope=api+read_user
```

**Step 2: Handle callback with authorization code**

```go
func HandleOAuthCallback(w http.ResponseWriter, r *http.Request) {
    code := r.URL.Query().Get("code")
    state := r.URL.Query().Get("state")

    // Verify state matches (CSRF protection)
    if state != expectedState {
        http.Error(w, "Invalid state parameter", http.StatusBadRequest)
        return
    }

    // Exchange code for access token
    token, err := ExchangeCodeForToken(code)
    if err != nil {
        http.Error(w, "Token exchange failed", http.StatusInternalServerError)
        return
    }

    // Store token securely
    StoreUserToken(r.Context(), token)
}
```

**Step 3: Exchange code for access token**

```bash
curl --request POST "https://gitlab.example.com/oauth/token" \
  --data "client_id=YOUR_APP_ID" \
  --data "client_secret=YOUR_APP_SECRET" \
  --data "code=AUTHORIZATION_CODE" \
  --data "grant_type=authorization_code" \
  --data "redirect_uri=https://yourapp.com/callback"
```

**Response:**

```json
{
  "access_token": "de6780bc506a0446309bd9362820ba8aed28aa506c71eedbe1c5c4f9dd350e54",
  "token_type": "Bearer",
  "expires_in": 7200,
  "refresh_token": "8257e65c97202ed1726cf9571600918f3bffb2544b26e00a61df9897668c33a1",
  "created_at": 1607635748
}
```

### Critical Change: Token Expiration (GitLab 16.0+)

**Breaking Change:** All OAuth 2.0 access tokens expire after 2 hours (7200 seconds).

**Impact:**

- Long-running integrations must implement refresh token flow
- Access tokens cannot be stored indefinitely
- Automatic refresh required for background services

**Refresh Token Flow:**

```go
type TokenResponse struct {
    AccessToken  string `json:"access_token"`
    TokenType    string `json:"token_type"`
    ExpiresIn    int    `json:"expires_in"`
    RefreshToken string `json:"refresh_token"`
    CreatedAt    int64  `json:"created_at"`
}

func RefreshAccessToken(refreshToken string) (*TokenResponse, error) {
    data := url.Values{}
    data.Set("client_id", clientID)
    data.Set("client_secret", clientSecret)
    data.Set("refresh_token", refreshToken)
    data.Set("grant_type", "refresh_token")

    resp, err := http.PostForm("https://gitlab.example.com/oauth/token", data)
    if err != nil {
        return nil, fmt.Errorf("refresh request failed: %w", err)
    }
    defer resp.Body.Close()

    var token TokenResponse
    if err := json.NewDecoder(resp.Body).Decode(&token); err != nil {
        return nil, fmt.Errorf("failed to decode token response: %w", err)
    }

    return &token, nil
}

// Automatic refresh before expiration
func (c *GitLabClient) EnsureValidToken() error {
    expiresAt := time.Unix(c.token.CreatedAt, 0).Add(time.Duration(c.token.ExpiresIn) * time.Second)

    // Refresh 5 minutes before expiration
    if time.Until(expiresAt) < 5*time.Minute {
        newToken, err := RefreshAccessToken(c.token.RefreshToken)
        if err != nil {
            return fmt.Errorf("token refresh failed: %w", err)
        }
        c.token = newToken
        c.SaveToken() // Persist to storage
    }

    return nil
}
```

### Scopes for OAuth

```yaml
api: # Full API access
read_user: # Read user profile
read_api: # Read-only API access
read_repository: # Read repository code
write_repository: # Write to repository
openid: # OpenID Connect authentication
profile: # User profile (OpenID)
email: # User email (OpenID)
```

## Group Access Tokens

### Overview

Group access tokens provide authentication for automation tasks scoped to a specific group and its projects.

### Use Cases

- CI/CD pipelines accessing multiple projects in a group
- Automated reporting across group projects
- Service accounts for group-level operations
- Bot accounts with group-wide permissions

### Creation (UI)

1. Navigate to Group → Settings → Access Tokens
2. Set token name and expiration date
3. Select role: Guest, Reporter, Developer, Maintainer, Owner
4. Select scopes: `api`, `read_api`, `read_registry`, `write_registry`
5. Click "Create group access token"
6. Copy token value immediately (shown once)

### Creation (API)

```bash
curl --request POST --header "PRIVATE-TOKEN: <admin-token>" \
  "https://gitlab.example.com/api/v4/groups/<group-id>/access_tokens" \
  --data "name=group-automation-token" \
  --data "scopes[]=api" \
  --data "access_level=30" \
  --data "expires_at=2027-01-01"
```

### Implementation Pattern

```go
type GroupAutomation struct {
    client    *gitlab.Client
    groupID   int
    token     string
}

func NewGroupAutomation(groupID int, token string) (*GroupAutomation, error) {
    client, err := gitlab.NewClient(token)
    if err != nil {
        return nil, err
    }

    return &GroupAutomation{
        client:  client,
        groupID: groupID,
        token:   token,
    }, nil
}

// List all projects in group
func (ga *GroupAutomation) ListProjects() ([]*gitlab.Project, error) {
    opts := &gitlab.ListGroupProjectsOptions{
        ListOptions: gitlab.ListOptions{PerPage: 100},
    }

    projects, _, err := ga.client.Groups.ListGroupProjects(ga.groupID, opts)
    if err != nil {
        return nil, fmt.Errorf("failed to list group projects: %w", err)
    }

    return projects, nil
}
```

## Project Access Tokens

### Overview

Project access tokens are scoped to a single project, ideal for project-specific CI/CD pipelines and automation.

### Use Cases

- Project-specific deployment automation
- Third-party integrations limited to single project
- Service accounts with project-only access
- Testing and development environments

### Creation Pattern

Similar to group tokens but scoped to project:

```bash
curl --request POST --header "PRIVATE-TOKEN: <your-token>" \
  "https://gitlab.example.com/api/v4/projects/<project-id>/access_tokens" \
  --data "name=project-ci-token" \
  --data "scopes[]=api" \
  --data "access_level=40" \
  --data "expires_at=2027-01-01"
```

## CI/CD Job Tokens

### Overview

Job tokens are automatically generated for each pipeline job, providing secure, time-limited authentication without manual management.

### Characteristics

- **Automatic Generation**: Created by GitLab for each job
- **Job-Scoped**: Access limited to job context and allowed projects
- **Auto-Expiring**: Expires when job completes
- **No Storage Required**: No need to manage or rotate
- **Highest Security**: Least privilege, time-limited

### Usage in .gitlab-ci.yml

```yaml
deploy:
  stage: deploy
  script:
    # CI_JOB_TOKEN automatically available
    - |
      curl --request POST --header "JOB-TOKEN: $CI_JOB_TOKEN" \
        "https://gitlab.example.com/api/v4/projects/$CI_PROJECT_ID/trigger/pipeline"

    # Clone other repositories (if allowed)
    - git clone https://gitlab-ci-token:${CI_JOB_TOKEN}@gitlab.example.com/group/project.git

    # Pull Docker images from GitLab registry
    - docker login -u gitlab-ci-token -p $CI_JOB_TOKEN $CI_REGISTRY
    - docker pull $CI_REGISTRY_IMAGE:latest
```

### Job Token Scope Configuration

**Allow access to specific projects:**

1. Navigate to Project → Settings → CI/CD → Token Access
2. Add allowed projects for cross-project access
3. Configure push/pull permissions

**API Configuration:**

```bash
# Add project to job token scope
curl --request POST --header "PRIVATE-TOKEN: <token>" \
  "https://gitlab.example.com/api/v4/projects/<project-id>/job_token_scope/allowlist" \
  --data "target_project_id=<allowed-project-id>"
```

## Deploy Tokens

### Overview

Deploy tokens provide read-only access to repositories and registries, ideal for deployment automation without write permissions.

### Limitations

- **Read-only**: Cannot push code or create resources
- **No API Access**: Limited to git clone and registry pull
- **No Rotation**: Must manually create new tokens

### Use Cases

- Production deployment pipelines (read-only)
- Docker image pulls from GitLab registry
- Third-party CI/CD systems (Jenkins, CircleCI)
- Public documentation builds

### Creation

```bash
curl --request POST --header "PRIVATE-TOKEN: <token>" \
  "https://gitlab.example.com/api/v4/projects/<project-id>/deploy_tokens" \
  --data "name=production-deploy" \
  --data "scopes[]=read_repository" \
  --data "scopes[]=read_registry" \
  --data "username=deploy-bot" \
  --data "expires_at=2027-01-01"
```

## Authentication Decision Matrix

| Requirement                        | Recommended Method                | Rationale                                     |
| ---------------------------------- | --------------------------------- | --------------------------------------------- |
| Backend API integration            | Personal Access Token             | Stable, long-lived, manageable scopes         |
| User-facing application            | OAuth 2.0                         | User-delegated, secure authorization          |
| Group-wide automation              | Group Access Token                | Centralized management across projects        |
| Single project CI/CD               | Project Access Token or Job Token | Scoped to project, least privilege            |
| Production deployment (read-only)  | Deploy Token                      | Read-only, no write risk                      |
| Pipeline-to-pipeline communication | CI/CD Job Token                   | Automatic, time-limited, highest security     |
| Third-party service integration    | OAuth 2.0 or PAT                  | OAuth for user data, PAT for service accounts |

## Security Considerations

### Token Storage

**DO:**

- Store in secrets management systems (AWS Secrets Manager, HashiCorp Vault, Azure Key Vault)
- Use environment variables for local development
- Encrypt tokens at rest and in transit

**DON'T:**

- Commit tokens to source control
- Store in plain text configuration files
- Share tokens via insecure channels (email, Slack)
- Reuse tokens across environments

### Token Rotation

**Recommended Schedule:**

- **PATs**: Every 90 days
- **Group/Project Tokens**: Every 90 days
- **OAuth Refresh Tokens**: Automatic (2 hours)
- **Deploy Tokens**: Annually or on security incidents

### Monitoring & Auditing

**Track token usage:**

```go
func AuditTokenUsage(client *gitlab.Client, userID int) error {
    events, _, err := client.Events.ListCurrentUserEvents(&gitlab.ListEventsOptions{
        Action: gitlab.String("token_created"),
    })
    if err != nil {
        return err
    }

    for _, event := range events {
        log.Printf("Token created: %s at %s", event.Target.Name, event.CreatedAt)
    }

    return nil
}
```

**Monitor for suspicious activity:**

- Unusual API call patterns (geographic location, time of day)
- High request volumes from single token
- Failed authentication attempts
- Token access to unexpected projects/resources

## Migration Patterns

### From Password Authentication to PAT

**Context:** GitLab discontinued password authentication in August 2021.

**Migration Steps:**

1. Create Personal Access Token with equivalent scopes
2. Update environment variables: `GITLAB_TOKEN` instead of `GITLAB_PASSWORD`
3. Update API client initialization
4. Test authentication with new token
5. Remove password-based credentials

**Before:**

```python
import gitlab
gl = gitlab.Gitlab('https://gitlab.com', email='user@example.com', password='secret')
```

**After:**

```python
import gitlab
gl = gitlab.Gitlab('https://gitlab.com', private_token='glpat-xxxxxxxxxxxxxxxxxxxx')
```

### From OAuth Persistent Tokens to Refresh Flow

**Context:** GitLab 16.0 introduced 2-hour OAuth token expiration.

**Migration Steps:**

1. Store refresh tokens alongside access tokens
2. Implement token refresh logic
3. Add expiration tracking
4. Handle refresh failures gracefully
5. Test automatic refresh before expiration

## Troubleshooting

### Common Issues

**401 Unauthorized:**

- Token expired or revoked
- Insufficient scopes for operation
- Token not sent in correct header format

**403 Forbidden:**

- User lacks permissions for resource
- Project visibility restrictions
- Group/project membership required

**Token Not Working After Rotation:**

- Grace period not expired (old token still valid)
- New token not yet propagated (wait 30 seconds)
- Token not updated in all systems

### Debug Commands

```bash
# Verify token validity
curl --header "PRIVATE-TOKEN: <token>" "https://gitlab.example.com/api/v4/user"

# Check token scopes
curl --header "PRIVATE-TOKEN: <token>" "https://gitlab.example.com/api/v4/personal_access_tokens/self"

# Test OAuth token
curl --header "Authorization: Bearer <oauth-token>" "https://gitlab.example.com/api/v4/user"
```

## References

- [GitLab Personal Access Tokens Documentation](https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html)
- [GitLab OAuth 2.0 Provider](https://docs.gitlab.com/ee/api/oauth2.html)
- [GitLab Group Access Tokens](https://docs.gitlab.com/ee/user/group/settings/group_access_tokens.html)
- [GitLab Project Access Tokens](https://docs.gitlab.com/ee/user/project/settings/project_access_tokens.html)
- [GitLab CI/CD Job Tokens](https://docs.gitlab.com/ee/ci/jobs/ci_job_token.html)
- [GitLab Deploy Tokens](https://docs.gitlab.com/ee/user/project/deploy_tokens/)
