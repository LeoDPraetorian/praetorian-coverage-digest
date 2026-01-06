# Tier 1: Single Package Pattern

**When to use**: <10 capabilities, simple interfaces, starting out.

## Structure

```go
pkg/probes/
├── probe.go          # Interface + base type + registry
├── blank.go          # Implementation
├── echo.go           # Implementation
└── probe_test.go     # All tests
```

## Key Characteristics

- Everything in one package
- One file per capability implementation
- Single test file for all tests
- No subdirectories needed

## Example: Test Probes

```go
// probe.go - Interface and base
package probes

type Prober interface {
    Probe(ctx context.Context, gen Generator) ([]Attempt, error)
}

// blank.go - Simple implementation
package probes

type Blank struct{}

func (b *Blank) Probe(ctx context.Context, gen Generator) ([]Attempt, error) {
    return []Attempt{{Prompt: ""}}, nil
}
```

## When to Migrate to Tier 2

- Package grows to 10+ capability files
- Logical categories emerge (test vs real, by-type)
- Finding files becomes difficult
