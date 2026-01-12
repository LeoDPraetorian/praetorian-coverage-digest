# Prioritization Algorithm

**Research-backed methodology for ranking vulnerabilities by threat severity, attribution confidence, and detection coverage.**

**Research Source**: Based on industry best practices combining CVSS + EPSS + KEV multi-factor approaches (2026 research findings).

---

## Multi-Factor Scoring Framework

### Combined Approach (CVSS + EPSS + KEV + Attribution)

**Industry Benchmark** (from 2026 research):
- **CVSS**: Theoretical severity based on technical characteristics
- **EPSS**: Exploitation probability (next 30 days, machine learning prediction)
- **KEV**: Confirmed exploitation evidence (real-world)

**This Skill's Enhancement**:
- **Attribution Confidence**: Nation-state > Ransomware > Opportunistic
- **Detection Coverage**: Gap > Partial > Covered (drives capability development)

### Combined Effectiveness

**Research Finding**: Multi-factor approach achieves **~95% workload reduction** while maintaining comprehensive coverage:
- **From**: 16,182 vulnerabilities requiring immediate attention
- **To**: ~850 high-priority vulnerabilities
- **Result**: Focused resources without compromising security

---

## Scoring Weights

| Factor | Weight | Rationale |
|--------|--------|-----------|
| **Threat Actor Attribution** | 35% | Nation-state actors are persistent/sophisticated; ransomware groups financially motivated and widespread |
| **Federal Deadline Proximity** | 30% | CISA binding operational directives for federal agencies; industry follows suit |
| **CVSS Severity** | 20% | Theoretical severity still matters for impact assessment |
| **Detection Coverage** | 15% | Gaps alert customers to blind spots, drive capability development |

**Total**: 100%

---

## Factor 1: Threat Actor Attribution (35%)

### Scoring Table

| Attribution | Confidence | Score | Rationale |
|-------------|-----------|-------|-----------|
| **Nation-state** | HIGH | 10 | Persistent, sophisticated, targeted |
| **Ransomware** | HIGH | 8 | Financially motivated, widespread, high business impact |
| **Nation-state** | MEDIUM | 6 | Likely accurate but unconfirmed |
| **Opportunistic** | N/A | 3 | Mass exploitation, lower sophistication |
| **Unknown** | N/A | 1 | Exploitation confirmed (in KEV) but no actor identified |

### Confidence Multipliers

**Attribution confidence affects final score:**

```python
if confidence == "HIGH":
    multiplier = 1.0  # Full weight
elif confidence == "MEDIUM":
    multiplier = 0.7  # 70% weight
elif confidence == "LOW":
    multiplier = 0.3  # 30% weight
else:  # UNKNOWN
    multiplier = 0.1  # Minimal weight
```

**Example**:
- Nation-state + HIGH confidence: 10 × 1.0 = 10 points
- Nation-state + MEDIUM confidence: 10 × 0.7 = 7 points
- Ransomware + HIGH confidence: 8 × 1.0 = 8 points

### Multi-Actor Scenarios

When multiple threat actors exploit the same CVE:

**Primary actor determines base score:**
- Use highest-priority actor (nation-state > ransomware > opportunistic)
- Add +1 bonus for multi-actor convergence

**Example**:
- APT28 (nation-state, HIGH) + LockBit (ransomware, HIGH)
- Base score: 10 (nation-state)
- Convergence bonus: +1
- **Final: 11 points** (capped at 10 for calculation)

**Rationale**: Multiple groups leveraging same vulnerability indicates high value/ease of exploitation.

---

## Factor 2: Federal Deadline Proximity (30%)

### CISA Binding Operational Directives

**Federal agencies must remediate KEV vulnerabilities within specified timeframes:**

| Timeline | Typical Assignment | Priority Level |
|----------|-------------------|----------------|
| **2 weeks** | Critical infrastructure, active campaigns | Emergency |
| **3 weeks** | High severity with exploitation evidence | Urgent |
| **6 weeks** | Standard KEV timeline | High |
| **12+ weeks** | Older KEV additions, complex mitigations | Medium |

### Scoring Formula

```python
days_until_due = (due_date - current_date).days

if days_until_due <= 0:
    score = 10  # Past due - CRITICAL
elif days_until_due <= 7:
    score = 10  # 1 week - Emergency
elif days_until_due <= 14:
    score = 9   # 2 weeks - Urgent
elif days_until_due <= 30:
    score = 7   # 1 month - High priority
elif days_until_due <= 60:
    score = 5   # 2 months - Moderate
elif days_until_due <= 90:
    score = 3   # 3 months - Standard
else:
    score = 1   # 90+ days - Low urgency
```

**KEV Addition Date Alternative**:
If federal deadline not available (non-government customers), use "days since KEV addition":

```python
days_since_added = (current_date - kev_date_added).days

if days_since_added <= 7:
    score = 10  # Very recent - active campaign likely
elif days_since_added <= 30:
    score = 7   # Recent - still high priority
elif days_since_added <= 90:
    score = 4   # Moderate priority
else:
    score = 2   # Older KEV - still important but less urgent
```

---

## Factor 3: CVSS Severity (20%)

### CVSS v3.x Score Mapping

| CVSS Score | Severity | Points | Notes |
|------------|----------|--------|-------|
| **9.0-10.0** | Critical | 10 | Maximum impact |
| **7.0-8.9** | High | 7 | Serious risk |
| **4.0-6.9** | Medium | 4 | Moderate risk |
| **0.1-3.9** | Low | 1 | Minimal risk |

**Rationale**: CVSS provides theoretical severity baseline, but exploitation evidence (KEV) and attribution matter more.

### When CVSS is Unavailable

Some KEV entries may lack published CVSS scores:

```python
if cvss_score is None:
    # Use KEV inclusion as proxy for severity
    score = 7  # Assume "High" - exploitation confirmed
```

---

## Factor 4: Detection Coverage (15%)

### Coverage Status Scoring

| Detection Status | Score | Rationale |
|-----------------|-------|-----------|
| **GAP** | 10 | No nuclei template - **alerts customer to blind spot** |
| **Partial** | 5 | Template exists but limited scope - needs review |
| **Covered** | 1 | Template exists and verified - actively monitored |

**Key Insight**: Higher score for gaps because:
1. **Customer Transparency**: Alerts to vulnerabilities Chariot cannot detect
2. **Capability Development**: Drives prioritization of template creation
3. **Risk Communication**: Honest about detection limitations

### Why Gaps Score Higher

Traditional prioritization penalizes "not covered" assets. This framework **rewards transparency**:

- **GAP + Nation-state threat = CRITICAL** → Customer knows they're exposed
- **Covered + Opportunistic = MEDIUM** → Customer knows Chariot is monitoring

**Business Value**: Builds customer trust by acknowledging blind spots and providing roadmap for coverage improvement.

---

## Combined Scoring Calculation

### Formula

```python
attribution_score = attribution_points * confidence_multiplier * 0.35
deadline_score = deadline_points * 0.30
cvss_score = cvss_points * 0.20
detection_score = detection_points * 0.15

final_score = attribution_score + deadline_score + cvss_score + detection_score
```

### Example Calculation

**CVE-2025-55182:**
- **Attribution**: APT28 (nation-state, HIGH confidence) = 10 × 1.0 = 10 points
- **Deadline**: 14 days until due = 9 points
- **CVSS**: 9.8 (Critical) = 10 points
- **Detection**: GAP (no template) = 10 points

```
Attribution: 10 × 0.35 = 3.50
Deadline:     9 × 0.30 = 2.70
CVSS:        10 × 0.20 = 2.00
Detection:   10 × 0.15 = 1.50
-----------------------------------
Final Score:           9.70
```

**Result**: Priority 1 (CRITICAL)

---

## Priority Tier Assignment

### Tier Thresholds

| Priority Tier | Score Range | Customer Action |
|--------------|-------------|-----------------|
| **CRITICAL** | 9.0-10.0 | Immediate patching (24-48 hours) |
| **HIGH** | 7.0-8.9 | Urgent patching (1 week) |
| **MEDIUM** | 5.0-6.9 | Standard patching (2-4 weeks) |
| **LOW** | 0.0-4.9 | Planned patching (next cycle) |

### Tie-Breaking Rules

When multiple CVEs have similar scores:

1. **Nation-state attribution** > Ransomware > Opportunistic
2. **Closer federal deadline** > further deadline
3. **Detection GAP** > Partial > Covered
4. **Higher CVSS** > lower CVSS

---

## Research-Backed Adjustments

### EPSS Integration (Future Enhancement)

**Current**: This skill uses KEV (confirmed exploitation) + attribution
**Future**: Add EPSS (Exploit Prediction Scoring System) for non-KEV vulnerabilities

**EPSS provides**:
- Machine learning probability of exploitation (next 30 days)
- Complement to KEV: "Will this be exploited?" vs "Has this been exploited?"
- **Industry finding**: EPSS + KEV reduces workload by 95%

**Implementation**:
```python
# For non-KEV vulnerabilities
if not in_kev_catalog:
    if epss_score >= 0.70:  # 70%+ exploitation probability
        baseline_priority = "HIGH"
    elif epss_score >= 0.30:
        baseline_priority = "MEDIUM"
```

### Attack Surface Considerations

**Environmental Factors** (not currently weighted but could be):
- **Internet-facing** assets: +1 priority bump
- **Crown jewel systems** (customer-defined): +2 priority bump
- **Already compromised** in past incidents: +1 priority bump

---

## Output Format

### Priority Matrix

```markdown
| Priority | CVE | Score | Attribution | Confidence | Deadline | CVSS | Detection |
|----------|-----|-------|-------------|-----------|----------|------|-----------|
| CRITICAL | CVE-2025-55182 | 9.70 | APT28 (Russia) | HIGH | 14 days | 9.8 | **GAP** |
| HIGH | CVE-2024-12345 | 8.20 | LockBit 3.0 | HIGH | 21 days | 8.5 | COVERED |
| HIGH | CVE-2024-23456 | 7.65 | Opportunistic | N/A | 30 days | 9.1 | COVERED |
| MEDIUM | CVE-2024-34567 | 6.40 | APT41 (China) | MEDIUM | 45 days | 7.2 | Partial |
| MEDIUM | CVE-2024-45678 | 5.80 | Unknown | LOW | 60 days | 8.0 | COVERED |
```

### Ranking Explanation

For each CVE, document scoring breakdown:

```markdown
### Priority 1: CVE-2025-55182 (Score: 9.70)

**Scoring Breakdown:**
- Attribution: APT28 (nation-state, HIGH confidence) → 3.50 points (35% × 10)
- Deadline: 14 days until due → 2.70 points (30% × 9)
- CVSS: 9.8 (Critical) → 2.00 points (20% × 10)
- Detection: GAP (no nuclei template) → 1.50 points (15% × 10)

**Why Priority 1:**
- Nation-state actor with HIGH confidence attribution
- Approaching federal deadline (2 weeks)
- Critical CVSS score
- Detection gap represents immediate risk to customers
```

---

## Common Scenarios

### Scenario 1: High CVSS, No Attribution

**CVE-2024-XXXXX:**
- CVSS: 9.5 (Critical)
- Attribution: Unknown
- Deadline: 30 days
- Detection: Covered

**Score**: 5.55 (MEDIUM priority)
**Rationale**: High technical severity but no confirmed threat actor, good detection coverage

### Scenario 2: Nation-State, Low CVSS

**CVE-2024-YYYYY:**
- CVSS: 6.1 (Medium)
- Attribution: APT29 (HIGH confidence)
- Deadline: 14 days
- Detection: GAP

**Score**: 7.50 (HIGH priority)
**Rationale**: Sophisticated actor targets specific vulnerability despite moderate CVSS

### Scenario 3: Old KEV, Still Relevant

**CVE-2023-ZZZZZ:**
- CVSS: 8.8 (High)
- Attribution: Ransomware (HIGH)
- Deadline: 120 days ago (past due)
- Detection: Covered

**Score**: 8.30 (HIGH priority)
**Rationale**: Past due federal deadline still relevant, ransomware threat persists

---

## Related References

- [Attribution Research Methodology](attribution-research-methodology.md) - How to gather attribution data that feeds this algorithm
- [Report Format Specifications](report-format-specifications.md) - How to present prioritization results
- [Detection Coverage Analysis](detection-coverage-analysis.md) - How detection status is determined
