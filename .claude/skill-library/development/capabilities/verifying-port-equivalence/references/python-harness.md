# Python Harness Implementation

Detailed guide for building the Python subprocess wrapper.

## Architecture

The harness acts as a bridge between Go tests and Python implementations:

```
Go Test → Python Harness CLI → Python Implementation → JSON Output → Go Test
```

## CLI Design

### Subcommands

**generator**:

```bash
python harness.py generator <name> --prompt <text> --generations <n>
```

**detector**:

```bash
python harness.py detector <name> --attempt '{"prompt":"x","outputs":["y"]}'
```

**probe**:

```bash
python harness.py probe <name> [--generator <gen>]
```

### JSON Output Format

All commands return this structure:

```json
{
  "success": true,
  "capability_type": "generator|detector|probe",
  "capability_name": "test.Blank",
  "output": {
    /* capability-specific */
  },
  "error": null
}
```

## Implementation Details

### Error Handling

Return structured errors, never crash:

```python
try:
    result = run_capability(...)
    return HarnessResult(success=True, output=result)
except Exception as e:
    return HarnessResult(success=False, error=str(e))
```

### PYTHONPATH Configuration

Set PYTHONPATH to find garak:

```python
import sys
import os

# Add garak to path
garak_path = os.path.join(os.path.dirname(__file__), "../../../garak")
sys.path.insert(0, garak_path)
```

Or from Go:

```go
cmd.Env = append(cmd.Environ(), fmt.Sprintf("PYTHONPATH=%s", garakPath))
```

## Testing

Create comprehensive pytest suite:

```bash
pytest tests/ -v  # Should have 30-40 tests
```

Test categories:

- Each runner (generator/detector/probe): 10 tests each
- CLI integration: 9 tests
- Error handling: edge cases
