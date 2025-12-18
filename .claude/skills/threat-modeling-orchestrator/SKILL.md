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

| Phase | Purpose | Execution | Checkpoint |
|-------|---------|-----------|------------|
| 0. Business Context | Crown jewels, threat actors, compliance, business impact | Interactive skill | ⏸️ User approval |
| 1. Codebase Mapping | Architecture, components, data flows | Parallel agents | ⏸️ User approval |
| 2. Security Controls | Auth, authz, validation, crypto | Parallel agents | ⏸️ User approval |
| 3. Threat Modeling | STRIDE + PASTA + DFD threats | Sequential skill | ⏸️ User approval |
| 4. Test Planning | Prioritized security test plan | Sequential skill | ⏸️ User approval |

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

All artifacts go to: `.claude/.threat-model/{session}/`

**Never** rely on context alone. Write structured JSON artifacts that downstream phases can read.

### Scope Selection Is Required

**Always ask user** to select scope before any analysis:
1. **Full application** - Analyze entire codebase
2. **Specific component(s)** - Focus on particular modules
3. **Incremental** - Changes only (git diff based)

---

## Core Workflow

### Step 0: Session Setup

1. **Generate session ID**: `YYYYMMDD-HHMMSS` format
2. **Create session directory**:
   ```bash
   mkdir -p .claude/.threat-model/{session-id}/phase-{0,1,2,3,4}
   mkdir -p .claude/.threat-model/{session-id}/checkpoints
   mkdir -p .claude/.threat-model/{session-id}/handoffs
   mkdir -p .claude/.threat-model/{session-id}/final-report
   ```
3. **Write config.json** with scope and options

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

**Artifacts produced** (in `phase-0/`):
- `business-objectives.json` - App purpose, users, value
- `data-classification.json` - Crown jewels, PII/PHI/PCI
- `threat-actors.json` - Who attacks, motivations, capabilities
- `business-impact.json` - Financial, operational, regulatory consequences
- `compliance-requirements.json` - Applicable regulations
- `security-objectives.json` - Protection priorities, CIA, RTO/RPO
- `summary.md` - <2000 token handoff

**Checkpoint**: Present business context findings, ask for approval before Phase 1.

**How this drives later phases**:
- Phase 1: Focus mapping on crown jewel components
- Phase 2: Evaluate controls against compliance requirements
- Phase 3: Apply relevant threat actor profiles, use actual business impact for risk scoring
- Phase 4: Prioritize tests by business risk scores

### Step 2: Phase 1 - Codebase Mapping

**Goal**: Build comprehensive architecture understanding.

**Execution**: Spawn `codebase-mapper` agents in parallel for large codebases.

```
Task("codebase-mapper", "Analyze {component-path} for threat modeling", "codebase-mapper")
```

**Artifacts produced** (in `phase-1/`):
- `manifest.json` - File inventory
- `components/*.json` - Per-component analysis
- `entry-points.json` - Attack surface
- `data-flows.json` - Data movement
- `trust-boundaries.json` - Security boundaries
- `summary.md` - <2000 token handoff

**Checkpoint**: Present findings, ask for approval.

See [references/phase-1-workflow.md](references/phase-1-workflow.md) for detailed steps.

### Step 3: Phase 2 - Security Controls Mapping

**Goal**: Identify existing security mechanisms and gaps.

**Execution**: Spawn `security-controls-mapper` agents in parallel.

**Artifacts produced** (in `phase-2/`):
- `authentication.json` - Auth mechanisms
- `authorization.json` - RBAC, ABAC, permissions
- `input-validation.json` - Validation patterns
- `cryptography.json` - Encryption, hashing
- `control-gaps.json` - Missing controls
- `summary.md` - <2000 token handoff

**Checkpoint**: Present controls found and gaps, ask for approval.

See [references/phase-2-workflow.md](references/phase-2-workflow.md) for detailed steps.

### Step 4: Phase 3 - Threat Modeling

**Goal**: Identify threats using STRIDE + PASTA + DFD methodology.

**Execution**: Sequential (needs holistic view). Read and apply `threat-modeling` skill.

**Inputs**: Load Phase 1 + Phase 2 summaries and key artifacts.

**Artifacts produced** (in `phase-3/`):
- `threat-model.json` - Structured threat entries
- `abuse-cases/*.json` - Per-category abuse scenarios
- `attack-trees/*.md` - Attack path diagrams
- `risk-matrix.json` - Impact × Likelihood scoring
- `summary.md` - <2000 token handoff

**Checkpoint**: Present top threats and abuse cases, ask for approval.

See [references/phase-3-workflow.md](references/phase-3-workflow.md) for detailed steps.

### Step 5: Phase 4 - Security Test Planning

**Goal**: Generate prioritized, actionable test plan.

**Execution**: Sequential. Read and apply `security-test-planning` skill.

**Inputs**: Load Phase 3 threat model and Phase 1 entry points.

**Artifacts produced** (in `phase-4/`):
- `code-review-plan.json` - Prioritized files
- `sast-recommendations.json` - Static analysis focus
- `dast-recommendations.json` - Dynamic testing targets
- `manual-test-cases.json` - Threat-driven tests
- `summary.md` - Execution roadmap

**Checkpoint**: Present test plan, ask for final approval.

See [references/phase-4-workflow.md](references/phase-4-workflow.md) for detailed steps.

### Step 6: Final Report Generation

**Consolidate all phases** into final deliverables:

| Format | File | Purpose |
|--------|------|---------|
| Markdown | `threat-model-report.md` | Human-readable report |
| JSON | `threat-model-data.json` | Machine-readable data |
| SARIF | `threat-model.sarif` | IDE integration |

See [references/report-templates.md](references/report-templates.md) for output schemas.

---

## Handoff Protocol

Between each phase, write a handoff file:

```json
{
  "sessionId": "{session-id}",
  "fromPhase": 1,
  "toPhase": 2,
  "timestamp": "2024-12-17T10:30:00Z",
  "summary": {
    "keyFindings": ["..."],
    "criticalRisks": ["..."],
    "crownJewels": ["payment_data", "user_credentials"],
    "complianceContext": ["PCI-DSS Level 1"],
    "userFeedback": ["..."]
  },
  "artifacts": [
    {"name": "phase-0-summary", "path": "phase-0/summary.md", "loadWhen": "always"},
    {"name": "entry-points.json", "path": "phase-1/entry-points.json", "loadWhen": "always"}
  ],
  "nextPhaseGuidance": "Focus on authentication controls first"
}
```

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
.claude/.threat-model/{session-id}/
├── config.json              # Session configuration
├── scope.json               # User-selected scope
├── checkpoints/             # Human approval records
│   ├── phase-0-checkpoint.json
│   ├── phase-1-checkpoint.json
│   ├── phase-2-checkpoint.json
│   ├── phase-3-checkpoint.json
│   └── phase-4-checkpoint.json
├── phase-0/                 # Business context outputs (MANDATORY FIRST)
├── phase-1/                 # Codebase mapping outputs
├── phase-2/                 # Security controls outputs
├── phase-3/                 # Threat model outputs
├── phase-4/                 # Test plan outputs
├── handoffs/                # Phase transition records
│   ├── phase-0-to-1.json
│   ├── phase-1-to-2.json
│   ├── phase-2-to-3.json
│   └── phase-3-to-4.json
└── final-report/            # Consolidated outputs (includes business context)
    ├── threat-model-report.md
    ├── threat-model-data.json
    └── threat-model.sarif
```

---

## Parallel Execution Strategy

For large codebases, spawn multiple agents:

```
# Phase 1: Parallel codebase mapping
Task("codebase-mapper", "Analyze frontend: ./modules/ui")
Task("codebase-mapper", "Analyze backend: ./modules/backend")
Task("codebase-mapper", "Analyze infra: ./modules/devops")

# Wait for all to complete, then consolidate
```

**When to parallelize**:
- >5 distinct components
- >10,000 files total
- Multiple technology stacks

**Always consolidate** parallel results before checkpoint.

---

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| Agent timeout | Component too large | Split into smaller scopes |
| Missing artifacts | Phase incomplete | Re-run phase before proceeding |
| User rejects checkpoint | Findings incorrect | Go back, address feedback, re-checkpoint |
| Skill not found | Missing dependency | Create required skill first |

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
