---
name: implementing-detection-plugins
description: Use when implementing web vulnerability detection plugins in Go - covers plugin interface design, detection techniques (reflection, blind, OOB), vulnerability categories (XSS, SQLi, SSRF), payload management, and Chariot integration patterns
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, WebFetch, WebSearch
---

# Implementing Web Vulnerability Detection Plugins

**Guide developers in building modular detection plugins that identify web application vulnerabilities through request manipulation, response analysis, and out-of-band (OOB) detection techniques.**

## When to Use

Use this skill when:

- Implementing a new vulnerability detection plugin in Go
- Adding detection capabilities for OWASP Top 10 vulnerabilities
- Integrating detection logic with Chariot's capability framework
- Need guidance on plugin registry patterns or detection techniques

## Quick Reference

| Vulnerability  | Detection Technique      | Key Libraries    |
| -------------- | ------------------------ | ---------------- |
| XSS            | Reflection, DOM analysis | goquery, regexp  |
| SQLi           | Error, time-based, blind | strings, context |
| SSRF           | OOB callbacks            | interactsh       |
| XXE            | OOB callbacks            | interactsh, xml  |
| Cmd Injection  | Reflection, time-based   | strings, context |
| Path Traversal | Response analysis        | strings          |

## Core Concepts

### Plugin Interface Design

Following fingerprintx/go-cicd registry pattern:

```go
type DetectionPlugin interface {
    Name() string
    Category() VulnerabilityCategory  // XSS, SQLi, SSRF, etc.
    Severity() Severity
    Detect(ctx context.Context, target *Target, response *Response) ([]Finding, error)
    Payloads() []Payload  // Attack payloads to inject
}
```

**Registry Pattern:**

```go
// internal/registry/registry.go
var plugins = make(map[string]PluginFactory)

func RegisterPlugin(name string, factory PluginFactory) {
    plugins[name] = factory
}

// plugins/xss/reflected.go
func init() {
    registry.RegisterPlugin("xss-reflected", func() DetectionPlugin {
        return &ReflectedXSSPlugin{}
    })
}
```

**See:** [references/plugin-architecture.md](references/plugin-architecture.md) for complete interface design and registry patterns.

### Detection Techniques

1. **Reflection-based**: Payload appears in response (XSS, SQLi errors)
   - Check response body for injected payload
   - Validate context (HTML, JS, attribute)
   - Evidence: exact payload match

2. **Blind/Time-based**: Response timing differences (Blind SQLi)
   - Measure baseline response time
   - Inject sleep/delay payloads
   - Compare timing delta

3. **Out-of-Band (OOB)**: External callback detection (SSRF, XXE, Blind XSS)
   - Generate unique callback URL (Interactsh)
   - Inject callback into parameters
   - Wait for external interaction

4. **Differential**: Compare responses with/without payload
   - Baseline response without payload
   - Test response with payload
   - Analyze differences (status, headers, body)

**See:** [references/detection-techniques.md](references/detection-techniques.md) for implementation patterns and examples.

### Vulnerability Categories

**OWASP Top 10 Coverage:**

- **XSS (Cross-Site Scripting)**: Reflected, Stored, DOM-based
- **SQLi (SQL Injection)**: Error-based, Union, Blind (time/boolean), Stacked
- **SSRF (Server-Side Request Forgery)**: Internal network access, cloud metadata
- **XXE (XML External Entity)**: XML external entity injection
- **Command Injection**: OS command execution
- **Path Traversal**: File system access
- **Open Redirect**: URL redirection abuse

**See:** [references/vulnerability-patterns.md](references/vulnerability-patterns.md) for category-specific detection patterns.

## Workflow

### Step 1: Define Plugin Interface

```go
type ReflectedXSSPlugin struct {
    config *Config
}

func (p *ReflectedXSSPlugin) Name() string { return "xss-reflected" }
func (p *ReflectedXSSPlugin) Category() VulnerabilityCategory { return VulnXSS }
func (p *ReflectedXSSPlugin) Severity() Severity { return High }
```

### Step 2: Implement Payload Management

```go
func (p *ReflectedXSSPlugin) Payloads() []Payload {
    return []Payload{
        {Input: "<script>alert(1)</script>", Reflection: "<script>alert(1)</script>"},
        {Input: "\"><img src=x onerror=alert(1)>", Reflection: "onerror=alert(1)"},
        // WAF bypass payloads...
    }
}
```

**Payload Strategy:**

- Start with basic payloads
- Add WAF evasion variants
- Context-aware encoding (HTML, JS, URL)
- Systematic testing approach

**See:** [references/payload-management.md](references/payload-management.md) for WAF bypass techniques and encoding strategies.

### Step 3: Implement Detection Logic

```go
func (p *ReflectedXSSPlugin) Detect(ctx context.Context, target *Target, resp *Response) ([]Finding, error) {
    var findings []Finding

    for _, payload := range p.Payloads() {
        // Inject payload into parameters
        modifiedURL := injectPayload(target.URL, payload)

        // Make request
        response, err := http.Get(modifiedURL)
        if err != nil {
            continue
        }

        // Check reflection
        if strings.Contains(response.Body, payload.Reflection) {
            findings = append(findings, Finding{
                Type:        "XSS",
                Severity:    High,
                Confidence:  calculateConfidence(response, payload),
                URL:         modifiedURL,
                Parameter:   param,
                Payload:     payload.Input,
                Evidence:    payload.Reflection,
                Remediation: "Sanitize user input before rendering",
                CWE:         "CWE-79",
            })
        }
    }
    return findings, nil
}
```

### Step 4: Implement OOB Detection (SSRF/XXE)

```go
type SSRFPlugin struct {
    interactsh *interactsh.Client
}

func (p *SSRFPlugin) Detect(ctx context.Context, target *Target, resp *Response) ([]Finding, error) {
    // Generate unique callback URL
    callbackURL := p.interactsh.URL()

    // Inject callback URL into SSRF-susceptible parameters
    for _, param := range target.Parameters {
        modifiedURL := replaceParam(target.URL, param, callbackURL)
        http.Get(modifiedURL)
    }

    // Wait for OOB interactions
    time.Sleep(5 * time.Second)

    interactions := p.interactsh.GetInteractions()
    // Convert interactions to findings...
}
```

**See:** [references/oob-detection.md](references/oob-detection.md) for Interactsh integration and callback handling.

### Step 5: Structure Findings

```go
type Finding struct {
    Type        string    // "XSS", "SQLi", "SSRF"
    Severity    Severity  // Critical, High, Medium, Low
    Confidence  float64   // 0.0-1.0
    URL         string
    Parameter   string
    Payload     string
    Evidence    string
    Remediation string
    CWE         string    // CWE-79, CWE-89, etc.
}
```

**Confidence Scoring:**

- High (0.8-1.0): Clear exploitation evidence
- Medium (0.5-0.8): Suspicious behavior, needs verification
- Low (0.0-0.5): Potential indicator, likely false positive

**See:** [references/confidence-scoring.md](references/confidence-scoring.md) for scoring algorithms.

### Step 6: Integrate with Chariot

**Tabularium Risk Mapping:**

```go
risk := tabularium.Risk{
    Key:         generateRiskKey(finding),
    Name:        finding.Type,
    Severity:    mapSeverity(finding.Severity),
    Description: formatDescription(finding),
    CWE:         finding.CWE,
    Evidence:    finding.Evidence,
}
```

**Capability Pattern:**

- Follow chariot-aegis-capabilities structure
- Output to Tabularium Risk model
- Map findings to CWE/CVE where applicable
- Support Nuclei template format for portability

**See:** [references/chariot-integration.md](references/chariot-integration.md) for complete integration patterns.

## Research Sources

### Primary Tools (MUST Study)

| Tool                    | Purpose                    | Repository                                                                  |
| ----------------------- | -------------------------- | --------------------------------------------------------------------------- |
| **Dalfox**              | XSS scanner                | github.com/hahwul/dalfox                                                    |
| **SQLMap**              | SQLi detection patterns    | github.com/sqlmapproject/sqlmap                                             |
| **Nuclei Templates**    | Detection template library | github.com/projectdiscovery/nuclei-templates/tree/main/http/vulnerabilities |
| **Interactsh**          | OOB detection service      | github.com/projectdiscovery/interactsh                                      |
| **OWASP Testing Guide** | Security testing methods   | owasp.org/www-project-web-security-testing-guide                            |

### Key Files to Study

- `dalfox/pkg/scanning/` - XSS detection logic
- `dalfox/pkg/model/payload.go` - Payload management
- `nuclei-templates/http/vulnerabilities/` - Detection patterns
- `sqlmap/lib/core/common.py` - SQLi techniques (Python but patterns apply)

### Go Libraries

```go
import (
    "github.com/projectdiscovery/interactsh"      // OOB detection
    "github.com/PuerkitoBio/goquery"              // Response parsing
    "regexp"                                       // Pattern matching
    "strings"                                      // Payload reflection
    "bytes"                                        // Response analysis
)
```

## Checklist

Before completing plugin implementation, verify:

- [ ] Plugin interface with registry pattern
- [ ] XSS detection (reflected, stored indicators)
- [ ] SQLi detection (error, time-based)
- [ ] SSRF detection with OOB callbacks
- [ ] Parameter injection strategies
- [ ] WAF evasion payload variants
- [ ] Confidence scoring for findings
- [ ] Evidence collection for verification
- [ ] Rate limiting per-target
- [ ] False positive reduction logic
- [ ] Integration with Tabularium Risk model
- [ ] CWE/CVE mapping where applicable
- [ ] Nuclei template compatibility

## Anti-Patterns

**Avoid these common mistakes:**

❌ **Hardcoded payloads only** - Need WAF bypass variants and context-aware encoding

❌ **No OOB detection** - Misses blind vulnerabilities (SSRF, XXE, Blind XSS)

❌ **Single injection point** - Test all parameters (URL, headers, body, cookies)

❌ **No confidence scoring** - All findings treated equally, high false positive rate

❌ **Ignoring encoding contexts** - Payload works in HTML but not JS or URL contexts

❌ **No deduplication** - Same vulnerability reported multiple times per target

❌ **Missing rate limiting** - Overwhelming target with excessive requests

❌ **Insufficient evidence** - Can't reproduce finding from evidence alone

## Related Skills

| Skill                                    | Purpose                               |
| ---------------------------------------- | ------------------------------------- |
| `enforcing-go-capability-architecture`   | Chariot capability structure patterns |
| `orchestrating-fingerprintx-development` | Registry and plugin patterns          |
| `implementing-go-plugin-registries`      | Plugin discovery and registration     |
| `integrating-standalone-capabilities`    | Integrating with Chariot platform     |

## References

- [Plugin Architecture](references/plugin-architecture.md) - Complete interface design and registry patterns
- [Detection Techniques](references/detection-techniques.md) - Implementation patterns for each technique
- [Vulnerability Patterns](references/vulnerability-patterns.md) - Category-specific detection patterns
- [Payload Management](references/payload-management.md) - WAF bypass and encoding strategies
- [OOB Detection](references/oob-detection.md) - Interactsh integration and callback handling
- [Confidence Scoring](references/confidence-scoring.md) - Scoring algorithms and calibration
- [Chariot Integration](references/chariot-integration.md) - Tabularium mapping and capability patterns
