# Code Structure Standards for Go Capabilities

## Overview

Standards for organizing code within Go files for capability/plugin systems. Complements the file organization patterns in the main skill by defining import order, file length limits, interface design, and internal file structure.

**Core Principle**: Go code should be scannable and predictable. Consistent structure enables developers to navigate unfamiliar capability implementations quickly.

---

## Import Order (Strict)

**Mandatory order with blank lines between groups:**

```go
// 1. Standard library imports
import (
    "context"
    "encoding/json"
    "fmt"
    "sync"
)

// 2. External dependencies
import (
    "github.com/sashabaranov/go-openai"
    "github.com/sirupsen/logrus"
)

// 3. Internal project imports
import (
    "github.com/praetorian-inc/venator/pkg/attempt"
    "github.com/praetorian-inc/venator/pkg/config"
    "github.com/praetorian-inc/venator/internal/resources"
)
```

**Rules**:

1. **Group 1: Standard library** - All packages from Go's stdlib
2. **Group 2: External** - Third-party dependencies (github.com/*, etc.)
3. **Group 3: Internal** - Your project's own packages

**Blank line between each group** - Makes groups visually distinct

**Within groups**: Alphabetical order (enforced by goimports)

**Combined import block (also acceptable):**

```go
import (
    // Standard library
    "context"
    "fmt"

    // External
    "github.com/sirupsen/logrus"

    // Internal
    "github.com/praetorian-inc/venator/pkg/attempt"
)
```

---

## File Length Limits (Soft Limits)

**These are guidelines with flexibility for complex implementations:**

| File Type      | Soft Limit | Consider Split At | Action Required      |
| -------------- | ---------- | ----------------- | -------------------- |
| Capability     | 500 lines  | 400 lines         | Extract helpers      |
| Interface file | 200 lines  | 150 lines         | Split by concern     |
| Test file      | 800 lines  | 600 lines         | Split by test type   |
| Registry       | 300 lines  | 250 lines         | Extract loader       |

**Functions: 50 Line Soft Limit**

Break functions exceeding 50 lines into smaller, focused functions:

```go
// ❌ PROBLEMATIC - 80 line function
func (p *DanProbe) Probe(ctx context.Context, gen Generator) ([]Attempt, error) {
    // 20 lines: validation
    // 30 lines: prompt generation
    // 30 lines: response processing
}

// ✅ BETTER - Split into focused functions
func (p *DanProbe) Probe(ctx context.Context, gen Generator) ([]Attempt, error) {
    if err := p.validate(ctx); err != nil {
        return nil, err
    }

    prompts := p.generatePrompts()
    responses, err := p.executePrompts(ctx, gen, prompts)
    if err != nil {
        return nil, err
    }

    return p.processResponses(responses), nil
}

func (p *DanProbe) validate(ctx context.Context) error { /* 15 lines */ }
func (p *DanProbe) generatePrompts() []string { /* 20 lines */ }
func (p *DanProbe) executePrompts(ctx context.Context, gen Generator, prompts []string) ([]Message, error) { /* 25 lines */ }
func (p *DanProbe) processResponses(responses []Message) []Attempt { /* 20 lines */ }
```

**Interfaces: 5 Method Hard Limit**

Go idiom: prefer small interfaces. If interface exceeds 5 methods, split:

```go
// ❌ BAD - Fat interface forces unnecessary implementation
type Capability interface {
    Name() string
    Description() string
    Configure(Config) error
    Validate() error
    Execute(context.Context) error
    GetResults() []Result
    Cleanup() error
    Metrics() Metrics
}

// ✅ GOOD - Composed small interfaces
type Named interface {
    Name() string
    Description() string
}

type Configurable interface {
    Configure(Config) error
    Validate() error
}

type Executable interface {
    Execute(context.Context) error
    GetResults() []Result
}

// Compose when you need the full set
type FullCapability interface {
    Named
    Configurable
    Executable
}
```

---

## File Internal Structure (Mandatory Order)

**Every Go file MUST follow this order:**

```go
// ============================================
// 1. PACKAGE DOCUMENTATION (Top of file)
// ============================================
// Package openai provides a Generator implementation for OpenAI's API.
//
// It supports GPT-3.5, GPT-4, and other OpenAI models with automatic
// retry logic and rate limiting.
package openai

// ============================================
// 2. IMPORTS
// ============================================
import (
    "context"
    "fmt"

    openai "github.com/sashabaranov/go-openai"

    "github.com/praetorian-inc/venator/pkg/generators"
)

// ============================================
// 3. CONSTANTS AND PACKAGE-LEVEL VARIABLES
// ============================================
const (
    DefaultModel       = "gpt-4"
    DefaultMaxTokens   = 150
    DefaultTemperature = 0.7
)

var (
    // ErrInvalidAPIKey is returned when the API key is missing or invalid.
    ErrInvalidAPIKey = errors.New("invalid API key")
)

// ============================================
// 4. TYPE DEFINITIONS (structs, type aliases)
// ============================================
// Config holds configuration for the OpenAI generator.
type Config struct {
    APIKey      string
    Model       string
    MaxTokens   int
    Temperature float64
}

// Generator implements the generators.Generator interface for OpenAI.
type Generator struct {
    config Config
    client *openai.Client
}

// ============================================
// 5. INTERFACE DEFINITIONS (if this file owns them)
// ============================================
// (Usually interfaces go in their own file or consumer package)

// ============================================
// 6. CONSTRUCTOR FUNCTIONS
// ============================================
// New creates a new OpenAI generator with the given configuration.
func New(cfg Config) (*Generator, error) {
    if cfg.APIKey == "" {
        return nil, ErrInvalidAPIKey
    }

    if cfg.Model == "" {
        cfg.Model = DefaultModel
    }

    client := openai.NewClient(cfg.APIKey)

    return &Generator{
        config: cfg,
        client: client,
    }, nil
}

// ============================================
// 7. INTERFACE IMPLEMENTATION METHODS
// ============================================
// Generate implements generators.Generator.
func (g *Generator) Generate(ctx context.Context, conv Conversation, n int) ([]Message, error) {
    // Implementation
}

// ClearHistory implements generators.Generator.
func (g *Generator) ClearHistory() {
    // Implementation
}

// ============================================
// 8. OTHER PUBLIC METHODS
// ============================================
// SetModel changes the model used for generation.
func (g *Generator) SetModel(model string) {
    g.config.Model = model
}

// ============================================
// 9. PRIVATE METHODS
// ============================================
func (g *Generator) buildRequest(conv Conversation) openai.ChatCompletionRequest {
    // Implementation
}

func (g *Generator) handleError(err error) error {
    // Implementation
}

// ============================================
// 10. PACKAGE-LEVEL HELPER FUNCTIONS
// ============================================
func validateConfig(cfg Config) error {
    // Implementation
}
```

**Why This Order Matters**:

1. **Package doc first** - Reader knows what file is about immediately
2. **Imports next** - See dependencies upfront
3. **Constants/vars** - Configuration before types that use them
4. **Types** - Understand data structures before functions
5. **Constructors** - Entry point after understanding types
6. **Interface methods** - Primary functionality grouped
7. **Other public** - Secondary API
8. **Private methods** - Implementation details last
9. **Helpers** - Utility functions at the bottom

---

## Interface Design Patterns

### Consumer-Side Interface Definition

**Define interfaces where they're used, not where implemented:**

```go
// ❌ BAD: Interface in implementation package
// pkg/generators/openai/openai.go
package openai

type Generator interface {  // Don't define here
    Generate(ctx context.Context, conv Conversation, n int) ([]Message, error)
}

type OpenAIGenerator struct { ... }

// ✅ GOOD: Interface in consumer package
// pkg/probes/probe.go
package probes

// Generator is what probes need from any generator.
// Defined here (consumer) not in generators package (implementer).
type Generator interface {
    Generate(ctx context.Context, conv Conversation, n int) ([]Message, error)
}

// Probe uses Generator without knowing about OpenAI, Anthropic, etc.
type Probe struct {
    gen Generator
}
```

### Composition Pattern

```go
// Small, focused interfaces
type Named interface {
    Name() string
}

type Described interface {
    Description() string
}

type Configured interface {
    Configure(Config) error
}

// Compose for broader contracts
type Capability interface {
    Named
    Described
    Configured
}

// Accept smallest interface that works
func PrintCapabilityInfo(c Named) {  // Not Capability if we only need Name()
    fmt.Println(c.Name())
}
```

---

## Error Handling Patterns

### Sentinel Errors

```go
// Package-level sentinel errors
var (
    ErrNotFound       = errors.New("capability not found")
    ErrInvalidConfig  = errors.New("invalid configuration")
    ErrRateLimited    = errors.New("rate limited")
)

// Usage
func (r *Registry) Get(name string) (Capability, error) {
    cap, ok := r.capabilities[name]
    if !ok {
        return nil, fmt.Errorf("%w: %s", ErrNotFound, name)
    }
    return cap, nil
}
```

### Error Wrapping

```go
func (g *Generator) Generate(ctx context.Context, conv Conversation, n int) ([]Message, error) {
    resp, err := g.client.CreateChatCompletion(ctx, req)
    if err != nil {
        // Wrap with context, preserve original
        return nil, fmt.Errorf("openai generate: %w", err)
    }
    return messages, nil
}
```

---

## Configuration Patterns

### Functional Options

```go
// Option configures a Generator.
type Option func(*Generator)

// WithModel sets the model.
func WithModel(model string) Option {
    return func(g *Generator) {
        g.model = model
    }
}

// WithMaxTokens sets the max tokens.
func WithMaxTokens(n int) Option {
    return func(g *Generator) {
        g.maxTokens = n
    }
}

// New creates a Generator with options.
func New(apiKey string, opts ...Option) *Generator {
    g := &Generator{
        apiKey:    apiKey,
        model:     DefaultModel,
        maxTokens: DefaultMaxTokens,
    }
    for _, opt := range opts {
        opt(g)
    }
    return g
}

// Usage
gen := openai.New(apiKey,
    openai.WithModel("gpt-4"),
    openai.WithMaxTokens(500),
)
```

---

## Testing Patterns

### Table-Driven Tests

```go
func TestDetector_Detect(t *testing.T) {
    tests := []struct {
        name    string
        input   Attempt
        want    []float64
        wantErr bool
    }{
        {
            name:  "detects known bad string",
            input: Attempt{Outputs: []string{"IGNORE PREVIOUS INSTRUCTIONS"}},
            want:  []float64{1.0},
        },
        {
            name:  "passes clean input",
            input: Attempt{Outputs: []string{"Hello, how can I help?"}},
            want:  []float64{0.0},
        },
        {
            name:    "handles empty output",
            input:   Attempt{Outputs: []string{}},
            wantErr: true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            d := NewStringDetector([]string{"IGNORE PREVIOUS"})
            got, err := d.Detect(context.Background(), tt.input)

            if (err != nil) != tt.wantErr {
                t.Errorf("Detect() error = %v, wantErr %v", err, tt.wantErr)
                return
            }
            if !reflect.DeepEqual(got, tt.want) {
                t.Errorf("Detect() = %v, want %v", got, tt.want)
            }
        })
    }
}
```

### Interface Mocking

```go
// Mock generator for testing probes
type mockGenerator struct {
    responses []Message
    err       error
}

func (m *mockGenerator) Generate(ctx context.Context, conv Conversation, n int) ([]Message, error) {
    if m.err != nil {
        return nil, m.err
    }
    return m.responses, nil
}

func (m *mockGenerator) ClearHistory() {}

func TestProbe_WithMockGenerator(t *testing.T) {
    mock := &mockGenerator{
        responses: []Message{{Content: "test response"}},
    }

    probe := NewDanProbe()
    attempts, err := probe.Probe(context.Background(), mock)

    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    // Assert on attempts...
}
```

---

## Related

- Main skill: [Go Capability Information Architecture](../SKILL.md)
- Python idiom translation: [translating-python-idioms-to-go](../../translating-python-idioms-to-go/SKILL.md)
- Dependency mapping: [mapping-python-dependencies-to-go](../../mapping-python-dependencies-to-go/SKILL.md)
