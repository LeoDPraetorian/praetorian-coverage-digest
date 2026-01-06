---
name: integrating-with-gcp
description: Use when integrating with Google Cloud Platform services (Cloud Storage, Cloud Functions, Pub/Sub, BigQuery), authentication (service accounts, ADC, workload identity), and IAM patterns - comprehensive patterns for secure GCP integration
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, WebSearch
---

# Integrating with Google Cloud Platform (GCP)

**Comprehensive guide for integrating with Google Cloud Platform services, authentication methods, security best practices, and operational patterns.**

## Prerequisites

- GCP project with appropriate APIs enabled
- Understanding of IAM roles and service accounts
- Security: Never commit service account keys to repositories
- Local development: Install gcloud CLI and configure Application Default Credentials

## When to Use

Use this skill when:

- Building GCP service integrations (Cloud Storage, Cloud Functions, Pub/Sub, BigQuery)
- Choosing authentication method (Service Account keys vs ADC vs Workload Identity)
- Implementing retry strategies and error handling for GCP APIs
- Setting up secure access patterns for GCP resources
- Deploying serverless functions or containers to GCP
- Managing GCP infrastructure and security policies

## Quick Reference

| Operation          | Method              | Best Practice                                       |
| ------------------ | ------------------- | --------------------------------------------------- |
| Authentication     | Workload Identity   | Use for production, eliminates service account keys |
| Local Development  | ADC                 | Use `gcloud auth application-default login`         |
| Error Handling     | Exponential backoff | Implement retry with jitter for transient failures  |
| Storage Access     | Signed URLs         | Use time-limited signed URLs for public access      |
| Secrets Management | Secret Manager      | Use GCP Secret Manager, never environment variables |
| IAM Principle      | Least Privilege     | Grant minimal required permissions                  |

## Authentication Methods

### Overview

| Method               | Use Case                    | Security Level | Credentials Needed |
| -------------------- | --------------------------- | -------------- | ------------------ |
| Service Account Keys | Quick scripts, development  | Low            | JSON key file      |
| Application Default  | Local development, testing  | Medium         | User credentials   |
| Workload Identity    | Production (GKE, Cloud Run) | High           | None (automatic)   |

**Recommendation**: Use Workload Identity for production. See [references/authentication-patterns.md](references/authentication-patterns.md).

### Workload Identity (Recommended for Production)

**Why Workload Identity:**

- No service account keys to manage or rotate
- Automatic credential management by GCP
- Fine-grained IAM binding per workload
- Audit trail with workload identity
- Eliminates key leakage risk

**See:** [references/workload-identity-setup.md](references/workload-identity-setup.md) for GKE and Cloud Run configuration.

### Application Default Credentials (Local Development)

**For local development:**

```bash
# Authenticate as your user account
gcloud auth application-default login

# Set default project
gcloud config set project PROJECT_ID
```

This creates credentials at `~/.config/gcloud/application_default_credentials.json` that SDKs automatically discover.

**See:** [references/adc-configuration.md](references/adc-configuration.md) for environment-specific setup.

## Service Integration Patterns

### Cloud Storage

**Common Operations:**

- Upload/download objects
- List buckets and objects
- Generate signed URLs
- Set object metadata and lifecycle policies

**Client Library Example (Go):**

```go
import (
    "context"
    "cloud.google.com/go/storage"
)

// Create client with ADC
ctx := context.Background()
client, err := storage.NewClient(ctx)
if err != nil {
    // Handle error
}
defer client.Close()

// Upload object
bucket := client.Bucket("my-bucket")
object := bucket.Object("path/to/file.txt")
writer := object.NewWriter(ctx)
if _, err := writer.Write([]byte("data")); err != nil {
    // Handle error
}
if err := writer.Close(); err != nil {
    // Handle error
}
```

**See:** [references/cloud-storage-patterns.md](references/cloud-storage-patterns.md) for signed URLs, streaming, and lifecycle management.

### Cloud Functions

**Deployment Patterns:**

- HTTP triggers for REST APIs
- Pub/Sub triggers for event processing
- Cloud Storage triggers for file processing
- Cloud Scheduler triggers for cron jobs

**Security Considerations:**

- Use Cloud Functions service identity (no keys)
- Validate authentication tokens in HTTP functions
- Set minimum IAM permissions
- Use VPC connectors for private resources

**See:** [references/cloud-functions-deployment.md](references/cloud-functions-deployment.md) for complete deployment guide.

### Pub/Sub

**Messaging Patterns:**

- Publisher: Push messages to topic
- Subscriber: Pull messages from subscription
- Push subscriptions: HTTP endpoint receives messages
- Ordering keys: Guarantee message order per key

**Client Library Example (Go):**

```go
import (
    "context"
    "cloud.google.com/go/pubsub"
)

ctx := context.Background()
client, err := pubsub.NewClient(ctx, "project-id")
if err != nil {
    // Handle error
}
defer client.Close()

// Publish message
topic := client.Topic("my-topic")
result := topic.Publish(ctx, &pubsub.Message{
    Data: []byte("message data"),
})
// Block until message is published
id, err := result.Get(ctx)
```

**See:** [references/pubsub-patterns.md](references/pubsub-patterns.md) for exactly-once delivery, dead letter queues, and retry policies.

### BigQuery

**Use Cases:**

- Data warehousing and analytics
- SQL queries on large datasets
- Streaming inserts for real-time data
- Scheduled queries and exports

**Query Patterns:**

- Use parameterized queries to prevent injection
- Partition tables by date for cost optimization
- Use clustering for frequently filtered columns
- Cache query results for repeated queries

**See:** [references/bigquery-patterns.md](references/bigquery-patterns.md) for streaming inserts, cost optimization, and query best practices.

## Error Handling & Retry Strategy

### HTTP Status Codes

| Status Code | Meaning             | Action                                    |
| ----------- | ------------------- | ----------------------------------------- |
| 400         | Bad Request         | Fix request parameters, do not retry      |
| 401         | Unauthorized        | Refresh credentials or check IAM          |
| 403         | Forbidden           | Check IAM permissions for resource        |
| 404         | Not Found           | Verify resource exists                    |
| 429         | Rate Limit Exceeded | Retry with exponential backoff            |
| 500/502/503 | Server Error        | Retry with exponential backoff (up to 5x) |

### Retry Pattern (Go)

```go
import (
    "time"
    "math/rand"
    "cloud.google.com/go/storage"
    "google.golang.org/api/googleapi"
)

func retryWithBackoff(ctx context.Context, maxRetries int, fn func() error) error {
    for attempt := 0; attempt < maxRetries; attempt++ {
        err := fn()
        if err == nil {
            return nil
        }

        // Check if error is retryable
        if apiErr, ok := err.(*googleapi.Error); ok {
            if apiErr.Code >= 500 || apiErr.Code == 429 {
                // Exponential backoff with jitter
                backoff := time.Duration(1<<uint(attempt)) * time.Second
                jitter := time.Duration(rand.Int63n(int64(backoff / 2)))
                time.Sleep(backoff + jitter)
                continue
            }
        }

        return err // Non-retryable error
    }
    return fmt.Errorf("max retries exceeded")
}
```

**See:** [references/error-handling-patterns.md](references/error-handling-patterns.md) for comprehensive retry logic and circuit breakers.

## IAM & Security Best Practices

### Principle of Least Privilege

**IAM Role Hierarchy:**

1. **Primitive roles** (Owner, Editor, Viewer) - TOO BROAD, avoid in production
2. **Predefined roles** - Service-specific, granular (e.g., `roles/storage.objectViewer`)
3. **Custom roles** - Fine-tuned permissions for specific use cases

**Best Practice:**

- Start with predefined roles
- Create custom roles only when predefined roles are too broad
- Use service accounts for application identity
- Grant roles at resource level, not project level when possible

### Service Account Management

**Key Management:**

- **NEVER commit service account keys to Git**
- Use Secret Manager for key storage if keys are required
- Rotate keys every 90 days minimum
- Monitor key usage with Cloud Audit Logs

**Alternatives to Keys:**

- Workload Identity (GKE, Cloud Run)
- Service Account Impersonation
- Application Default Credentials (local dev)

**See:** [references/iam-security-patterns.md](references/iam-security-patterns.md) for service account impersonation and organization policies.

## Local Development Setup

### Install and Configure gcloud CLI

```bash
# Install gcloud CLI (see https://cloud.google.com/sdk/docs/install)

# Initialize and authenticate
gcloud init
gcloud auth application-default login

# Set default project
gcloud config set project PROJECT_ID

# Verify configuration
gcloud config list
```

### Environment Variables

```bash
# Optional: Set explicit project
export GOOGLE_CLOUD_PROJECT=PROJECT_ID

# Optional: Set credentials path (if not using ADC)
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

**See:** [references/local-development-setup.md](references/local-development-setup.md) for emulator configuration and testing patterns.

## Testing Strategies

### Unit Testing

**Mock GCP Clients:**

- Use interface-based design for testability
- Mock GCP client methods in unit tests
- Test error handling paths

**Example (Go):**

```go
type StorageClient interface {
    UploadObject(ctx context.Context, bucket, object string, data []byte) error
}

// Test with mock implementation
func TestUpload(t *testing.T) {
    mockClient := &MockStorageClient{}
    // Test logic using mockClient
}
```

### Integration Testing

**Use GCP Emulators:**

- Cloud Storage: `fake-gcs-server`
- Pub/Sub: `gcloud beta emulators pubsub start`
- Bigtable: `gcloud beta emulators bigtable start`
- Firestore: `gcloud beta emulators firestore start`

**See:** [references/testing-patterns.md](references/testing-patterns.md) for emulator configuration and test fixtures.

## Cost Optimization

### Storage Cost Optimization

- Use lifecycle policies to move infrequent objects to Nearline/Coldline/Archive
- Delete orphaned objects and multipart upload remnants
- Use requester pays for public datasets

### Compute Cost Optimization

- Use preemptible VMs for batch workloads (up to 80% discount)
- Use Cloud Functions for intermittent workloads
- Right-size Cloud Run instances based on usage patterns
- Use committed use discounts for predictable workloads

**See:** [references/cost-optimization-patterns.md](references/cost-optimization-patterns.md) for budget alerts and cost allocation.

## References

- [references/authentication-patterns.md](references/authentication-patterns.md) - Service accounts, ADC, Workload Identity comparison
- [references/workload-identity-setup.md](references/workload-identity-setup.md) - GKE and Cloud Run Workload Identity configuration
- [references/adc-configuration.md](references/adc-configuration.md) - Application Default Credentials setup
- [references/cloud-storage-patterns.md](references/cloud-storage-patterns.md) - Object operations, signed URLs, lifecycle policies
- [references/cloud-functions-deployment.md](references/cloud-functions-deployment.md) - Function deployment and trigger patterns
- [references/pubsub-patterns.md](references/pubsub-patterns.md) - Messaging patterns, ordering, dead letter queues
- [references/bigquery-patterns.md](references/bigquery-patterns.md) - Query optimization, streaming inserts, cost management
- [references/error-handling-patterns.md](references/error-handling-patterns.md) - Retry logic, exponential backoff, circuit breakers
- [references/iam-security-patterns.md](references/iam-security-patterns.md) - IAM best practices, service account impersonation
- [references/local-development-setup.md](references/local-development-setup.md) - gcloud CLI, emulator configuration
- [references/testing-patterns.md](references/testing-patterns.md) - Unit testing, integration testing with emulators
- [references/cost-optimization-patterns.md](references/cost-optimization-patterns.md) - Budget alerts, lifecycle policies, resource optimization

## Related Skills

- `integrating-with-github` - GitHub API integration patterns
- `integrating-with-jira` - Jira API integration for issue tracking
- `serverless-compute-decision-architecture` - Choosing between serverless and container compute

## External Documentation

- **GCP Documentation**: https://cloud.google.com/docs
- **Cloud Storage**: https://cloud.google.com/storage/docs
- **Cloud Functions**: https://cloud.google.com/functions/docs
- **Pub/Sub**: https://cloud.google.com/pubsub/docs
- **BigQuery**: https://cloud.google.com/bigquery/docs
- **IAM**: https://cloud.google.com/iam/docs
- **Workload Identity**: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- **gcloud CLI**: https://cloud.google.com/sdk/gcloud/reference
