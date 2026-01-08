# Severity Classification - Dual-Axis Framework

**FDA Framework:** Exploitability (CVSS-based) + Patient Harm (ISO 14971)

**Key Principle:** FDA's cybersecurity risk tiers are **independent** of traditional device classification (Class I/II/III)

---

## Dual-Axis Framework

### Two-Dimensional Risk Assessment

```
Risk Classification = f(Exploitability, Patient Harm)

Exploitability Axis: Technical likelihood of successful exploitation (CVSS metrics)
Patient Harm Axis: Clinical severity of potential patient safety impact (ISO 14971)

Result: Controlled Risk (acceptable) or Uncontrolled Risk (requires remediation)
```

### Matrix

| Exploitability | Catastrophic Harm | Critical Harm | Serious Harm | Minor Harm | Negligible Harm |
|---------------|------------------|---------------|--------------|------------|-----------------|
| **High**      | UNCONTROLLED     | UNCONTROLLED  | UNCONTROLLED | CONTROLLED | CONTROLLED      |
| **Medium**    | UNCONTROLLED     | UNCONTROLLED  | CASE-BY-CASE | CONTROLLED | CONTROLLED      |
| **Low**       | UNCONTROLLED     | CASE-BY-CASE  | CONTROLLED   | CONTROLLED | CONTROLLED      |

---

## Patient Harm Categories (ISO 14971)

| Severity Level | Description                                    | Clinical Examples                                      | Response Timeline |
|---------------|------------------------------------------------|-------------------------------------------------------|-------------------|
| **Catastrophic (Level 5)** | Patient death | Insulin pump overdose, ventilator failure, pacemaker reprogramming | Immediate |
| **Critical (Level 4)** | Permanent impairment or irreversible injury | Permanent organ damage, loss of function | 30 days |
| **Serious/Major (Level 3)** | Injury requiring professional medical intervention | ER visit, hospitalization, surgical intervention | 30-60 days |
| **Minor (Level 2)** | Temporary injury not requiring medical intervention | Temporary discomfort, delayed diagnosis | 90 days |
| **Negligible (Level 1)** | Inconvenience or temporary discomfort | UI annoyance, cosmetic issue | Standard cycle |

---

## Exploitability Levels (CVSS v3.0+ Metrics)

### CVSS Metrics for Medical Devices

**Attack Vector (AV)**
- **Network (N)**: Remotely exploitable (internet, hospital network)
- **Adjacent Network (A)**: Adjacent network access required (same subnet)
- **Local (L)**: Local access required (physical proximity, USB)
- **Physical (P)**: Physical access to device required

**Attack Complexity (AC)**
- **Low (L)**: No special conditions, straightforward exploitation
- **High (H)**: Requires specific conditions (race condition, elevated privileges)

**Privileges Required (PR)**
- **None (N)**: No authentication required
- **Low (L)**: Basic user authentication
- **High (H)**: Administrator/elevated privileges

**User Interaction (UI)**
- **None (N)**: Exploitation without user action
- **Required (R)**: Requires user action (click link, open file)

### Exploitability Scoring

| CVSS Base Score | Exploitability Level | Typical Characteristics |
|----------------|---------------------|------------------------|
| **9.0-10.0** | **High** | AV:N + AC:L + PR:N + UI:N (network accessible, no auth, easy to exploit) |
| **7.0-8.9** | **Medium-High** | AV:A or AC:H or PR:L (some barriers to exploitation) |
| **4.0-6.9** | **Medium** | AV:L or PR:H or UI:R (local access or user interaction required) |
| **0.1-3.9** | **Low** | AV:P or multiple high barriers (physical access, high privileges, complex conditions) |

---

## Device Class vs. Cybersecurity Tier Independence

### CRITICAL INSIGHT

FDA's cybersecurity risk classification is **INDEPENDENT** of traditional device class (I/II/III).

### Cybersecurity Tiers

**Tier 1 (High Cybersecurity Risk)**
- **Definition**: Connected devices that could cause **multi-patient harm**
- **Examples**: Infusion pumps, pacemakers, ICDs, ventilators, anesthesia devices
- **Characteristics**:
  - Network-connected or wireless
  - Life-sustaining or life-supporting function
  - Potential for harm to multiple patients simultaneously
  - Deployed in critical care environments

**Tier 2 (Standard Cybersecurity Risk)**
- **Definition**: Devices not meeting Tier 1 criteria
- **Examples**: Diagnostic imaging, laboratory analyzers, patient monitors (non-critical)
- **Characteristics**:
  - Standalone or limited connectivity
  - Non-life-sustaining function
  - Individual patient impact only
  - Lower urgency deployment environments

### Class vs. Tier Examples

| Device | FDA Class | Cybersecurity Tier | Why |
|--------|-----------|-------------------|-----|
| Infusion pump | Class II | Tier 1 | Multi-patient harm possible (network-connected, life-sustaining) |
| Cardiac atherectomy device | Class III | Tier 2 | Single-patient use, no network connectivity |
| Insulin pump | Class II | Tier 1 | Life-sustaining, wireless connectivity |
| Blood glucose monitor | Class II | Tier 2 | Non-life-sustaining, individual use |
| Pacemaker | Class III | Tier 1 | Life-sustaining, wireless programmability |

**Key Takeaway**: A Class II device can be Tier 1 (high cybersecurity risk), while a Class III device can be Tier 2 (standard risk).

---

## MITRE CVSS Medical Device Rubric

### FDA-Qualified MDDT (October 2020)

**Purpose**: Address gaps in standard CVSS (designed for enterprise IT, not clinical environments)

**Key Innovation**: Structured questions for each CVSS metric addressing **"Potential Impact to Patient Safety" (PIPS)**

### Rubric Structure

For each CVSS metric, answer clinical context questions:

**Example: Attack Vector (AV)**
- Q: Can the vulnerability be exploited from outside the hospital network?
  - Yes → AV:N (Network)
  - No, but from hospital network → AV:A (Adjacent)
  - No, requires physical access → AV:P (Physical)

**Example: Privileges Required (PR)**
- Q: Does exploitation require authentication credentials?
  - No credentials needed → PR:N (None)
  - Basic user credentials → PR:L (Low)
  - Administrator credentials → PR:H (High)

**Example: Impact to Patient Safety**
- Q: If exploited, could this cause death or serious injury?
  - Yes, likely → Catastrophic harm
  - Possible but unlikely → Critical harm
  - No, but could delay care → Minor harm

### Rubric Benefits

- **Context-aware scoring**: Adjusts for clinical deployment environment
- **Consistency**: Standardized questions prevent subjective interpretation
- **FDA-qualified**: Accepted in regulatory submissions

**Access**: MITRE Medical Device CVSS Rubric - FDA-qualified MDDT

---

## Real-World Scoring Examples

### Example 1: Infusion Pump Authentication Bypass

**Vulnerability**: CVE-2019-12255 - Infusion pump accepts commands without authentication

**Standard CVSS Scoring:**
- AV:N (network accessible)
- AC:L (straightforward exploitation)
- PR:N (no authentication required)
- UI:N (no user interaction)
- **CVSS Base Score: 9.8 (Critical)**

**Medical Device Context:**
- **Patient Harm**: Catastrophic (fatal overdose possible via dosage manipulation)
- **Deployment**: Hospital critical care (ICU, ER)
- **Multi-Patient Impact**: Yes (network-connected pumps, simultaneous exploitation)

**FDA Classification:**
- **Tier 1** (high cybersecurity risk)
- **Uncontrolled Risk** (unacceptable patient safety risk)
- **Response**: Immediate remediation, Field Safety Notice, MDR assessment

### Example 2: Anesthesia Device Configuration Weakness

**Vulnerability**: Weak default credentials in anesthesia device

**Initial CVSS Scoring (IT perspective):**
- AV:A (adjacent network)
- AC:L (straightforward)
- PR:N (default credentials)
- UI:N (no user interaction)
- **CVSS Base Score: 5.3 (Medium)**

**Medical Device Context (re-scored):**
- **Patient Harm**: Catastrophic (anesthesia manipulation during surgery)
- **Deployment**: Operating room (life-critical)
- **Clinical Impact**: Direct patient harm during procedure

**MITRE Rubric Re-scoring:**
- Adjusted for patient safety impact: **CVSS 9.1 (Critical)** (+3.8 points)

**FDA Classification:**
- **Tier 1** (life-sustaining function)
- **Uncontrolled Risk**
- **Response**: 30-day remediation, coordinated disclosure

### Example 3: Diagnostic Imaging Data Leak

**Vulnerability**: SQL injection in PACS (Picture Archiving and Communication System)

**CVSS Scoring:**
- AV:N (network accessible)
- AC:L (straightforward)
- PR:N (no authentication)
- UI:N (no user interaction)
- **CVSS Base Score: 9.8 (Critical)**

**Medical Device Context:**
- **Patient Harm**: Negligible (data confidentiality only, no direct patient harm)
- **Deployment**: Radiology department (non-life-sustaining)
- **Clinical Impact**: Privacy breach, not patient safety

**FDA Classification:**
- **Tier 2** (standard cybersecurity risk)
- **Controlled Risk** (acceptable with compensating controls like network segmentation)
- **Response**: 90-day standard patch cycle, HIPAA notification

**Key Insight**: CVSS 9.8 ≠ automatic uncontrolled risk. Patient harm assessment determines risk classification.

---

## Context-Dependent Scoring

### Deployment Environment Matters

**Hospital Deployment:**
- More restrictive network environment
- Trained biomedical engineering staff
- Network segmentation common
- Monitoring and alerting in place
- **Effect**: +0 to +2 CVSS points (less exploitable)

**Home Deployment:**
- Consumer network (less secure)
- Untrained patient/caregiver
- No network segmentation
- Limited monitoring
- **Effect**: +2 to +4 CVSS points (more exploitable)

**Example: Insulin Pump Wireless Vulnerability**
- **Hospital context**: CVSS 7.5 (network segmentation mitigates)
- **Home context**: CVSS 9.3 (no network controls) → **+1.8 points**

### Research Data

Nature Scientific Reports (2025) study showed:
- **Average context adjustment**: +1.9 to +3.8 CVSS points
- **Hospital vs. home**: Significant exploitability difference
- **Conclusion**: Medical device CVSS must include deployment context

---

## Assessment Workflows

### FDA Dual-Axis Risk Assessment (16 Steps)

1. Identify vulnerability (CVE, internal finding)
2. Assess technical exploitability (CVSS metrics using MITRE rubric)
3. Determine attack vector (network, adjacent, physical)
4. Evaluate attack complexity (low, high)
5. Assess privileges required (none, low, high)
6. Determine user interaction (none, required)
7. Calculate CVSS base score
8. Identify affected device functions
9. Assess potential patient harm (ISO 14971 severity levels)
10. Consider clinical use context (hospital, home, ambulance)
11. Evaluate compensating controls (network segmentation, access control, monitoring)
12. Determine controlled vs. uncontrolled risk
13. Classify as Tier 1 or Tier 2
14. Determine response timeline (immediate, 30-day, 60-day, 90-day)
15. Document risk rationale in quality system
16. Track vulnerability remediation status

---

## Tools and Templates

1. **MITRE CVSS Medical Device Rubric** (FDA-qualified MDDT)
2. **ISO 14971 Risk Matrices**
3. **STRIDE Threat Modeling Worksheets**
4. **AAMI TIR57 Integration Templates**
5. **CVSS 4.0 BTE Calculators** (Base-Threat-Environmental)
6. **Vulnerability Tracking Systems** (aligned with 21 CFR 820)
7. **Risk Acceptance Documentation Templates**
8. **Compensating Controls Assessment Forms**
9. **Clinical Impact Assessment Questionnaires**
10. **Tier 1/Tier 2 Classification Decision Trees**

---

## CVSS 4.0 and Safety Metric

### New in CVSS 4.0 (Released 2023)

**Safety (S) Metric** - explicitly designed for medical devices and safety-critical systems

**Safety Impact Levels:**
- **Not Defined (X)**: No safety impact
- **Negligible (N)**: Minor inconvenience
- **Present (P)**: Injury possible but unlikely
- **Critical (C)**: Serious injury or death possible

**FDA Position**: Currently uses CVSS 3.1 with MITRE rubric. CVSS 4.0 adoption timeline under evaluation.

---

## Key Regulatory References

- MITRE CVSS Medical Device Rubric (FDA-qualified MDDT, October 2020)
- ISO 14971:2007/(R)2010 - Medical Device Risk Management
- IEC 61508 - Functional Safety (four severity tiers)
- AAMI TIR57 - Principles for Medical Device Security
- CVSS v3.1 Specification: https://www.first.org/cvss/v3.1/specification-document
- CVSS v4.0 Specification: https://www.first.org/cvss/v4.0/specification-document
- Nature Scientific Reports (2025) - Context-dependent medical device CVSS scoring
