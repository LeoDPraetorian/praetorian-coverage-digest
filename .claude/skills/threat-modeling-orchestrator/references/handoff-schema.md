# Handoff Schema

**JSON schema for phase transition handoffs.**

## Purpose

Handoffs compress phase findings for downstream context. Each handoff:
- Summarizes key findings (<2000 tokens)
- Lists artifacts with load priorities
- Records user feedback from checkpoint
- Provides guidance for next phase

## Full Schema

```typescript
interface PhaseHandoff {
  // Identification
  sessionId: string;
  fromPhase: number;
  toPhase: number;
  timestamp: string;  // ISO 8601

  // Human checkpoint record
  checkpoint: {
    status: 'approved' | 'approved_with_feedback' | 'revision_requested';
    userFeedback?: string;
    revisionNotes?: string[];
  };

  // Compressed summary (<2000 tokens)
  summary: {
    keyFindings: string[];      // Top 5-10 findings
    criticalRisks: string[];    // Items needing immediate attention
    decisions: string[];        // Choices made during phase
    assumptions: string[];      // Assumptions that should be validated
    userFeedback: string[];     // Feedback from checkpoint
  };

  // Artifact references
  artifacts: {
    name: string;
    path: string;               // Relative to session directory
    description: string;
    loadWhen: 'always' | 'on-demand' | 'reference-only';
  }[];

  // Metrics
  metrics: {
    filesAnalyzed: number;
    componentsIdentified?: number;
    threatsIdentified?: number;
    controlsFound?: number;
    tokensUsed: number;
    timeSpent: number;          // Seconds
  };

  // Guidance for next phase
  nextPhaseGuidance: string;
}
```

## Load Priority

| Priority | When to Load | Example |
|----------|--------------|---------|
| `always` | Load into context at phase start | summary.md, key findings |
| `on-demand` | Load when needed for specific analysis | component JSONs |
| `reference-only` | Don't load, just reference for outputs | manifest.json |

## Example Handoff

```json
{
  "sessionId": "20241217-143022",
  "fromPhase": 1,
  "toPhase": 2,
  "timestamp": "2024-12-17T14:45:00Z",
  "checkpoint": {
    "status": "approved_with_feedback",
    "userFeedback": "Looks good, but also check the webhook handlers"
  },
  "summary": {
    "keyFindings": [
      "119 API endpoints identified as attack surface",
      "DynamoDB + Neo4j as primary data stores",
      "Cognito for authentication",
      "3 trust boundaries: internet→api, api→database, internal→external"
    ],
    "criticalRisks": [
      "Public endpoints with no apparent rate limiting",
      "External webhook integrations (GitHub, Slack)"
    ],
    "decisions": [
      "Focused on backend only per scope selection"
    ],
    "assumptions": [
      "API Gateway handles some input validation"
    ],
    "userFeedback": [
      "Also check webhook handlers"
    ]
  },
  "artifacts": [
    {
      "name": "summary.md",
      "path": "phase-1/summary.md",
      "description": "Compressed architecture overview",
      "loadWhen": "always"
    },
    {
      "name": "entry-points.json",
      "path": "phase-1/entry-points.json",
      "description": "Attack surface inventory",
      "loadWhen": "always"
    },
    {
      "name": "data-flows.json",
      "path": "phase-1/data-flows.json",
      "description": "Data movement map",
      "loadWhen": "on-demand"
    }
  ],
  "metrics": {
    "filesAnalyzed": 1247,
    "componentsIdentified": 8,
    "tokensUsed": 45000,
    "timeSpent": 1200
  },
  "nextPhaseGuidance": "Focus on authentication controls first. User flagged webhook handlers for extra attention."
}
```
