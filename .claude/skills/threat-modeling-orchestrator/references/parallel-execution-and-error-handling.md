# Parallel Execution Strategy and Error Handling

**Complete guide to dynamic agent spawning and error recovery for threat modeling phases.**

---

## Parallel Execution Strategy

### Dynamic Agent Spawning from Phase 2

**Key Innovation**: Phase 2 (Codebase Sizing) automatically determines optimal parallelization strategy based on actual codebase structure.

**Implementation**:

```typescript
// Step 1: Load sizing strategy from Phase 2
const sizingReport = JSON.parse(
  await readFile('.claude/.output/threat-modeling/{timestamp}-{slug}/phase-2/sizing-report.json')
);

// Step 2: Extract strategy configuration
const { tier, parallelization, components_to_spawn, estimated_agents } = sizingReport.strategy;

// Step 3: Spawn agents based on strategy
if (tier === "small") {
  // Single agent for entire codebase (<1k files)
  Task("codebase-mapper", `Analyze ${scope.path}`, "codebase-mapper");
} else {
  // Parallel agents per discovered component (1k-10k+ files)
  for (const component of components_to_spawn) {
    Task("codebase-mapper",
         `Analyze ${component.path}: ${component.files} files`,
         "codebase-mapper");
  }
}

// Step 4: Wait for all agents to complete
// (Task tool handles parallel execution automatically)

// Step 5: Consolidate results before checkpoint
```

### Strategy Tiers (from Phase 2)

| Tier | File Count | Strategy | Agent Count | Use Case |
|------|------------|----------|-------------|----------|
| **Small** | <1,000 | Single agent | 1 | Small libraries, microservices |
| **Medium** | 1k-10k | By-component parallel | 2-5 | Typical web applications |
| **Large** | >10,000 | By-component with sampling | 5-10 | Large monoliths, enterprise systems |

### Component Discovery

Phase 2 discovers components using directory heuristics:

- **Backend components**: `api/`, `backend/`, `server/`, `cmd/`, `pkg/`
- **Frontend components**: `ui/`, `frontend/`, `web/`, `client/`, `src/`
- **Infrastructure**: `infra/`, `devops/`, `terraform/`, `cloudformation/`
- **Shared**: `shared/`, `common/`, `lib/`, `utils/`

### Security Relevance Weighting

Phase 2 scores components by security-critical file presence:

**High priority indicators**:
- Authentication: `auth*.go`, `login*.tsx`, `session*.py`
- Authorization: `rbac*.go`, `permissions*.tsx`, `acl*.py`
- Cryptography: `crypto*.go`, `encryption*.py`, `hash*.go`
- Handlers: `handler*.go`, `controller*.py`, `api*.go`

**Strategy impact**: High-priority components get full depth analysis, lower-priority may use sampling for large codebases.

### Phase 4 Batched Execution

**Different from Phase 3**: Phase 4 (Security Controls) uses concern-focused batching instead of component-based parallelization.

**Execution strategy**:
1. Load concerns from Phase 3 with severity ratings
2. Execute in severity-ordered batches: CRITICAL → HIGH → MEDIUM → LOW → INFO
3. One dedicated agent per concern (not per control category)
4. Batch size = number of concerns at that severity level
5. Consolidate after each batch (cumulative updates)
6. Checkpoint between batches for user approval

**Example batching**:
```typescript
// Phase 3 output: 3 CRITICAL concerns, 5 HIGH concerns, 7 MEDIUM concerns
const concerns = JSON.parse(await readFile('phase-3/concerns.json'));

// Batch 1: CRITICAL concerns (3 parallel agents)
const criticalConcerns = concerns.filter(c => c.severity === "CRITICAL");
for (const concern of criticalConcerns) {
  Task("security-controls-mapper",
       `Investigate ${concern.title}`,
       "security-controls-mapper");
}
// Wait, consolidate, checkpoint

// Batch 2: HIGH concerns (5 parallel agents)
const highConcerns = concerns.filter(c => c.severity === "HIGH");
for (const concern of highConcerns) {
  Task("security-controls-mapper",
       `Investigate ${concern.title}`,
       "security-controls-mapper");
}
// Wait, consolidate, checkpoint

// ... continue for MEDIUM, LOW, INFO
```

### Consolidation Between Parallel Runs

**Why consolidation is mandatory**:
- Prevents duplicate findings across agents
- Normalizes terminology (e.g., "JWT validation" vs "token verification")
- Merges overlapping data flows and trust boundaries
- Updates summary for checkpoint presentation

**Consolidation process**:
1. Load all agent outputs from `phase-{N}/components/*.json`
2. Merge findings with deduplication
3. Normalize identifiers and naming
4. Update `phase-{N}/summary.md` for checkpoint
5. Write consolidated artifacts (manifest.json, entry-points.json, etc.)

---

## Error Handling

### Phase 2 Errors (Codebase Sizing)

#### Sizing Report Missing

**Symptom**: `.claude/.output/threat-modeling/{timestamp}-{slug}/phase-2/` directory exists but no `sizing-report.json`

**Cause**: `codebase-sizer` agent failed or timed out

**Recovery**:
1. Check phase-2 directory for partial outputs
2. Review agent logs for errors (file permission issues, huge directories)
3. Re-spawn codebase-sizer agent with reduced scope:
   ```typescript
   Task("codebase-sizer", `Assess ${reducedScope} (excluding node_modules, vendor)`, "codebase-sizer");
   ```
4. If persistent, manually construct minimal strategy:
   ```json
   {
     "strategy": {
       "tier": "small",
       "parallelization": "single",
       "components_to_spawn": [{"path": "./", "files": 1000, "recommended_depth": "full"}],
       "estimated_agents": 1,
       "sampling_required": false
     }
   }
   ```

#### Invalid JSON Schema

**Symptom**: sizing-report.json exists but missing required fields (`strategy.tier`, `strategy.components_to_spawn`)

**Cause**: Agent didn't use codebase-sizing skill, produced unstructured output

**Recovery**:
1. Validate JSON against codebase-sizing skill schema:
   ```bash
   cat .claude/.output/threat-modeling/{timestamp}-{slug}/phase-2/sizing-report.json | jq '.strategy | keys'
   ```
2. Re-spawn agent with explicit skill invocation requirement:
   ```typescript
   Task("codebase-sizer", "MUST use codebase-sizing skill for ${scope}", "codebase-sizer");
   ```
3. If time-critical, manually construct strategy (see above)

#### Component Discovery Failure

**Symptom**: sizing-report.json shows `components_to_spawn: []`

**Cause**: Project structure doesn't match heuristics (flat structure, unusual naming)

**Recovery**:
1. Check file counts - if <1k files, use single agent strategy
2. Manually specify 2-3 top-level directories as components:
   ```json
   {
     "strategy": {
       "tier": "medium",
       "parallelization": "by-component",
       "components_to_spawn": [
         {"path": "./src", "files": 500, "recommended_depth": "full"},
         {"path": "./lib", "files": 300, "recommended_depth": "full"}
       ],
       "estimated_agents": 2,
       "sampling_required": false
     }
   }
   ```
3. Document manual override in handoff notes

### Phase 3 Errors (Code Mapping)

#### Agent Timeout

**Symptom**: One or more codebase-mapper agents timeout (>30 min)

**Cause**: Component too large, deep nesting, huge files

**Recovery**:
1. Check sizing-report.json for component file counts
2. Split oversized component into sub-components:
   ```typescript
   // Original: ./backend (5000 files) → timeout
   // Split into:
   Task("codebase-mapper", "Analyze ./backend/api (2000 files)", "codebase-mapper");
   Task("codebase-mapper", "Analyze ./backend/services (1800 files)", "codebase-mapper");
   Task("codebase-mapper", "Analyze ./backend/models (1200 files)", "codebase-mapper");
   ```
3. Update Phase 2 sizing-report.json with revised components
4. Re-run Phase 3 with new configuration

#### Missing Artifacts

**Symptom**: Phase 3 directory incomplete, missing `entry-points.json` or `data-flows.json`

**Cause**: Agent failed during artifact generation, not during analysis

**Recovery**:
1. Check which components completed successfully
2. Re-run only failed agents (preserve successful outputs)
3. Consolidate partial results before checkpoint

### Phase 4 Errors (Security Controls)

#### Batch Failure

**Symptom**: Some concerns in batch investigated, others incomplete

**Cause**: Agent timeout, context window exceeded, tool errors

**Recovery**:
1. Identify failed concerns from batch-summary.json
2. Re-run failed concerns individually (not in batch):
   ```typescript
   Task("security-controls-mapper", "Investigate authentication-bypass", "security-controls-mapper");
   ```
3. Consolidate with successful batch results
4. Continue to next batch (don't block on single concern)

### Phase 5 Errors (Threat Modeling)

#### Generic Threats

**Symptom**: Threat model contains vague threats ("SQL injection possible") without specific locations

**Cause**: Phase 3 data-flows.json or Phase 4 control-gaps.json not loaded

**Recovery**:
1. Verify artifacts exist:
   ```bash
   ls -la .claude/.output/threat-modeling/{timestamp}-{slug}/phase-3/data-flows.json
   ls -la .claude/.output/threat-modeling/{timestamp}-{slug}/phase-4/control-gaps.json
   ```
2. Re-run Phase 5 with explicit artifact loading
3. If artifacts missing, re-run Phase 3 or Phase 4

### Phase 6 Errors (Test Planning)

#### Test Plan Missing Priorities

**Symptom**: Test cases generated but no priority ordering or CVSS scores

**Cause**: Phase 5 threat-model.json not loaded

**Recovery**:
1. Verify threat-model.json exists and contains CVSS scores
2. Re-run Phase 6 with threat model loaded
3. Apply business context from Phase 1 for Environmental scoring

### Checkpoint Rejection

**Symptom**: User rejects checkpoint, requests revisions

**Cause**: Findings incorrect, missing components, wrong focus

**Recovery**:
1. Document user feedback in checkpoint notes
2. Identify which phase needs revision
3. Re-run phase with feedback incorporated
4. Re-consolidate and re-checkpoint
5. Do NOT proceed to next phase until approval

### Session Corruption

**Symptom**: Session directory partially deleted, handoffs missing, phases incomplete

**Cause**: File system errors, manual deletion, process killed

**Recovery**:
1. Check .claude/.output/threat-modeling/{timestamp}-{slug}/ integrity
2. Identify last complete phase with checkpoint approval
3. Resume from last checkpoint (don't restart from beginning)
4. Regenerate missing handoffs from existing artifacts
5. Document corruption in session notes

---

## Best Practices

### Parallel Execution

✅ **DO**:
- Always consolidate before checkpoints
- Use sizing-report.json for agent configuration
- Wait for ALL agents before proceeding
- Document manual overrides in handoffs

❌ **DON'T**:
- Hardcode component paths (defeats Phase 2 purpose)
- Spawn agents without checking sizing strategy
- Proceed to next phase with incomplete agents
- Skip consolidation "to save time"

### Error Recovery

✅ **DO**:
- Preserve successful partial results
- Re-run only failed components/concerns
- Document recovery actions in session notes
- Escalate to user if blocking issue

❌ **DON'T**:
- Restart entire phase for single agent failure
- Silently skip failed concerns
- Proceed with incomplete artifacts
- Fabricate missing data

### Performance Optimization

**For Phase 2 (Sizing)**:
- Exclude `node_modules/`, `vendor/`, `.git/` from counting
- Use sampling for >100k file codebases
- Limit directory depth to 10 levels

**For Phase 3 (Mapping)**:
- Split components >3k files into sub-components
- Use sampling for >10k file components
- Prioritize crown jewel components (from Phase 1)

**For Phase 4 (Controls)**:
- Batch by severity (CRITICAL first)
- Limit batch size to 10 concerns max
- Checkpoint between batches (allows early termination)

---

## Related

- **Main skill**: [threat-modeling-orchestrator](../SKILL.md)
- **Phase 2 details**: [phase-2-codebase-sizing-workflow.md](phase-2-codebase-sizing-workflow.md)
- **Phase 3 details**: [phase-3-codebase-mapping-workflow.md](phase-3-codebase-mapping-workflow.md)
- **Phase 4 details**: [phase-4-security-controls-workflow.md](phase-4-security-controls-workflow.md) and [phase-4-batched-execution.md](phase-4-batched-execution.md)
