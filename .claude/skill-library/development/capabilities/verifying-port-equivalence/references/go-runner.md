# Go Runner Implementation

Direct execution of Go capabilities via registry pattern.

## Purpose

Execute Go implementations and return results in same format as Python harness for direct comparison.

## Architecture

```
Go Test → Go Registry → Capability → Result → Comparison
```

## Implementation

### Generator Runner

```go
func RunGoGenerator(ctx context.Context, name, prompt string, generations int) (*GeneratorResult, error) {
    // Create via registry
    gen, err := generators.Create(name, registry.Config{})
    if err != nil {
        return &GeneratorResult{
            Success: false,
            Name:    name,
            Error:   err.Error(),
        }, nil  // Return error in result, not as Go error
    }

    // Build conversation
    conv := attempt.NewConversation()
    conv.AddPrompt(prompt)

    // Execute generation
    messages, err := gen.Generate(ctx, conv, generations)
    if err != nil {
        return &GeneratorResult{
            Success: false,
            Name:    name,
            Error:   err.Error(),
        }, nil
    }

    // Extract content
    outputs := make([]string, len(messages))
    for i, msg := range messages {
        outputs[i] = msg.Content
    }

    return &GeneratorResult{
        Success: true,
        Name:    name,
        Outputs: outputs,
    }, nil
}
```

### Detector Runner

```go
func RunGoDetector(ctx context.Context, name string, attemptInput AttemptInput) (*DetectorResult, error) {
    // Create via registry
    det, err := detectors.Create(name, registry.Config{})
    if err != nil {
        return &DetectorResult{
            Success: false,
            Name:    name,
            Error:   err.Error(),
        }, nil
    }

    // Build attempt
    att := attempt.New(attemptInput.Prompt)
    for _, output := range attemptInput.Outputs {
        att.AddOutput(output)
    }

    // Execute detection
    scores, err := det.Detect(ctx, att)
    if err != nil {
        return &DetectorResult{
            Success: false,
            Name:    name,
            Error:   err.Error(),
        }, nil
    }

    return &DetectorResult{
        Success: true,
        Name:    name,
        Scores:  scores,
    }, nil
}
```

### Probe Runner

```go
func RunGoProbe(ctx context.Context, name string, generatorName string) (*ProbeResult, error) {
    // Create via registry
    probe, err := probes.Create(name, registry.Config{})
    if err != nil {
        return &ProbeResult{
            Success: false,
            Name:    name,
            Error:   err.Error(),
        }, nil
    }

    // Get metadata (always available)
    prompts := probe.GetPrompts()
    primaryDetector := probe.GetPrimaryDetector()
    goal := probe.Goal()

    result := &ProbeResult{
        Success:         true,
        Name:            name,
        Prompts:         prompts,
        PrimaryDetector: primaryDetector,
        Goal:            goal,
    }

    // Optionally run probe with generator
    if generatorName != "" {
        gen, err := generators.Create(generatorName, registry.Config{})
        if err != nil {
            return &ProbeResult{
                Success: false,
                Name:    name,
                Error:   fmt.Sprintf("failed to create generator %s: %v", generatorName, err),
            }, nil
        }

        _, err = probe.Probe(ctx, gen)
        if err != nil {
            return &ProbeResult{
                Success: false,
                Name:    name,
                Error:   err.Error(),
            }, nil
        }
    }

    return result, nil
}
```

## Error Handling Pattern

**Key principle**: Return errors in the result struct, not as Go errors.

**Why**: Python harness returns errors as JSON. Go must match this format.

```go
// ✅ CORRECT
return &GeneratorResult{
    Success: false,
    Error:   err.Error(),
}, nil

// ❌ WRONG
return nil, err  // Different format than Python
```

## Registry Pattern

All capabilities use self-registration via `init()`:

```go
func init() {
    generators.Register("test.Blank", NewBlank)
}
```

Runner uses registry to get factory:

```go
gen, err := generators.Create(name, registry.Config{})
```

This matches how production code will use capabilities.
