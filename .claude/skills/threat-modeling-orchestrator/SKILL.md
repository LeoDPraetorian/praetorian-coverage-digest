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

**You MUST use TodoWrite** to track progress through all 5 phases (Phase 0-4).

---

## Quick Reference

| Phase                | Purpose                                                  | Execution         | Checkpoint       |
| -------------------- | -------------------------------------------------------- | ----------------- | ---------------- |
| 0. Business Context  | Crown jewels, threat actors, compliance, business impact | Interactive skill | ⏸️ User approval |
| 1. Codebase Mapping  | Architecture, components, data flows                     | Parallel agents   | ⏸️ User approval |
| 2. Security Controls | Auth, authz, validation, crypto                          | Parallel agents   | ⏸️ User approval |
| 3. Threat Modeling   | STRIDE + PASTA + DFD threats                             | Sequential skill  | ⏸️ User approval |
| 4. Test Planning     | Prioritized security test plan                           | Sequential skill  | ⏸️ User approval |

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

### Phase 0 Is Mandatory

**Phase 0 (Business Context Discovery) MUST execute before Phase 1.** You cannot perform risk-based threat modeling without understanding:

- **WHAT** you're protecting (crown jewels, sensitive data)
- **WHY** it matters (business impact, compliance requirements)
- **WHO** would attack (threat actor profiles)

Without business context, technical threat models produce "security theater" instead of risk management.

**Enforcement**: Phase 1 cannot proceed without Phase 0 approval checkpoint.

**No exceptions:**

- **Not even when**: Manager says skip it, client says skip it, user says "we already know"
- **Not even when**: Time pressure, deadline, emergency, audit tomorrow
- **Not even when**: Previous Phase 0 exists (for incremental: validate changes in 30-60 min, don't skip)
- **Not even when**: Client claims "no sensitive data" (they're often wrong - validate with Phase 0)
- **Not even when**: "Just internal tool" or "only 10 users" (insiders are threat actors too)
- **Not even when**: Budget constraints (explain Phase 0 is 20-25% of total, not optional)

**If anyone claims "we can skip Phase 0"**: They're wrong. Run it anyway. Document their assumptions in Phase 0 outputs to prove they were incomplete.

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

### Step 0: Session Setup

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
       "codebase_mapping": { "status": "pending" },
       "security_controls": { "status": "pending" },
       "threat_modeling": { "status": "pending" },
       "test_planning": { "status": "pending" }
     }
   }
   ```

### Step 1: Scope Selection

Use AskUserQuestion to determine scope:

```
What would you like to threat model?

1. Entire application - Comprehensive analysis
2. Specific component(s) - Focused analysis (provide paths)
3. Incremental (changed files) - Delta analysis (provide git ref)
```

Record selection in `scope.json`.

### Step 1.5: Phase 0 - Business Context Discovery

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

**Artifacts produced** (flat files in OUTPUT_DIR):

- `business-context.md` - Consolidated business context including:
  - App purpose, users, value proposition
  - Crown jewels and data classification (PII/PHI/PCI)
  - Threat actor profiles with motivations and capabilities
  - Business impact assessment (financial, operational, regulatory)
  - Compliance requirements (SOC2, PCI-DSS, HIPAA, GDPR)
  - Security objectives and protection priorities

**Checkpoint**: Present business context findings, ask for approval before Phase 1.

**How this drives later phases**:

- Phase 1: Focus mapping on crown jewel components
- Phase 2: Evaluate controls against compliance requirements
- Phase 3: Apply relevant threat actor profiles, use actual business impact for risk scoring
- Phase 4: Prioritize tests by business risk scores

### Step 2: Phase 1 - Codebase Mapping

**Goal**: Build comprehensive architecture understanding.

**Execution**: Spawn `codebase-mapper` agents in parallel for large codebases.

**Each agent prompt MUST include OUTPUT_DIRECTORY:**

```
Task("codebase-mapper", "
Analyze {component-path} for threat modeling.

OUTPUT_DIRECTORY: {OUTPUT_DIR}
Mode: orchestrated
Output file: ${OUTPUT_DIR}/codebase-mapping-{component-slug}.md

[Analysis requirements...]

MANDATORY SKILLS (invoke ALL before completing):
- persisting-agent-outputs: For file persistence to OUTPUT_DIRECTORY

COMPLIANCE: Document invoked skills in output metadata. I will verify.
", "codebase-mapper")
```

**CRITICAL**: Agents detect orchestrated mode when OUTPUT_DIRECTORY is provided. They will:

- Save to `${OUTPUT_DIR}/{filename}.md`
- NOT create their own timestamped directory
- Use the orchestrator's directory structure

**Artifacts produced** (flat files in OUTPUT_DIR):

- `codebase-mapping.md` - Consolidated analysis
- `codebase-mapping-{component}.md` - Per-component analysis (if parallel)

**Checkpoint**: Present findings, ask for approval.

See [references/phase-1-workflow.md](references/phase-1-workflow.md) for detailed steps.

### Step 3: Phase 2 - Security Controls Mapping

**Goal**: Identify existing security mechanisms and gaps.

**Execution**: Spawn `security-controls-mapper` agents in parallel.

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

See [references/phase-2-workflow.md](references/phase-2-workflow.md) for detailed steps.

### Step 4: Phase 3 - Threat Modeling

**Goal**: Identify threats using STRIDE + PASTA + DFD methodology.

**Execution**: Sequential (needs holistic view). Read and apply `threat-modeling` skill.

**Inputs**: Load Phase 0 (business context), Phase 1 (codebase mapping), and Phase 2 (security controls) from OUTPUT_DIR.

**Artifacts produced** (flat files in OUTPUT_DIR):

- `threat-model.md` - Comprehensive threat analysis with STRIDE categorization

**Checkpoint**: Present top threats and abuse cases, ask for approval.

See [references/phase-3-workflow.md](references/phase-3-workflow.md) for detailed steps.

### Step 5: Phase 4 - Security Test Planning

**Goal**: Generate prioritized, actionable test plan.

**Execution**: Sequential. Read and apply `security-test-planning` skill.

**Inputs**: Load Phase 0 (business context), Phase 1 (entry points), and Phase 3 (threat model) from OUTPUT_DIR.

**Artifacts produced** (flat files in OUTPUT_DIR):

- `test-plan.md` - Comprehensive test plan with prioritized targets

**Checkpoint**: Present test plan, ask for final approval.

See [references/phase-4-workflow.md](references/phase-4-workflow.md) for detailed steps.

### Step 6: Final Report Generation

**Consolidate all phases** into final deliverable:

| Format   | File           | Purpose                                               |
| -------- | -------------- | ----------------------------------------------------- |
| Markdown | `SYNTHESIS.md` | Comprehensive report consolidating all phase findings |

The SYNTHESIS.md file should include:

- Executive summary with key findings
- Business context (crown jewels, compliance, threat actors)
- Architecture overview from codebase mapping
- Security controls assessment
- Threat model with STRIDE analysis
- Prioritized test plan
- Recommendations

See [references/report-templates.md](references/report-templates.md) for output schemas.

---

## Handoff Protocol

Between each phase, write a handoff file (flat files in OUTPUT_DIR):

```json
{
  "sessionId": "{timestamp}-{slug}",
  "fromPhase": 0,
  "toPhase": 1,
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

**File naming**: `handoff-phase-{N}-to-{M}.json` (flat, not in subdirectory)

**Why handoffs matter**: Phases run in separate contexts. Handoffs compress findings for downstream use.

**Phase 0 in handoffs**: All handoffs from Phase 1+ must include Phase 0 summary with crown jewels and compliance context to enable risk-based analysis.

See [references/handoff-schema.md](references/handoff-schema.md) for complete schema.

---

## Checkpoint Prompts

Use these templates for human approval gates:

### After Phase 0

```markdown
## Phase 0 Complete: Business Context Discovery

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

**Approve to proceed to Phase 1: Codebase Mapping?** [Yes/No/Revise]

If approved, Phase 1 will focus on: {Components handling crown jewels}
```

### After Phase 1

```markdown
## Phase 1 Complete: Codebase Understanding

### What I Found:

- {X} components identified
- {Y} entry points (attack surface)
- {Z} data flows mapped

### Key Architecture Points:

1. {Summary point 1}
2. {Summary point 2}

### Questions for You:

- Is this architecture understanding correct?
- Any components I missed?

**Approve to proceed to Security Controls Mapping?** [Yes/No/Revise]
```

See [references/checkpoint-prompts.md](references/checkpoint-prompts.md) for all phase templates.

---

## Session Directory Structure

```
.claude/.output/threat-modeling/{timestamp}-{slug}/
├── metadata.json                  # Status, timestamps, phase tracking
├── scope.json                     # User-selected scope
├── business-context.md            # Phase 0 output
├── codebase-mapping.md            # Phase 1 consolidated output
├── codebase-mapping-frontend.md   # Phase 1: codebase-mapper agent (if parallel)
├── codebase-mapping-backend.md    # Phase 1: codebase-mapper agent (if parallel)
├── security-controls.md           # Phase 2 output
├── threat-model.md                # Phase 3 output
├── test-plan.md                   # Phase 4 output
├── checkpoint-phase-0.json        # Human approval records (flat, not in subdirectory)
├── checkpoint-phase-1.json
├── checkpoint-phase-2.json
├── checkpoint-phase-3.json
├── checkpoint-phase-4.json
├── handoff-phase-0-to-1.json      # Phase transitions (flat, not in subdirectory)
├── handoff-phase-1-to-2.json
├── handoff-phase-2-to-3.json
├── handoff-phase-3-to-4.json
└── SYNTHESIS.md                   # Final consolidated report
```

---

## Parallel Execution Strategy

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

## Error Handling

| Error                   | Cause               | Solution                                 |
| ----------------------- | ------------------- | ---------------------------------------- |
| Agent timeout           | Component too large | Split into smaller scopes                |
| Missing artifacts       | Phase incomplete    | Re-run phase before proceeding           |
| User rejects checkpoint | Findings incorrect  | Go back, address feedback, re-checkpoint |
| Skill not found         | Missing dependency  | Create required skill first              |

---

## Troubleshooting

**Problem**: Phase 3 produces generic threats
**Solution**: Ensure Phase 1 data-flows.json and Phase 2 control-gaps.json are loaded.

**Problem**: Too many findings to review
**Solution**: Use risk scoring to prioritize. Present top 10 first.

**Problem**: User wants to skip phases
**Solution**: Explain downstream dependencies. Offer reduced scope instead.

---

## References

- [references/phase-1-workflow.md](references/phase-1-workflow.md) - Codebase mapping details
- [references/phase-2-workflow.md](references/phase-2-workflow.md) - Security controls mapping
- [references/phase-3-workflow.md](references/phase-3-workflow.md) - Threat modeling methodology
- [references/phase-4-workflow.md](references/phase-4-workflow.md) - Test planning workflow
- [references/handoff-schema.md](references/handoff-schema.md) - Handoff JSON schema
- [references/checkpoint-prompts.md](references/checkpoint-prompts.md) - Human checkpoint templates
- [references/report-templates.md](references/report-templates.md) - Final report formats

## Related Skills

- `business-context-discovery` - Phase 0 methodology (MANDATORY FIRST)
- `codebase-mapping` - Phase 1 methodology (used by codebase-mapper agent)
- `security-controls-mapping` - Phase 2 methodology
- `threat-modeling` - Phase 3 methodology
- `security-test-planning` - Phase 4 methodology

## Related Agents

- `codebase-mapper` - Executes Phase 1 in parallel
- `security-controls-mapper` - Executes Phase 2 in parallel (pending creation)
