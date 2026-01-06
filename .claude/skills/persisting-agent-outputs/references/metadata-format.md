# JSON Metadata Format

**Complete field definitions for the JSON metadata block at the end of each agent output file.**

## Structure

Every agent output file ends with:

````markdown
... agent's content here ...

---

## Metadata

```json
{
  "agent": "frontend-lead",
  "output_type": "architecture-review",
  "timestamp": "2025-12-30T14:30:22Z",
  "feature_directory": ".claude/.output/agents/2025-12-30-143022-tanstack-migration",
  "skills_invoked": ["enforcing-evidence-based-analysis", "gateway-frontend"],
  "library_skills_read": [".claude/skill-library/path/to/skill.md"],
  "source_files_verified": ["src/state/auth.tsx:490-590"],
  "status": "complete",
  "handoff": {
    "next_agent": "frontend-developer",
    "context": "Implement according to plan"
  }
}
```
````

## Field Definitions

| Field                   | Type          | Required     | Description                                                                                                               |
| ----------------------- | ------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `agent`                 | string        | Yes          | Agent name from agent definition                                                                                          |
| `output_type`           | string        | Yes          | Descriptive type (architecture-review, implementation, test-plan)                                                         |
| `timestamp`             | ISO 8601      | Yes          | When agent completed work                                                                                                 |
| `feature_directory`     | string        | Yes          | Absolute path to feature directory                                                                                        |
| `skills_invoked`        | array[string] | Yes          | Core skills invoked via Skill tool                                                                                        |
| `library_skills_read`   | array[string] | Yes          | Library skills loaded via Read tool                                                                                       |
| `source_files_verified` | array[string] | Yes          | Files/functions read for evidence                                                                                         |
| `status`                | enum          | Yes          | `complete`, `in-progress`, `blocked`, `needs-review`                                                                      |
| `blocked_reason`        | enum          | When blocked | Category: `security_concern`, `architecture_decision`, `missing_requirements`, `test_failures`, `out_of_scope`, `unknown` |
| `attempted`             | array[string] | When blocked | What agent tried before returning blocked                                                                                 |
| `handoff`               | object        | Optional     | Next agent and context                                                                                                    |

### handoff Object

```json
{
  "next_agent": "frontend-developer",
  "context": "Implement according to plan in sections 1-3"
}
```

| Field        | Type   | Required | Description                        |
| ------------ | ------ | -------- | ---------------------------------- |
| `next_agent` | string | Optional | Recommended agent to continue work |
| `context`    | string | Optional | Brief instructions for next agent  |

## Examples by Agent Type

### Architecture Agent

```json
{
  "agent": "frontend-lead",
  "output_type": "architecture-review",
  "timestamp": "2025-12-30T14:30:22Z",
  "feature_directory": ".claude/.output/agents/2025-12-30-143022-tanstack-migration",
  "skills_invoked": [
    "enforcing-evidence-based-analysis",
    "gateway-frontend",
    "brainstorming",
    "writing-plans",
    "verifying-before-completion"
  ],
  "library_skills_read": [
    ".claude/skill-library/development/frontend/using-tanstack-router/SKILL.md",
    ".claude/skill-library/architecture/frontend/architecting-state-management/SKILL.md"
  ],
  "source_files_verified": [
    "modules/chariot/ui/src/state/auth.tsx:490-590",
    "modules/chariot/ui/package.json:1-100"
  ],
  "status": "complete",
  "handoff": {
    "next_agent": "frontend-developer",
    "context": "Implement Phase 0 (impersonation context) first before router migration"
  }
}
```

### Implementation Agent

```json
{
  "agent": "frontend-developer",
  "output_type": "implementation",
  "timestamp": "2025-12-30T15:45:00Z",
  "feature_directory": ".claude/.output/agents/2025-12-30-143022-tanstack-migration",
  "skills_invoked": ["gateway-frontend", "developing-with-tdd", "verifying-before-completion"],
  "library_skills_read": [
    ".claude/skill-library/development/frontend/using-react-19-context/SKILL.md"
  ],
  "source_files_verified": [
    "modules/chariot/ui/src/state/auth.tsx",
    "modules/chariot/ui/src/state/impersonation.tsx"
  ],
  "status": "complete",
  "handoff": {
    "next_agent": "frontend-reviewer",
    "context": "Review implementation against architecture plan"
  }
}
```

### Testing Agent

```json
{
  "agent": "frontend-tester",
  "output_type": "test-plan",
  "timestamp": "2025-12-30T16:15:00Z",
  "feature_directory": ".claude/.output/agents/2025-12-30-143022-tanstack-migration",
  "skills_invoked": ["gateway-testing", "verifying-before-completion"],
  "library_skills_read": [
    ".claude/skill-library/testing/frontend/frontend-e2e-testing-patterns/SKILL.md"
  ],
  "source_files_verified": ["modules/chariot/ui/e2e/fixtures/authenticated.fixture.ts"],
  "status": "complete",
  "handoff": {
    "next_agent": "frontend-developer",
    "context": "Run E2E tests to verify impersonation flows"
  }
}
```

### Review Agent

```json
{
  "agent": "frontend-reviewer",
  "output_type": "code-review",
  "timestamp": "2025-12-30T17:00:00Z",
  "feature_directory": ".claude/.output/agents/2025-12-30-143022-tanstack-migration",
  "skills_invoked": ["gateway-frontend", "adhering-to-dry", "adhering-to-yagni"],
  "library_skills_read": [
    ".claude/skill-library/development/frontend/enforcing-react-19-conventions/SKILL.md"
  ],
  "source_files_verified": ["modules/chariot/ui/src/state/impersonation.tsx:1-350"],
  "status": "complete",
  "handoff": null
}
```

### Blocked Agent

```json
{
  "agent": "frontend-developer",
  "output_type": "implementation-blocked",
  "timestamp": "2025-12-30T15:45:00Z",
  "feature_directory": ".claude/.output/agents/2025-12-30-143022-tanstack-migration",
  "skills_invoked": ["gateway-frontend", "developing-with-tdd"],
  "library_skills_read": [],
  "source_files_verified": ["modules/chariot/ui/src/components/UserInput.tsx:45-120"],
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

Note: When blocked, `handoff.next_agent` should be `null` - the orchestrator determines routing using the `orchestrating-multi-agent-workflows` skill's agent routing table based on `blocked_reason`.

## Validation

**Required fields:**

- All fields except `handoff` are required
- `skills_invoked` must have at least 1 entry
- `library_skills_read` can be empty array if no library skills were needed
- `source_files_verified` must have at least 1 entry (enforcing-evidence-based-analysis requirement)

**Conditional fields:**

- When `status` is `blocked`:
  - `blocked_reason` is required
  - `attempted` is required (must have at least 1 entry)
  - `handoff.next_agent` should be `null` (orchestrator decides routing)

**Invalid examples:**

```json
// ❌ Missing required fields
{
  "agent": "frontend-lead",
  "status": "complete"
}

// ❌ Empty skills_invoked
{
  "agent": "frontend-lead",
  "skills_invoked": [],
  ...
}

// ❌ No source files verified
{
  "agent": "frontend-lead",
  "source_files_verified": [],
  ...
}
```

## Related

- [MANIFEST Structure](manifest-structure.md) - Feature-level tracking
- [Discovery Protocol](discovery-protocol.md) - How to get feature_directory
- [Workflow Examples](workflow-examples.md) - Complete scenarios
