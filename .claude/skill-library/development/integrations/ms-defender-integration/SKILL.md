---
name: ms-defender-integration
description: Use when integrating Microsoft Defender with Chariot - threat detection, vulnerabilities, device inventory sync
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite
---

# Microsoft Defender Integration

**Integration patterns for connecting Microsoft Defender for Endpoint with the Chariot security platform - synchronizing threat detections, vulnerabilities, and device inventory using Microsoft Graph Security API.**

## When to Use

Use this skill when:

- Integrating Microsoft Defender for Endpoint as a security data source
- Syncing Microsoft Defender alerts and vulnerabilities to Chariot risks
- Importing device inventory from Microsoft Defender to Chariot assets
- Implementing Microsoft Graph Security API integration
- Mapping Microsoft Defender threat intelligence to Chariot's attack surface model
- Building Azure AD authentication for Microsoft security services

## Prerequisites

- Azure AD tenant with Microsoft Defender for Endpoint enabled
- Azure AD App Registration with required Microsoft Graph API permissions
- Chariot platform with integration capabilities
- Understanding of Microsoft Graph Security API v1.0
- OAuth 2.0 client credentials flow knowledge

## ⚠️ CRITICAL: No Shortcuts Allowed

**Microsoft Graph API requires OAuth 2.0 - there is NO alternative authentication method.**

Common rationalizations that will fail:

- ❌ "We don't have time for Azure AD app registration" → **Microsoft Graph API will reject all requests without OAuth 2.0 access token**
- ❌ "Can't we use API keys instead?" → **Microsoft Graph does not support API key authentication - only OAuth 2.0**
- ❌ "Let's skip the Graph API permissions setup" → **Requests will fail with 403 Forbidden without proper permissions configured in Azure AD**
- ❌ "We can add OAuth later" → **You cannot fetch any data without OAuth token - this is the foundation, not optional**

**Time estimate**: Azure AD app registration takes 10-15 minutes. There is no faster path.

**Compliance requirement**: OAuth 2.0 with proper permission scopes is required for SOC 2, ISO 27001, and enterprise security compliance.

Not even when there's a deadline. Not even when someone senior says it's okay. Not even when you're 80% done with a different approach.

## Configuration

### Azure AD App Registration

**Required API Permissions** (Application permissions, not delegated):

```
Microsoft Graph API:
- SecurityEvents.Read.All        # Read security alerts
- SecurityActions.Read.All       # Read security actions
- ThreatAssessment.Read.All     # Read threat assessments
- Device.Read.All               # Read device inventory
- DeviceManagementManagedDevices.Read.All  # Read managed devices
```

### Environment Variables

```bash
# Azure AD authentication
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-app-client-id
AZURE_CLIENT_SECRET=your-app-secret

# Microsoft Graph API configuration
GRAPH_API_BASE_URL=https://graph.microsoft.com/v1.0
DEFENDER_API_BASE_URL=https://api.securitycenter.microsoft.com/api

# Integration configuration
DEFENDER_SYNC_INTERVAL=3600  # Seconds between syncs
DEFENDER_MAX_ALERTS_PER_SYNC=1000
DEFENDER_ALERT_SEVERITY_FILTER=High,Medium  # Comma-separated
```

### Authentication Flow

| Step | Action                      | Endpoint                                                       |
| ---- | --------------------------- | -------------------------------------------------------------- |
| 1    | Acquire access token        | `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token` |
| 2    | Use token in requests       | Header: `Authorization: Bearer {token}`                        |
| 3    | Refresh token (expires 1hr) | Same endpoint with `grant_type=client_credentials`             |

## Quick Reference

| Operation            | Endpoint                            | Method | Notes                                  |
| -------------------- | ----------------------------------- | ------ | -------------------------------------- |
| List Alerts          | `/security/alerts`                  | GET    | Filter by severity, status, time range |
| Get Alert Details    | `/security/alerts/{alertId}`        | GET    | Full alert context and evidence        |
| List Vulnerabilities | `/security/vulnerabilities`         | GET    | CVE-based vulnerability data           |
| List Devices         | `/deviceManagement/managedDevices`  | GET    | Device inventory with OS, IP, hostname |
| Get Secure Score     | `/security/secureScores`            | GET    | Organizational security posture        |
| List Recommendations | `/security/securityRecommendations` | GET    | Security improvement recommendations   |

## Implementation

### Step 1: Azure AD Authentication Client

Create OAuth 2.0 client for Microsoft Graph API:

```go
// modules/chariot/backend/pkg/integrations/defender/auth.go
package defender

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    "net/url"
    "strings"
    "time"
)

type AuthClient struct {
    TenantID     string
    ClientID     string
    ClientSecret string
    HTTPClient   *http.Client
    token        string
    tokenExpiry  time.Time
}

type TokenResponse struct {
    AccessToken string `json:"access_token"`
    ExpiresIn   int    `json:"expires_in"`
    TokenType   string `json:"token_type"`
}

func NewAuthClient(tenantID, clientID, clientSecret string) *AuthClient {
    return &AuthClient{
        TenantID:     tenantID,
        ClientID:     clientID,
        ClientSecret: clientSecret,
        HTTPClient:   &http.Client{Timeout: 30 * time.Second},
    }
}

// GetToken retrieves a valid access token, refreshing if necessary
func (a *AuthClient) GetToken(ctx context.Context) (string, error) {
    // Return cached token if still valid
    if a.token != "" && time.Now().Before(a.tokenExpiry) {
        return a.token, nil
    }

    // Request new token
    tokenURL := fmt.Sprintf("https://login.microsoftonline.com/%s/oauth2/v2.0/token", a.TenantID)

    data := url.Values{}
    data.Set("client_id", a.ClientID)
    data.Set("client_secret", a.ClientSecret)
    data.Set("scope", "https://graph.microsoft.com/.default")
    data.Set("grant_type", "client_credentials")

    req, err := http.NewRequestWithContext(ctx, "POST", tokenURL, strings.NewReader(data.Encode()))
    if err != nil {
        return "", fmt.Errorf("creating token request: %w", err)
    }
    req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

    resp, err := a.HTTPClient.Do(req)
    if err != nil {
        return "", fmt.Errorf("requesting token: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != 200 {
        return "", fmt.Errorf("token request failed: status %d", resp.StatusCode)
    }

    var tokenResp TokenResponse
    if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
        return "", fmt.Errorf("decoding token response: %w", err)
    }

    // Cache token with 5-minute buffer before expiry
    a.token = tokenResp.AccessToken
    a.tokenExpiry = time.Now().Add(time.Duration(tokenResp.ExpiresIn-300) * time.Second)

    return a.token, nil
}
```

### Step 2: Microsoft Defender Capability Structure

Follow Chariot's integration pattern with VMFilter and CheckAffiliation:

```go
// modules/chariot/backend/pkg/tasks/integrations/defender/defender.go
package defender

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"

    "github.com/praetorian-inc/chariot/backend/pkg/lib/filter"
    "github.com/praetorian-inc/chariot/backend/pkg/tasks/base"
    "github.com/praetorian-inc/tabularium/pkg/model/model"
)

type Defender struct {
    Job            model.Job
    Asset          model.Integration
    authClient     *AuthClient
    Filter         model.Filter  // REQUIRED: VMFilter for consistency
    base.BaseCapability
}

func NewDefender(job model.Job, asset *model.Integration, opts ...base.Option) model.Capability {
    opts = append(opts, base.WithStatic())  // Static IPs for compliance

    authClient := NewAuthClient(
        job.Secret["tenant_id"],
        job.Secret["client_id"],
        job.Secret["client_secret"],
    )

    return &Defender{
        Job:            job,
        Asset:          *asset,
        authClient:     authClient,
        Filter:         filter.NewVMFilter(job.Username),  // CRITICAL: Initialize VMFilter
        BaseCapability: base.NewBaseCapability(job, opts...),
    }
}

func (d *Defender) Name() string { return "defender" }
func (d *Defender) Integration() bool { return true }  // MUST return true for integrations

func (d *Defender) Match() error {
    if !d.Asset.IsClass("defender") {
        return fmt.Errorf("expected class 'defender', got '%s'", d.Asset.Class)
    }
    return nil
}

func (d *Defender) ValidateCredentials() error {
    // Test authentication by requesting token
    ctx := context.Background()
    _, err := d.authClient.GetToken(ctx)
    if err != nil {
        return fmt.Errorf("authentication failed: %w", err)
    }
    return nil
}

func (d *Defender) Invoke() error {
    if err := d.ValidateCredentials(); err != nil {
        return err
    }

    ctx := context.Background()

    // Sync alerts as risks
    if err := d.syncAlerts(ctx); err != nil {
        return fmt.Errorf("syncing alerts: %w", err)
    }

    // Sync vulnerabilities as risks
    if err := d.syncVulnerabilities(ctx); err != nil {
        return fmt.Errorf("syncing vulnerabilities: %w", err)
    }

    // Sync devices as assets
    if err := d.syncDevices(ctx); err != nil {
        return fmt.Errorf("syncing devices: %w", err)
    }

    return nil
}

// CheckAffiliation verifies if an asset exists in Microsoft Defender
// REQUIRED: Part of the Capability interface
func (d *Defender) CheckAffiliation(asset model.Asset) (bool, error) {
    ctx := context.Background()
    token, err := d.authClient.GetToken(ctx)
    if err != nil {
        return false, fmt.Errorf("getting token: %w", err)
    }

    // Search for device by hostname or IP
    searchURL := fmt.Sprintf("https://graph.microsoft.com/v1.0/deviceManagement/managedDevices?$filter=deviceName eq '%s' or ipAddressV4 eq '%s'",
        asset.DNS, asset.Value)

    req, err := http.NewRequestWithContext(ctx, "GET", searchURL, nil)
    if err != nil {
        return false, fmt.Errorf("creating request: %w", err)
    }
    req.Header.Set("Authorization", "Bearer "+token)

    resp, err := d.authClient.HTTPClient.Do(req)
    if err != nil {
        return false, fmt.Errorf("checking affiliation: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != 200 {
        return false, fmt.Errorf("API error: status %d", resp.StatusCode)
    }

    var result struct {
        Value []map[string]interface{} `json:"value"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return false, fmt.Errorf("decoding response: %w", err)
    }

    // Asset exists if we found any matching devices
    return len(result.Value) > 0, nil
}
```

### Step 3: Alert Sync with VMFilter

Sync Microsoft Defender alerts as Chariot risks:

```go
func (d *Defender) syncAlerts(ctx context.Context) error {
    token, err := d.authClient.GetToken(ctx)
    if err != nil {
        return err
    }

    // Fetch alerts from Microsoft Graph Security API
    alertsURL := "https://graph.microsoft.com/v1.0/security/alerts?$top=1000&$filter=severity eq 'high' or severity eq 'medium'"

    req, err := http.NewRequestWithContext(ctx, "GET", alertsURL, nil)
    if err != nil {
        return err
    }
    req.Header.Set("Authorization", "Bearer "+token)

    resp, err := d.authClient.HTTPClient.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    var alertsResp struct {
        Value []DefenderAlert `json:"value"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&alertsResp); err != nil {
        return err
    }

    // Convert alerts to Chariot risks
    for _, alert := range alertsResp.Value {
        risk := d.alertToRisk(alert)

        // CRITICAL: Filter risk before emitting
        if err := d.Filter.Risk(&risk); err != nil {
            continue  // Skip invalid/filtered risks
        }

        // Emit to Chariot
        if err := d.Job.Send(&risk); err != nil {
            return fmt.Errorf("emitting risk: %w", err)
        }
    }

    return nil
}
```

### Step 4: Device Sync with VMFilter

Sync Microsoft Defender devices as Chariot assets:

```go
func (d *Defender) syncDevices(ctx context.Context) error {
    token, err := d.authClient.GetToken(ctx)
    if err != nil {
        return err
    }

    devicesURL := "https://graph.microsoft.com/v1.0/deviceManagement/managedDevices"

    req, err := http.NewRequestWithContext(ctx, "GET", devicesURL, nil)
    if err != nil {
        return err
    }
    req.Header.Set("Authorization", "Bearer "+token)

    resp, err := d.authClient.HTTPClient.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    var devicesResp struct {
        Value []DefenderDevice `json:"value"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&devicesResp); err != nil {
        return err
    }

    // Convert devices to Chariot assets
    for _, device := range devicesResp.Value {
        asset := d.deviceToAsset(device)

        // CRITICAL: Filter asset before emitting
        if err := d.Filter.Asset(&asset); err != nil {
            continue  // Skip invalid/filtered assets
        }

        // Emit to Chariot
        if err := d.Job.Send(&asset); err != nil {
            return fmt.Errorf("emitting asset: %w", err)
        }
    }

    return nil
}
```

## Data Mapping

### Microsoft Defender Alert → Chariot Risk

| Defender Field       | Chariot Field  | Transformation                           |
| -------------------- | -------------- | ---------------------------------------- |
| `id`                 | `Key`          | Use alert ID as unique key               |
| `title`              | `Name`         | Alert title                              |
| `description`        | `Description`  | Alert description                        |
| `severity`           | `CVSS` (float) | High→9.0, Medium→6.0, Low→3.0            |
| `status`             | `Status`       | Map to Chariot status codes              |
| `category`           | `Category`     | Alert category (malware, phishing, etc.) |
| `hostStates[0].fqdn` | `DNS`          | Host DNS if available                    |
| `createdDateTime`    | `Created`      | ISO 8601 timestamp                       |

### Microsoft Defender Device → Chariot Asset

| Defender Field     | Chariot Field | Transformation              |
| ------------------ | ------------- | --------------------------- |
| `id`               | `Key`         | Use device ID as unique key |
| `deviceName`       | `DNS`         | Device hostname             |
| `ipAddressV4`      | `Value`       | Primary IPv4 address        |
| `operatingSystem`  | `Name`        | OS version string           |
| `deviceClass`      | `Class`       | Map to Chariot asset class  |
| `complianceState`  | `Status`      | Compliance status           |
| `lastSyncDateTime` | `Updated`     | Last sync timestamp         |

## Error Handling

| Error                     | Cause                              | Solution                                             |
| ------------------------- | ---------------------------------- | ---------------------------------------------------- |
| `invalid_client`          | Azure AD app credentials incorrect | Verify tenant ID, client ID, client secret           |
| `insufficient_privileges` | Missing API permissions            | Add required Microsoft Graph permissions in Azure AD |
| `token_expired`           | Access token expired               | Implement token refresh (handled by GetToken)        |
| `429 Too Many Requests`   | Rate limit exceeded                | Implement exponential backoff                        |
| `device_not_found`        | Device query returned empty        | Asset not managed by Defender                        |

## Frontend Integration

Add Microsoft Defender card to Chariot UI:

```typescript
// modules/chariot/ui/src/types.ts
export enum Integration {
  // ... existing integrations
  defender = 'defender',
}

// modules/chariot/ui/src/hooks/useIntegration.tsx
case 'defender':
  return {
    label: 'Microsoft Defender for Endpoint',
    description: 'Sync threat detections, vulnerabilities, and device inventory from Microsoft Defender',
    fields: [
      {
        name: 'tenant_id',
        label: 'Azure Tenant ID',
        type: 'text',
        required: true,
        placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      },
      {
        name: 'client_id',
        label: 'Application (Client) ID',
        type: 'text',
        required: true,
        placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      },
      {
        name: 'client_secret',
        label: 'Client Secret',
        type: 'password',
        required: true,
        placeholder: 'Enter client secret from Azure AD app',
      },
    ],
    logo: '/icons/light/defender.svg',
    darkLogo: '/icons/dark/defender.svg',
  };
```

## Testing

### Unit Tests

```go
// modules/chariot/backend/pkg/tasks/integrations/defender/defender_test.go
package defender

import (
    "testing"
    "github.com/stretchr/testify/assert"
)

func TestDefender_Name(t *testing.T) {
    d := &Defender{}
    assert.Equal(t, "defender", d.Name())
}

func TestDefender_Integration(t *testing.T) {
    d := &Defender{}
    assert.True(t, d.Integration())
}

func TestDefender_ValidateCredentials(t *testing.T) {
    // Test with valid credentials
    // Test with invalid credentials
    // Test with missing credentials
}

func TestDefender_CheckAffiliation(t *testing.T) {
    // Test with existing device
    // Test with non-existent device
    // Test with API errors
}
```

### Integration Tests

Test against Microsoft Graph API sandbox or test tenant.

## References

- [references/api-reference.md](references/api-reference.md) - Complete Microsoft Graph Security API reference
- [references/pagination-patterns.md](references/pagination-patterns.md) - Handling large alert/device datasets
- [references/error-codes.md](references/error-codes.md) - Microsoft Graph error code catalog
- [Microsoft Graph Security API Docs](https://learn.microsoft.com/en-us/graph/api/resources/security-api-overview)
- [Azure AD App Registration Guide](https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [integration-chariot-patterns](..//integration-chariot-patterns/SKILL.md) - General Chariot integration patterns

## Verification Checklist

Before marking the integration complete:

- [ ] VMFilter initialized in NewDefender constructor
- [ ] VMFilter.Asset() called before emitting all assets
- [ ] VMFilter.Risk() called before emitting all risks
- [ ] CheckAffiliation() method implemented and tested
- [ ] Frontend card added to useIntegration.tsx
- [ ] Frontend enum 'defender' added to types.ts
- [ ] Enum name matches backend Name() method ("defender")
- [ ] Logo placed in modules/chariot/ui/public/icons/dark/defender.svg
- [ ] Logo placed in modules/chariot/ui/public/icons/light/defender.svg
- [ ] Unit tests written for Name(), Integration(), ValidateCredentials()
- [ ] Integration test with real Microsoft Graph API (or sandbox)
- [ ] Error handling for token expiry, rate limits, API errors
- [ ] Documentation updated with setup instructions
