# Attack Chain Patterns

**Multi-stage attack paths constructed from partial Prowler vulnerabilities.**

## Attack Chain Framework

**Individual low/medium findings combine into critical attack paths.**

### Chain Construction Model

```
Initial Access → Persistence → Privilege Escalation → Lateral Movement → Exfiltration
       ↓              ↓                  ↓                    ↓                ↓
  Prowler FAIL   Prowler FAIL      Prowler FAIL        Prowler FAIL    Prowler FAIL
  (Medium)       (Low)             (High)              (Medium)        (Medium)
       ↓              ↓                  ↓                    ↓                ↓
  Individual Risk: 2.5 + 1.5 + 3.5 + 2.5 + 2.5 = 12.5
  Chain Risk: CRITICAL (enables complete compromise)
```

**Chain Risk Calculation:**

```
Chain Risk = MAX(Individual Risks) + (Σ Other Risks × 0.3)

Example above: 3.5 + (9.0 × 0.3) = 6.2 (P0 Critical)
```

## Pre-Built Attack Chains

### Chain 1: Visibility Blindness → Persistent Access

**Attack Path:** Operate without detection by exploiting monitoring gaps.

**Components:**

| Step | Prowler Check | Severity | Role |
|------|---------------|----------|------|
| 1 | `guardduty_is_enabled` (FAIL) | Medium | **Enabler**: No threat detection |
| 2 | `cloudtrail_multi_region_enabled` (FAIL) | Medium | **Enabler**: No audit trail in some regions |
| 3 | `cloudwatch_log_group_retention_policy` (short) | Low | **Enabler**: Evidence auto-deletion |
| 4 | `s3_bucket_server_access_logging_enabled` (FAIL) | Medium | **Enabler**: No S3 access logs |
| 5 | `accessanalyzer_enabled` (FAIL) | Low | **Enabler**: No cross-account detection |

**Attack Flow:**

```
1. Exploit any initial access vector (public S3, stolen credentials)
2. Identify regions without GuardDuty (16 regions in example)
3. Operate in blind regions for reconnaissance
4. Modify/delete CloudWatch logs in retention window
5. Exfiltrate data via S3 without logging
6. Maintain persistence undetected for months
```

**Chain Risk:** Individual (2.5 avg) → Combined (P0 - 4.8)

**Business Impact:** Extended dwell time (industry avg: 207 days) → Massive data exfiltration

**Detection Command:**

```bash
# Identify accounts with monitoring gaps
awk -F';' '$14=="FAIL" && $11 ~ /(guardduty|cloudtrail|accessanalyzer)/ {
  print $3 ";" $11 ";" $26
}' prowler-output.csv | sort | uniq -c
```

### Chain 2: Compute Compromise → Full Account Takeover

**Attack Path:** Exploit unpatched EC2 → Steal credentials → Escalate privileges.

**Components:**

| Step | Prowler Check | Severity | Role |
|------|---------------|----------|------|
| 1 | `ec2_securitygroup_allow_ingress_from_internet_to_any_port` | High | **Initial Access**: Direct exploit |
| 2 | `ec2_instance_older_than_specific_days` | Medium | **Initial Access**: Unpatched CVEs |
| 3 | `ec2_instance_imdsv2_enabled` (FAIL) | Medium | **Credential Theft**: IMDSv1 abuse |
| 4 | `iam_policy_allows_privilege_escalation` | High | **Escalation**: Role attached to instance |
| 5 | `iam_aws_attached_policy_no_administrative_privileges` (FAIL) | High | **Takeover**: Unrestricted admin |

**Attack Flow:**

```
1. Scan internet for open EC2 security groups (0.0.0.0/0:*)
2. Exploit unpatched service (SSH, RDP, web app CVE)
3. Access IMDSv1: curl http://169.254.169.254/latest/meta-data/iam/security-credentials/ROLE
4. Steal temporary credentials from instance role
5. Use privilege escalation policy (e.g., iam:AttachUserPolicy)
6. Attach AdministratorAccess to compromised user
7. Full AWS account control
```

**Chain Risk:** High (3.5) + Medium×4 (2.5) → Combined (P0 - 4.8)

**Time to Exploit:** 4-8 hours (automated tools like Pacu)

**Real-World Example:** Capital One breach (2019) - SSRF → IMDSv1 → S3 exfiltration

**Detection Command:**

```bash
# Find instances with open security groups + old AMIs
awk -F';' '$14=="FAIL" && ($11=="ec2_securitygroup_allow_ingress_from_internet_to_any_port" ||
                            $11=="ec2_instance_older_than_specific_days") {
  print $21 ";" $11
}' prowler-output.csv | sort | uniq
```

### Chain 3: Data Exfiltration Without Forensics

**Attack Path:** Access S3 cross-account → Exfiltrate without logs → Cover tracks.

**Components:**

| Step | Prowler Check | Severity | Role |
|------|---------------|----------|------|
| 1 | `s3_bucket_cross_account_access` | Medium | **Access**: Overly permissive policy |
| 2 | `s3_bucket_server_access_logging_enabled` (FAIL) | Medium | **Evasion**: No access logs |
| 3 | `s3_bucket_default_encryption` (FAIL) | Medium | **Exfiltration**: Plaintext data |
| 4 | `accessanalyzer_enabled` (FAIL) | Low | **Evasion**: No anomaly detection |
| 5 | `kms_key_rotation_enabled` (FAIL) | Low | **Persistence**: Long-term key value |

**Attack Flow:**

```
1. Identify S3 buckets with cross-account access (101 buckets in example)
2. Use legitimate cross-account principal or exploit overly permissive policy
3. Download data via `aws s3 sync` (no logging = no forensic evidence)
4. Exfiltrate plaintext data (no decryption needed)
5. Maintain access using unrotated KMS keys if encrypted
6. Scale across all 101 buckets
```

**Chain Risk:** Medium×3 (2.5) + Low×2 (1.5) → Combined (P1 - 3.8)

**Scale Factor:** 101 buckets × data volume = Massive breach

**Business Impact:** Multi-TB data exfiltration, zero detection, regulatory nightmare

**Detection Command:**

```bash
# Find S3 buckets with cross-account + no logging
awk -F';' '$14=="FAIL" && $17=="s3" &&
           ($11=="s3_bucket_cross_account_access" ||
            $11=="s3_bucket_server_access_logging_enabled") {
  print $22 ";" $11
}' prowler-output.csv | sort | uniq
```

### Chain 4: Encryption Weaknesses → Simplified Breach

**Attack Path:** Exploit encryption gaps to reduce attacker effort.

**Components:**

| Step | Prowler Check | Severity | Role |
|------|---------------|----------|------|
| 1 | `ec2_ebs_snapshot_encryption` (FAIL) | Medium | **Access**: Unencrypted disk images |
| 2 | `ec2_ebs_public_snapshot` (FAIL) | Critical | **Access**: Public snapshots |
| 3 | `rds_instance_storage_encrypted` (FAIL) | High | **Access**: Plaintext database |
| 4 | `s3_bucket_default_encryption` (FAIL) | Medium | **Access**: Plaintext S3 objects |
| 5 | `kms_key_rotation_enabled` (FAIL) | Low | **Persistence**: Compromised keys reusable |

**Attack Flow:**

```
1. Create EC2 volume from public unencrypted snapshot
2. Mount volume and extract data (no decryption needed)
3. Access unencrypted RDS instance directly
4. Download unencrypted S3 objects
5. Compromised KMS keys remain useful (no rotation)
```

**Chain Risk:** Critical (5.0) + High (4.0) + Medium×2 (2.5) → Combined (P0 - 5.0)

**Attacker Advantage:** Zero cryptographic barriers

**Business Impact:** 148 unencrypted EBS snapshots + unencrypted RDS = Massive plaintext exposure

**Detection Command:**

```bash
# Count encryption failures across services
awk -F';' '$14=="FAIL" && $37 ~ /encryption/ {
  print $17 ";" $11
}' prowler-output.csv | sort | uniq -c | sort -rn
```

### Chain 5: Credential Cascade

**Attack Path:** Hardcoded secrets → External service compromise → AWS access.

**Components:**

| Step | Prowler Check | Severity | Role |
|------|---------------|----------|------|
| 1 | `awslambda_function_no_secrets_in_variables` | Critical | **Initial**: Hardcoded API keys |
| 2 | `cloudformation_stack_outputs_find_secrets` | Critical | **Initial**: AWS keys in outputs |
| 3 | `secretsmanager_secret_not_used_90_days` | Medium | **Recon**: Identify stale secrets |
| 4 | `iam_user_hardware_mfa_enabled` (FAIL) | Medium | **Escalation**: No MFA on user |
| 5 | `iam_root_mfa_enabled` (FAIL) | Critical | **Takeover**: Root account vulnerable |

**Attack Flow:**

```
1. Extract hardcoded Datadog API key from Lambda environment (80 functions)
2. Use Datadog access to pivot to monitoring data (find AWS account IDs)
3. Find AWS Access Keys in CloudFormation stack outputs (4 stacks)
4. Use stolen credentials (no MFA = easy access)
5. Escalate to root account if root lacks MFA
```

**Chain Risk:** Critical×3 (5.0) + Medium×2 (2.5) → Combined (P0 - 5.0)

**Supply Chain Risk:** External services (Datadog, Auth0) become AWS backdoors

**Detection Command:**

```bash
# Find all credential exposure vectors
awk -F';' '$14=="FAIL" && $37 ~ /secrets/ {
  print $11 ";" $22
}' prowler-output.csv
```

### Chain 6: Subdomain Takeover → Phishing → Credential Harvesting

**Attack Path:** Takeover dangling DNS → Phish employees → Steal AWS credentials.

**Components:**

| Step | Prowler Check | Severity | Role |
|------|---------------|----------|------|
| 1 | `route53_dangling_ip_subdomain_takeover` | High | **Initial**: Takeover legitimate subdomain |
| 2 | `iam_user_hardware_mfa_enabled` (FAIL) | Medium | **Target**: Users without MFA |
| 3 | `iam_policy_allows_privilege_escalation` | High | **Exploit**: Compromised user can escalate |
| 4 | `guardduty_is_enabled` (FAIL) | Medium | **Evasion**: No phishing detection |

**Attack Flow:**

```
1. Identify dangling DNS records (7 subdomains in example)
2. Allocate released Elastic IP, control subdomain
3. Host phishing page at legit subdomain (e.g., login.company.com)
4. Phish employees to steal AWS Console credentials
5. Log in as users without MFA
6. Use privilege escalation policies to gain admin
7. Undetected by GuardDuty (disabled)
```

**Chain Risk:** High×2 (4.0) + Medium×2 (2.5) → Combined (P0 - 4.5)

**Social Engineering Multiplier:** Legitimate company subdomain = High trust

**Detection Command:**

```bash
# Find dangling subdomains
awk -F';' '$14=="FAIL" && $11=="route53_dangling_ip_subdomain_takeover" {
  print $22
}' prowler-output.csv
```

## Chain Detection Methodology

### Step 1: Component Discovery

**Identify chainable findings by category:**

```bash
# Group FAIL findings by attack surface category
awk -F';' '$14=="FAIL" {print $37}' prowler-output.csv | \
  sed 's/|/\n/g' | sed 's/ //g' | sort | uniq -c | sort -rn
```

**Key categories for chaining:**

- `identity-access` + `privilege-escalation` = Account takeover chains
- `forensics-ready` + `logging` = Evasion chains
- `encryption` + `trust-boundaries` = Data exfiltration chains
- `attack-surface` + `vpc-security` = Initial access chains

### Step 2: Service Correlation

**Find findings affecting same resource:**

```bash
# Group findings by resource ARN
awk -F';' '$14=="FAIL" {print $21 ";" $11}' prowler-output.csv | \
  sort | uniq
```

**Example:** Same EC2 instance with:
- Open security group
- Unpatched OS
- IMDSv1 enabled

= Perfect chain for compromise

### Step 3: Regional Gaps

**Identify regions with concentrated weaknesses:**

```bash
# Find regions with most FAIL findings
awk -F';' '$14=="FAIL" {print $26}' prowler-output.csv | \
  sort | uniq -c | sort -rn
```

**Threat model:** Attackers target weakest region first.

### Step 4: Timeline Analysis

**Estimate attack progression time:**

| Chain Stage | Time Estimate | Prowler Evidence |
|-------------|---------------|------------------|
| Initial access | 1-24 hours | Open security groups, public resources |
| Persistence | 1-7 days | No GuardDuty, short log retention |
| Privilege escalation | 1-48 hours | IAM privilege escalation policies |
| Lateral movement | 1-14 days | Cross-service access, IMDSv1 |
| Exfiltration | Hours-weeks | No logging, unencrypted data |

**Total dwell time:** Industry average = 207 days (IBM Cost of Breach 2024)

**With Prowler gaps:** Can extend to 365+ days undetected

## Chain Prioritization Matrix

**Rank chains by combined factors:**

| Chain | Exploitability | Impact | Detection Likelihood | Chain Score |
|-------|----------------|--------|----------------------|-------------|
| Visibility Blindness | 3.0 | 5.0 | 1.0 (none) | **4.8** (P0) |
| Compute Compromise | 4.0 | 5.0 | 2.0 | **4.8** (P0) |
| Credential Cascade | 5.0 | 5.0 | 3.0 | **4.9** (P0) |
| Data Exfiltration | 3.5 | 4.0 | 1.5 | **3.8** (P1) |
| Encryption Weakness | 4.0 | 4.0 | 2.0 | **4.0** (P1) |
| Subdomain Takeover | 4.0 | 3.5 | 2.5 | **3.8** (P1) |

**Prioritize chains with:**
1. Detection Likelihood < 2.0 (blind spots)
2. Impact ≥ 4.0 (business-critical)
3. Multiple entry points (redundant exploitation)

## Defensive Chain Breaking

**Remediate ONE link to break entire chain:**

### Example: Visibility Blindness Chain

**Break at cheapest/fastest point:**

| Option | Remediation | Cost | Time | Chain Impact |
|--------|-------------|------|------|--------------|
| Enable GuardDuty (all regions) | `aws guardduty create-detector` × 16 | $3/GB ingested | 1 day | **BROKEN** (detection restored) |
| Enable CloudTrail (multi-region) | `aws cloudtrail create-trail` | $2.50/100k events | 1 day | **BROKEN** (audit trail) |
| Enable S3 logging (all buckets) | Bash loop × 296 buckets | Storage costs | 3 days | PARTIAL (S3 only) |

**Best practice:** Break at highest-impact, lowest-cost link (GuardDuty)

### Example: Compute Compromise Chain

**Break at most effective point:**

| Option | Remediation | Time | Chain Impact |
|--------|-------------|------|--------------|
| Enable IMDSv2 (all instances) | Instance restart required | 1 week | **BROKEN** (credential theft blocked) |
| Restrict security groups | Review + update rules | 2 weeks | **BROKEN** (initial access blocked) |
| Remove privilege escalation policies | IAM policy audit | 1 month | PARTIAL (escalation prevented) |

**Best practice:** Break at earliest stage (security groups) OR cheapest prevention (IMDSv2)

## Chain Reporting Template

**For chain report format, see:** [report-templates.md - Attack Chain Report Template](report-templates.md#attack-chain-report-template)
