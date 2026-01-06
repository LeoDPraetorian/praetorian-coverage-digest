# Chariot Platform CLI Integration Patterns

Specific patterns for CLI tools in the Chariot Development Platform.

## Chariot CLI Tools

| Tool               | Purpose                       | Current Framework | Recommendation |
| ------------------ | ----------------------------- | ----------------- | -------------- |
| **nebula**         | Multi-cloud security scanning | ?                 | Kong + Koanf   |
| **praetorian-cli** | Python CLI/SDK                | Click (Python)    | N/A (Python)   |
| **trajan**         | Security tool orchestration   | ?                 | Kong + Koanf   |
| **Future tools**   | New security CLIs             | -                 | Kong + Koanf   |

## Recommended Stack for Chariot CLIs

### Framework: Kong

**Why for Chariot**:

- **Container-optimized**: 3384 KB binary (smallest feature-complete)
- **Lambda-friendly**: Faster cold starts with smaller binaries
- **Security focus**: Minimal dependencies = smaller attack surface
- **Type-safe**: Compile-time validation for security configs
- **Rapid development**: 40 min migration time for changes

### Configuration: Koanf

**Why for Chariot**:

- **Case-sensitive**: Security configs need exact key matching
- **Modular**: Only load parsers you need
- **2.9 MB binaries**: vs Viper's 12 MB
- **Cloud-native**: Works well with K8s ConfigMaps/Secrets

### Validation: go-playground/validator

**Why for Chariot**:

- **Security validation**: URL, email, IP address validators
- **Fail-fast**: Catch misconfigurations at startup
- **Declarative**: Clear validation rules in struct tags

## Configuration Precedence Pattern

**Standard for all Chariot CLIs**:

```
CLI Flags > Environment Variables > Config File > Defaults
```

### Example: nebula CLI

```bash
# 1. Defaults
nebula scan example.com

# 2. Override via config file
nebula scan example.com --config ~/.chariot/nebula.yaml

# 3. Override via environment variable
CHARIOT_API_KEY=xyz nebula scan example.com

# 4. Override via CLI flag (highest priority)
nebula scan example.com --api-key=abc
```

### Implementation

```go
type NebulaConfig struct {
    APIKey    string        `koanf:"api_key" validate:"required,min=32"`
    APIURL    string        `koanf:"api_url" validate:"required,url"`
    Timeout   time.Duration `koanf:"timeout" validate:"min=1s" default:"30s"`
    LogLevel  string        `koanf:"log_level" validate:"oneof=debug info warn error" default:"info"`
    MaxScans  int           `koanf:"max_scans" validate:"min=1,max=100" default:"10"`
}

func LoadConfig(configPath string, cliFlags CLIFlags) (*NebulaConfig, error) {
    k := koanf.New(".")

    // 1. Defaults
    k.Load(confmap.Provider(map[string]interface{}{
        "api_url":   "https://chariot.praetorian.com/api",
        "timeout":   "30s",
        "log_level": "info",
        "max_scans": 10,
    }, "."), nil)

    // 2. Config file
    if configPath != "" {
        k.Load(file.Provider(configPath), yaml.Parser())
    }

    // 3. Environment variables
    k.Load(env.Provider("CHARIOT_", ".", func(s string) string {
        return strings.Replace(
            strings.ToLower(strings.TrimPrefix(s, "CHARIOT_")),
            "_", ".", -1)
    }), nil)

    // 4. CLI flags (highest priority)
    if cliFlags.APIKey != "" {
        k.Set("api_key", cliFlags.APIKey)
    }
    if cliFlags.Timeout != "" {
        k.Set("timeout", cliFlags.Timeout)
    }

    var cfg NebulaConfig
    if err := k.Unmarshal("", &cfg); err != nil {
        return nil, err
    }

    v := validator.New()
    if err := v.Struct(&cfg); err != nil {
        return nil, fmt.Errorf("config validation failed: %w", err)
    }

    return &cfg, nil
}
```

## Error Message Pattern for Security Tools

```go
type SecurityError struct {
    Operation string   // "scan", "authenticate", "analyze"
    Target    string   // What was being processed
    Err       error    // Underlying error
    Fixes     []string // Actionable steps
}

func (e *SecurityError) Error() string {
    var b strings.Builder
    fmt.Fprintf(&b, "Failed to %s target '%s'\n│\n", e.Operation, e.Target)
    fmt.Fprintf(&b, "├─ %v\n│\n", e.Err)
    fmt.Fprintf(&b, "└─ Fix by:\n")
    for i, fix := range e.Fixes {
        fmt.Fprintf(&b, "   %d. %s\n", i+1, fix)
    }
    return b.String()
}

// Usage
err := &SecurityError{
    Operation: "scan",
    Target:    "example.com",
    Err:       errors.New("API authentication failed: invalid API key"),
    Fixes: []string{
        "Check API key: echo $CHARIOT_API_KEY",
        "Login again: chariot auth login",
        "Verify permissions: chariot auth whoami",
        "Get help: https://docs.chariot.praetorian.com/auth",
    },
}
```

## Progress Feedback for Scans

```go
import "github.com/vbauerster/mpb/v7"

func ScanAssets(assets []Asset) error {
    p := mpb.New(mpb.WithWidth(60))

    bar := p.AddBar(int64(len(assets)),
        mpb.PrependDecorators(
            decor.Name("Scanning assets: "),
            decor.CountersNoUnit("%d / %d"),
        ),
        mpb.AppendDecorators(
            decor.Percentage(),
            decor.Name(" | "),
            decor.AverageSpeed(0, "%.1f/s"),
        ),
    )

    for _, asset := range assets {
        if err := scanAsset(asset); err != nil {
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
Scanning assets: 45 / 120  37% | 2.3/s
```

## Output Formats

**Support machine-parseable output**:

```go
var CLI struct {
    Scan struct {
        Target string `arg:""`
        Output string `enum:"json,yaml,table,csv" default:"table" short:"o"`
    } `cmd:""`
}

func (s *ScanCmd) Run() error {
    results := runScan(s.Target)

    switch s.Output {
    case "json":
        return json.NewEncoder(os.Stdout).Encode(results)
    case "yaml":
        return yaml.NewEncoder(os.Stdout).Encode(results)
    case "csv":
        return writeCSV(os.Stdout, results)
    case "table":
        return printTable(results)
    }
    return nil
}
```

## Authentication Pattern

```go
type AuthConfig struct {
    APIKey   string `koanf:"api_key" validate:"required"`
    Username string `koanf:"username"`
}

func LoadAuthConfig() (*AuthConfig, error) {
    k := koanf.New(".")

    // Load from secure credential store
    credPath := filepath.Join(os.UserHomeDir(), ".chariot", "credentials")
    k.Load(file.Provider(credPath), json.Parser())

    // Override with env var (for CI/CD)
    k.Load(env.Provider("CHARIOT_", ".", envKeyMap), nil)

    var cfg AuthConfig
    k.Unmarshal("", &cfg)

    if err := validator.New().Struct(&cfg); err != nil {
        return nil, &SecurityError{
            Operation: "authentication",
            Target:    "Chariot API",
            Err:       err,
            Fixes: []string{
                "Login: chariot auth login",
                "Set API key: export CHARIOT_API_KEY=<key>",
                "Create config: chariot config init",
            },
        }
    }

    return &cfg, nil
}
```

## Standardized CLI Structure

**Recommended for all Chariot CLIs**:

```go
var CLI struct {
    // Global flags
    Config   string `help:"Config file." type:"path" default:"~/.chariot/config.yaml"`
    Verbose  bool   `help:"Verbose output." short:"v"`
    APIURL   string `help:"Chariot API URL." env:"CHARIOT_API_URL" default:"https://chariot.praetorian.com/api"`
    APIKey   string `help:"API key." env:"CHARIOT_API_KEY"`

    // Common commands
    Auth   AuthCmd   `cmd:"" help:"Manage authentication."`
    Scan   ScanCmd   `cmd:"" help:"Run security scans."`
    Report ReportCmd `cmd:"" help:"Generate reports."`
    Config ConfigCmd `cmd:"" help:"Manage configuration."`
}

type AuthCmd struct {
    Login  AuthLoginCmd  `cmd:"" help:"Login to Chariot."`
    Logout AuthLogoutCmd `cmd:"" help:"Logout from Chariot."`
    Whoami AuthWhoamiCmd `cmd:"" help:"Show current user."`
}

type ScanCmd struct {
    Target string   `arg:"" help:"Target to scan."`
    Output string   `enum:"json,yaml,table" default:"table" short:"o"`
    Tags   []string `help:"Filter by tags." short:"t"`
    Async  bool     `help:"Run scan asynchronously."`
}

func (s *ScanCmd) Run(ctx *Context) error {
    // Implementation
    return nil
}
```

## Deployment Considerations

### Lambda Deployment

```go
// Keep binary size minimal
// Use Kong (3384 KB) + Koanf (2.9 MB) for faster cold starts

// Optimize build
go build -ldflags="-s -w" -o bootstrap cmd/lambda/main.go
```

### Docker Deployment

```dockerfile
# Multi-stage build
FROM golang:1.24 AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /cli

FROM scratch
COPY --from=builder /cli /cli
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
ENTRYPOINT ["/cli"]
```

## Integration with Chariot API

```go
type ChariotClient struct {
    BaseURL string
    APIKey  string
    client  *http.Client
}

func NewClient(cfg *Config) *ChariotClient {
    return &ChariotClient{
        BaseURL: cfg.APIURL,
        APIKey:  cfg.APIKey,
        client: &http.Client{
            Timeout: cfg.Timeout,
        },
    }
}

func (c *ChariotClient) Scan(target string) (*ScanResult, error) {
    req, _ := http.NewRequest("POST", c.BaseURL+"/scans", nil)
    req.Header.Set("Authorization", "Bearer "+c.APIKey)
    req.Header.Set("Content-Type", "application/json")

    resp, err := c.client.Do(req)
    if err != nil {
        return nil, &SecurityError{
            Operation: "API request",
            Target:    target,
            Err:       err,
            Fixes: []string{
                "Check network: ping chariot.praetorian.com",
                "Verify API URL: echo $CHARIOT_API_URL",
                "Try verbose mode: --verbose",
            },
        }
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return nil, handleHTTPError(resp)
    }

    var result ScanResult
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, err
    }

    return &result, nil
}
```

## Testing with Chariot Context

```go
func TestScanCommand(t *testing.T) {
    // Mock Chariot API
    srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        assert.Equal(t, "Bearer test-key", r.Header.Get("Authorization"))
        json.NewEncoder(w).Encode(ScanResult{ID: "scan-123"})
    }))
    defer srv.Close()

    // Test CLI
    cli := &CLI{}
    cli.APIURL = srv.URL
    cli.APIKey = "test-key"
    cli.Scan.Target = "example.com"

    err := cli.Scan.Run(&Context{})
    assert.NoError(t, err)
}
```

## Sources

- Chariot Development Platform structure
- Security CLI best practices
- Container optimization patterns
- Research: `.claude/.output/research/2026-01-05-213532-go-cli-best-practices/`
