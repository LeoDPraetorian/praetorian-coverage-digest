# CVSS Version Comparison: 3.1 vs 4.0

**Detailed analysis of differences for threat modeling use cases.**

## Executive Summary

| Aspect | CVSS 3.1 | CVSS 4.0 | Recommendation |
|--------|----------|----------|----------------|
| **Adoption** | Industry standard since 2019 | Latest (2024), growing adoption | **3.1 for production** |
| **Calculation** | Clear mathematical formulas | MacroVector lookup + interpolation | **3.1 easier to implement** |
| **Temporal Metrics** | 3 metrics (E, RL, RC) | 1 metric (E only) | **4.0 simpler** |
| **Score Differentiation** | Smaller gap Base→Temporal | Larger gap Base→Threat | **4.0 better prioritization** |
| **Tool Support** | Wide (NVD, vendors) | Limited (newer) | **3.1 better tooling** |
| **Supplemental Metrics** | Not available | 6 optional metrics | **4.0 richer context** |

**For threat modeling**: Default to **CVSS 3.1** unless you need 4.0's better score differentiation or Supplemental metrics.

---

## Metric Group Changes

### Temporal → Threat Metrics

**CVSS 3.1 Temporal Metrics:**
```yaml
ExploitCodeMaturity (E):
  - X: Not Defined
  - H: High (functional, reliable exploit)
  - F: Functional (works sometimes)
  - P: Proof-of-Concept (theoretical exploit code)
  - U: Unproven (no exploit exists)

RemediationLevel (RL):
  - X: Not Defined
  - U: Unavailable (no fix exists)
  - W: Workaround (temporary mitigation)
  - T: Temporary Fix (patch available, not complete)
  - O: Official Fix (vendor patch available)

ReportConfidence (RC):
  - X: Not Defined
  - C: Confirmed (acknowledged by vendor)
  - R: Reasonable (multiple sources confirm)
  - U: Unknown (single unverified report)
```

**CVSS 4.0 Threat Metrics:**
```yaml
ExploitMaturity (E) - ONLY metric:
  - X: Not Defined
  - A: Attacked (active exploitation in wild)
  - P: Proof-of-Concept (exploit code exists)
  - U: Unreported (no exploitation evidence)
```

**Why the change?**
- **Remediation Level (RL) retired**: Organizations found it confusing—knowing a patch exists doesn't change the attack likelihood
- **Report Confidence (RC) retired**: Most vulnerabilities are "Confirmed" anyway, metric added little value
- **Simplification**: Single metric focuses on what matters: "Is this actively exploited?"
- **Better differentiation**: Simplified metric allows larger score gaps between Base and Threat

**Impact on scores:**

| Scenario | CVSS 3.1 Temporal | CVSS 4.0 Threat | Difference |
|----------|------------------|----------------|------------|
| Base Score 9.8 | 9.8 × 0.97 × 1.0 × 0.96 = **9.2** | Lookup: **8.1** | **1.1 point gap** (4.0 larger) |
| Known exploit | E:F/RL:U/RC:C = 0.97×1.0×1.0 | E:A = High threat | 4.0 clearer signal |
| No exploit | E:U/RL:U/RC:R = 0.91×1.0×0.96 | E:U = Unreported | Similar conservative |

---

## Calculation Method Changes

### CVSS 3.1: Mathematical Formulas

**Base Score Calculation:**

1. Calculate Impact Sub-Score (ISS):
   ```
   ISS = 1 - [(1-C) × (1-I) × (1-A)]
   ```

2. Calculate Impact:
   - If Scope Unchanged: `Impact = 6.42 × ISS`
   - If Scope Changed: `Impact = 7.52 × (ISS - 0.029) - 3.25 × (ISS - 0.02)^15`

3. Calculate Exploitability:
   ```
   Exploitability = 8.22 × AV × AC × PR × UI
   ```

4. Calculate Base Score:
   - If Impact ≤ 0: `BaseScore = 0`
   - If Scope Unchanged: `BaseScore = Roundup(min(Impact + Exploitability, 10))`
   - If Scope Changed: `BaseScore = Roundup(min(1.08 × (Impact + Exploitability), 10))`

**Temporal Score:**
```
TemporalScore = Roundup(BaseScore × E × RL × RC)
```

**Environmental Score:**
```
EnvironmentalScore = Roundup(Roundup(ModifiedBase) × E × RL × RC)
```

**Advantages:**
- ✅ Deterministic (same inputs = same outputs every time)
- ✅ Can implement in any language
- ✅ Easy to audit and verify
- ✅ No external dependencies

### CVSS 4.0: MacroVector Lookup

**MacroVector Approach:**

1. Group metrics into 6 Equivalence Sets (EQ1-EQ6):
   - **EQ1**: AV + PR + UI (attack ease)
   - **EQ2**: AC + AT (attack complexity + requirements)
   - **EQ3**: VC + VI + VA (vulnerable system impact)
   - **EQ4**: SC + SI + SA (subsequent system impact)
   - **EQ5**: E (exploit maturity)
   - **EQ6**: CR + IR + AR (security requirements)

2. Each EQ set maps to discrete level (0, 1, 2, etc.)

3. Lookup MacroVector score in `cvss_lookup.js` table

4. Interpolate within MacroVector for precise score

**Example MacroVector:** `000000` = Critical, `111111` = Low

**Advantages:**
- ✅ Better score differentiation (expert-derived)
- ✅ More nuanced severity clustering
- ✅ Reflects real-world threat analysis

**Disadvantages:**
- ❌ Requires lookup table (cannot calculate mathematically)
- ❌ Must use FIRST.org's JavaScript implementation
- ❌ Harder to audit (black-box lookup)
- ❌ Interpolation adds complexity

**For threat modeling tools:**
- **3.1**: Implement formulas directly
- **4.0**: Call FIRST.org calculator API or embed their JS

---

## New Metrics in 4.0

### Attack Requirements (AT)

**NEW metric not in 3.1.** Complements Attack Complexity.

```yaml
AttackRequirements:
  - N: None - Attack works under all/most conditions
  - P: Present - Requires race condition, network position, etc.
```

**When to use:**
- N: Standard SQL injection, XSS
- P: Race conditions, man-in-the-middle requiring network tap

**Example:** Time-of-check-time-of-use (TOCTOU) race condition = AT:P

### Supplemental Metrics (Optional, Don't Affect Score)

**Six new metrics for context** (not scored):

| Metric | Purpose | Values |
|--------|---------|--------|
| **Safety (S)** | Physical harm risk | Present, Negligible |
| **Automatable (AU)** | Can exploit be automated? | Yes, No |
| **Recovery (R)** | Can system recover? | Automatic, User, Irrecoverable |
| **Value Density (V)** | Resources per target? | Diffuse, Concentrated |
| **Vulnerability Response Effort (RE)** | Vendor response complexity? | Low, Moderate, High |
| **Provider Urgency (U)** | Vendor priority? | Clear, Green, Amber, Red |

**Use case:** Add context without inflating scores. Example:
```
CVSS:4.0/.../S:P/AU:Y/R:I
```
This signals "Safety risk + Automatable + Irrecoverable" for stakeholder awareness.

---

## Environmental Metrics Differences

### CVSS 3.1 Environmental

**Modified Base Metrics:** Can override any Base metric value

**Security Requirements:** CR, IR, AR (High/Medium/Low)

**Calculation:** Modified metrics recalculate Base, then apply Temporal modifiers

### CVSS 4.0 Environmental

**Modified Base Metrics:** Same override capability

**Security Requirements:** CR, IR, AR (High/Medium/Low) - **SAME as 3.1**

**NEW: Safety (S) Override** - Can override Modified Subsequent System metrics with Safety values

**Calculation:** MacroVector approach includes Environmental in EQ6

**Key difference:** 4.0 allows expressing Safety impact in Environmental scoring

---

## Score Range Differences

### CVSS 3.1 Severity Ratings

| Score | Severity |
|-------|----------|
| 0.0 | None |
| 0.1 - 3.9 | Low |
| 4.0 - 6.9 | Medium |
| 7.0 - 8.9 | High |
| 9.0 - 10.0 | Critical |

### CVSS 4.0 Severity Ratings

**SAME ranges as 3.1** - no change in thresholds

---

## Migration Guidance

### Migrating 3.1 → 4.0

**Straightforward mappings:**

| CVSS 3.1 | CVSS 4.0 | Notes |
|----------|----------|-------|
| AV, AC, PR, UI | AV, AC, PR, UI | Same values |
| C, I, A | VC, VI, VA | Renamed (Vulnerable system) |
| S:C impacts | SC, SI, SA | Split into separate metrics |
| E | E | Simplified (only A, P, U) |
| CR, IR, AR | CR, IR, AR | Same |

**Retired metrics (no equivalent):**
- RL (Remediation Level) → Not in 4.0
- RC (Report Confidence) → Not in 4.0

**New metrics (assess manually):**
- AT (Attack Requirements) → Assess for race conditions
- Supplemental metrics → Optional context

### Converting Existing Scores

**You cannot mathematically convert 3.1 → 4.0 scores.**

Why: Different calculation methods (formula vs MacroVector).

**Best practice:**
1. Re-assess vulnerability with 4.0 metrics
2. Use 4.0 calculator (FIRST.org or NVD)
3. Document both scores during transition period

---

## Recommendation Matrix

| Use Case | Recommended Version | Reason |
|----------|---------------------|--------|
| **New threat modeling tool** | CVSS 3.1 | Easier implementation, formula-based |
| **Organization with 4.0 mandate** | CVSS 4.0 | Compliance requirement |
| **Better prioritization needed** | CVSS 4.0 | Larger score gaps help differentiation |
| **Need Supplemental metrics** | CVSS 4.0 | Safety, Automatable context |
| **Integration with NVD** | CVSS 3.1 | NVD doesn't provide Temporal/Threat yet |
| **Minimal tool dependencies** | CVSS 3.1 | No lookup table needed |
| **Academic/research** | Both | Compare methodologies |

---

## References

- [CVSS v3.1 Specification](https://www.first.org/cvss/v3-1/specification-document)
- [CVSS v4.0 Specification](https://www.first.org/cvss/specification-document)
- [NVD Calculator v3.1](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator)
- [NVD Calculator v4.0](https://nvd.nist.gov/vuln-metrics/cvss/v4-calculator)
- [Qualys: CVSS v4 Changes](https://blog.qualys.com/product-tech/2023/11/02/cvss-v4-is-now-live-and-what-do-you-need-to-know)
- [Orange Cyberdefense: Transition Impact](https://www.orangecyberdefense.com/global/blog/cert-news/impact-of-the-transition-from-the-cvssv3-to-cvssv4-norm)
