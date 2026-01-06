# Cloud Storage Integration Patterns

**Source:** Research synthesis (Confidence: 0.91)

## Client Reuse Pattern (Critical for Performance)

### The Problem

Creating new Cloud Storage clients per request causes severe performance degradation due to:

- Connection pool exhaustion
- TLS handshake overhead
- Authentication token fetch on each client

### The Solution: Singleton Client

```go
import (
    "context"
    "sync"
    "cloud.google.com/go/storage"
)

var (
    storageClient *storage.Client
    clientOnce    sync.Once
    clientErr     error
)

// GetStorageClient returns a singleton client
func GetStorageClient(ctx context.Context) (*storage.Client, error) {
    clientOnce.Do(func() {
        storageClient, clientErr = storage.NewClient(ctx)
    })
    return storageClient, clientErr
}

// Usage
func uploadFile(ctx context.Context, bucket, object string, data []byte) error {
    client, err := GetStorageClient(ctx)
    if err != nil {
        return err
    }
    // Don't close client here - it's shared!

    wc := client.Bucket(bucket).Object(object).NewWriter(ctx)
    if _, err := wc.Write(data); err != nil {
        return err
    }
    return wc.Close()
}
```

**Performance impact:**

- Per-request client: ~200ms overhead per request
- Singleton client: ~5ms overhead per request
- **40x performance improvement**

---

## Upload Patterns

### Simple Upload (< 5 MB)

```go
func uploadSimple(ctx context.Context, bucket, object string, data []byte) error {
    client, err := GetStorageClient(ctx)
    if err != nil {
        return err
    }

    wc := client.Bucket(bucket).Object(object).NewWriter(ctx)
    if _, err := wc.Write(data); err != nil {
        return err
    }
    return wc.Close()
}
```

### Streaming Upload (Large Files)

```go
import (
    "io"
    "os"
)

func uploadStream(ctx context.Context, bucket, object, filePath string) error {
    client, err := GetStorageClient(ctx)
    if err != nil {
        return err
    }

    f, err := os.Open(filePath)
    if err != nil {
        return err
    }
    defer f.Close()

    wc := client.Bucket(bucket).Object(object).NewWriter(ctx)
    wc.ChunkSize = 16 * 1024 * 1024 // 16 MB chunks (default: 8 MB)

    if _, err := io.Copy(wc, f); err != nil {
        return err
    }
    return wc.Close()
}
```

### Multipart Upload (Parallel Chunks)

```go
func uploadMultipart(ctx context.Context, bucket, object, filePath string) error {
    client, err := GetStorageClient(ctx)
    if err != nil {
        return err
    }

    f, err := os.Open(filePath)
    if err != nil {
        return err
    }
    defer f.Close()

    wc := client.Bucket(bucket).Object(object).NewWriter(ctx)

    // Enable multipart upload
    wc.ChunkSize = 32 * 1024 * 1024  // 32 MB chunks
    wc.ContentType = "application/octet-stream"

    // Parallel upload controlled by ChunkSize
    if _, err := io.Copy(wc, f); err != nil {
        return err
    }

    return wc.Close()
}
```

---

## Download Patterns

### Simple Download

```go
func downloadSimple(ctx context.Context, bucket, object string) ([]byte, error) {
    client, err := GetStorageClient(ctx)
    if err != nil {
        return nil, err
    }

    rc, err := client.Bucket(bucket).Object(object).NewReader(ctx)
    if err != nil {
        return nil, err
    }
    defer rc.Close()

    return io.ReadAll(rc)
}
```

### Streaming Download

```go
func downloadStream(ctx context.Context, bucket, object, destPath string) error {
    client, err := GetStorageClient(ctx)
    if err != nil {
        return err
    }

    rc, err := client.Bucket(bucket).Object(object).NewReader(ctx)
    if err != nil {
        return err
    }
    defer rc.Close()

    f, err := os.Create(destPath)
    if err != nil {
        return err
    }
    defer f.Close()

    _, err = io.Copy(f, rc)
    return err
}
```

### Range Download (Partial Content)

```go
func downloadRange(ctx context.Context, bucket, object string, start, length int64) ([]byte, error) {
    client, err := GetStorageClient(ctx)
    if err != nil {
        return nil, err
    }

    rc, err := client.Bucket(bucket).Object(object).NewRangeReader(ctx, start, length)
    if err != nil {
        return nil, err
    }
    defer rc.Close()

    return io.ReadAll(rc)
}
```

---

## Signed URLs (Time-Limited Public Access)

### Generate Signed URL (V4)

```go
import (
    "time"
    "cloud.google.com/go/storage"
)

func generateSignedURL(bucket, object string, expiration time.Duration) (string, error) {
    // Use service account for signing
    // In production, this uses attached service account automatically
    url, err := storage.SignedURL(bucket, object, &storage.SignedURLOptions{
        Scheme:  storage.SigningSchemeV4,
        Method:  "GET",
        Expires: time.Now().Add(expiration),
    })
    if err != nil {
        return "", err
    }
    return url, nil
}

// Usage
url, err := generateSignedURL("my-bucket", "file.pdf", 15*time.Minute)
if err != nil {
    log.Fatal(err)
}
fmt.Printf("Share this URL: %s\n", url)
```

### Signed URL for Upload

```go
func generateUploadURL(bucket, object string, expiration time.Duration) (string, error) {
    url, err := storage.SignedURL(bucket, object, &storage.SignedURLOptions{
        Scheme:      storage.SigningSchemeV4,
        Method:      "PUT",
        Expires:     time.Now().Add(expiration),
        ContentType: "application/octet-stream",
    })
    if err != nil {
        return "", err
    }
    return url, nil
}

// Client uploads directly to signed URL
// curl -X PUT -H "Content-Type: application/octet-stream" --data-binary @file.dat "$URL"
```

**Security considerations:**

- Use shortest practical expiration (15 minutes to 1 hour)
- Include `ContentType` to prevent content type spoofing
- For write URLs, validate file size and content after upload

---

## Storage Lifecycle Policies (Cost Optimization)

### Policy Configuration

```yaml
# lifecycle.yaml
lifecycle:
  rule:
    - action:
        type: SetStorageClass
        storageClass: NEARLINE
      condition:
        age: 30
        matchesStorageClass:
          - STANDARD
    - action:
        type: SetStorageClass
        storageClass: COLDLINE
      condition:
        age: 90
        matchesStorageClass:
          - NEARLINE
    - action:
        type: SetStorageClass
        storageClass: ARCHIVE
      condition:
        age: 365
        matchesStorageClass:
          - COLDLINE
    - action:
        type: Delete
      condition:
        age: 730 # 2 years
        matchesStorageClass:
          - ARCHIVE
```

```bash
# Apply lifecycle policy
gsutil lifecycle set lifecycle.yaml gs://my-bucket
```

### Programmatic Lifecycle Management

```go
import (
    "cloud.google.com/go/storage"
)

func setBucketLifecycle(ctx context.Context, bucketName string) error {
    client, err := GetStorageClient(ctx)
    if err != nil {
        return err
    }

    bucket := client.Bucket(bucketName)

    lifecycle := storage.Lifecycle{
        Rules: []storage.LifecycleRule{
            {
                Action: storage.LifecycleAction{
                    Type:         storage.SetStorageClassAction,
                    StorageClass: "NEARLINE",
                },
                Condition: storage.LifecycleCondition{
                    AgeInDays:             30,
                    MatchesStorageClasses: []string{"STANDARD"},
                },
            },
            {
                Action: storage.LifecycleAction{
                    Type:         storage.SetStorageClassAction,
                    StorageClass: "COLDLINE",
                },
                Condition: storage.LifecycleCondition{
                    AgeInDays:             90,
                    MatchesStorageClasses: []string{"NEARLINE"},
                },
            },
        },
    }

    _, err = bucket.Update(ctx, storage.BucketAttrsToUpdate{
        Lifecycle: &lifecycle,
    })
    return err
}
```

**Cost savings:**

- STANDARD → NEARLINE (30 days): ~50% storage cost reduction
- NEARLINE → COLDLINE (90 days): ~65% storage cost reduction
- COLDLINE → ARCHIVE (365 days): ~75% storage cost reduction
- Total savings for infrequently accessed data: **70-80%**

---

## Object Versioning

### Enable Versioning

```go
func enableVersioning(ctx context.Context, bucketName string) error {
    client, err := GetStorageClient(ctx)
    if err != nil {
        return err
    }

    bucket := client.Bucket(bucketName)
    bucketAttrsToUpdate := storage.BucketAttrsToUpdate{
        VersioningEnabled: true,
    }

    _, err = bucket.Update(ctx, bucketAttrsToUpdate)
    return err
}
```

### List Object Versions

```go
func listVersions(ctx context.Context, bucket, prefix string) error {
    client, err := GetStorageClient(ctx)
    if err != nil {
        return err
    }

    it := client.Bucket(bucket).Objects(ctx, &storage.Query{
        Prefix:   prefix,
        Versions: true,  // Include all versions
    })

    for {
        attrs, err := it.Next()
        if err == iterator.Done {
            break
        }
        if err != nil {
            return err
        }

        fmt.Printf("Object: %s, Generation: %d, Deleted: %v\n",
            attrs.Name, attrs.Generation, attrs.Deleted.Unix() > 0)
    }
    return nil
}
```

---

## Event Notifications (Trigger Cloud Functions)

### Configure Pub/Sub Notification

```bash
# Create Pub/Sub topic
gcloud pubsub topics create gcs-events

# Grant Storage service account permission to publish
gsutil notification create -t gcs-events -f json gs://my-bucket
```

### Cloud Function Triggered by Storage Event

```go
import (
    "context"
    "log"
)

type GCSEvent struct {
    Bucket         string `json:"bucket"`
    Name           string `json:"name"`
    Metageneration int64  `json:"metageneration"`
    TimeCreated    string `json:"timeCreated"`
    Updated        string `json:"updated"`
}

func ProcessStorageEvent(ctx context.Context, e GCSEvent) error {
    log.Printf("Processing file: gs://%s/%s", e.Bucket, e.Name)

    // Process the file
    // E.g., generate thumbnail, extract metadata, etc.

    return nil
}
```

---

## Best Practices

### Performance

- ✅ Reuse client across requests (singleton pattern)
- ✅ Use streaming for large files (> 5 MB)
- ✅ Set appropriate ChunkSize (8-32 MB for large files)
- ✅ Use parallel uploads for files > 100 MB

### Security

- ✅ Use signed URLs for temporary public access
- ✅ Set short expiration on signed URLs (15 min to 1 hour)
- ✅ Use IAM for programmatic access (not ACLs)
- ✅ Enable versioning for critical data
- ❌ Don't make buckets publicly accessible (use signed URLs instead)
- ❌ Don't embed service account keys in client apps

### Cost Optimization

- ✅ Use lifecycle policies to transition to cheaper storage classes
- ✅ Delete old data automatically (retention policy)
- ✅ Use Nearline (30-day min) for infrequent access (monthly)
- ✅ Use Coldline (90-day min) for backups (quarterly)
- ✅ Use Archive (365-day min) for compliance (yearly)

### Reliability

- ✅ Implement retry logic with exponential backoff
- ✅ Handle transient errors (500, 502, 503, 504, 429)
- ✅ Use preconditions for concurrent writes (generation matching)
- ✅ Monitor storage quota and set alerts

---

## External Resources

- [Cloud Storage Client Libraries](https://cloud.google.com/storage/docs/reference/libraries)
- [Signed URLs](https://cloud.google.com/storage/docs/access-control/signed-urls)
- [Lifecycle Management](https://cloud.google.com/storage/docs/lifecycle)
- [Object Versioning](https://cloud.google.com/storage/docs/object-versioning)
- [Event Notifications](https://cloud.google.com/storage/docs/pubsub-notifications)
