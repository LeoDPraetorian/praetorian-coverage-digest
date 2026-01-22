# ExtraHop Authentication Patterns

## Overview

ExtraHop supports two authentication methods depending on deployment type:

| Deployment  | Authentication | Token Expiration | Header Format                        |
| ----------- | -------------- | ---------------- | ------------------------------------ |
| On-Premise  | API Key        | Never expires    | `Authorization: ExtraHop apikey=KEY` |
| RevealX 360 | OAuth/OIDC     | 10 minutes       | `Authorization: Bearer TOKEN`        |

## API Key Authentication (On-Premise)

### Generating API Keys

1. Log into ExtraHop system as admin
2. Navigate to **Admin > API Access**
3. Click **Generate API Key**
4. Copy and securely store the key

### Using API Keys

```go
package extrahop

import (
    "net/http"
)

type OnPremiseClient struct {
    baseURL string
    apiKey  string
    client  *http.Client
}

func NewOnPremiseClient(baseURL, apiKey string) *OnPremiseClient {
    return &OnPremiseClient{
        baseURL: baseURL,
        apiKey:  apiKey,
        client:  &http.Client{Timeout: 30 * time.Second},
    }
}

func (c *OnPremiseClient) doRequest(ctx context.Context, method, path string, body io.Reader) (*http.Response, error) {
    req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, body)
    if err != nil {
        return nil, err
    }

    req.Header.Set("Authorization", fmt.Sprintf("ExtraHop apikey=%s", c.apiKey))
    req.Header.Set("Accept", "application/json")
    req.Header.Set("Content-Type", "application/json")

    return c.client.Do(req)
}
```

### Testing API Key Validity

```go
func (c *OnPremiseClient) ValidateCredentials(ctx context.Context) error {
    resp, err := c.doRequest(ctx, http.MethodGet, "/api/v1/extrahop", nil)
    if err != nil {
        return fmt.Errorf("authentication test failed: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return fmt.Errorf("invalid API key: status %d", resp.StatusCode)
    }

    return nil
}
```

## OAuth/OIDC Authentication (RevealX 360)

### Generating REST API Credentials

1. Log into RevealX 360 Console
2. Navigate to **Administration > API Access**
3. Click **Create Credentials**
4. Note the Client ID and Client Secret (shown only once)

### API Endpoint Regions

| Region        | API Endpoint                         |
| ------------- | ------------------------------------ |
| North America | `https://api.cloud.extrahop.com/`    |
| Europe        | `https://api.eu.cloud.extrahop.com/` |
| Asia Pacific  | `https://api.ap.cloud.extrahop.com/` |

### Token Generation

```go
package extrahop

import (
    "encoding/json"
    "net/http"
    "net/url"
    "strings"
    "sync"
    "time"
)

type RevealX360Client struct {
    baseURL      string
    clientID     string
    clientSecret string
    token        string
    tokenExpiry  time.Time
    tokenMutex   sync.RWMutex
    client       *http.Client
}

type TokenResponse struct {
    AccessToken string `json:"access_token"`
    TokenType   string `json:"token_type"`
    ExpiresIn   int    `json:"expires_in"`
}

func NewRevealX360Client(baseURL, clientID, clientSecret string) *RevealX360Client {
    return &RevealX360Client{
        baseURL:      baseURL,
        clientID:     clientID,
        clientSecret: clientSecret,
        client:       &http.Client{Timeout: 30 * time.Second},
    }
}

func (c *RevealX360Client) refreshToken(ctx context.Context) error {
    c.tokenMutex.Lock()
    defer c.tokenMutex.Unlock()

    // Check if token still valid (with 1-minute buffer)
    if time.Now().Add(time.Minute).Before(c.tokenExpiry) {
        return nil
    }

    data := url.Values{}
    data.Set("grant_type", "client_credentials")
    data.Set("client_id", c.clientID)
    data.Set("client_secret", c.clientSecret)

    req, err := http.NewRequestWithContext(ctx, http.MethodPost,
        c.baseURL+"/oauth2/token",
        strings.NewReader(data.Encode()))
    if err != nil {
        return err
    }

    req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

    resp, err := c.client.Do(req)
    if err != nil {
        return fmt.Errorf("token request failed: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return fmt.Errorf("token request failed: status %d", resp.StatusCode)
    }

    var tokenResp TokenResponse
    if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
        return fmt.Errorf("decode token response: %w", err)
    }

    c.token = tokenResp.AccessToken
    c.tokenExpiry = time.Now().Add(time.Duration(tokenResp.ExpiresIn) * time.Second)

    return nil
}

func (c *RevealX360Client) getToken(ctx context.Context) (string, error) {
    if err := c.refreshToken(ctx); err != nil {
        return "", err
    }

    c.tokenMutex.RLock()
    defer c.tokenMutex.RUnlock()
    return c.token, nil
}

func (c *RevealX360Client) doRequest(ctx context.Context, method, path string, body io.Reader) (*http.Response, error) {
    token, err := c.getToken(ctx)
    if err != nil {
        return nil, fmt.Errorf("get token: %w", err)
    }

    req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, body)
    if err != nil {
        return nil, err
    }

    req.Header.Set("Authorization", "Bearer "+token)
    req.Header.Set("Accept", "application/json")
    req.Header.Set("Content-Type", "application/json")

    return c.client.Do(req)
}
```

## Chariot Integration Pattern

```go
func (task *Extrahop) ValidateCredentials() error {
    apiKey := task.Job.Secret["apikey"]
    if apiKey == "" {
        return fmt.Errorf("missing API key")
    }

    client := task.GetClient()

    // Test authentication with /extrahop endpoint
    resp, err := client.Request(
        http.MethodGet,
        task.Asset.Value+"/api/v1/extrahop",
        nil,
        "Authorization", fmt.Sprintf("ExtraHop apikey=%s", apiKey),
        "Accept", "application/json",
    )
    if err != nil {
        return fmt.Errorf("authentication test failed: %w", err)
    }

    if resp.StatusCode != http.StatusOK {
        return fmt.Errorf("invalid API key: status %d", resp.StatusCode)
    }

    return nil
}
```

## Credential Types for Chariot

| Chariot Credential Type | ExtraHop Auth Method | Secret Keys Required         |
| ----------------------- | -------------------- | ---------------------------- |
| `TokenCredential`       | API Key              | `apikey`                     |
| `OAuth2Credential`      | RevealX 360 OIDC     | `client_id`, `client_secret` |

## Security Best Practices

1. **Never log credentials** - Use structured logging without sensitive fields
2. **Use secrets management** - Store API keys in AWS Secrets Manager or similar
3. **Rotate keys regularly** - API keys should be rotated every 90 days
4. **Minimize permissions** - Request only necessary API access levels
5. **Use HTTPS only** - All ExtraHop API calls must use HTTPS
