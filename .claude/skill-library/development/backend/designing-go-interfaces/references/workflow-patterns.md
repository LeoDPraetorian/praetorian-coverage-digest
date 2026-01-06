# Interface Design Workflow Patterns

This reference documents the progressive workflow for interface design in Go, from concrete implementation through abstraction, based on research from production scanners and the "caller-defines-interface" pattern.

---

## The Progressive Abstraction Workflow

**Core Principle:** Start concrete, abstract only when necessary.

```
Phase 1: Concrete Implementation
    ↓ (works, shipped)
Phase 2: Second Implementation Emerges
    ↓ (pattern observed)
Phase 3: Consumer Defines Interface
    ↓ (abstraction justified)
Phase 4: Test Mocking (if needed)
```

---

## Phase 1: Start with Concrete Implementation

**Rule:** No interfaces on first version. Just make it work.

### Example: Scanner Implementation

```go
package scanner

type Scanner struct {
    httpClient *http.Client
    config     Config
    cache      *Cache
}

func NewScanner(config Config) *Scanner {
    return &Scanner{
        httpClient: &http.Client{Timeout: 30 * time.Second},
        config:     config,
        cache:      NewCache(),
    }
}

func (s *Scanner) Scan(ctx context.Context, target string) ([]Result, error) {
    // Concrete implementation
    req, err := http.NewRequestWithContext(ctx, "GET", target, nil)
    if err != nil {
        return nil, err
    }

    resp, err := s.httpClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    return parseResults(resp.Body)
}
```

**Validation Checklist:**

- [ ] Does it work? ✅
- [ ] Is it tested? ✅
- [ ] Is it shipped? ✅ → **Stop here.** No interface needed yet.

---

## Phase 2: Second Implementation Emerges

**Trigger:** Business needs different behavior with same API shape.

### Example: DNS Scanner Appears

```go
// Second implementation appears due to new requirement
type DNSScanner struct {
    resolver *net.Resolver
    config   Config
}

func NewDNSScanner(config Config) *DNSScanner {
    return &DNSScanner{
        resolver: net.DefaultResolver,
        config:   config,
    }
}

func (d *DNSScanner) Scan(ctx context.Context, target string) ([]Result, error) {
    // DNS-specific implementation
    records, err := d.resolver.LookupHost(ctx, target)
    if err != nil {
        return nil, err
    }
    return convertToResults(records), nil
}
```

**Pattern Observed:** Both have `Scan(ctx context.Context, target string) ([]Result, error)`

**Still no interface?** Correct! We observe the pattern but don't abstract yet. Wait for a consumer to need polymorphism.

---

## Phase 3: Consumer Defines Interface

**Trigger:** A consumer needs to work with both implementations.

**Key Principle:** [Dave Cheney - Practical Go](https://dave.cheney.net/practical-go/presentations/gophercon-israel.html)

> "Let callers define an interface that describes the behaviour they expect. The interface belongs to them, the consumer, not you."

### Example: Orchestrator Needs Abstraction

```go
// In the package that USES scanners (consumer package)
package orchestrator

// Consumer defines the interface THEY need
type TargetScanner interface {
    Scan(ctx context.Context, target string) ([]Result, error)
}

// Consumer function accepts the interface
func ProcessTargets(scanner TargetScanner, targets []string) error {
    for _, target := range targets {
        results, err := scanner.Scan(context.Background(), target)
        if err != nil {
            return fmt.Errorf("scanning %s: %w", target, err)
        }
        processResults(results)
    }
    return nil
}
```

**Key Points:**

1. Interface is defined in **consumer package**, not scanner package
2. Interface has **only the method(s) the consumer needs**
3. Both `Scanner` and `DNSScanner` satisfy `TargetScanner` **implicitly**
4. **No changes needed** to Scanner or DNSScanner code

### Usage

```go
// Both work without any modification
httpScanner := scanner.NewScanner(config)
orchestrator.ProcessTargets(httpScanner, httpTargets)

dnsScanner := scanner.NewDNSScanner(config)
orchestrator.ProcessTargets(dnsScanner, dnsTargets)
```

---

## Phase 4: Test Mocking (If Needed)

**Trigger:** Tests need to isolate behavior without real implementations.

### Example: Test-Local Mock

```go
package orchestrator_test

import (
    "context"
    "testing"

    "myproject/orchestrator"
)

// Test-local mock - satisfies TargetScanner interface
type mockScanner struct {
    scanFunc func(ctx context.Context, target string) ([]Result, error)
}

func (m *mockScanner) Scan(ctx context.Context, target string) ([]Result, error) {
    return m.scanFunc(ctx, target)
}

func TestProcessTargets_Success(t *testing.T) {
    mock := &mockScanner{
        scanFunc: func(ctx context.Context, target string) ([]Result, error) {
            return []Result{{Target: target, Status: "ok"}}, nil
        },
    }

    err := orchestrator.ProcessTargets(mock, []string{"target1", "target2"})

    if err != nil {
        t.Errorf("unexpected error: %v", err)
    }
}

func TestProcessTargets_Error(t *testing.T) {
    mock := &mockScanner{
        scanFunc: func(ctx context.Context, target string) ([]Result, error) {
            return nil, errors.New("scan failed")
        },
    }

    err := orchestrator.ProcessTargets(mock, []string{"target1"})

    if err == nil {
        t.Error("expected error, got nil")
    }
}
```

---

## Decision Tree: When to Create Interface

```
Need to work with multiple implementations?
├─ No → Use concrete type
└─ Yes → Does a consumer need polymorphism?
    ├─ No → Wait (YAGNI)
    └─ Yes → Let consumer define interface
        └─ Where to define?
            ├─ Consumer package (preferred)
            └─ Shared package (if multiple consumers)
```

---

## Anti-Pattern: Premature Interface

### ❌ Wrong: Interface Before Need

```go
package scanner

// ❌ WRONG: Library defines interface with no consumer yet
type Scanner interface {
    Scan(ctx context.Context, target string) ([]Result, error)
}

type httpScanner struct { ... }

func NewScanner(config Config) Scanner {  // ❌ Returns interface
    return &httpScanner{...}
}
```

**Problems:**

1. Interface might be wrong shape (guessing future needs)
2. Can't add methods without breaking implementations
3. Callers locked into library's abstraction
4. Over-engineering with no benefit

### ✅ Correct: Concrete First, Interface When Needed

```go
package scanner

// ✅ CORRECT: Library provides concrete type
type Scanner struct { ... }

func NewScanner(config Config) *Scanner {  // ✅ Returns concrete
    return &Scanner{...}
}

// Later, in consumer package when abstraction needed:
package orchestrator

type TargetScanner interface {  // ✅ Consumer defines
    Scan(ctx context.Context, target string) ([]Result, error)
}
```

---

## Real-World Pattern: HTTP Client Abstraction

### Evolution Over Time

**V1: Direct http.Client usage**

```go
type Service struct {
    client *http.Client
}

func (s *Service) FetchData(url string) ([]byte, error) {
    resp, err := s.client.Get(url)
    // ...
}
```

**V2: Tests need mocking**

```go
// Consumer (test package) defines minimal interface
type httpDoer interface {
    Do(*http.Request) (*http.Response, error)
}

// Service accepts interface
type Service struct {
    client httpDoer  // Interface field
}

// Production: real client
service := &Service{client: &http.Client{}}

// Test: mock client
service := &Service{client: &mockHTTPClient{
    response: &http.Response{StatusCode: 200, Body: ...},
}}
```

**Key:** Interface defined in **consumer** (Service), not by http package.

---

## Pattern: Visitor with Concrete Types

**Source:** Research from production scanners - none use `interface{}` in visitors

### ❌ Wrong: Visitor with interface{}

```go
type Visitor interface {
    Visit(ctx context.Context, node interface{}) ([]Finding, error)
}

// Every implementation needs type assertions
func (v *SecurityVisitor) Visit(ctx context.Context, n interface{}) ([]Finding, error) {
    node, ok := n.(*graph.Node)  // Runtime check
    if !ok {
        return nil, fmt.Errorf("expected *graph.Node, got %T", n)
    }
    // ...
}
```

### ✅ Correct: Visitor with Concrete Type

```go
type Visitor interface {
    Visit(ctx context.Context, node *graph.Node) ([]Finding, error)
}

// Direct use, no assertions
func (v *SecurityVisitor) Visit(ctx context.Context, node *graph.Node) ([]Finding, error) {
    // Immediate access to typed methods
    children := node.GetChildren()
    // ...
}
```

**Evidence:** 0/5 production scanners (165K+ stars) use `interface{}` in visitors.

---

## Pattern: Plugin Registry

**Source:** TruffleHog detector pattern

### Registration Pattern

```go
// Plugin interface (minimal)
type Detector interface {
    Detect(ctx context.Context, data []byte) ([]Finding, error)
}

// Registry
var detectors = make(map[string]Detector)

func Register(name string, d Detector) {
    detectors[name] = d
}

func Get(name string) (Detector, bool) {
    d, ok := detectors[name]
    return d, ok
}

// Plugins register themselves
func init() {
    Register("github", &GitHubDetector{})
    Register("aws", &AWSDetector{})
}
```

### Usage in Engine

```go
func (e *Engine) Scan(ctx context.Context, data []byte) ([]Finding, error) {
    var allFindings []Finding

    for name, detector := range detectors {
        findings, err := detector.Detect(ctx, data)
        if err != nil {
            log.Printf("detector %s failed: %v", name, err)
            continue
        }
        allFindings = append(allFindings, findings...)
    }

    return allFindings, nil
}
```

---

## Pattern: Lifecycle Interface (Nuclei Model)

**Source:** Nuclei executor pattern

### Two-Phase Lifecycle

```go
// Interface captures lifecycle: compile → execute
type Executor interface {
    Compile() error
    Execute(ctx context.Context, target string) (*Result, error)
}

// Implementation
type HTTPExecutor struct {
    template *Template
    compiled *regexp.Regexp
}

func (e *HTTPExecutor) Compile() error {
    // Parse template, compile regex, validate
    var err error
    e.compiled, err = regexp.Compile(e.template.Pattern)
    return err
}

func (e *HTTPExecutor) Execute(ctx context.Context, target string) (*Result, error) {
    // Use pre-compiled state
    if e.compiled.MatchString(target) {
        return &Result{Matched: true}, nil
    }
    return &Result{Matched: false}, nil
}
```

### Engine Usage

```go
func (e *Engine) Run(ctx context.Context, executors []Executor, targets []string) error {
    // Compile once
    for _, exec := range executors {
        if err := exec.Compile(); err != nil {
            return fmt.Errorf("compile failed: %w", err)
        }
    }

    // Execute many times
    for _, target := range targets {
        for _, exec := range executors {
            result, err := exec.Execute(ctx, target)
            // ...
        }
    }

    return nil
}
```

---

## Summary: Interface Design Workflow

### Phases

| Phase                          | Action                     | Interface?       |
| ------------------------------ | -------------------------- | ---------------- |
| 1. First Implementation        | Build concrete type        | ❌ No            |
| 2. Second Implementation       | Observe shared pattern     | ❌ No            |
| 3. Consumer Needs Polymorphism | Consumer defines interface | ✅ Yes           |
| 4. Testing                     | Mock via interface         | ✅ Uses existing |

### Rules

1. **Start concrete** - No interfaces on v1
2. **Wait for pattern** - 2+ implementations before abstracting
3. **Consumer defines** - Interface belongs to caller
4. **Minimal interface** - Only methods consumer needs
5. **Return concrete** - Libraries return `*Type`, not `Interface`

### Quick Reference

```go
// ✅ Library provides concrete type
func NewScanner(config Config) *Scanner

// ✅ Consumer defines interface
type Scannable interface {
    Scan(ctx, target) ([]Result, error)
}

// ✅ Consumer function accepts interface
func Process(s Scannable, targets []string) error
```

---

## References

1. [Dave Cheney - Practical Go](https://dave.cheney.net/practical-go/presentations/gophercon-israel.html) - "Accept interfaces, return structs"
2. [Go Proverbs - Rob Pike](https://go-proverbs.github.io/) - "The bigger the interface, the weaker the abstraction"
3. Research: TruffleHog detector pattern (24K stars)
4. Research: Nuclei executor pattern (26K stars)
5. Research: `.claude/.output/research/2026-01-01-go-scanner-architecture-patterns/SYNTHESIS.md` - Visitor pattern comparison
