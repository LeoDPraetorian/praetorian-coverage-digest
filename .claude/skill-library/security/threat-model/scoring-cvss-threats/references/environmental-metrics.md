# Environmental Metrics and Phase 1 Integration

**How to derive CVSS Environmental metrics from threat modeling Phase 1 business context.**

## Overview

Environmental metrics answer: **"What is this vulnerability's risk to YOUR specific organization?"**

Two components:

1. **Security Requirements** (CR, IR, AR) - How important is Confidentiality/Integrity/Availability to your business?
2. **Modified Base Metrics** - Adjust Base metrics for your specific environment

**Key innovation for threat modeling:** Automatically derive CR/IR/AR from Phase 1 business context (crown jewels, compliance requirements, business impact).

---

## Security Requirements (CR, IR, AR)

### Confidentiality Requirement (CR)

**Question:** How critical is confidentiality to your organization for this system?

| Value          | When to Use                                           | Phase 1 Indicators                                           | Numeric |
| -------------- | ----------------------------------------------------- | ------------------------------------------------------------ | ------- |
| **High (H)**   | Crown jewel data, compliance-required confidentiality | PII, PHI, payment cards, trade secrets, PCI-DSS, HIPAA, GDPR | 1.5     |
| **Medium (M)** | Standard business data                                | Non-sensitive internal data, public information              | 1.0     |
| **Low (L)**    | Non-confidential, public data                         | Marketing content, public documentation                      | 0.5     |

### Integrity Requirement (IR)

**Question:** How critical is data integrity to your organization for this system?

| Value          | When to Use                                                  | Phase 1 Indicators                                                  | Numeric |
| -------------- | ------------------------------------------------------------ | ------------------------------------------------------------------- | ------- |
| **High (H)**   | Critical business operations, financial data, safety systems | Transaction records, audit logs, financial systems, safety-critical | 1.5     |
| **Medium (M)** | Standard operational data                                    | Application configuration, user data                                | 1.0     |
| **Low (L)**    | Non-critical data                                            | Cached data, temporary files                                        | 0.5     |

### Availability Requirement (AR)

**Question:** How critical is system availability to your organization?

| Value          | When to Use                    | Phase 1 Indicators                                         | Numeric |
| -------------- | ------------------------------ | ---------------------------------------------------------- | ------- |
| **High (H)**   | Business-critical, strict SLAs | RTO < 4 hours, revenue-generating systems, customer-facing | 1.5     |
| **Medium (M)** | Standard uptime expectations   | Internal tools, normal business operations                 | 1.0     |
| **Low (L)**    | Downtime acceptable            | Development environments, non-critical services            | 0.5     |

---

## Phase 1 Auto-Mapping

### Automatic CR/IR/AR Derivation

**Load these Phase 1 files:**

```bash
phase-1/data-classification.json      # Crown jewels
phase-1/compliance-requirements.json  # Regulations
phase-1/business-impact.json          # Financial impact
phase-1/security-objectives.json      # CIA priorities
```

**Mapping algorithm:**

```python
def derive_security_requirements(phase0_data, component):
    cr, ir, ar = "Medium", "Medium", "Medium"  # Defaults

    # Check if component handles crown jewels
    if component in phase0_data['crown_jewels']:
        jewel = phase0_data['crown_jewels'][component]

        if jewel['requires_confidentiality']:
            cr = "High"
        if jewel['requires_integrity']:
            ir = "High"
        if jewel['requires_availability']:
            ar = "High"

    # Override based on compliance
    for regulation in phase0_data['compliance']:
        if regulation == 'PCI-DSS':
            if component handles payment_data:
                cr, ir = "High", "High"

        if regulation == 'HIPAA':
            if component handles health_data:
                cr, ir = "High", "High"

        if regulation == 'GDPR':
            if component handles personal_data:
                cr = "High"

    # Override based on business impact
    impact = phase0_data['business_impact']
    if impact['rto_hours'] < 4:
        ar = "High"

    if impact['breach_cost_usd'] > 10_000_000:
        cr, ir, ar = "High", "High", "High"

    return cr, ir, ar
```

### Mapping Table

| Phase 1 Finding                   | Component Type      | CR  | IR  | AR  | Rationale                                    |
| --------------------------------- | ------------------- | --- | --- | --- | -------------------------------------------- |
| Crown jewel = payment card data   | Payment API         | H   | H   | M   | PCI-DSS requires confidentiality + integrity |
| Crown jewel = transaction records | Transaction DB      | M   | H   | H   | Integrity critical, availability critical    |
| RTO < 4 hours                     | Customer-facing API | M   | M   | H   | Availability requirement                     |
| PCI-DSS Level 1 compliance        | Card processing     | H   | H   | M   | Regulation mandates protection               |
| HIPAA compliance                  | Health records API  | H   | H   | M   | PHI confidentiality + integrity              |
| GDPR applies                      | User data DB        | H   | M   | M   | Personal data protection                     |
| Breach cost > $10M                | Any crown jewel     | H   | H   | H   | High business impact                         |
| Breach cost < $1M                 | Non-critical system | M   | M   | L   | Low business impact                          |
| Marketing microsite               | Public content      | L   | L   | L   | No sensitive data, downtime acceptable       |

### Example Auto-Mapping

**Phase 1 input:**

```json
{
  "crown_jewels": [
    {
      "name": "payment_processing_api",
      "data_types": ["payment_card_data", "transaction_records"],
      "requires_confidentiality": true,
      "requires_integrity": true,
      "requires_availability": false
    }
  ],
  "compliance": ["PCI-DSS Level 1", "SOC2 Type 2"],
  "business_impact": {
    "breach_cost_usd": 28500000,
    "rto_hours": 8
  }
}
```

**Auto-derived Environmental metrics:**

```yaml
payment_processing_api:
  CR: High (crown jewel confidentiality + PCI-DSS + $28.5M breach cost)
  IR: High (crown jewel integrity + PCI-DSS)
  AR: Medium (RTO 8hrs, not business-critical for availability)
```

---

## Modified Base Metrics

### When to Use

**Modified Base metrics** let you adjust Base values for your specific environment.

**Common scenarios:**

| Scenario                 | Modify            | Reason                                   |
| ------------------------ | ----------------- | ---------------------------------------- |
| WAF deployed             | MAC:H (from AC:L) | WAF increases attack complexity          |
| Internal-only API        | MAV:A (from AV:N) | Not internet-exposed in your environment |
| Mandatory MFA            | MPR:H (from PR:L) | MFA requirement increases auth barrier   |
| Isolated network segment | MS:U (from S:C)   | Network isolation prevents scope change  |

**Default:** Don't modify Base metrics unless you have specific environmental controls.

**Example:**

```yaml
Threat: SQL Injection
Base: AV:N/AC:L (network, low complexity)

Your environment: Has WAF with SQL injection rules

Modified:
  MAV: N (still network-facing)
  MAC: H (WAF makes exploitation harder)

Effect: Modified Base Score lower than Base Score
```

---

## Environmental Score Calculation (CVSS 3.1)

### Formula

```
EnvironmentalScore = Roundup(
  Roundup(ModifiedBaseScore) × E × RL × RC
)
```

**Where ModifiedBaseScore** uses Modified Impact and Modified Exploitability.

### Modified Impact Sub-Score (MISS)

```
MISS = min(1 - [(1 - CR×MC) × (1 - IR×MI) × (1 - AR×MA)], 0.915)
```

**Where:**

- CR, IR, AR = Security Requirements (1.5 for High, 1.0 for Medium, 0.5 for Low)
- MC, MI, MA = Modified Confidentiality/Integrity/Availability (same values as Base C/I/A)

### Modified Impact

**If Modified Scope Unchanged:**

```
ModifiedImpact = 6.42 × MISS
```

**If Modified Scope Changed:**

```
ModifiedImpact = 7.52 × (MISS - 0.029) - 3.25 × (MISS × 0.9731 - 0.02)^13
```

### Modified Exploitability

```
ModifiedExploitability = 8.22 × MAV × MAC × MPR × MUI
```

### Complete Environmental Formula

**If ModifiedImpact ≤ 0:**

```
EnvironmentalScore = 0
```

**If Modified Scope Unchanged:**

```
EnvironmentalScore = Roundup(
  Roundup(min(ModifiedImpact + ModifiedExploitability, 10))
  × E × RL × RC
)
```

**If Modified Scope Changed:**

```
EnvironmentalScore = Roundup(
  Roundup(min(1.08 × (ModifiedImpact + ModifiedExploitability), 10))
  × E × RL × RC
)
```

---

## Environmental Scoring Examples

### Example 1: SQL Injection in Payment API

**Base Metrics:**

```
CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:L
Base Score: 9.4
```

**Phase 1 Context:**

- Crown jewel: Payment card data
- Compliance: PCI-DSS Level 1
- Breach cost: $365M (Equifax-scale)

**Environmental Metrics:**

```yaml
Security Requirements:
  CR: High (1.5) - Payment card data + PCI-DSS
  IR: High (1.5) - Transaction integrity + PCI-DSS
  AR: Medium (1.0) - Not availability-critical

Modified Base: (use original, no environment-specific controls)
  MAV: N, MAC: L, MPR: N, MUI: N, MS: U, MC: H, MI: H, MA: L

Temporal:
  E: U (0.91), RL: U (1.0), RC: R (0.96)
```

**Calculation:**

```
MISS = min(1 - [(1 - 1.5×0.56) × (1 - 1.5×0.56) × (1 - 1.0×0.22)], 0.915)
     = min(1 - [0.16 × 0.16 × 0.78], 0.915)
     = min(0.98, 0.915)
     = 0.915 (capped)

ModifiedImpact = 6.42 × 0.915 = 5.87

ModifiedExploitability = 8.22 × 0.85 × 0.77 × 0.85 × 0.85 = 3.91

ModifiedBase = Roundup(5.87 + 3.91) = 9.8

EnvironmentalScore = Roundup(9.8 × 0.91 × 1.0 × 0.96) = 8.6
```

**Notice:** Environmental (8.6) ≈ Temporal (8.2) but CR/IR:High shows **this is high-priority** for business.

---

### Example 2: Same SQLi in Marketing Blog

**Base Metrics:** (SAME as above)

```
CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:L
Base Score: 9.4
```

**Phase 1 Context:**

- NOT a crown jewel (marketing content, public data)
- No compliance requirements
- Breach cost: $50K (reputational only)

**Environmental Metrics:**

```yaml
Security Requirements:
  CR: Low (0.5) - Public content, no sensitive data
  IR: Low (0.5) - Blog posts, not critical
  AR: Low (0.5) - Downtime acceptable

Modified Base: (same as Base)
Temporal: (same as above)
```

**Calculation:**

```
MISS = min(1 - [(1 - 0.5×0.56) × (1 - 0.5×0.56) × (1 - 0.5×0.22)], 0.915)
     = min(1 - [0.72 × 0.72 × 0.89], 0.915)
     = min(0.54, 0.915)
     = 0.54

ModifiedImpact = 6.42 × 0.54 = 3.47

ModifiedExploitability = 3.91 (same)

ModifiedBase = Roundup(3.47 + 3.91) = 7.4

EnvironmentalScore = Roundup(7.4 × 0.91 × 1.0 × 0.96) = 6.5
```

**Result:** Same Base (9.4), but Environmental drops to **6.5** (Medium) because business impact is low.

**This is the power of Environmental metrics:** Same technical vulnerability, very different business risk.

---

## Phase 1 File Parsing

### Required Phase 1 Files

**File:** `phase-1/data-classification.json`

```json
{
  "crown_jewels": [
    {
      "asset_name": "payment_processing_api",
      "data_types": ["payment_card_data", "customer_pii"],
      "classification": "Critical",
      "requires_confidentiality": true,
      "requires_integrity": true,
      "requires_availability": false,
      "regulatory_requirements": ["PCI-DSS"]
    }
  ],
  "sensitive_data_types": {
    "payment_card_data": {
      "sensitivity": "Critical",
      "regulations": ["PCI-DSS"]
    }
  }
}
```

**Extract:** Crown jewel requires\_\* booleans → CR/IR/AR values

---

**File:** `phase-1/compliance-requirements.json`

```json
{
  "applicable_regulations": [
    {
      "name": "PCI-DSS",
      "level": "Level 1",
      "requirements": {
        "requirement_3": "Protect stored cardholder data",
        "requirement_4": "Encrypt transmission of cardholder data"
      },
      "systems_in_scope": ["payment_processing_api", "payment_gateway"]
    }
  ]
}
```

**Extract:** If component in scope for PCI-DSS/HIPAA/GDPR → CR:H, IR:H

---

**File:** `phase-1/business-impact.json`

```json
{
  "breach_scenarios": {
    "payment_data_breach": {
      "financial_impact_usd": 365000000,
      "regulatory_fines_usd": 50000000,
      "customer_impact": "severe"
    }
  },
  "availability_requirements": {
    "payment_processing_api": {
      "rto_hours": 2,
      "rpo_hours": 0,
      "revenue_per_hour_downtime": 125000
    }
  }
}
```

**Extract:**

- Breach cost > $10M → All requirements High
- RTO < 4 hours → AR:High

---

### Mapping Logic

```typescript
function deriveSecurityRequirements(component: string, phase0Data): { CR; IR; AR } {
  let cr = "Medium",
    ir = "Medium",
    ar = "Medium";

  // Step 1: Check crown jewels
  const jewel = phase0Data.crownJewels.find((j) => j.assetName === component);
  if (jewel) {
    cr = jewel.requiresConfidentiality ? "High" : cr;
    ir = jewel.requiresIntegrity ? "High" : ir;
    ar = jewel.requiresAvailability ? "High" : ar;
  }

  // Step 2: Check compliance (overrides)
  phase0Data.compliance.forEach((reg) => {
    if (reg.systemsInScope.includes(component)) {
      switch (reg.name) {
        case "PCI-DSS":
          cr = "High";
          ir = "High";
          break;
        case "HIPAA":
          cr = "High";
          ir = "High";
          break;
        case "GDPR":
          cr = "High";
          break;
        case "SOC2":
          // Depends on trust principles selected
          break;
      }
    }
  });

  // Step 3: Check business impact
  const impact = phase0Data.businessImpact[component];
  if (impact) {
    if (impact.breachCostUSD > 10_000_000) {
      cr = "High";
      ir = "High";
      ar = "High";
    }
    if (impact.rtoHours < 4) {
      ar = "High";
    }
  }

  return { cr, ir, ar };
}
```

---

## Complete Environmental Assessment Workflow

### Step 1: Load Phase 1 Context

```bash
# Check if Phase 1 files exist
if [ -f "phase-1/data-classification.json" ]; then
  # Auto-derive mode
else
  # Manual entry mode
fi
```

### Step 2: Identify Component

Match the threat to a component from Phase 1:

- "SQL injection in payment API" → `payment_processing_api`
- "XSS in admin panel" → `admin_dashboard`

### Step 3: Derive or Ask for CR/IR/AR

**Auto-derive (if Phase 1 available):**

```
Component: payment_processing_api
Crown jewel: Yes (payment card data)
Compliance: PCI-DSS Level 1
Breach cost: $365M

→ CR: High (card data confidentiality)
→ IR: High (transaction integrity)
→ AR: Medium (not availability-critical)
```

**Manual entry (if no Phase 1):**

```
Ask user:
  "For payment_processing_api confidentiality, how important is it?"
    → High/Medium/Low

  "For payment_processing_api integrity, how important is it?"
    → High/Medium/Low

  "For payment_processing_api availability, how important is it?"
    → High/Medium/Low
```

### Step 4: Assess Modified Base Metrics

**Ask:** "Are there environment-specific controls that change Base metrics?"

Examples:

- WAF deployed → MAC:H (from AC:L)
- VPN required → MAV:A (from AV:N)
- MFA enforced → MPR:H (from PR:L)

**Default:** Use same values as Base metrics (no modifications)

### Step 5: Calculate Environmental Score

Use formulas from calculation-formulas.md with:

- Modified Base metrics (or same as Base if unchanged)
- Security Requirements (CR, IR, AR)
- Temporal metrics (E, RL, RC)

---

## Environmental Score Interpretation

### Comparison with Base Score

| Scenario | Base | Environmental | Interpretation                                                       |
| -------- | ---- | ------------- | -------------------------------------------------------------------- |
| Higher   | 7.5  | 9.2           | Your environment elevates risk (crown jewel involved)                |
| Same     | 8.0  | 8.0           | Standard risk (no special environmental factors)                     |
| Lower    | 9.4  | 6.5           | Your environment mitigates risk (low criticality or strong controls) |

**For threat modeling prioritization:** **ALWAYS use Environmental score**, not Base.

**Why:** Two threats with Base 9.4 might be Environmental 9.9 (payment DB) vs 6.5 (marketing blog). Prioritize the 9.9.

---

## Manual CR/IR/AR Assessment

If Phase 1 data not available, ask user directly:

### Confidentiality Requirement Questions

**"How would you classify the confidentiality requirement for [component]?"**

- **High:**
  - Contains PII, PHI, payment cards, credentials, trade secrets
  - Subject to regulations (PCI-DSS, HIPAA, GDPR)
  - Breach would be catastrophic

- **Medium:**
  - Internal business data
  - Not regulated
  - Breach would be concerning but not catastrophic

- **Low:**
  - Public information
  - No sensitive data
  - Breach has minimal impact

### Integrity Requirement Questions

**"How critical is data integrity for [component]?"**

- **High:**
  - Financial transactions, audit logs, safety-critical systems
  - Data tampering would cause serious harm
  - Regulatory requirements for integrity

- **Medium:**
  - Standard application data
  - Tampering would be problematic but not catastrophic

- **Low:**
  - Cached data, temporary files
  - Can be regenerated or has minimal impact

### Availability Requirement Questions

**"How critical is uptime for [component]?"**

- **High:**
  - RTO < 4 hours
  - Revenue-generating (>$10K/hour downtime cost)
  - Customer-facing with strict SLAs

- **Medium:**
  - Standard uptime expectations
  - Some downtime acceptable

- **Low:**
  - Development/test environments
  - Extended downtime acceptable

---

## Compliance-Specific Requirements

### PCI-DSS

| PCI-DSS Level                       | Systems                                | CR  | IR  | AR  |
| ----------------------------------- | -------------------------------------- | --- | --- | --- |
| **Level 1** (6M+ transactions/year) | Card processing, storage, transmission | H   | H   | M-H |
| **Level 2-4** (<6M transactions)    | Same systems                           | H   | H   | M   |

**Key requirements:**

- Requirement 3: Protect stored cardholder data → CR:H, IR:H
- Requirement 4: Encrypt transmission → CR:H
- Requirement 10: Track and monitor access → IR:H (audit logs)

### HIPAA

| Data Type                          | CR  | IR  | AR                                |
| ---------------------------------- | --- | --- | --------------------------------- |
| Protected Health Information (PHI) | H   | H   | M-H                               |
| Billing records                    | H   | H   | M                                 |
| Appointment system                 | M   | H   | H (if patient care depends on it) |

**Requirements:**

- Privacy Rule → CR:H for all PHI
- Security Rule → IR:H for electronic PHI
- Breach Notification Rule → Both CR and IR:H

### GDPR

| Data Type                                        | CR  | IR  | AR  |
| ------------------------------------------------ | --- | --- | --- |
| Personal identifiable information                | H   | M   | M   |
| Sensitive personal data (health, religion, etc.) | H   | H   | M   |
| Pseudonymized data                               | M   | M   | M   |

**Article 32 requirements:** "Appropriate technical measures" → CR:H for personal data

### SOC2

Depends on Trust Service Principles selected:

| Principle            | Maps To          |
| -------------------- | ---------------- |
| Security (all)       | CR:H, IR:H, AR:H |
| Availability         | AR:H             |
| Processing Integrity | IR:H             |
| Confidentiality      | CR:H             |
| Privacy              | CR:H             |

---

## Phase 1 Integration Checklist

When scoring a threat with Environmental metrics:

- [ ] Load `phase-1/data-classification.json`
- [ ] Identify which crown jewel(s) the vulnerable component handles
- [ ] Load `phase-1/compliance-requirements.json`
- [ ] Check if component is in scope for regulations
- [ ] Load `phase-1/business-impact.json`
- [ ] Check breach cost and RTO/RPO for component
- [ ] Apply mapping logic to derive CR/IR/AR
- [ ] Document derivation source in output (`source: "phase-1-auto"`)
- [ ] If Phase 1 unavailable, ask user manually (`source: "manual"`)

---

## Output Schema

**Environmental metrics in threat-model.json:**

```typescript
{
  environmental: {
    vector: string,  // "CR:H/IR:H/AR:M/MAV:N/MAC:L/MPR:N/MUI:N/MS:U/MC:H/MI:H/MA:L"
    score: number,   // 8.6
    securityRequirements: {
      confidentiality: "H" | "M" | "L",
      integrity: "H" | "M" | "L",
      availability: "H" | "M" | "L"
    },
    modifiedBaseMetrics: {  // Only if different from Base
      attackVector?: "N" | "A" | "L" | "P",
      attackComplexity?: "L" | "H",
      // ... other Modified metrics
    },
    source: "phase-1-auto" | "manual" | "phase-1-manual",
    phase0Context?: {
      crownJewel: boolean,
      compliance: string[],  // ["PCI-DSS Level 1"]
      breachCostUSD: number
    }
  }
}
```

**Source values:**

- `phase-1-auto`: Fully derived from Phase 1 files
- `manual`: User entered CR/IR/AR manually (no Phase 1)
- `phase-1-manual`: Phase 1 existed but user overrode values

---

## References

- CVSS v3.1 Specification Section 2.3 (Environmental Metric Group)
- CVSS v3.1 Equations: https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator/v31/equations
- FIRST.org CVSS v3.1 User Guide - Environmental Metrics
- PCI DSS v4.0 Requirements: https://www.pcisecuritystandards.org/
- HIPAA Security Rule: https://www.hhs.gov/hipaa/for-professionals/security/
- GDPR Article 32: https://gdpr-info.eu/art-32-gdpr/
