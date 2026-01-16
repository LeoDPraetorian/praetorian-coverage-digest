# Agent Handoffs

Structured JSON format for passing context between phases and agents.

## Purpose

Enable clean coordination between phases by:

- Standardizing agent output format
- Providing context for next phase
- Tracking completion status
- Handling blocked states

## Standard Handoff Format

All Task agents **MUST** follow the `persisting-agent-outputs` skill for output format.

The metadata JSON block at the end of each agent output file serves as the handoff:

```json
{
  "agent": "frontend-developer",
  "output_type": "implementation",
  "timestamp": "2025-12-30T15:45:00Z",
  "feature_directory": ".claude/.output/features/...",
  "skills_invoked": [...],
  "library_skills_read": [...],
  "source_files_verified": [...],
  "status": "complete|blocked|needs_review",
  "blocked_reason": "security_concern|architecture_decision|missing_requirements|test_failures|out_of_scope|unknown",
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

| Value                   | When to Use                                |
| ----------------------- | ------------------------------------------ |
| `security_concern`      | Security issue needs security agent review |
| `architecture_decision` | Design decision needs lead agent input     |
| `missing_requirements`  | Cannot proceed without more information    |
| `test_failures`         | Tests failing, needs debugging             |
| `out_of_scope`          | Task exceeds agent's domain                |
| `unknown`               | Blocker doesn't fit other categories       |

The orchestrator uses `orchestrating-multi-agent-workflows` skill's agent routing table to determine next steps based on `blocked_reason`.

### phase

Current phase being completed:

- `architecture` - From architect agents
- `implementation` - From developer agents
- `testing` - From test engineer agents

### summary

Concise 1-2 sentence description of work completed:

```json
// Good examples
"summary": "Designed component hierarchy using compound pattern with Zustand state management"
"summary": "Implemented dashboard with 3 metrics widgets, integrated TanStack Query for API calls"
"summary": "Created 12 unit tests and 3 E2E tests, achieved 87% coverage"

// Bad examples (too vague)
"summary": "Completed the architecture"
"summary": "Wrote some code"
"summary": "Added tests"
```

### files_modified

Array of **relative** file paths from repo root:

```json
"files_modified": [
  "modules/chariot/ui/src/sections/dashboard/index.tsx",
  "modules/chariot/ui/src/sections/dashboard/MetricsWidget.tsx",
  "modules/chariot/ui/src/hooks/useDashboardMetrics.ts"
]
```

### artifacts

Optional: Non-code files created (documentation, diagrams, etc.):

```json
"artifacts": [
  ".claude/.output/features/user-dashboard_20241213_103000/architecture.md",
  ".claude/.output/features/user-dashboard_20241213_103000/component-diagram.png"
]
```

### verification

Evidence that work is correct:

```json
"verification": {
  "tests_passed": true,
  "build_success": true,
  "lint_passed": true,
  "coverage_percent": 87,
  "command_output": "All tests passed. 12 passed, 12 total."
}
```

For architecture phase:

```json
"verification": {
  "patterns_referenced": true,
  "decisions_documented": true,
  "rationale_provided": true
}
```

### handoff.next_phase

Next phase in the sequence:

- `implementation` - After architecture
- `testing` - After implementation
- `complete` - After testing (feature done)

### handoff.next_agent

Suggested next agent (orchestrator decides final routing):

```json
// When complete - can suggest next phase agent
"next_agent": "frontend-developer"

// When blocked - orchestrator decides using routing table
"next_agent": null
```

**Key principle**: When `status` is `blocked`, set to `null` and include `blocked_reason`. The orchestrator uses `orchestrating-multi-agent-workflows` skill's routing table to determine the appropriate next agent based on the blocker type.

### handoff.context

**Most important field**: Key information for the next agent.

```json
// Architecture → Implementation
"context": "Use compound component pattern. Dashboard is <Dashboard> with <Dashboard.MetricsWidget> children. State in Zustand store at stores/dashboardStore.ts. API calls use TanStack Query hooks in hooks/useDashboardMetrics.ts."

// Implementation → Testing
"context": "Implemented 3 widgets: ActiveScansWidget, VulnerabilitiesWidget, AssetsWidget. Each widget fetches data independently via TanStack Query. Test data fetching, loading states, and error handling for each widget."

// Testing → Complete
"context": "All tests passing. Unit test coverage 87%. E2E tests cover dashboard load, widget rendering, and error states. No known issues."
```

### handoff.blockers

Only populated when `status: "blocked"`:

```json
"handoff": {
  "blockers": [
    {
      "type": "missing_dependency",
      "description": "Backend API endpoint /api/dashboard/metrics not available",
      "resolution": "Need backend team to implement endpoint first"
    },
    {
      "type": "unclear_requirement",
      "description": "Should metrics auto-refresh or manual refresh only?",
      "resolution": "Need user to clarify requirement"
    }
  ]
}
```

## Example Handoffs

### Architecture → Implementation (Frontend)

```json
{
  "status": "complete",
  "phase": "architecture",
  "summary": "Designed dashboard using compound component pattern with Zustand for state and TanStack Query for API calls",
  "files_modified": [],
  "artifacts": [".claude/.output/features/user-dashboard_20241213_103000/architecture.md"],
  "verification": {
    "patterns_referenced": true,
    "existing_code_analyzed": true,
    "decisions_documented": true
  },
  "handoff": {
    "next_phase": "implementation",
    "next_agent": "frontend-developer",
    "context": "Dashboard structure: <Dashboard> parent with <Dashboard.Widget> children. Create 3 widgets: ActiveScansWidget, VulnerabilitiesWidget, AssetsWidget. State management: Zustand store at stores/dashboardStore.ts for UI state (layout, filters). Data fetching: TanStack Query hooks in hooks/useDashboardMetrics.ts, hooks/useVulnerabilityMetrics.ts, hooks/useAssetMetrics.ts. Follow existing patterns in sections/insights/metrics/.",
    "blockers": []
  }
}
```

### Implementation → Testing (Backend)

```json
{
  "status": "complete",
  "phase": "implementation",
  "summary": "Implemented /api/dashboard/metrics endpoint with DynamoDB query optimization and response caching",
  "files_modified": [
    "modules/chariot/backend/pkg/handler/handlers/dashboard/get_metrics.go",
    "modules/chariot/backend/pkg/handler/handlers/dashboard/get_metrics_test.go",
    "modules/chariot/backend/pkg/repository/dashboard_repository.go"
  ],
  "artifacts": [],
  "verification": {
    "tests_passed": true,
    "build_success": true,
    "lint_passed": true,
    "command_output": "go test ./... passed. 5 new tests."
  },
  "handoff": {
    "next_phase": "testing",
    "next_agent": "backend-tester",
    "context": "Handler at pkg/handler/handlers/dashboard/get_metrics.go. Accepts query params: timeRange (7d|30d|90d), metricTypes (scans|vulns|assets). Returns aggregated metrics from DynamoDB. Added unit tests but need more edge case coverage: invalid timeRange, missing auth, empty results. Target 80% coverage.",
    "blockers": []
  }
}
```

### Testing → Complete

```json
{
  "status": "complete",
  "phase": "testing",
  "summary": "Created 15 unit tests and 4 E2E tests, achieved 89% coverage, all tests passing",
  "files_modified": [
    "modules/chariot/ui/src/sections/dashboard/__tests__/Dashboard.test.tsx",
    "modules/chariot/ui/src/sections/dashboard/__tests__/MetricsWidget.test.tsx",
    "modules/chariot/e2e/tests/dashboard.spec.ts"
  ],
  "artifacts": [],
  "verification": {
    "tests_passed": true,
    "build_success": true,
    "coverage_percent": 89,
    "command_output": "Test Suites: 3 passed, 3 total\nTests:       19 passed, 19 total"
  },
  "handoff": {
    "next_phase": "complete",
    "next_agent": null,
    "context": "Feature fully tested. Unit tests cover all widgets, loading states, error handling, and data transformations. E2E tests cover dashboard navigation, widget rendering, and user interactions. No known issues.",
    "blockers": []
  }
}
```

### Blocked Handoff

```json
{
  "agent": "frontend-developer",
  "output_type": "implementation-blocked",
  "timestamp": "2025-12-30T15:45:00Z",
  "feature_directory": ".claude/.output/features/2025-12-30-dashboard",
  "skills_invoked": ["gateway-frontend", "developing-with-tdd"],
  "library_skills_read": [],
  "source_files_verified": ["src/api/dashboard.ts:45-120"],
  "status": "blocked",
  "blocked_reason": "missing_requirements",
  "attempted": [
    "Searched for API specification in docs/",
    "Checked existing endpoint patterns in src/api/",
    "Reviewed Swagger/OpenAPI definitions"
  ],
  "handoff": {
    "next_agent": null,
    "context": "Dashboard metrics API endpoint not documented. Need specification for: response shape, pagination, filtering parameters."
  }
}
```

Note: `handoff.next_agent` is `null` because the orchestrator determines routing using the agent routing table in `orchestrating-multi-agent-workflows`.

## Handling Handoffs

### On Receiving Handoff

```typescript
// Read handoff from previous agent
const handoff = previousAgentResult.handoff;

// Check status
if (previousAgentResult.status === "blocked") {
  console.log("Previous phase blocked:");
  handoff.blockers.forEach((b) => console.log(`- ${b.description}`));

  // Resolve blockers before continuing
  await resolveBlockers(handoff.blockers);
}

// Use context in next agent prompt
const nextAgentPrompt = `
  ${basePrompt}

  CONTEXT FROM ${previousAgentResult.phase.toUpperCase()} PHASE:
  ${handoff.context}

  FILES MODIFIED:
  ${previousAgentResult.files_modified.join("\n")}
`;
```

### Validating Handoffs

```typescript
function validateHandoff(handoff: AgentHandoff): boolean {
  // Required fields
  if (!handoff.status) return false;
  if (!handoff.phase) return false;
  if (!handoff.summary) return false;

  // Context required unless status is complete at end
  if (handoff.handoff.next_phase !== "complete" && !handoff.handoff.context) {
    return false;
  }

  // Blockers required if status is blocked
  if (handoff.status === "blocked" && handoff.handoff.blockers.length === 0) {
    return false;
  }

  return true;
}
```

## Related References

- [Phase 4: Architecture](phase-5-architecture.md) - Architect handoffs
- [Phase 5: Implementation](phase-6-implementation.md) - Developer handoffs
- [Phase 10: Testing](phase-10-testing.md) - Test engineer handoffs
- [Troubleshooting](troubleshooting.md) - Handling blocked handoffs
