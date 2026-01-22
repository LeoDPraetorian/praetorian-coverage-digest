# DORA Third-Party ICT Risk Management

**Chapter V (Articles 28-44) implementation guidance: contractual requirements, concentration risk assessment, CTPP oversight framework, and vendor management strategies.**

## Overview

Chapter V establishes comprehensive requirements for managing ICT third-party service provider risks, with two sections:

- **Section I** (Articles 28-30): Principles for all financial entities
- **Section II** (Articles 31-44): Oversight framework for critical providers (CTPPs)

---

## Article 28: General Principles

### Integrated Third-Party Risk Management

Financial entities must establish framework covering:

- **Due diligence** before contracting
- **Risk assessment** of providers
- **Continuous monitoring** during relationship
- **Exit management** for orderly termination

### Multi-Vendor Strategy

**Required:** Diversification to avoid single points of failure

- Identify critical dependencies on single providers
- Develop alternatives for essential services
- Document multi-vendor approach and rationale
- Balance cost vs resilience trade-offs

### Register of Contractual Arrangements

**Three-level register required:**

1. **Entity-level:** Individual legal entity's contracts
2. **Sub-consolidated:** Group subcontracts
3. **Consolidated:** Full group-wide view

**Annual reporting** to national competent authority (first submission: April 30, 2025)

**Register contents:**

- ICT service provider details (name, jurisdiction, contact)
- Services provided and criticality classification (critical/important/other)
- Contract dates, renewal terms, notice periods
- Data locations and processing jurisdictions
- Subcontracting relationships and chains
- Business continuity arrangements
- Exit strategy provisions

---

## Article 29: Concentration Risk Assessment

### Assessment Criteria

**Provider Substitutability:**

- Can provider be replaced? How quickly?
- What's the cost of switching?
- Are alternatives technically compatible?
- Migration complexity and data portability

**Multiple Dependencies:**

- Reliance on single provider or connected group?
- Services from provider's subsidiaries/affiliates?
- Indirect dependencies through subcontractors?

**Alternative Analysis:**

- What alternatives exist in market?
- Cost-benefit comparison of alternatives
- Technical feasibility of migration
- Timeframes for provider replacement

**Third-Country Considerations:**

- Legal and regulatory risks of non-EU providers
- Jurisdiction access to data (CLOUD Act for US providers)
- Data residency and sovereignty requirements
- Conflict of laws scenarios

**Subcontracting Chains:**

- Hidden dependencies in subcontractor relationships
- Fourth-party and fifth-party risks
- Transparency of full service delivery chain

**Sector-Wide Concentration:**

- Are many financial entities using same provider?
- Systemic risk if provider fails
- Coordinated approach needed?

### Concentration Risk Mitigation

**Strategies:**

- **Multi-cloud architecture:** AWS + Azure + GCP distribution
- **Exit strategy development:** Documented migration procedures
- **Contract portability:** Data formats, API access, export capabilities
- **Data migration testing:** Annual validation of export/import procedures
- **Backup provider identification:** Pre-qualified alternatives
- **Hybrid approaches:** On-premise + cloud distribution

---

## Article 30: Contractual Arrangements

### Nine Core Contractual Provisions

**Mandatory for ALL ICT service arrangements:**

1. **Clear service descriptions** with defined service levels (SLAs)
   - Availability targets (e.g., 99.9% uptime)
   - Performance metrics (response times, throughput)
   - Support and maintenance windows

2. **Full service description** including locations and data processing
   - Data center locations (geographic regions)
   - Data processing activities (storage, compute, analytics)
   - Data transfer mechanisms and encryption

3. **Security requirements** and controls obligations
   - Provider security baseline (ISO 27001, SOC 2)
   - Encryption standards (TLS 1.3, AES-256)
   - Access controls and identity management
   - Vulnerability management and patching

4. **Access rights** for financial entity and regulators
   - Entity audit rights (on-site, remote, third-party auditors)
   - Regulator inspection rights (ESA, national authorities)
   - Scope of access (systems, documentation, personnel)

5. **Notification obligations** for incidents, changes, subcontracting
   - Incident reporting timelines (align with Article 19)
   - Material change notifications (M&A, leadership, infrastructure)
   - Subcontractor additions/changes (advance notice)

6. **Right to audit** and inspect provider operations
   - Audit frequency (at least annually for critical functions)
   - Scope and methodology
   - Remediation of findings
   - Cost allocation

7. **Exit strategies** with data portability and migration support
   - Transition assistance duration (e.g., 12 months)
   - Data export formats (structured, machine-readable)
   - Knowledge transfer and documentation
   - Cost of exit services

8. **Business continuity** requirements for provider
   - Provider BC/DR capabilities
   - RTO/RPO commitments aligned with entity needs
   - BC testing participation
   - Disaster declaration and invocation procedures

9. **Liability and indemnification** provisions
   - Liability caps and exclusions
   - Indemnification for third-party claims
   - Insurance requirements
   - Breach remedies

### Enhanced Requirements for Critical/Important Functions

**Beyond the core nine provisions:**

**TLPT Participation:**

- Provider must participate in financial entity's threat-led penetration testing
- Coordination for red team activities
- Access to provider infrastructure for testing (with safeguards)
- Remediation of TLPT findings

**Subcontractor Transparency:**

- Full disclosure of all subcontractors
- Fourth-party and fifth-party risk visibility
- Right to object to subcontractor changes
- Subcontractor security attestations

**Enhanced Data Protection:**

- Encryption at rest and in transit (end-to-end)
- Data residency controls (EU-only, specific regions)
- Key management under entity control (BYOK)
- Data loss prevention (DLP) controls

**Continuous Monitoring:**

- Real-time security posture visibility
- Automated compliance reporting
- Anomaly detection and alerting
- Log aggregation and SIEM integration

**Change Management:**

- Advance notification of infrastructure changes (30-90 days)
- Change advisory board participation
- Rollback procedures for problematic changes
- Emergency change protocols

**Disaster Recovery Testing:**

- Joint BC/DR exercises (at least annually)
- Failover testing with provider
- Recovery validation
- Lessons learned and improvement plans

**Regulatory Cooperation:**

- Provider support for competent authority requests
- Direct regulator access (for CTPPs, ESA access)
- Compliance documentation and evidence
- Regulatory examination support

---

## Contract Remediation Process

### Phase 1: Discovery (1-2 months)

**Inventory all ICT service arrangements:**

- Centralized contract repository
- Shadow IT discovery (unapproved services)
- Business unit surveys
- Invoice analysis for undocumented services

**Classify by criticality:**

- **Critical:** Unavailability causes major incident (>2h downtime, >€500K impact)
- **Important:** Significant impact but not major incident
- **Other:** Supporting services with limited impact

**Identify contractual gaps:**

- Map existing contracts against Article 30 checklist
- Flag missing provisions
- Assess legal vs operational gaps

### Phase 2: Gap Analysis (1 month)

**Prioritize by risk:**

- Critical functions first
- Providers with highest concentration risk
- Non-EU providers (extraterritoriality risks)
- Contracts expiring soonest

**Provider willingness assessment:**

- Large cloud providers: Standard DORA addendums available
- Mid-size providers: Negotiation likely required
- Small/niche providers: May lack DORA readiness

**Identify showstoppers:**

- Providers refusing audit rights
- No exit strategy provisions
- Jurisdictional conflicts (non-EU data access)
- Unacceptable liability limitations

### Phase 3: Remediation Planning (1 month)

**Negotiation strategy per provider:**

- Use provider's standard DORA addendum (if available)
- Customize for critical/important function enhancements
- Legal escalation plan for non-negotiable terms
- Alternative provider evaluation if negotiations fail

**Contract amendments vs new contracts:**

- Amendment/addendum for existing relationships (faster)
- New contract for major renewals or new services
- Grandfather clauses for legacy services (time-limited)

**Fallback positions:**

- Minimum acceptable terms (core 9 provisions)
- Enhanced terms for critical functions (TLPT, monitoring)
- Deal-breakers (audit rights, exit strategy non-negotiable)

### Phase 4: Negotiation & Implementation (3-6 months)

**Engage providers:**

- Formal notification of DORA requirements
- Provide Article 30 checklist and gap analysis
- Request provider's DORA compliance documentation
- Schedule contract negotiation sessions

**Execute amendments:**

- Legal review and approval
- Signature authority (board for critical providers)
- Effective date coordination (Jan 17, 2025 target)
- Version control and repository update

**Update register and report:**

- Update three-level register with new contract terms
- Submit annual register to competent authority (April 30 deadline)
- Document remediation status (complete, in progress, not achieved)

---

## Critical ICT Third-Party Provider (CTPP) Oversight

### First CTPP Designation (November 18, 2025)

**19 providers designated across 4 categories:**

**Hyperscale Cloud (4):**

- Amazon Web Services (AWS)
- Microsoft Azure
- Google Cloud Platform (GCP)
- Oracle Cloud Infrastructure (OCI)

**Data Centers (4):**

- Equinix
- Digital Realty
- Cyxtera Technologies
- InterXion

**Infrastructure/Network (3):**

- Cloudflare
- Akamai Technologies
- Lumen Technologies

**Financial Services Technology (8):**

- FIS
- Finastra
- ION Group
- Temenos
- Broadridge
- SS&C Technologies

**Expected future designations (mid-2025):**

- Payment networks: Visa, Mastercard
- Additional clouds: Alibaba, IBM
- Cybersecurity: Managed SOC, threat intelligence providers
- Communication: Collaboration platforms

### CTPP Designation Criteria (Article 31)

**Systemic Impact:**

- Failure disrupts financial system stability
- High number of dependent financial entities
- Cross-border and cross-sector reliance

**Systemic Importance:**

- Supports critical/important functions
- Interconnected with financial infrastructure
- Contagion risk potential

**Concentration Risk:**

- Limited alternatives in market
- High switching costs/technical lock-in
- Market dominance in category

**Substitutability:**

- Difficulty replacing provider
- Time required for migration (>6-12 months)
- Technical complexity of switch

### ESA Oversight Powers (Articles 32-44)

**Direct Oversight:**

- ESA jurisdiction (not national authorities)
- Joint oversight: EBA + ESMA + EIOPA (Lead Overseer model)
- Coordinated examinations

**Assessment Authority:**

- On-site/off-site inspections
- Access to data, documentation, facilities
- Personnel interviews
- Risk management and governance review
- Security controls assessment

**Enforcement Mechanisms:**

| Tool                | Application                  | Max Penalty                            |
| ------------------- | ---------------------------- | -------------------------------------- |
| Recommendations     | Non-binding guidance         | N/A                                    |
| Comply or Explain   | Must implement or justify    | N/A                                    |
| Public Disclosure   | ESA publishes non-compliance | Reputation                             |
| Periodic Penalties  | Daily penalties              | 1% of average daily worldwide turnover |
| Service Suspension  | Ban new EU clients           | Revenue loss                           |
| Service Restriction | Scope limits                 | Revenue loss                           |

**Provider Obligations:**

- Submit to ESA inspections
- Provide documentation and data
- Implement ESA recommendations or explain
- Notify ESAs of material changes
- Report major incidents to ESAs
- Maintain EU representative

---

## Cloud Provider DORA Responses

### AWS Approach

- **Shared Responsibility Model**: AWS infrastructure security, customer data/application security
- **DORA Compliance Hub**: Guidance, templates, tool recommendations
- **Contractual Addendums**: Pre-drafted Article 30 clauses
- **Audit Frameworks**: SOC 2 Type II, ISO 27001 reports
- **Exit Tools**: Data migration services, portability guidance

### Microsoft Azure Approach

- **Trust Center**: DORA compliance documentation
- **Azure Blueprints**: Pre-configured financial services frameworks
- **Microsoft Sentinel**: SIEM for Article 15 logging
- **Defender for Cloud**: Security posture for Articles 8-9
- **Service Health Dashboard**: Article 19 incident notification

### Google Cloud Approach

- **Compliance Resource Center**: DORA-specific guidance
- **Risk Protection Program**: Enhanced SLAs for regulated entities
- **Chronicle Security**: Threat detection and SIEM
- **Assured Workloads**: Data residency and sovereignty
- **Multi-cloud assistance**: Article 29 concentration risk mitigation

### Common Themes

- **Partnership mindset**: Compliance enablers, not adversaries
- **Transparency**: Enhanced visibility into infrastructure, incidents
- **Built-in tools**: Compliance features reducing entity burden
- **Education**: Training materials, workshops, webinars
- **Collaboration**: ESA engagement, industry association participation

---

## Key Takeaways

1. **Entity responsibility not eliminated**: CTPP designation does NOT remove financial entity's Article 28-30 obligations
2. **Contractual remediation urgent**: All contracts must include Article 30 provisions (effective Jan 17, 2025)
3. **Concentration risk assessment mandatory**: Multi-vendor strategies required
4. **Exit strategy critical**: Must be documented, tested annually
5. **CTPPs face direct oversight**: ESA jurisdiction with significant enforcement powers
6. **Extraterritoriality confirmed**: Non-EU providers subject to DORA (AWS, Azure, GCP designated)
