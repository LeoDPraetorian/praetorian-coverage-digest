# Continuous Monitoring (ConMon) Requirements

**Complete FedRAMP continuous monitoring frequencies, deliverables, and automation guidance.**

---

## What is FedRAMP Continuous Monitoring?

**FedRAMP Continuous Monitoring (ConMon)** is the ongoing assessment and reporting of security controls to maintain an Authorization to Operate (ATO).

**Purpose**:
- Maintain security posture between annual assessments
- Detect and respond to new vulnerabilities
- Demonstrate ongoing compliance to Authorizing Officials (AOs)
- Enable rapid response to security incidents

**Requirement**: All FedRAMP-authorized systems must perform continuous monitoring and submit monthly reports to AOs.

---

## Official FedRAMP ConMon Resources

### 1. FedRAMP Continuous Monitoring Playbook

**URL**: https://www.fedramp.gov/resources/documents/Continuous_Monitoring_Playbook.pdf

**Version**: 1.0 (11/17/2025)

**Contains**:
- ConMon strategy and framework
- Roles and responsibilities
- Deliverable requirements
- Frequency guidance by control

### 2. FedRAMP Continuous Monitoring Deliverables Template

**URL**: https://www.fedramp.gov/resources/templates/FedRAMP-Continuous-Monitoring-Deliverables-Template.xlsx

**Format**: Excel spreadsheet

**Contains**:
- Activity frequency requirements
- Deliverable descriptions
- Control ID cross-references
- AO submission instructions

### 3. Continuous Monitoring Overview Training

**URL**: https://www.fedramp.gov/assets/resources/training/200-D-FedRAMP-Training-Continuous-Monitoring-ConMon-Overview.pdf

**Content**: Official FedRAMP PMO training materials

---

## ConMon Frequencies by Activity Type

### Monthly Requirements (Due 30 Days After Month End)

| Activity | Control(s) | Method | Deliverable |
|---|---|---|---|
| **Operating System Vulnerability Scans** | RA-5 | Automated scanner (authenticated) | Scan reports + POA&M updates |
| **Web Application Vulnerability Scans** | RA-5 | Automated scanner (DAST) | Scan reports + POA&M updates |
| **Database Vulnerability Scans** | RA-5 | Automated scanner (authenticated) | Scan reports + POA&M updates |
| **POA&M Updates** | Multiple | Manual review + updates | Updated POA&M Excel file |
| **Scan Findings Remediation** | SI-2 | Patching/configuration changes | Evidence of remediation |

**Critical**: All monthly scans must be authenticated (credentialed) scans, not unauthenticated.

### Quarterly Requirements

| Activity | Control(s) | Method | Deliverable |
|---|---|---|---|
| **Access Control Review** | AC-2 | Manual review of user accounts | Access review report |
| **Privilege Review** | AC-6 | Review of elevated privileges | Privilege audit report |
| **Configuration Baseline Validation** | CM-6 | Automated compliance scanning (SCAP) | Configuration compliance report |
| **Security Control Changes** | Multiple | Review of control modifications | Change summary + documentation |

### Annual Requirements

| Activity | Control(s) | Method | Deliverable |
|---|---|---|---|
| **3PAO Annual Assessment** | All controls | Independent 3PAO assessment | SAR (Security Assessment Report) |
| **Penetration Testing** | CA-8 | Independent penetration test | Penetration test report |
| **Incident Response Testing** | IR-4 | Tabletop exercise or simulation | IR exercise report |
| **Disaster Recovery Testing** | CP-4 | DR failover test | DR test report |
| **Security Awareness Training** | AT-2 | Required for all personnel | Training completion records |

### Continuous (Real-Time) Requirements

| Activity | Control(s) | Method | Deliverable |
|---|---|---|---|
| **Security Event Logging** | AU-2, AU-6 | SIEM with automated alerting | Log retention + incident tickets |
| **Configuration Drift Detection** | CM-6 | CSAM tools (Continuous monitoring) | Drift alerts + remediation tickets |
| **Intrusion Detection** | SI-4 | IDS/IPS with SIEM integration | IDS alerts + incident reports |
| **Malware Protection** | SI-3 | Antivirus/EDR with auto-updates | Malware alerts + remediation |

---

## Control-Specific Monitoring Frequencies

### RA-5: Vulnerability Monitoring and Scanning

**Frequency**: Monthly (minimum)

**Requirements**:
- Authenticated scans (must use credentials)
- All system types: OS, web apps, databases, containers
- Automated scanning tools (Nessus, Qualys, Rapid7, etc.)
- Scan all production systems in authorization boundary

**Deliverables**:
- Complete scan reports
- Vulnerability summary (by severity)
- POA&M updates for new High/Critical findings
- Evidence of remediation for closed vulnerabilities

**Remediation Timelines**:
- High: 30 days
- Moderate: 90 days
- Low: 180 days

### SI-2: Flaw Remediation (Patch Management)

**Frequency**: Monthly validation

**Requirements**:
- Patch deployment within remediation timelines
- Testing in non-production before production deployment
- Change management approval (CM-3)
- Rollback plan for failed patches

**Deliverables**:
- Patch compliance report
- List of applied patches (with dates)
- Outstanding patches with POA&Ms
- Testing/validation evidence

### CM-6: Configuration Settings

**Frequency**: Continuous monitoring with quarterly validation

**Requirements**:
- Automated configuration drift detection (continuous)
- SCAP compliance scanning (quarterly)
- Comparison against CIS Benchmarks or DISA STIGs
- Remediation of unauthorized configuration changes

**Deliverables**:
- Configuration compliance reports (quarterly)
- Drift detection alerts (continuous)
- Remediation tickets for non-compliant configs
- Baseline configuration documentation

### AC-2: Account Management

**Frequency**: Quarterly

**Requirements**:
- Review all user accounts (active, inactive, suspended)
- Identify and disable orphaned/stale accounts
- Validate account privileges match job role
- Review service accounts and API keys

**Deliverables**:
- Access review report (list of all accounts)
- Accounts disabled/removed
- Privilege changes documented
- Management attestation/sign-off

### AU-6: Audit Review, Analysis, and Reporting

**Frequency**: Continuous

**Requirements**:
- SIEM with automated alerting for security events
- Log aggregation from all systems
- SOC or security team review of alerts
- Incident ticket creation for suspicious activity

**Deliverables**:
- SIEM reports (weekly/monthly summaries)
- Incident tickets for security events
- Log retention evidence (per AU-11 requirements)
- False positive tuning documentation

### IR-4: Incident Handling

**Frequency**: Continuous (monitoring) + Annual (testing)

**Requirements**:
- 24/7 incident detection and response capability
- Incident response plan (IR-8) maintained
- Annual IR tabletop exercise or simulation
- Incident reporting to AOs within required timeframes

**Deliverables**:
- Incident reports (per incident)
- Annual IR exercise report
- Lessons learned documentation
- IR plan updates based on exercises

### CA-8: Penetration Testing

**Frequency**: Annual

**Requirements**:
- Independent penetration test by 3PAO or qualified tester
- Test all layers: network, application, social engineering
- Test from both external and internal perspectives
- Rules of Engagement (RoE) document

**Deliverables**:
- Penetration test report
- Executive summary with risk ratings
- Detailed findings with remediation recommendations
- POA&Ms for findings not immediately remediated

---

## Monthly ConMon Submission Package

**Due Date**: 30 days after month end (e.g., January report due by February 30)

**Required Documents**:

1. **Inventory Workbook**
   - Current system inventory
   - Changes since last month (adds/removes)

2. **POA&M**
   - Updated with new findings
   - Status updates on existing items
   - Closed items with evidence

3. **Vulnerability Scan Reports**
   - OS scans (all systems)
   - Web application scans
   - Database scans
   - Executive summary

4. **Deviation Requests** (if applicable)
   - Requests for timeline extensions
   - Risk acceptance requests
   - Compensating control proposals

5. **Significant Change Requests** (if applicable)
   - System architecture changes
   - New integrations
   - Control modifications

**Submission Method**: FedRAMP portal (varies by AO)

---

## Automation Recommendations

### SIEM (Security Information and Event Management)

**Purpose**: Centralized logging, real-time alerting, compliance reporting

**Leading Tools**:
- Splunk (most common in FedRAMP)
- Elastic Stack (ELK)
- IBM QRadar
- Azure Sentinel (for Azure FedRAMP)

**Integration Points**:
- AU-2 (Event Logging)
- AU-6 (Audit Review)
- SI-4 (System Monitoring)
- IR-4 (Incident Handling)

### CSAM (Continuous Security Assessment and Monitoring)

**Purpose**: Configuration compliance, drift detection, asset inventory

**Leading Tools**:
- Tenable.sc (Nessus + compliance)
- Qualys VMDR
- Rapid7 InsightVM
- Tanium

**Integration Points**:
- CM-6 (Configuration Settings)
- CM-8 (System Component Inventory)
- RA-5 (Vulnerability Monitoring)

### Vulnerability Scanners

**Purpose**: Authenticated vulnerability scanning, patch validation

**Leading Tools**:
- Tenable Nessus
- Qualys
- Rapid7 Nexpose
- OpenVAS (open source alternative)

**Requirements**:
- FedRAMP-authorized scanner or equivalent
- Authenticated (credentialed) scanning
- Monthly scan frequency minimum
- Integration with POA&M workflow

### GRC (Governance, Risk, and Compliance) Platforms

**Purpose**: ConMon workflow automation, POA&M management, evidence collection

**Leading Tools**:
- GovReady
- Tugboat Logic
- Hyperproof
- Drata
- Vanta

**Features**:
- Automated evidence collection
- POA&M workflow tracking
- ConMon report generation
- AO submission preparation

---

## ConMon Best Practices

### Do's

✅ **Automate Everything Possible**: Manual processes don't scale
✅ **Integrate Tools**: SIEM ← Scanners, GRC ← SIEM, Ticketing ← All
✅ **Remediate Quickly**: Don't let POA&Ms pile up, fix high/critical immediately
✅ **Document Everything**: Every scan, every change, every decision
✅ **Test Your Tools**: Verify scanner coverage, SIEM alert accuracy

### Don'ts

❌ **Don't Skip Monthly Scans**: Late/missing scans = compliance issues
❌ **Don't Use Unauthenticated Scans**: FedRAMP requires credentialed scanning
❌ **Don't Ignore Low Findings**: They accumulate and signal poor hygiene
❌ **Don't Miss Submission Deadlines**: 30-day window is firm
❌ **Don't Modify Scan Results**: Report findings as-is, use POA&Ms for context

---

## Common ConMon Challenges

### Challenge 1: Scan Fatigue

**Problem**: Monthly authenticated scans impact system performance

**Solutions**:
- Schedule scans during low-usage windows
- Use agent-based scanning (Tenable.io agents, Qualys agents)
- Implement scan throttling
- Use scan zones (rotate which systems scanned weekly)

### Challenge 2: False Positives

**Problem**: Scanners report vulnerabilities that don't apply

**Solutions**:
- Document false positives in POA&M with justification
- Tune scanner plugins (disable irrelevant checks)
- Use authenticated scans to reduce false positives
- Maintain scanner exception lists

### Challenge 3: Vendor Patching Delays

**Problem**: Vendor hasn't released patch within remediation window

**Solutions**:
- Create POA&M with vendor dependency documented
- Implement compensating controls (firewall rules, WAF rules)
- Request timeline extension from AO
- Consider alternative vendor if chronic issue

### Challenge 4: Cloud-Native Findings

**Problem**: Container, serverless, and IaC findings don't map cleanly to NIST controls

**Solutions**:
- Use cloud-specific scanners (Prisma Cloud, Aqua, Wiz)
- Map cloud findings to infrastructure controls (CM-2, CM-6)
- Supplement with cloud-native controls (not in 800-53)
- Document cloud security posture in ConMon narrative

---

## ConMon Metrics and KPIs

**Track these metrics for AO visibility:**

| Metric | Target | Warning Threshold |
|---|---|---|
| Mean Time to Remediate (MTTR) - High | ≤15 days | >20 days |
| Mean Time to Remediate (MTTR) - Moderate | ≤45 days | >60 days |
| Open POA&Ms (total) | Decreasing trend | Increasing for 3+ months |
| Overdue POA&Ms | 0 | >5 |
| Scan Coverage (% of systems) | 100% | <95% |
| False Positive Rate | <10% | >20% |
| Repeat Findings (same vuln, multiple months) | 0 | >3 occurrences |

---

## References

- [FedRAMP Continuous Monitoring Playbook](https://www.fedramp.gov/resources/documents/Continuous_Monitoring_Playbook.pdf)
- [FedRAMP Continuous Monitoring Deliverables Template](https://www.fedramp.gov/resources/templates/FedRAMP-Continuous-Monitoring-Deliverables-Template.xlsx)
- [Continuous Monitoring (ConMon) Overview Training](https://www.fedramp.gov/assets/resources/training/200-D-FedRAMP-Training-Continuous-Monitoring-ConMon-Overview.pdf)
- [FedRAMP Continuous Monitoring Readiness | 38North Security](https://38northsecurity.com/article/how-continuous-monitoring-supports-fedramp-readiness/)
- [FedRAMP Continuous Monitoring Checklist | Anchore](https://anchore.com/fedramp/continuous-monitoring/)
