# Phase 3 Output Schemas

**CRITICAL: Phase 4 (security-test-planning) requires ALL of these files with exact schemas.**

## Required Output Directory Structure

```
.claude/.output/threat-modeling/{timestamp}-{slug}/phase-3/
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
    byCvssSeverity: {
      critical: number; // CVSS 9.0-10.0
      high: number; // CVSS 7.0-8.9
      medium: number; // CVSS 4.0-6.9
      low: number; // CVSS 0.1-3.9
      none: number; // CVSS 0.0
    };
    byStride: {
      spoofing: number;
      tampering: number;
      repudiation: number;
      infoDisclosure: number;
      dos: number;
      elevationOfPrivilege: number;
    };
    scoringMethodology: "CVSS 4.0";
    prioritizationBasis: "Environmental Score (business-contextualized)";
  };
}

interface ThreatModelEntry {
  // Identification
  id: string; // e.g., "THREAT-001"
  component: string; // From Phase 1 components

  // STRIDE categorization
  strideCategory:
    | "Spoofing"
    | "Tampering"
    | "Repudiation"
    | "InfoDisclosure"
    | "DoS"
    | "ElevationOfPrivilege";

  // Threat details
  threat: string; // Specific threat description
  threatActor: string; // From PASTA: external attacker, insider, etc.
  attackVector: string; // How the attack is executed
  attackTree?: string[]; // Attack path steps

  // DFD context (from Phase 1)
  affectedDataFlows: string[]; // Which data flows are vulnerable
  trustBoundariesCrossed: string[]; // Which boundaries are violated

  // Controls assessment (from Phase 2)
  existingControls: string[]; // Controls in place
  controlGaps: string[]; // Missing or weak controls

  // CVSS 4.0 Scoring (from Step 3)
  cvss: {
    version: "4.0";
    base: {
      score: number; // 0.0-10.0
      vector: string; // e.g., "CVSS:4.0/AV:N/AC:L/..."
      exploitability: {
        attackVector: "Network" | "Adjacent" | "Local" | "Physical";
        attackComplexity: "Low" | "High";
        attackRequirements: "None" | "Present";
        privilegesRequired: "None" | "Low" | "High";
        userInteraction: "None" | "Passive" | "Active";
      };
      impact: {
        confidentiality: "None" | "Low" | "High";
        integrity: "None" | "Low" | "High";
        availability: "None" | "Low" | "High";
      };
    };
    threat: {
      score: number; // 0.0-10.0
      vector: string; // e.g., "CVSS:4.0/E:A/..."
      exploitMaturity: "Unreported" | "POC" | "Functional" | "High" | "Attacked";
    };
    environmental: {
      score: number; // 0.0-10.0 (business-contextualized)
      vector: string; // e.g., "CVSS:4.0/CR:H/IR:H/AR:M/..."
      modifiedBase: {
        confidentialityRequirement: "Low" | "Medium" | "High";
        integrityRequirement: "Low" | "Medium" | "High";
        availabilityRequirement: "Low" | "Medium" | "High";
      };
    };
    overall: {
      score: number; // 0.0-10.0 (final score)
      severity: "None" | "Low" | "Medium" | "High" | "Critical";
      priorityRank: number; // Sorted rank by environmental score
    };
  };

  // Business context (from Phase 1)
  businessContext: {
    targetsCrownJewel: boolean;
    crownJewel?: string; // e.g., "payment_card_data"
    businessImpactFinancial: string; // e.g., "$365M breach cost"
    relevantThreatActor: string; // e.g., "financially_motivated_cybercriminals"
    complianceImpact?: string; // e.g., "PCI-DSS 3.4 violation"
  };

  // Remediation
  recommendedControls: string[];
  testingGuidance: string[]; // For Phase 4
}
```

See full schema with examples in this file (output-schemas.md lines 30-120)

---

## 2. abuse-cases/\*.json - Abuse Case Scenarios

**Files**: authentication-abuse.json, authorization-abuse.json, data-abuse.json, api-abuse.json

Contains detailed attack scenarios for HIGH/CRITICAL threats showing step-by-step attack execution.

---

## 3. attack-trees/\*.md - Attack Path Visualizations

**Files**: credential-theft.md, data-exfiltration.md, privilege-escalation.md

Visual representation of attack paths using markdown tree structure with success/failure conditions.

---

## 4-6. Supporting Files

- **dfd-threats.json**: Maps threats to DFD elements from Phase 1
- **risk-matrix.json**: Risk prioritization matrix
- **summary.md**: <2000 token compressed summary for Phase 4

See full schemas and examples in output-schemas.md
