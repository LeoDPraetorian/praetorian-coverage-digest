# S3 Bucket Triage Procedures

**Detailed verification procedures for S3 buckets flagged by Nebula scanner.**

Extracted from `docs/public-resource-triage/01-S3-BUCKETS.md`.

---

## Priority: P0 (Critical)

**False Positive Rate:** 10-20%
**Time Per Bucket:** 2-5 minutes

---

## Scanner Detection Logic

1. Uses Cloud Control API to enumerate buckets
2. Retrieves bucket region dynamically
3. **Only scans buckets in specified regions** (important for missing buckets)
4. Creates "virtual Deny policy" if Block Public Access all enabled
5. Tests policy against ~147 context permutations
6. If **ANY** context allows access → Bucket flagged

---

## 3-Step Verification Workflow

### Step 1: Check Block Public Access

```bash
BUCKET="your-bucket-name"

aws s3api get-public-access-block --bucket "$BUCKET" 2>&1 | \
  jq -r '.PublicAccessBlockConfiguration'
```

**Look for:**

```json
{
  "BlockPublicAcls": true,
  "IgnorePublicAcls": true,
  "BlockPublicPolicy": true,
  "RestrictPublicBuckets": true
}
```

**If all 4 = `true`:** Scanner creates virtual Deny policy → **FALSE POSITIVE** (skip further tests)

**If any = `false`:** Continue to Step 2

### Step 2: Test Anonymous LIST Access

```bash
aws s3 ls "s3://$BUCKET/" --no-sign-request 2>&1
```

**Success output:**

```
2024-01-15 12:00:00     123456 file.txt
2024-01-15 12:00:01      78901 README.md
```

**Failure output:**

```
An error occurred (AccessDenied) when calling the ListObjectsV2 operation: Access Denied
```

**If succeeds:** **TRUE POSITIVE** ⚠️ - Publicly listable (stop here, don't need Step 3)

**If fails:** Continue to Step 3

### Step 3: Test Anonymous GET Access

```bash
# Test with known object (if you know one exists)
aws s3 cp "s3://$BUCKET/index.html" - --no-sign-request 2>&1

# Or test if any object is readable
aws s3 cp "s3://$BUCKET/README.md" - --no-sign-request 2>&1
```

**If succeeds:** **TRUE POSITIVE** ⚠️ - Public read access (objects readable but not listable)

**If fails:** Likely **FALSE POSITIVE** → Proceed to policy analysis

---

## Policy Analysis (If Anonymous Tests Fail)

### Get Bucket Policy

```bash
aws s3api get-bucket-policy --bucket "$BUCKET" 2>&1 | \
  jq -r '.Policy | fromjson'
```

### Check for Non-Bypassable Conditions

Look for these conditions in policy:

| Condition | Verdict |
|-----------|---------|
| `aws:PrincipalOrgID` | FALSE POSITIVE ✅ (org-restricted) |
| `aws:SourceVpc` | FALSE POSITIVE ✅ (VPC-only) |
| `aws:SourceVpce` | FALSE POSITIVE ✅ (VPC endpoint-only) |
| `aws:SourceArn` | FALSE POSITIVE ✅ (service-to-service) |
| `aws:SourceAccount` | FALSE POSITIVE ✅ (account-restricted) |

**If ANY present:** FALSE POSITIVE (cannot be bypassed by external attackers)

### Check Bucket ACLs

```bash
aws s3api get-bucket-acl --bucket "$BUCKET" 2>&1 | \
  jq -r '.Grants[] | select(.Grantee.URI == "http://acs.amazonaws.com/groups/global/AllUsers")'
```

**If returns results:** Bucket has public ACL grants → Investigate further

**If empty:** No public ACL grants

---

## Common False Positive Scenarios

### Scenario 1: Block Public Access Enabled

**Finding:** All 4 BPA settings = `true`

**Why False Positive:** Scanner creates virtual Deny policy. No public access possible even if policy/ACL allows.

**Evidence Required:** Screenshot of BPA settings

### Scenario 2: Organization-Restricted Policy

**Finding:**

```json
{
  "Principal": "*",
  "Condition": {
    "StringEquals": { "aws:PrincipalOrgID": "o-abc123xyz" }
  }
}
```

**Why False Positive:** Only organization members can access. External attackers cannot forge PrincipalOrgID.

**Evidence Required:** Policy JSON showing PrincipalOrgID condition

### Scenario 3: VPC-Only Access

**Finding:**

```json
{
  "Principal": "*",
  "Condition": {
    "StringEquals": { "aws:SourceVpc": "vpc-abc123" }
  }
}
```

**Why False Positive:** Only accessible from VPC. Not publicly accessible from internet.

**Evidence Required:** Policy JSON + subnet route table verification

### Scenario 4: Service-to-Service

**Finding:**

```json
{
  "Principal": { "Service": "cloudtrail.amazonaws.com" },
  "Action": "s3:PutObject",
  "Condition": {
    "StringEquals": { "aws:SourceArn": "arn:aws:cloudtrail:...:trail/..." }
  }
}
```

**Why False Positive:** Only specific service (CloudTrail) can write. Not public.

**Evidence Required:** Policy JSON showing service principal + SourceArn

---

## True Positive Scenarios

### Scenario 1: No Conditions + BPA Disabled

**Finding:**

```json
{
  "Principal": "*",
  "Action": ["s3:GetObject"],
  "Resource": ["arn:aws:s3:::bucket/*"]
}
```

**Block Public Access:** All disabled or some disabled

**Anonymous test:** `aws s3 ls` succeeds

**Verdict:** ⚠️ **TRUE POSITIVE** - Publicly accessible

**Remediation:**
1. Enable all 4 Block Public Access settings
2. Or remove wildcard principal from policy
3. Or add non-bypassable condition (PrincipalOrgID, SourceVpc)

### Scenario 2: Bypassable Conditions Only

**Finding:**

```json
{
  "Principal": "*",
  "Condition": {
    "StringEquals": { "aws:UserAgent": "MyApp/1.0" }
  }
}
```

**Anonymous test:** Fails with default User-Agent, succeeds with custom:

```bash
aws s3 ls "s3://$BUCKET/" --no-sign-request \
  --cli-read-timeout 10 \
  --cli-connect-timeout 10 \
  --endpoint-url-s3 http://localhost:4566  # Example: bypass
```

**Verdict:** ⚠️ **TRUE POSITIVE** - UserAgent is bypassable

**Remediation:** Replace UserAgent condition with non-bypassable condition

---

## Scanner Implementation Details

### Block Public Access as Virtual Deny Policy

From Nebula source code (lines 610-623):

When all 4 BPA settings enabled, scanner internally creates:

```json
{
  "Effect": "Deny",
  "Principal": "*",
  "Action": "s3:*",
  "Resource": "*"
}
```

This overrides any Allow policy → Bucket never flagged

### Region Filtering

```bash
# Scanner only checks buckets in specified regions
nebula aws recon public-resources --regions us-east-1,us-west-2

# This WILL NOT scan buckets in eu-west-1
```

**To scan all buckets globally:**

```bash
REGIONS=$(aws ec2 describe-regions --query 'Regions[*].RegionName' --output text | tr '\t' ',')
nebula aws recon public-resources --regions "$REGIONS" --output results.json
```

### Bucket Deduplication

Scanner tracks processed buckets using `account:bucket` key to prevent duplicate scanning across regions.

---

## Decision Matrix

| Test Result | BPA Enabled | Conditions | Verdict |
|-------------|-------------|------------|---------|
| Anonymous LIST succeeds | Any | Any | TRUE POSITIVE ⚠️ |
| Anonymous GET succeeds | Any | Any | TRUE POSITIVE ⚠️ |
| Both fail | All enabled | Any | FALSE POSITIVE ✅ |
| Both fail | Disabled | Non-bypassable present | FALSE POSITIVE ✅ |
| Both fail | Disabled | Only bypassable | Investigate further |
| Both fail | Disabled | No conditions | Investigate ACLs |

---

## Source Documentation

Extracted from:
- `docs/public-resource-triage/01-S3-BUCKETS.md` - Complete S3 guidance
- Nebula scanner source code analysis
- AWS S3 Block Public Access documentation
