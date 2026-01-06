# AWS Cost Optimization

**Strategies for reducing AWS costs in serverless applications.**

---

## Lambda Cost Optimization

### Right-Size Memory

```yaml
# Test different memory settings
MemorySize: 512  # Baseline
MemorySize: 1024 # If CPU-bound
MemorySize: 256  # If I/O-bound
```

**Cost:** $0.0000166667 per GB-second

**Strategy:** Test with load to find optimal memory/cost ratio

### Use ARM64 (Graviton2)

```yaml
Architectures:
  - arm64 # 20% cheaper than x86
```

### Provisioned Concurrency (Use Sparingly)

```yaml
# Only for critical paths with strict latency requirements
ProvisionedConcurrencyConfig:
  ProvisionedConcurrentExecutions: 5
```

**Cost:** $0.0000041667 per GB-second (always running)

---

## DynamoDB Cost Optimization

### On-Demand vs Provisioned

**On-Demand:** Unpredictable workloads

```yaml
BillingMode: PAY_PER_REQUEST
```

**Provisioned:** Predictable workloads with auto-scaling

```yaml
BillingMode: PROVISIONED
ReadCapacityUnits: 5
WriteCapacityUnits: 5
AutoScalingConfiguration: ...
```

### Batch Operations

```go
// ❌ Individual operations: 25 requests
for _, item := range items {
    client.PutItem(ctx, &dynamodb.PutItemInput{...})
}

// ✅ Batch: 1 request (up to 25 items)
client.BatchWriteItem(ctx, &dynamodb.BatchWriteItemInput{...})
```

### Archive Old Data to S3

```go
// Move data older than 90 days to S3
if item.Created.Before(time.Now().AddDate(0, 0, -90)) {
    archiveToS3(item)
    deleteFromDynamoDB(item.Key)
}
```

---

## S3 Cost Optimization

### Storage Classes

| Class       | Cost | Use Case              |
| ----------- | ---- | --------------------- |
| Standard    | $$   | Frequent access       |
| Standard-IA | $    | Infrequent (30+ days) |
| Glacier     | ¢    | Archive (90+ days)    |

### Lifecycle Policies

```yaml
S3Bucket:
  Type: AWS::S3::Bucket
  Properties:
    LifecycleConfiguration:
      Rules:
        - Id: MoveToIA
          Status: Enabled
          Transitions:
            - TransitionInDays: 30
              StorageClass: STANDARD_IA
        - Id: MoveToGlacier
          Status: Enabled
          Transitions:
            - TransitionInDays: 90
              StorageClass: GLACIER
```

---

## CloudWatch Cost Optimization

### Log Retention

```yaml
LogGroup:
  Type: AWS::Logs::LogGroup
  Properties:
    RetentionInDays: 7 # vs 'Never Expire'
```

**Cost:** $0.50 per GB-month (storage)

---

## Best Practices

1. ✅ Right-size Lambda memory (test to find optimal)
2. ✅ Use ARM64 for 20% cost savings
3. ✅ Use DynamoDB batch operations
4. ✅ Archive old data to S3/Glacier
5. ✅ Set CloudWatch log retention
6. ✅ Use S3 lifecycle policies
7. ✅ Choose on-demand vs provisioned based on workload
8. ❌ Don't over-allocate Lambda memory
9. ❌ Don't use provisioned concurrency unnecessarily
10. ❌ Don't keep logs forever

---

**Source:** AWS Cost Optimization Best Practices
