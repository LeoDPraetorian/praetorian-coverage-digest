# Phase 3: Threat Modeling Workflow

**Detailed workflow for orchestrating Phase 3 of threat modeling.**

## Overview

Phase 3 identifies threats using integrated methodology:
- **STRIDE** - Systematic threat categorization
- **PASTA** - Risk-centric, business-aligned analysis
- **DFD** - Data flow diagram threat mapping

## Execution Strategy

**This phase runs sequentially** - requires holistic view of:
- Phase 1 architecture and data flows
- Phase 2 security controls and gaps

### Load Required Inputs

```
Read .claude/.threat-model/{session}/phase-1/summary.md
Read .claude/.threat-model/{session}/phase-1/data-flows.json
Read .claude/.threat-model/{session}/phase-1/trust-boundaries.json
Read .claude/.threat-model/{session}/phase-2/summary.md
Read .claude/.threat-model/{session}/phase-2/control-gaps.json
```

### Apply Threat Modeling Skill

```
skill: "threat-modeling"
```

The skill provides:
- STRIDE analysis per component
- PASTA attack simulation
- DFD-based threat mapping
- Risk scoring methodology

## STRIDE Analysis

For each component from Phase 1:

| Category | Question | Focus |
|----------|----------|-------|
| **S**poofing | Can attacker impersonate? | Authentication |
| **T**ampering | Can attacker modify? | Input validation |
| **R**epudiation | Can attacker deny actions? | Audit logging |
| **I**nfo Disclosure | Can attacker access data? | Authorization |
| **D**enial of Service | Can attacker disrupt? | Rate limiting |
| **E**levation of Privilege | Can attacker escalate? | Authorization |

## Required Artifacts

| Artifact | Description |
|----------|-------------|
| `threat-model.json` | Structured threat entries |
| `abuse-cases/*.json` | Per-category abuse scenarios |
| `attack-trees/*.md` | Attack path diagrams |
| `dfd-threats.json` | Threats mapped to data flows |
| `risk-matrix.json` | Impact × Likelihood scoring |
| `summary.md` | <2000 tokens with top risks |

## Threat Entry Schema

```json
{
  "id": "THREAT-001",
  "component": "user-api",
  "strideCategory": "Spoofing",
  "threat": "Attacker steals JWT token via XSS",
  "threatActor": "External attacker",
  "attackVector": "Reflected XSS in search parameter",
  "affectedDataFlows": ["user-input → api → response"],
  "trustBoundariesCrossed": ["internet → application"],
  "existingControls": ["CSP headers"],
  "controlGaps": ["No HttpOnly on session cookie"],
  "businessImpact": "High",
  "likelihood": "Medium",
  "riskScore": 6,
  "recommendedControls": ["Set HttpOnly flag", "Implement token rotation"],
  "testingGuidance": ["Test XSS in search", "Verify cookie flags"]
}
```

## Risk Scoring

```
Risk Score = Business Impact × Likelihood

Business Impact:
  Critical (4) - Business-ending, regulatory violation
  High (3)     - Significant revenue/data loss
  Medium (2)   - Limited impact
  Low (1)      - Minimal impact

Likelihood:
  High (3)   - Easily exploitable
  Medium (2) - Requires skill
  Low (1)    - Difficult to exploit

Risk Matrix:
  Critical (9-12): Immediate action
  High (6-8):      Current sprint
  Medium (3-5):    Plan remediation
  Low (1-2):       Accept or defer
```

## Checkpoint Preparation

Before presenting checkpoint, ensure:
- [ ] All components analyzed with STRIDE
- [ ] Abuse cases documented
- [ ] Risk scores calculated
- [ ] Top threats identified
- [ ] Summary under 2000 tokens
