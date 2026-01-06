# Error Message Patterns

Complete guide to writing actionable CLI error messages.

## The Three-Part Pattern

Every error message should contain:

```
1. CONTEXT   - What operation was being attempted
2. ERROR     - What specifically went wrong
3. MITIGATION - How to fix it (with commands when possible)
```

## Template

```
Failed to {action} '{target}'
│
├─ {specific error description}
│
└─ Fix by:
   1. {first option with command}
   2. {second option}
   3. {help reference}
```

## Go Implementation

### Basic Pattern

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

### Structured Error Type

```go
type CLIError struct {
    Context    string
    Err        error
    Mitigation []string
}

func (e *CLIError) Error() string {
    var b strings.Builder
    b.WriteString(e.Context)
    b.WriteString("\n│\n├─ ")
    b.WriteString(e.Err.Error())
    b.WriteString("\n│\n└─ Fix by:\n")
    for i, fix := range e.Mitigation {
        fmt.Fprintf(&b, "   %d. %s\n", i+1, fix)
    }
    return b.String()
}

func NewCLIError(context string, err error, mitigation ...string) *CLIError {
    return &CLIError{
        Context:    context,
        Err:        err,
        Mitigation: mitigation,
    }
}

// Usage
err := NewCLIError(
    "Failed to connect to database",
    errors.New("connection refused"),
    "Check if database is running: docker ps",
    "Verify connection string: echo $DATABASE_URL",
    "See docs: myapp docs database",
)
```

### Error Categories

```go
type ErrorKind int

const (
    ErrKindConfig ErrorKind = iota
    ErrKindNetwork
    ErrKindAuth
    ErrKindPermission
    ErrKindInput
    ErrKindInternal
)

func (k ErrorKind) Suggestions() []string {
    switch k {
    case ErrKindConfig:
        return []string{
            "Check config file exists: ls ~/.myapp/config.yaml",
            "Initialize config: myapp config init",
            "Set via environment: export MYAPP_*",
        }
    case ErrKindAuth:
        return []string{
            "Check API key is set: echo $MYAPP_API_KEY",
            "Regenerate key: myapp auth login",
            "Verify permissions: myapp auth status",
        }
    case ErrKindNetwork:
        return []string{
            "Check network connectivity: ping api.example.com",
            "Verify proxy settings: echo $HTTP_PROXY",
            "Try with verbose: myapp --verbose <command>",
        }
    // ...
    default:
        return []string{"Get help: myapp --help"}
    }
}
```

## Real-World Examples

### Authentication Error

```
Failed to authenticate with API
│
├─ Invalid API key: key starts with 'pk_' but expected 'sk_'
│
└─ Fix by:
   1. Use secret key (sk_*), not publishable key (pk_*)
   2. Regenerate key: myapp auth login
   3. Set key: export MYAPP_API_KEY=sk_live_xxx
   4. Check docs: https://docs.example.com/auth
```

### File Not Found

```
Failed to read config file '/home/user/.myapp/config.yaml'
│
├─ No such file or directory
│
└─ Fix by:
   1. Create config: myapp config init
   2. Specify path: myapp --config /path/to/config.yaml
   3. Use defaults: unset MYAPP_CONFIG
```

### Network Error

```
Failed to connect to https://api.example.com/v1/scan
│
├─ Connection refused (dial tcp 93.184.216.34:443: connect: connection refused)
│
└─ Fix by:
   1. Check if service is up: curl -I https://api.example.com/health
   2. Verify network: ping api.example.com
   3. Check proxy: echo $HTTPS_PROXY
   4. Try later or contact support: support@example.com
```

### Validation Error

```
Failed to validate scan configuration
│
├─ Invalid target format: 'not-a-url' is not a valid URL
│
└─ Fix by:
   1. Use full URL: myapp scan https://example.com
   2. Include protocol: http:// or https://
   3. See examples: myapp scan --help
```

### Permission Error

```
Failed to write output to '/var/log/myapp/scan.json'
│
├─ Permission denied: cannot write to directory
│
└─ Fix by:
   1. Use writable path: myapp scan -o ~/scan.json
   2. Fix permissions: sudo chmod 755 /var/log/myapp
   3. Run with sudo: sudo myapp scan -o /var/log/myapp/scan.json
```

## Anti-Patterns

### ❌ Generic Messages

```
Error: something went wrong
Error: operation failed
Error: invalid input
```

### ❌ Technical Jargon Without Context

```
Error: ECONNREFUSED 127.0.0.1:5432
Error: exit status 1
Error: nil pointer dereference
```

### ❌ Blame Language

```
Error: You provided an invalid API key
Error: You forgot to specify the target
Error: Your config file is malformed
```

### ❌ No Actionable Steps

```
Error: Authentication failed
Error: Network error
Error: Configuration error
```

## Best Practices

### 1. Be Specific

```go
// ❌ BAD
return fmt.Errorf("invalid input")

// ✅ GOOD
return fmt.Errorf("invalid port number %d: must be between 1 and 65535", port)
```

### 2. Include Context

```go
// ❌ BAD
return err

// ✅ GOOD
return fmt.Errorf("reading config file %s: %w", path, err)
```

### 3. Provide Commands

```go
// ❌ BAD
"Check your API key"

// ✅ GOOD
"Verify API key: echo $MYAPP_API_KEY"
"Set API key: export MYAPP_API_KEY=<your-key>"
```

### 4. Use Exit Codes

```go
func main() {
    if err := run(); err != nil {
        var cliErr *CLIError
        if errors.As(err, &cliErr) {
            fmt.Fprintln(os.Stderr, cliErr)
            os.Exit(cliErr.ExitCode())
        }
        fmt.Fprintf(os.Stderr, "Error: %v\n", err)
        os.Exit(1)
    }
}
```

### 5. Log vs Display

```go
// For users (stderr)
fmt.Fprintln(os.Stderr, userFriendlyError)

// For debugging (log file or --verbose)
log.Printf("DEBUG: raw error: %+v", err)
```

## Color Coding (TTY Only)

```go
import "github.com/fatih/color"

var (
    errorPrefix = color.New(color.FgRed, color.Bold).SprintFunc()
    fixPrefix   = color.New(color.FgGreen).SprintFunc()
)

func printError(e *CLIError) {
    if isTerminal(os.Stderr) {
        fmt.Fprintf(os.Stderr, "%s %s\n", errorPrefix("Error:"), e.Context)
        fmt.Fprintf(os.Stderr, "  %s\n", e.Err)
        fmt.Fprintf(os.Stderr, "\n%s\n", fixPrefix("Fix by:"))
        for i, fix := range e.Mitigation {
            fmt.Fprintf(os.Stderr, "  %d. %s\n", i+1, fix)
        }
    } else {
        fmt.Fprintln(os.Stderr, e.Error())
    }
}
```

## Sources

- [clig.dev - Errors](https://clig.dev/#errors)
- [Writing Good Error Messages](https://uxplanet.org/how-to-write-good-error-messages-858e4551cd4)
- Research: `.claude/.output/research/2026-01-05-213532-go-cli-best-practices/`
