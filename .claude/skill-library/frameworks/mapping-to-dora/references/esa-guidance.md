# ESA Guidance and Oversight Framework

**European Supervisory Authorities (EBA, ESMA, EIOPA) guidance, Joint DORA Oversight Function, national competent authority coordination, and proportionality guidance.**

## European Supervisory Authorities (ESAs)

### EBA - European Banking Authority

**Mandate:** Banking sector DORA implementation and supervision

**Website:** https://www.eba.europa.eu/regulation-and-policy/digital-operational-resilience-act-dora

**Key Guidance Published:**
- **Q&A on DORA Implementation** (ongoing updates)
- **Guidelines on ICT Risk Management** (cross-reference to EBA/GL/2019/04)
- **RTS on Incident Classification** (lead author, January 2024)
- **Proportionality Guidance for Smaller Credit Institutions**
- **TLPT Implementation Guide** (banking-specific examples)
- **Third-Party Risk Management Practices** (based on supervisory reviews)

**Sector Focus:**
- Credit institutions (banks, building societies)
- Payment institutions
- E-money institutions

**Contact:**
- Email: info@eba.europa.eu
- DORA-specific queries: DORA@eba.europa.eu

### ESMA - European Securities and Markets Authority

**Mandate:** Securities and markets DORA implementation and supervision

**Website:** https://www.esma.europa.eu/policy-activities/digital-operational-resilience-act-dora

**Key Guidance Published:**
- **DORA Implementation Roadmap** (timeline and milestones)
- **Guidelines for Investment Firms** (proportionality for smaller firms)
- **Trading Venue Resilience Standards** (TLPT requirements for exchanges)
- **CCP and CSD Specific Guidance** (enhanced testing requirements)
- **Crypto-Asset Provider Coordination** (DORA + MiCA interplay)

**Sector Focus:**
- Investment firms
- Trading venues (stock exchanges, MTFs, OTFs)
- Central securities depositories (CSDs)
- Central counterparties (CCPs)
- Crypto-asset service providers

**Contact:**
- Email: communications@esma.europa.eu
- DORA queries: DORA@esma.europa.eu

### EIOPA - European Insurance and Occupational Pensions Authority

**Mandate:** Insurance and pensions DORA implementation and supervision

**Website:** https://www.eiopa.europa.eu/browse/regulation/digital-operational-resilience_en

**Key Guidance Published:**
- **DORA Implementation Guide for Insurance Undertakings**
- **Proportionality for Small Insurance Companies**
- **IORPs Specific Guidance** (occupational pension schemes)
- **Outsourcing and Third-Party Risk** (insurance sector best practices)
- **Cyber Risk Scenarios for Insurance** (stress testing methodologies)

**Sector Focus:**
- Insurance and reinsurance companies
- Occupational retirement provision schemes (IORPs)
- Pension funds

**Contact:**
- Email: info@eiopa.europa.eu
- DORA queries: DORA@eiopa.europa.eu

---

## Joint DORA Oversight Function

### Establishment and Structure

**Created:** October 2024
**Legal Basis:** DORA Articles 31-44 (CTPP oversight)
**Members:** EBA + ESMA + EIOPA (integrated cross-sectoral)

**Purpose:**
- Unified oversight of critical ICT third-party service providers (CTPPs)
- Cross-sectoral coordination
- Consistent supervisory approach across ESAs
- Joint inspections and enforcement

### Governance Structure

**Joint Committee:**
- Representatives from all three ESAs
- Rotating chairmanship (annual)
- Decisions require consensus or qualified majority

**Lead Overseer Model:**
- Each CTPP assigned a "Lead Overseer" (EBA, ESMA, or EIOPA)
- Lead Overseer coordinates oversight activities
- Other ESAs participate based on provider's client base

**Example Lead Overseer Assignments:**
- AWS, Azure, Google Cloud → **EBA** (banking is largest user segment)
- FIS, Finastra, Temenos → **EBA** (core banking software)
- ION Group → **ESMA** (trading platform focus)
- Equinix, Digital Realty → **Joint** (cross-sector data centers)

### Oversight Activities

**Annual Oversight Plan:**
- Published Q1 each year
- Priority CTPPs for inspection
- Thematic reviews (e.g., ransomware resilience, AI/ML governance)
- Cross-sectoral risk assessments

**Information Requests:**
- Ad-hoc and scheduled data requests
- Governance documentation
- Security architecture reviews
- Incident reports and remediation

**On-Site Inspections:**
- Coordinated inspection teams
- Data center visits
- Personnel interviews
- Technical controls assessment
- Documentation review

**Supervisory Dialogue:**
- Regular meetings with CTPP senior management
- Emerging risk discussions
- Regulatory interpretation clarification
- Good practice sharing

**Enforcement Coordination:**
- Joint decision-making for non-compliance
- Consistent penalty frameworks
- Public disclosure coordination
- Appeal handling

---

## National Competent Authorities

### Role and Responsibilities

**Mandate:** Day-to-day supervision of financial entities (not CTPPs)

**Key Responsibilities:**
- Entity-level DORA compliance monitoring
- Incident report review and analysis
- ICT third-party register validation
- On-site inspections of financial entities
- Enforcement actions and penalties
- Coordination with ESAs

**NOT Responsible For:**
- CTPP oversight (this is ESA jurisdiction)

### National Authority Examples

**Banking:**
- Germany: **BaFin** (Federal Financial Supervisory Authority)
- France: **ACPR** (Autorité de Contrôle Prudentiel et de Résolution)
- Netherlands: **DNB** (De Nederlandsche Bank)
- Italy: **Banca d'Italia**
- Spain: **Banco de España**

**Securities:**
- Germany: **BaFin**
- France: **AMF** (Autorité des Marchés Financiers)
- Netherlands: **AFM** (Autoriteit Financiële Markten)
- Italy: **CONSOB**

**Insurance:**
- Germany: **BaFin**
- France: **ACPR**
- Netherlands: **DNB**
- Italy: **IVASS**

### Coordination with ESAs

**Information Sharing:**
- Incident reports escalated to ESAs (systemic incidents)
- Register submissions forwarded to ESAs (concentration risk analysis)
- TLPT results shared (sector-wide lessons learned)
- Enforcement actions coordinated

**Supervisory Colleges:**
- Cross-border entity supervision
- Home-host authority coordination
- Joint inspections for large groups

**Convergence:**
- ESA guidelines ensure consistent national practices
- Peer review of supervisory approaches
- Training and capacity building

---

## Proportionality Guidance for Smaller Entities

### General Principles

**DORA Article 4:** Proportionality based on size, complexity, nature, risk profile

**Application:**
- **Microenterprises**: Simplified framework (Article 15)
- **Small entities**: Streamlined requirements
- **Medium entities**: Standard requirements with flexibility
- **Large/significant entities**: Full requirements

### Proportionate ICT Risk Framework

**Risk Assessment:**
- **Microenterprises**: Annual simplified assessment (template-based)
- **Small**: Biannual risk assessment (focus on critical systems)
- **Medium**: Annual comprehensive assessment
- **Large**: Continuous risk assessment with quarterly updates

**Testing Frequency:**
- **Microenterprises**: Annual vulnerability scans (external-facing only)
- **Small**: Quarterly scans + annual penetration test
- **Medium**: Quarterly scans + biannual penetration tests
- **Large/Significant**: Continuous scanning + annual pen test + TLPT every 3 years

**Third-Party Management:**
- **Microenterprises**: Core Article 30 provisions only
- **Small**: Core provisions + concentration risk assessment
- **Medium**: Core + enhanced for critical functions
- **Large**: Full Article 30 + continuous monitoring

### Sector-Specific Proportionality

**Small Payment Institutions:**
- Simplified incident classification (focus on payment system availability)
- Proportionate TLPT (can use pooled approach)
- Streamlined register (critical providers only)

**Small Investment Firms:**
- Class 3 investment firms: Simplified requirements
- Class 2: Standard requirements
- Class 1: Full requirements including mandatory TLPT

**Small Insurance Companies:**
- Non-life insurance (property/casualty): Proportionate based on premium volume
- Life insurance: Enhanced requirements due to long-term obligations
- Reinsurance: Complexity-based (not just size)

**Credit Unions and Building Societies:**
- Member-based institutions: Proportionate to member count and asset base
- Limited product range: Focused risk assessment on offered services
- Local/regional: Reduced cross-border complexity

---

## Frequently Asked Questions (ESA Compilation)

### General DORA Questions

**Q: Does DORA replace national ICT risk regulations?**
**A:** Yes. DORA is directly applicable (no transposition needed) and supersedes conflicting national rules.

**Q: What if my entity is subject to both DORA and NIS2?**
**A:** Both apply. DORA for financial services aspects, NIS2 for network/information security. Timelines harmonized (4h/72h incident reporting).

**Q: When must I comply with DORA?**
**A:** January 17, 2025 (mandatory compliance date). No grace period.

### Incident Reporting Questions

**Q: Do I report to ESAs or national authorities?**
**A:** Financial entities report to **national competent authorities**. CTPPs report to **ESAs** (Joint Oversight Function).

**Q: What if I'm unsure if an incident is "major"?**
**A:** Apply Article 19 thresholds conservatively. If uncertain, report. Better to report and re-classify than miss mandatory notification.

**Q: Can I delay notification if forensic investigation is ongoing?**
**A:** No. Initial notification due within 4 hours of classification (max 24h after detection) with available information. Update in intermediate/final reports.

**Q: How do I coordinate DORA and GDPR breach notification?**
**A:** Run in parallel. DORA 4h (to financial regulator), GDPR 72h (to data protection authority). Use consistent information.

### Third-Party Risk Questions

**Q: Must I renegotiate all ICT contracts by January 2025?**
**A:** Yes. All contracts must include Article 30 provisions by effective date. Use amendments/addendums for speed.

**Q: What if a provider refuses audit rights?**
**A:** Audit rights are non-negotiable for critical/important functions. If provider refuses, must find alternative provider or accept regulatory non-compliance risk.

**Q: Does CTPP designation eliminate my responsibility?**
**A:** **No.** Entity remains fully responsible for Article 28-30 compliance even if provider is CTPP-designated.

**Q: Can I use a single cloud provider?**
**A:** Yes, but must document concentration risk assessment (Article 29) and justify why multi-cloud not feasible/proportionate.

### TLPT Questions

**Q: Must I conduct TLPT even if I'm a small entity?**
**A:** Only if designated as "significant" by competent authority. Most small entities exempt or use risk-based approach (>3 year cycle).

**Q: Can I use internal testers for TLPT?**
**A:** External testers required **at least once per 3-year cycle**. Internal allowed for 2 of 3 cycles if qualified.

**Q: What if TLPT red team finds critical vulnerabilities?**
**A:** Document in red team report, create remediation plan within 60 days, submit to competent authority. Vulnerabilities must be remediated per Article 9 timelines (7-14 days for critical).

**Q: Can multiple entities share a TLPT (pooled approach)?**
**A:** Yes. Smaller entities can pool resources for shared TLPT. Requires competent authority approval.

### Cost and Resources Questions

**Q: What are typical DORA compliance costs?**
**A:** Varies by entity size:
- Microenterprise: €10K-50K (contract remediation, simplified framework)
- Small: €100K-500K (testing, third-party management, training)
- Medium: €500K-2M (TLPT, enhanced controls, register maintenance)
- Large/Significant: €2M-10M+ (full TLPT, CTPP oversight support, continuous monitoring)

**Q: Are there EU funds to support DORA implementation?**
**A:** Limited. Some member states offer grants for SME cybersecurity. Primarily entity-funded.

**Q: How many FTEs needed for DORA compliance?**
**A:** Depends on size:
- Micro/Small: 0.5-2 FTEs (part-time or shared resources)
- Medium: 2-5 FTEs (dedicated ICT risk function)
- Large: 5-15 FTEs (ICT risk, compliance, testing teams)
- Significant: 15-50+ FTEs (enterprise programs, TLPT teams)

---

## Enforcement Approach (January 2026 Status)

### Current Posture

**Education First:**
- Regulators emphasizing guidance over immediate penalties
- Webinars, workshops, one-on-one consultations
- Published implementation checklists

**Tolerance for Documented Plans:**
- "Action plan" defense accepted initially
- Must demonstrate good-faith effort
- Progress tracking and milestone validation

**Focus Areas:**
- Incident reporting compliance (Article 19 timelines)
- Register submission accuracy (Article 28 first submission April 2025)
- Contract remediation progress (Article 30)

### Expected Evolution

**2025-2026: Transition Period**
- Educational approach continues
- Warning letters for minor non-compliance
- Public guidance on common mistakes

**2027+: Enforcement Intensification**
- Public enforcement actions for egregious cases
- Financial penalties for repeated non-compliance
- Precedent-setting cases published

**Aggravating Factors:**
- Delayed incident reporting (beyond 4h/72h/1m timelines)
- Failure to maintain register (Article 28)
- Refusal of competent authority inspections
- Repeat incidents from same root cause (learning failure)

---

## Official ESA Contact Points

### General Inquiries

- **EBA DORA Team:** DORA@eba.europa.eu
- **ESMA DORA Team:** DORA@esma.europa.eu
- **EIOPA DORA Team:** DORA@eiopa.europa.eu

### CTPP Oversight Inquiries

- **Joint Oversight Function:** CTPP-oversight@esas.europa.eu

### National Competent Authority Directory

- **EBA Register:** https://www.eba.europa.eu/about-us/organisation/supervisory-colleges
- **ESMA List:** https://www.esma.europa.eu/convergence/supervisory-disclosure
- **EIOPA List:** https://www.eiopa.europa.eu/national-competent-authorities_en
