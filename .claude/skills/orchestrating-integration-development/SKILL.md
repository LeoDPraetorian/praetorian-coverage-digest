---
name: orchestrating-integration-development
description: Systematically guides integration development through eight phases with specialized agent execution, human checkpoints, and integration-specific P0 compliance validation (VMFilter, CheckAffiliation, ValidateCredentials, errgroup, pagination patterns)
allowed-tools: Read, TodoWrite, Task, AskUserQuestion, Bash, Grep, Glob, Skill
---

# Orchestrating Integration Development

**Complete orchestration workflow for developing Chariot backend integrations with third-party APIs.**

## When to Use

Use this skill when:

- Developing a new integration from design to tested code
- Building integrations with external APIs (Shodan, Qualys, ServiceNow, Wiz, etc.)
- Creating asset discovery, vulnerability sync, or bidirectional sync integrations
- Ensuring P0 compliance (VMFilter, CheckAffiliation, ValidateCredentials, errgroup, pagination)

**Invoked by**: `/integration` command

## Symptoms This Skill Addresses

- Manual orchestration of integration-specific agents without structured handoffs
- Missing P0 compliance verification before code review (causes rework)
- No workflow for checking/creating vendor-specific `integrating-with-*` skills
- Inconsistent quality checks across integrations
- Lost context between development phases
- Jumping to implementation without architecture or brainstorming

## Quick Reference

| Phase   | Agent / Activity                      | Human Checkpoint                          | Output                                                 |
| ------- | ------------------------------------- | ----------------------------------------- | ------------------------------------------------------ |
| 0       | Setup workspace                       | -                                         | `.output/integrations/{timestamp}-{vendor}/`           |
| 1       | Brainstorming                         | 🛑 Design approval                        | design.md                                              |
| 2       | Skill check + Discovery               | 🛑 Skill creation (if missing)            | skill-summary.md, discovery.md, file-placement.md      |
| 3       | integration-lead (architecture)       | 🛑 Architecture approval                  | architecture.md (with P0 Checklist)                    |
| 4       | integration-developer (implementation) | -                                         | Go files, implementation-log.md                        |
| 4.5     | P0 Compliance Verification            | 🛑 P0 violations (if any)                 | p0-compliance-review.md                                |
| 5       | Two-stage review                      | 🛑 Max retries exhausted                  | spec-compliance.md, quality-review.md, security.md     |
| 6       | test-lead → backend-tester            | 🛑 Max retries exhausted                  | test-plan.md, tests, test-validation.md                |
| 7       | frontend-developer (conditional)      | Decision checkpoint (see criteria)        | Frontend files, frontend-integration-log.md            |
| 8       | Completion                            | Final verification, merge/PR/keep options | metadata.json updated to 'complete'                    |

## Before You Begin

**MANDATORY prerequisites** - invoke these skills BEFORE starting Phase 0:

1. `persisting-agent-outputs` - Output directory structure and MANIFEST.yaml format
2. `orchestrating-multi-agent-workflows` - Agent coordination patterns and handoff protocols

**Cannot proceed without loading these skills** ✅

**IMPORTANT**: Use TodoWrite to track all 8 phases throughout the workflow. Multi-phase orchestration requires explicit progress tracking to ensure no phases are skipped.

## Workflow Overview (8 Phases)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 0: Setup                                                         │
│  Create: .claude/.output/integrations/YYYYMMDD-HHMMSS-{vendor-name}/    │
│  Initialize: metadata.json with vendor and integration type             │
│                                                                         │
│  **REQUIRED SUB-SKILL:** persisting-agent-outputs (discover output dir) │
│  **REQUIRED SUB-SKILL:** orchestrating-multi-agent-workflows (routing)  │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 1: Brainstorming                                                 │
│  **REQUIRED SUB-SKILL:** brainstorming                                  │
│  Determine: Vendor, integration type, API capabilities, data to sync    │
│  Output: design.md                                                      │
│  Gate: 🛑 Human checkpoint - Design approval                           │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 2: Skill Check + Discovery                                       │
│  Check: Does integrating-with-{vendor} skill exist?                     │
│    YES → Use existing skill                                             │
│    NO  → Invoke skill-manager to create it                              │
│  Agent: Explore (native, very thorough mode)                            │
│  Output: skill-summary.md, discovery.md, file-placement.md              │
│  Gate: 🛑 Human checkpoint - Skill creation (if missing)               │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 3: Architecture                                                  │
│  Agent: integration-lead                                                │
│  Input: design.md + discovery.md + skill (if exists)                    │
│  Create: Implementation plan with P0 Checklist                          │
│  Output: architecture.md (includes P0 compliance requirements)          │
│  Gate: 🛑 Human checkpoint - Architecture approval                     │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 4: Implementation (MODE-DEPENDENT)                               │
│  Agent: integration-developer                                           │
│  Input: architecture.md                                                 │
│  Mode: 1-3 tasks → Batch | 4+ tasks → Per-Task                         │
│  Create: Go files for integration                                       │
│  Output: Implementation files + implementation-log.md                   │
│                                                                         │
│  **REQUIRED (in prompt):** developing-with-tdd                          │
│  **REQUIRED (in prompt):** verifying-before-completion                  │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 4.5: P0 Compliance Verification                                  │
│  **REQUIRED SUB-SKILL:** validating-integrations                        │
│  Verify: VMFilter, CheckAffiliation, ValidateCredentials, errgroup,     │
│          pagination, error patterns, logging                            │
│  Output: p0-compliance-review.md                                        │
│  Gate: 🛑 Human checkpoint - P0 violations (if any)                    │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 5: Two-Stage Review (GATED)                                      │
│  STAGE 1: backend-reviewer (spec compliance)                            │
│    Focus: Does implementation match architecture?                       │
│    Retry: MAX 3 attempts before escalate                                │
│  STAGE 2: backend-security (security review)                            │
│    Focus: Security vulnerabilities, data handling                       │
│    Retry: MAX 3 attempts before escalate                                │
│  Output: spec-compliance.md, quality-review.md, security.md             │
│  Gate: 🛑 Human checkpoint - Max retries exhausted                     │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 6: Testing (MAX 3 RETRIES)                                       │
│  Step 1: Agent: test-lead (create test plan)                            │
│  Step 2: Agent: backend-tester (implement tests)                        │
│  Step 3: Agent: test-lead (validate test implementation)                │
│  Output: test-plan.md, test files, test-validation.md                   │
│                                                                         │
│  **REQUIRED (in tester prompt):** developing-with-tdd                   │
│  Loop: If plan not met → tester fixes → re-validate ONCE                │
│  Gate: 🛑 Human checkpoint - Max retries exhausted                     │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 7 Decision Checkpoint                                            │
│  Read: architecture.md 'Frontend Requirements' section (from Phase 3)   │
│  If 'Needs UI: YES' → Proceed to Phase 7                                │
│  If 'Needs UI: NO' → Skip to Phase 8 (document skip in metadata.json)   │
│  If section missing → AskUserQuestion: "Need UI configuration?"         │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 7: Frontend Integration (CONDITIONAL)                            │
│  Condition: Only if Frontend Requirements section says 'Needs UI: YES'  │
│  Agent: frontend-developer                                              │
│  Create: UI configuration, forms, or integration settings               │
│  Output: Frontend files + frontend-integration-log.md                   │
│  **SKIP if**: Integration requires no UI changes                        │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 8: Completion                                                    │
│  **REQUIRED SUB-SKILL:** finishing-a-development-branch                 │
│  Verify: All requirements met, tests passing, compliance verified       │
│  Options: Merge to main | Create PR | Keep branch                       │
│  Output: metadata.json updated to status='complete'                     │
│  Gate: 🛑 Human checkpoint - Final verification & merge decision       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Phase 0: Setup

**Purpose**: Create isolated workspace for integration development with metadata tracking.

```bash
.claude/.output/integrations/YYYYMMDD-HHMMSS-{vendor-name}/
├── metadata.json        # Status, vendor, integration type, phase tracking
├── MANIFEST.yaml        # File inventory with descriptions
└── [phase outputs...]   # Created as phases execute
```

**See**: [references/phase-0-setup.md](references/phase-0-setup.md)

**Gate Checklist:**

- [ ] Output directory created at `.claude/.output/integrations/YYYYMMDD-HHMMSS-{vendor}/`
- [ ] `metadata.json` initialized with vendor name and integration type
- [ ] `MANIFEST.yaml` created with initial structure
- [ ] `persisting-agent-outputs` skill invoked
- [ ] `orchestrating-multi-agent-workflows` skill invoked

### Phase 1: Brainstorming

**REQUIRED SUB-SKILL**: `brainstorming`

**Purpose**: Clarify integration scope before any technical work.

**Determine**:

- Vendor name (Shodan, Qualys, ServiceNow, Wiz, etc.)
- Integration type (asset discovery, vuln sync, bidirectional sync)
- API capabilities and endpoints needed
- Data to sync (assets, risks, vulnerabilities)
- Authentication method (API key, OAuth2, mutual TLS)

**Output**: `design.md` with requirements and scope

**🛑 Human Checkpoint**: Design approval before proceeding to discovery

**Cross-Reference to Phase 2**: The information gathered here (auth method, API endpoints, data to sync, rate limits, pagination approach) will be used to populate the vendor skill template in Phase 2 if the `integrating-with-{vendor}` skill doesn't exist.

**See**: [references/phase-1-brainstorming.md](references/phase-1-brainstorming.md)

**Gate Checklist:**

- [ ] `brainstorming` skill invoked
- [ ] `design.md` created with requirements
- [ ] Vendor name confirmed
- [ ] Integration type decided (asset discovery | vuln sync | bidirectional)
- [ ] Authentication method identified
- [ ] Human approved via AskUserQuestion

### Phase 2: Skill Check + Codebase Discovery (CRITICAL PHASE)

**Two-step process**:

#### Step 1: Skill Check

Check if `integrating-with-{vendor}` skill exists at:
`.claude/skill-library/development/integrations/integrating-with-{vendor}/`

**IF EXISTS**:

- Read SKILL.md + references/
- Extract: auth patterns, rate limits, pagination, data mapping
- Output: `skill-summary.md`

**IF NOT EXISTS**:

- 🛑 Human Checkpoint: "No skill for {vendor}. Create `integrating-with-{vendor}`?"
- IF approved:
  1. Read `references/vendor-skill-template.md` for the template
  2. Fill in template with vendor-specific details from Phase 1 brainstorming (auth method, API endpoints, data to sync, rate limits, pagination approach)
  3. Run: `Skill('skill-manager', args='create integrating-with-{vendor} "<filled-template>"')`
- Wait for skill creation (triggers creating-skills → orchestrating-research)
- Read newly created skill
- Output: `skill-summary.md` from new skill

#### Step 2: Codebase Discovery

**REQUIRED SUB-SKILL**: `discovering-codebases-for-planning`

- Spawns 1-10 Explore agents based on feature scope
- Find existing integrations for patterns (auth, pagination, VMFilter, CheckAffiliation)
- Identify file placement for new integration
- Output: `discovery.md`, `file-placement.md`, `discovery-summary.json`

**See**: [references/phase-2-skill-check-discovery.md](references/phase-2-skill-check-discovery.md)

**Gate Checklist:**

- [ ] Checked for `integrating-with-{vendor}` skill existence
- [ ] `skill-summary.md` created (from existing or newly created skill)
- [ ] `discovering-codebases-for-planning` skill invoked
- [ ] `discovery.md` created with pattern analysis
- [ ] `file-placement.md` created with target paths
- [ ] Human approved skill creation (if new skill was needed)

### Phase 3: Architecture

**Agent**: `integration-lead`

**Input**: design.md + skill-summary.md + discovery.md

**Design**:

- Auth flow (API key initialization, credential validation)
- Pagination strategy (maxPages OR API-provided signals per developing-integrations)
- CheckAffiliation approach (Pattern A/B/C per developing-integrations)
- ValidateCredentials implementation (called in Invoke() before enumeration)
- Tabularium mapping (vendor data → Chariot entities)
- errgroup pattern (SetLimit() + loop variable capture)
- File size management (split if >400 lines)

**Output**: `architecture.md` (includes **P0 Compliance Checklist** pre-filled)

**🛑 Human Checkpoint**: Architecture approval before implementation

**See**: [references/phase-3-architecture.md](references/phase-3-architecture.md) | [references/prompts/architect-prompt.md](references/prompts/architect-prompt.md)

**Gate Checklist:**

- [ ] `integration-lead` agent spawned with correct prompt template
- [ ] `architecture.md` created with all sections
- [ ] P0 Compliance Checklist pre-filled in `architecture.md`
- [ ] Frontend Requirements section added to `architecture.md`:
  - [ ] Needs UI: YES / NO
  - [ ] Reason: {user credentials / user config / service account only}
  - [ ] If YES: Enum name, logo requirements, config fields
- [ ] Auth flow documented
- [ ] Pagination strategy documented
- [ ] Tabularium mapping documented
- [ ] Human approved via AskUserQuestion

### Phase 4: Implementation

**Agent**: `integration-developer`

**Mode Selection**:

- 1-3 tasks: Batch mode (agent completes all, reports back)
- 4+ tasks: Per-task mode with review cycles (see [references/phase-4-per-task-mode.md](references/phase-4-per-task-mode.md))

**Input**: architecture.md

**REQUIRED IN PROMPT**: `developing-with-tdd`, `verifying-before-completion`

**Implementation**:

- Go handler files (Invoke, CheckAffiliation, ValidateCredentials methods)
- VMFilter initialization and usage
- errgroup concurrency with SetLimit()
- Pagination with maxPages constant
- Error handling (no `_, _ =` patterns)
- Tabularium entity mapping

**Output**: Go files + `implementation-log.md`

**On failure**: See [references/error-recovery.md](references/error-recovery.md) for recovery procedures

**See**: [references/phase-4-implementation.md](references/phase-4-implementation.md) | [references/prompts/developer-prompt.md](references/prompts/developer-prompt.md)

**Gate Checklist:**

- [ ] `integration-developer` agent spawned with correct prompt template
- [ ] Mode selected (batch for 1-3 tasks, per-task for 4+)
- [ ] Go handler files created
- [ ] `implementation-log.md` created
- [ ] `developing-with-tdd` skill required in prompt
- [ ] `verifying-before-completion` skill required in prompt

### Phase 4.5: P0 Compliance Verification

**REQUIRED SUB-SKILL**: `validating-integrations` (library skill)

**Purpose**: Verify ALL P0 requirements before code review to prevent rework.

**P0 Requirements Verified**:

| Requirement           | Verification                                                   |
| --------------------- | -------------------------------------------------------------- |
| VMFilter              | Initialized and called before Job.Send()                       |
| CheckAffiliation      | Uses approved Pattern A/B/C (not stub)                         |
| ValidateCredentials   | Called in Invoke() before enumeration                          |
| errgroup              | SetLimit() called + loop variable captured                     |
| Pagination            | Termination guarantee (maxPages OR API signal)                 |
| Error handling        | No `_, _ =` patterns                                           |
| File size             | Under 400 lines (or split into multiple files)                 |

**Output**: `p0-compliance-review.md`

**🛑 Human Checkpoint**: Only if any P0 requirement fails

**See**: [references/phase-4.5-p0-validation.md](references/phase-4.5-p0-validation.md)

**Gate Checklist:**

- [ ] `validating-integrations` skill invoked
- [ ] VMFilter verified (initialized + called before Job.Send)
- [ ] CheckAffiliation verified (Pattern A/B/C, not stub)
- [ ] ValidateCredentials verified (called first in Invoke)
- [ ] errgroup verified (SetLimit + loop capture)
- [ ] Pagination verified (maxPages OR API signal documented)
- [ ] Error handling verified (no `_, _ =` patterns)
- [ ] File size verified (<400 lines or split)
- [ ] `p0-compliance-review.md` created
- [ ] Human approval if any P0 requirement failed

### Phase 5: Review (Two-Stage Gated)

**Stage 1: Spec Compliance** (backend-reviewer)

- Question: Does implementation match architecture.md?
- MAX 2 RETRIES before human escalation
- Output: `spec-compliance-review.md`

**Stage 2: Quality + Security** (backend-reviewer + backend-security in PARALLEL)

- Questions: Is code well-built? Any security issues?
- MAX 1 RETRY before human escalation
- Output: `code-quality-review.md`, `security-review.md`

**On max retries exceeded**: See [references/error-recovery.md](references/error-recovery.md) - requires user decision

**🛑 Human Checkpoint**: Only when retries exhausted (need direction)

**See**: [references/phase-5-review.md](references/phase-5-review.md) | [references/prompts/reviewer-prompt.md](references/prompts/reviewer-prompt.md)

**Gate Checklist:**

- [ ] Stage 1: `backend-reviewer` spawned for spec compliance
- [ ] `spec-compliance-review.md` created
- [ ] Stage 1 passed (or max 2 retries exhausted → escalate)
- [ ] Stage 2: `backend-reviewer` + `backend-security` spawned in parallel
- [ ] `code-quality-review.md` created
- [ ] `security-review.md` created
- [ ] Stage 2 passed (or max 1 retry exhausted → escalate)

### Phase 6: Testing

**Three-step process**:

#### Step 1: Test Planning

**Agent**: `test-lead`
**Output**: `test-plan.md` (unit tests, integration tests with mocks, coverage targets)

#### Step 2: Test Implementation

**Agent**: `backend-tester`
**REQUIRED IN PROMPT**: `testing-integrations` (library skill)
**Implementation**: Mock servers, mock collectors, credential mocking
**Output**: Test files

#### Step 3: Test Validation

**Agent**: `test-lead`
**Gate**: ≥80% coverage, tests pass
**MAX 1 RETRY** before human escalation
**Output**: `test-validation.md`

**On coverage failure**: See [references/error-recovery.md](references/error-recovery.md) for recovery procedures

**See**: [references/phase-6-testing.md](references/phase-6-testing.md) | [references/prompts/test-lead-prompt.md](references/prompts/test-lead-prompt.md) | [references/prompts/tester-prompt.md](references/prompts/tester-prompt.md)

**Gate Checklist:**

- [ ] `test-lead` spawned for test planning
- [ ] `test-plan.md` created
- [ ] `backend-tester` spawned with `testing-integrations` skill
- [ ] Test files created with mock servers
- [ ] `test-lead` spawned for validation
- [ ] `test-validation.md` created
- [ ] Coverage ≥80% verified
- [ ] All tests pass

### Phase 7: Frontend Integration (CONDITIONAL)

**Decision Point**: After Phase 6 completes, evaluate these criteria:

| Criterion | Needs Frontend? | Example |
|-----------|-----------------|---------|
| User provides API credentials | YES | Shodan API key, Wiz client ID/secret |
| User configures integration settings | YES | Scan frequency, asset filters |
| Integration uses OAuth2 with user consent | YES | GitHub App installation |
| Integration uses service account only | NO | AWS cross-account role (configured in backend) |
| Integration is seed-based with no config | NO | DNS enumeration from seeds |

**Decision Protocol**:
1. Check architecture.md 'Auth Flow' section (from Phase 3)
2. If 'API key' or 'OAuth2 with user consent' → Phase 7 REQUIRED
3. If 'service account' or 'seed-based' → Phase 7 SKIPPED
4. If unclear → Ask user via AskUserQuestion

**Trigger**: Phase 7 runs if ANY of these are true:
- Integration requires user-provided credentials (not service account)
- Integration has user-configurable settings
- Integration appears in UI integration picker

**Skip Phase 7 if ALL of these are true**:
- Uses backend-only service account authentication
- No user-configurable options
- Runs automatically without user initiation

**Agent**: `frontend-developer`

**Add**:

- UI enum in `types.ts`
- Dark/light logos (SVG format)
- `useIntegration.tsx` configuration

**Output**: Frontend files + `frontend-integration-log.md`

**See**: [references/phase-7-frontend-integration.md](references/phase-7-frontend-integration.md)

**Gate Checklist:**

- [ ] Read architecture.md 'Frontend Requirements' section (from Phase 3)
- [ ] Evaluated decision criteria against integration requirements
- [ ] IF Phase 7 needed: `frontend-developer` spawned
- [ ] IF Phase 7 needed: UI enum added to `types.ts`
- [ ] IF Phase 7 needed: Logos added (dark/light SVG)
- [ ] IF Phase 7 needed: `useIntegration.tsx` updated
- [ ] IF Phase 7 needed: `frontend-integration-log.md` created
- [ ] IF Phase 7 skipped: Skip reason documented in metadata.json

### Phase 8: Completion

**REQUIRED SUB-SKILL**: `finishing-a-development-branch`

**Final verification**:

```bash
cd modules/chariot/backend && go build ./...
go test ./...
go vet ./...
golangci-lint run
```

**Update**: `metadata.json` status to 'complete'

**Present options**: Merge to main | Create PR | Keep branch

**See**: [references/phase-8-completion.md](references/phase-8-completion.md)

**Gate Checklist:**

- [ ] `finishing-a-development-branch` skill invoked
- [ ] `go build ./...` passed
- [ ] `go test ./...` passed
- [ ] `go vet ./...` passed
- [ ] `golangci-lint run` passed
- [ ] `metadata.json` updated to status: `complete`
- [ ] Human presented with options (merge | PR | keep branch)

## Required Sub-Skills

| Phase    | Required Sub-Skills                       | Conditional Sub-Skills                   |
| -------- | ----------------------------------------- | ---------------------------------------- |
| All      | persisting-agent-outputs                  | -                                        |
| All      | orchestrating-multi-agent-workflows       | -                                        |
| 1        | brainstorming                             | -                                        |
| 2        | discovering-codebases-for-planning        | skill-manager create (if no skill)       |
| 4.5      | validating-integrations                   | -                                        |
| 4-6      | -                                         | developing-with-subagents (if >3 tasks)  |
| 4-6      | -                                         | persisting-progress-across-sessions (if >5 tasks) |
| 8        | finishing-a-development-branch            | -                                        |

## Agents Spawned

| Phase | Agent                                                  | Mandatory Skills in Prompt                                                            |
| ----- | ------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| 2     | Explore (via discovering-codebases-for-planning)       | discovering-reusable-code, persisting-agent-outputs                                   |
| 3     | integration-lead                                       | gateway-integrations, gateway-backend, writing-plans, persisting-agent-outputs        |
| 4     | integration-developer                                  | developing-with-tdd, verifying-before-completion, gateway-integrations, persisting-agent-outputs |
| 5.1   | backend-reviewer                                       | adhering-to-dry, gateway-backend, persisting-agent-outputs                            |
| 5.2   | backend-reviewer + backend-security (PARALLEL)         | adhering-to-dry, gateway-backend, persisting-agent-outputs                            |
| 6.1   | test-lead                                              | persisting-agent-outputs                                                              |
| 6.2   | backend-tester                                         | developing-with-tdd, testing-integrations, persisting-agent-outputs                   |
| 6.3   | test-lead                                              | persisting-agent-outputs                                                              |
| 7     | frontend-developer (conditional)                       | gateway-frontend, persisting-agent-outputs                                            |

## Prompt Templates

Located in `references/prompts/`:

| Template                    | Used In Phase | Agent                | Purpose                                |
| --------------------------- | ------------- | -------------------- | -------------------------------------- |
| `explore-prompt.md`         | Phase 2       | Explore              | Codebase discovery for patterns        |
| `architect-prompt.md`       | Phase 3       | integration-lead     | Design integration architecture        |
| `developer-prompt.md`       | Phase 4       | integration-developer | Implement Go handler and methods       |
| `p0-validator-prompt.md`    | Phase 4.5     | (orchestrator)       | P0 compliance verification             |
| `reviewer-prompt.md`        | Phase 5       | backend-reviewer     | Spec compliance and quality review     |
| `security-prompt.md`        | Phase 5       | backend-security     | Security review                        |
| `test-lead-prompt.md`       | Phase 6.1/6.3 | test-lead            | Test planning and validation           |
| `tester-prompt.md`          | Phase 6.2     | backend-tester       | Test implementation with mocks         |
| `frontend-prompt.md`        | Phase 7       | frontend-developer   | UI integration (conditional)           |

### Template Requirements

Each prompt template MUST include:

1. **OUTPUT_DIRECTORY** - Path from Phase 0 setup
2. **MANDATORY SKILLS** - Skills the agent must invoke:
   - `persisting-agent-outputs` (all agents)
   - `gateway-integrations` (all integration agents)
   - `developing-with-tdd` (developer, tester)
   - `verifying-before-completion` (developer, reviewer)
3. **INPUT FILES** - Context files from previous phases
4. **OUTPUT FILES** - Expected deliverables with descriptions
5. **COMPLIANCE** - Instruction to document invoked skills

### Library Skills Reference

| Skill                         | Path                                                                  | Purpose                            |
| ----------------------------- | --------------------------------------------------------------------- | ---------------------------------- |
| orchestration-prompt-patterns | .claude/skill-library/prompting/orchestration-prompt-patterns/SKILL.md | Prompt engineering patterns        |
| developing-integrations       | .claude/skill-library/development/integrations/developing-integrations/SKILL.md | P0 requirements definition         |
| validating-integrations       | .claude/skill-library/development/integrations/validating-integrations/SKILL.md | P0 compliance verification         |
| testing-integrations          | .claude/skill-library/testing/testing-integrations/SKILL.md           | Mock patterns for integration tests |

Prompt templates implement patterns from orchestration-prompt-patterns.

**Agent handoff protocol**: See [references/agent-handoffs.md](references/agent-handoffs.md) for structured JSON format.

## Blocked Status Handling

When agents return blocked, use this routing table to determine next steps:

| Block Reason            | Route To              | Action                                           |
| ----------------------- | --------------------- | ------------------------------------------------ |
| architecture_decision   | integration-lead      | Respawn architect with clarification context     |
| missing_api_docs        | AskUserQuestion       | Request vendor API documentation from user       |
| credential_format       | AskUserQuestion       | Clarify credential structure with user           |
| security_concern        | backend-security      | Security review before proceeding                |
| p0_violation            | integration-developer | Fix violation, re-run P0 validation              |
| test_failures           | backend-tester        | Debug and fix failing tests                      |
| spec_mismatch           | integration-developer | Align implementation with architecture.md        |
| rate_limit_unknown      | AskUserQuestion       | Request rate limit info from user                |
| pagination_unclear      | integration-lead      | Clarify pagination strategy                      |
| tabularium_mapping      | integration-lead      | Clarify entity mapping to Chariot models         |
| out_of_scope            | AskUserQuestion       | Confirm scope expansion or defer                 |

### Handling Protocol

1. **Identify block reason** from agent output metadata
2. **Look up routing** in table above
3. **Spawn routed agent** OR use AskUserQuestion
4. **Include context** from blocked agent in new prompt:
   - Original task
   - Block reason
   - Any partial work completed
   - Specific question or decision needed
5. **Resume workflow** once unblocked

### Example Block Handling

Agent returns:
```json
{
  "status": "blocked",
  "blocked_reason": "architecture_decision",
  "context": "Unclear whether to use cursor-based or offset pagination for vendor API",
  "partial_work": "implementation-log.md updated with progress"
}
```

Route to integration-lead:
```
Task: Clarify pagination strategy for {vendor} integration

The integration-developer is blocked on a pagination decision:
- Context: {context from blocked agent}
- Vendor API supports both cursor and offset pagination
- Need architectural decision on which to use

Review architecture.md and provide decision with rationale.
Update architecture.md if needed.
```

## Context Management

**How agent context is handled throughout the workflow.**

Each task dispatch uses a NEW agent instance to prevent context pollution. When agents fail, dispatch fresh agents with explicit error context. Context transfers between phases through OUTPUT files, never agent memory.

**Full details**: See [references/context-management.md](references/context-management.md)

## Human Checkpoints

| Phase | Checkpoint               | Gate Criteria                        | When                          |
| ----- | ------------------------ | ------------------------------------ | ----------------------------- |
| 1     | Design approval          | design.md complete, scope confirmed  | Always                        |
| 2     | Skill creation approval  | Confirm creating integrating-with-{vendor} | Only if skill doesn't exist   |
| 3     | Architecture approval    | architecture.md complete, P0 checklist filled | Always                        |
| 4.5   | P0 violations            | P0 compliance verified               | Only if any requirement fails |
| 5/6   | Retry exhausted          | Need direction after max retries     | Only after retry limit        |

**Configuration**: See [references/checkpoint-configuration.md](references/checkpoint-configuration.md)

## Output Directory Structure

```
.claude/.output/integrations/YYYYMMDD-HHMMSS-{vendor-name}/
├── metadata.json                    # Workflow status, vendor, type, phases
├── MANIFEST.yaml                    # File inventory with descriptions
├── design.md                        # Phase 1: Requirements and scope
├── skill-summary.md                 # Phase 2: Extracted from integrating-with-* skill
├── discovery.md                     # Phase 2: Codebase patterns found
├── file-placement.md                # Phase 2: Where to create new files
├── discovery-summary.json           # Phase 2: Structured discovery results
├── architecture.md                  # Phase 3: Design with P0 Checklist
├── implementation-log.md            # Phase 4: Developer activity log
├── p0-compliance-review.md          # Phase 4.5: P0 verification results
├── spec-compliance-review.md        # Phase 5: Spec compliance review
├── code-quality-review.md           # Phase 5: Quality review
├── security-review.md               # Phase 5: Security review
├── test-plan.md                     # Phase 6: Test strategy
├── test-validation.md               # Phase 6: Test validation results
└── frontend-integration-log.md      # Phase 7: Frontend changes (if applicable)
```

### metadata.json Schema

The `metadata.json` file tracks workflow progress and phase decisions. For Phase 7 (Frontend Integration), the schema tracks whether the phase was executed or skipped:

**When Phase 7 is SKIPPED**:
```json
{
  "vendor": "shodan",
  "integration_type": "asset_discovery",
  "status": "in_progress",
  "phases": {
    "phase-7": {
      "status": "skipped",
      "skip_reason": "service account only, no user config needed",
      "decided_at": "phase-3",
      "decided_by": "architecture.md Frontend Requirements section",
      "timestamp": "2025-01-14T12:00:00Z"
    }
  }
}
```

**When Phase 7 is EXECUTED**:
```json
{
  "vendor": "shodan",
  "integration_type": "asset_discovery",
  "status": "in_progress",
  "phases": {
    "phase-7": {
      "status": "complete",
      "decided_at": "phase-3",
      "decided_by": "architecture.md Frontend Requirements section",
      "files_created": [
        "modules/chariot/ui/src/types.ts (enum added)",
        "modules/chariot/ui/public/integrations/shodan-dark.svg",
        "modules/chariot/ui/public/integrations/shodan-light.svg",
        "modules/chariot/ui/src/hooks/useIntegration.tsx (case added)"
      ],
      "timestamp": "2025-01-14T12:30:00Z"
    }
  }
}
```

## Key Differences from Other Orchestration Skills

| Aspect    | Feature Dev                          | Capability Dev                 | Integration Dev                                |
| --------- | ------------------------------------ | ------------------------------ | ---------------------------------------------- |
| Output Dir | .output/features/                   | .output/capabilities/          | .output/integrations/                          |
| Phase 2   | Codebase discovery only              | Pattern search                 | Skill check + discovery                        |
| Lead Agent | frontend-lead/backend-lead          | capability-lead                | integration-lead                               |
| Developer | frontend/backend-developer           | capability-developer           | integration-developer                          |
| Reviewer  | frontend/backend-reviewer            | capability-reviewer            | backend-reviewer                               |
| P0 Focus  | Component size                       | Detection accuracy             | VMFilter, CheckAffiliation, pagination         |
| Phase 4.5 | Plan completion check                | Implementation review          | P0 Compliance Verification                     |
| Testing   | Unit/Integration/E2E                 | Detection accuracy tests       | Mock servers, sandbox APIs                     |
| Frontend  | Always (parallel with backend)       | Never                          | Conditional (Phase 7, only if UI config needed) |

## Rationalization Prevention

Agents rationalize skipping steps. Watch for warning phrases and use evidence-based gates.

**Reference**: See [shared rationalization prevention](.claude/skill-library/claude/using-skills/references/rationalization-prevention.md) for:

- Statistical evidence (technical debt ~10% fix rate, 'later' ~5% completion)
- Phrase detection patterns ('close enough', 'just this once', 'I'll fix it later')
- Override protocol (requires AskUserQuestion with explicit risk disclosure)

### Integration Development Rationalizations

| Rationalization | Why It Fails | Counter |
| --------------- | ------------ | ------- |
| "CheckAffiliation can be a stub for now" | 98% of stubs never get fixed; breaks affiliation capability | Implement real API query or use CheckAffiliationSimple |
| "I'll add ValidateCredentials later" | Fail-fast pattern prevents wasted compute; never added later | Add before any enumeration code |
| "VMFilter isn't needed for this integration" | Unless SCM integration, VMFilter prevents duplicate ingestion | Verify integration type; add if any IP/host assets |
| "Error handling is overkill for json.Marshal" | JSON marshaling can fail; silent corruption causes downstream bugs | Always check error, wrap with context |
| "No time for maxPages, API will return empty" | APIs have bugs; infinite loops crash workers | Add defensive maxPages constant (1000) |
| "File is only 450 lines, close enough to 400" | Maintainability degrades; split files are easier to review | Split now; technical debt compounds |
| "Tests can come later" | Tests never come later; coverage targets become blocking | Write tests in Phase 6, not 'later' |
| "The skill check is unnecessary, I know the API" | Skills capture rate limits, auth quirks, pagination; memory is unreliable | Always check/create integrating-with-{vendor} skill |
| "P0 validation is redundant, I followed the patterns" | 98% CheckAffiliation violation rate proves patterns aren't followed | Run validating-integrations every time |

### Key Principle

If you detect rationalization phrases in your thinking, STOP. Return to the phase checklist. Complete all items before proceeding.

### Override Protocol

If a P0 requirement genuinely doesn't apply:

1. Use AskUserQuestion to confirm with user
2. Document the exception in p0-compliance-review.md
3. Include rationale (e.g., "SCM integration, no IP assets")
4. User must explicitly approve the exception

Never self-approve exceptions to P0 requirements.

## Troubleshooting

Common issues and solutions during integration development.

For error recovery procedures when phases fail partway through execution, see [references/error-recovery.md](references/error-recovery.md).

**See**: [references/troubleshooting.md](references/troubleshooting.md)

## Integration

### Called By

- `/integration` command
- User requests: "Build a {vendor} integration", "Create integration for {vendor}"

### Requires (invoke before starting)

| Skill                               | When  | Purpose                                                  |
| ----------------------------------- | ----- | -------------------------------------------------------- |
| `persisting-agent-outputs`          | Start | Output directory structure and MANIFEST.yaml format      |
| `orchestrating-multi-agent-workflows` | Start | Agent coordination patterns, handoff protocols, progress tracking |

### Calls (during execution)

| Skill                              | Phase/Step | Purpose                                           |
| ---------------------------------- | ---------- | ------------------------------------------------- |
| `brainstorming`                    | Phase 1    | Clarify integration scope and requirements        |
| `discovering-codebases-for-planning` | Phase 2    | Parallel codebase discovery with Explore agents   |
| `skill-manager`                    | Phase 2    | Create integrating-with-{vendor} if missing       |
| `validating-integrations`          | Phase 4.5  | P0 compliance verification                        |
| `finishing-a-development-branch`   | Phase 8    | Final verification and merge/PR options           |

### Pairs With (conditional)

| Skill                           | Trigger            | Purpose                                  |
| ------------------------------- | ------------------ | ---------------------------------------- |
| `developing-with-subagents`     | >3 implementation tasks | Per-task review cycles                   |
| `persisting-progress-across-sessions` | >5 implementation tasks | Long-running workflow state management   |

## Exit Criteria

Integration development is complete when ALL of the following are verified:

### Phase Completion
- [ ] All 8 phases marked 'complete' in metadata.json
- [ ] All gate checklists passed (not 'close enough')
- [ ] No phases skipped without explicit user approval

### Skill Artifacts
- [ ] `integrating-with-{vendor}` skill exists (created or pre-existing)
- [ ] skill-summary.md documents API patterns extracted from skill

### P0 Compliance (ALL REQUIRED)
- [ ] VMFilter: Initialized AND called before every Job.Send()
- [ ] CheckAffiliation: Uses approved Pattern A/B/C (not stub)
- [ ] ValidateCredentials: Called first in Invoke()
- [ ] errgroup: SetLimit() called AND loop variables captured
- [ ] Pagination: Termination guarantee (maxPages OR API signal) documented
- [ ] Error handling: Zero `_, _ =` patterns in codebase
- [ ] File size: All files under 400 lines (or properly split)

### Review Status
- [ ] spec-compliance-review.md verdict: SPEC_COMPLIANT
- [ ] code-quality-review.md verdict: APPROVED
- [ ] security-review.md verdict: APPROVED (no critical/high issues)

### Test Status
- [ ] All tests pass: `go test ./...` exits 0
- [ ] Coverage ≥80%: Verified in test-validation.md
- [ ] Mock servers implemented for external API calls

### Quality Metrics (in metadata.json)
```json
{
  "quality_metrics": {
    "p0_compliance": "7/7 requirements passed",
    "test_coverage": ">=80%",
    "review_verdict": "APPROVED",
    "security_verdict": "APPROVED",
    "file_sizes": "all <400 lines"
  }
}
```

### Final Verification Commands
```bash
# All must pass before completion
cd modules/chariot/backend
go build ./...          # Build succeeds
go test ./...           # Tests pass
go vet ./...            # No vet warnings
golangci-lint run       # Lint passes
```

### Human Approval
- [ ] Human reviewed final result via AskUserQuestion
- [ ] Human selected action: Merge to main | Create PR | Keep branch

### Rationalization Check
- [ ] No rationalization phrases detected during workflow
- [ ] Any P0 exceptions explicitly approved by user
- [ ] Override protocol followed for any skipped requirements

## Incomplete Exit Criteria

If any exit criterion is not met:

1. **Identify gap** - Which criterion failed?
2. **Route to phase** - Return to appropriate phase to fix
3. **Do NOT mark complete** - Status remains 'in_progress'
4. **Document blocker** - Update metadata.json with blocking issue

```json
{
  "status": "blocked",
  "blocked_reason": "p0_compliance_failed",
  "blocking_requirement": "CheckAffiliation is stub implementation",
  "remediation": "Return to Phase 4, implement real API query"
}
```

## Related Skills

- `orchestrating-feature-development` - Similar pattern (reference for structure)
- `orchestrating-capability-development` - Similar pattern (reference for structure)
- `developing-integrations` - P0 requirements definition
- `validating-integrations` - P0 compliance verification
- `testing-integrations` - Mock patterns for integration tests
- `integrating-with-*` - Vendor-specific API patterns (auth, rate limits, pagination)
- `gateway-integrations` - Routes to integration skills
