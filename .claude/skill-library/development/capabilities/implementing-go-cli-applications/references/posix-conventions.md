# POSIX Flag Conventions Guide

Complete reference for POSIX-compliant CLI argument handling.

## POSIX Standard Summary

From IEEE Std 1003.1-2017 (POSIX.1):

```
utility_name [-a] [-b] [-c option_argument]
             [-d | -e] [-f [option_argument]] [operand...]
```

## Flag Syntax

### Short Flags (Single Character)

```bash
# Single hyphen + single alphanumeric character
-v              # Boolean flag
-o value        # Flag with space-separated value
-ovalue         # Flag with attached value (no space)

# Grouped short flags (booleans only)
-abc            # Equivalent to -a -b -c
-vvv            # Counter pattern (3x verbose)
```

### Long Flags (GNU Extension)

```bash
# Double hyphen + multiple characters
--verbose           # Boolean flag
--output value      # Space-separated value
--output=value      # Equals-separated value (preferred)
--output-format     # Kebab-case (not snake_case or camelCase)
```

### Special Conventions

```bash
--              # End of options, everything after is arguments
-               # Stdin/stdout placeholder
--help          # Standard help flag
--version       # Standard version flag
```

## Flag Naming Best Practices

### Use Standard Names When Available

| Purpose        | Short        | Long          |
| -------------- | ------------ | ------------- |
| Help           | `-h`         | `--help`      |
| Version        | `-V` or `-v` | `--version`   |
| Verbose        | `-v`         | `--verbose`   |
| Quiet/Silent   | `-q`         | `--quiet`     |
| Force          | `-f`         | `--force`     |
| Recursive      | `-r` or `-R` | `--recursive` |
| Output file    | `-o`         | `--output`    |
| Input file     | `-i`         | `--input`     |
| Config file    | `-c`         | `--config`    |
| Debug          | `-d`         | `--debug`     |
| Dry run        | `-n`         | `--dry-run`   |
| Yes/assume yes | `-y`         | `--yes`       |

### Naming Rules

```
✅ DO:
--output-format      Kebab-case
--max-connections    Multiple words separated by hyphens
-o                   Single letter for frequent flags

❌ DON'T:
--output_format      Snake_case
--outputFormat       camelCase
--outputformat       No separation
-output              Single hyphen with multiple chars
```

## Go Implementation

### With pflag (Cobra's Default)

```go
import "github.com/spf13/pflag"

// Short and long flags
pflag.StringP("output", "o", "table", "Output format")
pflag.BoolP("verbose", "v", false, "Enable verbose output")
pflag.IntP("count", "c", 10, "Number of items")

// Long only (no short form)
pflag.String("config-file", "", "Path to config file")
pflag.Bool("dry-run", false, "Preview changes without applying")

// Parse and access
pflag.Parse()
output := pflag.GetString("output")
verbose := pflag.GetBool("verbose")
```

### With Kong

```go
var CLI struct {
    Output  string `short:"o" default:"table" help:"Output format."`
    Verbose bool   `short:"v" help:"Enable verbose output."`
    Count   int    `short:"c" default:"10" help:"Number of items."`

    // Long only
    ConfigFile string `name:"config-file" help:"Path to config file."`
    DryRun     bool   `name:"dry-run" help:"Preview changes."`
}
```

### With stdlib flag

```go
import "flag"

// Note: stdlib flag uses single hyphen for all flags
// -output (not --output)
output := flag.String("output", "table", "Output format")
verbose := flag.Bool("verbose", false, "Enable verbose output")
flag.Parse()
```

## Option Terminator (`--`)

Everything after `--` is treated as an argument, not a flag:

```bash
# Without terminator
myapp delete -f file.txt      # -f is a flag

# With terminator
myapp delete -- -f file.txt   # -f is a filename argument
```

### Go Implementation

```go
// With Cobra - handled automatically
var deleteCmd = &cobra.Command{
    Use:  "delete [flags] -- [files...]",
    Args: cobra.MinimumNArgs(1),
    Run: func(cmd *cobra.Command, args []string) {
        // args contains everything after --
        for _, file := range args {
            deleteFile(file) // Safe even if file is "-f"
        }
    },
}

// Manual handling
func parseArgs(args []string) (flags, operands []string) {
    terminated := false
    for _, arg := range args {
        if arg == "--" {
            terminated = true
            continue
        }
        if terminated || !strings.HasPrefix(arg, "-") {
            operands = append(operands, arg)
        } else {
            flags = append(flags, arg)
        }
    }
    return
}
```

## Boolean Flags

### Implicit True

```bash
--verbose         # Sets verbose=true
--no-verbose      # Sets verbose=false (negation pattern)
```

### Go Implementation

```go
// With pflag
pflag.Bool("verbose", false, "Enable verbose output")
pflag.Bool("no-color", false, "Disable colored output")

// With Kong (supports --no- prefix automatically)
var CLI struct {
    Color bool `default:"true" negatable:"" help:"Use colored output."`
}
// --color and --no-color both work
```

## Flags with Optional Values

```bash
--output              # Use default value
--output=json         # Use specified value
```

### Go Implementation

```go
// With pflag
fs := pflag.NewFlagSet("app", pflag.ContinueOnError)
fs.Lookup("output").NoOptDefVal = "json"  // Default when flag present without value

// Usage:
// myapp --output        -> "json"
// myapp --output=yaml   -> "yaml"
// myapp                 -> "" (not set)
```

## Repeatable Flags

```bash
--tag=web --tag=api --tag=security
-t web -t api -t security
```

### Go Implementation

```go
// With pflag
var tags []string
pflag.StringSliceVarP(&tags, "tag", "t", []string{}, "Filter by tags")

// With Kong
var CLI struct {
    Tags []string `short:"t" help:"Filter by tags."`
}
```

## Mutually Exclusive Flags

```bash
# Only one of these should be used
--json | --yaml | --table
```

### Go Implementation

```go
// With Cobra
cmd.MarkFlagsMutuallyExclusive("json", "yaml", "table")

// Manual validation
func validateFlags(json, yaml, table bool) error {
    count := 0
    if json { count++ }
    if yaml { count++ }
    if table { count++ }
    if count > 1 {
        return fmt.Errorf("--json, --yaml, and --table are mutually exclusive")
    }
    return nil
}
```

## Help Text Formatting

### Standard Structure

```
Usage: myapp [global-options] command [command-options] [arguments]

DESCRIPTION
  Brief description of what the application does.

COMMANDS
  scan        Run security scan
  config      Manage configuration

GLOBAL OPTIONS
  -v, --verbose    Enable verbose output
  -h, --help       Show this help message
      --version    Show version information

Use "myapp [command] --help" for more information about a command.
```

### Flag Description Guidelines

```
✅ GOOD:
  -o, --output string    Output format (json|yaml|table) (default "table")
  -d, --depth int        Maximum scan depth (default 3)
  -t, --timeout duration Request timeout (default 30s)

❌ BAD:
  -o    output
  --output-format-for-results    The format to use for outputting results
```

## Exit Codes

| Code  | Meaning                               |
| ----- | ------------------------------------- |
| 0     | Success                               |
| 1     | General error                         |
| 2     | Misuse of command (invalid arguments) |
| 126   | Command not executable                |
| 127   | Command not found                     |
| 128+N | Fatal error signal N                  |

### Go Implementation

```go
const (
    ExitSuccess         = 0
    ExitFailure         = 1
    ExitUsageError      = 2
    ExitConfigError     = 3
    ExitPermissionError = 4
)

func main() {
    if err := run(); err != nil {
        fmt.Fprintln(os.Stderr, err)
        switch {
        case errors.Is(err, ErrInvalidArgs):
            os.Exit(ExitUsageError)
        case errors.Is(err, ErrPermission):
            os.Exit(ExitPermissionError)
        default:
            os.Exit(ExitFailure)
        }
    }
}
```

## Sources

- [POSIX Utility Conventions](https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap12.html)
- [GNU Argument Syntax](https://www.gnu.org/software/libc/manual/html_node/Argument-Syntax.html)
- [Command Line Interface Guidelines](https://clig.dev/)
- Research: `.claude/.output/research/2026-01-05-213532-go-cli-best-practices/`
