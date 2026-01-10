# Phase 1 Integration Guide

**This reference explains how Phase 5 (Threat Modeling) integrates with Phase 1 (Business Context Discovery) to produce risk-based, business-relevant threat models.**

---

## Overview

Phase 1 provides business context that transforms threat modeling from generic technical analysis to risk-based security assessment aligned with PASTA methodology.

**Key Principle**: Every threat should be scored using actual business impact data (not generic estimates), filtered by relevant threat actors (not all possible threats), and prioritized by crown jewel targeting.

---

## Required Phase 1 Files

**Load at start of Phase 5**:

```bash
# Phase 1 directory structure
.claude/.output/threat-modeling/{timestamp}-{slug}/phase-1/
├── summary.md                      # Quick context overview (<2000 tokens)
├── threat-actors.json              # Relevant attacker profiles
├── business-impact.json            # Actual financial/regulatory impact data
└── data-classification.json        # Crown jewels for prioritization
```

**Load on-demand**:
- `compliance-requirements.json` - If mapping threats to regulatory violations

---

## Section 1: How Business Context Drives Threat Modeling

| Phase 1 Input | Impact on Threat Modeling | Example |
|---------------|---------------------------|---------|
| **Threat Actors** | Apply only relevant profiles (not generic) | If threat_actors = ransomware groups, apply ransomware tactics (encryption, exfiltration, backup destruction), skip nation-state APT tactics |
| **Business Impact** | Use actual financial data in risk scoring | If business_impact.data_breach = "$365M", use in PASTA risk calculation (not generic "high") |
| **Crown Jewels** | Prioritize threats targeting most valuable assets | If crown_jewels = ["payment_card_data"], prioritize spoofing/tampering threats to payment flows over DoS on marketing site |
| **Compliance** | Map threats to regulatory violations | If compliance = HIPAA, identify threats causing §164.312 violations |

---

## Section 2: Applying STRIDE with Threat Actor Context

### Step-by-Step Workflow

**For each component** (from Phase 3):

#### 2.1 Load Relevant Threat Actors

```bash
# Read threat actors from Phase 1
cat ../phase-1/threat-actors.json
```

**Example threat-actors.json**:
```json
{
  "threat_actors": [
    {
      "profile": "financially_motivated_cybercriminals",
      "motivation": "Financial gain through data theft or ransomware",
      "capabilities": ["Phishing", "Credential stuffing", "Ransomware", "Payment fraud"],
      "typical_targets": ["Payment systems", "Customer databases", "Authentication services"],
      "likelihood": "high"
    },
    {
      "profile": "insider_threats",
      "motivation": "Data exfiltration for personal gain or revenge",
      "capabilities": ["Privileged access abuse", "Data exfiltration", "Sabotage"],
      "typical_targets": ["Internal APIs", "Admin panels", "Database direct access"],
      "likelihood": "medium"
    }
  ]
}
```

#### 2.2 Apply STRIDE Filtered by Threat Actor Capabilities

**Example - If threat actors = ["financially_motivated_cybercriminals", "insider_threats"]**:

**Component: Payment Processor**

| STRIDE Category | Threat | Relevant? | Rationale |
|-----------------|--------|-----------|-----------|
| **Spoofing** | Payment transaction spoofing | ✅ HIGH | Financially motivated attackers target payment fraud |
| **Tampering** | Transaction amount modification | ✅ HIGH | Financial gain motivation |
| **Repudiation** | Fraudulent transaction denial | ✅ MEDIUM | Less common but possible |
| **Info Disclosure** | Card data theft | ✅ VERY HIGH | Primary target for financial cybercriminals |
| **DoS** | Ransomware encryption | ✅ HIGH | Ransomware is common tactic |
| **Elevation of Privilege** | Admin access for card data | ✅ MEDIUM | Both external and insider threat |

**Component: Marketing Blog**

| STRIDE Category | Threat | Relevant? | Rationale |
|-----------------|--------|-----------|-----------|
| **Spoofing** | Blog author impersonation | ⚠️ LOW | Not financially motivated target |
| **Tampering** | Blog content defacement | ⚠️ LOW | Doesn't align with financial motivation |
| **Info Disclosure** | Marketing data exposure | ❌ SKIP | No financial value per Phase 1 |
| **DoS** | Blog downtime | ⚠️ LOW | Not primary target for financial actors |

**Key Insight**: If Phase 1 doesn't identify "hacktivists" or "nation-state APTs", don't apply their threat patterns. Focus on threats relevant to identified actors.

#### 2.3 Document Rationale

**For each threat**, document:
```json
{
  "threat_id": "THR-001",
  "component": "payment-processor",
  "stride_category": "InfoDisclosure",
  "threat": "SQL injection enables card data theft",
  "threat_actor_context": {
    "relevant_actors": ["financially_motivated_cybercriminals"],
    "actor_motivation": "Financial gain through card data sale on dark web",
    "actor_capability": "SQL injection is common technique for this actor profile",
    "rationale": "Applied because Phase 1 identified financial cybercriminals as primary threat actor"
  }
}
```

---

## Section 3: Risk Scoring with Business Impact Data

### PASTA Stage 7 - Business Impact Scoring

**Traditional approach (WRONG)**:
```
Risk = Generic Impact × Likelihood
Impact = "High" (subjective guess)
Result = Not actionable for business
```

**PASTA approach with Phase 1 (CORRECT)**:
```
Risk = Actual Business Impact × Likelihood
Impact = $365M breach cost (from Phase 1)
Result = Quantified business risk
```

### 3.1 Load Business Impact from Phase 1

```bash
# Read business impact data
cat ../phase-1/business-impact.json
```

**Example business-impact.json**:
```json
{
  "scenarios": [
    {
      "scenario": "data_breach_1M_card_records",
      "impact_categories": {
        "financial": {
          "immediate_costs": "$2M (forensics, legal, PR)",
          "notification_costs": "$500K",
          "credit_monitoring": "$5M (3 years)",
          "brand_damage": "$50M (estimated revenue loss)",
          "total_estimated_costs": "$365M"
        },
        "regulatory": {
          "applicable_laws": ["PCI-DSS", "State breach notification laws"],
          "estimated_fines": "$100K per month (PCI non-compliance)",
          "card_brand_penalties": "Potential loss of payment processing rights"
        },
        "operational": {
          "downtime_hours": 72,
          "recovery_time": "6 months to full recovery",
          "customer_churn": "15-20% estimated"
        }
      },
      "business_impact_score": 4
    },
    {
      "scenario": "marketing_site_downtime_4_hours",
      "impact_categories": {
        "financial": {
          "immediate_costs": "$10K (lost conversions)",
          "total_estimated_costs": "$50K"
        },
        "operational": {
          "downtime_hours": 4,
          "recovery_time": "Same day"
        }
      },
      "business_impact_score": 1
    }
  ]
}
```

### 3.2 Map Threats to Business Impact Scenarios

**For each threat**, identify matching scenario:

```json
{
  "threat_id": "THR-001",
  "threat": "SQL injection enables card data theft",
  "component": "payment-processor",
  "matching_scenario": "data_breach_1M_card_records",
  "business_impact": {
    "score": 4,
    "financial": "$365M total estimated costs",
    "regulatory": "PCI-DSS violations, $100K/month fines",
    "operational": "72 hours downtime, 6 months recovery"
  }
}
```

### 3.3 Risk Calculation Formula

```
Business Impact Score (from Phase 1):
  Critical (4) = Business-ending, >$50M, regulatory violation, mass breach
  High (3)     = $5M-$50M, significant data exposure, major regulatory
  Medium (2)   = $500K-$5M, limited impact, minor regulatory
  Low (1)      = <$500K, minimal impact, no regulatory

Likelihood (from threat analysis):
  High (3)   = Easily exploitable, public knowledge, script-kiddie level
  Medium (2) = Requires skill or insider knowledge
  Low (1)    = Difficult, requires significant resources

Risk Score = Business Impact (from Phase 1) × Likelihood (from analysis)
```

**Example Calculation**:
```
Threat: SQL injection in payment processor
Business Impact: 4 (Critical) - $365M breach cost from Phase 1
Likelihood: 3 (High) - No parameterized queries found in Phase 4
Risk Score: 4 × 3 = 12 (CRITICAL)
```

vs.

```
Threat: XSS in marketing blog
Business Impact: 1 (Low) - $50K downtime from Phase 1
Likelihood: 2 (Medium) - Some input validation exists
Risk Score: 1 × 2 = 2 (LOW)
```

### 3.4 Update Risk Scoring in SKILL.md

**Replace Step 7 scoring logic** with:

```markdown
### Step 7: Score Risks (Using Phase 1 Business Impact)

**Load business impact scenarios from Phase 1**:
```bash
cat ../phase-1/business-impact.json
```

**For each threat**:
1. Match threat to business impact scenario from Phase 1
2. Use business_impact_score (1-4) as Impact value
3. Assess Likelihood (1-3) based on control gaps from Phase 4
4. Calculate Risk Score = Impact × Likelihood
5. Document actual financial data in threat record

**Example**:
- Threat: Card data theft via SQL injection
- Matching scenario: "data_breach_1M_card_records" (from Phase 1)
- Business Impact: 4 (Critical) - $365M total cost
- Likelihood: 3 (High) - no input validation found
- Risk Score: 12 (CRITICAL)
- Priority: Immediate action required
```

---

## Section 4: Threat Prioritization with Crown Jewel Weighting

### Priority Calculation Formula

```
Final Priority Score = Base Risk Score + Crown Jewel Bonus + Compliance Bonus

Base Risk Score = Business Impact × Likelihood (1-12)
Crown Jewel Bonus = +2 if threat targets crown jewel from Phase 1
Compliance Bonus = +1 if threat causes regulatory violation from Phase 1

Priority Levels:
  CRITICAL (13+): Immediate action, blocks deployment
  HIGH (9-12):    Current sprint
  MEDIUM (5-8):   Next sprint
  LOW (1-4):      Backlog
```

### 4.1 Load Crown Jewels from Phase 1

```bash
cat ../phase-1/data-classification.json
```

**Example data-classification.json**:
```json
{
  "crown_jewels": [
    {
      "data_type": "payment_card_data",
      "sensitivity": "critical",
      "regulatory": "PCI-DSS",
      "business_justification": "Loss = $365M + loss of payment processing rights"
    },
    {
      "data_type": "user_credentials",
      "sensitivity": "high",
      "regulatory": "SOC2",
      "business_justification": "Enables lateral movement to all systems"
    }
  ]
}
```

### 4.2 Apply Crown Jewel Weighting

**Example 1: Crown Jewel Threat**
```
Threat: SQL injection in payment processor
Base risk: High Impact (3) × High Likelihood (3) = 9
Crown jewel bonus: +2 (targets payment_card_data from Phase 1)
Compliance bonus: +1 (PCI-DSS Requirement 6.5.1 violation)
Final priority: 12 → CRITICAL (originally HIGH)
```

**Example 2: Non-Crown Jewel Threat**
```
Threat: XSS in marketing blog
Base risk: Low Impact (1) × Medium Likelihood (2) = 2
Crown jewel bonus: 0 (doesn't target crown jewels)
Compliance bonus: 0 (no compliance impact)
Final priority: 2 → LOW (stays LOW)
```

### 4.3 Prioritization Logic

```typescript
interface ThreatPriority {
  threat_id: string;
  base_risk_score: number;        // 1-12 (Impact × Likelihood)
  crown_jewel_bonus: number;      // +2 if targets crown jewel, else 0
  compliance_bonus: number;       // +1 if compliance violation, else 0
  final_priority_score: number;   // Sum of above
  priority_level: "critical" | "high" | "medium" | "low";
}
```

---

## Section 5: Updated Output Schema

### 5.1 Enhanced threat-model.json Schema

**Add business_context section** to each threat:

```json
{
  "threat_id": "THR-001",
  "component": "payment-processor",
  "stride_category": "InfoDisclosure",
  "threat": "SQL injection enables card data theft",

  "business_context": {
    "targets_crown_jewel": true,
    "crown_jewel": "payment_card_data",
    "business_impact_score": 4,
    "business_impact_financial": "$365M (from Phase 1 scenario: data_breach_1M_card_records)",
    "business_impact_regulatory": "PCI-DSS Requirement 6.5.1 violation, $100K/month fines",
    "business_impact_operational": "72 hours downtime, 6 months recovery",
    "compliance_violation": "PCI-DSS Requirement 6.5.1",
    "relevant_threat_actor": "financially_motivated_cybercriminals",
    "threat_actor_motivation": "Financial gain through card data sale",
    "phase_0_scenario": "data_breach_1M_card_records"
  },

  "likelihood": 3,
  "base_risk_score": 12,
  "crown_jewel_bonus": 2,
  "compliance_bonus": 1,
  "final_priority_score": 15,
  "priority": "critical",

  "control_gaps": ["No parameterized queries", "No WAF"],
  "attack_paths": ["Public internet → API → Database"],
  "test_recommendations": ["SQL injection fuzzing", "DAST scanning"]
}
```

### 5.2 Enhanced summary.md Template

```markdown
# Phase 5 Summary: Threat Model (Business Context Integrated)

## Business Context Foundation (Phase 1)

**Crown Jewels**: payment_card_data, user_credentials
**Threat Actors**: financially_motivated_cybercriminals, insider_threats
**Business Impact**: $365M data breach cost, $100K/month PCI fines
**Compliance**: PCI-DSS Level 1, SOC2 Type II

## Top Threats (Risk-Scored with Business Impact)

### 1. THR-001: SQL Injection in Payment Processor (Priority: 15 - CRITICAL)
- **Business Impact**: 4 (Critical) - $365M breach cost (from Phase 1)
- **Likelihood**: 3 (High) - No parameterized queries found
- **Base Risk**: 12
- **Crown Jewel Bonus**: +2 (targets payment_card_data)
- **Compliance Bonus**: +1 (PCI-DSS 6.5.1 violation)
- **Final Priority**: 15 (CRITICAL)
- **Threat Actor**: financially_motivated_cybercriminals
- **Control Gaps**: No parameterized queries, no WAF

### 2. THR-007: Credential Stuffing on Auth Endpoints (Priority: 12 - CRITICAL)
- **Business Impact**: 3 (High) - Enables lateral movement
- **Likelihood**: 3 (High) - No rate limiting found
- **Base Risk**: 9
- **Crown Jewel Bonus**: +2 (targets user_credentials)
- **Compliance Bonus**: +1 (SOC2 CC6.1 violation)
- **Final Priority**: 12 (CRITICAL)

[Continue for top 5 threats...]

## Key Findings

- **X Critical threats** (priority 13+) identified - all target crown jewels from Phase 1
- **Y High threats** (priority 9-12)
- **All threats scored using actual business impact data** (not generic estimates)
- **Filtered by relevant threat actors** (financial cybercriminals, insider threats)
- Top attack vectors: SQL injection ($365M risk), credential theft ($50M+ risk)

## Recommendations for Phase 6

**Priority 1 (CRITICAL)**: Test crown jewel protection
1. SQL injection testing on payment endpoints (THR-001: $365M risk)
2. Authentication bypass testing (THR-007: lateral movement)

**Priority 2 (HIGH)**: Validate business impact scenarios
1. Data breach response procedures
2. Incident cost estimation accuracy
```

### 5.3 File Checklist

**Verify all Phase 5 outputs include business context**:
- [ ] threat-model.json - All threats have business_context section
- [ ] summary.md - Business context foundation included
- [ ] abuse-cases/*.json - Crown jewel targeting documented
- [ ] risk-matrix.json - Actual financial data in risk calculations
- [ ] dfd-threats.json - Threat actor profiles referenced

---

## Section 6: Verification Checklist

**Before handing off to Phase 6, verify Phase 1 integration**:

- [ ] Loaded threat-actors.json from Phase 1
- [ ] Loaded business-impact.json from Phase 1
- [ ] Loaded data-classification.json from Phase 1
- [ ] STRIDE threats filtered by relevant threat actors (not all possible threats)
- [ ] Risk scores use actual business impact numbers (not generic "high/medium/low")
- [ ] Crown jewel weighting applied (+2 bonus)
- [ ] Compliance weighting applied (+1 bonus)
- [ ] threat-model.json includes business_context for ALL threats
- [ ] summary.md includes Business Context Foundation section
- [ ] Top threats reference actual financial data from Phase 1

**Error if Phase 1 files missing**: Cannot run Phase 5 without Phase 1 completion.

---

## Section 7: Example Comparison

### Without Phase 1 (Generic Threat Model)

```json
{
  "threat_id": "THR-001",
  "threat": "SQL injection in payment API",
  "impact": "High",
  "likelihood": "High",
  "risk": "High"
}
```

**Problem**: What does "High" mean to the business? Can't prioritize. Can't justify security budget.

### With Phase 1 (Business-Driven Threat Model)

```json
{
  "threat_id": "THR-001",
  "threat": "SQL injection in payment API",
  "business_context": {
    "targets_crown_jewel": true,
    "crown_jewel": "payment_card_data",
    "business_impact_financial": "$365M total breach cost",
    "business_impact_regulatory": "PCI-DSS violation, loss of payment processing",
    "relevant_threat_actor": "financially_motivated_cybercriminals",
    "phase_0_scenario": "data_breach_1M_card_records"
  },
  "business_impact_score": 4,
  "likelihood": 3,
  "final_priority_score": 15,
  "priority": "critical"
}
```

**Benefit**: Executive can see "$365M risk" and understand why this is critical. Security team can justify WAF budget with actual ROI.

---

## Related Files

- Main skill: `../SKILL.md`
- Phase 1 skill: `.claude/skill-library/security/business-context-discovery/SKILL.md`
- Output schemas: `output-schemas.md`
- PASTA methodology: `pasta-methodology.md`
- Risk scoring: `risk-scoring-guide.md`
