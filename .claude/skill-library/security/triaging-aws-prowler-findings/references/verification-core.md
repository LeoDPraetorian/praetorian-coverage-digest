# AWS CLI Verification Commands Reference

Complete reference for verifying Prowler findings to eliminate false positives.

## Prerequisites

### AWS Profile Setup

```bash
# Configure named profile
aws configure --profile prowler-verification

# Or use environment variables
export AWS_PROFILE=prowler-verification
export AWS_DEFAULT_REGION=us-east-1

# Verify access
aws sts get-caller-identity
```

### Required IAM Permissions

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetBucketPolicy",
                "s3:GetBucketPolicyStatus",
                "s3:GetBucketAcl",
                "s3:GetPublicAccessBlock",
                "ec2:DescribeSecurityGroups",
                "ec2:DescribeInstances",
                "ec2:DescribeNetworkInterfaces",
                "ec2:DescribeAddresses",
                "route53:ListHostedZones",
                "route53:ListResourceRecordSets",
                "iam:GetPolicy",
                "iam:GetPolicyVersion",
                "iam:ListAttachedRolePolicies",
                "iam:ListEntitiesForPolicy",
                "lambda:GetFunction",
                "lambda:GetFunctionConfiguration",
                "cloudformation:DescribeStacks",
                "rds:DescribeDBInstances",
                "rds:DescribeDBSnapshots",
                "organizations:ListPoliciesForTarget",
                "organizations:DescribePolicy"
            ],
            "Resource": "*"
        }
    ]
}
```

---

## S3 Verification Commands

### Check 1: S3 Bucket Public Access

**Prowler Check**: `s3_bucket_public_access`

**Verification Goal**: Determine if bucket is truly publicly accessible or has IP/CloudFront restrictions.

```bash
BUCKET_NAME="arduino.tips"
PROFILE="prowler-verification"

# 1. Get bucket policy (most important check)
aws s3api get-bucket-policy \
    --bucket $BUCKET_NAME \
    --profile $PROFILE \
    --output json | jq -r '.Policy | fromjson'

# 2. Check public access block settings
aws s3api get-public-access-block \
    --bucket $BUCKET_NAME \
    --profile $PROFILE

# 3. Check bucket ACL
aws s3api get-bucket-acl \
    --bucket $BUCKET_NAME \
    --profile $PROFILE

# 4. External accessibility test (from outside AWS)
curl -I https://${BUCKET_NAME}.s3.amazonaws.com/
curl -I https://${BUCKET_NAME}.s3.us-east-1.amazonaws.com/

# 5. List bucket contents (will fail if properly restricted)
aws s3 ls s3://${BUCKET_NAME}/ --no-sign-request
```

**False Positive Indicators**:

- Policy has `Principal: "*"` BUT includes `Condition` with:
  - `IpAddress: aws:SourceIp` (CloudFront, corporate IPs)
  - `StringEquals: aws:SourceVpce` (VPC endpoint restriction)
  - `StringLike: aws:Referer` (referrer restrictions)
- Public access block is enabled (all four settings true)
- External curl returns 403 Forbidden

**True Positive Indicators**:

- Policy allows `s3:GetObject` with `Principal: "*"` and no `Condition`
- Bucket ACL grants read to "AllUsers" or "AuthenticatedUsers"
- External curl returns 200 OK or lists contents
- `aws s3 ls --no-sign-request` succeeds

---

### Check 2: S3 Cross-Account Access

**Prowler Check**: `s3_bucket_cross_account_access`

```bash
BUCKET_NAME="sensitive-data-bucket"
ACCOUNT_ID="698932310562"  # Your account

# Get bucket policy
aws s3api get-bucket-policy \
    --bucket $BUCKET_NAME \
    --profile $PROFILE \
    --output json | jq -r '.Policy | fromjson'

# Extract external account IDs from policy
aws s3api get-bucket-policy \
    --bucket $BUCKET_NAME \
    --profile $PROFILE \
    --output json | \
    jq -r '.Policy | fromjson | .Statement[] |
           select(.Principal.AWS) |
           .Principal.AWS |
           if type == "array" then .[] else . end' | \
    grep -oE '[0-9]{12}' | \
    grep -v "^$ACCOUNT_ID$" | \
    sort -u
```

**Review Criteria**:

- Document each external account ID found
- Verify if these are legitimate partners/vendors
- Check if access is still required (may be legacy)

---

## EC2 Verification Commands

### Check 3: Security Group 0.0.0.0/0 Rules

**Prowler Check**: `ec2_securitygroup_allow_ingress_from_internet_to_any_port`

```bash
SG_ID="sg-0fb17acaa2eed52ef"
PROFILE="prowler-verification"

# 1. Get security group ingress rules
aws ec2 describe-security-groups \
    --group-ids $SG_ID \
    --profile $PROFILE \
    --query 'SecurityGroups[0].IpPermissions'

# 2. Find instances using this security group
aws ec2 describe-instances \
    --filters "Name=instance.group-id,Values=$SG_ID" \
              "Name=instance-state-name,Values=running,stopped" \
    --profile $PROFILE \
    --query 'Reservations[].Instances[].[InstanceId,State.Name,InstanceType,PrivateIpAddress,PublicIpAddress]' \
    --output table

# 3. Check network interfaces (includes RDS, ELB, Lambda in VPC)
aws ec2 describe-network-interfaces \
    --filters "Name=group-id,Values=$SG_ID" \
    --profile $PROFILE \
    --query 'NetworkInterfaces[].[NetworkInterfaceId,Status,Description,PrivateIpAddress,Association.PublicIp]' \
    --output table

# 4. Get security group creation date and tags
aws ec2 describe-security-groups \
    --group-ids $SG_ID \
    --profile $PROFILE \
    --query 'SecurityGroups[0].[GroupName,Description,Tags]'
```

**False Positive Indicators**:

- No instances or network interfaces attached
- Only stopped instances (still requires cleanup but lower priority)
- Tagged as "legacy" or "unused"

**True Positive Indicators**:

- Attached to running instances with public IPs
- Attached to RDS, ELB, or other critical resources
- No tags indicating purpose

---

### Check 4: EC2 Instances with Outdated AMIs

**Prowler Check**: `ec2_instance_with_outdated_ami`

```bash
INSTANCE_ID="i-0123456789abcdef0"
PROFILE="prowler-verification"

# 1. Get instance AMI ID and launch time
aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --profile $PROFILE \
    --query 'Reservations[0].Instances[0].[ImageId,LaunchTime,InstanceType]' \
    --output table

# 2. Get AMI details
AMI_ID=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --profile $PROFILE --query 'Reservations[0].Instances[0].ImageId' --output text)
aws ec2 describe-images \
    --image-ids $AMI_ID \
    --profile $PROFILE \
    --query 'Images[0].[Name,CreationDate,DeprecationTime]' \
    --output table

# 3. Check if SSM patch compliance is tracked
aws ssm describe-instance-information \
    --filters "Key=InstanceIds,Values=$INSTANCE_ID" \
    --profile $PROFILE

# 4. Get patch compliance status
aws ssm describe-instance-patch-states \
    --instance-ids $INSTANCE_ID \
    --profile $PROFILE
```

**Validation Criteria**:

- AMI older than 90 days AND no SSM patching = HIGH RISK
- AMI older than 90 days BUT SSM compliant = MEDIUM RISK
- AMI deprecated by AWS = CRITICAL RISK

---

## Route53 Verification Commands

### Check 5: Dangling IP Subdomain Takeover

**Prowler Check**: `route53_dangling_ip_subdomain_takeover`

```bash
HOSTED_ZONE_ID="ZFQNHG8B9CXDK"
FLAGGED_IP="3.225.187.212"
SUBDOMAIN="1password-test.oniudra.cc"
PROFILE="prowler-verification"

# 1. Check if IP is still allocated to account
aws ec2 describe-addresses \
    --filters "Name=public-ip,Values=$FLAGGED_IP" \
    --profile $PROFILE

# 2. List all account Elastic IPs for comparison
aws ec2 describe-addresses \
    --profile $PROFILE \
    --query 'Addresses[].[PublicIp,InstanceId,AllocationId]' \
    --output table

# 3. Get DNS record details
aws route53 list-resource-record-sets \
    --hosted-zone-id $HOSTED_ZONE_ID \
    --profile $PROFILE \
    --query "ResourceRecordSets[?contains(Name, '$SUBDOMAIN')]"

# 4. Test HTTP/HTTPS connectivity
curl -I -m 5 http://$FLAGGED_IP
curl -I -m 5 https://$SUBDOMAIN

# 5. Resolve DNS record
dig +short $SUBDOMAIN
nslookup $SUBDOMAIN

# 6. Check if IP is in EC2 instance list (may be attached)
aws ec2 describe-instances \
    --filters "Name=ip-address,Values=$FLAGGED_IP" \
    --profile $PROFILE
```

**True Positive Indicators**:

- IP not in `describe-addresses` output (unallocated)
- Curl returns connection refused/timeout
- DNS resolves but IP is unresponsive
- IP not attached to any EC2 instance

**False Positive Indicators**:

- IP appears in `describe-addresses` (still owned)
- Curl returns expected content (e.g., "It works!" Apache page)
- IP attached to running instance

---

## IAM Verification Commands
