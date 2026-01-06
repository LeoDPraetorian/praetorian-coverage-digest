# Authentication Methods for Bitbucket API

**Complete guide to Bitbucket Cloud authentication in 2026 and beyond.**

---

## 🚨 CRITICAL: App Password Deprecation

**End-of-Life Date: June 9, 2026**

All integrations using App Passwords **must migrate** to API Tokens or OAuth 2.0 before June 9, 2026. After this date, App Password authentication will fail completely.

**Migration Timeline:**

- **Now - March 2026**: Plan migration, audit existing integrations
- **March - May 2026**: Execute migration, test thoroughly
- **June 9, 2026**: App Passwords stop working

**Source:** [Bitbucket Cloud transitions to API tokens](https://www.atlassian.com/blog/bitbucket/bitbucket-cloud-transitions-to-api-tokens-enhancing-security-with-app-password-deprecation)

---

## Authentication Method Comparison

| Method                | Use Case                       | Security                             | Token Lifecycle            | Status                     |
| --------------------- | ------------------------------ | ------------------------------------ | -------------------------- | -------------------------- |
| **API Tokens**        | CI/CD, automation, scripting   | ✅ Scoped permissions, expirable     | User-controlled expiration | **Recommended**            |
| **OAuth 2.0**         | User-facing apps, integrations | ✅ Short-lived (2hr), refresh tokens | Automatic refresh          | **Recommended**            |
| Personal Access Token | Development, testing           | ⚠️ Long-lived, manual rotation       | No expiration by default   | Supported                  |
| App Passwords         | Legacy                         | ❌ No granular scopes                | No expiration              | **Deprecated Jun 9, 2026** |

---

## API Tokens (Recommended for Automation)

### Creation

1. Navigate to Bitbucket Account Settings
2. Select "API tokens"
3. Click "Create token"
4. **Define scopes** (cannot be changed later):
   - `repository:read` - Read repository data
   - `repository:write` - Modify repositories
   - `pullrequest:read` - Read pull requests
   - `pullrequest:write` - Create/update pull requests
   - `webhook` - Manage webhooks
   - And more...
5. **Set expiration** (recommended: 90 days for automated systems)
6. Copy token (shown only once)

### Usage Patterns

**Method 1: Basic Authentication (Recommended)**

```bash
curl --user 'user@example.com:api_token_here' \
  https://api.bitbucket.org/2.0/repositories/workspace
```

**Method 2: Authorization Header**

```bash
# Base64 encode credentials
echo -n 'user@example.com:api_token_here' | base64

# Use in header
curl --header "Authorization: Basic <base64_result>" \
  https://api.bitbucket.org/2.0/repositories/workspace
```

**Method 3: Git Operations (Interactive)**

```bash
git clone https://username@bitbucket.org/workspace/repo.git
# When prompted for password, enter API token
```

**Method 4: Git Operations (Non-Interactive)**

```bash
# Use special username to avoid password prompt
git clone https://x-bitbucket-api-token-auth@bitbucket.org/workspace/repo.git
# When prompted, enter API token

# OR embed in URL (less secure, use only with secret management)
git clone https://username:api_token@bitbucket.org/workspace/repo.git
```

### Go Implementation

```go
package main

import (
    "encoding/base64"
    "fmt"
    "net/http"
)

type BitbucketClient struct {
    Email    string
    APIToken string
    BaseURL  string
    Client   *http.Client
}

func NewBitbucketClient(email, apiToken string) *BitbucketClient {
    return &BitbucketClient{
        Email:    email,
        APIToken: apiToken,
        BaseURL:  "https://api.bitbucket.org/2.0",
        Client:   &http.Client{Timeout: 30 * time.Second},
    }
}

func (c *BitbucketClient) makeRequest(method, path string) (*http.Response, error) {
    req, err := http.NewRequest(method, c.BaseURL+path, nil)
    if err != nil {
        return nil, err
    }

    // Method 1: Basic auth (recommended)
    req.SetBasicAuth(c.Email, c.APIToken)

    // OR Method 2: Authorization header
    // auth := base64.StdEncoding.EncodeToString([]byte(c.Email + ":" + c.APIToken))
    // req.Header.Set("Authorization", "Basic "+auth)

    return c.Client.Do(req)
}
```

### Python Implementation

```python
import requests
from requests.auth import HTTPBasicAuth
import base64

class BitbucketClient:
    def __init__(self, email, api_token):
        self.email = email
        self.api_token = api_token
        self.base_url = "https://api.bitbucket.org/2.0"
        self.session = requests.Session()
        self.session.timeout = 30

    def make_request(self, method, path):
        url = self.base_url + path

        # Method 1: Basic auth (recommended)
        response = self.session.request(
            method,
            url,
            auth=HTTPBasicAuth(self.email, self.api_token)
        )

        # OR Method 2: Authorization header
        # auth_str = f"{self.email}:{self.api_token}"
        # auth_bytes = base64.b64encode(auth_str.encode())
        # headers = {"Authorization": f"Basic {auth_bytes.decode()}"}
        # response = self.session.request(method, url, headers=headers)

        return response
```

### Security Best Practices

1. **Never embed tokens in code or URLs**
   - Use environment variables: `BITBUCKET_API_TOKEN`
   - Use secret management (AWS Secrets Manager, HashiCorp Vault)
   - For git operations, use interactive prompts when possible

2. **Apply principle of least privilege**
   - Only grant required scopes
   - Use separate tokens for different integrations
   - Review token permissions quarterly

3. **Implement token rotation**
   - Rotate tokens every 90 days
   - Automate rotation for production systems
   - Keep rotation history in audit logs

4. **Revoke tokens immediately if compromised**
   - Monitor for unusual API usage patterns
   - Set up alerts for token usage from unexpected IPs
   - Have incident response plan for token leaks

5. **Use short expiration periods**
   - 90 days for automated systems
   - 30 days for development/testing
   - No expiration only for highly secure environments

**Source:** [Using API tokens | Bitbucket Cloud](https://support.atlassian.com/bitbucket-cloud/docs/using-api-tokens/)

---

## OAuth 2.0 (Recommended for User-Facing Apps)

### Supported Grant Flows

1. **Authorization Code Grant** (3-legged OAuth)
   - For server-side applications with backend
   - Most secure, uses authorization code + secret
   - Supports refresh tokens

2. **Implicit Grant** (browser-based)
   - For single-page applications (SPAs)
   - No backend required
   - Less secure, no refresh tokens

3. **JWT Token Exchange** (custom Bitbucket flow)
   - Exchange JWT for access token
   - For service-to-service authentication

4. **Refresh Token Flow**
   - Renew access tokens without user interaction
   - Access tokens expire in 2 hours

**Note:** Resource Owner Password Credentials Grant is **NOT SUPPORTED**.

### OAuth Endpoints

| Endpoint                                         | Purpose                               |
| ------------------------------------------------ | ------------------------------------- |
| `https://bitbucket.org/site/oauth2/authorize`    | User authorization (browser redirect) |
| `https://bitbucket.org/site/oauth2/access_token` | Token acquisition and refresh         |

### Authorization Code Grant (Step-by-Step)

**Step 1: Register OAuth Consumer**

1. Navigate to Bitbucket workspace settings
2. Select "OAuth consumers"
3. Create consumer with:
   - Callback URL (e.g., `https://yourapp.com/oauth/callback`)
   - Permissions/scopes
4. Note `client_id` and `client_secret`

**Step 2: Redirect User to Authorization URL**

```
https://bitbucket.org/site/oauth2/authorize
  ?client_id=YOUR_CLIENT_ID
  &response_type=code
  &state=RANDOM_STATE_STRING  // CSRF protection
  &redirect_uri=https://yourapp.com/oauth/callback
```

**Step 3: Handle Callback with Authorization Code**

```
https://yourapp.com/oauth/callback?code=AUTHORIZATION_CODE&state=RANDOM_STATE_STRING
```

**Step 4: Exchange Code for Access Token**

```bash
curl -X POST https://bitbucket.org/site/oauth2/access_token \
  -u 'CLIENT_ID:CLIENT_SECRET' \
  -d 'grant_type=authorization_code' \
  -d 'code=AUTHORIZATION_CODE'
```

**Response:**

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 7200, // 2 hours
  "token_type": "bearer",
  "scopes": "repository pullrequest"
}
```

**Step 5: Use Access Token in API Requests**

```bash
curl --header "Authorization: Bearer ACCESS_TOKEN" \
  https://api.bitbucket.org/2.0/user
```

**Step 6: Refresh Token Before Expiration**

```bash
curl -X POST https://bitbucket.org/site/oauth2/access_token \
  -u 'CLIENT_ID:CLIENT_SECRET' \
  -d 'grant_type=refresh_token' \
  -d 'refresh_token=REFRESH_TOKEN'
```

### Go OAuth Implementation

```go
package main

import (
    "context"
    "golang.org/x/oauth2"
)

func NewOAuthConfig(clientID, clientSecret, redirectURL string) *oauth2.Config {
    return &oauth2.Config{
        ClientID:     clientID,
        ClientSecret: clientSecret,
        RedirectURL:  redirectURL,
        Scopes:       []string{"repository", "pullrequest"},
        Endpoint: oauth2.Endpoint{
            AuthURL:  "https://bitbucket.org/site/oauth2/authorize",
            TokenURL: "https://bitbucket.org/site/oauth2/access_token",
        },
    }
}

func (c *BitbucketOAuthClient) GetAuthorizationURL(state string) string {
    return c.config.AuthCodeURL(state)
}

func (c *BitbucketOAuthClient) ExchangeCode(ctx context.Context, code string) (*oauth2.Token, error) {
    return c.config.Exchange(ctx, code)
}

func (c *BitbucketOAuthClient) RefreshToken(ctx context.Context, token *oauth2.Token) (*oauth2.Token, error) {
    return c.config.TokenSource(ctx, token).Token()
}
```

### Python OAuth Implementation

```python
from requests_oauthlib import OAuth2Session
from oauthlib.oauth2 import BackendApplicationClient

class BitbucketOAuth:
    AUTH_URL = "https://bitbucket.org/site/oauth2/authorize"
    TOKEN_URL = "https://bitbucket.org/site/oauth2/access_token"

    def __init__(self, client_id, client_secret, redirect_uri):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri

    def get_authorization_url(self, state):
        oauth = OAuth2Session(
            client_id=self.client_id,
            redirect_uri=self.redirect_uri,
            scope=['repository', 'pullrequest']
        )
        authorization_url, state = oauth.authorization_url(self.AUTH_URL, state=state)
        return authorization_url

    def exchange_code(self, authorization_response):
        oauth = OAuth2Session(
            client_id=self.client_id,
            redirect_uri=self.redirect_uri
        )
        token = oauth.fetch_token(
            self.TOKEN_URL,
            authorization_response=authorization_response,
            client_secret=self.client_secret
        )
        return token

    def refresh_token(self, refresh_token):
        extra = {
            'client_id': self.client_id,
            'client_secret': self.client_secret,
        }
        oauth = OAuth2Session(client_id=self.client_id)
        token = oauth.refresh_token(
            self.TOKEN_URL,
            refresh_token=refresh_token,
            **extra
        )
        return token
```

**Source:** [Use OAuth on Bitbucket Cloud](https://support.atlassian.com/bitbucket-cloud/docs/use-oauth-on-bitbucket-cloud/)

---

## Migration Guide: App Passwords → API Tokens

### Step 1: Audit Current Usage

```bash
# Find all App Password references in your codebase
grep -r "BITBUCKET_APP_PASSWORD" .
grep -r "app_password" .
git log --all --source --full-history -S 'app_password'
```

### Step 2: Create API Tokens

For each integration:

1. Determine required scopes (least privilege)
2. Create API token with those scopes
3. Set expiration (90 days recommended)
4. Store in environment variable or secret manager

### Step 3: Update Code

**Before (App Password):**

```python
requests.get(
    'https://api.bitbucket.org/2.0/repositories/workspace',
    auth=('username', os.environ['BITBUCKET_APP_PASSWORD'])
)
```

**After (API Token):**

```python
requests.get(
    'https://api.bitbucket.org/2.0/repositories/workspace',
    auth=('user@example.com', os.environ['BITBUCKET_API_TOKEN'])
)
```

### Step 4: Test Thoroughly

- Unit tests with mocked API calls
- Integration tests against Bitbucket test workspace
- Verify all operations work (read, write, webhooks)
- Check error handling for 401/403 responses

### Step 5: Deploy with Rollback Plan

- Deploy to staging first
- Monitor for authentication errors
- Keep App Password credentials available for 30 days
- Rollback procedure documented

### Step 6: Clean Up

- Remove App Password references from code
- Delete App Passwords from Bitbucket settings
- Update documentation
- Train team on API Token usage

---

## Troubleshooting

### Error: 401 Unauthorized

**Causes:**

- Invalid API token or OAuth token
- Expired OAuth access token
- Incorrect email address (API tokens)
- Token lacks required scopes

**Solutions:**

1. Verify token is correct (check for extra whitespace)
2. Refresh OAuth token if expired (2-hour lifetime)
3. Ensure email matches Bitbucket account
4. Check token scopes match operation requirements

### Error: 403 Forbidden

**Causes:**

- Token lacks required permissions/scopes
- User doesn't have workspace access
- Repository permissions insufficient

**Solutions:**

1. Recreate token with required scopes
2. Request workspace admin to grant access
3. Check repository-level permissions

### OAuth Error: invalid_grant

**Causes:**

- Authorization code already used
- Authorization code expired (10-minute lifetime)
- Refresh token revoked or expired

**Solutions:**

1. Generate new authorization code (restart OAuth flow)
2. Use authorization code within 10 minutes
3. Implement proper refresh token storage

---

## Related Documentation

- [Using App passwords (Legacy)](https://support.atlassian.com/bitbucket-cloud/docs/using-app-passwords/) - Deprecated June 9, 2026
- [Migration from App Passwords to API Tokens](https://docs.tokens.studio/token-storage/remote/sync-git-bitbucket/migration-from-app-passwords-to-api-tokens)
- [AWS CodeBuild - Bitbucket app password or access token](https://docs.aws.amazon.com/codebuild/latest/userguide/access-tokens-bitbucket.html)
