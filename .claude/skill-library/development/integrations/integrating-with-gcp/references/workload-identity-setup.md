# Workload Identity Setup for GKE and Cloud Run

**Source:** Research synthesis (Confidence: 0.93)

## Overview

Workload Identity Federation is Google's recommended approach for GKE and Cloud Run authentication, eliminating service account keys and providing automatic credential rotation.

---

## GKE Workload Identity

### Modern "Direct IAM" Pattern (Recommended)

**Benefits:**

- 3 steps vs 6 steps (legacy)
- No intermediate Google Service Account needed
- Simpler RBAC management
- Same security guarantees

### Prerequisites

```bash
# Enable Workload Identity on cluster
gcloud container clusters update CLUSTER_NAME \
  --workload-pool=PROJECT_ID.svc.id.goog \
  --region=REGION
```

### Step-by-Step Setup

#### Step 1: Create Google Service Account

```bash
# Create dedicated service account for your workload
gcloud iam service-accounts create my-app-sa \
  --display-name="My App Service Account" \
  --project=PROJECT_ID

# Grant minimal IAM permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:my-app-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"
```

#### Step 2: Create Kubernetes Service Account

```yaml
# k8s-service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app-ksa
  namespace: default
  annotations:
    # Direct IAM binding - no intermediate GSA
    iam.gke.io/gcp-service-account: my-app-sa@PROJECT_ID.iam.gserviceaccount.com
```

```bash
kubectl apply -f k8s-service-account.yaml
```

#### Step 3: Bind KSA to GSA

```bash
# Grant Kubernetes service account permission to impersonate Google service account
gcloud iam service-accounts add-iam-policy-binding \
  my-app-sa@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/iam.workloadIdentityUser \
  --member="serviceAccount:PROJECT_ID.svc.id.goog[default/my-app-ksa]"
```

#### Step 4: Deploy Workload

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      serviceAccountName: my-app-ksa # Use annotated KSA
      containers:
        - name: app
          image: gcr.io/PROJECT_ID/my-app:latest
          env:
            - name: GOOGLE_CLOUD_PROJECT
              value: PROJECT_ID
          # No GOOGLE_APPLICATION_CREDENTIALS needed
          # ADC automatically discovers credentials via metadata server
```

```bash
kubectl apply -f deployment.yaml
```

### Verification

```bash
# Check pod is using Workload Identity
kubectl get pod POD_NAME -o yaml | grep serviceAccountName

# Exec into pod and test
kubectl exec -it POD_NAME -- sh

# Inside pod - verify ADC works
curl -H "Metadata-Flavor: Google" \
  http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email

# Should return: my-app-sa@PROJECT_ID.iam.gserviceaccount.com
```

---

## Legacy KSA-to-GSA Pattern (Backward Compatibility)

**Use only when:** You need backward compatibility with older GKE versions or have existing infrastructure.

### 6-Step Process

1. Create Google Service Account (GSA)
2. Create Kubernetes Service Account (KSA)
3. Annotate KSA with GSA email
4. Bind KSA to GSA via IAM policy
5. Grant GSA permissions to GCP resources
6. Deploy workload with KSA

**Differences from Direct IAM:**

- Requires both GSA and KSA
- More complex RBAC
- Same security level

---

## Cloud Run Workload Identity

### Setup

Cloud Run automatically uses Workload Identity - no explicit configuration needed!

#### Step 1: Create Service Account

```bash
# Create dedicated service account
gcloud iam service-accounts create my-service-sa \
  --display-name="My Cloud Run Service" \
  --project=PROJECT_ID
```

#### Step 2: Grant Permissions

```bash
# Grant minimal required permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:my-service-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"
```

#### Step 3: Deploy with Service Account

```bash
# Deploy Cloud Run service with custom service account
gcloud run deploy my-service \
  --image=gcr.io/PROJECT_ID/my-service:latest \
  --service-account=my-service-sa@PROJECT_ID.iam.gserviceaccount.com \
  --region=REGION \
  --platform=managed
```

**In code:**

```go
import (
    "context"
    "cloud.google.com/go/storage"
)

func main() {
    ctx := context.Background()

    // ADC automatically discovers attached service account
    // No credential configuration needed
    client, err := storage.NewClient(ctx)
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    // Use client - authenticated as my-service-sa
}
```

---

## Attribute Conditions (Security Boundaries)

### Why Attribute Conditions Matter

Without attribute conditions, any workload in the pool can impersonate any service account. Attribute conditions restrict access by:

- Repository name
- Branch name
- Environment (prod/staging/dev)
- Custom OIDC claims

### GKE Attribute Conditions

```bash
# Restrict by namespace
gcloud iam service-accounts add-iam-policy-binding \
  my-app-sa@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/iam.workloadIdentityUser \
  --member="serviceAccount:PROJECT_ID.svc.id.goog[production/my-app-ksa]" \
  --condition='expression=request.auth.claims.kubernetes.io.namespace=="production",title=production-only'
```

### External Workload Identity (GitHub Actions)

```bash
# Create Workload Identity Pool
gcloud iam workload-identity-pools create github-pool \
  --location=global \
  --display-name="GitHub Actions Pool"

# Create OIDC provider
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location=global \
  --workload-identity-pool=github-pool \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.actor=assertion.actor" \
  --attribute-condition="assertion.repository=='myorg/myrepo' && assertion.ref=='refs/heads/main'"

# Bind to service account with conditions
gcloud iam service-accounts add-iam-policy-binding \
  deploy-sa@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/myorg/myrepo"
```

---

## Troubleshooting

### Pod Can't Access GCP Resources

**Symptom:**

```
Error: google: could not find default credentials
```

**Check:**

1. Workload Identity enabled on cluster?

   ```bash
   gcloud container clusters describe CLUSTER_NAME --format="value(workloadIdentityConfig.workloadPool)"
   ```

2. KSA has annotation?

   ```bash
   kubectl get sa my-app-ksa -o yaml | grep annotations -A 2
   ```

3. IAM binding exists?

   ```bash
   gcloud iam service-accounts get-iam-policy my-app-sa@PROJECT_ID.iam.gserviceaccount.com
   ```

4. Pod is using correct KSA?
   ```bash
   kubectl get pod POD_NAME -o yaml | grep serviceAccountName
   ```

### Permission Denied Errors

**Symptom:**

```
Error 403: Permission denied
```

**Check:**

1. GSA has required IAM role?

   ```bash
   gcloud projects get-iam-policy PROJECT_ID \
     --flatten="bindings[].members" \
     --filter="bindings.members:my-app-sa@PROJECT_ID.iam.gserviceaccount.com"
   ```

2. Resource-level IAM (for buckets, datasets, etc.)?
   ```bash
   gsutil iam get gs://BUCKET_NAME
   ```

### Startup Latency (Token Exchange)

**Symptom:** First API call takes 2-3 seconds

**Cause:** Token exchange with metadata server on first request

**Solutions:**

1. Implement retry logic (exponential backoff)
2. Pre-warm credentials on startup:
   ```go
   // Pre-fetch credentials on startup
   creds, err := google.FindDefaultCredentials(ctx, storage.ScopeReadOnly)
   if err != nil {
       log.Fatal(err)
   }
   token, err := creds.TokenSource.Token()
   if err != nil {
       log.Fatal(err)
   }
   log.Printf("Credentials pre-warmed: %s", token.AccessToken[:20])
   ```

---

## Migration from Service Account Keys

### Step-by-Step Migration

#### Phase 1: Audit (Week 1)

```bash
# List all service account keys
gcloud iam service-accounts keys list \
  --iam-account=SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com

# Check key age
gcloud iam service-accounts keys list \
  --iam-account=SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com \
  --format="table(name,validAfterTime)"
```

#### Phase 2: Enable Workload Identity (Week 1-2)

```bash
# Enable on cluster (requires recreation for existing clusters)
gcloud container clusters update CLUSTER_NAME \
  --workload-pool=PROJECT_ID.svc.id.goog
```

#### Phase 3: Deploy with Workload Identity (Week 2-3)

1. Create KSA with annotation
2. Bind KSA to GSA
3. Deploy pods with KSA
4. Verify credentials work
5. Remove GOOGLE_APPLICATION_CREDENTIALS environment variable

#### Phase 4: Delete Keys (Week 4)

```bash
# Delete service account key
gcloud iam service-accounts keys delete KEY_ID \
  --iam-account=SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com
```

**DO NOT delete keys until workloads are verified working with Workload Identity!**

---

## Best Practices

- ✅ Use Direct IAM pattern for new deployments (3 steps)
- ✅ One service account per microservice (least privilege)
- ✅ Apply attribute conditions for security boundaries
- ✅ Pre-warm credentials on startup to avoid latency
- ✅ Monitor Cloud Audit Logs for service account usage
- ✅ Rotate service accounts (change IAM bindings) vs rotating keys
- ✅ Test in staging before migrating production workloads

---

## External Resources

- [Workload Identity for GKE](https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity)
- [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [Cloud Run Service Identity](https://cloud.google.com/run/docs/securing/service-identity)
- [Troubleshooting Workload Identity](https://cloud.google.com/iam/docs/troubleshoot-managed-workload-identities-gke)
