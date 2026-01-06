# GCP Authentication Patterns

**Source:** Research synthesis from GitHub, Context7, Perplexity, Web (Confidence: 0.93)

## Overview

Modern GCP authentication prioritizes **keyless authentication** through Workload Identity Federation, eliminating the 90-day service account key rotation burden while improving security posture.

---

## Authentication Method Comparison

| Method                                    | Security Level   | Use Case                   | Credentials        | Rotation           |
| ----------------------------------------- | ---------------- | -------------------------- | ------------------ | ------------------ |
| **Workload Identity Federation**          | High             | Production (GKE/Cloud Run) | None (automatic)   | 1-hour (automatic) |
| **Application Default Credentials (ADC)** | Medium-High      | All environments           | Auto-discovered    | Varies by source   |
| **Service Account Impersonation**         | Medium-High      | Local development          | Short-lived tokens | 1-hour             |
| **Service Account Keys**                  | Low (deprecated) | Legacy only                | JSON key file      | Manual (90 days)   |

---

## Workload Identity Federation (Production Standard)

### Why Workload Identity

- **No service account keys** - Eliminates key management entirely
- **Short-lived tokens** - 1-hour TTL, automatically rotated
- **Fine-grained IAM** - Dedicated service account per workload
- **Audit trail** - Cloud Audit Logs track all access

### Modern "Direct IAM" Pattern (GKE)

**Setup (3 steps):**

```bash
# 1. Enable Workload Identity on GKE cluster
gcloud container clusters update CLUSTER_NAME \
  --workload-pool=PROJECT_ID.svc.id.goog

# 2. Create dedicated service account
gcloud iam service-accounts create SERVICE_ACCOUNT_NAME \
  --project=PROJECT_ID

# 3. Bind Kubernetes service account to GCP service account
gcloud iam service-accounts add-iam-policy-binding \
  SERVICE_ACCOUNT_NAME@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/iam.workloadIdentityUser \
  --member="serviceAccount:PROJECT_ID.svc.id.goog[NAMESPACE/KSA_NAME]"
```

**Kubernetes Deployment:**

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app
  namespace: default
  annotations:
    iam.gke.io/gcp-service-account: SERVICE_ACCOUNT_NAME@PROJECT_ID.iam.gserviceaccount.com
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      serviceAccountName: my-app # Use annotated KSA
      containers:
        - name: app
          image: gcr.io/PROJECT_ID/my-app:latest
          # No credential configuration needed - ADC handles it automatically
```

### Workload Identity Federation for External Workloads

**GitHub Actions Example:**

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write # Required for OIDC
      contents: read
    steps:
      - uses: actions/checkout@v3

      - uses: google-github-actions/auth@v1
        with:
          workload_identity_provider: "projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID"
          service_account: "SERVICE_ACCOUNT_NAME@PROJECT_ID.iam.gserviceaccount.com"

      # Now authenticated - use gcloud commands
      - run: gcloud storage cp file.txt gs://bucket/
```

**Attribute Conditions (Security Boundary):**

```bash
# Restrict to specific repository and branch
gcloud iam workload-identity-pools providers update-oidc PROVIDER_ID \
  --location=global \
  --workload-identity-pool=POOL_ID \
  --attribute-condition="assertion.repository=='org/repo' && assertion.ref=='refs/heads/main'"
```

---

## Application Default Credentials (ADC)

### Credential Discovery Hierarchy

ADC searches for credentials in this order:

1. **GOOGLE_APPLICATION_CREDENTIALS** environment variable (path to service account key)
2. **gcloud auth application-default login** (user credentials at `~/.config/gcloud/application_default_credentials.json`)
3. **Attached service account** (metadata server for Cloud Run/GKE/Compute Engine)

### Production Pattern (Implicit)

```go
import (
    "context"
    "cloud.google.com/go/storage"
)

// No credential configuration needed
// ADC automatically discovers attached service account
func main() {
    ctx := context.Background()
    client, err := storage.NewClient(ctx)
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    // Use client - authenticated automatically via attached SA
}
```

### Local Development Pattern

```bash
# Option 1: Use your user credentials (for development)
gcloud auth application-default login

# Option 2: Use service account impersonation (preferred)
gcloud auth application-default login --impersonate-service-account=DEV_SA@PROJECT_ID.iam.gserviceaccount.com
```

---

## Service Account Impersonation

**Use case:** Local development without downloading service account keys

```bash
# Generate short-lived access token (1-hour TTL)
gcloud auth print-access-token --impersonate-service-account=SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com

# Configure ADC with impersonation
gcloud config set auth/impersonate_service_account SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com
```

**Go SDK Example:**

```go
import (
    "context"
    "golang.org/x/oauth2/google"
    "google.golang.org/api/impersonate"
)

func getImpersonatedClient(ctx context.Context) (*http.Client, error) {
    // Base credentials (your user account)
    baseCredentials, err := google.FindDefaultCredentials(ctx)
    if err != nil {
        return nil, err
    }

    // Impersonate service account
    ts, err := impersonate.CredentialsTokenSource(ctx, impersonate.CredentialsConfig{
        TargetPrincipal: "SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com",
        Scopes:          []string{"https://www.googleapis.com/auth/cloud-platform"},
    })
    if err != nil {
        return nil, err
    }

    return oauth2.NewClient(ctx, ts), nil
}
```

---

## Cloud Run Service-to-Service Authentication

**Pattern:** OIDC ID tokens for secure inter-service communication

```go
import (
    "google.golang.org/api/idtoken"
)

func callService(ctx context.Context, targetURL string) error {
    // Generate ID token for target service
    client, err := idtoken.NewClient(ctx, targetURL)
    if err != nil {
        return err
    }

    // Make authenticated request
    resp, err := client.Get(targetURL)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    // Process response
    return nil
}
```

**IAM Configuration:**

```bash
# Grant invoker role to calling service's SA
gcloud run services add-iam-policy-binding TARGET_SERVICE \
  --member="serviceAccount:CALLER_SA@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.invoker"
```

---

## Least Privilege IAM Best Practices

### Dedicated Service Accounts

```bash
# Create dedicated SA per microservice
gcloud iam service-accounts create my-app-sa \
  --display-name="My App Service Account"

# Grant minimal required permissions (predefined roles)
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:my-app-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"
```

### Remove Default Service Account Editor Role

```bash
# List default Compute Engine service account
DEFAULT_SA="PROJECT_NUMBER-compute@developer.gserviceaccount.com"

# Remove Editor role (too broad)
gcloud projects remove-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:$DEFAULT_SA" \
  --role="roles/editor"

# Grant specific roles only
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:$DEFAULT_SA" \
  --role="roles/compute.instanceAdmin.v1"
```

### IAM Recommender (Automated Permission Cleanup)

```bash
# List unused permissions
gcloud recommender recommendations list \
  --project=PROJECT_ID \
  --recommender=google.iam.policy.Recommender \
  --location=global

# Apply recommendation
gcloud recommender recommendations mark-claimed RECOMMENDATION_ID \
  --project=PROJECT_ID \
  --recommender=google.iam.policy.Recommender \
  --location=global \
  --etag=ETAG
```

---

## Anti-Patterns to Avoid

| Anti-Pattern                                     | Why It's Wrong                     | Correct Approach                     |
| ------------------------------------------------ | ---------------------------------- | ------------------------------------ |
| **Service account keys in Git**                  | Permanent credentials, key leakage | Use Workload Identity Federation     |
| **Default Compute Engine SA**                    | Editor role (too broad)            | Dedicated SA per workload            |
| **Project-level IAM bindings**                   | Large blast radius                 | Resource-level IAM bindings          |
| **Manual key rotation**                          | Operational burden, human error    | Workload Identity (automatic)        |
| **GOOGLE_APPLICATION_CREDENTIALS in production** | Requires key file management       | Attach SA to resource (ADC implicit) |

---

## Security Checklist

- [ ] No service account keys committed to version control
- [ ] Workload Identity enabled for GKE/Cloud Run
- [ ] Dedicated service account per microservice
- [ ] Editor role removed from default service accounts
- [ ] Attribute conditions configured on Workload Identity pools
- [ ] IAM Recommender run quarterly
- [ ] Cloud Audit Logs enabled for IAM changes
- [ ] Service-to-service auth uses OIDC tokens (Cloud Run)

---

## External Resources

- [Workload Identity for GKE](https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity)
- [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials)
- [Service Account Best Practices](https://cloud.google.com/iam/docs/best-practices-service-accounts)
- [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
