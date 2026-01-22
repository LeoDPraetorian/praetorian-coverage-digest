# Phase 2: Codebase Sizing Workflow

**Purpose**: Assess codebase size to dynamically configure Phase 3 (Code Mapping) parallelization strategy instead of using hardcoded component paths.

**Execution**: Automatic (no checkpoint) - spawns single `codebase-sizer` agent after Phase 1 (Business Context) approval.

---

## Overview

Phase 2 bridges the gap between business context (Phase 1) and technical analysis (Phase 3) by:

1. **Counting files** across the codebase to determine overall size
2. **Discovering components** using directory heuristics
3. **Categorizing size** as small (<1k files), medium (1k-10k), or large (>10k)
4. **Scoring security relevance** based on auth/crypto/handler file presence
5. **Recommending strategy** for optimal Phase 3 parallelization

**Key Innovation**: Replaces hardcoded paths with dynamic configuration based on actual codebase structure.

---

## When to Execute

**Trigger**: Automatically after Phase 1 (Business Context) approval checkpoint.

**No checkpoint required** - Phase 2 progresses directly to Phase 3 upon completion.

**Why automatic**: Sizing is deterministic measurement, not subjective analysis requiring human validation.

---

## Execution Steps

### Step 1: Spawn Codebase-Sizer Agent

From orchestrator, after Phase 1 approval:

```typescript
Task("codebase-sizer", `Assess codebase size for ${scope.path}`, "codebase-sizer");
```

**Agent configuration**:

- Model: haiku (cost-effective for file counting)
- Tools: Bash, Glob, Read, TodoWrite, Write
- Skills: sizing-codebases (via gateway-security)
- Permission: plan mode (read-only analysis)

### Step 2: Wait for Sizing Report

**Expected output location**: `.claude/.output/threat-modeling/{timestamp}-{slug}/phase-2/sizing-report.json`

**Wait for agent completion** before proceeding to Phase 3.

### Step 3: Read Sizing Report

Load the JSON output to extract:

```typescript
const sizingReport = JSON.parse(
  await readFile(".claude/.output/threat-modeling/{timestamp}-{slug}/phase-2/sizing-report.json")
);

const { strategy } = sizingReport;
// strategy.tier: "small" | "medium" | "large"
// strategy.parallelization: "single" | "by-component"
// strategy.components_to_spawn: Array<{path, files, recommended_depth}>
// strategy.estimated_agents: number
// strategy.sampling_required: boolean
```

### Step 4: Configure Phase 3 Dynamically

**Based on strategy.tier**:

| Tier       | Files  | Parallelization            | Agent Count |
| ---------- | ------ | -------------------------- | ----------- |
| **Small**  | <1k    | Single agent               | 1           |
| **Medium** | 1k-10k | By-component               | 2-5         |
| **Large**  | >10k   | By-component with sampling | 5-10        |

**Use `strategy.components_to_spawn` to determine scope assignments**:

```typescript
// OLD: Hardcoded paths
Task("codebase-mapper", "Analyze frontend: ./modules/ui");
Task("codebase-mapper", "Analyze backend: ./modules/backend");

// NEW: Dynamic from sizing report
for (const component of strategy.components_to_spawn) {
  Task("codebase-mapper", `Analyze ${component.path}: ${component.files} files`, "codebase-mapper");
}
```

### Step 5: Proceed to Phase 3

**No checkpoint** - automatically transition to Phase 3 with dynamically configured agent strategy.

---

## Artifacts Produced

### Location

All Phase 2 outputs in: `.claude/.output/threat-modeling/{timestamp}-{slug}/phase-2/`

### Required Files

1. **sizing-report.json** - Complete sizing data and strategy recommendation

```json
{
  "status": "complete",
  "summary": "Codebase sizing complete: 5432 files across 3 components",
  "sizing_report": ".claude/.output/threat-modeling/{timestamp}-{slug}/phase-2/sizing-report.json",
  "strategy": {
    "tier": "medium",
    "parallelization": "by-component",
    "components_to_spawn": [
      {
        "path": "./modules/backend",
        "files": 2100,
        "recommended_depth": "full"
      },
      {
        "path": "./modules/ui",
        "files": 3200,
        "recommended_depth": "full"
      },
      {
        "path": "./modules/shared",
        "files": 132,
        "recommended_depth": "full"
      }
    ],
    "estimated_agents": 3,
    "sampling_required": false
  },
  "handoff": {
    "recommended_agent": "codebase-mapper",
    "context": "Spawn 3 parallel codebase-mapper agents for [backend, ui, shared]"
  }
}
```

### Optional Files

2. **component-analysis.json** - Per-component file counts and security relevance scores
3. **file-manifest.json** - Complete file listing (for large codebases with sampling)

---

## Integration with Other Phases

### Phase 1 → Phase 2

**Input from Phase 1**:

- `business-objectives.json` - Identifies crown jewel components to prioritize
- `scope.json` - Defines which parts of codebase to size

**Phase 2 uses business context to**:

- Weight components by security relevance (auth/crypto/payment handling)
- Prioritize crown jewel paths in strategy recommendation

### Phase 2 → Phase 3

**Output to Phase 3**:

- `strategy.tier` - Determines single vs parallel execution
- `strategy.components_to_spawn` - Replaces hardcoded paths
- `strategy.estimated_agents` - Informs parallel batch size
- `strategy.sampling_required` - Triggers depth limiting for huge codebases

**Phase 3 configuration logic**:

```typescript
if (strategy.tier === "small") {
  // Single agent for entire codebase
  Task("codebase-mapper", `Analyze ${scope.path}`, "codebase-mapper");
} else if (strategy.parallelization === "by-component") {
  // Parallel agents per component
  for (const component of strategy.components_to_spawn) {
    Task(
      "codebase-mapper",
      `Analyze ${component.path}: ${component.files} files`,
      "codebase-mapper"
    );
  }
}
```

---

## Error Handling

For error recovery procedures, see [parallel-execution-and-error-handling.md](parallel-execution-and-error-handling.md).

### Sizing Report Missing

**Symptom**: Phase 2 directory exists but no `sizing-report.json`

**Cause**: Agent failed or timed out

**Solution**:

1. Check `.claude/.output/threat-modeling/{timestamp}-{slug}/phase-2/` for partial outputs
2. Review agent logs for errors
3. Re-spawn codebase-sizer agent with reduced scope
4. If persistent, fall back to hardcoded small strategy

### Invalid JSON Schema

**Symptom**: sizing-report.json exists but missing required fields

**Cause**: Agent used approximate output instead of skill schema

**Solution**:

1. Validate JSON against sizing-codebases skill schema
2. Re-spawn agent with explicit skill invocation requirement
3. If time-critical, manually construct minimal strategy:
   ```json
   {
     "strategy": {
       "tier": "small",
       "parallelization": "single",
       "components_to_spawn": [{ "path": "./", "files": 1000, "recommended_depth": "full" }],
       "estimated_agents": 1,
       "sampling_required": false
     }
   }
   ```

### Component Discovery Failure

**Symptom**: sizing-report.json shows `components_to_spawn: []`

**Cause**: Heuristics didn't match project structure

**Solution**:

1. Check file counts - if <1k files, use single agent strategy
2. Manually specify 2-3 top-level directories as components
3. Document manual override in handoff notes

---

## Session Directory Updates

**Phase 2 directory structure**:

```
.claude/.output/threat-modeling/{timestamp}-{slug}/
├── config.json
├── scope.json
├── phase-1/                    # Business Context
├── phase-2/                    # Codebase Sizing
│   ├── sizing-report.json      # Primary output
│   ├── component-analysis.json # Optional detailed breakdown
│   └── file-manifest.json      # Optional for large codebases
├── phase-3/                    # Code Mapping
├── phase-4/                    # Security Controls
├── phase-5/                    # Threat Modeling
├── phase-6/                    # Test Planning
├── handoffs/
│   ├── phase-1-to-2.json       # Business to Sizing
│   ├── phase-2-to-3.json       # Sizing to Mapping
│   ├── phase-3-to-4.json
│   ├── phase-4-to-5.json
│   └── phase-5-to-6.json
└── final-report/
```

---

## Time Estimates

| Codebase Size | Files  | Execution Time | Agent Cost |
| ------------- | ------ | -------------- | ---------- |
| Small         | <1k    | 2-5 min        | $0.05-0.10 |
| Medium        | 1k-10k | 5-10 min       | $0.10-0.25 |
| Large         | >10k   | 10-20 min      | $0.25-0.50 |

**Total Phase 2 overhead**: 5-20 minutes, cost: $0.05-0.50

**ROI**: Saves 30-60 minutes in Phase 3 by optimizing parallelization, prevents agent timeouts from oversized components.

### Escalation

If error recovery fails:

1. Save partial results to `phase-2/partial/`
2. Record error in `metadata.json`
3. Present checkpoint with error summary
4. User decides: retry, skip, or abort

---

## Quality Checklist

Before transitioning to Phase 3, verify:

- [ ] sizing-report.json exists at correct path
- [ ] JSON schema valid (includes `strategy.tier`, `strategy.components_to_spawn`)
- [ ] `strategy.tier` is one of: small, medium, large
- [ ] `strategy.parallelization` is one of: single, by-component
- [ ] `components_to_spawn` array not empty (unless tier=small)
- [ ] Each component has: path, files, recommended_depth
- [ ] `estimated_agents` matches `components_to_spawn.length` (or 1 for small)

---

## Related

- **Main skill**: [threat-modeling-orchestrator](../SKILL.md)
- **Agent used**: `.claude/agents/analysis/codebase-sizer.md`
- **Skill invoked by agent**: `.claude/skill-library/security/threat-model/sizing-codebases/SKILL.md`
- **Next phase**: [Phase 3: Code Mapping](phase-3-codebase-mapping-workflow.md)
- **Previous phase**: [Phase 1: Business Context](../SKILL.md#step-3-phase-1---business-context-discovery)
