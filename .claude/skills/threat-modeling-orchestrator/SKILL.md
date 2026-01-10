---
name: threat-modeling-orchestrator
description: Use when performing threat modeling - orchestrates multi-phase security analysis with parallel agents, human checkpoints, and structured outputs (MD + JSON + SARIF)
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, Task, AskUserQuestion
---

# Threat Modeling Orchestrator

**Orchestrates multi-phase threat modeling workflow across large codebases with parallel execution, human checkpoints, and structured deliverables.**

## When to Use

Use this skill when:
- Performing comprehensive threat modeling on a codebase
- Need systematic STRIDE + PASTA + DFD analysis
- Require structured outputs (Markdown, JSON, SARIF)
- Analyzing large codebases that exceed context windows
- Need human approval between analysis phases

**You MUST use TodoWrite** to track progress through all 6 phases (Phase 1-6).

---

## Quick Reference

| Category | Component | Purpose | Execution | Checkpoint |
|----------|-----------|---------|-----------|------------|
| **Setup** | Session Initialization | Create workspace and directories | Automatic | - |
| **Config** | Scope Selection | Define analysis boundaries | Interactive | - |
| **Config** | Methodology & CVSS Selection | Choose threat modeling approach and CVSS version | Interactive | - |
| **Phase 1** | Business Context | Crown jewels, threat actors, compliance | Interactive skill | ⏸️ User approval |
| **Phase 2** | Codebase Sizing | File counting, component discovery, strategy | Single agent | ⏸️ Automatic (no checkpoint) |
| **Phase 3** | Code Mapping | Architecture, components, data flows | Dynamic parallel agents | ⏸️ User approval |
| **Phase 4** | Security Controls | Auth, authz, validation, crypto | Batched parallel | ⏸️ After each batch |
| **Phase 5** | Threat Modeling | STRIDE/PASTA/DFD threats | Sequential agent | ⏸️ User approval |
| **Phase 6** | Test Planning | Prioritized security test plan | Sequential agent | ⏸️ User approval |
| **Finalize** | Final Report Generation | Consolidate all outputs | Automatic | - |

---

## Critical Rules

### Human Checkpoints Are Mandatory

**You CANNOT skip checkpoints.** Each phase requires explicit user approval before proceeding.

```markdown
## Phase {N} Complete: {Phase Name}

### Key Findings:
- [Finding 1]
- [Finding 2]

### Questions for You:
- Is this understanding correct?
- Any areas I missed?

**Approve to proceed to Phase {N+1}?** [Yes/No/Revise]
```

**Why:** Errors compound across phases. Early validation prevents wasted work.

### Phase 1 Is Mandatory

**Phase 1 (Business Context Discovery) MUST execute before Phase 2.** You cannot perform risk-based threat modeling without understanding:
- **WHAT** you're protecting (crown jewels, sensitive data)
- **WHY** it matters (business impact, compliance requirements)
- **WHO** would attack (threat actor profiles)

Without business context, technical threat models produce "security theater" instead of risk management.

**Enforcement**: Phase 2 (Codebase Sizing) cannot proceed without Phase 1 approval checkpoint.

**No exceptions:**
- **Not even when**: Manager says skip it, client says skip it, user says "we already know"
- **Not even when**: Time pressure, deadline, emergency, audit tomorrow
- **Not even when**: Previous Phase 1 exists (for incremental: validate changes in 30-60 min, don't skip)
- **Not even when**: Client claims "no sensitive data" (they're often wrong - validate with Phase 1)
- **Not even when**: "Just internal tool" or "only 10 users" (insiders are threat actors too)
- **Not even when**: Budget constraints (explain Phase 1 is 20-25% of total, not optional)

**If anyone claims "we can skip Phase 1"**: They're wrong. Run it anyway. Document their assumptions in Phase 1 outputs to prove they were incomplete.

### State Must Be Persisted

All artifacts go to: `.claude/.output/threat-modeling/{timestamp}-{slug}/`

**Never** rely on context alone. Write structured artifacts (Markdown, JSON) that downstream phases can read.

### Scope Selection Is Required

**Always ask user** to select scope before any analysis:
1. **Full application** - Analyze entire codebase
2. **Specific component(s)** - Focus on particular modules
3. **Incremental** - Changes only (git diff based)

---

## Core Workflow

### Session Initialization

**YOU MUST run the actual `date` command — DO NOT approximate or invent timestamps.**

1. **Get EXACT timestamp**:

   ```bash
   # Step 1: Get repository root
   ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"

   # Step 2: Get EXACT timestamp by running this command
   date +"%Y-%m-%d-%H%M%S"
   # Example output: 2026-01-04-152847

   # Step 3: Generate slug from target (lowercase, hyphenated, 2-4 words)
   # Examples: chariot-backend, nebula-scanner, janus-framework
   SLUG="your-target-slug"

   # Step 4: Create directory with EXACT timestamp from Step 2
   TIMESTAMP="2026-01-04-152847"  # Use actual output from date command
   OUTPUT_DIR="$ROOT/.claude/.output/threat-modeling/${TIMESTAMP}-${SLUG}"
   mkdir -p "${OUTPUT_DIR}"
   ```

   **WRONG**: Guessing 150000 (rounded to 15:00:00)
   **RIGHT**: Using actual output like 152847 (15:28:47)

2. **Store OUTPUT_DIR** - Pass it to every agent spawned.

### Slug Generation Rules

The slug portion of the session ID identifies the analysis target. Generate as follows:

**Format**: kebab-case, 2-4 words, lowercase

**Algorithm**:
```
1. Extract target name from scope selection
2. Convert to lowercase
3. Replace spaces and underscores with hyphens
4. Remove special characters (keep only a-z, 0-9, hyphens)
5. Truncate to max 30 characters
6. Trim trailing hyphens
```

**Examples**:

| Scope Target | Generated Slug |
|--------------|----------------|
| `modules/chariot/backend` | `chariot-backend` |
| `Nebula Scanner v2.0` | `nebula-scanner` |
| `modules/janus-framework` | `janus-framework` |
| `src/auth/LoginController.ts` | `auth-login` |
| Full application (no specific target) | `full-app` |
| Incremental (git diff) | `incremental-{branch}` |

**Special Cases**:

| Scope Type | Slug Pattern |
|------------|--------------|
| Full application | `full-app` or `{repo-name}` |
| Single component | `{component-name}` |
| Multiple components | `{primary-component}-multi` |
| Incremental analysis | `incremental-{base-branch}` |

**Bash Implementation**:
```bash
generate_slug() {
  local target="$1"
  echo "$target" | \
    tr '[:upper:]' '[:lower:]' | \
    sed 's/[_ ]/-/g' | \
    sed 's/[^a-z0-9-]//g' | \
    sed 's/--*/-/g' | \
    cut -c1-30 | \
    sed 's/-$//'
}

# Example usage
SLUG=$(generate_slug "modules/chariot/backend")
# Result: chariot-backend
```

**Rationale**:
- Provides deterministic slug generation for consistent session IDs
- Enables session lookup and resume functionality
- Prevents invalid characters in directory names

3. **Initialize metadata.json**:
   ```json
   {
     "session_id": "2026-01-04-152847-chariot-backend",
     "target": "chariot-backend",
     "created": "2026-01-04T15:28:47Z",
     "status": "in_progress",
     "current_phase": "scope_selection",
     "phases": {
       "business_context": { "status": "pending" },
       "codebase_sizing": { "status": "pending" },
       "codebase_mapping": { "status": "pending" },
       "security_controls": { "status": "pending" },
       "threat_modeling": { "status": "pending" },
       "test_planning": { "status": "pending" }
     }
   }
   ```

4. **Update sessions.json** (session index for resume):
   ```bash
   SESSIONS_FILE="$ROOT/.claude/.output/threat-modeling/sessions.json"

   # Create or update sessions index
   if [ -f "$SESSIONS_FILE" ]; then
     # Append new session to existing index
     jq --arg sid "${TIMESTAMP}-${SLUG}" \
        --arg dir "${OUTPUT_DIR}" \
        --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        '.sessions += [{"session_id": $sid, "path": $dir, "created": $ts, "status": "in_progress"}]' \
        "$SESSIONS_FILE" > temp.json && mv temp.json "$SESSIONS_FILE"
   else
     # Create new sessions index
     echo '{"sessions": []}' | jq --arg sid "${TIMESTAMP}-${SLUG}" \
        --arg dir "${OUTPUT_DIR}" \
        --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        '.sessions += [{"session_id": $sid, "path": $dir, "created": $ts, "status": "in_progress"}]' \
        > "$SESSIONS_FILE"
   fi
   ```

   **Sessions index enables**:
   - Resuming interrupted threat models
   - Listing previous sessions
   - Incremental analysis against previous models

### Session Resume (Optional)

If resuming an existing session, offer to user before starting new:

```markdown
## Existing Sessions Found

I found {N} previous threat modeling sessions:

1. `{session_id_1}` - {target} - {status} - {last_updated}
2. `{session_id_2}` - {target} - {status} - {last_updated}

Would you like to:
- **Resume** an existing session (enter number)
- **Start new** analysis (enter 'new')
```

To resume, load session's `metadata.json` and continue from `current_phase`.

### Scope Selection

Use AskUserQuestion to determine scope:

```
What would you like to threat model?

1. Entire application - Comprehensive analysis
2. Specific component(s) - Focused analysis (provide paths)
3. Incremental (changed files) - Delta analysis (provide git ref)
```

Record selection in `scope.json`.

### Methodology & CVSS Selection

Prompt user for methodology (Hybrid/STRIDE-only/PASTA-only/Custom) and CVSS version (4.0/3.1). Record selections in `config.json`.

**See [Methodology Selection](references/methodology-selection.md)** for complete details:
- Methodology descriptions, use cases, and time estimates
- CVSS version comparison (4.0 vs 3.1)
- AskUserQuestion examples for both prompts
- Configuration schema and Phase 3 integration

### Phase 1: Business Context Discovery

**Goal**: Understand WHAT you're protecting and WHY before analyzing HOW it's built.

**Execution**: Interactive session with user. Invoke `business-context-discovery` skill:

```
skill: "business-context-discovery"
```

**The skill guides through**:
1. Business Purpose Interview (20-30 min)
2. Data Classification - Identify crown jewels (20-30 min)
3. Threat Actor Profiling - Who would attack and why (15-20 min)
4. Business Impact Assessment - Quantify consequences (20-30 min)
5. Compliance Mapping - SOC2, PCI-DSS, HIPAA, GDPR (15-20 min)
6. Security Objectives - Protection priorities (10-15 min)

**Artifacts produced** (in `phase-1/`):
- `business-objectives.json` - App purpose, users, value
- `data-classification.json` - Crown jewels, PII/PHI/PCI
- `threat-actors.json` - Who attacks, motivations, capabilities
- `business-impact.json` - Financial, operational, regulatory consequences
- `compliance-requirements.json` - Applicable regulations
- `security-objectives.json` - Protection priorities, CIA, RTO/RPO
- `summary.md` - <2000 token handoff

**Checkpoint**: Present business context findings, ask for approval before Phase 2.

**How this drives later phases**:
- Phase 2: Weight components by business value during codebase sizing
- Phase 3: Focus mapping on crown jewel components
- Phase 4: Evaluate controls against compliance requirements
- Phase 5: Apply relevant threat actor profiles, score threats using selected CVSS version (default: 4.0) with business context
- Phase 6: Prioritize tests by CVSS Environmental scores (business-contextualized)

### Phase 2: Codebase Sizing

**Goal**: Assess codebase size to dynamically configure Phase 3 parallelization strategy.

**Execution**: Automatic (no checkpoint) - spawns single `codebase-sizer` agent.

**Agent spawn**:
```typescript
Task("codebase-sizer", `Assess codebase size for ${scope.path}`, "codebase-sizer")
```

**Key benefits**:
- Replaces hardcoded component paths with dynamic discovery
- Optimizes Phase 3 agent count based on actual codebase structure
- Prevents agent timeouts from oversized components
- Weights components by security relevance (auth/crypto/handlers)

**Artifacts produced** (in `phase-2/`):
- `sizing-report.json` - File counts, strategy tier, parallelization recommendation
- `component-analysis.json` - Per-component breakdown (optional)

**No checkpoint** - automatically progresses to Phase 3 upon completion.

**For complete workflow details, see [Phase 2 Workflow](references/phase-2-codebase-sizing-workflow.md)**:
- 5-step sizing methodology
- Size categorization (small/medium/large)
- Dynamic Phase 3 configuration logic
- Error handling and fallback strategies
- Integration with business context from Phase 1

### Phase 3: Code Mapping

**Goal**: Build comprehensive architecture understanding.

**Execution**: Spawn `codebase-mapper` agents **dynamically configured from Phase 2 sizing-report.json**.

**Dynamic agent spawning** (replaces hardcoded paths):
```typescript
// Load sizing strategy from Phase 2
const sizingReport = JSON.parse(
  await readFile('.claude/.output/threat-modeling/{timestamp}-{slug}/phase-2/sizing-report.json')
);

// Spawn agents based on strategy
if (sizingReport.strategy.tier === "small") {
  // Single agent for entire codebase
  Task("codebase-mapper", `Analyze ${scope.path}`, "codebase-mapper");
} else {
  // Parallel agents per discovered component
  for (const component of sizingReport.strategy.components_to_spawn) {
    Task("codebase-mapper",
         `Analyze ${component.path}: ${component.files} files`,
         "codebase-mapper");
  }
}
```

**Artifacts produced** (in `phase-3/`):
- `manifest.json` - File inventory
- `components/*.json` - Per-component analysis
- `entry-points.json` - Attack surface
- `data-flows.json` - Data movement
- `trust-boundaries.json` - Security boundaries
- `summary.md` - <2000 token handoff

**Checkpoint**: Present findings, ask for approval before Phase 4.

See [references/phase-3-codebase-mapping-workflow.md](references/phase-3-codebase-mapping-workflow.md) for detailed steps.

### Phase 4: Security Controls Mapping (Batched Execution)

**Goal**: Identify existing security mechanisms and gaps through granular concern-focused investigation.

**Execution**: Spawn `security-controls-mapper` agents in **batched parallel** mode, one agent per security concern, batched by severity.

**Execution Strategy**:
1. Derive security concerns from Phase 3 architecture artifacts (entry points, data flows, trust boundaries, components) with severity ratings. Severity ratings are assigned based on: (1) proximity to crown jewels from Phase 1, (2) exposure level from entry-points.json, (3) data sensitivity from data-flows.json
2. Execute in severity-ordered batches: CRITICAL → HIGH → MEDIUM → LOW → INFO
3. One dedicated agent per concern (not per control category)
4. Batch size = number of concerns at that severity level
5. Consolidate after each batch (cumulative updates)
6. Checkpoint between batches for user approval

**Each agent prompt MUST include OUTPUT_DIRECTORY:**

```
Task("security-controls-mapper", "
Map security controls in {component-path}.

OUTPUT_DIRECTORY: {OUTPUT_DIR}
Mode: orchestrated
Output file: ${OUTPUT_DIR}/security-controls-{component-slug}.md

[Analysis requirements...]

MANDATORY SKILLS (invoke ALL before completing):
- persisting-agent-outputs: For file persistence to OUTPUT_DIRECTORY

COMPLIANCE: Document invoked skills in output metadata. I will verify.
", "security-controls-mapper")
```

**Artifacts produced** (flat files in OUTPUT_DIR):

- `security-controls.md` - Consolidated controls mapping
- `security-controls-{component}.md` - Per-component analysis (if parallel)

**Checkpoint**: Present controls found and gaps, ask for approval.

See [references/phase-4-security-controls-workflow.md](references/phase-4-security-controls-workflow.md) for detailed steps.

See [references/phase-4-batched-execution.md](references/phase-4-batched-execution.md) for complete batched execution strategy.

See [references/investigation-file-schema.md](references/investigation-file-schema.md) for per-concern investigation JSON schema.

See [references/consolidation-algorithm.md](references/consolidation-algorithm.md) for how investigations map to control categories.

### Phase 5: Threat Modeling

**Goal**: Identify threats using STRIDE + PASTA + DFD methodology.

**Execution**: Sequential (needs holistic view). Spawn single `threat-modeler` agent.

**Agent spawn**:
```typescript
Task("threat-modeler", `Execute threat modeling with STRIDE + PASTA + DFD methodology`, "threat-modeler")
```

**Inputs**: Load Phase 1, Phase 3, and Phase 4 summaries and key artifacts.

**Artifacts produced** (in `phase-5/`):
- `threat-model.json` - Structured threat entries with CVSS scores (version per config)
- `abuse-cases/*.json` - Per-category abuse scenarios
- `attack-trees/*.md` - Attack path diagrams
- `risk-matrix.json` - CVSS severity band distribution
- `summary.md` - <2000 token handoff with top CVSS-scored threats

**Checkpoint**: Present top threats and abuse cases, ask for approval before Phase 6.

See [references/phase-5-threat-modeling-workflow.md](references/phase-5-threat-modeling-workflow.md) for detailed steps.

### Phase 6: Security Test Planning

**Goal**: Generate prioritized, actionable test plan.

**Execution**: Sequential. Spawn single `security-test-planner` agent.

**Agent spawn**:
```typescript
Task("security-test-planner", `Generate prioritized security test plan from Phase 5 threats`, "security-test-planner")
```

**Inputs**: Load Phase 5 threat model and Phase 3 entry points.

**Artifacts produced** (in `phase-6/`):
- `code-review-plan.json` - Prioritized files
- `sast-recommendations.json` - Static analysis focus
- `dast-recommendations.json` - Dynamic testing targets
- `sca-recommendations.json` - Software composition analysis
- `manual-test-cases.json` - Threat-driven tests
- `test-priorities.json` - Test execution priority matrix
- `summary.md` - Execution roadmap

**Checkpoint**: Present test plan, ask for final approval.

See [references/phase-6-test-planning-workflow.md](references/phase-6-test-planning-workflow.md) for detailed steps.

### Final Report Generation

**Consolidate all phases** into final deliverable:

| Format | File | Purpose |
|--------|------|---------|
| Markdown | `threat-model-report.md` | Human-readable report |
| JSON | `threat-model-data.json` | Machine-readable data |
| SARIF | `threat-model.sarif` | IDE integration |

**Note on file naming**: `threat-model-data.json` (final report) consolidates and extends `phase-5/threat-model.json` (intermediate). The final report includes all Phase 5 threats plus executive summary, remediation priorities, and cross-phase context. Phase 5's intermediate file is retained for traceability.

See [references/report-templates.md](references/report-templates.md) for output schemas.

---

## Handoff Protocol

Between each phase, write a handoff file (flat files in OUTPUT_DIR):

```json
{
  "sessionId": "{timestamp}-{slug}",
  "fromPhase": 1,
  "toPhase": 2,
  "timestamp": "2026-01-04T15:28:47Z",
  "summary": {
    "keyFindings": ["..."],
    "criticalRisks": ["..."],
    "crownJewels": ["payment_data", "user_credentials"],
    "complianceContext": ["PCI-DSS Level 1"],
    "userFeedback": ["..."]
  },
  "artifacts": [
    { "name": "business-context", "path": "business-context.md", "loadWhen": "always" },
    { "name": "codebase-mapping", "path": "codebase-mapping.md", "loadWhen": "phase1+" }
  ],
  "nextPhaseGuidance": "Focus on authentication controls first"
}
```

**File naming**: `phase-{N}-to-{M}.json` in the handoffs/ subdirectory

**Why handoffs matter**: Phases run in separate contexts. Handoffs compress findings for downstream use.

**Phase 1 in handoffs**: All handoffs from Phase 2+ must include Phase 1 summary with crown jewels and compliance context to enable risk-based analysis.

See [references/handoff-schema.md](references/handoff-schema.md) for complete schema.

---

## Checkpoint Prompts

Use these templates for human approval gates:

### After Phase 1
```markdown
## Phase 1 Complete: Business Context Discovery

### What I Found:
- **Application**: {One-line business purpose}
- **Crown Jewels**: {Top 3-5 most sensitive assets}
- **Threat Actors**: {Relevant attacker profiles}
- **Business Impact**: {Quantified breach/downtime consequences}
- **Compliance**: {Applicable regulations}

### Key Insights:
- {Business-specific finding that shapes approach}
- {Compliance requirement determining controls}
- {Threat actor profile guiding threats}

### Questions for You:
- Is this business understanding correct?
- Any sensitive data I missed?
- Any threat actors I should consider?
- Any compliance requirements I overlooked?
- Does the business impact seem reasonable?

**Approve to proceed to Phase 2: Codebase Sizing?** [Yes/No/Revise]

If approved, Phase 2 will automatically assess codebase size to configure Phase 3.
```

### After Phase 3
```markdown
## Phase 3 Complete: Code Mapping

### What I Found:
- {X} components identified (discovered via Phase 2 sizing)
- {Y} entry points (attack surface)
- {Z} data flows mapped

### Key Architecture Points:
1. {Summary point 1}
2. {Summary point 2}

### Questions for You:
- Is this architecture understanding correct?
- Any components I missed?

**Approve to proceed to Phase 4: Security Controls Mapping?** [Yes/No/Revise]
```

See [references/checkpoint-prompts.md](references/checkpoint-prompts.md) for all phase templates.

---

## Session Directory Structure

```
.claude/.output/threat-modeling/{timestamp}-{slug}/
├── config.json              # Session configuration
├── scope.json               # User-selected scope
├── checkpoints/             # Human approval records
│   ├── phase-1-checkpoint.json
│   ├── phase-3-checkpoint.json
│   ├── phase-4-checkpoint.json
│   ├── phase-5-checkpoint.json
│   └── phase-6-checkpoint.json
├── phase-1/                 # Business context outputs (MANDATORY FIRST)
├── phase-2/                 # Codebase sizing outputs (automatic, no checkpoint)
│   └── sizing-report.json   # Primary output with parallelization strategy
├── phase-3/                 # Code mapping outputs (dynamic from phase-2)
├── phase-4/                 # Security controls outputs
├── phase-5/                 # Threat model outputs
├── phase-6/                 # Test plan outputs
├── handoffs/                # Phase transition records
│   ├── phase-1-to-2.json
│   ├── phase-2-to-3.json
│   ├── phase-3-to-4.json
│   ├── phase-4-to-5.json
│   └── phase-5-to-6.json
└── final-report/            # Consolidated outputs (includes business context)
    ├── threat-model-report.md
    ├── threat-model-data.json
    └── threat-model.sarif

```

---

## Templates
For large codebases, spawn multiple agents with OUTPUT_DIRECTORY:

```
# Phase 1: Parallel codebase mapping
Task("codebase-mapper", "
Analyze frontend: ./modules/ui

OUTPUT_DIRECTORY: {OUTPUT_DIR}
Mode: orchestrated
Output file: ${OUTPUT_DIR}/codebase-mapping-frontend.md

MANDATORY SKILLS (invoke ALL before completing):
- persisting-agent-outputs: For file persistence to OUTPUT_DIRECTORY

COMPLIANCE: Document invoked skills in output metadata. I will verify.
", "codebase-mapper")

Task("codebase-mapper", "
Analyze backend: ./modules/backend

OUTPUT_DIRECTORY: {OUTPUT_DIR}
Mode: orchestrated
Output file: ${OUTPUT_DIR}/codebase-mapping-backend.md

MANDATORY SKILLS (invoke ALL before completing):
- persisting-agent-outputs: For file persistence to OUTPUT_DIRECTORY

COMPLIANCE: Document invoked skills in output metadata. I will verify.
", "codebase-mapper")

# Wait for all to complete, then consolidate
```

**When to parallelize**:

- > 5 distinct components
- > 10,000 files total
- Multiple technology stacks

**Always consolidate** parallel results into `codebase-mapping.md` before checkpoint.

---

## Parallel Execution and Error Handling

**Dynamic agent spawning** based on Phase 2 sizing-report.json configures optimal parallelization:

- **Small codebases** (<1k files): Single agent
- **Medium codebases** (1k-10k files): 2-5 parallel agents per discovered component
- **Large codebases** (>10k files): 5-10 parallel agents with sampling

**Always consolidate** parallel results before checkpoints.

**For complete parallel execution strategies and comprehensive error recovery**, see [Parallel Execution and Error Handling](references/parallel-execution-and-error-handling.md):
- Dynamic agent spawning from Phase 2
- Strategy tiers and component discovery
- Phase 4 batched execution (concern-focused)
- Consolidation between parallel runs
- Error recovery for all phases (sizing, mapping, controls, threats, testing)
- Checkpoint rejection handling
- Session corruption recovery
- Performance optimization guidelines

---

## References

- [references/phase-2-codebase-sizing-workflow.md](references/phase-2-codebase-sizing-workflow.md) - Codebase sizing details
- [references/phase-3-codebase-mapping-workflow.md](references/phase-3-codebase-mapping-workflow.md) - Code mapping details
- [references/phase-4-security-controls-workflow.md](references/phase-4-security-controls-workflow.md) - Security controls mapping workflow
- [references/phase-4-batched-execution.md](references/phase-4-batched-execution.md) - Batched parallel execution strategy
- [references/phase-4-to-5-compatibility.md](references/phase-4-to-5-compatibility.md) - Phase 4/5 integration patterns
- [references/investigation-file-schema.md](references/investigation-file-schema.md) - Per-concern investigation JSON schema
- [references/consolidation-algorithm.md](references/consolidation-algorithm.md) - How investigations map to control categories
- [references/phase-5-threat-modeling-workflow.md](references/phase-5-threat-modeling-workflow.md) - Threat modeling methodology
- [references/phase-6-test-planning-workflow.md](references/phase-6-test-planning-workflow.md) - Test planning workflow
- [references/handoff-protocol.md](references/handoff-protocol.md) - Handoff JSON schema and examples
- [references/methodology-selection.md](references/methodology-selection.md) - Threat modeling methodology selection
- [references/checkpoint-prompts.md](references/checkpoint-prompts.md) - Human checkpoint templates
- [references/report-templates.md](references/report-templates.md) - Final report formats

## Related Skills

- `business-context-discovery` - Phase 1 methodology (MANDATORY FIRST)
- `codebase-sizing` - Phase 2 methodology (used by codebase-sizer agent)
- `codebase-mapping` - Phase 3 methodology (used by codebase-mapper agent)
- `security-controls-mapping` - Phase 4 methodology
- `threat-modeling` - Phase 5 methodology
- `security-test-planning` - Phase 6 methodology

## Related Agents

- `codebase-sizer` - Executes Phase 2 (single agent, automatic)
- `codebase-mapper` - Executes Phase 3 in dynamic parallel (configured by Phase 2)
- `security-controls-mapper` - Executes Phase 4 in batched parallel (one agent per concern)
- `threat-modeler` - Executes Phase 5 (sequential threat identification and CVSS scoring)
- `security-test-planner` - Executes Phase 6 (sequential test plan generation)
