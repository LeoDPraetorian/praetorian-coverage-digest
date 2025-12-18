# Phase 3 Output Schemas

**CRITICAL: Phase 4 (security-test-planning) requires ALL of these files with exact schemas.**

## Required Output Directory Structure

```
.claude/.threat-model/{session}/phase-3/
├── threat-model.json           # ALL threats with STRIDE categorization
├── abuse-cases/                # Per-category abuse scenarios
│   ├── authentication-abuse.json
│   ├── authorization-abuse.json
│   ├── data-abuse.json
│   └── api-abuse.json
├── attack-trees/               # Attack path visualizations
│   ├── credential-theft.md
│   ├── data-exfiltration.md
│   └── privilege-escalation.md
├── dfd-threats.json            # Threats mapped to DFD elements
├── risk-matrix.json            # Risk scores and prioritization
└── summary.md                  # <2000 token compressed summary
```

---

## 1. threat-model.json

**Purpose**: Comprehensive list of ALL identified threats with STRIDE categorization and risk scoring.

**Schema**:
```typescript
interface ThreatModel {
  sessionId: string;
  timestamp: string;
  scope: {
    type: "full" | "component" | "incremental";
    paths?: string[];
  };
  threats: ThreatModelEntry[];
  summary: {
    totalThreats: number;
    byRisk: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    byStride: {
      spoofing: number;
      tampering: number;
      repudiation: number;
      infoDisclosure: number;
      dos: number;
      elevationOfPrivilege: number;
    };
  };
}

interface ThreatModelEntry {
  // Identification
  id: string;                    // e.g., "THREAT-001"
  component: string;             // From Phase 1 components

  // STRIDE categorization
  strideCategory:
    | "Spoofing"
    | "Tampering"
    | "Repudiation"
    | "InfoDisclosure"
    | "DoS"
    | "ElevationOfPrivilege";

  // Threat details
  threat: string;                // Specific threat description
  threatActor: string;           // From PASTA: external attacker, insider, etc.
  attackVector: string;          // How the attack is executed
  attackTree?: string[];         // Attack path steps

  // DFD context (from Phase 1)
  affectedDataFlows: string[];   // Which data flows are vulnerable
  trustBoundariesCrossed: string[];  // Which boundaries are violated

  // Controls assessment (from Phase 2)
  existingControls: string[];    // Controls in place
  controlGaps: string[];         // Missing or weak controls

  // Risk scoring (PASTA Stage 7)
  businessImpact: "Critical" | "High" | "Medium" | "Low";
  likelihood: "High" | "Medium" | "Low";
  riskScore: number;             // 1-12 (Impact × Likelihood)

  // Remediation
  recommendedControls: string[];
  testingGuidance: string[];     // For Phase 4
}
```

See full schema with examples in this file (output-schemas.md lines 30-120)

---

## 2. abuse-cases/*.json - Abuse Case Scenarios

**Files**: authentication-abuse.json, authorization-abuse.json, data-abuse.json, api-abuse.json

Contains detailed attack scenarios for HIGH/CRITICAL threats showing step-by-step attack execution.

---

## 3. attack-trees/*.md - Attack Path Visualizations

**Files**: credential-theft.md, data-exfiltration.md, privilege-escalation.md

Visual representation of attack paths using markdown tree structure with success/failure conditions.

---

## 4-6. Supporting Files

- **dfd-threats.json**: Maps threats to DFD elements from Phase 1
- **risk-matrix.json**: Risk prioritization matrix
- **summary.md**: <2000 token compressed summary for Phase 4

See full schemas and examples in output-schemas.md