# GCP Cost Optimization Patterns

**Source:** Research synthesis (Confidence: 0.92)

## Four Pillars of Cost Optimization

### 1. Commitment Discounts

| Type                               | Duration    | Discount | Use Case                  |
| ---------------------------------- | ----------- | -------- | ------------------------- |
| **Sustained Use Discounts (SUDs)** | Automatic   | 20-30%   | Always on (no commitment) |
| **Committed Use Discounts (CUDs)** | 1-3 years   | 57%      | Predictable workloads     |
| **Spot VMs**                       | Preemptible | 70-91%   | Batch, fault-tolerant     |

#### Enable CUDs

```bash
# Purchase 1-year commitment for 10 vCPUs
gcloud compute commitments create my-commitment \
  --plan=12-month \
  --resources=vcpu=10,memory=40GB \
  --region=us-central1
```

**Cost savings:** $1,460/year (57% discount) vs on-demand for 10 vCPUs

---

### 2. Spot VMs (Batch Workloads)

```bash
# Create instance with Spot VM
gcloud compute instances create my-batch-worker \
  --provisioning-model=SPOT \
  --instance-termination-action=STOP \
  --machine-type=n2-standard-4 \
  --zone=us-central1-a
```

**Characteristics:**

- 70-91% cheaper than on-demand
- Can be terminated with 30-second notice
- Best for: Batch processing, rendering, data analysis

**Go Example (Handle Preemption):**

```go
func handlePreemption() {
    // Listen for preemption notice
    resp, err := http.Get("http://metadata.google.internal/computeMetadata/v1/instance/preempted")
    if err == nil && resp.StatusCode == 200 {
        log.Println("Preemption notice received, gracefully shutting down...")
        // Save state, close connections, exit
        os.Exit(0)
    }
}
```

---

### 3. Storage Lifecycle Policies (70-80% Savings)

```yaml
# lifecycle.yaml
lifecycle:
  rule:
    - action:
        type: SetStorageClass
        storageClass: NEARLINE
      condition:
        age: 30 # After 30 days
    - action:
        type: SetStorageClass
        storageClass: COLDLINE
      condition:
        age: 90 # After 90 days
    - action:
        type: SetStorageClass
        storageClass: ARCHIVE
      condition:
        age: 365 # After 1 year
    - action:
        type: Delete
      condition:
        age: 2555 # After 7 years (compliance retention)
```

```bash
gsutil lifecycle set lifecycle.yaml gs://my-bucket
```

**Cost comparison (per GB/month):**

- Standard: $0.020
- Nearline: $0.010 (50% savings)
- Coldline: $0.004 (80% savings)
- Archive: $0.0012 (94% savings)

---

### 4. Log Exclusion Filters (Reduce Logging Costs)

```bash
# Exclude successful health checks from ingestion
gcloud logging sinks create exclude-health-checks \
  logging.googleapis.com/projects/PROJECT_ID/logs/_Default \
  --log-filter='
    NOT (
      protoPayload.request.path="/health"
      AND httpRequest.status=200
    )
  '
```

**Sampling pattern (1-10% success logs, 100% errors):**

```go
import (
    "cloud.google.com/go/logging"
)

func logWithSampling(client *logging.Client, message string, severity logging.Severity) {
    logger := client.Logger("my-app")

    // Sample successful logs (10%), log all errors
    if severity == logging.Info && rand.Float64() > 0.10 {
        return // Skip 90% of info logs
    }

    logger.Log(logging.Entry{
        Severity: severity,
        Payload:  message,
    })
}
```

**Cost savings:** ~90% reduction in logging costs

---

## Cost Monitoring & Alerts

### Enable Budget Alerts

```bash
# Create budget with email alerts
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="Monthly Budget" \
  --budget-amount=1000 \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100 \
  --all-updates-rule-pubsub-topic=projects/PROJECT_ID/topics/budget-alerts
```

### Query Billing Export (BigQuery)

```sql
-- Top 10 expensive services last month
SELECT
  service.description,
  SUM(cost) as total_cost
FROM `PROJECT_ID.billing_export.gcp_billing_export_v1_XXXXXX_XXXXXX_XXXXXX`
WHERE DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY service.description
ORDER BY total_cost DESC
LIMIT 10;
```

---

## Idle Resource Recommenders

### Cloud Storage Idle Buckets

```bash
# List buckets with no access in 90 days
gcloud recommender recommendations list \
  --project=PROJECT_ID \
  --recommender=google.storage.bucket.IdleResourceRecommender \
  --location=global
```

### Idle VM Instances

```bash
# List VMs with <5% CPU for 7+ days
gcloud recommender recommendations list \
  --project=PROJECT_ID \
  --recommender=google.compute.instance.IdleResourceRecommender \
  --location=us-central1
```

---

## Serverless Cost Optimization

### Cloud Functions

```bash
# Deploy with cost optimizations
gcloud functions deploy my-function \
  --runtime=go121 \
  --trigger-http \
  --memory=256MB \                    # Right-size memory (default: 256MB)
  --timeout=60s \                     # Set appropriate timeout
  --max-instances=100 \               # Prevent runaway costs
  --min-instances=1 \                 # Avoid cold starts (costs more)
  --service-account=my-function-sa@PROJECT_ID.iam.gserviceaccount.com
```

**Cost factors:**

- Invocations: $0.40 per million
- Compute time: $0.0000025 per GB-second
- Networking: Egress charges apply

**Optimization:**

- Use smaller memory allocation (128-512MB for simple functions)
- Minimize dependencies (faster cold starts)
- Set `max-instances` to prevent cost spikes

---

## BigQuery Cost Optimization

### Use Partitioning & Clustering

```sql
-- Query only relevant partition (10-100x cost reduction)
SELECT *
FROM `PROJECT_ID.mydataset.events`
WHERE DATE(event_time) = '2026-01-04'  -- Query single partition
  AND user_id = 'user123'              -- Use clustered column
LIMIT 1000;
```

### Use Table Preview (Free)

```bash
# Preview table (no query cost)
bq head -n 10 PROJECT_ID:mydataset.events

# vs

# Query table (costs money)
bq query "SELECT * FROM mydataset.events LIMIT 10"
```

---

## Best Practices Summary

### Compute

- ✅ Use SUDs (automatic 20-30% discount)
- ✅ Purchase CUDs for predictable workloads (57% discount)
- ✅ Use Spot VMs for batch processing (70-91% discount)
- ✅ Right-size instances (use recommender)

### Storage

- ✅ Use lifecycle policies (70-80% savings)
- ✅ Delete orphaned disks and snapshots
- ✅ Use Nearline/Coldline/Archive for infrequent access

### Networking

- ✅ Use Cloud CDN for static content
- ✅ Minimize cross-region egress
- ✅ Use VPC peering over VPN

### Logging & Monitoring

- ✅ Exclude health checks and successful requests
- ✅ Sample logs (10% success, 100% errors)
- ✅ Set log retention policies (default: 30 days)

### BigQuery

- ✅ Use `SELECT column1, column2` not `SELECT *`
- ✅ Partition tables by date
- ✅ Cluster by frequently filtered columns
- ✅ Use table preview instead of queries

---

## External Resources

- [Cost Optimization Best Practices](https://cloud.google.com/architecture/cost-optimization)
- [Committed Use Discounts](https://cloud.google.com/compute/docs/instances/committed-use-discounts)
- [Spot VMs](https://cloud.google.com/compute/docs/instances/spot)
- [Storage Lifecycle Management](https://cloud.google.com/storage/docs/lifecycle)
- [BigQuery Cost Optimization](https://cloud.google.com/bigquery/docs/best-practices-costs)
