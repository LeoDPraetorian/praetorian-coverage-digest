# pkg/lib Utility Functions

**Common utility functions from `modules/chariot/backend/pkg/lib/` for integration development.**

## Quick Reference

| Package      | Function         | Purpose                               | Usage Context                             |
| ------------ | ---------------- | ------------------------------------- | ----------------------------------------- |
| `lib/web`    | `Request[T]()`   | Type-safe HTTP requests with generics | All API calls                             |
| `lib/format` | `Target()`       | URL normalization and validation      | Endpoint construction                     |
| `lib/cvss`   | `CVSStoStatus()` | Convert CVSS score to model.Status    | Risk creation from vulnerability scanners |
| `lib/filter` | `NewVMFilter()`  | Create multi-tenant filter            | Asset/Risk filtering (P0 REQUIRED)        |

## web.Request[T]() - Typed HTTP Client

**Purpose**: Type-safe HTTP requests with automatic JSON unmarshaling.

**Import**:

```go
import "github.com/praetorian-inc/chariot/pkg/lib/web"
```

**Signature**:

```go
func Request[T any](ctx context.Context, client *http.Client, config RequestConfig) (T, error)
```

**Usage Pattern**:

```go
type ApiResponse struct {
    Assets []Asset `json:"assets"`
    NextToken string `json:"next_token"`
}

resp, err := web.Request[ApiResponse](ctx, t.GetClient(), web.RequestConfig{
    Method: "GET",
    URL:    "https://api.vendor.com/assets",
    Headers: map[string]string{
        "Authorization": fmt.Sprintf("Bearer %s", t.Asset.Secret["api_key"]),
    },
})
if err != nil {
    return fmt.Errorf("fetching assets: %w", err)
}

// resp is strongly typed ApiResponse
for _, asset := range resp.Assets {
    // Process assets...
}
```

**Benefits**:

- Automatic JSON unmarshaling to typed struct
- Error handling with context
- HTTP client reuse from BaseCapability
- Request/response logging integration

**Common Patterns**:

### GET Request

```go
resp, err := web.Request[ResponseType](ctx, t.GetClient(), web.RequestConfig{
    Method: "GET",
    URL:    endpoint,
    Headers: headers,
})
```

### POST Request with Body

```go
resp, err := web.Request[ResponseType](ctx, t.GetClient(), web.RequestConfig{
    Method: "POST",
    URL:    endpoint,
    Headers: headers,
    Body:   requestBody,  // Will be JSON marshaled automatically
})
```

### Pagination with web.Request

```go
pageToken := ""
for {
    resp, err := web.Request[PagedResponse](ctx, t.GetClient(), web.RequestConfig{
        Method: "GET",
        URL:    fmt.Sprintf("%s?token=%s", endpoint, pageToken),
        Headers: headers,
    })
    if err != nil {
        return fmt.Errorf("page request: %w", err)
    }

    // Process resp.Items...

    pageToken = resp.NextToken
    if pageToken == "" {
        break
    }
}
```

---

## format.Target() - URL Normalization

**Purpose**: Normalize URLs for consistent asset Key generation.

**Import**:

```go
import "github.com/praetorian-inc/chariot/pkg/lib/format"
```

**Signature**:

```go
func Target(rawURL string) (string, error)
```

**Usage Pattern**:

```go
// Normalize API endpoint or discovered URL
normalized, err := format.Target(apiAsset.URL)
if err != nil {
    return fmt.Errorf("normalizing URL: %w", err)
}

asset := model.NewAsset(
    normalized,  // Use normalized URL as Key
    "",
    "domain",
)
```

**Transformations**:

- Strips trailing slashes
- Lowercases domain
- Removes default ports (`:80`, `:443`)
- Validates URL structure

**Examples**:

```go
format.Target("https://example.com/")      → "https://example.com"
format.Target("HTTPS://EXAMPLE.COM/path")  → "https://example.com/path"
format.Target("https://example.com:443")   → "https://example.com"
format.Target("http://example.com:80")     → "http://example.com"
```

**When to Use**:

- Constructing asset Keys from API responses
- Normalizing discovered endpoints
- Comparing URLs for deduplication

---

## cvss.CVSStoStatus() - Severity Mapping

**Purpose**: Convert CVSS scores to Chariot risk severity (model.Status).

**Import**:

```go
import "github.com/praetorian-inc/chariot/pkg/lib/cvss"
```

**Signature**:

```go
func CVSStoStatus(score float64) model.Status
```

**Usage Pattern**:

```go
// Map vulnerability scanner CVSS to Chariot severity
severity := cvss.CVSStoStatus(vuln.CVSSScore)

risk := model.NewRisk(
    &asset,
    vuln.ID,     // CVE-2024-1234 or vendor vuln ID
    severity,    // Mapped severity
)
```

**Mapping Table**:

| CVSS Score | model.Status    | Severity | Color  |
| ---------- | --------------- | -------- | ------ |
| 0.0        | `model.StatusI` | Info     | Gray   |
| 0.1 - 3.9  | `model.StatusL` | Low      | Blue   |
| 4.0 - 6.9  | `model.StatusM` | Medium   | Yellow |
| 7.0 - 8.9  | `model.StatusH` | High     | Orange |
| 9.0 - 10.0 | `model.StatusC` | Critical | Red    |

**Integration Examples**:

### Qualys

```go
severity := cvss.CVSStoStatus(qualysVuln.CVSS3Score)
risk := model.NewRisk(&asset, qualysVuln.QID, severity)
```

### Tenable

```go
severity := cvss.CVSStoStatus(tenablePlugin.CVSSBaseScore)
risk := model.NewRisk(&asset, tenablePlugin.PluginID, severity)
```

### InsightVM

```go
severity := cvss.CVSStoStatus(insightVuln.CVSSv3Score)
risk := model.NewRisk(&asset, insightVuln.ID, severity)
```

---

## filter.NewVMFilter() - Multi-Tenant Filtering

**Purpose**: Create filter for multi-tenant asset/risk isolation (P0 REQUIRED).

**Import**:

```go
import "github.com/praetorian-inc/chariot/pkg/filter"
```

**Signature**:

```go
func NewVMFilter(aws AWS, collectors registry.Collectors) filter.VMFilter
```

**Usage Pattern**:

```go
// In constructor (using BaseCapability)
func NewVendorName(job model.Job, asset *model.Integration, opts ...base.Option) model.Capability {
    baseCapability := base.NewBaseCapability(job, opts...)
    return &VendorName{
        Job:            job,
        Asset:          *asset,
        Filter:         filter.NewVMFilter(baseCapability.AWS, baseCapability.Collectors),
        BaseCapability: baseCapability,
    }
}

// In Invoke() - filter before emission
func (t *VendorName) Invoke(ctx context.Context) error {
    assets := t.discoverAssets(ctx)

    for _, asset := range assets {
        t.Filter.Asset(&asset)  // P0 REQUIRED
        t.Job.Send(&asset)
    }

    return nil
}
```

**Filter Methods**:

### Asset Filtering

```go
t.Filter.Asset(&asset)  // Call before t.Job.Send(&asset)
```

### Risk Filtering

```go
t.Filter.Risk(&risk)    // Call before t.Job.Send(&risk)
```

**Why Required**: Enforces multi-tenancy boundaries. Without filtering, users can see assets/risks from other tenants.

**Violations**: DigitalOcean, GitHub, GitLab, Cloudflare integrations all missing VMFilter.

---

## Risk with Definition Pattern

**Purpose**: Create risks with detailed vulnerability information.

**Usage Pattern**:

```go
import "github.com/praetorian-inc/chariot/pkg/model"

// Create risk
risk := model.NewRisk(&asset, vulnID, severity)

// Prepare output slice
out := []registry.Model{&risk}

// Add definition if available
if hasDescription {
    definition := model.RiskDefinition{
        Description:    vuln.Description,
        Recommendation: vuln.Remediation,
        References:     []string{vuln.URL, vuln.CVE},
    }
    out = append(out, &risk.Definition(definition))
}

// Send all at once
t.Job.Send(out...)
```

**Complete Example**:

```go
func (t *VulnScanner) processVulnerability(asset model.Asset, vuln Vulnerability) error {
    // Map CVSS to severity
    severity := cvss.CVSStoStatus(vuln.CVSSScore)

    // Create risk
    risk := model.NewRisk(&asset, vuln.ID, severity)

    // Filter risk (P0 REQUIRED)
    t.Filter.Risk(&risk)

    // Prepare output
    out := []registry.Model{&risk}

    // Add definition if we have detailed information
    if vuln.Description != "" {
        definition := model.RiskDefinition{
            Description:    vuln.Description,
            Recommendation: vuln.Remediation,
            References:     []string{vuln.CVE, vuln.VendorURL},
        }
        out = append(out, &risk.Definition(definition))
    }

    // Emit risk + definition atomically
    t.Job.Send(out...)

    return nil
}
```

**Benefits of Atomic Emission**:

- Risk and definition created together (no orphans)
- Single transaction for database consistency
- Better performance (one Send vs two)

---

## Integration Workflow with Utilities

**Complete integration using all utilities:**

```go
func (t *VendorName) Invoke(ctx context.Context) error {
    // 1. Fetch data with web.Request
    resp, err := web.Request[VulnResponse](ctx, t.GetClient(), web.RequestConfig{
        Method: "GET",
        URL:    "https://api.vendor.com/vulnerabilities",
        Headers: map[string]string{
            "Authorization": fmt.Sprintf("Bearer %s", t.Asset.Secret["api_key"]),
        },
    })
    if err != nil {
        return fmt.Errorf("fetching vulnerabilities: %w", err)
    }

    // 2. Process each vulnerability
    for _, vuln := range resp.Vulnerabilities {
        // Normalize URL with format.Target
        normalized, err := format.Target(vuln.AssetURL)
        if err != nil {
            t.Job.Log.Warnf("skipping invalid URL: %s", vuln.AssetURL)
            continue
        }

        // Create asset
        asset := model.NewAsset(normalized, "", "domain")

        // Map CVSS with cvss.CVSStoStatus
        severity := cvss.CVSStoStatus(vuln.CVSSScore)

        // Create risk
        risk := model.NewRisk(&asset, vuln.ID, severity)

        // Filter (P0 REQUIRED) - uses VMFilter from constructor
        t.Filter.Asset(&asset)
        t.Filter.Risk(&risk)

        // Emit with definition
        out := []registry.Model{&asset, &risk}
        if vuln.Description != "" {
            definition := model.RiskDefinition{
                Description:    vuln.Description,
                Recommendation: vuln.Remediation,
                References:     []string{vuln.CVE},
            }
            out = append(out, &risk.Definition(definition))
        }

        t.Job.Send(out...)
    }

    return nil
}
```

---

## Common Anti-Patterns

### ❌ Using http.DefaultClient Instead of GetClient()

```go
// WRONG - bypasses timeout configuration and logging
client := http.DefaultClient
```

```go
// RIGHT - uses BaseCapability client with proper config
client := t.GetClient()
```

### ❌ Manual JSON Unmarshaling

```go
// WRONG - manual unmarshaling is verbose and error-prone
resp, err := http.Get(url)
body, _ := io.ReadAll(resp.Body)
var data ResponseType
json.Unmarshal(body, &data)
```

```go
// RIGHT - web.Request handles unmarshaling
data, err := web.Request[ResponseType](ctx, t.GetClient(), web.RequestConfig{
    Method: "GET",
    URL:    url,
})
```

### ❌ Skipping VMFilter

```go
// WRONG - violates multi-tenancy (P0 VIOLATION)
t.Job.Send(&asset)
```

```go
// RIGHT - always filter before emission
t.Filter.Asset(&asset)
t.Job.Send(&asset)
```

### ❌ Hardcoded Severity Mapping

```go
// WRONG - inconsistent severity across integrations
var severity model.Status
if score >= 9.0 {
    severity = model.StatusC
} else if score >= 7.0 {
    severity = model.StatusH
}
// ... manual mapping
```

```go
// RIGHT - use standard mapping function
severity := cvss.CVSStoStatus(score)
```
