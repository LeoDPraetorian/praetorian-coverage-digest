# Phase 3: Codebase Mapping Workflow

**Detailed workflow for orchestrating Phase 3 of threat modeling.**

## Overview

Phase 3 builds comprehensive understanding of what the application is and does:
- Architecture and component boundaries
- Entry points (attack surface)
- Data flows and transformations
- Trust boundaries

## Execution Strategy

**Phase 3 is dynamically configured from Phase 2's sizing-report.json.** This ensures optimal parallelization based on actual codebase structure.

### For Small Codebases (strategy.tier = "small", <1k files)

Run single `codebase-mapper` agent:

```
Task("codebase-mapper", "Analyze {scope} for threat modeling. Create all Phase 3 artifacts in .claude/.output/threat-modeling/{timestamp}-{slug}/phase-3/")
```

### For Medium/Large Codebases (strategy.tier = "medium" | "large", 1k+ files)

**Use Phase 2's `strategy.components_to_spawn` to dynamically configure agents:**

```typescript
// Load sizing strategy from Phase 2
const sizingReport = JSON.parse(
  await readFile('.claude/.output/threat-modeling/{timestamp}-{slug}/phase-2/sizing-report.json')
);

// Spawn agents per discovered component
for (const component of sizingReport.strategy.components_to_spawn) {
  Task("codebase-mapper",
       `Analyze ${component.path}: ${component.files} files`,
       "codebase-mapper");
}
```

**Consolidate results** after all complete:
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

## Error Handling

For error recovery procedures, see [parallel-execution-and-error-handling.md](parallel-execution-and-error-handling.md).

### Phase-Specific Errors

| Error                        | Symptom                           | Recovery                                          |
| ---------------------------- | --------------------------------- | ------------------------------------------------- |
| Agent timeout                | Single agent exceeds 15 min       | Split component, spawn sub-agents                 |
| Missing entry points         | Zero entry points found           | Check for non-standard patterns, expand search    |
| Consolidation conflict       | Duplicate entries across agents   | Deduplicate by file path, merge metadata          |

### Escalation

If recovery fails:
1. Save partial results to `phase-3/partial/`
2. Record error in `metadata.json`
3. Present checkpoint with error summary
4. User decides: retry, skip, or abort
