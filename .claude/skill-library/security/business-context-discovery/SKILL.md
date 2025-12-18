---
name: business-context-discovery
description: Use when starting threat modeling - discovers business context, data classification, threat actors, compliance requirements, and security objectives before technical codebase analysis
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, AskUserQuestion
---

# Business Context Discovery

**Phase 0 of threat modeling workflow - understanding WHAT you're protecting and WHY before analyzing HOW it's built.**

## When to Use

Use this skill when:
- Starting a threat modeling engagement (`/threat-model` command)
- Phase 0 of STRIDE/PASTA/DFD threat modeling methodology
- User requests security assessment or risk analysis
- Preparing to map security controls or create test plans
- Need business context before technical codebase analysis

**Do NOT skip this phase.** Technical threat models without business context produce security theater, not risk management.

**You MUST use TodoWrite before starting** to track all workflow steps (Step 1-9). This is a multi-step process requiring systematic progress tracking.

## Why This Matters

PASTA Stage 1 ("Define Objectives") requires understanding business context BEFORE technical analysis:
- **Risk = Likelihood × Impact** - Can't assess impact without knowing business consequences
- **Threat actor profiling** - Different attackers target different industries/data
- **Compliance requirements** - Regulatory context determines required controls
- **Crown jewels identification** - Focus security efforts on what matters most
- **Test prioritization** - Business criticality guides testing resources

## Quick Reference

| Discovery Area | Key Questions | Output File |
|----------------|---------------|-------------|
| **Business Purpose** | What does app do? Who uses it? | `business-objectives.json` |
| **Data Classification** | PII? PHI? Financial? Credentials? | `data-classification.json` |
| **Threat Actors** | Who would attack? Motivations? | `threat-actors.json` |
| **Business Impact** | Consequences of breach? | `business-impact.json` |
| **Compliance** | SOC2? PCI-DSS? HIPAA? GDPR? | `compliance-requirements.json` |
| **Security Objectives** | Protection priorities? Risk tolerance? | `security-objectives.json` |

## Implementation

### Step 1: Create Session Directory

```bash
# Create Phase 0 output directory
mkdir -p .claude/.threat-model/{session-id}/phase-0
cd .claude/.threat-model/{session-id}/phase-0
```

### Step 2: Business Purpose Discovery

Ask structured questions via AskUserQuestion (see [references/interview-questions.md](references/interview-questions.md)):

**Core questions:**
- What does this application do in one sentence?
- Who are the primary users (employees, customers, partners)?
- What business processes does it support?
- What business value does it provide?

**Output**: `business-objectives.json`

```json
{
  "application_name": "...",
  "primary_purpose": "...",
  "users": ["employees", "customers", "partners"],
  "business_processes": ["..."],
  "business_value": "..."
}
```

### Step 3: Data Classification

Identify sensitive data types (see [references/data-classification.md](references/data-classification.md)):

**Key questions:**
- Does it handle PII (names, emails, addresses)?
- Does it handle financial data (payments, account numbers)?
- Does it handle credentials/secrets (passwords, API keys)?
- Does it handle health information (PHI)?
- What's the most sensitive data it touches?

**Output**: `data-classification.json`

```json
{
  "data_types": [
    {
      "category": "PII",
      "examples": ["email", "name", "address"],
      "sensitivity": "high",
      "regulatory_requirements": ["GDPR", "CCPA"]
    }
  ],
  "crown_jewels": ["payment_data", "user_credentials"]
}
```

### Step 4: Threat Actor Profiling

Identify who would attack and why (see [references/threat-actor-profiles.md](references/threat-actor-profiles.md)):

**Key questions:**
- Is this internet-facing or internal only?
- Who would benefit from compromising this?
- Are there known competitors or nation-state interests?
- Is insider threat a concern?
- What attacker skill level is realistic?

**Output**: `threat-actors.json`

```json
{
  "threat_actors": [
    {
      "name": "Opportunistic attackers",
      "motivation": "financial_gain",
      "capability": "script_kiddie",
      "likely_targets": ["payment_data", "credentials"],
      "attack_vectors": ["web_vulnerabilities", "credential_stuffing"]
    }
  ]
}
```

### Step 5: Business Impact Assessment

Quantify consequences of compromise (see [references/impact-assessment.md](references/impact-assessment.md)):

**Key questions:**
- What happens if data is leaked?
- What happens if service is unavailable?
- Are there regulatory notification requirements?
- Estimated financial impact of breach?
- Reputational damage concerns?

**Output**: `business-impact.json`

```json
{
  "impact_categories": {
    "financial": {
      "data_breach": "$1M-$10M (regulatory fines + incident response)",
      "downtime": "$50K per hour"
    },
    "regulatory": {
      "breach_notification": "GDPR 72-hour requirement",
      "fines": "4% annual revenue"
    },
    "reputational": "Critical - customer trust dependency"
  }
}
```

### Step 6: Compliance Requirements

Identify applicable regulations and standards (see [references/compliance-mapping.md](references/compliance-mapping.md)):

**Key questions:**
- SOC2, PCI-DSS, HIPAA, GDPR applicable?
- Contractual security requirements from customers?
- Internal security policies to follow?
- Industry-specific requirements?

**Output**: `compliance-requirements.json`

```json
{
  "regulations": [
    {
      "name": "SOC2 Type II",
      "applicable": true,
      "requirements": ["access_control", "encryption", "audit_logging"],
      "audit_frequency": "annual"
    }
  ],
  "contractual": ["customer_data_isolation", "penetration_testing"]
}
```

### Step 7: Security Objectives

Define protection priorities and risk tolerance:

**Key questions:**
- What are we trying to protect most?
- Confidentiality, integrity, or availability priority?
- Acceptable risk level (risk appetite)?
- Recovery time objectives (RTO)?

**Output**: `security-objectives.json`

```json
{
  "protection_priorities": [
    "customer_payment_data",
    "user_credentials",
    "business_logic_integrity"
  ],
  "cia_priority": "confidentiality > integrity > availability",
  "risk_appetite": "low",
  "rto": "4 hours"
}
```

### Step 8: Create Summary for Handoff

Generate compressed summary (<2000 tokens) for Phase 1:

**Output**: `summary.md`

```markdown
# Phase 0 Summary: Business Context

## Application
{App name} - {One-line description}

## Crown Jewels
- {Data type 1} - {Why sensitive}
- {Data type 2} - {Why sensitive}

## Key Threat Actors
- {Actor 1}: {Motivation, capability}

## Compliance Context
- {Regulation 1}: {Key requirements}

## Business Impact
- Data breach: {Financial + regulatory}
- Downtime: {Cost + SLA impact}

## Next Phase Guidance
- Focus Phase 1 mapping on: {Components handling crown jewels}
- Prioritize Phase 2 controls: {Required by compliance}
- Phase 3 threat actors: {Most relevant profiles}
- Phase 4 test priorities: {High-impact areas}
```

### Step 9: User Checkpoint

Present findings via AskUserQuestion:

```
## Phase 0 Complete: Business Context Discovery

### What I Found:
- Application purpose: {summary}
- Sensitive data: {list}
- Threat actors: {list}
- Compliance: {list}

### Questions for You:
- Is this business understanding correct?
- Any sensitive data I missed?
- Any threat actors I should consider?
- Any compliance requirements I overlooked?

**Approve to proceed to Phase 1: Codebase Mapping?** [Yes/No/Revise]
```

## How This Feeds Into Later Phases

| Phase | Uses Business Context For |
|-------|---------------------------|
| **Phase 1: Codebase Mapping** | Focus on components handling classified data; prioritize entry points by business criticality; map data flows for crown jewels |
| **Phase 2: Security Controls** | Evaluate controls against compliance requirements; check for data-specific protections (encryption, access controls) |
| **Phase 3: Threat Modeling** | Apply relevant threat actor profiles; score business impact accurately using financial/regulatory data; prioritize threats targeting crown jewels |
| **Phase 4: Security Test Planning** | Focus tests on high-impact areas; include compliance validation tests; prioritize by business risk scores |

## Critical Rules

### 1. Interactive, Not Automated

This phase **requires user input**. You cannot infer business context from code alone:
- ❌ Wrong: "I'll scan README and infer business purpose"
- ✅ Right: "I need to interview you about business context"

### 2. Document Assumptions

If user provides incomplete information, document assumptions explicitly:

```json
{
  "assumptions": [
    "Assuming SOC2 compliance based on enterprise customer mention",
    "No HIPAA requirement confirmed (no PHI handling mentioned)",
    "Estimated breach cost based on similar company size"
  ]
}
```

### 3. No Overpromising

Don't claim to "fully understand" complex businesses in 10 minutes:
- Document what you learned
- Flag areas needing deeper analysis
- Recommend follow-up interviews if needed

### 4. Crown Jewels Are Relative

"Most sensitive data" is context-specific:
- Fintech: Payment data, account balances
- Healthcare: PHI, medical records
- SaaS: Customer secrets, API keys
- E-commerce: Payment methods, PII

Ask: "What data would cause the most damage if leaked?"

## Examples

See [examples/healthcare-app.md](examples/healthcare-app.md) for complete healthcare application discovery.

See [examples/fintech-platform.md](examples/fintech-platform.md) for financial services example.

## References

- [references/interview-questions.md](references/interview-questions.md) - Complete question bank by category
- [references/data-classification.md](references/data-classification.md) - PII, PHI, PCI, secrets classification guide
- [references/threat-actor-profiles.md](references/threat-actor-profiles.md) - Common attacker archetypes by industry
- [references/impact-assessment.md](references/impact-assessment.md) - FAIR framework for business impact scoring
- [references/compliance-mapping.md](references/compliance-mapping.md) - SOC2, PCI-DSS, HIPAA, GDPR requirements

## Related Skills

- `threat-modeling-orchestrator` - Invokes this skill as Phase 0
- `codebase-mapping` - Phase 1, uses business context to focus analysis
- `security-controls-mapping` - Phase 2, evaluates against compliance requirements
- `threat-modeling` - Phase 3, applies threat actor profiles and impact scoring
- `security-test-planning` - Phase 4, prioritizes tests by business risk
