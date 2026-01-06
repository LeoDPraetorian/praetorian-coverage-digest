# GCP Local Development Setup

**Source:** Research synthesis (Confidence: 0.92)

## Emulator-First Development

Use official GCP emulators to reduce cloud costs and improve development iteration speed.

---

## Available Emulators

| Service           | Emulator  | Installation                                                        | Environment Variable                          |
| ----------------- | --------- | ------------------------------------------------------------------- | --------------------------------------------- |
| **Firestore**     | Official  | `gcloud components install cloud-firestore-emulator`                | `FIRESTORE_EMULATOR_HOST=localhost:8080`      |
| **Pub/Sub**       | Official  | `gcloud components install pubsub-emulator`                         | `PUBSUB_EMULATOR_HOST=localhost:8085`         |
| **Datastore**     | Official  | `gcloud components install cloud-datastore-emulator`                | `DATASTORE_EMULATOR_HOST=localhost:8081`      |
| **Bigtable**      | Official  | `gcloud components install cbt bigtable-emulator`                   | `BIGTABLE_EMULATOR_HOST=localhost:8086`       |
| **Spanner**       | Official  | `gcloud components install cloud-spanner-emulator`                  | `SPANNER_EMULATOR_HOST=localhost:9010`        |
| **Cloud Storage** | Community | [fsouza/fake-gcs-server](https://github.com/fsouza/fake-gcs-server) | `STORAGE_EMULATOR_HOST=http://localhost:4443` |

---

## Docker Compose Setup (Team Consistency)

```yaml
# docker-compose.yml
version: "3.8"

services:
  # Firestore Emulator
  firestore:
    image: google/cloud-sdk:latest
    command: gcloud emulators firestore start --host-port=0.0.0.0:8080
    ports:
      - "8080:8080"

  # Pub/Sub Emulator
  pubsub:
    image: google/cloud-sdk:latest
    command: gcloud beta emulators pubsub start --host-port=0.0.0.0:8085
    ports:
      - "8085:8085"

  # Cloud Storage Emulator (community)
  storage:
    image: fsouza/fake-gcs-server:latest
    command: -scheme http -port 4443
    ports:
      - "4443:4443"
    volumes:
      - ./fake-gcs-data:/data

  # Your application
  app:
    build: .
    environment:
      - FIRESTORE_EMULATOR_HOST=firestore:8080
      - PUBSUB_EMULATOR_HOST=pubsub:8085
      - STORAGE_EMULATOR_HOST=http://storage:4443
      - GOOGLE_CLOUD_PROJECT=test-project
    depends_on:
      - firestore
      - pubsub
      - storage
```

**Usage:**

```bash
# Start emulators
docker-compose up -d

# Run application with emulator endpoints
export FIRESTORE_EMULATOR_HOST=localhost:8080
export PUBSUB_EMULATOR_HOST=localhost:8085
export STORAGE_EMULATOR_HOST=http://localhost:4443
export GOOGLE_CLOUD_PROJECT=test-project

go run main.go

# Stop emulators
docker-compose down
```

---

## ADC Configuration for Local Development

### Option 1: User Credentials (Simple)

```bash
# Authenticate with your Google account
gcloud auth application-default login

# Credentials stored at:
# ~/.config/gcloud/application_default_credentials.json

# SDKs automatically discover these credentials
```

**Go Example:**

```go
import (
    "context"
    "cloud.google.com/go/storage"
)

func main() {
    ctx := context.Background()

    // ADC automatically discovers user credentials
    client, err := storage.NewClient(ctx)
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    // Use client
}
```

### Option 2: Service Account Impersonation (Recommended)

**Why:** No persistent keys, matches production identity, short-lived tokens

```bash
# Configure impersonation (no key download needed)
gcloud auth application-default login \
  --impersonate-service-account=dev-sa@PROJECT_ID.iam.gserviceaccount.com

# Or set globally
gcloud config set auth/impersonate_service_account \
  dev-sa@PROJECT_ID.iam.gserviceaccount.com
```

**Required IAM Permission:**

```bash
# Grant your user account permission to impersonate
gcloud iam service-accounts add-iam-policy-binding \
  dev-sa@PROJECT_ID.iam.gserviceaccount.com \
  --member="user:your-email@example.com" \
  --role="roles/iam.serviceAccountTokenCreator"
```

---

## Emulator Usage Patterns

### Firestore Emulator

```bash
# Start emulator
gcloud emulators firestore start --host-port=localhost:8080

# In another terminal, set environment variable
export FIRESTORE_EMULATOR_HOST=localhost:8080

# Go application automatically connects to emulator
```

**Go Example:**

```go
import (
    "context"
    "cloud.google.com/go/firestore"
)

func main() {
    ctx := context.Background()

    // Automatically connects to emulator if FIRESTORE_EMULATOR_HOST is set
    client, err := firestore.NewClient(ctx, "test-project")
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    // Use client - all data is local
}
```

### Pub/Sub Emulator

```bash
# Start emulator
gcloud beta emulators pubsub start --host-port=localhost:8085

# Set environment variable
export PUBSUB_EMULATOR_HOST=localhost:8085
```

**Go Example:**

```go
import (
    "context"
    "cloud.google.com/go/pubsub"
)

func main() {
    ctx := context.Background()

    // Automatically connects to emulator if PUBSUB_EMULATOR_HOST is set
    client, err := pubsub.NewClient(ctx, "test-project")
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    // Create topic (local only)
    topic, err := client.CreateTopic(ctx, "my-topic")
    if err != nil {
        log.Fatal(err)
    }

    // Publish message
    result := topic.Publish(ctx, &pubsub.Message{
        Data: []byte("Hello from emulator"),
    })
    msgID, err := result.Get(ctx)
    if err != nil {
        log.Fatal(err)
    }
    log.Printf("Published message ID: %s", msgID)
}
```

### Cloud Storage Emulator (fake-gcs-server)

```bash
# Run Docker container
docker run -d -p 4443:4443 fsouza/fake-gcs-server:latest -scheme http

# Set environment variable
export STORAGE_EMULATOR_HOST=http://localhost:4443
```

**Go Example:**

```go
import (
    "context"
    "cloud.google.com/go/storage"
    "google.golang.org/api/option"
)

func main() {
    ctx := context.Background()

    // Connect to emulator explicitly
    client, err := storage.NewClient(ctx,
        option.WithEndpoint("http://localhost:4443/storage/v1/"),
    )
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    // Create bucket (local only)
    bucket := client.Bucket("test-bucket")
    if err := bucket.Create(ctx, "test-project", nil); err != nil {
        log.Fatal(err)
    }

    // Upload object
    wc := bucket.Object("test-file.txt").NewWriter(ctx)
    if _, err := wc.Write([]byte("Hello from emulator")); err != nil {
        log.Fatal(err)
    }
    if err := wc.Close(); err != nil {
        log.Fatal(err)
    }
}
```

---

## Testcontainers Integration (CI/CD)

**Automatic emulator provisioning for integration tests**

```go
import (
    "context"
    "testing"
    "github.com/testcontainers/testcontainers-go"
    "github.com/testcontainers/testcontainers-go/wait"
)

func TestWithPubSubEmulator(t *testing.T) {
    ctx := context.Background()

    // Start Pub/Sub emulator container
    req := testcontainers.ContainerRequest{
        Image:        "google/cloud-sdk:latest",
        ExposedPorts: []string{"8085/tcp"},
        Cmd:          []string{"gcloud", "beta", "emulators", "pubsub", "start", "--host-port=0.0.0.0:8085"},
        WaitingFor:   wait.ForLog("Server started"),
    }

    container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
        ContainerRequest: req,
        Started:          true,
    })
    if err != nil {
        t.Fatal(err)
    }
    defer container.Terminate(ctx)

    // Get mapped port
    host, err := container.Host(ctx)
    if err != nil {
        t.Fatal(err)
    }
    port, err := container.MappedPort(ctx, "8085")
    if err != nil {
        t.Fatal(err)
    }

    // Set emulator host for client
    emulatorHost := fmt.Sprintf("%s:%s", host, port.Port())
    t.Setenv("PUBSUB_EMULATOR_HOST", emulatorHost)

    // Run tests with emulator
    // Your test code here
}
```

---

## Emulator Limitations

| Limitation                       | Impact                                              | Workaround                                     |
| -------------------------------- | --------------------------------------------------- | ---------------------------------------------- |
| **No quota enforcement**         | Can't test rate limits                              | Use staging environment for quota tests        |
| **Different latency**            | Local is faster than production                     | Add artificial delays in tests                 |
| **Missing features**             | Some APIs not implemented (e.g., Storage Lifecycle) | Document unsupported features, test in staging |
| **No IAM enforcement**           | All operations succeed                              | Test IAM separately with real GCP              |
| **No cross-service integration** | Can't test Eventarc triggers                        | Use real GCP for integration tests             |

---

## Environment-Specific Configuration

### Development (Emulators)

```bash
# .env.development
FIRESTORE_EMULATOR_HOST=localhost:8080
PUBSUB_EMULATOR_HOST=localhost:8085
STORAGE_EMULATOR_HOST=http://localhost:4443
GOOGLE_CLOUD_PROJECT=test-project
```

### Staging (Real GCP, Dev Project)

```bash
# .env.staging
# No emulator variables - use real GCP
GOOGLE_CLOUD_PROJECT=my-project-staging

# Use ADC with impersonation
# gcloud config set auth/impersonate_service_account staging-sa@my-project-staging.iam.gserviceaccount.com
```

### Production (Real GCP, Prod Project)

```bash
# .env.production
# No credentials needed - use attached service account (ADC implicit)
GOOGLE_CLOUD_PROJECT=my-project-prod
```

**Go Configuration Pattern:**

```go
import (
    "os"
    "cloud.google.com/go/storage"
    "google.golang.org/api/option"
)

func newStorageClient(ctx context.Context) (*storage.Client, error) {
    if emulatorHost := os.Getenv("STORAGE_EMULATOR_HOST"); emulatorHost != "" {
        // Development mode - use emulator
        return storage.NewClient(ctx,
            option.WithEndpoint(emulatorHost+"/storage/v1/"),
        )
    }

    // Staging/Production - use ADC (attached service account)
    return storage.NewClient(ctx)
}
```

---

## Best Practices

- ✅ Use Docker Compose for team consistency (all devs use same emulator versions)
- ✅ Use Testcontainers for CI/CD automatic provisioning
- ✅ Use service account impersonation for local dev (no persistent keys)
- ✅ Document emulator limitations (what can't be tested locally)
- ✅ Test IAM and quota limits in staging/production (emulators don't enforce)
- ✅ Use environment-specific configuration (emulators for dev, real GCP for staging/prod)
- ✅ Clear emulator data between test runs (`docker-compose down -v`)

---

## External Resources

- [Firestore Emulator](https://cloud.google.com/firestore/docs/emulator)
- [Pub/Sub Emulator](https://cloud.google.com/pubsub/docs/emulator)
- [fake-gcs-server](https://github.com/fsouza/fake-gcs-server)
- [Testcontainers](https://testcontainers.com/)
- [ADC Documentation](https://cloud.google.com/docs/authentication/application-default-credentials)
