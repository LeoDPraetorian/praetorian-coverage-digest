# SQL Injection CVSS Scoring Example

**Complete walkthrough of scoring a SQL injection threat during threat modeling.**

## Scenario

**From Phase 3 Threat Modeling:**

During STRIDE analysis of a payment processing API, we identified:

**Threat:** SQL Injection in customer search endpoint

**Description:** The `/api/customers/search` endpoint accepts a `name` query parameter that is concatenated directly into a SQL query without sanitization. An attacker can inject SQL commands to read, modify, or delete database records.

**Component:** `payment_processing_api` (from Phase 1 codebase mapping)

**STRIDE Category:** Tampering + Information Disclosure

**Attack Vector:** Attacker sends malicious SQL in the `name` parameter via HTTP request

---

## Phase 1 Business Context

**Loaded from Phase 1 files:**

```json
// phase-1/data-classification.json
{
  "crown_jewels": [{
    "asset_name": "payment_processing_api",
    "data_types": ["payment_card_data", "customer_pii"],
    "requires_confidentiality": true,
    "requires_integrity": true,
    "requires_availability": false
  }]
}

// phase-1/compliance-requirements.json
{
  "applicable_regulations": [{
    "name": "PCI-DSS",
    "level": "Level 1",
    "systems_in_scope": ["payment_processing_api"]
  }]
}

// phase-1/business-impact.json
{
  "breach_scenarios": {
    "payment_data_breach": {
      "financial_impact_usd": 365000000,
      "regulatory_fines_usd": 50000000
    }
  }
}
```

**Auto-derived Environmental metrics:**
- CR: High (payment card data + PCI-DSS)
- IR: High (transaction integrity + PCI-DSS)
- AR: Medium (not availability-critical)

---

## Step 1: Version Selection

**Question:** Which CVSS version?

**Answer:** CVSS 3.1 (formula-based, easier to implement)

**Question:** Scoring depth?

**Answer:** Full (Base + Temporal + Environmental)

---

## Step 2: Assess Base Metrics

### Attack Vector (AV)

**Question:** How does attacker reach the vulnerable component?

**Analysis:**
- The `/api/customers/search` endpoint is internet-facing
- No VPN or network restriction
- Accessible remotely over HTTPS

**Answer:** **Network (N)** - Remotely exploitable

---

### Attack Complexity (AC)

**Question:** Does exploitation require special conditions?

**Analysis:**
- Standard SQL injection technique
- No race conditions or timing requirements
- Works reliably with any malicious payload
- Attacker can repeat at will

**Answer:** **Low (L)** - No special conditions

---

### Privileges Required (PR)

**Question:** What authentication is needed?

**Analysis:**
- Endpoint requires API authentication (Bearer token)
- But any authenticated user can access customer search
- No admin privileges needed

**Answer:** **Low (L)** - Standard user account required

---

### User Interaction (UI)

**Question:** Does a victim need to do something?

**Analysis:**
- Attacker sends HTTP requests directly
- No victim involvement
- Server-side vulnerability

**Answer:** **None (N)** - Autonomous exploitation

---

### Scope (S)

**Question:** Can attacker impact resources beyond the vulnerable component?

**Analysis:**
- SQL injection allows database access
- Database is part of the application's data layer
- Cannot escape to host OS or other systems
- Stays within application trust boundary

**Answer:** **Unchanged (U)** - Impact limited to database

---

### Confidentiality Impact (C)

**Question:** What data can attacker read?

**Analysis:**
- SQL injection allows arbitrary SELECT queries
- Can read all tables in database
- Payment card data, customer PII fully accessible
- Full database disclosure possible

**Answer:** **High (H)** - Complete database read access

---

### Integrity Impact (I)

**Question:** What data can attacker modify?

**Analysis:**
- SQL injection allows UPDATE, DELETE, INSERT
- Can modify payment records
- Can alter transaction history
- Can inject malicious data

**Answer:** **High (H)** - Complete database write access

---

### Availability Impact (A)

**Question:** Can attacker deny service?

**Analysis:**
- Malicious queries may slow database
- Could cause performance degradation
- Unlikely to completely crash the service
- Partial DoS possible but not complete denial

**Answer:** **Low (L)** - Performance degradation, not complete DoS

---

## Step 3: Construct Base Vector and Calculate

**Base Vector:**
```
CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:L
```

**Base Score Calculation:**

```
# Metric values
AV = 0.85 (Network)
AC = 0.77 (Low)
PR = 0.62 (Low with Scope Unchanged)
UI = 0.85 (None)
C = 0.56 (High)
I = 0.56 (High)
A = 0.22 (Low)

# Impact Sub-Score
ISS = 1 - [(1-0.56) × (1-0.56) × (1-0.22)]
    = 1 - [0.44 × 0.44 × 0.78]
    = 1 - 0.151
    = 0.849

# Impact (Scope Unchanged)
Impact = 6.42 × 0.849 = 5.45

# Exploitability
Exploitability = 8.22 × 0.85 × 0.77 × 0.62 × 0.85
               = 3.39

# Base Score
BaseScore = Roundup(5.45 + 3.39)
          = Roundup(8.84)
          = 8.9
```

**Base Score: 8.9 (High)**

---

## Step 4: Apply Temporal Metrics

**Since this is a theoretical threat (not a known CVE), use conservative defaults:**

### Exploit Code Maturity (E)

**Question:** Is there exploit code available?

**Analysis:**
- We identified this during threat modeling
- No public exploit code exists
- This is hypothetical

**Answer:** **Unproven (U)** - No exploit code

---

### Remediation Level (RL)

**Question:** Is a fix available?

**Analysis:**
- We just discovered this threat
- No fix has been developed yet
- Remediation pending

**Answer:** **Unavailable (U)** - No fix exists

---

### Report Confidence (RC)

**Question:** How confident are we this exists?

**Analysis:**
- Based on code review during Phase 1
- Found string concatenation in SQL query
- High confidence based on analysis
- Not vendor-confirmed

**Answer:** **Reasonable (R)** - Analyst confidence, not vendor-confirmed

---

**Temporal Vector:**
```
E:U/RL:U/RC:R
```

**Temporal Score Calculation:**

```
TemporalScore = Roundup(8.9 × 0.91 × 1.0 × 0.96)
              = Roundup(7.77)
              = 7.8
```

**Temporal Score: 7.8 (High)**

---

## Step 5: Apply Environmental Metrics

### Security Requirements (from Phase 1)

**CR (Confidentiality Requirement):**
- Component: payment_processing_api
- Crown jewel: Payment card data
- Compliance: PCI-DSS Level 1
- **Value: High (1.5)**

**IR (Integrity Requirement):**
- Crown jewel: Transaction records
- Compliance: PCI-DSS (data integrity required)
- **Value: High (1.5)**

**AR (Availability Requirement):**
- RTO: 8 hours (from business-impact.json)
- Not customer-facing directly
- **Value: Medium (1.0)**

### Modified Base Metrics

**Question:** Are there environment-specific controls?

**Analysis:**
- No WAF deployed
- No additional network restrictions
- No MFA (just API key authentication)
- Use Base metrics as-is

**Modified Metrics:** Same as Base
```
MAV: N, MAC: L, MPR: L, MUI: N, MS: U, MC: H, MI: H, MA: L
```

### Environmental Vector

```
CR:H/IR:H/AR:M/MAV:N/MAC:L/MPR:L/MUI:N/MS:U/MC:H/MI:H/MA:L
```

### Environmental Score Calculation

```
# Modified Impact Sub-Score
MISS = min(1 - [(1 - 1.5×0.56) × (1 - 1.5×0.56) × (1 - 1.0×0.22)], 0.915)
     = min(1 - [(1 - 0.84) × (1 - 0.84) × (1 - 0.22)], 0.915)
     = min(1 - [0.16 × 0.16 × 0.78], 0.915)
     = min(1 - 0.020, 0.915)
     = min(0.980, 0.915)
     = 0.915  # Capped

# Modified Impact
ModifiedImpact = 6.42 × 0.915 = 5.87

# Modified Exploitability
ModifiedExploitability = 8.22 × 0.85 × 0.77 × 0.62 × 0.85 = 3.39

# Modified Base Score
ModifiedBaseScore = Roundup(5.87 + 3.39)
                  = Roundup(9.26)
                  = 9.3

# Environmental Score
EnvironmentalScore = Roundup(9.3 × 0.91 × 1.0 × 0.96)
                   = Roundup(8.12)
                   = 8.2
```

**Environmental Score: 8.2 (High)**

---

## Final CVSS Scores

| Metric Group | Score | Severity | Vector |
|--------------|-------|----------|--------|
| **Base** | 8.9 | High | `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:L` |
| **Temporal** | 7.8 | High | `E:U/RL:U/RC:R` |
| **Environmental** | 8.2 | High | `CR:H/IR:H/AR:M/MAV:N/MAC:L/MPR:L/MUI:N/MS:U/MC:H/MI:H/MA:L` |
| **Overall** | **8.2** | **High** | Combined vector below |

**Complete CVSS Vector:**
```
CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:L/E:U/RL:U/RC:R/CR:H/IR:H/AR:M
```

---

## Prioritization Decision

**Use Environmental Score (8.2) for prioritization.**

**Why Environmental elevated from Temporal (7.8 → 8.2)?**
- CR:High and IR:High requirements (payment card data + PCI-DSS)
- Even though Temporal reduced Base (8.9 → 7.8), Environmental elevates back to 8.2
- This signals: "High business impact - prioritize remediation"

**Comparison with same SQLi in different context:**

| Context | Base | Temporal | Environmental | Priority |
|---------|------|----------|---------------|----------|
| **Payment API** (this threat) | 8.9 | 7.8 | **8.2** (High) | **Critical - fix immediately** |
| **Marketing blog** (hypothetical) | 8.9 | 7.8 | **6.5** (Medium) | **Lower priority** |

Same technical vulnerability, different business risk.

---

## Output for threat-model.json

```json
{
  "id": "THREAT-042",
  "component": "payment_processing_api",
  "strideCategory": "Tampering",
  "threat": "SQL Injection in customer search endpoint",
  "threatActor": "External attacker",
  "attackVector": "Malicious SQL in API query parameter",

  "cvss": {
    "version": "3.1",

    "base": {
      "vector": "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:L",
      "score": 8.9,
      "severity": "High",
      "metrics": {
        "attackVector": "N",
        "attackComplexity": "L",
        "privilegesRequired": "L",
        "userInteraction": "N",
        "scope": "U",
        "confidentiality": "H",
        "integrity": "H",
        "availability": "L"
      }
    },

    "temporal": {
      "vector": "E:U/RL:U/RC:R",
      "score": 7.8,
      "metrics": {
        "exploitCodeMaturity": "U",
        "remediationLevel": "U",
        "reportConfidence": "R"
      }
    },

    "environmental": {
      "vector": "CR:H/IR:H/AR:M/MAV:N/MAC:L/MPR:L/MUI:N/MS:U/MC:H/MI:H/MA:L",
      "score": 8.2,
      "securityRequirements": {
        "confidentiality": "H",
        "integrity": "H",
        "availability": "M"
      },
      "modifiedBaseMetrics": {},
      "source": "phase-1-auto",
      "phase0Context": {
        "crownJewel": true,
        "compliance": ["PCI-DSS Level 1"],
        "breachCostUSD": 365000000
      }
    },

    "overall": {
      "score": 8.2,
      "severity": "High",
      "vector": "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:L/E:U/RL:U/RC:R/CR:H/IR:H/AR:M"
    }
  },

  "businessImpact": "Critical",
  "likelihood": "High",
  "riskScore": 12,

  "recommendedControls": [
    "Parameterized queries (prepared statements)",
    "Input validation with allowlist",
    "Principle of least privilege for database accounts",
    "WAF with SQL injection rules"
  ],

  "testingGuidance": [
    "Manual code review of query construction",
    "SAST scan with Semgrep SQL injection rules",
    "Manual penetration test with SQLMap",
    "Verify parameterized query implementation"
  ]
}
```

---

## Validation Checklist

When scoring this threat, verify:

- [x] Base metrics assessed from threat characteristics (not Phase 1)
- [x] Temporal defaults used (theoretical threat, no exploit)
- [x] Environmental derived from Phase 1 automatically
- [x] CR/IR/AR justified (crown jewel + compliance)
- [x] Final score is Environmental (8.2), not Base (8.9)
- [x] Severity rating matches score range (7.0-8.9 = High)
- [x] Complete vector string includes all groups
- [x] Output schema matches threat-model.json format

---

## Alternative Scoring: With WAF Deployed

**If organization has WAF with SQL injection rules:**

**Modified Metrics Change:**
- MAC: High (from Low) - WAF makes attack harder

**Recalculation:**
```
ModifiedExploitability = 8.22 × 0.85 × 0.44 × 0.62 × 0.85 = 1.98
ModifiedBaseScore = Roundup(5.87 + 1.98) = 7.9
EnvironmentalScore = Roundup(7.9 × 0.91 × 1.0 × 0.96) = 6.9
```

**New Environmental Score: 6.9 (Medium)**

**Effect:** WAF reduces score from 8.2 (High) to 6.9 (Medium) - showing environmental controls matter.

---

## Learnings from This Example

1. **Base score (8.9) alone misleading** - doesn't account for business context
2. **Temporal reduces to 7.8** - conservative for theoretical threat
3. **Environmental elevates to 8.2** - crown jewel + compliance drives priority
4. **Use 8.2 for prioritization** - reflects actual business risk
5. **Environmental controls (WAF) can significantly reduce score** - shows defense-in-depth value

**This threat should be prioritized highly** due to Environmental score of 8.2 despite Temporal reduction.
