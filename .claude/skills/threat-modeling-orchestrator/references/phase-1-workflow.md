# Phase 1: Codebase Mapping Workflow

**Detailed workflow for orchestrating Phase 1 of threat modeling.**

## Overview

Phase 1 builds comprehensive understanding of what the application is and does:
- Architecture and component boundaries
- Entry points (attack surface)
- Data flows and transformations
- Trust boundaries

## Execution Strategy

### For Small Codebases (<5 components)

Run single `codebase-mapper` agent:

```
Task("codebase-mapper", "Analyze {scope} for threat modeling. Create all Phase 1 artifacts in .claude/.threat-model/{session}/phase-1/")
```

### For Large Codebases (>5 components)

1. **Identify components** by directory heuristics:
   ```bash
   ls -d {scope}/*/ | grep -E "(api|backend|frontend|ui|cmd|pkg|services|infra)"
   ```

2. **Spawn parallel agents**:
   ```
   Task("codebase-mapper", "Analyze frontend: {scope}/ui")
   Task("codebase-mapper", "Analyze backend: {scope}/backend")
   Task("codebase-mapper", "Analyze infrastructure: {scope}/infra")
   ```

3. **Consolidate results** after all complete:
   - Merge component JSONs
   - Deduplicate entry points
   - Create unified data-flows.json
   - Generate summary.md (<2000 tokens)

## Required Artifacts

| Artifact | Description | Schema |
|----------|-------------|--------|
| `manifest.json` | File inventory with sizes | `{files: [{path, size, type}]}` |
| `components/*.json` | Per-component analysis | See component schema below |
| `entry-points.json` | Attack surface inventory | `{endpoints: [{path, method, handler}]}` |
| `data-flows.json` | Data movement map | `{flows: [{source, transformation, sink}]}` |
| `trust-boundaries.json` | Security boundaries | `{boundaries: [{name, location, controls}]}` |
| `summary.md` | Compressed handoff | <2000 tokens |

## Component Schema

```json
{
  "name": "backend-api",
  "type": "backend",
  "technology": {
    "language": "Go",
    "framework": "aws-lambda-go",
    "runtime": "provided.al2"
  },
  "entryPoints": 45,
  "dataOperations": 120,
  "externalDependencies": ["dynamodb", "cognito", "s3"],
  "securityRelevant": {
    "authReferences": 234,
    "cryptoUsage": 12,
    "inputValidation": 89
  }
}
```

## Checkpoint Preparation

Before presenting checkpoint, ensure:
- [ ] All component JSONs created
- [ ] Entry points consolidated
- [ ] Data flows mapped
- [ ] Trust boundaries identified
- [ ] Summary under 2000 tokens

## Common Issues

**Too many entry points**: Group by handler pattern, report counts per category.

**Ambiguous component boundaries**: Ask user to clarify scope or use directory-based heuristics.

**Missing technology detection**: Check for additional indicator files (Dockerfile, serverless.yml, etc.).
