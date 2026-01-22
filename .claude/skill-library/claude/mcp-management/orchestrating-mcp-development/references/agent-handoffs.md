# Agent Handoffs

Structured JSON format for passing context between phases and agents during MCP wrapper development.

## Purpose

Enable clean coordination between phases by:

- Standardizing agent output format
- Providing context for next phase
- Tracking completion status
- Handling blocked states with recovery routing

## Standard Handoff Format

All Task agents **MUST** follow the `persisting-agent-outputs` skill for output format.

The metadata JSON block at the end of each agent output file serves as the handoff:

```json
{
  "agent": "tool-developer",
  "output_type": "implementation",
  "timestamp": "2025-01-11T10:30:00Z",
  "feature_directory": ".claude/.output/mcp-wrappers/...",
  "skills_invoked": ["gateway-typescript", "developing-with-tdd"],
  "library_skills_read": ["implementing-result-either-pattern", "validating-with-zod-schemas"],
  "source_files_verified": [".claude/tools/linear/get-issue.ts:1-50"],
  "status": "complete|blocked|needs_review",
  "blocked_reason": "security_concern|architecture_decision|missing_requirements|test_failures|out_of_scope|schema_discovery_failed|unknown",
  "attempted": ["What agent tried before blocking"],
  "handoff": {
    "next_agent": null,
    "context": "Key information for next phase"
  }
}
```

**Key rules:**

- When `status` is `blocked`: include `blocked_reason` and `attempted`
- When `status` is `blocked`: set `handoff.next_agent` to `null` (orchestrator decides routing via `orchestrating-multi-agent-workflows` skill)
- When `status` is `complete`: `handoff.next_agent` can suggest next phase agent

See `persisting-agent-outputs` skill for complete field definitions.

## Field Descriptions

See `persisting-agent-outputs/references/metadata-format.md` for complete field definitions.

### status

| Value          | When to Use                                                |
| -------------- | ---------------------------------------------------------- |
| `complete`     | All work finished successfully, ready for next phase       |
| `blocked`      | Cannot proceed - include `blocked_reason` and `attempted`  |
| `needs_review` | Work complete but requires user approval before next phase |

### blocked_reason (required when status=blocked)

| Value                     | When to Use                                |
| ------------------------- | ------------------------------------------ |
| `security_concern`        | Security issue needs security agent review |
| `architecture_decision`   | Design decision needs lead agent input     |
| `missing_requirements`    | Cannot proceed without more information    |
| `test_failures`           | Tests failing, needs debugging             |
| `out_of_scope`            | Task exceeds agent's domain                |
| `schema_discovery_failed` | Unable to discover tool schema from MCP    |
| `unknown`                 | Blocker doesn't fit other categories       |

The orchestrator uses `orchestrating-multi-agent-workflows` skill's agent routing table to determine next steps based on `blocked_reason`.

### phase

Current phase being completed:

- `schema_discovery` - From schema discovery agents
- `architecture` - From tool-lead agents
- `testing` - From tool-tester agents
- `implementation` - From tool-developer agents
- `review` - From tool-reviewer agents

### summary

Concise 1-2 sentence description of work completed:

```json
// Good examples
"summary": "Discovered schema for get-issue tool: 5 required inputs, 850-token response, 97% filterable"
"summary": "Designed shared architecture using Result pattern with 95% token reduction via progressive loading"
"summary": "Implemented get-issue wrapper with Zod validation, achieved 89% test coverage"

// Bad examples (too vague)
"summary": "Completed schema discovery"
"summary": "Wrote some architecture"
"summary": "Added wrapper"
```

### files_modified

Array of **relative** file paths from repo root:

```json
"files_modified": [
  ".claude/tools/linear/get-issue.ts",
  ".claude/tools/linear/get-issue.unit.test.ts",
  ".claude/.output/mcp-wrappers/2025-01-11-123000-linear/tools/get-issue/architecture.md"
]
```

### artifacts

Non-code files created (documentation, diagrams, etc.):

```json
"artifacts": [
  ".claude/.output/mcp-wrappers/2025-01-11-123000-linear/tools/get-issue/schema-discovery.md",
  ".claude/.output/mcp-wrappers/2025-01-11-123000-linear/architecture-shared.md",
  ".claude/.output/mcp-wrappers/2025-01-11-123000-linear/security-assessment.md"
]
```

### verification

Evidence that work is correct:

```json
"verification": {
  "tests_passed": true,
  "build_success": true,
  "lint_passed": true,
  "coverage_percent": 89,
  "command_output": "Test Suites: 1 passed, 1 total\nTests: 18 passed, 18 total\nCoverage: 89.5%"
}
```

For schema discovery phase:

```json
"verification": {
  "tool_called": true,
  "input_schema_documented": true,
  "output_schema_documented": true,
  "token_count_measured": true
}
```

For architecture phase:

```json
"verification": {
  "patterns_referenced": true,
  "decisions_documented": true,
  "shared_utilities_identified": true,
  "token_strategy_defined": true
}
```

### handoff.next_phase

Next phase in the sequence:

- `architecture` - After schema discovery
- `implementation` - After architecture + testing setup
- `testing` - After implementation (if tests don't exist)
- `review` - After implementation
- `complete` - After review (wrapper done)

### handoff.next_agent

Suggested next agent (orchestrator decides final routing):

```json
// When complete - can suggest next phase agent
"next_agent": "tool-developer"

// When blocked - orchestrator decides using routing table
"next_agent": null
```

**Key principle**: When `status` is `blocked`, set to `null` and include `blocked_reason`. The orchestrator uses `orchestrating-multi-agent-workflows` skill's routing table to determine the appropriate next agent based on the blocker type.

### handoff.context

**Most important field**: Key information for the next agent.

```json
// Schema Discovery → Architecture
"context": "Tool: get-issue. Input: issueId (required string). Output: 850 tokens raw, 40 tokens filtered (95% reduction). Fields to keep: id, title, state, assignee. Security: validate issueId format."

// Architecture (Shared) → Architecture (Per-Tool)
"context": "Shared patterns established: Result<T,E> for errors, Zod refinements for sanitization, progressive loading via FilteredResult interface. Target 80-99% token reduction. Use response-utils for truncation."

// Architecture → Implementation
"context": "Use Result pattern from architecture-shared.md. InputSchema: issueId (string, alphanumeric only). FilteredResult: {id, title, state, assignee}. Token reduction: 850→40 (95%). Security: sanitize.validateAlphanumeric() in Zod refinement."

// Implementation → Review
"context": "Implemented get-issue.ts with Result pattern, Zod validation per architecture. Tests pass locally (18/18). Token reduction verified: 97% (architecture target was 95%). Ready for final review."

// Review → Complete
"context": "Code review APPROVED. All patterns followed. Token optimization exceeds target. Security validation implemented. Tests passing with 89% coverage. No issues found."
```

### handoff.blockers

Only populated when `status: "blocked"`:

```json
"handoff": {
  "blockers": [
    {
      "type": "schema_unavailable",
      "description": "MCP server not responding to list_tools call - connection timeout after 30s",
      "resolution": "Need to verify MCP server is running and credentials are valid"
    },
    {
      "type": "unclear_requirement",
      "description": "Uncertain if tool should return full issue history or just current state",
      "resolution": "Need user to clarify scope for issue retrieval"
    }
  ]
}
```

### attempted (required when status=blocked)

Array of actions the agent tried before blocking:

```json
"attempted": [
  "Called MCP server with list_tools - connection timeout",
  "Checked mcp-client.ts configuration - server entry exists",
  "Verified credentials in environment - GITHUB_TOKEN present",
  "Tried manual connection via npx @modelcontextprotocol/inspector - same timeout"
]
```

This helps the orchestrator understand what debugging steps have already been taken.

## Related References

- [Handoff Examples](agent-handoffs-examples.md) - Complete example handoffs for all phases and blocked scenarios
- [Handling & Validation](agent-handoffs-routing.md) - Routing logic and validation patterns
- [Critical Rules](critical-rules.md) - Blocked agent routing table
- [Schema Discovery](schema-discovery.md) - Phase 3 methodology
- [Agent Prompts](agent-prompts.md) - Brief reference prompts
- [Full Prompt Templates](prompts/) - Comprehensive agent prompt templates
- [Troubleshooting](troubleshooting.md) - Handling blocked handoffs
