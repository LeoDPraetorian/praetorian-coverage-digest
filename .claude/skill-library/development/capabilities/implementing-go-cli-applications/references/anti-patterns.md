# CLI Anti-Pattern Catalog

Complete guide to common CLI mistakes and how to fix them.

## Anti-Patterns with Fixes

### 1. Generic Error Messages

**❌ Anti-Pattern**:

```go
return fmt.Errorf("error occurred")
return fmt.Errorf("operation failed")
return fmt.Errorf("invalid input")
```

**Why Bad**: Not actionable, user doesn't know what to fix.

**✅ Fix**:

```go
return fmt.Errorf(`Failed to scan target '%s'
│
├─ Connection timeout after 30s
│
└─ Fix by:
   1. Check target is reachable: ping %s
   2. Increase timeout: --timeout=60s
   3. Check firewall rules`, target, target)
```

### 2. Silent Long Operations

**❌ Anti-Pattern**:

```go
func scanTargets(targets []string) error {
    for _, target := range targets {
        scan(target)  // No feedback for 30+ seconds
    }
    return nil
}
```

**Why Bad**: User thinks CLI has hung.

**✅ Fix**:

```go
import "github.com/vbauerster/mpb/v7"

func scanTargets(targets []string) error {
    p := mpb.New()
    bar := p.AddBar(int64(len(targets)),
        mpb.PrependDecorators(decor.Name("Scanning: "), decor.CountersNoUnit("%d / %d")),
    )
    for _, target := range targets {
        scan(target)
        bar.Increment()
    }
    p.Wait()
    return nil
}
```

### 3. Inconsistent Flag Naming

**❌ Anti-Pattern**:

```go
// Mixing styles
--output_format      // Snake_case
--maxConnections     // camelCase
--DryRun             // PascalCase
--output-dir         // Kebab-case
```

**Why Bad**: POSIX violation, user confusion.

**✅ Fix**:

```go
// Always use kebab-case for long flags
--output-format
--max-connections
--dry-run
--output-dir
```

### 4. Colors in Piped Output

**❌ Anti-Pattern**:

```go
func printResult(result string) {
    // Always uses colors
    fmt.Println(color.GreenString(result))
}
```

**Why Bad**: Breaks parsing, adds ANSI codes to files.

**✅ Fix**:

```go
import (
    "github.com/fatih/color"
    "golang.org/x/term"
)

func init() {
    color.NoColor = !isTerminal(os.Stdout) || os.Getenv("NO_COLOR") != ""
}

func printResult(result string) {
    if shouldUseColor() {
        fmt.Println(color.GreenString(result))
    } else {
        fmt.Println(result)
    }
}
```

### 5. Viper in New Projects

**❌ Anti-Pattern**:

```go
// Using Viper for new project
import "github.com/spf13/viper"

viper.Get("server.port")  // Returns lowercase "server.port" even if YAML has "Server.Port"
```

**Why Bad**:

- Forces lowercase keys (breaks YAML/JSON specs)
- Large dependency tree (~12 MB binary)
- Not thread-safe
- Tight coupling

**✅ Fix**:

```go
// Use Koanf for new projects
import "github.com/knadh/koanf/v2"

k := koanf.New(".")
k.String("Server.Port")  // Preserves case
// 2.9 MB binary, modular, thread-safe with atomic.Value
```

**When to Keep Viper**: Existing Cobra apps, team expertise, comprehensive format support needed.

### 6. Too Many Required Flags

**❌ Anti-Pattern**:

```bash
myapp deploy --region us-east-1 --environment prod --replicas 3 --memory 512 --cpu 256 --timeout 30
```

**Why Bad**: Poor UX, error-prone, difficult to remember.

**✅ Fix**:

```bash
# Sensible defaults
myapp deploy

# Override specific values
myapp deploy --region eu-west-1 --replicas 5

# Or use config file
myapp deploy --config production.yaml
```

```go
type DeployConfig struct {
    Region   string `default:"us-east-1"`
    Env      string `default:"dev"`
    Replicas int    `default:"3"`
    Memory   int    `default:"512"`
    CPU      int    `default:"256"`
    Timeout  int    `default:"30"`
}
```

### 7. Runtime Validation

**❌ Anti-Pattern**:

```go
func scan(target string) error {
    // Validation happens during execution
    if target == "" {
        return fmt.Errorf("target is required")
    }
    if !isValidURL(target) {
        return fmt.Errorf("invalid URL")
    }
    // ... actual scan logic
}
```

**Why Bad**: Failures happen late, wasted setup time.

**✅ Fix**:

```go
// Validate at parse time
var scanCmd = &cobra.Command{
    Use:  "scan [target]",
    Args: cobra.ExactArgs(1),
    PreRunE: func(cmd *cobra.Command, args []string) error {
        target := args[0]
        if !isValidURL(target) {
            return fmt.Errorf("invalid URL: %s", target)
        }
        return nil
    },
    RunE: func(cmd *cobra.Command, args []string) error {
        // Target guaranteed valid
        return scan(args[0])
    },
}

// With Kong (automatic)
type ScanCmd struct {
    Target URL `arg:"" help:"Target URL."` // Custom type with Validate()
}

type URL string

func (u *URL) Validate() error {
    _, err := url.Parse(string(*u))
    return err
}
```

### 8. Using `Run` Instead of `RunE`

**❌ Anti-Pattern**:

```go
var scanCmd = &cobra.Command{
    Run: func(cmd *cobra.Command, args []string) {
        if err := scan(args[0]); err != nil {
            log.Fatal(err)  // Can't return error
        }
    },
}
```

**Why Bad**: Can't return errors, forces panic/Fatal.

**✅ Fix**:

```go
var scanCmd = &cobra.Command{
    RunE: func(cmd *cobra.Command, args []string) error {
        return scan(args[0])  // Return error naturally
    },
}
```

### 9. Global State in Tests

**❌ Anti-Pattern**:

```go
var config *Config  // Global

func TestScanCommand(t *testing.T) {
    config = &Config{/* test values */}
    rootCmd.SetArgs([]string{"scan", "target"})
    rootCmd.Execute()  // Modifies global state
}
```

**Why Bad**: Tests interfere with each other.

**✅ Fix**:

```go
func TestScanCommand(t *testing.T) {
    // Create fresh command for each test
    cmd := newScanCommand()
    cmd.SetArgs([]string{"target"})

    var buf bytes.Buffer
    cmd.SetOut(&buf)

    err := cmd.Execute()
    assert.NoError(t, err)
}
```

### 10. Ignoring Exit Codes

**❌ Anti-Pattern**:

```go
func main() {
    if err := run(); err != nil {
        fmt.Println(err)
        os.Exit(1)  // Always exits with 1
    }
}
```

**Why Bad**: Can't distinguish error types in scripts.

**✅ Fix**:

```go
const (
    ExitSuccess      = 0
    ExitUsageError   = 2
    ExitConfigError  = 3
    ExitNetworkError = 4
    ExitAuthError    = 5
)

func main() {
    if err := run(); err != nil {
        fmt.Fprintln(os.Stderr, err)
        os.Exit(getExitCode(err))
    }
}

func getExitCode(err error) int {
    switch {
    case errors.Is(err, ErrInvalidArgs):
        return ExitUsageError
    case errors.Is(err, ErrConfig):
        return ExitConfigError
    case errors.Is(err, ErrNetwork):
        return ExitNetworkError
    case errors.Is(err, ErrAuth):
        return ExitAuthError
    default:
        return 1
    }
}
```

### 11. Hardcoded Paths

**❌ Anti-Pattern**:

```go
configPath := "/Users/john/.myapp/config.yaml"  // Hardcoded
```

**Why Bad**: Breaks for other users, not portable.

**✅ Fix**:

```go
home, err := os.UserHomeDir()
if err != nil {
    return err
}
configPath := filepath.Join(home, ".myapp", "config.yaml")

// Or use environment variable
configPath := os.Getenv("MYAPP_CONFIG")
if configPath == "" {
    configPath = filepath.Join(home, ".myapp", "config.yaml")
}
```

### 12. Not Handling Signals

**❌ Anti-Pattern**:

```go
func main() {
    scan()  // Can't be interrupted cleanly
}
```

**Why Bad**: CTRL+C leaves resources uncleaned.

**✅ Fix**:

```go
import (
    "context"
    "os/signal"
    "syscall"
)

func main() {
    ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
    defer stop()

    if err := scan(ctx); err != nil {
        if err == context.Canceled {
            fmt.Fprintln(os.Stderr, "Scan interrupted")
            os.Exit(130)  // 128 + SIGINT(2)
        }
        fmt.Fprintln(os.Stderr, err)
        os.Exit(1)
    }
}

func scan(ctx context.Context) error {
    for _, target := range targets {
        select {
        case <-ctx.Done():
            return ctx.Err()
        default:
            if err := scanOne(target); err != nil {
                return err
            }
        }
    }
    return nil
}
```

### 13. Cryptic Flag Names

**❌ Anti-Pattern**:

```go
--op    // What operation?
--cfg   // Config what?
--mx    // Maximum what?
--q     // Query? Quiet? Queue?
```

**Why Bad**: Not discoverable, requires memorization.

**✅ Fix**:

```go
--operation        -o
--config-file      -c
--max-connections  -m
--quiet            -q  (if standard)
```

### 14. Missing --dry-run

**❌ Anti-Pattern**:

```go
// Destructive command with no preview
var deleteCmd = &cobra.Command{
    RunE: func(cmd *cobra.Command, args []string) error {
        return deleteResources(args)  // Immediately deletes
    },
}
```

**Why Bad**: Accidental data loss.

**✅ Fix**:

```go
var (
    dryRun bool
    force  bool
)

func init() {
    deleteCmd.Flags().BoolVar(&dryRun, "dry-run", false, "Preview without deleting")
    deleteCmd.Flags().BoolVarP(&force, "force", "f", false, "Skip confirmation")
}

var deleteCmd = &cobra.Command{
    RunE: func(cmd *cobra.Command, args []string) error {
        if dryRun {
            fmt.Println("Would delete:", args)
            return nil
        }

        if !force {
            fmt.Printf("Delete %d resources? [y/N]: ", len(args))
            var response string
            fmt.Scanln(&response)
            if response != "y" && response != "Y" {
                return fmt.Errorf("cancelled")
            }
        }

        return deleteResources(args)
    },
}
```

### 15. Breaking Backwards Compatibility

**❌ Anti-Pattern**:

```go
// v1.0
--output-format json

// v2.0 (BREAKING)
--format json  // Renamed flag
```

**Why Bad**: Breaks scripts, automation.

**✅ Fix**:

```go
// Maintain old flag, add alias
func init() {
    scanCmd.Flags().StringP("format", "f", "json", "Output format")
    scanCmd.Flags().String("output-format", "json", "Output format (deprecated: use --format)")
    scanCmd.Flags().MarkDeprecated("output-format", "use --format instead")
}
```

## Quick Checklist

Before releasing a CLI, verify:

- [ ] All errors have three parts (Context, Error, Mitigation)
- [ ] Operations >2s show progress (spinner/bar)
- [ ] Flags use kebab-case (`--long-flag`)
- [ ] Colors only when TTY (respect `NO_COLOR`)
- [ ] Config precedence: Flags > Env > File > Defaults
- [ ] Validation at parse time (not runtime)
- [ ] Using `RunE` (not `Run`)
- [ ] Exit codes meaningful (not always 1)
- [ ] Signal handling (SIGINT/SIGTERM)
- [ ] Shell completion available
- [ ] Destructive commands have `--dry-run`
- [ ] Help text has examples
- [ ] Backwards compatibility maintained

## Sources

- [clig.dev](https://clig.dev/)
- [Command Line Interface Guidelines](https://eng.localytics.com/exploring-cli-best-practices/)
- Research: `.claude/.output/research/2026-01-05-213532-go-cli-best-practices/`
