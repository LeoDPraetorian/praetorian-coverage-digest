# Complete Equivalence Testing Workflow

Detailed step-by-step guide for implementing equivalence testing from scratch.

## Phase 1: Create Python Harness

### Step 1: Design CLI Interface

Create `tools/python_harness/harness.py` with subcommands:

```bash
python harness.py generator <name> --prompt <p> --generations <n>
python harness.py detector <name> --attempt <json>
python harness.py probe <name> [--generator <gen>]
```

### Step 2: Implement Schemas

Create `tools/python_harness/schemas.py`:

```python
from dataclasses import dataclass
from typing import Optional, Dict, Any

@dataclass
class HarnessResult:
    success: bool
    capability_type: str  # "generator" | "detector" | "probe"
    capability_name: str
    output: Dict[str, Any]
    error: Optional[str] = None
```

### Step 3: Implement Runners

Create three runner modules:

**generator_runner.py**:
```python
def run_generator(name: str, prompt: str, generations: int) -> dict:
    # Import and instantiate Python generator
    gen = get_generator(name)
    # Run generation
    outputs = gen.generate(prompt, n=generations)
    # Return structured output
    return {"generations": outputs}
```

**detector_runner.py**:
```python
def run_detector(name: str, attempt_json: str) -> dict:
    # Parse attempt
    attempt = json.loads(attempt_json)
    # Import and instantiate Python detector
    det = get_detector(name)
    # Run detection
    scores = det.detect(attempt)
    # Return structured output
    return {"scores": scores}
```

**probe_runner.py**:
```python
def run_probe(name: str, generator_name: Optional[str] = None) -> dict:
    # Import and instantiate Python probe
    probe = get_probe(name)
    # Get metadata
    prompts = probe.prompts
    primary_detector = probe.primary_detector
    goal = probe.goal
    # Optionally run with generator
    attempts = []
    if generator_name:
        gen = get_generator(generator_name)
        attempts = probe.probe(gen)
    # Return structured output
    return {
        "prompts": prompts,
        "primary_detector": primary_detector,
        "goal": goal,
        "attempts": [serialize_attempt(a) for a in attempts]
    }
```

### Step 4: Add pytest Tests

Create `tools/python_harness/tests/`:

```python
# test_generator_runner.py
def test_run_blank_generator_returns_empty_strings():
    result = run_generator("test.Blank", "hello", 3)
    assert result["success"] == True
    assert len(result["output"]["generations"]) == 3
    assert all(g == "" for g in result["output"]["generations"])

# test_detector_runner.py
def test_run_always_pass_returns_zeros():
    attempt = {"prompt": "test", "outputs": ["response"]}
    result = run_detector("always.Pass", json.dumps(attempt))
    assert result["success"] == True
    assert result["output"]["scores"] == [0.0]

# test_probe_runner.py
def test_run_test_probe_returns_prompts():
    result = run_probe("test.Test")
    assert result["success"] == True
    assert len(result["output"]["prompts"]) == 8
    assert result["output"]["primary_detector"] == "always.Pass"
```

## Phase 2: Create Go Runner

### Step 1: Define Result Types

Create `tests/equivalence/types.go`:

```go
type GeneratorResult struct {
    Success bool     `json:"success"`
    Name    string   `json:"capability_name"`
    Outputs []string `json:"outputs"`
    Error   string   `json:"error,omitempty"`
}

type DetectorResult struct {
    Success bool      `json:"success"`
    Name    string    `json:"capability_name"`
    Scores  []float64 `json:"scores"`
    Error   string    `json:"error,omitempty"`
}

type ProbeResult struct {
    Success         bool     `json:"success"`
    Name            string   `json:"capability_name"`
    Prompts         []string `json:"prompts"`
    PrimaryDetector string   `json:"primary_detector"`
    Goal            string   `json:"goal,omitempty"`
    Error           string   `json:"error,omitempty"`
}
```

### Step 2: Implement Runners

Create `tests/equivalence/go_runner.go`:

```go
func RunGoGenerator(ctx context.Context, name, prompt string, generations int) (*GeneratorResult, error) {
    // Create generator via registry
    gen, err := generators.Create(name, registry.Config{})
    if err != nil {
        return &GeneratorResult{Success: false, Name: name, Error: err.Error()}, nil
    }

    // Create conversation
    conv := attempt.NewConversation()
    conv.AddPrompt(prompt)

    // Generate responses
    messages, err := gen.Generate(ctx, conv, generations)
    if err != nil {
        return &GeneratorResult{Success: false, Name: name, Error: err.Error()}, nil
    }

    // Extract contents
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

### Step 3: Add Path Detection

Create `tests/equivalence/testutil.go`:

```go
func FindProjectRoot() (string, error) {
    _, filename, _, ok := runtime.Caller(0)
    if !ok {
        return "", fmt.Errorf("failed to get caller info")
    }

    // Navigate up from tests/equivalence/ to project root
    testDir := filepath.Dir(filename)
    projectRoot := filepath.Join(testDir, "../..")
    return filepath.Abs(projectRoot)
}

func FindGarakPath() (string, error) {
    projectRoot, err := FindProjectRoot()
    if err != nil {
        return "", err
    }
    return filepath.Join(projectRoot, "../garak"), nil
}

func FindHarnessPath() (string, error) {
    projectRoot, err := FindProjectRoot()
    if err != nil {
        return "", err
    }
    return filepath.Join(projectRoot, "tools/python_harness/harness.py"), nil
}
```

## Phase 3: Create Comparison Logic

See [comparison-logic.md](comparison-logic.md) for complete implementation.

## Phase 4: Write Equivalence Tests

See examples in SKILL.md main content.

## Phase 5: Fix Differences

### Workflow

1. **Run tests**: `go test ./tests/equivalence/... -v`
2. **Read failures**: Look for `Difference in <field>: Go=<value>, Python=<value>`
3. **Update Go code**: Change Go to match Python
4. **Update unit tests**: Change test expectations to match new Go values
5. **Re-run tests**: Verify equivalence tests pass
6. **Verify unit tests**: Confirm unit tests still pass

### Example Fix

**Test output**:
```
Difference in primary_detector: Go=always.Pass, Python=any.AnyOutput
```

**Fix in Go**:
```go
// Before
func (b *Blank) GetPrimaryDetector() string {
    return "always.Pass"
}

// After
func (b *Blank) GetPrimaryDetector() string {
    return "any.AnyOutput"  // Match Python garak
}
```

**Update unit test**:
```go
// Before
assert.Equal(t, "always.Pass", probe.GetPrimaryDetector())

// After
assert.Equal(t, "any.AnyOutput", probe.GetPrimaryDetector())
```

## Phase 6: Verify

### Checklist

- [ ] Python harness has 30+ tests passing
- [ ] Go unit tests pass (100%)
- [ ] Equivalence tests pass (100%)
- [ ] `go build ./...` succeeds
- [ ] No hardcoded paths
- [ ] macOS arm64 wrapper in place
- [ ] Float comparison uses epsilon
