# Go CLI Library Ecosystem

Complete reference for essential Go CLI libraries organized by purpose.

## CLI Frameworks

| Library                                               | Stars         | Dependencies | Best For                |
| ----------------------------------------------------- | ------------- | ------------ | ----------------------- |
| [spf13/cobra](https://github.com/spf13/cobra)         | 42.8k         | pflag        | Complex enterprise CLIs |
| [urfave/cli](https://github.com/urfave/cli)           | 23.8k         | None         | Zero-dependency CLIs    |
| [alecthomas/kong](https://github.com/alecthomas/kong) | 5k+           | Minimal      | Struct-based type-safe  |
| [spf13/pflag](https://github.com/spf13/pflag)         | Part of Cobra | None         | POSIX flag replacement  |

**Installation**:

```bash
go get github.com/spf13/cobra@latest
go get github.com/urfave/cli/v2@latest
go get github.com/alecthomas/kong@latest
go get github.com/spf13/pflag@latest
```

## Configuration Management

| Library                                                                   | Stars | Dependencies | Best For                         |
| ------------------------------------------------------------------------- | ----- | ------------ | -------------------------------- |
| [spf13/viper](https://github.com/spf13/viper)                             | 26.3k | Many         | Cobra integration, comprehensive |
| [knadh/koanf](https://github.com/knadh/koanf)                             | 2.6k  | Modular      | Lightweight, case-sensitive      |
| [kelseyhightower/envconfig](https://github.com/kelseyhightower/envconfig) | 5k+   | None         | Env vars only                    |
| [ilyakaznacheev/cleanenv](https://github.com/ilyakaznacheev/cleanenv)     | 1.5k+ | Minimal      | Env + file with validation       |

**Installation**:

```bash
go get github.com/spf13/viper@latest
go get github.com/knadh/koanf/v2@latest
go get github.com/kelseyhightower/envconfig@latest
go get github.com/ilyakaznacheev/cleanenv@latest
```

## Validation

| Library                                                               | Stars | Approach    | Best For                 |
| --------------------------------------------------------------------- | ----- | ----------- | ------------------------ |
| [go-playground/validator](https://github.com/go-playground/validator) | 16k+  | Struct tags | Declarative validation   |
| [go-ozzo/ozzo-validation](https://github.com/go-ozzo/ozzo-validation) | 3.7k+ | Code-based  | Complex validation logic |

**Installation**:

```bash
go get github.com/go-playground/validator/v10@latest
go get github.com/go-ozzo/ozzo-validation/v4@latest
```

**Example**:

```go
// go-playground/validator
type Config struct {
    URL     string `validate:"required,url"`
    Port    int    `validate:"required,min=1,max=65535"`
    Email   string `validate:"omitempty,email"`
    LogLevel string `validate:"oneof=debug info warn error"`
}

// ozzo-validation
func (c Config) Validate() error {
    return validation.ValidateStruct(&c,
        validation.Field(&c.URL, validation.Required, is.URL),
        validation.Field(&c.Port, validation.Required, validation.Min(1), validation.Max(65535)),
        validation.Field(&c.Email, is.Email),
    )
}
```

## Output Formatting

### Tables

| Library                                                             | Stars | Features                | Best For        |
| ------------------------------------------------------------------- | ----- | ----------------------- | --------------- |
| [olekukonko/tablewriter](https://github.com/olekukonko/tablewriter) | 4.3k+ | ASCII tables, colors    | Simple tables   |
| [charmbracelet/lipgloss](https://github.com/charmbracelet/lipgloss) | 8k+   | Styled layouts          | Rich formatting |
| [jedib0t/go-pretty](https://github.com/jedib0t/go-pretty)           | 4.7k+ | Tables, lists, progress | Comprehensive   |

**Installation**:

```bash
go get github.com/olekukonko/tablewriter@latest
go get github.com/charmbracelet/lipgloss@latest
go get github.com/jedib0t/go-pretty/v6@latest
```

### Colors

| Library                                                             | Stars | Features          | Best For          |
| ------------------------------------------------------------------- | ----- | ----------------- | ----------------- |
| [fatih/color](https://github.com/fatih/color)                       | 7.2k+ | Simple color API  | Basic coloring    |
| [charmbracelet/lipgloss](https://github.com/charmbracelet/lipgloss) | 8k+   | Styled components | Advanced styling  |
| [mgutz/ansi](https://github.com/mgutz/ansi)                         | 0.5k+ | ANSI codes        | Low-level control |

**Installation**:

```bash
go get github.com/fatih/color@latest
go get github.com/charmbracelet/lipgloss@latest
```

## Progress Indicators

| Library                                                           | Stars | Features              | Best For        |
| ----------------------------------------------------------------- | ----- | --------------------- | --------------- |
| [vbauerster/mpb](https://github.com/vbauerster/mpb)               | 2.3k+ | Multi-bar, decorators | Concurrent ops  |
| [schollz/progressbar](https://github.com/schollz/progressbar)     | 4k+   | Simple API            | File downloads  |
| [briandowns/spinner](https://github.com/briandowns/spinner)       | 2.3k+ | Spinners              | Quick tasks     |
| [charmbracelet/bubbles](https://github.com/charmbracelet/bubbles) | 5.5k+ | TUI components        | Interactive UIs |

**Installation**:

```bash
go get github.com/vbauerster/mpb/v7@latest
go get github.com/schollz/progressbar/v3@latest
go get github.com/briandowns/spinner@latest
go get github.com/charmbracelet/bubbles@latest
```

## Interactive Prompts

| Library                                                               | Stars | Features              | Best For                 |
| --------------------------------------------------------------------- | ----- | --------------------- | ------------------------ |
| [AlecAivazis/survey](https://github.com/AlecAivazis/survey)           | 4k+   | Questions, validation | Form-style input         |
| [manifoldco/promptui](https://github.com/manifoldco/promptui)         | 6k+   | Select, confirm       | Simple prompts           |
| [charmbracelet/bubbletea](https://github.com/charmbracelet/bubbletea) | 27k+  | Full TUI framework    | Complex interactive apps |
| [charmbracelet/huh](https://github.com/charmbracelet/huh)             | 5k+   | Forms, spinners       | Modern interactive CLIs  |

**Installation**:

```bash
go get github.com/AlecAivazis/survey/v2@latest
go get github.com/manifoldco/promptui@latest
go get github.com/charmbracelet/bubbletea@latest
go get github.com/charmbracelet/huh@latest
```

**Example**:

```go
// survey
prompt := &survey.Select{
    Message: "Choose an environment:",
    Options: []string{"dev", "staging", "prod"},
}
var env string
survey.AskOne(prompt, &env)

// huh
err := huh.NewSelect[string]().
    Title("Choose environment").
    Options(
        huh.NewOption("Development", "dev"),
        huh.NewOption("Staging", "staging"),
        huh.NewOption("Production", "prod"),
    ).
    Value(&env).
    Run()
```

## Logging

| Library                                                   | Stars  | Features           | Best For         |
| --------------------------------------------------------- | ------ | ------------------ | ---------------- |
| [sirupsen/logrus](https://github.com/sirupsen/logrus)     | 24.7k+ | Structured logging | General purpose  |
| [rs/zerolog](https://github.com/rs/zerolog)               | 10.5k+ | Zero allocation    | High performance |
| [uber-go/zap](https://github.com/uber-go/zap)             | 21.8k+ | Fast structured    | Production       |
| [charmbracelet/log](https://github.com/charmbracelet/log) | 2.5k+  | Styled output      | CLI-friendly     |

**Installation**:

```bash
go get github.com/sirupsen/logrus@latest
go get github.com/rs/zerolog@latest
go get go.uber.org/zap@latest
go get github.com/charmbracelet/log@latest
```

## Terminal Detection

| Library                                                   | Purpose                      |
| --------------------------------------------------------- | ---------------------------- |
| [golang.org/x/term](https://pkg.go.dev/golang.org/x/term) | TTY detection, terminal size |
| [mattn/go-isatty](https://github.com/mattn/go-isatty)     | Cross-platform TTY check     |

**Installation**:

```bash
go get golang.org/x/term@latest
go get github.com/mattn/go-isatty@latest
```

## Complete CLI Stack Example

**Minimal Stack** (simple CLI):

```
- stdlib flag (argument parsing)
- envconfig (env var loading)
- go-playground/validator (validation)
```

**Medium Stack** (moderate complexity):

```
- Kong (CLI framework)
- Koanf (config management)
- go-playground/validator (validation)
- tablewriter (output formatting)
- progressbar (progress feedback)
```

**Full Stack** (enterprise CLI):

```
- Cobra (CLI framework)
- Viper (config management)
- go-playground/validator (validation)
- lipgloss + Bubble Tea (rich TUI)
- mpb (multi-progress bars)
- logrus or zap (structured logging)
- survey or huh (interactive prompts)
```

## Chariot Recommendation

For Chariot security tools (nebula, praetorian-cli, trajan):

```
✅ CLI Framework: Kong (minimal deps, 3384 KB)
✅ Config: Koanf (case-sensitive, 2.9 MB)
✅ Validation: go-playground/validator
✅ Progress: mpb (multi-bar for concurrent scans)
✅ Output: tablewriter + lipgloss
✅ Logging: zerolog (high performance)
```

**Why**: Container-optimized, minimal dependencies, suitable for security tools.

## Sources

- GitHub stars as of 2026-01-05
- [Awesome Go](https://github.com/avelino/awesome-go)
- Research: `.claude/.output/research/2026-01-05-213532-go-cli-best-practices/`
