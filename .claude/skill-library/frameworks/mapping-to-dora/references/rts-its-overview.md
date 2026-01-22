# DORA RTS/ITS Technical Standards

**Regulatory Technical Standards (RTS) and Implementing Technical Standards (ITS) provide detailed technical requirements for DORA implementation.**

## Overview

**RTS (Regulatory Technical Standards):**

- Detailed technical requirements elaborating DORA articles
- Adopted by European Commission via delegated acts
- Legally binding on financial entities

**ITS (Implementing Technical Standards):**

- Standardized templates, formats, and procedures
- Ensure uniform implementation across EU
- Directly applicable regulations

**Development:** ESAs (EBA, ESMA, EIOPA) develop RTS/ITS with public consultation
**Adoption:** European Commission adopts after review
**Status:** Two batches published (January 2024, July 2024)

---

## First Batch (January 2024)

### 1. RTS on ICT Risk Management Framework (Article 6)

**Governance structures and roles:**

- Management body responsibilities and approval requirements
- ICT risk management function organization and reporting
- Three lines of defense implementation
- Roles and responsibilities matrix (RACI)

**Risk assessment methodologies:**

- Asset-based risk assessment (ISO 27005 alignment)
- Threat modeling approaches (STRIDE, PASTA)
- Vulnerability assessment frameworks
- Risk scoring and prioritization (likelihood × impact matrices)

**Control frameworks:**

- Baseline security controls (based on ISO 27001, NIST CSF)
- Control effectiveness testing
- Compensating controls when primary unavailable
- Control maturity assessment

### 2. RTS on Incident Classification (Article 19)

**Quantitative thresholds:**

- €500,000 financial impact calculation methodology
- > 5% client base measurement (active clients vs total)
- > 2 hours downtime measurement (clock time vs cumulative)
- > 50,000 records breach (unique individuals vs data points)

**Qualitative criteria:**

- Service impact assessment decision trees
- Client impact severity scoring
- Duration and recovery complexity evaluation
- Geographic spread calculation (member states affected)
- Data loss sensitivity classification (PII, financial, proprietary)
- Criticality to financial stability assessment
- Economic impact estimation (direct + indirect + reputational)

**Classification decision trees:**

- Automated classification logic flows
- Edge case handling (borderline thresholds)
- Escalation triggers
- Re-classification procedures

### 3. RTS on ICT Third-Party Risk Policy (Articles 28-30)

**Multi-vendor strategy requirements:**

- Diversification targets by service category
- Concentration risk metrics and thresholds
- Alternative provider identification and qualification
- Migration complexity assessment

**Concentration risk methodologies:**

- Provider dependency mapping
- Substitutability scoring
- Switching cost analysis
- Sector-wide concentration calculation

**Contractual clause templates:**

- Standard language for Article 30 nine core provisions
- Enhanced clauses for critical/important functions
- Jurisdiction-specific variations (data residency)
- Negotiation fallback positions

### 4. ITS with Register Templates (Article 28)

**Standardized register format:**

- Excel/CSV templates for entity, sub-consolidated, consolidated registers
- Mandatory data fields and validation rules
- Optional fields for enhanced tracking

**Data fields and classifications:**

- Provider identification (LEI, jurisdiction, contact)
- Service description (standardized categorization)
- Criticality classification (critical/important/other criteria)
- Contract details (dates, renewal terms, exit notice)
- Data locations (ISO country codes, cloud regions)
- Subcontracting disclosure (nested relationships)

**Submission procedures:**

- Submission portals by member state
- File formats (XML, JSON, CSV)
- Encryption and secure transfer
- Validation and acknowledgment
- Update frequency (annual + material changes)

---

## Second Batch (July 2024)

### 5. RTS on Incident Reporting Framework (Articles 19-20)

**Reporting channels and formats:**

- Centralized reporting portals per member state
- API-based automated reporting
- Manual submission procedures (secure web forms)
- Backup channels (encrypted email for portal outages)

**Submission procedures and timelines:**

- Initial report (4h): Minimum data requirements
- Intermediate report (72h): Expanded data requirements
- Final report (1 month): Complete root cause analysis
- Amendment procedures (re-classification, updates)

**Cross-border coordination:**

- Home authority principle
- Information sharing between national authorities
- ESA notification for systemic incidents
- Multi-jurisdiction incident aggregation

### 6. RTS on TLPT Requirements (Articles 26-27)

**TIBER-EU framework alignment:**

- Mandatory TIBER-EU compliance for all TLPT
- February 2025 framework version required
- Purple teaming integration (2025 addition)
- National TIBER implementations (alignment requirements)

**Tester qualification standards:**

- 5+ years penetration testing experience
- Financial services sector knowledge requirements
- Professional indemnity insurance (minimum €5M coverage)
- Certifications: OSCP, CREST, CEH, GPEN recognized
- TIBER-EU training certification mandatory
- Background screening requirements

**Scope and frequency requirements:**

- Significant entities: Mandatory 3-year cycle
- Non-significant entities: Risk-based, recommended every 5 years
- Minimum 3 intelligence-based scenarios
- Critical functions coverage (100% over 3-year cycle)
- Scope boundaries (in-scope vs out-of-scope definitions)

**Reporting obligations post-TLPT:**

- Red team report to management within 30 days
- Remediation plan to competent authority within 60 days
- Regulatory submission format (standardized template)
- Lessons learned sharing (anonymized, voluntary)

### 7. RTS on Critical Provider Oversight (Articles 31-44)

**Designation process and criteria:**

- Systemic impact scoring methodology
- Concentration risk calculation (Herfindahl-Hirschman Index)
- Substitutability assessment framework
- Designation thresholds (quantitative + qualitative)

**ESA oversight procedures:**

- Lead Overseer assignment (EBA, ESMA, or EIOPA)
- Joint oversight committee structure
- Inspection planning and execution
- Information requests and deadlines
- Recommendation and comply-or-explain process

**Provider obligations and rights:**

- Notification obligations (material changes, incidents)
- Documentation requirements (risk management, governance)
- Inspection cooperation requirements
- Right to be heard before enforcement actions
- Appeal procedures

### 8. ITS on Oversight Reporting Templates

**CTPP compliance reporting formats:**

- Annual self-assessment report template
- Incident notification format (aligned with Article 19)
- Material change notification template
- Compliance metrics dashboard

**ESA data requests standardization:**

- Standard information request templates
- Response timelines and formats
- Confidentiality protections
- Data aggregation and anonymization

### 9. Guidelines on ICT Risk Management

**Proportionality application for smaller entities:**

- Simplified risk assessment methodologies
- Streamlined testing requirements
- Proportionate third-party oversight
- Reduced documentation burden

**Best practice examples:**

- Industry-specific implementation guidance (banking, insurance, investment)
- Technology-specific guidance (cloud, AI/ML, blockchain)
- Scenario-based examples (ransomware, DDoS, supply chain)

**Cross-reference with other regulations:**

- NIS2 Directive alignment (incident reporting timelines)
- GDPR coordination (data breach notification)
- PSD2 interplay (payment incident reporting)
- MiCA coordination (crypto-asset providers)

### 10. Guidelines on Information Sharing (Article 45)

**Legal frameworks for protected sharing:**

- Liability protections for good-faith sharing
- Antitrust safe harbors
- Data protection compliance (anonymization)
- Confidentiality agreements

**Anonymization standards:**

- Threat indicator sharing (IOCs, TTPs)
- Incident pattern disclosure (without entity identification)
- Vulnerability information exchange
- Re-identification risk mitigation

**Industry collaboration models:**

- FS-ISAC participation
- Sector-specific ISACs
- Cross-border information sharing
- Public-private partnerships

---

## Consultation Process

**Public consultations:**

- **420+ stakeholder responses** across two consultation rounds
- Financial institutions (banks, insurance, investment firms)
- ICT service providers (cloud, data centers, fintech)
- Industry associations (EBF, EFAMA, Insurance Europe)
- National competent authorities
- Individual experts

**Key concerns addressed:**

- **Proportionality:** Ensured smaller entities not overburdened
- **Extraterritoriality:** Clarified non-EU provider obligations
- **Cost impacts:** Assessed implementation costs, phased approach
- **Technical feasibility:** Validation of timelines and requirements
- **Overlap with other regulations:** Harmonization with NIS2, GDPR, PSD2

**Final adoption:**

- European Commission adopted RTS/ITS after ESA submission
- Effective immediately upon publication in Official Journal
- No additional transposition required (directly applicable)

---

## Accessing RTS/ITS Official Texts

**EUR-Lex (Official Journal):**

- DORA Regulation: https://eur-lex.europa.eu/eli/reg/2022/2554/oj
- Search for "DORA RTS" or "DORA ITS" for specific standards

**ESA Websites:**

- EBA: https://www.eba.europa.eu/regulation-and-policy/single-rulebook/interactive-single-rulebook/
- ESMA: https://www.esma.europa.eu/policy-rules/
- EIOPA: https://www.eiopa.europa.eu/publications_en

**Implementation Support:**

- National competent authority guidance (jurisdiction-specific)
- Industry association summaries (FS-ISAC, EBF, Insurance Europe)
- Legal firm analyses (Norton Rose Fulbright, DLA Piper, etc.)

---

## Future RTS/ITS Development

**Potential additional standards:**

- AI/ML risk management (as technology evolves)
- Quantum computing resilience (emerging threat)
- Cloud-specific requirements (beyond Article 30)
- Cyber insurance coordination
- Supply chain security (fourth-party risk)

**Review and update process:**

- ESAs required to review RTS/ITS every 3-5 years
- Technology evolution triggers
- Enforcement experience incorporation
- Stakeholder feedback cycles
