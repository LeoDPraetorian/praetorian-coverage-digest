# Venator Architecture (Gold Standard)

Venator is the Go port of garak with 331 capabilities.

## Structure

```text
venator/
├── cmd/venator/
│   └── main.go             # CLI + registration imports
├── pkg/
│   ├── attempt/            # Core data types
│   │   ├── attempt.go
│   │   ├── message.go
│   │   └── conversation.go
│   ├── config/             # Configuration
│   ├── registry/           # Central registry
│   ├── probes/             # 176 probes
│   │   ├── probe.go
│   │   ├── test/
│   │   ├── jailbreak/
│   │   └── injection/
│   ├── generators/         # 43 generators
│   │   ├── generator.go
│   │   ├── test/
│   │   └── openai/
│   ├── detectors/          # 89 detectors
│   ├── buffs/              # 6 buffs
│   └── harnesses/          # 2 harnesses
├── internal/
│   └── resources/          # Embedded data
└── tests/
    └── equivalence/        # Python comparison
```

## Why It Works

- Clear capability type separation
- Focused interfaces per type
- Registry for dynamic discovery
- Self-registration keeps capabilities self-contained
- Easy to add new capabilities
