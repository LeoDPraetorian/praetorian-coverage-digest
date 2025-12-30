# Tabularium Capability Interface

**Full reference for the Tabularium Capability interface that generated code implements.**

## Overview

This is the interface that Chariot expects. This skill generates code that implements it, so developers never need to see this complexity.

## Full Interface

```go
type Capability interface {
    // Core identification
    Name() string
    Title() string
    Description() string
    Surface() attacksurface.Surface

    // Execution control
    Match() error
    Accepts() bool
    Invoke() error
    Timeout() int

    // Configuration
    Parameters() []AgoraParameter
    HasGlobalConfig() bool
    Full() bool
    Rescan() bool

    // Credentials
    CredentialType() CredentialType
    CredentialFormat() []CredentialFormat
    CredentialParams() AdditionalCredParams

    // Output
    RawFiles() []File
    LargeArtifact() bool

    // Lifecycle
    Setup() error
    Cleanup() error
}
```

## BaseCapability

Most methods have sensible defaults via embedding:

```go
type MyCapability struct {
    Job    model.Job
    Domain model.Domain
    base.BaseCapability  // Provides defaults for 15+ methods
}
```

## Methods Generated Code Implements

### Required Methods

```go
func (c *MyCapability) Name() string {
    return "my-capability"
}

func (c *MyCapability) Title() string {
    return "Human-Readable Title"
}

func (c *MyCapability) Description() string {
    return "what this capability does"
}

func (c *MyCapability) Surface() attacksurface.Surface {
    return attacksurface.External  // or Internal, Both
}
```

### Invoke() - Core Logic

```go
func (c *MyCapability) Invoke() error {
    // 1. Convert Chariot target to simple Target
    target := Target{
        Type:  "domain",
        Value: c.Domain.Name,
    }

    // 2. Invoke tool (CLI or Go import)
    findings, err := invokeTool(target)
    if err != nil {
        return err
    }

    // 3. Translate findings to Tabularium models
    for _, f := range findings {
        models := translateFinding(f, c.Job)
        for _, m := range models {
            c.Job.Send(m)
        }
    }

    return nil
}
```

### Match() - Target Validation

```go
func (c *MyCapability) Match() error {
    // Validate that the target is the right type
    if c.Domain.Name == "" {
        return fmt.Errorf("domain name is empty")
    }
    return nil
}
```

## BaseCapability Defaults

These methods are provided by base.BaseCapability:

- `Accepts() bool` - Returns true
- `Timeout() int` - Returns default timeout
- `Parameters() []AgoraParameter` - Returns empty
- `HasGlobalConfig() bool` - Returns false
- `Full() bool` - Returns false
- `Rescan() bool` - Returns true
- `CredentialType()` - Returns None
- `CredentialFormat()` - Returns empty
- `CredentialParams()` - Returns empty
- `RawFiles()` - Returns empty
- `LargeArtifact() bool` - Returns false
- `Setup() error` - No-op
- `Cleanup() error` - No-op

## Registration

```go
func init() {
    registries.RegisterChariotCapability(&MyCapability{}, NewMyCapability)
}

func NewMyCapability(j *model.Job, a any) (model.Capability, error) {
    domain, ok := a.(*model.Domain)
    if !ok {
        return nil, fmt.Errorf("expected *model.Domain, got %T", a)
    }

    return &MyCapability{
        Job:    *j,
        Domain: *domain,
    }, nil
}
```

## Target Type Mapping

| Simple Target Type | Tabularium Model | Constructor Field              |
| ------------------ | ---------------- | ------------------------------ |
| `domain`           | `model.Domain`   | `c.Domain.Name`                |
| `ip`               | `model.Asset`    | `c.Asset.IP`                   |
| `port`             | `model.Port`     | `c.Port.IP`, `c.Port.Port`     |
| `url`              | `model.Asset`    | `c.Asset.DNS` (extract domain) |
| `cloud_resource`   | `model.Asset`    | `c.Asset.Key` (ARN/ID)         |

## References

- [Simple Interface Spec](simple-interface-spec.md) - What developers implement
- [Adapter Patterns](adapter-patterns.md) - Finding translation
- `modules/tabularium/pkg/model/` - Model definitions
- `modules/chariot/backend/pkg/tasks/base/` - BaseCapability implementation
