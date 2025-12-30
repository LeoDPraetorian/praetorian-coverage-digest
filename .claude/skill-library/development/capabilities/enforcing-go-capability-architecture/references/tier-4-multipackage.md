# Tier 4: Multi-Package Architecture

**When to use**: 100+ capabilities, multiple capability types.

## Structure

```go
pkg/
├── capability/       # Core abstractions
├── registry/         # Central registry
├── probes/          # 176 probes
├── generators/      # 43 generators
├── detectors/       # 89 detectors
├── buffs/           # 6 buffs
└── harnesses/       # 2 harnesses
```

## Key Characteristics

- Top-level capability package for shared abstractions
- Per-type packages with own interfaces
- Each type has own registry
- Central orchestrator imports all registries

## Import for Side Effects

```go
// cmd/venator/main.go
import (
    _ "github.com/praetorian-inc/venator/pkg/probes/test"
    _ "github.com/praetorian-inc/venator/pkg/probes/jailbreak"
    _ "github.com/praetorian-inc/venator/pkg/generators/openai"
)
```
