# AWS Lambda Performance Optimization

**Production patterns for minimizing Lambda cold starts and execution time with AWS SDK Go v2.**

---

## Cold Start Optimization

### Client Reuse (Most Important)

**Impact:** ~90% reduction in warm start latency

```go
var dynamoClient *dynamodb.Client

func init() {
    cfg, _ := config.LoadDefaultConfig(context.TODO())
    dynamoClient = dynamodb.NewFromConfig(cfg)
}

// Cold start: ~500ms
// Warm start: ~50ms (10x faster)
```

### Deployment Package Size

**Target:** < 10 MB for optimal cold start

```bash
# Build optimized binary
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o bootstrap main.go

# Result: 8-12 MB (good)
# vs 50+ MB unoptimized (slow)
```

**Remove unused dependencies:**

```bash
go mod tidy
```

### Runtime Selection

**Use `provided.al2023` or `provided.al2` instead of `go1.x`:**

- Smaller binaries
- ARM64 support (Graviton2 - 20% cost savings)
- Slightly faster invoke times

```yaml
# SAM template
Runtime: provided.al2023
Architectures:
  - arm64
```

### Minimize Imports

```go
// ❌ BAD: Import entire SDK
import "github.com/aws/aws-sdk-go-v2/aws"

// ✅ GOOD: Import only needed services
import "github.com/aws/aws-sdk-go-v2/service/dynamodb"
import "github.com/aws/aws-sdk-go-v2/service/s3"
```

---

## Connection Management

### Keep-Alive Configuration

```go
import (
    "net"
    "net/http"
    "time"
)

customHTTPClient := &http.Client{
    Transport: &http.Transport{
        MaxIdleConns:        100,
        MaxIdleConnsPerHost: 10,
        IdleConnTimeout:     90 * time.Second,
        DialContext: (&net.Dialer{
            Timeout:   30 * time.Second,
            KeepAlive: 30 * time.Second,
        }).DialContext,
    },
}

cfg, _ := config.LoadDefaultConfig(context.TODO(),
    config.WithHTTPClient(customHTTPClient))
```

**When to Use:** High-throughput applications (> 1000 req/s)

---

## Memory Optimization

### Memory Allocation Strategy

| Memory  | Use Case          | Cost    | Performance |
| ------- | ----------------- | ------- | ----------- |
| 128 MB  | Simple CRUD       | Lowest  | Slow        |
| 512 MB  | Standard APIs     | Optimal | Good        |
| 1024 MB | Heavy processing  | Medium  | Fast        |
| 3008 MB | Compute-intensive | Highest | Fastest     |

**Find optimal:** Test with different memory settings

```bash
# Load test with different memory configurations
hey -n 1000 -c 10 https://api.example.com/endpoint
```

### Caching in /tmp

**Pattern:** Cache static configuration

```go
const cachePath = "/tmp/config.json"

func loadConfig() (*Config, error) {
    if data, err := os.ReadFile(cachePath); err == nil {
        var config Config
        json.Unmarshal(data, &config)
        return &config, nil
    }

    config, _ := fetchFromS3()
    data, _ := json.Marshal(config)
    os.WriteFile(cachePath, data, 0644)
    return config, nil
}
```

**Limits:** 512 MB default (configurable to 10 GB)

---

## Avoid Lambda Layers for Go

**AWS Recommendation:** DO NOT use Lambda Layers for Go dependencies

**Why:** Layers force manual assembly loading, **increasing cold start time**

**Alternative:** Include dependencies in deployment package

---

## Best Practices

1. ✅ Initialize clients in `init()` or global scope
2. ✅ Use `provided.al2023` runtime
3. ✅ Minimize deployment package size
4. ✅ Import only needed AWS services
5. ✅ Configure keep-alive for high throughput
6. ✅ Cache static data in /tmp
7. ✅ Test memory allocation (512 MB baseline)
8. ❌ Don't use Lambda Layers for Go
9. ❌ Don't create clients per invocation
10. ❌ Don't over-allocate memory (cost)

---

**Sources:**

- AWS Lambda Best Practices: https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html
- Chariot production metrics: modules/chariot/backend/
