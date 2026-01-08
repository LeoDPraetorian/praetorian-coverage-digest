# Postmarket Requirements - Vulnerability Management and Disclosure

**FDA Guidance:** Postmarket Management of Cybersecurity in Medical Devices (December 2016)

**Legal Foundation:** 21 CFR Part 803 (Medical Device Reporting), 21 CFR Part 820 (Quality System Regulation), PATCH Act (October 2023)

---

## Risk-Based Framework

FDA uses **"reasonable time"** language rather than fixed deadlines. Timelines are **risk-calibrated** based on:
- Patient harm severity
- Exploitability level
- Availability of compensating controls
- Deployment context (hospital vs. home)

### Controlled vs. Uncontrolled Risk

**Controlled Risk (Acceptable)**
- Residual risk acceptable with compensating controls
- Most routine patches treated as "device enhancements"
- Do NOT require 21 CFR 806 reporting
- Standard patch cycle (next release)

**Uncontrolled Risk (Unacceptable)**
- Unacceptable patient safety risk
- Requires urgent remediation
- May trigger MDR reporting (21 CFR 803)
- 30-60 day response timeline

---

## Coordinated Vulnerability Disclosure (CVD) Timeline

### Standard CVD Process

**Day 0-7: Discovery & Acknowledgment**
- Researcher notifies vendor
- Vendor acknowledges receipt (48-72 hours)
- Initial triage and severity assessment

**Day 7-90: Patch Development & Testing**
- Vendor develops and tests patch
- Standard CVD window: 90 days
- May be extended for complex vulnerabilities

**Day 90: Public Disclosure**
- Default public disclosure deadline
- Negotiable based on risk factors
- Coordinated release with patch availability

**30-Day Voluntary FDA Notification**
- FDA recommends (but does NOT mandate) notifying them within 30 days
- Provides enforcement discretion for Part 806 reporting
- Facilitates coordination and guidance

### Real-World Timeline Performance

**Industry data shows:**
- **93% fail to meet 30-60 day timelines**
- **Average timeline: 4.5-6 months** from discovery to patch
- **Case studies:**
  - Hillrom Medical Devices: 3-month initial patch, 17-month complete remediation
  - Baxter Welch Allyn: CVSS 10.0 vulnerability with 7-month gap between patch and advisory
  - Ventilator recalls: 8,957 devices unaccounted for after 2 years

---

## CISA/ICS-CERT Coordination

### Voluntary Coordination Benefits

**FDA strongly encourages** coordination through CISA/ICS-CERT:
- Facilitates multi-stakeholder coordination
- Provides technical expertise
- Offers enforcement discretion for Part 806
- CISA generally won't publish without manufacturer consent during cooperative disclosure

### ICS-CERT Process

1. **Voluntary disclosure** to ICS-CERT
2. **Coordination** with manufacturer on timeline
3. **Technical review** and advisory drafting
4. **Joint release** with patch availability
5. **Public advisory** publication (ICS-CERT ICSMA-XX-XXX-XX format)

### CISA CVD Timeline Standards

- **45-day minimum** for unresponsive vendors
- **Flexible based on risk factors**:
  - Multi-patient harm devices: Longer coordination
  - Critical infrastructure: Extended timeline
  - Complex remediation: Negotiable deadline

---

## Medical Device Reporting (MDR) Requirements

### 21 CFR Part 803 Triggers

MDR reporting is **REQUIRED** when vulnerabilities:
- Cause or contribute to death or serious injury
- Would likely cause death or serious injury if malfunction recurred

### MDR Reporting Timeline

**30 days** from becoming aware of reportable event

### Most Cybersecurity Vulnerabilities Do NOT Trigger MDR

**MDR applies ONLY when:**
- Actual patient harm occurred
- Vulnerability was exploited in clinical setting
- Malfunction would likely recur and cause harm

**MDR does NOT apply when:**
- Vulnerability discovered proactively (no exploitation)
- Compensating controls prevent patient harm
- Risk assessment determines controlled risk

---

## PATCH Act Requirements (Effective October 2023)

### Mandatory Elements

Cyber devices MUST include:
1. **Documented vulnerability monitoring plan**
2. **Processes for delivering updates in "reasonable time"**
3. **SBOM** (Software Bill of Materials)
4. **SPDF** (Security Product Data File) - under development
5. **Vulnerability intake process** for external researchers

### Impact

- **700% increase in FDA deficiency letters** since PATCH Act took effect
- Averaging **15 concerns per submission**
- Many submissions lack adequate threat modeling and traceability

---

## Patch Management Lifecycle

### Phase 1: Discovery (Day 0)

**Sources:**
- External researcher disclosure
- Internal security testing
- SBOM-based vulnerability monitoring (KEV catalog, NVD)
- Threat intelligence feeds
- Customer reports

**Actions:**
- Acknowledge receipt (48-72 hours)
- Assign tracking ID
- Initial triage

### Phase 2: Assessment (Day 1-7)

**Risk Assessment:**
- Technical exploitability (CVSS scoring)
- Patient harm severity (ISO 14971)
- Deployment context (hospital, home, ambulance)
- Affected device population
- Availability of compensating controls

**Classification:**
- Controlled risk vs. uncontrolled risk
- Tier 1 (multi-patient harm) vs. Tier 2
- Response timeline determination

### Phase 3: Remediation (Day 7-60)

**Patch Development:**
- Root cause analysis
- Security fix design
- Code implementation
- Unit testing and regression testing
- Security testing (re-test vulnerability)

**Design Controls Integration:**
- Change order under 21 CFR 820.30
- Risk management update (ISO 14971)
- Verification and validation
- Quality system documentation

### Phase 4: Validation (Day 30-60)

**Testing:**
- Functional testing (no regression)
- Security testing (vulnerability mitigated)
- Performance testing (no degradation)
- Compatibility testing (all device variants)
- Field trial (pilot deployment)

**Documentation:**
- Test reports
- Risk assessment update
- Traceability to vulnerability
- FDA notification (if 30-day voluntary)

### Phase 5: Distribution (Day 60+)

**Deployment Strategy:**
- Phased rollout (pilot → production)
- Field Safety Notice (FSN) to customers
- Update instructions and guidance
- Monitoring and verification

**Communication:**
- Customer notification (healthcare providers, biomedical engineering)
- Patient communication (if applicable)
- Public advisory (coordinated with ICS-CERT)
- Security bulletin publication

---

## SBOM-Driven Vulnerability Management

### Continuous Monitoring Process

1. **SBOM Maintenance**
   - Update SBOM with component changes
   - Track all dependencies (direct and transitive)
   - Document support lifecycle

2. **Vulnerability Database Cross-Reference**
   - **CISA KEV Catalog**: Known Exploited Vulnerabilities (prioritize these)
   - **NVD**: National Vulnerability Database (CVE matching)
   - **VEX**: Vulnerability Exploitability eXchange (mitigation status)

3. **Risk-Based Prioritization**
   - KEV catalog vulnerabilities: Immediate assessment
   - High/Critical CVSS + patient harm: 30-day timeline
   - Medium/Low CVSS + minimal harm: 90-day or standard cycle

4. **Compensating Controls Assessment**
   - Network segmentation
   - Access control (authentication, authorization)
   - Monitoring and alerting
   - Firewall rules and allow-listing

5. **Remediation or Risk Acceptance**
   - Patch available: Deploy according to risk timeline
   - No patch available: Document compensating controls and risk acceptance
   - Legacy device: Risk acceptance with mitigation strategy

---

## ISAO Participation Benefits

### Information Sharing Analysis Organizations

**FDA encourages** active participation in ISAOs (e.g., H-ISAC, Med-ISAO):
- **Threat intelligence sharing**: Early warning of emerging vulnerabilities
- **Coordination**: Multi-manufacturer coordination for shared components
- **Enforcement discretion**: FDA more lenient on Part 806 reporting timelines when coordinating through ISAO

**Benefits:**
- Access to vulnerability intelligence feeds
- Peer learning on remediation strategies
- Regulatory coordination and guidance

---

## Industry Statistics

### Vulnerability Trends

- **386% increase** in ICS-CERT medical device advisories since 2016 guidance
- **60% of vulnerabilities** stem from authentication and code defects
- **22% decline in patch references** in 2024 advisories
- **Four major vendors** (Baxter, BD, Medtronic, Philips) account for nearly half of all disclosed vulnerabilities

### CVD Program Adoption

- Only **27 of top 40 manufacturers** maintain public CVD programs
- **68% of disclosures** driven by researchers, not manufacturers
- **70% of infusion pumps** remain unpatched in surveyed hospitals

### Legacy Device Challenges

- **10-15 million legacy devices** in U.S. hospitals
- Many lack encryption, passwords, or update capabilities
- **8,957 ventilator devices** unaccounted for 2 years after recall
- Risk acceptance necessary for unremediable vulnerabilities

---

## Communication Templates

### Field Safety Notice (FSN)

**Required Elements:**
- Vulnerability description (non-technical summary)
- Affected device models and versions
- Patient safety impact assessment
- Compensating controls (immediate actions)
- Patch availability and installation instructions
- Timeline for remediation
- Contact information for questions

### Security Advisory

**Required Elements:**
- CVE identifier (if assigned)
- CVSS score and vector
- Vulnerability description
- Affected products and versions
- Remediation guidance (patch, workaround, compensating controls)
- Credit to researcher (if applicable)
- ICS-CERT coordination acknowledgment

### 30-Day FDA Notification

**Recommended Content:**
- Device identification (510(k) number, trade name)
- Vulnerability description and CVE
- Risk assessment (exploitability + patient harm)
- Affected device population
- Remediation timeline and strategy
- Compensating controls (if no patch available)
- Communication plan to customers

---

## Enforcement Considerations

### FDA Enforcement Discretion

**FDA exercises enforcement discretion when:**
- Manufacturer is actively coordinating through CISA/ICS-CERT
- Timelines are risk-appropriate
- Communication to customers is timely
- Quality system integration is demonstrated
- ISAO participation shows due diligence

**FDA enforcement actions when:**
- Vulnerability known but not disclosed
- No patch provided within reasonable time
- Inadequate customer communication
- Quality system failures (inadequate design controls)
- Patient harm occurred due to negligence

---

## Key Regulatory References

- FDA Guidance: Postmarket Management of Cybersecurity in Medical Devices (2016)
  https://www.fda.gov/regulatory-information/search-fda-guidance-documents/postmarket-management-cybersecurity-medical-devices
- 21 CFR Part 803 (Medical Device Reporting)
- 21 CFR Part 820 (Quality System Regulation)
- PATCH Act (Protecting and Transforming Cyber Health Care Act) - October 2023
- CISA KEV Catalog: https://www.cisa.gov/known-exploited-vulnerabilities-catalog
- ICS-CERT Medical Device Advisories: https://www.cisa.gov/uscert/ics/advisories
