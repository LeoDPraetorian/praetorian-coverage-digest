# Matcher Implementation

**Matcher engine implementation for word/regex/status/size/dsl/binary types with condition trees (AND/OR).**

## Overview

Matchers determine if a response indicates a vulnerability. Nuclei supports multiple matcher types that can be combined with AND/OR logic.

**Primary source:** `github.com/projectdiscovery/nuclei` - `pkg/matchers/matchers.go`

## Matcher Types

### 1. Word Matcher

String presence check (case-sensitive or insensitive):

```go
type WordMatcher struct {
    Words         []string
    CaseInsensitive bool
    Part          string // body, header, all
}

func (m *WordMatcher) Match(response *Response) bool {
    var text string
    switch m.Part {
    case "body":
        text = response.Body
    case "header":
        text = formatHeaders(response.Headers)
    default:
        text = response.Body + formatHeaders(response.Headers)
    }

    if m.CaseInsensitive {
        text = strings.ToLower(text)
    }

    for _, word := range m.Words {
        searchWord := word
        if m.CaseInsensitive {
            searchWord = strings.ToLower(word)
        }

        if strings.Contains(text, searchWord) {
            return true
        }
    }

    return false
}
```

### 2. Regex Matcher

Pattern matching with compiled regex:

```go
type RegexMatcher struct {
    Regex    []string
    Patterns []*regexp.Regexp // Pre-compiled during template compilation
    Part     string
}

func (m *RegexMatcher) Match(response *Response) bool {
    var text string
    switch m.Part {
    case "body":
        text = response.Body
    case "header":
        text = formatHeaders(response.Headers)
    default:
        text = response.Body + formatHeaders(response.Headers)
    }

    for _, pattern := range m.Patterns {
        if pattern.MatchString(text) {
            return true
        }
    }

    return false
}
```

### 3. Status Matcher

HTTP status code matching:

```go
type StatusMatcher struct {
    Status []int
}

func (m *StatusMatcher) Match(response *Response) bool {
    for _, expectedStatus := range m.Status {
        if response.StatusCode == expectedStatus {
            return true
        }
    }
    return false
}
```

### 4. Size Matcher

Response size comparison:

```go
type SizeMatcher struct {
    Size []int
}

func (m *SizeMatcher) Match(response *Response) bool {
    actualSize := len(response.Body)

    for _, expectedSize := range m.Size {
        if actualSize == expectedSize {
            return true
        }
    }
    return false
}
```

### 5. DSL Matcher

Complex boolean expressions:

```go
type DSLMatcher struct {
    DSL         []string
    Expressions []*govaluate.EvaluableExpression
}

func (m *DSLMatcher) Match(response *Response) bool {
    params := map[string]interface{}{
        "body":           response.Body,
        "status_code":    response.StatusCode,
        "content_length": len(response.Body),
        "header":         response.Headers,
    }

    for _, expr := range m.Expressions {
        result, err := expr.Evaluate(params)
        if err != nil {
            return false
        }

        boolResult, ok := result.(bool)
        if !ok || !boolResult {
            return false
        }
    }

    return true
}
```

### 6. Binary Matcher

Binary content matching (hex patterns):

```go
type BinaryMatcher struct {
    Binary []string // Hex-encoded patterns: "504B0304"
}

func (m *BinaryMatcher) Match(response *Response) bool {
    bodyBytes := []byte(response.Body)

    for _, hexPattern := range m.Binary {
        pattern, err := hex.DecodeString(hexPattern)
        if err != nil {
            continue
        }

        if bytes.Contains(bodyBytes, pattern) {
            return true
        }
    }

    return false
}
```

## Condition Trees

### Matcher Condition Types

```go
type MatcherCondition string

const (
    ConditionAnd MatcherCondition = "and"
    ConditionOr  MatcherCondition = "or"
)
```

### Evaluation Engine

```go
type MatcherSet struct {
    Matchers  []Matcher
    Condition MatcherCondition // "and" or "or"
}

func (s *MatcherSet) Evaluate(response *Response) bool {
    if len(s.Matchers) == 0 {
        return false
    }

    switch s.Condition {
    case ConditionAnd:
        return s.evaluateAnd(response)
    case ConditionOr:
        return s.evaluateOr(response)
    default:
        // Default to OR for backward compatibility
        return s.evaluateOr(response)
    }
}

func (s *MatcherSet) evaluateAnd(response *Response) bool {
    for _, matcher := range s.Matchers {
        if !matcher.Match(response) {
            return false // Short-circuit on first failure
        }
    }
    return true
}

func (s *MatcherSet) evaluateOr(response *Response) bool {
    for _, matcher := range s.Matchers {
        if matcher.Match(response) {
            return true // Short-circuit on first success
        }
    }
    return false
}
```

## Matcher Interface

```go
type Matcher interface {
    Match(response *Response) bool
    Type() MatcherType
}

type MatcherType string

const (
    TypeWord   MatcherType = "word"
    TypeRegex  MatcherType = "regex"
    TypeStatus MatcherType = "status"
    TypeSize   MatcherType = "size"
    TypeDSL    MatcherType = "dsl"
    TypeBinary MatcherType = "binary"
)

type Response struct {
    StatusCode int
    Headers    map[string]string
    Body       string
    Duration   time.Duration
}
```

## Matcher Factory

```go
func CreateMatcher(config MatcherConfig) (Matcher, error) {
    switch config.Type {
    case TypeWord:
        return &WordMatcher{
            Words:           config.Words,
            CaseInsensitive: config.CaseInsensitive,
            Part:            config.Part,
        }, nil

    case TypeRegex:
        patterns := make([]*regexp.Regexp, 0, len(config.Regex))
        for _, pattern := range config.Regex {
            re, err := regexp.Compile(pattern)
            if err != nil {
                return nil, fmt.Errorf("invalid regex %q: %w", pattern, err)
            }
            patterns = append(patterns, re)
        }
        return &RegexMatcher{
            Regex:    config.Regex,
            Patterns: patterns,
            Part:     config.Part,
        }, nil

    case TypeStatus:
        return &StatusMatcher{Status: config.Status}, nil

    case TypeSize:
        return &SizeMatcher{Size: config.Size}, nil

    case TypeDSL:
        expressions := make([]*govaluate.EvaluableExpression, 0, len(config.DSL))
        for _, dsl := range config.DSL {
            expr, err := govaluate.NewEvaluableExpression(dsl)
            if err != nil {
                return nil, fmt.Errorf("invalid DSL %q: %w", dsl, err)
            }
            expressions = append(expressions, expr)
        }
        return &DSLMatcher{
            DSL:         config.DSL,
            Expressions: expressions,
        }, nil

    case TypeBinary:
        return &BinaryMatcher{Binary: config.Binary}, nil

    default:
        return nil, fmt.Errorf("unknown matcher type: %s", config.Type)
    }
}
```

## Template Examples

### Simple Word Match

```yaml
matchers:
  - type: word
    words:
      - "admin panel"
      - "dashboard"
```

### Multiple Matchers with AND

```yaml
matchers:
  - type: word
    words:
      - "success"
  - type: status
    status:
      - 200
matchers-condition: and
```

### Complex DSL Match

```yaml
matchers:
  - type: dsl
    dsl:
      - "status_code == 200"
      - "contains(body, 'admin')"
      - "len(body) > 1000"
      - "!contains(body, 'error')"
    matchers-condition: and
```

### Case-Insensitive Match

```yaml
matchers:
  - type: word
    words:
      - "password"
      - "admin"
    condition: or
    case-insensitive: true
```

### Binary Content Detection

```yaml
matchers:
  - type: binary
    binary:
      - "504B0304" # ZIP file signature
      - "25504446" # PDF file signature
```

## Performance Optimization

### Short-Circuit Evaluation

```go
// For AND conditions, stop on first false
func (s *MatcherSet) evaluateAndOptimized(response *Response) bool {
    for i, matcher := range s.Matchers {
        matched := matcher.Match(response)
        if !matched {
            // Log which matcher failed for debugging
            log.Debugf("Matcher %d failed (short-circuit)", i)
            return false
        }
    }
    return true
}

// For OR conditions, stop on first true
func (s *MatcherSet) evaluateOrOptimized(response *Response) bool {
    for i, matcher := range s.Matchers {
        matched := matcher.Match(response)
        if matched {
            log.Debugf("Matcher %d succeeded (short-circuit)", i)
            return true
        }
    }
    return false
}
```

### Parallel Matcher Evaluation

For independent matchers (OR condition only):

```go
func (s *MatcherSet) evaluateOrParallel(response *Response) bool {
    resultChan := make(chan bool, len(s.Matchers))

    for _, matcher := range s.Matchers {
        go func(m Matcher) {
            resultChan <- m.Match(response)
        }(matcher)
    }

    for range s.Matchers {
        if <-resultChan {
            return true
        }
    }

    return false
}
```

### Matcher Ordering

Optimize by ordering matchers from fastest to slowest:

```go
func OptimizeMatcherOrder(matchers []Matcher) []Matcher {
    // Order by estimated cost (fast -> slow):
    // 1. Status matcher (O(1))
    // 2. Size matcher (O(1))
    // 3. Word matcher (O(n))
    // 4. Regex matcher (O(n*m))
    // 5. DSL matcher (varies)
    // 6. Binary matcher (O(n*m))

    sort.SliceStable(matchers, func(i, j int) bool {
        return matcherCost(matchers[i]) < matcherCost(matchers[j])
    })

    return matchers
}

func matcherCost(m Matcher) int {
    switch m.Type() {
    case TypeStatus:
        return 1
    case TypeSize:
        return 2
    case TypeWord:
        return 3
    case TypeRegex:
        return 4
    case TypeDSL:
        return 5
    case TypeBinary:
        return 6
    default:
        return 99
    }
}
```

## Error Handling

```go
type MatchError struct {
    MatcherIndex int
    MatcherType  MatcherType
    Err          error
}

func (e *MatchError) Error() string {
    return fmt.Sprintf("matcher[%d] type=%s: %v", e.MatcherIndex, e.MatcherType, e.Err)
}

func (s *MatcherSet) EvaluateWithErrors(response *Response) (bool, []error) {
    var errors []error

    for i, matcher := range s.Matchers {
        matched, err := safeMatch(matcher, response)
        if err != nil {
            errors = append(errors, &MatchError{
                MatcherIndex: i,
                MatcherType:  matcher.Type(),
                Err:          err,
            })
            continue
        }

        if s.Condition == ConditionAnd && !matched {
            return false, errors
        }
        if s.Condition == ConditionOr && matched {
            return true, errors
        }
    }

    result := s.Condition == ConditionAnd
    return result, errors
}

func safeMatch(m Matcher, response *Response) (matched bool, err error) {
    defer func() {
        if r := recover(); r != nil {
            err = fmt.Errorf("panic in matcher: %v", r)
        }
    }()

    matched = m.Match(response)
    return matched, nil
}
```

## Integration with Nuclei

**Study these Nuclei files:**

- `pkg/matchers/matchers.go` - Core matcher interface and types
- `pkg/operators/matchers/compile.go` - Matcher compilation
- `pkg/protocols/common/helpers/responsehighlighter/` - Match result highlighting
- `pkg/operators/matchers/match.go` - Match execution logic

**Key patterns:**

- Matchers are compiled once during template loading
- Short-circuit evaluation for performance
- Detailed match reporting for debugging
- Support for negative matchers (!contains)
