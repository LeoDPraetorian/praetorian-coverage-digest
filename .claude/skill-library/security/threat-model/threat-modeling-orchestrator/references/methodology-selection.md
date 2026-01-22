# Methodology Selection

## Overview

Users can choose their preferred threat modeling methodology based on their assessment needs, time constraints, and organizational requirements. This flexibility allows for tailored security analysis approaches.

## Available Methodologies

### 1. Hybrid STRIDE + PASTA + DFD (Recommended)

**Best for:** Comprehensive threat coverage across technical and business contexts

**What it includes:**

- **STRIDE** - Microsoft's 6-category threat taxonomy for systematic categorization
- **PASTA** - Process for Attack Simulation & Threat Analysis (7-stage business-aligned approach)
- **DFD** - Data Flow Diagram-based trust boundary analysis

**When to use:**

- Full application threat modeling
- High-risk systems with sensitive data
- Compliance-driven assessments (SOC2, PCI-DSS, HIPAA)
- Applications with complex business logic and data flows

**Analysis depth:** Most comprehensive - covers technical threats, business risks, and architectural vulnerabilities

**Time estimate:** Full assessment (3-5 days for medium codebase)

### 2. STRIDE Only

**Best for:** Technical deep-dives and time-constrained assessments

**What it includes:**

- Spoofing Identity
- Tampering with Data
- Repudiation
- Information Disclosure
- Denial of Service
- Elevation of Privilege

**When to use:**

- Technical security reviews
- Component-level analysis
- Time pressure scenarios
- Teams familiar with STRIDE methodology

**Analysis depth:** Technical threat focus - comprehensive technical coverage but lighter on business context

**Time estimate:** Faster assessment (1-2 days for medium codebase)

### 3. PASTA Only

**Best for:** Executive-focused, compliance-driven assessments

**What it includes:**

- Stage I: Define business objectives
- Stage II: Define technical scope
- Stage III: Application decomposition
- Stage IV: Threat analysis
- Stage V: Vulnerability analysis
- Stage VI: Attack modeling
- Stage VII: Risk and impact analysis

**When to use:**

- Executive stakeholder presentations
- Business risk prioritization
- Compliance reporting
- Budget justification for security investments

**Analysis depth:** Business risk focus - strong on impact and compliance but lighter on technical implementation details

**Time estimate:** Business-focused assessment (2-3 days for medium codebase)

### 4. Custom Methodology

**Best for:** Organizations with established internal threat modeling frameworks

**When to use:**

- Already using a specific methodology (e.g., OCTAVE, VAST, TRIKE)
- Need to align with organizational standards
- Hybrid approach with specific requirements

**Requirements:** User must provide methodology documentation and guidance

## Selection Workflow

### Step 1: Prompt User for Methodology

Use AskUserQuestion after scope selection (Step 1) and before Phase 1:

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Which threat modeling methodology would you like to use?",
      header: "Methodology",
      multiSelect: false,
      options: [
        {
          label: "Hybrid STRIDE + PASTA + DFD (Recommended)",
          description:
            "Combines STRIDE's systematic categorization, PASTA's business-aligned 7-stage process, and DFD-based trust boundary analysis. Best for comprehensive threat coverage.",
        },
        {
          label: "STRIDE Only",
          description:
            "Microsoft's 6-category threat taxonomy - faster, component-focused analysis. Best for technical deep-dives and time-constrained assessments.",
        },
        {
          label: "PASTA Only",
          description:
            "Process for Attack Simulation & Threat Analysis - business risk-centric 7-stage approach. Best for executive-focused, compliance-driven assessments.",
        },
        {
          label: "Custom",
          description:
            "Use your organization's established threat modeling framework. You'll need to provide methodology documentation.",
        },
      ],
    },
  ],
});
```

### Step 2: Prompt User for CVSS Version

Use AskUserQuestion to select CVSS scoring version:

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Which CVSS version should be used for risk scoring?",
      header: "CVSS Version",
      multiSelect: false,
      options: [
        {
          label: "CVSS 4.0 (Recommended)",
          description:
            "Latest standard (Nov 2023) with improved scoring accuracy, updated attack complexity metrics, and refined environmental scoring.",
        },
        {
          label: "CVSS 3.1",
          description:
            "Widely adopted standard for compatibility with existing security tools, vulnerability databases, and organizational workflows.",
        },
      ],
    },
  ],
});
```

**CVSS 4.0 Advantages:**

- Improved attack complexity assessment
- Better environmental score accuracy (business context integration)
- Updated threat vector definitions
- Industry standard for new threat modeling (2024+)

**CVSS 3.1 Use Cases:**

- Compatibility with existing SIEM/vulnerability management tools
- Organizational mandate for 3.1
- Existing threat models using 3.1 (consistency across assessments)

### Step 3: Record Selections in Config

Update `config.json` with user's choices:

```json
{
  "sessionId": "20250117-143022",
  "scope": "full" | "component" | "incremental",
  "scopeDetails": { /* ... */ },
  "methodology": "hybrid" | "stride-only" | "pasta-only" | "custom",
  "customMethodologyNotes": "Optional: User-provided methodology details",
  "cvssVersion": "4.0" | "3.1",
  "timestamp": "2025-01-17T14:30:22Z"
}
```

### Step 3: Pass to Phase 5

Phase 5 (threat-modeling skill) reads `config.json` and applies methodology-specific execution:

**Hybrid mode:**

- Full STRIDE categorization
- PASTA 7-stage integration
- DFD-based trust boundary analysis
- Comprehensive threat coverage

**STRIDE-only mode:**

- Focus on 6 STRIDE categories
- Skip PASTA business stages
- Technical threat emphasis
- Faster execution

**PASTA-only mode:**

- 7-stage PASTA workflow
- Business impact focus
- Executive-friendly outputs
- Compliance emphasis

**Custom mode:**

- User-provided methodology guidance
- Flexible threat identification
- Custom output formats

## Configuration Schema

### SessionConfig Interface

```typescript
interface SessionConfig {
  // Session identification
  sessionId: string; // Format: YYYYMMDD-HHMMSS
  timestamp: string; // ISO 8601 timestamp

  // Scope configuration
  scope: "full" | "component" | "incremental";
  scopeDetails: {
    paths?: string[]; // For component scope
    gitRef?: string; // For incremental scope
    description: string;
  };

  // Methodology selection (Step 1.5)
  methodology: "hybrid" | "stride-only" | "pasta-only" | "custom";
  customMethodologyNotes?: string; // Required if methodology === "custom"

  // CVSS scoring version
  cvssVersion: "3.1" | "4.0";

  // Phase 1 context (populated after business context discovery)
  businessContext?: {
    crownJewels: string[];
    threatActors: string[];
    complianceRequirements: string[];
  };
}
```

## Integration with Phase Summary

The methodology selection occurs between Scope Selection and Phase 1 (Business Context):

| Step  | Component                 | Execution       | Output                         | Checkpoint        |
| ----- | ------------------------- | --------------- | ------------------------------ | ----------------- |
| 1     | Command Router            | Entry point     | Invokes orchestrator           | -                 |
| 2     | Scope Selection           | Interactive     | User choice in scope.json      | -                 |
| **3** | **Methodology Selection** | **Interactive** | **methodology in config.json** | **-**             |
| 4     | Phase 1                   | Interactive     | Business context               | ⏸️ User approval  |
| 5     | Phase 2                   | Automatic       | Codebase sizing                | - (no checkpoint) |
| 6     | Phase 3                   | Parallel        | Codebase map                   | ⏸️ User approval  |
| 7     | Phase 4                   | Batched         | Security controls              | ⏸️ Per batch      |
| 8     | Phase 5                   | Sequential      | Threat model                   | ⏸️ User approval  |
| 9     | Phase 6                   | Sequential      | Test plan                      | ⏸️ User approval  |

## Related

- [Main skill](../SKILL.md)
- [Phase 5 Threat Modeling workflow](phase-5-threat-modeling-workflow.md) - How methodology affects threat modeling execution
- [Session configuration templates](../templates/session-config-example.json)
