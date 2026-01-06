# Configuration Precedence Patterns

Complete guide to 12-Factor configuration precedence in Go CLIs.

## Standard Precedence Order

```
CLI Flags > Environment Variables > Config Files > Struct Defaults
```

**Highest priority wins.** This order enables:

- Production overrides via environment variables (Kubernetes)
- Development flexibility via config files
- Sensible defaults in code

## Why This Order?

| Source      | When to Override            | Example                    |
| ----------- | --------------------------- | -------------------------- |
| CLI Flags   | One-off runs, debugging     | `--verbose --timeout=60`   |
| Environment | Deployment-specific secrets | `DB_URL`, `API_KEY`        |
| Config File | Persistent user preferences | `~/.myapp/config.yaml`     |
| Defaults    | Sane fallbacks              | `timeout=30s`, `port=8080` |

## Implementation Patterns

### Pattern 1: Manual Precedence

```go
type Config struct {
    APIKey   string
    Timeout  time.Duration
    LogLevel string
}

func LoadConfig(flagAPIKey, flagTimeout, flagLogLevel string) *Config {
    cfg := &Config{
        // Defaults (lowest priority)
        Timeout:  30 * time.Second,
        LogLevel: "info",
    }

    // Config file (next priority)
    if cfgFile, err := loadConfigFile(); err == nil {
        if cfgFile.Timeout > 0 {
            cfg.Timeout = cfgFile.Timeout
        }
        if cfgFile.LogLevel != "" {
            cfg.LogLevel = cfgFile.LogLevel
        }
        if cfgFile.APIKey != "" {
            cfg.APIKey = cfgFile.APIKey
        }
    }

    // Environment variables (higher priority)
    if envAPIKey := os.Getenv("MYAPP_API_KEY"); envAPIKey != "" {
        cfg.APIKey = envAPIKey
    }
    if envTimeout := os.Getenv("MYAPP_TIMEOUT"); envTimeout != "" {
        if d, err := time.ParseDuration(envTimeout); err == nil {
            cfg.Timeout = d
        }
    }
    if envLogLevel := os.Getenv("MYAPP_LOG_LEVEL"); envLogLevel != "" {
        cfg.LogLevel = envLogLevel
    }

    // CLI flags (highest priority)
    if flagAPIKey != "" {
        cfg.APIKey = flagAPIKey
    }
    if flagTimeout != "" {
        if d, err := time.ParseDuration(flagTimeout); err == nil {
            cfg.Timeout = d
        }
    }
    if flagLogLevel != "" {
        cfg.LogLevel = flagLogLevel
    }

    return cfg
}
```

### Pattern 2: Viper (Automatic)

```go
func initConfig() {
    // 1. Set defaults (lowest priority)
    viper.SetDefault("timeout", "30s")
    viper.SetDefault("log_level", "info")

    // 2. Config file
    viper.SetConfigName("config")
    viper.SetConfigType("yaml")
    viper.AddConfigPath("$HOME/.myapp")
    viper.AddConfigPath(".")
    viper.ReadInConfig() // Ignore error if not found

    // 3. Environment variables
    viper.SetEnvPrefix("MYAPP")
    viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
    viper.AutomaticEnv()

    // 4. CLI flags (bound in command init)
    // viper.BindPFlag("timeout", cmd.Flags().Lookup("timeout"))
}

// Usage: viper.GetDuration("timeout") respects precedence automatically
```

### Pattern 3: Koanf (Explicit)

```go
func LoadConfig(flagTimeout, flagLogLevel string) (*Config, error) {
    k := koanf.New(".")

    // 1. Defaults (lowest priority)
    k.Load(confmap.Provider(map[string]interface{}{
        "timeout":   "30s",
        "log_level": "info",
    }, "."), nil)

    // 2. Config file
    if err := k.Load(file.Provider("config.yaml"), yaml.Parser()); err != nil {
        // Config file optional
    }

    // 3. Environment variables
    k.Load(env.Provider("MYAPP_", ".", func(s string) string {
        return strings.Replace(strings.ToLower(
            strings.TrimPrefix(s, "MYAPP_")), "_", ".", -1)
    }), nil)

    // 4. CLI flags (highest priority)
    flags := map[string]interface{}{}
    if flagTimeout != "" {
        flags["timeout"] = flagTimeout
    }
    if flagLogLevel != "" {
        flags["log_level"] = flagLogLevel
    }
    if len(flags) > 0 {
        k.Load(confmap.Provider(flags, "."), nil)
    }

    var cfg Config
    if err := k.Unmarshal("", &cfg); err != nil {
        return nil, err
    }

    return &cfg, nil
}
```

## 12-Factor App Methodology

From [12factor.net/config](https://12factor.net/config):

> The twelve-factor app stores config in environment variables.

### Key Principles

1. **Strict separation** - Config varies between deploys, code doesn't
2. **Environment variables** - Language/OS-agnostic, can't be checked into code
3. **No grouping** - Don't batch into "environments" (dev/staging/prod)
4. **Granular** - Each config value is independent

### Go Implementation

```go
// Fail fast on required config
func RequireEnv(key string) string {
    value := os.Getenv(key)
    if value == "" {
        log.Fatalf("Required environment variable %s is not set", key)
    }
    return value
}

// Optional with default
func GetEnvOrDefault(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}

// Type-safe loading
type Config struct {
    DBUrl      string        `env:"DATABASE_URL,required"`
    Port       int           `env:"PORT" envDefault:"8080"`
    LogLevel   string        `env:"LOG_LEVEL" envDefault:"info"`
    Timeout    time.Duration `env:"TIMEOUT" envDefault:"30s"`
    Debug      bool          `env:"DEBUG" envDefault:"false"`
}

func LoadConfig() (*Config, error) {
    var cfg Config
    if err := env.Parse(&cfg); err != nil {
        return nil, err
    }
    return &cfg, nil
}
```

## Kubernetes Integration

### ConfigMaps for Non-Secrets

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-config
data:
  LOG_LEVEL: "info"
  TIMEOUT: "60s"
  MAX_CONNECTIONS: "100"
```

### Secrets for Sensitive Data

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: myapp-secrets
type: Opaque
data:
  API_KEY: YmFzZTY0LWVuY29kZWQta2V5
  DATABASE_URL: cG9zdGdyZXM6Ly8uLi4=
```

### Pod Spec

```yaml
spec:
  containers:
    - name: myapp
      env:
        # From ConfigMap
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: myapp-config
              key: LOG_LEVEL
        # From Secret
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: myapp-secrets
              key: API_KEY
```

## Validation at Startup

```go
func (c *Config) Validate() error {
    var errs []string

    if c.APIKey == "" {
        errs = append(errs, "API_KEY is required")
    }

    if c.Timeout < time.Second {
        errs = append(errs, "TIMEOUT must be at least 1s")
    }

    validLogLevels := map[string]bool{"debug": true, "info": true, "warn": true, "error": true}
    if !validLogLevels[c.LogLevel] {
        errs = append(errs, fmt.Sprintf("LOG_LEVEL must be one of: debug, info, warn, error; got: %s", c.LogLevel))
    }

    if len(errs) > 0 {
        return fmt.Errorf("config validation failed:\n  - %s", strings.Join(errs, "\n  - "))
    }
    return nil
}

func main() {
    cfg, err := LoadConfig()
    if err != nil {
        log.Fatalf("Failed to load config: %v", err)
    }
    if err := cfg.Validate(); err != nil {
        log.Fatalf("Invalid config: %v", err)
    }
    // Continue with valid config
}
```

## Debug Configuration Sources

```go
func (c *Config) PrintSources() {
    fmt.Println("Configuration sources:")
    fmt.Printf("  API_KEY: %s (from: %s)\n", maskSecret(c.APIKey), c.apiKeySource)
    fmt.Printf("  TIMEOUT: %s (from: %s)\n", c.Timeout, c.timeoutSource)
    fmt.Printf("  LOG_LEVEL: %s (from: %s)\n", c.LogLevel, c.logLevelSource)
}

// Track where each value came from
type ConfigWithSources struct {
    Config
    apiKeySource   string
    timeoutSource  string
    logLevelSource string
}
```

## Sources

- [12 Factor App - Config](https://12factor.net/config)
- [Viper Precedence](https://github.com/spf13/viper#why-viper)
- [Koanf Documentation](https://github.com/knadh/koanf)
- Research: `.claude/.output/research/2026-01-05-213532-go-cli-best-practices/`
