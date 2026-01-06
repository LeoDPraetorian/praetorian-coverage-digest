# Error Handling

**Error handling with line numbers and validation phases.**

## Structured Error Types

```go
// ParseError - YAML syntax errors with line/column positions
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

// ValidationError - Schema/semantic validation errors
type ValidationError struct {
    TemplateID string
    Errors     []error
}

func (e *ValidationError) Error() string {
    var msgs []string
    for _, err := range e.Errors {
        msgs = append(msgs, err.Error())
    }
    return fmt.Sprintf("template %s: %s", e.TemplateID, strings.Join(msgs, "; "))
}

// CompilationError - Regex/DSL compilation failures
type CompilationError struct {
    TemplateID string
    Component  string // "matcher", "extractor", "dsl"
    Index      int
    Err        error
}

func (e *CompilationError) Error() string {
    return fmt.Sprintf("template %s: %s[%d]: %v", e.TemplateID, e.Component, e.Index, e.Err)
}

// ExecutionError - Runtime errors during template execution
type ExecutionError struct {
    TemplateID string
    Target     string
    Err        error
}

func (e *ExecutionError) Error() string {
    return fmt.Sprintf("template %s on %s: %v", e.TemplateID, e.Target, e.Err)
}
```

## Validation Phases

### Phase 1: Parse-Time Validation

```go
func ParseAndValidate(data []byte) (*Template, error) {
    var template Template

    decoder := yaml.NewDecoder(bytes.NewReader(data))
    decoder.KnownFields(true) // Strict mode

    if err := decoder.Decode(&template); err != nil {
        return nil, &ParseError{
            Message: fmt.Sprintf("YAML syntax error: %v", err),
            Line:    extractLine(err),
        }
    }

    // Immediate schema validation
    if err := validateSchema(&template); err != nil {
        return nil, err
    }

    return &template, nil
}
```

### Phase 2: Compile-Time Validation

```go
func CompileWithValidation(t *Template) (*CompiledTemplate, error) {
    // Validate regex patterns
    for i, m := range t.Matchers {
        if m.Type == "regex" {
            for j, pattern := range m.Regex {
                if _, err := regexp.Compile(pattern); err != nil {
                    return nil, &CompilationError{
                        TemplateID: t.ID,
                        Component:  "matcher",
                        Index:      i,
                        Err:        fmt.Errorf("regex[%d]: %w", j, err),
                    }
                }
            }
        }
    }

    // Validate DSL expressions
    for i, m := range t.Matchers {
        if m.Type == "dsl" {
            for j, dsl := range m.DSL {
                if _, err := govaluate.NewEvaluableExpression(dsl); err != nil {
                    return nil, &CompilationError{
                        TemplateID: t.ID,
                        Component:  "matcher",
                        Index:      i,
                        Err:        fmt.Errorf("dsl[%d]: %w", j, err),
                    }
                }
            }
        }
    }

    // ... Continue compilation
}
```

### Phase 3: Runtime Validation

```go
func ExecuteWithValidation(template *CompiledTemplate, target string) (*Result, error) {
    defer func() {
        if r := recover(); r != nil {
            log.Errorf("Panic executing %s: %v", template.ID, r)
        }
    }()

    // Validate target URL
    if _, err := url.Parse(target); err != nil {
        return nil, &ExecutionError{
            TemplateID: template.ID,
            Target:     target,
            Err:        fmt.Errorf("invalid target URL: %w", err),
        }
    }

    // Execute with timeout
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    result, err := executeWithContext(ctx, template, target)
    if err != nil {
        return nil, &ExecutionError{
            TemplateID: template.ID,
            Target:     target,
            Err:        err,
        }
    }

    return result, nil
}
```

## Error Recovery Strategies

### Graceful Degradation

```go
func LoadTemplatesWithRecovery(paths []string) ([]*CompiledTemplate, []error) {
    var templates []*CompiledTemplate
    var errors []error

    for _, path := range paths {
        t, err := LoadAndCompile(path)
        if err != nil {
            errors = append(errors, fmt.Errorf("%s: %w", path, err))
            continue // Skip bad template, continue with others
        }
        templates = append(templates, t)
    }

    return templates, errors
}
```

### Retry Logic

```go
func ExecuteWithRetry(template *CompiledTemplate, target string, maxRetries int) (*Result, error) {
    var lastErr error

    for attempt := 0; attempt <= maxRetries; attempt++ {
        result, err := Execute(template, target)
        if err == nil {
            return result, nil
        }

        lastErr = err

        // Only retry on transient errors
        if !isRetryable(err) {
            break
        }

        // Exponential backoff
        time.Sleep(time.Duration(1<<uint(attempt)) * time.Second)
    }

    return nil, lastErr
}

func isRetryable(err error) bool {
    // Network errors, timeouts are retryable
    // Parse errors, compilation errors are not
    var netErr net.Error
    return errors.As(err, &netErr) && netErr.Timeout()
}
```

## Debug Output

```go
type DebugInfo struct {
    TemplateID string
    Request    string
    Response   string
    Matched    bool
    Extractors map[string][]string
    Errors     []string
}

func ExecuteWithDebug(template *CompiledTemplate, target string) (*Result, *DebugInfo) {
    debug := &DebugInfo{
        TemplateID: template.ID,
        Extractors: make(map[string][]string),
    }

    // Capture request
    debug.Request = formatRequest(template.Requests[0])

    // Execute
    response, err := executeHTTPRequest(template.Requests[0], target)
    if err != nil {
        debug.Errors = append(debug.Errors, err.Error())
        return nil, debug
    }

    // Capture response
    debug.Response = formatResponse(response)

    // Evaluate matchers
    debug.Matched = evaluateMatchers(template.Matchers, response)

    // Run extractors
    for _, ext := range template.Extractors {
        values := ext.Extract(response)
        debug.Extractors[ext.Name()] = values
    }

    return &Result{Matched: debug.Matched}, debug
}
```

See remaining topics in: performance-tuning.md, testing-patterns.md, chariot-integration.md
