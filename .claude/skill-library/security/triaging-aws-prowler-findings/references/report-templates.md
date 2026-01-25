# Report Templates

**Client-deliverable formats for Prowler triage findings.**

## Executive Summary Template

```markdown
# AWS Security Assessment
## Prowler Findings - Account {ACCOUNT_ID}

**Assessment Date**: {DATE}
**Assessed by**: {CONSULTANT_NAME}
**Account Name**: {ACCOUNT_NAME}

### Key Findings

| Priority | Count | Risk Level | Remediation SLA |
|----------|-------|------------|-----------------|
| P0 - Critical | {count} | Immediate exploitation | 7 days |
| P1 - High | {count} | Privilege escalation risk | 30 days |
| P2 - Medium | {count} | Defense-in-depth gaps | 90 days |
| P3 - Low | {count} | Best practice improvements | 180 days |

**Total Findings**: {total_count} FAIL | {pass_count} PASS

### Critical Business Risks

1. **{Risk Category}**: {Brief description}
   - **Impact**: {Business consequences}
   - **Affected Resources**: {count}
   - **Estimated Cost**: ${amount}

2. **{Risk Category 2}**: {Brief description}
   - **Impact**: {Business consequences}
   - **Affected Resources**: {count}
   - **Estimated Cost**: ${amount}

### Compliance Status

| Framework | Controls Failed | Status |
|-----------|-----------------|--------|
| CIS AWS Foundations Benchmark | {count} / {total} | ⚠️ Non-compliant |
| NIST CSF 2.0 | {count} / {total} | ⚠️ Partial |
| ISO 27001:2022 | {count} / {total} | ⚠️ Gaps identified |

### Recommendations

**Immediate Actions** (7 days):
1. {Action 1}
2. {Action 2}
3. {Action 3}

**Short-Term** (30 days):
1. {Action 1}
2. {Action 2}

**Strategic** (90 days):
1. {Action 1}
2. {Action 2}
```

## Technical Findings Report

```markdown
# Technical Security Findings
## AWS Account {ACCOUNT_ID}

---

## Finding 1: {Check Title}

**Check ID**: `{check_id}`
**Severity**: {critical/high/medium/low}
**Status**: FAIL
**Affected Resources**: {count}

### Description

{DESCRIPTION from Prowler CSV - Column 27}

### Risk

{RISK from Prowler CSV - Column 28}

**Exploitability**: {Immediate/Hours/Days/Weeks}
**Detection Likelihood**: {None/Low/Medium/High}
**Business Impact**: {Data breach/Compliance/Operational}

### Affected Resources

| Resource ARN | Region | Tags |
|--------------|--------|------|
| {RESOURCE_UID} | {REGION} | {RESOURCE_TAGS} |
| {RESOURCE_UID} | {REGION} | {RESOURCE_TAGS} |

**Total Affected**: {count} resources across {region_count} regions

### Attack Scenario

{Detailed exploitation walkthrough}

**Example exploit**:
```bash
{Command example from exploitability-scoring.md}
```

### Remediation

**Recommended Action**:
{REMEDIATION_RECOMMENDATION_TEXT from Column 30}

**AWS CLI Fix**:
```bash
{REMEDIATION_CODE_CLI from Column 34}
```

**Terraform**:
```hcl
{REMEDIATION_CODE_TERRAFORM from Column 33}
```

**CloudFormation**:
```yaml
{REMEDIATION_CODE_NATIVEIAC from Column 32}
```

**Console Steps**:
{REMEDIATION_CODE_OTHER from Column 35}

### Compliance Impact

**Failed Controls**:
- {Framework}: {Control ID}
- {Framework}: {Control ID}

**References**:
- Prowler Hub: {RELATED_URL}
- AWS Documentation: {REMEDIATION_RECOMMENDATION_URL}

### Priority

**Remediation SLA**: {7/30/90/180 days}
**Effort Estimate**: {hours/days}
**Cost Estimate**: ${amount}

---
```

## Remediation Roadmap Template

```markdown
# AWS Security Remediation Roadmap
## Account {ACCOUNT_ID}

**Current Risk Score**: {score}/10
**Target Risk Score**: {target}/10
**Timeline**: {months} months
**Investment Required**: ${total_cost}

---

## Phase 1: Critical Fixes (0-7 days)

**Objective**: Eliminate immediate exploitation vectors

| Priority | Finding | Resources | Effort | Owner | Status |
|----------|---------|-----------|--------|-------|--------|
| P0 | Public S3 buckets | 4 | 2 hrs | Security | 🔴 Open |
| P0 | Hardcoded Lambda secrets | 80 | 8 hrs | DevOps | 🔴 Open |
| P0 | CloudFormation AWS keys | 4 | 1 hr | Security | 🔴 Open |

**Success Metrics**:
- Zero public-facing data resources
- Zero hardcoded credentials
- All critical severity findings resolved

**Budget**: ${amount}

---

## Phase 2: High-Risk Mitigation (8-30 days)

**Objective**: Prevent privilege escalation and account takeover

| Priority | Finding | Resources | Effort | Owner | Status |
|----------|---------|-----------|--------|-------|--------|
| P1 | IAM privilege escalation policies | 32 | 16 hrs | IAM Lead | 🟡 Planned |
| P1 | GuardDuty disabled | 16 regions | 4 hrs | SecOps | 🟡 Planned |
| P1 | Confused deputy vulnerabilities | 270 | 24 hrs | IAM Lead | 🟡 Planned |

**Success Metrics**:
- All privilege escalation paths closed
- Threat detection enabled (GuardDuty)
- High severity findings < 10

**Budget**: ${amount}

---

## Phase 3: Defense-in-Depth (31-90 days)

**Objective**: Build resilient security architecture

| Priority | Finding Category | Resources | Effort | Owner | Status |
|----------|------------------|-----------|--------|-------|--------|
| P2 | CloudWatch log retention | 571 | 8 hrs | Logging | ⚪ Backlog |
| P2 | S3 bucket logging | 296 | 16 hrs | Storage | ⚪ Backlog |
| P2 | EBS encryption | 148 | 24 hrs | Compute | ⚪ Backlog |

**Success Metrics**:
- Forensic readiness achieved
- Compliance gaps < 5%
- Medium severity findings < 20

**Budget**: ${amount}

---

## Phase 4: Optimization (91-180 days)

**Objective**: Continuous improvement and automation

| Priority | Initiative | Effort | Owner | Status |
|----------|-----------|--------|-------|--------|
| P3 | Automated remediation (Lambda) | 40 hrs | Automation | ⚪ Future |
| P3 | Security baseline (Terraform) | 60 hrs | IaC Team | ⚪ Future |
| P3 | Quarterly Prowler scans | 8 hrs/qtr | Security | ⚪ Future |

**Success Metrics**:
- All low severity findings resolved
- Automated drift detection
- Zero manual remediation

**Budget**: ${amount}

---

## Investment Summary

| Phase | Timeline | Effort | Cost | ROI |
|-------|----------|--------|------|-----|
| Phase 1 | 0-7 days | 80 hrs | ${amount} | Avoid ${breach_cost} breach |
| Phase 2 | 8-30 days | 120 hrs | ${amount} | Prevent ${takeover_cost} takeover |
| Phase 3 | 31-90 days | 160 hrs | ${amount} | Meet compliance (${compliance_cost} penalties) |
| Phase 4 | 91-180 days | 200 hrs | ${amount} | Reduce ongoing costs ${savings} |

**Total Investment**: ${total_cost}
**Total Risk Avoidance**: ${total_avoidance}
**Net ROI**: {percentage}%
```

## Attack Chain Report Template

```markdown
# Attack Chain Analysis
## Account {ACCOUNT_ID}

---

## Chain 1: {Chain Name}

**Risk Level**: P0 Critical
**Probability**: {High/Medium/Low}
**Impact**: ${estimated_cost}

### Overview

{Brief description of attack chain}

**Components**: {count} Prowler findings
**Time to Exploit**: {hours/days/weeks}
**Detection Likelihood**: {None/Low/Medium/High}

### Attack Flow

```mermaid
graph LR
    A[Initial Access<br/>{Prowler Check}] --> B[Persistence<br/>{Prowler Check}]
    B --> C[Privilege Escalation<br/>{Prowler Check}]
    C --> D[Lateral Movement<br/>{Prowler Check}]
    D --> E[Exfiltration<br/>{Prowler Check}]
```

**Step-by-Step**:

1. **Initial Access**: {Prowler Check}
   - **Exploit**: {exploit method}
   - **Command**: `{example command}`
   - **Result**: {outcome}

2. **Persistence**: {Prowler Check}
   - **Exploit**: {persistence method}
   - **Result**: {outcome}

3. **Privilege Escalation**: {Prowler Check}
   - **Exploit**: {escalation method}
   - **Result**: {outcome}

4. **Lateral Movement**: {Prowler Check}
   - **Exploit**: {lateral method}
   - **Result**: {outcome}

5. **Exfiltration**: {Prowler Check}
   - **Exploit**: {exfiltration method}
   - **Result**: {outcome}

### Business Impact

**Data at Risk**:
- {data type}: {volume/count}
- {data type}: {volume/count}

**Regulatory Violations**:
- {Framework}: {specific violation}
- **Penalty**: ${amount}

**Operational Impact**:
- {Service downtime}: {duration}
- **Revenue Loss**: ${amount}/hour

**Reputation Impact**:
- {Headline scenario}
- **Customer Churn**: {percentage}%

### Remediation Strategy

**Chain-Breaking Point**: {Most effective fix}

**Recommended Action**:
{Specific remediation step that breaks entire chain}

**Implementation**:
```bash
{Remediation command}
```

**Cost**: ${amount}
**Time**: {days}
**Impact**: Eliminates entire attack chain

**Alternative Approaches**:
- {Alternative 1}: ${cost}, {days}
- {Alternative 2}: ${cost}, {days}

### Evidence

**Prowler Findings**:

| Check ID | Severity | Resources | Region |
|----------|----------|-----------|--------|
| {check_id} | Critical | {count} | {regions} |
| {check_id} | High | {count} | {regions} |
| {check_id} | Medium | {count} | {regions} |

**Detection Commands**:
```bash
# Bash command to extract findings from CSV
{grep/awk command}
```
```

## Additional Templates

For compliance mapping, CSV exports, and progress tracking dashboards, see:
- [compliance-and-tracking-templates.md](compliance-and-tracking-templates.md)
