---
name: verifying-port-equivalence
description: Use when verifying Python-to-Go port equivalence through side-by-side testing - provides architecture for subprocess harness, comparison logic, and platform-specific fixes (macOS arm64)
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite
---

# Verifying Port Equivalence

**Side-by-side testing framework for verifying Go implementations match Python behavior during porting projects.**

## When to Use

Use this skill when:

- Porting Python capabilities to Go (e.g., garak → Venator)
- Need to verify Go implementation matches Python behavior
- Building equivalence testing infrastructure for cross-language ports
- Debugging architecture-specific issues (macOS arm64/x86_64 mismatches)

## Quick Reference

| Component | Purpose | Location |
|-----------|---------|----------|
| Python Harness | Subprocess wrapper calling Python | `tools/python_harness/` |
| Go Runner | Direct Go execution via registry | `tests/equivalence/go_runner.go` |
| Comparison Logic | Semantic diff with type handling | `tests/equivalence/compare.go` |
| Test Suites | Table-driven equivalence tests | `tests/equivalence/*_equiv_test.go` |

**Complete workflow:** See [references/workflow.md](references/workflow.md)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Equivalence Test Suite                        │
├─────────────────────────────────────────────────────────────────┤
│  Go Tests (generator_equiv_test.go, detector_equiv_test.go, etc)│
│           │                        │                             │
│           ▼                        ▼                             │
│  ┌─────────────────┐      ┌─────────────────┐                   │
│  │   go_runner.go  │      │ python_harness.go│                  │
│  │  Run Go impls   │      │  Subprocess call │                  │
│  └─────────────────┘      └─────────────────┘                   │
│           │                        │                             │
│           └───────┬────────────────┘                             │
│                   ▼                                              │
│           compare.go (epsilon floats, semantic diff)            │
└─────────────────────────────────────────────────────────────────┘
```

## Key Principles

**⚠️ You MUST use TodoWrite before starting to track all workflow steps**

1. **Python is Source of Truth** - Go must match Python exactly
2. **Type-Aware Comparison** - Floats get epsilon (1e-9), strings exact match
3. **Platform Detection** - Handle macOS arm64/x86_64 architecture mismatches
4. **Progressive Verification** - Build → Unit Test → Equivalence Test
5. **Semantic Diff** - Report exact field differences, not just "failed"

## Components Overview

### 1. Python Harness

**Purpose**: Subprocess wrapper that calls original Python implementation

**Interface**:
```python
# CLI: python harness.py <type> <name> [args]
# Returns: {"success": bool, "capability_type": str, "capability_name": str,
#           "output": dict, "error": str}
```

**Runners**:
- `generator_runner.py` - Runs Python generators
- `detector_runner.py` - Runs Python detectors
- `probe_runner.py` - Runs Python probes

**Details**: See [references/python-harness.md](references/python-harness.md)

### 2. Go Runner

**Purpose**: Direct execution of Go implementations via registry

**Interface**:
```go
func RunGoGenerator(ctx context.Context, name, prompt string, generations int) (*GeneratorResult, error)
func RunGoDetector(ctx context.Context, name string, attemptInput AttemptInput) (*DetectorResult, error)
func RunGoProbe(ctx context.Context, name string, generatorName string) (*ProbeResult, error)
```

**Returns same structure as Python** for direct comparison.

**Details**: See [references/go-runner.md](references/go-runner.md)

### 3. Comparison Logic

**Purpose**: Semantic diff with proper type handling

**Key Functions**:
```go
func CompareGeneratorOutputs(goResult, pyResult *GeneratorResult) ComparisonResult
func CompareDetectorScores(goResult, pyResult *DetectorResult) ComparisonResult
func CompareProbePrompts(goResult, pyResult *ProbeResult) ComparisonResult
```

**Type Handling**:
- **Floats**: Epsilon comparison (1e-9 tolerance) for detector scores
- **Strings**: Exact match for generator outputs
- **Arrays**: Element-by-element comparison with order preservation
- **Structs**: Field-by-field semantic diff

**Returns**: `ComparisonResult{Equivalent: bool, Differences: []Difference}`

**Details**: See [references/comparison-logic.md](references/comparison-logic.md)

### 4. macOS arm64 Fix

**Problem**: Go may run under Rosetta (x86_64) while Python packages are arm64, causing:
```
dlopen(.../_regex.cpython-312-darwin.so, 0x0002):
mach-o file, but is an incompatible architecture (have 'arm64', need 'x86_64')
```

**Solution**: Detect arm64 hardware and wrap Python calls:

```go
// Detect arm64 hardware (works even under Rosetta)
out, err := exec.Command("sysctl", "-n", "hw.optional.arm64").Output()
if err == nil && len(out) > 0 && out[0] == '1' {
    useArch = true
}

// Wrap calls with arch -arm64
if useArch {
    cmd = exec.Command("arch", "-arm64", "python3", args...)
}
```

**Details**: See [references/macos-arm64-fix.md](references/macos-arm64-fix.md)

## Workflow

### Phase 1: Create Python Harness

1. **Design CLI interface** - `python harness.py <type> <name> [args]`
2. **Implement runners** - One per capability type (generator/detector/probe)
3. **Return JSON** - Structured output for comparison
4. **Add tests** - pytest test suite (30-40 tests)

**Output**:
```
tools/python_harness/
├── harness.py          # CLI entry point
├── schemas.py          # Output schemas
├── runners/            # Capability-specific runners
└── tests/              # pytest suite
```

### Phase 2: Create Go Runner

1. **Use registry** - `generators.Create()`, `detectors.Create()`, `probes.Create()`
2. **Match Python structure** - Same JSON output format
3. **Handle errors** - Return structured errors, not panics

### Phase 3: Create Comparison Logic

1. **Implement type-aware comparison** - Float epsilon, string exact
2. **Build Difference struct** - Field, GoValue, PyValue, Message
3. **Return semantic diff** - Not just boolean pass/fail

### Phase 4: Write Equivalence Tests

1. **Table-driven tests** - Multiple scenarios per capability
2. **Test edge cases** - Empty inputs, multiple generations, error scenarios
3. **Assert equivalence** - Use `require.True(t, result.Equivalent)`

**Example**:
```go
func TestGeneratorEquivalence(t *testing.T) {
    harness, _ := NewPythonHarness()
    tests := []struct{
        name        string
        prompt      string
        generations int
    }{
        {"test.Blank", "hello world", 1},
        {"test.Blank", "hello world", 3},
        {"test.Repeat", "echo this", 1},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            pyResult, _ := harness.RunGenerator(ctx, tt.name, tt.prompt, tt.generations)
            goResult, _ := RunGoGenerator(ctx, tt.name, tt.prompt, tt.generations)

            result := CompareGeneratorOutputs(goResult, pyResult)
            require.True(t, result.Equivalent, "Outputs differ")
        })
    }
}
```

### Phase 5: Fix Differences

1. **Run tests** - `go test ./tests/equivalence/... -v`
2. **Read diff output** - Exact field, Go value, Python value
3. **Update Go code** - Match Python exactly (Python is source of truth)
4. **Update unit tests** - Reflect new Python-equivalent values

### Phase 6: Verify

1. **All equivalence tests pass** - 100% passing required
2. **Go unit tests pass** - Updated expectations
3. **Build passes** - `go build ./...`

## Anti-Patterns

### ❌ Don't Assume Go is Correct

**Wrong**:
```go
// Test fails showing Python returns "any.AnyOutput"
// Developer thinks: "Python must be wrong, Go is simpler"
```

**Right**:
```go
// Test fails showing Python returns "any.AnyOutput"
// Update Go to match: GetPrimaryDetector() { return "any.AnyOutput" }
```

**Why**: Python is the source of truth. Go must match exactly.

### ❌ Don't Skip Float Epsilon

**Wrong**:
```go
if goScore != pyScore {  // Exact comparison
    t.Errorf("Scores differ")
}
```

**Right**:
```go
if math.Abs(goScore - pyScore) > 1e-9 {  // Epsilon tolerance
    t.Errorf("Scores differ beyond epsilon")
}
```

**Why**: Floating point arithmetic is inexact. Detector scores need tolerance.

### ❌ Don't Hardcode Paths

**Wrong**:
```go
harnessPath := "/Users/you/project/tools/python_harness/harness.py"
```

**Right**:
```go
// Find harness.py relative to test file
func FindHarnessPath() (string, error) {
    _, filename, _, _ := runtime.Caller(0)
    testDir := filepath.Dir(filename)
    return filepath.Join(testDir, "../../tools/python_harness/harness.py"), nil
}
```

**Why**: Paths differ across machines and CI environments.

### ❌ Don't Ignore Architecture Issues on macOS

**Wrong**:
```go
// Just call python3 directly
cmd := exec.Command("python3", "harness.py", args...)
```

**Right**:
```go
// Detect arm64 and wrap if needed
if isArm64Hardware() {
    cmd = exec.Command("arch", "-arm64", "python3", "harness.py", args...)
}
```

**Why**: Universal Python binaries default to x86_64, but site-packages may be arm64-only.

## Common Issues

### Issue: "mach-o file, but is an incompatible architecture"

**Symptom**:
```
dlopen(.../_regex.cpython-312-darwin.so, 0x0002):
have 'arm64', need 'x86_64'
```

**Cause**: Go running under Rosetta (x86_64), Python packages compiled for arm64

**Fix**: See [references/macos-arm64-fix.md](references/macos-arm64-fix.md)

### Issue: Tests pass but values don't match

**Symptom**: `goResult != pyResult` but test shows PASS

**Cause**: Missing comparison or boolean coercion

**Fix**: Always use `CompareXXX()` functions, check `result.Equivalent`

### Issue: Equivalence tests slow

**Symptom**: Tests take >5s per capability

**Cause**: Python subprocess overhead

**Fix**:
- Run tests in parallel: `go test -parallel 8`
- Use test caching: `go test -count=1` only when needed
- Group similar tests to reduce subprocess spawns

## Related Skills

- `mapping-python-dependencies-to-go` - Dependency research before porting
- `translating-python-idioms-to-go` - Pattern dictionary for idiomatic Go
- `enforcing-go-capability-architecture` - File organization for 100+ capabilities
- `developing-with-tdd` - Test-first development methodology
- `verifying-before-completion` - Final validation checklist

## Reference Implementation

**Venator Project** (garak → Go port):
- Python harness: `venator/tools/python_harness/`
- Go runner: `venator/tests/equivalence/go_runner.go`
- Comparison: `venator/tests/equivalence/compare.go`
- Tests: `venator/tests/equivalence/*_equiv_test.go`

**Test Results**: 179 tests passing (124 Go unit + 39 Python + 16 equivalence)
