# CVSS Scoring Integration

**Integrating CVSS 4.0 scoring into STRIDE threat analysis for standardized, business-contextualized threat prioritization.**

## Overview

After completing STRIDE threat identification, each threat must be scored using CVSS 4.0 via the `cvss-scoring` skill. This replaces the simple 1-12 severity/likelihood matrix with industry-standard CVSS scoring that incorporates:

- **Base metrics**: Inherent exploitability and impact
- **Threat metrics**: Likelihood of exploitation
- **Environmental metrics**: Business-specific impact context from Phase 1

## Workflow Integration

### When to Score

**AFTER Step 2 (STRIDE Analysis)** and **BEFORE Step 7 (Risk Scoring)**:

```
Step 2: Apply STRIDE → Identify threats
  ↓
NEW: Step 2.5: Score with CVSS → Invoke cvss-scoring for each threat
  ↓
Step 7: Score Risks → Use CVSS Environmental scores for prioritization
```

### CVSS Scoring Step (NEW Step 2.5)

For **each threat identified in STRIDE analysis**:

1. **Prepare context** from Phase 1 and Phase 1:
   ```bash
   # Load business context
   cat .claude/.output/threat-modeling/{timestamp}-{slug}/phase-1/summary.md
   cat .claude/.output/threat-modeling/{timestamp}-{slug}/phase-1/business-impact.json

   # Load architecture context
   cat .claude/.output/threat-modeling/{timestamp}-{slug}/phase-1/summary.md
   ```

2. **Invoke cvss-scoring skill**:
   ```
   Skill: "cvss-scoring"

   Context:
   - Threat description: [STRIDE threat details]
   - System architecture: [Phase 1 context]
   - Business context: [Phase 1 context]
   - Attack vector: [From threat analysis]
   - Assets at risk: [From Phase 1]
   ```

3. **Capture CVSS output**:
   - Base Score + Vector
   - Threat Score + Vector
   - Environmental Score + Vector
   - Overall Score + Vector
   - Severity rating (Low/Medium/High/Critical)

4. **Repeat for all threats** (can be done in parallel for efficiency)

## Updated Threat Schema

Each threat in `threat-model.json` must include CVSS structure:

```json
{
  "threat_id": "THR-001",
  "name": "SQL Injection in User Search",
  "stride_category": "Tampering",
  "description": "User search endpoint lacks parameterized queries...",

  "cvss": {
    "version": "4.0",
    "base": {
      "score": 8.2,
      "vector": "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:L/VA:N/SC:N/SI:N/SA:N",
      "exploitability": {
        "attack_vector": "Network",
        "attack_complexity": "Low",
        "attack_requirements": "None",
        "privileges_required": "None",
        "user_interaction": "None"
      },
      "impact": {
        "confidentiality": "High",
        "integrity": "Low",
        "availability": "None"
      }
    },
    "threat": {
      "score": 8.1,
      "vector": "CVSS:4.0/E:A/U:Green",
      "exploit_maturity": "Attacked",
      "remediation_level": "Official-Fix",
      "report_confidence": "Confirmed"
    },
    "environmental": {
      "score": 9.3,
      "vector": "CVSS:4.0/CR:H/IR:H/AR:M/MAV:N/MAC:L",
      "modified_base": {
        "confidentiality_requirement": "High",
        "integrity_requirement": "High",
        "availability_requirement": "Medium"
      },
      "business_context": {
        "targets_crown_jewel": true,
        "crown_jewel": "customer_pii",
        "compliance_impact": "PCI-DSS, GDPR",
        "financial_impact": "$2.5M (from Phase 1)"
      }
    },
    "overall": {
      "score": 9.3,
      "severity": "Critical",
      "priority_rank": 1
    }
  },

  "business_context": {
    "targets_crown_jewel": true,
    "crown_jewel": "customer_pii",
    "business_impact_financial": "$2.5M (from Phase 1)",
    "relevant_threat_actor": "financially_motivated_cybercriminals"
  },

  "related_controls": ["input-validation"],
  "control_gaps": ["No parameterized queries", "No WAF"]
}
```

## Scoring All Threats Efficiently

### Parallel Scoring Pattern

For large threat models (20+ threats), score in batches:

```bash
# Create scoring batch file
cat > /tmp/threats-to-score.txt << EOF
THR-001: SQL Injection in User Search
THR-002: XSS in Comment Field
THR-003: CSRF in Account Settings
...
EOF

# Score each threat (can be parallelized)
for threat in $(cat /tmp/threats-to-score.txt); do
  echo "Scoring $threat..."
  # Invoke cvss-scoring skill with threat context
done
```

### Scoring Priority

Score Critical/High threats first (based on initial STRIDE assessment), then Medium/Low:

1. **High priority** (score immediately):
   - Threats targeting crown jewels from Phase 1
   - Threats with "easily exploitable" characteristics
   - Threats with critical business impact

2. **Lower priority** (score after high):
   - Threats with limited business impact
   - Threats requiring significant attacker resources
   - Informational findings

## Updated Risk Prioritization (Step 7)

Replace the simple 1-12 risk matrix with **CVSS Environmental Score prioritization**:

### Old Approach (DEPRECATED)
```
Risk Score = Business Impact (1-4) × Likelihood (1-3)
Priority = Risk Score + Crown Jewel Bonus + Compliance Bonus
```

### New Approach (CVSS-Based)
```
Primary Sort: CVSS Environmental Score (0.0-10.0)
Secondary Sort: CVSS Overall Score (0.0-10.0)
Tertiary Sort: Business Impact from Phase 1

Priority Bands:
  Critical (9.0-10.0): Immediate action required
  High (7.0-8.9):      Address in current sprint
  Medium (4.0-6.9):    Plan for remediation
  Low (0.1-3.9):       Accept or defer
  None (0.0):          Informational only
```

**Why Environmental Score?**
- Incorporates business context from Phase 1
- Reflects actual organizational risk (not generic CVSS Base)
- Aligns with industry standards for risk prioritization

## Output File Updates

### threat-model.json

Sort threats by CVSS Environmental Score (descending):

```json
{
  "threats": [
    {
      "threat_id": "THR-001",
      "cvss": {
        "environmental": { "score": 9.3 },
        "overall": { "score": 9.3, "severity": "Critical" }
      }
    },
    {
      "threat_id": "THR-007",
      "cvss": {
        "environmental": { "score": 8.8 },
        "overall": { "score": 8.5, "severity": "High" }
      }
    }
  ],
  "scoring_methodology": "CVSS 4.0",
  "prioritization_basis": "Environmental Score (business-contextualized)"
}
```

### summary.md

Update summary template to include CVSS scores:

```markdown
# Phase 3 Summary: Threat Model

## Top Threats (by CVSS Environmental Score)

1. **THR-001**: SQL Injection in User Search (CVSS: 9.3 Critical)
   - Base: 8.2, Threat: 8.1, Environmental: 9.3
   - Attack Vector: Network, Complexity: Low
   - Business Impact: $2.5M data breach (targets customer_pii)
   - Control Gaps: No parameterized queries, no WAF

2. **THR-007**: Credential Theft via Weak MFA (CVSS: 8.8 High)
   - Base: 7.5, Threat: 8.0, Environmental: 8.8
   - Attack Vector: Network, Requires: User interaction
   - Business Impact: $1.2M account takeover
   - Control Gaps: MFA not enforced, weak session management

...

## Scoring Methodology

- **CVSS Version**: 4.0
- **Environmental Scoring**: Enabled with Phase 1 business context
- **Total Threats**: 23 (5 Critical, 7 High, 8 Medium, 3 Low)
- **Prioritization**: Environmental Score (business-contextualized risk)
```

### risk-matrix.json

Replace simple risk matrix with CVSS band distribution:

```json
{
  "scoring_methodology": "CVSS 4.0",
  "distribution": {
    "critical": {
      "count": 5,
      "range": "9.0-10.0",
      "threat_ids": ["THR-001", "THR-003", "THR-012", "THR-015", "THR-019"]
    },
    "high": {
      "count": 7,
      "range": "7.0-8.9",
      "threat_ids": ["THR-007", "THR-008", ...]
    },
    "medium": {
      "count": 8,
      "range": "4.0-6.9",
      "threat_ids": [...]
    },
    "low": {
      "count": 3,
      "range": "0.1-3.9",
      "threat_ids": [...]
    }
  },
  "prioritization_notes": "Sorted by CVSS Environmental Score (incorporates Phase 1 business context)"
}
```

## Phase 1 Context Integration

The cvss-scoring skill uses Phase 1 business context to determine Environmental metrics. This section provides the **formal algorithm** for mapping Phase 1 outputs to CVSS CR/IR/AR values.

### CVSS Version Differences

| Behavior | CVSS 3.1 | CVSS 4.0 |
|----------|----------|----------|
| **Calculation** | Explicit formula with constants | MacroVector lookup tables |
| **CR/IR/AR Constants** | High=1.5, Medium=1.0, Low=0.5 | No numeric constants (equivalence sets) |
| **'Not Defined' Default** | Treated as **Medium** | Treated as **High** (worst case) |
| **Safety Metric** | Not available | MSI/MSA for OT/ICS/IoT |
| **Formula (3.1 only)** | `MISS = Min(1 - [(1-CR×MC)×(1-IR×MI)×(1-AR×MA)], 0.915)` | Lookup EQ6 + proportional distance |

**CRITICAL**: When CVSS version is 4.0 and CR/IR/AR cannot be determined from Phase 1, they default to **High** (worst case). For CVSS 3.1, they default to **Medium**. This significantly affects scores.

### Confidentiality Requirement (CR) Algorithm

**Source Files**: `phase-1/data-classification.json`, `phase-1/compliance-requirements.json`

**Decision Tree**:

```
IF threat.targets_asset IN phase1.crown_jewels:
    CR = High
ELSE IF threat.affected_data.sensitivity IN ["PII", "PHI", "PCI", "credentials", "secrets"]:
    CR = High
ELSE IF threat.affected_data.sensitivity IN ["internal", "proprietary", "business_confidential"]:
    CR = Medium
ELSE IF threat.affected_data.sensitivity IN ["public", "marketing", "documentation"]:
    CR = Low
ELSE:
    CR = Not Defined (→ High for CVSS 4.0, Medium for CVSS 3.1)
```

**Phase 1 Field Mapping**:

| Phase 1 Field | Value Pattern | CR Assignment |
|---------------|---------------|---------------|
| `data-classification.crown_jewels[]` | Threat targets any crown jewel | **High** |
| `data-classification.data_types[].sensitivity` | "critical", "restricted" | **High** |
| `data-classification.data_types[].regulatory_requirements` | Contains HIPAA, PCI-DSS, GDPR | **High** |
| `data-classification.data_types[].sensitivity` | "internal", "confidential" | **Medium** |
| `data-classification.data_types[].sensitivity` | "public" | **Low** |

**Examples**:

| Scenario | Phase 1 Evidence | CR |
|----------|------------------|-----|
| SQL injection exposing payment_card_data | `crown_jewels: ["payment_card_data"]` | High |
| XSS leaking session tokens | `data_types: [{category: "credentials", sensitivity: "critical"}]` | High |
| Info disclosure of internal docs | `data_types: [{category: "documentation", sensitivity: "internal"}]` | Medium |
| Public API metadata exposure | `data_types: [{category: "api_docs", sensitivity: "public"}]` | Low |

### Integrity Requirement (IR) Algorithm

**Source Files**: `phase-1/business-impact.json`, `phase-1/compliance-requirements.json`

**Decision Tree**:

```
IF phase1.business_impact.data_modification_impact >= $1,000,000:
    IR = High
ELSE IF phase1.business_impact.data_modification_impact >= $100,000:
    IR = Medium
ELSE IF phase1.business_impact.data_modification_impact < $100,000:
    IR = Low

# Override based on transaction type
IF threat.affects_transactions IN ["financial", "payment", "billing"]:
    IR = max(IR, High)
ELSE IF threat.affects_transactions IN ["user_data", "configuration", "permissions"]:
    IR = max(IR, Medium)

# Compliance override
IF phase1.compliance_requirements CONTAINS ["SOX", "PCI-DSS Req 10"]:
    IR = max(IR, High)  # Audit integrity requirements
```

**Threshold Table**:

| Data Modification Impact | IR Assignment |
|--------------------------|---------------|
| ≥ $1,000,000 | **High** |
| $100,000 - $999,999 | **Medium** |
| < $100,000 | **Low** |
| Unknown (no Phase 1 data) | Not Defined |

**Transaction Type Overrides**:

| Transaction Type | Minimum IR |
|------------------|------------|
| Financial transactions, payments, billing | **High** |
| User profile modifications, permissions | **Medium** |
| UI preferences, non-critical settings | **Low** |

**Examples**:

| Scenario | Phase 1 Evidence | IR |
|----------|------------------|-----|
| Order amount tampering | `business_impact.data_modification_impact: "$5M"` | High |
| User role escalation | `affects: "permissions"`, compliance: ["SOX"] | High |
| Blog post defacement | `business_impact.data_modification_impact: "$10K"` | Low |

### Availability Requirement (AR) Algorithm

**Source Files**: `phase-1/security-objectives.json`, `phase-1/business-impact.json`

**Decision Tree**:

```
# Primary: Recovery Time Objective (RTO)
IF phase1.security_objectives.rto < 24_hours:
    AR = High
ELSE IF phase1.security_objectives.rto <= 5_days:
    AR = Medium
ELSE IF phase1.security_objectives.rto > 5_days:
    AR = Low

# Modifier: Redundancy reduces AR by one level
IF phase1.security_objectives.redundancy == "full":
    AR = decrease_one_level(AR)  # High→Medium, Medium→Low

# Modifier: Revenue impact per hour
IF phase1.business_impact.downtime_cost_per_hour >= $50,000:
    AR = max(AR, High)
ELSE IF phase1.business_impact.downtime_cost_per_hour >= $5,000:
    AR = max(AR, Medium)
```

**RTO-Based Threshold Table**:

| Recovery Time Objective | Redundancy | AR Assignment |
|------------------------|------------|---------------|
| < 24 hours | None | **High** |
| < 24 hours | Full | **Medium** (reduced) |
| 1-5 days | None | **Medium** |
| 1-5 days | Full | **Low** (reduced) |
| > 5 days | Any | **Low** |

**Downtime Cost Overrides**:

| Downtime Cost/Hour | Minimum AR |
|--------------------|------------|
| ≥ $50,000/hour | **High** |
| $5,000 - $49,999/hour | **Medium** |
| < $5,000/hour | **Low** |

**Examples**:

| Scenario | Phase 1 Evidence | AR |
|----------|------------------|-----|
| Payment processing DoS | `rto: "4 hours"`, `downtime_cost: "$100K/hour"` | High |
| Internal tool outage | `rto: "3 days"`, `redundancy: "none"` | Medium |
| Marketing site down | `rto: "7 days"`, `redundancy: "full"` | Low |

### Safety Metric (CVSS 4.0 Only)

**Source Files**: `phase-1/business-impact.json`, `phase-1/security-objectives.json`

CVSS 4.0 introduces MSI (Modified Subsequent System Integrity) and MSA (Modified Subsequent System Availability) with a **Safety (S)** value for OT/ICS/IoT environments.

**When to Apply Safety**:

```
IF phase1.business_impact.physical_safety_impact EXISTS:
    IF physical_safety_impact IN ["death", "multiple_injuries", "major_injury"]:
        MSI = Safety OR MSA = Safety (based on threat type)
```

**IEC 61508 Severity Mapping**:

| Physical Impact | IEC 61508 Category | CVSS 4.0 |
|-----------------|-------------------|----------|
| Multiple deaths possible | Catastrophic | MSI/MSA = **Safety** |
| Single death or major injuries | Critical | MSI/MSA = **Safety** |
| Minor injuries possible | Marginal | MSI/MSA = **Safety** |
| No physical harm | Negligible | Standard H/M/L |

**Applicability**:

| System Type | Safety Metric Likely? |
|-------------|----------------------|
| Medical devices | Yes |
| Industrial control systems (ICS) | Yes |
| Automotive systems | Yes |
| Building automation | Yes |
| Standard enterprise IT | No (use H/M/L) |

### Complete Phase 1 → CVSS Mapping Table

| Phase 1 File | Phase 1 Field | CVSS Metric | Mapping Logic |
|--------------|---------------|-------------|---------------|
| `data-classification.json` | `crown_jewels[]` | CR | Target in list → **High** |
| `data-classification.json` | `data_types[].sensitivity` | CR | critical/restricted → High, internal → Medium, public → Low |
| `data-classification.json` | `data_types[].regulatory_requirements` | CR | HIPAA/PCI/GDPR → **High** |
| `business-impact.json` | `data_modification_impact` | IR | ≥$1M → High, ≥$100K → Medium, <$100K → Low |
| `business-impact.json` | `transaction_types[]` | IR | financial → High, user_data → Medium |
| `business-impact.json` | `downtime_cost_per_hour` | AR | ≥$50K → High, ≥$5K → Medium |
| `business-impact.json` | `physical_safety_impact` | MSI/MSA | injuries/death → **Safety** (4.0 only) |
| `security-objectives.json` | `rto` | AR | <24h → High, 1-5d → Medium, >5d → Low |
| `security-objectives.json` | `redundancy` | AR | full → reduce AR one level |
| `compliance-requirements.json` | `requirements[]` | CR, IR | SOX/audit → IR High, HIPAA → CR High |

### Algorithm Implementation

**Pseudocode for Threat Scoring**:

```python
def calculate_environmental_metrics(threat, phase1_context, cvss_version):
    # Confidentiality Requirement
    cr = "Not Defined"
    if threat.targets_asset in phase1_context.crown_jewels:
        cr = "High"
    elif threat.affected_data_sensitivity in ["PII", "PHI", "PCI", "credentials"]:
        cr = "High"
    elif threat.affected_data_sensitivity in ["internal", "proprietary"]:
        cr = "Medium"
    elif threat.affected_data_sensitivity == "public":
        cr = "Low"

    # Integrity Requirement
    ir = "Not Defined"
    modification_impact = phase1_context.business_impact.data_modification_impact
    if modification_impact >= 1_000_000:
        ir = "High"
    elif modification_impact >= 100_000:
        ir = "Medium"
    else:
        ir = "Low"

    # Override for financial transactions
    if threat.affects_transactions in ["financial", "payment"]:
        ir = "High"

    # Availability Requirement
    ar = "Not Defined"
    rto_hours = phase1_context.security_objectives.rto_hours
    if rto_hours < 24:
        ar = "High"
    elif rto_hours <= 120:  # 5 days
        ar = "Medium"
    else:
        ar = "Low"

    # Redundancy modifier
    if phase1_context.security_objectives.redundancy == "full":
        ar = decrease_level(ar)

    # Downtime cost override
    if phase1_context.business_impact.downtime_cost_per_hour >= 50_000:
        ar = max_level(ar, "High")

    # Handle Not Defined defaults (version-specific)
    if cvss_version == "4.0":
        default = "High"  # CVSS 4.0 worst-case
    else:
        default = "Medium"  # CVSS 3.1 default

    cr = cr if cr != "Not Defined" else default
    ir = ir if ir != "Not Defined" else default
    ar = ar if ar != "Not Defined" else default

    # Safety (CVSS 4.0 only)
    msi, msa = None, None
    if cvss_version == "4.0" and phase1_context.business_impact.physical_safety_impact:
        if phase1_context.business_impact.physical_safety_impact in ["death", "major_injury"]:
            if threat.type == "integrity":
                msi = "Safety"
            elif threat.type == "availability":
                msa = "Safety"

    return {
        "CR": cr,
        "IR": ir,
        "AR": ar,
        "MSI": msi,  # CVSS 4.0 only
        "MSA": msa   # CVSS 4.0 only
    }
```

### Validation Checklist

Before applying Environmental metrics, verify:

- [ ] Phase 1 `data-classification.json` loaded (for CR)
- [ ] Phase 1 `business-impact.json` loaded (for IR, AR, Safety)
- [ ] Phase 1 `security-objectives.json` loaded (for AR)
- [ ] CVSS version known from `config.json` (affects Not Defined handling)
- [ ] Crown jewels list available for CR decisions
- [ ] Financial thresholds converted to numeric values

**CRITICAL**: Do not invoke cvss-scoring without Phase 1 context. Environmental scores without business context produce generic results that don't reflect actual organizational risk.

## Updated Step 7 Workflow

Replace existing Step 7 with:

```markdown
### Step 7: Prioritize with CVSS Environmental Scores

**Load CVSS scores from Step 2.5**:
All threats now have CVSS structure with Environmental scores.

**Sort threats by Environmental Score (descending)**:
```bash
# Sort threat-model.json by cvss.environmental.score
jq '.threats | sort_by(-.cvss.environmental.score)' threat-model.json
```

**Create priority bands**:
- Critical (9.0-10.0): Immediate action, include in Phase 4 testing
- High (7.0-8.9): Current sprint remediation
- Medium (4.0-6.9): Backlog for next quarter
- Low (0.1-3.9): Accept risk or defer

**Generate risk-matrix.json** with CVSS band distribution (see schema above).

**No longer needed**:
- ❌ Manual Business Impact scoring (1-4)
- ❌ Manual Likelihood scoring (1-3)
- ❌ Risk Score = Impact × Likelihood formula
- ❌ Crown Jewel Bonus calculations
- ❌ Compliance Bonus calculations

**Why**: CVSS Environmental scoring already incorporates all these factors systematically.
```

## Backwards Compatibility

**For organizations without Phase 1**: Use CVSS Base Score only (no Environmental scoring). This provides industry-standard scoring without business context.

**Fallback workflow**:
1. Score threats with cvss-scoring (Base metrics only)
2. Sort by CVSS Base Score
3. Manually adjust priority based on known business context

**Recommendation**: Always complete Phase 1 for accurate Environmental scoring.

## Benefits of CVSS Integration

### Standardization
- Industry-recognized scoring methodology
- Comparable across organizations and tools
- Aligns with vulnerability databases (NVD, CVE)

### Business Contextualization
- Environmental metrics incorporate Phase 1 data
- Financial impact drives Confidentiality/Integrity/Availability Requirements
- Crown jewels automatically elevate Environmental scores

### Precision
- 10-point scale (vs 12-point matrix) with decimal precision
- Separate exploitability and impact dimensions
- Temporal metrics for exploit maturity

### Interoperability
- CVSS vectors can be shared with security tools
- Compatible with SIEM, vulnerability scanners, risk platforms
- Supports automated workflows (e.g., SOAR)

## Related

- [Phase 1 Integration Guide](phase-1-integration.md) - Business context collection
- [Output Schemas](output-schemas.md) - Updated threat-model.json schema with CVSS
- [CVSS 3.1 Specification](https://www.first.org/cvss/v3-1/specification-document) - Formula reference
- [CVSS 4.0 Specification](https://www.first.org/cvss/specification-document) - MacroVector lookup
- [CVSS 4.0 User Guide](https://www.first.org/cvss/v4-0/user-guide) - CR/IR/AR guidance
- [Risk Scoring Guide](risk-scoring-guide.md) - DEPRECATED (replaced by CVSS)
- `cvss-scoring` skill - CVSS scoring with Phase 1 integration
- `gateway-security` - Security skills gateway

## Migration Notes

### For Existing Threat Models

If updating a threat model created with the old 1-12 matrix:

1. Keep existing `risk_score` field for reference
2. Add `cvss` structure via cvss-scoring skill
3. Re-sort by `cvss.environmental.score`
4. Update priority bands from matrix to CVSS ranges
5. Archive old `risk-matrix.json`, create new CVSS-based version

### Timeline

- **Phase 1** (current): CVSS integration documented, skill updated
- **Phase 2** (next): Update threat-modeling-orchestrator to invoke CVSS scoring
- **Phase 3** (future): Deprecate old risk-matrix, enforce CVSS in schema validation
