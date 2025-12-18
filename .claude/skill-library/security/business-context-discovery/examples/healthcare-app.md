# Healthcare Application - Business Context Discovery Example

**Application**: PatientCare EHR System

## Step 1: Business Purpose Discovery

**What does this application do?**
- Electronic Health Records (EHR) system for managing patient medical records
- Appointment scheduling and care coordination
- Prescription management and e-prescribing
- Lab result integration and clinical decision support

**Primary users:**
- Healthcare providers (physicians, nurses, specialists)
- Administrative staff
- Patients (via patient portal)

**Business processes:**
- Clinical documentation and charting
- Order entry (labs, medications, procedures)
- Care coordination between providers
- Billing and coding

## Step 2: Data Classification

**Sensitive data types:**

| Category | Examples | Regulatory |
|----------|----------|------------|
| PHI | Patient names, DOB, MRN, diagnoses, treatment plans | HIPAA |
| Financial | Insurance information, billing data | HIPAA |
| Credentials | Provider credentials, DEA numbers | HIPAA |

**Crown jewels:**
1. Patient medical records (PHI)
2. Provider credentials
3. Prescription data (controlled substances)

## Step 3: Threat Actor Profiling

**Primary threat actors:**

1. **Ransomware groups** (High likelihood)
   - Motivation: Financial gain
   - Capability: Medium to High
   - Healthcare is #1 ransomware target
   - Attack vectors: Phishing, RDP exploitation, vulnerabilities

2. **Nation-state actors** (Medium likelihood)
   - Motivation: Espionage, medical research theft
   - Capability: Very high
   - Interest in COVID research, vaccine data

3. **Insider threats** (Medium likelihood)
   - Motivation: Curiosity, financial gain, revenge
   - Capability: High (legitimate access)
   - Healthcare has high insider threat incidents

## Step 4: Business Impact Assessment

**Data breach (1M patient records):**

Financial Impact:
- HIPAA fines: $1M-$10M (est.)
- Breach notification: $2M (1M × $2/notification)
- Credit monitoring: $20M (1M × $20/person for 2 years)
- Incident response: $500K
- Legal defense: $5M
- **Total: $28.5M+**

Operational Impact:
- EHR downtime: $50K/hour
- Elective procedure cancellations
- Ambulance diversions
- Patient safety risks

Reputational Impact:
- Patient trust erosion
- Competitive disadvantage
- Physician recruitment challenges

Regulatory Impact:
- HHS OCR investigation
- State AG investigation
- Class action lawsuits
- Media breach notification (>500 records)

**Ransomware (system encryption):**

Financial Impact:
- Ransom demand: $500K-$5M
- Revenue loss: $1M/day (patient care disruption)
- Recovery costs: $2M-$10M
- **Total: $3.5M-$16M** (excluding reputational damage)

Operational Impact:
- Complete EHR unavailability
- Revert to paper charts
- Patient safety incidents
- 2-4 week recovery time

## Step 5: Compliance Requirements

**HIPAA (Critical):**
- Administrative safeguards (policies, training, BAAs)
- Physical safeguards (facility access, workstation security)
- Technical safeguards (access control, encryption, audit logging)
- Breach notification (60 days)

**HITECH Act:**
- Meaningful use requirements
- Breach notification enforcement
- BAA requirements for vendors

**State laws:**
- California CMIA (additional PHI protections)
- State breach notification laws

**Accreditation:**
- HITRUST CSF certification
- ONC EHR certification

## Step 6: Security Objectives

**Protection priorities:**
1. Patient medical records (PHI) - confidentiality + integrity
2. Provider credentials - prevent unauthorized access
3. System availability - patient safety dependency

**CIA Priority**: Integrity > Availability > Confidentiality
- Patient safety requires accurate data (integrity)
- Clinical operations require uptime (availability)
- Privacy important but secondary to safety (confidentiality)

**Risk appetite**: Very low (patient safety critical)

**RTO**: 4 hours (clinical operations)
**RPO**: 15 minutes (minimal data loss acceptable)

## Summary for Phase 1 Handoff

**Application**: PatientCare EHR - Healthcare provider system with 1M patient records

**Crown Jewels**:
- Patient medical records (HIPAA PHI)
- Provider credentials
- Prescription data (DEA controlled substances)

**Primary Threat Actors**:
- Ransomware groups (high likelihood, medium capability)
- Nation-state APTs (medium likelihood, very high capability)
- Insider threats (medium likelihood, high capability)

**Business Impact** (data breach):
- Financial: $28.5M+
- Operational: $50K/hour downtime + patient safety risk
- Regulatory: HIPAA fines + HHS investigation + breach notification

**Compliance Context**:
- HIPAA Security Rule (all safeguards required)
- HITECH breach notification
- HITRUST CSF certification

**Next Phase Guidance**:
- **Phase 1**: Focus mapping on PHI storage/transmission, provider authentication, audit logging
- **Phase 2**: Evaluate HIPAA controls (encryption, access control, audit logging, BAAs)
- **Phase 3**: Apply ransomware + insider threat actor profiles, use $28.5M+ breach impact for risk scoring
- **Phase 4**: Prioritize tests for PHI access controls, encryption, audit logging

## Lessons Learned

**Healthcare-specific considerations:**
- Patient safety is paramount (affects CIA priority)
- Ransomware is existential threat (business continuity critical)
- Insider threat higher than other industries (curiosity + access)
- HIPAA breach notification is automatic at 500+ records (media)
- Downtime = patient safety incidents (higher urgency than pure financial)
