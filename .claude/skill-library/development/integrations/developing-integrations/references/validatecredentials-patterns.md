# ValidateCredentials Best Practices

Validated patterns from production integrations for credential validation.

## Core Principles

1. **Validate before processing** - Always call in `Invoke()` before doing work
2. **Make real API calls** - Don't just check if fields are non-empty
3. **Test specific permissions** - Verify the credentials have required access
4. **Return descriptive errors** - Help users diagnose authentication issues

---

## Pattern 1: API Call + Status Code Handling

**Used by**: GitHub, GitLab, Bitbucket
**Source**: `github/github.go:73-107`

### Use Case

- REST APIs with clear success/failure status codes
- Need to distinguish between auth failure vs not found
- Simple token-based authentication

### Implementation

```go
func (task *Github) ValidateCredentials() error {
    // 1. Extract credentials
    token, err := githublib.Token(task.Job)
    if err != nil {
        return err
    }

    // 2. Validate required fields
    orgName := githublib.OrgOrUserName(task.Job.Secret["value"])
    if orgName == "" {
        return fmt.Errorf("invalid organization name format")
    }

    // 3. Initialize client with credentials
    task.client = github.NewClient(base).WithAuthToken(token)

    // 4. Make test API call
    _, resp, err := task.client.Organizations.Get(context.Background(), task.name)
    if err != nil {
        // 5. Handle specific status codes
        if resp != nil && resp.StatusCode == 404 {
            return fmt.Errorf("organization '%s' not found", task.name)
        }
        return fmt.Errorf("authentication failed")
    }

    return nil
}
```

### Key Points

- Distinguishes between "org not found" (404) and "auth failed" (401/403)
- Tests both credentials AND resource access
- Returns user-friendly error messages
- Lightweight test (GET single resource)

---

## Pattern 2: Multiple Permission Tests

**Used by**: Cloudflare, Okta
**Source**: `cloudflare/cloudflare.go:62-94`

### Use Case

- Integration needs multiple API permissions
- Want to fail fast if any permission missing
- Credentials might be scoped to subset of resources

### Implementation

```go
func (task *Cloudflare) ValidateCredentials() error {
    // 1. Initialize client with token
    task.Client = cloudflare.Client{Token: task.Job.Secret["token"]}

    // 2. Test basic read permission
    zones, err := task.Client.GetZones()
    if err != nil {
        return fmt.Errorf("failed to validate API token: %w", err)
    }

    // 3. Verify at least one resource accessible
    if len(zones) == 0 {
        return fmt.Errorf("no Zones configured for this token")
    }

    // 4. Test specific permission on a resource
    _, err = task.Client.GetZoneDNSRecords(zones[0].ID)
    if err != nil {
        return fmt.Errorf("failed to validate Zone permissions: %w", err)
    }

    return nil
}
```

### Key Points

- Tests multiple API endpoints
- Verifies scope (zones accessible)
- Tests specific permission (DNS record access)
- Fails with specific permission error

---

## Pattern 3: OAuth2 Flow Validation

**Used by**: Wiz, PingOne, Okta
**Source**: `wiz/wiz.go:140-205`

### Use Case

- OAuth2 client credentials flow
- Need to exchange credentials for access token
- Access token used for subsequent API calls

### Implementation

```go
func (task *Wiz) ValidateCredentials() error {
    // 1. Validate required fields
    clientID := task.Job.Secret["client_id"]
    clientSecret := task.Job.Secret["client_secret"]
    tokenURL := task.Job.Secret["token_url"]

    if clientID == "" || clientSecret == "" || tokenURL == "" {
        return fmt.Errorf("missing required credentials (client_id, client_secret, token_url)")
    }

    // 2. Perform OAuth2 token exchange
    data := url.Values{}
    data.Set("grant_type", "client_credentials")
    data.Set("client_id", clientID)
    data.Set("client_secret", clientSecret)
    data.Set("audience", "wiz-api")

    req, err := http.NewRequest("POST", tokenURL, strings.NewReader(data.Encode()))
    if err != nil {
        return fmt.Errorf("create token request: %w", err)
    }
    req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

    client := &http.Client{Timeout: 30 * time.Second}
    resp, err := client.Do(req)
    if err != nil {
        return fmt.Errorf("token exchange failed: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        body, _ := io.ReadAll(resp.Body)
        return fmt.Errorf("authentication failed (status %d): %s", resp.StatusCode, string(body))
    }

    // 3. Parse token response
    var tokenResp struct {
        AccessToken string `json:"access_token"`
        ExpiresIn   int    `json:"expires_in"`
        TokenType   string `json:"token_type"`
    }

    if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
        return fmt.Errorf("parse token response: %w", err)
    }

    if tokenResp.AccessToken == "" {
        return fmt.Errorf("received empty access token")
    }

    // 4. Store token for use in Invoke()
    task.OAuth = &OAuth{
        AccessToken: tokenResp.AccessToken,
        ExpiresIn:   tokenResp.ExpiresIn,
    }

    // 5. Make test GraphQL query with token
    testQuery := WizQuery{
        Query: `query { graphSearch(first: 1) { totalCount } }`,
    }

    queryJSON, _ := json.Marshal(testQuery)
    result, err := web.Request[TestResponse](
        task.GetClient(), "POST", task.Asset.Value, queryJSON,
        "Authorization", fmt.Sprintf("Bearer %s", task.OAuth.AccessToken),
        "Content-Type", "application/json",
    )

    if err != nil {
        return fmt.Errorf("test API call failed: %w", err)
    }

    return nil
}
```

### Key Points

- Full OAuth2 credential exchange
- Validates all required credential fields
- Tests token with real API call
- Stores token for reuse in Invoke()
- Comprehensive error messages at each step

---

## Pattern 4: User + Namespace Verification

**Used by**: GitLab, Jira
**Source**: `gitlab.go:106-142`

### Use Case

- Need to verify both user identity and resource access
- Token might be valid but lack permissions
- Multi-tenant systems with namespace isolation

### Implementation

```go
func (task *GitLab) ValidateCredentials() error {
    token := task.Job.Secret["token"]
    namespacePath := task.Job.Secret["value"] // Namespace or group path

    if token == "" {
        return fmt.Errorf("missing GitLab token")
    }

    // 1. Initialize client
    git, err := gitlab.NewClient(token, gitlab.WithBaseURL(task.Job.Secret["url"]))
    if err != nil {
        return fmt.Errorf("create GitLab client: %w", err)
    }

    // 2. Verify user identity
    user, _, err := git.Users.CurrentUser()
    if err != nil {
        return fmt.Errorf("authentication failed: %w", err)
    }

    // 3. Verify namespace/group access
    if namespacePath != "" {
        _, _, err := git.Groups.GetGroup(namespacePath, &gitlab.GetGroupOptions{})
        if err != nil {
            return fmt.Errorf("cannot access namespace '%s': %w", namespacePath, err)
        }
    }

    log.Info("validated GitLab credentials", "user", user.Username, "namespace", namespacePath)
    return nil
}
```

### Key Points

- Tests user authentication first
- Then tests specific resource access
- Logs successful validation with details
- Clear error for inaccessible namespaces

---

## Pattern 5: JWT Client Assertion

**Used by**: Okta (JWT OAuth)
**Source**: `okta/okta.go:97-137`

### Use Case

- JWT-based OAuth2 client credentials
- Private key authentication
- Need to generate and sign JWT

### Implementation

```go
func (task *Okta) ValidateCredentials() error {
    // 1. Extract credentials
    clientID := task.Job.Secret["client_id"]
    privateKey := task.Job.Secret["private_key"]
    orgURL := task.Job.Secret["org_url"]

    if clientID == "" || privateKey == "" || orgURL == "" {
        return fmt.Errorf("missing required fields: client_id, private_key, org_url")
    }

    // 2. Parse private key
    key, err := jwt.ParseRSAPrivateKeyFromPEM([]byte(privateKey))
    if err != nil {
        return fmt.Errorf("invalid private key format: %w", err)
    }

    // 3. Create JWT assertion
    now := time.Now()
    claims := jwt.RegisteredClaims{
        Issuer:    clientID,
        Subject:   clientID,
        Audience:  jwt.ClaimStrings{orgURL + "/oauth2/v1/token"},
        IssuedAt:  jwt.NewNumericDate(now),
        ExpiresAt: jwt.NewNumericDate(now.Add(1 * time.Hour)),
    }

    token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
    signedToken, err := token.SignedString(key)
    if err != nil {
        return fmt.Errorf("sign JWT: %w", err)
    }

    // 4. Exchange JWT for access token
    data := url.Values{}
    data.Set("grant_type", "client_credentials")
    data.Set("scope", "okta.apps.read")
    data.Set("client_assertion_type", "urn:ietf:params:oauth:client-assertion-type:jwt-bearer")
    data.Set("client_assertion", signedToken)

    resp, err := http.PostForm(orgURL+"/oauth2/v1/token", data)
    if err != nil {
        return fmt.Errorf("token exchange: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        body, _ := io.ReadAll(resp.Body)
        return fmt.Errorf("authentication failed: %s", string(body))
    }

    // 5. Test API call with token
    var tokenResp struct {
        AccessToken string `json:"access_token"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
        return fmt.Errorf("decode token: %w", err)
    }

    // 6. Make test API call
    config := okta.NewConfiguration()
    config.Okta.Client.OrgUrl = orgURL
    config.Okta.Client.Token = tokenResp.AccessToken

    client := okta.NewAPIClient(config)
    _, resp, err = client.ApplicationAPI.ListApplications(context.Background()).Execute()
    if err != nil {
        return fmt.Errorf("test API call failed: %w", err)
    }

    return nil
}
```

### Key Points

- Validates private key format early
- Generates proper JWT assertion
- Tests full OAuth2 flow
- Makes real API call to verify permissions
- Comprehensive error handling at each step

---

## Pattern 6: HMAC Signature Auth

**Used by**: Xpanse, Qualys
**Source**: `xpanse/xpanse.go:108-166`

### Use Case

- HMAC-based request signing
- Nonce + timestamp for replay protection
- Custom authentication headers

### Implementation

```go
func (task *Xpanse) ValidateCredentials() error {
    apiKey := task.Job.Secret["api_key"]
    apiKeyID := task.Job.Secret["api_key_id"]
    baseURL := task.Job.Secret["url"]

    if apiKey == "" || apiKeyID == "" {
        return fmt.Errorf("missing api_key or api_key_id")
    }

    // 1. Create test request
    nonce := generateNonce()
    timestamp := time.Now().Unix()

    req, err := http.NewRequest("GET", baseURL+"/public_api/v1/assets", nil)
    if err != nil {
        return fmt.Errorf("create request: %w", err)
    }

    // 2. Generate HMAC signature
    // Format: apiKeyID + nonce + timestamp + method + path
    message := fmt.Sprintf("%s%s%d%s%s",
        apiKeyID,
        nonce,
        timestamp,
        req.Method,
        req.URL.Path,
    )

    mac := hmac.New(sha256.New, []byte(apiKey))
    mac.Write([]byte(message))
    signature := hex.EncodeToString(mac.Sum(nil))

    // 3. Add authentication headers
    req.Header.Set("x-xpanse-api-key", apiKeyID)
    req.Header.Set("x-xpanse-nonce", nonce)
    req.Header.Set("x-xpanse-timestamp", fmt.Sprintf("%d", timestamp))
    req.Header.Set("x-xpanse-signature", signature)

    // 4. Make test request
    client := &http.Client{Timeout: 30 * time.Second}
    resp, err := client.Do(req)
    if err != nil {
        return fmt.Errorf("test request failed: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode == http.StatusUnauthorized {
        return fmt.Errorf("authentication failed: invalid credentials")
    }

    if resp.StatusCode != http.StatusOK {
        body, _ := io.ReadAll(resp.Body)
        return fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(body))
    }

    return nil
}

func generateNonce() string {
    b := make([]byte, 16)
    rand.Read(b)
    return hex.EncodeToString(b)
}
```

### Key Points

- Proper HMAC signature generation
- Includes nonce + timestamp for security
- Custom header authentication
- Tests authentication with real API call

---

## Anti-Patterns to Avoid

### ❌ No API Call (Just Field Check)

```go
// WRONG - Only checks if credentials exist
func (task *Integration) ValidateCredentials() error {
    if task.Job.Secret["token"] == "" {
        return fmt.Errorf("missing token")
    }
    return nil // Doesn't actually test authentication!
}
```

**Fix**: Always make a test API call.

### ❌ Ignoring Validation Errors

```go
// WRONG - Validation error ignored
func (task *Integration) Invoke() error {
    task.ValidateCredentials() // Error ignored!
    // Continue processing...
}
```

**Fix**: Check error and return immediately:

```go
if err := task.ValidateCredentials(); err != nil {
    return fmt.Errorf("validate credentials: %w", err)
}
```

### ❌ Generic Error Messages

```go
// WRONG - Unhelpful error
return fmt.Errorf("invalid credentials")
```

**Fix**: Provide specific, actionable errors:

```go
return fmt.Errorf("authentication failed: token expired or revoked (status 401)")
```

### ❌ Not Testing Required Permissions

```go
// WRONG - Tests authentication but not permissions
_, err := client.GetUser()
return err
```

**Fix**: Test the specific permissions needed:

```go
// Test user info
_, err := client.GetUser()
if err != nil {
    return fmt.Errorf("get user: %w", err)
}

// Test required resource access
_, err = client.ListAssets()
if err != nil {
    return fmt.Errorf("list assets permission missing: %w", err)
}
```

---

## Decision Matrix

| Auth Type                 | Pattern                | Test API Call                      |
| ------------------------- | ---------------------- | ---------------------------------- |
| Bearer token              | API Call + Status Code | GET /user or org-specific resource |
| OAuth2 client credentials | OAuth2 Flow            | Token exchange + test query        |
| API key                   | API Call + Status Code | GET with API key header            |
| JWT assertion             | JWT Client Assertion   | JWT sign + exchange + test call    |
| HMAC signature            | HMAC Signature Auth    | Signed request to test endpoint    |
| Basic auth                | API Call + Status Code | GET with Authorization header      |

---

## Checklist

- [ ] Called in `Invoke()` before processing
- [ ] Makes real API call (not just field validation)
- [ ] Tests required permissions, not just authentication
- [ ] Returns descriptive error messages
- [ ] Handles common status codes (401, 403, 404, 500)
- [ ] Validates all required credential fields first
- [ ] Timeout set on HTTP clients (30s minimum)
- [ ] Credentials not logged in error messages
- [ ] Successful validation logged at info level
- [ ] Error returned immediately, doesn't continue processing
