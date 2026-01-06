# Koanf Configuration Management

Complete patterns for Koanf - lightweight, modular configuration library.

## Why Koanf

| Feature                 | Benefit                       |
| ----------------------- | ----------------------------- |
| **Case-sensitive**      | Respects YAML/JSON/TOML specs |
| **Modular**             | Install only what you need    |
| **50% fewer deps**      | Smaller than Viper            |
| **2.9 MB binaries**     | vs Viper's ~12 MB             |
| **Explicit precedence** | You control load order        |

## Basic Usage

```go
package config

import (
    "strings"

    "github.com/knadh/koanf/v2"
    "github.com/knadh/koanf/parsers/yaml"
    "github.com/knadh/koanf/providers/env"
    "github.com/knadh/koanf/providers/file"
)

var k = koanf.New(".")

func Load(configPath string) error {
    // Load YAML config file
    if err := k.Load(file.Provider(configPath), yaml.Parser()); err != nil {
        return err
    }

    // Load environment variables with MYAPP_ prefix
    if err := k.Load(env.Provider("MYAPP_", ".", func(s string) string {
        return strings.Replace(
            strings.ToLower(strings.TrimPrefix(s, "MYAPP_")),
            "_", ".", -1)
    }), nil); err != nil {
        return err
    }

    return nil
}

// Access values
func GetString(key string) string {
    return k.String(key)
}

func GetInt(key string) int {
    return k.Int(key)
}

func GetDuration(key string) time.Duration {
    return k.Duration(key)
}
```

## Providers

### File Provider

```go
import (
    "github.com/knadh/koanf/providers/file"
    "github.com/knadh/koanf/parsers/yaml"
    "github.com/knadh/koanf/parsers/json"
    "github.com/knadh/koanf/parsers/toml"
)

// YAML
k.Load(file.Provider("config.yaml"), yaml.Parser())

// JSON
k.Load(file.Provider("config.json"), json.Parser())

// TOML
k.Load(file.Provider("config.toml"), toml.Parser())
```

### Environment Provider

```go
import "github.com/knadh/koanf/providers/env"

// Basic: MYAPP_DB_HOST -> db.host
k.Load(env.Provider("MYAPP_", ".", func(s string) string {
    return strings.Replace(
        strings.ToLower(strings.TrimPrefix(s, "MYAPP_")),
        "_", ".", -1)
}), nil)

// Custom transform: MYAPP_DATABASE__URL -> database.url
k.Load(env.Provider("MYAPP_", ".", func(s string) string {
    key := strings.TrimPrefix(s, "MYAPP_")
    key = strings.Replace(key, "__", ".", -1)  // Double underscore = dot
    return strings.ToLower(key)
}), nil)
```

### Confmap Provider (In-Memory)

```go
import "github.com/knadh/koanf/providers/confmap"

// Set defaults
k.Load(confmap.Provider(map[string]interface{}{
    "server.port":     8080,
    "server.timeout":  "30s",
    "log.level":       "info",
}, "."), nil)
```

### Struct Provider

```go
import "github.com/knadh/koanf/providers/structs"

type Defaults struct {
    Server struct {
        Port    int           `koanf:"port"`
        Timeout time.Duration `koanf:"timeout"`
    } `koanf:"server"`
}

defaults := Defaults{}
defaults.Server.Port = 8080
defaults.Server.Timeout = 30 * time.Second

k.Load(structs.Provider(defaults, "koanf"), nil)
```

## Unmarshaling

### Into Struct

```go
type Config struct {
    Server struct {
        Host    string        `koanf:"host"`
        Port    int           `koanf:"port"`
        Timeout time.Duration `koanf:"timeout"`
    } `koanf:"server"`

    Database struct {
        URL         string `koanf:"url"`
        MaxConns    int    `koanf:"max_conns"`
        MaxIdleTime string `koanf:"max_idle_time"`
    } `koanf:"database"`

    LogLevel string `koanf:"log_level"`
}

var cfg Config
if err := k.Unmarshal("", &cfg); err != nil {
    return err
}

// Unmarshal subsection
var serverCfg struct {
    Host string `koanf:"host"`
    Port int    `koanf:"port"`
}
if err := k.Unmarshal("server", &serverCfg); err != nil {
    return err
}
```

### With Validation

```go
import "github.com/go-playground/validator/v10"

type Config struct {
    Server struct {
        Host    string        `koanf:"host" validate:"required"`
        Port    int           `koanf:"port" validate:"required,min=1,max=65535"`
        Timeout time.Duration `koanf:"timeout" validate:"required,min=1s"`
    } `koanf:"server"`

    APIKey string `koanf:"api_key" validate:"required,min=32"`
}

func LoadAndValidate(path string) (*Config, error) {
    if err := k.Load(file.Provider(path), yaml.Parser()); err != nil {
        return nil, err
    }

    var cfg Config
    if err := k.Unmarshal("", &cfg); err != nil {
        return nil, err
    }

    validate := validator.New()
    if err := validate.Struct(&cfg); err != nil {
        return nil, fmt.Errorf("config validation failed: %w", err)
    }

    return &cfg, nil
}
```

## Hot Reload

### File Watching

```go
import (
    "github.com/knadh/koanf/providers/file"
    "github.com/fsnotify/fsnotify"
)

func WatchConfig(path string, onChange func()) error {
    watcher, err := fsnotify.NewWatcher()
    if err != nil {
        return err
    }

    go func() {
        for {
            select {
            case event := <-watcher.Events:
                if event.Op&fsnotify.Write == fsnotify.Write {
                    // Reload config
                    if err := k.Load(file.Provider(path), yaml.Parser()); err != nil {
                        log.Printf("Error reloading config: %v", err)
                        continue
                    }
                    onChange()
                }
            case err := <-watcher.Errors:
                log.Printf("Watcher error: %v", err)
            }
        }
    }()

    return watcher.Add(path)
}
```

### Atomic Updates

```go
import "sync/atomic"

type AtomicConfig struct {
    value atomic.Value
}

func (ac *AtomicConfig) Load() *Config {
    return ac.value.Load().(*Config)
}

func (ac *AtomicConfig) Store(cfg *Config) {
    ac.value.Store(cfg)
}

var atomicCfg AtomicConfig

func ReloadConfig(path string) error {
    k := koanf.New(".")
    if err := k.Load(file.Provider(path), yaml.Parser()); err != nil {
        return err
    }

    var newCfg Config
    if err := k.Unmarshal("", &newCfg); err != nil {
        return err
    }

    // Validate before swapping
    if err := validate.Struct(&newCfg); err != nil {
        return err
    }

    atomicCfg.Store(&newCfg)
    return nil
}

// Usage: cfg := atomicCfg.Load()
```

## Merging Multiple Sources

```go
func LoadConfig() (*Config, error) {
    k := koanf.New(".")

    // 1. Defaults (lowest priority)
    k.Load(confmap.Provider(map[string]interface{}{
        "server.port":    8080,
        "server.timeout": "30s",
        "log.level":      "info",
    }, "."), nil)

    // 2. System config
    k.Load(file.Provider("/etc/myapp/config.yaml"), yaml.Parser())

    // 3. User config
    home, _ := os.UserHomeDir()
    k.Load(file.Provider(filepath.Join(home, ".myapp", "config.yaml")), yaml.Parser())

    // 4. Local config
    k.Load(file.Provider("config.yaml"), yaml.Parser())

    // 5. Environment variables (highest for secrets)
    k.Load(env.Provider("MYAPP_", ".", func(s string) string {
        return strings.Replace(
            strings.ToLower(strings.TrimPrefix(s, "MYAPP_")),
            "_", ".", -1)
    }), nil)

    var cfg Config
    return &cfg, k.Unmarshal("", &cfg)
}
```

## Comparison with Viper

| Feature          | Koanf             | Viper                |
| ---------------- | ----------------- | -------------------- |
| Case sensitivity | ✅ Preserved      | ❌ Forces lowercase  |
| Binary size      | ~2.9 MB           | ~12 MB               |
| Dependencies     | Modular           | All included         |
| Thread safety    | Manual            | Not thread-safe      |
| Hot reload       | Provider-specific | Built-in WatchConfig |
| Remote config    | Via providers     | Built-in             |

## Migration from Viper

```go
// Viper
viper.SetConfigName("config")
viper.AddConfigPath(".")
viper.ReadInConfig()
port := viper.GetInt("server.port")

// Koanf equivalent
k := koanf.New(".")
k.Load(file.Provider("config.yaml"), yaml.Parser())
port := k.Int("server.port")

// Viper env binding
viper.SetEnvPrefix("MYAPP")
viper.AutomaticEnv()

// Koanf equivalent
k.Load(env.Provider("MYAPP_", ".", func(s string) string {
    return strings.Replace(
        strings.ToLower(strings.TrimPrefix(s, "MYAPP_")),
        "_", ".", -1)
}), nil)
```

## Sources

- [Koanf GitHub](https://github.com/knadh/koanf)
- [Koanf vs Viper](https://github.com/knadh/koanf/wiki/Comparison-with-spf13-viper)
- Research: `.claude/.output/research/2026-01-05-213532-go-cli-best-practices/`
