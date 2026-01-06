# Kong Complete Patterns

Comprehensive patterns for Kong CLI framework - struct-based declarative CLI development.

## Why Kong

| Feature               | Benefit                                 |
| --------------------- | --------------------------------------- |
| **Struct-based**      | Compile-time validation, type safety    |
| **Minimal deps**      | ~3384 KB binary size                    |
| **No code gen**       | No `cobra-cli` equivalent needed        |
| **Rapid development** | 40 min to migrate 7 commands (reported) |
| **5k+ projects**      | Growing ecosystem in 2025-2026          |

## Basic Structure

```go
package main

import "github.com/alecthomas/kong"

var CLI struct {
    // Global flags
    Debug   bool   `help:"Enable debug mode." short:"d"`
    Verbose int    `help:"Verbosity level." short:"v" type:"counter"`
    Config  string `help:"Config file path." type:"path" default:"~/.app/config.yaml"`

    // Subcommands
    Scan   ScanCmd   `cmd:"" help:"Run security scan."`
    Config ConfigCmd `cmd:"" help:"Manage configuration."`
}

type ScanCmd struct {
    Target string   `arg:"" help:"Target to scan."`
    Output string   `help:"Output format." enum:"json,yaml,table" default:"table" short:"o"`
    Depth  int      `help:"Scan depth." default:"3"`
    Tags   []string `help:"Filter by tags." short:"t"`
}

func (s *ScanCmd) Run() error {
    // Implementation
    return nil
}

type ConfigCmd struct {
    Init ConfigInitCmd `cmd:"" help:"Initialize configuration."`
    Show ConfigShowCmd `cmd:"" help:"Show current configuration."`
}

type ConfigInitCmd struct{}

func (c *ConfigInitCmd) Run() error {
    // Implementation
    return nil
}

type ConfigShowCmd struct {
    Format string `help:"Output format." enum:"json,yaml" default:"yaml"`
}

func (c *ConfigShowCmd) Run() error {
    // Implementation
    return nil
}

func main() {
    ctx := kong.Parse(&CLI,
        kong.Name("myapp"),
        kong.Description("My CLI application"),
        kong.UsageOnError(),
        kong.ConfigureHelp(kong.HelpOptions{
            Compact: true,
        }),
    )
    err := ctx.Run()
    ctx.FatalIfErrorf(err)
}
```

## Struct Tags Reference

### Flag Types

```go
type CLI struct {
    // Boolean flag
    Debug bool `help:"Enable debug mode."`

    // String with default
    Output string `default:"json" help:"Output format."`

    // Integer with validation
    Port int `default:"8080" help:"Server port."`

    // Enum (restricted values)
    Format string `enum:"json,yaml,table" default:"table"`

    // Counter (multiple -v flags)
    Verbose int `type:"counter" short:"v"`

    // Path (file/dir completion)
    Config string `type:"path"`

    // Slice (repeatable flag)
    Tags []string `short:"t" help:"Tags to filter."`

    // Map
    Headers map[string]string `help:"HTTP headers."`

    // Required
    Target string `required:"" help:"Target URL."`

    // Hidden from help
    Internal string `hidden:""`
}
```

### Positional Arguments

```go
type ScanCmd struct {
    // Required positional argument
    Target string `arg:"" help:"Target to scan."`

    // Optional positional argument
    Output string `arg:"" optional:"" default:"output.json"`

    // Multiple positional arguments
    Files []string `arg:"" help:"Files to process."`
}
```

### Command Definition

```go
type CLI struct {
    // Basic command
    Scan ScanCmd `cmd:"" help:"Run scan."`

    // Command with aliases
    List ListCmd `cmd:"" aliases:"ls,l" help:"List items."`

    // Default command (runs without subcommand)
    Run RunCmd `cmd:"" default:"1"`

    // Hidden command
    Debug DebugCmd `cmd:"" hidden:""`
}
```

## Advanced Patterns

### Custom Validators

```go
type URL string

func (u *URL) Validate() error {
    _, err := url.Parse(string(*u))
    if err != nil {
        return fmt.Errorf("invalid URL: %w", err)
    }
    return nil
}

type CLI struct {
    Target URL `arg:"" help:"Target URL to scan."`
}
```

### Before/After Hooks

```go
type CLI struct {
    Debug bool `help:"Enable debug mode."`

    Scan ScanCmd `cmd:""`
}

// BeforeApply runs before any command
func (c *CLI) BeforeApply() error {
    if c.Debug {
        log.SetLevel(log.DebugLevel)
    }
    return nil
}

// AfterApply runs after parsing but before Run
func (c *CLI) AfterApply() error {
    // Setup code
    return nil
}
```

### Context and Dependencies

```go
type Context struct {
    Config *config.Config
    Client *http.Client
}

type ScanCmd struct {
    Target string `arg:""`
}

func (s *ScanCmd) Run(ctx *Context) error {
    // Access dependencies via context
    resp, err := ctx.Client.Get(s.Target)
    // ...
    return nil
}

func main() {
    cli := &CLI{}
    ctx := kong.Parse(cli)

    // Create context with dependencies
    appCtx := &Context{
        Config: loadConfig(),
        Client: &http.Client{Timeout: 30 * time.Second},
    }

    err := ctx.Run(appCtx)
    ctx.FatalIfErrorf(err)
}
```

### Custom Mappers

```go
// Custom type that parses "key=value" strings
type KeyValue struct {
    Key   string
    Value string
}

func (kv *KeyValue) Decode(ctx *kong.DecodeContext) error {
    var value string
    err := ctx.Scan.PopValue("key=value").String(&value)
    if err != nil {
        return err
    }
    parts := strings.SplitN(value, "=", 2)
    if len(parts) != 2 {
        return fmt.Errorf("expected key=value, got %q", value)
    }
    kv.Key = parts[0]
    kv.Value = parts[1]
    return nil
}

type CLI struct {
    Headers []KeyValue `help:"HTTP headers (key=value)."`
}
```

### Environment Variable Binding

```go
type CLI struct {
    // Bind to MYAPP_API_KEY environment variable
    APIKey string `env:"MYAPP_API_KEY" help:"API key."`

    // Multiple env vars (first found wins)
    Token string `env:"MYAPP_TOKEN,APP_TOKEN" help:"Auth token."`
}
```

### Version Information

```go
var (
    version = "dev"
    commit  = "none"
    date    = "unknown"
)

type CLI struct {
    Version VersionFlag `name:"version" help:"Print version."`
    // ...
}

type VersionFlag bool

func (v VersionFlag) BeforeApply() error {
    fmt.Printf("myapp %s (%s) built %s\n", version, commit, date)
    os.Exit(0)
    return nil
}
```

## Shell Completion

```go
type CLI struct {
    Completion CompletionCmd `cmd:"" help:"Generate shell completion."`
    // ...
}

type CompletionCmd struct {
    Shell string `arg:"" enum:"bash,zsh,fish" help:"Shell type."`
}

func (c *CompletionCmd) Run(ctx *kong.Context) error {
    switch c.Shell {
    case "bash":
        // Generate bash completion
    case "zsh":
        // Generate zsh completion
    case "fish":
        // Generate fish completion
    }
    return nil
}
```

## Testing Patterns

```go
func TestScanCmd(t *testing.T) {
    var cli CLI
    parser, err := kong.New(&cli)
    require.NoError(t, err)

    // Parse command line
    ctx, err := parser.Parse([]string{"scan", "https://example.com", "-o", "json"})
    require.NoError(t, err)

    // Verify parsed values
    assert.Equal(t, "https://example.com", cli.Scan.Target)
    assert.Equal(t, "json", cli.Scan.Output)

    // Run command
    err = ctx.Run()
    require.NoError(t, err)
}
```

## Migration from Cobra

| Cobra                                            | Kong                    |
| ------------------------------------------------ | ----------------------- |
| `rootCmd.AddCommand(scanCmd)`                    | Embedded struct field   |
| `scanCmd.Flags().StringP("output", "o", "", "")` | Struct tag `short:"o"`  |
| `viper.BindPFlag("output", ...)`                 | `env:"MYAPP_OUTPUT"`    |
| `init()` function setup                          | Declarative struct tags |
| `RunE: func(cmd *cobra.Command, args []string)`  | `Run() error` method    |

## Sources

- [Kong GitHub](https://github.com/alecthomas/kong)
- [Kong Examples](https://github.com/alecthomas/kong/tree/master/_examples)
- Research: `.claude/.output/research/2026-01-05-213532-go-cli-best-practices/`
