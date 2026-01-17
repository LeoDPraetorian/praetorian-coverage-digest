# Lambda Function Triage Procedures

**Detailed verification procedures for Lambda functions flagged by Nebula scanner.**

Extracted from `docs/public-resource-triage/02-LAMBDA-FUNCTIONS.md`.

---

## Priority: P0 (Critical)

**False Positive Rate:** 20-30%
**Time Per Function:** 1-2 minutes

---

## Scanner Detection Logic

**Critical Update:** Scanner DOES check Function URLs and AuthType (corrected from earlier documentation).

Detection chain:

1. CloudControl API → Enumerate Lambda functions
2. Check if Function URL exists → `get-function-url-config`
3. If Function URL exists, check AuthType:
   - `AuthType=NONE` → **Automatic P0 flag** (publicly invokable)
   - `AuthType=AWS_IAM` → Evaluate with resource policy (may still flag)
4. Tests resource policy against ~93 context permutations
5. If ANY context allows access → Function flagged

---

## 2-Step Verification Workflow

### Step 1: Check Function URL (PRIMARY CHECK)

```bash
FUNCTION="your-function-name"

aws lambda get-function-url-config --function-name "$FUNCTION" 2>&1
```

**Possible outputs:**

**Output A: Function URL with AuthType=NONE**

```json
{
  "FunctionUrl": "https://abc123xyz.lambda-url.us-east-1.on.aws/",
  "AuthType": "NONE",
  "CreationTime": "2024-01-15T12:00:00.000Z"
}
```

**Verdict:** ⚠️ **TRUE POSITIVE** - Publicly invokable without AWS credentials

**Output B: Function URL with AuthType=AWS_IAM**

```json
{
  "FunctionUrl": "https://abc123xyz.lambda-url.us-east-1.on.aws/",
  "AuthType": "AWS_IAM",
  "CreationTime": "2024-01-15T12:00:00.000Z"
}
```

**Verdict:** **FALSE POSITIVE** - Requires AWS IAM authentication (Signature v4)

**Output C: No Function URL**

```
An error occurred (ResourceNotFoundException) when calling the GetFunctionUrlConfig operation:
The resource you requested does not exist.
```

**Verdict:** Likely **FALSE POSITIVE** - Continue to Step 2 (policy analysis)

### Step 2: Analyze Resource Policy

If no Function URL or AuthType=AWS_IAM, check resource policy:

```bash
aws lambda get-policy --function-name "$FUNCTION" 2>&1 | \
  jq -r '.Policy | fromjson'
```

**Check for non-bypassable conditions:**

| Condition | Verdict |
|-----------|---------|
| `aws:SourceArn` | FALSE POSITIVE ✅ (service-to-service) |
| `aws:SourceAccount` | FALSE POSITIVE ✅ (account-restricted) |
| `aws:PrincipalOrgID` | FALSE POSITIVE ✅ (org-restricted) |
| `aws:SourceVpc` | FALSE POSITIVE ✅ (VPC-only) |

**If ANY present:** FALSE POSITIVE

---

## HTTP Access Test (For Function URLs)

If Function URL exists, test actual invokability:

```bash
FUNCTION_URL=$(aws lambda get-function-url-config --function-name "$FUNCTION" 2>&1 | \
  jq -r '.FunctionUrl // "none"')

if [ "$FUNCTION_URL" != "none" ]; then
  # Test with empty POST
  curl -X POST "$FUNCTION_URL" -d '{}' -w "\nHTTP: %{http_code}\n"
fi
```

**Expected responses:**

| HTTP Code | AuthType | Verdict |
|-----------|----------|---------|
| 200/201 | NONE | TRUE POSITIVE ⚠️ (works without auth) |
| 403 Forbidden | AWS_IAM | FALSE POSITIVE ✅ (requires signature) |
| 404 Not Found | Any | Function not found (error) |

---

## Common False Positive Scenarios

### Scenario 1: Function URL with AWS_IAM Auth

**Finding:**

```json
{
  "FunctionUrl": "https://abc123xyz.lambda-url.us-east-1.on.aws/",
  "AuthType": "AWS_IAM"
}
```

**Why False Positive:** Requires AWS Signature v4 authentication. Cannot be invoked anonymously.

**Test:**

```bash
curl -X POST "https://abc123xyz.lambda-url.us-east-1.on.aws/" -d '{}'
# Returns: 403 Forbidden - Missing Authentication Token
```

**Evidence Required:** Screenshot of AuthType=AWS_IAM + curl 403 response

### Scenario 2: Service-to-Service Invocation

**Finding:**

```json
{
  "Principal": {
    "Service": "s3.amazonaws.com"
  },
  "Action": "lambda:InvokeFunction",
  "Condition": {
    "ArnLike": {
      "aws:SourceArn": "arn:aws:s3:::my-bucket/*"
    }
  }
}
```

**Why False Positive:** Only S3 bucket `my-bucket` can invoke. Service principal + SourceArn condition = NOT public.

**Evidence Required:** Policy JSON showing service principal + SourceArn

### Scenario 3: API Gateway Invocation

**Finding:**

```json
{
  "Principal": {
    "Service": "apigateway.amazonaws.com"
  },
  "Action": "lambda:InvokeFunction",
  "Condition": {
    "ArnLike": {
      "aws:SourceArn": "arn:aws:execute-api:us-east-1:123456789012:abc123xyz/*"
    }
  }
}
```

**Why False Positive:** Only specific API Gateway can invoke. Lambda itself not publicly accessible (check API Gateway separately).

**Evidence Required:** Policy JSON + API Gateway authentication configuration

### Scenario 4: Organization-Restricted

**Finding:**

```json
{
  "Principal": "*",
  "Action": "lambda:InvokeFunction",
  "Condition": {
    "StringEquals": {
      "aws:PrincipalOrgID": "o-abc123xyz"
    }
  }
}
```

**Why False Positive:** Only organization members can invoke. External attackers cannot forge PrincipalOrgID.

**Evidence Required:** Policy JSON showing PrincipalOrgID condition

---

## True Positive Scenarios

### Scenario 1: Function URL with AuthType=NONE

**Finding:**

```json
{
  "FunctionUrl": "https://abc123xyz.lambda-url.us-east-1.on.aws/",
  "AuthType": "NONE"
}
```

**Test:**

```bash
curl -X POST "https://abc123xyz.lambda-url.us-east-1.on.aws/" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'

# Returns: 200 OK with function response (NO authentication required)
```

**Verdict:** ⚠️ **TRUE POSITIVE** - Publicly invokable from internet

**Remediation:**

1. Change AuthType to AWS_IAM:
   ```bash
   aws lambda update-function-url-config \
     --function-name "$FUNCTION" \
     --auth-type AWS_IAM
   ```

2. Or delete Function URL:
   ```bash
   aws lambda delete-function-url-config --function-name "$FUNCTION"
   ```

3. Or add non-bypassable condition to resource policy

### Scenario 2: Wildcard Principal with No Conditions

**Finding:**

```json
{
  "Principal": "*",
  "Action": "lambda:InvokeFunction",
  "Resource": "arn:aws:lambda:us-east-1:123456789012:function:my-function"
}
```

**No Function URL configured**

**Verdict:** ⚠️ **TRUE POSITIVE** - Policy allows anyone to invoke (via AWS API with their own credentials)

**Note:** Less severe than Function URL with AuthType=NONE (requires AWS credentials, not anonymous), but still publicly accessible to any AWS account.

**Remediation:**

1. Remove wildcard principal
2. Or add non-bypassable condition (PrincipalOrgID, SourceAccount)

### Scenario 3: Bypassable Conditions Only

**Finding:**

```json
{
  "Principal": "*",
  "Action": "lambda:InvokeFunction",
  "Condition": {
    "StringEquals": {
      "aws:UserAgent": "MyApp/1.0"
    }
  }
}
```

**Verdict:** ⚠️ **TRUE POSITIVE** - UserAgent is bypassable (attacker can set header)

**Remediation:** Replace UserAgent with non-bypassable condition

---

## Scanner Behavior: Function URL + Policy Evaluation

The scanner evaluates **both** Function URL and resource policy:

| Function URL | Policy | Scanner Behavior |
|--------------|--------|------------------|
| AuthType=NONE | Any | **ALWAYS FLAGGED** (P0) |
| AuthType=AWS_IAM | Principal `*` + non-bypassable condition | Flagged, but FALSE POSITIVE |
| AuthType=AWS_IAM | Principal `*` + NO condition | Flagged, TRUE POSITIVE (P3) |
| No Function URL | Principal `*` + non-bypassable condition | Flagged, FALSE POSITIVE |
| No Function URL | Principal `*` + NO condition | Flagged, TRUE POSITIVE (P3) |

---

## Decision Matrix

| Function URL | AuthType | Policy Conditions | Verdict |
|--------------|----------|-------------------|---------|
| Exists | NONE | Any | TRUE POSITIVE ⚠️ |
| Exists | AWS_IAM | Any | FALSE POSITIVE ✅ |
| None | N/A | Non-bypassable present | FALSE POSITIVE ✅ |
| None | N/A | Only bypassable | TRUE POSITIVE ⚠️ (P3) |
| None | N/A | No conditions | TRUE POSITIVE ⚠️ (P3) |

---

## Priority Classification

| Scenario | Priority | Severity |
|----------|----------|----------|
| Function URL + AuthType=NONE | P0 | CRITICAL - Anonymous internet access |
| Function URL + AuthType=AWS_IAM | P3 | Low - Requires AWS credentials |
| No URL + Principal `*` + No conditions | P3 | Low - Requires AWS API access |
| No URL + Non-bypassable conditions | P3 | False positive |

---

## Source Documentation

Extracted from:
- `docs/public-resource-triage/02-LAMBDA-FUNCTIONS.md` - Complete Lambda guidance
- Nebula scanner source code analysis (corrected AuthType detection)
- AWS Lambda Function URLs documentation
