# Extractor Implementation

**Extractor engine for regex/kval/json/xpath data extraction from responses.**

## Overview

Extractors pull structured data from HTTP responses for use in subsequent requests or reporting. Nuclei supports multiple extraction methods optimized for different data formats.

**Primary source:** `github.com/projectdiscovery/nuclei` - `pkg/extractors/extract.go`

## Extractor Types

### 1. Regex Extractor

Extract data using regular expressions with capture groups:

```go
type RegexExtractor struct {
    Regex    []string
    Patterns []*regexp.Regexp // Pre-compiled
    Part     string           // body, header, all
    Group    int              // Capture group index (0 = full match)
}

func (e *RegexExtractor) Extract(response *Response) []string {
    var text string
    switch e.Part {
    case "body":
        text = response.Body
    case "header":
        text = formatHeaders(response.Headers)
    default:
        text = response.Body + formatHeaders(response.Headers)
    }

    var results []string
    for _, pattern := range e.Patterns {
        matches := pattern.FindAllStringSubmatch(text, -1)
        for _, match := range matches {
            if e.Group >= len(match) {
                continue
            }
            results = append(results, match[e.Group])
        }
    }

    return results
}
```

### 2. KVal Extractor

Extract key-value pairs from headers or structured text:

```go
type KValExtractor struct {
    KVal []string // Keys to extract
    Part string   // header, cookie, body
}

func (e *KValExtractor) Extract(response *Response) []string {
    var results []string

    switch e.Part {
    case "header":
        for _, key := range e.KVal {
            if value, ok := response.Headers[key]; ok {
                results = append(results, value)
            }
        }

    case "cookie":
        cookies := parseCookies(response.Headers["Set-Cookie"])
        for _, key := range e.KVal {
            if value, ok := cookies[key]; ok {
                results = append(results, value)
            }
        }

    case "body":
        // Extract key=value patterns from body
        for _, key := range e.KVal {
            pattern := regexp.MustCompile(fmt.Sprintf(`%s[:=]\s*([^\s&;]+)`, regexp.QuoteMeta(key)))
            matches := pattern.FindAllStringSubmatch(response.Body, -1)
            for _, match := range matches {
                if len(match) > 1 {
                    results = append(results, match[1])
                }
            }
        }
    }

    return results
}

func parseCookies(setCookie string) map[string]string {
    cookies := make(map[string]string)
    parts := strings.Split(setCookie, ";")

    for _, part := range parts {
        kv := strings.SplitN(strings.TrimSpace(part), "=", 2)
        if len(kv) == 2 {
            cookies[kv[0]] = kv[1]
        }
    }

    return cookies
}
```

### 3. JSON Extractor

Extract data using JSONPath expressions:

```go
import "github.com/tidwall/gjson"

type JSONExtractor struct {
    JSON []string // JSONPath expressions: "$.user.id"
    Part string
}

func (e *JSONExtractor) Extract(response *Response) []string {
    var jsonText string
    switch e.Part {
    case "body":
        jsonText = response.Body
    case "header":
        // Convert headers to JSON
        jsonText = headersToJSON(response.Headers)
    default:
        jsonText = response.Body
    }

    var results []string
    for _, path := range e.JSON {
        result := gjson.Get(jsonText, path)

        if result.IsArray() {
            result.ForEach(func(_, value gjson.Result) bool {
                results = append(results, value.String())
                return true
            })
        } else if result.Exists() {
            results = append(results, result.String())
        }
    }

    return results
}

func headersToJSON(headers map[string]string) string {
    data, _ := json.Marshal(headers)
    return string(data)
}
```

### 4. XPath Extractor

Extract data from XML/HTML using XPath:

```go
import (
    "github.com/antchfx/htmlquery"
    "github.com/antchfx/xmlquery"
    "golang.org/x/net/html"
)

type XPathExtractor struct {
    XPath []string // XPath expressions: "//div[@class='user']/text()"
    Part  string
}

func (e *XPathExtractor) Extract(response *Response) []string {
    var doc *html.Node
    var err error

    // Try parsing as HTML first
    doc, err = html.Parse(strings.NewReader(response.Body))
    if err != nil {
        // Fall back to XML parsing
        xmlDoc, err := xmlquery.Parse(strings.NewReader(response.Body))
        if err != nil {
            return nil
        }
        return e.extractFromXML(xmlDoc)
    }

    return e.extractFromHTML(doc)
}

func (e *XPathExtractor) extractFromHTML(doc *html.Node) []string {
    var results []string

    for _, xpath := range e.XPath {
        nodes, err := htmlquery.QueryAll(doc, xpath)
        if err != nil {
            continue
        }

        for _, node := range nodes {
            text := htmlquery.InnerText(node)
            if text != "" {
                results = append(results, text)
            }
        }
    }

    return results
}

func (e *XPathExtractor) extractFromXML(doc *xmlquery.Node) []string {
    var results []string

    for _, xpath := range e.XPath {
        nodes, err := xmlquery.QueryAll(doc, xpath)
        if err != nil {
            continue
        }

        for _, node := range nodes {
            results = append(results, node.InnerText())
        }
    }

    return results
}
```

## Extractor Interface

```go
type Extractor interface {
    Extract(response *Response) []string
    Type() ExtractorType
    Name() string // Variable name for extracted data
}

type ExtractorType string

const (
    TypeRegex ExtractorType = "regex"
    TypeKVal  ExtractorType = "kval"
    TypeJSON  ExtractorType = "json"
    TypeXPath ExtractorType = "xpath"
)

type ExtractedData struct {
    Name   string
    Values []string
}
```

## Extractor Factory

```go
func CreateExtractor(config ExtractorConfig) (Extractor, error) {
    switch config.Type {
    case TypeRegex:
        patterns := make([]*regexp.Regexp, 0, len(config.Regex))
        for _, pattern := range config.Regex {
            re, err := regexp.Compile(pattern)
            if err != nil {
                return nil, fmt.Errorf("invalid regex %q: %w", pattern, err)
            }
            patterns = append(patterns, re)
        }
        return &RegexExtractor{
            Regex:    config.Regex,
            Patterns: patterns,
            Part:     config.Part,
            Group:    config.Group,
        }, nil

    case TypeKVal:
        return &KValExtractor{
            KVal: config.KVal,
            Part: config.Part,
        }, nil

    case TypeJSON:
        return &JSONExtractor{
            JSON: config.JSON,
            Part: config.Part,
        }, nil

    case TypeXPath:
        return &XPathExtractor{
            XPath: config.XPath,
            Part:  config.Part,
        }, nil

    default:
        return nil, fmt.Errorf("unknown extractor type: %s", config.Type)
    }
}
```

## Template Examples

### Extract API Token from JSON

```yaml
extractors:
  - type: json
    name: api_token
    json:
      - "$.data.token"
      - "$.auth.access_token"
```

### Extract Session Cookie

```yaml
extractors:
  - type: kval
    name: session_id
    part: cookie
    kval:
      - "PHPSESSID"
      - "session"
```

### Extract CSRF Token from HTML

```yaml
extractors:
  - type: regex
    name: csrf_token
    regex:
      - 'name="csrf_token" value="([^"]+)"'
    group: 1
```

### Extract User IDs from XML

```yaml
extractors:
  - type: xpath
    name: user_ids
    xpath:
      - "//user/@id"
      - "//users/user/id/text()"
```

## Using Extracted Data

### Store in Variable Context

```go
type VariableContext struct {
    Variables map[string][]string
    mu        sync.RWMutex
}

func (ctx *VariableContext) Store(name string, values []string) {
    ctx.mu.Lock()
    defer ctx.mu.Unlock()
    ctx.Variables[name] = values
}

func (ctx *VariableContext) Get(name string) ([]string, bool) {
    ctx.mu.RLock()
    defer ctx.mu.RUnlock()
    values, ok := ctx.Variables[name]
    return values, ok
}

// Use in subsequent requests
func interpolateExtractedData(expr string, ctx *VariableContext) string {
    re := regexp.MustCompile(`\{\{([^}]+)\}\}`)
    return re.ReplaceAllStringFunc(expr, func(match string) string {
        varName := strings.Trim(match, "{} ")
        if values, ok := ctx.Get(varName); ok && len(values) > 0 {
            return values[0] // Use first value
        }
        return match
    })
}
```

### Chain Requests with Extracted Data

```yaml
# Request 1: Login and extract session
http:
  - method: POST
    path:
      - "{{BaseURL}}/login"
    body: "username=admin&password=admin"
    extractors:
      - type: kval
        name: session_id
        part: cookie
        kval:
          - "SESSIONID"

  # Request 2: Use extracted session
  - method: GET
    path:
      - "{{BaseURL}}/admin/dashboard"
    headers:
      Cookie: "SESSIONID={{session_id}}"
```

## Performance Optimization

### Lazy Extraction

Only extract when variables are needed:

```go
type LazyExtractor struct {
    extractor Extractor
    response  *Response
    cached    []string
    extracted bool
    mu        sync.Mutex
}

func (e *LazyExtractor) Extract() []string {
    e.mu.Lock()
    defer e.mu.Unlock()

    if e.extracted {
        return e.cached
    }

    e.cached = e.extractor.Extract(e.response)
    e.extracted = true
    return e.cached
}
```

### Parallel Extraction

Run multiple extractors concurrently:

```go
func ExtractAll(extractors []Extractor, response *Response) map[string][]string {
    results := make(map[string][]string)
    var mu sync.Mutex
    var wg sync.WaitGroup

    for _, ext := range extractors {
        wg.Add(1)
        go func(e Extractor) {
            defer wg.Done()
            values := e.Extract(response)

            mu.Lock()
            results[e.Name()] = values
            mu.Unlock()
        }(ext)
    }

    wg.Wait()
    return results
}
```

## Error Handling

```go
type ExtractionError struct {
    ExtractorName string
    ExtractorType ExtractorType
    Err           error
}

func (e *ExtractionError) Error() string {
    return fmt.Sprintf("extractor %q (type=%s): %v", e.ExtractorName, e.ExtractorType, e.Err)
}

func SafeExtract(ext Extractor, response *Response) ([]string, error) {
    defer func() {
        if r := recover(); r != nil {
            log.Errorf("Panic in extractor %s: %v", ext.Name(), r)
        }
    }()

    values := ext.Extract(response)
    if len(values) == 0 {
        return nil, &ExtractionError{
            ExtractorName: ext.Name(),
            ExtractorType: ext.Type(),
            Err:           fmt.Errorf("no values extracted"),
        }
    }

    return values, nil
}
```

## Result Formatting

### Deduplicate Results

```go
func deduplicate(values []string) []string {
    seen := make(map[string]bool)
    result := make([]string, 0, len(values))

    for _, value := range values {
        if !seen[value] {
            seen[value] = true
            result = append(result, value)
        }
    }

    return result
}
```

### Limit Result Size

```go
func limitResults(values []string, maxResults int) []string {
    if len(values) <= maxResults {
        return values
    }
    return values[:maxResults]
}
```

## Integration with Nuclei

**Study these Nuclei files:**

- `pkg/extractors/extract.go` - Core extractor interface
- `pkg/operators/extractors/compile.go` - Extractor compilation
- `pkg/protocols/common/extractors/` - Extractor implementations
- `pkg/protocols/common/variables/variables.go` - Variable storage and interpolation

**Key patterns:**

- Extractors run after matchers succeed
- Extracted variables available in subsequent requests
- Support for internal (not exported) vs external extractors
- Extractor results included in scan output
