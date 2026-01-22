# FedRAMP Baseline Control Matrices

**Complete baseline information for Low, Moderate, and High impact levels.**

---

## Baseline Overview

| Baseline     | Control Count | Impact Level    | Primary Use Cases                                             |
| ------------ | ------------- | --------------- | ------------------------------------------------------------- |
| **Low**      | 156 controls  | Low-impact      | Non-sensitive data, low-risk SaaS, public information systems |
| **Moderate** | 325 controls  | Moderate-impact | CUI, PII, most federal agencies (default baseline)            |
| **High**     | 421 controls  | High-impact     | National security, law enforcement, critical infrastructure   |

**Note**: Minor count variances (±2-8 controls) exist between sources due to Rev 5 transition and control enhancement counting. Always reference the official FedRAMP Security Controls Baseline spreadsheet for authoritative counts.

---

## Official FedRAMP Resources

### FedRAMP Security Controls Baseline Spreadsheet

**URL**: https://www.fedramp.gov/assets/resources/documents/FedRAMP_Security_Controls_Baseline.xlsx

**Format**: Excel (.xlsx)

**Contains**:

- All three baselines (Low/Moderate/High)
- Control enhancements by baseline
- P0/P1/P2 priority designations
- Control descriptions and requirements

**Usage**: Download and reference for authoritative control lists

### FedRAMP Rev 5 Transition Materials

**Main Page**: https://www.fedramp.gov/rev5-transition/

**Key Documents**:

1. **Transition Guide** (PDF): FedRAMP_Baselines_Rev5_Transition_Guide.pdf
   - Rev 4 to Rev 5 migration guidance
   - Control mapping changes
   - Timeline and milestones

2. **Assessment Controls Selection Template**
   - Excel template categorized by baseline
   - Worksheets: Rev 5 List of Controls, Conditional Controls, CSP-Specific Controls, Inherited Controls

3. **Rev 4 to Rev 5 Comparison Spreadsheet**
   - Side-by-side control comparisons
   - Identifies new, removed, and modified controls

### NIST 800-53 Spreadsheets

**URL**: https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final

**Available Formats**:

- Full control catalog in spreadsheet format
- Control baselines of SP 800-53B
- Machine-readable formats (JSON, XML)

---

## Baseline Selection Guidance

### When to Use Low Baseline (156 controls)

**Appropriate For**:

- Low-impact cloud services
- Public information systems
- No CUI or PII handling
- Limited integration with federal systems
- Low-risk SaaS applications

**Examples**:

- Public-facing informational websites
- Non-sensitive data processing
- Low-risk collaboration tools

**Key Characteristics**:

- Minimal security impact if breached
- No classified or sensitive data
- Limited authorization scope

### When to Use Moderate Baseline (325 controls)

**Appropriate For**:

- **Most federal agency systems (default choice)**
- Systems handling CUI (Controlled Unclassified Information)
- Sensitive PII processing
- Healthcare data (HIPAA alignment)
- Financial systems
- Moderate-risk cloud services

**Examples**:

- Federal employee management systems
- Grant management platforms
- Healthcare data platforms (not life-critical)
- Financial reporting systems

**Key Characteristics**:

- Default for federal agencies
- CUI or PII handling
- Moderate impact if breached
- Standard federal authorization

### When to Use High Baseline (421 controls)

**Appropriate For**:

- National security systems (unclassified)
- Law enforcement data systems
- Critical infrastructure protection
- Systems where breach = severe damage
- Mission-critical federal operations

**Examples**:

- Law enforcement databases
- Critical infrastructure control systems
- National security-related (unclassified) systems
- Emergency response systems

**Key Characteristics**:

- Severe or catastrophic impact if breached
- National security implications
- Life, safety, or critical mission impact
- Enhanced security requirements

---

## Baseline Progression (Control Enhancements)

Controls build upon each other across baselines:

### Example: SI-2 (Flaw Remediation)

**Low Baseline**:

- SI-2 (base control): Identify, report, correct flaws

**Moderate Baseline** (adds enhancements):

- SI-2 (base control)
- SI-2(1): Central Management
- SI-2(2): Automated Flaw Remediation

**High Baseline** (adds more enhancements):

- SI-2 (base control)
- SI-2(1): Central Management
- SI-2(2): Automated Flaw Remediation
- SI-2(3): Time to Remediate
- SI-2(6): Removal of Previous Versions

**Pattern**: Higher baselines = Base control + cumulative enhancements

---

## Baseline Decision Tree

```
┌─────────────────────────────────────┐
│ Does system handle classified data?│
└──────────┬──────────────────────────┘
           │
           ├─── YES ──→ NOT FedRAMP (use DoD IL levels)
           │
           └─── NO ───┐
                      │
          ┌───────────▼────────────────────────────┐
          │ Severity if system is compromised?    │
          └───────────┬────────────────────────────┘
                      │
          ┌───────────┼───────────┬────────────────┐
          │           │           │                │
      Minimal     Low-Moderate  Serious        Severe/
                                              Catastrophic
          │           │           │                │
          │           │           │                │
      Not FedRAMP   LOW       MODERATE          HIGH
      (public)   (156 ctrls) (325 ctrls)    (421 ctrls)
```

---

## Control Family Distribution by Baseline

### Low Baseline (156 controls)

Focus areas:

- AC (Access Control): Core access controls
- AU (Audit): Basic logging
- IA (Identification/Authentication): Authentication fundamentals
- SC (Communications): Basic encryption
- SI (System Integrity): Fundamental protections

### Moderate Baseline (325 controls)

Adds to Low:

- CM (Configuration Management): Enhanced configuration control
- IR (Incident Response): Comprehensive incident handling
- RA (Risk Assessment): Regular risk assessments
- CA (Assessment/Authorization): Ongoing authorization
- Enhanced controls across all families

### High Baseline (421 controls)

Adds to Moderate:

- PE (Physical/Environmental): Enhanced physical security
- MP (Media Protection): Advanced data protection
- PS (Personnel Security): Enhanced background checks
- Advanced enhancements across all families
- Redundancy and fault tolerance controls

---

## Common Questions

### Q: Can I start with Low and upgrade to Moderate later?

**A**: Yes, but requires re-authorization. It's often more efficient to target the correct baseline initially. Consider your long-term plans.

### Q: How long does authorization take?

**A**:

- Low: 3-6 months (LI-SaaS: 3 months)
- Moderate: 6-12 months
- High: 12-18+ months

### Q: What if I'm between baselines?

**A**: Default to the higher baseline. FedRAMP doesn't allow "hybrid" baselines. If handling any CUI, must use at least Moderate.

### Q: How often must I reassess?

**A**:

- Annual 3PAO assessment (all baselines)
- Continuous monitoring (monthly scans, quarterly reviews)
- Significant change reassessments

---

## References

- [Official FedRAMP Understanding Baselines](https://www.fedramp.gov/understanding-baselines-and-impact-levels/)
- [FedRAMP Rev 5 Transition Guide](https://www.fedramp.gov/assets/resources/documents/FedRAMP_Baselines_Rev5_Transition_Guide.pdf)
- [NIST SP 800-53 Rev 5](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final)
- [FedRAMP Baseline Spreadsheet](https://www.fedramp.gov/assets/resources/documents/FedRAMP_Security_Controls_Baseline.xlsx)
