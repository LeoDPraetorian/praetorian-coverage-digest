# AWS CLI Commands Reference

**Complete command reference for triaging Nebula public-resource scanner output.**

This reference consolidates all AWS CLI commands from the comprehensive documentation in `docs/public-resource-triage/`.

---

## Organization Policies (Run FIRST!)

Export your AWS Organization SCPs to reduce false positives by 20-40%.

```bash
# List all organization SCPs
aws organizations list-policies --filter SERVICE_CONTROL_POLICY \
  --query 'Policies[*].[Id,Name]' --output table

# Export a specific SCP
POLICY_ID="p-abc123xyz"
aws organizations describe-policy --policy-id "$POLICY_ID" --output json

# Export all SCPs to scanner format
# See docs/public-resource-triage/10-ORGANIZATION-POLICIES.md for complete script
```

**Run scanner with org policies:**

```bash
nebula aws recon public-resources \
  --org-policies org-scps.json \
  --regions us-east-1,us-west-2 \
  --output results.json
```

---

## Resource Extraction

Extract resources by priority from scanner output:

```bash
# S3 Buckets (P0)
cat public-resources.json | jq -r '.[] | select(.TypeName == "AWS::S3::Bucket") | .Identifier'

# Lambda Functions (P0)
cat public-resources.json | jq -r '.[] | select(.TypeName == "AWS::Lambda::Function") | .Identifier'

# EC2 Instances (P1)
cat public-resources.json | jq -r '.[] | select(.TypeName == "AWS::EC2::Instance") | .Identifier'

# RDS Databases (P1)
cat public-resources.json | jq -r '.[] | select(.TypeName == "AWS::RDS::DBInstance") | .Identifier'

# SQS Queues (P3)
cat public-resources.json | jq -r '.[] | select(.TypeName == "AWS::SQS::Queue") | .Identifier'

# SNS Topics (P3)
cat public-resources.json | jq -r '.[] | select(.TypeName == "AWS::SNS::Topic") | .Identifier'

# EFS FileSystems (P2)
cat public-resources.json | jq -r '.[] | select(.TypeName == "AWS::EFS::FileSystem") | .Identifier'

# Count by resource type
cat public-resources.json | jq -r '.[].TypeName' | sort | uniq -c | sort -rn

# Get accounts with most findings
cat public-resources.json | jq -r '.[] | .AccountId' | sort | uniq -c | sort -rn | head -10
```

---

## S3 Buckets (P0)

### Definitive Tests

```bash
BUCKET="your-bucket-name"

# 1. Check Block Public Access (all true = FALSE POSITIVE)
aws s3api get-public-access-block --bucket "$BUCKET" 2>&1 | \
  jq -r '.PublicAccessBlockConfiguration'

# 2. Test anonymous LIST (most critical)
aws s3 ls "s3://$BUCKET/" --no-sign-request 2>&1

# 3. Test anonymous GET (if LIST denied)
aws s3 cp "s3://$BUCKET/index.html" - --no-sign-request 2>&1

# 4. Get bucket policy for manual analysis
aws s3api get-bucket-policy --bucket "$BUCKET" 2>&1 | \
  jq -r '.Policy | fromjson'

# 5. Check bucket ACLs
aws s3api get-bucket-acl --bucket "$BUCKET" 2>&1 | \
  jq -r '.Grants[] | select(.Grantee.URI == "http://acs.amazonaws.com/groups/global/AllUsers")'
```

### Decision Tree

| Test Result | Verdict |
|-------------|---------|
| Block Public Access all enabled | FALSE POSITIVE |
| Anonymous LIST succeeds | TRUE POSITIVE ⚠️ |
| Anonymous GET succeeds (LIST fails) | TRUE POSITIVE ⚠️ |
| Both denied + non-bypassable condition | FALSE POSITIVE |

---

## Lambda Functions (P0)

### Function URL Tests

```bash
FUNCTION="your-function-name"

# 1. Check Function URL configuration
aws lambda get-function-url-config --function-name "$FUNCTION" 2>&1

# 2. Extract AuthType
AUTH_TYPE=$(aws lambda get-function-url-config --function-name "$FUNCTION" 2>&1 | \
  jq -r '.AuthType // "NO_URL"')

echo "AuthType: $AUTH_TYPE"

# 3. Get Function URL
FUNCTION_URL=$(aws lambda get-function-url-config --function-name "$FUNCTION" 2>&1 | \
  jq -r '.FunctionUrl // "none"')

# 4. Test Function URL (if exists)
if [ "$FUNCTION_URL" != "none" ]; then
  curl -X POST "$FUNCTION_URL" -d '{}' -w "\nHTTP: %{http_code}\n"
fi

# 5. Get resource policy
aws lambda get-policy --function-name "$FUNCTION" 2>&1 | \
  jq -r '.Policy | fromjson'
```

### Decision Tree

| AuthType | Verdict |
|----------|---------|
| NONE | TRUE POSITIVE ⚠️ (publicly invokable) |
| AWS_IAM | FALSE POSITIVE (requires credentials) |
| No Function URL | FALSE POSITIVE |

---

## EC2 Instances (P1)

### 5-Step Network Verification

```bash
INSTANCE="i-0abc123def456"

# Step 1: Get public IP
PUBLIC_IP=$(aws ec2 describe-instances --instance-ids "$INSTANCE" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
echo "Public IP: $PUBLIC_IP"

# Step 2: Check instance state
STATE=$(aws ec2 describe-instances --instance-ids "$INSTANCE" \
  --query 'Reservations[0].Instances[0].State.Name' --output text)
echo "State: $STATE"

# Step 3: Check security groups for 0.0.0.0/0 rules
aws ec2 describe-security-groups \
  --group-ids $(aws ec2 describe-instances --instance-ids "$INSTANCE" \
    --query 'Reservations[0].Instances[0].SecurityGroups[*].GroupId' --output text) \
  --query 'SecurityGroups[].IpPermissions[?contains(IpRanges[].CidrIp, `0.0.0.0/0`)]'

# Step 4: Check subnet has IGW route
SUBNET=$(aws ec2 describe-instances --instance-ids "$INSTANCE" \
  --query 'Reservations[0].Instances[0].SubnetId' --output text)

aws ec2 describe-route-tables \
  --filters "Name=association.subnet-id,Values=$SUBNET" \
  --query 'RouteTables[0].Routes[?starts_with(GatewayId, `igw-`)]'

# Step 5: Port scan (if running and has public IP)
if [ "$STATE" = "running" ] && [ "$PUBLIC_IP" != "None" ]; then
  nmap -Pn "$PUBLIC_IP" -p 22,80,443,3389,8080,8443 --open
fi
```

### Decision Tree

| Check Fails | Verdict |
|-------------|---------|
| No public IP | FALSE POSITIVE |
| State = stopped/terminated | FALSE POSITIVE |
| No 0.0.0.0/0 security group rules | FALSE POSITIVE |
| No IGW route in subnet | FALSE POSITIVE |
| No open ports | FALSE POSITIVE |
| **All checks pass** | **TRUE POSITIVE** ⚠️ |

---

## RDS Databases (P1)

### 5-Step Network Verification

```bash
DB="my-database"

# Step 1: Confirm PubliclyAccessible flag
aws rds describe-db-instances --db-instance-identifier "$DB" \
  --query 'DBInstances[0].PubliclyAccessible'

# Step 2: Get endpoint and port
ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier "$DB" \
  --query 'DBInstances[0].Endpoint.Address' --output text)

PORT=$(aws rds describe-db-instances --db-instance-identifier "$DB" \
  --query 'DBInstances[0].Endpoint.Port' --output text)

echo "Endpoint: $ENDPOINT:$PORT"

# Step 3: Check security groups
aws ec2 describe-security-groups \
  --group-ids $(aws rds describe-db-instances --db-instance-identifier "$DB" \
    --query 'DBInstances[0].VpcSecurityGroups[*].VpcSecurityGroupId' --output text) \
  --query 'SecurityGroups[].IpPermissions[?contains(IpRanges[].CidrIp, `0.0.0.0/0`)]'

# Step 4: Check subnet has IGW route
SUBNET=$(aws rds describe-db-instances --db-instance-identifier "$DB" \
  --query 'DBInstances[0].DBSubnetGroup.Subnets[0].SubnetIdentifier' --output text)

aws ec2 describe-route-tables \
  --filters "Name=association.subnet-id,Values=$SUBNET" \
  --query 'RouteTables[0].Routes[?starts_with(GatewayId, `igw-`)]'

# Step 5: Connection test
nc -zv "$ENDPOINT" "$PORT" -w 5 2>&1
```

### Decision Tree

| Check Fails | Verdict |
|-------------|---------|
| PubliclyAccessible = false | FALSE POSITIVE |
| No 0.0.0.0/0 security group rules | FALSE POSITIVE |
| No IGW route in subnet | FALSE POSITIVE |
| Connection fails | FALSE POSITIVE |
| **All checks pass** | **TRUE POSITIVE** ⚠️ |

---

## SQS Queues (P3)

### Bulk False Positive Check

```bash
QUEUE_URL="https://sqs.us-east-1.amazonaws.com/123456789012/my-queue"

# Check for SourceArn condition (99% of cases)
aws sqs get-queue-attributes --queue-url "$QUEUE_URL" --attribute-names Policy \
  | jq -r '.Attributes.Policy | fromjson | .Statement[].Condition | select(. != null) | keys[]' \
  | grep -i "SourceArn"

# If SourceArn present → FALSE POSITIVE (99% confidence)
```

**Why ~99% false positives:**
- ALL SQS operations require AWS Signature v4 (valid credentials)
- Most have `aws:SourceArn` condition (only specific service can access)
- Principal `*` with conditions is NOT public access

---

## SNS Topics (P3)

### Bulk False Positive Check

```bash
TOPIC_ARN="arn:aws:sns:us-east-1:123456789012:my-topic"

# Get topic policy
aws sns get-topic-attributes --topic-arn "$TOPIC_ARN" \
  --query 'Attributes.Policy' --output text | jq -r 'fromjson'

# Check for service principal or SourceArn
aws sns get-topic-attributes --topic-arn "$TOPIC_ARN" \
  --query 'Attributes.Policy' --output text | jq -r 'fromjson | .Statement[] | .Condition | keys[]' \
  | grep -iE "SourceArn|SourceAccount"
```

**Why ~99% false positives:**
- ALL SNS operations require AWS credentials
- Most have service principals (s3.amazonaws.com, cloudwatch.amazonaws.com)
- SourceArn/SourceAccount conditions restrict to specific resources

---

## EFS FileSystems (P2)

### Mount Target Verification

```bash
FS_ID="fs-abc123def"

# Get mount targets
aws efs describe-mount-targets --file-system-id "$FS_ID"

# Check security groups for each mount target
MOUNT_TARGET_ID=$(aws efs describe-mount-targets --file-system-id "$FS_ID" \
  --query 'MountTargets[0].MountTargetId' --output text)

aws efs describe-mount-target-security-groups --mount-target-id "$MOUNT_TARGET_ID"

# Check if security groups allow 0.0.0.0/0 on port 2049 (NFS)
aws ec2 describe-security-groups \
  --group-ids $(aws efs describe-mount-target-security-groups --mount-target-id "$MOUNT_TARGET_ID" \
    --query 'SecurityGroups[0]' --output text) \
  --query 'SecurityGroups[].IpPermissions[?FromPort==`2049` && contains(IpRanges[].CidrIp, `0.0.0.0/0`)]'
```

**Decision:** EFS is VPC-mounted storage. Even with `*` in file system policy, mount targets are in VPCs with security groups. Check network path verification.

---

## Policy Analysis Commands

### Extract Policy Conditions

```bash
# S3 bucket policy conditions
aws s3api get-bucket-policy --bucket "$BUCKET" | \
  jq -r '.Policy | fromjson | .Statement[] | .Condition'

# Lambda resource policy conditions
aws lambda get-policy --function-name "$FUNCTION" | \
  jq -r '.Policy | fromjson | .Statement[] | .Condition'

# SQS queue policy conditions
aws sqs get-queue-attributes --queue-url "$QUEUE_URL" --attribute-names Policy | \
  jq -r '.Attributes.Policy | fromjson | .Statement[] | .Condition'
```

### Check for Non-Bypassable Conditions

```bash
# Look for organization restrictions
jq '.Statement[].Condition | select(.StringEquals."aws:PrincipalOrgID" != null)'

# Look for VPC restrictions
jq '.Statement[].Condition | select(.StringEquals."aws:SourceVpc" != null)'

# Look for SourceArn restrictions
jq '.Statement[].Condition | select(.ArnEquals."aws:SourceArn" != null)'
```

---

## Batch Processing Scripts

### Process All S3 Buckets

```bash
#!/bin/bash
# Process all flagged S3 buckets

cat public-resources.json | jq -r '.[] | select(.TypeName == "AWS::S3::Bucket") | .Identifier' | \
while read BUCKET; do
  echo "=== Testing $BUCKET ==="

  # Check Block Public Access
  BPA=$(aws s3api get-public-access-block --bucket "$BUCKET" 2>&1 | \
    jq -r '.PublicAccessBlockConfiguration | [.BlockPublicAcls, .IgnorePublicAcls, .BlockPublicPolicy, .RestrictPublicBuckets] | all')

  if [ "$BPA" = "true" ]; then
    echo "FALSE POSITIVE - Block Public Access enabled"
    continue
  fi

  # Test anonymous access
  if aws s3 ls "s3://$BUCKET/" --no-sign-request 2>&1 | grep -qv "AccessDenied"; then
    echo "TRUE POSITIVE ⚠️ - Publicly listable!"
  else
    echo "FALSE POSITIVE - Access denied"
  fi
done
```

### Process All Lambda Functions

```bash
#!/bin/bash
# Process all flagged Lambda functions

cat public-resources.json | jq -r '.[] | select(.TypeName == "AWS::Lambda::Function") | .Identifier' | \
while read FUNCTION; do
  echo "=== Testing $FUNCTION ==="

  AUTH_TYPE=$(aws lambda get-function-url-config --function-name "$FUNCTION" 2>&1 | \
    jq -r '.AuthType // "NO_URL"')

  if [ "$AUTH_TYPE" = "NONE" ]; then
    echo "TRUE POSITIVE ⚠️ - AuthType=NONE"
  else
    echo "FALSE POSITIVE - AuthType=$AUTH_TYPE"
  fi
done
```

---

## Time-Saving Aliases

Add to `~/.bashrc` or `~/.zshrc`:

```bash
# Nebula triage aliases
alias nebula-s3='cat public-resources.json | jq -r ".[] | select(.TypeName == \"AWS::S3::Bucket\") | .Identifier"'
alias nebula-lambda='cat public-resources.json | jq -r ".[] | select(.TypeName == \"AWS::Lambda::Function\") | .Identifier"'
alias nebula-ec2='cat public-resources.json | jq -r ".[] | select(.TypeName == \"AWS::EC2::Instance\") | .Identifier"'
alias nebula-rds='cat public-resources.json | jq -r ".[] | select(.TypeName == \"AWS::RDS::DBInstance\") | .Identifier"'
alias nebula-count='cat public-resources.json | jq -r ".[].TypeName" | sort | uniq -c | sort -rn'
```

---

## Source Documentation

All commands extracted from:

- `docs/public-resource-triage/QUICK-REFERENCE.md` - Primary command source
- `docs/public-resource-triage/01-S3-BUCKETS.md` - S3 verification procedures
- `docs/public-resource-triage/02-LAMBDA-FUNCTIONS.md` - Lambda testing
- `docs/public-resource-triage/03-EC2-INSTANCES.md` - EC2 network validation
- `docs/public-resource-triage/04-RDS-DATABASES.md` - RDS network validation
- `docs/public-resource-triage/05-SQS-QUEUES.md` - SQS pattern analysis
- `docs/public-resource-triage/06-SNS-TOPICS.md` - SNS pattern analysis
- `docs/public-resource-triage/07-EFS-FILESYSTEMS.md` - EFS mount target checks
- `docs/public-resource-triage/10-ORGANIZATION-POLICIES.md` - Org SCP integration
