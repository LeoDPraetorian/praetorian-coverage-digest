# Performance Considerations

## Parallel Execution

All matching hooks run **in parallel**:

```json
{
  "PreToolUse": [
    {
      "matcher": "Write",
      "hooks": [
        { "type": "command", "command": "check1.sh" }, // Parallel
        { "type": "command", "command": "check2.sh" }, // Parallel
        { "type": "prompt", "prompt": "Validate..." } // Parallel
      ]
    }
  ]
}
```

**Design implications:**

- Hooks don't see each other's output
- Non-deterministic ordering
- Design for independence

## Optimization

1. Use command hooks for quick deterministic checks
2. Use prompt hooks for complex reasoning
3. Cache validation results in temp files
4. Minimize I/O in hot paths
