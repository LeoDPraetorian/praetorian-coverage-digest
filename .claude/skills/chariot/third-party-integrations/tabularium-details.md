# Tabularium Types Reference

## Overview

Tabularium provides universal data models for security platforms. This guide covers the core entity types used in Chariot integrations with real-world examples.

## Translation Guidelines: External API Data → Tabularium Objects

When building integrations, you must translate external API data into the correct Tabularium model types. The choice of model type determines how the data appears in Chariot and how it can be queried.

### Decision Tree for Asset Translation

Follow this decision tree when determining which Tabularium type to use:

```
Is this a cloud-managed resource (VM, bucket, function, etc.)?
├─ YES → Use CloudResource
│         - Provider-managed infrastructure
│         - Has cloud provider identifiers (ARN, resource ID, etc.)
│         - Examples: EC2, S3, Lambda, Azure VM, GCP Cloud Function
│
└─ NO → Is this a web application or API endpoint?
    ├─ YES → Use WebApplication
    │         - HTTP/HTTPS URL-accessible service
    │         - Web apps, REST APIs, GraphQL endpoints
    │         - Has primary URL and optional additional URLs
    │
    └─ NO → Use standard Asset
              - Network infrastructure (IP, hostname, DNS)
              - Physical/virtual machines not cloud-managed
              - Network devices, on-premise servers

```

### Model Type: Asset (Network Infrastructure)

**Use Case**: Network assets like IP addresses, hostnames, DNS names, or on-premise infrastructure.

**Creation Pattern**:

```go
// Basic: DNS name and IP address pair
asset := model.NewAsset(dnsName, ipAddress)

// IP only (when DNS unavailable)
asset := model.NewAsset(ipAddress, ipAddress)

// DNS only (for domain-level assets)
asset := model.NewAsset(dnsName, dnsName)
```

### Model Type: Ports

Ports represent network services discovered on assets. They are created using `model.NewPort()` and linked to their parent asset.

### Creating Ports

```go
// Port creation pattern
port := model.NewPort(protocol, portNumber, &asset)
```

### Model Type: CloudResource (Cloud Infrastructure)

**Use Case**: Cloud provider-managed resources with provider-specific identifiers.

**Creation Pattern**:

```go
// AWS Resources (requires ARN)
awsResource, err := model.NewAWSResource(
    arn,                    // e.g., "arn:aws:s3:::my-bucket"
    accountRef,             // e.g., "123456789012"
    model.S3Bucket,         // CloudResourceType enum
    map[string]any{         // Properties
        "tags": map[string]string{"Environment": "production"},
    },
)

// Azure Resources
azureResource, err := model.NewAzureResource(
    resourceID,             // e.g., "/subscriptions/sub-id/resourceGroups/rg/..."
    subscriptionID,         // Account reference
    model.AzureVM,          // CloudResourceType enum
    map[string]any{         // Properties
        "displayName": "Production VM",
        "location": "eastus",
    },
)

// GCP Resources
gcpResource, err := model.NewGCPResource(
    resourceName,           // e.g., "projects/my-project/buckets/my-bucket"
    projectID,              // Account reference
    model.GCSBucket,        // CloudResourceType enum
    map[string]any{         // Properties
        "storageClass": "STANDARD",
    },
)
```

**Common CloudResourceType Values**:

- `model.EC2Instance`, `model.AzureVM`, `model.GCEInstance` - Virtual machines
- `model.S3Bucket`, `model.AzureBlobStorage`, `model.GCSBucket` - Object storage
- `model.LambdaFunction`, `model.AzureFunction`, `model.GCFFunction` - Serverless functions
- `model.RDSInstance`, `model.AzureSQLDatabase`, `model.CloudSQLInstance` - Databases
- `model.ECSContainer`, `model.AKSCluster`, `model.GKECluster` - Container services

### Model Type: WebApplication (HTTP Services)

**Use Case**: HTTP/HTTPS accessible web applications, APIs, or web services.

**Creation Pattern**:

```go
webApp := model.NewWebApplication(primaryURL, name)
```

### Quick Reference: When to Use Each Type

| External Data                                               | Tabularium Type  | Constructor                                     | Reasoning                         |
| ----------------------------------------------------------- | ---------------- | ----------------------------------------------- | --------------------------------- |
| `{"hostname": "web01.local", "ip": "10.0.1.5"}`             | `Asset`          | `model.NewAsset(dns, ip)`                       | On-premise network infrastructure |
| `{"arn": "arn:aws:ec2:...", "instance_id": "i-abc123"}`     | `AWSResource`    | `model.NewAWSResource(arn, acct, type, props)`  | AWS cloud resource with ARN       |
| `{"azure_id": "/subscriptions/...", "vm": "prod-vm"}`       | `AzureResource`  | `model.NewAzureResource(id, sub, type, props)`  | Azure cloud resource              |
| `{"gcp_name": "projects/.../buckets/...", "bucket": "..."}` | `GCPResource`    | `model.NewGCPResource(name, proj, type, props)` | GCP cloud resource                |
| `{"url": "https://api.example.com"}`                        | `WebApplication` | `model.NewWebApplication(url, name)`            | HTTP-accessible service           |
| `{"domain": "example.com", "ips": ["192.0.2.1"]}`           | `Asset`          | `model.NewAsset(domain, ip)`                    | DNS infrastructure                |
| `{"webapp": "https://app.co", "api": "https://api.co"}`     | `WebApplication` | `model.NewWebApplication(primary, name)`        | Web app with multiple URLs        |
| `{"ip": "192.0.2.10", "ports": [22, 80, 443]}`              | `Asset` + `Port` | `model.NewAsset()` + `model.NewPort()`          | Network scan results              |
| `{"vulnerability": "CVE-2024-1234", "host": "..."}`         | `Risk`           | `model.NewRisk(target, name, severity)`         | Security finding                  |

## Risks

Risks represent security vulnerabilities or issues discovered on assets. The risk model consists of three parts:

1. **Risk Instance**: The vulnerability occurrence on a specific asset
2. **Risk Proof**: Machine-generated evidence of the vulnerability
3. **Risk Definition**: Human-readable description, impact, and remediation

### Creating Risks

```go
// Basic risk creation
risk := model.NewRisk(targetPointer, nameOfRisk, status)

// Example: Wiz Vulnerability (wiz.go:321)
riskName := fmt.Sprintf("%s %s", vuln.Name, vuln.DetailedName)
var status string
if vuln.CVSSScore > 0 {
    status = cvss.CVSStoStatus(vuln.CVSSScore)
} else {
    status = mapWizSeverity(vuln.VendorSeverity)
}
risk := model.NewRisk(&asset, format.TransformRiskName(riskName), status)

// Example: Qualys Vulnerability (qualys.go:314-326)
name := fmt.Sprintf("%s-qid-%s", format.TransformRiskName(vuln.Title), vuln.QID)
var target model.Target
target = &wrapper.Asset
if wrapper.Port.Key != "" {
    target = &wrapper.Port  // Risk on port, not asset
}
risk := model.NewRisk(target, name, qualysSeverities[vuln.Severity])
```

### Risk Definitions

Risk definitions provide generalized human-readable context about the risk:

```go
// Example from Wiz Integration (wiz.go:329-346)
definition := model.RiskDefinition{
    Description: vuln.Description,
}
if vuln.CVEDescription != "" {
    definition.Description = fmt.Sprintf("%s\n\n%s",
        definition.Description, vuln.CVEDescription)
}
if vuln.Remediation != "" {
    definition.Recommendation = vuln.Remediation
}
if vuln.Link != "" {
    definition.References = vuln.Link
}

file := risk.Definition(definition)
if len(file.Bytes) > 0 {
    out = append(out, &file)
}

// Example from Qualys Integration (qualys.go:349-357)
definition := model.RiskDefinition{
    Description:    format.HTMLtoMarkdown(vuln.Diagnosis),
    Impact:         format.HTMLtoMarkdown(vuln.Consequence),
    Recommendation: format.HTMLtoMarkdown(vuln.Solution),
}
file := risk.Definition(definition)
if len(file.Bytes) > 0 {
    task.Job.Send(&file)
}
```

### Risk Proof (Evidence)

Proof files contain machine-generated evidence about that specific instance of the general risk:

```go
// Example 2: Wiz Issue Evidence (wiz.go:527-556)
evidenceMap := make(map[string]string)
for _, record := range issue.EvidenceRecords.Nodes {
    var properties map[string]interface{}
    if err := json.Unmarshal(record.Entity.Properties, &properties); err != nil {
        slog.Error("failed to unmarshal properties", "error", err)
        continue
    }

    cleanType := strings.ReplaceAll(strings.ToLower(record.Entity.Type), "_", " ")
    evidenceString := fmt.Sprintf("Type: %s\nName: %s\nProviderURL: %s\nProperties:",
        cleanType, record.Entity.Name, properties["cloudProviderURL"])

    for key, value := range properties {
        if str, ok := value.(string); ok && str != "" {
            evidenceString += fmt.Sprintf("\n• %s: %s", key, str)
        }
    }
    evidenceMap[cleanType] = evidenceString
}
evidenceMap["wiz_id"] = issue.ID
evidenceJSON, err := json.Marshal(evidenceMap)
if err != nil {
    slog.Error("failed to marshal evidence", "error", err)
} else {
    proofFile := risk.Proof(evidenceJSON)
    streamOutput = append(streamOutput, &proofFile)
}

// Example 3: Qualys Detection Results (qualys.go:359-362)
if wrapper.Detection.Results != "" {
    proofFile := risk.Proof([]byte(wrapper.Detection.Results))
    task.Job.Send(&proofFile)
}
```

### Key Points

1. **Always use constructors** - They call `Defaulted()` and `registry.CallHooks()` automatically
2. **Cloud resources are provider-specific** - Use `NewAWSResource`, `NewAzureResource`, or `NewGCPResource`
3. **Set additional fields after construction** - Constructors set required fields; optional fields can be set afterward
4. **Handle errors from cloud constructors** - AWS requires valid ARN format, others validate structure
5. **Risks reference assets** - Create the asset/cloud resource/web app first, then create risks against it

## Reference Files

- **Asset Model**: `modules/tabularium/pkg/model/model/asset.go`
- **AWS Resources**: `modules/tabularium/pkg/model/model/aws_resource.go`
- **Azure Resources**: `modules/tabularium/pkg/model/model/azure_resource.go`
- **GCP Resources**: `modules/tabularium/pkg/model/model/gcp_resource.go`
- **Cloud Base**: `modules/tabularium/pkg/model/model/cloud_resource.go`
- **Web Applications**: `modules/tabularium/pkg/model/model/web_application.go`
- **Risk Model**: `modules/tabularium/pkg/model/model/risk.go`
- **Wiz Integration**: `modules/chariot/backend/pkg/tasks/integrations/wiz/wiz.go`
- **Qualys Integration**: `modules/chariot/backend/pkg/tasks/integrations/qualys/qualys.go`
