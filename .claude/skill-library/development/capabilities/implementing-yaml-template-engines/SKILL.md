---
name: implementing-yaml-template-engines
description: Use when building YAML-based template engines for security scanners - guides through parser, compiler, executor, matcher, and extractor architecture following the Nuclei pattern (industry standard with 26k+ GitHub stars)
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, AskUserQuestion
---

# Implementing YAML Template Engines

**Build extensible template systems for security scanners following proven patterns from Nuclei and Jaeles.**

## When to Use

Use this skill when:

- Building a security scanner that needs extensible detection templates
- Implementing YAML-based configuration for vulnerability detection
- Porting Nuclei templates to a custom scanner
- Designing DSL expressions for security testing
- Integrating template engines with Chariot

## Why YAML Templates?

YAML templates separate detection logic from scanning engine code, enabling:

- **Extensibility**: Add new detections without code changes
- **Community**: Users can contribute templates (Nuclei has 10k+ templates)
- **Maintainability**: Update detection rules independently
- **Performance**: Compile once, execute many times

**Industry adoption**: Nuclei (26k stars), Jaeles (2k stars), Katana, DNSx all use YAML templates.

## Architecture Overview

### Five Core Components

```
1. Parser    → YAML to internal AST (gopkg.in/yaml.v3)
2. Compiler  → AST to executable template with validation
3. Executor  → Run compiled templates against targets
4. Matcher   → Evaluate response conditions
5. Extractor → Pull data from responses
```

### Data Flow

```
Template YAML → Parse → Validate → Compile → Cache → Execute → Match → Extract → Report
```

**Performance critical**: Compile once, cache compiled templates, execute many targets.

## Template Structure (Nuclei Pattern)

### Minimal Template

```yaml
id: example-detection
info:
  name: Example Detection
  severity: high
  tags: example,demo
  author: security-team

http:
  - method: GET
    path:
      - "{{BaseURL}}/vulnerable"

    matchers:
      - type: word
        words:
          - "vulnerable_string"
      - type: status
        status:
          - 200
    matchers-condition: and
```

### Template Components

| Section      | Purpose                         | Required |
| ------------ | ------------------------------- | -------- |
| `id`         | Unique template identifier      | Yes      |
| `info`       | Metadata (name, severity, tags) | Yes      |
| `http/dns`   | Protocol-specific requests      | Yes      |
| `matchers`   | Response validation logic       | Yes      |
| `extractors` | Data extraction from responses  | No       |

## Implementation Phases

### Phase 1: YAML Parser

**Use `gopkg.in/yaml.v3` for Go implementations.**

```go
type Template struct {
    ID   string `yaml:"id"`
    Info struct {
        Name     string   `yaml:"name"`
        Severity string   `yaml:"severity"`
        Tags     []string `yaml:"tags"`
    } `yaml:"info"`
    HTTP []HTTPRequest `yaml:"http"`
}

func ParseTemplate(data []byte) (*Template, error) {
    var t Template
    if err := yaml.Unmarshal(data, &t); err != nil {
        return nil, fmt.Errorf("parse error: %w", err)
    }
    return &t, nil
}
```

**See:** [references/parser-implementation.md](references/parser-implementation.md) for validation, error handling, line number preservation.

### Phase 2: Template Compiler

**Compile templates to executable form with validation.**

Key compilation tasks:

1. Validate schema (required fields, valid matcher types)
2. Compile regex patterns in matchers
3. Compile DSL expressions ({{BaseURL}}, contains(), etc.)
4. Build matcher evaluation tree
5. Cache compiled template

**See:** [references/compiler-architecture.md](references/compiler-architecture.md) for compilation pipeline, caching strategy, validation rules.

### Phase 3: DSL Expression Evaluator

**Variable interpolation and helper functions.**

Common DSL patterns:

```yaml
# Variable interpolation
path: "{{BaseURL}}/api/{{Version}}"

# Helper functions in matchers
matchers:
  - type: dsl
    dsl:
      - "contains(body, 'admin')"
      - "status_code == 200"
      - "len(header['X-Custom']) > 0"
```

**Evaluation options:**

- **Custom DSL**: Implement parser for security-specific syntax
- **govaluate**: `github.com/Knetic/govaluate` - expression evaluation
- **expr**: `github.com/antonmedv/expr` - fast, type-safe expressions

**See:** [references/dsl-evaluation.md](references/dsl-evaluation.md) for variable context, helper functions, security considerations.

### Phase 4: Matcher Engine

**Evaluate response conditions to determine vulnerability presence.**

Matcher types (Nuclei standard):

| Type     | Purpose                 | Example                     |
| -------- | ----------------------- | --------------------------- |
| `word`   | String presence         | `words: ["admin", "root"]`  |
| `regex`  | Pattern matching        | `regex: ["admin.*panel"]`   |
| `status` | HTTP status code        | `status: [200, 201]`        |
| `size`   | Response size           | `size: [1024, 2048]`        |
| `dsl`    | Custom expressions      | `dsl: ["len(body) > 1000"]` |
| `binary` | Binary content matching | `binary: ["504B0304"]`      |

**Matcher conditions:**

- `matchers-condition: and` - ALL matchers must pass
- `matchers-condition: or` - ANY matcher passes (default)

**See:** [references/matcher-implementation.md](references/matcher-implementation.md) for matcher evaluation logic, condition trees, performance optimization.

### Phase 5: Extractor Engine

**Pull structured data from responses.**

Extractor types:

| Type    | Purpose              | Example                        |
| ------- | -------------------- | ------------------------------ |
| `regex` | Pattern extraction   | `regex: ["token=([a-z0-9]+)"]` |
| `kval`  | Key-value pairs      | `kval: ["X-API-Key"]`          |
| `json`  | JSON path extraction | `json: ["$.user.id"]`          |
| `xpath` | XML path extraction  | `xpath: ["/root/user/@id"]`    |

**See:** [references/extractor-implementation.md](references/extractor-implementation.md) for extraction logic, JSON/XML parsing, result formatting.

## Integration with Chariot

### Tabularium Risk Model

Map template findings to Chariot's Risk entity:

```go
risk := &tabularium.Risk{
    Name:        template.Info.Name,
    Description: buildDescription(template, match),
    Severity:    mapSeverity(template.Info.Severity),
    Class:       template.ID,
    Source:      "template-engine",
    // ... additional fields
}
```

### Janus Framework Integration

Register template executor as a Janus tool:

```go
// internal/registry/registry.go
func init() {
    registry.Register("template-executor", &TemplateExecutor{})
}

type TemplateExecutor struct {
    templateCache *TemplateCache
}

func (e *TemplateExecutor) Execute(ctx context.Context, input *janus.Input) (*janus.Output, error) {
    // Load templates, execute against targets, return findings
}
```

**See:** [references/chariot-integration.md](references/chariot-integration.md) for Risk model mapping, Janus tool registration, output formatting.

## Architecture Patterns

### Template Registry Pattern

```go
type TemplateRegistry struct {
    mu        sync.RWMutex
    templates map[string]*CompiledTemplate
}

func (r *TemplateRegistry) Load(path string) error {
    // Walk directory, parse YAML, compile, cache
}

func (r *TemplateRegistry) Get(id string) (*CompiledTemplate, bool) {
    r.mu.RLock()
    defer r.mu.RUnlock()
    t, ok := r.templates[id]
    return t, ok
}
```

**Follow pkg/ structure**: `pkg/templates/`, `pkg/matchers/`, `pkg/extractors/`, `internal/registry/`.

**See:** [references/registry-patterns.md](references/registry-patterns.md) for concurrent access, hot-reloading, version management.

### Request Clustering

**Optimization**: Execute multiple templates with ONE HTTP request.

```go
// Group templates by request signature
clusters := ClusterTemplates(templates)

for _, cluster := range clusters {
    response := httpClient.Do(cluster.Request)

    // Evaluate all templates in cluster against same response
    for _, template := range cluster.Templates {
        if EvaluateMatchers(template, response) {
            // Found vulnerability
        }
    }
}
```

**Performance gain**: 10x reduction in HTTP requests for large template sets.

**See:** [references/clustering-optimization.md](references/clustering-optimization.md) for clustering algorithms, cache keys, result merging.

## Error Handling

### Line Number Preservation

```go
type ParseError struct {
    Line    int
    Column  int
    Message string
}

func (e *ParseError) Error() string {
    return fmt.Sprintf("line %d:%d: %s", e.Line, e.Column, e.Message)
}
```

**YAML v3 preserves node positions** - use for accurate error reporting.

### Validation Phases

1. **Parse-time**: YAML syntax errors, schema violations
2. **Compile-time**: Invalid regex, undefined variables
3. **Runtime**: Template execution errors, matcher failures

**Fail fast on invalid templates** - don't cache broken templates.

**See:** [references/error-handling.md](references/error-handling.md) for validation rules, error recovery, debugging output.

## Performance Considerations

### Template Caching

```go
type TemplateCache struct {
    compiled map[string]*CompiledTemplate
    mu       sync.RWMutex
}

// Cache compiled templates, NOT raw YAML
func (c *TemplateCache) GetOrCompile(id string, yaml []byte) (*CompiledTemplate, error) {
    c.mu.RLock()
    if t, ok := c.compiled[id]; ok {
        c.mu.RUnlock()
        return t, nil
    }
    c.mu.RUnlock()

    // Compile and cache
    compiled := CompileTemplate(yaml)
    c.mu.Lock()
    c.compiled[id] = compiled
    c.mu.Unlock()

    return compiled, nil
}
```

### Matcher Optimization

- **Compile regex once** during template compilation
- **Short-circuit evaluation** - stop on first failure for AND conditions
- **Parallel matcher evaluation** for independent matchers

**See:** [references/performance-tuning.md](references/performance-tuning.md) for benchmarks, profiling, optimization strategies.

## Testing Strategy

### Test Pyramid

```
Unit Tests (80%)
├─ Parser: YAML → AST
├─ Compiler: AST → Executable
├─ Matcher: Condition evaluation
└─ Extractor: Data extraction

Integration Tests (15%)
├─ Template execution pipeline
└─ Multi-template clustering

E2E Tests (5%)
├─ Real vulnerability detection
└─ Performance benchmarks
```

**See:** [references/testing-patterns.md](references/testing-patterns.md) for test fixtures, mock responses, coverage targets.

## Anti-Patterns

### ❌ Don't: Hardcode Detection Logic

```go
// WRONG: Hardcoded vulnerability detection
if strings.Contains(body, "admin") && statusCode == 200 {
    return &Vulnerability{Name: "Admin Panel Exposed"}
}
```

**Why**: No extensibility, requires code changes for new detections.

### ✅ Do: Use Template System

```yaml
# RIGHT: Template-based detection
id: admin-panel-exposed
info:
  name: Admin Panel Exposed
matchers:
  - type: word
    words: ["admin"]
  - type: status
    status: [200]
```

### ❌ Don't: Parse YAML on Every Execution

```go
// WRONG: Parse and compile on every scan
for _, target := range targets {
    template := yaml.Unmarshal(templateYAML)  // SLOW
    compiled := CompileTemplate(template)      // SLOW
    Execute(compiled, target)
}
```

**Why**: 100x performance penalty, wasted CPU.

### ✅ Do: Compile Once, Cache, Execute Many

```go
// RIGHT: Compile once, cache, reuse
compiled := CompileAndCache(templateYAML)

for _, target := range targets {
    Execute(compiled, target)  // FAST
}
```

### ❌ Don't: Ignore Template Validation

```go
// WRONG: Skip validation
template := yaml.Unmarshal(data)
Execute(template, target)  // Runtime errors
```

**Why**: Runtime failures, unclear errors, security risks.

### ✅ Do: Fail Fast on Invalid Templates

```go
// RIGHT: Validate during compilation
compiled, err := CompileTemplate(template)
if err != nil {
    return fmt.Errorf("template %s invalid: %w", template.ID, err)
}
```

## Reference Material

### Primary Sources

Study these implementations for proven patterns:

- **Nuclei**: https://github.com/projectdiscovery/nuclei (Go implementation)
  - `pkg/templates/compile.go` - Template compilation
  - `pkg/protocols/http/request.go` - HTTP request generation
  - `pkg/matchers/matchers.go` - Response matching
  - `pkg/extractors/extract.go` - Data extraction
  - `pkg/operators/operators.go` - DSL operators

- **Nuclei Templates**: https://github.com/projectdiscovery/nuclei-templates (10k+ templates)
- **Nuclei Docs**: https://docs.projectdiscovery.io/templates/introduction
- **Jaeles**: https://github.com/jaeles-project/jaeles-signatures (Alternative pattern)

### Go Libraries

| Library                       | Purpose               | Usage          |
| ----------------------------- | --------------------- | -------------- |
| `gopkg.in/yaml.v3`            | YAML parsing          | Parser         |
| `github.com/Knetic/govaluate` | Expression evaluation | DSL (option 1) |
| `github.com/antonmedv/expr`   | Fast expression eval  | DSL (option 2) |
| `regexp`                      | Regex matching        | Matchers       |
| `sync`                        | Concurrent cache      | Registry       |

## Workflow Checklist

When implementing a template engine:

- [ ] Choose YAML library (gopkg.in/yaml.v3 for Go)
- [ ] Define template schema with validation
- [ ] Implement parser with line number preservation
- [ ] Build compiler with caching strategy
- [ ] Implement DSL expression evaluator
- [ ] Create matcher engine (word, regex, status, size, dsl, binary)
- [ ] Create extractor engine (regex, kval, json, xpath)
- [ ] Integrate with Chariot (Tabularium Risk, Janus registry)
- [ ] Add template registry with hot-reloading
- [ ] Implement request clustering optimization
- [ ] Write unit tests (80%+ coverage)
- [ ] Add integration tests for template execution
- [ ] Benchmark performance (compile time, execution time)
- [ ] Document template format for users

## Related Skills

| Skill                                  | Purpose                                      |
| -------------------------------------- | -------------------------------------------- |
| `implementing-go-plugin-registries`    | Plugin registry patterns for template loader |
| `enforcing-go-capability-architecture` | Capability structure for scanner integration |
| `integrating-standalone-capabilities`  | Integrate template engine with Chariot       |
| `go-errgroup-concurrency`              | Concurrent template execution patterns       |

## Changelog

See `.history/CHANGELOG` for version history and updates.
