# ValidateCredentials Verification

**Purpose**: Verify that integration validates credentials with a lightweight API call before enumeration begins.

## Requirements

1. ValidateCredentials MUST be called in Invoke() before any enumeration
2. MUST make lightweight API call to verify credentials work
3. MUST return error if credentials are invalid (fail fast)
4. MUST be the first action in Invoke()

## Verification Commands

```bash
# Check if ValidateCredentials is implemented
grep -n "func.*ValidateCredentials()" modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}.go

# Verify it's called first in Invoke()
grep -A 5 "func.*Invoke()" modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}.go | grep "ValidateCredentials"

# View the implementation
grep -A 30 'func.*ValidateCredentials()' modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}.go

# Check for lightweight API endpoint usage
grep -A 30 'func.*ValidateCredentials()' modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}.go | grep -E "limit=1|?limit=|first.*1|/self|/user|/me"
```

## Correct Usage Pattern

```go
func (task *Integration) ValidateCredentials() error {
    // Step 1: Extract and validate credential fields
    token := task.Job.Secret["token"]
    if token == "" {
        return fmt.Errorf("missing required token")
    }

    // Step 2: Initialize client (if not already done)
    task.client = vendor.NewClient(token)

    // Step 3: Make lightweight API call
    // Use endpoints that return minimal data:
    // - /tokens/self, /user, /me (metadata only)
    // - ?limit=1 or first:1 (single record)
    resp, err := task.client.Get("/api/v1/user")
    if err != nil {
        return fmt.Errorf("credential validation failed: %w", err)
    }

    if resp.StatusCode == 401 || resp.StatusCode == 403 {
        return fmt.Errorf("invalid credentials: authentication failed")
    }

    return nil
}

func (task *Integration) Invoke() error {
    // MUST be first statement
    if err := task.ValidateCredentials(); err != nil {
        return fmt.Errorf("failed to validate credentials: %w", err)
    }

    // Enumeration begins AFTER validation
    return task.enumerate()
}
```

## Lightweight API Endpoints by Integration Type

| Integration Type | Recommended Endpoint                        | Purpose                  |
| ---------------- | ------------------------------------------- | ------------------------ |
| **GitHub**       | `GET /orgs/{org}`                           | Org metadata             |
| **GitLab**       | `GET /user`, `GET /namespaces/{id}`         | Current user + namespace |
| **Okta**         | `GET /api/v2/apps?limit=1`                  | List 1 app               |
| **Fastly**       | `GET /tokens/self`                          | Token metadata/scope     |
| **Wiz**          | `POST /graphql` (issues first:1)            | Minimal GraphQL query    |
| **Tenable**      | `GET /scans?limit=1`                        | List 1 scan              |
| **SentinelOne**  | `GET /web/api/v2.1/accounts?limit=1`        | List 1 account           |
| **Invicti**      | `GET /scans/list?page=1&pageSize=1`         | List 1 scan              |
| **Extrahop**     | `GET /api/v1/extrahop`                      | Health/info endpoint     |
| **Cloudflare**   | `GET /zones`, `GET /zones/{id}/dns_records` | List zones               |

**Common Characteristics of Lightweight Endpoints**:

1. Single record fetch with `limit=1` or `first=1`
2. Metadata-only endpoints (e.g., `/tokens/self`, `/user`)
3. No data enumeration - just authentication check
4. Fast response - typically <500ms
5. Minimal permissions required - read-only test queries

## Validation Patterns by Credential Type

### Token-based (Simple API Key)

```go
func (task *Integration) ValidateCredentials() error {
    token := task.Job.Secret["token"]
    if token == "" {
        return fmt.Errorf("missing API token")
    }

    resp, err := task.client.Get("/api/endpoint", "Authorization", "Bearer "+token)
    if err != nil {
        return fmt.Errorf("credential validation failed: %w", err)
    }

    if resp.StatusCode != 200 {
        return fmt.Errorf("invalid token: %s", resp.Status)
    }
    return nil
}
```

### OAuth2 Service Account

```go
func (task *Integration) ValidateCredentials() error {
    clientID := task.Job.Secret["client_id"]
    clientSecret := task.Job.Secret["client_secret"]

    // OAuth token exchange validates credentials
    token, err := task.getOAuth2Token(clientID, clientSecret)
    if err != nil {
        return fmt.Errorf("OAuth authentication failed: %w", err)
    }
    task.accessToken = token

    // Optional: Test API access with minimal query
    _, err = task.client.Get("/api/test", "Authorization", "Bearer "+token)
    return err
}
```

### API Key + Secret

```go
func (task *Integration) ValidateCredentials() error {
    apiKey := task.Job.Secret["api_key"]
    secretKey := task.Job.Secret["secret_key"]

    task.headers = []string{
        "X-ApiKeys", fmt.Sprintf("apiKey=%s; secretKey=%s", apiKey, secretKey),
    }

    resp, err := task.client.Get("/api/scans?limit=1", task.headers...)
    if resp.StatusCode == 401 || resp.StatusCode == 403 {
        return fmt.Errorf("invalid API keys: authentication failed")
    }
    return nil
}
```

## Evidence Format

**PASS Example**:

```
✅ ValidateCredentials
Evidence: github.go:73-107 - func (task *Github) ValidateCredentials() error
Evidence: github.go:118 - if err := task.ValidateCredentials(); err != nil { (first line of Invoke)
Endpoint: GET /orgs/{org} (lightweight org metadata)
Placement: First statement in Invoke()
```

**FAIL Example (Missing)**:

```
❌ ValidateCredentials
Evidence: vendor.go - No ValidateCredentials() method found
Issue: Credentials validated DURING enumeration, not before
Risk: Wasted compute if credentials invalid
Required: Implement ValidateCredentials() and call first in Invoke()
```

**FAIL Example (Wrong Placement)**:

```
❌ ValidateCredentials
Evidence: vendor.go:100 - func ValidateCredentials() exists
Evidence: vendor.go:150 - Called AFTER enumeration starts
Issue: Not called first in Invoke()
Required: Move ValidateCredentials() call to first statement in Invoke()
```

## Applicability

| Integration Type       | ValidateCredentials Required? | Notes                                  |
| ---------------------- | ----------------------------- | -------------------------------------- |
| API-based integrations | YES                           | All SaaS integrations with credentials |
| Cloud providers        | YES                           | AWS, Azure, GCP - validate CLI auth    |
| File imports           | NO                            | No API credentials to validate         |
| OAuth integrations     | YES                           | Token exchange validates credentials   |

## Known Violations (from codebase research)

**Missing Implementation (20 integrations)**:

- DigitalOcean, AWS, Azure, GCP
- Axonius, Burp, CrowdStrike, Imperva
- InsightVM, NS1, Nessus, Qualys
- File import integrations (acceptable)

**Correct Implementation (24 integrations)**:

- GitHub, GitLab, Okta, Wiz, Fastly
- Cloudflare, Tenable, SentinelOne, Invicti
- 100% correct placement when implemented

## Compliance Checklist

- [ ] ValidateCredentials() method exists
- [ ] Makes lightweight API call (not full enumeration)
- [ ] Called as FIRST statement in Invoke()
- [ ] Returns error if credentials invalid
- [ ] Error properly wrapped with context
- [ ] Client/headers initialized during validation for reuse
