---
name: implementing-go-cli-applications
description: Use when developing Go command-line applications - covers CLI framework selection (Cobra/Kong/urfave-cli), configuration management (Viper/Koanf), argument parsing patterns, and UX best practices (POSIX conventions, error messages, progress feedback)
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Implementing Go CLI Applications

**Complete guide for building production-ready Go CLIs with framework selection, configuration management, and UX best practices.**

## When to Use

Use this skill when:

- Creating new Go CLI applications from scratch
- Adding command-line arguments to existing Go tools
- Implementing configuration file loading with environment variable overrides
- Improving CLI user experience (help text, error messages, progress indicators)
- Choosing between CLI frameworks (Cobra vs Kong vs urfave/cli vs stdlib)
- Migrating between CLI frameworks or configuration libraries

## Quick Reference - Framework Selection

| Requirement                       | Framework              | Config Library     | Rationale                      |
| --------------------------------- | ---------------------- | ------------------ | ------------------------------ |
| Simple CLI (<5 commands)          | stdlib `flag`          | Env vars only      | Zero dependencies              |
| Medium CLI (5-15 commands)        | **Kong** or urfave/cli | **Koanf**          | Type-safe, moderate complexity |
| Complex CLI (>15 nested commands) | Cobra                  | Viper              | Battle-tested, comprehensive   |
| Minimal binary size               | **Kong** (3384 KB)     | **Koanf** (2.9 MB) | Container-optimized            |
| Enterprise/existing Cobra         | Cobra                  | Viper              | Ecosystem compatibility        |

**For detailed selection criteria and trade-offs**, see [references/framework-selection.md](references/framework-selection.md)

## CLI Framework Patterns

### Pattern 1: Kong (Recommended for New Projects)

Struct-based declarative approach with compile-time validation:

```go
package main

import "github.com/alecthomas/kong"

var CLI struct {
    Debug   bool   `help:"Enable debug mode." short:"d"`
    Config  string `help:"Config file path." type:"path" default:"~/.app/config.yaml"`

    Scan struct {
        Target string   `arg:"" help:"Target to scan."`
        Output string   `help:"Output format." enum:"json,yaml,table" default:"table" short:"o"`
        Depth  int      `help:"Scan depth." default:"3"`
    } `cmd:"" help:"Run security scan."`

    Config struct {
        Init struct{} `cmd:"" help:"Initialize configuration."`
        Show struct{} `cmd:"" help:"Show current configuration."`
    } `cmd:"" help:"Manage configuration."`
}

func main() {
    ctx := kong.Parse(&CLI,
        kong.Name("myapp"),
        kong.Description("My CLI application"),
        kong.UsageOnError(),
    )
    err := ctx.Run()
    ctx.FatalIfErrorf(err)
}
```

**Why Kong**: 5k+ projects, minimal dependencies, 40 min to migrate 7 commands, struct-based type safety.

**For complete Kong patterns and advanced usage**, see [references/kong-patterns.md](references/kong-patterns.md)

### Pattern 2: Cobra (Enterprise Standard)

Hierarchical command structure for complex CLIs:

```go
package cmd

import (
    "github.com/spf13/cobra"
    "github.com/spf13/viper"
)

var rootCmd = &cobra.Command{
    Use:   "myapp",
    Short: "My CLI application",
}

var scanCmd = &cobra.Command{
    Use:   "scan [target]",
    Short: "Run security scan",
    Args:  cobra.ExactArgs(1),
    RunE: func(cmd *cobra.Command, args []string) error {
        target := args[0]
        output, _ := cmd.Flags().GetString("output")
        return runScan(target, output)
    },
}

func init() {
    rootCmd.AddCommand(scanCmd)
    scanCmd.Flags().StringP("output", "o", "table", "Output format (json|yaml|table)")
    viper.BindPFlag("output", scanCmd.Flags().Lookup("output"))
}
```

**Why Cobra**: 42.8k stars, used by kubectl/docker/gh, comprehensive shell completion, auto-generated docs.

**For complete Cobra patterns and integration with Viper**, see [references/cobra-patterns.md](references/cobra-patterns.md)

### Pattern 3: urfave/cli (Zero Dependencies)

Flat structure with Action callbacks:

```go
package main

import (
    "os"
    "github.com/urfave/cli/v2"
)

func main() {
    app := &cli.App{
        Name:  "myapp",
        Usage: "My CLI application",
        Commands: []*cli.Command{
            {
                Name:  "scan",
                Usage: "Run security scan",
                Flags: []cli.Flag{
                    &cli.StringFlag{Name: "output", Aliases: []string{"o"}, Value: "table"},
                },
                Action: func(c *cli.Context) error {
                    return runScan(c.Args().First(), c.String("output"))
                },
            },
        },
    }
    app.Run(os.Args)
}
```

**Why urfave/cli**: 23.8k stars, zero external dependencies, no code generation required.

**For complete urfave/cli patterns**, see [references/urfave-cli-patterns.md](references/urfave-cli-patterns.md)

## Configuration Management

### Standard Precedence (12-Factor)

```
CLI Flags > Environment Variables > Config Files > Struct Defaults
```

This precedence order enables:

- Production overrides via environment variables (Kubernetes ConfigMaps/Secrets)
- Development flexibility via config files
- Sensible defaults in code

**For complete 12-Factor implementation patterns**, see [references/configuration-precedence.md](references/configuration-precedence.md)

### Koanf Pattern (Recommended)

```go
package config

import (
    "github.com/knadh/koanf/v2"
    "github.com/knadh/koanf/parsers/yaml"
    "github.com/knadh/koanf/providers/env"
    "github.com/knadh/koanf/providers/file"
    "github.com/go-playground/validator/v10"
)

type Config struct {
    APIURL   string `koanf:"api_url" validate:"required,url"`
    APIKey   string `koanf:"api_key" validate:"required,min=32"`
    LogLevel string `koanf:"log_level" validate:"oneof=debug info warn error"`
    Timeout  int    `koanf:"timeout" validate:"gte=1,lte=300"`
}

func Load(configPath string) (*Config, error) {
    k := koanf.New(".")

    // 1. Load config file (lowest priority)
    if err := k.Load(file.Provider(configPath), yaml.Parser()); err != nil {
        // Config file optional - continue if not found
    }

    // 2. Load environment variables (higher priority)
    k.Load(env.Provider("MYAPP_", ".", func(s string) string {
        return strings.ToLower(strings.TrimPrefix(s, "MYAPP_"))
    }), nil)

    // 3. Unmarshal to struct
    var cfg Config
    if err := k.Unmarshal("", &cfg); err != nil {
        return nil, fmt.Errorf("config unmarshal: %w", err)
    }

    // 4. Validate (fail fast)
    v := validator.New()
    if err := v.Struct(&cfg); err != nil {
        return nil, fmt.Errorf("config validation: %w", err)
    }

    return &cfg, nil
}
```

**Why Koanf**: Case-sensitive keys (spec-compliant), 50% fewer dependencies than Viper, modular providers, 2.9 MB binaries vs Viper's 12 MB.

**For hot reload patterns and advanced Koanf usage**, see [references/koanf-patterns.md](references/koanf-patterns.md)

### Viper Pattern (Cobra Integration)

```go
func initConfig() {
    viper.SetConfigName("config")
    viper.AddConfigPath(".")
    viper.AddConfigPath("$HOME/.myapp")

    viper.SetEnvPrefix("MYAPP")
    viper.AutomaticEnv()

    viper.ReadInConfig() // Ignore error if not found
}
```

**Viper Caveats**: Forces lowercase keys (breaks YAML/JSON specs), not thread-safe, large dependency tree.

**For Viper-Cobra integration and migration to Koanf**, see [references/viper-patterns.md](references/viper-patterns.md)

## CLI UX Best Practices

### POSIX Flag Conventions

```
-s              Short flag (single hyphen + single char)
--long-flag     Long flag (double hyphen + dash-case)
-abc            Grouped short flags (equivalent to -a -b -c)
--              End of options (everything after is arguments)
-h/--help       Standard help flag
-v/--version    Standard version flag
```

**Always provide both short and long forms** for frequently used flags.

**For complete POSIX compliance guide**, see [references/posix-conventions.md](references/posix-conventions.md)

### Three-Part Error Messages (MANDATORY)

```go
func scanError(target string, err error) error {
    return fmt.Errorf(`Failed to scan target '%s'
│
├─ %v
│
└─ Fix by:
   1. Check target is reachable: ping %s
   2. Verify API key: export MYAPP_API_KEY=<key>
   3. Get help: myapp scan --help`, target, err, target)
}
```

**Pattern**: Context (what was attempted) → Error (what went wrong) → Mitigation (how to fix with commands)

**For complete error message patterns**, see [references/error-messages.md](references/error-messages.md)

### Progress Feedback

**Required for operations >2 seconds:**

```go
// X of Y Pattern (RECOMMENDED)
import "github.com/vbauerster/mpb/v7"

func scanWithProgress(targets []string) error {
    p := mpb.New()
    bar := p.AddBar(int64(len(targets)),
        mpb.PrependDecorators(
            decor.Name("Scanning: "),
            decor.CountersNoUnit("%d / %d"),
        ),
    )
    for _, target := range targets {
        if err := scan(target); err != nil {
            return err
        }
        bar.Increment()
    }
    p.Wait()
    return nil
}

// Spinner Pattern (for indeterminate progress)
import "github.com/charmbracelet/huh"

err := huh.NewSpinner().
    Title("Generating report...").
    Action(generateReport).
    Run()
```

**For progress bar patterns and advanced TUI components**, see [references/progress-feedback.md](references/progress-feedback.md)

### TTY Detection

```go
import "golang.org/x/term"

func isTerminal() bool {
    return term.IsTerminal(int(os.Stdout.Fd()))
}

func printResult(result Result) {
    if isTerminal() && os.Getenv("NO_COLOR") == "" {
        // Rich output: colors, tables
        printTable(result)
    } else {
        // Plain output for pipes/scripts
        fmt.Printf("%s\t%s\t%s\n", result.ID, result.Status, result.Severity)
    }
}
```

**Respect `NO_COLOR` environment variable** for accessibility and scriptability.

**For complete TTY detection and output formatting**, see [references/tty-detection.md](references/tty-detection.md)

### Shell Completion (Kong Example)

```go
var CLI struct {
    Completion struct {
        Bash struct{} `cmd:"" help:"Generate bash completion."`
        Zsh  struct{} `cmd:"" help:"Generate zsh completion."`
    } `cmd:"" help:"Generate shell completion."`
}
```

**For shell completion patterns across all frameworks**, see [references/shell-completion.md](references/shell-completion.md)

## Anti-Patterns

| Anti-Pattern                          | Why Bad                   | Fix                                |
| ------------------------------------- | ------------------------- | ---------------------------------- |
| Generic errors: `error occurred`      | Not actionable            | Three-part error with fix commands |
| Silent long operations                | User thinks CLI hung      | Progress bar or spinner            |
| Mixing flag styles: `--output_format` | POSIX violation           | Use dash-case: `--output-format`   |
| Colors in piped output                | Breaks parsing            | TTY detection                      |
| Viper in new projects                 | Case-insensitive, bloated | Use Koanf                          |
| Too many required flags               | Poor UX                   | Sensible defaults, config files    |
| Validating at runtime                 | Late failures             | Validate at startup (fail fast)    |

**For complete anti-pattern catalog with fixes**, see [references/anti-patterns.md](references/anti-patterns.md)

## File Format Selection

| Format   | Use When                            | Avoid When                        |
| -------- | ----------------------------------- | --------------------------------- |
| **YAML** | Human-edited config, nesting needed | Machine-generated, strict parsing |
| **TOML** | Rust/Go tooling, simple structure   | Deep nesting, unfamiliar teams    |
| **JSON** | API responses, machine-generated    | Human editing (no comments)       |
| **ENV**  | Secrets, 12-Factor, K8s             | Complex nested config             |

**For detailed format comparison and conversion tools**, see [references/file-formats.md](references/file-formats.md)

## Key Libraries

| Purpose       | Library                                | Stars  | Why Use It                          |
| ------------- | -------------------------------------- | ------ | ----------------------------------- |
| CLI Framework | github.com/alecthomas/kong             | 5k+    | Struct-based, minimal deps          |
| CLI Framework | github.com/spf13/cobra                 | 42.8k  | Enterprise standard, kubectl/docker |
| CLI Framework | github.com/urfave/cli/v2               | 23.8k  | Zero dependencies                   |
| Configuration | github.com/knadh/koanf/v2              | 2.6k   | Lightweight, spec-compliant         |
| Configuration | github.com/spf13/viper                 | 26.3k  | Cobra integration                   |
| Validation    | github.com/go-playground/validator/v10 | 16k+   | Struct tag validation               |
| Progress Bars | github.com/vbauerster/mpb/v7           | 2k+    | Multi-progress bars                 |
| Spinners/TUI  | github.com/charmbracelet/huh           | 5k+    | Interactive components              |
| Tables        | github.com/olekukonko/tablewriter      | 4k+    | ASCII table formatting              |
| TTY Detection | golang.org/x/term                      | stdlib | Terminal detection                  |

**For complete library comparison and integration patterns**, see [references/library-ecosystem.md](references/library-ecosystem.md)

## Real-World References

Study these production CLIs for best practices:

- **kubectl** (Kubernetes) - Complex hierarchical CLI with multi-source config, resource-oriented commands
- **docker** - Management commands with config precedence, subcommand organization
- **gh** (GitHub CLI) - Interactive prompts, verb-noun structure, actionable error messages
- **hugo** - Static site generator with fast builds, clear help text, minimal configuration
- **terraform** - Declarative config, plan/apply pattern, state management, workspaces

**For detailed architecture analysis of these tools**, see [references/real-world-examples.md](references/real-world-examples.md)

## Chariot-Specific Recommendations

Based on the Chariot Development Platform context (containerized security tools with AWS Lambda deployment):

1. **Standardize on Kong + Koanf** for new CLIs (nebula, trajan, future tools)
   - Minimize binary sizes for Lambda/Docker
   - Reduce dependency attack surface
   - Struct-based patterns for consistency

2. **Implement Configuration Precedence**:

   ```bash
   chariot-tool scan example.com \
     --config custom.yaml \       # Override config file
     --api-key=xyz                # Override all (highest priority)
   ```

3. **Adopt Three-Part Errors**:

   ```
   Failed to scan target 'example.com'
   ├─ API authentication failed: invalid API key
   └─ Fix: export CHARIOT_API_KEY=<key>
        Or run: chariot-tool config init
   ```

4. **Add Progress Feedback** for long operations:
   - Asset discovery: "Scanning 45/120 hosts"
   - Vulnerability checks: "Checking CVEs: 67%"

**For complete Chariot integration patterns**, see [references/chariot-integration.md](references/chariot-integration.md)

## Related Skills

| Skill                               | Purpose                                 |
| ----------------------------------- | --------------------------------------- |
| `implementing-graphql-clients`      | GraphQL API integration for Go CLIs     |
| `go-errgroup-concurrency`           | Concurrent operations in CLI tools      |
| `implementing-go-plugin-registries` | Plugin architecture for extensible CLIs |
| `developing-with-tdd`               | TDD methodology for CLI testing         |

## Progressive Disclosure

**Quick Start (15 min):**

- Choose framework from decision matrix
- Implement basic command structure
- Add POSIX flag conventions

**Comprehensive (60 min):**

- Full configuration precedence
- Three-part error messages
- Progress feedback patterns
- TTY detection

**Deep Dives (references/):**

- [Framework Selection Guide](references/framework-selection.md)
- [Configuration Precedence Patterns](references/configuration-precedence.md)
- [Kong Complete Patterns](references/kong-patterns.md)
- [Cobra Complete Patterns](references/cobra-patterns.md)
- [urfave/cli Complete Patterns](references/urfave-cli-patterns.md)
- [Koanf Configuration Management](references/koanf-patterns.md)
- [Viper Configuration Management](references/viper-patterns.md)
- [POSIX Conventions Guide](references/posix-conventions.md)
- [Error Message Patterns](references/error-messages.md)
- [Progress Feedback Patterns](references/progress-feedback.md)
- [TTY Detection and Output](references/tty-detection.md)
- [Shell Completion Patterns](references/shell-completion.md)
- [Anti-Pattern Catalog](references/anti-patterns.md)
- [File Format Comparison](references/file-formats.md)
- [Library Ecosystem Guide](references/library-ecosystem.md)
- [Real-World Examples Analysis](references/real-world-examples.md)
- [Chariot Integration Patterns](references/chariot-integration.md)
