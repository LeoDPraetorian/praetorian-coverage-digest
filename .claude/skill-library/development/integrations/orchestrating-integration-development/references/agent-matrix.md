# Agent Matrix

**Agent selection guide for integration development orchestration workflows.**

## Agent Type Matrix (Integration Domain)

| Phase | Agent                 | Purpose                                                   | Mandatory Skills                                                                                                                                     |
| ----- | --------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3     | Explore               | Codebase discovery via discovering-codebases-for-planning | discovering-reusable-code, persisting-agent-outputs                                                                                                  |
| 7     | integration-lead      | Architecture + task decomposition                         | integrating-with-{vendor}, developing-integrations, gateway-integrations, gateway-backend, writing-plans, persisting-agent-outputs                   |
| 8     | integration-developer | Implementation (client + collector)                       | integrating-with-{vendor}, developing-integrations, developing-with-tdd, verifying-before-completion, gateway-integrations, persisting-agent-outputs |
| 9     | integration-reviewer  | Design verification (plan match)                          | integrating-with-{vendor}, developing-integrations, gateway-integrations, persisting-agent-outputs                                                   |
| 11.1  | integration-reviewer  | Code review (spec compliance)                             | integrating-with-{vendor}, developing-integrations, adhering-to-dry, gateway-integrations, gateway-backend, persisting-agent-outputs                 |
| 11.2  | backend-reviewer      | Code review (quality)                                     | integrating-with-{vendor}, developing-integrations, adhering-to-dry, gateway-backend, persisting-agent-outputs                                       |
| 11.2  | backend-security      | Security review (parallel w/ 11.2)                        | integrating-with-{vendor}, developing-integrations, adhering-to-dry, gateway-backend, persisting-agent-outputs                                       |
| 12    | test-lead             | Test strategy planning                                    | integrating-with-{vendor}, testing-integrations, gateway-integrations, persisting-agent-outputs                                                      |
| 13    | backend-tester        | Test implementation + execution                           | integrating-with-{vendor}, developing-with-tdd, testing-integrations, gateway-integrations, persisting-agent-outputs                                 |
| 14    | test-lead             | Coverage verification                                     | persisting-agent-outputs                                                                                                                             |
| 16.1  | frontend-developer    | Frontend integration (conditional)                        | gateway-frontend, persisting-agent-outputs                                                                                                           |

## Selection Rules

### Rule 1: Integration Tasks Use Integration-Specific Agents

**Discovery phase** → Spawn Explore agent via `discovering-codebases-for-planning`

**Architecture phase** → Spawn `integration-lead` (not generic backend-lead)

**Implementation phase** → Spawn `integration-developer` (not generic backend-developer)

**Review phases** → Spawn `integration-reviewer` for spec compliance, then `backend-reviewer` + `backend-security` for quality

### Rule 2: Always Include Vendor-Specific Skill

Every agent prompt MUST include `integrating-with-{vendor}` skill:

```typescript
// WRONG: Missing vendor skill
Task("integration-developer", "Implement Shodan client...");

// RIGHT: Includes vendor skill
Task(
  "integration-developer",
  `
MANDATORY SKILLS:
- integrating-with-shodan
- developing-integrations
- developing-with-tdd

Implement Shodan client...
`
);
```

### Rule 3: P0 Compliance is Non-Negotiable

ALL integration agents receive reminders about P0 requirements in their prompts. Phase 10 validates compliance before proceeding.

### Rule 4: Security Review is Mandatory

Phase 11.2 spawns `backend-security` in parallel with `backend-reviewer`. Integration code handles:

- External API credentials
- User data from third-party systems
- Network requests to external services

Security review is NEVER optional for integrations.

## Agent Responsibilities

### Discovery Agent

- **Explore** (via discovering-codebases-for-planning): Discover existing integration patterns
- Output: Integration patterns, client structures, collector patterns, file locations

### Architecture Agents

- **integration-lead**: Integration architecture, client design, collector strategy, task decomposition
- Output: Architecture plan with exact file paths, method signatures, P0 compliance approach

### Developer Agents

- **integration-developer**: Client implementation, collector implementation, integration glue
- Output: Code files, P0-compliant patterns, working integration

### Reviewer Agents

- **integration-reviewer**: Spec compliance, design verification (plan-to-implementation match)
- **backend-reviewer**: Code quality, Go patterns, maintainability
- **backend-security**: Security vulnerabilities, credential handling, API security
- Output: Approval/rejection, improvement recommendations

### Tester Agents

- **test-lead**: Test strategy, coverage planning, mock server approach
- **backend-tester**: Test implementation, mock servers, test execution
- Output: Test files, coverage reports, test results

### Conditional Agents

- **frontend-developer**: Only spawned if integration requires frontend UI (webhook config, connection status display)
- Output: React components, UI integration

## Sequential vs Parallel Execution

### Always Sequential

1. Discovery → Architecture (need patterns before design)
2. Architecture → Implementation (need plan before coding)
3. Implementation → Design Verification (need code to verify)
4. Design Verification → Domain Compliance (need spec match before P0 check)
5. Domain Compliance → Code Quality (need P0 pass before quality review)
6. Code Quality → Testing (need approved code before testing)

### Always Parallel (when both apply)

- backend-reviewer ↔ backend-security (Phase 11.2 - independent reviewers)
- Unit tests ↔ Integration tests (if independent)

## Anti-Patterns

### ❌ Wrong: Generic Backend Agent for Integration Work

```typescript
Task("backend-developer", "Build Shodan integration");
// Missing: integration-specific knowledge, P0 compliance awareness
```

### ❌ Wrong: Skipping Vendor Skill

```typescript
Task("integration-developer", "Implement Qualys client...");
// Missing: integrating-with-qualys skill with rate limits, auth quirks, pagination
```

### ❌ Wrong: Skipping Security Review

```typescript
// Phase 11.2: Only spawning quality reviewer
Task("backend-reviewer", "Review code...");
// Missing: backend-security for credential and API security review
```

### ❌ Wrong: CheckAffiliation Stub

```typescript
// Agent returns with:
func (s *shodanIntegration) CheckAffiliation(ctx context.Context, org string) bool {
    return true // TODO: implement real check
}
// P0 VIOLATION: Must implement real API query
```

### ✅ Right: Full Integration Pipeline

```typescript
// Phase 3: Discovery
Task("Explore", "via discovering-codebases-for-planning...");

// Phase 7: Architecture
Task(
  "integration-lead",
  `
MANDATORY SKILLS:
- integrating-with-shodan
- developing-integrations
- gateway-integrations
- writing-plans
...
`
);

// Phase 8: Implementation
Task(
  "integration-developer",
  `
MANDATORY SKILLS:
- integrating-with-shodan
- developing-with-tdd
- developing-integrations
...
`
);

// Phase 11.2: Parallel review
Task("backend-reviewer", "...");
Task("backend-security", "...");
```

## Effort Scaling

| Work Type | Phase Count | Key Agents                                                           |
| --------- | ----------- | -------------------------------------------------------------------- |
| SMALL     | 12 phases   | Explore, integration-developer, integration-reviewer, backend-tester |
| MEDIUM    | 15 phases   | + integration-lead, test-lead, backend-reviewer                      |
| LARGE     | 16 phases   | + brainstorming, full parallel review pipeline, frontend-developer   |

See [effort-scaling.md](effort-scaling.md) for detailed tier definitions.
