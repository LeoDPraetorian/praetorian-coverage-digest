# Application Default Credentials (ADC) Configuration

**Source:** Research synthesis (Confidence: 0.93)

## Overview

Application Default Credentials (ADC) is Google's recommended strategy for authentication across all environments (local, staging, production). ADC automatically discovers credentials through a standardized hierarchy, eliminating manual credential management.

---

## ADC Credential Discovery Hierarchy

ADC searches for credentials in this exact order:

### 1. GOOGLE_APPLICATION_CREDENTIALS Environment Variable

**Priority:** Highest (overrides all other sources)

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

**Use case:** Local development with service account key (NOT recommended for production)

**Security warning:** Service account keys are long-lived credentials. Use only for:

- Local development
- Legacy systems that cannot use Workload Identity
- CI/CD systems without native federation support

### 2. gcloud CLI User Credentials

**Priority:** Medium (used if env var not set)

```bash
# Authenticate with your Google account
gcloud auth application-default login

# Credentials stored at:
# Linux/macOS: ~/.config/gcloud/application_default_credentials.json
# Windows: %APPDATA%\gcloud\application_default_credentials.json
```

**Use case:** Local development with user identity

**Scopes granted:**

- `https://www.googleapis.com/auth/cloud-platform` (full access)
- `https://www.googleapis.com/auth/userinfo.email`

### 3. Attached Service Account (Metadata Server)

**Priority:** Lowest (used if above not set)

**Platforms:**

- Cloud Run
- Cloud Functions
- GKE (with Workload Identity)
- Compute Engine
- App Engine

**How it works:**

1. SDK detects it's running on GCP platform
2. Queries metadata server at `http://metadata.google.internal`
3. Retrieves short-lived access token (1-hour TTL)
4. Automatically refreshes before expiration

**Use case:** Production deployments (recommended)

---

## Environment-Specific Configuration

### Local Development

#### Option 1: User Credentials (Quick Start)

```bash
# Authenticate as your user
gcloud auth application-default login

# Verify
gcloud auth application-default print-access-token
```

**Pros:**

- Quick setup (one command)
- Uses your existing Google account
- No key management

**Cons:**

- Different identity than production (your user vs service account)
- Broad permissions (full `cloud-platform` scope)
- May mask permission issues in production

#### Option 2: Service Account Impersonation (Recommended)

```bash
# Authenticate with impersonation
gcloud auth application-default login \
  --impersonate-service-account=dev-sa@PROJECT_ID.iam.gserviceaccount.com

# Or set globally
gcloud config set auth/impersonate_service_account \
  dev-sa@PROJECT_ID.iam.gserviceaccount.com

# Then authenticate
gcloud auth application-default login
```

**Pros:**

- Matches production identity (same service account)
- Tests least-privilege IAM
- No persistent keys
- Short-lived tokens (1-hour TTL)

**Cons:**

- Requires `roles/iam.serviceAccountTokenCreator` on dev SA
- Slightly more setup

**Grant impersonation permission:**

```bash
gcloud iam service-accounts add-iam-policy-binding \
  dev-sa@PROJECT_ID.iam.gserviceaccount.com \
  --member="user:your-email@example.com" \
  --role="roles/iam.serviceAccountTokenCreator"
```

### Staging Environment

**Use:** Attached service account (Workload Identity or instance metadata)

```yaml
# Cloud Run deployment (staging)
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: my-app-staging
spec:
  template:
    spec:
      serviceAccountName: staging-sa@PROJECT_ID.iam.gserviceaccount.com
      containers:
        - image: gcr.io/PROJECT_ID/my-app:staging
          env:
            - name: GOOGLE_CLOUD_PROJECT
              value: my-project-staging
          # No GOOGLE_APPLICATION_CREDENTIALS needed
```

### Production Environment

**Use:** Attached service account (Workload Identity)

```yaml
# GKE Deployment (production)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-prod
spec:
  template:
    spec:
      serviceAccountName: prod-ksa # KSA annotated with prod GSA
      containers:
        - name: app
          image: gcr.io/PROJECT_ID/my-app:prod
          env:
            - name: GOOGLE_CLOUD_PROJECT
              value: my-project-prod
          # No credentials needed - ADC discovers via metadata server
```

---

## SDK Integration Patterns

### Go

```go
import (
    "context"
    "cloud.google.com/go/storage"
)

func main() {
    ctx := context.Background()

    // ADC automatically discovers credentials
    // No configuration needed
    client, err := storage.NewClient(ctx)
    if err != nil {
        log.Fatalf("Failed to create client: %v", err)
    }
    defer client.Close()

    // Use client - authenticated via ADC
}
```

**Check which credentials ADC found:**

```go
import (
    "golang.org/x/oauth2/google"
)

creds, err := google.FindDefaultCredentials(ctx, storage.ScopeReadOnly)
if err != nil {
    log.Fatal(err)
}
log.Printf("Using credentials from: %s", creds.JSON) // Service account email
```

### Python

```python
from google.cloud import storage

# ADC automatically discovers credentials
client = storage.Client()

# Use client - authenticated via ADC
```

**Check which credentials ADC found:**

```python
import google.auth

credentials, project = google.auth.default()
print(f"Using credentials: {credentials.service_account_email}")
```

### Node.js

```javascript
const { Storage } = require("@google-cloud/storage");

// ADC automatically discovers credentials
const storage = new Storage();

// Use client - authenticated via ADC
```

### Java

```java
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;

// ADC automatically discovers credentials
Storage storage = StorageOptions.getDefaultInstance().getService();

// Use client - authenticated via ADC
```

---

## Custom Credential Sources

### Explicit Service Account Key

```go
import (
    "cloud.google.com/go/storage"
    "google.golang.org/api/option"
)

func newClientWithKey(ctx context.Context, keyPath string) (*storage.Client, error) {
    return storage.NewClient(ctx, option.WithCredentialsFile(keyPath))
}
```

**Use case:** Legacy systems only. Prefer Workload Identity + ADC.

### Credentials from Environment Variable (Non-File)

```go
import (
    "encoding/json"
    "golang.org/x/oauth2/google"
    "google.golang.org/api/option"
)

func newClientFromEnv(ctx context.Context) (*storage.Client, error) {
    // Load JSON key from environment variable
    credJSON := os.Getenv("GCP_SA_KEY_JSON")

    creds, err := google.CredentialsFromJSON(ctx, []byte(credJSON), storage.ScopeReadWrite)
    if err != nil {
        return nil, err
    }

    return storage.NewClient(ctx, option.WithCredentials(creds))
}
```

---

## Testing ADC Configuration

### Verify ADC Discovery

```bash
# Check which credentials ADC finds
gcloud auth application-default print-access-token

# Decode token to see service account
TOKEN=$(gcloud auth application-default print-access-token)
curl "https://oauth2.googleapis.com/tokeninfo?access_token=$TOKEN"
```

**Expected output:**

```json
{
  "email": "my-app-sa@PROJECT_ID.iam.gserviceaccount.com",
  "expires_in": 3599,
  "scope": "https://www.googleapis.com/auth/cloud-platform"
}
```

### Test with gcloud CLI

```bash
# Set project (optional, but recommended)
gcloud config set project PROJECT_ID

# Test storage access
gsutil ls gs://my-bucket/

# Test Pub/Sub access
gcloud pubsub topics list

# Test BigQuery access
bq ls
```

---

## Troubleshooting

### Error: "Could not find default credentials"

**Cause:** ADC cannot discover any credentials

**Solution:**

1. Check if running on GCP platform (metadata server available)
2. Check `GOOGLE_APPLICATION_CREDENTIALS` environment variable
3. Run `gcloud auth application-default login`

### Error: "Permission denied"

**Cause:** Credentials found, but lack required IAM permissions

**Solution:**

1. Identify which credential ADC is using:

   ```bash
   gcloud auth application-default print-access-token | \
     xargs -I {} curl "https://oauth2.googleapis.com/tokeninfo?access_token={}"
   ```

2. Grant required IAM role:
   ```bash
   gcloud projects add-iam-policy-binding PROJECT_ID \
     --member="serviceAccount:SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/storage.objectViewer"
   ```

### ADC Using Wrong Credentials

**Symptom:** ADC uses GOOGLE_APPLICATION_CREDENTIALS when you want metadata server

**Solution:**

```bash
# Unset environment variable
unset GOOGLE_APPLICATION_CREDENTIALS

# Or explicitly clear
export GOOGLE_APPLICATION_CREDENTIALS=""

# Verify
echo $GOOGLE_APPLICATION_CREDENTIALS  # Should be empty
```

---

## Configuration Files

### .env Files

```bash
# .env.development (local)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/dev-sa-key.json  # Or omit for user credentials
GOOGLE_CLOUD_PROJECT=my-project-dev

# .env.staging (deployed)
# No GOOGLE_APPLICATION_CREDENTIALS - uses attached SA
GOOGLE_CLOUD_PROJECT=my-project-staging

# .env.production (deployed)
# No GOOGLE_APPLICATION_CREDENTIALS - uses attached SA
GOOGLE_CLOUD_PROJECT=my-project-prod
```

### Go Environment Loading

```go
import (
    "github.com/joho/godotenv"
)

func init() {
    // Load .env file based on environment
    env := os.Getenv("APP_ENV")
    if env == "" {
        env = "development"
    }

    godotenv.Load(fmt.Sprintf(".env.%s", env))
}
```

---

## Best Practices

- ✅ Use attached service accounts in production (ADC automatic)
- ✅ Use service account impersonation for local development
- ✅ Never commit `GOOGLE_APPLICATION_CREDENTIALS` to version control
- ✅ Use `.env` files for environment-specific configuration
- ✅ Test credential discovery in each environment (dev, staging, prod)
- ✅ Monitor which credentials your application is using (log service account email on startup)
- ✅ Prefer metadata server over user credentials in CI/CD
- ❌ Don't use `GOOGLE_APPLICATION_CREDENTIALS` in production
- ❌ Don't commit service account keys to Git

---

## External Resources

- [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials)
- [ADC How It Works](https://cloud.google.com/docs/authentication/application-default-credentials#how-adc)
- [Service Account Impersonation](https://cloud.google.com/docs/authentication/use-service-account-impersonation)
- [gcloud auth Commands](https://cloud.google.com/sdk/gcloud/reference/auth)
