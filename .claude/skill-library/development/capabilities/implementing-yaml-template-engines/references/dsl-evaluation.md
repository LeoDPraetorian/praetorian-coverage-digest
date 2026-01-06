# DSL Evaluation

**DSL expression evaluation with variable interpolation ({{BaseURL}}) and helper functions (contains, regex, len).**

## Overview

DSL (Domain-Specific Language) expressions enable dynamic template behavior through variable interpolation and helper functions. Nuclei supports expressions in paths, headers, and DSL matchers.

**Primary source:** `github.com/projectdiscovery/nuclei` - `pkg/operators/operators.go`

## Variable Interpolation

### Common Variables

```yaml
# Template variables available during execution
{{BaseURL}}     # http://example.com
{{Hostname}}    # example.com
{{Host}}        # example.com:80
{{Port}}        # 80
{{Scheme}}      # http or https
{{Path}}        # /api/users
{{File}}        # users
{{RootURL}}     # http://example.com

# Request/Response variables
{{body}}        # Response body
{{header}}      # Response headers map
{{status_code}} # HTTP status code
{{content_length}} # Response size
{{duration}}    # Request duration in ms
```

### Interpolation Engine

```go
type VariableContext struct {
    BaseURL     string
    Hostname    string
    Port        int
    Scheme      string
    // ... additional variables

    // Dynamic variables from previous requests
    Custom map[string]interface{}
}

func InterpolateString(expr string, ctx *VariableContext) (string, error) {
    tmpl, err := template.New("interpolate").Parse(expr)
    if err != nil {
        return "", fmt.Errorf("failed to parse expression: %w", err)
    }

    var buf bytes.Buffer
    if err := tmpl.Execute(&buf, ctx); err != nil {
        return "", fmt.Errorf("failed to execute expression: %w", err)
    }

    return buf.String(), nil
}

// Usage:
// InterpolateString("{{BaseURL}}/api/v{{Version}}", ctx)
// → "http://example.com/api/v1"
```

## Helper Functions

### String Helpers

```go
// Helper functions available in DSL expressions

func contains(s, substr string) bool {
    return strings.Contains(s, substr)
}

func startsWith(s, prefix string) bool {
    return strings.HasPrefix(s, prefix)
}

func endsWith(s, suffix string) bool {
    return strings.HasSuffix(s, suffix)
}

func len(s string) int {
    return len(s)
}

func toLower(s string) string {
    return strings.ToLower(s)
}

func toUpper(s string) string {
    return strings.ToUpper(s)
}

func trim(s string) string {
    return strings.TrimSpace(s)
}

func replace(s, old, new string) string {
    return strings.ReplaceAll(s, old, new)
}
```

### Regex Helpers

```go
func regex(pattern, text string) bool {
    matched, err := regexp.MatchString(pattern, text)
    if err != nil {
        return false
    }
    return matched
}

func regexExtract(pattern, text string) []string {
    re, err := regexp.Compile(pattern)
    if err != nil {
        return nil
    }
    return re.FindAllString(text, -1)
}
```

### Encoding Helpers

```go
import (
    "encoding/base64"
    "encoding/hex"
    "net/url"
)

func base64Encode(s string) string {
    return base64.StdEncoding.EncodeToString([]byte(s))
}

func base64Decode(s string) (string, error) {
    decoded, err := base64.StdEncoding.DecodeString(s)
    if err != nil {
        return "", err
    }
    return string(decoded), nil
}

func urlEncode(s string) string {
    return url.QueryEscape(s)
}

func urlDecode(s string) (string, error) {
    return url.QueryUnescape(s)
}

func hexEncode(s string) string {
    return hex.EncodeToString([]byte(s))
}

func hexDecode(s string) (string, error) {
    decoded, err := hex.DecodeString(s)
    if err != nil {
        return "", err
    }
    return string(decoded), nil
}
```

### Hashing Helpers

```go
import (
    "crypto/md5"
    "crypto/sha1"
    "crypto/sha256"
)

func md5Hash(s string) string {
    hash := md5.Sum([]byte(s))
    return hex.EncodeToString(hash[:])
}

func sha1Hash(s string) string {
    hash := sha1.Sum([]byte(s))
    return hex.EncodeToString(hash[:])
}

func sha256Hash(s string) string {
    hash := sha256.Sum256([]byte(s))
    return hex.EncodeToString(hash[:])
}
```

## DSL Matcher Implementation

### Expression Evaluator

**Option 1: Using govaluate**

```go
import "github.com/Knetic/govaluate"

type DSLMatcher struct {
    expressions []*govaluate.EvaluableExpression
}

func NewDSLMatcher(dslExpressions []string) (*DSLMatcher, error) {
    compiled := make([]*govaluate.EvaluableExpression, 0, len(dslExpressions))

    for _, expr := range dslExpressions {
        evaluable, err := govaluate.NewEvaluableExpression(expr)
        if err != nil {
            return nil, fmt.Errorf("invalid DSL expression %q: %w", expr, err)
        }
        compiled = append(compiled, evaluable)
    }

    return &DSLMatcher{expressions: compiled}, nil
}

func (m *DSLMatcher) Evaluate(params map[string]interface{}) (bool, error) {
    for _, expr := range m.expressions {
        result, err := expr.Evaluate(params)
        if err != nil {
            return false, err
        }

        // Convert result to bool
        boolResult, ok := result.(bool)
        if !ok {
            return false, fmt.Errorf("DSL expression did not return boolean")
        }

        if !boolResult {
            return false, nil
        }
    }

    return true, nil
}
```

**Option 2: Using antonmedv/expr**

```go
import "github.com/antonmedv/expr"

type DSLMatcher struct {
    programs []*vm.Program
}

func NewDSLMatcher(dslExpressions []string) (*DSLMatcher, error) {
    programs := make([]*vm.Program, 0, len(dslExpressions))

    for _, dslExpr := range dslExpressions {
        program, err := expr.Compile(dslExpr, expr.Env(DSLEnvironment{}))
        if err != nil {
            return nil, fmt.Errorf("invalid DSL: %w", err)
        }
        programs = append(programs, program)
    }

    return &DSLMatcher{programs: programs}, nil
}

type DSLEnvironment struct {
    Body       string
    StatusCode int
    Header     map[string]string
}

func (m *DSLMatcher) Evaluate(env DSLEnvironment) (bool, error) {
    for _, program := range m.programs {
        output, err := expr.Run(program, env)
        if err != nil {
            return false, err
        }

        if result, ok := output.(bool); ok && !result {
            return false, nil
        }
    }

    return true, nil
}
```

## DSL Template Examples

### Path Interpolation

```yaml
http:
  - method: GET
    path:
      - "{{BaseURL}}/users/{{Username}}"
      - "{{BaseURL}}/api/v{{Version}}/data"
```

### Header Interpolation

```yaml
http:
  - method: POST
    path:
      - "{{BaseURL}}/login"
    headers:
      Authorization: "Bearer {{Token}}"
      X-Custom-Header: "{{Hostname}}-{{Port}}"
```

### DSL Matcher Conditions

```yaml
matchers:
  - type: dsl
    dsl:
      - "contains(body, 'admin')"
      - "status_code == 200"
      - "len(body) > 1000"
      - "regex(body, '(?i)password.*exposed')"
    matchers-condition: and
```

### Complex DSL Logic

```yaml
matchers:
  - type: dsl
    dsl:
      - "status_code >= 200 && status_code < 300"
      - "contains(toLower(body), 'success') || contains(toLower(body), 'ok')"
      - "len(header['Set-Cookie']) > 0"
      - "!contains(body, 'error')"
```

## Custom Function Registration

```go
type FunctionRegistry struct {
    functions map[string]govaluate.ExpressionFunction
}

func NewFunctionRegistry() *FunctionRegistry {
    registry := &FunctionRegistry{
        functions: make(map[string]govaluate.ExpressionFunction),
    }

    // Register built-in functions
    registry.Register("contains", func(args ...interface{}) (interface{}, error) {
        if len(args) != 2 {
            return nil, fmt.Errorf("contains requires 2 arguments")
        }
        s, _ := args[0].(string)
        substr, _ := args[1].(string)
        return strings.Contains(s, substr), nil
    })

    registry.Register("len", func(args ...interface{}) (interface{}, error) {
        if len(args) != 1 {
            return nil, fmt.Errorf("len requires 1 argument")
        }
        s, _ := args[0].(string)
        return float64(len(s)), nil
    })

    // ... register more functions

    return registry
}

func (r *FunctionRegistry) Register(name string, fn govaluate.ExpressionFunction) {
    r.functions[name] = fn
}

func (r *FunctionRegistry) Compile(expr string) (*govaluate.EvaluableExpression, error) {
    return govaluate.NewEvaluableExpressionWithFunctions(expr, r.functions)
}
```

## Security Considerations

### Input Sanitization

```go
// Prevent code injection in DSL expressions
func SanitizeExpression(expr string) error {
    // Disallow dangerous patterns
    dangerous := []string{
        "exec", "system", "eval", "import",
        "os.", "io.", "__", "file",
    }

    lowerExpr := strings.ToLower(expr)
    for _, pattern := range dangerous {
        if strings.Contains(lowerExpr, pattern) {
            return fmt.Errorf("expression contains forbidden pattern: %s", pattern)
        }
    }

    return nil
}
```

### Expression Timeout

```go
import "context"

func EvaluateWithTimeout(expr *govaluate.EvaluableExpression, params map[string]interface{}, timeout time.Duration) (interface{}, error) {
    ctx, cancel := context.WithTimeout(context.Background(), timeout)
    defer cancel()

    resultChan := make(chan interface{}, 1)
    errorChan := make(chan error, 1)

    go func() {
        result, err := expr.Evaluate(params)
        if err != nil {
            errorChan <- err
            return
        }
        resultChan <- result
    }()

    select {
    case result := <-resultChan:
        return result, nil
    case err := <-errorChan:
        return nil, err
    case <-ctx.Done():
        return nil, fmt.Errorf("DSL evaluation timeout after %v", timeout)
    }
}
```

## Performance Optimization

### Expression Caching

Cache compiled expressions to avoid repeated parsing:

```go
type ExpressionCache struct {
    mu    sync.RWMutex
    cache map[string]*govaluate.EvaluableExpression
}

func (c *ExpressionCache) GetOrCompile(expr string) (*govaluate.EvaluableExpression, error) {
    c.mu.RLock()
    if compiled, ok := c.cache[expr]; ok {
        c.mu.RUnlock()
        return compiled, nil
    }
    c.mu.RUnlock()

    compiled, err := govaluate.NewEvaluableExpression(expr)
    if err != nil {
        return nil, err
    }

    c.mu.Lock()
    c.cache[expr] = compiled
    c.mu.Unlock()

    return compiled, nil
}
```

### Lazy Evaluation

Only evaluate DSL when needed:

```go
type LazyDSL struct {
    expr     string
    compiled *govaluate.EvaluableExpression
    once     sync.Once
    err      error
}

func (l *LazyDSL) Evaluate(params map[string]interface{}) (interface{}, error) {
    l.once.Do(func() {
        l.compiled, l.err = govaluate.NewEvaluableExpression(l.expr)
    })

    if l.err != nil {
        return nil, l.err
    }

    return l.compiled.Evaluate(params)
}
```

## Integration with Nuclei

**Study these Nuclei source files:**

- `pkg/operators/operators.go` - DSL operator framework
- `pkg/operators/common/dsl/dsl.go` - DSL helper functions
- `pkg/protocols/common/expressions/` - Expression evaluation
- `pkg/protocols/common/variables/` - Variable management
