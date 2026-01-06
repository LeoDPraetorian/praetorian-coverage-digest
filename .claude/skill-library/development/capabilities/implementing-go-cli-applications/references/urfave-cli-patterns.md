# urfave/cli Complete Patterns

Comprehensive patterns for urfave/cli - zero-dependency CLI framework.

## Why urfave/cli

| Feature                  | Benefit           |
| ------------------------ | ----------------- |
| **Zero dependencies**    | stdlib only       |
| **23.8k stars**          | Well-maintained   |
| **Action callbacks**     | Clean separation  |
| **No code generation**   | Simple setup      |
| **Docker Compose/Gitea** | Production-proven |

## Basic Structure

```go
package main

import (
    "fmt"
    "log"
    "os"

    "github.com/urfave/cli/v2"
)

func main() {
    app := &cli.App{
        Name:    "myapp",
        Usage:   "A CLI application",
        Version: "1.0.0",
        Authors: []*cli.Author{
            {Name: "Your Name", Email: "you@example.com"},
        },
        Flags: []cli.Flag{
            &cli.BoolFlag{
                Name:    "verbose",
                Aliases: []string{"v"},
                Usage:   "Enable verbose output",
                EnvVars: []string{"MYAPP_VERBOSE"},
            },
        },
        Commands: []*cli.Command{
            scanCommand(),
            configCommand(),
        },
        Before: func(c *cli.Context) error {
            if c.Bool("verbose") {
                log.SetFlags(log.LstdFlags | log.Lshortfile)
            }
            return nil
        },
    }

    if err := app.Run(os.Args); err != nil {
        log.Fatal(err)
    }
}

func scanCommand() *cli.Command {
    return &cli.Command{
        Name:      "scan",
        Usage:     "Run security scan",
        ArgsUsage: "[target]",
        Flags: []cli.Flag{
            &cli.StringFlag{
                Name:    "output",
                Aliases: []string{"o"},
                Value:   "table",
                Usage:   "Output format (json|yaml|table)",
            },
            &cli.IntFlag{
                Name:    "depth",
                Aliases: []string{"d"},
                Value:   3,
                Usage:   "Scan depth",
            },
        },
        Action: func(c *cli.Context) error {
            target := c.Args().First()
            if target == "" {
                return fmt.Errorf("target is required")
            }
            output := c.String("output")
            depth := c.Int("depth")

            return runScan(target, output, depth)
        },
    }
}

func configCommand() *cli.Command {
    return &cli.Command{
        Name:  "config",
        Usage: "Manage configuration",
        Subcommands: []*cli.Command{
            {
                Name:  "init",
                Usage: "Initialize configuration",
                Action: func(c *cli.Context) error {
                    return initConfig()
                },
            },
            {
                Name:  "show",
                Usage: "Show current configuration",
                Flags: []cli.Flag{
                    &cli.StringFlag{
                        Name:  "format",
                        Value: "yaml",
                        Usage: "Output format (json|yaml)",
                    },
                },
                Action: func(c *cli.Context) error {
                    return showConfig(c.String("format"))
                },
            },
        },
    }
}
```

## Flag Types

```go
// String flag
&cli.StringFlag{
    Name:        "output",
    Aliases:     []string{"o"},
    Value:       "default",
    Usage:       "Output format",
    EnvVars:     []string{"MYAPP_OUTPUT"},
    Destination: &outputVar,  // Optional: bind to variable
    Required:    false,
    Hidden:      false,
}

// Integer flag
&cli.IntFlag{
    Name:  "count",
    Value: 10,
    Usage: "Number of items",
}

// Boolean flag
&cli.BoolFlag{
    Name:    "verbose",
    Aliases: []string{"v"},
    Usage:   "Verbose output",
}

// String slice flag
&cli.StringSliceFlag{
    Name:    "tags",
    Aliases: []string{"t"},
    Usage:   "Filter by tags",
}

// Duration flag
&cli.DurationFlag{
    Name:  "timeout",
    Value: 30 * time.Second,
    Usage: "Request timeout",
}

// Path flag (with completion)
&cli.PathFlag{
    Name:      "config",
    TakesFile: true,
    Usage:     "Config file path",
}

// Timestamp flag
&cli.TimestampFlag{
    Name:   "since",
    Layout: "2006-01-02",
    Usage:  "Start date",
}
```

## Command Hooks

```go
&cli.Command{
    Name: "scan",

    // Before this command runs
    Before: func(c *cli.Context) error {
        return validateArgs(c)
    },

    // Main action
    Action: func(c *cli.Context) error {
        return runScan(c)
    },

    // After this command runs (even on error)
    After: func(c *cli.Context) error {
        return cleanup()
    },

    // When an error occurs
    OnUsageError: func(c *cli.Context, err error, isSubcommand bool) error {
        return cli.ShowCommandHelp(c, c.Command.Name)
    },
}
```

## App-Level Hooks

```go
app := &cli.App{
    // Before any command runs
    Before: func(c *cli.Context) error {
        return initializeApp(c)
    },

    // After any command runs
    After: func(c *cli.Context) error {
        return finalizeApp()
    },

    // Override exit behavior
    ExitErrHandler: func(c *cli.Context, err error) {
        if err != nil {
            fmt.Fprintf(os.Stderr, "Error: %v\n", err)
            os.Exit(1)
        }
    },
}
```

## Argument Handling

```go
Action: func(c *cli.Context) error {
    // Get first argument
    target := c.Args().First()

    // Get argument by index
    second := c.Args().Get(1)

    // Get all arguments
    all := c.Args().Slice()

    // Check if argument present
    if c.Args().Present() {
        // Has at least one argument
    }

    // Number of arguments
    count := c.NArg()

    return nil
}
```

## Subcommand Patterns

```go
&cli.Command{
    Name:  "config",
    Usage: "Manage configuration",
    Subcommands: []*cli.Command{
        {
            Name:  "init",
            Usage: "Initialize configuration",
            Action: initAction,
        },
        {
            Name:    "show",
            Aliases: []string{"s"},
            Usage:   "Show configuration",
            Action:  showAction,
        },
        {
            Name:  "set",
            Usage: "Set a configuration value",
            Flags: []cli.Flag{
                &cli.StringFlag{Name: "key", Required: true},
                &cli.StringFlag{Name: "value", Required: true},
            },
            Action: setAction,
        },
    },
}
```

## Shell Completion

```go
app := &cli.App{
    EnableBashCompletion: true,
    Commands: []*cli.Command{
        {
            Name: "scan",
            // Custom completion for arguments
            BashComplete: func(c *cli.Context) {
                if c.NArg() > 0 {
                    return
                }
                // Suggest protocols
                fmt.Println("https://")
                fmt.Println("http://")
                fmt.Println("tcp://")
            },
        },
    },
}
```

## Help Customization

```go
app := &cli.App{
    Name:  "myapp",
    Usage: "A CLI application",

    // Custom help template
    CustomAppHelpTemplate: `NAME:
   {{.Name}} - {{.Usage}}

USAGE:
   {{.HelpName}} {{if .VisibleFlags}}[global options]{{end}}{{if .Commands}} command [command options]{{end}} {{if .ArgsUsage}}{{.ArgsUsage}}{{else}}[arguments...]{{end}}

VERSION:
   {{.Version}}

COMMANDS:
{{range .Commands}}   {{.Name}}{{"\t"}}{{.Usage}}
{{end}}
GLOBAL OPTIONS:
{{range .VisibleFlags}}   {{.}}
{{end}}
`,

    // Override default help command
    Action: func(c *cli.Context) error {
        if c.NArg() == 0 {
            return cli.ShowAppHelp(c)
        }
        return nil
    },
}
```

## Testing Patterns

```go
func TestScanCommand(t *testing.T) {
    app := &cli.App{
        Commands: []*cli.Command{scanCommand()},
    }

    // Test with arguments
    err := app.Run([]string{"myapp", "scan", "https://example.com", "-o", "json"})
    assert.NoError(t, err)

    // Test missing argument
    err = app.Run([]string{"myapp", "scan"})
    assert.Error(t, err)
}

func TestScanCommandOutput(t *testing.T) {
    var buf bytes.Buffer

    app := &cli.App{
        Writer: &buf,  // Capture output
        Commands: []*cli.Command{
            {
                Name: "scan",
                Action: func(c *cli.Context) error {
                    fmt.Fprintln(c.App.Writer, "scanning...")
                    return nil
                },
            },
        },
    }

    err := app.Run([]string{"myapp", "scan", "target"})
    assert.NoError(t, err)
    assert.Contains(t, buf.String(), "scanning...")
}
```

## Comparison with Cobra

| Feature            | urfave/cli   | Cobra               |
| ------------------ | ------------ | ------------------- |
| Dependencies       | 0            | pflag               |
| Code generation    | No           | Yes (cobra-cli)     |
| Config integration | Manual       | Viper built-in      |
| Shell completion   | Basic        | Comprehensive       |
| Documentation gen  | No           | Yes (markdown, man) |
| Command definition | Function     | Struct              |
| Error handling     | Return error | RunE                |

## Sources

- [urfave/cli GitHub](https://github.com/urfave/cli)
- [urfave/cli Manual](https://cli.urfave.org/v2/getting-started/)
- Research: `.claude/.output/research/2026-01-05-213532-go-cli-best-practices/`
