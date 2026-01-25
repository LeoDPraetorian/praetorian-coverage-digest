# Business Risk Framework

**Translating Prowler technical findings into business impact for stakeholder communication and prioritization.**

## Risk Translation Matrix

### Technical Finding → Business Risk Mapping

| Prowler Finding | Technical Risk | Business Risk | Impact Domain |
|-----------------|----------------|---------------|---------------|
| Public S3 bucket | Unauthenticated data access | **Data breach, regulatory fines, reputation damage** | Confidentiality |
| GuardDuty disabled | No threat detection | **Undetected breaches, extended dwell time, forensic blindness** | Detection/Response |
| IAM privilege escalation | Account takeover | **Complete infrastructure compromise, data exfiltration, ransom** | Integrity/Availability |
| Hardcoded Lambda secrets | Credential theft | **Lateral movement to external services, supply chain compromise** | Confidentiality/Integrity |
| Unencrypted RDS | Plaintext data storage | **Regulatory non-compliance (GDPR, HIPAA, PCI-DSS), audit failure** | Compliance/Confidentiality |
| CloudTrail gaps | Missing audit logs | **Forensic evidence destruction, compliance violation, liability** | Accountability |
| Unpatched EC2 | Exploit vulnerabilities | **Ransomware, cryptomining, service disruption** | Availability/Integrity |
| No MFA on root | Account compromise | **Complete AWS account takeover, irreversible damage** | Integrity/Availability |

## Business Impact Scoring

**Five-dimension risk assessment:**

### 1. Data Sensitivity Exposure

**What data is at risk?**

| Level | Data Classification | Score | Examples | Regulatory Impact |
|-------|---------------------|-------|----------|-------------------|
| 5 | **Crown Jewels** | Critical | PII, financial records, trade secrets, source code | GDPR Art. 83 (€20M or 4% revenue) |
| 4 | **Confidential** | High | Customer data, business plans, internal communications | CCPA ($7,500/record), HIPAA ($50k/record) |
| 3 | **Internal** | Medium | Employee info, operational metrics, logs | State breach notification laws |
| 2 | **Restricted** | Low | Configuration data, metadata, anonymized analytics | Industry standards (PCI-DSS) |
| 1 | **Public** | Info | Marketing materials, public documentation | Reputation only |

**Prowler checks → Data sensitivity:**

| Check ID | Data at Risk | Sensitivity | Regulatory |
|----------|--------------|-------------|------------|
| `s3_bucket_public_access` | Bucket contents | **5** (assume crown jewels) | GDPR, CCPA, HIPAA |
| `rds_instance_publicly_accessible` | Database records | **5** (PII likely) | GDPR, PCI-DSS |
| `ec2_ebs_snapshot_encryption` | Disk images (all data) | **4-5** (unknown scope) | Multiple frameworks |
| `secretsmanager_secret_not_used_90_days` | API keys, passwords | **4** (system credentials) | Access control compliance |

### 2. Operational Impact

**What business operations are affected?**

| Level | Impact Scope | Score | Examples | RTO/RPO |
|-------|--------------|-------|----------|---------|
| 5 | **Business-Critical** | Critical | Revenue systems, customer-facing apps | RTO <1hr |
| 4 | **Major Services** | High | Internal tools, analytics, reporting | RTO <4hr |
| 3 | **Supporting Systems** | Medium | Dev/test environments, backups | RTO <24hr |
| 2 | **Non-Critical** | Low | Monitoring, logging, staging | RTO <7 days |
| 1 | **Minimal** | Info | Documentation, archives | No RTO |

**Prowler checks → Operations:**

| Check ID | Systems Affected | Operational Score |
|----------|------------------|-------------------|
| `rds_instance_backup_enabled` (FAIL) | Databases | **5** (ransomware = total loss) |
| `ec2_instance_managed_by_ssm` (FAIL) | Compute fleet | **4** (patch failures = exploits) |
| `elb_logging_enabled` (FAIL) | Load balancers | **3** (performance/security blindness) |
| `lambda_function_not_publicly_accessible` (FAIL) | Serverless APIs | **4-5** (public abuse) |

### 3. Compliance Gaps

**What regulatory violations exist?**

| Framework | Violation Severity | Score | Prowler Compliance Field | Penalties |
|-----------|-------------------|-------|-------------------------|-----------|
| **GDPR** | Critical | 5.0 | `GDPR` | €20M or 4% annual revenue |
| **HIPAA** | Critical | 5.0 | `HIPAA` | $50k/record, criminal charges |
| **PCI-DSS** | High | 4.0 | `PCI-DSS` | Merchant account suspension, $5k-$100k/month |
| **SOC 2** | High | 4.0 | `SOC2` | Customer trust loss, contract breach |
| **NIST CSF 2.0** | Medium | 3.0 | `NIST-CSF-2.0` | Federal contract requirements |
| **CIS Benchmarks** | Medium | 3.0 | `CIS-X.X` | Industry best practice baseline |
| **ISO 27001** | Medium | 3.0 | `ISO27001-2022` | Certification failure |

**Extracting compliance impact:**

```bash
# Count CIS benchmark failures (most common)
grep ";FAIL;" prowler-output.csv | \
  awk -F';' '{print $36}' | \
  grep -oP 'CIS-[0-9.]+: [0-9.]+' | \
  sort | uniq -c | sort -rn | head -20

# GDPR-specific findings
grep ";FAIL;" prowler-output.csv | grep "GDPR" | wc -l
```

**Example from CSV:**
```
COMPLIANCE: CIS-1.4: 1.20 | CIS-5.0: 1.19 | NIST-CSF-2.0: po_3, po_4 | ISO27001-2022: A.8.3
```

**Interpretation:** Failure violates 4 frameworks → Multi-framework remediation priority

### 4. Reputation & Trust Impact

**How does this affect customer/stakeholder perception?**

| Level | Reputation Impact | Score | Examples | Recovery Time |
|-------|-------------------|-------|----------|---------------|
| 5 | **Catastrophic** | Critical | Major breach, headlines | Years (Equifax-level) |
| 4 | **Severe** | High | Customer data leak, downtime | 6-12 months |
| 3 | **Moderate** | Medium | Security incident disclosure | 3-6 months |
| 2 | **Minor** | Low | Internal issue, no customer impact | Weeks |
| 1 | **None** | Info | Preventive fix, no incident | N/A |

**Prowler checks → Reputation risk:**

| Check ID | Public Visibility | Reputation Score | Scenario |
|----------|-------------------|------------------|----------|
| `s3_bucket_public_access` | **Immediate** | **5** | "Company X leaks 10M customer records via public S3" |
| `route53_dangling_ip_subdomain_takeover` | **High** | **4** | Phishing attacks using legitimate company subdomain |
| `rds_instance_publicly_accessible` | **High** | **5** | Database breach headlines |
| `guardduty_is_enabled` (FAIL) | **Post-incident** | **4** | "Breach undetected for months due to lack of monitoring" |

### 5. Financial Impact

**What are the direct/indirect costs?**

| Category | Cost Range | Examples |
|----------|------------|----------|
| **Breach Response** | $100k - $10M+ | Forensics, legal, PR, notifications |
| **Regulatory Fines** | $50k - €20M | GDPR, HIPAA, PCI-DSS penalties |
| **Downtime** | $5k - $500k/hour | Revenue loss, SLA violations |
| **Remediation** | $50k - $1M | Emergency patching, architecture fixes |
| **Reputation Loss** | $1M - $100M+ | Customer churn, stock price impact |
| **Legal/Litigation** | $500k - $50M+ | Class action lawsuits, settlements |

**Prowler-specific cost drivers:**

| Finding Pattern | Financial Impact | Calculation |
|-----------------|------------------|-------------|
| Public S3 with PII | $200/record × record count | GDPR notification + fines |
| Unencrypted RDS | $50k/record × HIPAA violations | HIPAA enforcement |
| GuardDuty disabled | Breach dwell time × $10k/day | Extended compromise costs |
| No backups + ransomware | Revenue × downtime hours | Business interruption |

## Risk Aggregation Formula

**Composite Business Risk Score:**

```
Business Risk = (Data Sensitivity × 0.30) +
                 (Operational Impact × 0.25) +
                 (Compliance Penalty × 0.25) +
                 (Reputation Damage × 0.15) +
                 (Financial Cost × 0.05)

Range: 1.0 (Minimal) to 5.0 (Catastrophic)
```

**Interpretation:**

| Score | Business Priority | Stakeholder Engagement | Budget Allocation |
|-------|-------------------|------------------------|-------------------|
| 4.5-5.0 | **P0 - Board-level** | CEO, CISO, Board | Emergency funding approved |
| 3.5-4.4 | **P1 - Executive** | C-suite, VP Engineering | Quarterly budget reallocation |
| 2.5-3.4 | **P2 - Management** | Directors, Security team | Existing budget |
| 1.5-2.4 | **P3 - Operational** | Engineering leads | Maintenance budget |
| 1.0-1.4 | **P4 - Informational** | Security engineer | No budget impact |

## Crown Jewel Identification

**Map Prowler findings to business-critical assets:**

### Step 1: Identify Crown Jewels

**Questions for stakeholders:**

1. What data, if leaked, would destroy the business? (Data Sensitivity: 5)
2. What systems must never go down? (Operational Impact: 5)
3. What compliance failures would halt operations? (Compliance: 5)

**Examples:**

| Industry | Crown Jewels | Prowler Services to Prioritize |
|----------|--------------|--------------------------------|
| **FinTech** | Payment data, customer PII | RDS, S3, Lambda (API gateways) |
| **Healthcare** | PHI/ePHI, medical records | RDS, S3, CloudTrail (HIPAA) |
| **SaaS** | Customer data, source code | S3, CodeCommit, RDS |
| **E-commerce** | Payment cards, customer data | RDS (PCI-DSS), S3, Lambda |

### Step 2: Map Resources to Findings

```bash
# Identify S3 buckets with "prod" in name (likely crown jewels)
awk -F';' '$14=="FAIL" && $17=="s3" && $22 ~ /prod/ {
  print $12 ";" $22
}' prowler-output.csv

# Find RDS instances (often contain PII)
awk -F';' '$14=="FAIL" && $17=="rds" {
  print $11 ";" $22 ";" $19
}' prowler-output.csv | sort -t';' -k3,3r
```

### Step 3: Risk Amplification

**Crown jewel findings get 2x risk multiplier:**

| Prowler Finding | Standard Risk | Crown Jewel Risk | Priority |
|-----------------|---------------|------------------|----------|
| `s3_bucket_public_access` (prod data) | 4.5 | **5.0** (×1.1) | P0 |
| `rds_instance_publicly_accessible` (PHI) | 4.0 | **5.0** (×1.25) | P0 |
| `guardduty_is_enabled` (FAIL) on prod account | 3.0 | **4.5** (×1.5) | P1 |

## Industry-Specific Risk Mapping

### Healthcare / HIPAA

**High-priority Prowler checks:**

1. `s3_bucket_default_encryption` - ePHI encryption (HIPAA 164.312(a)(2)(iv))
2. `cloudtrail_multi_region_enabled` - Audit controls (HIPAA 164.308(a)(1)(ii)(D))
3. `iam_user_hardware_mfa_enabled` - Access control (HIPAA 164.312(a)(2)(i))
4. `rds_instance_backup_enabled` - Data backup (HIPAA 164.308(a)(7)(i))

**Risk translation:**

| Finding | HIPAA Violation | Penalty per Record | Business Impact |
|---------|-----------------|-------------------|-----------------|
| Unencrypted PHI in S3 | §164.312(a)(2)(iv) | $50,000 | OCR investigation, breach notification |
| No CloudTrail | §164.308(a)(1)(ii)(D) | $25,000 | Audit failure, corrective action plan |

### Financial Services / PCI-DSS

**High-priority Prowler checks:**

1. `ec2_securitygroup_allow_ingress_from_internet_to_any_port` - Network segmentation (PCI Req 1)
2. `kms_key_rotation_enabled` - Cryptographic key management (PCI Req 3)
3. `cloudwatch_log_group_retention_policy` - Log retention (PCI Req 10.7)
4. `iam_policy_allows_privilege_escalation` - Least privilege (PCI Req 7)

**Risk translation:**

| Finding | PCI Requirement | Penalty | Business Impact |
|---------|-----------------|---------|-----------------|
| Open security group to cardholder data | Req 1.3 | Merchant account suspension | Cannot process payments |
| No key rotation | Req 3.6 | $5,000 - $100,000/month | Quarterly fine until remediated |

### SaaS / SOC 2

**High-priority Prowler checks:**

1. `accessanalyzer_enabled` - Access review (CC6.1)
2. `guardduty_is_enabled` - Threat detection (CC7.2)
3. `s3_bucket_server_access_logging_enabled` - Audit logging (CC4.1)
4. `iam_aws_attached_policy_no_administrative_privileges` - Least privilege (CC6.3)

**Risk translation:**

| Finding | SOC 2 Control | Business Impact |
|---------|---------------|-----------------|
| No Access Analyzer | CC6.1 (Logical access) | Audit exception, customer trust loss |
| GuardDuty disabled | CC7.2 (System monitoring) | Failed control, re-audit required |

## Stakeholder Communication Templates

### Executive Summary Template

```markdown
# Prowler Security Assessment: {Account ID}

## Critical Business Risks

### 1. Data Breach Exposure (P0)
- **Finding**: {count} public S3 buckets containing {data type}
- **Business Impact**: Potential exposure of {customer count} customer records
- **Regulatory**: GDPR Art. 33 notification required within 72 hours if exploited
- **Financial**: Estimated €{amount} in fines + ${amount} breach response costs
- **Remediation**: 7 days

### 2. Compliance Violations (P1)
- **Finding**: {count} CIS benchmark failures affecting {framework} compliance
- **Business Impact**: Audit failure risk, customer contract breach
- **Financial**: ${amount}/month penalties until remediated
- **Remediation**: 30 days

### 3. Operational Resilience (P2)
- **Finding**: No backups enabled on {count} production databases
- **Business Impact**: Complete data loss if ransomware attack occurs
- **Financial**: ${revenue}/hour downtime + ransom demands
- **Remediation**: 90 days
```

### Board-Level Metrics

```markdown
| Risk Category | Critical Findings | Business Impact | Investment Required |
|---------------|-------------------|-----------------|---------------------|
| Data Protection | 15 | $2.5M breach exposure | $150k remediation |
| Compliance | 47 | Failed SOC 2 controls | $200k + re-audit |
| Availability | 8 | 4hr RTO violation | $75k HA architecture |

**Overall Risk Rating**: 8.2/10 (High)
**Estimated Breach Probability**: 40% within 12 months (industry avg: 25%)
**Total Risk Exposure**: $5.2M
**Recommended Investment**: $500k (10% of exposure)
```

## Time-Based Risk Escalation

**Risk increases over time if unaddressed:**

| Finding Age | Risk Multiplier | Rationale |
|-------------|-----------------|-----------|
| 0-7 days | ×1.0 | Discovery phase |
| 8-30 days | ×1.2 | Attack window open |
| 31-90 days | ×1.5 | Increased exposure |
| 91-180 days | ×2.0 | Negligence threshold |
| 181+ days | ×3.0 | Willful non-compliance |

**Example:**

| Finding | Initial Risk | After 90 Days | After 180 Days |
|---------|--------------|---------------|----------------|
| Public S3 bucket | 4.5 (P0) | 5.0 (P0) | 5.0 (P0) - legal liability |
| GuardDuty disabled | 3.2 (P2) | 4.8 (P1) | 5.0 (P0) - willful blindness |
