# Blocked Agent Routing

**Routing table for determining next agent when an agent returns with `status: "blocked"`.**

---

## Overview

When an agent completes work but encounters a blocker (security concern, architecture decision, test failures, etc.), it returns with `status: "blocked"` and a `blocked_reason` enum value. The next agent is determined using this routing table.

### Two Execution Contexts

1. **Orchestrated Context**: Agent spawned by an orchestration skill (e.g., `orchestrating-feature-development`, `orchestrating-integration-development`)
   - Agent sets `handoff.next_agent = null` in metadata
   - Orchestrator reads `blocked_reason` and uses this routing table to determine next agent
   - Orchestrator may override routing based on workflow context

2. **Direct CLI Context**: Agent invoked directly from command line (e.g., `claude task --agent frontend-developer`)
   - Agent sets `handoff.next_agent` in metadata using this routing table
   - No orchestrator exists to override routing
   - Agent must determine its own domain and apply routing logic

---

## Blocked Routing Table

| blocked_reason          | Frontend Domain          | Backend Domain     | Capability Domain     | Tool Domain     |
| ----------------------- | ------------------------ | ------------------ | --------------------- | --------------- |
| `security_concern`      | `frontend-security`      | `backend-security` | `capability-reviewer` | `tool-reviewer` |
| `architecture_decision` | `frontend-lead`          | `backend-lead`     | `capability-lead`     | `tool-lead`     |
| `missing_requirements`  | → user (AskUserQuestion) | → user             | → user                | → user          |
| `test_failures`         | `frontend-tester`        | `backend-tester`   | `capability-tester`   | `tool-tester`   |
| `out_of_scope`          | → user (AskUserQuestion) | → user             | → user                | → user          |
| `unknown`               | → user (AskUserQuestion) | → user             | → user                | → user          |

### Routing Logic by blocked_reason

**Security Concerns (`security_concern`)**

- Route to domain-specific security reviewer
- Examples: XSS vulnerabilities, authentication issues, credential exposure, OWASP violations

**Architecture Decisions (`architecture_decision`)**

- Route to domain-specific lead architect
- Examples: Pattern selection, library choices, state management approach, API design

**Missing Requirements (`missing_requirements`)**

- Escalate to user via AskUserQuestion
- Agent lacks information to proceed (unclear business logic, undefined behavior, ambiguous specs)

**Test Failures (`test_failures`)**

- Route to domain-specific tester
- Examples: Unit test failures, integration test errors, E2E test regressions

**Out of Scope (`out_of_scope`)**

- Escalate to user via AskUserQuestion
- Task requires work beyond agent's assigned responsibilities

**Unknown Blockers (`unknown`)**

- Escalate to user via AskUserQuestion
- Blocker doesn't fit other categories or agent is uncertain

---

## Decision Logic for Agents

### 1. Determine Execution Context

**Am I orchestrated?**

- Check if OUTPUT_DIRECTORY was provided in task prompt
- Check if orchestrator skill name was mentioned (e.g., "orchestrating-feature-development")
- If YES → Orchestrated context
- If NO → Direct CLI context

### 2. Determine Your Domain

Extract domain from your agent name:

| Agent Name Pattern | Domain                                    |
| ------------------ | ----------------------------------------- |
| `frontend-*`       | Frontend                                  |
| `backend-*`        | Backend                                   |
| `capability-*`     | Capability                                |
| `tool-*`           | Tool                                      |
| `integration-*`    | Backend (integrations are backend domain) |
| `python-*`         | Backend                                   |

**Examples:**

- `frontend-developer` → Frontend domain
- `backend-reviewer` → Backend domain
- `capability-tester` → Capability domain
- `tool-lead` → Tool domain

### 3. Apply Routing Logic

**If Orchestrated Context:**

```json
{
  "status": "blocked",
  "blocked_reason": "security_concern",
  "handoff": {
    "next_agent": null,
    "context": "Description of blocker..."
  }
}
```

**If Direct CLI Context:**

```json
{
  "status": "blocked",
  "blocked_reason": "security_concern",
  "handoff": {
    "next_agent": "frontend-security",
    "context": "Description of blocker..."
  }
}
```

Use the Blocked Routing Table above to determine `next_agent` value based on your domain and `blocked_reason`.

---

## Examples

### Example 1: Frontend Developer - Security Concern (Orchestrated)

**Scenario**: `frontend-developer` identifies XSS vulnerability during implementation. Spawned by `orchestrating-feature-development` orchestrator.

**Metadata Output**:

```json
{
  "agent": "frontend-developer",
  "output_type": "implementation-blocked",
  "timestamp": "2026-01-18T15:42:00Z",
  "feature_directory": ".claude/.output/features/2026-01-18-user-input-form",
  "skills_invoked": ["gateway-frontend", "developing-with-tdd"],
  "library_skills_read": [],
  "source_files_verified": ["modules/chariot/ui/src/components/UserInput.tsx:87"],
  "status": "blocked",
  "blocked_reason": "security_concern",
  "attempted": [
    "Searched for existing XSS sanitization utilities",
    "Checked DOMPurify usage patterns in codebase",
    "Reviewed OWASP XSS prevention cheatsheet"
  ],
  "handoff": {
    "next_agent": null,
    "context": "User input component lacks sanitization. Found potential XSS vector at line 87. Needs security review before proceeding."
  }
}
```

**Orchestrator Action**:

1. Reads `blocked_reason: "security_concern"` and agent domain (frontend)
2. Looks up routing table: `security_concern` + Frontend → `frontend-security`
3. Spawns `frontend-security` agent with context from handoff

---

### Example 2: Backend Developer - Architecture Decision (Direct CLI)

**Scenario**: `backend-developer` needs to choose between gRPC and REST for new service. Invoked directly from CLI (no orchestrator).

**Metadata Output**:

```json
{
  "agent": "backend-developer",
  "output_type": "implementation-blocked",
  "timestamp": "2026-01-18T16:10:00Z",
  "feature_directory": ".claude/.output/agents/2026-01-18-161000-api-service",
  "skills_invoked": ["gateway-backend", "developing-with-tdd"],
  "library_skills_read": [".claude/skill-library/backend/go/designing-go-apis/SKILL.md"],
  "source_files_verified": ["modules/chariot/backend/pkg/service/api.go:1-50"],
  "status": "blocked",
  "blocked_reason": "architecture_decision",
  "attempted": [
    "Reviewed existing API patterns in codebase",
    "Checked for gRPC and REST usage in modules/chariot/backend",
    "Found both patterns used in different services"
  ],
  "handoff": {
    "next_agent": "backend-lead",
    "context": "Service needs inter-service communication. Both gRPC (asset-discovery service) and REST (risk service) exist in codebase. Architectural guidance needed on which pattern to follow."
  }
}
```

**Direct CLI Action**:

1. Agent determines: No orchestrator present (direct CLI)
2. Agent determines domain: `backend-developer` → Backend
3. Agent looks up routing: `architecture_decision` + Backend → `backend-lead`
4. Agent sets `next_agent: "backend-lead"`
5. User sees metadata, manually spawns `backend-lead` or uses helper script

---

### Example 3: Capability Developer - Missing Requirements (Orchestrated)

**Scenario**: `capability-developer` can't implement VQL capability due to unclear business logic. Spawned by `orchestrating-capability-development` orchestrator.

**Metadata Output**:

```json
{
  "agent": "capability-developer",
  "output_type": "implementation-blocked",
  "timestamp": "2026-01-18T16:30:00Z",
  "feature_directory": ".claude/.output/capabilities/2026-01-18-s3-exposure-detection",
  "skills_invoked": ["gateway-capabilities", "developing-with-tdd"],
  "library_skills_read": [".claude/skill-library/security/vql/writing-vql-capabilities/SKILL.md"],
  "source_files_verified": [],
  "status": "blocked",
  "blocked_reason": "missing_requirements",
  "attempted": [
    "Reviewed existing S3 scanning VQL capabilities",
    "Searched for ACL policy definitions in documentation",
    "Found conflicting requirements in different tickets"
  ],
  "handoff": {
    "next_agent": null,
    "context": "VQL capability requires determining 'exposed' S3 bucket criteria. Found three different definitions: (1) public-read ACL, (2) any anonymous access policy, (3) unauthenticated GetObject. Need clarification on which to implement."
  }
}
```

**Orchestrator Action**:

1. Reads `blocked_reason: "missing_requirements"`
2. Looks up routing table: `missing_requirements` → user (any domain)
3. Orchestrator uses AskUserQuestion to present three options to user
4. After user answers, orchestrator re-spawns `capability-developer` with clarification

---

### Example 4: Tool Developer - Test Failures (Direct CLI)

**Scenario**: `tool-developer` implementation causes unit tests to fail. Invoked directly from CLI.

**Metadata Output**:

```json
{
  "agent": "tool-developer",
  "output_type": "implementation-blocked",
  "timestamp": "2026-01-18T17:00:00Z",
  "feature_directory": ".claude/.output/tools/2026-01-18-170000-linear-wrapper",
  "skills_invoked": ["gateway-mcp-tools", "developing-with-tdd"],
  "library_skills_read": [
    ".claude/skill-library/claude/mcp-management/creating-tool-wrappers/SKILL.md"
  ],
  "source_files_verified": [".claude/tools/linear/src/wrapper.ts:120-180"],
  "status": "blocked",
  "blocked_reason": "test_failures",
  "attempted": [
    "Ran unit tests: 3 failures in schema validation",
    "Reviewed test output logs",
    "Identified issue: Zod schema expects ISODate string, returning Date object"
  ],
  "handoff": {
    "next_agent": "tool-tester",
    "context": "Unit tests failing due to schema mismatch. Tests expect ISODate strings but wrapper returns Date objects. Test failures at .claude/tools/linear/src/__tests__/wrapper.test.ts:45, :67, :89."
  }
}
```

**Direct CLI Action**:

1. Agent determines: No orchestrator present (direct CLI)
2. Agent determines domain: `tool-developer` → Tool
3. Agent looks up routing: `test_failures` + Tool → `tool-tester`
4. Agent sets `next_agent: "tool-tester"`
5. User sees metadata, manually spawns `tool-tester` with context

---

## Validation Rules

**When writing metadata with blocked status:**

1. **blocked_reason must be valid enum value**:
   - `security_concern`
   - `architecture_decision`
   - `missing_requirements`
   - `test_failures`
   - `out_of_scope`
   - `unknown`

2. **attempted array must have ≥1 entry**: Document what you tried before returning blocked

3. **handoff.context must describe blocker**: Specific, actionable description for next agent/user

4. **handoff.next_agent logic**:
   - Orchestrated: `null` (orchestrator determines routing)
   - Direct CLI: Use routing table (agent determines routing)

5. **Domain inference**: Agent must correctly identify its domain from its name prefix

---

## Related Skills

- **persisting-agent-outputs** (CORE) - Parent skill defining metadata format
- **orchestrating-multi-agent-workflows** (CORE) - Orchestrator that uses this routing table
- **orchestrating-feature-development** (CORE) - Example orchestrator using blocked routing
- **orchestrating-capability-development** (LIBRARY) `Read(".claude/skill-library/development/capabilities/orchestrating-capability-development/SKILL.md")` - Example orchestrator using blocked routing
- **orchestrating-integration-development** (LIBRARY) `Read(".claude/skill-library/development/integrations/orchestrating-integration-development/SKILL.md")` - Example orchestrator using blocked routing
