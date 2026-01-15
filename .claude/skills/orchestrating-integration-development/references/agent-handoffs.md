# Agent Handoffs

**Purpose**: Define structured handoff protocol for passing context between agents across phases.

## Overview

Agent handoffs enable clean phase-to-phase transitions with full context preservation. Each agent returns a JSON metadata block at the end of its output file that serves as the handoff to the next phase.

**Key Principles**:
1. **Structured Format**: JSON metadata block (not prose)
2. **Status-Driven Routing**: Agent status determines orchestrator's next action
3. **Skills Accountability**: Agents document which skills they invoked
4. **Context Preservation**: Brief instructions for next agent

## JSON Metadata Block Structure

Every agent output file ends with this metadata block:

```json
{
  "agent": "integration-lead",
  "output_type": "integration-architecture",
  "timestamp": "2026-01-14T14:30:22Z",
  "feature_directory": ".claude/.output/integrations/2026-01-14-143022-shodan/",
  "skills_invoked": [
    "using-skills",
    "discovering-reusable-code",
    "enforcing-evidence-based-analysis",
    "gateway-integrations",
    "writing-plans",
    "persisting-agent-outputs",
    "verifying-before-completion"
  ],
  "library_skills_read": [
    ".claude/skill-library/development/integrations/developing-integrations/SKILL.md",
    ".claude/skill-library/development/integrations/integrating-with-shodan/SKILL.md"
  ],
  "source_files_verified": [
    "modules/chariot/backend/pkg/tasks/integrations/wiz/wiz.go:1-200",
    "modules/chariot/backend/pkg/tasks/integrations/xpanse/xpanse.go:100-300"
  ],
  "status": "complete",
  "handoff": {
    "next_agent": "integration-developer",
    "context": "Implement integration following architecture sections 1-5. P0 requirements: VMFilter initialized at line 45, CheckAffiliation must query /api/v1/assets endpoint (not stub), ValidateCredentials uses /api/v1/auth/validate."
  }
}
```

## Metadata Fields

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `agent` | string | Agent name (integration-lead, integration-developer, etc.) |
| `output_type` | string | Type of output (architecture, implementation-log, review, etc.) |
| `timestamp` | string | ISO 8601 timestamp when agent completed |
| `feature_directory` | string | Absolute path to output directory |
| `skills_invoked` | string[] | Core skills invoked via Skill tool |
| `status` | enum | complete \| blocked \| needs_review \| needs_clarification |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `library_skills_read` | string[] | Library skills loaded via Read tool |
| `source_files_verified` | string[] | Code files analyzed with line ranges |
| `blocked_reason` | enum | security_concern \| architecture_decision \| test_failures \| missing_requirements \| unknown |
| `attempted` | string[] | What agent tried before blocking |
| `handoff.next_agent` | string | Recommended next agent |
| `handoff.context` | string | Brief instructions for next agent |

## Status Values and Routing

### Status: complete

**Meaning**: Work finished successfully, ready for next phase.

**Orchestrator Action**:
1. Mark current phase complete in metadata.json
2. Check handoff.next_agent for recommendation
3. Spawn next phase agent OR proceed to next phase

**Example**:
```json
{
  "status": "complete",
  "handoff": {
    "next_agent": "integration-developer",
    "context": "Implement according to architecture plan sections 1-5"
  }
}
```

### Status: blocked

**Meaning**: Cannot proceed, orchestrator must route via routing table.

**Orchestrator Action**:
1. Read `blocked_reason` field
2. Use Agent Routing Table to determine next agent
3. OR escalate to human via AskUserQuestion if no match

**Critical**: handoff.next_agent MUST be `null` when blocked. Orchestrator determines routing.

**Example**:
```json
{
  "status": "blocked",
  "blocked_reason": "security_concern",
  "attempted": ["Tried to implement OAuth2 flow but unsure about token storage security"],
  "handoff": {
    "next_agent": null,
    "context": "Integration requires OAuth2 token storage. Security review needed before proceeding with implementation."
  }
}
```

### Status: needs_review

**Meaning**: Work done but requires user approval before proceeding.

**Orchestrator Action**:
1. Present agent output to user
2. Use AskUserQuestion with approval options
3. If approved: proceed to next phase
4. If rejected: re-spawn agent with feedback

**Example**:
```json
{
  "status": "needs_review",
  "handoff": {
    "next_agent": "integration-developer",
    "context": "Architecture complete. User approval required before implementation."
  }
}
```

### Status: needs_clarification

**Meaning**: Missing information prevents completion.

**Orchestrator Action**:
1. Extract clarification questions from output
2. Use AskUserQuestion to gather answers
3. Re-spawn SAME agent with clarification context

**Example**:
```json
{
  "status": "needs_clarification",
  "handoff": {
    "next_agent": null,
    "context": "Cannot determine authentication method. User must specify: API key, OAuth2, or mutual TLS?"
  }
}
```

## Agent Routing Table

When agent returns `blocked`, orchestrator maps `blocked_reason` to next agent:

| Agent Type | Blocked Reason | Next Agent |
|------------|----------------|------------|
| `integration-developer` | security_concern | `backend-security` |
| `integration-developer` | architecture_decision | `integration-lead` |
| `integration-developer` | test_failures | `backend-tester` |
| `integration-developer` | missing_requirements | AskUserQuestion |
| `backend-tester` | missing_test_plan | `test-lead` |
| `backend-reviewer` | implementation_unclear | `integration-developer` (with clarification) |
| `backend-security` | architecture_change_needed | `integration-lead` |
| `*` | unknown | AskUserQuestion (escalate) |

## Skill Accountability

### Mandatory Skills Verification

**Pattern in Task Prompts**:
```markdown
MANDATORY SKILLS (invoke ALL before completing):
- persisting-agent-outputs: Output directory and metadata
- verifying-before-completion: Final verification before claiming done
- gateway-integrations: Integration patterns and P0 requirements

COMPLIANCE: Document invoked skills in output metadata. I will verify.
```

**Verification Process**:
1. Orchestrator spawns agent with mandatory skills list in prompt
2. Agent invokes skills via Skill tool
3. Agent returns metadata with `skills_invoked` array
4. Orchestrator reads metadata.skills_invoked
5. Compare against mandatory list from prompt
6. If mismatch: Log discrepancy (agent claimed completion without required skills)

**Example Verification**:
```
Prompt specified mandatory skills: ["persisting-agent-outputs", "verifying-before-completion", "gateway-integrations"]
Agent returned skills_invoked: ["persisting-agent-outputs", "gateway-integrations"]
→ DISCREPANCY: Missing "verifying-before-completion"
→ ACTION: Note in orchestrator log, may affect quality of output
```

### Library Skills Tracking

Agents also document library skills loaded via Read tool:

```json
{
  "library_skills_read": [
    ".claude/skill-library/development/integrations/developing-integrations/SKILL.md",
    ".claude/skill-library/development/integrations/integrating-with-shodan/SKILL.md"
  ]
}
```

This enables orchestrator to track which domain knowledge was consulted.

## Phase-to-Phase Handoff Examples

### Phase 3 → Phase 4: Architecture → Implementation

**integration-lead returns**:
```json
{
  "agent": "integration-lead",
  "status": "complete",
  "skills_invoked": [
    "using-skills",
    "discovering-reusable-code",
    "enforcing-evidence-based-analysis",
    "gateway-integrations",
    "brainstorming",
    "writing-plans",
    "persisting-agent-outputs",
    "verifying-before-completion"
  ],
  "source_files_verified": [
    "modules/chariot/backend/pkg/tasks/integrations/wiz/wiz.go:1-300",
    "modules/chariot/backend/pkg/tasks/integrations/xpanse/xpanse.go:200-400"
  ],
  "handoff": {
    "next_agent": "integration-developer",
    "context": "Implement Shodan integration following architecture sections 1-5. P0 checklist in architecture.md section 6. VMFilter initialization pattern from Wiz, CheckAffiliation must query /api/v1/host/{ip} endpoint, pagination uses API-provided total_count."
  }
}
```

**Orchestrator spawns integration-developer**:
```markdown
Task: Implement Shodan integration according to architecture plan

Context from Phase 3 (integration-lead):
{handoff.context from above}

Architecture file: .claude/.output/integrations/2026-01-14-shodan/architecture.md

MANDATORY SKILLS:
- using-skills
- discovering-reusable-code
- semantic-code-operations
- developing-with-tdd
- enforcing-evidence-based-analysis
- persisting-agent-outputs
- verifying-before-completion
- gateway-integrations

OUTPUT_DIRECTORY: .claude/.output/integrations/2026-01-14-shodan/
```

### Phase 4 → Phase 4.5: Implementation → P0 Validation

**integration-developer returns**:
```json
{
  "agent": "integration-developer",
  "status": "complete",
  "skills_invoked": [
    "using-skills",
    "discovering-reusable-code",
    "semantic-code-operations",
    "developing-with-tdd",
    "enforcing-evidence-based-analysis",
    "persisting-agent-outputs",
    "verifying-before-completion",
    "gateway-integrations"
  ],
  "handoff": {
    "next_agent": null,
    "context": "Implementation complete. Ready for P0 compliance verification (Phase 4.5) before code review."
  }
}
```

**Orchestrator proceeds to Phase 4.5**:
- Phase 4.5 is NOT an agent, it's a skill invocation
- Orchestrator invokes `validating-integrations` library skill
- Skill generates `p0-compliance-review.md`
- IF violations found: 🛑 Human Checkpoint
- IF no violations: Proceed automatically to Phase 5 (Review)

### Phase 5 → Phase 6: Review → Testing

**backend-reviewer returns** (after two-stage gated review):
```json
{
  "agent": "backend-reviewer",
  "status": "complete",
  "handoff": {
    "next_agent": "test-lead",
    "context": "Code review complete. All spec compliance and quality checks passed. Ready for test planning."
  }
}
```

**Orchestrator spawns test-lead**:
```markdown
Task: Create test plan for Shodan integration

Context: Implementation passed code review (spec compliance + quality). Integration implements asset discovery via Shodan API with P0 compliance verified.

MANDATORY SKILLS:
- persisting-agent-outputs

OUTPUT_DIRECTORY: .claude/.output/integrations/2026-01-14-shodan/
```

## Blocked Status Handling

### Example: Security Concern

**integration-developer returns**:
```json
{
  "agent": "integration-developer",
  "status": "blocked",
  "blocked_reason": "security_concern",
  "attempted": [
    "Implemented OAuth2 flow with token storage",
    "Unsure if storing refresh tokens in Job.Secret is secure",
    "Need security review before proceeding"
  ],
  "handoff": {
    "next_agent": null,
    "context": "OAuth2 implementation needs security review. Question: Is Job.Secret appropriate for refresh token storage? Should we encrypt tokens at rest?"
  }
}
```

**Orchestrator Action**:
1. Read blocked_reason: "security_concern"
2. Route via table: integration-developer + security_concern → backend-security
3. Spawn backend-security with context from blocked agent

```markdown
Task: Security review of OAuth2 implementation for Shodan integration

Context: integration-developer implemented OAuth2 flow but blocked on security concern: Is Job.Secret appropriate for refresh token storage?

Implementation files: {list from integration-developer output}

MANDATORY SKILLS:
- using-skills
- persisting-agent-outputs

OUTPUT_DIRECTORY: .claude/.output/integrations/2026-01-14-shodan/
```

### Example: Missing Requirements

**integration-lead returns**:
```json
{
  "agent": "integration-lead",
  "status": "blocked",
  "blocked_reason": "missing_requirements",
  "attempted": [
    "Cannot design CheckAffiliation without knowing which Shodan API endpoint verifies asset ownership",
    "Shodan API documentation doesn't clearly document asset ownership verification"
  ],
  "handoff": {
    "next_agent": null,
    "context": "Need user to clarify: Does Shodan API have an endpoint to verify if an IP address is still active/owned by customer? Or should we re-enumerate to check affiliation?"
  }
}
```

**Orchestrator Action**:
1. Read blocked_reason: "missing_requirements"
2. Route via table: * + missing_requirements → AskUserQuestion
3. Escalate to human via AskUserQuestion

```markdown
integration-lead blocked on missing requirements.

Question: Does Shodan API have an endpoint to verify if an IP address is still active/owned by customer?

Options:
1. Yes, use /api/v1/host/{ip} endpoint (provide endpoint details)
2. No, use BaseCapability.CheckAffiliationSimple (re-enumerates all assets)
3. Other (describe alternative approach)
```

## Related Skills

- `orchestrating-multi-agent-workflows` - General agent coordination patterns
- `persisting-agent-outputs` - Output directory structure and metadata format
- `verifying-before-completion` - Exit criteria verification before agent claims done
