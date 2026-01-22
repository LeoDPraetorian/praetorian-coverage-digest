# NIST CSF 2.0 Implementation Tier Progression Guide

**Source:** Industry synthesis from research (NIST intentionally provides no quantitative criteria)

## Overview

NIST CSF 2.0 maintains four implementation tiers that measure cybersecurity risk management maturity. **Critical limitation:** NIST intentionally provides NO specific progression criteria, offering flexibility but creating challenges for consistent assessment.

## The 4 Tiers

| Tier                       | Risk Management Process          | Integrated Risk Mgmt Program   | External Participation      | Example Characteristics                     |
| -------------------------- | -------------------------------- | ------------------------------ | --------------------------- | ------------------------------------------- |
| **Tier 1 (Partial)**       | Ad hoc, reactive                 | Isolated by department         | Limited awareness           | Manual processes, no automation             |
| **Tier 2 (Risk Informed)** | Risk-aware, no org-wide policy   | Risk-informed but not org-wide | Aware but no formal sharing | Basic automation, scheduled activities      |
| **Tier 3 (Repeatable)**    | Formal policy, regularly updated | Org-wide approach              | Formal collaboration        | Automated continuous processes, centralized |
| **Tier 4 (Adaptive)**      | Adaptive, lessons learned        | Real-time risk-based           | Proactive, real-time intel  | ML-based, predictive, automated response    |

## Industry Distribution (2024-2025)

- **Tier 1:** ~40% of organizations
- **Tier 2:** ~35% of organizations
- **Tier 3:** ~20% of organizations
- **Tier 4:** ~5% of organizations (large enterprises with mature programs)

## Tier Progression Criteria (Synthesized)

### Tier 1 → Tier 2: From Ad-Hoc to Risk-Aware

**Core Requirements:**

1. **Governance (GV):**
   - Establish GV.RM-02: Document risk appetite statement
   - Implement GV.PO-01: Formal cybersecurity policies created
   - Assign GV.RR-02: Defined roles/responsibilities

2. **Identify (ID):**
   - Implement ID.RA-01: Scheduled vulnerability scanning (weekly/monthly)
   - Begin ID.AM-01/02: Asset inventory (at least manual spreadsheet)

3. **Protect (PR):**
   - Implement PR.AA-03: MFA for privileged accounts
   - Begin PR.PS-02: Patch management process (monthly patches)

4. **Detect (DE):**
   - Deploy DE.CM-01: Basic SIEM or log aggregation with alerting
   - Establish DE.AE-01: Network baseline documented

5. **Respond (RS):**
   - Document RS.MA-01: Written incident response plan

**Success Indicators:**

- Risk discussions at management level (not just IT)
- Documented policies and procedures
- Basic tools deployed (vulnerability scanner, SIEM)
- Timeline: 3-6 months from Tier 1

### Tier 2 → Tier 3: From Risk-Informed to Repeatable

**Core Requirements:**

1. **Governance (GV):**
   - Implement GV.RM-03: Cybersecurity integrated into enterprise risk management (board-level reporting)
   - Establish GV.OV-01: Quarterly board cybersecurity reviews
   - Implement GV.SC-06/07: Formal supplier risk assessment program

2. **Identify (ID):**
   - Automate ID.AM-01/02/03: Asset discovery via CMDB/network scanners
   - Implement ID.RA-02: Threat intelligence feeds integrated
   - Continuous ID.RA-01: Daily vulnerability scanning

3. **Protect (PR):**
   - Implement PR.AA-05: Centralized access management (LDAP/AD/IAM)
   - Enforce PR.PS-01: Configuration baselines with compliance scanning
   - Achieve PR.PS-02: <7 days for Critical/High CVE patching (90%+ compliance)

4. **Detect (DE):**
   - Establish SOC (Security Operations Center)
   - Implement DE.CM-01: 24/7 monitoring with alerting
   - Implement DE.AE-02: Automated event correlation

5. **Respond (RS):**
   - Conduct RS.CO: Tabletop exercises (quarterly)
   - Implement RS.MI-01: Automated containment playbooks
   - Achieve RS metrics: MTTR <4 hours

6. **Recover (RC):**
   - Test RC.RP-01: Recovery plan tested annually
   - Implement PR.DS-11: Automated backup testing

**Success Indicators:**

- Board-level cybersecurity reporting (quarterly)
- Centralized security operations
- Automated asset discovery and vulnerability management
- <7 day patch SLA for critical vulnerabilities
- Timeline: 12-18 months from Tier 2

### Tier 3 → Tier 4: From Repeatable to Adaptive

**Core Requirements:**

1. **Governance (GV):**
   - Implement GV.RM-04: Risk-adaptive strategy (adjust based on real-time threat intel)
   - Implement GV.OV-03: Real-time KPI dashboards for leadership
   - Achieve GV.SC-07: Continuous supplier risk monitoring with automated alerts

2. **Identify (ID):**
   - Implement ID.RA-02/03: Real-time threat intelligence integration (automated enrichment)
   - Implement predictive risk analytics (ML-based)
   - Proactive threat hunting (DE.CM with advanced analytics)

3. **Protect (PR):**
   - Implement adaptive access controls (PR.AA-05 with behavior analytics)
   - Zero Trust Architecture (ZTA) implemented
   - Automated security control tuning based on threat landscape

4. **Detect (DE):**
   - Implement DE.AE-02: ML/AI-based anomaly detection
   - User Entity Behavior Analytics (UEBA) deployed
   - Automated threat hunting with orchestration

5. **Respond (RS):**
   - Implement SOAR (Security Orchestration, Automation, Response)
   - Achieve RS.MI-01: Automated response to 80%+ of incidents
   - Achieve RS metrics: MTTD <5 minutes, MTTR <1 hour (automated)

6. **Recover (RC):**
   - Implement automated failover and recovery
   - Chaos engineering / resilience testing

**Success Indicators:**

- Real-time risk-adaptive security controls
- 80%+ of incidents handled with automated response
- ML/AI-based predictive analytics operational
- <5 minute MTTD, <1 hour MTTR
- Timeline: 18-36 months from Tier 3

## Tier Self-Assessment Questionnaire

For each question, score: 0 (No), 1 (Partial), 2 (Yes)

**Governance (GV):**

- Do you have documented risk appetite and tolerance? (GV.RM-02)
- Does the board receive regular cybersecurity briefings? (GV.OV-01)
- Do you have formal supplier risk assessment processes? (GV.SC-06/07)

**Identify (ID):**

- Is asset discovery automated? (ID.AM-01/02)
- Do you conduct continuous vulnerability scanning? (ID.RA-01)
- Do you integrate threat intelligence feeds? (ID.RA-02)

**Protect (PR):**

- Is MFA enforced for privileged accounts? (PR.AA-03)
- Can you patch Critical CVEs within 7 days? (PR.PS-02)
- Do you enforce configuration baselines? (PR.PS-01)

**Detect (DE):**

- Do you have 24/7 security monitoring? (DE.CM-01)
- Do you have automated event correlation? (DE.AE-02)
- Do you conduct proactive threat hunting? (DE.CM advanced)

**Respond (RS):**

- Do you have documented incident response plans? (RS.MA-01)
- Do you conduct regular IR drills/tabletops? (RS.CO)
- Do you have automated incident response? (RS.MI-01 with SOAR)

**Recover (RC):**

- Do you test backup restoration? (PR.DS-11, RC.RP-01)
- Can you meet recovery time objectives? (RC.RP-02)
- Do you update recovery plans post-incident? (RC.RP-03)

**Scoring:**

- **0-12 points:** Tier 1 (Partial)
- **13-24 points:** Tier 2 (Risk Informed)
- **25-30 points:** Tier 3 (Repeatable)
- **31-36 points:** Tier 4 (Adaptive)

## Chariot Platform Tier Mapping

| Chariot Capability     | Tier 1    | Tier 2                 | Tier 3                         | Tier 4                              |
| ---------------------- | --------- | ---------------------- | ------------------------------ | ----------------------------------- |
| Asset Discovery        | Manual    | Scheduled scans        | Automated continuous           | Real-time with ML classification    |
| Vulnerability Scanning | On-demand | Daily/weekly scheduled | Continuous with prioritization | Predictive + automated remediation  |
| Compliance Dashboards  | None      | Basic reports          | Centralized real-time          | Executive + ML-based gap prediction |
| Incident Response      | Manual    | Documented playbooks   | Automated playbooks            | SOAR with ML triage                 |
| Threat Intelligence    | None      | Basic feeds            | Integrated feeds               | Real-time enrichment + hunting      |
| Supply Chain Risk      | Ad-hoc    | Vendor lists           | Risk assessments               | Continuous monitoring + alerts      |

## Official Sources

- **NIST CSWP 29** (February 26, 2024): https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf
- Tier characteristics from NIST CSF 2.0, Section 3
- Quantitative criteria synthesized from industry implementations (Qualys, Tenable, ServiceNow GRC)
