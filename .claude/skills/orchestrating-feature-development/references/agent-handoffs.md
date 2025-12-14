# Agent Handoffs

Structured JSON format for passing context between phases and agents.

## Purpose

Enable clean coordination between phases by:
- Standardizing agent output format
- Providing context for next phase
- Tracking completion status
- Handling blocked states

## Standard Handoff Format

All Task agents **MUST** return this JSON structure:

```json
{
  "status": "complete|blocked|needs_review",
  "phase": "architecture|implementation|testing",
  "summary": "1-2 sentence description of what was accomplished",
  "files_modified": ["path/to/file1.ts", "path/to/file2.tsx"],
  "artifacts": ["path/to/architecture.md", "path/to/diagram.png"],
  "verification": {
    "tests_passed": true|false,
    "build_success": true|false,
    "lint_passed": true|false,
    "coverage_percent": 85,
    "command_output": "Relevant command output snippet"
  },
  "handoff": {
    "next_phase": "implementation|testing|complete",
    "recommended_agent": "frontend-developer",
    "context": "Key information the next agent needs to know",
    "blockers": []
  }
}
```

## Field Descriptions

### status

| Value | When to Use |
|-------|-------------|
| `complete` | All work finished successfully, ready for next phase |
| `blocked` | Cannot proceed without user input or external dependency |
| `needs_review` | Work complete but requires user approval before next phase |

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
  ".claude/features/user-dashboard_20241213_103000/architecture.md",
  ".claude/features/user-dashboard_20241213_103000/component-diagram.png"
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

### handoff.recommended_agent

Which agent should continue:

```json
// After architecture
"recommended_agent": "frontend-developer"

// After implementation
"recommended_agent": "frontend-unit-test-engineer"

// After unit tests, recommend E2E
"recommended_agent": "frontend-e2e-test-engineer"
```

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
  "artifacts": [".claude/features/user-dashboard_20241213_103000/architecture.md"],
  "verification": {
    "patterns_referenced": true,
    "existing_code_analyzed": true,
    "decisions_documented": true
  },
  "handoff": {
    "next_phase": "implementation",
    "recommended_agent": "frontend-developer",
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
    "recommended_agent": "backend-unit-test-engineer",
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
    "recommended_agent": null,
    "context": "Feature fully tested. Unit tests cover all widgets, loading states, error handling, and data transformations. E2E tests cover dashboard navigation, widget rendering, and user interactions. No known issues.",
    "blockers": []
  }
}
```

### Blocked Handoff

```json
{
  "status": "blocked",
  "phase": "implementation",
  "summary": "Partially implemented dashboard, blocked on missing API specification",
  "files_modified": [
    "modules/chariot/ui/src/sections/dashboard/index.tsx"
  ],
  "artifacts": [],
  "verification": {
    "build_success": false,
    "command_output": "TypeScript errors: Cannot find type 'MetricsResponse'"
  },
  "handoff": {
    "next_phase": "implementation",
    "recommended_agent": "frontend-developer",
    "context": "Created dashboard shell but cannot complete without API types. Need backend team to provide: 1) Response type for /api/dashboard/metrics 2) Error response format 3) Sample response data for mocking",
    "blockers": [
      {
        "type": "missing_dependency",
        "description": "API type definitions not available",
        "resolution": "Backend team must provide TypeScript types or OpenAPI spec"
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
if (previousAgentResult.status === 'blocked') {
  console.log('Previous phase blocked:');
  handoff.blockers.forEach(b => console.log(`- ${b.description}`));

  // Resolve blockers before continuing
  await resolveBlockers(handoff.blockers);
}

// Use context in next agent prompt
const nextAgentPrompt = `
  ${basePrompt}

  CONTEXT FROM ${previousAgentResult.phase.toUpperCase()} PHASE:
  ${handoff.context}

  FILES MODIFIED:
  ${previousAgentResult.files_modified.join('\n')}
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
  if (handoff.handoff.next_phase !== 'complete' && !handoff.handoff.context) {
    return false;
  }

  // Blockers required if status is blocked
  if (handoff.status === 'blocked' && handoff.handoff.blockers.length === 0) {
    return false;
  }

  return true;
}
```

## Related References

- [Phase 3: Architecture](phase-3-architecture.md) - Architect handoffs
- [Phase 4: Implementation](phase-4-implementation.md) - Developer handoffs
- [Phase 5: Testing](phase-5-testing.md) - Test engineer handoffs
- [Troubleshooting](troubleshooting.md) - Handling blocked handoffs
