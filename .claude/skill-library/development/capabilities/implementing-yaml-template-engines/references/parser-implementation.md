# Parser Implementation

**YAML parsing with gopkg.in/yaml.v3 including schema validation and line number preservation.**

## Overview

The parser transforms YAML template files into internal AST (Abstract Syntax Tree) structures. Nuclei uses `gopkg.in/yaml.v3` for parsing because it preserves node positions for accurate error reporting.

**Primary source:** `github.com/projectdiscovery/nuclei` - `pkg/templates/compile.go`

## Core Parser Structure

```go
import (
    "fmt"
    "gopkg.in/yaml.v3"
)

type Template struct {
    ID   string `yaml:"id"`
    Info Info   `yaml:"info"`
    HTTP []HTTPRequest `yaml:"http,omitempty"`
    DNS  []DNSRequest  `yaml:"dns,omitempty"`
    // ... other protocol sections
}

type Info struct {
    Name        string   `yaml:"name"`
    Author      string   `yaml:"author"`
    Severity    string   `yaml:"severity"`
    Description string   `yaml:"description,omitempty"`
    Tags        []string `yaml:"tags,flow,omitempty"`
}

func ParseTemplate(data []byte) (*Template, error) {
    var template Template

    decoder := yaml.NewDecoder(bytes.NewReader(data))
    decoder.KnownFields(true) // Strict mode - reject unknown fields

    if err := decoder.Decode(&template); err != nil {
        return nil, &ParseError{
            Message: fmt.Sprintf("failed to parse template: %v", err),
            Line:    extractLineNumber(err),
        }
    }

    return &template, nil
}
```

## Line Number Preservation

**Critical for error reporting.** YAML v3 preserves node positions:

```go
type ParseError struct {
    File    string
    Line    int
    Column  int
    Message string
}

func (e *ParseError) Error() string {
    if e.File != "" {
        return fmt.Sprintf("%s:%d:%d: %s", e.File, e.Line, e.Column, e.Message)
    }
    return fmt.Sprintf("line %d:%d: %s", e.Line, e.Column, e.Message)
}

// Extract line number from yaml.v3 errors
func extractLineNumber(err error) int {
    if yamlErr, ok := err.(*yaml.TypeError); ok {
        // yaml.v3 provides line numbers in error strings
        // Parse "line X: error message" format
        return parseLineFromError(yamlErr.Errors[0])
    }
    return 0
}

// Custom unmarshaler with position tracking
func (t *Template) UnmarshalYAML(node *yaml.Node) error {
    // node.Line and node.Column available for precise errors
    type rawTemplate Template
    if err := node.Decode((*rawTemplate)(t)); err != nil {
        return &ParseError{
            Line:    node.Line,
            Column:  node.Column,
            Message: err.Error(),
        }
    }
    return nil
}
```

## Schema Validation

**Validate during parsing to fail fast:**

```go
func (t *Template) Validate() error {
    var errs []error

    // Required fields
    if t.ID == "" {
        errs = append(errs, fmt.Errorf("template id is required"))
    }

    if t.Info.Name == "" {
        errs = append(errs, fmt.Errorf("template info.name is required"))
    }

    // Severity validation
    validSeverities := map[string]bool{
        "info": true, "low": true, "medium": true,
        "high": true, "critical": true,
    }
    if !validSeverities[t.Info.Severity] {
        errs = append(errs, fmt.Errorf("invalid severity: %s", t.Info.Severity))
    }

    // At least one protocol section
    if len(t.HTTP) == 0 && len(t.DNS) == 0 {
        errs = append(errs, fmt.Errorf("template must have at least one protocol section"))
    }

    // Validate HTTP requests
    for i, req := range t.HTTP {
        if err := req.Validate(); err != nil {
            errs = append(errs, fmt.Errorf("http[%d]: %w", i, err))
        }
    }

    if len(errs) > 0 {
        return &ValidationError{Errors: errs}
    }
    return nil
}

type ValidationError struct {
    Errors []error
}

func (e *ValidationError) Error() string {
    var msgs []string
    for _, err := range e.Errors {
        msgs = append(msgs, err.Error())
    }
    return strings.Join(msgs, "; ")
}
```

## Strict vs Lenient Parsing

**Nuclei pattern:** Start strict, loosen as needed.

```go
// Strict mode (recommended for new templates)
func ParseStrict(data []byte) (*Template, error) {
    decoder := yaml.NewDecoder(bytes.NewReader(data))
    decoder.KnownFields(true) // Reject unknown fields

    var t Template
    if err := decoder.Decode(&t); err != nil {
        return nil, err
    }
    return &t, nil
}

// Lenient mode (backward compatibility)
func ParseLenient(data []byte) (*Template, error) {
    decoder := yaml.NewDecoder(bytes.NewReader(data))
    decoder.KnownFields(false) // Allow unknown fields

    var t Template
    if err := decoder.Decode(&t); err != nil {
        return nil, err
    }
    return &t, nil
}
```

## Common Parsing Patterns

### Flow vs Block Style

```go
// YAML supports two styles:

// Flow style (inline arrays)
type Info struct {
    Tags []string `yaml:"tags,flow"` // ["tag1", "tag2"]
}

// Block style (newline-separated)
type Info struct {
    Tags []string `yaml:"tags"` // - tag1\n- tag2
}
```

### Handling Optional Fields

```go
type HTTPRequest struct {
    Method      string            `yaml:"method"`
    Path        []string          `yaml:"path,flow"`
    Headers     map[string]string `yaml:"headers,omitempty"`
    Body        string            `yaml:"body,omitempty"`
    Matchers    []Matcher         `yaml:"matchers,omitempty"`
    Extractors  []Extractor       `yaml:"extractors,omitempty"`
}
```

### Custom Types with Validation

```go
type Severity string

const (
    SeverityInfo     Severity = "info"
    SeverityLow      Severity = "low"
    SeverityMedium   Severity = "medium"
    SeverityHigh     Severity = "high"
    SeverityCritical Severity = "critical"
)

func (s *Severity) UnmarshalYAML(node *yaml.Node) error {
    var str string
    if err := node.Decode(&str); err != nil {
        return err
    }

    switch Severity(str) {
    case SeverityInfo, SeverityLow, SeverityMedium, SeverityHigh, SeverityCritical:
        *s = Severity(str)
        return nil
    default:
        return &ParseError{
            Line:    node.Line,
            Column:  node.Column,
            Message: fmt.Sprintf("invalid severity: %s", str),
        }
    }
}
```

## Performance Considerations

### Streaming vs Full Load

```go
// Full load (small templates)
func ParseFile(path string) (*Template, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, err
    }
    return ParseTemplate(data)
}

// Streaming (large template sets)
func ParseDirectory(dir string) ([]*Template, error) {
    var templates []*Template

    err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
        if err != nil {
            return err
        }

        if !info.IsDir() && strings.HasSuffix(path, ".yaml") {
            t, err := ParseFile(path)
            if err != nil {
                // Log error, continue processing other files
                log.Printf("failed to parse %s: %v", path, err)
                return nil
            }
            templates = append(templates, t)
        }
        return nil
    })

    return templates, err
}
```

## Error Recovery

**Don't let one bad template break the system:**

```go
type ParseResult struct {
    Template *Template
    Error    error
    Path     string
}

func ParseWithRecovery(paths []string) []ParseResult {
    results := make([]ParseResult, len(paths))

    for i, path := range paths {
        t, err := ParseFile(path)
        results[i] = ParseResult{
            Template: t,
            Error:    err,
            Path:     path,
        }
    }

    return results
}

// Caller can filter successful vs failed parses
validTemplates := filterSuccessful(results)
failedPaths := filterFailed(results)
```

## Integration with Nuclei

**Key files to study:**

- `pkg/templates/compile.go` - Template compilation entry point
- `pkg/templates/parse.go` - YAML parsing logic (if separate)
- `pkg/model/types.go` - Template structure definitions

**Pattern:** Parse → Validate → Compile → Cache
