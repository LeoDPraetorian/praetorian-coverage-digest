# Handoff Protocol

## Overview

Between each phase, write a handoff file to compress findings for downstream use. Phases run in separate contexts, so handoffs ensure critical information propagates forward.

## Handoff File Structure

```json
{
  "sessionId": "{timestamp}-{slug}",
  "fromPhase": 1,
  "toPhase": 2,
  "timestamp": "2024-12-17T10:30:00Z",
  "summary": {
    "keyFindings": ["..."],
    "criticalRisks": ["..."],
    "crownJewels": ["payment_data", "user_credentials"],
    "complianceContext": ["PCI-DSS Level 1"],
    "userFeedback": ["..."]
  },
  "artifacts": [
    {"name": "phase-1-summary", "path": "phase-1/summary.md", "loadWhen": "always"},
    {"name": "entry-points.json", "path": "phase-3/entry-points.json", "loadWhen": "always"}
  ],
  "nextPhaseGuidance": "Focus on authentication controls first"
}
```

## Required Fields

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `sessionId` | string | Session identifier (YYYYMMDD-HHMMSS format) | Yes |
| `fromPhase` | number | Source phase (1-6) | Yes |
| `toPhase` | number | Destination phase (2-6) | Yes |
| `timestamp` | string | ISO 8601 timestamp | Yes |
| `summary` | object | Compressed findings | Yes |
| `artifacts` | array | File references for downstream | Yes |
| `nextPhaseGuidance` | string | Execution hints for next phase | Optional |

## Summary Object Fields

| Field | Type | Description | When Required |
|-------|------|-------------|---------------|
| `keyFindings` | string[] | Top 3-5 discoveries from this phase | Always |
| `criticalRisks` | string[] | High-severity issues requiring attention | If any found |
| `crownJewels` | string[] | Most sensitive assets (from Phase 1) | Phase 2+ |
| `complianceContext` | string[] | Applicable regulations (from Phase 1) | Phase 2+ |
| `userFeedback` | string[] | User comments at checkpoint | If provided |

## Phase 1 in Handoffs

All handoffs from Phase 2 onward **MUST** include Phase 1 summary with:
- Crown jewels identification
- Threat actor profiles
- Compliance requirements
- Business impact context

This enables risk-based analysis in downstream phases.

## Artifacts Array

Each artifact entry specifies a file to load in the next phase:

```json
{
  "name": "component-analysis",
  "path": "phase-1/components/api-handler.json",
  "loadWhen": "always" | "if_relevant" | "on_demand"
}
```

**Load conditions:**
- `always` - Critical for next phase (e.g., Phase 1 summary, entry points)
- `if_relevant` - Load if domain matches next phase focus
- `on_demand` - Load only if explicitly referenced

## Example Handoffs

### Phase 1 → Phase 2

```json
{
  "sessionId": "20250117-143022",
  "fromPhase": 1,
  "toPhase": 2,
  "timestamp": "2025-01-17T15:00:00Z",
  "summary": {
    "keyFindings": [
      "Application processes payment card data (PCI-DSS Level 1)",
      "Crown jewels: payment transactions, cardholder data, API keys",
      "Primary threat actors: External attackers (financial motivation)",
      "Business impact: $5M+ per breach, regulatory fines up to $500K"
    ],
    "crownJewels": ["payment_transactions", "cardholder_data", "api_keys"],
    "complianceContext": ["PCI-DSS Level 1", "SOC 2 Type II"],
    "userFeedback": ["Focus on payment processing components first"]
  },
  "artifacts": [
    {"name": "business-objectives", "path": "phase-1/business-objectives.json", "loadWhen": "always"},
    {"name": "data-classification", "path": "phase-1/data-classification.json", "loadWhen": "always"},
    {"name": "threat-actors", "path": "phase-1/threat-actors.json", "loadWhen": "always"},
    {"name": "phase-1-summary", "path": "phase-1/summary.md", "loadWhen": "always"}
  ],
  "nextPhaseGuidance": "Prioritize payment processing components (./src/payment/) in codebase sizing"
}
```

### Phase 2 → Phase 3

```json
{
  "sessionId": "20250117-143022",
  "fromPhase": 2,
  "toPhase": 3,
  "timestamp": "2025-01-17T16:30:00Z",
  "summary": {
    "keyFindings": [
      "Codebase sized at 5,200 files across 8 components",
      "Tier: MEDIUM - parallel execution recommended",
      "Payment processing in ./src/payment/ - crown jewel component (800 files)",
      "Recommended 4 parallel agents for codebase mapping"
    ],
    "criticalRisks": [],
    "crownJewels": ["payment_transactions", "cardholder_data", "api_keys"],
    "complianceContext": ["PCI-DSS Level 1", "SOC 2 Type II"]
  },
  "artifacts": [
    {"name": "phase-1-summary", "path": "phase-1/summary.md", "loadWhen": "always"},
    {"name": "sizing-report", "path": "phase-2/sizing-report.json", "loadWhen": "always"},
    {"name": "components", "path": "phase-2/components.json", "loadWhen": "always"}
  ],
  "nextPhaseGuidance": "Use sizing strategy for parallel codebase mapping - spawn 4 agents per components_to_spawn"
}
```

### Phase 3 → Phase 4

```json
{
  "sessionId": "20250117-143022",
  "fromPhase": 3,
  "toPhase": 4,
  "timestamp": "2025-01-17T17:30:00Z",
  "summary": {
    "keyFindings": [
      "15 entry points identified (5 public APIs, 10 internal endpoints)",
      "Payment processing in ./src/payment/ - crown jewel component",
      "3 trust boundaries: client ↔ API ↔ database ↔ payment gateway",
      "Data flows: PII through 8 components, PCI through 3 components"
    ],
    "criticalRisks": [
      "Payment API lacks rate limiting (entry-points.json)",
      "Database credentials in environment variables"
    ],
    "crownJewels": ["payment_transactions", "cardholder_data", "api_keys"],
    "complianceContext": ["PCI-DSS Level 1", "SOC 2 Type II"]
  },
  "artifacts": [
    {"name": "phase-1-summary", "path": "phase-1/summary.md", "loadWhen": "always"},
    {"name": "entry-points", "path": "phase-3/entry-points.json", "loadWhen": "always"},
    {"name": "trust-boundaries", "path": "phase-3/trust-boundaries.json", "loadWhen": "always"},
    {"name": "data-flows", "path": "phase-3/data-flows.json", "loadWhen": "if_relevant"}
  ],
  "nextPhaseGuidance": "Focus security controls review on payment processing authentication and PCI compliance"
}
```

### Phase 4 → Phase 5

```json
{
  "sessionId": "20250117-143022",
  "fromPhase": 4,
  "toPhase": 5,
  "timestamp": "2025-01-17T18:00:00Z",
  "summary": {
    "keyFindings": [
      "Authentication: JWT tokens with 1-hour expiry",
      "Authorization: RBAC with 5 roles, no fine-grained permissions",
      "Input validation: Partial (API only, no client-side)",
      "Cryptography: TLS 1.3, AES-256-GCM for data at rest"
    ],
    "criticalRisks": [
      "Missing input validation in 3 payment endpoints",
      "No rate limiting on authentication endpoint",
      "Secrets in environment variables (not encrypted)"
    ],
    "crownJewels": ["payment_transactions", "cardholder_data", "api_keys"],
    "complianceContext": ["PCI-DSS Level 1", "SOC 2 Type II"]
  },
  "artifacts": [
    {"name": "phase-1-summary", "path": "phase-1/summary.md", "loadWhen": "always"},
    {"name": "control-gaps", "path": "phase-4/control-gaps.json", "loadWhen": "always"},
    {"name": "authentication", "path": "phase-4/authentication.json", "loadWhen": "if_relevant"},
    {"name": "authorization", "path": "phase-4/authorization.json", "loadWhen": "if_relevant"}
  ],
  "nextPhaseGuidance": "Threat modeling should focus on authentication bypass, input validation gaps, and secrets exposure"
}
```

### Phase 5 → Phase 6

```json
{
  "sessionId": "20250117-143022",
  "fromPhase": 5,
  "toPhase": 6,
  "timestamp": "2025-01-17T19:30:00Z",
  "summary": {
    "keyFindings": [
      "23 threats identified (8 Critical, 9 High, 6 Medium)",
      "Top CVSS scores: Authentication bypass (9.1), SQL injection (8.6), XSS (7.3)",
      "STRIDE coverage: Spoofing (5), Tampering (4), Repudiation (2), Info disclosure (6), DoS (3), Elevation (3)",
      "Business impact: Payment fraud, data breach, compliance violations"
    ],
    "criticalRisks": [
      "T-001: Authentication bypass via JWT expiry race condition (CVSS 9.1)",
      "T-003: SQL injection in payment search (CVSS 8.6)",
      "T-007: Secrets exposure in logs (CVSS 8.2)"
    ],
    "crownJewels": ["payment_transactions", "cardholder_data", "api_keys"],
    "complianceContext": ["PCI-DSS Level 1", "SOC 2 Type II"]
  },
  "artifacts": [
    {"name": "phase-1-summary", "path": "phase-1/summary.md", "loadWhen": "always"},
    {"name": "threat-model", "path": "phase-5/threat-model.json", "loadWhen": "always"},
    {"name": "risk-matrix", "path": "phase-5/risk-matrix.json", "loadWhen": "always"},
    {"name": "entry-points", "path": "phase-3/entry-points.json", "loadWhen": "if_relevant"}
  ],
  "nextPhaseGuidance": "Prioritize test plan by CVSS Environmental scores - focus on Critical/High threats first"
}
```

## Storage Location

Handoff files are stored in `.claude/.output/threat-modeling/{timestamp}-{slug}/handoffs/`:

```
handoffs/
├── phase-1-to-2.json
├── phase-2-to-3.json
├── phase-3-to-4.json
├── phase-4-to-5.json
└── phase-5-to-6.json
```

## Token Budget Considerations

Handoffs are designed to stay under 2000 tokens each:

- **Summary section**: 500-800 tokens (concise findings)
- **Artifacts list**: 200-400 tokens (file references only, not content)
- **Phase 1 context**: 300-500 tokens (crown jewels, compliance, threat actors)
- **Next phase guidance**: 100-200 tokens (execution hints)

**Total per handoff**: ~1100-1900 tokens (fits in context window)

## Related

- [Main skill](../SKILL.md)
- [Handoff schema reference](handoff-schema.md) - Complete JSON schema specification
- [Checkpoint prompts](checkpoint-prompts.md) - Human approval templates
