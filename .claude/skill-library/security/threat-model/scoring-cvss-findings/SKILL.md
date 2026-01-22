---
name: scoring-cvss-findings
description: Use when scoring security findings with CVSS - provides interactive calibration guidance for CVSSv3.1 and CVSSv4.0 with conservative defaults, decision trees, clarifying questions, and deterministic score calculation via cvss-calc.py tool to prevent over-inflation
allowed-tools: Read, AskUserQuestion, TodoWrite, Bash
---

# Scoring CVSS Findings

**Interactive CVSS scoring calibration skill that prevents over-inflation through conservative defaults and clarifying questions.**

## When to Use

Use this skill when:

- Scoring security findings for reports, threat models, or assessments
- Calibrating CVSS scores to avoid over-inflation
- Uncertain about specific vector values (AV, AC, PR, UI, S, C, I, A)
- Supporting both CVSSv3.1 and CVSSv4.0 scoring
- Need to justify score decisions with evidence

**Do NOT use for:**

- Risk scoring for threat modeling (use `threat-modeling` skill instead)
- Confidence scoring for detection plugins (use `implementing-detection-plugins`)
- Compliance frameworks (use `mapping-to-cis-benchmarks` or similar)

## Quick Reference

| CVSS Version | When to Use                                      | Calculator Tool                      |
| ------------ | ------------------------------------------------ | ------------------------------------ |
| **v3.1**     | Industry standard, most common (2019-present)    | `uv run cvss-calc.py "CVSS:3.1/..."` |
| **v4.0**     | Latest version with improved granularity (2023+) | `uv run cvss-calc.py "CVSS:4.0/..."` |
| **v2.0**     | Legacy only, do not use for new findings         | Not supported by calculator          |

**Tool location:** `.claude/skill-library/security/scoring-cvss-findings/scripts/cvss-calc.py`

**Dependencies:** Uses `uv` for automatic dependency management (no venv or pip install needed)

## Severity Ranges

### CVSSv3.1 Base Scores

| Score    | Severity | Color  | Priority |
| -------- | -------- | ------ | -------- |
| 9.0-10.0 | CRITICAL | Purple | P0       |
| 7.0-8.9  | HIGH     | Red    | P1       |
| 4.0-6.9  | MEDIUM   | Orange | P2       |
| 0.1-3.9  | LOW      | Yellow | P3       |
| 0.0      | NONE     | Green  | N/A      |

### CVSSv4.0 Base Scores (Similar Ranges)

| Score    | Severity | Priority |
| -------- | -------- | -------- |
| 9.0-10.0 | CRITICAL | P0       |
| 7.0-8.9  | HIGH     | P1       |
| 4.0-6.9  | MEDIUM   | P2       |
| 0.1-3.9  | LOW      | P3       |
| 0.0      | NONE     | N/A      |

## Core Workflow

**You MUST use TodoWrite** to track progress through scoring steps.

### Step 1: Select CVSS Version

Ask the user which version to use:

```
Question: Which CVSS version should be used for scoring?

Options:
1. CVSSv3.1 (Recommended) - Industry standard, widely adopted
2. CVSSv4.0 - Latest version with improved granularity
```

**Default to CVSSv3.1** unless user specifically requests v4.0 or organization policy requires it.

### Step 2: Gather Finding Context

Before scoring, understand the vulnerability:

**Ask user to provide:**

- Vulnerability description (what's wrong?)
- Attack scenario (how is it exploited?)
- Impact scope (what gets compromised?)
- Exploitation requirements (what does attacker need?)

**Load the appropriate scoring reference:**

- **CVSSv3.1**: Read [references/cvss-v3-decision-tree.md](references/cvss-v3-decision-tree.md)
- **CVSSv4.0**: Read [references/cvss-v4-decision-tree.md](references/cvss-v4-decision-tree.md)

### Step 3: Interactive Vector Scoring

**CRITICAL: Use conservative defaults and ask clarifying questions when uncertain.**

For each vector metric, follow the decision tree pattern:

1. **Present the question** from the decision tree
2. **If uncertain**, use AskUserQuestion to clarify
3. **Document the reasoning** for the chosen value
4. **Default to lower severity** when ambiguous

**Example (CVSSv3.1 Scope metric):**

```
Question: Does this vulnerability cross a security boundary?

Context: Scope (S) determines if the impact extends beyond the vulnerable component.

Options:
1. S:U (Unchanged) - Impact limited to vulnerable component (Recommended default)
   Examples: Single user account compromise, isolated service disruption

2. S:C (Changed) - Impact extends beyond security boundary
   Examples: Container escape, VM breakout, cross-tenant data access
```

**See:** [references/cvss-v3-vectors.md](references/cvss-v3-vectors.md) for complete vector guidance.

### Step 4: Calculate Base Score

**CRITICAL:** Always use the CVSS calculator tool to compute scores. Never estimate or manually calculate.

**Use the included calculator:**

```bash
# Navigate to skill directory
cd .claude/skill-library/security/scoring-cvss-findings/scripts

# Calculate CVSS v4.0 score
uv run cvss-calc.py "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N"

# Calculate CVSS v3.1 score
uv run cvss-calc.py "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:L/A:N"
```

**Output format:**

```
Score: 9.3
Severity: Critical
Vector: CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N
```

**Alternative:** Use online calculators for validation:

- **CVSSv3.1**: https://www.first.org/cvss/calculator/3.1
- **CVSSv4.0**: https://www.first.org/cvss/calculator/4.0

**Why use the tool:** CVSS scoring is deterministic mathematics. LLM estimation produces incorrect scores. The `cvss-calc.py` tool uses the RedHat `cvss` library to ensure accurate calculation.

### Step 5: Validate and Justify

Before finalizing, validate the score:

**Validation checklist:**

- [ ] Does score match severity expectation? (e.g., "feels HIGH" but scored MEDIUM?)
- [ ] Are assumptions documented? (Why S:C? Why C:H? Why AC:L?)
- [ ] Would a security expert agree with the reasoning?
- [ ] Is this defensible in a report or presentation?

**If score seems too high**, review common inflation patterns:

- Did you assume S:C without actual boundary crossing?
- Did you use C:H/I:H without justification?
- Did you set AC:L when multiple steps are required?
- Did you use UI:N when user interaction is needed?

**See:** [references/common-inflation-patterns.md](references/common-inflation-patterns.md)

### Step 6: Document the Score

Provide the final score with justification:

```markdown
## CVSS Score

**Version:** CVSSv3.1
**Vector:** CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:L/A:N
**Base Score:** 6.5 (MEDIUM)

**Rationale:**

- AV:N - Network-based attack (phishing email)
- AC:L - Low complexity (no special conditions)
- PR:N - No authentication required to send phish
- UI:R - Victim must click and enter credentials
- S:U - Impact limited to compromised account (not IdP itself)
- C:H - Attacker gains access to user's data
- I:L - Attacker can modify limited data within user permissions
- A:N - No availability impact

**Justification:**
Used S:U instead of S:C because compromising a single user account doesn't
cross a security boundary - the IdP itself is not compromised. Used C:H because
attacker gains full access to the user's data, but I:L because modifications
are limited to the user's permissions, not system-wide.
```

## Key Principles

### ❌ Don't Assume Worst-Case

**WRONG**: "This could lead to complete system compromise" → Score as CRITICAL
**RIGHT**: "What is the realistic, likely impact?" → Score based on evidence

### ❌ Don't Default to High Severity

**WRONG**: Use C:H/I:H/A:H by default "to be safe"
**RIGHT**: Use L (Low) or N (None) unless evidence supports H (High)

### ❌ Don't Conflate Scope with Impact

**WRONG**: "Compromising auth affects all apps" → S:C
**RIGHT**: "Does this cross a security boundary?" → Usually S:U

**See:** [references/scoring-anti-patterns.md](references/scoring-anti-patterns.md)

### ✅ Always Ask Clarifying Questions

When uncertain about a vector value, use AskUserQuestion:

```
AskUserQuestion({
  question: "Does the attacker need to authenticate before exploiting this?",
  options: [
    { label: "No authentication required (PR:N)", description: "Unauthenticated exploitation" },
    { label: "Basic user account needed (PR:L)", description: "Requires valid user credentials" },
    { label: "Admin/elevated privileges needed (PR:H)", description: "Requires administrative access" }
  ]
})
```

### ✅ Always Document Assumptions

For any non-obvious vector choice, document the reasoning:

- Why did you choose AC:L over AC:H?
- Why is this S:U and not S:C?
- What evidence supports C:H vs C:L?

### ✅ Always Use Conservative Defaults

When ambiguous, choose the lower severity:

- **Scope**: Default to S:U (Unchanged)
- **CIA Triad**: Default to L (Low) or N (None)
- **Attack Complexity**: Default to AC:H (High) if multi-step
- **User Interaction**: Default to UI:R (Required) if social engineering involved
- **Risk Type**: Default to lower severity for configuration/best practice issues vs active vulnerabilities
- **Validation Status**: Reduce severity when exploitation is undemonstrated (even if infrastructure confirmed)
- **Mitigating Factors**: Account for small user populations, documented risk acceptance, and existing controls

## Realistic Threat Modeling

### Risk Type Classification

**CRITICAL PRINCIPLE:** Distinguish between different risk types when scoring. Not all security concerns are exploitable vulnerabilities.

| Risk Type                    | Severity Range   | Characteristics                                              | Example                                             |
| ---------------------------- | ---------------- | ------------------------------------------------------------ | --------------------------------------------------- |
| **Active Vulnerability**     | HIGH to CRITICAL | Confirmed exploitable, demonstrated attack path              | Authentication bypass, XSS with PoC                 |
| **Configuration Weakness**   | LOW to MEDIUM    | Suboptimal settings, requires validation                     | Deprecated OAuth flows enabled but unused           |
| **Best Practice Issue**      | LOW              | Compliance/hygiene, no confirmed exploitability              | Key rotation practices, logging gaps                |
| **Defense-in-Depth Concern** | LOW to MEDIUM    | Mitigating layer exists but architectural improvement needed | Enrollment policy weak but auth policy enforces MFA |

**Scoring Impact:**

- **Active Vulnerability**: Score based on demonstrated impact
- **Configuration Weakness**: Reduce by 1-2 severity levels (e.g., HIGH → MEDIUM/LOW)
- **Best Practice Issue**: Typically LOW (0.1-3.9) regardless of theoretical impact
- **Defense-in-Depth**: Score conditional impact, not theoretical maximum

**Example:**

- ❌ **WRONG**: Deprecated authentication flows enabled → CVSS 7.1 (HIGH) - "Could be exploited"
- ✅ **RIGHT**: Deprecated authentication flows enabled, no apps using them → CVSS 3.1 (LOW) - "Best practice issue requiring validation"

### Attack Prerequisites and Realistic Impact

**CRITICAL PRINCIPLE:** Score based on realistic attack scenarios, not theoretical maximums.

**Consider these prerequisites when scoring:**

1. **Authentication Requirements**
   - Does attacker need valid credentials? → Increase AC, add PR:L/PR:H
   - Are authentication events logged? → Reduces realistic impact (detection opportunity)
   - Is MFA required for the prerequisites? → Increases AC significantly

2. **Multi-Step Exploitation**
   - Step 1: Obtain credentials (phishing, breach)
   - Step 2: Bypass additional controls (MFA, device trust)
   - Step 3: Exploit the vulnerability
   - **Each step increases AC and reduces likelihood**

3. **User Interaction Requirements**
   - Social engineering needed? → UI:A (Active)
   - Push notification approval? → UI:A + note about push fatigue attacks
   - Physical device access? → Increases AC

**Example:**

- ❌ **WRONG**: Authentication bypass → CVSS 9.3 (CRITICAL) - "Complete system compromise"
- ✅ **RIGHT**: Authentication bypass → CVSS 7.8 (HIGH) - "Requires valid credentials (logged), phishing (UI:A), bypasses secondary factor only (not full auth)"

**Key Insight:** If attacker needs valid credentials + successful phishing + MFA bypass, this is NOT a zero-interaction Critical vulnerability. It's a HIGH severity issue with multiple prerequisites.

### Mitigating Factors

**CRITICAL PRINCIPLE:** Account for compensating controls and contextual factors that reduce real-world impact.

**Mitigating factors that should reduce CVSS scores:**

1. **Small User Population**
   - Curated groups (< 50 users) → Reduce VC/VI/VA by one level
   - Limited scope reduces blast radius
   - Example: NoMachine group (20 users) vs all employees (5000 users)

2. **Documented Risk Acceptance**
   - Security leadership acknowledges risk
   - Business justification documented
   - Technical constraints understood
   - **Scoring impact**: Treat as known tradeoff, reduce to LOW/MEDIUM

3. **Existing Compensating Controls**
   - Hardware-backed certificates required
   - Manual group curation (not automatic enrollment)
   - Alternative authentication factors available
   - **Scoring impact**: Account for defense-in-depth, reduce C/I/A by one level

4. **Technical Constraints with Valid Justification**
   - USB passthrough reliability issues (NoMachine)
   - Legacy system migration in progress
   - Platform limitations (Mac/Linux only environment)
   - **Scoring impact**: If constraint has business justification, reduce severity

**Example:**

- ❌ **WRONG**: Remote access weak MFA → CVSS 6.4 (MEDIUM) - "Fishable authentication"
- ✅ **RIGHT**: Remote access weak MFA → CVSS 3.4 (LOW) - "Small curated group (<50 users), documented technical constraints (hardware compatibility issues), compensating controls present, manual enrollment required"

### Validation Status Impact

**CRITICAL PRINCIPLE:** Distinguish between "fully validated", "partially validated", and "unvalidated" findings when scoring.

| Validation Status       | Evidence Available                                   | Scoring Approach                        |
| ----------------------- | ---------------------------------------------------- | --------------------------------------- |
| **Fully Validated**     | Infrastructure confirmed + exploitation demonstrated | Score based on demonstrated impact      |
| **Partially Validated** | Infrastructure confirmed, exploitation untested      | Reduce severity 1-2 levels, add caveats |
| **Unvalidated**         | Theoretical, no confirming evidence                  | LOW severity or don't report            |

**Scoring Adjustments for Partial Validation:**

- Increase AC (H instead of L) - exploitation complexity unknown
- Add AT:P (Attack Requirements Present) in CVSSv4.0
- Reduce C/I/A by one level - actual impact unconfirmed
- Document limitations prominently

**Example:**

- ❌ **WRONG**: Delegation mechanism, no testing → CVSS 9.1 (CRITICAL) - "MFA bypass"
- ✅ **RIGHT**: Delegation mechanism, infrastructure confirmed but exploitation untested → CVSS 7.6 (HIGH) - "Infrastructure confirmed, theoretical attack, requires validation"

**When to Report Unvalidated Findings:**

- ✅ **DO REPORT**: Infrastructure confirmed to exist, known vulnerability pattern, but full exploitation couldn't be demonstrated
- ❌ **DON'T REPORT**: Pure speculation without any confirming evidence
- ❌ **DON'T REPORT**: "Unknown security posture" findings (e.g., "Can't assess if hardened" is not a finding)

### Cross-Finding Consistency

**CRITICAL PRINCIPLE:** Similar scenarios must receive consistent scoring. Compare findings to identify scoring inconsistencies.

**Consistency Check Questions:**

1. **Same Attack Type?** Do two findings with similar attack vectors have similar scores?
2. **Same Prerequisites?** Do findings requiring credentials + phishing + MFA bypass cluster in HIGH range?
3. **Same Impact Scope?** Do findings affecting small populations score lower than org-wide issues?
4. **Same Risk Type?** Do best practice issues consistently score LOW while active vulnerabilities score higher?

**Red Flag Example:**

| Finding            | Risk Type        | Actual Security Posture                     | Original Score | Consistency Issue                       |
| ------------------ | ---------------- | ------------------------------------------- | -------------- | --------------------------------------- |
| VDI Access Control | Defense-in-depth | Application policy enforces MFA (validated) | HIGH 7.1       | Scored HIGHER despite STRONGER security |
| Remote Access Tool | Active weakness  | Password+push allowed (confirmed)           | LOW 3.4        | Scored LOWER despite WEAKER security    |

**Resolution:** VDI finding reduced to MEDIUM 5.0 (defense-in-depth concern with confirmed mitigation) to maintain consistency with remote access finding.

**Consistency Protocol:**

1. After scoring all findings, create a comparison table
2. Group by attack type, prerequisites, and user population
3. Identify outliers (scores that don't match pattern)
4. Investigate: "Why is Finding A scored higher than Finding B when B is objectively riskier?"
5. Adjust scores to maintain consistency

**See:** [references/cross-finding-consistency.md](references/cross-finding-consistency.md) for detailed protocol.

## Common Scoring Scenarios

**See:** [references/scoring-examples.md](references/scoring-examples.md) for complete examples including authentication bypass, weak configuration, injection attacks, and more.

## CVSSv4.0 Differences

CVSSv4.0 introduces improved granularity:

**Key changes:**

- Attack Requirements (AT) - Replaces AC with more detail
- Privileged Required (PR) - Renamed to Privileges Required
- User Interaction (UI) - Expanded options
- Supplemental Metrics - Safety, Automatability, Recovery

**See:** [references/cvss-v4-changes.md](references/cvss-v4-changes.md) for migration guide.

## Troubleshooting

### Issue: Score Too High (Over-Inflation)

**Symptoms:** Score feels inflated, doesn't match intuition

**Common causes:**

- Assumed S:C without boundary crossing
- Used C:H/I:H without justification
- Set AC:L when exploitation is complex

**Solution:** Review [references/common-inflation-patterns.md](references/common-inflation-patterns.md)

### Issue: Score Too Low (Under-Estimation)

**Symptoms:** Score feels too lenient for critical vulnerability

**Common causes:**

- Didn't consider full impact scope
- Missed exploitation vectors
- Underestimated likelihood

**Solution:** Review the attack scenario and impact with security expert

### Issue: Disagreement on Vector Values

**Symptoms:** Different scorers arrive at different values

**Common causes:**

- Different assumptions about attack scenario
- Ambiguous vulnerability description
- Lack of context

**Solution:** Document assumptions explicitly, use AskUserQuestion to clarify

## Integration

### Called By

- Security assessment skills (`reviewing-okta-configurations`, `threat-modeling`)
- Security reviewers (`backend-security`, `frontend-security`)
- Capability developers (`capability-developer` when documenting findings)

### Requires (invoke before starting)

None - terminal skill (can be invoked directly)

### Calls (during execution)

None - uses AskUserQuestion for interactive clarification, not other skills

### Pairs With (conditional)

| Skill                           | Trigger                               | Purpose                        |
| ------------------------------- | ------------------------------------- | ------------------------------ |
| `threat-modeling`               | When scoring threats in threat model  | Provides threat context        |
| `reviewing-okta-configurations` | When scoring Okta findings            | Provides vulnerability details |
| `planning-security-tests`       | When prioritizing tests by CVSS score | Determines test priority       |

## References

- [references/cvss-v3-decision-tree.md](references/cvss-v3-decision-tree.md) - Step-by-step CVSSv3.1 scoring
- [references/cvss-v3-vectors.md](references/cvss-v3-vectors.md) - Complete vector metric guidance
- [references/cvss-v4-decision-tree.md](references/cvss-v4-decision-tree.md) - CVSSv4.0 scoring workflow
- [references/cvss-v4-changes.md](references/cvss-v4-changes.md) - Migration from v3 to v4
- [references/common-inflation-patterns.md](references/common-inflation-patterns.md) - How to avoid over-scoring
- [references/scoring-examples.md](references/scoring-examples.md) - Real-world scoring scenarios
- [references/scoring-anti-patterns.md](references/scoring-anti-patterns.md) - What NOT to do

## Related Skills

- `threat-modeling` - Risk scoring for threat analysis
- `reviewing-okta-configurations` - Okta security assessment with CVSS
- `planning-security-tests` - Test prioritization by severity
- `implementing-detection-plugins` - Confidence scoring for detections
- `researching-nvd` - NVD API queries for CVE lookups with CVSS data
