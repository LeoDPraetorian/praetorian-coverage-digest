# GCP Testing Patterns

**Source:** Research synthesis (Confidence: 0.92)

## Three-Tiered Testing Strategy (Google's Recommendation)

| Test Type             | Percentage | Tool                   | Speed           | Fidelity                  |
| --------------------- | ---------- | ---------------------- | --------------- | ------------------------- |
| **Fake gRPC servers** | 95%        | In-memory mocks        | Fast (~ms)      | Low (mocked behavior)     |
| **Emulators**         | 4%         | Official GCP emulators | Medium (~100ms) | High (missing quotas)     |
| **Real GCP**          | 1%         | Staging/production     | Slow (~1s)      | Highest (production-like) |

---

## Emulator-Based Integration Tests

### Docker Compose Setup

```yaml
# docker-compose.test.yml
version: "3.8"
services:
  firestore:
    image: google/cloud-sdk:latest
    command: gcloud emulators firestore start --host-port=0.0.0.0:8080
    ports:
      - "8080:8080"

  pubsub:
    image: google/cloud-sdk:latest
    command: gcloud beta emulators pubsub start --host-port=0.0.0.0:8085
    ports:
      - "8085:8085"

  fake-gcs:
    image: fsouza/fake-gcs-server:latest
    command: -scheme http -port 4443
    ports:
      - "4443:4443"
```

### Go Integration Test

```go
func TestWithEmulators(t *testing.T) {
    os.Setenv("FIRESTORE_EMULATOR_HOST", "localhost:8080")
    os.Setenv("PUBSUB_EMULATOR_HOST", "localhost:8085")
    os.Setenv("STORAGE_EMULATOR_HOST", "http://localhost:4443")

    ctx := context.Background()

    // Test with emulators
    firestoreClient, err := firestore.NewClient(ctx, "test-project")
    require.NoError(t, err)
    defer firestoreClient.Close()

    // Write data
    _, err = firestoreClient.Collection("users").Doc("test-user").Set(ctx, map[string]interface{}{
        "name": "Test User",
    })
    require.NoError(t, err)

    // Read data
    doc, err := firestoreClient.Collection("users").Doc("test-user").Get(ctx)
    require.NoError(t, err)

    var data map[string]interface{}
    err = doc.DataTo(&data)
    require.NoError(t, err)
    assert.Equal(t, "Test User", data["name"])
}
```

---

## Testcontainers (CI/CD Automation)

```go
import (
    "github.com/testcontainers/testcontainers-go"
    "github.com/testcontainers/testcontainers-go/wait"
)

func TestWithTestcontainers(t *testing.T) {
    ctx := context.Background()

    // Start Pub/Sub emulator
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
    require.NoError(t, err)
    defer container.Terminate(ctx)

    // Get mapped port
    host, err := container.Host(ctx)
    require.NoError(t, err)

    port, err := container.MappedPort(ctx, "8085")
    require.NoError(t, err)

    // Set emulator host
    emulatorHost := fmt.Sprintf("%s:%s", host, port.Port())
    os.Setenv("PUBSUB_EMULATOR_HOST", emulatorHost)

    // Run tests
    // ...
}
```

---

## Unit Testing with Fake gRPC Servers

### Interface-Based Dependency Injection

```go
// Define interface
type StorageClient interface {
    UploadObject(ctx context.Context, bucket, object string, data []byte) error
}

// Real implementation
type realStorageClient struct {
    client *storage.Client
}

func (r *realStorageClient) UploadObject(ctx context.Context, bucket, object string, data []byte) error {
    wc := r.client.Bucket(bucket).Object(object).NewWriter(ctx)
    if _, err := wc.Write(data); err != nil {
        return err
    }
    return wc.Close()
}

// Mock implementation for tests
type mockStorageClient struct {
    uploadFunc func(ctx context.Context, bucket, object string, data []byte) error
}

func (m *mockStorageClient) UploadObject(ctx context.Context, bucket, object string, data []byte) error {
    if m.uploadFunc != nil {
        return m.uploadFunc(ctx, bucket, object, data)
    }
    return nil
}

// Test
func TestUpload(t *testing.T) {
    mock := &mockStorageClient{
        uploadFunc: func(ctx context.Context, bucket, object string, data []byte) error {
            assert.Equal(t, "test-bucket", bucket)
            assert.Equal(t, "test-object", object)
            return nil
        },
    }

    // Test code using mock
    err := someFunction(mock)
    assert.NoError(t, err)
}
```

---

## Emulator Limitations

| Feature                    | Emulator Support      | Workaround                     |
| -------------------------- | --------------------- | ------------------------------ |
| **Quota enforcement**      | ❌ No                 | Test in staging                |
| **IAM enforcement**        | ❌ No                 | Test in staging                |
| **Latency profiles**       | ❌ Different (faster) | Add artificial delays in tests |
| **Storage Lifecycle**      | ❌ Not implemented    | Test in staging                |
| **Cross-service triggers** | ❌ No Eventarc        | Test in staging                |

---

## Best Practices

### Unit Tests (95%)

- ✅ Use interface-based mocking
- ✅ Test business logic, not GCP SDK
- ✅ Fast (< 1ms per test)
- ✅ No external dependencies

### Integration Tests (4%)

- ✅ Use emulators (Firestore, Pub/Sub, Storage)
- ✅ Docker Compose for local consistency
- ✅ Testcontainers for CI/CD automation
- ✅ Test service integration, not individual functions

### E2E Tests (1%)

- ✅ Use real GCP (staging environment)
- ✅ Test IAM, quotas, latency
- ✅ Run before production deployment
- ✅ Clean up resources after tests

---

## External Resources

- [Testing Cloud Client Libraries](https://cloud.google.com/docs/samples/cloud-client-library-testing)
- [Firestore Emulator](https://cloud.google.com/firestore/docs/emulator)
- [Pub/Sub Emulator](https://cloud.google.com/pubsub/docs/emulator)
- [Testcontainers](https://testcontainers.com/)
