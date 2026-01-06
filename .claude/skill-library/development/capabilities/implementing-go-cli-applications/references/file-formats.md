# Configuration File Format Comparison

Complete guide to choosing between YAML, TOML, JSON, and ENV formats.

## Format Comparison Matrix

| Format   | Readability | Complexity | Comments | Strictness     | Tooling    | Use Case            |
| -------- | ----------- | ---------- | -------- | -------------- | ---------- | ------------------- |
| **YAML** | ⭐⭐⭐⭐⭐  | ⭐⭐⭐     | ✅       | ⚠️ Ambiguous   | ⭐⭐⭐⭐   | Human-edited config |
| **TOML** | ⭐⭐⭐⭐    | ⭐⭐       | ✅       | ✅ Unambiguous | ⭐⭐⭐     | Rust/Go tooling     |
| **JSON** | ⭐⭐⭐      | ⭐         | ❌       | ✅ Strict      | ⭐⭐⭐⭐⭐ | API responses       |
| **ENV**  | ⭐⭐        | ⭐         | ❌       | ✅ Simple      | ⭐⭐⭐⭐⭐ | Secrets, 12-Factor  |

## YAML

### When to Use

- Human-edited application config
- Complex nested structures
- Need comments and anchors
- Multi-environment configs

### Pros

✅ Highly readable with indentation
✅ Supports comments
✅ Complex data structures (nested maps, lists)
✅ Anchors and aliases for reuse
✅ Multi-document files

### Cons

❌ Spec complexity (57 pages)
❌ Parsing ambiguities (strings vs numbers)
❌ Indentation errors
❌ Multiple implementations with subtle differences

### Example

```yaml
# Application configuration
server:
  host: localhost
  port: 8080
  timeout: 30s

database:
  url: postgres://localhost:5432/myapp
  max_connections: 100
  ssl_mode: require

logging:
  level: info
  format: json
  outputs:
    - stdout
    - /var/log/myapp.log

# Environment-specific overrides
environments:
  production: &prod
    server:
      host: 0.0.0.0
      port: 443
    logging:
      level: warn

  staging:
    <<: *prod # Inherit production settings
    logging:
      level: debug
```

### Go Libraries

```go
import "gopkg.in/yaml.v3"

// Parse
var config Config
data, _ := os.ReadFile("config.yaml")
yaml.Unmarshal(data, &config)

// Write
data, _ := yaml.Marshal(config)
os.WriteFile("config.yaml", data, 0644)
```

## TOML

### When to Use

- Rust/Go ecosystem tools
- Simple configuration structure
- Want unambiguous spec
- Cargo/Rust familiarity

### Pros

✅ Simple, unambiguous specification
✅ Supports comments
✅ Better error messages than YAML
✅ Types are clear (no ambiguity)

### Cons

❌ Less familiar than YAML/JSON
❌ Verbose for deeply nested structures
❌ Smaller ecosystem

### Example

```toml
# Application configuration
[server]
host = "localhost"
port = 8080
timeout = "30s"

[database]
url = "postgres://localhost:5432/myapp"
max_connections = 100
ssl_mode = "require"

[logging]
level = "info"
format = "json"
outputs = ["stdout", "/var/log/myapp.log"]

# Arrays of tables
[[environments]]
name = "production"
[environments.server]
host = "0.0.0.0"
port = 443

[[environments]]
name = "staging"
[environments.server]
host = "staging.example.com"
```

### Go Libraries

```go
import "github.com/BurntSushi/toml"

// Parse
var config Config
if _, err := toml.DecodeFile("config.toml", &config); err != nil {
    return err
}

// Write
f, _ := os.Create("config.toml")
encoder := toml.NewEncoder(f)
encoder.Encode(config)
```

## JSON

### When to Use

- API responses
- Machine-generated config
- Strict validation required
- Maximum tool compatibility

### Pros

✅ Universal support
✅ Strict validation
✅ Clear syntax errors
✅ Great tooling (jq, editors)

### Cons

❌ No comments (use JSON5/JSONC for comments)
❌ Verbose (trailing commas forbidden, quotes required)
❌ Not human-friendly for editing

### Example

```json
{
  "server": {
    "host": "localhost",
    "port": 8080,
    "timeout": "30s"
  },
  "database": {
    "url": "postgres://localhost:5432/myapp",
    "max_connections": 100,
    "ssl_mode": "require"
  },
  "logging": {
    "level": "info",
    "format": "json",
    "outputs": ["stdout", "/var/log/myapp.log"]
  }
}
```

### Go Libraries

```go
import "encoding/json"

// Parse
var config Config
data, _ := os.ReadFile("config.json")
json.Unmarshal(data, &config)

// Write (formatted)
data, _ := json.MarshalIndent(config, "", "  ")
os.WriteFile("config.json", data, 0644)
```

## ENV

### When to Use

- Secrets and credentials
- 12-Factor apps
- Kubernetes ConfigMaps/Secrets
- Docker containers
- CI/CD environments

### Pros

✅ Language/OS agnostic
✅ Can't be checked into version control
✅ Easy to change without code deploy
✅ Cloud-native standard

### Cons

❌ Flat structure only (no nesting)
❌ No type safety (all strings)
❌ Hard to version/diff
❌ No comments

### Example

```bash
# .env file (for local development only)
SERVER_HOST=localhost
SERVER_PORT=8080
SERVER_TIMEOUT=30s

DATABASE_URL=postgres://localhost:5432/myapp
DATABASE_MAX_CONNECTIONS=100

LOG_LEVEL=info
LOG_FORMAT=json
```

### Go Libraries

```go
// Manual
import "os"

port := os.Getenv("SERVER_PORT")
if port == "" {
    port = "8080"  // Default
}

// With godotenv (loads .env file)
import "github.com/joho/godotenv"

godotenv.Load()  // Loads .env into environment
port := os.Getenv("SERVER_PORT")

// With envconfig (struct tags)
import "github.com/kelseyhightower/envconfig"

type Config struct {
    ServerHost string `envconfig:"SERVER_HOST" default:"localhost"`
    ServerPort int    `envconfig:"SERVER_PORT" default:"8080"`
    LogLevel   string `envconfig:"LOG_LEVEL" default:"info"`
}

var config Config
envconfig.Process("", &config)

// With cleanenv
import "github.com/ilyakaznacheev/cleanenv"

type Config struct {
    Server struct {
        Host string `env:"SERVER_HOST" env-default:"localhost"`
        Port int    `env:"SERVER_PORT" env-default:"8080"`
    }
}

var config Config
cleanenv.ReadEnv(&config)
```

## Format Selection Decision Tree

```
Need secrets/credentials?
  └─ YES → ENV (12-Factor)

Machine-generated config?
  └─ YES → JSON

Human editing + complex nesting?
  ├─ YES + familiar with YAML → YAML
  └─ YES + want strict spec → TOML

Maximum compatibility needed?
  └─ YES → JSON
```

## Hybrid Approach (Recommended)

```go
// config.yaml - Application defaults
server:
  port: 8080
  timeout: 30s

// .env - Deployment-specific secrets (gitignored)
DATABASE_URL=postgres://...
API_KEY=secret123

// Environment variables - Production overrides
export SERVER_PORT=443
export LOG_LEVEL=warn
```

Load order:

```go
func LoadConfig() (*Config, error) {
    k := koanf.New(".")

    // 1. YAML defaults
    k.Load(file.Provider("config.yaml"), yaml.Parser())

    // 2. .env file (development)
    godotenv.Load()

    // 3. Environment variables (highest priority)
    k.Load(env.Provider("MYAPP_", ".", envKeyMap), nil)

    var cfg Config
    return &cfg, k.Unmarshal("", &cfg)
}
```

## Conversion Tools

```bash
# YAML to JSON
yq eval -o=json config.yaml > config.json

# JSON to YAML
yq eval -P config.json > config.yaml

# TOML to YAML
toml2yaml config.toml > config.yaml

# Go tool
go run github.com/mikefarah/yq/v4@latest eval -o=json config.yaml
```

## Sources

- [YAML Spec](https://yaml.org/spec/1.2.2/)
- [TOML Spec](https://toml.io/en/v1.0.0)
- [12 Factor Config](https://12factor.net/config)
- Research: `.claude/.output/research/2026-01-05-213532-go-cli-best-practices/`
