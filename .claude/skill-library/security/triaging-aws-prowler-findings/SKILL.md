---
name: triaging-aws-prowler-findings
description: Use when analyzing AWS Prowler security findings - systematically identifies exploitable vulnerabilities and severe misconfigurations with false positive verification for risk-based prioritization (AWS-specific, see triaging-azure-prowler-findings for Azure)
allowed-tools: Read, Grep, Bash, TodoWrite, AskUserQuestion
---

# Triaging AWS Prowler Findings

**Systematic methodology for analyzing Prowler AWS security assessment outputs to identify exploitable vulnerabilities and business-critical misconfigurations with verification to eliminate false positives.**

**Note**: This skill focuses on AWS-specific Prowler findings. Prowler also supports Azure, GCP, Kubernetes, and Microsoft 365. For other cloud providers, see related skills.

## When to Use

Use this skill when:

- Analyzing Prowler CSV/JSON output files
- Prioritizing thousands of AWS security findings
- Identifying directly exploitable vulnerabilities
- Assessing business risk from misconfigurations
- Verifying critical findings and eliminating false positives

## Quick Reference

| Phase              | Focus                      | Output                         |
| ------------------ | -------------------------- | ------------------------------ |
| 1. Parse Output    | Load and validate CSV/JSON | Structured findings data       |
| 2. Exploitability  | Direct attack paths        | Tier 1 Critical findings       |
| 3. Business Risk   | Severe misconfigurations   | Tier 2 High-risk findings      |
| 4. Verify Findings | False positive elimination | Validated exploitable findings |

## Prerequisites

### AWS Access for Verification

**CRITICAL**: Before triaging, request AWS credentials to verify findings and eliminate false positives.

**Required permissions** (read-only):
- `s3:GetBucketPolicy`, `s3:GetBucketPolicyStatus`, `s3:GetBucketAcl`
- `ec2:DescribeSecurityGroups`, `ec2:DescribeInstances`, `ec2:DescribeAddresses`
- `route53:ListHostedZones`, `route53:ListResourceRecordSets`
- `iam:GetPolicy`, `iam:GetPolicyVersion`, `iam:ListAttachedRolePolicies`
- `lambda:GetFunction`, `lambda:GetFunctionConfiguration`

**AWS Profile Setup**:

```bash
# Request AWS profile from user
# Example: --profile prowler-verification or export AWS_PROFILE=prowler-verification

# Verify access
aws sts get-caller-identity --profile <profile-name>
```

**If verification credentials unavailable**: Proceed with triage but clearly mark findings as "UNVERIFIED - Manual validation required"

## Core Workflow

### Phase 1: Parse Prowler Output

**Objective**: Load Prowler results and validate structure.

**Prowler CSV Structure** (45 columns):

Key columns for triage:
- `STATUS`: PASS/FAIL/MANUAL
- `SEVERITY`: critical/high/medium/low/informational
- `CHECK_ID`: Unique check identifier
- `CHECK_TITLE`: Human-readable description
- `SERVICE_NAME`: AWS service (s3, iam, ec2, etc.)
- `RESOURCE_UID`: AWS ARN or identifier
- `RISK`: Adversary impact description
- `COMPLIANCE`: Framework mappings (CIS, NIST, ISO27001)
- `CATEGORIES`: Attack surface categories
- `REMEDIATION_RECOMMENDATION_TEXT`: Fix guidance
- `REMEDIATION_CODE_CLI`: AWS CLI remediation

**Validation checks**:

```bash
# Verify Prowler output format
head -1 prowler-output.csv | grep -q "AUTH_METHOD;TIMESTAMP;ACCOUNT_UID"

# Count total findings by status
grep -c "^profile:" prowler-output.csv

# Count FAIL findings by severity
grep ";FAIL;" prowler-output.csv | cut -d';' -f19 | sort | uniq -c
```

**See**: [references/prowler-csv-structure.md](references/prowler-csv-structure.md) for complete column reference

### Phase 2: Assess Exploitability

**Objective**: Identify findings with direct weaponization potential.

**Exploitability Framework**:

| Level    | Definition                                  | Time to Exploit | Example Checks                                        |
| -------- | ------------------------------------------- | --------------- | ----------------------------------------------------- |
| Critical | Immediate exploit, no AWS credentials       | Minutes         | `s3_bucket_public_access`, `route53_dangling_ip`      |
| High     | Exploit with minimal AWS access             | Hours           | `awslambda_function_no_secrets_in_variables`          |
| Medium   | Requires privileged AWS access              | Days            | `iam_policy_allows_privilege_escalation`              |
| Low      | Defense-in-depth gaps, not directly exposed | Weeks           | `cloudwatch_log_group_retention_policy_specific_days` |

**Priority Checks** (FAIL = immediate triage):

**Tier 1 - Immediate Exploitation**:

- `s3_bucket_public_access` - Unauthenticated data access
- `cloudformation_stack_outputs_find_secrets` - Exposed AWS keys
- `awslambda_function_no_secrets_in_variables` - Hardcoded credentials
- `route53_dangling_ip_subdomain_takeover` - Domain hijacking
- `ec2_securitygroup_allow_ingress_from_internet_to_any_port` - Full network exposure
- `ec2_ebs_public_snapshot` - Public disk images
- `rds_instance_storage_encrypted` + public - Unencrypted public database

**Tier 2 - Privilege Escalation**:

- `iam_policy_allows_privilege_escalation` - Account takeover paths
- `iam_inline_policy_allows_privilege_escalation` - Inline privilege abuse
- `iam_role_cross_service_confused_deputy_prevention` - Cross-service attacks

**Tier 3 - Lateral Movement Enablers**:

- `ec2_instance_imdsv2_enabled` - Credential theft via IMDSv1
- `ec2_instance_older_than_specific_days` - Unpatched instances
- `ssm_managed_instance_compliance_patch_compliant` - Missing security patches

**Tier 4 - Informational (Non-Exploitable Monitoring Gaps)**:

**IMPORTANT**: Monitoring service gaps (GuardDuty, Access Analyzer, CloudTrail, etc.) are NOT directly exploitable vulnerabilities. These should be deprioritized to informational tier unless specifically requested by client.

- `guardduty_is_enabled` - Threat detection visibility gap (informational)
- `accessanalyzer_enabled` - Resource access visibility gap (informational)
- `cloudtrail_multi_region_enabled` - Audit log visibility gap (informational)
- `cloudwatch_log_group_retention_policy` - Log retention configuration (informational)

**Rationale**: These findings indicate missing monitoring capabilities but do not represent exploitable attack vectors. They should be reported separately from critical/high exploitability findings and typically ignored unless client explicitly requires compliance coverage.

**Filtering command**:

```bash
# Extract Critical + High FAIL findings
grep ";FAIL;" prowler-output.csv | \
  awk -F';' '$19 ~ /critical|high/ {print $12 ";" $13 ";" $19 ";" $22}' | \
  sort | uniq -c | sort -rn
```

**See**: [references/exploitability-scoring.md](references/exploitability-scoring.md) for complete framework

### Phase 3: Identify Business Risk Misconfigurations

**Objective**: Prioritize findings by business impact, compliance gaps, and crown jewel exposure.

**Business Risk Factors** (in priority order):

1. **Data Exposure**: S3 buckets, RDS, snapshots (crown jewel leakage) - **HIGHEST PRIORITY**
2. **Compliance Violations**: CIS benchmarks, NIST CSF, ISO27001 (audit failures) - **HIGH PRIORITY**
3. **Encryption Failures**: KMS rotation, EBS/S3 encryption (regulatory breach) - **MEDIUM PRIORITY**
4. **Monitoring Gaps**: GuardDuty, CloudTrail, VPC Flow Logs - **INFORMATIONAL** (not exploitable)

**Risk Assessment Matrix**:

| Severity | Data Exposure | Compliance | Encryption | Business Priority |
| -------- | ------------- | ---------- | ---------- | ----------------- |
| Critical | Public S3     | CIS Fail   | No KMS     | P0 - Fix Now      |
| High     | Cross-Account | NIST Gap   | Unrotated  | P1 - 30 days      |
| Medium   | Internal      | ISO Drift  | Weak Algo  | P2 - 90 days      |

**IMPORTANT**: Monitoring service gaps (GuardDuty, CloudTrail, Access Analyzer) removed from risk matrix as they are not exploitable vulnerabilities. Report separately as "Monitoring Recommendations" if client requires.

**High-Business-Impact Checks**:

- `s3_bucket_level_public_access_block` - Corporate data exposure risk (CRITICAL)
- `kms_key_rotation_enabled` - Long-term key compromise value (HIGH)
- `rds_instance_backup_enabled` - Data loss/ransomware risk (HIGH)
- `iam_aws_attached_policy_no_administrative_privileges` - Least privilege violations (MEDIUM)

**Monitoring Service Findings** (report separately if requested):

- `guardduty_is_enabled` - Threat detection service not enabled (INFORMATIONAL)
- `cloudtrail_multi_region_enabled` - Audit logging not configured (INFORMATIONAL)
- `accessanalyzer_enabled` - Access analysis service not enabled (INFORMATIONAL)

**Compliance Mapping**:

```bash
# Extract CIS benchmark failures
grep ";FAIL;" prowler-output.csv | \
  awk -F';' '$37 ~ /CIS-/ {print $37}' | \
  sed 's/|/\n/g' | grep "CIS-" | sort | uniq -c | sort -rn
```

**See**: [references/business-risk-framework.md](references/business-risk-framework.md) for impact matrices

### Phase 4: Verify Critical Findings (Eliminate False Positives)

**Objective**: Validate high-severity findings using AWS CLI to eliminate false positives before prioritization.

**CRITICAL**: Prowler heuristics can flag resources as vulnerable when compensating controls exist. Always verify ALL critical findings before reporting to clients. Do not leave findings marked as "UNVERIFIED".

**Mandatory Verification Requirements**:

1. **ALL Route53 Dangling IPs**: Check account allocation + EIP pool availability (--dry-run allocate-address)
2. **ALL Security Groups**: Verify attachment status (running instances, stopped instances, or unused)
3. **ALL IAM Policies**: Provide complete list of policy names/ARNs
4. **ALL Lambda Functions**: Provide complete list of function names
5. **ALL S3 Buckets**: Check policy conditions (CloudFront IP restrictions, VPC endpoints)

**Common False Positive Scenarios**:

1. **S3 "Public" Buckets with CloudFront/IP Restrictions** - Check Condition clauses
2. **Route53 "Dangling" IPs still allocated** - Check describe-addresses
3. **Security Groups 0.0.0.0/0 not attached to instances** - MANDATORY attachment check
4. **Lambda "Secrets" that are non-sensitive config** - Manual variable inspection
5. **IAM Policies with "privilege escalation" mitigated by SCPs** - Check org-level policies

**For detailed verification commands and examples, see**: [references/verification-commands.md](references/verification-commands.md)

---

**For detailed verification procedures for S3, Route53, Security Groups, IAM, and CloudFormation, see [references/verification-commands.md](references/verification-commands.md)**

#### Key Verification Quick Reference

| Check | False Positive Pattern | Critical Step |
|-------|----------------------|---------------|
| **S3 Public Access** | Buckets with `Condition` IP restrictions | Check bucket policy for Condition clauses |
| **Route53 Dangling IPs** | IPs still allocated to account | Run `describe-addresses` + `--dry-run allocate-address` |
| **Security Groups 0.0.0.0/0** | Unused SGs not attached to instances | Check attachment with `describe-instances` |
| **IAM Privilege Escalation** | Policies with Resource restrictions or SCPs | Check policy document for Resource/Condition limits |
| **CloudFormation Outputs** | ARNs/endpoints vs actual secrets | Distinguish between retrievable identifiers and credentials |

---

#### Verification 4: Lambda and CloudWatch Secrets

**Prowler Checks**: `awslambda_function_no_secrets_in_variables`, `cloudwatch_log_group_no_secrets_in_logs`

**CRITICAL**: Prowler has ~40-60% false positive rate for secrets. It flags variable NAMES containing "SECRET"/"KEY" regardless of whether VALUES are actual secrets.

**Classification Categories**:

| Category | Indicator | Action |
|----------|-----------|--------|
| ❌ FALSE POSITIVE | Value is ARN reference (`arn:aws:secretsmanager:*`), git hash, or config | Exclude |
| ✅ TRUE POSITIVE | Hardcoded credential (matches `sk_live_*`, `SG.*`, `ghp_*`, etc.) | Report Critical |
| ⚠️ KMS ENCRYPTED | Value starts with `AQICAHg` (encrypted blob) | Report "Unable to verify" |

**Quick Heuristics**:
- `*_SECRET_ARN` / `*_KEY_ARN` → ❌ FALSE POSITIVE (Secrets Manager reference)
- `GIT_COMMIT*` / `BUILD_*` → ❌ FALSE POSITIVE (build metadata)
- `AUTH0_*`, `SENDGRID_*`, `MAILGUN_*` → ✅ Likely TRUE POSITIVE (third-party credentials)

**See**: [references/secret-classification.md](references/secret-classification.md) for complete classification framework with extraction commands, value-based heuristics, and report format

---

#### Verification 5: IAM Privilege Escalation Policies

**Prowler Check**: `iam_policy_allows_privilege_escalation`

**False Positive Pattern**: Policies with dangerous permissions but mitigated by SCPs, permission boundaries, or resource restrictions.

**Verification Commands**:

```bash
# Get policy document
POLICY_ARN="arn:aws:iam::123456789012:policy/PolicyName"
VERSION=$(aws iam get-policy --policy-arn $POLICY_ARN --profile <profile> --query 'Policy.DefaultVersionId' --output text)
aws iam get-policy-version \
    --policy-arn $POLICY_ARN \
    --version-id $VERSION \
    --profile <profile> \
    --query 'PolicyVersion.Document' | jq .

# Check if policy has resource restrictions
# Example: iam:CreateAccessKey with resource ARN restriction
{
    "Effect": "Allow",
    "Action": "iam:CreateAccessKey",
    "Resource": "arn:aws:iam::*:user/${aws:username}"  # ✅ Only own keys
}

# Check Service Control Policies (if in AWS Organizations)
aws organizations list-policies-for-target \
    --target-id <account-id> \
    --filter SERVICE_CONTROL_POLICY \
    --profile <profile>

# Check who has this policy attached
aws iam list-entities-for-policy \
    --policy-arn $POLICY_ARN \
    --profile <profile>
```

**Common Escalation Paths to Verify**:

| Action Combination                    | Escalation Method             | Mitigation Check                        |
| ------------------------------------- | ----------------------------- | --------------------------------------- |
| `iam:CreateAccessKey`                 | Create keys for admin users   | Resource: `arn:aws:iam::*:user/${...}`  |
| `iam:AttachUserPolicy`                | Attach AdministratorAccess    | SCP denying admin policy attachment     |
| `lambda:CreateFunction` + `iam:PassRole` | Execute code as admin role | Resource restrictions on PassRole       |
| `iam:UpdateAssumeRolePolicy`          | Hijack trusted roles          | Permission boundary preventing updates  |

**Validation Outcome**: TRUE POSITIVE only if escalation path is unrestricted

---

#### Verification 6: CloudFormation Secrets in Outputs

**Prowler Check**: `cloudformation_stack_outputs_find_secrets`

**Verification Commands**:

```bash
# Get stack outputs
aws cloudformation describe-stacks \
    --stack-name <stack-name> \
    --profile <profile> \
    --query 'Stacks[0].Outputs'

# Review each output for actual secrets vs. ARNs/names
{
    "OutputKey": "DatabaseEndpoint",
    "OutputValue": "mydb.abc123.us-east-1.rds.amazonaws.com",  # ❌ FALSE POSITIVE - Endpoint
    "Description": "RDS endpoint"
},
{
    "OutputKey": "ApiKey",
    "OutputValue": "sk_live_51HqL...",  # ✅ TRUE POSITIVE - API key
    "Description": "Stripe API key"
}
```

**Validation Criteria**:

- ✅ **TRUE POSITIVE**: Actual secrets (API keys, passwords, tokens)
- ❌ **FALSE POSITIVE**: ARNs, endpoints, resource IDs (retrievable but not secrets)

**See**: [references/verification-commands.md](references/verification-commands.md) for complete resource list requirements, verification workflow summary, documentation templates, and verification statistics format.

---

## Critical Rules

1. **ALWAYS Verify ALL Critical Findings**: Use AWS CLI to validate EVERY high-severity finding before reporting. Do not leave any findings marked as "UNVERIFIED" or "PENDING". Prowler false positive rate can be 15-25% for certain checks.

2. **Provide Complete Resource Lists**: For findings with multiple affected resources, list ALL resource identifiers. "26 policies" without names is insufficient - user needs full lists for verification.

3. **Verify Attachment Status for Security Groups**: MANDATORY - check if flagged security groups are attached to running/stopped instances. Unused SGs are false positives.

4. **Check EIP Pool Availability for Route53**: For dangling IP findings, verify if IPs can be allocated (--dry-run allocate-address). Document whether IP is in account's available pool.

5. **Request AWS Credentials Early**: Ask for verification credentials at the start with explicit read-only permission list. Without credentials, document limitation but attempt verification where possible.

6. **De-Prioritize Monitoring Gaps**: GuardDuty, Access Analyzer, CloudTrail findings are informational (not exploitable). Report separately from critical/high findings unless client explicitly requests.

7. **Focus on Exploitability**: Prioritize FAIL findings that require no/minimal AWS credentials over defense-in-depth gaps and monitoring configurations.

8. **Document Verification Evidence**: Include AWS CLI commands and output in reports to show due diligence. Verification statistics must be accurate (not estimated).

9. **Map to Business Impact**: Translate technical findings to business risk (data loss, compliance, reputation) with priority: Data Exposure > Compliance > Encryption > Monitoring.

10. **Validate Remediation**: Test `REMEDIATION_CODE_CLI` commands in non-production before bulk execution.

11. **Client Context**: Adjust risk scores based on client's industry, regulatory environment, and crown jewels.

## Integration

### Called By

- `gateway-security` (LIBRARY) - Prowler triage routing
  - `Read(".claude/skills/gateway-security/SKILL.md")`
- Security assessment workflows requiring Prowler analysis
- Client engagement deliverable creation

### Requires (invoke before starting)

None - Standalone triage workflow

### Calls (during execution)

- **`scoring-cvss-findings`** (LIBRARY) - If CVSS scoring needed for findings
  - `Read(".claude/skill-library/security/threat-model/scoring-cvss-findings/SKILL.md")`
- **`mapping-to-cis-benchmarks`** (LIBRARY) - CIS compliance mapping
  - `Read(".claude/skill-library/frameworks/mapping-to-cis-benchmarks/SKILL.md")`

### Pairs With (conditional)

- **`triaging-nebula-public-resources`** (LIBRARY) - Similar triage methodology for Nebula scanner
  - `Read(".claude/skill-library/security/triaging-nebula-public-resources/SKILL.md")`
- **`threat-modeling`** (LIBRARY) - Attack surface analysis from findings
  - `Read(".claude/skill-library/security/threat-model/threat-modeling/SKILL.md")`
- **`formatting-plextrac-findings`** (LIBRARY) - Client report generation
  - `Read(".claude/skill-library/reporting/formatting-plextrac-findings/SKILL.md")`

## References

- [references/secret-classification.md](references/secret-classification.md) - **Secret classification framework with false positive detection**
- [references/verification-commands.md](references/verification-commands.md) - AWS CLI verification command reference
- [references/prowler-csv-structure.md](references/prowler-csv-structure.md) - Complete CSV column reference
- [references/exploitability-scoring.md](references/exploitability-scoring.md) - Exploitability assessment framework
- [references/business-risk-framework.md](references/business-risk-framework.md) - Business impact matrices

## External Resources

- **Prowler Documentation**: https://docs.prowler.com/
- **Prowler GitHub**: https://github.com/prowler-cloud/prowler
- **Prowler Checks**: https://docs.prowler.com/developer-guide/checks
- **AWS Security Best Practices**: https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-standards-fsbp.html
- **CIS AWS Foundations Benchmark**: https://www.cisecurity.org/benchmark/amazon_web_services
