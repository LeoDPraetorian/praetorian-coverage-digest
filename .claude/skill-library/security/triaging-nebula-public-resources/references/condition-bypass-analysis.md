# IAM Policy Condition Bypass Analysis

**Understanding which policy conditions can and cannot be bypassed by external attackers.**

Extracted from `docs/public-resource-triage/08-CONDITION-BYPASS-ANALYSIS.md`.

---

## Core Principle

**If a policy has ANY non-bypassable condition, the resource is NOT publicly accessible.**

AWS IAM policy conditions fall into three categories:

1. **🔒 Non-Bypassable** - Set by AWS, cannot be forged → FALSE POSITIVES
2. **⚠️ Bypassable** - Controlled by caller, can be manipulated → TRUE POSITIVES
3. **🔐 Partial** - Depends on implementation details

---

## Multiple Condition Evaluation Logic

### Rule 1: Multiple Condition Operators = AND Logic

```json
{
  "Condition": {
    "StringEquals": { "aws:SourceVpc": "vpc-abc123" },
    "IpAddress": { "aws:SourceIp": "203.0.113.0/24" }
  }
}
```

**Evaluation:** Access granted ONLY if request comes from **vpc-abc123 AND from 203.0.113.0/24**

**Verdict:** ✅ FALSE POSITIVE - Both conditions must be satisfied

### Rule 2: Multiple Keys in Same Operator = AND Logic

```json
{
  "Condition": {
    "StringEquals": {
      "aws:PrincipalOrgID": "o-abc123",
      "aws:PrincipalType": "AssumedRole"
    }
  }
}
```

**Evaluation:** Access granted ONLY if principal is from **o-abc123 AND is AssumedRole**

**Verdict:** ✅ FALSE POSITIVE - Both conditions are non-bypassable

### Rule 3: Multiple Values for Same Key = OR Logic

```json
{
  "Condition": {
    "IpAddress": {
      "aws:SourceIp": ["203.0.113.0/24", "198.51.100.0/24"]
    }
  }
}
```

**Evaluation:** Access granted if request comes from **EITHER IP range**

**Verdict:**
- If all ranges are specific (not 0.0.0.0/0) → ✅ FALSE POSITIVE
- If any range is 0.0.0.0/0 → ⚠️ TRUE POSITIVE

---

## Critical Evaluation Rules

### Rule A: ANY Non-Bypassable Condition = Safe

If a policy has **even ONE** non-bypassable condition, the resource cannot be accessed publicly.

**Example:**

```json
{
  "Principal": "*",
  "Condition": {
    "StringEquals": { "aws:PrincipalOrgID": "o-abc123" },
    "StringEquals": { "aws:UserAgent": "MyApp/1.0" }
  }
}
```

**Analysis:**
- `PrincipalOrgID` = Non-bypassable (AWS-controlled)
- `UserAgent` = Bypassable (attacker can set)

**Verdict:** ✅ FALSE POSITIVE - PrincipalOrgID protects despite bypassable UserAgent

### Rule B: ALL Bypassable Conditions = Risk

If **ALL** conditions are bypassable, attacker can satisfy them.

**Example:**

```json
{
  "Principal": "*",
  "Condition": {
    "StringEquals": { "aws:UserAgent": "MyApp/1.0" },
    "StringEquals": { "aws:Referer": "https://example.com" }
  }
}
```

**Analysis:**
- `UserAgent` = Bypassable (attacker controls HTTP headers)
- `Referer` = Bypassable (attacker controls HTTP headers)

**Verdict:** ⚠️ TRUE POSITIVE - Attacker can set both headers

### Rule C: No Conditions = Maximum Risk

```json
{
  "Principal": "*",
  "Action": ["s3:GetObject"],
  "Resource": ["arn:aws:s3:::bucket/*"]
}
```

**Verdict:** ⚠️ TRUE POSITIVE - Unrestricted public access

---

## Non-Bypassable Conditions

These conditions are set by AWS and **CANNOT be forged** by attackers:

| Condition Key | What It Checks | Example Value |
|---------------|----------------|---------------|
| `aws:PrincipalOrgID` | AWS Organization ID | `o-abc123xyz` |
| `aws:SourceArn` | Requesting service ARN | `arn:aws:sns:...:topic` |
| `aws:SourceAccount` | Requesting AWS account | `123456789012` |
| `aws:SourceVpc` | VPC making request | `vpc-abc123` |
| `aws:SourceVpce` | VPC endpoint ID | `vpce-abc123` |
| `aws:PrincipalType` | Principal type | `AssumedRole`, `User` |
| `aws:SecureTransport` | Using HTTPS | `true` |
| `s3:x-amz-server-side-encryption` | SSE method | `AES256` |
| `s3:x-amz-server-side-encryption-aws-kms-key-id` | KMS key used | `arn:aws:kms:...:key/...` |

**Why non-bypassable:** AWS sets these values based on the request's actual origin. External attackers cannot forge them.

---

## Bypassable Conditions

These conditions are controlled by the caller and **CAN be manipulated**:

| Condition Key | What It Checks | Example Value |
|---------------|----------------|---------------|
| `aws:UserAgent` | HTTP User-Agent header | `MyApp/1.0` |
| `aws:Referer` | HTTP Referer header | `https://example.com` |
| `s3:prefix` | S3 object prefix | `images/` |
| `s3:delimiter` | S3 delimiter | `/` |
| `s3:max-keys` | Max keys in list | `1000` |

**Why bypassable:** Attacker controls HTTP headers or API parameters.

---

## Partial Conditions (Context-Dependent)

### IP Address Restrictions

```json
{
  "Condition": {
    "IpAddress": { "aws:SourceIp": "203.0.113.0/24" }
  }
}
```

**Analysis:**
- Specific IP range (not 0.0.0.0/0) → ✅ FALSE POSITIVE (restricted to network)
- If 0.0.0.0/0 → ⚠️ TRUE POSITIVE (allows all IPs)
- If corporate network range → Depends (internal network access)

### Time-Based Restrictions

```json
{
  "Condition": {
    "DateGreaterThan": { "aws:CurrentTime": "2026-01-01T00:00:00Z" }
  }
}
```

**Analysis:** ⚠️ TRUE POSITIVE - Condition will eventually be satisfied

---

## Scanner's Context Permutation Testing

The Nebula scanner generates **100+ test contexts** per resource:

**For S3 Buckets (~147 contexts):**
- 3 base principals: anonymous, cross-account, CloudFront
- 6 condition dimensions: SecureTransport, PrincipalType, encryption, SourceAccount, SourceVpc, SourceVpce
- Tests all combinations

**If ANY tested context allows access → Resource is flagged**

**Example:**

```json
{
  "Principal": "*",
  "Condition": {
    "StringEquals": { "aws:PrincipalOrgID": "o-abc123" },
    "IpAddress": { "aws:SourceIp": "203.0.113.0/24" },
    "Bool": { "aws:SecureTransport": "true" }
  }
}
```

**Scanner tests:**
1. OrgID=o-abc123, SourceIp=203.0.113.0/24, SecureTransport=true → **ALLOWED** ✓
2. OrgID=o-abc123, SourceIp=absent, SecureTransport=true → **DENIED**
3. OrgID=absent, SourceIp=203.0.113.0/24, SecureTransport=true → **DENIED**
4. ... (many more permutations)

**Result:** Resource flagged because context #1 allows access

**However:** All three conditions are non-bypassable (OrgID, SourceIp, SecureTransport)
→ ✅ **FALSE POSITIVE** - Attacker must be in org + from specific IP + use HTTPS

---

## Triage Decision Tree

```
Policy has Principal: "*"?
  ├─ NO → FALSE POSITIVE (not wildcard principal)
  └─ YES → Check conditions
      │
      ├─ No Condition block → TRUE POSITIVE ⚠️
      │
      └─ Has Condition block
          │
          ├─ ANY condition is non-bypassable?
          │   └─ YES → FALSE POSITIVE ✅
          │
          └─ ALL conditions bypassable?
              └─ YES → TRUE POSITIVE ⚠️
```

---

## Common False Positive Patterns

### Pattern 1: Service-to-Service (SourceArn)

```json
{
  "Principal": { "AWS": "*" },
  "Condition": {
    "ArnEquals": { "aws:SourceArn": "arn:aws:sns:us-east-1:123456789012:topic" }
  }
}
```

**Verdict:** ✅ FALSE POSITIVE - Only that specific SNS topic can access

### Pattern 2: Organization-Restricted

```json
{
  "Principal": { "AWS": "*" },
  "Condition": {
    "StringEquals": { "aws:PrincipalOrgID": "o-abc123xyz" }
  }
}
```

**Verdict:** ✅ FALSE POSITIVE - Only organization members can access

### Pattern 3: VPC-Only Access

```json
{
  "Principal": "*",
  "Condition": {
    "StringEquals": { "aws:SourceVpc": "vpc-abc123" }
  }
}
```

**Verdict:** ✅ FALSE POSITIVE - Only accessible from VPC

### Pattern 4: CloudFront-Only

```json
{
  "Principal": "*",
  "Condition": {
    "StringEquals": { "aws:UserAgent": "Amazon CloudFront" }
  }
}
```

**Verdict:** ⚠️ TRUE POSITIVE - UserAgent is bypassable (attacker can set this header)

**Correct CloudFront restriction:**

```json
{
  "Principal": {
    "Service": "cloudfront.amazonaws.com"
  },
  "Condition": {
    "StringEquals": { "AWS:SourceArn": "arn:aws:cloudfront::123456789012:distribution/EDFDVBD6EXAMPLE" }
  }
}
```

---

## Real-World Examples

### Example 1: Combined Conditions (Safe)

```json
{
  "Principal": "*",
  "Condition": {
    "StringEquals": {
      "aws:PrincipalOrgID": "o-abc123",
      "aws:PrincipalType": "AssumedRole"
    },
    "IpAddress": {
      "aws:SourceIp": ["10.0.0.0/8", "172.16.0.0/12"]
    }
  }
}
```

**Evaluation:**
- ALL of: PrincipalOrgID (non-bypassable), PrincipalType (non-bypassable), SourceIp (one of private ranges)
- Attacker cannot satisfy PrincipalOrgID (not in organization)

**Verdict:** ✅ FALSE POSITIVE

### Example 2: Mixed Bypassable + Non-Bypassable (Safe)

```json
{
  "Principal": "*",
  "Condition": {
    "StringEquals": {
      "aws:SourceVpc": "vpc-abc123"
    },
    "StringEquals": {
      "aws:UserAgent": "MyApp/1.0"
    }
  }
}
```

**Evaluation:**
- SourceVpc (non-bypassable) AND UserAgent (bypassable)
- Attacker cannot satisfy SourceVpc (request must come from VPC)

**Verdict:** ✅ FALSE POSITIVE - SourceVpc protects despite bypassable UserAgent

### Example 3: All Bypassable (Risk)

```json
{
  "Principal": "*",
  "Condition": {
    "StringEquals": {
      "aws:UserAgent": "MyApp/1.0",
      "aws:Referer": "https://example.com"
    }
  }
}
```

**Evaluation:**
- UserAgent (bypassable) AND Referer (bypassable)
- Attacker can set both HTTP headers

**Verdict:** ⚠️ TRUE POSITIVE

---

## Quick Reference Table

| Policy Pattern | Verdict | Reason |
|----------------|---------|--------|
| No conditions | TRUE POSITIVE ⚠️ | Unrestricted |
| PrincipalOrgID present | FALSE POSITIVE ✅ | Organization-restricted |
| SourceArn present | FALSE POSITIVE ✅ | Service-restricted |
| SourceVpc present | FALSE POSITIVE ✅ | VPC-restricted |
| SourceVpce present | FALSE POSITIVE ✅ | VPC endpoint-restricted |
| SourceAccount present | FALSE POSITIVE ✅ | Account-restricted |
| ONLY UserAgent/Referer | TRUE POSITIVE ⚠️ | Bypassable headers |
| IpAddress specific ranges | FALSE POSITIVE ✅ | Network-restricted |
| IpAddress 0.0.0.0/0 | TRUE POSITIVE ⚠️ | Allows all IPs |

---

## Source Documentation

Extracted from:
- `docs/public-resource-triage/08-CONDITION-BYPASS-ANALYSIS.md` - Complete condition analysis
- AWS IAM Policy Evaluation Logic documentation
- Real-world scan results analysis
