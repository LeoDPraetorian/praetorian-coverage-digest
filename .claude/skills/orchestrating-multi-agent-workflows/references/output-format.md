# Standardized Output Format

Orchestration agents should return results in a consistent JSON structure for easy parsing and integration.

## Standard Structure

```json
{
  "status": "complete|in_progress|blocked",
  "summary": "1-2 sentence description",
  "phases_completed": [{ "phase": "architecture", "agent": "...", "result": "..." }],
  "files_created": ["path/to/file1"],
  "verification": {
    "all_tests_passed": true,
    "agents_spawned": 4
  },
  "next_steps": ["Recommended follow-up actions"]
}
```

## Field Definitions

| Field            | Type   | Description                                                      |
| ---------------- | ------ | ---------------------------------------------------------------- |
| status           | enum   | Overall workflow status: `complete`, `in_progress`, or `blocked` |
| summary          | string | Brief 1-2 sentence description of what was accomplished          |
| phases_completed | array  | List of completed phases with agent and result details           |
| files_created    | array  | Paths to all files created during orchestration                  |
| verification     | object | Verification results including test status and metrics           |
| next_steps       | array  | Recommended follow-up actions or tasks                           |

## Status Values

| Status      | Meaning                             | When to Use                                            |
| ----------- | ----------------------------------- | ------------------------------------------------------ |
| complete    | All phases finished successfully    | All exit criteria met, verification passed             |
| in_progress | Work ongoing, more phases remain    | Mid-workflow status update                             |
| blocked     | Cannot proceed without intervention | Agent blocked, user decision needed, or error occurred |

## Usage Examples

### Complete Feature Implementation

```json
{
  "status": "complete",
  "summary": "Implemented user authentication with JWT tokens, including frontend forms and backend validation",
  "phases_completed": [
    {
      "phase": "architecture",
      "agent": "frontend-lead",
      "result": "JWT token-based auth with secure storage"
    },
    {
      "phase": "implementation",
      "agent": "frontend-developer",
      "result": "Login/logout components created"
    },
    {
      "phase": "testing",
      "agent": "frontend-tester",
      "result": "12 unit tests, 3 E2E tests passing"
    }
  ],
  "files_created": [
    "src/components/Login.tsx",
    "src/components/Logout.tsx",
    "src/hooks/useAuth.ts",
    "src/components/__tests__/Login.test.tsx"
  ],
  "verification": {
    "all_tests_passed": true,
    "agents_spawned": 3,
    "total_test_count": 15,
    "coverage_percent": 92
  },
  "next_steps": ["Deploy to staging environment", "Configure production JWT secrets"]
}
```

### Blocked Workflow

```json
{
  "status": "blocked",
  "summary": "Implementation blocked on architecture decision for state management approach",
  "phases_completed": [
    {
      "phase": "architecture",
      "agent": "frontend-lead",
      "result": "Two viable options: Context API vs Zustand"
    }
  ],
  "files_created": [],
  "verification": {
    "all_tests_passed": null,
    "agents_spawned": 1
  },
  "next_steps": [
    "User decision required: Context API (simpler) vs Zustand (better performance)",
    "Once decided, proceed with implementation phase"
  ]
}
```

## Integration with MANIFEST.yaml

The output format complements MANIFEST.yaml by providing:

- **MANIFEST.yaml**: Historical record of all agents and artifacts
- **Output JSON**: Current workflow status and results

Both should be maintained during orchestration for complete traceability.
