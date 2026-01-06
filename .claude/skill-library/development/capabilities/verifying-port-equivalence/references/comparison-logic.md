# Comparison Logic Implementation

Type-aware semantic diff for cross-language equivalence testing.

## Core Types

```go
type Difference struct {
    Field    string      // Which field differs
    GoValue  interface{} // Go implementation value
    PyValue  interface{} // Python implementation value
    Message  string      // Human-readable description
}

type ComparisonResult struct {
    Equivalent  bool
    Differences []Difference
}
```

## Float Comparison

**Always use epsilon for floating point values.**

```go
const FloatEpsilon = 1e-9

func floatsEqual(a, b, epsilon float64) bool {
    return math.Abs(a-b) < epsilon
}

func CompareDetectorScores(goResult, pyResult *DetectorResult) ComparisonResult {
    result := ComparisonResult{Equivalent: true}

    // Check score count
    if len(goResult.Scores) != len(pyResult.Scores) {
        result.Equivalent = false
        result.Differences = append(result.Differences, Difference{
            Field:   "scores.length",
            GoValue: len(goResult.Scores),
            PyValue: len(pyResult.Scores),
            Message: fmt.Sprintf("Score count differs: Go=%d, Python=%d",
                len(goResult.Scores), len(pyResult.Scores)),
        })
        return result
    }

    // Compare each score with epsilon
    for i := range goResult.Scores {
        if !floatsEqual(goResult.Scores[i], pyResult.Scores[i], FloatEpsilon) {
            result.Equivalent = false
            result.Differences = append(result.Differences, Difference{
                Field:   fmt.Sprintf("scores[%d]", i),
                GoValue: goResult.Scores[i],
                PyValue: pyResult.Scores[i],
                Message: fmt.Sprintf("Score differs: Go=%.9f, Python=%.9f",
                    goResult.Scores[i], pyResult.Scores[i]),
            })
        }
    }

    return result
}
```

## String Comparison

**Use exact match for strings.**

```go
func CompareGeneratorOutputs(goResult, pyResult *GeneratorResult) ComparisonResult {
    result := ComparisonResult{Equivalent: true}

    // Check output count
    if len(goResult.Outputs) != len(pyResult.Outputs) {
        result.Equivalent = false
        result.Differences = append(result.Differences, Difference{
            Field:   "outputs.length",
            GoValue: len(goResult.Outputs),
            PyValue: len(pyResult.Outputs),
            Message: fmt.Sprintf("Output count differs: Go=%d, Python=%d",
                len(goResult.Outputs), len(pyResult.Outputs)),
        })
        return result
    }

    // Compare each output string (exact match)
    for i := range goResult.Outputs {
        if goResult.Outputs[i] != pyResult.Outputs[i] {
            result.Equivalent = false
            result.Differences = append(result.Differences, Difference{
                Field:   fmt.Sprintf("outputs[%d]", i),
                GoValue: goResult.Outputs[i],
                PyValue: pyResult.Outputs[i],
                Message: fmt.Sprintf("Output differs at index %d", i),
            })
        }
    }

    return result
}
```

## Array Comparison

**Order matters for arrays.**

```go
func CompareProbePrompts(goResult, pyResult *ProbeResult) ComparisonResult {
    result := ComparisonResult{Equivalent: true}

    // Check prompt count
    if len(goResult.Prompts) != len(pyResult.Prompts) {
        result.Equivalent = false
        result.Differences = append(result.Differences, Difference{
            Field:   "prompts.length",
            GoValue: len(goResult.Prompts),
            PyValue: len(pyResult.Prompts),
            Message: fmt.Sprintf("Prompt count differs: Go=%d, Python=%d",
                len(goResult.Prompts), len(pyResult.Prompts)),
        })
    }

    // Compare each prompt (order matters)
    minLen := min(len(goResult.Prompts), len(pyResult.Prompts))
    for i := 0; i < minLen; i++ {
        if goResult.Prompts[i] != pyResult.Prompts[i] {
            result.Equivalent = false
            result.Differences = append(result.Differences, Difference{
                Field:   fmt.Sprintf("prompts[%d]", i),
                GoValue: goResult.Prompts[i],
                PyValue: pyResult.Prompts[i],
                Message: fmt.Sprintf("Prompt differs at index %d", i),
            })
        }
    }

    // Check primary_detector
    if goResult.PrimaryDetector != pyResult.PrimaryDetector {
        result.Equivalent = false
        result.Differences = append(result.Differences, Difference{
            Field:   "primary_detector",
            GoValue: goResult.PrimaryDetector,
            PyValue: pyResult.PrimaryDetector,
            Message: fmt.Sprintf("Primary detector differs: Go=%s, Python=%s",
                goResult.PrimaryDetector, pyResult.PrimaryDetector),
        })
    }

    // Check goal (if present in both)
    if goResult.Goal != pyResult.Goal {
        result.Equivalent = false
        result.Differences = append(result.Differences, Difference{
            Field:   "goal",
            GoValue: goResult.Goal,
            PyValue: pyResult.Goal,
            Message: fmt.Sprintf("Goal differs: Go=%q, Python=%q",
                goResult.Goal, pyResult.Goal),
        })
    }

    return result
}
```

## Why Type-Specific Comparison

| Type   | Comparison      | Reason                     |
| ------ | --------------- | -------------------------- |
| Float  | Epsilon (1e-9)  | Floating point imprecision |
| String | Exact match     | Must be character-perfect  |
| Array  | Element + order | Python list semantics      |
| Struct | Field-by-field  | Semantic equivalence       |
