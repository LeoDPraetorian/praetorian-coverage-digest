# Shell Completion Patterns

Complete guide to implementing shell completion for Bash, Zsh, Fish, and PowerShell.

## Why Shell Completion

**Benefits**:

- Reduces memorization burden
- Discovers available commands
- Prevents typos in flags/values
- Professional CLI UX expectation

## Cobra (Built-in)

Cobra provides comprehensive completion generation:

```go
var rootCmd = &cobra.Command{
    Use: "myapp",
}

func init() {
    rootCmd.AddCommand(completionCmd)
}

var completionCmd = &cobra.Command{
    Use:   "completion [bash|zsh|fish|powershell]",
    Short: "Generate completion script",
    Long: `To load completions:

Bash:
  $ source <(myapp completion bash)
  # To load automatically, add to ~/.bashrc:
  $ echo 'source <(myapp completion bash)' >> ~/.bashrc

Zsh:
  $ source <(myapp completion zsh)
  # To load automatically:
  $ myapp completion zsh > "${fpath[1]}/_myapp"

Fish:
  $ myapp completion fish | source
  # To load automatically:
  $ myapp completion fish > ~/.config/fish/completions/myapp.fish

PowerShell:
  PS> myapp completion powershell | Out-String | Invoke-Expression
  # To load automatically, add to $PROFILE
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
    Use:   "scan [target]",
    Short: "Scan a target",

    // Complete target argument
    ValidArgsFunction: func(cmd *cobra.Command, args []string, toComplete string) ([]string, cobra.ShellCompDirective) {
        if len(args) != 0 {
            return nil, cobra.ShellCompDirectiveNoFileComp
        }

        // Suggest URL schemes
        return []string{
            "https://",
            "http://",
            "tcp://",
            "udp://",
        }, cobra.ShellCompDirectiveNoSpace
    },
}

func init() {
    scanCmd.Flags().StringP("output", "o", "table", "Output format")

    // Complete flag values
    scanCmd.RegisterFlagCompletionFunc("output", func(cmd *cobra.Command, args []string, toComplete string) ([]string, cobra.ShellCompDirective) {
        return []string{"json", "yaml", "table", "plain"}, cobra.ShellCompDirectiveDefault
    })
}
```

### Dynamic Completions

```go
var projectCmd = &cobra.Command{
    Use: "project [name]",

    ValidArgsFunction: func(cmd *cobra.Command, args []string, toComplete string) ([]string, cobra.ShellCompDirective) {
        if len(args) != 0 {
            return nil, cobra.ShellCompDirectiveNoFileComp
        }

        // Fetch from API
        projects, err := fetchProjects()
        if err != nil {
            return nil, cobra.ShellCompDirectiveError
        }

        var names []string
        for _, p := range projects {
            names = append(names, p.Name)
        }
        return names, cobra.ShellCompDirectiveNoFileComp
    },
}
```

## Kong Completion

Kong requires manual completion script generation:

```go
var CLI struct {
    Completion CompletionCmd `cmd:"" help:"Generate shell completion."`
    // ...
}

type CompletionCmd struct {
    Shell string `arg:"" enum:"bash,zsh,fish" help:"Shell type."`
}

func (c *CompletionCmd) Run() error {
    switch c.Shell {
    case "bash":
        return generateBashCompletion()
    case "zsh":
        return generateZshCompletion()
    case "fish":
        return generateFishCompletion()
    }
    return nil
}

func generateBashCompletion() error {
    script := `
_myapp_completions() {
    local cur prev commands
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"
    commands="scan config help"

    case "${prev}" in
        scan)
            COMPREPLY=($(compgen -W "https:// http://" -- ${cur}))
            return 0
            ;;
        --output|-o)
            COMPREPLY=($(compgen -W "json yaml table" -- ${cur}))
            return 0
            ;;
    esac

    COMPREPLY=($(compgen -W "${commands}" -- ${cur}))
}

complete -F _myapp_completions myapp
`
    fmt.Print(script)
    return nil
}
```

## urfave/cli Completion

```go
app := &cli.App{
    EnableBashCompletion: true,
    Commands: []*cli.Command{
        {
            Name:  "scan",
            Usage: "Scan a target",
            BashComplete: func(c *cli.Context) {
                if c.NArg() > 0 {
                    return // Already have target
                }
                // Suggest URL schemes
                fmt.Println("https://")
                fmt.Println("http://")
                fmt.Println("tcp://")
            },
        },
    },
}
```

## Shell-Specific Patterns

### Bash

```bash
# Install completion
myapp completion bash > /etc/bash_completion.d/myapp

# Or in ~/.bashrc
source <(myapp completion bash)

# Manual completion function
_myapp() {
    local cur prev
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"

    case "${prev}" in
        --output|-o)
            COMPREPLY=($(compgen -W "json yaml table" -- ${cur}))
            return 0
            ;;
    esac

    COMPREPLY=($(compgen -W "scan config help" -- ${cur}))
}
complete -F _myapp myapp
```

### Zsh

```zsh
# Install completion
myapp completion zsh > "${fpath[1]}/_myapp"

# Or autoload
autoload -U compinit && compinit

# Manual completion function
#compdef myapp

_myapp() {
    local -a commands
    commands=(
        'scan:Run security scan'
        'config:Manage configuration'
        'help:Show help'
    )

    _arguments \
        '(-h --help)'{-h,--help}'[Show help]' \
        '(-v --verbose)'{-v,--verbose}'[Verbose output]' \
        '(-o --output)'{-o,--output}'[Output format]:format:(json yaml table)' \
        '1: :->command' \
        '*:: :->args'

    case $state in
        command)
            _describe 'command' commands
            ;;
    esac
}
```

### Fish

```fish
# Install completion
myapp completion fish > ~/.config/fish/completions/myapp.fish

# Manual completion
complete -c myapp -f -a 'scan config help'
complete -c myapp -s o -l output -d 'Output format' -xa 'json yaml table'
complete -c myapp -s v -l verbose -d 'Verbose output'
complete -c myapp -s h -l help -d 'Show help'
```

## Installation Instructions

Include in documentation:

````markdown
## Shell Completion

### Bash

```bash
# Load completion temporarily
source <(myapp completion bash)

# Load automatically (add to ~/.bashrc)
echo 'source <(myapp completion bash)' >> ~/.bashrc
```

### Zsh

```zsh
# Generate completion file
myapp completion zsh > "${fpath[1]}/_myapp"

# Reload completions
compinit
```

### Fish

```fish
# Install completion
myapp completion fish > ~/.config/fish/completions/myapp.fish

# Completions load automatically on next shell start
```

### PowerShell

```powershell
# Add to PowerShell profile
myapp completion powershell | Out-String | Invoke-Expression

# Or save to profile
Add-Content $PROFILE "`nmyapp completion powershell | Out-String | Invoke-Expression"
```
````

## Sources

- [Cobra Shell Completions](https://github.com/spf13/cobra/blob/main/shell_completions.md)
- [Bash Completion Guide](https://github.com/scop/bash-completion)
- Research: `.claude/.output/research/2026-01-05-213532-go-cli-best-practices/`
