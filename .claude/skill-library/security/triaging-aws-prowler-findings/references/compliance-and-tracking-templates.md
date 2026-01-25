# Compliance and Progress Tracking Templates

**Compliance reporting and remediation progress tracking formats.**

## Compliance Mapping Report

```markdown
# Compliance Gap Analysis
## Framework: {CIS/NIST/ISO27001/HIPAA}

**Account**: {ACCOUNT_ID}
**Assessment Date**: {DATE}

---

## Compliance Summary

| Control Domain | Total Controls | Passed | Failed | Compliance % |
|----------------|----------------|--------|--------|--------------|
| {Domain 1} | {total} | {pass} | {fail} | {percentage}% |
| {Domain 2} | {total} | {pass} | {fail} | {percentage}% |
| {Domain 3} | {total} | {pass} | {fail} | {percentage}% |

**Overall Compliance**: {percentage}% ({status})

---

## Failed Controls

### Control {ID}: {Control Title}

**Framework**: {CIS-5.0 / NIST CSF 2.0 / ISO27001:2022}
**Status**: ⚠️ Non-Compliant

**Prowler Checks**:
- `{check_id}` - {check_title} (FAIL)
- `{check_id}` - {check_title} (FAIL)

**Gap Description**:
{What is missing or misconfigured}

**Business Risk**:
{Impact of non-compliance}

**Remediation**:
{Steps to achieve compliance}

**Audit Evidence**:
- {Evidence requirement 1}
- {Evidence requirement 2}

**Target Date**: {date}

---

## Remediation Priority by Framework

### CIS AWS Foundations Benchmark

| Priority | Control | Prowler Check | SLA |
|----------|---------|---------------|-----|
| P0 | CIS 1.20 | `accessanalyzer_enabled` | 7 days |
| P1 | CIS 2.1.1 | `s3_bucket_server_access_logging_enabled` | 30 days |
| P2 | CIS 4.1 | `cloudtrail_multi_region_enabled` | 90 days |

### NIST CSF 2.0

| Function | Category | Prowler Check | SLA |
|----------|----------|---------------|-----|
| Protect | PR.AC-1 | `iam_aws_attached_policy_no_administrative_privileges` | 30 days |
| Detect | DE.CM-1 | `guardduty_is_enabled` | 30 days |
| Respond | RS.AN-1 | `cloudtrail_multi_region_enabled` | 90 days |

**Timeline to Full Compliance**: {months} months
**Investment Required**: ${amount}
```

## CSV Export Template

**For automated tooling integration:**

```csv
Finding_ID,Check_ID,Severity,Status,Resource_ARN,Service,Region,Exploitability_Score,Business_Risk_Score,Remediation_SLA,Owner,Remediation_Command
{guid},{check_id},{severity},FAIL,{arn},{service},{region},{score},{score},{days},{team},"{cli_command}"
```

**Generation command**:

```bash
# Export prioritized findings to CSV
awk -F';' 'BEGIN {
  print "Finding_ID,Check_ID,Severity,Status,Resource_ARN,Service,Region"
}
NR>1 && $14=="FAIL" && ($19=="critical" || $19=="high") {
  print $9","$11","$19","$14","$21","$17","$26
}' prowler-output.csv > prioritized-findings.csv
```

## Progress Tracking Template

```markdown
# Remediation Progress Dashboard
## Updated: {DATE}

**Overall Progress**: {completed}/{total} ({percentage}%)

---

## By Priority

| Priority | Total | Completed | In Progress | Blocked | Remaining |
|----------|-------|-----------|-------------|---------|-----------|
| P0 | {total} | {done} ✅ | {wip} 🟡 | {blocked} 🔴 | {remaining} ⚪ |
| P1 | {total} | {done} ✅ | {wip} 🟡 | {blocked} 🔴 | {remaining} ⚪ |
| P2 | {total} | {done} ✅ | {wip} 🟡 | {blocked} 🔴 | {remaining} ⚪ |

---

## By Service

| Service | Total Findings | Completed | % Complete |
|---------|----------------|-----------|------------|
| S3 | {total} | {done} | {percentage}% |
| IAM | {total} | {done} | {percentage}% |
| EC2 | {total} | {done} | {percentage}% |
| Lambda | {total} | {done} | {percentage}% |

---

## Remediation Velocity

| Week | Findings Closed | Cumulative | Burn Rate |
|------|-----------------|------------|-----------|
| Week 1 | {count} | {total} | {findings/week} |
| Week 2 | {count} | {total} | {findings/week} |
| Week 3 | {count} | {total} | {findings/week} |

**Projected Completion**: {date} ({weeks} weeks remaining)

---

## Blockers

| Finding | Blocker | Owner | ETA |
|---------|---------|-------|-----|
| {check_id} | {reason} | {team} | {date} |
| {check_id} | {reason} | {team} | {date} |
```

## Compliance Extraction Commands

**CIS Benchmark Compliance:**

```bash
# Count CIS failures by version
grep ";FAIL;" prowler-output.csv | \
  awk -F';' '{print $36}' | \
  grep -oP 'CIS-[0-9.]+' | \
  sort | uniq -c | sort -rn

# Example output:
#  327 CIS-5.0
#  312 CIS-4.0.1
#  298 CIS-3.0
```

**NIST CSF 2.0 Compliance:**

```bash
# Extract NIST CSF controls
grep ";FAIL;" prowler-output.csv | \
  awk -F';' '{print $36}' | \
  grep -oP 'NIST-CSF-2.0: [^|]+' | \
  sed 's/NIST-CSF-2.0: //g' | \
  tr ', ' '\n' | \
  sort | uniq -c | sort -rn
```

**ISO 27001:2022 Compliance:**

```bash
# Map to ISO 27001 controls
grep ";FAIL;" prowler-output.csv | \
  awk -F';' '{print $36}' | \
  grep -oP 'ISO27001-2022: [^|]+' | \
  sed 's/ISO27001-2022: //g' | \
  sort | uniq -c | sort -rn
```
