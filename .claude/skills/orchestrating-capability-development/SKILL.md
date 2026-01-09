---
name: orchestrating-capability-development
description: Use when developing security capabilities (VQL, Nuclei, Janus, Fingerprintx, Scanner integrations) - coordinates architecture, implementation, review, and testing phases with capability-specific quality checks
allowed-tools: Skill, Task, TodoWrite, Read, Write, Bash, AskUserQuestion
---

# Capability Development Orchestration

Systematically guides security capability development through six phases with specialized agent execution, human checkpoints, and capability-specific quality validation.

## When to Use This Skill

Use this skill when you need to:

- Develop a complete security capability from design to tested artifact
- Create VQL capabilities for Velociraptor-based detection
- Write Nuclei templates for vulnerability scanning
- Build Janus tool chains for security scanner orchestration
- Implement Fingerprintx modules for service detection
- Integrate external security scanners into the platform

**Invoked by:** `/capability` command

**Symptoms this skill addresses:**

- Manual orchestration of capability-specific agents
- Missing architecture approval for security detection logic
- Inconsistent quality checks across capability types
- No structured workflow for VQL/Nuclei/Janus development
- Lost context between development phases

## Quick Reference

| Phase               | Agents/Skills                 | Execution      | Checkpoint            |
| ------------------- | ----------------------------- | -------------- | --------------------- |
| 0: Setup            | -                             | Sequential     | -                     |
| 1: Brainstorming    | brainstorming skill           | Sequential     | 🛑 Human              |
| 2: Discovery        | Explore (very thorough)       | Sequential     | -                     |
| 3: Architecture     | capability-lead               | Sequential     | 🛑 Human              |
| 4: Implementation   | capability-developer          | Mode-dependent | Per-task if 4+        |
| 4.5: Plan Completion| orchestrator                  | Sequential     | 🛑 Human (if gaps)    |
| 5: Review           | capability-reviewer           | Stage 1 → 2    | Stage 1: 2x, Stage 2: 1x |
| 6: Testing          | test-lead + capability-tester | Sequential     | 1 retry → escalate    |

## Table of Contents

### Core Phases

Each phase has detailed documentation in the references/ directory:

- **[Phase 1: Brainstorming](references/phase-1-brainstorming.md)** - Clarify capability requirements and type
- **[Phase 2: Discovery](references/phase-2-discovery.md)** - Search existing capabilities for reusable patterns
- **[Phase 3: Architecture](references/phase-3-architecture.md)** - Design detection logic and data flow
- **[Phase 4: Implementation](references/phase-4-implementation.md)** - Create VQL/Nuclei/Janus/Fingerprintx artifacts
- **[Phase 4: Per-Task Mode](references/phase-4-per-task-mode.md)** - Per-task review cycles (4+ tasks)
- **[Phase 4.5: Plan Completion](references/phase-4.5-implementation-review.md)** - Verify all requirements implemented
- **[Phase 5: Review](references/phase-5-review.md)** - Two-stage gated review (spec → quality)
- **[Phase 6: Testing](references/phase-6-testing.md)** - Test detection accuracy and edge cases

### Supporting Documentation

Cross-cutting concerns and capability-specific guidance:

- **[Capability Types](references/capability-types.md)** - VQL, Nuclei, Janus, Fingerprintx, Scanner comparison
- **[Quality Standards](references/quality-standards.md)** - Detection accuracy, false positive rates, protocol correctness
- **[Agent Handoffs](references/agent-handoffs.md)** - Structured JSON handoff format between phases
- **[Troubleshooting](references/troubleshooting.md)** - Common issues and solutions

## Workflow Overview

**CRITICAL: Use TodoWrite to track all phases.** Do NOT track mentally.

**REQUIRED SUB-SKILLS for this workflow:**

| Phase | Required Sub-Skills                                     | Conditional Sub-Skills                                  |
| ----- | ------------------------------------------------------- | ------------------------------------------------------- |
| All   | `persisting-agent-outputs` (output format)              | -                                                       |
| All   | `orchestrating-multi-agent-workflows` (blocked routing) | -                                                       |
| 1     | `selecting-plugin-implementation-pattern` (Read)        | -                                                       |
| 1     | `brainstorming`                                         | -                                                       |
| 1.5   | -                                                       | `porting-python-capabilities-to-go` (if porting Python) |
| 3-6   | -                                                       | `developing-with-subagents` (if >3 tasks)               |
| 3-6   | -                                                       | `persisting-progress-across-sessions` (if >5 tasks)     |
| 3-6   | -                                                       | `dispatching-parallel-agents` (if 3+ failures)          |

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 0: Setup                                                         │
│  Create: .claude/.output/capabilities/YYYYMMDD-HHMMSS-{capability-name}/       │
│  Initialize: metadata.json with capability type and description         │
│                                                                         │
│  **REQUIRED SUB-SKILL:** persisting-agent-outputs (discover output dir) │
│  **REQUIRED SUB-SKILL:** orchestrating-multi-agent-workflows (routing)  │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 1: Brainstorming (Optional)                                      │
│  **REQUIRED SUB-SKILL:** brainstorming                                  │
│  **STEP 0:** Read selecting-plugin-implementation-pattern (YAML vs Go)  │
│  Tool: Skill("brainstorming") OR AskUserQuestion for requirements       │
│  Determine: Implementation pattern → Capability type                    │
│             (YAML → Nuclei/Augustus | Go → Fingerprintx/Janus/Scanner | │
│              VQL → VQL Capability)                                      │
│  Output: design.md                                                      │
│  Gate Checklist:                                                        │
│    - [ ] Implementation pattern decided (YAML | Go | VQL)               │
│    - [ ] design.md exists with capability requirements                  │
│    - [ ] Capability type confirmed (VQL | Nuclei | Janus |             │
│          Fingerprintx | Scanner)                                        │
│    - [ ] Detection goals documented                                     │
│    - [ ] Human approved via AskUserQuestion                             │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 1.5: Work Type Decision Point                                    │
│                                                                         │
│  IF porting existing Python capability (Go implementation pattern):     │
│      port_workflow = REQUIRED                                           │
│      **CONDITIONAL SUB-SKILL:** porting-python-capabilities-to-go       │
│      (Coordinates: mapping-python-dependencies →                        │
│       translating-python-idioms-to-go → verifying-port-equivalent)      │
│  ELSE (greenfield development):                                         │
│      port_workflow = SKIP                                               │
│      Continue to Phase 2                                                │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 2: Discovery                                                     │
│  Agent: Explore (native, very thorough mode)                            │
│  **PROMPT TEMPLATE:** references/prompts/explore-prompt.md              │
│  Search: Existing capabilities for reusable patterns                    │
│  Identify: Similar capabilities to reference or extend                  │
│  Output: discovery.md with reuse analysis                               │
│  **CONDITIONAL SUB-SKILL:** dispatching-parallel-agents (3+ failures)   │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 3: Architecture                                                  │
│  Agent: capability-lead                                                 │
│  **PROMPT TEMPLATE:** references/prompts/architect-prompt.md            │
│  Input: design.md + discovery.md                                        │
│  Create: Implementation plan with detection logic, data flow,           │
│          error handling                                                 │
│  Output: architecture.md                                                │
│  Gate Checklist:                                                        │
│    - [ ] architecture.md created by capability-lead                     │
│    - [ ] Detection logic documented                                     │
│    - [ ] Data flow documented                                           │
│    - [ ] Error handling approach documented                             │
│    - [ ] Human approved via AskUserQuestion                             │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 4: Implementation (MODE-DEPENDENT)                               │
│  Agent: capability-developer                                            │
│  **PROMPT TEMPLATE:** references/prompts/developer-prompt.md            │
│  Input: architecture.md                                                 │
│  Mode Selection: 1-3 tasks → Batch | 4+ tasks → Per-Task                │
│  Create: VQL/Nuclei/Janus/Fingerprintx artifacts                        │
│  Output: Capability files + implementation-log.md                       │
│                                                                         │
│  **REQUIRED (in prompt):** developing-with-tdd                          │
│  **REQUIRED (in prompt):** verifying-before-completion                  │
│  **PER-TASK MODE:** See references/phase-4-per-task-mode.md             │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 4.5: Implementation Completion Review                            │
│  Orchestrator: (manual verification, no agent)                          │
│  **REFERENCE:** references/phase-4.5-implementation-review.md           │
│  Verify: ALL architecture requirements implemented                      │
│  Generate: Requirements checklist from architecture.md                  │
│  Cross-reference: implementation-log.md against checklist               │
│  Output: implementation-completion-review.md                            │
│  Gate Checklist:                                                        │
│    - [ ] All requirements have evidence (file:line)                     │
│    - [ ] OR deferred with user approval                                 │
│    - [ ] OR removed with user approval                                  │
│  Human Approval: Required if any gaps found                             │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 5: Review (TWO-STAGE GATED)                                      │
│  Agent: capability-reviewer                                             │
│  **PROMPT TEMPLATE:** references/prompts/reviewer-prompt.md             │
│                                                                         │
│  STAGE 1: Spec Compliance (BLOCKING GATE)                               │
│    Focus: Does implementation match architecture exactly?               │
│    Verdict: SPEC_COMPLIANT | NOT_COMPLIANT                              │
│    Retry: MAX 2 attempts before escalate                                │
│                                                                         │
│  STAGE 2: Code Quality (after Stage 1 passes)                           │
│    Focus: Is code well-built?                                           │
│    Verdict: APPROVED | CHANGES_REQUESTED                                │
│    Retry: MAX 1 attempt before escalate                                 │
│                                                                         │
│  Output: spec-compliance-review.md, code-quality-review.md              │
│  Escalate: If retry limits exceeded → AskUserQuestion                   │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 6: Testing (MAX 1 RETRY)                                         │
│  Step 1: Agent: test-lead (create test plan)                            │
│  **PROMPT TEMPLATE:** references/prompts/test-lead-prompt.md            │
│  Step 2: Agent: capability-tester (implement tests)                     │
│  **PROMPT TEMPLATE:** references/prompts/tester-prompt.md               │
│  Step 3: Agent: test-lead (validate test implementation)                │
│  **PROMPT TEMPLATE:** references/prompts/test-lead-prompt.md            │
│  Output: test-plan.md, test files, test-validation.md                   │
│                                                                         │
│  **REQUIRED (in tester prompt):** developing-with-tdd                   │
│  Gate Checklist:                                                        │
│    - [ ] test-lead created test plan                                    │
│    - [ ] capability-tester implemented tests                            │
│    - [ ] test-lead validated against plan                               │
│    - [ ] Detection accuracy meets threshold                             │
│    - [ ] False positive rate acceptable                                 │
│    - [ ] OR max 1 retry completed, then escalate                        │
│  Loop: If plan not met → tester fixes → re-validate ONCE                │
│  Escalate: If still failing → AskUserQuestion                           │
│  Run: Full test suite with capability-specific checks                   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Phase 0: Setup

### Required Skills

Invoke these skills BEFORE spawning any agents:

```
1. skill: "orchestrating-multi-agent-workflows"
   - Provides: Effort scaling, delegation protocol, routing table

2. skill: "persisting-agent-outputs"
   - Provides: Output directory structure, metadata format

3. skill: "using-todowrite"
   - Provides: Todo tracking methodology for all phases
```

### Create Capability Workspace

```bash
# Semantic naming: 2-3 words describing the capability
CAPABILITY_NAME="<semantic-name>"  # e.g., "s3-bucket-exposure"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
CAPABILITY_ID="${TIMESTAMP}-${CAPABILITY_NAME}"
OUTPUT_DIR=".claude/.output/capabilities/${CAPABILITY_ID}"

mkdir -p "${OUTPUT_DIR}"
```

**Semantic naming examples:**

- `s3-bucket-exposure` (VQL capability)
- `cve-2024-1234-detection` (Nuclei template)
- `ssl-scanner-chain` (Janus tool chain)
- `mysql-fingerprint` (Fingerprintx module)
- `shodan-integration` (Scanner integration)

### Initialize Metadata

Create `${OUTPUT_DIR}/metadata.json`:

```json
{
  "capability_id": "20260104-143000-s3-bucket-exposure",
  "capability_type": "vql|nuclei|janus|fingerprintx|scanner",
  "description": "Original capability description",
  "created": "2026-01-04T14:30:00Z",
  "status": "in_progress",
  "current_phase": "brainstorming",
  "phases": {
    "brainstorming": { "status": "in_progress" },
    "discovery": { "status": "pending" },
    "architecture": { "status": "pending", "human_approved": false },
    "implementation": { "status": "pending" },
    "review": { "status": "pending", "retry_count": 0 },
    "testing": { "status": "pending", "retry_count": 0 }
  },
  "quality_metrics": {
    "detection_accuracy": null,
    "false_positive_rate": null,
    "test_coverage": null
  },
  "agents_invoked": [],
  "skills_invoked": [
    "orchestrating-multi-agent-workflows",
    "persisting-agent-outputs",
    "using-todowrite"
  ]
}
```

### Create MANIFEST.yaml

See [persisting-agent-outputs](../persisting-agent-outputs/SKILL.md) for complete MANIFEST.yaml format.

```yaml
capability_name: "<capability-name>"
capability_type: "<vql|nuclei|janus|fingerprintx|scanner>"
created: "2026-01-04T14:30:00Z"
status: "in_progress"
agents:
  - name: "capability-lead"
    phase: "architecture"
    artifacts:
      - "architecture.md"
    status: "pending"
files:
  - name: "metadata.json"
    type: "metadata"
    phase: "setup"
```

## Agent Spawning Protocol

**MANDATORY for ALL agents spawned by this orchestration skill:**

Every Task prompt must include:

```
OUTPUT_DIRECTORY: {the capability directory path from Phase 0}

MANDATORY SKILLS (invoke ALL before completing):
- persisting-agent-outputs: For writing output files
- gateway-capabilities: For capability-specific patterns
- gateway-backend: For Go/Python implementation patterns (if applicable)

COMPLIANCE: Document invoked skills in your output metadata.
```

## Capability Type Matrix

| Type         | Lead Focus                       | Developer Focus                | Test Focus                    |
| ------------ | -------------------------------- | ------------------------------ | ----------------------------- |
| VQL          | Query structure, artifacts       | Velociraptor queries           | Query parsing, detection      |
| Nuclei       | Template structure, matchers     | YAML templates, detection      | False positives, CVE coverage |
| Janus        | Pipeline design, tool chain      | Go integration, orchestration  | Pipeline flow, error handling |
| Fingerprintx | Probe design, protocol           | Go modules, response parsing   | Service detection accuracy    |
| Scanner      | API design, result normalization | Go/Python client, data mapping | Integration, error cases      |

See [references/capability-types.md](references/capability-types.md) for complete comparison.

## Blocked Status Handling

When agents return blocked, use the routing table from `orchestrating-multi-agent-workflows`:

| Block Reason          | Route To          |
| --------------------- | ----------------- |
| architecture_decision | capability-lead   |
| security_concern      | security-lead     |
| test_failures         | capability-tester |
| out_of_scope          | AskUserQuestion   |

## Progress Persistence

This skill uses the persistence format from `persisting-agent-outputs`:

- **metadata.json**: Current phase, agent status, quality metrics
- **MANIFEST.yaml**: Agent contributions, artifact tracking
- **progress.json**: Resumable workflow state (optional, for long-running development)

See [persisting-agent-outputs](../persisting-agent-outputs/SKILL.md) for complete format.

## Integration

### Called By

- `/capability` command - Primary entry point for users
- Direct skill invocation for capability development workflows

### Requires (invoke before starting)

| Skill                                 | When               | Purpose                                                |
| ------------------------------------- | ------------------ | ------------------------------------------------------ |
| `persisting-agent-outputs`            | Phase 0            | Discover output directory, set up capability workspace |
| `orchestrating-multi-agent-workflows` | When agent blocked | Routing table for blocked_reason handling              |

### Calls (skill-invocation via Skill tool)

| Skill           | Phase   | Purpose                                   |
| --------------- | ------- | ----------------------------------------- |
| `brainstorming` | Phase 1 | Clarify capability requirements with user |

### Reads (library skills via Read tool)

| Skill                                     | Phase            | Purpose                                                 |
| ----------------------------------------- | ---------------- | ------------------------------------------------------- |
| `selecting-plugin-implementation-pattern` | Phase 1 (Step 0) | Decide YAML template vs Go plugin before type selection |

### Spawns (agent-dispatch via Task tool)

| Agent                  | Phase          | Mandatory Skills in Prompt                                                 |
| ---------------------- | -------------- | -------------------------------------------------------------------------- |
| `Explore`              | Phase 2        | discovering-reusable-code, persisting-agent-outputs                        |
| `capability-lead`      | Phase 3        | adhering-to-dry, adhering-to-yagni, persisting-agent-outputs               |
| `capability-developer` | Phase 4        | developing-with-tdd, verifying-before-completion, persisting-agent-outputs |
| `capability-reviewer`  | Phase 5        | adhering-to-dry, adhering-to-yagni, persisting-agent-outputs               |
| `test-lead`            | Phase 6.1, 6.3 | persisting-agent-outputs                                                   |
| `capability-tester`    | Phase 6.2      | developing-with-tdd, persisting-agent-outputs                              |

### Conditional (based on work type)

| Skill                               | Trigger                          | Purpose                                                                     |
| ----------------------------------- | -------------------------------- | --------------------------------------------------------------------------- |
| `porting-python-capabilities-to-go` | Porting Python to Go (Phase 1.5) | Coordinates dependency mapping, idiom translation, equivalence verification |

### Conditional (based on complexity)

| Skill                                 | Trigger                                 | Purpose                                    |
| ------------------------------------- | --------------------------------------- | ------------------------------------------ |
| `developing-with-subagents`           | Implementation has >3 independent tasks | Fresh subagent per task + two-stage review |
| `persisting-progress-across-sessions` | Development has >5 tasks                | Enable session resume for long workflows   |
| `dispatching-parallel-agents`         | 3+ independent failures                 | Parallel investigation of unrelated issues |

### Agent Skills (embedded in prompts)

These skills are included in prompt templates for subagents:

| Skill                         | Agents                                  | Purpose                                     |
| ----------------------------- | --------------------------------------- | ------------------------------------------- |
| `developing-with-tdd`         | capability-developer, capability-tester | Write test first, verify failure, implement |
| `verifying-before-completion` | All implementation agents               | Verify before claiming done                 |
| `adhering-to-dry`             | capability-developer                    | Prevent duplication                         |
| `adhering-to-yagni`           | capability-developer                    | Prevent over-engineering                    |

### Prompt Templates

Located in `references/prompts/`:

| Template              | Used In             | Agents               |
| --------------------- | ------------------- | -------------------- |
| `explore-prompt.md`   | Phase 2             | Explore              |
| `architect-prompt.md` | Phase 3             | capability-lead      |
| `developer-prompt.md` | Phase 4             | capability-developer |
| `reviewer-prompt.md`  | Phase 5             | capability-reviewer  |
| `test-lead-prompt.md` | Phase 6 (Step 1, 3) | test-lead            |
| `tester-prompt.md`    | Phase 6 (Step 2)    | capability-tester    |

### Alternative Workflows

| Skill                                    | When to Use Instead                                                    |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| `orchestrating-fingerprintx-development` | Specialized orchestration for fingerprintx modules with blocking gates |
| `orchestrating-feature-development`      | Frontend/backend feature development (not security capabilities)       |

## Checkpoint Configuration

### Phase-Level Checkpoints (Default)

Human approval required at:
- Phase 1 (brainstorming): Capability type and requirements confirmed
- Phase 3 (architecture): Implementation plan approved
- Phase 4.5 (completion review): If any requirements missing/deferred

### Task-Level Checkpoints (For Large Plans)

When implementation has 4+ tasks (per-task mode), add intermediate checkpoints:

- **Every 3 tasks**: Generate progress report
- **Any task >2 retries**: Mandatory human review before continuing
- **Cumulative issues >5**: Stop and review before continuing

### Progress Checkpoint Format

```markdown
## Progress Checkpoint - Tasks {X-Y}

**Tasks completed**: X/Y
**Issues encountered**:
- [list issues or "None"]

**Current blockers**:
- [list blockers or "None"]

**Retry counts**:
- Task N: spec compliance X, code quality Y

**Recommendation**: [Continue | Pause for review | Escalate]
```

## Context Management

### Fresh Subagent Per Task

Each task dispatch uses a NEW agent instance. This is intentional:

- **No context pollution** from previous tasks
- **Clean slate** for each implementation
- **Parallel-safe** execution
- **Consistent behavior** regardless of task order

### DO NOT

- Manually fix code then continue with same agent context
- Ask agent to "continue from where you left off"
- Reuse agent instance across multiple tasks
- Assume agent remembers previous work

### If Agent Fails

Dispatch a NEW agent with:
- The original task specification
- Error context from failed attempt
- Explicit instruction to start fresh

```typescript
Task({
  subagent_type: "capability-developer",
  description: "Implement {task} (fresh attempt)",
  prompt: `
    Previous attempt failed with: {error}

    Start fresh. Do not assume any prior work exists.
    Implement {task} from scratch following architecture.md.

    [rest of prompt]
  `
});
```

## Key Principles

1. **Human Checkpoints**: Phases 1, 3, and 4.5 (if gaps) require human approval
2. **Two-Stage Review**: Phase 5 uses spec compliance gate (2 retries) then code quality (1 retry)
3. **Per-Task Mode**: 4+ tasks use per-task review cycles for early issue detection
4. **Capability-Specific Quality**: Each capability type has different quality metrics
5. **Output Persistence**: All agent outputs must follow `persisting-agent-outputs` format
6. **Mandatory Skills**: All agents must invoke gateway-capabilities and persisting-agent-outputs
7. **Fresh Agents**: Each task dispatch uses new agent instance (no context pollution)
8. **Clarification Gate**: Developers must ask questions before assuming requirements

## Rationalization Prevention

Agents rationalize skipping steps. Watch for warning phrases and use evidence-based gates.

**Reference**: See [shared rationalization prevention](../using-skills/references/rationalization-prevention.md) for:

- Statistical evidence (technical debt ~10% fix rate, 'later' ~5% completion)
- Phrase detection patterns ('close enough', 'just this once', 'I'll fix it later')
- Override protocol (requires AskUserQuestion with explicit risk disclosure)

### Capability Development Rationalizations

See [references/rationalization-table.md](references/rationalization-table.md) for domain-specific rationalizations.

**Key principle**: If you detect rationalization phrases in your thinking, STOP. Return to the phase checklist. Complete all items before proceeding.

## Exit Criteria

Capability development is complete when:

- All 6 phases marked 'complete' in metadata.json
- All gate checklists passed (not 'close enough')
- Quality metrics populated (detection_accuracy, false_positive_rate, test_coverage)
- No rationalization phrases detected in workflow execution
- Any overrides documented per override protocol
- Human approves final result

## Changelog

See `.history/CHANGELOG` for detailed version history.
