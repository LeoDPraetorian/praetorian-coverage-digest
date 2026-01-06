# HackerOne Authentication Patterns

**Based on research conducted**: January 3, 2026

## Overview

HackerOne API uses **HTTP Basic Authentication** with long-lived API tokens, not OAuth 2.0. This simplifies integration but requires manual token lifecycle management.

## Authentication Method

### HTTP Basic Auth Structure

```
Authorization: Basic base64(TOKEN_IDENTIFIER:TOKEN_VALUE)
```

**Components**:

- `TOKEN_IDENTIFIER`: Acts as username
- `TOKEN_VALUE`: Acts as password
- Transmitted in Authorization header for every request
- HTTPS enforced (credentials encrypted in transit)

### Why Not OAuth 2.0?

HackerOne chose simplicity over OAuth complexity:

- **Simpler integration**: No authorization code flows
- **Direct control**: Organizations manage tokens directly
- **No refresh cycles**: Tokens don't expire automatically
- **Backwards compatibility**: Long-standing API pattern

Note: HackerOne supports OAuth 2.0 for **third-party service integrations** (GitLab, ServiceNow SSO), but not for API authentication.

## Token Generation

### For Organization Admins

1. Navigate to **Organization Settings > API Tokens**
2. Click **Create API Token**
3. Provide descriptive identifier (e.g., `chariot-prod-api`)
4. Select group assignments (determines permissions)
5. **Critical**: Copy token value immediately (shown only once)
6. Store securely (AWS Secrets Manager, environment variables)
7. Acknowledge secure storage confirmation

### For Individual Hackers

- Generate from Settings page
- Available for Professional, Community, Enterprise users
- Single token per user context

## Permission Model

### Group-Based Inheritance

**Not like OAuth scopes** - simpler but less flexible:

- Tokens inherit permissions from assigned groups
- Multiple groups can be assigned to single token
- **Default**: Read-only when no groups selected
- **Organization Admin toggle**: Enhanced permissions

**Limitation**: Cannot create fine-grained scopes like `read:reports` vs `write:reports`

### Permission Levels

| Permission Level       | Groups Required | Capabilities                     |
| ---------------------- | --------------- | -------------------------------- |
| **Read-Only**          | None            | View reports, programs (limited) |
| **Group-Specific**     | Assigned groups | Group-level read/write           |
| **Organization Admin** | Admin toggle    | Full organization access         |

## Token Lifecycle Management

### Token Visibility

**Critical Security Requirement**:

- Token value **displayed only once** upon creation
- Cannot retrieve token value after creation
- Must store immediately upon generation
- Confirmation email sent with creation details

### Secure Storage

**Development**:

```bash
# .env file (gitignored)
HACKERONE_TOKEN_ID=chariot-dev-api
HACKERONE_TOKEN_VALUE=your-secret-token-value
```

**Production**:

```go
// AWS Secrets Manager
import (
    "github.com/aws/aws-sdk-go/aws/session"
    "github.com/aws/aws-sdk-go/service/secretsmanager"
)

func getHackerOneCredentials() (string, string, error) {
    sess := session.Must(session.NewSession())
    svc := secretsmanager.New(sess)

    input := &secretsmanager.GetSecretValueInput{
        SecretId: aws.String("hackerone/api-token"),
    }

    result, err := svc.GetSecretValue(input)
    if err != nil {
        return "", "", err
    }

    // Parse JSON: {"token_id": "...", "token_value": "..."}
    var creds struct {
        TokenID    string `json:"token_id"`
        TokenValue string `json:"token_value"`
    }
    json.Unmarshal([]byte(*result.SecretString), &creds)

    return creds.TokenID, creds.TokenValue, nil
}
```

### Token Rotation

**Recommended Schedule**:

- **Development**: Every 3 months
- **Staging**: Every 1-2 months
- **Production**: Every 30-60 days

**Rotation Process**:

1. Generate new API token in HackerOne
2. Update systems with new credentials (Secrets Manager)
3. Verify new token works (test API call)
4. Revoke old token via API endpoint
5. Document rotation in change log

### Token Revocation

**Temporary Suspension**:

```bash
curl -X PUT \
  -u "TOKEN_ID:TOKEN_VALUE" \
  https://api.hackerone.com/v1/credentials/{id}/revoke
```

**Permanent Deletion**:

```bash
curl -X DELETE \
  -u "TOKEN_ID:TOKEN_VALUE" \
  https://api.hackerone.com/v1/credentials/{id}/
```

## Implementation Patterns

### Go HTTP Client

```go
package hackerone

import (
    "context"
    "net/http"
    "os"
)

type Client struct {
    httpClient *http.Client
    tokenID    string
    tokenValue string
    baseURL    string
}

func NewClient() (*Client, error) {
    tokenID := os.Getenv("HACKERONE_TOKEN_ID")
    tokenValue := os.Getenv("HACKERONE_TOKEN_VALUE")

    if tokenID == "" || tokenValue == "" {
        return nil, errors.New("HackerOne credentials not configured")
    }

    return &Client{
        httpClient: &http.Client{Timeout: 30 * time.Second},
        tokenID:    tokenID,
        tokenValue: tokenValue,
        baseURL:    "https://api.hackerone.com/v1",
    }, nil
}

func (c *Client) Do(req *http.Request) (*http.Response, error) {
    // Set HTTP Basic Authentication
    req.SetBasicAuth(c.tokenID, c.tokenValue)
    req.Header.Set("Accept", "application/json")
    req.Header.Set("Content-Type", "application/json")

    return c.httpClient.Do(req)
}

func (c *Client) GetReports(ctx context.Context, program string) (*ReportsResponse, error) {
    req, err := http.NewRequestWithContext(
        ctx,
        "GET",
        fmt.Sprintf("%s/reports?program=%s", c.baseURL, program),
        nil,
    )
    if err != nil {
        return nil, err
    }

    resp, err := c.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("unexpected status: %d", resp.StatusCode)
    }

    var result ReportsResponse
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, err
    }

    return &result, nil
}
```

### Credential Masking (Security)

```go
// NEVER log credentials
func logRequest(req *http.Request) {
    auth := req.Header.Get("Authorization")
    if strings.HasPrefix(auth, "Basic ") {
        auth = "Basic [REDACTED]"
    }
    log.Printf("Request: %s %s Auth: %s", req.Method, req.URL.Path, auth)
}
```

## Error Handling

### 401 Unauthorized

**Causes**:

- Invalid token identifier
- Invalid token value
- Missing Authorization header
- Revoked token

**Handling**:

```go
if resp.StatusCode == 401 {
    log.Error("Authentication failed - check credentials")
    // Do NOT retry - credential issue
    // Alert operations team
    return ErrUnauthorized
}
```

### 403 Forbidden

**Causes**:

- Insufficient permissions (group memberships)
- IP whitelist restriction
- Token lacks access to resource

**Handling**:

```go
if resp.StatusCode == 403 {
    log.Error("Access denied - check token permissions and IP whitelist")
    // Do NOT retry
    return ErrForbidden
}
```

## Security Best Practices

### DO

✅ Store tokens in secrets management systems (production)
✅ Use environment variables (development)
✅ Rotate tokens every 30-60 days (production)
✅ Mask credentials in logs
✅ Use HTTPS exclusively (enforced by HackerOne)
✅ Implement credential scanning in CI/CD
✅ Monitor authentication failures

### DON'T

❌ Hardcode tokens in source code
❌ Commit `.env` files to version control
❌ Share tokens via chat/email
❌ Log token values
❌ Use tokens across environments (dev token in prod)
❌ Skip IP whitelist configuration
❌ Ignore token rotation

## Compromise Response

**If token is compromised**:

1. **Immediate Actions** (< 5 minutes):
   - Revoke compromised token via `PUT /v1/credentials/{id}/revoke`
   - Generate new token immediately
   - Update systems with new credentials

2. **Investigation** (< 1 hour):
   - Review API access logs for unauthorized activity
   - Check which reports/programs were accessed
   - Identify potential data exposure
   - Document timeline of compromise

3. **Remediation** (< 24 hours):
   - Update all systems with new token
   - Implement additional monitoring
   - Review and tighten IP whitelist
   - Notify security team

4. **Post-Incident** (< 1 week):
   - Document incident in change log
   - Update rotation procedures
   - Implement automated credential scanning
   - Review token permission model

## References

- [HackerOne API Tokens Documentation](https://docs.hackerone.com/en/articles/8544782-api-tokens)
- [HackerOne API Getting Started](https://api.hackerone.com/getting-started-hacker-api/)
