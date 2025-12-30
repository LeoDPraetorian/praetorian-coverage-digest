---
name: integrating-standalone-capabilities
description: Use when integrating standalone security tools with Chariot - generates capability wrappers, adapters, and parsers for both existing CLI tools and new Go tools implementing the simple interface pattern
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, AskUserQuestion
---

# Integrating Standalone Capabilities

**Generate Chariot integration code for standalone security tools without requiring Tabularium knowledge.**

## When to Use

Use this skill when:

- Wrapping existing CLI tools (subfinder, httpx, nuclei) for Chariot
- Integrating new Go tools that implement the simple interface pattern
- Converting standalone scanners into Chariot capabilities
- Automating capability integration without manual boilerplate

**You MUST use TodoWrite** to track the generation workflow.

## Quick Reference

| Step                     | Purpose                                              | Output                 |
| ------------------------ | ---------------------------------------------------- | ---------------------- |
| 1. Analyze Tool          | Determine tool type, interface, output format        | Integration strategy   |
| 2. Generate Capability   | Create capability.go with full Tabularium interface  | Wrapper implementation |
| 3. Generate Adapter      | Create adapter.go for Finding→Tabularium translation | Translation layer      |
| 4. Generate Parser       | (CLI only) Create parser.go for output parsing       | Output handler         |
| 5. Generate Registration | Create init.go with registry setup                   | Chariot integration    |
| 6. Verify Compilation    | Test that generated code compiles                    | Working capability     |

---

## Strategic Context

This skill replaces the need for a separate Capability SDK (see `JANUS-RETIREMENT.md`). Instead of publishing an SDK that developers import, we:

1. Document a simple interface pattern (Target, Finding, SimpleCapability)
2. Use Claude to generate Chariot integration code per-tool

**Benefits:**

- No SDK repository to maintain
- No version compatibility issues
- Per-tool customized adapters (not generic)
- External developers write normal standalone tools
- Zero Tabularium exposure for tool authors

---

## The Simple Interface Pattern

This is what developers implement in their standalone tools (NO Tabularium imports):

```go
type Target struct {
    Type   string            // "domain", "ip", "port", "url", "cloud_resource"
    Value  string            // The target value
    Meta   map[string]string // Additional context (port number, creds ref, etc.)
}

type Finding struct {
    Type     string         // "asset", "risk", "attribute"
    Data     map[string]any // Flexible payload
    Severity string         // For risks: "info", "low", "medium", "high", "critical"
}

type SimpleCapability interface {
    Name() string
    Run(ctx context.Context, target Target) ([]Finding, error)
}
```

Developers write tools that work standalone via their own `main.go`:

```bash
./my-scanner --target example.com --type domain
[{"type":"asset","data":{"dns":"sub.example.com","class":"domain"}}]
```

This skill generates the Chariot integration that wraps these standalone tools.

---

## Two Use Cases

### Use Case A: Wrapping Existing CLI Tools

**Input:** Existing tool (subfinder, httpx, nuclei, etc.)

**Analyze:**

- CLI interface (flags, input format)
- Output format (JSON, newline-separated, custom)
- Target type(s) accepted

**Generate:**

- `capability.go` - Shells out to CLI, handles Job lifecycle
- `parser.go` - Parses stdout into Finding structs
- `adapter.go` - Finding → Tabularium models
- `init.go` - Registration

**See:** [CLI Wrapper Workflow](references/cli-wrapper-workflow.md)

### Use Case B: Wrapping New Go Tools

**Input:** Go tool implementing SimpleCapability interface

**Analyze:**

- Go source (verify interface implementation)
- Target/Finding type definitions
- Invocation method (import package vs subprocess)

**Generate:**

- `capability.go` - Imports and invokes scanner.Run()
- `adapter.go` - Finding → Tabularium models
- `init.go` - Registration

**See:** [Go Tool Workflow](references/go-tool-workflow.md)

---

## What This Skill Generates

For each tool, generates files in `modules/chariot/backend/pkg/tasks/capabilities/{tool_name}/`:

### 1. capability.go

Implements the full Tabularium Capability interface (~20 methods):

```go
type SubfinderCapability struct {
    Job    model.Job
    Domain model.Domain
    base.BaseCapability
}

func (c *SubfinderCapability) Name() string { return "subfinder" }
func (c *SubfinderCapability) Title() string { return "Subfinder DNS Discovery" }
func (c *SubfinderCapability) Description() string { return "discovers subdomains" }
func (c *SubfinderCapability) Surface() attacksurface.Surface { return attacksurface.External }

func (c *SubfinderCapability) Invoke() error {
    target := Target{Type: "domain", Value: c.Domain.Name}
    findings, err := invokeSubfinder(target)  // CLI or Go import
    if err != nil {
        return err
    }
    for _, f := range findings {
        models := translateFinding(f, c.Job)
        for _, m := range models {
            c.Job.Send(m)
        }
    }
    return nil
}
```

**Uses BaseCapability embedding** for sensible defaults on other methods.

### 2. adapter.go

Translates Finding structs → Tabularium models:

```go
func translateFinding(f Finding, job model.Job) []model.Model {
    switch f.Type {
    case "asset":
        return translateAsset(f, job)
    case "risk":
        return translateRisk(f, job)
    case "attribute":
        return translateAttribute(f, job)
    }
    return nil
}

func translateAsset(f Finding, job model.Job) []model.Model {
    // Map f.Data fields to appropriate model constructors
    if dns, ok := f.Data["dns"].(string); ok {
        asset := model.NewAsset(dns, "")
        asset.Class = "domain"
        return []model.Model{&asset}
    }
    return nil
}
```

**Per-tool customization** - each adapter handles tool-specific output fields.

### 3. parser.go (CLI tools only)

Parses CLI tool stdout into Finding structs:

```go
func parseOutput(stdout []byte) ([]Finding, error) {
    var findings []Finding

    // Example: newline-separated subdomain list
    lines := bytes.Split(stdout, []byte("\n"))
    for _, line := range lines {
        line = bytes.TrimSpace(line)
        if len(line) == 0 {
            continue
        }

        findings = append(findings, Finding{
            Type: "asset",
            Data: map[string]any{
                "dns":   string(line),
                "class": "domain",
            },
        })
    }

    return findings, nil
}
```

**Handles various formats:** JSON, newline-separated, CSV, custom.

### 4. init.go

Registers capability with Chariot:

```go
func init() {
    registries.RegisterChariotCapability(&SubfinderCapability{}, NewSubfinderCapability)
}

func NewSubfinderCapability(j *model.Job, a any) (model.Capability, error) {
    domain, ok := a.(*model.Domain)
    if !ok {
        return nil, fmt.Errorf("expected *model.Domain, got %T", a)
    }

    return &SubfinderCapability{
        Job:    *j,
        Domain: *domain,
    }, nil
}
```

---

## Generation Workflow

### Step 1: Analyze Tool

Ask user via AskUserQuestion to determine tool type:

- "Existing CLI tool (subfinder, httpx, etc.)" - Shell out to binary
- "New Go tool with simple interface" - Import and invoke Go code

**For CLI tools:**

1. Run `--help` to understand flags and interface
2. Run with test target to examine output format
3. Identify target type(s) (domain, IP, port, etc.)

**For Go tools:**

1. Read Go source files
2. Verify SimpleCapability interface implementation
3. Identify Target/Finding type definitions
4. Determine import path

**See detailed workflows:**

- [CLI Wrapper Workflow](references/cli-wrapper-workflow.md)
- [Go Tool Workflow](references/go-tool-workflow.md)

### Step 2: Generate capability.go

Create wrapper implementing full Tabularium Capability interface:

1. **Struct definition** with Job, target model, BaseCapability embedding
2. **Required methods**: Name(), Title(), Description(), Surface()
3. **Invoke() implementation**:
   - Extract target from Job's asset/model field
   - Convert to simple Target struct
   - Call tool (CLI shell-out or Go import)
   - Parse output to Finding structs
   - Translate findings to Tabularium models
   - Send via job.Send()

**See:** [Adapter Patterns](references/adapter-patterns.md) for Finding→Tabularium translation.

### Step 3: Generate adapter.go

Create Finding→Tabularium translation layer:

1. **Main dispatcher**: `translateFinding(f Finding, job model.Job) []model.Model`
2. **Type-specific handlers**:
   - `translateAsset()` - domain, IP, port, URL, cloud resources
   - `translateRisk()` - vulnerabilities, misconfigurations
   - `translateAttribute()` - metadata, properties

**Per-tool customization** based on tool's specific output fields.

### Step 4: Generate parser.go (CLI tools only)

Create stdout parser matching tool's output format:

1. **Detect format**: JSON, newline-separated, CSV, custom
2. **Implement parseOutput(stdout []byte) ([]Finding, error)**
3. **Handle edge cases**: empty lines, errors, partial output

**See:** [CLI Wrapper Workflow](references/cli-wrapper-workflow.md)

### Step 5: Generate init.go

Create registration with Chariot:

1. **init() function** with RegisterChariotCapability call
2. **Constructor function** (NewXCapability) with type assertions
3. **Error handling** for invalid asset types

### Step 6: Verify Compilation

Test that generated code compiles:

```bash
cd modules/chariot/backend
go build ./pkg/tasks/capabilities/{tool_name}/...
```

If compilation fails, review and fix:

- Import statements
- Type assertions
- Model field references

---

## Key Principles

1. **Zero Tabularium exposure** - Developers never see or import Tabularium
2. **Tools stay standalone** - No SDK import, works as normal CLI
3. **Per-tool customization** - Each adapter is tailored, not generic
4. **Claude handles edge cases** - Weird output formats, custom parsing

---

## References

For detailed implementation guidance, see:

- [Simple Interface Specification](references/simple-interface-spec.md) - Target, Finding, SimpleCapability
- [CLI Wrapper Workflow](references/cli-wrapper-workflow.md) - Step-by-step for CLI tools
- [Go Tool Workflow](references/go-tool-workflow.md) - Step-by-step for Go tools
- [Adapter Patterns](references/adapter-patterns.md) - Finding → Tabularium translation
- [Tabularium Capability Interface](references/tabularium-capability-interface.md) - Full interface reference

**Strategic context:**

- `JANUS-RETIREMENT.md` - Why skill replaces SDK approach
- `modules/chariot/backend/pkg/tasks/capabilities/` - Existing capability examples
- `modules/tabularium/pkg/model/` - Tabularium types for adapter generation

---

## Related Skills

- `gateway-capabilities` - Routes to this skill
- `writing-fingerprintx-modules` - Plugin pattern (different from this)
- `testing-capabilities` - Separate skill for mocks/harnesses

---

## Templates

See `templates/` directory for code generation templates:

- `capability.go.tmpl` - Capability wrapper template
- `adapter.go.tmpl` - Finding translation template
- `parser.go.tmpl` - CLI output parser template
- `init.go.tmpl` - Registration template

---

## Examples

See `examples/` directory for complete examples:

- `subfinder-integration/` - CLI wrapper example (existing tool)
- `custom-scanner-integration/` - Go SimpleCapability example (new tool)
