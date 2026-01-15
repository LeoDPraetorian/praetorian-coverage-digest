---
name: scoring-cvss-threats
description: Use when scoring threats with CVSS during threat modeling Phase 3 - guides version selection (3.1 recommended, 4.0 optional), Base metric assessment for theoretical threats, Temporal/Threat scoring, and Environmental metrics derived from Phase 1 business context (crown jewels → CR/IR/AR). Produces CVSS vectors and scores for prioritization in standalone open-source threat modeling tool.
allowed-tools: Read, Write, AskUserQuestion, TodoWrite
---

# CVSS Scoring for Threat Modeling

**Systematic CVSS scoring integrated with threat modeling workflow, prioritizing threats using business context from Phase 1.**

## When to Use

Use this skill when:
- **Phase 3 of threat modeling** - scoring threats identified via STRIDE analysis
- **Prioritizing threats** - need standardized, reproducible severity scores
- **Integrating business context** - mapping Phase 1 findings (crown jewels, compliance) to Environmental metrics
- **Known CVEs** - scoring existing vulnerabilities in attack surface
- **Theoretical threats** - assessing hypothetical vulnerabilities identified during modeling


**Important:** You MUST use TodoWrite before starting to track all workflow steps.
**Do NOT use for:**
- Simple risk scoring (1-12 scale) - this provides full CVSS with formulas
- Non-security assessments - CVSS is for vulnerability/threat scoring only

## Quick Reference

| CVSS Version | Use When | Pros | Cons |
|--------------|----------|------|------|
| **CVSS 4.0** (Recommended) | Default choice | Better score differentiation, Supplemental metrics, industry direction | MacroVector complexity |
| **CVSS 3.1** | Legacy compatibility | Clear formulas, NVD compatibility, wider current tooling | Less granular than 4.0 |
| **Both** | Comparison needed | See differences in scoring | Double the work |

**Typical Workflow:**
1. **Version selection** via AskUserQuestion (default 4.0)
2. **Base metrics** - assess attack characteristics (8 metrics)
3. **Temporal/Threat metrics** - apply threat intelligence (defaults for theoretical)
4. **Environmental metrics** - load Phase 1 business context (CR/IR/AR)
5. **Calculate scores** - use formulas from references/
6. **Output schema** - structured JSON for threat-model.json

## Core Workflow

### Step 1: CVSS Version Selection

**Ask the user:**

```
Question: Which CVSS version should we use?

Options:
1. CVSS 4.0 (Recommended)
   - Latest industry standard (2023)
   - Better score differentiation
   - Supplemental metrics (Safety, Automatable, Recovery)
   - Future-proof for security tooling

2. CVSS 3.1
   - Wide tooling support currently
   - Clear calculation formulas (no MacroVector lookup)
   - NVD compatibility for CVE correlation
   - Good for legacy system integration

3. Both
   - Calculate both for comparison
   - Useful when transitioning from 3.1 to 4.0
```

If user doesn't specify, **default to CVSS 4.0**.

**Default recommendation**: CVSS 4.0 unless legacy system compatibility requires 3.1.

### Step 2: Scoring Depth Selection

**Ask the user:**

```
Question: What scoring depth do you need?

Options:
1. Full (Base + Temporal/Threat + Environmental) - Recommended
   - Most accurate, uses Phase 1 business context
   - Adjusts for exploit availability and your environment
   - Produces final prioritization score

2. Base + Environmental
   - Skip temporal (appropriate for theoretical threats without exploit intelligence)
   - Still context-aware via Environmental metrics

3. Base only
   - Quick assessment
   - Generic severity (not customized to your business)
```

**For threat modeling**: Option 1 or 2 recommended (use Environmental metrics).

### Step 3: Load Phase 1 Business Context

If Environmental scoring selected, load Phase 1 outputs:

```
Required Phase 1 files:
- phase-1/data-classification.json (crown jewels)
- phase-1/compliance-requirements.json (PCI-DSS, HIPAA, etc.)
- phase-1/business-impact.json (breach costs, RTO/RPO)

If files not available: Fall back to manual CR/IR/AR entry
```

**Automatic mapping (see [references/environmental-metrics.md](references/environmental-metrics.md) for formulas):**

| Phase 1 Finding | Environmental Metric | Value |
|-----------------|----------------------|-------|
| Crown jewel = payment card data | CR (Confidentiality Requirement) | High (1.5) |
| Crown jewel = transaction integrity | IR (Integrity Requirement) | High (1.5) |
| RTO < 4 hours | AR (Availability Requirement) | High (1.5) |
| PCI-DSS Level 1 | CR = High, IR = High | 1.5, 1.5 |
| No sensitive data | CR, IR, AR | Medium (1.0) |

### Step 4: Assess Base Metrics

For each threat, assess 8 Base metrics. See [references/base-metrics-guide.md](references/base-metrics-guide.md) for detailed guidance.

**Quick assessment questions:**

| Metric | Question | Values |
|--------|----------|--------|
| **AV** (Attack Vector) | How does attacker reach vulnerable component? | Network, Adjacent, Local, Physical |
| **AC** (Attack Complexity) | Special conditions required? | Low, High |
| **PR** (Privileges Required) | Access level needed? | None, Low, High |
| **UI** (User Interaction) | Victim action required? | None, Required |
| **S** (Scope) | Impact beyond vulnerable component? | Unchanged, Changed |
| **C** (Confidentiality Impact) | Data disclosure? | None, Low, High |
| **I** (Integrity Impact) | Data modification? | None, Low, High |
| **A** (Availability Impact) | Service disruption? | None, Low, High |

**Example:** SQL Injection in authenticated API
- AV: Network (API accessible over internet)
- AC: Low (SQL injection is straightforward once authenticated)
- PR: Low (requires valid user account)
- UI: None (no victim interaction needed)
- S: Unchanged (impact limited to database, not other systems)
- C: High (full database read access)
- I: High (full database write access)
- A: Low (query performance impact, not full DoS)

### Step 5: Apply Temporal/Threat Metrics

**For CVSS 3.1 Temporal:**
- Exploit Code Maturity (E)
- Remediation Level (RL)
- Report Confidence (RC)

**For CVSS 4.0 Threat:**
- Exploit Maturity (E) only

**For theoretical threats** (not known CVEs), use conservative defaults:

**CVSS 3.1 defaults:**
```yaml
ExploitCodeMaturity: "Unproven" (0.91)  # We hypothesized this, no exploit exists yet
RemediationLevel: "Unavailable" (1.0)   # No fix available (it's theoretical)
ReportConfidence: "Reasonable" (0.96)   # Based on our analysis confidence
```

**CVSS 4.0 default:**
```yaml
ExploitMaturity: "Unreported" (U)  # Not actively exploited
```

See [references/temporal-threat-metrics.md](references/temporal-threat-metrics.md) for known CVE guidance.

### Step 6: Apply Environmental Metrics

Use Phase 1 mappings to set Security Requirements (CR, IR, AR).

**If Phase 1 data available:**
- Automatically derive CR/IR/AR from crown jewels and compliance
- Override Modified Base metrics if specific to environment (e.g., WAF reduces AC from Low to High)

**If manual entry needed:**
Ask user: "For this threat's impact on [CIA], how important is that to your business?"
- High (1.5) - Crown jewel, compliance-required, critical business function
- Medium (1.0) - Standard business data, normal operations
- Low (0.5) - Non-sensitive, non-critical, public information

See [references/environmental-metrics.md](references/environmental-metrics.md) for complete Phase 1 integration guidance.

### Step 7: Calculate Scores

**For CVSS 3.1:**
Use formulas from [references/calculation-formulas.md](references/calculation-formulas.md):
1. Calculate Base Score (from 8 Base metrics)
2. Calculate Temporal Score (Base × E × RL × RC)
3. Calculate Environmental Score (Modified Base × Temporal modifiers)

**For CVSS 4.0:**
Use MacroVector approach (lookup tables in FIRST.org JavaScript files):
1. Group metrics into EQ1-EQ6 equivalence sets
2. Look up MacroVector score
3. Interpolate within MacroVector for final score

**Tool recommendation:** For 4.0, consider using FIRST.org's official calculator due to MacroVector complexity.

### Step 8: Generate Output

Produce structured output for `threat-model.json`:

```typescript
{
  // ... existing threat fields ...

  cvss: {
    version: "3.1",

    base: {
      vector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:L",
      score: 8.3,
      severity: "High",
      metrics: { /* metric values */ }
    },

    temporal: {
      vector: "E:U/RL:U/RC:R",
      score: 7.5,
      metrics: { /* temporal values */ }
    },

    environmental: {
      vector: "CR:H/IR:H/AR:M/MAV:N/MAC:L/...",
      score: 9.2,  // THIS IS THE PRIORITIZATION SCORE
      securityRequirements: {
        confidentiality: "H",
        integrity: "H",
        availability: "M"
      },
      source: "phase-1-auto"
    },

    overall: {
      score: 9.2,  // Use Environmental if available, else Temporal, else Base
      severity: "Critical",
      vector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:L/E:U/RL:U/RC:R/CR:H/IR:H/AR:M"
    }
  }
}
```

**Key principle:** The **Environmental score** is the prioritization score because it reflects YOUR business risk, not generic severity.

## Critical Rules

### 🚨 Environmental Metrics Are Mandatory for Threat Modeling

**You MUST use Environmental metrics when scoring threats during threat modeling.**

**Why:** Without Environmental metrics, all threats get generic severity scores that don't reflect your business priorities. Phase 1 provides crown jewels, compliance requirements, and business impact - this MUST be factored into scoring.

**Not even when:**
- ❌ "It's faster to skip Environmental" → NO. Phase 1 auto-mapping is fast
- ❌ "We don't have Phase 1 data" → Then ask user for CR/IR/AR manually
- ❌ "Base score is enough for comparison" → NO. 9.8 for marketing site ≠ 9.8 for payment DB

**Exception:** Quick triage of hundreds of low-priority threats can use Base-only, but all medium+ threats MUST have Environmental scoring.

### Version Selection Default

**Always default to CVSS 4.0** unless:
1. Organization requires 3.1 for NVD compatibility
2. Integration with legacy security tools mandates 3.1
3. User explicitly requests 3.1 for consistency with existing assessments

**Reason:** 4.0 is the current industry standard (released 2023), providing better score differentiation and future-proof security tooling compatibility.

### Theoretical Threats Use Conservative Temporal Defaults

**Theoretical threats** (identified during threat modeling, not known CVEs):
- **Default** to "no exploit exists" (Unproven/Unreported)
- **Default** to "no fix available" (Unavailable remediation)
- This produces **conservative** scores (slightly lower than if exploit existed)

**Known CVEs:**
- Look up actual Temporal values from NVD, vendor advisories, threat intel
- Use current real-world exploit status

### Output Schema Consistency

**Always** produce the structured JSON output shown in Step 8, even if scoring manually.

**Required fields:**
- `version` (3.1 or 4.0)
- `base` with vector, score, severity
- `overall` with final score for prioritization
- `environmental` if Business context used (MUST for threat modeling)

## Progressive Disclosure

### Quick Start (Phase 3 Scoring)

1. Load this skill
2. Answer 2 questions (version, depth)
3. Assess 8 Base metrics using Quick Reference
4. Load Phase 1 business context for Environmental
5. Calculate using formulas
6. Output structured JSON

**Time:** 10-15 minutes per threat

### Detailed References

- **[Version Comparison](references/version-comparison.md)** - CVSS 3.1 vs 4.0 detailed analysis
- **[Base Metrics Guide](references/base-metrics-guide.md)** - How to assess each of 8 Base metrics
- **[Temporal/Threat Metrics](references/temporal-threat-metrics.md)** - Exploit maturity, remediation level
- **[Environmental Metrics](references/environmental-metrics.md)** - Phase 1 integration formulas
- **[Calculation Formulas](references/calculation-formulas.md)** - CVSS 3.1 math from FIRST.org spec

### Examples

- **[SQL Injection Scoring](examples/sql-injection-scoring.md)** - Complete walkthrough
- **[Authentication Bypass](examples/authentication-bypass.md)** - Auth threat example
- **[Privilege Escalation](examples/privilege-escalation.md)** - Privesc scoring

## Related Skills

- **threat-modeling-orchestrator** - Invokes this skill during Phase 3
- **business-context-discovery** - Produces Phase 1 data used for Environmental metrics
- **security-test-planning** - Phase 4 uses CVSS scores for test prioritization
- **threat-modeling** - Phase 3 STRIDE analysis that identifies threats to score
