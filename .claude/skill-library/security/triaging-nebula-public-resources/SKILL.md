---
name: triaging-nebula-public-resources
description: Use when triaging Nebula public-resource scanner output - systematic workflow for priority-based analysis, false positive identification, and AWS verification across 7+ resource types
allowed-tools: Read, Bash, Grep, Glob, TodoWrite, AskUserQuestion
---

# Triaging Nebula Public Resources

**Systematic workflow for triaging Nebula's public-resource scanner output using priority-based analysis, decision trees, and AWS CLI verification.**

> **You MUST use TodoWrite** before starting to track progress through the triage phases. Typical scans produce 1,000+ findings requiring systematic tracking.

## When to Use

Use this skill when:

- User has Nebula `public-resources` scan results to triage
- Analyzing AWS security posture for public exposure
- Validating scanner findings (85-90% false positive rate)
- Prioritizing remediation efforts across 7+ resource types

**Use this skill EVEN WHEN:**

- ⏰ "There's no time" - The systematic workflow is FASTER than ad-hoc analysis (P0 triage: 30-60 min)
- 👔 "Management says skip it" - Systematic methodology protects YOU from audit liability
- 💸 "I already spent hours manually reviewing" - Sunk cost fallacy. Use the workflow to validate your work.
- 🔥 "Emergency/production down" - Emergencies require MORE discipline, not less
- 📊 "Just give me a quick estimate" - Unverified estimates are professionally negligent

## Quick Reference

| Priority | Resource Types  | Count (Typical) | False Positive Rate (Verified) | Time Per Item |
| -------- | --------------- | --------------- | ------------------------------ | ------------- |
| **P0**   | S3, Lambda URLs | 12-15           | 0-10% (S3 policy analysis)     | 2-5 min       |
| **P1**   | EC2, RDS        | 100             | **~92%** (without SG check)    | 3-5 min       |
| **P1**   | EC2, RDS        |                 | 30-40% (with SG verification)  | + 2 min/SG    |
| **P3**   | SQS, SNS, EFS   | 1,000+          | ~99%                           | 30 sec        |

**Key Finding**: P1 false positive rate drops from 92% to 30-40% when security group verification is performed using Chariot CLI credentials.

## Core Principle

**Triage by priority, not by volume.** The 12-15 P0 resources represent 0.16% of findings but are the highest risk (anonymous internet access without AWS credentials).

## Workflow Overview

```
1. Load scan results
   ↓
2. Extract P0 resources (S3 + Lambda)
   ↓
3. Test S3 buckets (anonymous access)
   ↓
4. Test Lambda functions (Function URL + AuthType)
   ↓
5. Document TRUE/FALSE positives
   ↓
6. Move to P1 resources (EC2/RDS)
   ↓
7. Verify network controls
   ↓
8. Bulk dismiss P3 resources (SQS/SNS with conditions)
```

## Triage Process

### Step 1: Initialize Triage Session

**Create TodoWrite tracking:**

```
TodoWrite([
  { content: 'Step 1: Load and analyze scan results', status: 'in_progress', activeForm: 'Analyzing results' },
  { content: 'Step 2: Extract P0 resources (S3 + Lambda)', status: 'pending', activeForm: 'Extracting P0' },
  { content: 'Step 3: Test S3 buckets for anonymous access', status: 'pending', activeForm: 'Testing S3' },
  { content: 'Step 4: Test Lambda Function URLs', status: 'pending', activeForm: 'Testing Lambda' },
  { content: 'Step 5: Document P0 findings', status: 'pending', activeForm: 'Documenting P0' },
  { content: 'Step 6: Extract P1 resources (EC2 + RDS)', status: 'pending', activeForm: 'Extracting P1' },
  { content: 'Step 7: Verify network controls', status: 'pending', activeForm: 'Verifying network' },
  { content: 'Step 8: Bulk dismiss P3 resources', status: 'pending', activeForm: 'Dismissing P3' }
])
```

**Read scan results file** provided by user (typically JSON format from Nebula).

### Step 2: Resource Extraction by Priority

**For complete AWS CLI commands**, see [references/aws-cli-commands.md](references/aws-cli-commands.md).

**Extract P0 resources:**

```bash
# S3 Buckets
cat public-resources.json | jq -r '.[] | select(.TypeName == "AWS::S3::Bucket") | .Identifier'

# Lambda Functions
cat public-resources.json | jq -r '.[] | select(.TypeName == "AWS::Lambda::Function") | .Identifier'
```

**Count by priority** to understand scope:

```bash
cat public-resources.json | jq -r '.[].TypeName' | sort | uniq -c | sort -rn
```

### Step 3: P0 Triage - S3 Buckets

**For detailed S3 triage procedures**, see [references/s3-triage.md](references/s3-triage.md).

**Quick test for anonymous access:**

```bash
BUCKET="your-bucket-name"

# Test LIST access (most critical)
aws s3 ls "s3://$BUCKET/" --no-sign-request 2>&1

# Test GET access (if LIST fails)
aws s3 cp "s3://$BUCKET/README.md" - --no-sign-request 2>&1
```

**Decision tree:**

- ✅ LIST succeeds → **TRUE POSITIVE** (publicly listable)
- ✅ GET succeeds (but LIST fails) → **TRUE POSITIVE** (public read)
- ❌ Both fail with AccessDenied → Check Block Public Access settings (likely false positive)

**Check Block Public Access:**

```bash
aws s3api get-public-access-block --bucket "$BUCKET"
```

If all 4 settings = `true`, scanner creates "virtual Deny policy" → **FALSE POSITIVE**

### Step 4: P0 Triage - Lambda Functions

**For detailed Lambda triage procedures**, see [references/lambda-triage.md](references/lambda-triage.md).

**Check for Function URL:**

```bash
FUNCTION="your-function-name"

aws lambda get-function-url-config --function-name "$FUNCTION" 2>&1 | jq -r '.AuthType'
```

**Decision tree:**

- AuthType = `NONE` → **TRUE POSITIVE** (publicly invokable without credentials)
- AuthType = `AWS_IAM` → **FALSE POSITIVE** (requires AWS credentials)
- Error "ResourceNotFoundException" → **FALSE POSITIVE** (no Function URL configured)

**Scanner behavior:** Nebula checks both Function URL (AuthType) AND resource policy. If AuthType=NONE, flagged as P0 regardless of policy.

### Step 5: Document P0 Findings

Create structured output documenting:

**For each TRUE POSITIVE:**

- Resource identifier (bucket name / function name)
- Verification method (actual test performed)
- Evidence (command output showing public access)
- Recommended remediation

**For each FALSE POSITIVE:**

- Resource identifier
- Why it's a false positive (Block Public Access enabled, AuthType=AWS_IAM, etc.)
- Supporting evidence (command output)

### Step 6: P1 Triage - EC2 & RDS

**For detailed network verification**, see [references/network-verification.md](references/network-verification.md).

**Scanner limitation:** Nebula only checks for public IP/`PubliclyAccessible` flag. Does NOT verify:

- Security group rules (port access)
- Network ACLs
- Subnet route tables (IGW routes)
- Actual network connectivity

**5-step verification required:**

1. Confirm public IP/PubliclyAccessible flag
2. Check security group rules (must allow inbound from 0.0.0.0/0)
3. Check NACL rules
4. Verify subnet has IGW route
5. Port scan to confirm actual accessibility

**If any step fails → FALSE POSITIVE**

### Step 7: Network Controls Verification

**CRITICAL**: Use `accessing-aws-accounts-via-chariot` skill for automated verification via Chariot CLI credentials.

**For complete verification workflow**, see [references/ec2-rds-verification.md](references/ec2-rds-verification.md).

**Quick security group verification pattern:**

```bash
# Step 1: Get Chariot CLI credentials for account
CREDENTIAL_ID="..."  # Find via: praetorian --profile {PROFILE} chariot list credentials | jq -r '.[] | .[] | select(.type == "aws") | .credentialId' | head -1
ACCOUNT_ID="123456789012"  # AWS account ID from Nebula scan

praetorian --profile {PROFILE} chariot get credential "$CREDENTIAL_ID" \
  --type aws --parameters accountId "$ACCOUNT_ID" > /tmp/aws_creds.json

# Step 2: Export credentials (file-based to avoid token truncation)
export AWS_ACCESS_KEY_ID=$(cat /tmp/aws_creds.json | jq -r '.credentialValue.accessKeyId')
export AWS_SECRET_ACCESS_KEY=$(cat /tmp/aws_creds.json | jq -r '.credentialValue.secretAccessKey')
export AWS_SESSION_TOKEN=$(cat /tmp/aws_creds.json | jq -r '.credentialValue.sessionToken')

# Step 3: Check security group for 0.0.0.0/0 rules
aws ec2 describe-security-groups --group-ids sg-12345678 --region us-east-1 | \
  jq -r '.SecurityGroups[].IpPermissions[] | select(.IpRanges[]?.CidrIp == "0.0.0.0/0") |
    "Port: \(.FromPort // "ALL")-\(.ToPort // "ALL") Protocol: \(.IpProtocol)"'
```

**Decision tree:**
- Output shows ports → **TRUE POSITIVE** (internet accessible on those ports)
- Empty output → **FALSE POSITIVE** (security group blocks internet)

**Optional Step 4: Test actual connectivity:**

```bash
# SSH accessibility (CRITICAL if found)
nc -zv -w3 <public-ip> 22

# HTTP/HTTPS accessibility
curl --connect-timeout 5 http://<public-ip> -I
curl --connect-timeout 5 https://<public-ip> -I
```

### Step 8: Bulk Dismiss P3 Resources

**For P3 bulk analysis**, see [references/p3-bulk-dismiss.md](references/p3-bulk-dismiss.md).

**SQS/SNS ~99% false positives** because:

- All require AWS Signature v4 (valid AWS credentials)
- Most have `aws:SourceArn` conditions (only specific service can access)

**Quick pattern check:**

```bash
# Check for SourceArn condition
aws sqs get-queue-attributes --queue-url "$QUEUE_URL" --attribute-names Policy \
  | jq -r '.Attributes.Policy | fromjson | .Statement[].Condition | select(. != null) | keys[]' \
  | grep -i "SourceArn"
```

If `SourceArn` present → **FALSE POSITIVE** (99% confidence)

## Understanding Scanner Behavior

### Context Permutation Testing

Nebula tests **100+ request contexts per resource**:

- **S3 Buckets**: ~147 contexts (anonymous, cross-account, CloudFront, 6 condition dimensions)
- **Lambda Functions**: ~93 contexts (with/without Function URL, various conditions)

**If ANY context allows access → Resource is flagged**

This explains high false positive rates - scanner is extremely conservative.

### Organization Policies (SCPs/RCPs)

**For complete org policy guidance**, see [references/organization-policies.md](references/organization-policies.md).

Scanner supports `--org-policies` flag to reduce false positives by 20-40%.

**Quick export:**

```bash
aws organizations describe-policy --policy-id p-abc123xyz \
  --query 'Policy.Content' --output text > org-scps.json
```

Run scanner with org policies:

```bash
nebula aws recon public-resources \
  --org-policies org-scps.json \
  --output results.json
```

Resources allowed by policy but denied by SCP → Scanner skips them

## False Positive Patterns

### Pattern 1: Service-to-Service (SourceArn)

```json
{
  "Principal": { "AWS": "*" },
  "Condition": {
    "ArnEquals": {
      "aws:SourceArn": "arn:aws:sns:us-east-1:123456789012:topic"
    }
  }
}
```

**Verdict:** ✅ FALSE POSITIVE - Only that SNS topic can access

### Pattern 2: Organization-Restricted

```json
{
  "Principal": { "AWS": "*" },
  "Condition": {
    "StringEquals": {
      "aws:PrincipalOrgID": "o-abc123xyz"
    }
  }
}
```

**Verdict:** ✅ FALSE POSITIVE - Only org members can access

### Pattern 3: VPC-Only Access

```json
{
  "Principal": "*",
  "Condition": {
    "StringEquals": {
      "aws:SourceVpc": "vpc-abc123"
    }
  }
}
```

**Verdict:** ✅ FALSE POSITIVE - Only accessible from VPC

**For complete condition analysis**, see [references/condition-bypass-analysis.md](references/condition-bypass-analysis.md).

## Key Reminders

**Critical Scanner Limitations:**

1. ❌ Does NOT check resource state (running vs stopped)
2. ❌ Does NOT verify network connectivity (port scanning)
3. ❌ Does NOT check security groups or NACLs
4. ❌ Does NOT test actual HTTP access
5. ❌ Does NOT scan snapshots (RDS, EBS) or AMIs

**Automated verification IS possible** for EC2/RDS using Chariot CLI credentials (see Step 7 and [references/ec2-rds-verification.md](references/ec2-rds-verification.md)). This reduces false positive rate from 92% to 30-40%.

## Time Estimates

| Scope                 | Resources | Time Required |
| --------------------- | --------- | ------------- |
| Quick Triage (P0)     | 12-15     | 30-60 min     |
| Comprehensive (P0+P1) | 100-120   | 4-8 hours     |
| Complete Audit        | 7,000+    | 2-3 days      |

## Integration

### Called By

- Users with Nebula scan results
- Security analysts performing AWS security assessments
- `/triage-nebula` command (if implemented)

### Requires (invoke before starting)

| Skill                   | When | Purpose                        |
| ----------------------- | ---- | ------------------------------ |
| None - standalone skill | -    | Self-contained triage workflow |

### Calls (during execution)

| Skill                                  | Phase/Step | Purpose                                          |
| -------------------------------------- | ---------- | ------------------------------------------------ |
| `accessing-aws-accounts-via-chariot`   | Step 7     | Get AWS credentials for security group inspection |

### Pairs With (conditional)

| Skill                         | Trigger                           | Purpose                        |
| ----------------------------- | --------------------------------- | ------------------------------ |
| `verifying-before-completion` | Before claiming "triage complete" | Verify all P0 resources tested |
| `discovering-reusable-code`   | If automating triage              | Find existing AWS CLI scripts  |
| `accessing-aws-accounts-via-chariot` | P1 verification (Step 7) | Automate security group verification |

## References

- [references/aws-cli-commands.md](references/aws-cli-commands.md) - Complete command reference (400+ lines)
- [references/s3-triage.md](references/s3-triage.md) - Detailed S3 verification procedures
- [references/lambda-triage.md](references/lambda-triage.md) - Lambda Function URL testing
- [references/ec2-rds-verification.md](references/ec2-rds-verification.md) - **NEW**: Automated EC2/RDS verification via Chariot CLI
- [references/network-verification.md](references/network-verification.md) - EC2/RDS 5-step validation (legacy)
- [references/condition-bypass-analysis.md](references/condition-bypass-analysis.md) - IAM policy condition analysis
- [references/organization-policies.md](references/organization-policies.md) - AWS Organization SCP/RCP integration
- [references/p3-bulk-dismiss.md](references/p3-bulk-dismiss.md) - Bulk false positive patterns

## Related Skills

- `analyzing-iam-privilege-escalation-risks` - IAM policy analysis patterns
- `triaging-chariot-secrets` - Similar triage methodology for secrets
- `verifying-before-completion` - Final validation checklist

## Documentation Source

This skill leverages comprehensive research from:

- `docs/public-resource-triage/` (13 files, ~8,000 lines)
- Nebula scanner source code analysis
- AWS IAM policy evaluation logic
- Real-world scan results (7,299 resources across 152 accounts)
