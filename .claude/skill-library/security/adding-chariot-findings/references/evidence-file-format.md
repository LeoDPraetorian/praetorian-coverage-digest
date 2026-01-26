# Evidence File Format

**Evidence files are customized finding data demonstrating verification and impact.**

Evidence files should NOT be arbitrary attachments. They should be structured documents that:
1. Provide context about the specific finding instance
2. Demonstrate verification (proof the issue is real)
3. Assess impact (business and technical consequences)
4. Include reproducible steps for client remediation

---

## Format Structure

Evidence files should follow this format:

### 1. Auxiliary Information (Context)

Provide specific context about the finding instance discovered.

**Example:**
```
Praetorian identified plaintext secrets stored in a Lambda's appsettings.json file.

Secrets, such as API keys or database credentials, in appsettings.json remain
unencrypted and readable by anyone with file access during builds, deployments,
or runtime inspection. Lambda packages this file into deployment artifacts (ZIPs),
which attackers can extract if they compromise CI/CD pipelines, repositories, or
function code.
```

### 2. Verification and Proof

**Purpose**: Demonstrate that the finding is real and exploitable.

**What to include:**
- Specific evidence of one instance of the issue
- Proof of successful exploitation or validation
- Methodology used to verify the finding
- Screenshots, command outputs, or API responses

**Example:**
```
Praetorian validated that the secret identified was valid by authenticating to
AWS CLI. Praetorian then investigated the arn:aws:iam::123456789012:user/vht-vpc-app
user and noted that the user had sensitive roles like IAMFullAccess assigned.
```

**Target Audience**: Client engineers and security team who need to validate the finding.

### 3. Impact Assessment

**Purpose**: Explain consequences if the vulnerability is exploited.

**Business Impact (for executives and managers):**
- Who can abuse the security gap?
- What is the level of compromise (confidentiality, data exfiltration, disruption, modification)?
- How does this impact the business if attack was performed successfully?
  - Compliance invalidation
  - Reputation cost
  - Customer-service provider relationship weakening
  - Financial loss

**Technical Impact (for engineers):**
- What can the attacker achieve technically?
- Level of access gained (read, write, execute, admin)
- Scope of affected resources
- Potential for lateral movement or privilege escalation

**Tie back to context:**
- Reference threat model terminal goals and user roles if applicable
- If business context is insufficient (e.g., posture review), focus on facts rather than creating imaginary business cases

**Example:**
```
Due to the high privileges associated with the compromised AWS users (i.e.,
IAMFullAccess), Praetorian has rated the severity of this exposure as high;
however, we would be happy to adjust that based on your input.
```

### 4. Steps to Reproduce (Remediation Support)

**Purpose**: Provide repeatable steps that client engineers can use to:
1. Validate the finding themselves
2. Identify all instances of the issue (not just the one you found)
3. Track remediation progress

**Requirements:**
- Environment-agnostic commands or procedures
- Reproducible by client without Praetorian access
- Should regenerate the list of impacted resources as client remediates

**Example:**
```bash
# List all Lambda functions with environment variables
aws lambda list-functions --query 'Functions[*].[FunctionName,Environment]' --output json

# Check each function for plaintext secrets in configuration
for func in $(aws lambda list-functions --query 'Functions[*].FunctionName' --output text); do
  aws lambda get-function --function-name "$func" --query 'Configuration.Environment.Variables'
done

# Download and inspect deployment packages
aws lambda get-function --function-name FUNCTION_NAME --query 'Code.Location'
# Extract ZIP and search for appsettings.json or similar configuration files
```

**Target Audience**: Client engineers responsible for remediation.

---

## Content Guidelines

### What Makes Good Evidence

✅ **Specific**: Concrete examples from the client environment
✅ **Verified**: Proven with actual commands or exploitation
✅ **Reproducible**: Client can validate independently
✅ **Actionable**: Clear impact and remediation guidance
✅ **Scoped**: Tied to specific assets and privileges

### What to Avoid

❌ **Generic**: "This could be exploited if..."
❌ **Theoretical**: "An attacker might be able to..."
❌ **Vague**: "Multiple issues were found"
❌ **Unverified**: "This appears to be vulnerable"
❌ **Incomplete**: Missing impact or reproduction steps

---

## File Types

Evidence files can be:

1. **Markdown documents** (`.md`) - Structured writeups following format above
2. **Diagrams** (`.svg`, `.png`) - Attack chains, architecture, data flows
3. **Scripts** (`.sh`, `.py`) - Exploitation or enumeration scripts
4. **Command outputs** (`.txt`, `.log`) - Raw evidence of findings
5. **Reports** (`.pdf`) - Formatted client deliverables

**Best practice**: Use markdown for primary evidence, supplement with diagrams and scripts.

---

## Multi-Evidence Pattern

For findings with multiple pieces of evidence:

1. **Primary evidence file**: Markdown document following format above (context + verification + impact + reproduction)
2. **Supporting files**: Diagrams, scripts, outputs referenced by primary evidence
3. **CSV structure**: Multiple rows with same risk_id, different evidence files

**Example CSV:**
```csv
risk_id,asset_value,asset_type,asset_surface,risk_status,definition_name,evidence_file
lambda-secrets-exposure,arn:aws:lambda:us-east-1:123:function:app,aws,cloud,TH,lambda-secrets-exposure,./EVIDENCE.md
lambda-secrets-exposure,arn:aws:lambda:us-east-1:123:function:app,aws,cloud,TH,,./attack-chain.svg
lambda-secrets-exposure,arn:aws:lambda:us-east-1:123:function:app,aws,cloud,TH,,./enumeration.sh
```

**Note**: First row includes definition_name, subsequent rows leave it empty (already associated).

---

## Examples

### Example 1: IAM Privilege Escalation

**File**: `EVIDENCE.md`

```markdown
# IAM Developer Role Privilege Escalation - Production Environment

## Auxiliary Information

Praetorian identified an AWS IAM role `client-developer-role` with permissions
that allow privilege escalation through Lambda code injection.

The role has `lambda:UpdateFunctionCode` permission combined with overly permissive
`iam:PassRole` to execution roles with administrative privileges.

## Verification and Proof

Praetorian validated the escalation path:

1. Assumed the developer role via federated access (Okta SSO)
2. Updated Lambda function `data-processor` with malicious code
3. Triggered the function, which executed with the attached execution role
   `lambda-execution-admin` having `AdministratorAccess`
4. Extracted AWS credentials from execution context, gaining full admin access

Commands executed:
```bash
aws sts assume-role --role-arn arn:aws:iam::123456789012:role/client-developer-role
aws lambda update-function-code --function-name data-processor --zip-file fileb://payload.zip
aws lambda invoke --function-name data-processor output.json
# Execution role credentials extracted from output.json
```

## Impact Assessment

**Business Impact:**
- Full AWS account compromise from developer workstation compromise
- Production data exfiltration (customer PII, financial records)
- Service disruption through resource deletion or modification
- Compliance violations (SOC 2, PCI-DSS if payment data accessed)

**Technical Impact:**
- Privilege escalation: Developer → Administrator
- Attack surface: Any developer with federated access
- Persistence: Attacker can create backdoor IAM users/roles
- Lateral movement: Cross-account access via assumed roles

**Who can abuse:**
- External attacker with compromised developer workstation
- Malicious insider with developer access
- Supply chain attack compromising developer tools/credentials

## Steps to Reproduce

Enumerate all IAM roles with this escalation pattern:

```bash
# Find roles with lambda:UpdateFunctionCode
aws iam list-policies --scope Local --query 'Policies[*].[PolicyName,Arn]' | \
  grep -i lambda

# Check attached policies for each role
for role in $(aws iam list-roles --query 'Roles[*].RoleName' --output text); do
  echo "=== $role ==="
  aws iam list-attached-role-policies --role-name "$role"
  aws iam list-role-policies --role-name "$role"
done

# For each Lambda function, check execution role privileges
aws lambda list-functions --query 'Functions[*].[FunctionName,Role]' --output table
```

**Remediation:**
1. Remove `lambda:UpdateFunctionCode` from developer roles
2. Apply least privilege to Lambda execution roles
3. Implement `iam:PassRole` conditions restricting role assumption
```

### Example 2: S3 Bucket Public Exposure

**File**: `EVIDENCE.md`

```markdown
# Public S3 Bucket Exposure - Customer Data

## Auxiliary Information

Praetorian identified S3 bucket `client-prod-uploads` configured with
public read access, exposing customer-uploaded documents to the internet.

Bucket contains large volume of files including:
- Customer invoices with payment information
- Identity verification documents (driver's licenses, passports)
- Contract PDFs with confidential terms

## Verification and Proof

Praetorian validated public access without authentication:

```bash
# List bucket contents without AWS credentials
curl https://client-prod-uploads.s3.amazonaws.com/

# Download sample files demonstrating data exposure
wget https://client-prod-uploads.s3.amazonaws.com/uploads/2025/invoice-sample.pdf
wget https://client-prod-uploads.s3.amazonaws.com/kyc/id-document-sample.jpg
```

**Evidence files attached:**
- `sample-invoice.pdf` (redacted)
- `sample-id-document.jpg` (redacted)

## Impact Assessment

**Business Impact:**
- Data breach affecting customers
- GDPR violations (potential significant fines, up to 4% annual revenue)
- PCI-DSS non-compliance (loss of payment processing capability)
- Reputation damage and customer churn
- Class action lawsuit risk

**Technical Impact:**
- No authentication required (internet-accessible)
- Large volume of sensitive customer data exposed
- Files contain PII, financial data, and identity documents

**Who can abuse:**
- Any internet user (anonymous access)
- Automated scanners and threat actors
- Competitors performing reconnaissance

## Steps to Reproduce

Identify all public S3 buckets in the account:

```bash
# List all buckets
aws s3api list-buckets --query 'Buckets[*].Name' --output text

# Check each bucket's ACL and policy
for bucket in $(aws s3api list-buckets --query 'Buckets[*].Name' --output text); do
  echo "=== $bucket ==="
  aws s3api get-bucket-acl --bucket "$bucket"
  aws s3api get-bucket-policy --bucket "$bucket" 2>/dev/null || echo "No policy"
  aws s3api get-public-access-block --bucket "$bucket" 2>/dev/null || echo "No PAB"
done

# Test public access (no credentials needed)
curl https://BUCKET-NAME.s3.amazonaws.com/ -I
```

**Remediation:**
1. Enable S3 Block Public Access at account and bucket level
2. Remove public ACLs and bucket policies granting public access
3. Implement bucket policies requiring AWS authentication
4. Enable S3 access logging for incident response
```

---

## Related Skill Sections

- Phase 5 (Identify Evidence Files) - References this format
- CSV Format Specification - Multi-evidence pattern
- Risk Status Guide - Severity tied to impact assessment
