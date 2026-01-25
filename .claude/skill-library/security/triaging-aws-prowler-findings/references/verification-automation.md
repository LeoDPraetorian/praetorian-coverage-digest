## Batch Verification Scripts

### Verify All S3 Public Buckets

```bash
#!/bin/bash
PROFILE="prowler-verification"

# Get list of flagged buckets from Prowler
grep ";FAIL;.*s3_bucket_public_access" prowler-output.csv | \
    cut -d';' -f22 | \
    sort -u | while read bucket; do

    echo "Verifying: $bucket"

    # Check policy
    aws s3api get-bucket-policy \
        --bucket "$bucket" \
        --profile $PROFILE \
        --output json 2>/dev/null | \
        jq -r '.Policy | fromjson | .Statement[] | select(.Principal == "*") | .Condition // "NO_CONDITION"'

    # External test
    curl -I "https://${bucket}.s3.amazonaws.com/" 2>&1 | grep "HTTP"

    echo "---"
done
```

### Verify All Dangling IPs

```bash
#!/bin/bash
PROFILE="prowler-verification"

# Get all allocated IPs
ALLOCATED_IPS=$(aws ec2 describe-addresses \
    --profile $PROFILE \
    --query 'Addresses[].PublicIp' \
    --output text)

# Get flagged IPs from Prowler
grep ";FAIL;.*route53_dangling_ip" prowler-output.csv | \
    awk -F';' '{print $22}' | \
    grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | \
    sort -u | while read ip; do

    echo "Checking IP: $ip"

    if echo "$ALLOCATED_IPS" | grep -q "$ip"; then
        echo "  ✅ ALLOCATED - False Positive"
    else
        echo "  ⚠️  UNALLOCATED - True Positive"
        curl -I -m 3 "http://$ip" 2>&1 | head -1
    fi

    echo ""
done
```

---

## Error Handling

### Common Errors

**Access Denied**:

```bash
An error occurred (AccessDenied) when calling the GetBucketPolicy operation
```

**Solution**: Verify IAM permissions listed in prerequisites section.

**Resource Not Found**:

```bash
An error occurred (NoSuchBucket) when calling the GetBucketPolicy operation
```

**Solution**: Resource may have been deleted after Prowler scan. Mark as REMEDIATED.

**Rate Limiting**:

```bash
An error occurred (Throttling) when calling the DescribeInstances operation
```

**Solution**: Add delays between API calls or use batch operations where available.

---

## Best Practices

1. **Run verification in read-only mode** - Never modify resources during triage
2. **Document all commands** - Include in client report for transparency
3. **Batch similar checks** - Verify all S3 buckets together, all security groups together
4. **Use grep/awk/jq** - Parse Prowler CSV efficiently to extract resource IDs
5. **Create verification scripts** - Automate repetitive verification tasks
6. **Track verification rate** - Aim for >90% of critical findings verified
7. **Mark unverified findings** - Clearly label if verification wasn't possible

---

## Verification Tracking Template

```markdown
| Check ID | Resource | Prowler Status | Verified | Outcome | Evidence |
|----------|----------|----------------|----------|---------|----------|
| s3_bucket_public_access | arduino.tips | FAIL | ✅ | FALSE POSITIVE | Policy restricts to CloudFront IPs |
| route53_dangling_ip | 1password-test.oniudra.cc | FAIL | ✅ | TRUE POSITIVE | IP unallocated, returns 403 |
| ec2_securitygroup_* | sg-0fb17ac | FAIL | ✅ | FALSE POSITIVE | No instances attached |
| iam_policy_allows_* | AuthOrchCI | FAIL | ✅ | TRUE POSITIVE | Unrestricted iam:AttachUserPolicy |
```

---

## Complete Resource List Requirement
