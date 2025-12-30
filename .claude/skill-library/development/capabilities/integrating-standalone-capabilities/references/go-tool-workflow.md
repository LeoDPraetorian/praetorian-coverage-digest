# Go Tool Workflow

**Step-by-step guide for wrapping new Go tools that implement the SimpleCapability interface.**

## Overview

For Go tools that implement Name() and Run(ctx, Target) ([]Finding, error), we import the package directly instead of shelling out.

## Workflow Steps

### Step 1: Verify Interface Implementation

Read the Go source to confirm it implements SimpleCapability:

```go
type MyScanner struct{}

func (s *MyScanner) Name() string { return "my-scanner" }

func (s *MyScanner) Run(ctx context.Context, target Target) ([]Finding, error) {
    // Scanning logic
    return findings, nil
}
```

### Step 2: Identify Import Path

Determine the Go module path:

```bash
head -1 go.mod  # module github.com/org/scanner
```

### Step 3: Generate capability.go

Import and invoke the Go scanner:

```go
import "github.com/org/scanner"

type MyScannerCapability struct {
    Job    model.Job
    Domain model.Domain
    base.BaseCapability
}

func (c *MyScannerCapability) Invoke() error {
    // Create scanner instance
    s := &scanner.MyScanner{}

    // Convert Chariot target to simple Target
    target := scanner.Target{
        Type:  "domain",
        Value: c.Domain.Name,
    }

    // Invoke scanner
    findings, err := s.Run(context.Background(), target)
    if err != nil {
        return err
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

### Step 4: No Parser Needed

Since we're importing Go code directly, no stdout parsing is needed.

### Step 5: Generate adapter.go

See [Adapter Patterns](adapter-patterns.md) - same as CLI tools.

### Step 6: Generate init.go

Same as CLI tools - see [CLI Wrapper Workflow](cli-wrapper-workflow.md#step-7-generate-initgo).

### Step 7: Update go.mod

Add the scanner module as a dependency:

```bash
cd modules/chariot/backend
go get github.com/org/scanner@latest
```

### Step 8: Verify Compilation

```bash
go build ./pkg/tasks/capabilities/my_scanner/...
```

## Import vs Subprocess

| Approach       | When to Use                                 |
| -------------- | ------------------------------------------- |
| **Import**     | Go module available, want type safety       |
| **Subprocess** | Binary-only distribution, version isolation |

Most new Go tools should use **import** for better performance and error handling.

## References

- [Simple Interface Spec](simple-interface-spec.md)
- [Adapter Patterns](adapter-patterns.md)
- [CLI Wrapper Workflow](cli-wrapper-workflow.md)
