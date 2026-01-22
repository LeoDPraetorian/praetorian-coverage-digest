---
name: go-best-practices
description: Use when writing Go code - covers CLI structure (thin main.go + pkg/runner), function organization (important first, helpers last), and early returns to avoid nesting
allowed-tools: Read, Bash, Grep, Glob
---

# Go Best Practices

**Praetorian Go code style and organization patterns.**

## When to Use

Use this skill when:

- Creating new Go CLI tools
- Writing or reviewing Go code
- Organizing functions within a file
- Refactoring nested conditional logic

---

## 1. CLI Structure: Thin main.go + pkg/runner

**Pattern:** Keep `main.go` minimal. Put all CLI logic in `pkg/runner/`.

### Directory Structure

```
cmd/myapp/
└── main.go              # MINIMAL: just calls runner.Run()

pkg/runner/
├── runner.go            # Root command, Execute(), CLI setup
├── scan.go              # Scan subcommand
├── list.go              # List subcommand
└── options.go           # Shared CLI options/flags
```

### main.go (Thin)

```go
// cmd/myapp/main.go
package main

import (
    "os"

    "github.com/org/myapp/pkg/runner"
)

func main() {
    if err := runner.Run(); err != nil {
        os.Exit(1)
    }
}
```

**That's it.** No flag parsing, no command setup, no business logic.

### pkg/runner/runner.go

```go
// pkg/runner/runner.go
package runner

import (
    "github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
    Use:   "myapp",
    Short: "My application description",
}

func init() {
    rootCmd.AddCommand(scanCmd)
    rootCmd.AddCommand(listCmd)
}

func Run() error {
    return rootCmd.Execute()
}
```

### Why This Pattern?

| Benefit        | Explanation                                                 |
| -------------- | ----------------------------------------------------------- |
| **Testable**   | Can import `pkg/runner` in tests, call functions directly   |
| **Reusable**   | Other tools can import and use your CLI logic               |
| **Consistent** | Matches Praetorian tooling conventions (fingerprintx, etc.) |
| **Clean**      | Separates entry point from implementation                   |

### Reference Implementation

See [fingerprintx/pkg/runner](https://github.com/praetorian-inc/fingerprintx/tree/main/pkg/runner) for the canonical example.

---

## 2. Function Organization: Important First, Helpers Last

**Pattern:** Organize files with the most important functions at the top, helper functions at the bottom.

### The Rule

```
1. Exported functions (Public API)
2. Main logic functions
3. Helper functions
4. Private utilities
```

### Example: Well-Organized File

```go
package scanner

// =============================================================================
// PUBLIC API (Exported functions first)
// =============================================================================

// Scan performs a security scan on the target.
func Scan(ctx context.Context, target string) (*Result, error) {
    validated, err := validateTarget(target)
    if err != nil {
        return nil, err
    }
    return performScan(ctx, validated)
}

// NewScanner creates a configured scanner instance.
func NewScanner(opts ...Option) *Scanner {
    s := &Scanner{timeout: defaultTimeout}
    for _, opt := range opts {
        opt(s)
    }
    return s
}

// =============================================================================
// MAIN LOGIC (Core implementation)
// =============================================================================

func performScan(ctx context.Context, target string) (*Result, error) {
    conn, err := connect(ctx, target)
    if err != nil {
        return nil, err
    }
    defer conn.Close()

    return analyzeResponse(conn)
}

// =============================================================================
// HELPERS (Supporting functions at bottom)
// =============================================================================

func validateTarget(target string) (string, error) {
    // validation logic
}

func connect(ctx context.Context, target string) (net.Conn, error) {
    // connection logic
}

func analyzeResponse(conn net.Conn) (*Result, error) {
    // analysis logic
}
```

### Why This Pattern?

| Benefit             | Explanation                                |
| ------------------- | ------------------------------------------ |
| **Human readable**  | Reader sees the important stuff first      |
| **API clarity**     | Exported functions are immediately visible |
| **Navigation**      | Easy to find what you're looking for       |
| **Review friendly** | Reviewers understand purpose quickly       |

### Anti-Pattern: Random Organization

```go
// ❌ WRONG: Helpers mixed with public API
func connect() { ... }           // helper buried at top
func Scan() { ... }              // public API in middle
func validateTarget() { ... }    // helper
func NewScanner() { ... }        // public API at bottom
func analyzeResponse() { ... }   // helper
```

---

## 3. Return Early to Avoid Nesting

**Pattern:** Handle error cases and edge cases first, then proceed with the happy path. Avoid deep nesting.

### The Rule

```
1. Check preconditions first
2. Return early on errors
3. Keep the happy path at the lowest indentation level
```

### Example: Early Returns

```go
// ✅ GOOD: Early returns, flat structure
func ProcessUser(id string) (*User, error) {
    if id == "" {
        return nil, errors.New("id required")
    }

    user, err := db.FindUser(id)
    if err != nil {
        return nil, fmt.Errorf("finding user: %w", err)
    }

    if !user.Active {
        return nil, errors.New("user inactive")
    }

    if user.Locked {
        return nil, errors.New("user locked")
    }

    // Happy path - no nesting
    user.LastAccess = time.Now()
    return user, nil
}
```

### Anti-Pattern: Deep Nesting

```go
// ❌ WRONG: Nested conditionals, hard to read
func ProcessUser(id string) (*User, error) {
    if id != "" {
        user, err := db.FindUser(id)
        if err == nil {
            if user.Active {
                if !user.Locked {
                    user.LastAccess = time.Now()
                    return user, nil
                } else {
                    return nil, errors.New("user locked")
                }
            } else {
                return nil, errors.New("user inactive")
            }
        } else {
            return nil, fmt.Errorf("finding user: %w", err)
        }
    } else {
        return nil, errors.New("id required")
    }
}
```

### More Examples

**Loop with continue:**

```go
// ✅ GOOD: Continue early, keep loop body flat
for _, item := range items {
    if item == nil {
        continue
    }
    if !item.Valid {
        continue
    }

    // Process valid items - no nesting
    process(item)
}

// ❌ WRONG: Nested conditionals in loop
for _, item := range items {
    if item != nil {
        if item.Valid {
            process(item)
        }
    }
}
```

**Switch with early return:**

```go
// ✅ GOOD: Handle known cases, return early
func handleStatus(status string) error {
    switch status {
    case "success":
        return nil
    case "pending":
        return ErrPending
    case "failed":
        return ErrFailed
    }
    return fmt.Errorf("unknown status: %s", status)
}
```

### Why This Pattern?

| Benefit          | Explanation                                |
| ---------------- | ------------------------------------------ |
| **Readable**     | Happy path is visually prominent           |
| **Debuggable**   | Each exit point is clear                   |
| **Testable**     | Each condition is a separate test case     |
| **Maintainable** | Adding conditions doesn't increase nesting |

### The Nesting Limit

**Maximum 2 levels of nesting.** If you have more, refactor:

```go
// ❌ TOO DEEP: 3+ levels
if a {
    if b {
        if c {  // Too deep!
            doSomething()
        }
    }
}

// ✅ REFACTORED: Extract or return early
if !a || !b || !c {
    return
}
doSomething()
```

---

## 4. Constructors: Return Interfaces When Polymorphism Intended

**Pattern:** When a type implements an interface that consumers should use, return the interface from the constructor.

### Example: Return Interface

```go
// ✅ GOOD: Returns interface - consumer doesn't need to know concrete type
func NewJSONWriter(w io.Writer) OutputWriter {
    return &jsonWriter{writer: w}
}

func NewTableWriter(w io.Writer) OutputWriter {
    return &tableWriter{writer: w}
}

// Consumer code is clean:
var writer OutputWriter = NewJSONWriter(os.Stdout)
writer.Write(results)
```

### Anti-Pattern: Return Concrete Type

```go
// ❌ WRONG: Returns concrete type - consumer sees implementation details
func NewJSONWriter(w io.Writer) *JSONWriter {
    return &JSONWriter{writer: w}
}

// Consumer must know about JSONWriter type:
var writer *JSONWriter = NewJSONWriter(os.Stdout)
```

### Why This Matters

| Benefit                 | Explanation                                         |
| ----------------------- | --------------------------------------------------- |
| **Readability**         | Consumer works with interface, not implementation   |
| **Testability**         | Easy to mock - just implement the interface         |
| **Flexibility**         | Swap implementations without changing consumer code |
| **Compile-time checks** | Interface compliance verified automatically         |
| **No var \_ hacks**     | Don't need `var _ Interface = (*Type)(nil)`         |

### When to Return Concrete Type

Return concrete type ONLY when:

- The type has no interface (it's standalone)
- Consumer needs access to type-specific methods not on interface
- You're building an internal utility not meant for polymorphism

---

## 5. Cobra Commands: Extract Run Logic

**Pattern:** Don't inline logic in Run functions. Extract to named functions.

### Why Extract?

- Command definitions stay clean and scannable
- Logic functions are independently testable
- Easier to understand what each command does at a glance

### Example: Extracted Run Functions

```go
// ✅ GOOD: Clean command definition, logic extracted
var probeCmd = &cobra.Command{
    Use:   "probe",
    Short: "Probe a target for LLM services",
    Long:  `Detailed description...`,
    Args:  cobra.ExactArgs(1),
    RunE:  runProbe,  // Named function
}

var listCmd = &cobra.Command{
    Use:   "list",
    Short: "List available probes",
    RunE:  runList,  // Named function
}

// Logic in separate, testable functions
func runProbe(cmd *cobra.Command, args []string) error {
    target := args[0]
    // ... probe logic
    return nil
}

func runList(cmd *cobra.Command, args []string) error {
    // ... list logic
    return nil
}
```

### Anti-Pattern: Inline Logic

```go
// ❌ WRONG: Logic inline makes command hard to read
var probeCmd = &cobra.Command{
    Use:   "probe",
    Short: "Probe a target",
    Run: func(cmd *cobra.Command, args []string) {
        // 50+ lines of logic here
        // Hard to test
        // Hard to scan command definitions
        target := args[0]
        scanner := scanner.NewScanner(timeout)
        probes, err := probe.LoadProbesFromFS()
        if err != nil {
            fmt.Fprintf(os.Stderr, "Error: %v\n", err)
            return
        }
        // ... more logic
    },
}
```

### Naming Convention

| Command       | Run Function  |
| ------------- | ------------- |
| `probeCmd`    | `runProbe`    |
| `listCmd`     | `runList`     |
| `validateCmd` | `runValidate` |
| `versionCmd`  | `runVersion`  |

### Use RunE for Error Handling

Prefer `RunE` (returns error) over `Run` (void):

```go
// ✅ GOOD: RunE returns error
RunE: runProbe,

func runProbe(cmd *cobra.Command, args []string) error {
    if err := doSomething(); err != nil {
        return fmt.Errorf("probe failed: %w", err)
    }
    return nil
}

// ❌ WRONG: Run handles errors with os.Exit
Run: func(cmd *cobra.Command, args []string) {
    if err := doSomething(); err != nil {
        fmt.Fprintf(os.Stderr, "Error: %v\n", err)
        os.Exit(1)  // Hard to test
    }
}
```

---

## Quick Reference

| Pattern            | Rule                                                    |
| ------------------ | ------------------------------------------------------- |
| **CLI Structure**  | Thin main.go → `runner.Run()`, logic in `pkg/runner/`   |
| **Constructors**   | Return interface when polymorphism intended             |
| **Cobra Commands** | Extract Run logic to named functions                    |
| **Function Order** | Exported → Main logic → Helpers                         |
| **Nesting**        | Return early, max 2 levels, happy path at lowest indent |

---

## Checklist

Before submitting Go code, verify:

- [ ] `main.go` only calls `runner.Run()` (for CLIs)
- [ ] CLI logic is in `pkg/runner/`, not `cmd/`
- [ ] Constructors return interface when polymorphism intended (not concrete type)
- [ ] Cobra Run logic extracted to named functions (`runProbe`, `runList`, etc.)
- [ ] Using `RunE` (returns error) not `Run` (void)
- [ ] Exported functions are at top of file
- [ ] Helper functions are at bottom of file
- [ ] No deeply nested conditionals (max 2 levels)
- [ ] Error cases return early
- [ ] Happy path has minimal indentation
- [ ] No useless comments (only comment non-obvious behavior)

---

## Related Skills

- `structuring-go-projects` - Directory layout (cmd/, pkg/, internal/)
- `adhering-to-yagni` - Go-specific anti-patterns to avoid
- `implementing-golang-tests` - Go testing with testify
- `go-errgroup-concurrency` - Concurrent Go patterns
