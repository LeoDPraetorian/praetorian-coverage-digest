---
name: mapping-to-dora
description: Use when mapping security findings to EU DORA requirements for financial services compliance - provides ICT risk framework structure, incident classification (€500K/>5%/>2h/>50K thresholds), TLPT requirements (3-year TIBER-EU cycle with purple teaming), and third-party risk mapping (Article 30 contractual obligations, 19 CTPPs designated)
allowed-tools: Read
---

# Mapping Findings to EU DORA

**Help map security findings from capabilities (VQL, Nuclei, Janus, etc.) to Digital Operational Resilience Act (DORA) requirements for financial institutions in the EU.**

> **EU DORA (Regulation 2022/2554)** establishes **ICT risk management** requirements organized into **5 pillars** across **64 articles**, effective **January 17, 2025** for financial entities. **19 critical ICT providers designated November 2025** including AWS, Azure, Google Cloud.

## When to Use

Use this skill when:

- Writing security capabilities targeting EU financial institutions requiring DORA compliance
- Mapping security findings to DORA articles for regulatory reporting
- Determining if a security incident meets DORA reporting thresholds (Article 19: €500K, >5% clients, >2h downtime, >50K records)
- Understanding which DORA chapter covers a specific security control or process
- Aligning vulnerability findings with ICT risk management requirements (Chapter II: 7-14 day critical remediation)
- Assessing third-party ICT service provider risks (Chapter V: Article 30 contractual obligations, CTPP oversight)
- Planning threat-led penetration testing (TLPT per Articles 24-27: 3-year TIBER-EU cycle with mandatory purple teaming)
- Building compliance reports for DORA-regulated financial entities

## Critical Rules

### 1. DORA Applies to Financial Entities Only

DORA regulates **financial entities** and **ICT third-party service providers** supporting them:

| Entity Type                       | Examples                          | DORA Obligation                       |
| --------------------------------- | --------------------------------- | ------------------------------------- |
| Credit institutions               | Banks, building societies         | Full Chapter II-V compliance          |
| Payment institutions              | Payment processors, e-money       | Full compliance                       |
| Investment firms                  | Broker-dealers, trading platforms | Full compliance                       |
| Crypto-asset service providers    | Exchanges, wallet providers       | Full compliance                       |
| ICT third-party service providers | Cloud providers, SaaS for finance | Chapter V + oversight (Article 28-44) |
| Non-financial entities            | Manufacturing, retail, healthcare | NOT covered by DORA                   |

**Extraterritoriality:** DORA applies to **non-EU ICT providers** serving EU financial entities (similar to GDPR). AWS, Microsoft Azure, Google Cloud subject to oversight as US companies.

**Critical Provider Designation:** **19 critical ICT third-party providers (CTPPs)** designated November 2025, including AWS, Azure, Google Cloud, Oracle Cloud, Equinix, Cloudflare, FIS, Finastra. Subject to direct ESA oversight with penalties up to 1% of daily worldwide turnover.

**See:** [references/covered-entities.md](references/covered-entities.md) for complete entity classification.

### 2. Map to Specific Articles, Not Just Pillars

Use specific article numbers (Article 9, Article 19) not pillar names alone (ICT risk management).

| ❌ Too Generic      | ✅ Specific Article                   | When                        |
| ------------------- | ------------------------------------- | --------------------------- |
| ICT Risk Management | Article 9 (ICT risk framework)        | Risk identification process |
| Incident Reporting  | Article 19 (classification)           | Incident thresholds         |
| Testing             | Article 24-27 (TLPT requirements)     | Penetration testing scope   |
| Third-party Risk    | Article 30 (contractual arrangements) | Vendor contracts            |

### 3. Understand Reporting Thresholds (Article 19)

Not all security incidents trigger DORA reporting. Article 19 defines **major ICT-related incident** classification.

**Quantitative Thresholds (any one triggers reporting):**

- **Financial impact**: >€500,000
- **Client impact**: >5% of client base affected
- **Downtime**: >2 hours for critical services
- **Data breach**: >50,000 records compromised

**Automatic Classification Triggers:**

- Any successful unauthorized access to production systems
- Ransomware affecting critical/important functions
- Data breach of customer financial data

**Reporting Timeline:**

| Stage        | Timeline                          | Content                                                   |
| ------------ | --------------------------------- | --------------------------------------------------------- |
| Initial      | 4h after classification (max 24h) | Incident description, classification, initial impact      |
| Intermediate | 72h after classification          | Detailed impact, root cause progress, remediation         |
| Final        | 1 month after classification      | Complete root cause, lessons learned, preventive controls |

**See:** [references/incident-classification.md](references/incident-classification.md) for complete threshold criteria, qualitative assessment, client notification requirements, and RTS details.

---

## DORA Framework Structure

### Five Pillars Overview

| Pillar                                     | Articles | Focus Area                  | Key Requirements                            |
| ------------------------------------------ | -------- | --------------------------- | ------------------------------------------- |
| **Chapter II: ICT Risk Management**        | 5-16     | Governance, risk frameworks | ICT risk management framework (Article 9)   |
| **Chapter III: Incident Reporting**        | 17-23    | Major incidents, threats    | Classification and reporting (Article 19)   |
| **Chapter IV: Digital Resilience Testing** | 24-27    | TLPT, testing programs      | Threat-led penetration testing (Article 26) |
| **Chapter V: Third-Party Risk**            | 28-44    | ICT service providers       | Contractual arrangements (Article 30)       |
| **Chapter VI: Info Sharing**               | 45       | Threat intelligence         | Voluntary intelligence sharing              |

**See:** [references/framework-structure.md](references/framework-structure.md) for detailed pillar breakdown with all 64 articles.

---

## Quick Reference

### Chapter II: ICT Risk Management (Articles 5-16)

| Vulnerability Pattern                    | DORA Article | Article Title                  | Evidence Type                     |
| ---------------------------------------- | ------------ | ------------------------------ | --------------------------------- |
| No documented ICT risk policy            | Article 6    | ICT risk management framework  | Policy documentation audit        |
| Missing vulnerability management process | Article 9    | Identification                 | Vulnerability scan cadence review |
| Unpatched critical vulnerabilities       | Article 9    | Protection and prevention      | Patch management audit            |
| No incident response plan                | Article 11   | Response and recovery          | IRP documentation review          |
| Missing backup/recovery testing          | Article 11   | Backup policies and procedures | Recovery test results             |
| Inadequate change management             | Article 10   | Business continuity policy     | Change control audit              |
| No ICT asset inventory                   | Article 8    | Identification                 | Asset discovery scan              |
| Missing security monitoring              | Article 15   | Communication                  | SIEM/logging review               |

**Vulnerability Remediation Timelines (Article 9 - Protection and Prevention):**

| CVSS Score | Severity | DORA Remediation Timeline | Reporting if Exploited?                      |
| ---------- | -------- | ------------------------- | -------------------------------------------- |
| 9.0-10.0   | Critical | 7-14 days                 | YES - likely meets Article 19 thresholds     |
| 7.0-8.9    | High     | 30 days                   | Depends - assess against Article 19 criteria |
| 4.0-6.9    | Medium   | 60-90 days                | Unlikely unless part of attack chain         |
| 0.1-3.9    | Low      | Risk-based (90+ days)     | No                                           |

### Chapter III: Incident Reporting (Articles 17-23)

| Finding Type                       | DORA Article  | Reporting Trigger             | Timeline                                       |
| ---------------------------------- | ------------- | ----------------------------- | ---------------------------------------------- |
| Major data breach (customer PII)   | Article 19    | Major ICT-related incident    | Initial: 4h, Intermediate: 72h, Final: 1 month |
| Ransomware attack on core banking  | Article 19    | Service availability impact   | Same as above                                  |
| Significant DDoS attack            | Article 19    | Prolonged unavailability      | Same as above                                  |
| APT threat detection               | Article 19(2) | Material impact on operations | As soon as aware                               |
| Minor phishing attempt (no impact) | N/A           | Not reportable under DORA     | Internal tracking                              |

**See:** [references/incident-classification.md](references/incident-classification.md) for detailed thresholds and RTS criteria.

### Chapter IV: Digital Resilience Testing (Articles 24-27)

| Security Testing Activity             | DORA Article  | Requirement                         | Frequency                      |
| ------------------------------------- | ------------- | ----------------------------------- | ------------------------------ |
| Threat-led penetration testing (TLPT) | Article 26    | Mandatory for significant entities  | Every 3 years (Article 26(11)) |
| Vulnerability assessments             | Article 25    | Part of testing program             | At least annually              |
| Scenario-based testing                | Article 24    | ICT risk assessment components      | Regular cadence                |
| Red team exercises                    | Article 26    | TLPT execution (TIBER-EU framework) | Per 3-year cycle               |
| Purple teaming                        | Article 26    | Mandatory (2025 TIBER-EU update)    | Part of TLPT cycle             |
| Open-source intelligence gathering    | Article 26(2) | Threat intelligence in TLPT         | Part of TLPT cycle             |

**TIBER-EU Framework:** 3 phases (Preparation 6 months, Testing 12+ weeks, Closure 2-4 months), minimum 3 intelligence-based scenarios, external testers required at least once per cycle, purple teaming mandatory as of February 2025 update.

**See:** [references/tlpt-requirements.md](references/tlpt-requirements.md) for detailed TLPT methodology, tester qualifications, cost considerations, and RTS requirements.

### Chapter V: Third-Party ICT Risk (Articles 28-44)

| Third-Party Risk Finding                      | DORA Article     | Requirement                   | Evidence Type              |
| --------------------------------------------- | ---------------- | ----------------------------- | -------------------------- |
| Missing SLA with cloud provider               | Article 30       | Contractual arrangements      | Vendor contract review     |
| No exit strategy in vendor contract           | Article 30(2)(i) | Exit plans                    | Contract exit clause audit |
| Vendor lacks SOC 2 Type II                    | Article 30       | Service quality monitoring    | Vendor attestation review  |
| No vendor risk assessment                     | Article 28       | Risk management principles    | Third-party risk register  |
| Concentration risk (single cloud provider)    | Article 29       | Concentration risk assessment | Cloud dependency analysis  |
| Vendor in non-EU jurisdiction (data transfer) | Article 30       | Legal considerations          | Data residency audit       |
| Subcontractor not disclosed                   | Article 30(2)(f) | Subcontracting arrangements   | Subcontractor inventory    |

**Article 30 Core Requirements:** 9 contractual provisions (service descriptions, SLAs, security requirements, audit rights, notification obligations, right to inspect, exit strategies, business continuity, liability). Enhanced requirements for critical/important functions include TLPT participation, subcontractor transparency, continuous monitoring.

**Register of Contractual Arrangements:** Annual reporting to competent authority (first submission April 30, 2025) at entity, sub-consolidated, and consolidated levels.

**See:** [references/third-party-risk.md](references/third-party-risk.md) for detailed Article 30 requirements, contract remediation process, CTPP oversight framework, and RTS contractual clauses.

---

## Common Mapping Scenarios

### Cloud Security Findings

**Scenario:** Exposed S3 bucket with customer financial data

**DORA Mapping:**

- **Article 9** (Identification) - Asset misconfiguration identified
- **Article 11** (Protection) - Data protection control failure
- **Article 19** (Incident reporting) - Potential major incident if exploited (>50K records = automatic reporting)
- **Article 30** (Third-party risk) - Cloud provider (AWS) contractual obligations, audit rights

**Evidence:** Cloud security posture scan, IAM policy audit, incident report (if applicable), vendor contract review

### Vulnerability Management

**Scenario:** Critical vulnerability (CVSS 9.8) unpatched for 60 days

**DORA Mapping:**

- **Article 9** (Identification) - Vulnerability identified but not remediated within 7-14 day timeline
- **Article 11** (Protection and prevention) - Patch management process failure
- **Article 8** (ICT systems, protocols, tools) - Inadequate vulnerability management
- **Article 6** (Risk framework) - Risk assessment and prioritization gaps

**Evidence:** Vulnerability scan results, patch management logs, risk register update, remediation plan

**Compliance Gap:** Critical vulnerabilities must be remediated within 7-14 days (Article 9). 60-day delay is non-compliant.

### Incident Response

**Scenario:** Ransomware attack on payment processing system

**DORA Mapping:**

- **Article 19** (Classification) - Major ICT-related incident (service availability impact, likely >2h downtime threshold)
- **Article 11** (Response and recovery) - Incident response plan execution, backup restoration
- **Article 19(1)** (Reporting) - Initial report within 4 hours to competent authority
- **Article 17** (Detection and notification) - Detection mechanism effectiveness, client notification
- **Article 15** (Logging) - SIEM/logging evidence for forensic analysis

**Evidence:** Incident timeline, 4h/72h/30d reports to regulator, client notifications, recovery procedures, root cause analysis, backup test results

**Reporting Triggers:** Service downtime >2 hours (quantitative), payment system impact (qualitative criticality), potential data exfiltration if double extortion.

### Third-Party Vendor Assessment

**Scenario:** Cloud provider (Azure) lacks DORA-compliant contract terms

**DORA Mapping:**

- **Article 28** (General principles) - Third-party risk management framework gaps
- **Article 30** (Contractual arrangements) - Missing core provisions (audit rights, exit strategy, TLPT participation)
- **Article 29** (Concentration risk) - If Azure is sole cloud provider, concentration risk assessment required
- **Articles 31-44** (CTPP oversight) - Azure designated as CTPP, subject to ESA oversight (provides some assurance)

**Evidence:** Contract gap analysis against Article 30 checklist, concentration risk assessment, multi-vendor strategy documentation

**Remediation:** Contract amendment or addendum adding DORA provisions, exit strategy development and testing, consideration of multi-cloud architecture.

---

## Integration

### Called By

- `gateway-security` - Security capability routing for compliance mapping
- `capability-developer` - When tagging security findings with regulatory frameworks
- Security analysts building DORA compliance reports
- Incident response teams classifying and reporting major incidents

### Requires (invoke before starting)

None - standalone reference skill providing DORA framework knowledge.

### Calls (during execution)

None - terminal skill providing documentation and mapping guidance.

### Pairs With (conditional)

| Skill                  | Trigger                      | Purpose                                                              |
| ---------------------- | ---------------------------- | -------------------------------------------------------------------- |
| `mapping-to-iso-27001` | When dual compliance needed  | Cross-reference ISO controls with DORA articles                      |
| `mapping-to-nist-csf`  | US + EU compliance           | Map NIST CSF functions to DORA requirements                          |
| `cvss-scoring`         | Vulnerability prioritization | Determine if vulnerability severity triggers DORA reporting          |
| `mapping-to-nis2`      | Network security entities    | Coordinate DORA and NIS2 Directive compliance (harmonized timelines) |

---

## References

- [references/framework-structure.md](references/framework-structure.md) - Complete 5-pillar breakdown, all 64 articles, governance structures
- [references/covered-entities.md](references/covered-entities.md) - 20+ entity types, microenterprise exemptions, proportionality, extraterritoriality
- [references/incident-classification.md](references/incident-classification.md) - Article 19 thresholds, reporting timelines (4h/72h/1m), RTS criteria, client notification, cross-border coordination
- [references/tlpt-requirements.md](references/tlpt-requirements.md) - TIBER-EU 3-phase methodology, tester qualifications, purple teaming (2025 update), cost considerations, compliance checklist
- [references/third-party-risk.md](references/third-party-risk.md) - Chapter V Articles 28-44, Article 30 9 core provisions, CTPP designation (19 providers), contract remediation process, ESA oversight powers
- [references/rts-its-overview.md](references/rts-its-overview.md) - Regulatory Technical Standards (January 2024 batch, July 2024 batch), Implementing Technical Standards, consultation process, compliance deadlines
- [references/esa-guidance.md](references/esa-guidance.md) - EBA/ESMA/EIOPA guidance, Joint DORA oversight function, national competent authority coordination, proportionality for smaller entities, FAQs

---

## Related Resources

### Official Documentation

- **DORA Regulation**: https://eur-lex.europa.eu/eli/reg/2022/2554/oj
- **EBA (Banking)**: https://www.eba.europa.eu/regulation-and-policy/digital-operational-resilience-act-dora
- **ESMA (Securities)**: https://www.esma.europa.eu/policy-activities/digital-operational-resilience-act-dora
- **EIOPA (Insurance)**: https://www.eiopa.europa.eu/browse/regulation/digital-operational-resilience_en
- **ECB Banking Supervision**: https://www.bankingsupervision.europa.eu/
- **TIBER-EU Framework** (Feb 2025): https://www.ecb.europa.eu/pub/pdf/other/ecb.tiber_eu_framework.en.pdf

### RTS/ITS Documents

RTS (Regulatory Technical Standards) and ITS (Implementing Technical Standards) are delegated acts that provide detailed technical requirements for DORA implementation.

**Published Standards:**

- January 2024: ICT risk framework, incident classification, third-party policy, register templates
- July 2024: Incident reporting framework, TLPT requirements, CTPP oversight, reporting templates

**See:** [references/rts-its-overview.md](references/rts-its-overview.md) for tracking published RTS/ITS with links to official texts.

---

## Changelog

See [.history/CHANGELOG](.history/CHANGELOG) for version history and updates.
