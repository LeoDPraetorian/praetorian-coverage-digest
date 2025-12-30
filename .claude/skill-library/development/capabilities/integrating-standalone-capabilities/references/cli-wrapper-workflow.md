# CLI Wrapper Workflow

**Step-by-step guide for wrapping existing CLI tools (subfinder, httpx, nuclei, etc.).**

## Overview

For tools that already exist as standalone binaries, we shell out to them from Chariot and parse their output.

## Workflow Steps

### Step 1: Analyze CLI Interface

Run `--help` to understand the tool:

```bash
subfinder --help
```

**Identify:**

- Input flags (`-d`, `-dL`, `-list`)
- Output flags (`-o`, `-oJ`, `-silent`)
- Output format (JSON, newline-separated, etc.)

### Step 2: Test with Sample Target

Run the tool with a test target to examine output:

```bash
subfinder -d example.com -silent
```

**Capture:**

- Output format
- Field structure
- Error handling

### Step 3: Determine Target Type(s)

What types of targets does this tool accept?

| Tool        | Target Type(s) |
| ----------- | -------------- |
| `subfinder` | domain         |
| `httpx`     | url, domain    |
| `nmap`      | ip, port       |
| `nuclei`    | url            |

### Step 4: Generate parser.go

Create a parser matching the tool's output format:

**For newline-separated output:**

```go
func parseOutput(stdout []byte) ([]Finding, error) {
    var findings []Finding
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

**For JSON output:**

```go
func parseOutput(stdout []byte) ([]Finding, error) {
    var results []struct {
        Host string `json:"host"`
        IP   string `json:"ip"`
    }
    if err := json.Unmarshal(stdout, &results); err != nil {
        return nil, err
    }

    var findings []Finding
    for _, r := range results {
        findings = append(findings, Finding{
            Type: "asset",
            Data: map[string]any{
                "dns": r.Host,
                "ip":  r.IP,
                "class": "domain",
            },
        })
    }
    return findings, nil
}
```

### Step 5: Generate capability.go

Create the Chariot capability wrapper:

```go
type SubfinderCapability struct {
    Job    model.Job
    Domain model.Domain
    base.BaseCapability
}

func (c *SubfinderCapability) Name() string { return "subfinder" }
func (c *SubfinderCapability) Title() string { return "Subfinder DNS Discovery" }
func (c *SubfinderCapability) Description() string { return "discovers subdomains using passive sources" }
func (c *SubfinderCapability) Surface() attacksurface.Surface { return attacksurface.External }

func (c *SubfinderCapability) Invoke() error {
    // Shell out to CLI tool
    cmd := exec.Command("subfinder", "-d", c.Domain.Name, "-silent")
    stdout, err := cmd.Output()
    if err != nil {
        return fmt.Errorf("subfinder failed: %w", err)
    }

    // Parse output
    findings, err := parseOutput(stdout)
    if err != nil {
        return fmt.Errorf("parse failed: %w", err)
    }

    // Translate and send
    for _, f := range findings {
        models := translateFinding(f, c.Job)
        for _, m := range models {
            c.Job.Send(m)
        }
    }

    return nil
}
```

### Step 6: Generate adapter.go

See [Adapter Patterns](adapter-patterns.md) for translation logic.

### Step 7: Generate init.go

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

### Step 8: Verify Compilation

```bash
cd modules/chariot/backend
go build ./pkg/tasks/capabilities/subfinder/...
```

## Common CLI Patterns

### JSON Output

- Use `encoding/json` to unmarshal
- Map JSON fields to Finding.Data

### Newline-Separated

- Split on `\n`
- Trim whitespace
- Skip empty lines

### CSV Output

- Use `encoding/csv`
- Map columns to Finding.Data

### Custom Format

- Write regex patterns
- Extract fields with named groups

## Error Handling

Handle CLI tool errors:

```go
cmd := exec.Command("tool", args...)
stdout, stderr, err := captureOutput(cmd)

if err != nil {
    // Check stderr for meaningful errors
    if len(stderr) > 0 {
        return fmt.Errorf("tool failed: %s", stderr)
    }
    return fmt.Errorf("tool failed: %w", err)
}
```

## References

- [Simple Interface Spec](simple-interface-spec.md)
- [Adapter Patterns](adapter-patterns.md)
- [Tabularium Capability Interface](tabularium-capability-interface.md)
