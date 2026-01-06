# Compiler Architecture

**Template compilation pipeline with caching strategy and validation phases.**

## Overview

Compilation transforms parsed YAML into executable templates. This is where regex patterns are compiled, DSL expressions are prepared, and validation ensures templates are ready to execute.

**Primary source:** `github.com/projectdiscovery/nuclei` - `pkg/templates/compile.go`

## Compilation Pipeline

```
Parse YAML → Validate Schema → Compile Matchers → Compile Extractors →
Compile DSL → Build Execution Plan → Cache Compiled Template
```

## Core Compiler Structure

```go
type CompiledTemplate struct {
    ID              string
    Info            Info
    Requests        []CompiledRequest
    CompiledAt      time.Time
    CompilationTime time.Duration
}

type CompiledRequest struct {
    Method          string
    PathExpressions []*CompiledExpression // Compiled {{BaseURL}} etc.
    Headers         map[string]*CompiledExpression
    Body            *CompiledExpression
    Matchers        []*CompiledMatcher
    Extractors      []*CompiledExtractor
}

func CompileTemplate(t *Template) (*CompiledTemplate, error) {
    start := time.Now()

    compiled := &CompiledTemplate{
        ID:   t.ID,
        Info: t.Info,
    }

    // Phase 1: Validate
    if err := t.Validate(); err != nil {
        return nil, fmt.Errorf("validation failed: %w", err)
    }

    // Phase 2: Compile requests
    for _, req := range t.HTTP {
        compiledReq, err := compileHTTPRequest(req)
        if err != nil {
            return nil, fmt.Errorf("failed to compile request: %w", err)
        }
        compiled.Requests = append(compiled.Requests, compiledReq)
    }

    compiled.CompiledAt = time.Now()
    compiled.CompilationTime = time.Since(start)

    return compiled, nil
}
```

## Matcher Compilation

**Compile regex and prepare evaluation tree:**

```go
type CompiledMatcher struct {
    Type      MatcherType // word, regex, status, dsl, etc.
    Condition string      // "and" or "or"

    // Pre-compiled patterns
    WordSet       map[string]bool    // O(1) lookup for word matchers
    RegexPatterns []*regexp.Regexp   // Pre-compiled regex
    StatusCodes   map[int]bool       // O(1) lookup for status

    // DSL expressions
    DSLExpressions []*govaluate.EvaluableExpression
}

func compileMatcher(m Matcher) (*CompiledMatcher, error) {
    compiled := &CompiledMatcher{
        Type:      m.Type,
        Condition: m.Condition,
    }

    switch m.Type {
    case "word":
        compiled.WordSet = make(map[string]bool)
        for _, word := range m.Words {
            compiled.WordSet[word] = true
        }

    case "regex":
        for _, pattern := range m.Regex {
            re, err := regexp.Compile(pattern)
            if err != nil {
                return nil, fmt.Errorf("invalid regex %q: %w", pattern, err)
            }
            compiled.RegexPatterns = append(compiled.RegexPatterns, re)
        }

    case "status":
        compiled.StatusCodes = make(map[int]bool)
        for _, code := range m.Status {
            compiled.StatusCodes[code] = true
        }

    case "dsl":
        for _, expr := range m.DSL {
            evaluable, err := govaluate.NewEvaluableExpression(expr)
            if err != nil {
                return nil, fmt.Errorf("invalid DSL %q: %w", expr, err)
            }
            compiled.DSLExpressions = append(compiled.DSLExpressions, evaluable)
        }
    }

    return compiled, nil
}
```

## DSL Expression Compilation

**Pre-compile variable interpolation and helper functions:**

```go
type CompiledExpression struct {
    Raw       string
    Variables []string // Extracted {{variable}} names
    Template  *template.Template // Go text/template
}

func compileExpression(expr string) (*CompiledExpression, error) {
    // Extract variables: {{BaseURL}}, {{Hostname}}, etc.
    vars := extractVariables(expr)

    // Compile as Go template for efficient execution
    tmpl, err := template.New("expr").Parse(expr)
    if err != nil {
        return nil, fmt.Errorf("failed to compile expression: %w", err)
    }

    return &CompiledExpression{
        Raw:       expr,
        Variables: vars,
        Template:  tmpl,
    }, nil
}

func extractVariables(expr string) []string {
    re := regexp.MustCompile(`\{\{([^}]+)\}\}`)
    matches := re.FindAllStringSubmatch(expr, -1)

    vars := make([]string, 0, len(matches))
    for _, match := range matches {
        if len(match) > 1 {
            vars = append(vars, strings.TrimSpace(match[1]))
        }
    }
    return vars
}
```

## Validation Phases

### Phase 1: Schema Validation

Performed during parsing - ensures required fields exist.

### Phase 2: Semantic Validation

```go
func validateSemantic(t *Template) error {
    var errs []error

    // Check for matcher-condition without multiple matchers
    for i, req := range t.HTTP {
        if req.MatchersCondition == "and" && len(req.Matchers) < 2 {
            errs = append(errs, fmt.Errorf(
                "http[%d]: matchers-condition 'and' requires 2+ matchers", i))
        }
    }

    // Validate extractor requirements
    for i, req := range t.HTTP {
        for j, ext := range req.Extractors {
            if ext.Type == "regex" && len(ext.Regex) == 0 {
                errs = append(errs, fmt.Errorf(
                    "http[%d].extractors[%d]: regex extractor requires regex patterns", i, j))
            }
        }
    }

    // Check for circular dependencies (DSL referencing itself)
    if err := checkCircularDSL(t); err != nil {
        errs = append(errs, err)
    }

    if len(errs) > 0 {
        return &ValidationError{Errors: errs}
    }
    return nil
}
```

### Phase 3: Compilation Validation

```go
func validateCompiled(c *CompiledTemplate) error {
    // Ensure all regex compiled successfully
    for i, req := range c.Requests {
        for j, m := range req.Matchers {
            if m.Type == "regex" && len(m.RegexPatterns) == 0 {
                return fmt.Errorf(
                    "request[%d].matcher[%d]: regex matcher has no compiled patterns", i, j)
            }
        }
    }

    // Ensure DSL expressions are evaluable
    for i, req := range c.Requests {
        for j, m := range req.Matchers {
            if m.Type == "dsl" && len(m.DSLExpressions) == 0 {
                return fmt.Errorf(
                    "request[%d].matcher[%d]: dsl matcher has no compiled expressions", i, j)
            }
        }
    }

    return nil
}
```

## Caching Strategy

### In-Memory Cache

```go
type TemplateCache struct {
    mu        sync.RWMutex
    templates map[string]*CompiledTemplate
    stats     CacheStats
}

type CacheStats struct {
    Hits      uint64
    Misses    uint64
    Evictions uint64
}

func NewTemplateCache() *TemplateCache {
    return &TemplateCache{
        templates: make(map[string]*CompiledTemplate),
    }
}

func (c *TemplateCache) GetOrCompile(id string, raw []byte) (*CompiledTemplate, error) {
    // Fast path: check cache
    c.mu.RLock()
    if compiled, ok := c.templates[id]; ok {
        c.mu.RUnlock()
        atomic.AddUint64(&c.stats.Hits, 1)
        return compiled, nil
    }
    c.mu.RUnlock()

    atomic.AddUint64(&c.stats.Misses, 1)

    // Slow path: parse and compile
    template, err := ParseTemplate(raw)
    if err != nil {
        return nil, err
    }

    compiled, err := CompileTemplate(template)
    if err != nil {
        return nil, err
    }

    // Cache the result
    c.mu.Lock()
    c.templates[id] = compiled
    c.mu.Unlock()

    return compiled, nil
}

func (c *TemplateCache) Stats() CacheStats {
    return CacheStats{
        Hits:      atomic.LoadUint64(&c.stats.Hits),
        Misses:    atomic.LoadUint64(&c.stats.Misses),
        Evictions: atomic.LoadUint64(&c.stats.Evictions),
    }
}
```

### LRU Cache for Large Template Sets

```go
import "github.com/hashicorp/golang-lru"

type LRUTemplateCache struct {
    cache *lru.Cache
}

func NewLRUCache(size int) (*LRUTemplateCache, error) {
    cache, err := lru.New(size)
    if err != nil {
        return nil, err
    }
    return &LRUTemplateCache{cache: cache}, nil
}

func (c *LRUTemplateCache) GetOrCompile(id string, raw []byte) (*CompiledTemplate, error) {
    if val, ok := c.cache.Get(id); ok {
        return val.(*CompiledTemplate), nil
    }

    // Compile and add to cache
    template, err := ParseTemplate(raw)
    if err != nil {
        return nil, err
    }

    compiled, err := CompileTemplate(template)
    if err != nil {
        return nil, err
    }

    c.cache.Add(id, compiled)
    return compiled, nil
}
```

### Persistent Cache (Disk)

```go
type PersistentCache struct {
    dir       string
    memCache  *TemplateCache
}

func (c *PersistentCache) GetOrCompile(id string, raw []byte) (*CompiledTemplate, error) {
    // Check memory cache first
    compiled, err := c.memCache.GetOrCompile(id, raw)
    if err == nil {
        return compiled, nil
    }

    // Check disk cache
    cachePath := filepath.Join(c.dir, id+".gob")
    if compiled, err := c.loadFromDisk(cachePath); err == nil {
        // Warm memory cache
        c.memCache.templates[id] = compiled
        return compiled, nil
    }

    // Compile and save to disk
    template, err := ParseTemplate(raw)
    if err != nil {
        return nil, err
    }

    compiled, err = CompileTemplate(template)
    if err != nil {
        return nil, err
    }

    // Save to disk asynchronously
    go c.saveToDisk(cachePath, compiled)

    return compiled, nil
}

func (c *PersistentCache) saveToDisk(path string, compiled *CompiledTemplate) error {
    f, err := os.Create(path)
    if err != nil {
        return err
    }
    defer f.Close()

    return gob.NewEncoder(f).Encode(compiled)
}
```

## Compilation Optimizations

### Lazy Compilation

Compile on first use rather than startup:

```go
type LazyTemplate struct {
    raw      []byte
    compiled *CompiledTemplate
    mu       sync.Mutex
}

func (t *LazyTemplate) Compile() (*CompiledTemplate, error) {
    t.mu.Lock()
    defer t.mu.Unlock()

    if t.compiled != nil {
        return t.compiled, nil
    }

    template, err := ParseTemplate(t.raw)
    if err != nil {
        return nil, err
    }

    t.compiled, err = CompileTemplate(template)
    return t.compiled, err
}
```

### Parallel Compilation

Compile multiple templates concurrently:

```go
func CompileTemplates(templates []*Template) ([]*CompiledTemplate, error) {
    compiled := make([]*CompiledTemplate, len(templates))
    errs := make([]error, len(templates))

    var wg sync.WaitGroup
    for i, t := range templates {
        wg.Add(1)
        go func(idx int, tmpl *Template) {
            defer wg.Done()
            compiled[idx], errs[idx] = CompileTemplate(tmpl)
        }(i, t)
    }
    wg.Wait()

    // Check for errors
    for _, err := range errs {
        if err != nil {
            return nil, err
        }
    }

    return compiled, nil
}
```

## Integration with Nuclei

**Key patterns from Nuclei source:**

- Compilation happens once during template loading
- Compiled templates are cached in memory for the session
- Regex patterns are pre-compiled for performance
- DSL expressions use govaluate or similar for evaluation
- Cache invalidation on template file changes (watch mode)

**Study these files:**

- `pkg/templates/compile.go` - Main compilation logic
- `pkg/operators/matchers/compile.go` - Matcher compilation
- `pkg/operators/extractors/compile.go` - Extractor compilation
