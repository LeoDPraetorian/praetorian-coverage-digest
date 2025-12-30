# Simple Interface Specification

**Complete specification for the Target, Finding, and SimpleCapability types.**

## Overview

The simple interface pattern allows developers to write standalone security tools with NO Tabularium knowledge. This skill generates the Chariot integration layer automatically.

## Target

Represents what the capability scans:

```go
type Target struct {
    Type   string            // Target type identifier
    Value  string            // The actual target value
    Meta   map[string]string // Additional context
}
```

### Target Types

| Type             | Value Format      | Example                   | Used For                             |
| ---------------- | ----------------- | ------------------------- | ------------------------------------ |
| `domain`         | DNS name          | `example.com`             | Subdomain scanning, DNS enumeration  |
| `ip`             | IPv4/IPv6 address | `192.168.1.1`             | Port scanning, network discovery     |
| `port`           | `ip:port`         | `192.168.1.1:443`         | TLS analysis, service fingerprinting |
| `url`            | Full URL          | `https://example.com/api` | Web app scanning, API testing        |
| `cloud_resource` | Cloud ARN/ID      | `arn:aws:s3:::bucket`     | Cloud security posture               |

### Meta Fields

Common meta fields for additional context:

| Field            | Purpose                      | Example            |
| ---------------- | ---------------------------- | ------------------ |
| `port`           | Port number (for IP targets) | `"443"`            |
| `protocol`       | Network protocol             | `"https"`          |
| `credential_ref` | Reference to credential      | `"aws-prod-creds"` |
| `region`         | Cloud region                 | `"us-east-1"`      |

## Finding

Represents capability output:

```go
type Finding struct {
    Type     string         // Finding type: "asset", "risk", "attribute"
    Data     map[string]any // Flexible payload
    Severity string         // For risks: "info", "low", "medium", "high", "critical"
}
```

### Finding Types

#### Asset Findings

Discovered resources (domains, IPs, ports, cloud resources):

```go
Finding{
    Type: "asset",
    Data: map[string]any{
        "dns":   "subdomain.example.com",
        "class": "domain",
    },
}
```

**Common asset fields:**

- `dns` - Domain name
- `ip` - IP address
- `class` - Asset class (`domain`, `ipv4`, `ipv6`, `port`, `url`)
- `port` - Port number
- `protocol` - Protocol (`tcp`, `udp`)

#### Risk Findings

Vulnerabilities, misconfigurations, security issues:

```go
Finding{
    Type:     "risk",
    Severity: "high",
    Data: map[string]any{
        "name":        "Open S3 Bucket",
        "description": "S3 bucket allows public read access",
        "cve":         "N/A",
    },
}
```

**Common risk fields:**

- `name` - Risk title
- `description` - Detailed explanation
- `cve` - CVE identifier (if applicable)
- `remediation` - How to fix
- `references` - External links

**Severity levels:**

- `info` - Informational only
- `low` - Minor issue
- `medium` - Moderate risk
- `high` - Significant vulnerability
- `critical` - Immediate action required

#### Attribute Findings

Metadata, properties, enrichment data:

```go
Finding{
    Type: "attribute",
    Data: map[string]any{
        "key":   "ssl_certificate",
        "value": "Let's Encrypt",
        "target": "example.com:443",
    },
}
```

**Common attribute fields:**

- `key` - Attribute name
- `value` - Attribute value
- `target` - What this describes
- `source` - Where this came from

## SimpleCapability Interface

The minimal interface developers implement:

```go
type SimpleCapability interface {
    Name() string
    Run(ctx context.Context, target Target) ([]Finding, error)
}
```

### Name()

Returns a unique identifier for the capability:

```go
func (s *SubdomainScanner) Name() string {
    return "subdomain-scanner"
}
```

**Naming conventions:**

- Lowercase kebab-case
- Descriptive of what it does
- Unique across all capabilities

### Run()

Executes the capability against a target and returns findings:

```go
func (s *SubdomainScanner) Run(ctx context.Context, target Target) ([]Finding, error) {
    // 1. Validate target type
    if target.Type != "domain" {
        return nil, fmt.Errorf("expected domain, got %s", target.Type)
    }

    // 2. Execute scanning logic
    subdomains := discoverSubdomains(ctx, target.Value)

    // 3. Convert results to findings
    var findings []Finding
    for _, sub := range subdomains {
        findings = append(findings, Finding{
            Type: "asset",
            Data: map[string]any{
                "dns":   sub,
                "class": "domain",
            },
        })
    }

    return findings, nil
}
```

**Best practices:**

- Respect ctx.Done() for cancellation
- Return partial results on error when possible
- Use Finding.Data flexibly for tool-specific fields
- Include error context in returned errors

## Standalone Execution

Tools implementing this interface work standalone:

```go
// main.go
func main() {
    scanner := &SubdomainScanner{}

    target := Target{
        Type:  parseFlag("--type"),  // "domain"
        Value: parseFlag("--target"), // "example.com"
    }

    findings, err := scanner.Run(context.Background(), target)
    if err != nil {
        log.Fatal(err)
    }

    json.NewEncoder(os.Stdout).Encode(findings)
}
```

```bash
$ ./subdomain-scanner --target example.com --type domain
[
  {"type":"asset","data":{"dns":"www.example.com","class":"domain"}},
  {"type":"asset","data":{"dns":"api.example.com","class":"domain"}}
]
```

## Chariot Integration

This skill generates wrappers that:

1. Implement full Tabularium Capability interface
2. Translate Job → Target
3. Invoke the standalone tool
4. Translate Finding → Tabularium models
5. Send results via job.Send()

**Developers never see this integration code.** They only implement the simple interface above.

## References

- [CLI Wrapper Workflow](cli-wrapper-workflow.md) - For existing CLI tools
- [Go Tool Workflow](go-tool-workflow.md) - For new Go tools
- [Adapter Patterns](adapter-patterns.md) - Finding → Tabularium translation
