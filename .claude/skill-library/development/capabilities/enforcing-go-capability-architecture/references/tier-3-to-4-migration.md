# Tier 3 → Tier 4 Migration

**Trigger**: Multiple capability types OR 100+ total capabilities

## Steps

1. **Create capability package** - Shared abstractions
2. **Create per-type packages** - probes/, generators/, detectors/
3. **Each type gets own registry** - Separate registration
4. **Central orchestrator** - Imports all registries

## Structure

```text
pkg/
├── capability/       # Shared types
├── probes/          # Prober interface + implementations
├── generators/      # Generator interface + implementations
└── detectors/       # Detector interface + implementations
```

## Central Import

```go
// cmd/main.go
import (
    _ "pkg/probes/jailbreak"
    _ "pkg/generators/openai"
    _ "pkg/detectors/string"
)
```
