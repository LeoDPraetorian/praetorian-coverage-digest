# Threat Model Process: State Management & Output Formats

**Document**: 5 of 6 - State Management & Output Formats **Purpose**: Session
state persistence, output format specifications, and handoff schemas **Last
Synchronized**: 2026-01-10 **Status**: Ready for Implementation

---

## Document Metadata

| Property           | Value                                  |
| ------------------ | -------------------------------------- |
| **Document ID**    | 05-STATE-OUTPUT                        |
| **Token Count**    | ~1,400 tokens                          |
| **Read Time**      | 8-12 minutes                           |
| **Prerequisites**  | 01-04 (Overview through Phase Details) |
| **Next Documents** | 06-IMPLEMENTATION-ROADMAP              |

---

## Related Documents

This document is part of the Threat Model Process documentation series:

- **[01-OVERVIEW-ARCHITECTURE.md](01-OVERVIEW-ARCHITECTURE.md)** - Overview and
  architecture diagram
- **[02-SCOPE-CHECKPOINTS.md](02-SCOPE-CHECKPOINTS.md)** - Scope selection and
  checkpoints
- **[03-METHODOLOGY.md](03-METHODOLOGY.md)** - STRIDE + PASTA + DFD methodology
- **[04-PHASE-DETAILS.md](04-PHASE-DETAILS.md)** - Phase 1-6 detailed
  specifications
- **[06-IMPLEMENTATION-ROADMAP.md](06-IMPLEMENTATION-ROADMAP.md)** -
  Implementation, tools, and roadmap

---

## Entry and Exit Criteria

### Entry Criteria

- Understanding of phase workflow and outputs
- Knowledge of threat modeling deliverables

### Exit Criteria

After reading this document, you should understand:

- The three output formats (Markdown, JSON, SARIF)
- Session directory structure
- Session configuration schema
- Handoff schema between phases

---

## Output Formats

All phases support three output formats:

### 1. Markdown (Human-Readable)

Primary format for reports and documentation.

```markdown
# Threat Model Report: Chariot Platform

## Executive Summary

...

## Architecture Overview

...

## Threat Analysis

...

## Security Test Plan

...
```

### 2. JSON (Machine-Readable)

Structured data for automation and tooling.

```json
{
  "sessionId": "2024-12-17-143052-chariot-backend",
  "scope": { "type": "full" },
  "threats": [...],
  "abuseCases": [...],
  "testPlan": {...}
}
```

### 3. SARIF (IDE Integration)

Static Analysis Results Interchange Format for IDE integration.

```json
{
  "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
  "version": "2.1.0",
  "runs": [
    {
      "tool": {
        "driver": {
          "name": "threat-model",
          "version": "1.0.0"
        }
      },
      "results": [
        {
          "ruleId": "THREAT-001",
          "level": "error",
          "message": { "text": "SQL Injection risk in user input handler" },
          "locations": [
            {
              "physicalLocation": {
                "artifactLocation": { "uri": "src/handlers/user.ts" },
                "region": { "startLine": 42 }
              }
            }
          ]
        }
      ]
    }
  ]
}
```

---

## State Management

### Session Directory Structure

```
.claude/.output/threat-modeling/
├── {timestamp}-{slug}/              # e.g., 20260110-chariot-platform
│   ├── config.json                  # Session configuration
│   ├── scope.json                   # User-selected scope
│   ├── checkpoints/                 # Human approval records
│   │   ├── phase-1-checkpoint.json  # Business Context approval
│   │   ├── phase-3-checkpoint.json  # Codebase Mapping approval (Phase 2 has no checkpoint)
│   │   ├── phase-4-checkpoint.json  # Security Controls approval
│   │   ├── phase-5-checkpoint.json  # Threat Model approval
│   │   └── phase-6-checkpoint.json  # Test Plan approval
│   ├── phase-1/                     # Business Context Discovery outputs
│   ├── phase-2/                     # Codebase Sizing outputs (auto, no checkpoint)
│   ├── phase-3/                     # Codebase Mapping outputs
│   ├── phase-4/                     # Security Controls outputs
│   ├── phase-5/                     # Threat Model outputs
│   ├── phase-6/                     # Test Plan outputs
│   ├── final-report/                # Consolidated output (MD + JSON + SARIF)
│   └── handoffs/                    # Phase transition records
│       ├── phase-1-to-2.json
│       ├── phase-2-to-3.json
│       ├── phase-3-to-4.json
│       ├── phase-4-to-5.json
│       └── phase-5-to-6.json
└── sessions.json                    # Session index for resume
```

### Session Configuration

```typescript
interface SessionConfig {
  sessionId: string;
  created: string;

  // User-selected scope
  scope: ScopeSelection;

  // Options
  options: {
    outputFormats: ("markdown" | "json" | "sarif")[]; // All three by default
    previousSession?: string; // For incremental, reference previous model
  };

  // Status tracking
  status: {
    currentPhase: number;
    completedPhases: number[];
    checkpointsPassed: number[];
    errors: string[];
  };
}
```

### Handoff Schema

```typescript
interface PhaseHandoff {
  sessionId: string;
  fromPhase: number;
  toPhase: number;
  timestamp: string;

  // Human checkpoint
  checkpoint: PhaseCheckpoint;

  // Compressed for next agent's context (<2000 tokens)
  summary: {
    keyFindings: string[];
    criticalRisks: string[];
    decisions: string[];
    assumptions: string[];
    userFeedback: string[]; // From checkpoint
  };

  // Full data via file references
  artifacts: {
    name: string;
    path: string;
    description: string;
    loadWhen: "always" | "on-demand" | "reference-only";
  }[];

  // Metrics
  metrics: {
    filesAnalyzed: number;
    componentsIdentified: number;
    threatsIdentified: number;
    controlsFound: number;
    tokensUsed: number;
    timeSpent: number;
  };

  nextPhaseGuidance: string;
}
```

---

**End of Document 5 of 6**

**Continue to**: [06-IMPLEMENTATION-ROADMAP.md](06-IMPLEMENTATION-ROADMAP.md) for
implementation architecture, tools, and roadmap
