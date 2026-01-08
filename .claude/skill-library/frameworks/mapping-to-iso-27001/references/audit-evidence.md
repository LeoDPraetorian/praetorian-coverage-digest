# ISO 27001:2022 Audit Evidence Requirements

**What documentation, scan results, and operational records auditors require for certification.**

## Evidence Hierarchy (Quality Ranking)

1. **Direct Observation** (highest quality): Physical verification (locked server rooms, signed NDAs)
2. **Performance Records:** Authorization logs, incident tickets, approval workflows
3. **Direct Testing:** Auditor attempts prohibited actions, validates controls in real-time
4. **Interviews** (most important): Staff understanding and execution of security processes

## 12-Month Continuous Evidence Requirement

**Critical:** Technical evidence must span **12+ months** showing continuous operation, not just pre-audit preparation.

### Evidence Types Required

| Evidence Type | Minimum Retention | Format | Examples |
|---------------|-------------------|--------|----------|
| **System logs** | 12 months | Digital, time-stamped | Authentication, authorization, admin actions |
| **SIEM data** | 12 months | Digital, aggregated | Security event correlation, alert history, incident timelines |
| **Audit trails** | 12 months | Digital, immutable | Access approvals, privilege escalations, configuration changes |
| **Incident reports** | Lifecycle + 3 years | Documents + logs | Detection, response, remediation, post-incident reviews |
| **Vulnerability scans** | 12 months | Digital reports | Quarterly or monthly scans showing remediation timelines |
| **Monitoring outputs** | 12 months | Dashboards + data | Uptime metrics, performance dashboards, anomaly alerts |

## Mandatory Documentation

**ISMS Foundation (Required for Certification):**

1. **ISMS Scope Definition:** Clear boundaries of information security management system
2. **Information Security Policy:** Board-approved, organization-wide security policy
3. **Risk Assessment Methodology:** How risks are identified, analyzed, evaluated
4. **Risk Treatment Procedure:** How risks are addressed (accept, transfer, mitigate, avoid)
5. **Statement of Applicability (SoA):** All 93 controls with applicable/not applicable status and justifications
6. **Security Objectives:** Measurable security goals aligned with business objectives
7. **Operational Records:** Access logs, incidents, changes, training, audits
8. **Internal Audit Program:** Annual audit schedule and reports
9. **Management Review Records:** Periodic reviews of ISMS effectiveness

## Evidence by Control Theme

### Organizational Controls (A.5.x)

**Evidence Required:**
- **Policies:** Information security policy, risk assessment methodology, risk treatment procedures
- **Records:** Personnel competency documentation, training completion, management reviews, internal audit reports
- **Effectiveness:** Policy review cycles, documented decisions, version control

**Auditor Focus:**
- Policy approval by management
- Risk assessment currency (annual or after major changes)
- Statement of Applicability completeness and justifications

### Technological Controls (A.8.x)

**Evidence Required:**
- **Logging:** System logs, security tool logs (SIEM/IDS/IPS), user access logs (12+ months)
- **Monitoring:** Vulnerability scans, intrusion alerts, security dashboards showing 12+ months operation
- **Retention:** Minimum 12 months, centralized management, integrity protection (hashing)

**Auditor Focus:**
- Log completeness and retention compliance
- Evidence of monitoring and alerting (not just capability)
- Vulnerability scan frequency and remediation tracking

### Physical Controls (A.7.x)

**Evidence Required:**
- **Asset Management:** Asset inventories, device tracking, disposal records with certificates of destruction
- **Access Control:** Badge access logs, visitor sign-in sheets, environmental monitoring, camera footage

**Auditor Focus:**
- Physical inspection of facilities
- Access log review for unauthorized entries
- Asset tracking accuracy

### People Controls (A.6.x)

**Evidence Required:**
- **Training:** Security awareness materials, attendance records, completion tracking, phishing simulation results
- **HR Security:** Background check documentation, NDAs, acceptable use policies, access review records

**Auditor Focus:**
- Staff interviews to verify understanding
- Training completion rates (100% for security-critical roles)
- Background check consistency

## Audit Process Stages

### Stage 1: Documentation Review (1-3 days)

**Auditor Activities:**
- Review ISMS scope, policies, procedures
- Examine risk assessment and treatment documentation
- Verify Statement of Applicability completeness
- Check mandatory documentation presence

**Organization Preparation:**
- Provide ISMS manual, policies, procedures in advance
- Prepare document index for quick reference
- Designate document owner for questions

### Stage 2: Implementation Verification (3-7 days)

**Auditor Activities:**
- Control testing (sample access requests, review logs, inspect facilities)
- Staff interviews (random selection across departments)
- Operational evidence examination (12-month logs, scan results, incident reports)
- Walkthroughs of key processes

**Organization Preparation:**
- Prepare evidence packages per control (logs, scans, reports)
- Brief staff on audit interviews (honest, concise answers)
- Ensure systems accessible for technical testing

### Surveillance Audits (Annual, Years 1-2)

**Auditor Activities:**
- Review subset of controls (rotating across 3-year cycle)
- Check effectiveness of previous corrective actions
- Monitor ISMS changes and updates

**Organization Preparation:**
- Maintain continuous evidence generation
- Update documentation with operational changes
- Track corrective actions from previous audits

### Recertification Audit (Year 3)

**Auditor Activities:**
- Comprehensive reassessment (similar to Stage 2)
- Full control verification
- ISMS effectiveness evaluation

**Organization Preparation:**
- Conduct internal gap analysis 6 months before recertification
- Refresh all evidence packages
- Update all documentation to current state

## Evidence Mapping to Specific Controls

### High-Evidence Controls (Auditor Focus Areas)

| Control | Name | Evidence Required |
|---------|------|-------------------|
| **A.8.15** | Logging | 12-month system logs, log management configs, retention policies |
| **A.8.16** | Monitoring | SIEM dashboards, alert history, anomaly detection rules, incident response records |
| **A.8.8** | Vulnerability management | Vulnerability scan results (quarterly minimum), remediation tracking, patch management logs |
| **A.5.23** | Cloud security | Cloud security posture scans, CSP audit logs (CloudTrail/Activity Logs), IAM configurations |
| **A.8.24** | Cryptography | Encryption status scans, key management procedures, TLS/SSL configurations |
| **A.5.28** | Evidence collection | Chain of custody procedures, evidence preservation logs, forensic readiness documentation |

## Annex A 5.28 - Evidence Collection (New Control)

**Formal control requiring:**
- Procedures for evidence identification
- Chain of custody protocols
- Secure retention with integrity protection
- Admissibility standards for legal proceedings

**Evidence for this control:**
- Evidence collection procedure document
- Chain of custody forms/templates
- Evidence storage logs (who accessed, when, why)
- Integrity verification methods (hashing, digital signatures)

## Common Audit Failures

### Major Non-Conformities (Certification Blockers)

1. **Missing/undocumented risk assessment** - No risk assessment process or documentation
2. **Ambiguous ISMS scope** - Unclear boundaries make verification impossible
3. **No evidence preservation (A.5.28)** - No procedures for evidence collection
4. **Fundamental ISMS gaps (Clauses 4-10)** - Missing required ISMS elements
5. **Documented controls not functioning** - Policies exist but not followed

### Minor Non-Conformities (Corrective Action Required)

1. **Isolated documentation gaps** - Single overdue policy review
2. **Individual training gaps** - One employee missing required training
3. **Log retention <12 months** - Incomplete retention or gaps in logging
4. **Unjustified "Not Applicable"** - Controls marked N/A without risk-based justification
5. **Missing effectiveness metrics** - No measurement of control performance

## 2026 Audit Trends

### Automation Maturity

- **Continuous evidence generation** replacing periodic pre-audit preparation
- GRC platform integration with automated control-to-evidence mapping
- SIEM-driven compliance: Security tools feed audit evidence automatically
- AI-assisted gap analysis identifying compliance issues proactively

### Quality Over Quantity

**Auditors prefer:**
- **Verifiable:** Can be independently confirmed
- **Reproducible:** Consistent results when reexamined
- **Time-stamped:** Clear temporal attribution
- **Attributed:** Specific actors/systems identified
- **Contextualized:** Linked to specific controls, risks, business needs

### Transparency Rewarded

- Honesty about gaps with demonstrated remediation plans valued over perfection claims
- Risk-focused dialogue replacing checklist compliance
- Executive engagement signals organizational commitment

## Cloud-Specific Evidence Requirements

### Shared Responsibility Model

**Customer must demonstrate:**
- IAM logs: User provisioning, role assignments, MFA status
- CloudTrail/Activity Logs: API calls, resource changes, admin actions
- Encryption configurations: At-rest and in-transit encryption verification
- Network diagrams: VPC architecture, security groups, firewall rules
- Backup testing: Recovery point/time objectives (RPO/RTO), restore validation logs

**CSP ISO 27001 certification ≠ customer certification**

## Resources

**Audit Preparation Tools:**
- GRC platforms: Sprinto, Secureframe, Drata, Vanta, ISMS.online
- Evidence automation: ManageEngine EventLog Analyzer, Netsurion SIEM
- Document templates: ISMS.online, IT Governance, HighTable

**Audit Guidance:**
- ISO 27001:2022 Clause 9.2 - Internal Audit requirements
- ISO 27001:2022 Annex A 5.28 - Evidence collection control
- Certification body audit process guides

**Research Source:** `.claude/.output/research/2026-01-06-223847-iso-27001-2022-annex-a/SYNTHESIS.md` - Section "Interpretation 2: Audit Evidence Requirements"
