# Temporal and Threat Metrics Guide

**Guidance for applying time-sensitive metrics in CVSS 3.1 (Temporal) and CVSS 4.0 (Threat).**

## Overview

These metrics capture characteristics that **change over time**:

- Exploit availability (is there working exploit code?)
- Remediation status (is a fix available?)
- Confirmation level (how confident are we this is real?)

**Key difference from Base metrics:** Temporal/Threat scores decrease as time passes (exploits get patched, confidence increases).

---

## CVSS 3.1 Temporal Metrics

### Exploit Code Maturity (E)

**Question:** What is the current state of exploit code availability?

| Value                    | Definition                                          | When to Use                                                   | Numeric |
| ------------------------ | --------------------------------------------------- | ------------------------------------------------------------- | ------- |
| **Not Defined (X)**      | Skip this metric (score = Base)                     | No information available                                      | 1.0     |
| **High (H)**             | Functional, reliable, widely available exploit code | Exploit in Metasploit, reliable PoC on GitHub                 | 1.0     |
| **Functional (F)**       | Working exploit exists, may be unreliable           | Exploit code works but not always, requires tweaking          | 0.97    |
| **Proof-of-Concept (P)** | Theoretical/demo code exists                        | PoC that demonstrates vulnerability but doesn't fully exploit | 0.94    |
| **Unproven (U)**         | No known exploit code                               | Hypothetical, only described in advisory/paper                | 0.91    |

**For threat modeling theoretical threats:**

- Default to **Unproven (U)** - you're hypothesizing this vulnerability, no exploit exists
- Use **Proof-of-Concept (P)** if you have demo code showing the issue
- Use **Functional (F)** if you have working exploit (rare for theoretical threats)

**For known CVEs:**

- Check ExploitDB, Metasploit, GitHub for public exploits
- Check CISA KEV catalog (Known Exploited Vulnerabilities)
- Check vendor advisories for exploit intel

---

### Remediation Level (RL)

**Question:** What is the current remediation status?

| Value                 | Definition                         | When to Use                                        | Numeric |
| --------------------- | ---------------------------------- | -------------------------------------------------- | ------- |
| **Not Defined (X)**   | Skip this metric                   | No information                                     | 1.0     |
| **Unavailable (U)**   | No fix exists                      | Vendor hasn't released patch, zero-day             | 1.0     |
| **Workaround (W)**    | Temporary mitigation available     | Configuration change, WAF rule, but not a real fix | 0.97    |
| **Temporary Fix (T)** | Non-official or incomplete patch   | Beta patch, community fix, partial remediation     | 0.96    |
| **Official Fix (O)**  | Vendor has released official patch | Vendor security update available                   | 0.95    |

**For threat modeling theoretical threats:**

- Default to **Unavailable (U)** - no fix exists because you just identified the threat
- Only use other values if you're assessing an existing known issue

**For known CVEs:**

- Check vendor security bulletins
- Check if patches are available
- Consider workarounds (e.g., WAF rules, config changes)

---

### Report Confidence (RC)

**Question:** How confident are we that this vulnerability exists and is exploitable?

| Value               | Definition                                    | When to Use                                             | Numeric |
| ------------------- | --------------------------------------------- | ------------------------------------------------------- | ------- |
| **Not Defined (X)** | Skip this metric                              | No assessment                                           | 1.0     |
| **Confirmed (C)**   | Vendor acknowledged, independently reproduced | Vendor security advisory, CVE assigned                  | 1.0     |
| **Reasonable (R)**  | Multiple independent sources confirm          | Security researchers report, but no vendor confirmation | 0.96    |
| **Unknown (U)**     | Single unverified report                      | Rumor, unconfirmed report                               | 0.92    |

**For threat modeling theoretical threats:**

- Use **Reasonable (R)** - based on your analysis, not vendor-confirmed
- Use **Confirmed (C)** if you've actually found and validated the vulnerability in code
- Avoid **Unknown** - if you're documenting it, you should have reasonable confidence

**For known CVEs:**

- Confirmed if vendor acknowledged
- Reasonable if multiple security researchers confirm
- Unknown if single unverified source

---

## CVSS 4.0 Threat Metrics

**Simplified to single metric:** Exploit Maturity (E)

### Exploit Maturity (E)

**Question:** What is the state of exploitation for this vulnerability?

| Value                    | Definition                      | When to Use                                      |
| ------------------------ | ------------------------------- | ------------------------------------------------ |
| **Not Defined (X)**      | Skip this metric                | Default value                                    |
| **Attacked (A)**         | Active exploitation in the wild | CISA KEV, confirmed attacks, botnet exploitation |
| **Proof-of-Concept (P)** | Exploit code exists publicly    | PoC on GitHub, security blog with code           |
| **Unreported (U)**       | No evidence of exploitation     | Theoretical, newly discovered, no known exploits |

**For threat modeling theoretical threats:**

- Default to **Unreported (U)** - you just identified this threat
- Only use **Proof-of-Concept** if you've created demo code
- **Attacked** is rare (requires CTI showing active exploitation)

**Why 4.0 is simpler:**

- Removed Remediation Level (knowing fix exists doesn't change attack likelihood)
- Removed Report Confidence (most vulnerabilities are confirmed once documented)
- Focus on single question: "Is this being exploited?"

**Impact on scores:**

```
CVSS 4.0 creates LARGER gaps between Base and Threat than 3.1 did between Base and Temporal

Example (Base 9.8):
- CVSS 3.1: 9.8 × 0.91 × 1.0 × 0.96 = 8.6 (1.2 point reduction)
- CVSS 4.0: Lookup for E:U might give 7.5 (2.3 point reduction)
```

This makes **prioritization clearer** - bigger gap between theoretical and actively-exploited.

---

## Temporal vs Threat Comparison

| Aspect                    | CVSS 3.1 Temporal           | CVSS 4.0 Threat        | Better For                      |
| ------------------------- | --------------------------- | ---------------------- | ------------------------------- |
| **Metrics count**         | 3 (E, RL, RC)               | 1 (E only)             | **4.0** (simpler)               |
| **Exploit focus**         | Maturity + Fix + Confidence | Maturity only          | **4.0** (clearer)               |
| **Score differentiation** | Smaller gap                 | Larger gap             | **4.0** (better prioritization) |
| **Theoretical threats**   | E:U/RL:U/RC:R = 0.87×       | E:U = larger reduction | **4.0**                         |
| **Known CVEs**            | All 3 metrics relevant      | Only E matters         | **3.1** (more context)          |
| **Calculation**           | Multiply 3 values           | MacroVector lookup     | **3.1** (formula-based)         |

**For threat modeling:** Both work well. 4.0's simplification makes it easier to assess theoretical threats.

---

## Defaults for Theoretical Threats

When scoring vulnerabilities identified during threat modeling (not known CVEs):

### CVSS 3.1 Conservative Defaults

```yaml
# Recommended defaults for theoretical threats
Temporal:
  ExploitCodeMaturity: "Unproven" (0.91)
    Rationale: No exploit code exists - you're hypothesizing this vulnerability

  RemediationLevel: "Unavailable" (1.0)
    Rationale: No fix exists because vulnerability isn't confirmed yet

  ReportConfidence: "Reasonable" (0.96)
    Rationale: Based on your threat analysis, not vendor confirmation

Combined: 0.91 × 1.0 × 0.96 = 0.87 multiplier
Example: Base 9.8 → Temporal 8.5
```

**When to deviate:**

- E:P if you've created PoC code during threat modeling
- E:F if you've created working exploit
- RC:C if you've validated in actual code (not just theoretical)

### CVSS 4.0 Conservative Default

```yaml
Threat:
  ExploitMaturity: "Unreported" (U)
    Rationale: No evidence of exploitation - this is theoretical

Example: Base 9.8 → Threat ~7.5 (larger reduction than 3.1)
```

---

## Temporal Intelligence for Known CVEs

When assessing known vulnerabilities (not theoretical):

### Intelligence Sources

| Source                | Provides                        | How to Use                                               |
| --------------------- | ------------------------------- | -------------------------------------------------------- |
| **NVD**               | CVE details, CVSS scores        | Check for Base scores, but NVD doesn't provide Temporal  |
| **CISA KEV**          | Known exploited vulnerabilities | If listed → E:A (4.0) or E:F/H (3.1)                     |
| **ExploitDB**         | Public exploit code             | Check for PoCs and working exploits → Determines E value |
| **Metasploit**        | Weaponized exploits             | If module exists → E:H (3.1) or E:A (4.0)                |
| **GitHub**            | Security PoCs                   | Search for vulnerability ID → E:P or E:F                 |
| **Vendor advisories** | Patch status                    | Determines RL value (O, T, W, U)                         |
| **CTI feeds**         | Active exploitation             | Confirms E:A (4.0) or E:H (3.1)                          |

### Assessment Process for Known CVE

**Step 1:** Check CISA KEV

```
If CVE in https://www.cisa.gov/known-exploited-vulnerabilities-catalog:
  → E:A (4.0) or E:H (3.1)
  → RL:U (if no patch) or RL:O (if patched after KEV)
```

**Step 2:** Search ExploitDB

```
Search https://www.exploit-db.com/ for CVE-ID
  → No results: E:U
  → PoC code: E:P
  → Working exploit: E:F
  → Metasploit module: E:H
```

**Step 3:** Check vendor advisory

```
Vendor released patch?
  → No: RL:U
  → Yes, official: RL:O
  → Yes, beta/interim: RL:T
  → Workaround only: RL:W
```

**Step 4:** Assess confidence

```
Vendor confirmed?
  → Yes: RC:C
  → No, but multiple researchers: RC:R
  → Single source: RC:U
```

---

## Temporal Score Calculation

### CVSS 3.1 Formula

```
TemporalScore = Roundup(BaseScore × E × RL × RC)
```

**Example:**

```
BaseScore: 9.8
E: Unproven (0.91)
RL: Unavailable (1.0)
RC: Reasonable (0.96)

TemporalScore = Roundup(9.8 × 0.91 × 1.0 × 0.96)
              = Roundup(8.56)
              = 8.6
```

**Effect:** Temporal reduces Base by 0-13% typically

**Smallest reduction:** E:H × RL:U × RC:C = 1.0 × 1.0 × 1.0 = No change
**Largest reduction:** E:U × RL:O × RC:U = 0.91 × 0.95 × 0.92 = 0.79 (21% reduction)

### CVSS 4.0 Threat Calculation

**Uses MacroVector approach** - no simple multiplication.

**Process:**

1. Assess Exploit Maturity (A, P, or U)
2. Include E in EQ5 equivalence set
3. Lookup MacroVector score from FIRST.org table
4. Interpolate within MacroVector

**Tool required:** Use FIRST.org JavaScript calculator or NVD calculator for 4.0

---

## When to Use Temporal/Threat Metrics

### Always Use When:

- Scoring threats for **prioritization** (you want accurate ranking)
- Reporting to stakeholders (shows current risk level)
- Comparing threats (Base scores alone can be misleading)

### Skip When:

- Quick triage (Base-only for speed)
- No threat intelligence available (default to Not Defined = 1.0)
- Focus is purely on intrinsic severity (e.g., academic analysis)

**For threat modeling:** **Recommend always using Temporal/Threat** with conservative defaults for theoretical threats. This ensures consistency.

---

## Integration with Threat Modeling Phases

| Phase       | Temporal/Threat Input                                                          |
| ----------- | ------------------------------------------------------------------------------ |
| **Phase 1** | No direct input (business context → Environmental, not Temporal)               |
| **Phase 1** | No direct input (architecture → Base metrics)                                  |
| **Phase 2** | No direct input (controls → Base metrics)                                      |
| **Phase 3** | **Score threats here**: Apply Temporal/Threat defaults for theoretical threats |
| **Phase 4** | Uses final scores (Temporal/Threat included) for test prioritization           |

**Default workflow:**

1. Phase 3 threat identified → Assess Base metrics
2. Apply Temporal defaults (E:U/RL:U/RC:R for 3.1, or E:U for 4.0)
3. Apply Environmental metrics from Phase 1
4. Final score = Environmental (which includes Temporal)

---

## Examples

### Theoretical SQL Injection (Threat Modeling)

**CVSS 3.1:**

```yaml
Base Vector: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:L
Base Score: 9.4

Temporal:
  E: Unproven (0.91) - No exploit exists yet
  RL: Unavailable (1.0) - No fix (we just found it)
  RC: Reasonable (0.96) - Our analysis, not vendor-confirmed

Temporal Score: Roundup(9.4 × 0.91 × 1.0 × 0.96) = 8.2
```

**CVSS 4.0:**

```yaml
Base Score: 9.4

Threat:
  E: Unreported (U) - Not being exploited

Threat Score: ~7.8 (via MacroVector lookup)
```

### Known CVE with Active Exploitation

**CVSS 3.1:**

```yaml
Base Score: 7.5

Temporal:
  E: High (1.0) - Metasploit module exists
  RL: Official Fix (0.95) - Vendor released patch
  RC: Confirmed (1.0) - Vendor confirmed, CVE assigned

Temporal Score: Roundup(7.5 × 1.0 × 0.95 × 1.0) = 7.1
```

**CVSS 4.0:**

```yaml
Base Score: 7.5

Threat:
  E: Attacked (A) - In CISA KEV catalog

Threat Score: ~8.2 (via MacroVector, note: INCREASES from Base)
```

### Known CVE, No Exploit, Patch Available

**CVSS 3.1:**

```yaml
Base Score: 8.8

Temporal:
  E: Unproven (0.91) - No public exploits
  RL: Official Fix (0.95) - Vendor patched
  RC: Confirmed (1.0) - CVE assigned

Temporal Score: Roundup(8.8 × 0.91 × 0.95 × 1.0) = 7.6
```

**CVSS 4.0:**

```yaml
Base Score: 8.8

Threat:
  E: Unreported (U) - No exploitation evidence

Threat Score: ~6.9 (MacroVector lookup)
```

---

## Temporal Evolution Example

**Scenario:** Critical authentication bypass (Base 9.8)

| Time       | Status                         | CVSS 3.1 Temporal | Score |
| ---------- | ------------------------------ | ----------------- | ----- |
| **Day 0**  | Discovered, reported to vendor | E:U/RL:U/RC:R     | 8.5   |
| **Day 7**  | Vendor confirms, no patch yet  | E:U/RL:U/RC:C     | 8.9   |
| **Day 14** | PoC published on blog          | E:P/RL:U/RC:C     | 8.8   |
| **Day 30** | Vendor releases patch          | E:P/RL:O/RC:C     | 8.4   |
| **Day 60** | Working exploit on GitHub      | E:F/RL:O/RC:C     | 9.1   |
| **Day 90** | Metasploit module added        | E:H/RL:O/RC:C     | 9.3   |

**Notice:** Score goes UP even with patch (RL:O) because exploit maturity increases (E:P → F → H)

---

## Common Pitfalls

### Pitfall 1: Assuming Patch Reduces Score

**Wrong:** "Vendor patched it → Lower Temporal score"

**Reality:** RL:O (0.95) only reduces by 5%. If exploit code improves (E increases), net score may increase.

**Example:**

- Before patch: E:U × RL:U = 0.91 × 1.0 = 0.91
- After patch: E:H × RL:O = 1.0 × 0.95 = 0.95 (HIGHER)

### Pitfall 2: Using High Confidence for Theoretical Threats

**Wrong:** Theoretical threat → RC:C (we're confident in our analysis)

**Correct:** Theoretical threat → RC:R (not vendor-confirmed)

**Reason:** RC:C means vendor acknowledged. Theoretical threats haven't been vendor-confirmed.

### Pitfall 3: Not Defined ≠ Unknown

**Not Defined (X)** = Skip this metric (defaults to 1.0, no reduction)

**Unknown (U)** for RC = Unconfirmed report (0.92)

**Different meanings!**

---

## References

- CVSS v3.1 Specification Section 2.2 (Temporal Metric Group)
- CVSS v4.0 Specification Section 4 (Threat Metrics)
- FIRST.org CVSS User Guide
- CISA KEV Catalog: https://www.cisa.gov/known-exploited-vulnerabilities-catalog
- ExploitDB: https://www.exploit-db.com/
