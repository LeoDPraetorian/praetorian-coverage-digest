# Progress Feedback Patterns

Complete guide to progress indicators for Go CLIs.

## When to Show Progress

**Required for operations >2 seconds:**

- File downloads/uploads
- Asset scanning (multiple targets)
- Database migrations
- Report generation
- Network requests

**Silent operations create anxiety** - users think the CLI has hung.

## Three Progress Patterns

### Pattern 1: X of Y (Recommended)

Use when total count is known.

```go
import "github.com/vbauerster/mpb/v7"
import "github.com/vbauerster/mpb/v7/decor"

func scanWithProgress(targets []string) error {
    p := mpb.New()

    bar := p.AddBar(int64(len(targets)),
        mpb.PrependDecorators(
            decor.Name("Scanning: "),
            decor.CountersNoUnit("%d / %d"),
        ),
        mpb.AppendDecorators(
            decor.Percentage(),
        ),
    )

    for _, target := range targets {
        if err := scan(target); err != nil {
            p.Wait()
            return err
        }
        bar.Increment()
    }

    p.Wait()
    return nil
}
```

**Output**:

```
Scanning: 45 / 120  37%
```

### Pattern 2: Spinner (Indeterminate)

Use for quick sequential tasks without progress data.

```go
import "github.com/charmbracelet/huh/spinner"

func generateReport() error {
    err := huh.NewSpinner().
        Title("Generating PDF report...").
        Action(func() error {
            return createPDF()
        }).
        Run()

    if err != nil {
        return fmt.Errorf("report generation failed: %w", err)
    }
    return nil
}
```

**Output**:

```
⠋ Generating PDF report...
```

### Pattern 3: Progress Bar (Percentage)

Use for file operations with known size.

```go
import "github.com/schollz/progressbar/v3"

func downloadFile(url, dest string) error {
    resp, err := http.Get(url)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    f, err := os.Create(dest)
    if err != nil {
        return err
    }
    defer f.Close()

    bar := progressbar.DefaultBytes(
        resp.ContentLength,
        "Downloading",
    )

    io.Copy(io.MultiWriter(f, bar), resp.Body)
    return nil
}
```

**Output**:

```
Downloading  67% |████████████░░░░░░| [1.2 GB/1.8 GB, 3.4 MB/s]
```

## Multi-Progress Bars

For concurrent operations:

```go
import "github.com/vbauerster/mpb/v7"

func scanConcurrently(targets []string) error {
    p := mpb.New(mpb.WithWidth(60))

    var wg sync.WaitGroup
    for _, target := range targets {
        wg.Add(1)

        bar := p.AddBar(100,
            mpb.PrependDecorators(
                decor.Name(fmt.Sprintf("%-20s", target)),
            ),
            mpb.AppendDecorators(
                decor.Percentage(),
            ),
        )

        go func(t string, b *mpb.Bar) {
            defer wg.Done()
            scanWithProgress(t, b)
        }(target, bar)
    }

    wg.Wait()
    p.Wait()
    return nil
}

func scanWithProgress(target string, bar *mpb.Bar) error {
    for i := 0; i < 100; i++ {
        // Scan logic
        time.Sleep(10 * time.Millisecond)
        bar.Increment()
    }
    return nil
}
```

**Output**:

```
example.com           67% |████████░░|
api.example.com       34% |████░░░░░░|
test.example.com      89% |███████████|
```

## Bubble Tea (TUI Framework)

For complex interactive progress:

```go
import (
    "github.com/charmbracelet/bubbles/progress"
    tea "github.com/charmbracelet/bubbletea"
)

type model struct {
    progress progress.Model
    percent  float64
}

type progressMsg float64

func (m model) Init() tea.Cmd {
    return doWork()
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case progressMsg:
        if msg >= 1.0 {
            return m, tea.Quit
        }
        m.percent = float64(msg)
        return m, doWork()

    case tea.KeyMsg:
        if msg.String() == "ctrl+c" {
            return m, tea.Quit
        }
    }
    return m, nil
}

func (m model) View() string {
    return m.progress.ViewAs(m.percent)
}

func doWork() tea.Cmd {
    return func() tea.Msg {
        time.Sleep(100 * time.Millisecond)
        return progressMsg(/* current progress */)
    }
}
```

## Verbose Mode Pattern

```go
var verbose bool

func init() {
    rootCmd.PersistentFlags().BoolVarP(&verbose, "verbose", "v", false, "verbose output")
}

func log(format string, args ...interface{}) {
    if verbose {
        fmt.Fprintf(os.Stderr, format+"\n", args...)
    }
}

func scanTargets(targets []string) error {
    if verbose {
        // Verbose: Show each step
        for i, target := range targets {
            log("Scanning %d/%d: %s", i+1, len(targets), target)
            if err := scan(target); err != nil {
                return err
            }
        }
    } else {
        // Normal: Show progress bar
        return scanWithProgress(targets)
    }
    return nil
}
```

## TTY Detection

Only show fancy progress for terminals:

```go
import "golang.org/x/term"

func isTerminal(f *os.File) bool {
    return term.IsTerminal(int(f.Fd()))
}

func scanTargets(targets []string) error {
    if isTerminal(os.Stderr) {
        // Show progress bar
        return scanWithProgress(targets)
    } else {
        // Plain output for pipes/logs
        for i, target := range targets {
            fmt.Fprintf(os.Stderr, "Scanning %d/%d: %s\n", i+1, len(targets), target)
            if err := scan(target); err != nil {
                return err
            }
        }
    }
    return nil
}
```

## Library Comparison

| Library         | Best For                  | Features                       |
| --------------- | ------------------------- | ------------------------------ |
| **mpb**         | Multi-bar, concurrent ops | Multiple bars, decorators      |
| **progressbar** | Simple single bar         | File downloads, basic progress |
| **huh/spinner** | Quick tasks               | Spinners, interactive prompts  |
| **Bubble Tea**  | Complex TUI               | Full terminal UI framework     |
| **uiprogress**  | Legacy apps               | Simple API, less maintained    |

## Sources

- [mpb GitHub](https://github.com/vbauerster/mpb)
- [progressbar GitHub](https://github.com/schollz/progressbar)
- [Bubble Tea GitHub](https://github.com/charmbracelet/bubbletea)
- Research: `.claude/.output/research/2026-01-05-213532-go-cli-best-practices/`
