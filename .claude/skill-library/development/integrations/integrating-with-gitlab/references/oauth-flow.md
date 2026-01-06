# OAuth 2.0 Flow for GitLab

## Critical Change: Token Expiration (GitLab 16.0+)

**Breaking Change:** All OAuth 2.0 access tokens expire after **2 hours** (7200 seconds).

**Impact:**

- Long-running integrations MUST implement refresh token flow
- Access tokens cannot be stored indefinitely
- Automatic refresh required for background services

## Authorization Code Flow (Standard)

### Step 1: Redirect User to GitLab

```
https://gitlab.example.com/oauth/authorize?
  client_id=YOUR_APP_ID&
  redirect_uri=https://yourapp.com/callback&
  response_type=code&
  state=RANDOM_STATE_STRING&
  scope=api+read_user
```

### Step 2: Exchange Code for Token

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
  "access_token": "de6780bc506a...",
  "token_type": "Bearer",
  "expires_in": 7200,
  "refresh_token": "8257e65c9720...",
  "created_at": 1607635748
}
```

### Step 3: Implement Refresh Flow

```go
func RefreshAccessToken(refreshToken string) (*TokenResponse, error) {
    data := url.Values{}
    data.Set("client_id", clientID)
    data.Set("client_secret", clientSecret)
    data.Set("refresh_token", refreshToken)
    data.Set("grant_type", "refresh_token")

    resp, err := http.PostForm("https://gitlab.example.com/oauth/token", data)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var token TokenResponse
    json.NewDecoder(resp.Body).Decode(&token)
    return &token, nil
}
```

## Available Scopes

```yaml
api: # Full API access
read_user: # Read user profile
read_api: # Read-only API access
read_repository: # Read repository code
write_repository: # Write to repository
openid: # OpenID Connect
profile: # User profile (OIDC)
email: # User email (OIDC)
```

## Automatic Token Refresh Pattern

```go
type OAuthClient struct {
    token      *TokenResponse
    httpClient *http.Client
    mu         sync.RWMutex
}

func (c *OAuthClient) EnsureValidToken(ctx context.Context) error {
    c.mu.Lock()
    defer c.mu.Unlock()

    expiresAt := time.Unix(c.token.CreatedAt, 0).
        Add(time.Duration(c.token.ExpiresIn) * time.Second)

    // Refresh 5 minutes before expiration
    if time.Until(expiresAt) < 5*time.Minute {
        newToken, err := RefreshAccessToken(c.token.RefreshToken)
        if err != nil {
            return fmt.Errorf("token refresh failed: %w", err)
        }
        c.token = newToken
        c.SaveToken(ctx) // Persist to storage
    }

    return nil
}
```

## Security Best Practices

1. **Always validate state parameter** (CSRF protection)
2. **Use HTTPS** for redirect URIs
3. **Store refresh tokens securely** (encrypted at rest)
4. **Implement token refresh** before expiration
5. **Handle refresh failures** gracefully (re-authorize)

For comprehensive OAuth 2.0 patterns, see:
`.claude/.output/research/2026-01-04-205433-gitlab-integration-security/SYNTHESIS.md` (Section 1.1)
