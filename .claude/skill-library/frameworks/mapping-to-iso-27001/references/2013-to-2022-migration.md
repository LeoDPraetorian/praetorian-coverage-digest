# ISO 27001:2013 to 2022 Migration Mapping

**Complete control migration reference for organizations transitioning from 2013 to 2022 standard.**

## Structural Changes

| Aspect | ISO 27001:2013 | ISO 27001:2022 | Change |
|--------|----------------|----------------|--------|
| **Controls** | 114 | 93 | -21 controls (consolidation) |
| **Structure** | 14 domains (A.5-A.18) | 4 themes (A.5-A.8) | Simplified |
| **Numbering** | A.x.y.z (e.g., A.6.1.1) | A.x.y (e.g., A.5.1) | Flattened |
| **New Controls** | N/A | 11 new controls | Modern threats |
| **Deprecated** | N/A | 0 (all preserved) | No removals |

##  Control Consolidation

**57 controls from 2013 merged into 24 controls in 2022.**

### Example Mergers

| 2013 Controls | 2022 Control | Rationale |
|---------------|--------------|-----------|
| A.12.4.1, A.12.4.2, A.12.4.3 (3 logging controls) | A.8.15 Logging | Consolidated logging requirements |
| A.9.1.1, A.9.1.2 (2 access policy controls) | A.5.15 Access control | Combined policy and procedure |
| A.6.1.1, A.6.1.2, A.6.1.3 (3 org responsibility) | A.5.1, A.5.2 | Simplified organizational governance |

## 11 New Controls in 2022

| Control | Name | Rationale |
|---------|------|-----------|
| **A.5.7** | Threat intelligence | Cyber threat intelligence feeds, threat analysis |
| **A.5.23** | Cloud security | Cloud-specific security requirements |
| **A.5.30** | ICT business continuity | Technical continuity planning |
| **A.7.4** | Physical security monitoring | Camera systems, badge access logging |
| **A.8.9** | Configuration management | Infrastructure as code, baseline hardening |
| **A.8.10** | Information deletion | Secure data wiping, retention compliance |
| **A.8.11** | Data masking | PII protection in non-production |
| **A.8.12** | Data leakage prevention | DLP tools, exfiltration detection |
| **A.8.16** | Monitoring activities | SIEM, security dashboards |
| **A.8.23** | Web filtering | Content filtering, malicious site blocking |
| **A.8.28** | Secure coding | OWASP Top 10, SAST/DAST |

## Example Mappings

### Direct 1:1 Mappings

| 2013 Control | 2022 Control | Name |
|--------------|--------------|------|
| A.9.2.1 | A.5.16 | User registration → Identity management |
| A.12.6.1 | A.8.24 | Cryptographic controls → Use of cryptography |
| A.15.1.1 | A.5.19 | Supplier security policy → Supplier relationships |

### Many-to-One Mergers

| 2013 Controls | 2022 Control | Name |
|---------------|--------------|------|
| A.6.1.1, A.6.1.2, A.6.1.3 | A.5.1, A.5.2 | Roles/responsibilities → Policies/responsibilities |
| A.12.4.1, A.12.4.2, A.12.4.3 | A.8.15 | Event/clock logging → Logging |

### One-to-Many Splits

| 2013 Control | 2022 Controls | Name |
|--------------|---------------|------|
| A.9.4.1 | A.8.2, A.8.3 | Restriction of access → Privileged access + Information access restriction |

## Migration Timeline

- **Publication:** October 25, 2022
- **Transition Period:** October 2022 - October 2025 (3 years)
- **Absolute Deadline:** October 31, 2025 (2013 certifications obsolete)
- **Current Status (2026):** All organizations must use 2022 standard

## Statement of Applicability (SoA) Update

**Mandatory actions:**

1. **Renumber all controls:** A.x.y.z format → A.x.y format
2. **Map merged controls:** Identify 2013 controls consolidated into single 2022 controls
3. **Assess 11 new controls:** Evaluate applicability, mark applicable/not applicable with risk-based justifications
4. **Update justifications:** All "Not Applicable" controls require risk assessment references

## Common Migration Mistakes

1. **Not updating SoA** - SoA must use 2022 control numbering
2. **Incomplete documentation updates** - All policies/procedures must reference 2022 controls
3. **Underestimating timeline** - Migration takes 2-24 months depending on organization size
4. **Inadequate staff training** - Employees must understand updated control structure
5. **Ignoring ISO 27002:2022** - Implementation guidance essential for new controls
6. **Premature 2013 abandonment** - Must maintain 2013 conformance until transition audit complete
7. **Documentation-only approach** - Controls must be operationally effective, not just documented

## Timeline by Organization Size

| Size | Employees | Timeline | Budget Range |
|------|-----------|----------|--------------|
| **Small** | 1-50 | 2-6 months | $15K - $50K |
| **Medium** | 51-500 | 6-12 months | $50K - $200K |
| **Large** | 500+ | 12-24 months | $200K - $1M+ |

## Migration Roadmap

**8-Phase Approach:**

1. **Preparation (Weeks 1-4):** Purchase standards, contact certification body, appoint team
2. **Gap Analysis (Weeks 5-8):** Map controls, identify 11 new controls, risk-based prioritization
3. **Documentation (Weeks 9-16):** Update ISMS scope, policies, procedures, SoA
4. **Implementation (Weeks 17-32):** Implement new controls, enhance merged controls
5. **Training (Weeks 20-36):** Staff training, awareness programs, supplier communication
6. **Internal Verification (Weeks 33-40):** Internal audit, mock transition audit
7. **Transition Prep (Weeks 41-44):** Evidence packages, staff briefing, audit scheduling
8. **Certification (Weeks 45+):** Transition audit (Stage 1 + Stage 2), remediation

## Resources

**Official ISO Documents:**
- ISO/IEC 27001:2022 - Information security management systems
- ISO/IEC 27002:2022 - Implementation guidance
- ISO/IEC 27001:2022/Amd 1:2024 - Climate action amendment

**Transition Guidance:**
- Certification body mapping tables (A-LIGN, BSI, NQA)
- Compliance platforms (ISOPlanner, 6clicks, Advisera, ISMS.online)

**Research Source:** `.claude/.output/research/2026-01-06-223847-iso-27001-2022-annex-a/SYNTHESIS.md` - Section "Interpretation 3: 2013 to 2022 Migration Mapping"
