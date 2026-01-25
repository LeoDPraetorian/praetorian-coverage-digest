# Secret Classification Framework

**Comprehensive methodology for classifying secrets flagged by Prowler's `awslambda_function_no_secrets_in_variables` and `cloudwatch_log_group_no_secrets_in_logs` checks.**

> **CRITICAL**: Prowler has a HIGH false positive rate for secret detection (~40-60%). It uses regex patterns that match variable NAMES containing keywords like "SECRET", "KEY", "TOKEN" regardless of whether the VALUE is actually a secret. **You MUST classify each finding.**

---

## Step 1: Extract Deduplicated Secret List

Before classification, extract unique secrets from Prowler output to avoid redundant analysis.

### Lambda Function Secrets

```bash
# Get all unique Lambda functions flagged for secrets
awk -F';' 'NR>1 && $14=="FAIL" && $11=="awslambda_function_no_secrets_in_variables" {print $21}' \
    prowler-output.csv | sort -u > lambda-secrets-functions.txt

# Get the specific variable names flagged (from STATUS_EXTENDED column)
awk -F';' 'NR>1 && $14=="FAIL" && $11=="awslambda_function_no_secrets_in_variables" {print $15}' \
    prowler-output.csv | sort -u > lambda-secrets-variables.txt

# Count unique variable patterns to identify common false positive patterns
cat lambda-secrets-variables.txt | grep -oE 'variable [A-Z_]+' | sort | uniq -c | sort -rn

# Example output:
#   22 variable DD_API_KEY_SECRET_ARN      ← Likely FALSE POSITIVE (ARN reference)
#   18 variable AUTH0_SECRET               ← Likely TRUE POSITIVE
#    6 variable MAILGUN_PRIVATE_KEY        ← Likely TRUE POSITIVE
#    4 variable GIT_COMMIT_LONG            ← Likely FALSE POSITIVE (git hash)
```

### CloudWatch Log Secrets

```bash
# Get CloudWatch log group secrets
awk -F';' 'NR>1 && $14=="FAIL" && $11=="cloudwatch_log_group_no_secrets_in_logs" {print $21 ";" $15}' \
    prowler-output.csv | sort -u > cloudwatch-secrets.txt

# Categorize by secret type
grep "AWS Access Key" cloudwatch-secrets.txt > cloudwatch-aws-keys.txt
grep "JSON Web Token" cloudwatch-secrets.txt > cloudwatch-jwts.txt
grep "Hex High Entropy" cloudwatch-secrets.txt > cloudwatch-hex-entropy.txt
```

---

## Step 2: Classification Categories

**Classify EVERY flagged secret into one of three categories:**

| Category | Indicator | Action | Risk Level |
|----------|-----------|--------|------------|
| ❌ **FALSE POSITIVE** | Value is ARN reference, config, or non-secret | Exclude from report | None |
| ✅ **TRUE POSITIVE** | Actual hardcoded credential in plaintext | Report as Critical/High | Critical |
| ⚠️ **KMS ENCRYPTED** | Value is encrypted blob, cannot verify | Report as "Unable to verify" | Unknown |

---

## Step 3: Classification Heuristics

### Pattern-Based Classification (Variable NAME)

| Variable Name Pattern | Initial Classification | Next Step |
|-----------------------|------------------------|-----------|
| `*_SECRET_ARN`, `*_KEY_ARN` | ❌ Likely FALSE POSITIVE | Verify value is ARN |
| `*_SECRET_NAME`, `*_KEY_NAME` | ❌ Likely FALSE POSITIVE | Value is name, not secret |
| `GIT_COMMIT*`, `BUILD_*`, `VERSION_*` | ❌ Likely FALSE POSITIVE | Hex strings are metadata |
| `DD_*` (Datadog variables) | ❓ Check value format | ARN = FP; plaintext = TP |
| `AUTH0_*`, `OKTA_*`, `COGNITO_*` | ✅ Likely TRUE POSITIVE | OAuth credentials |
| `GITHUB_*`, `GITLAB_*`, `BITBUCKET_*` | ✅ Likely TRUE POSITIVE | VCS credentials |
| `SENDGRID_*`, `MAILGUN_*`, `SES_*` | ✅ Likely TRUE POSITIVE | Email service credentials |
| `STRIPE_*`, `PAYPAL_*`, `BRAINTREE_*` | ✅ Likely TRUE POSITIVE | Payment credentials |
| `SLACK_*`, `DISCORD_*`, `TEAMS_*` | ✅ Likely TRUE POSITIVE | Messaging credentials |
| `*_PRIVATE_KEY`, `*_CLIENT_SECRET` | ✅ Likely TRUE POSITIVE | OAuth/API credentials |
| `HYDRA_SECRET`, `*_API_KEY` | ✅ Likely TRUE POSITIVE | Service credentials |
| `*_CONNECTION_STRING`, `*_DB_PASSWORD` | ✅ Likely TRUE POSITIVE | Database credentials |

### Value-Based Classification (Variable VALUE)

| Value Pattern | Classification | Rationale |
|---------------|----------------|-----------|
| `arn:aws:secretsmanager:*` | ❌ FALSE POSITIVE | Secrets Manager reference - actual secret stored securely |
| `arn:aws:ssm:*:parameter/*` | ❌ FALSE POSITIVE | SSM Parameter Store reference |
| `arn:aws:kms:*` | ❌ FALSE POSITIVE | KMS key ARN reference |
| 40-char hex string | ❓ Investigate | Could be git hash (FP) or API key (TP) - check variable name |
| `AQICAHg...` or `AQECAH...` (base64, 100+ chars) | ⚠️ KMS ENCRYPTED | KMS envelope encryption - cannot verify without key |
| `sk_live_*`, `sk_test_*` | ✅ TRUE POSITIVE | Stripe API key format |
| `SG.*` (starts with SG.) | ✅ TRUE POSITIVE | SendGrid API key format |
| `key-*` followed by hex | ✅ TRUE POSITIVE | Mailgun API key format |
| `ghp_*`, `gho_*`, `ghu_*`, `ghs_*` | ✅ TRUE POSITIVE | GitHub token formats |
| `xoxb-*`, `xoxp-*`, `xoxa-*` | ✅ TRUE POSITIVE | Slack token formats |
| `Bearer *`, `Basic *` | ✅ TRUE POSITIVE | Auth header with credential |
| Matches password entropy (mixed case, numbers, symbols, 16+ chars) | ✅ Likely TRUE POSITIVE | Probable password/secret |

### CloudWatch Log-Specific Classification

| Log Pattern | Classification | Rationale |
|-------------|----------------|-----------|
| "AWS Access Key" in EKS audit logs | ⚠️ Investigate | May be service account keys in API calls |
| "JSON Web Token" in Lambda/API logs | ❌ Often FALSE POSITIVE | JWTs in request logs are expected |
| "Hex High Entropy String" in old logs | ❌ Often FALSE POSITIVE | Request IDs, trace IDs, session IDs |
| Actual `AKIA*` with corresponding secret | ✅ TRUE POSITIVE | Exposed IAM credentials - rotate immediately |
| Password in stack trace | ✅ TRUE POSITIVE | Credential logged in error |

---

## Step 4: Verification Commands

### Batch Verification for Lambda Functions

```bash
# Batch verification for all flagged functions
while read func; do
    echo "=== $func ==="
    aws lambda get-function-configuration \
        --function-name "$func" \
        --profile <profile> \
        --query 'Environment.Variables' \
        --output json 2>/dev/null || echo "Access denied or function not found"
done < lambda-secrets-functions.txt > lambda-env-vars-dump.json

# Search dump for actual secrets vs references
grep -E '"arn:aws:(secretsmanager|ssm|kms):' lambda-env-vars-dump.json | wc -l  # FALSE POSITIVES
grep -E '"(sk_live_|SG\.|ghp_|xoxb-)' lambda-env-vars-dump.json               # TRUE POSITIVES
```

### Single Function Deep Inspection

```bash
# Get full environment for specific function
FUNCTION_NAME="auth-orch-delete-auth"
aws lambda get-function-configuration \
    --function-name $FUNCTION_NAME \
    --profile <profile> \
    --query 'Environment.Variables' \
    --output json | jq .

# Check if function uses KMS for env var encryption
aws lambda get-function-configuration \
    --function-name $FUNCTION_NAME \
    --profile <profile> \
    --query 'KMSKeyArn'
```

---

## Step 5: Classification Examples

### Example 1: FALSE POSITIVE - Secrets Manager ARN Reference

**Prowler flagged**: `DD_API_KEY_SECRET_ARN` in `datadog-forwarder`

**Verification**:
```json
{
    "DD_API_KEY_SECRET_ARN": "arn:aws:secretsmanager:us-east-1:123456789012:secret:/devops/datadog/api-key-KU8Ema"
}
```

**Analysis**: Variable NAME contains "KEY" and "SECRET" but VALUE is a Secrets Manager ARN. The actual secret is stored securely in Secrets Manager, not in the Lambda environment.

**Classification**: ❌ **FALSE POSITIVE** - Exclude from report

---

### Example 2: FALSE POSITIVE - Git Commit Hash

**Prowler flagged**: `GIT_COMMIT_LONG` as "Hex High Entropy String"

**Verification**:
```json
{
    "GIT_COMMIT_LONG": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
}
```

**Analysis**: 40-character hex string is a git SHA-1 commit hash, not a secret. Used for build traceability.

**Classification**: ❌ **FALSE POSITIVE** - Exclude from report

---

### Example 3: TRUE POSITIVE - Hardcoded OAuth Secret

**Prowler flagged**: `AUTH0_CLIENT_SECRET` in `auth-orch-delete-auth0`

**Verification**:
```json
{
    "AUTH0_CLIENT_SECRET": "abc123XyZ789actualSecretValue_with-special.chars"
}
```

**Analysis**: Plaintext Auth0 client secret. Attacker with Lambda:GetFunctionConfiguration permission can exfiltrate this credential and impersonate the application.

**Classification**: ✅ **TRUE POSITIVE - CRITICAL**

**Recommendation**: Migrate to Secrets Manager with `AUTH0_CLIENT_SECRET_ARN` pattern.

---

### Example 4: TRUE POSITIVE - Third-Party API Key

**Prowler flagged**: `SENDGRID_API_KEY` in `email-sender-prod`

**Verification**:
```json
{
    "SENDGRID_API_KEY": "SG.aBcDeFgHiJkLmNoPqRsTuVwXyZ.abcdefghijklmnopqrstuvwxyz123456"
}
```

**Analysis**: Hardcoded SendGrid API key (matches `SG.*` format). Can be used to send emails as the organization, potentially for phishing or spam.

**Classification**: ✅ **TRUE POSITIVE - HIGH**

---

### Example 5: KMS ENCRYPTED - Unable to Verify

**Prowler flagged**: `DATABASE_PASSWORD` in `backend-api-prod`

**Verification**:
```json
{
    "DATABASE_PASSWORD": "AQICAHgBpkH8VdEcZxL9K7m5XL8TpWwJkRtP..."
}
```

**Analysis**: Value starts with `AQICAHg` indicating KMS envelope encryption. The actual password is encrypted at rest. We cannot verify the content without KMS decrypt permissions.

**Classification**: ⚠️ **KMS ENCRYPTED - Manual verification required**

**Note**: KMS-encrypted environment variables are a security best practice. Report as "encrypted - unable to verify contents" rather than a vulnerability.

---

## Step 6: Report Format

### Grouping Requirements

**MANDATORY**: Group findings by classification, not by function name.

```markdown
### Lambda Functions with Secrets in Environment Variables

**Total Flagged**: 80 functions
**Classification Breakdown**:
- ✅ TRUE POSITIVE (Hardcoded Secrets): 24 functions
- ❌ FALSE POSITIVE (ARN References/Config): 52 functions
- ⚠️ KMS ENCRYPTED (Unable to Verify): 4 functions

#### TRUE POSITIVE - Hardcoded Secrets (24 functions)

**AUTH0_SECRET / AUTH0_CLIENT_SECRET** (18 functions):
1. auth-orch-delete-auth
2. auth-orch-delete-auth-immediate
3. auth-orch-delete-auth0
4. auth-orch-delete-auth0-immediate
... (complete list)

**SENDGRID_API_KEY** (2 functions):
1. sls-auth-orch-delete_sendgrid-prod
2. sls-auth-orch-delete_sendgrid-prod-immediate

**MAILGUN_PRIVATE_KEY** (6 functions):
1. wedo-email-api-authorize
2. wedo-email-api-mass-send-email
3. wedo-email-api-send-email
... (complete list)

**GITHUB_CLIENT_SECRET** (4 functions):
1. github-education-api-prod-authorize
2. github-education-api-prod-create_access_token
... (complete list)

#### FALSE POSITIVE - ARN References (52 functions)

**DD_API_KEY_SECRET_ARN** (22 functions):
All Datadog Forwarder functions - values are Secrets Manager ARN references.
Pattern: `arn:aws:secretsmanager:*:secret:/devops/datadog/*`

**GIT_COMMIT_LONG** (4 functions):
Git commit SHA hashes flagged as "Hex High Entropy String".
Pattern: 40-character lowercase hex string

#### KMS ENCRYPTED - Unable to Verify (4 functions)

**DATABASE_PASSWORD** (2 functions):
1. backend-api-prod
2. backend-api-staging

Values encrypted with KMS. Cannot verify without decrypt permissions.
```

---

## Quick Decision Tree

```
START: Prowler flags Lambda secret
  │
  ├─► Variable name ends with `_ARN` or `_NAME`?
  │     └─► YES → ❌ FALSE POSITIVE (reference pattern)
  │
  ├─► Value starts with `arn:aws:`?
  │     └─► YES → ❌ FALSE POSITIVE (AWS resource reference)
  │
  ├─► Value starts with `AQICAHg` or `AQECAH`?
  │     └─► YES → ⚠️ KMS ENCRYPTED (cannot verify)
  │
  ├─► Variable name is `GIT_COMMIT*` or `BUILD_*`?
  │     └─► YES → ❌ FALSE POSITIVE (build metadata)
  │
  ├─► Value matches known API key format (sk_live_, SG., ghp_, xoxb-)?
  │     └─► YES → ✅ TRUE POSITIVE (hardcoded credential)
  │
  ├─► Variable name contains `SECRET`, `KEY`, `TOKEN`, `PASSWORD`?
  │     └─► YES → Inspect VALUE:
  │           ├─► High entropy, no ARN → ✅ TRUE POSITIVE
  │           └─► Low entropy or URL → ❌ FALSE POSITIVE
  │
  └─► Default → ⚠️ MANUAL REVIEW REQUIRED
```

---

## Integration with Verification Workflow

This classification framework integrates with Phase 4 (Verify Critical Findings) of the main triage workflow:

1. **Extract**: Use Step 1 commands to get deduplicated secret list
2. **Classify**: Apply Step 3 heuristics to each unique variable/value pair
3. **Verify**: Use Step 4 commands to confirm classifications
4. **Document**: Use Step 6 format for final report

For CloudFormation stack secrets (`cloudformation_stack_outputs_find_secrets`), apply similar classification logic to stack output values.
