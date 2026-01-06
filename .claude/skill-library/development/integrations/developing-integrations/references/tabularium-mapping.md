# Tabularium Model Mapping

Decision tree and examples for mapping external API data to Tabularium models.

## Decision Tree

```
External API Data Type
├─ IP Address / Hostname / Domain
│  └─ model.NewAsset(dns, ip)
│     Examples: Devices, servers, network endpoints
│
├─ Cloud Resource
│  ├─ AWS Resource
│  │  └─ model.NewAWSResource(arn, accountID, resourceType, metadata)
│  │
│  ├─ Azure Resource
│  │  └─ model.NewAzureResource(id, id, resourceType, metadata)
│  │
│  └─ GCP Resource
│     └─ model.NewGCPResource(id, id, resourceType, metadata)
│
├─ Web URL / Website
│  └─ model.NewWebpage(parsedURL, headers)
│     Examples: Web applications, API endpoints
│
└─ Security Finding / Vulnerability
   └─ model.NewRisk(&targetAsset, riskName, severity)
      └─ Add details: risk.Definition(...), risk.Proof(...)
```

---

## Pattern 1: Network Assets (IP/Host/Domain)

**Use when**: External API returns devices, servers, endpoints with IP addresses or hostnames

### Example 1: Vulnerability Scanner (Nessus)

**Source**: `nessus/nessus.go:145`

```go
// Map Nessus host to Asset
dns := host.Info.IP
if host.Info.FQDN != "" {
    dns = host.Info.FQDN // Prefer FQDN over IP
}

asset := model.NewAsset(dns, host.Info.IP)
task.Job.Send(&asset)
```

**Pattern**:

- DNS parameter: Use FQDN if available, fallback to IP
- IP parameter: Always the IP address
- Prefer human-readable names (FQDN) for DNS field

### Example 2: DNS Records (Cloudflare)

**Source**: `cloudflare/cloudflare.go:125`

```go
// Map DNS record to Asset
asset := model.NewAsset(r.Name, r.Content)
task.Job.Send(&asset)
```

**Pattern**:

- DNS parameter: Record name (subdomain.example.com)
- IP parameter: Record content (resolved IP or CNAME target)

### Example 3: Cloud Instance (CrowdStrike)

**Source**: `crowdstrike/crowdstrike.go:195`

```go
// Map endpoint to Asset with cloud metadata
asset := model.NewAsset(device.Hostname, device.LocalIP)
asset.CloudId = device.DeviceID
asset.CloudProvider = "crowdstrike"

task.Job.Send(&asset)
```

**Pattern**:

- Standard NewAsset for base
- Add CloudId for external system tracking
- Add CloudProvider for source identification

---

## Pattern 2: Cloud Resources

**Use when**: API returns AWS/Azure/GCP resources (accounts, subscriptions, projects, VMs, etc.)

### AWS Resources

**Source**: `amazon/amazon.go:261-267`

```go
// Map AWS account to cloud resource
arn := fmt.Sprintf("arn:aws:organizations::%s:account/%s", accountID, accountID)

account, err := model.NewAWSResource(
    arn,                  // ARN (unique identifier)
    accountID,            // Account ID
    model.AWSAccount,     // Resource type
    map[string]any{
        "email":  email,
        "name":   name,
        "status": status,
    },
)
if err != nil {
    return fmt.Errorf("create AWS resource: %w", err)
}

task.Job.Send(&account)
```

**Pattern**:

- ARN: Fully qualified AWS ARN format
- AccountID: AWS account identifier
- ResourceType: Use model.AWSAccount, model.AWSEC2Instance, etc.
- Metadata: Additional attributes as map

### Azure Resources

**Source**: `azure/azure.go:204-213`

```go
// Map Azure subscription to cloud resource
azureResource, err := model.NewAzureResource(
    subscriptionID,      // Resource ID
    subscriptionID,      // Subscription ID
    model.CloudResourceType("Microsoft.Resources/subscriptions"),
    map[string]any{
        "tenantId": tenant,
    },
)
if err != nil {
    return fmt.Errorf("create Azure resource: %w", err)
}

task.Job.Send(&azureResource)
```

**Pattern**:

- ResourceID: Azure resource ID format
- SubscriptionID: Parent subscription
- ResourceType: Azure resource type (Microsoft._/_)
- Metadata: Tenant and additional properties

### GCP Resources

**Source**: `gcp/gcp.go:149-157`

```go
// Map GCP organization to cloud resource
orgName := fmt.Sprintf("organizations/%s", orgID)

orgResource, err := model.NewGCPResource(
    orgName,                        // Resource name
    orgName,                        // Organization name
    model.GCPResourceOrganization,  // Resource type
    map[string]any{
        "orgId": orgName,
    },
)
if err != nil {
    return fmt.Errorf("create GCP resource: %w", err)
}

task.Job.Send(&orgResource)
```

**Pattern**:

- ResourceName: GCP resource name format (organizations/123)
- Organization: Parent org identifier
- ResourceType: model.GCPResourceOrganization, model.GCPResourceProject, etc.
- Metadata: Additional GCP-specific attributes

---

## Pattern 3: Web Resources

**Use when**: API returns web applications, URLs, HTTP endpoints

### Example: Web Application Scanner

**Source**: `invicti/invicti.go:145-157`

```go
// Parse URL and extract headers
parsedURL, err := url.Parse(website.URL)
if err != nil {
    return fmt.Errorf("parse URL: %w", err)
}

headers := http.Header{}
if website.MainUrl != "" {
    headers.Set("X-Main-URL", website.MainUrl)
}

webpage := model.NewWebpage(parsedURL, headers)
task.Job.Send(&webpage)
```

**Pattern**:

- Parse URL first to validate format
- Add relevant HTTP headers
- Store metadata in headers (custom X- headers acceptable)

---

## Pattern 4: Security Risks (Vulnerabilities)

**Use when**: API returns security findings, CVEs, misconfigurations

### Complete Risk Example

**Source**: `invicti/invicti.go:158-210`

```go
// Create risk associated with target asset
risk := model.NewRisk(&webpage, riskName, severity)

// Add human-readable definition
definition := model.RiskDefinition{
    Description:    vuln.Description,
    Impact:         vuln.Impact,
    Recommendation: vuln.RemedialActions,
}
definitionFile := risk.Definition(definition)
task.Job.Send(&definitionFile)

// Add machine-readable proof
proof := format.AddParam("", "cvss_score", fmt.Sprintf("%.1f", vuln.CVSSScore))
proof = format.AddParam(proof, "cvss_vector", vuln.CVSSVector)
proof = format.AddParam(proof, "cwe", fmt.Sprintf("%d", vuln.CWE))
proofFile := risk.Proof([]byte(proof))
task.Job.Send(&proofFile)

// Send the risk itself
task.Job.Send(&risk)
```

**Pattern**:

1. Create base risk with target asset reference
2. Add Definition (human-readable context)
3. Add Proof (machine evidence)
4. Send definition file
5. Send proof file
6. Send risk itself

### Risk Severity Mapping

```go
// Map external severity to Chariot severity
func mapSeverity(externalSeverity string) model.Severity {
    switch strings.ToLower(externalSeverity) {
    case "critical":
        return model.SeverityCritical
    case "high":
        return model.SeverityHigh
    case "medium":
        return model.SeverityMedium
    case "low":
        return model.SeverityLow
    default:
        return model.SeverityInfo
    }
}
```

### Risk Name Construction

```go
// Construct descriptive risk name
riskName := fmt.Sprintf("%s: %s",
    vuln.Type,        // "SQL Injection", "XSS", "Misconfiguration"
    vuln.Title,       // Specific finding title
)

// Keep names concise (< 100 chars)
if len(riskName) > 100 {
    riskName = riskName[:97] + "..."
}
```

---

## Special Cases

### Case 1: Asset with No IP

```go
// When only hostname/DNS is available
asset := model.NewAsset(hostname, "") // Empty IP acceptable
```

### Case 2: Multiple IPs per Host

```go
// Create separate assets for each IP
for _, ip := range device.IPAddresses {
    asset := model.NewAsset(device.Hostname, ip)
    task.Job.Send(&asset)
}
```

### Case 3: Asset with Cloud Metadata

```go
asset := model.NewAsset(dns, ip)
asset.CloudId = externalID        // For CheckAffiliation
asset.CloudProvider = "provider"  // Source system
asset.Status = model.StatusActive // Lifecycle state

task.Job.Send(&asset)
```

### Case 4: Risk Without Target Asset

```go
// Some findings don't have specific asset targets (org-level findings)
// Use integration asset as target
risk := model.NewRisk(&task.Asset, riskName, severity)
```

---

## Type Selection Matrix

| Data From API               | Chariot Model  | Method               | Key Fields               |
| --------------------------- | -------------- | -------------------- | ------------------------ |
| Server/Device with IP       | Asset          | `NewAsset()`         | DNS, IP                  |
| Domain/Subdomain            | Asset          | `NewAsset()`         | DNS, IP (empty OK)       |
| AWS Account/Resource        | Cloud Resource | `NewAWSResource()`   | ARN, AccountID, Type     |
| Azure Subscription/Resource | Cloud Resource | `NewAzureResource()` | ID, SubscriptionID, Type |
| GCP Project/Resource        | Cloud Resource | `NewGCPResource()`   | Name, Org, Type          |
| Web URL/Application         | Webpage        | `NewWebpage()`       | URL, Headers             |
| CVE/Vulnerability           | Risk           | `NewRisk()`          | Target, Name, Severity   |
| Misconfiguration            | Risk           | `NewRisk()`          | Target, Name, Severity   |

---

## Common Mistakes

### ❌ Wrong Model Type

```go
// WRONG - Cloud resource as Asset
asset := model.NewAsset("arn:aws:ec2:...", "")
```

```go
// RIGHT - Use cloud resource model
resource, _ := model.NewAWSResource(arn, accountID, model.AWSEC2Instance, metadata)
```

### ❌ Missing Error Handling

```go
// WRONG - Ignoring error
asset, _ := model.NewAWSResource(...)
```

```go
// RIGHT - Check errors
asset, err := model.NewAWSResource(...)
if err != nil {
    return fmt.Errorf("create resource: %w", err)
}
```

### ❌ Empty Required Fields

```go
// WRONG - Empty DNS and IP
asset := model.NewAsset("", "")
```

```go
// RIGHT - At least one identifier required
if dns == "" && ip == "" {
    return fmt.Errorf("no identifiers for asset")
}
asset := model.NewAsset(dns, ip)
```

### ❌ Not Filtering Before Send

```go
// WRONG - No VMFilter
task.Job.Send(&asset)
```

```go
// RIGHT - Always filter
task.Filter.Asset(&asset)
task.Job.Send(&asset)
```

---

## Checklist

- [ ] Correct model type selected (Asset, Cloud Resource, Webpage, Risk)
- [ ] Required fields populated (DNS/IP, ARN/ID, URL, etc.)
- [ ] Error handling for model constructors
- [ ] VMFilter applied before Send()
- [ ] CloudId set for CheckAffiliation (if applicable)
- [ ] Risk Definition and Proof added (if Risk)
- [ ] Metadata map contains useful attributes
- [ ] Severity mapped correctly (if Risk)
