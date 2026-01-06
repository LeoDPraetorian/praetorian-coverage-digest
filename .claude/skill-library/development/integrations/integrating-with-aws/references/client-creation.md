# AWS SDK Client Creation Patterns

**Comprehensive guide for initializing AWS SDK clients in Lambda functions with optimal performance and thread safety.**

---

## Overview

AWS SDK client initialization is critical for Lambda performance. Clients initialized outside the handler function are reused across invocations (warm starts), reducing latency and cost.

**Key Principles:**

1. Initialize clients once per container lifecycle
2. Reuse HTTP connections across invocations
3. Ensure thread safety for concurrent scenarios
4. Embed tenant context for multi-tenant applications

---

## Pattern 1: Singleton with Mutex (Chariot Production)

**Best for:** Production applications requiring thread safety and lazy initialization.

**Source:** `modules/chariot/backend/pkg/cloud/service/services/dynamodb/dynamodb.go`

```go
package dynamodb

import (
    "sync"
    "github.com/aws/aws-sdk-go-v2/aws"
    "github.com/aws/aws-sdk-go-v2/service/dynamodb"
)

var dynamoDBClient *dynamodb.Client
var dynamoLock sync.Mutex

type DynamoDBTable struct {
    Client    *dynamodb.Client
    Username  string  // Multi-tenant context
    Partition string  // DynamoDB partition key
    User      *model.User
}

func NewDynamoDBTable(cfg aws.Config, username string) service.Table {
    dynamoLock.Lock()
    defer dynamoLock.Unlock()

    if dynamoDBClient == nil {
        dynamoDBClient = dynamodb.NewFromConfig(cfg)
    }

    return &DynamoDBTable{
        Client:    dynamoDBClient,
        Username:  username,
        Partition: username,
    }
}
```

**Advantages:**

- ✅ Thread-safe for concurrent Lambda invocations
- ✅ Lazy initialization (client created on first use)
- ✅ Single client instance per container
- ✅ Supports multi-tenant context

**Disadvantages:**

- ⚠️ Mutex adds minimal overhead on first call
- ⚠️ Slightly more complex than `init()` pattern

**When to Use:**

- Production applications with concurrent access patterns
- Multi-tenant systems requiring user context
- Applications needing lazy initialization

---

## Pattern 2: init() Function (Community Standard)

**Best for:** Simple applications where eager initialization is acceptable.

**Source:** GitHub community examples, AWS documentation

```go
package main

import (
    "context"
    "log"
    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/dynamodb"
    "github.com/aws/aws-sdk-go-v2/service/s3"
)

var (
    dynamoClient *dynamodb.Client
    s3Client     *s3.Client
)

func init() {
    cfg, err := config.LoadDefaultConfig(context.TODO(),
        config.WithRegion("us-east-1"),
    )
    if err != nil {
        log.Fatal(err)
    }

    dynamoClient = dynamodb.NewFromConfig(cfg)
    s3Client = s3.NewFromConfig(cfg)
}

func handler(ctx context.Context, event events.APIGatewayProxyRequest)
    (events.APIGatewayProxyResponse, error) {
    // Use pre-initialized clients
    resp, err := dynamoClient.GetItem(ctx, &dynamodb.GetItemInput{...})
    ...
}
```

**Advantages:**

- ✅ Simple and straightforward
- ✅ Clients initialized before first invocation
- ✅ No mutex overhead
- ✅ Standard Go pattern

**Disadvantages:**

- ⚠️ No thread safety guarantees (not typically needed for Lambda)
- ⚠️ Initialization happens even if clients not used
- ⚠️ Fatal error stops Lambda container

**When to Use:**

- Simple single-tenant applications
- Lambda functions where all clients are always needed
- Applications without concurrent access requirements

---

## Pattern 3: Global Variable with Manual Init

**Best for:** Applications needing explicit control over initialization timing.

```go
package main

import (
    "context"
    "fmt"
    "sync"
    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/s3"
)

var (
    s3Client *s3.Client
    initOnce sync.Once
    initErr  error
)

func getS3Client(ctx context.Context) (*s3.Client, error) {
    initOnce.Do(func() {
        cfg, err := config.LoadDefaultConfig(ctx)
        if err != nil {
            initErr = fmt.Errorf("failed to load config: %w", err)
            return
        }
        s3Client = s3.NewFromConfig(cfg)
    })

    if initErr != nil {
        return nil, initErr
    }
    return s3Client, nil
}

func handler(ctx context.Context, event events.S3Event) error {
    client, err := getS3Client(ctx)
    if err != nil {
        return err
    }

    // Use client
    resp, err := client.GetObject(ctx, &s3.GetObjectInput{...})
    ...
}
```

**Advantages:**

- ✅ Thread-safe via `sync.Once`
- ✅ Error handling during initialization
- ✅ Explicit control over initialization
- ✅ Graceful error propagation

**Disadvantages:**

- ⚠️ More boilerplate than other patterns
- ⚠️ Error checking required on every call

**When to Use:**

- Applications needing robust error handling during init
- Systems where initialization might fail and retry is needed
- Complex initialization scenarios

---

## Configuration Management

### Loading AWS Config

**Basic configuration:**

```go
cfg, err := config.LoadDefaultConfig(context.TODO())
```

**With region override:**

```go
cfg, err := config.LoadDefaultConfig(context.TODO(),
    config.WithRegion("us-east-1"),
)
```

**With custom HTTP client:**

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

cfg, err := config.LoadDefaultConfig(context.TODO(),
    config.WithHTTPClient(customHTTPClient),
)
```

**With retry configuration:**

```go
import "github.com/aws/aws-sdk-go-v2/aws/retry"

cfg, err := config.LoadDefaultConfig(context.TODO(),
    config.WithRetryer(func() aws.Retryer {
        return retry.AddWithMaxAttempts(retry.NewStandard(), 5)
    }),
)
```

### Credential Resolution

AWS SDK v2 resolves credentials in this order:

1. **Environment variables:**
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_SESSION_TOKEN` (optional)

2. **Shared credentials file:** `~/.aws/credentials`

3. **Shared config file:** `~/.aws/config`

4. **IAM role** (Lambda execution role, ECS task role, EC2 instance profile)

**Lambda Best Practice:** Use IAM execution roles - no explicit credentials needed.

---

## Multi-Service Client Management

**Pattern for multiple services:**

```go
type AWSClients struct {
    DynamoDB *dynamodb.Client
    S3       *s3.Client
    SQS      *sqs.Client
}

var (
    awsClients *AWSClients
    clientLock sync.Mutex
)

func GetClients(cfg aws.Config) *AWSClients {
    clientLock.Lock()
    defer clientLock.Unlock()

    if awsClients == nil {
        awsClients = &AWSClients{
            DynamoDB: dynamodb.NewFromConfig(cfg),
            S3:       s3.NewFromConfig(cfg),
            SQS:      sqs.NewFromConfig(cfg),
        }
    }

    return awsClients
}
```

---

## Performance Implications

### Cold Start Impact

| Pattern         | Cold Start Time | Warm Start Time |
| --------------- | --------------- | --------------- |
| No client reuse | ~500ms          | ~500ms          |
| init() reuse    | ~500ms (first)  | ~50ms           |
| Singleton reuse | ~500ms (first)  | ~50ms           |

**Key Insight:** Client reuse reduces warm start latency by ~90%

### Memory Usage

- Each AWS service client: ~2-5 MB
- HTTP connection pool: ~1-2 MB per service
- Total for 3 services: ~10-20 MB

**Lambda Recommendation:** 512 MB memory minimum for applications using multiple AWS services

---

## Common Pitfalls

### ❌ Anti-Pattern: Creating Client Per Invocation

```go
// DON'T DO THIS
func handler(ctx context.Context, event events.APIGatewayProxyRequest)
    (events.APIGatewayProxyResponse, error) {
    cfg, _ := config.LoadDefaultConfig(ctx)
    client := dynamodb.NewFromConfig(cfg)  // ❌ New client every time

    resp, err := client.GetItem(ctx, &dynamodb.GetItemInput{...})
    ...
}
```

**Why It's Bad:**

- Creates new HTTP connection pool every invocation
- ~10x slower than reusing clients
- Increased memory allocation

### ❌ Anti-Pattern: Global Config Without Error Handling

```go
// DON'T DO THIS
var cfg, _ = config.LoadDefaultConfig(context.TODO())  // ❌ Ignoring error
var client = dynamodb.NewFromConfig(cfg)
```

**Why It's Bad:**

- Silent failures if config loading fails
- Lambda container starts with broken client
- No way to recover or log error

### ✅ Correct Pattern

```go
var client *dynamodb.Client

func init() {
    cfg, err := config.LoadDefaultConfig(context.TODO())
    if err != nil {
        log.Fatalf("unable to load SDK config: %v", err)
    }
    client = dynamodb.NewFromConfig(cfg)
}
```

---

## Testing Patterns

### Mocking AWS Clients

**Interface-based approach:**

```go
type DynamoDBAPI interface {
    GetItem(ctx context.Context, params *dynamodb.GetItemInput, optFns ...func(*dynamodb.Options)) (*dynamodb.GetItemOutput, error)
    PutItem(ctx context.Context, params *dynamodb.PutItemInput, optFns ...func(*dynamodb.Options)) (*dynamodb.PutItemOutput, error)
}

type Service struct {
    dynamo DynamoDBAPI
}

// In tests, provide mock implementation
type mockDynamoDB struct {
    getItemFunc func(ctx context.Context, params *dynamodb.GetItemInput, optFns ...func(*dynamodb.Options)) (*dynamodb.GetItemOutput, error)
}

func (m *mockDynamoDB) GetItem(ctx context.Context, params *dynamodb.GetItemInput, optFns ...func(*dynamodb.Options)) (*dynamodb.GetItemOutput, error) {
    return m.getItemFunc(ctx, params, optFns...)
}
```

---

## Best Practices Summary

1. ✅ **Initialize clients outside handler** using `init()` or singleton pattern
2. ✅ **Use mutex for thread safety** in concurrent scenarios
3. ✅ **Handle initialization errors** gracefully with logging
4. ✅ **Reuse clients across invocations** for performance
5. ✅ **Use IAM roles** for Lambda credentials (no hardcoded keys)
6. ✅ **Configure keep-alive** for long-lived containers
7. ✅ **Test with interfaces** for mockability
8. ❌ **Never create clients per invocation** - performance killer
9. ❌ **Never ignore initialization errors** - leads to runtime failures
10. ❌ **Never hardcode credentials** - use IAM roles or environment

---

## Related Patterns

- [Error Handling](error-handling.md) - Handling AWS SDK errors
- [Chariot Patterns](chariot-patterns.md) - Multi-tenant client management
- [Performance Optimization](performance-optimization.md) - Lambda cold start reduction

---

**Research Sources:**

- Chariot codebase: `modules/chariot/backend/pkg/cloud/service/`
- GitHub: aws/aws-sdk-go-v2
- AWS Official Documentation: Lambda best practices
