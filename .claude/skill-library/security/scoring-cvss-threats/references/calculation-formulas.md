# CVSS 3.1 Calculation Formulas

**Complete mathematical formulas from FIRST.org CVSS v3.1 Specification Document.**

## Metric Value Mappings

### Exploitability Metrics

**Attack Vector (AV) / Modified Attack Vector (MAV):**
| Value | Numeric Weight |
|-------|----------------|
| Network (N) | 0.85 |
| Adjacent (A) | 0.62 |
| Local (L) | 0.55 |
| Physical (P) | 0.20 |

**Attack Complexity (AC) / Modified Attack Complexity (MAC):**
| Value | Numeric Weight |
|-------|----------------|
| Low (L) | 0.77 |
| High (H) | 0.44 |

**Privileges Required (PR) / Modified Privileges Required (MPR):**
| Value | Scope Unchanged | Scope Changed |
|-------|----------------|---------------|
| None (N) | 0.85 | 0.85 |
| Low (L) | 0.62 | 0.68 |
| High (H) | 0.27 | 0.50 |

**Note:** PR value depends on Scope metric!

**User Interaction (UI) / Modified User Interaction (MUI):**
| Value | Numeric Weight |
|-------|----------------|
| None (N) | 0.85 |
| Required (R) | 0.62 |

### Impact Metrics

**Confidentiality/Integrity/Availability (C/I/A) and Modified (MC/MI/MA):**
| Value | Numeric Weight |
|-------|----------------|
| High (H) | 0.56 |
| Low (L) | 0.22 |
| None (N) | 0.00 |

### Temporal Metrics

**Exploit Code Maturity (E):**
| Value | Numeric Weight |
|-------|----------------|
| Not Defined (X) | 1.00 |
| High (H) | 1.00 |
| Functional (F) | 0.97 |
| Proof-of-Concept (P) | 0.94 |
| Unproven (U) | 0.91 |

**Remediation Level (RL):**
| Value | Numeric Weight |
|-------|----------------|
| Not Defined (X) | 1.00 |
| Unavailable (U) | 1.00 |
| Workaround (W) | 0.97 |
| Temporary Fix (T) | 0.96 |
| Official Fix (O) | 0.95 |

**Report Confidence (RC):**
| Value | Numeric Weight |
|-------|----------------|
| Not Defined (X) | 1.00 |
| Confirmed (C) | 1.00 |
| Reasonable (R) | 0.96 |
| Unknown (U) | 0.92 |

### Environmental Metrics

**Security Requirements (CR/IR/AR):**
| Value | Numeric Weight |
|-------|----------------|
| High (H) | 1.50 |
| Medium (M) | 1.00 |
| Low (L) | 0.50 |
| Not Defined (X) | 1.00 |

---

## Base Score Calculation

### Step 1: Calculate Impact Sub-Score (ISS)

```
ISS = 1 - [(1 - Confidentiality) × (1 - Integrity) × (1 - Availability)]
```

**Example:**
```
C = High (0.56)
I = High (0.56)
A = Low (0.22)

ISS = 1 - [(1 - 0.56) × (1 - 0.56) × (1 - 0.22)]
    = 1 - [0.44 × 0.44 × 0.78]
    = 1 - 0.151
    = 0.849
```

### Step 2: Calculate Impact

**If Scope is Unchanged:**
```
Impact = 6.42 × ISS
```

**If Scope is Changed:**
```
Impact = 7.52 × (ISS - 0.029) - 3.25 × (ISS - 0.02)^15
```

**Example (Scope Unchanged):**
```
ISS = 0.849
Impact = 6.42 × 0.849 = 5.45
```

**Example (Scope Changed):**
```
ISS = 0.849
Impact = 7.52 × (0.849 - 0.029) - 3.25 × (0.849 - 0.02)^15
      = 7.52 × 0.820 - 3.25 × (0.829)^15
      = 6.17 - 3.25 × 0.0364
      = 6.17 - 0.12
      = 6.05
```

### Step 3: Calculate Exploitability

```
Exploitability = 8.22 × AttackVector × AttackComplexity × PrivilegesRequired × UserInteraction
```

**Example:**
```
AV = Network (0.85)
AC = Low (0.77)
PR = None (0.85)
UI = None (0.85)

Exploitability = 8.22 × 0.85 × 0.77 × 0.85 × 0.85
               = 3.89
```

### Step 4: Calculate Base Score

**If Impact ≤ 0:**
```
BaseScore = 0
```

**If Scope is Unchanged:**
```
BaseScore = Roundup(min(Impact + Exploitability, 10))
```

**If Scope is Changed:**
```
BaseScore = Roundup(min(1.08 × (Impact + Exploitability), 10))
```

**Roundup function:** Returns the smallest number, to 1 decimal place, that is equal to or higher than its input.

**Example (Scope Unchanged):**
```
Impact = 5.45
Exploitability = 3.89

BaseScore = Roundup(min(5.45 + 3.89, 10))
          = Roundup(9.34)
          = 9.4
```

**Example (Scope Changed):**
```
Impact = 6.05
Exploitability = 3.89

BaseScore = Roundup(min(1.08 × (6.05 + 3.89), 10))
          = Roundup(min(10.74, 10))
          = Roundup(10.0)
          = 10.0
```

---

## Temporal Score Calculation

### Formula

```
TemporalScore = Roundup(BaseScore × ExploitCodeMaturity × RemediationLevel × ReportConfidence)
```

**Example:**
```
BaseScore = 9.4
E = Unproven (0.91)
RL = Unavailable (1.00)
RC = Reasonable (0.96)

TemporalScore = Roundup(9.4 × 0.91 × 1.00 × 0.96)
              = Roundup(8.21)
              = 8.3
```

**Effect of each metric:**
- E:U = 9% reduction
- E:P = 6% reduction
- E:F = 3% reduction
- E:H/X = 0% reduction (no change)

- RL:O = 5% reduction
- RL:T = 4% reduction
- RL:W = 3% reduction
- RL:U/X = 0% reduction

- RC:U = 8% reduction
- RC:R = 4% reduction
- RC:C/X = 0% reduction

**Maximum Temporal reduction:** E:U × RL:O × RC:U = 0.91 × 0.95 × 0.92 = 0.795 (20.5% reduction)

---

## Environmental Score Calculation

### Step 1: Calculate Modified Impact Sub-Score (MISS)

```
MISS = min(
  1 - [(1 - ConfidentialityRequirement × ModifiedConfidentiality) ×
       (1 - IntegrityRequirement × ModifiedIntegrity) ×
       (1 - AvailabilityRequirement × ModifiedAvailability)],
  0.915
)
```

**Note:** MISS is capped at 0.915 to prevent scores exceeding 10.0

**Example:**
```
CR = High (1.5)
IR = High (1.5)
AR = Medium (1.0)
MC = High (0.56)
MI = High (0.56)
MA = Low (0.22)

MISS = min(
  1 - [(1 - 1.5×0.56) × (1 - 1.5×0.56) × (1 - 1.0×0.22)],
  0.915
)
     = min(1 - [(1 - 0.84) × (1 - 0.84) × (1 - 0.22)], 0.915)
     = min(1 - [0.16 × 0.16 × 0.78], 0.915)
     = min(1 - 0.020, 0.915)
     = min(0.980, 0.915)
     = 0.915  // Capped
```

### Step 2: Calculate Modified Impact

**If Modified Scope is Unchanged:**
```
ModifiedImpact = 6.42 × MISS
```

**If Modified Scope is Changed:**
```
ModifiedImpact = 7.52 × (MISS - 0.029) - 3.25 × (MISS × 0.9731 - 0.02)^13
```

**Example (Scope Unchanged):**
```
MISS = 0.915
ModifiedImpact = 6.42 × 0.915 = 5.87
```

### Step 3: Calculate Modified Exploitability

```
ModifiedExploitability = 8.22 × ModifiedAttackVector × ModifiedAttackComplexity ×
                         ModifiedPrivilegesRequired × ModifiedUserInteraction
```

**Example:**
```
MAV = Network (0.85)
MAC = Low (0.77)
MPR = None (0.85)
MUI = None (0.85)

ModifiedExploitability = 8.22 × 0.85 × 0.77 × 0.85 × 0.85 = 3.89
```

### Step 4: Calculate Modified Base Score

**If ModifiedImpact ≤ 0:**
```
ModifiedBaseScore = 0
```

**If Modified Scope is Unchanged:**
```
ModifiedBaseScore = Roundup(min(ModifiedImpact + ModifiedExploitability, 10))
```

**If Modified Scope is Changed:**
```
ModifiedBaseScore = Roundup(min(1.08 × (ModifiedImpact + ModifiedExploitability), 10))
```

**Example (Scope Unchanged):**
```
ModifiedImpact = 5.87
ModifiedExploitability = 3.89

ModifiedBaseScore = Roundup(min(5.87 + 3.89, 10))
                  = Roundup(9.76)
                  = 9.8
```

### Step 5: Calculate Environmental Score

```
EnvironmentalScore = Roundup(
  ModifiedBaseScore × ExploitCodeMaturity × RemediationLevel × ReportConfidence
)
```

**Example:**
```
ModifiedBaseScore = 9.8
E = Unproven (0.91)
RL = Unavailable (1.00)
RC = Reasonable (0.96)

EnvironmentalScore = Roundup(9.8 × 0.91 × 1.00 × 0.96)
                   = Roundup(8.56)
                   = 8.6
```

---

## Complete Calculation Example

**Threat:** SQL Injection in payment processing API (crown jewel, PCI-DSS)

### Base Metrics
```yaml
AV: Network (0.85)
AC: Low (0.77)
PR: None (0.85)
UI: None (0.85)
S: Unchanged
C: High (0.56)
I: High (0.56)
A: Low (0.22)
```

### Base Score Calculation
```
ISS = 1 - [(1-0.56) × (1-0.56) × (1-0.22)]
    = 1 - [0.44 × 0.44 × 0.78]
    = 1 - 0.151
    = 0.849

Impact = 6.42 × 0.849 = 5.45

Exploitability = 8.22 × 0.85 × 0.77 × 0.85 × 0.85 = 3.89

BaseScore = Roundup(5.45 + 3.89) = Roundup(9.34) = 9.4
```

### Temporal Metrics
```yaml
E: Unproven (0.91)
RL: Unavailable (1.00)
RC: Reasonable (0.96)
```

### Temporal Score Calculation
```
TemporalScore = Roundup(9.4 × 0.91 × 1.00 × 0.96)
              = Roundup(8.21)
              = 8.3
```

### Environmental Metrics (from Phase 1)
```yaml
CR: High (1.5) - PCI-DSS requirement
IR: High (1.5) - PCI-DSS requirement
AR: Medium (1.0) - Not availability-critical

Modified Base Metrics: (same as Base)
MAV: N, MAC: L, MPR: N, MUI: N, MS: U, MC: H, MI: H, MA: L
```

### Environmental Score Calculation
```
MISS = min(1 - [(1 - 1.5×0.56) × (1 - 1.5×0.56) × (1 - 1.0×0.22)], 0.915)
     = min(1 - [(1 - 0.84) × (1 - 0.84) × (1 - 0.22)], 0.915)
     = min(1 - [0.16 × 0.16 × 0.78], 0.915)
     = min(0.980, 0.915)
     = 0.915  // Capped at max

ModifiedImpact = 6.42 × 0.915 = 5.87

ModifiedExploitability = 8.22 × 0.85 × 0.77 × 0.85 × 0.85 = 3.89

ModifiedBaseScore = Roundup(5.87 + 3.89) = Roundup(9.76) = 9.8

EnvironmentalScore = Roundup(9.8 × 0.91 × 1.00 × 0.96)
                   = Roundup(8.56)
                   = 8.6
```

### Final Scores
```
Base Score:        9.4 (Critical)
Temporal Score:    8.3 (High)
Environmental:     8.6 (High)

Overall Score:     8.6 (use Environmental for prioritization)
```

**Vector strings:**
```
Base:        CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:L
Temporal:    E:U/RL:U/RC:R
Environmental: CR:H/IR:H/AR:M/MAV:N/MAC:L/MPR:N/MUI:N/MS:U/MC:H/MI:H/MA:L

Combined:    CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:L/E:U/RL:U/RC:R/CR:H/IR:H/AR:M
```

---

## Special Cases

### Case 1: Impact Sub-Score is Zero

**If ISS ≤ 0:**
```
BaseScore = 0
TemporalScore = 0
EnvironmentalScore = 0
```

**When does this happen?**
When C = I = A = None (no impact on anything)

### Case 2: Security Requirements Exceed 1.0

**MISS calculation allows CR/IR/AR × MC/MI/MA to exceed 1.0:**

```
CR = High (1.5)
MC = High (0.56)
CR × MC = 0.84

This is capped in the (1 - value) calculation, so:
(1 - 0.84) = 0.16  // This is valid
```

**The final MISS is capped at 0.915** to prevent scores > 10.0

### Case 3: Modified Scope Different from Base Scope

**Base:** S:U (Unchanged)
**Modified:** MS:C (Changed) - Environment has different isolation

**Use Modified Scope for Environmental calculation:**
```
ModifiedImpact uses the "Scope Changed" formula
ModifiedBaseScore uses the "Scope Changed" formula
```

---

## Implementation Pseudocode

### Base Score

```python
def calculate_base_score(metrics):
    # Get numeric values
    av = ATTACK_VECTOR[metrics['AV']]
    ac = ATTACK_COMPLEXITY[metrics['AC']]
    pr = PRIVILEGES_REQUIRED[metrics['PR']][metrics['S']]  # Scope-dependent
    ui = USER_INTERACTION[metrics['UI']]
    c = IMPACT[metrics['C']]
    i = IMPACT[metrics['I']]
    a = IMPACT[metrics['A']]

    # ISS
    iss = 1 - ((1 - c) * (1 - i) * (1 - a))

    # Impact
    if metrics['S'] == 'U':
        impact = 6.42 * iss
    else:  # S == 'C'
        impact = 7.52 * (iss - 0.029) - 3.25 * ((iss - 0.02) ** 15)

    # Exploitability
    exploitability = 8.22 * av * ac * pr * ui

    # Base Score
    if impact <= 0:
        return 0.0

    if metrics['S'] == 'U':
        score = impact + exploitability
    else:
        score = 1.08 * (impact + exploitability)

    return roundup(min(score, 10.0))

def roundup(value):
    """Round up to 1 decimal place"""
    import math
    return math.ceil(value * 10) / 10
```

### Temporal Score

```python
def calculate_temporal_score(base_score, temporal_metrics):
    e = EXPLOIT_MATURITY[temporal_metrics.get('E', 'X')]
    rl = REMEDIATION_LEVEL[temporal_metrics.get('RL', 'X')]
    rc = REPORT_CONFIDENCE[temporal_metrics.get('RC', 'X')]

    return roundup(base_score * e * rl * rc)
```

### Environmental Score

```python
def calculate_environmental_score(metrics, temporal_metrics, env_metrics):
    # Get numeric values (use Modified if present, else Base)
    mav = ATTACK_VECTOR[env_metrics.get('MAV', metrics['AV'])]
    mac = ATTACK_COMPLEXITY[env_metrics.get('MAC', metrics['AC'])]
    ms = env_metrics.get('MS', metrics['S'])
    mpr = PRIVILEGES_REQUIRED[env_metrics.get('MPR', metrics['PR'])][ms]
    mui = USER_INTERACTION[env_metrics.get('MUI', metrics['UI'])]

    mc = IMPACT[env_metrics.get('MC', metrics['C'])]
    mi = IMPACT[env_metrics.get('MI', metrics['I'])]
    ma = IMPACT[env_metrics.get('MA', metrics['A'])]

    cr = SECURITY_REQUIREMENTS[env_metrics.get('CR', 'M')]
    ir = SECURITY_REQUIREMENTS[env_metrics.get('IR', 'M')]
    ar = SECURITY_REQUIREMENTS[env_metrics.get('AR', 'M')]

    # MISS
    miss = min(
        1 - ((1 - cr*mc) * (1 - ir*mi) * (1 - ar*ma)),
        0.915
    )

    # Modified Impact
    if ms == 'U':
        mod_impact = 6.42 * miss
    else:
        mod_impact = 7.52 * (miss - 0.029) - 3.25 * ((miss * 0.9731 - 0.02) ** 13)

    # Modified Exploitability
    mod_exploitability = 8.22 * mav * mac * mpr * mui

    # Modified Base Score
    if mod_impact <= 0:
        mod_base = 0.0
    elif ms == 'U':
        mod_base = roundup(min(mod_impact + mod_exploitability, 10.0))
    else:
        mod_base = roundup(min(1.08 * (mod_impact + mod_exploitability), 10.0))

    # Apply Temporal modifiers
    e = EXPLOIT_MATURITY[temporal_metrics.get('E', 'X')]
    rl = REMEDIATION_LEVEL[temporal_metrics.get('RL', 'X')]
    rc = REPORT_CONFIDENCE[temporal_metrics.get('RC', 'X')]

    return roundup(mod_base * e * rl * rc)
```

---

## Worked Examples

### Example 1: High Impact, High Requirements

**Metrics:**
```
Base: AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
Temporal: E:U/RL:U/RC:R
Environmental: CR:H/IR:H/AR:H/[Modified same as Base]
```

**Calculations:**
```
ISS = 1 - [(1-0.56) × (1-0.56) × (1-0.56)] = 0.915
Impact = 6.42 × 0.915 = 5.87
Exploitability = 8.22 × 0.85 × 0.77 × 0.85 × 0.85 = 3.89
BaseScore = Roundup(5.87 + 3.89) = 9.8

TemporalScore = Roundup(9.8 × 0.91 × 1.0 × 0.96) = 8.6

MISS = min(1 - [(1-1.5×0.56) × (1-1.5×0.56) × (1-1.5×0.56)], 0.915)
     = min(1 - [0.16 × 0.16 × 0.16], 0.915)
     = min(0.996, 0.915) = 0.915
ModifiedImpact = 6.42 × 0.915 = 5.87
ModifiedBaseScore = 9.8
EnvironmentalScore = Roundup(9.8 × 0.91 × 1.0 × 0.96) = 8.6
```

**Result:** Environmental matches Temporal (both High requirements elevate to cap)

---

### Example 2: High Base, Low Requirements

**Metrics:**
```
Base: AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:L
Temporal: E:U/RL:U/RC:R
Environmental: CR:L/IR:L/AR:L/[Modified same as Base]
```

**Calculations:**
```
ISS = 0.849
Impact = 5.45
Exploitability = 3.89
BaseScore = 9.4

TemporalScore = Roundup(9.4 × 0.91 × 1.0 × 0.96) = 8.3

MISS = min(1 - [(1-0.5×0.56) × (1-0.5×0.56) × (1-0.5×0.22)], 0.915)
     = min(1 - [0.72 × 0.72 × 0.89], 0.915)
     = min(0.54, 0.915) = 0.54
ModifiedImpact = 6.42 × 0.54 = 3.47
ModifiedBaseScore = Roundup(3.47 + 3.89) = 7.4
EnvironmentalScore = Roundup(7.4 × 0.91 × 1.0 × 0.96) = 6.5
```

**Result:** Environmental drops to 6.5 (Medium) despite Base 9.4 (Critical)

**This demonstrates the power of Environmental metrics** - same technical severity, different business risk.

---

## Severity Rating Conversion

Map final score to qualitative severity:

| Score Range | Severity Rating |
|-------------|-----------------|
| 0.0 | None |
| 0.1 - 3.9 | Low |
| 4.0 - 6.9 | Medium |
| 7.0 - 8.9 | High |
| 9.0 - 10.0 | Critical |

**Use this for:** Communicating risk in reports, dashboards, stakeholder presentations

---

## Implementation Notes

### Roundup Function

**CVSS specification requires specific rounding:**
```
Roundup(x) = smallest number ≥ x with 1 decimal place
```

**Examples:**
- Roundup(8.21) = 8.3
- Roundup(8.20) = 8.2
- Roundup(8.2999) = 8.3
- Roundup(10.0) = 10.0

**In code:**
```python
import math
def roundup(value):
    return math.ceil(value * 10) / 10
```

### Floating Point Precision

Use at least **double precision** (64-bit float) for intermediate calculations to avoid rounding errors.

**Example issue with 32-bit floats:**
```
ISS = 0.849 (actual)
ISS = 0.8490001 (32-bit rounding)
This compounds through calculations
```

### Constants Precision

**Use these exact constants from FIRST.org spec:**
```
6.42 (not 6.4 or 6.420000)
7.52 (not 7.5)
3.25 (not 3.250000)
0.029 (not 0.03)
0.02 (not 0.020)
0.9731 (not 0.97)
0.915 (not 0.92)
8.22 (not 8.2)
1.08 (not 1.1)
```

---

## Validation

### Test Vectors

Use these official FIRST.org test vectors to verify implementation:

**Vector 1:**
```
Input: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H
Expected Base: 10.0
```

**Vector 2:**
```
Input: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
Expected Base: 9.8
```

**Vector 3:**
```
Input: CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N
Expected Base: 6.1
```

**Vector 4 (with Temporal):**
```
Input: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H/E:F/RL:O/RC:C
Base: 9.8
Expected Temporal: 9.1
```

If your implementation doesn't match these, check:
- Metric value mappings (PR depends on Scope!)
- Roundup function (ceiling to 1 decimal)
- Constant precision (use exact values above)

---

## CVSS 4.0 Calculation Notes

**CVSS 4.0 does NOT use formulas.** It uses MacroVector lookup tables.

**To calculate CVSS 4.0 scores:**
1. Use FIRST.org JavaScript calculator: https://www.first.org/cvss/calculator/4.0
2. Or use NVD calculator: https://nvd.nist.gov/vuln-metrics/cvss/v4-calculator
3. Or embed `cvss_lookup.js` from FIRST.org GitHub repository

**Do NOT attempt to implement 4.0 from scratch** - the lookup tables are expert-derived and complex.

**For threat modeling tools:**
- Implement CVSS 3.1 with formulas (this document)
- Call FIRST.org API or calculator for CVSS 4.0

---

## References

- [CVSS v3.1 Specification](https://www.first.org/cvss/v3-1/specification-document) - Official spec with all formulas
- [NVD CVSS v3.1 Equations](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator/v31/equations) - Formula reference
- [FIRST.org CVSS Calculator](https://www.first.org/cvss/calculator/3.1) - Official calculator for validation
- [CVSS v3.1 Examples](https://www.first.org/cvss/examples) - Test vectors
