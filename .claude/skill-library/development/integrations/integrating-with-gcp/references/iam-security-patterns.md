# IAM Security Patterns

**Source:** Research synthesis (Confidence: 0.93)

## Least Privilege Principle

### Role Types (From Least to Most Privilege)

| Role Type            | Example                                       | Granularity                          | Use Case                |
| -------------------- | --------------------------------------------- | ------------------------------------ | ----------------------- |
| **Custom roles**     | `roles/mycompany.storageReader`               | Fine-grained (specific permissions)  | Exact permission sets   |
| **Predefined roles** | `roles/storage.objectViewer`                  | Service-specific (curated by Google) | Standard use cases      |
| **Basic roles**      | `roles/viewer`, `roles/editor`, `roles/owner` | Project-wide (too broad)             | **AVOID in production** |

**Recommendation**: Use predefined roles. Create custom roles only when predefined are too broad.

---

## Service Account Management

### Create Dedicated Service Account

```bash
# Create SA with descriptive name
gcloud iam service-accounts create my-app-backend \
  --display-name="My App Backend Service" \
  --description="Backend API service account"

# Grant minimal permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:my-app-backend@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"
```

### Service Account Impersonation (Local Dev)

```bash
# Grant yourself permission to impersonate
gcloud iam service-accounts add-iam-policy-binding \
  my-app-backend@PROJECT_ID.iam.gserviceaccount.com \
  --member="user:your-email@example.com" \
  --role="roles/iam.serviceAccountTokenCreator"

# Use impersonation
gcloud auth application-default login \
  --impersonate-service-account=my-app-backend@PROJECT_ID.iam.gserviceaccount.com
```

**Code Example:**

```go
import (
    "google.golang.org/api/impersonate"
)

func impersonateServiceAccount(ctx context.Context, targetSA string) (*http.Client, error) {
    ts, err := impersonate.CredentialsTokenSource(ctx, impersonate.CredentialsConfig{
        TargetPrincipal: targetSA,
        Scopes:          []string{"https://www.googleapis.com/auth/cloud-platform"},
        Lifetime:        3600 * time.Second, // 1 hour
    })
    if err != nil {
        return nil, err
    }

    return oauth2.NewClient(ctx, ts), nil
}
```

---

## IAM Recommender (Automated Permission Cleanup)

### List Recommendations

```bash
# List unused permissions
gcloud recommender recommendations list \
  --project=PROJECT_ID \
  --recommender=google.iam.policy.Recommender \
  --location=global \
  --format="table(name,primaryImpact.category,stateInfo.state)"
```

### Apply Recommendation

```bash
# Apply specific recommendation
gcloud recommender recommendations mark-claimed RECOMMENDATION_ID \
  --project=PROJECT_ID \
  --recommender=google.iam.policy.Recommender \
  --location=global \
  --etag=ETAG

# Remove unused role
gcloud projects remove-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:SA@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"
```

---

## Organization Policies

### Disable Automatic Default SA Editor Role

```bash
# Prevent automatic Editor role grant to default Compute Engine SA
gcloud org-policies set-policy - <<EOF
name: projects/PROJECT_ID/policies/iam.automaticIamGrantsForDefaultServiceAccounts
spec:
  rules:
  - enforce: true
EOF
```

### Disable Service Account Key Creation

```bash
# Prevent service account key creation (force Workload Identity)
gcloud org-policies set-policy - <<EOF
name: projects/PROJECT_ID/policies/iam.disableServiceAccountKeyCreation
spec:
  rules:
  - enforce: true
EOF
```

---

## Resource-Level IAM (Reduce Blast Radius)

### Cloud Storage Bucket-Level IAM

```bash
# Grant access to specific bucket (not project-wide)
gsutil iam ch \
  serviceAccount:my-app@PROJECT_ID.iam.gserviceaccount.com:roles/storage.objectViewer \
  gs://my-bucket
```

### BigQuery Dataset-Level IAM

```bash
# Grant access to specific dataset (not project-wide)
bq add-iam-policy-binding \
  --member="serviceAccount:my-app@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataViewer" \
  PROJECT_ID:mydataset
```

---

## Conditional IAM (Attribute-Based Access Control)

### Time-Based Access

```bash
# Grant access only during business hours (9 AM to 5 PM UTC)
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:temp-worker@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer" \
  --condition='
    expression=request.time < timestamp("2026-12-31T17:00:00Z") && request.time > timestamp("2026-01-01T09:00:00Z"),
    title=business-hours-only,
    description=Access only during business hours
  '
```

### IP-Based Access

```bash
# Grant access only from specific IP range
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="user:contractor@external.com" \
  --role="roles/viewer" \
  --condition='
    expression=inIpRange(origin.ip, "203.0.113.0/24"),
    title=office-ip-only
  '
```

---

## Audit Logging

### Enable Data Access Audit Logs

```bash
# Enable audit logs for Cloud Storage (log all reads)
gcloud logging sinks create storage-audit-logs \
  bigquery.googleapis.com/projects/PROJECT_ID/datasets/audit_logs \
  --log-filter='
    protoPayload.serviceName="storage.googleapis.com"
    protoPayload.methodName=~"storage.objects.*"
  '
```

### Query Audit Logs

```sql
-- BigQuery query for service account usage
SELECT
  protoPayload.authenticationInfo.principalEmail,
  protoPayload.methodName,
  COUNT(*) as call_count
FROM `PROJECT_ID.audit_logs.cloudaudit_googleapis_com_activity_*`
WHERE DATE(_PARTITIONTIME) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
  AND protoPayload.authenticationInfo.principalEmail LIKE '%@PROJECT_ID.iam.gserviceaccount.com'
GROUP BY 1, 2
ORDER BY call_count DESC
LIMIT 100;
```

---

## Best Practices

- ✅ One service account per microservice (least privilege)
- ✅ Remove Editor role from default Compute Engine SA
- ✅ Use predefined roles over custom roles
- ✅ Grant IAM at resource level (bucket, dataset) not project level
- ✅ Use conditional IAM for temporary access
- ✅ Run IAM Recommender quarterly
- ✅ Enable audit logs for sensitive operations
- ✅ Use service account impersonation for local dev (no keys)
- ❌ Never grant Owner/Editor/Viewer roles in production
- ❌ Never commit service account keys to Git

---

## External Resources

- [IAM Best Practices](https://cloud.google.com/iam/docs/best-practices)
- [Service Account Best Practices](https://cloud.google.com/iam/docs/best-practices-service-accounts)
- [IAM Recommender](https://cloud.google.com/iam/docs/recommender-overview)
- [Conditional IAM](https://cloud.google.com/iam/docs/conditions-overview)
