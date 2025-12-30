# Naming Patterns

## Directories

```text
✅ probes/           # Plural, lowercase
✅ openai/           # Provider name, lowercase
✅ internal/         # Go convention

❌ probe/            # Not plural
❌ OpenAI/           # Not lowercase
```

## Files

```text
✅ probe.go          # Interface + core types
✅ registry.go       # Registration logic
✅ dan.go            # Single capability
✅ probe_test.go     # Tests

❌ Probe.go          # Not PascalCase
❌ dan_probe.go      # Redundant
```

## Interfaces

- Use noun or adjective (Reader, Configurable)
- Single method: use -er suffix (Prober, Generator)
- Multiple methods: descriptive name (Capability)
