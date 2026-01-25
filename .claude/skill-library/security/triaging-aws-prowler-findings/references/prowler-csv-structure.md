# Prowler CSV Structure Reference

**Complete column mapping for Prowler AWS security assessment output (42 columns).**

## Column Index Reference

| # | Column Name | Type | Triage Priority | Description |
|---|-------------|------|-----------------|-------------|
| 1 | `AUTH_METHOD` | Metadata | Low | Authentication method used for scan (e.g., "profile: default") |
| 2 | `TIMESTAMP` | Metadata | Low | Scan execution timestamp (ISO format) |
| 3 | `ACCOUNT_UID` | Context | **High** | AWS Account ID - scope for multi-account triage |
| 4 | `ACCOUNT_NAME` | Context | Medium | AWS Account alias/name |
| 5 | `ACCOUNT_EMAIL` | Context | Low | Account root email |
| 6 | `ACCOUNT_ORGANIZATION_UID` | Context | Low | AWS Organization ID |
| 7 | `ACCOUNT_ORGANIZATION_NAME` | Context | Low | AWS Organization name |
| 8 | `ACCOUNT_TAGS` | Context | Low | Account-level tags |
| 9 | `FINDING_UID` | Metadata | Low | Unique finding identifier |
| 10 | `PROVIDER` | Context | Medium | Cloud provider (always "aws" for this skill) |
| 11 | `CHECK_ID` | Finding | **Critical** | Unique check identifier (e.g., `s3_bucket_public_access`) |
| 12 | `CHECK_TITLE` | Finding | **High** | Human-readable check description |
| 13 | `CHECK_TYPE` | Finding | Medium | Check category classification |
| 14 | `STATUS` | Finding | **Critical** | PASS/FAIL/MANUAL - filter for "FAIL" |
| 15 | `STATUS_EXTENDED` | Finding | **High** | Detailed finding explanation |
| 16 | `MUTED` | Metadata | **High** | True/False - skip if muted |
| 17 | `SERVICE_NAME` | Resource | **High** | AWS service (s3, iam, ec2, lambda, etc.) |
| 18 | `SUBSERVICE_NAME` | Resource | Medium | Service sub-component |
| 19 | `SEVERITY` | Risk | **Critical** | critical/high/medium/low/informational |
| 20 | `RESOURCE_TYPE` | Resource | **High** | Type of AWS resource (Bucket, Role, Instance) |
| 21 | `RESOURCE_UID` | Resource | **Critical** | AWS ARN or unique identifier |
| 22 | `RESOURCE_NAME` | Resource | **High** | Resource name for reporting |
| 23 | `RESOURCE_DETAILS` | Resource | Medium | Additional resource metadata (JSON) |
| 24 | `RESOURCE_TAGS` | Resource | Low | Resource tags |
| 25 | `PARTITION` | Context | Low | AWS partition (aws/aws-cn/aws-gov) |
| 26 | `REGION` | Context | **High** | AWS region (for multi-region triage) |
| 27 | `DESCRIPTION` | Finding | **High** | Check purpose and technical context |
| 28 | `RISK` | Risk | **Critical** | Adversary impact description |
| 29 | `RELATED_URL` | Reference | Medium | Prowler Hub check documentation |
| 30 | `REMEDIATION_RECOMMENDATION_TEXT` | Remediation | **Critical** | Fix guidance prose |
| 31 | `REMEDIATION_RECOMMENDATION_URL` | Remediation | Medium | AWS documentation links |
| 32 | `REMEDIATION_CODE_NATIVEIAC` | Remediation | **High** | CloudFormation YAML fix |
| 33 | `REMEDIATION_CODE_TERRAFORM` | Remediation | **High** | Terraform HCL fix |
| 34 | `REMEDIATION_CODE_CLI` | Remediation | **Critical** | AWS CLI command to remediate |
| 35 | `REMEDIATION_CODE_OTHER` | Remediation | Medium | Console steps or other methods |
| 36 | `COMPLIANCE` | Compliance | **High** | Framework mappings (CIS, NIST, ISO27001, NIS2, etc.) |
| 37 | `CATEGORIES` | Attack Surface | **Critical** | Attack surface categories (see below) |
| 38 | `DEPENDS_ON` | Metadata | Low | Check dependencies |
| 39 | `RELATED_TO` | Metadata | Low | Related checks |
| 40 | `NOTES` | Metadata | Low | Additional notes |
| 41 | `PROWLER_VERSION` | Metadata | Low | Prowler version used |
| 42 | `ADDITIONAL_URLS` | Reference | Low | Extra documentation links |

## Critical Triage Columns

**Essential for exploitability assessment:**

```bash
# Extract exploitability essentials (columns 11, 14, 19, 21, 28, 34)
awk -F';' 'NR>1 && $14=="FAIL" {
  print $11 ";" $19 ";" $21 ";" $28 ";" $34
}' prowler-output.csv
```

**Fields:**
- Column 11: `CHECK_ID` - Identifies vulnerability type
- Column 14: `STATUS` - Filter for "FAIL"
- Column 19: `SEVERITY` - Risk level
- Column 21: `RESOURCE_UID` - AWS ARN
- Column 28: `RISK` - Adversary impact
- Column 34: `REMEDIATION_CODE_CLI` - Immediate fix command

## Attack Surface Categories (Column 37)

**Category → Exploitability mapping:**

| Category | Risk Level | Examples |
|----------|------------|----------|
| `secrets` | **CRITICAL** | Hardcoded credentials, exposed API keys |
| `encryption` | **HIGH** | Unencrypted data, missing KMS, weak TLS |
| `trust-boundaries` | **HIGH** | Public access, cross-account policies |
| `identity-access` | **HIGH** | IAM privilege escalation, confused deputy |
| `privilege-escalation` | **CRITICAL** | Direct admin escalation paths |
| `forensics-ready` | **MEDIUM** | Logging gaps, CloudTrail disabled |
| `logging` | **MEDIUM** | Audit trail weaknesses |
| `attack-surface` | **MEDIUM** | Exposed services, network boundaries |
| `vpc-security` | **HIGH** | Security group misconfigurations |
| `lateral-movement` | **HIGH** | Cross-service access, IMDS abuse |

## Compliance Framework Parsing (Column 36)

**Format:** `Framework: Control | Framework: Control | ...`

**Example:**
```
CIS-1.4: 1.20 | CIS-5.0: 1.19 | NIST-CSF-2.0: po_3, po_4 | ISO27001-2022: A.8.3
```

**Parsing command:**
```bash
# Extract CIS benchmark failures
grep ";FAIL;" prowler-output.csv | \
  awk -F';' '{print $36}' | \
  sed 's/|/\n/g' | \
  grep "CIS-" | \
  sort | uniq -c | sort -rn
```

**Common frameworks:**
- **CIS** (CIS AWS Foundations Benchmark) - versions 1.4, 1.5, 2.0, 3.0, 4.0.1, 5.0
- **NIST-CSF-2.0** - NIST Cybersecurity Framework 2.0
- **ISO27001-2022** - ISO 27001:2022 controls
- **NIS2** - EU Network and Information Security Directive 2
- **ProwlerThreatScore-1.0** - Prowler's internal threat scoring
- **AWS-Account-Security-Onboarding** - AWS security baselines

## RISK Field Analysis (Column 28)

**Adversary impact descriptions - critical for business risk assessment.**

**Pattern recognition:**

| Keyword in RISK | Exploitability | Business Priority |
|-----------------|----------------|-------------------|
| "public" / "internet-facing" | **IMMEDIATE** | P0 |
| "exfiltration" / "data theft" | **HIGH** | P0 |
| "privilege escalation" / "admin" | **HIGH** | P1 |
| "lateral movement" | **HIGH** | P1 |
| "confidentiality" / "integrity" | **MEDIUM** | P1-P2 |
| "availability" / "denial of service" | **MEDIUM** | P2 |
| "best practice" / "recommendation" | **LOW** | P3-P4 |

**Example from CSV:**
```
RISK: "Without an active analyzer, visibility into unintended public, cross-account,
or risky internal access is lost. Adversaries can exploit exposed S3, snapshots,
KMS keys, or permissive role trusts for data exfiltration and escalation."
```

**Exploitation indicators:**
- "exploit" → Direct attack path
- "adversaries can" → Weaponizable
- "data exfiltration" → Crown jewel threat
- "escalation" → Privilege abuse

## Remediation Code Priority (Columns 32-35)

**Execution priority:**

1. **Column 34: `REMEDIATION_CODE_CLI`** - Immediate automated remediation
   ```bash
   aws accessanalyzer create-analyzer --analyzer-name example --type ACCOUNT
   ```

2. **Column 33: `REMEDIATION_CODE_TERRAFORM`** - Infrastructure as Code
   ```hcl
   resource "aws_accessanalyzer_analyzer" "example" {
     analyzer_name = "example"
     type          = "ACCOUNT"
   }
   ```

3. **Column 32: `REMEDIATION_CODE_NATIVEIAC`** - CloudFormation
   ```yaml
   Resources:
     ExampleAnalyzer:
       Type: AWS::AccessAnalyzer::Analyzer
       Properties:
         AnalyzerName: example
         Type: ACCOUNT
   ```

4. **Column 35: `REMEDIATION_CODE_OTHER`** - Console steps (manual)

## Filtering Commands

**Extract critical findings:**

```bash
# Critical + High FAIL findings only
awk -F';' 'NR>1 && $14=="FAIL" && ($19=="critical" || $19=="high") {
  print $11 ";" $12 ";" $19 ";" $22
}' prowler-output.csv | sort -t';' -k3,3r -k1,1

# Group by service
awk -F';' 'NR>1 && $14=="FAIL" {print $17}' prowler-output.csv | \
  sort | uniq -c | sort -rn

# Count by severity
awk -F';' 'NR>1 && $14=="FAIL" {print $19}' prowler-output.csv | \
  sort | uniq -c
```

**Multi-region analysis:**

```bash
# Findings per region
awk -F';' 'NR>1 && $14=="FAIL" {print $26}' prowler-output.csv | \
  sort | uniq -c | sort -rn

# Check if control enabled in ANY region
CHECK="guardduty_is_enabled"
awk -F';' -v check="$CHECK" 'NR>1 && $11==check && $14=="PASS" {
  print $26
}' prowler-output.csv
```

## Data Type Reference

**Semicolon-delimited CSV:**
- Delimiter: `;` (not `,`)
- String quoting: `"` for multi-line content (YAML/HCL code blocks)
- Escape sequence: `""` for literal quotes within strings

**Special characters in values:**
- YAML/HCL code: Wrapped in `"```yaml\n...\n```"`
- URLs: Pipe-separated lists
- Compliance: Pipe-separated key-value pairs

**Awk parsing:**
```bash
# Safe field extraction with semicolon delimiter
awk -F';' '{print $11, $19, $34}' prowler-output.csv

# Handle multi-line YAML/HCL fields
awk -F';' 'BEGIN {RS="profile:"; FS=";"} {print $11, $34}' prowler-output.csv
```

## Version Compatibility

**Prowler 5.x format** (this reference):
- 42 columns
- Semicolon delimiter
- Unified compliance format

**Breaking changes from 4.x:**
- Added: `ADDITIONAL_URLS` (column 42)
- Renamed: Several compliance framework keys
- Format: `COMPLIANCE` changed from JSON to pipe-delimited

**Validation:**
```bash
# Verify column count
head -1 prowler-output.csv | awk -F';' '{print NF " columns"}'  # Should output "42 columns"

# Check version
awk -F';' 'NR>1 {print $41; exit}' prowler-output.csv  # Extract PROWLER_VERSION
```
