# Business Impact Assessment

**Framework for quantifying consequences of security breaches using FAIR (Factor Analysis of Information Risk) principles.**

## Impact Categories

Business impact assessment evaluates consequences across multiple dimensions:

###

1.  Financial Impact

### 2. Operational Impact

### 3. Reputational Impact

### 4. Regulatory/Legal Impact

### 5. Strategic Impact

---

## 1. Financial Impact

### Direct Costs

**Incident Response Costs**:

- Forensics investigation: $50K-$500K
- Remediation work: $100K-$1M
- Legal counsel: $50K-$500K
- Public relations/crisis management: $50K-$250K
- Credit monitoring for affected individuals: $10-$20 per person
- Identity theft protection: $100-$200 per person per year

**Regulatory Fines**:

- **GDPR**: Up to €20M or 4% annual global revenue (whichever is higher)
- **CCPA**: Up to $7,500 per intentional violation
- **HIPAA**: $100-$50K per violation, up to $1.5M per year per violation category
- **PCI-DSS**: $5K-$100K per month until compliant + potential loss of card acceptance

**Business Disruption**:

- Revenue loss during downtime: `(Annual Revenue / 8760 hours) × Downtime Hours`
- Example: $100M revenue = $11,415/hour downtime cost

**Data Breach Costs** (IBM 2024 Cost of Data Breach Report):

- Global average: $4.45M per breach
- US average: $9.48M per breach
- Healthcare average: $10.93M per breach
- Cost per record: $165 average

### Indirect Costs

**Customer Churn**:

- Lost customers: Estimated 3-7% churn post-breach
- Lifetime value impact: `Lost Customers × Average LTV`
- Acquisition cost to replace: `Lost Customers × CAC`

**Stock Price Impact**:

- Average decline: 5-7% following major breach announcement
- Market cap impact for public companies

**Insurance Premium Increases**:

- Cyber insurance premiums can increase 20-50% post-breach

**Loss of Business Opportunities**:

- Failed sales due to security concerns
- Lost partnerships/contracts
- Delayed market entry

---

## 2. Operational Impact

### Downtime Costs

**Revenue Loss**:

```
Hourly Revenue Loss = Annual Revenue / 8760 hours
Daily Revenue Loss = Hourly Loss × 24
```

**Productivity Loss**:

- Employee hours lost: `Affected Employees × Hours Down × Hourly Rate`
- Example: 1000 employees, 8-hour outage, $50/hour = $400K

**Recovery Costs**:

- System restoration
- Data recovery
- Overtime costs for incident response
- Third-party vendor fees

### SLA Violations

**Customer SLA Penalties**:

- Calculate based on contract terms
- May include service credits, refunds, termination rights

**Recovery Time Objectives (RTO)**:
| System Criticality | Target RTO | Downtime Cost Impact |
|--------------------|------------|----------------------|
| Critical (Tier 1) | < 1 hour | Extreme |
| Important (Tier 2) | < 4 hours | High |
| Standard (Tier 3) | < 24 hours | Medium |
| Low Priority (Tier 4) | < 1 week | Low |

**Recovery Point Objectives (RPO)**:

- Data loss tolerance
- Backup frequency requirements

---

## 3. Reputational Impact

### Brand Damage

**Customer Trust Erosion**:

- Quantify via customer surveys (NPS score changes)
- Social media sentiment analysis
- News coverage volume and sentiment

**Market Position**:

- Industry ranking changes
- Competitive disadvantage
- "Least secure" perception

### Long-Term Effects

**Customer Acquisition Costs**:

- Increased CAC due to trust deficit
- Higher marketing spend to rebuild brand
- Premium for "security-first" positioning

**Employee Recruitment**:

- Difficulty hiring top talent
- Higher compensation required
- Increased turnover

**Partnership Impact**:

- Lost strategic partnerships
- Vendor relationship strain
- Reduced negotiating power

---

## 4. Regulatory/Legal Impact

### Breach Notification Requirements

**GDPR (EU)**:

- Notify supervisory authority within 72 hours
- Notify affected individuals "without undue delay" if high risk
- Potential fines: Up to €20M or 4% annual global revenue

**CCPA (California)**:

- No specific notification timeline (follows CA Civil Code 1798.82)
- Private right of action: $100-$750 per consumer per incident
- AG enforcement: Up to $7,500 per intentional violation

**HIPAA (US)**:

- Notify HHS within 60 days
- Notify individuals within 60 days
- Media notification if >500 individuals affected
- Fines: $100-$50K per violation

**State Laws (US)**:

- All 50 states have breach notification laws
- Timelines range from "immediately" to 90 days
- Vary in definition of personal information

### Litigation Risk

**Class Action Lawsuits**:

- Average settlement: $6M-$20M for major breaches
- Legal defense costs: $5M-$15M
- Duration: 2-5 years typically

**Shareholder Lawsuits**:

- Derivative actions for breach of fiduciary duty
- Securities fraud claims for inadequate disclosure

**Contractual Liability**:

- Customer contract penalties
- Partner indemnification claims
- Insurance claim denials

---

## 5. Strategic Impact

### Competitive Disadvantage

**Market Share Loss**:

- Competitors gain during recovery period
- Long-term market position degradation

**Innovation Delay**:

- Resources diverted to remediation
- Security overhead slows feature development
- Delayed product launches

### M&A Impact

**Valuation Reduction**:

- 5-15% reduction in acquisition price
- Deal delays or cancellations
- Enhanced due diligence costs

**Investment Impact**:

- Difficulty raising capital
- Reduced valuation in funding rounds
- Investor confidence loss

---

## Impact Scoring Framework

### Quantitative Scale (1-5)

| Score            | Financial  | Operational      | Reputational      | Regulatory     |
| ---------------- | ---------- | ---------------- | ----------------- | -------------- |
| **1 (Minimal)**  | <$50K      | <1 hour downtime | No media coverage | No penalties   |
| **2 (Minor)**    | $50K-$500K | 1-4 hours        | Local news        | Warning letter |
| **3 (Moderate)** | $500K-$5M  | 4-24 hours       | Regional coverage | <$100K fine    |
| **4 (Major)**    | $5M-$50M   | 1-7 days         | National coverage | $100K-$1M fine |
| **5 (Severe)**   | >$50M      | >7 days          | International     | >$1M fine      |

### Qualitative Assessment

For each impact category, describe:

- **Immediate consequences** (first 48 hours)
- **Short-term impact** (1-3 months)
- **Long-term impact** (3-12+ months)

---

## Industry-Specific Impact Considerations

### Financial Services

**Unique Impacts**:

- Regulatory scrutiny from multiple agencies (OCC, FDIC, Fed)
- Immediate liquidity concerns
- Payment system disruption
- Interbank trust issues

**Quantification**:

- Wire transfer fraud losses
- ATM network downtime costs
- Trading platform outage impact

### Healthcare

**Unique Impacts**:

- Patient safety risks
- Medical device availability
- Clinical workflow disruption
- HIPAA breach notification to HHS/media

**Quantification**:

- Patient care delays (potential harm)
- Elective procedure cancellations
- Ambulance diversions during EHR downtime

### E-Commerce

**Unique Impacts**:

- Shopping cart abandonment
- Payment processing failure
- Holiday season vulnerability
- Competitor price advantage during downtime

**Quantification**:

- Lost sales per hour: `Average Orders/Hour × Average Order Value`
- Return customer rate impact

### SaaS

**Unique Impacts**:

- Multi-tenant breach (all customers affected)
- API availability for integrations
- Webhook delivery failures
- Customer data segregation questions

**Quantification**:

- Churn rate increase
- SLA credit obligations
- Platform trust erosion

---

## Impact Assessment Worksheet

### Step 1: Identify Breach Scenarios

Common scenarios to assess:

1. **Data breach** (exfiltration of PII/PHI/payment data)
2. **Ransomware** (encryption, data theft, double extortion)
3. **DDoS** (service unavailability)
4. **Data integrity attack** (tampering, corruption)
5. **Supply chain compromise** (third-party breach affects you)

### Step 2: Quantify Impacts per Scenario

For each scenario:

```json
{
  "scenario": "Customer database breach (1M records)",
  "financial_impact": {
    "incident_response": "$500K",
    "notification_costs": "$1M (1M × $1/notification)",
    "credit_monitoring": "$20M (1M × $20/person for 2 years)",
    "regulatory_fines": "$4M (GDPR estimate)",
    "total": "$25.5M"
  },
  "operational_impact": {
    "downtime_hours": 48,
    "revenue_loss": "$1M",
    "productivity_loss": "$200K"
  },
  "reputational_impact": {
    "customer_churn": "5% (50K customers)",
    "ltv_loss": "$10M (50K × $200 LTV)",
    "brand_damage": "Severe - national media coverage"
  },
  "regulatory_impact": {
    "breach_notifications": "GDPR (72 hour), CCPA, state laws",
    "investigations": "Likely AG investigation",
    "litigation_risk": "High - class action probable"
  },
  "total_estimated_impact": "$36.7M+ (not including litigation)"
}
```

### Step 3: Prioritize by Likelihood × Impact

```
Risk Score = Likelihood (1-5) × Impact (1-5)

Critical Risk (16-25): Immediate action required
High Risk (9-15): Address in current quarter
Medium Risk (4-8): Plan remediation
Low Risk (1-3): Accept or monitor
```

---

## Output Format

Use this structure for `business-impact.json`:

```json
{
  "assessment_date": "2025-12-18",
  "scenarios": [
    {
      "id": "SCENARIO-001",
      "name": "Customer database breach",
      "description": "Unauthorized access to customer PII (1M records)",
      "likelihood": "medium",
      "impact_categories": {
        "financial": {
          "score": 5,
          "immediate_costs": "$2M",
          "total_estimated_costs": "$25.5M",
          "breakdown": {
            "incident_response": "$500K",
            "notification": "$1M",
            "credit_monitoring": "$20M",
            "regulatory_fines": "$4M"
          }
        },
        "operational": {
          "score": 3,
          "downtime_hours": 48,
          "revenue_loss": "$1M",
          "recovery_time": "2 weeks"
        },
        "reputational": {
          "score": 4,
          "customer_churn_percent": 5,
          "media_coverage": "national",
          "long_term_brand_impact": "severe"
        },
        "regulatory": {
          "score": 5,
          "applicable_laws": ["GDPR", "CCPA", "state_laws"],
          "notification_requirements": "72 hours (GDPR)",
          "estimated_fines": "$4M",
          "litigation_risk": "high"
        }
      },
      "total_risk_score": 17,
      "risk_level": "critical"
    }
  ],
  "rto_rpo": {
    "tier1_systems": {
      "rto": "1 hour",
      "rpo": "15 minutes",
      "downtime_cost_per_hour": "$50K"
    }
  },
  "risk_appetite": "low",
  "insurance_coverage": {
    "cyber_insurance": true,
    "limit": "$10M",
    "deductible": "$250K"
  }
}
```

## References

- **IBM Cost of Data Breach Report 2024**
- **Ponemon Institute Studies**
- **FAIR (Factor Analysis of Information Risk)**
- **NIST Cybersecurity Framework**
