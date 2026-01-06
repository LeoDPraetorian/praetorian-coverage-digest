# Cobra Complete Patterns

Comprehensive patterns for Cobra CLI framework - the enterprise standard for complex Go CLIs.

## Why Cobra

| Feature                | Benefit                          |
| ---------------------- | -------------------------------- |
| **42.8k stars**        | Industry standard, battle-tested |
| **kubectl/docker/gh**  | Used by major projects           |
| **Shell completion**   | Bash, Zsh, Fish, PowerShell      |
| **Auto documentation** | Markdown, man pages              |
| **Viper integration**  | Seamless config management       |

## Basic Structure

```go
// cmd/root.go
package cmd

import (
    "fmt"
    "os"

    "github.com/spf13/cobra"
    "github.com/spf13/viper"
)

var cfgFile string

var rootCmd = &cobra.Command{
    Use:   "myapp",
    Short: "A brief description of your application",
    Long: `A longer description that spans multiple lines
and likely contains examples and usage of using your application.`,
    PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
        return initConfig()
    },
}

func Execute() {
    if err := rootCmd.Execute(); err != nil {
        fmt.Fprintln(os.Stderr, err)
        os.Exit(1)
    }
}

func init() {
    rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default $HOME/.myapp.yaml)")
    rootCmd.PersistentFlags().BoolP("verbose", "v", false, "verbose output")
    viper.BindPFlag("verbose", rootCmd.PersistentFlags().Lookup("verbose"))
}

func initConfig() error {
    if cfgFile != "" {
        viper.SetConfigFile(cfgFile)
    } else {
        home, err := os.UserHomeDir()
        if err != nil {
            return err
        }
        viper.AddConfigPath(home)
        viper.SetConfigType("yaml")
        viper.SetConfigName(".myapp")
    }

    viper.SetEnvPrefix("MYAPP")
    viper.AutomaticEnv()

    if err := viper.ReadInConfig(); err == nil {
        fmt.Fprintln(os.Stderr, "Using config file:", viper.ConfigFileUsed())
    }
    return nil
}
```

```go
// cmd/scan.go
package cmd

import (
    "fmt"

    "github.com/spf13/cobra"
    "github.com/spf13/viper"
)

var scanCmd = &cobra.Command{
    Use:   "scan [target]",
    Short: "Run security scan",
    Long:  `Scan a target for security vulnerabilities.`,
    Args:  cobra.ExactArgs(1),
    RunE: func(cmd *cobra.Command, args []string) error {
        target := args[0]
        output := viper.GetString("output")
        depth := viper.GetInt("depth")

        return runScan(target, output, depth)
    },
}

func init() {
    rootCmd.AddCommand(scanCmd)

    scanCmd.Flags().StringP("output", "o", "table", "Output format (json|yaml|table)")
    scanCmd.Flags().IntP("depth", "d", 3, "Scan depth")

    viper.BindPFlag("output", scanCmd.Flags().Lookup("output"))
    viper.BindPFlag("depth", scanCmd.Flags().Lookup("depth"))
}

func runScan(target, output string, depth int) error {
    fmt.Printf("Scanning %s with depth %d, output: %s\n", target, depth, output)
    return nil
}
```

## Flag Types

### Persistent vs Local Flags

```go
// Persistent flags: Available to this command AND all subcommands
rootCmd.PersistentFlags().BoolP("verbose", "v", false, "verbose output")

// Local flags: Only available to this specific command
scanCmd.Flags().StringP("output", "o", "table", "output format")
```

### Flag Types

```go
// String flags
cmd.Flags().StringP("output", "o", "default", "description")
cmd.Flags().StringVarP(&outputVar, "output", "o", "default", "description")

// Integer flags
cmd.Flags().IntP("count", "c", 10, "description")
cmd.Flags().IntVarP(&countVar, "count", "c", 10, "description")

// Boolean flags
cmd.Flags().BoolP("verbose", "v", false, "description")
cmd.Flags().BoolVarP(&verboseVar, "verbose", "v", false, "description")

// String slice flags
cmd.Flags().StringSliceP("tags", "t", []string{}, "description")

// String-to-string map flags
cmd.Flags().StringToStringP("headers", "H", map[string]string{}, "description")

// Duration flags
cmd.Flags().DurationP("timeout", "", 30*time.Second, "description")
```

### Required Flags

```go
cmd.Flags().StringP("target", "t", "", "Target URL (required)")
cmd.MarkFlagRequired("target")
```

### Flag Groups

```go
// Mutually exclusive flags
cmd.MarkFlagsMutuallyExclusive("json", "yaml", "table")

// Flags that must be used together
cmd.MarkFlagsRequiredTogether("username", "password")

// At least one of these flags required
cmd.MarkFlagsOneRequired("file", "url")
```

## Argument Validation

```go
// Exact number of args
Args: cobra.ExactArgs(1)

// Range of args
Args: cobra.RangeArgs(1, 3)

// Minimum args
Args: cobra.MinimumNArgs(1)

// Maximum args
Args: cobra.MaximumNArgs(5)

// No args
Args: cobra.NoArgs

// Custom validation
Args: func(cmd *cobra.Command, args []string) error {
    if len(args) < 1 {
        return fmt.Errorf("requires at least one argument")
    }
    if !isValidTarget(args[0]) {
        return fmt.Errorf("invalid target: %s", args[0])
    }
    return nil
}
```

## Command Lifecycle Hooks

```go
var scanCmd = &cobra.Command{
    Use:   "scan [target]",

    // Before running this command or any subcommand
    PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
        return initializeLogging()
    },

    // Before running only this command
    PreRunE: func(cmd *cobra.Command, args []string) error {
        return validateTarget(args[0])
    },

    // Main command logic
    RunE: func(cmd *cobra.Command, args []string) error {
        return runScan(args[0])
    },

    // After running only this command
    PostRunE: func(cmd *cobra.Command, args []string) error {
        return cleanup()
    },

    // After running this command or any subcommand
    PersistentPostRunE: func(cmd *cobra.Command, args []string) error {
        return finalizeLogging()
    },
}
```

## Viper Integration

### Binding Flags to Viper

```go
func init() {
    rootCmd.AddCommand(scanCmd)

    scanCmd.Flags().StringP("output", "o", "table", "Output format")

    // Bind flag to viper key
    viper.BindPFlag("scan.output", scanCmd.Flags().Lookup("output"))

    // Set default in viper
    viper.SetDefault("scan.output", "table")
}

func runScan(cmd *cobra.Command, args []string) error {
    // Read from viper (includes flag, env, and config file)
    output := viper.GetString("scan.output")
    // ...
}
```

### Environment Variable Binding

```go
func initConfig() {
    viper.SetEnvPrefix("MYAPP")
    viper.AutomaticEnv()

    // MYAPP_SCAN_OUTPUT becomes scan.output
    viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
}
```

## Shell Completion

### Built-in Completion

```go
func init() {
    rootCmd.AddCommand(completionCmd)
}

var completionCmd = &cobra.Command{
    Use:   "completion [bash|zsh|fish|powershell]",
    Short: "Generate completion script",
    Long: `To load completions:

Bash:
  $ source <(myapp completion bash)

Zsh:
  $ source <(myapp completion zsh)

Fish:
  $ myapp completion fish | source
`,
    DisableFlagsInUseLine: true,
    ValidArgs:             []string{"bash", "zsh", "fish", "powershell"},
    Args:                  cobra.MatchAll(cobra.ExactArgs(1), cobra.OnlyValidArgs),
    Run: func(cmd *cobra.Command, args []string) {
        switch args[0] {
        case "bash":
            cmd.Root().GenBashCompletion(os.Stdout)
        case "zsh":
            cmd.Root().GenZshCompletion(os.Stdout)
        case "fish":
            cmd.Root().GenFishCompletion(os.Stdout, true)
        case "powershell":
            cmd.Root().GenPowerShellCompletionWithDesc(os.Stdout)
        }
    },
}
```

### Custom Completions

```go
var scanCmd = &cobra.Command{
    Use: "scan [target]",
    ValidArgsFunction: func(cmd *cobra.Command, args []string, toComplete string) ([]string, cobra.ShellCompDirective) {
        if len(args) != 0 {
            return nil, cobra.ShellCompDirectiveNoFileComp
        }
        return []string{"https://", "http://", "tcp://"}, cobra.ShellCompDirectiveNoSpace
    },
}

func init() {
    scanCmd.Flags().StringP("output", "o", "table", "Output format")

    // Register completion for flag values
    scanCmd.RegisterFlagCompletionFunc("output", func(cmd *cobra.Command, args []string, toComplete string) ([]string, cobra.ShellCompDirective) {
        return []string{"json", "yaml", "table"}, cobra.ShellCompDirectiveDefault
    })
}
```

## Documentation Generation

```go
import "github.com/spf13/cobra/doc"

// Generate Markdown docs
func genMarkdownDocs() error {
    return doc.GenMarkdownTree(rootCmd, "./docs")
}

// Generate man pages
func genManPages() error {
    header := &doc.GenManHeader{
        Title:   "MYAPP",
        Section: "1",
    }
    return doc.GenManTree(rootCmd, header, "./man")
}

// Generate YAML docs (for website)
func genYAMLDocs() error {
    return doc.GenYamlTree(rootCmd, "./docs/yaml")
}
```

## Testing Patterns

```go
func TestScanCmd(t *testing.T) {
    // Reset command state
    rootCmd.SetArgs([]string{"scan", "https://example.com", "-o", "json"})

    // Capture output
    buf := new(bytes.Buffer)
    rootCmd.SetOut(buf)
    rootCmd.SetErr(buf)

    // Execute
    err := rootCmd.Execute()
    assert.NoError(t, err)

    // Check output
    output := buf.String()
    assert.Contains(t, output, "expected content")
}

func TestScanCmdValidation(t *testing.T) {
    tests := []struct {
        name    string
        args    []string
        wantErr bool
    }{
        {"valid target", []string{"scan", "https://example.com"}, false},
        {"missing target", []string{"scan"}, true},
        {"invalid output", []string{"scan", "https://example.com", "-o", "invalid"}, true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            rootCmd.SetArgs(tt.args)
            err := rootCmd.Execute()
            if tt.wantErr {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
            }
        })
    }
}
```

## Common Pitfalls

| Pitfall                       | Problem                | Solution                  |
| ----------------------------- | ---------------------- | ------------------------- |
| Using `Run` instead of `RunE` | Can't return errors    | Always use `RunE`         |
| Flag values in `init()`       | Flags not parsed yet   | Read flags in `RunE`      |
| Not binding to Viper          | Miss env var overrides | Use `viper.BindPFlag`     |
| Forgetting `MarkFlagRequired` | Silent failures        | Mark required flags       |
| Global state in tests         | Tests interfere        | Reset state between tests |

## Sources

- [Cobra GitHub](https://github.com/spf13/cobra)
- [Cobra User Guide](https://github.com/spf13/cobra/blob/main/site/content/user_guide.md)
- [Viper GitHub](https://github.com/spf13/viper)
- Research: `.claude/.output/research/2026-01-05-213532-go-cli-best-practices/`
