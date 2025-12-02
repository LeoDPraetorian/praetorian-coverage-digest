---
name: capabilities-scanner-integration
description: Use when integrating security scanners - Nmap, Masscan, output parsing, result normalization
allowed-tools: Read, Write, Bash, Glob, Grep
skill-type: process
---

# Scanner Integration for Chariot

**You MUST use TodoWrite before starting to track all development steps.**

This skill covers security scanner integration within the Chariot platform. Scanner integrations follow the Janus Link pattern and produce normalized results compatible with Tabularium schemas.

## Quick Reference

| Scanner Type | Link Pattern | Output Format | Example |
|--------------|--------------|---------------|---------|
| Network (Nmap, Masscan) | `NetworkScannerLink` | XML/JSON | Port discovery, service detection |
| Secret Detection (NoseyParker) | `SecretScannerLink` | JSON | Credential leaks, API keys |
| Container (Docker, Trivy) | `ContainerScannerLink` | JSON | Image vulnerabilities |
| Cloud (AWS, Azure, GCP) | `CloudControlLink` | JSON | Misconfigurations, compliance |
| Web (Nuclei) | `WebScannerLink` | JSON | CVEs, exposed panels |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Chariot Backend                           │
│  Job scheduling, capability dispatch, result aggregation    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Nebula Links                             │
│  Scanner-specific adapters (NoseyParkerLink, NmapLink)      │
│  Configuration, execution, output parsing                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Janus Framework                            │
│  Link interface, chain orchestration, error handling        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Scanner Tools                              │
│  Nmap, Masscan, NoseyParker, Trivy, AWS CLI                 │
└─────────────────────────────────────────────────────────────┘
```

## Janus Link Interface

All scanner integrations implement the Janus `Link` interface:

```go
// Link is the core interface for scanner integrations
type Link interface {
    // Name returns unique identifier for the link
    Name() string

    // Execute runs the scanner with given input
    Execute(ctx context.Context, input Input) (Output, error)

    // Validate checks if input is valid before execution
    Validate(input Input) error
}

// Input contains scanner configuration and targets
type Input struct {
    Targets    []string          // IPs, domains, URLs
    Options    map[string]any    // Scanner-specific options
    Timeout    time.Duration     // Execution timeout
    RateLimit  int               // Requests per second
}

// Output contains parsed scanner results
type Output struct {
    Results    []Result          // Normalized findings
    RawOutput  []byte            // Original scanner output
    Metadata   map[string]any    // Execution metadata
    Duration   time.Duration     // Execution time
}
```

## Pattern: Network Scanner Link

**Use Case**: Port scanning, service detection, host discovery

```go
package links

import (
    "context"
    "encoding/xml"
    "os/exec"

    "github.com/praetorian-inc/janus/pkg/link"
)

type NmapLink struct {
    BinaryPath string
    DefaultArgs []string
}

func NewNmapLink() *NmapLink {
    return &NmapLink{
        BinaryPath: "nmap",
        DefaultArgs: []string{"-sV", "-oX", "-"},
    }
}

func (l *NmapLink) Name() string {
    return "nmap"
}

func (l *NmapLink) Validate(input link.Input) error {
    if len(input.Targets) == 0 {
        return fmt.Errorf("nmap requires at least one target")
    }
    return nil
}

func (l *NmapLink) Execute(ctx context.Context, input link.Input) (link.Output, error) {
    // Build command arguments
    args := append(l.DefaultArgs, input.Targets...)
    if ports, ok := input.Options["ports"].(string); ok {
        args = append(args, "-p", ports)
    }

    // Execute with context for cancellation
    cmd := exec.CommandContext(ctx, l.BinaryPath, args...)
    stdout, err := cmd.Output()
    if err != nil {
        return link.Output{}, fmt.Errorf("nmap execution failed: %w", err)
    }

    // Parse XML output
    var nmapRun NmapRun
    if err := xml.Unmarshal(stdout, &nmapRun); err != nil {
        return link.Output{}, fmt.Errorf("nmap output parsing failed: %w", err)
    }

    // Convert to normalized results
    results := l.parseResults(nmapRun)

    return link.Output{
        Results:   results,
        RawOutput: stdout,
        Metadata: map[string]any{
            "scanner": "nmap",
            "version": nmapRun.Version,
        },
    }, nil
}

func (l *NmapLink) parseResults(run NmapRun) []link.Result {
    var results []link.Result
    for _, host := range run.Hosts {
        for _, port := range host.Ports {
            results = append(results, link.Result{
                Type:     "port",
                Target:   host.Address.Addr,
                Finding:  fmt.Sprintf("%d/%s", port.PortID, port.Protocol),
                Severity: "info",
                Metadata: map[string]any{
                    "service": port.Service.Name,
                    "version": port.Service.Version,
                    "state":   port.State.State,
                },
            })
        }
    }
    return results
}
```

## Pattern: Secret Scanner Link

**Use Case**: Credential detection, API key exposure, secret leaks

```go
type NoseyParkerLink struct {
    BinaryPath string
    DatastorePath string
}

func NewNoseyParkerLink(datastorePath string) *NoseyParkerLink {
    return &NoseyParkerLink{
        BinaryPath: "noseyparker",
        DatastorePath: datastorePath,
    }
}

func (l *NoseyParkerLink) Execute(ctx context.Context, input link.Input) (link.Output, error) {
    // Step 1: Scan targets
    scanArgs := []string{
        "scan",
        "--datastore", l.DatastorePath,
        "--json-output", "-",
    }
    scanArgs = append(scanArgs, input.Targets...)

    scanCmd := exec.CommandContext(ctx, l.BinaryPath, scanArgs...)
    if _, err := scanCmd.Output(); err != nil {
        return link.Output{}, fmt.Errorf("noseyparker scan failed: %w", err)
    }

    // Step 2: Report findings
    reportArgs := []string{
        "report",
        "--datastore", l.DatastorePath,
        "--format", "json",
    }

    reportCmd := exec.CommandContext(ctx, l.BinaryPath, reportArgs...)
    stdout, err := reportCmd.Output()
    if err != nil {
        return link.Output{}, fmt.Errorf("noseyparker report failed: %w", err)
    }

    // Parse JSON findings
    var findings NoseyParkerReport
    if err := json.Unmarshal(stdout, &findings); err != nil {
        return link.Output{}, fmt.Errorf("noseyparker parsing failed: %w", err)
    }

    return link.Output{
        Results:   l.parseFindings(findings),
        RawOutput: stdout,
    }, nil
}

func (l *NoseyParkerLink) parseFindings(report NoseyParkerReport) []link.Result {
    var results []link.Result
    for _, finding := range report.Findings {
        results = append(results, link.Result{
            Type:     "secret",
            Target:   finding.Location.Path,
            Finding:  finding.RuleName,
            Severity: l.mapSeverity(finding.RuleName),
            Metadata: map[string]any{
                "line":     finding.Location.Line,
                "snippet":  finding.Snippet,
                "rule_id":  finding.RuleID,
            },
        })
    }
    return results
}
```

## Pattern: Cloud Control Link

**Use Case**: Cloud resource enumeration, configuration assessment

```go
type AWSCloudControlLink struct {
    Region string
    Client *cloudcontrol.Client
}

func (l *AWSCloudControlLink) Execute(ctx context.Context, input link.Input) (link.Output, error) {
    resourceType := input.Options["resource_type"].(string)

    // List resources of specified type
    paginator := cloudcontrol.NewListResourcesPaginator(l.Client, &cloudcontrol.ListResourcesInput{
        TypeName: aws.String(resourceType),
    })

    var results []link.Result
    for paginator.HasMorePages() {
        page, err := paginator.NextPage(ctx)
        if err != nil {
            return link.Output{}, fmt.Errorf("aws list failed: %w", err)
        }

        for _, resource := range page.ResourceDescriptions {
            // Parse resource properties
            var props map[string]any
            json.Unmarshal([]byte(*resource.Properties), &props)

            results = append(results, link.Result{
                Type:     "cloud_resource",
                Target:   *resource.Identifier,
                Finding:  resourceType,
                Severity: "info",
                Metadata: props,
            })
        }
    }

    return link.Output{Results: results}, nil
}
```

## Result Normalization to Tabularium

Scanner results must be normalized to Tabularium schemas for storage:

```go
// Convert link.Result to Tabularium Asset
func ToAsset(result link.Result, accountID string) *tabularium.Asset {
    return &tabularium.Asset{
        Key:       fmt.Sprintf("#asset#%s#%s", result.Type, result.Target),
        DNS:       result.Target,
        Status:    "A",  // Active
        Source:    "scanner",
        Class:     mapResultTypeToClass(result.Type),
        Metadata:  result.Metadata,
    }
}

// Convert link.Result to Tabularium Attribute
func ToAttribute(result link.Result, assetKey string) *tabularium.Attribute {
    return &tabularium.Attribute{
        Key:       fmt.Sprintf("#attribute#%s#%s", assetKey, result.Finding),
        Name:      result.Finding,
        Value:     result.Metadata,
        Source:    "scanner",
        Class:     "technology",
    }
}

// Convert link.Result to Tabularium Risk
func ToRisk(result link.Result, assetKey string) *tabularium.Risk {
    return &tabularium.Risk{
        Key:       fmt.Sprintf("#risk#%s#%s", assetKey, result.Finding),
        Name:      result.Finding,
        Status:    "O",  // Open
        Severity:  mapSeverityToRiskLevel(result.Severity),
        Source:    "scanner",
        Metadata:  result.Metadata,
    }
}

func mapResultTypeToClass(resultType string) string {
    switch resultType {
    case "port":
        return "ipv4"
    case "secret":
        return "repository"
    case "cloud_resource":
        return "cloud"
    default:
        return "unknown"
    }
}
```

## Error Handling Patterns

### Retry with Exponential Backoff

```go
func (l *ScannerLink) ExecuteWithRetry(ctx context.Context, input link.Input) (link.Output, error) {
    maxRetries := 3
    baseDelay := time.Second

    var lastErr error
    for attempt := 0; attempt < maxRetries; attempt++ {
        output, err := l.Execute(ctx, input)
        if err == nil {
            return output, nil
        }

        lastErr = err

        // Check if error is retryable
        if !isRetryable(err) {
            return link.Output{}, err
        }

        // Exponential backoff with jitter
        delay := baseDelay * time.Duration(1<<attempt)
        jitter := time.Duration(rand.Int63n(int64(delay / 2)))

        select {
        case <-ctx.Done():
            return link.Output{}, ctx.Err()
        case <-time.After(delay + jitter):
            // Continue to next attempt
        }
    }

    return link.Output{}, fmt.Errorf("max retries exceeded: %w", lastErr)
}

func isRetryable(err error) bool {
    // Network errors are retryable
    var netErr *net.OpError
    if errors.As(err, &netErr) {
        return true
    }

    // Timeout errors are retryable
    if errors.Is(err, context.DeadlineExceeded) {
        return true
    }

    // Rate limit errors are retryable
    if strings.Contains(err.Error(), "rate limit") {
        return true
    }

    return false
}
```

### Graceful Degradation

```go
func (l *MultiScannerLink) Execute(ctx context.Context, input link.Input) (link.Output, error) {
    var allResults []link.Result
    var errors []error

    // Run multiple scanners, collect partial results
    for _, scanner := range l.Scanners {
        output, err := scanner.Execute(ctx, input)
        if err != nil {
            errors = append(errors, fmt.Errorf("%s: %w", scanner.Name(), err))
            continue // Don't fail entirely
        }
        allResults = append(allResults, output.Results...)
    }

    // Return partial results if at least one scanner succeeded
    if len(allResults) > 0 {
        return link.Output{
            Results: allResults,
            Metadata: map[string]any{
                "partial":  len(errors) > 0,
                "errors":   errors,
            },
        }, nil
    }

    // All scanners failed
    return link.Output{}, fmt.Errorf("all scanners failed: %v", errors)
}
```

## Rate Limiting

```go
type RateLimitedLink struct {
    Inner   link.Link
    Limiter *rate.Limiter
}

func NewRateLimitedLink(inner link.Link, rps int) *RateLimitedLink {
    return &RateLimitedLink{
        Inner:   inner,
        Limiter: rate.NewLimiter(rate.Limit(rps), rps),
    }
}

func (l *RateLimitedLink) Execute(ctx context.Context, input link.Input) (link.Output, error) {
    // Wait for rate limiter
    if err := l.Limiter.Wait(ctx); err != nil {
        return link.Output{}, fmt.Errorf("rate limit wait failed: %w", err)
    }

    return l.Inner.Execute(ctx, input)
}
```

## Configuration Pattern

```go
type ScannerConfig struct {
    BinaryPath  string            `yaml:"binary_path"`
    Timeout     time.Duration     `yaml:"timeout"`
    RateLimit   int               `yaml:"rate_limit"`
    Args        []string          `yaml:"default_args"`
    Environment map[string]string `yaml:"environment"`
}

func LoadConfig(path string) (*ScannerConfig, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("read config failed: %w", err)
    }

    var config ScannerConfig
    if err := yaml.Unmarshal(data, &config); err != nil {
        return nil, fmt.Errorf("parse config failed: %w", err)
    }

    // Set defaults
    if config.Timeout == 0 {
        config.Timeout = 5 * time.Minute
    }
    if config.RateLimit == 0 {
        config.RateLimit = 10
    }

    return &config, nil
}
```

## Testing Scanner Links

```go
func TestNmapLink_Execute(t *testing.T) {
    // Skip if nmap not installed
    if _, err := exec.LookPath("nmap"); err != nil {
        t.Skip("nmap not installed")
    }

    link := NewNmapLink()

    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    output, err := link.Execute(ctx, link.Input{
        Targets: []string{"scanme.nmap.org"},
        Options: map[string]any{
            "ports": "22,80,443",
        },
    })

    require.NoError(t, err)
    assert.NotEmpty(t, output.Results)
    assert.NotEmpty(t, output.RawOutput)
}

func TestNmapLink_ParseResults(t *testing.T) {
    link := NewNmapLink()

    // Test with sample XML
    sampleXML := `<?xml version="1.0"?>
    <nmaprun>
        <host>
            <address addr="192.168.1.1"/>
            <ports>
                <port portid="22" protocol="tcp">
                    <state state="open"/>
                    <service name="ssh" version="OpenSSH 8.0"/>
                </port>
            </ports>
        </host>
    </nmaprun>`

    var run NmapRun
    require.NoError(t, xml.Unmarshal([]byte(sampleXML), &run))

    results := link.parseResults(run)

    require.Len(t, results, 1)
    assert.Equal(t, "22/tcp", results[0].Finding)
    assert.Equal(t, "192.168.1.1", results[0].Target)
}
```

## Integration Checklist

Before deploying a new scanner integration:

- [ ] Link implements `Name()`, `Validate()`, `Execute()`
- [ ] Input validation prevents injection attacks
- [ ] Output parsing handles malformed data gracefully
- [ ] Results normalize to Tabularium Asset/Attribute/Risk
- [ ] Timeout configured to prevent hanging
- [ ] Rate limiting prevents target overload
- [ ] Retry logic handles transient failures
- [ ] Logs include execution metadata
- [ ] Unit tests cover parsing logic
- [ ] Integration tests verify scanner execution

## References

- [modules/nebula/](../../../../modules/nebula/) - Scanner link implementations
- [modules/janus-framework/](../../../../modules/janus-framework/) - Link interface
- [modules/tabularium/](../../../../modules/tabularium/) - Data schemas
- [Nmap Documentation](https://nmap.org/docs.html) - Nmap reference
- [NoseyParker](https://github.com/praetorian-inc/noseyparker) - Secret detection
