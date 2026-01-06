# GitLab Token Management

**Complete lifecycle management for GitLab authentication tokens including creation, rotation, storage, and revocation.**

## Token Lifecycle Overview

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Creation │ -> │  Storage │ -> │ Rotation │ -> │ Monitoring│ -> │Revocation│
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
     |               |               |               |               |
  Generate      Encrypt &      Every 90       Track usage     Remove on
  w/ scopes     store in        days or      & anomalies      compromise
               secrets mgmt   on compromise                   or expiration
```

## Token Types & Rotation Schedule

| Token Type            | Rotation Frequency | Auto-Expires       | Manual Revocation | Storage Location   |
| --------------------- | ------------------ | ------------------ | ----------------- | ------------------ |
| Personal Access Token | 90 days            | Yes (365 days max) | Yes               | Secrets Manager    |
| OAuth Access Token    | Automatic          | Yes (2 hours)      | Via refresh       | Encrypted DB       |
| OAuth Refresh Token   | On use             | No                 | Yes               | Encrypted DB       |
| Group Access Token    | 90 days            | Configurable       | Yes               | Secrets Manager    |
| Project Access Token  | 90 days            | Configurable       | Yes               | Secrets Manager    |
| CI/CD Job Token       | Automatic          | Yes (per-job)      | N/A (auto)        | GitLab managed     |
| Runner Auth Token     | 90 days            | No                 | Yes               | Runner config.toml |

## Creation Best Practices

### Principle of Least Privilege

**Always create tokens with minimum required scopes:**

```yaml
# For read-only operations
scopes: [read_api, read_repository]

# For CI/CD automation
scopes: [api, write_repository]

# For admin operations (use sparingly)
scopes: [api, sudo]
```

### Naming Convention

Use descriptive, identifiable names:

```
Format: <service>-<environment>-<purpose>-<date>

Examples:
- chariot-prod-api-integration-20260104
- backend-dev-testing-20260104
- ci-pipeline-staging-20260104
```

### Expiration Policy

**Recommended Maximum Lifetimes:**

- Production tokens: 90 days
- Staging tokens: 180 days
- Development tokens: 365 days
- Emergency/incident tokens: 7 days

**Setting expiration via API:**

```bash
curl --request POST --header "PRIVATE-TOKEN: <token>" \
  "https://gitlab.example.com/api/v4/users/self/personal_access_tokens" \
  --data "name=chariot-prod-api-20260104" \
  --data "scopes[]=api" \
  --data "expires_at=2026-04-04"  # 90 days from creation
```

## Secure Storage

### AWS Secrets Manager (Recommended for Chariot)

**Store token:**

```bash
aws secretsmanager create-secret \
  --name gitlab/chariot-prod-api-token \
  --description "GitLab API token for Chariot production" \
  --secret-string '{
    "token": "glpat-xxxxxxxxxxxxxxxxxxxx",
    "scopes": ["api"],
    "created_at": "2026-01-04T20:00:00Z",
    "expires_at": "2026-04-04T20:00:00Z",
    "gitlab_url": "https://gitlab.example.com"
  }'
```

**Retrieve token:**

```go
import (
    "context"
    "encoding/json"
    "github.com/aws/aws-sdk-go-v2/service/secretsmanager"
)

type GitLabToken struct {
    Token      string `json:"token"`
    Scopes     []string `json:"scopes"`
    CreatedAt  string `json:"created_at"`
    ExpiresAt  string `json:"expires_at"`
    GitLabURL  string `json:"gitlab_url"`
}

func GetGitLabToken(ctx context.Context, secretName string) (*GitLabToken, error) {
    svc := secretsmanager.NewFromConfig(awsConfig)

    result, err := svc.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{
        SecretId: aws.String(secretName),
    })
    if err != nil {
        return nil, fmt.Errorf("failed to get secret: %w", err)
    }

    var token GitLabToken
    if err := json.Unmarshal([]byte(*result.SecretString), &token); err != nil {
        return nil, fmt.Errorf("failed to parse token: %w", err)
    }

    return &token, nil
}
```

### HashiCorp Vault

**Store token:**

```bash
vault kv put secret/gitlab/chariot-prod-api \
  token="glpat-xxxxxxxxxxxxxxxxxxxx" \
  scopes="api" \
  expires_at="2026-04-04T20:00:00Z"
```

**Retrieve token:**

```go
import "github.com/hashicorp/vault/api"

func GetTokenFromVault(path string) (string, error) {
    client, err := api.NewClient(api.DefaultConfig())
    if err != nil {
        return "", err
    }

    secret, err := client.Logical().Read(path)
    if err != nil {
        return "", err
    }

    token := secret.Data["token"].(string)
    return token, nil
}
```

### Environment Variables (Development Only)

```bash
# .env file (NEVER commit to git)
GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
GITLAB_URL=https://gitlab.example.com

# Load in application
export $(cat .env | xargs)
```

## Token Rotation

### GitLab 17.7+ UI Rotation (Zero-Downtime)

**Process:**

1. Navigate to User Settings → Access Tokens
2. Click "Rotate" button next to token
3. GitLab generates new token with same scopes/expiration
4. Copy new token value (shown once)
5. Update secrets management system
6. **Grace Period:** Old token remains valid for 24 hours
7. Verify new token works before grace period ends
8. Old token auto-revokes after 24 hours

**Implementation:**

```go
func RotateGitLabToken(ctx context.Context, secretName string, newToken string) error {
    // Step 1: Retrieve current token metadata
    oldToken, err := GetGitLabToken(ctx, secretName)
    if err != nil {
        return fmt.Errorf("failed to get current token: %w", err)
    }

    // Step 2: Update with new token value (preserve metadata)
    newTokenData := GitLabToken{
        Token:      newToken,  // New rotated token
        Scopes:     oldToken.Scopes,
        CreatedAt:  time.Now().Format(time.RFC3339),
        ExpiresAt:  oldToken.ExpiresAt,  // Preserve expiration
        GitLabURL:  oldToken.GitLabURL,
    }

    // Step 3: Store new token in secrets manager
    jsonData, err := json.Marshal(newTokenData)
    if err != nil {
        return fmt.Errorf("failed to marshal token: %w", err)
    }

    _, err = secretsManagerClient.UpdateSecret(ctx, &secretsmanager.UpdateSecretInput{
        SecretId:     aws.String(secretName),
        SecretString: aws.String(string(jsonData)),
    })
    if err != nil {
        return fmt.Errorf("failed to update secret: %w", err)
    }

    // Step 4: Verify new token works
    if err := VerifyTokenHealth(newToken); err != nil {
        return fmt.Errorf("new token verification failed: %w", err)
    }

    log.Printf("Token rotation successful. Old token valid for 24h grace period.")
    return nil
}
```

### Programmatic Rotation (API Method)

**For automated rotation before expiration:**

```go
func AutoRotateToken(ctx context.Context, currentToken string, tokenID int) (string, error) {
    // Step 1: Create new token with same scopes
    newTokenReq := &gitlab.CreatePersonalAccessTokenOptions{
        Name:      gitlab.String(fmt.Sprintf("auto-rotated-%d", time.Now().Unix())),
        Scopes:    &[]string{"api"},
        ExpiresAt: gitlab.ISOTime(time.Now().Add(90 * 24 * time.Hour)),
    }

    newToken, _, err := client.Users.CreatePersonalAccessToken(userID, newTokenReq)
    if err != nil {
        return "", fmt.Errorf("failed to create new token: %w", err)
    }

    // Step 2: Verify new token works
    testClient, err := gitlab.NewClient(newToken.Token)
    if err != nil {
        return "", fmt.Errorf("failed to create test client: %w", err)
    }

    _, _, err = testClient.Users.CurrentUser()
    if err != nil {
        return "", fmt.Errorf("new token verification failed: %w", err)
    }

    // Step 3: Revoke old token (only after verification succeeds)
    _, err = client.Users.RevokePersonalAccessToken(tokenID)
    if err != nil {
        log.Printf("Warning: Failed to revoke old token %d: %v", tokenID, err)
        // Don't fail - new token works, old token will expire naturally
    }

    return newToken.Token, nil
}
```

### Rotation Triggers

**Scheduled Rotation:**

- Every 90 days automatically via cron job
- 7 days before expiration (warning alert)
- 1 day before expiration (critical alert)

**Incident-Driven Rotation:**

- Security incident or breach
- Token exposed in logs/commits
- Employee offboarding
- Third-party compromise
- Suspicious activity detected

## Token Health Monitoring

### Health Check Implementation

```go
type TokenHealth struct {
    Valid        bool
    ExpiresAt    time.Time
    DaysUntilExp int
    Scopes       []string
    LastUsed     time.Time
    UsageCount   int
}

func CheckTokenHealth(token string) (*TokenHealth, error) {
    client, err := gitlab.NewClient(token)
    if err != nil {
        return &TokenHealth{Valid: false}, err
    }

    // Verify token works
    user, resp, err := client.Users.CurrentUser()
    if err != nil || resp.StatusCode != 200 {
        return &TokenHealth{Valid: false}, err
    }

    // Get token details
    tokenInfo, _, err := client.PersonalAccessTokens.GetSinglePersonalAccessToken()
    if err != nil {
        return &TokenHealth{Valid: false}, err
    }

    expiresAt := tokenInfo.ExpiresAt.Time
    daysUntil := int(time.Until(expiresAt).Hours() / 24)

    return &TokenHealth{
        Valid:        true,
        ExpiresAt:    expiresAt,
        DaysUntilExp: daysUntil,
        Scopes:       tokenInfo.Scopes,
        LastUsed:     tokenInfo.LastUsedAt.Time,
    }, nil
}

// Scheduled health check (daily)
func ScheduleTokenHealthChecks(ctx context.Context) {
    ticker := time.NewTicker(24 * time.Hour)
    defer ticker.Stop()

    for {
        select {
        case <-ticker.C:
            secrets, err := ListAllGitLabTokens(ctx)
            if err != nil {
                log.Printf("Failed to list secrets: %v", err)
                continue
            }

            for _, secretName := range secrets {
                health, err := CheckTokenHealthBySecret(ctx, secretName)
                if err != nil {
                    log.Printf("Health check failed for %s: %v", secretName, err)
                    continue
                }

                if health.DaysUntilExp < 7 {
                    AlertTokenExpiration(secretName, health.DaysUntilExp)
                }

                if !health.Valid {
                    AlertTokenInvalid(secretName)
                }
            }
        case <-ctx.Done():
            return
        }
    }
}
```

### Monitoring Metrics

**Key metrics to track:**

- Token expiration dates
- Days until expiration
- Token usage frequency
- API call patterns (volume, endpoints, geographic location)
- Failed authentication attempts
- Scope usage (are all granted scopes being used?)

**Alerting thresholds:**

```yaml
Critical:
  - Token expires in < 1 day
  - Token authentication failed
  - Token used from unexpected location
  - Unusual API call volume (>3x average)

Warning:
  - Token expires in < 7 days
  - Token unused for > 30 days
  - Excessive failed requests from token
  - Scope over-permissioned (granted but never used)
```

## Token Revocation

### Immediate Revocation (Security Incident)

**Via UI:**

1. Navigate to User Settings → Access Tokens
2. Click "Revoke" button
3. Confirm revocation
4. Token immediately invalid (no grace period)

**Via API:**

```bash
# Revoke Personal Access Token
curl --request DELETE --header "PRIVATE-TOKEN: <admin-token>" \
  "https://gitlab.example.com/api/v4/users/<user-id>/personal_access_tokens/<token-id>"

# Revoke all tokens for user (emergency)
curl --request DELETE --header "PRIVATE-TOKEN: <admin-token>" \
  "https://gitlab.example.com/api/v4/users/<user-id>/personal_access_tokens"
```

**Programmatic revocation:**

```go
func RevokeTokenOnIncident(ctx context.Context, tokenID int, reason string) error {
    // Step 1: Revoke token via GitLab API
    _, err := client.Users.RevokePersonalAccessToken(tokenID)
    if err != nil {
        return fmt.Errorf("failed to revoke token: %w", err)
    }

    // Step 2: Remove from secrets manager
    secretName := fmt.Sprintf("gitlab/token-%d", tokenID)
    _, err = secretsManagerClient.DeleteSecret(ctx, &secretsmanager.DeleteSecretInput{
        SecretId:                   aws.String(secretName),
        ForceDeleteWithoutRecovery: aws.Bool(true),  // Immediate deletion
    })
    if err != nil {
        log.Printf("Warning: Failed to delete secret %s: %v", secretName, err)
    }

    // Step 3: Log incident
    LogSecurityIncident(ctx, SecurityIncident{
        Type:      "token_revocation",
        Reason:    reason,
        TokenID:   tokenID,
        Timestamp: time.Now(),
    })

    // Step 4: Alert security team
    AlertSecurityTeam(fmt.Sprintf("GitLab token %d revoked due to: %s", tokenID, reason))

    return nil
}
```

### Bulk Revocation (Employee Offboarding)

```go
func RevokeAllUserTokens(userID int) error {
    // List all tokens for user
    tokens, _, err := client.Users.ListPersonalAccessTokens(userID, nil)
    if err != nil {
        return fmt.Errorf("failed to list tokens: %w", err)
    }

    // Revoke each token
    var errs []error
    for _, token := range tokens {
        _, err := client.Users.RevokePersonalAccessToken(token.ID)
        if err != nil {
            errs = append(errs, fmt.Errorf("failed to revoke token %d: %w", token.ID, err))
        }
    }

    if len(errs) > 0 {
        return fmt.Errorf("revocation errors: %v", errs)
    }

    return nil
}
```

## Audit Logging

### Track Token Operations

```go
type TokenAuditLog struct {
    Operation   string    // create, rotate, revoke, access
    TokenID     int
    TokenName   string
    UserID      int
    Timestamp   time.Time
    IPAddress   string
    UserAgent   string
    Result      string    // success, failure
    Reason      string    // optional
}

func LogTokenOperation(log TokenAuditLog) error {
    // Write to audit database
    _, err := db.Exec(`
        INSERT INTO token_audit_logs
        (operation, token_id, token_name, user_id, timestamp, ip_address, user_agent, result, reason)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, log.Operation, log.TokenID, log.TokenName, log.UserID, log.Timestamp,
       log.IPAddress, log.UserAgent, log.Result, log.Reason)

    return err
}

// Query audit logs
func GetTokenAuditHistory(tokenID int) ([]TokenAuditLog, error) {
    rows, err := db.Query(`
        SELECT operation, token_id, token_name, user_id, timestamp, ip_address, user_agent, result, reason
        FROM token_audit_logs
        WHERE token_id = $1
        ORDER BY timestamp DESC
    `, tokenID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var logs []TokenAuditLog
    for rows.Next() {
        var log TokenAuditLog
        err := rows.Scan(&log.Operation, &log.TokenID, &log.TokenName, &log.UserID,
            &log.Timestamp, &log.IPAddress, &log.UserAgent, &log.Result, &log.Reason)
        if err != nil {
            return nil, err
        }
        logs = append(logs, log)
    }

    return logs, nil
}
```

## Troubleshooting

### Token Not Working After Creation

**Possible causes:**

1. Token not yet propagated (wait 30 seconds)
2. Incorrect scopes selected
3. Stored token value truncated/corrupted
4. GitLab API temporarily unavailable

**Debug:**

```bash
# Test token directly
curl --header "PRIVATE-TOKEN: glpat-xxxxxxxxxxxxxxxxxxxx" \
  "https://gitlab.example.com/api/v4/user"

# Expected 200 response with user info
# If 401: Token invalid or expired
# If 403: Insufficient scopes
```

### Token Expired Unexpectedly

**Check expiration:**

```bash
curl --header "PRIVATE-TOKEN: <working-admin-token>" \
  "https://gitlab.example.com/api/v4/personal_access_tokens/<token-id>"
```

**Response shows expiration date:**

```json
{
  "id": 123,
  "name": "my-token",
  "expires_at": "2026-01-04",
  "active": false,
  "revoked": false
}
```

### Rotation Failed Mid-Process

**Recovery:**

1. Check if old token still valid (24-hour grace period)
2. If yes: Complete rotation with new token
3. If no: Create emergency token manually
4. Update secrets manager with emergency token
5. Investigate rotation failure root cause

## References

- [GitLab Token Security](https://docs.gitlab.com/ee/security/token_overview.html)
- [Personal Access Tokens API](https://docs.gitlab.com/ee/api/personal_access_tokens.html)
- [Token Rotation Best Practices](https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html#token-activity)
