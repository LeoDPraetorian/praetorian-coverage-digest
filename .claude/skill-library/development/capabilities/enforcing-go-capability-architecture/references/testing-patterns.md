# Testing Patterns

## Table-Driven Tests

```go
func TestDetector_Detect(t *testing.T) {
    tests := []struct {
        name    string
        input   Attempt
        want    []float64
        wantErr bool
    }{
        {"detects bad", Attempt{Outputs: []string{"BAD"}}, []float64{1.0}, false},
        {"passes clean", Attempt{Outputs: []string{"OK"}}, []float64{0.0}, false},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // test logic
        })
    }
}
```

## Interface Mocking

```go
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
```

## Co-location

```text
probes/
├── probe.go
├── probe_test.go
├── jailbreak/
│   ├── dan.go
│   └── jailbreak_test.go
```
