# NIST CSF 1.1 to 2.0 Migration Guide

**Official Mapping:** Appendix B in NIST CSWP 29
**Release Date:** February 26, 2024

## Major Changes Summary

| Change Type       | Details                                       |
| ----------------- | --------------------------------------------- |
| **New Function**  | GOVERN (GV) added as 6th function             |
| **Categories**    | 23 → 22 categories (PR.PT removed)            |
| **Subcategories** | 108 → 106 subcategories (16 conceptually new) |
| **Supply Chain**  | 5 → 10 subcategories (GV.SC largest category) |
| **Scope**         | Critical infrastructure → All organizations   |

## Category Migrations

### Categories Moved to GOVERN (GV)

| CSF 1.1 Category                 | CSF 2.0 Category                                | Notes                                |
| -------------------------------- | ----------------------------------------------- | ------------------------------------ |
| ID.BE (Business Environment)     | GV.OC (Organizational Context)                  | 5 subcategories migrated             |
| ID.GV (Governance)               | GV.PO (Policy) + GV.RR (Roles/Responsibilities) | Split across 2 categories            |
| ID.RM (Risk Management Strategy) | GV.RM (Risk Management Strategy)                | Expanded from 3 to 7-8 subcategories |
| ID.SC (Supply Chain Risk)        | GV.SC (Supply Chain Risk Management)            | Expanded from 5 to 10 subcategories  |

### Categories Removed/Redistributed

| CSF 1.1 Category              | CSF 2.0 Replacement                                         | Notes                       |
| ----------------------------- | ----------------------------------------------------------- | --------------------------- |
| PR.PT (Protective Technology) | PR.DS (Data Security) + PR.PS (Platform Security)           | Controls redistributed      |
| PR.AC (Access Control)        | PR.AA (Identity Management, Authentication, Access Control) | Renamed with expanded scope |

## Subcategory Mapping

### ID.BE → GV.OC (Business Environment to Organizational Context)

| CSF 1.1 | CSF 2.0             | Change                                      |
| ------- | ------------------- | ------------------------------------------- |
| ID.BE-1 | GV.OC-05            | Role of organization understood             |
| ID.BE-2 | GV.OC-02            | Place in critical infrastructure understood |
| ID.BE-3 | GV.OC-04            | Priorities communicated                     |
| ID.BE-4 | GV.OC-04 + GV.OC-05 | Dependencies established                    |
| ID.BE-5 | GV.OC-04            | Resilience requirements established         |

### ID.GV → GV.PO + GV.RR (Governance to Policy + Roles)

| CSF 1.1 | CSF 2.0  | Change                                       |
| ------- | -------- | -------------------------------------------- |
| ID.GV-1 | GV.PO-01 | Organizational policy established            |
| ID.GV-2 | GV.RR-02 | Roles and responsibilities coordinated       |
| ID.GV-3 | GV.OC-03 | Legal and regulatory requirements understood |
| ID.GV-4 | GV.OV-01 | Governance and risk management reviewed      |

### ID.RM → GV.RM (Risk Management Strategy)

| CSF 1.1 | CSF 2.0  | Change                                        |
| ------- | -------- | --------------------------------------------- |
| ID.RM-1 | GV.RM-01 | Risk management process established           |
| ID.RM-2 | GV.RM-04 | Risk tolerance determined                     |
| ID.RM-3 | GV.RM-06 | Risk appetite determined                      |
| (NEW)   | GV.RM-02 | Risk appetite and tolerance (new subcategory) |
| (NEW)   | GV.RM-03 | Enterprise integration (new subcategory)      |
| (NEW)   | GV.RM-05 | Communication lines (new subcategory)         |
| (NEW)   | GV.RM-07 | Positive risks tracked (new subcategory)      |
| (NEW)   | GV.RM-08 | Strategy review (new subcategory)             |

### ID.SC → GV.SC (Supply Chain - DOUBLED in size)

| CSF 1.1 | CSF 2.0  | Change                               |
| ------- | -------- | ------------------------------------ |
| ID.SC-1 | GV.SC-04 | Supply chain risk identified         |
| ID.SC-2 | GV.SC-05 | Suppliers assessed                   |
| ID.SC-3 | GV.SC-05 | Contracts address security           |
| ID.SC-4 | GV.SC-07 | Suppliers monitored                  |
| ID.SC-5 | GV.SC-02 | Response and recovery planning       |
| (NEW)   | GV.SC-01 | Program establishment (new)          |
| (NEW)   | GV.SC-03 | ERM integration (new)                |
| (NEW)   | GV.SC-06 | Pre-relationship due diligence (new) |
| (NEW)   | GV.SC-08 | Incident coordination (new)          |
| (NEW)   | GV.SC-09 | Lifecycle integration (new)          |
| (NEW)   | GV.SC-10 | Post-agreement management (new)      |

### PR.PT → PR.DS + PR.PS (Protective Technology Removed)

CSF 1.1 PR.PT controls were redistributed:

- Encryption controls → PR.DS (Data Security)
- Configuration management → PR.PS (Platform Security)
- Software maintenance → PR.PS-02

### PR.AC → PR.AA (Access Control Renamed)

| CSF 1.1 | CSF 2.0  | Change                             |
| ------- | -------- | ---------------------------------- |
| PR.AC-1 | PR.AA-01 | Identities and credentials managed |
| PR.AC-2 | PR.AA-02 | Physical access managed            |
| PR.AC-3 | PR.AA-03 | Remote access managed              |
| PR.AC-4 | PR.AA-05 | Access permissions managed         |
| PR.AC-5 | PR.AA-05 | Network integrity protected        |
| PR.AC-6 | PR.AA-01 | Identities proofed and bound       |
| PR.AC-7 | PR.AA-03 | Users/devices authenticated        |

## New Subcategories in CSF 2.0 (16 Conceptually New)

These have NO direct mapping to CSF 1.1:

1. **GV.RM-02:** Risk appetite and tolerance
2. **GV.RM-03:** Enterprise risk management integration
3. **GV.RM-05:** Communication lines for risk
4. **GV.RM-07:** Positive risks tracked
5. **GV.RM-08:** Strategy review by leadership
6. **GV.SC-01:** Supply chain program establishment
7. **GV.SC-03:** Supply chain ERM integration
8. **GV.SC-06:** Pre-relationship due diligence
9. **GV.SC-08:** Supplier incident coordination
10. **GV.SC-09:** Supply chain lifecycle integration
11. **GV.SC-10:** Post-agreement data handling
12. **ID.RA-08:** Vulnerability disclosure management
13. **RC.RP-03:** Recovery process updates (lessons learned)
14. Others in DE, RS functions (minor additions)

## 5-Phase Migration Process

### Phase 1: Governance Foundation (Weeks 1-4)

**Goal:** Establish new GOVERN function

**Actions:**

1. Review existing ID.BE, ID.GV, ID.RM, ID.SC mappings
2. Create GV.OC: Document organizational context (mission, stakeholders, dependencies)
3. Establish GV.RM: Define risk appetite, tolerance, calculation methods
4. Assign GV.RR: Clarify executive accountability and resource allocation
5. Update GV.PO: Formalize cybersecurity policies
6. Create GV.OV: Board-level oversight and KPI tracking

**Deliverables:**

- Governance charter
- Risk appetite statement
- RACI matrix
- Board briefing template

### Phase 2: Supply Chain Enhancement (Weeks 5-8)

**Goal:** Expand from 5 to 10 supply chain subcategories

**Actions:**

1. Implement GV.SC-01: Establish formal supply chain risk program
2. Conduct GV.SC-04: Inventory and prioritize all suppliers by criticality
3. Execute GV.SC-06: Pre-relationship due diligence for new vendors
4. Deploy GV.SC-07: Continuous supplier risk monitoring
5. Update GV.SC-05: Embed cybersecurity obligations in contracts
6. Plan GV.SC-08: Supplier incident response coordination
7. Implement GV.SC-09: Lifecycle security monitoring
8. Define GV.SC-10: Post-agreement data handling procedures

**Deliverables:**

- Supplier risk register
- Contract templates with cyber clauses
- Continuous monitoring plan
- Third-party risk dashboard

### Phase 3: Control Redistribution (Weeks 9-12)

**Goal:** Map PR.PT controls to new structure

**Actions:**

1. Identify all PR.PT (Protective Technology) implementations
2. Map encryption controls to PR.DS (Data Security)
3. Map configuration management to PR.PS (Platform Security)
4. Map software maintenance to PR.PS-02
5. Update control matrix documentation
6. Rename PR.AC to PR.AA where referenced
7. Update asset inventory tools (ID.AM) with new categories

**Deliverables:**

- Updated control matrix
- Platform security baselines
- Configuration management documentation

### Phase 4: Detection & Response Updates (Weeks 13-16)

**Goal:** Implement new detection and response subcategories

**Actions:**

1. Implement ID.RA-08: Vulnerability disclosure management process
2. Enhance DE.AE-02: Threat intelligence-enriched event analysis
3. Implement RS.MI-02/03: Processes for newly identified vulnerabilities
4. Update incident response playbooks with new RS subcategories
5. Test DE.CM-01: Network monitoring with new baseline requirements

**Deliverables:**

- Vulnerability disclosure policy
- Threat intelligence integration
- Updated incident response playbooks
- Network monitoring enhancements

### Phase 5: Recovery & Continuous Improvement (Weeks 17-20)

**Goal:** Close gaps and establish continuous improvement

**Actions:**

1. Implement RC.RP-03: Lessons learned in recovery processes
2. Establish ID.IM processes: Formal continuous improvement program
3. Conduct comprehensive gap analysis (all 106 subcategories)
4. Prioritize gap remediation by Tier impact
5. Update compliance dashboard for CSF 2.0
6. Train staff on new framework structure

**Deliverables:**

- Final CSF 2.0 compliance dashboard
- Gap remediation plan with ownership
- Training completion certificates
- Board presentation on CSF 2.0 adoption

## Common Migration Pitfalls

| Pitfall                         | Impact                     | Solution                                          |
| ------------------------------- | -------------------------- | ------------------------------------------------- |
| Ignoring new GV function        | Miss 30% of framework      | Prioritize governance foundation in Phase 1       |
| Assuming 1:1 mapping exists     | Incomplete implementation  | Review Appendix B in NIST CSWP 29 for all changes |
| Skipping supply chain expansion | High third-party risk      | Dedicate Phase 2 to GV.SC implementation          |
| Not updating tools/dashboards   | Outdated compliance view   | Update GRC platforms, SIEM dashboards, reporting  |
| Missing ID.RA-08 implementation | No vuln disclosure process | Establish coordinated disclosure program          |

## Tool Migration

### GRC Platforms

- **ServiceNow GRC:** CSF 2.0 profile available (built-in migration)
- **RSA Archer:** Requires control matrix update
- **OneTrust:** CSF 2.0 mapping released Q2 2024

### Security Platforms

- **Qualys VMDR:** Auto-maps findings to CSF 2.0 (update to latest version)
- **Tenable.io:** CSF 2.0 dashboard available
- **Splunk:** Update apps to CSF 2.0 dashboards

### Machine-Readable Format

Download official CSF 2.0 JSON for automated tool updates:
https://csrc.nist.gov/extensions/nudp/services/json/csf/download?olirids=all

## Official Resources

- **NIST CSWP 29 (CSF 2.0):** https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf
- **Appendix B - Subcategory Mapping:** Official 1.1 → 2.0 mapping table
- **Migration Guide:** NIST SP 1299 (CSF 2.0 Reference Tool Guide)
