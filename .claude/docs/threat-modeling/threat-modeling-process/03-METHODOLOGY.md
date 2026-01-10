# Threat Model Process: Methodology

**Document**: 3 of 6 - STRIDE + PASTA + DFD Methodology **Purpose**: Integrated
threat modeling framework combining three proven methodologies **Last
Synchronized**: 2026-01-10 **Status**: Ready for Implementation

---

## Document Metadata

| Property           | Value                                        |
| ------------------ | -------------------------------------------- |
| **Document ID**    | 03-METHODOLOGY                               |
| **Token Count**    | ~700 tokens                                  |
| **Read Time**      | 5-8 minutes                                  |
| **Prerequisites**  | 01-OVERVIEW-ARCHITECTURE, 02-SCOPE-CHECKPOINTS |
| **Next Documents** | 04-PHASE-DETAILS                             |

---

## Related Documents

This document is part of the Threat Model Process documentation series:

- **[01-OVERVIEW-ARCHITECTURE.md](01-OVERVIEW-ARCHITECTURE.md)** - Overview and
  architecture diagram
- **[02-SCOPE-CHECKPOINTS.md](02-SCOPE-CHECKPOINTS.md)** - Scope selection and
  checkpoints
- **[04-PHASE-DETAILS.md](04-PHASE-DETAILS.md)** - Phase 1-6 detailed
  specifications
- **[05-STATE-OUTPUT.md](05-STATE-OUTPUT.md)** - State management and output
  formats
- **[06-IMPLEMENTATION-ROADMAP.md](06-IMPLEMENTATION-ROADMAP.md)** -
  Implementation, tools, and roadmap

---

## Entry and Exit Criteria

### Entry Criteria

- Understanding of architecture and checkpoint workflows
- Familiarity with security threat concepts

### Exit Criteria

After reading this document, you should understand:

- STRIDE threat categorization framework
- PASTA risk-centric methodology
- DFD-based threat modeling principles
- The combined threat model output schema

---

## Threat Modeling Methodology

### Integrated Framework Approach

The threat modeling phase combines principles from three proven methodologies:

#### 1. STRIDE (Microsoft)

Systematic threat categorization per component:

| Category                   | Question                   | Focus                            |
| -------------------------- | -------------------------- | -------------------------------- |
| **S**poofing               | Can attacker impersonate?  | Identity, authentication         |
| **T**ampering              | Can attacker modify?       | Data integrity, input validation |
| **R**epudiation            | Can attacker deny actions? | Logging, audit trails            |
| **I**nfo Disclosure        | Can attacker access data?  | Authorization, encryption        |
| **D**enial of Service      | Can attacker disrupt?      | Availability, rate limiting      |
| **E**levation of Privilege | Can attacker escalate?     | Authorization, least privilege   |

#### 2. PASTA (Process for Attack Simulation and Threat Analysis)

Risk-centric, business-aligned approach:

| Stage                                  | Principle Applied                                     |
| -------------------------------------- | ----------------------------------------------------- |
| **Stage 1**: Define Objectives         | Understand business context and security requirements |
| **Stage 2**: Define Technical Scope    | Map application architecture and dependencies         |
| **Stage 3**: Application Decomposition | Identify components, data flows, trust boundaries     |
| **Stage 4**: Threat Analysis           | Identify threat actors and attack patterns            |
| **Stage 5**: Vulnerability Analysis    | Map weaknesses to threats                             |
| **Stage 6**: Attack Modeling           | Model attack trees and scenarios                      |
| **Stage 7**: Risk/Impact Analysis      | Prioritize by business impact                         |

#### 3. DFD-Based Threat Modeling (Microsoft SDL)

Data Flow Diagram principles for visualizing threats:

| Element               | Security Consideration                    |
| --------------------- | ----------------------------------------- |
| **External Entities** | Untrusted inputs, authentication required |
| **Processes**         | Validate inputs, handle errors securely   |
| **Data Stores**       | Encryption at rest, access controls       |
| **Data Flows**        | Encryption in transit, trust boundaries   |
| **Trust Boundaries**  | Where security controls must exist        |

### Combined Threat Model Output

```typescript
interface ThreatModelEntry {
  // Identification
  id: string;
  component: string;

  // STRIDE categorization
  strideCategory:
    | "Spoofing"
    | "Tampering"
    | "Repudiation"
    | "InfoDisclosure"
    | "DoS"
    | "ElevationOfPrivilege";

  // Threat details
  threat: string;
  threatActor: string; // From PASTA
  attackVector: string;
  attackTree?: string[]; // Attack path from PASTA Stage 6

  // DFD context
  affectedDataFlows: string[];
  trustBoundariesCrossed: string[];

  // Controls assessment
  existingControls: string[];
  controlGaps: string[];

  // CVSS 4.0 scoring (replaces legacy riskScore)
  cvss: {
    version: "4.0";
    base: {
      score: number;        // 0.0-10.0
      vector: string;       // CVSS:4.0/AV:N/AC:L/...
    };
    threat: {
      score: number;
      vector: string;
      exploitMaturity: "Attacked" | "POC" | "Unreported";
    };
    environmental: {
      score: number;        // Business-contextualized from Phase 1
      vector: string;       // Includes CR/IR/AR from business context
    };
    overall: {
      score: number;        // Final score (0.0-10.0)
      severity: "Critical" | "High" | "Medium" | "Low" | "None";
      priorityRank: number; // Ordering for test planning
    };
  };

  // Business context (from Phase 1)
  businessContext: {
    targetsCrownJewel: boolean;
    crownJewel?: string;
    businessImpactFinancial: string;
    relevantThreatActor: string;
  };

  // Remediation
  recommendedControls: string[];
  testingGuidance: string[];
}
```

---

**End of Document 3 of 6**

**Continue to**: [04-PHASE-DETAILS.md](04-PHASE-DETAILS.md) for Phase 1-6
detailed specifications
