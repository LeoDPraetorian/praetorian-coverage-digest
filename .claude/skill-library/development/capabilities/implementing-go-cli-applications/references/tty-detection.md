# TTY Detection and Output Formatting

Complete guide to smart output formatting based on terminal detection.

## Why TTY Detection Matters

| Context                | Output Style             | Reason            |
| ---------------------- | ------------------------ | ----------------- |
| Terminal (interactive) | Colors, tables, spinners | Human-friendly    |
| Pipe/redirect          | Plain text, no colors    | Machine-parseable |
| CI/CD logs             | No colors, timestamped   | Log aggregation   |

**Breaking pipes with color codes frustrates automation.**

## Basic TTY Detection

```go
import "golang.org/x/term"

func isTerminal(f *os.File) bool {
    return term.IsTerminal(int(f.Fd()))
}

// Usage
if isTerminal(os.Stdout) {
    // Output is terminal - use colors
} else {
    // Output is pipe/file - plain text
}
```

## NO_COLOR Support

Respect `NO_COLOR` environment variable per [no-color.org](https://no-color.org):

```go
func shouldUseColor() bool {
    // Check NO_COLOR first (user preference)
    if os.Getenv("NO_COLOR") != "" {
        return false
    }

    // Check if terminal
    return isTerminal(os.Stdout)
}
```

## Smart Output Pattern

```go
type OutputFormat string

const (
    OutputTable OutputFormat = "table"
    OutputJSON  OutputFormat = "json"
    OutputYAML  OutputFormat = "yaml"
    OutputPlain OutputFormat = "plain"
)

func PrintResults(results []Result, format OutputFormat) {
    if format == "" {
        // Auto-detect
        if isTerminal(os.Stdout) {
            format = OutputTable
        } else {
            format = OutputJSON
        }
    }

    switch format {
    case OutputTable:
        printTable(results)
    case OutputJSON:
        json.NewEncoder(os.Stdout).Encode(results)
    case OutputYAML:
        yaml.NewEncoder(os.Stdout).Encode(results)
    case OutputPlain:
        for _, r := range results {
            fmt.Printf("%s\t%s\t%s\n", r.ID, r.Status, r.Severity)
        }
    }
}
```

## Color Handling

### With fatih/color

```go
import "github.com/fatih/color"

var (
    red    = color.New(color.FgRed).SprintFunc()
    green  = color.New(color.FgGreen).SprintFunc()
    yellow = color.New(color.FgYellow).SprintFunc()
)

func init() {
    // Auto-detect and respect NO_COLOR
    color.NoColor = !shouldUseColor()
}

func printStatus(status string) {
    switch status {
    case "success":
        fmt.Println(green(status))
    case "error":
        fmt.Println(red(status))
    case "warning":
        fmt.Println(yellow(status))
    default:
        fmt.Println(status)
    }
}
```

### With lipgloss (Charm)

```go
import "github.com/charmbracelet/lipgloss"

var (
    errorStyle   = lipgloss.NewStyle().Foreground(lipgloss.Color("9"))
    successStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("10"))
    warnStyle    = lipgloss.NewStyle().Foreground(lipgloss.Color("11"))
)

func init() {
    if !shouldUseColor() {
        lipgloss.SetColorProfile(lipgloss.NoTTY{})
    }
}

func printStatus(status string) {
    switch status {
    case "success":
        fmt.Println(successStyle.Render(status))
    case "error":
        fmt.Println(errorStyle.Render(status))
    case "warning":
        fmt.Println(warnStyle.Render(status))
    }
}
```

## Table Formatting

### With tablewriter

```go
import "github.com/olekukonko/tablewriter"

func printTable(results []Result) {
    if !isTerminal(os.Stdout) {
        // Plain TSV for pipes
        for _, r := range results {
            fmt.Printf("%s\t%s\t%s\n", r.ID, r.Status, r.Severity)
        }
        return
    }

    // Rich table for terminal
    table := tablewriter.NewWriter(os.Stdout)
    table.SetHeader([]string{"ID", "Status", "Severity"})
    table.SetBorder(true)
    table.SetHeaderColor(
        tablewriter.Colors{tablewriter.Bold, tablewriter.FgCyanColor},
        tablewriter.Colors{tablewriter.Bold, tablewriter.FgCyanColor},
        tablewriter.Colors{tablewriter.Bold, tablewriter.FgCyanColor},
    )

    for _, r := range results {
        row := []string{r.ID, r.Status, r.Severity}
        table.Append(row)
    }

    table.Render()
}
```

### With Bubble Tea Table

```go
import "github.com/charmbracelet/bubbles/table"

func renderTable(results []Result) string {
    columns := []table.Column{
        {Title: "ID", Width: 20},
        {Title: "Status", Width: 15},
        {Title: "Severity", Width: 10},
    }

    var rows []table.Row
    for _, r := range results {
        rows = append(rows, table.Row{r.ID, r.Status, r.Severity})
    }

    t := table.New(
        table.WithColumns(columns),
        table.WithRows(rows),
        table.WithFocused(true),
    )

    return t.View()
}
```

## Conditional Features

```go
type OutputConfig struct {
    UseColor    bool
    UseUnicode  bool
    UseProgress bool
}

func DetectOutput() OutputConfig {
    isTTY := isTerminal(os.Stdout)
    noColor := os.Getenv("NO_COLOR") != ""

    return OutputConfig{
        UseColor:    isTTY && !noColor,
        UseUnicode:  isTTY,
        UseProgress: isTTY,
    }
}

func printResults(results []Result) {
    cfg := DetectOutput()

    if cfg.UseProgress {
        printWithProgressBar(results)
    } else {
        printPlain(results)
    }

    if cfg.UseColor {
        highlightErrors(results)
    }
}
```

## CI/CD Detection

Detect common CI environments:

```go
func isCI() bool {
    ciEnvVars := []string{
        "CI",
        "CONTINUOUS_INTEGRATION",
        "GITHUB_ACTIONS",
        "GITLAB_CI",
        "CIRCLECI",
        "TRAVIS",
        "JENKINS_URL",
        "BUILDKITE",
    }

    for _, env := range ciEnvVars {
        if os.Getenv(env) != "" {
            return true
        }
    }
    return false
}

func shouldShowProgress() bool {
    return isTerminal(os.Stdout) && !isCI()
}
```

## Logging Best Practices

```go
// Separate user output from debug output
// User output -> stdout
// Status/errors -> stderr
// Logs -> file or --verbose to stderr

func printResult(result string) {
    fmt.Println(result)  // stdout - can be piped
}

func logInfo(msg string) {
    if verbose {
        fmt.Fprintln(os.Stderr, msg)  // stderr - doesn't interfere with output
    }
}

func logError(err error) {
    fmt.Fprintf(os.Stderr, "Error: %v\n", err)  // stderr - visible even when piped
}
```

## Testing with Output Capture

```go
func TestCommandOutput(t *testing.T) {
    // Capture stdout
    oldStdout := os.Stdout
    r, w, _ := os.Pipe()
    os.Stdout = w

    // Run command
    runCommand()

    // Restore stdout
    w.Close()
    os.Stdout = oldStdout

    // Read captured output
    var buf bytes.Buffer
    io.Copy(&buf, r)
    output := buf.String()

    assert.Contains(t, output, "expected content")
}

// Better: With Cobra's built-in
func TestCobraCommand(t *testing.T) {
    var buf bytes.Buffer
    rootCmd.SetOut(&buf)
    rootCmd.SetErr(&buf)
    rootCmd.SetArgs([]string{"scan", "target"})

    err := rootCmd.Execute()
    assert.NoError(t, err)
    assert.Contains(t, buf.String(), "expected")
}
```

## Complete Example

```go
package main

import (
    "encoding/json"
    "fmt"
    "os"

    "github.com/fatih/color"
    "github.com/olekukonko/tablewriter"
    "golang.org/x/term"
    "gopkg.in/yaml.v3"
)

var (
    outputFormat string
    noColor      bool
)

func main() {
    // Parse flags...

    // Auto-detect if not specified
    if outputFormat == "" {
        if isTerminal(os.Stdout) {
            outputFormat = "table"
        } else {
            outputFormat = "json"
        }
    }

    // Disable color if requested or not TTY
    color.NoColor = noColor || !isTerminal(os.Stdout) || os.Getenv("NO_COLOR") != ""

    results := scan()
    printResults(results, outputFormat)
}

func printResults(results []Result, format string) {
    switch format {
    case "json":
        json.NewEncoder(os.Stdout).Encode(results)
    case "yaml":
        yaml.NewEncoder(os.Stdout).Encode(results)
    case "table":
        if isTerminal(os.Stdout) {
            printRichTable(results)
        } else {
            printPlainTable(results)
        }
    case "plain":
        for _, r := range results {
            fmt.Printf("%s\t%s\t%s\n", r.ID, r.Status, r.Severity)
        }
    }
}

func printRichTable(results []Result) {
    table := tablewriter.NewWriter(os.Stdout)
    table.SetHeader([]string{"ID", "Status", "Severity"})
    table.SetBorder(true)

    for _, r := range results {
        status := r.Status
        if color.NoColor == false {
            switch r.Status {
            case "success":
                status = color.GreenString(r.Status)
            case "error":
                status = color.RedString(r.Status)
            }
        }
        table.Append([]string{r.ID, status, r.Severity})
    }

    table.Render()
}

func printPlainTable(results []Result) {
    for _, r := range results {
        fmt.Printf("%s\t%s\t%s\n", r.ID, r.Status, r.Severity)
    }
}

func isTerminal(f *os.File) bool {
    return term.IsTerminal(int(f.Fd()))
}
```

## Sources

- [golang.org/x/term](https://pkg.go.dev/golang.org/x/term)
- [no-color.org](https://no-color.org/)
- [fatih/color GitHub](https://github.com/fatih/color)
- Research: `.claude/.output/research/2026-01-05-213532-go-cli-best-practices/`
