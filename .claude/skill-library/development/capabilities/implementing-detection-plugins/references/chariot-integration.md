# Chariot Integration

**Tabularium Risk model mapping and capability framework patterns.**

## Tabularium Risk Model Mapping

### Finding to Risk Conversion

```go
import "your/project/tabularium"

func convertToTabulariumRisk(finding Finding, asset tabularium.Asset) tabularium.Risk {
    return tabularium.Risk{
        Key:         generateRiskKey(finding, asset),
        Name:        formatRiskName(finding),
        Class:       mapToRiskClass(finding.Type),
        Severity:    mapSeverity(finding.Severity),
        Status:      "A", // Active
        Source:      "detection-plugin",
        Description: formatDescription(finding),
        DNS:         asset.DNS,
        Meta: tabularium.RiskMeta{
            CWE:         finding.CWE,
            Evidence:    finding.Evidence,
            Payload:     finding.Payload,
            Parameter:   finding.Parameter,
            Confidence:  fmt.Sprintf("%.2f", finding.Confidence),
            Remediation: finding.Remediation,
        },
    }
}

func generateRiskKey(finding Finding, asset tabularium.Asset) string {
    // Unique key: asset + vuln type + parameter
    h := sha256.New()
    h.Write([]byte(asset.Key))
    h.Write([]byte(finding.Type))
    h.Write([]byte(finding.Parameter))
    return fmt.Sprintf("#risk#%x", h.Sum(nil)[:16])
}

func mapToRiskClass(vulnType string) string {
    mapping := map[string]string{
        "XSS":             "xss",
        "SQLi":            "sqli",
        "SSRF":            "ssrf",
        "XXE":             "xxe",
        "Command Injection": "command-injection",
        "Path Traversal":  "path-traversal",
        "Open Redirect":   "open-redirect",
    }
    if class, ok := mapping[vulnType]; ok {
        return class
    }
    return "generic-vulnerability"
}

func mapSeverity(severity Severity) string {
    switch severity {
    case Critical:
        return "critical"
    case High:
        return "high"
    case Medium:
        return "medium"
    case Low:
        return "low"
    default:
        return "info"
    }
}

func formatDescription(finding Finding) string {
    return fmt.Sprintf(
        "%s vulnerability detected in parameter '%s'. "+
        "Payload: %s. Evidence: %s. Confidence: %.2f. "+
        "Remediation: %s",
        finding.Type,
        finding.Parameter,
        finding.Payload,
        finding.Evidence,
        finding.Confidence,
        finding.Remediation,
    )
}
```

## Capability Pattern Integration

### Following chariot-aegis-capabilities Structure

```
plugins/
├── cmd/
│   └── scanner/
│       └── main.go              # CLI entry point
├── pkg/
│   ├── scanner/
│   │   └── scanner.go           # Main scanner logic
│   ├── plugins/
│   │   ├── xss/
│   │   │   ├── reflected.go
│   │   │   └── stored.go
│   │   ├── sqli/
│   │   │   ├── error.go
│   │   │   └── timebased.go
│   │   └── ssrf/
│   │       └── ssrf.go
│   └── registry/
│       └── registry.go          # Plugin registry
└── go.mod
```

### Capability Wrapper

```go
// pkg/scanner/scanner.go
package scanner

import (
    "context"
    "your/project/pkg/registry"
    "your/project/tabularium"
)

type Scanner struct {
    plugins []registry.DetectionPlugin
    config  *Config
}

func New(config *Config) *Scanner {
    // Load all registered plugins
    var plugins []registry.DetectionPlugin
    for _, name := range registry.ListPlugins() {
        plugin, _ := registry.GetPlugin(name)
        plugins = append(plugins, plugin)
    }

    return &Scanner{
        plugins: plugins,
        config:  config,
    }
}

func (s *Scanner) Scan(ctx context.Context, target *Target) ([]tabularium.Risk, error) {
    var allFindings []Finding

    // Run all plugins
    for _, plugin := range s.plugins {
        findings, err := plugin.Detect(ctx, target, nil)
        if err != nil {
            continue // Log error but continue with other plugins
        }
        allFindings = append(allFindings, findings...)
    }

    // Convert findings to Tabularium risks
    risks := make([]tabularium.Risk, 0, len(allFindings))
    asset := resolveAsset(target) // Resolve target to Asset
    for _, finding := range allFindings {
        risk := convertToTabulariumRisk(finding, asset)
        risks = append(risks, risk)
    }

    return risks, nil
}
```

## Nuclei Template Compatibility

### Exporting to Nuclei Format

```go
func exportToNucleiTemplate(finding Finding) string {
    template := fmt.Sprintf(`id: %s

info:
  name: %s
  author: detection-plugin
  severity: %s
  description: %s
  reference:
    - %s

http:
  - method: GET
    path:
      - "{{BaseURL}}%s"

    matchers:
      - type: word
        words:
          - "%s"
        part: body
`,
        generateTemplateID(finding),
        finding.Type,
        strings.ToLower(finding.Severity.String()),
        finding.Remediation,
        fmt.Sprintf("CWE-%s", finding.CWE),
        buildPath(finding),
        finding.Reflection,
    )
    return template
}

func generateTemplateID(finding Finding) string {
    // Generate unique ID: vuln-type-parameter-hash
    h := sha256.New()
    h.Write([]byte(finding.Parameter + finding.Payload))
    hash := fmt.Sprintf("%x", h.Sum(nil)[:8])
    return fmt.Sprintf("%s-%s-%s",
        strings.ToLower(finding.Type),
        finding.Parameter,
        hash,
    )
}
```

## Interactsh Integration

### OOB Detection Service

```go
import "github.com/projectdiscovery/interactsh/pkg/client"

type InteractshManager struct {
    client *client.Client
}

func NewInteractshManager(serverURL string) (*InteractshManager, error) {
    opts := client.DefaultOptions()
    if serverURL != "" {
        opts.ServerURL = serverURL
    }

    interactshClient, err := client.New(opts)
    if err != nil {
        return nil, err
    }

    return &InteractshManager{client: interactshClient}, nil
}

func (m *InteractshManager) GenerateCallback() string {
    return m.client.URL()
}

func (m *InteractshManager) GetInteractions() []*client.Interaction {
    return m.client.GetInteractions()
}

func (m *InteractshManager) Close() {
    if m.client != nil {
        m.client.Close()
    }
}
```

### Using in Plugins

```go
type SSRFPlugin struct {
    interactsh *InteractshManager
}

func (p *SSRFPlugin) Detect(ctx context.Context, target *Target, resp *Response) ([]Finding, error) {
    if p.interactsh == nil {
        return nil, fmt.Errorf("interactsh not initialized")
    }

    callbackURL := p.interactsh.GenerateCallback()

    // Inject callback URL
    for paramName, paramValue := range target.Parameters {
        modifiedParams := copyParams(target.Parameters)
        modifiedParams[paramName] = callbackURL

        _, _ = makeRequest(ctx, target, modifiedParams)
    }

    // Wait for interactions
    time.Sleep(5 * time.Second)

    // Check for callbacks
    interactions := p.interactsh.GetInteractions()
    var findings []Finding
    for _, interaction := range interactions {
        if strings.Contains(interaction.UniqueID, extractCallbackID(callbackURL)) {
            findings = append(findings, Finding{
                Type:       "SSRF",
                Severity:   Critical,
                Confidence: 0.95,
                Evidence:   fmt.Sprintf("OOB callback: %s", interaction.Protocol),
            })
        }
    }

    return findings, nil
}
```

## CLI Integration

### Command-Line Interface

```go
// cmd/scanner/main.go
package main

import (
    "context"
    "flag"
    "fmt"
    "os"

    "your/project/pkg/scanner"
)

func main() {
    targetURL := flag.String("url", "", "Target URL to scan")
    outputFormat := flag.String("format", "json", "Output format: json, nuclei, tabularium")
    plugins := flag.String("plugins", "all", "Comma-separated plugin names or 'all'")
    flag.Parse()

    if *targetURL == "" {
        fmt.Fprintf(os.Stderr, "Error: -url is required\n")
        os.Exit(1)
    }

    // Initialize scanner
    config := &scanner.Config{
        Timeout:   30 * time.Second,
        EnableOOB: true,
    }
    s := scanner.New(config)

    // Scan target
    target := &scanner.Target{URL: *targetURL}
    risks, err := s.Scan(context.Background(), target)
    if err != nil {
        fmt.Fprintf(os.Stderr, "Scan error: %v\n", err)
        os.Exit(1)
    }

    // Output results
    switch *outputFormat {
    case "json":
        outputJSON(risks)
    case "nuclei":
        outputNuclei(risks)
    case "tabularium":
        outputTabularium(risks)
    }
}
```

## Best Practices

1. **Risk Deduplication**: Use consistent key generation to avoid duplicate risks
2. **Severity Mapping**: Follow Tabularium severity standards (critical, high, medium, low)
3. **Evidence Collection**: Include full context for verification and remediation
4. **CWE Mapping**: Map vulnerabilities to CWE IDs for standardization
5. **Template Export**: Support Nuclei format for portability across scanning tools
6. **OOB Lifecycle**: Initialize Interactsh once, reuse across plugins, close on shutdown
