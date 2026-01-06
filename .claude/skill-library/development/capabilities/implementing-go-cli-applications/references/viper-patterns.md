# Viper Configuration Management

Complete patterns for Viper - comprehensive config library with Cobra integration.

## Why Viper

| Feature               | Benefit                          |
| --------------------- | -------------------------------- |
| **26.3k stars**       | Industry standard                |
| **Cobra integration** | Seamless flag binding            |
| **Multiple formats**  | JSON, YAML, TOML, INI, ENV, etc. |
| **Remote config**     | etcd, Consul support             |
| **Auto reload**       | WatchConfig built-in             |

## Caveats

| Issue                | Impact                   | Workaround                     |
| -------------------- | ------------------------ | ------------------------------ |
| **Case-insensitive** | Breaks JSON/YAML specs   | Use Koanf for case-sensitive   |
| **Not thread-safe**  | Concurrent access issues | Use sync.RWMutex               |
| **Large deps**       | ~12 MB binary impact     | Use Koanf for smaller binaries |
| **No deep merge**    | Nested values replaced   | Flatten config structure       |

## Basic Usage

```go
package config

import (
    "fmt"
    "strings"

    "github.com/spf13/viper"
)

func InitConfig() error {
    // Set defaults
    viper.SetDefault("server.port", 8080)
    viper.SetDefault("server.timeout", "30s")
    viper.SetDefault("log.level", "info")

    // Config file settings
    viper.SetConfigName("config")        // config.yaml, config.json, etc.
    viper.SetConfigType("yaml")          // Explicit format
    viper.AddConfigPath("/etc/myapp/")   // System config
    viper.AddConfigPath("$HOME/.myapp")  // User config
    viper.AddConfigPath(".")             // Local config

    // Read config file
    if err := viper.ReadInConfig(); err != nil {
        if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
            return fmt.Errorf("error reading config: %w", err)
        }
        // Config file not found - use defaults
    }

    // Environment variables
    viper.SetEnvPrefix("MYAPP")
    viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
    viper.AutomaticEnv()

    return nil
}
```

## Cobra Integration

```go
// cmd/root.go
var cfgFile string

func init() {
    cobra.OnInitialize(initConfig)

    rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file")
    rootCmd.PersistentFlags().StringP("log-level", "l", "info", "log level")

    // Bind flags to viper
    viper.BindPFlag("log.level", rootCmd.PersistentFlags().Lookup("log-level"))
}

func initConfig() {
    if cfgFile != "" {
        viper.SetConfigFile(cfgFile)
    } else {
        home, _ := os.UserHomeDir()
        viper.AddConfigPath(home)
        viper.SetConfigType("yaml")
        viper.SetConfigName(".myapp")
    }

    viper.AutomaticEnv()
    viper.ReadInConfig()
}

// cmd/scan.go
func init() {
    scanCmd.Flags().StringP("output", "o", "table", "output format")
    scanCmd.Flags().IntP("depth", "d", 3, "scan depth")

    viper.BindPFlag("scan.output", scanCmd.Flags().Lookup("output"))
    viper.BindPFlag("scan.depth", scanCmd.Flags().Lookup("depth"))
}

var scanCmd = &cobra.Command{
    Use: "scan [target]",
    RunE: func(cmd *cobra.Command, args []string) error {
        // Values come from: flags > env > config > defaults
        output := viper.GetString("scan.output")
        depth := viper.GetInt("scan.depth")
        logLevel := viper.GetString("log.level")

        return runScan(args[0], output, depth, logLevel)
    },
}
```

## Reading Values

```go
// String
host := viper.GetString("server.host")

// Integer
port := viper.GetInt("server.port")

// Boolean
debug := viper.GetBool("debug")

// Duration
timeout := viper.GetDuration("server.timeout")

// String slice
hosts := viper.GetStringSlice("allowed_hosts")

// Map
headers := viper.GetStringMapString("headers")

// Check if key exists
if viper.IsSet("api_key") {
    // ...
}

// Get all settings
allSettings := viper.AllSettings()
```

## Unmarshaling

```go
type ServerConfig struct {
    Host    string        `mapstructure:"host"`
    Port    int           `mapstructure:"port"`
    Timeout time.Duration `mapstructure:"timeout"`
}

type Config struct {
    Server   ServerConfig `mapstructure:"server"`
    LogLevel string       `mapstructure:"log_level"`
    Debug    bool         `mapstructure:"debug"`
}

func LoadConfig() (*Config, error) {
    var cfg Config
    if err := viper.Unmarshal(&cfg); err != nil {
        return nil, fmt.Errorf("unmarshal config: %w", err)
    }
    return &cfg, nil
}

// Unmarshal specific key
var serverCfg ServerConfig
viper.UnmarshalKey("server", &serverCfg)
```

## Hot Reload

```go
func WatchConfig() {
    viper.WatchConfig()
    viper.OnConfigChange(func(e fsnotify.Event) {
        fmt.Println("Config file changed:", e.Name)

        // Validate new config before applying
        var newCfg Config
        if err := viper.Unmarshal(&newCfg); err != nil {
            log.Printf("Invalid config, keeping old: %v", err)
            return
        }

        // Atomic update
        configMu.Lock()
        currentConfig = &newCfg
        configMu.Unlock()

        // Notify listeners
        for _, listener := range configListeners {
            listener(&newCfg)
        }
    })
}
```

## Thread Safety

```go
// Viper is NOT thread-safe for writes
// Use mutex for concurrent access

var (
    configMu sync.RWMutex
    config   *Config
)

func GetConfig() *Config {
    configMu.RLock()
    defer configMu.RUnlock()
    return config
}

func ReloadConfig() error {
    configMu.Lock()
    defer configMu.Unlock()

    if err := viper.ReadInConfig(); err != nil {
        return err
    }

    var newCfg Config
    if err := viper.Unmarshal(&newCfg); err != nil {
        return err
    }

    config = &newCfg
    return nil
}
```

## Remote Configuration

```go
import _ "github.com/spf13/viper/remote"

// etcd
viper.AddRemoteProvider("etcd", "http://127.0.0.1:4001", "/config/myapp.json")
viper.SetConfigType("json")
viper.ReadRemoteConfig()

// Consul
viper.AddRemoteProvider("consul", "localhost:8500", "MY_CONSUL_KEY")
viper.SetConfigType("json")
viper.ReadRemoteConfig()

// Watch remote config
go func() {
    for {
        time.Sleep(5 * time.Second)
        if err := viper.WatchRemoteConfig(); err != nil {
            log.Printf("Remote config error: %v", err)
        }
    }
}()
```

## Multiple Config Files

```go
func LoadConfigs() error {
    // Base config
    viper.SetConfigFile("config.yaml")
    if err := viper.ReadInConfig(); err != nil {
        return err
    }

    // Merge environment-specific config
    env := viper.GetString("environment")
    if env != "" {
        viper.SetConfigFile(fmt.Sprintf("config.%s.yaml", env))
        if err := viper.MergeInConfig(); err != nil {
            // Environment config optional
        }
    }

    // Merge local overrides
    viper.SetConfigFile("config.local.yaml")
    viper.MergeInConfig() // Ignore if not found

    return nil
}
```

## Writing Config

```go
// Write current config to file
viper.WriteConfig()

// Write to specific file
viper.WriteConfigAs("/path/to/config.yaml")

// Safe write (don't overwrite)
viper.SafeWriteConfig()
viper.SafeWriteConfigAs("/path/to/config.yaml")

// Programmatic changes
viper.Set("server.port", 9090)
viper.WriteConfig()
```

## Testing

```go
func TestWithConfig(t *testing.T) {
    // Reset viper state
    viper.Reset()

    // Set test values
    viper.Set("server.port", 9999)
    viper.Set("log.level", "debug")

    // Run test
    cfg, err := LoadConfig()
    assert.NoError(t, err)
    assert.Equal(t, 9999, cfg.Server.Port)
}

func TestWithConfigFile(t *testing.T) {
    // Create temp config file
    configContent := `
server:
  port: 8888
  host: localhost
`
    tmpFile, _ := os.CreateTemp("", "config-*.yaml")
    tmpFile.WriteString(configContent)
    tmpFile.Close()
    defer os.Remove(tmpFile.Name())

    // Load from temp file
    viper.Reset()
    viper.SetConfigFile(tmpFile.Name())
    err := viper.ReadInConfig()
    assert.NoError(t, err)
    assert.Equal(t, 8888, viper.GetInt("server.port"))
}
```

## Migration to Koanf

When to migrate:

- Need case-sensitive keys
- Binary size matters
- Want explicit precedence control
- Building containerized apps

```go
// Viper
viper.SetConfigFile("config.yaml")
viper.ReadInConfig()
viper.GetString("server.host")

// Koanf
k := koanf.New(".")
k.Load(file.Provider("config.yaml"), yaml.Parser())
k.String("server.host")
```

## Sources

- [Viper GitHub](https://github.com/spf13/viper)
- [Viper Documentation](https://github.com/spf13/viper#readme)
- Research: `.claude/.output/research/2026-01-05-213532-go-cli-best-practices/`
