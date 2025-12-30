# Interface Design Patterns

## Core Principles

1. **Small interfaces** (1-3 methods ideal, 5 max)
2. **Consumer-side definition** (define where used)
3. **Composition over inheritance**

## Example Interfaces

```go
// Small, focused interfaces
type Prober interface {
    Probe(ctx context.Context, gen Generator) ([]Attempt, error)
}

type Generator interface {
    Generate(ctx context.Context, conv Conversation, n int) ([]Message, error)
}

type Detector interface {
    Detect(ctx context.Context, attempt Attempt) ([]float64, error)
}
```

## Composition

```go
type Named interface { Name() string }
type Described interface { Description() string }

type Capability interface {
    Named
    Described
}
```

## Consumer-Side Definition

Define interfaces in the package that uses them, not the package that implements them.
