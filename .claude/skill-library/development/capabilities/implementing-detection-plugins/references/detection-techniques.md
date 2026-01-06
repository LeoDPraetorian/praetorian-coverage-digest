# Detection Techniques

**Implementation patterns for reflection-based, blind, time-based, and OOB detection.**

## Reflection-Based Detection

### Basic Pattern

Payload appears directly in HTTP response.

```go
func (p *ReflectedXSSPlugin) detectReflection(ctx context.Context, target *Target) ([]Finding, error) {
    var findings []Finding

    for _, payload := range p.Payloads() {
        // Inject into each parameter
        for paramName, paramValue := range target.Parameters {
            modifiedParams := copyParams(target.Parameters)
            modifiedParams[paramName] = payload.Input

            resp, err := makeRequest(ctx, target, modifiedParams)
            if err != nil {
                continue
            }

            // Check for reflection
            if strings.Contains(resp.Body, payload.Reflection) {
                findings = append(findings, Finding{
                    Type:       "XSS",
                    Severity:   High,
                    Confidence: calculateReflectionConfidence(resp, payload),
                    Parameter:  paramName,
                    Payload:    payload.Input,
                    Evidence:   extractEvidence(resp.Body, payload.Reflection),
                })
            }
        }
    }
    return findings, nil
}
```

### Context Validation

Verify payload is in exploitable context (not encoded or sanitized):

```go
func calculateReflectionConfidence(resp *Response, payload Payload) float64 {
    evidence := extractEvidence(resp.Body, payload.Reflection)

    // Check if payload is in executable context
    if isInScriptTag(evidence) || isInEventHandler(evidence) {
        return 0.9 // High confidence - directly executable
    }

    if isHTMLEncoded(evidence) || isJSEncoded(evidence) {
        return 0.3 // Low confidence - encoded/sanitized
    }

    return 0.6 // Medium - reflected but context unclear
}
```

## Blind/Time-Based Detection

### Time-Based SQLi Pattern

```go
func (p *TimeBasedSQLiPlugin) detectTimeBased(ctx context.Context, target *Target) ([]Finding, error) {
    // Measure baseline response time
    baseline := measureBaseline(ctx, target, 3) // 3 requests for average

    var findings []Finding
    for _, payload := range p.TimeBasedPayloads() {
        for paramName := range target.Parameters {
            modifiedParams := copyParams(target.Parameters)
            modifiedParams[paramName] = payload.Input

            start := time.Now()
            resp, err := makeRequest(ctx, target, modifiedParams)
            elapsed := time.Since(start)

            if err == nil && elapsed > baseline+(payload.ExpectedDelay*80/100) {
                // Response took ~expected delay longer than baseline
                findings = append(findings, Finding{
                    Type:       "SQLi",
                    Severity:   High,
                    Confidence: 0.8,
                    Parameter:  paramName,
                    Payload:    payload.Input,
                    Evidence:   fmt.Sprintf("Response time: %v (baseline: %v, expected delay: %v)",
                        elapsed, baseline, payload.ExpectedDelay),
                })
            }
        }
    }
    return findings, nil
}

func measureBaseline(ctx context.Context, target *Target, samples int) time.Duration {
    var total time.Duration
    for i := 0; i < samples; i++ {
        start := time.Now()
        makeRequest(ctx, target, target.Parameters)
        total += time.Since(start)
    }
    return total / time.Duration(samples)
}

type TimeBasedPayload struct {
    Input         string
    ExpectedDelay time.Duration
}

func (p *TimeBasedSQLiPlugin) TimeBasedPayloads() []TimeBasedPayload {
    return []TimeBasedPayload{
        {Input: "1' AND SLEEP(5)--", ExpectedDelay: 5 * time.Second},
        {Input: "1' WAITFOR DELAY '0:0:5'--", ExpectedDelay: 5 * time.Second},
        {Input: "1' OR pg_sleep(5)--", ExpectedDelay: 5 * time.Second},
    }
}
```

## Out-of-Band (OOB) Detection

### Interactsh Integration

```go
import "github.com/projectdiscovery/interactsh/pkg/client"

type OOBPlugin struct {
    interactsh *client.Client
}

func (p *OOBPlugin) Initialize() error {
    opts := client.DefaultOptions()
    opts.ServerURL = "oast.pro" // or self-hosted

    interactshClient, err := client.New(opts)
    if err != nil {
        return err
    }

    p.interactsh = interactshClient
    return nil
}

func (p *OOBPlugin) detectSSRF(ctx context.Context, target *Target) ([]Finding, error) {
    // Generate unique callback URL per parameter
    callbacks := make(map[string]string) // paramName -> callbackURL

    for paramName := range target.Parameters {
        callbackURL := p.interactsh.URL()
        callbacks[paramName] = callbackURL

        // Inject callback into parameter
        modifiedParams := copyParams(target.Parameters)
        modifiedParams[paramName] = callbackURL

        makeRequest(ctx, target, modifiedParams)
    }

    // Wait for interactions
    time.Sleep(5 * time.Second)

    // Collect interactions
    interactions := p.interactsh.GetInteractions()

    var findings []Finding
    for _, interaction := range interactions {
        // Match interaction back to parameter
        for paramName, callbackURL := range callbacks {
            if strings.Contains(interaction.UniqueID, extractUniqueID(callbackURL)) {
                findings = append(findings, Finding{
                    Type:       "SSRF",
                    Severity:   Critical,
                    Confidence: 0.95,
                    Parameter:  paramName,
                    Evidence:   fmt.Sprintf("OOB callback received: %s", interaction.Protocol),
                })
            }
        }
    }

    return findings, nil
}
```

### XXE with OOB

```go
func (p *XXEPlugin) Payloads() []Payload {
    callbackURL := p.interactsh.URL()

    return []Payload{
        {
            Input: fmt.Sprintf(`<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY xxe SYSTEM "http://%s">
]>
<root>&xxe;</root>`, callbackURL),
            Reflection: "", // OOB, no direct reflection
        },
    }
}
```

## Differential Analysis

### Compare Baseline vs Attack Response

```go
func (p *DifferentialPlugin) detectDifference(ctx context.Context, target *Target) ([]Finding, error) {
    // Baseline request (no payload)
    baselineResp, _ := makeRequest(ctx, target, target.Parameters)

    var findings []Finding
    for _, payload := range p.Payloads() {
        for paramName := range target.Parameters {
            modifiedParams := copyParams(target.Parameters)
            modifiedParams[paramName] = payload.Input

            attackResp, err := makeRequest(ctx, target, modifiedParams)
            if err != nil {
                continue
            }

            // Compare responses
            if isDifferent(baselineResp, attackResp) {
                findings = append(findings, Finding{
                    Type:       "Injection",
                    Confidence: 0.6,
                    Parameter:  paramName,
                    Evidence:   describeeDifference(baselineResp, attackResp),
                })
            }
        }
    }
    return findings, nil
}

func isDifferent(baseline, attack *Response) bool {
    // Status code change
    if baseline.StatusCode != attack.StatusCode {
        return true
    }

    // Significant body length difference
    lenDiff := math.Abs(float64(len(baseline.Body) - len(attack.Body)))
    if lenDiff > float64(len(baseline.Body))*0.1 {
        return true
    }

    return false
}
```

## Error-Based Detection

### SQLi Error Signatures

```go
var sqlErrorPatterns = []string{
    "SQL syntax.*MySQL",
    "Warning.*mysql_.*",
    "valid MySQL result",
    "PostgreSQL.*ERROR",
    "Warning.*pg_.*",
    "Microsoft OLE DB Provider for ODBC",
    "Microsoft OLE DB Provider for SQL Server",
    "ORA-[0-9]+",
    "SQLite/JDBCDriver",
    "SQLite.Exception",
}

func detectSQLErrors(response *Response) bool {
    for _, pattern := range sqlErrorPatterns {
        if matched, _ := regexp.MatchString(pattern, response.Body); matched {
            return true
        }
    }
    return false
}
```

## Best Practices

1. **Baseline Measurement**: Always measure baseline before time-based detection
2. **Unique Identifiers**: Use unique callback URLs per parameter for OOB
3. **Context Awareness**: Validate exploitability context, not just reflection
4. **Error Handling**: Network errors ≠ absence of vulnerability
5. **Rate Limiting**: Respect target with delays between requests
