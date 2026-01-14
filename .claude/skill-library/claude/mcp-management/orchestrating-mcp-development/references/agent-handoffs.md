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

| Value                      | When to Use                                            |
| -------------------------- | ------------------------------------------------------ |
| `security_concern`         | Security issue needs security agent review             |
| `architecture_decision`    | Design decision needs lead agent input                 |
| `missing_requirements`     | Cannot proceed without more information                |
| `test_failures`            | Tests failing, needs debugging                         |
| `out_of_scope`             | Task exceeds agent's domain                            |
| `schema_discovery_failed`  | Unable to discover tool schema from MCP                |
| `unknown`                  | Blocker doesn't fit other categories                   |

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

## Example Handoffs

### Schema Discovery → Architecture

```json
{
  "agent": "claude",
  "output_type": "schema-discovery",
  "timestamp": "2025-01-11T10:15:00Z",
  "feature_directory": ".claude/.output/mcp-wrappers/2025-01-11-123000-linear",
  "skills_invoked": [],
  "library_skills_read": [],
  "source_files_verified": [],
  "status": "complete",
  "phase": "schema_discovery",
  "summary": "Discovered schema for get-issue tool: 5 required inputs, 850-token response with 97% filterable content, identified 4 critical fields",
  "files_modified": [],
  "artifacts": [
    ".claude/.output/mcp-wrappers/2025-01-11-123000-linear/tools/get-issue/schema-discovery.md"
  ],
  "verification": {
    "tool_called": true,
    "input_schema_documented": true,
    "output_schema_documented": true,
    "token_count_measured": true,
    "sample_responses_captured": 3
  },
  "handoff": {
    "next_phase": "architecture",
    "next_agent": "tool-lead",
    "context": "Tool: get-issue. Input schema: issueId (required string, alphanumeric). Output: 850 tokens raw, 40 tokens after filtering (95% reduction). Critical fields: id, title, state, assignee.name. Optional fields: description (large), comments (array), history (large). Security concerns: validate issueId format to prevent injection.",
    "blockers": []
  }
}
```

### Architecture (Shared) → Architecture (Per-Tool)

```json
{
  "agent": "tool-lead",
  "output_type": "shared-architecture",
  "timestamp": "2025-01-11T10:45:00Z",
  "feature_directory": ".claude/.output/mcp-wrappers/2025-01-11-123000-linear",
  "skills_invoked": ["gateway-typescript"],
  "library_skills_read": [
    "implementing-result-either-pattern",
    "validating-with-zod-schemas",
    "designing-progressive-loading-wrappers",
    "optimizing-llm-api-responses",
    "sanitizing-inputs-securely"
  ],
  "source_files_verified": [
    ".claude/tools/config/lib/response-utils.ts:1-80",
    ".claude/tools/config/lib/sanitize.ts:1-120"
  ],
  "status": "complete",
  "phase": "architecture",
  "summary": "Designed shared architecture for all 15 Linear tools using Result pattern, Zod refinements, and progressive loading with target 80-99% token reduction",
  "files_modified": [],
  "artifacts": [
    ".claude/.output/mcp-wrappers/2025-01-11-123000-linear/architecture-shared.md",
    ".claude/.output/mcp-wrappers/2025-01-11-123000-linear/security-assessment.md"
  ],
  "verification": {
    "patterns_referenced": true,
    "decisions_documented": true,
    "shared_utilities_identified": true,
    "token_strategy_defined": true,
    "security_patterns_defined": true
  },
  "handoff": {
    "next_phase": "architecture",
    "next_agent": "tool-lead",
    "context": "Shared patterns for all 15 Linear tools: (1) Error handling via Result<T,E> pattern from implementing-result-either-pattern skill. (2) Input validation via Zod with refinements using sanitize.ts validators. (3) Token optimization via FilteredResult interface with progressive loading - target 80-99% reduction. (4) Response processing via response-utils.truncateField() and filterFields(). (5) Security via sanitize.validateAlphanumeric(), validateUrl(), escapeHtml(). Each tool now needs tool-specific InputSchema, FilteredResult, and field selection strategy.",
    "blockers": []
  }
}
```

### Architecture → Implementation (Per-Tool)

```json
{
  "agent": "tool-lead",
  "output_type": "tool-architecture",
  "timestamp": "2025-01-11T11:30:00Z",
  "feature_directory": ".claude/.output/mcp-wrappers/2025-01-11-123000-linear",
  "skills_invoked": ["gateway-typescript"],
  "library_skills_read": ["implementing-result-either-pattern", "validating-with-zod-schemas"],
  "source_files_verified": [
    ".claude/.output/mcp-wrappers/2025-01-11-123000-linear/architecture-shared.md:1-200",
    ".claude/.output/mcp-wrappers/2025-01-11-123000-linear/tools/get-issue/schema-discovery.md:1-150"
  ],
  "status": "complete",
  "phase": "architecture",
  "summary": "Designed tool-specific architecture for get-issue wrapper: Zod schema with alphanumeric validation, 95% token reduction via 4-field filtering",
  "files_modified": [],
  "artifacts": [
    ".claude/.output/mcp-wrappers/2025-01-11-123000-linear/tools/get-issue/architecture.md"
  ],
  "verification": {
    "patterns_referenced": true,
    "shared_patterns_applied": true,
    "tool_specific_decisions": true,
    "token_target_calculated": true
  },
  "handoff": {
    "next_phase": "implementation",
    "next_agent": "tool-developer",
    "context": "Tool: get-issue. Follow shared patterns from architecture-shared.md. InputSchema: issueId field (z.string().refine(sanitize.validateAlphanumeric)). FilteredResult interface: {id: string, title: string, state: string, assignee: string}. Token target: 850→40 (95% reduction). Error handling: Result<FilteredResult, Error>. MCP call: callMCPTool('linear', 'get-issue', {issueId}). Use response-utils.filterFields(['id','title','state','assignee.name']).",
    "blockers": []
  }
}
```

### Implementation → Review (Per-Tool)

```json
{
  "agent": "tool-developer",
  "output_type": "implementation",
  "timestamp": "2025-01-11T12:15:00Z",
  "feature_directory": ".claude/.output/mcp-wrappers/2025-01-11-123000-linear",
  "skills_invoked": ["gateway-typescript", "developing-with-tdd"],
  "library_skills_read": [
    "implementing-result-either-pattern",
    "validating-with-zod-schemas",
    "sanitizing-inputs-securely"
  ],
  "source_files_verified": [
    ".claude/.output/mcp-wrappers/2025-01-11-123000-linear/tools/get-issue/architecture.md:1-180",
    ".claude/tools/config/lib/response-utils.ts:45-80",
    ".claude/tools/config/lib/sanitize.ts:12-35",
    ".claude/tools/config/lib/mcp-client.ts:1-50"
  ],
  "status": "complete",
  "phase": "implementation",
  "summary": "Implemented get-issue wrapper with Zod validation, Result pattern, and 97% token reduction, all tests passing (18/18)",
  "files_modified": [
    ".claude/tools/linear/get-issue.ts"
  ],
  "artifacts": [],
  "verification": {
    "tests_passed": true,
    "build_success": true,
    "lint_passed": true,
    "coverage_percent": 89,
    "command_output": "Test Suites: 1 passed, 1 total\nTests: 18 passed, 18 total\nCoverage: 89.47%"
  },
  "handoff": {
    "next_phase": "review",
    "next_agent": "tool-reviewer",
    "context": "Implemented get-issue.ts following architecture exactly. InputSchema uses sanitize.validateAlphanumeric() for issueId. Result<FilteredResult, Error> pattern implemented. Token reduction: 850→25 tokens (97% - exceeds 95% target). FilteredResult interface exports {id, title, state, assignee}. Used response-utils.filterFields() not manual field selection. Tests: 18 passed (6 categories covered). TSDoc documentation added. No barrel file imports. Ready for code review.",
    "blockers": []
  }
}
```

### Review → Complete (Per-Tool)

```json
{
  "agent": "tool-reviewer",
  "output_type": "code-review",
  "timestamp": "2025-01-11T13:00:00Z",
  "feature_directory": ".claude/.output/mcp-wrappers/2025-01-11-123000-linear",
  "skills_invoked": ["gateway-typescript"],
  "library_skills_read": [
    "avoiding-barrel-files",
    "documenting-with-tsdoc"
  ],
  "source_files_verified": [
    ".claude/tools/linear/get-issue.ts:1-120",
    ".claude/tools/linear/get-issue.unit.test.ts:1-350",
    ".claude/.output/mcp-wrappers/2025-01-11-123000-linear/tools/get-issue/architecture.md:1-180"
  ],
  "status": "complete",
  "phase": "review",
  "summary": "Code review APPROVED for get-issue wrapper: all patterns followed, token optimization exceeds target, security validation implemented correctly",
  "files_modified": [],
  "artifacts": [
    ".claude/.output/mcp-wrappers/2025-01-11-123000-linear/tools/get-issue/review.md"
  ],
  "verification": {
    "architecture_adherence": true,
    "typescript_patterns": true,
    "documentation_present": true,
    "security_implemented": true,
    "tests_verified": true,
    "build_verified": true
  },
  "handoff": {
    "next_phase": "complete",
    "next_agent": null,
    "context": "get-issue wrapper fully complete and approved. Architecture patterns followed exactly. Token reduction 97% (target was 95%). Security validation via Zod refinements implemented correctly. All 18 tests passing with 89% coverage. TSDoc present. No barrel files. No issues found. Ready for production use.",
    "blockers": []
  }
}
```

### Blocked Handoff (Schema Discovery Failed)

```json
{
  "agent": "claude",
  "output_type": "schema-discovery-blocked",
  "timestamp": "2025-01-11T10:20:00Z",
  "feature_directory": ".claude/.output/mcp-wrappers/2025-01-11-123000-linear",
  "skills_invoked": [],
  "library_skills_read": [],
  "source_files_verified": [
    ".claude/tools/config/lib/mcp-client.ts:15-45"
  ],
  "status": "blocked",
  "blocked_reason": "schema_discovery_failed",
  "attempted": [
    "Called MCP server with list_tools command - connection timeout after 30 seconds",
    "Checked mcp-client.ts configuration - 'linear' server entry exists",
    "Verified environment variables - GITHUB_TOKEN is present",
    "Attempted manual connection via npx @modelcontextprotocol/inspector - same timeout error",
    "Checked MCP server logs - no log file found at expected location"
  ],
  "phase": "schema_discovery",
  "summary": "Unable to discover schema for Linear MCP - server connection timeout across multiple attempts",
  "files_modified": [],
  "artifacts": [],
  "verification": {},
  "handoff": {
    "next_agent": null,
    "context": "MCP server 'linear' is configured in mcp-client.ts but not responding. Connection timeout after 30s on all tool discovery attempts. Credentials appear present (GITHUB_TOKEN found). Need to resolve server availability before schema discovery can proceed.",
    "blockers": [
      {
        "type": "mcp_connection_failure",
        "description": "Linear MCP server not responding - connection timeout on list_tools, get-issue, and inspector attempts",
        "resolution": "Verify MCP server is running, check credentials are valid, or use alternative discovery method (documentation, manual testing)"
      }
    ]
  }
}
```

### Blocked Handoff (Architecture Decision Needed)

```json
{
  "agent": "tool-lead",
  "output_type": "architecture-blocked",
  "timestamp": "2025-01-11T11:00:00Z",
  "feature_directory": ".claude/.output/mcp-wrappers/2025-01-11-123000-linear",
  "skills_invoked": ["gateway-typescript"],
  "library_skills_read": [
    "implementing-result-either-pattern",
    "optimizing-llm-api-responses"
  ],
  "source_files_verified": [
    ".claude/.output/mcp-wrappers/2025-01-11-123000-linear/tools/get-issue/schema-discovery.md:1-150",
    ".claude/.output/mcp-wrappers/2025-01-11-123000-linear/tools/list-issues/schema-discovery.md:1-200"
  ],
  "status": "blocked",
  "blocked_reason": "architecture_decision",
  "attempted": [
    "Analyzed schema discoveries for get-issue (850 tokens) and list-issues (12,000 tokens)",
    "Considered progressive loading with detail levels (summary vs full)",
    "Reviewed optimizing-llm-api-responses skill - recommends pagination or truncation",
    "Compared approaches: (1) paginated responses (2) truncated arrays (3) summary-only mode"
  ],
  "phase": "architecture",
  "summary": "Architecture blocked on decision: how to handle list-issues 12K token response - pagination vs truncation vs summary mode",
  "files_modified": [],
  "artifacts": [
    ".claude/.output/mcp-wrappers/2025-01-11-123000-linear/architecture-shared.md"
  ],
  "verification": {
    "patterns_referenced": true,
    "token_analysis_complete": true
  },
  "handoff": {
    "next_agent": null,
    "context": "Shared architecture 80% complete. Blocked on list-issues strategy: response is 12,000 tokens (array of 100 issues). Options: (1) Paginate via limit/offset params (20 issues = 2,400 tokens). (2) Truncate to first 20 issues with warning. (3) Summary mode returning only id+title. Need decision on approach before finalizing shared architecture.",
    "blockers": [
      {
        "type": "token_optimization_strategy",
        "description": "list-issues returns 12K tokens (100 issues x 120 tokens each). Need to decide pagination vs truncation vs summary approach.",
        "resolution": "Lead architect or user must decide: (1) Add pagination support to wrapper API, (2) Truncate and warn, or (3) Create two modes (summary/full)"
      }
    ]
  }
}
```

### Blocked Handoff (Test Failures)

```json
{
  "agent": "tool-developer",
  "output_type": "implementation-blocked",
  "timestamp": "2025-01-11T12:30:00Z",
  "feature_directory": ".claude/.output/mcp-wrappers/2025-01-11-123000-linear",
  "skills_invoked": ["gateway-typescript", "developing-with-tdd"],
  "library_skills_read": [
    "implementing-result-either-pattern",
    "validating-with-zod-schemas"
  ],
  "source_files_verified": [
    ".claude/tools/linear/get-issue.ts:1-95",
    ".claude/tools/linear/get-issue.unit.test.ts:45-80"
  ],
  "status": "blocked",
  "blocked_reason": "test_failures",
  "attempted": [
    "Implemented get-issue.ts following architecture exactly",
    "Ran tests - 3/18 tests failing on input validation",
    "Debugged failing tests - Zod refine() throwing unexpected error format",
    "Checked sanitize.ts implementation - validateAlphanumeric returns boolean not Error",
    "Attempted to match Result pattern from architecture - type mismatch between Zod error and Result.err()"
  ],
  "phase": "implementation",
  "summary": "Implementation blocked: 3 input validation tests failing due to Zod refine() error format mismatch with Result pattern",
  "files_modified": [
    ".claude/tools/linear/get-issue.ts"
  ],
  "artifacts": [],
  "verification": {
    "tests_passed": false,
    "build_success": true,
    "test_failures": 3,
    "command_output": "Test Suites: 1 failed, 1 total\nTests: 15 passed, 3 failed, 18 total\n\nFAILED TESTS:\n- should reject invalid issueId with special chars\n- should reject empty issueId\n- should return validation error in Result.err()"
  },
  "handoff": {
    "next_agent": null,
    "context": "Implementation 80% complete. Tests failing on Zod validation error handling. Architecture specifies Result<T,E> pattern, but Zod refine() errors don't match Result.err() signature. sanitize.validateAlphanumeric() returns boolean, unclear how to convert to Result error. Need debugging assistance or architecture clarification.",
    "blockers": [
      {
        "type": "validation_error_integration",
        "description": "Zod refine() error format incompatible with Result<T,E> pattern from architecture. 3 tests failing on validation error path.",
        "resolution": "Need tool-tester to debug test expectations or tool-lead to clarify error handling pattern for Zod integration"
      }
    ]
  }
}
```

## Handling Handoffs

### On Receiving Handoff

```typescript
// Read handoff from previous agent
const handoff = previousAgentResult.handoff;

// Check status
if (previousAgentResult.status === "blocked") {
  console.log("Previous phase blocked:");
  console.log(`Reason: ${previousAgentResult.blocked_reason}`);
  console.log("Attempted solutions:");
  previousAgentResult.attempted.forEach((a) => console.log(`- ${a}`));

  handoff.blockers.forEach((b) => console.log(`- ${b.description}`));

  // Route to appropriate agent using orchestrating-multi-agent-workflows skill
  const nextAgent = routeBlockedAgent(previousAgentResult.blocked_reason);
  await spawnRecoveryAgent(nextAgent, handoff);
}

// Use context in next agent prompt
const nextAgentPrompt = `
  ${basePrompt}

  CONTEXT FROM ${previousAgentResult.phase.toUpperCase()} PHASE:
  ${handoff.context}

  FILES MODIFIED:
  ${previousAgentResult.files_modified.join("\n")}

  ARTIFACTS TO REFERENCE:
  ${previousAgentResult.artifacts.join("\n")}
`;
```

### Validating Handoffs

```typescript
function validateHandoff(handoff: AgentHandoff): boolean {
  // Required fields
  if (!handoff.status) return false;
  if (!handoff.phase) return false;
  if (!handoff.summary) return false;

  // Blocked-specific validation
  if (handoff.status === "blocked") {
    if (!handoff.blocked_reason) return false;
    if (!handoff.attempted || handoff.attempted.length === 0) return false;
    if (handoff.handoff.next_agent !== null) return false; // Must be null when blocked
    if (!handoff.handoff.blockers || handoff.handoff.blockers.length === 0) return false;
  }

  // Context required unless status is complete at end
  if (handoff.handoff.next_phase !== "complete" && !handoff.handoff.context) {
    return false;
  }

  return true;
}
```

## Related References

- [Critical Rules](critical-rules.md) - Blocked agent routing table
- [Schema Discovery](schema-discovery.md) - Phase 2 methodology
- [Agent Prompts](agent-prompts.md) - Brief reference prompts
- [Full Prompt Templates](prompts/) - Comprehensive agent prompt templates
- [Troubleshooting](troubleshooting.md) - Handling blocked handoffs
