# Agent Handoff Examples

Complete examples of handoff JSONs for all phases and blocked scenarios.

## Success Scenarios

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
  "files_modified": [".claude/tools/linear/get-issue.ts"],
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
  "library_skills_read": ["avoiding-barrel-files", "documenting-with-tsdoc"],
  "source_files_verified": [
    ".claude/tools/linear/get-issue.ts:1-120",
    ".claude/tools/linear/get-issue.unit.test.ts:1-350",
    ".claude/.output/mcp-wrappers/2025-01-11-123000-linear/tools/get-issue/architecture.md:1-180"
  ],
  "status": "complete",
  "phase": "review",
  "summary": "Code review APPROVED for get-issue wrapper: all patterns followed, token optimization exceeds target, security validation implemented correctly",
  "files_modified": [],
  "artifacts": [".claude/.output/mcp-wrappers/2025-01-11-123000-linear/tools/get-issue/review.md"],
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

## Blocked Scenarios

### Blocked: Schema Discovery Failed

```json
{
  "agent": "claude",
  "output_type": "schema-discovery-blocked",
  "timestamp": "2025-01-11T10:20:00Z",
  "feature_directory": ".claude/.output/mcp-wrappers/2025-01-11-123000-linear",
  "skills_invoked": [],
  "library_skills_read": [],
  "source_files_verified": [".claude/tools/config/lib/mcp-client.ts:15-45"],
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

### Blocked: Architecture Decision Needed

```json
{
  "agent": "tool-lead",
  "output_type": "architecture-blocked",
  "timestamp": "2025-01-11T11:00:00Z",
  "feature_directory": ".claude/.output/mcp-wrappers/2025-01-11-123000-linear",
  "skills_invoked": ["gateway-typescript"],
  "library_skills_read": ["implementing-result-either-pattern", "optimizing-llm-api-responses"],
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
  "artifacts": [".claude/.output/mcp-wrappers/2025-01-11-123000-linear/architecture-shared.md"],
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

### Blocked: Test Failures

```json
{
  "agent": "tool-developer",
  "output_type": "implementation-blocked",
  "timestamp": "2025-01-11T12:30:00Z",
  "feature_directory": ".claude/.output/mcp-wrappers/2025-01-11-123000-linear",
  "skills_invoked": ["gateway-typescript", "developing-with-tdd"],
  "library_skills_read": ["implementing-result-either-pattern", "validating-with-zod-schemas"],
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
  "files_modified": [".claude/tools/linear/get-issue.ts"],
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
