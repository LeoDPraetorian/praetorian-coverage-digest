# Phase 5: Threat Modeling Workflow

**Detailed workflow for orchestrating Phase 5 of threat modeling.**

## Overview

Phase 5 identifies threats using integrated methodology:
- **STRIDE** - Systematic threat categorization
- **PASTA** - Risk-centric, business-aligned analysis
- **DFD** - Data flow diagram threat mapping

## Execution Strategy

**This phase runs sequentially** - requires holistic view of:
- Phase 3 architecture and data flows
- Phase 4 security controls and gaps

### Load Required Inputs

```
Read .claude/.output/threat-modeling/{timestamp}-{slug}/phase-3/summary.md
Read .claude/.output/threat-modeling/{timestamp}-{slug}/phase-3/data-flows.json
Read .claude/.output/threat-modeling/{timestamp}-{slug}/phase-3/trust-boundaries.json
Read .claude/.output/threat-modeling/{timestamp}-{slug}/phase-4/summary.md
Read .claude/.output/threat-modeling/{timestamp}-{slug}/phase-4/control-gaps.json
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

For each component from Phase 3:

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
| `risk-matrix.json` | CVSS severity band distribution |
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
  "cvss": {
    "version": "4.0",
    "base": {
      "score": 7.5,
      "vector": "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:L/VI:L/VA:N/SC:N/SI:N/SA:N"
    },
    "threat": {
      "score": 8.0,
      "vector": "CVSS:4.0/E:A",
      "exploitMaturity": "Attacked"
    },
    "environmental": {
      "score": 8.8,
      "vector": "CVSS:4.0/CR:H/IR:H/AR:M"
    },
    "overall": {
      "score": 8.8,
      "severity": "High",
      "priorityRank": 3
    }
  },
  "businessContext": {
    "targetsCrownJewel": true,
    "crownJewel": "user_session_data",
    "businessImpactFinancial": "$1.2M account takeover",
    "relevantThreatActor": "financially_motivated_cybercriminals"
  },
  "recommendedControls": ["Set HttpOnly flag", "Implement token rotation"],
  "testingGuidance": ["Test XSS in search", "Verify cookie flags"]
}
```

## CVSS 4.0 Scoring (Step 3)

**After STRIDE threat identification**, invoke `scoring-cvss-threats` skill for each threat:

```
For each threat:
  1. Prepare Phase 1 business context + Phase 3 architecture
  2. Invoke scoring-cvss-threats skill with threat details
  3. Capture CVSS scores (base, threat, environmental, overall)
  4. Add CVSS structure to threat entry

CVSS Severity Bands:
  Critical (9.0-10.0): Immediate action
  High (7.0-8.9):      Current sprint
  Medium (4.0-6.9):    Plan remediation
  Low (0.1-3.9):       Accept or defer
  None (0.0):          Informational only
```

**Use Environmental Score** (business-contextualized) for prioritization, not Base Score (generic).

## Checkpoint Preparation

Before presenting checkpoint, ensure:
- [ ] All components analyzed with STRIDE
- [ ] Abuse cases documented
- [ ] Risk scores calculated
- [ ] Top threats identified
- [ ] Summary under 2000 tokens

## Error Handling

For error recovery procedures, see [parallel-execution-and-error-handling.md](parallel-execution-and-error-handling.md).

### Phase-Specific Errors

| Error                  | Symptom                          | Recovery                                       |
| ---------------------- | -------------------------------- | ---------------------------------------------- |
| Generic threats        | Threats lack specific locations  | Verify Phase 3/4 artifacts loaded              |
| Missing CVSS scores    | Threats have no cvss field       | Re-run with scoring-cvss-threats skill                 |
| STRIDE incomplete      | Categories missing               | Verify all components analyzed                 |

### Escalation

If recovery fails:
1. Save partial results to `phase-5/partial/`
2. Record error in `metadata.json`
3. Present checkpoint with error summary
4. User decides: retry, skip, or abort
